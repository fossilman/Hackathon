package database

import (
	"fmt"
	"log"

	"hackathon-backend/config"
	"hackathon-backend/models"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// InitDB 初始化数据库连接
func InitDB() error {
	cfg := config.AppConfig
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		cfg.DBUser,
		cfg.DBPassword,
		cfg.DBHost,
		cfg.DBPort,
		cfg.DBName,
	)

	var err error
	DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})

	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	log.Println("Database connected successfully")

	// 迁移前清理 votes 重复数据，避免创建唯一索引 uk_participant_submission 时报错
	if err := cleanupDuplicateVotes(); err != nil {
		log.Printf("cleanup duplicate votes (optional): %v", err)
	}
	// 自动迁移
	if err := AutoMigrate(); err != nil {
		return fmt.Errorf("failed to migrate database: %w", err)
	}

	return nil
}

// cleanupDuplicateVotes 删除 votes 表中 (participant_id, submission_id) 重复记录，仅保留 id 最小的一条
func cleanupDuplicateVotes() error {
	// MySQL: 删除重复行，保留每组 (participant_id, submission_id) 中 id 最小的
	return DB.Exec(`
		DELETE v1 FROM votes v1
		INNER JOIN votes v2
		ON v1.participant_id = v2.participant_id AND v1.submission_id = v2.submission_id AND v1.id > v2.id
	`).Error
}

// AutoMigrate 自动迁移数据库表
func AutoMigrate() error {
	return DB.AutoMigrate(
		&models.User{},
		&models.UserWallet{},
		&models.Participant{},
		&models.Hackathon{},
		&models.HackathonStage{},
		&models.HackathonAward{},
		&models.HackathonPrize{},
		&models.Registration{},
		&models.Checkin{},
		&models.Team{},
		&models.TeamMember{},
		&models.Submission{},
		&models.SubmissionHistory{},
		&models.Vote{},
		&models.SponsorApplication{},
		&models.Sponsor{},
		&models.HackathonSponsorEvent{},
	)
}

// CloseDB 关闭数据库连接
func CloseDB() error {
	sqlDB, err := DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
