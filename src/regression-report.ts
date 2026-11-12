import type { ScientificResult } from './engine/scientific/types'
const cell = (value: number | string | undefined) =>
  value === undefined
    ? 'Not available'
    : String(value)
        .replace(/\|/g, '\\|')
        .replace(/[\r\n]+/g, ' ')

/** Keep the downloadable report's residual sign and comparison scores identical
 * to the report on screen. Use full precision and preserve original row order. */
export function regressionReportSections(result: ScientificResult): string {
  const sections: string[] = []
  if (result.residuals && result.comparison) {
    sections.push(
      [
        '## Residuals · Observed − Predicted',
        'Original input row order; errors in the fitted dependent variable units. These are training residuals, not validation errors.',
        '| Row | Observed | Predicted | Residual |',
        '| --- | --- | --- | --- |',
        ...result.residuals.values.map(
          (v, i) =>
            `| ${i + 1} | ${cell(result.comparison!.observed[i])} | ${cell(result.comparison!.predicted[i])} | ${cell(v)} |`,
        ),
      ].join('\n'),
    )
  }
  if (result.polynomialComparison) {
    const comparison = result.polynomialComparison
    sections.push(
      [
        '## Polynomial degree comparison',
        `Same observations and dependent variable (${cell(comparison.dependent)}); ${comparison.origin ? 'through origin' : 'with intercept'}.`,
        comparison.recommendedDegree === undefined
          ? 'No LOOCV recommendation available.'
          : `Lowest LOOCV error among selected candidates: Degree ${comparison.recommendedDegree}. Numerical ties prefer the lower degree.`,
        '| Degree | Training RMSE | LOOCV RMSE | Adjusted R² | AIC | Status |',
        '| --- | --- | --- | --- | --- | --- |',
        ...comparison.candidates.map((c) => {
          const metric = (label: string) =>
            c.metrics?.find((m) => m.label === label)?.value
          return `| ${c.degree} | ${cell(metric('RMSE'))} | ${cell(c.crossValidation?.rmse)} | ${cell(metric('Adjusted R²'))} | ${cell(metric('AIC'))} | ${cell(c.reason ?? c.crossValidation?.unavailableReason ?? c.status)} |`
        }),
        'LOOCV uses PRESS residuals / (1 − leverage) for linear least squares. It is not independent external validation or an extrapolation guarantee. Rank loss, insufficient observations or numerical instability are not zero errors.',
      ].join('\n'),
    )
  }
  return sections.join('\n\n')
}
