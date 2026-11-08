import { useMemo, useState } from 'react'
import type { BranchTerminalEvent, SearchSummary, SolveResult } from '../engine'
import {
  coveragePercent,
  reportDiagnostics,
  searchConclusion,
} from '../engine/report-diagnostics'
import {
  branchEventLabel,
  eventLocation,
  uniqueBranchEvents,
} from '../engine/branch-events'
import { rootStructureLabel, tangencyOrderLabel } from '../engine/tangency'
import { unresolvedReason } from '../engine/interval-certification'
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
}
export default function AnalysisSummary({
  result,
  source,
  parameters,
  search,
  events = [],
  sweepName,
  pending,
}: Props) {
  const [perturbation, setPerturbation] = useState('0.000001')
  const d = useMemo(
    () => reportDiagnostics(result, source, parameters, search),
    [result, source, JSON.stringify(parameters), search],
  )
  const critical = uniqueBranchEvents(events),
    c = search?.certification
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
          {linear
            ? '● 유일해'
            : `${result.rootStructure?.kind === 'multiple' ? '◆' : '●'} ${result.variables.length > 1 ? (d.rank === result.variables.length ? `일반 연립해 · 랭크 ${d.rank}/${result.variables.length}` : d.rank === undefined ? '연립해 · 랭크 미산정' : `특이 연립해 · 랭크 ${d.rank}/${result.variables.length}`) : rootStructureLabel(result.rootStructure)}`}
        </span>
        <h3>
          {pending ? '현재 입력 검증 중…' : searchConclusion(search, linear)}
        </h3>
        {c && (
          <p>
            {c.variable} ∈ [{diagnosticNumber(c.domain.min)},{' '}
            {diagnosticNumber(c.domain.max)}] · 현재 파라미터에서 검증
          </p>
        )}
      </div>
      <div className="quality-grid">
        <article
          data-quality={d.errorBound !== undefined ? 'verified' : 'measured'}
        >
          <span>
            {d.errorBound !== undefined
              ? '해의 절대 오차 상한'
              : '해 보정량 · 국소 추정'}
          </span>
          <strong>
            {d.errorBound !== undefined ? '≤ ' : '≈ '}
            {d.errorBound !== undefined
              ? boundNumber(d.errorBound)
              : diagnosticNumber(
                  d.correction ? Math.max(...d.correction) : undefined,
                )}
          </strong>
          <small>
            {d.errorBound !== undefined
              ? '구간 연산으로 해를 감싼 범위에서 계산'
              : d.powerResponse
                ? '중근: 선형 보정 대신 아래 비선형 반응 확인'
                : '원래 등식과 역행렬로 계산한 마지막 보정 크기'}
          </small>
        </article>
        <article>
          <span>등식 오차 → 해 변화 증폭률</span>
          <strong>
            {d.powerResponse
              ? `δ¹⁄${d.powerResponse.order}`
              : d.amplification === undefined
                ? '산정 조건 확인'
                : `${diagnosticNumber(d.amplification)} ×`}
          </strong>
          <small>
            {d.powerResponse
              ? `${d.powerResponse.order}중근의 비선형 민감도 · 아래 입력으로 예측`
              : '각 등식에 같은 절대 오차를 넣었을 때 · 현재 단위 기준'}
          </small>
        </article>
        <article
          data-quality={
            c?.complete && c.allRootsRepresented ? 'verified' : 'measured'
          }
        >
          <span>{linear ? '방정식 독립성' : '탐색 구간 검증률'}</span>
          <strong>
            {linear
              ? `${d.rank ?? '—'} / ${result.values.length}`
              : (coveragePercent(search) ?? '미실행')}
          </strong>
          <small>
            {linear
              ? '수치 랭크 / 미지수 수'
              : c
                ? `유일근 구간 ${c.uniqueRootCount}개 · 미결정 구간 ${c.unresolved.length}개`
                : (search?.certificationUnavailable ??
                  '단일 변수 자동 탐색에서 구간 검증 지원')}
          </small>
        </article>
      </div>
      <div className="sensitivity-scenario">
        <div>
          <h4>입력 오차가 이만큼이면?</h4>
          <p>
            각 등식의 우변에 가정한 절대 오차입니다. 측정 오차를 아는 경우 직접
            바꿔보세요.
          </p>
        </div>
        <label>
          가정한 등식 오차 δ
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
          <span>
            최대 해 변화{' '}
            {d.powerResponse ? '크기 추정' : linear ? '선형 예측' : '국소 예측'}
          </span>
          <strong>{diagnosticNumber(response)}</strong>
        </div>
      </div>
      <details className="analysis-details">
        <summary>정확도·민감도 지표의 의미와 계산 근거</summary>
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
          <summary>파라미터별 영향 · dx/dp</summary>
          <p>
            현재 해에서 −J⁻¹∂F/∂p를 계산했습니다. 파라미터 1단위 증가에 대한
            국소 해 변화입니다.
          </p>
          <div className="analysis-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>파라미터</th>
                  {result.variables.map((v) => (
                    <th key={v}>{v} 변화율</th>
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
            곡선에서 확인한 특별한 지점 <span>{critical.length}</span>
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
                  {branchEventLabel(ev)}
                  {ev.tangency?.verified && (
                    <small>{tangencyOrderLabel(ev.tangency)}</small>
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
      {c && (
        <details className="analysis-details">
          <summary>
            탐색 범위·미결정 구간{' '}
            {c.unresolved.length > 0 ? `${c.unresolved.length}곳` : '없음'}
          </summary>
          <p>
            검증률은 존재·부재가 판정된 구간 길이의 비율입니다. 모든 근을 찾았을
            확률이 아닙니다. 미결정 구간이 1곳이라도 남으면 길이가 작아도 전체
            발견 완료로 표시하지 않습니다.
          </p>
          {c.unresolved.length > 0 && (
            <div className="analysis-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>시작</th>
                    <th>끝</th>
                    <th>남은 검증</th>
                  </tr>
                </thead>
                <tbody>
                  {c.unresolved.map((u, i) => (
                    <tr key={i}>
                      <td>{diagnosticNumber(u.lo)}</td>
                      <td>{diagnosticNumber(u.hi)}</td>
                      <td>{unresolvedReason(u.reason)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {search?.truncated && (
            <p>
              탐색 또는 표시 한도에 도달했습니다. 현재 목록만으로 모든 근 발견을
              판정하지 않습니다.
            </p>
          )}
        </details>
      )}
    </section>
  )
}
