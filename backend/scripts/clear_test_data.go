package main

import (
	"fmt"
	"log"
	"os"

	"hackathon-backend/config"
	"hackathon-backend/database"
	"hackathon-backend/models"
)

func main() {
	// 加载配置
	err := config.LoadConfig()
	if err != nil {
		log.Fatalf("加载配置失败: %v", err)
	}

	// 初始化数据库连接
	err = database.InitDB()
	if err != nil {
		log.Fatalf("初始化数据库失败: %v", err)
	}
	defer database.CloseDB()

	db := database.DB

	// 确认操作
	fmt.Println("警告: 此操作将清空所有测试数据!")
	fmt.Println("将删除以下数据:")
	fmt.Println("  - 所有投票 (Votes)")
	fmt.Println("  - 所有提交 (Submissions)")
	fmt.Println("  - 所有签到记录 (Checkins)")
	fmt.Println("  - 所有注册记录 (Registrations)")
	fmt.Println("  - 所有团队成员 (TeamMembers)")
	fmt.Println("  - 所有参赛者 (Participants)")
	fmt.Println("  - 所有团队 (Teams)")
	fmt.Println("  - 所有黑客松阶段 (HackathonStages)")
	fmt.Println("  - 所有黑客松奖项 (HackathonAwards)")
	fmt.Println("  - 所有黑客松 (Hackathons)")
	fmt.Println("  - 所有普通用户 (Users, 但保留管理员)")
	fmt.Println()
	fmt.Print("确认继续? (yes/no): ")

	var confirm string
	fmt.Scanln(&confirm)
	if confirm != "yes" {
		fmt.Println("操作已取消")
		os.Exit(0)
	}

	// 禁用外键检查（MySQL）
	if err := db.Exec("SET FOREIGN_KEY_CHECKS = 0").Error; err != nil {
		log.Fatalf("禁用外键检查失败: %v", err)
	}
	defer func() {
		if err := db.Exec("SET FOREIGN_KEY_CHECKS = 1").Error; err != nil {
			log.Printf("警告: 恢复外键检查失败: %v", err)
		}
	}()

	// 开始事务
	tx := db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			log.Fatalf("操作失败，已回滚: %v", r)
		}
	}()

	// 清空数据（按依赖关系顺序）
	fmt.Println("\n开始清空数据...")

	// 1. 清空投票（最依赖）- 使用 Unscoped 硬删除
	result := tx.Unscoped().Where("1 = 1").Delete(&models.Vote{})
	if result.Error != nil {
		tx.Rollback()
		log.Fatalf("清空投票失败: %v", result.Error)
	}
	fmt.Printf("✓ 已清空投票数据 (删除 %d 条记录)\n", result.RowsAffected)

	// 2. 清空提交
	result = tx.Unscoped().Where("1 = 1").Delete(&models.Submission{})
	if result.Error != nil {
		tx.Rollback()
		log.Fatalf("清空提交失败: %v", result.Error)
	}
	fmt.Printf("✓ 已清空提交数据 (删除 %d 条记录)\n", result.RowsAffected)

	// 3. 清空签到记录
	result = tx.Unscoped().Where("1 = 1").Delete(&models.Checkin{})
	if result.Error != nil {
		tx.Rollback()
		log.Fatalf("清空签到记录失败: %v", result.Error)
	}
	fmt.Printf("✓ 已清空签到记录 (删除 %d 条记录)\n", result.RowsAffected)

	// 4. 清空注册记录
	result = tx.Unscoped().Where("1 = 1").Delete(&models.Registration{})
	if result.Error != nil {
		tx.Rollback()
		log.Fatalf("清空注册记录失败: %v", result.Error)
	}
	fmt.Printf("✓ 已清空注册记录 (删除 %d 条记录)\n", result.RowsAffected)

	// 5. 清空团队成员关系
	result = tx.Unscoped().Where("1 = 1").Delete(&models.TeamMember{})
	if result.Error != nil {
		tx.Rollback()
		log.Fatalf("清空团队成员数据失败: %v", result.Error)
	}
	fmt.Printf("✓ 已清空团队成员数据 (删除 %d 条记录)\n", result.RowsAffected)

	// 6. 清空参赛者 - 使用 Unscoped 硬删除（有软删除）
	result = tx.Unscoped().Where("1 = 1").Delete(&models.Participant{})
	if result.Error != nil {
		tx.Rollback()
		log.Fatalf("清空参赛者数据失败: %v", result.Error)
	}
	fmt.Printf("✓ 已清空参赛者数据 (删除 %d 条记录)\n", result.RowsAffected)

	// 7. 清空团队 - 使用 Unscoped 硬删除（有软删除）
	result = tx.Unscoped().Where("1 = 1").Delete(&models.Team{})
	if result.Error != nil {
		tx.Rollback()
		log.Fatalf("清空团队数据失败: %v", result.Error)
	}
	fmt.Printf("✓ 已清空团队数据 (删除 %d 条记录)\n", result.RowsAffected)

	// 8. 清空黑客松阶段
	result = tx.Unscoped().Where("1 = 1").Delete(&models.HackathonStage{})
	if result.Error != nil {
		tx.Rollback()
		log.Fatalf("清空黑客松阶段数据失败: %v", result.Error)
	}
	fmt.Printf("✓ 已清空黑客松阶段数据 (删除 %d 条记录)\n", result.RowsAffected)

	// 9. 清空黑客松奖项
	result = tx.Unscoped().Where("1 = 1").Delete(&models.HackathonAward{})
	if result.Error != nil {
		tx.Rollback()
		log.Fatalf("清空黑客松奖项数据失败: %v", result.Error)
	}
	fmt.Printf("✓ 已清空黑客松奖项数据 (删除 %d 条记录)\n", result.RowsAffected)

	// 10. 清空黑客松 - 使用 Unscoped 硬删除（有软删除）
	result = tx.Unscoped().Where("1 = 1").Delete(&models.Hackathon{})
	if result.Error != nil {
		tx.Rollback()
		log.Fatalf("清空黑客松数据失败: %v", result.Error)
	}
	fmt.Printf("✓ 已清空黑客松数据 (删除 %d 条记录)\n", result.RowsAffected)

	// 11. 清空普通用户（保留管理员，role = 'admin'）- 使用 Unscoped 硬删除（有软删除）
	result = tx.Unscoped().Where("role != ?", "admin").Delete(&models.User{})
	if result.Error != nil {
		tx.Rollback()
		log.Fatalf("清空用户数据失败: %v", result.Error)
	}
	fmt.Printf("✓ 已清空普通用户数据（保留管理员）(删除 %d 条记录)\n", result.RowsAffected)

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		log.Fatalf("提交事务失败: %v", err)
	}

	fmt.Println("\n✓ 所有测试数据已成功清空!")
}

