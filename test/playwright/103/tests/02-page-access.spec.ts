import { test, expect } from '@playwright/test'
import { login, TEST_USERS, expectPageAccessible, expectPageInaccessible } from './setup/helpers'

/**
 * 页面访问权限测试
 * 对应 PRD103 3.1 页面列表及访问权限
 */
test.describe('页面访问权限', () => {
  test.describe('Admin权限', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
    })

    test('可以访问登录页面', async ({ page }) => {
      // 已登录用户访问登录页面可能会被重定向，这是正常行为
      await page.goto('/login')
      // 检查是否在登录页或已被重定向到其他页面（都是可接受的）
      const currentUrl = page.url()
      expect(currentUrl.includes('/login') || currentUrl.includes('/dashboard') || currentUrl.includes('/profile')).toBeTruthy()
    })

    test('可以访问仪表盘', async ({ page }) => {
      await expectPageAccessible(page, '/dashboard')
      await expect(page.locator('[data-testid="dashboard-page"]')).toBeVisible()
    })

    test('可以访问人员管理页面', async ({ page }) => {
      await expectPageAccessible(page, '/users')
      await expect(page.locator('[data-testid="user-management-page"]')).toBeVisible()
    })

    test('可以访问活动列表页面', async ({ page }) => {
      await expectPageAccessible(page, '/hackathons')
      await expect(page.locator('[data-testid="hackathon-list-page"]')).toBeVisible()
    })

    test('不能访问活动创建页面', async ({ page }) => {
      await page.goto('/hackathons/create')
      // 应该被重定向或显示错误
      await expect(page).not.toHaveURL('/hackathons/create')
    })

    test('可以访问个人中心', async ({ page }) => {
      await expectPageAccessible(page, '/profile')
      await expect(page.locator('[data-testid="profile-page"]')).toBeVisible()
    })
  })

  test.describe('主办方权限', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, TEST_USERS.organizer1.email, TEST_USERS.organizer1.password)
    })

    test('可以访问登录页面', async ({ page }) => {
      // 已登录用户访问登录页面可能会被重定向，这是正常行为
      await page.goto('/login')
      // 检查是否在登录页或已被重定向到其他页面（都是可接受的）
      const currentUrl = page.url()
      expect(currentUrl.includes('/login') || currentUrl.includes('/dashboard') || currentUrl.includes('/profile')).toBeTruthy()
    })

    test('可以访问仪表盘', async ({ page }) => {
      await expectPageAccessible(page, '/dashboard')
      await expect(page.locator('[data-testid="dashboard-page"]')).toBeVisible()
    })

    test('不能访问人员管理页面', async ({ page }) => {
      await page.goto('/users')
      // 应该被重定向到登录页或显示403
      await expect(page).not.toHaveURL('/users')
    })

    test('可以访问活动列表页面', async ({ page }) => {
      await expectPageAccessible(page, '/hackathons')
      await expect(page.locator('[data-testid="hackathon-list-page"]')).toBeVisible()
    })

    test('可以访问活动创建页面', async ({ page }) => {
      await expectPageAccessible(page, '/hackathons/create')
      await expect(page.locator('[data-testid="hackathon-create-page"]')).toBeVisible()
    })

    test('可以访问个人中心', async ({ page }) => {
      await expectPageAccessible(page, '/profile')
      await expect(page.locator('[data-testid="profile-page"]')).toBeVisible()
    })
  })

  test.describe('赞助商权限', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, TEST_USERS.sponsor.email, TEST_USERS.sponsor.password)
    })

    test('可以访问登录页面', async ({ page }) => {
      // 已登录用户访问登录页面可能会被重定向，这是正常行为
      await page.goto('/login')
      // 检查是否在登录页或已被重定向到其他页面（都是可接受的）
      const currentUrl = page.url()
      expect(currentUrl.includes('/login') || currentUrl.includes('/dashboard') || currentUrl.includes('/profile')).toBeTruthy()
    })

    test('不能访问仪表盘', async ({ page }) => {
      await page.goto('/dashboard')
      // 应该被重定向
      await expect(page).not.toHaveURL('/dashboard')
    })

    test('不能访问人员管理页面', async ({ page }) => {
      await page.goto('/users')
      await expect(page).not.toHaveURL('/users')
    })

    test('不能访问活动列表页面', async ({ page }) => {
      await page.goto('/hackathons')
      await expect(page).not.toHaveURL('/hackathons')
    })

    test('不能访问活动创建页面', async ({ page }) => {
      await page.goto('/hackathons/create')
      await expect(page).not.toHaveURL('/hackathons/create')
    })

    test('可以访问个人中心', async ({ page }) => {
      await expectPageAccessible(page, '/profile')
      await expect(page.locator('[data-testid="profile-page"]')).toBeVisible()
    })
  })

  test.describe('未登录用户', () => {
    test('访问受保护页面应该重定向到登录页', async ({ page }) => {
      await page.goto('/dashboard')
      await expect(page).toHaveURL('/login')
      
      await page.goto('/users')
      await expect(page).toHaveURL('/login')
      
      await page.goto('/hackathons')
      await expect(page).toHaveURL('/login')
    })
  })
})

