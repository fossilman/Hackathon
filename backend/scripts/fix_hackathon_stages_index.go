package main

import (
	"fmt"
	"log"

	"hackathon-backend/config"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func main() {
	// 加载配置
	if err := config.LoadConfig(); err != nil {
		log.Fatal("Failed to load config:", err)
	}

	// 直接连接数据库，跳过自动迁移
	cfg := config.AppConfig
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		cfg.DBUser,
		cfg.DBPassword,
		cfg.DBHost,
		cfg.DBPort,
		cfg.DBName,
	)

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		log.Fatal("Failed to get database connection:", err)
	}
	defer sqlDB.Close()

	// 检查是否存在唯一索引在 hackathon_id 上（不是组合索引）
	var uniqueIndexExists bool
	var result struct {
		Count int
	}
	if err := db.Raw(`
		SELECT COUNT(*) as count 
		FROM information_schema.statistics 
		WHERE table_schema = DATABASE() 
		AND table_name = 'hackathon_stages' 
		AND index_name = 'uk_hackathon_stage' 
		AND seq_in_index = 1 
		AND column_name = 'hackathon_id'
		AND (SELECT COUNT(*) FROM information_schema.statistics 
		     WHERE table_schema = DATABASE() 
		     AND table_name = 'hackathon_stages' 
		     AND index_name = 'uk_hackathon_stage') = 1
	`).Scan(&result).Error; err == nil && result.Count > 0 {
		uniqueIndexExists = true
	}

	if uniqueIndexExists {
		log.Println("发现旧的单一字段唯一索引，需要修复...")
		
		// 删除旧的唯一索引（如果存在）
		if err := db.Exec("ALTER TABLE hackathon_stages DROP INDEX uk_hackathon_stage").Error; err != nil {
			log.Printf("警告: 删除旧索引失败（可能不存在）: %v", err)
		} else {
			log.Println("✓ 已删除旧索引")
		}
	}

	// 创建新的组合唯一索引（如果不存在）
	var comboIndexExists bool
	if err := db.Raw(`
		SELECT COUNT(*) as count 
		FROM information_schema.statistics 
		WHERE table_schema = DATABASE() 
		AND table_name = 'hackathon_stages' 
		AND index_name = 'uk_hackathon_stage' 
		AND column_name IN ('hackathon_id', 'stage')
		GROUP BY index_name
		HAVING COUNT(*) = 2
	`).Scan(&result).Error; err == nil && result.Count >= 2 {
		comboIndexExists = true
	}

	if !comboIndexExists {
		if err := db.Exec("ALTER TABLE hackathon_stages ADD UNIQUE INDEX uk_hackathon_stage (hackathon_id, stage)").Error; err != nil {
			log.Fatal("创建新索引失败:", err)
		}
		log.Println("✓ 已创建新的组合唯一索引")
	} else {
		log.Println("✓ 组合唯一索引已存在")
	}

	log.Println("✓ 索引修复成功！")
}

