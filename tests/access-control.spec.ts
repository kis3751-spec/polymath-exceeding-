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
  await expect(page.locator('#sharing-state')).toHaveText('Local only')
  await page
    .locator('#admin-panel')
    .screenshot({ path: '/tmp/ivc-sharing-desktop.png' })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390)
  await page
    .locator('#admin-panel')
    .screenshot({ path: '/tmp/ivc-sharing-mobile.png' })
  await page.setViewportSize({ width: 1440, height: 1100 })
  const form = page.locator('#invite-user-form')
  await form.getByLabel('Allowed Email').fill('browser-member@example.test')
  await form.getByLabel('Admin Password').fill(owner.password)
  await form.getByRole('button', { name: 'Create invitation' }).click()
  await expect(page.locator('#invitation-link')).toHaveValue(/\/#invite=/)
  const url = await page.locator('#invitation-link').inputValue()
  expect(url).toContain('/#invite=')
  const memberContext = await browser.newContext({
    baseURL: new URL(url).origin,
    storageState: { cookies: [], origins: [] },
    ignoreHTTPSErrors: true,
  })
  const member = await memberContext.newPage()
  await member.goto(url)
  const activation = member.locator('#invite-form')
  await expect(activation.getByLabel('Email', { exact: true })).toHaveValue(
    'browser-member@example.test',
  )
  await expect(activation.getByLabel('Email', { exact: true })).toHaveAttribute(
    'readonly',
    '',
  )
  await expect(member).toHaveURL(new URL(url).origin + '/')
  await member.reload()
  await expect(activation.getByLabel('Email', { exact: true })).toHaveValue(
    'browser-member@example.test',
  )
  await activation
    .getByLabel('New Password', { exact: true })
    .fill('Member-browser-password!')
  await activation
    .getByLabel('Confirm Password', { exact: true })
    .fill('Member-browser-password!')
  await activation.getByRole('button', { name: 'Activate account' }).click()
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

test('browser login remains protected when a local forwarder rewrites the Origin header', async ({
  page,
}) => {
  await page.route('**/ivc-auth/**', (route) => {
    const request = route.request()
    if (request.method() !== 'POST') return route.continue()
    const url = new URL(request.url())
    return route.continue({
      headers: { ...request.headers(), origin: `http://localhost:${url.port}` },
    })
  })
  await logIn(page)
  await expect(page.locator('.module-grid')).toBeVisible()
  await page.getByRole('button', { name: 'Log out', exact: true }).click()
  await expect(page).toHaveURL('/')
})

test('invitation code recovers a lost link, owner can reset an active account, and old credentials stop working', async ({
  page,
  browser,
}) => {
  await logIn(page)
  await page.getByRole('link', { name: 'Manage Access', exact: true }).click()
  await expect(page.locator('#sharing-state')).toHaveText('Local only')
  const form = page.locator('#invite-user-form')
  const email = 'code-member@example.test'
  await form.getByLabel('Allowed Email').fill(email)
  await form.getByLabel('Admin Password').fill(owner.password)
  await form.getByRole('button', { name: 'Create invitation' }).click()
  await expect(page.locator('#invitation-code')).toHaveValue(/^[\w-]{43}$/)
  const code = await page.locator('#invitation-code').inputValue()
  const memberContext = await browser.newContext({
    baseURL: new URL(page.url()).origin,
    storageState: { cookies: [], origins: [] },
    ignoreHTTPSErrors: true,
  })
  const member = await memberContext.newPage()
  await member.goto('/')
  await member
    .getByRole('button', { name: 'Log in to IVC', exact: true })
    .click()
  await member.getByRole('button', { name: 'Have an invitation code?' }).click()
  await member.locator('#invitation-code-form input').fill(code)
  await member
    .getByRole('button', { name: 'Open invitation', exact: true })
    .click()
  const activation = member.locator('#invite-form')
  await expect(activation.getByLabel('Email', { exact: true })).toHaveValue(
    email,
  )
  await activation
    .getByLabel('New Password', { exact: true })
    .fill('Code-member-password 51!')
  await activation
    .getByLabel('Confirm Password', { exact: true })
    .fill('Code-member-password 51!')
  await activation.getByRole('button', { name: 'Activate account' }).click()
  await expect(member.locator('.module-grid')).toBeVisible()
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await expect(page.locator('#user-list')).toContainText('Active')
  await form.getByLabel('Admin Password').fill(owner.password)
  page.once('dialog', (d) => d.accept())
  await page
    .getByRole('button', { name: `Reset ${email}`, exact: true })
    .click()
  await expect(page.locator('#invitation-code')).not.toHaveValue(code)
  const newUrl = await page.locator('#invitation-link').inputValue()
  expect((await memberContext.request.get('/ivc-auth/session')).status()).toBe(
    401,
  )
  const denied = await memberContext.request.post('/ivc-auth/login', {
    headers: { Origin: new URL(page.url()).origin },
    data: { email, password: 'Code-member-password 51!' },
  })
  expect(denied.status()).toBe(401)
  await member.goto(newUrl)
  await expect(activation.getByLabel('Email', { exact: true })).toHaveValue(
    email,
  )
  await activation
    .getByLabel('New Password', { exact: true })
    .fill('Replacement-password 52!')
  await activation
    .getByLabel('Confirm Password', { exact: true })
    .fill('Replacement-password 52!')
  await activation.getByRole('button', { name: 'Activate account' }).click()
  await expect(member.locator('.module-grid')).toBeVisible()
  const old = await memberContext.request.post('/ivc-auth/begin-invite', {
    headers: { Origin: new URL(page.url()).origin },
    data: { token: code },
  })
  expect(old.status()).toBe(409) // An active account cannot be replaced by an invitation.
  await memberContext.close()
})

test('reissued and expired invitations show recovery instructions instead of an empty account setup', async ({
  page,
  browser,
}) => {
  await logIn(page)
  await page.getByRole('link', { name: 'Manage Access', exact: true }).click()
  const form = page.locator('#invite-user-form'),
    email = 'reissue-browser@example.test'
  await form.getByLabel('Allowed Email').fill(email)
  await form.getByLabel('Admin Password').fill(owner.password)
  await form.getByRole('button', { name: 'Create invitation' }).click()
  await expect(page.locator('#invitation-link')).toHaveValue(/#invite=/)
  const oldUrl = await page.locator('#invitation-link').inputValue()
  await form.getByLabel('Admin Password').fill(owner.password)
  page.once('dialog', (d) => d.accept())
  await page
    .getByRole('button', { name: `Reissue ${email}`, exact: true })
    .click()
  await expect(page.locator('#invitation-link')).not.toHaveValue(oldUrl)
  const context = await browser.newContext({
    baseURL: new URL(page.url()).origin,
    storageState: { cookies: [], origins: [] },
    ignoreHTTPSErrors: true,
  })
  const member = await context.newPage()
  await member.goto(oldUrl)
  await expect(member.locator('#feedback')).toContainText('새 초대')
  await expect(member.locator('#invite-panel')).toBeHidden()
  await expect(
    member.getByRole('button', { name: 'Have an invitation code?' }),
  ).toBeVisible()
  await context.close()
})

test('a browser that cannot retain the login cookie gets an explanation before calculator navigation', async ({
  page,
}) => {
  await page.route('**/ivc-auth/session', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        error: '로그인이 필요합니다.',
        code: 'SESSION_REQUIRED',
      }),
    }),
  )
  await page.goto('/')
  await page.getByRole('button', { name: 'Log in to IVC', exact: true }).click()
  const form = page.locator('#login-form')
  await form.getByLabel('Email', { exact: true }).fill(owner.email)
  await form.getByLabel('Password', { exact: true }).fill(owner.password)
  await form.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(page.locator('#feedback')).toContainText('쿠키')
  await expect(page).toHaveURL('/')
  await expect(page.locator('.module-grid')).toHaveCount(0)
})

test('proxy JSON without a validated session cannot be treated as a successful login', async ({
  page,
}) => {
  await page.route('**/ivc-auth/session', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
  )
  await page.goto('/')
  await expect(page.locator('#feedback')).toContainText('세션 응답')
  const form = page.locator('#login-form')
  await form.getByLabel('Email', { exact: true }).fill(owner.email)
  await form.getByLabel('Password', { exact: true }).fill(owner.password)
  await form.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(page.locator('#feedback')).toContainText('세션 응답')
  await expect(page).toHaveURL('/')
  await expect(page.locator('.module-grid')).toHaveCount(0)
})

test('page diagnostic failure cannot block owner invitation, member activation or account reset', async ({
  page,
  browser,
}) => {
  await page.route('**/ivc-auth/admin/sharing', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        state: 'partial',
        reachable: false,
        origin: new URL(route.request().url()).origin,
        message:
          '현재 IVC 상태 API에 연결했습니다. 페이지 검사는 완료하지 못했지만 초대 발급은 가능합니다.',
        checks: [
          { path: '/ivc-auth/status', status: 200, ok: true },
          { path: '/', status: 200, ok: false, issue: 'content' },
        ],
      }),
    }),
  )
  await logIn(page)
  await page.getByRole('link', { name: 'Manage Access', exact: true }).click()
  await expect(page.locator('#sharing-state')).toHaveText('API connected')
  await page.getByText('View diagnostic details', { exact: true }).click()
  await expect(page.locator('#sharing-checks')).toContainText('예상한 페이지')
  await expect(page.locator('#sharing-checks')).toContainText('HTTP 200')
  await page
    .locator('#admin-panel')
    .screenshot({ path: '/tmp/ivc-advisory-sharing.png' })
  const form = page.locator('#invite-user-form'),
    email = 'diagnostic-member@example.test'
  await form.getByLabel('Allowed Email').fill(email)
  await form.getByLabel('Admin Password').fill(owner.password)
  await form.getByRole('button', { name: 'Create invitation' }).click()
  await expect(page.locator('#invitation-code')).toHaveValue(/^[\w-]{43}$/)
  const original = await page.locator('#invitation-code').inputValue()
  const context = await browser.newContext({
    baseURL: new URL(page.url()).origin,
    storageState: { cookies: [], origins: [] },
    ignoreHTTPSErrors: true,
  })
  try {
    const member = await context.newPage()
    async function activate(password: string) {
      await member.goto(await page.locator('#invitation-link').inputValue())
      const activation = member.locator('#invite-form')
      await expect(activation.getByLabel('Email', { exact: true })).toHaveValue(
        email,
      )
      await activation
        .getByLabel('New Password', { exact: true })
        .fill(password)
      await activation
        .getByLabel('Confirm Password', { exact: true })
        .fill(password)
      await activation.getByRole('button', { name: 'Activate account' }).click()
      await expect(member.locator('.module-grid')).toBeVisible()
      expect((await context.request.get('/solver.wasm')).status()).toBe(200)
      expect(
        (await context.request.get('/ivc-auth/admin/users')).status(),
      ).toBe(403)
    }
    await activate('Advisory-member-password 27!')
    await page.getByRole('button', { name: 'Refresh', exact: true }).click()
    await expect(
      page.getByRole('button', { name: `Reset ${email}`, exact: true }),
    ).toBeVisible()
    await form.getByLabel('Admin Password').fill(owner.password)
    page.once('dialog', (dialog) => dialog.accept())
    await page
      .getByRole('button', { name: `Reset ${email}`, exact: true })
      .click()
    await expect(page.locator('#invitation-code')).not.toHaveValue(original)
    expect((await context.request.get('/ivc-auth/session')).status()).toBe(401)
    await activate('Reset-advisory-password 28!')
    await expect(page.locator('#sharing-state')).toHaveText('API connected')
  } finally {
    await context.close()
  }
})

test.describe('session recovery', () => {
  test('refreshing calculator and access pages restores the same login, including a reopened browser context', async ({
    page,
    context,
    browser,
  }) => {
    await logIn(page)
    await page.reload()
    await expect(page.locator('.account-bar')).toContainText(owner.email)
    await page.getByRole('link', { name: 'Manage Access', exact: true }).click()
    for (let i = 0; i < 3; i++) {
      await page.reload()
      await expect(page.locator('#admin-panel')).toBeVisible()
      await expect(page.locator('#user-list')).toContainText(owner.email)
      await expect(page.locator('#access-panel')).toBeHidden()
    }
    const restored = await browser.newContext({
      baseURL: new URL(page.url()).origin,
      storageState: await context.storageState(),
      ignoreHTTPSErrors: true,
    })
    try {
      const reopened = await restored.newPage()
      await reopened.goto('/?manage=1')
      await expect(reopened.locator('#admin-panel')).toBeVisible()
      await expect(reopened.locator('#user-list')).toContainText(owner.email)
    } finally {
      await restored.close()
    }
  })

  test('a valid old cookie cannot block re-login through rewritten Origin and subsequent access edits', async ({
    page,
  }) => {
    await logIn(page)
    await page.route('**/ivc-auth/**', (route) => {
      const request = route.request(),
        url = new URL(request.url())
      return request.method() === 'POST'
        ? route.continue({
            headers: {
              ...request.headers(),
              origin: `http://localhost:${url.port}`,
            },
          })
        : route.continue()
    })
    let first = true
    await page.route('**/ivc-auth/session', (route) => {
      if (!first) return route.continue()
      first = false
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: '로그인이 필요합니다.',
          code: 'SESSION_REQUIRED',
        }),
      })
    })
    await page.goto('/')
    await page
      .getByRole('button', { name: 'Log in to IVC', exact: true })
      .click()
    const login = page.locator('#login-form')
    await login.getByLabel('Email', { exact: true }).fill(owner.email)
    await login.getByLabel('Password', { exact: true }).fill(owner.password)
    await login.getByRole('button', { name: 'Log in', exact: true }).click()
    await expect(page.locator('.account-bar')).toBeVisible()
    await page.getByRole('link', { name: 'Manage Access', exact: true }).click()
    const form = page.locator('#invite-user-form')
    await form.getByLabel('Allowed Email').fill('relogin-member@example.test')
    await form.getByLabel('Admin Password').fill(owner.password)
    await form.getByRole('button', { name: 'Create invitation' }).click()
    await expect(page.locator('#invitation-code')).toHaveValue(/^[\w-]{43}$/)
    await expect(page.locator('#admin-panel')).toBeVisible()
  })

  test('another tab renewing the login does not break owner mutations with old in-memory CSRF', async ({
    page,
    context,
  }) => {
    await logIn(page)
    await page.getByRole('link', { name: 'Manage Access', exact: true }).click()
    await expect(page.locator('#user-list')).toContainText(owner.email)
    const second = await context.newPage()
    await second.goto('/')
    await second.evaluate(
      async ({ url, credentials }) => {
        const client = await import(url)
        await client.postAuth('/api/login', credentials)
      },
      { url: '/auth-client.js', credentials: owner },
    )
    await second.close()
    const form = page.locator('#invite-user-form')
    await form.getByLabel('Allowed Email').fill('other-tab-member@example.test')
    await form.getByLabel('Admin Password').fill(owner.password)
    await form.getByRole('button', { name: 'Create invitation' }).click()
    await expect(page.locator('#invitation-code')).toHaveValue(/^[\w-]{43}$/)
    await expect(page.locator('#admin-panel')).toBeVisible()
  })

  test('a transient proxy 401 covers the workspace and recovers without logout or losing the model', async ({
    page,
    context,
  }) => {
    await logIn(page)
    await page
      .getByRole('button', { name: 'Equation Solver 열기', exact: true })
      .click()
    const editor = page.getByRole('textbox', {
      name: '방정식 입력',
      exact: true,
    })
    await editor.fill('2*x=6')
    let failures = 2
    await page.route('**/ivc-auth/session', (route) =>
      failures-- > 0
        ? route.fulfill({
            status: 401,
            contentType: 'text/html',
            body: '<html>Temporary proxy error</html>',
          })
        : route.continue(),
    )
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect(page.locator('.account-reconnect')).toBeVisible()
    await expect(editor).toHaveValue('2*x=6')
    await expect(page).toHaveURL(/\/calculator$/)
    await page.getByRole('button', { name: '다시 확인', exact: true }).click()
    await expect(page.locator('.account-reconnect')).toBeHidden({
      timeout: 10000,
    })
    await expect(editor).toHaveValue('2*x=6')
    await expect(page.locator('.account-bar')).toContainText(owner.email)
    expect((await context.request.get('/ivc-auth/session')).status()).toBe(200)
  })
})
