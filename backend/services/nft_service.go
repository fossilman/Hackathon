package services

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"math/big"
	"strings"
	"time"

	"hackathon-backend/config"
	"hackathon-backend/database"
	"hackathon-backend/models"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

// NFTService NFT服务
type NFTService struct {
	client     *ethclient.Client
	contract   *bind.BoundContract
	privateKey *ecdsa.PrivateKey
	publicKey  *ecdsa.PublicKey
	address    common.Address
}

// NFTInfo NFT信息结构体
type NFTInfo struct {
	EventID    uint64 `json:"event_id"`
	TokenID    uint64 `json:"token_id"`
	Participant string `json:"participant"`
	Timestamp  uint64 `json:"timestamp"`
	IsActive   bool   `json:"is_active"`
	Organizer  string `json:"organizer"`
}

// NewNFTService 创建NFT服务实例
func NewNFTService() (*NFTService, error) {
	// 连接到以太坊网络
	client, err := ethclient.Dial("https://eth-sepolia.g.alchemy.com/v2/Ju1nY_EMo82rnBWg06xI0")
	if err != nil {
		return nil, fmt.Errorf("连接以太坊网络失败: %w", err)
	}

	// 加载NFT合约地址
	var contractAddress common.Address
	if config.AppConfig != nil && config.AppConfig.Blockchain.NftContractAddress != "" {
		contractAddress = common.HexToAddress(config.AppConfig.Blockchain.NftContractAddress)
	} else {
		// 使用默认NFT合约地址（从部署文件中获取）
		contractAddress = common.HexToAddress("0xc2b8D22b0D8bD90bcc31271067dA6e6d18C6D814")
	}

	// NFT合约ABI
	parsedABI, err := abi.JSON(strings.NewReader(`[
		{
			"inputs": [
				{"internalType": "uint256", "name": "_eventId", "type": "uint256"}
			],
			"name": "registerEvent",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "address", "name": "_organizer", "type": "address"},
				{"internalType": "bool", "name": "_authorized", "type": "bool"}
			],
			"name": "authorizeOrganizer",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "uint256", "name": "_eventId", "type": "uint256"},
				{"internalType": "address", "name": "_participant", "type": "address"}
			],
			"name": "mintEventNFT",
			"outputs": [
				{"internalType": "uint256", "name": "", "type": "uint256"}
			],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "uint256", "name": "_eventId", "type": "uint256"},
				{"internalType": "address[]", "name": "_participants", "type": "address[]"}
			],
			"name": "batchMintEventNFT",
			"outputs": [
				{"internalType": "uint256[]", "name": "", "type": "uint256[]"}
			],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "uint256", "name": "_eventId", "type": "uint256"}
			],
			"name": "getEventNFTCount",
			"outputs": [
				{"internalType": "uint256", "name": "", "type": "uint256"}
			],
			"stateMutability": "view",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "uint256", "name": "_eventId", "type": "uint256"},
				{"internalType": "address", "name": "_participant", "type": "address"}
			],
			"name": "hasParticipantNFT",
			"outputs": [
				{"internalType": "bool", "name": "", "type": "bool"}
			],
			"stateMutability": "view",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "uint256", "name": "_eventId", "type": "uint256"}
			],
			"name": "getEventNFTTokenIds",
			"outputs": [
				{"internalType": "uint256[]", "name": "", "type": "uint256[]"}
			],
			"stateMutability": "view",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "uint256", "name": "_eventId", "type": "uint256"}
			],
			"name": "getEventNFTInfos",
			"outputs": [
				{
					"components": [
						{"internalType": "uint256", "name": "eventId", "type": "uint256"},
						{"internalType": "uint256", "name": "tokenId", "type": "uint256"},
						{"internalType": "address", "name": "participant", "type": "address"},
						{"internalType": "uint256", "name": "timestamp", "type": "uint256"},
						{"internalType": "bool", "name": "isActive", "type": "bool"},
						{"internalType": "address", "name": "organizer", "type": "address"}
					],
					"internalType": "struct NftContract.EventNFT[]",
					"name": "",
					"type": "tuple[]"
				}
			],
			"stateMutability": "view",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "uint256", "name": "_tokenId", "type": "uint256"}
			],
			"name": "getNFTInfo",
			"outputs": [
				{
					"components": [
						{"internalType": "uint256", "name": "eventId", "type": "uint256"},
						{"internalType": "uint256", "name": "tokenId", "type": "uint256"},
						{"internalType": "address", "name": "participant", "type": "address"},
						{"internalType": "uint256", "name": "timestamp", "type": "uint256"},
						{"internalType": "bool", "name": "isActive", "type": "bool"},
						{"internalType": "address", "name": "organizer", "type": "address"}
					],
					"internalType": "struct NftContract.EventNFT",
					"name": "",
					"type": "tuple"
				}
			],
			"stateMutability": "view",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "uint256", "name": "_eventId", "type": "uint256"},
				{"internalType": "address", "name": "_participant", "type": "address"}
			],
			"name": "getParticipantNFTTokenId",
			"outputs": [
				{"internalType": "uint256", "name": "", "type": "uint256"}
			],
			"stateMutability": "view",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "address", "name": "_participant", "type": "address"}
			],
			"name": "getParticipantNFTs",
			"outputs": [
				{
					"components": [
						{"internalType": "uint256", "name": "eventId", "type": "uint256"},
						{"internalType": "uint256", "name": "tokenId", "type": "uint256"},
						{"internalType": "address", "name": "participant", "type": "address"},
						{"internalType": "uint256", "name": "timestamp", "type": "uint256"},
						{"internalType": "bool", "name": "isActive", "type": "bool"},
						{"internalType": "address", "name": "organizer", "type": "address"}
					],
					"internalType": "struct NftContract.EventNFT[]",
					"name": "",
					"type": "tuple[]"
				}
			],
			"stateMutability": "view",
			"type": "function"
		},
		{
			"inputs": [],
			"name": "totalSupply",
			"outputs": [
				{"internalType": "uint256", "name": "", "type": "uint256"}
			],
			"stateMutability": "view",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "uint256", "name": "_eventId", "type": "uint256"}
			],
			"name": "isEventRegistered",
			"outputs": [
				{"internalType": "bool", "name": "", "type": "bool"}
			],
			"stateMutability": "view",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "address", "name": "_organizer", "type": "address"}
			],
			"name": "isAuthorizedOrganizer",
			"outputs": [
				{"internalType": "bool", "name": "", "type": "bool"}
			],
			"stateMutability": "view",
			"type": "function"
		}
	]`))
	if err != nil {
		return nil, fmt.Errorf("解析NFT合约ABI失败: %w", err)
	}

	service := &NFTService{
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
func (s *NFTService) SetPrivateKey(privateKeyHex string) error {
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

// RegisterEvent 在NFT合约中注册活动
func (s *NFTService) RegisterEvent(eventID uint64) (*types.Transaction, error) {
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
		return nil, fmt.Errorf("NFT合约未初始化")
	}
	
	tx, err := s.contract.Transact(auth, "registerEvent", big.NewInt(int64(eventID)))
	if err != nil {
		return nil, fmt.Errorf("调用NFT合约函数失败: %w", err)
	}

	return tx, nil
}

// AuthorizeOrganizer 授权主办方
func (s *NFTService) AuthorizeOrganizer(organizerAddress string, authorized bool) (*types.Transaction, error) {
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
		return nil, fmt.Errorf("NFT合约未初始化")
	}
	
	organizerAddr := common.HexToAddress(organizerAddress)
	tx, err := s.contract.Transact(auth, "authorizeOrganizer", organizerAddr, authorized)
	if err != nil {
		return nil, fmt.Errorf("调用NFT合约函数失败: %w", err)
	}

	return tx, nil
}

// MintEventNFT 为单个参赛者发放NFT
func (s *NFTService) MintEventNFT(eventID uint64, participantAddress string) (uint64, string, error) {
	if s.privateKey == nil {
		return 0, "", fmt.Errorf("私钥未设置，无法发送交易")
	}

	var chainID int64 = 11155111 // 默认 Sepolia 链ID
	if config.AppConfig != nil && config.AppConfig.Blockchain.ChainID > 0 {
		chainID = int64(config.AppConfig.Blockchain.ChainID)
	}
	auth, err := bind.NewKeyedTransactorWithChainID(s.privateKey, big.NewInt(chainID))
	if err != nil {
		return 0, "", fmt.Errorf("创建交易授权失败: %w", err)
	}

	if s.contract == nil {
		return 0, "", fmt.Errorf("NFT合约未初始化")
	}
	
	participantAddr := common.HexToAddress(participantAddress)
	tx, err := s.contract.Transact(auth, "mintEventNFT", big.NewInt(int64(eventID)), participantAddr)
	if err != nil {
		return 0, "", fmt.Errorf("调用NFT合约函数失败: %w", err)
	}

	// 等待交易确认并获取Token ID
	ctx := context.Background()
	receipt, err := bind.WaitMined(ctx, s.client, tx)
	if err != nil {
		return 0, "", fmt.Errorf("等待交易确认失败: %w", err)
	}

	// 从日志中解析Token ID
	var tokenId uint64 = 0
	if len(receipt.Logs) > 0 {
		// 这里应该解析NFTMinted事件的日志
		// 暂时使用简单的递增方式（实际应该从事件日志中获取）
		tokenId = receipt.BlockNumber.Uint64() // 临时方案
	}

	return tokenId, tx.Hash().Hex(), nil
}

// BatchMintEventNFT 批量为参赛者发放NFT
func (s *NFTService) BatchMintEventNFT(eventID uint64, participantAddresses []string) ([]uint64, string, error) {
	if s.privateKey == nil {
		return nil, "", fmt.Errorf("私钥未设置，无法发送交易")
	}

	var chainID int64 = 11155111 // 默认 Sepolia 链ID
	if config.AppConfig != nil && config.AppConfig.Blockchain.ChainID > 0 {
		chainID = int64(config.AppConfig.Blockchain.ChainID)
	}
	auth, err := bind.NewKeyedTransactorWithChainID(s.privateKey, big.NewInt(chainID))
	if err != nil {
		return nil, "", fmt.Errorf("创建交易授权失败: %w", err)
	}

	if s.contract == nil {
		return nil, "", fmt.Errorf("NFT合约未初始化")
	}
	
	// 转换地址数组
	addresses := make([]common.Address, len(participantAddresses))
	for i, addr := range participantAddresses {
		addresses[i] = common.HexToAddress(addr)
	}
	
	tx, err := s.contract.Transact(auth, "batchMintEventNFT", big.NewInt(int64(eventID)), addresses)
	if err != nil {
		return nil, "", fmt.Errorf("调用NFT合约函数失败: %w", err)
	}

	// 等待交易确认
	ctx := context.Background()
	receipt, err := bind.WaitMined(ctx, s.client, tx)
	if err != nil {
		return nil, "", fmt.Errorf("等待交易确认失败: %w", err)
	}

	// 返回模拟的Token IDs（实际应该从事件日志中解析）
	tokenIds := make([]uint64, len(participantAddresses))
	for i := range tokenIds {
		tokenIds[i] = receipt.BlockNumber.Uint64() + uint64(i)
	}

	return tokenIds, tx.Hash().Hex(), nil
}

// HasParticipantNFT 检查参赛者是否已有NFT
func (s *NFTService) HasParticipantNFT(eventID uint64, participantAddress string) (bool, error) {
	if s.contract == nil {
		return false, fmt.Errorf("NFT合约未初始化")
	}
	
	var results []interface{}
	participantAddr := common.HexToAddress(participantAddress)
	err := s.contract.Call(nil, &results, "hasParticipantNFT", big.NewInt(int64(eventID)), participantAddr)
	if err != nil {
		return false, fmt.Errorf("查询NFT状态失败: %w", err)
	}

	if len(results) == 0 {
		return false, fmt.Errorf("未返回结果")
	}

	hasNFT, ok := results[0].(bool)
	if !ok {
		return false, fmt.Errorf("返回结果类型错误")
	}

	return hasNFT, nil
}

// GetEventNFTCount 获取活动NFT总数
func (s *NFTService) GetEventNFTCount(eventID uint64) (uint64, error) {
	if s.contract == nil {
		return 0, fmt.Errorf("NFT合约未初始化")
	}
	
	var results []interface{}
	err := s.contract.Call(nil, &results, "getEventNFTCount", big.NewInt(int64(eventID)))
	if err != nil {
		return 0, fmt.Errorf("查询NFT数量失败: %w", err)
	}

	if len(results) == 0 {
		return 0, fmt.Errorf("未返回结果")
	}

	count, ok := results[0].(*big.Int)
	if !ok {
		return 0, fmt.Errorf("返回结果类型错误")
	}

	return count.Uint64(), nil
}

// GetEventNFTInfos 获取活动所有NFT信息
func (s *NFTService) GetEventNFTInfos(eventID uint64) ([]NFTInfo, error) {
	if s.contract == nil {
		return nil, fmt.Errorf("NFT合约未初始化")
	}
	
	var results []interface{}
	err := s.contract.Call(nil, &results, "getEventNFTInfos", big.NewInt(int64(eventID)))
	if err != nil {
		return nil, fmt.Errorf("查询NFT信息失败: %w", err)
	}

	if len(results) == 0 {
		return nil, fmt.Errorf("未返回结果")
	}

	// 解析返回的结构体数组
	nftStructs := results[0].([]struct {
		EventID    *big.Int       `json:"eventId"`
		TokenID    *big.Int       `json:"tokenId"`
		Participant common.Address `json:"participant"`
		Timestamp  *big.Int       `json:"timestamp"`
		IsActive   bool           `json:"isActive"`
		Organizer  common.Address `json:"organizer"`
	})

	nftInfos := make([]NFTInfo, len(nftStructs))
	for i, nft := range nftStructs {
		nftInfos[i] = NFTInfo{
			EventID:    nft.EventID.Uint64(),
			TokenID:    nft.TokenID.Uint64(),
			Participant: nft.Participant.Hex(),
			Timestamp:  nft.Timestamp.Uint64(),
			IsActive:   nft.IsActive,
			Organizer:  nft.Organizer.Hex(),
		}
	}

	return nftInfos, nil
}

// GetCheckedInParticipants 获取已签到但未获得NFT的参赛者
func (s *NFTService) GetCheckedInParticipants(eventID uint64) ([]models.Checkin, error) {
	var checkins []models.Checkin
	
	// 获取已签到的参赛者
	err := database.DB.
		Preload("Participant").
		Where("hackathon_id = ?", eventID).
		Find(&checkins).Error
	if err != nil {
		return nil, fmt.Errorf("查询签到记录失败: %w", err)
	}

	// 过滤掉已经获得NFT的参赛者
	var filteredCheckins []models.Checkin
	for _, checkin := range checkins {
		hasNFT, err := s.HasParticipantNFT(eventID, checkin.Participant.WalletAddress)
		if err != nil {
			continue // 如果查询失败，跳过这个记录
		}
		if !hasNFT {
			filteredCheckins = append(filteredCheckins, checkin)
		}
	}

	return filteredCheckins, nil
}

// MintNFTForCheckedInParticipants 为所有已签到但未获得NFT的参赛者发放NFT
func (s *NFTService) MintNFTForCheckedInParticipants(eventID uint64) ([]NFTMintResult, error) {
	checkins, err := s.GetCheckedInParticipants(eventID)
	if err != nil {
		return nil, fmt.Errorf("获取待发放NFT的参赛者失败: %w", err)
	}

	var results []NFTMintResult
	participantAddresses := make([]string, 0, len(checkins))

	// 先收集所有需要发放的地址
	for _, checkin := range checkins {
		participantAddresses = append(participantAddresses, checkin.Participant.WalletAddress)
	}

	// 批量发放NFT
	if len(participantAddresses) > 0 {
		tokenIds, txHash, err := s.BatchMintEventNFT(eventID, participantAddresses)
		if err != nil {
			return nil, fmt.Errorf("批量发放NFT失败: %w", err)
		}

		// 构建结果
		for i, participantAddr := range participantAddresses {
			results = append(results, NFTMintResult{
				ParticipantAddress: participantAddr,
				TokenID:           tokenIds[i],
				TransactionHash:    txHash,
				Success:           true,
			})
		}
	}

	return results, nil
}

// WaitForTransactionReceipt 等待交易确认
func (s *NFTService) WaitForTransactionReceipt(ctx context.Context, txHash string) (*types.Receipt, error) {
	hash := common.HexToHash(txHash)
	receipt, err := s.client.TransactionReceipt(ctx, hash)
	if err != nil {
		return nil, fmt.Errorf("获取交易收据失败: %w", err)
	}
	return receipt, nil
}

// NFTMintResult NFT发放结果
type NFTMintResult struct {
	ParticipantAddress string `json:"participant_address"`
	TokenID           uint64 `json:"token_id"`
	TransactionHash    string `json:"transaction_hash"`
	Success           bool   `json:"success"`
	Error             string `json:"error,omitempty"`
}

// CheckedInParticipant 已签到参赛者信息
type CheckedInParticipant struct {
	ID            uint64    `json:"id"`
	WalletAddress string    `json:"wallet_address"`
	Nickname      string    `json:"nickname"`
	CheckInTime   time.Time `json:"check_in_time"`
}

// GetUserNFTRecord 获取用户NFT记录
func (s *NFTService) GetUserNFTRecord(eventID uint64, participantID uint64) (*models.NFTRecord, error) {
	var nftRecord models.NFTRecord
	
	result := database.DB.Where("hackathon_id = ? AND participant_id = ?", eventID, participantID).First(&nftRecord)
	
	if result.Error != nil {
		if result.Error.Error() == "record not found" {
			return nil, nil
		}
		return nil, fmt.Errorf("查询NFT记录失败: %w", result.Error)
	}
	
	return &nftRecord, nil
}

// RecordNFTMinting 记录NFT发放到数据库
func (s *NFTService) RecordNFTMinting(eventID uint64, participantID uint64, tokenID uint64, txHash string) error {
	// 使用GORM模型插入数据
	nftRecord := models.NFTRecord{
		HackathonID:     eventID,
		ParticipantID:   participantID,
		TokenID:         tokenID,
		TransactionHash: txHash,
		MintedAt:        time.Now(),
	}

	result := database.DB.Create(&nftRecord)
	if result.Error != nil {
		return fmt.Errorf("插入NFT记录失败: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("没有插入任何记录")
	}

	fmt.Printf("NFT记录已保存到数据库: hackathonID=%d, participantID=%d, tokenID=%d\n", eventID, participantID, tokenID)
	return nil
}