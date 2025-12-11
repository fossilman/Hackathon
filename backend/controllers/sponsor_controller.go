package controllers

import (
	"encoding/json"
	"strconv"

	"github.com/gin-gonic/gin"
	"hackathon-backend/models"
	"hackathon-backend/services"
	"hackathon-backend/utils"
)

type SponsorController struct {
	sponsorService   *services.SponsorService
	hackathonService *services.HackathonService
}

func NewSponsorController() *SponsorController {
	return &SponsorController{
		sponsorService:   &services.SponsorService{},
		hackathonService: &services.HackathonService{},
	}
}

// CreateApplication 提交赞助申请（无需登录）
func (c *SponsorController) CreateApplication(ctx *gin.Context) {
	var req struct {
		Phone       string   `json:"phone" binding:"required"`
		LogoURL     *string  `json:"logo_url,omitempty"` // 暂时设为可选
		SponsorType string   `json:"sponsor_type" binding:"required,oneof=long_term event_specific"`
		EventIDs    []uint64 `json:"event_ids"` // 活动指定赞助时必填
	}

	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(ctx, "参数错误: "+err.Error())
		return
	}

	// 验证手机号格式（11位数字）
	if len(req.Phone) != 11 {
		utils.BadRequest(ctx, "手机号格式错误，请输入11位数字")
		return
	}

	// 如果是活动指定赞助，必须选择活动
	if req.SponsorType == "event_specific" && len(req.EventIDs) == 0 {
		utils.BadRequest(ctx, "活动指定赞助必须选择至少一个活动")
		return
	}

	// 将活动ID列表转换为JSON字符串
	var eventIDsJSON string
	if len(req.EventIDs) > 0 {
		eventIDsBytes, err := json.Marshal(req.EventIDs)
		if err != nil {
			utils.BadRequest(ctx, "活动ID格式错误")
			return
		}
		eventIDsJSON = string(eventIDsBytes)
	}

	// 处理LogoURL，如果为nil则使用空字符串
	logoURL := ""
	if req.LogoURL != nil {
		logoURL = *req.LogoURL
	}

	application := models.SponsorApplication{
		Phone:       req.Phone,
		LogoURL:     logoURL,
		SponsorType: req.SponsorType,
		EventIDs:    eventIDsJSON,
		Status:      "pending",
	}

	if err := c.sponsorService.CreateApplication(&application); err != nil {
		utils.BadRequest(ctx, err.Error())
		return
	}

	utils.Success(ctx, gin.H{
		"application_id": application.ID,
		"message":        "申请已提交，请使用手机号查询审核结果",
	})
}

// QueryApplication 查询申请结果（无需登录）
func (c *SponsorController) QueryApplication(ctx *gin.Context) {
	phone := ctx.Query("phone")
	if phone == "" {
		utils.BadRequest(ctx, "请输入手机号")
		return
	}

	application, err := c.sponsorService.GetApplicationByPhone(phone)
	if err != nil {
		utils.Success(ctx, gin.H{
			"status":  "not_found",
			"message": "未找到相关申请记录",
		})
		return
	}

	var message string
	switch application.Status {
	case "pending":
		message = "您的申请正在审核中，请耐心等待"
	case "approved":
		message = "恭喜！您的申请已通过，账号已自动创建，请使用手机号登录"
	case "rejected":
		message = "很抱歉，您的申请未通过审核"
	default:
		message = "申请状态未知"
	}

	utils.Success(ctx, gin.H{
		"status":    application.Status,
		"message":   message,
		"created_at": application.CreatedAt,
	})
}

// GetPendingApplications 获取待审核列表（Admin权限）
func (c *SponsorController) GetPendingApplications(ctx *gin.Context) {
	page, _ := strconv.Atoi(ctx.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(ctx.DefaultQuery("page_size", "20"))

	applications, total, err := c.sponsorService.GetPendingApplications(page, pageSize)
	if err != nil {
		utils.InternalServerError(ctx, err.Error())
		return
	}

	// 解析EventIDs JSON字符串
	for i := range applications {
		if applications[i].EventIDs != "" {
			var eventIDs []uint64
			if err := json.Unmarshal([]byte(applications[i].EventIDs), &eventIDs); err == nil {
				// 将解析后的活动ID列表添加到响应中（通过临时字段）
				// 注意：这里我们需要在响应中手动添加，因为EventIDs字段是字符串
			}
		}
	}

	utils.SuccessWithPagination(ctx, applications, page, pageSize, total)
}

// GetReviewedApplications 获取已审核列表（Admin权限）
func (c *SponsorController) GetReviewedApplications(ctx *gin.Context) {
	page, _ := strconv.Atoi(ctx.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(ctx.DefaultQuery("page_size", "20"))
	status := ctx.DefaultQuery("status", "all")

	applications, total, err := c.sponsorService.GetReviewedApplications(page, pageSize, status)
	if err != nil {
		utils.InternalServerError(ctx, err.Error())
		return
	}

	utils.SuccessWithPagination(ctx, applications, page, pageSize, total)
}

// ReviewApplication 审核申请（Admin权限）
func (c *SponsorController) ReviewApplication(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		utils.BadRequest(ctx, "无效的申请ID")
		return
	}

	var req struct {
		Action       string `json:"action" binding:"required,oneof=approve reject"`
		RejectReason string `json:"reject_reason"` // 可选
	}

	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(ctx, "参数错误: "+err.Error())
		return
	}

	userID, _ := ctx.Get("user_id")

	action := "approved"
	if req.Action == "reject" {
		action = "rejected"
	}

	if err := c.sponsorService.ReviewApplication(id, action, userID.(uint64), req.RejectReason); err != nil {
		utils.BadRequest(ctx, err.Error())
		return
	}

	utils.Success(ctx, gin.H{
		"message": "审核成功",
	})
}

// GetLongTermSponsors 获取长期赞助商列表（Arena平台）
func (c *SponsorController) GetLongTermSponsors(ctx *gin.Context) {
	sponsors, err := c.sponsorService.GetLongTermSponsors()
	if err != nil {
		utils.InternalServerError(ctx, err.Error())
		return
	}

	utils.Success(ctx, sponsors)
}

// GetEventSponsors 获取活动的指定赞助商列表（Arena平台）
func (c *SponsorController) GetEventSponsors(ctx *gin.Context) {
	hackathonID, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		utils.BadRequest(ctx, "无效的活动ID")
		return
	}

	sponsors, err := c.sponsorService.GetEventSponsors(hackathonID)
	if err != nil {
		utils.InternalServerError(ctx, err.Error())
		return
	}

	utils.Success(ctx, sponsors)
}

// GetPublishedHackathons 获取已发布的活动列表（供赞助商申请使用，无需登录）
func (c *SponsorController) GetPublishedHackathons(ctx *gin.Context) {
	page, _ := strconv.Atoi(ctx.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(ctx.DefaultQuery("page_size", "100"))

	hackathons, total, err := c.hackathonService.GetPublishedHackathons(page, pageSize, "published", "", "time_desc")
	if err != nil {
		utils.InternalServerError(ctx, err.Error())
		return
	}

	utils.SuccessWithPagination(ctx, hackathons, page, pageSize, total)
}

