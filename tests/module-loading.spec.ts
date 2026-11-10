import { test, expect } from '@playwright/test'
test('every scientific worker loads as one authenticated bundle under Secure session cookies', async ({
  page,
  context,
  browser,
  baseURL,
}) => {
  test.skip(
    !baseURL?.startsWith('https:'),
    'Run with playwright.https.config.ts to exercise Secure cookies.',
  )
  await page.addInitScript(() => localStorage.clear())
  expect(
    (await context.cookies()).some(
      (c) => c.name === '__Host-ivc-session' && c.secure && c.httpOnly,
    ),
  ).toBe(true)
  const workerUrls = new Set<string>(),
    splitEngineRequests: string[] = [],
    failedAssets: string[] = []
  context.on('request', (request) => {
    const path = new URL(request.url()).pathname
    if (/\/assets\/(?:solver\.)?worker-/.test(path))
      workerUrls.add(request.url())
    if (
      /\/assets\/(ode|fitting|integration|optimization|expression|nonlinear-parser)-/.test(
        path,
      )
    )
      splitEngineRequests.push(path)
  })
  context.on('response', (response) => {
    if (
      new URL(response.url()).pathname.startsWith('/assets/') &&
      response.status() >= 400
    )
      failedAssets.push(
        `${response.status()} ${new URL(response.url()).pathname}`,
      )
  })
  for (const [card, variant] of [
    ['Differential Equations', ''],
    ['Curve Fitting', ''],
    ['Curve Fitting', 'multilinear'],
    ['Nonlinear Fitting', ''],
    ['Discrete Integration', ''],
    ['Optimum Finder', ''],
    ['Optimum Finder', 'lsq'],
  ]) {
    await page.goto('/calculator')
    await page
      .getByRole('button', { name: `${card} 열기`, exact: true })
      .click()
    if (variant)
      await page
        .getByRole('combobox', {
          name:
            variant === 'multilinear'
              ? 'Regression Module'
              : 'Optimization Module',
          exact: true,
        })
        .selectOption(variant)
    await page
      .locator('.scientific-navigation')
      .getByRole('button', { name: /Simulation/ })
      .click()
    await expect(page.locator('.scientific-results')).toHaveAttribute(
      'aria-busy',
      'false',
    )
    await expect(page.locator('.science-error')).toHaveCount(0)
    await expect(page.locator('.scientific-chart-stage svg')).toBeVisible()
  }
  expect(failedAssets).toEqual([])
  expect(splitEngineRequests).toEqual([])
  expect(workerUrls.size).toBeGreaterThan(0)
  const anonymous = await browser.newContext({
    ignoreHTTPSErrors: true,
    storageState: { cookies: [], origins: [] },
  })
  expect((await anonymous.request.get([...workerUrls][0])).status()).toBe(401)
  expect(
    (
      await anonymous.request.get(new URL('/solver.wasm', baseURL).href)
    ).status(),
  ).toBe(401)
  await anonymous.close()
})
