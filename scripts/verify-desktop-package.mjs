import { createHash } from 'node:crypto'
import { readdir, readFile, stat } from 'node:fs/promises'
import { resolve, join } from 'node:path'
const directory = resolve('release/IVC-Desktop-Windows-x64')
const manifest = JSON.parse(
  await readFile(join(directory, 'manifest.json'), 'utf8'),
)
if (manifest.platform !== 'win-x64') throw Error('Unexpected package platform')
const found = new Set()
async function inspect(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const file = join(path, entry.name),
      relative = file.slice(directory.length + 1).replaceAll('\\', '/')
    if (entry.isSymbolicLink()) throw Error('Unexpected package link')
    if (entry.isDirectory()) {
      await inspect(file)
      continue
    }
    if (
      /\.env(?:\.|$)|\.sqlite|ivc-data|Browser\/|node_modules\/|\/setup\.mjs$|\.pdb$/i.test(
        relative,
      )
    )
      throw Error('Unexpected private/development file: ' + relative)
    if (relative === 'manifest.json') continue
    const expected = manifest.files[relative]
    const bytes = await readFile(file)
    if (createHash('sha256').update(bytes).digest('hex') !== expected)
      throw Error('Package file mismatch: ' + relative)
    found.add(relative)
    if (
      ['IVC.exe', 'runtime/node.exe', 'WebView2Loader.dll'].includes(relative)
    ) {
      const pe = bytes.readUInt32LE(0x3c)
      if (
        bytes.toString('ascii', 0, 2) !== 'MZ' ||
        bytes.readUInt32LE(pe) !== 0x4550 ||
        bytes.readUInt16LE(pe + 4) !== 0x8664
      )
        throw Error('Expected x64 Windows executable: ' + relative)
    }
  }
}
await inspect(directory)
if (found.size !== Object.keys(manifest.files).length)
  throw Error('Package contains missing files')
for (const path of [
  'IVC.exe',
  'IVC.exe.config',
  'WebView2Loader.dll',
  'Microsoft.Web.WebView2.Core.dll',
  'Microsoft.Web.WebView2.WinForms.dll',
  'runtime/node.exe',
  'runtime/NODE-LICENSE.txt',
  'WEBVIEW2-LICENSE.txt',
  'THIRD-PARTY-NOTICES.txt',
  'app/dist/index.html',
  'app/dist/solver.wasm',
  'app/desktop/backend.mjs',
])
  if (!found.has(path)) throw Error('Required file missing: ' + path)
const zip = directory + '.zip'
const checksum = (await readFile(zip + '.sha256', 'utf8')).split(/\s+/)[0]
if (
  createHash('sha256')
    .update(await readFile(zip))
    .digest('hex') !== checksum
)
  throw Error('Package ZIP checksum mismatch')
console.log(
  `Verified ${found.size} files · Windows x64 · ${Math.ceil((await stat(zip)).size / 1024 / 1024)} MB · private data excluded`,
)
