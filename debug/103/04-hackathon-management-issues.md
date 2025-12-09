# 04-hackathon-management.spec.ts 测试用例集未修复问题

## 测试结果
- 总测试数：12
- 通过：8
- 失败：4
- 通过率：66.7% ❌（未达到80%要求）

## 未修复的问题

### 1. 主办方可以创建活动测试失败
**测试用例**：`tests/04-hackathon-management.spec.ts:67` - 主办方可以创建活动

**问题描述**：
- 活动创建操作可能失败或超时

### 2. 主办方可以编辑自己创建的预备状态活动测试失败
**测试用例**：`tests/04-hackathon-management.spec.ts:99` - 主办方可以编辑自己创建的预备状态活动

**问题描述**：
- 活动编辑操作可能失败或超时

### 3. 主办方可以发布自己创建的活动测试失败
**测试用例**：`tests/04-hackathon-management.spec.ts:125` - 主办方可以发布自己创建的活动

**错误信息**：
```
Test timeout of 30000ms exceeded.
Error: locator.textContent: Test timeout of 30000ms exceeded.
等待表格行状态文本超时
```

**问题描述**：
- 在查找活动列表中的活动状态时超时
- 可能是表格结构或选择器问题

### 4. Admin不能编辑活动测试失败
**测试用例**：`tests/04-hackathon-management.spec.ts:162` - Admin不能编辑活动

**问题描述**：
- 权限验证可能有问题

## 建议修复方向
- 检查活动创建/编辑的表单提交逻辑
- 检查表格选择器和数据结构
- 检查权限验证逻辑

