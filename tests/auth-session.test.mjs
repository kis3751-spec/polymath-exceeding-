import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { request as httpRequest } from 'node:http'
import { AccessStore } from '../server/store.mjs'
import { createAccessServer } from '../server/app.mjs'
const owner = {
  email: 'session-owner@example.test',
  password: 'Session-fixture-password 68!',
}
let app, port
const origin = 'https://session.example.test'
function request(path, body, cookie, csrf, rewritten = false, extra = {}) {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      {
        host: '127.0.0.1',
        port,
        path: '/ivc-auth' + path,
        method: body ? 'POST' : 'GET',
        headers: {
          Host: 'localhost:5180',
          ...(body
            ? {
                'Content-Type': 'application/json',
                Origin: rewritten ? 'http://localhost:5180' : origin,
              }
            : {}),
          ...(cookie ? { Cookie: cookie } : {}),
          ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
          ...extra,
        },
      },
      (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () =>
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: JSON.parse(Buffer.concat(chunks).toString()),
          }),
        )
      },
    )
    req.on('error', reject)
    req.end(body ? JSON.stringify(body) : undefined)
  })
}
const pickCookie = (response, name) =>
  response.headers['set-cookie']
    .find((x) => x.startsWith(name + '='))
    .split(';')[0]
async function login() {
  const r = await request('/login', owner)
  assert.equal(r.status, 200)
  const cookie = pickCookie(r, '__Host-ivc-session'),
    session = await request('/session', null, cookie)
  return { cookie, csrf: session.data.csrf, response: r }
}
before(async () => {
  const store = new AccessStore(':memory:')
  await store.bootstrap(owner.email, owner.password)
  app = await createAccessServer({
    origin,
    store,
    codespaces: true,
    loopbackProxyHosts: ['localhost:5180'],
    dist: 'dist',
  })
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r))
  port = app.server.address().port
})
beforeEach(() => app.store.run('DELETE FROM limits'))
after(async () => {
  app.server.closeAllConnections()
  await new Promise((r) => app.server.close(r))
  app.store.close()
})

test('re-login through rewritten Origin accepts a fresh entry proof even with a valid existing session cookie', async () => {
  const active = await login()
  const entry = await request('/csrf', null, active.cookie)
  const entryCookie = pickCookie(entry, '__Host-ivc-entry')
  const result = await request(
    '/login',
    owner,
    active.cookie + '; ' + entryCookie,
    entry.data.csrf,
    true,
  )
  assert.equal(result.status, 200)
  assert.equal(
    (await request('/session', null, pickCookie(result, '__Host-ivc-session')))
      .status,
    200,
  )
})
test('entry proof remains stable across repeated bootstrap requests from the same browser', async () => {
  const a = await request('/csrf'),
    cookie = pickCookie(a, '__Host-ivc-entry')
  const b = await request('/csrf', null, cookie)
  assert.equal(b.data.csrf, a.data.csrf)
})
test('entry proof cannot authorize owner writes and foreign origins remain rejected', async () => {
  const active = await login(),
    entry = await request('/csrf', null, active.cookie),
    cookie = active.cookie + '; ' + pickCookie(entry, '__Host-ivc-entry')
  const denied = await request(
    '/admin/invite',
    { email: 'should-not-exist@example.test', currentPassword: owner.password },
    cookie,
    entry.data.csrf,
    true,
  )
  assert.equal(denied.status, 403)
  assert.equal(app.store.byEmail('should-not-exist@example.test'), undefined)
  assert.equal(
    (
      await request('/login', owner, cookie, entry.data.csrf, true, {
        'Sec-Fetch-Site': 'cross-site',
      })
    ).status,
    403,
  )
  assert.equal(
    (
      await request('/login', owner, cookie, entry.data.csrf, false, {
        Origin: 'https://evil.example.test',
      })
    ).status,
    403,
  )
})

test('session refresh never overwrites the session cookie with a late response', async () => {
  const active = await login(),
    r = await request('/session', null, active.cookie)
  assert.equal(r.status, 200)
  assert.equal(r.headers['set-cookie'], undefined)
  assert.match(active.response.headers['set-cookie'][0], /Max-Age=2592000/)
})
import {
  createAuthRequests,
  isSessionRequired,
} from '../server/gateway/auth-client.js'
const sessionData = (id = 'fixture-owner', csrf = 'A'.repeat(43)) => ({
  user: { id, email: id + '@example.test', role: 'owner' },
  csrf,
})
const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'X-IVC-Response': 'json' },
  })
test('protected writes refresh current session CSRF and retry a specifically rejected proof once', async () => {
  let reads = 0,
    writes = 0
  const client = createAuthRequests(async (path, options) => {
    if (path.endsWith('/session'))
      return jsonResponse(
        sessionData('fixture-owner', (++reads === 1 ? 'A' : 'B').repeat(43)),
      )
    writes++
    assert.equal(
      options.headers['X-CSRF-Token'],
      (writes === 1 ? 'A' : 'B').repeat(43),
    )
    return writes === 1
      ? jsonResponse({ error: 'stale proof', code: 'SESSION_CSRF' }, 403)
      : jsonResponse({ ok: true })
  })
  assert.deepEqual(
    await client.post(
      '/api/admin/invite',
      { email: 'new@example.test' },
      'fixture-owner',
    ),
    { ok: true },
  )
  assert.equal(reads, 2)
  assert.equal(writes, 2)
})
test('an account switch cannot replay an owner action under a different account', async () => {
  let writes = 0
  const client = createAuthRequests(async (path) => {
    if (!path.endsWith('/session')) writes++
    return jsonResponse(sessionData('other-account'))
  })
  await assert.rejects(
    client.post('/api/admin/invite', {}, 'fixture-owner'),
    (error) => error.code === 'ACCOUNT_CHANGED',
  )
  assert.equal(writes, 0)
})
test('unknown network outcomes and wrong passwords never repeat a mutation', async () => {
  let writes = 0
  const client = createAuthRequests(async (path) => {
    if (path.endsWith('/session')) return jsonResponse(sessionData())
    writes++
    throw Error('network after commit')
  })
  await assert.rejects(
    client.post('/api/admin/invite', {}, 'fixture-owner'),
    /연결/,
  )
  assert.equal(writes, 1)
  let logins = 0
  const entry = createAuthRequests(async (path) => {
    if (path.endsWith('/csrf')) return jsonResponse({ csrf: 'C'.repeat(43) })
    logins++
    return jsonResponse({ error: 'wrong password' }, 401)
  })
  await assert.rejects(
    entry.post('/api/login', {
      email: 'fake@example.test',
      password: 'test-only-incorrect',
    }),
  )
  assert.equal(logins, 1)
})
test('a first-login nonce conflict refreshes its proof only once', async () => {
  let reads = 0,
    writes = 0
  const client = createAuthRequests(async (path) => {
    if (path.endsWith('/csrf'))
      return jsonResponse({ csrf: (++reads === 1 ? 'A' : 'B').repeat(43) })
    writes++
    return writes === 1
      ? jsonResponse({ error: 'nonce replaced', code: 'ENTRY_CSRF' }, 403)
      : jsonResponse({ ok: true })
  })
  await client.post('/api/login', {
    email: 'fake@example.test',
    password: 'test-only-value',
  })
  assert.equal(reads, 2)
  assert.equal(writes, 2)
})
test('generic proxy 401 is not a verified expired session', async () => {
  const client = createAuthRequests(
    async () =>
      new Response('<html>proxy unauthorized</html>', { status: 401 }),
  )
  await assert.rejects(client.session(), (error) => !isSessionRequired(error))
  const expired = createAuthRequests(async () =>
    jsonResponse({ error: 'login required', code: 'SESSION_REQUIRED' }, 401),
  )
  await assert.rejects(expired.session(), (error) => isSessionRequired(error))
})

test('a persisted session cookie is accepted after reopening the DB and restarting the access server', async () => {
  const { mkdtemp, rm } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const { resolve } = await import('node:path')
  const root = await mkdtemp(resolve(tmpdir(), 'ivc-session-restart-'))
  let store, restarted
  try {
    store = new AccessStore(resolve(root, 'access.sqlite'))
    const id = await store.bootstrap(owner.email, owner.password)
    const persisted = store.createSession(store.user(id))
    store.close()
    store = new AccessStore(resolve(root, 'access.sqlite'))
    restarted = await createAccessServer({ origin, store, dist: 'dist' })
    await new Promise((r) => restarted.server.listen(0, '127.0.0.1', r))
    const response = await new Promise((resolve, reject) => {
      const req = httpRequest(
        {
          host: '127.0.0.1',
          port: restarted.server.address().port,
          path: '/ivc-auth/session',
          headers: {
            Host: new URL(origin).host,
            Cookie: '__Host-ivc-session=' + persisted.token,
          },
        },
        (res) => {
          const parts = []
          res.on('data', (part) => parts.push(part))
          res.on('end', () =>
            resolve({
              status: res.statusCode,
              data: JSON.parse(Buffer.concat(parts).toString()),
            }),
          )
        },
      )
      req.on('error', reject)
      req.end()
    })
    assert.equal(response.status, 200)
    assert.equal(response.data.user.id, id)
    assert.equal(response.data.csrf, persisted.csrf)
  } finally {
    if (restarted) {
      restarted.server.closeAllConnections()
      await new Promise((r) => restarted.server.close(r))
    }
    store?.close()
    await rm(root, { recursive: true, force: true })
  }
})

test('approved policy expires at seven days idle, and passive checks do not extend it', async () => {
  const day = 24 * 3600_000,
    start = Date.now()
  let now = start
  const store = new AccessStore(':memory:', () => now)
  try {
    const id = await store.bootstrap(
      'idle-policy@example.test',
      'Only-a-policy-test-password 52!',
    )
    const issued = store.createSession(store.user(id))
    assert.equal(issued.expires, start + 30 * day)
    now = start + 7 * day - 1
    assert.ok(store.session(issued.token))
    now = start + 7 * day
    assert.equal(store.session(issued.token), null)
  } finally {
    store.close()
  }
})
test('activity renews seven-day idle time without extending the thirty-day absolute deadline', async () => {
  const day = 24 * 3600_000,
    start = Date.now()
  let now = start
  const store = new AccessStore(':memory:', () => now)
  try {
    const id = await store.bootstrap(
      'active-policy@example.test',
      'Only-a-policy-test-password 53!',
    )
    const issued = store.createSession(store.user(id))
    for (const elapsed of [6, 12, 18, 24, 29]) {
      now = start + elapsed * day
      const active = store.session(issued.token, true)
      assert.ok(active)
      assert.equal(active.touched, now)
      assert.equal(active.expires, start + 30 * day)
    }
    now = start + 30 * day - 1
    assert.ok(store.session(issued.token, true))
    now = start + 30 * day
    assert.equal(store.session(issued.token, true), null)
  } finally {
    store.close()
  }
})

test('one stale session response is confirmed with the current cookie before declaring expiry', async () => {
  const paths = []
  const client = createAuthRequests(async (path, options) => {
    paths.push(path)
    assert.equal(options.credentials, 'same-origin')
    assert.equal(options.cache, 'no-store')
    return paths.length === 1
      ? jsonResponse({ error: 'old request', code: 'SESSION_REQUIRED' }, 401)
      : jsonResponse(sessionData())
  })
  assert.equal((await client.session()).user.id, 'fixture-owner')
  assert.equal(paths.length, 2)
  assert.match(paths[1], /^\/ivc-auth\/session\?_ivc_check=/)
})
test('confirmed missing sessions fail closed without a mutation', async () => {
  let reads = 0,
    writes = 0
  const client = createAuthRequests(async (path, options) => {
    if (options.method === 'POST') writes++
    else reads++
    return jsonResponse({ error: 'revoked', code: 'SESSION_REQUIRED' }, 401)
  })
  await assert.rejects(
    client.post('/api/admin/invite', {}, 'fixture-owner'),
    isSessionRequired,
  )
  assert.equal(reads, 2)
  assert.equal(writes, 0)
})
test('a pre-mutation session rejection recovers only under the same account', async () => {
  let writes = 0
  const client = createAuthRequests(async (path, options) => {
    if (options.method === 'GET') return jsonResponse(sessionData())
    writes++
    return writes === 1
      ? jsonResponse({ error: 'old cookie', code: 'SESSION_REQUIRED' }, 401)
      : jsonResponse({ ok: true })
  })
  assert.deepEqual(
    await client.post('/api/admin/invite', {}, 'fixture-owner'),
    { ok: true },
  )
  assert.equal(writes, 2)
})
