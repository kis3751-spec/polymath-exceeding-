import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import { runtimeConfig, runtimePort } from '../server/runtime-config.mjs'
import { AUTH_VERSION, localOrigin } from '../server/sharing.mjs'
import { welcomePath } from '../server/gateway/response.js'
import { connectionEnvironment } from './connection-options.mjs'
const execute = promisify(execFile)

function originOnly(value) {
  const url = new URL(value)
  if (
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    !(
      url.protocol === 'https:' ||
      (url.protocol === 'http:' && localOrigin(url.origin))
    )
  )
    throw Error('사이트 원점을 확인하세요.')
  return url.origin
}
/** A browser helper receives exactly one validated URL, without a shell. A
 * successful IPC request does not prove the remote browser finished loading. */
export async function launchSite(entryUrl, env = process.env, run = execute) {
  const url = new URL(entryUrl)
  originOnly(url.origin)
  if (
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.hash ||
    !/^[\w-]{36}$/.test(url.searchParams.get('_ivc_page') ?? '') ||
    url.searchParams.size !== 1
  )
    throw Error('새 IVC 접속 주소를 확인하세요.')
  if (!env.BROWSER || env.BROWSER === 'none')
    return { requested: false, reason: 'unavailable' }
  try {
    await run(env.BROWSER, [url.href], {
      shell: false,
      timeout: 5000,
      maxBuffer: 16_384,
      windowsHide: true,
    })
    return { requested: true }
  } catch {
    return { requested: false, reason: 'failed' }
  }
}

/** Read the actual protected server before opening a fresh welcome URL. No
 * credentials, visibility changes or DB writes; stale shell origins cannot
 * replace the live server's origin with an arbitrary address. */
export async function openSite(
  env = process.env,
  run = execute,
  fetchImpl = fetch,
) {
  const port = runtimePort(env)
  const local = `http://127.0.0.1:${port}`
  const get = (path) =>
    fetchImpl(local + path, {
      redirect: 'manual',
      credentials: 'omit',
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    })
  let data
  try {
    const response = await get('/ivc-auth/status')
    if (!response.ok) throw Error('status')
    const reader = response.body?.getReader()
    const chunks = []
    let size = 0
    if (reader)
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.length
        if (size > 16_384) {
          await reader.cancel()
          throw Error('size')
        }
        chunks.push(value)
      }
    data = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (
      data.service !== 'IVC' ||
      data.accessControl !== 'invite-only' ||
      typeof data.instance !== 'string'
    )
      throw Error('guard')
  } catch {
    throw Error(
      `${port} 포트에서 실행 중인 IVC를 확인하지 못했습니다. 먼저 서버의 시작 완료 메시지를 확인하세요.`,
    )
  }
  if (data.version !== AUTH_VERSION)
    throw Error(
      `실행 중인 서버는 이전 버전입니다. Git 업데이트만으로 실행 중인 서버가 바뀌지는 않습니다. 서버를 Ctrl+C로 종료하고 npm run dev -- --port ${port}로 다시 실행하세요. 새 서버의 표시: ${AUTH_VERSION}`,
    )
  const liveOrigin = originOnly(data.origin)
  const allowed = new Set()
  for (const candidate of [
    env,
    { ...env, APP_ORIGIN: undefined, NODE_ENV: undefined },
  ]) {
    try {
      allowed.add(originOnly(runtimeConfig(candidate, port).origin))
    } catch {
      /* invalid stale shell configuration is not authority */
    }
  }
  if (!allowed.has(liveOrigin))
    throw Error(
      '실행 중인 서버의 Origin이 현재 Codespace/설정과 다릅니다. 실제 Origin을 --origin으로 지정하세요.',
    )
  const resource = await get('/solver.wasm')
  await resource.body?.cancel()
  if (resource.status !== 401)
    throw Error(
      '익명 계산 파일 차단을 확인하지 못했습니다. 브라우저를 자동으로 열지 않았습니다.',
    )
  const entryUrl = new URL(welcomePath('/'), liveOrigin).href
  const browser = await launchSite(entryUrl, env, run)
  return { origin: liveOrigin, entryUrl, browser, version: data.version }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const report = await openSite(connectionEnvironment(process.argv.slice(2)))
    console.log(`IVC live server: ${report.version}\nSite: ${report.entryUrl}`)
    console.log(
      report.browser.requested
        ? '브라우저에 새 IVC 주소 열기를 요청했습니다.'
        : '자동 브라우저 도구를 사용할 수 없습니다. 위 Site 링크 전체를 클릭하세요.',
    )
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
