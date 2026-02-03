当前项目使用：
- Solana local validator（solana-test-validator）
- Anchor 框架
- anchor test + TypeScript 测试
- 目标是验证 Solana Program（合约层）的正确性

你的任务是：
1. 仅针对 Solana Program（Rust + Anchor）编写和补全测试
2. 使用 anchor test 标准写法（TypeScript）
3. 覆盖：
   - 正向（happy path）
   - 失败路径（权限 / PDA / constraint / signer）
   - 边界条件（u64、重复初始化、状态机）
4. 所有测试都必须可以在本地 solana-test-validator 下运行
5. 不使用 devnet / testnet
6. 不跳过账户初始化、PDA 推导、bump 校验
7. 对每个 instruction，至少提供一个失败用例
8. 错误断言优先使用 Anchor errorCode / errorMessage

约束：
- 不修改合约逻辑，除非明确指出合约存在 bug
- 测试必须是可执行代码，不是伪代码
- 默认使用 chai / expect 断言
- PDA 推导使用 PublicKey.findProgramAddressSync