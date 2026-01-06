package models

import (
	"time"
)

// VerificationRecord 验证记录表（可选，用于记录验证历史）
type VerificationRecord struct {
	ID               uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	EventID          uint64    `gorm:"column:event_id;index;not null" json:"event_id"`
	VerifierAddress  string    `gorm:"column:verifier_address;type:varchar(42)" json:"verifier_address"`
	EventInfoMatch   bool      `gorm:"column:event_info_match;not null" json:"event_info_match"`
	VoteRecordsMatch bool      `gorm:"column:vote_records_match;not null" json:"vote_records_match"`
	Discrepancies    string    `gorm:"column:discrepancies;type:text" json:"discrepancies"`
	VerificationTime time.Time `gorm:"column:verification_time;index;not null" json:"verification_time"`
	CreatedAt        time.Time `gorm:"column:created_at" json:"created_at"`
}

// TableName 指定表名
func (VerificationRecord) TableName() string {
	return "verification_records"
}
