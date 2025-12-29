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
	client, err := ethclient.Dial("https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161")
	if err != nil {
		return nil, fmt.Errorf("连接以太坊网络失败: %w", err)
	}

	// 加载合约ABI
	contractAddress := common.HexToAddress(config.AppConfig.Blockchain.ContractAddress)
	
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

	return &BlockchainService{
		client:   client,
		contract: bind.NewBoundContract(contractAddress, parsedABI, nil, nil, nil),
	}, nil
}

// SetPrivateKey 设置私钥（用于发送交易）
func (s *BlockchainService) SetPrivateKey(privateKeyHex string) error {
	// 移除0x前缀
	if strings.HasPrefix(privateKeyHex, "0x") {
		privateKeyHex = privateKeyHex[2:]
	}

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

	auth, err := bind.NewKeyedTransactorWithChainID(s.privateKey, big.NewInt(int64(config.AppConfig.Blockchain.ChainID)))
	if err != nil {
		return nil, fmt.Errorf("创建交易授权失败: %w", err)
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

	auth, err := bind.NewKeyedTransactorWithChainID(s.privateKey, big.NewInt(int64(config.AppConfig.Blockchain.ChainID)))
	if err != nil {
		return nil, fmt.Errorf("创建交易授权失败: %w", err)
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

	auth, err := bind.NewKeyedTransactorWithChainID(s.privateKey, big.NewInt(int64(config.AppConfig.Blockchain.ChainID)))
	if err != nil {
		return nil, fmt.Errorf("创建交易授权失败: %w", err)
	}

	tx, err := s.contract.Transact(auth, "deleteEvent", big.NewInt(int64(eventID)))
	if err != nil {
		return nil, fmt.Errorf("调用合约函数失败: %w", err)
	}

	return tx, nil
}

// GetEvent 获取活动信息
func (s *BlockchainService) GetEvent(eventID uint64) (map[string]interface{}, error) {
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
		EventId     *big.Int
		EventName   string
		Description string
		StartTime   *big.Int
		EndTime     *big.Int
		Location    string
		Organizer   common.Address
		CreatedAt   *big.Int
		UpdatedAt   *big.Int
		IsDeleted   bool
	})

	return map[string]interface{}{
		"event_id":     eventInfo.EventId.Uint64(),
		"event_name":   eventInfo.EventName,
		"description":  eventInfo.Description,
		"start_time":   eventInfo.StartTime.Uint64(),
		"end_time":     eventInfo.EndTime.Uint64(),
		"location":     eventInfo.Location,
		"organizer":    eventInfo.Organizer.Hex(),
		"created_at":   eventInfo.CreatedAt.Uint64(),
		"updated_at":   eventInfo.UpdatedAt.Uint64(),
		"is_deleted":   eventInfo.IsDeleted,
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

// Close 关闭区块链服务连接
func (s *BlockchainService) Close() {
	if s.client != nil {
		s.client.Close()
	}
}