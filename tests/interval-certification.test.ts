import { describe, it, expect, beforeAll } from 'vitest'
import { parseNonlinearExpression } from '../src/engine/nonlinear-parser'
import {
  nextUp,
  nextDown,
  evaluateIntervalJet,
  type Interval,
} from '../src/engine/interval-arithmetic'
import {
  certifyScalarRoots,
  certificateSummary,
} from '../src/engine/interval-certification'
import { createAutomaticSolver } from '../src/engine/automatic'

const node = (source: string) => parseNonlinearExpression(source).node
const evaluate = (source: string, lo: number, hi = lo) =>
  evaluateIntervalJet(node(source), 'x', { lo, hi }, {})
const certify = (source: string, min = -4, max = 4, options = {}) =>
  certifyScalarRoots(
    node(source),
    'x',
    {},
    new Map(),
    { min, max },
    { maxMs: 3000, ...options },
  )
function encloses(interval: Interval, expected: number) {
  expect(interval.lo).toBeLessThanOrEqual(expected)
  expect(interval.hi).toBeGreaterThanOrEqual(expected)
}

describe('outward interval arithmetic', () => {
  it('steps by one binary64 value, including signed zero, subnormals and overflow', () => {
    expect(nextUp(0)).toBe(Number.MIN_VALUE)
    expect(nextDown(0)).toBe(-Number.MIN_VALUE)
    expect(nextUp(-Number.MIN_VALUE)).toBe(-0)
    expect(nextDown(Infinity)).toBe(Number.MAX_VALUE)
    expect(nextUp(Number.MAX_VALUE)).toBe(Infinity)
    expect(nextDown(nextUp(1))).toBe(1)
  })
  it.each([
    ['x+0.2', 0.1, 0.30000000000000004],
    ['x-x', 1e300, 0],
    ['x*x', 1e-200, 0],
    ['x*x', 1e200, Infinity],
    ['1/x', 3, 1 / 3],
    ['x^3', -2, -8],
    ['x^4', -2, 16],
    ['pow(x,-2)', 2, 0.25],
  ] as const)('encloses basic operations %s', (source, x, expected) => {
    encloses(evaluate(source, x).val, expected)
  })
  it('does not assume cosh is monotone across zero (sinh derivative regression)', () => {
    encloses(evaluate('sinh(x)', -2, 3).der, 1)
    encloses(evaluate('tanh(x)', -2, 3).der, 1)
    encloses(evaluate('cosh(x)', -2, 3).val, 1)
  })
  it.each([
    ['sin(x)', [-10, -1, 0, 0.4, Math.PI / 2, Math.PI, 10, 1000000], Math.sin],
    ['cos(x)', [-10, -1, 0, 0.4, Math.PI / 2, Math.PI, 10, 1000000], Math.cos],
    ['exp(x)', [-512, -100, -1, 0, 0.2, 1, 100, 512], Math.exp],
    ['ln(x)', [Number.MIN_VALUE, 1e-300, 0.1, 0.99, 1, 2, 10, 1e300], Math.log],
    ['log(x)', [0.1, 1, 2, 10, 100], Math.log10],
    ['sqrt(x)', [0, Number.MIN_VALUE, 1e-300, 0.1, 1, 2, 1e300], Math.sqrt],
    ['sinh(x)', [-100, -2, 0, 0.3, 2, 100], Math.sinh],
    ['cosh(x)', [-100, -2, 0, 0.3, 2, 100], Math.cosh],
    ['tanh(x)', [-300, -2, 0, 0.3, 2, 300], Math.tanh],
  ] as const)(
    'encloses independent point evaluations for %s',
    (source, points, f) => {
      for (const x of points) encloses(evaluate(source, x).val, f(x))
    },
  )
  it('includes trig extrema and falls back to full range for unsupported argument sizes', () => {
    encloses(evaluate('sin(x)', 1, 2).val, 1)
    encloses(evaluate('cos(x)', -0.1, 0.1).val, 1)
    expect(evaluate('sin(x)', 1e20).val).toEqual({ lo: -1, hi: 1 })
  })
  it('preserves domain failures instead of simplifying them away', () => {
    expect(evaluate('0*(1/x)', 0).domain).toBe('none')
    expect(evaluate('ln(x)', -1, 1).domain).toBe('partial')
    expect(evaluate('sqrt(x)', -2, -1).domain).toBe('none')
    expect(evaluate('1/x', -1, 1).domain).toBe('partial')
  })
})

describe('scalar interval certificates', () => {
  it('separates two hidden roots inside a coarse sample cell', () => {
    const c = certify('(x-0.001)*(x-0.002)', 0, 1)
    expect(c.complete).toBe(true)
    expect(c.uniqueRootCount).toBe(2)
    expect(c.unresolved).toEqual([])
  })
  it('counts an exact shared endpoint root only once', () => {
    const c = certify('x*(x-1)*(x+1)', -2, 2)
    expect(c.complete).toBe(true)
    expect(c.uniqueRootCount).toBe(3)
    expect(
      c.rootIntervals.filter((i) => i.lo === 0 && i.hi === 0),
    ).toHaveLength(1)
  })
  it('does not multiply endpoint signs that can underflow to zero', () => {
    const c = certify('1e-300*(x+2)', 0, 1)
    expect(c.complete).toBe(true)
    expect(c.uniqueRootCount).toBe(0)
  })
  it('leaves high-order contacts undecided despite a near-100 length ratio', () => {
    const c = certify('(x-1)^6', 0, 2)
    expect(c.complete).toBe(false)
    expect(c.unresolved.length).toBeGreaterThan(0)
    expect(certificateSummary(c)).toContain('보류')
    expect(certificateSummary(c)).not.toContain('100.000%')
    expect(c).not.toHaveProperty('captureConfidence')
  })
  it('does not claim a root across a pole or nonsmooth jump', () => {
    for (const source of ['1/x', 'sign(x)-0.2']) {
      const c = certify(source, -1, 1)
      expect(c.complete).toBe(false)
      expect(c.uniqueRootCount).toBe(0)
    }
  })
  it('accounts for all pending cells when a work budget expires', () => {
    const c = certify('sin(1000*x)', -100, 100, { maxIntervals: 1 })
    expect(c.complete).toBe(false)
    expect(c.budgetExhausted).toBe(true)
    expect(c.unresolved.reduce((sum, i) => sum + i.hi - i.lo, 0)).toBe(200)
    expect(c.coverageLowerBound).toBe(0)
  })
  it('does not falsely classify unsupported operations', () => {
    const c = certify('asin(x)', -0.5, 0.5)
    expect(c.complete).toBe(false)
    expect(c.unresolved).toEqual([{ lo: -0.5, hi: 0.5, reason: 'unsupported' }])
  })
  it('classifies valid and invalid portions of an open logarithm domain separately', () => {
    const c = certify('ln(x)', -2, 2)
    expect(c.complete).toBe(false)
    expect(c.excludedDomainCount).toBeGreaterThan(0)
    expect(c.uniqueRootCount).toBe(1)
    expect(c.unresolved.some((i) => i.reason === 'domain')).toBe(true)
  })
  it('certifies the three simple transcendental crossings in the supplied example', () => {
    const c = certify('cos((3/pi)*x)-sinh(x)/3-0.95', -100, 100)
    expect(c.complete).toBe(true)
    expect(c.uniqueRootCount).toBe(3)
  })
})

describe('solver integration', () => {
  let search: Awaited<ReturnType<typeof createAutomaticSolver>>
  beforeAll(async () => {
    search = await createAutomaticSolver(new ArrayBuffer(0))
  })
  it('is optional and reconciles a complete certificate with returned roots', () => {
    expect(search('x^2=2', {}).search.certification).toBeUndefined()
    const r = search('x^2=2', {}, { certifyRoots: true })
    expect(r.solutions).toHaveLength(2)
    expect(r.search.certification?.complete).toBe(true)
    expect(r.search.certification?.allRootsRepresented).toBe(true)
  })
  it('recovers both narrowly separated transcendental roots with analytic reference values', () => {
    const r = search(
      'cosh(1000000*(x-0.1234567))=2',
      {},
      { certifyRoots: true, searchBounds: { min: -1, max: 1 } },
    )
    const expected = [
      0.1234567 - Math.acosh(2) / 1e6,
      0.1234567 + Math.acosh(2) / 1e6,
    ]
    expect(r.solutions).toHaveLength(2)
    for (let i = 0; i < 2; i++)
      expect(Math.abs(r.solutions[i].values[0] - expected[i])).toBeLessThan(
        1e-16,
      )
    expect(r.search.certification?.complete).toBe(true)
    expect(r.search.certification?.allRootsRepresented).toBe(true)
  })
  it('discloses the zero-equivalent sixth-power reduction without claiming multiplicity certification', () => {
    const r = search('(x-2)^6=0', {}, { certifyRoots: true })
    expect(r.solutions.map((s) => s.values)).toEqual([[2]])
    expect(r.search.certification?.complete).toBe(true)
    expect(r.search.certification?.reduction).toContain(
      '중복도 자체의 인증은 아닙니다',
    )
  })
  it('keeps rational poles unresolved and all three van der Waals roots visible', () => {
    const r = search(
      '(P+3.59/V^2)*(V-0.0427)=0.08314*T',
      { P: 53, T: 280 },
      { certifyRoots: true, searchBounds: { min: -1, max: 1 } },
    )
    expect(r.solutions).toHaveLength(3)
    expect(r.search.certification?.complete).toBe(false)
    expect(r.search.certification?.uniqueRootCount).toBe(3)
  })
  it('does not apply a scalar certificate to a multivariable system', () => {
    const r = search('x^2+y^2=5;x+y=0', {}, { certifyRoots: true })
    expect(r.solutions).toHaveLength(2)
    expect(r.search.certification).toBeUndefined()
    expect(r.search.certificationUnavailable).toContain('단일')
  })
})
