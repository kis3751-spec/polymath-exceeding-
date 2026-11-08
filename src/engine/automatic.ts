import { normalizedModelCall } from './source-statements'
import { sameComputedRoot } from './root-comparison'
import { preprocessSolverSource } from './preprocessor'
import { conditionNumber } from './conditioning'
import { ModelError, type SolveResult, type SolverOptions } from './index'
import { createNonlinearSolver, numericalJacobian } from './nonlinear'
import {
  compileNonlinear,
  evaluateNonlinearExpression,
  type NonlinearExpression,
  isNonlinearFunction,
  parseNonlinearExpression,
  type CompiledModel,
  type NonlinearNode,
} from './nonlinear-parser'
import {
  findPolynomialRealRoots,
  isRegularPolynomialFamily,
  polynomialCoefficients,
  rationalCoefficients,
} from './automatic-polynomial'
import {
  markUniquePolynomialRoot,
  withParameterPathValidator,
  type ParameterPathValidator,
} from './root-isolation'
import { createParameterPathValidator } from './parameter-path'

export type SearchSummary = {
  method: string
  min: number
  max: number
  attempts: number
  note: string
  truncated?: boolean
}
export type AutomaticOptions = SolverOptions & {
  searchBounds?: { min: number; max: number }
}
export type AutomaticSearchResult = {
  solutions: SolveResult[]
  search: SearchSummary
}
export type AutomaticSolver = {
  (
    source: string,
    parameters: Record<string, number>,
    options?: AutomaticOptions,
  ): AutomaticSearchResult
  solveNear(
    source: string,
    parameters: Record<string, number>,
    seed: SolveResult | number[],
    options?: SolverOptions,
  ): SolveResult
}
type Prepared = {
  source: string
  variables: string[]
  model: CompiledModel
  expression?: NonlinearNode
  helpers: Map<string, NonlinearNode>
  polynomialRoots: Map<string, { value: number; slope: number }[] | null>
  regularPolynomialFamily: boolean
  parameterPathValidator?: ParameterPathValidator
  fixedEquations: {
    name: string
    row: number
    expression: NonlinearExpression
  }[]
}
const preparedCache = new Map<string, Prepared>()
const ROOT_LIMIT = 32
const TIME_BUDGET_MS = 1800
const CONDITION = /^([A-Za-z][A-Za-z0-9_]*)\(\s*(min|max|0)\s*\)\s*=/
const ROOT = /^f\(\s*([A-Za-z][A-Za-z0-9_]*)\s*\)\s*=/
const BUILTINS = new Set(['pi', 'e'])

/** Convert ordinary equations to residual equations. In f(x) syntax, plain
 * assignments retain their established meaning as named helper expressions. */
export function normalizeAutomaticModel(
  source: string,
  parameterNames: string[],
) {
  const prepared = prepare(source, parameterNames)
  return { source: prepared.source, variables: [...prepared.variables] }
}

function prepare(source: string, parameterNames: string[]): Prepared {
  if (source.length > 30_000)
    throw new ModelError('수식은 30,000자 이내로 입력하세요.')
  const key = JSON.stringify([source, [...parameterNames].sort()])
  const cached = preparedCache.get(key)
  if (cached) return cached
  source = preprocessSolverSource(source, parameterNames, 'nonlinear')
  const lines = source
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((raw, index) => {
      if (/^\s*#@/.test(raw))
        throw new ModelError(
          '자동 탐색에서는 해법 지시문을 사용할 수 없습니다.',
          index + 1,
        )
      return { text: raw.split('#', 1)[0].trim(), line: index + 1 }
    })
    .filter(({ text }) => {
      const condition = CONDITION.exec(text)
      return text && !(condition && !isNonlinearFunction(condition[1]))
    })
  if (!lines.length) throw new ModelError('계산할 방정식을 입력하세요.')
  const explicit = lines.some(({ text }) => ROOT.test(text))
  const variables: string[] = []
  const helpers = new Map<string, NonlinearNode>()
  let expression: NonlinearNode | undefined
  let canonical: string
  const fixedEquations: Prepared['fixedEquations'] = []
  if (explicit) {
    for (const { text, line } of lines) {
      const root = ROOT.exec(text)
      if (root) {
        variables.push(root[1])
        const parsed = parseNonlinearExpression(
          text.slice(root[0].length),
          line,
        )
        if (variables.length === 1) expression = parsed.node
      } else {
        const assignment = /^([A-Za-z][A-Za-z0-9_]*)\s*=([^=]+)$/.exec(text)
        if (assignment)
          helpers.set(
            assignment[1],
            parseNonlinearExpression(assignment[2], line).node,
          )
      }
    }
    canonical = lines.map(({ text }) => text).join('\n')
  } else {
    const parameterSet = new Set(parameterNames)
    const residuals: string[] = []
    for (const { text, line } of lines) {
      const sides = text.split('=')
      if (sides.length > 2)
        throw new ModelError('한 줄에는 등호를 하나만 사용하세요.', line)
      const residual = sides.length === 2 ? `(${sides[0]})-(${sides[1]})` : text
      const parsed = parseNonlinearExpression(residual, line)
      if (residuals.length === 0) expression = parsed.node
      for (const name of parsed.references)
        if (
          !BUILTINS.has(name) &&
          !parameterSet.has(name) &&
          !variables.includes(name)
        )
          variables.push(name)
      if (sides.length === 2 && /^[A-Za-z][A-Za-z0-9_]*$/.test(sides[0].trim()))
        fixedEquations.push({
          name: sides[0].trim(),
          row: residuals.length,
          expression: parseNonlinearExpression(sides[1], line),
        })
      residuals.push(residual)
    }
    if (!variables.length)
      throw new ModelError(
        '해를 구할 미지수가 없습니다. 파라미터와 다른 이름의 미지수를 입력하세요.',
      )
    if (variables.length !== residuals.length)
      throw new ModelError(
        `미지수 ${variables.length}개에 대해 독립적인 방정식 ${variables.length}개가 필요합니다. 현재 ${residuals.length}개입니다.`,
      )
    canonical = residuals
      .map((residual, index) => `f(${variables[index]}) = ${residual}`)
      .join('\n')
  }
  if (variables.length > 16)
    throw new ModelError(
      '자동 탐색의 미지수는 최대 16개까지 사용할 수 있습니다.',
    )
  const metadata =
    variables.length === 1
      ? `${variables[0]}(min) = -100\n${variables[0]}(max) = 100`
      : variables.map((name) => `${name}(0) = 1`).join('\n')
  // The existing strict compiler validates names, helper dependencies and safe
  // expression syntax; these synthetic conditions are only for compilation.
  const model = compileNonlinear(`${canonical}\n${metadata}`, parameterNames)
  const prepared = {
    source: canonical,
    fixedEquations,
    variables: model.variables,
    model,
    expression,
    helpers,
    polynomialRoots: new Map(),
    regularPolynomialFamily:
      model.variables.length === 1 &&
      expression !== undefined &&
      isRegularPolynomialFamily(
        expression,
        model.variables[0],
        new Set(parameterNames),
        helpers,
      ),
    parameterPathValidator:
      model.variables.length === 1 && expression !== undefined
        ? createParameterPathValidator(expression, model.variables[0], helpers)
        : undefined,
  }
  if (preparedCache.size >= 16)
    preparedCache.delete(preparedCache.keys().next().value!)
  preparedCache.set(key, prepared)
  return prepared
}

/** Eliminate exactly specified equation variables without changing what is returned.
 * x=2 remains an equation and x remains in the result, unlike implicit helper inference. */
function fixedReduction(
  prepared: Prepared,
  parameters: Record<string, number>,
) {
  if (prepared.variables.length < 2 || !prepared.fixedEquations.length)
    return undefined
  const environment = new Map(
    Object.entries({ pi: Math.PI, e: Math.E, ...parameters }),
  )
  const fixed: Record<string, number> = {},
    rows = new Set<number>()
  for (let pass = 0; pass < prepared.variables.length; pass++) {
    let changed = false
    for (const candidate of prepared.fixedEquations) {
      if (
        !prepared.variables.includes(candidate.name) ||
        Object.hasOwn(fixed, candidate.name)
      )
        continue
      if (
        [...candidate.expression.references].every((name) =>
          environment.has(name),
        )
      ) {
        const value = evaluateNonlinearExpression(
          candidate.expression,
          environment,
        )
        fixed[candidate.name] = value
        environment.set(candidate.name, value)
        rows.add(candidate.row)
        changed = true
      }
    }
    if (!changed) break
  }
  if (!rows.size) return undefined
  const free = prepared.variables.filter((name) => !Object.hasOwn(fixed, name))
  const residuals = prepared.source.split('\n').filter((_, i) => !rows.has(i))
  const source = residuals
    .map((line, i) => `f(${free[i]}) = ${line.slice(line.indexOf('=') + 1)}`)
    .join('\n')
  return { fixed, free, source }
}
function liftFixedResult(
  prepared: Prepared,
  parameters: Record<string, number>,
  fixed: Record<string, number>,
  freeNames: string[],
  result: SolveResult | undefined,
  options: SolverOptions,
): SolveResult {
  const free = Object.fromEntries(
    freeNames.map((name, i) => [name, result!.values[i]]),
  )
  const values = prepared.variables.map((name) => fixed[name] ?? free[name])
  const evaluate = (v: number[]) => prepared.model.evaluate(v, parameters)
  const evaluation = evaluate(values)
  const matrix =
    prepared.model.jacobian?.(values, parameters) ??
    numericalJacobian(evaluate, values, evaluation.residuals)
  const norm = options.conditionNorm ?? 'infinity'
  let condition = NaN,
    conditionError: string | undefined
  if (options.computeCondition !== false) {
    try {
      condition = conditionNumber(matrix, norm)
    } catch {
      conditionError = '해에서의 Jacobian 조건수를 계산하지 못했습니다.'
    }
  }
  return {
    kind: 'nonlinear',
    variables: prepared.variables,
    values,
    auxiliary: evaluation.auxiliary,
    matrix,
    rhs: evaluation.residuals.map((v) => -v),
    residuals: evaluation.residuals,
    maxResidual: Math.max(...evaluation.residuals.map(Math.abs)),
    condition,
    conditionNorm: norm,
    ...(conditionError ? { conditionError } : {}),
    engine: result?.engine ?? 'javascript',
    iterations: result?.iterations ?? 0,
    durationMs: result?.durationMs ?? 0,
    method: `고정 조건 소거 · ${result?.method ?? '직접 대입'}`,
    warnings: result?.warnings ?? [],
  }
}

function validateParameters(parameters: Record<string, number>) {
  for (const [name, value] of Object.entries(parameters))
    if (!Number.isFinite(value))
      throw new ModelError(`파라미터 '${name}'에 유한한 숫자가 필요합니다.`)
}
function boundsFor(options: AutomaticOptions) {
  const bounds = options.searchBounds ?? { min: -100, max: 100 }
  if (
    !Number.isFinite(bounds.min) ||
    !Number.isFinite(bounds.max) ||
    bounds.min >= bounds.max
  )
    throw new ModelError(
      '자동 탐색 범위에는 최소값보다 큰 유한한 최대값을 입력하세요.',
    )
  return bounds
}
function unique(solutions: SolveResult[], result: SolveResult) {
  if (!result.values.every(Number.isFinite)) return false
  const duplicate = solutions.findIndex((other) =>
    sameComputedRoot(result, other),
  )
  if (duplicate >= 0) {
    if (result.maxResidual < solutions[duplicate].maxResidual)
      solutions[duplicate] = result
    return false
  }
  solutions.push(result)
  return true
}
/** Compare Euclidean distances without overflowing for large coordinates.
 * Symmetric roots use a stable positive-first tie break, independent of the
 * small rounding differences between their numerical refinements. */
function compareFromOrigin(a: number[], b: number[]) {
  const scale = Math.max(...a.map(Math.abs), ...b.map(Math.abs))
  if (scale > 0) {
    const first = Math.hypot(...a.map((value) => value / scale))
    const second = Math.hypot(...b.map((value) => value / scale))
    const difference = first - second
    if (Math.abs(difference) > 1e-10 * Math.max(first, second))
      return difference
  }
  for (let index = 0; index < a.length; index++) {
    const difference = b[index] - a[index]
    if (difference !== 0) return difference
  }
  return 0
}
function sortSolutions(solutions: SolveResult[]) {
  solutions.sort((a, b) => compareFromOrigin(a.values, b.values))
}
function tryScalar(
  model: CompiledModel,
  parameters: Record<string, number>,
  value: number,
) {
  if (!Number.isFinite(value)) return undefined
  try {
    return model.evaluate([value], parameters).residuals[0]
  } catch (error) {
    if (!(error instanceof ModelError)) throw error
    return undefined
  }
}
function derivative(
  model: CompiledModel,
  parameters: Record<string, number>,
  value: number,
  residual: number,
) {
  const exact = model.jacobian?.([value], parameters)?.[0]?.[0]
  if (exact !== undefined && Number.isFinite(exact)) return exact
  let step = Math.cbrt(Number.EPSILON) * (Math.abs(value) || 1)
  for (let attempt = 0; attempt < 14; attempt++, step /= 4) {
    const plus = tryScalar(model, parameters, value + step)
    const minus = tryScalar(model, parameters, value - step)
    if (plus !== undefined && minus !== undefined)
      return (plus - minus) / (value + step - (value - step))
    if (plus !== undefined) return (plus - residual) / (value + step - value)
    if (minus !== undefined)
      return (residual - minus) / (value - (value - step))
  }
  return NaN
}
function hasLocalVariation(
  model: CompiledModel,
  parameters: Record<string, number>,
  value: number,
) {
  const step = 1e-5 * (Math.abs(value) || 1)
  const samples = [value - step, value + step]
    .map((near) => tryScalar(model, parameters, near))
    .filter((residual): residual is number => residual !== undefined)
  // Both available sides must vary. Otherwise a rounded underflow tail or a
  // plateau can be mistaken for an isolated real root. Domain endpoints such
  // as sqrt(x)=0 can legitimately have only one available side.
  return samples.length > 0 && samples.every((residual) => residual !== 0)
}

function smallLocalResidual(
  model: CompiledModel,
  parameters: Record<string, number>,
  value: number,
  residual: number,
) {
  const step = 1e-5 * (Math.abs(value) || 1)
  const nearby = [value - step, value + step]
    .map((near) => tryScalar(model, parameters, near))
    .filter((sample): sample is number => sample !== undefined)
  return (
    nearby.length > 0 &&
    Math.abs(residual) <= Math.max(...nearby.map(Math.abs)) * 1e-8
  )
}

function algebraicCoefficients(
  prepared: Prepared,
  parameters: Record<string, number>,
) {
  if (!prepared.expression) return null
  const constants = { pi: Math.PI, e: Math.E, ...parameters }
  const polynomial = polynomialCoefficients(
    prepared.expression,
    prepared.variables[0],
    constants,
    prepared.helpers,
  )
  if (polynomial) return { coefficients: polynomial, rational: false }
  const rational = rationalCoefficients(
    prepared.expression,
    prepared.variables[0],
    constants,
    prepared.helpers,
  )
  return rational ? { coefficients: rational.numerator, rational: true } : null
}

function factorCandidates(
  prepared: Prepared,
  parameters: Record<string, number>,
  bounds?: { min: number; max: number },
) {
  const candidates: number[] = []
  const constants = { pi: Math.PI, e: Math.E, ...parameters }
  const active = new Set<string>()
  const visit = (node: NonlinearNode, depth = 0): void => {
    if (depth > 128) return
    if (
      node.kind === 'name' &&
      prepared.helpers.has(node.name) &&
      !active.has(node.name)
    ) {
      active.add(node.name)
      visit(prepared.helpers.get(node.name)!, depth + 1)
      active.delete(node.name)
      return
    }
    if (node.kind === 'unary') {
      visit(node.child, depth + 1)
      return
    }
    if (node.kind === 'binary') {
      if (node.operator === '*') {
        visit(node.left, depth + 1)
        visit(node.right, depth + 1)
        return
      }
      if (
        node.operator === '/' ||
        (node.operator === '^' &&
          node.right.kind === 'number' &&
          node.right.value > 0)
      ) {
        visit(node.left, depth + 1)
        return
      }
      if (
        (node.operator === '-' || node.operator === '+') &&
        node.right.kind === 'number' &&
        node.right.value === 0
      ) {
        visit(node.left, depth + 1)
        return
      }
    }
    const coefficients = polynomialCoefficients(
      node,
      prepared.variables[0],
      constants,
      prepared.helpers,
    )
    if (coefficients && coefficients.length > 1)
      candidates.push(...findPolynomialRealRoots(coefficients, bounds).roots)
  }
  if (prepared.expression) visit(prepared.expression)
  return candidates
}

/** Reuse the existing polynomial isolator for local corrections as well as
 * discovery. Newton differences cannot resolve a tiny root next to a large
 * additive constant, and repeated zero roots need an exact algebraic endpoint.
 * Every candidate is still checked against the original (unexpanded) model. */
function polynomialNearRoots(
  prepared: Prepared,
  parameters: Record<string, number>,
) {
  const key = JSON.stringify(
    Object.entries(parameters).sort(([a], [b]) => a.localeCompare(b)),
  )
  if (prepared.polynomialRoots.has(key))
    return prepared.polynomialRoots.get(key)!
  const algebraic = algebraicCoefficients(prepared, parameters)
  const coefficients = algebraic?.coefficients
  let roots: { value: number; slope: number }[] | null = null
  if (coefficients) {
    const isolated = findPolynomialRealRoots(coefficients)
    if (isolated.identicallyZero)
      throw new ModelError(
        '이 방정식은 미지수와 무관하게 0=0이 됩니다. 해를 특정할 독립적인 방정식이 필요합니다.',
      )
    roots = []
    for (const value of new Set([
      ...isolated.roots,
      ...factorCandidates(prepared, parameters),
    ])) {
      let slope = 0
      for (let i = coefficients.length - 1; i > 0; i--)
        slope = slope * value + i * coefficients[i]
      const residual = tryScalar(prepared.model, parameters, value)
      if (residual !== undefined)
        slope = derivative(prepared.model, parameters, value, residual)
      if (
        residual !== undefined &&
        hasLocalVariation(prepared.model, parameters, value) &&
        (residual === 0 ||
          (slope !== 0 &&
            smallLocalResidual(prepared.model, parameters, value, residual) &&
            Math.abs(residual / slope) <=
              128 *
                Number.EPSILON *
                Math.max(Number.MIN_VALUE, Math.abs(value))))
      )
        roots.push({ value, slope })
    }
  }
  if (prepared.polynomialRoots.size >= 32)
    prepared.polynomialRoots.delete(
      prepared.polynomialRoots.keys().next().value!,
    )
  prepared.polynomialRoots.set(key, roots)
  return roots
}

/** Newton refinement requires a small correction as well as a reduced
 * residual, so exponentially small asymptotic tails are not finite roots. */
function scalarNear(
  prepared: Prepared,
  parameters: Record<string, number>,
  seed: number,
  bounds?: { min: number; max: number },
) {
  const model = prepared.model
  let value = seed
  let initial: number | undefined
  for (let iteration = 0; iteration < 100; iteration++) {
    const residual = tryScalar(model, parameters, value)
    if (residual === undefined) break
    initial ??= Math.abs(residual)
    if (residual === 0 && hasLocalVariation(model, parameters, value))
      return { value, iterations: iteration }
    // A repeated root at exactly zero converges only linearly under Newton,
    // so a relative step test cannot terminate there. Snap only after the
    // iterates have already approached zero, and verify it in the model.
    if (
      seed !== 0 &&
      Math.abs(value) <= Math.abs(seed) * 1e-9 &&
      tryScalar(model, parameters, 0) === 0 &&
      hasLocalVariation(model, parameters, 0)
    )
      return { value: 0, iterations: iteration }
    const slope = derivative(model, parameters, value, residual)
    if (!Number.isFinite(slope) || slope === 0) break
    const correction = residual / slope
    if (!Number.isFinite(correction)) break
    const small =
      Math.abs(correction) <=
      1e-11 * Math.max(Number.MIN_VALUE, Math.abs(value))
    if (
      small &&
      (Math.abs(residual) <= Math.max(initial * 1e-10, Number.MIN_VALUE) ||
        smallLocalResidual(model, parameters, value, residual)) &&
      hasLocalVariation(model, parameters, value)
    )
      return { value, iterations: iteration }
    let accepted = false
    for (let search = 0, alpha = 1; search < 24; search++, alpha /= 2) {
      const candidate = value - alpha * correction
      if (
        !Number.isFinite(candidate) ||
        (bounds && (candidate < bounds.min || candidate > bounds.max))
      )
        continue
      const next = tryScalar(model, parameters, candidate)
      if (
        next !== undefined &&
        (Math.abs(next) < Math.abs(residual) || next === 0)
      ) {
        if (candidate === value) break
        value = candidate
        accepted = true
        break
      }
    }
    if (!accepted) break
  }
  throw new ModelError(
    '선택한 해 주변에서 유한한 실근으로 수렴하지 않았습니다. 해가 합쳐지거나 사라지는 지점일 수 있습니다.',
  )
}
function scalarResult(
  prepared: Prepared,
  parameters: Record<string, number>,
  value: number,
  options: SolverOptions,
  iterations = 0,
  slopeOverride?: number,
): SolveResult {
  const start = performance.now()
  const evaluation = prepared.model.evaluate([value], parameters)
  const slope =
    slopeOverride ??
    derivative(prepared.model, parameters, value, evaluation.residuals[0])
  const matrix = [[slope]]
  let condition = NaN
  let conditionError: string | undefined
  const conditionNorm = options.conditionNorm ?? 'infinity'
  if (conditionNorm !== 'infinity' && conditionNorm !== '2')
    throw new ModelError('조건수 계산 방법을 확인해 주세요.')
  if (options.computeCondition !== false) {
    try {
      condition = conditionNumber(matrix, conditionNorm)
    } catch {
      conditionError = '해에서의 Jacobian 조건수를 계산하지 못했습니다.'
    }
  }
  const warnings = [
    '자동 탐색에서 검증한 실근입니다. 수치 탐색은 임의의 함수에 대한 모든 해를 보장하지 않습니다.',
  ]
  if (condition === Infinity || slope === 0)
    warnings.push(
      '이 해에서는 Jacobian이 특이합니다. 중근 또는 민감한 해일 수 있으므로 잔차와 주변 거동을 함께 확인하세요.',
    )
  return {
    kind: 'nonlinear',
    variables: prepared.variables,
    values: [Object.is(value, -0) ? 0 : value],
    auxiliary: evaluation.auxiliary,
    matrix,
    rhs: evaluation.residuals.map((entry) => -entry),
    residuals: evaluation.residuals,
    maxResidual: Math.abs(evaluation.residuals[0]),
    condition,
    conditionNorm,
    ...(conditionError ? { conditionError } : {}),
    engine: 'javascript',
    iterations,
    method: '자동 실근 탐색 · 수치 검증',
    durationMs: performance.now() - start,
    warnings,
  }
}
function radicalInverse(index: number, base: number) {
  let result = 0,
    fraction = 1 / base
  while (index > 0) {
    result += (index % base) * fraction
    index = Math.floor(index / base)
    fraction /= base
  }
  return result
}
function systemSeeds(size: number, bounds: { min: number; max: number }) {
  const seeds: number[][] = []
  const add = (values: number[]) => {
    if (
      values.every((value) => value >= bounds.min && value <= bounds.max) &&
      !seeds.some((seed) => seed.every((value, i) => value === values[i]))
    )
      seeds.push(values)
  }
  const middle = bounds.min / 2 + bounds.max / 2
  const width = bounds.max / 2 - bounds.min / 2
  for (const value of [0, 1, -1, middle, bounds.min, bounds.max])
    add(Array(size).fill(value))
  if (size === 2) {
    const coordinates = [
      ...new Set(
        [bounds.min, bounds.max, middle, -10, -3, -1, 0, 1, 3, 10].filter(
          (value) => value >= bounds.min && value <= bounds.max,
        ),
      ),
    ]
    for (const x of coordinates) for (const y of coordinates) add([x, y])
  }
  const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53]
  const limit = size <= 2 ? 128 : size <= 4 ? 80 : 48
  for (let index = 1; seeds.length < limit && index <= limit * 8; index++)
    add(
      Array.from(
        { length: size },
        (_, j) => middle + width * (2 * radicalInverse(index, primes[j]) - 1),
      ),
    )
  return seeds.sort(compareFromOrigin).slice(0, limit)
}

/** Search is deterministic and bounded. It returns discovered finite real
 * solutions, never a mathematical claim that arbitrary equations are complete. */
export async function createAutomaticSolver(
  wasmBinary?: BufferSource,
): Promise<AutomaticSolver> {
  const manual = await createNonlinearSolver(wasmBinary)
  const solveNear: AutomaticSolver['solveNear'] = (
    source,
    parameters,
    seed,
    options = {},
  ) => {
    validateParameters(parameters)
    const prepared = prepare(source, Object.keys(parameters))
    const values = Array.isArray(seed) ? seed : seed.values
    if (
      values.length !== prepared.variables.length ||
      !values.every(Number.isFinite)
    )
      throw new ModelError('추적할 해의 미지수 값이 올바르지 않습니다.')
    if (prepared.variables.length === 1) {
      const roots = polynomialNearRoots(prepared, parameters)
      if (roots && roots.length > 0) {
        let closest = roots[0]
        for (const root of roots) {
          if (
            Math.abs(root.value - values[0]) <
            Math.abs(closest.value - values[0])
          )
            closest = root
        }
        if (roots.length > 1) {
          const result = scalarResult(
            prepared,
            parameters,
            closest.value,
            options,
            0,
            closest.slope,
          )
          return prepared.parameterPathValidator
            ? withParameterPathValidator(
                result,
                prepared.parameterPathValidator,
              )
            : result
        }
        // When there are multiple polynomial roots (or when the polynomial is not a single-root
        // regular family), also check whether local Newton from values[0] converges to a different
        // root or gets trapped in a vanished fold extremum (e.g. (x-1)(x-2)(x-3) = 0.4 from 1.56).
        if (roots.length > 1 || !prepared.regularPolynomialFamily) {
          const refined = scalarNear(prepared, parameters, values[0])
          const result = scalarResult(
            prepared,
            parameters,
            refined.value,
            options,
            refined.iterations,
          )
          const verified =
            roots.length === 1 && prepared.regularPolynomialFamily
              ? markUniquePolynomialRoot(result)
              : result
          return prepared.parameterPathValidator
            ? withParameterPathValidator(
                verified,
                prepared.parameterPathValidator,
              )
            : verified
        }
        // Even for a regular polynomial family with 1 real root (such as x^3 = 2-a or
        // (x-1)(x-2)(x-3) = 0.4), verify that no local extremum traps Newton between
        // values[0] and closest.value unless values[0] itself sits near a zero-slope inflection!
        try {
          const refined = scalarNear(prepared, parameters, values[0])
          if (
            Math.abs(refined.value - closest.value) <=
            1e-5 * Math.max(1, Math.abs(refined.value), Math.abs(closest.value))
          ) {
            const result = scalarResult(
              prepared,
              parameters,
              refined.value,
              options,
              refined.iterations,
              closest.slope,
            )
            const verified = markUniquePolynomialRoot(result)
            return prepared.parameterPathValidator
              ? withParameterPathValidator(
                  verified,
                  prepared.parameterPathValidator,
                )
              : verified
          }
        } catch {
          // If scalarNear failed because closest is a multiple/inflection root (slope === 0)
          // or because the polynomial is monotone between values[0] and closest.value
          // (no local extremum of opposite derivative sign in between):
          const mid1 = values[0] * 0.75 + closest.value * 0.25
          const mid2 = values[0] * 0.5 + closest.value * 0.5
          const mid3 = values[0] * 0.25 + closest.value * 0.75
          const r0 = tryScalar(prepared.model, parameters, values[0])
          const r1 = tryScalar(prepared.model, parameters, mid1)
          const r2 = tryScalar(prepared.model, parameters, mid2)
          const r3 = tryScalar(prepared.model, parameters, mid3)
          const isMonotoneTowardRoot =
            r0 !== undefined &&
            r1 !== undefined &&
            r2 !== undefined &&
            r3 !== undefined &&
            Math.abs(r1) < Math.abs(r0) &&
            Math.abs(r2) < Math.abs(r1) &&
            Math.abs(r3) < Math.abs(r2)
          if (!isMonotoneTowardRoot && closest.slope !== 0) {
            throw new ModelError(
              '선택한 해 주변에서 유한한 실근으로 수렴하지 않았습니다. 해가 합쳐지거나 사라지는 지점일 수 있습니다.',
            )
          }
        }
        const result = scalarResult(
          prepared,
          parameters,
          closest.value,
          options,
          0,
          closest.slope,
        )
        const verified =
          roots.length === 1 && prepared.regularPolynomialFamily
            ? markUniquePolynomialRoot(result)
            : result
        return prepared.parameterPathValidator
          ? withParameterPathValidator(
              verified,
              prepared.parameterPathValidator,
            )
          : verified
      }
      // Expansion can erase a small coefficient beside a large constant.
      // An empty verified candidate set is not a proof that the original
      // expression has no root; retain the original-model Newton fallback.
      const refined = scalarNear(prepared, parameters, values[0])
      const result = scalarResult(
        prepared,
        parameters,
        refined.value,
        options,
        refined.iterations,
      )
      return prepared.parameterPathValidator
        ? withParameterPathValidator(result, prepared.parameterPathValidator)
        : result
    }
    return manual(
      `${prepared.source}\n${prepared.variables.map((name, i) => `${name}(0) = ${values[i]}`).join('\n')}`,
      parameters,
      options,
    )
  }
  const search = ((
    source: string,
    parameters: Record<string, number>,
    options: AutomaticOptions = {},
  ): AutomaticSearchResult => {
    const start = performance.now()
    validateParameters(parameters)
    if (
      options.conditionNorm !== undefined &&
      options.conditionNorm !== 'infinity' &&
      options.conditionNorm !== '2'
    )
      throw new ModelError('조건수 계산 방법을 확인해 주세요.')
    const prepared = prepare(source, Object.keys(parameters))
    const reduction = fixedReduction(prepared, parameters)
    if (reduction) {
      const bounds = boundsFor(options)
      const partial = reduction.free.length
        ? search(
            reduction.source,
            { ...parameters, ...reduction.fixed },
            options,
          )
        : undefined
      const solutions = (
        partial
          ? partial.solutions.map((result) =>
              liftFixedResult(
                prepared,
                parameters,
                reduction.fixed,
                reduction.free,
                result,
                options,
              ),
            )
          : [
              liftFixedResult(
                prepared,
                parameters,
                reduction.fixed,
                [],
                undefined,
                options,
              ),
            ]
      ).filter(
        (result) =>
          partial ||
          !options.searchBounds ||
          result.values.every((v) => v >= bounds.min && v <= bounds.max),
      )
      sortSolutions(solutions)
      for (const result of solutions)
        result.durationMs = performance.now() - start
      return {
        solutions,
        search: partial
          ? {
              ...partial.search,
              method: `고정 조건 소거 · ${partial.search.method}`,
              note:
                partial.search.note +
                ' 숫자로 고정된 등식은 소거해 계산하고 해당 변수도 결과에 포함했습니다.',
            }
          : {
              method: '고정 조건 직접 대입',
              ...bounds,
              attempts: 1,
              note: '모든 미지수의 값이 등식으로 정해져 원래 식에 직접 대입했습니다.',
            },
      }
    }
    let bounds = boundsFor(options)
    const solutions: SolveResult[] = []
    let attempts = 0,
      truncated = false
    const timedOut = () => performance.now() - start > TIME_BUDGET_MS
    const inBounds = (values: number[]) =>
      values.every(
        (value) =>
          value >= bounds.min - 1e-9 * Math.max(1, Math.abs(bounds.min)) &&
          value <= bounds.max + 1e-9 * Math.max(1, Math.abs(bounds.max)),
      )
    const add = (result: SolveResult) => {
      if (!inBounds(result.values)) return
      if (unique(solutions, result)) {
        sortSolutions(solutions)
        if (solutions.length > ROOT_LIMIT) {
          solutions.pop()
          truncated = true
        }
      }
    }
    let method: string
    let note: string
    if (prepared.variables.length === 1) {
      const algebraic = algebraicCoefficients(prepared, parameters)
      const coefficients = algebraic?.coefficients
      if (coefficients) {
        method = algebraic?.rational
          ? '유리식 분자 실근 분리 · 원래 식 검증'
          : '다항식 실근 분리 · 수치 검증'
        const isolated = findPolynomialRealRoots(
          coefficients,
          options.searchBounds,
        )
        bounds = { min: isolated.min, max: isolated.max }
        if (isolated.identicallyZero)
          throw new ModelError(
            '이 방정식은 미지수와 무관하게 0=0이 됩니다. 해를 특정할 독립적인 방정식이 필요합니다.',
          )
        for (const value of new Set([
          ...isolated.roots,
          ...factorCandidates(prepared, parameters, options.searchBounds),
        ])) {
          attempts++
          let slope = 0
          for (let i = coefficients.length - 1; i > 0; i--)
            slope = slope * value + i * coefficients[i]
          const residual = tryScalar(prepared.model, parameters, value)
          if (residual !== undefined)
            slope = derivative(prepared.model, parameters, value, residual)
          // Expanded coefficient arithmetic can produce near-zero extrema
          // that are not roots of the original expression. Validate against
          // that original expression before publishing any candidate.
          if (
            residual === undefined ||
            !hasLocalVariation(prepared.model, parameters, value)
          )
            continue
          if (
            residual !== 0 &&
            (slope === 0 ||
              !smallLocalResidual(
                prepared.model,
                parameters,
                value,
                residual,
              ) ||
              Math.abs(residual / slope) >
                128 *
                  Number.EPSILON *
                  Math.max(Number.MIN_VALUE, Math.abs(value)))
          )
            continue
          add(scalarResult(prepared, parameters, value, options, 0, slope))
        }
        note =
          (algebraic?.rational
            ? '분자 다항식의 후보 근을 원래 유리식에 대입하고 분모 0인 지점을 제외했습니다. '
            : '') +
          '다항식의 계수에서 계산한 범위에서 실근을 수치적으로 분리·검증했습니다. 반올림과 중근의 영향으로 수치적 완전성을 보장하지 않습니다.'
      } else {
        method = '구간 분할 · 다중 시작점 Newton'
        note =
          '표시한 범위 안에서 여러 구간과 시작점으로 유한한 실근을 탐색했습니다. 범위 밖의 해, 가까운 중근 또는 일부 해는 누락될 수 있습니다.'
        const nodes = new Set(
          Array.from(
            { length: 2049 },
            (_, index) =>
              bounds.min * (1 - index / 2048) + bounds.max * (index / 2048),
          ),
        )
        for (let index = 0; index <= 800; index++) {
          const v = -1 + index / 400
          if (v >= bounds.min && v <= bounds.max) nodes.add(v)
        }
        // Logarithmic nodes resolve open domains and roots far below the global grid scale.
        for (let exponent = -300; exponent <= 2; exponent++)
          for (const mantissa of [1, 2, 5])
            for (const sign of [-1, 1]) {
              const v = sign * mantissa * 10 ** exponent
              if (v >= bounds.min && v <= bounds.max) nodes.add(v)
            }
        const grid = [...nodes].sort((a, b) => a - b)
        const count = grid.length - 1
        const sampled = new Map<number, number | undefined>()
        const sample = (value: number) => {
          if (sampled.has(value)) return sampled.get(value)
          const residual = tryScalar(prepared.model, parameters, value)
          sampled.set(value, residual)
          if (
            residual === 0 &&
            hasLocalVariation(prepared.model, parameters, value)
          )
            add(scalarResult(prepared, parameters, value, options))
          return residual
        }
        // Visit adjacent intervals from zero outward. A left-to-right scan
        // can consume the display/time budget on distant negative roots.
        if (bounds.min <= 0 && bounds.max >= 0) sample(0)
        const intervals = Array.from({ length: count }, (_, index) => index)
        intervals.sort((a, b) =>
          compareFromOrigin(
            [grid[a] / 2 + grid[a + 1] / 2],
            [grid[b] / 2 + grid[b + 1] / 2],
          ),
        )
        for (const index of intervals) {
          if (timedOut()) {
            truncated = true
            break
          }
          const left = grid[index]
          const right = grid[index + 1]
          const leftResidual = sample(left)
          const rightResidual = sample(right)
          if (
            leftResidual !== undefined &&
            rightResidual !== undefined &&
            leftResidual !== 0 &&
            rightResidual !== 0 &&
            Math.sign(leftResidual) !== Math.sign(rightResidual)
          ) {
            attempts++
            try {
              const sourceWithBounds = `${prepared.source}\n${prepared.variables[0]}(min) = ${left}\n${prepared.variables[0]}(max) = ${right}`
              const bracketed = manual(sourceWithBounds, parameters, {
                ...options,
                computeCondition: false,
              })
              // Refine the bracketed value to the same relative tolerance as
              // Newton candidates. A coarse near-zero bracket result must
              // not become an extra solution next to an exactly sampled 0.
              const refined = scalarNear(
                prepared,
                parameters,
                bracketed.values[0],
                bounds,
              )
              add(
                scalarResult(
                  prepared,
                  parameters,
                  refined.value,
                  options,
                  (bracketed.iterations ?? 0) + refined.iterations,
                ),
              )
            } catch (error) {
              if (!(error instanceof ModelError)) throw error
            }
          }
        }
        // Newton adds tangential roots that do not change sign on a grid.
        const seeds = Array.from(
          { length: 97 },
          (_, index) =>
            bounds.min * (1 - index / 96) + bounds.max * (index / 96),
        ).sort((a, b) => compareFromOrigin([a], [b]))
        if (bounds.min <= 0 && bounds.max >= 0 && !seeds.includes(0))
          seeds.unshift(0)
        for (const seed of seeds) {
          if (timedOut()) break
          attempts++
          try {
            const refined = scalarNear(prepared, parameters, seed, bounds)
            add(
              scalarResult(
                prepared,
                parameters,
                refined.value,
                options,
                refined.iterations,
              ),
            )
          } catch (error) {
            if (!(error instanceof ModelError)) throw error
          }
        }
        if (timedOut()) truncated = true
      }
    } else {
      method = '다중 시작점 감쇠 Newton'
      note =
        '표시한 범위의 여러 시작점에서 수렴한 실수 해를 모았습니다. 수치 탐색으로 모든 해를 보장하지 않으며 특이한 해나 작은 수렴 영역의 해는 누락될 수 있습니다.'
      for (const seed of systemSeeds(prepared.variables.length, bounds)) {
        if (timedOut()) {
          truncated = true
          break
        }
        attempts++
        try {
          add(solveNear(source, parameters, seed, options))
        } catch (error) {
          if (!(error instanceof ModelError)) throw error
        }
      }
    }
    sortSolutions(solutions)
    if (truncated) note += ' 탐색 시간 또는 표시 개수 제한에 도달했습니다.'
    note += ' 발견한 해는 원점에 가까운 순서로 최대 32개 표시합니다.'
    const durationMs = performance.now() - start
    for (const result of solutions) result.durationMs = durationMs
    return {
      solutions,
      search: {
        method,
        ...bounds,
        attempts,
        note,
        ...(truncated ? { truncated: true } : {}),
      },
    }
  }) as AutomaticSolver
  const normalizedSearch = ((source, parameters, options) =>
    normalizedModelCall(source, Object.keys(parameters), (normalized) =>
      search(normalized, parameters, options),
    )) as AutomaticSolver
  normalizedSearch.solveNear = (source, parameters, seed, options) =>
    normalizedModelCall(source, Object.keys(parameters), (normalized) =>
      solveNear(normalized, parameters, seed, options),
    )
  return normalizedSearch
}
