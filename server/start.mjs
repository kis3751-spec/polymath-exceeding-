import { runtimeConfig } from './runtime-config.mjs'
import { createAccessServer } from './app.mjs'
const args = process.argv.slice(2),
  at = args.indexOf('--port')
const port = Number(at >= 0 ? args[at + 1] : (process.env.PORT ?? 5173))
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw Error('유효한 포트가 필요합니다.')
const cfg = runtimeConfig(process.env, port)
const { server } = await createAccessServer(cfg)
server.listen(port, process.env.HOST ?? '127.0.0.1', () =>
  console.log(
    `IVC secure server: ${cfg.origin}\nAuthentication routes: /ivc-auth (auth-v3)\n로그인 후 계산기에 접속할 수 있습니다.`,
  ),
)
server.on('error', (e) => {
  console.error('IVC server:', e.code)
  if (e.code === 'EADDRINUSE')
    console.error(
      `${port} 포트를 사용하는 기존 서버를 먼저 종료하세요. 현재 새 서버는 시작되지 않았습니다.`,
    )
  process.exitCode = 1
})
