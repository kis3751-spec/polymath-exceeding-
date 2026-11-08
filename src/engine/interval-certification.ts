import type { NonlinearNode } from './nonlinear-parser'
import {
  sub,
  div,
  containsZero,
  evaluateIntervalJet,
  nextDown,
  nextUp,
  type Interval,
  type IntervalJet,
} from './interval-arithmetic'

export type UnresolvedInterval = Interval & {
  reason: 'domain' | 'unsupported' | 'nonsmooth' | 'resolution' | 'budget'
}
export type RootCertificate = {
  model?: { source: string; parameters: Record<string, number> }
  domain: { min: number; max: number }
  variable: string
  /** Domain classification, not a probability or a bound on the root error. */
  complete: boolean
  coverageLowerBound: number
  uniqueRootCount: number
  rootIntervals: Interval[]
  unresolved: UnresolvedInterval[]
  excludedDomainCount: number
  processedIntervals: number
  budgetExhausted: boolean
  elapsedMs: number
  /** Filled only by the solver after comparing the certificate with its list. */
  allRootsRepresented?: boolean
}
type Options = {
  maxIntervals?: number
  maxDepth?: number
  maxMs?: number
  maxRoots?: number
}
const sign = (a: Interval) =>
  a.lo > 0 ? 1 : a.hi < 0 ? -1 : a.lo === 0 && a.hi === 0 ? 0 : undefined
const finite = (a: Interval) => Number.isFinite(a.lo) && Number.isFinite(a.hi)

/** Exhaustive subdivision of a finite scalar domain. No point-value sign
 * products, guessed curvature probabilities or fixed minimum root spacing.
 * Unsupported operations and every unprocessed cell remain unresolved. */
export function certifyScalarRoots(
  node: NonlinearNode,
  variable: string,
  parameters: Record<string, number>,
  helpers: Map<string, NonlinearNode>,
  bounds: { min: number; max: number },
  options: Options = {},
): RootCertificate {
  if (
    ![bounds.min, bounds.max, bounds.max - bounds.min].every(Number.isFinite) ||
    bounds.min >= bounds.max
  )
    throw new Error('구간 검증에는 유한한 증가 구간이 필요합니다.')
  if (!Object.values(parameters).every(Number.isFinite))
    throw new Error('구간 검증의 파라미터는 유한한 숫자여야 합니다.')
  const maxIntervals = options.maxIntervals ?? 6000,
    maxDepth = options.maxDepth ?? 64,
    maxRoots = options.maxRoots ?? 128
  const start = performance.now(),
    deadline = start + (options.maxMs ?? 250)
  const queue = [{ lo: bounds.min, hi: bounds.max, depth: 0 }],
    unresolved: UnresolvedInterval[] = [],
    rootIntervals: Interval[] = []
  let processedIntervals = 0,
    excludedDomainCount = 0,
    budgetExhausted = false
  const evaluate = (x: Interval) =>
    evaluateIntervalJet(node, variable, x, parameters, helpers)
  const root = (x: Interval) => {
    if (
      x.lo === x.hi &&
      rootIntervals.some((r) => r.lo === x.lo && r.hi === x.hi)
    )
      return
    rootIntervals.push(x)
  }
  while (queue.length) {
    if (
      processedIntervals >= maxIntervals ||
      performance.now() > deadline ||
      rootIntervals.length >= maxRoots
    ) {
      budgetExhausted = true
      break
    }
    const cell = queue.pop()!,
      jet = evaluate(cell)
    processedIntervals++
    if (jet.domain === 'none') {
      excludedDomainCount++
      continue
    }
    if (jet.domain === 'all' && !containsZero(jet.val)) continue
    if (jet.domain === 'all' && !jet.issue && !containsZero(jet.der)) {
      const left = evaluate({ lo: cell.lo, hi: cell.lo }),
        right = evaluate({ lo: cell.hi, hi: cell.hi })
      const s0 = left.domain === 'all' ? sign(left.val) : undefined,
        s1 = right.domain === 'all' ? sign(right.val) : undefined
      if (s0 === 0) {
        root({ lo: cell.lo, hi: cell.lo })
        continue
      }
      if (s1 === 0) {
        root({ lo: cell.hi, hi: cell.hi })
        continue
      }
      if (s0 !== undefined && s1 !== undefined) {
        if (s0 !== s1) root({ lo: cell.lo, hi: cell.hi })
        continue
      }
      // Interval Newton inclusion: m-F(m)/F'(I) strictly inside I.
      // A point evaluation here is itself an outward interval enclosure.
      const m = cell.lo / 2 + cell.hi / 2,
        fm = evaluate({ lo: m, hi: m })
      if (fm.domain === 'all') {
        const n = sub({ lo: m, hi: m }, div(fm.val, jet.der))
        if (finite(n) && n.lo > cell.lo && n.hi < cell.hi) {
          root({ lo: cell.lo, hi: cell.hi })
          continue
        }
      }
    }
    const mid = cell.lo / 2 + cell.hi / 2
    const reason: UnresolvedInterval['reason'] =
      jet.issue === 'domain' ||
      (jet.domain === 'partial' && jet.issue !== 'unsupported')
        ? 'domain'
        : jet.issue === 'unsupported'
          ? 'unsupported'
          : jet.issue === 'nonsmooth'
            ? 'nonsmooth'
            : 'resolution'
    // Unsupported AST operations cannot improve through subdivision. Retain
    // the entire cell rather than spending the work budget on identical data.
    if (
      reason === 'unsupported' ||
      cell.depth >= maxDepth ||
      mid === cell.lo ||
      mid === cell.hi
    ) {
      unresolved.push({ lo: cell.lo, hi: cell.hi, reason })
      continue
    }
    queue.push(
      { lo: mid, hi: cell.hi, depth: cell.depth + 1 },
      { lo: cell.lo, hi: mid, depth: cell.depth + 1 },
    )
  }
  for (const cell of queue)
    unresolved.push({ lo: cell.lo, hi: cell.hi, reason: 'budget' })
  unresolved.sort((a, b) => a.lo - b.lo)
  // Merge only unresolved cells; never combine distinct root certificates.
  const merged: UnresolvedInterval[] = []
  for (const cell of unresolved) {
    const previous = merged.at(-1)
    if (previous && previous.reason === cell.reason && previous.hi === cell.lo)
      previous.hi = cell.hi
    else merged.push({ ...cell })
  }
  let widthUpper = 0
  for (const cell of merged)
    widthUpper = nextUp(widthUpper + nextUp(cell.hi - cell.lo))
  const totalLower = nextDown(bounds.max - bounds.min)
  const complete = merged.length === 0
  // Lower bound on classified length. A rounded display of 100 must never
  // conceal an unresolved point/cell, however small its measure is.
  const coverageLowerBound = complete
    ? 1
    : totalLower <= 0
      ? 0
      : Math.max(0, nextDown(1 - nextUp(widthUpper / totalLower)))
  return {
    domain: bounds,
    variable,
    complete,
    coverageLowerBound,
    uniqueRootCount: rootIntervals.length,
    rootIntervals: rootIntervals.sort((a, b) => a.lo - b.lo),
    unresolved: merged,
    excludedDomainCount,
    processedIntervals,
    budgetExhausted,
    elapsedMs: performance.now() - start,
  }
}

/** Refine a PROVEN bracket with interval signs. An undecidable sign stops
 * refinement; it is never replaced by the sign of an ordinary float value. */
export function refineCertifiedRoot(
  bracket: Interval,
  evaluate: (x: Interval) => IntervalJet,
): number {
  if (bracket.lo === bracket.hi) return bracket.lo
  let { lo, hi } = bracket
  const left = sign(evaluate({ lo, hi: lo }).val)
  if (left === undefined || left === 0) return lo / 2 + hi / 2
  for (let i = 0; i < 96; i++) {
    const mid = lo / 2 + hi / 2
    if (mid === lo || mid === hi) break
    const s = sign(evaluate({ lo: mid, hi: mid }).val)
    if (s === undefined || s === 0) return mid
    if (s === left) lo = mid
    else hi = mid
  }
  return lo / 2 + hi / 2
}

export const unresolvedReason = (reason: UnresolvedInterval['reason']) =>
  ({
    domain: '정의역 경계·분모 특이점 후보',
    unsupported: '구간 검증 미지원 연산',
    nonsmooth: '비매끄러운 식·구간 해 후보',
    resolution: '중근·접점·수치 분해 한계',
    budget: '시간·분할·근 개수 제한',
  })[reason]

export function certificateSummary(c: RootCertificate): string {
  return c.complete
    ? `구간 검증 완료 · 단순 실근 ${c.uniqueRootCount}개 분리${c.allRootsRepresented === false ? ' · 계산 결과 목록과 대조 필요' : ''}`
    : `구간 검증 보류 · 검증한 길이 비율 ${Math.min(99.999, Math.floor(c.coverageLowerBound * 100000) / 1000).toFixed(3)}% · 미결정 ${c.unresolved.length}곳`
}

export function certificateReport(c: RootCertificate): string {
  return (
    [
      '## 구간 검증',
      certificateSummary(c),
      ...(c.model
        ? [
            '### 입력 모델',
            `\`\`\`text\n${c.model.source}\n\`\`\``,
            `파라미터: ${JSON.stringify(c.model.parameters)}`,
          ]
        : []),
      `검증 범위: ${c.variable} ∈ [${c.domain.min}, ${c.domain.max}]`,
      `유일근 분리 구간 ${c.uniqueRootCount}개 · 정의역 제외 구간 ${c.excludedDomainCount}개`,
      '이 비율은 구간 길이 기준이며 실근 포획 확률이 아닙니다. 입력한 Float64 상수의 실수 모델을 검증하며 측정 오차는 포함하지 않습니다.',
      '### 유일근 분리 구간',
      c.rootIntervals.map((i) => `- [${i.lo}, ${i.hi}]`).join('\n') || '없음',
      '### 미결정 구간',
      c.unresolved
        .map((i) => `- [${i.lo}, ${i.hi}]: ${unresolvedReason(i.reason)}`)
        .join('\n') || '없음',
    ].join('\n\n') + '\n'
  )
}
