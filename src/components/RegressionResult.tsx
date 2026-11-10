import { useMemo } from 'react'
import type { ScientificResult } from '../engine/scientific/types'
import ScientificChart from './ScientificChart'
import './RegressionResult.css'

const format = (value: number | string) => {
  if (typeof value === 'string') return value
  if (!Number.isFinite(value)) return 'Not available'
  if (value === 0) return '0'
  return Math.abs(value) < 1e-4 || Math.abs(value) >= 1e7
    ? value.toExponential(5)
    : Number(value.toPrecision(8)).toString()
}

export default function RegressionResult({
  result,
}: {
  result: ScientificResult
}) {
  const regression = result.regression
  const primary = result.metrics.filter(
    (m) => m.label === 'RMSE' || m.label === 'R²',
  )
  const diagnostics = result.metrics.filter(
    (m) => m.label !== 'RMSE' && m.label !== 'R²',
  )
  const comparison = useMemo(
    () =>
      result.comparison
        ? [
            {
              name: 'Fitted observations',
              x: result.comparison.observed,
              y: result.comparison.predicted,
              style: 'points' as const,
            },
          ]
        : [],
    [result.comparison],
  )
  const nonlinear = regression?.confidenceMethod === 'nonlinear-local'
  return (
    <div className="regression-result">
      <div className="regression-output-heading">
        <h2>Regression output</h2>
        <span
          className={
            result.status === 'stopped'
              ? 'regression-status stopped'
              : 'regression-status'
          }
        >
          {result.status === 'stopped' ? 'Stopped' : 'Fit completed'}
        </span>
      </div>
      {result.message && result.status === 'stopped' && (
        <p className="regression-stop">{result.message}</p>
      )}
      {regression?.model && (
        <p className="regression-model">
          <code>{regression.model}</code>
        </p>
      )}
      <div className="regression-primary">
        {primary.map((metric) => (
          <div key={metric.label}>
            <span>{metric.label}</span>
            <strong>{format(metric.value)}</strong>
          </div>
        ))}
        {regression && (
          <div>
            <span>Observations / Parameters</span>
            <strong>
              {regression.sampleCount} / {regression.parameterCount}
            </strong>
          </div>
        )}
      </div>
      <details className="regression-help">
        <summary>RMSE · R²를 어떻게 읽나요?</summary>
        <p>
          <strong>RMSE</strong>는 입력한 데이터에서 모델의 예측이 관측값과 보통
          얼마나 떨어지는지 나타냅니다. 종속변수와 단위가 같습니다. 예를 들어
          압력의 RMSE가 2 kPa이면, 적합한 데이터에서 오차의 대표적인 크기가 약 2
          kPa라는 뜻입니다. 미래의 측정값도 항상 이 범위에 들어간다는 의미는
          아닙니다.
        </p>
        <p>
          <strong>R²</strong>는 관측값의 평균 하나만 쓰는 방법에 비해 제곱오차를
          줄인 비율입니다. 1이면 입력 데이터와 정확히 일치하고, 0이면 평균만
          쓰는 것과 같은 수준입니다. 음수이면 그보다도 나쁩니다. 관측값이 모두
          같으면 비교 기준의 변동이 없어 정의하지 않습니다.
        </p>
        <p>
          RMSE는 같은 종속변수·단위에서 비교하세요. R²가 높아도 잘못된 물리
          모델일 수 있고, 데이터가 없는 범위의 예측은 나쁠 수 있습니다. 여기의
          RMSE와 R²는 적합에 사용한 데이터의 결과이며 별도의 검증 데이터 점수는
          아닙니다. <strong>Observations / Parameters</strong>는 관측 행 수와
          실제로 추정한 계수 수입니다.
        </p>
      </details>
      <div className="regression-table-scroll">
        <table className="regression-coefficients">
          <caption>
            Coefficients{nonlinear ? ' · Local approximation' : ''}
          </caption>
          <thead>
            <tr>
              <th scope="col">Coefficient</th>
              <th scope="col">Estimate</th>
              <th scope="col">95% CI</th>
            </tr>
          </thead>
          <tbody>
            {result.coefficients?.map((coefficient) => (
              <tr key={coefficient.name}>
                <th scope="row">
                  <code>{coefficient.name}</code>
                  {coefficient.fixed && <small>Fixed</small>}
                </th>
                <td>{format(coefficient.estimate)}</td>
                <td>
                  {coefficient.confidence95 ? (
                    <>
                      <span>
                        [{format(coefficient.confidence95.lower)},{' '}
                        {format(coefficient.confidence95.upper)}]
                      </span>
                      <small>
                        ± {format(coefficient.confidence95.halfWidth)}
                      </small>
                    </>
                  ) : coefficient.fixed ? (
                    'Fixed by model'
                  ) : (
                    <details className="regression-inline-help">
                      <summary>Not estimated</summary>
                      <p>
                        {coefficient.note ??
                          '현재 결과에서 유효한 구간을 계산하지 못했습니다.'}
                      </p>
                    </details>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {regression?.confidenceUnavailableReason && (
        <p className="regression-confidence-note">
          {regression.confidenceUnavailableReason}
        </p>
      )}
      <details className="regression-help">
        <summary>Estimate · 95% CI · Standard Error 읽는 법</summary>
        <p>
          <strong>Estimate</strong>는 현재 관측 데이터에 가장 잘 맞도록 찾은
          계수 값입니다. <strong>95% CI (Confidence Interval)</strong>는 같은
          측정 조건과 같은 회귀 방법으로 데이터를 반복해서 얻었을 때, 그렇게
          만든 구간의 약 95%가 고정된 실제 계수를 포함하도록 설계한 구간입니다.
          실제 계수가 이 한 구간에 있을 확률이 95%라는 뜻이나, 예측의 95%가
          맞는다는 뜻은 아닙니다.
        </p>
        <p>
          표의 대괄호는 아래쪽·위쪽 끝값이고, <strong>±</strong>는 Estimate에서
          끝값까지의 거리입니다. 구간이 넓으면 현재 데이터로 해당 계수를
          정밀하게 정하기 어렵다는 뜻입니다. 0을 포함하면 다른 계수를 함께
          추정한 이 모델에서 그 계수가 0인 경우를 양측 5% 검정으로 배제하지
          못합니다. 불필요한 변수라고 자동으로 결론 내릴 수는 없습니다.
        </p>
        <p>
          <strong>Standard Error (SE)</strong>는 반복 측정 시 계수 추정값이
          얼마나 흔들릴지 추정한 표준편차입니다. 95% CI의 반폭은 Student-t
          임계값 × SE입니다. 데이터 수에서 추정한 계수 수를 뺀{' '}
          <strong>Degrees of freedom</strong>이 작으면 1.96보다 큰 임계값을 써서
          구간을 더 넓게 만듭니다. SE 값은 아래 Diagnostics에서 확인할 수
          있습니다.
        </p>
        <p>
          이 구간은 설명변수를 오차 없는 고정값으로 보고, 관측 오차가 서로
          독립이며 같은 분산을 갖는 정규분포라는 통계 모델을 가정합니다.
          선형·다항·다중선형 회귀는 선택한 모델이 맞다는 가정 아래의 구간입니다.
          각 계수마다 95%인 구간이며, 모든 계수가 동시에 포함될 확률을 95%로
          맞춘 구간은 아닙니다. 측정 장치의 오차, 변수 누락, 외삽 오차를 모두
          합친 보장도 아닙니다.
        </p>
        {nonlinear && (
          <p>
            <strong>Nonlinear regression</strong>에서는 수렴한 위치에서 모델을
            국소 선형화해 SE와 95% CI를 근사합니다. 적은 데이터, 큰 비선형성
            또는 나쁜 초기값에서는 구간이 부정확할 수 있습니다. 국소 최소값이며
            전역 최적을 보장하지 않습니다. 경계에 놓인 계수, 랭크 부족, 자유도
            부족 또는 수렴하지 않은 결과에는 일반적인 대칭 CI를 표시하지
            않습니다.
          </p>
        )}
        {regression?.origin && (
          <p>
            <strong>Origin</strong> 조건은 모델이 원점을 지나도록 강제합니다.
            이때 고정된 0은 데이터로 추정한 계수가 아니므로 CI를 붙이지
            않습니다. Origin을 강제한 모델도 R²는 관측 평균을 기준으로
            계산합니다.
          </p>
        )}
        <p>
          동일 데이터가 모델에 정확히 들어맞으면 SE와 구간 폭이 매우 작거나 0이
          될 수 있습니다. 측정이 완벽하다는 증거는 아니며, 데이터에 드러나지
          않은 오차는 반영하지 못합니다. 종속변수를 log 등으로 변환했다면 회귀
          오차와 통계 가정도 변환한 값의 단위에 적용됩니다.
        </p>
      </details>
      {comparison.length > 0 && (
        <section className="regression-comparison">
          <h3>Observed vs Predicted</h3>
          <ScientificChart
            series={comparison}
            xLabel={`Observed ${result.comparison?.dependent ?? ''}`}
            yLabel={`Predicted ${result.comparison?.dependent ?? ''}`}
            identityLine
          />
          <details className="regression-help">
            <summary>이 그래프로 무엇을 확인하나요?</summary>
            <p>
              가로축은 관측값, 세로축은 같은 행에 대한 모델의 예측값입니다. 기준
              대각선은 관측값과 예측값이 같은 위치입니다. 점이 선 위에 있으면
              과대 예측, 아래에 있으면 과소 예측입니다. 한쪽으로 휘거나 특정
              값에서만 오차가 커지는지 살펴보세요. 이 점들은 적합에 사용한
              데이터이며, 계수의 95% CI나 미래 관측값의 Prediction Interval을
              나타내는 그림은 아닙니다.
            </p>
          </details>
        </section>
      )}
      <details className="regression-diagnostics">
        <summary>Diagnostics · Calculation details</summary>
        <dl className="regression-run-details">
          <dt>Method</dt>
          <dd>{result.method}</dd>
          <dt>Status</dt>
          <dd>{result.status}</dd>
          <dt>Duration</dt>
          <dd>{format(result.durationMs)} ms</dd>
        </dl>
        {result.message && <p>{result.message}</p>}
        <div className="regression-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
                <th>Interpretation</th>
              </tr>
            </thead>
            <tbody>
              {diagnostics.map((metric) => (
                <tr key={metric.label}>
                  <th scope="row">{metric.label}</th>
                  <td>{format(metric.value)}</td>
                  <td>{metric.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="regression-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Coefficient</th>
                <th>Standard Error</th>
              </tr>
            </thead>
            <tbody>
              {result.coefficients
                ?.filter((row) => !row.fixed)
                .map((row) => (
                  <tr key={row.name}>
                    <th scope="row">{row.name}</th>
                    <td>
                      {row.standardError === undefined
                        ? 'Not estimated'
                        : format(row.standardError)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <details className="regression-help">
          <summary>Rank · Condition number의 차이</summary>
          <p>
            <strong>Rank</strong>는 데이터가 계수들을 서로 구분할 수 있는지
            확인합니다. 예를 들어 설명변수 두 열이 항상 정확히 두 배 관계라면 두
            계수의 개별 효과를 구분하기 어렵습니다.{' '}
            <strong>Condition number</strong>는 입력을 조금 바꿨을 때 계산이
            얼마나 민감해질 수 있는지를 보여주는 수치 진단이며, 이 보고서에서는
            정규화한 설계행렬을 사용합니다. 실제 측정 오차의 크기를 추정하는
            SE나 통계적 CI와 목적이 다릅니다. 조건수가 작아도 관측 오차가 크거나
            모델이 틀리면 좋은 예측을 보장하지 않습니다.
          </p>
          <p>
            SE와 95% CI는 SVD에서 구한 공분산을 사용합니다. 다항식의 표시 계수는
            원래 x의 거듭제곱으로 변환하면서 계수 사이의 공분산도 함께
            반영합니다. 큰 좌표 오프셋에서 펼친 식은 숫자의 상쇄에 민감하므로
            아래의 정규화된 Prediction formula와 그래프가 계산에 사용한
            표현입니다.
          </p>
        </details>
        {result.formula && (
          <details className="regression-help">
            <summary>Prediction formula</summary>
            <code className="regression-full-formula">{result.formula}</code>
          </details>
        )}
        {result.warnings.length > 0 && (
          <details className="regression-help">
            <summary>Assumptions · Warnings ({result.warnings.length})</summary>
            <ul>
              {result.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </details>
        )}
      </details>
    </div>
  )
}
