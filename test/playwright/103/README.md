# Hackathon Admin Platform E2E 测试

基于 PRD103 需求文档的 Playwright E2E 测试套件。

## 目录结构

```
test/playwright/103/
├── playwright.config.ts          # Playwright 配置文件
├── package.json                  # 项目依赖和脚本
├── setup-test-data.go            # 测试数据生成脚本
├── cleanup-test-data.go          # 测试数据清理脚本
├── README.md                     # 本文档
├── tests/
│   ├── setup/
│   │   ├── helpers.ts           # 测试辅助函数
│   │   └── test-data.ts         # 测试数据定义
│   ├── 01-auth.spec.ts          # 认证模块测试
│   ├── 02-page-access.spec.ts  # 页面访问权限测试
│   ├── 03-user-management.spec.ts # 用户管理操作权限测试
│   ├── 04-hackathon-management.spec.ts # 活动管理操作权限测试
│   ├── 05-stages.spec.ts        # 阶段管理测试
│   ├── 06-pagination.spec.ts   # 分页功能测试
│   └── 07-profile.spec.ts      # 个人中心测试
└── reports/                      # 测试报告目录（自动生成）
```

## 环境要求

- Node.js >= 18
- Go >= 1.19（用于运行测试数据脚本）
- 后端服务运行在 `http://localhost:8000`
- 前端服务运行在 `http://localhost:3000`

## 安装

```bash
cd test/playwright/103
npm install
```

## 使用

### 1. 准备测试数据

在运行测试前，需要先创建测试数据：

```bash
# 确保后端服务已启动
go run setup-test-data.go
```

这将创建：
- 25个主办方用户（organizer1@test.com 到 organizer25@test.com）
- 25个赞助商用户（sponsor1@test.com 到 sponsor25@test.com）
- 30个测试活动（用于分页测试）

### 2. 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试套件
npm run test:auth              # 认证测试
npm run test:page-access       # 页面访问权限测试
npm run test:user-management   # 用户管理测试
npm run test:hackathon-management # 活动管理测试
npm run test:stages            # 阶段管理测试
npm run test:pagination        # 分页测试
npm run test:profile           # 个人中心测试

# 以UI模式运行（推荐用于调试）
npm run test:ui

# 以调试模式运行
npm run test:debug

# 以有头模式运行（显示浏览器）
npm run test:headed
```

### 3. 查看测试报告

```bash
npm run report
```

测试报告将自动生成在 `reports/html` 目录下。

### 4. 清理测试数据

测试完成后，清理测试数据：

```bash
go run cleanup-test-data.go
```

## 测试覆盖

### 认证模块（01-auth.spec.ts）
- ✅ Admin/主办方/赞助商登录
- ✅ 登录失败场景
- ✅ 登出功能
- ✅ 修改密码
- ✅ 查看个人信息
- ✅ 修改个人信息
- ✅ 不能修改邮箱和角色

### 页面访问权限（02-page-access.spec.ts）
- ✅ Admin页面访问权限
- ✅ 主办方页面访问权限
- ✅ 赞助商页面访问权限
- ✅ 未登录用户重定向

### 用户管理操作权限（03-user-management.spec.ts）
- ✅ Admin查看人员列表
- ✅ Admin添加主办方/赞助商人员
- ✅ Admin编辑人员信息
- ✅ Admin删除人员
- ✅ Admin重置人员密码
- ✅ 主办方/赞助商不能访问人员管理

### 活动管理操作权限（04-hackathon-management.spec.ts）
- ✅ 活动列表查看和筛选
- ✅ 活动创建（仅主办方）
- ✅ 活动编辑（仅创建者，且仅预备状态）
- ✅ 活动发布（仅创建者）
- ✅ 活动详情查看
- ✅ Admin不能创建/编辑活动

### 阶段管理（05-stages.spec.ts）
- ✅ 活动创建者访问阶段管理
- ✅ 设置阶段时间
- ✅ 查看时间轴视图
- ✅ 手动切换活动阶段
- ✅ Admin不能管理阶段
- ✅ 其他主办方不能管理非自己创建的活动阶段

### 分页功能（06-pagination.spec.ts）
- ✅ 用户列表分页
- ✅ 活动列表分页
- ✅ 切换每页显示数量
- ✅ 翻页功能
- ✅ 显示总记录数
- ✅ 筛选和排序后分页仍然有效

### 个人中心（07-profile.spec.ts）
- ✅ 所有角色可以访问
- ✅ 查看个人信息
- ✅ 修改个人信息
- ✅ 修改密码功能

## 测试用户

测试脚本使用以下测试用户：

- **Admin**: `admin@test.com` / `Admin123456`
- **主办方1**: `organizer1@test.com` / `Organizer123456`
- **主办方2**: `organizer2@test.com` / `Organizer123456`
- **赞助商**: `sponsor@test.com` / `Sponsor123456`

## 注意事项

1. **测试数据依赖**: 某些测试依赖于测试数据的存在。确保在运行测试前已执行 `setup-test-data.go`。

2. **测试顺序**: 测试是并行运行的，但某些测试可能依赖于特定的测试数据状态。

3. **时间选择器**: 活动创建测试中的时间选择器可能需要特殊处理，因为 ReactQuill 和日期选择器的交互可能因实现而异。

4. **权限验证**: 某些权限验证依赖于后端实现。如果后端权限检查不完整，某些测试可能会失败。

5. **清理数据**: 测试完成后记得运行 `cleanup-test-data.go` 清理测试数据。

## 故障排除

### 测试失败：找不到元素

- 检查前端服务是否正常运行在 `http://localhost:3000`
- 检查 `data-testid` 属性是否正确设置
- 使用 `npm run test:debug` 调试

### 测试失败：权限错误

- 检查后端服务是否正常运行在 `http://localhost:8000`
- 检查测试用户是否存在
- 检查后端权限中间件是否正确实现

### 测试数据创建失败

- 检查后端服务是否正常运行
- 检查数据库连接是否正常
- 检查测试用户是否已存在（可能需要先清理）

## 与 PRD103 的对应关系

本测试套件完全基于 PRD103 需求文档编写，测试用例与需求文档中的功能点一一对应：

- **3.1 页面列表及访问权限** → `02-page-access.spec.ts`
- **4.1 用户认证模块** → `01-auth.spec.ts`, `07-profile.spec.ts`
- **4.2 人员管理模块** → `03-user-management.spec.ts`
- **4.3 活动管理模块** → `04-hackathon-management.spec.ts`
- **4.4 活动阶段管理模块** → `05-stages.spec.ts`
- **分页功能** → `06-pagination.spec.ts`

## 贡献

如果发现测试用例与需求不符或需要补充，请：
1. 检查 PRD103 需求文档
2. 更新相应的测试文件
3. 确保测试通过

