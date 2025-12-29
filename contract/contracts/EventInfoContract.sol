// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title EventInfoContract
 * @dev 管理 Hackathon 活动信息的链上记录合约
 * @notice 本合约用于存储活动的创建、编辑、删除操作记录
 */
contract EventInfoContract is Ownable, ReentrancyGuard {
    
    // 活动信息映射: eventId => EventInfo
    mapping(uint256 => EventInfo) public events;
    
    // 活动历史记录: eventId => EventHistory[]
    mapping(uint256 => EventHistory[]) public eventHistories;
    
    // 主办方授权映射: organizerAddress => isAuthorized
    mapping(address => bool) public authorizedOrganizers;
    
    // 活动 ID 集合
    uint256[] public eventIds;
    
    // 数据结构定义
    struct EventInfo {
        uint256 eventId;
        string eventName;
        string description;
        uint256 startTime;
        uint256 endTime;
        string location;
        address organizer;
        uint256 createdAt;
        uint256 updatedAt;
        bool isDeleted;
    }
    
    struct EventHistory {
        uint256 eventId;
        uint8 operationType;
        uint256 timestamp;
        address operator;
        string changeDescription;
    }
    
    // 事件定义
    event EventCreated(
        uint256 indexed eventId,
        address indexed organizer,
        string eventName,
        uint256 startTime,
        uint256 endTime,
        uint256 timestamp
    );
    
    event EventUpdated(
        uint256 indexed eventId,
        address indexed operator,
        string changeDescription,
        uint256 timestamp
    );
    
    event EventDeleted(
        uint256 indexed eventId,
        address indexed operator,
        uint256 timestamp
    );
    
    event OrganizerAuthorized(address indexed organizer, uint256 timestamp);
    event OrganizerRevoked(address indexed organizer, uint256 timestamp);
    
    // 修饰器
    modifier onlyAuthorizedOrganizer() {
        require(
            authorizedOrganizers[msg.sender] || msg.sender == owner(),
            "Not authorized organizer"
        );
        _;
    }
    
    modifier eventExists(uint256 _eventId) {
        require(events[_eventId].eventId != 0, "Event does not exist");
        _;
    }
    
    modifier eventNotDeleted(uint256 _eventId) {
        require(!events[_eventId].isDeleted, "Event has been deleted");
        _;
    }
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev 授权主办方
     * @param _organizer 主办方地址
     */
    function authorizeOrganizer(address _organizer) external onlyOwner {
        require(_organizer != address(0), "Invalid address");
        authorizedOrganizers[_organizer] = true;
        emit OrganizerAuthorized(_organizer, block.timestamp);
    }
    
    /**
     * @dev 撤销主办方授权
     * @param _organizer 主办方地址
     */
    function revokeOrganizer(address _organizer) external onlyOwner {
        authorizedOrganizers[_organizer] = false;
        emit OrganizerRevoked(_organizer, block.timestamp);
    }
    
    /**
     * @dev 创建活动上链
     * @param _eventId 活动 ID
     * @param _eventName 活动名称
     * @param _description 活动描述
     * @param _startTime 开始时间
     * @param _endTime 结束时间
     * @param _location 活动地点
     */
    function createEvent(
        uint256 _eventId,
        string memory _eventName,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime,
        string memory _location
    ) external onlyAuthorizedOrganizer nonReentrant {
        require(_eventId != 0, "Invalid event ID");
        require(events[_eventId].eventId == 0, "Event already exists");
        require(bytes(_eventName).length > 0, "Event name cannot be empty");
        require(_startTime < _endTime, "Invalid time range");
        
        EventInfo memory newEvent = EventInfo({
            eventId: _eventId,
            eventName: _eventName,
            description: _description,
            startTime: _startTime,
            endTime: _endTime,
            location: _location,
            organizer: msg.sender,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            isDeleted: false
        });
        
        events[_eventId] = newEvent;
        eventIds.push(_eventId);
        
        // 记录历史
        _addHistory(
            _eventId,
            1, // 创建操作
            msg.sender,
            "Event created"
        );
        
        emit EventCreated(
            _eventId,
            msg.sender,
            _eventName,
            _startTime,
            _endTime,
            block.timestamp
        );
    }
    
    /**
     * @dev 编辑活动上链
     * @param _eventId 活动 ID
     * @param _eventName 活动名称
     * @param _description 活动描述
     * @param _startTime 开始时间
     * @param _endTime 结束时间
     * @param _location 活动地点
     * @param _changeDescription 变更描述
     */
    function updateEvent(
        uint256 _eventId,
        string memory _eventName,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime,
        string memory _location,
        string memory _changeDescription
    ) external 
        onlyAuthorizedOrganizer 
        eventExists(_eventId) 
        eventNotDeleted(_eventId) 
        nonReentrant 
    {
        require(bytes(_eventName).length > 0, "Event name cannot be empty");
        require(_startTime < _endTime, "Invalid time range");
        
        EventInfo storage eventInfo = events[_eventId];
        
        // 检查活动状态（已开始或已结束的活动不可编辑）
        require(block.timestamp < eventInfo.startTime, "Cannot edit started or ended event");
        
        // 更新活动信息
        eventInfo.eventName = _eventName;
        eventInfo.description = _description;
        eventInfo.startTime = _startTime;
        eventInfo.endTime = _endTime;
        eventInfo.location = _location;
        eventInfo.updatedAt = block.timestamp;
        
        // 记录历史
        _addHistory(
            _eventId,
            2, // 编辑操作
            msg.sender,
            _changeDescription
        );
        
        emit EventUpdated(
            _eventId,
            msg.sender,
            _changeDescription,
            block.timestamp
        );
    }
    
    /**
     * @dev 删除活动上链
     * @param _eventId 活动 ID
     */
    function deleteEvent(uint256 _eventId) 
        external 
        onlyAuthorizedOrganizer 
        eventExists(_eventId) 
        eventNotDeleted(_eventId) 
        nonReentrant 
    {
        EventInfo storage eventInfo = events[_eventId];
        
        // 检查活动状态（已开始或已结束的活动不可删除）
        require(block.timestamp < eventInfo.startTime, "Cannot delete started or ended event");
        
        // 标记为已删除
        eventInfo.isDeleted = true;
        eventInfo.updatedAt = block.timestamp;
        
        // 记录历史
        _addHistory(
            _eventId,
            3, // 删除操作
            msg.sender,
            "Event deleted"
        );
        
        emit EventDeleted(_eventId, msg.sender, block.timestamp);
    }
    
    /**
     * @dev 查询活动信息
     * @param _eventId 活动 ID
     * @return EventInfo 活动信息
     */
    function getEvent(uint256 _eventId) 
        external 
        view 
        eventExists(_eventId) 
        returns (EventInfo memory) 
    {
        return events[_eventId];
    }
    
    /**
     * @dev 查询活动历史记录
     * @param _eventId 活动 ID
     * @return EventHistory[] 活动历史记录数组
     */
    function getEventHistory(uint256 _eventId) 
        external 
        view 
        eventExists(_eventId) 
        returns (EventHistory[] memory) 
    {
        return eventHistories[_eventId];
    }
    
    /**
     * @dev 批量查询活动信息
     * @param _eventIds 活动 ID 数组
     * @return EventInfo[] 活动信息数组
     */
    function getEvents(uint256[] memory _eventIds) 
        external 
        view 
        returns (EventInfo[] memory) 
    {
        EventInfo[] memory result = new EventInfo[](_eventIds.length);
        for (uint256 i = 0; i < _eventIds.length; i++) {
            if (events[_eventIds[i]].eventId != 0) {
                result[i] = events[_eventIds[i]];
            }
        }
        return result;
    }
    
    /**
     * @dev 获取所有活动 ID
     * @return uint256[] 活动 ID 数组
     */
    function getAllEventIds() external view returns (uint256[] memory) {
        return eventIds;
    }
    
    /**
     * @dev 内部函数：添加历史记录
     */
    function _addHistory(
        uint256 _eventId,
        uint8 _operationType,
        address _operator,
        string memory _changeDescription
    ) private {
        EventHistory memory history = EventHistory({
            eventId: _eventId,
            operationType: _operationType,
            timestamp: block.timestamp,
            operator: _operator,
            changeDescription: _changeDescription
        });
        
        eventHistories[_eventId].push(history);
    }
}