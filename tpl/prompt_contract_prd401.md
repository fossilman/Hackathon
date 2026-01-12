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

## 签到信息上链
### 102. 把它变成一份可落地的需求
- 根据需求文档：sdp/PRD401.md 中 3.1.3.1 需求 和 开发规范 tpl/contract_rules.md 生成详细的开发文档 sdp/DEV401_CheckIn.md 。严格按照文档要求完成，不要额外操作。

### 103. 把它变成一段可运行的代码
- 根据需求文档：sdp/PRD401.md 中 3.1.3.1 需求 和 开发文档： sdp/DEV401_CheckIn.md 参照活动相关代码 contract/contracts/EventInfoContract.sol 和 NFT相关代码 contract/contracts/NftContract.sol （可以直接照抄，然后新增，保持原有进行迭代）生成代码，合约代码为 contract/contracts/CheckInContract.sol ，实现文档中包含的所有功能，严格按照文档要求完成，不要额外操作。
- 我已配置好 .env 文件，将 CheckInContract.sol 合约部署到 Sepolia 测试网络中，并验证源码，部署成功后，将合约地址记录到 contract/deployments_checkin.json 中，不要额外操作。
- 将 CheckIn 合约地址回填到 backend 项目中，保证链上和链下数据结合起来，不要额外操作

## PART1
### 签到信息上链
- 创建活动并没有将数据写入到 checkIn 的合约中
- 活动注册到CheckIn合约失败: 注册活动到 CheckIn 合约失败: replacement transaction underpriced
- 等待CheckIn合约注册交易确认失败: 获取交易收据失败: not found
- checkin 接口超时了

## 投票信息上链
### 102. 把它变成一份可落地的需求
- 根据需求文档：sdp/PRD401.md 中 3.1.3.2、3.1.3.3 需求 和 开发规范 tpl/contract_rules.md 生成详细的开发文档 sdp/DEV401_Vote.md 。严格按照文档要求完成，不要额外操作。

### 103. 把它变成一段可运行的代码
- 根据需求文档：sdp/PRD401.md 中 3.1.3.2、3.1.3.3 需求 和 开发文档： sdp/DEV401_Vote.md 参照活动相关代码 contract/contracts/EventInfoContract.sol 和 NFT相关代码 contract/contracts/NftContract.sol 和 活动签到相关代码 contract/contracts/CheckInContract.sol（可以直接照抄，然后新增，保持原有进行迭代）生成代码，合约代码为 contract/contracts/VoteContract.sol ，实现文档中包含的所有功能，严格按照文档要求完成，不要额外操作。
- 我已配置好 .env 文件，将 VoteContract.sol 合约部署到 Sepolia 测试网络中，并验证源码，部署成功后，将合约地址记录到 contract/deployments_vote.json 中，不要额外操作。
- 将 Vote 合约地址回填到 backend 项目中，保证链上和链下数据结合起来，不要额外操作

## PART1（codebuddy）version 1.0.0
### 编译报错
- 优化castVote函数，超过了16个solt
- 合约编译报错，事件的入参和indexed要符合开发规范
### 投票信息上链
- 创建活动时并为注册到vote合约中
- 活动注册到Vote合约失败: 调用Vote合约registerEvent函数失败: replacement transaction underpriced
- 警告: 交易确认失败: 获取交易收据失败: not found
- 投票失败并未真正投票上链
- 投票接口400，链上并没有数据记录，将vote相关的go代码调整，参考checkin和nft的go代码，gas的优化弄成统一的

## PART2 version 2.0.0
### 投票信息上链
- 投票阶段投票并没有真正投票上链
- 投票失败：注册活动到合约失败: 检查活动注册状态失败: 检查活动注册状态失败: project ID exceeded quota
- 链上投票失败: 链上投票失败: argument count mismatch: got 3 for 2

## PART3 version 3.0.0
### 投票信息上链
- 投票阶段投票并没有真正投票上链
- 代码并不能运行，go run main.go
- -# hackathon-backend/services
services/vote_blockchain_service.go:293:6: declared and not used: voteId
services/vote_blockchain_service.go:327:2: declared and not used: receipt
- 创建活动的时候，这个地方并没有上链报错：活动 64 未在链上注册，仅进行链下投票
- 接口被cancel状态，日志中，链上投票成功: txHash=0xadff0c58eefcf5c4854319a847bfe6a3b7585d2860341c3264b6b704e21b1700，实际这个交易是fail状态：out of gas
- 链上投票成功，但是前端调用后端接口http://localhost:3001/api/v1/arena/submissions/15/vote是canceled状态
- 改为不等待确认（类似 CheckIn 服务），只发送交易就返回，要在数据库中记录这个链上的数据
- 撤销投票不会撤销链上记录

## 活动信息真实性验证
### 102. 把它变成一份可落地的需求
- 根据需求文档：sdp/PRD401.md 中 3.1.3.4、3.1.3.5 需求 和 现有合约代码，生成详细的开发文档 sdp/DEV401_Verification.md（参照CheckIn、NFT和Vote）。 严格按照文档要求完成，不要额外操作。

- 根据需求文档：sdp/PRD401.md 中 3.1.3.4、3.1.3.5 需求 和 开发规范 tpl/contract_rules.md 生成详细的开发文档 sdp/DEV401_Authenticity.md 。严格按照文档要求完成，不要额外操作。

### 103. 把它变成一段可运行的代码
- 根据需求文档：sdp/PRD401.md 中 3.1.3.2、3.1.3.3 需求 和 开发文档： sdp/DEV401_Verification.md 实现文档中包含的所有功能，严格按照文档要求完成，不要额外操作。

## PART1
- Organizer mismatch: DB='0xd71Fba96C98eE438c7076984f016156E39C337cb', Blockchain='0x5FB4f1018f3abc1e8E15660FfcdE3f1ae59dA758' ,不要对比这个钱包地址了
- 投票后撤销投票数据库中总投票为0，链上为1，链上撤销投票1，数据库中为0，这样导致不一致
- 投票后撤销投票 有效投票数:数据库: 1区块链: 0 已撤销投票数:数据库: 0区块链: 1,不一致

## PART2
- 投票 -> 撤销投票 -> 再次投票报错
- 投票统计中；总投票数一致；有效投票数，数据库: 0区块链: 1；已撤销投票数，数据库: 1区块链: 0
- 投票 -> 撤销投票 -> 再次投票 报错：/Users/monstersquad/Desktop/code/web3/hackathon/backend/services/vote_service.go:140 Error 1062 (23000): Duplicate entry '3-22' for key 'votes.uk_participant_submission'
- 投票 -> 撤销投票 -> 再次投票， 链上与链下数据不一致；总投票数不一致：数据库: 1，区块链: 2；有效投票数一致；已撤销投票数不一致：数据库: 0，区块链: 1；修改链下逻辑与链上保持一致
- 1553 - Cannot drop index 'uk_participant_submission': needed in a foreign key constraint，读取config.yml文件的数据库信息直接修改

## PART3
### 优化
- NFT 发放 和 CheckIn 的状态也添加至 开始验证的范围内
### 错误
- /Users/monstersquad/Desktop/code/web3/hackathon/backend/services/verification_service.go:555 sql: Scan error on column index 0, name "ts": converting driver.Value type []uint8 ("1767689941.161") to a int64: invalid syntax
- /Users/monstersquad/Desktop/code/web3/hackathon/backend/services/verification_service.go:235 record not found
- panic recovered:[]struct { EventId *big.Int "json:\"eventId\""; TokenId *big.Int "json:\"tokenId\""; Participant common.Address "json:\"participant\""; Timestamp *big.Int "json:\"timestamp\""; IsActive bool "json:\"isActive\""; Organizer common.Address "json:\"organizer\"" }, not []struct { EventID *big.Int "json:\"eventId\""; TokenID *big.Int "json:\"tokenId\""; Participant common.Address "json:\"participant\""; Timestamp *big.Int "json:\"timestamp\""; IsActive bool "json:\"isActive\""; Organizer common.Address "json:\"organizer\"" }
- Check-in last time mismatch: DB=1767689927, Blockchain=1767691692，NFT last mint time mismatch: DB=1767689941, Blockchain=1767689940，时间不要去对比了，链上链下时间本来就不是一样的，前端中要展示出来数据
- 前端页面并没有修改

## 资金链路上链
TODO: 
- 拆分合约
    - 奖金托管合约
    - 赞助托管合约
    - 奖金分发合约
- 后端API接口
    - 创建活动时的资金托管
    - 奖金分发
    - 赞助申请托管
    - 赞助审核通过
    - 赞助审核驳回
    - 队伍奖金分成设置
    - 资金链路查询
1. 合约分为三个主要部分去实现: 奖金托管 赞助托管 奖金分发
2. 实现后端接口和合约衔接
3. UI优化

