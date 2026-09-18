import { expect, test, type Page } from '@playwright/test'

async function enterQuiz(page: Page) {
  await page.goto('/#/')
  await page.getByRole('button', { name: /开始人格测试/ }).click()
  await page.getByRole('button', { name: /开始人格测试/ }).click()
  await expect(page).toHaveURL(/#\/test$/)
}

async function answerCurrent(page: Page) {
  const checks = page.getByRole('checkbox')
  if (await checks.count()) {
    await checks.first().click()
    await page.getByRole('button', { name: /确认这/ }).click()
  } else {
    const radios = page.getByRole('radio')
    if (!(await radios.count())) {
      await page.waitForTimeout(350)
      return
    }
    await radios.first().click()
    await page.waitForTimeout(320)
  }
}

async function finishAdaptiveQuiz(page: Page) {
  let answered = 0
  while ((await page.url()).includes('#/test') && answered < 44) {
    await answerCurrent(page)
    answered += 1
  }
  expect(answered).toBeGreaterThanOrEqual(24)
  expect(answered).toBeLessThanOrEqual(44)
  await expect(page).toHaveURL(/#\/(analyze|reveal)$/)
  await page.waitForURL(/#\/reveal$/, { timeout: 5_000 })
  return answered
}

test('runs the adaptive test, reveal, result, and refresh restore', async ({ page }) => {
  await enterQuiz(page)
  await expect(page.getByText('G01', { exact: true })).toBeVisible()
  await answerCurrent(page)
  await expect(page.getByText('G02', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '暂存并返回' }).click()
  await page.getByRole('button', { name: /继续人格测试/ }).click()
  await finishAdaptiveQuiz(page)
  await expect(page.getByText(/咕咕嘎嘎 · 人格揭晓/)).toBeVisible()
  for (let index = 0; index < 30; index += 1) {
    const openReport = page.getByRole('button', { name: /打开完整人格档案/ })
    if (await openReport.isVisible()) break
    const continueReveal = page.getByRole('button', { name: /收下，继续揭晓|收下并查看全部人格/ })
    if (!(await continueReveal.isVisible())) await page.getByRole('button', { name: /点击翻开人格卡/ }).click()
    await continueReveal.click({ timeout: 3_000 })
    await page.waitForTimeout(800)
  }
  await page.getByRole('button', { name: /打开完整人格档案/ }).click()
  await expect(page.getByRole('heading', { name: /你的人格档案/ })).toBeVisible()
  await expect(page.locator('.resultCards .identityCard')).not.toHaveCount(0)
  await expect(page.locator('.primaryReportImage > span')).toHaveCount(0)
  const poster = page.locator('.sharePoster')
  await expect(poster).not.toContainText(/F\d{2}/)
  await expect(poster.locator('.posterCopy > p')).not.toBeEmpty()
  await expect(poster.locator('.posterBehaviors > span')).toHaveCount(3)
  expect(await poster.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return { width: rect.width, height: rect.height }
  })).toEqual({ width: 1200, height: 1600 })
  expect(await poster.locator('.posterImage img').evaluate((element) => getComputedStyle(element).objectFit)).toBe('contain')
  await page.reload()
  await expect(page.getByRole('heading', { name: /你的人格档案/ })).toBeVisible()
})

test('keeps NONE exclusive in multiselect and supports backtracking', async ({ page }) => {
  await enterQuiz(page)
  const checks = page.getByRole('checkbox')
  await checks.nth(0).click()
  await checks.nth(1).click()
  await checks.last().click()
  await expect(checks.nth(0)).toHaveAttribute('aria-checked', 'false')
  await expect(checks.last()).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('button', { name: /确认这 1 项/ }).click()
  await expect(page.getByText('G02', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /上一题/ }).click()
  await expect(page.getByText('G01', { exact: true })).toBeVisible()
})

test('shows 73 identity archives and opens details', async ({ page }) => {
  await page.goto('/#/identities')
  await expect(page.locator('.atlasIdentity')).toHaveCount(73)
  await expect(page.locator('.atlasIdentity').first()).toContainText('本命真爱党')
  await expect(page.locator('.atlasIdentity').first().locator('div > span')).toHaveCount(0)
  await page.locator('.atlasIdentity').first().click()
  await expect(page.getByRole('heading', { name: '本命真爱党' })).toBeVisible()
  await expect(page.locator('.detailImage img')).toBeVisible()
  await expect(page.locator('.detailImage > span')).toHaveCount(0)
  await page.getByRole('button', { name: /预览抽卡揭晓/ }).click()
  await expect(page.locator('.previewModal .identityCard')).toBeVisible()
})

test('explains the result model in player-facing language', async ({ page }) => {
  await page.goto('/#/principles')
  await expect(page.locator('.domainGrid > article')).toHaveCount(4)
  await expect(page.locator('.engineFlow > article')).toHaveCount(4)
  await expect(page.locator('body')).not.toContainText(/领域掩码|判定公式|ACTIVE|Family 去重/)
})

for (const width of [1440, 1024, 768, 375]) {
  test(`has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/#/identities')
    const sizes = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }))
    expect(sizes.scroll).toBe(sizes.client)
  })
}
