// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title NftContract
 * @dev Hackathon 活动 NFT 发放管理合约
 * @notice 本合约用于管理活动参赛者的 NFT 发放，基于 ERC-721 标准
 */
contract NftContract is ERC721, Ownable, ReentrancyGuard {
    
    // NFT 信息映射: tokenId => EventNFT
    mapping(uint256 => EventNFT) public nftInfos;
    
    // 活动 NFT 映射: eventId => tokenId[]
    mapping(uint256 => uint256[]) public eventNFTs;
    
    // 参赛者 NFT 映射: eventId => participant => bool
    mapping(uint256 => mapping(address => bool)) public hasNFT;
    
    // 活动存在映射: eventId => bool
    mapping(uint256 => bool) public eventExists;
    
    // 主办方授权映射: organizerAddress => bool
    mapping(address => bool) public authorizedOrganizers;
    
    // NFT 计数器
    uint256 private _tokenIdCounter;
    
    // 常量定义
    uint256 public constant MAX_NFT_PER_EVENT = 1000;
    
    // 数据结构定义
    struct EventNFT {
        uint256 eventId;        // 活动 ID
        uint256 tokenId;        // NFT 代币 ID
        address participant;     // 参赛者钱包地址
        uint256 timestamp;      // 发放时间戳
        bool isActive;          // NFT 状态
        address organizer;      // 发放者（主办方）
    }
    
    // 事件定义
    event NFTMinted(
        uint256 indexed eventId,
        uint256 indexed tokenId,
        address indexed participant,
        address organizer,
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
    
    // 修饰器
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
    
    constructor(
        string memory _name,
        string memory _symbol
    ) ERC721(_name, _symbol) Ownable(msg.sender) {
        _tokenIdCounter = 1; // 从 1 开始计数
    }
    
    /**
     * @dev 注册活动
     * @param _eventId 活动 ID
     */
    function registerEvent(uint256 _eventId) 
        external 
        onlyOwner 
    {
        require(_eventId != 0, "Invalid event ID");
        require(!eventExists[_eventId], "Event already registered");
        
        eventExists[_eventId] = true;
        
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
     * @dev 为参赛者发放 NFT
     * @param _eventId 活动 ID
     * @param _participant 参赛者钱包地址
     * @return tokenId 新发放的 NFT Token ID
     */
    function mintEventNFT(uint256 _eventId, address _participant) 
        external 
        onlyAuthorizedOrganizer
        eventMustExist(_eventId)
        validAddress(_participant)
        nonReentrant
        returns (uint256) 
    {
        // 检查参赛者是否已经拥有该活动的 NFT
        require(!hasNFT[_eventId][_participant], "Participant already has NFT for this event");
        
        // 检查活动 NFT 数量限制
        require(eventNFTs[_eventId].length < MAX_NFT_PER_EVENT, "Max NFT per event reached");
        
        uint256 newTokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        // 铸造 NFT
        _safeMint(_participant, newTokenId);
        
        // 记录 NFT 信息
        EventNFT memory newNFT = EventNFT({
            eventId: _eventId,
            tokenId: newTokenId,
            participant: _participant,
            timestamp: block.timestamp,
            isActive: true,
            organizer: msg.sender
        });
        
        nftInfos[newTokenId] = newNFT;
        eventNFTs[_eventId].push(newTokenId);
        hasNFT[_eventId][_participant] = true;
        
        emit NFTMinted(_eventId, newTokenId, _participant, msg.sender, block.timestamp);
        
        return newTokenId;
    }
    
    /**
     * @dev 批量为参赛者发放 NFT
     * @param _eventId 活动 ID
     * @param _participants 参赛者钱包地址数组
     * @return tokenIds 新发放的 NFT Token ID 数组
     */
    function batchMintEventNFT(uint256 _eventId, address[] memory _participants) 
        external 
        onlyAuthorizedOrganizer
        eventMustExist(_eventId)
        nonReentrant
        returns (uint256[] memory) 
    {
        require(_participants.length > 0, "Empty participants array");
        require(_participants.length <= 50, "Too many participants in one batch");
        require(
            eventNFTs[_eventId].length + _participants.length <= MAX_NFT_PER_EVENT,
            "Batch minting would exceed max NFT per event"
        );
        
        uint256[] memory tokenIds = new uint256[](_participants.length);
        
        for (uint256 i = 0; i < _participants.length; i++) {
            address participant = _participants[i];
            require(participant != address(0), "Invalid participant address");
            require(!hasNFT[_eventId][participant], "Participant already has NFT for this event");
            
            uint256 newTokenId = _tokenIdCounter;
            _tokenIdCounter++;
            
            // 铸造 NFT
            _safeMint(participant, newTokenId);
            
            // 记录 NFT 信息
            EventNFT memory newNFT = EventNFT({
                eventId: _eventId,
                tokenId: newTokenId,
                participant: participant,
                timestamp: block.timestamp,
                isActive: true,
                organizer: msg.sender
            });
            
            nftInfos[newTokenId] = newNFT;
            eventNFTs[_eventId].push(newTokenId);
            hasNFT[_eventId][participant] = true;
            tokenIds[i] = newTokenId;
            
            emit NFTMinted(_eventId, newTokenId, participant, msg.sender, block.timestamp);
        }
        
        return tokenIds;
    }
    
    /**
     * @dev 获取活动 NFT 总数
     * @param _eventId 活动 ID
     * @return NFT 数量
     */
    function getEventNFTCount(uint256 _eventId) 
        external 
        view 
        eventMustExist(_eventId)
        returns (uint256) 
    {
        return eventNFTs[_eventId].length;
    }
    
    /**
     * @dev 检查参赛者是否拥有活动 NFT
     * @param _eventId 活动 ID
     * @param _participant 参赛者地址
     * @return 是否拥有 NFT
     */
    function hasParticipantNFT(uint256 _eventId, address _participant) 
        external 
        view 
        returns (bool) 
    {
        return hasNFT[_eventId][_participant];
    }
    
    /**
     * @dev 获取活动所有 NFT Token ID
     * @param _eventId 活动 ID
     * @return NFT Token ID 数组
     */
    function getEventNFTTokenIds(uint256 _eventId) 
        external 
        view 
        eventMustExist(_eventId)
        returns (uint256[] memory) 
    {
        return eventNFTs[_eventId];
    }
    
    /**
     * @dev 获取活动所有 NFT 详细信息
     * @param _eventId 活动 ID
     * @return NFT 信息数组
     */
    function getEventNFTInfos(uint256 _eventId) 
        external 
        view 
        eventMustExist(_eventId)
        returns (EventNFT[] memory) 
    {
        uint256[] memory tokenIds = eventNFTs[_eventId];
        EventNFT[] memory nftArray = new EventNFT[](tokenIds.length);
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            nftArray[i] = nftInfos[tokenIds[i]];
        }
        
        return nftArray;
    }
    
    /**
     * @dev 获取 NFT 详细信息
     * @param _tokenId NFT Token ID
     * @return NFT 信息
     */
    function getNFTInfo(uint256 _tokenId) 
        external 
        view 
        returns (EventNFT memory) 
    {
        require(_ownerOf(_tokenId) != address(0), "NFT does not exist");
        return nftInfos[_tokenId];
    }
    
    /**
     * @dev 获取参赛者在某活动的 NFT Token ID
     * @param _eventId 活动 ID
     * @param _participant 参赛者地址
     * @return tokenId NFT Token ID，如果没有则返回 0
     */
    function getParticipantNFTTokenId(uint256 _eventId, address _participant) 
        external 
        view 
        returns (uint256) 
    {
        if (!hasNFT[_eventId][_participant]) {
            return 0;
        }
        
        uint256[] memory tokenIds = eventNFTs[_eventId];
        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (nftInfos[tokenIds[i]].participant == _participant) {
                return tokenIds[i];
            }
        }
        
        return 0;
    }
    
    /**
     * @dev 获取参赛者拥有的所有 NFT
     * @param _participant 参赛者地址
     * @return NFT 信息数组
     */
    function getParticipantNFTs(address _participant) 
        external 
        view 
        validAddress(_participant)
        returns (EventNFT[] memory) 
    {
        uint256 balance = balanceOf(_participant);
        EventNFT[] memory participantNFTs = new EventNFT[](balance);
        
        uint256 index = 0;
        for (uint256 tokenId = 1; tokenId < _tokenIdCounter; tokenId++) {
            if (_ownerOf(tokenId) == _participant) {
                participantNFTs[index] = nftInfos[tokenId];
                index++;
            }
        }
        
        return participantNFTs;
    }
    
    /**
     * @dev 获取当前 NFT 总供应量
     * @return 总供应量
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter - 1;
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
     * @dev 重写 tokenURI 函数，返回 NFT 元数据 URI
     * @param _tokenId NFT Token ID
     * @return 元数据 URI
     */
    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        require(_ownerOf(_tokenId) != address(0), "NFT does not exist");
        
        EventNFT memory nft = nftInfos[_tokenId];
        
        // 这里可以根据需要构建动态的元数据 URI
        // 例如：return string(abi.encodePacked("https://api.hackathon.com/nft/", toString(_tokenId)));
        
        return string(abi.encodePacked(
            "https://api.hackathon.com/nft/event/",
            toString(nft.eventId),
            "/token/",
            toString(_tokenId)
        ));
    }
    
    /**
     * @dev 将 uint256 转换为字符串
     * @param value 要转换的数值
     * @return 字符串
     */
    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
    
    /**
     * @dev 重写 _beforeTokenTransfer 函数，可以在这里添加转移限制逻辑
     */
    function _update(address to, uint256 tokenId, address auth) 
        internal 
        override 
        returns (address) 
    {
        // 可以在这里添加 NFT 转移限制逻辑
        // 例如：某些 NFT 可能不允许转移
        
        return super._update(to, tokenId, auth);
    }
}