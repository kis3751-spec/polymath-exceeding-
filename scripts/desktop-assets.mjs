import { inflateRawSync } from 'node:zlib'

/** Extract only an explicitly named member from the upstream, checksum-verified
 * ZIP. No archive path is ever written to disk and ZIP64 is not accepted. */
export function zipMember(bytes, name, maxSize = 128 * 1024 * 1024) {
  let end = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
    if (bytes.readUInt32LE(i) === 0x06054b50) {
      end = i
      break
    }
  if (end < 0) throw Error('ZIP directory missing')
  const count = bytes.readUInt16LE(end + 10)
  let at = bytes.readUInt32LE(end + 16)
  for (let i = 0; i < count; i++) {
    if (bytes.readUInt32LE(at) !== 0x02014b50) throw Error('Invalid ZIP entry')
    const method = bytes.readUInt16LE(at + 10),
      size = bytes.readUInt32LE(at + 24),
      compressed = bytes.readUInt32LE(at + 20)
    const length = bytes.readUInt16LE(at + 28),
      extra = bytes.readUInt16LE(at + 30),
      comment = bytes.readUInt16LE(at + 32)
    const file = bytes.subarray(at + 46, at + 46 + length).toString('utf8')
    if (file === name) {
      if (size > maxSize || ![0, 8].includes(method))
        throw Error('Unsupported ZIP member')
      const local = bytes.readUInt32LE(at + 42)
      if (bytes.readUInt32LE(local) !== 0x04034b50)
        throw Error('Invalid ZIP local header')
      const start =
        local +
        30 +
        bytes.readUInt16LE(local + 26) +
        bytes.readUInt16LE(local + 28)
      if (start + compressed > bytes.length) throw Error('Truncated ZIP member')
      const data = bytes.subarray(start, start + compressed)
      const output =
        method === 8 ? inflateRawSync(data, { maxOutputLength: maxSize }) : data
      if (output.length !== size) throw Error('Invalid ZIP member size')
      return output
    }
    at += 46 + length + extra + comment
  }
  throw Error(`ZIP member missing: ${name}`)
}

/** Original bitmap icon generated from a small I/V/C glyph grid. */
export function desktopIcon() {
  const glyphs = [
    '11111/00100/00100/00100/00100/00100/11111',
    '10001/10001/10001/10001/10001/01010/00100',
    '01111/10000/10000/10000/10000/10000/01111',
  ].map((g) => g.split('/'))
  const sizes = [32, 48, 64],
    header = Buffer.alloc(6 + sizes.length * 16),
    images = []
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(sizes.length, 4)
  let offset = header.length
  sizes.forEach((size, index) => {
    const stride = Math.ceil(size / 32) * 4,
      bitmap = Buffer.alloc(40 + size * size * 4 + stride * size)
    bitmap.writeUInt32LE(40)
    bitmap.writeInt32LE(size, 4)
    bitmap.writeInt32LE(size * 2, 8)
    bitmap.writeUInt16LE(1, 12)
    bitmap.writeUInt16LE(32, 14)
    bitmap.writeUInt32LE(size * size * 4, 20)
    const scale = Math.floor(size / 22),
      left = Math.floor((size - 17 * scale) / 2),
      top = Math.floor((size - 7 * scale) / 2)
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const gx = Math.floor((x - left) / scale),
          gy = Math.floor((y - top) / scale)
        const letter = Math.floor(gx / 6),
          column = gx % 6
        const ink =
          gx >= 0 &&
          gy >= 0 &&
          gy < 7 &&
          letter < 3 &&
          column < 5 &&
          glyphs[letter][gy][column] === '1'
        const i = 40 + ((size - y - 1) * size + x) * 4
        bitmap.set(ink ? [245, 248, 245, 255] : [70, 79, 44, 255], i)
      }
    const at = 6 + index * 16
    header[at] = size
    header[at + 1] = size
    header.writeUInt16LE(1, at + 4)
    header.writeUInt16LE(32, at + 6)
    header.writeUInt32LE(bitmap.length, at + 8)
    header.writeUInt32LE(offset, at + 12)
    offset += bitmap.length
    images.push(bitmap)
  })
  return Buffer.concat([header, ...images])
}
