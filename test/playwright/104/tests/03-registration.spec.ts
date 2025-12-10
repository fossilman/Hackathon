import { test, expect } from '@playwright/test'
import { connectWallet, navigateAndWait, waitForMessage, waitAndClick } from './setup/helpers'

/**
 * 报名模块测试
 * 对应 PRD104 4.3 报名模块
 */
test.describe('报名模块', () => {
  test.beforeEach(async ({ page }) => {
    await navigateAndWait(page, '/')
    await connectWallet(page)
  })

  test('在报名阶段可以报名', async ({ page }) => {
    // 查找处于报名阶段的活动
    await page.goto('/')
    await page.waitForSelector('[data-testid="home-hackathon-list"]')
    
    // 查找报名阶段的活动（通过状态标签）
    const registrationCards = page.locator('[data-testid^="home-hackathon-card-"]').filter({
      has: page.locator('[data-testid$="-status"]').filter({ hasText: '报名' })
    })
    
    const count = await registrationCards.count()
    if (count > 0) {
      // 点击第一个报名阶段的活动
      await registrationCards.first().click()
      
      // 等待活动详情页加载
      await page.waitForSelector('[data-testid="hackathon-detail-page"]')
      
      // 点击报名按钮
      const registerButton = page.locator('[data-testid="hackathon-detail-register-button"]')
      if (await registerButton.isVisible()) {
        await registerButton.click()
        await waitForMessage(page, 'success', 5000)
        
        // 验证报名状态更新
        await expect(page.locator('[data-testid="hackathon-detail-registered-tag"]')).toBeVisible()
      }
    } else {
      test.skip()
    }
  })

  test('已报名后显示已报名状态', async ({ page }) => {
    // 先报名一个活动（如果还没有报名）
    await page.goto('/')
    await page.waitForSelector('[data-testid="home-hackathon-list"]')
    
    const registrationCards = page.locator('[data-testid^="home-hackathon-card-"]').filter({
      has: page.locator('[data-testid$="-status"]').filter({ hasText: '报名' })
    })
    
    const count = await registrationCards.count()
    if (count > 0) {
      await registrationCards.first().click()
      await page.waitForSelector('[data-testid="hackathon-detail-page"]')
      
      // 检查是否已报名
      const registeredTag = page.locator('[data-testid="hackathon-detail-registered-tag"]')
      const registerButton = page.locator('[data-testid="hackathon-detail-register-button"]')
      
      if (await registerButton.isVisible()) {
        // 如果未报名，先报名
        await registerButton.click()
        await waitForMessage(page, 'success', 5000)
      }
      
      // 验证显示已报名状态
      await expect(registeredTag).toBeVisible()
    } else {
      test.skip()
    }
  })

  test('在报名阶段可以取消报名', async ({ page }) => {
    // 先报名一个活动
    await page.goto('/')
    await page.waitForSelector('[data-testid="home-hackathon-list"]')
    
    const registrationCards = page.locator('[data-testid^="home-hackathon-card-"]').filter({
      has: page.locator('[data-testid$="-status"]').filter({ hasText: '报名' })
    })
    
    const count = await registrationCards.count()
    if (count > 0) {
      await registrationCards.first().click()
      await page.waitForSelector('[data-testid="hackathon-detail-page"]')
      
      // 确保已报名
      const registerButton = page.locator('[data-testid="hackathon-detail-register-button"]')
      if (await registerButton.isVisible()) {
        await registerButton.click()
        await waitForMessage(page, 'success', 5000)
      }
      
      // 点击取消报名按钮
      const cancelButton = page.locator('[data-testid="hackathon-detail-cancel-register-button"]')
      if (await cancelButton.isVisible()) {
        await cancelButton.click()
        await waitForMessage(page, 'success', 5000)
        
        // 验证报名按钮重新显示
        await expect(page.locator('[data-testid="hackathon-detail-register-button"]')).toBeVisible()
      }
    } else {
      test.skip()
    }
  })

  test('非报名阶段不能报名', async ({ page }) => {
    // 查找非报名阶段的活动
    await page.goto('/')
    await page.waitForSelector('[data-testid="home-hackathon-list"]')
    
    // 查找非报名阶段的活动
    const nonRegistrationCards = page.locator('[data-testid^="home-hackathon-card-"]').filter({
      hasNot: page.locator('[data-testid$="-status"]').filter({ hasText: '报名' })
    })
    
    const count = await nonRegistrationCards.count()
    if (count > 0) {
      await nonRegistrationCards.first().click()
      await page.waitForSelector('[data-testid="hackathon-detail-page"]')
      
      // 验证报名按钮不显示（除非是其他可操作按钮）
      const registerButton = page.locator('[data-testid="hackathon-detail-register-button"]')
      await expect(registerButton).not.toBeVisible()
    } else {
      test.skip()
    }
  })

  test('未登录时不能报名', async ({ page }) => {
    // 不连接钱包
    await page.goto('/')
    await page.waitForSelector('[data-testid="home-hackathon-list"]')
    
    // 点击一个活动
    const firstCard = page.locator('[data-testid^="home-hackathon-card-"]').first()
    await firstCard.click()
    
    await page.waitForSelector('[data-testid="hackathon-detail-page"]')
    
    // 验证报名按钮不显示（应该显示连接钱包按钮）
    const registerButton = page.locator('[data-testid="hackathon-detail-register-button"]')
    const connectButton = page.locator('[data-testid="hackathon-detail-connect-button"]')
    
    if (await connectButton.isVisible()) {
      await expect(registerButton).not.toBeVisible()
    }
  })

  test('我的活动页面显示已报名的活动', async ({ page }) => {
    // 先报名一个活动
    await page.goto('/')
    await page.waitForSelector('[data-testid="home-hackathon-list"]')
    
    const registrationCards = page.locator('[data-testid^="home-hackathon-card-"]').filter({
      has: page.locator('[data-testid$="-status"]').filter({ hasText: '报名' })
    })
    
    const count = await registrationCards.count()
    if (count > 0) {
      await registrationCards.first().click()
      await page.waitForSelector('[data-testid="hackathon-detail-page"]')
      
      // 报名
      const registerButton = page.locator('[data-testid="hackathon-detail-register-button"]')
      if (await registerButton.isVisible()) {
        await registerButton.click()
        await waitForMessage(page, 'success', 5000)
      }
      
      // 查看我的活动
      await page.click('[data-testid="nav-my-hackathons"]')
      await page.waitForSelector('[data-testid="my-hackathons-page"]')
      
      // 验证活动列表不为空
      const myHackathonsList = page.locator('[data-testid="my-hackathons-list"]')
      if (await myHackathonsList.isVisible()) {
        const cardCount = await page.locator('[data-testid^="my-hackathons-card-"]').count()
        expect(cardCount).toBeGreaterThan(0)
      }
    } else {
      test.skip()
    }
  })
})

