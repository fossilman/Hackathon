//! 签到业务规则：名单长度校验

/// 签到名单最大人数
pub const MAX_ATTENDEES: usize = 200;

/// 校验签到名单长度不超过上限
#[inline]
pub fn validate_attendee_list_len(len: usize) -> bool {
    len <= MAX_ATTENDEES
}
