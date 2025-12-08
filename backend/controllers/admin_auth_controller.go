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

// GetProfile 获取当前用户信息
func (c *AdminAuthController) GetProfile(ctx *gin.Context) {
	userID, _ := ctx.Get("user_id")
	user, err := c.userService.GetCurrentUser(userID.(uint64))
	if err != nil {
		utils.NotFound(ctx, "用户不存在")
		return
	}

	utils.Success(ctx, user)
}

// UpdateProfile 更新当前用户信息
func (c *AdminAuthController) UpdateProfile(ctx *gin.Context) {
	userID, _ := ctx.Get("user_id")

	var updates map[string]interface{}
	if err := ctx.ShouldBindJSON(&updates); err != nil {
		utils.BadRequest(ctx, "参数错误: "+err.Error())
		return
	}

	if err := c.userService.UpdateCurrentUser(userID.(uint64), updates); err != nil {
		utils.BadRequest(ctx, err.Error())
		return
	}

	utils.Success(ctx, nil)
}

// ChangePassword 修改当前用户密码
func (c *AdminAuthController) ChangePassword(ctx *gin.Context) {
	userID, _ := ctx.Get("user_id")

	var req struct {
		OldPassword string `json:"old_password" binding:"required"`
		NewPassword string `json:"new_password" binding:"required,min=8"`
	}

	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(ctx, "参数错误: "+err.Error())
		return
	}

	if err := c.userService.UpdatePassword(userID.(uint64), req.OldPassword, req.NewPassword); err != nil {
		utils.BadRequest(ctx, err.Error())
		return
	}

	utils.Success(ctx, nil)
}

