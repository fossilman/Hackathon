package services

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"math/big"
	"strings"
	"time"

	"hackathon-backend/config"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

// VoteBlockchainService Vote 合约服务
type VoteBlockchainService struct {
	client     *ethclient.Client
	contract   *bind.BoundContract
	privateKey *ecdsa.PrivateKey
	publicKey  *ecdsa.PublicKey
	address    common.Address
}

// NewVoteBlockchainService 创建 Vote 区块链服务实例
func NewVoteBlockchainService() (*VoteBlockchainService, error) {
	// 连接到以太坊网络
	client, err := ethclient.Dial("https://eth-sepolia.g.alchemy.com/v2/Ju1nY_EMo82rnBWg06xI0")
	if err != nil {
		return nil, fmt.Errorf("连接以太坊网络失败: %w", err)
	}

	// 加载 Vote 合约地址
	var contractAddress common.Address
	if config.AppConfig != nil && config.AppConfig.Blockchain.VoteContractAddress != "" {
		contractAddress = common.HexToAddress(config.AppConfig.Blockchain.VoteContractAddress)
	} else {
		return nil, fmt.Errorf("Vote 合约地址未配置")
	}

	// Vote 合约 ABI
	parsedABI, err := abi.JSON(strings.NewReader(`[
		{
			"inputs": [
				{"internalType": "uint256", "name": "_eventId", "type": "uint256"},
				{"internalType": "address", "name": "_organizer", "type": "address"}
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
				{"internalType": "uint256", "name": "_projectId", "type": "uint256"},
				{"internalType": "uint8", "name": "_score", "type": "uint8"}
			],
			"name": "castVote",
			"outputs": [
				{"internalType": "uint256", "name": "voteId", "type": "uint256"}
			],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "uint256", "name": "_voteId", "type": "uint256"}
			],
			"name": "revokeVote",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "uint256", "name": "_eventId", "type": "uint256"},
				{"internalType": "uint256[]", "name": "_projectIds", "type": "uint256[]"},
				{"internalType": "uint8[]", "name": "_scores", "type": "uint8[]"}
			],
			"name": "batchCastVote",
			"outputs": [
				{"internalType": "uint256[]", "name": "voteIds", "type": "uint256[]"}
			],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "uint256", "name": "_voteId", "type": "uint256"}
			],
			"name": "getVoteRecord",
			"outputs": [
				{
					"components": [
						{"internalType": "uint256", "name": "voteId", "type": "uint256"},
						{"internalType": "uint256", "name": "eventId", "type": "uint256"},
						{"internalType": "uint256", "name": "projectId", "type": "uint256"},
						{"internalType": "address", "name": "voter", "type": "address"},
						{"internalType": "uint8", "name": "score", "type": "uint8"},
						{"internalType": "uint256", "name": "timestamp", "type": "uint256"},
						{"internalType": "bool", "name": "isActive", "type": "bool"},
						{"internalType": "bool", "name": "isRevoked", "type": "bool"},
						{"internalType": "uint256", "name": "revokeTime", "type": "uint256"},
						{"internalType": "string", "name": "txHash", "type": "string"}
					],
					"internalType": "struct VoteContract.VoteRecord",
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
			"name": "getEventStats",
			"outputs": [
				{"internalType": "uint256", "name": "totalVotes", "type": "uint256"},
				{"internalType": "uint256", "name": "activeVotes", "type": "uint256"},
				{"internalType": "uint256", "name": "revokedVotes", "type": "uint256"}
			],
			"stateMutability": "view",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "uint256", "name": "_eventId", "type": "uint256"},
				{"internalType": "uint256", "name": "_projectId", "type": "uint256"}
			],
			"name": "getProjectScore",
			"outputs": [
				{"internalType": "uint256", "name": "", "type": "uint256"}
			],
			"stateMutability": "view",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "address", "name": "_voter", "type": "address"},
				{"internalType": "uint256", "name": "_eventId", "type": "uint256"}
			],
			"name": "hasUserVotedInEvent",
			"outputs": [
				{"internalType": "bool", "name": "", "type": "bool"}
			],
			"stateMutability": "view",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "address", "name": "_voter", "type": "address"},
				{"internalType": "uint256", "name": "_eventId", "type": "uint256"},
				{"internalType": "uint256", "name": "_projectId", "type": "uint256"}
			],
			"name": "hasUserVotedForProject",
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
			"name": "isEventRegistered",
			"outputs": [
				{"internalType": "bool", "name": "", "type": "bool"}
			],
			"stateMutability": "view",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "address", "name": "_voter", "type": "address"},
				{"internalType": "uint256", "name": "_eventId", "type": "uint256"}
			],
			"name": "getUserVotesInEvent",
			"outputs": [
				{"internalType": "uint256[]", "name": "", "type": "uint256[]"}
			],
			"stateMutability": "view",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "uint256", "name": "_eventId", "type": "uint256"},
				{"internalType": "uint256", "name": "_projectId", "type": "uint256"}
			],
			"name": "getProjectVotes",
			"outputs": [
				{"internalType": "uint256[]", "name": "", "type": "uint256[]"}
			],
			"stateMutability": "view",
			"type": "function"
		}
	]`))
	if err != nil {
		return nil, fmt.Errorf("解析 Vote 合约 ABI 失败: %w", err)
	}

	service := &VoteBlockchainService{
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
func (s *VoteBlockchainService) SetPrivateKey(privateKeyHex string) error {
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
func (s *VoteBlockchainService) configureGasSettings(auth *bind.TransactOpts) error {
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
	auth.GasLimit = uint64(500000) // 增加 Gas 限制以避免 out of gas 错误

	fmt.Printf("Gas 配置 - 建议价格: %s, 调整后: %s, 限制: %d\n",
		gasPrice.String(), adjustedGasPrice.String(), auth.GasLimit)

	return nil
}

// CastVote 投票上链
// 注意：合约要求用户使用自己的钱包签名，但这里我们使用服务端私钥代为发送
// 实际应用中，应该让用户在前端使用 MetaMask 等钱包直接调用合约
func (s *VoteBlockchainService) CastVote(eventID, projectID uint64, voterAddress string, score uint8) (uint64, string, error) {
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

	// 设置合适的 Gas 价格和限制
	if err := s.configureGasSettings(auth); err != nil {
		return 0, "", fmt.Errorf("配置 Gas 设置失败: %w", err)
	}

	if s.contract == nil {
		return 0, "", fmt.Errorf("Vote 合约未初始化")
	}

	// 延迟重试机制处理 "replacement transaction underpriced" 错误
	var tx *types.Transaction
	for retry := 0; retry < 3; retry++ {
		tx, err = s.contract.Transact(auth, "castVote",
			big.NewInt(int64(eventID)),
			big.NewInt(int64(projectID)),
			score)
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

		return 0, "", fmt.Errorf("调用 Vote 合约失败: %w", err)
	}

	// 只发送交易，不等待确认（类似 CheckIn 服务）
	// 返回交易哈希，让调用方保存到数据库，后续可以通过交易哈希查询状态
	txHash := tx.Hash().Hex()
	fmt.Printf("链上投票交易已发送，交易哈希: %s\n", txHash)

	// 注意：不等待交易确认，返回交易哈希即可
	// 调用方可以将交易哈希保存到数据库，后续通过交易哈希查询交易状态
	return 0, txHash, nil
}

// RevokeVote 撤销投票上链
func (s *VoteBlockchainService) RevokeVote(voteID uint64) (string, error) {
	if s.privateKey == nil {
		return "", fmt.Errorf("私钥未设置，无法发送交易")
	}

	var chainID int64 = 11155111 // 默认 Sepolia 链ID
	if config.AppConfig != nil && config.AppConfig.Blockchain.ChainID > 0 {
		chainID = int64(config.AppConfig.Blockchain.ChainID)
	}

	auth, err := bind.NewKeyedTransactorWithChainID(s.privateKey, big.NewInt(chainID))
	if err != nil {
		return "", fmt.Errorf("创建交易授权失败: %w", err)
	}

	// 设置合适的 Gas 价格和限制
	if err := s.configureGasSettings(auth); err != nil {
		return "", fmt.Errorf("配置 Gas 设置失败: %w", err)
	}

	if s.contract == nil {
		return "", fmt.Errorf("Vote 合约未初始化")
	}

	// 延迟重试机制
	var tx *types.Transaction
	for retry := 0; retry < 3; retry++ {
		tx, err = s.contract.Transact(auth, "revokeVote", big.NewInt(int64(voteID)))
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

		return "", fmt.Errorf("撤销投票失败: %w", err)
	}

	// 只发送交易，不等待确认（类似 CheckIn 服务）
	// 返回交易哈希，让调用方保存到数据库，后续可以通过交易哈希查询状态
	txHash := tx.Hash().Hex()
	fmt.Printf("链上撤销投票交易已发送，交易哈希: %s\n", txHash)

	// 注意：不等待交易确认，返回交易哈希即可
	// 调用方可以将交易哈希保存到数据库，后续通过交易哈希查询交易状态
	return txHash, nil
}

// GetVoteRecord 获取投票记录
func (s *VoteBlockchainService) GetVoteRecord(voteID uint64) (map[string]interface{}, error) {
	if s.contract == nil {
		return nil, fmt.Errorf("Vote 合约未初始化")
	}

	var results []interface{}
	err := s.contract.Call(nil, &results, "getVoteRecord", big.NewInt(int64(voteID)))
	if err != nil {
		return nil, fmt.Errorf("查询投票记录失败: %w", err)
	}

	if len(results) == 0 {
		return nil, fmt.Errorf("未找到投票记录")
	}

	// 解析返回的结构体
	record := results[0].(struct {
		VoteId     *big.Int       `json:"voteId"`
		EventId    *big.Int       `json:"eventId"`
		ProjectId  *big.Int       `json:"projectId"`
		Voter      common.Address `json:"voter"`
		Score      uint8          `json:"score"`
		Timestamp  *big.Int       `json:"timestamp"`
		IsActive   bool           `json:"isActive"`
		IsRevoked  bool           `json:"isRevoked"`
		RevokeTime *big.Int       `json:"revokeTime"`
		TxHash     string         `json:"txHash"`
	})

	return map[string]interface{}{
		"vote_id":     record.VoteId.Uint64(),
		"event_id":    record.EventId.Uint64(),
		"project_id":  record.ProjectId.Uint64(),
		"voter":       record.Voter.Hex(),
		"score":       record.Score,
		"timestamp":   record.Timestamp.Uint64(),
		"is_active":   record.IsActive,
		"is_revoked":  record.IsRevoked,
		"revoke_time": record.RevokeTime.Uint64(),
		"tx_hash":     record.TxHash,
	}, nil
}

// HasUserVotedForProject 检查用户是否已对作品投票
func (s *VoteBlockchainService) HasUserVotedForProject(voterAddress string, eventID, projectID uint64) (bool, error) {
	if s.contract == nil {
		return false, fmt.Errorf("Vote 合约未初始化")
	}

	voter := common.HexToAddress(voterAddress)
	var results []interface{}
	err := s.contract.Call(nil, &results, "hasUserVotedForProject", voter, big.NewInt(int64(eventID)), big.NewInt(int64(projectID)))
	if err != nil {
		return false, fmt.Errorf("查询投票状态失败: %w", err)
	}

	if len(results) == 0 {
		return false, nil
	}

	return results[0].(bool), nil
}

// IsEventRegistered 检查活动是否已注册
func (s *VoteBlockchainService) IsEventRegistered(eventID uint64) (bool, error) {
	if s.contract == nil {
		return false, fmt.Errorf("Vote 合约未初始化")
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

// GetUserVotesInEvent 获取用户在活动中的所有投票ID
func (s *VoteBlockchainService) GetUserVotesInEvent(voterAddress string, eventID uint64) ([]uint64, error) {
	if s.contract == nil {
		return nil, fmt.Errorf("Vote 合约未初始化")
	}

	voter := common.HexToAddress(voterAddress)
	var results []interface{}
	err := s.contract.Call(nil, &results, "getUserVotesInEvent", voter, big.NewInt(int64(eventID)))
	if err != nil {
		return nil, fmt.Errorf("查询用户投票ID失败: %w", err)
	}

	if len(results) == 0 {
		return []uint64{}, nil
	}

	// 解析返回的数组
	voteIds := results[0].([]*big.Int)
	result := make([]uint64, len(voteIds))
	for i, id := range voteIds {
		result[i] = id.Uint64()
	}

	return result, nil
}

// GetProjectVotes 获取作品的所有投票ID
func (s *VoteBlockchainService) GetProjectVotes(eventID, projectID uint64) ([]uint64, error) {
	if s.contract == nil {
		return nil, fmt.Errorf("Vote 合约未初始化")
	}

	var results []interface{}
	err := s.contract.Call(nil, &results, "getProjectVotes", big.NewInt(int64(eventID)), big.NewInt(int64(projectID)))
	if err != nil {
		return nil, fmt.Errorf("查询作品投票ID失败: %w", err)
	}

	if len(results) == 0 {
		return []uint64{}, nil
	}

	// 解析返回的数组
	voteIds := results[0].([]*big.Int)
	result := make([]uint64, len(voteIds))
	for i, id := range voteIds {
		result[i] = id.Uint64()
	}

	return result, nil
}

// RegisterEvent 注册活动到 Vote 合约
func (s *VoteBlockchainService) RegisterEvent(eventID uint64, organizerAddress string) (*types.Transaction, error) {
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
		return nil, fmt.Errorf("Vote 合约未初始化")
	}

	organizer := common.HexToAddress(organizerAddress)

	// 延迟重试机制
	var tx *types.Transaction
	for retry := 0; retry < 3; retry++ {
		tx, err = s.contract.Transact(auth, "registerEvent", big.NewInt(int64(eventID)), organizer)
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

		return nil, fmt.Errorf("注册活动到 Vote 合约失败: %w", err)
	}

	return tx, nil
}

// WaitForTransactionReceipt 等待交易确认
func (s *VoteBlockchainService) WaitForTransactionReceipt(ctx context.Context, txHash string) (*types.Receipt, error) {
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

// GetServerAddress 获取服务端地址（用于查询链上投票记录）
func (s *VoteBlockchainService) GetServerAddress() string {
	return s.address.Hex()
}

// Close 关闭 Vote 区块链服务连接
func (s *VoteBlockchainService) Close() {
	if s.client != nil {
		s.client.Close()
	}
}

