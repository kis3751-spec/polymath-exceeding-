import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
const nav = (page: Page, text: string) =>
  page
    .locator('.scientific-navigation')
    .getByRole('button', { name: new RegExp(text) })
async function open(page: Page, name: string) {
  await page.goto('/')
  await page.getByRole('button', { name: `${name} 열기`, exact: true }).click()
  await expect(page.locator('.scientific-workspace')).toBeVisible()
}
async function simulation(page: Page) {
  await nav(page, 'Simulation').click()
  await expect(page.locator('.scientific-results')).toHaveAttribute(
    'aria-busy',
    'false',
  )
  await expect(page.locator('.science-error')).toHaveCount(0)
}
async function report(page: Page) {
  await nav(page, 'Report').click()
  await expect(page.locator('.science-report .science-verdict')).toBeVisible()
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear())
})

test('ODE playback, phase switching, continuous parameter changes and CSV keep working', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await open(page, 'Differential Equations')
  await simulation(page)
  await expect(page.locator('.scientific-chart-stage path')).toHaveCount(3)
  await page
    .locator('.scientific-chart-stage svg')
    .hover({ position: { x: 180, y: 170 } })
  await page.getByRole('button', { name: 'Phase Plot', exact: true }).click()
  await expect(page.locator('.scientific-chart-stage path')).toHaveCount(1)
  await page
    .getByRole('button', { name: '시간 변화 재생', exact: true })
    .click()
  await expect
    .poll(() =>
      page
        .getByRole('slider', { name: 'ODE 시점 선택', exact: true })
        .inputValue(),
    )
    .not.toBe('0')
  await page.getByRole('button', { name: '재생 일시정지', exact: true }).click()
  const before = await page
    .locator('.scientific-chart-stage path')
    .first()
    .getAttribute('d')
  const slider = page.locator('.science-parameters input[type=range]').first()
  await slider.fill('0.6')
  await expect
    .poll(() =>
      page.locator('.scientific-chart-stage path').first().getAttribute('d'),
    )
    .not.toBe(before)
  await expect(page.locator('.scientific-results')).toHaveAttribute(
    'aria-busy',
    'false',
  )
  await page.screenshot({ path: '/tmp/ivc-ode.png', fullPage: true })
  await page.locator('.science-data>summary').click()
  await expect(page.locator('.science-table-scroll tbody tr')).toHaveCount(100)
  await page.getByRole('button', { name: '다음 100행', exact: true }).click()
  const d = page.waitForEvent('download')
  await page.getByRole('button', { name: 'CSV 저장', exact: true }).click()
  const file = await d
  const text = await readFile((await file.path())!, 'utf8')
  expect(text.split(/\r?\n/).length).toBeGreaterThan(200)
  await nav(page, 'Model & Data').click()
  await page
    .getByRole('textbox', { name: '과학 계산 모델 입력', exact: true })
    .fill('d(y)/d(t)=-y\ny(0)=1\nt|0:5')
  await page
    .getByRole('button', { name: 'Compute & Simulate', exact: true })
    .click()
  await expect(page.locator('.scientific-results')).toHaveAttribute(
    'aria-busy',
    'false',
  )
  await expect(
    page.getByRole('button', { name: 'Phase Plot', exact: true }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('img', { name: 'X: t, Y: State Value', exact: true }),
  ).toBeVisible()
  await report(page)
  await expect(page.locator('.science-verdict')).toContainText('Completed')
  await expect(page.locator('.ivc-state-table')).toContainText('Final Value')
  expect(errors).toEqual([])
})

test('linear polynomial and multilinear fitting produce usable reports and valid Markdown tables', async ({
  page,
}) => {
  await open(page, 'Curve Fitting')
  await simulation(page)
  await report(page)
  await expect(page.locator('.science-report')).toContainText('R²')
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Save Report', exact: true }).click()
  const file = await pending
  const text = await readFile((await file.path())!, 'utf8')
  expect(text).toContain('| 지표 | 값 | 해석 |\n| --- | --- | --- |\n|')
  await nav(page, 'Model & Data').click()
  await page
    .getByRole('combobox', { name: '과학 계산 예제', exact: true })
    .selectOption('1')
  await page
    .getByRole('button', { name: 'Compute & Simulate', exact: true })
    .click()
  await expect(page.locator('.scientific-results')).toHaveAttribute(
    'aria-busy',
    'false',
  )
  await report(page)
  await expect(page.locator('.regression-model')).toContainText('^2')
  await expect(page.locator('.regression-coefficients')).toContainText('95% CI')
  await page
    .getByRole('combobox', { name: 'Regression Module', exact: true })
    .selectOption('multilinear')
  await expect(page.locator('.scientific-header strong')).toHaveText(
    'Multilinear Regression',
  )
  await simulation(page)
  await report(page)
  await expect(page.locator('.science-verdict')).toContainText('Completed')
})

test('nonlinear fitting reports convergence, coefficients and separates data errors', async ({
  page,
}) => {
  await open(page, 'Nonlinear Fitting')
  await simulation(page)
  await expect(page.locator('.scientific-chart-stage path')).toHaveCount(1)
  await page.getByRole('button', { name: 'Error', exact: true }).click()
  await expect(page.locator('.science-chart-legend')).toContainText(
    '데이터 오차',
  )
  await report(page)
  await expect(page.locator('.science-verdict')).toContainText('Converged')
  const values = await page
    .locator('.regression-coefficients tbody tr')
    .evaluateAll((rows) =>
      Object.fromEntries(
        rows.map((r) => [
          r.querySelector('th')!.textContent,
          Number(r.querySelector('td')!.textContent),
        ]),
      ),
    )
  expect(values.Vmax).toBeCloseTo(2.4, 2)
  expect(values.Km).toBeCloseTo(0.7, 2)
})

test('integration has separate cumulative view, supports method selection and rejects extrapolation', async ({
  page,
}) => {
  await open(page, 'Discrete Integration')
  await simulation(page)
  await page
    .getByRole('button', { name: 'Cumulative Integral', exact: true })
    .click()
  await expect(page.locator('.science-chart-legend')).toContainText('누적')
  await report(page)
  await expect(page.locator('.science-report .ivc-integral')).toBeVisible()
  await nav(page, 'Model & Data').click()
  await page
    .getByRole('combobox', { name: '이산 적분 보간 방법', exact: true })
    .selectOption('ccs')
  await page
    .getByRole('button', { name: 'Compute & Simulate', exact: true })
    .click()
  await expect(page.locator('.scientific-results')).toHaveAttribute(
    'aria-busy',
    'false',
  )
  await nav(page, 'Model & Data').click()
  await page
    .getByRole('textbox', { name: '과학 계산 모델 입력', exact: true })
    .fill('[\nx y\n0 0\n1 1\n2 4\n]\nintegrate y(x) -1 2 100 lin')
  await page
    .getByRole('button', { name: 'Compute & Simulate', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText(/범위|외삽/)
  await page.locator('.science-data > summary').click()
  await expect(
    page.getByRole('button', { name: 'CSV 저장', exact: true }),
  ).toBeDisabled()
})

test('constrained optimization and LSQ fitting work from the same module with separate axes', async ({
  page,
}) => {
  await open(page, 'Optimum Finder')
  await page
    .getByRole('textbox', { name: '과학 계산 모델 입력', exact: true })
    .fill('min: (x-2)^2+(y-1)^2\nx+y=1\nx|0 -5 5\ny|0 -5 5')
  await page
    .getByRole('button', { name: 'Compute & Simulate', exact: true })
    .click()
  await expect(page.locator('.scientific-results')).toHaveAttribute(
    'aria-busy',
    'false',
  )
  await report(page)
  const values = await page
    .locator(
      '.science-report .ivc-output-table:not(.ivc-metrics-table) tbody tr',
    )
    .evaluateAll((rows) =>
      Object.fromEntries(
        rows.map((r) => [
          r.querySelector('th')!.textContent,
          Number(r.querySelector('.ivc-result-value')!.textContent),
        ]),
      ),
    )
  expect(values.x).toBeCloseTo(1, 4)
  expect(values.y).toBeCloseTo(0, 4)
  await page
    .getByRole('combobox', { name: 'Optimization Module', exact: true })
    .selectOption('lsq')
  await simulation(page)
  await expect(page.locator('.science-chart-legend')).not.toContainText(
    '목적함수',
  )
  await page.getByRole('button', { name: 'Convergence', exact: true }).click()
  await expect(page.locator('.science-chart-legend')).toContainText('목적함수')
  await report(page)
  await expect(page.locator('.science-report')).toContainText('RMSE')
})

test('mobile scientific workspace and usage guide fit the viewport, project import rejects inherited keys', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 820 })
  await open(page, 'Differential Equations')
  await simulation(page)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    ),
  ).toBe(false)
  await page.getByRole('button', { name: 'User Guide', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    ),
  ).toBe(false)
  await page
    .getByRole('button', { name: 'Close User Guide', exact: true })
    .click()
  await page.locator('.scientific-header input[type=file]').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        kind: 'scientific',
        module: 'constructor',
        source: '',
        parameters: {},
      }),
    ),
  })
  await expect(page.getByRole('alert')).toContainText('올바른')
})

test('equation report recalculates validated Gaussian bounds with the selected sigma', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'polymath-studio-project-v1',
      JSON.stringify({
        mode: 'nonlinear',
        nonlinearSearch: 'auto',
        title: 'Gaussian',
        description: '',
        source: 'x=0',
        parameters: [],
        sweepName: '',
        searchBounds: { min: -1, max: 1 },
        certifyRoots: true,
        inputNoiseSigma: 1,
      }),
    ),
  )
  await page.goto('/')
  await page
    .getByRole('button', { name: 'Equation Solver 열기', exact: true })
    .click()
  await page
    .locator('.workspace-navigation')
    .getByRole('button', { name: 'Report', exact: true })
    .click()
  const view = page.getByRole('region', {
    name: '탐색 검증과 입력 오차',
    exact: true,
  })
  await expect(view).toBeVisible()
  await view.locator('.gaussian-model > summary').click()
  const probability = view.locator('.probability-value')
  await expect(probability).toContainText('68.268')
  await view
    .getByRole('spinbutton', { name: '입력 오차 표준편차', exact: true })
    .fill('2')
  await view
    .getByRole('spinbutton', { name: '입력 오차 표준편차', exact: true })
    .press('Enter')
  await expect(probability).toContainText('38.292')
  await page.screenshot({
    path: '/tmp/ivc-probability-report.png',
    fullPage: true,
  })
})

test('verified absence still has an input-noise report and exports its certificate', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'polymath-studio-project-v1',
      JSON.stringify({
        mode: 'nonlinear',
        nonlinearSearch: 'auto',
        title: 'No root stability',
        description: '',
        source: 'log(x)-x=0',
        parameters: [],
        sweepName: '',
        searchBounds: { min: 0.1, max: 2 },
        certifyRoots: true,
        inputNoiseSigma: 1,
      }),
    ),
  )
  await page.goto('/')
  await page
    .getByRole('button', { name: 'Equation Solver 열기', exact: true })
    .click()
  await page
    .locator('.workspace-navigation')
    .getByRole('button', { name: 'Report', exact: true })
    .click()
  await expect(
    page.getByText('이 범위에는 실근이 없습니다.', { exact: true }),
  ).toBeVisible()
  const view = page.getByRole('region', {
    name: '탐색 검증과 입력 오차',
    exact: true,
  })
  await view.locator('.gaussian-model > summary').click()
  await expect(view.locator('.probability-value')).toContainText('83.179')
  const pending = page.waitForEvent('download')
  await page
    .getByRole('button', { name: 'Save Verification Report', exact: true })
    .click()
  const file = await pending
  const text = await readFile((await file.path())!, 'utf8')
  expect(text).toContain('83.179')
  expect(text).toContain('근 개수')
})
