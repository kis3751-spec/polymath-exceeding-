import { beforeAll, describe, expect, it } from 'vitest'
import { createAutomaticSolver } from '../src/engine/automatic'
let solve: Awaited<ReturnType<typeof createAutomaticSolver>>
beforeAll(async () => {
  solve = await createAutomaticSolver(new ArrayBuffer(0))
})
const vdW = '(P + a/V^2)*(V-b) = R*T'
const constants = { a: 3.59, b: 0.0427, R: 0.08314, T: 280, P: 53 }
describe('calculation audit: rational equations', () => {
  it('finds all three dimensional van der Waals roots and verifies pressure', () => {
    const roots = solve(vdW, constants)
      .solutions.map((s) => s.values[0])
      .sort((a, b) => a - b)
    expect(roots).toHaveLength(3)
    expect(roots[0]).toBeCloseTo(0.085350410047135382, 8)
    for (const v of roots)
      expect(
        (constants.R * constants.T) / (v - constants.b) - constants.a / v ** 2,
      ).toBeCloseTo(constants.P, 9)
  })
  it('keeps a denominator zero excluded after rationalization', () => {
    expect(
      solve('(x^2-1)/(x-1)=0', {}).solutions.map((s) => s.values[0]),
    ).toEqual([-1])
    expect(solve('(x-1)/(x-1)=0', {}).solutions).toHaveLength(0)
  })
})

describe('calculation audit: scales, clustered roots and false roots', () => {
  it.each([1e-18, 1, 1e18])(
    'preserves dimensional rational roots under residual scaling %s',
    (scale) => {
      const source = `${scale}*((P+a/V^2)*(V-b)-R*T)=0`
      const roots = solve(source, constants)
        .solutions.map((s) => s.values[0])
        .sort((a, b) => a - b)
      expect(roots).toHaveLength(3)
      expect(roots[0]).toBeCloseTo(0.085350410047135382, 10)
      expect(roots[1]).toBeCloseTo(0.124592685359444031, 10)
      expect(roots[2]).toBeCloseTo(0.27198709327266587, 10)
    },
  )
  it.each(['(x-1)*(x-1.00000001)=0', '(x-1)*(x-1.00000001)/(x-2)=0'])(
    'retains representably distinct close roots: %s',
    (source) => {
      const roots = solve(source, {})
        .solutions.map((s) => s.values[0])
        .sort((a, b) => a - b)
      expect(roots).toHaveLength(2)
      expect(roots[0]).toBe(1)
      expect(roots[1]).toBe(1.00000001)
    },
  )
  it.each([
    '1/(x-0.01)=0',
    '1/(x-0.01)^2=0',
    'exp(x)=0',
    '(x-1)^2+1e-20=0',
    '(x-1)^2/(x-1)=0',
  ])(
    'does not mistake a pole, positive minimum or asymptote for a root: %s',
    (source) => {
      expect(solve(source, {}).solutions).toHaveLength(0)
    },
  )
  it('recognizes a rational identity without including its excluded point', () => {
    expect(() => solve('(x^2-1)/(x-1)=x+1', {})).toThrow(/0=0/)
  })
  it('accepts repeated rational roots, negative powers and open-domain tiny roots', () => {
    expect(
      solve('(x-0.002)^2/(x-0.003)=0', {}).solutions.map((s) => s.values[0]),
    ).toEqual([0.002])
    expect(solve('pow(x,-2)=4', {}).solutions.map((s) => s.values[0])).toEqual([
      0.5, -0.5,
    ])
    const ln = solve('ln(x)=-230.25850929940458', {}).solutions
    expect(ln).toHaveLength(1)
    expect(Math.log10(ln[0].values[0])).toBeCloseTo(-100, 10)
  })
})

describe('calculation audit: equation families and simultaneous systems', () => {
  it.each([1e-9, 1e-3, 1, 1e3, 1e9])(
    'recovers five factored rational roots at variable scale %s',
    (scale) => {
      const expected = [-3, -0.5, 0.2, 1.1, 3].map((v) => v * scale)
      const source = `${expected.map((v) => `(x-(${v}))`).join('*')}/(x-(${0.7 * scale}))=0`
      const found = solve(source, {})
        .solutions.map((s) => s.values[0])
        .sort((a, b) => a - b)
      expect(found).toHaveLength(expected.length)
      found.forEach((v, i) =>
        expect(Math.abs((v - expected[i]) / scale)).toBeLessThan(2e-12),
      )
    },
  )
  it.each([48, 53, 58])(
    'matches rational and cubic dimensional van der Waals forms at pressure %s',
    (P) => {
      for (const T of [270, 280, 300]) {
        const parameters = { ...constants, P, T }
        const rational = solve(vdW, parameters)
          .solutions.map((r) => r.values[0])
          .sort((a, b) => a - b)
        const polynomial = solve('P*V^3-(P*b+R*T)*V^2+a*V-a*b=0', parameters)
          .solutions.map((r) => r.values[0])
          .sort((a, b) => a - b)
        expect(rational).toHaveLength(polynomial.length)
        rational.forEach((v, i) => expect(v).toBeCloseTo(polynomial[i], 10))
        if (T === 300) expect(rational).toHaveLength(1)
      }
    },
  )
  it('retains all four coupled-system roots despite equation scaling', () => {
    const r = solve(
      '1e-12*(x^2+y-3)=0\n1e12*(x+y^2-3)=0',
      {},
      { searchBounds: { min: -4, max: 4 } },
    )
    expect(r.solutions).toHaveLength(4)
    for (const s of r.solutions) {
      const [x, y] = s.values
      expect(x * x + y).toBeCloseTo(3, 10)
      expect(x + y * y).toBeCloseTo(3, 10)
    }
  })
  it('keeps a singular repeated solution after fixed-condition elimination and rejects an inconsistent one', () => {
    expect(solve('x^2=0; y=1', {}).solutions[0].values).toEqual([0, 1])
    expect(solve('x^2+1e-20=0; y=1', {}).solutions).toHaveLength(0)
  })
})
