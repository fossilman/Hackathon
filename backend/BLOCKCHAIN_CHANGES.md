# 区块链集成变更说明

## 变更概述

根据 PRD401 需求，已将区块链功能集成到后端服务中。主要变更包括：

## 新增文件

### 1. `services/blockchain_service.go`
区块链服务核心文件，提供以下功能：
- 连接以太坊节点
- 加载智能合约 ABI
- 创建、更新、删除活动上链
- 签到信息上链和防重校验
- 投票和撤销投票上链
- 查询链上数据

主要方法：
- `NewBlockchainService()`: 创建区块链服务实例
- `CreateEvent()`: 创建活动上链
- `UpdateEvent()`: 更新活动上链
- `DeleteEvent()`: 删除活动上链
- `CheckIn()`: 签到上链
- `Vote()`: 投票上链
- `RevokeVote()`: 撤销投票上链
- `VerifyCheckIn()`: 验证签到记录
- `GetEvent()`: 获取链上活动信息

### 2. `.env.example`
环境变量配置示例文件，包含：
- 区块链私钥配置
- RPC URL 配置
- 合约地址配置

### 3. `BLOCKCHAIN_INTEGRATION.md`
区块链集成详细文档，包含：
- 配置步骤
- 功能说明
- 错误处理
- 测试方法
- 安全建议

## 修改文件

### 1. `config/config.go`
**变更内容**：
- 添加区块链相关配置字段：
  - `BlockchainNetwork`: 区块链网络
  - `BlockchainRPCURL`: RPC URL
  - `ChainID`: 链 ID
  - `HackathonPlatformContract`: 平台合约地址
  - `HackathonEventContract`: 活动合约地址
  - `PrizePoolContract`: 奖金池合约地址
  - `HackathonNFTContract`: NFT 合约地址

- 从 YAML 和环境变量加载区块链配置

### 2. `services/hackathon_service.go`
**变更内容**：

#### `CreateHackathon()` 方法
- 在创建活动后，调用区块链服务将活动信息上链
- 如果上链失败，回滚数据库操作
- 记录交易哈希

#### `UpdateHackathon()` 方法
- 在更新活动后，调用区块链服务更新链上信息
- 如果上链失败，回滚数据库操作
- 记录交易哈希

#### `DeleteHackathon()` 方法
- 在删除活动前，调用区块链服务记录删除操作
- 如果上链失败，返回错误
- 记录交易哈希

**注意事项**：
- 活动 ID 在数据库和区块链中保持一致
- 阶段信息不上链（仅活动基本信息上链）

### 3. `services/registration_service.go`
**变更内容**：

#### `Checkin()` 方法
- 在签到前，调用区块链服务进行防重校验
- 检查链上是否已有签到记录
- 如果未签到，将签到信息上链
- 如果上链失败，返回错误
- 记录交易哈希

**防重校验逻辑**：
1. 调用 `VerifyCheckIn()` 检查链上记录
2. 如果已签到，拒绝重复签到
3. 如果未签到，调用 `CheckIn()` 上链
4. 创建数据库签到记录

### 4. `services/vote_service.go`
**变更内容**：

#### `Vote()` 方法
- 在投票后，调用区块链服务将投票信息上链
- 如果上链失败，返回错误
- 记录交易哈希

#### `CancelVote()` 方法
- 在撤销投票前，调用区块链服务记录撤销操作
- 如果上链失败，返回错误
- 记录交易哈希

**注意事项**：
- 投票分数默认为 100（可根据需求调整）
- 撤销操作使用投票 ID 作为索引

### 5. `config.yaml`
**变更内容**：
- 已包含区块链配置（无需修改）
- 包含智能合约地址配置

## 数据流程

### 创建活动流程
```
用户请求 → 验证权限 → 创建数据库记录 → 调用区块链服务 → 上链 → 返回结果
                                              ↓
                                         失败回滚
```

### 签到流程
```
用户请求 → 验证权限 → 链上防重校验 → 上链签到 → 创建数据库记录 → 返回结果
                          ↓
                    已签到则拒绝
```

### 投票流程
```
用户请求 → 验证权限 → 上链投票 → 创建数据库记录 → 返回结果
```

## 配置要求

### 必需配置
1. **环境变量**：
   - `BLOCKCHAIN_PRIVATE_KEY`: 区块链私钥（必需）

2. **config.yaml**：
   - `blockchain.rpc_url`: RPC URL
   - `contracts.*`: 合约地址

### 可选配置
- `BLOCKCHAIN_NETWORK`: 覆盖网络配置
- `BLOCKCHAIN_RPC_URL`: 覆盖 RPC URL
- `CHAIN_ID`: 覆盖链 ID
- `CONTRACT_*`: 覆盖合约地址

## 依赖项

已使用的 Go 包：
- `github.com/ethereum/go-ethereum`: 以太坊客户端库
- `github.com/ethereum/go-ethereum/accounts/abi`: ABI 解析
- `github.com/ethereum/go-ethereum/common`: 通用类型
- `github.com/ethereum/go-ethereum/core/types`: 交易类型
- `github.com/ethereum/go-ethereum/crypto`: 加密工具
- `github.com/ethereum/go-ethereum/ethclient`: 以太坊客户端

这些依赖已在 `go.mod` 中定义。

## 测试建议

### 单元测试
建议为以下服务添加单元测试：
- `BlockchainService`: 测试合约调用
- `HackathonService`: 测试活动上链
- `RegistrationService`: 测试签到上链
- `VoteService`: 测试投票上链

### 集成测试
建议测试以下场景：
1. 创建活动并验证链上数据
2. 签到防重校验
3. 投票和撤销投票
4. 错误处理（Gas 不足、网络错误等）

### 测试网测试
建议在 Sepolia 测试网进行完整测试：
1. 部署合约
2. 配置后端
3. 测试所有功能
4. 验证交易哈希

## 安全注意事项

1. **私钥安全**：
   - 不要将私钥提交到版本控制
   - 使用环境变量存储私钥
   - 生产环境使用专用账户

2. **Gas 费管理**：
   - 监控账户余额
   - 设置合理的 Gas 限制
   - 考虑使用 Gas Station

3. **错误处理**：
   - 实现完善的错误处理
   - 记录详细日志
   - 提供用户友好的错误提示

4. **权限控制**：
   - 验证用户身份
   - 检查操作权限
   - 防止未授权访问

## 未实现功能

根据 PRD401，以下功能尚未实现：

1. **NFT 发放**：主办方为签到参赛者发放 NFT
2. **奖金托管**：创建活动时托管奖金
3. **奖金分发**：活动结束后自动分发奖金
4. **赞助商资金管理**：赞助商资金托管和分发
5. **活动信息验证**：验证链上和链下数据一致性
6. **资金链路查询**：查询所有资金流向

这些功能需要：
- 额外的智能合约支持
- 新的后端服务实现
- 前端界面支持

## 后续工作

1. **完善错误处理**：
   - 添加重试机制
   - 优化错误提示
   - 记录详细日志

2. **性能优化**：
   - 实现交易队列
   - 批量处理交易
   - 缓存链上数据

3. **监控和告警**：
   - 监控账户余额
   - 监控交易状态
   - 设置告警机制

4. **文档完善**：
   - API 文档
   - 部署文档
   - 运维文档

## 联系方式

如有问题，请联系开发团队。
