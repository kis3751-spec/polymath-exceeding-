import { isIP } from 'node:net'

export const AUTH_VERSION = 'auth-v4'
export function localOrigin(origin) {
  const host = new URL(origin).hostname.replace(/^\[|\]$/g, '')
  return (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === '::1' ||
    (isIP(host) === 4 && host.startsWith('127.'))
  )
}

async function readBounded(response, limit) {
  const reader = response.body?.getReader(),
    chunks = []
  let size = 0
  if (reader)
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > limit) {
        await reader.cancel()
        throw Error('response size')
      }
      chunks.push(value)
    }
  return Buffer.concat(chunks).toString('utf8')
}
const scriptContent = (text) => text.trim().length > 0 && !/^\s*</.test(text)

// Retain only bounded, non-secret provenance, never raw response bodies,
// Location queries/fragments, Set-Cookie values or authentication challenges.
function provenance(response, instance, origin) {
  const id = response.headers.get('x-ivc-instance')
  const type = (response.headers.get('content-type') ?? '')
    .split(';')[0]
    .trim()
    .toLowerCase()
  const contentType = [
    'text/html',
    'application/json',
    'text/javascript',
    'application/javascript',
    'text/css',
  ].includes(type)
    ? type
    : type
      ? 'other'
      : 'missing'
  let redirect
  if (response.status >= 300 && response.status < 400) {
    try {
      const location = response.headers.get('location')
      if (!location) throw Error('missing redirect destination')
      const destination = new URL(location, origin)
      redirect =
        destination.hostname === 'github.com' &&
        /^\/(?:login|session|sessions)(?:\/|$)/.test(destination.pathname)
          ? 'github-login'
          : destination.origin === new URL(origin).origin
            ? 'same-origin'
            : 'external'
    } catch {
      redirect = 'unknown'
    }
  }
  return {
    contentType,
    server: id === instance ? 'ivc' : id ? 'different' : 'unmarked',
    ...(redirect ? { redirect } : {}),
  }
}
export function formatPublicChecks(probe) {
  const issues = {
    http: 'HTTP 응답 실패',
    instance: '서버 ID 불일치',
    mime: '파일 유형 불일치',
    content: '예상한 IVC 내용 없음',
    connection: '연결·읽기 실패 또는 시간 초과',
  }
  const servers = {
    ivc: '현재 IVC 서버',
    different: '다른 서버 ID',
    unmarked: 'IVC 서버 표식 없음',
  }
  const redirects = {
    'github-login': 'GitHub 로그인으로 이동',
    'same-origin': '같은 사이트의 다른 경로로 이동',
    external: '다른 사이트로 이동',
    unknown: '이동 대상 미확인',
  }
  return (probe?.checks ?? [])
    .map(
      (check) =>
        `${check.path}: ${check.status ? `HTTP ${check.status}` : '응답 미확인'} · ${check.ok ? 'OK' : (issues[check.issue] ?? '검사 실패')}${check.contentType ? ` · ${check.contentType}` : ''}${check.server ? ` · ${servers[check.server]}` : ''}${check.redirect ? ` · ${redirects[check.redirect]}` : ''}`,
    )
    .join('\n')
}

/** Checks from this server's network only; cannot certify another user's route. */
export async function probePublicAccess(origin, instance, fetchImpl = fetch) {
  if (localOrigin(origin))
    return {
      state: 'local',
      reachable: false,
      message:
        '현재 주소는 이 컴퓨터에서만 열립니다. 다른 사람과 공유하려면 공개 HTTPS 주소가 필요합니다.',
    }
  const checks = [],
    signal = AbortSignal.timeout(6500)
  const get = (path, accept) =>
    fetchImpl(new URL(path, origin), {
      redirect: 'manual',
      credentials: 'omit',
      cache: 'no-store',
      signal,
      headers: { Accept: accept, 'Cache-Control': 'no-cache' },
    })
  function blocked(path, status, details) {
    return {
      state: 'blocked',
      reachable: false,
      path,
      status,
      checks: [
        ...checks,
        { path, status, ok: false, issue: 'http', ...details },
      ],
      message:
        status >= 300 && status < 400
          ? `공유 주소의 ${path} 요청이 다른 화면으로 이동합니다. 실행 중인 포트의 Public 설정과 전달 주소를 확인하세요.`
          : `공유 주소의 ${path} 요청이 HTTP ${status}로 실패했습니다. 포트 전달 · HTTP 프로토콜 · 현재 주소를 확인하세요.`,
    }
  }
  try {
    const response = await get('/ivc-auth/status', 'application/json')
    if (!response.ok) {
      await response.body?.cancel()
      return blocked(
        '/ivc-auth/status',
        response.status,
        provenance(response, instance, origin),
      )
    }
    const statusCheck = {
      path: '/ivc-auth/status',
      status: response.status,
      ok: false,
      issue: 'content',
      ...provenance(response, instance, origin),
    }
    checks.push(statusCheck)
    let data
    try {
      data = JSON.parse(await readBounded(response, 16384))
    } catch {
      return {
        state: 'unverified',
        reachable: false,
        path: '/ivc-auth/status',
        checks,
        message:
          '공유 주소가 IVC 상태 응답을 반환하지 않습니다. 다른 서버나 프록시 응답인지 확인하세요.',
      }
    }
    if (data?.service !== 'IVC' || typeof data.instance !== 'string')
      return {
        state: 'unverified',
        reachable: false,
        path: '/ivc-auth/status',
        checks,
        message:
          '서버 연결 검사 응답에서 IVC 정보를 확인하지 못했습니다. 이 결과는 관리자 초대 발급을 차단하지 않습니다.',
      }
    if (data.instance !== instance) {
      statusCheck.issue = 'instance'
      return {
        state: 'mismatch',
        reachable: false,
        path: '/ivc-auth/status',
        checks,
        message:
          '공유 주소가 현재 서버와 다릅니다. APP_ORIGIN과 실행 중인 서버를 확인하세요.',
      }
    }
    statusCheck.ok = true
    delete statusCheck.issue
    // Verify the actual page and every module needed by the public login form.
    // One deadline covers all requests; no cookies, redirects or arbitrary URLs.
    const targets = [
      {
        path: '/',
        mime: /^text\/html\b/i,
        content: (text) => text.includes('id="login-form"'),
      },
      {
        path: '/welcome.js',
        mime: /^(?:text|application)\/javascript\b/i,
        content: scriptContent,
      },
      {
        path: '/welcome.css',
        mime: /^text\/css\b/i,
        content: (text) => text.trim().length > 0,
      },
      {
        path: '/response.js',
        mime: /^(?:text|application)\/javascript\b/i,
        content: scriptContent,
      },
      {
        path: '/auth-client.js',
        mime: /^(?:text|application)\/javascript\b/i,
        content: scriptContent,
      },
    ]
    const outcomes = await Promise.allSettled(
      targets.map(async (target) => {
        const r = await get(
          target.path,
          target.path === '/' ? 'text/html' : '*/*',
        )
        if (!r.ok) {
          await r.body?.cancel()
          return {
            path: target.path,
            status: r.status,
            ok: false,
            issue: 'http',
            ...provenance(r, instance, origin),
          }
        }
        const text = await readBounded(r, 65536)
        const identity = r.headers.get('x-ivc-instance')
        const issue =
          identity && identity !== instance
            ? 'instance'
            : !target.mime.test(r.headers.get('content-type') ?? '')
              ? 'mime'
              : !target.content(text)
                ? 'content'
                : undefined
        const ok = !issue
        return {
          path: target.path,
          status: r.status,
          ok,
          ...provenance(r, instance, origin),
          ...(issue ? { issue } : {}),
          ...(!identity ? { note: 'instance-header-missing' } : {}),
        }
      }),
    )
    for (let i = 0; i < outcomes.length; i++) {
      const outcome = outcomes[i]
      checks.push(
        outcome.status === 'fulfilled'
          ? outcome.value
          : { path: targets[i].path, ok: false, issue: 'connection' },
      )
    }
    const failed = checks.find((check) => !check.ok)
    if (failed) {
      return {
        state: 'partial',
        reachable: false,
        path: failed.path,
        ...(failed.status ? { status: failed.status } : {}),
        checks,
        message: `현재 IVC 상태 API에는 연결했지만 ${failed.path} 페이지·파일 검사가 실패했습니다. 소개·로그인 화면의 접속 성공을 확인한 상태는 아닙니다. 파일별 응답을 확인하세요.`,
      }
    }
    return {
      state: 'ready',
      reachable: true,
      checks,
      message:
        '서버에서 공유 주소의 상태 API·소개 화면·로그인 파일을 확인했습니다. 다른 사용자의 브라우저·네트워크 접속은 별도 확인이 필요합니다.',
    }
  } catch {
    return {
      state: 'unavailable',
      reachable: false,
      checks,
      message:
        '서버에서 공유 주소 연결을 확인하지 못했습니다. Codespace 실행 상태·포트 전달·현재 HTTPS 주소를 확인하세요.',
    }
  }
}
