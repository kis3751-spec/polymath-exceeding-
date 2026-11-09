import { describe, expect, it } from 'vitest'
import { solveIntegration } from '../src/engine/scientific/integration'

const solve = (source: string, method?: string) =>
  solveIntegration({
    module: 'integration',
    source,
    options: method ? { method } : undefined,
  })
const linear = '[\nx y\n0 1\n0.2 1.4\n1 3\n2.7 6.4\n5 11\n]'

describe('discrete interpolation integrals', () => {
  it.each(['lin', 'ccs', 'akm'])(
    'integrates an affine function exactly on nonuniform data with %s',
    (method) => {
      const result = solve(`${linear}\nintegrate y(x) 0.1 4.2 11 ${method}`)
      expect(result.values.integral).toBeCloseTo(
        4.2 ** 2 + 4.2 - (0.1 ** 2 + 0.1),
        11,
      )
      expect(result.rows[0][2]).toBe(0)
      expect(result.rows.at(-1)![2]).toBeCloseTo(result.values.integral, 12)
    },
  )
  it('uses the natural spline boundary conditions rather than claiming quadratic exactness', () => {
    const result = solve('[\nx y\n0 0\n1 1\n2 4\n]\nintegrate y(x) 0 2 20 ccs')
    expect(result.values.integral).toBeCloseTo(2.75, 12)
    expect(result.method).toContain('자연')
  })
  it('reproduces a quadratic and its known area with Akima on a uniform grid', () => {
    const result = solve(
      '[\nx y\n0 0\n1 1\n2 4\n3 9\n4 16\n]\nintegrate y(x) 0 4 200 akm',
    )
    expect(result.values.integral).toBeCloseTo(64 / 3, 11)
    result.rows.forEach((row) => expect(row[1]).toBeCloseTo(row[0] ** 2, 11))
  })
  it.each([
    ['ccs', 6.950532494116674],
    ['akm', 6.593089747067456],
  ] as const)(
    'matches independent SciPy %s integration on nonuniform oscillating data',
    (method, expected) => {
      const result = solve(
        `[\nx y\n0 0\n0.2 2\n0.9 -1\n1.7 4\n3.1 1\n5 3\n]\nintegrate y(x) 0.15 4.25 41 ${method}`,
      )
      expect(result.values.integral).toBeCloseTo(expected, 11)
    },
  )
  it('does not change the exact interpolant area when only rendering density changes', () => {
    const a = solve(`${linear}\nintegrate y(x) 0 5 7 ccs`)
    const b = solve(`${linear}\nintegrate y(x) 0 5 200 ccs`)
    expect(a.values.integral).toBe(b.values.integral)
    expect(a.rows).toHaveLength(8)
    expect(b.rows).toHaveLength(201)
  })
  it('preserves the orientation of reversed limits', () => {
    const result = solve(`${linear}\nintegrate y(x) 5 0 10 lin`)
    expect(result.values.integral).toBeCloseTo(-30, 12)
    expect(result.rows.at(-1)![2]).toBeCloseTo(-30, 12)
  })
  it('sorts unordered samples explicitly and preserves the integral', () => {
    const result = solve('[\nx y\n2 5\n0 1\n1 3\n]\nintegrate y(x) 0 2')
    expect(result.values.integral).toBeCloseTo(6, 12)
    expect(result.warnings.join()).toContain('정렬')
  })
  it('evaluates out-of-order helpers and externally adjusted constants', () => {
    const result = solveIntegration({
      module: 'integration',
      source: `${linear}\nq = k*y\nk = 2\nintegrate q(x) 0 5`,
      parameters: { k: 3 },
    })
    expect(result.values.integral).toBeCloseTo(90, 12)
  })
  it('expands numbered formula definitions without evaluating arbitrary source', () => {
    const result = solve(`${linear}\nf1 = 2*y\nintegrate f1(x) 0 5`)
    expect(result.values.integral).toBeCloseTo(60, 12)
  })
  it('avoids global-antiderivative cancellation on narrow intervals at large coordinates', () => {
    const result = solve(
      '[\nx y\n1000000000000000 3\n1000000000000001 3\n1000000000000002 3\n]\nintegrate y(x) 1000000000000001 1000000000000002 4 lin',
    )
    expect(result.values.integral).toBe(3)
  })
  it('keeps the actual endpoint when subtracting a huge negative coordinate loses one unit', () => {
    const result = solve(
      '[\nx y\n-10000000000000000 3\n1 3\n]\nintegrate y(x) 0 1 4 lin',
    )
    expect(result.values.integral).toBe(3)
  })
  it.each([
    '[\nx y\n0 1\n0 2\n]\nintegrate y(x) 0 0',
    `${linear}\nintegrate y(x) -0.1 5`,
    `${linear}\nintegrate y(x) 0 5 2.5 lin`,
    `${linear}\nintegrate y(x) 0 5 20 unknown`,
    '[\nx y\n0 1\n1 2\n]\nintegrate y(x) 0 1 10 akm',
    `${linear}\na=b+1\nb=a+1\nintegrate a(x) 0 5`,
  ])('rejects invalid or unsupported integration input: %s', (source) =>
    expect(() => solve(source)).toThrow(),
  )
})
