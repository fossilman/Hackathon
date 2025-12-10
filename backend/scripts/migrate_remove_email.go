package main

import (
	"fmt"
	"log"

	"hackathon-backend/config"
	"hackathon-backend/database"
)

func main() {
	// 加载配置
	if err := config.LoadConfig(); err != nil {
		log.Fatal("Failed to load config:", err)
	}

	// 初始化数据库连接
	if err := database.InitDB(); err != nil {
		log.Fatal("Failed to initialize database:", err)
	}
	defer database.CloseDB()

	db := database.DB

	log.Println("开始迁移：移除 users 表的 email 字段...")

	// 检查 email 字段是否存在
	var columnExists bool
	var result struct {
		Count int
	}
	if err := db.Raw(`
		SELECT COUNT(*) as count 
		FROM information_schema.columns 
		WHERE table_schema = DATABASE() 
		AND table_name = 'users' 
		AND column_name = 'email'
	`).Scan(&result).Error; err == nil && result.Count > 0 {
		columnExists = true
	}

	if !columnExists {
		log.Println("✓ email 字段不存在，无需迁移")
		return
	}

	log.Println("发现 email 字段，开始移除...")

	// 检查是否有唯一索引在 email 上
	var emailIndexExists bool
	var indexResult struct {
		Count int
	}
	if err := db.Raw(`
		SELECT COUNT(*) as count 
		FROM information_schema.statistics 
		WHERE table_schema = DATABASE() 
		AND table_name = 'users' 
		AND column_name = 'email'
	`).Scan(&indexResult).Error; err == nil && indexResult.Count > 0 {
		emailIndexExists = true
	}

	// 删除 email 字段上的唯一索引（如果存在）
	if emailIndexExists {
		log.Println("删除 email 字段的唯一索引...")
		// 查找索引名称
		var indexName struct {
			IndexName string
		}
		if err := db.Raw(`
			SELECT DISTINCT index_name as index_name
			FROM information_schema.statistics 
			WHERE table_schema = DATABASE() 
			AND table_name = 'users' 
			AND column_name = 'email'
			LIMIT 1
		`).Scan(&indexName).Error; err == nil && indexName.IndexName != "" {
			dropIndexSQL := fmt.Sprintf("ALTER TABLE users DROP INDEX %s", indexName.IndexName)
			if err := db.Exec(dropIndexSQL).Error; err != nil {
				log.Printf("警告: 删除 email 索引失败（可能不存在）: %v", err)
			} else {
				log.Printf("✓ 已删除索引: %s", indexName.IndexName)
			}
		}
	}

	// 删除 email 字段
	log.Println("删除 email 字段...")
	if err := db.Exec("ALTER TABLE users DROP COLUMN email").Error; err != nil {
		log.Fatalf("删除 email 字段失败: %v", err)
	}
	log.Println("✓ 已删除 email 字段")

	// 确保 phone 字段有唯一索引（如果不存在）
	log.Println("检查 phone 字段的唯一索引...")
	var phoneIndexExists bool
	var phoneIndexResult struct {
		Count int
	}
	if err := db.Raw(`
		SELECT COUNT(*) as count 
		FROM information_schema.statistics 
		WHERE table_schema = DATABASE() 
		AND table_name = 'users' 
		AND column_name = 'phone'
		AND non_unique = 0
	`).Scan(&phoneIndexResult).Error; err == nil && phoneIndexResult.Count > 0 {
		phoneIndexExists = true
	}

	if !phoneIndexExists {
		log.Println("创建 phone 字段的唯一索引...")
		// 先检查是否有 NULL 值，如果有则先处理
		var nullCount struct {
			Count int
		}
		if err := db.Raw("SELECT COUNT(*) as count FROM users WHERE phone IS NULL OR phone = ''").Scan(&nullCount).Error; err == nil && nullCount.Count > 0 {
			log.Printf("警告: 发现 %d 条记录的 phone 字段为空，将设置为 NULL", nullCount.Count)
			// 将空字符串设置为 NULL
			if err := db.Exec("UPDATE users SET phone = NULL WHERE phone = '' OR phone IS NULL").Error; err != nil {
				log.Printf("警告: 更新空 phone 值失败: %v", err)
			}
		}

		// 创建唯一索引（允许 NULL 值）
		if err := db.Exec("CREATE UNIQUE INDEX idx_users_phone ON users(phone)").Error; err != nil {
			// 如果是因为重复值导致的错误，给出提示
			if err.Error() != "" {
				log.Printf("警告: 创建 phone 唯一索引失败（可能存在重复值）: %v", err)
				log.Println("请先处理重复的 phone 值，然后手动创建索引")
			}
		} else {
			log.Println("✓ 已创建 phone 字段的唯一索引")
		}
	} else {
		log.Println("✓ phone 字段的唯一索引已存在")
	}

	// 确保 user_wallets 表存在
	log.Println("检查 user_wallets 表...")
	var walletTableExists bool
	var walletTableResult struct {
		Count int
	}
	if err := db.Raw(`
		SELECT COUNT(*) as count 
		FROM information_schema.tables 
		WHERE table_schema = DATABASE() 
		AND table_name = 'user_wallets'
	`).Scan(&walletTableResult).Error; err == nil && walletTableResult.Count > 0 {
		walletTableExists = true
	}

	if !walletTableExists {
		log.Println("创建 user_wallets 表...")
		if err := db.Exec(`
			CREATE TABLE user_wallets (
				id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
				user_id BIGINT UNSIGNED NOT NULL,
				address VARCHAR(255) NOT NULL,
				created_at DATETIME NOT NULL,
				updated_at DATETIME NOT NULL,
				UNIQUE KEY idx_user_wallets_address (address),
				KEY idx_user_wallets_user_id (user_id),
				CONSTRAINT fk_user_wallets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
		`).Error; err != nil {
			log.Printf("警告: 创建 user_wallets 表失败: %v", err)
		} else {
			log.Println("✓ 已创建 user_wallets 表")
		}
	} else {
		log.Println("✓ user_wallets 表已存在")
	}

	log.Println("\n✅ 迁移完成！")
}

