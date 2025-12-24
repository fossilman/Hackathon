// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "./HackathonEvent.sol";
import "./PrizePool.sol";
import "./HackathonNFT.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title HackathonPlatform
 * @dev Hackathon平台主合约，整合所有功能
 */
contract HackathonPlatform is Ownable, ReentrancyGuard {
    
    // 合约实例
    HackathonEvent public eventContract;
    PrizePool public prizePoolContract;
    HackathonNFT public nftContract;
    
    // 平台统计
    struct PlatformStats {
        uint256 totalEvents;
        uint256 totalParticipants;
        uint256 totalPrizeDistributed;
        uint256 totalNFTsMinted;
    }
    
    PlatformStats public stats;
    
    // 事件定义
    event ContractsDeployed(address eventContract, address prizePoolContract, address nftContract);
    event EventCreatedWithPrize(uint256 indexed eventId, address indexed organizer, uint256 prizeAmount);
    event NFTBatchMinted(uint256 indexed eventId, uint256 count);
    
    constructor() Ownable(msg.sender) {
        // 部署子合约
        eventContract = new HackathonEvent();
        prizePoolContract = new PrizePool();
        nftContract = new HackathonNFT();
        
        // 授权NFT合约铸造权限给平台合约
        nftContract.authorizeMinter(address(this));
        
        emit ContractsDeployed(address(eventContract), address(prizePoolContract), address(nftContract));
    }
    
    /**
     * @dev 创建带奖金池的活动
     * @param _name 活动名称
     * @param _description 活动描述
     * @param _startTime 开始时间
     * @param _endTime 结束时间
     * @param _location 活动地点
     * @param _distributionRules 分配规则
     */
    function createEventWithPrize(
        string memory _name,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime,
        string memory _location,
        PrizePool.DistributionRule[] memory _distributionRules
    ) external payable returns (uint256) {
        require(msg.value > 0, "Prize amount must be greater than 0");
        
        // 创建活动
        uint256 eventId = eventContract.createEvent(_name, _description, _startTime, _endTime, _location);
        
        // 创建奖金池
        prizePoolContract.createPool{value: msg.value}(eventId);
        prizePoolContract.setDistributionRules(eventId, _distributionRules);
        
        // 更新统计
        stats.totalEvents++;
        stats.totalPrizeDistributed += msg.value;
        
        emit EventCreatedWithPrize(eventId, msg.sender, msg.value);
        return eventId;
    }
    
    /**
     * @dev 参赛者签到并铸造NFT
     * @param _eventId 活动ID
     * @param _tokenURI NFT元数据URI
     */
    function checkInAndMintNFT(uint256 _eventId, string memory _tokenURI) external {
        // 先签到（代理签到）
        eventContract.checkInFor(_eventId, msg.sender);
        
        // 获取活动信息
        HackathonEvent.Event memory eventInfo = eventContract.getEvent(_eventId);
        
        // 铸造参与NFT
        nftContract.mintNFT(msg.sender, _eventId, eventInfo.name, "participation", _tokenURI);
        
        // 更新统计
        stats.totalParticipants++;
        stats.totalNFTsMinted++;
    }
    
    /**
     * @dev 主办方批量发放NFT给已签到的参赛者
     * @param _eventId 活动ID
     * @param _recipients 接收者地址数组
     * @param _tokenURIs NFT元数据URI数组
     * @param _category NFT类别
     */
    function batchMintNFTForEvent(
        uint256 _eventId,
        address[] memory _recipients,
        string[] memory _tokenURIs,
        string memory _category
    ) external {
        // 获取活动信息
        HackathonEvent.Event memory eventInfo = eventContract.getEvent(_eventId);
        
        // 验证所有接收者都已签到
        for (uint256 i = 0; i < _recipients.length; i++) {
            require(eventContract.isCheckedIn(_eventId, _recipients[i]), "Recipient must be checked in");
        }
        
        // 批量铸造NFT
        nftContract.batchMintNFT(_recipients, _eventId, eventInfo.name, _category, _tokenURIs);
        
        // 更新统计
        stats.totalNFTsMinted += _recipients.length;
        
        emit NFTBatchMinted(_eventId, _recipients.length);
    }
    
    /**
     * @dev 完整的活动结束流程：结束活动、分发奖金、铸造获奖NFT
     * @param _eventId 活动ID
     * @param _teamIds 团队ID数组
     * @param _ranks 排名数组
     * @param _winnerAddresses 获奖者地址数组
     * @param _winnerTokenURIs 获奖者NFT URI数组
     */
    function completeEvent(
        uint256 _eventId,
        uint256[] memory _teamIds,
        uint256[] memory _ranks,
        address[] memory _winnerAddresses,
        string[] memory _winnerTokenURIs
    ) external nonReentrant {
        // 获取活动信息
        HackathonEvent.Event memory eventInfo = eventContract.getEvent(_eventId);
        
        // 结束活动
        eventContract.endEvent(_eventId);
        
        // 分发奖金
        prizePoolContract.distributePrizes(_eventId, _teamIds, _ranks);
        
        // 为获奖者铸造NFT
        if (_winnerAddresses.length > 0) {
            nftContract.batchMintNFT(_winnerAddresses, _eventId, eventInfo.name, "winner", _winnerTokenURIs);
            stats.totalNFTsMinted += _winnerAddresses.length;
        }
    }
    
    /**
     * @dev 获取活动完整信息
     * @param _eventId 活动ID
     */
    function getEventFullInfo(uint256 _eventId) external view returns (
        HackathonEvent.Event memory eventInfo,
        address poolOrganizer,
        uint256 totalAmount,
        PrizePool.PoolStatus poolStatus,
        uint256 poolCreatedAt
    ) {
        eventInfo = eventContract.getEvent(_eventId);
        (poolOrganizer, totalAmount, poolStatus, poolCreatedAt) = prizePoolContract.getPoolInfo(_eventId);
    }
    
    /**
     * @dev 验证活动数据完整性
     * @param _eventId 活动ID
     */
    function verifyEventIntegrity(uint256 _eventId) external view returns (
        bool eventExists,
        bool poolExists,
        bool dataConsistent
    ) {
        HackathonEvent.Event memory eventInfo = eventContract.getEvent(_eventId);
        eventExists = eventInfo.id != 0;
        
        (address poolOrganizer,,,) = prizePoolContract.getPoolInfo(_eventId);
        poolExists = poolOrganizer != address(0);
        
        dataConsistent = eventExists && poolExists && (eventInfo.organizer == poolOrganizer);
    }
    
    /**
     * @dev 获取用户在平台的完整信息
     * @param _user 用户地址
     */
    function getUserPlatformInfo(address _user) external view returns (
        uint256[] memory ownedNFTs,
        uint256 nftCount
    ) {
        ownedNFTs = nftContract.getUserNFTs(_user);
        nftCount = ownedNFTs.length;
    }
    
    /**
     * @dev 获取平台统计信息
     */
    function getPlatformStats() external view returns (PlatformStats memory) {
        return stats;
    }
    
    /**
     * @dev 更新子合约地址 (仅限所有者)
     * @param _eventContract 活动合约地址
     * @param _prizePoolContract 奖金池合约地址
     * @param _nftContract NFT合约地址
     */
    function updateContracts(
        address _eventContract,
        address _prizePoolContract,
        address _nftContract
    ) external onlyOwner {
        eventContract = HackathonEvent(_eventContract);
        prizePoolContract = PrizePool(_prizePoolContract);
        nftContract = HackathonNFT(_nftContract);
        
        emit ContractsDeployed(_eventContract, _prizePoolContract, _nftContract);
    }
    
    /**
     * @dev 紧急暂停功能 (仅限所有者)
     */
    function emergencyPause() external onlyOwner {
        // 实现紧急暂停逻辑
        // 可以添加暂停状态变量和相关修饰符
    }
    
    /**
     * @dev 获取合约地址
     */
    function getContractAddresses() external view returns (
        address eventContractAddr,
        address prizePoolContractAddr,
        address nftContractAddr
    ) {
        return (address(eventContract), address(prizePoolContract), address(nftContract));
    }
}