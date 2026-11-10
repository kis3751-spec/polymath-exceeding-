import type {
  ScientificOptions,
  ScientificResult,
} from '../engine/scientific/types'

const number = (value: number) =>
  !Number.isFinite(value)
    ? '—'
    : value === 0
      ? '0'
      : Number(value.toPrecision(8)).toString()

export function IntegralFormula({ result }: { result: ScientificResult }) {
  const integral = result.integration
  if (!integral) return null
  return (
    <div
      className="ivc-integral"
      aria-label={`Integral from ${integral.from} to ${integral.to} of ${integral.dependent} with respect to ${integral.independent} equals ${integral.value}`}
    >
      <span className="ivc-integral-sign" aria-hidden="true">
        <sup>{number(integral.to)}</sup>
        <span>∫</span>
        <sub>{number(integral.from)}</sub>
      </span>
      <span>
        {integral.dependent}({integral.independent}) d{integral.independent} ={' '}
        <strong>{number(integral.value)}</strong>
      </span>
    </div>
  )
}

const metricNames: Record<string, string> = {
  '완료한 시각': 'Final Time',
  '허용 오차': 'Tolerance',
  '최대 국소 오차 추정': 'Estimated Local Error',
  '승인 / 거부 스텝': 'Accepted / Rejected Steps',
  정적분: 'Integral',
  '사다리꼴 대비 차이': 'Interpolation Difference',
  '입력 데이터': 'Data Points',
  '그래프 샘플': 'Output Samples',
  '제곱 오차 합 SSE': 'SSE',
  '목적함수 최종값': 'Objective',
  '최대 제약 위반': 'Constraint Violation',
  '정규화 국소 정상성': 'Projected Gradient',
  '반복 횟수': 'Iterations',
}

function MetricTable({
  result,
  primary,
}: {
  result: ScientificResult
  primary: boolean
}) {
  const preferred =
    result.module === 'ode'
      ? ['완료한 시각', '허용 오차']
      : result.module === 'integration'
        ? ['사다리꼴 대비 차이', '입력 데이터']
        : result.module === 'lsq'
          ? ['제곱 오차 합 SSE', 'RMSE', '최대 제약 위반']
          : ['목적함수 최종값', '최대 제약 위반']
  const metrics = result.metrics.filter(
    (m) => preferred.includes(m.label) === primary && !/ 범위$/.test(m.label),
  )
  if (!metrics.length) return null
  return (
    <table className="ivc-output-table ivc-metrics-table">
      <thead>
        <tr>
          <th>Metric</th>
          <th>Value</th>
          <th>Interpretation</th>
        </tr>
      </thead>
      <tbody>
        {metrics.map((m) => (
          <tr key={m.label}>
            <th>{metricNames[m.label] ?? m.label}</th>
            <td>{typeof m.value === 'number' ? number(m.value) : m.value}</td>
            <td>
              <details>
                <summary>
                  이 지표 읽는 법<span className="sr-only"> {m.label}</span>
                </summary>
                <p>{m.detail}</p>
              </details>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Compact output keeps numerical claims supplied by the engine; display never upgrades estimates to bounds. */
export default function ScientificOutput({
  result,
  source,
  options,
}: {
  result: ScientificResult
  source: string
  options: ScientificOptions
}) {
  const ode = result.module === 'ode'
  const optimization =
    result.module === 'optimization' || result.module === 'lsq'
  const variables = Object.entries(result.values)
  const stateNames = result.series.map((s) => s.name)
  const initials = new Map(
    [
      ...source.matchAll(
        /^\s*([A-Za-z][A-Za-z0-9_]*)\s*\|\s*(\S+)\s+(\S+)\s+(\S+)\s*$/gm,
      ),
    ].map((m) => [m[1], m.slice(2)]),
  )
  return (
    <>
      {result.module === 'integration' ? (
        <IntegralFormula result={result} />
      ) : (
        result.formula && (
          <div className="science-formula">{result.formula}</div>
        )
      )}
      {ode ? (
        <>
          <div className="science-table-scroll">
            <table className="ivc-output-table ivc-state-table">
              <thead>
                <tr>
                  <th>Variable</th>
                  <th>Initial</th>
                  <th>Min</th>
                  <th>Max</th>
                  <th>Final Value</th>
                </tr>
              </thead>
              <tbody>
                {stateNames.map((name) => {
                  const index = result.columns.indexOf(name)
                  const values = result.rows
                    .map((row) => row[index])
                    .filter(Number.isFinite)
                  if (index < 0 || !values.length) return null
                  return (
                    <tr key={name}>
                      <th>{name}</th>
                      <td>{number(values[0])}</td>
                      <td>{number(Math.min(...values))}</td>
                      <td>{number(Math.max(...values))}</td>
                      <td className="ivc-result-value">
                        {number(values.at(-1)!)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <details className="science-help">
            <summary>Min / Max 읽는 법</summary>
            <p>
              Min과 Max는 출력한 샘플 지점의 최솟값과 최댓값입니다. 두 지점
              사이의 순간적인 극값을 모두 찾은 결과는 아닙니다. Initial은 시작
              상태, Final Value는 마지막으로 계산을 완료한 시점의 상태입니다.
              계산이 중단되면 요청한 종료 시점과 다를 수 있으므로 Final Time도
              확인하세요.
            </p>
          </details>
        </>
      ) : (
        result.module !== 'integration' && (
          <div className="science-table-scroll">
            <table className="ivc-output-table">
              <thead>
                <tr>
                  <th>Variable</th>
                  {optimization && (
                    <>
                      <th>Initial</th>
                      <th>Lower</th>
                      <th>Upper</th>
                    </>
                  )}
                  <th>{optimization ? 'Optimal Value' : 'Value'}</th>
                </tr>
              </thead>
              <tbody>
                {variables.map(([name, value]) => (
                  <tr key={name}>
                    <th>{name}</th>
                    {optimization &&
                      (initials.get(name) ?? ['—', '—', '—']).map((x, i) => (
                        <td key={i}>{x}</td>
                      ))}
                    <td className="ivc-result-value">{number(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
      <MetricTable result={result} primary />
      <details className="science-help ivc-report-details">
        <summary>Calculation Details</summary>
        <p>
          {result.method} · {result.durationMs.toFixed(2)} ms
          {result.iterations !== undefined
            ? ` · ${result.iterations} iterations`
            : ''}
          {result.evaluations !== undefined
            ? ` · ${result.evaluations} evaluations`
            : ''}
        </p>
        <MetricTable result={result} primary={false} />
        <pre>{JSON.stringify(options, null, 2)}</pre>
      </details>
    </>
  )
}
