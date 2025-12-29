## 活动
### 102. 把它变成一份可落地的需求
- 根据需求文档：sdp/PRD401.md 中 3.1.1.* 需求 和 开发规范 tpl/contract_rules.md 生成详细的开发文档 sdp/DEV401.md 。严格按照文档要求完成，不要额外操作

### 103. 把它变成一段可运行的代码
- 根据需求文档：sdp/PRD401.md 中 3.1.1.* 需求 和 开发文档：sdp/DEV401.md 生成代码，智能合约目录为contract，实现文档中包含的所有功能，严格按照文档要求完成，不要额外操作
- 去除 .env.example 未使用配置
- 我已配置好 .env 文件，将合约部署到 Sepolia 测试网络中，部署成功后，将合约地址记录到 contract/deployments.json 中，不要额外操作
- 将合约地址回填到 backend 项目中，保证链上和链下数据结合起来，不要额外操作
— 根据需求文档：sdp/PRD401.md 中 3.1.1.* 需求更新 Linear 相关任务至 In Progress 状态,严格按照需求文档完成，不要额外操作

## PART1
### 创建活动
+ 活动上链失败: 私钥未设置，无法发送交易。上链未成功不写入数据库，私钥配置需要通过 config.yaml 文件读取，不要额外操作
+ runtime error: invalid memory address or nil pointer dereference
+ 活动地点: 链上值: 数据库值: online，修复下这个问题

### 更新活动
+ "Error 1451 (23000): Cannot delete or update a parent row: a foreign key constraint fails (`hackathon_db`.`hackathon_prizes`, CONSTRAINT `fk_hackathon_awards_prizes` FOREIGN KEY (`award_id`) REFERENCES `hackathon_awards` (`id`))"
+ 没有更新链上数据
+ 更改活动时间成功后，并没有自动分配阶段，导致发布状态并不能点击

### 删除活动
+ Admin 平台活动管理页面没有删除活动的按钮
+ 活动管理页面中删除活动，并没有删除链上数据

### 查询活动
+ 查询活动时，没有显示链上数据
+ 加载链上数据失败：interface conversion: interface {} is struct { EventId *big.Int "json:\"eventId\""; EventName string "json:\"eventName\""; Description string "json:\"description\""; StartTime *big.Int "json:\"startTime\""; EndTime *big.Int "json:\"endTime\""; Location string "json:\"location\""; Organizer common.Address "json:\"organizer\""; CreatedAt *big.Int "json:\"createdAt\""; UpdatedAt *big.Int "json:\"updatedAt\""; IsDeleted bool "json:\"isDeleted\"" }, not struct { EventId *big.Int; EventName string; Description string; StartTime *big.Int; EndTime *big.Int; Location string; Organizer common.Address; CreatedAt *big.Int; UpdatedAt *big.Int; IsDeleted bool }