# 01 · 수식 파싱과 수치해석 엔진

입력 문자열을 계산 가능한 식으로 바꾸고 실수 해를 구하는 실제 코드입니다. 선형식과 비선형식의 파서는 문자열을 임의 JavaScript로 실행하지 않고, 허용한 문법과 함수로 해석합니다.

선형식은 계수 행렬로 바꾸어 부분 피벗팅 가우스 소거법으로 풉니다. 비선형식은 잔차 평가, 구간 이분법·Newton 보정, 자동 다항식 실근 분리·여러 시작점 탐색을 조합합니다. `conditioning.ts`는 ∞-norm과 직접 SVD에 의한 2-norm 조건수 및 참고 민감도 분류를 담당합니다.

`solver.wat`는 실제 WebAssembly 선형 커널의 원문이며, `build-wasm.mjs`가 이를 컴파일합니다. 브라우저에서 WASM을 사용할 수 없으면 소스에 있는 JavaScript 대체 경로로 전환합니다. 단일근 계산과 함수 평가는 JavaScript 경로도 사용합니다.

일반 비선형식에 대한 유한한 수치 탐색은 모든 실근의 발견이나 가지의 수학적 동일성을 증명하지 않습니다. 해의 존재 범위, 잔차, 조건수와 추적 실패를 함께 확인해야 합니다.

## 읽는 방법

아래 코드 블록은 표시한 원본 파일의 전체 내용을 그대로 복사한 읽기용 묶음입니다. 요약용 의사 코드나 별도의 구현이 아니며, 모듈의 import 경로는 원래 프로젝트 구조를 따릅니다. 이 Markdown을 하나의 TypeScript 파일로 바꾸어 실행하는 용도는 아닙니다. 실행은 저장소에서 `npm ci`와 `npm run dev`를 사용합니다.

원본을 수정한 뒤 `npm run docs:core`로 다시 만들고, `npm run docs:core -- --check`로 문서와 현재 소스가 같은지 확인할 수 있습니다. 각 파일의 SHA-256은 원문 일치 확인용이며 생성 시각을 넣지 않아 같은 소스에서 같은 문서를 만듭니다.

소스 묶음 SHA-256: `fa270613590e0580815c41d98b03982f8997c1578f737514ab77593d819105ff`

## 다른 코드 묶음

- [01 · 수식 파싱과 수치해석 엔진](./01-math-engine.md) · 현재 문서
- [02 · 상태 관리, 분기 추적과 비동기 계산](./02-state-and-simulation.md)
- [03 · 그래프, 마우스 조작과 화면 표현](./03-chart-and-interaction.md)

## 포함한 원본

- [src/engine/index.ts](#source-1) · [저장소 원본](../../src/engine/index.ts)
- [src/engine/nonlinear-parser.ts](#source-2) · [저장소 원본](../../src/engine/nonlinear-parser.ts)
- [src/engine/expression-derivative.ts](#source-3) · [저장소 원본](../../src/engine/expression-derivative.ts)
- [src/engine/root-comparison.ts](#source-4) · [저장소 원본](../../src/engine/root-comparison.ts)
- [src/engine/search-analysis.ts](#source-5) · [저장소 원본](../../src/engine/search-analysis.ts)
- [src/engine/derivative-free.ts](#source-6) · [저장소 원본](../../src/engine/derivative-free.ts)
- [src/engine/square-free.ts](#source-7) · [저장소 원본](../../src/engine/square-free.ts)
- [src/engine/source-statements.ts](#source-8) · [저장소 원본](../../src/engine/source-statements.ts)
- [src/engine/preprocessor.ts](#source-9) · [저장소 원본](../../src/engine/preprocessor.ts)
- [src/engine/nonlinear.ts](#source-10) · [저장소 원본](../../src/engine/nonlinear.ts)
- [src/engine/automatic-polynomial.ts](#source-11) · [저장소 원본](../../src/engine/automatic-polynomial.ts)
- [src/engine/parameter-path.ts](#source-12) · [저장소 원본](../../src/engine/parameter-path.ts)
- [src/engine/tangency.ts](#source-13) · [저장소 원본](../../src/engine/tangency.ts)
- [src/engine/automatic.ts](#source-14) · [저장소 원본](../../src/engine/automatic.ts)
- [src/engine/root-isolation.ts](#source-15) · [저장소 원본](../../src/engine/root-isolation.ts)
- [src/engine/conditioning.ts](#source-16) · [저장소 원본](../../src/engine/conditioning.ts)
- [src/engine/solver.wat](#source-17) · [저장소 원본](../../src/engine/solver.wat)
- [scripts/build-wasm.mjs](#source-18) · [저장소 원본](../../scripts/build-wasm.mjs)

<a id="source-1"></a>

## src/engine/index.ts

원본: [src/engine/index.ts](../../src/engine/index.ts) · 605줄 · SHA-256: `6af19c4f8195bc4663d985a325e8829bc4bf877f7d610e6f3ff15a33c8fe2ee4`

```typescript
import type { VariableBounds, SearchWindow } from './search-analysis'
import { normalizedModelCall } from './source-statements'
import { preprocessSolverSource } from './preprocessor'
import { conditionNumber, type ConditionNorm } from './conditioning'
export {
  classifyCondition,
  CONDITION_THRESHOLDS,
  conditionNumber,
} from './conditioning'
export type { ConditionNorm, ConditionAssessment } from './conditioning'

export type SolverOptions = {
  conditionNorm?: ConditionNorm
  computeCondition?: boolean
}

export type Parameter = {
  id: string
  name: string
  value: number
  min: number
  max: number
  step: number
}
export type ModelInput = { source: string; parameters: Record<string, number> }
export type SolveResult = {
  kind?: 'linear' | 'nonlinear' | 'evaluation'
  iterations?: number
  method?: string
  auxiliary?: Record<string, number>
  variables: string[]
  values: number[]
  matrix: number[][]
  rhs: number[]
  residuals: number[]
  maxResidual: number
  condition: number
  conditionNorm: ConditionNorm
  conditionError?: string
  engine: 'wasm' | 'javascript'
  durationMs: number
  warnings: string[]
}
export type SweepPoint = {
  parameter: number
  values: number[] | null
  error?: string
}
export type SearchSummary = {
  variableBounds?: VariableBounds
  window?: SearchWindow
  nonIsolated?: boolean
  method: string
  min: number
  max: number
  attempts: number
  note: string
  truncated?: boolean
}
export type SimulationAnchor = {
  id: string
  label: string
  variables: string[]
  values: number[]
  parameters: Record<string, number>
}
export type SimulationPanel = {
  events?: BranchTerminalEvent[]
  id: string
  label: string
  result: SolveResult | null
  error?: string
  sweep: SweepPoint[]
  dataset: SweepPoint[]
  datasetError?: string
  sweepName: string
}
export type TangencyVerification = {
  /** Whether local derivative and curvature re-verification confirmed a fold/tangency bifurcation (∂f/∂x = 0) */
  verified: boolean
  bifurcationOrder: 2 | 3 | 4 | 'boundary'
  curvatureFxxx?: number
  curvatureFxxxx?: number
  isCusp?: boolean
  /** Refined tangency parameter coordinate p* */
  parameterStar: number
  /** Refined tangency solution vector x* */
  valuesStar: number[]
  /** Terminal Jacobian derivative ∂f/∂x on this branch */
  terminalSlope: number
  /** Terminal Jacobian derivative ∂f/∂x on the partner branch (when two branches merge) */
  partnerSlope?: number
  /** Whether the two converging branches have opposite-signed derivatives ∂f/∂x -> 0 */
  oppositeSlopeSigns: boolean
  /** Estimated 2nd derivative ∂²f/∂x² (relative curvature at tangency) */
  curvatureFxx: number
  /** Estimated parameter sensitivity ∂f/∂p at tangency */
  sensitivityFp?: number
  /** Local parabolic normal-form coefficient c2 in (p - p*) ≈ c2 * (x - x*)^2 */
  parabolaCoeff?: number
  /** Residual |f(x*, p*)| at the refined tangency point (when directly evaluated) */
  residualAtStar?: number
  /** Slope |∂f/∂x(x*, p*)| at the refined tangency point */
  slopeAtStar?: number
  /** Concise Korean summary of the verified geometric property */
  geometricSummary: string
}
export type BranchTerminalEvent = {
  tangency?: TangencyVerification
  previousParameter?: number
  previousValues?: number[]
  terminalSlope?: number
  previousSlope?: number
  kind: 'disappear' | 'merge' | 'unresolved' | 'contact'
  direction: -1 | 1
  parameter: number
  values: number[]
  branchId?: string
  branchLabel?: string
  mergedWithAnchorId?: string
  mergedWithLabel?: string
  description: string
}
export type MergedSimulationSet = {
  id: string
  name: string
  anchorIds: string[]
}
export type SolvePayload = {
  selectedSimulation?: SimulationPanel
  simulations?: SimulationPanel[]
  solutions?: SolveResult[]
  selectedSolution?: number
  search?: SearchSummary
  result: SolveResult
  sweep: SweepPoint[]
  dataset: SweepPoint[]
  datasetError?: string
  sweepName: string
}
export class ModelError extends Error {
  line?: number
  constructor(message: string, line?: number) {
    super(message)
    this.name = 'ModelError'
    this.line = line
  }
}
type Node =
  | { kind: 'number'; value: number }
  | { kind: 'name'; name: string }
  | { kind: 'binary'; op: string; left: Node; right: Node }
  | { kind: 'negative'; child: Node }
type Token = { text: string; kind: 'number' | 'name' | 'operator' }
type Equation = { left: Node; right: Node; line: number }
type Compiled = { equations: Equation[]; names: string[] }
type Affine = { constant: number; coefficients: Map<string, number> }
const MAX_VARIABLES = 64
const RESERVED = new Set([
  'sin',
  'cos',
  'tan',
  'exp',
  'log',
  'ln',
  'sqrt',
  'abs',
  'if',
  'then',
  'else',
  'and',
  'or',
])
const cache = new Map<string, Compiled>()

function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  let position = 0
  while (position < source.length) {
    if (/\s/.test(source[position])) {
      position++
      continue
    }
    const rest = source.slice(position)
    const number = rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/)
    if (number) {
      if (!Number.isFinite(Number(number[0])))
        throw new ModelError('숫자가 너무 큽니다. 유한한 값을 입력해 주세요.')
      tokens.push({ text: number[0], kind: 'number' })
      position += number[0].length
      continue
    }
    const name = rest.match(/^[A-Za-z][A-Za-z0-9_]*/)
    if (name) {
      if (RESERVED.has(name[0].toLowerCase()))
        throw new ModelError(
          `'${name[0]}'은 예약어입니다. 선형식에는 함수 대신 다른 변수 이름을 사용해 주세요.`,
        )
      tokens.push({ text: name[0], kind: 'name' })
      position += name[0].length
      continue
    }
    if ('+-*/^()'.includes(source[position])) {
      tokens.push({ text: source[position++], kind: 'operator' })
      continue
    }
    throw new ModelError(
      `'${source[position]}' 문자를 이해할 수 없습니다. 영문 변수 이름과 수학 연산자를 사용해 주세요.`,
    )
  }
  if (tokens.length > 2000)
    throw new ModelError(
      '한 수식이 너무 깁니다. 여러 개의 짧은 수식으로 나눠 주세요.',
    )
  return tokens
}
function parseExpression(source: string, names: Set<string>): Node {
  const tokens = tokenize(source)
  let index = 0,
    depth = 0
  const at = (text: string) => tokens[index]?.text === text
  function expression(): Node {
    let node = product()
    while (at('+') || at('-')) {
      const op = tokens[index++].text
      node = { kind: 'binary', op, left: node, right: product() }
    }
    return node
  }
  function product(): Node {
    let node = unary()
    for (;;) {
      if (at('*') || at('/')) {
        const op = tokens[index++].text
        node = { kind: 'binary', op, left: node, right: unary() }
        continue
      }
      const previous = tokens[index - 1]
      const next = tokens[index]
      // Match nonlinear coefficient notation without treating a named call
      // such as x(y + 1) as multiplication or allowing adjacent bare names.
      const implicit =
        (previous?.kind === 'number' || previous?.text === ')') &&
        (next?.kind === 'name' || next?.text === '(')
      if (!implicit) break
      node = { kind: 'binary', op: '*', left: node, right: unary() }
    }
    return node
  }
  function unary(): Node {
    if (++depth > 80)
      throw new ModelError(
        '수식의 중첩이 너무 깊습니다. 괄호와 부호를 줄여 주세요.',
      )
    let node: Node
    if (at('+')) {
      index++
      node = unary()
    } else if (at('-')) {
      index++
      node = { kind: 'negative', child: unary() }
    } else {
      const token = tokens[index++]
      if (!token)
        throw new ModelError(
          '수식이 완성되지 않았습니다. 연산자 뒤에 숫자나 변수를 입력해 주세요.',
        )
      if (token.kind === 'number')
        node = { kind: 'number', value: Number(token.text) }
      else if (token.kind === 'name') {
        names.add(token.text)
        node = { kind: 'name', name: token.text }
      } else if (token.text === '(') {
        node = expression()
        if (!at(')')) throw new ModelError('닫는 괄호 )가 필요합니다.')
        index++
      } else
        throw new ModelError(`'${token.text}' 앞뒤의 수식을 확인해 주세요.`)
      if (at('^')) {
        index++
        node = { kind: 'binary', op: '^', left: node, right: unary() }
      }
    }
    depth--
    return node
  }
  const result = expression()
  if (index !== tokens.length)
    throw new ModelError(
      `'${tokens[index].text}' 앞에 연산자가 필요합니다. 곱셈은 * 또는 2x처럼 입력해 주세요.`,
    )
  return result
}
export function compileModel(source: string): Compiled {
  const existing = cache.get(source)
  if (existing) return existing
  if (source.length > 30000)
    throw new ModelError('모델이 너무 큽니다. 30,000자 이내로 입력해 주세요.')
  const names = new Set<string>(),
    equations: Equation[] = []
  source.split(/\r?\n/).forEach((raw, i) => {
    const text = raw.split('#')[0].trim()
    if (!text) return
    const sides = text.split('=')
    if (sides.length !== 2 || !sides[0].trim() || !sides[1].trim())
      throw new ModelError(
        '한 줄에 완성된 등식 하나를 입력해 주세요. 예: 2x + y = 10',
        i + 1,
      )
    try {
      equations.push({
        left: parseExpression(sides[0], names),
        right: parseExpression(sides[1], names),
        line: i + 1,
      })
    } catch (error) {
      if (error instanceof ModelError) error.line = i + 1
      throw error
    }
  })
  if (!equations.length)
    throw new ModelError('먼저 수식을 입력해 주세요. 예: 2x + y = 10')
  if (equations.length > MAX_VARIABLES)
    throw new ModelError(
      `프로토타입은 최대 ${MAX_VARIABLES}개의 수식을 지원합니다.`,
    )
  const result = { equations, names: [...names] }
  if (cache.size >= 16) cache.delete(cache.keys().next().value!)
  cache.set(source, result)
  return result
}
function scale(a: Affine, multiplier: number): Affine {
  return {
    constant: a.constant * multiplier,
    coefficients: new Map(
      [...a.coefficients].map(([name, value]) => [name, value * multiplier]),
    ),
  }
}
function add(a: Affine, b: Affine, sign = 1): Affine {
  const coefficients = new Map(a.coefficients)
  for (const [name, value] of b.coefficients)
    coefficients.set(name, (coefficients.get(name) ?? 0) + value * sign)
  return { constant: a.constant + b.constant * sign, coefficients }
}
const hasUnknown = (a: Affine) =>
  [...a.coefficients.values()].some((value) => value !== 0)
function evaluate(node: Node, parameters: Record<string, number>): Affine {
  if (node.kind === 'number')
    return { constant: node.value, coefficients: new Map() }
  if (node.kind === 'name')
    return Object.hasOwn(parameters, node.name)
      ? { constant: parameters[node.name], coefficients: new Map() }
      : { constant: 0, coefficients: new Map([[node.name, 1]]) }
  if (node.kind === 'negative')
    return scale(evaluate(node.child, parameters), -1)
  const a = evaluate(node.left, parameters),
    b = evaluate(node.right, parameters)
  if (node.op === '+') return add(a, b)
  if (node.op === '-') return add(a, b, -1)
  if (node.op === '*') {
    if (hasUnknown(a) && hasUnknown(b))
      throw new ModelError(
        '미지수끼리의 곱은 선형식이 아닙니다. 계수는 파라미터로 등록하고, 미지수는 1차로 입력해 주세요.',
      )
    return hasUnknown(a) ? scale(a, b.constant) : scale(b, a.constant)
  }
  if (node.op === '/') {
    if (hasUnknown(b))
      throw new ModelError(
        '미지수로 나눌 수 없습니다. 선형식의 분모는 숫자 또는 파라미터여야 합니다.',
      )
    if (b.constant === 0)
      throw new ModelError(
        '0으로 나눌 수 없습니다. 분모에 사용한 파라미터를 확인해 주세요.',
      )
    return scale(a, 1 / b.constant)
  }
  if (hasUnknown(b))
    throw new ModelError('지수에는 미지수를 사용할 수 없습니다.')
  if (hasUnknown(a)) {
    if (b.constant === 1) return a
    if (b.constant === 0) return { constant: 1, coefficients: new Map() }
    throw new ModelError(
      '미지수의 거듭제곱은 선형식이 아닙니다. 미지수는 1차로 입력해 주세요.',
    )
  }
  return { constant: a.constant ** b.constant, coefficients: new Map() }
}
function assemble(source: string, parameters: Record<string, number>) {
  for (const [name, value] of Object.entries(parameters)) {
    if (
      !/^[A-Za-z][A-Za-z0-9_]*$/.test(name) ||
      RESERVED.has(name.toLowerCase())
    )
      throw new ModelError(`파라미터 이름 '${name}'을 확인해 주세요.`)
    if (!Number.isFinite(value))
      throw new ModelError(`파라미터 '${name}'에 유한한 숫자를 입력해 주세요.`)
  }
  const compiled = compileModel(source)
  const variables = compiled.names.filter(
    (name) => !Object.hasOwn(parameters, name),
  )
  if (!variables.length)
    throw new ModelError(
      '구할 미지수가 없습니다. 파라미터에 등록하지 않은 변수 이름을 수식에 넣어 주세요.',
    )
  if (variables.length !== compiled.equations.length)
    throw new ModelError(
      `수식 ${compiled.equations.length}개와 미지수 ${variables.length}개가 일치해야 합니다. 알려진 값은 파라미터에 등록해 주세요.`,
    )
  const matrix: number[][] = [],
    rhs: number[] = []
  for (const equation of compiled.equations) {
    try {
      const row = add(
        evaluate(equation.left, parameters),
        evaluate(equation.right, parameters),
        -1,
      )
      const coefficients = variables.map(
        (name) => row.coefficients.get(name) ?? 0,
      )
      if (![...coefficients, row.constant].every(Number.isFinite))
        throw new ModelError(
          '계산 중 유한하지 않은 값이 발생했습니다. 계수와 파라미터 범위를 확인해 주세요.',
        )
      matrix.push(coefficients)
      rhs.push(-row.constant)
    } catch (error) {
      if (error instanceof ModelError) error.line = equation.line
      throw error
    }
  }
  return { variables, matrix, rhs }
}
const EPSILON = 1e-12
/** Row equilibration protects systems whose equations use very different units. */
function normalize(matrix: number[][], rhs: number[]) {
  return matrix.map((row, i) => {
    const magnitude = Math.max(...row.map(Math.abs)) || 1
    return [...row.map((value) => value / magnitude), rhs[i] / magnitude]
  })
}
function singularError(augmented: number[][]): never {
  const n = augmented.length,
    rows = augmented.map((row) => [...row])
  let rank = 0
  for (let col = 0; col < n && rank < n; col++) {
    let pivot = rank
    for (let row = rank + 1; row < n; row++)
      if (Math.abs(rows[row][col]) > Math.abs(rows[pivot][col])) pivot = row
    if (Math.abs(rows[pivot][col]) < EPSILON) continue
    ;[rows[rank], rows[pivot]] = [rows[pivot], rows[rank]]
    for (let row = rank + 1; row < n; row++) {
      const factor = rows[row][col] / rows[rank][col]
      for (let c = col; c <= n; c++) rows[row][c] -= factor * rows[rank][c]
    }
    rank++
  }
  const inconsistent = rows.some(
    (row) =>
      row.slice(0, n).every((value) => Math.abs(value) < EPSILON) &&
      Math.abs(row[n]) >= EPSILON,
  )
  throw new ModelError(
    inconsistent
      ? '서로 모순되는 수식으로 해가 없습니다. 우변과 파라미터를 확인해 주세요.'
      : '독립적인 수식이 부족하거나 행렬이 수치적으로 특이합니다. 중복 수식과 계수를 확인해 주세요.',
  )
}
function solveJavascript(augmented: number[][]): number[] {
  const a = augmented.map((row) => [...row]),
    n = a.length
  for (let k = 0; k < n; k++) {
    let pivot = k
    for (let row = k + 1; row < n; row++)
      if (Math.abs(a[row][k]) > Math.abs(a[pivot][k])) pivot = row
    if (Math.abs(a[pivot][k]) < EPSILON) singularError(augmented)
    ;[a[k], a[pivot]] = [a[pivot], a[k]]
    for (let row = k + 1; row < n; row++) {
      const factor = a[row][k] / a[k][k]
      for (let col = k + 1; col <= n; col++) a[row][col] -= factor * a[k][col]
      a[row][k] = 0
    }
  }
  const values = Array<number>(n).fill(0)
  for (let row = n - 1; row >= 0; row--) {
    let value = a[row][n]
    for (let col = row + 1; col < n; col++) value -= a[row][col] * values[col]
    values[row] = value / a[row][row]
  }
  return values
}
type WasmExports = { memory: WebAssembly.Memory; solve: (n: number) => number }
export async function createSolver(
  wasmBinary?: BufferSource,
): Promise<
  (
    source: string,
    parameters: Record<string, number>,
    options?: SolverOptions,
  ) => SolveResult
> {
  let wasm: WasmExports | null = null
  try {
    const bytes =
      wasmBinary ??
      (await (
        await fetch(`${import.meta.env?.BASE_URL ?? '/'}solver.wasm`)
      ).arrayBuffer())
    const instance = await WebAssembly.instantiate(bytes, {})
    wasm = instance.instance.exports as unknown as WasmExports
  } catch {
    /* Offline browser constraints can use the same pivoted algorithm in JavaScript. */
  }
  const solve = (
    source: string,
    parameters: Record<string, number>,
    options: SolverOptions = {},
  ): SolveResult => {
    source = preprocessSolverSource(source, Object.keys(parameters), 'linear')
    const start = performance.now()
    const conditionNorm = options.conditionNorm ?? 'infinity'
    if (conditionNorm !== 'infinity' && conditionNorm !== '2')
      throw new ModelError('조건수 계산 방법을 확인해 주세요.')
    const { variables, matrix, rhs } = assemble(source, parameters)
    const augmented = normalize(matrix, rhs)
    let values: number[]
    if (wasm) {
      const memory = new Float64Array(wasm.memory.buffer)
      memory.set(augmented.flat(), 0)
      if (wasm.solve(variables.length) !== 0) singularError(augmented)
      values = Array.from(
        new Float64Array(wasm.memory.buffer, 65536, variables.length),
      )
    } else values = solveJavascript(augmented)
    if (!values.every(Number.isFinite))
      throw new ModelError(
        '수치 범위를 벗어났습니다. 계수의 크기와 단위를 조정해 주세요.',
      )
    // Accumulate in scaled coordinates so finite solutions such as 1e308*2
    // do not produce Infinity - Infinity and a misleading NaN diagnostic.
    const valueMagnitude = Math.max(1, ...values.map(Math.abs))
    const residuals = matrix.map((row, i) => {
      const magnitude = Math.max(...row.map(Math.abs)) || 1
      let sum = -(rhs[i] / magnitude / valueMagnitude),
        compensation = 0
      for (let col = 0; col < row.length; col++) {
        const term =
          (row[col] / magnitude) * (values[col] / valueMagnitude) - compensation
        const next = sum + term
        compensation = next - sum - term
        sum = next
      }
      return sum * magnitude * valueMagnitude
    })
    const maxResidual = Math.max(...residuals.map(Math.abs))
    // Sweeps need solution values only; avoid thousands of unused SVD/inverse
    // diagnostics. Their NaN condition is internal and never shown as a result.
    let condition = NaN
    let conditionError: string | undefined
    if (options.computeCondition !== false) {
      try {
        condition = conditionNumber(matrix, conditionNorm)
      } catch {
        conditionError =
          '선택한 방법으로 조건수를 계산하지 못했습니다. 해와 잔차를 별도로 확인하거나 다른 norm을 선택해 주세요.'
      }
    }
    const warnings: string[] = []
    if (conditionError) warnings.push(conditionError)
    if (!wasm)
      warnings.push(
        'WebAssembly를 사용할 수 없어 JavaScript 솔버로 계산했습니다.',
      )
    if (condition >= 1e8)
      warnings.push(
        '조건수가 큽니다. 입력값의 작은 변화가 해에 큰 영향을 줄 수 있습니다.',
      )
    const scale = Math.max(1, ...rhs.map(Math.abs))
    if (maxResidual > 1e-8 * scale)
      warnings.push(
        '수치 잔차가 큽니다. 결과의 정밀도와 입력 단위를 확인해 주세요.',
      )
    return {
      variables,
      values,
      matrix,
      rhs,
      residuals,
      maxResidual,
      condition,
      conditionNorm,
      ...(conditionError ? { conditionError } : {}),
      engine: wasm ? 'wasm' : 'javascript',
      durationMs: performance.now() - start,
      warnings,
    }
  }
  return (source, parameters, options) =>
    normalizedModelCall(source, Object.keys(parameters), (normalized) =>
      solve(normalized, parameters, options),
    )
}
```

<a id="source-2"></a>

## src/engine/nonlinear-parser.ts

원본: [src/engine/nonlinear-parser.ts](../../src/engine/nonlinear-parser.ts) · 604줄 · SHA-256: `3d57f324ce2a4536f8ee72c9c0cc8fb1aa796f667612801584b923c3294503d6`

```typescript
import { evaluateDual, type Dual } from './expression-derivative'
import { ModelError } from './index'

export type NonlinearNode =
  | { kind: 'number'; value: number }
  | { kind: 'name'; name: string }
  | { kind: 'unary'; sign: '+' | '-'; child: NonlinearNode }
  | {
      kind: 'binary'
      operator: string
      left: NonlinearNode
      right: NonlinearNode
    }
  | { kind: 'call'; name: string; args: NonlinearNode[] }
type Node = NonlinearNode
export type NonlinearExpression = {
  node: Node
  line: number
  references: Set<string>
}
type Expression = NonlinearExpression
type Definition = Expression & { name: string }
type Condition = {
  name: string
  type: 'min' | 'max' | '0'
  value: number
  line: number
}
type Token = { text: string; type: 'number' | 'name' | 'operator' }

export type NonlinearEvaluation = {
  residuals: number[]
  auxiliary: Record<string, number>
  evaluationNames: string[]
  evaluationValues: number[]
}

export type CompiledModel = {
  variables: string[]
  rootLines?: number[]
  kind: 'nonlinear' | 'evaluation'
  bounds?: { min: number; max: number }
  guesses?: number[]
  jacobian?: (
    values: number[],
    parameters: Record<string, number>,
  ) => number[][] | undefined
  evaluate(
    values: number[],
    parameters: Record<string, number>,
  ): NonlinearEvaluation
}

// Functions operate on real values. ln is natural logarithm; log/log10 are base 10.
const FUNCTIONS: Record<
  string,
  { arity: number; compute: (...args: number[]) => number }
> = {
  floor: { arity: 1, compute: Math.floor },
  ceil: { arity: 1, compute: Math.ceil },
  sign: { arity: 1, compute: Math.sign },
  sin: { arity: 1, compute: Math.sin },
  cos: { arity: 1, compute: Math.cos },
  tan: { arity: 1, compute: Math.tan },
  asin: { arity: 1, compute: Math.asin },
  acos: { arity: 1, compute: Math.acos },
  atan: { arity: 1, compute: Math.atan },
  sinh: { arity: 1, compute: Math.sinh },
  cosh: { arity: 1, compute: Math.cosh },
  tanh: { arity: 1, compute: Math.tanh },
  exp: { arity: 1, compute: Math.exp },
  ln: { arity: 1, compute: Math.log },
  log: { arity: 1, compute: Math.log10 },
  log10: { arity: 1, compute: Math.log10 },
  sqrt: { arity: 1, compute: Math.sqrt },
  abs: { arity: 1, compute: Math.abs },
  pow: { arity: 2, compute: Math.pow },
  min: { arity: 2, compute: Math.min },
  max: { arity: 2, compute: Math.max },
}
export function isNonlinearFunction(name: string): boolean {
  return Object.hasOwn(FUNCTIONS, name.toLowerCase())
}
const BUILTINS = new Map([
  ['pi', Math.PI],
  ['e', Math.E],
])
const RESERVED = new Set([
  ...Object.keys(FUNCTIONS),
  ...BUILTINS.keys(),
  'if',
  'then',
  'else',
  'and',
  'or',
])
const NAME = /^[A-Za-z][A-Za-z0-9_]*$/
const NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/
const cache = new Map<string, CompiledModel>()

function assertName(name: string, line?: number) {
  if (!NAME.test(name) || RESERVED.has(name)) {
    throw new ModelError(
      `변수 이름 '${name}'을 사용할 수 없습니다. 영문자로 시작하는 이름을 사용하고 함수 이름은 피하세요.`,
      line,
    )
  }
}

export function parseNonlinearExpression(source: string, line = 1): Expression {
  const tokens: Token[] = []
  for (let position = 0; position < source.length; ) {
    const rest = source.slice(position)
    const space = /^\s+/.exec(rest)
    if (space) {
      position += space[0].length
      continue
    }
    const number = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(rest)
    const name = /^[A-Za-z][A-Za-z0-9_]*/.exec(rest)
    if (number) {
      if (!Number.isFinite(Number(number[0])))
        throw new ModelError('유한한 숫자를 입력하세요.', line)
      tokens.push({ text: number[0], type: 'number' })
      position += number[0].length
    } else if (name) {
      tokens.push({ text: name[0], type: 'name' })
      position += name[0].length
    } else if ('+-*/^(),'.includes(rest[0])) {
      tokens.push({ text: rest[0], type: 'operator' })
      position += 1
    } else
      throw new ModelError(
        `수식에 사용할 수 없는 문자 '${rest[0]}'입니다.`,
        line,
      )
    if (tokens.length > 2048)
      throw new ModelError(
        '한 수식은 2,048개 이하의 토큰으로 작성하세요.',
        line,
      )
  }
  if (!tokens.length)
    throw new ModelError('등호 오른쪽에 수식을 입력하세요.', line)
  let position = 0
  let depth = 0
  const references = new Set<string>()
  const peek = () => tokens[position]?.text
  const nested = <T>(run: () => T): T => {
    depth += 1
    if (depth > 96)
      throw new ModelError(
        '수식의 괄호 또는 지수가 너무 깊게 중첩되었습니다.',
        line,
      )
    try {
      return run()
    } finally {
      depth -= 1
    }
  }
  const atom = (): Node =>
    nested(() => {
      const token = tokens[position++]
      if (!token) throw new ModelError('수식이 완성되지 않았습니다.', line)
      if (token.type === 'number')
        return { kind: 'number', value: Number(token.text) }
      if (token.text === '(') {
        const node = additive()
        if (peek() !== ')')
          throw new ModelError('닫는 괄호 )가 필요합니다.', line)
        position += 1
        return node
      }
      if (token.type === 'name') {
        if (peek() === '(') {
          // Normalize calls only. Ordinary symbols remain case-sensitive.
          const functionName = token.text.toLowerCase()
          const fn = Object.hasOwn(FUNCTIONS, functionName)
            ? FUNCTIONS[functionName]
            : undefined
          if (!fn)
            throw new ModelError(
              `지원하지 않는 함수 '${token.text}'입니다. 곱셈은 *로 표시하세요.`,
              line,
            )
          position += 1
          const args = [additive()]
          while (peek() === ',') {
            position += 1
            args.push(additive())
          }
          if (peek() !== ')')
            throw new ModelError(
              `함수 ${token.text}의 닫는 괄호 )가 필요합니다.`,
              line,
            )
          position += 1
          if (args.length !== fn.arity)
            throw new ModelError(
              `${token.text} 함수에는 ${fn.arity}개의 인수가 필요합니다.`,
              line,
            )
          return { kind: 'call', name: functionName, args }
        }
        references.add(token.text)
        return { kind: 'name', name: token.text }
      }
      throw new ModelError(
        `'${token.text}' 앞에 값이나 변수가 필요합니다.`,
        line,
      )
    })
  // A power's right operand may itself be signed or a power. A leading minus
  // is outside that power, so -x^2 and 2^-2 have their usual mathematical meaning.
  const power = (): Node =>
    nested(() => {
      const left = atom()
      if (peek() !== '^') return left
      position += 1
      return { kind: 'binary', operator: '^', left, right: unary() }
    })
  const unary = (): Node =>
    nested(() => {
      const sign = peek()
      if (sign !== '+' && sign !== '-') return power()
      position += 1
      return { kind: 'unary', sign, child: unary() }
    })
  const product = (): Node => {
    let node = unary()
    for (;;) {
      const operator = peek()
      if (operator === '*' || operator === '/') {
        position += 1
        node = { kind: 'binary', operator, left: node, right: unary() }
        continue
      }
      const previous = tokens[position - 1]
      // Support 2x, 2(x + 1), and (x + 1)(x - 1). Named calls remain unambiguous.
      const implied =
        (previous?.type === 'number' || previous?.text === ')') &&
        (tokens[position]?.type === 'name' || operator === '(')
      if (!implied) return node
      node = { kind: 'binary', operator: '*', left: node, right: unary() }
    }
  }
  const additive = (): Node => {
    let node = product()
    while (peek() === '+' || peek() === '-') {
      const operator = tokens[position++].text
      node = { kind: 'binary', operator, left: node, right: product() }
    }
    return node
  }
  const node = additive()
  if (position !== tokens.length)
    throw new ModelError(`'${peek()}' 앞에 연산자가 필요합니다.`, line)
  return { node, line, references }
}

const parseExpression = parseNonlinearExpression

export function evaluateNonlinearExpression(
  expression: Expression,
  environment: Map<string, number>,
): number {
  function evaluate(node: Node): number {
    let value: number
    switch (node.kind) {
      case 'number':
        return node.value
      case 'name': {
        const entry = environment.get(node.name)
        if (entry === undefined)
          throw new ModelError(
            `정의되지 않은 변수 '${node.name}'입니다.`,
            expression.line,
          )
        return entry
      }
      case 'unary':
        value = (node.sign === '-' ? -1 : 1) * evaluate(node.child)
        break
      case 'call':
        value = FUNCTIONS[node.name].compute(...node.args.map(evaluate))
        break
      case 'binary': {
        const left = evaluate(node.left),
          right = evaluate(node.right)
        if (node.operator === '+') value = left + right
        else if (node.operator === '-') value = left - right
        else if (node.operator === '*') value = left * right
        else if (node.operator === '/') value = left / right
        else value = left ** right
        break
      }
    }
    if (!Number.isFinite(value))
      throw new ModelError(
        '수식의 계산값이 실수 범위를 벗어났습니다. 0으로 나누기, 로그·제곱근의 정의역과 오버플로를 확인하세요.',
        expression.line,
      )
    return value
  }
  return evaluate(expression.node)
}

const evaluateExpression = evaluateNonlinearExpression

/** Parse once and evaluate repeatedly with new root values or external parameters. */
export function compileNonlinear(
  source: string,
  parameterNames: string[],
): CompiledModel {
  if (source.length > 30_000)
    throw new ModelError('수식은 30,000자 이내로 입력하세요.')
  const parameters = [...parameterNames].sort()
  for (const name of parameters) assertName(name)
  if (new Set(parameters).size !== parameters.length)
    throw new ModelError('파라미터 이름은 서로 달라야 합니다.')
  const key = JSON.stringify([source, parameters])
  const cached = cache.get(key)
  if (cached) return cached
  const roots: Definition[] = [],
    assignments: Definition[] = [],
    anonymous: Expression[] = [],
    conditions: Condition[] = []
  const declared = new Map<string, number>()
  const declare = (name: string, line: number) => {
    assertName(name, line)
    if (declared.has(name))
      throw new ModelError(
        `변수 '${name}'이 중복 정의되었습니다. 근 변수와 명시적 변수는 다른 이름을 사용하세요.`,
        line,
      )
    if (parameters.includes(name))
      throw new ModelError(
        `파라미터 '${name}'은 이미 파라미터 패널에 정의되어 있습니다.`,
        line,
      )
    declared.set(name, line)
  }
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  for (let index = 0; index < lines.length; index += 1) {
    const line = index + 1
    if (/^\s*#@/.test(lines[index]))
      throw new ModelError(
        '해법 지정 지시문과 제약 초기값은 아직 지원하지 않습니다. 일반 초기값을 사용하세요.',
        line,
      )
    const text = lines[index].split('#', 1)[0].trim()
    if (!text) continue
    if (
      text.includes('>=') ||
      text.includes('<=') ||
      text.includes('>') ||
      text.includes('<')
    )
      throw new ModelError(
        '제약 초기값과 부등식은 아직 지원하지 않습니다.',
        line,
      )
    const equals = text.split('=')
    if (equals.length > 2)
      throw new ModelError(
        '한 줄에는 등호를 하나만 사용하세요. f(x) 오른쪽에는 0이 될 잔차식만 작성합니다.',
        line,
      )
    if (equals.length === 1) {
      anonymous.push(parseExpression(text, line))
      continue
    }
    const left = equals[0].trim(),
      right = equals[1].trim()
    const rawCondition = /^([A-Za-z][A-Za-z0-9_]*)\(\s*(min|max|0)\s*\)$/.exec(
      left,
    )
    // f itself is a valid engineering variable (for example a friction
    // factor). Its f(min)/f(max)/f(0) metadata must precede f(x) residuals.
    const condition =
      rawCondition && !RESERVED.has(rawCondition[1]) ? rawCondition : null
    const root = condition
      ? null
      : /^f\(\s*([A-Za-z][A-Za-z0-9_]*)\s*\)$/.exec(left)
    if (root) {
      declare(root[1], line)
      roots.push({ name: root[1], ...parseExpression(right, line) })
      if (roots.length > 16)
        throw new ModelError(
          '비선형 근 변수는 최대 16개까지 사용할 수 있습니다.',
          line,
        )
    } else if (condition) {
      if (!NUMBER.test(right) || !Number.isFinite(Number(right)))
        throw new ModelError(
          '경계와 초기값에는 수식 대신 유한한 숫자를 직접 입력하세요.',
          line,
        )
      conditions.push({
        name: condition[1],
        type: condition[2] as Condition['type'],
        value: Number(right),
        line,
      })
    } else if (NAME.test(left)) {
      declare(left, line)
      assignments.push({ name: left, ...parseExpression(right, line) })
    } else
      throw new ModelError(
        'f(x)=잔차식, 이름=수식, x(min)/x(max) 또는 x(0) 형식으로 작성하세요.',
        line,
      )
  }
  if (!roots.length && !assignments.length && !anonymous.length)
    throw new ModelError('계산할 수식을 입력하세요.')
  if (roots.length && anonymous.length)
    throw new ModelError(
      '근을 구하는 모델에서는 익명 수식을 사용할 수 없습니다. 이름=수식으로 정의하세요.',
      anonymous[0].line,
    )
  const available = new Set([
    ...declared.keys(),
    ...parameters,
    ...BUILTINS.keys(),
  ])
  for (const expression of [...roots, ...assignments, ...anonymous]) {
    for (const reference of expression.references)
      if (!available.has(reference))
        throw new ModelError(
          `정의되지 않은 변수 '${reference}'입니다.`,
          expression.line,
        )
  }
  const byName = new Map(
    assignments.map((assignment) => [assignment.name, assignment]),
  )
  const remaining = new Map<string, number>()
  const dependents = new Map<string, Definition[]>()
  for (const assignment of assignments) {
    const dependencies = [...assignment.references].filter((name) =>
      byName.has(name),
    )
    remaining.set(assignment.name, dependencies.length)
    for (const dependency of dependencies) {
      const list = dependents.get(dependency) ?? []
      list.push(assignment)
      dependents.set(dependency, list)
    }
  }
  // Iterative topological ordering also handles long helper chains without
  // consuming the JavaScript call stack during compilation.
  const sorted = assignments.filter(
    (assignment) => remaining.get(assignment.name) === 0,
  )
  for (let index = 0; index < sorted.length; index += 1) {
    for (const dependent of dependents.get(sorted[index].name) ?? []) {
      const count = remaining.get(dependent.name)! - 1
      remaining.set(dependent.name, count)
      if (count === 0) sorted.push(dependent)
    }
  }
  if (sorted.length !== assignments.length) {
    const cyclic = assignments.find(
      (assignment) => remaining.get(assignment.name)! > 0,
    )!
    throw new ModelError(
      `명시적 변수 '${cyclic.name}'에 순환 참조가 있습니다.`,
      cyclic.line,
    )
  }
  const variables = roots.map((root) => root.name)
  let bounds: CompiledModel['bounds'], guesses: CompiledModel['guesses']
  const conditionKeys = new Set<string>()
  for (const condition of conditions) {
    if (!variables.includes(condition.name))
      throw new ModelError(
        `조건의 변수 '${condition.name}'에 대응하는 f(${condition.name})가 없습니다.`,
        condition.line,
      )
    const conditionKey = `${condition.name}:${condition.type}`
    if (conditionKeys.has(conditionKey))
      throw new ModelError(
        `'${condition.name}(${condition.type})' 조건이 중복되었습니다.`,
        condition.line,
      )
    conditionKeys.add(conditionKey)
    if ((roots.length === 1) !== (condition.type !== '0'))
      throw new ModelError(
        roots.length === 1
          ? '하나의 근에는 초기값 대신 (min), (max) 경계가 필요합니다.'
          : '연립 비선형식에는 경계 대신 각 변수의 (0) 초기값이 필요합니다.',
        condition.line,
      )
  }
  if (roots.length === 1) {
    const min = conditions.find((condition) => condition.type === 'min')
    const max = conditions.find((condition) => condition.type === 'max')
    if (!min || !max)
      throw new ModelError(
        `${variables[0]}(min)과 ${variables[0]}(max) 경계를 모두 입력하세요.`,
        roots[0].line,
      )
    if (min.value >= max.value)
      throw new ModelError('최소 경계는 최대 경계보다 작아야 합니다.', max.line)
    bounds = { min: min.value, max: max.value }
  } else if (roots.length > 1) {
    guesses = roots.map((root) => {
      const guess = conditions.find(
        (condition) => condition.name === root.name && condition.type === '0',
      )
      if (!guess)
        throw new ModelError(`${root.name}(0) 초기값을 입력하세요.`, root.line)
      return guess.value
    })
  }
  let anonymousIndex = 1
  const anonymousNames = anonymous.map(() => {
    while (available.has(`result_${anonymousIndex}`)) anonymousIndex += 1
    return `result_${anonymousIndex++}`
  })
  const compiled: CompiledModel = {
    variables,
    rootLines: roots.map((root) => root.line),
    kind: roots.length ? 'nonlinear' : 'evaluation',
    bounds,
    guesses,
    jacobian(values, parameterValues) {
      const matrix = Array.from({ length: roots.length }, () =>
        Array<number>(variables.length).fill(0),
      )
      for (let col = 0; col < variables.length; col++) {
        const environment = new Map<string, Dual>([
          ['pi', { value: Math.PI, derivative: 0 }],
          ['e', { value: Math.E, derivative: 0 }],
        ])
        for (const name of parameters)
          environment.set(name, { value: parameterValues[name], derivative: 0 })
        variables.forEach((name, i) =>
          environment.set(name, {
            value: values[i],
            derivative: i === col ? 1 : 0,
          }),
        )
        for (const assignment of sorted) {
          const dual = evaluateDual(assignment.node, environment)
          if (!dual) return undefined
          environment.set(assignment.name, dual)
        }
        for (let row = 0; row < roots.length; row++) {
          const dual = evaluateDual(roots[row].node, environment)
          if (!dual) return undefined
          matrix[row][col] = dual.derivative
        }
      }
      return matrix
    },
    evaluate(values, parameterValues) {
      if (values.length !== roots.length || !values.every(Number.isFinite))
        throw new ModelError(
          '근 변수의 값이 유한하지 않거나 변수 개수와 맞지 않습니다.',
        )
      const environment = new Map(BUILTINS)
      for (const name of parameters) {
        const value = Object.hasOwn(parameterValues, name)
          ? parameterValues[name]
          : undefined
        if (typeof value !== 'number' || !Number.isFinite(value))
          throw new ModelError(`파라미터 '${name}'에 유한한 숫자가 필요합니다.`)
        environment.set(name, value)
      }
      variables.forEach((name, index) => environment.set(name, values[index]))
      for (const assignment of sorted)
        environment.set(
          assignment.name,
          evaluateExpression(assignment, environment),
        )
      const auxiliary: Record<string, number> = Object.create(null)
      for (const assignment of assignments)
        auxiliary[assignment.name] = environment.get(assignment.name)!
      return {
        residuals: roots.map((root) => evaluateExpression(root, environment)),
        auxiliary,
        evaluationNames: roots.length
          ? []
          : [
              ...assignments.map((assignment) => assignment.name),
              ...anonymousNames,
            ],
        evaluationValues: roots.length
          ? []
          : [
              ...assignments.map((assignment) => auxiliary[assignment.name]),
              ...anonymous.map((expression) =>
                evaluateExpression(expression, environment),
              ),
            ],
      }
    },
  }
  if (cache.size >= 16) cache.delete(cache.keys().next().value!)
  cache.set(key, compiled)
  return compiled
}
```

<a id="source-3"></a>

## src/engine/expression-derivative.ts

원본: [src/engine/expression-derivative.ts](../../src/engine/expression-derivative.ts) · 135줄 · SHA-256: `f9e9238f3ab9e23d5e4299d0521381eb5d0b7a4dec50d400bc32aecadf242387`

```typescript
import type { NonlinearNode } from './nonlinear-parser'
export type Dual = { value: number; derivative: number }
/** Forward-mode differentiation of the existing safe AST, without executing source text.
 * Undefined means a domain boundary, a non-smooth point, or arithmetic overflow. */
export function evaluateDual(
  node: NonlinearNode,
  environment: Map<string, Dual>,
): Dual | undefined {
  const make = (value: number, derivative: number): Dual | undefined =>
    Number.isFinite(value) && Number.isFinite(derivative)
      ? { value, derivative }
      : undefined
  const power = (a: Dual, b: Dual) => {
    const value = a.value ** b.value
    if (b.derivative === 0) {
      if (b.value === 0) return make(value, 0)
      return make(value, b.value * a.value ** (b.value - 1) * a.derivative)
    }
    return a.value > 0
      ? make(
          value,
          value *
            (b.derivative * Math.log(a.value) +
              (b.value * a.derivative) / a.value),
        )
      : undefined
  }
  if (node.kind === 'number') return make(node.value, 0)
  if (node.kind === 'name') return environment.get(node.name)
  if (node.kind === 'unary') {
    const a = evaluateDual(node.child, environment)
    return a
      ? make(
          node.sign === '-' ? -a.value : a.value,
          node.sign === '-' ? -a.derivative : a.derivative,
        )
      : undefined
  }
  if (node.kind === 'binary') {
    const a = evaluateDual(node.left, environment),
      b = evaluateDual(node.right, environment)
    if (!a || !b) return undefined
    if (node.operator === '+')
      return make(a.value + b.value, a.derivative + b.derivative)
    if (node.operator === '-')
      return make(a.value - b.value, a.derivative - b.derivative)
    if (node.operator === '*')
      return make(
        a.value * b.value,
        a.derivative * b.value + a.value * b.derivative,
      )
    if (node.operator === '/')
      return make(
        a.value / b.value,
        (a.derivative - (a.value / b.value) * b.derivative) / b.value,
      )
    return power(a, b)
  }
  const args = node.args.map((a) => evaluateDual(a, environment))
  if (args.some((a) => !a)) return undefined
  const a = args[0]!,
    b = args[1]
  if (node.name === 'pow') return power(a, b!)
  if (node.name === 'min' || node.name === 'max') {
    if (a.value === b!.value)
      return a.derivative === b!.derivative ? a : undefined
    return (node.name === 'min' ? a.value < b!.value : a.value > b!.value)
      ? a
      : b
  }
  let value: number, slope: number
  switch (node.name) {
    case 'sin':
      value = Math.sin(a.value)
      slope = Math.cos(a.value)
      break
    case 'cos':
      value = Math.cos(a.value)
      slope = -Math.sin(a.value)
      break
    case 'tan':
      value = Math.tan(a.value)
      slope = 1 / Math.cos(a.value) ** 2
      break
    case 'asin':
      value = Math.asin(a.value)
      slope = 1 / Math.sqrt(1 - a.value * a.value)
      break
    case 'acos':
      value = Math.acos(a.value)
      slope = -1 / Math.sqrt(1 - a.value * a.value)
      break
    case 'atan':
      value = Math.atan(a.value)
      slope = 1 / (1 + a.value * a.value)
      break
    case 'sinh':
      value = Math.sinh(a.value)
      slope = Math.cosh(a.value)
      break
    case 'cosh':
      value = Math.cosh(a.value)
      slope = Math.sinh(a.value)
      break
    case 'tanh':
      value = Math.tanh(a.value)
      slope = 1 - value * value
      break
    case 'exp':
      value = Math.exp(a.value)
      slope = value
      break
    case 'ln':
      value = Math.log(a.value)
      slope = 1 / a.value
      break
    case 'log':
    case 'log10':
      value = Math.log10(a.value)
      slope = 1 / a.value / Math.LN10
      break
    case 'sqrt':
      value = Math.sqrt(a.value)
      slope = 1 / (2 * value)
      break
    case 'abs':
      if (a.value === 0) return undefined
      value = Math.abs(a.value)
      slope = Math.sign(a.value)
      break
    default:
      return undefined
  }
  return make(value, slope * a.derivative)
}
```

<a id="source-4"></a>

## src/engine/root-comparison.ts

원본: [src/engine/root-comparison.ts](../../src/engine/root-comparison.ts) · 63줄 · SHA-256: `fece0a5209d6e6dd75b60a1cb355d7edfb7aa03f8050865fa6f40d006238c742`

```typescript
import type { SolveResult } from './index'

const roundoff = (x: number) =>
  Math.max(8 * Number.MIN_VALUE, 128 * Number.EPSILON * Math.abs(x))
const cache = new WeakMap<SolveResult, number[]>()
/** Local error estimate from J*dx=-F; used for duplicate removal, never as a root certificate. */
function uncertainty(result: SolveResult) {
  const cached = cache.get(result)
  if (cached) return cached
  const n = result.values.length,
    errors = result.values.map(roundoff)
  if (result.matrix.length === n && result.residuals.length === n) {
    const a = result.matrix.map((row, i) => {
      const scale = Math.max(...row.map(Math.abs))
      return [...row.map((v) => v / scale), result.residuals[i] / scale]
    })
    let valid = a.every(
      (row) => row.length === n + 1 && row.every(Number.isFinite),
    )
    for (let k = 0; valid && k < n; k++) {
      let pivot = k
      for (let i = k + 1; i < n; i++)
        if (Math.abs(a[i][k]) > Math.abs(a[pivot][k])) pivot = i
      if (a[pivot][k] === 0) {
        valid = false
        break
      }
      ;[a[k], a[pivot]] = [a[pivot], a[k]]
      for (let i = k + 1; i < n; i++) {
        const f = a[i][k] / a[k][k]
        for (let j = k + 1; j <= n; j++) a[i][j] -= f * a[k][j]
      }
    }
    if (valid) {
      const dx = Array(n).fill(0)
      for (let i = n - 1; i >= 0; i--) {
        let rhs = a[i][n]
        for (let j = i + 1; j < n; j++) rhs -= a[i][j] * dx[j]
        dx[i] = rhs / a[i][i]
      }
      dx.forEach((v, i) => {
        if (Number.isFinite(v)) errors[i] += 8 * Math.abs(v)
      })
    }
  }
  cache.set(result, errors)
  return errors
}
export function sameComputedRoot(a: SolveResult, b: SolveResult) {
  if (
    a.variables.length !== b.variables.length ||
    a.variables.some((n, i) => n !== b.variables[i])
  )
    return false
  const ea = uncertainty(a),
    eb = uncertainty(b)
  return a.values.every(
    (v, i) =>
      Number.isFinite(v) &&
      Number.isFinite(b.values[i]) &&
      Math.abs(v - b.values[i]) <= ea[i] + eb[i],
  )
}
```

<a id="source-5"></a>

## src/engine/search-analysis.ts

원본: [src/engine/search-analysis.ts](../../src/engine/search-analysis.ts) · 175줄 · SHA-256: `0ce9050171e15c06103d2fedd702b6d7d3c5313e97f142d559ce0e70c88d80d5`

```typescript
import { polynomialCoefficients } from './automatic-polynomial'
import type { NonlinearNode as Node } from './nonlinear-parser'
export type Bounds = { min: number; max: number }
export type VariableBounds = Record<string, Bounds>
export type SearchWindow = {
  min: number
  max: number
  maxWidth: number
  requestedMin: number
  requestedMax: number
  reason: 'periodic' | 'density'
  variable: string
}
export const nonsmoothSource = (source: string) =>
  /\b(abs|min|max|floor|ceil|sign)\s*\(/i.test(source)
export function nodeText(n: Node): string {
  if (n.kind === 'number') return String(n.value)
  if (n.kind === 'name') return n.name
  if (n.kind === 'unary') return `(${n.sign}${nodeText(n.child)})`
  if (n.kind === 'call') return `${n.name}(${n.args.map(nodeText).join(',')})`
  return `(${nodeText(n.left)}${n.operator}${nodeText(n.right)})`
}
export function peelZeroPower(n: Node): Node {
  if (n.kind === 'unary') return peelZeroPower(n.child)
  if (
    n.kind === 'binary' &&
    (n.operator === '+' || n.operator === '-') &&
    n.right.kind === 'number' &&
    n.right.value === 0
  )
    return peelZeroPower(n.left)
  if (
    n.kind === 'binary' &&
    n.operator === '^' &&
    n.right.kind === 'number' &&
    Number.isInteger(n.right.value) &&
    n.right.value > 0
  )
    return peelZeroPower(n.left)
  if (
    n.kind === 'call' &&
    n.name === 'pow' &&
    n.args[1].kind === 'number' &&
    Number.isInteger(n.args[1].value) &&
    n.args[1].value > 0
  )
    return peelZeroPower(n.args[0])
  return n
}
/** A single sin/cos/tan with affine phase and constant affine outer operations. */
export function periodicFamily(
  node: Node,
  variable: string,
  constants: Record<string, number>,
  helpers: Map<string, Node>,
) {
  type Form = { call?: Node & { kind: 'call' }; scale: number; offset: number }
  const active = new Set<string>()
  const visit = (n: Node): Form | undefined => {
    const c = polynomialCoefficients(n, variable, constants, helpers)
    if (c?.length === 1) return { scale: 0, offset: c[0] }
    if (n.kind === 'name' && helpers.has(n.name) && !active.has(n.name)) {
      active.add(n.name)
      const r = visit(helpers.get(n.name)!)
      active.delete(n.name)
      return r
    }
    if (n.kind === 'call' && ['sin', 'cos', 'tan'].includes(n.name))
      return { call: n, scale: 1, offset: 0 }
    if (n.kind === 'unary') {
      const a = visit(n.child)
      return a
        ? {
            ...a,
            scale: a.scale * (n.sign === '-' ? -1 : 1),
            offset: a.offset * (n.sign === '-' ? -1 : 1),
          }
        : undefined
    }
    if (n.kind !== 'binary') return undefined
    const a = visit(n.left),
      b = visit(n.right)
    if (!a || !b || (a.call && b.call)) return undefined
    if (n.operator === '+' || n.operator === '-') {
      const sign = n.operator === '-' ? -1 : 1
      return {
        call: a.call ?? b.call,
        scale: a.scale + sign * b.scale,
        offset: a.offset + sign * b.offset,
      }
    }
    if (n.operator === '*')
      return {
        call: a.call ?? b.call,
        scale: a.call ? a.scale * b.offset : b.scale * a.offset,
        offset: a.offset * b.offset,
      }
    if (n.operator === '/' && !b.call && b.offset !== 0)
      return {
        call: a.call,
        scale: a.scale / b.offset,
        offset: a.offset / b.offset,
      }
    return undefined
  }
  const f = visit(node)
  if (!f?.call || !f.scale || !Number.isFinite(f.scale)) return undefined
  const phase = polynomialCoefficients(
    f.call.args[0],
    variable,
    constants,
    helpers,
  )
  if (phase?.length !== 2 || !phase[1] || !phase.every(Number.isFinite))
    return undefined
  const target = -f.offset / f.scale,
    a = phase[1],
    b = phase[0],
    name = f.call.name
  if (!Number.isFinite(target)) return undefined
  const period = name === 'tan' ? Math.PI : 2 * Math.PI
  const angles =
    name === 'sin'
      ? Math.abs(target) <= 1
        ? [Math.asin(target), Math.PI - Math.asin(target)]
        : []
      : name === 'cos'
        ? Math.abs(target) <= 1
          ? [Math.acos(target), -Math.acos(target)]
          : []
        : [Math.atan(target)]
  const phases = angles.filter(
    (v, i) =>
      angles.findIndex(
        (w) => Math.abs(Math.sin((v - w) / 2)) < 8 * Number.EPSILON,
      ) === i,
  )
  return {
    a,
    b,
    target,
    period,
    phases,
    maxWidth: (28 * Math.PI) / Math.abs(a),
    name,
    residualScale: Math.abs(f.scale),
  }
}
export function periodicWindow(
  f: NonNullable<ReturnType<typeof periodicFamily>>,
  bounds: Bounds,
  variable: string,
): SearchWindow | undefined {
  if (!Number.isFinite(f.maxWidth) || f.maxWidth <= 0) return undefined
  const center = bounds.min / 2 + bounds.max / 2
  const width = Math.min(bounds.max - bounds.min, f.maxWidth)
  const min = center - width / 2,
    max = center + width / 2
  if (
    !Number.isFinite(min) ||
    !Number.isFinite(max) ||
    min === max ||
    Math.max(Math.abs(f.a * min + f.b), Math.abs(f.a * max + f.b)) > 1e8
  )
    return undefined
  return {
    min,
    max,
    maxWidth: f.maxWidth,
    requestedMin: bounds.min,
    requestedMax: bounds.max,
    reason: 'periodic',
    variable,
  }
}
```

<a id="source-6"></a>

## src/engine/derivative-free.ts

원본: [src/engine/derivative-free.ts](../../src/engine/derivative-free.ts) · 120줄 · SHA-256: `7d59e37f9666c201c42f38ce6901c86b75d6670040c36a390d965c25ac22e885`

```typescript
import type { Bounds } from './search-analysis'
/** No derivative calls: bracketed sign roots and local minimization of |F|.
 * A sign jump alone never counts as a zero. Zero plateaus produce representatives. */
export function derivativeFreeRoots(
  evaluate: (x: number) => number | undefined,
  bounds: Bounds,
  resolution = 4096,
  deadline = performance.now() + 1800,
) {
  const nodes = new Set(
    Array.from(
      { length: resolution + 1 },
      (_, i) =>
        bounds.min * (1 - i / resolution) + bounds.max * (i / resolution),
    ),
  )
  for (let i = 0; resolution >= 1024 && i <= 800; i++) {
    const x = -1 + i / 400
    if (x >= bounds.min && x <= bounds.max) nodes.add(x)
  }
  const grid = [...nodes].sort((a, b) => a - b),
    samples: (number | undefined)[] = [],
    roots: number[] = []
  let truncated = false
  for (const x of grid) {
    if (performance.now() > deadline) {
      truncated = true
      break
    }
    samples.push(evaluate(x))
  }
  let plateau = false,
    run = false
  const add = (x: number) => {
    if (
      !roots.some(
        (r) =>
          Math.abs(r - x) <=
          128 *
            Number.EPSILON *
            Math.max(Number.MIN_VALUE, Math.abs(x), Math.abs(r)),
      )
    )
      roots.push(x)
  }
  for (let i = 0; i < grid.length; i++) {
    if (performance.now() > deadline) {
      truncated = true
      break
    }
    const f = samples[i]
    if (f === 0) {
      if (!run) add(grid[i])
      else plateau = true
      run = true
    } else run = false
    if (
      i &&
      f !== undefined &&
      samples[i - 1] !== undefined &&
      f !== 0 &&
      samples[i - 1] !== 0 &&
      Math.sign(f) !== Math.sign(samples[i - 1]!)
    ) {
      let lo = grid[i - 1],
        hi = grid[i],
        fl = samples[i - 1]!,
        baseline = Math.min(Math.abs(fl), Math.abs(f))
      for (let k = 0; k < 160; k++) {
        const mid = lo / 2 + hi / 2,
          fm = evaluate(mid)
        if (fm === undefined) break
        if (fm === 0) {
          add(mid)
          break
        }
        if (mid === lo || mid === hi) {
          if (Math.abs(fm) <= baseline * 1e-11) add(mid)
          break
        }
        if (Math.sign(fm) === Math.sign(fl)) {
          lo = mid
          fl = fm
        } else hi = mid
      }
    }
    if (
      i > 0 &&
      i + 1 < grid.length &&
      f !== undefined &&
      f !== 0 &&
      samples[i - 1] !== undefined &&
      samples[i + 1] !== undefined &&
      Math.abs(f) < Math.abs(samples[i - 1]!) &&
      Math.abs(f) < Math.abs(samples[i + 1]!)
    ) {
      let lo = grid[i - 1],
        hi = grid[i + 1]
      for (let k = 0; k < 160; k++) {
        const a = lo + (hi - lo) * 0.3819660112501051,
          b = lo + (hi - lo) * 0.6180339887498949
        const fa = evaluate(a),
          fb = evaluate(b)
        if (fa === 0) {
          add(a)
          break
        }
        if (fb === 0) {
          add(b)
          break
        }
        if (fa === undefined || fb === undefined || a === lo || b === hi) break
        if (Math.abs(fa) < Math.abs(fb)) hi = b
        else lo = a
      }
      for (const x of [lo, hi, lo / 2 + hi / 2]) if (evaluate(x) === 0) add(x)
    }
  }
  return { roots, plateau, truncated }
}
```

<a id="source-7"></a>

## src/engine/square-free.ts

원본: [src/engine/square-free.ts](../../src/engine/square-free.ts) · 103줄 · SHA-256: `75b09dc355506a1443e807aaeeec09a682d3a1fa64457c204efeddd97d28a76c`

```typescript
// Exact integer polynomial GCD on the decimal representation of Float64
// coefficients. This removes repeated factors of the coefficient polynomial;
// the original expression remains the final authority for domain/residuals.
const abs = (n: bigint) => (n < 0n ? -n : n)
const gcd = (a: bigint, b: bigint): bigint => {
  a = abs(a)
  b = abs(b)
  while (b) {
    ;[a, b] = [b, a % b]
  }
  return a
}
function trim(a: bigint[]) {
  while (a.length > 1 && a.at(-1) === 0n) a.pop()
  return a
}
function primitive(a: bigint[]) {
  trim(a)
  let g = 0n
  for (const c of a) g = gcd(g, c)
  if (!g) return [0n]
  if (a.at(-1)! < 0n) g = -g
  return a.map((c) => c / g)
}
function limited(a: bigint[]) {
  if (a.some((c) => abs(c).toString(2).length > 32768))
    throw new Error('gcd budget')
  return a
}
function remainder(a: bigint[], b: bigint[]) {
  a = [...a]
  while (a.length >= b.length && a.some((c) => c !== 0n)) {
    const c = a.at(-1)!,
      lead = b.at(-1)!,
      d = a.length - b.length
    a = a.map((v) => v * lead)
    b.forEach((v, i) => (a[i + d] -= v * c))
    a = primitive(limited(a))
  }
  return a
}
export function squareFreeCoefficients(
  coefficients: number[],
): number[] | undefined {
  if (
    coefficients.length < 5 ||
    coefficients.length > 13 ||
    !coefficients.every(Number.isFinite)
  )
    return undefined
  try {
    const parts = coefficients.map((n) => {
      const [mantissa, exponent = '0'] = n.toString().split('e')
      const places = (mantissa.split('.')[1] ?? '').length
      return {
        n: BigInt(mantissa.replace('.', '')),
        e: Number(exponent) - places,
      }
    })
    const min = Math.min(...parts.map((p) => p.e))
    const original = primitive(parts.map((p) => p.n * 10n ** BigInt(p.e - min)))
    let a = original,
      b = primitive(original.slice(1).map((v, i) => v * BigInt(i + 1)))
    while (b.some((c) => c !== 0n)) {
      const r = remainder(a, b)
      a = b
      b = r
    }
    const divisor = primitive(a)
    if (divisor.length <= 1) return undefined
    let r = [...original],
      q = Array<bigint>(original.length - divisor.length + 1).fill(0n)
    while (r.length >= divisor.length && r.some((c) => c !== 0n)) {
      const lead = divisor.at(-1)!,
        c = r.at(-1)!,
        d = r.length - divisor.length
      q = q.map((v) => v * lead)
      q[d] += c
      r = r.map((v) => v * lead)
      divisor.forEach((v, i) => (r[i + d] -= c * v))
      trim(limited(r))
      limited(q)
    }
    if (r.some((c) => c !== 0n)) return undefined
    q = primitive(q)
    const digits = Math.max(...q.map((v) => abs(v).toString().length))
    const out = q.map((v) => {
      if (!v) return 0
      const text = abs(v).toString()
      return (
        (v < 0n ? -1 : 1) *
        Number(text.slice(0, 16)) *
        10 ** (text.length - Math.min(16, text.length) - digits)
      )
    })
    return out.every(Number.isFinite) &&
      out.every((v, i) => v !== 0 || q[i] === 0n)
      ? out
      : undefined
  } catch {
    return undefined
  }
}
```

<a id="source-8"></a>

## src/engine/source-statements.ts

원본: [src/engine/source-statements.ts](../../src/engine/source-statements.ts) · 180줄 · SHA-256: `f4fd3d3c7bdba4f63dab6d019c249c124b9a58a95febdd60a7f8878b75121c99`

```typescript
import { ModelError } from './index'

const NUMBER = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?'
const numericAssignment = new RegExp(
  `^[A-Za-z][A-Za-z0-9_]*\\s*=\\s*${NUMBER}(?:\\s+\\([^()]*\\))?$`,
)
const unitAnnotation = new RegExp(`^(${NUMBER})\\s+\\(([^()]+)\\)$`)
const units =
  '(?:mol|mmol|kmol|bar|mbar|Pa|kPa|MPa|atm|kg|mg|g|km|cm|mm|m|mL|L|K|J|kJ|cal|W|kW|s|min|h|Hz|V|A|ohm)'
const unitGrammar = new RegExp(
  `^${units}(?:\\^[+-]?\\d+)?(?:[*/·]${units}(?:\\^[+-]?\\d+)?)*$`,
)

export type LogicalStatement = { text: string; line: number }
export function normalizeMathCharacters(source: string) {
  return source
    .replace(/\r\n?/g, '\n')
    .replace(/\u2212/g, '-')
    .replace(/\u00d7/g, '*')
    .replace(/\u00f7/g, '/')
    .replace(/[\u00a0\u202f]/g, ' ')
    .replace(/[\u200b\ufeff]/g, '')
}

/** Split only at top level: function argument commas and conditional operators stay intact. */
function splitTopLevel(text: string, separators: string, line: number) {
  const parts: string[] = []
  let depth = 0,
    start = 0
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '(') depth++
    if (ch === ')' && --depth < 0)
      throw new ModelError('닫는 괄호가 너무 많습니다.', line)
    if (
      depth === 0 &&
      separators.includes(ch) &&
      !(ch === '=' && /[<>=!]/.test(text[i - 1] ?? ''))
    ) {
      parts.push(text.slice(start, i).trim())
      start = i + 1
    }
  }
  if (depth !== 0) throw new ModelError('괄호의 짝을 확인해 주세요.', line)
  parts.push(text.slice(start).trim())
  return parts
}

/** Pure input normalization; general name=value equations retain their unknowns. */
export function logicalStatements(
  source: string,
  parameterNames: readonly string[] = [],
): LogicalStatement[] {
  if (source.length > 30_000)
    throw new ModelError('수식은 30,000자 이내로 입력하세요.')
  source = normalizeMathCharacters(source)
  // A symbol used elsewhere remains a mathematical variable, even if it also names a unit.
  const withoutAnnotations = source.replace(
    new RegExp(`(${NUMBER})\\s+\\([^()]+\\)`, 'g'),
    '$1',
  )
  const symbols = new Set(
    [
      ...parameterNames,
      ...withoutAnnotations.matchAll(/\b[A-Za-z][A-Za-z0-9_]*\b/g),
    ].map((x) => (typeof x === 'string' ? x : x[0])),
  )
  const result: LogicalStatement[] = []
  const definitions = new Set<string>()
  source.split('\n').forEach((raw, index) => {
    const line = index + 1
    if (/^\s*#@/.test(raw)) {
      result.push({ text: raw, line })
      return
    }
    const commentAt = raw.indexOf('#')
    const content = (commentAt < 0 ? raw : raw.slice(0, commentAt)).trim()
    if (!content) {
      result.push({ text: raw, line })
      return
    }
    const firstResult = result.length
    const chunks = splitTopLevel(content, ',;', line)
    for (const [chunkIndex, chunk] of chunks.entries()) {
      if (!chunk && chunkIndex === chunks.length - 1) continue
      if (!chunk) throw new ModelError('구분자 사이에 식을 입력하세요.', line)
      const pieces: string[] = []
      let start = 0,
        depth = 0
      for (let i = 0; i < chunk.length; i++) {
        if (chunk[i] === '(') depth++
        if (chunk[i] === ')') depth--
        if (
          depth === 0 &&
          /\s/.test(chunk[i]) &&
          /^[A-Za-z][A-Za-z0-9_]*\s*=/.test(chunk.slice(i).trimStart()) &&
          numericAssignment.test(chunk.slice(start, i).trim())
        ) {
          pieces.push(chunk.slice(start, i).trim())
          start = i
        }
      }
      pieces.push(chunk.slice(start).trim())
      for (const piece of pieces) {
        const sides = splitTopLevel(piece, '=', line)
        if (sides.length > 1 && sides.some((x) => !x))
          throw new ModelError('등호 양쪽에 수식을 완성해 주세요.', line)
        if (sides.length === 1) {
          result.push({ text: piece, line })
          continue
        }
        let unitStripped = false
        if (sides.length === 2 && /^[A-Za-z][A-Za-z0-9_]*$/.test(sides[0])) {
          const annotation = unitAnnotation.exec(sides[1])
          if (annotation) {
            const unit = annotation[2].replace(/\s/g, '')
            const tokens = unit.match(/[A-Za-z]+/g) ?? []
            if (
              unitGrammar.test(unit) &&
              tokens.every((t) => !symbols.has(t))
            ) {
              sides[1] = annotation[1]
              unitStripped = true
            }
          }
        }
        const name = /^f\d+(?:\(\s*[A-Za-z][A-Za-z0-9_]*\s*\))?$/.test(sides[0])
          ? sides[0].replace(/\s/g, '')
          : undefined
        if (sides.length === 2 && !unitStripped)
          result.push({ text: piece, line })
        else if (sides.length > 2 && name && !definitions.has(name)) {
          result.push({ text: `${sides[0]} = ${sides[1]}`, line })
          for (const target of sides.slice(2))
            result.push({ text: `${sides[0]} = ${target}`, line })
        } else {
          for (const left of sides.slice(0, -1))
            result.push({ text: `${left} = ${sides.at(-1)}`, line })
        }
        if (name) definitions.add(name)
      }
    }
    if (
      result.length === firstResult + 1 &&
      result[firstResult].text === content
    )
      result[firstResult].text = raw
    else if (commentAt >= 0)
      result[result.length - 1].text += ' ' + raw.slice(commentAt)
  })
  if (result.length > 2048)
    throw new ModelError(
      '한 모델에는 최대 2,048개의 입력 행을 사용할 수 있습니다.',
    )
  return result
}
export function normalizeEquationSource(
  source: string,
  parameterNames: readonly string[] = [],
) {
  return logicalStatements(source, parameterNames)
    .map((s) => s.text)
    .join('\n')
}

/** Keep parser diagnostics tied to the user's physical row after expanding a chain/list. */
export function normalizedModelCall<T>(
  source: string,
  parameters: readonly string[],
  run: (normalized: string) => T,
): T {
  const statements = logicalStatements(source, parameters)
  try {
    return run(statements.map((s) => s.text).join('\n'))
  } catch (error) {
    if (error instanceof ModelError && error.line !== undefined)
      error.line = statements[error.line - 1]?.line ?? error.line
    throw error
  }
}
```

<a id="source-9"></a>

## src/engine/preprocessor.ts

원본: [src/engine/preprocessor.ts](../../src/engine/preprocessor.ts) · 634줄 · SHA-256: `fe1256087b35e01af6d1cf8c7af73d950db855c7f3642b123104619a9fdb242e`

```typescript
import { normalizeEquationSource } from './source-statements'
import { ModelError } from './index'

export type DefinedFunction = {
  /** Key in definition map: either `f(x)` (when named `f` with variable `x`) or `f1`, `f2`, etc. */
  parameterNames?: ReadonlySet<string>
  key: string
  name: string // e.g., 'f', 'f1', 'f2', 'g1'
  param: string | null // e.g., 'x' for f1(x), or null for f1 = ...
  rhsText: string
  line: number
}

const RESERVED_MATH_FUNCS = new Set([
  'floor',
  'ceil',
  'sign',
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'sinh',
  'cosh',
  'tanh',
  'exp',
  'ln',
  'log',
  'log10',
  'sqrt',
  'abs',
  'pow',
  'min',
  'max',
])

const BUILTIN_CONSTS = new Set(['pi', 'e'])

/** Extract all variable/identifier tokens (not followed by '(') from an expression string. */
function extractVariableReferences(expr: string): string[] {
  const refs: string[] = []
  expr = expr.replace(/(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/g, ' ')
  const tokenRegex = /[A-Za-z][A-Za-z0-9_]*(\s*\()?/g
  let match: RegExpExecArray | null
  while ((match = tokenRegex.exec(expr)) !== null) {
    const full = match[0]
    if (full.includes('(')) continue // function call
    const ident = full.trim()
    if (
      !RESERVED_MATH_FUNCS.has(ident.toLowerCase()) &&
      !BUILTIN_CONSTS.has(ident.toLowerCase())
    ) {
      refs.push(ident)
    }
  }
  return refs
}

/** Substitute parameter `param` with `(argExpr)` inside `body` safely at token boundaries. */
function substituteParameter(
  body: string,
  param: string,
  argExpr: string,
): string {
  const escaped = param.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`\\b${escaped}\\b(?!\\s*\\()`, 'g')
  return `(${body.replace(regex, () => `(${argExpr})`)})`
}

/** Find matching closing parenthesis starting after the opening '(' at openIdx. */
function findClosingParen(text: string, openIdx: number, line: number): number {
  let depth = 1
  for (let i = openIdx; i < text.length; i++) {
    if (text[i] === '(') depth++
    else if (text[i] === ')') {
      depth--
      if (depth === 0) return i
    }
  }
  throw new ModelError('함수 호출의 닫는 괄호 )가 필요합니다.', line)
}

/** Expand user-defined function calls `f1(arg)`, `f(x)`, and parameterless expressions `f1` inside `expr`. */
function expandExpression(
  expr: string,
  defsByName: Map<string, DefinedFunction>,
  defsBySignature: Map<string, DefinedFunction>,
  line: number,
  visiting = new Set<string>(),
  budget = { remaining: 4000 },
): string {
  if (--budget.remaining < 0 || visiting.size > 48 || expr.length > 120_000)
    throw new ModelError(
      '함수 전개가 너무 큽니다. 정의와 중첩을 줄여 주세요.',
      line,
    )
  const current = expr
  const callRegex = /\b([A-Za-z][A-Za-z0-9_]*)\s*\(/g
  let result = ''
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = callRegex.exec(current)) !== null) {
    const fnName = match[1]
    const openEnd = callRegex.lastIndex
    const closeIdx = findClosingParen(current, openEnd, line)
    const rawArg = current.slice(openEnd, closeIdx).trim()
    const expandedArg = expandExpression(
      rawArg,
      defsByName,
      defsBySignature,
      line,
      visiting,
    )

    // Lookup first by exact signature `f(x)` (supports `f(x)` and `f(y)` coexisting for different variables!)
    // then by function name `f1` (supports `f1(x)` evaluated at arbitrary argument `f1(2*x + 1)`).
    const sigKey = `${fnName}(${rawArg})`
    const def = defsBySignature.get(sigKey) ?? defsByName.get(fnName)

    if (def) {
      if (visiting.has(def.key))
        throw new ModelError(`함수 '${def.key}'에 순환 참조가 있습니다.`, line)
      if (def.param === null) {
        throw new ModelError(
          `'${fnName}'은 특정 변수 없이 정의된 수식(${fnName} = ...)입니다. 괄호 없이 '${fnName}'로 사용하거나 '${fnName}(x) = ...'로 정의해 주세요.`,
          line,
        )
      }
      const foreign = extractVariableReferences(expandedArg).find(
        (ref) => ref !== def.param && !def.parameterNames?.has(ref),
      )
      if (foreign)
        throw new ModelError(
          `'${fnName}(${def.param})' 호출에 다른 변수 '${foreign}'를 넣을 수 없습니다. 혼합식은 f1 = ... 형식으로 정의하세요.`,
          line,
        )
      if (!expandedArg)
        throw new ModelError(
          `함수 '${fnName}(${def.param})' 호출 시 인수를 입력해 주세요.`,
          line,
        )
      const nextVisiting = new Set(visiting)
      nextVisiting.add(def.key)
      const expandedBody = expandExpression(
        def.rhsText,
        defsByName,
        defsBySignature,
        def.line,
        nextVisiting,
      )
      const substituted = substituteParameter(
        expandedBody,
        def.param,
        expandedArg,
      )
      result += current.slice(lastIndex, match.index) + substituted
    } else {
      result += current.slice(lastIndex, openEnd) + expandedArg + ')'
    }
    lastIndex = closeIdx + 1
    callRegex.lastIndex = lastIndex
  }
  result += current.slice(lastIndex)

  // 2. Expand parameterless expression references (e.g. f1, f2, or helper variables)
  const identRegex = /\b([A-Za-z][A-Za-z0-9_]*)\b(?!\s*\()/g
  return result.replace(identRegex, (ident) => {
    const def = defsByName.get(ident)
    if (!def) return ident
    if (def.param !== null)
      throw new ModelError(
        `'${ident}'는 함수입니다. ${ident}(${def.param})처럼 인수를 적어 주세요.`,
        line,
      )
    if (visiting.has(def.key))
      throw new ModelError(`수식 '${ident}'에 순환 참조가 있습니다.`, line)
    const nextVisiting = new Set(visiting)
    nextVisiting.add(def.key)
    const expandedBody = expandExpression(
      def.rhsText,
      defsByName,
      defsBySignature,
      def.line,
      nextVisiting,
      budget,
    )
    return `(${expandedBody})`
  })
}

export type PreprocessedSource = {
  /** Expanded equation lines ready for the linear or nonlinear solver */
  expandedSource: string
  /** List of defined functions/expressions (`f1(x)`, `f2(y)`, `f1 = ...`) for UI display or auxiliary evaluation */
  definitions: DefinedFunction[]
}

/**
 * Preprocess equation source supporting:
 * 1. Single-variable function definitions:
 *    - Numbered functions: `f1(x) = 2x + 4`, `f2(x) = -3x + 7`, `f1(y) = y^2 - 1`
 *    - Variable-specific `f(x)` / `f(y)`: `f(x) = 2x + 4`, `f(y) = -3y + 7`
 *    - Strict single-variable validation: Inside `fn(v) = ...`, the RHS may ONLY use variable `v`
 *      (plus declared parameters/constants/other defined expressions). If the RHS uses another unknown `u !== v`
 *      (like `f(y) = -3x + 7` in Screenshot 2), throws a clear error telling the user:
 *      - For an equation in `x`, write `f1(x) = -3x + 7`, `f2(x) = ...`
 *      - For an equation in `y`, write `f1(y) = -3y + 7`
 *      - To mix variables (`x` and `y`), write `f1 = -3x + y + 7` without `(variable)`!
 *    - If two functions of the SAME variable share the same name (e.g. two `f(x) = ...`), guides the user to number them `f1(x), f2(x)`.
 * 2. Variable-free multi-variable expression definitions:
 *    `f1 = 2x + y - 3`, `f2 = x - y + 1`
 * 3. Algebraic combinations of defined functions/expressions:
 *    `f1(x) - f2(x) = 0`, `f(x) - f(y) = 0`, `2*f1(x) + f2(y) = 10`, `f1 - f2 = 0`
 */
export function preprocessModelSource(
  source: string,
  parameterNames: readonly string[],
  mode: 'linear' | 'nonlinear' = 'linear',
): PreprocessedSource {
  if (source.length > 30_000)
    throw new ModelError('수식은 30,000자 이내로 입력하세요.')
  const paramSet = new Set(parameterNames)
  const rawLines = source.replace(/\r\n?/g, '\n').split('\n')

  type ParsedLine =
    | {
        kind: 'func_def'
        name: string
        param: string
        rhs: string
        line: number
        raw: string
      }
    | {
        kind: 'expr_def'
        name: string
        rhs: string
        line: number
        raw: string
      }
    | {
        kind: 'condition'
        raw: string
        line: number
      }
    | {
        kind: 'equation'
        lhs: string
        rhs: string
        hasEquals: boolean
        line: number
        raw: string
      }
    | {
        kind: 'empty'
        raw: string
        line: number
      }

  const declaredSignatures = new Set<string>()
  const declaredExpressions = new Set<string>()
  const parsedLines: ParsedLine[] = []
  const defsByName = new Map<string, DefinedFunction>()
  const defsBySignature = new Map<string, DefinedFunction>()
  const allDefs: DefinedFunction[] = []

  for (let i = 0; i < rawLines.length; i++) {
    const lineNo = i + 1
    const raw = rawLines[i]
    if (/^\s*#@/.test(raw)) {
      parsedLines.push({
        kind: 'equation',
        lhs: raw,
        rhs: '',
        hasEquals: false,
        line: lineNo,
        raw,
      })
      continue
    }
    const text = raw.split('#', 1)[0].trim()
    if (!text) {
      parsedLines.push({ kind: 'empty', raw, line: lineNo })
      continue
    }

    const sides: string[] = []
    let depth = 0,
      start = 0
    for (let j = 0; j < text.length; j++) {
      if (text[j] === '(') depth++
      if (text[j] === ')') depth--
      if (
        depth === 0 &&
        text[j] === '=' &&
        !/[<>=!]/.test(text[j - 1] ?? '') &&
        text[j + 1] !== '='
      ) {
        sides.push(text.slice(start, j))
        start = j + 1
      }
    }
    sides.push(text.slice(start))
    if (sides.length > 2) {
      throw new ModelError('한 줄에는 등호를 하나만 사용하세요.', lineNo)
    }

    if (sides.length === 2) {
      const lhs = sides[0].trim()
      const rhs = sides[1].trim()
      if (!lhs || !rhs) {
        throw new ModelError(
          '등호 양쪽에 수식을 완성해 주세요. 예: f1(x) = 2x + 4',
          lineNo,
        )
      }

      // 1. Check boundary/initial condition: x(min) = ..., x(max) = ..., x(0) = ...
      const condMatch = /^([A-Za-z][A-Za-z0-9_]*)\(\s*(min|max|0)\s*\)$/.exec(
        lhs,
      )
      if (condMatch && !RESERVED_MATH_FUNCS.has(condMatch[1].toLowerCase())) {
        parsedLines.push({ kind: 'condition', raw: text, line: lineNo })
        continue
      }

      // 2. Check parameterized function definition: f1(x) = ..., f2(y) = ..., f(x) = ..., f(y) = ...
      const fnDefMatch =
        /^([A-Za-z][A-Za-z0-9_]*)\(\s*([A-Za-z][A-Za-z0-9_]*)\s*\)$/.exec(lhs)
      if (fnDefMatch && /^f\d*$/.test(fnDefMatch[1])) {
        const signature = `${fnDefMatch[1]}(${fnDefMatch[2]})`
        if (declaredSignatures.has(signature)) {
          parsedLines.push({
            kind: 'equation',
            lhs,
            rhs,
            hasEquals: true,
            line: lineNo,
            raw,
          })
          continue
        }
        declaredSignatures.add(signature)
        const [, fnName, paramVar] = fnDefMatch
        if (RESERVED_MATH_FUNCS.has(fnName.toLowerCase())) {
          throw new ModelError(
            `'${fnName}'은 내장 수학 함수 이름입니다. f1, f2처럼 다른 함수 이름을 사용해 주세요.`,
            lineNo,
          )
        }
        if (
          RESERVED_MATH_FUNCS.has(paramVar.toLowerCase()) ||
          BUILTIN_CONSTS.has(paramVar.toLowerCase())
        ) {
          throw new ModelError(
            `함수 인자 이름으로 예약어 '${paramVar}'를 사용할 수 없습니다.`,
            lineNo,
          )
        }
        parsedLines.push({
          kind: 'func_def',
          name: fnName,
          param: paramVar,
          rhs,
          line: lineNo,
          raw,
        })
        continue
      }

      // 3. Check variable-free expression definition: f1 = ..., f2 = ..., g1 = ...
      const exprDefMatch = /^(f\d+)$/.exec(lhs)
      if (exprDefMatch && !paramSet.has(lhs)) {
        if (declaredExpressions.has(lhs)) {
          parsedLines.push({
            kind: 'equation',
            lhs,
            rhs,
            hasEquals: true,
            line: lineNo,
            raw,
          })
          continue
        }
        declaredExpressions.add(lhs)
        parsedLines.push({
          kind: 'expr_def',
          name: lhs,
          rhs,
          line: lineNo,
          raw,
        })
        continue
      }

      parsedLines.push({
        kind: 'equation',
        lhs,
        rhs,
        hasEquals: true,
        line: lineNo,
        raw,
      })
    } else {
      parsedLines.push({
        kind: 'equation',
        lhs: text,
        rhs: '',
        hasEquals: false,
        line: lineNo,
        raw,
      })
    }
  }

  // Register definitions and check for collisions
  // Note: We validate single-variable purity FIRST so that if the user wrote
  // `f(x) = 2x + 4` and `f(y) = -3x + 7` (like Screenshot 2), they immediately see the
  // exact variable mismatch error on line 2 AND the numbering tip!
  for (const item of parsedLines) {
    if (item.kind === 'expr_def') {
      if (defsByName.has(item.name)) {
        throw new ModelError(
          `수식 이름 '${item.name}'이 중복 정의되었습니다. f1, f2처럼 숫자로 구분해 주세요.`,
          item.line,
        )
      }
      const def: DefinedFunction = {
        key: item.name,
        name: item.name,
        param: null,
        rhsText: item.rhs,
        line: item.line,
      }
      defsByName.set(item.name, def)
      allDefs.push(def)
    }
  }

  for (const item of parsedLines) {
    if (item.kind === 'func_def') {
      if (defsByName.get(item.name)?.param === null)
        throw new ModelError(
          `정의 '${item.name}'이 중복되었습니다. 다른 번호를 사용하세요.`,
          item.line,
        )
      const prior = defsByName.get(item.name)
      if (item.name !== 'f' && prior?.param && prior.param !== item.param)
        throw new ModelError(
          `'${item.name}(${prior.param})'를 다른 변수 '${item.param}'로 중복 정의할 수 없습니다. 다른 번호를 사용하세요.`,
          item.line,
        )
      const sigKey = `${item.name}(${item.param})`
      // First check if the RHS uses any foreign variable `ref !== item.param`!
      const rawRefs = extractVariableReferences(item.rhs)
      for (const ref of rawRefs) {
        if (ref !== item.param && !paramSet.has(ref) && !defsByName.has(ref)) {
          throw new ModelError(
            `'${item.name}(${item.param})'는 '${item.param}'에 대한 함수인데 우변에 다른 변수 '${ref}'가 사용되었습니다. '${ref}'에 대한 식이면 'f1(${ref}) = ${item.rhs}'(또는 '${item.param}'에 대한 식이면 '${item.param}' 사용)로 작성하고, 여러 변수를 혼합하려면 특정 변수 없이 'f1 = ${item.rhs}'로 작성해 주세요.`,
            item.line,
          )
        }
      }
      if (defsBySignature.has(sigKey)) {
        throw new ModelError(
          `'${sigKey}'가 중복 정의되었습니다. 모든 함수 표현은 f1(${item.param}), f2(${item.param})처럼 숫자로 구분해 주세요.`,
          item.line,
        )
      }
      const def: DefinedFunction = {
        key: sigKey,
        parameterNames: paramSet,
        name: item.name,
        param: item.param,
        rhsText: item.rhs,
        line: item.line,
      }
      defsBySignature.set(sigKey, def)
      // If `name` is uniquely used for one parameter, also register in `defsByName`
      // so `f1(2*x + 1)` argument substitution works seamlessly.
      if (!defsByName.has(item.name)) {
        defsByName.set(item.name, def)
      }
      allDefs.push(def)
    }
  }

  if (allDefs.length > 48) throw new ModelError('함수 정의는 최대 48개입니다.')

  // Second pass validation on expanded RHS of `func_def` (in case a nested helper introduced another variable)
  for (const item of parsedLines) {
    if (item.kind === 'func_def') {
      const sigKey = `${item.name}(${item.param})`
      const expandedRhs = expandExpression(
        item.rhs,
        defsByName,
        defsBySignature,
        item.line,
        new Set([sigKey]),
      )
      const refs = extractVariableReferences(expandedRhs)
      for (const ref of refs) {
        if (ref !== item.param && !paramSet.has(ref)) {
          throw new ModelError(
            `'${item.name}(${item.param})'는 '${item.param}'에 대한 함수인데 내부에 다른 변수 '${ref}'가 포함되어 있습니다. 여러 변수를 혼합하려면 'f1 = ...' 형태로 작성해 주세요.`,
            item.line,
          )
        }
      }
    }
  }

  // Track which definitions (`f1(x)`, `f(x)`, `f1`) are referenced in other equations or definitions
  const equationItems = parsedLines.filter((l) => l.kind === 'equation')
  const referencedKeys = new Set<string>()
  for (const item of parsedLines) {
    const textToScan =
      item.kind === 'equation'
        ? `${item.lhs} ${item.rhs}`
        : item.kind === 'func_def' || item.kind === 'expr_def'
          ? item.rhs
          : ''
    if (!textToScan) continue
    for (const def of allDefs) {
      if (
        (item.kind === 'func_def' &&
          `${item.name}(${item.param})` === def.key) ||
        (item.kind === 'expr_def' && item.name === def.key)
      )
        continue
      if (def.param !== null) {
        const sigRegex = new RegExp(
          `\\b${def.name}\\s*\\(\\s*${def.param}\\s*\\)`,
        )
        const nameCallRegex = new RegExp(`\\b${def.name}\\s*\\(`)
        if (
          sigRegex.test(textToScan) ||
          (defsByName.get(def.name) === def && nameCallRegex.test(textToScan))
        ) {
          referencedKeys.add(def.key)
        }
      } else {
        const identRegex = new RegExp(`\\b${def.name}\\b(?!\\s*\\()`)
        if (identRegex.test(textToScan)) {
          referencedKeys.add(def.key)
        }
      }
    }
  }

  const outputLines: string[] = []
  const hasExplicitEquations = equationItems.length > 0

  for (const item of parsedLines) {
    if (item.kind === 'empty') {
      outputLines.push('')
      continue
    }
    if (item.kind === 'condition') {
      outputLines.push(item.raw)
      continue
    }
    if (item.kind === 'func_def' || item.kind === 'expr_def') {
      const key =
        item.kind === 'func_def' ? `${item.name}(${item.param})` : item.name
      if (referencedKeys.has(key) || hasExplicitEquations) {
        outputLines.push(`# [정의] ${key}`)
      } else {
        const expanded = expandExpression(
          item.rhs,
          defsByName,
          defsBySignature,
          item.line,
        )
        outputLines.push(`${expanded} = 0`)
      }
      continue
    }
    if (item.kind === 'equation') {
      if (item.hasEquals) {
        const expLhs = expandExpression(
          item.lhs,
          defsByName,
          defsBySignature,
          item.line,
        )
        const expRhs = expandExpression(
          item.rhs,
          defsByName,
          defsBySignature,
          item.line,
        )
        outputLines.push(`${expLhs} = ${expRhs}`)
      } else {
        const expLhs = expandExpression(
          item.lhs,
          defsByName,
          defsBySignature,
          item.line,
        )
        outputLines.push(`${expLhs} = 0`)
      }
    }
  }

  if (outputLines.join('\n').length > 120_000)
    throw new ModelError('함수 전개 결과가 너무 큽니다.')
  return {
    expandedSource: outputLines.join('\n'),
    definitions: allDefs,
  }
}
/** New numbered definitions or explicit function algebra opt into new syntax.
 * Standalone legacy f(x)=residual retains its existing model semantics. */
export function preprocessSolverSource(
  source: string,
  parameterNames: readonly string[],
  mode: 'linear' | 'nonlinear',
) {
  source = normalizeEquationSource(source, parameterNames)
  const lines = source.split('\n').map((line) => line.split('#')[0].trim())
  const numbered = lines.some((line) =>
    /^f\d+\s*(?:\(\s*[A-Za-z][A-Za-z0-9_]*\s*\))?\s*=/.test(line),
  )
  const algebra = lines.some(
    (line) =>
      /\bf\s*\(/.test(line) &&
      !/^f\(\s*[A-Za-z][A-Za-z0-9_]*\s*\)\s*=/.test(line),
  )
  return numbered || algebra
    ? preprocessModelSource(source, parameterNames, mode).expandedSource
    : source
}
```

<a id="source-10"></a>

## src/engine/nonlinear.ts

원본: [src/engine/nonlinear.ts](../../src/engine/nonlinear.ts) · 489줄 · SHA-256: `911d6154a2165e625353470e0ee2ac7852b6e77c27b29b745269e96ce29eb1dc`

```typescript
import { nonsmoothSource } from './search-analysis'
import { derivativeFreeRoots } from './derivative-free'
import { normalizedModelCall } from './source-statements'
import { normalizeEquationSource } from './source-statements'
import { conditionNumber } from './conditioning'
import { ModelError, type SolveResult, type SolverOptions } from './index'
import { compileNonlinear, type CompiledModel } from './nonlinear-parser'

type WasmExports = {
  memory: WebAssembly.Memory
  solve: (size: number) => number
}
type Evaluation = ReturnType<CompiledModel['evaluate']>
type Evaluator = (values: number[]) => Evaluation
type IterationResult = {
  values: number[]
  evaluation: Evaluation
  iterations: number
  matrix?: number[][]
}
const MAX_ITERATIONS = 200
const RESIDUAL_TOLERANCE = 1e-11
const STEP_TOLERANCE = 1e-10
const BRACKET_TOLERANCE = 1e-12
const PIVOT_TOLERANCE = 1e-12

function rankError(): never {
  throw new ModelError(
    '현재 추정값에서 Jacobian이 특이하거나 독립적인 수식이 부족합니다. 중복 수식과 초기 추정값을 확인해 주세요.',
  )
}

/** The shared WASM kernel receives an equilibrated augmented matrix. */
function linearStep(
  matrix: number[][],
  rhs: number[],
  wasm: WasmExports | null,
) {
  const augmented = matrix.map((row, i) => {
    const scale = Math.max(...row.map(Math.abs))
    if (!scale) rankError()
    const result = [...row.map((value) => value / scale), rhs[i] / scale]
    if (result.some((value) => !Number.isFinite(value)))
      throw new ModelError(
        'Newton 보정량이 수치 범위를 벗어났습니다. 수식의 단위와 초기 추정값을 조정해 주세요.',
      )
    return result
  })
  const n = augmented.length
  if (wasm) {
    new Float64Array(wasm.memory.buffer).set(augmented.flat(), 0)
    if (wasm.solve(n) !== 0) rankError()
    const values = Array.from(new Float64Array(wasm.memory.buffer, 65536, n))
    if (!values.every(Number.isFinite)) rankError()
    return values
  }
  for (let k = 0; k < n; k++) {
    let pivot = k
    for (let row = k + 1; row < n; row++)
      if (Math.abs(augmented[row][k]) > Math.abs(augmented[pivot][k]))
        pivot = row
    if (Math.abs(augmented[pivot][k]) < PIVOT_TOLERANCE) rankError()
    ;[augmented[k], augmented[pivot]] = [augmented[pivot], augmented[k]]
    for (let row = k + 1; row < n; row++) {
      const factor = augmented[row][k] / augmented[k][k]
      for (let col = k + 1; col <= n; col++)
        augmented[row][col] -= factor * augmented[k][col]
      augmented[row][k] = 0
    }
  }
  const values = Array<number>(n).fill(0)
  for (let row = n - 1; row >= 0; row--) {
    let value = augmented[row][n]
    for (let col = row + 1; col < n; col++)
      value -= augmented[row][col] * values[col]
    values[row] = value / augmented[row][row]
  }
  if (!values.every(Number.isFinite)) rankError()
  return values
}

/** Domain-safe differences use both sides when possible, otherwise one side.
 * Shrinking before a one-sided fallback keeps log/sqrt derivatives local. */
export function numericalJacobian(
  evaluate: Evaluator,
  values: number[],
  base: number[],
) {
  const n = values.length
  const result = Array.from({ length: n }, () => Array<number>(n).fill(0))
  for (let col = 0; col < n; col++) {
    let step = Math.cbrt(Number.EPSILON) * Math.max(1, Math.abs(values[col]))
    let forward: { values: number[]; distance: number } | undefined
    let backward: { values: number[]; distance: number } | undefined
    let domainError: unknown
    for (let attempt = 0; attempt < 16; attempt++) {
      const plus = [...values],
        minus = [...values]
      plus[col] += step
      minus[col] -= step
      const plusDistance = plus[col] - values[col]
      const minusDistance = values[col] - minus[col]
      let currentForward: typeof forward, currentBackward: typeof backward
      if (plusDistance > 0 && Number.isFinite(plus[col])) {
        try {
          currentForward = {
            values: evaluate(plus).residuals,
            distance: plusDistance,
          }
        } catch (error) {
          if (!(error instanceof ModelError)) throw error
          domainError = error
        }
      }
      if (minusDistance > 0 && Number.isFinite(minus[col])) {
        try {
          currentBackward = {
            values: evaluate(minus).residuals,
            distance: minusDistance,
          }
        } catch (error) {
          if (!(error instanceof ModelError)) throw error
          domainError = error
        }
      }
      if (currentForward) forward = currentForward
      if (currentBackward) backward = currentBackward
      if (currentForward && currentBackward) break
      step *= 0.25
    }
    if (!forward && !backward) {
      if (domainError instanceof ModelError) throw domainError
      throw new ModelError(
        '현재 추정값 주변에서 Jacobian을 계산할 수 없습니다. 초기 추정값과 함수의 정의역을 확인해 주세요.',
      )
    }
    for (let row = 0; row < n; row++) {
      const a = forward?.values[row] ?? base[row]
      const b = backward?.values[row] ?? base[row]
      const distance = (forward?.distance ?? 0) + (backward?.distance ?? 0)
      const difference = a - b
      const derivative = Number.isFinite(difference)
        ? difference / distance
        : a / distance - b / distance
      if (!Number.isFinite(derivative))
        throw new ModelError(
          'Jacobian의 기울기가 수치 범위를 벗어났습니다. 수식의 단위와 초기 추정값을 조정해 주세요.',
        )
      result[row][col] = derivative
    }
  }
  return result
}

function bisect(model: CompiledModel, evaluate: Evaluator): IterationResult {
  let left = model.bounds!.min,
    right = model.bounds!.max
  let leftEvaluation = evaluate([left]),
    rightEvaluation = evaluate([right])
  let leftResidual = leftEvaluation.residuals[0],
    rightResidual = rightEvaluation.residuals[0]
  if (leftResidual === 0)
    return { values: [left], evaluation: leftEvaluation, iterations: 0 }
  if (rightResidual === 0)
    return { values: [right], evaluation: rightEvaluation, iterations: 0 }
  if (Math.sign(leftResidual) === Math.sign(rightResidual))
    throw new ModelError(
      '구간 양 끝의 함수값 부호가 같습니다. 근을 사이에 두도록 최소·최대 경계를 조정해 주세요.',
    )
  // Use the better endpoint as the baseline: a very large value near a
  // different pole must not make a sign jump elsewhere look like a root.
  const residualScale = Math.min(
    Math.abs(leftResidual),
    Math.abs(rightResidual),
  )
  for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
    // Halving separately avoids overflow for large, opposite-signed bounds.
    const middle = left / 2 + right / 2
    const evaluation = evaluate([middle])
    const residual = evaluation.residuals[0]
    if (residual === 0)
      return { values: [middle], evaluation, iterations: iteration }
    const width = right / 2 - left / 2
    const narrow =
      width <= (BRACKET_TOLERANCE * Math.max(1, Math.abs(middle))) / 2
    // A narrow sign-changing bracket alone can be a pole or a jump. Require
    // an actual reduction in the function residual as well as a small width.
    if (narrow && Math.abs(residual) / residualScale <= RESIDUAL_TOLERANCE)
      return { values: [middle], evaluation, iterations: iteration }
    if (middle === left || middle === right)
      throw new ModelError(
        '구간이 수치 한계까지 줄었지만 잔차가 0에 가까워지지 않았습니다. 불연속점이나 근이 없는 구간인지 확인해 주세요.',
      )
    if (Math.sign(residual) === Math.sign(leftResidual)) {
      left = middle
      leftResidual = residual
      leftEvaluation = evaluation
    } else {
      right = middle
      rightResidual = residual
      rightEvaluation = evaluation
    }
  }
  throw new ModelError(
    '200회 반복 후에도 근에 수렴하지 않았습니다. 구간의 연속성과 최소·최대 경계를 확인해 주세요.',
  )
}

function newton(
  model: CompiledModel,
  evaluate: Evaluator,
  wasm: WasmExports | null,
  analytic: (values: number[]) => number[][] | undefined,
): IterationResult {
  let values = [...model.guesses!]
  const variableScales = values.map((value) => Math.abs(value) || 1)
  const stepScale = (value: number, index: number) =>
    Math.max(Math.abs(value), variableScales[index] * 1e-6, 1e-300)
  let evaluation = evaluate(values)
  let matrix =
    analytic(values) ??
    numericalJacobian(evaluate, values, evaluation.residuals)
  const rowScales = matrix.map((row, i) => {
    const gradientScale = Math.max(
      ...row.map((entry, j) => Math.abs(entry) * variableScales[j]),
    )
    return Math.max(
      Math.abs(evaluation.residuals[i]),
      gradientScale,
      Number.MIN_VALUE,
    )
  })
  const norm = (residuals: number[]) =>
    Math.max(...residuals.map((value, i) => Math.abs(value) / rowScales[i]))
  let lastStep = Infinity
  for (let iteration = 0; iteration <= MAX_ITERATIONS; iteration++) {
    const currentNorm = norm(evaluation.residuals)
    if (
      evaluation.residuals.every((value) => value === 0) ||
      (currentNorm <= RESIDUAL_TOLERANCE && lastStep <= STEP_TOLERANCE)
    ) {
      // Do not report an underdetermined system as a unique successful solve.
      linearStep(
        matrix,
        matrix.map(() => 0),
        wasm,
      )
      return { values, evaluation, iterations: iteration, matrix }
    }
    if (iteration === MAX_ITERATIONS) break
    const correction = linearStep(
      matrix,
      evaluation.residuals.map((value) => -value),
      wasm,
    )
    const correctionNorm = Math.max(
      ...correction.map(
        (value, i) => Math.abs(value) / stepScale(values[i], i),
      ),
    )
    if (currentNorm <= RESIDUAL_TOLERANCE && correctionNorm <= STEP_TOLERANCE)
      return { values, evaluation, iterations: iteration, matrix }
    let accepted:
      | { values: number[]; evaluation: Evaluation; alpha: number }
      | undefined
    let validCandidate = false
    let domainError: ModelError | undefined
    for (let search = 0, alpha = 1; search < 28; search++, alpha /= 2) {
      const candidate = values.map((value, i) => value + alpha * correction[i])
      if (!candidate.every(Number.isFinite)) continue
      try {
        const candidateEvaluation = evaluate(candidate)
        validCandidate = true
        const candidateNorm = norm(candidateEvaluation.residuals)
        if (
          candidateNorm <= currentNorm * (1 - 1e-4 * alpha) ||
          candidateEvaluation.residuals.every((value) => value === 0)
        ) {
          accepted = {
            values: candidate,
            evaluation: candidateEvaluation,
            alpha,
          }
          break
        }
      } catch (error) {
        if (!(error instanceof ModelError)) throw error
        domainError = error
      }
    }
    if (!accepted) {
      if (!validCandidate && domainError)
        throw new ModelError(
          `Newton 보정값이 함수의 정의역을 벗어났습니다. 초기 추정값을 조정해 주세요. ${domainError.message}`,
          domainError.line,
        )
      throw new ModelError(
        'Newton 반복이 더 이상 잔차를 줄이지 못해 수렴하지 않았습니다. 다른 초기 추정값과 수식의 연속성을 확인해 주세요.',
      )
    }
    lastStep = Math.max(
      ...accepted.values.map(
        (value, i) => Math.abs(value - values[i]) / stepScale(value, i),
      ),
    )
    values = accepted.values
    evaluation = accepted.evaluation
    matrix =
      analytic(values) ??
      numericalJacobian(evaluate, values, evaluation.residuals)
    if (lastStep === 0 && norm(evaluation.residuals) > RESIDUAL_TOLERANCE)
      throw new ModelError(
        'Newton 보정량이 수치 한계에 도달했지만 잔차가 남았습니다. 초기 추정값과 수식의 단위를 확인해 주세요.',
      )
  }
  throw new ModelError(
    '200회 Newton 반복 후에도 수렴하지 않았습니다. 초기 추정값을 바꾸거나 수식의 정의역·스케일을 확인해 주세요.',
  )
}

/** Compile once per source/parameter schema, then solve with new values.
 * Scalar interval methods and expression evaluation run in JavaScript;
 * simultaneous Newton corrections use the actual WASM Gaussian kernel. */
export async function createNonlinearSolver(
  wasmBinary?: BufferSource,
): Promise<
  (
    source: string,
    parameters: Record<string, number>,
    options?: SolverOptions,
  ) => SolveResult
> {
  let wasm: WasmExports | null = null
  try {
    const bytes =
      wasmBinary ??
      (await (
        await fetch(`${import.meta.env?.BASE_URL ?? '/'}solver.wasm`)
      ).arrayBuffer())
    const instance = await WebAssembly.instantiate(bytes, {})
    const exports = instance.instance.exports as unknown as WasmExports
    if (
      !(exports.memory instanceof WebAssembly.Memory) ||
      typeof exports.solve !== 'function'
    )
      throw new Error('Missing solver exports')
    wasm = exports
  } catch {
    // A missing or blocked WASM module has an explicitly labelled fallback.
  }
  const solve = (
    source: string,
    parameters: Record<string, number>,
    options: SolverOptions = {},
  ): SolveResult => {
    const start = performance.now()
    const conditionNorm = options.conditionNorm ?? 'infinity'
    if (conditionNorm !== 'infinity' && conditionNorm !== '2')
      throw new ModelError('조건수 계산 방법을 확인해 주세요.')
    source = normalizeEquationSource(source, Object.keys(parameters))
    const model = compileNonlinear(source, Object.keys(parameters))
    const evaluate: Evaluator = (values) => model.evaluate(values, parameters)
    if (model.kind === 'evaluation') {
      const evaluation = evaluate([])
      return {
        kind: 'evaluation',
        variables: evaluation.evaluationNames,
        values: evaluation.evaluationValues,
        auxiliary: evaluation.auxiliary,
        matrix: [],
        rhs: [],
        residuals: [],
        maxResidual: 0,
        condition: NaN,
        conditionNorm,
        conditionError:
          '수식 평가에는 근 찾기와 Jacobian 조건수가 적용되지 않습니다.',
        engine: 'javascript',
        iterations: 0,
        method: '명시적 수식 평가',
        durationMs: performance.now() - start,
        warnings: [],
      }
    }
    const scalar = model.variables.length === 1
    const nonsmooth = nonsmoothSource(source)
    if (nonsmooth && !scalar)
      throw new ModelError(
        '비매끄러운 연립식의 미분 없는 다변수 탐색은 아직 지원하지 않습니다.',
      )
    let solved: IterationResult
    let matrix: number[][]
    try {
      if (nonsmooth) {
        const found = derivativeFreeRoots((x) => {
          try {
            return evaluate([x]).residuals[0]
          } catch {
            return undefined
          }
        }, model.bounds!)
        if (!found.roots.length || found.truncated)
          throw new ModelError(
            '지정 구간에서 미분 없이 실근을 찾지 못했습니다.',
          )
        const x = found.roots.sort((a, b) => Math.abs(a) - Math.abs(b))[0]
        solved = { values: [x], evaluation: evaluate([x]), iterations: 0 }
      } else
        solved = scalar
          ? bisect(model, evaluate)
          : newton(model, evaluate, wasm, (values) =>
              model.jacobian?.(values, parameters),
            )
      matrix = nonsmooth
        ? [[NaN]]
        : (solved.matrix ??
          model.jacobian?.(solved.values, parameters) ??
          numericalJacobian(
            evaluate,
            solved.values,
            solved.evaluation.residuals,
          ))
    } catch (error) {
      if (error instanceof ModelError && error.line === undefined)
        error.line = model.rootLines?.[0]
      throw error
    }
    const residuals = solved.evaluation.residuals
    let condition = NaN
    let conditionError: string | undefined
    if (options.computeCondition !== false) {
      try {
        condition = conditionNumber(matrix, conditionNorm)
      } catch {
        conditionError =
          '선택한 방법으로 해에서의 Jacobian 조건수를 계산하지 못했습니다. 잔차와 다른 norm을 확인해 주세요.'
      }
    }
    const warnings: string[] = []
    if (nonsmooth) {
      conditionError = '비매끄러운 식은 미분 기반 조건수를 적용하지 않습니다.'
      warnings.push(
        '미분 없는 수치 탐색 결과입니다. 구간 해가 있으면 대표값을 표시할 수 있습니다.',
      )
    }
    if (!scalar && !wasm)
      warnings.push(
        'WebAssembly를 사용할 수 없어 JavaScript Newton 솔버로 계산했습니다.',
      )
    if (conditionError) warnings.push(conditionError)
    if (condition >= 1e8)
      warnings.push(
        '해에서의 Jacobian 조건수가 큽니다. 초기 추정값과 입력 오차에 대한 민감도를 확인해 주세요.',
      )
    warnings.push(
      scalar
        ? '지정 구간에서 찾은 하나의 근입니다. 모든 근을 보장하지 않으며 다른 구간에서는 다른 근을 찾을 수 있습니다.'
        : '초기 추정값에서 찾은 하나의 해입니다. 다른 초기 추정값에서는 다른 해를 찾거나 수렴하지 않을 수 있습니다.',
    )
    return {
      kind: 'nonlinear',
      variables: model.variables,
      values: solved.values,
      auxiliary: solved.evaluation.auxiliary,
      matrix,
      rhs: residuals.map((value) => -value),
      residuals,
      maxResidual: Math.max(...residuals.map(Math.abs)),
      condition,
      conditionNorm,
      ...(conditionError ? { conditionError } : {}),
      engine: !scalar && wasm ? 'wasm' : 'javascript',
      iterations: solved.iterations,
      method: nonsmooth
        ? '미분 없는 구간 탐색'
        : scalar
          ? '구간 이분법'
          : model.jacobian?.(solved.values, parameters)
            ? '감쇠 Newton · 자동미분 Jacobian'
            : '감쇠 Newton · 수치 Jacobian',
      durationMs: performance.now() - start,
      warnings,
    }
  }
  return (source, parameters, options) =>
    normalizedModelCall(source, Object.keys(parameters), (normalized) =>
      solve(normalized, parameters, options),
    )
}
```

<a id="source-11"></a>

## src/engine/automatic-polynomial.ts

원본: [src/engine/automatic-polynomial.ts](../../src/engine/automatic-polynomial.ts) · 588줄 · SHA-256: `1c6b3ff337b00ad40d5d1c378a7033b3ba4b7fc7e38663258ff87f8f9a537bc7`

```typescript
import { squareFreeCoefficients } from './square-free'
import {
  evaluateNonlinearExpression,
  type NonlinearNode,
} from './nonlinear-parser'

const MAX_DEGREE = 12

/** Conservative classification used only for relaxing a continuation gate.
 * With polynomial parameter coefficients and a fixed nonzero leading term,
 * finite parameter paths cannot send a root through a hidden rational pole.
 * Instantiating a polynomial at one parameter value alone cannot establish
 * this: x=1/p and p*x=1 are unsafe families despite being linear in x. */
export function isRegularPolynomialFamily(
  node: NonlinearNode,
  variable: string,
  parameterNames: Set<string>,
  helpers: Map<string, NonlinearNode>,
): boolean {
  type Family = { degree: number; leading: number | null }
  const active = new Set<string>()
  const memo = new Map<string, Family | null>()
  const constant = (value: number): Family | null =>
    Number.isFinite(value) ? { degree: 0, leading: value } : null
  const power = (base: Family, exponent: Family): Family | null => {
    const value = exponent.leading
    if (
      exponent.degree !== 0 ||
      value === null ||
      !Number.isInteger(value) ||
      value < 0 ||
      value > MAX_DEGREE
    )
      return null
    const degree = base.degree * value
    if (degree > MAX_DEGREE) return null
    if (value === 0) return constant(1)
    const leading = base.leading === null ? null : base.leading ** value
    return leading === null || Number.isFinite(leading)
      ? { degree, leading }
      : null
  }
  const visit = (current: NonlinearNode, depth = 0): Family | null => {
    if (depth > 256) return null
    if (current.kind === 'number') return constant(current.value)
    if (current.kind === 'name') {
      if (current.name === variable) return { degree: 1, leading: 1 }
      if (parameterNames.has(current.name)) return { degree: 0, leading: null }
      if (current.name === 'pi') return constant(Math.PI)
      if (current.name === 'e') return constant(Math.E)
      if (memo.has(current.name)) return memo.get(current.name)!
      const helper = helpers.get(current.name)
      if (!helper || active.has(current.name)) return null
      active.add(current.name)
      const family = visit(helper, depth + 1)
      active.delete(current.name)
      memo.set(current.name, family)
      return family
    }
    if (current.kind === 'unary') {
      const child = visit(current.child, depth + 1)
      return (
        child && {
          degree: child.degree,
          leading:
            child.leading === null
              ? null
              : current.sign === '-'
                ? -child.leading
                : child.leading,
        }
      )
    }
    if (current.kind === 'binary') {
      const left = visit(current.left, depth + 1)
      const right = visit(current.right, depth + 1)
      if (!left || !right) return null
      if (current.operator === '+' || current.operator === '-') {
        if (left.degree !== right.degree)
          return left.degree > right.degree
            ? left
            : {
                degree: right.degree,
                leading:
                  right.leading === null
                    ? null
                    : current.operator === '-'
                      ? -right.leading
                      : right.leading,
              }
        const leading =
          left.leading === null || right.leading === null
            ? null
            : left.leading +
              (current.operator === '-' ? -right.leading : right.leading)
        if (leading !== null && !Number.isFinite(leading)) return null
        return {
          degree: left.degree,
          leading: left.degree > 0 && leading === 0 ? null : leading,
        }
      }
      if (current.operator === '*') {
        const degree = left.degree + right.degree
        if (degree > MAX_DEGREE) return null
        if (
          (left.degree === 0 && left.leading === 0) ||
          (right.degree === 0 && right.leading === 0)
        )
          return constant(0)
        const leading =
          left.leading === null || right.leading === null
            ? null
            : left.leading * right.leading
        return leading === null || Number.isFinite(leading)
          ? { degree, leading }
          : null
      }
      if (current.operator === '/') {
        if (right.degree !== 0 || right.leading === null || right.leading === 0)
          return null
        const leading =
          left.leading === null ? null : left.leading / right.leading
        return leading === null || Number.isFinite(leading)
          ? { degree: left.degree, leading }
          : null
      }
      if (current.operator === '^') return power(left, right)
      return null
    }
    const args = current.args.map((argument) => visit(argument, depth + 1))
    if (args.some((argument) => argument === null)) return null
    if (current.name === 'pow') return power(args[0]!, args[1]!)
    if (
      args.some(
        (argument) => argument!.degree !== 0 || argument!.leading === null,
      )
    )
      return null
    try {
      return constant(
        evaluateNonlinearExpression(
          { node: current, line: 1, references: new Set() },
          new Map([
            ['pi', Math.PI],
            ['e', Math.E],
          ]),
        ),
      )
    } catch {
      return null
    }
  }
  const family = visit(node)
  return Boolean(
    family &&
      family.degree > 0 &&
      family.leading !== null &&
      family.leading !== 0,
  )
}

/** Return ascending coefficients only for algebraic operations that preserve a
 * polynomial's domain. No source code is executed during classification. */
export function polynomialCoefficients(
  node: NonlinearNode,
  variable: string,
  constants: Record<string, number>,
  helpers: Map<string, NonlinearNode>,
): number[] | null {
  const active = new Set<string>()
  const memo = new Map<string, number[] | null>()
  const finite = (coefficients: number[]) =>
    coefficients.every(Number.isFinite) ? trim(coefficients) : null
  const add = (a: number[], b: number[], sign = 1) => {
    const result = Array<number>(Math.max(a.length, b.length)).fill(0)
    for (let i = 0; i < result.length; i += 1)
      result[i] = (a[i] ?? 0) + sign * (b[i] ?? 0)
    return finite(result)
  }
  const multiply = (a: number[], b: number[]) => {
    if (a.length + b.length - 2 > MAX_DEGREE) return null
    const result = Array<number>(a.length + b.length - 1).fill(0)
    for (let i = 0; i < a.length; i += 1)
      for (let j = 0; j < b.length; j += 1) result[i + j] += a[i] * b[j]
    return finite(result)
  }
  const power = (base: number[], exponent: number): number[] | null => {
    if (!Number.isInteger(exponent) || exponent < 0 || exponent > MAX_DEGREE)
      return null
    let result = [1]
    for (let i = 0; i < exponent; i += 1) {
      const next = multiply(result, base)
      if (!next) return null
      result = next
    }
    return result
  }
  const visit = (current: NonlinearNode, depth = 0): number[] | null => {
    if (depth > 256) return null
    if (current.kind === 'number') return [current.value]
    if (current.kind === 'name') {
      if (current.name === variable) return [0, 1]
      if (Object.hasOwn(constants, current.name)) {
        const value = constants[current.name]
        return Number.isFinite(value) ? [value] : null
      }
      if (current.name === 'pi') return [Math.PI]
      if (current.name === 'e') return [Math.E]
      if (memo.has(current.name)) return memo.get(current.name)!
      const helper = helpers.get(current.name)
      if (!helper || active.has(current.name)) return null
      active.add(current.name)
      const result = visit(helper, depth + 1)
      active.delete(current.name)
      memo.set(current.name, result)
      return result
    }
    if (current.kind === 'unary') {
      const child = visit(current.child, depth + 1)
      return (
        child?.map((value) => (current.sign === '-' ? -value : value)) ?? null
      )
    }
    if (current.kind === 'binary') {
      const left = visit(current.left, depth + 1)
      const right = visit(current.right, depth + 1)
      if (!left || !right) return null
      if (current.operator === '+') return add(left, right)
      if (current.operator === '-') return add(left, right, -1)
      if (current.operator === '*') return multiply(left, right)
      if (current.operator === '/')
        return right.length === 1 && right[0] !== 0
          ? finite(left.map((value) => value / right[0]))
          : null
      if (current.operator === '^')
        return right.length === 1 ? power(left, right[0]) : null
      return null
    }
    const args = current.args.map((argument) => visit(argument, depth + 1))
    if (args.some((argument) => argument === null)) return null
    if (current.name === 'pow' && args[1]!.length === 1)
      return power(args[0]!, args[1]![0])
    if (args.some((argument) => argument!.length !== 1)) return null
    try {
      const value = evaluateNonlinearExpression(
        {
          node: {
            kind: 'call',
            name: current.name,
            args: args.map((argument) => ({
              kind: 'number',
              value: argument![0],
            })),
          },
          line: 1,
          references: new Set(),
        },
        new Map(),
      )
      return Number.isFinite(value) ? [value] : null
    } catch {
      return null
    }
  }
  return visit(node)
}

function trim(coefficients: number[]) {
  const result = [...coefficients]
  while (result.length > 1 && result[result.length - 1] === 0) result.pop()
  return result
}

/** Numerically isolate real polynomial roots using derivative critical points.
 * Coefficient arithmetic and root isolation use floating point, so this is not
 * a symbolic certificate of completeness or of exact multiplicity. */
export function findPolynomialRealRoots(
  coefficients: number[],
  bounds?: { min: number; max: number },
): { roots: number[]; min: number; max: number; identicallyZero?: boolean } {
  const original = trim(squareFreeCoefficients(coefficients) ?? coefficients)
  const scale = Math.max(...original.map(Math.abs))
  // Retain very small coefficients if global normalization would erase them.
  const normalized =
    scale > 0
      ? original.some((value) => value !== 0 && value / scale === 0)
        ? original
        : original.map((value) => value / scale)
      : [0]
  const degree = normalized.length - 1
  let extent = 1
  if (degree > 0) {
    const leading = Math.abs(normalized[degree])
    const ratio = Math.max(
      ...normalized.slice(0, -1).map((value) => Math.abs(value) / leading),
    )
    extent = 1 + ratio
    // Fujiwara is often much tighter for tiny roots and remains finite when
    // the Cauchy ratio overflows. Neither bound assumes the root scale is 1.
    const fujiwara =
      2 *
      Math.max(
        0,
        ...original
          .slice(0, -1)
          .map((value, index) =>
            value === 0
              ? 0
              : Math.exp(
                  (Math.log(Math.abs(value)) -
                    Math.log(Math.abs(original[degree]))) /
                    (degree - index),
                ),
          ),
      )
    if (fujiwara > 0) extent = Math.min(extent, fujiwara)
    if (!Number.isFinite(extent)) extent = Number.MAX_VALUE / 4
  }
  const min = bounds?.min ?? -extent
  const max = bounds?.max ?? extent
  if (scale === 0) return { roots: [], min, max, identicallyZero: true }
  if (
    degree === 0 ||
    degree > MAX_DEGREE ||
    !Number.isFinite(min) ||
    !Number.isFinite(max) ||
    min > max
  )
    return { roots: [], min, max }

  const isolate = (polynomial: number[]): number[] => {
    const count = polynomial.length - 1
    if (count === 0) return []
    // Preserve an exact zero root instead of bisecting toward subnormal
    // underflow in x*Q(x), which can produce an artificial nonzero candidate.
    if (polynomial[0] === 0)
      return unique([
        ...(min <= 0 && max >= 0 ? [0] : []),
        ...isolate(polynomial.slice(1)),
      ])
    if (count === 1) {
      const root = -polynomial[0] / polynomial[1]
      return Number.isFinite(root) && root >= min && root <= max ? [root] : []
    }
    const derivative = polynomial
      .slice(1)
      .map((value, index) => value * (index + 1))
    const critical = isolate(derivative)
    const knots = unique([min, ...critical, max])
    const roots: number[] = []
    for (const point of knots) {
      const sample = evaluate(polynomial, point)
      // Expanded coefficients can lose a few ulps at a repeated root; the
      // original model still verifies every returned candidate in the caller.
      if (Math.abs(sample.value) <= sample.roundoff) roots.push(point)
    }
    for (let i = 1; i < knots.length; i += 1) {
      let left = knots[i - 1],
        right = knots[i]
      let leftValue = evaluate(polynomial, left).value
      const rightValue = evaluate(polynomial, right).value
      if (
        leftValue === 0 ||
        rightValue === 0 ||
        Math.sign(leftValue) === Math.sign(rightValue)
      )
        continue
      for (let iteration = 0; iteration < 1200; iteration += 1) {
        const middle = left / 2 + right / 2
        if (middle === left || middle === right) break
        const middleValue = evaluate(polynomial, middle).value
        if (middleValue === 0) {
          left = middle
          right = middle
          break
        }
        if (Math.sign(middleValue) === Math.sign(leftValue)) {
          left = middle
          leftValue = middleValue
        } else right = middle
      }
      const middle = left / 2 + right / 2
      const candidates = [left, middle, right]
      candidates.sort(
        (a, b) =>
          Math.abs(evaluate(polynomial, a).value) -
          Math.abs(evaluate(polynomial, b).value),
      )
      roots.push(candidates[0])
    }
    return unique(roots)
  }
  return { roots: isolate(normalized), min, max }
}

function unique(values: number[]) {
  return values
    .sort((a, b) => a - b)
    .filter(
      (value, index, sorted) =>
        index === 0 ||
        Math.abs(value - sorted[index - 1]) >
          64 *
            Number.EPSILON *
            Math.max(
              Number.MIN_VALUE,
              Math.abs(value),
              Math.abs(sorted[index - 1]),
            ),
    )
}

// Compensated Horner evaluation keeps signs trustworthy near cancellation.
// For large x evaluate P(x)/x^degree, avoiding overflow without moving its roots.
function evaluate(coefficients: number[], x: number) {
  const reverse = Math.abs(x) > 1
  const factor = reverse ? 1 / x : x
  const sequence = reverse ? coefficients : [...coefficients].reverse()
  let value = sequence[0],
    correction = 0,
    magnitude = Math.abs(sequence[0])
  for (let i = 1; i < sequence.length; i += 1) {
    const product = value * factor
    const productError = twoProductError(value, factor, product)
    const sum = product + sequence[i]
    const z = sum - product
    const sumError = product - (sum - z) + (sequence[i] - z)
    correction = correction * factor + (productError + sumError)
    value = sum
    magnitude = magnitude * Math.abs(factor) + Math.abs(sequence[i])
  }
  const sign = reverse && x < 0 && (coefficients.length - 1) % 2 ? -1 : 1
  return {
    value: (value + correction) * sign,
    roundoff: 2 * Number.EPSILON * coefficients.length * magnitude,
  }
}

function twoProductError(a: number, b: number, product: number) {
  const splitter = 134_217_729
  const aSplit = splitter * a,
    bSplit = splitter * b
  if (!Number.isFinite(aSplit) || !Number.isFinite(bSplit)) return 0
  const aHigh = aSplit - (aSplit - a),
    bHigh = bSplit - (bSplit - b)
  const aLow = a - aHigh,
    bLow = b - bHigh
  return aHigh * bHigh - product + aHigh * bLow + aLow * bHigh + aLow * bLow
}

/** Extract the numerator polynomial of a rational expression N(x)/D(x) = 0
 * (such as van der Waals (P + a/V^2)*(V - b) - R*T = 0) when D(x) depends on x.
 * Every root candidate isolated from N(x) is still strictly verified against the
 * original expression (which rejects poles where D(x) = 0). */
export function rationalCoefficients(
  node: NonlinearNode,
  variable: string,
  constants: Record<string, number>,
  helpers: Map<string, NonlinearNode>,
): { numerator: number[]; denominator: number[] } | null {
  type Rat = { num: number[]; den: number[] }
  const active = new Set<string>()
  const memo = new Map<string, Rat | null>()
  const finite = (c: number[]) => (c.every(Number.isFinite) ? trim(c) : null)
  const addPoly = (a: number[], b: number[], sign = 1) => {
    const res = Array<number>(Math.max(a.length, b.length)).fill(0)
    for (let i = 0; i < res.length; i++)
      res[i] = (a[i] ?? 0) + sign * (b[i] ?? 0)
    return finite(res)
  }
  const mulPoly = (a: number[], b: number[]) => {
    if (a.length + b.length - 2 > MAX_DEGREE) return null
    const res = Array<number>(a.length + b.length - 1).fill(0)
    for (let i = 0; i < a.length; i++)
      for (let j = 0; j < b.length; j++) res[i + j] += a[i] * b[j]
    return finite(res)
  }
  const powRat = (base: Rat, exp: number): Rat | null => {
    if (!Number.isInteger(exp) || Math.abs(exp) > MAX_DEGREE) return null
    if (exp === 0) return { num: [1], den: [1] }
    const b = exp < 0 ? { num: base.den, den: base.num } : base
    const n = Math.abs(exp)
    let num: number[] | null = [1]
    let den: number[] | null = [1]
    for (let i = 0; i < n; i++) {
      num = num && mulPoly(num, b.num)
      den = den && mulPoly(den, b.den)
      if (!num || !den) return null
    }
    return den.length === 1 && den[0] === 0 ? null : { num, den }
  }
  const visit = (current: NonlinearNode, depth = 0): Rat | null => {
    if (depth > 256) return null
    if (current.kind === 'number')
      return Number.isFinite(current.value)
        ? { num: [current.value], den: [1] }
        : null
    if (current.kind === 'name') {
      if (current.name === variable) return { num: [0, 1], den: [1] }
      if (Object.hasOwn(constants, current.name)) {
        const v = constants[current.name]
        return Number.isFinite(v) ? { num: [v], den: [1] } : null
      }
      if (current.name === 'pi') return { num: [Math.PI], den: [1] }
      if (current.name === 'e') return { num: [Math.E], den: [1] }
      if (memo.has(current.name)) return memo.get(current.name)!
      const helper = helpers.get(current.name)
      if (!helper || active.has(current.name)) return null
      active.add(current.name)
      const res = visit(helper, depth + 1)
      active.delete(current.name)
      memo.set(current.name, res)
      return res
    }
    if (current.kind === 'unary') {
      const child = visit(current.child, depth + 1)
      return (
        child && {
          num: current.sign === '-' ? child.num.map((v) => -v) : [...child.num],
          den: [...child.den],
        }
      )
    }
    if (current.kind === 'binary') {
      const left = visit(current.left, depth + 1)
      const right = visit(current.right, depth + 1)
      if (!left || !right) return null
      if (current.operator === '+' || current.operator === '-') {
        const sign = current.operator === '-' ? -1 : 1
        // If denominators are identical, avoid inflating degree!
        if (
          left.den.length === right.den.length &&
          left.den.every((v, idx) => v === right.den[idx])
        ) {
          const num = addPoly(left.num, right.num, sign)
          return num ? { num, den: left.den } : null
        }
        const term1 = mulPoly(left.num, right.den)
        const term2 = mulPoly(right.num, left.den)
        const den = mulPoly(left.den, right.den)
        if (!term1 || !term2 || !den) return null
        const num = addPoly(term1, term2, sign)
        return num ? { num, den } : null
      }
      if (current.operator === '*') {
        const num = mulPoly(left.num, right.num)
        const den = mulPoly(left.den, right.den)
        return num && den ? { num, den } : null
      }
      if (current.operator === '/') {
        if (right.num.length === 1 && right.num[0] === 0) return null
        const num = mulPoly(left.num, right.den)
        const den = mulPoly(left.den, right.num)
        return num && den ? { num, den } : null
      }
      if (
        current.operator === '^' &&
        right.den.length === 1 &&
        right.den[0] === 1 &&
        right.num.length === 1
      ) {
        return powRat(left, right.num[0])
      }
      return null
    }
    // Constant transcendental calls are allowed; a variable call remains non-rational.
    if (current.kind === 'call' && current.name === 'pow') {
      const base = visit(current.args[0], depth + 1)
      const exponent = polynomialCoefficients(
        current.args[1],
        variable,
        constants,
        helpers,
      )
      return base && exponent?.length === 1 ? powRat(base, exponent[0]) : null
    }
    const constant = polynomialCoefficients(
      current,
      variable,
      constants,
      helpers,
    )
    return constant?.length === 1 ? { num: constant, den: [1] } : null
  }
  const rat = visit(node)
  if (!rat || rat.den.every((v) => v === 0)) return null
  return { numerator: rat.num, denominator: rat.den }
}
```

<a id="source-12"></a>

## src/engine/parameter-path.ts

원본: [src/engine/parameter-path.ts](../../src/engine/parameter-path.ts) · 257줄 · SHA-256: `04bb2159e6f4de8cfb8734414507358a4dc4a72de2fe40095b5d8fe70500a952`

```typescript
import type { NonlinearNode } from './nonlinear-parser'

type Node = NonlinearNode
type Interval = [number, number] | null
type PolyCoeffs = Node[] // ascending degree: [c_0(p), c_1(p), ..., c_d(p)]

const MAX_DEGREE = 12
const number = (value: number): Node => ({ kind: 'number', value })
const zero = (node: Node) => node.kind === 'number' && node.value === 0
const binary = (
  operator: '+' | '-' | '*' | '/' | '^',
  left: Node,
  right: Node,
): Node => {
  if (left.kind === 'number' && right.kind === 'number') {
    const value =
      operator === '+'
        ? left.value + right.value
        : operator === '-'
          ? left.value - right.value
          : operator === '*'
            ? left.value * right.value
            : operator === '/'
              ? left.value / right.value
              : left.value ** right.value
    if (Number.isFinite(value)) return number(value)
  }
  if (operator === '*' && (zero(left) || zero(right))) return number(0)
  if ((operator === '+' || operator === '-') && zero(right)) return left
  if (operator === '+' && zero(left)) return right
  return { kind: 'binary', operator, left, right }
}
const containsZero = (value: [number, number]) => value[0] <= 0 && value[1] >= 0

function trimPoly(coeffs: Node[]): PolyCoeffs {
  const out = [...coeffs]
  while (out.length > 1 && zero(out.at(-1)!)) out.pop()
  return out
}

function addPoly(a: PolyCoeffs, b: PolyCoeffs, sign: 1 | -1): PolyCoeffs {
  const len = Math.max(a.length, b.length)
  const out: Node[] = []
  for (let i = 0; i < len; i++) {
    const ca = a[i] ?? number(0)
    const cb = b[i] ?? number(0)
    out.push(sign === 1 ? binary('+', ca, cb) : binary('-', ca, cb))
  }
  return trimPoly(out)
}

function mulPoly(a: PolyCoeffs, b: PolyCoeffs): PolyCoeffs | null {
  const degA = a.length - 1
  const degB = b.length - 1
  if (degA + degB > MAX_DEGREE) return null
  const out: Node[] = Array.from({ length: degA + degB + 1 }, () => number(0))
  for (let i = 0; i <= degA; i++) {
    if (zero(a[i])) continue
    for (let j = 0; j <= degB; j++) {
      if (zero(b[j])) continue
      out[i + j] = binary('+', out[i + j], binary('*', a[i], b[j]))
    }
  }
  return trimPoly(out)
}

/** Domain checks for algebraic parameter denominators and degenerate parameter
 * poles (such as x = 1/p, x = 1/(p-0.1)^2, p*x = 1, or (p*x - 1)^3 = 0).
 * Higher-order polynomials with a surviving lower-degree term (such as
 * p*x^3 + x = 1 at p = 0) are NOT blocked because c_1(0) = 1 != 0. */
export function createParameterPathValidator(
  expression: Node,
  variable: string,
  helpers: Map<string, Node>,
) {
  const denominators: Node[] = []
  const visited = new Set<Node>()
  const collect = (node: Node, depth = 0) => {
    if (depth > 256 || visited.has(node)) return
    visited.add(node)
    if (node.kind === 'name') {
      const helper = helpers.get(node.name)
      if (helper) collect(helper, depth + 1)
    } else if (node.kind === 'unary') collect(node.child, depth + 1)
    else if (node.kind === 'binary') {
      if (node.operator === '/') denominators.push(node.right)
      if (
        node.operator === '^' &&
        node.right.kind === 'number' &&
        node.right.value < 0
      )
        denominators.push(node.left)
      collect(node.left, depth + 1)
      collect(node.right, depth + 1)
    } else if (node.kind === 'call') {
      if (
        node.name === 'pow' &&
        node.args[1]?.kind === 'number' &&
        node.args[1].value < 0
      )
        denominators.push(node.args[0])
      node.args.forEach((child) => collect(child, depth + 1))
    }
  }
  collect(expression)

  const polyActive = new Set<string>()
  const asPolyInVar = (node: Node, depth = 0): PolyCoeffs | null => {
    if (depth > 256) return null
    if (node.kind === 'number') return [node]
    if (node.kind === 'name') {
      if (node.name === variable) return [number(0), number(1)]
      const helper = helpers.get(node.name)
      if (!helper) return [node]
      if (polyActive.has(node.name)) return null
      polyActive.add(node.name)
      const result = asPolyInVar(helper, depth + 1)
      polyActive.delete(node.name)
      return result
    }
    if (node.kind === 'unary') {
      const child = asPolyInVar(node.child, depth + 1)
      if (!child) return null
      return node.sign === '+'
        ? child
        : child.map((c) => binary('*', number(-1), c))
    }
    if (node.kind === 'binary') {
      const left = asPolyInVar(node.left, depth + 1)
      const right = asPolyInVar(node.right, depth + 1)
      if (!left || !right) return null
      if (node.operator === '+') return addPoly(left, right, 1)
      if (node.operator === '-') return addPoly(left, right, -1)
      if (node.operator === '*') return mulPoly(left, right)
      if (node.operator === '/') {
        if (right.length !== 1) return null
        return left.map((c) => binary('/', c, right[0]))
      }
      if (
        node.operator === '^' &&
        right.length === 1 &&
        right[0].kind === 'number'
      ) {
        const exp = right[0].value
        if (exp === 0) return [number(1)]
        if (exp === 1) return left
        if (left.length === 1) return [node]
        if (Number.isInteger(exp) && exp > 1 && exp <= MAX_DEGREE) {
          let acc: PolyCoeffs | null = [number(1)]
          for (let i = 0; i < exp && acc; i++) acc = mulPoly(acc, left)
          return acc
        }
      }
      return null
    }
    if (node.kind === 'call') {
      const args = node.args.map((child) => asPolyInVar(child, depth + 1))
      return args.every((child) => child && child.length === 1) ? [node] : null
    }
    return null
  }
  const poly = asPolyInVar(expression)

  return (
    from: Record<string, number>,
    to: Record<string, number>,
  ): boolean => {
    const active = new Set<string>()
    const interval = (node: Node, depth = 0): Interval => {
      if (depth > 256) return null
      const finite = (values: number[]): Interval =>
        values.every(Number.isFinite)
          ? [Math.min(...values), Math.max(...values)]
          : null
      if (node.kind === 'number') return finite([node.value])
      if (node.kind === 'name') {
        if (node.name === variable) return null
        if (Object.hasOwn(from, node.name) && Object.hasOwn(to, node.name))
          return finite([from[node.name], to[node.name]])
        if (node.name === 'pi') return [Math.PI, Math.PI]
        if (node.name === 'e') return [Math.E, Math.E]
        const helper = helpers.get(node.name)
        if (!helper || active.has(node.name)) return null
        active.add(node.name)
        const result = interval(helper, depth + 1)
        active.delete(node.name)
        return result
      }
      if (node.kind === 'unary') {
        const child = interval(node.child, depth + 1)
        return child && (node.sign === '+' ? child : [-child[1], -child[0]])
      }
      const power = (
        base: [number, number],
        exponent: [number, number],
      ): Interval => {
        const n = exponent[0]
        if (n !== exponent[1] || !Number.isInteger(n) || Math.abs(n) > 12)
          return null
        if (n < 0 && containsZero(base)) return null
        const values = [base[0] ** n, base[1] ** n]
        if (n > 0 && n % 2 === 0 && containsZero(base)) values.push(0)
        return finite(values)
      }
      if (node.kind === 'call') {
        if (node.name !== 'pow') return null
        const base = interval(node.args[0], depth + 1)
        const exponent = interval(node.args[1], depth + 1)
        return base && exponent ? power(base, exponent) : null
      }
      const left = interval(node.left, depth + 1)
      const right = interval(node.right, depth + 1)
      if (!left || !right) return null
      if (node.operator === '+')
        return finite([left[0] + right[0], left[1] + right[1]])
      if (node.operator === '-')
        return finite([left[0] - right[1], left[1] - right[0]])
      if (node.operator === '*')
        return finite([
          left[0] * right[0],
          left[0] * right[1],
          left[1] * right[0],
          left[1] * right[1],
        ])
      if (node.operator === '/')
        return containsZero(right)
          ? null
          : finite([
              left[0] / right[0],
              left[0] / right[1],
              left[1] / right[0],
              left[1] / right[1],
            ])
      if (node.operator === '^') return power(left, right)
      return null
    }
    for (const denominator of denominators) {
      const range = interval(denominator)
      if (range && containsZero(range)) return false
    }
    // Check if ALL non-constant coefficients c_1(p)...c_d(p) can vanish in [from, to]
    // while the constant term c_0(p) stays strictly non-zero (e.g. p*x = 1, (p*x - 1)^3 = 0).
    // For p*x^3 + x = 1, c_1(p) = [1, 1] does NOT contain 0, so it remains safe!
    if (poly && poly.length > 1) {
      const c0 = interval(poly[0])
      const higher = poly.slice(1).map((c) => interval(c))
      if (
        c0 &&
        !containsZero(c0) &&
        higher.every((r) => r !== null && containsZero(r))
      ) {
        return false
      }
    }
    return true
  }
}
```

<a id="source-13"></a>

## src/engine/tangency.ts

원본: [src/engine/tangency.ts](../../src/engine/tangency.ts) · 218줄 · SHA-256: `3ec6c4871dae4497930ad6bd6130602bca43850420e52c63f38ab88931d9bcd5`

```typescript
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
```

<a id="source-14"></a>

## src/engine/automatic.ts

원본: [src/engine/automatic.ts](../../src/engine/automatic.ts) · 1,453줄 · SHA-256: `0cbcedb6dde3f9d7428846bd5e6a0d3663a9c00610a68655fa8f69a5d3ae809a`

```typescript
import { squareFreeCoefficients } from './square-free'
import { derivativeFreeRoots } from './derivative-free'
import {
  nodeText,
  peelZeroPower,
  periodicFamily,
  periodicWindow,
  nonsmoothSource,
  type VariableBounds,
  type SearchWindow,
} from './search-analysis'
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
  variableBounds?: VariableBounds
  window?: SearchWindow
  nonIsolated?: boolean
}
export type AutomaticOptions = SolverOptions & {
  searchBounds?: { min: number; max: number }
  variableBounds?: VariableBounds
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
  originalModel?: CompiledModel
  nonsmooth: boolean
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
  let model = compileNonlinear(`${canonical}\n${metadata}`, parameterNames)
  const originalModel = model
  if (model.variables.length === 1 && expression) {
    const peeled = peelZeroPower(expression)
    if (peeled !== expression) {
      expression = peeled
      const working = canonical
        .split('\n')
        .map((line) =>
          ROOT.test(line) ? `f(${variables[0]}) = ${nodeText(peeled)}` : line,
        )
        .join('\n')
      model = compileNonlinear(`${working}\n${metadata}`, parameterNames)
    }
  }
  const prepared = {
    source: canonical,
    fixedEquations,
    variables: model.variables,
    model,
    originalModel: originalModel === model ? undefined : originalModel,
    nonsmooth: nonsmoothSource(canonical),
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
  const matrix = prepared.nonsmooth
    ? values.map(() => values.map(() => NaN))
    : (prepared.model.jacobian?.(values, parameters) ??
      numericalJacobian(evaluate, values, evaluation.residuals))
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
function ownBounds(options: AutomaticOptions, variable: string) {
  return options.variableBounds &&
    Object.hasOwn(options.variableBounds, variable)
    ? options.variableBounds[variable]
    : undefined
}
function boundsFor(options: AutomaticOptions, variable?: string) {
  const bounds = (variable ? ownBounds(options, variable) : undefined) ??
    options.searchBounds ?? { min: -100, max: 100 }
  if (
    !Number.isFinite(bounds.min) ||
    !Number.isFinite(bounds.max) ||
    !Number.isFinite(bounds.max - bounds.min) ||
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
        (hasLocalVariation(prepared.model, parameters, value) ||
          (residual === 0 && !!squareFreeCoefficients(coefficients))) &&
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
  const resultModel = prepared.originalModel ?? prepared.model
  const evaluation = resultModel.evaluate([value], parameters)
  const slope = prepared.nonsmooth
    ? NaN
    : ((!prepared.originalModel ? slopeOverride : undefined) ??
      derivative(resultModel, parameters, value, evaluation.residuals[0]))
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
  if (prepared.nonsmooth)
    conditionError =
      '비매끄러운 식은 미분 기반 조건수·접점 분류를 적용하지 않습니다.'
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
function systemSeeds(variables: string[], box: { min: number; max: number }[]) {
  const n = variables.length,
    seeds: number[][] = []
  const middle = box.map((b) => b.min / 2 + b.max / 2)
  const add = (v: number[]) => {
    if (
      v.every((x, i) => x >= box[i].min && x <= box[i].max) &&
      !seeds.some((s) => s.every((x, i) => x === v[i]))
    )
      seeds.push(v)
  }
  add(middle)
  for (const x of [0, 1, -1])
    add(box.map((b) => Math.max(b.min, Math.min(b.max, x))))
  add(box.map((b) => b.min))
  add(box.map((b) => b.max))
  for (let i = 0; i < n; i++)
    for (const x of [box[i].min, box[i].max])
      add(middle.map((v, j) => (i === j ? x : v)))
  if (n === 2) {
    const coordinates = box.map((b, i) => [
      ...new Set(
        [b.min, b.max, middle[i], -10, -3, -1, 0, 1, 3, 10].filter(
          (v) => v >= b.min && v <= b.max,
        ),
      ),
    ])
    for (const x of coordinates[0]) for (const y of coordinates[1]) add([x, y])
  }
  const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53]
  for (let i = 1; seeds.length < 160 && i <= 1920; i++)
    add(
      box.map(
        (b, j) =>
          b.min * (1 - radicalInverse(i, primes[j])) +
          b.max * radicalInverse(i, primes[j]),
      ),
    )
  return seeds.sort(compareFromOrigin).slice(0, 160)
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
      if (prepared.nonsmooth) {
        const span = Math.max(1, Math.abs(values[0]))
        const found = derivativeFreeRoots(
          (x) => tryScalar(prepared.model, parameters, x),
          { min: values[0] - span, max: values[0] + span },
          64,
        )
        if (!found.roots.length || found.truncated)
          throw new ModelError(
            '미분 없는 국소 탐색에서 현재 분기를 추적하지 못했습니다.',
          )
        const x = found.roots.reduce((a, b) =>
          Math.abs(a - values[0]) <= Math.abs(b - values[0]) ? a : b,
        )
        return scalarResult(prepared, parameters, x, options)
      }
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
    for (const [name, b] of Object.entries(options.variableBounds ?? {})) {
      if (
        !/^[A-Za-z][A-Za-z0-9_]*$/.test(name) ||
        !b ||
        ![b.min, b.max, b.max - b.min].every(Number.isFinite) ||
        b.min >= b.max
      )
        throw new ModelError(`미지수 '${name}'의 탐색 범위를 확인하세요.`)
    }
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
      ).filter((result) =>
        result.values.every((v, i) => {
          const b = ownBounds(options, result.variables[i])
          return b
            ? v >= b.min && v <= b.max
            : partial ||
                !options.searchBounds ||
                (v >= bounds.min && v <= bounds.max)
        }),
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
    if (prepared.nonsmooth && prepared.variables.length > 1)
      throw new ModelError(
        '비매끄러운 연립식의 미분 없는 다변수 탐색은 아직 지원하지 않습니다. 고정 조건을 분리하거나 단일 미지수 식으로 작성하세요.',
      )
    let bounds = boundsFor(
      options,
      prepared.variables.length === 1 ? prepared.variables[0] : undefined,
    )
    const solutions: SolveResult[] = []
    let attempts = 0,
      truncated = false
    const timedOut = () => performance.now() - start > TIME_BUDGET_MS
    const inBounds = (values: number[]) =>
      values.every((v, i) => {
        const b =
          prepared.variables.length === 1
            ? bounds
            : boundsFor(options, prepared.variables[i])
        return v >= b.min && v <= b.max
      })
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
    let window: SearchWindow | undefined
    let nonIsolated = false
    if (prepared.variables.length === 1) {
      const algebraic = algebraicCoefficients(prepared, parameters)
      const coefficients = algebraic?.coefficients
      const periodic =
        prepared.expression && !prepared.nonsmooth
          ? periodicFamily(
              prepared.expression,
              prepared.variables[0],
              { pi: Math.PI, e: Math.E, ...parameters },
              prepared.helpers,
            )
          : undefined
      const candidateWindow = periodic
        ? periodicWindow(periodic, bounds, prepared.variables[0])
        : undefined
      if (periodic && !candidateWindow)
        throw new ModelError(
          '위상이나 창 위치가 Float64의 안전한 분석 범위를 벗어났습니다. 탐색 중심 또는 주파수를 줄여 주세요.',
        )
      if (periodic && candidateWindow) {
        window = candidateWindow
        bounds = { min: window.min, max: window.max }
        method = '선형 위상 주기식 · 위상별 영점 열거'
        note =
          '분석한 위상에서 후보를 열거하고 원래 식을 수치 검증했습니다. Float64 위상 오차의 영향은 남고 수치 검증에서 일부 근은 누락될 수 있습니다. 범위 밖의 해와 일반 함수의 모든 해를 보장하지 않습니다.'
        if (window.requestedMax - window.requestedMin > window.maxWidth)
          note +=
            ' 근이 많아 탐색 창을 자동 축소했습니다. 최대 폭 이내에서 위치를 옮길 수 있습니다.'
        for (const phase of periodic.phases) {
          const q0 = Math.min(
              periodic.a * bounds.min + periodic.b,
              periodic.a * bounds.max + periodic.b,
            ),
            q1 = Math.max(
              periodic.a * bounds.min + periodic.b,
              periodic.a * bounds.max + periodic.b,
            )
          const k0 = Math.ceil(
              (q0 - phase) / periodic.period - 8 * Number.EPSILON,
            ),
            k1 = Math.floor((q1 - phase) / periodic.period + 8 * Number.EPSILON)
          for (let k = k0; k <= k1 && k - k0 < 64; k++) {
            const q = phase + k * periodic.period,
              value = (q - periodic.b) / periodic.a
            const residual = tryScalar(prepared.model, parameters, value)
            const phaseError =
              64 *
              Number.EPSILON *
              Math.max(1, Math.abs(q), Math.abs(periodic.b))
            if (
              residual !== undefined &&
              Math.abs(residual) / periodic.residualScale <=
                phaseError * Math.max(1, Math.abs(periodic.target))
            ) {
              add(scalarResult(prepared, parameters, value, options))
              attempts++
            }
          }
        }
      } else if (prepared.nonsmooth) {
        method = '비매끄러운 식 · 미분 없는 구간 탐색'
        note =
          '부호 구간과 절댓값의 국소 최솟값을 탐색했습니다. 접점 차수나 미분 기반 소멸을 판정하지 않습니다.'
        const found = derivativeFreeRoots(
          (x) => tryScalar(prepared.model, parameters, x),
          bounds,
        )
        nonIsolated = found.plateau
        truncated ||= found.truncated
        for (const x of found.roots) {
          add(scalarResult(prepared, parameters, x, options))
          attempts++
        }
        if (nonIsolated)
          note +=
            ' 0이 이어지는 구간을 관찰했습니다. 고립된 근 전체가 아니라 구간 해의 대표값을 표시합니다.'
      } else if (coefficients) {
        method = algebraic?.rational
          ? '유리식 분자 실근 분리 · 원래 식 검증'
          : '다항식 실근 분리 · 수치 검증'
        const isolated = findPolynomialRealRoots(
          coefficients,
          ownBounds(options, prepared.variables[0]) ??
            options.searchBounds ??
            (Object.keys(options.variableBounds ?? {}).length
              ? boundsFor(options, prepared.variables[0])
              : undefined),
        )
        bounds = { min: isolated.min, max: isolated.max }
        if (isolated.identicallyZero)
          throw new ModelError(
            '이 방정식은 미지수와 무관하게 0=0이 됩니다. 해를 특정할 독립적인 방정식이 필요합니다.',
          )
        for (const value of new Set([
          ...isolated.roots,
          ...factorCandidates(
            prepared,
            parameters,
            ownBounds(options, prepared.variables[0]) ??
              options.searchBounds ??
              (Object.keys(options.variableBounds ?? {}).length
                ? boundsFor(options, prepared.variables[0])
                : undefined),
          ),
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
            !(
              hasLocalVariation(prepared.model, parameters, value) ||
              (residual === 0 && !!squareFreeCoefficients(coefficients))
            )
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
            { length: 4097 },
            (_, index) =>
              bounds.min * (1 - index / 4096) + bounds.max * (index / 4096),
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
      for (const seed of systemSeeds(
        prepared.variables,
        prepared.variables.map((v) => boundsFor(options, v)),
      )) {
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
        ...(window ? { window } : {}),
        ...(nonIsolated ? { nonIsolated: true } : {}),
        variableBounds: Object.fromEntries(
          prepared.variables.map((v) => [v, boundsFor(options, v)]),
        ),
        attempts,
        note,
        ...(truncated ? { truncated: true } : {}),
      },
    }
  }) as AutomaticSolver
  const densityLimits = new Map<string, SearchWindow>()
  const normalizedSearch = ((source, parameters, options = {}) =>
    normalizedModelCall(source, Object.keys(parameters), (normalized) => {
      const variables = prepare(normalized, Object.keys(parameters)).variables
      const key = JSON.stringify([
        normalized,
        Object.entries(parameters).sort(([a], [b]) => a.localeCompare(b)),
      ])
      const previous = densityLimits.get(key)
      const requested = boundsFor(options, variables[0])
      let applied = options
      if (previous && requested.max - requested.min > previous.maxWidth) {
        const center = requested.min / 2 + requested.max / 2,
          b = {
            min: center - previous.maxWidth / 2,
            max: center + previous.maxWidth / 2,
          }
        applied = {
          ...options,
          variableBounds: { ...options.variableBounds, [variables[0]]: b },
        }
      }
      let found = search(normalized, parameters, applied)
      if (
        variables.length === 1 &&
        !found.search.window &&
        !found.search.nonIsolated &&
        found.search.truncated &&
        found.solutions.length === 32
      ) {
        const values = found.solutions.map((r) => r.values[0]),
          span = Math.max(...values) - Math.min(...values)
        const maxWidth = Math.min(
          (found.search.max - found.search.min) / 2,
          span * 0.7,
        )
        const center = found.search.min / 2 + found.search.max / 2
        if (maxWidth > 0 && Number.isFinite(maxWidth)) {
          const w: SearchWindow = {
            min: center - maxWidth / 2,
            max: center + maxWidth / 2,
            maxWidth,
            requestedMin: requested.min,
            requestedMax: requested.max,
            variable: variables[0],
            reason: 'density',
          }
          found = search(normalized, parameters, {
            ...options,
            variableBounds: { ...options.variableBounds, [variables[0]]: w },
          })
          if (densityLimits.size >= 16)
            densityLimits.delete(densityLimits.keys().next().value!)
          densityLimits.set(key, w)
          found.search.window = w
        }
      } else if (previous && !found.search.window)
        found.search.window = {
          ...previous,
          min: found.search.min,
          max: found.search.max,
          requestedMin: requested.min,
          requestedMax: requested.max,
        }
      if (found.search.window?.reason === 'density')
        found.search.note +=
          ' 발견한 근의 밀도로 탐색 창을 줄였습니다. 이 관찰만으로 모든 근의 발견을 보장하지 않습니다.'
      return found
    })) as AutomaticSolver
  normalizedSearch.solveNear = (source, parameters, seed, options) =>
    normalizedModelCall(source, Object.keys(parameters), (normalized) =>
      solveNear(normalized, parameters, seed, options),
    )
  return normalizedSearch
}
```

<a id="source-15"></a>

## src/engine/root-isolation.ts

원본: [src/engine/root-isolation.ts](../../src/engine/root-isolation.ts) · 41줄 · SHA-256: `6a22a9ef44f26f6fc6effcacc5b9bdb6772de193b47bd12015a4a6befe27a8d5`

```typescript
import type { SolveResult } from './index'

// An internal, process-local hint from the existing bounded-degree polynomial
// isolator, restricted to regular families with polynomial parameter
// coefficients and a fixed nonzero leading term. It is not serialized as a
// mathematical completeness certificate. Parameter-denominator poles, generic
// correctors and unverified candidates never receive this hint.
const uniquePolynomialRoots = new WeakSet<SolveResult>()
export type ParameterPathValidator = (
  from: Record<string, number>,
  to: Record<string, number>,
) => boolean
const parameterPathValidators = new WeakMap<
  SolveResult,
  ParameterPathValidator
>()

export function withParameterPathValidator(
  result: SolveResult,
  validator: ParameterPathValidator,
): SolveResult {
  parameterPathValidators.set(result, validator)
  return result
}

export function isParameterPathSafe(
  result: SolveResult,
  from: Record<string, number>,
  to: Record<string, number>,
): boolean {
  return parameterPathValidators.get(result)?.(from, to) ?? true
}

export function markUniquePolynomialRoot(result: SolveResult): SolveResult {
  uniquePolynomialRoots.add(result)
  return result
}

export function isUniquePolynomialRoot(result: SolveResult): boolean {
  return uniquePolynomialRoots.has(result)
}
```

<a id="source-16"></a>

## src/engine/conditioning.ts

원본: [src/engine/conditioning.ts](../../src/engine/conditioning.ts) · 117줄 · SHA-256: `b27323d78668576e581a83757c4cfbdf837bf190e9d21ca3b933494f9501848c`

```typescript
import { Matrix, SingularValueDecomposition } from 'ml-matrix'

export type ConditionNorm = 'infinity' | '2'
export type ConditionAssessment = {
  level: 'stable' | 'sensitive' | 'very-sensitive' | 'unavailable'
  label: string
  description: string
}
export const CONDITION_THRESHOLDS = {
  sensitive: 1e4,
  verySensitive: 1e8,
} as const

/** Heuristic sensitivity bands, not a guarantee about solution accuracy.
 * Input precision, units and the chosen norm must be considered separately. */
export function classifyCondition(value: number): ConditionAssessment {
  if (Number.isNaN(value) || value < 1)
    return {
      level: 'unavailable',
      label: '판정 불가',
      description:
        '조건수를 계산하지 못했습니다. 해와 잔차를 별도로 확인해 주세요.',
    }
  if (value >= CONDITION_THRESHOLDS.verySensitive)
    return {
      level: 'very-sensitive',
      label: '매우 민감',
      description:
        '입력값의 작은 오차가 해에 크게 증폭될 수 있습니다. 입력 정밀도와 단위·스케일을 점검하세요.',
    }
  if (value >= CONDITION_THRESHOLDS.sensitive)
    return {
      level: 'sensitive',
      label: '민감',
      description:
        '입력 오차가 증폭될 수 있습니다. 입력값의 유효숫자와 결과의 잔차를 함께 확인하세요.',
    }
  return {
    level: 'stable',
    label: '안정',
    description:
      '이 기준에서는 오차 증폭 가능성이 비교적 낮습니다. 실제 정확도는 입력 정밀도와 단위에도 좌우됩니다.',
  }
}

/** Condition numbers use the original coefficient matrix A, not the row-
 * equilibrated matrix used by the solver. A single global scalar keeps the
 * condition number unchanged while protecting very small and large inputs. */
export function conditionNumber(
  matrix: number[][],
  norm: ConditionNorm = 'infinity',
): number {
  if (norm !== 'infinity' && norm !== '2')
    throw new Error('지원하지 않는 조건수 norm입니다.')
  const n = matrix.length
  if (
    !n ||
    matrix.some(
      (row) => row.length !== n || row.some((value) => !Number.isFinite(value)),
    )
  ) {
    throw new Error('조건수에는 유한한 계수의 정방행렬이 필요합니다.')
  }
  const magnitude = Math.max(...matrix.flat().map(Math.abs))
  if (magnitude === 0) return Infinity
  const normalized = matrix.map((row) => row.map((value) => value / magnitude))
  if (norm === '2') {
    // Decompose A directly: forming AᵀA would square its condition number and
    // can erase the smallest singular value in a sensitive system.
    const svd = new SingularValueDecomposition(new Matrix(normalized), {
      computeLeftSingularVectors: false,
      computeRightSingularVectors: false,
      autoTranspose: true,
    })
    const singularValues = svd.diagonal
    if (
      singularValues.length !== n ||
      singularValues.some((value) => !Number.isFinite(value) || value < 0)
    ) {
      throw new Error('SVD에서 유효한 특이값을 얻지 못했습니다.')
    }
    const largest = Math.max(...singularValues),
      smallest = Math.min(...singularValues)
    if (smallest === 0) return Infinity
    const value = largest / smallest
    return Number.isFinite(value) ? Math.max(1, value) : Infinity
  }
  const matrixNorm = Math.max(
    ...normalized.map((row) =>
      row.reduce((sum, value) => sum + Math.abs(value), 0),
    ),
  )
  const a = normalized.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ])
  for (let k = 0; k < n; k++) {
    let pivot = k
    for (let row = k + 1; row < n; row++)
      if (Math.abs(a[row][k]) > Math.abs(a[pivot][k])) pivot = row
    if (a[pivot][k] === 0) return Infinity
    ;[a[k], a[pivot]] = [a[pivot], a[k]]
    const denominator = a[k][k]
    for (let col = 0; col < 2 * n; col++) a[k][col] /= denominator
    for (let row = 0; row < n; row++)
      if (row !== k) {
        const factor = a[row][k]
        for (let col = 0; col < 2 * n; col++) a[row][col] -= factor * a[k][col]
      }
  }
  const value =
    matrixNorm *
    Math.max(
      ...a.map((row) => row.slice(n).reduce((sum, v) => sum + Math.abs(v), 0)),
    )
  return Number.isFinite(value) ? Math.max(1, value) : Infinity
}
```

<a id="source-17"></a>

## src/engine/solver.wat

원본: [src/engine/solver.wat](../../src/engine/solver.wat) · 86줄 · SHA-256: `eb3870ccabab51dea4503da22ec3ddf17129ca711b5377e391078677542bb79b`

```wat
;; Dense Gaussian elimination with partial pivoting.
;; Input: row-normalized augmented n*(n+1) f64 matrix at byte 0.
;; Output: n f64 values at byte 65536. Status: 0 success, 1 rank deficient.
;; Caller validates finite entries and 1 <= n <= 64.
(module
  (memory (export "memory") 2)
  (func $addr (param $r i32) (param $c i32) (param $width i32) (result i32)
    (i32.mul (i32.add (i32.mul (local.get $r) (local.get $width)) (local.get $c)) (i32.const 8)))
  (func (export "solve") (param $n i32) (result i32)
    (local $w i32) (local $k i32) (local $i i32) (local $j i32) (local $pivot i32)
    (local $max f64) (local $v f64) (local $temp f64) (local $factor f64) (local $sum f64)
    (if (i32.or (i32.lt_s (local.get $n) (i32.const 1)) (i32.gt_s (local.get $n) (i32.const 64)))
      (then (return (i32.const 1))))
    (local.set $w (i32.add (local.get $n) (i32.const 1)))
    (local.set $k (i32.const 0))
    (block $done
      (loop $columns
        (br_if $done (i32.ge_s (local.get $k) (local.get $n)))
        (local.set $pivot (local.get $k))
        (local.set $max (f64.abs (f64.load (call $addr (local.get $k) (local.get $k) (local.get $w)))))
        (local.set $i (i32.add (local.get $k) (i32.const 1)))
        (block $found
          (loop $search
            (br_if $found (i32.ge_s (local.get $i) (local.get $n)))
            (local.set $v (f64.abs (f64.load (call $addr (local.get $i) (local.get $k) (local.get $w)))))
            (if (f64.gt (local.get $v) (local.get $max))
              (then (local.set $max (local.get $v)) (local.set $pivot (local.get $i))))
            (local.set $i (i32.add (local.get $i) (i32.const 1)))
            (br $search)))
        (if (f64.lt (local.get $max) (f64.const 1e-12))
          (then (return (i32.const 1))))
        (if (i32.ne (local.get $pivot) (local.get $k))
          (then
            (local.set $j (local.get $k))
            (block $swapped
              (loop $swap
                (br_if $swapped (i32.ge_s (local.get $j) (local.get $w)))
                (local.set $temp (f64.load (call $addr (local.get $k) (local.get $j) (local.get $w))))
                (f64.store (call $addr (local.get $k) (local.get $j) (local.get $w))
                  (f64.load (call $addr (local.get $pivot) (local.get $j) (local.get $w))))
                (f64.store (call $addr (local.get $pivot) (local.get $j) (local.get $w)) (local.get $temp))
                (local.set $j (i32.add (local.get $j) (i32.const 1)))
                (br $swap)))))
        (local.set $i (i32.add (local.get $k) (i32.const 1)))
        (block $eliminated
          (loop $rows
            (br_if $eliminated (i32.ge_s (local.get $i) (local.get $n)))
            (local.set $factor
              (f64.div (f64.load (call $addr (local.get $i) (local.get $k) (local.get $w)))
                       (f64.load (call $addr (local.get $k) (local.get $k) (local.get $w)))))
            (f64.store (call $addr (local.get $i) (local.get $k) (local.get $w)) (f64.const 0))
            (local.set $j (i32.add (local.get $k) (i32.const 1)))
            (block $updated
              (loop $entries
                (br_if $updated (i32.ge_s (local.get $j) (local.get $w)))
                (f64.store (call $addr (local.get $i) (local.get $j) (local.get $w))
                  (f64.sub
                    (f64.load (call $addr (local.get $i) (local.get $j) (local.get $w)))
                    (f64.mul (local.get $factor) (f64.load (call $addr (local.get $k) (local.get $j) (local.get $w))))))
                (local.set $j (i32.add (local.get $j) (i32.const 1)))
                (br $entries)))
            (local.set $i (i32.add (local.get $i) (i32.const 1)))
            (br $rows)))
        (local.set $k (i32.add (local.get $k) (i32.const 1)))
        (br $columns)))
    (local.set $i (i32.sub (local.get $n) (i32.const 1)))
    (block $solved
      (loop $back
        (br_if $solved (i32.lt_s (local.get $i) (i32.const 0)))
        (local.set $sum (f64.load (call $addr (local.get $i) (local.get $n) (local.get $w))))
        (local.set $j (i32.add (local.get $i) (i32.const 1)))
        (block $summed
          (loop $terms
            (br_if $summed (i32.ge_s (local.get $j) (local.get $n)))
            (local.set $sum
              (f64.sub (local.get $sum)
                (f64.mul (f64.load (call $addr (local.get $i) (local.get $j) (local.get $w)))
                         (f64.load (i32.add (i32.const 65536) (i32.mul (local.get $j) (i32.const 8)))))))
            (local.set $j (i32.add (local.get $j) (i32.const 1)))
            (br $terms)))
        (f64.store (i32.add (i32.const 65536) (i32.mul (local.get $i) (i32.const 8)))
          (f64.div (local.get $sum) (f64.load (call $addr (local.get $i) (local.get $i) (local.get $w)))))
        (local.set $i (i32.sub (local.get $i) (i32.const 1)))
        (br $back)))
    (i32.const 0))
)
```

<a id="source-18"></a>

## scripts/build-wasm.mjs

원본: [scripts/build-wasm.mjs](../../scripts/build-wasm.mjs) · 17줄 · SHA-256: `8dbf55cad6945296040e60dc1a0aba076e89c7c5534a5931cf3395d4eff374e4`

```javascript
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import wabtFactory from 'wabt'

const root = new URL('../', import.meta.url)
const wabt = await wabtFactory()
const source = await readFile(new URL('src/engine/solver.wat', root), 'utf8')
const module = wabt.parseWat('solver.wat', source)
module.resolveNames()
module.validate()
const { buffer } = module.toBinary({ log: false, write_debug_names: true })
await mkdir(new URL('public/', root), { recursive: true })
await writeFile(new URL('public/solver.wasm', root), buffer)
module.destroy()
console.log(
  `Built ${fileURLToPath(new URL('public/solver.wasm', root))} (${buffer.length} bytes)`,
)
```
