### PART1
+ 赞助商申请页面需要提供连接钱包的入口，用于赞助商发起申请时，转账给金库
+ 赞助商申请表单页，添加字段，赞助金额，默认单位为Sol
+ 当提交申请时，钱会存入金库，等待主办方审核
+ 长期赞助商发起申请后，钱会存入金库，需要设定一个默认的审核时间，默认为3小时，在项目配置项中配置
+ 审核通过，金库会将金额转入主办方钱包；审核失败，金库会将金额原路返回
+ 主办方钱包指定为Admin账户绑定的钱包，钱包地址为DnwSNxJfQYHhtFboSDbqx1szVWgdf72AC1mayVA2AA4k

### PART2
+ 赞助商查询页面增价金库地址，可以跳转到https://explorer.solana.com/
+ 当环境是local时，查看链上信息时需要拼装?cluster=custom&customUrl=${地址信息}
+ 赞助商查询页面增加 SponsorApplication SponsorConfig 这两个地址
+ 统一为一个钱包，


solana-test-validator --reset
anchor deploy --provider.cluster localnet
anchor test --skip-local-validator
solana airdrop 100 2PMjGQBiZdDJ8mxY3r2SjiwdCiVDq5Gryqb6dneDq19T
solana balance 2PMjGQBiZdDJ8mxY3r2SjiwdCiVDq5Gryqb6dneDq19T

+ 我不想手动执行这个初始化 → 已改为：后端在首次赞助申请相关请求时自动初始化（需在 config 中配置 Admin 私钥 SOLANA_AUTHORITY_KEY 与收款地址 sponsor_admin_wallet）。authority 是 Admin 账户（唯一），主办方可有多个账号，链上审核权限仅 Admin，收款地址仅一个

Query Result:
您的申请正在审核中，请耐心等待
Status:Pending