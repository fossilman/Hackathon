# Hackathon 比赛平台

基于 PRD-101 和 DEV-101 文档实现的完整 Hackathon 比赛平台。

## 项目结构

```
HackathonDemo2/
├── backend/          # 后端服务 (Go + Gin)
├── frontend/
│   ├── admin/        # Admin Platform (React)
│   └── arena/        # Arena Platform (React)
└── prd/              # 需求文档和开发文档
```

## 技术栈

### 后端
- Go 1.21+
- Gin Web Framework
- GORM
- MySQL 8.0+
- JWT 认证

### 前端
- React 18+
- TypeScript
- Vite
- Ant Design
- Redux Toolkit
- React Router
- ethers.js (Arena Platform)

## 快速开始

### 1. 数据库设置

创建 MySQL 数据库：

```sql
CREATE DATABASE hackathon_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. 后端设置

```bash
cd backend
cp .env.example .env
# 编辑 .env 文件，配置数据库连接信息

go mod download
go run main.go
```

后端服务将在 `http://localhost:8080` 启动。

### 3. 前端 Admin Platform

```bash
cd frontend/admin
npm install
npm run dev
```

Admin Platform 将在 `http://localhost:3000` 启动。

### 4. 前端 Arena Platform

```bash
cd frontend/arena
npm install
npm run dev
```

Arena Platform 将在 `http://localhost:3001` 启动。

## 功能特性

### Admin Platform
- 用户认证（账号密码登录）
- 人员管理（Admin 权限）
- 活动管理（Organizer 权限）
  - 创建、编辑、删除活动
  - 发布活动
  - 阶段管理
  - 统计信息查看

### Arena Platform
- Metamask 钱包登录
- 活动浏览
- 报名、签到
- 组队管理
- 作品提交
- 投票功能
- 结果查看

## API 文档

### Admin Platform API
- 认证: `/api/v1/admin/auth/login`
- 用户管理: `/api/v1/admin/users`
- 活动管理: `/api/v1/admin/hackathons`

### Arena Platform API
- 认证: `/api/v1/arena/auth/connect`, `/api/v1/arena/auth/verify`
- 活动: `/api/v1/arena/hackathons`
- 报名: `/api/v1/arena/hackathons/:id/register`
- 签到: `/api/v1/arena/hackathons/:id/checkin`
- 组队: `/api/v1/arena/hackathons/:id/teams`
- 提交: `/api/v1/arena/hackathons/:id/submissions`
- 投票: `/api/v1/arena/submissions/:id/vote`
- 结果: `/api/v1/arena/hackathons/:id/results`

## 开发说明

详细的功能需求和技术实现方案请参考：
- `prd/PRD101M.md` - 需求文档
- `prd/DEV101.md` - 开发文档

## 注意事项

1. 确保 MySQL 数据库已启动并创建了相应的数据库
2. 后端启动时会自动创建数据库表（通过 GORM AutoMigrate）
3. Arena Platform 需要浏览器安装 MetaMask 插件
4. 生产环境请修改 JWT_SECRET 等敏感配置
