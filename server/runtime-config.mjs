import { resolve } from 'node:path'

/** Only trusted process configuration selects the public origin/proxy hosts. */
export function runtimeConfig(env, port) {
  const codespaces = Boolean(
    env.CODESPACE_NAME && env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN,
  )
  const origin =
    env.APP_ORIGIN ??
    (codespaces
      ? `https://${env.CODESPACE_NAME}-${port}.${env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`
      : `http://127.0.0.1:${port}`)
  if (env.NODE_ENV === 'production' && !env.APP_ORIGIN)
    throw Error('운영 APP_ORIGIN을 명시하세요.')
  if (
    origin.startsWith('http:') &&
    !['127.0.0.1', 'localhost', '::1'].includes(env.HOST ?? '127.0.0.1')
  )
    throw Error(
      'HTTP 개발 서버는 loopback에서만 열 수 있습니다. HTTPS 프록시와 APP_ORIGIN을 설정하세요.',
    )
  return {
    origin,
    production: env.NODE_ENV === 'production',
    proxyHost: env.IVC_PROXY_HOST,
    // Codespaces replaces Host with an internal loopback authority.
    // Forwarded headers are never used to choose trusted hosts or origins.
    loopbackProxyHosts: codespaces
      ? ['localhost', '127.0.0.1', '[::1]'].flatMap((host) => [
          host,
          `${host}:${port}`,
        ])
      : [],
    database: resolve(env.IVC_DATA_DIR ?? '.ivc-data', 'access.sqlite'),
    dist: resolve('dist'),
  }
}
export function acceptedHost(req, cfg) {
  const host = req.headers.host
  if (
    host === new URL(cfg.origin).host ||
    (cfg.proxyHost && host === cfg.proxyHost)
  )
    return true
  const peer = req.socket.remoteAddress
  return (
    ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(peer) &&
    (cfg.loopbackProxyHosts ?? []).includes(host)
  )
}
