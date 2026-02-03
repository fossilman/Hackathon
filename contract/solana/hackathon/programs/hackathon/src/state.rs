//! 链上状态与账户结构定义

use anchor_lang::prelude::*;

#[derive(Clone, AnchorSerialize, AnchorDeserialize, PartialEq, Eq)]
pub enum ActivityPhase {
    Draft,        // 可删除
    Registration, // 不可删除
    CheckIn,      // 签到阶段
    Voting,       // 投票阶段（签到结束后进入）
    Ended,        // 投票结束
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

#[account]
pub struct ActivityCheckIns {
    pub activity: Pubkey,
    pub authority: Pubkey,
    pub attendees: Vec<Pubkey>,
    pub bump: u8,
}

#[account]
pub struct VoteRecord {
    pub voter: Pubkey,
    pub activity: Pubkey,
    pub candidate_id: u64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CandidateVote {
    pub candidate_id: u64,
    pub vote_count: u64,
}

#[account]
pub struct VoteTally {
    pub activity: Pubkey,
    pub authority: Pubkey,
    pub counts: Vec<CandidateVote>,
    pub bump: u8,
}
