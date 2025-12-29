# Hackathon Event Contract

Hackathon 活动信息上链智能合约项目。

## 功能特性

- ✅ 活动创建上链
- ✅ 活动编辑上链  
- ✅ 活动删除上链
- ✅ 活动查询上链
- ✅ 活动历史记录查询
- ✅ 主办方权限管理
- ✅ 防重入攻击保护
- ✅ 完整的事件日志

## 项目结构

```
contract/
├── contracts/
│   └── EventInfoContract.sol     # 主合约文件
├── scripts/
│   └── deploy-event-contract.js # 部署脚本
├── test/
│   └── EventInfoContract.test.js # 测试文件
├── hardhat.config.js             # Hardhat 配置
├── package.json                  # 依赖配置
├── .env.example                  # 环境变量示例
└── README.md                     # 项目说明
```

## 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0

## 安装依赖

```bash
cd contract
npm install
```

## 环境配置

1. 复制环境变量示例文件：
```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，填入实际配置：
```env
# Sepolia 网络配置
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=your_private_key_here

# Etherscan API Key (用于合约验证)
ETHERSCAN_API_KEY=your_etherscan_api_key
```

## 编译合约

```bash
npm run compile
```

## 运行测试

```bash
# 运行所有测试
npm run test

# 查看测试覆盖率
npm run test:coverage
```

## 本地部署

```bash
# 启动本地 Hardhat 网络
npm run node

# 在新终端中部署到本地网络
npm run deploy:local
```

## Sepolia 测试网部署

```bash
# 部署到 Sepolia 测试网
npm run deploy:sepolia

# 验证合约（可选）
npm run verify:sepolia DEPLOYED_CONTRACT_ADDRESS
```

## 合约接口

### 主要函数

#### `createEvent(uint256 _eventId, string _eventName, string _description, uint256 _startTime, uint256 _endTime, string _location)`
创建新的活动上链记录。

#### `updateEvent(uint256 _eventId, string _eventName, string _description, uint256 _startTime, uint256 _endTime, string _location, string _changeDescription)`
更新现有活动的信息。

#### `deleteEvent(uint256 _eventId)`
删除活动（标记为已删除）。

#### `getEvent(uint256 _eventId) -> EventInfo`
查询指定活动的详细信息。

#### `getEventHistory(uint256 _eventId) -> EventHistory[]`
查询活动的变更历史记录。

#### `getEvents(uint256[] _eventIds) -> EventInfo[]`
批量查询多个活动的信息。

#### `getAllEventIds() -> uint256[]`
获取所有活动的 ID 列表。

#### `authorizeOrganizer(address _organizer)`
授权新的主办方地址（仅合约所有者）。

#### `revokeOrganizer(address _organizer)`
撤销主办方授权（仅合约所有者）。

### 数据结构

#### `EventInfo`
```solidity
struct EventInfo {
    uint256 eventId;      // 活动 ID
    string eventName;      // 活动名称
    string description;    // 活动描述
    uint256 startTime;     // 开始时间
    uint256 endTime;       // 结束时间
    string location;       // 活动地点
    address organizer;     // 主办方地址
    uint256 createdAt;     // 创建时间
    uint256 updatedAt;     // 更新时间
    bool isDeleted;        // 是否已删除
}
```

#### `EventHistory`
```solidity
struct EventHistory {
    uint256 eventId;           // 活动 ID
    uint8 operationType;       // 操作类型: 1=创建, 2=编辑, 3=删除
    uint256 timestamp;         // 操作时间戳
    address operator;          // 操作者地址
    string changeDescription;  // 变更描述
}
```

### 事件

#### `EventCreated(uint256 indexed eventId, address indexed organizer, string eventName, uint256 startTime, uint256 endTime, uint256 timestamp)`
活动创建事件。

#### `EventUpdated(uint256 indexed eventId, address indexed operator, string changeDescription, uint256 timestamp)`
活动更新事件。

#### `EventDeleted(uint256 indexed eventId, address indexed operator, uint256 timestamp)`
活动删除事件。

#### `OrganizerAuthorized(address indexed organizer, uint256 timestamp)`
主办方授权事件。

#### `OrganizerRevoked(address indexed organizer, uint256 timestamp)`
主办方撤销授权事件。

## 使用示例

### JavaScript/TypeScript

```javascript
const { ethers } = require("ethers");

// 连接到合约
const contract = new ethers.Contract(contractAddress, abi, signer);

// 创建活动
const tx = await contract.createEvent(
    1001,
    "Web3 Hackathon 2024",
    "全球最大的 Web3 黑客松比赛",
    1704067200,
    1704153600,
    "上海国际会议中心"
);
await tx.wait();

// 查询活动
const event = await contract.getEvent(1001);
console.log("活动信息:", event);

// 查询历史
const history = await contract.getEventHistory(1001);
console.log("活动历史:", history);
```

## 安全特性

- **访问控制**: 使用 OpenZeppelin 的 `Ownable` 和自定义授权机制
- **重入保护**: 使用 `ReentrancyGuard` 防止重入攻击
- **输入验证**: 严格的参数验证和边界检查
- **事件日志**: 完整的操作事件记录
- **状态管理**: 合理的活动状态管理逻辑

## 测试覆盖

合约包含全面的单元测试，覆盖以下场景：
- 合约部署和初始化
- 主办方权限管理
- 活动 CRUD 操作
- 边界条件和异常处理
- 事件触发验证
- 批量操作测试

## Gas 优化

- 使用 `memory` 而非 `storage` 读取临时数据
- 优化存储布局
- 合理的批量操作设计

## 部署验证

支持以下验证方式：
- **Etherscan**: 中心化源码验证
- **Sourcify**: 去中心化源码验证

## 许可证

MIT License

## 维护团队

Hackathon Development Team