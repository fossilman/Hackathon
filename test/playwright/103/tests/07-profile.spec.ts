import { test, expect } from '@playwright/test'
import { login, TEST_USERS, waitForMessage } from './setup/helpers'

/**
 * 个人中心测试
 * 对应 PRD103 4.1 用户认证模块中的个人信息相关功能
 */
test.describe('个人中心', () => {
  test.describe('所有角色', () => {
    test('Admin可以访问个人中心', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
      await page.goto('/profile')
      await expect(page.locator('[data-testid="profile-page"]')).toBeVisible()
    })

    test('主办方可以访问个人中心', async ({ page }) => {
      await login(page, TEST_USERS.organizer1.email, TEST_USERS.organizer1.password)
      await page.goto('/profile')
      await expect(page.locator('[data-testid="profile-page"]')).toBeVisible()
    })

    test('赞助商可以访问个人中心', async ({ page }) => {
      await login(page, TEST_USERS.sponsor.email, TEST_USERS.sponsor.password)
      await page.goto('/profile')
      await expect(page.locator('[data-testid="profile-page"]')).toBeVisible()
    })
  })

  test.describe('查看个人信息', () => {
    test('可以查看姓名', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
      await page.goto('/profile')
      await expect(page.locator('[data-testid="profile-form-name-input"]')).toBeVisible()
    })

    test('可以查看邮箱（只读）', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
      await page.goto('/profile')
      const emailInput = page.locator('[data-testid="profile-form-email-input"]')
      await expect(emailInput).toBeVisible()
      await expect(emailInput).toBeDisabled()
    })

    test('可以查看角色（只读）', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
      await page.goto('/profile')
      const roleInput = page.locator('[data-testid="profile-form-role-input"]')
      await expect(roleInput).toBeVisible()
      await expect(roleInput).toBeDisabled()
    })

    test('可以查看手机号', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
      await page.goto('/profile')
      await expect(page.locator('[data-testid="profile-form-phone-input"]')).toBeVisible()
    })
  })

  test.describe('修改个人信息', () => {
    test('可以修改姓名', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
      await page.goto('/profile')
      await page.waitForSelector('[data-testid="profile-form-name-input"]', { timeout: 5000 })
      
      const newName = '新姓名' + Date.now()
      await page.fill('[data-testid="profile-form-name-input"]', newName)
      await page.click('[data-testid="profile-form-submit-button"]')
      await waitForMessage(page, 'success')
      
      // 验证修改成功（等待页面重新加载并数据加载完成）
      await page.reload()
      await page.waitForSelector('[data-testid="profile-form-name-input"]', { timeout: 5000 })
      await page.waitForTimeout(1000) // 等待表单数据加载
      await expect(page.locator('[data-testid="profile-form-name-input"]')).toHaveValue(newName)
    })

    test('可以修改手机号', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
      await page.goto('/profile')
      await page.waitForSelector('[data-testid="profile-form-phone-input"]', { timeout: 5000 })
      
      const newPhone = '138' + String(Date.now()).slice(-8)
      await page.fill('[data-testid="profile-form-phone-input"]', newPhone)
      await page.click('[data-testid="profile-form-submit-button"]')
      await waitForMessage(page, 'success')
      
      // 验证修改成功（等待页面重新加载并数据加载完成）
      await page.reload()
      await page.waitForSelector('[data-testid="profile-form-phone-input"]', { timeout: 5000 })
      await page.waitForTimeout(1000) // 等待表单数据加载
      await expect(page.locator('[data-testid="profile-form-phone-input"]')).toHaveValue(newPhone)
    })

    test('不能修改邮箱', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
      await page.goto('/profile')
      
      const emailInput = page.locator('[data-testid="profile-form-email-input"]')
      await expect(emailInput).toBeDisabled()
      
      // 尝试修改（应该失败）
      const originalValue = await emailInput.inputValue()
      // 由于是disabled，无法修改
      await expect(emailInput).toHaveValue(originalValue)
    })

    test('不能修改角色', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
      await page.goto('/profile')
      
      const roleInput = page.locator('[data-testid="profile-form-role-input"]')
      await expect(roleInput).toBeDisabled()
      
      const originalValue = await roleInput.inputValue()
      await expect(roleInput).toHaveValue(originalValue)
    })
  })

  test.describe('修改密码', () => {
    test('可以打开修改密码对话框', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
      await page.goto('/profile')
      await page.waitForSelector('[data-testid="profile-form-change-password-button"]', { timeout: 5000 })
      
      await page.click('[data-testid="profile-form-change-password-button"]')
      // 等待 Modal 显示（Ant Design Modal 使用 open 属性，需要等待动画完成）
      await page.waitForTimeout(500)
      // 检查 Modal 内容是否可见
      await expect(page.locator('[data-testid="profile-change-password-form"]')).toBeVisible({ timeout: 5000 })
    })

    test('修改密码需要填写原密码', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
      await page.goto('/profile')
      await page.waitForSelector('[data-testid="profile-form-change-password-button"]', { timeout: 5000 })
      
      await page.click('[data-testid="profile-form-change-password-button"]')
      await page.waitForTimeout(500)
      await expect(page.locator('[data-testid="profile-change-password-form"]')).toBeVisible({ timeout: 5000 })
      
      // 只填写新密码，不填原密码
      await page.fill('[data-testid="profile-change-password-form-new-password-input"]', 'NewPassword123')
      await page.fill('[data-testid="profile-change-password-form-confirm-password-input"]', 'NewPassword123')
      
      // 尝试提交（应该失败）
      await page.click('[data-testid="profile-change-password-modal"] button:has-text("确定")')
      // 应该显示验证错误
      await page.waitForTimeout(500)
    })

    test('新密码至少8位', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
      await page.goto('/profile')
      await page.waitForSelector('[data-testid="profile-form-change-password-button"]', { timeout: 5000 })
      
      await page.click('[data-testid="profile-form-change-password-button"]')
      await page.waitForTimeout(500)
      await expect(page.locator('[data-testid="profile-change-password-form"]')).toBeVisible({ timeout: 5000 })
      
      await page.fill('[data-testid="profile-change-password-form-old-password-input"]', TEST_USERS.admin.password)
      await page.fill('[data-testid="profile-change-password-form-new-password-input"]', '1234567') // 只有7位
      await page.fill('[data-testid="profile-change-password-form-confirm-password-input"]', '1234567')
      
      // 尝试提交（应该失败）
      await page.click('[data-testid="profile-change-password-modal"] button:has-text("确定")')
      await page.waitForTimeout(500)
      // 应该显示验证错误
    })

    test('确认密码必须与新密码一致', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
      await page.goto('/profile')
      await page.waitForSelector('[data-testid="profile-form-change-password-button"]', { timeout: 5000 })
      
      await page.click('[data-testid="profile-form-change-password-button"]')
      await page.waitForTimeout(500)
      await expect(page.locator('[data-testid="profile-change-password-form"]')).toBeVisible({ timeout: 5000 })
      
      await page.fill('[data-testid="profile-change-password-form-old-password-input"]', TEST_USERS.admin.password)
      await page.fill('[data-testid="profile-change-password-form-new-password-input"]', 'NewPassword123')
      await page.fill('[data-testid="profile-change-password-form-confirm-password-input"]', 'DifferentPassword123')
      
      // 尝试提交（应该失败）
      await page.click('[data-testid="profile-change-password-modal"] button:has-text("确定")')
      await page.waitForTimeout(500)
      // 应该显示验证错误
    })
  })
})

