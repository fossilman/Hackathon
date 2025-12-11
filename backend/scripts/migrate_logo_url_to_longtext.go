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

	// 直接连接数据库
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

	log.Println("开始迁移：修改 logo_url 字段类型为 LONGTEXT...")

	// 修改 sponsor_applications 表的 logo_url 字段
	log.Println("修改 sponsor_applications 表的 logo_url 字段...")
	if err := db.Exec("ALTER TABLE sponsor_applications MODIFY COLUMN logo_url LONGTEXT NOT NULL").Error; err != nil {
		log.Fatal("修改 sponsor_applications.logo_url 失败:", err)
	}
	log.Println("✓ 已修改 sponsor_applications.logo_url 为 LONGTEXT")

	// 修改 sponsors 表的 logo_url 字段
	log.Println("修改 sponsors 表的 logo_url 字段...")
	if err := db.Exec("ALTER TABLE sponsors MODIFY COLUMN logo_url LONGTEXT NOT NULL").Error; err != nil {
		log.Fatal("修改 sponsors.logo_url 失败:", err)
	}
	log.Println("✓ 已修改 sponsors.logo_url 为 LONGTEXT")

	log.Println("\n✓ 迁移完成！")
}

