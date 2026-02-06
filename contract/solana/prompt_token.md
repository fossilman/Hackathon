### PART1
+ 赞助商申请页面需要提供连接钱包的入口，用于赞助商发起申请时，转账给金库
+ 赞助商申请表单页，添加字段，赞助金额，默认单位为Sol
+ 当提交申请时，钱会存入金库，等待主办方审核
+ 长期赞助商发起申请后，钱会存入金库，需要设定一个默认的审核时间，默认为3小时，在项目配置项中配置
+ 审核通过，金库会将金额转入主办方钱包；审核失败，金库会将金额原路返回
+ 主办方钱包指定为Admin账户绑定的钱包，钱包地址为DnwSNxJfQYHhtFboSDbqx1szVWgdf72AC1mayVA2AA4k



solana-test-validator --reset
anchor deploy --provider.cluster localnet
anchor test --skip-local-validator
solana airdrop 100 2PMjGQBiZdDJ8mxY3r2SjiwdCiVDq5Gryqb6dneDq19T
solana balance 2PMjGQBiZdDJ8mxY3r2SjiwdCiVDq5Gryqb6dneDq19T