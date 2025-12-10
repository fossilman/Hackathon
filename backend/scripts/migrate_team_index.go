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

	log.Println("开始迁移：修改 teams 表的唯一索引...")

	// 检查是否存在旧的 uk_hackathon_name 唯一索引
	var oldIndexExists bool
	var result struct {
		Count int
	}
	if err := db.Raw(`
		SELECT COUNT(*) as count 
		FROM information_schema.statistics 
		WHERE table_schema = DATABASE() 
		AND table_name = 'teams' 
		AND index_name = 'uk_hackathon_name'
	`).Scan(&result).Error; err == nil && result.Count > 0 {
		oldIndexExists = true
	}

	if oldIndexExists {
		log.Println("发现旧的 uk_hackathon_name 唯一索引，开始删除...")
		
		// 删除旧的唯一索引
		if err := db.Exec("ALTER TABLE teams DROP INDEX uk_hackathon_name").Error; err != nil {
			log.Fatal("删除旧索引失败:", err)
		}
		log.Println("✓ 已删除旧索引 uk_hackathon_name")
	} else {
		log.Println("✓ 旧索引 uk_hackathon_name 不存在，跳过删除")
	}

	// 检查是否存在新的 uk_hackathon_leader 唯一索引
	var newIndexExists bool
	if err := db.Raw(`
		SELECT COUNT(*) as count 
		FROM information_schema.statistics 
		WHERE table_schema = DATABASE() 
		AND table_name = 'teams' 
		AND index_name = 'uk_hackathon_leader' 
		AND column_name IN ('hackathon_id', 'leader_id')
		GROUP BY index_name
		HAVING COUNT(*) = 2
	`).Scan(&result).Error; err == nil && result.Count >= 2 {
		newIndexExists = true
	}

	if !newIndexExists {
		log.Println("创建新的 uk_hackathon_leader 唯一索引...")
		
		// 创建新的组合唯一索引
		if err := db.Exec("ALTER TABLE teams ADD UNIQUE INDEX uk_hackathon_leader (hackathon_id, leader_id)").Error; err != nil {
			log.Fatal("创建新索引失败:", err)
		}
		log.Println("✓ 已创建新的组合唯一索引 uk_hackathon_leader (hackathon_id, leader_id)")
	} else {
		log.Println("✓ 新索引 uk_hackathon_leader 已存在")
	}

	log.Println("✓ 索引迁移成功！")
	log.Println("")
	log.Println("说明：")
	log.Println("  - 已删除旧的 uk_hackathon_name 唯一索引（基于 hackathon_id 和 name）")
	log.Println("  - 已创建新的 uk_hackathon_leader 唯一索引（基于 hackathon_id 和 leader_id）")
	log.Println("  - 现在允许同一活动下多个队伍使用相同的名称")
	log.Println("  - 一个队长在一个活动中只能创建一个队伍")
}

