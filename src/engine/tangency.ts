import type { RootStructure, TangencyVerification } from './index'
import { nextDown, nextUp } from './interval-arithmetic'

export type ScalarEvaluator = (x: number, p: number) => number | undefined
export type DerivativeEstimate = {
  value: number
  error: number
  oneSided: boolean
}
const eps = Number.EPSILON
export type DerivativeOrder = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
const orders: DerivativeOrder[] = [1, 2, 3, 4, 5, 6, 7, 8]
const factorial = [1, 1, 2, 6, 24, 120, 720, 5040, 40320]

// Polynomial-exact finite difference weights. The stencil is dimensionless;
// Richardson comparison below measures sensitivity to the physical step size.
function weights(nodes: number[], order: number) {
  const n = nodes.length
  const a = Array.from({ length: n }, (_, k) => [
    ...nodes.map((x) => x ** k),
    k === order ? factorial[order] : 0,
  ])
  for (let k = 0; k < n; k++) {
    let pivot = k
    for (let j = k + 1; j < n; j++)
      if (Math.abs(a[j][k]) > Math.abs(a[pivot][k])) pivot = j
    ;[a[k], a[pivot]] = [a[pivot], a[k]]
    const d = a[k][k]
    for (let j = k; j <= n; j++) a[k][j] /= d
    for (let i = 0; i < n; i++)
      if (i !== k) {
        const f = a[i][k]
        for (let j = k; j <= n; j++) a[i][j] -= f * a[k][j]
      }
  }
  return a.map((row) => row[n])
}
const makeStencils = (radius: number) => [
  Array.from({ length: 2 * radius + 1 }, (_, i) => i - radius),
  Array.from({ length: 2 * radius + 1 }, (_, i) => i),
  Array.from({ length: 2 * radius + 1 }, (_, i) => -i),
]
const families = [3, 5].map((radius) => {
  const stencils = makeStencils(radius)
  return {
    stencils,
    weights: stencils.map((nodes) =>
      orders.map((order) =>
        order < nodes.length ? weights(nodes, order) : [],
      ),
    ),
  }
})
export function adaptiveDerivative(
  evaluate: (x: number) => number | undefined,
  x: number,
  order: DerivativeOrder = 1,
  wideStencil = false,
): DerivativeEstimate | undefined {
  const family = families[order <= 4 && !wideStencil ? 0 : 1]
  const stencils = family.stencils
  const initial = eps ** (1 / stencils[0].length) * Math.max(1, Math.abs(x))
  const sample = (h: number, stencil: number) => {
    const nodes = stencils[stencil]
    const values = nodes.map((n) => evaluate(x + n * h))
    if (values.some((v) => v === undefined || !Number.isFinite(v)))
      return undefined
    const w = family.weights[stencil][order - 1]
    let sum = 0,
      magnitude = 0
    values.forEach((v, i) => {
      sum += w[i] * v!
      magnitude += Math.abs(w[i] * v!)
    })
    return {
      value: sum / h ** order,
      roundoff: (64 * eps * magnitude) / h ** order,
    }
  }
  for (let attempt = 0; attempt < 6; attempt++) {
    const h = initial / 2 ** attempt
    for (let stencil = 0; stencil < 3; stencil++) {
      const coarse = sample(h, stencil),
        fine = sample(h / 2, stencil)
      if (coarse && fine)
        return {
          value: fine.value,
          error:
            Math.abs(coarse.value - fine.value) +
            coarse.roundoff +
            fine.roundoff,
          oneSided: stencil !== 0,
        }
    }
  }
  return undefined
}

/** Local numerical verification, not a symbolic proof or a two-parameter cusp certificate. */
export function verifyScalarTangency(
  evaluate: ScalarEvaluator,
  seedX: number,
  seedP: number,
  seedSlope?: number,
): TangencyVerification | undefined {
  if (!Number.isFinite(seedX) || !Number.isFinite(seedP)) return undefined
  // Fp=0 does not satisfy the fold normal form. Preserve the multiplicity
  // without pretending that a crossing or a pitchfork is a two-root merge.
  const seedFp = adaptiveDerivative((p) => evaluate(seedX, p), seedP)
  if (
    evaluate(seedX, seedP) === 0 &&
    (seedSlope === undefined || seedSlope === 0) &&
    seedFp &&
    Math.abs(seedFp.value) <= 8 * seedFp.error
  ) {
    const kind = classifyScalarRoot((x) => evaluate(x, seedP), seedX)
    if (kind.order && kind.order >= 2 && kind.order <= 8) {
      const ds = ([1, 2, 3, 4] as const).map((n) =>
        adaptiveDerivative((x) => evaluate(x, seedP), seedX, n),
      )
      if (ds.every(Boolean))
        return {
          verified: true,
          bifurcationOrder: kind.order as 2 | 3 | 4 | 5 | 6 | 7 | 8,
          multiplicity: kind.order,
          geometry: 'degenerate',
          parameterStar: seedP,
          valuesStar: [seedX],
          terminalSlope: ds[0]!.value,
          oppositeSlopeSigns: false,
          curvatureFxx: ds[1]!.value,
          curvatureFxxx: ds[2]!.value,
          curvatureFxxxx: ds[3]!.value,
          sensitivityFp: seedFp.value,
          residualAtStar: 0,
          slopeAtStar: Math.abs(ds[0]!.value),
          geometricSummary: `${kind.order}중근 국소 수치 판정. 파라미터 방향 도함수도 0이어서 교차·분화·병합의 위상은 이 판정만으로 지정하지 않습니다.`,
        }
    }
  }
  for (const order of [8, 7, 6, 5, 4, 3, 2] as const) {
    let x = seedX,
      p = seedP
    let failed = false
    let converged = false
    for (let i = 0; i < 14; i++) {
      const f = evaluate(x, p)
      const fp = adaptiveDerivative((q) => evaluate(x, q), p)
      const lower = adaptiveDerivative(
        (y) => evaluate(y, p),
        x,
        (order - 1) as DerivativeOrder,
        order > 4,
      )
      const high = adaptiveDerivative(
        (y) => evaluate(y, p),
        x,
        order,
        order > 4,
      )
      if (
        f === undefined ||
        !fp ||
        !lower ||
        !high ||
        Math.abs(fp.value) <= fp.error ||
        Math.abs(high.value) <= high.error
      ) {
        failed = true
        break
      }
      const dx = lower.value / high.value
      if (!Number.isFinite(dx) || Math.abs(dx) > Math.max(1, Math.abs(seedX))) {
        failed = true
        break
      }
      const nextX = x - dx
      // A boundary must never be projected outside the actual expression domain.
      if (evaluate(nextX, p) === undefined) {
        failed = true
        break
      }
      x = nextX
      const next = evaluate(x, p)
      if (next === undefined) {
        failed = true
        break
      }
      p -= next / fp.value
      if (
        Math.abs(x - seedX) > Math.max(1, Math.abs(seedX)) ||
        Math.abs(p - seedP) > Math.max(1, Math.abs(seedP))
      ) {
        failed = true
        break
      }
      if (
        Math.abs(dx) <=
        32 * eps * Math.max(1, Math.abs(x)) +
          (8 * lower.error) / (Math.abs(high.value) - high.error)
      ) {
        converged = true
        if (Math.abs(dx) <= 32 * eps * Math.max(1, Math.abs(x))) break
      }
    }
    if (failed || !converged) continue
    if (
      Math.abs(x - seedX) <= 32 * eps * Math.max(1, Math.abs(seedX)) &&
      atDomainBoundary((y) => evaluate(y, p), seedX)
    )
      x = seedX
    const f = evaluate(x, p),
      fp = adaptiveDerivative((q) => evaluate(x, q), p)
    const ds = orders
      .slice(0, Math.max(4, order))
      .map((n) => adaptiveDerivative((y) => evaluate(y, p), x, n))
    if (f === undefined || !fp || ds.some((d) => !d)) continue
    const tolerance =
      128 *
      eps *
      Math.max(
        Number.MIN_VALUE,
        Math.abs(fp.value) * Math.max(1, Math.abs(p)),
        ...ds.map((d) => Math.abs(d!.value)),
      )
    if (Math.abs(f) > tolerance || Math.abs(fp.value) <= fp.error) continue
    if (
      ds
        .slice(0, order - 1)
        .some((d) => Math.abs(d!.value) > 8 * d!.error + tolerance)
    )
      continue
    if (Math.abs(ds[order - 1]!.value) <= 8 * ds[order - 1]!.error + tolerance)
      continue
    const boundary =
      ds[0]!.oneSided && atDomainBoundary((y) => evaluate(y, p), x)
    const label = boundary
      ? '정의역 경계 접점'
      : order === 3
        ? '3중 접점·변곡 분기'
        : order === 4
          ? '고차 평탄 접점 (4차)'
          : order > 4
            ? `${order}중 접점`
            : '2차 접점·중근'
    return {
      verified: true,
      bifurcationOrder: boundary ? 'boundary' : order,
      multiplicity: order,
      geometry: boundary ? 'boundary' : 'regular',
      isCusp: order === 3 && !boundary,
      parameterStar: p,
      valuesStar: [x],
      terminalSlope: ds[0]!.value,
      oppositeSlopeSigns: false,
      curvatureFxx: ds[1]!.value,
      curvatureFxxx: ds[2]!.value,
      curvatureFxxxx: ds[3]!.value,
      sensitivityFp: fp.value,
      residualAtStar: Math.abs(f),
      slopeAtStar: Math.abs(ds[0]!.value),
      parabolaCoeff: order === 2 ? -ds[1]!.value / (2 * fp.value) : undefined,
      geometricSummary: `${label} 확인됨 (국소 수치 검증): p ≈ ${Number(p.toPrecision(7))}, x ≈ ${Number(x.toPrecision(7))}. 원래 식의 등식 오차와 1~${Math.max(4, order)}차 도함수를 두 스텝 크기로 비교했습니다.`,
    }
  }
  return undefined
}

/** Prepared interface for a future corank-one multivariable classification.
 * det(J)=0 alone is insufficient; callers must establish rank N-1 by SVD.
 * Higher directional derivatives require left and right null vectors.
 */
export interface MultivariableTangencyProbe {
  jacobian: number[][]
  rank: number
  rightNullVector: number[]
  leftNullVector: number[]
  directionalSecond: (direction: readonly number[]) => number[]
  parameterDerivative: number[]
}

export function tangencyLabel(t: TangencyVerification): string {
  if (t.geometry === 'degenerate') return '분기 다중근'
  const order = t.bifurcationOrder
  return order === 'boundary'
    ? '정의역 경계 도달'
    : typeof order === 'number' && order % 2 === 1
      ? '변곡점 통과'
      : '근 병합'
}

// A one-sided finite-difference stencil alone does not imply a boundary.
// Check adjacent representable values: a nearby interior log root stays interior.
function atDomainBoundary(
  evaluate: (x: number) => number | undefined,
  x: number,
) {
  return [nextDown(x), nextUp(x)].some((y) => {
    const f = evaluate(y)
    return f === undefined || !Number.isFinite(f)
  })
}

/** Local numerical multiplicity; it does not assert branch topology or
 * completeness. Nonsmooth expressions must be filtered before this function. */
export function classifyScalarRoot(
  evaluate: (x: number) => number | undefined,
  x: number,
  analyticSlope?: number,
): RootStructure {
  const unknown: RootStructure = {
    kind: 'unresolved',
    evidence: '8차까지의 도함수에서 차수를 분리하지 못했습니다.',
  }
  const f = evaluate(x)
  if (f === undefined || !Number.isFinite(f)) return unknown
  for (const order of orders) {
    const d = adaptiveDerivative(evaluate, x, order)
    if (!d)
      return {
        ...unknown,
        evidence: '정의역 안에서 도함수 스텐실을 구성하지 못했습니다.',
      }
    if (Math.abs(d.value) <= 8 * d.error) continue
    // A broad finite-difference stencil can hide the nonzero slope of two
    // distinct tiny roots. Never upgrade that discrepancy to multiplicity.
    if (
      order > 1 &&
      analyticSlope !== undefined &&
      Number.isFinite(analyticSlope) &&
      analyticSlope !== 0
    )
      return {
        kind: 'unresolved',
        evidence:
          '직접 도함수는 0이 아니지만 차분 간격에서 분리되지 않습니다. 중근으로 합치지 않고 현재 기울기로 민감도를 계산합니다.',
      }
    const boundary = atDomainBoundary(evaluate, x)
    return {
      kind: boundary ? 'boundary' : order === 1 ? 'simple' : 'multiple',
      order,
      evidence:
        order === 1
          ? '두 미분 간격에서 1차 도함수가 0과 분리됨 (국소 수치 판정).'
          : `두 미분 간격에서 1~${order - 1}차는 오차 범위 내 0, ${order}차는 0과 분리됨 (국소 수치 판정).`,
    }
  }
  return unknown
}
export function rootStructureLabel(root?: RootStructure) {
  if (!root) return '계산된 해'
  if (root.kind === 'simple') return '단순근'
  if (root.kind === 'boundary')
    return `정의역 경계${root.order && root.order > 1 ? ` · ${root.order}중근` : ''}`
  if (root.kind === 'multiple')
    return root.order === 2
      ? '2중근 · 접점'
      : `${root.order}중근${root.order && root.order % 2 ? ' · 관통' : ' · 접점'}`
  return root.kind === 'nonsmooth' ? '비매끄러운 식의 해' : '근 차수 미분리'
}
export function tangencyOrderLabel(t: TangencyVerification) {
  if (t.geometry === 'degenerate')
    return `${t.bifurcationOrder}중근 · 분기 유형 미분리`
  if (t.bifurcationOrder === 'boundary')
    return `경계 접점${t.multiplicity ? ` · ${t.multiplicity}중근` : ''}`
  return `${t.bifurcationOrder}중근${t.bifurcationOrder % 2 ? ' · 관통' : ' · 접점'}`
}
