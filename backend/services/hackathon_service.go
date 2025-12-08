package services

import (
	"errors"
	"fmt"
	"time"

	"hackathon-backend/database"
	"hackathon-backend/models"

	"gorm.io/gorm"
)

type HackathonService struct{}

// CreateHackathon 创建活动
func (s *HackathonService) CreateHackathon(hackathon *models.Hackathon, stages []models.HackathonStage, awards []models.HackathonAward) error {
	return database.DB.Transaction(func(tx *gorm.DB) error {
		// 创建活动
		if err := tx.Create(hackathon).Error; err != nil {
			return fmt.Errorf("创建活动失败: %w", err)
		}

		// 创建阶段
		for i := range stages {
			stages[i].HackathonID = hackathon.ID
			if err := tx.Create(&stages[i]).Error; err != nil {
				return fmt.Errorf("创建阶段失败: %w", err)
			}
		}

		// 创建奖项
		for i := range awards {
			awards[i].HackathonID = hackathon.ID
			if err := tx.Create(&awards[i]).Error; err != nil {
				return fmt.Errorf("创建奖项失败: %w", err)
			}
		}

		return nil
	})
}

// GetHackathonList 获取活动列表
func (s *HackathonService) GetHackathonList(page, pageSize int, status, keyword, sort string, organizerID *uint64) ([]models.Hackathon, int64, error) {
	var hackathons []models.Hackathon
	var total int64

	query := database.DB.Model(&models.Hackathon{}).Where("deleted_at IS NULL")

	if organizerID != nil {
		query = query.Where("organizer_id = ?", *organizerID)
	}

	if status != "" {
		query = query.Where("status = ?", status)
	}

	if keyword != "" {
		query = query.Where("name LIKE ?", "%"+keyword+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 排序
	if sort == "created_at_asc" {
		query = query.Order("created_at ASC")
	} else {
		query = query.Order("created_at DESC")
	}

	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Find(&hackathons).Error; err != nil {
		return nil, 0, err
	}

	return hackathons, total, nil
}

// GetHackathonByID 根据ID获取活动详情
func (s *HackathonService) GetHackathonByID(id uint64) (*models.Hackathon, error) {
	var hackathon models.Hackathon
	if err := database.DB.Preload("Stages").Preload("Awards").Where("id = ? AND deleted_at IS NULL", id).First(&hackathon).Error; err != nil {
		return nil, err
	}

	// 获取统计信息
	var registrationCount, checkinCount, teamCount, submissionCount int64
	database.DB.Model(&models.Registration{}).Where("hackathon_id = ?", id).Count(&registrationCount)
	database.DB.Model(&models.Checkin{}).Where("hackathon_id = ?", id).Count(&checkinCount)
	database.DB.Model(&models.Team{}).Where("hackathon_id = ? AND deleted_at IS NULL", id).Count(&teamCount)
	database.DB.Model(&models.Submission{}).Where("hackathon_id = ? AND draft = 0", id).Count(&submissionCount)

	// 将统计信息添加到hackathon对象（这里简化处理，实际可以扩展模型）
	_ = registrationCount
	_ = checkinCount
	_ = teamCount
	_ = submissionCount

	return &hackathon, nil
}

// UpdateHackathon 更新活动（仅预备状态）
func (s *HackathonService) UpdateHackathon(id uint64, hackathon *models.Hackathon, stages []models.HackathonStage, awards []models.HackathonAward) error {
	// 检查活动状态
	var existing models.Hackathon
	if err := database.DB.Where("id = ? AND deleted_at IS NULL", id).First(&existing).Error; err != nil {
		return err
	}

	if existing.Status != "preparation" {
		return errors.New("只能修改处于预备状态的活动")
	}

	return database.DB.Transaction(func(tx *gorm.DB) error {
		// 更新活动
		if err := tx.Model(&models.Hackathon{}).Where("id = ?", id).Updates(hackathon).Error; err != nil {
			return err
		}

		// 删除旧阶段
		if err := tx.Where("hackathon_id = ?", id).Delete(&models.HackathonStage{}).Error; err != nil {
			return err
		}

		// 创建新阶段
		for i := range stages {
			stages[i].HackathonID = id
			if err := tx.Create(&stages[i]).Error; err != nil {
				return err
			}
		}

		// 删除旧奖项
		if err := tx.Where("hackathon_id = ?", id).Delete(&models.HackathonAward{}).Error; err != nil {
			return err
		}

		// 创建新奖项
		for i := range awards {
			awards[i].HackathonID = id
			if err := tx.Create(&awards[i]).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

// DeleteHackathon 删除活动（仅预备状态）
func (s *HackathonService) DeleteHackathon(id uint64) error {
	var hackathon models.Hackathon
	if err := database.DB.Where("id = ? AND deleted_at IS NULL", id).First(&hackathon).Error; err != nil {
		return err
	}

	if hackathon.Status != "preparation" {
		return errors.New("只能删除处于预备状态的活动")
	}

	return database.DB.Delete(&hackathon).Error
}

// PublishHackathon 发布活动
func (s *HackathonService) PublishHackathon(id uint64) error {
	var hackathon models.Hackathon
	if err := database.DB.Where("id = ? AND deleted_at IS NULL", id).First(&hackathon).Error; err != nil {
		return err
	}

	if hackathon.Status != "preparation" {
		return errors.New("只能发布处于预备状态的活动")
	}

	return database.DB.Model(&hackathon).Update("status", "published").Error
}

// SwitchStage 切换活动阶段
func (s *HackathonService) SwitchStage(id uint64, stage string) error {
	validStages := map[string]bool{
		"published":      true,
		"registration":   true,
		"checkin":        true,
		"team_formation": true,
		"submission":     true,
		"voting":         true,
		"results":        true,
	}

	if !validStages[stage] {
		return errors.New("无效的阶段")
	}

	var hackathon models.Hackathon
	if err := database.DB.Where("id = ? AND deleted_at IS NULL", id).First(&hackathon).Error; err != nil {
		return err
	}

	return database.DB.Model(&hackathon).Update("status", stage).Error
}

// GetPublishedHackathons 获取已发布的活动列表（Arena平台）
func (s *HackathonService) GetPublishedHackathons(page, pageSize int, status, keyword, sort string) ([]models.Hackathon, int64, error) {
	var hackathons []models.Hackathon
	var total int64

	query := database.DB.Model(&models.Hackathon{}).Where("deleted_at IS NULL AND status != 'preparation'")

	if status != "" {
		query = query.Where("status = ?", status)
	}

	if keyword != "" {
		query = query.Where("name LIKE ?", "%"+keyword+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 排序
	if sort == "time_asc" {
		query = query.Order("start_time ASC")
	} else {
		query = query.Order("start_time DESC")
	}

	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Find(&hackathons).Error; err != nil {
		return nil, 0, err
	}

	return hackathons, total, nil
}

// CheckStageTime 检查当前时间是否在阶段时间范围内
func (s *HackathonService) CheckStageTime(hackathonID uint64, stage string) (bool, error) {
	var stageModel models.HackathonStage
	if err := database.DB.Where("hackathon_id = ? AND stage = ?", hackathonID, stage).First(&stageModel).Error; err != nil {
		return false, err
	}

	now := time.Now()
	return now.After(stageModel.StartTime) && now.Before(stageModel.EndTime), nil
}

