import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
async function open(page: Page, name: string) {
  await page.goto('/calculator')
  await page.getByRole('button', { name: `${name} 열기`, exact: true }).click()
}
const scienceNav = (page: Page, name: string) =>
  page
    .locator('.scientific-navigation')
    .getByRole('button', { name: new RegExp(name) })
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear())
})

test('all scientific tools share New and explain their own settings', async ({
  page,
}) => {
  for (const [name, text] of [
    ['Differential Equations', '내부 적분 스텝'],
    ['Curve Fitting', 'Through Origin'],
    ['Nonlinear Fitting', 'Max Iterations'],
    ['Optimum Finder', 'Constraint Violation'],
    ['Discrete Integration', 'Interpolation Method'],
  ]) {
    await open(page, name)
    const header = page.locator('.scientific-header')
    for (const label of ['New', 'Import', 'Save Project', 'User Guide'])
      await expect(
        header.getByRole('button', { name: label, exact: true }),
      ).toBeVisible()
    const help = page
      .locator('aside details')
      .filter({ has: page.getByText('설정을 해석하는 방법', { exact: true }) })
    await help.locator('summary').click()
    await expect(help).toContainText(text)
    await header.getByRole('button', { name: 'New', exact: true }).click()
    await expect(
      page.getByRole('textbox', { name: '과학 계산 모델 입력', exact: true }),
    ).toHaveValue('')
    await page.getByRole('button', { name: 'Undo New', exact: true }).click()
    await expect(
      page.getByRole('textbox', { name: '과학 계산 모델 입력', exact: true }),
    ).not.toHaveValue('')
  }
})
test('ODE hides fixed parameters, saves ranges and transforms axes without changing exported data', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await open(page, 'Differential Equations')
  await page
    .getByRole('textbox', { name: '과학 계산 모델 입력', exact: true })
    .fill('d(y)/d(t)=-k*y\nk=0.5\ny(0)=1\nt|0:2')
  await page
    .getByRole('button', { name: 'Compute & Simulate', exact: true })
    .click()
  await expect(page.locator('.scientific-results')).toHaveAttribute(
    'aria-busy',
    'false',
  )
  const parameter = page.getByRole('spinbutton', {
    name: 'k 과학 파라미터 값',
    exact: true,
  })
  await parameter.fill('1')
  await expect(page.locator('.scientific-results')).toHaveAttribute(
    'aria-busy',
    'false',
  )
  await page
    .getByRole('button', { name: 'k Remove Parameter', exact: true })
    .click()
  await expect(parameter).toHaveCount(0)
  await page.getByRole('button', { name: 'Restore k (1)', exact: true }).click()
  await expect(parameter).toHaveValue('1')
  await page.locator('.science-parameters summary').click()
  await page
    .getByRole('spinbutton', { name: 'k Sample Spacing', exact: true })
    .fill('0.25')
  await page.getByRole('button', { name: '+ Step', exact: true }).click()
  await expect(parameter).toHaveValue('1.25')
  await expect(page.locator('.scientific-results')).toHaveAttribute(
    'aria-busy',
    'false',
  )
  await page.locator('.axis-transforms summary').click()
  await page
    .getByRole('textbox', { name: 'X Expression', exact: true })
    .fill('log(x)')
  await page
    .getByRole('textbox', { name: 'Y Expression', exact: true })
    .fill('2*y+1')
  await page.getByRole('button', { name: 'Apply Axes', exact: true }).click()
  await expect(page.locator('.science-axis-label').first()).toContainText(
    'log(x)',
  )
  await expect(page.locator('.scientific-chart')).toContainText('정의역 밖 1개')
  await expect(page.locator('.science-visualization')).not.toHaveClass(
    /is-stale/,
  )
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Save Project', exact: true }).click()
  const project = JSON.parse(
    await readFile((await (await download).path())!, 'utf8'),
  )
  expect(project.parameters.k).toBe(1.25)
  expect(project.ranges.k.step).toBe(0.25)
  expect(Object.values(project.axisTransforms)).toContainEqual({
    x: 'log(x)',
    y: '2*y+1',
  })
  await page.locator('.science-data>summary').click()
  const data = page.waitForEvent('download')
  await page.getByRole('button', { name: 'CSV 저장', exact: true }).click()
  const csv = await readFile((await (await data).path())!, 'utf8')
  expect(csv).toMatch(/0,1/)
  await page
    .locator('.scientific-header')
    .getByRole('button', { name: 'Home', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Differential Equations 열기', exact: true })
    .click()
  await scienceNav(page, 'Simulation').click()
  await expect(parameter).toHaveValue('1.25')
  await expect(page.locator('.science-axis-label').first()).toContainText(
    'log(x)',
  )
  await page.setViewportSize({ width: 390, height: 844 })
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390)
  await page.screenshot({ path: '/tmp/ivc-axis-mobile.png', fullPage: true })
  expect(errors).toEqual([])
})
test('Equation Solver auto parameters retain fixed values after removal and transformed clicks use original coordinates', async ({
  page,
}) => {
  await open(page, 'Equation Solver')
  const editor = page.getByRole('textbox', { name: '방정식 입력', exact: true })
  await editor.fill('k=4\nx+k=10')
  await expect(page.locator('.parameter-list')).toContainText('k')
  await page
    .locator('.workspace-navigation')
    .getByRole('button', { name: 'Simulation', exact: true })
    .click()
  const controls = page.locator('.results-parameters').first()
  await controls.locator('summary').click()
  await controls
    .getByRole('button', { name: 'k Remove Parameter', exact: true })
    .click()
  await expect(
    controls.getByRole('button', { name: /Restore k/ }),
  ).toBeVisible()
  await controls.getByRole('button', { name: /Restore k/ }).click()
  const axes = page.locator('.axis-transforms').first()
  await axes.locator('summary').click()
  await axes
    .getByRole('textbox', { name: 'X Expression', exact: true })
    .fill('x^2')
  await axes
    .getByRole('textbox', { name: 'Y Expression', exact: true })
    .fill('2*y+1')
  await axes.getByRole('button', { name: 'Apply Axes', exact: true }).click()
  await expect(page.locator('.science-axis-label').first()).toContainText('x^2')
  await page
    .locator('.scientific-chart-stage svg')
    .first()
    .click({ position: { x: 240, y: 150 } })
  await expect(page.locator('.results-parameters').first()).toContainText('k')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Save Project', exact: true }).click()
  const project = JSON.parse(
    await readFile((await (await download).path())!, 'utf8'),
  )
  const k = project.parameters.find((p: { name: string }) => p.name === 'k')
  expect(k.value).toBeGreaterThanOrEqual(k.min)
  expect(k.value).toBeLessThanOrEqual(k.max)
  expect(k.hidden).toBe(false)
  expect(project.source).toBe('k=4\nx+k=10')
})
