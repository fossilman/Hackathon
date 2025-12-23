# 快速启动指南

## 前置条件

1. Go 1.18+ 已安装
2. MySQL 数据库已运行
3. 有一个以太坊账户（用于签署交易）

## 快速启动（3步）

### 1. 配置环境变量

```bash
# 复制环境变量示例
cp .env.example .env

# 编辑 .env 文件，设置你的私钥
# BLOCKCHAIN_PRIVATE_KEY=0x你的私钥
vim .env
```

### 2. 检查配置文件

确保 `config.yaml` 中的配置正确：

```yaml
# 数据库配置
database:
  host: 47.103.98.61
  port: "3306"
  user: root
  password: your_password
  name: hackathon_db

# 区块链配置
blockchain:
  network: sepolia
  rpc_url: https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
  chain_id: 11155111

# 合约地址（已配置好）
contracts:
  hackathon_event: "0x413EfD5873c5bD7D985BF0934d2E00f00315c52c"
  # ... 其他合约
```

### 3. 启动服务

```bash
# 安装依赖
go mod tidy

# 启动服务
go run main.go
```

## 验证启动

服务启动后，测试健康检查接口：

```bash
curl http://localhost:8000/health
```

预期响应：
```json
{
  "status": "ok"
}
```

## 测试区块链功能

### 测试1: 创建活动（会上链）

```bash
curl -X POST http://localhost:8000/admin/hackathons \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "测试活动",
    "description": "这是一个测试活动",
    "start_time": "2024-12-25T00:00:00Z",
    "end_time": "2024-12-30T23:59:59Z",
    "location_type": "online",
    "location_detail": "线上活动"
  }'
```

成功后，后端日志会显示：
```
活动创建成功，交易哈希: 0x...
```

### 测试2: 签到（会上链并防重）

```bash
curl -X POST http://localhost:8000/arena/hackathons/1/checkin \
  -H "Authorization: Bearer YOUR_PARTICIPANT_TOKEN"
```

成功后，后端日志会显示：
```
签到成功，交易哈希: 0x...
```

重复签到会被拒绝：
```json
{
  "error": "链上记录显示已签到"
}
```

### 测试3: 投票（会上链）

```bash
curl -X POST http://localhost:8000/arena/votes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PARTICIPANT_TOKEN" \
  -d '{
    "hackathon_id": 1,
    "submission_id": 1
  }'
```

成功后，后端日志会显示：
```
投票成功，交易哈希: 0x...
```

## 常见问题

### Q1: 启动时提示 "配置未加载"
**A**: 确保 `config.yaml` 文件存在于 backend 目录

### Q2: 提示 "未设置区块链私钥"
**A**: 设置环境变量：
```bash
export BLOCKCHAIN_PRIVATE_KEY=0x你的私钥
```

### Q3: 提示 "连接区块链节点失败"
**A**: 检查 RPC URL 是否正确，网络是否可访问

### Q4: 提示 "加载合约ABI失败"
**A**: 确保从项目根目录启动，或者合约已编译

### Q5: 区块链操作很慢
**A**: 这是正常的，需要等待交易确认（15-30秒）

## 降级模式

如果区块链服务不可用，系统会自动降级：

- ✅ 数据库操作正常进行
- ⚠️ 区块链操作会记录错误日志
- ⚠️ 不影响其他功能

## 开发模式

### 不使用区块链（纯数据库模式）

```bash
# 不设置私钥
unset BLOCKCHAIN_PRIVATE_KEY

# 启动服务
go run main.go
```

系统会降级运行，所有功能正常，但不会上链。

### 使用本地区块链（Hardhat）

```bash
# 终端1: 启动本地区块链
cd contract
npx hardhat node

# 终端2: 部署合约
npx hardhat run scripts/deploy.js --network localhost

# 终端3: 启动后端
cd backend
export BLOCKCHAIN_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
go run main.go
```

## 生产部署

### 1. 环境变量配置

```bash
# 生产环境私钥（使用专用账户）
export BLOCKCHAIN_PRIVATE_KEY=0x...

# 数据库配置
export DB_HOST=production_host
export DB_PASSWORD=production_password

# RPC URL（使用生产级服务）
export BLOCKCHAIN_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
```

### 2. 编译部署

```bash
# 编译
go build -o hackathon-backend main.go

# 运行
./hackathon-backend
```

### 3. 使用 systemd（推荐）

创建 `/etc/systemd/system/hackathon-backend.service`:

```ini
[Unit]
Description=Hackathon Backend Service
After=network.target

[Service]
Type=simple
User=hackathon
WorkingDirectory=/opt/hackathon/backend
Environment="BLOCKCHAIN_PRIVATE_KEY=0x..."
ExecStart=/opt/hackathon/backend/hackathon-backend
Restart=always

[Install]
WantedBy=multi-user.target
```

启动服务：
```bash
sudo systemctl start hackathon-backend
sudo systemctl enable hackathon-backend
```

## 监控

### 查看日志

```bash
# 实时查看日志
tail -f /var/log/hackathon-backend.log

# 查看区块链相关日志
tail -f /var/log/hackathon-backend.log | grep "交易哈希"
```

### 监控指标

- 账户余额（确保有足够 ETH）
- 交易成功率
- 响应时间
- 错误率

## 更多信息

- 详细集成文档: `BLOCKCHAIN_INTEGRATION.md`
- 变更说明: `BLOCKCHAIN_CHANGES.md`
- 启动验证报告: `STARTUP_VERIFICATION.md`

## 支持

如有问题，请查看文档或联系开发团队。
