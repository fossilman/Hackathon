# DEV-401: NFT 发放功能开发文档

## 1. 文档说明

### 1.1 文档目的
本文档详细描述了 Hackathon 比赛平台第四期中 NFT 发放功能的开发实现方案，基于 PRD401.md 中 3.1.2.1 需求制定。

### 1.2 文档范围
本开发文档涵盖：
- NFT 智能合约设计与开发
- Arena 平台主办方 NFT 发放功能实现
- 链上数据同步与验证机制
- 异常处理与错误管理

### 1.3 参考文档
- PRD401.md: Hackathon 比赛平台第四期需求文档
- prd_rules_contract.md: 合约开发规范
- OpenZeppelin NFT 标准文档

## 2. 合约架构设计

### 2.1 整体架构
NFT 发放功能采用 ERC-721 标准，结合 OpenZeppelin 库实现。架构包含：
- HackathonNFT 主合约：管理 NFT 的铸造、转移和所有权
- 访问控制合约：确保只有主办方可以发放 NFT
- 事件记录合约：记录所有 NFT 发放相关的链上操作

### 2.2 技术栈选择

#### 2.2.1 合约技术栈
- Solidity ^0.8.21
- HardHat ^2.19.0
- openzeppelin/contracts ^5.0.0
- dotenv ^16.3.1

#### 2.2.2 网络
- 测试网：Sepolia
- 主网：待定

#### 2.2.3 源码验证
- Sourcify
- Etherscan

#### 2.2.4 部署
- 使用 HardHat 部署脚本
- 支持多环境配置

## 3. 数据设计

### 3.1 数据结构

#### 3.1.1 EventNFT 结构
```solidity
struct EventNFT {
    uint256 eventId;        // 活动 ID
    uint256 tokenId;        // NFT 代币 ID
    address participant;     // 参赛者钱包地址
    uint256 timestamp;      // 发放时间戳
    bool isActive;          // NFT 状态
}
```

#### 3.1.2 合约状态变量
```solidity
// NFT 基本信息
string public name;
string public symbol;
uint256 public totalSupply;

// 活动相关
mapping(uint256 => bool) public eventExists;        // 活动是否存在
mapping(uint256 => mapping(address => bool)) public hasNFT; // 活动地址是否已获得 NFT
mapping(uint256 => EventNFT[]) public eventNFTs;    // 活动对应的所有 NFT

// 权限控制
mapping(address => bool) public authorizedOrganizers; // 授权的主办方地址
address public platformAdmin;                        // 平台管理员

// 计数器
uint256 private _tokenIdCounter;
```

### 3.2 事件定义

```solidity
// NFT 发放事件
event NFTMinted(
    uint256 indexed eventId,
    uint256 indexed tokenId,
    address indexed participant,
    address organizer,
    uint256 timestamp
);

// 权限变更事件
event OrganizerAuthorized(address indexed organizer, bool authorized);
event PlatformAdminChanged(address indexed oldAdmin, address indexed newAdmin);

// 活动管理事件
event EventRegistered(uint256 indexed eventId, bool active);
```

## 4. 开发规范

### 4.1 代码规范

#### 4.1.1 命名规范
- 合约名：PascalCase（如：HackathonNFT）
- 函数名：camelCase（如：mintEventNFT）
- 变量名：camelCase（如：eventId, participant）
- 常量：UPPER_SNAKE_CASE（如：MAX_SUPPLY）
- 事件：PascalCase（如：NFTMinted）

#### 4.1.2 注释规范
- 所有公共函数必须有 NatSpec 注释
- 复杂逻辑需要内联注释
- 合约级别需要概述注释

### 4.2 数据结构规范
- 与后端代码结构体保持一致
- 使用 uint256 作为 ID 类型
- 时间戳使用 uint256 Unix 时间戳
- 地址类型使用 address

## 5. 核心功能实现

### 5.1 NFT 合约核心代码

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract HackathonNFT is ERC721, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    
    // 结构体定义
    struct EventNFT {
        uint256 eventId;
        uint256 tokenId;
        address participant;
        uint256 timestamp;
        bool isActive;
    }
    
    // 状态变量
    Counters.Counter private _tokenIdCounter;
    
    mapping(uint256 => bool) public eventExists;
    mapping(uint256 => mapping(address => bool)) public hasNFT;
    mapping(uint256 => EventNFT[]) public eventNFTs;
    mapping(address => bool) public authorizedOrganizers;
    
    uint256 public constant MAX_NFT_PER_EVENT = 1000;
    
    // 事件定义
    event NFTMinted(
        uint256 indexed eventId,
        uint256 indexed tokenId,
        address indexed participant,
        address organizer,
        uint256 timestamp
    );
    
    event EventRegistered(uint256 indexed eventId, bool active);
    event OrganizerAuthorized(address indexed organizer, bool authorized);
    
    constructor(string memory name, string memory symbol) ERC721(name, symbol) {
        platformAdmin = msg.sender;
    }
    
    /**
     * @dev 注册活动
     * @param eventId 活动 ID
     */
    function registerEvent(uint256 eventId) external onlyOwner {
        require(!eventExists[eventId], "Event already registered");
        eventExists[eventId] = true;
        emit EventRegistered(eventId, true);
    }
    
    /**
     * @dev 为参赛者发放 NFT
     * @param eventId 活动 ID
     * @param participant 参赛者钱包地址
     */
    function mintEventNFT(uint256 eventId, address participant) 
        external 
        nonReentrant
        returns (uint256) 
    {
        require(authorizedOrganizers[msg.sender] || msg.sender == owner(), "Not authorized");
        require(eventExists[eventId], "Event does not exist");
        require(!hasNFT[eventId][participant], "Participant already has NFT for this event");
        require(participant != address(0), "Invalid participant address");
        require(eventNFTs[eventId].length < MAX_NFT_PER_EVENT, "Max NFT per event reached");
        
        uint256 newTokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(participant, newTokenId);
        
        // 记录 NFT 信息
        EventNFT memory newNFT = EventNFT({
            eventId: eventId,
            tokenId: newTokenId,
            participant: participant,
            timestamp: block.timestamp,
            isActive: true
        });
        
        eventNFTs[eventId].push(newNFT);
        hasNFT[eventId][participant] = true;
        
        emit NFTMinted(eventId, newTokenId, participant, msg.sender, block.timestamp);
        
        return newTokenId;
    }
    
    /**
     * @dev 授权主办方
     * @param organizer 主办方地址
     * @param authorized 是否授权
     */
    function authorizeOrganizer(address organizer, bool authorized) external onlyOwner {
        authorizedOrganizers[organizer] = authorized;
        emit OrganizerAuthorized(organizer, authorized);
    }
    
    /**
     * @dev 获取活动 NFT 总数
     * @param eventId 活动 ID
     * @return NFT 数量
     */
    function getEventNFTCount(uint256 eventId) external view returns (uint256) {
        return eventNFTs[eventId].length;
    }
    
    /**
     * @dev 检查参赛者是否拥有活动 NFT
     * @param eventId 活动 ID
     * @param participant 参赛者地址
     * @return 是否拥有 NFT
     */
    function hasParticipantNFT(uint256 eventId, address participant) external view returns (bool) {
        return hasNFT[eventId][participant];
    }
    
    /**
     * @dev 获取活动所有 NFT 信息
     * @param eventId 活动 ID
     * @return NFT 数组
     */
    function getEventNFTs(uint256 eventId) external view returns (EventNFT[] memory) {
        return eventNFTs[eventId];
    }
    
    // 重写 required 函数
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override {
        // 可以在这里添加转移限制逻辑
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }
}
```

### 5.2 Arena 平台集成实现

#### 5.2.1 后端 API 设计

```go
// NFT 发放请求结构
type MintNFTRequest struct {
    EventID      uint64 `json:"eventId" binding:"required"`
    Participant  string `json:"participant" binding:"required,eth_addr"`
    OrganizerID  uint64 `json:"organizerId" binding:"required"`
}

// NFT 发放响应结构
type MintNFTResponse struct {
    Success      bool   `json:"success"`
    TokenID      uint64 `json:"tokenId,omitempty"`
    TransactionHash string `json:"transactionHash,omitempty"`
    Message      string `json:"message"`
}

// 主办方发放 NFT API
func (h *HackathonHandler) MintNFT(c *gin.Context) {
    var req MintNFTRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    // 1. 验证主办方权限
    organizer := h.getOrganizer(req.OrganizerID)
    if organizer == nil {
        c.JSON(http.StatusForbidden, gin.H{"error": "Organizer not found"})
        return
    }
    
    // 2. 验证活动状态
    event := h.getEvent(req.EventID)
    if event == nil || !h.isEventInCheckInStage(event) {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Event not in check-in stage"})
        return
    }
    
    // 3. 验证参赛者是否已签到
    if !h.isParticipantCheckedIn(req.EventID, req.Participant) {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Participant not checked in"})
        return
    }
    
    // 4. 检查是否已经发放过 NFT
    hasNFT, err := h.nftService.HasParticipantNFT(req.EventID, req.Participant)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check NFT status"})
        return
    }
    if hasNFT {
        c.JSON(http.StatusBadRequest, gin.H{"error": "NFT already minted"})
        return
    }
    
    // 5. 调用智能合约发放 NFT
    txHash, tokenID, err := h.nftService.MintEventNFT(req.EventID, req.Participant)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    
    // 6. 记录交易信息
    err = h.recordNFTMinting(req.EventID, req.Participant, tokenID, txHash)
    if err != nil {
        log.Printf("Failed to record NFT minting: %v", err)
    }
    
    c.JSON(http.StatusOK, MintNFTResponse{
        Success:         true,
        TokenID:         tokenID,
        TransactionHash: txHash,
        Message:         "NFT minted successfully",
    })
}
```

#### 5.2.2 前端实现

```typescript
// NFT 发放组件
interface NFTMintingProps {
    eventId: number;
    organizerId: number;
}

const NFTMintingComponent: React.FC<NFTMintingProps> = ({ eventId, organizerId }) => {
    const [checkedInParticipants, setCheckedInParticipants] = useState<Participant[]>([]);
    const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [mintingResults, setMintingResults] = useState<MintResult[]>([]);

    // 获取已签到参赛者列表
    useEffect(() => {
        fetchCheckedInParticipants(eventId);
    }, [eventId]);

    const fetchCheckedInParticipants = async (eventId: number) => {
        try {
            const response = await api.get(`/api/events/${eventId}/checked-in-participants`);
            setCheckedInParticipants(response.data);
        } catch (error) {
            console.error('Failed to fetch participants:', error);
        }
    };

    // 批量发放 NFT
    const handleMintNFTs = async () => {
        if (selectedParticipants.length === 0) {
            toast.error('Please select at least one participant');
            return;
        }

        setLoading(true);
        const results: MintResult[] = [];

        for (const participant of selectedParticipants) {
            try {
                const response = await api.post('/api/nft/mint', {
                    eventId,
                    participant,
                    organizerId
                });

                results.push({
                    participant,
                    success: true,
                    tokenId: response.data.tokenId,
                    txHash: response.data.transactionHash
                });
            } catch (error) {
                results.push({
                    participant,
                    success: false,
                    error: error.response?.data?.error || 'Unknown error'
                });
            }
        }

        setMintingResults(results);
        setLoading(false);
        
        // 刷新参赛者列表
        fetchCheckedInParticipants(eventId);
    };

    return (
        <div className="nft-minting-container">
            <h3>NFT 发放管理</h3>
            
            <div className="participants-list">
                <h4>已签到参赛者列表</h4>
                <table>
                    <thead>
                        <tr>
                            <th>选择</th>
                            <th>钱包地址</th>
                            <th>签到时间</th>
                            <th>NFT 状态</th>
                        </tr>
                    </thead>
                    <tbody>
                        {checkedInParticipants.map((participant) => (
                            <tr key={participant.address}>
                                <td>
                                    <input
                                        type="checkbox"
                                        checked={selectedParticipants.includes(participant.address)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedParticipants([...selectedParticipants, participant.address]);
                                            } else {
                                                setSelectedParticipants(selectedParticipants.filter(addr => addr !== participant.address));
                                            }
                                        }}
                                        disabled={participant.hasNFT}
                                    />
                                </td>
                                <td>{participant.address}</td>
                                <td>{new Date(participant.checkInTime).toLocaleString()}</td>
                                <td>
                                    {participant.hasNFT ? (
                                        <span className="has-nft">已获得 NFT</span>
                                    ) : (
                                        <span className="no-nft">未获得 NFT</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="minting-actions">
                <button
                    onClick={handleMintNFTs}
                    disabled={loading || selectedParticipants.length === 0}
                    className="mint-button"
                >
                    {loading ? '发放中...' : `发放 NFT (${selectedParticipants.length})`}
                </button>
            </div>

            {mintingResults.length > 0 && (
                <div className="minting-results">
                    <h4>发放结果</h4>
                    {mintingResults.map((result, index) => (
                        <div key={index} className={`result-item ${result.success ? 'success' : 'error'}`}>
                            <span>{result.participant}</span>
                            {result.success ? (
                                <span>
                                    成功 - Token ID: {result.tokenId}
                                    <a href={`https://sepolia.etherscan.io/tx/${result.txHash}`} target="_blank" rel="noopener noreferrer">
                                        查看交易
                                    </a>
                                </span>
                            ) : (
                                <span className="error-message">失败: {result.error}</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
```

## 6. 异常处理

### 6.1 智能合约异常处理
- **输入验证**：检查所有输入参数的有效性
- **权限检查**：确保只有授权用户可以调用函数
- **状态检查**：验证活动状态和 NFT 发放条件
- **Gas 限制**：设置合理的 Gas 限制

### 6.2 后端异常处理
- **链上操作失败**：重试机制和错误日志
- **网络异常**：超时处理和重连机制
- **数据一致性**：事务回滚和补偿机制

### 6.3 前端异常处理
- **用户提示**：清晰的错误信息提示
- **操作反馈**：实时的操作状态显示
- **重试机制**：允许用户重新操作

## 7. 测试方案

### 7.1 单元测试
- 智能合约功能测试
- 后端 API 接口测试
- 前端组件逻辑测试

### 7.2 集成测试
- 端到端 NFT 发放流程测试
- 链上数据一致性测试
- 异常场景测试

### 7.3 性能测试
- 并发发放测试
- Gas 消耗测试
- 响应时间测试

## 8. 部署流程

### 8.1 智能合约部署
```bash
# 编译合约
npx hardhat compile

# 运行测试
npx hardhat test

# 部署到 Sepolia 测试网
npx hardhat run scripts/deploy.js --network sepolia

# 验证合约
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

### 8.2 前端配置
- 合约地址配置
- 网络配置
- 环境变量设置

## 9. 监控与维护

### 9.1 监控指标
- NFT 发放成功率
- 交易确认时间
- Gas 费消耗
- 错误率统计

### 9.2 日志记录
- 所有 NFT 发放操作的详细日志
- 错误异常日志
- 性能监控日志

### 9.3 维护计划
- 定期合约状态检查
- 数据备份策略
- 升级回滚方案

---

**文档版本**: v1.0  
**创建日期**: 2024-12-30  
**最后更新**: 2024-12-30  
**维护人员**: 区块链开发团队