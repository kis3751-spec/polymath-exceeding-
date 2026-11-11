import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { runtimeConfig, runtimePort } from '../server/runtime-config.mjs'
import { connectionEnvironment } from './connection-options.mjs'
import {
  AUTH_VERSION,
  probePublicAccess,
  formatPublicChecks,
} from '../server/sharing.mjs'

/** Explicit operator action; never opens a port automatically at server startup. */
export async function shareCodespaces(
  env = process.env,
  run = spawnSync,
  fetchImpl = fetch,
) {
  const port = runtimePort(env)
  const cfg = runtimeConfig(env, port)
  if (!cfg.codespaces)
    throw Error('이 명령은 실행 중인 Codespaces 터미널에서 사용하세요.')
  if (!/^[a-zA-Z0-9-]+$/.test(env.CODESPACE_NAME))
    throw Error('Codespace 이름을 확인하세요.')
  const local = `http://127.0.0.1:${port}`
  const options = {
    redirect: 'manual',
    credentials: 'omit',
    signal: AbortSignal.timeout(4000),
  }
  let status
  try {
    const response = await fetchImpl(local + '/ivc-auth/status', options)
    if (!response.ok) throw Error('status')
    status = await response.json()
    const protectedFile = await fetchImpl(local + '/solver.wasm', options)
    await protectedFile.body?.cancel()
    if (
      status.service !== 'IVC' ||
      status.version !== AUTH_VERSION ||
      status.accessControl !== 'invite-only' ||
      typeof status.instance !== 'string' ||
      protectedFile.status !== 401
    )
      throw Error('guard')
  } catch {
    throw Error(
      `${port} 포트에서 최신 IVC 보호 서버를 확인하지 못했습니다. 먼저 npm run dev -- --port ${port}를 실행하세요. 공개 설정은 변경하지 않았습니다.`,
    )
  }
  const result = run(
    'gh',
    [
      'codespace',
      'ports',
      'visibility',
      `${port}:public`,
      '--codespace',
      env.CODESPACE_NAME,
    ],
    { stdio: 'inherit' },
  )
  if (result.error || result.status !== 0)
    throw Error(
      `GitHub에서 Public 설정을 적용하지 못했습니다. Ports → ${port} → Port Visibility → Public으로 변경하세요. 조직 정책이 제한하면 상시 HTTPS 서버에 배포해야 합니다.`,
    )
  const probe = await probePublicAccess(cfg.origin, status.instance, fetchImpl)
  return { origin: cfg.origin, visibilityApplied: true, probe }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const report = await shareCodespaces(
      connectionEnvironment(process.argv.slice(2)),
    )
    console.log(
      `포트 Public 설정 적용: ${report.origin}\nSite: ${report.probe.entryUrl}`,
    )
    console.log(`Public: ${report.probe.state} · ${report.probe.message}`)
    const checks = formatPublicChecks(report.probe)
    if (checks) console.log(checks)
    if (report.probe.reachable) {
      console.log(
        '사이트 검사 통과 · 상대방 브라우저에서도 현재 주소를 확인하세요. 계산기는 IVC 로그인이 필요합니다. Codespace가 정지되면 주소도 중단됩니다.',
      )
    } else {
      console.error(
        'Public 설정 변경은 완료했지만 사이트 접속 검사는 통과하지 못했습니다. 위 파일별 결과를 확인하세요. 서버나 계정 DB를 초기화하지 마세요.',
      )
      process.exitCode = 1
    }
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
