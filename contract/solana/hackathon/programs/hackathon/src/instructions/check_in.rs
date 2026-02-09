//! 签到信息上链：Anchor ctx + 调度，业务校验委托 logic

use anchor_lang::prelude::*;

use crate::logic::check_in;
use crate::error::HackathonError;
use crate::state::{Activity, ActivityCheckIns, ActivityPhase};

#[derive(Accounts)]
pub struct UploadCheckIns<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        has_one = authority,
        constraint = activity.phase == ActivityPhase::CheckIn @ HackathonError::InvalidPhaseForCheckInUpload
    )]
    pub activity: Account<'info, Activity>,

    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 4 + (200 * 32) + 1,
        seeds = [b"check_ins", activity.key().as_ref()],
        bump
    )]
    pub check_ins: Account<'info, ActivityCheckIns>,

    pub system_program: Program<'info, System>,
}

pub fn upload_check_ins(
    ctx: Context<UploadCheckIns>,
    attendee_pubkeys: Vec<Pubkey>,
) -> Result<()> {
    require!(
        check_in::validate_attendee_list_len(attendee_pubkeys.len()),
        HackathonError::CheckInListTooLong
    );
    let check_ins = &mut ctx.accounts.check_ins;
    check_ins.activity = ctx.accounts.activity.key();
    check_ins.authority = ctx.accounts.authority.key();
    check_ins.attendees = attendee_pubkeys;
    check_ins.bump = ctx.bumps.check_ins;
    ctx.accounts.activity.phase = ActivityPhase::TeamFormation;
    Ok(())
}
