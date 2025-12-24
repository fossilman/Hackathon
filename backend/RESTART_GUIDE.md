# 后端服务重启指南

## 合约已更新
新的智能合约已部署到 Sepolia 测试网，`config.yaml` 中的合约地址已更新。

## 重启步骤

### 1. 停止当前运行的后端服务
如果后端服务正在运行，请先停止它：
```bash
# 如果使用 Ctrl+C 无法停止，可以查找进程并杀死
ps aux | grep main
kill -9 <进程ID>
```

### 2. 确认配置文件
确认 `backend/config.yaml` 中的合约地址已更新为：
```yaml
contracts:
  hackathon_platform: "0x4904A49896b5CaA192143F2cd70885e366225FC4"
  hackathon_event: "0xaf5620A7d77cD4A1Bfaa395A85E3555974f81141"
  prize_pool: "0x9cc542E9fBFa1b4D09497F8Fc915F50BAb8865aB"
  hackathon_nft: "0x6946750b0ba7A0D6fE47FeA94bC041622426604b"
```

### 3. 重新编译（如果需要）
```bash
cd backend
go build -o main .
```

### 4. 启动后端服务
```bash
cd backend
./main
```

或者直接运行：
```bash
cd backend
go run main.go
```

### 5. 验证服务启动
查看日志输出，确认：
- ✅ 数据库连接成功
- ✅ 区块链服务初始化成功
- ✅ 合约地址加载正确
- ✅ 服务器在端口 8000 启动

## 新合约的主要变化

### 1. 时间限制已移除
- 可以创建任意时间的活动（包括过去的时间）
- 签到不再检查活动时间范围
- 更加灵活，但需要在应用层控制

### 2. 权限已放大
- 大部分操作不再检查 organizer 权限
- 提供更大灵活性，但需要注意安全性

### 3. 签到功能改进
- 新增 `checkInFor` 函数，支持平台代理签到
- 修复了之前签到记录不正确的问题

## 测试建议

### 测试流程
1. **创建活动**
   ```bash
   POST /api/v1/admin/hackathons
   ```
   - 使用当前时间或过去的时间作为开始时间
   - 检查返回的 `tx_hash` 和 `chain_event_id`

2. **切换到签到阶段**
   ```bash
   PUT /api/v1/admin/hackathons/{id}/stage
   ```
   - 切换到 "registration" 阶段
   - 这会自动激活链上活动

3. **测试签到**
   ```bash
   POST /api/v1/registrations
   ```
   - 应该成功签到并上链
   - 检查返回的交易哈希

4. **测试投票**
   ```bash
   POST /api/v1/votes
   ```
   - 已签到的用户可以投票
   - 检查投票是否成功上链

## 常见问题

### Q: 服务启动失败，提示合约地址无效
A: 确认 `config.yaml` 中的合约地址格式正确，以 "0x" 开头。

### Q: 签到失败，提示 "Event is not active"
A: 确保活动已切换到签到阶段，这会自动激活链上活动。

### Q: 交易失败，提示 gas 估算失败
A: 检查钱包地址是否有足够的 Sepolia ETH。可以从水龙头获取测试币。

### Q: 数据库中的活动 ID 和链上 ID 不一致
A: 这是正常的。数据库 ID 是自增的，链上 ID 存储在 `chain_event_id` 字段中。

## 获取测试币
如果需要 Sepolia 测试币，可以从以下水龙头获取：
- https://sepoliafaucet.com/
- https://www.alchemy.com/faucets/ethereum-sepolia

## 支持
如有问题，请查看：
- `backend/BLOCKCHAIN_INTEGRATION.md` - 区块链集成文档
- `backend/QUICK_START.md` - 快速开始指南
- `contract/DEPLOYMENT_UPDATE.md` - 合约更新说明
