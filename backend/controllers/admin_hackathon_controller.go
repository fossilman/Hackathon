package controllers

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"hackathon-backend/models"
	"hackathon-backend/services"
	"hackathon-backend/utils"
)

type AdminHackathonController struct {
	hackathonService *services.HackathonService
}

func NewAdminHackathonController() *AdminHackathonController {
	return &AdminHackathonController{
		hackathonService: &services.HackathonService{},
	}
}

// CreateHackathon 创建活动
func (c *AdminHackathonController) CreateHackathon(ctx *gin.Context) {
	var req struct {
		models.Hackathon
		Stages []models.HackathonStage `json:"stages"`
		Awards []models.HackathonAward  `json:"awards"`
	}

	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(ctx, "参数错误: "+err.Error())
		return
	}

	// 获取当前用户ID
	organizerID, _ := ctx.Get("user_id")
	req.Hackathon.OrganizerID = organizerID.(uint64)
	req.Hackathon.Status = "preparation"

	if err := c.hackathonService.CreateHackathon(&req.Hackathon, req.Stages, req.Awards); err != nil {
		utils.BadRequest(ctx, err.Error())
		return
	}

	utils.Success(ctx, req.Hackathon)
}

// GetHackathonList 获取活动列表
func (c *AdminHackathonController) GetHackathonList(ctx *gin.Context) {
	page, _ := strconv.Atoi(ctx.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(ctx.DefaultQuery("page_size", "10"))
	status := ctx.Query("status")
	keyword := ctx.Query("keyword")
	sort := ctx.DefaultQuery("sort", "created_at_desc")

	// 获取当前用户ID（主办方只能看自己的活动）
	organizerID, exists := ctx.Get("user_id")
	var organizerIDPtr *uint64
	if exists {
		id := organizerID.(uint64)
		organizerIDPtr = &id
	}

	hackathons, total, err := c.hackathonService.GetHackathonList(page, pageSize, status, keyword, sort, organizerIDPtr)
	if err != nil {
		utils.InternalServerError(ctx, err.Error())
		return
	}

	utils.SuccessWithPagination(ctx, hackathons, page, pageSize, total)
}

// GetHackathonByID 获取活动详情
func (c *AdminHackathonController) GetHackathonByID(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		utils.BadRequest(ctx, "无效的活动ID")
		return
	}

	hackathon, err := c.hackathonService.GetHackathonByID(id)
	if err != nil {
		utils.NotFound(ctx, "活动不存在")
		return
	}

	utils.Success(ctx, hackathon)
}

// UpdateHackathon 更新活动
func (c *AdminHackathonController) UpdateHackathon(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		utils.BadRequest(ctx, "无效的活动ID")
		return
	}

	var req struct {
		models.Hackathon
		Stages []models.HackathonStage `json:"stages"`
		Awards []models.HackathonAward  `json:"awards"`
	}

	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(ctx, "参数错误: "+err.Error())
		return
	}

	if err := c.hackathonService.UpdateHackathon(id, &req.Hackathon, req.Stages, req.Awards); err != nil {
		utils.BadRequest(ctx, err.Error())
		return
	}

	utils.Success(ctx, nil)
}

// DeleteHackathon 删除活动
func (c *AdminHackathonController) DeleteHackathon(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		utils.BadRequest(ctx, "无效的活动ID")
		return
	}

	if err := c.hackathonService.DeleteHackathon(id); err != nil {
		utils.BadRequest(ctx, err.Error())
		return
	}

	utils.Success(ctx, nil)
}

// PublishHackathon 发布活动
func (c *AdminHackathonController) PublishHackathon(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		utils.BadRequest(ctx, "无效的活动ID")
		return
	}

	if err := c.hackathonService.PublishHackathon(id); err != nil {
		utils.BadRequest(ctx, err.Error())
		return
	}

	utils.Success(ctx, nil)
}

// SwitchStage 切换活动阶段
func (c *AdminHackathonController) SwitchStage(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		utils.BadRequest(ctx, "无效的活动ID")
		return
	}

	stage := ctx.Param("stage")
	if stage == "" {
		utils.BadRequest(ctx, "阶段参数不能为空")
		return
	}

	if err := c.hackathonService.SwitchStage(id, stage); err != nil {
		utils.BadRequest(ctx, err.Error())
		return
	}

	utils.Success(ctx, nil)
}

