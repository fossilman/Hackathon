# RPC URL 配置问题修复

## 问题描述
交易哈希不存在，虽然后端显示"投票成功"并返回了交易哈希，但在 Etherscan 上查不到。

## 问题原因
`config.yaml` 中的 RPC URL 不完整或无效：
```yaml
rpc_url: https://eth-sepolia.g.alchemy.com/v2/Ju1nY_EMo82rnBWg06xI0
```

这个 API Key 看起来被截断了，导致无法正确连接到 Sepolia 网络。

## 解决步骤

### 方案 1：使用 Alchemy（推荐）

1. **访问 Alchemy 官网**
   - 网址：https://www.alchemy.com/
   - 注册/登录账号

2. **创建新应用**
   - 点击 "Create App"
   - 选择网络：Sepolia
   - 填写应用名称

3. **获取 API Key**
   - 在应用详情页面，点击 "View Key"
   - 复制完整的 HTTPS URL，格式类似：
   ```
   https://eth-sepolia.g.alchemy.com/v2/YOUR_COMPLETE_API_KEY_HERE
   ```

4. **更新配置文件**
   编辑 `backend/config.yaml`：
   ```yaml
   blockchain:
     network: sepolia
     rpc_url: https://eth-sepolia.g.alchemy.com/v2/YOUR_COMPLETE_API_KEY_HERE
     chain_id: 11155111
   ```

### 方案 2：使用 Infura

1. **访问 Infura 官网**
   - 网址：https://infura.io/
   - 注册/登录账号

2. **创建新项目**
   - 点击 "Create New Key"
   - 选择 "Web3 API"
   - 填写项目名称

3. **获取 Sepolia Endpoint**
   - 在项目详情页面
   - 选择 "Sepolia" 网络
   - 复制 HTTPS URL，格式类似：
   ```
   https://sepolia.infura.io/v3/YOUR_PROJECT_ID
   ```

4. **更新配置文件**
   编辑 `backend/config.yaml`：
   ```yaml
   blockchain:
     network: sepolia
     rpc_url: https://sepolia.infura.io/v3/YOUR_PROJECT_ID
     chain_id: 11155111
   ```

### 方案 3：使用公共 RPC（不推荐用于生产）

如果只是测试，可以使用公共 RPC：

```yaml
blockchain:
  network: sepolia
  rpc_url: https://rpc.sepolia.org
  chain_id: 11155111
```

或者：

```yaml
blockchain:
  network: sepolia
  rpc_url: https://ethereum-sepolia.publicnode.com
  chain_id: 11155111
```

⚠️ **注意**：公共 RPC 可能不稳定，有速率限制，不建议用于生产环境。

## 验证配置

### 1. 测试 RPC 连接

创建测试脚本 `test_rpc.sh`：

```bash
#!/bin/bash

RPC_URL="你的RPC_URL"

echo "测试 RPC 连接..."
curl -X POST $RPC_URL \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"eth_blockNumber",
    "params":[],
    "id":1
  }'
```

如果返回类似 `{"jsonrpc":"2.0","id":1,"result":"0x..."}` 说明连接成功。

### 2. 重启后端服务

```bash
cd backend
# 停止当前服务
# 重新编译
go build -o main .
# 启动服务
./main
```

### 3. 测试投票功能

再次尝试投票，检查：
- 后端日志中的交易哈希
- 在 Etherscan 上查询：https://sepolia.etherscan.io/tx/交易哈希

## 常见问题

### Q: 如何知道 RPC URL 是否有效？
A: 使用 curl 测试（见上面的验证步骤），或者在浏览器中访问 RPC URL，应该返回错误信息而不是 404。

### Q: 为什么之前创建活动成功了？
A: 可能之前使用的是不同的 RPC URL，或者创建活动时 RPC 恰好可用。

### Q: 可以使用免费的 RPC 吗？
A: 可以，Alchemy 和 Infura 都提供免费套餐，足够开发和测试使用。

### Q: 更新配置后需要重新部署合约吗？
A: 不需要，只需要重启后端服务即可。

## 检查清单

- [ ] 获取有效的 RPC URL
- [ ] 更新 `backend/config.yaml`
- [ ] 测试 RPC 连接
- [ ] 重启后端服务
- [ ] 测试投票功能
- [ ] 在 Etherscan 上验证交易

## 当前状态

**钱包地址**: `0x5FB4f1018f3abc1e8E15660FfcdE3f1ae59dA758`
**余额**: 充足 ✅
**问题**: RPC URL 配置错误 ❌

修复 RPC URL 后，交易应该能正常上链并在 Etherscan 上查询到。
