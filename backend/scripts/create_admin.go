package main

import (
	"fmt"
	"log"
	"os"

	"hackathon-backend/config"
	"hackathon-backend/database"
	"hackathon-backend/models"
	"hackathon-backend/utils"
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

	// 从命令行参数获取邮箱和密码，如果没有则使用默认值
	email := "admin@hackathon.com"
	password := "admin123456"
	name := "系统管理员"
	role := "admin"

	if len(os.Args) > 1 {
		email = os.Args[1]
	}
	if len(os.Args) > 2 {
		password = os.Args[2]
	}
	if len(os.Args) > 3 {
		name = os.Args[3]
	}
	if len(os.Args) > 4 {
		role = os.Args[4]
	}

	// 验证角色
	if role != "admin" && role != "organizer" && role != "sponsor" {
		log.Fatal("角色必须是 admin, organizer 或 sponsor")
	}

	// 检查用户是否已存在
	var existingUser models.User
	if err := database.DB.Where("email = ?", email).First(&existingUser).Error; err == nil {
		fmt.Printf("用户 %s 已存在，ID: %d\n", email, existingUser.ID)
		return
	}

	// 加密密码
	hashedPassword, err := utils.HashPassword(password)
	if err != nil {
		log.Fatal("Failed to hash password:", err)
	}

	// 创建用户
	user := models.User{
		Name:     name,
		Email:    email,
		Password: hashedPassword,
		Role:     role,
		Status:   1,
	}

	if err := database.DB.Create(&user).Error; err != nil {
		log.Fatal("Failed to create user:", err)
	}

	fmt.Printf("✅ 用户创建成功！\n")
	fmt.Printf("   邮箱: %s\n", email)
	fmt.Printf("   密码: %s\n", password)
	fmt.Printf("   姓名: %s\n", name)
	fmt.Printf("   角色: %s\n", role)
	fmt.Printf("   ID: %d\n", user.ID)
	fmt.Printf("\n请妥善保管密码，首次登录后建议修改密码。\n")
}
