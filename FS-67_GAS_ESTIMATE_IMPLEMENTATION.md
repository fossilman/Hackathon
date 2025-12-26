# FS-67: Gas 费预估和提示功能实现文档

## 功能概述

实现了链上操作前的 Gas 费预估和余额检查功能，提升用户体验，避免交易因余额不足而失败。

## 实现范围

### 后端实现

#### 1. 区块链服务增强 (`backend/services/blockchain_service.go`)

新增以下方法：

- **`EstimateGasFee()`**: 通用 Gas 费预估方法
  - 估算 gas 限制
  - 获取当前 gas 价格
  - 计算总成本 (gasLimit × gasPrice)

- **`GetBalance()`**: 获取账户余额

- **`CheckBalanceSufficient()`**: 检查余额是否充足

- **`EstimateCheckinGas()`**: 预估签到操作的 Gas 费

- **`EstimateVoteGas()`**: 预估投票操作的 Gas 费

- **`EstimateRevokeVoteGas()`**: 预估撤销投票操作的 Gas 费

#### 2. Gas 费预估控制器 (`backend/controllers/gas_estimate_controller.go`)

新增控制器处理 Gas 费预估请求：

- **`EstimateCheckin()`**: 处理签到 Gas 费预估请求
- **`EstimateVote()`**: 处理投票 Gas 费预估请求
- **`EstimateRevokeVote()`**: 处理撤销投票 Gas 费预估请求

**响应数据结构**：
```go
type GasEstimateResponse struct {
    GasLimit        uint64  // Gas 限制
    GasPrice        string  // Gas 价格 (wei)
    GasPriceGwei    string  // Gas 价格 (gwei)
    TotalCost       string  // 总成本 (wei)
    TotalCostEth    string  // 总成本 (ETH)
    UserBalance     string  // 用户余额 (wei)
    UserBalanceEth  string  // 用户余额 (ETH)
    IsSufficient    bool    // 余额是否充足
    ShortfallEth    string  // 缺少的金额 (ETH)
}
```

#### 3. 路由配置 (`backend/routes/arena_routes.go`)

新增 API 端点：
- `GET /api/v1/arena/hackathons/:id/estimate-checkin-gas` - 预估签到 Gas 费
- `GET /api/v1/arena/submissions/:id/estimate-vote-gas` - 预估投票 Gas 费
- `GET /api/v1/arena/submissions/:id/estimate-revoke-vote-gas` - 预估撤销投票 Gas 费

### 前端实现

#### 1. Gas 费预估模态框组件 (`frontend/arena/src/components/GasEstimateModal.tsx`)

通用 Gas 费预估模态框，支持：
- 自动获取 Gas 费预估数据
- 显示余额充足/不足状态
- 展示详细的 Gas 费信息（Gas 限制、Gas 价格、总成本、用户余额）
- 余额不足时提示需要充值的金额
- 温馨提示说明

**Props 接口**：
```typescript
interface GasEstimateModalProps {
  visible: boolean              // 是否显示
  onCancel: () => void          // 取消回调
  onConfirm: () => void         // 确认回调
  estimateUrl: string           // Gas 费预估 API URL
  operationType: 'checkin' | 'vote' | 'revoke'  // 操作类型
  loading?: boolean             // 确认按钮加载状态
}
```

#### 2. 签到页面集成 (`frontend/arena/src/pages/HackathonDetail.tsx`)

- 点击"签到"按钮时，先显示 Gas 费预估模态框
- 用户确认后才执行实际签到操作
- 余额不足时禁用确认按钮

#### 3. 投票页面集成 (`frontend/arena/src/pages/SubmissionList.tsx`)

- 点击"投票"按钮时，先显示 Gas 费预估模态框
- 点击"撤回投票"按钮时，也显示 Gas 费预估模态框
- 用户确认后才执行实际操作

#### 4. 国际化支持

**中文** (`frontend/arena/src/i18n/locales/zh-CN.json`):
```json
"gasEstimate": {
  "title": "Gas 费预估",
  "checkinTitle": "签到 Gas 费预估",
  "voteTitle": "投票 Gas 费预估",
  "revokeTitle": "撤销投票 Gas 费预估",
  "estimating": "正在预估 Gas 费用...",
  "estimateFailed": "Gas 费预估失败",
  "sufficientBalance": "余额充足，可以执行操作",
  "insufficientBalance": "余额不足",
  "needToRecharge": "需要充值至少 {{amount}} ETH",
  "gasLimit": "Gas 限制",
  "gasPrice": "Gas 价格",
  "estimatedCost": "预计费用",
  "yourBalance": "您的余额",
  "tips": "温馨提示",
  "tipsContent": "Gas 费会根据网络拥堵情况实时变化，实际费用可能与预估有所差异。建议保持钱包有足够余额。"
}
```

**英文** (`frontend/arena/src/i18n/locales/en-US.json`):
```json
"gasEstimate": {
  "title": "Gas Fee Estimate",
  "checkinTitle": "Check-in Gas Fee Estimate",
  "voteTitle": "Vote Gas Fee Estimate",
  "revokeTitle": "Revoke Vote Gas Fee Estimate",
  "estimating": "Estimating gas fee...",
  "estimateFailed": "Gas fee estimation failed",
  "sufficientBalance": "Sufficient balance to proceed",
  "insufficientBalance": "Insufficient Balance",
  "needToRecharge": "Need to recharge at least {{amount}} ETH",
  "gasLimit": "Gas Limit",
  "gasPrice": "Gas Price",
  "estimatedCost": "Estimated Cost",
  "yourBalance": "Your Balance",
  "tips": "Tips",
  "tipsContent": "Gas fees fluctuate based on network congestion. Actual cost may differ from the estimate. Please ensure your wallet has sufficient balance."
}
```

## 用户体验流程

### 签到流程

1. 用户点击"签到"按钮
2. 系统调用 Gas 费预估 API
3. 显示 Gas 费预估模态框，包含：
   - Gas 限制
   - Gas 价格（Gwei）
   - 预计费用（ETH）
   - 用户余额（ETH）
   - 余额充足/不足状态
4. 用户查看信息后：
   - 余额充足：点击"确认"执行签到
   - 余额不足：提示充值金额，确认按钮禁用
5. 签到成功后关闭模态框

### 投票/撤销投票流程

与签到流程类似，只是操作类型不同。

## 技术细节

### Gas 费计算

```
总成本 = Gas 限制 × Gas 价格
```

- **Gas 限制**: 通过 `ethclient.EstimateGas()` 预估
- **Gas 价格**: 通过 `ethclient.SuggestGasPrice()` 获取当前网络价格
- **单位转换**:
  - 1 Gwei = 10^9 Wei
  - 1 ETH = 10^18 Wei

### 余额检查

```
余额是否充足 = 用户余额 >= 总成本
缺少金额 = 总成本 - 用户余额（余额不足时）
```

### 错误处理

- **Gas 估算失败**: 提示用户稍后重试
- **余额获取失败**: 提示用户检查钱包连接
- **余额不足**: 显示需要充值的金额，禁用确认按钮

## API 文档

### 预估签到 Gas 费

**请求**:
```
GET /api/v1/arena/hackathons/:id/estimate-checkin-gas
Headers: Authorization: Bearer <token>
```

**响应**:
```json
{
  "gas_limit": 50000,
  "gas_price": "20000000000",
  "gas_price_gwei": "20.00",
  "total_cost": "1000000000000000",
  "total_cost_eth": "0.001000",
  "user_balance": "5000000000000000000",
  "user_balance_eth": "5.000000",
  "is_sufficient": true,
  "shortfall_eth": "0"
}
```

### 预估投票 Gas 费

**请求**:
```
GET /api/v1/arena/submissions/:id/estimate-vote-gas
Headers: Authorization: Bearer <token>
```

**响应**: 同上

### 预估撤销投票 Gas 费

**请求**:
```
GET /api/v1/arena/submissions/:id/estimate-revoke-vote-gas
Headers: Authorization: Bearer <token>
```

**响应**: 同上

## 测试建议

### 后端测试

1. **Gas 费预估准确性测试**
   - 测试不同网络拥堵情况下的 Gas 价格
   - 验证预估值与实际消耗的误差范围

2. **余额检查测试**
   - 测试余额充足场景
   - 测试余额不足场景
   - 测试余额刚好等于成本的边界情况

3. **错误处理测试**
   - 测试无效的活动 ID
   - 测试活动未上链的情况
   - 测试用户未登录的情况

### 前端测试

1. **UI 显示测试**
   - 测试 Gas 费信息正确显示
   - 测试余额充足/不足状态正确显示
   - 测试加载状态正确显示

2. **交互测试**
   - 测试取消操作
   - 测试确认操作
   - 测试余额不足时确认按钮禁用

3. **国际化测试**
   - 测试中英文切换
   - 测试所有文本正确显示

### 集成测试

1. **完整流程测试**
   - 测试签到流程：预估 → 确认 → 执行
   - 测试投票流程：预估 → 确认 → 执行
   - 测试撤销投票流程：预估 → 确认 → 执行

2. **网络异常测试**
   - 测试 API 请求超时
   - 测试网络中断
   - 测试区块链节点不可用

## 优化建议

### 短期优化

1. **缓存 Gas 价格**: 短时间内多次预估可以使用缓存的 Gas 价格
2. **增加重试机制**: Gas 预估失败时自动重试
3. **添加刷新按钮**: 允许用户手动刷新 Gas 费预估

### 长期优化

1. **Gas 价格档位选择**: 提供慢/标准/快速三档 Gas 价格选项
2. **历史 Gas 费统计**: 展示近期 Gas 费走势图
3. **预警机制**: Gas 费异常高时提醒用户
4. **批量操作优化**: 支持批量签到或投票，减少 Gas 费消耗

## 验收标准

✅ **功能完整性**
- [x] 签到前显示 Gas 费预估
- [x] 投票前显示 Gas 费预估
- [x] 撤销投票前显示 Gas 费预估
- [x] 余额不足时禁止操作

✅ **用户体验**
- [x] Gas 费信息清晰易懂
- [x] 余额状态明确提示
- [x] 操作流程顺畅
- [x] 错误提示友好

✅ **国际化支持**
- [x] 支持中英文切换
- [x] 所有文本已国际化

✅ **代码质量**
- [x] 无 linter 错误
- [x] 代码结构清晰
- [x] 注释完善

## 总结

本次实现完成了 FS-67 的所有需求，为用户提供了链上操作前的 Gas 费预估和余额检查功能。通过这个功能：

1. **提升用户体验**: 用户在操作前可以清楚地了解需要支付的 Gas 费
2. **避免交易失败**: 余额不足时提前提示，避免交易失败
3. **增强透明度**: 展示详细的 Gas 费信息，让用户对链上操作更有信心
4. **降低操作风险**: 预估功能帮助用户做出更明智的决策

实现复杂度符合预期（2天工作量），代码质量良好，功能完整可用。

---

**实现日期**: 2025-12-26  
**Linear Issue**: FS-67  
**PRD 参考**: PRD-401 Section 8.1 (Gas 费波动应对措施)
