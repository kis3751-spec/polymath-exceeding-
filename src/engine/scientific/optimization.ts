import { ModelError } from '../index'
import { evaluateDual, type Dual } from '../expression-derivative'
import {
  parseNonlinearExpression,
  evaluateNonlinearExpression as evaluatePoint,
  isNonlinearFunction,
} from '../nonlinear-parser'
import { preprocessModelSource } from '../preprocessor'
import { compileAssignments } from './expression'
import { parseDataTable } from './data'
import type { ScientificRequest, ScientificResult } from './types'

type Variable = { name: string; guess: number; min: number; max: number }
type Expression = ReturnType<typeof parseNonlinearExpression>
type Constraint = { expression: Expression; equality: boolean; text: string }
type Evaluation = {
  objective: number
  gradient: number[]
  constraints: number[]
  jacobian: number[][]
  predictions?: number[]
}
const numberPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/
const norm = (x: number[]) => Math.max(0, ...x.map(Math.abs))
const dot = (a: number[], b: number[]) =>
  a.reduce((sum, v, i) => sum + v * b[i], 0)
const identity = (n: number) =>
  Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => +(i === j)),
  )

/** Bounded local nonlinear optimization. An augmented Lagrangian handles
 * equality and inequality constraints; a projected BFGS inner solve includes
 * bound stationarity. Feasibility alone never means the optimization converged. */
export function solveOptimization(
  request: ScientificRequest,
): ScientificResult {
  const start = performance.now()
  if (!['optimization', 'lsq'].includes(request.module))
    throw new ModelError('최적화 모듈을 선택하세요.')
  if (
    request.options?.method &&
    !['auto', 'bfgs', 'al', 'augmented-lagrangian'].includes(
      request.options.method,
    )
  )
    throw new ModelError('지원하는 최적화 방법은 auto, bfgs, al입니다.')
  const tolerance = request.options?.tolerance ?? 1e-7
  const maximum = request.options?.maxIterations ?? 1000
  if (
    !Number.isFinite(tolerance) ||
    tolerance < 1e-12 ||
    tolerance > 0.01 ||
    !Number.isInteger(maximum) ||
    maximum < 1 ||
    maximum > 5000
  )
    throw new ModelError(
      '허용 오차는 1e-12~0.01, 최대 반복은 1~5,000의 정수로 설정하세요.',
    )
  const table = parseDataTable(request.source)
  const variables: Variable[] = [],
    helperLines: string[] = [],
    functionLines: string[] = [],
    rawConstraints: string[] = []
  let main: { target?: string; text: string } | undefined
  const warnings: string[] = []
  for (const [index, raw] of table.remainingLines.entries()) {
    const line = raw.replace(/−/g, '-').trim()
    if (/^#/.test(line) || !line) continue
    if (/^(min|fit)\s*:/i.test(line)) {
      if (main)
        throw new ModelError(
          'min: 또는 fit: 주 식은 한 개만 입력하세요.',
          index + 1,
        )
      if (/^min\s*:/i.test(line)) {
        if (request.module === 'lsq')
          throw new ModelError(
            'LSQ Optimization에서는 fit: 관측값 = 모델을 입력하세요.',
          )
        main = { text: line.replace(/^min\s*:/i, '').trim() }
      } else {
        const match = /^fit\s*:\s*([A-Za-z][A-Za-z0-9_]*)\s*=\s*(.+)$/i.exec(
          line,
        )
        if (!match)
          throw new ModelError(
            'fit: y = 모델 수식 형태로 입력하세요.',
            index + 1,
          )
        if (request.module !== 'lsq')
          throw new ModelError(
            '데이터 모델 적합은 LSQ Optimization에서 fit: 문법을 사용하세요.',
          )
        main = { target: match[1], text: match[2] }
      }
      continue
    }
    const bound = /^([A-Za-z][A-Za-z0-9_]*)\s*\|\s*(.+)$/.exec(line)
    const initial = /^([A-Za-z][A-Za-z0-9_]*)\s*\(\s*0\s*\)\s*=\s*(.+)$/.exec(
      line,
    )
    if (bound || initial) {
      const match = (bound ?? initial)!
      if (['pi', 'e'].includes(match[1]) || isNonlinearFunction(match[1]))
        throw new ModelError(
          `최적화 변수 이름 '${match[1]}'는 내장 함수·상수와 겹칩니다.`,
        )
      const fields = match[2].trim().split(/[\s,]+/)
      if (
        (bound && fields.length !== 3) ||
        (initial && fields.length !== 1) ||
        fields.some((x) => !numberPattern.test(x))
      )
        throw new ModelError(
          '최적화 변수는 x|초기값 최솟값 최댓값 또는 x(0)=초기값으로 정의하세요.',
          index + 1,
        )
      if (
        variables.some((v) => v.name === match[1]) ||
        table.columns.includes(match[1])
      )
        throw new ModelError(
          `최적화 변수 '${match[1]}'가 중복되거나 데이터 열과 겹칩니다.`,
        )
      const values = fields.map(Number),
        guess = values[0],
        min = bound ? values[1] : -Infinity,
        max = bound ? values[2] : Infinity
      if (
        !values.every(Number.isFinite) ||
        min > max ||
        guess < min ||
        guess > max
      )
        throw new ModelError(
          `'${match[1]}'의 초기값이 유한한 범위 안에 있어야 합니다.`,
        )
      variables.push({ name: match[1], guess, min, max })
      continue
    }
    if (/^f\d+\s*(?:\([^)]*\))?\s*=/.test(line)) functionLines.push(line)
    else if (/^([A-Za-z][A-Za-z0-9_]*)\s*=([^=]+)$/.test(line))
      helperLines.push(line)
    else
      rawConstraints.push(
        line.replace(/^(?:constraint|subject to)\s*:\s*/i, ''),
      )
  }
  if (!main)
    throw new ModelError(
      request.module === 'lsq'
        ? 'fit: y = 모델 수식을 입력하세요.'
        : 'min: 최소화할 수식을 입력하세요.',
    )
  if (!variables.length || variables.length > 16)
    throw new ModelError(
      '초기값과 범위를 갖는 최적화 변수를 1~16개 정의하세요.',
    )
  if (request.module === 'optimization' && table.columns.length)
    throw new ModelError(
      'min: 최적화에는 데이터 표를 사용하지 않습니다. 데이터 적합에는 fit:를 사용하세요.',
    )
  if (
    main.target &&
    (!table.rows.length || !table.columns.includes(main.target))
  )
    throw new ModelError('fit:의 관측값은 데이터 표의 열 이름이어야 합니다.')

  // A bare decision-variable equality is an intuitive constraint, while other
  // name=expression lines remain explicit helpers.
  const helpersOnly: string[] = []
  for (const line of helperLines) {
    const left = line.slice(0, line.indexOf('=')).trim()
    if (variables.some((v) => v.name === left)) rawConstraints.push(line)
    else helpersOnly.push(line)
  }
  const expand = (text: string) => {
    if (!functionLines.length) return text.replace(/\barctan\s*\(/gi, 'atan(')
    const wrapper = 'optMainInternal'
    if (text.includes(wrapper))
      throw new ModelError('optMainInternal은 내부 예약 이름입니다.')
    const expanded = preprocessModelSource(
      [...functionLines, `${wrapper} = ${text}`].join('\n'),
      [
        ...variables.map((v) => v.name),
        ...helpersOnly.map((l) => l.split('=')[0].trim()),
        ...table.columns,
      ],
      'nonlinear',
    ).expandedSource
    const found = expanded
      .split('\n')
      .find((l) => l.trim().startsWith(`${wrapper} =`))
    if (!found)
      throw new ModelError(
        '번호 있는 함수 정의를 수식으로 전개하지 못했습니다.',
      )
    return found
      .slice(found.indexOf('=') + 1)
      .trim()
      .replace(/\barctan\s*\(/gi, 'atan(')
  }
  const expandedHelpers = helpersOnly.map(
    (line) =>
      `${line.slice(0, line.indexOf('='))}=${expand(line.slice(line.indexOf('=') + 1))}`,
  )
  const helpers = compileAssignments(expandedHelpers, {
    reserved: [...variables.map((v) => v.name), ...table.columns],
    parameters: request.parameters,
  })
  const helperExpressions = new Map<string, Expression>()
  for (const line of expandedHelpers) {
    const left = line.slice(0, line.indexOf('=')).trim(),
      right = line.slice(line.indexOf('=') + 1)
    const parsed = parseNonlinearExpression(right)
    helperExpressions.set(
      left,
      Object.hasOwn(request.parameters ?? {}, left) &&
        parsed.references.size === 0
        ? parseNonlinearExpression(String(request.parameters![left]))
        : parsed,
    )
  }
  const objective = parseNonlinearExpression(expand(main.text))
  if (main.target && objective.references.has(main.target))
    throw new ModelError('fit: 관측값은 모델 수식의 우변에 사용할 수 없습니다.')
  const constraints: Constraint[] = rawConstraints.map((text) => {
    const match = /^(.*?)\s*(>=|<=|>|<|=)\s*(.*?)$/.exec(text)
    if (!match || !match[1].trim() || !match[3].trim())
      throw new ModelError(`인식할 수 없는 최적화 행 '${text}'입니다.`)
    const [, left, operator, right] = match
    if (operator === '>' || operator === '<')
      warnings.push(
        '엄격 부등호는 수치 최적화에서 경계를 포함하는 제약으로 계산합니다. 열린 영역의 최솟값 존재는 별도로 확인하세요.',
      )
    const body =
      operator === '<' || operator === '<='
        ? `(${right})-(${left})`
        : `(${left})-(${right})`
    return {
      expression: parseNonlinearExpression(expand(body)),
      equality: operator === '=',
      text,
    }
  })
  if (constraints.length > 32)
    throw new ModelError('제약식은 최대 32개까지 계산합니다.')
  const dependencyNames = (
    expression: Expression,
    seen = new Set<string>(),
  ): Set<string> => {
    const names = new Set<string>()
    for (const name of expression.references) {
      names.add(name)
      const helper = helperExpressions.get(name)
      if (helper && !seen.has(name)) {
        seen.add(name)
        for (const dependency of dependencyNames(helper, seen))
          names.add(dependency)
      }
    }
    return names
  }
  if (main.target && dependencyNames(objective).has(main.target))
    throw new ModelError(
      'fit: 관측값은 보조식을 통해서도 모델 우변에 사용할 수 없습니다.',
    )
  for (const constraint of constraints)
    if (
      [...dependencyNames(constraint.expression)].some((name) =>
        table.columns.includes(name),
      )
    )
      throw new ModelError(
        'LSQ의 제약식은 모델 파라미터와 상수로 정의하세요. 데이터 행마다 다른 제약은 아직 지원하지 않습니다.',
      )
  const used = new Set([
    ...dependencyNames(objective),
    ...constraints.flatMap((c) => [...dependencyNames(c.expression)]),
  ])
  for (const variable of variables)
    if (!used.has(variable.name))
      throw new ModelError(
        `최적화 변수 '${variable.name}'가 목적함수나 제약식에 사용되지 않았습니다.`,
      )
  const available = new Set([
    ...variables.map((v) => v.name),
    ...helpers.names,
    ...table.columns,
    'pi',
    'e',
  ])
  for (const expression of [
    objective,
    ...helperExpressions.values(),
    ...constraints.map((c) => c.expression),
  ])
    for (const name of expression.references)
      if (!available.has(name))
        throw new ModelError(
          `정의되지 않은 변수 '${name}'입니다. 최적화 변수에는 초기값과 범위를 입력하세요.`,
        )

  const scales = variables.map((v) => Math.max(1, Math.abs(v.guess)))
  const lower = variables.map((v, i) => v.min / scales[i]),
    upper = variables.map((v, i) => v.max / scales[i])
  const toValues = (z: number[]) =>
    Object.fromEntries(variables.map((v, i) => [v.name, z[i] * scales[i]]))
  const clamp = (z: number[]) =>
    z.map((v, i) => Math.max(lower[i], Math.min(upper[i], v)))
  const derivativeFallback = { used: false }
  const baseEnvironment = (
    z: number[],
    row?: number[],
    expression?: Expression,
  ) => {
    if (row || !table.columns.length)
      return helpers.evaluate({
        ...toValues(z),
        ...Object.fromEntries(
          table.columns.map((name, i) => [name, row?.[i] ?? NaN]),
        ),
      })
    const values = toValues(z),
      needed = expression ? dependencyNames(expression) : new Set<string>()
    for (const name of helpers.names)
      if (needed.has(name))
        values[name] = compileExpressionValue(
          helperExpressions.get(name)!,
          values,
        )
    return values
  }
  const scalar = (expression: Expression, z: number[], row?: number[]) => {
    const env = baseEnvironment(z, row, expression)
    return compileExpressionValue(expression, env)
  }
  const valueGradient = (
    expression: Expression,
    z: number[],
    row?: number[],
  ) => {
    let value = scalar(expression, z, row)
    const gradient = variables.map((variable, index) => {
      const env = new Map<string, Dual>([
        ['pi', { value: Math.PI, derivative: 0 }],
        ['e', { value: Math.E, derivative: 0 }],
      ])
      variables.forEach((v, j) =>
        env.set(v.name, {
          value: z[j] * scales[j],
          derivative: j === index ? scales[j] : 0,
        }),
      )
      table.columns.forEach((name, j) =>
        env.set(name, { value: row?.[j] ?? NaN, derivative: 0 }),
      )
      for (const name of helpers.names) {
        if (
          !row &&
          table.columns.length &&
          !dependencyNames(expression).has(name)
        )
          continue
        const dual = evaluateDual(helperExpressions.get(name)!.node, env)
        if (!dual) break
        env.set(name, dual)
      }
      const dual = evaluateDual(expression.node, env)
      if (dual) return dual.derivative
      derivativeFallback.used = true
      const h = Math.cbrt(Number.EPSILON) * Math.max(1, Math.abs(z[index]))
      const plus = [...z],
        minus = [...z]
      plus[index] = Math.min(upper[index], z[index] + h)
      minus[index] = Math.max(lower[index], z[index] - h)
      const vp = safe(() => scalar(expression, plus, row)),
        vm = safe(() => scalar(expression, minus, row))
      if (vp !== undefined && vm !== undefined && plus[index] !== minus[index])
        return (vp - vm) / (plus[index] - minus[index])
      if (vp !== undefined && plus[index] !== z[index])
        return (vp - value) / (plus[index] - z[index])
      if (vm !== undefined && minus[index] !== z[index])
        return (value - vm) / (z[index] - minus[index])
      if (lower[index] === upper[index]) return 0
      throw new ModelError(
        `'${variable.name}' 방향의 도함수를 계산할 수 없습니다. 정의역 또는 초기값을 확인하세요.`,
      )
    })
    return { value, gradient }
  }
  let evaluations = 0
  const deadline = start + 7000
  const evaluate = (z: number[]): Evaluation => {
    if (++evaluations > 30000 || performance.now() > deadline)
      throw new ModelError('최적화 계산 예산에 도달했습니다.')
    let value = 0,
      gradient = variables.map(() => 0),
      predictions: number[] | undefined
    if (main!.target) {
      const targetIndex = table.columns.indexOf(main!.target)
      predictions = []
      for (const row of table.rows) {
        const model = valueGradient(objective, z, row),
          error = model.value - row[targetIndex]
        predictions.push(model.value)
        value += error * error
        gradient = gradient.map((v, j) => v + 2 * error * model.gradient[j])
      }
    } else {
      const model = valueGradient(objective, z)
      value = model.value
      gradient = model.gradient
    }
    if (!Number.isFinite(value) || gradient.some((v) => !Number.isFinite(v)))
      throw new ModelError(
        '목적함수가 유한한 값을 반환하지 않습니다. 초기값과 정의역을 확인하세요.',
      )
    const cs = constraints.map((c) => valueGradient(c.expression, z))
    return {
      objective: value,
      gradient,
      constraints: cs.map((c) => c.value),
      jacobian: cs.map((c) => c.gradient),
      predictions,
    }
  }
  let z = variables.map((v, i) => v.guess / scales[i])
  let current = evaluate(z)
  const objectiveScale = Math.max(1, Math.abs(current.objective))
  const constraintScales = constraints.map((_, i) =>
    Math.max(1, Math.abs(current.constraints[i]), norm(current.jacobian[i])),
  )
  let multipliers = constraints.map(() => 0),
    penalty = 10,
    iterations = 0,
    converged = false,
    reason =
      '정해진 반복 예산 안에 국소 정상성과 제약 허용 오차를 모두 만족하지 못했습니다.'
  const trace: number[][] = []
  let projectedNorm = Infinity
  const normalizedConstraints = (evaluation: Evaluation) =>
    evaluation.constraints.map(
      (v, i) => (constraints[i].equality ? v : -v) / constraintScales[i],
    )
  const feasibility = (evaluation: Evaluation) =>
    Math.max(
      0,
      ...normalizedConstraints(evaluation).map((v, i) =>
        constraints[i].equality ? Math.abs(v) : Math.max(0, v),
      ),
    )
  const augmented = (evaluation: Evaluation) => {
    let value = evaluation.objective / objectiveScale
    const gradient = evaluation.gradient.map((v) => v / objectiveScale)
    const c = normalizedConstraints(evaluation)
    for (let i = 0; i < constraints.length; i++) {
      const equality = constraints[i].equality
      const shifted = equality
        ? multipliers[i] + penalty * c[i]
        : Math.max(0, multipliers[i] + penalty * c[i])
      value += equality
        ? multipliers[i] * c[i] + (penalty * c[i] ** 2) / 2
        : (shifted ** 2 - multipliers[i] ** 2) / (2 * penalty)
      for (let j = 0; j < z.length; j++)
        gradient[j] +=
          (shifted * evaluation.jacobian[i][j] * (equality ? 1 : -1)) /
          constraintScales[i]
    }
    return { value, gradient }
  }
  const projected = (point: number[], gradient: number[]) =>
    gradient.map((g, i) =>
      (point[i] <= lower[i] && g > 0) || (point[i] >= upper[i] && g < 0)
        ? 0
        : g,
    )
  let previousViolation = Infinity
  try {
    for (
      let outer = 0;
      outer < (constraints.length ? 35 : 1) && iterations < maximum;
      outer++
    ) {
      let inverse = identity(z.length)
      let innerConverged = false
      const innerBudget = constraints.length
        ? Math.min(150, maximum - iterations)
        : maximum - iterations
      for (
        let inner = 0;
        inner < innerBudget && iterations < maximum;
        inner++
      ) {
        const a = augmented(current),
          pg = projected(z, a.gradient)
        projectedNorm = norm(pg)
        if (projectedNorm <= tolerance) {
          // First-order stationarity also occurs at maxima and saddles. A
          // deterministic local descent probe prevents the common zero-guess
          // trap without treating the probe as a global/second-order proof.
          const directions = identity(z.length)
          if (z.length <= 8)
            for (let i = 0; i < z.length; i++)
              for (let j = i + 1; j < z.length; j++) {
                const same = z.map(() => 0),
                  opposite = [...same]
                same[i] = same[j] = 1
                opposite[i] = 1
                opposite[j] = -1
                directions.push(same, opposite)
              }
          let escape:
            | { point: number[]; evaluation: Evaluation; value: number }
            | undefined
          const probeSize = Math.max(0.001, tolerance ** 0.25)
          for (const direction of directions)
            for (const sign of [-1, 1]) {
              const point = clamp(
                z.map(
                  (v, i) =>
                    v +
                    sign * direction[i] * probeSize * Math.max(1, Math.abs(v)),
                ),
              )
              const evaluation = safe(() => evaluate(point))
              if (!evaluation) continue
              const value = augmented(evaluation).value
              const roundoff =
                64 * Number.EPSILON * Math.max(1, Math.abs(a.value))
              if (
                value < a.value - roundoff &&
                (!escape || value < escape.value)
              )
                escape = { point, evaluation, value }
            }
          if (escape) {
            z = escape.point
            current = escape.evaluation
            inverse = identity(z.length)
            iterations++
            trace.push([
              iterations,
              current.objective,
              feasibility(current),
              ...variables.map((_, i) => z[i] * scales[i]),
            ])
            continue
          }
          innerConverged = true
          break
        }
        let direction = inverse.map((row) => -dot(row, a.gradient))
        direction = direction.map((v, i) =>
          (z[i] <= lower[i] && v < 0) || (z[i] >= upper[i] && v > 0) ? 0 : v,
        )
        if (
          dot(direction, a.gradient) >=
          -Number.EPSILON * Math.max(1, norm(direction) * norm(a.gradient))
        ) {
          direction = pg.map((v) => -v)
          inverse = identity(z.length)
        }
        let accepted:
          | {
              z: number[]
              evaluation: Evaluation
              objective: ReturnType<typeof augmented>
            }
          | undefined
        let alpha = 1
        for (let backtrack = 0; backtrack < 40; backtrack++, alpha /= 2) {
          const trial = clamp(z.map((v, i) => v + alpha * direction[i]))
          const delta = trial.map((v, i) => v - z[i])
          if (!norm(delta)) break
          const next = safe(() => evaluate(trial))
          if (!next) continue
          const nextAug = augmented(next)
          if (nextAug.value <= a.value + 1e-4 * dot(a.gradient, delta)) {
            accepted = { z: trial, evaluation: next, objective: nextAug }
            break
          }
        }
        if (!accepted) {
          reason = '선 탐색이 더 이상 목적함수를 줄이지 못했습니다.'
          break
        }
        const step = accepted.z.map((v, i) => v - z[i]),
          change = accepted.objective.gradient.map((v, i) => v - a.gradient[i]),
          curvature = dot(step, change)
        if (
          curvature >
          1e-12 * Math.max(Number.MIN_VALUE, norm(step) * norm(change))
        ) {
          const hy = inverse.map((row) => dot(row, change)),
            yhy = dot(change, hy),
            rho = 1 / curvature
          inverse = inverse.map((row, i) =>
            row.map(
              (h, j) =>
                h +
                (1 + yhy * rho) * rho * step[i] * step[j] -
                rho * (step[i] * hy[j] + hy[i] * step[j]),
            ),
          )
        } else inverse = identity(z.length)
        z = accepted.z
        current = accepted.evaluation
        iterations++
        trace.push([
          iterations,
          current.objective,
          feasibility(current),
          ...variables.map((_, i) => z[i] * scales[i]),
        ])
      }
      const violation = feasibility(current)
      if (innerConverged && violation <= tolerance) {
        converged = true
        reason = '국소 정상성과 제약 허용 오차를 만족했습니다.'
        break
      }
      if (!constraints.length) break
      const c = normalizedConstraints(current)
      multipliers = multipliers.map((value, i) =>
        constraints[i].equality
          ? value + penalty * c[i]
          : Math.max(0, value + penalty * c[i]),
      )
      if (violation > previousViolation * 0.3)
        penalty = Math.min(1e10, penalty * 10)
      previousViolation = violation
    }
  } catch (error) {
    reason =
      error instanceof Error ? error.message : '계산을 계속할 수 없습니다.'
  }
  if (!trace.length)
    trace.push([
      0,
      current.objective,
      feasibility(current),
      ...variables.map((_, i) => z[i] * scales[i]),
    ])
  const lastAug = augmented(current)
  projectedNorm = norm(projected(z, lastAug.gradient))
  const violation = feasibility(current)
  if (!converged && projectedNorm <= tolerance && violation <= tolerance) {
    converged = true
    reason = '국소 정상성과 제약 허용 오차를 만족했습니다.'
  }
  if (!converged) warnings.push(reason)
  warnings.push(
    '현재 초기값에서 얻은 국소 최적화 결과입니다. 비볼록 문제의 전역 최솟값을 보장하지 않습니다.',
  )
  if (derivativeFallback.used)
    warnings.push(
      '미분 불가능하거나 자동미분이 실패한 방향에는 정의역을 확인한 수치 미분을 사용했습니다. 해당 위치의 국소 진단은 근사입니다.',
    )
  const values = toValues(z)
  values[Object.hasOwn(values, 'objective') ? 'objectiveValue' : 'objective'] =
    current.objective
  const rawViolation = Math.max(
    0,
    ...current.constraints.map((v, i) =>
      constraints[i].equality ? Math.abs(v) : Math.max(0, -v),
    ),
  )
  const metrics: ScientificResult['metrics'] = [
    {
      label: main.target ? '제곱 오차 합 SSE' : '목적함수 최종값',
      value: current.objective,
      detail: main.target
        ? '모든 관측행의 (예측−관측)² 합입니다. 값의 단위와 데이터 수에 따라 크기가 달라집니다.'
        : '입력한 목적함수의 최종값입니다. 국소 최솟값 후보이며 전역 최적성의 증명은 아닙니다.',
    },
    {
      label: '최대 제약 위반',
      value: rawViolation,
      detail:
        '등식은 절댓값, 부등식은 경계 바깥으로 벗어난 양 중 최댓값입니다. 각 제약의 원래 단위 기준입니다.',
    },
    {
      label: '정규화 국소 정상성',
      value: projectedNorm,
      detail:
        '목적함수·제약 스케일을 정규화한 augmented Lagrangian의 투영 기울기 최댓값입니다. 작을수록 경계와 활성 제약을 고려한 국소 정상성에 가깝습니다.',
    },
    {
      label: '반복 횟수',
      value: iterations,
      detail:
        '실제로 승인한 BFGS 스텝 수입니다. 최대 반복에 도달했다고 수렴으로 간주하지 않습니다.',
    },
  ]
  let columns = [
      '반복',
      '목적함수',
      '제약 위반',
      ...variables.map((v) => v.name),
    ],
    rows = trace
  const series: ScientificResult['series'] = [
    {
      name: '목적함수',
      x: trace.map((r) => r[0]),
      y: trace.map((r) => r[1]),
      axisLabel: 'iteration',
    },
  ]
  if (main.target) {
    const yi = table.columns.indexOf(main.target),
      independent = table.columns.findIndex((name) => name !== main!.target)
    const x = table.rows.map((row, i) =>
      independent >= 0 ? row[independent] : i,
    )
    const sortOrder = x.map((_, i) => i).sort((a, b) => x[a] - x[b])
    const residuals = current.predictions!.map(
      (prediction, i) => prediction - table.rows[i][yi],
    )
    columns = [...table.columns, 'prediction', 'error']
    rows = table.rows.map((row, i) => [
      ...row,
      current.predictions![i],
      residuals[i],
    ])
    series.unshift(
      {
        name: '관측값',
        x,
        y: table.rows.map((row) => row[yi]),
        style: 'points',
        axisLabel: independent >= 0 ? table.columns[independent] : 'row',
      },
      {
        name: '최적 적합',
        x: sortOrder.map((i) => x[i]),
        y: sortOrder.map((i) => current.predictions![i]),
        axisLabel: independent >= 0 ? table.columns[independent] : 'row',
      },
    )
    metrics.push({
      label: 'RMSE',
      value: Math.sqrt(current.objective / table.rows.length),
      detail:
        '관측값과 모델 예측값 차이의 평균 제곱근으로 관측값과 같은 단위입니다. 새 데이터의 오차 보장은 아닙니다.',
    })
  }
  return {
    module: request.module,
    method: constraints.length
      ? 'Projected BFGS · Augmented Lagrangian'
      : 'Projected BFGS',
    status: converged ? 'converged' : 'stopped',
    message: reason,
    columns,
    rows,
    series,
    values,
    metrics,
    warnings: [...new Set(warnings)],
    iterations,
    evaluations,
    durationMs: performance.now() - start,
    formula: main.target
      ? `${main.target} = ${main.text}`
      : `min: ${main.text}`,
  }
}

function compileExpressionValue(
  expression: Expression,
  environment: Record<string, number>,
) {
  // The parsed AST is reused by the safe evaluator; this does not execute source.
  const env = new Map([
    ['pi', Math.PI],
    ['e', Math.E],
    ...Object.entries(environment),
  ] as [string, number][])
  const dual = evaluateDual(
    expression.node,
    new Map([...env].map(([name, value]) => [name, { value, derivative: 0 }])),
  )
  if (dual && Number.isFinite(dual.value)) return dual.value
  // Built-in non-smooth functions can have a valid value and no derivative.
  return evaluatePoint(expression, env)
}

function safe<T>(fn: () => T): T | undefined {
  try {
    return fn()
  } catch {
    return undefined
  }
}
