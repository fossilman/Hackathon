# DEV-401: 活动信息真实性验证功能开发文档

## 1. 文档说明

### 1.1 文档目的
本文档详细描述活动信息真实性验证功能的技术实现方案，基于 PRD401.md 中的 3.1.3.4 和 3.1.3.5 需求制定，包括智能合约开发、前端集成、后端接口设计等具体开发内容。

### 1.2 文档范围
- 活动信息真实性验证的完整技术实现（活动中）
- 活动信息真实性验证的完整技术实现（活动后）
- 投票记录验证机制的实现
- 链上数据与数据库数据对比机制
- 错误处理和异常情况处理

### 1.3 参考文档
- PRD-401: Hackathon 比赛平台 - 第四期需求文档（3.1.3.4、3.1.3.5）
- 合约开发规范: tpl/prd_rules_contract.md
- 项目技术栈: frontend/, backend/, contract/
- 现有合约: EventInfoContract.sol, VoteContract.sol

## 2. 合约架构设计

### 2.1 整体架构
活动信息真实性验证功能采用以下架构：
- 前端（Arena Platform）：用户验证界面（参赛者和游客）
- 后端服务：数据对比和验证逻辑处理
- 智能合约：链上数据查询接口（EventInfoContract、VoteContract）
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

### 3.1 验证结果数据结构
与后端代码结构体保持一致的验证结果数据结构：

```solidity
struct VerificationResult {
    uint256 eventId;              // 活动 ID
    bool eventInfoMatch;          // 活动信息是否一致
    bool voteRecordsMatch;        // 投票记录是否一致
    uint256 verificationTime;     // 验证时间戳
    address verifier;             // 验证者地址（可选）
    string[] discrepancies;       // 不一致项列表
}
```

### 3.2 活动信息对比结构
```solidity
struct EventInfoComparison {
    uint256 eventId;
    string eventName;
    string description;
    uint256 startTime;
    uint256 endTime;
    string location;
    address organizer;
    bool isDeleted;
    uint256 createdAt;
    uint256 updatedAt;
}
```

### 3.3 投票记录对比结构
```solidity
struct VoteRecordComparison {
    uint256 voteId;
    uint256 eventId;
    uint256 projectId;
    address voter;
    uint8 score;
    uint256 timestamp;
    bool isActive;
    bool isRevoked;
}
```

### 3.4 事件
定义验证相关事件：

```solidity
event VerificationCompleted(
    uint256 indexed eventId,
    address indexed verifier,
    bool eventInfoMatch,
    bool voteRecordsMatch,
    uint256 timestamp
);

event VerificationFailed(
    uint256 indexed eventId,
    address indexed verifier,
    string reason,
    uint256 timestamp
);
```


## 4. 开发规范

### 4.1 代码规范

#### 4.1.1 命名规范
- 合约名称：使用 PascalCase，如 `VerificationContract`
- 函数名称：使用 camelCase，如 `verifyEventInfo`
- 变量名称：使用 camelCase，如 `eventId`
- 常量名称：使用 UPPER_SNAKE_CASE，如 `MAX_DISCREPANCIES`

#### 4.1.2 注释规范
- 合约级别：使用 NatSpec 格式
- 函数级别：说明功能、参数、返回值
- 复杂逻辑：添加行内注释

### 4.2 数据结构规范
- 与后端 Go 结构体字段一一对应
- 使用 uint256 类型表示 ID 和时间戳
- 使用 address 类型表示钱包地址
- 使用 bool 类型表示验证结果

## 5. 智能合约设计

### 5.1 验证合约（可选）

**注意**：由于验证功能主要是读取现有合约（EventInfoContract 和 VoteContract）的数据并在后端进行对比，因此不需要单独的验证合约。验证逻辑将在后端实现，通过调用现有合约的查询接口获取链上数据。

### 5.2 现有合约接口利用

#### 5.2.1 EventInfoContract 查询接口
```solidity
// 查询活动信息
function getEvent(uint256 _eventId) external view returns (EventInfo memory);

// 查询活动历史记录
function getEventHistory(uint256 _eventId) external view returns (EventHistory[] memory);

// 批量查询活动信息
function getEvents(uint256[] memory _eventIds) external view returns (EventInfo[] memory);
```

#### 5.2.2 VoteContract 查询接口
```solidity
// 获取投票记录
function getVoteRecord(uint256 _voteId) external view returns (VoteRecord memory);

// 获取活动投票统计
function getEventStats(uint256 _eventId) external view returns (uint256, uint256, uint256);

// 获取活动的所有投票记录
function getEventVotes(uint256 _eventId, uint256 _offset, uint256 _limit) external view returns (uint256[] memory);

// 批量获取投票记录
function batchGetVoteRecords(uint256[] memory _voteIds) external view returns (VoteRecord[] memory);

// 验证投票记录的完整性
function validateVoteRecord(uint256 _voteId) external view returns (bool);
```


## 6. 后端接口设计

### 6.1 Go 结构体定义

```go
// 验证请求
type VerificationRequest struct {
    EventID uint64 `json:"event_id" binding:"required"`
    VerifyVotes bool `json:"verify_votes"` // 是否验证投票记录
}

// 验证响应
type VerificationResponse struct {
    Success           bool                    `json:"success"`
    EventID           uint64                  `json:"event_id"`
    EventInfoMatch    bool                    `json:"event_info_match"`
    VoteRecordsMatch  bool                    `json:"vote_records_match"`
    VerificationTime  int64                   `json:"verification_time"`
    Discrepancies     []string                `json:"discrepancies,omitempty"`
    EventInfo         *EventInfoComparison    `json:"event_info,omitempty"`
    VoteStats         *VoteStatsComparison    `json:"vote_stats,omitempty"`
    TransactionHashes []string                `json:"transaction_hashes,omitempty"`
}

// 活动信息对比
type EventInfoComparison struct {
    DatabaseData  *EventInfoData `json:"database_data"`
    BlockchainData *EventInfoData `json:"blockchain_data"`
    IsMatch       bool           `json:"is_match"`
}

// 活动信息数据
type EventInfoData struct {
    EventID     uint64 `json:"event_id"`
    EventName   string `json:"event_name"`
    Description string `json:"description"`
    StartTime   int64  `json:"start_time"`
    EndTime     int64  `json:"end_time"`
    Location    string `json:"location"`
    Organizer   string `json:"organizer"`
    IsDeleted   bool   `json:"is_deleted"`
    CreatedAt   int64  `json:"created_at"`
    UpdatedAt   int64  `json:"updated_at"`
}

// 投票统计对比
type VoteStatsComparison struct {
    DatabaseData   *VoteStatsData `json:"database_data"`
    BlockchainData *VoteStatsData `json:"blockchain_data"`
    IsMatch        bool           `json:"is_match"`
}

// 投票统计数据
type VoteStatsData struct {
    TotalVotes   uint64 `json:"total_votes"`
    ActiveVotes  uint64 `json:"active_votes"`
    RevokedVotes uint64 `json:"revoked_votes"`
}
```


### 6.2 API 接口

```go
// VerifyEventInfo godoc
// @Summary 验证活动信息真实性
// @Description 对比数据库和区块链上的活动信息，验证数据一致性
// @Tags verification
// @Accept json
// @Produce json
// @Param request body VerificationRequest true "验证请求"
// @Success 200 {object} VerificationResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/verification/event [post]
func (h *VerificationHandler) VerifyEventInfo(c *gin.Context) {
    var req VerificationRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, ErrorResponse{
            Error: "Invalid request format",
            Details: err.Error(),
        })
        return
    }
    
    // 1. 从数据库获取活动信息
    dbEvent, err := h.eventService.GetEventByID(req.EventID)
    if err != nil {
        c.JSON(http.StatusBadRequest, ErrorResponse{
            Error: "Event not found in database",
        })
        return
    }
    
    // 2. 从区块链获取活动信息
    blockchainEvent, err := h.blockchainService.GetEventFromBlockchain(req.EventID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, ErrorResponse{
            Error: "Failed to fetch event from blockchain",
            Details: err.Error(),
        })
        return
    }
    
    // 3. 对比活动基本信息
    eventInfoMatch, eventDiscrepancies := h.compareEventInfo(dbEvent, blockchainEvent)
    
    var voteRecordsMatch bool
    var voteDiscrepancies []string
    var voteStats *VoteStatsComparison
    
    // 4. 如果需要验证投票记录
    if req.VerifyVotes {
        voteRecordsMatch, voteDiscrepancies, voteStats, err = h.verifyVoteRecords(req.EventID)
        if err != nil {
            c.JSON(http.StatusInternalServerError, ErrorResponse{
                Error: "Failed to verify vote records",
                Details: err.Error(),
            })
            return
        }
    } else {
        voteRecordsMatch = true // 不验证时默认为一致
    }
    
    // 5. 合并不一致项
    allDiscrepancies := append(eventDiscrepancies, voteDiscrepancies...)
    
    // 6. 获取交易哈希列表
    txHashes := h.getEventTransactionHashes(req.EventID)
    
    // 7. 构建响应
    response := VerificationResponse{
        Success:           true,
        EventID:           req.EventID,
        EventInfoMatch:    eventInfoMatch,
        VoteRecordsMatch:  voteRecordsMatch,
        VerificationTime:  time.Now().Unix(),
        Discrepancies:     allDiscrepancies,
        EventInfo: &EventInfoComparison{
            DatabaseData:   h.convertToEventInfoData(dbEvent),
            BlockchainData: h.convertToEventInfoData(blockchainEvent),
            IsMatch:        eventInfoMatch,
        },
        VoteStats:         voteStats,
        TransactionHashes: txHashes,
    }
    
    c.JSON(http.StatusOK, response)
}

// GetEventVerificationStatus godoc
// @Summary 获取活动验证状态（活动后）
// @Description 供游客和参赛者在过往活动列表中验证活动信息
// @Tags verification
// @Accept json
// @Produce json
// @Param event_id path uint64 true "活动 ID"
// @Success 200 {object} VerificationResponse
// @Failure 400 {object} ErrorResponse
// @Router /api/v1/verification/event/{event_id} [get]
func (h *VerificationHandler) GetEventVerificationStatus(c *gin.Context) {
    eventID, err := strconv.ParseUint(c.Param("event_id"), 10, 64)
    if err != nil {
        c.JSON(http.StatusBadRequest, ErrorResponse{
            Error: "Invalid event ID",
        })
        return
    }
    
    // 调用验证逻辑（与 VerifyEventInfo 相同）
    req := VerificationRequest{
        EventID:     eventID,
        VerifyVotes: true, // 活动后验证包含投票记录
    }
    
    // 复用验证逻辑
    h.VerifyEventInfo(c)
}
```


### 6.3 区块链服务

```go
type VerificationService struct {
    eventInfoContract *contracts.EventInfoContract
    voteContract      *contracts.VoteContract
    client            *ethclient.Client
}

func NewVerificationService(config *config.BlockchainConfig) (*VerificationService, error) {
    client, err := ethclient.Dial(config.RPCEndpoint)
    if err != nil {
        return nil, fmt.Errorf("failed to connect to blockchain: %w", err)
    }
    
    eventInfoContract, err := contracts.NewEventInfoContract(
        common.HexToAddress(config.EventInfoContractAddress),
        client,
    )
    if err != nil {
        return nil, fmt.Errorf("failed to create event info contract instance: %w", err)
    }
    
    voteContract, err := contracts.NewVoteContract(
        common.HexToAddress(config.VoteContractAddress),
        client,
    )
    if err != nil {
        return nil, fmt.Errorf("failed to create vote contract instance: %w", err)
    }
    
    return &VerificationService{
        eventInfoContract: eventInfoContract,
        voteContract:      voteContract,
        client:            client,
    }, nil
}

// GetEventFromBlockchain 从区块链获取活动信息
func (vs *VerificationService) GetEventFromBlockchain(eventID uint64) (*models.Event, error) {
    eventInfo, err := vs.eventInfoContract.GetEvent(nil, big.NewInt(int64(eventID)))
    if err != nil {
        return nil, fmt.Errorf("failed to get event from blockchain: %w", err)
    }
    
    return &models.Event{
        EventID:     eventInfo.EventId.Uint64(),
        EventName:   eventInfo.EventName,
        Description: eventInfo.Description,
        StartTime:   time.Unix(eventInfo.StartTime.Int64(), 0),
        EndTime:     time.Unix(eventInfo.EndTime.Int64(), 0),
        Location:    eventInfo.Location,
        Organizer:   eventInfo.Organizer.Hex(),
        IsDeleted:   eventInfo.IsDeleted,
        CreatedAt:   time.Unix(eventInfo.CreatedAt.Int64(), 0),
        UpdatedAt:   time.Unix(eventInfo.UpdatedAt.Int64(), 0),
    }, nil
}

// GetVoteStatsFromBlockchain 从区块链获取投票统计
func (vs *VerificationService) GetVoteStatsFromBlockchain(eventID uint64) (*VoteStatsData, error) {
    totalVotes, activeVotes, revokedVotes, err := vs.voteContract.GetEventStats(
        nil,
        big.NewInt(int64(eventID)),
    )
    if err != nil {
        return nil, fmt.Errorf("failed to get vote stats from blockchain: %w", err)
    }
    
    return &VoteStatsData{
        TotalVotes:   totalVotes.Uint64(),
        ActiveVotes:  activeVotes.Uint64(),
        RevokedVotes: revokedVotes.Uint64(),
    }, nil
}

// GetEventVotesFromBlockchain 从区块链获取活动所有投票记录
func (vs *VerificationService) GetEventVotesFromBlockchain(eventID uint64) ([]*models.VoteRecord, error) {
    // 分页获取所有投票记录
    var allVotes []*models.VoteRecord
    offset := uint64(0)
    limit := uint64(100)
    
    for {
        voteIDs, err := vs.voteContract.GetEventVotes(
            nil,
            big.NewInt(int64(eventID)),
            big.NewInt(int64(offset)),
            big.NewInt(int64(limit)),
        )
        if err != nil {
            return nil, fmt.Errorf("failed to get event votes: %w", err)
        }
        
        if len(voteIDs) == 0 {
            break
        }
        
        // 批量获取投票记录详情
        votes, err := vs.voteContract.BatchGetVoteRecords(nil, voteIDs)
        if err != nil {
            return nil, fmt.Errorf("failed to batch get vote records: %w", err)
        }
        
        for _, vote := range votes {
            allVotes = append(allVotes, &models.VoteRecord{
                VoteID:     vote.VoteId.Uint64(),
                EventID:    vote.EventId.Uint64(),
                ProjectID:  vote.ProjectId.Uint64(),
                Voter:      vote.Voter.Hex(),
                Score:      vote.Score,
                Timestamp:  time.Unix(vote.Timestamp.Int64(), 0),
                IsActive:   vote.IsActive,
                IsRevoked:  vote.IsRevoked,
                RevokeTime: time.Unix(vote.RevokeTime.Int64(), 0),
            })
        }
        
        offset += limit
        
        // 如果返回的记录少于 limit，说明已经获取完所有记录
        if uint64(len(voteIDs)) < limit {
            break
        }
    }
    
    return allVotes, nil
}
```


### 6.4 数据对比逻辑

```go
// compareEventInfo 对比活动信息
func (h *VerificationHandler) compareEventInfo(dbEvent, blockchainEvent *models.Event) (bool, []string) {
    var discrepancies []string
    isMatch := true
    
    // 对比活动名称
    if dbEvent.EventName != blockchainEvent.EventName {
        discrepancies = append(discrepancies, fmt.Sprintf(
            "Event name mismatch: DB='%s', Blockchain='%s'",
            dbEvent.EventName,
            blockchainEvent.EventName,
        ))
        isMatch = false
    }
    
    // 对比活动描述
    if dbEvent.Description != blockchainEvent.Description {
        discrepancies = append(discrepancies, fmt.Sprintf(
            "Description mismatch: DB='%s', Blockchain='%s'",
            dbEvent.Description,
            blockchainEvent.Description,
        ))
        isMatch = false
    }
    
    // 对比开始时间
    if dbEvent.StartTime.Unix() != blockchainEvent.StartTime.Unix() {
        discrepancies = append(discrepancies, fmt.Sprintf(
            "Start time mismatch: DB='%s', Blockchain='%s'",
            dbEvent.StartTime.Format(time.RFC3339),
            blockchainEvent.StartTime.Format(time.RFC3339),
        ))
        isMatch = false
    }
    
    // 对比结束时间
    if dbEvent.EndTime.Unix() != blockchainEvent.EndTime.Unix() {
        discrepancies = append(discrepancies, fmt.Sprintf(
            "End time mismatch: DB='%s', Blockchain='%s'",
            dbEvent.EndTime.Format(time.RFC3339),
            blockchainEvent.EndTime.Format(time.RFC3339),
        ))
        isMatch = false
    }
    
    // 对比活动地点
    if dbEvent.Location != blockchainEvent.Location {
        discrepancies = append(discrepancies, fmt.Sprintf(
            "Location mismatch: DB='%s', Blockchain='%s'",
            dbEvent.Location,
            blockchainEvent.Location,
        ))
        isMatch = false
    }
    
    // 对比主办方地址（转换为小写比较）
    if strings.ToLower(dbEvent.Organizer) != strings.ToLower(blockchainEvent.Organizer) {
        discrepancies = append(discrepancies, fmt.Sprintf(
            "Organizer mismatch: DB='%s', Blockchain='%s'",
            dbEvent.Organizer,
            blockchainEvent.Organizer,
        ))
        isMatch = false
    }
    
    // 对比删除状态
    if dbEvent.IsDeleted != blockchainEvent.IsDeleted {
        discrepancies = append(discrepancies, fmt.Sprintf(
            "Delete status mismatch: DB=%v, Blockchain=%v",
            dbEvent.IsDeleted,
            blockchainEvent.IsDeleted,
        ))
        isMatch = false
    }
    
    return isMatch, discrepancies
}

// verifyVoteRecords 验证投票记录
func (h *VerificationHandler) verifyVoteRecords(eventID uint64) (bool, []string, *VoteStatsComparison, error) {
    var discrepancies []string
    
    // 1. 从数据库获取投票统计
    dbStats, err := h.voteService.GetVoteStatsByEventID(eventID)
    if err != nil {
        return false, nil, nil, fmt.Errorf("failed to get vote stats from database: %w", err)
    }
    
    // 2. 从区块链获取投票统计
    blockchainStats, err := h.blockchainService.GetVoteStatsFromBlockchain(eventID)
    if err != nil {
        return false, nil, nil, fmt.Errorf("failed to get vote stats from blockchain: %w", err)
    }
    
    // 3. 对比投票统计
    isMatch := true
    
    if dbStats.TotalVotes != blockchainStats.TotalVotes {
        discrepancies = append(discrepancies, fmt.Sprintf(
            "Total votes mismatch: DB=%d, Blockchain=%d",
            dbStats.TotalVotes,
            blockchainStats.TotalVotes,
        ))
        isMatch = false
    }
    
    if dbStats.ActiveVotes != blockchainStats.ActiveVotes {
        discrepancies = append(discrepancies, fmt.Sprintf(
            "Active votes mismatch: DB=%d, Blockchain=%d",
            dbStats.ActiveVotes,
            blockchainStats.ActiveVotes,
        ))
        isMatch = false
    }
    
    if dbStats.RevokedVotes != blockchainStats.RevokedVotes {
        discrepancies = append(discrepancies, fmt.Sprintf(
            "Revoked votes mismatch: DB=%d, Blockchain=%d",
            dbStats.RevokedVotes,
            blockchainStats.RevokedVotes,
        ))
        isMatch = false
    }
    
    // 4. 构建对比结果
    comparison := &VoteStatsComparison{
        DatabaseData:   dbStats,
        BlockchainData: blockchainStats,
        IsMatch:        isMatch,
    }
    
    return isMatch, discrepancies, comparison, nil
}

// getEventTransactionHashes 获取活动相关的所有交易哈希
func (h *VerificationHandler) getEventTransactionHashes(eventID uint64) []string {
    var txHashes []string
    
    // 从数据库获取活动相关的交易记录
    // 包括：创建、编辑、删除操作的交易哈希
    eventTxs, err := h.eventService.GetEventTransactions(eventID)
    if err == nil {
        for _, tx := range eventTxs {
            if tx.TransactionHash != "" {
                txHashes = append(txHashes, tx.TransactionHash)
            }
        }
    }
    
    // 获取投票相关的交易哈希
    voteTxs, err := h.voteService.GetVoteTransactions(eventID)
    if err == nil {
        for _, tx := range voteTxs {
            if tx.TransactionHash != "" {
                txHashes = append(txHashes, tx.TransactionHash)
            }
        }
    }
    
    return txHashes
}
```


## 7. 前端集成

### 7.1 React 组件（活动中验证）

```tsx
// components/EventVerification.tsx
import React, { useState } from 'react';
import { Button, Card, Spin, Alert, Descriptions, Tag, Modal } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { verifyEventInfo } from '../services/verificationService';

interface EventVerificationProps {
  eventId: number;
  showVoteVerification?: boolean;
}

export const EventVerification: React.FC<EventVerificationProps> = ({
  eventId,
  showVoteVerification = true,
}) => {
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleVerify = async () => {
    setLoading(true);
    try {
      const result = await verifyEventInfo(eventId, showVoteVerification);
      setVerificationResult(result);
    } catch (error: any) {
      console.error('验证失败:', error);
      Modal.error({
        title: '验证失败',
        content: error.message || '无法完成验证，请稍后重试',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderVerificationStatus = () => {
    if (!verificationResult) return null;

    const { eventInfoMatch, voteRecordsMatch, discrepancies } = verificationResult;
    const allMatch = eventInfoMatch && voteRecordsMatch;

    return (
      <Card className="verification-result">
        <div className="verification-summary">
          {allMatch ? (
            <Alert
              message="验证通过"
              description="活动信息与区块链记录完全一致"
              type="success"
              icon={<CheckCircleOutlined />}
              showIcon
            />
          ) : (
            <Alert
              message="验证失败"
              description="发现数据不一致，请查看详细信息"
              type="error"
              icon={<CloseCircleOutlined />}
              showIcon
            />
          )}
        </div>

        <Descriptions title="验证详情" bordered column={2} style={{ marginTop: 20 }}>
          <Descriptions.Item label="活动信息">
            {eventInfoMatch ? (
              <Tag color="success">一致</Tag>
            ) : (
              <Tag color="error">不一致</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="投票记录">
            {voteRecordsMatch ? (
              <Tag color="success">一致</Tag>
            ) : (
              <Tag color="error">不一致</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="验证时间" span={2}>
            {new Date(verificationResult.verificationTime * 1000).toLocaleString()}
          </Descriptions.Item>
        </Descriptions>

        {discrepancies && discrepancies.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <h4>不一致项：</h4>
            <ul>
              {discrepancies.map((item: string, index: number) => (
                <li key={index} style={{ color: 'red' }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Button
          type="link"
          onClick={() => setShowDetails(true)}
          style={{ marginTop: 10 }}
        >
          查看详细对比数据
        </Button>

        {verificationResult.transactionHashes && verificationResult.transactionHashes.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <h4>相关交易哈希：</h4>
            <ul>
              {verificationResult.transactionHashes.map((hash: string, index: number) => (
                <li key={index}>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {hash}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    );
  };

  const renderDetailModal = () => {
    if (!verificationResult) return null;

    return (
      <Modal
        title="详细对比数据"
        open={showDetails}
        onCancel={() => setShowDetails(false)}
        footer={null}
        width={800}
      >
        <Descriptions title="活动信息对比" bordered column={1}>
          <Descriptions.Item label="活动名称">
            <div>
              <div>数据库: {verificationResult.eventInfo?.databaseData?.eventName}</div>
              <div>区块链: {verificationResult.eventInfo?.blockchainData?.eventName}</div>
            </div>
          </Descriptions.Item>
          <Descriptions.Item label="活动描述">
            <div>
              <div>数据库: {verificationResult.eventInfo?.databaseData?.description}</div>
              <div>区块链: {verificationResult.eventInfo?.blockchainData?.description}</div>
            </div>
          </Descriptions.Item>
          <Descriptions.Item label="开始时间">
            <div>
              <div>数据库: {new Date(verificationResult.eventInfo?.databaseData?.startTime * 1000).toLocaleString()}</div>
              <div>区块链: {new Date(verificationResult.eventInfo?.blockchainData?.startTime * 1000).toLocaleString()}</div>
            </div>
          </Descriptions.Item>
          <Descriptions.Item label="结束时间">
            <div>
              <div>数据库: {new Date(verificationResult.eventInfo?.databaseData?.endTime * 1000).toLocaleString()}</div>
              <div>区块链: {new Date(verificationResult.eventInfo?.blockchainData?.endTime * 1000).toLocaleString()}</div>
            </div>
          </Descriptions.Item>
          <Descriptions.Item label="活动地点">
            <div>
              <div>数据库: {verificationResult.eventInfo?.databaseData?.location}</div>
              <div>区块链: {verificationResult.eventInfo?.blockchainData?.location}</div>
            </div>
          </Descriptions.Item>
        </Descriptions>

        {verificationResult.voteStats && (
          <Descriptions title="投票统计对比" bordered column={1} style={{ marginTop: 20 }}>
            <Descriptions.Item label="总投票数">
              <div>
                <div>数据库: {verificationResult.voteStats?.databaseData?.totalVotes}</div>
                <div>区块链: {verificationResult.voteStats?.blockchainData?.totalVotes}</div>
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="有效投票数">
              <div>
                <div>数据库: {verificationResult.voteStats?.databaseData?.activeVotes}</div>
                <div>区块链: {verificationResult.voteStats?.blockchainData?.activeVotes}</div>
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="已撤销投票数">
              <div>
                <div>数据库: {verificationResult.voteStats?.databaseData?.revokedVotes}</div>
                <div>区块链: {verificationResult.voteStats?.blockchainData?.revokedVotes}</div>
              </div>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    );
  };

  return (
    <div className="event-verification-container">
      <Card
        title={
          <span>
            <InfoCircleOutlined style={{ marginRight: 8 }} />
            活动信息真实性验证
          </span>
        }
      >
        <p>
          点击下方按钮验证活动信息的真实性。系统将对比数据库和区块链上的数据，确保信息的一致性和可信度。
        </p>
        <Button
          type="primary"
          size="large"
          loading={loading}
          onClick={handleVerify}
          icon={<CheckCircleOutlined />}
        >
          {loading ? '验证中...' : '开始验证'}
        </Button>
      </Card>

      {loading && (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Spin size="large" tip="正在验证活动信息..." />
        </div>
      )}

      {renderVerificationStatus()}
      {renderDetailModal()}
    </div>
  );
};
```


### 7.2 React 组件（活动后验证 - 游客可用）

```tsx
// components/PastEventVerification.tsx
import React, { useState, useEffect } from 'react';
import { Card, Button, List, Tag, Modal, Spin } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, SearchOutlined } from '@ant-design/icons';
import { getEventVerificationStatus } from '../services/verificationService';

interface PastEventVerificationProps {
  eventId: number;
  eventName: string;
}

export const PastEventVerification: React.FC<PastEventVerificationProps> = ({
  eventId,
  eventName,
}) => {
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleVerify = async () => {
    setLoading(true);
    setModalVisible(true);
    try {
      const result = await getEventVerificationStatus(eventId);
      setVerificationResult(result);
    } catch (error: any) {
      console.error('验证失败:', error);
      Modal.error({
        title: '验证失败',
        content: error.message || '无法完成验证，请稍后重试',
      });
      setModalVisible(false);
    } finally {
      setLoading(false);
    }
  };

  const renderVerificationModal = () => {
    if (!verificationResult) return null;

    const { eventInfoMatch, voteRecordsMatch, discrepancies } = verificationResult;
    const allMatch = eventInfoMatch && voteRecordsMatch;

    return (
      <Modal
        title={`${eventName} - 验证结果`}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        <div className="verification-modal-content">
          <div className="verification-status">
            {allMatch ? (
              <div className="status-success">
                <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />
                <h3>验证通过</h3>
                <p>活动信息与区块链记录完全一致</p>
              </div>
            ) : (
              <div className="status-error">
                <CloseCircleOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />
                <h3>验证失败</h3>
                <p>发现数据不一致</p>
              </div>
            )}
          </div>

          <List
            header={<div><strong>验证项目</strong></div>}
            bordered
            dataSource={[
              {
                label: '活动基本信息',
                status: eventInfoMatch,
              },
              {
                label: '投票记录',
                status: voteRecordsMatch,
              },
            ]}
            renderItem={(item) => (
              <List.Item>
                <span>{item.label}</span>
                {item.status ? (
                  <Tag color="success">一致</Tag>
                ) : (
                  <Tag color="error">不一致</Tag>
                )}
              </List.Item>
            )}
          />

          {discrepancies && discrepancies.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h4>不一致项详情：</h4>
              <List
                size="small"
                bordered
                dataSource={discrepancies}
                renderItem={(item: string) => (
                  <List.Item style={{ color: 'red' }}>{item}</List.Item>
                )}
              />
            </div>
          )}

          <div style={{ marginTop: 20 }}>
            <p><strong>验证时间：</strong>{new Date(verificationResult.verificationTime * 1000).toLocaleString()}</p>
          </div>

          {verificationResult.transactionHashes && verificationResult.transactionHashes.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h4>区块链交易记录：</h4>
              <List
                size="small"
                bordered
                dataSource={verificationResult.transactionHashes}
                renderItem={(hash: string) => (
                  <List.Item>
                    <a
                      href={`https://sepolia.etherscan.io/tx/${hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {hash}
                    </a>
                  </List.Item>
                )}
              />
            </div>
          )}
        </div>
      </Modal>
    );
  };

  return (
    <>
      <Button
        type="default"
        icon={<SearchOutlined />}
        onClick={handleVerify}
        loading={loading}
      >
        验证活动信息
      </Button>
      {renderVerificationModal()}
    </>
  );
};
```

### 7.3 API 服务

```typescript
// services/verificationService.ts
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';

export interface VerificationRequest {
  event_id: number;
  verify_votes: boolean;
}

export interface VerificationResponse {
  success: boolean;
  event_id: number;
  event_info_match: boolean;
  vote_records_match: boolean;
  verification_time: number;
  discrepancies?: string[];
  event_info?: any;
  vote_stats?: any;
  transaction_hashes?: string[];
}

// 验证活动信息（活动中）
export const verifyEventInfo = async (
  eventId: number,
  verifyVotes: boolean = true
): Promise<VerificationResponse> => {
  const response = await axios.post(`${API_BASE_URL}/verification/event`, {
    event_id: eventId,
    verify_votes: verifyVotes,
  });
  return response.data;
};

// 获取活动验证状态（活动后，游客可用）
export const getEventVerificationStatus = async (
  eventId: number
): Promise<VerificationResponse> => {
  const response = await axios.get(`${API_BASE_URL}/verification/event/${eventId}`);
  return response.data;
};
```


## 8. 部署和测试

### 8.1 合约部署说明

由于验证功能主要使用现有的 EventInfoContract 和 VoteContract 的查询接口，不需要部署新的智能合约。确保以下合约已正确部署：

1. **EventInfoContract**: 活动信息合约
2. **VoteContract**: 投票信息合约

### 8.2 配置文件

```yaml
# config.yaml
blockchain:
  rpc_endpoint: "https://sepolia.infura.io/v3/YOUR_PROJECT_ID"
  chain_id: 11155111
  event_info_contract_address: "0x..." # EventInfoContract 地址
  vote_contract_address: "0x..."       # VoteContract 地址
  
verification:
  enable_cache: true
  cache_ttl: 300 # 缓存时间（秒）
  max_vote_records_per_query: 100
```

### 8.3 测试用例

#### 8.3.1 后端单元测试

```go
// verification_test.go
package handlers

import (
    "testing"
    "github.com/stretchr/testify/assert"
)

func TestCompareEventInfo(t *testing.T) {
    handler := &VerificationHandler{}
    
    // 测试数据一致的情况
    dbEvent := &models.Event{
        EventID:     1,
        EventName:   "Test Hackathon",
        Description: "Test Description",
        StartTime:   time.Now(),
        EndTime:     time.Now().Add(24 * time.Hour),
        Location:    "Test Location",
        Organizer:   "0x1234567890123456789012345678901234567890",
        IsDeleted:   false,
    }
    
    blockchainEvent := &models.Event{
        EventID:     1,
        EventName:   "Test Hackathon",
        Description: "Test Description",
        StartTime:   dbEvent.StartTime,
        EndTime:     dbEvent.EndTime,
        Location:    "Test Location",
        Organizer:   "0x1234567890123456789012345678901234567890",
        IsDeleted:   false,
    }
    
    isMatch, discrepancies := handler.compareEventInfo(dbEvent, blockchainEvent)
    
    assert.True(t, isMatch)
    assert.Empty(t, discrepancies)
}

func TestCompareEventInfoMismatch(t *testing.T) {
    handler := &VerificationHandler{}
    
    // 测试数据不一致的情况
    dbEvent := &models.Event{
        EventID:     1,
        EventName:   "Test Hackathon",
        Description: "Test Description",
        StartTime:   time.Now(),
        EndTime:     time.Now().Add(24 * time.Hour),
        Location:    "Test Location",
        Organizer:   "0x1234567890123456789012345678901234567890",
        IsDeleted:   false,
    }
    
    blockchainEvent := &models.Event{
        EventID:     1,
        EventName:   "Different Hackathon", // 不同的名称
        Description: "Test Description",
        StartTime:   dbEvent.StartTime,
        EndTime:     dbEvent.EndTime,
        Location:    "Test Location",
        Organizer:   "0x1234567890123456789012345678901234567890",
        IsDeleted:   false,
    }
    
    isMatch, discrepancies := handler.compareEventInfo(dbEvent, blockchainEvent)
    
    assert.False(t, isMatch)
    assert.NotEmpty(t, discrepancies)
    assert.Contains(t, discrepancies[0], "Event name mismatch")
}

func TestVerifyVoteRecords(t *testing.T) {
    handler := &VerificationHandler{
        voteService:       mockVoteService,
        blockchainService: mockBlockchainService,
    }
    
    eventID := uint64(1)
    
    isMatch, discrepancies, comparison, err := handler.verifyVoteRecords(eventID)
    
    assert.NoError(t, err)
    assert.True(t, isMatch)
    assert.Empty(t, discrepancies)
    assert.NotNil(t, comparison)
}
```

#### 8.3.2 前端集成测试

```typescript
// EventVerification.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EventVerification } from './EventVerification';
import * as verificationService from '../services/verificationService';

jest.mock('../services/verificationService');

describe('EventVerification', () => {
  it('should render verification button', () => {
    render(<EventVerification eventId={1} />);
    expect(screen.getByText('开始验证')).toBeInTheDocument();
  });

  it('should show success result when verification passes', async () => {
    const mockResult = {
      success: true,
      event_id: 1,
      event_info_match: true,
      vote_records_match: true,
      verification_time: Date.now() / 1000,
      discrepancies: [],
    };

    (verificationService.verifyEventInfo as jest.Mock).mockResolvedValue(mockResult);

    render(<EventVerification eventId={1} />);
    
    fireEvent.click(screen.getByText('开始验证'));

    await waitFor(() => {
      expect(screen.getByText('验证通过')).toBeInTheDocument();
    });
  });

  it('should show error result when verification fails', async () => {
    const mockResult = {
      success: true,
      event_id: 1,
      event_info_match: false,
      vote_records_match: true,
      verification_time: Date.now() / 1000,
      discrepancies: ['Event name mismatch'],
    };

    (verificationService.verifyEventInfo as jest.Mock).mockResolvedValue(mockResult);

    render(<EventVerification eventId={1} />);
    
    fireEvent.click(screen.getByText('开始验证'));

    await waitFor(() => {
      expect(screen.getByText('验证失败')).toBeInTheDocument();
      expect(screen.getByText('Event name mismatch')).toBeInTheDocument();
    });
  });
});
```


## 9. 错误处理和异常情况

### 9.1 常见错误类型

```go
type VerificationError struct {
    Code    int    `json:"code"`
    Message string `json:"message"`
    Details string `json:"details,omitempty"`
}

const (
    ErrorCodeEventNotFound           = 2001
    ErrorCodeBlockchainConnectionFailed = 2002
    ErrorCodeDataMismatch            = 2003
    ErrorCodeInvalidEventID          = 2004
    ErrorCodeContractCallFailed      = 2005
    ErrorCodeDatabaseError           = 2006
)

func (e VerificationError) Error() string {
    return e.Message
}
```

### 9.2 错误处理策略

1. **活动不存在**：返回明确的错误信息，提示用户检查活动 ID
2. **区块链连接失败**：记录详细错误日志，提供重试机制
3. **数据不一致**：详细列出所有不一致项，提供对比数据
4. **合约调用失败**：记录错误信息，提示用户稍后重试
5. **网络连接问题**：实现重试机制，最大重试次数为 3 次

### 9.3 异常场景处理

```go
// handleVerificationError 处理验证错误
func (h *VerificationHandler) handleVerificationError(c *gin.Context, err error, eventID uint64) {
    var verificationErr VerificationError
    
    switch {
    case errors.Is(err, gorm.ErrRecordNotFound):
        verificationErr = VerificationError{
            Code:    ErrorCodeEventNotFound,
            Message: "Event not found",
            Details: fmt.Sprintf("Event ID %d does not exist in database", eventID),
        }
        c.JSON(http.StatusNotFound, verificationErr)
        
    case strings.Contains(err.Error(), "connection refused"):
        verificationErr = VerificationError{
            Code:    ErrorCodeBlockchainConnectionFailed,
            Message: "Failed to connect to blockchain",
            Details: "Please check blockchain network status and try again",
        }
        c.JSON(http.StatusServiceUnavailable, verificationErr)
        
    case strings.Contains(err.Error(), "contract call failed"):
        verificationErr = VerificationError{
            Code:    ErrorCodeContractCallFailed,
            Message: "Failed to call smart contract",
            Details: err.Error(),
        }
        c.JSON(http.StatusInternalServerError, verificationErr)
        
    default:
        verificationErr = VerificationError{
            Code:    ErrorCodeDatabaseError,
            Message: "Internal server error",
            Details: err.Error(),
        }
        c.JSON(http.StatusInternalServerError, verificationErr)
    }
    
    // 记录错误日志
    h.logger.WithFields(logrus.Fields{
        "event_id": eventID,
        "error":    err.Error(),
        "code":     verificationErr.Code,
    }).Error("Verification failed")
}
```

## 10. 性能优化

### 10.1 缓存策略
- **Redis 缓存验证结果**：对于已验证的活动，缓存验证结果 5 分钟
- **缓存键设计**：`verification:event:{eventId}:votes:{includeVotes}`
- **缓存失效策略**：活动信息更新或投票记录变更时清除缓存

```go
// getCachedVerificationResult 获取缓存的验证结果
func (h *VerificationHandler) getCachedVerificationResult(eventID uint64, includeVotes bool) (*VerificationResponse, error) {
    cacheKey := fmt.Sprintf("verification:event:%d:votes:%v", eventID, includeVotes)
    
    var result VerificationResponse
    err := h.cache.Get(cacheKey, &result)
    if err != nil {
        return nil, err
    }
    
    return &result, nil
}

// setCachedVerificationResult 设置缓存的验证结果
func (h *VerificationHandler) setCachedVerificationResult(eventID uint64, includeVotes bool, result *VerificationResponse) error {
    cacheKey := fmt.Sprintf("verification:event:%d:votes:%v", eventID, includeVotes)
    return h.cache.Set(cacheKey, result, 5*time.Minute)
}
```

### 10.2 批量操作
- **批量获取投票记录**：使用 `batchGetVoteRecords` 减少合约调用次数
- **分页查询**：对于大量投票记录，使用分页查询避免超时

### 10.3 异步处理
- **异步验证**：对于大型活动，提供异步验证选项
- **进度通知**：通过 WebSocket 实时推送验证进度

```go
// asyncVerifyEventInfo 异步验证活动信息
func (h *VerificationHandler) asyncVerifyEventInfo(eventID uint64, includeVotes bool) {
    go func() {
        // 执行验证逻辑
        result, err := h.performVerification(eventID, includeVotes)
        if err != nil {
            h.logger.WithFields(logrus.Fields{
                "event_id": eventID,
                "error":    err.Error(),
            }).Error("Async verification failed")
            return
        }
        
        // 缓存结果
        h.setCachedVerificationResult(eventID, includeVotes, result)
        
        // 通过 WebSocket 推送结果
        h.websocketService.PushVerificationResult(eventID, result)
    }()
}
```


## 11. 监控和日志

### 11.1 关键指标监控
- 验证成功率
- 平均验证时间
- 数据不一致率
- 区块链查询失败率
- 缓存命中率

### 11.2 日志记录

```go
func (h *VerificationHandler) logVerificationAttempt(
    eventID uint64,
    success bool,
    eventInfoMatch bool,
    voteRecordsMatch bool,
    duration time.Duration,
    err error,
) {
    logFields := logrus.Fields{
        "event_id":          eventID,
        "success":           success,
        "event_info_match":  eventInfoMatch,
        "vote_records_match": voteRecordsMatch,
        "duration_ms":       duration.Milliseconds(),
        "timestamp":         time.Now().Unix(),
    }
    
    if err != nil {
        logFields["error"] = err.Error()
    }
    
    if success {
        if eventInfoMatch && voteRecordsMatch {
            h.logger.WithFields(logFields).Info("Verification completed: all data matches")
        } else {
            h.logger.WithFields(logFields).Warn("Verification completed: data mismatch detected")
        }
    } else {
        h.logger.WithFields(logFields).Error("Verification failed")
    }
}
```

### 11.3 监控指标收集

```go
// Prometheus metrics
var (
    verificationTotal = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "verification_total",
            Help: "Total number of verification attempts",
        },
        []string{"status"},
    )
    
    verificationDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "verification_duration_seconds",
            Help:    "Duration of verification operations",
            Buckets: prometheus.DefBuckets,
        },
        []string{"operation"},
    )
    
    dataMismatchTotal = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "data_mismatch_total",
            Help: "Total number of data mismatches detected",
        },
        []string{"type"},
    )
)

// recordVerificationMetrics 记录验证指标
func (h *VerificationHandler) recordVerificationMetrics(
    success bool,
    eventInfoMatch bool,
    voteRecordsMatch bool,
    duration time.Duration,
) {
    if success {
        verificationTotal.WithLabelValues("success").Inc()
    } else {
        verificationTotal.WithLabelValues("failure").Inc()
    }
    
    verificationDuration.WithLabelValues("total").Observe(duration.Seconds())
    
    if !eventInfoMatch {
        dataMismatchTotal.WithLabelValues("event_info").Inc()
    }
    
    if !voteRecordsMatch {
        dataMismatchTotal.WithLabelValues("vote_records").Inc()
    }
}
```

## 12. 安全考虑

### 12.1 权限控制
- **活动中验证**：只有参赛者可以验证当前活动信息
- **活动后验证**：任何用户（包括游客）都可以验证过往活动信息
- **数据访问控制**：确保只返回必要的验证信息，不泄露敏感数据

### 12.2 防重放攻击
- **验证请求限流**：每个 IP 地址每分钟最多 10 次验证请求
- **验证结果缓存**：避免重复验证相同活动

```go
// rateLimitMiddleware 验证请求限流中间件
func rateLimitMiddleware() gin.HandlerFunc {
    limiter := rate.NewLimiter(rate.Every(time.Minute/10), 10)
    
    return func(c *gin.Context) {
        if !limiter.Allow() {
            c.JSON(http.StatusTooManyRequests, gin.H{
                "error": "Too many verification requests, please try again later",
            })
            c.Abort()
            return
        }
        c.Next()
    }
}
```

### 12.3 数据隐私
- **敏感信息脱敏**：在验证结果中不显示完整的钱包地址
- **最小化数据收集**：只收集验证所需的最少数据
- **数据加密传输**：使用 HTTPS 加密传输验证数据

## 13. 用户体验优化

### 13.1 加载状态提示
- 显示验证进度条
- 提供预估验证时间
- 实时更新验证状态

### 13.2 错误提示优化
- 提供清晰的错误信息
- 给出具体的解决建议
- 支持一键重试功能

### 13.3 验证结果展示
- 使用可视化图表展示对比结果
- 提供详细的不一致项说明
- 支持导出验证报告

```tsx
// 验证结果可视化组件
const VerificationResultChart: React.FC<{ result: VerificationResponse }> = ({ result }) => {
  const data = [
    { name: '活动信息', value: result.event_info_match ? 100 : 0 },
    { name: '投票记录', value: result.vote_records_match ? 100 : 0 },
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="value" fill="#52c41a" />
      </BarChart>
    </ResponsiveContainer>
  );
};
```


## 14. 业务流程

### 14.1 活动中验证流程

```
参赛者登录 Arena 平台
    ↓
进入当前活动页面
    ↓
点击"验证活动信息"按钮
    ↓
系统检查用户权限（是否为参赛者）
    ↓
[权限验证失败] → 提示错误 → 结束
    ↓
[权限验证通过]
    ↓
显示验证选项（是否包含投票记录）
    ↓
用户确认验证选项
    ↓
系统从数据库获取活动信息
    ↓
系统从区块链获取活动信息
    ↓
对比活动基本信息（名称、描述、时间、地点等）
    ↓
[如果选择验证投票记录]
    ↓
系统从数据库获取投票统计
    ↓
系统从区块链获取投票统计
    ↓
对比投票统计数据
    ↓
生成验证报告
    ↓
显示验证结果：
    - 活动信息：一致/不一致
    - 投票记录：一致/不一致
    - 不一致项列表
    - 链上交易哈希列表
    ↓
用户可查看详细对比数据
    ↓
用户可导出验证报告
```

### 14.2 活动后验证流程（游客可用）

```
用户（游客/参赛者）进入 Arena 平台
    ↓
浏览过往活动列表
    ↓
选择要验证的活动
    ↓
点击"验证活动信息"按钮
    ↓
系统从数据库获取活动信息
    ↓
系统从区块链获取活动信息
    ↓
对比活动基本信息
    ↓
系统从数据库获取投票统计
    ↓
系统从区块链获取投票统计
    ↓
对比投票统计数据
    ↓
生成验证报告
    ↓
弹出验证结果模态框：
    - 验证状态（通过/失败）
    - 活动信息验证结果
    - 投票记录验证结果
    - 不一致项详情
    - 区块链交易记录链接
    ↓
用户可查看详细信息
    ↓
用户可分享验证结果
```

## 15. 接口文档

### 15.1 验证活动信息接口

**接口地址**: `POST /api/v1/verification/event`

**请求参数**:
```json
{
  "event_id": 1,
  "verify_votes": true
}
```

**响应示例（成功）**:
```json
{
  "success": true,
  "event_id": 1,
  "event_info_match": true,
  "vote_records_match": true,
  "verification_time": 1704067200,
  "discrepancies": [],
  "event_info": {
    "database_data": {
      "event_id": 1,
      "event_name": "Hackathon 2024",
      "description": "Annual hackathon event",
      "start_time": 1704067200,
      "end_time": 1704153600,
      "location": "San Francisco",
      "organizer": "0x1234567890123456789012345678901234567890",
      "is_deleted": false,
      "created_at": 1704000000,
      "updated_at": 1704000000
    },
    "blockchain_data": {
      "event_id": 1,
      "event_name": "Hackathon 2024",
      "description": "Annual hackathon event",
      "start_time": 1704067200,
      "end_time": 1704153600,
      "location": "San Francisco",
      "organizer": "0x1234567890123456789012345678901234567890",
      "is_deleted": false,
      "created_at": 1704000000,
      "updated_at": 1704000000
    },
    "is_match": true
  },
  "vote_stats": {
    "database_data": {
      "total_votes": 100,
      "active_votes": 95,
      "revoked_votes": 5
    },
    "blockchain_data": {
      "total_votes": 100,
      "active_votes": 95,
      "revoked_votes": 5
    },
    "is_match": true
  },
  "transaction_hashes": [
    "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
  ]
}
```

**响应示例（数据不一致）**:
```json
{
  "success": true,
  "event_id": 1,
  "event_info_match": false,
  "vote_records_match": true,
  "verification_time": 1704067200,
  "discrepancies": [
    "Event name mismatch: DB='Hackathon 2024', Blockchain='Hackathon 2023'",
    "Location mismatch: DB='San Francisco', Blockchain='New York'"
  ],
  "event_info": {
    "database_data": {
      "event_name": "Hackathon 2024",
      "location": "San Francisco"
    },
    "blockchain_data": {
      "event_name": "Hackathon 2023",
      "location": "New York"
    },
    "is_match": false
  },
  "transaction_hashes": [
    "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
  ]
}
```

### 15.2 获取活动验证状态接口（活动后）

**接口地址**: `GET /api/v1/verification/event/{event_id}`

**路径参数**:
- `event_id`: 活动 ID

**响应示例**: 与 15.1 相同

## 16. 数据库设计

### 16.1 验证记录表（可选）

如果需要记录验证历史，可以创建以下表：

```sql
CREATE TABLE verification_records (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_id BIGINT NOT NULL,
    verifier_address VARCHAR(42),
    event_info_match BOOLEAN NOT NULL,
    vote_records_match BOOLEAN NOT NULL,
    discrepancies TEXT,
    verification_time TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_event_id (event_id),
    INDEX idx_verification_time (verification_time)
);
```

### 16.2 Go 模型定义

```go
type VerificationRecord struct {
    ID                uint64    `json:"id" gorm:"primaryKey;autoIncrement"`
    EventID           uint64    `json:"event_id" gorm:"column:event_id;index"`
    VerifierAddress   string    `json:"verifier_address" gorm:"column:verifier_address"`
    EventInfoMatch    bool      `json:"event_info_match" gorm:"column:event_info_match"`
    VoteRecordsMatch  bool      `json:"vote_records_match" gorm:"column:vote_records_match"`
    Discrepancies     string    `json:"discrepancies" gorm:"column:discrepancies;type:text"`
    VerificationTime  time.Time `json:"verification_time" gorm:"column:verification_time;index"`
    CreatedAt         time.Time `json:"created_at" gorm:"column:created_at"`
}

func (VerificationRecord) TableName() string {
    return "verification_records"
}
```


## 17. 部署清单

### 17.1 前置条件
- ✅ EventInfoContract 已部署并正常运行
- ✅ VoteContract 已部署并正常运行
- ✅ 后端服务已配置区块链连接
- ✅ 数据库已创建相关表结构
- ✅ Redis 缓存服务已启动

### 17.2 配置检查清单
- [ ] 区块链 RPC 端点配置正确
- [ ] EventInfoContract 地址配置正确
- [ ] VoteContract 地址配置正确
- [ ] 数据库连接配置正确
- [ ] Redis 连接配置正确
- [ ] API 路由配置正确
- [ ] 前端环境变量配置正确

### 17.3 功能测试清单
- [ ] 活动信息验证功能正常
- [ ] 投票记录验证功能正常
- [ ] 数据一致性对比正确
- [ ] 不一致项检测准确
- [ ] 交易哈希显示正确
- [ ] 错误处理机制有效
- [ ] 缓存机制工作正常
- [ ] 限流机制生效
- [ ] 日志记录完整
- [ ] 监控指标正常

### 17.4 性能测试清单
- [ ] 单次验证响应时间 < 5 秒
- [ ] 并发验证支持 100+ 用户
- [ ] 缓存命中率 > 80%
- [ ] 区块链查询失败率 < 1%
- [ ] 数据库查询优化有效

## 18. 维护和升级

### 18.1 日常维护
- **监控检查**：每日检查验证成功率和响应时间
- **日志审查**：每周审查错误日志，识别潜在问题
- **缓存清理**：定期清理过期缓存数据
- **数据库优化**：定期优化数据库查询性能

### 18.2 升级计划
- **合约升级**：如果 EventInfoContract 或 VoteContract 升级，需要更新合约地址配置
- **API 版本管理**：保持 API 向后兼容，使用版本号管理
- **功能扩展**：根据用户反馈添加新的验证维度

### 18.3 应急预案
- **区块链网络故障**：切换到备用 RPC 端点
- **数据库故障**：启用只读模式，使用缓存数据
- **高并发场景**：启用限流和降级策略

## 19. 常见问题（FAQ）

### 19.1 为什么验证失败？
**答**：验证失败可能由以下原因导致：
1. 数据库和区块链数据不一致
2. 区块链网络连接问题
3. 合约地址配置错误
4. 数据同步延迟

**解决方案**：
- 检查区块链网络状态
- 验证合约地址配置
- 等待数据同步完成后重试

### 19.2 验证需要多长时间？
**答**：验证时间取决于以下因素：
- 活动规模（投票记录数量）
- 区块链网络状态
- 是否命中缓存

通常情况下：
- 小型活动（< 100 投票）：1-2 秒
- 中型活动（100-1000 投票）：2-5 秒
- 大型活动（> 1000 投票）：5-10 秒

### 19.3 游客可以验证活动信息吗？
**答**：是的，在过往活动列表中，任何用户（包括游客）都可以验证活动信息的真实性，无需登录。

### 19.4 验证结果可以导出吗？
**答**：是的，用户可以导出验证报告为 PDF 或 JSON 格式，包含完整的验证结果和对比数据。

### 19.5 如何确保验证结果的可信度？
**答**：验证结果的可信度由以下因素保证：
1. 区块链数据不可篡改
2. 智能合约代码开源可审计
3. 验证逻辑透明公开
4. 交易哈希可在区块链浏览器查询

## 20. 参考资料

### 20.1 相关文档
- [PRD401.md](./PRD401.md) - 第四期需求文档
- [DEV401_CheckIn.md](./DEV401_CheckIn.md) - 签到功能开发文档
- [DEV401_NFT.md](./DEV401_NFT.md) - NFT 发放功能开发文档
- [DEV401_Vote.md](./DEV401_Vote.md) - 投票功能开发文档

### 20.2 技术文档
- [Solidity 官方文档](https://docs.soliditylang.org/)
- [OpenZeppelin 合约库](https://docs.openzeppelin.com/contracts/)
- [Ethers.js 文档](https://docs.ethers.org/)
- [Go Ethereum 文档](https://geth.ethereum.org/docs/)

### 20.3 区块链浏览器
- [Sepolia Etherscan](https://sepolia.etherscan.io/)
- [Sourcify](https://sourcify.dev/)

---

**文档版本**: v1.0  
**创建日期**: 2025-01-06  
**最后更新**: 2025-01-06  
**维护人员**: 区块链开发团队
