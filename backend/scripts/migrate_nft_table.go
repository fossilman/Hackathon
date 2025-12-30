package main

import (
	"fmt"
	"log"

	"hackathon-backend/config"
	"hackathon-backend/database"
	"hackathon-backend/models"
)

func main() {
	// 加载配置
	if err := config.LoadConfig("../config.yaml"); err != nil {
		log.Fatalf("加载配置失败: %v", err)
	}

	// 初始化数据库连接
	if err := database.InitDB(); err != nil {
		log.Fatalf("初始化数据库失败: %v", err)
	}
	defer database.CloseDB()

	fmt.Println("开始迁移 nft_records 表...")

	// 删除旧表（如果存在）
	if database.DB.Migrator().HasTable(&models.NFTRecord{}) {
		fmt.Println("检测到旧的 nft_records 表，准备删除...")
		if err := database.DB.Migrator().DropTable(&models.NFTRecord{}); err != nil {
			log.Fatalf("删除旧表失败: %v", err)
		}
		fmt.Println("旧表已删除")
	}

	// 重新创建表
	fmt.Println("创建新的 nft_records 表...")
	if err := database.DB.AutoMigrate(&models.NFTRecord{}); err != nil {
		log.Fatalf("创建表失败: %v", err)
	}

	fmt.Println("✓ nft_records 表迁移完成！")
	fmt.Println("表结构:")
	fmt.Println("  - id: 主键")
	fmt.Println("  - hackathon_id: 活动ID（外键关联到 hackathons 表）")
	fmt.Println("  - participant_id: 参赛者ID（外键关联到 participants 表）")
	fmt.Println("  - token_id: NFT Token ID")
	fmt.Println("  - transaction_hash: 交易哈希")
	fmt.Println("  - minted_at: 发放时间")
}
