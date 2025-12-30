package models

import (
	"time"
)

// Registration 报名记录表
type Registration struct {
	ID            uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	HackathonID   uint64    `gorm:"uniqueIndex:uk_hackathon_participant;not null" json:"hackathon_id"`
	ParticipantID uint64    `gorm:"uniqueIndex:uk_hackathon_participant;not null" json:"participant_id"`
	CreatedAt     time.Time `json:"created_at"`

	// 关联关系
	Hackathon  Hackathon  `gorm:"foreignKey:HackathonID" json:"hackathon,omitempty"`
	Participant Participant `gorm:"foreignKey:ParticipantID" json:"participant,omitempty"`
}

// TableName 指定表名
func (Registration) TableName() string {
	return "registrations"
}

// Checkin 签到记录表
type Checkin struct {
	ID            uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	HackathonID   uint64    `gorm:"uniqueIndex:uk_hackathon_participant;not null" json:"hackathon_id"`
	ParticipantID uint64    `gorm:"uniqueIndex:uk_hackathon_participant;not null" json:"participant_id"`
	CreatedAt     time.Time `json:"created_at"`

	// 关联关系
	Hackathon  Hackathon  `gorm:"foreignKey:HackathonID" json:"hackathon,omitempty"`
	Participant Participant `gorm:"foreignKey:ParticipantID" json:"participant,omitempty"`
}

// TableName 指定表名
func (Checkin) TableName() string {
	return "checkins"
}

// NFTRecord NFT发放记录表
type NFTRecord struct {
	ID              uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	HackathonID     uint64    `gorm:"not null;index;column:hackathon_id" json:"hackathon_id"`
	ParticipantID   uint64    `gorm:"not null;index" json:"participant_id"`
	TokenID         uint64    `gorm:"not null;index" json:"token_id"`
	TransactionHash string    `gorm:"size:128;not null" json:"transaction_hash"`
	MintedAt        time.Time `gorm:"not null" json:"minted_at"`

	// 关联关系 - 外键约束与数据库表结构保持一致
	Hackathon   Hackathon   `gorm:"foreignKey:HackathonID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"hackathon,omitempty"`
	Participant Participant `gorm:"foreignKey:ParticipantID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"participant,omitempty"`
}

// TableName 指定表名
func (NFTRecord) TableName() string {
	return "nft_records"
}

