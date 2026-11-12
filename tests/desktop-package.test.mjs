import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deflateRawSync } from 'node:zlib'
import { desktopIcon, zipMember } from '../scripts/desktop-assets.mjs'
function archive(name, bytes, method = 8) {
  const content = method === 8 ? deflateRawSync(bytes) : bytes,
    n = Buffer.from(name)
  const local = Buffer.alloc(30),
    central = Buffer.alloc(46),
    end = Buffer.alloc(22)
  local.writeUInt32LE(0x04034b50)
  local.writeUInt16LE(method, 8)
  local.writeUInt32LE(content.length, 18)
  local.writeUInt32LE(bytes.length, 22)
  local.writeUInt16LE(n.length, 26)
  central.writeUInt32LE(0x02014b50)
  central.writeUInt16LE(method, 10)
  central.writeUInt32LE(content.length, 20)
  central.writeUInt32LE(bytes.length, 24)
  central.writeUInt16LE(n.length, 28)
  end.writeUInt32LE(0x06054b50)
  end.writeUInt16LE(1, 8)
  end.writeUInt16LE(1, 10)
  end.writeUInt32LE(central.length + n.length, 12)
  end.writeUInt32LE(local.length + n.length + content.length, 16)
  return Buffer.concat([local, n, content, central, n, end])
}
test('desktop runtime extraction reads only the named member, including compressed entries', () => {
  for (const method of [0, 8]) {
    const zip = archive(
      'runtime/node.exe',
      Buffer.from('verified-fixture'),
      method,
    )
    assert.equal(
      zipMember(zip, 'runtime/node.exe').toString(),
      'verified-fixture',
    )
    assert.throws(() => zipMember(zip, '../escape'), /missing/)
    assert.throws(() => zipMember(zip, 'runtime/node.exe', 4), /Unsupported/)
  }
})
test('truncated and invalid runtime archives cannot be packaged as executables', () => {
  assert.throws(() => zipMember(Buffer.alloc(30), 'runtime/node.exe'))
  const zip = archive('runtime/node.exe', Buffer.from('fixture'))
  zip.writeUInt32LE(0, 0)
  assert.throws(() => zipMember(zip, 'runtime/node.exe'), /header/)
})
test('the generated IVC icon contains three valid 32-bit images', () => {
  const bytes = desktopIcon()
  assert.equal(bytes.readUInt16LE(2), 1)
  assert.equal(bytes.readUInt16LE(4), 3)
  for (let i = 0; i < 3; i++) {
    const at = 6 + i * 16,
      size = bytes[at],
      offset = bytes.readUInt32LE(at + 12)
    assert.equal(bytes.readUInt16LE(at + 6), 32)
    assert.equal(bytes.readUInt32LE(offset), 40)
    assert.equal(bytes.readUInt32LE(offset + 4), size)
    assert.equal(bytes.readUInt32LE(offset + 8), size * 2)
    assert.ok(offset + bytes.readUInt32LE(at + 8) <= bytes.length)
  }
})
