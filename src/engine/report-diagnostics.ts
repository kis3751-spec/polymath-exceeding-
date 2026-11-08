import { Matrix, SingularValueDecomposition } from 'ml-matrix'
import type { SolveResult, SearchSummary } from './index'
import { diagnosticModel } from './automatic'
import { compileNonlinear } from './nonlinear-parser'
import { adaptiveDerivative, type DerivativeOrder } from './tangency'
import {
  containsZero,
  div,
  evaluateIntervalJet,
  nextUp,
  sub,
  type Interval,
} from './interval-arithmetic'

export type ReportDiagnostics = {
  normalizedError?: number
  correction?: number[]
  amplification?: number
  rank?: number
  enclosure?: Interval
  errorBound?: number
  parameterSensitivity: { name: string; derivatives: number[] }[]
  powerResponse?: { order: number; coefficient: number }
  reason?: string
}
const norm = (v: number[]) => Math.max(0, ...v.map(Math.abs))

/** Every intersected interval still contains the unique root of the certified
 * starting box. A tiny residual alone is never converted to an error bound. */
export function refineRootEnclosure(
  initial: Interval,
  evaluate: (x: Interval) => ReturnType<typeof evaluateIntervalJet>,
): Interval {
  let box = { ...initial }
  for (let k = 0; k < 32; k++) {
    const jet = evaluate(box)
    if (jet.domain !== 'all' || jet.issue || containsZero(jet.der)) break
    const m = box.lo / 2 + box.hi / 2
    const point = evaluate({ lo: m, hi: m })
    if (point.domain !== 'all' || point.issue) break
    const n = sub({ lo: m, hi: m }, div(point.val, jet.der))
    const lo = Math.max(box.lo, n.lo),
      hi = Math.min(box.hi, n.hi)
    if (lo > hi || !Number.isFinite(lo) || !Number.isFinite(hi)) break
    if (lo === box.lo && hi === box.hi) break
    box = { lo, hi }
  }
  return box
}

export function reportDiagnostics(
  result: SolveResult,
  source: string,
  parameters: Record<string, number>,
  search?: SearchSummary | null,
): ReportDiagnostics {
  const out: ReportDiagnostics = { parameterSensitivity: [] }
  if (result.kind === 'evaluation') return out
  const n = result.values.length,
    a = result.matrix
  let context: ReturnType<typeof diagnosticModel> | undefined
  let model: ReturnType<typeof compileNonlinear> | undefined
  if (result.kind === 'nonlinear') {
    try {
      context = diagnosticModel(source, Object.keys(parameters))
      model = context.model
    } catch {
      try {
        model = compileNonlinear(source, Object.keys(parameters))
      } catch {
        /* explain below */
      }
    }
  }
  const cert = search?.certification
  // Search and diagnostics must refer to the current parameter values.
  if (
    n === 1 &&
    cert?.model &&
    context?.expression &&
    cert.model.source === context.source &&
    Object.keys(parameters).length ===
      Object.keys(cert.model.parameters).length &&
    Object.entries(parameters).every(
      ([key, value]) => cert.model!.parameters[key] === value,
    )
  ) {
    const boxes = cert.rootIntervals.filter(
      (b) => result.values[0] >= b.lo && result.values[0] <= b.hi,
    )
    if (boxes.length === 1) {
      const enclosure = refineRootEnclosure(boxes[0], (x) =>
        evaluateIntervalJet(
          context!.expression!,
          result.variables[0],
          x,
          parameters,
          context!.helpers,
        ),
      )
      out.enclosure = enclosure
      out.errorBound = nextUp(
        Math.max(
          Math.abs(result.values[0] - enclosure.lo),
          Math.abs(result.values[0] - enclosure.hi),
        ),
      )
    }
  }
  if (
    a.length !== n ||
    a.some((row) => row.length !== n || !row.every(Number.isFinite))
  ) {
    out.reason =
      result.rootStructure?.kind === 'nonsmooth'
        ? '비매끄러운 식: 도함수 대신 대입 오차와 구간 검증을 사용합니다.'
        : '현재 점의 유한한 Jacobian을 구성하지 못했습니다.'
    return out
  }
  const scales = result.values.map((x) => Math.max(1, Math.abs(x)))
  const valueMagnitude = Math.max(1, ...scales)
  const rowMagnitudes = a.map((row, i) =>
    Math.max(Number.MIN_VALUE, Math.abs(result.rhs[i]), ...row.map(Math.abs)),
  )
  // Componentwise backward error for linear equations; nonlinear systems use
  // the Jacobian linearization and x scale max(1, |x|), as stated in the report.
  const normalized = a.map((row, i) => {
    const denominator =
      row.reduce(
        (sum, v, j) =>
          sum +
          Math.abs(v / rowMagnitudes[i]) *
            (result.kind === 'nonlinear'
              ? scales[j] / valueMagnitude
              : Math.abs(result.values[j]) / valueMagnitude),
        0,
      ) + Math.abs(result.rhs[i] / rowMagnitudes[i] / valueMagnitude)
    return denominator
      ? Math.abs(result.residuals[i] / rowMagnitudes[i] / valueMagnitude) /
          denominator
      : Math.abs(result.residuals[i]) === 0
        ? 0
        : Infinity
  })
  out.normalizedError = norm(normalized)
  const magnitude = norm(a.flat())
  const multiple = (result.rootStructure?.order ?? 1) > 1
  if (multiple && n === 1 && model) {
    const order = result.rootStructure!.order!
    const d = adaptiveDerivative(
      (x) => {
        try {
          return model!.evaluate([x], parameters).residuals[0]
        } catch {
          return undefined
        }
      },
      result.values[0],
      order as DerivativeOrder,
    )
    const fact = Array.from({ length: order }, (_, i) => i + 1).reduce(
      (v, k) => v * k,
      1,
    )
    if (d && Math.abs(d.value) > 8 * d.error)
      out.powerResponse = { order, coefficient: fact / Math.abs(d.value) }
  }
  if (!magnitude || multiple) {
    out.rank = 0
    out.reason =
      '중근에서는 선형 오차 증폭률이 발산합니다. 첫 비영 도함수의 거듭제곱 반응을 사용합니다.'
    return out
  }
  try {
    const svd = new SingularValueDecomposition(
      new Matrix(a.map((row) => row.map((v) => v / magnitude))),
    )
    const threshold = n * Number.EPSILON * Math.max(...svd.diagonal)
    out.rank = svd.diagonal.filter((v) => v > threshold).length
    if (out.rank < n) {
      out.reason = `국소 랭크 ${out.rank}/${n}: 특이 연립계이며 근의 차수는 스칼라 기준으로 지정하지 않습니다.`
      return out
    }
    const inverse = svd
      .inverse()
      .to2DArray()
      .map((row) => row.map((v) => v / magnitude))
    if (!inverse.flat().every(Number.isFinite)) throw new Error('inverse range')
    const apply = (v: number[]) =>
      inverse.map((row) => row.reduce((sum, c, j) => sum + c * v[j], 0))
    out.amplification = Math.max(
      ...inverse.map((row) => row.reduce((sum, v) => sum + Math.abs(v), 0)),
    )
    out.correction = apply(result.residuals).map(Math.abs)
    if (model)
      for (const [name, p] of Object.entries(parameters)) {
        const dp = result.values.map((_, i) =>
          adaptiveDerivative((q) => {
            try {
              return model!.evaluate(result.values, {
                ...parameters,
                [name]: q,
              }).residuals[i]
            } catch {
              return undefined
            }
          }, p),
        )
        if (dp.every((d) => d && Number.isFinite(d.value))) {
          const derivatives = apply(dp.map((d) => -d!.value))
          if (derivatives.every(Number.isFinite))
            out.parameterSensitivity.push({ name, derivatives })
        }
      }
  } catch {
    out.reason =
      '수치 범위 또는 특이값 분해 한계로 오차 증폭률을 계산하지 못했습니다.'
  }
  return out
}
export function coveragePercent(search?: SearchSummary | null) {
  const c = search?.certification
  if (!c) return undefined
  return c.complete
    ? '100%'
    : `${Math.min(99.9999, Math.floor(c.coverageLowerBound * 1e6) / 1e4).toFixed(4)}%`
}
export function searchConclusion(
  search?: SearchSummary | null,
  linear = false,
) {
  if (linear) return '독립 선형계 · 유일해'
  const c = search?.certification
  if (c?.complete && c.allRootsRepresented)
    return `구간 내 전체 ${c.uniqueRootCount}개 근 확인`
  if (c?.complete)
    return `${c.uniqueRootCount}개 근 구간 확정 · 결과 대응 확인 필요`
  if (c)
    return `${c.uniqueRootCount}개 근 구간 확정 · ${c.unresolved.length}곳 추가 검증 필요`
  return search?.nonIsolated
    ? '구간 해 대표값 · 고립근 개수로 집계하지 않음'
    : '수치 탐색 결과 · 전체 구간 검증 전'
}
