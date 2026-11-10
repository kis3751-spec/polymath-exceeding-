import { test, expect } from '@playwright/test'
test.use({ storageState: { cookies: [], origins: [] } })
const owner = {
  email: 'owner@example.test',
  password: 'IVC-browser-test-password!',
}
async function logIn(
  page: import('@playwright/test').Page,
  email = owner.email,
  password = owner.password,
) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Log in to IVC', exact: true }).click()
  const form = page.locator('#login-form')
  await form.getByLabel('Email', { exact: true }).fill(email)
  await form.getByLabel('Password', { exact: true }).fill(password)
  await form.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(page.locator('.account-bar')).toBeVisible()
}
test('welcome precedes login; direct calculation files are inaccessible', async ({
  page,
  request,
}) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    '관계까지',
  )
  await expect(page.locator('.module-grid')).toHaveCount(0)
  await expect(page.locator('#admin-panel')).toBeHidden()
  expect((await request.get('/solver.wasm')).status()).toBe(401)
  await page.goto('/calculator')
  await expect(page).toHaveURL('/')
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.screenshot({
    path: '/tmp/ivc-welcome-desktop.png',
    fullPage: true,
  })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390)
  await page.screenshot({ path: '/tmp/ivc-welcome-mobile.png', fullPage: true })
})
test('owner can invite, member activates and uses calculator; revocation locks an active browser', async ({
  page,
  browser,
}) => {
  await logIn(page)
  await page.getByRole('link', { name: 'Manage Access', exact: true }).click()
  const form = page.locator('#invite-user-form')
  await form.getByLabel('Allowed Email').fill('browser-member@example.test')
  await form.getByLabel('Admin Password').fill(owner.password)
  await form.getByRole('button', { name: 'Create invitation' }).click()
  await expect(page.locator('#invitation-link')).toHaveValue(/\/#invite=/)
  const url = await page.locator('#invitation-link').inputValue()
  expect(url).toContain('/#invite=')
  const memberContext = await browser.newContext({
    baseURL: new URL(url).origin,
  })
  const member = await memberContext.newPage()
  await member.goto(url)
  const activation = member.locator('#invite-form')
  await activation
    .getByLabel('Email', { exact: true })
    .fill('browser-member@example.test')
  await activation
    .getByLabel('New Password', { exact: true })
    .fill('Member-browser-password!')
  await activation
    .getByLabel('Confirm Password', { exact: true })
    .fill('Member-browser-password!')
  await activation.getByRole('button', { name: 'Activate account' }).click()
  await expect(member.locator('#feedback')).toContainText('활성화')
  const login = member.locator('#login-form')
  await login
    .getByLabel('Email', { exact: true })
    .fill('browser-member@example.test')
  await login
    .getByLabel('Password', { exact: true })
    .fill('Member-browser-password!')
  await login.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(member.locator('.module-grid')).toBeVisible()
  await expect(
    member.getByRole('link', { name: 'Manage Access', exact: true }),
  ).toHaveCount(0)
  expect((await memberContext.request.get('/api/admin/users')).status()).toBe(
    403,
  )
  await form.getByLabel('Admin Password').fill(owner.password)
  page.once('dialog', (d) => d.accept())
  await page
    .getByRole('button', { name: 'Revoke browser-member@example.test' })
    .click()
  await expect(page.locator('#user-list')).toContainText('Revoked')
  await member.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(member).toHaveURL(/expired=1/)
  await expect(member.locator('.module-grid')).toHaveCount(0)
  expect((await memberContext.request.get('/solver.wasm')).status()).toBe(401)
  await memberContext.close()
})
test('logout destroys session and protected resources remain unavailable on back navigation', async ({
  page,
  context,
}) => {
  await logIn(page)
  await page.getByRole('button', { name: 'Log out', exact: true }).click()
  await expect(page).toHaveURL('/')
  expect((await context.request.get('/api/session')).status()).toBe(401)
  await page.goBack()
  await expect(page.locator('.module-grid')).toHaveCount(0)
})

test('an empty proxy 404 explains the login failure without exposing the calculator', async ({
  page,
}) => {
  await page.route('**/ivc-auth/login', (route) =>
    route.fulfill({ status: 404, body: '' }),
  )
  await page.goto('/')
  await page.getByRole('button', { name: 'Log in to IVC', exact: true }).click()
  const form = page.locator('#login-form')
  await form.getByLabel('Email', { exact: true }).fill(owner.email)
  await form.getByLabel('Password', { exact: true }).fill(owner.password)
  await form.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(page.locator('#feedback')).toContainText('HTTP 404')
  await expect(page.locator('#feedback')).not.toContainText('Unexpected end')
  await expect(page.locator('.module-grid')).toHaveCount(0)
})

test('login never forwards credentials through an HTTP redirect', async ({
  page,
}) => {
  let forwarded = false
  await page.route('**/unexpected-login-target', (route) => {
    forwarded = true
    return route.fulfill({ status: 200, body: '{}' })
  })
  await page.route('**/ivc-auth/login', (route) =>
    route.fulfill({
      status: 307,
      headers: { Location: '/unexpected-login-target' },
    }),
  )
  await page.goto('/')
  await page.getByRole('button', { name: 'Log in to IVC', exact: true }).click()
  const form = page.locator('#login-form')
  await form.getByLabel('Email', { exact: true }).fill(owner.email)
  await form.getByLabel('Password', { exact: true }).fill(owner.password)
  await form.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(page.locator('#feedback')).toContainText('리디렉션')
  expect(forwarded).toBe(false)
  await expect(page.locator('.module-grid')).toHaveCount(0)
})

test('login and calculator work when a forwarder returns empty 404 for the /api namespace', async ({
  page,
}) => {
  await page.route('**/api/**', (route) =>
    route.fulfill({ status: 404, body: '' }),
  )
  const loginRequest = page.waitForRequest(
    (request) =>
      new URL(request.url()).pathname === '/ivc-auth/login' &&
      request.method() === 'POST',
  )
  await logIn(page)
  await loginRequest
  await expect(page.locator('.module-grid')).toBeVisible()
  await page.getByRole('button', { name: 'Log out', exact: true }).click()
  await expect(page).toHaveURL('/')
})
