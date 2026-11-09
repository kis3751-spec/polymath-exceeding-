import type { NonlinearNode } from './nonlinear-parser'
import {
  add,
  sub,
  mul,
  div,
  containsZero,
  evaluateIntervalJet,
  exactDyadicPolynomialCoefficients,
  differentiateExactDyadicPoly,
  evaluateExactDyadicPolynomialCenteredJet,
  differentiateNode,
  erfPoint,
  erfRange,
  normalCdfRange,
  nextDown,
  nextUp,
  type Interval,
  type IntervalJet,
  type ExactDyadic,
  dyadicToInterval,
} from './interval-arithmetic'
import { findPolynomialRealRoots } from './automatic-polynomial'
import { peelZeroPower, zeroPowerMultiplicity } from './search-analysis'
/** Approximate split hints only. Every resulting cell is still proved using
 * original AST/exact dyadic enclosures; a missing hint cannot certify absence. */
function approximateDyadicRoots(
  coefficients: readonly ExactDyadic[],
  bounds?: { min: number; max: number },
) {
  if (coefficients.length > 13) return { roots: [] as number[] }
  const scale = Math.max(
    ...coefficients
      .filter((c) => c.m !== 0n)
      .map((c) => c.e + c.m.toString(2).replace('-', '').length - 1),
  )
  const floats = coefficients.map((c) => {
    if (c.m === 0n) return 0
    const b = dyadicToInterval({ m: c.m, e: c.e - scale })
    return b.lo / 2 + b.hi / 2
  })
  if (!floats.every(Number.isFinite)) return { roots: [] as number[] }
  return findPolynomialRealRoots(floats, bounds)
}

export type UnresolvedInterval = Interval & {
  reason: 'domain' | 'unsupported' | 'nonsmooth' | 'resolution' | 'budget'
}

export type UnresolvedDiagnostic = UnresolvedInterval & {
  width: number
  valueEnclosure?: Interval
  derivativeEnclosure?: Interval
  signChange?: boolean
  detail: string
}

export type RootFreeInterval = Interval & { openLo?: boolean; openHi?: boolean }

export type RootSensitivityMetric = {
  rootValue: number
  bracket: Interval
  derivativeEnclosure: Interval
  /** Rigorous upper bound on |dx_star/dF| = 1 / |F'(x_star)| across the bracket when 0 not in F'(bracket) */
  perturbationGain?: number
  /** Outward-rounded upper bound on max(|rootValue - lo|, |hi - rootValue|) */
  enclosureRadius: number
}

export type GaussianPerturbationModel = {
  /** Single constant additive offset model: F(x) + epsilon = 0, epsilon ~ N(0, sigma^2) in residual units */
  model: 'additive_gaussian_residual'
  sigma: number
  /** True iff F and F' were completely certified on [min, max] with no exclusions */
  criticalPointsCertified: boolean
  /** True when scalar values are point estimates from midpoints while Bounds fields hold rigorous enclosures */
  pointApproximation?: boolean
  /** Minimum distance |F(x)| at domain endpoints and interior critical points */
  twoSidedSafetyMargin?: number
  /** Rigorous interval enclosure [lo, hi] of twoSidedSafetyMargin over certified critical-point brackets */
  twoSidedSafetyMarginBounds?: Interval
  /** P(|epsilon| < twoSidedSafetyMargin) = erf(margin / (sqrt(2)*sigma)) */
  twoSidedSafetyProbability?: number
  /** Rigorous interval enclosure [lo, hi] of twoSidedSafetyProbability */
  twoSidedSafetyProbabilityBounds?: Interval
  /** Point estimate of P(N_[min,max](epsilon) == N_0) under constant additive offset epsilon ~ N(0, sigma^2) */
  domainRootCountInvariance?: number
  /** Rigorous interval enclosure [lo, hi] of P(N_[min,max](epsilon) == N_0) over certified critical-point brackets */
  domainRootCountInvarianceBounds?: Interval
  /** Point estimate of P(N_R(epsilon) == N_0_R) over all real numbers (when polynomial) */
  realLineRootCountInvariance?: number
}

export type CompletenessMetrics = {
  /** 'certified' (when complete && allRootsRepresented === true), 'unresolved', or 'budget_truncated' */
  grade: 'certified' | 'unresolved' | 'budget_truncated'
  /** Lower bound on verified length fraction of [min, max] (in [0, 1], subdivision-invariant) */
  domainCoverage: number
  /** Outward-rounded total length of unresolved intervals (subdivision-invariant) */
  unresolvedMeasureUpper: number
  /** Defined ONLY when mathematically proven AND verified against solver list (complete && allRootsRepresented === true) */
  allRootsFoundProbability?: number
  /** Minimum |F(x_ext)| at certified non-root interior extrema */
  bifurcationMargin?: number
  /** Probability P(N_[min,max](epsilon) == N_0) under F(x) + epsilon = 0, epsilon ~ N(0, sigma^2) */
  inputPerturbationStability?: number
  /** Detailed Gaussian perturbation model metadata and rigorous interval enclosures */
  gaussianPerturbation?: GaussianPerturbationModel
  /** Why no probability is emitted; never converted into a guessed confidence. */
  perturbationUnavailableReason?: string
  /** Per-root rigorous enclosure radius and sensitivity upper bound */
  rootSensitivities: RootSensitivityMetric[]
}

export type RootCertificate = {
  model?: { source: string; parameters: Record<string, number> }
  domain: { min: number; max: number }
  variable: string
  /** Note when an outer positive integer power was peeled via a zero-equivalent expression */
  reduction?: string
  /** Domain classification, not a probability or a bound on the root error. */
  complete: boolean
  coverageLowerBound: number
  uniqueRootCount: number
  rootIntervals: Interval[]
  /** Root-free sets; open endpoint flags preserve a neighbouring known root. */
  rootFreeIntervals?: RootFreeInterval[]
  /** Contiguous intervals proven to lie outside the real expression domain */
  excludedIntervals?: Interval[]
  /** Deterministic diagnostics for each merged unresolved interval */
  unresolvedDiagnostics?: UnresolvedDiagnostic[]
  /** Rigorous completeness, enclosure radius, and Gaussian perturbation metrics */
  completeness?: CompletenessMetrics
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
  inputNoiseSigma?: number
  perturbationSigma?: number
  skipPerturbationModel?: boolean
}

const sign = (a: Interval) =>
  a.lo > 0 ? 1 : a.hi < 0 ? -1 : a.lo === 0 && a.hi === 0 ? 0 : undefined
const finite = (a: Interval) => Number.isFinite(a.lo) && Number.isFinite(a.hi)

function midpoint(a: Interval): number {
  const m = a.lo / 2 + a.hi / 2
  return Number.isFinite(m) ? m : 0
}

/** Merge intervals ONLY when they share an exact real endpoint (`prev.hi === curr.lo`) or overlap.
 * Never bridge across `(prev.hi, nextUp(prev.hi))`, which would absorb an unverified 1-ULP real gap. */
export function mergeContiguousIntervals(
  intervals: readonly Interval[],
): Interval[] {
  if (!intervals.length) return []
  const sorted = [...intervals].sort((a, b) => a.lo - b.lo || a.hi - b.hi)
  const merged: Interval[] = [{ ...sorted[0] }]
  for (let i = 1; i < sorted.length; i++) {
    const prev = merged.at(-1)!
    const curr = sorted[i]
    if (curr.lo <= prev.hi) {
      prev.hi = Math.max(prev.hi, curr.hi)
    } else {
      merged.push({ ...curr })
    }
  }
  return merged
}

/** Merge root-free sets without filling a point removed for a known root. */
function mergeRootFreeIntervals(
  intervals: RootFreeInterval[],
): RootFreeInterval[] {
  const sorted = [...intervals].sort((a, b) => a.lo - b.lo || a.hi - b.hi)
  const merged: RootFreeInterval[] = []
  for (const item of sorted) {
    const last = merged.at(-1)
    if (
      last &&
      (item.lo < last.hi ||
        (item.lo === last.hi && !(last.openHi && item.openLo)))
    ) {
      if (item.lo === last.lo) last.openLo = Boolean(last.openLo && item.openLo)
      if (item.hi > last.hi) {
        last.hi = item.hi
        last.openHi = item.openHi
      } else if (item.hi === last.hi)
        last.openHi = Boolean(last.openHi && item.openHi)
    } else merged.push({ ...item })
  }
  return merged
}

/** Outward-rounded upper bound on max(|center - interval.lo|, |interval.hi - center|).
 * Guarantees that [center - R, center + R] encloses [interval.lo, interval.hi] even when
 * the Float64 midpoint `lo/2 + hi/2` rounds to one endpoint (such as `[1, 1 + EPS]` -> `1`). */
export function enclosureRadiusFromCenter(
  interval: Interval,
  center = interval.lo / 2 + interval.hi / 2,
): number {
  const distUpper = (a: number, b: number): number => {
    if (b <= a) return 0
    const d = b - a
    if (!Number.isFinite(d)) return Infinity
    return nextUp(d)
  }
  return Math.max(
    distUpper(interval.lo, center),
    distUpper(center, interval.hi),
  )
}

export function buildRootSensitivityMetric(
  bracket: Interval,
  evaluateOrig: (x: Interval) => IntervalJet,
  reportedCenter = bracket.lo / 2 + bracket.hi / 2,
): RootSensitivityMetric {
  const radius = enclosureRadiusFromCenter(bracket, reportedCenter)
  const jet = evaluateOrig(bracket)
  const der = jet.domain === 'all' ? jet.der : { lo: -Infinity, hi: Infinity }
  let perturbationGain: number | undefined
  if (
    jet.domain === 'all' &&
    !jet.issue &&
    !containsZero(der) &&
    Number.isFinite(der.lo) &&
    Number.isFinite(der.hi)
  ) {
    const minAbsSlope = Math.min(Math.abs(der.lo), Math.abs(der.hi))
    if (minAbsSlope > 0) {
      perturbationGain = nextUp(1 / minAbsSlope)
    }
  }
  return {
    rootValue: reportedCenter,
    bracket,
    derivativeEnclosure: der,
    ...(perturbationGain !== undefined ? { perturbationGain } : {}),
    enclosureRadius: radius,
  }
}

function normalCdfSliceInterval(
  lo: number,
  hi: number,
  sigma: number,
): Interval {
  const s = { lo: sigma, hi: sigma }
  const zLo =
    lo === -Infinity
      ? { lo: -Infinity, hi: -Infinity }
      : lo === Infinity
        ? { lo: Infinity, hi: Infinity }
        : div({ lo, hi: lo }, s)
  const zHi =
    hi === -Infinity
      ? { lo: -Infinity, hi: -Infinity }
      : hi === Infinity
        ? { lo: Infinity, hi: Infinity }
        : div({ lo: hi, hi }, s)
  const cdfLo = normalCdfRange(zLo)
  const cdfHi = normalCdfRange(zHi)
  const diff = sub(cdfHi, cdfLo)
  return {
    lo: Math.max(0, Math.min(1, diff.lo)),
    hi: Math.max(0, Math.min(1, diff.hi)),
  }
}

function computeMonotoneSegmentGaussianBounds(
  knotIntervals: readonly Interval[],
  n0: number,
  sigma: number,
): Interval {
  const innerSegs: { lo: number; hi: number }[] = []
  const outerSegs: { lo: number; hi: number }[] = []
  const thresholdSet = new Set<number>()
  for (const y of knotIntervals) {
    if (Number.isFinite(y.lo)) thresholdSet.add(-y.lo)
    if (Number.isFinite(y.hi)) thresholdSet.add(-y.hi)
  }
  for (let i = 0; i + 1 < knotIntervals.length; i++) {
    const a = { lo: -knotIntervals[i].hi, hi: -knotIntervals[i].lo }
    const b = { lo: -knotIntervals[i + 1].hi, hi: -knotIntervals[i + 1].lo }
    outerSegs.push({ lo: Math.min(a.lo, b.lo), hi: Math.max(a.hi, b.hi) })
    const inLo = Math.min(a.hi, b.hi)
    const inHi = Math.max(a.lo, b.lo)
    innerSegs.push({ lo: inLo, hi: inHi })
  }
  const taus = [...thresholdSet].sort((a, b) => a - b)
  const bounds = [-Infinity, ...taus, Infinity]
  let probLo: Interval = { lo: 0, hi: 0 }
  let probHi: Interval = { lo: 0, hi: 0 }
  for (let r = 0; r + 1 < bounds.length; r++) {
    const lo = bounds[r]
    const hi = bounds[r + 1]
    if (lo === hi) continue
    let minCount = 0
    let maxCount = 0
    // Endpoints partition the real offset axis into open slabs. Compare the
    // complete slab, avoiding overflowing or unrepresentable Float64 midpoints.
    for (let i = 0; i < outerSegs.length; i++) {
      if (
        innerSegs[i].lo < innerSegs[i].hi &&
        lo >= innerSegs[i].lo &&
        hi <= innerSegs[i].hi
      )
        minCount++
      if (hi > outerSegs[i].lo && lo < outerSegs[i].hi) maxCount++
    }
    const slice = normalCdfSliceInterval(lo, hi, sigma)
    if (minCount === n0 && maxCount === n0) {
      probLo = add(probLo, slice)
      probHi = add(probHi, slice)
    } else if (minCount <= n0 && n0 <= maxCount) {
      probHi = add(probHi, slice)
    }
  }
  const lo = Math.max(0, Math.min(1, probLo.lo))
  const hi = Math.max(lo, Math.min(1, probHi.hi))
  return { lo, hi }
}

function computeMonotoneSegmentGaussianProbability(
  knotValues: readonly number[],
  n0: number,
  sigma: number,
): number {
  const ivs = knotValues.map((v) => ({ lo: v, hi: v }))
  const b = computeMonotoneSegmentGaussianBounds(ivs, n0, sigma)
  return 0.5 * (b.lo + b.hi)
}

function analyzeUnresolvedCell(
  cell: UnresolvedInterval,
  evaluateOrig: (x: Interval) => IntervalJet,
): UnresolvedDiagnostic {
  const width = Math.max(0, nextUp(cell.hi - cell.lo))
  const cellJet = evaluateOrig(cell)
  const lJet = evaluateOrig({ lo: cell.lo, hi: cell.lo })
  const rJet = evaluateOrig({ lo: cell.hi, hi: cell.hi })
  const sL = lJet.domain === 'all' ? sign(lJet.val) : undefined
  const sR = rJet.domain === 'all' ? sign(rJet.val) : undefined
  const signChange =
    sL !== undefined && sR !== undefined && sL !== 0 && sR !== 0 && sL !== sR
  const reasonText = unresolvedReason(cell.reason)
  const signText = signChange ? ' [양끝 부호 반전 확인]' : ''
  return {
    ...cell,
    width,
    ...(cellJet.domain === 'all' ? { valueEnclosure: cellJet.val } : {}),
    ...(cellJet.domain === 'all' ? { derivativeEnclosure: cellJet.der } : {}),
    ...(signChange ? { signChange: true } : {}),
    detail: `[${Number(cell.lo.toPrecision(8))}, ${Number(cell.hi.toPrecision(8))}] (폭 ≤ ${width.toExponential(2)}, 사유: ${reasonText})${signText}`,
  }
}

function isolateCriticalPointsFromJet(
  evaluateOrig: (x: Interval) => IntervalJet,
  domain: { min: number; max: number },
): { complete: boolean; brackets: Interval[] } {
  const queue: { iv: Interval; depth: number }[] = [
    { iv: { lo: domain.min, hi: domain.max }, depth: 0 },
  ]
  const rawBrackets: Interval[] = []
  let steps = 0
  while (queue.length > 0) {
    if (++steps > 2048) return { complete: false, brackets: [] }
    const { iv, depth } = queue.pop()!
    const jet = evaluateOrig(iv)
    if (jet.domain !== 'all') return { complete: false, brackets: [] }
    if (!containsZero(jet.der)) continue
    const mid = iv.lo / 2 + iv.hi / 2
    const span = Math.max(1, Math.abs(domain.min), Math.abs(domain.max))
    if (
      depth >= 44 ||
      mid === iv.lo ||
      mid === iv.hi ||
      iv.hi - iv.lo <= 1e-12 * span
    ) {
      return { complete: false, brackets: [] }
    }
    queue.push(
      { iv: { lo: mid, hi: iv.hi }, depth: depth + 1 },
      { iv: { lo: iv.lo, hi: mid }, depth: depth + 1 },
    )
  }
  const merged = mergeContiguousIntervals(rawBrackets).filter(
    (b) => b.hi > domain.min && b.lo < domain.max,
  )
  return { complete: true, brackets: merged }
}

/**
 * Compute rigorous completeness, enclosure radius, and certified Gaussian additive
 * perturbation metrics (`F(x) + epsilon = 0, epsilon ~ N(0, sigma^2)`).
 * Always evaluates perturbation, critical points, and safety margins on the ORIGINAL
 * unpeeled expression `F` and `F'` rather than any zero-power reduced helper.
 */
export function computeCompletenessMetrics(
  cert: RootCertificate,
  arg2: NonlinearNode | ((x: Interval) => IntervalJet),
  arg3?: ((x: Interval) => IntervalJet) | NonlinearNode | null,
  arg4?: readonly ExactDyadic[] | readonly number[] | null | string,
  arg5?: NonlinearNode | null | Record<string, number>,
  arg6?: string | Map<string, NonlinearNode>,
  arg7?: Record<string, number> | number,
  arg8?: Map<string, NonlinearNode>,
  arg9 = 1e-6,
): CompletenessMetrics {
  let origNode: NonlinearNode | undefined
  let evaluateOrig: (x: Interval) => IntervalJet
  let exactPoly: readonly ExactDyadic[] | null = null
  let d1Node: NonlinearNode | null = null
  let variable: string = cert.variable ?? 'x'
  let parameters: Record<string, number> = {}
  let helpers: Map<string, NonlinearNode> = new Map()
  let sigma = 1e-6

  if (typeof arg2 === 'function') {
    // 7-argument signature: (cert, evaluateOrig, d1Node, variable, parameters, helpers, sigma)
    evaluateOrig = arg2
    d1Node = (arg3 as NonlinearNode | null) ?? null
    if (typeof arg4 === 'string') variable = arg4
    if (arg5 && typeof arg5 === 'object' && !('kind' in arg5)) {
      parameters = arg5 as Record<string, number>
    }
    if (arg6 instanceof Map) helpers = arg6
    if (typeof arg7 === 'number') sigma = arg7
  } else {
    // 9-argument signature: (cert, origNode, evaluateOrig, exactPoly, origD1Node, variable, parameters, helpers, sigma)
    origNode = arg2
    evaluateOrig = arg3 as (x: Interval) => IntervalJet
    if (
      Array.isArray(arg4) &&
      arg4.length > 0 &&
      typeof arg4[0] === 'object' &&
      arg4[0] !== null &&
      'm' in arg4[0]
    ) {
      exactPoly = arg4 as readonly ExactDyadic[]
    }
    d1Node = (arg5 as NonlinearNode | null) ?? null
    if (typeof arg6 === 'string') variable = arg6
    if (arg7 && typeof arg7 === 'object') {
      parameters = arg7 as Record<string, number>
    }
    if (arg8 instanceof Map) helpers = arg8
    sigma = arg9
  }

  // Merge contiguous unresolved cells of the same reason so subdivision of an unresolved
  // region into 1 cell vs k cells never alters any measure or diagnostic.
  const mergedUnresolved: UnresolvedInterval[] = []
  for (const item of [...cert.unresolved].sort(
    (a, b) => a.lo - b.lo || a.hi - b.hi,
  )) {
    const prev = mergedUnresolved.at(-1)
    if (prev && prev.reason === item.reason && item.lo <= prev.hi) {
      prev.hi = Math.max(prev.hi, item.hi)
    } else {
      mergedUnresolved.push({ ...item })
    }
  }

  let unresolvedMeasureUpper = 0
  for (const cell of mergedUnresolved) {
    unresolvedMeasureUpper = nextUp(
      unresolvedMeasureUpper + nextUp(cell.hi - cell.lo),
    )
  }

  const rootSensitivities = cert.rootIntervals.map((iv) =>
    buildRootSensitivityMetric(iv, evaluateOrig),
  )

  // Section E: Require strict `cert.allRootsRepresented === true` before claiming
  // `grade: 'certified'` or `allRootsFoundProbability: 1`.
  const grade: CompletenessMetrics['grade'] =
    cert.complete && cert.allRootsRepresented === true
      ? 'certified'
      : cert.budgetExhausted
        ? 'budget_truncated'
        : 'unresolved'

  const allRootsFoundProbability =
    cert.complete && cert.allRootsRepresented === true ? 1 : undefined

  let bifurcationMargin: number | undefined
  let inputPerturbationStability: number | undefined
  let gaussianPerturbation: GaussianPerturbationModel | undefined

  if (
    cert.complete &&
    cert.excludedDomainCount === 0 &&
    Number.isFinite(sigma) &&
    sigma > 0
  ) {
    // Section D: Always certify critical points of the ORIGINAL function F (not the peeled expression)
    function peelZeroFactorsAndPowers(n: NonlinearNode): NonlinearNode {
      if (n.kind === 'unary') return peelZeroFactorsAndPowers(n.child)
      if (
        n.kind === 'binary' &&
        (n.operator === '+' || n.operator === '-') &&
        n.right.kind === 'number' &&
        n.right.value === 0
      ) {
        return peelZeroFactorsAndPowers(n.left)
      }
      if (n.kind === 'binary' && n.operator === '*') {
        if (
          n.left.kind === 'number' &&
          Number.isFinite(n.left.value) &&
          n.left.value !== 0
        ) {
          return peelZeroFactorsAndPowers(n.right)
        }
        if (
          n.right.kind === 'number' &&
          Number.isFinite(n.right.value) &&
          n.right.value !== 0
        ) {
          return peelZeroFactorsAndPowers(n.left)
        }
      }
      if (
        n.kind === 'binary' &&
        n.operator === '/' &&
        n.right.kind === 'number' &&
        Number.isFinite(n.right.value) &&
        n.right.value !== 0
      ) {
        return peelZeroFactorsAndPowers(n.left)
      }
      if (
        n.kind === 'binary' &&
        n.operator === '^' &&
        n.right.kind === 'number' &&
        Number.isInteger(n.right.value) &&
        n.right.value > 0
      ) {
        return peelZeroFactorsAndPowers(n.left)
      }
      if (
        n.kind === 'call' &&
        n.name === 'pow' &&
        n.args[1]?.kind === 'number' &&
        Number.isInteger(n.args[1].value) &&
        n.args[1].value > 0
      ) {
        return peelZeroFactorsAndPowers(n.args[0])
      }
      return n
    }
    const rawOrigD1 = origNode
      ? differentiateNode(origNode, variable, helpers)
      : d1Node
    const origD1 = rawOrigD1 ? peelZeroFactorsAndPowers(rawOrigD1) : null
    let dCert: RootCertificate | undefined
    if (origD1) {
      try {
        dCert = certifyScalarRoots(
          origD1,
          variable,
          parameters,
          helpers,
          cert.domain,
          {
            maxIntervals: 2000,
            maxMs: 80,
            skipPerturbationModel: true,
          },
        )
      } catch {
        dCert = undefined
      }
    }

    const narrowDerivBracket = (iv: Interval): Interval => {
      if (iv.lo === iv.hi) return iv
      let { lo, hi } = iv
      const evalD1Sign = (x: number): number | undefined => {
        const j = origD1
          ? evaluateIntervalJet(
              origD1,
              variable,
              { lo: x, hi: x },
              parameters,
              helpers,
            )
          : evaluateOrig({ lo: x, hi: x })
        if (j.domain !== 'all') return undefined
        const v = origD1 ? j.val : j.der
        return sign(v)
      }
      const left = evalD1Sign(lo)
      if (left === undefined) return iv
      if (left === 0) return { lo, hi: lo }
      const right = evalD1Sign(hi)
      if (right === 0) return { lo: hi, hi }
      for (let i = 0; i < 64; i++) {
        const mid = lo / 2 + hi / 2
        if (mid === lo || mid === hi) break
        const sm = evalD1Sign(mid)
        if (sm === undefined) break
        if (sm === 0) return { lo: mid, hi: mid }
        if (sm === left) lo = mid
        else hi = mid
      }
      return { lo, hi }
    }

    let critBrackets: Interval[] | undefined
    if (dCert && dCert.complete && dCert.excludedDomainCount === 0) {
      critBrackets = dCert.rootIntervals
        .map(narrowDerivBracket)
        .filter((iv) => iv.hi > cert.domain.min && iv.lo < cert.domain.max)
        .sort((a, b) => a.lo - b.lo)
    } else if (!origD1) {
      const fallback = isolateCriticalPointsFromJet(evaluateOrig, cert.domain)
      if (fallback.complete) {
        critBrackets = mergeContiguousIntervals(
          fallback.brackets.map(narrowDerivBracket),
        )
          .filter((iv) => iv.hi > cert.domain.min && iv.lo < cert.domain.max)
          .sort((a, b) => a.lo - b.lo)
      }
    }

    if (critBrackets !== undefined) {
      const knotBrackets: Interval[] = [
        { lo: cert.domain.min, hi: cert.domain.min },
        ...critBrackets,
        { lo: cert.domain.max, hi: cert.domain.max },
      ]
      const knotIntervals: Interval[] = []
      const knotValues: number[] = []
      let validKnots = true
      for (const kb of knotBrackets) {
        const kj = evaluateOrig(kb)
        if (
          kj.domain !== 'all' ||
          !Number.isFinite(kj.val.lo) ||
          !Number.isFinite(kj.val.hi)
        ) {
          validKnots = false
          break
        }
        knotIntervals.push(kj.val)
        knotValues.push(midpoint(kj.val))
      }

      if (validKnots) {
        const distFromZero = (iv: Interval): Interval => {
          if (iv.lo > 0) return { lo: iv.lo, hi: iv.hi }
          if (iv.hi < 0) return { lo: -iv.hi, hi: -iv.lo }
          return { lo: 0, hi: Math.max(Math.abs(iv.lo), Math.abs(iv.hi)) }
        }
        const interiorMargins = critBrackets
          .map((cb, idx) => ({
            cb,
            dist: distFromZero(knotIntervals[idx + 1]),
          }))
          .filter(
            ({ cb, dist }) =>
              dist.lo > 0 &&
              !cert.rootIntervals.some(
                (r) => Math.max(cb.lo, r.lo) <= Math.min(cb.hi, r.hi),
              ),
          )
          .map(({ dist }) => dist.lo)
        if (interiorMargins.length > 0) {
          bifurcationMargin = Math.min(...interiorMargins)
        }

        const knotDists = knotIntervals.map(distFromZero)
        const safetyMarginBounds: Interval = {
          lo: Math.min(...knotDists.map((d) => d.lo)),
          hi: Math.min(...knotDists.map((d) => d.hi)),
        }
        const twoSidedSafetyMargin = midpoint(safetyMarginBounds)

        // Section B: Use rigorous interval erfRange(div(marginBounds, sqrt(2)*sigma))
        const SQRT2_IV: Interval = {
          lo: Math.SQRT2,
          hi: nextUp(Math.SQRT2),
        }
        const denomIv = mul(SQRT2_IV, { lo: sigma, hi: sigma })
        const safetyProbBounds = erfRange(div(safetyMarginBounds, denomIv))
        const twoSidedSafetyProbability = midpoint(safetyProbBounds)

        const domainInvarianceBounds = computeMonotoneSegmentGaussianBounds(
          knotIntervals,
          cert.uniqueRootCount,
          sigma,
        )
        const domainInvariance = midpoint(domainInvarianceBounds)
        const pointApproximation =
          domainInvarianceBounds.lo < domainInvarianceBounds.hi ||
          safetyMarginBounds.lo < safetyMarginBounds.hi

        inputPerturbationStability = domainInvariance
        gaussianPerturbation = {
          model: 'additive_gaussian_residual',
          sigma,
          criticalPointsCertified: true,
          pointApproximation,
          twoSidedSafetyMargin,
          twoSidedSafetyMarginBounds: safetyMarginBounds,
          twoSidedSafetyProbability,
          twoSidedSafetyProbabilityBounds: safetyProbBounds,
          domainRootCountInvariance: domainInvariance,
          domainRootCountInvarianceBounds: domainInvarianceBounds,
        }
      }
    }
  }

  return {
    grade,
    domainCoverage: cert.coverageLowerBound,
    unresolvedMeasureUpper,
    ...(allRootsFoundProbability !== undefined
      ? { allRootsFoundProbability }
      : {}),
    ...(bifurcationMargin !== undefined ? { bifurcationMargin } : {}),
    ...(inputPerturbationStability !== undefined
      ? { inputPerturbationStability }
      : {}),
    ...(gaussianPerturbation
      ? { gaussianPerturbation }
      : {
          perturbationUnavailableReason: !cert.complete
            ? '미결정 구간이 남아 근 개수 변화를 결정할 수 없습니다.'
            : cert.excludedDomainCount > 0
              ? '열린 정의역 경계 또는 제외 구간이 있어 닫힌 연속 구간 모형을 적용하지 않습니다.'
              : !Number.isFinite(sigma) || sigma <= 0
                ? '가정한 오프셋 표준편차 σ는 양의 유한한 수여야 합니다.'
                : '원래 함수 도함수의 모든 임계점을 분리하지 못해 확률 상하한을 승인하지 않았습니다.',
        }),
    rootSensitivities,
  }
}

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

  // Peel only explicit symbolic outer positive integer powers: (f(x))^k = 0 <=> f(x) = 0.
  // Never replace the AST with Float64-expanded polynomial coefficients or approximate GCDs.
  const working = peelZeroPower(node)
  const reduction =
    zeroPowerMultiplicity(node) > 1
      ? '양의 정수 거듭제곱을 제거한 영점 동치식으로 서로 다른 근을 검증했습니다. 중복도 자체를 구간으로 증명하지는 않습니다.'
      : undefined

  const constants = { pi: Math.PI, e: Math.E, ...parameters }
  const exactWorkingPoly = exactDyadicPolynomialCoefficients(
    working,
    variable,
    constants,
    helpers,
  )
  const origExactPoly =
    working === node
      ? exactWorkingPoly
      : exactDyadicPolynomialCoefficients(node, variable, constants, helpers)
  const origD1Node = differentiateNode(node, variable, helpers)

  let polyCriticalPoints: number[] = []
  if (exactWorkingPoly && exactWorkingPoly.length >= 3) {
    const dPoly = differentiateExactDyadicPoly(exactWorkingPoly)
    polyCriticalPoints = approximateDyadicRoots(dPoly, bounds).roots
  }

  const splitPoints = polyCriticalPoints
    .filter((cp) => cp > bounds.min && cp < bounds.max)
    .sort((a, b) => a - b)

  const initialCells: { lo: number; hi: number; depth: number }[] = []
  let cursor = bounds.min
  for (const sp of splitPoints) {
    if (sp > cursor && sp < bounds.max) {
      initialCells.push({ lo: cursor, hi: sp, depth: 0 })
      cursor = sp
    }
  }
  initialCells.push({ lo: cursor, hi: bounds.max, depth: 0 })
  const queue = initialCells.reverse()

  const unresolved: UnresolvedInterval[] = [],
    rootIntervals: Interval[] = [],
    rawRootFree: RootFreeInterval[] = [],
    rawExcluded: Interval[] = []
  let processedIntervals = 0,
    excludedDomainCount = 0,
    budgetExhausted = false

  const evaluateOrig = (x: Interval): IntervalJet => {
    const astJet = evaluateIntervalJet(node, variable, x, parameters, helpers)
    if (!origExactPoly || astJet.domain !== 'all') return astJet
    let taylorJet: IntervalJet
    try {
      taylorJet = evaluateExactDyadicPolynomialCenteredJet(
        origExactPoly,
        x,
        polyCriticalPoints,
      )
    } catch {
      return astJet
    }
    if (
      Math.max(astJet.val.lo, taylorJet.val.lo) >
        Math.min(astJet.val.hi, taylorJet.val.hi) ||
      Math.max(astJet.der.lo, taylorJet.der.lo) >
        Math.min(astJet.der.hi, taylorJet.der.hi)
    )
      return astJet
    return {
      ...astJet,
      val: {
        lo: Math.max(astJet.val.lo, taylorJet.val.lo),
        hi: Math.min(astJet.val.hi, taylorJet.val.hi),
      },
      der: {
        lo: Math.max(astJet.der.lo, taylorJet.der.lo),
        hi: Math.min(astJet.der.hi, taylorJet.der.hi),
      },
    }
  }

  const evaluate = (x: Interval): IntervalJet => {
    const astJet = evaluateIntervalJet(
      working,
      variable,
      x,
      parameters,
      helpers,
    )
    if (!exactWorkingPoly || astJet.domain !== 'all') return astJet
    let taylorJet: IntervalJet
    try {
      taylorJet = evaluateExactDyadicPolynomialCenteredJet(
        exactWorkingPoly,
        x,
        polyCriticalPoints,
      )
    } catch {
      return astJet
    }
    if (
      Math.max(astJet.val.lo, taylorJet.val.lo) >
        Math.min(astJet.val.hi, taylorJet.val.hi) ||
      Math.max(astJet.der.lo, taylorJet.der.lo) >
        Math.min(astJet.der.hi, taylorJet.der.hi)
    )
      return astJet
    return {
      ...astJet,
      val: {
        lo: Math.max(astJet.val.lo, taylorJet.val.lo),
        hi: Math.min(astJet.val.hi, taylorJet.val.hi),
      },
      der: {
        lo: Math.max(astJet.der.lo, taylorJet.der.lo),
        hi: Math.min(astJet.der.hi, taylorJet.der.hi),
      },
    }
  }

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
      rawExcluded.push({ lo: cell.lo, hi: cell.hi })
      continue
    }
    if (jet.domain === 'all' && !containsZero(jet.val)) {
      rawRootFree.push({ lo: cell.lo, hi: cell.hi })
      continue
    }
    if (jet.domain === 'all' && !jet.issue && !containsZero(jet.der)) {
      const left = evaluate({ lo: cell.lo, hi: cell.lo }),
        right = evaluate({ lo: cell.hi, hi: cell.hi })
      const s0 = left.domain === 'all' ? sign(left.val) : undefined,
        s1 = right.domain === 'all' ? sign(right.val) : undefined
      if (s0 === 0) {
        root({ lo: cell.lo, hi: cell.lo })
        if (cell.lo < cell.hi)
          rawRootFree.push({ lo: cell.lo, hi: cell.hi, openLo: true })
        continue
      }
      if (s1 === 0) {
        root({ lo: cell.hi, hi: cell.hi })
        if (cell.lo < cell.hi)
          rawRootFree.push({ lo: cell.lo, hi: cell.hi, openHi: true })
        continue
      }
      if (s0 !== undefined && s1 !== undefined) {
        if (s0 !== s1) root({ lo: cell.lo, hi: cell.hi })
        else rawRootFree.push({ lo: cell.lo, hi: cell.hi })
        continue
      }
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
  const merged: UnresolvedInterval[] = []
  for (const cell of unresolved) {
    const previous = merged.at(-1)
    if (previous && previous.reason === cell.reason && previous.hi >= cell.lo)
      previous.hi = Math.max(previous.hi, cell.hi)
    else merged.push({ ...cell })
  }
  let widthUpper = 0
  for (const cell of merged)
    widthUpper = nextUp(widthUpper + nextUp(cell.hi - cell.lo))
  const totalLower = nextDown(bounds.max - bounds.min)
  const complete = merged.length === 0
  const coverageLowerBound = complete
    ? 1
    : totalLower <= 0
      ? 0
      : Math.max(0, nextDown(1 - nextUp(widthUpper / totalLower)))

  const sortedRoots = rootIntervals.sort((a, b) => a.lo - b.lo)
  const rootFreeIntervals = mergeRootFreeIntervals(rawRootFree)
  const excludedIntervals = mergeContiguousIntervals(rawExcluded)
  const unresolvedDiagnostics = merged.map((u) =>
    analyzeUnresolvedCell(u, evaluateOrig),
  )

  const cert: RootCertificate = {
    domain: bounds,
    variable,
    ...(reduction ? { reduction } : {}),
    complete,
    coverageLowerBound,
    uniqueRootCount: sortedRoots.length,
    rootIntervals: sortedRoots,
    rootFreeIntervals,
    excludedIntervals,
    unresolved: merged,
    unresolvedDiagnostics,
    excludedDomainCount,
    processedIntervals,
    budgetExhausted,
    elapsedMs: performance.now() - start,
  }
  if (!options.skipPerturbationModel) {
    cert.completeness = computeCompletenessMetrics(
      cert,
      node,
      evaluateOrig,
      origExactPoly,
      origD1Node,
      variable,
      parameters,
      helpers,
      options.inputNoiseSigma ?? options.perturbationSigma ?? 1e-6,
    )
  }
  return cert
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
    ? `구간 검증 완료 · ${c.reduction ? '영점 동치식 기준 서로 다른 실근' : '단순 실근'} ${c.uniqueRootCount}개 분리${c.allRootsRepresented !== true ? ' · 계산 결과 목록과 대조 필요' : ''}`
    : `구간 검증 보류 · 검증한 길이 비율 ${Math.min(99.999, Math.floor(c.coverageLowerBound * 100000) / 1000).toFixed(3)}% · 미결정 ${c.unresolved.length}곳`
}

/** Outward percentage endpoints. Displaying a near-one bound as exactly
 * 100% would turn an interval statement into an unsupported certainty. */
export function probabilityIntervalText(bounds?: Interval): string {
  if (
    !bounds ||
    !Number.isFinite(bounds.lo) ||
    !Number.isFinite(bounds.hi) ||
    bounds.lo > bounds.hi ||
    bounds.hi < 0 ||
    bounds.lo > 1
  )
    return '미산정'
  const lo = Math.max(0, bounds.lo),
    hi = Math.min(1, bounds.hi)
  if (lo === 0 && hi === 0) return '0%'
  if (lo === 1 && hi === 1) return '100%'
  const scale = 10000
  const lower =
    lo === 0
      ? 0
      : Math.max(0, Math.floor(nextDown(nextDown(lo * 100) * scale)) / scale)
  const upper =
    hi === 1
      ? 100
      : Math.min(100, Math.ceil(nextUp(nextUp(hi * 100) * scale)) / scale)
  return `${lower.toFixed(4)}–${upper.toFixed(4)}%`
}

export function certificateReport(c: RootCertificate): string {
  const comp = c.completeness
  const gp = comp?.gaussianPerturbation
  const gaussLines =
    gp?.criticalPointsCertified && Number.isFinite(gp.sigma) && gp.sigma > 0
      ? [
          `### 가우스 상수 오프셋 모형 (F(x) + ε = 0, ε ~ N(0, σ²), σ = ${gp.sigma})`,
          `- 탐색 구간 [${c.domain.min}, ${c.domain.max}] 내 근 개수(${c.uniqueRootCount}개) 유지 확률 포함 구간: ${probabilityIntervalText(gp.domainRootCountInvarianceBounds)}`,
          ...(gp.twoSidedSafetyMarginBounds !== undefined
            ? [
                `- 양방향 안전 반경 Δ ∈ [${gp.twoSidedSafetyMarginBounds.lo}, ${gp.twoSidedSafetyMarginBounds.hi}]`,
              ]
            : []),
          `- 안전 반경 내 오차 확률 P(|ε| < Δ) 포함 구간: ${probabilityIntervalText(gp.twoSidedSafetyProbabilityBounds)}`,
          '이 값은 지정한 유한 범위와 하나의 일정한 가우스 오프셋 모형에 대한 포함 구간입니다. 미발견 근의 포획 확률이 아니며, 안전 반경 사건과 근 개수 유지 사건은 서로 다릅니다.',
        ]
      : [
          '### 가우스 상수 오프셋 모형',
          `확률 미산정: ${comp?.perturbationUnavailableReason ?? '원래 함수 임계점 또는 가정한 오차 모형의 검증이 완료되지 않았습니다.'}`,
        ]

  return (
    [
      '## 구간 검증',
      certificateSummary(c),
      ...(c.reduction ? [c.reduction] : []),
      ...(c.model
        ? [
            '### 입력 모델',
            `\`\`\`text\n${c.model.source}\n\`\`\``,
            `파라미터: ${JSON.stringify(c.model.parameters)}`,
          ]
        : []),
      `검증 범위: ${c.variable} ∈ [${c.domain.min}, ${c.domain.max}]`,
      `유일근 분리 구간 ${c.uniqueRootCount}개 · 해 부재 증명 구간 ${c.rootFreeIntervals?.length ?? 0}개 · 정의역 제외 구간 ${c.excludedDomainCount}개`,
      '이 비율은 구간 길이 기준이며 실근 포획 확률이 아닙니다. 입력한 Float64 상수의 실수 모델을 검증하며 측정 오차는 포함하지 않습니다.',
      ...gaussLines,
      '### 유일근 분리 구간',
      c.rootIntervals
        .map((i, idx) => {
          const sens = comp?.rootSensitivities[idx]
          const rad = sens
            ? ` (중심 ${sens.rootValue} 기준 바깥 반올림 오차 반경 ±${sens.enclosureRadius})`
            : ''
          return `- [${i.lo}, ${i.hi}]${rad}`
        })
        .join('\n') || '없음',
      '### 미결정 구간',
      c.unresolved
        .map((i) => `- [${i.lo}, ${i.hi}]: ${unresolvedReason(i.reason)}`)
        .join('\n') || '없음',
    ].join('\n\n') + '\n'
  )
}

/** Synchronize only the list-comparison state after the automatic solver has
 * matched its displayed solutions with the already computed certificate. */
export function finalizeCertificateMetrics(cert: RootCertificate): void {
  if (!cert.completeness) return
  const matched = cert.complete && cert.allRootsRepresented === true
  cert.completeness.grade = matched
    ? 'certified'
    : cert.budgetExhausted
      ? 'budget_truncated'
      : 'unresolved'
  if (matched) cert.completeness.allRootsFoundProbability = 1
  else delete cert.completeness.allRootsFoundProbability
}
