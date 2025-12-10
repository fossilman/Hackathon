package controllers

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"hackathon-backend/services"
	"hackathon-backend/utils"
)

type ArenaHackathonController struct {
	hackathonService *services.HackathonService
}

func NewArenaHackathonController() *ArenaHackathonController {
	return &ArenaHackathonController{
		hackathonService: &services.HackathonService{},
	}
}

// GetHackathonList 获取已发布的活动列表
func (c *ArenaHackathonController) GetHackathonList(ctx *gin.Context) {
	page, _ := strconv.Atoi(ctx.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(ctx.DefaultQuery("page_size", "10"))
	status := ctx.Query("status")
	keyword := ctx.Query("keyword")
	sort := ctx.DefaultQuery("sort", "time_desc")

	hackathons, total, err := c.hackathonService.GetPublishedHackathons(page, pageSize, status, keyword, sort)
	if err != nil {
		utils.InternalServerError(ctx, err.Error())
		return
	}

	utils.SuccessWithPagination(ctx, hackathons, page, pageSize, total)
}

// GetHackathonByID 获取活动详情
func (c *ArenaHackathonController) GetHackathonByID(ctx *gin.Context) {
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

	// 检查活动是否已发布
	if hackathon.Status == "preparation" {
		utils.NotFound(ctx, "活动不存在")
		return
	}

	utils.Success(ctx, hackathon)
}

// GetMyHackathons 获取已报名的活动列表
func (c *ArenaHackathonController) GetMyHackathons(ctx *gin.Context) {
	participantID, _ := ctx.Get("participant_id")
	page, _ := strconv.Atoi(ctx.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(ctx.DefaultQuery("page_size", "10"))
	status := ctx.Query("status")
	keyword := ctx.Query("keyword")
	sort := ctx.DefaultQuery("sort", "time_desc")

	hackathons, total, err := c.hackathonService.GetMyHackathons(participantID.(uint64), page, pageSize, status, keyword, sort)
	if err != nil {
		utils.InternalServerError(ctx, err.Error())
		return
	}

	utils.SuccessWithPagination(ctx, hackathons, page, pageSize, total)
}

