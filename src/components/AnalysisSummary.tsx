import { useMemo, useState } from 'react'
import type { BranchTerminalEvent, SearchSummary, SolveResult } from '../engine'
import {
  coveragePercent,
  reportDiagnostics,
  searchConclusion,
} from '../engine/report-diagnostics'
import { eventLocation, uniqueBranchEvents } from '../engine/branch-events'
import CertificationReport from './CertificationReport'
import { currentCertificate, certifiedConclusion } from './certification-view'
import './AnalysisSummary.css'

export const diagnosticNumber = (n?: number) =>
  n === undefined || Number.isNaN(n)
    ? '—'
    : !Number.isFinite(n)
      ? '∞'
      : n === 0
        ? '0'
        : Math.abs(n) < 1e-3 || Math.abs(n) >= 1e6
          ? n.toExponential(3)
          : Number(n.toPrecision(6)).toString()

function boundNumber(n: number) {
  if (!Number.isFinite(n) || n === 0) return diagnosticNumber(n)
  const text = n.toExponential(3)
  if (Number(text) >= n) return text
  const [m, e] = text.split('e')
  const up = `${(Number(m) + 0.001).toFixed(3)}e${e}`
  return Number(up) >= n ? up : n.toString()
}

type Props = {
  result: SolveResult
  source: string
  parameters: Record<string, number>
  search?: SearchSummary | null
  events?: BranchTerminalEvent[]
  sweepName: string
  pending: boolean
  inputNoiseSigma?: number
  onInputNoiseSigmaChange?: (sigma: number) => void
}
export default function AnalysisSummary({
  result,
  source,
  parameters,
  search,
  events = [],
  sweepName,
  pending,
  inputNoiseSigma,
  onInputNoiseSigmaChange,
}: Props) {
  const [perturbation, setPerturbation] = useState('0.000001')
  const d = useMemo(
    () => reportDiagnostics(result, source, parameters, search),
    [result, source, JSON.stringify(parameters), search],
  )
  const critical = uniqueBranchEvents(events)
  const c = currentCertificate(search?.certification, source, parameters)
  const delta = Number(perturbation)
  const response =
    perturbation.trim() && Number.isFinite(delta) && delta >= 0
      ? d.powerResponse
        ? (d.powerResponse.coefficient * delta) ** (1 / d.powerResponse.order)
        : d.amplification !== undefined
          ? d.amplification * delta
          : undefined
      : undefined
  const linear = result.kind !== 'nonlinear'
  const root = result.rootStructure
  const rootKind = linear
    ? 'Unique Solution'
    : result.variables.length > 1
      ? d.rank === result.variables.length
        ? `Regular System · Rank ${d.rank}/${result.variables.length}`
        : d.rank === undefined
          ? 'System Solution · Rank not evaluated'
          : `Singular System · Rank ${d.rank}/${result.variables.length}`
      : root?.kind === 'multiple'
        ? `Multiple Root · Order ${root.order ?? '?'}`
        : root?.kind === 'boundary'
          ? 'Boundary Root'
          : root?.kind === 'nonsmooth'
            ? 'Nonsmooth Root'
            : root?.kind === 'simple'
              ? 'Simple Root'
              : 'Root · Order not classified'
  return (
    <section
      className="analysis-summary"
      aria-label="해의 품질과 검증"
      aria-busy={pending}
    >
      <div className="analysis-verdict">
        <span
          className="analysis-root-kind"
          data-kind={result.rootStructure?.kind ?? 'simple'}
        >
          {root?.kind === 'multiple' ? '◆' : '●'} {rootKind}
        </span>
        <h3>
          {pending
            ? '현재 입력 검증 중…'
            : c
              ? certifiedConclusion(c).title
              : searchConclusion(
                  search?.certification ? undefined : search,
                  linear,
                )}
        </h3>
        {c && (
          <p>
            {c.variable} ∈ [{diagnosticNumber(c.domain.min)},{' '}
            {diagnosticNumber(c.domain.max)}] · 현재 파라미터에서 검증
          </p>
        )}
      </div>
      <div className="quality-grid analysis-table-scroll">
        <table className="quality-table">
          <caption className="visually-hidden">
            Accuracy, Sensitivity and Verification
          </caption>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
              <th>Interpretation</th>
            </tr>
          </thead>
          <tbody>
            <tr
              data-quality={
                d.errorBound !== undefined ? 'verified' : 'measured'
              }
            >
              <th scope="row">
                {d.errorBound !== undefined
                  ? 'Absolute Error Bound'
                  : 'Last Correction'}
              </th>
              <td className="quality-value">
                {d.errorBound !== undefined ? '≤ ' : '≈ '}
                {d.errorBound !== undefined
                  ? boundNumber(d.errorBound)
                  : diagnosticNumber(
                      d.correction ? Math.max(...d.correction) : undefined,
                    )}
              </td>
              <td>
                <span>
                  {d.errorBound !== undefined
                    ? '입력한 모델에서 확인한 위치 오차의 상한'
                    : d.powerResponse
                      ? '중근에서는 아래의 비선형 변화 크기를 확인하세요.'
                      : '현재 해에 남은 수치 보정량의 국소 추정'}
                </span>
                <details className="metric-help">
                  <summary>이 수치 읽는 법</summary>
                  <p>
                    {d.errorBound !== undefined
                      ? '표시한 해와 수학적 해 사이의 거리가 이 값 이하라는 뜻입니다. 예를 들어 ≤ 0.0001이면 해의 위치가 표시한 숫자에서 최대 0.0001만큼 떨어져 있을 수 있습니다. 입력한 식과 파라미터를 고정한 계산 오차이며, 측정값의 오차까지 포함하지는 않습니다. 작은 값일수록 해의 위치를 좁게 확인했다는 뜻입니다.'
                      : '현재 계산값에 남아 있는 등식 오차를 줄이려면 해를 얼마나 더 움직여야 하는지 추정한 값입니다. 작을수록 식을 잘 만족하지만, 엄밀한 오차 상한이나 정확한 소수 자릿수 보장은 아닙니다. 특히 평탄한 중근 근처에서는 아래 Sensitivity와 함께 확인하세요.'}
                  </p>
                </details>
              </td>
            </tr>
            <tr>
              <th scope="row">
                {d.powerResponse
                  ? 'Nonlinear Sensitivity'
                  : 'Absolute Sensitivity'}
              </th>
              <td className="quality-value">
                {d.powerResponse
                  ? `δ¹⁄${d.powerResponse.order}`
                  : d.amplification === undefined
                    ? '—'
                    : `${diagnosticNumber(d.amplification)} ×`}
              </td>
              <td>
                <span>
                  {d.powerResponse
                    ? `${d.powerResponse.order}중근: 입력 오차와 해 변화가 비례하지 않습니다.`
                    : '등식에 생긴 작은 절대 오차가 해의 변화로 전달되는 크기'}
                </span>
                <details className="metric-help">
                  <summary>이 수치 읽는 법</summary>
                  <p>
                    등식의 우변에 생긴 작은 절대 오차가 해의 절대 변화로 얼마나
                    커질지 나타냅니다. 예를 들어 0.736896×라면 등식 오차
                    0.0003에 대해 해 변화는 약 0.0002211로 예상합니다. 값이
                    클수록 같은 오차에 더 민감합니다. 단위를 바꾸면 숫자도
                    달라지므로 서로 다른 단위의 문제끼리 숫자만 비교하지 마세요.
                    이 값은 계산 성공률이나 정답일 확률이 아닙니다.
                  </p>
                  <p>
                    Absolute Error Bound는 입력을 고정했을 때의 계산 위치
                    오차입니다. Sensitivity는 입력 자체가 바뀔 때 해가 얼마나
                    움직이는지를 예상합니다. Multiple Root에서는 작은 오차에
                    근이 새로 생기거나 없어질 수 있어 선형 배율 대신 비선형 반응
                    차수를 표시합니다. 아래 Input Error Scenario에서 실제 변화
                    크기를 살펴볼 수 있습니다.
                  </p>
                </details>
              </td>
            </tr>
            <tr
              data-quality={
                c?.complete && c.allRootsRepresented ? 'verified' : 'measured'
              }
            >
              <th scope="row">{linear ? 'Rank' : 'Verified Coverage'}</th>
              <td className="quality-value">
                {linear
                  ? `${d.rank ?? '—'} / ${result.values.length}`
                  : c
                    ? coveragePercent(search)
                    : '—'}
              </td>
              <td>
                <span>
                  {linear
                    ? '독립적인 조건 수 / 미지수 수'
                    : c
                      ? `${c.uniqueRootCount} Root Interval · ${c.unresolved.length} Unresolved`
                      : (search?.certificationUnavailable ??
                        '지원하는 단일 변수 자동 탐색에서 계산합니다.')}
                </span>
                <details className="metric-help">
                  <summary>이 수치 읽는 법</summary>
                  <p>
                    {linear
                      ? '미지수 개수와 Rank가 같으면 독립적인 조건이 충분한 선형계입니다. 예를 들어 Rank 3 / 3이면 세 미지수를 정할 독립적인 조건 세 개가 있습니다. 같은 조건을 반복해 입력하면 Rank는 늘어나지 않습니다. Rank가 부족하면 해가 없거나 무한히 많을 수 있어 추가 조건을 확인해야 합니다.'
                      : '현재 파라미터와 표시한 미지수 범위에서, 근의 존재·부재가 판정된 길이의 비율입니다. 예를 들어 99.9%이면 나머지 좁은 구간에 추가 근이 있을 가능성을 아직 배제하지 못했다는 뜻입니다. 100%로 반올림되어도 Unresolved가 남았는지와 결과 목록의 일치 여부를 함께 확인해야 합니다. 전체 실수 영역이나 파라미터 변화 전체를 검증한 값도, 모든 근을 찾았을 확률도 아닙니다. 맨 위의 전체 근 확인 여부가 최종 판정입니다.'}
                  </p>
                </details>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {!linear && (
        <CertificationReport
          certificate={c}
          pending={pending}
          inputNoiseSigma={inputNoiseSigma}
          onInputNoiseSigmaChange={onInputNoiseSigmaChange}
          truncated={search?.truncated}
        />
      )}
      <details className="analysis-details sensitivity-detail">
        <summary>
          Input Error Scenario · 입력이 흔들리면 해는 얼마나 달라질까요?
        </summary>
        <div className="sensitivity-scenario">
          <div>
            <h4>Input Error Scenario</h4>
            <details className="metric-help">
              <summary>어떤 오차를 입력하나요?</summary>
              <p>
                각 등식의 우변이 흔들릴 수 있는 절대 크기를 입력합니다. 측정
                오차를 알고 있다면 현재 등식의 단위로 환산해 넣으세요. 아래
                결과는 해 성분 중 가장 큰 변화 크기의 예측으로, 파라미터
                슬라이더의 이동량이나 확률이 아닙니다. 큰 오차·접점 근처에서는
                선형 근사가 맞지 않을 수 있으므로 실제 식을 바꿔 다시 계산해야
                합니다.
              </p>
            </details>
          </div>
          <label>
            Equation Offset δ
            <input
              aria-label="가정한 등식 오차"
              type="number"
              min="0"
              step="any"
              value={perturbation}
              onChange={(e) => setPerturbation(e.target.value)}
            />
          </label>
          <div className="scenario-result">
            <span>Estimated Solution Change</span>
            <strong>{diagnosticNumber(response)}</strong>
          </div>
        </div>
      </details>
      <details className="analysis-details">
        <summary>Accuracy & Sensitivity · 계산 근거</summary>
        {d.enclosure && (
          <p>
            선택한 해의 포함 구간: [{d.enclosure.lo.toPrecision(17)},{' '}
            {d.enclosure.hi.toPrecision(17)}]. 바깥쪽 반올림을 사용하는 구간
            Newton 교집합으로 축소했습니다.
          </p>
        )}
        <p>
          최대 절대 등식 오차 {diagnosticNumber(result.maxResidual)} · 정규화
          등식 오차 {diagnosticNumber(d.normalizedError)}.{' '}
          {linear
            ? '정규화는 |Ax−b|/(|A||x|+|b|)의 성분별 최댓값입니다.'
            : '정규화는 |Fᵢ|/(Σ|Jᵢⱼ|max(1,|xⱼ|)+|Fᵢ|)입니다.'}
        </p>
        <p>
          일반근: Δx ≈ −J⁻¹F, 증폭률 ||J⁻¹||∞. 단일 변수는 1/|F′|이므로 조건수가
          1이어도 민감한 근을 구분합니다. 등식과 미지수의 단위를 바꾸면 절대
          증폭률도 달라집니다.
        </p>
        {d.powerResponse && (
          <p>
            {d.powerResponse.order}중근: |Δx| ≈ (
            {diagnosticNumber(d.powerResponse.coefficient)}·δ)¹⁄
            {d.powerResponse.order}. 첫 비영 도함수로 계산한 국소 변화 크기이며,
            오차 방향에 따라 실근이 사라질 수 있습니다.
          </p>
        )}
        <p>
          포함 구간이 있을 때만 실제 해의 오차 상한을 표시합니다. 그 외
          보정량·민감도는 국소 추정이며, 잃은 유효숫자나 입력 측정 오차를
          복구하지 않습니다.
        </p>
        {d.reason && <p>{d.reason}</p>}
        {result.rootStructure && <p>{result.rootStructure.evidence}</p>}
      </details>
      {d.parameterSensitivity.length > 0 && (
        <details className="analysis-details">
          <summary>Parameter Sensitivity · dx/dp</summary>
          <p>
            현재 해에서 −J⁻¹∂F/∂p를 계산했습니다. 파라미터 1단위 증가에 대한
            국소 해 변화입니다.
          </p>
          <div className="analysis-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Parameter</th>
                  {result.variables.map((v) => (
                    <th key={v}>d{v}/dp</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.parameterSensitivity.map((p) => (
                  <tr key={p.name}>
                    <th>{p.name}</th>
                    {p.derivatives.map((x, i) => (
                      <td key={i}>{diagnosticNumber(x)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
      {critical.length > 0 && (
        <div className="report-critical">
          <h4>
            Branch Events <span>{critical.length}</span>
          </h4>
          <p>
            현재 해의 기준 곡선에 대한 접점·중근·추적 경계입니다. 현재
            파라미터의 해와 별도로 표시합니다.
          </p>
          {critical.map((ev, i) => {
            const at = eventLocation(ev)
            return (
              <details className="analysis-details" key={i}>
                <summary>
                  <span className="critical-symbol">
                    {ev.tangency?.verified
                      ? ev.tangency.bifurcationOrder === 'boundary'
                        ? '■'
                        : Number(ev.tangency.bifurcationOrder) % 2
                          ? '⬡'
                          : '◆'
                      : '△'}
                  </span>{' '}
                  {ev.tangency?.verified
                    ? ev.tangency.bifurcationOrder === 'boundary'
                      ? 'Boundary Contact'
                      : ev.tangency.geometry === 'degenerate'
                        ? 'Degenerate Contact'
                        : ev.tangency.bifurcationOrder % 2
                          ? 'Inflection Crossing'
                          : 'Root Merge'
                    : ev.kind === 'merge'
                      ? 'Possible Root Merge'
                      : 'Tracking Boundary'}
                  {ev.tangency?.verified && (
                    <small>
                      {ev.tangency.bifurcationOrder === 'boundary'
                        ? ev.tangency.multiplicity
                          ? `Order ${ev.tangency.multiplicity}`
                          : 'Boundary'
                        : `Order ${ev.tangency.bifurcationOrder}`}
                    </small>
                  )}{' '}
                  · {sweepName} ≈ {diagnosticNumber(at.parameter)}
                </summary>
                <p>
                  {result.variables
                    .map((v, j) => `${v} ≈ ${diagnosticNumber(at.values[j])}`)
                    .join(' · ')}
                </p>
                <p>{ev.tangency?.geometricSummary ?? ev.description}</p>
                {ev.tangency && (
                  <p>
                    등식 오차 {diagnosticNumber(ev.tangency.residualAtStar)} ·
                    기울기 크기 {diagnosticNumber(ev.tangency.slopeAtStar)}.
                    접점 차수는 국소 수치 판정이며, 스칼라 홀수 중근만으로
                    다변수 Cusp 분기를 증명하지 않습니다.
                  </p>
                )}
              </details>
            )
          })}
        </div>
      )}
    </section>
  )
}
