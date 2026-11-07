import { beforeAll, describe, expect, it } from 'vitest'
import { createSolver } from '../src/engine'
import { createAutomaticSolver } from '../src/engine/automatic'
import {
  createSimulationPanelComputer,
  detectMergedBranchEvents,
} from '../src/engine/simulation-panels'
import { preprocessSolverSource } from '../src/engine/preprocessor'

let linear: Awaited<ReturnType<typeof createSolver>>
let search: Awaited<ReturnType<typeof createAutomaticSolver>>
beforeAll(async () => {
  linear = await createSolver(new ArrayBuffer(0))
  search = await createAutomaticSolver(new ArrayBuffer(0))
})

describe('named functions and merged branch exploration', () => {
  const functions = 'f1(x)=2x+4\nf2(x)=-3x+7\nf1(x)-f2(x)=0'
  it('solves function algebra in both calculators', () => {
    expect(linear(functions, {}).values[0]).toBeCloseTo(0.6, 10)
    expect(search(functions, {}).solutions[0].values[0]).toBeCloseTo(0.6, 10)
    const mixed = 'f1=2x+y-10\nf2=x-y-2\nf1+f2=0\nf1-f2=0'
    expect(linear(mixed, {}).values).toEqual([4, 2])
  })
  it('supports composition, scientific literals and parameterized constants', () => {
    expect(
      linear('f1(x)=k*x+1e-3\nf1(2x)=2.001', { k: 2 }).values[0],
    ).toBeCloseTo(0.5, 10)
    expect(
      search('f1(x)=x^2\nf2(x)=f1(x)+1\nf2(x)=5', {}).solutions.map(
        (s) => s.values[0],
      ),
    ).toEqual([2, -2])
  })
  it('rejects foreign variables, cycles and excessive expansion with readable errors', () => {
    expect(() => linear('f1(y)=-3x+7\nf1(y)=0', {})).toThrow(/다른 변수/)
    expect(() => linear('f1=f2+1\nf2=f1+1\nf1-f2=0', {})).toThrow()
    expect(() => linear('f1=x\nf1(x)=x+1\nf1=0', {})).toThrow(/중복/)
  })
  it('retains legacy ordinary equations and residual models', () => {
    expect(preprocessSolverSource('f^2=4', [], 'nonlinear')).toBe('f^2=4')
    expect(search('f^2=4', {}).solutions.map((s) => s.values[0])).toEqual([
      2, -2,
    ])
    expect(search('f(x)=x^2+y^2-25\nf(y)=y-x+1', {}).solutions).toHaveLength(2)
  })
  it('retains valid fold points near tr=.38, gaps beyond the fold, and merge candidates', () => {
    const source = '(x-1)*(x-2)*(x-3)=tr'
    const roots = search(source, { tr: 0 }).solutions
    const compute = createSimulationPanelComputer(search.solveNear)
    const anchors = roots.map((root, i) => ({
      id: `a${i}`,
      label: `해 ${i + 1}`,
      variables: root.variables,
      values: root.values,
      parameters: { tr: 0 },
    }))
    const sweep = { name: 'tr', min: -2, max: 2, steps: 81, step: 0.1 }
    const panels = compute(source, { tr: 0.38 }, sweep, anchors)
    expect(panels.every((p) => p.result !== null)).toBe(true)
    for (const p of panels.slice(0, 2)) {
      expect(p.sweep.some((pt) => pt.parameter >= 0.38 && pt.values)).toBe(true)
      expect(
        p.sweep.filter((pt) => pt.parameter > 0.39).every((pt) => !pt.values),
      ).toBe(true)
    }
    expect(
      detectMergedBranchEvents(panels).some(
        (e) =>
          e.kind === 'merge' &&
          Math.abs(e.parameter - 2 / (3 * Math.sqrt(3))) < 1e-3,
      ),
      JSON.stringify(panels.map((p) => p.events)),
    ).toBe(true)
    const lost = compute(source, { tr: 0.5 }, sweep, anchors)
    expect(lost[0].result).toBeNull()
    expect(lost[2].result).not.toBeNull()
  })
  it('uses a verified curve point for the current cubic root across a singular parameter', () => {
    const source = 'x^3=2-a',
      start = search(source, { a: 0 }).solutions[0]
    const compute = createSimulationPanelComputer(search.solveNear)
    const panels = compute(
      source,
      { a: 3 },
      { name: 'a', min: 0, max: 3, steps: 81, step: 0.1 },
      [
        {
          id: 'c',
          label: '해 1',
          variables: start.variables,
          values: start.values,
          parameters: { a: 0 },
        },
      ],
    )
    expect(panels[0].result?.values[0]).toBeCloseTo(-1, 8)
  })
})
