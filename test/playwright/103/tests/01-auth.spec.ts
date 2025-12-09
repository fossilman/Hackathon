import { test, expect } from '@playwright/test'
import { login, logout, TEST_USERS, waitForMessage } from './setup/helpers'

/**
 * 认证模块测试
 * 对应 PRD103 4.1 用户认证模块
 */
test.describe('认证模块', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('Admin登录成功', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
    await expect(page).toHaveURL(/\/dashboard|\/$/)
    await waitForMessage(page, 'success')
  })

  test('主办方登录成功', async ({ page }) => {
    await login(page, TEST_USERS.organizer1.email, TEST_USERS.organizer1.password)
    await expect(page).toHaveURL(/\/dashboard|\/$/)
    await waitForMessage(page, 'success')
  })

  test('赞助商登录成功', async ({ page }) => {
    await login(page, TEST_USERS.sponsor.email, TEST_USERS.sponsor.password)
    // 赞助商应该跳转到个人中心
    await expect(page).toHaveURL(/\/profile/)
    await waitForMessage(page, 'success')
  })

  test('登录失败 - 错误密码', async ({ page }) => {
    await page.fill('[data-testid="login-email-input"]', TEST_USERS.admin.email)
    await page.fill('[data-testid="login-password-input"]', 'wrongpassword')
    await page.click('[data-testid="login-submit-button"]')
    await waitForMessage(page, 'error')
    // 应该仍在登录页
    await expect(page).toHaveURL('/login')
  })

  test('登录失败 - 不存在的用户', async ({ page }) => {
    await page.fill('[data-testid="login-email-input"]', 'nonexistent@test.com')
    await page.fill('[data-testid="login-password-input"]', 'password123')
    await page.click('[data-testid="login-submit-button"]')
    await waitForMessage(page, 'error')
    await expect(page).toHaveURL('/login')
  })

  test('登出功能', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
    await logout(page)
    await expect(page).toHaveURL('/login')
  })

  test('修改密码', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
    await page.goto('/profile')
    
    // 点击修改密码按钮
    await page.click('[data-testid="profile-form-change-password-button"]')
    // 等待模态框完全打开（检查模态框内容是否可见）
    await page.waitForSelector('[data-testid="profile-change-password-modal"] .ant-modal-content', { state: 'visible', timeout: 5000 })
    // 等待表单输入框可见
    await page.waitForSelector('[data-testid="profile-change-password-form-old-password-input"]', { state: 'visible' })
    await page.waitForTimeout(300) // 等待动画完成
    
    // 填写密码表单
    await page.fill('[data-testid="profile-change-password-form-old-password-input"]', TEST_USERS.admin.password)
    await page.fill('[data-testid="profile-change-password-form-new-password-input"]', 'NewPassword123')
    await page.fill('[data-testid="profile-change-password-form-confirm-password-input"]', 'NewPassword123')
    
    // 提交 - 使用Modal的确定按钮（通过onOk触发表单提交）
    const okButton = page.locator('[data-testid="profile-change-password-modal"] .ant-modal-footer button.ant-btn-primary')
    await okButton.waitFor({ state: 'visible', timeout: 5000 })
    await okButton.click()
    await waitForMessage(page, 'success')
    
    // 验证新密码可以登录
    await logout(page)
    await login(page, TEST_USERS.admin.email, 'NewPassword123')
    await expect(page).toHaveURL(/\/dashboard|\/$/)
    
    // 恢复原密码
    await page.goto('/profile')
    await page.click('[data-testid="profile-form-change-password-button"]')
    // 等待模态框完全打开（检查模态框内容是否可见）
    await page.waitForSelector('[data-testid="profile-change-password-modal"] .ant-modal-content', { state: 'visible', timeout: 5000 })
    // 等待表单输入框可见
    await page.waitForSelector('[data-testid="profile-change-password-form-old-password-input"]', { state: 'visible' })
    await page.waitForTimeout(300) // 等待动画完成
    await page.fill('[data-testid="profile-change-password-form-old-password-input"]', 'NewPassword123')
    await page.fill('[data-testid="profile-change-password-form-new-password-input"]', TEST_USERS.admin.password)
    await page.fill('[data-testid="profile-change-password-form-confirm-password-input"]', TEST_USERS.admin.password)
    // 提交 - 使用Modal的确定按钮
    const okButton2 = page.locator('[data-testid="profile-change-password-modal"] .ant-modal-footer button.ant-btn-primary')
    await okButton2.waitFor({ state: 'visible', timeout: 5000 })
    await okButton2.click()
    await waitForMessage(page, 'success')
  })

  test('查看个人信息', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
    await page.goto('/profile')
    
    // 验证个人信息显示
    await expect(page.locator('[data-testid="profile-form-name-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="profile-form-email-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="profile-form-role-input"]')).toBeVisible()
  })

  test('修改个人信息', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
    await page.goto('/profile')
    
    // 修改姓名和手机号
    const newName = '新姓名' + Date.now()
    const newPhone = '1380000' + String(Date.now()).slice(-4)
    
    await page.fill('[data-testid="profile-form-name-input"]', newName)
    await page.fill('[data-testid="profile-form-phone-input"]', newPhone)
    
    // 提交
    await page.click('[data-testid="profile-form-submit-button"]')
    // 等待表单提交完成和成功消息
    await waitForMessage(page, 'success')
    
    // 验证修改成功
    await page.reload()
    await expect(page.locator('[data-testid="profile-form-name-input"]')).toHaveValue(newName)
    await expect(page.locator('[data-testid="profile-form-phone-input"]')).toHaveValue(newPhone)
  })

  test('不能修改邮箱和角色', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
    await page.goto('/profile')
    
    // 验证邮箱和角色字段是禁用的
    await expect(page.locator('[data-testid="profile-form-email-input"]')).toBeDisabled()
    await expect(page.locator('[data-testid="profile-form-role-input"]')).toBeDisabled()
  })
})

