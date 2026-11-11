import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { createServer } from 'node:net'
import { AccessStore, digest } from '../server/store.mjs'
import { createAccessServer } from '../server/app.mjs'
import {
  AUTH_VERSION,
  probePublicAccess,
  formatPublicChecks,
} from '../server/sharing.mjs'
import { shareCodespaces } from '../scripts/share-codespaces.mjs'
const owner = {
  email: 'owner@example.test',
  password: 'Fixture-owner-password 55!',
}
const memberPassword = 'Fixture-member-password 67!'
let fixture,
  root,
  ownerCookie,
  ownerCsrf,
  clock = Date.now()
const origin = 'https://ivc.example.test'
function publicResponse(input, instance) {
  const path = new URL(input).pathname
  const status = path === '/ivc-auth/status'
  const body = status
    ? JSON.stringify({
        service: 'IVC',
        instance,
        accessControl: 'invite-only',
        version: AUTH_VERSION,
      })
    : path === '/'
      ? '<html><form id="login-form"></form></html>'
      : path.endsWith('.css')
        ? 'body { color: black }'
        : path === '/auth-client.js'
          ? 'export function getAuthSession() {}'
          : 'export function responseData() {}'
  return new Response(body, {
    headers: {
      'X-IVC-Instance': instance,
      'Content-Type': status
        ? 'application/json'
        : path === '/'
          ? 'text/html'
          : path.endsWith('.css')
            ? 'text/css'
            : 'text/javascript',
    },
  })
}
async function start(options = {}) {
  const reservation = createServer()
  await new Promise((r) => reservation.listen(0, '127.0.0.1', r))
  const port = reservation.address().port
  await new Promise((r) => reservation.close(r))
  const store = new AccessStore(':memory:', () => clock)
  await store.bootstrap(owner.email, owner.password)
  let instance
  const app = await createAccessServer({
    origin,
    store,
    loopbackProxyHosts: [`127.0.0.1:${port}`],
    dist: resolve(root, 'dist'),
    ...options,
    fetchSharing:
      options.fetchSharing ??
      (async (input) => publicResponse(input, instance)),
  })
  await new Promise((r) => app.server.listen(port, '127.0.0.1', r))
  async function request(path, body, cookie, csrf, headers = {}) {
    return fetch(`http://127.0.0.1:${port}/ivc-auth${path}`, {
      method: body ? 'POST' : 'GET',
      redirect: 'manual',
      headers: {
        Host: new URL(origin).host,
        ...(body ? { Origin: origin, 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
        ...headers,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
  }
  instance = (await (await request('/status')).json()).instance
  return {
    ...app,
    instance,
    localOrigin: `http://127.0.0.1:${port}`,
    request,
    async close() {
      app.server.closeAllConnections()
      await new Promise((r) => app.server.close(r))
      store.close()
    },
  }
}
function cookieFrom(response, name) {
  const value = response.headers
    .getSetCookie()
    .find((x) => x.startsWith(name + '='))
  assert.ok(value, name)
  return value.split(';')[0]
}
async function ownerSession(f = fixture) {
  const login = await f.request('/login', owner)
  assert.equal(login.status, 200)
  const cookie = cookieFrom(login, '__Host-ivc-session')
  const { csrf } = await (await f.request('/session', null, cookie)).json()
  return { cookie, csrf }
}
async function issue(
  email,
  f = fixture,
  credentials = { cookie: ownerCookie, csrf: ownerCsrf },
) {
  const r = await f.request(
    '/admin/invite',
    { email, currentPassword: owner.password },
    credentials.cookie,
    credentials.csrf,
  )
  assert.equal(r.status, 201, await r.clone().text())
  const data = await r.json()
  assert.equal(new URL(data.url).hash, '#invite=' + data.code)
  return data.code
}
async function begin(token) {
  const r = await fixture.request('/begin-invite', { token })
  assert.equal(r.status, 200)
  assert.match(
    r.headers.getSetCookie()[0],
    /HttpOnly; Secure; SameSite=Strict; Path=\//,
  )
  const cookie = cookieFrom(r, '__Host-ivc-invitation')
  return { cookie, info: await r.json() }
}
before(async () => {
  root = await mkdtemp(resolve(tmpdir(), 'ivc-invitation-'))
  await mkdir(resolve(root, 'dist'), { recursive: true })
  await writeFile(resolve(root, 'dist/solver.wasm'), 'protected test wasm')
  fixture = await start()
  const session = await ownerSession()
  ownerCookie = session.cookie
  ownerCsrf = session.csrf
})
beforeEach(() => fixture.store.run('DELETE FROM limits'))
after(async () => {
  if (fixture) await fixture.close()
  if (root) await rm(root, { recursive: true, force: true })
})

test('invite continuation survives refresh without storing the secret in the browser URL or JSON response', async () => {
  const token = await issue('refresh@example.test')
  const { cookie, info } = await begin(token)
  assert.equal(info.email, 'refresh@example.test')
  assert.ok(info.expires <= clock + 15 * 60_000)
  assert.equal(info.token, undefined)
  const data = await (await fixture.request('/invitation', null, cookie)).json()
  assert.equal(data.invitation.email, info.email)
  const flow = fixture.store.query(
    'SELECT * FROM invite_flows WHERE hash=?',
    digest(cookie.split('=')[1]),
  )
  assert.equal(flow.invite_hash, digest(token))
  assert.notEqual(flow.hash, cookie.split('=')[1])
  assert.equal((await fixture.request('/session', null, cookie)).status, 401)
})
test('activation automatically issues a member session and clears continuation; tokens cannot be replayed', async () => {
  const token = await issue('autologin@example.test')
  const { cookie } = await begin(token)
  const r = await fixture.request(
    '/accept-invite',
    {
      email: 'autologin@example.test',
      password: memberPassword,
      role: 'owner',
    },
    cookie,
  )
  assert.equal(r.status, 200)
  const activeCookie = cookieFrom(r, '__Host-ivc-session')
  assert.match(
    r.headers
      .getSetCookie()
      .find((x) => x.startsWith('__Host-ivc-invitation=')),
    /Max-Age=0/,
  )
  const data = await (
    await fixture.request('/session', null, activeCookie)
  ).json()
  assert.equal(data.user.role, 'member')
  assert.equal(
    (await fixture.request('/admin/users', null, activeCookie)).status,
    403,
  )
  assert.equal(
    (await fixture.request('/admin/sharing', null, activeCookie)).status,
    403,
  )
  assert.equal((await fixture.request('/begin-invite', { token })).status, 410)
  assert.equal((await fixture.request('/invitation', null, cookie)).status, 410)
})
test('an invitation code can resume enrollment in another browser; concurrent activation succeeds once', async () => {
  const token = await issue('race@example.test')
  const a = await begin(token),
    b = await begin(token)
  const responses = await Promise.all(
    [a, b].map(({ cookie }) =>
      fixture.request(
        '/accept-invite',
        { email: 'race@example.test', password: memberPassword },
        cookie,
      ),
    ),
  )
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 410])
  const user = fixture.store.byEmail('race@example.test')
  assert.equal(
    fixture.store.query(
      'SELECT count(*) n FROM sessions WHERE user_id=?',
      user.id,
    ).n,
    1,
  )
})
test('email mismatch and short passwords do not consume a valid invitation', async () => {
  const token = await issue('exact@example.test'),
    { cookie } = await begin(token)
  assert.equal(
    (
      await fixture.request(
        '/accept-invite',
        { email: 'other@example.test', password: memberPassword },
        cookie,
      )
    ).status,
    410,
  )
  assert.equal(
    (
      await fixture.request(
        '/accept-invite',
        { email: 'exact@example.test', password: 'short' },
        cookie,
      )
    ).status,
    400,
  )
  assert.equal(
    (
      await fixture.request(
        '/accept-invite',
        { email: 'EXACT@example.test', password: memberPassword },
        cookie,
      )
    ).status,
    200,
  )
})
test('expired continuation can reopen with the still-valid original invite; expired original cannot reopen', async () => {
  const token = await issue('timeout@example.test'),
    { cookie } = await begin(token)
  const saved = clock
  try {
    clock += 16 * 60_000
    assert.equal(
      (await fixture.request('/invitation', null, cookie)).status,
      410,
    )
    const again = await begin(token)
    assert.ok(again.info.expires > clock)
    fixture.store.run(
      'UPDATE invites SET expires=? WHERE hash=?',
      clock - 1,
      digest(token),
    )
    assert.equal(
      (await fixture.request('/begin-invite', { token })).status,
      410,
    )
    assert.equal(
      (
        await fixture.request(
          '/accept-invite',
          { email: 'timeout@example.test', password: memberPassword },
          again.cookie,
        )
      ).status,
      410,
    )
  } finally {
    clock = saved
  }
})
test('reissuing or revoking an invite invalidates every old continuation', async () => {
  const token = await issue('reissue@example.test'),
    a = await begin(token)
  const next = await issue('reissue@example.test')
  assert.notEqual(next, token)
  assert.equal(
    (await fixture.request('/invitation', null, a.cookie)).status,
    410,
  )
  assert.equal((await fixture.request('/begin-invite', { token })).status, 410)
  const b = await begin(next),
    member = fixture.store.byEmail('reissue@example.test')
  assert.equal(
    (
      await fixture.request(
        '/admin/revoke',
        { id: member.id, currentPassword: owner.password },
        ownerCookie,
        ownerCsrf,
      )
    ).status,
    200,
  )
  assert.equal(
    (await fixture.request('/invitation', null, b.cookie)).status,
    410,
  )
})
test('owner reset revokes an activated member password and sessions and allows fresh one-time activation', async () => {
  const token = await issue('reset@example.test'),
    flow = await begin(token)
  const activated = await fixture.request(
    '/accept-invite',
    { email: 'reset@example.test', password: memberPassword },
    flow.cookie,
  )
  const oldCookie = cookieFrom(activated, '__Host-ivc-session'),
    user = fixture.store.byEmail('reset@example.test')
  const duplicate = await fixture.request(
    '/admin/invite',
    { email: user.email, currentPassword: owner.password },
    ownerCookie,
    ownerCsrf,
  )
  assert.equal(duplicate.status, 409)
  const r = await fixture.request(
    '/admin/reset',
    { id: user.id, currentPassword: owner.password },
    ownerCookie,
    ownerCsrf,
  )
  assert.equal(r.status, 201)
  assert.equal((await fixture.request('/session', null, oldCookie)).status, 401)
  assert.equal(
    (
      await fixture.request('/login', {
        email: user.email,
        password: memberPassword,
      })
    ).status,
    401,
  )
  const next = await begin((await r.json()).code)
  assert.equal(
    (
      await fixture.request(
        '/accept-invite',
        { email: user.email, password: 'New-fixture-password 88!' },
        next.cookie,
      )
    ).status,
    200,
  )
  assert.equal(
    (
      await fixture.request(
        '/admin/reset',
        { id: fixture.store.owner(), currentPassword: owner.password },
        ownerCookie,
        ownerCsrf,
      )
    ).status,
    409,
  )
  const newMember = await fixture.request('/login', {
    email: user.email,
    password: 'New-fixture-password 88!',
  })
  const cookie = cookieFrom(newMember, '__Host-ivc-session'),
    data = await (await fixture.request('/session', null, cookie)).json()
  assert.equal(
    (
      await fixture.request(
        '/admin/reset',
        { id: user.id, currentPassword: 'New-fixture-password 88!' },
        cookie,
        data.csrf,
      )
    ).status,
    403,
  )
})
test('new endpoints preserve anonymous access denial, Origin, CSRF, owner step-up and duplicate-cookie checks', async () => {
  const token = await issue('protection@example.test'),
    { cookie } = await begin(token)
  assert.equal((await fixture.request('/admin/sharing')).status, 401)
  assert.equal(
    (await fixture.request('/begin-invite', { token: [token] })).status,
    410,
  )
  assert.equal(
    (
      await fixture.request('/begin-invite', { token }, null, null, {
        Origin: 'https://evil.example',
      })
    ).status,
    403,
  )
  assert.equal(
    (
      await fixture.request('/begin-invite', { token }, null, null, {
        'Sec-Fetch-Site': 'cross-site',
      })
    ).status,
    403,
  )
  assert.equal(
    (await fixture.request('/begin-invite', { token }, ownerCookie, ownerCsrf))
      .status,
    409,
  )
  const duplicate = await fixture.request(
    '/invitation',
    null,
    cookie + '; ' + cookie,
  )
  assert.equal((await duplicate.json()).invitation, null)
  assert.equal(
    (
      await fixture.request(
        '/accept-invite',
        { email: 'protection@example.test', password: memberPassword },
        cookie + '; ' + cookie,
      )
    ).status,
    410,
  )
  assert.equal(
    (
      await fixture.request(
        '/admin/reset',
        {
          id: fixture.store.byEmail('protection@example.test').id,
          currentPassword: owner.password,
        },
        ownerCookie,
      )
    ).status,
    403,
  )
  assert.equal(
    (
      await fixture.request(
        '/admin/reset',
        {
          id: fixture.store.byEmail('protection@example.test').id,
          currentPassword: 'wrong password',
        },
        ownerCookie,
        ownerCsrf,
      )
    ).status,
    403,
  )
})
test('owner list reports invitation expiry and revocation but never passwords, codes or hashes', async () => {
  const token = await issue('expired-list@example.test')
  fixture.store.run(
    'UPDATE invites SET expires=? WHERE hash=?',
    clock - 1,
    digest(token),
  )
  const r = await fixture.request('/admin/users', null, ownerCookie),
    text = await r.text(),
    users = JSON.parse(text).users
  assert.equal(
    users.find((u) => u.email === 'expired-list@example.test').status,
    'expired',
  )
  assert.equal(
    users.find((u) => u.email === 'reissue@example.test').status,
    'revoked',
  )
  assert.equal(users.find((u) => u.email === owner.email).status, 'active')
  assert.ok(
    !text.includes(token) &&
      !text.includes('password') &&
      !text.includes('hash'),
  )
})
test('connection diagnostics never gate owner invitation and reset authorization', async () => {
  let opened = false
  const blocked = await start({
    codespaces: true,
    fetchSharing: async (input) =>
      opened
        ? publicResponse(input, blocked.instance)
        : new Response(null, {
            status: 302,
            headers: { Location: 'https://github.com/login' },
          }),
  })
  try {
    const auth = await ownerSession(blocked)
    const result = await (
      await blocked.request('/admin/sharing', null, auth.cookie)
    ).json()
    assert.equal(result.state, 'blocked')
    assert.equal(result.reachable, false)
    const invite = await blocked.request(
      '/admin/invite',
      { email: 'blocked@example.test', currentPassword: owner.password },
      auth.cookie,
      auth.csrf,
    )
    assert.equal(invite.status, 201)
    const token = (await invite.json()).code
    const activation = await blocked.request('/accept-invite', {
      token,
      email: 'blocked@example.test',
      password: memberPassword,
    })
    assert.equal(activation.status, 200)
    const memberCookie = cookieFrom(activation, '__Host-ivc-session')
    const memberSession = await (
      await blocked.request('/session', null, memberCookie)
    ).json()
    assert.equal(
      (
        await blocked.request(
          '/admin/invite',
          {
            email: 'unauthorized@example.test',
            currentPassword: memberPassword,
          },
          memberCookie,
          memberSession.csrf,
        )
      ).status,
      403,
    )
    assert.equal(
      (
        await blocked.request('/admin/invite', {
          email: 'anonymous@example.test',
          currentPassword: owner.password,
        })
      ).status,
      401,
    )
    assert.equal(
      (
        await blocked.request(
          '/admin/invite',
          { email: 'bad-csrf@example.test', currentPassword: owner.password },
          auth.cookie,
          'wrong-token',
        )
      ).status,
      403,
    )
    assert.equal(
      (
        await blocked.request(
          '/admin/invite',
          {
            email: 'bad-stepup@example.test',
            currentPassword: 'wrong password',
          },
          auth.cookie,
          auth.csrf,
        )
      ).status,
      403,
    )
    const reset = await blocked.request(
      '/admin/reset',
      { id: memberSession.user.id, currentPassword: owner.password },
      auth.cookie,
      auth.csrf,
    )
    assert.equal(reset.status, 201)
    assert.equal(
      (await blocked.request('/session', null, memberCookie)).status,
      401,
    )
    opened = true
    const recheck = await (
      await blocked.request('/admin/sharing', null, auth.cookie)
    ).json()
    assert.equal(recheck.reachable, true)
    await issue('unblocked@example.test', blocked, auth)
  } finally {
    await blocked.close()
  }
})
test('Codespaces connection diagnostics report the running server independently of invitations', async () => {
  const ready = await start({ codespaces: true })
  try {
    const auth = await ownerSession(ready)
    const status = await (
      await ready.request('/admin/sharing', null, auth.cookie)
    ).json()
    assert.equal(status.reachable, true)
    assert.equal(status.origin, origin)
    await issue('ready@example.test', ready, auth)
  } finally {
    await ready.close()
  }
})
test('sharing probe never follows redirects, sends credentials or accepts stale instances and proxy HTML', async () => {
  let calls = 0
  const result = await probePublicAccess(
    origin,
    'this-instance',
    async (url, options) => {
      calls++
      assert.equal(url.href, origin + '/ivc-auth/status')
      assert.equal(options.redirect, 'manual')
      assert.equal(options.credentials, 'omit')
      assert.equal(options.headers.Cookie, undefined)
      return new Response(null, {
        status: 302,
        headers: { Location: 'https://github.com/login' },
      })
    },
  )
  assert.equal(result.state, 'blocked')
  assert.equal(calls, 1)
  assert.equal(
    (
      await probePublicAccess(
        origin,
        'new',
        async () =>
          new Response(JSON.stringify({ service: 'IVC', instance: 'old' })),
      )
    ).state,
    'mismatch',
  )
  assert.equal(
    (
      await probePublicAccess(
        origin,
        'new',
        async () => new Response('<html>login</html>'),
      )
    ).state,
    'unverified',
  )
  assert.equal(
    (
      await probePublicAccess(
        origin,
        'new',
        async () => new Response('', { status: 404 }),
      )
    ).state,
    'blocked',
  )
  assert.equal(
    (
      await probePublicAccess(origin, 'new', async () => {
        throw Error('offline')
      })
    ).state,
    'unavailable',
  )
  assert.equal(
    (
      await probePublicAccess('http://localhost:5173', 'new', async () => {
        throw Error('must not fetch')
      })
    ).state,
    'local',
  )
})
test('Codespaces sharing command checks a protected server before changing port visibility', async () => {
  const env = {
    CODESPACE_NAME: 'fixture-code-space',
    GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: 'app.github.dev',
  }
  let changed = 0
  const run = (command, args, options) => {
    changed++
    assert.equal(command, 'gh')
    assert.deepEqual(args, [
      'codespace',
      'ports',
      'visibility',
      '5180:public',
      '--codespace',
      env.CODESPACE_NAME,
    ])
    assert.equal(options.stdio, 'inherit')
    assert.equal(options.shell, undefined)
    return { status: 0 }
  }
  const status = {
    service: 'IVC',
    version: AUTH_VERSION,
    accessControl: 'invite-only',
    instance: 'fixture-instance',
  }
  const origin = await shareCodespaces(env, run, async (url) =>
    new URL(url).pathname === '/solver.wasm'
      ? new Response('private', { status: 401 })
      : publicResponse(url, status.instance),
  )
  assert.equal(origin.origin, 'https://fixture-code-space-5180.app.github.dev')
  assert.equal(origin.visibilityApplied, true)
  assert.equal(origin.probe.reachable, true)
  assert.equal(changed, 1)
  changed = 0
  await assert.rejects(
    shareCodespaces(env, run, async () => new Response('unprotected')),
    /공개 설정은 변경하지 않았습니다/,
  )
  assert.equal(changed, 0)
  await assert.rejects(
    shareCodespaces(
      env,
      () => ({ status: 1 }),
      async (url) =>
        new URL(url).pathname === '/solver.wasm'
          ? new Response('', { status: 401 })
          : new Response(JSON.stringify(status)),
    ),
    /Public 설정을 적용하지 못했습니다/,
  )
  const partial = await shareCodespaces(env, run, async (input) => {
    const url = new URL(input)
    if (url.pathname === '/solver.wasm')
      return new Response('', { status: 401 })
    if (url.protocol === 'https:' && url.pathname === '/')
      return new Response('', { status: 404 })
    return publicResponse(input, status.instance)
  })
  assert.equal(partial.origin, 'https://fixture-code-space-5180.app.github.dev')
  assert.equal(partial.visibilityApplied, true)
  assert.equal(partial.probe.reachable, false)
  assert.equal(partial.probe.state, 'partial')
  assert.match(formatPublicChecks(partial.probe), /\/: HTTP 404/)
  assert.doesNotMatch(partial.probe.message, /상대방.*초대/)
})

test('a concurrent reset after activation commits cannot issue a new valid session for the pending account', async () => {
  const email = 'reset-race@example.test',
    token = await issue(email),
    flow = await begin(token)
  const accept = fixture.store.acceptFlow.bind(fixture.store)
  fixture.store.acceptFlow = async (...args) => {
    const result = await accept(...args)
    if (result)
      fixture.store.resetInvite(
        fixture.store.byEmail(email).id,
        fixture.store.owner(),
      )
    return result
  }
  try {
    const response = await fixture.request(
      '/accept-invite',
      { email, password: memberPassword },
      flow.cookie,
    )
    assert.equal(response.status, 200)
    const cookie = cookieFrom(response, '__Host-ivc-session')
    assert.equal((await fixture.request('/session', null, cookie)).status, 401)
    assert.equal(
      fixture.store.query(
        'SELECT count(*) n FROM sessions WHERE user_id=?',
        fixture.store.byEmail(email).id,
      ).n,
      0,
    )
    assert.equal(fixture.store.byEmail(email).password, null)
    const pending = fixture.store.createSession(fixture.store.byEmail(email))
    assert.equal(
      (
        await fixture.request(
          '/session',
          null,
          `__Host-ivc-session=${pending.token}`,
        )
      ).status,
      401,
    )
  } finally {
    fixture.store.acceptFlow = accept
  }
})

test('an existing account database gains invitation continuation without replacing owner, sessions or invites', async () => {
  const path = resolve(root, 'legacy/access.sqlite')
  let old = new AccessStore(path, () => clock)
  const ownerId = await old.bootstrap(owner.email, owner.password)
  const session = old.createSession(old.user(ownerId)),
    token = old.invite('legacy@example.test', ownerId)
  old.db.exec('DROP TABLE invite_flows') // Schema used by auth-v3.
  old.close()
  const upgraded = new AccessStore(path, () => clock)
  try {
    assert.equal(upgraded.owner(), ownerId)
    assert.equal(upgraded.session(session.token).email, owner.email)
    assert.equal(upgraded.inviteInfo(token).email, 'legacy@example.test')
    const flow = upgraded.beginInvite(token)
    assert.equal(upgraded.flowInfo(flow.token).email, 'legacy@example.test')
    await assert.rejects(
      upgraded.bootstrap('replacement@example.test', memberPassword),
      /이미 설정/,
    )
  } finally {
    upgraded.close()
  }
})

test('connection diagnosis separates a stopped server, missing gateway, exposed files and platform 404', async () => {
  const { diagnoseCodespaces } = await import(
    '../scripts/diagnose-codespaces.mjs'
  )
  const env = {
    CODESPACE_NAME: 'doctor-space',
    GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: 'app.github.dev',
  }
  let mode = 'ready'
  const fetchImpl = async (input, options) => {
    assert.equal(options.credentials, 'omit')
    assert.equal(options.redirect, 'manual')
    if (mode === 'offline') throw Error('ECONNREFUSED')
    const url = new URL(input)
    if (url.protocol === 'https:') return new Response('', { status: 404 })
    if (url.pathname === '/') {
      assert.equal(options.method, 'HEAD')
      return new Response(null, {
        status: mode === 'gateway' ? 404 : 200,
        headers: { 'Content-Type': 'text/html' },
      })
    }
    if (url.pathname === '/solver.wasm')
      return new Response('', { status: mode === 'unprotected' ? 200 : 401 })
    return new Response(
      JSON.stringify({
        service: 'IVC',
        version: AUTH_VERSION,
        accessControl: 'invite-only',
        instance: 'test-instance',
      }),
    )
  }
  const forwarded = await diagnoseCodespaces(env, fetchImpl)
  assert.equal(forwarded.local.state, 'ready')
  assert.equal(forwarded.external.status, 404)
  assert.match(forwarded.external.message, /포트 전달/)
  mode = 'offline'
  assert.equal(
    (await diagnoseCodespaces(env, fetchImpl)).local.state,
    'unavailable',
  )
  mode = 'gateway'
  assert.equal(
    (await diagnoseCodespaces(env, fetchImpl)).local.state,
    'gateway-error',
  )
  mode = 'unprotected'
  assert.equal(
    (await diagnoseCodespaces(env, fetchImpl)).local.state,
    'unprotected',
  )
})

test('public readiness verifies the actual gateway and login dependencies from the same running instance', async () => {
  const paths = []
  const result = await probePublicAccess(
    origin,
    fixture.instance,
    async (input, options) => {
      const path = new URL(input).pathname
      paths.push(path)
      assert.equal(options.credentials, 'omit')
      return fetch(fixture.localOrigin + path, options)
    },
  )
  assert.equal(result.state, 'ready')
  assert.equal(result.checks.length, 6)
  assert.ok(result.checks.every((check) => check.ok))
  assert.deepEqual(
    paths.sort(),
    [
      '/',
      '/auth-client.js',
      '/ivc-auth/status',
      '/response.js',
      '/welcome.css',
      '/welcome.js',
    ].sort(),
  )
})
test('status API success cannot hide a 404 page, missing login module or foreign HTML', async () => {
  for (const path of ['/', '/welcome.js', '/welcome.css', '/response.js']) {
    const result = await probePublicAccess(
      origin,
      'file-instance',
      async (input) =>
        new URL(input).pathname === path
          ? new Response('', { status: 404 })
          : publicResponse(input, 'file-instance'),
    )
    assert.equal(result.state, 'partial', path)
    assert.equal(result.reachable, false)
    assert.equal(result.path, path)
    assert.equal(result.status, 404)
  }
  for (const mode of ['foreign', 'empty', 'wrong-mime']) {
    const result = await probePublicAccess(
      origin,
      'file-instance',
      async (input) => {
        if (new URL(input).pathname !== '/')
          return publicResponse(input, 'file-instance')
        return new Response(
          mode === 'empty' ? '' : '<html><form id="login-form"></form></html>',
          {
            headers: {
              'Content-Type':
                mode === 'wrong-mime' ? 'application/json' : 'text/html',
              'X-IVC-Instance':
                mode === 'foreign' ? 'stale-instance' : 'file-instance',
            },
          },
        )
      },
    )
    assert.equal(result.state, 'partial', mode)
    assert.equal(result.reachable, false)
  }
})
test('all gateway requests share one timeout and do not follow redirects from login files', async () => {
  let signal
  const result = await probePublicAccess(
    origin,
    'shared-deadline',
    async (input, options) => {
      signal ??= options.signal
      assert.equal(options.signal, signal)
      assert.equal(options.redirect, 'manual')
      assert.equal(options.credentials, 'omit')
      if (new URL(input).pathname === '/welcome.js')
        return new Response(null, {
          status: 307,
          headers: { Location: 'https://other.example.test/' },
        })
      return publicResponse(input, 'shared-deadline')
    },
  )
  assert.equal(result.state, 'partial')
  assert.equal(result.path, '/welcome.js')
})

test('proxy stripping optional instance headers does not report a different server', async () => {
  const result = await probePublicAccess(
    origin,
    'proxy-instance',
    async (input) => {
      const response = publicResponse(input, 'proxy-instance')
      if (new URL(input).pathname !== '/ivc-auth/status')
        response.headers.delete('x-ivc-instance')
      return response
    },
  )
  assert.equal(result.state, 'ready')
  assert.ok(
    result.checks
      .slice(1)
      .every((check) => check.ok && check.note === 'instance-header-missing'),
  )
})
test('an owner can issue invitations without invoking an unavailable outbound probe', async () => {
  let probes = 0
  const unavailable = await start({
    codespaces: true,
    fetchSharing: async () => {
      probes++
      throw Error('offline')
    },
  })
  try {
    const auth = await ownerSession(unavailable)
    await issue('no-outbound@example.test', unavailable, auth)
    assert.equal(probes, 0)
  } finally {
    await unavailable.close()
  }
})

test('public failure details distinguish IVC and intermediary replies without leaking redirect secrets', async () => {
  const result = await probePublicAccess(
    origin,
    'safe-instance',
    async (input) => {
      const path = new URL(input).pathname
      if (path === '/')
        return new Response('', {
          status: 404,
          headers: { 'Content-Type': 'text/html' },
        })
      if (path === '/welcome.js')
        return new Response(null, {
          status: 302,
          headers: {
            Location:
              'https://user:private-password@github.com/login?token=private-token#secret',
          },
        })
      return publicResponse(input, 'safe-instance')
    },
  )
  const text = formatPublicChecks(result)
  assert.equal(result.state, 'partial')
  assert.match(text, /\/: HTTP 404 .*IVC 서버 표식 없음/)
  assert.match(text, /welcome.js: HTTP 302 .*GitHub 로그인으로 이동/)
  assert.match(text, /ivc-auth\/status: HTTP 200 .*현재 IVC 서버/)
  assert.doesNotMatch(
    JSON.stringify(result),
    /private-password|private-token|#secret/,
  )
  const blocked = await probePublicAccess(
    origin,
    'safe-instance',
    async () =>
      new Response(null, {
        status: 302,
        headers: { Location: 'https://github.com/login?token=private-token' },
      }),
  )
  assert.match(formatPublicChecks(blocked), /HTTP 302 .*GitHub 로그인으로 이동/)
  assert.doesNotMatch(JSON.stringify(blocked), /private-token/)
})
test('diagnostic CLI overrides malformed shell origins without touching the original environment', async () => {
  const { connectionEnvironment } = await import(
    '../scripts/connection-options.mjs'
  )
  const env = {
    PORT: '5180',
    APP_ORIGIN: 'https://example.test/index.html?x=1',
    IVC_DATA_DIR: 'do-not-change',
  }
  const result = connectionEnvironment(
    ['--port', '5181', '--origin', 'https://working-space-5181.app.github.dev'],
    env,
  )
  assert.equal(result.PORT, '5181')
  assert.equal(result.APP_ORIGIN, 'https://working-space-5181.app.github.dev')
  assert.equal(result.IVC_DATA_DIR, env.IVC_DATA_DIR)
  assert.equal(env.PORT, '5180')
  assert.match(env.APP_ORIGIN, /index.html/)
  for (const args of [['--port'], ['--origin', '--port'], ['--bad', 'x']])
    assert.throws(() => connectionEnvironment(args, env), /사용법/)
})
