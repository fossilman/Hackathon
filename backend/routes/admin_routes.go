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

	api := router.Group("/api/v1/admin")
	{
		// 认证相关（无需认证）
		auth := api.Group("/auth")
		{
			auth.POST("/login", adminAuthController.Login)
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
			}

			// 活动管理（Organizer权限）
			hackathons := api.Group("/hackathons")
			hackathons.Use(middleware.RoleMiddleware("organizer", "admin"))
			{
				hackathons.POST("", adminHackathonController.CreateHackathon)
				hackathons.GET("", adminHackathonController.GetHackathonList)
				hackathons.GET("/:id", adminHackathonController.GetHackathonByID)
				hackathons.PUT("/:id", adminHackathonController.UpdateHackathon)
				hackathons.DELETE("/:id", adminHackathonController.DeleteHackathon)
				hackathons.POST("/:id/publish", adminHackathonController.PublishHackathon)
				hackathons.POST("/:id/stages/:stage/switch", adminHackathonController.SwitchStage)
			}
		}
	}
}

