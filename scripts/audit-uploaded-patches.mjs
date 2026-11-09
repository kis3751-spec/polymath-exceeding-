// Isolated release gates for the three reviewed uploads. This never overwrites src/.
// A nonzero exit is expected for the rejected 2026-11-09 attachments.
import {
  mkdtemp,
  cp,
  readFile,
  writeFile,
  mkdir,
  symlink,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const underflow = process.argv.includes('--underflow')
const inputs = process.argv.slice(2).filter((arg) => arg !== '--underflow')
if (inputs.length !== 3) {
  process.stderr.write(
    'Usage: node scripts/audit-uploaded-patches.mjs <fixes.md> <probability1.ts> <probability2.ts> [--underflow]\n',
  )
  process.exit(2)
}
const [markdown, automatic, certificate] = await Promise.all(
  inputs.map((path) => readFile(path, 'utf8')),
)
inputs.forEach((path, i) =>
  process.stdout.write(
    `${createHash('sha256').update([markdown, automatic, certificate][i]).digest('hex')}  ${path}\n`,
  ),
)
const target = await mkdtemp(join(tmpdir(), 'polymath-upload-review-'))
const modules = [
  ...markdown.matchAll(
    /## src\/engine\/([^\n]+)\n[\s\S]*?```typescript\n([\s\S]*?)\n```/g,
  ),
]
if (!modules.length || modules.some((m) => !/^[-a-z]+\.ts$/.test(m[1])))
  throw new Error('Invalid module bundle')
for (const version of ['fixes', 'probability']) {
  const engine = join(target, version, 'engine')
  await mkdir(engine, { recursive: true })
  await cp(join(root, 'src/engine'), engine, { recursive: true })
  for (const module of modules)
    await writeFile(join(engine, module[1]), module[2] + '\n')
}
await writeFile(join(target, 'probability/engine/automatic.ts'), automatic)
await writeFile(
  join(target, 'probability/engine/interval-certification.ts'),
  certificate,
)
await symlink(join(root, 'node_modules'), join(target, 'node_modules'), 'dir')
await cp(
  join(root, 'scripts/audit-fixtures/upload-gates.fixture'),
  join(target, 'upload-gates.test.ts'),
)
if (underflow) {
  const gates = join(target, 'upload-gates.test.ts')
  await writeFile(
    gates,
    (await readFile(gates, 'utf8')) +
      '\n' +
      (await readFile(
        join(root, 'scripts/audit-fixtures/underflow-gates.fixture'),
        'utf8',
      )),
  )
}
await writeFile(
  join(target, 'vite.config.mts'),
  `import { defineConfig } from 'vitest/config'\nexport default defineConfig({root:${JSON.stringify(target)},test:{include:['upload-gates.test.ts'],reporters:['verbose']}})\n`,
)
process.stdout.write(`Isolated fixture: ${target}\n`)
const child = spawnSync(
  process.execPath,
  [
    join(root, 'node_modules/vitest/vitest.mjs'),
    'run',
    '--config',
    join(target, 'vite.config.mts'),
  ],
  { cwd: root, stdio: 'inherit' },
)
if (child.error) throw child.error
process.exitCode = child.status ?? 1
