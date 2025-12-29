package main

import (
	"log"

	"hackathon-backend/config"
	"hackathon-backend/database"
	"hackathon-backend/middleware"
	"hackathon-backend/routes"

	"github.com/gin-gonic/gin"
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

	// 设置Gin模式
	if config.AppConfig != nil {
		gin.SetMode(config.AppConfig.ServerMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}

	// 创建Gin引擎
	router := gin.Default()

	// 添加CORS中间件
	router.Use(middleware.CORSMiddleware())

	// 设置路由
	routes.SetupAdminRoutes(router)
	routes.SetupArenaRoutes(router)

	// 健康检查
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
		})
	})

	// 启动服务器
	var port string
	if config.AppConfig != nil && config.AppConfig.ServerPort != "" {
		port = ":" + config.AppConfig.ServerPort
	} else {
		port = ":8000" // 默认端口
	}
	log.Printf("Server starting on port %s", port)
	if err := router.Run(port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

