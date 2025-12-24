package services

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"hackathon-backend/database"
	"hackathon-backend/models"

	"gorm.io/gorm"
)

type RegistrationService struct{}

// contains 检查字符串是否包含子串
func contains(s, substr string) bool {
	return strings.Contains(s, substr)
}

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
	//hackathonService := &HackathonService{}
	//inTime, err := hackathonService.CheckStageTime(hackathonID, "registration")
	//if err != nil {
	//	return errors.New("报名阶段时间未设置")
	//}
	//if !inTime {
	//	return errors.New("不在报名时间范围内")
	//}

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

	// 检查活动状态
	var hackathon models.Hackathon
	if err := database.DB.Where("id = ? AND deleted_at IS NULL", hackathonID).First(&hackathon).Error; err != nil {
		return errors.New("活动不存在")
	}

	if hackathon.Status != "checkin" {
		return errors.New("当前不在签到阶段")
	}

	// 检查阶段时间
	//hackathonService := &HackathonService{}
	//inTime, err := hackathonService.CheckStageTime(hackathonID, "checkin")
	//if err != nil {
	//	return errors.New("签到阶段时间未设置")
	//}
	//if !inTime {
	//	return errors.New("不在签到时间范围内")
	//}

	// 检查是否已签到
	var existing models.Checkin
	if err := database.DB.Where("hackathon_id = ? AND participant_id = ?", hackathonID, participantID).First(&existing).Error; err == nil {
		return errors.New("已经签到")
	}

	// 获取参赛者钱包地址
	var participant models.Participant
	if err := database.DB.Where("id = ?", participantID).First(&participant).Error; err != nil {
		return errors.New("参赛者不存在")
	}

	// 区块链防重校验
	blockchainService, err := NewBlockchainService()
	if err != nil {
		fmt.Printf("区块链服务初始化失败: %v\n", err)
		// 继续执行数据库签到
	} else {
		defer blockchainService.Close()

		// 只有当链上ID存在时才进行区块链操作
		if hackathon.ChainEventID > 0 {
			// 检查链上是否已签到
			isCheckedIn, err := blockchainService.VerifyCheckIn(hackathon.ChainEventID, participant.WalletAddress)
			if err != nil {
				fmt.Printf("链上签到验证失败: %v\n", err)
			} else if isCheckedIn {
				return errors.New("链上记录显示已签到")
			}

			// 将签到信息上链
			txHash, err := blockchainService.CheckIn(hackathon.ChainEventID)
			if err != nil {
				// 提供更友好的错误信息
				errMsg := err.Error()
				if contains(errMsg, "Event has not started") {
					return fmt.Errorf("活动尚未开始，无法签到。活动开始时间: %s", hackathon.StartTime.Format("2006-01-02 15:04:05"))
				} else if contains(errMsg, "Event has ended") {
					return fmt.Errorf("活动已结束，无法签到。活动结束时间: %s", hackathon.EndTime.Format("2006-01-02 15:04:05"))
				} else if contains(errMsg, "Event is not active") {
					return errors.New("活动未激活，请联系主办方切换到签到阶段")
				}
				return fmt.Errorf("签到信息上链失败: %w", err)
			}
			fmt.Printf("签到成功，链上ID: %d, 交易哈希: %s\n", hackathon.ChainEventID, txHash)
		} else {
			fmt.Printf("警告：活动未上链，跳过区块链签到\n")
		}
	}

	// 创建签到记录
	checkin := models.Checkin{
		HackathonID:   hackathonID,
		ParticipantID: participantID,
	}

	return database.DB.Create(&checkin).Error
}

// GetCheckinStatus 获取签到状态
func (s *RegistrationService) GetCheckinStatus(hackathonID, participantID uint64) (bool, *time.Time, error) {
	var checkin models.Checkin
	err := database.DB.Where("hackathon_id = ? AND participant_id = ?", hackathonID, participantID).First(&checkin).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return false, nil, nil
	}
	if err != nil {
		return false, nil, err
	}

	return true, &checkin.CreatedAt, nil
}
