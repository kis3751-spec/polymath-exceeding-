import { readFile } from 'node:fs/promises'
import { beforeAll, expect, it } from 'vitest'
import * as arithmetic from '../src/engine/interval-arithmetic'
import * as certificate from '../src/engine/interval-certification'
import * as parser from '../src/engine/nonlinear-parser'
import reference from './fixtures/validated-reference.json'
import { createAutomaticSolver } from '../src/engine/automatic'

const node = (text: string) => parser.parseNonlinearExpression(text).node
const certify = (text: string, min: number, max: number, extra = {}) =>
  certificate.certifyScalarRoots(
    node(text),
    'x',
    {},
    new Map(),
    { min, max },
    { maxMs: 1000, ...extra },
  )

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
it('converts 300 signed exact dyadics, including subnormal and overflow cases', () => {
  for (let i = 0; i < 300; i++) {
    const m = (BigInt(random()) << 80n) + BigInt(random()) + 1n
    const sign = i % 2 ? -1n : 1n,
      e = Number(random() % 2600) - 1500
    const q =
      e >= 0
        ? { n: (sign * m) << BigInt(e), d: 1n }
        : { n: sign * m, d: 1n << BigInt(-e) }
    expect(
      enclosed(arithmetic.dyadicToInterval({ m: sign * m, e }), q),
      `dyadic ${m} * 2^${e}`,
    ).toBe(true)
  }
})
it('retains exact dyadic additions beyond the former 4096-bit cutoff', () => {
  const sum = arithmetic.addExactDyadic({ m: 1n, e: 5000 }, { m: 1n, e: -1000 })
  expect(sum.m * (1n << BigInt(sum.e + 1000))).toBe((1n << 6000n) + 1n)
})

for (const p of reference.points) {
  it(`100-digit value and derivative enclosure: ${p.name}(${p.x})`, () => {
    const jet = arithmetic.evaluateIntervalJet(
      node(`${p.name}(x)`),
      'x',
      { lo: p.x, hi: p.x },
      {},
    )
    expect(jet.domain).toBe('all')
    expect(jet.val.lo).toBeLessThanOrEqual(Number(p.value[0]))
    expect(jet.val.hi).toBeGreaterThanOrEqual(Number(p.value[1]))
    expect(jet.der.lo).toBeLessThanOrEqual(Number(p.derivative[0]))
    expect(jet.der.hi).toBeGreaterThanOrEqual(Number(p.derivative[1]))
  })
}
it('symbolic log derivative matches the base-10 point and interval engines', () => {
  const d = arithmetic.differentiateNode(node('log(x)'), 'x', new Map())!
  const jet = arithmetic.evaluateIntervalJet(d, 'x', { lo: 2, hi: 2 }, {})
  const p = reference.points.find((p) => p.name === 'log' && p.x === 2)!
  expect(jet.val.lo).toBeLessThanOrEqual(Number(p.derivative[0]))
  expect(jet.val.hi).toBeGreaterThanOrEqual(Number(p.derivative[1]))
})

for (const row of reference.gaussian) {
  it(`Gaussian claimed bounds enclose a 100-digit exact probability at radius ${row.radius}`, () => {
    const c = certify('x', -row.radius, row.radius, { inputNoiseSigma: 1 })
    expect(c.complete).toBe(true)
    const gp = c.completeness?.gaussianPerturbation
    expect(gp).toBeDefined()
    const bounds = gp!.domainRootCountInvarianceBounds!
    expect(bounds.lo).toBeLessThanOrEqual(Number(row.probability[0]))
    expect(bounds.hi).toBeGreaterThanOrEqual(Number(row.probability[1]))
  })
}
it('includes original critical points after square-free reduction', () => {
  const c = certify('x^4', -1, 1, { inputNoiseSigma: 1 })
  expect(c.complete).toBe(true)
  const gp = c.completeness?.gaussianPerturbation
  // Every nonzero offset changes the root count (0 or 2 versus 1).
  expect(gp?.twoSidedSafetyMarginBounds?.hi).toBe(0)
  expect(gp?.twoSidedSafetyProbabilityBounds?.hi).toBe(0)
})
it('does not announce all displayed roots are represented before the solver checks them', () => {
  const c = certify('x', -1, 1)
  expect(c.allRootsRepresented).toBeUndefined()
  expect(c.completeness?.allRootsFoundProbability).toBeUndefined()
})

for (const power of [4, 6]) {
  it(`never certifies a root of (x-1)^${power} + 1e-20`, () => {
    const c = certify(`(x-1)^${power}+1e-20`, 0.9, 1.1)
    expect(c.uniqueRootCount).toBe(0)
  })
  it(`never certifies a single root of (x-1)^${power} - 1e-20`, () => {
    const c = certify(`(x-1)^${power}-1e-20`, 0.9, 1.1)
    if (c.complete) expect(c.uniqueRootCount).toBe(2)
    for (const iv of c.rootIntervals)
      expect(iv.lo !== 1 || iv.hi !== 1).toBe(true)
  })
}
for (const [text, min, max, count] of [
  ['x^2-2', -2, 2, 2],
  ['x^3', -1, 1, 1],
  ['x^4', -1, 1, 1],
  ['x*(x-1)*(x+2)', -3, 3, 3],
  ['sin(1000*x)', -0.01, 0.01, 7],
  ['1/x', -1, 1, 0],
  ['x*ln(x)', 0, 2, 1],
  ['sqrt(x)', -1, 1, 1],
] as const) {
  it(`never announces a wrong complete count for ${text}`, () => {
    const c = certify(text, min, max)
    if (c.complete) expect(c.uniqueRootCount).toBe(count)
    else expect(c.unresolved.length).toBeGreaterThan(0)
  })
}

let solve: Awaited<ReturnType<typeof createAutomaticSolver>>
beforeAll(async () => {
  solve = await createAutomaticSolver(
    await readFile(new URL('../public/solver.wasm', import.meta.url)),
  )
})
it('original-expression certification is not replaced by a rounded coefficient polynomial', () => {
  const found = solve(
    '(x-1)^4+1e-20=0',
    {},
    { certifyRoots: true, searchBounds: { min: 0.9, max: 1.1 } },
  )
  const c = found.search.certification
  expect(
    Boolean(c?.complete && c.allRootsRepresented && c.uniqueRootCount > 0),
  ).toBe(false)
})
it('retains the manual compiler interface introduced by the current simulation engine', () => {
  expect(
    typeof (parser as unknown as Record<string, unknown>).manualEquationSource,
  ).toBe('function')
})

it('uses the actual base-10 critical point for finite-domain Gaussian root-count stability', () => {
  const c = certify('log(x)-x', 0.1, 2, { inputNoiseSigma: 1 })
  expect(c.complete).toBe(true)
  expect(c.uniqueRootCount).toBe(0)
  const gp = c.completeness?.gaussianPerturbation
  expect(gp?.domainRootCountInvarianceBounds?.lo).toBeLessThanOrEqual(
    Number(reference.logModel.probability[0]),
  )
  expect(gp?.domainRootCountInvarianceBounds?.hi).toBeGreaterThanOrEqual(
    Number(reference.logModel.probability[1]),
  )
})

it('preserves the no-root result under an exact coordinate translation', () => {
  const centered = certify('x^4+1e-20', -0.1, 0.1)
  const translated = certify('(x-1)^4+1e-20', 0.9, 1.1)
  expect(centered.complete).toBe(true)
  expect(translated.complete).toBe(true)
  expect(translated.uniqueRootCount).toBe(centered.uniqueRootCount)
  expect(translated.uniqueRootCount).toBe(0)
})

it('allows root-count recovery at larger offsets despite a double-root event', () => {
  const c = certify('(x^2-1)^2', -2, 2, { inputNoiseSigma: 1 })
  expect(c.complete).toBe(true)
  expect(c.uniqueRootCount).toBe(2)
  const gp = c.completeness?.gaussianPerturbation
  const bounds = gp?.domainRootCountInvarianceBounds
  expect(bounds).toBeDefined()
  expect(bounds!.lo).toBeLessThanOrEqual(0.15865525393145707)
  expect(bounds!.hi).toBeGreaterThanOrEqual(0.15865525393145702)
  expect(bounds!.lo).toBeGreaterThan(0.15)
  expect(gp?.twoSidedSafetyMarginBounds?.lo).toBe(0)
})
it('keeps two distinct roots when their broad proof boxes touch at a non-root', () => {
  const c = certify('x^2-1', -2, 2)
  expect(c.complete).toBe(true)
  expect(c.uniqueRootCount).toBe(2)
})
it('treats an odd flat crossing as one branch, not automatic loss under any offset', () => {
  const c = certify('x^3', -1, 1, { inputNoiseSigma: 1 })
  const b =
    c.completeness?.gaussianPerturbation?.domainRootCountInvarianceBounds
  expect(c.complete).toBe(true)
  expect(b).toBeDefined()
  expect(b!.lo).toBeLessThanOrEqual(0.6826894921370859)
  expect(b!.hi).toBeGreaterThanOrEqual(0.6826894921370859)
})
it('scales the equation and its assumed Gaussian noise together', () => {
  const a = certify('x', -1, 1, { inputNoiseSigma: 1 }).completeness
    ?.gaussianPerturbation
  const b = certify('1000*x', -1, 1, { inputNoiseSigma: 1000 }).completeness
    ?.gaussianPerturbation
  expect(a?.domainRootCountInvariance).toBeCloseTo(
    b!.domainRootCountInvariance!,
    12,
  )
})

it('records an open root-free remainder next to an exact endpoint root', () => {
  const c = certify('x', 0, 1)
  expect(c.complete).toBe(true)
  expect(c.rootIntervals).toEqual([{ lo: 0, hi: 0 }])
  expect(c.rootFreeIntervals).toEqual([{ lo: 0, hi: 1, openLo: true }])
})

it('counts entire offset slabs when a Float64 midpoint would overflow', () => {
  const c = certify('x-1e308', -5e307, -1e307, { inputNoiseSigma: 1e308 })
  expect(c.complete).toBe(true)
  const b =
    c.completeness?.gaussianPerturbation?.domainRootCountInvarianceBounds
  expect(b).toBeDefined()
  expect(b!.lo).toBeGreaterThan(0.9)
  expect(b!.hi).toBeLessThan(0.95)
})

it('exports probability bounds with outward percentages and no unvalidated global probability', () => {
  const c = certify('x', -1, 1, { inputNoiseSigma: 1 })
  const gp = c.completeness!.gaussianPerturbation!
  gp.domainRootCountInvariance = 1
  gp.domainRootCountInvarianceBounds = { lo: 1 - Number.EPSILON, hi: 1 }
  gp.realLineRootCountInvariance = 1
  const text = certificate.certificateReport(c)
  expect(text).toContain('유지 확률 포함 구간: 99.9999–100.0000%')
  expect(text).not.toContain('실수 전체(ℝ)')
  expect(text).not.toContain('유지 확률: 100.00%')
})
it('exports unavailable probability as uncalculated rather than silently zero', () => {
  const c = certify('x', -1, 1, { inputNoiseSigma: 1 })
  delete c.completeness!.gaussianPerturbation!.domainRootCountInvarianceBounds
  const text = certificate.certificateReport(c)
  expect(text).toContain('유지 확률 포함 구간: 미산정')
  expect(text).not.toContain('유지 확률: 0.00%')
  delete c.completeness!.gaussianPerturbation
  c.completeness!.perturbationUnavailableReason = '임계점 분리 보류'
  expect(certificate.certificateReport(c)).toContain(
    '확률 미산정: 임계점 분리 보류',
  )
})
it('keeps exact zero and one distinct from nontrivial probability intervals in exports', () => {
  expect(certificate.probabilityIntervalText({ lo: 0, hi: 0 })).toBe('0%')
  expect(certificate.probabilityIntervalText({ lo: 1, hi: 1 })).toBe('100%')
  expect(certificate.probabilityIntervalText({ lo: NaN, hi: 1 })).toBe('미산정')
  expect(certificate.probabilityIntervalText({ lo: 0.9, hi: 0.8 })).toBe(
    '미산정',
  )
  for (const p of [1e-12, 0.01, 0.5, 0.8317946345531824, 1 - Number.EPSILON]) {
    const parts = certificate
      .probabilityIntervalText({ lo: p, hi: p })
      .replace('%', '')
      .split('–')
      .map(Number)
    expect(parts[0]).toBeLessThanOrEqual(p * 100)
    expect(parts[1]).toBeGreaterThanOrEqual(p * 100)
  }
})
