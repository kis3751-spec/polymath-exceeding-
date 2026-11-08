import { derivativeFreeRoots } from '../src/engine/derivative-free'
import { createNonlinearSolver } from '../src/engine/nonlinear'
import { beforeAll, describe, it, expect } from 'vitest'
import { createAutomaticSolver } from '../src/engine/automatic'
import { findPolynomialRealRoots } from '../src/engine/automatic-polynomial'
import { createSimulationPanelComputer } from '../src/engine/simulation-panels'
let solve: Awaited<ReturnType<typeof createAutomaticSolver>>
beforeAll(async () => {
  solve = await createAutomaticSolver(new ArrayBuffer(0))
})
describe('bounded search and non-smooth models', () => {
  it('enumerates high-frequency sine roots in a limited movable window', () => {
    const r = solve('sin(1000*x)=0', {})
    expect(r.search.window?.reason).toBe('periodic')
    expect(r.search.max - r.search.min).toBeLessThanOrEqual(
      ((28 * Math.PI) / 1000) * (1 + 1e-14),
    )
    expect(r.solutions.length).toBeGreaterThan(20)
    expect(r.solutions.length).toBeLessThanOrEqual(32)
    for (const s of r.solutions)
      expect(Math.abs(Math.sin(1000 * s.values[0]))).toBeLessThan(1e-12)
    const shifted = solve(
      'sin(1000*x)=0',
      {},
      { searchBounds: { min: 9, max: 11 } },
    )
    expect(shifted.search.window).toBeDefined()
    expect(
      shifted.solutions.every((s) => s.values[0] > 9.9 && s.values[0] < 10.1),
    ).toBe(true)
  })
  it.each(['2*sin(300*x+0.3)=1', 'cos(500*x)=0.5', 'tan(250*x)=0'])(
    'checks the original periodic equation: %s',
    (source) => {
      const r = solve(source, {})
      expect(r.search.window).toBeDefined()
      expect(r.solutions.length).toBeGreaterThan(15)
      for (const s of r.solutions) expect(s.maxResidual).toBeLessThan(1e-11)
    },
  )
  it.each([1e-15, 1e15])('normalizes periodic residual scale %s', (scale) => {
    const r = solve(`${scale}*sin(1000*x)=0`, {})
    expect(r.solutions.length).toBeGreaterThan(20)
    for (const root of r.solutions)
      expect(Math.abs(root.maxResidual / scale)).toBeLessThan(1e-12)
  })
  it('honors independent boxes and retains fixed unknowns inside their own bounds', () => {
    const options = {
      variableBounds: { x: { min: 1, max: 2 }, y: { min: -3, max: -1 } },
    }
    const r = solve('x^2+y^2=5\nx+y=0', {}, options)
    expect(r.solutions).toHaveLength(1)
    expect(r.solutions[0].values[0]).toBeCloseTo(Math.sqrt(2.5), 9)
    expect(r.search.variableBounds).toEqual(options.variableBounds)
    expect(
      solve('x=2;y^2=4', {}, { variableBounds: { x: { min: 3, max: 4 } } })
        .solutions,
    ).toHaveLength(0)
    expect(() =>
      solve('x^2=4', {}, { variableBounds: { x: { min: 4, max: 3 } } }),
    ).toThrow()
  })
  it('keeps inherited common bounds when a fixed equation reduces a boxed system to one variable', () => {
    const r = solve(
      'x=2;y^2=1000000',
      {},
      { variableBounds: { x: { min: 1, max: 3 } } },
    )
    expect(r.solutions).toHaveLength(0)
    expect(solve('x^2=1000000', {}).solutions).toHaveLength(2)
  })
  it.each([4, 6, 8, 10, 12])('returns one exact root of (x-2)^%s', (n) => {
    const r = solve(`(x-2)^${n}=0`, {})
    expect(r.solutions.map((s) => s.values[0])).toEqual([2])
    expect(r.solutions[0].maxResidual).toBe(0)
  })
  it('removes an expanded sixth-power repeated factor without a cloud of roots', () => {
    const c = [64, -192, 240, -160, 60, -12, 1]
    expect(findPolynomialRealRoots(c).roots).toEqual([2])
    expect(
      solve('x^6-12*x^5+60*x^4-160*x^3+240*x^2-192*x+64=0', {}).solutions.map(
        (s) => s.values[0],
      ),
    ).toEqual([2])
  })
  it('handles a transcendental sixth power by its equivalent zero condition', () => {
    const r = solve('(sin(x))^6=0', {}, { searchBounds: { min: -4, max: 4 } })
    expect(r.solutions.map((s) => s.values[0])).toEqual([0, Math.PI, -Math.PI])
  })
  it.each(['abs(x-0.1234567)=0', 'max(x,0)=2', 'min(x,0)=-2'])(
    'uses no derivative classification for %s',
    (source) => {
      const r = solve(source, {})
      expect(r.search.method).toContain('미분 없는')
      expect(r.solutions).toHaveLength(1)
      expect(r.solutions[0].maxResidual).toBe(0)
      expect(Number.isNaN(r.solutions[0].matrix[0][0])).toBe(true)
    },
  )
  it('does not turn a discontinuity or a positive minimum into a zero', () => {
    expect(solve('sign(x-0.123)-0.2=0', {}).solutions).toHaveLength(0)
    expect(solve('abs(x-0.123)+1e-14=0', {}).solutions).toHaveLength(0)
    const r = solve('floor(x)=2', {})
    expect(r.search.nonIsolated).toBe(true)
    expect(r.solutions).toHaveLength(1)
    expect(Math.floor(r.solutions[0].values[0])).toBe(2)
  })
  it('reports a stopped search when its evaluation budget is exhausted', () => {
    let evaluations = 0
    const r = derivativeFreeRoots(
      (x) => {
        evaluations++
        return x
      },
      { min: -1, max: 1 },
      64,
      performance.now() - 1,
    )
    expect(r.truncated).toBe(true)
    expect(evaluations).toBe(0)
  })
  it('uses derivative-free manual scalar solving and refuses non-smooth system Newton', async () => {
    const manual = await createNonlinearSolver(new ArrayBuffer(0))
    const r = manual('f(x)=abs(x-0.1234567)\nx(min)=-1\nx(max)=1', {})
    expect(r.values[0]).toBe(0.1234567)
    expect(r.method).toContain('미분 없는')
    expect(() =>
      manual('f(x)=abs(x)+y-1\nf(y)=x-y\nx(0)=1\ny(0)=1', {}),
    ).toThrow(/미분 없는 다변수/)
    expect(() =>
      solve('sin(1e10*x)=0', {}, { searchBounds: { min: 100, max: 101 } }),
    ).toThrow(/위상/)
  })
  it('keeps kink branch curves but never labels them a smooth tangency', () => {
    const source = 'abs(x)=p',
      r = solve(source, { p: 1 }),
      compute = createSimulationPanelComputer(solve.solveNear)
    const anchors = r.solutions.map((s, i) => ({
      id: String(i),
      label: `해 ${i}`,
      variables: s.variables,
      values: s.values,
      parameters: { p: 1 },
    }))
    const panels = compute(
      source,
      { p: 0.5 },
      { name: 'p', min: -1, max: 2, step: 0.1, steps: 40 },
      anchors,
    )
    expect(
      panels.flatMap((p) => p.events ?? []).some((e) => e.tangency?.verified),
    ).toBe(false)
    expect(panels.every((p) => p.result !== null)).toBe(true)
  })
})
