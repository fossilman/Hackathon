//! 活动业务规则：标题长度等校验

/// 活动标题最大字节数
pub const MAX_TITLE_LEN: usize = 128;

/// 校验活动标题长度不超过上限
#[inline]
pub fn validate_title_len(title: &str) -> bool {
    title.len() <= MAX_TITLE_LEN
}
