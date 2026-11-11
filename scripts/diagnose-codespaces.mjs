import { pathToFileURL } from 'node:url'
import { runtimeConfig, runtimePort } from '../server/runtime-config.mjs'
import { connectionEnvironment } from './connection-options.mjs'
import {
  AUTH_VERSION,
  probePublicAccess,
  formatPublicChecks,
} from '../server/sharing.mjs'

/** Read-only diagnostics; never send cookies or change port visibility. */
export async function diagnoseCodespaces(env = process.env, fetchImpl = fetch) {
  const port = runtimePort(env)
  const cfg = runtimeConfig(env, port)
  const url = new URL(cfg.origin)
  if (
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  )
    throw Error('APP_ORIGIN은 경로·인증 정보 없는 원점이어야 합니다.')
  const base = `http://127.0.0.1:${port}`
  const get = (path, method = 'GET') =>
    fetchImpl(base + path, {
      method,
      redirect: 'manual',
      credentials: 'omit',
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    })
  const result = {
    origin: url.origin,
    port,
    local: { state: 'unavailable', message: '' },
    external: null,
  }
  try {
    const status = await get('/ivc-auth/status')
    // Public state is small. Never include a proxy response body in output.
    const text = await status.text()
    if (!status.ok || text.length > 16384) throw Error('status')
    const data = JSON.parse(text)
    if (
      data.service !== 'IVC' ||
      data.version !== AUTH_VERSION ||
      data.accessControl !== 'invite-only' ||
      typeof data.instance !== 'string'
    )
      throw Error('server')
    const welcome = await get('/', 'HEAD')
    if (
      !welcome.ok ||
      !welcome.headers.get('content-type')?.includes('text/html')
    ) {
      result.local = {
        state: 'gateway-error',
        message: `상태 API는 정상이나 소개 화면에 문제가 있습니다(HTTP ${welcome.status}). server/gateway 파일과 실행 경로를 확인하세요.`,
      }
      return result
    }
    const protectedFile = await get('/solver.wasm')
    await protectedFile.body?.cancel()
    if (protectedFile.status !== 401) {
      result.local = {
        state: 'unprotected',
        message:
          '익명 계산 파일 차단을 확인하지 못했습니다. 해당 포트를 공유하지 말고 IVC 보호 서버를 실행하세요.',
      }
      return result
    }
    result.local = {
      state: 'ready',
      message: '로컬 IVC · 소개 화면 · 익명 계산 파일 차단 정상',
    }
    result.external = await probePublicAccess(
      cfg.origin,
      data.instance,
      fetchImpl,
    )
    return result
  } catch {
    result.local.message = `${port} 포트에서 최신 IVC 상태 응답을 받지 못했습니다. 서버가 실행 중인지, 다른 서버가 포트를 차지하는지 확인하세요.`
    return result
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const report = await diagnoseCodespaces(
      connectionEnvironment(process.argv.slice(2)),
    )
    console.log(
      `IVC connection check\nSite: ${report.origin}\nLocal: ${report.local.state} · ${report.local.message}`,
    )
    if (report.external)
      console.log(
        `Public: ${report.external.state}${report.external.status ? ` (HTTP ${report.external.status})` : ''} · ${report.external.message}`,
      )
    const checks = formatPublicChecks(report.external)
    if (checks) console.log(checks)
    if (
      report.local.state === 'ready' &&
      ['blocked', 'unavailable'].includes(report.external?.state)
    )
      console.log(
        `로컬 서버는 정상입니다. Codespaces Ports에서 ${report.port} 전달 항목을 중지한 뒤 다시 추가하고, Port Protocol=HTTP · Port Visibility=Public으로 설정한 뒤 Open in Browser로 여세요. Codespace 재시작·주소 변경 여부도 확인하세요.`,
      )
    if (report.local.state !== 'ready' || report.external?.reachable !== true)
      process.exitCode = 1
  } catch (error) {
    console.error(error.message)
    console.error(
      '사이트 주소는 경로·쿼리·로그인 정보 없이 입력하세요. 예: npm run diagnose:codespaces -- --port 5181 --origin https://your-space-5181.app.github.dev',
    )
    process.exitCode = 1
  }
}
