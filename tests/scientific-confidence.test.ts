import { describe, expect, it } from 'vitest'
import { solveFitting } from '../src/engine/scientific/fitting'
import {
  coefficientConfidence95,
  studentTCritical95,
} from '../src/engine/scientific/statistics'

const table = (rows: number[][], header = 'x y') => `[
${header}
${rows.map((row) => row.join(' ')).join('\n')}
]`

describe('finite-sample Student-t confidence calculations', () => {
  // Independent reference: scipy.stats.t.ppf(0.975, df), SciPy 1.17.0.
  it.each([
    [1, 12.706204736174694],
    [2, 4.302652729749462],
    [5, 2.5705818356363146],
    [10, 2.228138851986274],
    [30, 2.0422724563012378],
    [100000, 1.9599877075346095],
  ])('matches an independent 95%% critical value at df=%s', (df, expected) => {
    expect(studentTCritical95(df)).toBeCloseTo(expected, 8)
  })
  it('uses the exact Cauchy quantile at one degree of freedom', () => {
    expect(studentTCritical95(1)).toBeCloseTo(1 / Math.tan(Math.PI * 0.025), 11)
  })
  it('rejects invalid degrees of freedom instead of substituting a normal quantile', () => {
    for (const df of [0, -1, NaN, Infinity])
      expect(() => studentTCritical95(df)).toThrow()
    expect(coefficientConfidence95(1, Infinity, 2)).toBeUndefined()
    expect(
      coefficientConfidence95(Number.MAX_VALUE, Number.MAX_VALUE, 2),
    ).toBeUndefined()
  })
})

describe('regression coefficient intervals', () => {
  it('matches closed-form line covariance and finite-sample confidence widths', () => {
    const noise = [0.1, -0.2, 0.3, -0.2, 0.1]
    const result = solveFitting({
      module: 'curve-fit',
      source:
        table(noise.map((error, x) => [x, 2 + 3 * x + error])) +
        '\npolyfit x y 1',
    })
    const variance = 0.188 / 3
    const expectedSE = [Math.sqrt(variance * 0.6), Math.sqrt(variance / 10)]
    const critical = 3.182446305284263
    expect(result.regression).toMatchObject({
      sampleCount: 5,
      parameterCount: 2,
      degreesOfFreedom: 3,
      rank: 2,
      confidenceMethod: 'linear-normal',
    })
    result.coefficients!.forEach((row, i) => {
      expect(row.estimate).toBeCloseTo(i === 0 ? 2.02 : 3, 12)
      expect(row.standardError).toBeCloseTo(expectedSE[i], 12)
      expect(row.confidence95!.halfWidth).toBeCloseTo(
        critical * expectedSE[i],
        10,
      )
      expect(row.confidence95!.lower).toBeCloseTo(
        row.estimate - critical * expectedSE[i],
        10,
      )
      expect(row.confidence95!.upper).toBeCloseTo(
        row.estimate + critical * expectedSE[i],
        10,
      )
    })
    expect(result.comparison!.observed).toHaveLength(5)
    expect(result.comparison!.predicted).toEqual(
      result.rows.map((row) => row.at(-2)),
    )
  })
  it('propagates the full polynomial covariance when moving from a centered basis', () => {
    const noise = [-0.2, 0.1, 0.3, -0.1, 0.1, 0.2, -0.4]
    const rows = noise.map((error, i) => {
      const u = i - 3
      return [1e6 + u, 2 + 3 * u + 0.5 * u * u + error]
    })
    const result = solveFitting({
      module: 'curve-fit',
      source: table(rows) + '\npolyfit x y 2',
    })
    // Independent NumPy least-squares at u=-3..3, covariance then transformed
    // with [[1,-M,M²],[0,1,-2M],[0,0,1]], M=10^6 (SciPy t(df=4)).
    const se = [22837292968.098713, 45674.585936328745, 0.022837292968155808]
    const halfWidths = [
      63406490277.24566, 126812.98055485592, 0.06340649027740418,
    ]
    result.coefficients!.forEach((row, i) => {
      expect(row.standardError! / se[i]).toBeCloseTo(1, 10)
      expect(row.confidence95!.halfWidth / halfWidths[i]).toBeCloseTo(1, 9)
    })
  })
  it('keeps fixed origin coefficients separate from estimated coefficients', () => {
    const result = solveFitting({
      module: 'curve-fit',
      source:
        table([
          [1, 2.1],
          [2, 3.9],
          [3, 6.2],
          [4, 7.8],
        ]) + '\npolyfit x y 1 origin',
    })
    expect(result.regression).toMatchObject({
      parameterCount: 1,
      degreesOfFreedom: 3,
      origin: true,
    })
    expect(result.coefficients![0]).toMatchObject({
      name: 'a0',
      estimate: 0,
      fixed: true,
    })
    expect(result.coefficients![0].confidence95).toBeUndefined()
    expect(result.coefficients![0].standardError).toBeUndefined()
    expect(result.coefficients![1].estimate).toBeCloseTo(1.99, 12)
    expect(result.coefficients![1].standardError).toBeCloseTo(
      Math.sqrt(0.097 / 90),
      12,
    )
    expect(result.coefficients![1].confidence95).toBeDefined()
  })
  it('does not create an interval without residual degrees of freedom', () => {
    const result = solveFitting({
      module: 'curve-fit',
      source:
        table([
          [0, 2],
          [1, 5],
        ]) + '\npolyfit x y 1',
    })
    expect(result.regression!.degreesOfFreedom).toBe(0)
    for (const row of result.coefficients!) {
      expect(row.standardError).toBeUndefined()
      expect(row.confidence95).toBeUndefined()
    }
    expect(result.regression!.confidenceUnavailableReason).toBeTruthy()
  })
  it('rejects unidentifiable coefficients rather than displaying spurious narrow intervals', () => {
    expect(() =>
      solveFitting({
        module: 'multilinear',
        source:
          table(
            [
              [1, 2, 1],
              [2, 4, 3],
              [3, 6, 6],
              [4, 8, 7],
            ],
            'x z y',
          ) + '\nmlinfit x z y',
      }),
    ).toThrow('독립적')
  })
  it('produces broad intervals for nearly collinear predictors instead of hiding sensitivity', () => {
    const rows = Array.from({ length: 14 }, (_, i) => {
      const x = i - 6
      const z = x + 1e-7 * Math.cos(i)
      return [x, z, 1 + 2 * x - 3 * z + 0.01 * Math.sin(i)]
    })
    const result = solveFitting({
      module: 'multilinear',
      source: table(rows, 'x z y') + '\nmlinfit x z y',
    })
    for (const name of ['b_x', 'b_z']) {
      const row = result.coefficients!.find((c) => c.name === name)!
      expect(row.standardError).toBeGreaterThan(1000)
      expect(row.confidence95!.halfWidth).toBeGreaterThan(1000)
    }
  })
  it('labels nonlinear intervals as local approximations and suppresses them at an active bound', () => {
    const rows = Array.from({ length: 12 }, (_, i) => {
      const x = 0.2 + i * 0.2
      return [x, (2.4 * x) / (0.7 + x) + 0.005 * Math.sin(i)]
    })
    const result = solveFitting({
      module: 'nonlinear-fit',
      source: table(rows) + '\nnlinfit y=a*x/(b+x)\nm(a)=2\nm(b)=1\nb(min)=0',
    })
    expect(result.status).toBe('converged')
    expect(result.regression!.confidenceMethod).toBe('nonlinear-local')
    for (const row of result.coefficients!)
      expect(row.confidence95!.halfWidth).toBeGreaterThan(0)
    const bounded = solveFitting({
      module: 'nonlinear-fit',
      source:
        table([
          [0, -1],
          [1, -1],
          [2, -1],
          [3, -1],
        ]) + '\nnlinfit y=a\nm(a)=1\na(min)=0',
    })
    expect(bounded.status).toBe('converged')
    expect(bounded.coefficients![0].confidence95).toBeUndefined()
    expect(bounded.regression!.confidenceUnavailableReason).toContain('경계')
  })
  it('does not publish intervals for a stopped nonlinear iteration', () => {
    const rows = Array.from({ length: 12 }, (_, i) => [
      i + 1,
      (3 * (i + 1)) / (0.7 + i + 1),
    ])
    const result = solveFitting({
      module: 'nonlinear-fit',
      source: table(rows) + '\nnlinfit y=a*x/(b+x)\nm(a)=.1\nm(b)=4',
      options: { maxIterations: 1, tolerance: 1e-12 },
    })
    expect(result.status).toBe('stopped')
    expect(
      result.coefficients!.every((c) => c.confidence95 === undefined),
    ).toBe(true)
  })
  it.each(['a+abs(a)', 'max(a,0)'])(
    'does not infer coefficient identification from a central secant at %s',
    (expression) => {
      const result = solveFitting({
        module: 'nonlinear-fit',
        source:
          table([
            [0, 1],
            [1, -1],
            [2, 1],
            [3, -1],
          ]) + `\nnlinfit y=${expression}\nm(a)=0`,
      })
      // At a=0 the central secant is nonzero, but all a<=0 have the same
      // predictions. A finite symmetric CI would invent identification.
      expect(result.status).toBe('converged')
      expect(result.coefficients![0].estimate).toBe(0)
      expect(result.coefficients![0].standardError).toBeUndefined()
      expect(result.coefficients![0].confidence95).toBeUndefined()
      expect(result.values.SE_a).toBeUndefined()
      expect(result.regression!.rank).toBeUndefined()
      expect(result.metrics.some((m) => m.label === 'Jacobian rank')).toBe(
        false,
      )
      expect(
        result.metrics.find((m) => m.label === 'Derivative regularity')?.value,
      ).toBe('Not verified')
      expect(result.coefficients![0].note).toContain('계수 식별')
    },
  )
  it('retains local intervals when only an earlier iterate needed a derivative fallback', () => {
    const result = solveFitting({
      module: 'nonlinear-fit',
      source:
        table([
          [0, 0.1],
          [1, 3.2],
          [2, 5.9],
          [3, 9.1],
        ]) + '\nnlinfit y=(a+abs(a))*x\nm(a)=0',
    })
    expect(result.status).toBe('converged')
    expect(result.coefficients![0].estimate).toBeGreaterThan(1)
    expect(result.coefficients![0].standardError).toBeGreaterThan(0)
    expect(result.coefficients![0].confidence95!.halfWidth).toBeGreaterThan(0)
    expect(result.regression!.rank).toBe(1)
    expect(result.warnings.join(' ')).toContain('일부 반복')
  })
})
