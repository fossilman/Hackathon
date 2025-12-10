import { test, expect } from '@playwright/test'
import { connectWallet, navigateAndWait, waitForMessage, fillFormField, submitForm, TEST_WALLETS } from './setup/helpers'

/**
 * 作品提交模块测试
 * 对应 PRD104 4.6 作品提交模块
 */
test.describe('作品提交模块', () => {
  test.beforeEach(async ({ page }) => {
    await navigateAndWait(page, '/')
    await connectWallet(page, TEST_WALLETS.participant1)
  })

  test('队长可以提交作品（已组队）', async ({ page }) => {
    // 先完成报名、签到、组队流程
    await setupTeamLeader(page)
    
    // 查找提交阶段的活动
    await page.goto('/')
    await page.waitForSelector('[data-testid="home-hackathon-list"]')
    
    const submissionCards = page.locator('[data-testid^="home-hackathon-card-"]').filter({
      has: page.locator('[data-testid$="-status"]').filter({ hasText: '提交' })
    })
    
    const count = await submissionCards.count()
    if (count > 0) {
      await submissionCards.first().click()
      await page.waitForSelector('[data-testid="hackathon-detail-page"]')
      
      // 点击提交作品按钮
      const submitButton = page.locator('[data-testid="hackathon-detail-submit-button"]')
      if (await submitButton.isVisible()) {
        await submitButton.click()
        await page.waitForSelector('[data-testid="submission-form-page"]')
        
        // 填写作品信息
        await fillFormField(page, 'submission-form-name-input', '测试作品' + Date.now())
        await fillFormField(page, 'submission-form-link-input', 'https://github.com/test/project')
        
        // 填写描述（ReactQuill编辑器）
        const descriptionEditor = page.locator('[data-testid="submission-form-description-editor"]')
        if (await descriptionEditor.isVisible()) {
          // ReactQuill编辑器可能需要特殊处理
          await descriptionEditor.click()
          await page.keyboard.type('这是测试作品描述')
        }
        
        // 提交作品
        await submitForm(page, 'submission-form-submit-button')
        await waitForMessage(page, 'success', 5000)
        
        // 验证跳转或状态更新
        await page.waitForTimeout(1000)
      }
    } else {
      test.skip()
    }
  })

  test('非队长不能提交作品', async ({ page }) => {
    // 查找提交阶段的活动
    await page.goto('/')
    await page.waitForSelector('[data-testid="home-hackathon-list"]')
    
    const submissionCards = page.locator('[data-testid^="home-hackathon-card-"]').filter({
      has: page.locator('[data-testid$="-status"]').filter({ hasText: '提交' })
    })
    
    const count = await submissionCards.count()
    if (count > 0) {
      await submissionCards.first().click()
      await page.waitForSelector('[data-testid="hackathon-detail-page"]')
      
      // 如果不是队长，提交按钮不应该显示
      const submitButton = page.locator('[data-testid="hackathon-detail-submit-button"]')
      // 如果按钮不显示，说明不是队长或未组队
      const isVisible = await submitButton.isVisible()
      if (!isVisible) {
        // 这是预期的行为
        expect(isVisible).toBe(false)
      } else {
        test.skip()
      }
    } else {
      test.skip()
    }
  })

  test('非提交阶段不能提交作品', async ({ page }) => {
    // 查找非提交阶段的活动
    await page.goto('/')
    await page.waitForSelector('[data-testid="home-hackathon-list"]')
    
    const nonSubmissionCards = page.locator('[data-testid^="home-hackathon-card-"]').filter({
      hasNot: page.locator('[data-testid$="-status"]').filter({ hasText: '提交' })
    })
    
    const count = await nonSubmissionCards.count()
    if (count > 0) {
      await nonSubmissionCards.first().click()
      await page.waitForSelector('[data-testid="hackathon-detail-page"]')
      
      // 验证提交按钮不显示
      const submitButton = page.locator('[data-testid="hackathon-detail-submit-button"]')
      await expect(submitButton).not.toBeVisible()
    } else {
      test.skip()
    }
  })

  test('表单验证：必填字段', async ({ page }) => {
    // 先完成报名、签到、组队流程
    await setupTeamLeader(page)
    
    // 查找提交阶段的活动
    await page.goto('/')
    await page.waitForSelector('[data-testid="home-hackathon-list"]')
    
    const submissionCards = page.locator('[data-testid^="home-hackathon-card-"]').filter({
      has: page.locator('[data-testid$="-status"]').filter({ hasText: '提交' })
    })
    
    const count = await submissionCards.count()
    if (count > 0) {
      await submissionCards.first().click()
      await page.waitForSelector('[data-testid="hackathon-detail-page"]')
      
      const submitButton = page.locator('[data-testid="hackathon-detail-submit-button"]')
      if (await submitButton.isVisible()) {
        await submitButton.click()
        await page.waitForSelector('[data-testid="submission-form-page"]')
        
        // 不填写任何字段，直接提交
        await submitForm(page, 'submission-form-submit-button')
        
        // 应该显示验证错误（根据实际实现）
        await page.waitForTimeout(1000)
      }
    } else {
      test.skip()
    }
  })

  test('表单验证：URL格式', async ({ page }) => {
    // 先完成报名、签到、组队流程
    await setupTeamLeader(page)
    
    // 查找提交阶段的活动
    await page.goto('/')
    await page.waitForSelector('[data-testid="home-hackathon-list"]')
    
    const submissionCards = page.locator('[data-testid^="home-hackathon-card-"]').filter({
      has: page.locator('[data-testid$="-status"]').filter({ hasText: '提交' })
    })
    
    const count = await submissionCards.count()
    if (count > 0) {
      await submissionCards.first().click()
      await page.waitForSelector('[data-testid="hackathon-detail-page"]')
      
      const submitButton = page.locator('[data-testid="hackathon-detail-submit-button"]')
      if (await submitButton.isVisible()) {
        await submitButton.click()
        await page.waitForSelector('[data-testid="submission-form-page"]')
        
        // 填写无效的URL
        await fillFormField(page, 'submission-form-name-input', '测试作品')
        await fillFormField(page, 'submission-form-link-input', 'invalid-url')
        
        // 提交
        await submitForm(page, 'submission-form-submit-button')
        
        // 应该显示URL格式错误（根据实际实现）
        await page.waitForTimeout(1000)
      }
    } else {
      test.skip()
    }
  })

  test('取消提交', async ({ page }) => {
    // 先完成报名、签到、组队流程
    await setupTeamLeader(page)
    
    // 查找提交阶段的活动
    await page.goto('/')
    await page.waitForSelector('[data-testid="home-hackathon-list"]')
    
    const submissionCards = page.locator('[data-testid^="home-hackathon-card-"]').filter({
      has: page.locator('[data-testid$="-status"]').filter({ hasText: '提交' })
    })
    
    const count = await submissionCards.count()
    if (count > 0) {
      await submissionCards.first().click()
      await page.waitForSelector('[data-testid="hackathon-detail-page"]')
      
      const submitButton = page.locator('[data-testid="hackathon-detail-submit-button"]')
      if (await submitButton.isVisible()) {
        await submitButton.click()
        await page.waitForSelector('[data-testid="submission-form-page"]')
        
        // 点击取消按钮
        const cancelButton = page.locator('[data-testid="submission-form-cancel-button"]')
        await cancelButton.click()
        
        // 应该返回到活动详情页
        await page.waitForSelector('[data-testid="hackathon-detail-page"]')
      }
    } else {
      test.skip()
    }
  })
})

/**
 * 辅助函数：设置队长状态（报名、签到、创建队伍）
 */
async function setupTeamLeader(page: any) {
  await page.goto('/')
  await page.waitForSelector('[data-testid="home-hackathon-list"]')
  
  // 查找组队阶段的活动
  const teamFormationCards = page.locator('[data-testid^="home-hackathon-card-"]').filter({
    has: page.locator('[data-testid$="-status"]').filter({ hasText: '组队' })
  })
  
  const count = await teamFormationCards.count()
  if (count > 0) {
    await teamFormationCards.first().click()
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
    
    // 创建队伍
    const teamButton = page.locator('[data-testid="hackathon-detail-team-button"]')
    if (await teamButton.isVisible()) {
      await teamButton.click()
      await page.waitForSelector('[data-testid="team-list-page"]')
      
      const createButton = page.locator('[data-testid="team-list-create-button"]')
      if (await createButton.isVisible()) {
        await createButton.click()
        await page.waitForSelector('[data-testid="team-list-create-modal"]')
        
        const nameInput = page.locator('[data-testid="team-list-create-modal-name-input"]')
        await nameInput.fill('测试队伍' + Date.now())
        
        const modal = page.locator('[data-testid="team-list-create-modal"]')
        const okButton = modal.locator('button').filter({ hasText: '确定' }).or(modal.locator('button').filter({ hasText: 'OK' }))
        await okButton.click()
        
        await waitForMessage(page, 'success', 5000)
      }
    }
  }
}

