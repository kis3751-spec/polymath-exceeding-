import { describe, it, expect } from 'vitest'
import { compileNonlinear } from '../src/engine/nonlinear-parser'
const cases: [string, number, number][] = [
  ['sin(x)', 0.7, Math.cos(0.7)],
  ['cos(x)', 0.7, -Math.sin(0.7)],
  ['tan(x)', 0.3, 1 / Math.cos(0.3) ** 2],
  ['asin(x)', 0.2, 1 / Math.sqrt(0.96)],
  ['acos(x)', 0.2, -1 / Math.sqrt(0.96)],
  ['atan(x)', 2, 0.2],
  ['sinh(x)', 0.4, Math.cosh(0.4)],
  ['cosh(x)', 0.4, Math.sinh(0.4)],
  ['tanh(x)', 0.4, 1 / Math.cosh(0.4) ** 2],
  ['exp(x)', 2, Math.exp(2)],
  ['ln(x)', 1e-100, 1e100],
  ['log(x)', 0.01, 100 / Math.LN10],
  ['log10(x)', 0.01, 100 / Math.LN10],
  ['sqrt(x)', 0.04, 2.5],
  ['abs(x)', -2, -1],
  ['pow(x,3)', -2, 12],
  ['x^x', 2, 4 * (Math.log(2) + 1)],
  ['1/(x-1)', 2, -1],
  ['min(x,2)', 1, 1],
  ['max(x,2)', 1, 0],
]
describe('AST differentiation against independent analytic derivatives', () => {
  for (const [source, x, expected] of cases)
    it(source, () => {
      const model = compileNonlinear(
        `f(x)=${source}\nx(min)=-100\nx(max)=100`,
        [],
      )
      const actual = model.jacobian!([x], {})![0][0]
      expect(
        Math.abs((actual - expected) / Math.max(1, Math.abs(expected))),
      ).toBeLessThan(3e-15)
    })
  it.each(['abs(x)', 'sqrt(x)', 'min(x,-x)'])(
    'does not invent a derivative at a non-smooth or domain boundary: %s',
    (source) => {
      const model = compileNonlinear(`f(x)=${source}\nx(min)=-1\nx(max)=1`, [])
      expect(model.jacobian!([0], {})).toBeUndefined()
    },
  )
  it('propagates helper dependencies and full coupled gradients', () => {
    const model = compileNonlinear(
      'f(x)=a+y\nf(y)=x*y\na=sin(b)\nb=k*x\nx(0)=1\ny(0)=2',
      ['k'],
    )
    const J = model.jacobian!([1, 2], { k: 3 })!
    expect(J[0][0]).toBeCloseTo(3 * Math.cos(3), 14)
    expect(J[0][1]).toBe(1)
    expect(J[1]).toEqual([2, 1])
  })
})
