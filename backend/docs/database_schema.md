# 数据库表结构文档

## 表结构总览

本项目共包含 **17 张数据表**，分为以下几个模块：

### 1. 用户管理模块

#### 1.1 users - 用户表
- **用途**：存储管理员、主办方、赞助商用户信息
- **字段**：
  - `id`: 主键
  - `name`: 用户名
  - `phone`: 手机号（唯一索引）
  - `password`: 密码（加密存储）
  - `role`: 角色（enum: admin/organizer/sponsor）
  - `sponsor_id`: 关联赞助商ID（可选）
  - `status`: 状态（1-启用，0-禁用）
  - `created_at`, `updated_at`, `deleted_at`: 时间戳

#### 1.2 user_wallets - 用户钱包地址表
- **用途**：存储用户的钱包地址（一个用户可以有多个钱包）
- **字段**：
  - `id`: 主键
  - `user_id`: 关联用户ID
  - `address`: 钱包地址（唯一索引）
  - `created_at`, `updated_at`: 时间戳

#### 1.3 participants - 参赛者表
- **用途**：存储Arena平台的参赛者信息（通过Metamask登录）
- **字段**：
  - `id`: 主键
  - `wallet_address`: 钱包地址（唯一索引）
  - `nickname`: 用户昵称
  - `nonce`: 签名nonce（用于Web3登录）
  - `last_login_at`: 最后登录时间
  - `created_at`, `updated_at`, `deleted_at`: 时间戳

### 2. 活动管理模块

#### 2.1 hackathons - 活动表
- **用途**：存储Hackathon活动的基本信息
- **字段**：
  - `id`: 主键
  - `name`: 活动名称
  - `description`: 活动描述
  - `start_time`: 开始时间
  - `end_time`: 结束时间
  - `location_type`: 活动类型（enum: online/offline/hybrid）
  - `city`: 城市
  - `location_detail`: 具体地址
  - `status`: 活动状态（enum: preparation/published/registration/checkin/team_formation/submission/voting/results）
  - `organizer_id`: 主办方ID
  - `max_team_size`: 最大队伍人数
  - `max_participants`: 最大参与人数（0表示不限制）
  - `created_at`, `updated_at`, `deleted_at`: 时间戳

#### 2.2 hackathon_stages - 活动阶段时间表
- **用途**：存储活动的各个阶段时间
- **字段**：
  - `id`: 主键
  - `hackathon_id`: 活动ID（唯一索引：uk_hackathon_stage）
  - `stage`: 阶段类型（enum: registration/checkin/team_formation/submission/voting）
  - `start_time`: 阶段开始时间
  - `end_time`: 阶段结束时间
  - `created_at`, `updated_at`: 时间戳

#### 2.3 hackathon_awards - 活动奖项表
- **用途**：存储活动的奖项设置
- **字段**：
  - `id`: 主键
  - `hackathon_id`: 活动ID
  - `name`: 奖项名称
  - `prize`: 奖金金额（字符串，如"1000USD"）
  - `quantity`: 获奖名额
  - `rank`: 排名
  - `created_at`, `updated_at`: 时间戳

#### 2.4 hackathon_prizes - 活动奖品表
- **用途**：存储奖项的详细奖品信息
- **字段**：
  - `id`: 主键
  - `hackathon_id`: 活动ID
  - `award_id`: 关联奖项ID
  - `name`: 奖品名称
  - `description`: 奖品描述
  - `image_url`: 奖品图片URL
  - `order`: 排序
  - `created_at`, `updated_at`: 时间戳

### 3. 报名签到模块

#### 3.1 registrations - 报名记录表
- **用途**：存储参赛者的报名记录
- **字段**：
  - `id`: 主键
  - `hackathon_id`: 活动ID（唯一索引：uk_hackathon_participant）
  - `participant_id`: 参赛者ID（唯一索引：uk_hackathon_participant）
  - `created_at`: 报名时间

#### 3.2 checkins - 签到记录表
- **用途**：存储参赛者的签到记录
- **字段**：
  - `id`: 主键
  - `hackathon_id`: 活动ID（唯一索引：uk_hackathon_participant）
  - `participant_id`: 参赛者ID（唯一索引：uk_hackathon_participant）
  - `created_at`: 签到时间

### 4. 队伍管理模块

#### 4.1 teams - 队伍表
- **用途**：存储队伍信息
- **字段**：
  - `id`: 主键
  - `hackathon_id`: 活动ID（唯一索引：uk_hackathon_leader）
  - `name`: 队伍名称
  - `leader_id`: 队长ID（唯一索引：uk_hackathon_leader）
  - `max_size`: 最大人数
  - `status`: 队伍状态（enum: recruiting/locked）
  - `created_at`, `updated_at`, `deleted_at`: 时间戳

#### 4.2 team_members - 队伍成员表
- **用途**：存储队伍成员信息
- **字段**：
  - `id`: 主键
  - `team_id`: 队伍ID（唯一索引：uk_team_participant）
  - `participant_id`: 参赛者ID（唯一索引：uk_team_participant）
  - `role`: 角色（enum: leader/member）
  - `joined_at`: 加入时间

### 5. 作品提交模块

#### 5.1 submissions - 作品提交表
- **用途**：存储队伍提交的作品
- **字段**：
  - `id`: 主键
  - `hackathon_id`: 活动ID（唯一索引：uk_hackathon_team）
  - `team_id`: 队伍ID（唯一索引：uk_hackathon_team）
  - `name`: 作品名称
  - `description`: 作品描述
  - `link`: 作品链接
  - `draft`: 是否草稿（1-草稿，0-已提交）
  - `created_at`, `updated_at`: 时间戳

#### 5.2 submission_histories - 作品修改记录表
- **用途**：存储作品的历史修改记录
- **字段**：
  - `id`: 主键
  - `submission_id`: 作品ID
  - `participant_id`: 修改者ID
  - `name`: 作品名称（历史版本）
  - `description`: 作品描述（历史版本）
  - `link`: 作品链接（历史版本）
  - `created_at`: 修改时间

#### 5.3 votes - 投票记录表
- **用途**：存储参赛者对作品的投票记录
- **字段**：
  - `id`: 主键
  - `hackathon_id`: 活动ID
  - `participant_id`: 投票者ID（唯一索引：uk_participant_submission）
  - `submission_id`: 作品ID（唯一索引：uk_participant_submission）
  - `created_at`: 投票时间

### 6. 赞助商模块

#### 6.1 sponsor_applications - 赞助商申请表
- **用途**：存储赞助商的申请记录
- **字段**：
  - `id`: 主键
  - `phone`: 手机号（唯一索引）
  - `logo_url`: Logo URL
  - `sponsor_type`: 赞助类型（enum: long_term/event_specific）
  - `event_ids`: 活动ID列表（JSON字符串）
  - `status`: 审核状态（enum: pending/approved/rejected）
  - `created_at`: 申请时间
  - `reviewed_at`: 审核时间
  - `reviewer_id`: 审核人ID
  - `reject_reason`: 拒绝原因
  - `deleted_at`: 软删除时间戳

#### 6.2 sponsors - 赞助商表
- **用途**：存储审核通过的赞助商信息
- **字段**：
  - `id`: 主键
  - `user_id`: 关联用户ID（唯一索引）
  - `logo_url`: Logo URL
  - `sponsor_type`: 赞助类型（enum: long_term/event_specific）
  - `status`: 状态（enum: active/inactive）
  - `application_id`: 关联申请ID
  - `created_at`, `updated_at`, `deleted_at`: 时间戳

#### 6.3 hackathon_sponsor_events - 活动赞助商关联表
- **用途**：存储活动与赞助商的关联关系（活动指定赞助商）
- **字段**：
  - `id`: 主键
  - `hackathon_id`: 活动ID（唯一索引：uk_hackathon_sponsor）
  - `sponsor_id`: 赞助商ID（唯一索引：uk_hackathon_sponsor）
  - `created_at`, `updated_at`: 时间戳

## 表关系图

```
users (用户)
├── user_wallets (用户钱包)
├── sponsors (赞助商) [通过sponsor_id]
└── hackathons (活动) [作为organizer_id]

participants (参赛者)
├── registrations (报名)
├── checkins (签到)
├── teams (队伍) [作为leader_id]
├── team_members (队伍成员)
└── votes (投票)

hackathons (活动)
├── hackathon_stages (阶段时间)
├── hackathon_awards (奖项)
│   └── hackathon_prizes (奖品)
├── registrations (报名)
├── checkins (签到)
├── teams (队伍)
├── submissions (作品)
└── hackathon_sponsor_events (赞助商关联)

sponsor_applications (赞助申请)
└── sponsors (赞助商) [审核通过后创建]

sponsors (赞助商)
├── users (用户) [通过user_id]
└── hackathon_sponsor_events (活动关联)
```

## 索引说明

### 唯一索引
- `users.phone`: 手机号唯一
- `user_wallets.address`: 钱包地址唯一
- `participants.wallet_address`: 参赛者钱包地址唯一
- `hackathon_stages.(hackathon_id, stage)`: 每个活动的每个阶段唯一
- `registrations.(hackathon_id, participant_id)`: 每个参赛者在一个活动中只能报名一次
- `checkins.(hackathon_id, participant_id)`: 每个参赛者在一个活动中只能签到一次
- `teams.(hackathon_id, leader_id)`: 每个队长在一个活动中只能创建一个队伍
- `team_members.(team_id, participant_id)`: 每个参赛者在一个队伍中只能加入一次
- `submissions.(hackathon_id, team_id)`: 每个队伍在一个活动中只能提交一个作品
- `votes.(participant_id, submission_id)`: 每个参赛者对一个作品只能投票一次
- `sponsor_applications.phone`: 手机号唯一
- `sponsors.user_id`: 用户ID唯一
- `hackathon_sponsor_events.(hackathon_id, sponsor_id)`: 每个活动与每个赞助商的关联唯一

## 数据完整性

1. **外键约束**：所有关联关系都通过GORM的`foreignKey`标签定义
2. **软删除**：部分表支持软删除（`deleted_at`字段）
3. **枚举类型**：使用MySQL的ENUM类型确保数据一致性
4. **时间戳**：所有表都包含`created_at`和`updated_at`字段

## 注意事项

1. **HackathonAward.Prize字段**：当前使用`string`类型存储奖金金额（如"1000USD"），如需数值计算可考虑改为`decimal`类型
2. **SponsorApplication.EventIDs字段**：使用JSON字符串存储活动ID列表，如需查询优化可考虑使用关联表
3. **软删除**：使用GORM的软删除功能，删除记录时只更新`deleted_at`字段，不会物理删除数据

