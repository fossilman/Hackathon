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

	// 初始化数据库
	if err := database.InitDB(); err != nil {
		log.Fatal("Failed to initialize database:", err)
	}
	defer database.CloseDB()

	db := database.DB

	// 查询所有索引
	type IndexInfo struct {
		TableName  string `gorm:"column:Table"`
		NonUnique  int    `gorm:"column:Non_unique"`
		KeyName    string `gorm:"column:Key_name"`
		SeqInIndex int    `gorm:"column:Seq_in_index"`
		ColumnName string `gorm:"column:Column_name"`
	}

	var indexes []IndexInfo
	if err := db.Raw("SHOW INDEX FROM hackathon_stages").Scan(&indexes).Error; err != nil {
		log.Fatal("查询索引失败:", err)
	}

	fmt.Println("hackathon_stages 表的所有索引：")
	for _, idx := range indexes {
		fmt.Printf("  索引名: %s, 唯一: %v, 列: %s, 序号: %d\n", 
			idx.KeyName, idx.NonUnique == 0, idx.ColumnName, idx.SeqInIndex)
	}
}

