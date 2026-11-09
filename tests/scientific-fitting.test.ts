import { describe, expect, it } from 'vitest'
import { solveFitting } from '../src/engine/scientific/fitting'
import { fittingExamples } from '../src/engine/scientific/fitting-examples'

const table = (header: string, rows: number[][]) =>
  `[\n${header}\n${rows.map((r) => r.join(' ')).join('\n')}\n]`

describe('scientific linear and polynomial regression', () => {
  it('recovers an exact line and reports interpretable data errors', () => {
    const result = solveFitting({
      module: 'curve-fit',
      source:
        table('x y', [
          [0, 2],
          [1, 5],
          [2, 8],
          [3, 11],
          [4, 14],
        ]) + '\npolyfit x y 1',
    })
    expect(result.values.a0).toBeCloseTo(2, 12)
    expect(result.values.a1).toBeCloseTo(3, 12)
    expect(result.metrics.find((m) => m.label === 'R²')?.value).toBeCloseTo(
      1,
      12,
    )
    for (const row of result.rows) expect(row.at(-1)).toBeCloseTo(0, 12)
    expect(result.series[1].x).toHaveLength(201)
    expect(result.status).toBe('completed')
  })
  it('uses normalized predictions at a very large coordinate offset', () => {
    const rows = Array.from({ length: 11 }, (_, i) => {
      const x = 1e9 + i
      return [x, 2 + 3 * i + 0.25 * i * i]
    })
    const result = solveFitting({
      module: 'curve-fit',
      source: table('x y', rows) + '\npolyfit x y 2',
    })
    for (const row of result.rows)
      expect(Math.abs(row.at(-1)!)).toBeLessThan(1e-10)
    expect(result.warnings.join(' ')).toContain('정규화')
  })
  it('fits known polynomial coefficients with noisy data and nonzero degrees of freedom', () => {
    const rows = Array.from({ length: 9 }, (_, i) => {
      const x = i - 4
      return [x, 1 - 2 * x + 0.5 * x * x + (i % 2 ? 0.01 : -0.01)]
    })
    const result = solveFitting({
      module: 'curve-fit',
      source: table('x y', rows) + '\npolyfit x y 2',
    })
    expect(result.values.a0).toBeCloseTo(1, 2)
    expect(result.values.a1).toBeCloseTo(-2, 10)
    expect(result.values.a2).toBeCloseTo(0.5, 3)
    expect(result.values.SE_a0).toBeGreaterThan(0)
  })
  it('fits an origin-constrained line', () => {
    const result = solveFitting({
      module: 'curve-fit',
      source:
        table('x y', [
          [1, 2],
          [2, 4],
          [3, 6],
          [4, 8],
        ]) + '\npolyfit x y 1 origin',
    })
    expect(result.values.a0).toBe(0)
    expect(result.values.a1).toBeCloseTo(2, 12)
  })
  it('fits independent multi-linear predictors without a normal equation', () => {
    const rows = Array.from({ length: 12 }, (_, i) => {
      const x = i - 5,
        z = (i % 3) - 1
      return [x, z, 2 + 3 * x - 4 * z]
    })
    const result = solveFitting({
      module: 'multilinear',
      source: table('x z y', rows) + '\nmlinfit x z y',
    })
    expect(result.values.intercept).toBeCloseTo(2, 12)
    expect(result.values.b_x).toBeCloseTo(3, 12)
    expect(result.values.b_z).toBeCloseTo(-4, 12)
  })
  it('rejects rank-deficient and invalid coefficient choices', () => {
    const src = table('x z y', [
      [1, 2, 3],
      [2, 4, 5],
      [3, 6, 7],
      [4, 8, 9],
    ])
    expect(() =>
      solveFitting({ module: 'multilinear', source: src + '\nmlinfit x z y' }),
    ).toThrow('독립적')
    expect(() =>
      solveFitting({ module: 'curve-fit', source: src + '\npolyfit x y 2.5' }),
    ).toThrow('정수')
    expect(() =>
      solveFitting({ module: 'curve-fit', source: src + '\npolyfit x y 12' }),
    ).toThrow('데이터')
  })
  it('uses topological helpers and externally adjusted numeric constants', () => {
    const result = solveFitting({
      module: 'curve-fit',
      source:
        table('x y', [
          [1, 3],
          [2, 5],
          [3, 7],
          [4, 9],
        ]) + '\nu = k*x\nk = 1\npolyfit u y 1',
      parameters: { k: 2 },
    })
    expect(result.values.a0).toBeCloseTo(1, 12)
    expect(result.values.a1).toBeCloseTo(1, 12)
  })
})

describe('scientific nonlinear fitting', () => {
  const data = Array.from({ length: 16 }, (_, i) => {
    const x = 0.1 + 0.2 * i
    return [x, (2.4 * x) / (0.7 + x)]
  })
  it('recovers independently generated Michaelis–Menten coefficients', () => {
    const result = solveFitting({
      module: 'nonlinear-fit',
      source:
        table('x y', data) +
        '\nnlinfit y = a*x/(b+x)\nm(a)=1\nm(b)=1\nb(min)=0',
    })
    expect(result.status).toBe('converged')
    expect(result.values.a).toBeCloseTo(2.4, 6)
    expect(result.values.b).toBeCloseTo(0.7, 6)
    expect(result.values.SE_a).toBeDefined()
    for (const row of result.rows)
      expect(Math.abs(row.at(-1)!)).toBeLessThan(1e-7)
  })
  it('accepts numbered function definitions consistent with Equation Solver', () => {
    const result = solveFitting({
      module: 'nonlinear-fit',
      source:
        table('x y', [
          [0, 1],
          [1, 3],
          [2, 5],
          [3, 7],
          [4, 9],
        ]) + '\nf1(x)=a*x+b\nnlinfit y=f1(x)\nm(a)=0.5\nm(b)=0.5',
    })
    expect(result.status).toBe('converged')
    expect(result.values.a).toBeCloseTo(2, 6)
    expect(result.values.b).toBeCloseTo(1, 6)
  })
  it('reports stopped when the iteration budget does not reach convergence', () => {
    const result = solveFitting({
      module: 'nonlinear-fit',
      source: table('x y', data) + '\nnlinfit y = a*x/(b+x)\nm(a)=0.1\nm(b)=4',
      options: { maxIterations: 1, tolerance: 1e-12 },
    })
    expect(result.status).toBe('stopped')
    expect(result.warnings.join(' ')).toContain('반복')
  })
  it('does not claim identifiable coefficients for redundant nonlinear parameters', () => {
    const result = solveFitting({
      module: 'nonlinear-fit',
      source:
        table('x y', [
          [0, 0],
          [1, 2],
          [2, 4],
          [3, 6],
        ]) + '\nnlinfit y=(a+b)*x\nm(a)=1\nm(b)=1',
    })
    expect(result.status).toBe('stopped')
    expect(result.values.SE_a).toBeUndefined()
  })
  it('rejects missing guesses, data leakage and invalid initial domains', () => {
    const src = table('x y', data)
    expect(() =>
      solveFitting({
        module: 'nonlinear-fit',
        source: src + '\nnlinfit y=a*x/(b+x)\nm(a)=1',
      }),
    ).toThrow('일치')
    expect(() =>
      solveFitting({
        module: 'nonlinear-fit',
        source: src + '\nnlinfit y=a*y\nm(a)=1',
      }),
    ).toThrow('종속변수')
    expect(() =>
      solveFitting({
        module: 'nonlinear-fit',
        source: src + '\nnlinfit y=sqrt(a)*x\nm(a)=-1',
      }),
    ).toThrow()
  })
})

it('rejects a dependent variable hidden in a helper expression', () => {
  const source =
    table('x y', [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ]) + '\nh = y\nnlinfit y = a*h\nm(a)=1'
  expect(() => solveFitting({ module: 'nonlinear-fit', source })).toThrow(
    '종속변수',
  )
})
it('recognizes a box-constrained nonlinear optimum without inventing symmetric errors', () => {
  const result = solveFitting({
    module: 'nonlinear-fit',
    source:
      table('x y', [
        [0, -1],
        [1, -1],
        [2, -1],
        [3, -1],
      ]) + '\nnlinfit y=a\nm(a)=1\na(min)=0',
  })
  expect(result.status).toBe('converged')
  expect(result.values.a).toBe(0)
  expect(result.values.SE_a).toBeUndefined()
  expect(result.warnings.join(' ')).toContain('경계')
})

it.each(fittingExamples)(
  'runs the supplied $title example with finite displayed results',
  (example) => {
    const result = solveFitting({
      module: example.module,
      source: example.source,
    })
    expect(['converged', 'completed']).toContain(result.status)
    expect(result.rows.flat().every(Number.isFinite)).toBe(true)
    expect(
      result.series.every((series) =>
        [...series.x, ...series.y].every(Number.isFinite),
      ),
    ).toBe(true)
  },
)
