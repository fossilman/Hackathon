package controllers

import (
	"log"
	"strconv"

	"github.com/gin-gonic/gin"
	"hackathon-backend/services"
	"hackathon-backend/utils"
)

type ArenaRegistrationController struct {
	registrationService *services.RegistrationService
}

func NewArenaRegistrationController() *ArenaRegistrationController {
	return &ArenaRegistrationController{
		registrationService: &services.RegistrationService{},
	}
}

// Register 报名
func (c *ArenaRegistrationController) Register(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		utils.BadRequest(ctx, "无效的活动ID")
		return
	}

	participantID, _ := ctx.Get("participant_id")

	if err := c.registrationService.Register(id, participantID.(uint64)); err != nil {
		utils.BadRequest(ctx, err.Error())
		return
	}

	utils.Success(ctx, nil)
}

// GetRegistrationStatus 获取报名状态
func (c *ArenaRegistrationController) GetRegistrationStatus(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		utils.BadRequest(ctx, "无效的活动ID")
		return
	}

	participantID, _ := ctx.Get("participant_id")

	registered, registeredAt, err := c.registrationService.GetRegistrationStatus(id, participantID.(uint64))
	if err != nil {
		utils.InternalServerError(ctx, err.Error())
		return
	}

	result := gin.H{
		"registered": registered,
	}
	if registeredAt != nil {
		result["registered_at"] = registeredAt
	}

	utils.Success(ctx, result)
}

// CancelRegistration 取消报名
func (c *ArenaRegistrationController) CancelRegistration(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		utils.BadRequest(ctx, "无效的活动ID")
		return
	}

	participantID, _ := ctx.Get("participant_id")

	if err := c.registrationService.CancelRegistration(id, participantID.(uint64)); err != nil {
		utils.BadRequest(ctx, err.Error())
		return
	}

	utils.Success(ctx, nil)
}

// Checkin 签到（可选 body: { "checkin_tx_sig": "链上交易签名" }，签到+NFT 上链后传入）
func (c *ArenaRegistrationController) Checkin(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		utils.BadRequest(ctx, "无效的活动ID")
		return
	}

	participantID, _ := ctx.Get("participant_id")

	var body struct {
		CheckinTxSig string `json:"checkin_tx_sig"`
	}
	_ = ctx.ShouldBindJSON(&body)

	if body.CheckinTxSig != "" {
		log.Printf("[上链] 签到 checkin: hackathon_id=%d participant_id=%v checkin_tx_sig=%s", id, participantID, body.CheckinTxSig)
	} else {
		log.Printf("[签到] 仅本地: hackathon_id=%d participant_id=%v (无 checkin_tx_sig)", id, participantID)
	}

	if err := c.registrationService.Checkin(id, participantID.(uint64), body.CheckinTxSig); err != nil {
		utils.BadRequest(ctx, err.Error())
		return
	}

	utils.Success(ctx, nil)
}

// GetCheckinStatus 获取签到状态
func (c *ArenaRegistrationController) GetCheckinStatus(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		utils.BadRequest(ctx, "无效的活动ID")
		return
	}

	participantID, _ := ctx.Get("participant_id")

	checkedIn, checkedInAt, err := c.registrationService.GetCheckinStatus(id, participantID.(uint64))
	if err != nil {
		utils.InternalServerError(ctx, err.Error())
		return
	}

	result := gin.H{
		"checked_in": checkedIn,
	}
	if checkedInAt != nil {
		result["checked_in_at"] = checkedInAt
	}

	utils.Success(ctx, result)
}

