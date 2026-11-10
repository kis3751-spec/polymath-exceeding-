import { createServer } from 'node:http'
import { acceptedHost, proxyRewrittenOrigin } from './runtime-config.mjs'
import { readFile, realpath } from 'node:fs/promises'
import { resolve, sep, extname } from 'node:path'
import {
  AccessStore,
  digest,
  normalizeEmail,
  validEmail,
  validPassword,
  hashPassword,
  verifyPassword,
  secret,
} from './store.mjs'
const gateway = resolve(import.meta.dirname, 'gateway')
const mime = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.json': 'application/json',
}
function config(input) {
  const url = new URL(input.origin)
  const local = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
  if (
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    !['https:', 'http:'].includes(url.protocol)
  )
    throw Error('APP_ORIGIN은 경로 없는 사이트 원점이어야 합니다.')
  if (url.protocol !== 'https:' && (!local || input.production))
    throw Error('공유 및 운영에는 HTTPS APP_ORIGIN이 필요합니다.')
  return { ...input, origin: url.origin, secure: url.protocol === 'https:' }
}
export async function createAccessServer(input) {
  const cfg = config(input),
    store = input.store ?? new AccessStore(cfg.database)
  if (!store.owner())
    throw Error('먼저 npm run auth:setup으로 최고 관리자를 설정하세요.')
  const dummy = await hashPassword('unused-' + crypto.randomUUID())
  const cookieName = cfg.secure ? '__Host-ivc-session' : 'ivc-local-session'
  const entryCookie = cfg.secure ? '__Host-ivc-entry' : 'ivc-local-entry'
  const cookie = (token, remove = false) =>
    `${cookieName}=${token}; HttpOnly; ${cfg.secure ? 'Secure; ' : ''}SameSite=Strict; Path=/; Max-Age=${remove ? 0 : 28800}`
  function readSession(req) {
    const values = (req.headers.cookie ?? '')
      .split(';')
      .map((x) => x.trim())
      .filter((x) => x.startsWith(cookieName + '='))
    return values.length === 1
      ? store.session(
          values[0].slice(cookieName.length + 1),
          req.method === 'POST' || req.headers['x-ivc-active'] === '1',
        )
      : null
  }
  const server = createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, private, max-age=0')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('Referrer-Policy', 'no-referrer')
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    )
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    )
    if (cfg.secure)
      res.setHeader('Strict-Transport-Security', 'max-age=31536000')
    function json(code, value) {
      const body = Buffer.from(JSON.stringify(value), 'utf8')
      res.writeHead(code, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': body.length,
        'X-IVC-Response': 'json',
      })
      res.end(body)
    }
    function fail(code, message) {
      json(code, { error: message })
    }
    try {
      if (!acceptedHost(req, cfg)) return fail(421, '접속 주소를 확인하세요.')
      const raw = req.url ?? '/'
      if (raw.length > 4096) return fail(414, 'URL이 너무 깁니다.')
      let path
      try {
        path = decodeURIComponent(new URL(raw, cfg.origin).pathname)
      } catch {
        return fail(400, '잘못된 경로입니다.')
      }
      if (
        path.includes('\0') ||
        path.includes('\\') ||
        path.split('/').includes('..')
      )
        return fail(400, '잘못된 경로입니다.')
      // Dedicated application namespace avoids collisions in forwarding layers.
      // Legacy /api routes share the same handlers and authorization checks.
      path = path.replace(/^\/ivc-auth(?=\/)/, '/api')
      const authActions = new Set([
        '/api/login',
        '/api/logout',
        '/api/accept-invite',
        '/api/change-password',
        '/api/admin/invite',
        '/api/admin/revoke',
      ])
      if (req.method === 'POST' && authActions.has(path)) {
        const action = path.slice('/api/'.length)
        res.once('finish', () =>
          console.info(`IVC auth ${action}: HTTP ${res.statusCode}`),
        )
      }
      const user = readSession(req)
      if (!['GET', 'HEAD', 'POST'].includes(req.method))
        return fail(405, '허용되지 않은 요청입니다.')
      if (req.method === 'POST') {
        const token = req.headers['x-csrf-token']
        const entries = (req.headers.cookie ?? '')
          .split(';')
          .map((x) => x.trim())
          .filter((x) => x.startsWith(entryCookie + '='))
        const nonce =
          entries.length === 1 ? entries[0].slice(entryCookie.length + 1) : null
        const validProof = user
          ? token === user.csrf
          : typeof token === 'string' &&
            /^[\w-]{43}$/.test(token) &&
            nonce === token
        if (req.headers['sec-fetch-site'] === 'cross-site') {
          console.info('IVC auth blocked: cross-site request')
          return fail(403, '다른 사이트에서 보낸 요청은 허용되지 않습니다.')
        }
        if (
          req.headers.origin !== cfg.origin &&
          !(proxyRewrittenOrigin(req, cfg) && validProof)
        ) {
          // Strip userinfo, paths and query text even from malformed client headers.
          let originLabel = req.headers.origin ? 'invalid' : 'missing'
          try {
            originLabel = new URL(req.headers.origin).origin
          } catch {}
          const siteLabel = [
            'same-origin',
            'same-site',
            'cross-site',
            'none',
          ].includes(req.headers['sec-fetch-site'])
            ? req.headers['sec-fetch-site']
            : 'missing/invalid'
          console.info(
            `IVC auth blocked: origin/proof mismatch (origin=${originLabel}, expected=${cfg.origin}, site=${siteLabel})`,
          )
          return fail(
            403,
            '요청 출처 또는 로그인 보안 토큰을 확인할 수 없습니다. 새로고침하세요.',
          )
        }
        if (
          !/^application\/json(?:\s*;.*)?$/i.test(
            req.headers['content-type'] ?? '',
          )
        )
          return fail(415, 'JSON 요청이 필요합니다.')
        const chunks = []
        let size = 0
        for await (const chunk of req) {
          size += chunk.length
          if (size > 8192) {
            fail(413, '요청이 너무 큽니다.')
            return
          }
          chunks.push(chunk)
        }
        let body
        try {
          body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        } catch {
          return fail(400, '잘못된 요청입니다.')
        }
        if (!body || typeof body !== 'object' || Array.isArray(body))
          return fail(400, '잘못된 요청입니다.')
        const ip = req.socket.remoteAddress ?? 'unknown',
          email = normalizeEmail(body.email)
        const rate = (key, max = 10) =>
          store.allow(digest(key), max, 15 * 60_000)
        if (path === '/api/login') {
          // A global budget bounds concurrent memory-hard password work; do not trust X-Forwarded-For.
          if (
            !rate('login-ip:' + ip, 30) ||
            !rate('login-email:' + email, 12) ||
            !rate('login-global', 120)
          )
            return fail(429, '로그인 시도가 많습니다. 15분 후 다시 시도하세요.')
          const candidate = store.byEmail(email)
          const ok = await verifyPassword(
            body.password,
            candidate?.password ?? dummy,
          )
          if (!ok || !candidate?.active || !candidate.password) {
            store.audit(null, 'login.denied')
            return fail(401, '이메일 또는 비밀번호를 확인하세요.')
          }
          // Re-read after asynchronous hashing: a concurrent revocation/password change wins.
          const current = store.user(candidate.id)
          if (!current?.active || current.password !== candidate.password)
            return fail(401, '이메일 또는 비밀번호를 확인하세요.')
          if (user) store.run('DELETE FROM sessions WHERE hash=?', user.hash)
          const session = store.createSession(current)
          res.setHeader('Set-Cookie', cookie(session.token))
          store.audit(current.id, 'login.success')
          return json(200, { ok: true })
        }
        if (path === '/api/accept-invite') {
          if (!rate('invite-ip:' + ip, 15) || !rate('invite-global', 60))
            return fail(429, '시도가 많습니다. 잠시 후 다시 시도하세요.')
          if (!validEmail(email) || !validPassword(body.password))
            return fail(400, '이메일과 12~128자 비밀번호를 입력하세요.')
          const ok = await store.accept(body.token, email, body.password)
          return ok
            ? json(200, { ok: true })
            : fail(
                400,
                '초대가 유효하지 않거나 만료되었습니다. 관리자에게 새 초대를 요청하세요.',
              )
        }
        if (!user) return fail(401, '로그인이 필요합니다.')
        if (req.headers['x-csrf-token'] !== user.csrf)
          return fail(403, '세션 확인에 실패했습니다. 새로고침하세요.')
        if (path === '/api/logout') {
          store.run('DELETE FROM sessions WHERE hash=?', user.hash)
          res.setHeader('Set-Cookie', cookie('', true))
          return json(200, { ok: true })
        }
        if (path === '/api/change-password' || path.startsWith('/api/admin/')) {
          if (path.startsWith('/api/admin/') && !store.isOwner(user))
            return fail(403, '최고 관리자 권한이 필요합니다.')
          if (!rate('stepup:' + user.id, 10))
            return fail(429, '확인 시도가 많습니다. 15분 후 다시 시도하세요.')
          if (!(await verifyPassword(body.currentPassword, user.password)))
            return fail(403, '현재 비밀번호를 확인하세요.')
          const current = store.session(
            (req.headers.cookie ?? '')
              .split(';')
              .map((x) => x.trim())
              .find((x) => x.startsWith(cookieName + '='))
              ?.slice(cookieName.length + 1),
          )
          if (!current || current.password !== user.password)
            return fail(401, '다시 로그인하세요.')
          if (path === '/api/change-password') {
            if (!validPassword(body.newPassword))
              return fail(400, '새 비밀번호는 12~128자여야 합니다.')
            const encoded = await hashPassword(body.newPassword)
            const fresh = store.user(user.id)
            if (!fresh?.active || fresh.password !== user.password)
              return fail(401, '다시 로그인하세요.')
            store.transaction(() => {
              store.run(
                'UPDATE users SET password=? WHERE id=?',
                encoded,
                user.id,
              )
              store.run('DELETE FROM sessions WHERE user_id=?', user.id)
              store.audit(user.id, 'password.change')
            })
            res.setHeader('Set-Cookie', cookie('', true))
            return json(200, { ok: true })
          }
          if (path === '/api/admin/invite') {
            if (!validEmail(email))
              return fail(400, '올바른 이메일을 입력하세요.')
            try {
              const token = store.invite(email, user.id)
              return json(201, {
                url: `${cfg.origin}/#invite=${token}`,
                expiresHours: 48,
              })
            } catch (e) {
              return fail(409, e.message)
            }
          }
          if (path === '/api/admin/revoke') {
            if (typeof body.id !== 'string' || !store.revoke(body.id, user.id))
              return fail(400, '변경할 수 없는 계정입니다.')
            return json(200, { ok: true })
          }
        }
        return fail(404, '요청을 찾을 수 없습니다.')
      }
      if (path === '/api/csrf') {
        const nonce = secret()
        res.setHeader(
          'Set-Cookie',
          `${entryCookie}=${nonce}; HttpOnly; ${cfg.secure ? 'Secure; ' : ''}SameSite=Strict; Path=/; Max-Age=600`,
        )
        return json(200, { csrf: nonce })
      }
      if (path === '/api/status')
        return json(200, {
          service: 'IVC',
          api: '/ivc-auth',
          version: 'auth-v3',
        })
      if (path === '/api/session')
        return user
          ? json(200, {
              user: {
                id: user.id,
                email: user.email,
                role: store.isOwner(user) ? 'owner' : 'member',
              },
              csrf: user.csrf,
            })
          : fail(401, '로그인이 필요합니다.')
      if (path === '/api/admin/users') {
        if (!user) return fail(401, '로그인이 필요합니다.')
        if (!store.isOwner(user))
          return fail(403, '최고 관리자 권한이 필요합니다.')
        return json(200, {
          users: store.db
            .prepare(
              'SELECT id,email,role,active,created,password IS NOT NULL AS activated FROM users ORDER BY created',
            )
            .all(),
        })
      }
      if (path.startsWith('/api/')) return fail(404, '요청을 찾을 수 없습니다.')
      let root, file
      if (path === '/' || path === '/index.html') {
        root = gateway
        file = 'index.html'
      } else if (
        path === '/welcome.css' ||
        path === '/welcome.js' ||
        path === '/response.js'
      ) {
        root = gateway
        file = path.slice(1)
      } else {
        if (!user) {
          if (path === '/calculator' || path === '/calculator/') {
            res.writeHead(303, { Location: '/' })
            return res.end()
          }
          return fail(401, '로그인이 필요합니다.')
        }
        root = cfg.dist
        if (path === '/calculator' || path === '/calculator/')
          file = 'index.html'
        else if (
          /^\/assets\/[A-Za-z0-9_.-]+$/.test(path) ||
          path === '/solver.wasm' ||
          path === '/favicon.svg'
        )
          file = path.slice(1)
        else return fail(404, '파일을 찾을 수 없습니다.')
      }
      const resolved = await realpath(resolve(root, file)),
        safeRoot = await realpath(root)
      if (!resolved.startsWith(safeRoot + sep))
        return fail(403, '허용되지 않은 경로입니다.')
      const data = await readFile(resolved)
      res.writeHead(200, {
        'Content-Type': mime[extname(file)] ?? 'application/octet-stream',
        'Content-Length': data.length,
      })
      res.end(req.method === 'HEAD' ? undefined : data)
    } catch (e) {
      if (!res.headersSent)
        fail(
          e.code === 'ENOENT' ? 404 : e.code === 'EBUSY' ? 503 : 500,
          e.code === 'ENOENT'
            ? '파일을 찾을 수 없습니다.'
            : e.code === 'EBUSY'
              ? '요청이 많습니다. 잠시 후 다시 시도하세요.'
              : '요청 처리에 실패했습니다.',
        )
      else res.end()
      // No request bodies, passwords, invitation URLs or session values in logs.
      if (e.code !== 'ENOENT')
        console.error('IVC request failed:', e.code ?? 'internal')
    }
  })
  server.requestTimeout = 15_000
  server.headersTimeout = 10_000
  server.keepAliveTimeout = 5000
  server.maxHeadersCount = 40
  return { server, store }
}
