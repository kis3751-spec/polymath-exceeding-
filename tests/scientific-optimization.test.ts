import { describe, expect, it } from 'vitest'
import { solveOptimization } from '../src/engine/scientific/optimization'

describe('bounded local optimization and constrained least squares', () => {
  it('finds a coupled unconstrained quadratic minimum', () => {
    const result = solveOptimization({
      module: 'optimization',
      source: 'min: (x-2)^2 + 3*(y+1)^2\nx|0 -10 10\ny|3 -10 10',
    })
    expect(result.status).toBe('converged')
    expect(result.values.x).toBeCloseTo(2, 5)
    expect(result.values.y).toBeCloseTo(-1, 5)
    expect(result.values.objective).toBeLessThan(1e-10)
  })
  it('reaches the Rosenbrock valley without claiming a global proof', () => {
    const result = solveOptimization({
      module: 'optimization',
      source: 'min: 100*(y-x^2)^2+(1-x)^2\nx|-1.2 -3 3\ny|1 -2 4',
      options: { maxIterations: 1200, tolerance: 1e-8 },
    })
    expect(result.status).toBe('converged')
    expect(result.values.x).toBeCloseTo(1, 4)
    expect(result.values.y).toBeCloseTo(1, 4)
    expect(result.warnings.join(' ')).toContain('전역')
  })
  it('satisfies a linear equality and finds its constrained quadratic optimum', () => {
    const result = solveOptimization({
      module: 'optimization',
      source: 'min: (x-1)^2+(y-1)^2\nx+y=1\nx|0.2 -2 2\ny|0.2 -2 2',
    })
    expect(result.status).toBe('converged')
    expect(result.values.x).toBeCloseTo(0.5, 5)
    expect(result.values.y).toBeCloseTo(0.5, 5)
    expect(result.values.x + result.values.y).toBeCloseTo(1, 6)
  })
  it('uses the actual inequality boundary and variable bounds', () => {
    const result = solveOptimization({
      module: 'optimization',
      source: 'min: (x-2)^2+(y-3)^2\nx+y<=2\nx|0.2 0 1\ny|0.2 0 4',
    })
    expect(result.status).toBe('converged')
    expect(result.values.x).toBeCloseTo(0.5, 4)
    expect(result.values.y).toBeCloseTo(1.5, 4)
    expect(result.values.x + result.values.y).toBeCloseTo(2, 6)
  })
  it('does not report an infeasible equality as converged', () => {
    const result = solveOptimization({
      module: 'optimization',
      source: 'min: x^2\nx=2\nx|0 0 1',
      options: { maxIterations: 60 },
    })
    expect(result.status).toBe('stopped')
    expect(
      result.metrics.find((m) => m.label === '최대 제약 위반')?.value,
    ).toBeGreaterThanOrEqual(1)
  })
  it('handles a nonlinear active circle constraint', () => {
    const result = solveOptimization({
      module: 'optimization',
      source: 'min: (x-2)^2+(y-2)^2\n1-x^2-y^2>=0\nx|0.2 -2 2\ny|0.4 -2 2',
      options: { maxIterations: 1600 },
    })
    expect(result.status).toBe('converged')
    expect(result.values.x).toBeCloseTo(Math.SQRT1_2, 4)
    expect(result.values.y).toBeCloseTo(Math.SQRT1_2, 4)
    expect(result.values.x ** 2 + result.values.y ** 2).toBeCloseTo(1, 5)
  })
  it('solves a constant-volume vessel design against its analytic optimum', () => {
    const result = solveOptimization({
      module: 'optimization',
      source:
        'volume=100\nmin: 2*pi*r^2+2*pi*r*h\npi*r^2*h=volume\nr|2 0.1 10\nh|5 0.1 30',
      options: { maxIterations: 1800 },
    })
    const radius = (100 / (2 * Math.PI)) ** (1 / 3)
    expect(result.status).toBe('converged')
    expect(result.values.r).toBeCloseTo(radius, 4)
    expect(result.values.h).toBeCloseTo(2 * radius, 4)
    expect(Math.PI * result.values.r ** 2 * result.values.h).toBeCloseTo(100, 4)
  })
  it('honors a box-bound optimum even when its ordinary gradient is nonzero', () => {
    const result = solveOptimization({
      module: 'optimization',
      source: 'min: (x-5)^2\nx|0 0 2',
    })
    expect(result.status).toBe('converged')
    expect(result.values.x).toBe(2)
    expect(result.values.objective).toBe(9)
  })
  it('does not accept an initial stationary maximum as a minimum', () => {
    const result = solveOptimization({
      module: 'optimization',
      source: 'min: -x^2\nx|0 -2 2',
    })
    expect(result.status).toBe('converged')
    expect(Math.abs(result.values.x)).toBe(2)
    expect(result.values.objective).toBe(-4)
  })
  it('fits constrained data and reports actual predictions and residuals', () => {
    const result = solveOptimization({
      module: 'lsq',
      source:
        '[\nx y\n0 1\n1 3\n2 5\n3 7\n4 9\n]\nfit: y = a*x+b\na|1 0 4\nb|0 -1 2\na+b=3',
    })
    expect(result.status).toBe('converged')
    expect(result.values.a).toBeCloseTo(2, 5)
    expect(result.values.b).toBeCloseTo(1, 5)
    expect(result.values.objective).toBeLessThan(1e-9)
    expect(result.columns.slice(-2)).toEqual(['prediction', 'error'])
    expect(result.residuals!.values).toHaveLength(5)
    result.residuals!.values.forEach((r, i) => {
      expect(r).toBe(
        result.comparison!.observed[i] - result.comparison!.predicted[i],
      )
      expect(r).toBe(-result.rows[i].at(-1)!)
    })
  })
  it('rejects measured-value leakage through a model helper', () => {
    expect(() =>
      solveOptimization({
        module: 'lsq',
        source: '[\nx y\n0 1\n1 3\n]\nh = y\nfit: y = a*x+h\na|1 0 4',
      }),
    ).toThrow('보조식')
  })
  it('supports helper dependency order and numeric slider overrides', () => {
    const result = solveOptimization({
      module: 'optimization',
      source: 'scale = base*2\nbase=3\nmin: scale*(x-2)^2\nx|0 -10 10',
      parameters: { base: 4 },
    })
    expect(result.status).toBe('converged')
    expect(result.values.x).toBeCloseTo(2, 5)
  })
  it('supports numbered reusable functions with ordinary objective syntax', () => {
    const result = solveOptimization({
      module: 'optimization',
      source: 'f1(x)=(x-2)^2\nmin: f1(x)\nx|0 -3 3',
    })
    expect(result.status).toBe('converged')
    expect(result.values.x).toBeCloseTo(2, 5)
  })
  it.each([
    'min: x^2\nx|2 0 1',
    'min: a*x\nx|0 -1 1',
    'min: x^2\nx|0 -1 1\na=b+1\nb=a+1',
    'min: ln(x)\nx|-1 -3 3',
    'min: x^2\nmin: x\nx|0 -1 1',
    'min: x^2\nx|0 -1 1\ny|0 -1 1',
  ])('rejects invalid or undefined models: %s', (source) => {
    expect(() =>
      solveOptimization({ module: 'optimization', source }),
    ).toThrow()
  })
  it('keeps a real iteration stop distinguishable from convergence', () => {
    const result = solveOptimization({
      module: 'optimization',
      source: 'min: 100*(y-x^2)^2+(1-x)^2\nx|-1.2 -3 3\ny|1 -2 4',
      options: { maxIterations: 1 },
    })
    expect(result.status).toBe('stopped')
  })
})
