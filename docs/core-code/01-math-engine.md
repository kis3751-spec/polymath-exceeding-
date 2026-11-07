# 01 · 수식 파싱과 수치해석 엔진

입력 문자열을 계산 가능한 식으로 바꾸고 실수 해를 구하는 실제 코드입니다. 선형식과 비선형식의 파서는 문자열을 임의 JavaScript로 실행하지 않고, 허용한 문법과 함수로 해석합니다.

선형식은 계수 행렬로 바꾸어 부분 피벗팅 가우스 소거법으로 풉니다. 비선형식은 잔차 평가, 구간 이분법·Newton 보정, 자동 다항식 실근 분리·여러 시작점 탐색을 조합합니다. `conditioning.ts`는 ∞-norm과 직접 SVD에 의한 2-norm 조건수 및 참고 민감도 분류를 담당합니다.

`solver.wat`는 실제 WebAssembly 선형 커널의 원문이며, `build-wasm.mjs`가 이를 컴파일합니다. 브라우저에서 WASM을 사용할 수 없으면 소스에 있는 JavaScript 대체 경로로 전환합니다. 단일근 계산과 함수 평가는 JavaScript 경로도 사용합니다.

일반 비선형식에 대한 유한한 수치 탐색은 모든 실근의 발견이나 가지의 수학적 동일성을 증명하지 않습니다. 해의 존재 범위, 잔차, 조건수와 추적 실패를 함께 확인해야 합니다.

## 읽는 방법

아래 코드 블록은 표시한 원본 파일의 전체 내용을 그대로 복사한 읽기용 묶음입니다. 요약용 의사 코드나 별도의 구현이 아니며, 모듈의 import 경로는 원래 프로젝트 구조를 따릅니다. 이 Markdown을 하나의 TypeScript 파일로 바꾸어 실행하는 용도는 아닙니다. 실행은 저장소에서 `npm ci`와 `npm run dev`를 사용합니다.

원본을 수정한 뒤 `npm run docs:core`로 다시 만들고, `npm run docs:core -- --check`로 문서와 현재 소스가 같은지 확인할 수 있습니다. 각 파일의 SHA-256은 원문 일치 확인용이며 생성 시각을 넣지 않아 같은 소스에서 같은 문서를 만듭니다.

소스 묶음 SHA-256: `891c7f82d4a9abfc414f6c2dae0dddedd11bf293299f08cf742c872678272b2e`

## 다른 코드 묶음

- [01 · 수식 파싱과 수치해석 엔진](./01-math-engine.md) · 현재 문서
- [02 · 상태 관리, 분기 추적과 비동기 계산](./02-state-and-simulation.md)
- [03 · 그래프, 마우스 조작과 화면 표현](./03-chart-and-interaction.md)

## 포함한 원본

- [src/engine/index.ts](#source-1) · [저장소 원본](../../src/engine/index.ts)
- [src/engine/nonlinear-parser.ts](#source-2) · [저장소 원본](../../src/engine/nonlinear-parser.ts)
- [src/engine/nonlinear.ts](#source-3) · [저장소 원본](../../src/engine/nonlinear.ts)
- [src/engine/automatic-polynomial.ts](#source-4) · [저장소 원본](../../src/engine/automatic-polynomial.ts)
- [src/engine/automatic.ts](#source-5) · [저장소 원본](../../src/engine/automatic.ts)
- [src/engine/conditioning.ts](#source-6) · [저장소 원본](../../src/engine/conditioning.ts)
- [src/engine/solver.wat](#source-7) · [저장소 원본](../../src/engine/solver.wat)
- [scripts/build-wasm.mjs](#source-8) · [저장소 원본](../../scripts/build-wasm.mjs)

<a id="source-1"></a>

## src/engine/index.ts

원본: [src/engine/index.ts](../../src/engine/index.ts) · 531줄 · SHA-256: `5a496963bfe8b8e6cee21e4d5c4b64c13c3f6bd30c564387594fe0ea3fd30c17`

```typescript
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
  id: string
  label: string
  result: SolveResult | null
  error?: string
  sweep: SweepPoint[]
  dataset: SweepPoint[]
  datasetError?: string
  sweepName: string
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
    while (
      at('*') ||
      at('/') ||
      (tokens[index]?.kind === 'name' && tokens[index - 1]?.kind === 'number')
    ) {
      const implicit = tokens[index]?.kind === 'name'
      const op = implicit ? '*' : tokens[index++].text
      node = { kind: 'binary', op, left: node, right: unary() }
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
  return (source, parameters, options = {}) => {
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
}
```

<a id="source-2"></a>

## src/engine/nonlinear-parser.ts

원본: [src/engine/nonlinear-parser.ts](../../src/engine/nonlinear-parser.ts) · 555줄 · SHA-256: `7423335394dc4c3d84a17116e60290c351602a38aa42b5f625217dd5bc2db648`

```typescript
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
          const fn = Object.hasOwn(FUNCTIONS, token.text)
            ? FUNCTIONS[token.text]
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
          return { kind: 'call', name: token.text, args }
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
    const root = /^f\(\s*([A-Za-z][A-Za-z0-9_]*)\s*\)$/.exec(left)
    const condition = /^([A-Za-z][A-Za-z0-9_]*)\(\s*(min|max|0)\s*\)$/.exec(
      left,
    )
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

## src/engine/nonlinear.ts

원본: [src/engine/nonlinear.ts](../../src/engine/nonlinear.ts) · 425줄 · SHA-256: `b8acb70411c730d40562281fda944711778f317cebf860ea1d82a8a78b92389b`

```typescript
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
function jacobian(evaluate: Evaluator, values: number[], base: number[]) {
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
): IterationResult {
  let values = [...model.guesses!]
  const variableScales = values.map((value) => Math.abs(value) || 1)
  const stepScale = (value: number, index: number) =>
    Math.max(Math.abs(value), variableScales[index] * 1e-6, 1e-300)
  let evaluation = evaluate(values)
  let matrix = jacobian(evaluate, values, evaluation.residuals)
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
    matrix = jacobian(evaluate, values, evaluation.residuals)
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
  return (source, parameters, options = {}) => {
    const start = performance.now()
    const conditionNorm = options.conditionNorm ?? 'infinity'
    if (conditionNorm !== 'infinity' && conditionNorm !== '2')
      throw new ModelError('조건수 계산 방법을 확인해 주세요.')
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
    let solved: IterationResult
    let matrix: number[][]
    try {
      solved = scalar ? bisect(model, evaluate) : newton(model, evaluate, wasm)
      matrix =
        solved.matrix ??
        jacobian(evaluate, solved.values, solved.evaluation.residuals)
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
      method: scalar ? '구간 이분법' : '감쇠 Newton · 수치 Jacobian',
      durationMs: performance.now() - start,
      warnings,
    }
  }
}
```

<a id="source-4"></a>

## src/engine/automatic-polynomial.ts

원본: [src/engine/automatic-polynomial.ts](../../src/engine/automatic-polynomial.ts) · 295줄 · SHA-256: `0126420adadfa7c98ad754c08456f0aebb472556a63fe3c0eee28928626330c9`

```typescript
import {
  evaluateNonlinearExpression,
  type NonlinearNode,
} from './nonlinear-parser'

const MAX_DEGREE = 12

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
  const original = trim(coefficients)
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
```

<a id="source-5"></a>

## src/engine/automatic.ts

원본: [src/engine/automatic.ts](../../src/engine/automatic.ts) · 703줄 · SHA-256: `25646f8a095eb959f37cbd404676a339fb63e2929b3f583f76e085aacf48d18a`

```typescript
import { conditionNumber } from './conditioning'
import { ModelError, type SolveResult, type SolverOptions } from './index'
import { createNonlinearSolver } from './nonlinear'
import {
  compileNonlinear,
  parseNonlinearExpression,
  type CompiledModel,
  type NonlinearNode,
} from './nonlinear-parser'
import {
  findPolynomialRealRoots,
  polynomialCoefficients,
} from './automatic-polynomial'

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
    .filter(({ text }) => text && !CONDITION.test(text))
  if (!lines.length) throw new ModelError('계산할 방정식을 입력하세요.')
  const explicit = lines.some(({ text }) => ROOT.test(text))
  const variables: string[] = []
  const helpers = new Map<string, NonlinearNode>()
  let expression: NonlinearNode | undefined
  let canonical: string
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
    variables: model.variables,
    model,
    expression,
    helpers,
  }
  if (preparedCache.size >= 16)
    preparedCache.delete(preparedCache.keys().next().value!)
  preparedCache.set(key, prepared)
  return prepared
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
  const duplicate = solutions.some((other) => sameSolution(result, other))
  if (duplicate) return false
  solutions.push(result)
  return true
}
function sameSolution(result: SolveResult, other: SolveResult) {
  return result.values.every(
    (value, i) =>
      Math.abs(value - other.values[i]) <=
      2e-7 *
        Math.max(Number.MIN_VALUE, Math.abs(value), Math.abs(other.values[i])),
  )
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
      const refined = scalarNear(prepared, parameters, values[0])
      return scalarResult(
        prepared,
        parameters,
        refined.value,
        options,
        refined.iterations,
      )
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
      const constants = { pi: Math.PI, e: Math.E, ...parameters }
      const coefficients = prepared.expression
        ? polynomialCoefficients(
            prepared.expression,
            prepared.variables[0],
            constants,
            prepared.helpers,
          )
        : null
      if (coefficients) {
        method = '다항식 실근 분리 · 수치 검증'
        const isolated = findPolynomialRealRoots(
          coefficients,
          options.searchBounds,
        )
        bounds = { min: isolated.min, max: isolated.max }
        if (isolated.identicallyZero)
          throw new ModelError(
            '이 방정식은 미지수와 무관하게 0=0이 됩니다. 해를 특정할 독립적인 방정식이 필요합니다.',
          )
        for (const value of isolated.roots) {
          attempts++
          let slope = 0
          for (let i = coefficients.length - 1; i > 0; i--)
            slope = slope * value + i * coefficients[i]
          const residual = tryScalar(prepared.model, parameters, value)
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
              !smallLocalResidual(prepared.model, parameters, value, residual))
          )
            continue
          add(scalarResult(prepared, parameters, value, options, 0, slope))
        }
        note =
          '다항식의 계수에서 계산한 범위에서 실근을 수치적으로 분리·검증했습니다. 반올림과 중근의 영향으로 수치적 완전성을 보장하지 않습니다.'
      } else {
        method = '구간 분할 · 다중 시작점 Newton'
        note =
          '표시한 범위 안에서 여러 구간과 시작점으로 유한한 실근을 탐색했습니다. 범위 밖의 해, 가까운 중근 또는 일부 해는 누락될 수 있습니다.'
        const count = 2048
        const grid = Array.from(
          { length: count + 1 },
          (_, index) =>
            bounds.min * (1 - index / count) + bounds.max * (index / count),
        )
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
  search.solveNear = solveNear
  return search
}
```

<a id="source-6"></a>

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

<a id="source-7"></a>

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

<a id="source-8"></a>

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
