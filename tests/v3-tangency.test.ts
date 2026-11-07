import { describe, it, expect } from 'vitest'
import {
  adaptiveDerivative,
  verifyScalarTangency,
} from '../src/engine/tangency'
import { createAutomaticSolver } from '../src/engine/automatic'
import { continueRoot } from '../src/engine/branches'
import { createSimulationPanelComputer } from '../src/engine/simulation-panels'

describe('local tangency order and domain verification', () => {
  it('distinguishes cubic passage and quartic fold using original residuals', () => {
    const cubic = verifyScalarTangency((x, p) => x ** 3 - p, 0.01, 0)
    expect(cubic?.bifurcationOrder).toBe(3)
    expect(cubic?.valuesStar[0]).toBeCloseTo(0, 8)
    expect(cubic?.curvatureFxxx).toBeCloseTo(6, 5)
    const quartic = verifyScalarTangency((x, p) => (x - 1) ** 4 - p, 1.001, 0)
    expect(quartic?.bifurcationOrder).toBe(4)
    expect(quartic?.valuesStar[0]).toBeCloseTo(1, 8)
    expect(quartic?.curvatureFxxxx).toBeCloseTo(24, 4)
  })
  it.each([1e-12, 1, 1e12])(
    'keeps classification under residual scaling %s',
    (scale) => {
      expect(
        verifyScalarTangency((x, p) => scale * (x ** 3 - p), 0, 0)
          ?.bifurcationOrder,
      ).toBe(3)
      expect(
        verifyScalarTangency((x, p) => scale * ((x - 1) ** 4 - p), 1, 0)
          ?.bifurcationOrder,
      ).toBe(4)
    },
  )
  it('keeps smooth folds and a logarithmic minimum while respecting the open domain', () => {
    const log = (x: number, p: number) =>
      x > 0 ? x * Math.log(x) + p : undefined
    const t = verifyScalarTangency(log, 0.37, 1 / Math.E)
    expect(t?.bifurcationOrder).toBe(2)
    expect(t?.valuesStar[0]).toBeCloseTo(1 / Math.E, 6)
    expect(t?.parameterStar).toBeCloseTo(1 / Math.E, 6)
    expect(verifyScalarTangency(log, 0, 0)).toBeUndefined()
    const d = adaptiveDerivative((x) => (x >= 0 ? x * x : undefined), 0)
    expect(d?.oneSided).toBe(true)
    expect(d?.value).toBeCloseTo(0, 8)
    expect(
      verifyScalarTangency(
        (x, p) => (x >= 0 ? Math.sqrt(x) ** 4 - p : undefined),
        0,
        0,
      )?.bifurcationOrder,
    ).toBe('boundary')
    expect(
      adaptiveDerivative((x) => (x > 0 ? Math.log(x) : undefined), 1e-8)?.value,
    ).toBeGreaterThan(0)
  })
  it('verifies both transcendental fold coordinates independently', () => {
    const f = (x: number, p: number) =>
      Math.cos((3 / Math.PI) * x) - Math.sinh(x) / 3 - p
    for (const [x, p] of [
      [-0.406, 1.065],
      [-1.712, 0.829],
    ]) {
      const t = verifyScalarTangency(f, x, p)
      expect(t?.bifurcationOrder).toBe(2)
      expect(Math.abs(f(t!.valuesStar[0], t!.parameterStar))).toBeLessThan(
        1e-12,
      )
      expect(
        Math.abs(
          (-3 / Math.PI) * Math.sin((3 / Math.PI) * t!.valuesStar[0]) -
            Math.cosh(t!.valuesStar[0]) / 3,
        ),
      ).toBeLessThan(1e-8)
    }
    expect(verifyScalarTangency((x, p) => 2 * x - p, 0, 0)).toBeUndefined()
    expect(verifyScalarTangency(() => 1, 0, 0)).toBeUndefined()
  })
  it('continues off-grid odd roots and blocks rational and degenerate poles', async () => {
    const auto = await createAutomaticSolver()
    expect(() => auto('f1(x)=x+1\nf1(y)=0', {})).toThrow(/다른 변수/)
    for (const n of [3, 5, 7, 11]) {
      const source = `x^${n}=2-a`,
        parameters = { a: 0 }
      const origin = auto(source, parameters).solutions[0]
      const end = continueRoot(
        auto.solveNear,
        source,
        parameters,
        { a: 3 },
        origin,
      )
      expect(end.values[0]).toBeCloseTo(-1, 7)
    }
    for (const source of ['x=1/p', 'x=1/(p-0.1)^2', 'p*x=1', '(p*x-1)^3=0']) {
      const start = auto(source, { p: 1 }).solutions[0]
      expect(() =>
        continueRoot(auto.solveNear, source, { p: 1 }, { p: -0.9 }, start),
      ).toThrow()
    }
  })
  it('annotates a quartic endpoint and permits a finite degree-drop path', async () => {
    const auto = await createAutomaticSolver()
    const source = '(x-1)^4=p',
      origin = auto.solveNear(source, { p: 1 }, [2])
    const compute = createSimulationPanelComputer(auto.solveNear)
    const panel = compute(
      source,
      { p: 0.1 },
      { name: 'p', min: 0, max: 1, step: 0.07, steps: 80 },
      [
        {
          id: 'q',
          label: '해',
          variables: ['x'],
          values: origin.values,
          parameters: { p: 1 },
        },
      ],
    )[0]
    expect(
      panel.events?.some((ev) => ev.tangency?.bifurcationOrder === 4),
    ).toBe(true)
    const finite = 'p*x^3+x=1',
      start = auto(finite, { p: 1 }).solutions[0]
    expect(
      continueRoot(auto.solveNear, finite, { p: 1 }, { p: 0 }, start).values[0],
    ).toBeCloseTo(1, 8)
  })
  it('keeps annotated reference sweep identity when only the current parameter changes', async () => {
    const auto = await createAutomaticSolver(),
      source = 'x^3=p'
    const result = auto(source, { p: 1 }).solutions[0]
    const anchor = {
      id: 'a',
      label: '해 1',
      variables: ['x'],
      values: result.values,
      parameters: { p: 1 },
    }
    const compute = createSimulationPanelComputer(auto.solveNear)
    const sweep = { name: 'p', min: -1, max: 1, step: 0.07, steps: 80 }
    const a = compute(source, { p: 0.5 }, sweep, [anchor])[0]
    const b = compute(source, { p: -0.5 }, sweep, [anchor])[0]
    expect(b.sweep).toBe(a.sweep)
    expect(a.events?.some((ev) => ev.tangency?.bifurcationOrder === 3)).toBe(
      true,
    )
    expect(b.result?.values[0]).toBeCloseTo(-Math.cbrt(0.5), 7)
  })
})
