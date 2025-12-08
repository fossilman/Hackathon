# PRD103 权限管理模块测试

根据 PRD103.md 需求文档生成的 Playwright 测试脚本。

## 测试范围

- 用户认证模块（登录、登出、权限验证）
- 页面访问权限（各角色的页面访问控制）
- 人员管理模块（仅Admin）
- 活动管理模块（创建、查看权限）
- 个人中心模块（所有角色）

## 测试数据

测试用户已定义在 `tests/setup/test-data.ts` 中：
- admin@test.com (Admin)
- organizer1@test.com (主办方1)
- organizer2@test.com (主办方2)
- sponsor@test.com (赞助商)

## 运行测试

### 前置条件

1. 确保后端服务运行在 `http://localhost:8080`
2. 确保前端服务运行在 `http://localhost:5173`（或修改 `playwright.config.ts` 中的配置）
3. 确保测试用户已创建（运行 `setup-test-users.sh` 脚本）

### 安装依赖

```bash
cd test/playwright/103
npm install
```

### 运行所有测试

```bash
npm test
```

### 运行测试并查看UI

```bash
npm run test:ui
```

### 查看测试报告

```bash
npm run report
```

## 测试报告

测试报告将生成在 `reports/` 目录下：
- `reports/html/` - HTML 报告
- `reports/results.json` - JSON 结果
- `reports/junit.xml` - JUnit XML 格式

