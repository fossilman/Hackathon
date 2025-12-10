package routes

import (
	"hackathon-backend/controllers"
	"hackathon-backend/middleware"

	"github.com/gin-gonic/gin"
)

func SetupAdminRoutes(router *gin.Engine) {
	adminAuthController := controllers.NewAdminAuthController()
	adminUserController := controllers.NewAdminUserController()
	adminHackathonController := controllers.NewAdminHackathonController()
	adminDashboardController := controllers.NewAdminDashboardController()

	api := router.Group("/api/v1/admin")
	{
		// 认证相关（无需认证）
		auth := api.Group("/auth")
		{
			auth.POST("/login", adminAuthController.Login)
			auth.POST("/login/wallet", adminAuthController.LoginWithWallet)
			auth.POST("/logout", middleware.AuthMiddleware(), adminAuthController.Logout)
		}

		// 需要认证的路由
		api.Use(middleware.AuthMiddleware())
		{
			// 人员管理（Admin权限）
			users := api.Group("/users")
			users.Use(middleware.RoleMiddleware("admin"))
			{
				users.POST("", adminUserController.CreateUser)
				users.GET("", adminUserController.GetUserList)
				users.GET("/:id", adminUserController.GetUserByID)
				users.PATCH("/:id", adminUserController.UpdateUser)
				users.DELETE("/:id", adminUserController.DeleteUser)
				users.POST("/:id/restore", adminUserController.RestoreUser)
				users.POST("/:id/reset-password", adminUserController.ResetPassword)
			}

			// 个人中心（所有角色）
			profile := api.Group("/profile")
			{
				profile.GET("", adminAuthController.GetProfile)
				profile.PATCH("", adminAuthController.UpdateProfile)
				profile.POST("/change-password", adminAuthController.ChangePassword)
				// 钱包地址管理
				profile.GET("/wallets", adminAuthController.GetWallets)
				profile.DELETE("/wallets/:id", adminAuthController.DeleteWallet)
			}

			// 仪表盘（Organizer和Admin都可以）
			api.GET("/dashboard", middleware.RoleMiddleware("organizer", "admin"), adminDashboardController.GetDashboard)

			// 活动管理
			hackathons := api.Group("/hackathons")
			{
				// 查看活动列表和详情（Organizer和Admin都可以）
				hackathons.GET("", middleware.RoleMiddleware("organizer", "admin"), adminHackathonController.GetHackathonList)
				hackathons.GET("/:id", middleware.RoleMiddleware("organizer", "admin"), adminHackathonController.GetHackathonByID)
				hackathons.GET("/:id/stats", middleware.RoleMiddleware("organizer", "admin"), adminHackathonController.GetHackathonStats)

				// 创建活动（仅Organizer）
				hackathons.POST("", middleware.RoleMiddleware("organizer"), adminHackathonController.CreateHackathon)

				// 编辑、删除、发布活动（仅Organizer，且仅活动创建者）
				hackathons.PUT("/:id", middleware.RoleMiddleware("organizer"), adminHackathonController.UpdateHackathon)
				hackathons.DELETE("/:id", middleware.RoleMiddleware("organizer"), adminHackathonController.DeleteHackathon)
				hackathons.POST("/:id/publish", middleware.RoleMiddleware("organizer"), adminHackathonController.PublishHackathon)

				// 阶段管理（仅Organizer，且仅活动创建者）
				hackathons.POST("/:id/stages/:stage/switch", middleware.RoleMiddleware("organizer"), adminHackathonController.SwitchStage)
				hackathons.GET("/:id/stages", middleware.RoleMiddleware("organizer", "admin"), adminHackathonController.GetStageTimes)
				hackathons.PUT("/:id/stages", middleware.RoleMiddleware("organizer"), adminHackathonController.UpdateStageTimes)

				// 归档活动（Organizer和Admin都可以，但需检查权限）
				hackathons.POST("/:id/archive", middleware.RoleMiddleware("organizer", "admin"), adminHackathonController.ArchiveHackathon)
				hackathons.POST("/:id/unarchive", middleware.RoleMiddleware("organizer", "admin"), adminHackathonController.UnarchiveHackathon)
				hackathons.POST("/batch-archive", middleware.RoleMiddleware("organizer", "admin"), adminHackathonController.BatchArchiveHackathons)
			}
		}
	}
}

