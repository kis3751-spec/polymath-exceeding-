import { useMemo, useState } from 'react'
import type { ScientificResult } from '../engine/scientific/types'
import ScientificChart from './ScientificChart'
import './RegressionResult.css'

export default function RegressionResidualPlot({
  result,
}: {
  result: ScientificResult
}) {
  const [against, setAgainst] = useState('fitted')
  const residuals = result.residuals
  const data = result.comparison
  const predictor = residuals?.predictors[Number(against.split(':')[1])]
  const xLabel =
    against === 'row'
      ? 'Observation row'
      : predictor
        ? predictor.name
        : `Predicted ${data?.dependent ?? ''}`
  const series = useMemo(
    () =>
      residuals && data
        ? [
            {
              name: 'Residuals',
              style: 'points' as const,
              y: residuals.values,
              x:
                against === 'row'
                  ? residuals.values.map((_, i) => i + 1)
                  : (predictor?.values ?? data.predicted),
            },
          ]
        : [],
    [residuals, data, against, predictor],
  )
  if (!residuals || !data) return null
  return (
    <section
      className="regression-comparison regression-residuals"
      aria-label="Residual plot"
    >
      <div className="regression-section-heading">
        <h3>Residual Plot</h3>
        <label>
          Plot residuals against
          <select
            aria-label="Plot residuals against"
            value={against}
            onChange={(e) => setAgainst(e.target.value)}
          >
            <option value="fitted">Predicted value</option>
            <option value="row">Observation row</option>
            {residuals.predictors.map((p, i) => (
              <option key={p.name} value={`predictor:${i}`}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p>
        Residual = Observed − Predicted · {residuals.values.length} observations
      </p>
      {result.status === 'stopped' && (
        <p className="regression-stop">
          마지막 유효 반복의 잔차입니다. 수렴한 적합으로 해석하지 마세요.
        </p>
      )}
      <ScientificChart
        series={series}
        xLabel={xLabel}
        yLabel={`Residual (${data.dependent})`}
        zeroLine
      />
      <details className="regression-help">
        <summary>How to read residuals</summary>
        <p>
          0 기준선 위의 점은 모델이 낮게 예측한 관측, 아래의 점은 높게 예측한
          관측입니다. 0 주위에 고르게 섞이는지 보세요. 휘어진 패턴은 빠진 곡률,
          부채꼴은 일정하지 않은 오차 분산, 행 순서에 따른 패턴은 오차의 상관
          가능성을 시사합니다. 패턴만으로 원인을 확정할 수는 없습니다.
        </p>
        <p>
          예측값·각 설명변수·관측 행 번호를 바꿔 확인할 수 있습니다. 행 번호는
          원래 입력 순서이며 시간으로 가정하지 않습니다. 이 잔차는 적합에 사용한
          데이터의 오차이고, 표준화 잔차나 별도 검증 데이터의 예측 오차는
          아닙니다. 변환한 종속변수를 적합했다면 잔차도 그 단위입니다.
        </p>
      </details>
    </section>
  )
}
