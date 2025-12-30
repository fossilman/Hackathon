package controllers

import (
	"net/http"
	"strconv"

	"hackathon-backend/services"

	"github.com/gin-gonic/gin"
)

// NFTController NFT控制器
type NFTController struct {
	nftService      *services.NFTService
	hackathonService *services.HackathonService
}

// NewNFTController 创建NFT控制器实例
func NewNFTController() *NFTController {
	nftService, err := services.NewNFTService()
	if err != nil {
		panic("创建NFT服务失败: " + err.Error())
	}

	return &NFTController{
		nftService:      nftService,
		hackathonService: services.NewHackathonService(),
	}
}

// MintNFTRequest 发放NFT请求
type MintNFTRequest struct {
	EventID          uint64 `json:"eventId" binding:"required"`
	ParticipantID    uint64 `json:"participantId" binding:"required"`
	ParticipantAddr  string `json:"participantAddr" binding:"required"`
}

// BatchMintNFTRequest 批量发放NFT请求
type BatchMintNFTRequest struct {
	EventID     uint64   `json:"eventId" binding:"required"`
	ParticipantIDs    []uint64 `json:"participantIds"`
	ParticipantAddrs  []string `json:"participantAddrs"`
}

// MintNFTResponse 发放NFT响应
type MintNFTResponse struct {
	Success         bool   `json:"success"`
	TokenID         uint64 `json:"tokenId,omitempty"`
	TransactionHash string `json:"transactionHash,omitempty"`
	Message         string `json:"message"`
}

// BatchMintNFTResponse 批量发放NFT响应
type BatchMintNFTResponse struct {
	Success bool                     `json:"success"`
	Results []services.NFTMintResult `json:"results"`
	Message string                   `json:"message"`
}

// GetCheckedInParticipantsResponse 获取已签到参赛者响应
type GetCheckedInParticipantsResponse struct {
	Success      bool                         `json:"success"`
	Participants []services.CheckedInParticipant `json:"participants"`
	Message      string                       `json:"message"`
}

// MintEventNFT 为单个参赛者发放NFT
func (c *NFTController) MintEventNFT(ctx *gin.Context) {
	var req MintNFTRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 验证活动是否存在
	hackathon, err := c.hackathonService.GetHackathonByID(req.EventID)
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "活动不存在"})
		return
	}

	// 验证活动是否在签到阶段
	if hackathon.Status != "checkin" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "活动不在签到阶段"})
		return
	}

	_ = hackathon // 避免未使用变量错误

	_ = hackathon // 避免未使用变量错误

	// 调用NFT服务发放NFT
	tokenID, txHash, err := c.nftService.MintEventNFT(req.EventID, req.ParticipantAddr)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	// 记录NFT发放到数据库
	err = c.nftService.RecordNFTMinting(req.EventID, req.ParticipantID, tokenID, txHash)
	if err != nil {
		// 记录失败不影响发放结果，但记录日志
		ctx.JSON(http.StatusOK, MintNFTResponse{
			Success:         true,
			TokenID:         tokenID,
			TransactionHash: txHash,
			Message:         "NFT发放成功，但数据库记录失败",
		})
		return
	}

	ctx.JSON(http.StatusOK, MintNFTResponse{
		Success:         true,
		TokenID:         tokenID,
		TransactionHash: txHash,
		Message:         "NFT发放成功",
	})
}

// BatchMintEventNFT 批量为参赛者发放NFT
func (c *NFTController) BatchMintEventNFT(ctx *gin.Context) {
	var req BatchMintNFTRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 验证活动是否存在
	hackathon, err := c.hackathonService.GetHackathonByID(req.EventID)
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "活动不存在"})
		return
	}

	// 验证活动是否在签到阶段
	if hackathon.Status != "checkin" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "活动不在签到阶段"})
		return
	}

	_ = hackathon // 避免未使用变量错误

	_ = hackathon // 避免未使用变量错误

	// 优先使用地址数组
	var participantAddresses []string
	if len(req.ParticipantAddrs) > 0 {
		participantAddresses = req.ParticipantAddrs
	} else if len(req.ParticipantIDs) > 0 {
		// 根据ID获取地址（这里需要实现获取逻辑）
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "暂不支持根据ID批量发放，请提供钱包地址"})
		return
	} else {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "请提供参赛者地址列表"})
		return
	}

	// 调用NFT服务批量发放NFT
	tokenIDs, txHash, err := c.nftService.BatchMintEventNFT(req.EventID, participantAddresses)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	// 构建结果
	results := make([]services.NFTMintResult, len(participantAddresses))
	for i, addr := range participantAddresses {
		results[i] = services.NFTMintResult{
			ParticipantAddress: addr,
			TokenID:           tokenIDs[i],
			TransactionHash:    txHash,
			Success:           true,
		}
	}

	ctx.JSON(http.StatusOK, BatchMintNFTResponse{
		Success: true,
		Results: results,
		Message: "批量NFT发放成功",
	})
}

// GetCheckedInParticipants 获取已签到但未获得NFT的参赛者列表
func (c *NFTController) GetCheckedInParticipants(ctx *gin.Context) {
	eventIDStr := ctx.Param("eventId")
	eventID, err := strconv.ParseUint(eventIDStr, 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "无效的活动ID"})
		return
	}

	// 验证活动是否存在
	hackathon, err := c.hackathonService.GetHackathonByID(eventID)
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "活动不存在"})
		return
	}

	_ = hackathon // 避免未使用变量错误

	// 获取已签到但未获得NFT的参赛者
	checkins, err := c.nftService.GetCheckedInParticipants(eventID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	// 转换为响应格式
	participants := make([]services.CheckedInParticipant, len(checkins))
	for i, checkin := range checkins {
		participants[i] = services.CheckedInParticipant{
			ID:             checkin.Participant.ID,
			WalletAddress:  checkin.Participant.WalletAddress,
			Nickname:       checkin.Participant.Nickname,
			CheckInTime:    checkin.CreatedAt,
		}
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success":      true,
		"participants": participants,
		"message":      "获取成功",
	})
}

// MintNFTForAllCheckedIn 为所有已签到但未获得NFT的参赛者发放NFT
func (c *NFTController) MintNFTForAllCheckedIn(ctx *gin.Context) {
	eventIDStr := ctx.Param("eventId")
	eventID, err := strconv.ParseUint(eventIDStr, 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "无效的活动ID"})
		return
	}

	// 验证活动是否存在
	hackathon, err := c.hackathonService.GetHackathonByID(eventID)
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "活动不存在"})
		return
	}

	_ = hackathon // 避免未使用变量错误

	// 验证活动是否在签到阶段
	if hackathon.Status != "checkin" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "活动不在签到阶段"})
		return
	}

	// 为所有已签到但未获得NFT的参赛者发放NFT
	results, err := c.nftService.MintNFTForCheckedInParticipants(eventID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	successCount := 0
	for _, result := range results {
		if result.Success {
			successCount++
		}
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success":        true,
		"results":        results,
		"successCount":   successCount,
		"totalCount":     len(results),
		"message":        "批量NFT发放完成",
	})
}

// GetEventNFTCount 获取活动NFT总数
func (c *NFTController) GetEventNFTCount(ctx *gin.Context) {
	eventIDStr := ctx.Param("eventId")
	eventID, err := strconv.ParseUint(eventIDStr, 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "无效的活动ID"})
		return
	}

	count, err := c.nftService.GetEventNFTCount(eventID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"count":   count,
		"message": "获取成功",
	})
}

// GetEventNFTInfos 获取活动所有NFT信息
func (c *NFTController) GetEventNFTInfos(ctx *gin.Context) {
	eventIDStr := ctx.Param("eventId")
	eventID, err := strconv.ParseUint(eventIDStr, 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "无效的活动ID"})
		return
	}

	nftInfos, err := c.nftService.GetEventNFTInfos(eventID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    nftInfos,
		"message": "获取成功",
	})
}

// RegisterEvent 在NFT合约中注册活动
func (c *NFTController) RegisterEvent(ctx *gin.Context) {
	eventIDStr := ctx.Param("eventId")
	eventID, err := strconv.ParseUint(eventIDStr, 10, 64)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "无效的活动ID"})
		return
	}

	// 验证活动是否存在
	hackathon, err := c.hackathonService.GetHackathonByID(eventID)
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "活动不存在"})
		return
	}

	_ = hackathon // 避免未使用变量错误

	// 在NFT合约中注册活动
	tx, err := c.nftService.RegisterEvent(eventID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"txHash":  tx.Hash().Hex(),
		"message": "活动在NFT合约中注册成功",
	})
}

// AuthorizeOrganizer 授权主办方
func (c *NFTController) AuthorizeOrganizer(ctx *gin.Context) {
	var req struct {
		OrganizerAddress string `json:"organizerAddress" binding:"required"`
		Authorized       bool   `json:"authorized" binding:"required"`
	}

	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 授权主办方
	tx, err := c.nftService.AuthorizeOrganizer(req.OrganizerAddress, req.Authorized)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	action := "授权"
	if !req.Authorized {
		action = "取消授权"
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"txHash":  tx.Hash().Hex(),
		"message": "主办方" + action + "成功",
	})
}