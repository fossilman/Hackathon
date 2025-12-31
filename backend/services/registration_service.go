package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"hackathon-backend/database"
	"hackathon-backend/models"

	"gorm.io/gorm"
)

type RegistrationService struct{}

// Register 报名参加活动
func (s *RegistrationService) Register(hackathonID, participantID uint64) error {
	// 检查参赛者是否存在
	var participant models.Participant
	if err := database.DB.Where("id = ? AND deleted_at IS NULL", participantID).First(&participant).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("参赛者不存在")
		}
		return fmt.Errorf("查询参赛者失败: %w", err)
	}

	// 检查活动状态
	var hackathon models.Hackathon
	if err := database.DB.Where("id = ? AND deleted_at IS NULL", hackathonID).First(&hackathon).Error; err != nil {
		return errors.New("活动不存在")
	}

	if hackathon.Status != "registration" {
		return errors.New("当前不在报名阶段")
	}

	// 检查阶段时间
	hackathonService := &HackathonService{}
	inTime, err := hackathonService.CheckStageTime(hackathonID, "registration")
	if err != nil {
		return errors.New("报名阶段时间未设置")
	}
	if !inTime {
		return errors.New("不在报名时间范围内")
	}

	// 检查是否已报名
	var existing models.Registration
	if err := database.DB.Where("hackathon_id = ? AND participant_id = ?", hackathonID, participantID).First(&existing).Error; err == nil {
		return errors.New("已经报名过该活动")
	}

	// 检查是否达到最大参与人数限制
	if hackathon.MaxParticipants > 0 {
		var registeredCount int64
		if err := database.DB.Model(&models.Registration{}).Where("hackathon_id = ?", hackathonID).Count(&registeredCount).Error; err != nil {
			return fmt.Errorf("查询报名人数失败: %w", err)
		}
		if registeredCount >= int64(hackathon.MaxParticipants) {
			return errors.New("活动报名人数已满")
		}
	}

	// 创建报名记录
	registration := models.Registration{
		HackathonID:   hackathonID,
		ParticipantID: participantID,
	}

	return database.DB.Create(&registration).Error
}

// GetRegistrationStatus 获取报名状态
func (s *RegistrationService) GetRegistrationStatus(hackathonID, participantID uint64) (bool, *time.Time, error) {
	var registration models.Registration
	err := database.DB.Where("hackathon_id = ? AND participant_id = ?", hackathonID, participantID).First(&registration).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return false, nil, nil
	}
	if err != nil {
		return false, nil, err
	}

	return true, &registration.CreatedAt, nil
}

// CancelRegistration 取消报名
func (s *RegistrationService) CancelRegistration(hackathonID, participantID uint64) error {
	// 检查活动状态
	var hackathon models.Hackathon
	if err := database.DB.Where("id = ? AND deleted_at IS NULL", hackathonID).First(&hackathon).Error; err != nil {
		return errors.New("活动不存在")
	}

	if hackathon.Status != "registration" {
		return errors.New("当前不在报名阶段，不能取消报名")
	}

	// 检查阶段时间
	hackathonService := &HackathonService{}
	inTime, err := hackathonService.CheckStageTime(hackathonID, "registration")
	if err != nil {
		return errors.New("报名阶段时间未设置")
	}
	if !inTime {
		return errors.New("不在报名时间范围内，不能取消报名")
	}

	// 检查是否已报名
	var registration models.Registration
	if err := database.DB.Where("hackathon_id = ? AND participant_id = ?", hackathonID, participantID).First(&registration).Error; err != nil {
		return errors.New("您尚未报名该活动")
	}

	// 检查是否已签到（已签到不能取消报名）
	var checkin models.Checkin
	if err := database.DB.Where("hackathon_id = ? AND participant_id = ?", hackathonID, participantID).First(&checkin).Error; err == nil {
		return errors.New("已签到，不能取消报名")
	}

	// 删除报名记录
	return database.DB.Delete(&registration).Error
}

// Checkin 签到
func (s *RegistrationService) Checkin(hackathonID, participantID uint64) error {
	// 检查是否已报名
	var registration models.Registration
	if err := database.DB.Where("hackathon_id = ? AND participant_id = ?", hackathonID, participantID).First(&registration).Error; err != nil {
		return errors.New("请先报名")
	}

	// 获取参赛者信息（需要钱包地址）
	var participant models.Participant
	if err := database.DB.Where("id = ? AND deleted_at IS NULL", participantID).First(&participant).Error; err != nil {
		return errors.New("参赛者不存在")
	}

	if participant.WalletAddress == "" {
		return errors.New("参赛者钱包地址未设置")
	}

	// 检查活动状态
	var hackathon models.Hackathon
	if err := database.DB.Where("id = ? AND deleted_at IS NULL", hackathonID).First(&hackathon).Error; err != nil {
		return errors.New("活动不存在")
	}

	if hackathon.Status != "checkin" {
		return errors.New("当前不在签到阶段")
	}

	// 检查阶段时间
	hackathonService := &HackathonService{}
	inTime, err := hackathonService.CheckStageTime(hackathonID, "checkin")
	if err != nil {
		return errors.New("签到阶段时间未设置")
	}
	if !inTime {
		return errors.New("不在签到时间范围内")
	}

	// 检查是否已签到（数据库）
	var existing models.Checkin
	if err := database.DB.Where("hackathon_id = ? AND participant_id = ?", hackathonID, participantID).First(&existing).Error; err == nil {
		return errors.New("已经签到")
	}

	// 检查是否已在链上签到
	checkinService, err := NewCheckInBlockchainService()
	if err != nil {
		return fmt.Errorf("初始化 CheckIn 区块链服务失败: %w", err)
	}
	defer checkinService.Close()

	hasCheckedInOnChain, err := checkinService.HasParticipantCheckedIn(hackathonID, participant.WalletAddress)
	if err != nil {
		return fmt.Errorf("查询链上签到状态失败: %w", err)
	}
	if hasCheckedInOnChain {
		return errors.New("链上已存在签到记录")
	}

	// 执行链上签到
	tx, err := checkinService.CheckIn(hackathonID, participant.WalletAddress)
	if err != nil {
		return fmt.Errorf("链上签到失败: %w", err)
	}

	// 立即检查交易是否被接受
	hasReceipt, receipt, err := checkinService.CheckTransactionStatus(tx.Hash().Hex())
	if err != nil && !strings.Contains(err.Error(), "not found") {
		return fmt.Errorf("检查交易状态失败: %w", err)
	}

	// 如果交易立即失败，返回错误
	if hasReceipt && receipt != nil && receipt.Status != 1 {
		return errors.New("链上签到交易失败")
	}

	// 创建数据库签到记录（交易已发送，即使还在处理中也创建记录）
	checkin := models.Checkin{
		HackathonID:   hackathonID,
		ParticipantID: participantID,
	}

	if err := database.DB.Create(&checkin).Error; err != nil {
		return fmt.Errorf("创建数据库签到记录失败: %w", err)
	}

	// 异步等待交易确认，不阻塞用户请求
	go func() {
		fmt.Printf("异步等待签到交易确认，活动ID: %d, 参赛者ID: %d, 交易哈希: %s\n", 
			hackathonID, participantID, tx.Hash().Hex())
		
		// 等待一段时间让交易传播
		time.Sleep(10 * time.Second)
		
		// 检查最终交易状态
		hasReceipt, receipt, err := checkinService.CheckTransactionStatus(tx.Hash().Hex())
		if err != nil {
			fmt.Printf("签到交易最终状态检查失败: %v，交易哈希: %s\n", err, tx.Hash().Hex())
			return
		}
		
		if hasReceipt && receipt != nil {
			if receipt.Status == 1 {
				fmt.Printf("签到交易已确认，活动ID: %d, 参赛者ID: %d, 区块号: %d\n", 
					hackathonID, participantID, receipt.BlockNumber.Uint64())
			} else {
				fmt.Printf("签到交易失败，活动ID: %d, 参赛者ID: %d, 状态: %d\n", 
					hackathonID, participantID, receipt.Status)
				// 可以考虑在这里删除数据库记录或标记为失败
			}
		} else {
			fmt.Printf("签到交易可能仍在处理中，交易哈希: %s\n", tx.Hash().Hex())
		}
	}()

	return nil
}

// GetCheckinStatus 获取签到状态
func (s *RegistrationService) GetCheckinStatus(hackathonID, participantID uint64) (bool, *time.Time, error) {
	// 检查数据库签到状态
	var checkin models.Checkin
	err := database.DB.Where("hackathon_id = ? AND participant_id = ?", hackathonID, participantID).First(&checkin).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return false, nil, nil
	}
	if err != nil {
		return false, nil, err
	}

	// 如果数据库中有签到记录，也检查链上状态是否一致
	var participant models.Participant
	if err := database.DB.Where("id = ? AND deleted_at IS NULL", participantID).First(&participant).Error; err == nil {
		if participant.WalletAddress != "" {
			checkinService, err := NewCheckInBlockchainService()
			if err == nil {
				defer checkinService.Close()
				hasCheckedInOnChain, _ := checkinService.HasParticipantCheckedIn(hackathonID, participant.WalletAddress)
				if !hasCheckedInOnChain {
					// 数据库有记录但链上没有，返回false
					return false, nil, nil
				}
			}
		}
	}

	return true, &checkin.CreatedAt, nil
}

// RegisterEventToCheckInContract 将活动注册到 CheckIn 合约
func (s *RegistrationService) RegisterEventToCheckInContract(hackathonID uint64) error {
	// 检查活动是否存在
	var hackathon models.Hackathon
	if err := database.DB.Where("id = ? AND deleted_at IS NULL", hackathonID).First(&hackathon).Error; err != nil {
		return errors.New("活动不存在")
	}

	// 初始化 CheckIn 区块链服务
	checkinService, err := NewCheckInBlockchainService()
	if err != nil {
		return fmt.Errorf("初始化 CheckIn 区块链服务失败: %w", err)
	}
	defer checkinService.Close()

	// 检查活动是否已注册
	isRegistered, err := checkinService.IsEventRegistered(hackathonID)
	if err != nil {
		return fmt.Errorf("查询活动注册状态失败: %w", err)
	}

	if isRegistered {
		return errors.New("活动已在 CheckIn 合约中注册")
	}

	// 注册活动到合约
	tx, err := checkinService.RegisterEvent(hackathonID)
	if err != nil {
		return fmt.Errorf("注册活动到 CheckIn 合约失败: %w", err)
	}

	// 等待交易确认
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	receipt, err := checkinService.WaitForTransactionReceipt(ctx, tx.Hash().Hex())
	if err != nil {
		return fmt.Errorf("等待交易确认失败: %w", err)
	}

	if receipt.Status != 1 {
		return errors.New("注册活动交易失败")
	}

	return nil
}

// GetCheckinIntegrity 获取签到记录完整性验证
func (s *RegistrationService) GetCheckinIntegrity(hackathonID, participantID uint64) (map[string]interface{}, error) {
	// 获取数据库签到记录
	var checkin models.Checkin
	err := database.DB.Where("hackathon_id = ? AND participant_id = ?", hackathonID, participantID).First(&checkin).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return map[string]interface{}{
			"is_consistent": false,
			"error":         "数据库中未找到签到记录",
		}, nil
	}
	if err != nil {
		return nil, fmt.Errorf("查询数据库签到记录失败: %w", err)
	}

	// 获取参赛者信息
	var participant models.Participant
	if err := database.DB.Where("id = ? AND deleted_at IS NULL", participantID).First(&participant).Error; err != nil {
		return map[string]interface{}{
			"is_consistent": false,
			"error":         "参赛者信息不存在",
		}, nil
	}

	if participant.WalletAddress == "" {
		return map[string]interface{}{
			"is_consistent": false,
			"error":         "参赛者钱包地址未设置",
		}, nil
	}

	// 初始化 CheckIn 区块链服务
	checkinService, err := NewCheckInBlockchainService()
	if err != nil {
		return map[string]interface{}{
			"is_consistent": false,
			"error":         fmt.Sprintf("初始化 CheckIn 区块链服务失败: %v", err),
		}, nil
	}
	defer checkinService.Close()

	// 验证链上记录完整性
	verification, err := checkinService.VerifyCheckInIntegrity(hackathonID, participant.WalletAddress, &checkin)
	if err != nil {
		return map[string]interface{}{
			"is_consistent": false,
			"error":         fmt.Sprintf("验证链上记录失败: %v", err),
		}, nil
	}

	return verification, nil
}

// BatchCheckin 批量签到上链
func (s *RegistrationService) BatchCheckin(hackathonID uint64, participantIDs []uint64) error {
	if len(participantIDs) == 0 {
		return errors.New("参与者列表不能为空")
	}

	// 获取所有参与者信息
	var participants []models.Participant
	if err := database.DB.Where("id IN ? AND deleted_at IS NULL", participantIDs).Find(&participants).Error; err != nil {
		return fmt.Errorf("查询参与者信息失败: %w", err)
	}

	if len(participants) != len(participantIDs) {
		return errors.New("部分参与者不存在")
	}

	// 检查所有参与者钱包地址
	participantAddresses := make([]string, 0, len(participants))
	for _, participant := range participants {
		if participant.WalletAddress == "" {
			return fmt.Errorf("参与者 %d 钱包地址未设置", participant.ID)
		}
		participantAddresses = append(participantAddresses, participant.WalletAddress)
	}

	// 检查活动状态
	var hackathon models.Hackathon
	if err := database.DB.Where("id = ? AND deleted_at IS NULL", hackathonID).First(&hackathon).Error; err != nil {
		return errors.New("活动不存在")
	}

	if hackathon.Status != "checkin" {
		return errors.New("当前不在签到阶段")
	}

	// 初始化 CheckIn 区块链服务
	checkinService, err := NewCheckInBlockchainService()
	if err != nil {
		return fmt.Errorf("初始化 CheckIn 区块链服务失败: %w", err)
	}
	defer checkinService.Close()

	// 执行批量链上签到
	tx, err := checkinService.BatchCheckIn(hackathonID, participantAddresses)
	if err != nil {
		return fmt.Errorf("批量链上签到失败: %w", err)
	}

	// 等待交易确认
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	receipt, err := checkinService.WaitForTransactionReceipt(ctx, tx.Hash().Hex())
	if err != nil {
		return fmt.Errorf("等待交易确认失败: %w", err)
	}

	if receipt.Status != 1 {
		return errors.New("批量链上签到交易失败")
	}

	// 创建所有参与者的数据库签到记录
	for _, participantID := range participantIDs {
		// 检查数据库是否已有记录
		var existing models.Checkin
		if err := database.DB.Where("hackathon_id = ? AND participant_id = ?", hackathonID, participantID).First(&existing).Error; errors.Is(err, gorm.ErrRecordNotFound) {
			// 创建新的数据库记录
			checkin := models.Checkin{
				HackathonID:   hackathonID,
				ParticipantID: participantID,
			}
			if err := database.DB.Create(&checkin).Error; err != nil {
				// 记录错误但继续处理其他记录
				fmt.Printf("创建参与者 %d 的数据库签到记录失败: %v\n", participantID, err)
			}
		}
	}

	return nil
}

