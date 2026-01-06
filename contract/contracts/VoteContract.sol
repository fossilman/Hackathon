// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title VoteContract
 * @dev Hackathon 比赛投票信息上链合约
 * @notice 本合约用于处理参赛者投票信息记录、投票撤销和防重校验
 */
contract VoteContract is Ownable, ReentrancyGuard {
    
    // 投票记录映射: voteId => VoteRecord
    mapping(uint256 => VoteRecord) public voteRecords;
    
    // 用户活动投票映射: voter => eventId => bool
    mapping(address => mapping(uint256 => bool)) public hasVoted;
    
    // 作品投票映射: eventId => projectId => voter => bool
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public projectVotes;
    
    // 活动投票统计映射: eventId => EventVoteStats
    mapping(uint256 => EventVoteStats) private eventStats;
    
    // 作品得分映射: eventId => projectId => totalScore
    mapping(uint256 => mapping(uint256 => uint256)) private projectScores;
    
    // 活动注册映射: eventId => bool
    mapping(uint256 => bool) public registeredEvents;
    
    // 主办方授权映射: organizerAddress => bool
    mapping(address => bool) public authorizedOrganizers;
    
    // 活动 ID 集合
    uint256[] public eventIds;
    
    // 投票 ID 计数器
    uint256 public voteIdCounter;
    
    // 常量定义
    uint256 public constant MIN_SCORE = 1;
    uint256 public constant MAX_SCORE = 10;
    uint256 public constant MAX_VOTES_PER_EVENT = 100000;
    
    // 数据结构定义
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
    
    struct EventVoteStats {
        uint256 eventId;         // 活动ID
        uint256 totalVotes;      // 总投票数
        uint256 activeVotes;     // 有效投票数
        uint256 revokedVotes;    // 已撤销投票数
    }
    
    // 事件定义
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
    
    event EventRegistered(
        uint256 indexed eventId,
        address indexed organizer,
        uint256 timestamp
    );
    
    event EventUnregistered(
        uint256 indexed eventId,
        address indexed organizer,
        uint256 timestamp
    );
    
    event OrganizerAuthorized(
        address indexed organizer,
        bool authorized,
        uint256 timestamp
    );
    
    // 修饰符
    modifier onlyAuthorizedOrganizer() {
        require(
            authorizedOrganizers[msg.sender] || msg.sender == owner(),
            "Not authorized organizer"
        );
        _;
    }
    
    modifier eventMustExist(uint256 _eventId) {
        require(registeredEvents[_eventId], "Event not registered");
        _;
    }
    
    modifier validAddress(address _address) {
        require(_address != address(0), "Invalid address");
        _;
    }
    
    modifier validScore(uint8 _score) {
        require(_score >= MIN_SCORE && _score <= MAX_SCORE, "Invalid score");
        _;
    }
    
    modifier onlyValidEvent(uint256 _eventId) {
        require(_eventId > 0, "Invalid event ID");
        _;
    }
    
    constructor() Ownable(msg.sender) {
        voteIdCounter = 0;
    }

    
    /**
     * @dev 注册活动到投票合约
     * @param _eventId 活动ID
     * @param _organizer 主办方地址
     */
    function registerEvent(uint256 _eventId, address _organizer) 
        external 
        onlyOwner 
        onlyValidEvent(_eventId)
        validAddress(_organizer)
    {
        require(!registeredEvents[_eventId], "Event already registered");
        
        registeredEvents[_eventId] = true;
        eventIds.push(_eventId);
        
        eventStats[_eventId] = EventVoteStats({
            eventId: _eventId,
            totalVotes: 0,
            activeVotes: 0,
            revokedVotes: 0
        });
        
        emit EventRegistered(_eventId, _organizer, block.timestamp);
    }
    
    /**
     * @dev 注销活动
     * @param _eventId 活动ID
     */
    function unregisterEvent(uint256 _eventId) 
        external 
        onlyOwner 
        eventMustExist(_eventId)
    {
        registeredEvents[_eventId] = false;
        
        emit EventUnregistered(_eventId, msg.sender, block.timestamp);
    }
    
    /**
     * @dev 授权主办方
     * @param _organizer 主办方地址
     * @param _authorized 是否授权
     */
    function authorizeOrganizer(address _organizer, bool _authorized) 
        external 
        onlyOwner 
        validAddress(_organizer)
    {
        authorizedOrganizers[_organizer] = _authorized;
        emit OrganizerAuthorized(_organizer, _authorized, block.timestamp);
    }
    
    /**
     * @dev 参赛者投票
     * @param _eventId 活动ID
     * @param _projectId 作品ID
     * @param _score 投票分数 (1-10)
     * @return voteId 投票ID
     */
    function castVote(
        uint256 _eventId,
        uint256 _projectId,
        uint8 _score
    ) 
        external 
        nonReentrant
        eventMustExist(_eventId)
        validScore(_score)
        returns (uint256) 
    {
        require(_projectId > 0, "Invalid project ID");
        require(!hasVoted[msg.sender][_eventId], "Already voted in this event");
        require(!projectVotes[_eventId][_projectId][msg.sender], "Already voted for this project");
        require(eventStats[_eventId].totalVotes < MAX_VOTES_PER_EVENT, "Max votes per event reached");
        
        // 创建投票记录
        uint256 voteId = ++voteIdCounter;
        voteRecords[voteId] = VoteRecord({
            voteId: voteId,
            eventId: _eventId,
            projectId: _projectId,
            voter: msg.sender,
            score: _score,
            timestamp: block.timestamp,
            isActive: true,
            isRevoked: false,
            revokeTime: 0,
            txHash: ""
        });
        
        // 更新投票状态
        hasVoted[msg.sender][_eventId] = true;
        projectVotes[_eventId][_projectId][msg.sender] = true;
        
        // 更新活动统计
        eventStats[_eventId].totalVotes++;
        eventStats[_eventId].activeVotes++;
        projectScores[_eventId][_projectId] += _score;
        
        emit VoteCast(voteId, _eventId, _projectId, msg.sender, _score, block.timestamp, "");
        
        return voteId;
    }
    
    /**
     * @dev 撤销投票
     * @param _voteId 投票ID
     */
    function revokeVote(uint256 _voteId) 
        external 
        nonReentrant
    {
        VoteRecord storage vote = voteRecords[_voteId];

        // 验证投票记录
        require(vote.voteId != 0, "Vote does not exist");
        require(vote.voter == msg.sender, "Not authorized");
        require(vote.isActive && !vote.isRevoked, "Vote already revoked or inactive");

        // 更新投票记录
        vote.isRevoked = true;
        vote.isActive = false;
        vote.revokeTime = block.timestamp;

        // 清理用户在该活动和作品上的投票状态，允许其重新投票
        //
        // 设计意图：
        // - hasVoted 记录“该地址在某个活动中是否有有效投票”
        // - projectVotes 记录“该地址是否对某个作品投过有效票”
        // 撤销时将二者重置为 false，保证：
        // - 同一地址在完成撤销后，可以在同一活动中重新投票
        // - 重新投票仍然会受到 castVote 中的防重复校验约束
        hasVoted[vote.voter][vote.eventId] = false;
        projectVotes[vote.eventId][vote.projectId][vote.voter] = false;

        // 更新活动统计
        eventStats[vote.eventId].activeVotes--;
        eventStats[vote.eventId].revokedVotes++;
        projectScores[vote.eventId][vote.projectId] -= vote.score;
        
        emit VoteRevoked(_voteId, vote.eventId, vote.projectId, msg.sender, block.timestamp, "");
    }

    
    /**
     * @dev 批量投票
     * @param _eventId 活动ID
     * @param _projectIds 作品ID数组
     * @param _scores 投票分数数组
     * @return voteIds 投票ID数组
     */
    function batchCastVote(
        uint256 _eventId,
        uint256[] memory _projectIds,
        uint8[] memory _scores
    ) 
        external 
        nonReentrant
        eventMustExist(_eventId)
        returns (uint256[] memory) 
    {
        require(_projectIds.length > 0, "Empty projects array");
        require(_projectIds.length == _scores.length, "Arrays length mismatch");
        require(_projectIds.length <= 50, "Too many votes in one batch");
        require(
            eventStats[_eventId].totalVotes + _projectIds.length <= MAX_VOTES_PER_EVENT,
            "Batch voting would exceed max votes per event"
        );
        
        uint256[] memory voteIds = new uint256[](_projectIds.length);
        
        for (uint256 i = 0; i < _projectIds.length; i++) {
            uint256 projectId = _projectIds[i];
            uint8 score = _scores[i];
            
            require(projectId > 0, "Invalid project ID");
            require(score >= MIN_SCORE && score <= MAX_SCORE, "Invalid score");
            require(!projectVotes[_eventId][projectId][msg.sender], "Already voted for this project");
            
            // 创建投票记录
            uint256 voteId = ++voteIdCounter;
            voteRecords[voteId] = VoteRecord({
                voteId: voteId,
                eventId: _eventId,
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
            projectVotes[_eventId][projectId][msg.sender] = true;
            
            // 更新活动统计
            eventStats[_eventId].totalVotes++;
            eventStats[_eventId].activeVotes++;
            projectScores[_eventId][projectId] += score;
            
            voteIds[i] = voteId;
            
            emit VoteCast(voteId, _eventId, projectId, msg.sender, score, block.timestamp, "");
        }
        
        // 标记用户已在该活动中投票
        hasVoted[msg.sender][_eventId] = true;
        
        return voteIds;
    }
    
    /**
     * @dev 获取投票记录
     * @param _voteId 投票ID
     * @return 投票记录
     */
    function getVoteRecord(uint256 _voteId) 
        external 
        view 
        returns (VoteRecord memory) 
    {
        require(voteRecords[_voteId].voteId != 0, "Vote does not exist");
        return voteRecords[_voteId];
    }
    
    /**
     * @dev 获取活动投票统计
     * @param _eventId 活动ID
     * @return totalVotes 总投票数
     * @return activeVotes 有效投票数
     * @return revokedVotes 已撤销投票数
     */
    function getEventStats(uint256 _eventId) 
        external 
        view 
        eventMustExist(_eventId)
        returns (
            uint256 totalVotes,
            uint256 activeVotes,
            uint256 revokedVotes
        ) 
    {
        EventVoteStats memory stats = eventStats[_eventId];
        return (stats.totalVotes, stats.activeVotes, stats.revokedVotes);
    }
    
    /**
     * @dev 获取作品总分
     * @param _eventId 活动ID
     * @param _projectId 作品ID
     * @return 作品总分
     */
    function getProjectScore(uint256 _eventId, uint256 _projectId) 
        external 
        view 
        eventMustExist(_eventId)
        returns (uint256) 
    {
        return projectScores[_eventId][_projectId];
    }
    
    /**
     * @dev 批量获取作品总分
     * @param _eventId 活动ID
     * @param _projectIds 作品ID数组
     * @return scores 作品总分数组
     */
    function batchGetProjectScores(uint256 _eventId, uint256[] memory _projectIds) 
        external 
        view 
        eventMustExist(_eventId)
        returns (uint256[] memory) 
    {
        uint256[] memory scores = new uint256[](_projectIds.length);
        
        for (uint256 i = 0; i < _projectIds.length; i++) {
            scores[i] = projectScores[_eventId][_projectIds[i]];
        }
        
        return scores;
    }
    
    /**
     * @dev 检查用户是否已在活动中投票
     * @param _voter 投票者地址
     * @param _eventId 活动ID
     * @return 是否已投票
     */
    function hasUserVotedInEvent(address _voter, uint256 _eventId) 
        external 
        view 
        returns (bool) 
    {
        return hasVoted[_voter][_eventId];
    }
    
    /**
     * @dev 检查用户是否已对作品投票
     * @param _voter 投票者地址
     * @param _eventId 活动ID
     * @param _projectId 作品ID
     * @return 是否已投票
     */
    function hasUserVotedForProject(address _voter, uint256 _eventId, uint256 _projectId) 
        external 
        view 
        returns (bool) 
    {
        return projectVotes[_eventId][_projectId][_voter];
    }

    
    /**
     * @dev 获取用户在活动中的所有投票记录
     * @param _voter 投票者地址
     * @param _eventId 活动ID
     * @return voteIds 投票ID数组
     */
    function getUserVotesInEvent(address _voter, uint256 _eventId) 
        external 
        view 
        returns (uint256[] memory) 
    {
        uint256[] memory votes = new uint256[](voteIdCounter);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= voteIdCounter; i++) {
            VoteRecord memory vote = voteRecords[i];
            if (vote.voter == _voter && vote.eventId == _eventId) {
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
    
    /**
     * @dev 获取作品的所有投票记录
     * @param _eventId 活动ID
     * @param _projectId 作品ID
     * @return voteIds 投票ID数组
     */
    function getProjectVotes(uint256 _eventId, uint256 _projectId) 
        external 
        view 
        eventMustExist(_eventId)
        returns (uint256[] memory) 
    {
        uint256[] memory votes = new uint256[](voteIdCounter);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= voteIdCounter; i++) {
            VoteRecord memory vote = voteRecords[i];
            if (vote.eventId == _eventId && vote.projectId == _projectId && vote.isActive) {
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
    
    /**
     * @dev 获取活动的所有投票记录
     * @param _eventId 活动ID
     * @param _offset 偏移量
     * @param _limit 限制数量
     * @return voteIds 投票ID数组
     */
    function getEventVotes(uint256 _eventId, uint256 _offset, uint256 _limit) 
        external 
        view 
        eventMustExist(_eventId)
        returns (uint256[] memory) 
    {
        require(_limit > 0 && _limit <= 100, "Invalid limit");
        
        uint256[] memory votes = new uint256[](_limit);
        uint256 count = 0;
        uint256 currentOffset = 0;
        
        for (uint256 i = 1; i <= voteIdCounter && count < _limit; i++) {
            VoteRecord memory vote = voteRecords[i];
            if (vote.eventId == _eventId) {
                if (currentOffset >= _offset) {
                    votes[count] = i;
                    count++;
                }
                currentOffset++;
            }
        }
        
        // 调整数组大小
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = votes[i];
        }
        
        return result;
    }
    
    /**
     * @dev 批量获取投票记录
     * @param _voteIds 投票ID数组
     * @return votes 投票记录数组
     */
    function batchGetVoteRecords(uint256[] memory _voteIds) 
        external 
        view 
        returns (VoteRecord[] memory) 
    {
        VoteRecord[] memory votes = new VoteRecord[](_voteIds.length);
        
        for (uint256 i = 0; i < _voteIds.length; i++) {
            if (voteRecords[_voteIds[i]].voteId != 0) {
                votes[i] = voteRecords[_voteIds[i]];
            }
        }
        
        return votes;
    }
    
    /**
     * @dev 获取所有活动 ID
     * @return 活动 ID 数组
     */
    function getAllEventIds() external view returns (uint256[] memory) {
        return eventIds;
    }
    
    /**
     * @dev 获取当前投票 ID 计数器
     * @return 当前计数器值
     */
    function getCurrentVoteIdCounter() external view returns (uint256) {
        return voteIdCounter;
    }
    
    /**
     * @dev 检查活动是否已注册
     * @param _eventId 活动ID
     * @return 是否已注册
     */
    function isEventRegistered(uint256 _eventId) external view returns (bool) {
        return registeredEvents[_eventId];
    }
    
    /**
     * @dev 检查地址是否为授权主办方
     * @param _organizer 主办方地址
     * @return 是否授权
     */
    function isAuthorizedOrganizer(address _organizer) external view returns (bool) {
        return authorizedOrganizers[_organizer];
    }
    
    /**
     * @dev 验证投票记录的完整性
     * @param _voteId 投票ID
     * @return 是否有效
     */
    function validateVoteRecord(uint256 _voteId) 
        external 
        view 
        returns (bool) 
    {
        VoteRecord memory vote = voteRecords[_voteId];
        
        // 检查记录是否存在
        if (vote.voteId == 0) {
            return false;
        }
        
        // 检查时间戳是否合理
        if (vote.timestamp == 0 || vote.timestamp > block.timestamp) {
            return false;
        }
        
        // 检查分数范围
        if (vote.score < MIN_SCORE || vote.score > MAX_SCORE) {
            return false;
        }
        
        // 检查活动是否注册
        if (!registeredEvents[vote.eventId]) {
            return false;
        }
        
        return true;
    }

    
    /**
     * @dev 紧急情况下取消投票记录（仅合约所有者）
     * @param _voteId 投票ID
     */
    function emergencyCancelVote(uint256 _voteId) 
        external 
        onlyOwner 
    {
        VoteRecord storage vote = voteRecords[_voteId];
        
        require(vote.voteId != 0, "Vote does not exist");
        require(vote.isActive, "Vote already inactive");
        
        // 标记为无效
        vote.isActive = false;
        vote.isRevoked = true;
        vote.revokeTime = block.timestamp;
        
        // 更新活动统计
        eventStats[vote.eventId].activeVotes--;
        eventStats[vote.eventId].revokedVotes++;
        projectScores[vote.eventId][vote.projectId] -= vote.score;
        
        emit VoteRevoked(_voteId, vote.eventId, vote.projectId, vote.voter, block.timestamp, "Emergency cancellation by owner");
    }
    
    /**
     * @dev 批量撤销投票（仅合约所有者，紧急情况使用）
     * @param _voteIds 投票ID数组
     */
    function batchEmergencyCancelVotes(uint256[] memory _voteIds) 
        external 
        onlyOwner 
    {
        require(_voteIds.length > 0, "Empty vote IDs array");
        require(_voteIds.length <= 50, "Too many votes in one batch");
        
        for (uint256 i = 0; i < _voteIds.length; i++) {
            uint256 voteId = _voteIds[i];
            VoteRecord storage vote = voteRecords[voteId];
            
            if (vote.voteId != 0 && vote.isActive) {
                // 标记为无效
                vote.isActive = false;
                vote.isRevoked = true;
                vote.revokeTime = block.timestamp;
                
                // 更新活动统计
                eventStats[vote.eventId].activeVotes--;
                eventStats[vote.eventId].revokedVotes++;
                projectScores[vote.eventId][vote.projectId] -= vote.score;
                
                emit VoteRevoked(voteId, vote.eventId, vote.projectId, vote.voter, block.timestamp, "Batch emergency cancellation by owner");
            }
        }
    }
    
    /**
     * @dev 获取合约所有者
     * @return 合约所有者地址
     */
    function getContractOwner() external view returns (address) {
        return owner();
    }
    
    /**
     * @dev 获取活动投票详细统计信息
     * @param _eventId 活动ID
     * @return stats 活动投票统计信息
     */
    function getEventVoteStatsDetailed(uint256 _eventId) 
        external 
        view 
        eventMustExist(_eventId)
        returns (EventVoteStats memory) 
    {
        return eventStats[_eventId];
    }
    
    /**
     * @dev 批量检查用户在多个活动中的投票状态
     * @param _voter 投票者地址
     * @param _eventIds 活动ID数组
     * @return statuses 投票状态数组
     */
    function batchCheckVoteStatus(address _voter, uint256[] memory _eventIds) 
        external 
        view 
        returns (bool[] memory) 
    {
        bool[] memory statuses = new bool[](_eventIds.length);
        
        for (uint256 i = 0; i < _eventIds.length; i++) {
            statuses[i] = hasVoted[_voter][_eventIds[i]];
        }
        
        return statuses;
    }
    
    /**
     * @dev 获取作品的平均分数
     * @param _eventId 活动ID
     * @param _projectId 作品ID
     * @return averageScore 平均分数（乘以100，避免小数）
     * @return voteCount 投票数量
     */
    function getProjectAverageScore(uint256 _eventId, uint256 _projectId) 
        external 
        view 
        eventMustExist(_eventId)
        returns (uint256 averageScore, uint256 voteCount) 
    {
        uint256 totalScore = projectScores[_eventId][_projectId];
        uint256 count = 0;
        
        // 计算该作品的有效投票数
        for (uint256 i = 1; i <= voteIdCounter; i++) {
            VoteRecord memory vote = voteRecords[i];
            if (vote.eventId == _eventId && vote.projectId == _projectId && vote.isActive) {
                count++;
            }
        }
        
        if (count == 0) {
            return (0, 0);
        }
        
        // 返回平均分数（乘以100）和投票数量
        averageScore = (totalScore * 100) / count;
        voteCount = count;
    }
    
    /**
     * @dev 获取活动中得分最高的作品
     * @param _eventId 活动ID
     * @param _topN 返回前N名
     * @return projectIds 作品ID数组
     * @return scores 作品分数数组
     */
    function getTopProjects(uint256 _eventId, uint256 _topN) 
        external 
        view 
        eventMustExist(_eventId)
        returns (uint256[] memory projectIds, uint256[] memory scores) 
    {
        require(_topN > 0 && _topN <= 100, "Invalid top N value");
        
        // 简化实现：返回空数组
        // 实际应用中建议使用链下索引或 The Graph 等方案进行排序
        projectIds = new uint256[](0);
        scores = new uint256[](0);
        
        return (projectIds, scores);
    }
}
