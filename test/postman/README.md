# Hackathon API 测试文档

## 概述

本目录包含 Hackathon 比赛平台的 API 测试集合，使用 Postman Collection 格式。

## 文件说明

- `hackathon-api-tests.json` - Postman Collection 测试文件
- `run-tests.sh` - 自动化测试脚本（使用 Newman CLI）
- `reports/` - 测试报告目录

## 前置要求

### 1. 安装 Newman

Newman 是 Postman 的命令行工具，用于运行 Postman Collections。

```bash
npm install -g newman newman-reporter-html
```

### 2. 启动后端服务器

确保后端服务器运行在 `http://localhost:8080`

```bash
cd backend
go run main.go
```

### 3. 准备测试数据

#### Admin 账号

确保存在以下测试账号（或使用脚本创建）：

- Email: `admin@example.com`
- Password: `admin123`
- Role: `admin`

#### 测试钱包地址

默认使用钱包地址: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`

## 运行测试

### 方法1: 使用测试脚本（推荐）

```bash
cd test/postman
chmod +x run-tests.sh
./run-tests.sh
```

### 方法2: 使用 Newman 直接运行

```bash
cd test/postman
newman run hackathon-api-tests.json \
    --reporters html,cli \
    --reporter-html-export reports/test-report.html
```

### 方法3: 使用 Postman GUI

1. 打开 Postman
2. 导入 `hackathon-api-tests.json`
3. 运行 Collection

## 测试覆盖范围

### Admin Platform API

- ✅ 认证相关
  - 登录
  - 登出
- ✅ 人员管理（Admin权限）
  - 创建用户
  - 获取用户列表
- ✅ 活动管理
  - 创建活动
  - 获取活动列表
  - 获取活动详情
  - 发布活动
  - 切换活动阶段

### Arena Platform API

- ✅ 认证相关
  - 连接钱包
  - 验证签名
- ✅ 活动相关
  - 获取活动列表
  - 获取活动详情
- ✅ 报名相关
  - 报名
  - 查询报名状态
- ✅ 签到相关
  - 签到
  - 查询签到状态
- ✅ 组队相关
  - 创建队伍
  - 获取队伍列表
  - 获取队伍详情
- ✅ 作品提交相关
  - 提交作品
  - 获取作品列表
- ✅ 投票相关
  - 投票
  - 获取我的投票记录
- ✅ 结果查看
  - 获取比赛结果

## 测试报告

测试运行后，报告会保存在 `reports/` 目录下：

- `test-report-YYYYMMDD_HHMMSS.html` - HTML 格式测试报告
- `test-report-YYYYMMDD_HHMMSS.json` - JSON 格式测试报告

## 变量说明

Collection 使用以下变量：

- `base_url` - API 基础URL（默认: http://localhost:8080）
- `admin_token` - Admin JWT Token（自动设置）
- `arena_token` - Arena JWT Token（自动设置）
- `hackathon_id` - 活动ID（自动设置）
- `team_id` - 队伍ID（自动设置）
- `submission_id` - 作品ID（自动设置）
- `wallet_address` - 钱包地址（默认: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb）
- `nonce` - 签名随机数（自动设置）

## 故障排除

### 服务器未运行

```
错误: 服务器未运行在 http://localhost:8080
```

解决：启动后端服务器

### Newman 未安装

```
错误: newman 未安装
```

解决：运行 `npm install -g newman newman-reporter-html`

### 认证失败

如果登录失败，检查：
1. 测试账号是否存在
2. 密码是否正确
3. 数据库连接是否正常

### 钱包签名验证失败

Arena Platform 的签名验证需要真实的以太坊签名。测试时可以使用模拟签名，但需要确保签名格式正确（130个十六进制字符）。

## 持续集成

可以将测试集成到 CI/CD 流程中：

```yaml
# .github/workflows/api-tests.yml
- name: Run API Tests
  run: |
    cd test/postman
    npm install -g newman newman-reporter-html
    ./run-tests.sh
```

