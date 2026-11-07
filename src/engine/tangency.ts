import type { TangencyVerification } from './index'

export type ScalarEvaluator = (x: number, p: number) => number | undefined
export type DerivativeEstimate = {
  value: number
  error: number
  oneSided: boolean
}
const eps = Number.EPSILON
const factorial = [1, 1, 2, 6, 24]

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
const stencils = [
  [-3, -2, -1, 0, 1, 2, 3],
  [0, 1, 2, 3, 4, 5, 6],
  [0, -1, -2, -3, -4, -5, -6],
]
const weightCache = stencils.map((nodes) =>
  [0, 1, 2, 3, 4].map((order) => weights(nodes, order)),
)
export function adaptiveDerivative(
  evaluate: (x: number) => number | undefined,
  x: number,
  order: 1 | 2 | 3 | 4 = 1,
): DerivativeEstimate | undefined {
  const initial = eps ** (1 / 7) * Math.max(1, Math.abs(x))
  const sample = (h: number, stencil: number) => {
    const nodes = stencils[stencil]
    const values = nodes.map((n) => evaluate(x + n * h))
    if (values.some((v) => v === undefined || !Number.isFinite(v)))
      return undefined
    const w = weightCache[stencil][order]
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
): TangencyVerification | undefined {
  if (!Number.isFinite(seedX) || !Number.isFinite(seedP)) return undefined
  for (const order of [4, 3, 2] as const) {
    let x = seedX,
      p = seedP
    let failed = false
    for (let i = 0; i < 14; i++) {
      const f = evaluate(x, p)
      const fp = adaptiveDerivative((q) => evaluate(x, q), p)
      const lower = adaptiveDerivative(
        (y) => evaluate(y, p),
        x,
        (order - 1) as 1 | 2 | 3,
      )
      const high = adaptiveDerivative((y) => evaluate(y, p), x, order)
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
      if (Math.abs(dx) <= 32 * eps * Math.max(1, Math.abs(x))) break
    }
    if (failed) continue
    const f = evaluate(x, p),
      fp = adaptiveDerivative((q) => evaluate(x, q), p)
    const ds = ([1, 2, 3, 4] as const).map((n) =>
      adaptiveDerivative((y) => evaluate(y, p), x, n),
    )
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
    const boundary = ds[0]!.oneSided
    const label = boundary
      ? '정의역 경계 접점'
      : order === 3
        ? '3중 접점·변곡 분기'
        : order === 4
          ? '고차 평탄 접점 (4차)'
          : '2차 접점·중근'
    return {
      verified: true,
      bifurcationOrder: boundary ? 'boundary' : order,
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
      geometricSummary: `${label} 확인됨 (국소 수치 검증): p ≈ ${Number(p.toPrecision(7))}, x ≈ ${Number(x.toPrecision(7))}. 원래 식의 잔차와 1~4차 도함수를 두 스텝 크기로 비교했습니다.`,
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
  const order = t.bifurcationOrder
  return order === 'boundary'
    ? '◆ 정의역 경계 접점'
    : order === 3
      ? '◆ 3중 접점·변곡 분기 확인됨'
      : order === 4
        ? '◆ 고차 평탄 접점 확인됨 (4차)'
        : '◆ 2차 접점·중근 확인됨'
}
