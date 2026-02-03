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
	log.Println("开始迁移：user_wallets 表增加 wallet_type 字段...")

	var result struct {
		Count int
	}
	if err := db.Raw(`
		SELECT COUNT(*) as count 
		FROM information_schema.columns 
		WHERE table_schema = DATABASE() 
		AND table_name = 'user_wallets' 
		AND column_name = 'wallet_type'
	`).Scan(&result).Error; err != nil {
		log.Fatal("检查字段失败:", err)
	}

	if result.Count > 0 {
		log.Println("✓ wallet_type 字段已存在，无需迁移")
		return
	}

	if err := db.Exec(`
		ALTER TABLE user_wallets 
		ADD COLUMN wallet_type VARCHAR(20) NOT NULL DEFAULT 'metamask' 
		COMMENT '钱包类型: metamask | phantom'
	`).Error; err != nil {
		log.Fatal("添加 wallet_type 失败:", err)
	}

	log.Println("✓ user_wallets.wallet_type 迁移成功")
}
