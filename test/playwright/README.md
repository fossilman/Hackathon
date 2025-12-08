# Playwright 测试说明

## 概述

本目录包含 Hackathon 平台的 Playwright 端到端测试脚本，覆盖 Admin Platform 和 Arena Platform 的主要功能。

## 目录结构

```
test/playwright/
├── playwright.config.ts      # Playwright 配置文件
├── package.json              # 依赖配置
├── run-tests.sh              # 测试运行脚本
├── README.md                 # 本文件
├── tests/                    # 测试脚本目录
│   ├── utils/               # 测试辅助工具
│   │   └── test-helpers.ts  # 通用测试函数
│   ├── admin-platform/      # Admin Platform 测试
│   │   ├── login.spec.ts
│   │   ├── user-management.spec.ts
│   │   └── hackathon-management.spec.ts
│   └── arena-platform/      # Arena Platform 测试
│       ├── hackathon-browse.spec.ts
│       ├── registration.spec.ts
│       ├── team-formation.spec.ts
│       ├── submission.spec.ts
│       ├── voting.spec.ts
│       └── results.spec.ts
└── reports/                  # 测试报告目录
    ├── html/                # HTML 报告
    └── test-results.json    # JSON 报告
```

## 前置条件

### 1. 安装依赖

```bash
cd test/playwright
npm install
npx playwright install chromium
```

### 2. 启动服务

在运行测试前，需要确保以下服务已启动：

- **后端服务**: `http://localhost:8080`
- **Admin Platform**: `http://localhost:3000`
- **Arena Platform**: `http://localhost:3001`

启动命令：

```bash
# 终端 1: 启动后端
cd backend
go run main.go

# 终端 2: 启动 Admin Platform
cd frontend/admin
npm run dev

# 终端 3: 启动 Arena Platform
cd frontend/arena
npm run dev
```

### 3. 准备测试数据

确保数据库中有测试数据，包括：
- Admin 用户账号（用于登录测试）
- Organizer 用户账号
- 至少一个 Hackathon 活动

## 运行测试

### 运行所有测试

```bash
npm test
# 或
./run-tests.sh
```

### 运行特定平台的测试

```bash
# 只运行 Admin Platform 测试
npm run test:admin

# 只运行 Arena Platform 测试
npm run test:arena
```

### 使用 UI 模式运行

```bash
npm run test:ui
```

### 查看测试报告

```bash
# 查看 HTML 报告
npm run report
# 或
open reports/html/index.html
```

## 测试覆盖范围

### Admin Platform 测试

- ✅ 登录功能
  - 显示登录页面
  - 正确账号密码登录
  - 错误密码提示
  - 未登录访问保护页面重定向

- ✅ 用户管理（Admin 权限）
  - 访问用户管理页面
  - 创建新用户
  - 查看用户列表
  - 搜索用户

- ✅ 活动管理
  - 访问活动列表
  - 创建新活动
  - 查看活动详情
  - 发布活动
  - 切换活动阶段

### Arena Platform 测试

- ✅ 活动浏览
  - 显示活动列表
  - 查看活动详情
  - 搜索活动
  - 筛选活动状态

- ✅ 报名功能
  - 查看报名按钮
  - 未连接钱包提示

- ✅ 组队功能
  - 访问组队页面
  - 创建队伍
  - 查看队伍列表

- ✅ 作品提交
  - 访问提交页面
  - 填写并提交作品
  - 查看作品列表

- ✅ 投票功能
  - 查看作品列表并投票
  - 查看投票结果

- ✅ 结果查看
  - 查看比赛结果
  - 显示排名列表
  - 显示获奖信息

## 已知问题

1. **Arena Platform 连接问题**: 如果 Arena Platform (localhost:3001) 未运行，相关测试会失败
2. **Metamask 集成**: 报名、签到等功能需要 Metamask 钱包，当前测试可能无法完全覆盖
3. **测试数据依赖**: 部分测试需要特定的测试数据存在

## 故障排除

### 连接被拒绝错误

如果看到 `ERR_CONNECTION_REFUSED` 错误，请确保：
1. 后端服务在 `http://localhost:8080` 运行
2. Admin Platform 在 `http://localhost:3000` 运行
3. Arena Platform 在 `http://localhost:3001` 运行

### 元素未找到错误

如果测试报告元素未找到，可能原因：
1. 页面结构已更改，需要更新选择器
2. 页面加载时间较长，需要增加等待时间
3. 测试数据不存在，需要先创建测试数据

### 登录失败

确保测试账号存在且密码正确：
- Admin: `admin@example.com` / `admin123`
- Organizer: `organizer@example.com` / `organizer123`

## 持续改进

测试脚本会根据实际页面结构和功能变化持续更新。如果发现测试失败，请：

1. 检查是否是页面结构变化导致的
2. 更新相应的选择器和测试逻辑
3. 重新运行测试验证修复

## 贡献

添加新测试时，请遵循以下规范：

1. 使用描述性的测试名称（中文）
2. 使用 `test-helpers.ts` 中的辅助函数
3. 添加适当的等待和错误处理
4. 确保测试可以独立运行

