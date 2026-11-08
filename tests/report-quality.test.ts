import { describe, expect, it } from 'vitest'
import {
  classifyScalarRoot,
  verifyScalarTangency,
} from '../src/engine/tangency'

describe('model-independent root classification', () => {
  it.each([2, 3, 4, 5, 6, 7, 8])(
    'recognizes order %s at translated and scaled contacts',
    (order) => {
      for (const scale of [1e-12, 1, 1e12]) {
        const f = (x: number, p: number) => scale * ((x - 1) ** order - p)
        const t = verifyScalarTangency(f, 1.001, 0)
        expect(t?.bifurcationOrder).toBe(order)
        expect(t?.valuesStar[0]).toBeCloseTo(1, 7)
        expect(classifyScalarRoot((x) => f(x, 0), 1).order).toBe(order)
      }
    },
  )
  it('never labels a nearby simple root a double root and never differentiates an open endpoint', () => {
    expect(classifyScalarRoot((x) => x * x - 1e-12, 1e-6).order).toBe(1)
    expect(
      verifyScalarTangency((x, p) => x ** 5 - p, 0.01, 0)?.bifurcationOrder,
    ).toBe(5)
    expect(
      verifyScalarTangency(
        (x, p) => (x > 0 ? x * Math.log(x) + p : undefined),
        0,
        0,
      ),
    ).toBeUndefined()
  })
})

import { createAutomaticSolver } from '../src/engine/automatic'
import { createSolver } from '../src/engine'
import {
  reportDiagnostics,
  coveragePercent,
  searchConclusion,
} from '../src/engine/report-diagnostics'
import { tangencyLabel } from '../src/engine/tangency'

describe('interpretable numerical report metrics', () => {
  it('bounds the actual root error with interval Newton, not residual magnitude', async () => {
    const solve = await createAutomaticSolver(new ArrayBuffer(0))
    const found = solve('x^2=p', { p: 2 }, { certifyRoots: true })
    for (const r of found.solutions) {
      const d = reportDiagnostics(r, 'x^2=p', { p: 2 }, found.search)
      const root = Math.sign(r.values[0]) * Math.sqrt(2)
      expect(d.enclosure).toBeDefined()
      expect(d.enclosure!.lo).toBeLessThanOrEqual(root)
      expect(d.enclosure!.hi).toBeGreaterThanOrEqual(root)
      expect(d.errorBound).toBeLessThan(1e-12)
      expect(d.parameterSensitivity[0].derivatives[0]).toBeCloseTo(
        1 / (2 * root),
        8,
      )
    }
    const stale = reportDiagnostics(
      found.solutions[0],
      'x^2=p',
      { p: 3 },
      found.search,
    )
    expect(stale.enclosure).toBeUndefined()
    expect(
      reportDiagnostics(found.solutions[0], 'x^2=p+1', { p: 2 }, found.search)
        .enclosure,
    ).toBeUndefined()
  })
  it('shows absolute sensitivity when scalar condition number is always one', async () => {
    const solve = await createAutomaticSolver(new ArrayBuffer(0))
    const r = solve(
      '0.000000000001*x=1',
      {},
      { searchBounds: { min: 0, max: 2e12 } },
    ).solutions[0]
    expect(r.condition).toBe(1)
    expect(
      reportDiagnostics(r, '0.000000000001*x=1', {}).amplification,
    ).toBeCloseTo(1e12, 0)
  })
  it('predicts sixth-root response without inventing a finite linear amplification', async () => {
    const solve = await createAutomaticSolver(new ArrayBuffer(0))
    const r = solve('(x-2)^6=0', {}).solutions[0]
    const d = reportDiagnostics(r, '(x-2)^6=0', {})
    expect(r.rootStructure?.order).toBe(6)
    expect(d.powerResponse?.coefficient).toBeCloseTo(1, 6)
    expect(d.amplification).toBeUndefined()
  })
  it('keeps incomplete length coverage below 100 and never calls it probability', async () => {
    const solve = await createAutomaticSolver(new ArrayBuffer(0))
    const found = solve('1/x=0', {}, { certifyRoots: true })
    expect(coveragePercent(found.search)).not.toBe('100%')
    expect(searchConclusion(found.search)).toContain('추가 검증')
  })
  it('checks linear backward error and absolute inverse amplification independently', async () => {
    const solve = await createSolver(new ArrayBuffer(0))
    const r = solve('2*x=4\n4*y=12', {})
    const d = reportDiagnostics(r, '2*x=4\n4*y=12', {})
    expect(d.rank).toBe(2)
    expect(d.amplification).toBeCloseTo(0.5, 12)
    expect(d.normalizedError).toBe(0)
    expect(d.correction).toEqual([0, 0])
  })
  it('does not label a pitchfork or branch crossing as a regular merge', () => {
    for (const f of [
      (x: number, p: number) => x ** 3 - p * x,
      (x: number, p: number) => x * x - p * p,
    ]) {
      const t = verifyScalarTangency(f, 0, 0)
      expect(t?.geometry).toBe('degenerate')
      expect(tangencyLabel(t!)).toBe('분기 다중근')
    }
    expect(verifyScalarTangency((x, p) => x ** 9 - p, 0.01, 0)).toBeUndefined()
  })
})

it('does not report two tiny distinct roots as a double root', async () => {
  const solve = await createAutomaticSolver(new ArrayBuffer(0))
  const roots = solve('x^2=1e-30', {}).solutions
  expect(roots).toHaveLength(2)
  for (const root of roots) {
    expect(root.rootStructure?.kind).not.toBe('multiple')
    expect(reportDiagnostics(root, 'x^2=1e-30', {}).amplification).toBeCloseTo(
      5e14,
      0,
    )
  }
})

it('does not annotate parameter-independent tiny simple roots as branch contacts', () => {
  expect(
    verifyScalarTangency((x) => x * x - 1e-30, 1e-15, 0, 2e-15),
  ).toBeUndefined()
  expect(
    verifyScalarTangency((x, p) => x ** 3 - p * x, 0, 0, 0)?.geometry,
  ).toBe('degenerate')
})
