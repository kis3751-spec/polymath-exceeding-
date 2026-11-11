import { runtimeConfig, runtimePort } from './runtime-config.mjs'
import { createAccessServer } from './app.mjs'
import { AUTH_VERSION, formatPublicChecks } from './sharing.mjs'
import { diagnoseCodespaces } from '../scripts/diagnose-codespaces.mjs'
const args = process.argv.slice(2),
  at = args.indexOf('--port')
if (at >= 0 && !args[at + 1]) throw Error('--port 값이 필요합니다.')
const port = runtimePort(process.env, at >= 0 ? args[at + 1] : undefined)
const cfg = runtimeConfig(process.env, port)
const { server } = await createAccessServer(cfg)
server.listen(port, cfg.host, () => {
  console.log(
    `IVC secure server: ${cfg.origin}\nInternal listener: http://${cfg.host.includes(':') ? `[${cfg.host}]` : cfg.host}:${port}\nAuthentication routes: /ivc-auth (${AUTH_VERSION})\n로그인 후 계산기에 접속할 수 있습니다.${cfg.codespaces ? `\nCodespaces port: ${port} · Port Protocol = HTTP, Port Visibility = Public\n타인 초대 전: 새 터미널에서 PORT=${port} npm run share:codespaces\n404 진단: 새 터미널에서 PORT=${port} npm run diagnose:codespaces` : ''}`,
  )
  if (cfg.codespaces)
    void diagnoseCodespaces({ ...process.env, PORT: String(port) })
      .then((report) => {
        console.log(
          `IVC local check: ${report.local.state} · ${report.local.message}`,
        )
        if (report.external)
          console.log(
            `IVC public check: ${report.external.state}${report.external.status ? ` (HTTP ${report.external.status})` : ''} · ${report.external.message}`,
          )
        const checks = formatPublicChecks(report.external)
        if (checks) console.log(checks)
        if (
          report.local.state === 'ready' &&
          ['blocked', 'unavailable'].includes(report.external?.state)
        )
          console.log(
            `로컬 서버는 정상입니다. Codespaces의 기존 포트 전달을 중지한 뒤 ${port}을 다시 추가하고 HTTP · Public으로 설정한 후 Open in Browser로 여세요.`,
          )
      })
      .catch(() =>
        console.error('IVC connection check: 진단을 완료하지 못했습니다.'),
      )
})
server.on('error', (e) => {
  console.error('IVC server:', e.code)
  if (e.code === 'EADDRINUSE')
    console.error(
      `${port} 포트를 사용하는 기존 서버를 먼저 종료하세요. 현재 새 서버는 시작되지 않았습니다.`,
    )
  process.exitCode = 1
})
