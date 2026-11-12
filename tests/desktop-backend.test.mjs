import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { tmpdir } from 'node:os'
import { createServer } from 'node:net'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createDesktopBackend } from '../desktop/backend.mjs'
const password = 'Local-fixture-only! 한국어 7391'
const email = 'personal@example.test'
const dist = resolve('dist')
async function port() {
  const listener = createServer()
  await new Promise((done) => listener.listen(0, '127.0.0.1', done))
  const selected = listener.address().port
  await new Promise((done) => listener.close(done))
  return selected
}
async function fixture(run) {
  const dataDir = await mkdtemp(join(tmpdir(), 'ivc-personal-'))
  const selected = await port()
  const app = createDesktopBackend({ dataDir, dist, port: selected })
  try {
    await run(app, { dataDir, port: selected })
  } finally {
    await app.stop()
    await rm(dataDir, { recursive: true, force: true })
  }
}
const cookie = (response) =>
  response.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ')
async function login(origin) {
  const session = await fetch(origin + '/ivc-auth/csrf')
  const entry = await session.json()
  return fetch(origin + '/ivc-auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: cookie(session),
      'X-CSRF-Token': entry.csrf,
    },
    body: JSON.stringify({ email, password }),
  })
}
test('personal server remains loopback-only and keeps the real authentication gate', async () =>
  fixture(async (app) => {
    assert.equal(app.needsSetup(), true)
    await assert.rejects(app.start(), /최고 관리자/)
    await app.setup(email, password)
    assert.equal(app.needsSetup(), false)
    const { origin, entryUrl } = await app.start()
    assert.match(origin, /^http:\/\/127\.0\.0\.1:\d+$/)
    const welcome = await fetch(entryUrl)
    assert.equal(welcome.status, 200)
    assert.match(await welcome.text(), /Interaction Visual Calculator/)
    assert.equal((await fetch(origin + '/solver.wasm')).status, 401)
    assert.equal((await fetch(origin + '/ivc-auth/admin/users')).status, 401)
    assert.equal((await fetch(origin + '/ivc-auth/desktop-setup')).status, 404)
    const accepted = await login(origin)
    assert.equal(accepted.status, 200)
    const wasm = await fetch(origin + '/solver.wasm', {
      headers: { Cookie: cookie(accepted) },
    })
    assert.equal(wasm.status, 200)
    const blocked = await fetch(origin + '/ivc-auth/admin/invite', {
      method: 'POST',
      headers: {
        Cookie: cookie(accepted),
        Origin: 'https://foreign.example',
        'Content-Type': 'application/json',
      },
      body: '{}',
    })
    assert.equal(blocked.status, 403)
  }))
test('desktop account and session survive shutdown and reopening the same data directory', async () =>
  fixture(async (app, options) => {
    await app.setup(email, password)
    const { origin } = await app.start()
    const accepted = await login(origin)
    assert.equal(accepted.status, 200)
    const savedCookie = cookie(accepted)
    await app.stop()
    await app.stop()
    await assert.rejects(app.start(), /종료/)
    const reopened = createDesktopBackend({ ...options, dist })
    try {
      assert.equal(reopened.needsSetup(), false)
      await assert.rejects(
        reopened.setup('other@example.test', 'Another-fixture-password!'),
        /이미 설정/,
      )
      await reopened.start()
      const session = await fetch(origin + '/ivc-auth/session', {
        headers: { Cookie: savedCookie },
      })
      const data = await session.json()
      assert.equal(data.user.email, email)
      assert.equal(
        (
          await fetch(origin + '/calculator', {
            headers: { Cookie: savedCookie },
          })
        ).status,
        200,
      )
    } finally {
      await reopened.stop()
    }
    const database = await readFile(join(options.dataDir, 'access.sqlite'))
    assert.equal(database.includes(Buffer.from(password)), false)
  }))
test('a port conflict fails without switching origins or stopping another process', async () =>
  fixture(async (app, options) => {
    const occupied = createServer((socket) => socket.end('other-app'))
    await new Promise((done) =>
      occupied.listen(options.port, '127.0.0.1', done),
    )
    try {
      await app.setup(email, password)
      await assert.rejects(app.start(), { code: 'EADDRINUSE' })
      assert.equal(occupied.listening, true)
    } finally {
      await new Promise((done) => occupied.close(done))
    }
  }))
test('desktop IPC sets up once without leaking passwords, then EOF stops the owned server', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'ivc-personal-ipc-'))
  const selected = await port()
  const child = spawn(
    process.execPath,
    [
      'desktop/backend.mjs',
      '--data-dir',
      dataDir,
      '--dist',
      dist,
      '--port',
      String(selected),
    ],
    {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        HOST: '0.0.0.0',
        APP_ORIGIN: 'https://foreign.example',
        CODESPACE_NAME: 'untrusted',
        GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: 'example.test',
      },
    },
  )
  let stdout = '',
    stderr = '',
    pending = ''
  const messages = [],
    listeners = []
  child.stderr.on('data', (bytes) => {
    stderr += bytes.toString()
  })
  child.stdout.on('data', (bytes) => {
    stdout += bytes.toString()
    pending += bytes.toString()
    let end
    while ((end = pending.indexOf('\n')) >= 0) {
      const line = pending.slice(0, end)
      pending = pending.slice(end + 1)
      if (!line.startsWith('IVC_DESKTOP ')) continue
      const value = JSON.parse(line.slice(12))
      messages.push(value)
      for (const listener of [...listeners]) listener(value)
    }
  })
  const wait = (type) => {
    const existing = messages.find((m) => m.type === type)
    if (existing) return Promise.resolve(existing)
    return new Promise((done, reject) => {
      const timeout = setTimeout(
        () => reject(Error('Missing IPC event: ' + type)),
        10000,
      )
      const listener = (message) => {
        if (message.type === type) {
          clearTimeout(timeout)
          listeners.splice(listeners.indexOf(listener), 1)
          done(message)
        }
      }
      listeners.push(listener)
    })
  }
  try {
    await wait('setup-required')
    child.stdin.write(
      JSON.stringify({ type: 'setup', email, password: 'short' }) + '\n',
    )
    await wait('setup-error')
    child.stdin.write(JSON.stringify({ type: 'setup', email, password }) + '\n')
    const ready = await wait('ready')
    assert.equal(ready.origin, `http://127.0.0.1:${selected}`)
    assert.equal((await fetch(ready.entryUrl)).status, 200)
    assert.equal((await fetch(ready.origin + '/solver.wasm')).status, 401)
    const exited = once(child, 'exit')
    child.stdin.end()
    const [code] = await exited
    assert.equal(code, 0)
    await assert.rejects(fetch(ready.origin + '/ivc-auth/status'))
    assert.equal((stdout + stderr).includes(password), false)
    const reopened = createDesktopBackend({ dataDir, dist, port: selected })
    assert.equal(reopened.needsSetup(), false)
    await reopened.stop()
  } finally {
    child.stdin.destroy()
    if (child.exitCode === null) {
      child.kill()
      await once(child, 'exit')
    }
    await rm(dataDir, { recursive: true, force: true })
  }
})
