import { resolve } from 'node:path'

export const isCodespaces = (env) =>
  Boolean(env.CODESPACE_NAME && env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN)
export function runtimePort(env, explicit) {
  const port = Number(explicit ?? env.PORT ?? (isCodespaces(env) ? 5180 : 5173))
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw Error('유효한 포트가 필요합니다.')
  return port
}
/** Only trusted process configuration selects the public origin/proxy hosts. */
export function runtimeConfig(env, port) {
  const codespaces = isCodespaces(env)
  const origin =
    env.APP_ORIGIN ??
    (codespaces
      ? `https://${env.CODESPACE_NAME}-${port}.${env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`
      : `http://127.0.0.1:${port}`)
  // Codespaces forwards through its container network. Local/production installs
  // keep the loopback default; an explicit operator override still wins.
  const host = env.HOST ?? (codespaces ? '0.0.0.0' : '127.0.0.1')
  if (env.NODE_ENV === 'production' && !env.APP_ORIGIN)
    throw Error('운영 APP_ORIGIN을 명시하세요.')
  if (
    origin.startsWith('http:') &&
    !['127.0.0.1', 'localhost', '::1'].includes(host)
  )
    throw Error(
      'HTTP 개발 서버는 loopback에서만 열 수 있습니다. HTTPS 프록시와 APP_ORIGIN을 설정하세요.',
    )
  return {
    origin,
    host,
    codespaces,
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

/** A proxy-origin exception never suffices on its own: callers also verify CSRF. */
export function proxyRewrittenOrigin(req, cfg) {
  const peer = req.socket.remoteAddress
  if (
    !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(peer) ||
    !cfg.loopbackProxyHosts?.length ||
    !acceptedHost(req, cfg)
  )
    return false
  const origin = req.headers.origin
  if (!origin) return req.headers['sec-fetch-site'] === 'same-origin'
  return cfg.loopbackProxyHosts.some(
    (host) => origin === `http://${host}` || origin === `https://${host}`,
  )
}
