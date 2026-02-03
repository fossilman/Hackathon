//! Hackathon 程序入口：按场景委托到 activity / check_in / vote 模块

use anchor_lang::prelude::*;

pub mod activity;
pub mod check_in;
pub mod error;
pub mod state;
pub mod vote;

use activity::*;
use check_in::*;
use vote::*;

declare_id!("DtuGwFvSDnQyLamC5Lkf8hxvmU1VNYJxSNuss4qLb8cg");

#[program]
pub mod hackathon {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        activity::initialize(ctx)
    }

    /// 主办方发布活动，将活动数据上链。发布后不可修改。
    pub fn publish_activity(
        ctx: Context<PublishActivity>,
        activity_id: u64,
        title: String,
        description_hash: [u8; 32],
    ) -> Result<()> {
        activity::publish_activity(ctx, activity_id, title, description_hash)
    }

    /// 活动进入报名阶段后不可删除；仅 Draft 阶段可调用。关闭账户后 rent 退还给 authority。
    pub fn delete_activity(ctx: Context<DeleteActivity>) -> Result<()> {
        activity::delete_activity(ctx)
    }

    /// 将活动状态改为报名阶段；进入报名阶段后活动不可删除。
    pub fn start_registration(ctx: Context<StartRegistration>) -> Result<()> {
        activity::start_registration(ctx)
    }

    /// 将活动状态改为签到阶段。
    pub fn start_check_in(ctx: Context<StartCheckIn>) -> Result<()> {
        activity::start_check_in(ctx)
    }

    /// 签到阶段结束后，主办方将签到名单上链；上链后活动进入投票阶段。
    pub fn upload_check_ins(
        ctx: Context<UploadCheckIns>,
        attendee_pubkeys: Vec<Pubkey>,
    ) -> Result<()> {
        check_in::upload_check_ins(ctx, attendee_pubkeys)
    }

    /// 投票：仅签到名单中的用户可投票；投票阶段内有效。
    pub fn vote(ctx: Context<CastVote>, candidate_id: u64) -> Result<()> {
        vote::vote(ctx, candidate_id)
    }

    /// 撤销投票：仅签到名单中的用户可撤销；投票阶段内有效。
    pub fn revoke_vote(ctx: Context<RevokeVote>) -> Result<()> {
        vote::revoke_vote(ctx)
    }

    /// 投票阶段结束后，主办方将投票汇总上链。candidate_ids 与 vote_counts 一一对应。
    pub fn upload_vote_tally(
        ctx: Context<UploadVoteTally>,
        candidate_ids: Vec<u64>,
        vote_counts: Vec<u64>,
    ) -> Result<()> {
        vote::upload_vote_tally(ctx, candidate_ids, vote_counts)
    }
}

// Re-export for IDL / external use (Anchor expects these in the crate root for account types)
pub use activity::{DeleteActivity, Initialize, PublishActivity, StartCheckIn, StartRegistration};
pub use check_in::UploadCheckIns;
pub use error::HackathonError;
pub use state::{Activity, ActivityCheckIns, ActivityPhase, CandidateVote, VoteRecord, VoteTally};
pub use vote::{CastVote, RevokeVote, UploadVoteTally};
