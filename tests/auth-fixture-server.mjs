// Local test fixture only. It runs the real authorization server, never a bypass.
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { AccessStore } from '../server/store.mjs'
import { createAccessServer } from '../server/app.mjs'
const port = Number(process.env.IVC_TEST_PORT ?? 5173),
  root = await mkdtemp(resolve(tmpdir(), 'ivc-e2e-'))
const store = new AccessStore(resolve(root, 'access.sqlite'))
await store.bootstrap('owner@example.test', 'IVC-browser-test-password!')
const { server } = await createAccessServer({
  origin: `http://127.0.0.1:${port}`,
  loopbackProxyHosts: [`localhost:${port}`],
  store,
  dist: resolve('dist'),
})
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
