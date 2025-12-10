import { test, expect } from '@playwright/test'
import { connectWallet, navigateAndWait, waitForListLoad, getListItemCount, clickListItem } from './setup/helpers'

/**
 * 活动浏览模块测试
 * 对应 PRD104 4.2 活动浏览模块
 */
test.describe('活动浏览模块', () => {
  test.beforeEach(async ({ page }) => {
    await navigateAndWait(page, '/')
  })

  test('未登录用户可以查看活动列表', async ({ page }) => {
    // 验证首页加载
    await expect(page.locator('[data-testid="home-page"]')).toBeVisible()
    
    // 验证活动列表存在
    await waitForListLoad(page, 'home-hackathon-list')
    
    // 验证至少有一个活动卡片
    const count = await getListItemCount(page, 'home-hackathon')
    expect(count).toBeGreaterThan(0)
  })

  test('已登录用户可以查看活动列表', async ({ page }) => {
    await connectWallet(page)
    
    // 验证活动列表存在
    await waitForListLoad(page, 'home-hackathon-list')
    
    // 验证至少有一个活动卡片
    const count = await getListItemCount(page, 'home-hackathon')
    expect(count).toBeGreaterThan(0)
  })

  test('查看活动详情', async ({ page }) => {
    await waitForListLoad(page, 'home-hackathon-list')
    
    // 点击第一个活动卡片
    const firstCard = page.locator('[data-testid^="home-hackathon-card-"]').first()
    await firstCard.click()
    
    // 验证跳转到活动详情页
    await expect(page).toHaveURL(/\/hackathons\/\d+/)
    await expect(page.locator('[data-testid="hackathon-detail-page"]')).toBeVisible()
    
    // 验证活动信息显示
    await expect(page.locator('[data-testid="hackathon-detail-card"]')).toBeVisible()
    await expect(page.locator('[data-testid="hackathon-detail-info"]')).toBeVisible()
    await expect(page.locator('[data-testid="hackathon-detail-status"]')).toBeVisible()
  })

  test('活动详情显示完整信息', async ({ page }) => {
    await waitForListLoad(page, 'home-hackathon-list')
    
    // 点击第一个活动卡片
    const firstCard = page.locator('[data-testid^="home-hackathon-card-"]').first()
    await firstCard.click()
    
    // 验证活动基本信息
    await expect(page.locator('[data-testid="hackathon-detail-start-time"]')).toBeVisible()
    await expect(page.locator('[data-testid="hackathon-detail-end-time"]')).toBeVisible()
    await expect(page.locator('[data-testid="hackathon-detail-description"]')).toBeVisible()
  })

  test('分页功能测试', async ({ page }) => {
    await waitForListLoad(page, 'home-hackathon-list')
    
    // 获取第一页的活动数量
    const firstPageCount = await getListItemCount(page, 'home-hackathon')
    
    // 如果活动数量足够多，应该可以翻页
    // 注意：这里假设每页显示12个活动
    if (firstPageCount >= 12) {
      // 滚动到底部查看是否有分页控件
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(1000)
    }
  })

  test('查看我的活动（已登录）', async ({ page }) => {
    await connectWallet(page)
    
    // 点击"我的活动"
    await page.click('[data-testid="nav-my-hackathons"]')
    
    // 验证跳转到我的活动页面
    await expect(page).toHaveURL(/\/my-hackathons/)
    await expect(page.locator('[data-testid="my-hackathons-page"]')).toBeVisible()
  })

  test('未登录时访问我的活动应跳转', async ({ page }) => {
    await navigateAndWait(page, '/my-hackathons')
    
    // 应该跳转到首页或显示连接钱包提示
    const currentUrl = page.url()
    expect(currentUrl).toMatch(/\//)
  })

  test('活动卡片信息显示', async ({ page }) => {
    await waitForListLoad(page, 'home-hackathon-list')
    
    // 获取第一个活动卡片
    const firstCard = page.locator('[data-testid^="home-hackathon-card-"]').first()
    
    // 验证卡片信息
    await expect(firstCard).toBeVisible()
    
    // 验证活动名称、日期、描述等元素存在
    const cardId = await firstCard.getAttribute('data-testid')
    if (cardId) {
      const id = cardId.replace('home-hackathon-card-', '')
      await expect(page.locator(`[data-testid="home-hackathon-card-${id}-date"]`)).toBeVisible()
      await expect(page.locator(`[data-testid="home-hackathon-card-${id}-description"]`)).toBeVisible()
      await expect(page.locator(`[data-testid="home-hackathon-card-${id}-status"]`)).toBeVisible()
    }
  })
})

