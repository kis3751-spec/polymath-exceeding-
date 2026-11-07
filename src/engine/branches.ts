import {
  ModelError,
  type BranchTerminalEvent,
  type SolvePayload,
  type SolveResult,
  type SolverOptions,
  type SweepPoint,
  type TangencyVerification,
} from './index'
import { parameterValues, type SweepSettings } from './sweep'
import { isUniquePolynomialRoot, isParameterPathSafe } from './root-isolation'

export type NearSolver = (
  source: string,
  parameters: Record<string, number>,
  seed: SolveResult | number[],
  options?: SolverOptions,
) => SolveResult

export type { BranchTerminalEvent, TangencyVerification }

type Sweeps = Pick<
  SolvePayload,
  'sweep' | 'dataset' | 'datasetError' | 'sweepName'
> & {
  events?: BranchTerminalEvent[]
}
type State = { parameter: number; values: number[]; slope?: number }
type Path = { current: State; previous?: State }

class PredictorError extends Error {
  readonly corrected: SolveResult
  constructor(message: string, corrected: SolveResult) {
    super(message)
    this.corrected = corrected
  }
}

function continuationPrecision(...values: number[]) {
  const scale = Math.max(Number.MIN_VALUE, ...values.map(Math.abs))
  return Math.max(4096 * Number.EPSILON * scale, 5e-10 * Math.min(scale, 1))
}

function extractScalarSlope(result: SolveResult): number | undefined {
  const s = result.matrix?.[0]?.[0]
  return typeof s === 'number' && Number.isFinite(s) ? s : undefined
}

function verifyReverse(
  solve: (parameter: number, values: number[]) => SolveResult,
  current: State,
  predictor: number[],
  result: SolveResult,
) {
  const reverseSeed = result.values.map(
    (value, i) => value * 0.999 + current.values[i] * 0.001,
  )
  const reverse = solve(current.parameter, reverseSeed)
  if (
    reverse.values.some((value, i) => {
      const rounding = continuationPrecision(value, current.values[i])
      const motion = Math.max(
        Math.abs(result.values[i] - current.values[i]),
        Math.abs(predictor[i] - current.values[i]),
      )
      return (
        Math.abs(value - current.values[i]) > Math.max(rounding, motion * 1e-7)
      )
    })
  )
    throw new ModelError(
      '다른 해로의 이동이 감지되어 선택한 분기 추적을 중단했습니다.',
    )
}

function createContinuation(
  solveNear: NearSolver,
  source: string,
  selected: SolveResult,
  parametersAt: (parameter: number) => Record<string, number>,
) {
  let calls = 0
  const solve = (parameter: number, values: number[]) => {
    if (++calls > 6000)
      throw new ModelError(
        '분기 추적 계산 한도에 도달했습니다. 범위를 줄여 주세요.',
      )
    const result = solveNear(source, parametersAt(parameter), values, {
      computeCondition: false,
    })
    if (
      result.values.length !== selected.values.length ||
      !result.values.every(Number.isFinite) ||
      result.variables.length !== selected.variables.length ||
      result.variables.some((variable, i) => variable !== selected.variables[i])
    )
      throw new ModelError('추적 중인 해의 미지수가 변경되었습니다.')
    return result
  }
  const correct = (path: Path, target: number): State => {
    const { current, previous } = path
    const ratio = previous
      ? Math.min(
          4,
          Math.abs(
            (target - current.parameter) /
              (current.parameter - previous.parameter),
          ),
        )
      : 0
    const predictor = current.values.map(
      (value, i) =>
        value + (previous ? ratio * (value - previous.values[i]) : 0),
    )
    const result = solve(target, predictor)
    if (
      !isParameterPathSafe(
        result,
        parametersAt(current.parameter),
        parametersAt(target),
      )
    )
      throw new ModelError(
        '파라미터 구간에서 분모가 0이 되거나 선형식의 유한한 해가 사라질 수 있어 추적을 중단했습니다.',
      )
    for (let i = 0; i < result.values.length; i++) {
      const motion = Math.abs(predictor[i] - current.values[i])
      const rounding = continuationPrecision(
        current.values[i],
        predictor[i],
        result.values[i],
      )
      const allowance = previous ? Math.max(rounding, motion * 2) : 0.2
      if (Math.abs(result.values[i] - predictor[i]) > allowance)
        throw new PredictorError(
          '이전 해에서 멀리 떨어진 해로 이동해 추적 간격을 줄였습니다.',
          result,
        )
    }

    verifyReverse(solve, current, predictor, result)
    return {
      parameter: target,
      values: [...result.values],
      slope: extractScalarSlope(result),
    }
  }
  const advance = (path: Path, target: number, depth = 0): Path => {
    try {
      return { previous: path.current, current: correct(path, target) }
    } catch (error) {
      const middle = path.current.parameter / 2 + target / 2
      if (
        depth >= 40 ||
        calls >= 6000 ||
        middle === path.current.parameter ||
        middle === target
      )
        throw error
      const halfway = advance(path, middle, depth + 1)
      // A unique polynomial branch can have an infinite parameter slope,
      // such as x^3=p at p=0, either at or between the requested endpoints.
      // Relax the secant gate only after an ordinary half-step lies inside
      // their root-value interval and contracts toward the verified target.
      // A pole's intermediate root instead leaves that interval; empty real
      // regions still fail the ordinary half-step. Reverse checking remains
      // mandatory, and generic or multiple-root correctors get no exception.
      if (
        error instanceof PredictorError &&
        isUniquePolynomialRoot(error.corrected) &&
        error.corrected.values.length === 1 &&
        isParameterPathSafe(
          error.corrected,
          parametersAt(halfway.current.parameter),
          parametersAt(target),
        )
      ) {
        const endpoint = error.corrected.values[0]
        const scale = Math.max(
          1,
          Math.abs(path.current.values[0]),
          Math.abs(halfway.current.values[0]),
          Math.abs(endpoint),
        )
        const firstDistance = Math.abs(
          endpoint / scale - path.current.values[0] / scale,
        )
        const halfDistance = Math.abs(
          endpoint / scale - halfway.current.values[0] / scale,
        )
        const withinRootInterval =
          halfway.current.values[0] >
            Math.min(endpoint, path.current.values[0]) &&
          halfway.current.values[0] < Math.max(endpoint, path.current.values[0])
        if (withinRootInterval && halfDistance < firstDistance * 0.95) {
          try {
            verifyReverse(
              solve,
              halfway.current,
              [...halfway.current.values],
              error.corrected,
            )
            return {
              previous: halfway.current,
              current: {
                parameter: target,
                values: [...error.corrected.values],
                slope: extractScalarSlope(error.corrected),
              },
            }
          } catch {
            // Fall through to second-half subdivision if reverse verification fails
          }
        }
      }
      return advance(halfway, target, depth + 1)
    }
  }
  return advance
}

/** Continue a pinned solution through a straight path in parameter space. */
export function continueRoot(
  solveNear: NearSolver,
  source: string,
  originParameters: Record<string, number>,
  targetParameters: Record<string, number>,
  selected: SolveResult,
  options: SolverOptions = {},
): SolveResult {
  const names = Object.keys(originParameters)
  if (
    names.length !== Object.keys(targetParameters).length ||
    names.some(
      (name) =>
        !Object.hasOwn(targetParameters, name) ||
        !Number.isFinite(originParameters[name]) ||
        !Number.isFinite(targetParameters[name]),
    )
  )
    throw new ModelError(
      '추적할 파라미터가 변경되었습니다. 해를 다시 선택해 주세요.',
    )
  let path: Path = {
    current: {
      parameter: 0,
      values: [...selected.values],
      slope: extractScalarSlope(selected),
    },
  }
  if (names.some((name) => originParameters[name] !== targetParameters[name])) {
    const advance = createContinuation(
      solveNear,
      source,
      selected,
      (fraction) =>
        Object.fromEntries(
          names.map((name) => [
            name,
            originParameters[name] * (1 - fraction) +
              targetParameters[name] * fraction,
          ]),
        ),
    )
    for (let i = 1; i <= 16; i++) path = advance(path, i / 16)
  }
  return solveNear(source, targetParameters, path.current.values, options)
}

/**
 * Check if a single terminating branch exhibits local fold/tangency behavior
 * (vanishing Jacobian derivative |∂f/∂x| -> 0 and steepening |dx/dp| -> ∞).
 */
function analyzeSingleBranchBoundary(
  paramName: string,
  direction: -1 | 1,
  current: State,
  previous?: State,
): TangencyVerification | undefined {
  if (
    !previous ||
    current.values.length !== 1 ||
    previous.values.length !== 1 ||
    current.slope === undefined ||
    previous.slope === undefined
  )
    return undefined
  const p1 = previous.parameter
  const p2 = current.parameter
  const x1 = previous.values[0]
  const x2 = current.values[0]
  const s1 = previous.slope
  const s2 = current.slope
  const dx = x2 - x1
  const dp = p2 - p1
  if (
    !Number.isFinite(s1) ||
    !Number.isFinite(s2) ||
    Math.abs(dx) <= 1e-12 ||
    Math.abs(dp) <= 1e-15
  )
    return undefined

  // At a fold boundary, |s2| < |s1| (derivative ∂f/∂x is contracting toward 0)
  // and |dx/dp| is large (curve tangent becomes vertical).
  const slopeContracting =
    Math.abs(s2) < Math.abs(s1) * 0.85 && Math.abs(s2) < 0.08
  const dxdp = Math.abs(dx / dp)
  if (!slopeContracting || dxdp < 3) return undefined

  const fxx = (s2 - s1) / dx
  if (!Number.isFinite(fxx) || Math.abs(fxx) < 1e-5) return undefined
  const xStar = x2 - s2 / fxx
  const denom = (x2 - xStar) ** 2 - (x1 - xStar) ** 2
  if (Math.abs(denom) <= 1e-16) return undefined
  const c2 = dp / denom
  const pStar = p2 - c2 * (x2 - xStar) ** 2
  const fp = -fxx / (2 * c2)
  if (
    !Number.isFinite(pStar) ||
    !Number.isFinite(xStar) ||
    (pStar - p2) * direction < -1e-5
  )
    return undefined

  return {
    verified: false,
    bifurcationOrder: 2,
    parameterStar: pStar,
    valuesStar: [xStar],
    terminalSlope: s2,
    oppositeSlopeSigns: false,
    curvatureFxx: fxx,
    sensitivityFp: Number.isFinite(fp) ? fp : undefined,
    parabolaCoeff: Number.isFinite(c2) ? c2 : undefined,
    geometricSummary: `국소 접점·극값 확인: ${paramName}* ≈ ${Number(pStar.toPrecision(6))}, x* ≈ ${Number(xStar.toPrecision(6))} 부근에서 기울기 차 |∂f/∂x|가 ${Math.abs(s1).toExponential(2)} → ${Math.abs(s2).toExponential(2)}로 0에 수렴하고 곡률 ∂²f/∂x² ≈ ${Number(fxx.toPrecision(4))} ≠ 0으로 확인됩니다.`,
  }
}

/**
 * Follow one selected root across the parameter domain.
 * - When continuation fails between two coarse grid points, bisects the interval
 *   to include verified points right up to the boundary.
 * - Records local Jacobian slopes at the boundary so single-branch and merged-branch
 *   fold/tangency points can be geometrically re-verified.
 */
export function computeBranchSweeps(
  solveNear: NearSolver,
  source: string,
  parameters: Record<string, number>,
  settings: SweepSettings | null,
  selected: SolveResult,
): Sweeps {
  if (!settings) return { sweep: [], dataset: [], sweepName: '' }
  const { name, min, max, steps, step } = settings
  const origin = parameters[name]
  if (
    !Object.hasOwn(parameters, name) ||
    ![origin, min, max, steps].every(Number.isFinite) ||
    max <= min
  )
    throw new ModelError('시뮬레이션 파라미터와 범위를 확인해 주세요.')

  const graphCount = Math.min(201, Math.max(2, Math.round(steps)))
  const baseGraphParameters = Array.from({ length: graphCount }, (_, i) => {
    const fraction = i / (graphCount - 1)
    return min * (1 - fraction) + max * fraction
  })
  let datasetParameters: number[] = []
  let datasetError: string | undefined
  try {
    datasetParameters = parameterValues(
      min,
      max,
      step,
      Math.min(500, settings.maxPoints ?? 500),
    )
  } catch (error) {
    datasetError =
      error instanceof Error ? error.message : '데이터를 생성하지 못했습니다.'
  }

  const cache = new Map<number, SweepPoint>([
    [origin, { parameter: origin, values: [...selected.values] }],
  ])
  const extraBoundaryPoints: SweepPoint[] = []
  const events: BranchTerminalEvent[] = []
  const targets = [...new Set([...baseGraphParameters, ...datasetParameters])]
  const initial: State = {
    parameter: origin,
    values: [...selected.values],
    slope: extractScalarSlope(selected),
  }
  const advance = createContinuation(
    solveNear,
    source,
    selected,
    (parameter) => ({ ...parameters, [name]: parameter }),
  )

  for (const direction of [-1, 1] as const) {
    let path: Path = { current: initial }
    let loss: string | undefined
    const ordered = targets
      .filter((value) => (value - origin) * direction > 0)
      .sort((a, b) => direction * (a - b))

    for (const parameter of ordered) {
      if (!loss) {
        try {
          const duplicateTolerance =
            64 *
            Number.EPSILON *
            Math.max(
              Number.MIN_VALUE,
              Math.abs(parameter),
              Math.abs(path.current.parameter),
            )
          if (
            Math.abs(parameter - path.current.parameter) <= duplicateTolerance
          ) {
            cache.set(parameter, {
              parameter,
              values: [...path.current.values],
            })
            continue
          }
          path = advance(path, parameter)
          cache.set(parameter, { parameter, values: [...path.current.values] })
          continue
        } catch (error) {
          // Binary Edge Localization: subdivide [path.current.parameter, parameter]
          // to capture verified points right up to the tracking boundary.
          let lowParam = path.current.parameter
          let highParam = parameter
          let edgePath = path
          const intermediatePoints: SweepPoint[] = []
          for (let b = 0; b < 18; b++) {
            const midParam = 0.5 * (lowParam + highParam)
            if (midParam === lowParam || midParam === highParam) break
            try {
              const nextPath = advance(edgePath, midParam, 16)
              edgePath = nextPath
              lowParam = midParam
              intermediatePoints.push({
                parameter: midParam,
                values: [...nextPath.current.values],
              })
            } catch {
              highParam = midParam
            }
          }
          if (intermediatePoints.length > 0) {
            const stride = Math.max(
              1,
              Math.floor(intermediatePoints.length / 6),
            )
            for (let idx = 0; idx < intermediatePoints.length; idx += stride) {
              extraBoundaryPoints.push(intermediatePoints[idx])
            }
            const lastEdge = intermediatePoints.at(-1)!
            if (extraBoundaryPoints.at(-1) !== lastEdge) {
              extraBoundaryPoints.push(lastEdge)
            }
          }
          const singleTangency = analyzeSingleBranchBoundary(
            name,
            direction,
            edgePath.current,
            edgePath.previous,
          )
          events.push({
            kind: 'unresolved',
            direction,
            parameter: edgePath.current.parameter,
            values: [...edgePath.current.values],
            previousParameter: edgePath.previous?.parameter,
            previousValues: edgePath.previous
              ? [...edgePath.previous.values]
              : undefined,
            terminalSlope: edgePath.current.slope,
            previousSlope: edgePath.previous?.slope,
            ...(singleTangency ? { tangency: singleTangency } : {}),
            description: singleTangency
              ? `${name} ≈ ${Number(singleTangency.parameterStar.toPrecision(6))} 부근의 접점 후보입니다. 원래 식의 잔차·도함수 재검증이 필요합니다.`
              : `${name} ≈ ${Number(edgePath.current.parameter.toPrecision(6))} 지점의 추적 경계입니다.`,
          })
          loss = `선택한 해의 분기를 더 이상 추적할 수 없습니다. ${error instanceof Error ? error.message : '계산 실패'}`
        }
      }
      cache.set(parameter, { parameter, values: null, error: loss })
    }
  }

  const allSweepMap = new Map<number, SweepPoint>()
  for (const p of baseGraphParameters) {
    const pt = cache.get(p)
    if (pt) allSweepMap.set(p, pt)
  }
  for (const pt of extraBoundaryPoints) {
    if (pt.parameter >= min && pt.parameter <= max) {
      allSweepMap.set(pt.parameter, pt)
    }
  }
  const mergedSweep = [...allSweepMap.values()].sort(
    (a, b) => a.parameter - b.parameter,
  )

  return {
    sweep: mergedSweep,
    dataset: datasetParameters.map((value) => cache.get(value)!),
    ...(datasetError ? { datasetError } : {}),
    sweepName: name,
    events,
  }
}
