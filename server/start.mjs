import { resolve } from 'node:path'
import { createAccessServer } from './app.mjs'
const args = process.argv.slice(2),
  at = args.indexOf('--port')
const port = Number(at >= 0 ? args[at + 1] : (process.env.PORT ?? 5173))
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw Error('유효한 포트가 필요합니다.')
const codespace = process.env.CODESPACE_NAME,
  forward = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
const origin =
  process.env.APP_ORIGIN ??
  (codespace && forward
    ? `https://${codespace}-${port}.${forward}`
    : `http://127.0.0.1:${port}`)
if (process.env.NODE_ENV === 'production' && !process.env.APP_ORIGIN)
  throw Error('운영 APP_ORIGIN을 명시하세요.')
if (
  origin.startsWith('http:') &&
  !['127.0.0.1', 'localhost', '::1'].includes(process.env.HOST ?? '127.0.0.1')
)
  throw Error(
    'HTTP 개발 서버는 loopback에서만 열 수 있습니다. HTTPS 프록시와 APP_ORIGIN을 설정하세요.',
  )
const { server } = await createAccessServer({
  origin,
  production: process.env.NODE_ENV === 'production',
  proxyHost: process.env.IVC_PROXY_HOST,
  database: resolve(process.env.IVC_DATA_DIR ?? '.ivc-data', 'access.sqlite'),
  dist: resolve('dist'),
})
server.listen(port, process.env.HOST ?? '127.0.0.1', () =>
  console.log(
    `IVC secure server: ${origin}\n로그인 후 계산기에 접속할 수 있습니다.`,
  ),
)
server.on('error', (e) => {
  console.error('IVC server:', e.code)
  process.exitCode = 1
})
