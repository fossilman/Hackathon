package controllers

import (
	"encoding/base64"
	"regexp"
	"strings"

	"github.com/ethereum/go-ethereum/common"
	"github.com/gin-gonic/gin"
	"github.com/mr-tron/base58"
	"hackathon-backend/services"
	"hackathon-backend/utils"
)

type ArenaAuthController struct {
	participantService *services.ParticipantService
}

func NewArenaAuthController() *ArenaAuthController {
	return &ArenaAuthController{
		participantService: &services.ParticipantService{},
	}
}

// Connect 连接钱包，获取nonce
func (c *ArenaAuthController) Connect(ctx *gin.Context) {
	var req struct {
		WalletAddress string `json:"wallet_address" binding:"required"`
	}

	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(ctx, "参数错误: "+err.Error())
		return
	}

	// 验证钱包地址格式（支持 Solana base58 或以太坊 0x）
	if !isValidWalletAddress(req.WalletAddress) {
		utils.BadRequest(ctx, "无效的钱包地址格式")
		return
	}

	nonce, err := c.participantService.ConnectWallet(req.WalletAddress)
	if err != nil {
		utils.BadRequest(ctx, err.Error())
		return
	}

	utils.Success(ctx, gin.H{
		"nonce": nonce,
	})
}

// Verify 验证签名，完成登录
func (c *ArenaAuthController) Verify(ctx *gin.Context) {
	var req struct {
		WalletAddress string `json:"wallet_address" binding:"required"`
		Signature     string `json:"signature" binding:"required"`
	}

	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(ctx, "参数错误: "+err.Error())
		return
	}

	// 验证钱包地址格式（支持 Solana 或以太坊）
	if !isValidWalletAddress(req.WalletAddress) {
		utils.BadRequest(ctx, "无效的钱包地址格式")
		return
	}

	// 验证签名格式（Solana: base64 64 字节；以太坊: 0x+130 十六进制）
	if !isValidSignatureForAddress(req.WalletAddress, req.Signature) {
		utils.BadRequest(ctx, "无效的签名格式")
		return
	}

	participant, token, err := c.participantService.VerifySignature(req.WalletAddress, req.Signature)
	if err != nil {
		utils.BadRequest(ctx, err.Error())
		return
	}

	utils.Success(ctx, gin.H{
		"token": token,
		"participant": gin.H{
			"id":             participant.ID,
			"wallet_address": participant.WalletAddress,
			"nickname":       participant.Nickname,
		},
	})
}

// isValidEthereumAddress 验证以太坊地址格式
func isValidEthereumAddress(address string) bool {
	addr := strings.TrimPrefix(strings.ToLower(address), "0x")
	if len(addr) != 40 {
		return false
	}
	matched, _ := regexp.MatchString("^[0-9a-f]{40}$", addr)
	return matched && common.IsHexAddress(address)
}

// isValidSolanaAddress 验证 Solana 地址格式（base58，解码后 32 字节）
func isValidSolanaAddress(address string) bool {
	if strings.HasPrefix(strings.ToLower(address), "0x") {
		return false
	}
	decoded, err := base58.Decode(address)
	return err == nil && len(decoded) == 32
}

// isValidWalletAddress 支持 Solana 或以太坊地址
func isValidWalletAddress(address string) bool {
	return isValidSolanaAddress(address) || isValidEthereumAddress(address)
}

// isValidSignatureForAddress 根据地址类型验证签名格式
func isValidSignatureForAddress(walletAddress, signature string) bool {
	if isValidSolanaAddress(walletAddress) {
		// Solana: base64 编码的 64 字节 Ed25519 签名
		decoded, err := base64.StdEncoding.DecodeString(signature)
		return err == nil && len(decoded) == 64
	}
	// 以太坊: 0x + 130 十六进制字符
	sig := strings.TrimPrefix(signature, "0x")
	if len(sig) != 130 {
		return false
	}
	matched, _ := regexp.MatchString("^[0-9a-fA-F]{130}$", sig)
	return matched
}


// GetProfile 获取当前参赛者信息
func (c *ArenaAuthController) GetProfile(ctx *gin.Context) {
	participantID, _ := ctx.Get("participant_id")
	participant, err := c.participantService.GetProfile(participantID.(uint64))
	if err != nil {
		utils.NotFound(ctx, "参赛者不存在")
		return
	}
	utils.Success(ctx, participant)
}

// UpdateProfile 更新当前参赛者信息
func (c *ArenaAuthController) UpdateProfile(ctx *gin.Context) {
	participantID, _ := ctx.Get("participant_id")

	var updates map[string]interface{}
	if err := ctx.ShouldBindJSON(&updates); err != nil {
		utils.BadRequest(ctx, "参数错误: "+err.Error())
		return
	}

	if err := c.participantService.UpdateProfile(participantID.(uint64), updates); err != nil {
		utils.BadRequest(ctx, err.Error())
		return
	}

	utils.Success(ctx, nil)
}

