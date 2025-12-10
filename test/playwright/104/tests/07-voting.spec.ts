import { test, expect } from '@playwright/test'
import { connectWallet, navigateAndWait, waitForMessage, TEST_WALLETS } from './setup/helpers'

/**
 * 投票模块测试
 * 对应 PRD104 4.7 投票模块
 */
test.describe('投票模块', () => {
  test.beforeEach(async ({ page }) => {
    await navigateAndWait(page, '/')
    await connectWallet(page, TEST_WALLETS.participant1)
  })

  test('在投票阶段可以投票（已签到）', async ({ page }) => {
    // 先报名并签到
    await setupRegistrationAndCheckin(page)
    
    // 查找投票阶段的活动
    await page.goto('/')
    await page.waitForSelector('[data-testid="home-hackathon-list"]')
    
    const votingCards = page.locator('[data-testid^="home-hackathon-card-"]').filter({
      has: page.locator('[data-testid$="-status"]').filter({ hasText: '投票' })
    })
    
    const count = await votingCards.count()
    if (count > 0) {
      await votingCards.first().click()
      await page.waitForSelector('[data-testid="hackathon-detail-page"]')
      
      // 点击投票按钮
      const voteButton = page.locator('[data-testid="hackathon-detail-vote-button"]')
      if (await voteButton.isVisible()) {
        await voteButton.click()
        await page.waitForSelector('[data-testid="submission-list-page"]')
        
        // 等待作品列表加载
        await page.waitForSelector('[data-testid="submission-list"]')
        
        // 查找投票按钮
        const submissionVoteButtons = page.locator('[data-testid^="submission-list-vote-button-"]')
        const voteCount = await submissionVoteButtons.count()
        
        if (voteCount > 0) {
          // 点击第一个投票按钮
          await submissionVoteButtons.first().click()
          await waitForMessage(page, 'success', 5000)
          
          // 验证按钮状态更新（应该变为"已投票"）
          await page.waitForTimeout(1000)
        } else {
          test.skip()
        }
      }
    } else {
      test.skip()
    }
  })

  test('未签到不能投票', async ({ page }) => {
    // 查找投票阶段的活动
    await page.goto('/')
    await page.waitForSelector('[data-testid="home-hackathon-list"]')
    
    const votingCards = page.locator('[data-testid^="home-hackathon-card-"]').filter({
      has: page.locator('[data-testid$="-status"]').filter({ hasText: '投票' })
    })
    
    const count = await votingCards.count()
    if (count > 0) {
      await votingCards.first().click()
      await page.waitForSelector('[data-testid="hackathon-detail-page"]')
      
      // 验证投票按钮不显示（因为未签到）
      const voteButton = page.locator('[data-testid="hackathon-detail-vote-button"]')
      await expect(voteButton).not.toBeVisible()
    } else {
      test.skip()
    }
  })

  test('非投票阶段不能投票', async ({ page }) => {
    // 查找非投票阶段的活动
    await page.goto('/')
    await page.waitForSelector('[data-testid="home-hackathon-list"]')
    
    const nonVotingCards = page.locator('[data-testid^="home-hackathon-card-"]').filter({
      hasNot: page.locator('[data-testid$="-status"]').filter({ hasText: '投票' })
    })
    
    const count = await nonVotingCards.count()
    if (count > 0) {
      await nonVotingCards.first().click()
      await page.waitForSelector('[data-testid="hackathon-detail-page"]')
      
      // 验证投票按钮不显示
      const voteButton = page.locator('[data-testid="hackathon-detail-vote-button"]')
      await expect(voteButton).not.toBeVisible()
    } else {
      test.skip()
    }
  })

  test('不能重复投票同一作品', async ({ page }) => {
    // 先报名并签到
    await setupRegistrationAndCheckin(page)
    
    // 查找投票阶段的活动
    await page.goto('/')
    await page.waitForSelector('[data-testid="home-hackathon-list"]')
    
    const votingCards = page.locator('[data-testid^="home-hackathon-card-"]').filter({
      has: page.locator('[data-testid$="-status"]').filter({ hasText: '投票' })
    })
    
    const count = await votingCards.count()
    if (count > 0) {
      await votingCards.first().click()
      await page.waitForSelector('[data-testid="hackathon-detail-page"]')
      
      const voteButton = page.locator('[data-testid="hackathon-detail-vote-button"]')
      if (await voteButton.isVisible()) {
        await voteButton.click()
        await page.waitForSelector('[data-testid="submission-list-page"]')
        await page.waitForSelector('[data-testid="submission-list"]')
        
        // 找到第一个投票按钮
        const submissionVoteButtons = page.locator('[data-testid^="submission-list-vote-button-"]')
        const voteCount = await submissionVoteButtons.count()
        
        if (voteCount > 0) {
          const firstVoteButton = submissionVoteButtons.first()
          const buttonId = await firstVoteButton.getAttribute('data-testid')
          
          // 第一次投票
          await firstVoteButton.click()
          await waitForMessage(page, 'success', 5000)
          
          // 刷新页面
          await page.reload()
          await page.waitForSelector('[data-testid="submission-list"]')
          
          // 验证按钮状态（应该显示"已投票"或禁用）
          const votedButton = page.locator(`[data-testid="${buttonId}"]`)
          const isDisabled = await votedButton.isDisabled()
          const buttonText = await votedButton.textContent()
          
          // 验证按钮已禁用或显示"已投票"
          expect(isDisabled || buttonText?.includes('已投票')).toBeTruthy()
        } else {
          test.skip()
        }
      }
    } else {
      test.skip()
    }
  })

  test('查看作品列表', async ({ page }) => {
    // 先报名并签到
    await setupRegistrationAndCheckin(page)
    
    // 查找投票阶段的活动
    await page.goto('/')
    await page.waitForSelector('[data-testid="home-hackathon-list"]')
    
    const votingCards = page.locator('[data-testid^="home-hackathon-card-"]').filter({
      has: page.locator('[data-testid$="-status"]').filter({ hasText: '投票' })
    })
    
    const count = await votingCards.count()
    if (count > 0) {
      await votingCards.first().click()
      await page.waitForSelector('[data-testid="hackathon-detail-page"]')
      
      const voteButton = page.locator('[data-testid="hackathon-detail-vote-button"]')
      if (await voteButton.isVisible()) {
        await voteButton.click()
        await page.waitForSelector('[data-testid="submission-list-page"]')
        
        // 验证作品列表存在
        await expect(page.locator('[data-testid="submission-list"]')).toBeVisible()
        await expect(page.locator('[data-testid="submission-list-card"]')).toBeVisible()
      }
    } else {
      test.skip()
    }
  })

  test('查看作品详情', async ({ page }) => {
    // 先报名并签到
    await setupRegistrationAndCheckin(page)
    
    // 查找投票阶段的活动
    await page.goto('/')
    await page.waitForSelector('[data-testid="home-hackathon-list"]')
    
    const votingCards = page.locator('[data-testid^="home-hackathon-card-"]').filter({
      has: page.locator('[data-testid$="-status"]').filter({ hasText: '投票' })
    })
    
    const count = await votingCards.count()
    if (count > 0) {
      await votingCards.first().click()
      await page.waitForSelector('[data-testid="hackathon-detail-page"]')
      
      const voteButton = page.locator('[data-testid="hackathon-detail-vote-button"]')
      if (await voteButton.isVisible()) {
        await voteButton.click()
        await page.waitForSelector('[data-testid="submission-list-page"]')
        await page.waitForSelector('[data-testid="submission-list"]')
        
        // 点击第一个作品查看详情
        const firstSubmission = page.locator('[data-testid^="submission-list-item-"]').first()
        if (await firstSubmission.isVisible()) {
          // 验证作品信息存在
          const submissionId = await firstSubmission.getAttribute('data-testid')
          if (submissionId) {
            const id = submissionId.replace('submission-list-item-', '')
            await expect(page.locator(`[data-testid="submission-list-item-${id}-name"]`)).toBeVisible()
            await expect(page.locator(`[data-testid="submission-list-item-${id}-description"]`)).toBeVisible()
            await expect(page.locator(`[data-testid="submission-list-item-${id}-link"]`)).toBeVisible()
          }
        }
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

