//! 程序错误码

use anchor_lang::prelude::*;

#[error_code]
pub enum HackathonError {
    #[msg("Title must be at most 128 bytes")]
    TitleTooLong,
    #[msg("Activity cannot be deleted after registration has started")]
    CannotDeleteAfterRegistration,
    #[msg("Check-in list must be at most 200 attendees")]
    CheckInListTooLong,
    #[msg("Only check-in phase allows uploading check-in list")]
    InvalidPhaseForCheckInUpload,
    #[msg("Voter is not in check-in list")]
    NotInCheckInList,
    #[msg("Only voting phase allows vote/revoke")]
    InvalidPhaseForVote,
    #[msg("Tally must be at most 100 entries")]
    TallyTooLong,
    #[msg("Only voting phase allows uploading tally")]
    InvalidPhaseForTally,
    #[msg("Candidate IDs and vote counts length mismatch")]
    TallyLengthMismatch,
}
