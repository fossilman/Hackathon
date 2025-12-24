// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title HackathonNFT
 * @dev Hackathon参与证明NFT合约
 */
contract HackathonNFT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _tokenIdCounter;
    
    // NFT信息结构体
    struct NFTInfo {
        uint256 eventId;
        address participant;
        string eventName;
        uint256 mintedAt;
        string category; // "participation", "winner", "sponsor"
    }
    
    // 状态变量
    mapping(uint256 => NFTInfo) public nftInfos;
    mapping(uint256 => mapping(address => bool)) public hasNFT; // eventId => participant => hasNFT
    mapping(address => bool) public authorizedMinters; // 授权的铸造者
    
    // 事件定义
    event NFTMinted(uint256 indexed tokenId, uint256 indexed eventId, address indexed recipient, string category);
    event MinterAuthorized(address indexed minter);
    event MinterRevoked(address indexed minter);
    
    constructor() ERC721("Hackathon Participation NFT", "HPNFT") Ownable(msg.sender) {
        authorizedMinters[msg.sender] = true;
    }
    
    /**
     * @dev 授权铸造者
     * @param _minter 铸造者地址
     */
    function authorizeMinter(address _minter) external onlyOwner {
        authorizedMinters[_minter] = true;
        emit MinterAuthorized(_minter);
    }
    
    /**
     * @dev 撤销铸造者权限
     * @param _minter 铸造者地址
     */
    function revokeMinter(address _minter) external onlyOwner {
        authorizedMinters[_minter] = false;
        emit MinterRevoked(_minter);
    }
    
    /**
     * @dev 铸造NFT
     * @param _to 接收者地址
     * @param _eventId 活动ID
     * @param _eventName 活动名称
     * @param _category NFT类别
     * @param _tokenURI NFT元数据URI
     */
    function mintNFT(
        address _to,
        uint256 _eventId,
        string memory _eventName,
        string memory _category,
        string memory _tokenURI
    ) external returns (uint256) {
        require(authorizedMinters[msg.sender], "Not authorized to mint");
        require(_to != address(0), "Cannot mint to zero address");
        require(bytes(_eventName).length > 0, "Event name cannot be empty");
        
        // 检查是否已经拥有该活动的NFT
        if (keccak256(bytes(_category)) == keccak256(bytes("participation"))) {
            require(!hasNFT[_eventId][_to], "Already has participation NFT for this event");
        }
        
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;
        
        _safeMint(_to, tokenId);
        _setTokenURI(tokenId, _tokenURI);
        
        nftInfos[tokenId] = NFTInfo({
            eventId: _eventId,
            participant: _to,
            eventName: _eventName,
            mintedAt: block.timestamp,
            category: _category
        });
        
        if (keccak256(bytes(_category)) == keccak256(bytes("participation"))) {
            hasNFT[_eventId][_to] = true;
        }
        
        emit NFTMinted(tokenId, _eventId, _to, _category);
        return tokenId;
    }
    
    /**
     * @dev 批量铸造NFT
     * @param _recipients 接收者地址数组
     * @param _eventId 活动ID
     * @param _eventName 活动名称
     * @param _category NFT类别
     * @param _tokenURIs NFT元数据URI数组
     */
    function batchMintNFT(
        address[] memory _recipients,
        uint256 _eventId,
        string memory _eventName,
        string memory _category,
        string[] memory _tokenURIs
    ) external returns (uint256[] memory) {
        require(authorizedMinters[msg.sender], "Not authorized to mint");
        require(_recipients.length == _tokenURIs.length, "Arrays length mismatch");
        require(_recipients.length > 0, "No recipients provided");
        
        uint256[] memory tokenIds = new uint256[](_recipients.length);
        
        for (uint256 i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0), "Cannot mint to zero address");
            
            // 检查是否已经拥有该活动的NFT
            if (keccak256(bytes(_category)) == keccak256(bytes("participation"))) {
                require(!hasNFT[_eventId][_recipients[i]], "Already has participation NFT for this event");
            }
            
            _tokenIdCounter++;
            uint256 tokenId = _tokenIdCounter;
            
            _safeMint(_recipients[i], tokenId);
            _setTokenURI(tokenId, _tokenURIs[i]);
            
            nftInfos[tokenId] = NFTInfo({
                eventId: _eventId,
                participant: _recipients[i],
                eventName: _eventName,
                mintedAt: block.timestamp,
                category: _category
            });
            
            if (keccak256(bytes(_category)) == keccak256(bytes("participation"))) {
                hasNFT[_eventId][_recipients[i]] = true;
            }
            
            tokenIds[i] = tokenId;
            emit NFTMinted(tokenId, _eventId, _recipients[i], _category);
        }
        
        return tokenIds;
    }
    
    /**
     * @dev 获取NFT信息
     * @param _tokenId NFT ID
     */
    function getNFTInfo(uint256 _tokenId) external view returns (NFTInfo memory) {
        require(_ownerOf(_tokenId) != address(0), "NFT does not exist");
        return nftInfos[_tokenId];
    }
    
    /**
     * @dev 检查用户是否拥有特定活动的NFT
     * @param _eventId 活动ID
     * @param _participant 参赛者地址
     */
    function hasParticipationNFT(uint256 _eventId, address _participant) external view returns (bool) {
        return hasNFT[_eventId][_participant];
    }
    
    /**
     * @dev 获取用户拥有的所有NFT
     * @param _owner 拥有者地址
     */
    function getUserNFTs(address _owner) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(_owner);
        uint256[] memory tokenIds = new uint256[](balance);
        uint256 currentIndex = 0;
        
        for (uint256 i = 1; i <= _tokenIdCounter; i++) {
            if (_ownerOf(i) != address(0) && ownerOf(i) == _owner) {
                tokenIds[currentIndex] = i;
                currentIndex++;
            }
        }
        
        return tokenIds;
    }
    
    /**
     * @dev 获取特定活动的所有NFT
     * @param _eventId 活动ID
     */
    function getEventNFTs(uint256 _eventId) external view returns (uint256[] memory) {
        uint256[] memory tempTokenIds = new uint256[](_tokenIdCounter);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= _tokenIdCounter; i++) {
            if (_ownerOf(i) != address(0) && nftInfos[i].eventId == _eventId) {
                tempTokenIds[count] = i;
                count++;
            }
        }
        
        uint256[] memory tokenIds = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            tokenIds[i] = tempTokenIds[i];
        }
        
        return tokenIds;
    }
    
    /**
     * @dev 获取当前NFT总数
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }
    
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}