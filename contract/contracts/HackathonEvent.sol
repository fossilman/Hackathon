// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title HackathonEvent
 * @dev 管理Hackathon活动信息的智能合约
 */
contract HackathonEvent is Ownable, ReentrancyGuard {
    
    // 活动状态枚举
    enum EventStatus { Created, Active, Ended, Deleted }
    
    // 活动信息结构体
    struct Event {
        uint256 id;
        string name;
        string description;
        uint256 startTime;
        uint256 endTime;
        string location;
        address organizer;
        EventStatus status;
        uint256 createdAt;
        uint256 updatedAt;
    }
    
    // 签到记录结构体
    struct CheckIn {
        uint256 eventId;
        address participant;
        uint256 timestamp;
        bool isValid;
    }
    
    // 投票记录结构体
    struct Vote {
        uint256 eventId;
        address voter;
        uint256 projectId;
        uint256 score;
        uint256 timestamp;
        bool isRevoked;
    }
    
    // 状态变量
    mapping(uint256 => Event) public events;
    mapping(uint256 => mapping(address => CheckIn)) public checkIns;
    mapping(uint256 => mapping(address => Vote[])) public votes;
    mapping(uint256 => mapping(address => bool)) public hasCheckedIn;
    
    uint256 public eventCounter;
    
    // 事件定义
    event EventCreated(uint256 indexed eventId, string name, address indexed organizer);
    event EventUpdated(uint256 indexed eventId, string name);
    event EventDeleted(uint256 indexed eventId);
    event ParticipantCheckedIn(uint256 indexed eventId, address indexed participant);
    event VoteCasted(uint256 indexed eventId, address indexed voter, uint256 projectId, uint256 score);
    event VoteRevoked(uint256 indexed eventId, address indexed voter, uint256 voteIndex);
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev 创建活动
     * @param _name 活动名称
     * @param _description 活动描述
     * @param _startTime 开始时间
     * @param _endTime 结束时间
     * @param _location 活动地点
     */
    function createEvent(
        string memory _name,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime,
        string memory _location
    ) external returns (uint256) {
        require(_endTime > _startTime, "End time must be after start time");
        require(bytes(_name).length > 0, "Event name cannot be empty");
        
        eventCounter++;
        uint256 eventId = eventCounter;
        
        events[eventId] = Event({
            id: eventId,
            name: _name,
            description: _description,
            startTime: _startTime,
            endTime: _endTime,
            location: _location,
            organizer: msg.sender,
            status: EventStatus.Created,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });
        
        emit EventCreated(eventId, _name, msg.sender);
        return eventId;
    }
    
    /**
     * @dev 更新活动信息
     * @param _eventId 活动ID
     * @param _name 活动名称
     * @param _description 活动描述
     * @param _startTime 开始时间
     * @param _endTime 结束时间
     * @param _location 活动地点
     */
    function updateEvent(
        uint256 _eventId,
        string memory _name,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime,
        string memory _location
    ) external {
        Event storage eventInfo = events[_eventId];
        require(eventInfo.status == EventStatus.Created, "Cannot update active or ended event");
        require(_endTime > _startTime, "End time must be after start time");
        
        eventInfo.name = _name;
        eventInfo.description = _description;
        eventInfo.startTime = _startTime;
        eventInfo.endTime = _endTime;
        eventInfo.location = _location;
        eventInfo.updatedAt = block.timestamp;
        
        emit EventUpdated(_eventId, _name);
    }
    
    /**
     * @dev 删除活动
     * @param _eventId 活动ID
     */
    function deleteEvent(uint256 _eventId) external {
        Event storage eventInfo = events[_eventId];
        require(eventInfo.status == EventStatus.Created, "Cannot delete active or ended event");
        
        eventInfo.status = EventStatus.Deleted;
        eventInfo.updatedAt = block.timestamp;
        
        emit EventDeleted(_eventId);
    }
    
    /**
     * @dev 参赛者签到
     * @param _eventId 活动ID
     */
    function checkIn(uint256 _eventId) external {
        Event storage eventInfo = events[_eventId];
        require(eventInfo.status == EventStatus.Active, "Event is not active");
        require(!hasCheckedIn[_eventId][msg.sender], "Already checked in");
        
        checkIns[_eventId][msg.sender] = CheckIn({
            eventId: _eventId,
            participant: msg.sender,
            timestamp: block.timestamp,
            isValid: true
        });
        
        hasCheckedIn[_eventId][msg.sender] = true;
        
        emit ParticipantCheckedIn(_eventId, msg.sender);
    }
    
    /**
     * @dev 代理签到（由授权合约调用）
     * @param _eventId 活动ID
     * @param _participant 参赛者地址
     */
    function checkInFor(uint256 _eventId, address _participant) external {
        Event storage eventInfo = events[_eventId];
        require(eventInfo.status == EventStatus.Active, "Event is not active");
        require(!hasCheckedIn[_eventId][_participant], "Already checked in");
        
        checkIns[_eventId][_participant] = CheckIn({
            eventId: _eventId,
            participant: _participant,
            timestamp: block.timestamp,
            isValid: true
        });
        
        hasCheckedIn[_eventId][_participant] = true;
        
        emit ParticipantCheckedIn(_eventId, _participant);
    }
    
    /**
     * @dev 投票
     * @param _eventId 活动ID
     * @param _projectId 项目ID
     * @param _score 投票分数
     */
    function vote(uint256 _eventId, uint256 _projectId, uint256 _score) external {
        Event storage eventInfo = events[_eventId];
        require(eventInfo.status == EventStatus.Active, "Event is not active");
        require(hasCheckedIn[_eventId][msg.sender], "Must check in first");
        require(_score >= 1 && _score <= 10, "Score must be between 1 and 10");
        
        votes[_eventId][msg.sender].push(Vote({
            eventId: _eventId,
            voter: msg.sender,
            projectId: _projectId,
            score: _score,
            timestamp: block.timestamp,
            isRevoked: false
        }));
        
        emit VoteCasted(_eventId, msg.sender, _projectId, _score);
    }
    
    /**
     * @dev 撤销投票
     * @param _eventId 活动ID
     * @param _voteIndex 投票索引
     */
    function revokeVote(uint256 _eventId, uint256 _voteIndex) external {
        Event storage eventInfo = events[_eventId];
        require(eventInfo.status == EventStatus.Active, "Event is not active");
        require(_voteIndex < votes[_eventId][msg.sender].length, "Invalid vote index");
        require(!votes[_eventId][msg.sender][_voteIndex].isRevoked, "Vote already revoked");
        
        votes[_eventId][msg.sender][_voteIndex].isRevoked = true;
        
        emit VoteRevoked(_eventId, msg.sender, _voteIndex);
    }
    
    /**
     * @dev 激活活动
     * @param _eventId 活动ID
     */
    function activateEvent(uint256 _eventId) external {
        Event storage eventInfo = events[_eventId];
        require(eventInfo.status == EventStatus.Created, "Event already active or ended");
        
        eventInfo.status = EventStatus.Active;
        eventInfo.updatedAt = block.timestamp;
    }
    
    /**
     * @dev 结束活动
     * @param _eventId 活动ID
     */
    function endEvent(uint256 _eventId) external {
        Event storage eventInfo = events[_eventId];
        require(eventInfo.status == EventStatus.Active, "Event is not active");
        
        eventInfo.status = EventStatus.Ended;
        eventInfo.updatedAt = block.timestamp;
    }
    
    /**
     * @dev 获取活动信息
     * @param _eventId 活动ID
     */
    function getEvent(uint256 _eventId) external view returns (Event memory) {
        return events[_eventId];
    }
    
    /**
     * @dev 获取用户投票记录
     * @param _eventId 活动ID
     * @param _voter 投票者地址
     */
    function getUserVotes(uint256 _eventId, address _voter) external view returns (Vote[] memory) {
        return votes[_eventId][_voter];
    }
    
    /**
     * @dev 验证签到状态
     * @param _eventId 活动ID
     * @param _participant 参赛者地址
     */
    function isCheckedIn(uint256 _eventId, address _participant) external view returns (bool) {
        return hasCheckedIn[_eventId][_participant];
    }
}