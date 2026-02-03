use anchor_lang::prelude::*;

declare_id!("DtuGwFvSDnQyLamC5Lkf8hxvmU1VNYJxSNuss4qLb8cg");

#[program]
pub mod hackathon {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }

    /// 主办方发布活动，将活动数据上链。发布后不可修改。
    pub fn publish_activity(
        ctx: Context<PublishActivity>,
        activity_id: u64,
        title: String,
        description_hash: [u8; 32],
    ) -> Result<()> {
        require!(title.len() <= 128, HackathonError::TitleTooLong);
        let activity = &mut ctx.accounts.activity;
        activity.authority = ctx.accounts.authority.key();
        activity.activity_id = activity_id;
        activity.title = title.clone();
        activity.description_hash = description_hash;
        activity.phase = ActivityPhase::Draft;
        activity.bump = ctx.bumps.activity;
        activity.created_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    /// 活动进入报名阶段后不可删除；仅 Draft 阶段可调用。关闭账户后 rent 退还给 authority。
    pub fn delete_activity(ctx: Context<DeleteActivity>) -> Result<()> {
        // phase 已在 DeleteActivity 的 constraint 中校验；close = authority 会在指令结束时将 rent 退还给 authority
        Ok(())
    }

    /// 将活动状态改为报名阶段；进入报名阶段后活动不可删除。
    pub fn start_registration(ctx: Context<StartRegistration>) -> Result<()> {
        ctx.accounts.activity.phase = ActivityPhase::Registration;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[derive(Clone, AnchorSerialize, AnchorDeserialize, PartialEq, Eq)]
pub enum ActivityPhase {
    Draft,        // 可删除
    Registration, // 不可删除
}

#[account]
pub struct Activity {
    pub authority: Pubkey,
    pub activity_id: u64,
    pub title: String,
    pub description_hash: [u8; 32],
    pub phase: ActivityPhase,
    pub bump: u8,
    pub created_at: i64,
}

#[derive(Accounts)]
#[instruction(activity_id: u64)]
pub struct PublishActivity<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 8 + 4 + 128 + 32 + 1 + 1 + 8,
        seeds = [b"activity", authority.key().as_ref(), &activity_id.to_le_bytes()],
        bump
    )]
    pub activity: Account<'info, Activity>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DeleteActivity<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        close = authority,
        has_one = authority,
        constraint = activity.phase == ActivityPhase::Draft @ HackathonError::CannotDeleteAfterRegistration
    )]
    pub activity: Account<'info, Activity>,
}

#[derive(Accounts)]
pub struct StartRegistration<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        has_one = authority
    )]
    pub activity: Account<'info, Activity>,
}

#[error_code]
pub enum HackathonError {
    #[msg("Title must be at most 128 bytes")]
    TitleTooLong,
    #[msg("Activity cannot be deleted after registration has started")]
    CannotDeleteAfterRegistration,
}
