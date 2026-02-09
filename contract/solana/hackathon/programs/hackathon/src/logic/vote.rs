//! 投票业务规则：名单校验、票数汇总校验

/// 投票汇总最大条数
pub const MAX_TALLY_ENTRIES: usize = 100;

/// 校验投票人是否在签到名单中（按 32 字节 pubkey 比较）
pub fn validate_voter_in_list(attendees: &[[u8; 32]], voter: &[u8; 32]) -> bool {
    attendees.iter().any(|a| a.as_slice() == voter.as_slice())
}

/// 校验 candidate_ids 与 vote_counts 长度一致
#[inline]
pub fn validate_tally_length_match(ids_len: usize, counts_len: usize) -> bool {
    ids_len == counts_len
}

/// 校验投票汇总条数不超过上限
#[inline]
pub fn validate_tally_max_len(len: usize) -> bool {
    len <= MAX_TALLY_ENTRIES
}
