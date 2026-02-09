### PART1
```
programs/my_program/
├── src/
│   ├── lib.rs          ← Anchor glue（薄）
│   ├── instructions/  ← Anchor ctx + 调度
│   ├── state/         ← Account struct
│   ├── error.rs
│   └── logic/          ← ⭐ 纯业务内核（不依赖 Anchor）
│       ├── aaa.rs
│       ├── bbb.rs
│       └── ccc.rs
└── tests/
```
根据此项目结构改造hackathon的合约代码