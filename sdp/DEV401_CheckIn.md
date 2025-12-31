# DEV-401: 参赛者签到信息上链功能开发文档

## 1. 文档说明

### 1.1 文档目的
本文档详细描述参赛者签到信息上链功能的技术实现方案，包括智能合约开发、前端集成、后端接口设计等具体开发内容。

### 1.2 文档范围
- 参赛者签到信息上链的完整技术实现
- 防重校验机制的实现
- 链上数据与数据库同步机制
- 错误处理和异常情况处理

### 1.3 参考文档
- PRD-401: Hackathon 比赛平台 - 第四期需求文档
- 合约开发规范: tpl/prd_rules_contract.md
- 项目技术栈: frontend/, backend/, contract/

## 2. 合约架构设计

### 2.1 整体架构
签到信息上链功能采用以下架构：
- 前端（Arena Platform）：用户签到界面
- 后端服务：业务逻辑处理和数据同步
- 智能合约：链上数据存储和防重校验
- 区块链网络：Sepolia 测试网

### 2.2 技术栈选择

#### 2.2.1 合约技术栈
- Solidity ^0.8.21
- HardHat ^2.19.0
- openzeppelin/contracts ^5.0.0
- dotenv ^16.3.1

#### 2.2.2 网络
Sepolia 测试网

#### 2.2.3 源码验证
- Sourcify
- Etherscan（两者都需要）

#### 2.2.4 部署
使用 HardHat 脚本自动化部署

## 3. 数据设计

### 3.1 数据结构
与后端代码结构体保持一致的签到信息数据结构：

```solidity
struct CheckInRecord {
    uint256 eventId;        // 活动 ID
    address participant;    // 参赛者钱包地址
    uint256 timestamp;      // 签到时间戳
    bytes32 transactionHash; // 交易哈希
    bool isActive;         // 是否有效
}
```

### 3.2 事件
定义签到相关事件：

```solidity
event CheckInCompleted(
    uint256 indexed eventId,
    address indexed participant,
    uint256 timestamp,
    bytes32 transactionHash
);

event CheckInFailed(
    uint256 indexed eventId,
    address indexed participant,
    string reason
);
```

## 4. 开发规范

### 4.1 代码规范

#### 4.1.1 命名规范
- 合约名称：使用 PascalCase，如 `HackathonCheckIn`
- 函数名称：使用 camelCase，如 `checkIn`
- 变量名称：使用 camelCase，如 `eventId`
- 常量名称：使用 UPPER_SNAKE_CASE，如 `MAX_PARTICIPANTS`

#### 4.1.2 注释规范
- 合约级别：使用 NatSpec 格式
- 函数级别：说明功能、参数、返回值
- 复杂逻辑：添加行内注释

### 4.2 数据结构规范
- 与后端 Go 结构体字段一一对应
- 使用 uint256 类型表示 ID 和时间戳
- 使用 address 类型表示钱包地址
- 使用 bytes32 类型表示交易哈希

## 5. 智能合约设计

### 5.1 CheckIn 合约

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title HackathonCheckIn
 * @dev Hackathon 比赛签到信息上链合约
 * @notice 处理参赛者签到信息记录和防重校验
 */
contract HackathonCheckIn is Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    
    // 状态变量
    Counters.Counter private _checkInIds;
    
    // 存储结构
    mapping(uint256 => mapping(address => CheckInRecord)) private eventCheckIns;
    mapping(address => mapping(uint256 => bool)) private hasCheckedIn;
    
    // 数据结构
    struct CheckInRecord {
        uint256 eventId;        // 活动 ID
        address participant;    // 参赛者钱包地址
        uint256 timestamp;      // 签到时间戳
        bytes32 transactionHash; // 交易哈希
        bool isActive;         // 是否有效
    }
    
    // 事件定义
    event CheckInCompleted(
        uint256 indexed eventId,
        address indexed participant,
        uint256 timestamp,
        bytes32 transactionHash
    );
    
    event CheckInFailed(
        uint256 indexed eventId,
        address indexed participant,
        string reason
    );
    
    // 修饰符
    modifier onlyValidEvent(uint256 _eventId) {
        require(_eventId > 0, "Invalid event ID");
        _;
    }
    
    modifier onlyNotCheckedIn(uint256 _eventId, address _participant) {
        require(!hasCheckedIn[_participant][_eventId], "Already checked in");
        _;
    }
    
    /**
     * @dev 参赛者签到
     * @param _eventId 活动 ID
     * @param _participant 参赛者钱包地址
     */
    function checkIn(
        uint256 _eventId,
        address _participant
    ) 
        external 
        nonReentrant 
        onlyValidEvent(_eventId)
        onlyNotCheckedIn(_eventId, _participant)
        returns (bool)
    {
        try this._recordCheckIn(_eventId, _participant) {
            return true;
        } catch {
            emit CheckInFailed(_eventId, _participant, "Check in failed");
            return false;
        }
    }
    
    /**
     * @dev 记录签到信息（内部函数）
     */
    function _recordCheckIn(
        uint256 _eventId,
        address _participant
    ) 
        private 
    {
        uint256 timestamp = block.timestamp;
        bytes32 transactionHash = bytes32(block.number);
        
        // 创建签到记录
        eventCheckIns[_eventId][_participant] = CheckInRecord({
            eventId: _eventId,
            participant: _participant,
            timestamp: timestamp,
            transactionHash: transactionHash,
            isActive: true
        });
        
        // 标记已签到
        hasCheckedIn[_participant][_eventId] = true;
        
        // 增加计数器
        _checkInIds.increment();
        
        // 发出事件
        emit CheckInCompleted(_eventId, _participant, timestamp, transactionHash);
    }
    
    /**
     * @dev 查询签到记录
     * @param _eventId 活动 ID
     * @param _participant 参赛者地址
     * @return 签到记录
     */
    function getCheckInRecord(
        uint256 _eventId, 
        address _participant
    ) 
        external 
        view 
        returns (CheckInRecord memory) 
    {
        return eventCheckIns[_eventId][_participant];
    }
    
    /**
     * @dev 检查是否已签到
     * @param _eventId 活动 ID
     * @param _participant 参赛者地址
     * @return 是否已签到
     */
    function hasParticipantCheckedIn(
        uint256 _eventId, 
        address _participant
    ) 
        external 
        view 
        returns (bool) 
    {
        return hasCheckedIn[_participant][_eventId];
    }
    
    /**
     * @dev 获取活动签到总数
     * @param _eventId 活动 ID
     * @return 签到总数
     */
    function getEventCheckInCount(uint256 _eventId) 
        external 
        view 
        returns (uint256) 
    {
        return _checkInIds.current();
    }
    
    /**
     * @dev 获取合约所有者（只有管理员可以调用特殊功能）
     */
    function getContractOwner() external view returns (address) {
        return owner();
    }
}
```

## 6. 后端接口设计

### 6.1 Go 结构体定义

```go
// 签到记录结构体
type CheckInRecord struct {
    EventID         uint64    `json:"event_id" gorm:"column:event_id"`
    Participant     string    `json:"participant" gorm:"column:participant"`
    Timestamp       int64     `json:"timestamp" gorm:"column:timestamp"`
    TransactionHash string    `json:"transaction_hash" gorm:"column:transaction_hash"`
    IsActive        bool      `json:"is_active" gorm:"column:is_active"`
    CreatedAt       time.Time `json:"created_at" gorm:"column:created_at"`
    UpdatedAt       time.Time `json:"updated_at" gorm:"column:updated_at"`
}

// 签到请求
type CheckInRequest struct {
    EventID     uint64 `json:"event_id" binding:"required"`
    Participant string `json:"participant" binding:"required"`
}

// 签到响应
type CheckInResponse struct {
    Success         bool   `json:"success"`
    Message         string `json:"message"`
    TransactionHash string `json:"transaction_hash,omitempty"`
    Timestamp       int64  `json:"timestamp,omitempty"`
}
```

### 6.2 API 接口

```go
// CheckIn godoc
// @Summary 参赛者签到
// @Description 参赛者进行签到，信息同步到区块链
// @Tags checkin
// @Accept json
// @Produce json
// @Param request body CheckInRequest true "签到请求"
// @Success 200 {object} CheckInResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/checkin [post]
func (h *CheckInHandler) CheckIn(c *gin.Context) {
    var req CheckInRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, ErrorResponse{
            Error: "Invalid request format",
            Details: err.Error(),
        })
        return
    }
    
    // 验证活动是否处于签到阶段
    event, err := h.eventService.GetEventByID(req.EventID)
    if err != nil {
        c.JSON(http.StatusBadRequest, ErrorResponse{
            Error: "Event not found",
        })
        return
    }
    
    if !event.IsInCheckInPhase() {
        c.JSON(http.StatusBadRequest, ErrorResponse{
            Error: "Event is not in check-in phase",
        })
        return
    }
    
    // 防重校验：检查链上是否已有记录
    hasCheckedIn, err := h.blockchainService.HasCheckedIn(req.EventID, req.Participant)
    if err != nil {
        c.JSON(http.StatusInternalServerError, ErrorResponse{
            Error: "Failed to check blockchain status",
            Details: err.Error(),
        })
        return
    }
    
    if hasCheckedIn {
        c.JSON(http.StatusBadRequest, ErrorResponse{
            Error: "Participant has already checked in",
        })
        return
    }
    
    // 调用智能合约进行签到
    txHash, err := h.blockchainService.CheckIn(req.EventID, req.Participant)
    if err != nil {
        c.JSON(http.StatusInternalServerError, ErrorResponse{
            Error: "Failed to record check-in on blockchain",
            Details: err.Error(),
        })
        return
    }
    
    // 保存到本地数据库
    checkInRecord := &CheckInRecord{
        EventID:         req.EventID,
        Participant:     req.Participant,
        Timestamp:       time.Now().Unix(),
        TransactionHash: txHash,
        IsActive:        true,
    }
    
    if err := h.db.Create(checkInRecord).Error; err != nil {
        // 记录日志，但不影响返回结果
        log.Printf("Failed to save check-in record to database: %v", err)
    }
    
    c.JSON(http.StatusOK, CheckInResponse{
        Success:         true,
        Message:         "Check-in successful",
        TransactionHash: txHash,
        Timestamp:       checkInRecord.Timestamp,
    })
}

// GetCheckInStatus godoc
// @Summary 获取签到状态
// @Description 查询参赛者是否已签到
// @Tags checkin
// @Accept json
// @Produce json
// @Param event_id path uint64 true "活动 ID"
// @Param participant path string true "参赛者地址"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} ErrorResponse
// @Router /api/v1/checkin/status/{event_id}/{participant} [get]
func (h *CheckInHandler) GetCheckInStatus(c *gin.Context) {
    eventID, err := strconv.ParseUint(c.Param("event_id"), 10, 64)
    if err != nil {
        c.JSON(http.StatusBadRequest, ErrorResponse{
            Error: "Invalid event ID",
        })
        return
    }
    
    participant := c.Param("participant")
    if participant == "" {
        c.JSON(http.StatusBadRequest, ErrorResponse{
            Error: "Participant address is required",
        })
        return
    }
    
    // 检查链上状态
    hasCheckedIn, err := h.blockchainService.HasCheckedIn(eventID, participant)
    if err != nil {
        c.JSON(http.StatusInternalServerError, ErrorResponse{
            Error: "Failed to check blockchain status",
            Details: err.Error(),
        })
        return
    }
    
    // 获取数据库记录
    var record CheckInRecord
    err = h.db.Where("event_id = ? AND participant = ?", eventID, participant).First(&record).Error
    
    c.JSON(http.StatusOK, gin.H{
        "has_checked_in": hasCheckedIn,
        "record":         record,
        "blockchain_verified": hasCheckedIn,
    })
}
```

### 6.3 区块链服务

```go
type BlockchainService struct {
    client      *ethclient.Client
    contract    *common.Address
    privateKey  *ecdsa.PrivateKey
    chainID     *big.Int
}

func NewBlockchainService(config *config.BlockchainConfig) (*BlockchainService, error) {
    client, err := ethclient.Dial(config.RPCEndpoint)
    if err != nil {
        return nil, fmt.Errorf("failed to connect to blockchain: %w", err)
    }
    
    privateKey, err := crypto.HexToECDSA(config.PrivateKey)
    if err != nil {
        return nil, fmt.Errorf("invalid private key: %w", err)
    }
    
    chainID := big.NewInt(int64(config.ChainID))
    
    return &BlockchainService{
        client:     client,
        contract:   common.HexToAddress(config.ContractAddress),
        privateKey: privateKey,
        chainID:    chainID,
    }, nil
}

func (bs *BlockchainService) CheckIn(eventID uint64, participant string) (string, error) {
    // 创建合约实例
    contract, err := contracts.NewHackathonCheckIn(bs.contract, bs.client)
    if err != nil {
        return "", fmt.Errorf("failed to create contract instance: %w", err)
    }
    
    // 创建交易选项
    auth, err := bind.NewKeyedTransactorWithChainID(bs.privateKey, bs.chainID)
    if err != nil {
        return "", fmt.Errorf("failed to create transactor: %w", err)
    }
    
    // 设置 Gas 限制和价格
    auth.GasLimit = uint64(300000)
    auth.GasPrice, err = bs.client.SuggestGasPrice(context.Background())
    if err != nil {
        return "", fmt.Errorf("failed to get gas price: %w", err)
    }
    
    // 调用智能合约
    participantAddr := common.HexToAddress(participant)
    tx, err := contract.CheckIn(auth, big.NewInt(int64(eventID)), participantAddr)
    if err != nil {
        return "", fmt.Errorf("failed to call checkIn: %w", err)
    }
    
    return tx.Hash().Hex(), nil
}

func (bs *BlockchainService) HasCheckedIn(eventID uint64, participant string) (bool, error) {
    contract, err := contracts.NewHackathonCheckIn(bs.contract, bs.client)
    if err != nil {
        return false, fmt.Errorf("failed to create contract instance: %w", err)
    }
    
    participantAddr := common.HexToAddress(participant)
    return contract.HasParticipantCheckedIn(nil, big.NewInt(int64(eventID)), participantAddr)
}
```

## 7. 前端集成

### 7.1 React 组件

```tsx
// components/CheckInButton.tsx
import React, { useState } from 'react';
import { Button, message, Spin } from 'antd';
import { useWallet } from '../hooks/useWallet';
import { checkIn, getCheckInStatus } from '../services/checkinService';

interface CheckInButtonProps {
  eventId: number;
  onCheckInSuccess?: (txHash: string) => void;
}

export const CheckInButton: React.FC<CheckInButtonProps> = ({
  eventId,
  onCheckInSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const { account, connectWallet } = useWallet();

  const handleCheckIn = async () => {
    if (!account) {
      message.error('请先连接钱包');
      await connectWallet();
      return;
    }

    setLoading(true);
    try {
      // 先检查是否已签到
      const status = await getCheckInStatus(eventId, account);
      if (status.hasCheckedIn) {
        message.warning('您已经签到过了');
        return;
      }

      // 执行签到
      const result = await checkIn(eventId, account);
      
      message.success('签到成功！');
      onCheckInSuccess?.(result.transactionHash);
    } catch (error: any) {
      console.error('签到失败:', error);
      message.error(error.message || '签到失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="primary"
      size="large"
      loading={loading}
      onClick={handleCheckIn}
      disabled={!account}
    >
      {loading ? <Spin size="small" /> : null}
      {account ? '立即签到' : '请先连接钱包'}
    </Button>
  );
};
```

### 7.2 API 服务

```tsx
// services/checkinService.ts
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';

export interface CheckInResponse {
  success: boolean;
  message: string;
  transactionHash?: string;
  timestamp?: number;
}

export interface CheckInStatus {
  has_checked_in: boolean;
  record?: any;
  blockchain_verified: boolean;
}

export const checkIn = async (eventId: number, participant: string): Promise<CheckInResponse> => {
  const response = await axios.post(`${API_BASE_URL}/checkin`, {
    event_id: eventId,
    participant,
  });
  return response.data;
};

export const getCheckInStatus = async (eventId: number, participant: string): Promise<CheckInStatus> => {
  const response = await axios.get(
    `${API_BASE_URL}/checkin/status/${eventId}/${participant}`
  );
  return response.data;
};
```

## 8. 部署和测试

### 8.1 合约部署脚本

```javascript
// scripts/deploy.js
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("部署合约，使用账户:", deployer.address);
  console.log("账户余额:", ethers.utils.formatEther(await deployer.getBalance()));

  const HackathonCheckIn = await ethers.getContractFactory("HackathonCheckIn");
  const hackathonCheckIn = await HackathonCheckIn.deploy();

  await hackathonCheckIn.deployed();

  console.log("HackathonCheckIn 合约地址:", hackathonCheckIn.address);
  console.log("部署交易哈希:", hackathonCheckIn.deployTransaction.hash);
  
  // 等待几个区块确认
  console.log("等待区块确认...");
  await hackathonCheckIn.deployTransaction.wait(2);
  
  console.log("合约部署完成！");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### 8.2 测试用例

```javascript
// test/HackathonCheckIn.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HackathonCheckIn", function () {
  let hackathonCheckIn;
  let owner;
  let participant1;
  let participant2;

  beforeEach(async function () {
    [owner, participant1, participant2] = await ethers.getSigners();
    
    const HackathonCheckIn = await ethers.getContractFactory("HackathonCheckIn");
    hackathonCheckIn = await HackathonCheckIn.deploy();
    await hackathonCheckIn.deployed();
  });

  describe("签到功能", function () {
    it("应该允许参赛者成功签到", async function () {
      const eventId = 1;
      
      await expect(hackathonCheckIn.connect(participant1).checkIn(eventId, participant1.address))
        .to.emit(hackathonCheckIn, "CheckInCompleted")
        .withArgs(eventId, participant1.address, anyValue, anyValue);
      
      const hasCheckedIn = await hackathonCheckIn.hasParticipantCheckedIn(eventId, participant1.address);
      expect(hasCheckedIn).to.be.true;
    });

    it("应该阻止重复签到", async function () {
      const eventId = 1;
      
      // 第一次签到
      await hackathonCheckIn.connect(participant1).checkIn(eventId, participant1.address);
      
      // 第二次签到应该失败
      await expect(
        hackathonCheckIn.connect(participant1).checkIn(eventId, participant1.address)
      ).to.be.revertedWith("Already checked in");
    });

    it("应该正确返回签到记录", async function () {
      const eventId = 1;
      
      await hackathonCheckIn.connect(participant1).checkIn(eventId, participant1.address);
      
      const record = await hackathonCheckIn.getCheckInRecord(eventId, participant1.address);
      expect(record.eventId).to.equal(eventId);
      expect(record.participant).to.equal(participant1.address);
      expect(record.isActive).to.be.true;
    });
  });
});
```

## 9. 错误处理和异常情况

### 9.1 常见错误类型

```go
type CheckInError struct {
    Code    int    `json:"code"`
    Message string `json:"message"`
    Details string `json:"details,omitempty"`
}

const (
    ErrorCodeEventNotInCheckInPhase = 1001
    ErrorCodeAlreadyCheckedIn      = 1002
    ErrorCodeInvalidEventID        = 1003
    ErrorCodeBlockchainError       = 1004
    ErrorCodeWalletNotConnected    = 1005
    ErrorCodeInsufficientGas       = 1006
)

func (e CheckInError) Error() string {
    return e.Message
}
```

### 9.2 错误处理策略

1. **活动不在签到阶段**：返回明确的错误信息，提示用户等待签到阶段开始
2. **重复签到**：查询链上记录，如果已存在则直接返回已签到状态
3. **链上写入失败**：记录详细错误日志，提供重试机制
4. **Gas 费不足**：估算所需 Gas 费，提示用户充值
5. **网络连接问题**：实现重试机制，最大重试次数为 3 次

## 10. 性能优化

### 10.1 批量操作
- 支持批量查询签到状态
- 批量写入优化：使用 Merkle Tree 减少链上数据量

### 10.2 缓存策略
- Redis 缓存签到状态，减少链上查询次数
- 设置合理的缓存过期时间（5分钟）

### 10.3 异步处理
- 链上操作异步处理，避免阻塞用户界面
- 提供交易状态查询接口

## 11. 监控和日志

### 11.1 关键指标监控
- 签到成功率
- 平均签到时间
- Gas 费消耗
- 错误类型分布

### 11.2 日志记录
```go
func (h *CheckInHandler) logCheckInAttempt(eventID uint64, participant string, success bool, err error) {
    logFields := logrus.Fields{
        "event_id":   eventID,
        "participant": participant,
        "success":    success,
        "timestamp":  time.Now().Unix(),
    }
    
    if err != nil {
        logFields["error"] = err.Error()
    }
    
    if success {
        h.logger.WithFields(logFields).Info("Check-in successful")
    } else {
        h.logger.WithFields(logFields).Error("Check-in failed")
    }
}
```

## 12. 安全考虑

### 12.1 权限控制
- 只有活动主办方可以启用/禁用签到功能
- 参赛者只能为自己签到

### 12.2 防重校验
- 链上数据作为唯一可信源
- 多重校验机制：数据库 + 区块链

### 12.3 数据隐私
- 敏感信息加密存储
- 最小化数据收集原则

---

**文档版本**: v1.0  
**创建日期**: 2024-01-XX  
**最后更新**: 2024-01-XX  
**维护人员**: 区块链开发团队