package services

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"math/big"
	"strings"

	"hackathon-backend/config"
	"hackathon-backend/models"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

// BlockchainService 区块链服务
type BlockchainService struct {
	client     *ethclient.Client
	contract   *bind.BoundContract
	privateKey *ecdsa.PrivateKey
	publicKey  *ecdsa.PublicKey
	address    common.Address
}

// NewBlockchainService 创建区块链服务实例
func NewBlockchainService() (*BlockchainService, error) {
	// 连接到以太坊网络
	client, err := ethclient.Dial("https://eth-sepolia.g.alchemy.com/v2/Ju1nY_EMo82rnBWg06xI0")
	if err != nil {
		return nil, fmt.Errorf("连接以太坊网络失败: %w", err)
	}

	// 加载合约ABI
	var contractAddress common.Address
	if config.AppConfig != nil && config.AppConfig.Blockchain.ContractAddress != "" {
		contractAddress = common.HexToAddress(config.AppConfig.Blockchain.ContractAddress)
	} else {
		// 使用默认合约地址
		contractAddress = common.HexToAddress("0x9637F7201aDB470104dBACa9d600b09C50ccb752")
	}

	// 读取ABI文件（这里需要实际的ABI内容）
	parsedABI, err := abi.JSON(strings.NewReader(`[
		{
			"inputs": [
				{"internalType": "uint256", "name": "_eventId", "type": "uint256"},
				{"internalType": "string", "name": "_eventName", "type": "string"},
				{"internalType": "string", "name": "_description", "type": "string"},
				{"internalType": "uint256", "name": "_startTime", "type": "uint256"},
				{"internalType": "uint256", "name": "_endTime", "type": "uint256"},
				{"internalType": "string", "name": "_location", "type": "string"}
			],
			"name": "createEvent",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "uint256", "name": "_eventId", "type": "uint256"},
				{"internalType": "string", "name": "_eventName", "type": "string"},
				{"internalType": "string", "name": "_description", "type": "string"},
				{"internalType": "uint256", "name": "_startTime", "type": "uint256"},
				{"internalType": "uint256", "name": "_endTime", "type": "uint256"},
				{"internalType": "string", "name": "_location", "type": "string"},
				{"internalType": "string", "name": "_changeDescription", "type": "string"}
			],
			"name": "updateEvent",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "uint256", "name": "_eventId", "type": "uint256"}
			],
			"name": "deleteEvent",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "uint256", "name": "_eventId", "type": "uint256"}
			],
			"name": "getEvent",
			"outputs": [
				{
					"components": [
						{"internalType": "uint256", "name": "eventId", "type": "uint256"},
						{"internalType": "string", "name": "eventName", "type": "string"},
						{"internalType": "string", "name": "description", "type": "string"},
						{"internalType": "uint256", "name": "startTime", "type": "uint256"},
						{"internalType": "uint256", "name": "endTime", "type": "uint256"},
						{"internalType": "string", "name": "location", "type": "string"},
						{"internalType": "address", "name": "organizer", "type": "address"},
						{"internalType": "uint256", "name": "createdAt", "type": "uint256"},
						{"internalType": "uint256", "name": "updatedAt", "type": "uint256"},
						{"internalType": "bool", "name": "isDeleted", "type": "bool"}
					],
					"internalType": "struct EventInfoContract.EventInfo",
					"name": "",
					"type": "tuple"
				}
			],
			"stateMutability": "view",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "uint256", "name": "_eventId", "type": "uint256"}
			],
			"name": "getEventHistory",
			"outputs": [
				{
					"components": [
						{"internalType": "uint256", "name": "eventId", "type": "uint256"},
						{"internalType": "uint8", "name": "operationType", "type": "uint8"},
						{"internalType": "uint256", "name": "timestamp", "type": "uint256"},
						{"internalType": "address", "name": "operator", "type": "address"},
						{"internalType": "string", "name": "changeDescription", "type": "string"}
					],
					"internalType": "struct EventInfoContract.EventHistory[]",
					"name": "",
					"type": "tuple[]"
				}
			],
			"stateMutability": "view",
			"type": "function"
		}
	]`))
	if err != nil {
		return nil, fmt.Errorf("解析合约ABI失败: %w", err)
	}

	service := &BlockchainService{
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
func (s *BlockchainService) SetPrivateKey(privateKeyHex string) error {
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

// CreateEvent 创建活动上链
func (s *BlockchainService) CreateEvent(eventID uint64, eventName, description string, startTime, endTime uint64, location string) (*types.Transaction, error) {
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
	tx, err := s.contract.Transact(auth, "createEvent", big.NewInt(int64(eventID)), eventName, description, big.NewInt(int64(startTime)), big.NewInt(int64(endTime)), location)
	if err != nil {
		return nil, fmt.Errorf("调用合约函数失败: %w", err)
	}

	return tx, nil
}

// UpdateEvent 更新活动上链
func (s *BlockchainService) UpdateEvent(eventID uint64, eventName, description string, startTime, endTime uint64, location, changeDescription string) (*types.Transaction, error) {
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
	tx, err := s.contract.Transact(auth, "updateEvent", big.NewInt(int64(eventID)), eventName, description, big.NewInt(int64(startTime)), big.NewInt(int64(endTime)), location, changeDescription)
	if err != nil {
		return nil, fmt.Errorf("调用合约函数失败: %w", err)
	}

	return tx, nil
}

// DeleteEvent 删除活动上链
func (s *BlockchainService) DeleteEvent(eventID uint64) (*types.Transaction, error) {
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
	tx, err := s.contract.Transact(auth, "deleteEvent", big.NewInt(int64(eventID)))
	if err != nil {
		return nil, fmt.Errorf("调用合约函数失败: %w", err)
	}

	return tx, nil
}

// GetEvent 获取活动信息
func (s *BlockchainService) GetEvent(eventID uint64) (map[string]interface{}, error) {
	if s.contract == nil {
		return nil, fmt.Errorf("合约未初始化")
	}
	var results []interface{}
	err := s.contract.Call(nil, &results, "getEvent", big.NewInt(int64(eventID)))
	if err != nil {
		return nil, fmt.Errorf("查询合约失败: %w", err)
	}

	if len(results) == 0 {
		return nil, fmt.Errorf("未找到活动信息")
	}

	// 解析返回的结构体
	eventInfo := results[0].(struct {
		EventId     *big.Int `json:"eventId"`
		EventName   string   `json:"eventName"`
		Description string   `json:"description"`
		StartTime   *big.Int `json:"startTime"`
		EndTime     *big.Int `json:"endTime"`
		Location    string   `json:"location"`
		Organizer   common.Address `json:"organizer"`
		CreatedAt   *big.Int `json:"createdAt"`
		UpdatedAt   *big.Int `json:"updatedAt"`
		IsDeleted   bool     `json:"isDeleted"`
	})

	return map[string]interface{}{
		"event_id":    eventInfo.EventId.Uint64(),
		"event_name":  eventInfo.EventName,
		"description": eventInfo.Description,
		"start_time":  eventInfo.StartTime.Uint64(),
		"end_time":    eventInfo.EndTime.Uint64(),
		"location":    eventInfo.Location,
		"organizer":   eventInfo.Organizer.Hex(),
		"created_at":  eventInfo.CreatedAt.Uint64(),
		"updated_at":  eventInfo.UpdatedAt.Uint64(),
		"is_deleted":  eventInfo.IsDeleted,
	}, nil
}

// WaitForTransactionReceipt 等待交易确认
func (s *BlockchainService) WaitForTransactionReceipt(ctx context.Context, txHash string) (*types.Receipt, error) {
	hash := common.HexToHash(txHash)
	receipt, err := s.client.TransactionReceipt(ctx, hash)
	if err != nil {
		return nil, fmt.Errorf("获取交易收据失败: %w", err)
	}
	return receipt, nil
}

// VerifyEventIntegrity 验证活动信息一致性
func (s *BlockchainService) VerifyEventIntegrity(eventID uint64, dbHackathon *models.Hackathon) (map[string]interface{}, error) {
	if s.contract == nil {
		return nil, fmt.Errorf("合约未初始化")
	}

	// 获取链上数据
	chainData, err := s.GetEvent(eventID)
	if err != nil {
		return nil, fmt.Errorf("获取链上数据失败: %w", err)
	}

	verification := map[string]interface{}{
		"is_consistent": true,
		"differences":   []map[string]interface{}{},
		"chain_data":    chainData,
		"db_data":       dbHackathon,
	}

	// 验证各个字段
	differences := []map[string]interface{}{}

	// 验证活动名称
	if chainData["event_name"] != dbHackathon.Name {
		differences = append(differences, map[string]interface{}{
			"field":     "name",
			"chain_value": chainData["event_name"],
			"db_value":     dbHackathon.Name,
			"is_consistent": false,
		})
	}

	// 验证描述
	if chainData["description"] != dbHackathon.Description {
		differences = append(differences, map[string]interface{}{
			"field":     "description",
			"chain_value": chainData["description"],
			"db_value":     dbHackathon.Description,
			"is_consistent": false,
		})
	}

	// 验证时间（链上时间戳vs数据库时间）
	dbStartTime := dbHackathon.StartTime.Unix()
	dbEndTime := dbHackathon.EndTime.Unix()
	chainStartTime := int64(chainData["start_time"].(uint64))
	chainEndTime := int64(chainData["end_time"].(uint64))

	if chainStartTime != dbStartTime {
		differences = append(differences, map[string]interface{}{
			"field":     "start_time",
			"chain_value": chainStartTime,
			"db_value":     dbStartTime,
			"is_consistent": false,
		})
	}

	if chainEndTime != dbEndTime {
		differences = append(differences, map[string]interface{}{
			"field":     "end_time",
			"chain_value": chainEndTime,
			"db_value":     dbEndTime,
			"is_consistent": false,
		})
	}

	// 验证地点
	chainLocation := chainData["location"].(string)
	dbLocation := ""
	if dbHackathon.LocationType == "online" {
		dbLocation = "online"
	} else if dbHackathon.LocationType == "offline" || dbHackathon.LocationType == "hybrid" {
		dbLocation = dbHackathon.LocationType
		if dbHackathon.City != "" {
			dbLocation += " - " + dbHackathon.City
			if dbHackathon.LocationDetail != "" {
				dbLocation += " (" + dbHackathon.LocationDetail + ")"
			}
		}
	}

	if chainLocation != dbLocation {
		differences = append(differences, map[string]interface{}{
			"field":     "location",
			"chain_value": chainLocation,
			"db_value":     dbLocation,
			"is_consistent": false,
		})
	}

	verification["differences"] = differences
	verification["is_consistent"] = len(differences) == 0

	return verification, nil
}

// Close 关闭区块链服务连接
func (s *BlockchainService) Close() {
	if s.client != nil {
		s.client.Close()
	}
}
