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

## NFT发放
### 102. 把它变成一份可落地的需求
- 根据需求文档：sdp/PRD401.md 中 3.1.2.* 需求 和 开发规范 tpl/contract_rules.md 生成详细的开发文档 sdp/DEV401_NFT.md 。严格按照文档要求完成，不要额外操作。

### 103. 把它变成一段可运行的代码
- 根据需求文档：sdp/PRD401.md 中 3.1.2.* 需求 和 开发文档：sdp/DEV401_NFT.md 参照活动相关代码 contract/contracts/EventInfoContract.sol（可以直接照抄，然后新增，保持原有进行迭代）生成代码，，合约代码为 contract/contracts/NftContract.sol ，实现文档中包含的所有功能，严格按照文档要求完成，不要额外操作。
- 我已配置好 .env 文件，将 NftContract.sol 合约部署到 Sepolia 测试网络中，并验证源码，部署成功后，将合约地址记录到 contract/deployments_nft.json 中，不要额外操作。
- 将 NFT 合约地址回填到 backend 项目中，保证链上和链下数据结合起来，不要额外操作

## PART1
### 签到阶段
- 签到阶段并没有为已经签到的参赛者发送NFT凭证
- 项目启动失败：# hackathon-backend/controllers
controllers/arena_registration_controller.go:112:42: participantService.GetParticipantByID undefined (type *services.ParticipantService has no field or method GetParticipantByID)
controllers/nft_controller.go:27:30: undefined: services.NewHackathonService
controllers/nft_controller.go:189:2: declared and not used: hackathon
controllers/nft_controller.go:327:2: declared and not used: hackathon
- 代码中一直有这个提示：/Users/monstersquad/Desktop/code/web3/hackathon/backend/services/registration_service.go:171 record not found
- 接口返回成功，"data": {
        "check_in": "success",
        "message": "签到成功，NFT正在发放中",
        "nft_minting": "initiated"
    }，但实际并未为签到者颁发NFT

- 签到颁发NFT失败：开始为参赛者 0xd71fba96c98ee438c7076984f016156e39c337cb 发放活动 47 的NFT。NFT发放失败: participant=0xd71fba96c98ee438c7076984f016156e39c337cb, eventID=47, error=调用NFT合约函数失败: execution reverted: Event does not exist
- 活动创建时候，将该活动注册到NFT中
- NFT发放成功: participant=0xd71fba96c98ee438c7076984f016156e39c337cb, eventID=48, tokenID=9944367, txHash=0xd533a5b3de3af0fddb8fbc4a1f49bdcb4c950ce3e25fa070d9f24b805d6b951f,记录NFT发放到数据库失败: Error 1364 (HY000): Field 'hackathon_id' doesn't have a default value
- 记录NFT发放到数据库失败: Error 1364 (HY000): Field 'hackathon_id' doesn't have a default value