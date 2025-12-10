# PRD104 Playwright E2E 测试

本目录包含根据 PRD104 需求文档生成的 Playwright E2E 测试脚本。

## 测试覆盖范围

根据 PRD104 文档，测试覆盖以下功能模块：

1. **01-auth.spec.ts** - 用户认证模块（PRD104 4.1）
   - 连接 Metamask 钱包
   - 断开连接
   - 查看个人中心
   - 切换钱包账户

2. **02-hackathon-browse.spec.ts** - 活动浏览模块（PRD104 4.2）
   - 查看活动列表
   - 查看活动详情
   - 分页功能
   - 我的活动页面

3. **03-registration.spec.ts** - 报名模块（PRD104 4.3）
   - 在报名阶段报名
   - 取消报名
   - 报名状态显示
   - 权限验证

4. **04-checkin.spec.ts** - 签到模块（PRD104 4.4）
   - 在签到阶段签到
   - 签到权限验证
   - 重复签到验证

5. **05-team-formation.spec.ts** - 组队模块（PRD104 4.5）
   - 创建队伍
   - 加入队伍
   - 查看队伍列表
   - 组队权限验证

6. **06-submission.spec.ts** - 作品提交模块（PRD104 4.6）
   - 队长提交作品
   - 表单验证
   - 提交权限验证

7. **07-voting.spec.ts** - 投票模块（PRD104 4.7）
   - 在投票阶段投票
   - 查看作品列表
   - 重复投票验证
   - 投票权限验证

8. **08-results.spec.ts** - 结果查看模块（PRD104 4.8）
   - 查看最终排名
   - 查看统计数据
   - 查看获奖队伍信息
   - 结果查看权限验证

## 测试数据

测试数据通过 `setup-test-data.go` 脚本创建：

- **活动数量**: 42个活动（每个阶段6个）
- **时间范围**: 从60天前到90天后
- **阶段覆盖**: 覆盖所有7个阶段（published, registration, checkin, team_formation, submission, voting, results）
- **分页测试**: 每页12个活动，42个活动可以测试4页

## 环境要求

- 后端服务运行在 `http://localhost:8000`
- 前端服务运行在 `http://localhost:3001`
- Node.js 和 npm 已安装
- Playwright 已安装

## 安装依赖

```bash
npm install
```

## 准备测试数据

在运行测试前，需要先创建测试数据：

```bash
go run setup-test-data.go
```

这将创建：
- 主办方用户（organizer1@test.com）
- 42个测试活动，覆盖所有阶段
- 每个阶段都有足够的测试数据

## 运行测试

### 运行所有测试

```bash
npm test
```

### 运行特定测试文件

```bash
npx playwright test tests/01-auth.spec.ts
```

### 以 UI 模式运行

```bash
npm run test:ui
```

### 以有头模式运行（显示浏览器）

```bash
npm run test:headed
```

### 调试模式

```bash
npm run test:debug
```

### 查看测试报告

```bash
npm run test:report
```

## 测试配置

测试配置在 `playwright.config.ts` 中：

- **baseURL**: `http://localhost:3001`
- **后端端口**: `8000`
- **前端端口**: `3001`
- **浏览器**: Chromium

## 测试辅助函数

测试辅助函数在 `tests/setup/helpers.ts` 中：

- `connectWallet()` - 连接钱包
- `disconnectWallet()` - 断开连接
- `navigateAndWait()` - 导航并等待页面加载
- `waitForMessage()` - 等待消息提示
- `fillFormField()` - 填写表单字段
- `submitForm()` - 提交表单
- `waitForListLoad()` - 等待列表加载
- `waitForModal()` - 等待 Modal 打开

## 测试钱包地址

测试使用的模拟钱包地址：

- `participant1`: `0x1111111111111111111111111111111111111111`
- `participant2`: `0x2222222222222222222222222222222222222222`
- `participant3`: `0x3333333333333333333333333333333333333333`
- `participant4`: `0x4444444444444444444444444444444444444444`
- `participant5`: `0x5555555555555555555555555555555555555555`

## 注意事项

1. **测试数据依赖**: 测试依赖于测试数据的存在，确保在运行测试前已执行 `setup-test-data.go`
2. **服务状态**: 确保后端和前端服务都在运行
3. **时间敏感**: 某些测试依赖于活动阶段的时间设置，如果时间过期，测试可能会跳过
4. **状态依赖**: 某些测试需要先完成前置操作（如报名、签到等），测试会自动处理这些依赖

## 测试结果

测试结果保存在 `reports/` 目录：

- `reports/html/` - HTML 报告
- `reports/junit.xml` - JUnit XML 报告
- `reports/results.json` - JSON 报告

## 故障排除

### 测试失败：找不到元素

- 检查前端服务是否运行
- 检查测试数据是否已创建
- 检查 testid 是否正确

### 测试失败：超时

- 检查后端服务是否运行
- 检查网络连接
- 增加超时时间（在 playwright.config.ts 中）

### 测试跳过

- 某些测试可能因为缺少测试数据而跳过
- 确保测试数据覆盖所有阶段

## 与 PRD104 的对应关系

每个测试文件都对应 PRD104 文档中的相应章节：

- 测试用例与 PRD104 中的操作权限矩阵一一对应
- 测试覆盖了所有主要功能点
- 测试验证了权限控制规则

