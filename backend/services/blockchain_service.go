package services

import (
	"context"
	"crypto/ecdsa"
	"encoding/json"
	"fmt"
	"math/big"
	"os"
	"strings"
	"time"

	"hackathon-backend/config"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

type BlockchainService struct {
	client        *ethclient.Client
	eventContract common.Address
	eventABI      abi.ABI
	privateKey    *ecdsa.PrivateKey
	fromAddress   common.Address
}

// NewBlockchainService 创建区块链服务实例
func NewBlockchainService() (*BlockchainService, error) {
	// 检查配置是否已加载
	if config.AppConfig == nil {
		return nil, fmt.Errorf("配置未加载，请先调用 config.LoadConfig()")
	}

	// 连接到以太坊节点
	client, err := ethclient.Dial(config.AppConfig.BlockchainRPCURL)
	if err != nil {
		return nil, fmt.Errorf("连接区块链节点失败: %w", err)
	}

	// 加载合约地址
	eventContract := common.HexToAddress(config.AppConfig.HackathonEventContract)

	// 加载合约ABI
	eventABI, err := loadContractABI("/Users/monstersquad/Desktop/code/web3/Hackathon/contract/artifacts/contracts/HackathonEvent.sol/HackathonEvent.json")
	if err != nil {
		return nil, fmt.Errorf("加载合约ABI失败: %w", err)
	}

	// 加载私钥（从环境变量或配置文件）
	privateKeyHex := os.Getenv("BLOCKCHAIN_PRIVATE_KEY")
	if privateKeyHex == "" {
		return nil, fmt.Errorf("未设置区块链私钥环境变量 BLOCKCHAIN_PRIVATE_KEY")
	}

	// 移除0x前缀
	privateKeyHex = strings.TrimPrefix(privateKeyHex, "0x")
	privateKey, err := crypto.HexToECDSA(privateKeyHex)
	if err != nil {
		return nil, fmt.Errorf("解析私钥失败: %w", err)
	}

	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		return nil, fmt.Errorf("获取公钥失败")
	}

	fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)

	fmt.Println("fromAddress: ", fromAddress)

	return &BlockchainService{
		client:        client,
		eventContract: eventContract,
		eventABI:      eventABI,
		privateKey:    privateKey,
		fromAddress:   fromAddress,
	}, nil
}

// loadContractABI 加载合约ABI
func loadContractABI(abiPath string) (abi.ABI, error) {
	abiFile, err := os.ReadFile(abiPath)
	if err != nil {
		return abi.ABI{}, err
	}

	var artifact struct {
		ABI json.RawMessage `json:"abi"`
	}
	if err := json.Unmarshal(abiFile, &artifact); err != nil {
		return abi.ABI{}, err
	}

	contractABI, err := abi.JSON(strings.NewReader(string(artifact.ABI)))
	if err != nil {
		return abi.ABI{}, err
	}

	return contractABI, nil
}

// CreateEvent 在区块链上创建活动
// 返回: 链上eventId, 交易哈希, 错误
func (s *BlockchainService) CreateEvent(name, description, location string, startTime, endTime time.Time) (uint64, string, error) {
	// 准备交易数据
	data, err := s.eventABI.Pack(
		"createEvent",
		name,
		description,
		big.NewInt(startTime.Unix()),
		big.NewInt(endTime.Unix()),
		location,
	)
	if err != nil {
		return 0, "", fmt.Errorf("打包交易数据失败: %w", err)
	}

	// 发送交易
	txHash, err := s.sendTransaction(s.eventContract, data, big.NewInt(0))
	if err != nil {
		return 0, "", fmt.Errorf("发送交易失败: %w", err)
	}

	// 等待交易确认并获取返回值
	chainEventID, err := s.waitForTransactionAndGetEventID(txHash)
	if err != nil {
		return 0, txHash, fmt.Errorf("等待交易确认失败: %w", err)
	}

	return chainEventID, txHash, nil
}

// UpdateEvent 在区块链上更新活动
func (s *BlockchainService) UpdateEvent(chainEventID uint64, name, description, location string, startTime, endTime time.Time) (string, error) {
	data, err := s.eventABI.Pack(
		"updateEvent",
		big.NewInt(int64(chainEventID)),
		name,
		description,
		big.NewInt(startTime.Unix()),
		big.NewInt(endTime.Unix()),
		location,
	)
	if err != nil {
		return "", fmt.Errorf("打包交易数据失败: %w", err)
	}

	txHash, err := s.sendTransaction(s.eventContract, data, big.NewInt(0))
	if err != nil {
		return "", fmt.Errorf("发送交易失败: %w", err)
	}

	return txHash, nil
}

// DeleteEvent 在区块链上删除活动
func (s *BlockchainService) DeleteEvent(chainEventID uint64) (string, error) {
	data, err := s.eventABI.Pack(
		"deleteEvent",
		big.NewInt(int64(chainEventID)),
	)
	if err != nil {
		return "", fmt.Errorf("打包交易数据失败: %w", err)
	}

	txHash, err := s.sendTransaction(s.eventContract, data, big.NewInt(0))
	if err != nil {
		return "", fmt.Errorf("发送交易失败: %w", err)
	}

	return txHash, nil
}

// CheckIn 在区块链上记录签到
func (s *BlockchainService) CheckIn(chainEventID uint64) (string, error) {
	data, err := s.eventABI.Pack(
		"checkIn",
		big.NewInt(int64(chainEventID)),
	)
	if err != nil {
		return "", fmt.Errorf("打包交易数据失败: %w", err)
	}

	txHash, err := s.sendTransaction(s.eventContract, data, big.NewInt(0))
	if err != nil {
		return "", fmt.Errorf("发送交易失败: %w", err)
	}

	return txHash, nil
}

// Vote 在区块链上记录投票
func (s *BlockchainService) Vote(chainEventID, projectID, score uint64) (string, error) {
	data, err := s.eventABI.Pack(
		"vote",
		big.NewInt(int64(chainEventID)),
		big.NewInt(int64(projectID)),
		big.NewInt(int64(score)),
	)
	if err != nil {
		return "", fmt.Errorf("打包交易数据失败: %w", err)
	}

	txHash, err := s.sendTransaction(s.eventContract, data, big.NewInt(0))
	if err != nil {
		return "", fmt.Errorf("发送交易失败: %w", err)
	}

	// 等待交易确认
	if err := s.WaitForTransaction(txHash); err != nil {
		return txHash, fmt.Errorf("交易确认失败: %w (交易哈希: %s)", err, txHash)
	}

	return txHash, nil
}

// RevokeVote 在区块链上撤销投票
func (s *BlockchainService) RevokeVote(chainEventID, voteIndex uint64) (string, error) {
	data, err := s.eventABI.Pack(
		"revokeVote",
		big.NewInt(int64(chainEventID)),
		big.NewInt(int64(voteIndex)),
	)
	if err != nil {
		return "", fmt.Errorf("打包交易数据失败: %w", err)
	}

	txHash, err := s.sendTransaction(s.eventContract, data, big.NewInt(0))
	if err != nil {
		return "", fmt.Errorf("发送交易失败: %w", err)
	}

	// 等待交易确认
	if err := s.WaitForTransaction(txHash); err != nil {
		return txHash, fmt.Errorf("交易确认失败: %w (交易哈希: %s)", err, txHash)
	}

	return txHash, nil
}

// GetEvent 从区块链获取活动信息
func (s *BlockchainService) GetEvent(chainEventID uint64) (map[string]interface{}, error) {
	data, err := s.eventABI.Pack("events", big.NewInt(int64(chainEventID)))
	if err != nil {
		return nil, fmt.Errorf("打包调用数据失败: %w", err)
	}

	msg := ethereum.CallMsg{
		To:   &s.eventContract,
		Data: data,
	}

	result, err := s.client.CallContract(context.Background(), msg, nil)
	if err != nil {
		return nil, fmt.Errorf("调用合约失败: %w", err)
	}

	// 解析返回数据
	var eventData struct {
		Name        string
		Description string
		StartTime   *big.Int
		EndTime     *big.Int
		Location    string
		Organizer   common.Address
		IsActive    bool
		IsDeleted   bool
	}

	err = s.eventABI.UnpackIntoInterface(&eventData, "events", result)
	if err != nil {
		return nil, fmt.Errorf("解析返回数据失败: %w", err)
	}

	return map[string]interface{}{
		"name":        eventData.Name,
		"description": eventData.Description,
		"start_time":  time.Unix(eventData.StartTime.Int64(), 0),
		"end_time":    time.Unix(eventData.EndTime.Int64(), 0),
		"location":    eventData.Location,
		"organizer":   eventData.Organizer.Hex(),
		"is_active":   eventData.IsActive,
		"is_deleted":  eventData.IsDeleted,
	}, nil
}

// VerifyCheckIn 验证签到记录
func (s *BlockchainService) VerifyCheckIn(chainEventID uint64, participantAddress string) (bool, error) {
	data, err := s.eventABI.Pack(
		"isCheckedIn",
		big.NewInt(int64(chainEventID)),
		common.HexToAddress(participantAddress),
	)
	if err != nil {
		return false, fmt.Errorf("打包调用数据失败: %w", err)
	}

	msg := ethereum.CallMsg{
		To:   &s.eventContract,
		Data: data,
	}

	result, err := s.client.CallContract(context.Background(), msg, nil)
	if err != nil {
		return false, fmt.Errorf("调用合约失败: %w", err)
	}

	var isCheckedIn bool
	err = s.eventABI.UnpackIntoInterface(&isCheckedIn, "isCheckedIn", result)
	if err != nil {
		return false, fmt.Errorf("解析返回数据失败: %w", err)
	}

	return isCheckedIn, nil
}

// ActivateEvent 激活活动
func (s *BlockchainService) ActivateEvent(chainEventID uint64) (string, error) {
	data, err := s.eventABI.Pack(
		"activateEvent",
		big.NewInt(int64(chainEventID)),
	)
	if err != nil {
		return "", fmt.Errorf("打包交易数据失败: %w", err)
	}

	txHash, err := s.sendTransaction(s.eventContract, data, big.NewInt(0))
	if err != nil {
		return "", fmt.Errorf("发送交易失败: %w", err)
	}

	return txHash, nil
}

// EndEvent 结束活动
func (s *BlockchainService) EndEvent(chainEventID uint64) (string, error) {
	data, err := s.eventABI.Pack(
		"endEvent",
		big.NewInt(int64(chainEventID)),
	)
	if err != nil {
		return "", fmt.Errorf("打包交易数据失败: %w", err)
	}

	txHash, err := s.sendTransaction(s.eventContract, data, big.NewInt(0))
	if err != nil {
		return "", fmt.Errorf("发送交易失败: %w", err)
	}

	return txHash, nil
}

// sendTransaction 发送交易到区块链
func (s *BlockchainService) sendTransaction(to common.Address, data []byte, value *big.Int) (string, error) {
	ctx := context.Background()

	// 获取nonce
	nonce, err := s.client.PendingNonceAt(ctx, s.fromAddress)
	if err != nil {
		return "", fmt.Errorf("获取nonce失败: %w", err)
	}

	// 获取gas价格
	gasPrice, err := s.client.SuggestGasPrice(ctx)
	if err != nil {
		return "", fmt.Errorf("获取gas价格失败: %w", err)
	}

	// 估算gas限制
	gasLimit, err := s.client.EstimateGas(ctx, ethereum.CallMsg{
		From:  s.fromAddress,
		To:    &to,
		Value: value,
		Data:  data,
	})
	if err != nil {
		return "", fmt.Errorf("估算gas失败: %w", err)
	}

	// 创建交易
	tx := types.NewTransaction(nonce, to, value, gasLimit, gasPrice, data)

	// 获取链ID
	chainID, err := s.client.NetworkID(ctx)
	if err != nil {
		return "", fmt.Errorf("获取链ID失败: %w", err)
	}

	// 签名交易
	signedTx, err := types.SignTx(tx, types.NewEIP155Signer(chainID), s.privateKey)
	if err != nil {
		return "", fmt.Errorf("签名交易失败: %w", err)
	}

	// 发送交易
	err = s.client.SendTransaction(ctx, signedTx)
	if err != nil {
		return "", fmt.Errorf("发送交易失败: %w", err)
	}

	return signedTx.Hash().Hex(), nil
}

// WaitForTransaction 等待交易确认
func (s *BlockchainService) WaitForTransaction(txHash string) error {
	ctx := context.Background()
	hash := common.HexToHash(txHash)

	// 等待交易被打包
	for i := 0; i < 1200; i++ { // 最多等待60秒
		receipt, err := s.client.TransactionReceipt(ctx, hash)
		if err == nil {
			if receipt.Status == 1 {
				return nil
			}
			return fmt.Errorf("交易失败")
		}
		time.Sleep(1 * time.Second)
	}

	return fmt.Errorf("等待交易确认超时")
}

// waitForTransactionAndGetEventID 等待交易确认并从事件日志中获取 eventId
func (s *BlockchainService) waitForTransactionAndGetEventID(txHash string) (uint64, error) {
	ctx := context.Background()
	hash := common.HexToHash(txHash)

	// 等待交易被打包
	var receipt *types.Receipt
	var err error
	for i := 0; i < 60; i++ { // 最多等待60秒
		receipt, err = s.client.TransactionReceipt(ctx, hash)
		if err == nil {
			break
		}
		time.Sleep(1 * time.Second)
	}

	if err != nil {
		return 0, fmt.Errorf("等待交易确认超时")
	}

	if receipt.Status != 1 {
		return 0, fmt.Errorf("交易失败")
	}

	// 解析事件日志获取 eventId
	// EventCreated 事件的签名
	eventCreatedSig := []byte("EventCreated(uint256,string,address)")
	eventCreatedHash := crypto.Keccak256Hash(eventCreatedSig)

	for _, log := range receipt.Logs {
		if log.Topics[0] == eventCreatedHash {
			// 第一个 topic 是事件签名
			// 第二个 topic 是 indexed 的 eventId
			if len(log.Topics) > 1 {
				eventID := log.Topics[1].Big().Uint64()
				return eventID, nil
			}
		}
	}

	return 0, fmt.Errorf("未找到 EventCreated 事件")
}

// Close 关闭区块链连接
func (s *BlockchainService) Close() {
	if s.client != nil {
		s.client.Close()
	}
}
