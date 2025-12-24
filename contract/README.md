# Hackathon 智能合约

基于 Solidity ^0.8.21 和 Hardhat 2.0 开发的 Hackathon 平台智能合约系统。

## 合约架构

### 主要合约

1. **HackathonPlatform.sol** - 主平台合约，整合所有功能
2. **HackathonEvent.sol** - 活动信息管理合约
3. **PrizePool.sol** - 奖金池和分发管理合约
4. **HackathonNFT.sol** - NFT 发放合约

### 功能特性

- ✅ 活动信息上链存储和验证
- ✅ 参赛者签到防重校验
- ✅ 投票信息上链和撤销机制
- ✅ NFT 参与证明发放
- ✅ 智能合约奖金托管
- ✅ 自动奖金分发
- ✅ 赞助商资金管理
- ✅ 团队奖金分成设置
- ✅ 资金链路透明查询

## 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm 或 yarn

### 安装依赖

```bash
cd contract
npm install
```

### 环境配置

复制环境变量文件并配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的配置：

```env
SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

### 编译合约

```bash
npm run compile
```

### 运行测试

```bash
npm run test
```

### 部署合约

部署到 Sepolia 测试网：

```bash
npm run deploy -- --network sepolia
```

### 验证合约

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

## 合约使用指南

### 1. 创建活动

```javascript
// 创建带奖金池的活动
const distributionRules = [
  { rank: 1, percentage: 50 }, // 第一名 50%
  { rank: 2, percentage: 30 }, // 第二名 30%
  { rank: 3, percentage: 20 }  // 第三名 20%
];

const tx = await platform.createEventWithPrize(
  "My Hackathon",
  "Description",
  startTime,
  endTime,
  "Location",
  distributionRules,
  { value: ethers.parseEther("10.0") } // 10 ETH 奖金
);
```

### 2. 参赛者签到

```javascript
// 签到并铸造参与 NFT
await platform.checkInAndMintNFT(eventId, "https://nft-metadata-uri.com");
```

### 3. 投票

```javascript
// 对项目投票
await eventContract.vote(eventId, projectId, score);

// 撤销投票
await eventContract.revokeVote(eventId, voteIndex);
```

### 4. 赞助申请

```javascript
// 申请赞助
await prizePoolContract.requestSponsorship(eventId, { value: sponsorAmount });

// 主办方批准赞助
await prizePoolContract.approveSponsorshipRequest(requestId);

// 主办方拒绝赞助
await prizePoolContract.rejectSponsorshipRequest(requestId);
```

### 5. 设置团队分成

```javascript
const teamShares = [
  { member: "0x123...", percentage: 40 }, // 队长 40%
  { member: "0x456...", percentage: 30 }, // 队员1 30%
  { member: "0x789...", percentage: 30 }  // 队员2 30%
];

await prizePoolContract.setTeamShares(eventId, teamId, teamShares);
```

### 6. 分发奖金

```javascript
// 公布结果并分发奖金
await platform.completeEvent(
  eventId,
  [teamId1, teamId2, teamId3], // 团队ID
  [1, 2, 3],                   // 排名
  [winner1, winner2, winner3], // 获奖者地址
  ["uri1", "uri2", "uri3"]     // 获奖NFT URI
);
```

## 合约地址

部署后的合约地址将在部署脚本执行后显示，请妥善保存用于前端集成。

### Sepolia 测试网

- HackathonPlatform: `待部署`
- HackathonEvent: `待部署`
- PrizePool: `待部署`
- HackathonNFT: `待部署`

## 安全特性

- ✅ 使用 OpenZeppelin 安全库
- ✅ ReentrancyGuard 防重入攻击
- ✅ Ownable 权限控制
- ✅ 输入参数验证
- ✅ 状态检查和防重校验
- ✅ 紧急暂停机制

## Gas 优化

- 批量操作减少交易次数
- 结构体打包优化存储
- 事件日志记录关键信息
- 合理使用 view/pure 函数

## 开发规范

### 命名规范

- 合约名：PascalCase
- 函数名：camelCase
- 变量名：camelCase
- 常量名：UPPER_SNAKE_CASE
- 事件名：PascalCase

### 注释规范

- 使用 NatSpec 格式注释
- 每个公共函数都有完整的参数和返回值说明
- 重要的业务逻辑添加行内注释

## 测试覆盖

- 合约部署测试
- 活动创建和管理测试
- 签到和NFT发放测试
- 投票和撤销测试
- 赞助申请和审核测试
- 奖金分发测试
- 数据验证测试

## 许可证

MIT License