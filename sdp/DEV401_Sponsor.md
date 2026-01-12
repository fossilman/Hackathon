# DEV-401: 赞助商资金链路上链功能开发文档

## 1. 文档说明

### 1.1 文档目的
本文档基于 PRD401.md 中的 3.2.1 和 3.2.2 需求，详细说明赞助商资金链路上链功能的技术实现方案，包括智能合约开发、前端集成、后端接口设计等具体开发内容。

### 1.2 文档范围
本文档涵盖以下功能的详细设计和实现：
- 主办方创建活动时奖金托管
- 活动结果公布后奖金自动分发
- 长期赞助商申请活动时托管赞助金额
- 长期赞助商申请通过后资金转入主办方钱包
- 长期赞助商申请驳回后资金原路返回
- 资金链路查询功能

### 1.3 参考文档
- PRD401.md: Hackathon 比赛平台 - 第四期需求文档
- tpl/prd_rules_contract.md: 合约开发规范文档
- DEV401_CheckIn.md: 签到信息上链功能开发文档
- DEV401_NFT.md: NFT 发放功能开发文档
- DEV401_Vote.md: 投票信息上链功能开发文档

## 2. 合约架构设计

### 2.1 整体架构
资金链路上链功能采用智能合约托管奖金的设计，确保资金安全透明。架构包含：
- **奖金托管合约（PrizePoolContract）**：管理活动奖金和赞助资金的托管
- **资金分发合约（DistributionContract）**：处理奖金分发逻辑
- **资金链路查询合约**：提供资金流向查询功能
- **后端服务**：业务逻辑处理和与合约交互
- **前端界面**：用户交互界面

### 2.2 技术栈选择

#### 2.2.1 合约技术栈
- **Solidity**: ^0.8.21
- **HardHat**: ^2.19.0
- **OpenZeppelin**: ^5.0.0
  - `@openzeppelin/contracts/access/Ownable.sol`
  - `@openzeppelin/contracts/security/ReentrancyGuard.sol`
  - `@openzeppelin/contracts/security/Pausable.sol`
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

#### 3.1.1 奖金托管记录结构
```solidity
struct PrizePoolRecord {
    uint256 poolId;           // 奖金池ID
    uint256 eventId;          // 活动ID
    address creator;          // 创建者地址（主办方或赞助商）
    uint256 amount;           // 托管金额
    uint256 timestamp;        // 创建时间戳
    PoolType poolType;        // 奖金池类型（EventPrize/SponsorFund）
    PoolStatus status;        // 奖金池状态
    address contractAddress;  // 托管合约地址
    bytes32 transactionHash;  // 创建交易哈希
}

enum PoolType {
    EventPrize,      // 活动奖金池
    LongTermSponsor, // 长期赞助商资金池
    EventSponsor     // 指定活动赞助商资金池
}

enum PoolStatus {
    Active,          // 激活中
    Distributed,     // 已分发
    Refunded,        // 已退款
    Cancelled        // 已取消
}
```

#### 3.1.2 资金分发记录结构
```solidity
struct DistributionRecord {
    uint256 distributionId;   // 分发记录ID
    uint256 poolId;           // 奖金池ID
    uint256 eventId;          // 活动ID
    address recipient;        // 接收者地址
    uint256 amount;           // 分发金额
    uint256 timestamp;        // 分发时间戳
    bytes32 transactionHash;  // 分发交易哈希
    DistributionType distType; // 分发类型
}

enum DistributionType {
    TeamPrize,       // 队伍奖金
    TeamMember,      // 队员分成
    SponsorRefund,   // 赞助商退款
    OrganizerTransfer // 转给主办方
}
```

#### 3.1.3 活动奖金分配规则结构
```solidity
struct PrizeDistributionRule {
    uint256 eventId;          // 活动ID
    uint256 firstPlacePercent;   // 第一名奖金比例（基点，10000 = 100%）
    uint256 secondPlacePercent;  // 第二名奖金比例
    uint256 thirdPlacePercent;   // 第三名奖金比例
    uint256[] otherPlacePercents; // 其他名次奖金比例
}
```

### 3.2 合约状态变量
```solidity
// 合约所有者
address public owner;

// 奖金池记录
mapping(uint256 => PrizePoolRecord) public prizePools;
uint256 public poolIdCounter;

// 分发记录
mapping(uint256 => DistributionRecord) public distributions;
uint256 public distributionIdCounter;

// 活动奖金分配规则
mapping(uint256 => PrizeDistributionRule) public distributionRules;

// 活动注册映射
mapping(uint256 => bool) public registeredEvents;

// 奖金池ID映射（eventId => poolIds[]）
mapping(uint256 => uint256[]) public eventPools;

// 分发记录映射（poolId => distributionIds[]）
mapping(uint256 => uint256[]) public poolDistributions;
```

### 3.3 事件定义
```solidity
// 奖金池相关事件
event PrizePoolCreated(
    uint256 indexed poolId,
    uint256 indexed eventId,
    address indexed creator,
    uint256 amount,
    PoolType poolType,
    address contractAddress,
    bytes32 transactionHash,
    uint256 timestamp
);

event PrizePoolDistributed(
    uint256 indexed poolId,
    uint256 indexed eventId,
    uint256 totalDistributed,
    uint256 distributionCount,
    uint256 timestamp
);

event PrizePoolRefunded(
    uint256 indexed poolId,
    uint256 indexed eventId,
    address indexed recipient,
    uint256 amount,
    bytes32 transactionHash,
    uint256 timestamp
);

event FundsTransferred(
    uint256 indexed poolId,
    address indexed from,
    address indexed to,
    uint256 amount,
    bytes32 transactionHash,
    uint256 timestamp
);

// 分发相关事件
event DistributionExecuted(
    uint256 indexed distributionId,
    uint256 indexed poolId,
    address indexed recipient,
    uint256 amount,
    DistributionType distType,
    bytes32 transactionHash,
    uint256 timestamp
);

// 活动管理事件
event EventRegistered(uint256 indexed eventId, address indexed organizer);
event DistributionRuleSet(
    uint256 indexed eventId,
    uint256 firstPlacePercent,
    uint256 secondPlacePercent,
    uint256 thirdPlacePercent
);
```

## 4. 开发规范

### 4.1 代码规范

#### 4.1.1 命名规范
- 合约名称：使用 PascalCase，如 `PrizePoolContract`
- 函数名称：使用 camelCase，如 `createPrizePool`
- 变量名称：使用 camelCase，如 `eventId`, `poolId`
- 常量名称：使用 UPPER_SNAKE_CASE，如 `MAX_DISTRIBUTION_COUNT`
- 事件名称：使用 PascalCase，如 `PrizePoolCreated`

#### 4.1.2 注释规范
- 合约级别：使用 NatSpec 格式，说明合约用途
- 函数级别：说明功能、参数、返回值、注意事项
- 复杂逻辑：添加行内注释
- 状态变量：说明用途和取值范围

### 4.2 数据结构规范
- 与后端 Go 结构体字段一一对应
- 使用 uint256 类型表示 ID 和金额（wei 单位）
- 使用 address 类型表示钱包地址
- 使用 bytes32 类型表示交易哈希
- 使用枚举类型表示状态和类型

## 5. 智能合约设计

### 5.1 奖金托管合约（PrizePoolContract）

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title PrizePoolContract
 * @dev Hackathon 奖金托管和分发合约
 * @notice 管理活动奖金和赞助资金的托管、分发和退款
 */
contract PrizePoolContract is Ownable, ReentrancyGuard, Pausable {
    
    // 数据结构
    enum PoolType {
        EventPrize,      // 活动奖金池
        LongTermSponsor, // 长期赞助商资金池
        EventSponsor     // 指定活动赞助商资金池
    }
    
    enum PoolStatus {
        Active,          // 激活中
        Distributed,     // 已分发
        Refunded,        // 已退款
        Cancelled        // 已取消
    }
    
    enum DistributionType {
        TeamPrize,       // 队伍奖金
        TeamMember,      // 队员分成
        SponsorRefund,   // 赞助商退款
        OrganizerTransfer // 转给主办方
    }
    
    struct PrizePoolRecord {
        uint256 poolId;
        uint256 eventId;
        address creator;
        uint256 amount;
        uint256 timestamp;
        PoolType poolType;
        PoolStatus status;
        address contractAddress;
        bytes32 transactionHash;
    }
    
    struct DistributionRecord {
        uint256 distributionId;
        uint256 poolId;
        uint256 eventId;
        address recipient;
        uint256 amount;
        uint256 timestamp;
        bytes32 transactionHash;
        DistributionType distType;
    }
    
    struct PrizeDistributionRule {
        uint256 eventId;
        uint256 firstPlacePercent;   // 基点，10000 = 100%
        uint256 secondPlacePercent;
        uint256 thirdPlacePercent;
    }
    
    // 状态变量
    uint256 public poolIdCounter;
    uint256 public distributionIdCounter;
    
    mapping(uint256 => PrizePoolRecord) public prizePools;
    mapping(uint256 => DistributionRecord) public distributions;
    mapping(uint256 => PrizeDistributionRule) public distributionRules;
    mapping(uint256 => bool) public registeredEvents;
    mapping(uint256 => uint256[]) public eventPools;
    mapping(uint256 => uint256[]) public poolDistributions;
    
    // 事件定义
    event PrizePoolCreated(
        uint256 indexed poolId,
        uint256 indexed eventId,
        address indexed creator,
        uint256 amount,
        PoolType poolType,
        address contractAddress,
        bytes32 transactionHash,
        uint256 timestamp
    );
    
    event PrizePoolDistributed(
        uint256 indexed poolId,
        uint256 indexed eventId,
        uint256 totalDistributed,
        uint256 distributionCount,
        uint256 timestamp
    );
    
    event PrizePoolRefunded(
        uint256 indexed poolId,
        uint256 indexed eventId,
        address indexed recipient,
        uint256 amount,
        bytes32 transactionHash,
        uint256 timestamp
    );
    
    event FundsTransferred(
        uint256 indexed poolId,
        address indexed from,
        address indexed to,
        uint256 amount,
        bytes32 transactionHash,
        uint256 timestamp
    );
    
    event DistributionExecuted(
        uint256 indexed distributionId,
        uint256 indexed poolId,
        address indexed recipient,
        uint256 amount,
        DistributionType distType,
        bytes32 transactionHash,
        uint256 timestamp
    );
    
    event EventRegistered(uint256 indexed eventId, address indexed organizer);
    
    event DistributionRuleSet(
        uint256 indexed eventId,
        uint256 firstPlacePercent,
        uint256 secondPlacePercent,
        uint256 thirdPlacePercent
    );
    
    // 修饰符
    modifier onlyValidEvent(uint256 _eventId) {
        require(_eventId > 0, "Invalid event ID");
        _;
    }
    
    modifier onlyValidPool(uint256 _poolId) {
        require(_poolId > 0 && _poolId <= poolIdCounter, "Invalid pool ID");
        _;
    }
    
    modifier onlyActivePool(uint256 _poolId) {
        require(prizePools[_poolId].status == PoolStatus.Active, "Pool is not active");
        _;
    }
    
    /**
     * @dev 注册活动
     * @param eventId 活动ID
     * @param organizer 主办方地址
     */
    function registerEvent(uint256 eventId, address organizer) external onlyOwner {
        require(!registeredEvents[eventId], "Event already registered");
        registeredEvents[eventId] = true;
        emit EventRegistered(eventId, organizer);
    }
    
    /**
     * @dev 设置活动奖金分配规则
     * @param eventId 活动ID
     * @param firstPlacePercent 第一名奖金比例（基点，如 5000 = 50%）
     * @param secondPlacePercent 第二名奖金比例
     * @param thirdPlacePercent 第三名奖金比例
     */
    function setDistributionRule(
        uint256 eventId,
        uint256 firstPlacePercent,
        uint256 secondPlacePercent,
        uint256 thirdPlacePercent
    ) external onlyOwner onlyValidEvent(eventId) {
        require(firstPlacePercent + secondPlacePercent + thirdPlacePercent == 10000, "Percentages must sum to 100%");
        
        distributionRules[eventId] = PrizeDistributionRule({
            eventId: eventId,
            firstPlacePercent: firstPlacePercent,
            secondPlacePercent: secondPlacePercent,
            thirdPlacePercent: thirdPlacePercent
        });
        
        emit DistributionRuleSet(eventId, firstPlacePercent, secondPlacePercent, thirdPlacePercent);
    }
    
    /**
     * @dev 创建活动奖金池（主办方功能）
     * @param eventId 活动ID
     * @return poolId 奖金池ID
     */
    function createEventPrizePool(uint256 eventId)
        external
        payable
        nonReentrant
        whenNotPaused
        onlyValidEvent(eventId)
        returns (uint256)
    {
        require(registeredEvents[eventId], "Event not registered");
        require(msg.value > 0, "Amount must be greater than 0");
        
        uint256 poolId = ++poolIdCounter;
        
        prizePools[poolId] = PrizePoolRecord({
            poolId: poolId,
            eventId: eventId,
            creator: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp,
            poolType: PoolType.EventPrize,
            status: PoolStatus.Active,
            contractAddress: address(this),
            transactionHash: bytes32(0)
        });
        
        eventPools[eventId].push(poolId);
        
        emit PrizePoolCreated(
            poolId,
            eventId,
            msg.sender,
            msg.value,
            PoolType.EventPrize,
            address(this),
            bytes32(0),
            block.timestamp
        );
        
        return poolId;
    }
    
    /**
     * @dev 创建赞助商资金池（长期赞助商功能）
     * @param eventId 活动ID
     * @return poolId 奖金池ID
     */
    function createSponsorPool(uint256 eventId, PoolType sponsorType)
        external
        payable
        nonReentrant
        whenNotPaused
        onlyValidEvent(eventId)
        returns (uint256)
    {
        require(registeredEvents[eventId], "Event not registered");
        require(msg.value > 0, "Amount must be greater than 0");
        require(
            sponsorType == PoolType.LongTermSponsor || sponsorType == PoolType.EventSponsor,
            "Invalid sponsor type"
        );
        
        uint256 poolId = ++poolIdCounter;
        
        prizePools[poolId] = PrizePoolRecord({
            poolId: poolId,
            eventId: eventId,
            creator: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp,
            poolType: sponsorType,
            status: PoolStatus.Active,
            contractAddress: address(this),
            transactionHash: bytes32(0)
        });
        
        eventPools[eventId].push(poolId);
        
        emit PrizePoolCreated(
            poolId,
            eventId,
            msg.sender,
            msg.value,
            sponsorType,
            address(this),
            bytes32(0),
            block.timestamp
        );
        
        return poolId;
    }
    
    /**
     * @dev 将长期赞助商资金转入主办方钱包（申请通过后）
     * @param poolId 奖金池ID
     * @param organizerAddress 主办方钱包地址
     */
    function transferToOrganizer(uint256 poolId, address organizerAddress)
        external
        onlyOwner
        nonReentrant
        onlyValidPool(poolId)
        onlyActivePool(poolId)
    {
        PrizePoolRecord storage pool = prizePools[poolId];
        require(pool.poolType == PoolType.LongTermSponsor, "Only long-term sponsor pool");
        require(organizerAddress != address(0), "Invalid organizer address");
        
        uint256 amount = pool.amount;
        pool.status = PoolStatus.Distributed;
        
        (bool success, ) = organizerAddress.call{value: amount}("");
        require(success, "Transfer failed");
        
        uint256 distributionId = ++distributionIdCounter;
        distributions[distributionId] = DistributionRecord({
            distributionId: distributionId,
            poolId: poolId,
            eventId: pool.eventId,
            recipient: organizerAddress,
            amount: amount,
            timestamp: block.timestamp,
            transactionHash: bytes32(0),
            distType: DistributionType.OrganizerTransfer
        });
        
        poolDistributions[poolId].push(distributionId);
        
        emit FundsTransferred(poolId, address(this), organizerAddress, amount, bytes32(0), block.timestamp);
        emit DistributionExecuted(distributionId, poolId, organizerAddress, amount, DistributionType.OrganizerTransfer, bytes32(0), block.timestamp);
    }
    
    /**
     * @dev 退款给赞助商（申请驳回后）
     * @param poolId 奖金池ID
     */
    function refundToSponsor(uint256 poolId)
        external
        onlyOwner
        nonReentrant
        onlyValidPool(poolId)
        onlyActivePool(poolId)
    {
        PrizePoolRecord storage pool = prizePools[poolId];
        require(
            pool.poolType == PoolType.LongTermSponsor || pool.poolType == PoolType.EventSponsor,
            "Only sponsor pool"
        );
        
        address recipient = pool.creator;
        uint256 amount = pool.amount;
        pool.status = PoolStatus.Refunded;
        
        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Refund failed");
        
        emit PrizePoolRefunded(poolId, pool.eventId, recipient, amount, bytes32(0), block.timestamp);
        emit FundsTransferred(poolId, address(this), recipient, amount, bytes32(0), block.timestamp);
    }
    
    /**
     * @dev 分发奖金给队伍（活动结果公布后）
     * @param eventId 活动ID
     * @param teamAddresses 队伍钱包地址数组（按名次排序）
     * @param amounts 分发金额数组
     */
    function distributePrizes(
        uint256 eventId,
        address[] calldata teamAddresses,
        uint256[] calldata amounts
    )
        external
        onlyOwner
        nonReentrant
        whenNotPaused
        onlyValidEvent(eventId)
    {
        require(teamAddresses.length == amounts.length, "Arrays length mismatch");
        require(teamAddresses.length > 0, "No teams to distribute");
        
        uint256[] memory poolIds = eventPools[eventId];
        require(poolIds.length > 0, "No prize pools for this event");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        
        // 检查所有奖金池的总余额是否足够
        uint256 availableBalance = 0;
        for (uint256 i = 0; i < poolIds.length; i++) {
            if (prizePools[poolIds[i]].status == PoolStatus.Active) {
                availableBalance += prizePools[poolIds[i]].amount;
            }
        }
        require(availableBalance >= totalAmount, "Insufficient balance");
        
        // 分发奖金
        uint256 distributedCount = 0;
        for (uint256 i = 0; i < teamAddresses.length; i++) {
            if (amounts[i] > 0 && teamAddresses[i] != address(0)) {
                // 从奖金池中按比例提取资金
                uint256 remainingAmount = amounts[i];
                for (uint256 j = 0; j < poolIds.length && remainingAmount > 0; j++) {
                    PrizePoolRecord storage pool = prizePools[poolIds[j]];
                    if (pool.status == PoolStatus.Active) {
                        uint256 poolAmount = pool.amount;
                        uint256 poolContribution = (poolAmount * amounts[i]) / totalAmount;
                        if (poolContribution > remainingAmount) {
                            poolContribution = remainingAmount;
                        }
                        
                        if (poolContribution > 0) {
                            (bool success, ) = teamAddresses[i].call{value: poolContribution}("");
                            require(success, "Distribution failed");
                            
                            pool.amount -= poolContribution;
                            if (pool.amount == 0) {
                                pool.status = PoolStatus.Distributed;
                            }
                            
                            uint256 distributionId = ++distributionIdCounter;
                            distributions[distributionId] = DistributionRecord({
                                distributionId: distributionId,
                                poolId: poolIds[j],
                                eventId: eventId,
                                recipient: teamAddresses[i],
                                amount: poolContribution,
                                timestamp: block.timestamp,
                                transactionHash: bytes32(0),
                                distType: DistributionType.TeamPrize
                            });
                            
                            poolDistributions[poolIds[j]].push(distributionId);
                            
                            emit DistributionExecuted(
                                distributionId,
                                poolIds[j],
                                teamAddresses[i],
                                poolContribution,
                                DistributionType.TeamPrize,
                                bytes32(0),
                                block.timestamp
                            );
                            
                            remainingAmount -= poolContribution;
                        }
                    }
                }
                
                distributedCount++;
            }
        }
        
        // 更新奖金池状态
        for (uint256 i = 0; i < poolIds.length; i++) {
            PrizePoolRecord storage pool = prizePools[poolIds[i]];
            if (pool.status == PoolStatus.Active && pool.amount == 0) {
                pool.status = PoolStatus.Distributed;
            }
        }
        
        emit PrizePoolDistributed(eventPools[eventId][0], eventId, totalAmount, distributedCount, block.timestamp);
    }
    
    /**
     * @dev 分发队伍奖金给队员（根据分成比例）
     * @param teamAddress 队伍钱包地址
     * @param memberAddresses 队员钱包地址数组
     * @param memberAmounts 队员应得金额数组
     */
    function distributeToMembers(
        address teamAddress,
        address[] calldata memberAddresses,
        uint256[] calldata memberAmounts
    )
        external
        onlyOwner
        nonReentrant
        whenNotPaused
    {
        require(memberAddresses.length == memberAmounts.length, "Arrays length mismatch");
        require(memberAddresses.length > 0, "No members to distribute");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < memberAmounts.length; i++) {
            totalAmount += memberAmounts[i];
        }
        
        // 从队伍地址提取资金并分发
        (bool success, ) = teamAddress.call{value: 0}("");
        require(success, "Team address check failed");
        
        for (uint256 i = 0; i < memberAddresses.length; i++) {
            if (memberAmounts[i] > 0 && memberAddresses[i] != address(0)) {
                (bool memberSuccess, ) = memberAddresses[i].call{value: memberAmounts[i]}("");
                require(memberSuccess, "Member distribution failed");
                
                uint256 distributionId = ++distributionIdCounter;
                distributions[distributionId] = DistributionRecord({
                    distributionId: distributionId,
                    poolId: 0,
                    eventId: 0,
                    recipient: memberAddresses[i],
                    amount: memberAmounts[i],
                    timestamp: block.timestamp,
                    transactionHash: bytes32(0),
                    distType: DistributionType.TeamMember
                });
                
                emit DistributionExecuted(
                    distributionId,
                    0,
                    memberAddresses[i],
                    memberAmounts[i],
                    DistributionType.TeamMember,
                    bytes32(0),
                    block.timestamp
                );
            }
        }
    }
    
    /**
     * @dev 查询奖金池信息
     * @param poolId 奖金池ID
     * @return 奖金池记录
     */
    function getPrizePool(uint256 poolId) external view returns (PrizePoolRecord memory) {
        return prizePools[poolId];
    }
    
    /**
     * @dev 查询活动的所有奖金池ID
     * @param eventId 活动ID
     * @return 奖金池ID数组
     */
    function getEventPools(uint256 eventId) external view returns (uint256[] memory) {
        return eventPools[eventId];
    }
    
    /**
     * @dev 查询奖金池的所有分发记录ID
     * @param poolId 奖金池ID
     * @return 分发记录ID数组
     */
    function getPoolDistributions(uint256 poolId) external view returns (uint256[] memory) {
        return poolDistributions[poolId];
    }
    
    /**
     * @dev 查询分发记录
     * @param distributionId 分发记录ID
     * @return 分发记录
     */
    function getDistribution(uint256 distributionId) external view returns (DistributionRecord memory) {
        return distributions[distributionId];
    }
    
    /**
     * @dev 查询活动奖金分配规则
     * @param eventId 活动ID
     * @return 分配规则
     */
    function getDistributionRule(uint256 eventId) external view returns (PrizeDistributionRule memory) {
        return distributionRules[eventId];
    }
    
    /**
     * @dev 获取合约余额
     * @return 合约余额（wei）
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev 紧急暂停功能（仅所有者）
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev 恢复功能（仅所有者）
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev 接收以太币
     */
    receive() external payable {}
    
    /**
     * @dev 回退函数
     */
    fallback() external payable {}
}
```

## 6. 后端接口设计

### 6.1 Go 结构体定义

```go
// 奖金池记录结构体
type PrizePoolRecord struct {
    PoolID          uint64    `json:"pool_id" gorm:"column:pool_id"`
    EventID         uint64    `json:"event_id" gorm:"column:event_id"`
    Creator         string    `json:"creator" gorm:"column:creator"`
    Amount          string    `json:"amount" gorm:"column:amount"` // 使用字符串存储大整数
    Timestamp       int64     `json:"timestamp" gorm:"column:timestamp"`
    PoolType        string    `json:"pool_type" gorm:"column:pool_type"`
    Status          string    `json:"status" gorm:"column:status"`
    ContractAddress string    `json:"contract_address" gorm:"column:contract_address"`
    TransactionHash string    `json:"transaction_hash" gorm:"column:transaction_hash"`
    CreatedAt       time.Time `json:"created_at" gorm:"column:created_at"`
    UpdatedAt       time.Time `json:"updated_at" gorm:"column:updated_at"`
}

// 分发记录结构体
type DistributionRecord struct {
    DistributionID  uint64    `json:"distribution_id" gorm:"column:distribution_id"`
    PoolID          uint64    `json:"pool_id" gorm:"column:pool_id"`
    EventID         uint64    `json:"event_id" gorm:"column:event_id"`
    Recipient       string    `json:"recipient" gorm:"column:recipient"`
    Amount          string    `json:"amount" gorm:"column:amount"`
    Timestamp       int64     `json:"timestamp" gorm:"column:timestamp"`
    TransactionHash string    `json:"transaction_hash" gorm:"column:transaction_hash"`
    DistType        string    `json:"dist_type" gorm:"column:dist_type"`
    CreatedAt       time.Time `json:"created_at" gorm:"column:created_at"`
    UpdatedAt       time.Time `json:"updated_at" gorm:"column:updated_at"`
}

// 创建活动奖金池请求
type CreateEventPrizePoolRequest struct {
    EventID uint64 `json:"event_id" binding:"required"`
    Amount  string `json:"amount" binding:"required"` // 以太币金额（字符串格式）
}

// 创建赞助商资金池请求
type CreateSponsorPoolRequest struct {
    EventID     uint64 `json:"event_id" binding:"required"`
    Amount      string `json:"amount" binding:"required"`
    SponsorType string `json:"sponsor_type" binding:"required,oneof=long_term event_specific"`
}

// 分发奖金请求
type DistributePrizesRequest struct {
    EventID       uint64   `json:"event_id" binding:"required"`
    TeamAddresses []string `json:"team_addresses" binding:"required"`
    Amounts       []string `json:"amounts" binding:"required"`
}

// 转给主办方请求
type TransferToOrganizerRequest struct {
    PoolID           uint64 `json:"pool_id" binding:"required"`
    OrganizerAddress string `json:"organizer_address" binding:"required"`
}

// 退款请求
type RefundRequest struct {
    PoolID uint64 `json:"pool_id" binding:"required"`
}

// 响应结构
type PrizePoolResponse struct {
    Success         bool   `json:"success"`
    Message         string `json:"message"`
    PoolID          uint64 `json:"pool_id,omitempty"`
    TransactionHash string `json:"transaction_hash,omitempty"`
}

type DistributionResponse struct {
    Success         bool     `json:"success"`
    Message         string   `json:"message"`
    DistributionIDs []uint64 `json:"distribution_ids,omitempty"`
    TransactionHashes []string `json:"transaction_hashes,omitempty"`
}
```

### 6.2 API 接口

```go
// CreateEventPrizePool godoc
// @Summary 创建活动奖金池（主办方功能）
// @Description 主办方创建活动时，创建智能合约托管奖金
// @Tags sponsor
// @Accept json
// @Produce json
// @Param request body CreateEventPrizePoolRequest true "创建奖金池请求"
// @Success 200 {object} PrizePoolResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/sponsor/event-prize-pool [post]
func (h *SponsorHandler) CreateEventPrizePool(c *gin.Context) {
    var req CreateEventPrizePoolRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, ErrorResponse{
            Error: "Invalid request format",
            Details: err.Error(),
        })
        return
    }
    
    // 1. 验证活动是否存在
    event, err := h.eventService.GetEventByID(req.EventID)
    if err != nil {
        c.JSON(http.StatusBadRequest, ErrorResponse{
            Error: "Event not found",
        })
        return
    }
    
    // 2. 验证主办方权限
    organizerID := h.getOrganizerID(c)
    if event.OrganizerID != organizerID {
        c.JSON(http.StatusForbidden, ErrorResponse{
            Error: "Not authorized",
        })
        return
    }
    
    // 3. 检查钱包余额
    amountWei, err := h.convertEthToWei(req.Amount)
    if err != nil {
        c.JSON(http.StatusBadRequest, ErrorResponse{
            Error: "Invalid amount format",
            Details: err.Error(),
        })
        return
    }
    
    // 估算 Gas 费
    estimatedGas, err := h.blockchainService.EstimateGas()
    if err != nil {
        c.JSON(http.StatusInternalServerError, ErrorResponse{
            Error: "Failed to estimate gas",
        })
        return
    }
    
    balance, err := h.blockchainService.GetBalance(organizerAddress)
    if err != nil {
        c.JSON(http.StatusInternalServerError, ErrorResponse{
            Error: "Failed to check balance",
        })
        return
    }
    
    requiredBalance := new(big.Int).Add(amountWei, estimatedGas)
    if balance.Cmp(requiredBalance) < 0 {
        c.JSON(http.StatusBadRequest, ErrorResponse{
            Error: fmt.Sprintf("Insufficient balance. Required: %s, Available: %s", 
                requiredBalance.String(), balance.String()),
        })
        return
    }
    
    // 4. 调用智能合约创建奖金池
    poolID, txHash, err := h.blockchainService.CreateEventPrizePool(req.EventID, amountWei)
    if err != nil {
        c.JSON(http.StatusInternalServerError, ErrorResponse{
            Error: "Failed to create prize pool",
            Details: err.Error(),
        })
        return
    }
    
    // 5. 保存到数据库
    poolRecord := &PrizePoolRecord{
        PoolID:          poolID,
        EventID:         req.EventID,
        Creator:         organizerAddress,
        Amount:          amountWei.String(),
        Timestamp:       time.Now().Unix(),
        PoolType:        "event_prize",
        Status:          "active",
        ContractAddress: h.blockchainService.GetContractAddress(),
        TransactionHash: txHash,
    }
    
    if err := h.db.Create(poolRecord).Error; err != nil {
        log.Printf("Failed to save prize pool record: %v", err)
    }
    
    c.JSON(http.StatusOK, PrizePoolResponse{
        Success:         true,
        Message:         "Prize pool created successfully",
        PoolID:          poolID,
        TransactionHash: txHash,
    })
}

// CreateSponsorPool godoc
// @Summary 创建赞助商资金池（长期赞助商功能）
// @Description 长期赞助商申请活动时，创建智能合约托管赞助金额
// @Tags sponsor
// @Accept json
// @Produce json
// @Param request body CreateSponsorPoolRequest true "创建赞助池请求"
// @Success 200 {object} PrizePoolResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/sponsor/sponsor-pool [post]
func (h *SponsorHandler) CreateSponsorPool(c *gin.Context) {
    var req CreateSponsorPoolRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, ErrorResponse{
            Error: "Invalid request format",
            Details: err.Error(),
        })
        return
    }
    
    // 1. 验证赞助商权限
    sponsorID := h.getSponsorID(c)
    sponsor, err := h.sponsorService.GetSponsorByID(sponsorID)
    if err != nil {
        c.JSON(http.StatusForbidden, ErrorResponse{
            Error: "Sponsor not found",
        })
        return
    }
    
    // 2. 验证赞助类型匹配
    if sponsor.SponsorType != req.SponsorType {
        c.JSON(http.StatusBadRequest, ErrorResponse{
            Error: "Sponsor type mismatch",
        })
        return
    }
    
    // 3. 检查钱包余额
    amountWei, err := h.convertEthToWei(req.Amount)
    if err != nil {
        c.JSON(http.StatusBadRequest, ErrorResponse{
            Error: "Invalid amount format",
        })
        return
    }
    
    sponsorAddress := sponsor.User.WalletAddress
    balance, err := h.blockchainService.GetBalance(sponsorAddress)
    if err != nil {
        c.JSON(http.StatusInternalServerError, ErrorResponse{
            Error: "Failed to check balance",
        })
        return
    }
    
    estimatedGas, _ := h.blockchainService.EstimateGas()
    requiredBalance := new(big.Int).Add(amountWei, estimatedGas)
    if balance.Cmp(requiredBalance) < 0 {
        c.JSON(http.StatusBadRequest, ErrorResponse{
            Error: fmt.Sprintf("Insufficient balance. Required: %s", requiredBalance.String()),
        })
        return
    }
    
    // 4. 调用智能合约创建赞助池
    poolType := "long_term_sponsor"
    if req.SponsorType == "event_specific" {
        poolType = "event_sponsor"
    }
    
    poolID, txHash, err := h.blockchainService.CreateSponsorPool(req.EventID, amountWei, poolType)
    if err != nil {
        c.JSON(http.StatusInternalServerError, ErrorResponse{
            Error: "Failed to create sponsor pool",
            Details: err.Error(),
        })
        return
    }
    
    // 5. 保存到数据库
    poolRecord := &PrizePoolRecord{
        PoolID:          poolID,
        EventID:         req.EventID,
        Creator:         sponsorAddress,
        Amount:          amountWei.String(),
        Timestamp:       time.Now().Unix(),
        PoolType:        poolType,
        Status:          "active",
        ContractAddress: h.blockchainService.GetContractAddress(),
        TransactionHash: txHash,
    }
    
    if err := h.db.Create(poolRecord).Error; err != nil {
        log.Printf("Failed to save sponsor pool record: %v", err)
    }
    
    c.JSON(http.StatusOK, PrizePoolResponse{
        Success:         true,
        Message:         "Sponsor pool created successfully",
        PoolID:          poolID,
        TransactionHash: txHash,
    })
}

// TransferToOrganizer godoc
// @Summary 将赞助资金转入主办方钱包（申请通过后）
// @Description 主办方通过赞助申请后，将托管的赞助金额转入主办方钱包
// @Tags sponsor
// @Accept json
// @Produce json
// @Param request body TransferToOrganizerRequest true "转账请求"
// @Success 200 {object} DistributionResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/sponsor/transfer-to-organizer [post]
func (h *SponsorHandler) TransferToOrganizer(c *gin.Context) {
    var req TransferToOrganizerRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, ErrorResponse{
            Error: "Invalid request format",
        })
        return
    }
    
    // 1. 验证主办方权限
    organizerID := h.getOrganizerID(c)
    
    // 2. 查询奖金池信息
    var poolRecord PrizePoolRecord
    if err := h.db.Where("pool_id = ?", req.PoolID).First(&poolRecord).Error; err != nil {
        c.JSON(http.StatusNotFound, ErrorResponse{
            Error: "Pool not found",
        })
        return
    }
    
    // 3. 验证奖金池状态和类型
    if poolRecord.Status != "active" {
        c.JSON(http.StatusBadRequest, ErrorResponse{
            Error: "Pool is not active",
        })
        return
    }
    
    if poolRecord.PoolType != "long_term_sponsor" {
        c.JSON(http.StatusBadRequest, ErrorResponse{
            Error: "Only long-term sponsor pool can be transferred",
        })
        return
    }
    
    // 4. 调用智能合约转账
    txHash, err := h.blockchainService.TransferToOrganizer(req.PoolID, req.OrganizerAddress)
    if err != nil {
        c.JSON(http.StatusInternalServerError, ErrorResponse{
            Error: "Failed to transfer funds",
            Details: err.Error(),
        })
        return
    }
    
    // 5. 更新数据库记录
    poolRecord.Status = "distributed"
    poolRecord.TransactionHash = txHash
    h.db.Save(&poolRecord)
    
    c.JSON(http.StatusOK, DistributionResponse{
        Success:         true,
        Message:         "Funds transferred successfully",
        TransactionHashes: []string{txHash},
    })
}

// RefundToSponsor godoc
// @Summary 退款给赞助商（申请驳回后）
// @Description 主办方驳回赞助申请后，将托管的赞助金额原路返回给赞助商
// @Tags sponsor
// @Accept json
// @Produce json
// @Param request body RefundRequest true "退款请求"
// @Success 200 {object} DistributionResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/sponsor/refund [post]
func (h *SponsorHandler) RefundToSponsor(c *gin.Context) {
    var req RefundRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, ErrorResponse{
            Error: "Invalid request format",
        })
        return
    }
    
    // 1. 验证主办方权限
    organizerID := h.getOrganizerID(c)
    
    // 2. 查询奖金池信息
    var poolRecord PrizePoolRecord
    if err := h.db.Where("pool_id = ?", req.PoolID).First(&poolRecord).Error; err != nil {
        c.JSON(http.StatusNotFound, ErrorResponse{
            Error: "Pool not found",
        })
        return
    }
    
    // 3. 验证奖金池状态和类型
    if poolRecord.Status != "active" {
        c.JSON(http.StatusBadRequest, ErrorResponse{
            Error: "Pool is not active",
        })
        return
    }
    
    if poolRecord.PoolType != "long_term_sponsor" && poolRecord.PoolType != "event_sponsor" {
        c.JSON(http.StatusBadRequest, ErrorResponse{
            Error: "Only sponsor pool can be refunded",
        })
        return
    }
    
    // 4. 调用智能合约退款
    txHash, err := h.blockchainService.RefundToSponsor(req.PoolID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, ErrorResponse{
            Error: "Failed to refund",
            Details: err.Error(),
        })
        return
    }
    
    // 5. 更新数据库记录
    poolRecord.Status = "refunded"
    poolRecord.TransactionHash = txHash
    h.db.Save(&poolRecord)
    
    c.JSON(http.StatusOK, DistributionResponse{
        Success:         true,
        Message:         "Refund successful",
        TransactionHashes: []string{txHash},
    })
}

// DistributePrizes godoc
// @Summary 分发奖金（活动结果公布后）
// @Description 活动结果公布后，根据比赛结果自动分发奖金
// @Tags sponsor
// @Accept json
// @Produce json
// @Param request body DistributePrizesRequest true "分发奖金请求"
// @Success 200 {object} DistributionResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/sponsor/distribute-prizes [post]
func (h *SponsorHandler) DistributePrizes(c *gin.Context) {
    var req DistributePrizesRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, ErrorResponse{
            Error: "Invalid request format",
        })
        return
    }
    
    // 1. 验证活动状态
    event, err := h.eventService.GetEventByID(req.EventID)
    if err != nil {
        c.JSON(http.StatusBadRequest, ErrorResponse{
            Error: "Event not found",
        })
        return
    }
    
    if !event.IsEnded() {
        c.JSON(http.StatusBadRequest, ErrorResponse{
            Error: "Event has not ended",
        })
        return
    }
    
    // 2. 验证数组长度
    if len(req.TeamAddresses) != len(req.Amounts) {
        c.JSON(http.StatusBadRequest, ErrorResponse{
            Error: "Team addresses and amounts length mismatch",
        })
        return
    }
    
    // 3. 转换金额为 wei
    amountsWei := make([]*big.Int, len(req.Amounts))
    for i, amountStr := range req.Amounts {
        amountWei, err := h.convertEthToWei(amountStr)
        if err != nil {
            c.JSON(http.StatusBadRequest, ErrorResponse{
                Error: fmt.Sprintf("Invalid amount at index %d", i),
            })
            return
        }
        amountsWei[i] = amountWei
    }
    
    // 4. 调用智能合约分发奖金
    distributionIDs, txHashes, err := h.blockchainService.DistributePrizes(
        req.EventID,
        req.TeamAddresses,
        amountsWei,
    )
    if err != nil {
        c.JSON(http.StatusInternalServerError, ErrorResponse{
            Error: "Failed to distribute prizes",
            Details: err.Error(),
        })
        return
    }
    
    // 5. 保存分发记录到数据库
    for i, distID := range distributionIDs {
        distRecord := &DistributionRecord{
            DistributionID:  distID,
            EventID:         req.EventID,
            Recipient:       req.TeamAddresses[i],
            Amount:          amountsWei[i].String(),
            Timestamp:       time.Now().Unix(),
            TransactionHash: txHashes[i],
            DistType:        "team_prize",
        }
        h.db.Create(distRecord)
    }
    
    c.JSON(http.StatusOK, DistributionResponse{
        Success:         true,
        Message:         "Prizes distributed successfully",
        DistributionIDs: distributionIDs,
        TransactionHashes: txHashes,
    })
}

// GetFundingChain godoc
// @Summary 查询资金链路
// @Description 查询活动的所有资金流向和交易记录
// @Tags sponsor
// @Accept json
// @Produce json
// @Param event_id path uint64 true "活动 ID"
// @Success 200 {object} FundingChainResponse
// @Failure 400 {object} ErrorResponse
// @Router /api/v1/sponsor/funding-chain/{event_id} [get]
func (h *SponsorHandler) GetFundingChain(c *gin.Context) {
    eventID, err := strconv.ParseUint(c.Param("event_id"), 10, 64)
    if err != nil {
        c.JSON(http.StatusBadRequest, ErrorResponse{
            Error: "Invalid event ID",
        })
        return
    }
    
    // 1. 查询活动的所有奖金池
    var pools []PrizePoolRecord
    h.db.Where("event_id = ?", eventID).Find(&pools)
    
    // 2. 查询所有分发记录
    var distributions []DistributionRecord
    h.db.Where("event_id = ?", eventID).Find(&distributions)
    
    // 3. 从链上获取最新数据并对比
    chainPools, err := h.blockchainService.GetEventPools(eventID)
    if err != nil {
        log.Printf("Failed to get chain pools: %v", err)
    }
    
    c.JSON(http.StatusOK, gin.H{
        "event_id":     eventID,
        "pools":        pools,
        "distributions": distributions,
        "chain_pools":  chainPools,
    })
}
```

### 6.3 区块链服务

```go
type SponsorBlockchainService struct {
    client      *ethclient.Client
    contract    *PrizePoolContract
    privateKey  *ecdsa.PrivateKey
    chainID     *big.Int
    contractAddr common.Address
}

func NewSponsorBlockchainService(config *config.BlockchainConfig) (*SponsorBlockchainService, error) {
    client, err := ethclient.Dial(config.RPCEndpoint)
    if err != nil {
        return nil, fmt.Errorf("failed to connect to blockchain: %w", err)
    }
    
    privateKey, err := crypto.HexToECDSA(config.PrivateKey)
    if err != nil {
        return nil, fmt.Errorf("invalid private key: %w", err)
    }
    
    chainID := big.NewInt(int64(config.ChainID))
    contractAddr := common.HexToAddress(config.PrizePoolContractAddress)
    
    contract, err := contracts.NewPrizePoolContract(contractAddr, client)
    if err != nil {
        return nil, fmt.Errorf("failed to create contract instance: %w", err)
    }
    
    return &SponsorBlockchainService{
        client:      client,
        contract:    contract,
        privateKey:  privateKey,
        chainID:     chainID,
        contractAddr: contractAddr,
    }, nil
}

func (s *SponsorBlockchainService) CreateEventPrizePool(eventID uint64, amount *big.Int) (uint64, string, error) {
    auth, err := bind.NewKeyedTransactorWithChainID(s.privateKey, s.chainID)
    if err != nil {
        return 0, "", err
    }
    
    auth.Value = amount
    auth.GasLimit = uint64(300000)
    auth.GasPrice, err = s.client.SuggestGasPrice(context.Background())
    if err != nil {
        return 0, "", err
    }
    
    tx, err := s.contract.CreateEventPrizePool(auth, big.NewInt(int64(eventID)))
    if err != nil {
        return 0, "", err
    }
    
    // 等待交易确认
    receipt, err := bind.WaitMinted(context.Background(), s.client, tx)
    if err != nil {
        return 0, "", err
    }
    
    // 从事件中获取 poolId
    poolID, err := s.getPoolIDFromEvent(receipt)
    if err != nil {
        return 0, "", err
    }
    
    return poolID, tx.Hash().Hex(), nil
}

func (s *SponsorBlockchainService) CreateSponsorPool(eventID uint64, amount *big.Int, poolType string) (uint64, string, error) {
    auth, err := bind.NewKeyedTransactorWithChainID(s.privateKey, s.chainID)
    if err != nil {
        return 0, "", err
    }
    
    auth.Value = amount
    auth.GasLimit = uint64(300000)
    auth.GasPrice, err = s.client.SuggestGasPrice(context.Background())
    if err != nil {
        return 0, "", err
    }
    
    var sponsorType contracts.PrizePoolContractPoolType
    if poolType == "long_term_sponsor" {
        sponsorType = contracts.PrizePoolContractLongTermSponsor
    } else {
        sponsorType = contracts.PrizePoolContractEventSponsor
    }
    
    tx, err := s.contract.CreateSponsorPool(auth, big.NewInt(int64(eventID)), sponsorType)
    if err != nil {
        return 0, "", err
    }
    
    receipt, err := bind.WaitMinted(context.Background(), s.client, tx)
    if err != nil {
        return 0, "", err
    }
    
    poolID, err := s.getPoolIDFromEvent(receipt)
    if err != nil {
        return 0, "", err
    }
    
    return poolID, tx.Hash().Hex(), nil
}

func (s *SponsorBlockchainService) TransferToOrganizer(poolID uint64, organizerAddress string) (string, error) {
    auth, err := bind.NewKeyedTransactorWithChainID(s.privateKey, s.chainID)
    if err != nil {
        return "", err
    }
    
    auth.GasLimit = uint64(200000)
    auth.GasPrice, err = s.client.SuggestGasPrice(context.Background())
    if err != nil {
        return "", err
    }
    
    tx, err := s.contract.TransferToOrganizer(
        auth,
        big.NewInt(int64(poolID)),
        common.HexToAddress(organizerAddress),
    )
    if err != nil {
        return "", err
    }
    
    return tx.Hash().Hex(), nil
}

func (s *SponsorBlockchainService) RefundToSponsor(poolID uint64) (string, error) {
    auth, err := bind.NewKeyedTransactorWithChainID(s.privateKey, s.chainID)
    if err != nil {
        return "", err
    }
    
    auth.GasLimit = uint64(200000)
    auth.GasPrice, err = s.client.SuggestGasPrice(context.Background())
    if err != nil {
        return "", err
    }
    
    tx, err := s.contract.RefundToSponsor(auth, big.NewInt(int64(poolID)))
    if err != nil {
        return "", err
    }
    
    return tx.Hash().Hex(), nil
}

func (s *SponsorBlockchainService) DistributePrizes(
    eventID uint64,
    teamAddresses []string,
    amounts []*big.Int,
) ([]uint64, []string, error) {
    auth, err := bind.NewKeyedTransactorWithChainID(s.privateKey, s.chainID)
    if err != nil {
        return nil, nil, err
    }
    
    auth.GasLimit = uint64(500000)
    auth.GasPrice, err = s.client.SuggestGasPrice(context.Background())
    if err != nil {
        return nil, nil, err
    }
    
    addrs := make([]common.Address, len(teamAddresses))
    for i, addr := range teamAddresses {
        addrs[i] = common.HexToAddress(addr)
    }
    
    tx, err := s.contract.DistributePrizes(
        auth,
        big.NewInt(int64(eventID)),
        addrs,
        amounts,
    )
    if err != nil {
        return nil, nil, err
    }
    
    receipt, err := bind.WaitMinted(context.Background(), s.client, tx)
    if err != nil {
        return nil, nil, err
    }
    
    // 从事件中获取所有分发ID
    distributionIDs, err := s.getDistributionIDsFromEvent(receipt)
    if err != nil {
        return nil, nil, err
    }
    
    txHashes := make([]string, len(distributionIDs))
    for i := range txHashes {
        txHashes[i] = tx.Hash().Hex()
    }
    
    return distributionIDs, txHashes, nil
}

func (s *SponsorBlockchainService) GetEventPools(eventID uint64) ([]uint64, error) {
    poolIDs, err := s.contract.GetEventPools(nil, big.NewInt(int64(eventID)))
    if err != nil {
        return nil, err
    }
    
    result := make([]uint64, len(poolIDs))
    for i, id := range poolIDs {
        result[i] = id.Uint64()
    }
    
    return result, nil
}

func (s *SponsorBlockchainService) GetBalance(address string) (*big.Int, error) {
    addr := common.HexToAddress(address)
    balance, err := s.client.BalanceAt(context.Background(), addr, nil)
    return balance, err
}

func (s *SponsorBlockchainService) EstimateGas() (*big.Int, error) {
    gasPrice, err := s.client.SuggestGasPrice(context.Background())
    if err != nil {
        return nil, err
    }
    
    // 估算 Gas Limit * Gas Price
    gasLimit := big.NewInt(300000)
    return new(big.Int).Mul(gasLimit, gasPrice), nil
}

func (s *SponsorBlockchainService) getPoolIDFromEvent(receipt *types.Receipt) (uint64, error) {
    // 解析事件获取 poolId
    // 这里需要根据实际的事件结构来实现
    return 0, nil
}

func (s *SponsorBlockchainService) getDistributionIDsFromEvent(receipt *types.Receipt) ([]uint64, error) {
    // 解析事件获取所有 distributionId
    // 这里需要根据实际的事件结构来实现
    return []uint64{}, nil
}
```

## 7. 前端集成

### 7.1 React 组件示例

```tsx
// components/CreatePrizePool.tsx
import React, { useState } from 'react';
import { Button, Input, message, Modal } from 'antd';
import { createEventPrizePool } from '../services/sponsorService';

interface CreatePrizePoolProps {
  eventId: number;
  onSuccess?: () => void;
}

export const CreatePrizePool: React.FC<CreatePrizePoolProps> = ({
  eventId,
  onSuccess,
}) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      message.error('请输入有效的金额');
      return;
    }

    setLoading(true);
    try {
      const result = await createEventPrizePool(eventId, amount);
      message.success('奖金池创建成功！');
      setVisible(false);
      setAmount('');
      onSuccess?.();
    } catch (error: any) {
      message.error(error.message || '创建失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button type="primary" onClick={() => setVisible(true)}>
        创建奖金池
      </Button>
      <Modal
        title="创建活动奖金池"
        open={visible}
        onOk={handleSubmit}
        onCancel={() => setVisible(false)}
        confirmLoading={loading}
      >
        <div>
          <label>金额 (ETH):</label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="请输入奖金金额"
          />
        </div>
      </Modal>
    </>
  );
};
```

### 7.2 API 服务

```typescript
// services/sponsorService.ts
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';

export interface CreatePrizePoolResponse {
  success: boolean;
  message: string;
  pool_id?: number;
  transaction_hash?: string;
}

export const createEventPrizePool = async (
  eventId: number,
  amount: string
): Promise<CreatePrizePoolResponse> => {
  const response = await axios.post(`${API_BASE_URL}/sponsor/event-prize-pool`, {
    event_id: eventId,
    amount,
  });
  return response.data;
};

export const createSponsorPool = async (
  eventId: number,
  amount: string,
  sponsorType: 'long_term' | 'event_specific'
): Promise<CreatePrizePoolResponse> => {
  const response = await axios.post(`${API_BASE_URL}/sponsor/sponsor-pool`, {
    event_id: eventId,
    amount,
    sponsor_type: sponsorType,
  });
  return response.data;
};

export const transferToOrganizer = async (
  poolId: number,
  organizerAddress: string
): Promise<CreatePrizePoolResponse> => {
  const response = await axios.post(`${API_BASE_URL}/sponsor/transfer-to-organizer`, {
    pool_id: poolId,
    organizer_address: organizerAddress,
  });
  return response.data;
};

export const refundToSponsor = async (
  poolId: number
): Promise<CreatePrizePoolResponse> => {
  const response = await axios.post(`${API_BASE_URL}/sponsor/refund`, {
    pool_id: poolId,
  });
  return response.data;
};

export const distributePrizes = async (
  eventId: number,
  teamAddresses: string[],
  amounts: string[]
): Promise<any> => {
  const response = await axios.post(`${API_BASE_URL}/sponsor/distribute-prizes`, {
    event_id: eventId,
    team_addresses: teamAddresses,
    amounts,
  });
  return response.data;
};

export const getFundingChain = async (eventId: number): Promise<any> => {
  const response = await axios.get(`${API_BASE_URL}/sponsor/funding-chain/${eventId}`);
  return response.data;
};
```

## 8. 部署和测试

### 8.1 合约部署脚本

```javascript
// scripts/deploy-prize-pool-contract.js
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("部署合约，使用账户:", deployer.address);
  console.log("账户余额:", ethers.utils.formatEther(await deployer.getBalance()));

  const PrizePoolContract = await ethers.getContractFactory("PrizePoolContract");
  const prizePoolContract = await PrizePoolContract.deploy();

  await prizePoolContract.deployed();

  console.log("PrizePoolContract 合约地址:", prizePoolContract.address);
  console.log("部署交易哈希:", prizePoolContract.deployTransaction.hash);
  
  // 等待几个区块确认
  console.log("等待区块确认...");
  await prizePoolContract.deployTransaction.wait(2);
  
  console.log("合约部署完成！");
  
  // 保存部署信息
  const fs = require("fs");
  const deploymentInfo = {
    network: hre.network.name,
    contract: "PrizePoolContract",
    address: prizePoolContract.address,
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync(
    "./deployments_prize_pool.json",
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

### 8.2 测试用例

```javascript
// test/PrizePoolContract.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PrizePoolContract", function () {
  let prizePoolContract;
  let owner;
  let organizer;
  let sponsor;
  let team1;
  let team2;

  beforeEach(async function () {
    [owner, organizer, sponsor, team1, team2] = await ethers.getSigners();
    
    const PrizePoolContract = await ethers.getContractFactory("PrizePoolContract");
    prizePoolContract = await PrizePoolContract.deploy();
    await prizePoolContract.deployed();
    
    // 注册活动
    await prizePoolContract.connect(owner).registerEvent(1, organizer.address);
  });

  describe("创建奖金池", function () {
    it("应该允许主办方创建活动奖金池", async function () {
      const amount = ethers.utils.parseEther("10.0");
      
      await expect(
        prizePoolContract.connect(organizer).createEventPrizePool(1, { value: amount })
      )
        .to.emit(prizePoolContract, "PrizePoolCreated")
        .withArgs(1, 1, organizer.address, amount, 0, anyValue, anyValue, anyValue);
      
      const pool = await prizePoolContract.getPrizePool(1);
      expect(pool.eventId).to.equal(1);
      expect(pool.creator).to.equal(organizer.address);
      expect(pool.amount).to.equal(amount);
      expect(pool.status).to.equal(0); // Active
    });

    it("应该允许赞助商创建赞助资金池", async function () {
      const amount = ethers.utils.parseEther("5.0");
      
      await expect(
        prizePoolContract.connect(sponsor).createSponsorPool(1, 1, { value: amount }) // 1 = LongTermSponsor
      )
        .to.emit(prizePoolContract, "PrizePoolCreated");
    });

    it("应该拒绝无效的活动ID", async function () {
      const amount = ethers.utils.parseEther("10.0");
      
      await expect(
        prizePoolContract.connect(organizer).createEventPrizePool(999, { value: amount })
      ).to.be.revertedWith("Event not registered");
    });
  });

  describe("资金转移", function () {
    beforeEach(async function () {
      const amount = ethers.utils.parseEther("5.0");
      await prizePoolContract.connect(sponsor).createSponsorPool(1, 1, { value: amount });
    });

    it("应该允许将长期赞助商资金转入主办方钱包", async function () {
      const pool = await prizePoolContract.getPrizePool(1);
      const organizerBalanceBefore = await ethers.provider.getBalance(organizer.address);
      
      await prizePoolContract.connect(owner).transferToOrganizer(1, organizer.address);
      
      const organizerBalanceAfter = await ethers.provider.getBalance(organizer.address);
      expect(organizerBalanceAfter.sub(organizerBalanceBefore)).to.equal(pool.amount);
      
      const updatedPool = await prizePoolContract.getPrizePool(1);
      expect(updatedPool.status).to.equal(1); // Distributed
    });

    it("应该允许退款给赞助商", async function () {
      const pool = await prizePoolContract.getPrizePool(1);
      const sponsorBalanceBefore = await ethers.provider.getBalance(sponsor.address);
      
      await prizePoolContract.connect(owner).refundToSponsor(1);
      
      const sponsorBalanceAfter = await ethers.provider.getBalance(sponsor.address);
      expect(sponsorBalanceAfter.sub(sponsorBalanceBefore)).to.equal(pool.amount);
      
      const updatedPool = await prizePoolContract.getPrizePool(1);
      expect(updatedPool.status).to.equal(2); // Refunded
    });
  });

  describe("奖金分发", function () {
    beforeEach(async function () {
      const amount = ethers.utils.parseEther("10.0");
      await prizePoolContract.connect(organizer).createEventPrizePool(1, { value: amount });
      
      // 设置分配规则：第一名50%，第二名30%，第三名20%
      await prizePoolContract.connect(owner).setDistributionRule(1, 5000, 3000, 2000);
    });

    it("应该正确分发奖金给队伍", async function () {
      const teamAddresses = [team1.address, team2.address];
      const amounts = [
        ethers.utils.parseEther("5.0"),  // 第一名
        ethers.utils.parseEther("3.0"),  // 第二名
      ];
      
      await expect(
        prizePoolContract.connect(owner).distributePrizes(1, teamAddresses, amounts)
      ).to.emit(prizePoolContract, "PrizePoolDistributed");
      
      const team1Balance = await ethers.provider.getBalance(team1.address);
      const team2Balance = await ethers.provider.getBalance(team2.address);
      
      // 验证余额（需要考虑Gas费用）
      expect(team1Balance).to.be.gt(0);
      expect(team2Balance).to.be.gt(0);
    });
  });
});
```

## 9. 错误处理和异常情况

### 9.1 常见错误类型

```go
type SponsorError struct {
    Code    int    `json:"code"`
    Message string `json:"message"`
    Details string `json:"details,omitempty"`
}

const (
    ErrorCodeEventNotFound          = 2001
    ErrorCodeInsufficientBalance    = 2002
    ErrorCodeInvalidPoolStatus      = 2003
    ErrorCodeInvalidPoolType        = 2004
    ErrorCodeDistributionFailed     = 2005
    ErrorCodeTransferFailed         = 2006
    ErrorCodeRefundFailed           = 2007
    ErrorCodeUnauthorized           = 2008
    ErrorCodeInvalidAmount          = 2009
    ErrorCodeGasEstimationFailed    = 2010
)
```

### 9.2 错误处理策略

1. **余额不足**：提前检查钱包余额，包括 Gas 费，给出明确的错误提示
2. **奖金池状态错误**：验证奖金池状态，确保操作合法性
3. **分发失败**：记录失败信息，支持重试机制
4. **网络异常**：实现重试机制，最大重试次数为 3 次
5. **Gas 费不足**：估算所需 Gas 费，提示用户充值

## 10. 性能优化

### 10.1 批量操作
- 支持批量分发奖金，减少交易次数
- 批量查询资金链路，提高查询效率

### 10.2 缓存策略
- Redis 缓存奖金池状态，减少链上查询次数
- 设置合理的缓存过期时间（5分钟）

### 10.3 异步处理
- 链上操作异步处理，避免阻塞用户界面
- 提供交易状态查询接口
- 使用事件监听机制更新数据库状态

## 11. 监控和日志

### 11.1 关键指标监控
- 奖金池创建成功率
- 资金分发成功率
- 平均分发时间
- Gas 费消耗
- 错误类型分布

### 11.2 日志记录
```go
func (h *SponsorHandler) logPrizePoolOperation(
    poolID uint64,
    eventID uint64,
    operation string,
    success bool,
    err error,
) {
    logFields := logrus.Fields{
        "pool_id":   poolID,
        "event_id":  eventID,
        "operation": operation,
        "success":   success,
        "timestamp": time.Now().Unix(),
    }
    
    if err != nil {
        logFields["error"] = err.Error()
    }
    
    if success {
        h.logger.WithFields(logFields).Info("Prize pool operation successful")
    } else {
        h.logger.WithFields(logFields).Error("Prize pool operation failed")
    }
}
```

## 12. 安全考虑

### 12.1 权限控制
- 只有合约所有者可以执行关键操作（分发、转账、退款）
- 只有活动主办方可以创建活动奖金池
- 只有已注册的赞助商可以创建赞助资金池

### 12.2 重入攻击防护
- 使用 OpenZeppelin 的 ReentrancyGuard 防止重入攻击
- 遵循 Checks-Effects-Interactions 模式

### 12.3 资金安全
- 所有资金操作都需要多重验证
- 使用安全的转账方式（call 方式并检查返回值）
- 实现紧急暂停功能

### 12.4 数据验证
- 严格验证所有输入参数
- 检查余额是否充足
- 验证奖金池状态和类型

---

**文档版本**: v1.0  
**创建日期**: 2024-12-30  
**最后更新**: 2024-12-30  
**维护人员**: 区块链开发团队
