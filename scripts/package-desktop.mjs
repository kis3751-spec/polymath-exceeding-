import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, cp, readdir, rm } from 'node:fs/promises'
import { resolve, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { desktopIcon, zipMember } from './desktop-assets.mjs'
const run = promisify(execFile)
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const nodeVersion = '24.22.1'
const out = join(root, 'release'),
  stage = join(out, 'IVC-Desktop-Windows-x64')
const cache = resolve(
  process.env.IVC_PACKAGE_CACHE ?? join(root, '.desktop-build-cache'),
)
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const execute = (file, args, options = {}) =>
  run(file, args, { cwd: root, maxBuffer: 4 * 1024 * 1024, ...options })
async function download(url, target) {
  await execute('curl', [
    '--fail',
    '--silent',
    '--show-error',
    '--location',
    '--proto',
    '=https',
    '--max-time',
    '180',
    url,
    '--output',
    target,
  ])
}
async function files(directory) {
  const result = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) result.push(...(await files(path)))
    else if (entry.isFile()) result.push(path)
  }
  return result
}
await mkdir(cache, { recursive: true })
await writeFile(join(root, 'desktop/ivc.ico'), desktopIcon())
const dotnet = process.env.IVC_DOTNET ?? 'dotnet'
await execute(dotnet, [
  'restore',
  'desktop/IVC.Desktop.csproj',
  '--locked-mode',
])
await execute(dotnet, [
  'build',
  'desktop/IVC.Desktop.csproj',
  '--configuration',
  'Release',
  '--no-restore',
])
const archiveName = `node-v${nodeVersion}-win-x64.zip`,
  archive = join(cache, archiveName)
const checksums = join(cache, `node-${nodeVersion}-SHASUMS256.txt`)
await download(
  `https://nodejs.org/dist/v${nodeVersion}/SHASUMS256.txt`,
  checksums,
)
const expected = (await readFile(checksums, 'utf8'))
  .split(/\r?\n/)
  .map((line) => line.trim().split(/\s+/))
  .find((parts) => parts[1] === archiveName)?.[0]
if (!/^[a-f0-9]{64}$/.test(expected ?? ''))
  throw Error('Official runtime checksum missing')
let runtime
try {
  runtime = await readFile(archive)
} catch {}
if (!runtime || hash(runtime) !== expected) {
  await download(
    `https://nodejs.org/dist/v${nodeVersion}/${archiveName}`,
    archive,
  )
  runtime = await readFile(archive)
}
if (hash(runtime) !== expected)
  throw Error('Windows Node.js runtime checksum mismatch')
await rm(stage, { recursive: true, force: true })
await mkdir(join(stage, 'runtime'), { recursive: true })
await mkdir(join(stage, 'app/desktop'), { recursive: true })
await writeFile(
  join(stage, 'runtime/node.exe'),
  zipMember(runtime, `node-v${nodeVersion}-win-x64/node.exe`),
)
await writeFile(
  join(stage, 'runtime/NODE-LICENSE.txt'),
  zipMember(runtime, `node-v${nodeVersion}-win-x64/LICENSE`),
)
const build = join(root, 'desktop/bin/Release/net48')
for (const name of [
  'IVC.exe',
  'IVC.exe.config',
  'Microsoft.Web.WebView2.Core.dll',
  'Microsoft.Web.WebView2.WinForms.dll',
])
  await cp(join(build, name), join(stage, name))
const loader =
  (await files(build)).find((f) =>
    /(?:^|[\\/])(?:x64|win-x64)[\\/].*WebView2Loader\.dll$/.test(f),
  ) ?? join(build, 'WebView2Loader.dll')
await cp(loader, join(stage, 'WebView2Loader.dll'))
await cp(join(root, 'server'), join(stage, 'app/server'), { recursive: true })
// Only the protected server is used, never Vite or the deployment entry script.
for (const name of ['start.mjs', 'dev.mjs', 'setup.mjs'])
  await rm(join(stage, 'app/server', name))
await cp(
  join(root, 'desktop/backend.mjs'),
  join(stage, 'app/desktop/backend.mjs'),
)
await cp(join(root, 'dist'), join(stage, 'app/dist'), { recursive: true })
await writeFile(
  join(stage, 'app/package.json'),
  '{"private":true,"type":"module"}\n',
)
await cp(join(root, 'desktop/읽어주세요.txt'), join(stage, '읽어주세요.txt'))
await cp(join(root, 'docs/DESKTOP_APP.md'), join(stage, 'DESKTOP_APP.md'))
const nuget = resolve(
  process.env.NUGET_PACKAGES ??
    join(process.env.USERPROFILE ?? process.env.HOME, '.nuget/packages'),
)
const webview = join(nuget, 'microsoft.web.webview2/1.0.4314.35')
const license = (await files(webview)).find((f) =>
  /[\\/]license(?:\.txt|\.md)?$/i.test(f),
)
if (!license) throw Error('WebView2 SDK license missing')
await cp(license, join(stage, 'WEBVIEW2-LICENSE.txt'))
const lock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'))
const notices = ['IVC client dependencies · third-party notices\n']
for (const [path, entry] of Object.entries(lock.packages)) {
  if (!path.startsWith('node_modules/') || entry.dev) continue
  if (path.split('/').includes('..')) throw Error('Invalid dependency path')
  const directory = join(root, path)
  const metadata = JSON.parse(
    await readFile(join(directory, 'package.json'), 'utf8'),
  )
  if (metadata.version !== entry.version)
    throw Error('Installed dependency version mismatch')
  notices.push(
    `\n${metadata.name} ${metadata.version} · ${metadata.license ?? 'See notice'}\n`,
  )
  const names = (await readdir(directory)).filter((name) =>
    /^licen[cs]e(?:[.-].*)?$/i.test(name),
  )
  if (!names.length)
    throw Error('Dependency license file missing: ' + metadata.name)
  for (const name of names)
    notices.push(await readFile(join(directory, name), 'utf8'))
}
await writeFile(join(stage, 'THIRD-PARTY-NOTICES.txt'), notices.join('\n'))
const manifest = {
  product: 'IVC Personal Desktop',
  platform: 'win-x64',
  nodeVersion,
  runtimeArchiveSha256: expected,
  files: {},
}
for (const file of await files(stage))
  manifest.files[file.slice(stage.length + 1).replaceAll('\\', '/')] = hash(
    await readFile(file),
  )
await writeFile(
  join(stage, 'manifest.json'),
  JSON.stringify(manifest, null, 2) + '\n',
)
const zip = join(out, 'IVC-Desktop-Windows-x64.zip')
await rm(zip, { force: true })
if (process.platform === 'win32')
  await execute(
    'powershell.exe',
    [
      '-NoProfile',
      '-Command',
      'Compress-Archive -LiteralPath $env:IVC_ZIP_SOURCE -DestinationPath $env:IVC_ZIP_TARGET -CompressionLevel Optimal',
    ],
    { env: { ...process.env, IVC_ZIP_SOURCE: stage, IVC_ZIP_TARGET: zip } },
  )
else await execute('zip', ['-qr', zip, 'IVC-Desktop-Windows-x64'], { cwd: out })
await writeFile(
  zip + '.sha256',
  hash(await readFile(zip)) + '  IVC-Desktop-Windows-x64.zip\n',
)
console.log(`Windows personal app ready: ${zip}`)
