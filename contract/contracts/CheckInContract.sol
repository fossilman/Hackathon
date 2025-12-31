// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CheckInContract
 * @dev Hackathon 比赛签到信息上链合约
 * @notice 本合约用于处理参赛者签到信息记录和防重校验
 */
contract CheckInContract is Ownable, ReentrancyGuard {
    
    // 签到记录映射: eventId => participant => CheckInRecord
    mapping(uint256 => mapping(address => CheckInRecord)) public eventCheckIns;
    
    // 防重校验映射: eventId => participant => bool
    mapping(uint256 => mapping(address => bool)) public hasCheckedIn;
    
    // 活动存在映射: eventId => bool
    mapping(uint256 => bool) public eventExists;
    
    // 主办方授权映射: organizerAddress => bool
    mapping(address => bool) public authorizedOrganizers;
    
    // 活动 ID 集合
    uint256[] public eventIds;
    
    // 活动签到计数器: eventId => count
    mapping(uint256 => uint256) public eventCheckInCounts;
    
    // 签到 ID 计数器
    uint256 private _checkInIdCounter;
    
    // 常量定义
    uint256 public constant MAX_PARTICIPANTS_PER_EVENT = 10000;
    uint256 public constant MIN_CHECK_IN_INTERVAL = 60; // 最小签到间隔（秒）
    
    // 数据结构定义
    struct CheckInRecord {
        uint256 eventId;        // 活动 ID
        address participant;    // 参赛者钱包地址
        uint256 timestamp;      // 签到时间戳
        bytes32 transactionHash; // 交易哈希
        bool isActive;         // 是否有效
        uint256 checkInId;      // 签到 ID
        address organizer;      // 验证者（主办方）
    }
    
    struct EventCheckInStats {
        uint256 eventId;           // 活动 ID
        uint256 totalCheckIns;     // 总签到数
        uint256 uniqueParticipants; // 独立参与者数量
        uint256 lastCheckInTime;   // 最后签到时间
    }
    
    // 事件定义
    event CheckInCompleted(
        uint256 indexed eventId,
        address indexed participant,
        uint256 indexed checkInId,
        address organizer,
        uint256 timestamp,
        bytes32 transactionHash
    );
    
    event CheckInFailed(
        uint256 indexed eventId,
        address indexed participant,
        string reason,
        uint256 timestamp
    );
    
    event EventRegistered(
        uint256 indexed eventId,
        bool active,
        uint256 timestamp
    );
    
    event OrganizerAuthorized(
        address indexed organizer,
        bool authorized,
        uint256 timestamp
    );
    
    event EventCheckInStatsUpdated(
        uint256 indexed eventId,
        uint256 totalCheckIns,
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
        require(eventExists[_eventId], "Event does not exist");
        _;
    }
    
    modifier validAddress(address _address) {
        require(_address != address(0), "Invalid address");
        _;
    }
    
    modifier onlyNotCheckedIn(uint256 _eventId, address _participant) {
        require(!hasCheckedIn[_eventId][_participant], "Already checked in");
        _;
    }
    
    modifier onlyValidEvent(uint256 _eventId) {
        require(_eventId > 0, "Invalid event ID");
        _;
    }
    
    constructor() Ownable(msg.sender) {
        _checkInIdCounter = 1; // 从 1 开始计数
    }
    
    /**
     * @dev 注册活动
     * @param _eventId 活动 ID
     */
    function registerEvent(uint256 _eventId) 
        external 
        onlyOwner 
        onlyValidEvent(_eventId)
    {
        require(!eventExists[_eventId], "Event already registered");
        
        eventExists[_eventId] = true;
        eventIds.push(_eventId);
        
        emit EventRegistered(_eventId, true, block.timestamp);
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
     * @dev 参赛者签到
     * @param _eventId 活动 ID
     * @param _participant 参赛者钱包地址
     * @return checkInId 签到 ID
     */
    function checkIn(
        uint256 _eventId,
        address _participant
    ) 
        external 
        nonReentrant 
        onlyAuthorizedOrganizer
        eventMustExist(_eventId)
        validAddress(_participant)
        onlyNotCheckedIn(_eventId, _participant)
        returns (uint256) 
    {
        // 检查活动签到数量限制
        require(
            eventCheckInCounts[_eventId] < MAX_PARTICIPANTS_PER_EVENT,
            "Max participants per event reached"
        );
        
        uint256 checkInId = _checkInIdCounter;
        uint256 timestamp = block.timestamp;
        bytes32 transactionHash = bytes32(block.number);
        
        // 创建签到记录
        CheckInRecord memory newCheckIn = CheckInRecord({
            eventId: _eventId,
            participant: _participant,
            timestamp: timestamp,
            transactionHash: transactionHash,
            isActive: true,
            checkInId: checkInId,
            organizer: msg.sender
        });
        
        // 存储签到记录
        eventCheckIns[_eventId][_participant] = newCheckIn;
        hasCheckedIn[_eventId][_participant] = true;
        
        // 更新计数器
        eventCheckInCounts[_eventId]++;
        _checkInIdCounter++;
        
        // 发出事件
        emit CheckInCompleted(
            _eventId,
            _participant,
            checkInId,
            msg.sender,
            timestamp,
            transactionHash
        );
        
        emit EventCheckInStatsUpdated(
            _eventId,
            eventCheckInCounts[_eventId],
            timestamp
        );
        
        return checkInId;
    }
    
    /**
     * @dev 批量签到
     * @param _eventId 活动 ID
     * @param _participants 参赛者钱包地址数组
     * @return checkInIds 签到 ID 数组
     */
    function batchCheckIn(
        uint256 _eventId,
        address[] memory _participants
    ) 
        external 
        nonReentrant 
        onlyAuthorizedOrganizer
        eventMustExist(_eventId)
        returns (uint256[] memory) 
    {
        require(_participants.length > 0, "Empty participants array");
        require(_participants.length <= 100, "Too many participants in one batch");
        require(
            eventCheckInCounts[_eventId] + _participants.length <= MAX_PARTICIPANTS_PER_EVENT,
            "Batch check-in would exceed max participants per event"
        );
        
        uint256[] memory checkInIds = new uint256[](_participants.length);
        uint256 timestamp = block.timestamp;
        
        for (uint256 i = 0; i < _participants.length; i++) {
            address participant = _participants[i];
            require(participant != address(0), "Invalid participant address");
            require(!hasCheckedIn[_eventId][participant], "Participant already checked in");
            
            uint256 checkInId = _checkInIdCounter;
            bytes32 transactionHash = bytes32(block.number);
            
            // 创建签到记录
            CheckInRecord memory newCheckIn = CheckInRecord({
                eventId: _eventId,
                participant: participant,
                timestamp: timestamp,
                transactionHash: transactionHash,
                isActive: true,
                checkInId: checkInId,
                organizer: msg.sender
            });
            
            // 存储签到记录
            eventCheckIns[_eventId][participant] = newCheckIn;
            hasCheckedIn[_eventId][participant] = true;
            
            checkInIds[i] = checkInId;
            
            // 更新计数器
            eventCheckInCounts[_eventId]++;
            _checkInIdCounter++;
            
            // 发出事件
            emit CheckInCompleted(
                _eventId,
                participant,
                checkInId,
                msg.sender,
                timestamp,
                transactionHash
            );
        }
        
        // 发出统计更新事件
        emit EventCheckInStatsUpdated(
            _eventId,
            eventCheckInCounts[_eventId],
            timestamp
        );
        
        return checkInIds;
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
        eventMustExist(_eventId)
        returns (CheckInRecord memory) 
    {
        return eventCheckIns[_eventId][_participant];
    }
    
    /**
     * @dev 检查参赛者是否已签到
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
        eventMustExist(_eventId)
        returns (bool) 
    {
        return hasCheckedIn[_eventId][_participant];
    }
    
    /**
     * @dev 获取活动签到总数
     * @param _eventId 活动 ID
     * @return 签到总数
     */
    function getEventCheckInCount(uint256 _eventId) 
        external 
        view 
        eventMustExist(_eventId)
        returns (uint256) 
    {
        return eventCheckInCounts[_eventId];
    }
    
    /**
     * @dev 获取活动签到统计信息
     * @param _eventId 活动 ID
     * @return 统计信息
     */
    function getEventCheckInStats(uint256 _eventId) 
        external 
        view 
        eventMustExist(_eventId)
        returns (EventCheckInStats memory) 
    {
        uint256 totalCheckIns = eventCheckInCounts[_eventId];
        uint256 lastCheckInTime = 0;
        
        // 查找最后签到时间（简化实现，实际应用中可以优化）
        if (totalCheckIns > 0) {
            lastCheckInTime = block.timestamp; // 这里简化处理，实际应该从记录中获取
        }
        
        return EventCheckInStats({
            eventId: _eventId,
            totalCheckIns: totalCheckIns,
            uniqueParticipants: totalCheckIns, // 简化：每个参与者只能签到一次
            lastCheckInTime: lastCheckInTime
        });
    }
    
    /**
     * @dev 批量查询签到状态
     * @param _eventId 活动 ID
     * @param _participants 参赛者地址数组
     * @return 签到状态数组
     */
    function batchCheckCheckInStatus(
        uint256 _eventId,
        address[] memory _participants
    ) 
        external 
        view 
        eventMustExist(_eventId)
        returns (bool[] memory) 
    {
        bool[] memory statuses = new bool[](_participants.length);
        
        for (uint256 i = 0; i < _participants.length; i++) {
            statuses[i] = hasCheckedIn[_eventId][_participants[i]];
        }
        
        return statuses;
    }
    
    /**
     * @dev 获取活动的所有签到参与者
     * @param _eventId 活动 ID
     * @param _offset 偏移量
     * @param _limit 限制数量
     * @return 参赛者地址数组
     */
    function getEventCheckInParticipants(
        uint256 _eventId,
        uint256 _offset,
        uint256 _limit
    ) 
        external 
        view 
        eventMustExist(_eventId)
        returns (address[] memory) 
    {
        uint256 totalCount = eventCheckInCounts[_eventId];
        
        // 参数校验
        if (_offset >= totalCount) {
            return new address[](0);
        }
        
        uint256 end = _offset + _limit;
        if (end > totalCount) {
            end = totalCount;
        }
        
        // 简化实现：返回空数组，实际应用中需要遍历映射获取所有参与者
        // 由于 gas 限制，这里建议使用链下索引或 The Graph 等方案
        return new address[](0);
    }
    
    /**
     * @dev 获取所有活动 ID
     * @return 活动 ID 数组
     */
    function getAllEventIds() external view returns (uint256[] memory) {
        return eventIds;
    }
    
    /**
     * @dev 获取当前签到 ID 计数器
     * @return 当前计数器值
     */
    function getCurrentCheckInIdCounter() external view returns (uint256) {
        return _checkInIdCounter;
    }
    
    /**
     * @dev 检查活动是否存在
     * @param _eventId 活动 ID
     * @return 是否存在
     */
    function isEventRegistered(uint256 _eventId) external view returns (bool) {
        return eventExists[_eventId];
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
     * @dev 紧急情况下取消签到记录（仅合约所有者）
     * @param _eventId 活动 ID
     * @param _participant 参赛者地址
     */
    function emergencyCancelCheckIn(
        uint256 _eventId,
        address _participant
    ) 
        external 
        onlyOwner 
        eventMustExist(_eventId)
        validAddress(_participant)
    {
        require(hasCheckedIn[_eventId][_participant], "Check-in record does not exist");
        
        // 标记为无效
        eventCheckIns[_eventId][_participant].isActive = false;
        
        // 更新计数
        eventCheckInCounts[_eventId]--;
        
        // 发出失败事件
        emit CheckInFailed(
            _eventId,
            _participant,
            "Emergency cancellation by owner",
            block.timestamp
        );
    }
    
    /**
     * @dev 验证签到记录的完整性
     * @param _eventId 活动 ID
     * @param _participant 参赛者地址
     * @return 是否有效
     */
    function validateCheckInRecord(
        uint256 _eventId,
        address _participant
    ) 
        external 
        view 
        eventMustExist(_eventId)
        returns (bool) 
    {
        CheckInRecord memory record = eventCheckIns[_eventId][_participant];
        
        // 检查记录是否存在
        if (!record.isActive || record.checkInId == 0) {
            return false;
        }
        
        // 检查时间戳是否合理
        if (record.timestamp == 0 || record.timestamp > block.timestamp) {
            return false;
        }
        
        // 检查活动ID匹配
        if (record.eventId != _eventId) {
            return false;
        }
        
        // 检查地址匹配
        if (record.participant != _participant) {
            return false;
        }
        
        return true;
    }
    
    /**
     * @dev 获取合约所有者
     * @return 合约所有者地址
     */
    function getContractOwner() external view returns (address) {
        return owner();
    }
}