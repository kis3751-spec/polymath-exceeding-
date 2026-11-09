import { expect, it } from 'vitest'
import * as arithmetic from '../src/engine/interval-arithmetic'

// This oracle uses independent integer fractions, not the candidate's exact
// dyadic conversion, arithmetic or interval operations.
type Q = { n: bigint; d: bigint }
function exact(x: number): Q {
  if (!Number.isFinite(x)) throw new Error('finite oracle input required')
  const b = new DataView(new ArrayBuffer(8))
  b.setFloat64(0, x)
  const bits = b.getBigUint64(0),
    exp = Number((bits >> 52n) & 2047n)
  const mant = (bits & ((1n << 52n) - 1n)) + (exp ? 1n << 52n : 0n)
  const n = (bits >> 63n ? -1n : 1n) * mant,
    e = exp ? exp - 1075 : -1074
  return e >= 0 ? { n: n << BigInt(e), d: 1n } : { n, d: 1n << BigInt(-e) }
}
function compare(a: Q, b: Q) {
  const d = a.n * b.d - b.n * a.d
  return d < 0n ? -1 : d > 0n ? 1 : 0
}
function enclosed(iv: { lo: number; hi: number }, q: Q) {
  return (
    !Number.isNaN(iv.lo) &&
    !Number.isNaN(iv.hi) &&
    iv.lo <= iv.hi &&
    (iv.lo === -Infinity ||
      (Number.isFinite(iv.lo) && compare(exact(iv.lo), q) <= 0)) &&
    (iv.hi === Infinity ||
      (Number.isFinite(iv.hi) && compare(exact(iv.hi), q) >= 0))
  )
}
function fractionOp(a: Q, b: Q, op: string): Q {
  if (op === '+') return { n: a.n * b.d + b.n * a.d, d: a.d * b.d }
  if (op === '*') return { n: a.n * b.n, d: a.d * b.d }
  let n = a.n * b.d,
    d = a.d * b.n
  if (d < 0n) {
    n = -n
    d = -d
  }
  return { n, d }
}
let rng = 0x8d27ab43
function random() {
  rng ^= rng << 13
  rng ^= rng >>> 17
  rng ^= rng << 5
  return rng >>> 0
}
function randomFloat() {
  const bits = (BigInt(random()) << 32n) | BigInt(random())
  const view = new DataView(new ArrayBuffer(8))
  view.setBigUint64(0, bits)
  const x = view.getFloat64(0)
  return Number.isFinite(x) ? x : 1
}

it('encloses 1,500 seeded exact fraction operations across binary64 exponents', () => {
  const ops = [
    ['+', arithmetic.add],
    ['*', arithmetic.mul],
    ['/', arithmetic.div],
  ] as const
  for (let i = 0; i < 500; i++) {
    const a = randomFloat(),
      b = randomFloat() || Number.MIN_VALUE
    for (const [op, fn] of ops) {
      const iv = fn({ lo: a, hi: a }, { lo: b, hi: b })
      expect(
        enclosed(iv, fractionOp(exact(a), exact(b), op)),
        `${a} ${op} ${b}: ${JSON.stringify(iv)}`,
      ).toBe(true)
    }
  }
})

it('retains real subnormal products without crossing the known sign', () => {
  const m = Number.MIN_VALUE
  expect(arithmetic.mul({ lo: m, hi: m }, { lo: 0.5, hi: 0.5 })).toEqual({
    lo: 0,
    hi: m,
  })
  expect(arithmetic.mul({ lo: -m, hi: -m }, { lo: 0.5, hi: 0.5 })).toEqual({
    lo: -m,
    hi: 0,
  })
  expect(arithmetic.integerPower({ lo: 0, hi: 0 }, 4)).toEqual({ lo: 0, hi: 0 })
  expect(arithmetic.integerPower({ lo: 1, hi: 1 }, 6)).toEqual({ lo: 1, hi: 1 })
})
it('encloses exact corner values of 250 intervals across signed exponent ranges', () => {
  const ops = [
    ['+', arithmetic.add],
    ['*', arithmetic.mul],
    ['/', arithmetic.div],
  ] as const
  for (let i = 0; i < 250; i++) {
    const av = [randomFloat(), randomFloat()].sort((a, b) => a - b)
    const bv = [randomFloat(), randomFloat()].sort((a, b) => a - b)
    const a = { lo: av[0], hi: av[1] },
      b = { lo: bv[0], hi: bv[1] }
    for (const [op, fn] of ops) {
      if (op === '/' && b.lo <= 0 && b.hi >= 0) continue
      const iv = fn(a, b)
      for (const x of av)
        for (const y of bv)
          expect(
            enclosed(iv, fractionOp(exact(x), exact(y), op)),
            `${x} ${op} ${y}`,
          ).toBe(true)
    }
  }
})
