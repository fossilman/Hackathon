package services

import (
	"hackathon-backend/database"
	"hackathon-backend/models"
)

type TransactionRecordService struct{}

// RecordTransaction 记录区块链交易
func (s *TransactionRecordService) RecordTransaction(hackathonID uint64, txHash, txType, description string) error {
	transaction := models.BlockchainTransaction{
		HackathonID: hackathonID,
		TxHash:      txHash,
		TxType:      txType,
		Description: description,
		Status:      "confirmed",
	}
	return database.DB.Create(&transaction).Error
}

// GetTransactionsByHackathonID 获取活动的所有交易记录
func (s *TransactionRecordService) GetTransactionsByHackathonID(hackathonID uint64) ([]models.BlockchainTransaction, error) {
	var transactions []models.BlockchainTransaction
	err := database.DB.Where("hackathon_id = ?", hackathonID).
		Order("created_at DESC").
		Find(&transactions).Error
	return transactions, err
}

// GetTransactionByHash 根据交易哈希查询交易记录
func (s *TransactionRecordService) GetTransactionByHash(txHash string) (*models.BlockchainTransaction, error) {
	var transaction models.BlockchainTransaction
	err := database.DB.Where("tx_hash = ?", txHash).First(&transaction).Error
	if err != nil {
		return nil, err
	}
	return &transaction, nil
}
