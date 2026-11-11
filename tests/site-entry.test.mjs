import { test } from 'node:test'
import assert from 'node:assert/strict'
import { openSite, launchSite } from '../scripts/open-site.mjs'
import { AUTH_VERSION } from '../server/sharing.mjs'
import { welcomePath } from '../server/gateway/response.js'
const env = {
  CODESPACE_NAME: 'entry-fixture',
  GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: 'app.github.dev',
  BROWSER: '/fixture/browser-helper',
}
const origin = 'https://entry-fixture-5181.app.github.dev'
function responses({
  version = AUTH_VERSION,
  site = origin,
  guard = 401,
  body,
} = {}) {
  return async (input, options) => {
    assert.equal(options.credentials, 'omit')
    assert.equal(options.redirect, 'manual')
    assert.equal(options.cache, 'no-store')
    assert.equal(new URL(input).hostname, '127.0.0.1')
    if (new URL(input).pathname === '/solver.wasm')
      return new Response('', { status: guard })
    return new Response(
      body ??
        JSON.stringify({
          service: 'IVC',
          accessControl: 'invite-only',
          version,
          instance: 'fixture-instance',
          origin: site,
        }),
    )
  }
}
test('opener uses the live protected server origin and passes a fresh complete URL without shell evaluation', async () => {
  const calls = []
  const run = async (...args) => {
    calls.push(args)
  }
  const report = await openSite(
    { ...env, APP_ORIGIN: 'https://broken.test/index.html' },
    run,
    responses(),
  )
  assert.equal(report.origin, origin)
  assert.equal(report.browser.requested, true)
  assert.equal(calls.length, 1)
  assert.equal(calls[0][0], env.BROWSER)
  assert.deepEqual(calls[0][1], [report.entryUrl])
  assert.equal(calls[0][2].shell, false)
  const url = new URL(report.entryUrl)
  assert.equal(url.origin, origin)
  assert.equal(url.pathname, '/')
  assert.match(url.searchParams.get('_ivc_page'), /^[\w-]{36}$/)
  const next = await openSite(env, run, responses())
  assert.notEqual(next.entryUrl, report.entryUrl)
})
test('an old running server cannot be confused with updated files on disk', async () => {
  let opened = false
  await assert.rejects(
    openSite(
      env,
      async () => {
        opened = true
      },
      responses({ version: 'auth-v4' }),
    ),
    /이전 버전.*Git 업데이트/,
  )
  assert.equal(opened, false)
})
test('unknown services, arbitrary origins and missing protection never open a browser', async () => {
  let opened = 0
  const run = async () => {
    opened++
  }
  for (const fake of [
    responses({ body: '<html>proxy</html>' }),
    responses({ body: 'x'.repeat(20000) }),
    responses({ body: '{}' }),
    responses({ site: 'https://other.example.test' }),
    responses({
      site: 'https://user:secret@entry-fixture-5181.app.github.dev/',
    }),
    responses({ guard: 200 }),
  ])
    await assert.rejects(openSite(env, run, fake))
  assert.equal(opened, 0)
})
test('browser helper failure still returns the safe URL without pretending the browser loaded it', async () => {
  const url = new URL(welcomePath('/'), origin).href
  assert.deepEqual(await launchSite(url, {}), {
    requested: false,
    reason: 'unavailable',
  })
  assert.deepEqual(
    await launchSite(url, env, async () => {
      throw Error('not available')
    }),
    { requested: false, reason: 'failed' },
  )
  for (const bad of [
    origin,
    origin + '/?token=bad',
    'https://user:secret@entry-fixture-5181.app.github.dev/' +
      welcomePath('/').slice(1),
    new URL(welcomePath('/'), origin).href + '#secret',
    'https://evil.example.test/;echo nope',
  ])
    await assert.rejects(launchSite(bad, env, async () => {}))
})

test('CLI opens the real running server through the browser helper with the entire URL intact', async () => {
  const { mkdtemp, writeFile, readFile, rm } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const { resolve } = await import('node:path')
  const { createServer } = await import('node:net')
  const { createAccessServer } = await import('../server/app.mjs')
  const { AccessStore } = await import('../server/store.mjs')
  const { promisify } = await import('node:util')
  const { execFile } = await import('node:child_process')
  const root = await mkdtemp(resolve(tmpdir(), 'ivc-open-cli-'))
  const helper = resolve(root, 'browser helper.mjs'),
    captured = resolve(root, 'requested-url.json')
  await writeFile(
    helper,
    `#!/usr/bin/env node\nimport { writeFileSync } from 'node:fs'; writeFileSync(${JSON.stringify(captured)}, JSON.stringify(process.argv.slice(2)));\n`,
    { mode: 0o700 },
  )
  const reservation = createServer()
  await new Promise((r) => reservation.listen(0, '127.0.0.1', r))
  const port = reservation.address().port
  await new Promise((r) => reservation.close(r))
  const liveOrigin = `http://127.0.0.1:${port}`
  const store = new AccessStore(':memory:')
  await store.bootstrap(
    'opener-owner@example.test',
    'Opener-fixture-password 66!',
  )
  const { server } = await createAccessServer({
    origin: liveOrigin,
    store,
    dist: root,
  })
  await new Promise((r) => server.listen(port, '127.0.0.1', r))
  try {
    const run = promisify(execFile)
    const output = await run(
      process.execPath,
      ['scripts/open-site.mjs', '--port', String(port)],
      {
        cwd: resolve('.'),
        env: {
          ...process.env,
          CODESPACE_NAME: '',
          GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: '',
          APP_ORIGIN: liveOrigin,
          BROWSER: helper,
        },
      },
    )
    const [opened] = JSON.parse(await readFile(captured, 'utf8'))
    const url = new URL(opened)
    assert.equal(url.origin, liveOrigin)
    assert.equal(url.pathname, '/')
    assert.match(url.searchParams.get('_ivc_page'), /^[\w-]{36}$/)
    assert.ok(output.stdout.includes(`Site: ${opened}`))
    assert.match(output.stdout, /auth-v5/)
    assert.equal(store.query('SELECT count(*) n FROM sessions').n, 0)
  } finally {
    server.closeAllConnections()
    await new Promise((r) => server.close(r))
    store.close()
    await rm(root, { recursive: true, force: true })
  }
})
test('diagnostics identify a still-running old server instead of calling it a stopped server', async () => {
  const { diagnoseCodespaces } = await import(
    '../scripts/diagnose-codespaces.mjs'
  )
  const report = await diagnoseCodespaces(
    { ...env, PORT: '5181' },
    async () =>
      new Response(
        JSON.stringify({
          service: 'IVC',
          version: 'auth-v4',
          accessControl: 'invite-only',
          instance: 'old',
        }),
      ),
  )
  assert.equal(report.local.state, 'outdated')
  assert.match(report.local.message, /Ctrl\+C.*auth-v5/)
})
