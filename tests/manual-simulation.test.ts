import { readFile } from 'node:fs/promises'
import { beforeAll, expect, it } from 'vitest'
import { createAutomaticSolver } from '../src/engine/automatic'
import { createNonlinearSolver } from '../src/engine/nonlinear'
import { createManualSimulation } from '../src/engine/manual-simulation'

let manual: Awaited<ReturnType<typeof createNonlinearSolver>>
let automatic: Awaited<ReturnType<typeof createAutomaticSolver>>
beforeAll(async () => {
  const wasm = await readFile(new URL('../public/solver.wasm', import.meta.url))
  manual = await createNonlinearSolver(wasm)
  automatic = await createAutomaticSolver(wasm)
})

it('follows the manually chosen cubic root without joining the distant surviving root', () => {
  const compute = createManualSimulation(manual, automatic.solveNear)
  const source = '(x-1)(x+1)(x)=(-1/q)x+p\nx(0)=10'
  const q = -2.79757392
  const sweep = { name: 'p', min: -10, max: 10, step: 0.1, steps: 81 }
  const first = compute(source, { p: -0.5747126437, q }, sweep)
  expect(first.panel.result?.values[0]).toBeGreaterThan(0)
  const a = 1 - 1 / q
  const fold = -((2 * a) / 3) * Math.sqrt(a / 3)
  for (const point of first.panel.sweep) {
    if (point.parameter < fold - 1e-5) expect(point.values).toBeNull()
    if (point.values) {
      const x = point.values[0]
      expect(x).toBeGreaterThan(0)
      expect(Math.abs(x ** 3 - a * x - point.parameter)).toBeLessThan(1e-7)
    }
  }
  const moved = compute(source, { p: 4.25, q }, sweep)
  expect(moved.panel.sweep).toBe(first.panel.sweep)
  expect(moved.panel.result?.values[0]).toBeGreaterThan(0)
  const vanished = compute(source, { p: -5, q }, sweep)
  expect(vanished.panel.result).toBeNull()
  expect(vanished.panel.sweep).toBe(first.panel.sweep)
  const restart = compute(source, { p: -5, q }, sweep, 'infinity', true)
  expect(restart.anchor.id).not.toBe(first.anchor.id)
  expect(restart.panel.result?.values[0]).toBeLessThan(0)
})

it('puts every exact sample on the displayed reference curve, including a curved fold', () => {
  const compute = createManualSimulation(manual, automatic.solveNear)
  const { panel } = compute(
    'x^2=p\nx(0)=2',
    { p: 4 },
    {
      name: 'p',
      min: 0,
      max: 5,
      step: 0.3,
      steps: 11,
    },
  )
  for (const point of panel.dataset) {
    const vertex = panel.sweep.find((v) => v.parameter === point.parameter)
    expect(vertex).toBeDefined()
    expect(vertex?.values).toEqual(point.values)
    if (point.values)
      expect(point.values[0]).toBeCloseTo(Math.sqrt(point.parameter), 7)
  }
})

it('does not turn a parameter pole into an invented connecting segment', () => {
  const compute = createManualSimulation(manual, automatic.solveNear)
  const { panel } = compute(
    'x=1/q\nx(0)=1',
    { q: 1 },
    {
      name: 'q',
      min: -2,
      max: 2,
      step: 0.13,
      steps: 17,
    },
  )
  expect(panel.sweep.some((p) => p.parameter === 0 && p.values === null)).toBe(
    true,
  )
  expect(
    panel.sweep.filter((p) => p.parameter < 0).every((p) => p.values === null),
  ).toBe(true)
})

it('respects a manual unknown bound during continuation, not only at the anchor', () => {
  const compute = createManualSimulation(manual, automatic.solveNear)
  const { panel } = compute(
    'x=p\nx(min)=0\nx(max)=1',
    { p: 0.5 },
    {
      name: 'p',
      min: -1,
      max: 2,
      step: 0.1,
      steps: 31,
    },
  )
  for (const point of panel.sweep) {
    if (point.parameter < 0 || point.parameter > 1)
      expect(point.values).toBeNull()
    if (point.values) expect(point.values[0]).toBeCloseTo(point.parameter, 10)
  }
})
