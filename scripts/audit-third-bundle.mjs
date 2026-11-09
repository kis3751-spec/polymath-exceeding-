// Review an uploaded bundle in an isolated copy; never overwrite the live engine.
import { cp, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const [input] = process.argv.slice(2)
if (!input)
  throw new Error('Usage: node scripts/audit-third-bundle.mjs <bundle.md>')
const markdown = await readFile(input, 'utf8')
const modules = [
  ...markdown.matchAll(
    /## src\/engine\/([^\n]+)\n[\s\S]*?```typescript\n([\s\S]*?)\n```/g,
  ),
]
if (!modules.length || modules.some((m) => !/^[-a-z]+\.ts$/.test(m[1])))
  throw new Error('Invalid module bundle')
const target = await mkdtemp(join(tmpdir(), 'polymath-third-review-'))
for (const folder of ['src', 'tests', 'public'])
  await cp(join(root, folder), join(target, folder), { recursive: true })
for (const name of [
  'package.json',
  'tsconfig.json',
  'vite.config.ts',
  'playwright.config.ts',
])
  await cp(join(root, name), join(target, name))
await symlink(join(root, 'node_modules'), join(target, 'node_modules'), 'dir')
for (const m of modules)
  await writeFile(join(target, 'src/engine', m[1]), m[2] + '\n')
await cp(
  join(root, 'scripts/audit-fixtures/v3-expanded.fixture'),
  join(target, 'tests/uploaded-v3.test.ts'),
)
const reference = spawnSync(
  'python3',
  [join(root, 'scripts/audit-fixtures/high_precision_reference.py')],
  { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 },
)
if (reference.status !== 0) throw new Error(reference.stderr)
await writeFile(
  join(target, 'tests/uploaded-v3-reference.json'),
  reference.stdout,
)
console.log(`SHA-256: ${createHash('sha256').update(markdown).digest('hex')}`)
console.log(`Isolated fixture: ${target}`)
const run = (label, args) => {
  console.log(`\n${label}`)
  const child = spawnSync(process.execPath, args, {
    cwd: target,
    stdio: 'inherit',
  })
  if (child.error) throw child.error
  return child.status ?? 1
}
const typecheck = run('TypeScript compatibility', [
  join(root, 'node_modules/typescript/bin/tsc'),
  '--noEmit',
  '--pretty',
  'false',
])
const tests = run('Expanded audit and current regression suite', [
  join(root, 'node_modules/vitest/vitest.mjs'),
  'run',
])
await writeFile(
  join(target, 'audit-summary.json'),
  JSON.stringify(
    {
      input,
      sha256: createHash('sha256').update(markdown).digest('hex'),
      typecheck,
      tests,
    },
    null,
    2,
  ),
)
process.exitCode = typecheck || tests
