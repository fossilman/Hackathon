package main

import (
	"log"

	"hackathon-backend/config"
	"hackathon-backend/database"
)

func main() {
	if err := config.LoadConfig(); err != nil {
		log.Fatal("Failed to load config:", err)
	}
	if err := database.InitDB(); err != nil {
		log.Fatal("Failed to initialize database:", err)
	}
	defer database.CloseDB()

	db := database.DB
	log.Println("开始迁移：hackathons 表增加 chain_activity_address 字段...")

	var result struct {
		Count int
	}
	if err := db.Raw(`
		SELECT COUNT(*) as count 
		FROM information_schema.columns 
		WHERE table_schema = DATABASE() 
		AND table_name = 'hackathons' 
		AND column_name = 'chain_activity_address'
	`).Scan(&result).Error; err != nil {
		log.Fatal("检查字段失败:", err)
	}

	if result.Count > 0 {
		log.Println("✓ chain_activity_address 字段已存在，无需迁移")
		return
	}

	if err := db.Exec(`
		ALTER TABLE hackathons 
		ADD COLUMN chain_activity_address VARCHAR(64) NULL DEFAULT NULL 
		COMMENT 'Solana 活动账户 PDA，上链后可查'
	`).Error; err != nil {
		log.Fatal("添加 chain_activity_address 失败:", err)
	}

	if err := db.Exec(`CREATE INDEX idx_hackathons_chain_activity_address ON hackathons(chain_activity_address)`).Error; err != nil {
		log.Println("警告: 创建索引失败（可能已存在）:", err)
	}

	log.Println("✓ hackathons.chain_activity_address 迁移成功")
}
