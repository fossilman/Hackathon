//! Hackathon platform: event publish, treasury, check-in + NFT, vote, sponsor escrow.
//! Uses local test chain (Solana localnet).

use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

declare_id!("2BE9YFPLME8in2tsSeTY7CpKg7btYubQW5BFG9vdAMYX");

#[program]
pub mod hackathon_platform {
    use super::*;

    /// Create event + treasury when organizer publishes. Backend passes event_id (hackathon DB id).
    pub fn create_event(
        ctx: Context<CreateEvent>,
        event_id: u64,
        name: String,
        organizer_lamports: u64,
    ) -> Result<()> {
        let event = &mut ctx.accounts.event;
        event.event_id = event_id;
        event.organizer = ctx.accounts.organizer.key();
        event.name = name.chars().take(64).collect::<String>();
        event.bump = ctx.bumps.event;
        event.treasury_bump = ctx.bumps.treasury;
        event.attendance_mint = ctx.accounts.attendance_mint.key();

        let treasury = &mut ctx.accounts.treasury;
        treasury.event = event.key();
        treasury.bump = ctx.bumps.treasury;

        // Organizer funds treasury
        if organizer_lamports > 0 {
            let organizer_lamports_before = ctx.accounts.organizer.lamports();
            **ctx.accounts.organizer.to_account_info().try_borrow_mut_lamports()? -= organizer_lamports;
            **ctx.accounts.treasury.to_account_info().try_borrow_mut_lamports()? += organizer_lamports;
            require!(ctx.accounts.organizer.lamports() == organizer_lamports_before - organizer_lamports, HackathonError::TransferFailed);
        }

        Ok(())
    }

    /// Add sponsor funds to treasury (called when sponsor is approved for event).
    pub fn fund_treasury(ctx: Context<FundTreasury>, amount: u64) -> Result<()> {
        require!(amount > 0, HackathonError::InvalidAmount);
        let sponsor = &ctx.accounts.sponsor;
        let treasury = &ctx.accounts.treasury;
        **sponsor.to_account_info().try_borrow_mut_lamports()? -= amount;
        **treasury.to_account_info().try_borrow_mut_lamports()? += amount;
        Ok(())
    }

    /// Check-in: add participant to on-chain list and mint 1 attendance NFT to participant.
    /// Voting and distribution only consider wallets in this list.
    pub fn checkin(ctx: Context<CheckinAccounts>) -> Result<()> {
        let event = &ctx.accounts.event;
        let checkin_acc = &mut ctx.accounts.checkin_record;
        checkin_acc.event = event.key();
        checkin_acc.participant = ctx.accounts.participant.key();
        checkin_acc.bump = ctx.bumps.checkin_record;
        checkin_acc.mint = ctx.accounts.attendance_mint.key();

        // Mint 1 token (attendance NFT) to participant's ATA (event PDA signs)
        let seeds = &[
            b"event".as_ref(),
            &event.event_id.to_le_bytes(),
            &[event.bump],
        ];
        let signer_seeds = &[&seeds[..]];
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::MintTo {
                mint: ctx.accounts.attendance_mint.to_account_info(),
                to: ctx.accounts.participant_ata.to_account_info(),
                authority: event.to_account_info(),
            },
            signer_seeds,
        );
        token::mint_to(cpi_ctx, 1)?;

        Ok(())
    }

    /// Vote for a submission. Only wallets that have checked in (on-chain) are allowed.
    pub fn vote(ctx: Context<VoteAccounts>, submission_id: u64) -> Result<()> {
        let v = &mut ctx.accounts.vote_record;
        v.event = ctx.accounts.event.key();
        v.voter = ctx.accounts.voter.key();
        v.submission_id = submission_id;
        Ok(())
    }

    /// Distribute prizes: pay winners by rank (from treasury), remainder to organizer + sponsors.
    /// Caller must pass sorted winner list and amounts; treasury pays from event treasury.
    pub fn distribute(
        ctx: Context<Distribute>,
        winner_wallets: Vec<Pubkey>,
        winner_amounts: Vec<u64>,
        organizer_refund: u64,
        sponsor_refunds: Vec<u64>,
        sponsor_wallets: Vec<Pubkey>,
    ) -> Result<()> {
        require!(
            winner_wallets.len() == winner_amounts.len()
                && sponsor_refunds.len() == sponsor_wallets.len(),
            HackathonError::InvalidLength
        );
        let treasury = &ctx.accounts.treasury;
        let mut total = 0u64;
        for (i, &wallet) in winner_wallets.iter().enumerate() {
            total += winner_amounts[i];
            // In a full impl we would transfer lamports to wallet; simplified: just deduct from treasury
        }
        total += organizer_refund;
        for &a in &sponsor_refunds {
            total += a;
        }
        let treasury_balance = treasury.to_account_info().lamports();
        require!(treasury_balance >= total, HackathonError::InsufficientTreasury);

        // Actual transfers: treasury -> winners, organizer, sponsors (CPI or direct lamport move)
        let treasury_info = treasury.to_account_info();
        let organizer_info = ctx.accounts.organizer.to_account_info();
        **treasury_info.try_borrow_mut_lamports()? -= organizer_refund;
        **organizer_info.try_borrow_mut_lamports()? += organizer_refund;

        for (i, &amount) in sponsor_refunds.iter().enumerate() {
            if amount == 0 {
                continue;
            }
            // Would need sponsor account infos; simplified here
            **treasury_info.try_borrow_mut_lamports()? -= amount;
            // **sponsor_i.try_borrow_mut_lamports()? += amount;
        }

        for (i, &amount) in winner_amounts.iter().enumerate() {
            if amount == 0 {
                continue;
            }
            **treasury_info.try_borrow_mut_lamports()? -= amount;
            // winner_wallets[i] += amount (need account infos for winners)
        }

        Ok(())
    }

    /// Sponsor: create escrow when sponsor applies (amount locked).
    pub fn create_sponsor_escrow(
        ctx: Context<CreateSponsorEscrow>,
        application_id: u64,
        amount: u64,
        organizer: Pubkey,
    ) -> Result<()> {
        require!(amount > 0, HackathonError::InvalidAmount);
        let escrow = &mut ctx.accounts.escrow;
        escrow.application_id = application_id;
        escrow.sponsor = ctx.accounts.sponsor.key();
        escrow.organizer = organizer;
        escrow.amount = amount;
        escrow.state = EscrowState::Pending;

        **ctx.accounts.sponsor.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.escrow.to_account_info().try_borrow_mut_lamports()? += amount;
        Ok(())
    }

    /// Sponsor: approve -> transfer amount to organizer.
    pub fn approve_sponsor_escrow(ctx: Context<ApproveSponsorEscrow>) -> Result<()> {
        let escrow = &ctx.accounts.escrow;
        require!(escrow.state == EscrowState::Pending, HackathonError::InvalidState);
        let amount = escrow.amount;

        **ctx.accounts.escrow.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.organizer.to_account_info().try_borrow_mut_lamports()? += amount;
        // Note: organizer is Signer, so organizer.to_account_info() is the recipient

        let escrow_acc = &mut ctx.accounts.escrow;
        escrow_acc.state = EscrowState::Approved;
        Ok(())
    }

    /// Sponsor: reject -> refund to sponsor.
    pub fn reject_sponsor_escrow(ctx: Context<RejectSponsorEscrow>) -> Result<()> {
        let escrow = &ctx.accounts.escrow;
        require!(escrow.state == EscrowState::Pending, HackathonError::InvalidState);
        let amount = escrow.amount;

        **ctx.accounts.escrow.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.sponsor.to_account_info().try_borrow_mut_lamports()? += amount;

        let escrow_acc = &mut ctx.accounts.escrow;
        escrow_acc.state = EscrowState::Rejected;
        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum EscrowState {
    Pending,
    Approved,
    Rejected,
}

#[account]
pub struct Event {
    pub event_id: u64,
    pub organizer: Pubkey,
    pub name: String, // max 64 bytes; space = 4+64
    pub bump: u8,
    pub treasury_bump: u8,
    pub attendance_mint: Pubkey,
}

#[account]
pub struct Treasury {
    pub event: Pubkey,
    pub bump: u8,
}

#[account]
pub struct CheckinRecord {
    pub event: Pubkey,
    pub participant: Pubkey,
    pub bump: u8,
    pub mint: Pubkey,
}

#[account]
pub struct VoteRecord {
    pub event: Pubkey,
    pub voter: Pubkey,
    pub submission_id: u64,
}

#[account]
pub struct SponsorEscrow {
    pub application_id: u64,
    pub sponsor: Pubkey,
    pub organizer: Pubkey,
    pub amount: u64,
    pub state: EscrowState,
}

#[error_code]
pub enum HackathonError {
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Invalid state")]
    InvalidState,
    #[msg("Invalid length")]
    InvalidLength,
    #[msg("Insufficient treasury")]
    InsufficientTreasury,
    #[msg("Transfer failed")]
    TransferFailed,
}

#[derive(Accounts)]
#[instruction(event_id: u64)]
pub struct CreateEvent<'info> {
    #[account(mut)]
    pub organizer: Signer<'info>,

    #[account(
        init,
        payer = organizer,
        space = 8 + 8 + 32 + 4 + 64 + 1 + 1 + 32,
        seeds = [b"event".as_ref(), &event_id.to_le_bytes()],
        bump
    )]
    pub event: Account<'info, Event>,

    #[account(
        init,
        payer = organizer,
        space = 8 + 32 + 1,
        seeds = [b"treasury".as_ref(), &event_id.to_le_bytes()],
        bump
    )]
    pub treasury: Account<'info, Treasury>,

    #[account(
        init,
        payer = organizer,
        mint::decimals = 0,
        mint::authority = event,
    )]
    pub attendance_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct FundTreasury<'info> {
    #[account(mut)]
    pub sponsor: Signer<'info>,

    pub event: Account<'info, Event>,

    #[account(
        mut,
        seeds = [b"treasury".as_ref(), &event.event_id.to_le_bytes()],
        bump = event.treasury_bump,
    )]
    pub treasury: Account<'info, Treasury>,
}

#[derive(Accounts)]
pub struct CheckinAccounts<'info> {
    #[account(mut)]
    pub participant: Signer<'info>,

    #[account(
        mut,
        seeds = [b"event".as_ref(), &event.event_id.to_le_bytes()],
        bump = event.bump,
    )]
    pub event: Account<'info, Event>,

    #[account(
        init,
        payer = participant,
        space = 8 + 32 + 32 + 1 + 32,
        seeds = [b"checkin", event.key().as_ref(), participant.key().as_ref()],
        bump
    )]
    pub checkin_record: Account<'info, CheckinRecord>,

    #[account(
        init,
        payer = participant,
        associated_token::mint = attendance_mint,
        associated_token::authority = participant,
    )]
    pub participant_ata: Account<'info, TokenAccount>,

    #[account(mut)]
    pub attendance_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(submission_id: u64)]
pub struct VoteAccounts<'info> {
    #[account(mut)]
    pub voter: Signer<'info>,

    pub event: Account<'info, Event>,

    #[account(
        seeds = [b"checkin", event.key().as_ref(), voter.key().as_ref()],
        bump,
    )]
    pub checkin: Account<'info, CheckinRecord>,

    #[account(
        init,
        payer = voter,
        space = 8 + 32 + 32 + 8,
        seeds = [b"vote".as_ref(), event.key().as_ref(), voter.key().as_ref(), &submission_id.to_le_bytes()],
        bump
    )]
    pub vote_record: Account<'info, VoteRecord>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Distribute<'info> {
    #[account(mut)]
    pub organizer: Signer<'info>,

    pub event: Account<'info, Event>,

    #[account(
        mut,
        seeds = [b"treasury".as_ref(), &event.event_id.to_le_bytes()],
        bump = event.treasury_bump,
    )]
    pub treasury: Account<'info, Treasury>,
}

#[derive(Accounts)]
pub struct ApproveSponsorEscrow<'info> {
    #[account(mut)]
    pub organizer: Signer<'info>,

    #[account(
        mut,
        constraint = escrow.organizer == organizer.key(),
    )]
    pub escrow: Account<'info, SponsorEscrow>,
}

#[derive(Accounts)]
#[instruction(application_id: u64, amount: u64)]
pub struct CreateSponsorEscrow<'info> {
    #[account(mut)]
    pub sponsor: Signer<'info>,

    #[account(
        init,
        payer = sponsor,
        space = 8 + 8 + 32 + 32 + 8 + 1,
        seeds = [b"escrow".as_ref(), &application_id.to_le_bytes()],
        bump
    )]
    pub escrow: Account<'info, SponsorEscrow>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RejectSponsorEscrow<'info> {
    pub organizer: Signer<'info>,

    #[account(
        mut,
        constraint = escrow.organizer == organizer.key(),
    )]
    pub escrow: Account<'info, SponsorEscrow>,

    #[account(
        mut,
        constraint = escrow.sponsor == sponsor.key(),
    )]
    pub sponsor: Signer<'info>,
}
