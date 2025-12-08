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
// 根据权限矩阵：所有主办方可以看到所有活动，但只能编辑、删除、发布自己创建的活动
func (s *HackathonService) GetHackathonList(page, pageSize int, status, keyword, sort string, organizerID *uint64) ([]models.Hackathon, int64, error) {
	var hackathons []models.Hackathon
	var total int64

	query := database.DB.Model(&models.Hackathon{}).Where("deleted_at IS NULL")

	// 移除organizerID过滤，让所有主办方可以看到所有活动
	// 权限矩阵要求：所有主办方可以看到所有活动

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

// UpdateHackathon 更新活动
// 根据权限矩阵：
// - 预备状态：仅活动创建者可以编辑所有字段
// - 发布状态及后续：活动创建者不能编辑活动基本信息，只能管理阶段
func (s *HackathonService) UpdateHackathon(id uint64, hackathon *models.Hackathon, stages []models.HackathonStage, awards []models.HackathonAward, userID uint64, userRole string) error {
	// 检查活动是否存在
	var existing models.Hackathon
	if err := database.DB.Where("id = ? AND deleted_at IS NULL", id).First(&existing).Error; err != nil {
		return err
	}

	// Admin不能编辑活动
	if userRole == "admin" {
		return errors.New("Admin不能编辑活动")
	}

	// 检查是否是活动创建者
	if existing.OrganizerID != userID {
		return errors.New("只能编辑自己创建的活动")
	}

	// 如果活动已发布，只能更新阶段，不能更新基本信息
	if existing.Status != "preparation" {
		// 已发布的活动只能更新阶段
		return database.DB.Transaction(func(tx *gorm.DB) error {
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

// DeleteHackathon 删除活动（仅预备状态，且仅活动创建者可删除）
func (s *HackathonService) DeleteHackathon(id uint64, userID uint64, userRole string) error {
	var hackathon models.Hackathon
	if err := database.DB.Where("id = ? AND deleted_at IS NULL", id).First(&hackathon).Error; err != nil {
		return err
	}

	// Admin不能删除活动
	if userRole == "admin" {
		return errors.New("Admin不能删除活动")
	}

	// 检查是否是活动创建者
	if hackathon.OrganizerID != userID {
		return errors.New("只能删除自己创建的活动")
	}

	if hackathon.Status != "preparation" {
		return errors.New("只能删除处于预备状态的活动")
	}

	return database.DB.Delete(&hackathon).Error
}

// PublishHackathon 发布活动（仅活动创建者可发布）
func (s *HackathonService) PublishHackathon(id uint64, userID uint64, userRole string) error {
	var hackathon models.Hackathon
	if err := database.DB.Where("id = ? AND deleted_at IS NULL", id).First(&hackathon).Error; err != nil {
		return err
	}

	// Admin不能发布活动
	if userRole == "admin" {
		return errors.New("Admin不能发布活动")
	}

	// 检查是否是活动创建者
	if hackathon.OrganizerID != userID {
		return errors.New("只能发布自己创建的活动")
	}

	if hackathon.Status != "preparation" {
		return errors.New("只能发布处于预备状态的活动")
	}

	return database.DB.Model(&hackathon).Update("status", "published").Error
}

// SwitchStage 切换活动阶段（仅活动创建者可切换）
func (s *HackathonService) SwitchStage(id uint64, stage string, userID uint64, userRole string) error {
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

	// Admin不能切换阶段
	if userRole == "admin" {
		return errors.New("Admin不能切换活动阶段")
	}

	// 检查是否是活动创建者
	if hackathon.OrganizerID != userID {
		return errors.New("只能切换自己创建的活动阶段")
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

// CheckHackathonCreator 检查用户是否是活动的创建者
func (s *HackathonService) CheckHackathonCreator(hackathonID, userID uint64) (bool, error) {
	var hackathon models.Hackathon
	if err := database.DB.Where("id = ? AND deleted_at IS NULL", hackathonID).First(&hackathon).Error; err != nil {
		return false, err
	}
	return hackathon.OrganizerID == userID, nil
}

// ArchiveHackathon 归档活动（软删除，仅已发布的活动可归档）
func (s *HackathonService) ArchiveHackathon(id uint64) error {
	var hackathon models.Hackathon
	if err := database.DB.Where("id = ? AND deleted_at IS NULL", id).First(&hackathon).Error; err != nil {
		return err
	}

	// 只能归档已发布的活动
	if hackathon.Status == "preparation" {
		return errors.New("只能归档已发布的活动")
	}

	return database.DB.Delete(&hackathon).Error
}

// BatchArchiveHackathons 批量归档活动
func (s *HackathonService) BatchArchiveHackathons(ids []uint64) error {
	return database.DB.Transaction(func(tx *gorm.DB) error {
		for _, id := range ids {
			var hackathon models.Hackathon
			if err := tx.Where("id = ? AND deleted_at IS NULL", id).First(&hackathon).Error; err != nil {
				continue // 跳过不存在的活动
			}

			// 只能归档已发布的活动
			if hackathon.Status == "preparation" {
				continue // 跳过预备状态的活动
			}

			if err := tx.Delete(&hackathon).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

