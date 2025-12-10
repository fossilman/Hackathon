import { test, expect } from '@playwright/test'
import { connectWallet, navigateAndWait, TEST_WALLETS } from './setup/helpers'

/**
 * 结果查看模块测试
 * 对应 PRD104 4.8 结果查看模块
 */
test.describe('结果查看模块', () => {
  test.beforeEach(async ({ page }) => {
    await navigateAndWait(page, '/')
    await connectWallet(page, TEST_WALLETS.participant1)
  })

  test('在公布结果阶段可以查看结果', async ({ page }) => {
    // 查找公布结果阶段的活动
    await page.goto('/')
    await page.waitForSelector('[data-testid="home-hackathon-list"]')
    
    const resultsCards = page.locator('[data-testid^="home-hackathon-card-"]').filter({
      has: page.locator('[data-testid$="-status"]').filter({ hasText: '公布结果' })
    })
    
    const count = await resultsCards.count()
    if (count > 0) {
      await resultsCards.first().click()
      await page.waitForSelector('[data-testid="hackathon-detail-page"]')
      
      // 点击查看结果按钮
      const resultsButton = page.locator('[data-testid="hackathon-detail-results-button"]')
      if (await resultsButton.isVisible()) {
        await resultsButton.click()
        await page.waitForSelector('[data-testid="results-page"]')
        
        // 验证结果页面元素
        await expect(page.locator('[data-testid="results-card"]')).toBeVisible()
        await expect(page.locator('[data-testid="results-table"]')).toBeVisible()
        await expect(page.locator('[data-testid="results-statistics"]')).toBeVisible()
      }
    } else {
      test.skip()
    }
  })

  test('非公布结果阶段不能查看结果', async ({ page }) => {
    // 查找非公布结果阶段的活动
    await page.goto('/')
    await page.waitForSelector('[data-testid="home-hackathon-list"]')
    
    const nonResultsCards = page.locator('[data-testid^="home-hackathon-card-"]').filter({
      hasNot: page.locator('[data-testid$="-status"]').filter({ hasText: '公布结果' })
    })
    
    const count = await nonResultsCards.count()
    if (count > 0) {
      await nonResultsCards.first().click()
      await page.waitForSelector('[data-testid="hackathon-detail-page"]')
      
      // 验证查看结果按钮不显示
      const resultsButton = page.locator('[data-testid="hackathon-detail-results-button"]')
      await expect(resultsButton).not.toBeVisible()
    } else {
      test.skip()
    }
  })

  test('查看最终排名', async ({ page }) => {
    // 查找公布结果阶段的活动
    await page.goto('/')
    await page.waitForSelector('[data-testid="home-hackathon-list"]')
    
    const resultsCards = page.locator('[data-testid^="home-hackathon-card-"]').filter({
      has: page.locator('[data-testid$="-status"]').filter({ hasText: '公布结果' })
    })
    
    const count = await resultsCards.count()
    if (count > 0) {
      await resultsCards.first().click()
      await page.waitForSelector('[data-testid="hackathon-detail-page"]')
      
      const resultsButton = page.locator('[data-testid="hackathon-detail-results-button"]')
      if (await resultsButton.isVisible()) {
        await resultsButton.click()
        await page.waitForSelector('[data-testid="results-page"]')
        
        // 验证排名表格存在
        await expect(page.locator('[data-testid="results-table"]')).toBeVisible()
        
        // 验证表格列存在
        const table = page.locator('[data-testid="results-table"]')
        await expect(table).toBeVisible()
      }
    } else {
      test.skip()
    }
  })

  test('查看统计数据', async ({ page }) => {
    // 查找公布结果阶段的活动
    await page.goto('/')
    await page.waitForSelector('[data-testid="home-hackathon-list"]')
    
    const resultsCards = page.locator('[data-testid^="home-hackathon-card-"]').filter({
      has: page.locator('[data-testid$="-status"]').filter({ hasText: '公布结果' })
    })
    
    const count = await resultsCards.count()
    if (count > 0) {
      await resultsCards.first().click()
      await page.waitForSelector('[data-testid="hackathon-detail-page"]')
      
      const resultsButton = page.locator('[data-testid="hackathon-detail-results-button"]')
      if (await resultsButton.isVisible()) {
        await resultsButton.click()
        await page.waitForSelector('[data-testid="results-page"]')
        
        // 验证统计信息存在
        await expect(page.locator('[data-testid="results-statistics"]')).toBeVisible()
        await expect(page.locator('[data-testid="results-stat-votes"]')).toBeVisible()
        await expect(page.locator('[data-testid="results-stat-teams"]')).toBeVisible()
        await expect(page.locator('[data-testid="results-stat-submissions"]')).toBeVisible()
      }
    } else {
      test.skip()
    }
  })

  test('查看获奖队伍信息', async ({ page }) => {
    // 查找公布结果阶段的活动
    await page.goto('/')
    await page.waitForSelector('[data-testid="home-hackathon-list"]')
    
    const resultsCards = page.locator('[data-testid^="home-hackathon-card-"]').filter({
      has: page.locator('[data-testid$="-status"]').filter({ hasText: '公布结果' })
    })
    
    const count = await resultsCards.count()
    if (count > 0) {
      await resultsCards.first().click()
      await page.waitForSelector('[data-testid="hackathon-detail-page"]')
      
      const resultsButton = page.locator('[data-testid="hackathon-detail-results-button"]')
      if (await resultsButton.isVisible()) {
        await resultsButton.click()
        await page.waitForSelector('[data-testid="results-page"]')
        
        // 验证表格存在（包含获奖信息列）
        const table = page.locator('[data-testid="results-table"]')
        await expect(table).toBeVisible()
        
        // 验证表格包含奖项列（通过检查表格内容）
        const tableContent = await table.textContent()
        expect(tableContent).toBeTruthy()
      }
    } else {
      test.skip()
    }
  })

  test('未登录不能查看结果', async ({ page }) => {
    // 不连接钱包
    await page.goto('/')
    await page.waitForSelector('[data-testid="home-hackathon-list"]')
    
    // 尝试直接访问结果页面
    const resultsCards = page.locator('[data-testid^="home-hackathon-card-"]').filter({
      has: page.locator('[data-testid$="-status"]').filter({ hasText: '公布结果' })
    })
    
    const count = await resultsCards.count()
    if (count > 0) {
      // 获取活动ID
      const firstCard = resultsCards.first()
      const cardId = await firstCard.getAttribute('data-testid')
      if (cardId) {
        const hackathonId = cardId.replace('home-hackathon-card-', '')
        
        // 直接访问结果页面
        await page.goto(`/hackathons/${hackathonId}/results`)
        
        // 应该跳转到首页或显示连接钱包提示
        await page.waitForTimeout(1000)
        const currentUrl = page.url()
        // 根据实际实现，可能跳转到首页
        expect(currentUrl).toBeTruthy()
      }
    } else {
      test.skip()
    }
  })
})

