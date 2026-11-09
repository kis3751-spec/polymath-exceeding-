import { it, expect } from 'vitest'
import { createAutomaticSolver } from '../src/engine/automatic'
import { continueRoot } from '../src/engine/branches'
import { createSimulationPanelComputer } from '../src/engine/simulation-panels'
import { NONLINEAR_EXAMPLES } from '../src/models'
it('keeps six complementary visible examples', () =>
  expect(NONLINEAR_EXAMPLES).toHaveLength(6))
it('rejects hidden transcendental poles but permits a safe same-sign path', async () => {
  const auto = await createAutomaticSolver(new ArrayBuffer(0))
  const source = 'x=1/sin(100*p)',
    start = auto(source, { p: 0.01 }).solutions[0]
  expect(() =>
    continueRoot(
      auto.solveNear,
      source,
      { p: 0.01 },
      { p: 0.01 + (2 * Math.PI) / 100 },
      start,
    ),
  ).toThrow()
  expect(
    continueRoot(auto.solveNear, source, { p: 0.01 }, { p: 0.012 }, start)
      .values[0],
  ).toBeCloseTo(1 / Math.sin(1.2), 10)
})
it('retains small terms in large additive cancellation and still rejects undefined terms', async () => {
  const auto = await createAutomaticSolver(new ArrayBuffer(0))
  for (const source of [
    '(1e16+x)-1e16=1',
    '1e16-(1e16-x)=1',
    '(1e16+x)-1e16=1e-15',
  ]) {
    const f = auto(
      source,
      {},
      { searchBounds: { min: -10, max: 10 }, certifyRoots: true },
    )
    expect(f.solutions).toHaveLength(1)
    const expected = source.includes('1e-15') ? 1e-15 : 1
    expect(Math.abs(f.solutions[0].values[0] - expected)).toBeLessThanOrEqual(
      1e-12 * Math.abs(expected),
    )
  }
  expect(() =>
    auto('1/x-1/x=0', {}, { searchBounds: { min: -1, max: 1 } }),
  ).toThrow()
})
it('includes the verified fold endpoint once in the immutable reference curve', async () => {
  const auto = await createAutomaticSolver(new ArrayBuffer(0)),
    compute = createSimulationPanelComputer(auto.solveNear)
  const anchor = {
    id: 'a',
    label: 'root',
    variables: ['x'],
    values: [1],
    parameters: { p: 1 },
  }
  const sweep = { name: 'p', min: -1, max: 2, step: 0.1, steps: 81 }
  const a = compute('x^2=p', { p: 1 }, sweep, [anchor])[0]
  const t = a.events!.find((e) => e.tangency?.verified)!.tangency!
  expect(
    a.sweep.filter((pt) => pt.parameter === t.parameterStar && pt.values),
  ).toHaveLength(1)
  expect(compute('x^2=p', { p: 0.5 }, sweep, [anchor])[0].sweep).toBe(a.sweep)
})

it('certifies a positive integer power through disclosed zero equivalence and supports square-root powers', async () => {
  const auto = await createAutomaticSolver(new ArrayBuffer(0))
  const repeated = auto(
    '(x-2)^6=0',
    {},
    { certifyRoots: true, searchBounds: { min: 0, max: 4 } },
  )
  expect(repeated.search.certification?.allRootsRepresented).toBe(true)
  expect(repeated.search.certification?.reduction).toBeTruthy()
  const sqrt = auto(
    'x^0.5=1',
    {},
    { certifyRoots: true, searchBounds: { min: 0.1, max: 4 } },
  )
  expect(sqrt.search.certification?.allRootsRepresented).toBe(true)
})

it('also blocks hidden poles of negative powers and tangent calls', async () => {
  const auto = await createAutomaticSolver(new ArrayBuffer(0))
  for (const source of [
    'x=sin(100*p)^-2',
    'x=pow(sin(100*p),-2)',
    'x=tan(100*p)',
  ]) {
    const start = auto(source, { p: 0.01 }).solutions[0]
    expect(() =>
      continueRoot(
        auto.solveNear,
        source,
        { p: 0.01 },
        { p: 0.01 + (2 * Math.PI) / 100 },
        start,
      ),
    ).toThrow()
  }
})
