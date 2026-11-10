import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

async function openModule(page: Page, name: string) {
  await page.goto('/')
  await page.getByRole('button', { name: `${name} 열기`, exact: true }).click()
}
async function scienceScreen(page: Page, name: string) {
  await page
    .locator('.scientific-navigation')
    .getByRole('button', { name: new RegExp(name) })
    .click()
  await expect(page.locator('.scientific-results')).toHaveAttribute(
    'aria-busy',
    'false',
  )
  await expect(page.getByRole('alert')).toHaveCount(0)
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear())
})

test('IVC gives Equation Solver the same compact workflow and readable output', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 950 })
  await page.goto('/')
  await expect(page).toHaveTitle('IVC — Interaction Visual Calculator')
  await expect(page.locator('.ivc-brand')).toContainText(
    'Interaction Visual Calculator',
  )
  await page
    .getByRole('button', { name: 'Equation Solver 열기', exact: true })
    .click()
  await expect(page.locator('.ivc-toolbar')).toContainText('Equation Solver')
  await expect(page.locator('.page-heading')).toHaveCount(0)
  await expect(
    page.getByText(/한 줄에 하나|한 줄에 방정식|한 줄씩 입력/),
  ).toHaveCount(0)
  await page
    .getByRole('textbox', { name: '방정식 입력', exact: true })
    .fill('2x+y=10; x-y=2')
  await page.getByRole('button', { name: 'Solve', exact: true }).click()
  await page
    .locator('.workspace-navigation')
    .getByRole('button', { name: 'Report', exact: true })
    .click()
  await expect(page.locator('.solution-value').first()).toContainText('4')
  await expect(page.locator('.solution-value').nth(1)).toContainText('2')
  await expect(page.locator('.quality-table')).toBeVisible()
  await expect(page.locator('.quality-table > tbody > tr')).toHaveCount(3)
  await expect(page.locator('.quality-table')).toContainText(
    'Absolute Sensitivity',
  )
  await page.screenshot({
    path: '/tmp/ivc-equation-report.png',
    fullPage: true,
  })
})

test('regression mode changes the actual command and exports finite-df coefficient confidence intervals', async ({
  page,
}) => {
  await openModule(page, 'Curve Fitting')
  const input = page.getByRole('textbox', {
    name: '과학 계산 모델 입력',
    exact: true,
  })
  await input.fill(
    '[\nx y\n0 1\n1 3.1\n2 4.9\n3 7.2\n4 8.8\n5 11.1\n]\npolyfit x y 1',
  )
  await page
    .getByRole('combobox', { name: 'Fit Type', exact: true })
    .selectOption('polynomial')
  await expect(input).toHaveValue(/\]\npolyfit x y 2$/)
  await page
    .getByRole('spinbutton', { name: 'Polynomial Degree', exact: true })
    .fill('3')
  await expect(input).toHaveValue(/polyfit x y 3$/)
  await page
    .getByRole('checkbox', { name: 'Through Origin', exact: true })
    .check()
  await expect(input).toHaveValue(/polyfit x y 3 origin$/)
  await page
    .getByRole('combobox', { name: 'Fit Type', exact: true })
    .selectOption('linear')
  await page
    .getByRole('checkbox', { name: 'Through Origin', exact: true })
    .uncheck()
  await page
    .getByRole('button', { name: 'Compute & Report', exact: true })
    .click()
  await expect(page.locator('.scientific-results')).toHaveAttribute(
    'aria-busy',
    'false',
  )
  const rows = page.locator('.regression-coefficients > tbody > tr')
  await expect(rows).toHaveCount(2)
  await expect(rows.first()).toContainText('±')
  await expect(rows.nth(1)).toContainText('±')
  expect(
    Number(await rows.first().locator('td').first().textContent()),
  ).toBeCloseTo(1, 1)
  expect(
    Number(await rows.nth(1).locator('td').first().textContent()),
  ).toBeCloseTo(2, 1)
  await expect(page.locator('.science-identity-line')).toBeVisible()
  const help = page.getByText('Estimate · 95% CI · Standard Error 읽는 법', {
    exact: true,
  })
  await help.click()
  await expect(page.locator('.regression-result')).toContainText(
    'Prediction Interval',
  )
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Save Report', exact: true }).click()
  const file = await pending
  const report = await readFile((await file.path())!, 'utf8')
  expect(report).toContain('| Coefficient | Estimate | 95% CI |')
  expect(report).toContain('Student-t')
  await page.screenshot({
    path: '/tmp/ivc-regression-report.png',
    fullPage: true,
  })
})

test('ODE explains methods, names both phase axes, and summarizes state ranges', async ({
  page,
}) => {
  await openModule(page, 'Differential Equations')
  await page
    .getByText('Integration Method 선택 가이드', { exact: true })
    .click()
  await expect(page.locator('.ivc-method-help')).toContainText('Implicit Euler')
  await expect(page.locator('.ivc-method-help')).toContainText('내부 시간 간격')
  await scienceScreen(page, 'Simulation')
  await page.getByRole('button', { name: 'Phase Plot', exact: true }).click()
  const ix = page.getByRole('combobox', { name: '위상 X 변수', exact: true })
  const iy = page.getByRole('combobox', { name: '위상 Y 변수', exact: true })
  const x = await ix.locator('option:checked').textContent()
  const y = await iy.locator('option:checked').textContent()
  await expect(page.locator('.scientific-chart-stage svg')).toHaveAttribute(
    'aria-label',
    `X: ${x}, Y: ${y}`,
  )
  await expect(page.locator('.science-axis-label').first()).toContainText(x!)
  await expect(page.locator('.science-axis-label').nth(1)).toContainText(y!)
  await scienceScreen(page, 'Report')
  await expect(page.locator('.ivc-state-table thead')).toContainText('Initial')
  await expect(page.locator('.ivc-state-table thead')).toContainText(
    'Final Value',
  )
  await expect(page.locator('.ivc-state-table tbody tr')).toHaveCount(3)
  await page.screenshot({ path: '/tmp/ivc-ode-report.png', fullPage: true })
})

test('integration shows the requested limits, signed value, and clipped filled area', async ({
  page,
}) => {
  await openModule(page, 'Discrete Integration')
  await page
    .getByRole('textbox', { name: '과학 계산 모델 입력', exact: true })
    .fill('[\nx y\n0 0\n1 1\n2 2\n3 3\n]\nintegrate y(x) 1 2.5 60 lin')
  await page
    .getByRole('button', { name: 'Compute & Simulate', exact: true })
    .click()
  await expect(page.locator('.scientific-results')).toHaveAttribute(
    'aria-busy',
    'false',
  )
  await expect(page.locator('.ivc-integral')).toHaveAttribute(
    'aria-label',
    'Integral from 1 to 2.5 of y with respect to x equals 2.625',
  )
  await expect(page.locator('.ivc-integral-sign sup')).toHaveText('2.5')
  await expect(page.locator('.ivc-integral-sign sub')).toHaveText('1')
  await expect(page.locator('.science-area-positive').first()).toBeVisible()
  await expect(page.locator('.science-area-limit')).toHaveCount(2)
  await page.screenshot({ path: '/tmp/ivc-integration.png', fullPage: true })
  await page
    .getByRole('button', { name: 'Cumulative Integral', exact: true })
    .click()
  await expect(page.locator('.science-area-positive')).toHaveCount(0)
  await scienceScreen(page, 'Report')
  await expect(page.locator('.ivc-integral')).toContainText('2.625')
  await expect(
    page.locator('.science-report > .ivc-metrics-table > tbody > tr'),
  ).toHaveCount(2)
})

test('each guide tab is independent, searchable and usable on a narrow screen', async ({
  page,
}) => {
  await openModule(page, 'Differential Equations')
  const trigger = page.getByRole('button', { name: 'User Guide', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'User Guide', exact: true })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('tab')).toHaveCount(9)
  await expect(
    dialog.getByRole('tab', { name: 'Differential Equations', exact: true }),
  ).toHaveAttribute('aria-selected', 'true')
  const content = dialog.getByRole('tabpanel')
  await expect(content).toContainText('RK45')
  await expect(content).not.toContainText('polyfit')
  await dialog
    .getByRole('tab', { name: 'Linear / Polynomial Regression', exact: true })
    .click()
  await expect(content).toContainText('polyfit x y')
  await expect(content).toContainText('95%')
  await expect(content).not.toContainText('Implicit Euler')
  await dialog
    .getByRole('tab', { name: 'Nonlinear Equations', exact: true })
    .click()
  await expect(content).toContainText('Absolute Sensitivity')
  await expect(content).toContainText('Sample')
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(dialog).toBeVisible()
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390)
  const box = await content.boundingBox()
  expect(box!.width).toBeGreaterThan(260)
  const clipping = await dialog
    .locator('.ivc-guide-reading')
    .evaluate((el) => ({
      content: el.scrollWidth - el.clientWidth,
      paragraphs: [...el.querySelectorAll('p')].some(
        (p) =>
          p.getBoundingClientRect().right >
          el.getBoundingClientRect().right + 1,
      ),
    }))
  expect(clipping.content).toBeLessThanOrEqual(1)
  expect(clipping.paragraphs).toBe(false)
  await page.screenshot({ path: '/tmp/ivc-guide-mobile.png', fullPage: true })
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
})
