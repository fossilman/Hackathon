package controllers

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"hackathon-backend/models"
	"hackathon-backend/services"
	"hackathon-backend/utils"
)

type AdminUserController struct {
	userService *services.UserService
}

func NewAdminUserController() *AdminUserController {
	return &AdminUserController{
		userService: &services.UserService{},
	}
}

// CreateUser 创建用户
func (c *AdminUserController) CreateUser(ctx *gin.Context) {
	var user models.User
	if err := ctx.ShouldBindJSON(&user); err != nil {
		utils.BadRequest(ctx, "参数错误: "+err.Error())
		return
	}

	// 验证必填字段
	if user.Name == "" || user.Email == "" || user.Password == "" || user.Role == "" {
		utils.BadRequest(ctx, "姓名、邮箱、密码和角色为必填项")
		return
	}

	// 验证角色
	if user.Role != "organizer" && user.Role != "sponsor" {
		utils.BadRequest(ctx, "角色只能是organizer或sponsor")
		return
	}

	// 验证密码
	if len(user.Password) < 8 {
		utils.BadRequest(ctx, "密码至少8位")
		return
	}

	if err := c.userService.CreateUser(&user); err != nil {
		utils.BadRequest(ctx, err.Error())
		return
	}

	utils.Success(ctx, user)
}

// GetUserList 获取用户列表
func (c *AdminUserController) GetUserList(ctx *gin.Context) {
	page, _ := strconv.Atoi(ctx.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(ctx.DefaultQuery("page_size", "10"))
	role := ctx.Query("role")
	keyword := ctx.Query("keyword")

	users, total, err := c.userService.GetUserList(page, pageSize, role, keyword)
	if err != nil {
		utils.InternalServerError(ctx, err.Error())
		return
	}

	utils.SuccessWithPagination(ctx, users, page, pageSize, total)
}

// GetUserByID 获取用户详情
func (c *AdminUserController) GetUserByID(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		utils.BadRequest(ctx, "无效的用户ID")
		return
	}

	user, err := c.userService.GetUserByID(id)
	if err != nil {
		utils.NotFound(ctx, "用户不存在")
		return
	}

	utils.Success(ctx, user)
}

// UpdateUser 更新用户
func (c *AdminUserController) UpdateUser(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		utils.BadRequest(ctx, "无效的用户ID")
		return
	}

	var updates map[string]interface{}
	if err := ctx.ShouldBindJSON(&updates); err != nil {
		utils.BadRequest(ctx, "参数错误: "+err.Error())
		return
	}

	if err := c.userService.UpdateUser(id, updates); err != nil {
		utils.BadRequest(ctx, err.Error())
		return
	}

	utils.Success(ctx, nil)
}

// DeleteUser 删除用户
func (c *AdminUserController) DeleteUser(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		utils.BadRequest(ctx, "无效的用户ID")
		return
	}

	if err := c.userService.DeleteUser(id); err != nil {
		utils.BadRequest(ctx, err.Error())
		return
	}

	utils.Success(ctx, nil)
}

