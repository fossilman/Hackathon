// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

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
    
    modifier validAddress(address _address) {
        require(_address != address(0), "Invalid address");
        _;
    }
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev 注册活动
     * @param eventId 活动ID
     * @param organizer 主办方地址
     */
    function registerEvent(uint256 eventId, address organizer) 
        external 
        onlyOwner 
        onlyValidEvent(eventId)
        validAddress(organizer)
    {
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
     * @param sponsorType 赞助商类型
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
        validAddress(organizerAddress)
    {
        PrizePoolRecord storage pool = prizePools[poolId];
        require(pool.poolType == PoolType.LongTermSponsor, "Only long-term sponsor pool");
        
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
                distributedCount += _distributeToTeam(eventId, teamAddresses[i], amounts[i], poolIds, totalAmount);
            }
        }
        
        // 更新奖金池状态
        for (uint256 i = 0; i < poolIds.length; i++) {
            PrizePoolRecord storage pool = prizePools[poolIds[i]];
            if (pool.status == PoolStatus.Active && pool.amount == 0) {
                pool.status = PoolStatus.Distributed;
            }
        }
        
        if (poolIds.length > 0) {
            emit PrizePoolDistributed(poolIds[0], eventId, totalAmount, distributedCount, block.timestamp);
        }
    }
    
    /**
     * @dev 内部函数：分发奖金给单个队伍
     */
    function _distributeToTeam(
        uint256 eventId,
        address teamAddress,
        uint256 teamAmount,
        uint256[] memory poolIds,
        uint256 totalAmount
    ) internal returns (uint256) {
        uint256 remainingAmount = teamAmount;
        uint256 distributionCount = 0;
        
        for (uint256 j = 0; j < poolIds.length && remainingAmount > 0; j++) {
            PrizePoolRecord storage pool = prizePools[poolIds[j]];
            if (pool.status == PoolStatus.Active && pool.amount > 0) {
                uint256 poolContribution = (pool.amount * teamAmount) / totalAmount;
                if (poolContribution > remainingAmount) {
                    poolContribution = remainingAmount;
                }
                
                if (poolContribution > 0) {
                    (bool success, ) = teamAddress.call{value: poolContribution}("");
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
                        recipient: teamAddress,
                        amount: poolContribution,
                        timestamp: block.timestamp,
                        transactionHash: bytes32(0),
                        distType: DistributionType.TeamPrize
                    });
                    
                    poolDistributions[poolIds[j]].push(distributionId);
                    
                    emit DistributionExecuted(
                        distributionId,
                        poolIds[j],
                        teamAddress,
                        poolContribution,
                        DistributionType.TeamPrize,
                        bytes32(0),
                        block.timestamp
                    );
                    
                    remainingAmount -= poolContribution;
                    distributionCount++;
                }
            }
        }
        
        return distributionCount > 0 ? 1 : 0;
    }
    
    /**
     * @dev 分发队伍奖金给队员（根据分成比例）
     * @notice 注意：此函数无法直接从外部地址提取资金。实际使用中，需要在首次分发时
     *         直接根据分成比例分发给队员，或者队伍地址需要先将资金转入合约。
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
        validAddress(teamAddress)
    {
        require(memberAddresses.length == memberAmounts.length, "Arrays length mismatch");
        require(memberAddresses.length > 0, "No members to distribute");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < memberAmounts.length; i++) {
            totalAmount += memberAmounts[i];
        }
        
        // 检查队伍地址（仅用于验证）
        (bool teamCheck, ) = teamAddress.call{value: 0}("");
        require(teamCheck, "Team address check failed");
        
        // 分发资金给队员
        // 注意：此函数假设资金已经从队伍地址转入合约，或者通过其他方式已可用
        // 实际分发需要合约中有足够的余额
        require(address(this).balance >= totalAmount, "Insufficient contract balance");
        
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
