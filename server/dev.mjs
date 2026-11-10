import { spawnSync } from 'node:child_process'
// The public development command uses the same access gate as deployment.
const built = spawnSync('npm', ['run', 'build'], { stdio: 'inherit' })
if (built.status !== 0) process.exit(built.status ?? 1)
await import('./start.mjs')
