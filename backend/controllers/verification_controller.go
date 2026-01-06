package controllers

import (
	"net/http"
	"strconv"

	"hackathon-backend/services"

	"github.com/gin-gonic/gin"
)

// VerificationController 验证控制器
type VerificationController struct {
	verificationService *services.VerificationService
}

// NewVerificationController 创建验证控制器实例
func NewVerificationController() (*VerificationController, error) {
	verificationService, err := services.NewVerificationService()
	if err != nil {
		return nil, err
	}

	return &VerificationController{
		verificationService: verificationService,
	}, nil
}

// VerificationRequest 验证请求
type VerificationRequest struct {
	EventID     uint64 `json:"event_id" binding:"required"`
	VerifyVotes bool   `json:"verify_votes"` // 是否验证投票记录
}

// ErrorResponse 错误响应
type ErrorResponse struct {
	Error   string `json:"error"`
	Details string `json:"details,omitempty"`
}

// VerifyEventInfo 验证活动信息真实性
// @Summary 验证活动信息真实性
// @Description 对比数据库和区块链上的活动信息，验证数据一致性
// @Tags verification
// @Accept json
// @Produce json
// @Param request body VerificationRequest true "验证请求"
// @Success 200 {object} services.VerificationResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/verification/event [post]
func (ctrl *VerificationController) VerifyEventInfo(c *gin.Context) {
	var req VerificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Invalid request format",
			Details: err.Error(),
		})
		return
	}

	// 执行验证
	result, err := ctrl.verificationService.VerifyEventInfo(req.EventID, req.VerifyVotes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "Verification failed",
			Details: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetEventVerificationStatus 获取活动验证状态（活动后）
// @Summary 获取活动验证状态（活动后）
// @Description 供游客和参赛者在过往活动列表中验证活动信息
// @Tags verification
// @Accept json
// @Produce json
// @Param event_id path uint64 true "活动 ID"
// @Success 200 {object} services.VerificationResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/verification/event/{event_id} [get]
func (ctrl *VerificationController) GetEventVerificationStatus(c *gin.Context) {
	eventIDStr := c.Param("event_id")
	eventID, err := strconv.ParseUint(eventIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error: "Invalid event ID",
		})
		return
	}

	// 活动后验证包含投票记录
	result, err := ctrl.verificationService.VerifyEventInfo(eventID, true)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "Verification failed",
			Details: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, result)
}

// Close 关闭控制器
func (ctrl *VerificationController) Close() {
	if ctrl.verificationService != nil {
		ctrl.verificationService.Close()
	}
}
