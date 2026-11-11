import { responseData } from './response.js'

const entryActions = new Set([
  '/api/login',
  '/api/begin-invite',
  '/api/accept-invite',
])
export const isSessionRequired = (error) =>
  error?.status === 401 && error?.code === 'SESSION_REQUIRED'
const accountChanged = () =>
  Object.assign(
    new Error(
      '다른 계정으로 로그인 상태가 바뀌었습니다. 현재 계정을 다시 확인합니다.',
    ),
    { code: 'ACCOUNT_CHANGED' },
  )

/** Cookie-only authentication. Tokens and request bodies are never persisted. */
export function createAuthRequests(fetchImpl = fetch) {
  async function get(path, active = false) {
    if (path === '/api/session' || path === '/ivc-auth/session')
      return session(active)
    try {
      return await send(path, undefined, undefined, active)
    } catch (error) {
      if (!isSessionRequired(error)) throw error
      // Read-only recovery: verify the cookie again before hiding management.
      await session(active)
      return send(path, undefined, undefined, active, true)
    }
  }
  async function send(path, body, csrf, active = false, fresh = false) {
    path = path.replace(/^\/ivc-auth(?=\/)/, '/api')
    if (!/^\/api\/[a-z/-]+$/.test(path))
      throw Error('잘못된 인증 요청 경로입니다.')
    const response = await fetchImpl(
      path.replace(/^\/api(?=\/)/, '/ivc-auth') +
        (fresh ? `?_ivc_check=${Date.now()}-${++checkSequence}` : ''),
      {
        method: body === undefined ? 'GET' : 'POST',
        credentials: 'same-origin',
        redirect: 'error',
        cache: 'no-store',
        signal: AbortSignal.timeout(12_000),
        headers: {
          ...(body === undefined
            ? {}
            : { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }),
          ...(active ? { 'X-IVC-Active': '1' } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
    ).catch(() => {
      throw Error(
        '서버 연결 또는 리디렉션을 확인하지 못했습니다. 로그인 상태를 지우지 않았습니다. 잠시 후 다시 시도하세요.',
      )
    })
    return responseData(response, path)
  }
  async function session(active = false) {
    let data
    try {
      data = await send('/api/session', undefined, undefined, active)
    } catch (error) {
      if (!isSessionRequired(error)) throw error
      // A request can have left with the previous cookie while another tab
      // completed login. Confirm with a new request and the current cookie.
      // Do not change cookies or grant access from locally remembered state.
      data = await send('/api/session', undefined, undefined, active, true)
    }
    if (
      !data.user ||
      typeof data.user.id !== 'string' ||
      !data.user.id ||
      typeof data.user.email !== 'string' ||
      !['owner', 'member'].includes(data.user.role) ||
      typeof data.csrf !== 'string' ||
      !/^[\w-]{43}$/.test(data.csrf)
    )
      throw Error(
        '로그인 서버의 세션 응답이 올바르지 않습니다. 연결을 확인한 뒤 다시 시도하세요.',
      )
    return data
  }
  async function post(path, body, expectedUserId) {
    path = path.replace(/^\/ivc-auth(?=\/)/, '/api')
    const entry = entryActions.has(path)
    for (let attempt = 0; attempt < 2; attempt++) {
      let proof
      if (entry) {
        proof = (await get('/api/csrf')).csrf
        if (typeof proof !== 'string' || !/^[\w-]{43}$/.test(proof))
          throw Error('로그인 보안 토큰을 받지 못했습니다. 다시 시도하세요.')
      } else {
        if (!expectedUserId)
          throw Object.assign(new Error('로그인이 필요합니다.'), {
            status: 401,
            code: 'SESSION_REQUIRED',
          })
        const current = await session(true)
        if (current.user.id !== expectedUserId) throw accountChanged()
        proof = current.csrf
      }
      try {
        return await send(path, body, proof)
      } catch (error) {
        if (!entry && isSessionRequired(error)) {
          const current = await session(true)
          if (current.user.id !== expectedUserId) throw accountChanged()
          if (attempt === 0) continue
          throw Error(
            '로그인은 유지되어 있습니다. 요청을 완료하지 못했으므로 잠시 후 다시 시도하세요.',
          )
        }
        // These responses are emitted before any mutation or password attempt.
        // Refresh only a stale proof, once; never replay an unknown outcome.
        if (
          attempt === 0 &&
          error.status === 403 &&
          error.code === (entry ? 'ENTRY_CSRF' : 'SESSION_CSRF')
        )
          continue
        throw error
      }
    }
  }
  return { get, session, post }
}
let checkSequence = 0
const client = createAuthRequests()
export const authGet = client.get
export const getAuthSession = client.session
export const postAuth = client.post
