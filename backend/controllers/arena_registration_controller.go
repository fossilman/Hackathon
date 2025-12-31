package controllers

import (
	"fmt"
	"strconv"

	"github.com/gin-gonic/gin"
	"hackathon-backend/services"
	"hackathon-backend/utils"
)

type ArenaRegistrationController struct {
	registrationService *services.RegistrationService
	nftService         *services.NFTService
}

func NewArenaRegistrationController() *ArenaRegistrationController {
	nftService, err := services.NewNFTService()
	if err != nil {
		// 如果NFT服务创建失败，记录错误但不阻止控制器的创建
		// 这样即使NFT功能不可用，签到功能仍然可以使用
		fmt.Printf("NFT服务初始化失败: %v\n", err)
		nftService = nil
	} else {
		fmt.Printf("NFT服务初始化成功\n")
	}
	
	return &ArenaRegistrationController{
		registrationService: &services.RegistrationService{},
		nftService:         nftService,
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

// Checkin 签到
func (c *ArenaRegistrationController) Checkin(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		utils.BadRequest(ctx, "无效的活动ID")
		return
	}

	participantID, _ := ctx.Get("participant_id")

	if err := c.registrationService.Checkin(id, participantID.(uint64)); err != nil {
		utils.BadRequest(ctx, err.Error())
		return
	}

	// 签到成功后，尝试自动发放NFT
	var nftMintResult gin.H
	if c.nftService != nil {
		// 获取参赛者信息
		participantService := &services.ParticipantService{}
		participant, err := participantService.GetParticipantByID(participantID.(uint64))
		if err == nil && participant != nil {
			// 检查是否已经有NFT
			hasNFT, err := c.nftService.HasParticipantNFT(id, participant.WalletAddress)
			if err == nil && !hasNFT {
				// 尝试发放NFT（不阻塞签到流程）
				go func() {
					fmt.Printf("开始为参赛者 %s 发放活动 %d 的NFT\n", participant.WalletAddress, id)
					tokenID, txHash, err := c.nftService.MintEventNFT(id, participant.WalletAddress)
					if err != nil {
						fmt.Printf("NFT发放失败: participant=%s, eventID=%d, error=%v\n", participant.WalletAddress, id, err)
						return
					}
					fmt.Printf("NFT发放成功: participant=%s, eventID=%d, tokenID=%d, txHash=%s\n", participant.WalletAddress, id, tokenID, txHash)
					// 记录NFT发放到数据库
					if err := c.nftService.RecordNFTMinting(id, participantID.(uint64), tokenID, txHash); err != nil {
						fmt.Printf("记录NFT发放到数据库失败: %v\n", err)
					}
				}()
				nftMintResult = gin.H{
					"nft_minting": "initiated",
					"message":     "签到成功，NFT正在发放中",
				}
			} else if err == nil && hasNFT {
				nftMintResult = gin.H{
					"nft_status": "already_minted",
					"message":    "签到成功，您已拥有该活动的NFT",
				}
			}
		}
	}

	// 返回签到成功结果，包含NFT和区块链相关信息
	result := gin.H{
		"check_in": "success",
		"message":  "签到成功，区块链交易正在处理中",
	}
	if nftMintResult != nil {
		for k, v := range nftMintResult {
			result[k] = v
		}
	}

	utils.Success(ctx, result)
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

// GetCheckinIntegrity 获取签到记录完整性验证
func (c *ArenaRegistrationController) GetCheckinIntegrity(ctx *gin.Context) {
	eventID, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		utils.BadRequest(ctx, "无效的活动ID")
		return
	}

	participantID, _ := ctx.Get("participant_id")

	integrity, err := c.registrationService.GetCheckinIntegrity(eventID, participantID.(uint64))
	if err != nil {
		utils.InternalServerError(ctx, err.Error())
		return
	}

	utils.Success(ctx, integrity)
}

// BatchCheckin 批量签到（管理员功能）
func (c *ArenaRegistrationController) BatchCheckin(ctx *gin.Context) {
	eventID, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		utils.BadRequest(ctx, "无效的活动ID")
		return
	}

	var request struct {
		ParticipantIDs []uint64 `json:"participant_ids" binding:"required"`
	}

	if err := ctx.ShouldBindJSON(&request); err != nil {
		utils.BadRequest(ctx, "请求数据格式错误")
		return
	}

	if len(request.ParticipantIDs) == 0 {
		utils.BadRequest(ctx, "参与者列表不能为空")
		return
	}

	if len(request.ParticipantIDs) > 100 {
		utils.BadRequest(ctx, "批量签到一次最多支持100人")
		return
	}

	err = c.registrationService.BatchCheckin(eventID, request.ParticipantIDs)
	if err != nil {
		utils.BadRequest(ctx, err.Error())
		return
	}

	utils.Success(ctx, gin.H{
		"message":          "批量签到成功",
		"participant_count": len(request.ParticipantIDs),
	})
}

// RegisterEventToCheckInContract 将活动注册到 CheckIn 合约（管理员功能）
func (c *ArenaRegistrationController) RegisterEventToCheckInContract(ctx *gin.Context) {
	eventID, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		utils.BadRequest(ctx, "无效的活动ID")
		return
	}

	err = c.registrationService.RegisterEventToCheckInContract(eventID)
	if err != nil {
		utils.BadRequest(ctx, err.Error())
		return
	}

	utils.Success(ctx, gin.H{
		"message": "活动已成功注册到 CheckIn 合约",
		"event_id": eventID,
	})
}