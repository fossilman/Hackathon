package controllers

import (
	"github.com/gin-gonic/gin"
	"hackathon-backend/services"
	"hackathon-backend/utils"
)

type AdminAuthController struct {
	userService *services.UserService
}

func NewAdminAuthController() *AdminAuthController {
	return &AdminAuthController{
		userService: &services.UserService{},
	}
}

// Login 登录
func (c *AdminAuthController) Login(ctx *gin.Context) {
	var req struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}

	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(ctx, "参数错误: "+err.Error())
		return
	}

	user, token, err := c.userService.Login(req.Email, req.Password)
	if err != nil {
		utils.BadRequest(ctx, err.Error())
		return
	}

	utils.Success(ctx, gin.H{
		"token": token,
		"user": gin.H{
			"id":    user.ID,
			"name":  user.Name,
			"email": user.Email,
			"role":   user.Role,
		},
	})
}

// Logout 登出
func (c *AdminAuthController) Logout(ctx *gin.Context) {
	// JWT是无状态的，客户端删除token即可
	utils.Success(ctx, nil)
}

