package services

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"math/big"
	"strings"
	"time"

	"hackathon-backend/config"
	"hackathon-backend/models"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

// CheckInBlockchainService CheckIn 合约服务
type CheckInBlockchainService struct {
	client                *ethclient.Client
	contract              *bind.BoundContract
	privateKey            *ecdsa.PrivateKey
	publicKey             *ecdsa.PublicKey
	address               common.Address
}

// NewCheckInBlockchainService 创建 CheckIn 区块链服务实例
func NewCheckInBlockchainService() (*CheckInBlockchainService, error) {
	// 连接到以太坊网络
	client, err := ethclient.Dial("https://eth-sepolia.g.alchemy.com/v2/Ju1nY_EMo82rnBWg06xI0")
	if err != nil {
		return nil, fmt.Errorf("连接以太坊网络失败: %w", err)
	}

	// 加载 CheckIn 合约地址
	var contractAddress common.Address
	if config.AppConfig != nil && config.AppConfig.Blockchain.CheckinContractAddress != "" {
		contractAddress = common.HexToAddress(config.AppConfig.Blockchain.CheckinContractAddress)
	} else {
		return nil, fmt.Errorf("CheckIn 合约地址未配置")
	}

	// CheckIn 合约 ABI
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
			"name": "checkIn",
			"outputs": [
				{"internalType": "uint256", "name": "checkInId", "type": "uint256"}
			],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "uint256", "name": "_eventId", "type": "uint256"},
				{"internalType": "address[]", "name": "_participants", "type": "address[]"}
			],
			"name": "batchCheckIn",
			"outputs": [
				{"internalType": "uint256[]", "name": "checkInIds", "type": "uint256[]"}
			],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "uint256", "name": "_eventId", "type": "uint256"},
				{"internalType": "address", "name": "_participant", "type": "address"}
			],
			"name": "getCheckInRecord",
			"outputs": [
				{
					"components": [
						{"internalType": "uint256", "name": "eventId", "type": "uint256"},
						{"internalType": "address", "name": "participant", "type": "address"},
						{"internalType": "uint256", "name": "timestamp", "type": "uint256"},
						{"internalType": "bytes32", "name": "transactionHash", "type": "bytes32"},
						{"internalType": "bool", "name": "isActive", "type": "bool"},
						{"internalType": "uint256", "name": "checkInId", "type": "uint256"},
						{"internalType": "address", "name": "organizer", "type": "address"}
					],
					"internalType": "struct CheckInContract.CheckInRecord",
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
			"name": "hasParticipantCheckedIn",
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
			"name": "getEventCheckInCount",
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
			"name": "getEventCheckInStats",
			"outputs": [
				{
					"components": [
						{"internalType": "uint256", "name": "eventId", "type": "uint256"},
						{"internalType": "uint256", "name": "totalCheckIns", "type": "uint256"},
						{"internalType": "uint256", "name": "uniqueParticipants", "type": "uint256"},
						{"internalType": "uint256", "name": "lastCheckInTime", "type": "uint256"}
					],
					"internalType": "struct CheckInContract.EventCheckInStats",
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
				{"internalType": "address[]", "name": "_participants", "type": "address[]"}
			],
			"name": "batchCheckCheckInStatus",
			"outputs": [
				{"internalType": "bool[]", "name": "", "type": "bool[]"}
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
		}
	]`))
	if err != nil {
		return nil, fmt.Errorf("解析 CheckIn 合约 ABI 失败: %w", err)
	}

	service := &CheckInBlockchainService{
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
func (s *CheckInBlockchainService) SetPrivateKey(privateKeyHex string) error {
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

// configureGasSettings 配置 Gas 设置
func (s *CheckInBlockchainService) configureGasSettings(auth *bind.TransactOpts) error {
	if s.client == nil {
		return fmt.Errorf("客户端未初始化")
	}

	// 获取建议的 Gas 价格
	gasPrice, err := s.client.SuggestGasPrice(context.Background())
	if err != nil {
		// 如果无法获取建议价格，使用默认值
		fmt.Printf("获取 Gas 价格失败，使用默认值: %v\n", err)
		// Sepolia 测试网默认 Gas 价格
		gasPrice = big.NewInt(20000000000) // 20 Gwei
	}

	// 增加 20% 的 Gas 价格以提高成功率
	adjustedGasPrice := big.NewInt(0).Mul(gasPrice, big.NewInt(120))
	adjustedGasPrice.Div(adjustedGasPrice, big.NewInt(100))
	
	auth.GasPrice = adjustedGasPrice
	auth.GasLimit = uint64(300000) // 设置足够大的 Gas 限制

	fmt.Printf("Gas 配置 - 建议价格: %s, 调整后: %s, 限制: %d\n", 
		gasPrice.String(), adjustedGasPrice.String(), auth.GasLimit)

	return nil
}

// RegisterEvent 注册活动到 CheckIn 合约
func (s *CheckInBlockchainService) RegisterEvent(eventID uint64) (*types.Transaction, error) {
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

	// 设置合适的 Gas 价格和限制
	if err := s.configureGasSettings(auth); err != nil {
		return nil, fmt.Errorf("配置 Gas 设置失败: %w", err)
	}

	if s.contract == nil {
		return nil, fmt.Errorf("CheckIn 合约未初始化")
	}

	// 延迟重试机制处理 "replacement transaction underpriced" 错误
	var tx *types.Transaction
	for retry := 0; retry < 3; retry++ {
		tx, err = s.contract.Transact(auth, "registerEvent", big.NewInt(int64(eventID)))
		if err == nil {
			break // 成功
		}
		
		// 如果是 Gas 价格相关错误，增加 Gas 价格重试
		if strings.Contains(err.Error(), "underpriced") || strings.Contains(err.Error(), "gas") {
			if retry < 2 { // 前两次重试
				// 增加 20% 的 Gas 价格
				currentGasPrice := auth.GasPrice
				if currentGasPrice == nil {
					gasPrice, _ := s.client.SuggestGasPrice(context.Background())
					auth.GasPrice = gasPrice
				} else {
					newGasPrice := big.NewInt(0).Mul(currentGasPrice, big.NewInt(120))
					newGasPrice.Div(newGasPrice, big.NewInt(100)) // 增加 20%
					auth.GasPrice = newGasPrice
				}
				fmt.Printf("Gas 价格调整重试 %d: %s\n", retry+1, auth.GasPrice.String())
				time.Sleep(time.Duration(retry+1) * time.Second) // 等待后重试
				continue
			}
		}
		
		return nil, fmt.Errorf("注册活动到 CheckIn 合约失败: %w", err)
	}

	return tx, nil
}

// AuthorizeOrganizer 授权主办方
func (s *CheckInBlockchainService) AuthorizeOrganizer(organizerAddress string, authorized bool) (*types.Transaction, error) {
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

	// 设置合适的 Gas 价格和限制
	if err := s.configureGasSettings(auth); err != nil {
		return nil, fmt.Errorf("配置 Gas 设置失败: %w", err)
	}

	organizer := common.HexToAddress(organizerAddress)

	// 延迟重试机制
	var tx *types.Transaction
	for retry := 0; retry < 3; retry++ {
		tx, err = s.contract.Transact(auth, "authorizeOrganizer", organizer, authorized)
		if err == nil {
			break
		}
		
		if strings.Contains(err.Error(), "underpriced") || strings.Contains(err.Error(), "gas") {
			if retry < 2 {
				currentGasPrice := auth.GasPrice
				if currentGasPrice == nil {
					gasPrice, _ := s.client.SuggestGasPrice(context.Background())
					auth.GasPrice = gasPrice
				} else {
					newGasPrice := big.NewInt(0).Mul(currentGasPrice, big.NewInt(120))
					newGasPrice.Div(newGasPrice, big.NewInt(100))
					auth.GasPrice = newGasPrice
				}
				fmt.Printf("Gas 价格调整重试 %d: %s\n", retry+1, auth.GasPrice.String())
				time.Sleep(time.Duration(retry+1) * time.Second)
				continue
			}
		}
		
		return nil, fmt.Errorf("授权主办方失败: %w", err)
	}

	return tx, nil
}

// CheckIn 参赛者签到上链
func (s *CheckInBlockchainService) CheckIn(eventID uint64, participantAddress string) (*types.Transaction, error) {
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

	// 设置合适的 Gas 价格和限制
	if err := s.configureGasSettings(auth); err != nil {
		return nil, fmt.Errorf("配置 Gas 设置失败: %w", err)
	}

	if s.contract == nil {
		return nil, fmt.Errorf("CheckIn 合约未初始化")
	}

	participant := common.HexToAddress(participantAddress)

	// 延迟重试机制
	var tx *types.Transaction
	for retry := 0; retry < 3; retry++ {
		tx, err = s.contract.Transact(auth, "checkIn", big.NewInt(int64(eventID)), participant)
		if err == nil {
			break
		}
		
		if strings.Contains(err.Error(), "underpriced") || strings.Contains(err.Error(), "gas") {
			if retry < 2 {
				currentGasPrice := auth.GasPrice
				if currentGasPrice == nil {
					gasPrice, _ := s.client.SuggestGasPrice(context.Background())
					auth.GasPrice = gasPrice
				} else {
					newGasPrice := big.NewInt(0).Mul(currentGasPrice, big.NewInt(120))
					newGasPrice.Div(newGasPrice, big.NewInt(100))
					auth.GasPrice = newGasPrice
				}
				fmt.Printf("Gas 价格调整重试 %d: %s\n", retry+1, auth.GasPrice.String())
				time.Sleep(time.Duration(retry+1) * time.Second)
				continue
			}
		}
		
		return nil, fmt.Errorf("调用 CheckIn 合约失败: %w", err)
	}

	return tx, nil
}

// BatchCheckIn 批量签到上链
func (s *CheckInBlockchainService) BatchCheckIn(eventID uint64, participantAddresses []string) (*types.Transaction, error) {
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

	// 设置合适的 Gas 价格和限制 - 批量操作需要更多 Gas
	if err := s.configureGasSettings(auth); err != nil {
		return nil, fmt.Errorf("配置 Gas 设置失败: %w", err)
	}
	// 批量操作增加 Gas 限制
	auth.GasLimit = uint64(500000 + uint64(len(participantAddresses))*50000) // 基础 + 每人额外

	if s.contract == nil {
		return nil, fmt.Errorf("CheckIn 合约未初始化")
	}

	// 转换地址数组
	participants := make([]common.Address, len(participantAddresses))
	for i, addr := range participantAddresses {
		participants[i] = common.HexToAddress(addr)
	}

	// 延迟重试机制
	var tx *types.Transaction
	for retry := 0; retry < 3; retry++ {
		tx, err = s.contract.Transact(auth, "batchCheckIn", big.NewInt(int64(eventID)), participants)
		if err == nil {
			break
		}
		
		if strings.Contains(err.Error(), "underpriced") || strings.Contains(err.Error(), "gas") {
			if retry < 2 {
				currentGasPrice := auth.GasPrice
				if currentGasPrice == nil {
					gasPrice, _ := s.client.SuggestGasPrice(context.Background())
					auth.GasPrice = gasPrice
				} else {
					newGasPrice := big.NewInt(0).Mul(currentGasPrice, big.NewInt(120))
					newGasPrice.Div(newGasPrice, big.NewInt(100))
					auth.GasPrice = newGasPrice
				}
				fmt.Printf("Gas 价格调整重试 %d: %s\n", retry+1, auth.GasPrice.String())
				time.Sleep(time.Duration(retry+1) * time.Second)
				continue
			}
		}
		
		return nil, fmt.Errorf("批量调用 CheckIn 合约失败: %w", err)
	}

	return tx, nil
}

// GetCheckInRecord 获取签到记录
func (s *CheckInBlockchainService) GetCheckInRecord(eventID uint64, participantAddress string) (map[string]interface{}, error) {
	if s.contract == nil {
		return nil, fmt.Errorf("CheckIn 合约未初始化")
	}

	participant := common.HexToAddress(participantAddress)
	var results []interface{}
	err := s.contract.Call(nil, &results, "getCheckInRecord", big.NewInt(int64(eventID)), participant)
	if err != nil {
		return nil, fmt.Errorf("查询 CheckIn 合约失败: %w", err)
	}

	if len(results) == 0 {
		return nil, fmt.Errorf("未找到签到记录")
	}

	// 解析返回的结构体
	record := results[0].(struct {
		EventId         *big.Int       `json:"eventId"`
		Participant     common.Address `json:"participant"`
		Timestamp       *big.Int       `json:"timestamp"`
		TransactionHash common.Hash    `json:"transactionHash"`
		IsActive        bool           `json:"isActive"`
		CheckInId       *big.Int       `json:"checkInId"`
		Organizer       common.Address `json:"organizer"`
	})

	return map[string]interface{}{
		"event_id":         record.EventId.Uint64(),
		"participant":      record.Participant.Hex(),
		"timestamp":        record.Timestamp.Uint64(),
		"transaction_hash": record.TransactionHash.Hex(),
		"is_active":        record.IsActive,
		"checkin_id":       record.CheckInId.Uint64(),
		"organizer":        record.Organizer.Hex(),
	}, nil
}

// HasParticipantCheckedIn 检查参与者是否已签到
func (s *CheckInBlockchainService) HasParticipantCheckedIn(eventID uint64, participantAddress string) (bool, error) {
	if s.contract == nil {
		return false, fmt.Errorf("CheckIn 合约未初始化")
	}

	participant := common.HexToAddress(participantAddress)
	var results []interface{}
	err := s.contract.Call(nil, &results, "hasParticipantCheckedIn", big.NewInt(int64(eventID)), participant)
	if err != nil {
		return false, fmt.Errorf("查询签到状态失败: %w", err)
	}

	if len(results) == 0 {
		return false, nil
	}

	return results[0].(bool), nil
}

// GetEventCheckInCount 获取活动签到总数
func (s *CheckInBlockchainService) GetEventCheckInCount(eventID uint64) (uint64, error) {
	if s.contract == nil {
		return 0, fmt.Errorf("CheckIn 合约未初始化")
	}

	var results []interface{}
	err := s.contract.Call(nil, &results, "getEventCheckInCount", big.NewInt(int64(eventID)))
	if err != nil {
		return 0, fmt.Errorf("查询活动签到数量失败: %w", err)
	}

	if len(results) == 0 {
		return 0, nil
	}

	return results[0].(*big.Int).Uint64(), nil
}

// GetEventCheckInStats 获取活动签到统计
func (s *CheckInBlockchainService) GetEventCheckInStats(eventID uint64) (map[string]interface{}, error) {
	if s.contract == nil {
		return nil, fmt.Errorf("CheckIn 合约未初始化")
	}

	var results []interface{}
	err := s.contract.Call(nil, &results, "getEventCheckInStats", big.NewInt(int64(eventID)))
	if err != nil {
		return nil, fmt.Errorf("查询活动签到统计失败: %w", err)
	}

	if len(results) == 0 {
		return nil, fmt.Errorf("未找到统计信息")
	}

	// 解析返回的结构体
	stats := results[0].(struct {
		EventId           *big.Int `json:"eventId"`
		TotalCheckIns     *big.Int `json:"totalCheckIns"`
		UniqueParticipants *big.Int `json:"uniqueParticipants"`
		LastCheckInTime   *big.Int `json:"lastCheckInTime"`
	})

	return map[string]interface{}{
		"event_id":           stats.EventId.Uint64(),
		"total_checkins":     stats.TotalCheckIns.Uint64(),
		"unique_participants": stats.UniqueParticipants.Uint64(),
		"last_checkin_time":  stats.LastCheckInTime.Uint64(),
	}, nil
}

// IsEventRegistered 检查活动是否已注册
func (s *CheckInBlockchainService) IsEventRegistered(eventID uint64) (bool, error) {
	if s.contract == nil {
		return false, fmt.Errorf("CheckIn 合约未初始化")
	}

	var results []interface{}
	err := s.contract.Call(nil, &results, "isEventRegistered", big.NewInt(int64(eventID)))
	if err != nil {
		return false, fmt.Errorf("查询活动注册状态失败: %w", err)
	}

	if len(results) == 0 {
		return false, nil
	}

	return results[0].(bool), nil
}

// VerifyCheckInIntegrity 验证签到记录完整性
func (s *CheckInBlockchainService) VerifyCheckInIntegrity(eventID uint64, participantAddress string, dbCheckin *models.Checkin) (map[string]interface{}, error) {
	// 获取链上数据
	chainData, err := s.GetCheckInRecord(eventID, participantAddress)
	if err != nil {
		return map[string]interface{}{
			"is_consistent": false,
			"error":         fmt.Sprintf("获取链上数据失败: %v", err),
		}, nil
	}

	verification := map[string]interface{}{
		"is_consistent": true,
		"differences":   []map[string]interface{}{},
		"chain_data":    chainData,
		"db_data":       dbCheckin,
	}

	// 验证活动ID
	if chainData["event_id"].(uint64) != eventID {
		verification["differences"] = append(verification["differences"].([]map[string]interface{}), map[string]interface{}{
			"field":        "event_id",
			"chain_value":  chainData["event_id"],
			"expected":     eventID,
			"is_consistent": false,
		})
	}

	// 验证参与者地址（需要从数据库查询）
	if chainData["participant"].(string) != participantAddress {
		verification["differences"] = append(verification["differences"].([]map[string]interface{}), map[string]interface{}{
			"field":        "participant",
			"chain_value":  chainData["participant"],
			"expected":     participantAddress,
			"is_consistent": false,
		})
	}

	// 验证时间戳（大致匹配，允许一定误差）
	if dbCheckin != nil {
		dbTimestamp := dbCheckin.CreatedAt.Unix()
		chainTimestamp := int64(chainData["timestamp"].(uint64))
		
		// 允许5分钟的时间差
		if abs(chainTimestamp-dbTimestamp) > 300 {
			verification["differences"] = append(verification["differences"].([]map[string]interface{}), map[string]interface{}{
				"field":        "timestamp",
				"chain_value":  chainTimestamp,
				"db_value":     dbTimestamp,
				"is_consistent": false,
			})
		}
	}

	verification["is_consistent"] = len(verification["differences"].([]map[string]interface{})) == 0

	return verification, nil
}

// abs 计算绝对值
func abs(x int64) int64 {
	if x < 0 {
		return -x
	}
	return x
}

// WaitForTransactionReceipt 等待交易确认
func (s *CheckInBlockchainService) WaitForTransactionReceipt(ctx context.Context, txHash string) (*types.Receipt, error) {
	hash := common.HexToHash(txHash)
	
	// 轮询等待交易确认
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()
	
	for {
		select {
		case <-ctx.Done():
			// 超时了，最后再尝试一次
			receipt, err := s.client.TransactionReceipt(context.Background(), hash)
			if err == nil {
				return receipt, nil
			}
			return nil, fmt.Errorf("等待交易收据超时: %v", ctx.Err())
		case <-ticker.C:
			receipt, err := s.client.TransactionReceipt(ctx, hash)
			if err == nil {
				return receipt, nil
			}
			
			// 如果是 "not found" 错误，继续等待
			if strings.Contains(err.Error(), "not found") {
				// 交易还在处理中，继续等待
				continue
			}
			
			// 其他错误直接返回
			return nil, fmt.Errorf("获取交易收据失败: %w", err)
		}
	}
}

// CheckTransactionStatus 检查交易是否存在
func (s *CheckInBlockchainService) CheckTransactionStatus(txHash string) (bool, *types.Receipt, error) {
	hash := common.HexToHash(txHash)
	
	// 检查交易收据
	receipt, err := s.client.TransactionReceipt(context.Background(), hash)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			// 检查交易是否在交易池中
			_, _, txErr := s.client.TransactionByHash(context.Background(), hash)
			if txErr == nil {
				// 交易存在但还未确认
				return false, nil, nil
			}
			// 交易不存在
			return false, nil, err
		}
		return false, nil, err
	}
	
	return true, receipt, nil
}

// Close 关闭 CheckIn 区块链服务连接
func (s *CheckInBlockchainService) Close() {
	if s.client != nil {
		s.client.Close()
	}
}