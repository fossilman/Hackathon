# 区块链集成 - 后端服务

## 🎉 集成完成

已成功将区块链功能集成到 Hackathon 后端服务中。

## ✅ 验证状态

- ✅ 编译通过
- ✅ 测试通过
- ✅ 代码质量检查通过
- ✅ 依赖验证通过
- ✅ **项目可以正常启动**

## 📋 已实现功能

### 1. 活动信息上链
- 创建活动时自动上链
- 更新活动时同步到链上
- 删除活动时记录到链上
- 活动ID在数据库和区块链中保持一致

### 2. 签到信息上链
- 签到时自动上链
- 链上防重校验（防止重复签到）
- 确保每个参赛者只能签到一次

### 3. 投票信息上链
- 投票时自动上链
- 撤销投票时记录到链上
- 保证投票记录不可篡改

## 📁 文件结构

```
backend/
├── services/
│   ├── blockchain_service.go          # 区块链服务核心 (9.5KB)
│   ├── blockchain_service_test.go     # 单元测试
│   ├── hackathon_service.go           # 已修改：集成活动上链
│   ├── registration_service.go        # 已修改：集成签到上链
│   └── vote_service.go                # 已修改：集成投票上链
├── config/
│   └── config.go                      # 已修改：添加区块链配置
├── .env.example                       # 环境变量示例
├── BLOCKCHAIN_INTEGRATION.md          # 详细集成文档 (7.4KB)
├── BLOCKCHAIN_CHANGES.md              # 变更说明 (6.5KB)
├── STARTUP_VERIFICATION.md            # 启动验证报告 (5.5KB)
├── QUICK_START.md                     # 快速启动指南 (4.9KB)
└── check_startup.sh                   # 启动检查脚本
```

## 🚀 快速启动

### 1. 配置环境变量

```bash
# 复制环境变量示例
cp .env.example .env

# 编辑 .env，设置你的私钥
vim .env
```

在 `.env` 中设置：
```bash
BLOCKCHAIN_PRIVATE_KEY=0x你的私钥
```

### 2. 启动服务

```bash
# 安装依赖
go mod tidy

# 启动服务
go run main.go
```

### 3. 验证启动

```bash
# 测试健康检查
curl http://localhost:8000/health

# 预期响应
# {"status":"ok"}
```

## 📖 文档导航

| 文档 | 说明 | 大小 |
|------|------|------|
| [QUICK_START.md](QUICK_START.md) | 快速启动指南（推荐先看） | 4.9KB |
| [BLOCKCHAIN_INTEGRATION.md](BLOCKCHAIN_INTEGRATION.md) | 详细集成文档 | 7.4KB |
| [BLOCKCHAIN_CHANGES.md](BLOCKCHAIN_CHANGES.md) | 变更说明 | 6.5KB |
| [STARTUP_VERIFICATION.md](STARTUP_VERIFICATION.md) | 启动验证报告 | 5.5KB |

## 🔧 配置说明

### 必需配置

1. **环境变量** (`.env`):
   ```bash
   BLOCKCHAIN_PRIVATE_KEY=0x...
   ```

2. **配置文件** (`config.yaml`):
   ```yaml
   blockchain:
     rpc_url: https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
   
   contracts:
     hackathon_event: "0x413EfD5873c5bD7D985BF0934d2E00f00315c52c"
   ```

### 可选配置

- 网络设置（默认 Sepolia）
- Chain ID（默认 11155111）
- 其他合约地址

## 🧪 测试

### 运行单元测试

```bash
go test -v ./services -run TestBlockchainService
```

### 运行启动检查

```bash
./check_startup.sh
```

## 🔍 功能验证

### 1. 创建活动（会上链）

```bash
curl -X POST http://localhost:8000/admin/hackathons \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "测试活动",
    "description": "测试描述",
    "start_time": "2024-12-25T00:00:00Z",
    "end_time": "2024-12-30T23:59:59Z",
    "location_type": "online"
  }'
```

后端日志会显示：
```
活动创建成功，交易哈希: 0x...
```

### 2. 签到（会防重）

```bash
curl -X POST http://localhost:8000/arena/hackathons/1/checkin \
  -H "Authorization: Bearer YOUR_PARTICIPANT_TOKEN"
```

后端日志会显示：
```
签到成功，交易哈希: 0x...
```

重复签到会被拒绝：
```json
{"error": "链上记录显示已签到"}
```

### 3. 投票（会上链）

```bash
curl -X POST http://localhost:8000/arena/votes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PARTICIPANT_TOKEN" \
  -d '{"hackathon_id": 1, "submission_id": 1}'
```

后端日志会显示：
```
投票成功，交易哈希: 0x...
```

## ⚠️ 注意事项

### 区块链操作耗时
- 每个上链操作需要 15-30 秒（等待交易确认）
- 这是正常的区块链交易时间

### 降级模式
- 如果区块链服务不可用，系统会自动降级
- 数据库操作正常进行
- 区块链操作会记录错误日志

### Gas 费用
- 确保账户有足够的 ETH 支付 Gas 费
- 建议保持至少 0.1 ETH

## 🛡️ 安全建议

1. **私钥管理**
   - 使用环境变量存储私钥
   - 不要将私钥提交到版本控制
   - 生产环境使用专用账户

2. **权限控制**
   - 验证用户身份和权限
   - 检查操作权限

3. **监控**
   - 监控账户余额
   - 监控交易状态
   - 记录详细日志

## 🐛 常见问题

### Q: 启动时提示 "配置未加载"
**A**: 确保 `config.yaml` 文件存在

### Q: 提示 "未设置区块链私钥"
**A**: 设置环境变量 `BLOCKCHAIN_PRIVATE_KEY`

### Q: 提示 "连接区块链节点失败"
**A**: 检查 RPC URL 是否正确

### Q: 提示 "加载合约ABI失败"
**A**: 确保从项目根目录启动，或合约已编译

### Q: 区块链操作很慢
**A**: 这是正常的，需要等待交易确认（15-30秒）

## 📊 技术栈

- **Go**: 1.18+
- **以太坊客户端**: go-ethereum
- **区块链网络**: Sepolia 测试网
- **智能合约**: Solidity
- **数据库**: MySQL

## 🔗 相关链接

- [以太坊文档](https://ethereum.org/developers)
- [go-ethereum 文档](https://geth.ethereum.org/docs)
- [Sepolia 测试网](https://sepolia.etherscan.io/)

## 📝 待实现功能

根据 PRD401，以下功能待后续实现：

- [ ] NFT 发放功能
- [ ] 奖金托管功能
- [ ] 奖金自动分发
- [ ] 赞助商资金管理
- [ ] 活动信息验证
- [ ] 资金链路查询

## 👥 支持

如有问题，请查看文档或联系开发团队。

---

**集成完成时间**: 2024-12-23  
**项目状态**: ✅ 可以正常启动和运行
