import { beforeAll, describe, it, expect } from 'vitest'
import { createSolver, ModelError } from '../src/engine'
import { createAutomaticSolver } from '../src/engine/automatic'
import { createNonlinearSolver } from '../src/engine/nonlinear'
import { normalizeEquationPaste } from '../src/editor-input'
import { countEquations } from '../src/equation-count'
let linear: Awaited<ReturnType<typeof createSolver>>,
  auto: Awaited<ReturnType<typeof createAutomaticSolver>>,
  manual: Awaited<ReturnType<typeof createNonlinearSolver>>
beforeAll(async () => {
  linear = await createSolver(new ArrayBuffer(0))
  auto = await createAutomaticSolver(new ArrayBuffer(0))
  manual = await createNonlinearSolver(new ArrayBuffer(0))
})
describe('logical equations retain mathematical meaning', () => {
  it.each([
    '2x+y=x-y+8=10',
    '2x+y=10, x-y=2',
    '2x+y=10; x-y=2',
    '2x+y=10; x-y=2;',
  ])('solves %s identically in both solvers', (source) => {
    expect(linear(source, {}).values).toEqual([4, 2])
    expect(auto(source, {}).solutions[0].values).toEqual([4, 2])
    expect(countEquations(source, true)).toBe(2)
  })
  it('retains general equality variables while eliminating exact fixed equations', () => {
    const solved = auto('k=4, x^2=k', {})
    expect(solved.solutions.map((r) => r.variables)).toEqual([
      ['k', 'x'],
      ['k', 'x'],
    ])
    expect(solved.solutions.map((r) => r.values)).toEqual([
      [4, 2],
      [4, -2],
    ])
    expect(linear('x=y=3', {}).values).toEqual([3, 3])
    expect(auto('x = y + 1; y = 2', {}).solutions[0].values).toEqual([3, 2])
  })
  it('does not split function argument commas or rewrite legitimate products', () => {
    expect(auto('max(x,2)=3', {}).solutions[0].values[0]).toBeCloseTo(3, 10)
    expect(linear('x=2 (K); K=4', {}).values).toEqual([8, 4])
    expect(linear('x=2(K)', { K: 4 }).values).toEqual([8])
  })
  it('supports function definitions with a chained zero and previously defined expression chains', () => {
    expect(linear('f1(x)=2x+4=0', {}).values).toEqual([-2])
    expect(auto('f1(x)=x^2-4=0', {}).solutions.map((r) => r.values[0])).toEqual(
      [2, -2],
    )
    const source = 'f1=2x+y-10;f2=x-y-2;f1=f2=0'
    expect(linear(source, {}).values).toEqual([4, 2])
    expect(auto(source, {}).solutions[0].values).toEqual([4, 2])
  })
  it('parses dimensional numeric annotations and finds all van der Waals roots from fixed constants', () => {
    const source =
      'a=3.59 (L^2·bar/mol^2), b=0.0427 (L/mol), R=0.08314, T=280 (K), P=53 (bar)\n(P+a/V^2)*(V-b)=R*T'
    const solutions = auto(source, {}).solutions
    expect(solutions).toHaveLength(3)
    const volumes = solutions
      .map((r) =>
        Object.fromEntries(r.variables.map((name, i) => [name, r.values[i]])),
      )
      .sort((a, b) => a.V - b.V)
    expect(volumes[0].V).toBeCloseTo(0.085350410047135382, 10)
    for (const r of volumes) {
      expect(r.a).toBe(3.59)
      expect(r.T).toBe(280)
      expect((r.P + r.a / r.V ** 2) * (r.V - r.b)).toBeCloseTo(r.R * r.T, 10)
    }
  })
  it('supports unambiguous space-separated numeric assignments and manual evaluations', () => {
    expect(auto('a=2 b=4\nx^2=a*b', {}).solutions).toHaveLength(2)
    expect(manual('a=2 b=4; c=max(a,b)\na+b+c', {}).values).toEqual([
      2, 4, 4, 10,
    ])
  })
  it('reports the original physical row after list expansion', () => {
    try {
      linear('a=2,b=4\nx + * y = 2', {})
      throw new Error('should fail')
    } catch (e) {
      expect(e).toBeInstanceOf(ModelError)
      expect((e as ModelError).line).toBe(2)
    }
  })
  it('normalizes copied code, minus symbols and duplicated rich-text breaks without dropping normal gaps', () => {
    expect(
      normalizeEquationPaste('```text\r\nx=2\r\n\r\ny=3\r\n\r\nz=−4\r\n```'),
    ).toBe('x=2\ny=3\nz=-4')
    expect(normalizeEquationPaste('x=2\n\n# memo\ny=3')).toBe(
      'x=2\n\n# memo\ny=3',
    )
  })
})
