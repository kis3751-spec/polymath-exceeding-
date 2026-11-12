import { describe, expect, it } from 'vitest'
import { solveFitting } from '../src/engine/scientific/fitting'
import { fittingExamples } from '../src/engine/scientific/fitting-examples'
import { regressionReportSections } from '../src/regression-report'
const table = (rows: number[][]) =>
  `[\nx y\n${rows.map((r) => r.join(' ')).join('\n')}\n]`
const rows = Array.from({ length: 11 }, (_, i) => [
  i - 5,
  2 + 0.3 * (i - 5) + 0.7 * (i - 5) ** 2 + (i % 2 ? 0.12 : -0.09),
])
const fit = (
  data: number[][],
  degree: number,
  origin = false,
  compareDegrees?: number[],
) =>
  solveFitting({
    module: 'curve-fit',
    source: table(data) + `\npolyfit x y ${degree}${origin ? ' origin' : ''}`,
    options: { compareDegrees },
  })
describe('residual reports and polynomial comparison', () => {
  it('matches PRESS leave-one-out scores to independent omitted-row refits, including origin constraints', () => {
    for (const origin of [false, true]) {
      const result = fit(rows, 2, origin, [1, 2, 3])
      for (const c of result.polynomialComparison!.candidates) {
        const errors = rows.map(([x, y], i) => {
          const omitted = fit(
            rows.filter((_, j) => j !== i),
            c.degree,
            origin,
          )
          const prediction = Array.from(
            { length: c.degree + 1 },
            (_, k) => omitted.values[`a${k}`] * x ** k,
          ).reduce((a, b) => a + b, 0)
          return y - prediction
        })
        const rmse = Math.hypot(...errors) / Math.sqrt(rows.length)
        expect(c.crossValidation!.rmse).toBeCloseTo(rmse, 10)
        expect(c.residuals!.x).toEqual(rows.map((r) => r[0]))
      }
    }
  })
  it('recommends a curved model by validation error and preserves active fit and source', () => {
    const result = fit(rows, 1, false, [5, 2, 1, 2, 3])
    expect(result.regression!.degree).toBe(1)
    expect(
      result.polynomialComparison!.candidates.map((c) => c.degree),
    ).toEqual([1, 2, 3, 5])
    expect(result.polynomialComparison!.recommendedDegree).toBe(2)
    expect(result.residuals!.values).toEqual(result.rows.map((r) => r.at(-1)))
    expect(
      result.polynomialComparison!.candidates.every(
        (c) => c.curve!.x.length === 201,
      ),
    ).toBe(true)
  })
  it('prefers the lower degree for exact-fit roundoff ties and handles constant observed values', () => {
    const line = Array.from({ length: 10 }, (_, i) => [i, 2 + 3 * i])
    expect(
      fit(line, 1, false, [1, 2, 3, 4]).polynomialComparison!.recommendedDegree,
    ).toBe(1)
    const parabola = [-2, -1, 0, 1, 2, 3].map((x) => [x, 1 + x * x])
    expect(
      fit(parabola, 1, false, [1, 2, 3]).polynomialComparison!
        .recommendedDegree,
    ).toBe(2)
    const constant = fit(
      line.map(([x]) => [x, 3]),
      1,
      false,
      [1, 2, 3],
    )
    expect(constant.polynomialComparison!.recommendedDegree).toBe(1)
    expect(constant.metrics.find((m) => m.label === 'R²')?.value).toBe(
      '정의되지 않음',
    )
  })
  it('keeps failed degrees and unavailable validation scores explicit', () => {
    const result = fit(
      [
        [0, 1],
        [1, 2],
        [2, 5],
      ],
      1,
      false,
      [1, 2, 3],
    )
    const candidates = result.polynomialComparison!.candidates
    expect(candidates[0].crossValidation!.rmse).toBeTypeOf('number')
    expect(candidates[1].status).toBe('completed')
    expect(candidates[1].crossValidation!.rmse).toBeUndefined()
    expect(candidates[1].crossValidation!.unavailableReason).toContain('관측')
    expect(candidates[2].status).toBe('unavailable')
    expect(candidates[2].reason).toContain('데이터')
    const leverage = fit(
      [
        [0, 1],
        [0, 1.1],
        [1, 2],
      ],
      1,
      false,
      [1, 2],
    )
    expect(leverage.polynomialComparison!.recommendedDegree).toBeUndefined()
    expect(
      leverage.polynomialComparison!.candidates[0].crossValidation!
        .unavailableReason,
    ).toContain('랭크')
    expect(leverage.polynomialComparison!.candidates[1].status).toBe(
      'unavailable',
    )
  })
  it('keeps normalized predictions stable at large offsets and applies helper parameters identically', () => {
    const shifted = fit(
      rows.map(([x, y]) => [1e9 + x, y]),
      1,
      false,
      [1, 2, 3],
    )
    expect(shifted.polynomialComparison!.recommendedDegree).toBe(2)
    const result = solveFitting({
      module: 'curve-fit',
      source: table(rows) + '\nu=k*x\nk=1\npolyfit u y 1 origin',
      parameters: { k: 2 },
      options: { compareDegrees: [1, 2] },
    })
    expect(result.polynomialComparison!.independent).toBe('u')
    expect(result.polynomialComparison!.origin).toBe(true)
    expect(result.polynomialComparison!.observed.x).toEqual(
      rows.map(([x]) => 2 * x),
    )
  })
  it('rejects unbounded, fractional and out-of-range candidate lists', () => {
    for (const degrees of [[0, 1], [1.5, 2], [1, 13], Array(13).fill(1), [NaN]])
      expect(() => fit(rows, 1, false, degrees)).toThrow('차수')
  })
  it('reports observation-minus-prediction residuals in original row order for every regression module', () => {
    for (const example of fittingExamples) {
      const result = solveFitting({
        module: example.module,
        source: example.source,
      })
      expect(result.residuals!.values).toHaveLength(
        result.comparison!.observed.length,
      )
      result.residuals!.values.forEach((r, i) =>
        expect(r).toBeCloseTo(
          result.comparison!.observed[i] - result.comparison!.predicted[i],
          12,
        ),
      )
      for (const predictor of result.residuals!.predictors)
        expect(predictor.values).toHaveLength(result.rows.length)
    }
  })
  it('exports full-precision residuals and the same comparison scores, including unavailable reasons', () => {
    const result = fit(
      [
        [0, 1],
        [1, 2],
        [2, 5],
      ],
      1,
      false,
      [1, 2, 3],
    )
    const md = regressionReportSections(result)
    expect(md).toContain('## Residuals · Observed − Predicted')
    expect(md).toContain(
      `| 1 | 1 | ${result.comparison!.predicted[0]} | ${result.residuals!.values[0]} |`,
    )
    expect(md).toContain('## Polynomial degree comparison')
    expect(md).toContain('LOOCV RMSE')
    expect(md).toContain(result.polynomialComparison!.candidates[2].reason!)
  })
})
