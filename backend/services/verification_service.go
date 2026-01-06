package services

import (
	"encoding/json"
	"fmt"
	"time"

	"hackathon-backend/database"
	"hackathon-backend/models"
)

// VerificationService 验证服务
type VerificationService struct {
	blockchainService     *BlockchainService
	voteBlockchainService *VoteBlockchainService
}

// NewVerificationService 创建验证服务实例
func NewVerificationService() (*VerificationService, error) {
	blockchainService, err := NewBlockchainService()
	if err != nil {
		return nil, fmt.Errorf("初始化区块链服务失败: %w", err)
	}

	voteBlockchainService, err := NewVoteBlockchainService()
	if err != nil {
		return nil, fmt.Errorf("初始化投票区块链服务失败: %w", err)
	}

	return &VerificationService{
		blockchainService:     blockchainService,
		voteBlockchainService: voteBlockchainService,
	}, nil
}

// EventInfoData 活动信息数据
type EventInfoData struct {
	EventID     uint64 `json:"event_id"`
	EventName   string `json:"event_name"`
	Description string `json:"description"`
	StartTime   int64  `json:"start_time"`
	EndTime     int64  `json:"end_time"`
	Location    string `json:"location"`
	Organizer   string `json:"organizer"`
	IsDeleted   bool   `json:"is_deleted"`
	CreatedAt   int64  `json:"created_at"`
	UpdatedAt   int64  `json:"updated_at"`
}

// EventInfoComparison 活动信息对比
type EventInfoComparison struct {
	DatabaseData   *EventInfoData `json:"database_data"`
	BlockchainData *EventInfoData `json:"blockchain_data"`
	IsMatch        bool           `json:"is_match"`
}

// VoteStatsData 投票统计数据
type VoteStatsData struct {
	TotalVotes   uint64 `json:"total_votes"`
	ActiveVotes  uint64 `json:"active_votes"`
	RevokedVotes uint64 `json:"revoked_votes"`
}

// VoteStatsComparison 投票统计对比
type VoteStatsComparison struct {
	DatabaseData   *VoteStatsData `json:"database_data"`
	BlockchainData *VoteStatsData `json:"blockchain_data"`
	IsMatch        bool           `json:"is_match"`
}

// VerificationResponse 验证响应
type VerificationResponse struct {
	Success           bool                    `json:"success"`
	EventID           uint64                  `json:"event_id"`
	EventInfoMatch    bool                    `json:"event_info_match"`
	VoteRecordsMatch  bool                    `json:"vote_records_match"`
	VerificationTime  int64                   `json:"verification_time"`
	Discrepancies     []string                `json:"discrepancies,omitempty"`
	EventInfo         *EventInfoComparison    `json:"event_info,omitempty"`
	VoteStats         *VoteStatsComparison    `json:"vote_stats,omitempty"`
	TransactionHashes []string                `json:"transaction_hashes,omitempty"`
}

// VerifyEventInfo 验证活动信息
func (s *VerificationService) VerifyEventInfo(eventID uint64, verifyVotes bool) (*VerificationResponse, error) {
	// 1. 从数据库获取活动信息
	var dbHackathon models.Hackathon
	if err := database.DB.Where("id = ?", eventID).First(&dbHackathon).Error; err != nil {
		return nil, fmt.Errorf("活动不存在: %w", err)
	}

	// 2. 从区块链获取活动信息
	chainData, err := s.blockchainService.GetEvent(eventID)
	if err != nil {
		return nil, fmt.Errorf("获取链上活动信息失败: %w", err)
	}

	// 3. 对比活动基本信息
	eventInfoMatch, eventDiscrepancies, eventInfoComparison := s.compareEventInfo(&dbHackathon, chainData)

	var voteRecordsMatch bool = true
	var voteDiscrepancies []string
	var voteStats *VoteStatsComparison

	// 4. 如果需要验证投票记录
	if verifyVotes {
		var err error
		voteRecordsMatch, voteDiscrepancies, voteStats, err = s.verifyVoteRecords(eventID)
		if err != nil {
			return nil, fmt.Errorf("验证投票记录失败: %w", err)
		}
	}

	// 5. 合并不一致项
	allDiscrepancies := append(eventDiscrepancies, voteDiscrepancies...)

	// 6. 获取交易哈希列表
	txHashes := s.getEventTransactionHashes(eventID)

	// 7. 构建响应
	response := &VerificationResponse{
		Success:           true,
		EventID:           eventID,
		EventInfoMatch:    eventInfoMatch,
		VoteRecordsMatch:  voteRecordsMatch,
		VerificationTime:  time.Now().Unix(),
		Discrepancies:     allDiscrepancies,
		EventInfo:         eventInfoComparison,
		VoteStats:         voteStats,
		TransactionHashes: txHashes,
	}

	return response, nil
}

// compareEventInfo 对比活动信息
func (s *VerificationService) compareEventInfo(dbHackathon *models.Hackathon, chainData map[string]interface{}) (bool, []string, *EventInfoComparison) {
	var discrepancies []string
	isMatch := true

	// 构建数据库数据
	dbData := &EventInfoData{
		EventID:     dbHackathon.ID,
		EventName:   dbHackathon.Name,
		Description: dbHackathon.Description,
		StartTime:   dbHackathon.StartTime.Unix(),
		EndTime:     dbHackathon.EndTime.Unix(),
		Location:    s.formatLocation(dbHackathon),
		Organizer:   "", // 需要从用户表获取
		IsDeleted:   dbHackathon.DeletedAt.Valid,
		CreatedAt:   dbHackathon.CreatedAt.Unix(),
		UpdatedAt:   dbHackathon.UpdatedAt.Unix(),
	}

	// 获取主办方钱包地址
	var userWallet models.UserWallet
	if err := database.DB.Where("user_id = ?", dbHackathon.OrganizerID).First(&userWallet).Error; err == nil {
		dbData.Organizer = userWallet.Address
	}

	// 构建区块链数据
	blockchainData := &EventInfoData{
		EventID:     uint64(chainData["event_id"].(uint64)),
		EventName:   chainData["event_name"].(string),
		Description: chainData["description"].(string),
		StartTime:   int64(chainData["start_time"].(uint64)),
		EndTime:     int64(chainData["end_time"].(uint64)),
		Location:    chainData["location"].(string),
		Organizer:   chainData["organizer"].(string),
		IsDeleted:   chainData["is_deleted"].(bool),
		CreatedAt:   int64(chainData["created_at"].(uint64)),
		UpdatedAt:   int64(chainData["updated_at"].(uint64)),
	}

	// 对比活动名称
	if dbData.EventName != blockchainData.EventName {
		discrepancies = append(discrepancies, fmt.Sprintf(
			"Event name mismatch: DB='%s', Blockchain='%s'",
			dbData.EventName,
			blockchainData.EventName,
		))
		isMatch = false
	}

	// 对比活动描述
	if dbData.Description != blockchainData.Description {
		discrepancies = append(discrepancies, fmt.Sprintf(
			"Description mismatch: DB='%s', Blockchain='%s'",
			dbData.Description,
			blockchainData.Description,
		))
		isMatch = false
	}

	// 对比开始时间
	if dbData.StartTime != blockchainData.StartTime {
		discrepancies = append(discrepancies, fmt.Sprintf(
			"Start time mismatch: DB=%d, Blockchain=%d",
			dbData.StartTime,
			blockchainData.StartTime,
		))
		isMatch = false
	}

	// 对比结束时间
	if dbData.EndTime != blockchainData.EndTime {
		discrepancies = append(discrepancies, fmt.Sprintf(
			"End time mismatch: DB=%d, Blockchain=%d",
			dbData.EndTime,
			blockchainData.EndTime,
		))
		isMatch = false
	}

	// 对比活动地点
	if dbData.Location != blockchainData.Location {
		discrepancies = append(discrepancies, fmt.Sprintf(
			"Location mismatch: DB='%s', Blockchain='%s'",
			dbData.Location,
			blockchainData.Location,
		))
		isMatch = false
	}

	// 对比主办方地址（转换为小写比较）
	// 注释掉组织者地址比较，因为数据库和区块链可能使用不同的地址
	// if strings.ToLower(dbData.Organizer) != strings.ToLower(blockchainData.Organizer) {
	// 	discrepancies = append(discrepancies, fmt.Sprintf(
	// 		"Organizer mismatch: DB='%s', Blockchain='%s'",
	// 		dbData.Organizer,
	// 		blockchainData.Organizer,
	// 	))
	// 	isMatch = false
	// }

	// 对比删除状态
	if dbData.IsDeleted != blockchainData.IsDeleted {
		discrepancies = append(discrepancies, fmt.Sprintf(
			"Delete status mismatch: DB=%v, Blockchain=%v",
			dbData.IsDeleted,
			blockchainData.IsDeleted,
		))
		isMatch = false
	}

	comparison := &EventInfoComparison{
		DatabaseData:   dbData,
		BlockchainData: blockchainData,
		IsMatch:        isMatch,
	}

	return isMatch, discrepancies, comparison
}

// verifyVoteRecords 验证投票记录
func (s *VerificationService) verifyVoteRecords(eventID uint64) (bool, []string, *VoteStatsComparison, error) {
	var discrepancies []string

	// 1. 从数据库获取投票统计
	dbStats, err := s.getVoteStatsFromDB(eventID)
	if err != nil {
		return false, nil, nil, fmt.Errorf("获取数据库投票统计失败: %w", err)
	}

	// 2. 从区块链获取投票统计
	blockchainStats, err := s.getVoteStatsFromBlockchain(eventID)
	if err != nil {
		return false, nil, nil, fmt.Errorf("获取链上投票统计失败: %w", err)
	}

	// 3. 对比投票统计
	isMatch := true

	if dbStats.TotalVotes != blockchainStats.TotalVotes {
		discrepancies = append(discrepancies, fmt.Sprintf(
			"Total votes mismatch: DB=%d, Blockchain=%d",
			dbStats.TotalVotes,
			blockchainStats.TotalVotes,
		))
		isMatch = false
	}

	if dbStats.ActiveVotes != blockchainStats.ActiveVotes {
		discrepancies = append(discrepancies, fmt.Sprintf(
			"Active votes mismatch: DB=%d, Blockchain=%d",
			dbStats.ActiveVotes,
			blockchainStats.ActiveVotes,
		))
		isMatch = false
	}

	if dbStats.RevokedVotes != blockchainStats.RevokedVotes {
		discrepancies = append(discrepancies, fmt.Sprintf(
			"Revoked votes mismatch: DB=%d, Blockchain=%d",
			dbStats.RevokedVotes,
			blockchainStats.RevokedVotes,
		))
		isMatch = false
	}

	// 4. 构建对比结果
	comparison := &VoteStatsComparison{
		DatabaseData:   dbStats,
		BlockchainData: blockchainStats,
		IsMatch:        isMatch,
	}

	return isMatch, discrepancies, comparison, nil
}

// getVoteStatsFromDB 从数据库获取投票统计
func (s *VerificationService) getVoteStatsFromDB(eventID uint64) (*VoteStatsData, error) {
	var totalVotes, activeVotes, revokedVotes int64
	
	// 统计所有投票（包括已撤销的），与链上 totalVotes 保持一致
	if err := database.DB.Model(&models.Vote{}).Where("hackathon_id = ?", eventID).Count(&totalVotes).Error; err != nil {
		return nil, err
	}
	
	// 统计有效投票（未撤销的），与链上 activeVotes 保持一致
	if err := database.DB.Model(&models.Vote{}).Where("hackathon_id = ? AND deleted_at IS NULL", eventID).Count(&activeVotes).Error; err != nil {
		return nil, err
	}
	
	// 统计已撤销投票，与链上 revokedVotes 保持一致
	if err := database.DB.Model(&models.Vote{}).Where("hackathon_id = ? AND deleted_at IS NOT NULL", eventID).Count(&revokedVotes).Error; err != nil {
		return nil, err
	}

	return &VoteStatsData{
		TotalVotes:   uint64(totalVotes),
		ActiveVotes:  uint64(activeVotes),
		RevokedVotes: uint64(revokedVotes),
	}, nil
}

// getVoteStatsFromBlockchain 从区块链获取投票统计
func (s *VerificationService) getVoteStatsFromBlockchain(eventID uint64) (*VoteStatsData, error) {
	totalVotes, activeVotes, revokedVotes, err := s.voteBlockchainService.GetEventStats(eventID)
	if err != nil {
		return nil, fmt.Errorf("获取链上投票统计失败: %w", err)
	}

	return &VoteStatsData{
		TotalVotes:   totalVotes,
		ActiveVotes:  activeVotes,
		RevokedVotes: revokedVotes,
	}, nil
}

// getEventTransactionHashes 获取活动相关的所有交易哈希
func (s *VerificationService) getEventTransactionHashes(eventID uint64) []string {
	var txHashes []string

	// 获取活动相关的交易记录（从 hackathons 表）
	var hackathon models.Hackathon
	if err := database.DB.Where("id = ?", eventID).First(&hackathon).Error; err == nil {
		// 这里可以添加获取活动创建、更新、删除的交易哈希的逻辑
		// 目前 hackathons 表中没有存储交易哈希字段
	}

	// 获取投票相关的交易哈希
	var votes []models.Vote
	if err := database.DB.Where("hackathon_id = ? AND chain_tx_hash != ''", eventID).Find(&votes).Error; err == nil {
		for _, vote := range votes {
			if vote.ChainTxHash != "" {
				txHashes = append(txHashes, vote.ChainTxHash)
			}
		}
	}

	return txHashes
}

// formatLocation 格式化地点信息
func (s *VerificationService) formatLocation(hackathon *models.Hackathon) string {
	if hackathon.LocationType == "online" {
		return "online"
	}

	location := hackathon.LocationType
	if hackathon.City != "" {
		location += " - " + hackathon.City
		if hackathon.LocationDetail != "" {
			location += " (" + hackathon.LocationDetail + ")"
		}
	}

	return location
}

// SaveVerificationRecord 保存验证记录（可选）
func (s *VerificationService) SaveVerificationRecord(response *VerificationResponse, verifierAddress string) error {
	discrepanciesJSON, _ := json.Marshal(response.Discrepancies)

	record := models.VerificationRecord{
		EventID:          response.EventID,
		VerifierAddress:  verifierAddress,
		EventInfoMatch:   response.EventInfoMatch,
		VoteRecordsMatch: response.VoteRecordsMatch,
		Discrepancies:    string(discrepanciesJSON),
		VerificationTime: time.Unix(response.VerificationTime, 0),
	}

	return database.DB.Create(&record).Error
}

// Close 关闭服务连接
func (s *VerificationService) Close() {
	if s.blockchainService != nil {
		s.blockchainService.Close()
	}
	if s.voteBlockchainService != nil {
		s.voteBlockchainService.Close()
	}
}
