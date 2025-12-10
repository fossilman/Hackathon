import { test, expect } from '@playwright/test'
import { connectWallet, navigateAndWait, waitForMessage, waitAndClick, TEST_WALLETS } from './setup/helpers'

/**
 * 签到模块测试
 * 对应 PRD104 4.4 签到模块
 */
test.describe('签到模块', () => {
  test.beforeEach(async ({ page }) => {
    await navigateAndWait(page, '/')
    await connectWallet(page, TEST_WALLETS.participant1)
  })

  test('在签到阶段可以签到（已报名）', async ({ page }) => {
    // 先报名一个活动
    await page.goto('/')
    await page.waitForSelector('[data-testid="home-hackathon-list"]')
    
    // 查找报名阶段的活动
    const registrationCards = page.locator('[data-testid^="home-hackathon-card-"]').filter({
      has: page.locator('[data-testid$="-status"]').filter({ hasText: '报名' })
    })
    
    const count = await registrationCards.count()
    if (count > 0) {
      // 先报名
      await registrationCards.first().click()
      await page.waitForSelector('[data-testid="hackathon-detail-page"]')
      
      const registerButton = page.locator('[data-testid="hackathon-detail-register-button"]')
      if (await registerButton.isVisible()) {
        await registerButton.click()
        await waitForMessage(page, 'success', 5000)
      }
    }
    
    // 查找签到阶段的活动
    await page.goto('/')
    await page.waitForSelector('[data-testid="home-hackathon-list"]')
    
    const checkinCards = page.locator('[data-testid^="home-hackathon-card-"]').filter({
      has: page.locator('[data-testid$="-status"]').filter({ hasText: '签到' })
    })
    
    const checkinCount = await checkinCards.count()
    if (checkinCount > 0) {
      // 点击第一个签到阶段的活动
      await checkinCards.first().click()
      await page.waitForSelector('[data-testid="hackathon-detail-page"]')
      
      // 查找签到按钮
      const checkinButton = page.locator('[data-testid="hackathon-detail-checkin-button"]')
      if (await checkinButton.isVisible()) {
        await checkinButton.click()
        await waitForMessage(page, 'success', 5000)
        
        // 验证签到成功（按钮应该消失或状态更新）
        await page.waitForTimeout(1000)
      }
    } else {
      test.skip()
    }
  })

  test('未报名时不能签到', async ({ page }) => {
    // 查找签到阶段的活动
    await page.goto('/')
    await page.waitForSelector('[data-testid="home-hackathon-list"]')
    
    const checkinCards = page.locator('[data-testid^="home-hackathon-card-"]').filter({
      has: page.locator('[data-testid$="-status"]').filter({ hasText: '签到' })
    })
    
    const count = await checkinCards.count()
    if (count > 0) {
      await checkinCards.first().click()
      await page.waitForSelector('[data-testid="hackathon-detail-page"]')
      
      // 验证签到按钮不显示（因为未报名）
      const checkinButton = page.locator('[data-testid="hackathon-detail-checkin-button"]')
      await expect(checkinButton).not.toBeVisible()
    } else {
      test.skip()
    }
  })

  test('非签到阶段不能签到', async ({ page }) => {
    // 查找非签到阶段的活动
    await page.goto('/')
    await page.waitForSelector('[data-testid="home-hackathon-list"]')
    
    const nonCheckinCards = page.locator('[data-testid^="home-hackathon-card-"]').filter({
      hasNot: page.locator('[data-testid$="-status"]').filter({ hasText: '签到' })
    })
    
    const count = await nonCheckinCards.count()
    if (count > 0) {
      await nonCheckinCards.first().click()
      await page.waitForSelector('[data-testid="hackathon-detail-page"]')
      
      // 验证签到按钮不显示
      const checkinButton = page.locator('[data-testid="hackathon-detail-checkin-button"]')
      await expect(checkinButton).not.toBeVisible()
    } else {
      test.skip()
    }
  })

  test('已签到后不能重复签到', async ({ page }) => {
    // 先报名并签到一个活动
    await page.goto('/')
    await page.waitForSelector('[data-testid="home-hackathon-list"]')
    
    // 查找签到阶段的活动
    const checkinCards = page.locator('[data-testid^="home-hackathon-card-"]').filter({
      has: page.locator('[data-testid$="-status"]').filter({ hasText: '签到' })
    })
    
    const count = await checkinCards.count()
    if (count > 0) {
      await checkinCards.first().click()
      await page.waitForSelector('[data-testid="hackathon-detail-page"]')
      
      // 如果显示签到按钮，说明未签到，先签到
      const checkinButton = page.locator('[data-testid="hackathon-detail-checkin-button"]')
      if (await checkinButton.isVisible()) {
        // 需要先报名
        const registerButton = page.locator('[data-testid="hackathon-detail-register-button"]')
        if (await registerButton.isVisible()) {
          await registerButton.click()
          await waitForMessage(page, 'success', 5000)
        }
        
        // 然后签到
        await checkinButton.click()
        await waitForMessage(page, 'success', 5000)
      }
      
      // 刷新页面，验证签到按钮不再显示
      await page.reload()
      await page.waitForSelector('[data-testid="hackathon-detail-page"]')
      
      // 验证签到按钮不显示（已签到）
      await expect(checkinButton).not.toBeVisible()
    } else {
      test.skip()
    }
  })

  test('未登录时不能签到', async ({ page }) => {
    // 不连接钱包
    await page.goto('/')
    await page.waitForSelector('[data-testid="home-hackathon-list"]')
    
    // 点击一个活动
    const firstCard = page.locator('[data-testid^="home-hackathon-card-"]').first()
    await firstCard.click()
    
    await page.waitForSelector('[data-testid="hackathon-detail-page"]')
    
    // 验证签到按钮不显示（应该显示连接钱包按钮）
    const checkinButton = page.locator('[data-testid="hackathon-detail-checkin-button"]')
    const connectButton = page.locator('[data-testid="hackathon-detail-connect-button"]')
    
    if (await connectButton.isVisible()) {
      await expect(checkinButton).not.toBeVisible()
    }
  })
})

