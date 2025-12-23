// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PrizePool
 * @dev 管理奖金池和分发的智能合约
 */
contract PrizePool is Ownable, ReentrancyGuard {
    
    // 奖金池状态枚举
    enum PoolStatus { Created, Active, Distributed, Refunded }
    
    // 奖金池结构体
    struct Pool {
        uint256 eventId;
        address organizer;
        uint256 totalAmount;
        PoolStatus status;
        uint256 createdAt;
        mapping(address => uint256) contributions; // 赞助商贡献
        address[] contributors; // 贡献者列表
    }
    
    // 分配规则结构体
    struct DistributionRule {
        uint256 rank; // 排名 (1, 2, 3...)
        uint256 percentage; // 百分比 (50 = 50%)
    }
    
    // 团队分成结构体
    struct TeamShare {
        address member;
        uint256 percentage; // 百分比
    }
    
    // 赞助申请结构体
    struct SponsorshipRequest {
        uint256 eventId;
        address sponsor;
        uint256 amount;
        bool approved;
        bool processed;
        uint256 createdAt;
    }
    
    // 状态变量
    mapping(uint256 => Pool) public pools;
    mapping(uint256 => DistributionRule[]) public distributionRules;
    mapping(uint256 => mapping(uint256 => address[])) public teamMembers; // eventId => teamId => members
    mapping(uint256 => mapping(uint256 => mapping(address => uint256))) public teamShares; // eventId => teamId => member => percentage
    mapping(uint256 => SponsorshipRequest) public sponsorshipRequests;
    
    uint256 public requestCounter;
    
    // 事件定义
    event PoolCreated(uint256 indexed eventId, address indexed organizer, uint256 amount);
    event ContributionAdded(uint256 indexed eventId, address indexed contributor, uint256 amount);
    event PrizeDistributed(uint256 indexed eventId, uint256 indexed teamId, address indexed recipient, uint256 amount);
    event SponsorshipRequested(uint256 indexed requestId, uint256 indexed eventId, address indexed sponsor, uint256 amount);
    event SponsorshipApproved(uint256 indexed requestId);
    event SponsorshipRejected(uint256 indexed requestId);
    event PoolRefunded(uint256 indexed eventId, address indexed recipient, uint256 amount);
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev 创建奖金池
     * @param _eventId 活动ID
     */
    function createPool(uint256 _eventId) external payable {
        require(msg.value > 0, "Prize amount must be greater than 0");
        require(pools[_eventId].organizer == address(0), "Pool already exists");
        
        Pool storage pool = pools[_eventId];
        pool.eventId = _eventId;
        pool.organizer = msg.sender;
        pool.totalAmount = msg.value;
        pool.status = PoolStatus.Created;
        pool.createdAt = block.timestamp;
        
        emit PoolCreated(_eventId, msg.sender, msg.value);
    }
    
    /**
     * @dev 设置分配规则
     * @param _eventId 活动ID
     * @param _rules 分配规则数组
     */
    function setDistributionRules(uint256 _eventId, DistributionRule[] memory _rules) external {
        require(pools[_eventId].status == PoolStatus.Created, "Cannot modify active pool");
        
        // 清除现有规则
        delete distributionRules[_eventId];
        
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < _rules.length; i++) {
            distributionRules[_eventId].push(_rules[i]);
            totalPercentage += _rules[i].percentage;
        }
        
        require(totalPercentage == 100, "Total percentage must equal 100");
    }
    
    /**
     * @dev 设置团队分成
     * @param _eventId 活动ID
     * @param _teamId 团队ID
     * @param _shares 分成规则
     */
    function setTeamShares(uint256 _eventId, uint256 _teamId, TeamShare[] memory _shares) external {
        require(_shares.length > 0, "Team must have at least one member");
        
        // 清除现有分成
        address[] storage members = teamMembers[_eventId][_teamId];
        for (uint256 i = 0; i < members.length; i++) {
            delete teamShares[_eventId][_teamId][members[i]];
        }
        delete teamMembers[_eventId][_teamId];
        
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < _shares.length; i++) {
            teamMembers[_eventId][_teamId].push(_shares[i].member);
            teamShares[_eventId][_teamId][_shares[i].member] = _shares[i].percentage;
            totalPercentage += _shares[i].percentage;
        }
        
        require(totalPercentage == 100, "Total percentage must equal 100");
    }
    
    /**
     * @dev 申请赞助
     * @param _eventId 活动ID
     */
    function requestSponsorship(uint256 _eventId) external payable {
        require(msg.value > 0, "Sponsorship amount must be greater than 0");
        require(pools[_eventId].organizer != address(0), "Event pool does not exist");
        
        requestCounter++;
        sponsorshipRequests[requestCounter] = SponsorshipRequest({
            eventId: _eventId,
            sponsor: msg.sender,
            amount: msg.value,
            approved: false,
            processed: false,
            createdAt: block.timestamp
        });
        
        emit SponsorshipRequested(requestCounter, _eventId, msg.sender, msg.value);
    }
    
    /**
     * @dev 批准赞助申请
     * @param _requestId 申请ID
     */
    function approveSponsorshipRequest(uint256 _requestId) external nonReentrant {
        SponsorshipRequest storage request = sponsorshipRequests[_requestId];
        require(!request.processed, "Request already processed");
        
        request.approved = true;
        request.processed = true;
        
        Pool storage pool = pools[request.eventId];
        pool.totalAmount += request.amount;
        pool.contributions[request.sponsor] += request.amount;
        
        // 添加到贡献者列表
        bool isNewContributor = true;
        for (uint256 i = 0; i < pool.contributors.length; i++) {
            if (pool.contributors[i] == request.sponsor) {
                isNewContributor = false;
                break;
            }
        }
        if (isNewContributor) {
            pool.contributors.push(request.sponsor);
        }
        
        // 赞助金额已经在合约中，不需要再转账
        
        emit SponsorshipApproved(_requestId);
        emit ContributionAdded(request.eventId, request.sponsor, request.amount);
    }
    
    /**
     * @dev 拒绝赞助申请
     * @param _requestId 申请ID
     */
    function rejectSponsorshipRequest(uint256 _requestId) external nonReentrant {
        SponsorshipRequest storage request = sponsorshipRequests[_requestId];
        require(!request.processed, "Request already processed");
        
        request.processed = true;
        
        // 退还赞助金额
        payable(request.sponsor).transfer(request.amount);
        
        emit SponsorshipRejected(_requestId);
    }
    
    /**
     * @dev 分发奖金
     * @param _eventId 活动ID
     * @param _teamIds 团队ID数组
     * @param _ranks 团队排名数组
     */
    function distributePrizes(uint256 _eventId, uint256[] memory _teamIds, uint256[] memory _ranks) external nonReentrant {
        require(pools[_eventId].status == PoolStatus.Created, "Pool not ready for distribution");
        require(_teamIds.length == _ranks.length, "Arrays length mismatch");
        
        Pool storage pool = pools[_eventId];
        pool.status = PoolStatus.Distributed;
        
        for (uint256 i = 0; i < _teamIds.length; i++) {
            uint256 teamId = _teamIds[i];
            uint256 rank = _ranks[i];
            
            // 找到对应排名的分配规则
            uint256 percentage = 0;
            for (uint256 j = 0; j < distributionRules[_eventId].length; j++) {
                if (distributionRules[_eventId][j].rank == rank) {
                    percentage = distributionRules[_eventId][j].percentage;
                    break;
                }
            }
            
            if (percentage > 0) {
                uint256 teamPrize = (pool.totalAmount * percentage) / 100;
                _distributeToTeam(_eventId, teamId, teamPrize);
            }
        }
    }
    
    /**
     * @dev 分发奖金给团队成员
     * @param _eventId 活动ID
     * @param _teamId 团队ID
     * @param _totalAmount 总奖金
     */
    function _distributeToTeam(uint256 _eventId, uint256 _teamId, uint256 _totalAmount) internal {
        address[] storage members = teamMembers[_eventId][_teamId];
        
        if (members.length == 0) {
            return; // 没有团队成员设置
        }
        
        for (uint256 i = 0; i < members.length; i++) {
            address member = members[i];
            uint256 memberPercentage = teamShares[_eventId][_teamId][member];
            uint256 memberAmount = (_totalAmount * memberPercentage) / 100;
            
            if (memberAmount > 0) {
                payable(member).transfer(memberAmount);
                emit PrizeDistributed(_eventId, _teamId, member, memberAmount);
            }
        }
    }
    
    /**
     * @dev 激活奖金池
     * @param _eventId 活动ID
     */
    function activatePool(uint256 _eventId) external {
        require(pools[_eventId].status == PoolStatus.Created, "Pool already active");
        
        pools[_eventId].status = PoolStatus.Active;
    }
    
    /**
     * @dev 获取奖金池信息
     * @param _eventId 活动ID
     */
    function getPoolInfo(uint256 _eventId) external view returns (
        address organizer,
        uint256 totalAmount,
        PoolStatus status,
        uint256 createdAt
    ) {
        Pool storage pool = pools[_eventId];
        return (pool.organizer, pool.totalAmount, pool.status, pool.createdAt);
    }
    
    /**
     * @dev 获取分配规则
     * @param _eventId 活动ID
     */
    function getDistributionRules(uint256 _eventId) external view returns (DistributionRule[] memory) {
        return distributionRules[_eventId];
    }
    
    /**
     * @dev 获取团队成员
     * @param _eventId 活动ID
     * @param _teamId 团队ID
     */
    function getTeamMembers(uint256 _eventId, uint256 _teamId) external view returns (address[] memory) {
        return teamMembers[_eventId][_teamId];
    }
    
    /**
     * @dev 获取成员分成比例
     * @param _eventId 活动ID
     * @param _teamId 团队ID
     * @param _member 成员地址
     */
    function getMemberShare(uint256 _eventId, uint256 _teamId, address _member) external view returns (uint256) {
        return teamShares[_eventId][_teamId][_member];
    }
    
    /**
     * @dev 获取赞助申请信息
     * @param _requestId 申请ID
     */
    function getSponsorshipRequest(uint256 _requestId) external view returns (SponsorshipRequest memory) {
        return sponsorshipRequests[_requestId];
    }
    
    /**
     * @dev 紧急退款 (仅限合约所有者)
     * @param _eventId 活动ID
     */
    function emergencyRefund(uint256 _eventId) external onlyOwner nonReentrant {
        Pool storage pool = pools[_eventId];
        require(pool.status != PoolStatus.Distributed, "Cannot refund distributed pool");
        
        pool.status = PoolStatus.Refunded;
        
        // 退还给主办方
        if (pool.totalAmount > 0) {
            payable(pool.organizer).transfer(pool.totalAmount);
            emit PoolRefunded(_eventId, pool.organizer, pool.totalAmount);
        }
    }
}