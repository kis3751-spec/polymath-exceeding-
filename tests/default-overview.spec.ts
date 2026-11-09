import { test, expect } from '@playwright/test'
async function open(
  page: import('@playwright/test').Page,
  source = 'x^3-x=h',
  value = 0.5,
) {
  const p = source.includes('h') ? 'h' : 'p'
  await page.addInitScript(
    (project) =>
      localStorage.setItem(
        'polymath-studio-project-v1',
        JSON.stringify(project),
      ),
    {
      mode: 'nonlinear',
      title: 'Overview',
      description: '',
      source,
      parameters: [{ id: p, name: p, value, min: -1, max: 1, step: 0.05 }],
      sweepName: p,
    },
  )
  await page.goto('/')
  await page
    .getByRole('button', { name: 'Equation Solver 열기', exact: true })
    .click()
  await page
    .locator('.workspace-navigation')
    .getByRole('button', { name: '시뮬레이션', exact: true })
    .click()
  return page.getByRole('region', { name: '전체 해 탐색 병합 시뮬레이션' })
}
test('starts with a large merged view while the current parameter has one root', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1100 })
  const view = await open(page)
  await expect(view).toBeVisible()
  await expect(view.locator('.sc-curve')).toHaveCount(3)
  await expect(page.locator('.breadcrumbs')).not.toBeVisible()
  await expect(page.locator('.wordmark')).not.toBeVisible()
  const box = (await view.locator('.solution-chart svg').boundingBox())!
  expect(box.width).toBeGreaterThan(1200)
  expect(box.height).toBeGreaterThan(500)
  expect(box.y).toBeLessThan(450)
  const paths = await view
    .locator('.sc-curve')
    .evaluateAll((es) => es.map((e) => e.getAttribute('d')))
  await page.getByRole('slider', { name: 'h 슬라이더', exact: true }).fill('0')
  await expect(
    view.locator('.merged-current-card:not(.is-vanished)'),
  ).toHaveCount(3)
  expect(
    await view
      .locator('.sc-curve')
      .evaluateAll((es) => es.map((e) => e.getAttribute('d'))),
  ).toEqual(paths)
  await view.locator('.merged-current-wrap > summary').click()
  await view
    .getByRole('button', { name: '해 선택', exact: true })
    .nth(1)
    .click()
  await view.getByRole('button', { name: '리포트', exact: true }).nth(1).click()
  await expect(page.locator('.report-content')).toBeVisible()
  await page.screenshot({
    path: '/tmp/default-overview-report.png',
    fullPage: true,
  })
})
test('shows discovered curves even when the initial parameter has no real root', async ({
  page,
}) => {
  const view = await open(page, 'x^2=p', -1)
  await expect(view).toBeVisible()
  await expect(view.locator('.sc-curve')).toHaveCount(2)
  await page
    .getByRole('slider', { name: 'p 슬라이더', exact: true })
    .fill('0.5')
  await expect(
    view.locator('.merged-current-card:not(.is-vanished)'),
  ).toHaveCount(2)
})
test('keeps the initial merged view usable on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const view = await open(page)
  await expect(view).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false)
  await expect(view.locator('.solution-chart svg')).toBeVisible()
  await page.screenshot({
    path: '/tmp/default-overview-mobile.png',
    fullPage: true,
  })
})
