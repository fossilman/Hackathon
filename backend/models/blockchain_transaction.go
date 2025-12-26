package models

import (
	"time"
)

// BlockchainTransaction 区块链交易记录表
type BlockchainTransaction struct {
	ID          uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	HackathonID uint64    `gorm:"index;not null" json:"hackathon_id"` // 不使用外键约束，以保留历史记录
	TxHash      string    `gorm:"type:varchar(66);not null;index" json:"tx_hash"`
	TxType      string    `gorm:"type:varchar(50);not null" json:"tx_type"` // create, update, delete, activate, end, checkin, vote, revoke_vote
	Description string    `gorm:"type:varchar(255)" json:"description"`
	Status      string    `gorm:"type:enum('pending','confirmed','failed');default:'pending'" json:"status"`
	BlockNumber uint64    `gorm:"default:0" json:"block_number"` // 区块高度
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// TableName 指定表名
func (BlockchainTransaction) TableName() string {
	return "blockchain_transactions"
}
