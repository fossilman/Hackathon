# Hackathon 比赛平台

## 项目概述

本项目是一个完整的 Hackathon（黑客松）比赛平台，支持主办方、参赛者和赞助商三方协同参与。平台分为两个独立的应用系统：

- **Hackathon Admin Platform**：供主办方和赞助商使用，用于活动管理和人员管理
- **Hackathon Arena Platform**：供参赛者使用，用于参与比赛的全流程操作

## 技术栈

### 后端
- Go 1.21+
- Gin Web框架
- GORM ORM
- MySQL 8.0+
- JWT认证

### 前端
- React 18+
- TypeScript
- Vite
- Ant Design
- Zustand状态管理
- React Router
- ethers.js (Arena平台用于Metamask连接)

## 项目结构

```
Hackathon/
├── backend/                 # 后端Go应用
│   ├── config/             # 配置管理
│   ├── controllers/        # 控制器
│   ├── database/           # 数据库连接
│   ├── middleware/         # 中间件
│   ├── models/             # 数据模型
│   ├── routes/             # 路由
│   ├── services/           # 业务逻辑
│   ├── utils/              # 工具函数
│   └── main.go             # 入口文件
├── frontend/
│   ├── admin/              # Admin前端应用
│   └── arena/              # Arena前端应用
└── sdp/                    # 需求文档和开发文档
```

## 快速开始

### 环境要求

- Go 1.21+
- Node.js 18+
- MySQL 8.0+
- npm 或 yarn

### 数据库设置

1. 创建数据库：
```sql
CREATE DATABASE hackathon_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. 配置数据库连接，有两种方式：

**方式一：使用 YAML 配置文件（推荐）**
```bash
cd backend
cp config.yaml.example config.yaml
# 编辑 config.yaml 文件，修改数据库配置
```

**方式二：使用环境变量**
```bash
cd backend
# 创建 .env 文件并配置环境变量
# 或者直接设置系统环境变量
```

详细配置说明请参考 `backend/ENV_CONFIG.md`

### 后端启动

```bash
cd backend
go mod download
go run main.go
```

后端服务将在 `http://localhost:8080` 启动

### 前端启动

#### Admin Platform
```bash
cd frontend/admin
npm install
npm run dev
```

Admin平台将在 `http://localhost:3000` 启动

#### Arena Platform
```bash
cd frontend/arena
npm install
npm run dev
```

Arena平台将在 `http://localhost:3001` 启动

## API文档

### Admin Platform API

- `POST /api/v1/admin/auth/login` - 登录
- `GET /api/v1/admin/users` - 获取用户列表（Admin权限）
- `POST /api/v1/admin/users` - 创建用户（Admin权限）
- `GET /api/v1/admin/hackathons` - 获取活动列表
- `POST /api/v1/admin/hackathons` - 创建活动
- `POST /api/v1/admin/hackathons/:id/publish` - 发布活动
- `POST /api/v1/admin/hackathons/:id/stages/:stage/switch` - 切换活动阶段

### Arena Platform API

- `POST /api/v1/arena/auth/connect` - 连接钱包，获取nonce
- `POST /api/v1/arena/auth/verify` - 验证签名，完成登录
- `GET /api/v1/arena/hackathons` - 获取已发布的活动列表
- `POST /api/v1/arena/hackathons/:id/register` - 报名
- `POST /api/v1/arena/hackathons/:id/checkin` - 签到
- `POST /api/v1/arena/hackathons/:id/teams` - 创建队伍
- `POST /api/v1/arena/hackathons/:id/submissions` - 提交作品
- `POST /api/v1/arena/submissions/:id/vote` - 投票
- `GET /api/v1/arena/hackathons/:id/results` - 查看结果

## 功能特性

### Admin Platform
- ✅ 用户登录（账号密码）
- ✅ 人员管理（Admin权限）
- ✅ 活动创建、编辑、删除
- ✅ 活动发布和阶段管理
- ✅ 活动列表和详情查看

### Arena Platform
- ✅ Metamask钱包登录
- ✅ 活动浏览
- ✅ 报名和签到
- ✅ 组队功能
- ✅ 作品提交
- ✅ 投票功能
- ✅ 结果查看

## 开发规范

- 后端使用Go标准命名规范
- 前端使用TypeScript和React Hooks
- API遵循RESTful规范
- 统一使用UTF-8编码
- 所有时间使用UTC时间存储

## 许可证

MIT License
