### 103. 把它变成一段可运行的代码
- 根据需求文档：sdp/PRD401.md 和 开发文档：tpl/contract_rules.md 生成代码，智能合约目录为contract，实现文档中包含的所有功能，精简目录文件、去除可选，不要额外操作

### 104. 把它变成一个功能完善的项目
- 我已经配置好 .env 文件，将所有的合约部署到 Sepolia 测试网络中，部署成功后，将合约地址记录到 contract/deployments.json 中

- 根据合约地址将config.yaml文件填写完整，只新增

- （未进行）了解了合约接口，根据合约的主要函数修改现有的服务将区块链功能嵌入到后端接口中（例如：web2创建活动接口中 加上web3中createEvent函数，注意合约中活动ID和线下数据库中的要一致），不要额外添加说明文件

version1.0.2: 依据已经生成的 合约 和 sdp/PRD401.md 中的需求，修改现有的服务将区块链功能嵌入到后端接口中（例如：web2创建活动接口中 加上web3中createEvent函数，注意合约中活动ID和线下数据库中的要一致），不要额外操作（目前）
问题：
    - 签到报错（签到信息上链失败: 发送交易失败: 估算gas失败: execution reverted: Event is not active）
        - 修改后：链上活动已激活，链上ID: 1, 交易哈希: 0x3606c4796afdbdafdaa80fef7347bbdc26890911ce339c706372a232605493bd
    - 签到报错（"message": "签到信息上链失败: 发送交易失败: 估算gas失败: execution reverted: Event has not started",）
        - 链上时间无法修改，只能重新添加活动，将本地时间改的早一点（过掉链上验证时间） X 链上函数也进行了约束，无法欺骗
        — 修改：去除合约中所有block.timestamp的require,权限放大，要通过测试，然后帮我从新部署上去
    - 投票问题：投票信息上链失败: 发送交易失败: 估算gas失败: execution reverted: Score must be between 1 and 10
        - txHash, err := blockchainService.Vote(hackathon.ChainEventID, submissionID, 10)投票默认10，解决
    - 投票问题：0xde8cb35bb94f96f2c3ec442c1485d3c20facdf04c3f4c28ea1b0283e50a25b92 建议哈希不存在
        - 等待区块确认后在走下一步

version1.0.1: 合约已全部生成，根据合约中ABI信息和后端接口，修改现有的服务来集成区块链功能（保证在web2中创建的活动能够同步至web3上，且两边数据要一致）

version1.0.0: 依据已经生成的合约地址，依次将合约中的函数回填至后端接口中，修改现有的服务来集成区块链功能，实现接口和区块链衔接

— 完成 linear FS-49 issues
- 活动锦集 按钮未登录也能点击看见

- 完成 linear FS-48 issues
✅ 完成 linear FS-48 issues
- 在活动详情页（HackathonDetail.tsx）添加验证按钮
- 复用 FS-49 的验证组件和后端服务
- 参赛者可在活动进行中实时验证活动信息真实性

- 完成 linear FS-43 issues

