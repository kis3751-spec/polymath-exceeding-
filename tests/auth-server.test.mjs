import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm, stat, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { createServer } from 'node:net'
import { request as httpRequest } from 'node:http'
import { createAccessServer } from '../server/app.mjs'
import { AccessStore, digest } from '../server/store.mjs'
const ownerEmail = 'owner@example.test',
  password = 'Test-only owner password 946!'
let app, root, origin, ownerCookie, csrf, memberCookie, memberId, invite
async function request(path, body, options = {}) {
  return fetch(origin + path, {
    method: body ? 'POST' : 'GET',
    redirect: 'manual',
    headers: {
      ...(body ? { 'Content-Type': 'application/json', Origin: origin } : {}),
      ...(options.cookie ? { Cookie: options.cookie } : {}),
      ...(options.csrf ? { 'X-CSRF-Token': options.csrf } : {}),
      ...options.headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}
async function login(email = ownerEmail, pass = password) {
  const response = await request('/api/login', { email, password: pass })
  assert.equal(response.status, 200)
  return response.headers.get('set-cookie').split(';')[0]
}
const admin = (path, body = {}) =>
  request(
    path,
    { currentPassword: password, ...body },
    { cookie: ownerCookie, csrf },
  )
before(async () => {
  root = await mkdtemp(resolve(tmpdir(), 'ivc-auth-'))
  await mkdir(resolve(root, 'dist/assets'), { recursive: true })
  await writeFile(
    resolve(root, 'dist/index.html'),
    '<main>PRIVATE CALCULATOR</main>',
  )
  await writeFile(
    resolve(root, 'dist/assets/private.js'),
    'private calculation code',
  )
  await writeFile(resolve(root, 'dist/solver.wasm'), 'private wasm')
  const portServer = createServer()
  await new Promise((r) => portServer.listen(0, '127.0.0.1', r))
  const port = portServer.address().port
  await new Promise((r) => portServer.close(r))
  origin = `http://127.0.0.1:${port}`
  const store = new AccessStore(resolve(root, 'data/access.sqlite'))
  await store.bootstrap(ownerEmail, password)
  app = await createAccessServer({ origin, store, dist: resolve(root, 'dist') })
  await new Promise((r) => app.server.listen(port, '127.0.0.1', r))
})
after(async () => {
  if (app) {
    app.server.closeAllConnections()
    await new Promise((r) => app.server.close(r))
    app.store.close()
  }
  if (root) await rm(root, { recursive: true, force: true })
})
test('public welcome is accessible, with hardening headers and no inline script', async () => {
  const r = await request('/')
  assert.equal(r.status, 200)
  const text = await r.text()
  assert.match(text, /Interaction Visual Calculator/)
  assert.doesNotMatch(text, /PRIVATE CALCULATOR/)
  assert.match(
    r.headers.get('content-security-policy'),
    /frame-ancestors 'none'/,
  )
  assert.match(r.headers.get('cache-control'), /no-store/)
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff')
})
test('calculator document, JS, WASM, source and alternate paths are gated', async () => {
  for (const path of [
    '/assets/private.js',
    '/solver.wasm',
    '/src/main.tsx',
    '/@vite/client',
    '/dist/index.html',
    '/server/store.mjs',
    '/.env',
    '/api/admin/users',
  ])
    assert.equal((await request(path)).status, 401, path)
  const r = await request('/calculator')
  assert.equal(r.status, 303)
  assert.equal(r.headers.get('location'), '/')
})
test('forged cookies, role fields, authorization headers and forwarded identity do not grant access', async () => {
  assert.equal(
    (
      await request('/assets/private.js', null, {
        headers: {
          Cookie: 'ivc-local-session=owner',
          Authorization: 'Bearer admin',
          'X-Forwarded-User': ownerEmail,
        },
      })
    ).status,
    401,
  )
  assert.equal(
    (
      await request('/api/register', {
        email: 'new@example.test',
        password,
        role: 'owner',
      })
    ).status,
    401,
  )
})
test('login is generic for missing account and wrong password', async () => {
  const a = await request('/api/login', {
      email: 'missing@example.test',
      password,
    }),
    b = await request('/api/login', {
      email: ownerEmail,
      password: 'incorrect',
    })
  assert.equal(a.status, 401)
  assert.deepEqual(await a.json(), await b.json())
})
test('cross-origin, absent Origin and non-JSON login are rejected', async () => {
  assert.equal(
    (
      await request(
        '/api/login',
        { email: ownerEmail, password },
        { headers: { Origin: 'https://evil.test' } },
      )
    ).status,
    403,
  )
  assert.equal(
    (
      await request(
        '/api/login',
        { email: ownerEmail, password },
        { headers: { Origin: '' } },
      )
    ).status,
    403,
  )
  assert.equal(
    (
      await request(
        '/api/login',
        { email: ownerEmail, password },
        { headers: { 'Content-Type': 'text/plain' } },
      )
    ).status,
    415,
  )
})
test('owner login creates opaque HttpOnly Strict cookie and server-side hashed session', async () => {
  ownerCookie = await login()
  const r = await request('/api/session', null, { cookie: ownerCookie })
  const data = await r.json()
  csrf = data.csrf
  assert.equal(data.user.role, 'owner')
  assert.equal(data.user.email, ownerEmail)
  assert.equal(ownerCookie.split('=')[1].length, 43)
  const raw = app.store.db.prepare('SELECT * FROM sessions').get()
  assert.notEqual(raw.hash, ownerCookie.split('=')[1])
  assert.equal(raw.hash, digest(ownerCookie.split('=')[1]))
  const cookie = (
    await request('/api/login', { email: ownerEmail, password })
  ).headers.get('set-cookie')
  assert.match(cookie, /HttpOnly/)
  assert.match(cookie, /SameSite=Strict/)
  assert.doesNotMatch(cookie, /Domain=/)
})
test('authenticated calculator and WASM are served without caching', async () => {
  for (const path of ['/calculator', '/assets/private.js', '/solver.wasm']) {
    const r = await request(path, null, { cookie: ownerCookie })
    assert.equal(r.status, 200)
    assert.match(r.headers.get('cache-control'), /no-store/)
  }
  assert.equal(
    (await request('/solver.wasm', null, { cookie: ownerCookie })).headers.get(
      'content-type',
    ),
    'application/wasm',
  )
})
test('mutations require CSRF and owner password step-up', async () => {
  assert.equal(
    (
      await request(
        '/api/admin/invite',
        { email: 'member@example.test', currentPassword: password },
        { cookie: ownerCookie },
      )
    ).status,
    403,
  )
  assert.equal(
    (
      await admin('/api/admin/invite', {
        email: 'member@example.test',
        currentPassword: 'wrong',
      })
    ).status,
    403,
  )
})
test('owner creates one-use hashed invitation; no password or token is returned in user lists', async () => {
  const r = await admin('/api/admin/invite', { email: 'Member@Example.test' })
  assert.equal(r.status, 201)
  invite = new URL((await r.json()).url).hash.slice('#invite='.length)
  assert.equal(
    app.store.db.prepare('SELECT hash FROM invites').get().hash,
    digest(invite),
  )
  const users = await (
    await request('/api/admin/users', null, { cookie: ownerCookie })
  ).json()
  memberId = users.users.find((u) => u.email === 'member@example.test').id
  assert.ok(users.users.every((u) => !('password' in u) && !('hash' in u)))
})
test('invite must match email, is single-use, and cannot grant owner role', async () => {
  assert.equal(
    (
      await request('/api/accept-invite', {
        token: invite,
        email: 'other@example.test',
        password,
      })
    ).status,
    400,
  )
  assert.equal(
    (
      await request('/api/accept-invite', {
        token: invite,
        email: 'member@example.test',
        password,
        role: 'owner',
      })
    ).status,
    200,
  )
  assert.equal(
    (
      await request('/api/accept-invite', {
        token: invite,
        email: 'member@example.test',
        password,
      })
    ).status,
    400,
  )
  memberCookie = await login('member@example.test')
  const data = await (
    await request('/api/session', null, { cookie: memberCookie })
  ).json()
  assert.equal(data.user.role, 'member')
})
test('member cannot read allowlist, invite, revoke, or change owner role', async () => {
  const data = await (
    await request('/api/session', null, { cookie: memberCookie })
  ).json()
  assert.equal(
    (await request('/api/admin/users', null, { cookie: memberCookie })).status,
    403,
  )
  for (const path of [
    '/api/admin/invite',
    '/api/admin/revoke',
    '/api/admin/promote',
  ])
    assert.equal(
      (
        await request(
          path,
          {
            email: 'evil@example.test',
            id: app.store.owner(),
            currentPassword: password,
          },
          { cookie: memberCookie, csrf: data.csrf },
        )
      ).status,
      403,
    )
})
test('owner cannot revoke or re-invite the highest administrator', async () => {
  assert.equal(
    (await admin('/api/admin/revoke', { id: app.store.owner() })).status,
    400,
  )
  assert.equal(
    (await admin('/api/admin/invite', { email: ownerEmail })).status,
    409,
  )
})
test('revocation immediately invalidates existing member sessions and login', async () => {
  assert.equal((await admin('/api/admin/revoke', { id: memberId })).status, 200)
  assert.equal(
    (await request('/assets/private.js', null, { cookie: memberCookie }))
      .status,
    401,
  )
  assert.equal(
    (await request('/api/login', { email: 'member@example.test', password }))
      .status,
    401,
  )
})
test('old invite does not re-enable revoked user; fresh invite required', async () => {
  assert.equal(
    (
      await request('/api/accept-invite', {
        token: invite,
        email: 'member@example.test',
        password,
      })
    ).status,
    400,
  )
  const r = await admin('/api/admin/invite', { email: 'member@example.test' })
  assert.equal(r.status, 201)
  assert.notEqual(new URL((await r.json()).url).hash.slice(8), invite)
  assert.equal(
    (await request('/api/login', { email: 'member@example.test', password }))
      .status,
    401,
  )
})
test('invalid traversal, source maps and arbitrary files are never served', async () => {
  for (const path of [
    '/assets/private.js.map',
    '/.git/config',
    '/server/gateway/../store.mjs',
    '/assets/%5cprivate.js',
    '/%00',
  ]) {
    const r = await request(path, null, { cookie: ownerCookie })
    assert.ok([400, 404].includes(r.status), path)
  }
})
test('session idle and absolute expiry are enforced by server; status polling does not extend idle time', async () => {
  const user = app.store.user(app.store.owner()),
    session = app.store.createSession(user)
  const before = app.store.query(
    'SELECT touched FROM sessions WHERE hash=?',
    digest(session.token),
  ).touched
  app.store.session(session.token)
  assert.equal(
    app.store.query(
      'SELECT touched FROM sessions WHERE hash=?',
      digest(session.token),
    ).touched,
    before,
  )
  app.store.run(
    'UPDATE sessions SET touched=? WHERE hash=?',
    Date.now() - 31 * 60_000,
    digest(session.token),
  )
  assert.equal(app.store.session(session.token), null)
  const other = app.store.createSession(user)
  app.store.run(
    'UPDATE sessions SET expires=0 WHERE hash=?',
    digest(other.token),
  )
  assert.equal(app.store.session(other.token), null)
})
test('logout invalidates saved cookie and CSRF token', async () => {
  assert.equal(
    (await request('/api/logout', {}, { cookie: ownerCookie, csrf })).status,
    200,
  )
  assert.equal(
    (await request('/api/session', null, { cookie: ownerCookie })).status,
    401,
  )
  ownerCookie = await login()
  csrf = (
    await (await request('/api/session', null, { cookie: ownerCookie })).json()
  ).csrf
})
test('password change revokes all sessions and old password fails', async () => {
  const r = await admin('/api/change-password', {
    newPassword: 'Changed-test-password 872!',
  })
  assert.equal(r.status, 200)
  assert.equal(
    (await request('/api/session', null, { cookie: ownerCookie })).status,
    401,
  )
  assert.equal(
    (await request('/api/login', { email: ownerEmail, password })).status,
    401,
  )
  ownerCookie = await login(ownerEmail, 'Changed-test-password 872!')
})
test('SQL input is treated as data, request body bounded, and host checked', async () => {
  assert.equal(
    (await request('/api/login', { email: "' OR 1=1 --", password })).status,
    401,
  )
  assert.equal(
    (
      await request('/api/login', {
        email: ownerEmail,
        password: 'x'.repeat(9000),
      })
    ).status,
    413,
  )
  assert.equal(
    await new Promise((resolve, reject) => {
      const req = httpRequest(
        origin + '/',
        { headers: { Host: 'evil.test' } },
        (res) => {
          res.resume()
          resolve(res.statusCode)
        },
      )
      req.on('error', reject)
      req.end()
    }),
    421,
  )
})
test('database stores only salted password hashes and file permissions are private', async () => {
  assert.equal(
    (await stat(resolve(root, 'data/access.sqlite'))).mode & 0o777,
    0o600,
  )
  assert.equal((await stat(resolve(root, 'data'))).mode & 0o777, 0o700)
  const raw = (await readFile(resolve(root, 'data/access.sqlite'))).toString(
    'utf8',
  )
  assert.ok(!raw.includes(password))
  assert.match(app.store.byEmail(ownerEmail).password, /^scrypt\$/)
})
test('bootstrap cannot overwrite an established owner', async () => {
  await assert.rejects(
    app.store.bootstrap('attacker@example.test', password),
    /이미/,
  )
  assert.equal(app.store.byEmail(ownerEmail).role, 'owner')
})
test('rate limiting survives spoofed X-Forwarded-For and blocks repeated guesses', async () => {
  app.store.run('DELETE FROM limits')
  for (let i = 0; i < 12; i++)
    assert.equal(
      (
        await request(
          '/api/login',
          { email: 'rate@example.test', password: 'bad' },
          { headers: { 'X-Forwarded-For': `10.0.0.${i}` } },
        )
      ).status,
      401,
    )
  assert.equal(
    (
      await request(
        '/api/login',
        { email: 'rate@example.test', password: 'bad' },
        { headers: { 'X-Forwarded-For': '9.9.9.9' } },
      )
    ).status,
    429,
  )
})
test('public HTTP deployments and missing bootstrap fail closed', async () => {
  await assert.rejects(
    createAccessServer({ origin: 'http://example.com', database: ':memory:' }),
    /HTTPS/,
  )
  await assert.rejects(
    createAccessServer({
      origin: 'http://localhost',
      production: true,
      database: ':memory:',
    }),
    /HTTPS/,
  )
  await assert.rejects(
    createAccessServer({ origin: 'http://localhost', database: ':memory:' }),
    /auth:setup/,
  )
})

test('HTTPS deployment issues Secure __Host cookies and HSTS', async () => {
  const secure = await createAccessServer({
    origin: 'https://ivc.example.test',
    store: app.store,
    dist: resolve(root, 'dist'),
  })
  await new Promise((r) => secure.server.listen(0, '127.0.0.1', r))
  try {
    const result = await new Promise((resolve, reject) => {
      const req = httpRequest(
        `http://127.0.0.1:${secure.server.address().port}/api/login`,
        {
          method: 'POST',
          headers: {
            Host: 'ivc.example.test',
            Origin: 'https://ivc.example.test',
            'Content-Type': 'application/json',
          },
        },
        (res) => {
          res.resume()
          resolve({ code: res.statusCode, headers: res.headers })
        },
      )
      req.on('error', reject)
      req.end(
        JSON.stringify({
          email: ownerEmail,
          password: 'Changed-test-password 872!',
        }),
      )
    })
    assert.equal(result.code, 200)
    assert.match(result.headers['set-cookie'][0], /^__Host-ivc-session=/)
    assert.match(result.headers['set-cookie'][0], /Secure/)
    assert.equal(
      result.headers['strict-transport-security'],
      'max-age=31536000',
    )
  } finally {
    secure.server.closeAllConnections()
    await new Promise((r) => secure.server.close(r))
  }
})
test('expired invitations fail even with the correct email and password', async () => {
  const token = app.store.invite('expired@example.test', app.store.owner())
  app.store.run('UPDATE invites SET expires=0 WHERE hash=?', digest(token))
  assert.equal(
    await app.store.accept(token, 'expired@example.test', password),
    false,
  )
})

test('Codespaces rewritten loopback Host supports the full HTTPS login flow', async () => {
  const { runtimeConfig } = await import('../server/runtime-config.mjs')
  const cfg = runtimeConfig(
    {
      CODESPACE_NAME: 'sample-space',
      GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: 'app.github.dev',
    },
    5173,
  )
  const proxy = await createAccessServer({
    ...cfg,
    store: app.store,
    dist: resolve(root, 'dist'),
  })
  await new Promise((r) => proxy.server.listen(0, '127.0.0.1', r))
  async function raw(path, host, body, extra = {}) {
    return new Promise((resolve, reject) => {
      const req = httpRequest(
        `http://127.0.0.1:${proxy.server.address().port}${path}`,
        {
          method: body ? 'POST' : 'GET',
          headers: {
            Host: host,
            ...(body
              ? { Origin: cfg.origin, 'Content-Type': 'application/json' }
              : {}),
            ...extra,
          },
        },
        (res) => {
          const chunks = []
          res.on('data', (chunk) => chunks.push(chunk))
          res.on('end', () =>
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: Buffer.concat(chunks).toString(),
            }),
          )
        },
      )
      req.on('error', reject)
      req.end(body ? JSON.stringify(body) : undefined)
    })
  }
  try {
    for (const host of [
      'localhost:5173',
      '127.0.0.1:5173',
      '[::1]:5173',
      'localhost',
    ])
      assert.equal((await raw('/', host)).status, 200)
    const login = await raw('/api/login', 'localhost:5173', {
      email: ownerEmail,
      password: 'Changed-test-password 872!',
    })
    assert.equal(login.status, 200)
    assert.match(login.headers['set-cookie'][0], /^__Host-ivc-session=/)
    const cookie = login.headers['set-cookie'][0].split(';')[0]
    assert.equal(
      (await raw('/api/session', 'localhost:5173', null, { Cookie: cookie }))
        .status,
      200,
    )
    assert.equal(
      (
        await raw('/assets/private.js', 'localhost:5173', null, {
          Cookie: cookie,
        })
      ).status,
      200,
    )
    assert.equal(
      (await raw('/assets/private.js', 'localhost:5173')).status,
      401,
    )
    assert.equal(
      (
        await raw('/', 'evil.test', null, {
          'X-Forwarded-Host': new URL(cfg.origin).host,
        })
      ).status,
      421,
    )
    assert.equal(
      (
        await raw(
          '/api/login',
          'localhost:5173',
          { email: ownerEmail, password },
          { Origin: 'https://evil.test' },
        )
      ).status,
      403,
    )
  } finally {
    proxy.server.closeAllConnections()
    await new Promise((r) => proxy.server.close(r))
  }
})
test('Codespaces loopback exceptions do not accept remote peers or arbitrary forwarded hosts', async () => {
  const { runtimeConfig, acceptedHost } = await import(
    '../server/runtime-config.mjs'
  )
  const cfg = runtimeConfig(
    {
      CODESPACE_NAME: 'sample-space',
      GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: 'app.github.dev',
    },
    5173,
  )
  assert.equal(
    acceptedHost(
      {
        headers: { host: 'localhost:5173' },
        socket: { remoteAddress: '203.0.113.1' },
      },
      cfg,
    ),
    false,
  )
  assert.equal(
    acceptedHost(
      {
        headers: { host: 'localhost:9999' },
        socket: { remoteAddress: '127.0.0.1' },
      },
      cfg,
    ),
    false,
  )
  assert.equal(
    acceptedHost(
      {
        headers: { host: 'localhost:5173' },
        socket: { remoteAddress: '127.0.0.1' },
      },
      runtimeConfig({}, 5173),
    ),
    false,
  )
  assert.equal(cfg.origin, 'https://sample-space-5173.app.github.dev')
})
