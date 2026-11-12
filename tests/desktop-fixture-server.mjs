import { mkdtemp, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { createDesktopBackend } from '../release/IVC-Desktop-Windows-x64/app/desktop/backend.mjs'

// Exercise the exact protected backend and UI copied into the desktop package.
const dataDir = await mkdtemp(resolve(tmpdir(), 'ivc-desktop-browser-'))
const backend = createDesktopBackend({
  dataDir,
  port: 4189,
  dist: resolve('release/IVC-Desktop-Windows-x64/app/dist'),
})
await backend.setup('owner@example.test', 'IVC-browser-test-password!')
await backend.start()
let stopping = false
async function stop() {
  if (stopping) return
  stopping = true
  await backend.stop()
  await rm(dataDir, { recursive: true, force: true })
  process.exit(0)
}
process.on('SIGTERM', () => void stop())
process.on('SIGINT', () => void stop())
