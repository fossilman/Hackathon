package controllers

import (
	"math/big"
	"strconv"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/params"
	"github.com/gin-gonic/gin"
	"hackathon-backend/database"
	"hackathon-backend/models"
	"hackathon-backend/services"
	"hackathon-backend/utils"
)

type GasEstimateController struct{}

func NewGasEstimateController() *GasEstimateController {
	return &GasEstimateController{}
}

// GasEstimateResponse Gas 费预估响应
type GasEstimateResponse struct {
	GasLimit        uint64  `json:"gas_limit"`         // Gas 限制
	GasPrice        string  `json:"gas_price"`         // Gas 价格 (wei)
	GasPriceGwei    string  `json:"gas_price_gwei"`    // Gas 价格 (gwei)
	TotalCost       string  `json:"total_cost"`        // 总成本 (wei)
	TotalCostEth    string  `json:"total_cost_eth"`    // 总成本 (ETH)
	UserBalance     string  `json:"user_balance"`      // 用户余额 (wei)
	UserBalanceEth  string  `json:"user_balance_eth"`  // 用户余额 (ETH)
	IsSufficient    bool    `json:"is_sufficient"`     // 余额是否充足
	ShortfallEth    string  `json:"shortfall_eth"`     // 缺少的金额 (ETH)
}

// EstimateCheckin 预估签到 Gas 费
func (c *GasEstimateController) EstimateCheckin(ctx *gin.Context) {
	hackathonID, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		utils.BadRequest(ctx, "无效的活动ID")
		return
	}

	// 获取用户钱包地址
	participantID, exists := ctx.Get("participant_id")
	if !exists {
		utils.Unauthorized(ctx, "未登录")
		return
	}

	var participant models.Participant
	if err := database.DB.Where("id = ?", participantID).First(&participant).Error; err != nil {
		utils.NotFound(ctx, "用户不存在")
		return
	}

	// 获取活动的链上ID
	var hackathon models.Hackathon
	if err := database.DB.Where("id = ?", hackathonID).First(&hackathon).Error; err != nil {
		utils.NotFound(ctx, "活动不存在")
		return
	}

	if hackathon.ChainEventID == 0 {
		utils.BadRequest(ctx, "活动未上链")
		return
	}

	// 创建区块链服务
	blockchainService, err := services.NewBlockchainService()
	if err != nil {
		utils.InternalServerError(ctx, "区块链服务初始化失败")
		return
	}
	defer blockchainService.Close()

	// 预估 Gas 费
	gasLimit, gasPrice, totalCost, err := blockchainService.EstimateCheckinGas(hackathon.ChainEventID)
	if err != nil {
		utils.InternalServerError(ctx, "Gas 费预估失败: "+err.Error())
		return
	}

	// 获取用户余额
	userAddress := common.HexToAddress(participant.WalletAddress)
	balance, err := blockchainService.GetBalance(userAddress)
	if err != nil {
		utils.InternalServerError(ctx, "获取余额失败: "+err.Error())
		return
	}

	// 构造响应
	response := buildGasEstimateResponse(gasLimit, gasPrice, totalCost, balance)

	utils.Success(ctx, response)
}

// EstimateVote 预估投票 Gas 费
func (c *GasEstimateController) EstimateVote(ctx *gin.Context) {
	submissionID, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		utils.BadRequest(ctx, "无效的作品ID")
		return
	}

	// 获取用户钱包地址
	participantID, exists := ctx.Get("participant_id")
	if !exists {
		utils.Unauthorized(ctx, "未登录")
		return
	}

	var participant models.Participant
	if err := database.DB.Where("id = ?", participantID).First(&participant).Error; err != nil {
		utils.NotFound(ctx, "用户不存在")
		return
	}

	// 获取作品信息
	var submission models.Submission
	if err := database.DB.Where("id = ?", submissionID).First(&submission).Error; err != nil {
		utils.NotFound(ctx, "作品不存在")
		return
	}

	// 获取活动信息
	var hackathon models.Hackathon
	if err := database.DB.Where("id = ?", submission.HackathonID).First(&hackathon).Error; err != nil {
		utils.NotFound(ctx, "活动不存在")
		return
	}

	if hackathon.ChainEventID == 0 {
		utils.BadRequest(ctx, "活动未上链")
		return
	}

	// 创建区块链服务
	blockchainService, err := services.NewBlockchainService()
	if err != nil {
		utils.InternalServerError(ctx, "区块链服务初始化失败")
		return
	}
	defer blockchainService.Close()

	// 预估 Gas 费（投票默认分数为10）
	gasLimit, gasPrice, totalCost, err := blockchainService.EstimateVoteGas(hackathon.ChainEventID, submissionID, 10)
	if err != nil {
		utils.InternalServerError(ctx, "Gas 费预估失败: "+err.Error())
		return
	}

	// 获取用户余额
	userAddress := common.HexToAddress(participant.WalletAddress)
	balance, err := blockchainService.GetBalance(userAddress)
	if err != nil {
		utils.InternalServerError(ctx, "获取余额失败: "+err.Error())
		return
	}

	// 构造响应
	response := buildGasEstimateResponse(gasLimit, gasPrice, totalCost, balance)

	utils.Success(ctx, response)
}

// EstimateRevokeVote 预估撤销投票 Gas 费
func (c *GasEstimateController) EstimateRevokeVote(ctx *gin.Context) {
	submissionID, err := strconv.ParseUint(ctx.Param("id"), 10, 64)
	if err != nil {
		utils.BadRequest(ctx, "无效的作品ID")
		return
	}

	// 获取用户钱包地址
	participantID, exists := ctx.Get("participant_id")
	if !exists {
		utils.Unauthorized(ctx, "未登录")
		return
	}

	var participant models.Participant
	if err := database.DB.Where("id = ?", participantID).First(&participant).Error; err != nil {
		utils.NotFound(ctx, "用户不存在")
		return
	}

	// 获取投票记录
	var vote models.Vote
	if err := database.DB.Where("participant_id = ? AND submission_id = ?", participantID, submissionID).First(&vote).Error; err != nil {
		utils.NotFound(ctx, "投票记录不存在")
		return
	}

	// 获取活动信息
	var hackathon models.Hackathon
	if err := database.DB.Where("id = ?", vote.HackathonID).First(&hackathon).Error; err != nil {
		utils.NotFound(ctx, "活动不存在")
		return
	}

	if hackathon.ChainEventID == 0 {
		utils.BadRequest(ctx, "活动未上链")
		return
	}

	// 获取投票索引（需要从链上查询）
	// 这里简化处理，使用 0 作为索引
	voteIndex := uint64(0)

	// 创建区块链服务
	blockchainService, err := services.NewBlockchainService()
	if err != nil {
		utils.InternalServerError(ctx, "区块链服务初始化失败")
		return
	}
	defer blockchainService.Close()

	// 预估 Gas 费
	gasLimit, gasPrice, totalCost, err := blockchainService.EstimateRevokeVoteGas(hackathon.ChainEventID, voteIndex)
	if err != nil {
		utils.InternalServerError(ctx, "Gas 费预估失败: "+err.Error())
		return
	}

	// 获取用户余额
	userAddress := common.HexToAddress(participant.WalletAddress)
	balance, err := blockchainService.GetBalance(userAddress)
	if err != nil {
		utils.InternalServerError(ctx, "获取余额失败: "+err.Error())
		return
	}

	// 构造响应
	response := buildGasEstimateResponse(gasLimit, gasPrice, totalCost, balance)

	utils.Success(ctx, response)
}

// buildGasEstimateResponse 构造 Gas 费预估响应
func buildGasEstimateResponse(gasLimit uint64, gasPrice, totalCost, balance *big.Int) GasEstimateResponse {
	// 转换 Gas 价格为 Gwei
	gasPriceGwei := new(big.Float).Quo(
		new(big.Float).SetInt(gasPrice),
		big.NewFloat(params.GWei),
	)

	// 转换总成本为 ETH
	totalCostEth := new(big.Float).Quo(
		new(big.Float).SetInt(totalCost),
		big.NewFloat(params.Ether),
	)

	// 转换余额为 ETH
	balanceEth := new(big.Float).Quo(
		new(big.Float).SetInt(balance),
		big.NewFloat(params.Ether),
	)

	// 检查余额是否充足
	isSufficient := balance.Cmp(totalCost) >= 0

	// 计算缺少的金额
	shortfall := new(big.Int).Sub(totalCost, balance)
	shortfallEth := "0"
	if !isSufficient {
		shortfallEthFloat := new(big.Float).Quo(
			new(big.Float).SetInt(shortfall),
			big.NewFloat(params.Ether),
		)
		shortfallEth = shortfallEthFloat.Text('f', 6)
	}

	return GasEstimateResponse{
		GasLimit:       gasLimit,
		GasPrice:       gasPrice.String(),
		GasPriceGwei:   gasPriceGwei.Text('f', 2),
		TotalCost:      totalCost.String(),
		TotalCostEth:   totalCostEth.Text('f', 6),
		UserBalance:    balance.String(),
		UserBalanceEth: balanceEth.Text('f', 6),
		IsSufficient:   isSufficient,
		ShortfallEth:   shortfallEth,
	}
}
