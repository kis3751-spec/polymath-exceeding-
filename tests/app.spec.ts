import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

async function plotLocation(
  svg: import('@playwright/test').Locator,
  xRatio: number,
  yRatio = 0.5,
) {
  return svg.evaluate(
    (element: SVGSVGElement, ratio) => {
      const point = element.createSVGPoint()
      const view = element.viewBox.baseVal
      point.x = 51 + (view.width - 51 - 20) * ratio.x
      point.y = 24 + (view.height - 24 - 37) * ratio.y
      const matrix = element.getScreenCTM()
      if (!matrix) throw new Error('Chart screen transform unavailable')
      const screen = point.matrixTransform(matrix)
      return { x: screen.x, y: screen.y }
    },
    { x: xRatio, y: yRatio },
  )
}

const runtimeErrors = new WeakMap<Page, string[]>()
test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  runtimeErrors.set(page, errors)
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
})
test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page), 'browser runtime and console errors').toEqual(
    [],
  )
})

type WorkspaceScreen = '수식·파라미터' | '시뮬레이션' | '해석 리포트'
async function navigate(page: Page, screen: WorkspaceScreen) {
  const card = page.getByRole('button', {
    name: 'Equation Solver 열기',
    exact: true,
  })
  if (await card.isVisible()) await card.click()
  const button = page
    .locator('.workspace-navigation')
    .getByRole('button', { name: screen, exact: true })
  if ((await button.getAttribute('aria-current')) !== 'page')
    await button.click()
}
async function showSimulation(page: Page) {
  await navigate(page, '시뮬레이션')
  const roots = page.locator('.solutions-section')
  if (await roots.count()) {
    if (!(await roots.evaluate((element) => element.hasAttribute('open'))))
      await roots.locator('summary').click()
  }
  const data = page.locator(
    '.selected-simulation-workspace .simulation-panel-data',
  )
  if (await data.count()) {
    if (!(await data.evaluate((element) => element.hasAttribute('open'))))
      await data.locator('summary').click()
  }
}
async function showValues(page: Page) {
  const mode = page.locator(
    '.nonlinear-settings select[aria-label="해 탐색 방식"]',
  )
  const auto = (await mode.count()) && (await mode.inputValue()) === 'auto'
  await navigate(page, auto ? '해석 리포트' : '시뮬레이션')
}
function csvButton(page: Page) {
  return page.getByRole('button', { name: /^CSV$| CSV 저장$/ })
}
async function ready(page: Page) {
  await showSimulation(page)
  await expect(page.locator('.engine-status')).toHaveText(
    /WebAssembly|JavaScript/,
  )
}
async function openExample(page: Page, name: string) {
  await navigate(page, '수식·파라미터')
  await page.getByRole('button', { name: '예제 불러오기' }).click()
  await page
    .locator('.examples-menu')
    .getByRole('button', { name: new RegExp(name) })
    .click()
  await showSimulation(page)
  await expect(page.locator('.engine-status')).toHaveText(
    /WebAssembly|JavaScript/,
  )
}

async function setSearchMode(page: Page, mode: 'auto' | 'manual') {
  await navigate(page, '수식·파라미터')
  const settings = page.locator('.nonlinear-settings')
  if (!(await settings.evaluate((element) => element.hasAttribute('open')))) {
    await settings.getByText('고급 탐색 설정', { exact: true }).click()
  }
  await page.getByRole('combobox', { name: '해 탐색 방식' }).selectOption(mode)
}

async function selectSolution(page: Page, values: string[]) {
  await showSimulation(page)
  const matchingIndex = async () =>
    (await page.locator('.solution-choice strong').allTextContents()).findIndex(
      (text) => {
        const actual = text
          .split(' · ')
          .map((part) => Number(part.split('=')[1]))
        return (
          actual.length === values.length &&
          actual.every(
            (value, i) => Math.abs(value - Number(values[i])) < 0.000001,
          )
        )
      },
    )
  await expect.poll(matchingIndex).toBeGreaterThanOrEqual(0)
  const index = await matchingIndex()
  const button = page.locator('.solution-choice').nth(index)
  await expect(button).toBeEnabled()
  await button.click()
  await expect(button).toHaveAttribute('aria-pressed', 'true')
  await showValues(page)
  await expect(page.locator('.solution-value strong')).toHaveText(values)
  await expect(page.locator('.engine-status')).toHaveText(
    /WebAssembly|JavaScript/,
  )
  return index
}

async function conditionValue(page: Page) {
  return Number(
    (await page.locator('.report-content .condition-value').innerText())
      .replace(/,/g, '')
      .trim(),
  )
}

const STORAGE_KEY = 'polymath-studio-project-v1'
const MIXING_PROJECT = {
  title: '두 유체의 혼합 공정',
  description: '선형 회귀 검증용 물질수지 모델',
  source: '# 전체 유량과 성분 물질수지\nx + y = F\nc_A*x + c_B*y = c_T*F',
  parameters: [
    { id: 'F', name: 'F', value: 100, min: 20, max: 200, step: 1 },
    { id: 'c_A', name: 'c_A', value: 0.2, min: 0, max: 1, step: 0.01 },
    { id: 'c_B', name: 'c_B', value: 0.8, min: 0, max: 1, step: 0.01 },
    { id: 'c_T', name: 'c_T', value: 0.5, min: 0.2, max: 0.8, step: 0.01 },
  ],
  sweepName: 'c_T',
  conditionNorm: 'infinity',
}

async function importProject(page: Page, project: object) {
  await page.locator('input[type=file]').setInputFiles({
    name: 'test-project.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(project)),
  })
}

test.describe('Linear regressions with a saved legacy model', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(
      ({ key, project }) => {
        if (!localStorage.getItem(key)) {
          localStorage.setItem(key, JSON.stringify(project))
        }
      },
      { key: STORAGE_KEY, project: MIXING_PROJECT },
    )
    await page.goto('/')
    await navigate(page, '수식·파라미터')
    await ready(page)
  })

  test('WebAssembly solves mixing model and parameter slider updates live', async ({
    page,
  }) => {
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText([
      '50',
      '50',
    ])
    await showSimulation(page)
    await page.getByRole('slider', { name: 'c_T 슬라이더' }).fill('0.6')
    await showValues(page)
    await expect(page.locator('.solution-value strong').nth(0)).toHaveText(
      '33.33333',
    )
    await showValues(page)
    await expect(page.locator('.solution-value strong').nth(1)).toHaveText(
      '66.66667',
    )
    await ready(page)
  })

  test('nonlinear models show errors and corrected equations recover', async ({
    page,
  }) => {
    await navigate(page, '수식·파라미터')
    await page
      .getByRole('textbox', { name: '방정식 입력' })
      .fill('x + y = 10\nx*y = 20')
    await showSimulation(page)
    await expect(page.getByRole('alert')).toContainText(
      '미지수끼리의 곱은 선형식이 아닙니다',
    )
    await navigate(page, '수식·파라미터')
    await page
      .getByRole('textbox', { name: '방정식 입력' })
      .fill('x + y = 10\nx - y = 2')
    await ready(page)
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText(['6', '4'])
  })

  test('equation editing solves standard shorthand and three-variable systems', async ({
    page,
  }) => {
    await importProject(page, {
      title: '직접 입력한 연립방정식',
      description: '',
      source: '2x + 3y = 12\n4x = 5 + y',
      parameters: [],
      sweepName: '',
    })
    await ready(page)
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText([
      '1.928571',
      '2.714286',
    ])
    await navigate(page, '수식·파라미터')
    await expect(
      page.getByRole('button', { name: '예제 불러오기' }),
    ).toHaveCount(0)
    await navigate(page, '수식·파라미터')
    await page
      .getByRole('textbox', { name: '방정식 입력' })
      .fill('x + y + z = 12\n2x - y + z = 7\nx + 2y - z = 6')
    await ready(page)
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText([
      '3',
      '4',
      '5',
    ])
  })

  test('graph exploration and legend are connected to data table', async ({
    page,
  }) => {
    const chart = page.getByRole('img', { name: /c_T에 따른 선형 방정식/ })
    await showSimulation(page)
    await chart.focus()
    await showSimulation(page)
    await chart.press('Home')
    await showSimulation(page)
    await expect(
      page.locator(
        ':is(.sweep-table,.simulation-panel-data table) tr[aria-selected=true] td',
      ),
    ).toHaveText(['0.2', '100', '0'])
    await showSimulation(page)
    await chart.press('ArrowRight')
    await showSimulation(page)
    await expect(
      page
        .locator(
          ':is(.sweep-table,.simulation-panel-data table) tr[aria-selected=true] td',
        )
        .first(),
    ).toHaveText('0.21')
    await showSimulation(page)
    await chart.press('End')
    await showSimulation(page)
    await expect(
      page.locator(
        ':is(.sweep-table,.simulation-panel-data table) tr[aria-selected=true] td',
      ),
    ).toHaveText(['0.8', '0', '100'])
    const tablePoint = page.getByRole('row', {
      name: 'c_T 0.35 탐색',
      exact: true,
    })
    await showSimulation(page)
    await tablePoint.hover()
    await showSimulation(page)
    await expect(tablePoint).toHaveAttribute('aria-selected', 'true')
    await showSimulation(page)
    await expect(page.locator('.sc-tooltip-heading strong')).toHaveText('0.35')
    await showSimulation(page)
    await tablePoint.focus()
    await showSimulation(page)
    await tablePoint.press('ArrowDown')
    await showSimulation(page)
    await expect(page.locator('.sc-tooltip-heading strong')).toHaveText('0.36')
    await showSimulation(page)
    await page.getByRole('button', { name: 'x 곡선 표시' }).click()
    await showSimulation(page)
    await expect(
      page.getByRole('button', { name: 'x 곡선 표시' }),
    ).toHaveAttribute('aria-pressed', 'false')
    await showSimulation(page)
    await expect(page.locator('.sc-curve')).toHaveCount(1)
  })

  test('advanced matrix report and exports reflect current results', async ({
    page,
  }) => {
    await expect(page.getByRole('button', { name: '행렬 보기' })).toHaveCount(0)
    await expect(page.locator('.matrix-equation')).toHaveCount(0)
    const csv = page.waitForEvent('download')
    await showSimulation(page)
    await csvButton(page).click()
    const csvDownload = await csv
    expect(csvDownload.suggestedFilename()).toBe('polymath-data.csv')
    const csvText = await readFile((await csvDownload.path())!, 'utf8')
    expect(csvText.replace(/^\uFEFF/, '').split('\n')[0]).toBe('c_T,x,y')
    expect(csvText.trim().split('\n')).toHaveLength(62)
    await page
      .locator('.workspace-navigation')
      .getByRole('button', { name: '해석 리포트', exact: true })
      .click()
    await navigate(page, '해석 리포트')
    await expect(page.locator('.report-metrics')).toContainText(
      '최대 절대 잔차',
    )
    await expect(page.locator('.matrix-equation')).not.toBeVisible()
    await navigate(page, '해석 리포트')
    await page.getByText('행렬·수치 검증 자세히 보기', { exact: true }).click()
    await expect(page.locator('.matrix-equation')).toBeVisible()
    await expect(page.locator('.matrix-equation')).toContainText('100')
    const report = page.waitForEvent('download')
    await navigate(page, '해석 리포트')
    await page.getByRole('button', { name: '리포트 저장', exact: true }).click()
    const reportDownload = await report
    expect(reportDownload.suggestedFilename()).toBe('polymath-report.md')
    const reportText = await readFile((await reportDownload.path())!, 'utf8')
    expect(reportText).toContain('| x | 50.0000000000 |')
    expect(reportText).toContain('계산 엔진: wasm')
    const saved = page.waitForEvent('download')
    await page.getByRole('button', { name: '프로젝트 저장' }).click()
    const projectDownload = await saved
    expect(projectDownload.suggestedFilename()).toBe('polymath-project.json')
    const projectFile = JSON.parse(
      await readFile((await projectDownload.path())!, 'utf8'),
    )
    expect(
      projectFile.parameters.find((p: { name: string }) => p.name === 'c_T')
        .value,
    ).toBe(0.5)
  })

  test('local project persists on reload and guide opens accessibly', async ({
    page,
  }) => {
    await navigate(page, '수식·파라미터')
    await page
      .getByRole('textbox', { name: '모델 이름' })
      .fill('브라우저 저장 테스트')
    await showSimulation(page)
    await page.getByRole('slider', { name: 'F 슬라이더' }).fill('120')
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText([
      '60',
      '60',
    ])
    await page.reload()
    await ready(page)
    await navigate(page, '수식·파라미터')
    await expect(page.getByRole('textbox', { name: '모델 이름' })).toHaveValue(
      '브라우저 저장 테스트',
    )
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText([
      '60',
      '60',
    ])
    await page
      .getByRole('button', { name: '사용 가이드', exact: true })
      .first()
      .click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('desktop and mobile render without horizontal overflow', async ({
    page,
  }) => {
    await page.screenshot({ path: '/tmp/polymath-desktop.png', fullPage: true })
    const desktopOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
    expect(desktopOverflow).toBe(false)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({ path: '/tmp/polymath-mobile.png', fullPage: true })
    const mobileOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
    expect(mobileOverflow).toBe(false)
    await navigate(page, '수식·파라미터')
    await expect(page.getByRole('button', { name: '모델 풀기' })).toBeVisible()
  })

  test('project import restores a custom model and rejects malformed data', async ({
    page,
  }) => {
    const input = page.locator('input[type=file]')
    await input.setInputFiles({
      name: 'custom.json',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({
          title: '사용자 모델',
          description: '가져온 모델',
          source: '3x = F',
          parameters: [
            { id: 'F', name: 'F', value: 12, min: 0, max: 24, step: 1 },
          ],
          sweepName: 'F',
        }),
      ),
    })
    await navigate(page, '수식·파라미터')
    await expect(page.getByRole('textbox', { name: '모델 이름' })).toHaveValue(
      '사용자 모델',
    )
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText(['4'])
    await showSimulation(page)
    await page.getByRole('slider', { name: 'F 슬라이더' }).fill('6')
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText(['2'])
    await input.setInputFiles({
      name: 'bad.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"title": false}'),
    })
    await expect(page.locator('.toast[role="status"]')).toContainText(
      '올바른 Polymath 프로젝트 JSON 파일이 아닙니다',
    )
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText(['2'])
  })

  test('parameters can be added, bounded, adjusted and deleted', async ({
    page,
  }) => {
    await importProject(page, {
      title: '파라미터 추가 확인',
      description: '',
      source: 'x = 5',
      parameters: [],
      sweepName: '',
    })
    await ready(page)
    await navigate(page, '수식·파라미터')
    await page
      .getByRole('button', { name: '파라미터 추가', exact: true })
      .click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('이름', { exact: true }).fill('k')
    await dialog.getByLabel('현재 값', { exact: true }).fill('2')
    await dialog
      .getByRole('button', { name: '파라미터 추가', exact: true })
      .click()
    await expect(dialog).not.toBeVisible()
    await navigate(page, '수식·파라미터')
    await page.getByRole('textbox', { name: '방정식 입력' }).fill('k*x = 10')
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText(['5'])
    await navigate(page, '수식·파라미터')
    await page
      .getByRole('button', { name: '파라미터 범위 설정', exact: true })
      .click()
    await navigate(page, '수식·파라미터')
    await page
      .getByRole('spinbutton', { name: 'k 최솟값', exact: true })
      .fill('1')
    await navigate(page, '수식·파라미터')
    await page
      .getByRole('spinbutton', { name: 'k 최댓값', exact: true })
      .fill('4')
    await navigate(page, '수식·파라미터')
    await page
      .getByRole('spinbutton', { name: 'k 간격', exact: true })
      .fill('0.5')
    await navigate(page, '수식·파라미터')
    await page.getByRole('button', { name: 'k 범위 적용', exact: true }).click()
    const slider = page.getByRole('slider', { name: 'k 슬라이더', exact: true })
    await showSimulation(page)
    await expect(slider).toHaveAttribute('min', '1')
    await showSimulation(page)
    await expect(slider).toHaveAttribute('step', '0.5')
    await showSimulation(page)
    await slider.fill('4')
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText(['2.5'])
    await navigate(page, '수식·파라미터')
    await page.getByRole('button', { name: 'k 삭제', exact: true }).click()
    await showSimulation(page)
    await expect(slider).not.toBeVisible()
    await showSimulation(page)
    await expect(page.getByRole('alert')).toContainText(
      '미지수 2개가 일치해야 합니다',
    )
  })

  test('dependent and inconsistent systems provide distinct diagnostics', async ({
    page,
  }) => {
    const editor = page.getByRole('textbox', { name: '방정식 입력' })
    await navigate(page, '수식·파라미터')
    await editor.fill('x + y = 4\n2x + 2y = 8')
    await showSimulation(page)
    await expect(page.getByRole('alert')).toContainText(
      '독립적인 수식이 부족하거나',
    )
    await navigate(page, '수식·파라미터')
    await editor.fill('x + y = 4\n2x + 2y = 9')
    await showSimulation(page)
    await expect(page.getByRole('alert')).toContainText(
      '서로 모순되는 수식으로 해가 없습니다',
    )
    await navigate(page, '수식·파라미터')
    await editor.fill('x + y = 4\nx - y = 2')
    await ready(page)
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText(['3', '1'])
  })

  test('dataset uses the configured interval while the graph keeps its own resolution', async ({
    page,
  }) => {
    const rows = page.locator(
      ':is(.sweep-table,.simulation-panel-data table) tbody tr',
    )
    await showSimulation(page)
    await expect(rows).toHaveCount(61)
    await showSimulation(page)
    await expect(rows.nth(0).locator('td')).toHaveText(['0.2', '100', '0'])
    await showSimulation(page)
    await expect(rows.nth(1).locator('td').first()).toHaveText('0.21')
    await showSimulation(page)
    await expect(rows.nth(2).locator('td').first()).toHaveText('0.22')
    await showSimulation(page)
    await expect(rows.last().locator('td')).toHaveText(['0.8', '0', '100'])
    await showSimulation(page)
    await expect(page.locator('.sample-count')).toHaveCount(0)
    await navigate(page, '수식·파라미터')
    await page
      .getByRole('button', { name: '파라미터 범위 설정', exact: true })
      .click()
    await navigate(page, '수식·파라미터')
    await page
      .getByRole('spinbutton', { name: 'c_T 간격', exact: true })
      .fill('0.05')
    await navigate(page, '수식·파라미터')
    await page
      .getByRole('button', { name: 'c_T 범위 적용', exact: true })
      .click()
    await showSimulation(page)
    await expect(rows).toHaveCount(13)
    await showSimulation(page)
    await expect(rows.nth(1).locator('td').first()).toHaveText('0.25')
    await showSimulation(page)
    await expect(rows.last().locator('td').first()).toHaveText('0.8')
    await ready(page)
    await showSimulation(page)
    await expect(page.locator('.sample-count')).toHaveCount(0)
    const download = page.waitForEvent('download')
    await showSimulation(page)
    await csvButton(page).click()
    const file = await download
    const csv = await readFile((await file.path())!, 'utf8')
    const lines = csv
      .replace(/^\uFEFF/, '')
      .trim()
      .split('\n')
    expect(lines).toHaveLength(14)
    const values = lines.slice(1).map((line) => Number(line.split(',')[0]))
    expect(values).toEqual([
      0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8,
    ])
  })

  async function importStepModel(page: Page, step: number) {
    await navigate(page, '수식·파라미터')
    await page.locator('input[type=file]').setInputFiles({
      name: 'step-model.json',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({
          title: '간격 확인 모델',
          description: '탐색 간격 검증',
          source: 'x = p',
          parameters: [
            { id: 'p', name: 'p', value: 0.5, min: 0, max: 1, step },
          ],
          sweepName: 'p',
        }),
      ),
    })
    await expect(page.getByRole('textbox', { name: '모델 이름' })).toHaveValue(
      '간격 확인 모델',
    )
    await ready(page)
    await expect(page.locator('.solution-value strong')).toHaveText(['0.5'])
  }

  test('nondivisible intervals include the maximum once with exact CSV values', async ({
    page,
  }) => {
    await importStepModel(page, 0.3)
    const rows = page.locator(
      ':is(.sweep-table,.simulation-panel-data table) tbody tr',
    )
    await showSimulation(page)
    await expect(rows).toHaveCount(5)
    await showSimulation(page)
    await expect(rows.locator('td:first-child')).toHaveText([
      '0',
      '0.3',
      '0.6',
      '0.9',
      '1',
    ])
    const download = page.waitForEvent('download')
    await showSimulation(page)
    await csvButton(page).click()
    const file = await download
    const csv = await readFile((await file.path())!, 'utf8')
    const values = csv
      .replace(/^\uFEFF/, '')
      .trim()
      .split('\n')
      .slice(1)
      .map((line) => line.split(',').map(Number))
    expect(values).toEqual([
      [0, 0],
      [0.3, 0.3],
      [0.6, 0.6],
      [0.9, 0.9],
      [1, 1],
    ])
  })

  test('too many dataset rows are explained without changing interval or breaking the graph', async ({
    page,
  }) => {
    await importStepModel(page, 0.00001)
    await showSimulation(page)
    await expect(page.getByRole('alert')).toContainText(/2,?000/)
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText(['0.5'])
    await showSimulation(page)
    await expect(page.locator('.sc-curve')).toHaveCount(1)
    await showSimulation(page)
    await expect(csvButton(page)).toBeDisabled()
    await showSimulation(page)
    await expect(
      page.getByRole('slider', { name: 'p 슬라이더' }),
    ).toHaveAttribute('step', '0.00001')
    await showSimulation(page)
    await expect(
      page.locator(':is(.sweep-table,.simulation-panel-data table) tbody tr'),
    ).toHaveCount(0)
  })

  async function importConditionModel(
    page: Page,
    source: string,
    conditionNorm?: 'infinity' | '2',
  ) {
    await navigate(page, '수식·파라미터')
    await page.locator('input[type=file]').setInputFiles({
      name: 'condition-model.json',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({
          title: '조건수 확인 모델',
          description: '선택한 norm의 조건수와 민감도를 검증합니다.',
          source,
          parameters: [],
          sweepName: '',
          ...(conditionNorm ? { conditionNorm } : {}),
        }),
      ),
    })
    await expect(page.getByRole('textbox', { name: '모델 이름' })).toHaveValue(
      '조건수 확인 모델',
    )
    await expect(
      page.getByRole('textbox', { name: '방정식 입력' }),
    ).toHaveValue(source)
    await ready(page)
  }

  test('selected 2-norm uses singular values, preserves solutions and records the chosen definition', async ({
    page,
  }) => {
    await importConditionModel(page, 'x + y = 2\ny = 1')
    await page
      .locator('.workspace-navigation')
      .getByRole('button', { name: '해석 리포트', exact: true })
      .click()
    const selector = page.getByRole('combobox', { name: '조건수 계산 방식' })
    await navigate(page, '해석 리포트')
    await expect(selector).toHaveValue('infinity')
    await navigate(page, '해석 리포트')
    await expect.poll(() => conditionValue(page)).toBe(4)
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText(['1', '1'])
    await navigate(page, '해석 리포트')
    await selector.selectOption('2')
    await navigate(page, '해석 리포트')
    await expect
      .poll(() => conditionValue(page))
      .toBeCloseTo((3 + Math.sqrt(5)) / 2, 4)
    await ready(page)
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText(['1', '1'])
    await navigate(page, '해석 리포트')
    await expect(
      page.locator('.report-content .condition-badge'),
    ).toHaveAttribute('data-level', 'stable')
    await navigate(page, '해석 리포트')
    await expect(
      page.locator('.report-content .condition-badge'),
    ).toContainText('안정')
    const reportEvent = page.waitForEvent('download')
    await navigate(page, '해석 리포트')
    await page.getByRole('button', { name: '리포트 저장', exact: true }).click()
    const report = await reportEvent
    const reportText = await readFile((await report.path())!, 'utf8')
    expect(reportText).toContain('2-norm')
    expect(reportText).toContain('안정')
    const projectEvent = page.waitForEvent('download')
    await page.getByRole('button', { name: '프로젝트 저장' }).click()
    const file = await projectEvent
    const savedProjectText = await readFile((await file.path())!, 'utf8')
    expect(JSON.parse(savedProjectText).conditionNorm).toBe('2')
    await page.reload()
    await ready(page)
    await page
      .locator('.workspace-navigation')
      .getByRole('button', { name: '해석 리포트', exact: true })
      .click()
    await navigate(page, '해석 리포트')
    await expect(selector).toHaveValue('2')
    await navigate(page, '해석 리포트')
    await expect
      .poll(() => conditionValue(page))
      .toBeCloseTo((3 + Math.sqrt(5)) / 2, 4)
    await navigate(page, '해석 리포트')
    await selector.selectOption('infinity')
    await navigate(page, '해석 리포트')
    await expect.poll(() => conditionValue(page)).toBe(4)
    await page.locator('input[type=file]').setInputFiles({
      name: 'saved-condition.json',
      mimeType: 'application/json',
      buffer: Buffer.from(savedProjectText),
    })
    await navigate(page, '해석 리포트')
    await expect(selector).toHaveValue('2')
    await navigate(page, '해석 리포트')
    await expect
      .poll(() => conditionValue(page))
      .toBeCloseTo((3 + Math.sqrt(5)) / 2, 4)
    await page.setViewportSize({ width: 390, height: 844 })
    await navigate(page, '해석 리포트')
    await expect(selector).toBeVisible()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
    ).toBe(false)
  })

  test('condition sensitivity labels distinguish stable, sensitive and very sensitive matrices', async ({
    page,
  }) => {
    await importConditionModel(page, 'x = 1\n0.001*y = 0.001')
    await page
      .locator('.workspace-navigation')
      .getByRole('button', { name: '해석 리포트', exact: true })
      .click()
    const badge = page.locator('.report-content .condition-badge')
    await navigate(page, '해석 리포트')
    await expect(badge).toHaveAttribute('data-level', 'stable')
    await navigate(page, '해석 리포트')
    await expect.poll(() => conditionValue(page)).toBe(1000)
    const editor = page.getByRole('textbox', { name: '방정식 입력' })
    await navigate(page, '수식·파라미터')
    await editor.fill('x = 1\n0.00001*y = 0.00001')
    await navigate(page, '해석 리포트')
    await expect(badge).toHaveAttribute('data-level', 'sensitive')
    await navigate(page, '해석 리포트')
    await expect(badge).toContainText('민감')
    await navigate(page, '해석 리포트')
    await expect.poll(() => conditionValue(page)).toBe(100000)
    await navigate(page, '수식·파라미터')
    await editor.fill('x = 1\n0.000000001*y = 0.000000001')
    await navigate(page, '해석 리포트')
    await expect(badge).toHaveAttribute('data-level', 'very-sensitive')
    await navigate(page, '해석 리포트')
    await expect(badge).toContainText('매우 민감')
    await navigate(page, '해석 리포트')
    await expect.poll(() => conditionValue(page)).toBe(1000000000)
    await page
      .getByRole('combobox', { name: '조건수 계산 방식' })
      .selectOption('2')
    await ready(page)
    await navigate(page, '해석 리포트')
    await expect(badge).toHaveAttribute('data-level', 'very-sensitive')
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText(['1', '1'])
  })

  test('legacy project files default to infinity norm and unsupported norm settings are rejected', async ({
    page,
  }) => {
    await page
      .locator('.workspace-navigation')
      .getByRole('button', { name: '해석 리포트', exact: true })
      .click()
    const selector = page.getByRole('combobox', { name: '조건수 계산 방식' })
    await navigate(page, '해석 리포트')
    await selector.selectOption('2')
    await ready(page)
    await importConditionModel(page, 'x + y = 2\ny = 1')
    await navigate(page, '해석 리포트')
    await expect(selector).toHaveValue('infinity')
    await navigate(page, '해석 리포트')
    await expect.poll(() => conditionValue(page)).toBe(4)
    await page.locator('input[type=file]').setInputFiles({
      name: 'bad-condition.json',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({
          title: '잘못된 조건수 모델',
          description: 'invalid norm',
          source: 'x = 3',
          parameters: [],
          sweepName: '',
          conditionNorm: 'unsupported',
        }),
      ),
    })
    await expect(page.locator('.toast[role="status"]')).toContainText(
      '올바른 Polymath 프로젝트 JSON 파일이 아닙니다',
    )
    await navigate(page, '수식·파라미터')
    await expect(page.getByRole('textbox', { name: '모델 이름' })).toHaveValue(
      '조건수 확인 모델',
    )
    await navigate(page, '해석 리포트')
    await expect(selector).toHaveValue('infinity')
  })
})

test.describe('Equation Solver workspace', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await navigate(page, '수식·파라미터')
  })

  test('starts with a blank Linear calculator and only offers implemented categories', async ({
    page,
  }) => {
    await navigate(page, '수식·파라미터')
    await expect(
      page.getByRole('tab', { name: 'Linear', exact: true }),
    ).toHaveAttribute('aria-selected', 'true')
    await navigate(page, '수식·파라미터')
    await expect(
      page.getByRole('tab', { name: 'Nonlinear', exact: true }),
    ).toBeVisible()
    await navigate(page, '수식·파라미터')
    await expect(
      page.getByRole('textbox', { name: '방정식 입력' }),
    ).toHaveValue('')
    await navigate(page, '수식·파라미터')
    await expect(
      page.getByRole('button', { name: '예제 불러오기' }),
    ).toHaveCount(0)
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveCount(0)
    await showSimulation(page)
    await expect(page.getByRole('alert')).toHaveCount(0)
    await page.screenshot({
      path: '/tmp/polymath-equation-linear-empty.png',
      fullPage: true,
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({
      path: '/tmp/polymath-equation-linear-empty-mobile.png',
      fullPage: true,
    })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
    ).toBe(false)
    await page.setViewportSize({ width: 1440, height: 1100 })
    await navigate(page, '수식·파라미터')
    await page
      .getByRole('textbox', { name: '방정식 입력' })
      .fill('2x + y = 8\nx - y = 1')
    await ready(page)
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText(['3', '2'])
    await navigate(page, '수식·파라미터')
    await page.getByRole('button', { name: '새 모델', exact: true }).click()
    await navigate(page, '수식·파라미터')
    await expect(
      page.getByRole('textbox', { name: '방정식 입력' }),
    ).toHaveValue('')
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveCount(0)
    await showSimulation(page)
    await expect(page.getByRole('alert')).toHaveCount(0)
  })

  test('each solver preserves its own draft, and the selected solver survives reload', async ({
    page,
  }) => {
    const editor = page.getByRole('textbox', { name: '방정식 입력' })
    await navigate(page, '수식·파라미터')
    await page.getByRole('textbox', { name: '모델 이름' }).fill('내 선형 모델')
    await navigate(page, '수식·파라미터')
    await editor.fill('x = 7')
    await ready(page)
    await navigate(page, '수식·파라미터')
    await page.getByRole('tab', { name: 'Nonlinear', exact: true }).click()
    await navigate(page, '수식·파라미터')
    await expect(editor).toHaveValue('')
    await navigate(page, '수식·파라미터')
    await expect(
      page.getByRole('button', { name: '예제 불러오기' }),
    ).toBeVisible()
    await navigate(page, '수식·파라미터')
    await page
      .getByRole('textbox', { name: '모델 이름' })
      .fill('내 비선형 모델')
    const nonlinearSource = 'x^2 = 4'
    await navigate(page, '수식·파라미터')
    await editor.fill(nonlinearSource)
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText(['2'])
    await showSimulation(page)
    await expect(page.locator('.solution-choice')).toHaveCount(2)
    await navigate(page, '수식·파라미터')
    await page.getByRole('tab', { name: 'Linear', exact: true }).click()
    await navigate(page, '수식·파라미터')
    await expect(editor).toHaveValue('x = 7')
    await navigate(page, '수식·파라미터')
    await expect(page.getByRole('textbox', { name: '모델 이름' })).toHaveValue(
      '내 선형 모델',
    )
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText(['7'])
    await navigate(page, '수식·파라미터')
    await page.getByRole('tab', { name: 'Nonlinear', exact: true }).click()
    await navigate(page, '수식·파라미터')
    await expect(editor).toHaveValue(nonlinearSource)
    await page.reload()
    await navigate(page, '수식·파라미터')
    await expect(
      page.getByRole('tab', { name: 'Nonlinear', exact: true }),
    ).toHaveAttribute('aria-selected', 'true')
    await navigate(page, '수식·파라미터')
    await expect(editor).toHaveValue(nonlinearSource)
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText(['2'])
    await navigate(page, '수식·파라미터')
    await page.getByRole('tab', { name: 'Linear', exact: true }).click()
    await navigate(page, '수식·파라미터')
    await expect(editor).toHaveValue('x = 7')
    await navigate(page, '수식·파라미터')
    await page.getByRole('tab', { name: 'Nonlinear', exact: true }).click()
    await navigate(page, '수식·파라미터')
    await page.getByRole('button', { name: '새 모델', exact: true }).click()
    await navigate(page, '수식·파라미터')
    await expect(editor).toHaveValue('')
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveCount(0)
    await navigate(page, '수식·파라미터')
    await page.getByRole('tab', { name: 'Linear', exact: true }).click()
    await navigate(page, '수식·파라미터')
    await expect(editor).toHaveValue('x = 7')
  })

  test('automatic real roots each have their own simulation, CSV and report', async ({
    page,
  }) => {
    await navigate(page, '수식·파라미터')
    await page.getByRole('tab', { name: 'Nonlinear', exact: true }).click()
    await openExample(page, '제곱식의 두 실근')
    await showSimulation(page)
    await expect(page.locator('.solution-count')).toHaveText(
      '발견한 실수 해 2개',
    )
    await showSimulation(page)
    await expect(page.locator('.solution-choice')).toHaveCount(2)
    await showSimulation(page)
    await expect(page.locator('.solution-choice').first()).toHaveAccessibleName(
      '해 1 x 2',
    )
    await showSimulation(page)
    await expect(page.locator('.solution-choice').last()).toHaveAccessibleName(
      '해 2 x -2',
    )
    const negativeIndex = await selectSolution(page, ['-2'])
    await showValues(page)
    await expect(page.locator('.found-badge')).toContainText(
      `해 ${negativeIndex + 1}`,
    )
    await expect(page.getByText('유일해', { exact: true })).toHaveCount(0)
    const rows = page.locator(
      ':is(.sweep-table,.simulation-panel-data table) tbody tr',
    )
    await showSimulation(page)
    await expect(rows).toHaveCount(25)
    await showSimulation(page)
    await expect(rows.nth(0).locator('td')).toHaveText(['1', '-1'])
    await showSimulation(page)
    await expect(rows.nth(1).locator('td').first()).toHaveText('2')
    await showSimulation(page)
    await expect(rows.last().locator('td')).toHaveText(['25', '-5'])
    const negativeCSVEvent = page.waitForEvent('download')
    await showSimulation(page)
    await csvButton(page).click()
    const negativeCSV = await negativeCSVEvent
    expect(negativeCSV.suggestedFilename()).toMatch(
      /^polymath-simulation-.+-data\.csv$/,
    )
    const negativeData = (await readFile((await negativeCSV.path())!, 'utf8'))
      .replace(/^\uFEFF/, '')
      .trim()
      .split('\n')
    expect(negativeData).toHaveLength(26)
    for (const row of negativeData.slice(1)) {
      const [target, root] = row.split(',').map(Number)
      expect(root).toBeLessThan(0)
      expect(root * root).toBeCloseTo(target, 7)
    }
    const positiveIndex = await selectSolution(page, ['2'])
    await showSimulation(page)
    await expect(rows.nth(0).locator('td')).toHaveText(['1', '1'])
    await showSimulation(page)
    await expect(rows.last().locator('td')).toHaveText(['25', '5'])
    const positiveCSVEvent = page.waitForEvent('download')
    await showSimulation(page)
    await csvButton(page).click()
    const positiveCSV = await positiveCSVEvent
    expect(positiveCSV.suggestedFilename()).toMatch(
      /^polymath-simulation-.+-data\.csv$/,
    )
    const positiveData = (await readFile((await positiveCSV.path())!, 'utf8'))
      .replace(/^\uFEFF/, '')
      .trim()
      .split('\n')
    for (const row of positiveData.slice(1)) {
      const [target, root] = row.split(',').map(Number)
      expect(root).toBeGreaterThan(0)
      expect(root * root).toBeCloseTo(target, 7)
    }
    const closeToast = page.getByRole('button', { name: '알림 닫기' })
    if (await closeToast.isVisible()) await closeToast.click()
    await page.screenshot({
      path: '/tmp/polymath-equation-nonlinear-scalar.png',
      fullPage: true,
    })
    await showSimulation(page)
    await page
      .getByRole('slider', { name: 'target 슬라이더', exact: true })
      .fill('9')
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText(['3'])
    const point = page.getByRole('row', { name: 'target 16 탐색', exact: true })
    await showSimulation(page)
    await point.hover()
    await showSimulation(page)
    await expect(point).toHaveAttribute('aria-selected', 'true')
    await showSimulation(page)
    await expect(page.locator('.sc-tooltip-heading strong')).toHaveText('16')
    await page
      .locator('.workspace-navigation')
      .getByRole('button', { name: '해석 리포트', exact: true })
      .click()
    await showValues(page)
    await expect(page.locator('.nonlinear-status')).toContainText(/반복 \d+회/)
    await navigate(page, '해석 리포트')
    await expect(page.locator('.report-content')).toContainText(/국소|야코비/)
    await page
      .getByRole('combobox', { name: '조건수 계산 방식' })
      .selectOption('2')
    await navigate(page, '해석 리포트')
    await expect.poll(() => conditionValue(page)).toBe(1)
    const reportEvent = page.waitForEvent('download')
    await navigate(page, '해석 리포트')
    await page.getByRole('button', { name: '리포트 저장', exact: true }).click()
    const report = await reportEvent
    const reportText = await readFile((await report.path())!, 'utf8')
    expect(reportText).toContain(`· 해 ${positiveIndex + 1}`)
    expect(Number(reportText.match(/\| x \| ([^|]+) \|/)?.[1])).toBeCloseTo(
      3,
      7,
    )
    expect(reportText).toContain('2-norm')
    expect(reportText).not.toContain('유일해')
    const allReportsEvent = page.waitForEvent('download')
    await navigate(page, '해석 리포트')
    await page.getByRole('button', { name: /모든 해 리포트 저장/ }).click()
    const allReports = await allReportsEvent
    const allText = await readFile((await allReports.path())!, 'utf8')
    expect(allReports.suggestedFilename()).toBe('polymath-all-solutions.md')
    expect(allText).toContain('· 해 1')
    expect(allText).toContain('· 해 2')
    const reportRoots = [...allText.matchAll(/\| x \| ([^|]+) \|/g)]
      .map((match) => Number(match[1]))
      .sort((a, b) => a - b)
    expect(reportRoots).toHaveLength(2)
    expect(reportRoots[0]).toBeCloseTo(-3, 7)
    expect(reportRoots[1]).toBeCloseTo(3, 7)
    await selectSolution(page, ['-3'])
    await navigate(page, '해석 리포트')
    await expect(
      page.locator('.report-content .report-title h3'),
    ).toContainText('제곱식의 두 실근')
    const negativeReportEvent = page.waitForEvent('download')
    await navigate(page, '해석 리포트')
    await page.getByRole('button', { name: '리포트 저장', exact: true }).click()
    const negativeReport = await negativeReportEvent
    const negativeText = await readFile((await negativeReport.path())!, 'utf8')
    expect(negativeText).toContain(`· 해 ${negativeIndex + 1}`)
    expect(Number(negativeText.match(/\| x \| ([^|]+) \|/)?.[1])).toBeCloseTo(
      -3,
      7,
    )
    await page.screenshot({
      path: '/tmp/polymath-equation-nonlinear-scalar-report.png',
      fullPage: true,
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({
      path: '/tmp/polymath-equation-nonlinear-scalar-report-mobile.png',
      fullPage: true,
    })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
    ).toBe(false)
  })

  test('NLE0 evaluates named and anonymous expressions without root diagnostics', async ({
    page,
  }) => {
    await navigate(page, '수식·파라미터')
    await page.getByRole('tab', { name: 'Nonlinear', exact: true }).click()
    await setSearchMode(page, 'manual')
    await navigate(page, '수식·파라미터')
    await page
      .getByRole('textbox', { name: '방정식 입력' })
      .fill('a = 1\nb = 4\nx = a + b^2\nx + 2')
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText([
      '1',
      '4',
      '17',
      '19',
    ])
    await showValues(page)
    await expect(page.locator('.found-badge')).toHaveText('계산 완료')
    await showSimulation(page)
    await expect(page.locator('.engine-status')).toHaveText(
      /WebAssembly|JavaScript/,
    )
    await showSimulation(page)
    await expect(page.locator('.result-footer')).not.toContainText('0 × 4')
    await expect(page.getByRole('columnheader')).toHaveText(['변수', '값'])
    await expect(page.locator('.result-table tbody tr')).toHaveCount(4)
    await expect(page.getByRole('columnheader', { name: /잔차/ })).toHaveCount(
      0,
    )
    await showValues(page)
    await expect(page.locator('.nonlinear-status')).not.toContainText('반복')
    await page
      .locator('.workspace-navigation')
      .getByRole('button', { name: '해석 리포트', exact: true })
      .click()
    await expect(page.locator('.matrix-details')).toHaveCount(0)
    await navigate(page, '해석 리포트')
    await expect(page.locator('.condition-value')).toHaveCount(0)
    await expect(
      page.getByRole('combobox', { name: '조건수 계산 방식' }),
    ).toHaveCount(0)
    await navigate(page, '해석 리포트')
    await expect(page.locator('.report-content')).not.toContainText('Jacobian')
    await expect(page.locator('.report-explanation')).toContainText(
      '명시식의 의존 관계',
    )
    await showSimulation(page)
    await expect(page.getByRole('alert')).toHaveCount(0)
  })

  test('ordinary polynomial input finds distinct real roots including repeated roots', async ({
    page,
  }) => {
    await navigate(page, '수식·파라미터')
    await page.getByRole('tab', { name: 'Nonlinear', exact: true }).click()
    const editor = page.getByRole('textbox', { name: '방정식 입력' })
    await navigate(page, '수식·파라미터')
    await expect(page.locator('.nonlinear-settings')).not.toHaveAttribute(
      'open',
    )
    await navigate(page, '수식·파라미터')
    await editor.fill('(x^2 - 1)*(x^2 - 9) = 0')
    await showSimulation(page)
    await expect(page.locator('.solution-count')).toHaveText(
      '발견한 실수 해 4개',
    )
    for (const root of ['1', '-1', '3', '-3']) {
      await selectSolution(page, [root])
    }
    await navigate(page, '수식·파라미터')
    await editor.fill('(x - 1)^2*(x + 2)^2 = 0')
    await showSimulation(page)
    await expect(page.locator('.solution-choice')).toHaveCount(2)
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText(['1'])
    await selectSolution(page, ['-2'])
    await showSimulation(page)
    await expect(page.getByRole('alert')).toHaveCount(0)
    await showSimulation(page)
    await expect(page.locator('.search-summary')).toContainText('다항식')
  })

  test('periodic equations show finite coverage and preserve optional search bounds', async ({
    page,
  }) => {
    await navigate(page, '수식·파라미터')
    await page.getByRole('tab', { name: 'Nonlinear', exact: true }).click()
    await setSearchMode(page, 'auto')
    await navigate(page, '수식·파라미터')
    await page.getByRole('spinbutton', { name: '자동 탐색 최솟값' }).fill('-4')
    await navigate(page, '수식·파라미터')
    await page.getByRole('spinbutton', { name: '자동 탐색 최댓값' }).fill('4')
    await navigate(page, '수식·파라미터')
    await page
      .locator('.search-bounds-form')
      .getByRole('button', { name: '범위 적용', exact: true })
      .click()
    await navigate(page, '수식·파라미터')
    await page.getByRole('textbox', { name: '방정식 입력' }).fill('sin(x) = 0')
    await showSimulation(page)
    await expect(page.locator('.solution-choice')).toHaveCount(3)
    await showSimulation(page)
    await expect(page.locator('.search-summary')).toContainText(
      '탐색 범위 -4 ~ 4',
    )
    await showSimulation(page)
    await expect(page.locator('.search-summary')).toContainText(
      /범위 밖의 해|모든 해를 보장하지/,
    )
    const roots = await page
      .locator('.solution-choice strong')
      .allTextContents()
    expect(roots.map((value) => Number(value.split('=')[1]))).toEqual([
      expect.closeTo(0, 7),
      expect.closeTo(Math.PI, 7),
      expect.closeTo(-Math.PI, 7),
    ])
    await selectSolution(page, ['0'])
    const saveEvent = page.waitForEvent('download')
    await page.getByRole('button', { name: '프로젝트 저장' }).click()
    const file = await saveEvent
    const saved = JSON.parse(await readFile((await file.path())!, 'utf8'))
    expect(saved.searchBounds).toEqual({ min: -4, max: 4 })
    expect(saved.nonlinearSearch).toBe('auto')
    expect(saved.selectedSolution).toBe(0)
    await page.reload()
    await showSimulation(page)
    await expect(page.locator('.solution-choice')).toHaveCount(3)
    await showSimulation(page)
    await expect(page.locator('.solution-choice').first()).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText(['0'])
    await importProject(page, {
      ...saved,
      searchBounds: { min: -1, max: 1 },
      selectedSolution: 0,
    })
    await showSimulation(page)
    await expect(page.locator('.solution-choice')).toHaveCount(1)
    await showSimulation(page)
    await expect(page.locator('.search-summary')).toContainText(
      '탐색 범위 -1 ~ 1',
    )
    await setSearchMode(page, 'auto')
    await navigate(page, '수식·파라미터')
    await page.getByRole('spinbutton', { name: '자동 탐색 최솟값' }).fill('2')
    await navigate(page, '수식·파라미터')
    await page.getByRole('spinbutton', { name: '자동 탐색 최댓값' }).fill('1')
    await navigate(page, '수식·파라미터')
    await page
      .locator('.search-bounds-form')
      .getByRole('button', { name: '범위 적용', exact: true })
      .click()
    await navigate(page, '수식·파라미터')
    await expect(
      page.locator('.search-bounds-form [role=alert]'),
    ).toContainText('최솟값보다 큰')
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText(['0'])
    await showSimulation(page)
    await expect(page.locator('.search-summary')).toContainText(
      '탐색 범위 -1 ~ 1',
    )
  })

  test('no-real-root equations show search coverage and recover without initial guesses', async ({
    page,
  }) => {
    await navigate(page, '수식·파라미터')
    await page.getByRole('tab', { name: 'Nonlinear', exact: true }).click()
    const editor = page.getByRole('textbox', { name: '방정식 입력' })
    await navigate(page, '수식·파라미터')
    await editor.fill('x^2 + 1 = 0')
    await showSimulation(page)
    await expect(page.getByRole('alert')).toContainText('실수 해')
    await showSimulation(page)
    await expect(page.locator('.search-summary')).toContainText('탐색 범위')
    await showSimulation(page)
    await expect(page.locator('.solution-choice')).toHaveCount(0)
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveCount(0)
    await navigate(page, '수식·파라미터')
    await editor.fill('x^2 = 4')
    await showSimulation(page)
    await expect(page.getByRole('alert')).toHaveCount(0)
    await showSimulation(page)
    await expect(page.locator('.solution-choice')).toHaveCount(2)
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText(['2'])
  })

  test('a capped periodic root list starts at zero and expands outward', async ({
    page,
  }) => {
    await navigate(page, '수식·파라미터')
    await page.getByRole('tab', { name: 'Nonlinear', exact: true }).click()
    await navigate(page, '수식·파라미터')
    await page.getByRole('textbox', { name: '방정식 입력' }).fill('sin(x) = 0')
    await showSimulation(page)
    await expect(page.locator('.solution-choice')).toHaveCount(32)
    const roots = (
      await page.locator('.solution-choice strong').allTextContents()
    ).map((text) => Number(text.split('=')[1]))
    expect(roots.slice(0, 5)).toEqual([
      expect.closeTo(0, 7),
      expect.closeTo(Math.PI, 7),
      expect.closeTo(-Math.PI, 7),
      expect.closeTo(2 * Math.PI, 7),
      expect.closeTo(-2 * Math.PI, 7),
    ])
    for (let i = 1; i < roots.length; i++) {
      expect(Math.abs(roots[i]) + 0.000001).toBeGreaterThanOrEqual(
        Math.abs(roots[i - 1]),
      )
    }
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText(['0'])
    await showSimulation(page)
    await expect(page.locator('.search-summary')).toContainText(
      /범위 밖의 해|모든 해를 보장하지/,
    )
    await showSimulation(page)
    await expect(page.locator('.search-summary')).toContainText(/32|최대|제한/)
    await showSimulation(page)
    await expect(page.getByRole('alert')).toHaveCount(0)
  })

  test('a far periodic branch stays local and stops where no real solution exists', async ({
    page,
  }) => {
    await importProject(page, {
      mode: 'nonlinear',
      nonlinearSearch: 'auto',
      title: '먼 주기 함수 해 추적',
      description: '',
      source: 'sin(x)*cos(x) = target',
      parameters: [
        {
          id: 'target',
          name: 'target',
          value: 0.25,
          min: 0,
          max: 1,
          step: 0.05,
        },
      ],
      sweepName: 'target',
      searchBounds: { min: -41, max: -39 },
    })
    await showSimulation(page)
    await expect(page.locator('.solution-choice')).toHaveCount(2)
    await showSimulation(page)
    await expect(page.locator('.engine-status')).toHaveText(
      /WebAssembly|JavaScript/,
    )
    const svg = page.locator('.solution-chart svg')
    await showSimulation(page)
    await expect(svg.locator('.sc-curve')).toHaveCount(1)
    const ticks = (
      await svg.locator('.sc-axis-label[text-anchor="end"]').allTextContents()
    ).map(Number)
    expect(Math.max(...ticks)).toBeLessThan(-38)
    expect(Math.max(...ticks) - Math.min(...ticks)).toBeLessThan(3)
    const rows = page.locator(
      ':is(.sweep-table,.simulation-panel-data table) tbody tr',
    )
    await showSimulation(page)
    await expect(rows).toHaveCount(21)
    await expect(
      page
        .getByRole('row', { name: 'target 0.55 탐색', exact: true })
        .locator('td')
        .last(),
    ).toHaveText('해 없음')
    await showSimulation(page)
    await expect(rows.last().locator('td')).toHaveText(['1', '해 없음'])
    const valid = await rows.evaluateAll((elements) =>
      elements.flatMap((row) => {
        const cells = [...row.querySelectorAll('td')].map(
          (cell) => cell.textContent?.trim() || '',
        )
        return cells[1] === '해 없음'
          ? []
          : [[Number(cells[0]), Number(cells[1])]]
      }),
    )
    expect(valid.length).toBeGreaterThan(5)
    for (const [target, root] of valid) {
      expect(root).toBeGreaterThan(-41)
      expect(root).toBeLessThan(-39)
      expect(Math.sin(root) * Math.cos(root)).toBeCloseTo(target, 5)
    }
    const midpoint = Number(
      await svg
        .locator('.sc-axis-label[text-anchor="middle"]')
        .filter({ hasText: /^0\.5$/ })
        .getAttribute('x'),
    )
    const path = await svg.locator('.sc-curve').getAttribute('d')
    const curveX = [...(path || '').matchAll(/[ML]([-\d.]+),[-\d.]+/g)].map(
      (match) => Number(match[1]),
    )
    expect(curveX.length).toBeGreaterThan(10)
    expect(Math.max(...curveX)).toBeLessThanOrEqual(midpoint + 1)
    await page.screenshot({
      path: '/tmp/polymath-far-periodic-branch.png',
      fullPage: true,
    })
  })

  test('selected roots open concurrent simulations with shared values and independent branch identity', async ({
    page,
  }) => {
    await importProject(page, {
      mode: 'nonlinear',
      nonlinearSearch: 'auto',
      title: '두 실근의 동시 시뮬레이션',
      description: '',
      source: 'x^2 = p',
      parameters: [{ id: 'p', name: 'p', value: 4, min: 1, max: 9, step: 1 }],
      sweepName: 'p',
    })
    await showSimulation(page)
    await expect(page.locator('.solution-choice')).toHaveCount(2)
    const positiveIndex = await selectSolution(page, ['2'])
    await showSimulation(page)
    await page
      .getByRole('button', {
        name: `해 ${positiveIndex + 1} 시뮬레이션 추가`,
        exact: true,
      })
      .click()
    await showSimulation(page)
    await expect(page.locator('.simulation-panel')).toHaveCount(1)
    const negativeIndex = await selectSolution(page, ['-2'])
    await showSimulation(page)
    await page
      .getByRole('button', {
        name: `해 ${negativeIndex + 1} 시뮬레이션 추가`,
        exact: true,
      })
      .click()
    await showSimulation(page)
    await expect(
      page.locator('.simulation-grid .simulation-panel'),
    ).toHaveCount(2)
    const positive = page.locator(
      `.simulation-panel[aria-label="해 ${positiveIndex + 1} 시뮬레이션"]`,
    )
    const negative = page.locator(
      `.simulation-panel[aria-label="해 ${negativeIndex + 1} 시뮬레이션"]`,
    )
    await showSimulation(page)
    await expect(
      positive.locator('.simulation-panel-current strong'),
    ).toHaveText('x = 2')
    await showSimulation(page)
    await expect(
      negative.locator('.simulation-panel-current strong'),
    ).toHaveText('x = -2')
    const slider = page
      .locator('.results-parameters')
      .getByRole('slider', { name: 'p 슬라이더', exact: true })
    await showSimulation(page)
    await slider.fill('9')
    await showSimulation(page)
    await expect(
      positive.locator('.simulation-panel-current strong'),
    ).toHaveText('x = 3')
    await showSimulation(page)
    await expect(
      negative.locator('.simulation-panel-current strong'),
    ).toHaveText('x = -3')
    await showSimulation(page)
    await expect(positive.locator('.simulation-panel-anchor')).toContainText(
      'x = 2',
    )
    await showSimulation(page)
    await expect(negative.locator('.simulation-panel-anchor')).toContainText(
      'x = -2',
    )
    for (const [panel, expected] of [
      [positive, '3'],
      [negative, '-3'],
    ] as const) {
      await showSimulation(page)
      await panel.locator('.simulation-panel-data summary').click()
      const rows = panel.locator('.simulation-panel-table-scroll tbody tr')
      await showSimulation(page)
      await expect(rows).toHaveCount(9)
      await showSimulation(page)
      await expect(rows.last().locator('td')).toHaveText(['9', expected])
    }
    await selectSolution(page, ['3'])
    await showSimulation(page)
    await expect(page.locator('.simulation-panel')).toHaveCount(2)
    await page.screenshot({
      path: '/tmp/polymath-multiple-simulations-desktop.png',
      fullPage: true,
    })
    const savedEvent = page.waitForEvent('download')
    await page
      .getByRole('button', { name: '프로젝트 저장', exact: true })
      .click()
    const file = await savedEvent
    const saved = JSON.parse(await readFile((await file.path())!, 'utf8'))
    expect(saved.simulations).toHaveLength(2)
    expect(
      saved.simulations.map((anchor: { values: number[] }) => anchor.values),
    ).toEqual([[2], [-2]])
    await page.reload()
    await showSimulation(page)
    await expect(page.locator('.simulation-panel-current strong')).toHaveText([
      'x = 3',
      'x = -3',
    ])
    await navigate(page, '수식·파라미터')
    await page.getByRole('tab', { name: 'Linear', exact: true }).click()
    await importProject(page, saved)
    await showSimulation(page)
    await expect(page.locator('.simulation-panel-current strong')).toHaveText([
      'x = 3',
      'x = -3',
    ])
    await showSimulation(page)
    await expect(positive.locator('.simulation-panel-anchor')).toContainText(
      'x = 2',
    )
    await showSimulation(page)
    await expect(negative.locator('.simulation-panel-anchor')).toContainText(
      'x = -2',
    )
    await showSimulation(page)
    await positive
      .getByRole('button', {
        name: `해 ${positiveIndex + 1} 시뮬레이션 닫기`,
        exact: true,
      })
      .click()
    await showSimulation(page)
    await expect(page.locator('.simulation-panel')).toHaveCount(1)
    await showSimulation(page)
    await expect(
      negative.locator('.simulation-panel-current strong'),
    ).toHaveText('x = -3')
    await showSimulation(page)
    await slider.fill('4')
    await showSimulation(page)
    await expect(
      negative.locator('.simulation-panel-current strong'),
    ).toHaveText('x = -2')
  })

  test('parameter range settings remain beside the model and fullscreen enlarges each simulation canvas', async ({
    page,
  }) => {
    await navigate(page, '수식·파라미터')
    await page.getByRole('tab', { name: 'Nonlinear', exact: true }).click()
    await openExample(page, '제곱식의 두 실근')
    const model = page.locator('.parameter-panel')
    const controls = page.locator('.results-parameters')
    await showSimulation(page)
    await expect(model.getByRole('slider')).toHaveCount(0)
    await showSimulation(page)
    await expect(
      controls.getByRole('slider', { name: 'target 슬라이더', exact: true }),
    ).toBeVisible()
    await navigate(page, '수식·파라미터')
    await model
      .getByRole('button', { name: '파라미터 범위 설정', exact: true })
      .click()
    await navigate(page, '수식·파라미터')
    await expect(
      model.getByRole('spinbutton', { name: 'target 최솟값', exact: true }),
    ).toHaveValue('1')
    await navigate(page, '수식·파라미터')
    await expect(
      model.getByRole('spinbutton', { name: 'target 최댓값', exact: true }),
    ).toHaveValue('25')
    await navigate(page, '수식·파라미터')
    await expect(
      model.getByRole('spinbutton', { name: 'target 간격', exact: true }),
    ).toHaveValue('1')
    await showSimulation(page)
    await page
      .getByRole('button', { name: '해 1 시뮬레이션 추가', exact: true })
      .click()
    await showSimulation(page)
    await page
      .getByRole('button', { name: '해 2 시뮬레이션 추가', exact: true })
      .click()
    await showSimulation(page)
    await expect(page.locator('.simulation-panel')).toHaveCount(2)
    const svg = page.locator('.simulation-panel .solution-chart svg').first()
    const normalSize = await svg.boundingBox()
    expect(normalSize?.height).toBeGreaterThan(150)
    await showSimulation(page)
    await page
      .getByRole('button', { name: '결과 화면 확대', exact: true })
      .click()
    await expect(
      page.getByRole('dialog', { name: '결과 탐색 전체화면', exact: true }),
    ).toBeVisible()
    await expect(page.locator('.model-column')).not.toBeVisible()
    await expect
      .poll(async () => (await svg.boundingBox())?.height || 0)
      .toBeGreaterThan(normalSize!.height + 100)
    await showSimulation(page)
    await controls
      .getByRole('slider', { name: 'target 슬라이더', exact: true })
      .fill('9')
    await showSimulation(page)
    await expect(page.locator('.simulation-panel-current strong')).toHaveText([
      'x = 3',
      'x = -3',
    ])
    const toast = page.getByRole('button', { name: '알림 닫기', exact: true })
    if (await toast.isVisible()) await toast.click()
    await svg.evaluate((element) => element.scrollIntoView({ block: 'center' }))
    await page.screenshot({
      path: '/tmp/polymath-multiple-simulations-fullscreen.png',
      fullPage: true,
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await showSimulation(page)
    await expect(page.locator('.simulation-panel')).toHaveCount(2)
    await showSimulation(page)
    await expect(
      controls.getByRole('slider', { name: 'target 슬라이더', exact: true }),
    ).toBeVisible()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
    ).toBe(false)
    const mobileSize = await svg.boundingBox()
    expect(mobileSize?.height).toBeGreaterThan(350)
    await svg.evaluate((element) => element.scrollIntoView({ block: 'center' }))
    await page.screenshot({
      path: '/tmp/polymath-multiple-simulations-mobile.png',
      fullPage: true,
    })
    await showSimulation(page)
    await page
      .getByRole('button', { name: '기본 레이아웃', exact: true })
      .click()
    await navigate(page, '수식·파라미터')
    await expect(page.locator('.model-column')).toBeVisible()
    await showSimulation(page)
    await expect(page.locator('.simulation-panel')).toHaveCount(2)
  })

  test('distinct tiny roots can each open a simulation without being merged', async ({
    page,
  }) => {
    await navigate(page, '수식·파라미터')
    await page.getByRole('tab', { name: 'Nonlinear', exact: true }).click()
    await navigate(page, '수식·파라미터')
    await page
      .getByRole('textbox', { name: '방정식 입력' })
      .fill('x*(x - 1e-15) = 0')
    await showSimulation(page)
    await expect(page.locator('.solution-choice')).toHaveCount(2)
    await showSimulation(page)
    await page
      .getByRole('button', { name: '해 1 시뮬레이션 추가', exact: true })
      .click()
    await showSimulation(page)
    await expect(page.locator('.simulation-panel')).toHaveCount(1)
    const second = page.getByRole('button', {
      name: '해 2 시뮬레이션 추가',
      exact: true,
    })
    await expect(second).toBeEnabled()
    await second.click()
    await showSimulation(page)
    await expect(page.locator('.simulation-panel')).toHaveCount(2)
    await showSimulation(page)
    await expect(page.locator('.simulation-panel-current strong')).toHaveText([
      'x = 0',
      'x = 1e-15',
    ])
    const editor = page.getByRole('textbox', { name: '방정식 입력' })
    await navigate(page, '수식·파라미터')
    await editor.focus()
    await navigate(page, '수식·파라미터')
    await editor.evaluate((element: HTMLTextAreaElement) =>
      element.setSelectionRange(0, 2),
    )
    await navigate(page, '수식·파라미터')
    await editor.press('Tab')
    await navigate(page, '수식·파라미터')
    await expect(editor).toHaveValue('  (x - 1e-15) = 0')
    await showSimulation(page)
    await expect(
      page.locator('.simulation-grid .simulation-panel'),
    ).toHaveCount(0)
    await showSimulation(page)
    await expect(page.locator('.solution-choice')).toHaveCount(1)
    await expect(
      page.locator(
        '.selected-simulation-workspace .simulation-panel-current strong',
      ),
    ).toHaveText('x = 1e-15')
  })

  test('an unavailable current root keeps valid partial curves and recovers the same anchored branch', async ({
    page,
  }) => {
    await importProject(page, {
      mode: 'nonlinear',
      nonlinearSearch: 'auto',
      title: '해가 없는 현재값과 부분 곡선',
      description: '',
      source: 'sin(x)*cos(x) = target',
      parameters: [
        {
          id: 'target',
          name: 'target',
          value: 0.25,
          min: 0,
          max: 1,
          step: 0.05,
        },
      ],
      sweepName: 'target',
      searchBounds: { min: -41, max: -39 },
    })
    await showSimulation(page)
    await expect(page.locator('.solution-choice')).toHaveCount(2)
    await showSimulation(page)
    await page
      .getByRole('button', { name: '해 1 시뮬레이션 추가', exact: true })
      .click()
    const panel = page.locator('.simulation-panel')
    await showSimulation(page)
    await expect(
      panel.locator('.simulation-panel-current strong'),
    ).toContainText('x = -39.5317')
    const slider = page
      .locator('.results-parameters')
      .getByRole('slider', { name: 'target 슬라이더', exact: true })
    await showSimulation(page)
    await slider.fill('0.75')
    await showSimulation(page)
    await expect(panel.locator('.simulation-panel-current strong')).toHaveText(
      '해 없음',
    )
    await showSimulation(page)
    await expect(panel.locator('.simulation-panel-error')).toBeVisible()
    const curve = panel.locator('.sc-curve')
    await showSimulation(page)
    await expect(curve).toHaveCount(1)
    expect((await curve.getAttribute('d'))?.length).toBeGreaterThan(100)
    await showSimulation(page)
    await expect(panel.locator('.sc-current-dot')).toHaveCount(0)
    await showSimulation(page)
    await panel.locator('.simulation-panel-data summary').click()
    await showSimulation(page)
    await expect(
      panel
        .locator('.simulation-panel-table-scroll tbody tr')
        .last()
        .locator('td'),
    ).toHaveText(['1', '해 없음'])
    await page.screenshot({
      path: '/tmp/polymath-partial-simulation-no-current-root.png',
      fullPage: true,
    })
    await showSimulation(page)
    await slider.fill('0.25')
    await showSimulation(page)
    await expect(
      panel.locator('.simulation-panel-current strong'),
    ).toContainText('x = -39.5317')
    await showSimulation(page)
    await expect(panel.locator('.simulation-panel-error')).toHaveCount(0)
    await showSimulation(page)
    await expect(page.locator('.simulation-panel')).toHaveCount(1)
  })

  test('manual search remains available and its selected mode survives export and import', async ({
    page,
  }) => {
    await navigate(page, '수식·파라미터')
    await page.getByRole('tab', { name: 'Nonlinear', exact: true }).click()
    const source = 'f(x) = x^2 - 4\nx(min) = -3\nx(max) = 0'
    await navigate(page, '수식·파라미터')
    await page.getByRole('textbox', { name: '방정식 입력' }).fill(source)
    await showSimulation(page)
    await expect(page.locator('.solution-choice')).toHaveCount(2)
    await expect(page.locator('.legacy-conditions-note')).toContainText(
      '고급 설정',
    )
    await setSearchMode(page, 'manual')
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText(['-2'])
    await showSimulation(page)
    await expect(page.locator('.solution-choice')).toHaveCount(0)
    await showValues(page)
    await expect(page.locator('.found-badge')).toHaveText('수렴')
    const saveEvent = page.waitForEvent('download')
    await page.getByRole('button', { name: '프로젝트 저장' }).click()
    const file = await saveEvent
    const saved = JSON.parse(await readFile((await file.path())!, 'utf8'))
    expect(saved.nonlinearSearch).toBe('manual')
    await setSearchMode(page, 'auto')
    await showSimulation(page)
    await expect(page.locator('.solution-choice')).toHaveCount(2)
    await importProject(page, saved)
    await navigate(page, '수식·파라미터')
    await expect(
      page.getByRole('combobox', { name: '해 탐색 방식' }),
    ).toHaveValue('manual')
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText(['-2'])
    await showSimulation(page)
    await expect(page.locator('.solution-choice')).toHaveCount(0)
    await page.reload()
    await navigate(page, '수식·파라미터')
    await page.locator('.nonlinear-settings summary').click()
    await navigate(page, '수식·파라미터')
    await expect(
      page.getByRole('combobox', { name: '해 탐색 방식' }),
    ).toHaveValue('manual')
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText(['-2'])
  })

  test('automatic examples find multiple intersections and engineering helpers without initial conditions', async ({
    page,
  }) => {
    await navigate(page, '수식·파라미터')
    await page.getByRole('tab', { name: 'Nonlinear', exact: true }).click()
    await openExample(page, '세 실근을 가진 삼차식')
    await showSimulation(page)
    await expect(page.locator('.solution-choice')).toHaveCount(3)
    for (const root of ['1', '2', '3']) {
      await selectSolution(page, [root])
    }
    await openExample(page, '원과 직선의 교점')
    await showSimulation(page)
    await expect(page.locator('.solution-choice')).toHaveCount(2)
    await selectSolution(page, ['-3', '-4'])
    await selectSolution(page, ['4', '3'])
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText(['4', '3'])
    await page
      .locator('.workspace-navigation')
      .getByRole('button', { name: '해석 리포트', exact: true })
      .click()
    await navigate(page, '해석 리포트')
    await page
      .getByText('Jacobian·수치 검증 자세히 보기', { exact: true })
      .click()
    await page.screenshot({
      path: '/tmp/polymath-equation-nonlinear-system-report.png',
      fullPage: true,
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({
      path: '/tmp/polymath-equation-nonlinear-system-report-mobile.png',
      fullPage: true,
    })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
    ).toBe(false)
    await page.setViewportSize({ width: 1440, height: 1100 })
    await showSimulation(page)
    await setSearchMode(page, 'manual')
    await navigate(page, '수식·파라미터')
    await page
      .getByRole('textbox', { name: '방정식 입력' })
      .fill('f(x) = x^2 + y^2 - 25\nf(y) = x - y - 1\nx(0) = -3\ny(0) = -4')
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText([
      '-3',
      '-4',
    ])
    await openExample(page, '비선형 물질수지와 평형 농도')
    await showSimulation(page)
    await expect(page.locator('.solution-choice')).toHaveCount(2)
    await selectSolution(page, ['1.236068'])
    await showValues(page)
    await expect
      .poll(async () =>
        Number(await page.locator('.solution-value strong').innerText()),
      )
      .toBeCloseTo(Math.sqrt(5) - 1, 5)
    await showSimulation(page)
    await page
      .getByRole('slider', { name: 'C0 슬라이더', exact: true })
      .fill('4')
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText(['2'])
    await openExample(page, '보조식으로 나누어 쓰는 비선형 모델')
    await showSimulation(page)
    await expect(page.locator('.solution-choice')).toHaveCount(1)
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText(['20'])
    await page.screenshot({
      path: '/tmp/polymath-nonlinear-desktop.png',
      fullPage: true,
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({
      path: '/tmp/polymath-nonlinear-mobile.png',
      fullPage: true,
    })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
    ).toBe(false)
    await navigate(page, '수식·파라미터')
    await expect(
      page.getByRole('tab', { name: 'Nonlinear', exact: true }),
    ).toBeVisible()
    await navigate(page, '수식·파라미터')
    await expect(page.getByRole('button', { name: '모델 풀기' })).toBeVisible()
  })

  test('nonlinear invalid bounds, missing guesses, domain errors and failed roots recover after editing', async ({
    page,
  }) => {
    await navigate(page, '수식·파라미터')
    await page.getByRole('tab', { name: 'Nonlinear', exact: true }).click()
    await setSearchMode(page, 'manual')
    const editor = page.getByRole('textbox', { name: '방정식 입력' })
    for (const [source, diagnostic] of [
      ['f(x) = x^2 - 4', '경계를 모두 입력하세요'],
      ['f(x) = x^2 + y^2 - 25\nf(y) = x - y - 1', '초기값을 입력하세요'],
      ['f(x) = ln(x)\nx(min) = -2\nx(max) = -1', '실수 범위를 벗어났습니다'],
      ['f(x) = x^2 + 1\nx(min) = -3\nx(max) = 3', '부호가 같습니다'],
      [
        'f(x) = x^2 + 1\nf(y) = y^2 + 1\nx(0) = 0\ny(0) = 0',
        'Jacobian이 특이하거나',
      ],
    ]) {
      await navigate(page, '수식·파라미터')
      await editor.fill(source)
      await showSimulation(page)
      await expect(page.getByRole('alert')).toContainText(diagnostic)
      await showValues(page)
      await expect(page.locator('.solution-value strong')).toHaveCount(0)
    }
    await navigate(page, '수식·파라미터')
    await editor.fill('f(x) = x^2 - 4\nx(min) = 0\nx(max) = 3')
    await showSimulation(page)
    await expect(page.getByRole('alert')).toHaveCount(0)
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText(['2'])
  })

  test('nonlinear simulation retains failed points without inventing roots in the table or CSV', async ({
    page,
  }) => {
    await importProject(page, {
      mode: 'nonlinear',
      nonlinearSearch: 'manual',
      title: '근이 사라지는 탐색',
      description: '',
      source: 'f(x) = x^2 - p\n x(min) = 0\n x(max) = 1',
      parameters: [
        { id: 'p', name: 'p', value: 0.25, min: -1, max: 2, step: 0.5 },
      ],
      sweepName: 'p',
    })
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText(['0.5'])
    const rows = page.locator(
      ':is(.sweep-table,.simulation-panel-data table) tbody tr',
    )
    await showSimulation(page)
    await expect(rows).toHaveCount(7)
    await showSimulation(page)
    await expect(rows.nth(0).locator('td')).toHaveText(['-1', '해 없음'])
    await showSimulation(page)
    await expect(rows.nth(2).locator('td')).toHaveText(['0', '0'])
    await showSimulation(page)
    await expect(rows.nth(4).locator('td')).toHaveText(['1', '1'])
    await showSimulation(page)
    await expect(rows.last().locator('td')).toHaveText(['2', '해 없음'])
    await showSimulation(page)
    await expect(rows.nth(0).locator('td').last()).toHaveAttribute(
      'title',
      /.+/,
    )
    const csvEvent = page.waitForEvent('download')
    await showSimulation(page)
    await csvButton(page).click()
    const file = await csvEvent
    const text = (await readFile((await file.path())!, 'utf8'))
      .replace(/^\uFEFF/, '')
      .trim()
    expect(text.split('\n')).toHaveLength(8)
    expect(text.split('\n')[1]).toBe('-1,')
    expect(text.split('\n').at(-1)).toBe('2,')
    const editor = page.getByRole('textbox', { name: '방정식 입력' })
    await navigate(page, '수식·파라미터')
    await editor.fill(
      'f(x) = x^2 - 4\nx(min) = 0\nx(max) = 3\n#@method=constrained',
    )
    await showSimulation(page)
    await expect(page.getByRole('alert')).toContainText(
      '아직 지원하지 않습니다',
    )
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveCount(0)
  })

  test('project JSON keeps the nonlinear mode and accepts legacy Linear projects', async ({
    page,
  }) => {
    await navigate(page, '수식·파라미터')
    await page.getByRole('tab', { name: 'Nonlinear', exact: true }).click()
    await openExample(page, '제곱식의 두 실근')
    await selectSolution(page, ['2'])
    await showSimulation(page)
    await page
      .getByRole('slider', { name: 'target 슬라이더', exact: true })
      .fill('16')
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText(['4'])
    const savedEvent = page.waitForEvent('download')
    await page.getByRole('button', { name: '프로젝트 저장' }).click()
    const file = await savedEvent
    const saved = JSON.parse(await readFile((await file.path())!, 'utf8'))
    expect(saved.mode).toBe('nonlinear')
    expect(saved.nonlinearSearch).toBe('auto')
    expect(saved.selectedSolution).toBe(0)
    expect(saved.parameters[0].value).toBe(16)
    await navigate(page, '수식·파라미터')
    await page.getByRole('tab', { name: 'Linear', exact: true }).click()
    await importProject(page, saved)
    await navigate(page, '수식·파라미터')
    await expect(
      page.getByRole('tab', { name: 'Nonlinear', exact: true }),
    ).toHaveAttribute('aria-selected', 'true')
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText(['4'])
    await importProject(page, {
      title: '이전 선형 파일',
      description: '',
      source: '3x = 12',
      parameters: [],
      sweepName: '',
    })
    await navigate(page, '수식·파라미터')
    await expect(
      page.getByRole('tab', { name: 'Linear', exact: true }),
    ).toHaveAttribute('aria-selected', 'true')
    await showValues(page)
    await expect(page.locator('.solution-value strong')).toHaveText(['4'])
    await navigate(page, '수식·파라미터')
    await expect(
      page.getByRole('button', { name: '예제 불러오기' }),
    ).toHaveCount(0)
    await importProject(page, { ...saved, mode: 'unsupported' })
    await expect(page.locator('.toast[role="status"]')).toContainText(
      '올바른 Polymath 프로젝트 JSON 파일이 아닙니다',
    )
    await navigate(page, '수식·파라미터')
    await expect(
      page.getByRole('tab', { name: 'Linear', exact: true }),
    ).toHaveAttribute('aria-selected', 'true')
    await navigate(page, '수식·파라미터')
    await expect(page.getByRole('textbox', { name: '모델 이름' })).toHaveValue(
      '이전 선형 파일',
    )
  })
})

async function loadFixture(page: Page, project: object) {
  await navigate(page, '수식·파라미터')
  await importProject(page, project)
  await navigate(page, '시뮬레이션')
  await expect(page.locator('.engine-status')).toHaveText(
    /WebAssembly|JavaScript/,
  )
  await expect(page.locator('.simulation-panel-current strong')).toBeVisible()
}

async function pinFirstTwo(page: Page) {
  const roots = page.locator('.solutions-section')
  if (!(await roots.evaluate((element) => element.hasAttribute('open'))))
    await roots.locator('summary').click()
  await page
    .getByRole('button', { name: '해 1 시뮬레이션 추가', exact: true })
    .click()
  await expect(page.locator('.engine-status')).not.toContainText('계산 중')
  await expect(
    page.getByRole('button', { name: '해 2 시뮬레이션 추가', exact: true }),
  ).toBeEnabled()
  await page
    .getByRole('button', { name: '해 2 시뮬레이션 추가', exact: true })
    .click()
  await expect(page.locator('.simulation-panel')).toHaveCount(2)
  await expect(
    page.locator('.simulation-panel-current strong').last(),
  ).not.toHaveText('해 없음')
}

const INTERACTIVE_PROJECT = {
  mode: 'nonlinear',
  nonlinearSearch: 'auto',
  title: '상호작용 검증',
  description: '',
  source: 'x^2=p',
  parameters: [{ id: 'p', name: 'p', value: 4, min: 1, max: 9, step: 4 }],
  sweepName: 'p',
}

test.describe('Calm screens and stable interactive charts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('the first screen offers six module icons and separates setup, simulation and report', async ({
    page,
  }) => {
    const entry = page.getByRole('button', {
      name: 'Equation Solver 열기',
      exact: true,
    })
    await expect(entry).toBeVisible()
    await expect(page.locator('.module-card')).toHaveCount(6)
    await expect(page.locator('.module-card:disabled')).toHaveCount(5)
    await expect(
      page.getByRole('textbox', { name: '방정식 입력' }),
    ).not.toBeVisible()
    await page.screenshot({
      path: '/tmp/polymath-modules-home.png',
      fullPage: true,
    })
    await entry.click()
    await expect(
      page.getByRole('textbox', { name: '방정식 입력' }),
    ).toBeVisible()
    await expect(page.locator('.results-panel')).not.toBeVisible()
    await page
      .getByRole('textbox', { name: '방정식 입력' })
      .fill('x+y=5\nx-y=1')
    await page.getByRole('button', { name: /^모델 풀기/ }).click()
    await expect(
      page
        .locator('.workspace-navigation')
        .getByRole('button', { name: '시뮬레이션', exact: true }),
    ).toHaveAttribute('aria-current', 'page')
    await expect(page.locator('.solution-value strong')).toHaveText(['3', '2'])
    await expect(page.locator('.model-column')).not.toBeVisible()
    await expect(page.locator('.report-content')).not.toBeVisible()
    await page.screenshot({
      path: '/tmp/polymath-screen-simulation.png',
      fullPage: true,
    })
    await navigate(page, '해석 리포트')
    await expect(page.locator('.report-content')).toBeVisible()
    await expect(page.locator('.chart-section')).not.toBeVisible()
    await expect(page.getByRole('slider')).toHaveCount(0)
    await page.screenshot({
      path: '/tmp/polymath-screen-report.png',
      fullPage: true,
    })
    await navigate(page, '수식·파라미터')
    await expect(
      page.getByRole('textbox', { name: '방정식 입력' }),
    ).toHaveValue('x+y=5\nx-y=1')
    await page.screenshot({
      path: '/tmp/polymath-screen-model.png',
      fullPage: true,
    })
    await page.getByRole('button', { name: '모듈 홈', exact: true }).click()
    await expect(entry).toBeVisible()
    await page.reload()
    await expect(entry).toBeVisible()
    await entry.click()
    await expect(
      page.getByRole('textbox', { name: '방정식 입력' }),
    ).toHaveValue('x+y=5\nx-y=1')
    await page.setViewportSize({ width: 390, height: 844 })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
    ).toBe(false)
    await page.getByRole('button', { name: '모듈 홈', exact: true }).click()
    await page.screenshot({
      path: '/tmp/polymath-modules-home-mobile.png',
      fullPage: true,
    })
  })

  test('the reported three-variable model keeps exactly the same curve when swept a changes', async ({
    page,
  }) => {
    test.setTimeout(60000)
    await loadFixture(page, {
      mode: 'nonlinear',
      nonlinearSearch: 'auto',
      title: '고정 곡선 검증',
      description: '',
      source: 'f(x)=x^2+y*z-a+8\nf(y)=sin(y)+x^2-z-3\nf(z)=exp(z)+x*y-a',
      parameters: [
        { id: 'a', name: 'a', value: 64, min: 0, max: 800, step: 1 },
      ],
      sweepName: 'a',
    })
    const panel = page.locator(
      '.selected-simulation-workspace .simulation-panel',
    )
    await expect(panel.locator('.sc-curve')).toHaveCount(3)
    const before = await panel
      .locator('.sc-curve')
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('d')),
      )
    const current = await panel
      .locator('.simulation-panel-current strong')
      .innerText()
    await page
      .getByRole('slider', { name: 'a 슬라이더', exact: true })
      .fill('199')
    await expect(
      panel.locator('.simulation-panel-current strong'),
    ).not.toHaveText(current)
    await expect(page.locator('.engine-status')).toHaveText(
      /WebAssembly|JavaScript/,
    )
    await expect
      .poll(() =>
        panel
          .locator('.sc-curve')
          .evaluateAll((elements) =>
            elements.map((element) => element.getAttribute('d')),
          ),
      )
      .toEqual(before)
    await panel.locator('.solution-chart svg').scrollIntoViewIfNeeded()
    await page.screenshot({
      path: '/tmp/polymath-fixed-system-curve.png',
      fullPage: true,
    })
    await page
      .getByRole('slider', { name: 'a 슬라이더', exact: true })
      .fill('64')
    await expect(panel.locator('.simulation-panel-current strong')).toHaveText(
      current,
    )
    expect(
      await panel
        .locator('.sc-curve')
        .evaluateAll((elements) =>
          elements.map((element) => element.getAttribute('d')),
        ),
    ).toEqual(before)
  })

  test('all pinned curves remain fixed while shared values and hover markers change', async ({
    page,
  }) => {
    await loadFixture(page, INTERACTIVE_PROJECT)
    await pinFirstTwo(page)
    const curves = page.locator('.simulation-grid .sc-curve')
    const before = await curves.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('d')),
    )
    await page
      .getByRole('slider', { name: 'p 슬라이더', exact: true })
      .fill('9')
    await expect(page.locator('.simulation-panel-current strong')).toHaveText([
      'x = 3',
      'x = -3',
    ])
    expect(
      await curves.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('d')),
      ),
    ).toEqual(before)
    const panel = page.locator('.simulation-grid .simulation-panel').first()
    const svg = panel.locator('.solution-chart svg')
    await svg.scrollIntoViewIfNeeded()
    const first = await plotLocation(svg, (3.2 - 1) / 8)
    await page.mouse.move(first.x, first.y)
    await expect
      .poll(async () =>
        Number(await panel.locator('.sc-tooltip-heading strong').innerText()),
      )
      .toBeCloseTo(3.2, 4)
    const dot = panel.locator('.sc-active-dot').first()
    const x1 = Number(await dot.getAttribute('cx'))
    const second = await plotLocation(svg, (3.4 - 1) / 8)
    await page.mouse.move(second.x, second.y)
    await expect
      .poll(async () =>
        Number(await panel.locator('.sc-tooltip-heading strong').innerText()),
      )
      .toBeCloseTo(3.4, 4)
    const x2 = Number(await dot.getAttribute('cx'))
    expect(x2 - x1).toBeGreaterThan(5)
    expect(
      await curves.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('d')),
      ),
    ).toEqual(before)
    await expect(
      page.getByRole('slider', { name: 'p 슬라이더', exact: true }),
    ).toHaveValue('9')
  })

  test('clicking a graph commits a precise shared parameter and keeps the current marker after leaving', async ({
    page,
  }) => {
    await loadFixture(page, INTERACTIVE_PROJECT)
    await pinFirstTwo(page)
    const panel = page.locator('.simulation-grid .simulation-panel').first()
    const svg = panel.locator('.solution-chart svg')
    await svg.scrollIntoViewIfNeeded()
    const point = await plotLocation(svg, (3.4 - 1) / 8)
    await page.mouse.click(point.x, point.y)
    await expect
      .poll(async () =>
        Number(
          await page
            .getByRole('spinbutton', { name: 'p 값', exact: true })
            .inputValue(),
        ),
      )
      .toBeCloseTo(3.4, 5)
    await expect(page.locator('.simulation-panel-current strong')).toHaveText([
      'x = 1.8439089',
      'x = -1.8439089',
    ])
    await page.mouse.move(10, 10)
    await expect(panel.locator('.sc-current-dot')).toHaveCount(1)
    await expect(panel.locator('.sc-tooltip')).toHaveCount(0)
    await page
      .getByRole('slider', { name: 'p 슬라이더', exact: true })
      .fill('5')
    await expect(page.locator('.simulation-panel-current strong')).toHaveText([
      'x = 2.236068',
      'x = -2.236068',
    ])
  })

  test('wheel zoom is gradual, scoped to the activated graph and resettable without changing numbers', async ({
    page,
  }) => {
    await loadFixture(page, INTERACTIVE_PROJECT)
    await pinFirstTwo(page)
    const panels = page.locator('.simulation-grid .simulation-panel')
    const first = panels.nth(0)
    const second = panels.nth(1)
    const svg = first.locator('.solution-chart svg')
    await svg.scrollIntoViewIfNeeded()
    const before = await first.locator('.sc-curve').getAttribute('d')
    const otherBefore = await second.locator('.sc-curve').getAttribute('d')
    const inactive = await plotLocation(svg, 0.5)
    await page.mouse.move(inactive.x, inactive.y)
    await page.mouse.wheel(0, -120)
    await expect(first.locator('.sc-curve')).toHaveAttribute('d', before!)
    await svg.scrollIntoViewIfNeeded()
    const point = await plotLocation(svg, 0.5)
    await page.mouse.click(point.x, point.y)
    await expect(
      page.getByRole('spinbutton', { name: 'p 값', exact: true }),
    ).toHaveValue('5')
    await expect(page.locator('.simulation-panel-current strong')).toHaveText([
      'x = 2.236068',
      'x = -2.236068',
    ])
    await page.mouse.wheel(0, -120)
    await expect(first.locator('.sc-curve')).not.toHaveAttribute('d', before!)
    await expect(second.locator('.sc-curve')).toHaveAttribute('d', otherBefore!)
    await expect(
      page.getByRole('spinbutton', { name: 'p 값', exact: true }),
    ).toHaveValue('5')
    await first
      .getByRole('button', { name: '그래프 축 초기화', exact: true })
      .click()
    await expect(first.locator('.sc-curve')).toHaveAttribute('d', before!)
    const yTicks = await first
      .locator('.sc-axis-label[text-anchor="end"]')
      .allTextContents()
    await first
      .getByRole('combobox', { name: '그래프 확대 축', exact: true })
      .selectOption('x')
    const xZoomPoint = await plotLocation(svg, 0.5)
    await page.mouse.click(xZoomPoint.x, xZoomPoint.y)
    await page.mouse.wheel(0, -120)
    await expect(first.locator('.sc-curve')).not.toHaveAttribute('d', before!)
    await expect(first.locator('.sc-axis-label[text-anchor="end"]')).toHaveText(
      yTicks,
    )
    const zoomedX = (
      await first
        .locator('.sc-axis-label[text-anchor="middle"]')
        .allTextContents()
    ).map(Number)
    expect(zoomedX.at(-1)! - zoomedX[0]).toBeGreaterThan(5)
    expect(zoomedX.at(-1)! - zoomedX[0]).toBeLessThan(8)
    await first
      .getByRole('button', { name: '그래프 축 초기화', exact: true })
      .click()
    await expect(first.locator('.sc-curve')).toHaveAttribute('d', before!)
    await page.setViewportSize({ width: 390, height: 844 })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
    ).toBe(false)
    await svg.scrollIntoViewIfNeeded()
    await page.screenshot({
      path: '/tmp/polymath-interactive-mobile.png',
      fullPage: true,
    })
  })
})
