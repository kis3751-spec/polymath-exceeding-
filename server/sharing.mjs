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
  function blocked(path, status) {
    return {
      state: 'blocked',
      reachable: false,
      path,
      status,
      checks,
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
      return blocked('/ivc-auth/status', response.status)
    }
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
    if (data.instance !== instance)
      return {
        state: 'mismatch',
        reachable: false,
        path: '/ivc-auth/status',
        checks,
        message:
          '공유 주소가 현재 서버와 다릅니다. APP_ORIGIN과 실행 중인 서버를 확인하세요.',
      }
    checks.push({ path: '/ivc-auth/status', status: response.status, ok: true })
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
        content: (text) => text.includes('responseData'),
      },
      {
        path: '/welcome.css',
        mime: /^text\/css\b/i,
        content: (text) => text.trim().length > 0,
      },
      {
        path: '/response.js',
        mime: /^(?:text|application)\/javascript\b/i,
        content: (text) => text.includes('responseData'),
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
        message: `현재 IVC 상태 API에 연결했습니다. ${failed.path} 페이지·파일 검사는 완료하지 못했지만, 관리자 초대 발급과 계정 재설정은 사용할 수 있습니다. 아래 상세 결과를 참고하고 상대방 브라우저에서 초대 링크를 확인하세요.`,
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
