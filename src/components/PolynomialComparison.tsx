import { useMemo, useState } from 'react'
import type { ScientificResult } from '../engine/scientific/types'
import ScientificChart from './ScientificChart'

const colors = [
  '#376eae',
  '#b37836',
  '#7961a8',
  '#368078',
  '#a85773',
  '#6c8039',
  '#2d4b73',
  '#97412a',
  '#565478',
  '#207254',
  '#a63e88',
  '#80621c',
]
const format = (v: number | string | undefined) =>
  v === undefined
    ? 'Not available'
    : typeof v === 'string'
      ? v
      : Number(v.toPrecision(6)).toString()
export default function PolynomialComparison({
  result,
  onCompare,
  onApply,
}: {
  result: ScientificResult
  onCompare: (degrees: number[]) => void
  onApply: (degree: number) => void
}) {
  const comparison = result.polynomialComparison
  const [degrees, setDegrees] = useState(
    () => comparison?.candidates.map((c) => c.degree) ?? [1, 2, 3, 4, 5],
  )
  const [view, setView] = useState('fits')
  const series = useMemo(() => {
    if (!comparison) return []
    const candidates = comparison.candidates.flatMap((c) => {
      const s = view === 'fits' ? c.curve : c.residuals
      return s ? [{ ...s, color: colors[c.degree - 1] }] : []
    })
    return view === 'fits'
      ? [{ ...comparison.observed, color: '#52616e' }, ...candidates]
      : candidates
  }, [comparison, view])
  return (
    <section
      className="regression-comparison regression-degree-comparison"
      aria-label="Polynomial degree comparison"
    >
      <div className="regression-section-heading">
        <h3>Compare Polynomial Degrees</h3>
        <span>Current degree: {result.regression?.degree}</span>
      </div>
      <p>
        같은 데이터·종속변수·Origin 조건으로 차수를 비교합니다. 차수 선택 후
        Compare Fits를 누르세요.
      </p>
      <fieldset className="regression-degree-picker">
        <legend>Degrees to compare</legend>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((d) => (
          <label key={d}>
            <input
              type="checkbox"
              checked={degrees.includes(d)}
              onChange={(e) =>
                setDegrees(
                  e.target.checked
                    ? [...degrees, d]
                    : degrees.filter((v) => v !== d),
                )
              }
            />
            Degree {d}
          </label>
        ))}
      </fieldset>
      <button
        type="button"
        className="regression-compare-button"
        disabled={degrees.length < 2}
        onClick={() => onCompare(degrees)}
      >
        Compare Fits
      </button>
      {degrees.length < 2 && <p>비교할 차수를 두 개 이상 선택하세요.</p>}
      {comparison && (
        <>
          {degrees
            .slice()
            .sort((a, b) => a - b)
            .join(',') !==
            comparison.candidates.map((c) => c.degree).join(',') && (
            <p role="status">
              선택한 차수가 바뀌었습니다. 아래는 이전 비교 결과입니다. Compare
              Fits로 갱신하세요.
            </p>
          )}
          <p className="regression-recommendation" role="status">
            {comparison.recommendedDegree === undefined
              ? 'LOOCV를 산정할 수 있는 후보가 없어 추천 차수를 표시하지 않았습니다.'
              : `Lowest LOOCV error: Degree ${comparison.recommendedDegree} · 선택한 후보 중 추천 (수치적으로 같은 점수이면 낮은 차수)`}
          </p>
          <div className="regression-table-scroll">
            <table className="regression-degree-table">
              <caption>
                Same-data model comparison ·{' '}
                {comparison.origin ? 'Through origin' : 'With intercept'}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Degree</th>
                  <th scope="col">Parameters</th>
                  <th scope="col">Training RMSE ↓</th>
                  <th scope="col">LOOCV RMSE ↓</th>
                  <th scope="col">Adjusted R² ↑</th>
                  <th scope="col">AIC ↓</th>
                  <th scope="col">Action / Status</th>
                </tr>
              </thead>
              <tbody>
                {comparison.candidates.map((c) => {
                  const metric = (label: string) =>
                    c.metrics?.find((m) => m.label === label)?.value
                  return (
                    <tr
                      key={c.degree}
                      data-recommended={
                        c.degree === comparison.recommendedDegree
                      }
                    >
                      <th scope="row">
                        <i
                          className="regression-degree-swatch"
                          style={{ background: colors[c.degree - 1] }}
                        />
                        Degree {c.degree}
                        {c.degree === comparison.recommendedDegree && (
                          <small>Lowest LOOCV</small>
                        )}
                      </th>
                      <td>{c.degree + (comparison.origin ? 0 : 1)}</td>
                      <td>{format(metric('RMSE'))}</td>
                      <td>
                        {format(c.crossValidation?.rmse)}
                        {c.crossValidation?.unavailableReason && (
                          <small>{c.crossValidation.unavailableReason}</small>
                        )}
                      </td>
                      <td>{format(metric('Adjusted R²'))}</td>
                      <td>{format(metric('AIC'))}</td>
                      <td>
                        {c.status === 'unavailable' ? (
                          <span>{c.reason}</span>
                        ) : c.degree === result.regression?.degree ? (
                          'Current fit'
                        ) : (
                          <button
                            type="button"
                            onClick={() => onApply(c.degree)}
                          >
                            Use Degree {c.degree}
                          </button>
                        )}
                        {!!c.warnings?.length && (
                          <details>
                            <summary>Warnings</summary>
                            {c.warnings.map((w) => (
                              <p key={w}>{w}</p>
                            ))}
                          </details>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div
            className="regression-view-switch"
            role="group"
            aria-label="Degree comparison plot"
          >
            <button
              type="button"
              aria-pressed={view === 'fits'}
              onClick={() => setView('fits')}
            >
              Fit Overlay
            </button>
            <button
              type="button"
              aria-pressed={view === 'residuals'}
              onClick={() => setView('residuals')}
            >
              Residual Overlay
            </button>
          </div>
          <ScientificChart
            series={series}
            xLabel={comparison.independent}
            yLabel={
              view === 'fits'
                ? comparison.dependent
                : `Residual (${comparison.dependent})`
            }
            zeroLine={view === 'residuals'}
          />
          <details className="regression-help">
            <summary>Choosing a degree · LOOCV, overfitting and limits</summary>
            <p>
              LOOCV RMSE는 각 관측을 한 행씩 빼고 그 점을 예측한 오차의
              제곱평균제곱근입니다. 선형 최소제곱의 PRESS 공식으로 계산합니다.
              작은 값이 같은 데이터의 후보 사이에서 선호됩니다. 훈련 RMSE만 보고
              차수를 높이면 과적합할 수 있으므로 LOOCV와 잔차 패턴을 함께
              확인하세요. 수치 반올림 수준에서 같은 점수는 더 낮은 차수를
              추천합니다.
            </p>
            <p>
              차수 비교는 선택한 후보에 한합니다. 관측 수 부족·랭크 부족은 실패
              이유를 표시하고, 행 제외 시 불안정하거나 자유도가 없으면 LOOCV를
              비워 둡니다. AIC·Adjusted R²도 산정할 수 없으면 표시하지 않습니다.
              LOOCV는 외부 검증 데이터나 외삽 정확도 보장이 아니며, 시간·그룹
              상관 데이터에서는 별도의 블록·그룹 검증이 필요합니다. Through
              Origin 조건과 보조식은 모든 후보에 동일하게 적용됩니다.
            </p>
            <p>
              Use Degree는 실제 Input의 polyfit 차수를 바꾸고 현재
              계수·Simulation·Report를 다시 계산합니다. 비교 그래프의 범례를
              눌러 곡선을 숨길 수 있으며 같은 차수는 두 그림에서 같은 색을
              사용합니다.
            </p>
          </details>
        </>
      )}
    </section>
  )
}
