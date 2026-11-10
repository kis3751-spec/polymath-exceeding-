import { spawnSync } from 'node:child_process'
import { createServer as createHttpsServer } from 'node:https'
// Local test fixture only. It runs the real authorization server, never a bypass.
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { AccessStore } from '../server/store.mjs'
import { createAccessServer } from '../server/app.mjs'
const port = Number(process.env.IVC_TEST_PORT ?? 5173),
  root = await mkdtemp(resolve(tmpdir(), 'ivc-e2e-'))
const store = new AccessStore(resolve(root, 'access.sqlite'))
await store.bootstrap('owner@example.test', 'IVC-browser-test-password!')
const tls = process.env.IVC_TEST_TLS === '1'
const application = await createAccessServer({
  origin: `${tls ? 'https' : 'http'}://127.0.0.1:${port}`,
  loopbackProxyHosts: [`localhost:${port}`],
  store,
  dist: resolve('dist'),
})
let server = application.server
if (tls) {
  const key = resolve(root, 'test.key'),
    cert = resolve(root, 'test.crt')
  const result = spawnSync(
    'openssl',
    [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-keyout',
      key,
      '-out',
      cert,
      '-days',
      '1',
      '-subj',
      '/CN=localhost',
      '-addext',
      'subjectAltName=IP:127.0.0.1,DNS:localhost',
    ],
    { stdio: 'ignore' },
  )
  if (result.status !== 0)
    throw Error('Unable to create local HTTPS test certificate')
  server = createHttpsServer(
    { key: await readFile(key), cert: await readFile(cert) },
    application.server.listeners('request')[0],
  )
}
server.listen(port, '127.0.0.1')
async function stop() {
  server.closeAllConnections()
  await new Promise((r) => server.close(r))
  store.close()
  await rm(root, { recursive: true, force: true })
  process.exit(0)
}
process.on('SIGTERM', () => void stop())
process.on('SIGINT', () => void stop())
