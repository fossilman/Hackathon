package controllers

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"hackathon-backend/services"
	"hackathon-backend/utils"
)

type ArenaVerificationController struct {
	verificationService *services.VerificationService
}

func NewArenaVerificationController() *ArenaVerificationController {
	return &ArenaVerificationController{
		verificationService: &services.VerificationService{},
	}
}

// VerifyEvent 验证活动信息真实性（游客可访问，无需认证）
// @Summary 验证活动信息真实性
// @Description 通过对比数据库中的活动信息与区块链上的数据，验证活动信息的真实性
// @Tags verification
// @Accept json
// @Produce json
// @Param id path uint64 true "活动ID"
// @Success 200 {object} map[string]interface{} "验证报告"
// @Router /api/v1/arena/hackathons/{id}/verify [get]
func (c *ArenaVerificationController) VerifyEvent(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		utils.BadRequest(ctx, "无效的活动ID")
		return
	}

	report, err := c.verificationService.VerifyEventData(id)
	if err != nil {
		utils.InternalServerError(ctx, err.Error())
		return
	}

	utils.Success(ctx, report)
}

// VerifyVotes 验证活动投票记录真实性（游客可访问，无需认证）
// @Summary 验证投票记录真实性
// @Description 通过对比数据库中的投票记录与区块链上的数据，验证投票记录的真实性
// @Tags verification
// @Accept json
// @Produce json
// @Param id path uint64 true "活动ID"
// @Success 200 {object} map[string]interface{} "验证报告"
// @Router /api/v1/arena/hackathons/{id}/verify-votes [get]
func (c *ArenaVerificationController) VerifyVotes(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		utils.BadRequest(ctx, "无效的活动ID")
		return
	}

	report, err := c.verificationService.VerifyVotesData(id)
	if err != nil {
		utils.InternalServerError(ctx, err.Error())
		return
	}

	utils.Success(ctx, report)
}

// VerifyAll 验证活动的所有信息（活动信息+投票记录）
// @Summary 验证活动的所有信息
// @Description 验证活动信息和投票记录的真实性，返回完整的验证报告
// @Tags verification
// @Accept json
// @Produce json
// @Param id path uint64 true "活动ID"
// @Success 200 {object} map[string]interface{} "完整验证报告"
// @Router /api/v1/arena/hackathons/{id}/verify-all [get]
func (c *ArenaVerificationController) VerifyAll(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		utils.BadRequest(ctx, "无效的活动ID")
		return
	}

	report, err := c.verificationService.VerifyAll(id)
	if err != nil {
		utils.InternalServerError(ctx, err.Error())
		return
	}

	utils.Success(ctx, report)
}
