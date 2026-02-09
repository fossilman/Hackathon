//! 赞助商业务规则：金额与状态校验

/// 校验赞助金额大于 0
#[inline]
pub fn validate_amount(amount_lamports: u64) -> bool {
    amount_lamports > 0
}
