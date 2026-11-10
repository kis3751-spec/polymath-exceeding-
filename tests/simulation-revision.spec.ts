import { test, expect, type Page } from '@playwright/test'

async function open(page: Page, manual = false) {
  await page.addInitScript(
    (project) =>
      localStorage.setItem(
        'polymath-studio-project-v1',
        JSON.stringify(project),
      ),
    {
      mode: 'nonlinear',
      nonlinearSearch: manual ? 'manual' : 'auto',
      title: 'Cubic tracking',
      description: '',
      source: `(x-1)(x+1)(x)=(-1/q)x+p${manual ? '\nx(0)=10' : ''}`,
      parameters: [
        {
          id: 'p',
          name: 'p',
          value: -0.5747126437,
          min: -10,
          max: 10,
          step: 0.3,
        },
        {
          id: 'q',
          name: 'q',
          value: -2.79757392,
          min: -10,
          max: 10,
          step: 0.3,
        },
      ],
      sweepName: 'p',
    },
  )
  await page.goto('/calculator')
  await page
    .getByRole('button', { name: 'Equation Solver 열기', exact: true })
    .click()
  await page
    .locator('.workspace-navigation')
    .getByRole('button', { name: 'Simulation', exact: true })
    .click()
}

test('merged samples share curve vertices; edits stay in place and axes change without deleting the set', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 800 })
  await open(page)
  const view = page.getByRole('region', {
    name: '전체 해 탐색 병합 시뮬레이션',
  })
  await expect(view).toHaveAttribute('aria-busy', 'false')
  await expect(view.locator('.sc-curve')).toHaveCount(3)
  const mismatch = await view.locator('.solution-chart').evaluate((el) => {
    const vertices = [...el.querySelectorAll('.sc-curve')].flatMap((p) =>
      [
        ...(p.getAttribute('d') ?? '').matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g),
      ].map((m) => [+m[1], +m[2]]),
    )
    return [...el.querySelectorAll('.sc-sample-dots circle')].filter((dot) => {
      const x = +dot.getAttribute('cx')!,
        y = +dot.getAttribute('cy')!
      return !vertices.some(([px, py]) => Math.hypot(px - x, py - y) < 0.002)
    }).length
  })
  expect(mismatch).toBe(0)
  await page.evaluate(() => window.scrollTo(0, 250))
  const before = await page.evaluate(() => window.scrollY)
  const box = (await view.locator('.solution-chart svg').boundingBox())!
  await page.mouse.click(
    box.x + box.width * 0.6,
    Math.max(120, box.y + box.height * 0.5),
  )
  await expect(view).toHaveAttribute('aria-busy', 'false')
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(before)
  const previousCurves = await view
    .locator('.sc-curve')
    .evaluateAll((es) => es.map((e) => e.getAttribute('d')))
  const selector = view.getByRole('combobox', {
    name: '전체 해 탐색 가로축 파라미터',
  })
  await selector.selectOption('q')
  await expect
    .poll(() =>
      view
        .locator('.sc-curve')
        .evaluateAll((es) => es.map((e) => e.getAttribute('d'))),
    )
    .not.toEqual(previousCurves)
  await expect(view).toHaveAttribute('aria-busy', 'false')
  await expect(selector).toHaveValue('q')
  await expect(
    view.getByRole('slider', { name: 'q 슬라이더', exact: true }),
  ).toBeVisible()
  await expect(view.locator('.solution-chart svg > title')).toHaveText(
    /q에 따른/,
  )
  expect(await view.locator('.sc-curve').count()).toBeGreaterThan(0)
  await expect(
    page.getByText('설정 범위에서 발견한 가지', { exact: false }),
  ).toHaveCount(0)
  await page.screenshot({
    path: '/tmp/polymath-revision-merged.png',
    fullPage: true,
  })
})

test('manual tracking retains its curve across branch loss and shows a readable explanation', async ({
  page,
}) => {
  await open(page, true)
  const view = page.getByRole('region', {
    name: '초기값으로 선택한 해 시뮬레이션',
  })
  await expect(view).toBeVisible()
  await expect(view).toHaveAttribute('aria-busy', 'false')
  const d = await view.locator('.sc-curve').first().getAttribute('d')
  expect(d).toContain('L')
  await page.getByRole('slider', { name: 'p 슬라이더', exact: true }).fill('-5')
  await expect(view).toHaveAttribute('aria-busy', 'false')
  await expect(view.locator('.simulation-panel-error')).toBeVisible()
  expect(await view.locator('.sc-curve').first().getAttribute('d')).toBe(d)
  await view
    .getByText('초기값과 끊긴 곡선은 어떻게 읽나요?', { exact: true })
    .click()
  await expect(
    view.getByText('다른 해의 부재를 뜻하지는 않습니다.', { exact: false }),
  ).toBeVisible()
  await page.getByRole('slider', { name: 'p 슬라이더', exact: true }).fill('4')
  await expect(view.locator('.simulation-panel-error')).toHaveCount(0)
  expect(await view.locator('.sc-curve').first().getAttribute('d')).toBe(d)
})

test('report metrics explain their practical meaning and distinguish condition norms', async ({
  page,
}) => {
  await open(page)
  await expect(page.locator('.default-overview .sc-curve')).toHaveCount(3)
  await page
    .locator('.workspace-navigation')
    .getByRole('button', { name: 'Report', exact: true })
    .click()
  const cards = page.locator('.quality-table > tbody > tr')
  await expect(cards).toHaveCount(3)
  await cards.nth(1).getByText('이 수치 읽는 법', { exact: true }).click()
  await expect(
    cards.nth(1).getByText('0.736896×라면', { exact: false }),
  ).toBeVisible()
  await page.getByText('조건수는 어떻게 해석하나요?', { exact: true }).click()
  await expect(
    page.getByText('단일 변수의 비특이 Jacobian 조건수는 항상 1', {
      exact: false,
    }),
  ).toBeVisible()
  await page
    .getByRole('combobox', { name: '조건수 계산 방식', exact: true })
    .selectOption('2')
  await expect(
    page.getByRole('combobox', { name: '조건수 계산 방식', exact: true }),
  ).toHaveValue('2')
})
