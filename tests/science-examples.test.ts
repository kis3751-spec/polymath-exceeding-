import { beforeAll, describe, it, expect } from 'vitest'
import { SHOWCASE_EXAMPLES } from '../src/showcase-examples'
import { createAutomaticSolver } from '../src/engine/automatic'
import { createSimulationPanelComputer } from '../src/engine/simulation-panels'

let solve: Awaited<ReturnType<typeof createAutomaticSolver>>
beforeAll(async () => {
  solve = await createAutomaticSolver(new ArrayBuffer(0))
})
const checks: Record<
  string,
  {
    count: number
    contact?: 2 | 3 | 4
    residual: (
      v: number[],
      p: Record<string, number>,
      names: string[],
    ) => number
  }
> = {
  'landau-fold': {
    count: 3,
    contact: 2,
    residual: ([x], p) => x ** 3 - x - p.h,
  },
  'mean-field-magnet': {
    count: 3,
    contact: 2,
    residual: ([m], p) => m - Math.tanh(p.beta * m + p.h),
  },
  'semenov-ignition': {
    count: 2,
    contact: 2,
    residual: ([t], p) => Math.exp(t) - p.q * t,
  },
  'van-der-waals': {
    count: 3,
    contact: 2,
    residual: ([v], p) => (8 * p.T) / (3 * v - 1) - 3 / v ** 2 - p.P,
  },
  'transcendental-folds': {
    count: 3,
    contact: 2,
    residual: ([x], p) => Math.cos((3 / Math.PI) * x) - Math.sinh(x) / 3 - p.tr,
  },
  'quartic-contact': {
    count: 2,
    contact: 4,
    residual: ([x], p) => (x - 1) ** 4 - p.p,
  },
  'cubic-passage': { count: 1, contact: 3, residual: ([x], p) => x ** 3 - p.p },
  'mass-action-system': {
    count: 2,
    residual: (v, p, names) => {
      const { A, B, C } = Object.fromEntries(names.map((n, i) => [n, v[i]]))
      return Math.max(
        Math.abs(A + C - p.A0),
        Math.abs(B + C - p.B0),
        Math.abs(C - p.K * A * B),
      )
    },
  },
}
describe('scientific showcase examples with independently evaluated residuals', () => {
  for (const ex of SHOWCASE_EXAMPLES)
    it(
      ex.id,
      () => {
        const p = Object.fromEntries(
          ex.project.parameters.map((p) => [p.name, p.value]),
        )
        const found = solve(ex.project.source, p).solutions,
          check = checks[ex.id]
        expect(found).toHaveLength(check.count)
        const anchors = found.map((r, i) => ({
          id: `a${i}`,
          label: `해 ${i + 1}`,
          variables: r.variables,
          values: r.values,
          parameters: p,
        }))
        const s = ex.project.parameters.find(
          (v) => v.name === ex.project.sweepName,
        )!
        const panels = createSimulationPanelComputer(solve.solveNear)(
          ex.project.source,
          p,
          { name: s.name, min: s.min, max: s.max, step: s.step, steps: 80 },
          anchors,
        )
        for (const [i, panel] of panels.entries()) {
          expect(panel.result).not.toBeNull()
          for (const pt of panel.sweep.filter((pt) => pt.values))
            expect(
              Math.abs(
                check.residual(
                  pt.values!,
                  { ...p, [s.name]: pt.parameter },
                  found[i].variables,
                ),
              ),
            ).toBeLessThan(2e-7)
        }
        if (check.contact)
          expect(
            panels
              .flatMap((p) => p.events ?? [])
              .some(
                (e) =>
                  e.tangency?.verified &&
                  e.tangency.bifurcationOrder === check.contact,
              ),
          ).toBe(true)
      },
      15000,
    )
  it('changes the Landau root count across the analytic fold', () => {
    const ex = SHOWCASE_EXAMPLES.find((ex) => ex.id === 'landau-fold')!
    expect(solve(ex.project.source, { h: 0 }).solutions).toHaveLength(3)
    expect(solve(ex.project.source, { h: 0.5 }).solutions).toHaveLength(1)
  })
})
