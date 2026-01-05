# DEV-401: 投票信息上链 - 详细开发文档

## 1. 文档说明

### 1.1 文档目的
本文档基于 PRD401.md 中的 3.1.3.2 和 3.1.3.3 需求，详细说明投票信息上链和投票撤销功能的技术实现方案，为智能合约开发提供具体的开发指导。

### 1.2 文档范围
本文档涵盖以下功能的详细设计和实现：
- 投票信息上链功能
- 投票撤销功能
- 投票记录查询和验证
- 数据一致性保证机制

### 1.3 参考文档
- PRD401.md: Hackathon 比赛平台 - 第四期需求文档
- dev_rules.md: 开发规范文档
- prd_rules_contract.md: 合约开发规范文档

## 2. 合约架构设计

### 2.1 整体架构
投票合约采用独立的智能合约设计，与活动信息合约、NFT合约、签到合约形成完整的链上数据体系。合约架构遵循模块化设计原则，确保功能的独立性和可维护性。

### 2.2 技术栈选择

#### 2.2.1 合约技术栈
- **Solidity**: ^0.8.21
- **HardHat**: ^2.19.0
- **OpenZeppelin**: ^5.0.0
- **dotenv**: ^16.3.1

#### 2.2.2 网络
- **测试网络**: Sepolia
- **主网络**: 根据项目需求确定

#### 2.2.3 源码验证
- **Sourcify**: 支持自动化源码验证
- **Etherscan**: 提供合约验证和浏览器功能

#### 2.2.4 部署
- **部署工具**: HardHat Deploy Scripts
- **部署验证**: 自动化验证和配置管理

## 3. 数据设计

### 3.1 数据结构
投票合约的数据结构设计与后端代码结构体保持一致，确保链上链下数据的无缝对接。

#### 3.1.1 投票记录结构
```solidity
struct VoteRecord {
    uint256 voteId;          // 投票ID
    uint256 eventId;         // 活动ID
    uint256 projectId;       // 作品ID
    address voter;           // 投票者地址
    uint8 score;             // 投票分数 (1-10)
    uint256 timestamp;       // 投票时间戳
    bool isActive;           // 投票是否有效
    bool isRevoked;          // 是否已撤销
    uint256 revokeTime;      // 撤销时间戳
    string txHash;           // 交易哈希
}
```

#### 3.1.2 活动投票统计结构
```solidity
struct EventVoteStats {
    uint256 eventId;         // 活动ID
    uint256 totalVotes;      // 总投票数
    uint256 activeVotes;     // 有效投票数
    uint256 revokedVotes;    // 已撤销投票数
    mapping(uint256 => uint256) projectScores; // 作品ID => 总分数
}
```

### 3.2 合约状态变量
```solidity
// 合约所有者
address public owner;

// 活动注册映射
mapping(uint256 => bool) public registeredEvents;

// 投票记录映射
mapping(uint256 => VoteRecord) public voteRecords;
mapping(address => mapping(uint256 => bool)) public hasVoted; // 投票者 => 活动ID => 是否已投票
mapping(uint256 => mapping(uint256 => mapping(address => bool))) public projectVotes; // 活动ID => 作品ID => 投票者地址 => 是否已投票

// 活动投票统计
mapping(uint256 => EventVoteStats) public eventStats;

// 投票ID计数器
uint256 public voteIdCounter;

// 事件记录
event VoteCast(
    uint256 indexed voteId,
    uint256 indexed eventId,
    uint256 indexed projectId,
    address voter,
    uint8 score,
    uint256 timestamp,
    string txHash
);

event VoteRevoked(
    uint256 indexed voteId,
    uint256 indexed eventId,
    uint256 indexed projectId,
    address voter,
    uint256 revokeTime,
    string revokeTxHash
);

event EventRegistered(uint256 indexed eventId, address indexed organizer);
event EventUnregistered(uint256 indexed eventId, address indexed organizer);
```

## 4. 功能实现

### 4.1 投票信息上链功能

#### 4.1.1 活动注册
```solidity
/**
 * @dev 注册活动到投票合约
 * @param eventId 活动ID
 * @param organizer 主办方地址
 */
function registerEvent(uint256 eventId, address organizer) external onlyOwner {
    require(!registeredEvents[eventId], "Event already registered");
    
    registeredEvents[eventId] = true;
    eventStats[eventId] = EventVoteStats({
        eventId: eventId,
        totalVotes: 0,
        activeVotes: 0,
        revokedVotes: 0
    });
    
    emit EventRegistered(eventId, organizer);
}
```

#### 4.1.2 投票功能
```solidity
/**
 * @dev 参赛者投票
 * @param eventId 活动ID
 * @param projectId 作品ID
 * @param score 投票分数 (1-10)
 */
function castVote(
    uint256 eventId,
    uint256 projectId,
    uint8 score
) external {
    // 验证参数
    require(registeredEvents[eventId], "Event not registered");
    require(score >= 1 && score <= 10, "Invalid score");
    require(!hasVoted[msg.sender][eventId], "Already voted in this event");
    require(!projectVotes[eventId][projectId][msg.sender], "Already voted for this project");
    
    // 创建投票记录
    uint256 voteId = ++voteIdCounter;
    voteRecords[voteId] = VoteRecord({
        voteId: voteId,
        eventId: eventId,
        projectId: projectId,
        voter: msg.sender,
        score: score,
        timestamp: block.timestamp,
        isActive: true,
        isRevoked: false,
        revokeTime: 0,
        txHash: ""
    });
    
    // 更新投票状态
    hasVoted[msg.sender][eventId] = true;
    projectVotes[eventId][projectId][msg.sender] = true;
    
    // 更新活动统计
    eventStats[eventId].totalVotes++;
    eventStats[eventId].activeVotes++;
    eventStats[eventId].projectScores[projectId] += score;
    
    emit VoteCast(voteId, eventId, projectId, msg.sender, score, block.timestamp, "");
}
```

### 4.2 投票撤销功能

#### 4.2.1 撤销投票
```solidity
/**
 * @dev 撤销投票
 * @param voteId 投票ID
 */
function revokeVote(uint256 voteId) external {
    VoteRecord storage vote = voteRecords[voteId];
    
    // 验证投票记录
    require(vote.voteId != 0, "Vote does not exist");
    require(vote.voter == msg.sender, "Not authorized");
    require(vote.isActive && !vote.isRevoked, "Vote already revoked or inactive");
    
    // 更新投票记录
    vote.isRevoked = true;
    vote.isActive = false;
    vote.revokeTime = block.timestamp;
    
    // 更新活动统计
    eventStats[vote.eventId].activeVotes--;
    eventStats[vote.eventId].revokedVotes++;
    eventStats[vote.eventId].projectScores[vote.projectId] -= vote.score;
    
    emit VoteRevoked(voteId, vote.eventId, vote.projectId, msg.sender, block.timestamp, "");
}
```

### 4.3 查询功能

#### 4.3.1 获取投票记录
```solidity
/**
 * @dev 获取投票记录
 * @param voteId 投票ID
 * @return 投票记录
 */
function getVoteRecord(uint256 voteId) external view returns (VoteRecord memory) {
    return voteRecords[voteId];
}
```

#### 4.3.2 获取活动投票统计
```solidity
/**
 * @dev 获取活动投票统计
 * @param eventId 活动ID
 * @return 活动投票统计
 */
function getEventStats(uint256 eventId) external view returns (
    uint256 totalVotes,
    uint256 activeVotes,
    uint256 revokedVotes
) {
    EventVoteStats storage stats = eventStats[eventId];
    return (stats.totalVotes, stats.activeVotes, stats.revokedVotes);
}
```

#### 4.3.3 获取作品得分
```solidity
/**
 * @dev 获取作品总分
 * @param eventId 活动ID
 * @param projectId 作品ID
 * @return 作品总分
 */
function getProjectScore(uint256 eventId, uint256 projectId) external view returns (uint256) {
    return eventStats[eventId].projectScores[projectId];
}
```

#### 4.3.4 检查用户是否已投票
```solidity
/**
 * @dev 检查用户是否已在活动中投票
 * @param voter 投票者地址
 * @param eventId 活动ID
 * @return 是否已投票
 */
function hasUserVotedInEvent(address voter, uint256 eventId) external view returns (bool) {
    return hasVoted[voter][eventId];
}
```

#### 4.3.5 获取用户在活动中的投票记录
```solidity
/**
 * @dev 获取用户在活动中的所有投票记录
 * @param voter 投票者地址
 * @param eventId 活动ID
 * @return voteIds 投票ID数组
 */
function getUserVotesInEvent(address voter, uint256 eventId) external view returns (uint256[] memory) {
    uint256[] memory votes = new uint256[](voteIdCounter);
    uint256 count = 0;
    
    for (uint256 i = 1; i <= voteIdCounter; i++) {
        VoteRecord memory vote = voteRecords[i];
        if (vote.voter == voter && vote.eventId == eventId) {
            votes[count] = i;
            count++;
        }
    }
    
    // 调整数组大小
    uint256[] memory result = new uint256[](count);
    for (uint256 i = 0; i < count; i++) {
        result[i] = votes[i];
    }
    
    return result;
}
```

## 5. 事件设计

### 5.1 投票事件
```solidity
event VoteCast(
    uint256 indexed voteId,
    uint256 indexed eventId,
    uint256 indexed projectId,
    address voter,
    uint8 score,
    uint256 timestamp,
    string txHash
);
```

### 5.2 投票撤销事件
```solidity
event VoteRevoked(
    uint256 indexed voteId,
    uint256 indexed eventId,
    uint256 indexed projectId,
    address voter,
    uint256 revokeTime,
    string revokeTxHash
);
```

### 5.3 活动管理事件
```solidity
event EventRegistered(uint256 indexed eventId, address indexed organizer);
event EventUnregistered(uint256 indexed eventId, address indexed organizer);
```

## 6. 安全性设计

### 6.1 权限控制
- **合约所有者权限**: 只有合约所有者可以注册和注销活动
- **投票者权限**: 只有投票者本人可以撤销自己的投票
- **活动状态验证**: 只有已注册的活动才能进行投票

### 6.2 防重机制
- **活动级别防重**: 每个用户在每个活动中只能投一次票
- **作品级别防重**: 每个用户对每个作品只能投一次票
- **投票ID唯一性**: 使用递增计数器确保投票ID的唯一性

### 6.3 数据验证
- **分数范围验证**: 投票分数必须在1-10范围内
- **活动注册验证**: 只有已注册的活动才能进行投票操作
- **投票状态验证**: 只有有效的投票才能被撤销

## 7. 错误处理

### 7.1 常见错误定义
```solidity
error EventNotRegistered(uint256 eventId);
error AlreadyVoted(address voter, uint256 eventId);
error InvalidScore(uint8 score);
error VoteDoesNotExist(uint256 voteId);
error NotAuthorized(address caller, uint256 voteId);
error VoteAlreadyRevoked(uint256 voteId);
```

### 7.2 错误处理策略
- **参数验证**: 在函数入口进行参数验证
- **状态检查**: 验证操作的前置条件
- **回滚机制**: 发生错误时自动回滚交易

## 8. Gas 优化

### 8.1 数据结构优化
- **打包存储**: 使用结构体打包减少存储槽使用
- **映射优化**: 合理设计映射结构避免冗余存储

### 8.2 函数优化
- **批量操作**: 支持批量投票和批量撤销
- **事件日志**: 使用事件记录关键信息，减少链上存储

### 8.3 计算优化
- **缓存计算**: 缓存重复计算的结果
- **延迟计算**: 在需要时才进行复杂计算

## 9. 测试用例

### 9.1 基础功能测试
- **活动注册测试**: 测试活动注册和注销功能
- **投票功能测试**: 测试正常投票流程
- **投票撤销测试**: 测试投票撤销功能

### 9.2 边界条件测试
- **分数边界测试**: 测试分数1和10的边界情况
- **重复投票测试**: 测试防重机制
- **无效操作测试**: 测试各种错误场景

### 9.3 集成测试
- **与活动合约集成**: 测试与活动信息合约的集成
- **与NFT合约集成**: 测试与NFT合约的集成
- **端到端测试**: 测试完整的投票流程

## 10. 部署说明

### 10.1 部署脚本
```javascript
// scripts/deploy_vote_contract.js
const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    
    console.log("Deploying VoteContract with account:", deployer.address);
    
    const VoteContract = await ethers.getContractFactory("VoteContract");
    const voteContract = await VoteContract.deploy();
    
    await voteContract.deployed();
    
    console.log("VoteContract deployed to:", voteContract.address);
    
    // 保存部署信息
    const deploymentInfo = {
        network: hre.network.name,
        contract: "VoteContract",
        address: voteContract.address,
        deployer: deployer.address,
        timestamp: new Date().toISOString()
    };
    
    // 写入部署文件
    const fs = require("fs");
    fs.writeFileSync(
        "./deployments_vote.json",
        JSON.stringify(deploymentInfo, null, 2)
    );
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
```

### 10.2 验证脚本
```javascript
// scripts/verify_vote_contract.js
const { ethers } = require("hardhat");

async function main() {
    const deploymentInfo = require("../deployments_vote.json");
    
    console.log("Verifying VoteContract at:", deploymentInfo.address);
    
    await hre.run("verify:verify", {
        address: deploymentInfo.address,
        constructorArguments: [],
    });
    
    console.log("Contract verified successfully!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
```

## 11. API 集成

### 11.1 后端集成接口
```go
// 投票上链接口
func (v *VoteService) CastVoteToBlockchain(req *VoteRequest) (*VoteResponse, error)

// 投票撤销接口
func (v *VoteService) RevokeVoteFromBlockchain(req *RevokeVoteRequest) (*RevokeVoteResponse, error)

// 获取投票记录接口
func (v *VoteService) GetVoteFromBlockchain(voteId uint256) (*VoteRecord, error)

// 获取活动投票统计接口
func (v *VoteService) GetEventVoteStats(eventId uint256) (*EventVoteStats, error)
```

### 11.2 前端集成
- **投票组件**: 实现投票界面和交互
- **撤销组件**: 提供投票撤销功能
- **查询组件**: 显示投票记录和统计信息

## 12. 监控和日志

### 12.1 事件监听
- **投票事件监听**: 监听投票上链事件
- **撤销事件监听**: 监听投票撤销事件
- **统计更新**: 实时更新投票统计数据

### 12.2 日志记录
- **操作日志**: 记录所有投票相关操作
- **错误日志**: 记录错误和异常情况
- **性能日志**: 记录Gas消耗和执行时间

## 13. 维护和升级

### 13.1 合约升级策略
- **代理模式**: 使用代理合约支持升级
- **数据迁移**: 制定数据迁移方案
- **版本管理**: 维护合约版本信息

### 13.2 维护计划
- **定期监控**: 监控合约运行状态
- **性能优化**: 根据使用情况优化Gas消耗
- **安全审计**: 定期进行安全审计

---

**文档版本**: v1.0  
**创建日期**: 2024-01-XX  
**最后更新**: 2024-01-XX  
**维护人员**: 区块链开发团队