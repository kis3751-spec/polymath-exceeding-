import { beforeAll, describe, expect, it } from 'vitest'
import { createNonlinearSolver } from '../src/engine/nonlinear'
import { createAutomaticSolver } from '../src/engine/automatic'
import {
  createSimulationPanelComputer,
  detectMergedBranchEvents,
} from '../src/engine/simulation-panels'
import {
  branchEventLabel,
  uniqueBranchEvents,
} from '../src/engine/branch-events'
import { SHOWCASE_EXAMPLES } from '../src/showcase-examples'
import type { BranchTerminalEvent } from '../src/engine'
import { equationProject } from '../src/equation-project'
import { DEFAULT_NONLINEAR_PROJECT } from '../src/models'

describe('ordinary manual equations', () => {
  let solve: Awaited<ReturnType<typeof createNonlinearSolver>>
  beforeAll(async () => {
    solve = await createNonlinearSolver(new ArrayBuffer(0))
  })
  it('solves a plain equality with a range and with a scalar initial guess', () => {
    expect(solve('x^2=4\nx(min)=0\nx(max)=3', {}).values[0]).toBeCloseTo(2, 8)
    const r = solve('exp(x)=2\nx(0)=1', {})
    expect(r.values[0]).toBeCloseTo(Math.log(2), 9)
    expect(r.method).toContain('자동미분')
  })
  it('maps system variables globally rather than picking the first unknown in each row', () => {
    const r = solve('x^2+y^2=25\nx-y=1\nx(0)=3.8\ny(0)=2.8', {})
    expect(r.variables).toEqual(['x', 'y'])
    expect(r.values[0]).toBeCloseTo(4, 8)
    expect(r.values[1]).toBeCloseTo(3, 8)
    expect(r.maxResidual).toBeLessThan(1e-8)
  })
  it('uses numbered functions and combinations in the same manual solver', () => {
    const r = solve('f1(x)=2*x+4\nf2(x)=-3*x+7\nf1(x)=f2(x)\nx(0)=1', {})
    expect(r.values[0]).toBeCloseTo(0.6, 9)
  })
  it('does not silently solve a function definition as an equation equal to zero', async () => {
    const auto = await createAutomaticSolver(new ArrayBuffer(0))
    expect(() => auto('f1(x)=x^2-4', {})).toThrow('등식을 추가')
    expect(auto('f1(x)=x^2-4\nf1(x)=0', {}).solutions).toHaveLength(2)
  })
  it('falls back to bounded Newton without returning a root outside the entered range', () => {
    expect(
      solve('x^2=1\nx(min)=-2\nx(max)=2\nx(0)=0.8', {}).values[0],
    ).toBeCloseTo(1, 9)
    expect(() =>
      solve('(x-2)*(x-4)=0\nx(min)=0\nx(max)=1\nx(0)=0.5', {}),
    ).toThrow()
    expect(() => solve('x^2=4\nx(min)=0\nx(0)=1', {})).toThrow('모두')
  })
  it('retains derivative-free scalar solving with an initial guess', () => {
    const r = solve('abs(x-0.1234567)=0\nx(0)=0', {})
    expect(r.values[0]).toBe(0.1234567)
    expect(r.method).toContain('미분 없는')
    expect(Number.isNaN(r.matrix[0][0])).toBe(true)
  })
})

function event(
  parameter: number,
  x: number,
  kind: BranchTerminalEvent['kind'] = 'unresolved',
): BranchTerminalEvent {
  return {
    kind,
    direction: -1,
    parameter: parameter + 0.01,
    values: [x + 0.01],
    description: 'detail',
    tangency: {
      verified: true,
      bifurcationOrder: 2,
      parameterStar: parameter,
      valuesStar: [x],
      terminalSlope: 0,
      oppositeSlopeSigns: false,
      curvatureFxx: 2,
      geometricSummary: 'detail',
    },
  }
}
describe('one plain-language message per critical point', () => {
  it('deduplicates refined events despite differing coarse endpoints, kinds and directions', () => {
    const a = event(0.42, 0.718),
      b = {
        ...event(0.42 + Number.EPSILON, 0.718 + Number.EPSILON, 'merge'),
        direction: 1 as const,
        parameter: 0.44,
      }
    const r = uniqueBranchEvents([a, b])
    expect(r).toHaveLength(1)
    expect(r[0].kind).toBe('merge')
    expect(branchEventLabel(r[0])).toBe('근 병합')
  })
  it('keeps separate tiny critical coordinates instead of rounding them to one label', () => {
    expect(
      uniqueBranchEvents([event(1e-15, 1e-15), event(2e-15, 1e-15)]),
    ).toHaveLength(2)
    expect(uniqueBranchEvents([event(0, 1e-15), event(0, 2e-15)])).toHaveLength(
      2,
    )
  })
  it('calls a cubic passage a passage and keeps unverified events visibly estimated', () => {
    const a = event(0, 0)
    a.tangency!.bifurcationOrder = 3
    expect(branchEventLabel(a)).toBe('변곡점 통과')
    expect(branchEventLabel({ ...a, tangency: undefined, kind: 'merge' })).toBe(
      '근 병합 추정',
    )
  })
  it.each(['landau-fold', 'van-der-waals', 'dimensional-van-der-waals'])(
    'reconciles the two distinct fold points consistently in %s',
    async (id) => {
      const auto = await createAutomaticSolver(new ArrayBuffer(0))
      const project = SHOWCASE_EXAMPLES.find((e) => e.id === id)!.project
      const parameters = Object.fromEntries(
        project.parameters.map((p) => [p.name, p.value]),
      )
      const roots = auto(project.source, parameters).solutions,
        sweep = project.parameters.find((p) => p.name === project.sweepName)!
      const panels = createSimulationPanelComputer(auto.solveNear)(
        project.source,
        parameters,
        {
          name: sweep.name,
          min: sweep.min,
          max: sweep.max,
          step: sweep.step,
          steps: 81,
        },
        roots.map((r, i) => ({
          id: String(i),
          label: `해 ${i}`,
          variables: r.variables,
          values: r.values,
          parameters,
        })),
      )
      const events = detectMergedBranchEvents(panels)
      expect(events).toHaveLength(2)
      expect(events.every((e) => e.kind === 'merge')).toBe(true)
      expect(uniqueBranchEvents(events)).toHaveLength(2)
      expect(events.map(branchEventLabel)).toEqual(['근 병합', '근 병합'])
    },
  )
})

describe('saved equation projects', () => {
  it('converts old helper formulas to equalities and keeps their solution', async () => {
    const p = equationProject({
      ...DEFAULT_NONLINEAR_PROJECT,
      source: 'f(x)=t+4*x^2-1620\nt=x*log(x/2)',
    })
    expect(p.source).not.toContain('f(x)')
    const solve = await createAutomaticSolver(new ArrayBuffer(0))
    expect(solve(p.source, {}).solutions[0].values[0]).toBeCloseTo(20, 7)
  })
  it('reorders saved anchors when ordinary equality discovery changes variable order', () => {
    const a = {
      id: 'a',
      label: '해',
      variables: ['x', 'y'],
      values: [1, 2],
      parameters: {},
    }
    const p = equationProject({
      ...DEFAULT_NONLINEAR_PROJECT,
      source: 'f(x)=y+x-3\nf(y)=x-y+1',
      selectedAnchor: a,
      simulations: [a],
    })
    expect(p.selectedAnchor?.variables).toEqual(['y', 'x'])
    expect(p.selectedAnchor?.values).toEqual([2, 1])
    expect(p.simulations?.[0].values).toEqual([2, 1])
    expect(a.values).toEqual([1, 2])
  })
  it('preserves invalid drafts and distinguishes f variable metadata from formulas', () => {
    const bad = { ...DEFAULT_NONLINEAR_PROJECT, source: 'f(x)=t\nt=t+x' }
    expect(equationProject(bad)).toBe(bad)
    const p = equationProject({
      ...DEFAULT_NONLINEAR_PROJECT,
      source: 'f(f)=f^2-4\nf(min)=0\nf(max)=3',
    })
    expect(p.source).not.toContain('f(f)')
    expect(p.source).toContain('f(min)=0')
  })
})
