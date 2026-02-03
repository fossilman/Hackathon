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
+ 在MetaMask改为MetaMask on EVM，Phantom改为Phantom on Solana


solana-test-validator
anchor test --skip-local-validator
