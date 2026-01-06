# DEV401: 活动信息真实性验证功能开发文档

## 1. 文档说明

### 1.1 文档目的
本文档旨在详细描述 Hackathon 比赛平台中活动信息真实性验证功能的开发规范、技术实现和具体要求，为开发团队提供明确的技术指导和实现标准。

### 1.2 文档范围
本文档涵盖以下功能模块的开发要求：
- 活动信息真实性验证功能（活动中）
- 活动信息真实性验证功能（活动后）
- 区块链数据一致性验证
- 用户界面交互设计
- 错误处理和异常情况

### 1.3 参考文档
- PRD401: Hackathon 比赛平台 - 第四期需求文档
- prd_rules_contract.md: 合约开发规范
- 技术架构设计文档

## 2. 功能需求分析

### 2.1 活动信息真实性验证（活动中）- 3.1.3.4

#### 2.1.1 功能描述
参赛者在活动进行期间，可以通过 Arena 平台验证当前活动信息的真实性，确保数据库与区块链数据的一致性。

#### 2.1.2 用户权限
- **参赛者**：完全访问权限
- **其他角色**：不允许在活动中验证（仅活动后）

#### 2.1.3 验证范围
- 活动基本信息（名称、描述、时间、地点等）
- 投票记录（所有投票的链上记录）
- 签到记录（可选，根据业务需求）

#### 2.1.4 输入参数
- **活动ID**：字符串类型，唯一标识符
- **用户钱包地址**：通过登录状态自动获取

#### 2.1.5 输出结果
- 活动信息验证结果：一致/不一致
- 投票记录验证结果：一致/不一致
- 链上交易哈希列表
- 验证时间戳
- 不一致项目的详细对比信息

### 2.2 活动信息真实性验证（活动后）- 3.1.3.5

#### 2.2.1 功能描述
在活动结束后，任何用户（包括游客）都可以在过往活动列表中验证活动信息的真实性，提供公开透明的验证机制。

#### 2.2.2 用户权限
- **游客**：完全访问权限，无需登录
- **参赛者**：完全访问权限
- **主办方**：完全访问权限
- **赞助商**：完全访问权限

#### 2.2.3 验证范围
- 活动基本信息（名称、描述、时间、地点等）
- 投票记录（所有投票的链上记录）
- 最终排名和结果（如已上链）

#### 2.2.4 输入参数
- **活动ID**：字符串类型，唯一标识符

#### 2.2.5 输出结果
- 活动信息验证结果：一致/不一致
- 投票记录验证结果：一致/不一致
- 链上交易哈希列表
- 验证时间戳
- 公开验证报告（可分享）

## 3. 技术架构设计

### 3.1 整体架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端 (Arena)   │    │   后端 API      │    │   区块链网络     │
│                 │    │                 │    │                 │
│ - 验证界面      │◄──►│ - 数据查询API   │◄──►│ - 智能合约      │
│ - 结果展示      │    │ - 验证逻辑      │    │ - 数据存储      │
│ - 错误处理      │    │ - 数据对比      │    │ - 事件监听      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 3.2 技术栈选择

#### 3.2.1 前端技术栈
- **React 18**：主要框架
- **TypeScript**：类型安全
- **Ethers.js 6**：区块链交互
- **Ant Design**：UI组件库
- **Redux Toolkit**：状态管理

#### 3.2.2 后端技术栈
- **Go 1.21+**：后端语言
- **Gin**：Web框架
- **Ethers.js 6**：区块链交互
- **PostgreSQL**：数据库
- **Redis**：缓存

#### 3.2.3 区块链技术栈
- **Solidity ^0.8.21**：智能合约语言
- **HardHat ^2.19.0**：开发框架
- **OpenZeppelin Contracts ^5.0.0**：合约库
- **Sepolia Network**：测试网络

#### 3.2.4 网络和验证
- **Sepolia**：开发测试网络
- **Sourcify**：源码验证
- **Etherscan**：区块链浏览器

## 4. 数据设计

### 4.1 数据结构

#### 4.1.1 活动信息结构
```typescript
interface EventInfo {
  id: string;                    // 活动ID
  name: string;                  // 活动名称
  description: string;           // 活动描述
  startTime: number;             // 开始时间（时间戳）
  endTime: number;               // 结束时间（时间戳）
  location: string;              // 活动地点
  organizer: string;             // 主办方地址
  status: 'draft' | 'active' | 'ended'; // 活动状态
  transactionHash?: string;      // 链上交易哈希
}
```

#### 4.1.2 投票记录结构
```typescript
interface VoteRecord {
  id: string;                    // 投票ID
  eventId: string;               // 活动ID
  voter: string;                 // 投票者地址
  projectId: string;             // 被投票项目ID
  score: number;                 // 投票分数
  timestamp: number;             // 投票时间戳
  transactionHash: string;      // 交易哈希
  isCancelled: boolean;         // 是否已撤销
  cancelTxHash?: string;        // 撤销交易哈希
}
```

#### 4.1.3 验证结果结构
```typescript
interface VerificationResult {
  eventId: string;               // 活动ID
  eventInfoMatch: boolean;       // 活动信息是否匹配
  voteRecordsMatch: boolean;     // 投票记录是否匹配
  mismatchedFields?: string[];  // 不匹配字段列表
  blockchainTransactions: string[]; // 链上交易哈希列表
  verificationTime: number;     // 验证时间戳
  totalRecords: number;         // 总记录数
  matchedRecords: number;       // 匹配记录数
}
```

### 4.2 事件定义

#### 4.2.1 智能合约事件
```solidity
// 活动信息事件
event EventCreated(
    string indexed eventId,
    string name,
    string description,
    uint256 startTime,
    uint256 endTime,
    string location,
    address indexed organizer,
    bytes32 dataHash
);

event EventUpdated(
    string indexed eventId,
    string name,
    string description,
    uint256 startTime,
    uint256 endTime,
    string location,
    bytes32 dataHash
);

// 投票事件
event VoteCast(
    string indexed eventId,
    address indexed voter,
    string indexed projectId,
    uint256 score,
    bytes32 voteData
);

event VoteCancelled(
    string indexed eventId,
    address indexed voter,
    string indexed projectId,
    bytes32 originalVoteData
);
```

## 5. 开发规范

### 5.1 代码规范

#### 5.1.1 命名规范
- **变量名**：使用驼峰命名法（camelCase）
- **函数名**：使用动词开头的驼峰命名法
- **常量名**：使用全大写下划线分隔（UPPER_SNAKE_CASE）
- **类型名**：使用帕斯卡命名法（PascalCase）
- **文件名**：使用帕斯卡命名法，后缀明确（.tsx, .ts, .go）

#### 5.1.2 注释规范
- **函数注释**：必须包含功能描述、参数说明、返回值说明
- **复杂逻辑**：必须添加详细注释说明实现思路
- **TODO注释**：使用标准格式 `// TODO: 描述内容`
- **接口注释**：TypeScript接口必须有详细属性说明

#### 5.1.3 错误处理规范
- **异步错误**：使用 try-catch 包装所有异步操作
- **用户提示**：错误信息必须对用户友好且可操作
- **日志记录**：所有错误必须记录到日志系统
- **错误恢复**：提供重试机制和错误恢复选项

### 5.2 数据结构规范

#### 5.2.1 类型定义
```typescript
// 严格类型定义，禁止使用any
interface VerificationRequest {
  eventId: string;
  userAddress?: string; // 可选，游客模式不需要
  verificationType: 'in-progress' | 'completed';
}

interface VerificationResponse {
  success: boolean;
  data?: VerificationResult;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
```

#### 5.2.2 数据验证
- **输入验证**：所有用户输入必须进行类型和格式验证
- **空值检查**：严格检查undefined和null值
- **类型转换**：使用类型守卫进行安全的类型转换
- **边界检查**：数组索引、数值范围等必须进行边界检查

## 6. 前端实现规范

### 6.1 组件设计

#### 6.1.1 验证组件结构
```
components/
├── Verification/
│   ├── VerificationPanel.tsx      // 验证主面板
│   ├── EventSelector.tsx         // 活动选择器
│   ├── VerificationProgress.tsx   // 验证进度
│   ├── VerificationResult.tsx     // 验证结果
│   ├── TransactionList.tsx        // 交易列表
│   └── MismatchDetails.tsx        // 不匹配详情
```

#### 6.1.2 状态管理
```typescript
interface VerificationState {
  isVerifying: boolean;
  currentEvent: EventInfo | null;
  verificationResult: VerificationResult | null;
  error: string | null;
  progress: {
    stage: 'fetching-db' | 'fetching-blockchain' | 'comparing' | 'completed';
    percentage: number;
  };
}
```

### 6.2 API接口设计

#### 6.2.1 验证接口
```typescript
// POST /api/verification/verify
interface VerifyEventRequest {
  eventId: string;
  userAddress?: string; // 可选，游客模式不需要
}

interface VerifyEventResponse {
  success: boolean;
  data?: {
    verificationId: string;
    estimatedTime: number; // 预估验证时间（秒）
  };
}

// GET /api/verification/status/{verificationId}
interface VerificationStatusResponse {
  success: boolean;
  data?: {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number; // 0-100
    result?: VerificationResult;
    error?: string;
  };
}
```

#### 6.2.2 查询接口
```typescript
// GET /api/events/{eventId}/blockchain-data
interface BlockchainDataResponse {
  success: boolean;
  data?: {
    eventInfo: EventInfo;
    voteRecords: VoteRecord[];
    transactions: TransactionInfo[];
  };
}

// GET /api/events/{eventId}/database-data
interface DatabaseDataResponse {
  success: boolean;
  data?: {
    eventInfo: EventInfo;
    voteRecords: VoteRecord[];
  };
}
```

### 6.3 用户界面规范

#### 6.3.1 验证界面布局
```
┌─────────────────────────────────────────────────────┐
│ 活动信息真实性验证                                    │
├─────────────────────────────────────────────────────┤
│ [活动选择器]                           [验证按钮]    │
├─────────────────────────────────────────────────────┤
│ 验证进度: ████████░░ 80%                            │
│ 当前阶段: 对比数据...                                │
├─────────────────────────────────────────────────────┤
│ 验证结果                                            │
│ ✓ 活动信息: 一致                                    │
│ ✗ 投票记录: 不一致 (25/30 记录匹配)                 │
├─────────────────────────────────────────────────────┤
│ 详细信息                                            │
│ [查看不匹配项目] [查看交易哈希] [生成验证报告]        │
└─────────────────────────────────────────────────────┘
```

#### 6.3.2 错误状态处理
- **网络错误**：显示重试按钮和错误提示
- **数据不一致**：高亮显示不匹配的具体字段
- **权限错误**：引导用户登录或提示权限不足
- **加载状态**：显示进度条和当前操作阶段

## 7. 后端实现规范

### 7.1 服务架构

#### 7.1.1 验证服务
```go
type VerificationService struct {
    dbClient         *database.Client
    blockchainClient *blockchain.Client
    cache           *redis.Client
    logger          *logrus.Logger
}

func (s *VerificationService) VerifyEvent(ctx context.Context, req *VerifyEventRequest) (*VerifyEventResponse, error) {
    // 1. 参数验证
    if err := s.validateRequest(req); err != nil {
        return nil, err
    }
    
    // 2. 获取数据库数据
    dbData, err := s.fetchDatabaseData(ctx, req.EventId)
    if err != nil {
        return nil, err
    }
    
    // 3. 获取区块链数据
    bcData, err := s.fetchBlockchainData(ctx, req.EventId)
    if err != nil {
        return nil, err
    }
    
    // 4. 数据对比
    result := s.compareData(dbData, bcData)
    
    // 5. 记录验证结果
    if err := s.recordVerification(ctx, req.EventId, result); err != nil {
        s.logger.Warn("Failed to record verification", err)
    }
    
    return &VerifyEventResponse{
        Result: result,
    }, nil
}
```

#### 7.1.2 区块链数据获取
```go
type BlockchainClient struct {
    client  *ethclient.Client
    contract *contracts.EventContract
}

func (c *BlockchainClient) GetEventData(ctx context.Context, eventId string) (*BlockchainEventData, error) {
    // 1. 获取事件创建交易
    creationTx, err := c.contract.GetEventCreationTx(ctx, eventId)
    if err != nil {
        return nil, err
    }
    
    // 2. 获取所有投票交易
    voteTxs, err := c.contract.GetVoteTransactions(ctx, eventId)
    if err != nil {
        return nil, err
    }
    
    // 3. 获取撤销投票交易
    cancelTxs, err := c.contract.GetCancelVoteTransactions(ctx, eventId)
    if err != nil {
        return nil, err
    }
    
    return &BlockchainEventData{
        EventTx:  creationTx,
        VoteTxs:  voteTxs,
        CancelTxs: cancelTxs,
    }, nil
}
```

### 7.2 数据对比算法

#### 7.2.1 活动信息对比
```go
func (s *VerificationService) compareEventInfo(dbInfo *EventInfo, bcInfo *EventInfo) *ComparisonResult {
    result := &ComparisonResult{
        IsMatch: true,
        Fields:  make(map[string]*FieldComparison),
    }
    
    // 对比各个字段
    if dbInfo.Name != bcInfo.Name {
        result.IsMatch = false
        result.Fields["name"] = &FieldComparison{
            DatabaseValue: dbInfo.Name,
            BlockchainValue: bcInfo.Name,
            IsMatch: false,
        }
    }
    
    if dbInfo.Description != bcInfo.Description {
        result.IsMatch = false
        result.Fields["description"] = &FieldComparison{
            DatabaseValue: dbInfo.Description,
            BlockchainValue: bcInfo.Description,
            IsMatch: false,
        }
    }
    
    // 继续对比其他字段...
    
    return result
}
```

#### 7.2.2 投票记录对比
```go
func (s *VerificationService) compareVoteRecords(dbVotes, bcVotes []VoteRecord) *VoteComparisonResult {
    // 将区块链投票记录转换为map以便快速查找
    bcVoteMap := make(map[string]VoteRecord)
    for _, vote := range bcVotes {
        key := fmt.Sprintf("%s-%s-%s", vote.EventId, vote.Voter, vote.ProjectId)
        bcVoteMap[key] = vote
    }
    
    result := &VoteComparisonResult{
        TotalDBRecords:     len(dbVotes),
        TotalBCRecords:     len(bcVotes),
        MatchedRecords:     0,
        MismatchedRecords:  make([]VoteMismatch, 0),
        MissingInBC:        make([]VoteRecord, 0),
        ExtraInBC:          make([]VoteRecord, 0),
    }
    
    for _, dbVote := range dbVotes {
        key := fmt.Sprintf("%s-%s-%s", dbVote.EventId, dbVote.Voter, dbVote.ProjectId)
        bcVote, exists := bcVoteMap[key]
        
        if !exists {
            result.MissingInBC = append(result.MissingInBC, dbVote)
            continue
        }
        
        if s.compareVote(dbVote, bcVote) {
            result.MatchedRecords++
        } else {
            result.MismatchedRecords = append(result.MismatchedRecords, VoteMismatch{
                DBVote: dbVote,
                BCVote: bcVote,
            })
        }
        
        delete(bcVoteMap, key)
    }
    
    // 剩余的是区块链上多出的记录
    for _, bcVote := range bcVoteMap {
        result.ExtraInBC = append(result.ExtraInBC, bcVote)
    }
    
    result.IsMatch = result.MismatchedRecords == 0 && 
                    len(result.MissingInBC) == 0 && 
                    len(result.ExtraInBC) == 0
    
    return result
}
```

### 7.3 缓存策略

#### 7.3.1 缓存设计
```go
type CacheKey struct {
    Type     string // "event-info", "vote-records", "verification-result"
    EventID  string
    UserID   string // 用于区分用户级别的缓存
}

// 缓存过期时间设置
var CacheExpiry = map[string]time.Duration{
    "event-info":        5 * time.Minute,
    "vote-records":      3 * time.Minute,
    "verification-result": 10 * time.Minute,
}
```

#### 7.3.2 缓存更新策略
- **活动信息更新**：实时清除相关缓存
- **投票记录变更**：批量更新缓存
- **验证结果**：短时间缓存，避免重复计算

## 8. 智能合约开发规范

### 8.1 合约结构设计

#### 8.1.1 验证合约接口
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

interface IEventVerification {
    // 获取活动信息哈希
    function getEventDataHash(string memory eventId) external view returns (bytes32);
    
    // 获取投票记录数量
    function getVoteRecordsCount(string memory eventId) external view returns (uint256);
    
    // 获取指定投票记录
    function getVoteRecord(string memory eventId, uint256 index) external view returns (VoteRecord memory);
    
    // 验证数据完整性
    function verifyDataIntegrity(string memory eventId) external view returns (bool isValid, bytes32 dataHash);
}

struct VoteRecord {
    string eventId;
    address voter;
    string projectId;
    uint256 score;
    uint256 timestamp;
    bool isCancelled;
    address indexed voter;
    string indexed projectId;
    bytes32 voteData;
}
```

#### 8.1.2 数据存储结构
```solidity
contract EventVerification is IEventVerification {
    // 活动数据存储
    mapping(string => EventData) private eventData;
    mapping(string => VoteRecord[]) private voteRecords;
    mapping(string => mapping(address => mapping(string => uint256))) private voteIndexMap; // eventId -> voter -> projectId -> index
    
    struct EventData {
        string name;
        string description;
        uint256 startTime;
        uint256 endTime;
        string location;
        address organizer;
        bytes32 dataHash;
        bool exists;
        bool isActive;
    }
    
    // 事件定义
    event EventVerified(
        string indexed eventId,
        address indexed verifier,
        bool isValid,
        bytes32 dataHash,
        uint256 timestamp
    );
    
    event VerificationFailed(
        string indexed eventId,
        address indexed verifier,
        string reason,
        uint256 timestamp
    );
}
```

### 8.2 验证逻辑实现

#### 8.2.1 数据哈希计算
```solidity
function calculateEventDataHash(EventData memory data) public pure returns (bytes32) {
    return keccak256(abi.encodePacked(
        data.name,
        data.description,
        data.startTime,
        data.endTime,
        data.location,
        data.organizer
    ));
}

function verifyEventDataHash(string memory eventId, bytes32 expectedHash) public view returns (bool) {
    EventData storage data = eventData[eventId];
    require(data.exists, "Event does not exist");
    
    bytes32 actualHash = calculateEventDataHash(data);
    return actualHash == expectedHash;
}
```

#### 8.2.2 投票记录验证
```solidity
function verifyVoteRecordIntegrity(string memory eventId) external view returns (bool isValid, uint256 totalCount, uint256 validCount) {
    VoteRecord[] storage records = voteRecords[eventId];
    totalCount = records.length;
    validCount = 0;
    
    for (uint256 i = 0; i < totalCount; i++) {
        VoteRecord memory record = records[i];
        if (!record.isCancelled && record.timestamp > 0) {
            validCount++;
        }
    }
    
    // 检查是否有重复投票
    isValid = !hasDuplicateVotes(eventId);
}

function hasDuplicateVotes(string memory eventId) private view returns (bool) {
    VoteRecord[] storage records = voteRecords[eventId];
    mapping(address => mapping(string => bool)) storage voterProjectMap;
    
    for (uint256 i = 0; i < records.length; i++) {
        VoteRecord memory record = records[i];
        if (!record.isCancelled && voterProjectMap[record.voter][record.projectId]) {
            return true; // 发现重复投票
        }
        voterProjectMap[record.voter][record.projectId] = true;
    }
    
    return false;
}
```

### 8.3 Gas优化策略

#### 8.3.1 批量查询优化
```solidity
// 批量获取投票记录，减少Gas消耗
function getBatchVoteRecords(
    string memory eventId,
    uint256[] calldata indices
) external view returns (VoteRecord[] memory results) {
    results = new VoteRecord[](indices.length);
    VoteRecord[] storage records = voteRecords[eventId];
    
    for (uint256 i = 0; i < indices.length; i++) {
        require(indices[i] < records.length, "Index out of bounds");
        results[i] = records[indices[i]];
    }
}
```

#### 8.3.2 存储优化
- 使用packed structs减少存储槽使用
- 合理使用immutable变量
- 避免不必要的存储写入操作

## 9. 测试规范

### 9.1 单元测试

#### 9.1.1 前端组件测试
```typescript
// VerificationPanel.test.tsx
describe('VerificationPanel', () => {
  it('should display verification form correctly', () => {
    render(<VerificationPanel />);
    expect(screen.getByText('活动信息真实性验证')).toBeInTheDocument();
  });
  
  it('should handle event selection', async () => {
    const mockOnEventSelect = jest.fn();
    render(<VerificationPanel onEventSelect={mockOnEventSelect} />);
    
    const eventSelect = screen.getByRole('combobox');
    fireEvent.change(eventSelect, { target: { value: 'test-event-id' } });
    
    await waitFor(() => {
      expect(mockOnEventSelect).toHaveBeenCalledWith('test-event-id');
    });
  });
  
  it('should show loading state during verification', async () => {
    render(<VerificationPanel />);
    
    const verifyButton = screen.getByRole('button', { name: '开始验证' });
    fireEvent.click(verifyButton);
    
    expect(screen.getByTestId('verification-progress')).toBeInTheDocument();
    expect(screen.getByText('正在验证...')).toBeInTheDocument();
  });
});
```

#### 9.1.2 后端服务测试
```go
// verification_service_test.go
func TestVerificationService_VerifyEvent(t *testing.T) {
    tests := []struct {
        name    string
        request *VerifyEventRequest
        wantErr  bool
        errType  error
    }{
        {
            name: "valid request",
            request: &VerifyEventRequest{
                EventId: "test-event-123",
            },
            wantErr: false,
        },
        {
            name: "invalid event id",
            request: &VerifyEventRequest{
                EventId: "",
            },
            wantErr: true,
            errType: ErrInvalidEventId,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            service := setupTestService(t)
            result, err := service.VerifyEvent(context.Background(), tt.request)
            
            if tt.wantErr {
                assert.Error(t, err)
                assert.IsType(t, tt.errType, err)
            } else {
                assert.NoError(t, err)
                assert.NotNil(t, result)
            }
        })
    }
}
```

### 9.2 集成测试

#### 9.2.1 端到端测试
```typescript
// e2e/verification.spec.ts
describe('Event Verification E2E', () => {
  it('should complete full verification flow', async () => {
    // 1. 用户登录
    await page.goto('/arena');
    await page.fill('[data-testid="wallet-address"]', '0x123...');
    await page.click('[data-testid="connect-wallet"]');
    
    // 2. 选择活动
    await page.selectOption('[data-testid="event-selector"]', 'test-event-123');
    
    // 3. 开始验证
    await page.click('[data-testid="verify-button"]');
    
    // 4. 等待验证完成
    await expect(page.locator('[data-testid="verification-result"]')).toBeVisible({ timeout: 30000 });
    
    // 5. 验证结果显示
    await expect(page.locator('[data-testid="verification-success"]')).toContainText('验证完成');
    
    // 6. 查看详细信息
    await page.click('[data-testid="view-details"]');
    await expect(page.locator('[data-testid="transaction-list"]')).toBeVisible();
  });
});
```

#### 9.2.2 性能测试
```go
// benchmark_verification_test.go
func BenchmarkVerificationService_VerifyEvent(b *testing.B) {
    service := setupBenchmarkService(b)
    request := &VerifyEventRequest{
        EventId: "benchmark-event-123",
    }
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        _, err := service.VerifyEvent(context.Background(), request)
        if err != nil {
            b.Fatal(err)
        }
    }
}

func BenchmarkVerificationService_CompareVoteRecords(b *testing.B) {
    service := setupBenchmarkService(b)
    dbVotes := generateMockVoteRecords(1000)
    bcVotes := generateMockVoteRecords(1000)
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        result := service.compareVoteRecords(dbVotes, bcVotes)
        _ = result
    }
}
```

### 9.3 测试数据准备

#### 9.3.1 Mock数据生成
```go
// testdata/mock_data.go
func generateMockEventData(eventId string) *EventInfo {
    return &EventInfo{
        ID:          eventId,
        Name:        fmt.Sprintf("Test Event %s", eventId),
        Description: "This is a test event for verification",
        StartTime:   time.Now().Add(-24 * time.Hour).Unix(),
        EndTime:     time.Now().Add(24 * time.Hour).Unix(),
        Location:    "Test Location",
        Organizer:   "0x1234567890123456789012345678901234567890",
        Status:      "active",
    }
}

func generateMockVoteRecords(count int) []VoteRecord {
    votes := make([]VoteRecord, count)
    for i := 0; i < count; i++ {
        votes[i] = VoteRecord{
            ID:            fmt.Sprintf("vote-%d", i),
            EventID:       "test-event-123",
            Voter:         fmt.Sprintf("0x1234%d", i),
            ProjectID:     fmt.Sprintf("project-%d", i%10),
            Score:         uint8(rand.Intn(5) + 1),
            Timestamp:     time.Now().Add(-time.Duration(i) * time.Hour).Unix(),
            TransactionHash: fmt.Sprintf("0x%x", rand.Int63()),
            IsCancelled:   false,
        }
    }
    return votes
}
```

## 10. 部署规范

### 10.1 环境配置

#### 10.1.1 开发环境
```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - REACT_APP_NETWORK_ID=11155111  # Sepolia
      - REACT_APP_RPC_URL=https://sepolia.infura.io/v3/${INFURA_PROJECT_ID}
      - REACT_APP_CONTRACT_ADDRESS=${CONTRACT_ADDRESS}
    volumes:
      - .:/app
      - /app/node_modules
  
  backend:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      - ENV=development
      - DATABASE_URL=postgres://user:password@postgres:5432/hackathon
      - REDIS_URL=redis://redis:6379
      - BLOCKCHAIN_RPC_URL=https://sepolia.infura.io/v3/${INFURA_PROJECT_ID}
    depends_on:
      - postgres
      - redis
```

#### 10.1.2 生产环境
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  app:
    image: hackathon-arena:latest
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
      - REACT_APP_NETWORK_ID=1  # Ethereum Mainnet
      - REACT_APP_RPC_URL=${MAINNET_RPC_URL}
      - REACT_APP_CONTRACT_ADDRESS=${MAINNET_CONTRACT_ADDRESS}
  
  backend:
    image: hackathon-backend:latest
    ports:
      - "443:443"
    environment:
      - ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - BLOCKCHAIN_RPC_URL=${MAINNET_RPC_URL}
```

### 10.2 智能合约部署

#### 10.2.1 部署脚本
```typescript
// scripts/deploy.ts
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // 部署验证合约
  const EventVerification = await ethers.getContractFactory("EventVerification");
  const eventVerification = await EventVerification.deploy();
  
  await eventVerification.deployed();
  
  console.log("EventVerification deployed to:", eventVerification.address);
  
  // 验证合约源码
  if (process.env.NETWORK !== "hardhat") {
    console.log("Verifying contract on Etherscan...");
    await hre.run("verify:verify", {
      address: eventVerification.address,
      constructorArguments: [],
    });
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

#### 10.2.2 环境变量配置
```bash
# .env.production
# 区块链配置
NETWORK_ID=1
MAINNET_RPC_URL=https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}
MAINNET_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890

# 数据库配置
DATABASE_URL=postgresql://user:password@host:5432/hackathon_prod
REDIS_URL=redis://host:6379

# API配置
API_BASE_URL=https://api.hackathon.com
JWT_SECRET=${JWT_SECRET}

# 监控配置
SENTRY_DSN=${SENTRY_DSN}
LOG_LEVEL=info
```

## 11. 监控和日志规范

### 11.1 应用监控

#### 11.1.1 性能指标
- **响应时间**：验证API的P50、P95、P99响应时间
- **吞吐量**：每秒处理的验证请求数
- **错误率**：验证失败率和错误类型分布
- **资源使用**：CPU、内存、磁盘、网络使用情况

#### 11.1.2 业务指标
- **验证成功率**：区块链数据一致性验证的成功率
- **数据不一致率**：发现的数据不一致问题频率
- **用户使用率**：验证功能的使用频率和用户分布

### 11.2 日志规范

#### 11.2.1 日志级别
```typescript
enum LogLevel {
  ERROR = 'error',    // 错误：系统错误、异常情况
  WARN  = 'warn',     // 警告：潜在问题、性能警告
  INFO  = 'info',     // 信息：重要业务操作、状态变更
  DEBUG = 'debug',    // 调试：详细执行信息、开发调试
}
```

#### 11.2.2 日志格式
```typescript
interface LogEntry {
  timestamp: string;     // ISO 8601格式时间戳
  level: LogLevel;      // 日志级别
  service: string;       // 服务名称
  module: string;        // 模块名称
  action: string;        // 操作名称
  userId?: string;       // 用户ID（如果适用）
  eventId?: string;      // 活动ID（如果适用）
  message: string;       // 日志消息
  data?: object;          // 结构化数据
  error?: {              // 错误信息（如果适用）
    name: string;
    message: string;
    stack?: string;
  };
}
```

#### 11.2.3 关键操作日志
```typescript
// 验证开始
logger.info('verification_started', {
  userId: user.walletAddress,
  eventId: req.eventId,
  verificationType: 'in-progress',
});

// 数据获取
logger.debug('data_fetched', {
  eventId: req.eventId,
  dbRecordsCount: dbData.length,
  bcRecordsCount: bcData.length,
});

// 数据对比
logger.info('data_comparison_completed', {
  eventId: req.eventId,
  isMatch: result.isMatch,
  matchedRecords: result.matchedRecords,
  totalRecords: result.totalRecords,
  mismatches: result.mismatchedFields.length,
});

// 验证完成
logger.info('verification_completed', {
  eventId: req.eventId,
  userId: user.walletAddress,
  duration: Date.now() - startTime,
  success: true,
});
```

## 12. 安全规范

### 12.1 数据安全

#### 12.1.1 输入验证
- **参数验证**：所有输入参数必须进行类型和格式验证
- **SQL注入防护**：使用参数化查询，避免字符串拼接
- **XSS防护**：前端输出进行HTML转义，CSP策略配置
- **CSRF防护**：使用CSRF令牌，验证请求来源

#### 12.1.2 访问控制
```typescript
// 权限检查中间件
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// 活动访问权限检查
export const checkEventAccess = async (req: Request, res: Response, next: NextFunction) => {
  const eventId = req.params.eventId;
  const userId = req.user?.id;
  
  // 游客模式：只能验证已结束的活动
  if (!userId) {
    const event = await EventModel.findById(eventId);
    if (event.status !== 'ended') {
      return res.status(403).json({ error: 'Access denied: event not ended' });
    }
  }
  
  next();
};
```

### 12.2 区块链安全

#### 12.2.1 合约安全
- **重入攻击防护**：使用OpenZeppelin的ReentrancyGuard
- **整数溢出防护**：Solidity 0.8+内置保护，或使用SafeMath
- **权限控制**：实现基于角色的访问控制
- **事件日志**：记录所有关键操作的审计日志

#### 12.2.2 私钥管理
```go
// 私钥加密存储
type PrivateKeyManager struct {
    encryptionKey []byte
    keyStore      map[string][]byte
}

func (m *PrivateKeyManager) StorePrivateKey(address string, privateKey string) error {
    encrypted, err := encrypt(privateKey, m.encryptionKey)
    if err != nil {
        return err
    }
    
    m.keyStore[address] = encrypted
    return nil
}

func (m *PrivateKeyManager) GetPrivateKey(address string) (string, error) {
    encrypted, exists := m.keyStore[address]
    if !exists {
        return "", fmt.Errorf("private key not found for address: %s", address)
    }
    
    decrypted, err := decrypt(encrypted, m.encryptionKey)
    if err != nil {
        return "", err
    }
    
    return decrypted, nil
}
```

### 12.3 网络安全

#### 12.3.1 HTTPS配置
```nginx
server {
    listen 443 ssl http2;
    server_name hackathon-arena.com;
    
    # SSL证书配置
    ssl_certificate /etc/ssl/certs/hackathon-arena.crt;
    ssl_certificate_key /etc/ssl/private/hackathon-arena.key;
    
    # SSL安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    # 其他安全头
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
}
```

#### 12.3.2 速率限制
```typescript
// 速率限制配置
import rateLimit from 'express-rate-limit';

// 全局速率限制
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 1000, // 每个IP最多1000个请求
  message: 'Too many requests from this IP',
});

// 验证API速率限制
export const verificationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: 10, // 每个IP每分钟最多10次验证请求
  message: 'Too many verification requests',
  skipSuccessfulRequests: true,
});
```

## 13. 验收标准

### 13.1 功能验收标准

#### 13.1.1 基本功能验证
- ✅ 参赛者可以在活动中验证当前活动信息真实性
- ✅ 游客可以验证过往活动信息真实性
- ✅ 验证结果准确显示数据一致性和不一致性
- ✅ 提供详细的交易哈希列表和验证报告
- ✅ 支持查看不匹配项目的具体对比信息

#### 13.1.2 性能验收标准
- ✅ 验证响应时间：< 30秒（包含区块链数据获取）
- ✅ 数据查询响应时间：< 5秒
- ✅ 支持100个并发用户同时进行验证操作
- ✅ 大型活动（1000+投票记录）验证时间：< 60秒

#### 13.1.3 可用性验收标准
- ✅ 系统可用性：≥ 99.5%
- ✅ 验证成功率：≥ 99%
- ✅ 错误恢复机制：验证失败后可重试
- ✅ 用户体验：操作流程清晰，提示信息准确

### 13.2 安全验收标准

#### 13.2.1 数据安全
- ✅ 所有用户输入经过严格验证和清理
- ✅ 敏感信息（私钥）加密存储
- ✅ 访问权限控制正确实施
- ✅ 防止SQL注入、XSS、CSRF等攻击

#### 13.2.2 区块链安全
- ✅ 智能合约通过安全审计
- ✅ 合约源码在Sourcify和Etherscan验证
- ✅ 交易数据不可篡改
- ✅ 防重放攻击机制有效

### 13.3 文档验收标准

#### 13.3.1 技术文档
- ✅ API接口文档完整且准确
- ✅ 智能合约接口文档详细
- ✅ 部署文档可复现
- ✅ 故障排除文档有效

#### 13.3.2 用户文档
- ✅ 功能使用说明清晰
- ✅ 常见问题解答完整
- ✅ 错误信息解释明确
- ✅ 最佳实践指南提供

---

**文档版本**: v1.0  
**创建日期**: 2024-01-06  
**最后更新**: 2024-01-06  
**维护人员**: 开发团队