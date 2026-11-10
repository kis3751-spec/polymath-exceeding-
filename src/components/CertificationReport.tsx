import { useEffect, useState } from 'react'
import type { RootCertificate } from '../engine/interval-certification'
import { unresolvedReason } from '../engine/interval-certification'
import {
  certificateSegments,
  certifiedConclusion,
  probabilityBoundsText,
} from './certification-view'

type Props = {
  certificate?: RootCertificate
  pending: boolean
  truncated?: boolean
  inputNoiseSigma?: number
  onInputNoiseSigmaChange?: (sigma: number) => void
}
const number = (value: number) =>
  value === 0
    ? '0'
    : Math.abs(value) < 0.001 || Math.abs(value) >= 1e6
      ? value.toExponential(4)
      : Number(value.toPrecision(7)).toString()

export default function CertificationReport({
  certificate: c,
  pending,
  truncated = false,
  inputNoiseSigma,
  onInputNoiseSigmaChange,
}: Props) {
  const gp = c?.completeness?.gaussianPerturbation
  const sigma = inputNoiseSigma ?? gp?.sigma ?? 1e-6
  const [sigmaText, setSigmaText] = useState(String(sigma))
  const [sigmaError, setSigmaError] = useState('')
  useEffect(() => {
    setSigmaText(String(sigma))
    setSigmaError('')
  }, [sigma])

  function applySigma() {
    const next = Number(sigmaText)
    if (!sigmaText.trim() || !Number.isFinite(next) || next <= 0) {
      setSigmaError('0보다 큰 유한한 표준편차를 입력하세요.')
      return
    }
    setSigmaError('')
    if (next !== sigma) onInputNoiseSigmaChange?.(next)
  }

  if (!c) return null
  const state = certifiedConclusion(c)
  const draftValue = Number(sigmaText)
  const draftMatches =
    sigmaText.trim() !== '' &&
    Number.isFinite(draftValue) &&
    draftValue === sigma
  const freshGp =
    !pending && draftMatches && gp?.sigma === sigma ? gp : undefined
  const probability = freshGp?.criticalPointsCertified
    ? probabilityBoundsText(freshGp.domainRootCountInvarianceBounds)
    : undefined
  const segments = certificateSegments(c)
  const span = c.domain.max - c.domain.min
  const counts = [
    ['root', 'Root Interval', c.rootIntervals.length],
    ['free', 'Root-free', c.rootFreeIntervals?.length ?? 0],
    [
      'excluded',
      'Excluded',
      c.excludedIntervals?.length ?? c.excludedDomainCount,
    ],
    ['unresolved', 'Unresolved', c.unresolved.length],
  ] as const

  return (
    <section
      className="certification-report"
      aria-label="탐색 검증과 입력 오차"
      aria-busy={pending}
    >
      <div className="certificate-heading">
        <h4>Search Domain Verification</h4>
        <span
          className={`certificate-state${state.complete ? ' is-complete' : ''}`}
        >
          {pending ? '갱신 중' : state.status}
        </span>
      </div>
      <div
        className="certificate-map"
        role="img"
        aria-label={`${c.variable} 탐색 범위의 검증 기록`}
      >
        <svg
          viewBox="0 0 1000 24"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {Number.isFinite(span) &&
            span > 0 &&
            segments.map((segment, i) => (
              <rect
                key={i}
                className={`certificate-segment is-${segment.kind}`}
                x={((segment.lo - c.domain.min) / span) * 1000}
                y="2"
                width={Math.max(1, ((segment.hi - segment.lo) / span) * 1000)}
                height="20"
              />
            ))}
        </svg>
      </div>
      <div className="certificate-map-scale">
        <span>{number(c.domain.min)}</span>
        <span>{c.variable}</span>
        <span>{number(c.domain.max)}</span>
      </div>
      <div className="certificate-counts">
        {counts.map(([kind, label, count]) => (
          <span key={kind}>
            <i className={`is-${kind}`} />
            {label} <b>{count}</b>
          </span>
        ))}
      </div>
      <details className="analysis-details certificate-reading">
        <summary>Verification Map · 검증 지도 읽는 법</summary>
        <p>
          색은 구간 연산으로 기록한 판정입니다. Root Interval은 그 상자 안에
          확인된 근이 있다는 뜻으로, 상자 전체가 해라는 뜻은 아닙니다. 작은 근
          상자는 위치를 식별할 수 있도록 최소 너비로 표시합니다. Root-free는
          추가 근이 없다고 검증한 구간이고 Excluded는 실수 수식이 정의되지 않는
          구간입니다. Unresolved는 아직 판정이 끝나지 않은 구간입니다.
        </p>
        {truncated && (
          <p>
            탐색 또는 표시 한도에 도달했습니다. 현재 목록만으로 모든 근 발견을
            판정하지 않습니다.
          </p>
        )}
        <p>
          미결정 영역에는 아직 검증하지 못한 근이 있을 수 있습니다. 구간 길이
          검증률이 높다는 사실은 근을 모두 발견했을 확률을 뜻하지 않습니다. 전체
          근 확인은 구간 검증과 표시 결과의 일대일 대조가 모두 끝났을 때만
          표시합니다.
        </p>
      </details>

      <details className="analysis-details gaussian-model">
        <summary>Gaussian Noise Model · 입력 오차와 근 개수</summary>
        <p>
          입력 오차에 따른 근 개수 유지 확률을 따로 살펴보는 선택 항목입니다.
          측정 오차 모형을 알고 있을 때 사용하세요.
        </p>
        <div className="probability-summary">
          <div className="probability-value">
            <span>Root Count Stability</span>
            <strong>
              {pending ? '계산 중…' : (probability ?? '산정 조건 확인')}
            </strong>
            <small>
              {probability
                ? '현재 탐색 구간 · 검증된 확률 범위'
                : '검증된 임계점과 확률 범위가 있는 경우 표시'}
            </small>
          </div>
          <label className="probability-sigma">
            Noise Standard Deviation σ
            <input
              aria-label="입력 오차 표준편차"
              type="number"
              min="0"
              step="any"
              value={sigmaText}
              readOnly={!onInputNoiseSigmaChange}
              onChange={(e) => setSigmaText(e.target.value)}
              onBlur={applySigma}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  applySigma()
                }
                if (e.key === 'Escape') {
                  setSigmaText(String(sigma))
                  setSigmaError('')
                }
              }}
            />
            {sigmaError && <small role="alert">{sigmaError}</small>}
          </label>
        </div>
        <details className="analysis-details probability-assumptions">
          <summary>Assumptions · 이 확률을 해석하는 방법</summary>
          <p>
            현재 스칼라 방정식의 좌변·우변 차이 F 전체에 하나의 일정한 오차 ε가
            더해진다고 가정합니다. ε는 평균 0, 표준편차 σ의 정규분포를 따릅니다.
            표시한 값은 F+ε=0의 근 개수가 현재 탐색 구간에서 유지될 확률의
            상하한입니다. 미발견 근을 모두 찾았을 확률, 개별 해가 맞을 확률, 각
            측정값에 독립 오차가 생기는 일반 모형과는 다릅니다.
          </p>
          <p>
            Regression의 95% Confidence Interval과도 구별하세요. Confidence
            Interval은 여러 관측값으로 추정한 계수의 불확실성을 나타내고,
            여기서는 한 방정식 전체에 같은 오차가 더해질 때 근의 개수가
            유지되는지를 다룹니다. 두 숫자를 서로의 정확도 점수처럼 비교할 수
            없습니다.
          </p>
          <p>
            σ는 등식의 단위로 환산한 입력 오차 크기입니다. 실제 측정 오차를 알고
            있으면 그 값을 사용하세요. 같은 σ라도 등식의 단위나 스케일을 바꾸면
            다른 오차 모형이 됩니다. 근 개수가 유지되더라도 위치가 크게 움직일
            수 있으므로 위의 해 변화 증폭률과 함께 해석하세요.
          </p>
          {c.completeness?.perturbationUnavailableReason && !pending && (
            <p>{c.completeness.perturbationUnavailableReason}</p>
          )}
          {!gp &&
            !pending &&
            !c.completeness?.perturbationUnavailableReason && (
              <p>
                현재 식·정의역·검증 예산에서는 확률을 검증하지 못했습니다. 이를
                0%나 100%로 대신 표시하지 않습니다.
              </p>
            )}
          {freshGp && !freshGp.criticalPointsCertified && (
            <p>
              원래 함수의 모든 임계점과 경계 높이를 검증해야 이 확률을 산정할 수
              있습니다.
            </p>
          )}
          {freshGp?.twoSidedSafetyMarginBounds && (
            <p>
              근 개수를 바꾸지 않는 양방향 등식 오차 여유: [
              {number(freshGp.twoSidedSafetyMarginBounds.lo)},{' '}
              {number(freshGp.twoSidedSafetyMarginBounds.hi)}]. 이 값이 0인
              접점에서는 작은 오차로도 근이 생성·소멸할 수 있습니다.
            </p>
          )}
          {freshGp?.twoSidedSafetyProbabilityBounds && (
            <p>
              위 안전 여유 안에 오차가 머무를 확률:{' '}
              {probabilityBoundsText(freshGp.twoSidedSafetyProbabilityBounds)}.
              안전 여유 밖에서도 근 개수가 같아질 수 있으므로 주 지표와 서로
              다를 수 있습니다.
            </p>
          )}
        </details>
      </details>

      {c.unresolved.length > 0 && (
        <details className="analysis-details unresolved-report">
          <summary>추가 검증이 필요한 {c.unresolved.length}곳</summary>
          <div className="analysis-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>From</th>
                  <th>To</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {c.unresolved.map((u, i) => (
                  <tr key={i}>
                    <td>{number(u.lo)}</td>
                    <td>{number(u.hi)}</td>
                    <td>{unresolvedReason(u.reason)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  )
}
