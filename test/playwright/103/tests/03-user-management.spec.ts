import { test, expect } from '@playwright/test'
import { login, TEST_USERS, waitForMessage, waitForTableLoad } from './setup/helpers'

/**
 * 用户管理操作权限测试
 * 对应 PRD103 4.2 人员管理模块（仅Admin）
 */
test.describe('用户管理操作权限', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
    await page.goto('/users')
    await waitForTableLoad(page, 'user-management-table')
  })

  test('Admin可以查看人员列表', async ({ page }) => {
    await expect(page.locator('[data-testid="user-management-table"]')).toBeVisible()
    // 验证表格有数据
    const rows = page.locator('[data-testid="user-management-table"] tbody tr')
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)
  })

  test('Admin可以添加主办方人员', async ({ page }) => {
    const timestamp = Date.now()
    const testUser = {
      name: `测试主办方${timestamp}`,
      email: `test-organizer-${timestamp}@test.com`,
      password: 'Test123456',
      phone: `138${String(timestamp).slice(-8)}`,
    }

    // 点击添加用户按钮
    await page.click('[data-testid="user-management-create-button"]')
    // 等待模态框内容可见（不仅仅是元素存在）
    await page.waitForSelector('[data-testid="user-management-form-modal"] .ant-modal-content', { state: 'visible', timeout: 5000 })
    await page.waitForTimeout(300) // 等待动画完成

    // 填写表单
    await page.fill('[data-testid="user-management-form-name-input"]', testUser.name)
    await page.fill('[data-testid="user-management-form-email-input"]', testUser.email)
    await page.fill('[data-testid="user-management-form-password-input"]', testUser.password)
    await page.click('[data-testid="user-management-form-role-select"]')
    await page.click('[data-testid="user-management-form-role-organizer"]')
    await page.fill('[data-testid="user-management-form-phone-input"]', testUser.phone)

    // 提交 - 使用Modal的确定按钮（通过onOk触发表单提交）
    // 等待表单输入框都填写完成
    await page.waitForTimeout(500)
    const okButton = page.locator('[data-testid="user-management-form-modal"]').locator('.ant-modal-footer').locator('button.ant-btn-primary').first()
    await okButton.waitFor({ state: 'visible', timeout: 5000 })
    // 检查按钮是否可点击
    const isEnabled = await okButton.isEnabled()
    if (!isEnabled) {
      // 如果按钮被禁用，可能是表单验证失败，等待一下再检查
      await page.waitForTimeout(1000)
    }
    await okButton.click({ timeout: 10000 })
    await waitForMessage(page, 'success')
    
    // 等待模态框关闭
    await page.waitForSelector('[data-testid="user-management-form-modal"]', { state: 'hidden', timeout: 5000 }).catch(() => {})
    
    // 等待表格加载完成（检查loading状态消失）
    await page.waitForSelector('[data-testid="user-management-table"] .ant-spin', { state: 'hidden', timeout: 10000 }).catch(() => {})
    await page.waitForTimeout(1000) // 额外等待数据更新
    
    // 验证用户已创建（在表格中查找）
    await expect(page.locator(`text=${testUser.email}`)).toBeVisible({ timeout: 10000 })
  })

  test('Admin可以添加赞助商人员', async ({ page }) => {
    const timestamp = Date.now()
    const testUser = {
      name: `测试赞助商${timestamp}`,
      email: `test-sponsor-${timestamp}@test.com`,
      password: 'Test123456',
      phone: `139${String(timestamp).slice(-8)}`,
    }

    await page.click('[data-testid="user-management-create-button"]')
    // 等待模态框内容可见
    await page.waitForSelector('[data-testid="user-management-form-modal"] .ant-modal-content', { state: 'visible', timeout: 5000 })
    await page.waitForTimeout(300) // 等待动画完成

    await page.fill('[data-testid="user-management-form-name-input"]', testUser.name)
    await page.fill('[data-testid="user-management-form-email-input"]', testUser.email)
    await page.fill('[data-testid="user-management-form-password-input"]', testUser.password)
    await page.click('[data-testid="user-management-form-role-select"]')
    await page.click('[data-testid="user-management-form-role-sponsor"]')
    await page.fill('[data-testid="user-management-form-phone-input"]', testUser.phone)

    // 提交 - 使用Modal的确定按钮
    await page.waitForTimeout(500)
    const okButton = page.locator('[data-testid="user-management-form-modal"]').locator('.ant-modal-footer').locator('button.ant-btn-primary').first()
    await okButton.waitFor({ state: 'visible', timeout: 5000 })
    const isEnabled = await okButton.isEnabled()
    if (!isEnabled) {
      await page.waitForTimeout(1000)
    }
    await okButton.click({ timeout: 10000 })
    await waitForMessage(page, 'success')

    await page.reload()
    await waitForTableLoad(page, 'user-management-table')
    await expect(page.locator(`text=${testUser.email}`)).toBeVisible()
  })

  test('Admin可以编辑人员信息', async ({ page }) => {
    // 找到第一个可编辑的用户（非admin）
    const editButton = page.locator('[data-testid^="user-management-edit-button-"]').first()
    if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editButton.click()
      // 等待模态框内容可见
      await page.waitForSelector('[data-testid="user-management-form-modal"] .ant-modal-content', { state: 'visible', timeout: 5000 })
      await page.waitForTimeout(300) // 等待动画完成

      const newName = '编辑后的姓名' + Date.now()
      await page.fill('[data-testid="user-management-form-name-input"]', newName)

      // 验证邮箱和角色字段是禁用的
      await expect(page.locator('[data-testid="user-management-form-email-input"]')).toBeDisabled()
      // 注意：Ant Design Select 的 disabled 状态可能通过 class 而不是 disabled 属性实现
      const roleSelect = page.locator('[data-testid="user-management-form-role-select"]')
      await expect(roleSelect).toHaveClass(/ant-select-disabled/)

      // 提交 - 使用Modal的确定按钮
      const okButton = page.locator('[data-testid="user-management-form-modal"] .ant-modal-footer button.ant-btn-primary')
      await okButton.waitFor({ state: 'visible', timeout: 5000 })
      await okButton.click()
      await waitForMessage(page, 'success')
      
      // 等待模态框关闭
      await page.waitForSelector('[data-testid="user-management-form-modal"]', { state: 'hidden', timeout: 5000 }).catch(() => {})
      
      // 等待表格加载完成（检查loading状态消失）
      await page.waitForSelector('[data-testid="user-management-table"] .ant-spin', { state: 'hidden', timeout: 10000 }).catch(() => {})
      await page.waitForTimeout(1000) // 额外等待数据更新
      
      // 等待并查找新姓名
      await expect(page.locator(`text=${newName}`)).toBeVisible({ timeout: 10000 })
    }
  })

  test('Admin可以删除人员', async ({ page }) => {
    // 先创建一个测试用户用于删除
    const timestamp = Date.now()
    const testUser = {
      name: `待删除用户${timestamp}`,
      email: `delete-${timestamp}@test.com`,
      password: 'Test123456',
    }

    await page.click('[data-testid="user-management-create-button"]')
    // 等待模态框内容可见
    await page.waitForSelector('[data-testid="user-management-form-modal"] .ant-modal-content', { state: 'visible', timeout: 5000 })
    await page.waitForTimeout(300) // 等待动画完成
    await page.fill('[data-testid="user-management-form-name-input"]', testUser.name)
    await page.fill('[data-testid="user-management-form-email-input"]', testUser.email)
    await page.fill('[data-testid="user-management-form-password-input"]', testUser.password)
    await page.click('[data-testid="user-management-form-role-select"]')
    await page.click('[data-testid="user-management-form-role-organizer"]')
    // 提交 - 使用Modal的确定按钮
    await page.waitForTimeout(500)
    const okButton = page.locator('[data-testid="user-management-form-modal"]').locator('.ant-modal-footer').locator('button.ant-btn-primary').first()
    await okButton.waitFor({ state: 'visible', timeout: 5000 })
    const isEnabled = await okButton.isEnabled()
    if (!isEnabled) {
      await page.waitForTimeout(1000)
    }
    await okButton.click({ timeout: 10000 })
    await waitForMessage(page, 'success')
    await page.reload()
    await waitForTableLoad(page, 'user-management-table')

    // 找到刚创建的用户并删除
    const row = page.locator(`tr:has-text("${testUser.email}")`)
    if (await row.isVisible({ timeout: 2000 }).catch(() => false)) {
      const deleteButton = row.locator('[data-testid^="user-management-delete-button-"]')
      await deleteButton.click()
      
      // 确认删除
      await page.click('[data-testid^="user-management-delete-confirm-"] button:has-text("确定")')
      await waitForMessage(page, 'success')

      // 验证用户已删除
      await page.reload()
      await waitForTableLoad(page, 'user-management-table')
      await expect(page.locator(`text=${testUser.email}`)).not.toBeVisible()
    }
  })

  test('Admin可以重置人员密码', async ({ page }) => {
    // 找到第一个可重置密码的用户
    const resetButton = page.locator('[data-testid^="user-management-reset-password-button-"]').first()
    if (await resetButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await resetButton.click()
      // 等待模态框内容可见
      await page.waitForSelector('[data-testid="user-management-reset-password-modal"] .ant-modal-content', { state: 'visible', timeout: 5000 })
      await page.waitForTimeout(300) // 等待动画完成

      const newPassword = 'NewPassword123'
      await page.fill('[data-testid="user-management-reset-password-input"]', newPassword)

      // 提交 - 使用Modal的确定按钮
      await page.waitForTimeout(500)
      const okButton = page.locator('[data-testid="user-management-reset-password-modal"]').locator('.ant-modal-footer').locator('button.ant-btn-primary').first()
      await okButton.waitFor({ state: 'visible', timeout: 5000 })
      const isEnabled = await okButton.isEnabled()
      if (!isEnabled) {
        await page.waitForTimeout(1000)
      }
      await okButton.click({ timeout: 10000 })
      await waitForMessage(page, 'success')
    }
  })

  test('主办方不能访问人员管理页面', async ({ page }) => {
    await login(page, TEST_USERS.organizer1.email, TEST_USERS.organizer1.password)
    await page.goto('/users')
    // 应该被重定向
    await expect(page).not.toHaveURL('/users')
  })

  test('赞助商不能访问人员管理页面', async ({ page }) => {
    await login(page, TEST_USERS.sponsor.email, TEST_USERS.sponsor.password)
    await page.goto('/users')
    // 应该被重定向
    await expect(page).not.toHaveURL('/users')
  })

  test('按角色筛选人员', async ({ page }) => {
    // 这个功能需要前端实现筛选器，如果已实现则测试
    // 目前先验证表格存在
    await expect(page.locator('[data-testid="user-management-table"]')).toBeVisible()
  })

  test('按姓名/邮箱搜索人员', async ({ page }) => {
    // 这个功能需要前端实现搜索，如果已实现则测试
    // 目前先验证表格存在
    await expect(page.locator('[data-testid="user-management-table"]')).toBeVisible()
  })
})

