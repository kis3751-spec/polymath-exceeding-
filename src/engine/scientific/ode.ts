import { ModelError } from '../index'
import {
  evaluateNonlinearExpression,
  isNonlinearFunction,
  parseNonlinearExpression,
  type NonlinearExpression,
} from '../nonlinear-parser'
import { preprocessModelSource } from '../preprocessor'
import { normalizeEquationSource } from '../source-statements'
import type { ScientificRequest, ScientificResult } from './types'

const NAME = '[A-Za-z][A-Za-z0-9_]*'
const NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/
const DERIVATIVE = new RegExp(
  `^d\\(\\s*(${NAME})\\s*\\)\\s*\\/\\s*d\\(\\s*(${NAME})\\s*\\)\\s*=\\s*(.+)$`,
)
const COMPACT = new RegExp(`^d(${NAME})\\s*\\/\\s*d(${NAME})\\s*=\\s*(.+)$`)
const PRIME = new RegExp(`^(${NAME})\\s*'\\s*=\\s*(.+)$`)
const CONDITION = new RegExp(`^(${NAME})\\s*\\(\\s*(0|f)\\s*\\)\\s*=\\s*(.+)$`)
const PIPE = new RegExp(`^(${NAME})\\s*\\|\\s*(.+)$`)
const ASSIGNMENT = new RegExp(`^(${NAME})\\s*=\\s*([^=]+)$`)
const BUILTINS = new Set(['pi', 'e'])
type Definition = {
  name: string
  expression: NonlinearExpression
  literal: boolean
  line: number
}
type Model = {
  independent: string
  names: string[]
  initial: number[]
  start: number
  end: number
  helpers: string[]
  evaluate: (
    time: number,
    values: number[],
  ) => { derivative: number[]; helpers: number[] }
}

function assertName(name: string, line?: number) {
  if (
    !new RegExp(`^${NAME}$`).test(name) ||
    BUILTINS.has(name) ||
    isNonlinearFunction(name)
  )
    throw new ModelError(`'${name}'은 변수 이름으로 사용할 수 없습니다.`, line)
}
function numeric(text: string, line: number): number {
  if (!NUMBER.test(text.trim()) || !Number.isFinite(Number(text)))
    throw new ModelError(
      '초기값과 적분 범위에는 유한한 숫자를 입력하세요.',
      line,
    )
  return Number(text)
}

/** Compile mathematical text into a bounded AST evaluator. Helpers are sorted
 * by dependencies once; slider updates inject numerical values, never code. */
export function compileOde(
  source: string,
  parameters: Record<string, number> = {},
): Model {
  if (source.length > 30000)
    throw new ModelError('수식은 30,000자 이내로 입력하세요.')
  for (const [name, value] of Object.entries(parameters)) {
    assertName(name)
    if (!Number.isFinite(value))
      throw new ModelError(`파라미터 '${name}'은 유한한 숫자여야 합니다.`)
  }
  source = source.replace(/−/g, '-').replace(/’/g, "'").replace(/\r\n?/g, '\n')
  source = source.replace(/^```[^\n]*\n?|^```\s*$/gm, '')
  // The equation preprocessor appends '=0' to bare expression rows, so adapt
  // DEQ pipe conditions before expanding reusable numbered functions.
  source = source
    .split('\n')
    .flatMap((raw, index) => {
      const text = raw.split('#')[0].trim()
      const pipe = PIPE.exec(text)
      if (!pipe) return [raw]
      const limits = pipe[2].split(':')
      if (limits.length > 2)
        throw new ModelError('범위는 t|시작:끝 형식으로 입력하세요.', index + 1)
      limits.forEach((value) => numeric(value, index + 1))
      return limits.length === 2
        ? [`${pipe[1]}(0)=${limits[0]}`, `${pipe[1]}(f)=${limits[1]}`]
        : [`${pipe[1]}(0)=${limits[0]}`]
    })
    .join('\n')
  source = normalizeEquationSource(source, Object.keys(parameters))
  // Supply helper names as explicit symbols while preserving the ordinary
  // single-argument function rule for the actual differential variables.
  const helperNames = source.split('\n').flatMap((raw) => {
    const m = ASSIGNMENT.exec(raw.split('#')[0].trim())
    return m ? [m[1]] : []
  })
  const prepared = preprocessModelSource(
    source,
    [...helperNames, ...Object.keys(parameters)],
    'nonlinear',
  )
  const equations: {
    name: string
    independent?: string
    text: string
    line: number
  }[] = []
  const starts = new Map<string, { value: number; line: number }>()
  const finals = new Map<string, { value: number; line: number }>()
  const definitions: Definition[] = []
  function condition(
    map: typeof starts,
    name: string,
    value: number,
    line: number,
  ) {
    assertName(name, line)
    if (map.has(name))
      throw new ModelError(`'${name}'의 조건이 중복되었습니다.`, line)
    map.set(name, { value, line })
  }
  for (const [index, raw] of prepared.expandedSource.split('\n').entries()) {
    const text = raw.split('#')[0].trim(),
      line = index + 1
    if (!text) continue
    const derivative = DERIVATIVE.exec(text) ?? COMPACT.exec(text)
    if (derivative) {
      equations.push({
        name: derivative[1],
        independent: derivative[2],
        text: derivative[3],
        line,
      })
      continue
    }
    const prime = PRIME.exec(text)
    if (prime) {
      equations.push({ name: prime[1], text: prime[2], line })
      continue
    }
    const cond = CONDITION.exec(text)
    if (cond) {
      condition(
        cond[2] === '0' ? starts : finals,
        cond[1],
        numeric(cond[3], line),
        line,
      )
      continue
    }
    const pipe = PIPE.exec(text)
    if (pipe) {
      const limits = pipe[2].split(':')
      if (limits.length > 2)
        throw new ModelError('범위는 t|시작:끝 형식으로 입력하세요.', line)
      condition(starts, pipe[1], numeric(limits[0], line), line)
      if (limits.length === 2)
        condition(finals, pipe[1], numeric(limits[1], line), line)
      continue
    }
    const assignment = ASSIGNMENT.exec(text)
    if (!assignment)
      throw new ModelError(
        'd(A)/d(t)=-k*A, A(0)=1, t|0:10처럼 입력하세요.',
        line,
      )
    assertName(assignment[1], line)
    definitions.push({
      name: assignment[1],
      expression: parseNonlinearExpression(assignment[2], line),
      literal: NUMBER.test(assignment[2].trim()),
      line,
    })
  }
  if (!equations.length)
    throw new ModelError(
      '하나 이상의 미분방정식을 입력하세요. 예: d(A)/d(t)=-k*A',
    )
  if (equations.length > 32 || definitions.length > 256)
    throw new ModelError('미분 변수는 최대 32개, 보조식은 최대 256개입니다.')
  const names = equations.map((eq) => eq.name)
  const independentNames = new Set(
    equations.flatMap((eq) => (eq.independent ? [eq.independent] : [])),
  )
  if (independentNames.size > 1)
    throw new ModelError('모든 미분방정식은 같은 독립변수를 사용해야 합니다.')
  const possibleIndependent = [...finals.keys()].filter(
    (name) => !names.includes(name),
  )
  const independent =
    independentNames.values().next().value ??
    (possibleIndependent.length === 1 ? possibleIndependent[0] : undefined)
  if (!independent)
    throw new ModelError('독립변수의 범위를 입력하세요. 예: t|0:10')
  assertName(independent)
  const occupied = new Set<string>([independent])
  for (const eq of equations) {
    assertName(eq.name, eq.line)
    if (occupied.has(eq.name))
      throw new ModelError(
        `미분 변수 '${eq.name}'가 중복되었거나 독립변수와 같습니다.`,
        eq.line,
      )
    occupied.add(eq.name)
  }
  for (const def of prepared.definitions)
    if (occupied.has(def.name))
      throw new ModelError(
        `함수 '${def.name}'는 미분 변수와 다른 이름을 사용하세요.`,
        def.line,
      )
  for (const def of definitions) {
    if (occupied.has(def.name))
      throw new ModelError(`'${def.name}'이 중복 정의되었습니다.`, def.line)
    occupied.add(def.name)
    if (Object.hasOwn(parameters, def.name) && !def.literal)
      throw new ModelError(
        `수식 보조식 '${def.name}'은 슬라이더 값으로 덮어쓸 수 없습니다.`,
        def.line,
      )
  }
  for (const name of Object.keys(parameters))
    if (names.includes(name) || name === independent)
      throw new ModelError(
        `'${name}'은 상태변수이므로 파라미터로 지정할 수 없습니다.`,
      )
  for (const [name, item] of starts)
    if (!names.includes(name) && name !== independent)
      throw new ModelError(
        `초기값의 변수 '${name}'가 미분방정식에 없습니다.`,
        item.line,
      )
  for (const [name, item] of finals)
    if (name !== independent)
      throw new ModelError(
        `최종값은 독립변수 '${independent}'에만 지정할 수 있습니다.`,
        item.line,
      )
  const beginning = starts.get(independent),
    ending = finals.get(independent)
  if (!beginning || !ending)
    throw new ModelError(
      `${independent}(0)와 ${independent}(f), 또는 ${independent}|시작:끝 범위를 입력하세요.`,
    )
  const start = beginning.value,
    end = ending.value
  if (!(end > start) || !Number.isFinite(end - start))
    throw new ModelError(
      '최종값은 시작값보다 큰 유한한 범위여야 합니다.',
      ending.line,
    )
  const initial = names.map((name) => {
    const entry = starts.get(name)
    if (!entry) throw new ModelError(`초기값 '${name}(0)'을 입력하세요.`)
    return entry.value
  })
  const available = new Set([
    ...occupied,
    ...Object.keys(parameters),
    ...BUILTINS,
  ])
  const rhs = equations.map((eq) => parseNonlinearExpression(eq.text, eq.line))
  for (const expression of [
    ...rhs,
    ...definitions.map((def) => def.expression),
  ])
    for (const reference of expression.references)
      if (!available.has(reference))
        throw new ModelError(
          `정의되지 않은 변수 '${reference}'입니다.`,
          expression.line,
        )
  const byName = new Map(definitions.map((def) => [def.name, def]))
  const ordered: Definition[] = [],
    pending = new Map(
      definitions.map((def) => [
        def.name,
        new Set(
          [...def.expression.references].filter((name) => byName.has(name)),
        ),
      ]),
    )
  while (pending.size) {
    const ready = [...pending].filter(([, refs]) => refs.size === 0)
    if (!ready.length)
      throw new ModelError(
        `보조식 순환 참조가 있습니다: ${[...pending.keys()].join(', ')}`,
      )
    for (const [name] of ready) {
      ordered.push(byName.get(name)!)
      pending.delete(name)
      for (const deps of pending.values()) deps.delete(name)
    }
  }
  const evaluate = (time: number, values: number[]) => {
    const environment = new Map<string, number>([
      ['pi', Math.PI],
      ['e', Math.E],
      ...Object.entries(parameters),
    ])
    environment.set(independent, time)
    names.forEach((name, index) => environment.set(name, values[index]))
    for (const def of ordered)
      environment.set(
        def.name,
        def.literal && Object.hasOwn(parameters, def.name)
          ? parameters[def.name]
          : evaluateNonlinearExpression(def.expression, environment),
      )
    return {
      derivative: rhs.map((expression) =>
        evaluateNonlinearExpression(expression, environment),
      ),
      helpers: definitions.map((def) => environment.get(def.name)!),
    }
  }
  evaluate(start, initial)
  return {
    independent,
    names,
    initial,
    start,
    end,
    helpers: definitions.map((def) => def.name),
    evaluate,
  }
}

const combination = (base: number[], h: number, terms: [number, number[]][]) =>
  base.map(
    (value, i) =>
      value +
      h *
        terms.reduce(
          (sum, [coefficient, vector]) => sum + coefficient * vector[i],
          0,
        ),
  )
const magnitude = (v: number[]) => Math.max(0, ...v.map(Math.abs))
function errorNorm(
  error: number[],
  a: number[],
  b: number[],
  tolerance: number,
): number {
  return Math.max(
    ...error.map(
      (e, i) =>
        Math.abs(e) /
        (tolerance * (0.01 + Math.max(Math.abs(a[i]), Math.abs(b[i])))),
    ),
  )
}
function linearSolve(matrix: number[][], rhs: number[]): number[] | undefined {
  const a = matrix.map((row, i) => [...row, rhs[i]])
  const n = rhs.length
  for (let k = 0; k < n; k++) {
    let pivot = k
    for (let i = k + 1; i < n; i++)
      if (Math.abs(a[i][k]) > Math.abs(a[pivot][k])) pivot = i
    if (
      !Number.isFinite(a[pivot][k]) ||
      Math.abs(a[pivot][k]) <=
        Number.EPSILON *
          Math.max(Number.MIN_VALUE, ...a[pivot].slice(0, n).map(Math.abs)) *
          n
    )
      return undefined
    ;[a[k], a[pivot]] = [a[pivot], a[k]]
    for (let i = k + 1; i < n; i++) {
      const f = a[i][k] / a[k][k]
      for (let j = k; j <= n; j++) a[i][j] -= f * a[k][j]
    }
  }
  const x = Array<number>(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    let v = a[i][n]
    for (let j = i + 1; j < n; j++) v -= a[i][j] * x[j]
    x[i] = v / a[i][i]
  }
  return x.every(Number.isFinite) ? x : undefined
}

/** Adaptive Dormand–Prince 5(4), with optional backward-Euler step doubling
 * for stiff systems. Every requested output row is an actual accepted endpoint. */
export function solveOde(request: ScientificRequest): ScientificResult {
  const begun = performance.now()
  const tolerance = request.options?.tolerance ?? 1e-7
  const samples = request.options?.samples ?? 201
  const maxSteps = request.options?.maxIterations ?? 50000
  const requestedMethod = (request.options?.method ?? 'auto').toLowerCase()
  if (!Number.isFinite(tolerance) || tolerance < 1e-12 || tolerance > 0.01)
    throw new ModelError('상대 허용치는 1e-12부터 0.01 사이로 설정하세요.')
  if (!Number.isInteger(samples) || samples < 2 || samples > 5000)
    throw new ModelError('출력 지점은 2~5,000개의 정수로 설정하세요.')
  if (!Number.isInteger(maxSteps) || maxSteps < 1 || maxSteps > 200000)
    throw new ModelError('최대 스텝은 1~200,000의 정수로 설정하세요.')
  if (!['auto', 'rk45', 'implicit', 'stiff'].includes(requestedMethod))
    throw new ModelError('ODE 해법은 auto, rk45, implicit 중에서 선택하세요.')
  const model = compileOde(request.source, request.parameters)
  const targets = Array.from({ length: samples }, (_, i) =>
    i === samples - 1
      ? model.end
      : model.start + ((model.end - model.start) * i) / (samples - 1),
  )
  if (targets.some((value, i) => i && value <= targets[i - 1]))
    throw new ModelError(
      '출력 간격이 현재 시간 값의 Float64 정밀도보다 작습니다.',
    )
  // compileOde evaluates the initial RHS once to validate the model.
  let evaluations = 1
  const evaluated = (t: number, y: number[]) => {
    if (++evaluations > 1000000)
      throw new ModelError(
        '미분식 평가 한도에 도달했습니다. 구간을 줄이거나 강성 해법을 선택하세요.',
      )
    if (!y.every(Number.isFinite))
      throw new ModelError(
        '적분 중 상태변수가 유한한 실수 범위를 벗어났습니다.',
      )
    return model.evaluate(t, y)
  }
  const f = (t: number, y: number[]) => evaluated(t, y).derivative
  function rk(t: number, y: number[], h: number) {
    const k1 = f(t, y)
    const k2 = f(t + h / 5, combination(y, h, [[1 / 5, k1]]))
    const k3 = f(
      t + (h * 3) / 10,
      combination(y, h, [
        [3 / 40, k1],
        [9 / 40, k2],
      ]),
    )
    const k4 = f(
      t + (h * 4) / 5,
      combination(y, h, [
        [44 / 45, k1],
        [-56 / 15, k2],
        [32 / 9, k3],
      ]),
    )
    const k5 = f(
      t + (h * 8) / 9,
      combination(y, h, [
        [19372 / 6561, k1],
        [-25360 / 2187, k2],
        [64448 / 6561, k3],
        [-212 / 729, k4],
      ]),
    )
    const k6 = f(
      t + h,
      combination(y, h, [
        [9017 / 3168, k1],
        [-355 / 33, k2],
        [46732 / 5247, k3],
        [49 / 176, k4],
        [-5103 / 18656, k5],
      ]),
    )
    const next = combination(y, h, [
      [35 / 384, k1],
      [500 / 1113, k3],
      [125 / 192, k4],
      [-2187 / 6784, k5],
      [11 / 84, k6],
    ])
    const k7 = f(t + h, next)
    const lower = combination(y, h, [
      [5179 / 57600, k1],
      [7571 / 16695, k3],
      [393 / 640, k4],
      [-92097 / 339200, k5],
      [187 / 2100, k6],
      [1 / 40, k7],
    ])
    return { values: next, error: next.map((v, i) => v - lower[i]) }
  }
  function backwardEuler(
    t: number,
    y: number[],
    h: number,
  ): number[] | undefined {
    let z = [...y]
    const g = (point: number[]) => {
      const slope = f(t + h, point)
      return point.map((v, i) => v - y[i] - h * slope[i])
    }
    for (let iteration = 0; iteration < 14; iteration++) {
      let residual: number[]
      try {
        residual = g(z)
      } catch {
        return undefined
      }
      if (errorNorm(residual, y, z, tolerance) <= 0.01) return z
      const jacobian = Array.from({ length: y.length }, () =>
        Array<number>(y.length).fill(0),
      )
      for (let j = 0; j < y.length; j++) {
        const step = Math.sqrt(Number.EPSILON) * Math.max(1, Math.abs(z[j]))
        const plus = [...z],
          minus = [...z]
        plus[j] += step
        minus[j] -= step
        let gp: number[] | undefined, gm: number[] | undefined
        try {
          gp = g(plus)
        } catch {
          /* use the valid side */
        }
        try {
          gm = g(minus)
        } catch {
          /* use the valid side */
        }
        if (!gp && !gm) return undefined
        for (let i = 0; i < y.length; i++)
          jacobian[i][j] =
            gp && gm
              ? (gp[i] - gm[i]) / (2 * step)
              : gp
                ? (gp[i] - residual[i]) / step
                : (residual[i] - gm![i]) / step
      }
      const correction = linearSolve(
        jacobian,
        residual.map((r) => -r),
      )
      if (!correction) return undefined
      let updated: number[] | undefined
      for (let damping = 1; damping >= 1 / 128; damping /= 2) {
        const candidate = z.map((v, i) => v + damping * correction[i])
        try {
          if (magnitude(g(candidate)) < magnitude(residual)) {
            updated = candidate
            break
          }
        } catch {
          /* shrink toward the current valid iterate */
        }
      }
      if (!updated) return undefined
      z = updated
    }
    return undefined
  }
  function implicit(t: number, y: number[], h: number) {
    const coarse = backwardEuler(t, y, h)
    const half = backwardEuler(t, y, h / 2)
    const fine = half && backwardEuler(t + h / 2, half, h / 2)
    if (!coarse || !fine)
      throw new ModelError('암시적 Newton 보정이 수렴하지 않았습니다.')
    return { values: fine, error: fine.map((v, i) => v - coarse[i]) }
  }
  let time = model.start,
    values = [...model.initial],
    h = Math.max(Number.MIN_VALUE, (model.end - model.start) / 100)
  if (time + h === time) h = targets[1] - time
  let useImplicit =
    requestedMethod === 'implicit' || requestedMethod === 'stiff'
  let accepted = 0,
    rejected = 0,
    attempted = 0,
    consecutiveRejections = 0
  let maxLocalError = 0,
    status: ScientificResult['status'] = 'completed',
    message: string | undefined
  const rows: number[][] = [
    [time, ...values, ...evaluated(time, values).helpers],
  ]
  const warnings: string[] = []
  let switched = false
  try {
    for (let output = 1; output < targets.length; output++) {
      const target = targets[output]
      while (time < target) {
        if (attempted >= maxSteps)
          throw new ModelError(
            '적분 스텝 한도에 도달했습니다. 허용치를 조정하거나 강성 해법을 선택하세요.',
          )
        if (performance.now() - begun > 3500)
          throw new ModelError(
            '계산 시간 한도에 도달했습니다. 구간·출력 지점 수를 줄이세요.',
          )
        h = Math.min(h, target - time)
        if (!(h > 0) || time + h === time)
          throw new ModelError(
            '허용 오차를 만족하는 적분 스텝을 Float64로 표현할 수 없습니다.',
          )
        attempted++
        let step: { values: number[]; error: number[] } | undefined
        let error = Infinity
        try {
          step = useImplicit ? implicit(time, values, h) : rk(time, values, h)
          error = errorNorm(step.error, values, step.values, tolerance)
        } catch (cause) {
          if (cause instanceof ModelError && /한도/.test(cause.message))
            throw cause
        }
        if (
          step &&
          Number.isFinite(error) &&
          error <= 1 &&
          step.values.every(Number.isFinite)
        ) {
          time = h === target - time ? target : time + h
          values = step.values
          maxLocalError = Math.max(maxLocalError, magnitude(step.error))
          accepted++
          consecutiveRejections = 0
          h *=
            error === 0
              ? 4
              : Math.min(
                  4,
                  Math.max(0.2, 0.9 * error ** (useImplicit ? -0.5 : -0.2)),
                )
        } else {
          rejected++
          consecutiveRejections++
          h *=
            Number.isFinite(error) && error > 0
              ? Math.max(0.1, 0.8 * error ** (useImplicit ? -0.5 : -0.2))
              : 0.25
        }
        if (
          requestedMethod === 'auto' &&
          !useImplicit &&
          (consecutiveRejections >= 8 ||
            (accepted > 100 &&
              time - model.start < (model.end - model.start) * 0.1))
        ) {
          useImplicit = true
          switched = true
        }
      }
      rows.push([target, ...values, ...evaluated(target, values).helpers])
    }
  } catch (cause) {
    status = 'stopped'
    message =
      cause instanceof Error
        ? cause.message
        : '수치 적분을 완료하지 못했습니다.'
    warnings.push(
      '표와 그래프는 완료한 출력 지점까지만 포함합니다. 최종 시각까지 계산된 결과가 아닙니다.',
    )
  }
  if (switched)
    warnings.push(
      'RK45의 반복적인 스텝 축소·부담을 감지하여 암시적 Euler 스텝 이분 비교로 전환했습니다. 강성의 수학적 판정은 아닙니다.',
    )
  const columns = [model.independent, ...model.names, ...model.helpers]
  const times = rows.map((row) => row[0])
  const final = rows.at(-1)!
  return {
    module: 'ode',
    method: switched
      ? 'Dormand–Prince RK45 → 암시적 Euler · 스텝 이분 비교'
      : useImplicit
        ? '암시적 Euler · 스텝 이분 비교'
        : 'Dormand–Prince RK45 · 적응 스텝',
    status,
    ...(message ? { message } : {}),
    columns,
    rows,
    series: model.names.map((name, i) => ({
      name,
      x: times,
      y: rows.map((row) => row[i + 1]),
      style: 'line',
      axisLabel: model.independent,
    })),
    values: Object.fromEntries(
      model.names.map((name, i) => [name, final[i + 1]]),
    ),
    metrics: [
      {
        label: '완료한 시각',
        value: final[0],
        detail: `요청 범위 ${model.start} ~ ${model.end}. 중단 상태에서는 마지막으로 완료한 출력 시각입니다.`,
      },
      {
        label: '허용 오차',
        value: tolerance,
        detail:
          '국소 오차 척도는 tolerance × (0.01 + max(|이전값|, |다음값|))입니다. 전 구간 실제 오차 상한이나 측정 정확도의 보장은 아닙니다.',
      },
      {
        label: '최대 국소 오차 추정',
        value: accepted ? maxLocalError : '승인 스텝 없음',
        detail:
          '승인한 스텝의 고·저차 해 차이 또는 두 스텝 크기 차이의 최대 절댓값입니다. 누적 전역 오차의 엄밀한 상한은 아닙니다.',
      },
      {
        label: '승인 / 거부 스텝',
        value: `${accepted} / ${rejected}`,
        detail:
          '오차 조건을 통과한 스텝과 줄여서 다시 계산한 스텝의 수입니다. 출력 지점 수와 다릅니다.',
      },
      ...model.names.map((name, i) => ({
        label: `${name} 범위`,
        value: `${Math.min(...rows.map((row) => row[i + 1])).toPrecision(6)} ~ ${Math.max(...rows.map((row) => row[i + 1])).toPrecision(6)}`,
        detail:
          '표시한 출력 지점에서의 최솟값·최댓값입니다. 표본 사이의 연속 극값을 모두 탐색한 값은 아닙니다.',
      })),
    ],
    warnings,
    iterations: attempted,
    evaluations,
    durationMs: performance.now() - begun,
  }
}
