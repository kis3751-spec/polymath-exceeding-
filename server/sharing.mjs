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

/** Anonymous probe of the configured origin only; never follow a GitHub login redirect. */
export async function probePublicAccess(origin, instance, fetchImpl = fetch) {
  if (localOrigin(origin))
    return {
      state: 'local',
      reachable: false,
      message:
        '현재 주소는 이 컴퓨터에서만 열립니다. 다른 사람과 공유하려면 공개 HTTPS 주소가 필요합니다.',
    }
  try {
    const response = await fetchImpl(new URL('/ivc-auth/status', origin), {
      redirect: 'manual',
      credentials: 'omit',
      cache: 'no-store',
      signal: AbortSignal.timeout(6500),
      headers: { Accept: 'application/json' },
    })
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel()
      return {
        state: 'blocked',
        reachable: false,
        status: response.status,
        message:
          '주소가 IVC 대신 다른 로그인 화면으로 이동합니다. Codespaces의 Ports → 5173 → Port Visibility를 Public으로 변경하세요. 다른 GitHub 계정으로 로그인하는 것만으로 Private 포트에 접근할 수는 없습니다.',
      }
    }
    if (!response.ok) {
      await response.body?.cancel()
      return {
        state: 'blocked',
        reachable: false,
        status: response.status,
        message: `외부에서 IVC에 직접 접속하지 못했습니다(HTTP ${response.status}). 포트 Public 설정, 실행 중인 서버와 공유 주소를 확인하세요.`,
      }
    }
    // Keep intermediary error pages bounded; no credential or response body is logged.
    const reader = response.body?.getReader()
    let size = 0
    const chunks = []
    if (reader)
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.length
        if (size > 16384) {
          await reader.cancel()
          throw Error('response size')
        }
        chunks.push(value)
      }
    let data
    try {
      data = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    } catch {
      return {
        state: 'mismatch',
        reachable: false,
        message:
          '공유 주소가 IVC 상태 응답을 반환하지 않습니다. GitHub 로그인 화면이나 다른 서버에 연결되는지 확인하세요.',
      }
    }
    if (data.service !== 'IVC' || data.instance !== instance)
      return {
        state: 'mismatch',
        reachable: false,
        message:
          '공유 주소가 현재 서버와 다릅니다. APP_ORIGIN과 포트에서 실행 중인 서버를 확인하세요.',
      }
    return {
      state: 'ready',
      reachable: true,
      message:
        '로그인하지 않은 외부 요청이 이 IVC 서버까지 도착했습니다. 계산기는 계속 IVC 로그인이 필요합니다.',
    }
  } catch {
    return {
      state: 'unavailable',
      reachable: false,
      message:
        '공유 주소 연결을 확인하지 못했습니다. Codespace가 실행 중인지, 포트가 Public인지와 HTTPS 주소를 확인하세요.',
    }
  }
}
