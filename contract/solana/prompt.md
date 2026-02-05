### PART1
#### 数据上链-活动数据上链
+ 当主办方发布活动时，将活动数据上链
+ 发布活动后，活动数据不可修改，即链上信息不可再更改
+ 删除活动后，销毁链上数据，返还rent
+ 当活动进入报名阶段后，活动不可再删除
+ 根据tpl/solana_test_rules.md中的规范增加测试用例
#### 钱包登录方式更改
+ 钱包登录方式中支持Phantom钱包，当用户同时拥有MetaMask和Phantom钱包时，让用户选择项使用的钱包
+ 钱包表中新增字段，记录钱包类型
+ 参赛者表中新增字段，记录钱包类型
+ 当钱包选定Phantom时，网络为Solana
+ 将MetaMask改为MetaMask on EVM，Phantom改为Phantom on Solana
#### 数据上链-签到信息上链
+ 在签到阶段结束后，统一将数据库中的签到信息集中上链
+ 链上的签到信息会用作后续的身份校验
+ 根据tpl/solana_test_rules.md中的规范增加测试用例
#### 数据上链-投票数据上链
+ 当投票阶段结束后，统一将数据库中的投票信息集中上链
+ 在进行投票操作和撤销投票操作时，需要从链上验证投票者和非投票者是否在签到人员中
+ 根据tpl/solana_test_rules.md中的规范增加测试用例
#### 项目结构优化
+ 将合约和测试用例按照不同的场景拆分成多个文件，使项目结构更清晰，保持代码逻辑不变

### PART2
#### 赞助商资金管理
+ 长期赞助商发起申请后，钱会存入金库，需要设定一个默认的审核时间，默认为3天，在项目配置项中配置
+ 审核通过，则将金额转入主办方钱包；审核失败，金额原路返回
+ 主办方钱包指定为Admin账户绑定的钱包
+ 根据tpl/solana_test_rules.md中的规范增加测试用例
#### 活动资金管理
+ 当活动发布后，活动的奖金会存入一个金库
+ 金库中包含了主办方提供的奖金和活动赞助商的奖金，即活动赞助商审核通过后，奖金会进入该活动对应的金库
+ 奖金分发逻辑：当活动创建后，分发逻辑其实已经固定，只是从投票的链上数据中，分析得出名次，后续再按照已经固定的顺序，自动分发奖金即可，未分发完的奖金会根据比例原路返回给主办方和活动赞助商
+ 当主办方发布活动后，后续的上链操作gas非均来自这个金库
+ 根据tpl/solana_test_rules.md中的规范增加测试用例

### PART3
+ Admin管理平台，活动卡片页页面，加上活动上链的地址，点击后可以查看链上信息的详情
+ 点击发布按钮后，显示发布成功，但数据并未上链，如果数据上链失败，应该返回报错，活动发布不成功，地址是后端生成的，而不是前端填入的，不用下载依赖，先完善代码
+ 未配置 Solana 发布密钥（SOLANA_AUTHORITY_KEY），这个通过前端授权
+ 活动发布不成功：上链失败 Transaction simulation failed: Error processing Instruction 2: custom program error: 0x65
+ 当环境是local时，查看链上信息时需要拼装?cluster=custom&customUrl=${地址信息}
+ 当发布活动时，activityPhase应该是发布状态而非草稿状态

### PART4
+ 每次切换活动状态时，需要更新链上的活动状态
+ 移除后端代码中有关Solana的帮助类代码，统一使用solana-go库中的方法
+ 组队、投票、公布结果都需要更新链上的活动状态
+ 上传代码阶段也需要更新链上的活动状态

### PART5
+ 签到 -> 组队：除了需要更新活动状态，还需要将签到信息上链，补全代码
+ 投票 -> 公布结果：除了需要更新活动状态，还需要将投票信息上链，补全代码
+ 签到信息和投票信息上链后，可以在活动详情页面查看

### PART6
+ 签到信息上链报错
链上活动状态更新失败: (*jsonrpc.RPCError)(0xc0005a8330)({ Code: (int) -32002, Message: (string) (len=91) "Transaction simulation failed: Error processing Instruction 2: custom program error: 0x1773", Data: (map[string]interface {}) (len=7) { (string) (len=8) "accounts": (interface {}) <nil>, (string) (len=3) "err": (map[string]interface {}) (len=1) { (string) (len=16) "InstructionError": ([]interface {}) (len=2 cap=2) { (json.Number) (len=1) "2", (map[string]interface {}) (len=1) { (string) (len=6) "Custom": (json.Number) (len=4) "6003" } } }, (string) (len=17) "innerInstructions": (interface {}) <nil>, (string) (len=4) "logs": ([]interface {}) (len=11 cap=16) { (string) (len=62) "Program ComputeBudget111111111111111111111111111111 invoke [1]", (string) (len=59) "Program ComputeBudget111111111111111111111111111111 success", (string) (len=62) "Program ComputeBudget111111111111111111111111111111 invoke [1]", (string) (len=59) "Program ComputeBudget111111111111111111111111111111 success", (string) (len=63) "Program DtuGwFvSDnQyLamC5Lkf8hxvmU1VNYJxSNuss4qLb8cg invoke [1]", (string) (len=40) "Program log: Instruction: UploadCheckIns", (string) (len=51) "Program 11111111111111111111111111111111 invoke [2]", (string) (len=48) "Program 11111111111111111111111111111111 success", (string) (len=182) "Program log: AnchorError caused by account: activity. Error Code: InvalidPhaseForCheckInUpload. Error Number: 6003. Error Message: Only check-in phase allows uploading check-in list.", (string) (len=90) "Program DtuGwFvSDnQyLamC5Lkf8hxvmU1VNYJxSNuss4qLb8cg consumed 9125 of 199700 compute units", (string) (len=89) "Program DtuGwFvSDnQyLamC5Lkf8hxvmU1VNYJxSNuss4qLb8cg failed: custom program error: 0x1773" }, (string) (len=20) "replacementBlockhash": (interface {}) <nil>, (string) (len=10) "returnData": (interface {}) <nil>, (string) (len=13) "unitsConsumed": (json.Number) (len=4) "9425" } })
+ 签到信息上链：页面显示成功，但活动卡片没有显示签到信息上链的地址
+ 投票信息上链报错：
链上活动状态更新失败: (*jsonrpc.RPCError)(0xc0005c8810)({ Code: (int) -32002, Message: (string) (len=91) "Transaction simulation failed: Error processing Instruction 2: custom program error: 0x1777", Data: (map[string]interface {}) (len=7) { (string) (len=8) "accounts": (interface {}) <nil>, (string) (len=3) "err": (map[string]interface {}) (len=1) { (string) (len=16) "InstructionError": ([]interface {}) (len=2 cap=2) { (json.Number) (len=1) "2", (map[string]interface {}) (len=1) { (string) (len=6) "Custom": (json.Number) (len=4) "6007" } } }, (string) (len=17) "innerInstructions": (interface {}) <nil>, (string) (len=4) "logs": ([]interface {}) (len=11 cap=16) { (string) (len=62) "Program ComputeBudget111111111111111111111111111111 invoke [1]", (string) (len=59) "Program ComputeBudget111111111111111111111111111111 success", (string) (len=62) "Program ComputeBudget111111111111111111111111111111 invoke [1]", (string) (len=59) "Program ComputeBudget111111111111111111111111111111 success", (string) (len=63) "Program DtuGwFvSDnQyLamC5Lkf8hxvmU1VNYJxSNuss4qLb8cg invoke [1]", (string) (len=41) "Program log: Instruction: UploadVoteTally", (string) (len=51) "Program 11111111111111111111111111111111 invoke [2]", (string) (len=48) "Program 11111111111111111111111111111111 success", (string) (len=164) "Program log: AnchorError caused by account: activity. Error Code: InvalidPhaseForTally. Error Number: 6007. Error Message: Only voting phase allows uploading tally.", (string) (len=91) "Program DtuGwFvSDnQyLamC5Lkf8hxvmU1VNYJxSNuss4qLb8cg consumed 11870 of 199700 compute units", (string) (len=89) "Program DtuGwFvSDnQyLamC5Lkf8hxvmU1VNYJxSNuss4qLb8cg failed: custom program error: 0x1777" }, (string) (len=20) "replacementBlockhash": (interface {}) <nil>, (string) (len=10) "returnData": (interface {}) <nil>, (string) (len=13) "unitsConsumed": (json.Number) (len=5) "12170" } })
+ 投票信息上链：页面显示成功，但活动卡片没有显示投票信息上链的地址


+ 活动管理列表页不显示签到信息上链地址和投票信息上链地址，仅在活动详情页内显示



solana-test-validator --reset
anchor deploy --provider.cluster localnet
anchor test --skip-local-validator
solana airdrop 100 2PMjGQBiZdDJ8mxY3r2SjiwdCiVDq5Gryqb6dneDq19T
solana balance 2PMjGQBiZdDJ8mxY3r2SjiwdCiVDq5Gryqb6dneDq19T

export SKIP_AUTO_MIGRATE=true
go run main.go