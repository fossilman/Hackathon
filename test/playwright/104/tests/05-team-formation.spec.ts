import { test, expect } from '@playwright/test'
import { connectWallet, navigateAndWait, waitForMessage, waitForModal, TEST_WALLETS } from './setup/helpers'

/**
 * 组队模块测试
 * 对应 PRD104 4.5 组队模块
 */
test.describe('组队模块', () => {
  test.beforeEach(async ({ page }) => {
    await navigateAndWait(page, '/')
    await connectWallet(page, TEST_WALLETS.participant1)
  })

  test('在组队阶段可以创建队伍（已签到）', async ({ page }) => {
    // 先报名并签到一个活动
    await setupRegistrationAndCheckin(page)
    
    // 查找组队阶段的活动
    await page.goto('/')
    await page.waitForSelector('[data-testid="home-hackathon-list"]')
    
    const teamFormationCards = page.locator('[data-testid^="home-hackathon-card-"]').filter({
      has: page.locator('[data-testid$="-status"]').filter({ hasText: '组队' })
    })
    
    const count = await teamFormationCards.count()
    if (count > 0) {
      await teamFormationCards.first().click()
      await page.waitForSelector('[data-testid="hackathon-detail-page"]')
      
      // 点击组队按钮
      const teamButton = page.locator('[data-testid="hackathon-detail-team-button"]')
      if (await teamButton.isVisible()) {
        await teamButton.click()
        await page.waitForSelector('[data-testid="team-list-page"]')
        
        // 点击创建队伍按钮
        const createButton = page.locator('[data-testid="team-list-create-button"]')
        if (await createButton.isVisible()) {
          await createButton.click()
          await waitForModal(page, 'team-list-create-modal')
          
          // 填写队伍名称
          const nameInput = page.locator('[data-testid="team-list-create-modal-name-input"]')
          await nameInput.fill('测试队伍' + Date.now())
          
          // 提交（点击确认按钮）
          const modal = page.locator('[data-testid="team-list-create-modal"]')
          const okButton = modal.locator('button').filter({ hasText: '确定' }).or(modal.locator('button').filter({ hasText: 'OK' }))
          await okButton.click()
          
          await waitForMessage(page, 'success', 5000)
        }
      }
    } else {
      test.skip()
    }
  })

  test('在组队阶段可以加入队伍（已签到）', async ({ page }) => {
    // 先报名并签到一个活动
    await setupRegistrationAndCheckin(page)
    
    // 查找组队阶段的活动
    await page.goto('/')
    await page.waitForSelector('[data-testid="home-hackathon-list"]')
    
    const teamFormationCards = page.locator('[data-testid^="home-hackathon-card-"]').filter({
      has: page.locator('[data-testid$="-status"]').filter({ hasText: '组队' })
    })
    
    const count = await teamFormationCards.count()
    if (count > 0) {
      await teamFormationCards.first().click()
      await page.waitForSelector('[data-testid="hackathon-detail-page"]')
      
      // 点击组队按钮
      const teamButton = page.locator('[data-testid="hackathon-detail-team-button"]')
      if (await teamButton.isVisible()) {
        await teamButton.click()
        await page.waitForSelector('[data-testid="team-list-page"]')
        
        // 等待队伍列表加载
        await page.waitForSelector('[data-testid="team-list"]')
        
        // 查找加入按钮
        const joinButtons = page.locator('[data-testid^="team-list-join-button-"]')
        const joinCount = await joinButtons.count()
        
        if (joinCount > 0) {
          // 点击第一个加入按钮
          await joinButtons.first().click()
          await waitForMessage(page, 'success', 5000)
        } else {
          test.skip()
        }
      }
    } else {
      test.skip()
    }
  })

  test('未签到不能组队', async ({ page }) => {
    // 查找组队阶段的活动
    await page.goto('/')
    await page.waitForSelector('[data-testid="home-hackathon-list"]')
    
    const teamFormationCards = page.locator('[data-testid^="home-hackathon-card-"]').filter({
      has: page.locator('[data-testid$="-status"]').filter({ hasText: '组队' })
    })
    
    const count = await teamFormationCards.count()
    if (count > 0) {
      await teamFormationCards.first().click()
      await page.waitForSelector('[data-testid="hackathon-detail-page"]')
      
      // 验证组队按钮不显示（因为未签到）
      const teamButton = page.locator('[data-testid="hackathon-detail-team-button"]')
      await expect(teamButton).not.toBeVisible()
    } else {
      test.skip()
    }
  })

  test('非组队阶段不能组队', async ({ page }) => {
    // 查找非组队阶段的活动
    await page.goto('/')
    await page.waitForSelector('[data-testid="home-hackathon-list"]')
    
    const nonTeamFormationCards = page.locator('[data-testid^="home-hackathon-card-"]').filter({
      hasNot: page.locator('[data-testid$="-status"]').filter({ hasText: '组队' })
    })
    
    const count = await nonTeamFormationCards.count()
    if (count > 0) {
      await nonTeamFormationCards.first().click()
      await page.waitForSelector('[data-testid="hackathon-detail-page"]')
      
      // 验证组队按钮不显示
      const teamButton = page.locator('[data-testid="hackathon-detail-team-button"]')
      await expect(teamButton).not.toBeVisible()
    } else {
      test.skip()
    }
  })

  test('已组队后不能重复加入队伍', async ({ page }) => {
    // 先报名、签到并组队
    await setupRegistrationAndCheckin(page)
    
    // 查找组队阶段的活动
    await page.goto('/')
    await page.waitForSelector('[data-testid="home-hackathon-list"]')
    
    const teamFormationCards = page.locator('[data-testid^="home-hackathon-card-"]').filter({
      has: page.locator('[data-testid$="-status"]').filter({ hasText: '组队' })
    })
    
    const count = await teamFormationCards.count()
    if (count > 0) {
      await teamFormationCards.first().click()
      await page.waitForSelector('[data-testid="hackathon-detail-page"]')
      
      // 如果显示组队按钮，先组队
      const teamButton = page.locator('[data-testid="hackathon-detail-team-button"]')
      if (await teamButton.isVisible()) {
        await teamButton.click()
        await page.waitForSelector('[data-testid="team-list-page"]')
        
        // 创建或加入队伍
        const createButton = page.locator('[data-testid="team-list-create-button"]')
        if (await createButton.isVisible()) {
          await createButton.click()
          await waitForModal(page, 'team-list-create-modal')
          
          const nameInput = page.locator('[data-testid="team-list-create-modal-name-input"]')
          await nameInput.fill('测试队伍' + Date.now())
          
          const modal = page.locator('[data-testid="team-list-create-modal"]')
          const okButton = modal.locator('button').filter({ hasText: '确定' }).or(modal.locator('button').filter({ hasText: 'OK' }))
          await okButton.click()
          
          await waitForMessage(page, 'success', 5000)
        }
      }
      
      // 刷新页面，验证组队按钮不再显示或状态已更新
      await page.goto('/')
      await teamFormationCards.first().click()
      await page.waitForSelector('[data-testid="hackathon-detail-page"]')
      
      // 验证组队按钮不显示（已组队）
      await expect(teamButton).not.toBeVisible()
    } else {
      test.skip()
    }
  })

  test('查看队伍列表', async ({ page }) => {
    // 先报名并签到
    await setupRegistrationAndCheckin(page)
    
    // 查找组队阶段的活动
    await page.goto('/')
    await page.waitForSelector('[data-testid="home-hackathon-list"]')
    
    const teamFormationCards = page.locator('[data-testid^="home-hackathon-card-"]').filter({
      has: page.locator('[data-testid$="-status"]').filter({ hasText: '组队' })
    })
    
    const count = await teamFormationCards.count()
    if (count > 0) {
      await teamFormationCards.first().click()
      await page.waitForSelector('[data-testid="hackathon-detail-page"]')
      
      const teamButton = page.locator('[data-testid="hackathon-detail-team-button"]')
      if (await teamButton.isVisible()) {
        await teamButton.click()
        await page.waitForSelector('[data-testid="team-list-page"]')
        
        // 验证队伍列表存在
        await expect(page.locator('[data-testid="team-list"]')).toBeVisible()
        await expect(page.locator('[data-testid="team-list-card"]')).toBeVisible()
      }
    } else {
      test.skip()
    }
  })
})

/**
 * 辅助函数：设置报名和签到
 */
async function setupRegistrationAndCheckin(page: any) {
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
    
    // 先报名
    const registerButton = page.locator('[data-testid="hackathon-detail-register-button"]')
    if (await registerButton.isVisible()) {
      await registerButton.click()
      await waitForMessage(page, 'success', 5000)
    }
    
    // 然后签到
    const checkinButton = page.locator('[data-testid="hackathon-detail-checkin-button"]')
    if (await checkinButton.isVisible()) {
      await checkinButton.click()
      await waitForMessage(page, 'success', 5000)
    }
  }
}

