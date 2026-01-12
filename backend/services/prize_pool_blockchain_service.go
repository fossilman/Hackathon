package services

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"math/big"
	"strings"

	"hackathon-backend/config"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

// PrizePoolBlockchainService PrizePool 合约服务
type PrizePoolBlockchainService struct {
	client     *ethclient.Client
	contract   *bind.BoundContract
	privateKey *ecdsa.PrivateKey
	publicKey  *ecdsa.PublicKey
	address    common.Address
}

// NewPrizePoolBlockchainService 创建 PrizePool 区块链服务实例
func NewPrizePoolBlockchainService() (*PrizePoolBlockchainService, error) {
	// 连接到以太坊网络
	client, err := ethclient.Dial("https://eth-sepolia.g.alchemy.com/v2/Ju1nY_EMo82rnBWg06xI0")
	if err != nil {
		return nil, fmt.Errorf("连接以太坊网络失败: %w", err)
	}

	// 加载 PrizePool 合约地址
	var contractAddress common.Address
	if config.AppConfig != nil && config.AppConfig.Blockchain.PrizePoolContractAddress != "" {
		contractAddress = common.HexToAddress(config.AppConfig.Blockchain.PrizePoolContractAddress)
	} else {
		return nil, fmt.Errorf("PrizePool 合约地址未配置")
	}

	// PrizePool 合约 ABI (主要函数)
	parsedABI, err := abi.JSON(strings.NewReader(`[
		{
			"inputs": [
				{"internalType": "uint256", "name": "eventId", "type": "uint256"},
				{"internalType": "address", "name": "organizer", "type": "address"}
			],
			"name": "registerEvent",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "uint256", "name": "eventId", "type": "uint256"}
			],
			"name": "createEventPrizePool",
			"outputs": [
				{"internalType": "uint256", "name": "", "type": "uint256"}
			],
			"stateMutability": "payable",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "uint256", "name": "eventId", "type": "uint256"},
				{"internalType": "enum PrizePoolContract.PoolType", "name": "sponsorType", "type": "uint8"}
			],
			"name": "createSponsorPool",
			"outputs": [
				{"internalType": "uint256", "name": "", "type": "uint256"}
			],
			"stateMutability": "payable",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "uint256", "name": "poolId", "type": "uint256"}
			],
			"name": "getPrizePool",
			"outputs": [
				{
					"components": [
						{"internalType": "uint256", "name": "poolId", "type": "uint256"},
						{"internalType": "uint256", "name": "eventId", "type": "uint256"},
						{"internalType": "address", "name": "creator", "type": "address"},
						{"internalType": "uint256", "name": "amount", "type": "uint256"},
						{"internalType": "uint256", "name": "timestamp", "type": "uint256"},
						{"internalType": "enum PrizePoolContract.PoolType", "name": "poolType", "type": "uint8"},
						{"internalType": "enum PrizePoolContract.PoolStatus", "name": "status", "type": "uint8"},
						{"internalType": "address", "name": "contractAddress", "type": "address"},
						{"internalType": "bytes32", "name": "transactionHash", "type": "bytes32"}
					],
					"internalType": "struct PrizePoolContract.PrizePoolRecord",
					"name": "",
					"type": "tuple"
				}
			],
			"stateMutability": "view",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "uint256", "name": "eventId", "type": "uint256"}
			],
			"name": "getEventPools",
			"outputs": [
				{"internalType": "uint256[]", "name": "", "type": "uint256[]"}
			],
			"stateMutability": "view",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "uint256", "name": "poolId", "type": "uint256"}
			],
			"name": "refundToSponsor",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "uint256", "name": "poolId", "type": "uint256"},
				{"internalType": "address", "name": "organizerAddress", "type": "address"}
			],
			"name": "transferToOrganizer",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "uint256", "name": "eventId", "type": "uint256"},
				{"internalType": "address[]", "name": "teamAddresses", "type": "address[]"},
				{"internalType": "uint256[]", "name": "amounts", "type": "uint256[]"}
			],
			"name": "distributePrizes",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "uint256", "name": "eventId", "type": "uint256"}
			],
			"name": "registeredEvents",
			"outputs": [
				{"internalType": "bool", "name": "", "type": "bool"}
			],
			"stateMutability": "view",
			"type": "function"
		},
		{
			"inputs": [],
			"name": "getContractBalance",
			"outputs": [
				{"internalType": "uint256", "name": "", "type": "uint256"}
			],
			"stateMutability": "view",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "uint256", "name": "distributionId", "type": "uint256"}
			],
			"name": "getDistribution",
			"outputs": [
				{
					"components": [
						{"internalType": "uint256", "name": "distributionId", "type": "uint256"},
						{"internalType": "uint256", "name": "poolId", "type": "uint256"},
						{"internalType": "uint256", "name": "eventId", "type": "uint256"},
						{"internalType": "address", "name": "recipient", "type": "address"},
						{"internalType": "uint256", "name": "amount", "type": "uint256"},
						{"internalType": "uint256", "name": "timestamp", "type": "uint256"},
						{"internalType": "bytes32", "name": "transactionHash", "type": "bytes32"},
						{"internalType": "enum PrizePoolContract.DistributionType", "name": "distType", "type": "uint8"}
					],
					"internalType": "struct PrizePoolContract.DistributionRecord",
					"name": "",
					"type": "tuple"
				}
			],
			"stateMutability": "view",
			"type": "function"
		}
	]`))
	if err != nil {
		return nil, fmt.Errorf("解析PrizePool合约ABI失败: %w", err)
	}

	service := &PrizePoolBlockchainService{
		client:   client,
		contract: bind.NewBoundContract(contractAddress, parsedABI, client, client, client),
	}

	// 从配置中读取私钥并设置
	if config.AppConfig != nil && config.AppConfig.Blockchain.PrivateKey != "" {
		if err := service.SetPrivateKey(config.AppConfig.Blockchain.PrivateKey); err != nil {
			return nil, fmt.Errorf("设置私钥失败: %w", err)
		}
	}

	return service, nil
}

// SetPrivateKey 设置私钥（用于发送交易）
func (s *PrizePoolBlockchainService) SetPrivateKey(privateKeyHex string) error {
	// 移除0x前缀
	privateKeyHex = strings.TrimPrefix(privateKeyHex, "0x")

	privateKey, err := crypto.HexToECDSA(privateKeyHex)
	if err != nil {
		return fmt.Errorf("解析私钥失败: %w", err)
	}

	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		return fmt.Errorf("转换公钥失败")
	}

	address := crypto.PubkeyToAddress(*publicKeyECDSA)

	s.privateKey = privateKey
	s.publicKey = publicKeyECDSA
	s.address = address

	return nil
}

// RegisterEvent 注册活动
func (s *PrizePoolBlockchainService) RegisterEvent(eventID uint64, organizerAddress string) (*types.Transaction, error) {
	if s.privateKey == nil {
		return nil, fmt.Errorf("私钥未设置，无法发送交易")
	}

	var chainID int64 = 11155111 // 默认 Sepolia 链ID
	if config.AppConfig != nil && config.AppConfig.Blockchain.ChainID > 0 {
		chainID = int64(config.AppConfig.Blockchain.ChainID)
	}
	auth, err := bind.NewKeyedTransactorWithChainID(s.privateKey, big.NewInt(chainID))
	if err != nil {
		return nil, fmt.Errorf("创建交易授权失败: %w", err)
	}

	if s.contract == nil {
		return nil, fmt.Errorf("合约未初始化")
	}

	organizerAddr := common.HexToAddress(organizerAddress)
	tx, err := s.contract.Transact(auth, "registerEvent", big.NewInt(int64(eventID)), organizerAddr)
	if err != nil {
		return nil, fmt.Errorf("调用合约函数失败: %w", err)
	}

	return tx, nil
}

// CreateEventPrizePool 创建活动奖金池
func (s *PrizePoolBlockchainService) CreateEventPrizePool(eventID uint64, amount *big.Int) (*types.Transaction, error) {
	if s.privateKey == nil {
		return nil, fmt.Errorf("私钥未设置，无法发送交易")
	}

	var chainID int64 = 11155111
	if config.AppConfig != nil && config.AppConfig.Blockchain.ChainID > 0 {
		chainID = int64(config.AppConfig.Blockchain.ChainID)
	}
	auth, err := bind.NewKeyedTransactorWithChainID(s.privateKey, big.NewInt(chainID))
	if err != nil {
		return nil, fmt.Errorf("创建交易授权失败: %w", err)
	}
	auth.Value = amount // 设置发送的 ETH 数量

	if s.contract == nil {
		return nil, fmt.Errorf("合约未初始化")
	}

	tx, err := s.contract.Transact(auth, "createEventPrizePool", big.NewInt(int64(eventID)))
	if err != nil {
		return nil, fmt.Errorf("调用合约函数失败: %w", err)
	}

	return tx, nil
}

// CreateSponsorPool 创建赞助商资金池
// sponsorType: 1 = LongTermSponsor, 2 = EventSponsor
func (s *PrizePoolBlockchainService) CreateSponsorPool(eventID uint64, sponsorType uint8, amount *big.Int) (*types.Transaction, error) {
	if s.privateKey == nil {
		return nil, fmt.Errorf("私钥未设置，无法发送交易")
	}

	var chainID int64 = 11155111
	if config.AppConfig != nil && config.AppConfig.Blockchain.ChainID > 0 {
		chainID = int64(config.AppConfig.Blockchain.ChainID)
	}
	auth, err := bind.NewKeyedTransactorWithChainID(s.privateKey, big.NewInt(chainID))
	if err != nil {
		return nil, fmt.Errorf("创建交易授权失败: %w", err)
	}
	auth.Value = amount // 设置发送的 ETH 数量

	if s.contract == nil {
		return nil, fmt.Errorf("合约未初始化")
	}

	tx, err := s.contract.Transact(auth, "createSponsorPool", big.NewInt(int64(eventID)), big.NewInt(int64(sponsorType)))
	if err != nil {
		return nil, fmt.Errorf("调用合约函数失败: %w", err)
	}

	return tx, nil
}

// GetPrizePool 获取奖金池信息
func (s *PrizePoolBlockchainService) GetPrizePool(poolID uint64) (map[string]interface{}, error) {
	if s.contract == nil {
		return nil, fmt.Errorf("合约未初始化")
	}

	var results []interface{}
	err := s.contract.Call(nil, &results, "getPrizePool", big.NewInt(int64(poolID)))
	if err != nil {
		return nil, fmt.Errorf("查询合约失败: %w", err)
	}

	if len(results) == 0 {
		return nil, fmt.Errorf("未找到奖金池信息")
	}

	// 解析返回的结构体
	poolInfo := results[0].(struct {
		PoolId          *big.Int `json:"poolId"`
		EventId         *big.Int `json:"eventId"`
		Creator         common.Address `json:"creator"`
		Amount          *big.Int `json:"amount"`
		Timestamp       *big.Int `json:"timestamp"`
		PoolType        uint8    `json:"poolType"`
		Status          uint8    `json:"status"`
		ContractAddress common.Address `json:"contractAddress"`
		TransactionHash [32]byte `json:"transactionHash"`
	})

	return map[string]interface{}{
		"pool_id":          poolInfo.PoolId.Uint64(),
		"event_id":         poolInfo.EventId.Uint64(),
		"creator":          poolInfo.Creator.Hex(),
		"amount":           poolInfo.Amount.String(),
		"timestamp":        poolInfo.Timestamp.Uint64(),
		"pool_type":        poolInfo.PoolType,
		"status":           poolInfo.Status,
		"contract_address": poolInfo.ContractAddress.Hex(),
		"transaction_hash": fmt.Sprintf("0x%x", poolInfo.TransactionHash),
	}, nil
}

// GetEventPools 获取活动的所有奖金池ID
func (s *PrizePoolBlockchainService) GetEventPools(eventID uint64) ([]uint64, error) {
	if s.contract == nil {
		return nil, fmt.Errorf("合约未初始化")
	}

	var results []interface{}
	err := s.contract.Call(nil, &results, "getEventPools", big.NewInt(int64(eventID)))
	if err != nil {
		return nil, fmt.Errorf("查询合约失败: %w", err)
	}

	if len(results) == 0 {
		return []uint64{}, nil
	}

	poolIDs := results[0].([]*big.Int)
	result := make([]uint64, len(poolIDs))
	for i, id := range poolIDs {
		result[i] = id.Uint64()
	}

	return result, nil
}

// IsEventRegistered 检查活动是否已注册
func (s *PrizePoolBlockchainService) IsEventRegistered(eventID uint64) (bool, error) {
	if s.contract == nil {
		return false, fmt.Errorf("合约未初始化")
	}

	var results []interface{}
	err := s.contract.Call(nil, &results, "registeredEvents", big.NewInt(int64(eventID)))
	if err != nil {
		return false, fmt.Errorf("查询合约失败: %w", err)
	}

	if len(results) == 0 {
		return false, nil
	}

	return results[0].(bool), nil
}

// RefundToSponsor 退款给赞助商
func (s *PrizePoolBlockchainService) RefundToSponsor(poolID uint64) (*types.Transaction, error) {
	if s.privateKey == nil {
		return nil, fmt.Errorf("私钥未设置，无法发送交易")
	}

	var chainID int64 = 11155111
	if config.AppConfig != nil && config.AppConfig.Blockchain.ChainID > 0 {
		chainID = int64(config.AppConfig.Blockchain.ChainID)
	}
	auth, err := bind.NewKeyedTransactorWithChainID(s.privateKey, big.NewInt(chainID))
	if err != nil {
		return nil, fmt.Errorf("创建交易授权失败: %w", err)
	}

	if s.contract == nil {
		return nil, fmt.Errorf("合约未初始化")
	}

	tx, err := s.contract.Transact(auth, "refundToSponsor", big.NewInt(int64(poolID)))
	if err != nil {
		return nil, fmt.Errorf("调用合约函数失败: %w", err)
	}

	return tx, nil
}

// TransferToOrganizer 转给主办方
func (s *PrizePoolBlockchainService) TransferToOrganizer(poolID uint64, organizerAddress string) (*types.Transaction, error) {
	if s.privateKey == nil {
		return nil, fmt.Errorf("私钥未设置，无法发送交易")
	}

	var chainID int64 = 11155111
	if config.AppConfig != nil && config.AppConfig.Blockchain.ChainID > 0 {
		chainID = int64(config.AppConfig.Blockchain.ChainID)
	}
	auth, err := bind.NewKeyedTransactorWithChainID(s.privateKey, big.NewInt(chainID))
	if err != nil {
		return nil, fmt.Errorf("创建交易授权失败: %w", err)
	}

	if s.contract == nil {
		return nil, fmt.Errorf("合约未初始化")
	}

	organizerAddr := common.HexToAddress(organizerAddress)
	tx, err := s.contract.Transact(auth, "transferToOrganizer", big.NewInt(int64(poolID)), organizerAddr)
	if err != nil {
		return nil, fmt.Errorf("调用合约函数失败: %w", err)
	}

	return tx, nil
}

// DistributePrizes 分发奖金
func (s *PrizePoolBlockchainService) DistributePrizes(eventID uint64, teamAddresses []string, amounts []*big.Int) (*types.Transaction, error) {
	if s.privateKey == nil {
		return nil, fmt.Errorf("私钥未设置，无法发送交易")
	}

	var chainID int64 = 11155111
	if config.AppConfig != nil && config.AppConfig.Blockchain.ChainID > 0 {
		chainID = int64(config.AppConfig.Blockchain.ChainID)
	}
	auth, err := bind.NewKeyedTransactorWithChainID(s.privateKey, big.NewInt(chainID))
	if err != nil {
		return nil, fmt.Errorf("创建交易授权失败: %w", err)
	}

	if s.contract == nil {
		return nil, fmt.Errorf("合约未初始化")
	}

	// 转换地址数组
	addresses := make([]common.Address, len(teamAddresses))
	for i, addr := range teamAddresses {
		addresses[i] = common.HexToAddress(addr)
	}

	tx, err := s.contract.Transact(auth, "distributePrizes", big.NewInt(int64(eventID)), addresses, amounts)
	if err != nil {
		return nil, fmt.Errorf("调用合约函数失败: %w", err)
	}

	return tx, nil
}

// GetContractBalance 获取合约余额
func (s *PrizePoolBlockchainService) GetContractBalance() (*big.Int, error) {
	if s.contract == nil {
		return nil, fmt.Errorf("合约未初始化")
	}

	var results []interface{}
	err := s.contract.Call(nil, &results, "getContractBalance")
	if err != nil {
		return nil, fmt.Errorf("查询合约失败: %w", err)
	}

	if len(results) == 0 {
		return nil, fmt.Errorf("未找到余额信息")
	}

	return results[0].(*big.Int), nil
}

// GetDistribution 获取分发记录
func (s *PrizePoolBlockchainService) GetDistribution(distributionID uint64) (map[string]interface{}, error) {
	if s.contract == nil {
		return nil, fmt.Errorf("合约未初始化")
	}

	var results []interface{}
	err := s.contract.Call(nil, &results, "getDistribution", big.NewInt(int64(distributionID)))
	if err != nil {
		return nil, fmt.Errorf("查询合约失败: %w", err)
	}

	if len(results) == 0 {
		return nil, fmt.Errorf("未找到分发记录")
	}

	// 解析返回的结构体
	distInfo := results[0].(struct {
		DistributionId  *big.Int `json:"distributionId"`
		PoolId          *big.Int `json:"poolId"`
		EventId         *big.Int `json:"eventId"`
		Recipient       common.Address `json:"recipient"`
		Amount          *big.Int `json:"amount"`
		Timestamp       *big.Int `json:"timestamp"`
		TransactionHash [32]byte `json:"transactionHash"`
		DistType        uint8    `json:"distType"`
	})

	return map[string]interface{}{
		"distribution_id":  distInfo.DistributionId.Uint64(),
		"pool_id":          distInfo.PoolId.Uint64(),
		"event_id":         distInfo.EventId.Uint64(),
		"recipient":        distInfo.Recipient.Hex(),
		"amount":           distInfo.Amount.String(),
		"timestamp":        distInfo.Timestamp.Uint64(),
		"transaction_hash": fmt.Sprintf("0x%x", distInfo.TransactionHash),
		"dist_type":        distInfo.DistType,
	}, nil
}

// WaitForTransactionReceipt 等待交易确认
func (s *PrizePoolBlockchainService) WaitForTransactionReceipt(ctx context.Context, txHash string) (*types.Receipt, error) {
	hash := common.HexToHash(txHash)
	receipt, err := s.client.TransactionReceipt(ctx, hash)
	if err != nil {
		return nil, fmt.Errorf("获取交易收据失败: %w", err)
	}
	return receipt, nil
}

// Close 关闭区块链服务连接
func (s *PrizePoolBlockchainService) Close() {
	if s.client != nil {
		s.client.Close()
	}
}
