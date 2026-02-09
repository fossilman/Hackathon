//! Hackathon 程序入口：薄 Anchor 胶水，按场景委托到 instructions

use anchor_lang::prelude::*;

pub mod error;
pub mod instructions;
pub mod logic;
pub mod state;

// 将 instructions 下所有类型（含 Anchor 生成的 __client_accounts_*）re-export 到 crate 根，供 #[program] 宏解析
pub use instructions::activity::*;
pub use instructions::check_in::*;
pub use instructions::sponsor::*;
pub use instructions::vote::*;

declare_id!("7pgYzGEw9byBrFkPmRVtvqE3GDdUwpxXAANc6CEBXhk9");

#[program]
pub mod hackathon {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::activity::initialize(ctx)
    }

    pub fn publish_activity(
        ctx: Context<PublishActivity>,
        activity_id: u64,
        title: String,
        description_hash: [u8; 32],
    ) -> Result<()> {
        instructions::activity::publish_activity(ctx, activity_id, title, description_hash)
    }

    pub fn delete_activity(ctx: Context<DeleteActivity>) -> Result<()> {
        instructions::activity::delete_activity(ctx)
    }

    pub fn start_registration(ctx: Context<StartRegistration>) -> Result<()> {
        instructions::activity::start_registration(ctx)
    }

    pub fn start_check_in(ctx: Context<StartCheckIn>) -> Result<()> {
        instructions::activity::start_check_in(ctx)
    }

    pub fn start_team_formation(ctx: Context<StartTeamFormation>) -> Result<()> {
        instructions::activity::start_team_formation(ctx)
    }

    pub fn start_submission(ctx: Context<StartSubmission>) -> Result<()> {
        instructions::activity::start_submission(ctx)
    }

    pub fn start_voting(ctx: Context<StartVoting>) -> Result<()> {
        instructions::activity::start_voting(ctx)
    }

    pub fn start_results(ctx: Context<StartResults>) -> Result<()> {
        instructions::activity::start_results(ctx)
    }

    pub fn upload_check_ins(
        ctx: Context<UploadCheckIns>,
        attendee_pubkeys: Vec<Pubkey>,
    ) -> Result<()> {
        instructions::check_in::upload_check_ins(ctx, attendee_pubkeys)
    }

    pub fn vote(ctx: Context<CastVote>, candidate_id: u64) -> Result<()> {
        instructions::vote::vote(ctx, candidate_id)
    }

    pub fn revoke_vote(ctx: Context<RevokeVote>) -> Result<()> {
        instructions::vote::revoke_vote(ctx)
    }

    pub fn upload_vote_tally(
        ctx: Context<UploadVoteTally>,
        candidate_ids: Vec<u64>,
        vote_counts: Vec<u64>,
    ) -> Result<()> {
        instructions::vote::upload_vote_tally(ctx, candidate_ids, vote_counts)
    }

    pub fn initialize_sponsor_config(
        ctx: Context<InitializeSponsorConfig>,
        admin_wallet: Pubkey,
        review_period_secs: u64,
    ) -> Result<()> {
        instructions::sponsor::initialize_sponsor_config(ctx, admin_wallet, review_period_secs)
    }

    pub fn sponsor_apply(
        ctx: Context<SponsorApply>,
        application_id: u64,
        amount_lamports: u64,
    ) -> Result<()> {
        instructions::sponsor::sponsor_apply(ctx, application_id, amount_lamports)
    }

    pub fn approve_sponsor(ctx: Context<ReviewSponsor>, application_id: u64) -> Result<()> {
        instructions::sponsor::approve_sponsor(ctx, application_id)
    }

    pub fn reject_sponsor(ctx: Context<ReviewSponsor>, application_id: u64) -> Result<()> {
        instructions::sponsor::reject_sponsor(ctx, application_id)
    }
}

// Re-export for IDL / external use
pub use error::HackathonError;
pub use state::{
    Activity, ActivityCheckIns, ActivityPhase, CandidateVote, SponsorApplication,
    SponsorApplicationStatus, SponsorConfig, VoteRecord, VoteTally,
};
