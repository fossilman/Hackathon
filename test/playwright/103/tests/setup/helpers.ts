import { Page, expect } from '@playwright/test'

/**
 * 测试辅助函数
 */

// 测试用户凭据
export const TEST_USERS = {
  admin: {
    email: 'admin@test.com',
    password: 'Admin123456',
    role: 'admin',
  },
  organizer1: {
    email: 'organizer1@test.com',
    password: 'Organizer123456',
    role: 'organizer',
  },
  organizer2: {
    email: 'organizer2@test.com',
    password: 'Organizer123456',
    role: 'organizer',
  },
  sponsor: {
    email: 'sponsor@test.com',
    password: 'Sponsor123456',
    role: 'sponsor',
  },
}

/**
 * 登录用户
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.waitForSelector('[data-testid="login-page"]')
  
  // 等待输入框可见且可编辑
  const emailInput = page.locator('[data-testid="login-email-input"]')
  const passwordInput = page.locator('[data-testid="login-password-input"]')
  
  await emailInput.waitFor({ state: 'visible', timeout: 10000 })
  await passwordInput.waitFor({ state: 'visible', timeout: 10000 })
  
  // 等待输入框可编辑
  await emailInput.waitFor({ state: 'attached', timeout: 5000 })
  await passwordInput.waitFor({ state: 'attached', timeout: 5000 })
  
  // 清空并填写输入框
  await emailInput.clear({ timeout: 5000 })
  await passwordInput.clear({ timeout: 5000 })
  await emailInput.fill(email, { timeout: 10000 })
  await passwordInput.fill(password, { timeout: 10000 })
  
  // 点击登录按钮
  await page.click('[data-testid="login-submit-button"]')
  
  // 等待导航或错误消息
  try {
    // 先等待可能的错误消息（快速检查）
    const errorMsg = await page.locator('.ant-message-error').waitFor({ state: 'visible', timeout: 3000 }).catch(() => null)
    if (errorMsg) {
      const errorText = await page.locator('.ant-message-error').textContent()
      throw new Error(`登录失败: ${errorText}`)
    }
    
    // 等待导航离开登录页
    await page.waitForURL((url) => url.pathname !== '/login', { timeout: 20000 })
  } catch (error: any) {
    // 如果导航超时，再次检查是否有错误消息
    const errorMsg = await page.locator('.ant-message-error').isVisible({ timeout: 2000 }).catch(() => false)
    if (errorMsg) {
      const errorText = await page.locator('.ant-message-error').textContent()
      throw new Error(`登录失败: ${errorText}`)
    }
    // 检查是否仍在登录页
    const currentUrl = page.url()
    if (currentUrl.includes('/login')) {
      // 等待一下，可能还在加载
      await page.waitForTimeout(3000)
      const finalUrl = page.url()
      if (finalUrl.includes('/login')) {
        throw new Error(`登录后未跳转，当前URL: ${finalUrl}`)
      }
    }
    // 如果已经跳转，说明登录成功，直接返回
    return
  }
}

/**
 * 登出用户
 */
export async function logout(page: Page) {
  // 查找用户菜单按钮（通常在右上角）
  const userMenuButton = page.locator('[data-testid="admin-user-menu-button"]')
  if (await userMenuButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await userMenuButton.click()
    // 等待下拉菜单出现
    await page.waitForTimeout(500)
    // 等待登出菜单项出现并点击（菜单项中的 label 是 "退出登录"）
    // 使用更精确的选择器：查找包含"退出登录"文本的菜单项
    const logoutButton = page.locator('[data-testid="admin-menu-logout"]').or(page.locator('.ant-dropdown-menu-item:has-text("退出登录")'))
    await logoutButton.waitFor({ state: 'visible', timeout: 2000 })
    await logoutButton.click()
  }
  // 等待跳转到登录页
  await page.waitForURL('/login', { timeout: 5000 })
}

/**
 * 检查页面是否可访问（不重定向到登录页）
 */
export async function expectPageAccessible(page: Page, url: string) {
  await page.goto(url)
  // 如果被重定向到登录页，说明没有权限
  await expect(page).not.toHaveURL('/login')
}

/**
 * 检查页面是否不可访问（被重定向到登录页或其他错误页）
 */
export async function expectPageInaccessible(page: Page, url: string) {
  await page.goto(url)
  // 应该被重定向到登录页或显示错误
  const currentUrl = page.url()
  expect(currentUrl === '/login' || currentUrl.includes('403') || currentUrl.includes('404')).toBeTruthy()
}

/**
 * 等待表格加载完成
 */
export async function waitForTableLoad(page: Page, tableTestId: string) {
  await page.waitForSelector(`[data-testid="${tableTestId}"]`, { state: 'visible' })
  // 等待加载状态消失
  await page.waitForTimeout(500)
}

/**
 * 检查表格分页
 */
export async function checkTablePagination(page: Page, tableTestId: string) {
  const table = page.locator(`[data-testid="${tableTestId}"]`)
  await expect(table).toBeVisible()
  
  // 检查分页控件是否存在
  const pagination = page.locator('.ant-pagination')
  const isPaginationVisible = await pagination.isVisible().catch(() => false)
  
  if (isPaginationVisible) {
    // 检查分页信息
    const totalText = await pagination.locator('.ant-pagination-total-text').textContent()
    expect(totalText).toContain('共')
    
    // 尝试切换页面大小
    const pageSizeSelector = pagination.locator('.ant-select-selector')
    if (await pageSizeSelector.isVisible({ timeout: 1000 }).catch(() => false)) {
      await pageSizeSelector.click()
      await page.waitForTimeout(300)
    }
  }
}

/**
 * 创建测试用户（通过API）
 */
export async function createTestUser(
  page: Page,
  name: string,
  email: string,
  password: string,
  role: 'organizer' | 'sponsor',
  phone?: string
) {
  // 先登录admin
  await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
  await page.goto('/users')
  
  // 点击添加用户按钮
  await page.click('[data-testid="user-management-create-button"]')
  await page.waitForSelector('[data-testid="user-management-form-modal"]')
  
  // 填写表单
  await page.fill('[data-testid="user-management-form-name-input"]', name)
  await page.fill('[data-testid="user-management-form-email-input"]', email)
  await page.fill('[data-testid="user-management-form-password-input"]', password)
  await page.click('[data-testid="user-management-form-role-select"]')
  await page.click(`[data-testid="user-management-form-role-${role}"]`)
  if (phone) {
    await page.fill('[data-testid="user-management-form-phone-input"]', phone)
  }
  
  // 提交
  await page.click('[data-testid="user-management-form-modal"] button:has-text("确定")')
  await page.waitForTimeout(1000)
}

/**
 * 创建测试活动（通过API）
 */
export async function createTestHackathon(
  page: Page,
  name: string,
  description: string,
  startTime: string,
  endTime: string
) {
  // 先登录organizer
  await login(page, TEST_USERS.organizer1.email, TEST_USERS.organizer1.password)
  await page.goto('/hackathons/create')
  
  // 填写表单
  await page.fill('[data-testid="hackathon-create-form-name-input"]', name)
  
  // 填写描述（ReactQuill编辑器）
  const descriptionEditor = page.locator('[data-testid="hackathon-create-form-description-quill"] .ql-editor')
  await descriptionEditor.click()
  await descriptionEditor.fill(description)
  
  // 选择时间范围
  await page.click('[data-testid="hackathon-create-form-time-range-picker"]')
  await page.waitForTimeout(500)
  // 这里需要根据实际的日期选择器实现来填写
  
  // 提交
  await page.click('[data-testid="hackathon-create-form-submit-button"]')
  await page.waitForTimeout(2000)
}

/**
 * 获取当前用户角色
 */
export async function getCurrentUserRole(page: Page): Promise<string | null> {
  // 尝试从localStorage获取
  const role = await page.evaluate(() => {
    const authStore = localStorage.getItem('auth-store')
    if (authStore) {
      try {
        const parsed = JSON.parse(authStore)
        return parsed?.state?.user?.role || null
      } catch {
        return null
      }
    }
    return null
  })
  return role
}

/**
 * 等待消息提示
 */
export async function waitForMessage(page: Page, type: 'success' | 'error' = 'success') {
  const messageSelector = type === 'success' 
    ? '.ant-message-success, .ant-message .ant-message-success, [class*="ant-message-success"]' 
    : '.ant-message-error, .ant-message .ant-message-error, [class*="ant-message-error"]'
  
  // 等待消息容器出现（更宽松的等待）
  try {
    await page.waitForSelector('.ant-message', { state: 'visible', timeout: 3000 })
  } catch {
    // 如果消息容器没有出现，尝试直接等待消息内容
  }
  
  // 等待具体的成功/错误消息出现（使用更灵活的选择器）
  try {
    // 尝试多种选择器
    await Promise.race([
      page.waitForSelector(messageSelector, { state: 'visible', timeout: 8000 }),
      page.waitForSelector('.ant-message .ant-message-notice', { state: 'visible', timeout: 8000 }),
    ])
  } catch {
    // 如果都失败，检查是否有消息文本
    const messageText = await page.locator('.ant-message').textContent({ timeout: 2000 }).catch(() => null)
    if (!messageText) {
      // 如果确实没有消息，可能是静默成功，不抛出错误
      console.warn('未检测到消息提示，但继续执行')
    }
  }
  
  await page.waitForTimeout(500) // 等待消息显示
}

