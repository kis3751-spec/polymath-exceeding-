import { Matrix, SingularValueDecomposition } from 'ml-matrix'
import { ModelError } from '../index'
import { parseNonlinearExpression } from '../nonlinear-parser'
import { evaluateDual, type Dual } from '../expression-derivative'
import { preprocessSolverSource } from '../preprocessor'
import { compileAssignments, compileExpression } from './expression'
import { parseDataTable } from './data'
import type {
  ScientificMetric,
  ScientificRequest,
  ScientificResult,
  ScientificSeries,
} from './types'

const NAME = /^[A-Za-z][A-Za-z0-9_]*$/
const NUM = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?'
const guessPattern = new RegExp(
  `^m\\(\\s*([A-Za-z][A-Za-z0-9_]*)\\s*\\)\\s*=\\s*(${NUM})$`,
  'i',
)
const conditionPattern = new RegExp(
  `^([A-Za-z][A-Za-z0-9_]*)\\(\\s*(0|min|max)\\s*\\)\\s*=\\s*(${NUM})$`,
)
const sum = (a: readonly number[]) => {
  let total = 0,
    c = 0
  for (const x of a) {
    const t = total + x
    c += Math.abs(total) >= Math.abs(x) ? total - t + x : x - t + total
    total = t
  }
  return total + c
}
const dot = (a: readonly number[], b: readonly number[]) =>
  sum(a.map((x, i) => x * b[i]))
const magnitude = (a: readonly number[]) => Math.hypot(...a)
const numeric = (n: number): number | string =>
  Number.isFinite(n) ? n : 'Float64 범위 초과'
const print = (x: number) => x.toString()
function finite(
  values: readonly number[],
  message = '계산값이 Float64 범위나 함수 정의역을 벗어났습니다.',
) {
  if (!values.every(Number.isFinite)) throw new ModelError(message)
}

function decompose(a: number[][]) {
  const svd = new SingularValueDecomposition(new Matrix(a), {
    autoTranspose: true,
  })
  return { svd, rank: svd.rank, condition: svd.condition }
}
function leastSquares(a: number[][], b: number[], requireFullRank = true) {
  const d = decompose(a)
  if (requireFullRank && d.rank < a[0].length)
    throw new ModelError(
      '데이터 열이 독립적이지 않아 계수를 구분할 수 없습니다. 중복·상수 열이나 다항식 차수를 확인하세요.',
    )
  const x = d.svd.solve(Matrix.columnVector(b)).getColumn(0)
  finite(x)
  return { ...d, x }
}

function standardErrors(
  svd: SingularValueDecomposition,
  transform: number[][],
  varianceScale: number,
): number[] {
  const v = svd.rightSingularVectors,
    s = svd.diagonal
  return transform.map(
    (row) =>
      varianceScale *
      Math.hypot(
        ...s.map(
          (singular, k) => sum(row.map((t, j) => t * v.get(j, k))) / singular,
        ),
      ),
  )
}

function summary(
  y: number[],
  pred: number[],
  p: number,
): {
  metrics: ScientificMetric[]
  residuals: number[]
  sseNormalized: number
  yScale: number
  df: number
  warnings: string[]
} {
  const yScale = Math.max(...y.map(Math.abs)) || 1
  const residuals = y.map((v, i) => v - pred[i])
  finite(residuals)
  const yn = y.map((v) => v / yScale),
    rn = residuals.map((v) => v / yScale)
  const sseNormalized = dot(rn, rn),
    mean = sum(yn) / y.length,
    sst = dot(
      yn.map((v) => v - mean),
      yn.map((v) => v - mean),
    )
  const r2 = sst > 0 ? 1 - sseNormalized / sst : undefined,
    df = y.length - p
  const metrics: ScientificMetric[] = [
    {
      label: 'RMSE',
      value: numeric(Math.sqrt(sseNormalized / y.length) * yScale),
      detail:
        '측정값과 예측값 차이의 제곱평균제곱근입니다. 종속변수와 같은 단위이며 작을수록 데이터와 가깝습니다. 새로운 데이터에 대한 오차 보장은 아닙니다.',
    },
    {
      label: 'R²',
      value: r2 === undefined ? '정의되지 않음' : r2,
      detail:
        '측정값 평균만 사용하는 모델에 비해 제곱오차를 얼마나 줄였는지 나타냅니다. 음수도 가능하며, 높은 값만으로 물리적 타당성이나 외삽 정확도를 보장하지 않습니다.',
    },
    {
      label: '최대 절대 오차',
      value: Math.max(...residuals.map(Math.abs)),
      detail: '입력한 데이터 점 중 예측값과 가장 크게 벌어진 점의 차이입니다.',
    },
    {
      label: '잔차 자유도',
      value: df,
      detail:
        '데이터 행 수에서 추정한 계수 수를 뺀 값입니다. 0 이하이면 데이터로 오차 분산이나 계수 표준오차를 추정할 여유가 없습니다.',
    },
    {
      label: 'SSE',
      value: numeric(sseNormalized * yScale * yScale),
      detail:
        '측정값과 예측값 차이의 제곱합으로 최소화한 목적함수입니다. 데이터 수와 측정 단위에 따라 크기가 달라집니다.',
    },
  ]
  if (r2 !== undefined && df > 0 && y.length > 1)
    metrics.push({
      label: '조정 R²',
      value: 1 - ((1 - r2) * (y.length - 1)) / df,
      detail:
        '계수 수 증가에 따른 과적합을 일부 보정한 평균 기준의 설명력입니다. 같은 종속변수·같은 데이터로 계산한 모델을 비교하세요.',
    })
  if (sseNormalized > 0 && df > 0)
    metrics.push({
      label: 'AIC',
      value:
        y.length * (Math.log(sseNormalized / y.length) + 2 * Math.log(yScale)) +
        2 * p,
      detail:
        '독립·동일분산 Gaussian 오차 가정의 상대적 모델 비교값입니다. 같은 데이터·종속변수에서 작은 값이 선호되며, 절대적인 신뢰 확률은 아닙니다. 공통 상수항은 생략했습니다.',
    })
  const warnings: string[] = []
  if (sst === 0)
    warnings.push('종속변수 데이터가 모두 같으므로 R²는 정의하지 않았습니다.')
  if (df <= 0)
    warnings.push(
      '잔차 자유도가 없어 계수 표준오차를 추정하지 않았습니다. 추가 측정값으로 모델을 검증하세요.',
    )
  return { metrics, residuals, sseNormalized, yScale, df, warnings }
}

function dataScopes(request: ScientificRequest) {
  const table = parseDataTable(request.source)
  if (table.columns.length < 2 || table.rows.length < 2)
    throw new ModelError('회귀에는 열 이름과 최소 두 행의 데이터가 필요합니다.')
  const commands = table.remainingLines.filter((line) =>
    /^(?:polyfit|mlinfit|nlinfit)\b/i.test(line),
  )
  if (commands.length !== 1)
    throw new ModelError(
      'polyfit, mlinfit, nlinfit 중 한 개의 회귀 명령을 입력하세요.',
    )
  const command = commands[0],
    guesses = new Map<string, number>(),
    bounds = new Map<string, { min: number; max: number }>()
  const helperLines: string[] = []
  for (const line of table.remainingLines) {
    if (line === command) continue
    const g = guessPattern.exec(line),
      c = conditionPattern.exec(line)
    if (g || c?.[2] === '0') {
      const name = g?.[1] ?? c![1],
        value = Number(g?.[2] ?? c![3])
      finite([value])
      if (guesses.has(name))
        throw new ModelError(`초기 추정 '${name}'이 중복되었습니다.`)
      guesses.set(name, value)
    } else if (c) {
      const entry = bounds.get(c[1]) ?? { min: -Infinity, max: Infinity }
      const value = Number(c[3])
      finite([value])
      if (Number.isFinite(entry[c[2] as 'min' | 'max']))
        throw new ModelError(`경계 '${c[1]}(${c[2]})'가 중복되었습니다.`)
      entry[c[2] as 'min' | 'max'] = value
      bounds.set(c[1], entry)
    } else helperLines.push(line)
  }
  const nonlinear = /^nlinfit\b/i.test(command)
  if (!nonlinear && (guesses.size || bounds.size))
    throw new ModelError('초기 추정과 계수 경계는 nlinfit에서만 사용합니다.')
  const modelMatch = /^nlinfit\s+([A-Za-z][A-Za-z0-9_]*)\s*=\s*(.+)$/i.exec(
    command,
  )
  if (nonlinear && !modelMatch)
    throw new ModelError('비선형 회귀는 nlinfit y = 수식 형태로 입력하세요.')
  const reserved = [...table.columns, ...guesses.keys()]
  const wrapper = 'zzfitprediction'
  if (
    table.columns.includes(wrapper) ||
    helperLines.some((l) => l.startsWith(wrapper))
  )
    throw new ModelError(
      `'${wrapper}'는 내부 계산용 이름입니다. 다른 변수명을 사용하세요.`,
    )
  const expanded = preprocessSolverSource(
    [
      ...helperLines,
      ...(modelMatch ? [`${wrapper} = ${modelMatch[2]}`] : []),
    ].join('\n'),
    [...reserved, ...Object.keys(request.parameters ?? {})],
    'nonlinear',
  )
  const lines = expanded
    .split('\n')
    .map((s) => s.split('#')[0].trim())
    .filter(Boolean)
  const prediction = lines.find((l) => new RegExp(`^${wrapper}\\s*=`).test(l))
  const expression = prediction
    ? prediction.slice(prediction.indexOf('=') + 1)
    : modelMatch?.[2]
  const remaining = lines.filter((l) => l !== prediction)
  const helpers = compileAssignments(remaining, {
    reserved,
    parameters: request.parameters,
  })
  const defs = new Map(
    remaining.map((line) => {
      const m = /^([A-Za-z][A-Za-z0-9_]*)\s*=\s*(.+)$/.exec(line)
      if (!m) throw new ModelError('보조식은 이름 = 수식 형태로 입력하세요.')
      return [m[1], parseNonlinearExpression(m[2])] as const
    }),
  )
  const raw = table.rows.map((row) =>
    Object.fromEntries(table.columns.map((name, i) => [name, row[i]])),
  )
  return {
    table,
    command,
    guesses,
    bounds,
    helpers,
    defs,
    raw,
    expression,
    dependent: modelMatch?.[1],
  }
}

function binomial(n: number, k: number) {
  let r = 1
  for (let i = 1; i <= k; i++) r = (r * (n - i + 1)) / i
  return r
}
function linearFit(
  request: ScientificRequest,
  start: number,
  parsed: ReturnType<typeof dataScopes>,
): ScientificResult {
  const tokens = parsed.command.split(/\s+/),
    poly = tokens[0].toLowerCase() === 'polyfit'
  if ((request.module === 'multilinear') === poly)
    throw new ModelError(
      request.module === 'multilinear'
        ? '다중선형 회귀는 mlinfit을 사용하세요.'
        : '선형·다항식 회귀는 polyfit을 사용하세요.',
    )
  const origin = tokens.at(-1)?.toLowerCase() === 'origin'
  if (origin) tokens.pop()
  let predictors: string[],
    dependent: string,
    degree = 1
  if (poly) {
    if (tokens.length !== 4 || !/^\d+$/.test(tokens[3]))
      throw new ModelError(
        'polyfit x y 차수 [origin] 형태로 입력하세요. 차수는 1~12 정수입니다.',
      )
    degree = Number(tokens[3])
    predictors = [tokens[1]]
    dependent = tokens[2]
    if (degree < 1 || degree > 12)
      throw new ModelError('다항식 차수는 1~12 범위의 정수여야 합니다.')
  } else {
    if (tokens.length < 3 || tokens.length > 26)
      throw new ModelError(
        'mlinfit x1 x2 ... y [origin] 형태로 최대 24개 설명변수를 입력하세요.',
      )
    predictors = tokens.slice(1, -1)
    dependent = tokens.at(-1)!
  }
  if (
    [...predictors, dependent].some((name) => !NAME.test(name)) ||
    new Set([...predictors, dependent]).size !== predictors.length + 1
  )
    throw new ModelError(
      '설명변수·종속변수는 중복 없는 열 이름이나 보조식 이름이어야 합니다.',
    )
  const scopes = parsed.raw.map((scope) => parsed.helpers.evaluate(scope))
  const y = scopes.map((row) => row[dependent]),
    xs = predictors.map((name) => scopes.map((row) => row[name]))
  finite([...y, ...xs.flat()], '명령의 열 이름이나 보조식을 확인하세요.')
  const centers = xs.map((x) =>
    origin ? 0 : Math.min(...x) / 2 + Math.max(...x) / 2,
  )
  const scales = xs.map(
    (x, j) => Math.max(...x.map((v) => Math.abs(v - centers[j]))) || 1,
  )
  const design = scopes.map((_, i) => {
    const z = xs.map((x, j) => (x[i] - centers[j]) / scales[j])
    return poly
      ? Array.from(
          { length: degree + (origin ? 0 : 1) },
          (_, j) => z[0] ** (j + (origin ? 1 : 0)),
        )
      : [...(origin ? [] : [1]), ...z]
  })
  const p = design[0].length
  if (y.length < p)
    throw new ModelError(
      `계수 ${p}개를 추정하려면 최소 ${p}개 데이터 행이 필요합니다.`,
    )
  const yScale = Math.max(...y.map(Math.abs)) || 1
  const solved = leastSquares(
    design,
    y.map((v) => v / yScale),
  )
  const normalized = solved.x.map((v) => v * yScale),
    pred = design.map((row) => dot(row, normalized))
  finite(pred)
  const stats = summary(y, pred, p),
    warnings = [...stats.warnings]
  const transform = Array.from({ length: poly ? degree + 1 : p }, () =>
    Array(p).fill(0),
  )
  if (poly) {
    for (let i = 0; i <= degree; i++)
      for (let k = i; k <= degree; k++) {
        const j = k - (origin ? 1 : 0)
        if (j >= 0)
          transform[i][j] =
            (binomial(k, i) * (-centers[0]) ** (k - i)) / scales[0] ** k
      }
  } else {
    if (!origin) transform[0][0] = 1
    predictors.forEach((_, j) => {
      const idx = j + (origin ? 0 : 1)
      transform[idx][idx] = 1 / scales[j]
      if (!origin) transform[0][idx] = -centers[j] / scales[j]
    })
  }
  const coefficients = transform.map((row) => dot(row, normalized))
  const values: Record<string, number> = {}
  const labels = poly
    ? coefficients.map((_, i) => `a${i}`)
    : [
        ...(origin ? [] : ['intercept']),
        ...predictors.map((name) => `b_${name}`),
      ]
  labels.forEach((name, i) => {
    if (Number.isFinite(coefficients[i])) values[name] = coefficients[i]
  })
  if (Object.keys(values).length !== labels.length)
    warnings.push(
      '원래 변수의 거듭제곱 계수 전개가 Float64 범위를 넘었습니다. 정규화된 표시식을 사용하세요.',
    )
  if (solved.condition > 1e8)
    warnings.push(
      '설명변수의 상관 또는 높은 차수로 계수 추정이 민감합니다. 예측 오차가 작아도 계수는 크게 달라질 수 있습니다.',
    )
  if (poly && Math.abs(centers[0]) / scales[0] > 1e4)
    warnings.push(
      '원점에서 멀리 떨어진 데이터입니다. 전개 계수는 상쇄에 민감하므로 그래프·예측은 정규화된 식으로 계산했습니다.',
    )
  if (origin)
    warnings.push(
      '원점 통과를 강제한 모델입니다. R²는 데이터 평균 기준으로 계산했으므로 음수가 될 수 있습니다.',
    )
  if (stats.df > 0) {
    const errors = standardErrors(
      solved.svd,
      transform,
      Math.sqrt(stats.sseNormalized / stats.df) * yScale,
    )
    errors.forEach((v, i) => {
      if (Number.isFinite(v)) values[`SE_${labels[i]}`] = v
    })
  }
  stats.metrics.push(
    {
      label: '식별 랭크',
      value: `${solved.rank} / ${p}`,
      detail:
        '정규화한 설계행렬의 수치 랭크입니다. 모든 계수를 독립적으로 구분할 수 있을 때만 결과를 반환합니다.',
    },
    {
      label: '설계행렬 조건수',
      value: numeric(solved.condition),
      detail:
        '정규화한 설명변수에서 계수 추정의 수치 민감도를 나타냅니다. 측정 데이터의 정확성이나 모델의 신뢰 확률은 아닙니다.',
    },
  )
  const x = xs[0],
    range = [Math.min(...x), Math.max(...x)],
    order = x.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v)
  const series: ScientificSeries[] = [
    { name: '측정 데이터', x: [...x], y: [...y], style: 'points' },
    {
      name: poly ? '적합 곡선' : '행별 예측',
      x: order.map((r) => r.v),
      y: order.map((r) => pred[r.i]),
      style: poly ? 'line' : 'points',
    },
    {
      name: '데이터 오차',
      x: [...x],
      y: stats.residuals,
      style: 'points',
      axisLabel: '측정 − 예측',
    },
  ]
  if (poly) {
    const samples = Math.min(
      1001,
      Math.max(2, Math.round(request.options?.samples ?? 201)),
    )
    const gx = Array.from(
      { length: samples },
      (_, i) =>
        range[0] * (1 - i / (samples - 1)) + (range[1] * i) / (samples - 1),
    )
    const gy = gx.map((v) => {
      const z = (v - centers[0]) / scales[0]
      return sum(normalized.map((c, j) => c * z ** (j + (origin ? 1 : 0))))
    })
    finite(gy)
    series[1] = { name: '적합 곡선', x: gx, y: gy, style: 'line' }
  }
  const formula = poly
    ? `${dependent} = ${normalized.map((c, j) => `${print(c)}${j + (origin ? 1 : 0) > 0 ? `*(((${predictors[0]})-(${print(centers[0])}))/(${print(scales[0])}))^${j + (origin ? 1 : 0)}` : ''}`).join(' + ')}`
    : `${dependent} = ${[...(!origin ? [print(coefficients[0])] : []), ...predictors.map((name, j) => `${print(coefficients[j + (origin ? 0 : 1)])}*${name}`)].join(' + ')}`
  return {
    module: request.module,
    method: '정규화 SVD 최소제곱',
    status: 'completed',
    columns: [...parsed.table.columns, 'prediction', 'data_error'],
    rows: parsed.table.rows.map((row, i) => [
      ...row,
      pred[i],
      stats.residuals[i],
    ]),
    series,
    values,
    metrics: stats.metrics,
    warnings,
    durationMs: performance.now() - start,
    formula,
  }
}

function nonlinearFit(
  request: ScientificRequest,
  start: number,
  parsed: ReturnType<typeof dataScopes>,
): ScientificResult {
  if (request.module !== 'nonlinear-fit')
    throw new ModelError('nlinfit은 Nonlinear Fitting에서 사용하세요.')
  if (!parsed.expression || !parsed.dependent)
    throw new ModelError('nlinfit y = 수식을 입력하세요.')
  const expression = compileExpression(parsed.expression),
    modelNode = parseNonlinearExpression(parsed.expression).node
  const names = [...parsed.guesses.keys()]
  if (!names.length || names.length > 24)
    throw new ModelError(
      '추정 계수마다 m(a)=초기값을 입력하세요. 최대 24개 계수를 지원합니다.',
    )
  const available = new Set([
    ...parsed.table.columns,
    ...parsed.helpers.names,
    ...Object.keys(request.parameters ?? {}),
    'pi',
    'e',
  ])
  const needed = new Set<string>(),
    expanded = new Set<string>()
  const visit = (ref: string) => {
    if (parsed.defs.has(ref)) {
      if (expanded.has(ref)) return
      expanded.add(ref)
      for (const r of parsed.defs.get(ref)!.references) visit(r)
    } else if (!available.has(ref)) needed.add(ref)
  }
  for (const r of expression.references) visit(r)
  if (
    names.some((name) => available.has(name)) ||
    needed.size !== names.length ||
    [...needed].some((name) => !parsed.guesses.has(name))
  )
    throw new ModelError(
      `모델의 추정 계수와 초기값이 일치해야 합니다. 필요한 계수: ${[...needed].join(', ') || '없음'}`,
    )
  const dependencies = (refs: Iterable<string>, seen = new Set<string>()) => {
    for (const ref of refs) {
      if (seen.has(ref)) continue
      seen.add(ref)
      if (parsed.defs.has(ref))
        dependencies(parsed.defs.get(ref)!.references, seen)
    }
    return seen
  }
  if (dependencies(expression.references).has(parsed.dependent))
    throw new ModelError(
      '예측식 우변에 종속변수 자체나 그것을 사용하는 보조식을 넣을 수 없습니다.',
    )
  if (
    parsed.defs.has(parsed.dependent) &&
    [...dependencies([parsed.dependent])].some((name) => names.includes(name))
  )
    throw new ModelError(
      '측정값을 만드는 보조식은 추정 계수에 의존할 수 없습니다.',
    )
  const y = parsed.raw.map(
    (row) =>
      parsed.helpers.evaluate({
        ...row,
        ...Object.fromEntries(parsed.guesses),
      })[parsed.dependent!],
  )
  finite(y, '종속변수 열이나 보조식을 확인하세요.')
  if (y.length < names.length)
    throw new ModelError('데이터 행 수가 추정 계수 수보다 작습니다.')
  for (const [name, b] of parsed.bounds) {
    if (
      !names.includes(name) ||
      b.min >= b.max ||
      parsed.guesses.get(name)! < b.min ||
      parsed.guesses.get(name)! > b.max
    )
      throw new ModelError(`계수 '${name}'의 초기값과 경계를 확인하세요.`)
  }
  const tolerance = request.options?.tolerance ?? 1e-8,
    maxIterations = request.options?.maxIterations ?? 250
  if (
    !Number.isFinite(tolerance) ||
    tolerance <= 0 ||
    tolerance >= 1 ||
    !Number.isInteger(maxIterations) ||
    maxIterations < 1 ||
    maxIterations > 2000
  )
    throw new ModelError(
      '허용오차는 0~1 사이, 최대 반복은 1~2,000 정수로 설정하세요.',
    )
  const yScale = Math.max(...y.map(Math.abs)) || 1
  let evaluations = 0,
    usedDifference = false
  const predict = (theta: number[]) => {
    evaluations++
    const params = Object.fromEntries(names.map((name, j) => [name, theta[j]]))
    const values = parsed.raw.map((row) =>
      expression.evaluate(parsed.helpers.evaluate({ ...row, ...params })),
    )
    finite(values)
    return values.map((v) => v / yScale)
  }
  const jacobian = (theta: number[], base: number[]) => {
    const params = Object.fromEntries(names.map((name, j) => [name, theta[j]]))
    const cols = names.map((name, j) => {
      const values = parsed.raw.map((row) => {
        const env = new Map<string, Dual>([
          ['pi', { value: Math.PI, derivative: 0 }],
          ['e', { value: Math.E, derivative: 0 }],
          ...Object.entries({ ...row, ...params }).map(
            ([n, value]) =>
              [n, { value, derivative: n === name ? 1 : 0 }] as [string, Dual],
          ),
        ])
        for (const h of parsed.helpers.names) {
          const def = parsed.defs.get(h)!
          const override = request.parameters?.[h]
          const dual =
            override !== undefined && def.references.size === 0
              ? { value: override, derivative: 0 }
              : evaluateDual(def.node, env)
          if (!dual) return undefined
          env.set(h, dual)
        }
        return evaluateDual(modelNode, env)?.derivative
      })
      if (
        values.every((v): v is number => v !== undefined && Number.isFinite(v))
      )
        return values.map((v) => v / yScale)
      usedDifference = true
      let h = Math.sqrt(Number.EPSILON) * Math.max(Math.abs(theta[j]), 1)
      const bound = parsed.bounds.get(name) ?? { min: -Infinity, max: Infinity }
      for (let attempt = 0; attempt < 12; attempt++, h /= 2) {
        let upper: number[] | undefined, lower: number[] | undefined
        const plus = Math.min(bound.max, theta[j] + h),
          minus = Math.max(bound.min, theta[j] - h)
        try {
          if (plus !== theta[j]) {
            const p = [...theta]
            p[j] = plus
            upper = predict(p)
          }
        } catch {
          /* domain */
        }
        try {
          if (minus !== theta[j]) {
            const p = [...theta]
            p[j] = minus
            lower = predict(p)
          }
        } catch {
          /* domain */
        }
        if (upper && lower)
          return upper.map((v, i) => (v - lower![i]) / (plus - minus))
        if (upper) return upper.map((v, i) => (v - base[i]) / (plus - theta[j]))
        if (lower)
          return lower.map((v, i) => (base[i] - v) / (theta[j] - minus))
      }
      throw new ModelError(
        `계수 '${name}'의 도함수를 정의역 안에서 계산할 수 없습니다.`,
      )
    })
    return y.map((_, i) => cols.map((col) => col[i]))
  }
  const projectedGradient = (
    matrix: number[][],
    residuals: number[],
    theta: number[],
  ) =>
    Math.max(
      ...names.map((name, k) => {
        const value = sum(matrix.map((row, i) => row[k] * residuals[i]))
        const b = parsed.bounds.get(name)
        if (
          (b && theta[k] === b.min && value < 0) ||
          (b && theta[k] === b.max && value > 0)
        )
          return 0
        return (
          Math.abs(value) / (Math.hypot(...matrix.map((row) => row[k])) || 1)
        )
      }),
    )
  const yn = y.map((v) => v / yScale)
  let theta = names.map((name) => parsed.guesses.get(name)!),
    pred = predict(theta),
    res = yn.map((v, i) => v - pred[i]),
    cost = dot(res, res),
    lambda = 1e-3,
    converged = false,
    iteration = 0,
    stop = '최대 반복에 도달했습니다.',
    finalJ: number[][] = []
  for (; iteration < maxIterations; iteration++) {
    if (performance.now() - start > 4000) {
      stop = '계산 시간 예산에 도달했습니다.'
      break
    }
    const j = jacobian(theta, pred)
    finalJ = j
    const scales = names.map(
      (_, k) => Math.hypot(...j.map((row) => row[k])) || 1,
    )
    const normalized = j.map((row) => row.map((v, k) => v / scales[k]))
    const rank = decompose(normalized).rank
    const gradient = projectedGradient(j, res, theta)
    if (rank < names.length) {
      stop = '현재 데이터와 모델로 계수를 독립적으로 구분할 수 없습니다.'
      break
    }
    if (gradient <= tolerance * Math.max(1, magnitude(res))) {
      converged = true
      break
    }
    let accepted = false,
      stepSize = Infinity,
      improvement = Infinity
    for (let attempt = 0; attempt < 18; attempt++) {
      const augmented = [
        ...normalized,
        ...names.map((_, k) =>
          names.map((_, l) => (k === l ? Math.sqrt(lambda) : 0)),
        ),
      ]
      const step = leastSquares(
        augmented,
        [...res, ...names.map(() => 0)],
        false,
      ).x.map((v, k) => v / scales[k])
      const candidate = theta.map((v, k) => {
        const b = parsed.bounds.get(names[k])
        return Math.max(
          b?.min ?? -Infinity,
          Math.min(b?.max ?? Infinity, v + step[k]),
        )
      })
      stepSize = magnitude(candidate.map((v, k) => v - theta[k]))
      try {
        const next = predict(candidate),
          r = yn.map((v, i) => v - next[i]),
          nextCost = dot(r, r)
        if (nextCost < cost) {
          improvement = (cost - nextCost) / Math.max(Number.MIN_VALUE, cost)
          theta = candidate
          pred = next
          res = r
          cost = nextCost
          lambda = Math.max(1e-12, lambda / 3)
          accepted = true
          break
        }
      } catch {
        /* rejected step outside real domain */
      }
      lambda = Math.min(1e20, lambda * 10)
    }
    if (!accepted) {
      stop =
        '오차를 줄이는 유효한 스텝을 찾지 못했습니다. 초기값·경계·모델을 확인하세요.'
      break
    }
    if (
      stepSize <= tolerance * (1 + magnitude(theta)) ||
      improvement <= tolerance
    ) {
      const last = jacobian(theta, pred)
      const g = projectedGradient(last, res, theta)
      if (g <= Math.sqrt(tolerance) * Math.max(1, magnitude(res))) {
        converged = true
        iteration++
        finalJ = last
        break
      }
    }
  }
  const predicted = pred.map((v) => v * yScale),
    stats = summary(y, predicted, names.length),
    values = Object.fromEntries(names.map((name, i) => [name, theta[i]])),
    warnings = [...stats.warnings]
  finalJ = jacobian(theta, pred)
  const finalScales = names.map(
    (_, k) => Math.hypot(...finalJ.map((row) => row[k])) || 1,
  )
  const svd = decompose(
    finalJ.map((row) => row.map((v, k) => v / finalScales[k])),
  )
  const activeBounds = names.filter((name, k) => {
    const b = parsed.bounds.get(name)
    return b && (theta[k] === b.min || theta[k] === b.max)
  })
  if (svd.rank < names.length) {
    converged = false
    stop = '수렴 위치의 Jacobian 랭크가 부족해 계수를 구분할 수 없습니다.'
  }
  if (
    converged &&
    stats.df > 0 &&
    svd.rank === names.length &&
    !activeBounds.length
  ) {
    const errors = standardErrors(
      svd.svd,
      names.map((_, i) =>
        names.map((_, j) => (i === j ? 1 / finalScales[j] : 0)),
      ),
      Math.sqrt(stats.sseNormalized / stats.df),
    )
    errors.forEach((v, i) => {
      if (Number.isFinite(v)) values[`SE_${names[i]}`] = v
    })
  }
  if (!converged) warnings.push(stop)
  if (activeBounds.length)
    warnings.push(
      `계수 ${activeBounds.join(', ')}가 경계에 있습니다. 투영 기울기로 수렴을 판정했으며 대칭적인 계수 표준오차는 제공하지 않습니다.`,
    )
  if (usedDifference)
    warnings.push(
      '일부 비매끄러운 지점 또는 경계에서 유한차분 Jacobian을 사용했습니다. 이 지점의 계수 민감도는 국소 근사입니다.',
    )
  warnings.push(
    '비선형 회귀는 초기값에 따른 국소 최소제곱 해입니다. 다른 초기값에서 더 나은 해가 있을 수 있습니다. 계수 표준오차는 독립·동일분산 오차 및 국소 선형화 가정의 추정치입니다.',
  )
  stats.metrics.push(
    {
      label: 'Jacobian 랭크',
      value: `${svd.rank} / ${names.length}`,
      detail:
        '현재 적합점에서 데이터가 계수 변화에 독립적으로 반응하는지 보여줍니다. 랭크가 부족하면 계수의 유일한 식별을 주장하지 않습니다.',
    },
    {
      label: '반복 횟수',
      value: iteration,
      detail:
        '감쇠 계수를 조정하며 수행한 Levenberg–Marquardt 반복 횟수입니다. 반복 상한 도달은 수렴으로 표시하지 않습니다.',
    },
  )
  const directRefs = new Set<string>(),
    visitedData = new Set<string>()
  const findData = (name: string) => {
    if (visitedData.has(name)) return
    visitedData.add(name)
    if (parsed.table.columns.includes(name)) directRefs.add(name)
    else if (parsed.defs.has(name))
      for (const ref of parsed.defs.get(name)!.references) findData(ref)
  }
  for (const ref of expression.references) findData(ref)
  directRefs.delete(parsed.dependent)
  const xName =
      [...directRefs][0] ??
      parsed.table.columns.find((n) => n !== parsed.dependent)!,
    x = parsed.raw.map((row) => row[xName]),
    order = x.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v)
  const series: ScientificSeries[] = [
    { name: '측정 데이터', x: [...x], y: [...y], style: 'points' },
    {
      name: '행별 예측',
      x: order.map((r) => r.v),
      y: order.map((r) => predicted[r.i]),
      style: 'points',
    },
    {
      name: '데이터 오차',
      x: [...x],
      y: stats.residuals,
      style: 'points',
      axisLabel: '측정 − 예측',
    },
  ]
  if (directRefs.size === 1) {
    const min = Math.min(...x),
      max = Math.max(...x),
      samples = Math.min(
        1001,
        Math.max(2, Math.round(request.options?.samples ?? 201)),
      )
    const gx = Array.from(
        { length: samples },
        (_, i) => min * (1 - i / (samples - 1)) + (max * i) / (samples - 1),
      ),
      params = Object.fromEntries(names.map((name, i) => [name, theta[i]]))
    try {
      const gy = gx.map((v) =>
        expression.evaluate(parsed.helpers.evaluate({ [xName]: v, ...params })),
      )
      finite(gy)
      series[1] = { name: '적합 곡선', x: gx, y: gy, style: 'line' }
    } catch {
      warnings.push(
        '샘플 사이에 정의역 문제가 있어 연속 적합 곡선 대신 측정 위치의 예측값만 표시합니다.',
      )
    }
  }
  const formula = `${parsed.dependent} = ${parsed.expression}; ${names.map((name, i) => `${name}=${print(theta[i])}`).join(', ')}`
  return {
    module: request.module,
    method: '감쇠 Levenberg–Marquardt · SVD',
    status: converged ? 'converged' : 'stopped',
    message: converged ? '국소 최소제곱 수렴 조건을 만족했습니다.' : stop,
    columns: [...parsed.table.columns, 'prediction', 'data_error'],
    rows: parsed.table.rows.map((row, i) => [
      ...row,
      predicted[i],
      stats.residuals[i],
    ]),
    series,
    values,
    metrics: stats.metrics,
    warnings,
    iterations: iteration,
    evaluations,
    durationMs: performance.now() - start,
    formula,
  }
}

export function solveFitting(request: ScientificRequest): ScientificResult {
  const start = performance.now()
  if (!['curve-fit', 'multilinear', 'nonlinear-fit'].includes(request.module))
    throw new ModelError('회귀 모듈을 선택하세요.')
  if (
    request.options?.samples !== undefined &&
    (!Number.isFinite(request.options.samples) || request.options.samples < 2)
  )
    throw new ModelError('그래프 샘플 수는 2 이상의 유한한 값이어야 합니다.')
  const parsed = dataScopes(request)
  return /^nlinfit\b/i.test(parsed.command)
    ? nonlinearFit(request, start, parsed)
    : linearFit(request, start, parsed)
}
