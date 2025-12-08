package models

import (
	"time"

	"gorm.io/gorm"
)

// Participant 参赛者表
type Participant struct {
	ID            uint64         `gorm:"primaryKey;autoIncrement" json:"id"`
	WalletAddress string         `gorm:"type:varchar(255);uniqueIndex;not null" json:"wallet_address"`
	Nonce         string         `gorm:"type:varchar(255)" json:"-"`
	LastLoginAt  *time.Time     `json:"last_login_at"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName 指定表名
func (Participant) TableName() string {
	return "participants"
}

