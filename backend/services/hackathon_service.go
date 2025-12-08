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
	switch sort {
	case "created_at_asc":
		query = query.Order("created_at ASC")
	case "created_at_desc":
		query = query.Order("created_at DESC")
	case "start_time_asc":
		query = query.Order("start_time ASC")
	case "start_time_desc":
		query = query.Order("start_time DESC")
	case "end_time_asc":
		query = query.Order("end_time ASC")
	case "end_time_desc":
		query = query.Order("end_time DESC")
	default:
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

	return &hackathon, nil
}

// GetHackathonStats 获取活动统计信息
func (s *HackathonService) GetHackathonStats(id uint64) (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	var registrationCount, checkinCount, teamCount, submissionCount, voteCount int64
	database.DB.Model(&models.Registration{}).Where("hackathon_id = ?", id).Count(&registrationCount)
	database.DB.Model(&models.Checkin{}).Where("hackathon_id = ?", id).Count(&checkinCount)
	database.DB.Model(&models.Team{}).Where("hackathon_id = ? AND deleted_at IS NULL", id).Count(&teamCount)
	database.DB.Model(&models.Submission{}).Where("hackathon_id = ? AND draft = 0", id).Count(&submissionCount)
	database.DB.Model(&models.Vote{}).Where("hackathon_id = ?", id).Count(&voteCount)

	stats["registration_count"] = registrationCount
	stats["checkin_count"] = checkinCount
	stats["team_count"] = teamCount
	stats["submission_count"] = submissionCount
	stats["vote_count"] = voteCount

	return stats, nil
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

// UnarchiveHackathon 取消归档活动（恢复已归档的活动）
func (s *HackathonService) UnarchiveHackathon(id uint64) error {
	var hackathon models.Hackathon
	if err := database.DB.Unscoped().Where("id = ? AND deleted_at IS NOT NULL", id).First(&hackathon).Error; err != nil {
		return errors.New("活动不存在或未被归档")
	}

	// 恢复活动（取消软删除）
	return database.DB.Unscoped().Model(&hackathon).Update("deleted_at", nil).Error
}

// UpdateStageTimes 更新活动阶段时间（仅活动创建者可设置）
func (s *HackathonService) UpdateStageTimes(hackathonID uint64, stages []models.HackathonStage, userID uint64, userRole string) error {
	// 检查活动是否存在
	var hackathon models.Hackathon
	if err := database.DB.Where("id = ? AND deleted_at IS NULL", hackathonID).First(&hackathon).Error; err != nil {
		return errors.New("活动不存在")
	}

	// Admin不能设置阶段时间
	if userRole == "admin" {
		return errors.New("Admin不能设置活动阶段时间")
	}

	// 检查是否是活动创建者
	if hackathon.OrganizerID != userID {
		return errors.New("只能设置自己创建的活动阶段时间")
	}

	// 验证阶段时间
	if err := s.validateStageTimes(hackathonID, stages, &hackathon); err != nil {
		return err
	}

	// 更新阶段时间
	return database.DB.Transaction(func(tx *gorm.DB) error {
		// 删除旧阶段
		if err := tx.Where("hackathon_id = ?", hackathonID).Delete(&models.HackathonStage{}).Error; err != nil {
			return err
		}

		// 创建新阶段
		for i := range stages {
			stages[i].HackathonID = hackathonID
			if err := tx.Create(&stages[i]).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

// GetStageTimes 获取活动阶段时间设置
func (s *HackathonService) GetStageTimes(hackathonID uint64) ([]models.HackathonStage, error) {
	var stages []models.HackathonStage
	if err := database.DB.Where("hackathon_id = ?", hackathonID).Order("start_time ASC").Find(&stages).Error; err != nil {
		return nil, err
	}
	return stages, nil
}

// validateStageTimes 验证阶段时间
func (s *HackathonService) validateStageTimes(hackathonID uint64, stages []models.HackathonStage, hackathon *models.Hackathon) error {
	// 阶段顺序
	stageOrder := map[string]int{
		"registration":   1,
		"checkin":        2,
		"team_formation": 3,
		"submission":     4,
		"voting":          5,
	}

	// 检查每个阶段的时间
	for _, stage := range stages {
		// 开始时间不能早于活动开始时间
		if stage.StartTime.Before(hackathon.StartTime) {
			return fmt.Errorf("阶段 %s 的开始时间不能早于活动开始时间", stage.Stage)
		}

		// 结束时间不能晚于活动结束时间
		if stage.EndTime.After(hackathon.EndTime) {
			return fmt.Errorf("阶段 %s 的结束时间不能晚于活动结束时间", stage.Stage)
		}

		// 开始时间必须早于结束时间
		if !stage.StartTime.Before(stage.EndTime) {
			return fmt.Errorf("阶段 %s 的开始时间必须早于结束时间", stage.Stage)
		}
	}

	// 检查阶段时间是否重叠
	for i := 0; i < len(stages); i++ {
		for j := i + 1; j < len(stages); j++ {
			// 如果两个阶段的时间有重叠
			if stages[i].StartTime.Before(stages[j].EndTime) && stages[j].StartTime.Before(stages[i].EndTime) {
				return fmt.Errorf("阶段 %s 和 %s 的时间重叠", stages[i].Stage, stages[j].Stage)
			}
		}
	}

	// 检查阶段顺序（后一个阶段的开始时间不能早于前一个阶段的结束时间）
	for i := 0; i < len(stages)-1; i++ {
		for j := i + 1; j < len(stages); j++ {
			if stageOrder[stages[i].Stage] < stageOrder[stages[j].Stage] {
				// stages[i] 应该在 stages[j] 之前
				if stages[j].StartTime.Before(stages[i].EndTime) {
					return fmt.Errorf("阶段 %s 的开始时间不能早于阶段 %s 的结束时间", stages[j].Stage, stages[i].Stage)
				}
			}
		}
	}

	return nil
}

