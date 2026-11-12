# 04 · 미분방정식·회귀·적분·최적화

ODE·회귀·표 기반 적분·제약/최소제곱 최적화의 실제 실행 코드와 별도 Worker, 작업 화면입니다. 기존 방정식 입력을 유지하면서 데이터 표·초기조건·목적함수 문법을 확장했습니다.

ODE는 적응 RK45와 음해법, 회귀는 정규화 direct SVD와 Levenberg–Marquardt, 적분은 조각별 보간 다항식 적분, 최적화는 투영 BFGS와 증강 Lagrangian을 사용합니다. 초기값·강성·조건수·국소 수렴·보간 가정의 한계를 결과와 문서에 남깁니다.

ScientificWorkspace는 모델·시뮬레이션·리포트를 분리하고, 시간 재생·위상 그래프·상수 조절·표·CSV·프로젝트 JSON·Markdown 리포트를 연결합니다. 새로운 요청은 이전 Worker를 종료해 낡은 응답과 불필요한 계산을 방지합니다.

## 읽는 방법

아래 코드 블록은 표시한 원본 파일의 전체 내용을 그대로 복사한 읽기용 묶음입니다. 요약용 의사 코드나 별도의 구현이 아니며, 모듈의 import 경로는 원래 프로젝트 구조를 따릅니다. 이 Markdown을 하나의 TypeScript 파일로 바꾸어 실행하는 용도는 아닙니다. 실행은 저장소에서 `npm ci`와 `npm run dev`를 사용합니다.

원본을 수정한 뒤 `npm run docs:core`로 다시 만들고, `npm run docs:core -- --check`로 문서와 현재 소스가 같은지 확인할 수 있습니다. 각 파일의 SHA-256은 원문 일치 확인용이며 생성 시각을 넣지 않아 같은 소스에서 같은 문서를 만듭니다.

소스 묶음 SHA-256: `2b8a57213e01c55a1e40a92c8bba8dface8ad5ab5094a73bbdee406f5e32ab5b`

## 다른 코드 묶음

- [01 · 수식 파싱과 수치해석 엔진](./01-math-engine.md)
- [02 · 상태 관리, 분기 추적과 비동기 계산](./02-state-and-simulation.md)
- [03 · 그래프, 마우스 조작과 화면 표현](./03-chart-and-interaction.md)
- [04 · 미분방정식·회귀·적분·최적화](./04-scientific-modules.md) · 현재 문서

## 포함한 원본

- [src/engine/scientific/types.ts](#source-1) · [저장소 원본](../../src/engine/scientific/types.ts)
- [src/engine/scientific/data.ts](#source-2) · [저장소 원본](../../src/engine/scientific/data.ts)
- [src/engine/scientific/expression.ts](#source-3) · [저장소 원본](../../src/engine/scientific/expression.ts)
- [src/engine/scientific/catalog.ts](#source-4) · [저장소 원본](../../src/engine/scientific/catalog.ts)
- [src/engine/scientific/ode.ts](#source-5) · [저장소 원본](../../src/engine/scientific/ode.ts)
- [src/engine/scientific/ode-examples.ts](#source-6) · [저장소 원본](../../src/engine/scientific/ode-examples.ts)
- [src/engine/scientific/fitting.ts](#source-7) · [저장소 원본](../../src/engine/scientific/fitting.ts)
- [src/engine/scientific/statistics.ts](#source-8) · [저장소 원본](../../src/engine/scientific/statistics.ts)
- [src/engine/scientific/fitting-examples.ts](#source-9) · [저장소 원본](../../src/engine/scientific/fitting-examples.ts)
- [src/engine/scientific/integration.ts](#source-10) · [저장소 원본](../../src/engine/scientific/integration.ts)
- [src/engine/scientific/integration-examples.ts](#source-11) · [저장소 원본](../../src/engine/scientific/integration-examples.ts)
- [src/engine/scientific/optimization.ts](#source-12) · [저장소 원본](../../src/engine/scientific/optimization.ts)
- [src/engine/scientific/optimization-examples.ts](#source-13) · [저장소 원본](../../src/engine/scientific/optimization-examples.ts)
- [src/engine/scientific/worker.ts](#source-14) · [저장소 원본](../../src/engine/scientific/worker.ts)
- [vite.config.ts](#source-15) · [저장소 원본](../../vite.config.ts)
- [src/components/ScientificWorkspace.tsx](#source-16) · [저장소 원본](../../src/components/ScientificWorkspace.tsx)
- [src/components/ScientificWorkspace.css](#source-17) · [저장소 원본](../../src/components/ScientificWorkspace.css)
- [src/components/ScientificChart.tsx](#source-18) · [저장소 원본](../../src/components/ScientificChart.tsx)
- [src/components/ScientificChart.css](#source-19) · [저장소 원본](../../src/components/ScientificChart.css)
- [src/components/scientific-chart-geometry.ts](#source-20) · [저장소 원본](../../src/components/scientific-chart-geometry.ts)
- [src/components/ScientificOutput.tsx](#source-21) · [저장소 원본](../../src/components/ScientificOutput.tsx)
- [src/components/RegressionResult.tsx](#source-22) · [저장소 원본](../../src/components/RegressionResult.tsx)
- [src/components/RegressionResult.css](#source-23) · [저장소 원본](../../src/components/RegressionResult.css)
- [src/components/RegressionResidualPlot.tsx](#source-24) · [저장소 원본](../../src/components/RegressionResidualPlot.tsx)
- [src/components/PolynomialComparison.tsx](#source-25) · [저장소 원본](../../src/components/PolynomialComparison.tsx)
- [src/regression-report.ts](#source-26) · [저장소 원본](../../src/regression-report.ts)

<a id="source-1"></a>

## src/engine/scientific/types.ts

원본: [src/engine/scientific/types.ts](../../src/engine/scientific/types.ts) · 108줄 · SHA-256: `705207290c0dfae8fe5f377f0a5dcbebcd1ad0771c1dbd3caa33e0daa3a6e1c9`

```typescript
export type ScientificModule =
  | 'ode'
  | 'curve-fit'
  | 'multilinear'
  | 'nonlinear-fit'
  | 'integration'
  | 'optimization'
  | 'lsq'
export type ScientificOptions = {
  tolerance?: number
  maxIterations?: number
  samples?: number
  degree?: number
  method?: string
  compareDegrees?: number[]
}
export type ScientificRequest = {
  module: ScientificModule
  source: string
  parameters?: Record<string, number>
  options?: ScientificOptions
}
export type ScientificSeries = {
  name: string
  x: number[]
  y: number[]
  style?: 'line' | 'points'
  axisLabel?: string
  color?: string
}
export type ScientificMetric = {
  label: string
  value: number | string
  detail: string
}
export type ScientificCoefficient = {
  name: string
  estimate: number
  standardError?: number
  confidence95?: { lower: number; upper: number; halfWidth: number }
  fixed?: boolean
  note?: string
}
export type RegressionDiagnostics = {
  model: string
  sampleCount: number
  parameterCount: number
  degreesOfFreedom: number
  rank?: number
  origin: boolean
  confidenceMethod: 'linear-normal' | 'nonlinear-local'
  confidenceUnavailableReason?: string
  degree?: number
  crossValidation?: { rmse?: number; unavailableReason?: string }
}
export type PolynomialCandidate = {
  degree: number
  status: 'completed' | 'unavailable'
  metrics?: ScientificMetric[]
  curve?: ScientificSeries
  residuals?: ScientificSeries
  crossValidation?: { rmse?: number; unavailableReason?: string }
  warnings?: string[]
  reason?: string
}
export type PolynomialComparison = {
  independent: string
  dependent: string
  origin: boolean
  observed: ScientificSeries
  candidates: PolynomialCandidate[]
  recommendedDegree?: number
}
export type ScientificResult = {
  module: ScientificModule
  method: string
  status: 'converged' | 'completed' | 'stopped'
  message?: string
  columns: string[]
  rows: number[][]
  series: ScientificSeries[]
  values: Record<string, number>
  metrics: ScientificMetric[]
  warnings: string[]
  iterations?: number
  evaluations?: number
  durationMs: number
  formula?: string
  coefficients?: ScientificCoefficient[]
  regression?: RegressionDiagnostics
  residuals?: {
    values: number[]
    predictors: { name: string; values: number[] }[]
  }
  polynomialComparison?: PolynomialComparison
  comparison?: {
    observed: number[]
    predicted: number[]
    dependent: string
  }
  integration?: {
    from: number
    to: number
    independent: string
    dependent: string
    value: number
  }
}
```

<a id="source-2"></a>

## src/engine/scientific/data.ts

원본: [src/engine/scientific/data.ts](../../src/engine/scientific/data.ts) · 84줄 · SHA-256: `df9d94753329a960dc340238267d63917815e5739aaea9108762b8d8c354f3fc`

```typescript
import { isNonlinearFunction } from '../nonlinear-parser'
import { ModelError } from '../index'

export type ScientificTable = {
  columns: string[]
  rows: number[][]
  remainingLines: string[]
}
const numeric = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/
const fields = (text: string) =>
  text
    .trim()
    .split(/[\s,;]+/)
    .filter(Boolean)

/** Embedded [table] shared by regression, LSQ and discrete integration. */
export function parseDataTable(source: string): ScientificTable {
  if (source.length > 500_000)
    throw new ModelError('모델은 500,000자 이내로 입력하세요.')
  const lines = source.replace(/\r\n?/g, '\n').replace(/−/g, '-').split('\n')
  const remainingLines: string[] = [],
    columns: string[] = [],
    rows: number[][] = []
  let inside = false,
    seen = false,
    closed = false
  lines.forEach((raw, index) => {
    const text = raw.split('#')[0].trim()
    if (text === '[') {
      if (seen)
        throw new ModelError('데이터 표는 한 개만 입력하세요.', index + 1)
      seen = inside = true
      return
    }
    if (text === ']') {
      if (!inside)
        throw new ModelError('데이터 표의 시작 [가 없습니다.', index + 1)
      inside = false
      closed = true
      return
    }
    if (!inside) {
      if (text) remainingLines.push(text)
      return
    }
    if (!text) return
    const cells = fields(text)
    if (!columns.length) {
      if (
        !cells.length ||
        cells.length > 32 ||
        cells.some(
          (name) =>
            !/^[A-Za-z][A-Za-z0-9_]*$/.test(name) ||
            isNonlinearFunction(name) ||
            ['pi', 'e'].includes(name),
        ) ||
        new Set(cells).size !== cells.length
      )
        throw new ModelError(
          '표의 열 이름은 중복 없는 영문 변수명으로 최대 32개까지 입력하세요.',
          index + 1,
        )
      columns.push(...cells)
    } else {
      if (
        cells.length !== columns.length ||
        cells.some((x) => !numeric.test(x) || !Number.isFinite(Number(x)))
      )
        throw new ModelError(
          `각 데이터 행에 유한한 숫자 ${columns.length}개가 필요합니다. 소수점은 .을 사용하세요.`,
          index + 1,
        )
      rows.push(cells.map(Number))
      if (rows.length > 5000)
        throw new ModelError('데이터는 최대 5,000행까지 계산합니다.', index + 1)
    }
  })
  if (inside || (seen && !closed))
    throw new ModelError('데이터 표를 ]로 닫아 주세요.')
  if (seen && (!columns.length || !rows.length))
    throw new ModelError('표에는 열 이름과 최소 한 행의 숫자가 필요합니다.')
  return { columns, rows, remainingLines }
}
```

<a id="source-3"></a>

## src/engine/scientific/expression.ts

원본: [src/engine/scientific/expression.ts](../../src/engine/scientific/expression.ts) · 75줄 · SHA-256: `1ab99cd603df3bd295df23da8463e6332f8208763f17e31e704083fb9f029772`

```typescript
import { ModelError } from '../index'
import {
  parseNonlinearExpression,
  evaluateNonlinearExpression,
  isNonlinearFunction,
} from '../nonlinear-parser'

export function compileExpression(text: string, line = 1) {
  const expression = parseNonlinearExpression(text, line)
  return {
    references: expression.references,
    evaluate(scope: Record<string, number>) {
      return evaluateNonlinearExpression(
        expression,
        new Map([['pi', Math.PI], ['e', Math.E], ...Object.entries(scope)]),
      )
    },
  }
}

/** Order-independent explicit helper equations; externally adjusted constants
 * replace numeric definitions, never state variables or derived expressions. */
export function compileAssignments(
  lines: string[],
  options: { reserved?: string[]; parameters?: Record<string, number> } = {},
) {
  const defs = new Map<string, ReturnType<typeof compileExpression>>()
  const overrides = options.parameters ?? {}
  for (const [i, raw] of lines.entries()) {
    const text = raw.split('#')[0].trim()
    if (!text) continue
    const m = /^([A-Za-z][A-Za-z0-9_]*)\s*=\s*(.+)$/.exec(text)
    if (!m)
      throw new ModelError('보조식은 이름 = 수식 형태로 입력하세요.', i + 1)
    const name = m[1]
    if (
      defs.has(name) ||
      options.reserved?.includes(name) ||
      isNonlinearFunction(name) ||
      ['pi', 'e'].includes(name)
    )
      throw new ModelError(
        `중복되거나 사용할 수 없는 보조식 이름 '${name}'입니다.`,
        i + 1,
      )
    const expression = compileExpression(m[2], i + 1)
    if (Object.hasOwn(overrides, name) && expression.references.size === 0) {
      if (!Number.isFinite(overrides[name]))
        throw new ModelError('파라미터는 유한한 숫자여야 합니다.')
      defs.set(name, compileExpression(String(overrides[name]), i + 1))
    } else defs.set(name, expression)
  }
  const order: string[] = [],
    visited = new Set<string>(),
    active = new Set<string>()
  const walk = (name: string) => {
    if (visited.has(name)) return
    if (active.has(name))
      throw new ModelError(`보조식 '${name}'에 순환 참조가 있습니다.`)
    active.add(name)
    for (const dep of defs.get(name)!.references) if (defs.has(dep)) walk(dep)
    active.delete(name)
    visited.add(name)
    order.push(name)
  }
  for (const name of defs.keys()) walk(name)
  return {
    names: order,
    evaluate(scope: Record<string, number> = {}) {
      const values = { ...scope }
      for (const name of order) values[name] = defs.get(name)!.evaluate(values)
      return values
    },
  }
}
```

<a id="source-4"></a>

## src/engine/scientific/catalog.ts

원본: [src/engine/scientific/catalog.ts](../../src/engine/scientific/catalog.ts) · 38줄 · SHA-256: `d85d63740f42a70a3139b46d4b1297c60d8309eeed8e7b2731cb7617e933f4e9`

```typescript
import type { ScientificModule } from './types'
import { odeExamples } from './ode-examples'
import { fittingExamples } from './fitting-examples'
import { optimizationExamples } from './optimization-examples'
import { integrationExamples } from './integration-examples'
export type ScientificExample = {
  title: string
  module: ScientificModule
  source: string
  description: string
}
export const scientificTitles: Record<ScientificModule, string> = {
  ode: 'Differential Equations',
  'curve-fit': 'Curve Fitting',
  multilinear: 'Multilinear Regression',
  'nonlinear-fit': 'Nonlinear Regression',
  integration: 'Discrete Integration',
  optimization: 'Constrained Optimization',
  lsq: 'LSQ Optimization',
}
export const scientificDescriptions: Record<ScientificModule, string> = {
  ode: '초기 상태에서 출발해 시간에 따른 변화를 계산합니다.',
  'curve-fit': '관측 데이터에 선형·다항식 모델을 맞춥니다.',
  multilinear: '여러 설명 변수가 관측값에 미치는 영향을 추정합니다.',
  'nonlinear-fit': '관측 데이터에서 비선형 모델의 계수를 추정합니다.',
  integration: '측정된 데이터 사이의 면적과 누적량을 계산합니다.',
  optimization: '목적함수와 제약조건을 함께 만족하는 국소 최적점을 탐색합니다.',
  lsq: '범위·제약조건 안에서 관측값과 모델 차이의 제곱합을 줄입니다.',
}
export const getModuleExamples = (
  module: ScientificModule,
): ScientificExample[] =>
  [
    ...odeExamples,
    ...fittingExamples,
    ...optimizationExamples,
    ...integrationExamples,
  ].filter((x) => x.module === module) as ScientificExample[]
```

<a id="source-5"></a>

## src/engine/scientific/ode.ts

원본: [src/engine/scientific/ode.ts](../../src/engine/scientific/ode.ts) · 715줄 · SHA-256: `e7a73e0c2903c87457f99542ecd1e20914d1dca406708db77b27a00222ab10ee`

````typescript
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
````

<a id="source-6"></a>

## src/engine/scientific/ode-examples.ts

원본: [src/engine/scientific/ode-examples.ts](../../src/engine/scientific/ode-examples.ts) · 51줄 · SHA-256: `99137fd179d1cfc1dbc17a4e71c02c3f4d82284121ba5142e0268c7b6060bbf2`

```typescript
export const odeExamples = [
  {
    title: '순차 반응 A → B → C',
    module: 'ode' as const,
    description:
      '반응 속도와 총 농도 보조식을 함께 계산합니다. k1·k2를 바꾸어 중간 생성물 B의 최대값과 반응 시간을 비교하세요.',
    source: `d(A)/d(t) = -r1
d(B)/d(t) = r1-r2
d(C)/d(t) = r2
r1 = k1*A
r2 = k2*B
Total = A+B+C
k1 = 1
k2 = 0.5
A(0) = 1
B(0) = 0
C(0) = 0
t|0:10`,
  },
  {
    title: '감쇠 진동자의 위치와 속도',
    module: 'ode' as const,
    description:
      '위치 x와 속도 v를 동시에 적분합니다. 감쇠비 zeta가 커질 때 과도 응답과 위상 궤적이 어떻게 달라지는지 확인하세요.',
    source: `x' = v
v' = -2*zeta*omega*v-omega^2*x
Energy = (v^2+omega^2*x^2)/2
zeta = 0.1
omega = 2
x|1
v|0
t|0:12`,
  },
  {
    title: 'Robertson 강성 반응계',
    module: 'ode' as const,
    description:
      '속도 척도가 크게 다른 고전적인 강성 화학 반응 예제입니다. 자동 또는 암시적 해법을 사용하고 총 몰분율 A+B+C를 점검하세요.',
    source: `d(A)/d(t) = -k1*A+k2*B*C
d(B)/d(t) = k1*A-k2*B*C-k3*B^2
d(C)/d(t) = k3*B^2
Total = A+B+C
k1 = 0.04
k2 = 10000
k3 = 30000000
A(0) = 1
B(0) = 0
C(0) = 0
t|0:1`,
  },
]
```

<a id="source-7"></a>

## src/engine/scientific/fitting.ts

원본: [src/engine/scientific/fitting.ts](../../src/engine/scientific/fitting.ts) · 1,144줄 · SHA-256: `955d1048958025cdbc407d5eb95d9e8b8276159dee0bcd888ade6b10ca664a9c`

```typescript
import { Matrix, SingularValueDecomposition } from 'ml-matrix'
import { ModelError } from '../index'
import { parseNonlinearExpression } from '../nonlinear-parser'
import { evaluateDual, type Dual } from '../expression-derivative'
import { preprocessSolverSource } from '../preprocessor'
import { compileAssignments, compileExpression } from './expression'
import { parseDataTable } from './data'
import { coefficientConfidence95, studentTCritical95 } from './statistics'
import type {
  ScientificCoefficient,
  ScientificMetric,
  ScientificRequest,
  ScientificResult,
  ScientificSeries,
  PolynomialCandidate,
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
      label: 'Max absolute error',
      value: Math.max(...residuals.map(Math.abs)),
      detail: '입력한 데이터 점 중 예측값과 가장 크게 벌어진 점의 차이입니다.',
    },
    {
      label: 'Degrees of freedom',
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
      label: 'Adjusted R²',
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
/** PRESS / leave-one-out errors for a full-rank linear least-squares fit.
 * Scaling the columns leaves the hat matrix unchanged. A unit leverage means
 * removing that row makes the fit unidentified, not a zero validation error. */
function leaveOneOut(
  svd: SingularValueDecomposition,
  residuals: number[],
  p: number,
  yScale: number,
): { rmse?: number; unavailableReason?: string } {
  if (residuals.length <= p)
    return {
      unavailableReason: '관측 행 수가 계수 수보다 커야 LOOCV를 계산합니다.',
    }
  const u = svd.leftSingularVectors
  const errors: number[] = []
  for (let i = 0; i < residuals.length; i++) {
    const leverage = sum(Array.from({ length: p }, (_, k) => u.get(i, k) ** 2))
    const denominator = 1 - leverage
    if (denominator <= 128 * Number.EPSILON * Math.max(residuals.length, p))
      return {
        unavailableReason:
          '한 행을 제외하면 랭크가 부족하거나 수치적으로 불안정해 LOOCV를 산정하지 않았습니다.',
      }
    errors.push(residuals[i] / yScale / denominator)
  }
  const rmse = (magnitude(errors) / Math.sqrt(errors.length)) * yScale
  return Number.isFinite(rmse)
    ? { rmse }
    : { unavailableReason: 'LOOCV 오차가 Float64 범위를 넘었습니다.' }
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
  const coefficientRows: ScientificCoefficient[] = labels
    .map((name, i) => ({
      name,
      estimate: coefficients[i],
      fixed: poly && origin && i === 0,
    }))
    .filter((row) => Number.isFinite(row.estimate))
  if (stats.df > 0) {
    const errors = standardErrors(
      solved.svd,
      transform,
      Math.sqrt(stats.sseNormalized / stats.df) * yScale,
    )
    const critical = studentTCritical95(stats.df)
    errors.forEach((v, i) => {
      if (!Number.isFinite(v)) return
      values[`SE_${labels[i]}`] = v
      const row = coefficientRows.find((r) => r.name === labels[i])
      if (row && !row.fixed) {
        row.standardError = v
        row.confidence95 = coefficientConfidence95(row.estimate, v, critical)
        if (!row.confidence95) row.note = '구간 폭이 Float64 범위를 넘었습니다.'
      }
    })
  }
  for (const row of coefficientRows)
    if (row.fixed)
      row.note = 'Origin 조건으로 0에 고정한 값이며 추정한 계수가 아닙니다.'
    else if (!row.confidence95 && !row.note)
      row.note =
        stats.df <= 0
          ? 'Degrees of freedom이 0이어서 오차 분산을 추정할 수 없습니다.'
          : '원래 계수의 Standard Error를 유한한 값으로 계산할 수 없습니다.'
  stats.metrics.push(
    {
      label: 'Rank',
      value: `${solved.rank} / ${p}`,
      detail:
        '정규화한 설계행렬의 수치 랭크입니다. 모든 계수를 독립적으로 구분할 수 있을 때만 결과를 반환합니다.',
    },
    {
      label: 'Design condition number',
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
    method: 'Normalized SVD least squares',
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
    coefficients: coefficientRows,
    regression: {
      ...(poly ? { degree } : {}),
      ...(poly && request.options?.compareDegrees?.length
        ? {
            crossValidation: leaveOneOut(
              solved.svd,
              stats.residuals,
              p,
              yScale,
            ),
          }
        : {}),
      model: poly
        ? `${dependent} = ${Array.from(
            { length: degree + (origin ? 0 : 1) },
            (_, j) => {
              const k = j + (origin ? 1 : 0)
              return `a${k}${k ? `*${predictors[0]}${k > 1 ? `^${k}` : ''}` : ''}`
            },
          ).join(' + ')}`
        : `${dependent} = ${[...(!origin ? ['intercept'] : []), ...predictors.map((name) => `b_${name}*${name}`)].join(' + ')}`,
      sampleCount: y.length,
      parameterCount: p,
      degreesOfFreedom: stats.df,
      rank: solved.rank,
      origin,
      confidenceMethod: 'linear-normal',
      ...(stats.df <= 0
        ? {
            confidenceUnavailableReason:
              'Degrees of freedom이 0이어서 Standard Error와 95% CI를 추정하지 않습니다.',
          }
        : {}),
    },
    comparison: { observed: [...y], predicted: [...pred], dependent },
    residuals: {
      values: stats.residuals,
      predictors: predictors.map((name, i) => ({ name, values: [...xs[i]] })),
    },
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
    usedDifference = false,
    lastJacobianUsedDifference = false
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
    lastJacobianUsedDifference = false
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
      lastJacobianUsedDifference = true
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
  // A central secant across a kink may have full rank even when the model
  // is not locally differentiable or identifiable (e.g. a + abs(a) at a=0).
  // Keep that secant for numerical iteration, not for statistical inference.
  const regularDerivative = !lastJacobianUsedDifference
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
  const coefficientRows: ScientificCoefficient[] = names.map((name, i) => ({
    name,
    estimate: theta[i],
  }))
  const confidenceUnavailableReason = !regularDerivative
    ? '최종 적합점에서 정칙 미분을 확인하지 못해 유한차분을 사용했습니다. 차분의 랭크나 작은 수치 오차만으로 계수 식별을 판단할 수 없어 Standard Error와 95% CI를 제공하지 않습니다.'
    : !converged
      ? '최소제곱 수렴 조건을 만족하지 않아 계수의 95% CI를 제공하지 않습니다.'
      : stats.df <= 0
        ? 'Degrees of freedom이 0이어서 오차 분산을 추정할 수 없습니다.'
        : activeBounds.length
          ? '활성 경계에 놓인 계수가 있어 대칭적인 95% CI를 제공하지 않습니다.'
          : undefined
  if (
    converged &&
    regularDerivative &&
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
    const critical = studentTCritical95(stats.df)
    errors.forEach((v, i) => {
      if (!Number.isFinite(v)) return
      values[`SE_${names[i]}`] = v
      coefficientRows[i].standardError = v
      coefficientRows[i].confidence95 = coefficientConfidence95(
        theta[i],
        v,
        critical,
      )
    })
  }
  coefficientRows.forEach((row) => {
    if (!row.confidence95)
      row.note =
        confidenceUnavailableReason ??
        '국소 오차 구간을 유한한 값으로 계산할 수 없습니다.'
  })
  if (!converged) warnings.push(stop)
  if (activeBounds.length)
    warnings.push(
      `계수 ${activeBounds.join(', ')}가 경계에 있습니다. 투영 기울기로 수렴을 판정했으며 대칭적인 계수 표준오차는 제공하지 않습니다.`,
    )
  if (usedDifference)
    warnings.push(
      regularDerivative
        ? '일부 반복에서 유한차분 Jacobian을 사용했습니다. 최종 적합점에서는 자동미분이 가능하여 해당 위치의 국소 통계 추정만 제공합니다.'
        : confidenceUnavailableReason!,
    )
  warnings.push(
    '비선형 회귀는 초기값에 따른 국소 최소제곱 해입니다. 다른 초기값에서 더 나은 해가 있을 수 있습니다. 계수 표준오차는 독립·동일분산 오차 및 국소 선형화 가정의 추정치입니다.',
  )
  stats.metrics.push(
    regularDerivative
      ? {
          label: 'Jacobian rank',
          value: `${svd.rank} / ${names.length}`,
          detail:
            '현재 적합점에서 데이터가 계수 변화에 독립적으로 반응하는지 보여줍니다. 랭크가 부족하면 계수의 유일한 식별을 주장하지 않습니다.',
        }
      : {
          label: 'Derivative regularity',
          value: 'Not verified',
          detail:
            '최종 적합점의 자동미분이 실패해 유한차분으로 반복을 마쳤습니다. 비매끄러운 점에서는 양측 차분이 실제로 존재하지 않는 기울기를 만들 수 있으므로, 차분 행렬의 랭크를 계수의 국소 식별 근거로 표시하지 않습니다.',
        },
    {
      label: 'Iterations',
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
    method: 'Damped Levenberg–Marquardt · SVD',
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
    coefficients: coefficientRows,
    regression: {
      model: `${parsed.dependent} = ${parsed.expression}`,
      sampleCount: y.length,
      parameterCount: names.length,
      degreesOfFreedom: stats.df,
      ...(regularDerivative ? { rank: svd.rank } : {}),
      origin: false,
      confidenceMethod: 'nonlinear-local',
      confidenceUnavailableReason,
    },
    comparison: {
      observed: [...y],
      predicted: [...predicted],
      dependent: parsed.dependent,
    },
    residuals: {
      values: stats.residuals,
      predictors: [...directRefs].map((name) => ({
        name,
        values: parsed.raw.map((row) => row[name]),
      })),
    },
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
  const degrees = request.options?.compareDegrees
  if (
    degrees !== undefined &&
    (request.module !== 'curve-fit' ||
      !Array.isArray(degrees) ||
      degrees.length > 12 ||
      degrees.some((d) => !Number.isInteger(d) || d < 1 || d > 12))
  )
    throw new ModelError(
      '차수 비교는 Polynomial에서 1~12의 정수 차수를 최대 12개 선택하세요.',
    )
  const result = /^nlinfit\b/i.test(parsed.command)
    ? nonlinearFit(request, start, parsed)
    : linearFit(request, start, parsed)
  if (degrees?.length) {
    const [command, independent, dependent] = parsed.command.split(/\s+/)
    const origin = result.regression!.origin
    const candidates: PolynomialCandidate[] = [...new Set(degrees)]
      .sort((a, b) => a - b)
      .map((degree) => {
        try {
          const fit =
            degree === result.regression?.degree
              ? result
              : linearFit(request, start, {
                  ...parsed,
                  command: `${command} ${independent} ${dependent} ${degree}${origin ? ' origin' : ''}`,
                })
          return {
            degree,
            status: 'completed',
            metrics: fit.metrics,
            curve: { ...fit.series[1], name: `Degree ${degree}` },
            residuals: {
              name: `Degree ${degree}`,
              x: fit.residuals!.predictors[0].values,
              y: fit.residuals!.values,
              style: 'points',
            },
            crossValidation: fit.regression!.crossValidation,
            warnings: fit.warnings,
          }
        } catch (error) {
          return {
            degree,
            status: 'unavailable',
            reason:
              error instanceof Error ? error.message : '계산하지 못했습니다.',
          }
        }
      })
    const available = candidates.filter(
      (c) => c.crossValidation?.rmse !== undefined,
    )
    const best = available.reduce<number | undefined>(
      (v, c) => Math.min(v ?? Infinity, c.crossValidation!.rmse!),
      undefined,
    )
    const scale = Math.max(...result.comparison!.observed.map(Math.abs)) || 1
    const recommended =
      best === undefined
        ? undefined
        : available.find(
            (c) =>
              c.crossValidation!.rmse! <=
              best + Math.abs(best) * 1e-8 + scale * 128 * Number.EPSILON,
          )?.degree
    result.polynomialComparison = {
      independent,
      dependent,
      origin,
      observed: { ...result.series[0], name: 'Observed data' },
      candidates,
      ...(recommended === undefined ? {} : { recommendedDegree: recommended }),
    }
  }
  result.durationMs = performance.now() - start
  return result
}
```

<a id="source-8"></a>

## src/engine/scientific/statistics.ts

원본: [src/engine/scientific/statistics.ts](../../src/engine/scientific/statistics.ts) · 98줄 · SHA-256: `c9afe3e033931a239e6d7a99a0e4b8ef2aea1642cf759786343af6e1c38a1314`

```typescript
// Statistical (not interval-certified) Student-t confidence calculations.
// The incomplete beta continued fraction uses Lentz's method; all inputs to
// this module come from a finite, positive regression degrees of freedom.
const lanczos = [
  676.5203681218851, -1259.1392167224028, 771.3234287776531, -176.6150291621406,
  12.507343278686905, -0.13857109526572012, 9.984369578019572e-6,
  1.5056327351493116e-7,
]
function logGamma(z: number): number {
  if (z < 0.5)
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z)
  const a = z - 1
  let x = 0.9999999999998099
  for (let i = 0; i < lanczos.length; i++) x += lanczos[i] / (a + i + 1)
  const t = a + 7.5
  return 0.5 * Math.log(2 * Math.PI) + (a + 0.5) * Math.log(t) - t + Math.log(x)
}
function betaFraction(a: number, b: number, x: number): number {
  const tiny = 1e-300
  const guard = (v: number) => (Math.abs(v) < tiny ? (v < 0 ? -tiny : tiny) : v)
  const qab = a + b,
    qap = a + 1,
    qam = a - 1
  let c = 1,
    d = 1 / guard(1 - (qab * x) / qap),
    h = d
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1 / guard(1 + aa * d)
    c = guard(1 + aa / c)
    h *= d * c
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1 / guard(1 + aa * d)
    c = guard(1 + aa / c)
    const change = d * c
    h *= change
    if (Math.abs(change - 1) <= 8 * Number.EPSILON) return h
  }
  throw new Error('Student-t incomplete beta did not converge.')
}
function regularizedBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const front = Math.exp(
    logGamma(a + b) -
      logGamma(a) -
      logGamma(b) +
      a * Math.log(x) +
      b * Math.log1p(-x),
  )
  const result =
    x < (a + 1) / (a + b + 2)
      ? (front * betaFraction(a, b, x)) / a
      : 1 - (front * betaFraction(b, a, 1 - x)) / b
  return Math.max(0, Math.min(1, result))
}
/** Two-sided 95% Student-t critical value, using the upper tail to avoid
 * subtracting a CDF close to one. Valid for finite positive degrees of freedom. */
export function studentTCritical95(df: number): number {
  if (!(df > 0) || !Number.isFinite(df))
    throw new RangeError(
      'Student-t degrees of freedom must be positive and finite.',
    )
  const tail = (t: number) =>
    0.5 * regularizedBeta(df / (df + t * t), df / 2, 0.5)
  let low = 0,
    high = 2
  while (tail(high) > 0.025 && Number.isFinite(high)) high *= 2
  if (!Number.isFinite(high))
    throw new RangeError('Student-t critical value exceeded Float64.')
  for (let i = 0; i < 90; i++) {
    const mid = low / 2 + high / 2
    if (mid === low || mid === high) break
    if (tail(mid) > 0.025) low = mid
    else high = mid
  }
  return low / 2 + high / 2
}

export function coefficientConfidence95(
  estimate: number,
  standardError: number,
  critical: number,
) {
  if (
    ![estimate, standardError, critical].every(Number.isFinite) ||
    standardError < 0 ||
    critical <= 0
  )
    return undefined
  const halfWidth = critical * standardError
  const lower = estimate - halfWidth,
    upper = estimate + halfWidth
  return Number.isFinite(lower) && Number.isFinite(upper)
    ? { lower, upper, halfWidth }
    : undefined
}
```

<a id="source-9"></a>

## src/engine/scientific/fitting-examples.ts

원본: [src/engine/scientific/fitting-examples.ts](../../src/engine/scientific/fitting-examples.ts) · 104줄 · SHA-256: `570dc9eecfc0fafd5be3bbedae4589202c2e7d6b8d7a8ac19a99d3b4167addef`

```typescript
import type { ScientificModule } from './types'

export const fittingExamples: {
  title: string
  module: ScientificModule
  source: string
  description: string
}[] = [
  {
    title: '검량선 · 선형 회귀',
    module: 'curve-fit',
    description:
      '농도와 측정 신호의 관계를 적합하고 계수·데이터 오차·R²를 확인합니다.',
    source: `[
C signal
0 0.12
1 1.09
2 2.14
3 3.08
4 4.16
5 5.10
]
polyfit C signal 1`,
  },
  {
    title: '포물선 에너지 · 다항식 회귀',
    module: 'curve-fit',
    description: '2차 모델을 적합하고 선형 모델과 데이터 오차를 비교합니다.',
    source: `[
x E
-3 10.04
-2 5.02
-1 2.01
0 1.00
1 2.03
2 5.01
3 9.98
]
polyfit x E 2`,
  },
  {
    title: '공정 응답 · 다중선형 회귀',
    module: 'multilinear',
    description:
      '온도와 유량의 영향을 동시에 추정합니다. 계수의 단위와 설명변수 상관을 함께 확인하세요.',
    source: `[
T flow response
20 1 9.0
25 1 10.6
30 1 11.9
20 2 7.1
25 2 8.4
30 2 10.1
20 3 5.0
25 3 6.6
30 3 8.0
]
mlinfit T flow response`,
  },
  {
    title: '효소 반응 · Michaelis–Menten',
    module: 'nonlinear-fit',
    description:
      '포화 반응속도 v=Vmax*S/(Km+S)를 비선형 최소제곱으로 적합합니다.',
    source: `[
S v
0.1 0.300
0.3 0.720
0.5 1.000
0.8 1.280
1.2 1.516
1.8 1.728
2.5 1.875
3.2 1.969
]
nlinfit v = Vmax*S/(Km+S)
m(Vmax)=2
m(Km)=0.5
Vmax(min)=0
Km(min)=0`,
  },
  {
    title: '냉각 데이터 · 지수 회귀',
    module: 'nonlinear-fit',
    description:
      '온도 감소 모델을 적합합니다. 초기값을 바꾸고 수렴 결과·표준오차를 비교할 수 있습니다.',
    source: `[
t T
0 90.0
1 73.2
2 60.7
3 51.4
4 44.6
5 39.5
6 35.7
]
Ta = 25
nlinfit T = Ta + A*exp(-k*t)
m(A)=50
m(k)=0.2
A(min)=0
k(min)=0`,
  },
]
```

<a id="source-10"></a>

## src/engine/scientific/integration.ts

원본: [src/engine/scientific/integration.ts](../../src/engine/scientific/integration.ts) · 379줄 · SHA-256: `40191e64fae159262c90bbdec6e430871f695a08153a9072fd7a73dc7f54a7fa`

```typescript
import { ModelError } from '../index'
import { preprocessSolverSource } from '../preprocessor'
import { compileAssignments } from './expression'
import { parseDataTable } from './data'
import type { ScientificRequest, ScientificResult } from './types'

type Piece = {
  end: number
  x: number
  h: number
  a: number
  b: number
  c: number
  d: number
}
const numberPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/

function numeric(text: string, label: string) {
  if (!numberPattern.test(text) || !Number.isFinite(Number(text)))
    throw new ModelError(`${label}에는 유한한 숫자를 입력하세요.`)
  return Number(text)
}

function naturalCubic(x: number[], y: number[]): Piece[] {
  const n = x.length,
    h = x.slice(1).map((v, i) => v - x[i])
  const second = Array<number>(n).fill(0)
  if (n > 2) {
    const diagonal: number[] = [],
      upper: number[] = [],
      rhs: number[] = []
    for (let i = 1; i < n - 1; i++) {
      const scale = Math.max(h[i - 1], h[i])
      const lower = h[i - 1] / scale
      let mid = 2 * (h[i - 1] / scale + h[i] / scale)
      let value =
        (6 * ((y[i + 1] - y[i]) / h[i] - (y[i] - y[i - 1]) / h[i - 1])) / scale
      if (i > 1) {
        const ratio = lower / diagonal[i - 2]
        mid -= ratio * upper[i - 2]
        value -= ratio * rhs[i - 2]
      }
      diagonal.push(mid)
      upper.push(h[i] / scale)
      rhs.push(value)
    }
    for (let i = n - 2; i >= 1; i--)
      second[i] = (rhs[i - 1] - upper[i - 1] * second[i + 1]) / diagonal[i - 1]
  }
  return h.map((width, i) => ({
    x: x[i],
    end: x[i + 1],
    h: width,
    a: y[i],
    b:
      (y[i + 1] - y[i]) / width - (width * (2 * second[i] + second[i + 1])) / 6,
    c: second[i] / 2,
    d: (second[i + 1] - second[i]) / (6 * width),
  }))
}

function akima(x: number[], y: number[]): Piece[] {
  if (x.length < 5)
    throw new ModelError(
      'Akima 보간에는 서로 다른 x 데이터가 최소 5개 필요합니다.',
    )
  const n = x.length
  const slopes = x.slice(1).map((v, i) => (y[i + 1] - y[i]) / (v - x[i]))
  const left = 2 * slopes[0] - slopes[1]
  const right = 2 * slopes[n - 2] - slopes[n - 3]
  const extended = [
    2 * left - slopes[0],
    left,
    ...slopes,
    right,
    2 * right - slopes[n - 2],
  ]
  const derivative = x.map((_, i) => {
    const w1 = Math.abs(extended[i + 3] - extended[i + 2])
    const w2 = Math.abs(extended[i + 1] - extended[i])
    const scale = Math.max(w1, w2)
    return scale === 0
      ? extended[i + 1] / 2 + extended[i + 2] / 2
      : ((w1 / scale) * extended[i + 1] + (w2 / scale) * extended[i + 2]) /
          (w1 / scale + w2 / scale)
  })
  return slopes.map((slope, i) => {
    const h = x[i + 1] - x[i]
    return {
      x: x[i],
      end: x[i + 1],
      h,
      a: y[i],
      b: derivative[i],
      c: (3 * slope - 2 * derivative[i] - derivative[i + 1]) / h,
      d: (derivative[i] + derivative[i + 1] - 2 * slope) / (h * h),
    }
  })
}

function makePieces(x: number[], y: number[], method: string): Piece[] {
  const pieces =
    method === 'ccs'
      ? naturalCubic(x, y)
      : method === 'akm'
        ? akima(x, y)
        : x.slice(1).map((v, i) => ({
            x: x[i],
            end: v,
            h: v - x[i],
            a: y[i],
            b: (y[i + 1] - y[i]) / (v - x[i]),
            c: 0,
            d: 0,
          }))
  if (pieces.some((piece) => !Object.values(piece).every(Number.isFinite)))
    throw new ModelError(
      '데이터 스케일 때문에 보간 계수를 유한하게 계산할 수 없습니다. x·y 단위를 조정하세요.',
    )
  return pieces
}

function pieceAt(pieces: Piece[], x: number) {
  let lo = 0,
    hi = pieces.length - 1
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (pieces[mid].x <= x) lo = mid
    else hi = mid - 1
  }
  return pieces[lo]
}

function valueAt(pieces: Piece[], x: number) {
  const piece = pieceAt(pieces, x),
    s = x - piece.x
  return ((piece.d * s + piece.c) * s + piece.b) * s + piece.a
}

/** Integrate each local polynomial directly. Avoid subtracting two large
 * global antiderivatives when a narrow interval lies far from the origin. */
function areaBetween(pieces: Piece[], from: number, to: number): number {
  if (from === to) return 0
  if (from > to) return -areaBetween(pieces, to, from)
  let sum = 0,
    correction = 0
  for (const p of pieces) {
    const lo = Math.max(from, p.x),
      hi = Math.min(to, p.end)
    if (hi <= lo) continue
    const u = lo - p.x,
      width = hi - lo
    // Taylor around the clipped left endpoint; exact polynomial integration.
    const a = ((p.d * u + p.c) * u + p.b) * u + p.a
    const b = (3 * p.d * u + 2 * p.c) * u + p.b
    const c = p.c + 3 * p.d * u
    const term =
      width * (a + width * (b / 2 + width * (c / 3 + (width * p.d) / 4)))
    const next = sum + term
    correction +=
      Math.abs(sum) >= Math.abs(term) ? sum - next + term : term - next + sum
    sum = next
  }
  const result = sum + correction
  if (!Number.isFinite(result))
    throw new ModelError(
      '적분 결과가 Float64 표현 범위를 벗어났습니다. 데이터 단위를 조정하세요.',
    )
  return result
}

export function solveIntegration(request: ScientificRequest): ScientificResult {
  const start = performance.now()
  const table = parseDataTable(request.source)
  if (!table.rows.length)
    throw new ModelError('적분할 [ 데이터 표 ]가 필요합니다.')
  const commands = table.remainingLines.filter((line) =>
    /^integrate\b/i.test(line),
  )
  if (commands.length !== 1)
    throw new ModelError(
      'integrate y(x) 시작 끝 [구간수] [lin|ccs|akm] 명령을 하나 입력하세요.',
    )
  const command =
    /^integrate\s+([A-Za-z][A-Za-z0-9_]*)\s*\(\s*([A-Za-z][A-Za-z0-9_]*)\s*\)\s+(\S+)\s+(\S+)(?:\s+(\S+))?(?:\s+(\S+))?$/i.exec(
      commands[0],
    )
  if (!command)
    throw new ModelError(
      '적분 명령은 integrate y(x) 시작 끝 [구간수] [lin|ccs|akm] 형태로 입력하세요.',
    )
  const [, yName, xName, fromText, toText, optional1, optional2] = command
  const from = numeric(fromText, '적분 시작'),
    to = numeric(toText, '적분 끝')
  const inlineMethod =
    optional2 ??
    (optional1 && !numberPattern.test(optional1) ? optional1 : undefined)
  const method = (
    request.options?.method ??
    inlineMethod ??
    'lin'
  ).toLowerCase()
  if (!['lin', 'ccs', 'akm'].includes(method))
    throw new ModelError(
      '적분 방법은 lin(직선), ccs(자연 3차 스플라인), akm(Akima) 중에서 선택하세요.',
    )
  if (optional2 && (!optional1 || !numberPattern.test(optional1)))
    throw new ModelError('보간 방법 앞에는 정수 구간수를 입력하세요.')
  let sections =
    optional1 && numberPattern.test(optional1)
      ? Number(optional1)
      : (request.options?.samples ?? 201) - 1
  if (!Number.isInteger(sections) || sections < 1 || sections > 2000)
    throw new ModelError('그래프 구간수는 1~2,000 사이의 정수로 입력하세요.')
  if (table.rows.length < 2)
    throw new ModelError(
      '적분에는 서로 다른 x 값을 가진 데이터가 최소 2개 필요합니다.',
    )
  if (xName === yName)
    throw new ModelError('적분의 독립변수와 종속변수는 서로 다르게 지정하세요.')
  const definitions = table.remainingLines.filter(
    (line) => line !== commands[0],
  )
  const names = new Set([
    ...table.columns,
    ...definitions.map((line) => line.split('=')[0].trim()),
  ])
  let xOutput = 'IntegrationOutputX',
    yOutput = 'IntegrationOutputY'
  while (names.has(xOutput)) xOutput += 'X'
  while (names.has(yOutput)) yOutput += 'Y'
  const expanded = preprocessSolverSource(
    [...definitions, `${xOutput}=${xName}`, `${yOutput}=${yName}`].join('\n'),
    [...table.columns, ...Object.keys(request.parameters ?? {})],
    'nonlinear',
  )
  const helpers = compileAssignments(expanded.split('\n'), {
    reserved: table.columns,
    parameters: request.parameters,
  })
  const checkBudget = () => {
    if (performance.now() - start > 3000)
      throw new ModelError(
        '적분 계산 시간 한도에 도달했습니다. 데이터 행 수·보조식·그래프 구간수를 줄여 주세요.',
      )
  }
  const data = table.rows.map((row) => {
    checkBudget()
    const scope = helpers.evaluate(
      Object.fromEntries(table.columns.map((name, i) => [name, row[i]])),
    )
    return [scope[xOutput], scope[yOutput]]
  })
  if (data.some((row) => !row.every(Number.isFinite)))
    throw new ModelError('파생 x·y 데이터는 유한한 숫자여야 합니다.')
  const sorted = [...data].sort((a, b) => a[0] - b[0]),
    warnings: string[] = []
  if (sorted.some((row, i) => row !== data[i]))
    warnings.push('입력 데이터를 x 오름차순으로 정렬했습니다.')
  const x = sorted.map((row) => row[0]),
    y = sorted.map((row) => row[1])
  if (x.some((value, i) => i > 0 && value === x[i - 1]))
    throw new ModelError(
      '적분 데이터의 x 값이 중복됩니다. 같은 x의 측정값을 먼저 정리하세요.',
    )
  if (!Number.isFinite(x.at(-1)! - x[0]))
    throw new ModelError(
      'x 데이터의 전체 폭이 Float64 표현 범위를 벗어났습니다.',
    )
  const lower = Math.min(from, to),
    upper = Math.max(from, to)
  if (lower < x[0] || upper > x.at(-1)!)
    throw new ModelError(
      `적분 범위는 데이터 범위 [${x[0]}, ${x.at(-1)}] 안에 있어야 합니다. 외삽은 하지 않습니다.`,
    )
  const pieces = makePieces(x, y, method),
    integral = areaBetween(pieces, from, to)
  const linearIntegral = areaBetween(makePieces(x, y, 'lin'), from, to)
  const sampleX = Array.from({ length: sections + 1 }, (_, i) =>
    i === 0
      ? from
      : i === sections
        ? to
        : from * (1 - i / sections) + to * (i / sections),
  ).filter((value, i, all) => i === 0 || value !== all[i - 1])
  const rows = sampleX.map((value) => {
    checkBudget()
    return [value, valueAt(pieces, value), areaBetween(pieces, from, value)]
  })
  if (rows.some((row) => !row.every(Number.isFinite)))
    throw new ModelError('보간 결과가 숫자 표현 범위를 벗어났습니다.')
  const label =
    method === 'ccs'
      ? '자연 3차 스플라인 조각 적분'
      : method === 'akm'
        ? 'Akima 3차 Hermite 조각 적분'
        : '구간별 직선 보간 · 사다리꼴 적분'
  if (method !== 'lin')
    warnings.push(
      '보간 곡선의 면적입니다. 표 사이의 실제 물리 곡선이나 측정 오차에 대한 오차 상한은 아닙니다.',
    )
  else
    warnings.push(
      '표 사이를 직선으로 연결한 면적입니다. 표에 없는 곡선 모양이나 측정 오차는 포함하지 않습니다.',
    )
  if (from > to)
    warnings.push(
      '적분 방향이 역순이므로 누적 면적에 음의 방향을 적용했습니다.',
    )
  const observed = sorted.filter((row) => row[0] >= lower && row[0] <= upper)
  return {
    module: 'integration',
    method: label,
    status: 'completed',
    columns: [xName, yName, `누적 적분`],
    rows,
    series: [
      {
        name: '보간 곡선',
        x: sampleX,
        y: rows.map((row) => row[1]),
        style: 'line',
        axisLabel: xName,
      },
      {
        name: '측정 데이터',
        x: observed.map((row) => row[0]),
        y: observed.map((row) => row[1]),
        style: 'points',
        axisLabel: xName,
      },
      {
        name: '누적 적분 I(x)',
        x: sampleX,
        y: rows.map((row) => row[2]),
        style: 'line',
        axisLabel: xName,
      },
    ],
    values: { integral },
    integration: {
      from,
      to,
      independent: xName,
      dependent: yName,
      value: integral,
    },
    metrics: [
      {
        label: '정적분',
        value: integral,
        detail:
          '선택한 보간 다항식을 각 데이터 구간에서 해석적으로 적분한 부호 있는 면적입니다.',
      },
      {
        label: '사다리꼴 대비 차이',
        value: Math.abs(integral - linearIntegral),
        detail:
          '같은 데이터의 직선 보간 면적과의 차이입니다. 보간 선택에 대한 참고값이며 실제 오차 상한은 아닙니다.',
      },
      {
        label: '입력 데이터',
        value: x.length,
        detail:
          '서로 다른 x 값의 개수입니다. 그래프 구간수를 늘려도 입력 측정 정보는 증가하지 않습니다.',
      },
      {
        label: '그래프 샘플',
        value: rows.length,
        detail:
          '선택한 보간 곡선을 표시하고 누적 적분 표를 출력하는 지점 수입니다. 이 값은 조각 적분의 정확도를 설정하지 않습니다.',
      },
    ],
    warnings,
    evaluations: rows.length,
    durationMs: performance.now() - start,
    formula: `∫ ${yName} d${xName}, ${from} → ${to}`,
  }
}
```

<a id="source-11"></a>

## src/engine/scientific/integration-examples.ts

원본: [src/engine/scientific/integration-examples.ts](../../src/engine/scientific/integration-examples.ts) · 53줄 · SHA-256: `2f8cbe27ee0a65378f1d6d776841af384619e426cd1c13264ccf6e24d2ac39fb`

```typescript
import type { ScientificModule } from './types'

export const integrationExamples: {
  title: string
  module: ScientificModule
  source: string
  description: string
}[] = [
  {
    title: '유량 데이터의 누적 부피',
    module: 'integration',
    description: '불규칙한 시간 간격의 유량 측정값에서 누적 부피를 구합니다.',
    source: `[
t Q
0 0
0.5 2
1.5 4
3 3
5 1
]
integrate Q(t) 0 5 200 lin`,
  },
  {
    title: '열용량 곡선의 엔탈피 변화',
    module: 'integration',
    description:
      '온도별 열용량을 자연 3차 스플라인으로 연결해 면적을 비교합니다.',
    source: `[
T Cp
300 29.1
350 29.8
400 30.7
500 32.9
600 35.2
700 37.6
]
integrate Cp(T) 300 700 200 ccs`,
  },
  {
    title: '제곱 곡선과 Akima 적분',
    module: 'integration',
    description: '알려진 포물선의 면적 64/3과 Akima 보간 결과를 비교합니다.',
    source: `[
x y
0 0
1 1
2 4
3 9
4 16
]
integrate y(x) 0 4 200 akm`,
  },
]
```

<a id="source-12"></a>

## src/engine/scientific/optimization.ts

원본: [src/engine/scientific/optimization.ts](../../src/engine/scientific/optimization.ts) · 824줄 · SHA-256: `ff333f61f7816c0979937654b55d051f324228bb1014099ee27d5a674b11a325`

```typescript
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
    ...(main.target
      ? {
          comparison: {
            dependent: main.target,
            observed: table.rows.map(
              (row) => row[table.columns.indexOf(main.target!)],
            ),
            predicted: [...current.predictions!],
          },
          residuals: {
            values: table.rows.map(
              (row, i) =>
                row[table.columns.indexOf(main.target!)] -
                current.predictions![i],
            ),
            predictors: table.columns
              .filter((name) => name !== main.target)
              .map((name) => ({
                name,
                values: table.rows.map(
                  (row) => row[table.columns.indexOf(name)],
                ),
              })),
          },
        }
      : {}),
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
```

<a id="source-13"></a>

## src/engine/scientific/optimization-examples.ts

원본: [src/engine/scientific/optimization-examples.ts](../../src/engine/scientific/optimization-examples.ts) · 48줄 · SHA-256: `d6bd6111e3187a94257515182f97a35db5b4033884a724eaee2b9cfee472293e`

```typescript
import type { ScientificModule } from './types'

export const optimizationExamples: {
  title: string
  module: ScientificModule
  source: string
  description: string
}[] = [
  {
    title: 'Rosenbrock 계곡의 국소 최솟값',
    module: 'optimization',
    description:
      '곡선 형태의 좁은 계곡에서 목적함수 감소와 국소 정상성의 차이를 살펴봅니다.',
    source:
      '# Rosenbrock 함수: 알려진 최솟값 (x,y)=(1,1)\nmin: 100*(y-x^2)^2+(1-x)^2\nx|-1.2 -3 3\ny|1 -2 4',
  },
  {
    title: '저장 용기의 최소 표면적',
    module: 'optimization',
    description:
      '부피를 보존하는 원기둥의 반지름·높이를 찾습니다. 이 모델의 해석적 최적 비율은 h=2r입니다.',
    source:
      '# 닫힌 원기둥, 길이·면적·부피는 일관된 단위를 사용\nvolume = 100\nmin: 2*pi*r^2+2*pi*r*h\npi*r^2*h = volume\nr|2 0.1 10\nh|5 0.1 30',
  },
  {
    title: '성분 합과 허용 영역을 갖는 설계',
    module: 'optimization',
    description:
      '등식·부등식과 변수 범위를 동시에 적용하며 최대 제약 위반을 확인합니다.',
    source: 'min: (x-1)^2+(y-1)^2\nx+y=1\n1.5-x^2-y^2>=0\nx|0.2 0 2\ny|0.2 0 2',
  },
  {
    title: '총 이득을 고정한 센서 보정',
    module: 'lsq',
    description:
      '관측 데이터를 선형 모델로 적합하면서 a+b=3이라는 교정 제약을 유지합니다.',
    source:
      '[\nx y\n0 1.02\n1 2.97\n2 5.04\n3 6.98\n4 9.01\n]\nfit: y = a*x+b\na|1 0 4\nb|0 -1 2\na+b=3',
  },
  {
    title: '양의 속도 상수를 갖는 반응 속도 적합',
    module: 'lsq',
    description:
      'Michaelis–Menten 곡선의 vmax와 Km을 물리적 범위 안에서 추정합니다.',
    source:
      '[\nS rate\n0.1 0.167\n0.25 0.333\n0.5 0.500\n1 0.667\n2 0.800\n4 0.889\n]\nfit: rate = vmax*S/(Km+S)\nvmax|0.8 0.01 3\nKm|0.4 0.001 5',
  },
]
```

<a id="source-14"></a>

## src/engine/scientific/worker.ts

원본: [src/engine/scientific/worker.ts](../../src/engine/scientific/worker.ts) · 32줄 · SHA-256: `7b1bd29ff28faecafaa40d26c791a565b4d28ccb747dcaf2f921ac593db3b069`

```typescript
/// <reference lib="webworker" />
import type { ScientificRequest } from './types'
import { solveOde } from './ode'
import { solveFitting } from './fitting'
import { solveIntegration } from './integration'
import { solveOptimization } from './optimization'
self.onmessage = async ({
  data,
}: MessageEvent<ScientificRequest & { id: number }>) => {
  const { id, ...request } = data
  try {
    let result
    if (request.module === 'ode') result = solveOde(request)
    else if (
      ['curve-fit', 'multilinear', 'nonlinear-fit'].includes(request.module)
    )
      result = solveFitting(request)
    else if (request.module === 'integration')
      result = solveIntegration(request)
    else if (request.module === 'optimization' || request.module === 'lsq')
      result = solveOptimization(request)
    else throw new Error('지원하지 않는 계산 도구입니다.')
    self.postMessage({ id, ok: true, result })
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error:
        error instanceof Error ? error.message : '계산을 완료하지 못했습니다.',
    })
  }
}
```

<a id="source-15"></a>

## vite.config.ts

원본: [vite.config.ts](../../vite.config.ts) · 11줄 · SHA-256: `23ccbf8dde9a2fbb4af8750625ea4fcaf02b83efa5fc99a49915519ab1560297`

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  worker: {
    format: 'es',
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
  test: { include: ['tests/**/*.test.ts'] },
})
```

<a id="source-16"></a>

## src/components/ScientificWorkspace.tsx

원본: [src/components/ScientificWorkspace.tsx](../../src/components/ScientificWorkspace.tsx) · 1,487줄 · SHA-256: `8bf836f88556e594f9cb365a3d95be9cb48a1bb2280277cb06750a321a534612`

```tsx
import { AxisTransformProvider, type AxisPreferences } from './AxisTransforms'
import { numericConstants, defaultParameterRange } from '../model-constants'
import { accountStorageKey } from '../account-storage'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  BookOpen,
  Download,
  FolderOpen,
  Play,
  Pause,
  Plus,
  Code2,
} from 'lucide-react'
import { encodeCsv } from '../csv'
import { regressionReportSections } from '../regression-report'
import type {
  ScientificModule,
  ScientificOptions,
  ScientificRequest,
  ScientificResult,
} from '../engine/scientific/types'
import {
  getModuleExamples,
  scientificDescriptions,
  scientificTitles,
} from '../engine/scientific/catalog'
import ScientificChart from './ScientificChart'
import ModuleGuide from './ModuleGuide'
import RegressionResult from './RegressionResult'
import RegressionResidualPlot from './RegressionResidualPlot'
import PolynomialComparison from './PolynomialComparison'
import ScientificOutput, { IntegralFormula } from './ScientificOutput'
import './ScientificWorkspace.css'

type Draft = {
  source: string
  parameters: Record<string, number>
  options: ScientificOptions
  hiddenParameters?: string[]
  ranges?: Record<string, { min: number; max: number; step: number }>
  axisTransforms?: AxisPreferences
}
type Props = {
  module: ScientificModule
  onHome: () => void
  onModuleChange?: (module: ScientificModule) => void
}
const storageKey = (m: string) =>
  accountStorageKey(`polymath-scientific-${m}-v1`)
const format = (x: number) =>
  !Number.isFinite(x)
    ? 'N/A'
    : x === 0
      ? '0'
      : Math.abs(x) < 0.0001 || Math.abs(x) > 1e7
        ? x.toExponential(6)
        : Number(x.toPrecision(9)).toString()
function download(name: string, text: string, type = 'text/plain') {
  const url = URL.createObjectURL(
      new Blob([text], { type: `${type};charset=utf-8` }),
    ),
    a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function defaultOptions(module: ScientificModule): ScientificOptions {
  if (module === 'ode') return { method: 'auto', samples: 201, tolerance: 1e-7 }
  if (module === 'nonlinear-fit') return { tolerance: 1e-8, maxIterations: 250 }
  if (module === 'optimization' || module === 'lsq')
    return { tolerance: 1e-7, maxIterations: 1000 }
  return {}
}
function initialDraft(module: ScientificModule): Draft {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(module)) || 'null')
    if (
      saved &&
      typeof saved.source === 'string' &&
      saved.source.length <= 500000 &&
      saved.parameters &&
      typeof saved.parameters === 'object'
    )
      return {
        ...saved,
        source: saved.source,
        parameters: saved.parameters,
        options: { ...defaultOptions(module), ...(saved.options ?? {}) },
        hiddenParameters: Array.isArray(saved.hiddenParameters)
          ? saved.hiddenParameters.filter((v: unknown) => typeof v === 'string')
          : [],
        ranges: sanitizeRanges(saved.ranges),
      }
  } catch {}
  return {
    source: getModuleExamples(module)[0]?.source ?? '',
    parameters: {},
    options: defaultOptions(module),
  }
}
function sanitizeRanges(value: unknown): Draft['ranges'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, r]) =>
        r &&
        [r.min, r.max, r.step, r.max - r.min].every(Number.isFinite) &&
        r.min < r.max &&
        r.step > 0,
    ),
  )
}
const settingDescriptions: Record<ScientificModule, string[]> = {
  ode: [
    'Output Samples는 표·그래프에 출력할 시점 수입니다. 내부 적분 스텝 수와 다릅니다. Tolerance는 내부 스텝의 오차 제어 목표이며 측정 오차나 전체 구간의 정확도 보장은 아닙니다. 위의 Integration Method 설명에서 모델에 맞는 방법을 선택하세요.',
  ],
  'curve-fit': [
    'Fit Type의 Linear는 직선, Polynomial은 Degree까지의 거듭제곱 항을 사용합니다. Through Origin은 절편을 0으로 고정합니다. Input의 polyfit x y 2처럼 열 이름과 차수로도 지정할 수 있습니다.',
    '차수를 높일수록 계수가 늘어납니다. 관측 데이터가 계수보다 충분히 많아야 95% Confidence Interval을 추정할 수 있습니다. RMSE와 잔차 모양을 함께 확인하고, 데이터 범위 밖 예측에는 주의하세요.',
  ],
  multilinear: [
    'Input의 mlinfit x1 x2 y에서 앞의 열은 설명 변수, 마지막 열은 예측할 값입니다. origin을 붙이면 절편을 0으로 고정합니다. 계수는 다른 설명 변수들을 고정했을 때 해당 변수가 1 증가하는 효과입니다.',
    '열 사이의 강한 중복과 단위 차이를 확인하세요. 관측값 수가 계수 수보다 커야 잔차의 분산과 95% Confidence Interval을 추정합니다. 설명 변수의 선택과 절편 조건은 Input 명령에 반영됩니다.',
  ],
  'nonlinear-fit': [
    'Tolerance는 잔차를 줄이는 반복 계산의 종료 목표입니다. Max Iterations는 반복 횟수의 상한이며 높인다고 전역 최적해가 보장되지는 않습니다.',
    'Input의 nlinfit은 맞출 모델, m(A)=…는 계수의 초기 추정입니다. 초기값·모델의 정의역을 바꿔 같은 결과로 수렴하는지 확인하세요. 95% Confidence Interval은 찾은 해 주변에서 모델을 선형화한 근사입니다.',
  ],
  integration: [
    'Interpolation Method는 표의 관측점 사이를 잇는 방법입니다. From Source는 Input의 dint 명령에 적은 방법을 사용합니다. Piecewise Linear는 직선 조각, Natural Cubic Spline은 양 끝의 곡률을 0으로 둔 매끄러운 곡선, Akima는 주변 기울기로 연결하는 보간입니다.',
    '적분 시작·끝은 Input의 dint 명령에서 설정합니다. 같은 데이터라도 연결 방법에 따라 면적이 달라집니다. Interpolation Difference는 사다리꼴과의 차이이며 실제 정답과의 오차 한계가 아닙니다.',
  ],
  optimization: [
    'Tolerance는 제약 위반과 국소 정상성 등을 판단하는 수치 종료 목표이고 Max Iterations는 반복 상한입니다. Input의 min/max는 목적함수 방향, 변수 | 초기값 하한 상한은 출발점과 허용 범위입니다.',
    'Constraint Violation이 작아도 전역 최적해라는 뜻은 아닙니다. 서로 다른 초기값으로 반복하고, 목적함수 값·제약 만족 여부·종료 사유를 함께 확인하세요.',
  ],
  lsq: [
    'LSQ는 관측값과 모델의 차이 제곱합을 최소화합니다. Tolerance는 반복 종료 목표, Max Iterations는 반복 상한입니다. Input의 계수 초기값·상하한과 제약조건이 탐색 범위를 정합니다.',
    'RMSE는 원래 관측값 단위의 전형적인 오차 크기입니다. Convergence는 반복 중 목적함수 변화를 보여줍니다. 반복이 끝났다는 사실만으로 좋은 모델·전역 최적해를 보장하지 않으므로 잔차와 제약 위반을 함께 확인하세요.',
  ],
}
const labels = scientificTitles

export default function ScientificWorkspace({
  module,
  onHome,
  onModuleChange,
}: Props) {
  const [draft, setDraft] = useState<Draft>(() => initialDraft(module)),
    [screen, setScreen] = useState<'model' | 'simulation' | 'report'>('model')
  const [result, setResult] = useState<ScientificResult | null>(null),
    [solvedKey, setSolvedKey] = useState(''),
    [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [toast, setToast] = useState(''),
    [guide, setGuide] = useState(false),
    [storageOk, setStorageOk] = useState(true),
    [undoDraft, setUndoDraft] = useState<Draft | null>(null)
  const [cursor, setCursor] = useState(0),
    [playing, setPlaying] = useState(false),
    [phase, setPhase] = useState(false),
    [phaseX, setPhaseX] = useState(1),
    [phaseY, setPhaseY] = useState(2),
    [plotGroup, setPlotGroup] = useState('model')
  const [dataPage, setDataPage] = useState(0)
  const worker = useRef<Worker | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    version = useRef(0),
    importRef = useRef<HTMLInputElement>(null)
  const calculationKey = (value: Draft) =>
    JSON.stringify({
      source: value.source,
      parameters: value.parameters,
      options: value.options,
    })
  const draftKey = calculationKey(draft),
    stale = solvedKey !== draftKey
  const examples = getModuleExamples(module),
    parameters = useMemo(() => numericConstants(draft.source), [draft.source])
  function start(next: Draft = draft, delay = 0) {
    if (timer.current) clearTimeout(timer.current)
    worker.current?.terminate()
    setPending(true)
    setError('')
    setPlaying(false)
    const id = ++version.current
    timer.current = setTimeout(() => {
      const w = new Worker(
        new URL('../engine/scientific/worker.ts', import.meta.url),
        { type: 'module', credentials: 'include' },
      )
      worker.current = w
      w.onmessage = ({ data }) => {
        if (data.id !== version.current) return
        setPending(false)
        if (data.ok) {
          setResult(data.result)
          setSolvedKey(calculationKey(next))
          setCursor(0)
          setDataPage(0)
          setPhaseX(1)
          setPhaseY(2)
          if (data.result.columns.length < 3) setPhase(false)
          setError('')
        } else {
          setError(data.error)
          setSolvedKey('')
        }
        w.terminate()
        if (worker.current === w) worker.current = null
      }
      w.onerror = () => {
        if (id !== version.current) return
        setPending(false)
        setSolvedKey('')
        setError('계산 워커를 실행하지 못했습니다. 다시 계산해 주세요.')
        w.terminate()
      }
      w.postMessage({ id, module, ...next } satisfies ScientificRequest & {
        id: number
      })
    }, delay)
  }
  useEffect(() => {
    start(draft)
    return () => {
      if (timer.current) clearTimeout(timer.current)
      worker.current?.terminate()
      version.current++
    }
  }, [])
  useEffect(() => {
    const handle = setTimeout(() => {
      try {
        localStorage.setItem(storageKey(module), JSON.stringify(draft))
        setStorageOk(true)
      } catch {
        setStorageOk(false)
        setToast('자동 저장을 사용할 수 없습니다. 프로젝트 파일로 저장하세요.')
      }
    }, 300)
    return () => clearTimeout(handle)
  }, [draft, module])
  useEffect(() => {
    const flush = () => {
      try {
        localStorage.setItem(storageKey(module), JSON.stringify(draft))
      } catch {}
    }
    window.addEventListener('pagehide', flush)
    const visibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', visibility)
    return () => {
      flush()
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [draft, module])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 4000)
    return () => clearTimeout(t)
  }, [toast])
  useEffect(() => {
    if (!playing || !result || screen !== 'simulation') return
    const step = Math.max(1, Math.round(result.rows.length / 150))
    const t = setInterval(
      () =>
        setCursor((i) => {
          if (i + step >= result.rows.length - 1) {
            setPlaying(false)
            return result.rows.length - 1
          }
          return i + step
        }),
      40,
    )
    return () => clearInterval(t)
  }, [playing, result, screen])
  function editSource(source: string) {
    if (timer.current) clearTimeout(timer.current)
    worker.current?.terminate()
    version.current++
    setPending(false)
    const before = numericConstants(draft.source)
    const after = numericConstants(source)
    const parameters = Object.fromEntries(
      Object.entries(draft.parameters).filter(([name]) =>
        after.some(
          (c) =>
            c.name === name &&
            before.some((p) => p.name === name && p.value === c.value),
        ),
      ),
    )
    const ranges = { ...draft.ranges }
    for (const c of after) {
      const r = ranges[c.name]
      if (r)
        ranges[c.name] = {
          ...r,
          min: Math.min(r.min, c.value),
          max: Math.max(r.max, c.value),
        }
    }
    setDraft({ ...draft, source, parameters, ranges })
    setError('')
  }
  const polyfit =
    /^[ \t]*polyfit[ \t]+([A-Za-z][A-Za-z0-9_]*)\s+([A-Za-z][A-Za-z0-9_]*)\s+(\d+)(?:[ \t]+(origin))?[ \t]*(?:#.*)?$/im.exec(
      draft.source,
    )
  const fitDegree = Number(polyfit?.[3] ?? 1)
  function editFit(degree: number, origin = Boolean(polyfit?.[4])) {
    if (!polyfit) return
    const command = `polyfit ${polyfit[1]} ${polyfit[2]} ${degree}${origin ? ' origin' : ''}`
    editSource(
      draft.source.slice(0, polyfit.index) +
        command +
        draft.source.slice(polyfit.index + polyfit[0].length),
    )
  }
  function editParameter(name: string, value: number) {
    if (!Number.isFinite(value)) return
    const next = {
      ...draft,
      parameters: { ...draft.parameters, [name]: value },
    }
    setDraft(next)
    start(next, 140)
  }
  function applyExample(index: number) {
    const example = examples[index]
    if (!example) return
    const next = {
      options: defaultOptions(module),
      source: example.source,
      parameters: {},
    }
    setDraft(next)
    start(next)
  }
  function saveProject() {
    download(
      `ivc-${module}.json`,
      JSON.stringify(
        { version: 1, kind: 'scientific', module, ...draft },
        null,
        2,
      ),
      'application/json',
    )
  }
  async function importProject(file: File | undefined) {
    if (!file) return
    try {
      if (file.size > 1_000_000)
        throw new Error('프로젝트는 1 MB 이하만 불러올 수 있습니다.')
      const value = JSON.parse(await file.text())
      if (
        value.kind !== 'scientific' ||
        !Object.hasOwn(scientificTitles, value.module) ||
        typeof value.source !== 'string' ||
        value.source.length > 500000 ||
        !value.parameters ||
        typeof value.parameters !== 'object' ||
        Array.isArray(value.parameters) ||
        (value.options !== undefined &&
          (value.options === null ||
            typeof value.options !== 'object' ||
            Array.isArray(value.options))) ||
        !Object.values(value.parameters).every(
          (v) => typeof v === 'number' && Number.isFinite(v),
        )
      )
        throw new Error('올바른 과학 계산 프로젝트 파일이 아닙니다.')
      const next = {
        hiddenParameters: Array.isArray(value.hiddenParameters)
          ? value.hiddenParameters.filter((v: unknown) => typeof v === 'string')
          : [],
        ranges: sanitizeRanges(value.ranges),
        axisTransforms: value.axisTransforms,
        source: value.source,
        parameters: value.parameters,
        options: value.options ?? {},
      }
      if (value.module !== module) {
        localStorage.setItem(storageKey(value.module), JSON.stringify(next))
        onModuleChange?.(value.module)
      } else {
        setDraft(next)
        start(next)
      }
      setToast('프로젝트를 불러왔습니다.')
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기에 실패했습니다.')
    }
  }
  function exportReport() {
    if (!result || stale || pending) return
    download(
      `ivc-${module}-report.md`,
      [
        `# ${scientificTitles[module]}`,
        `방법: ${result.method}`,
        `상태: ${result.status}${result.message ? ' · ' + result.message : ''}`,
        [
          '| 지표 | 값 | 해석 |',
          '| --- | --- | --- |',
          ...result.metrics.map(
            (m) =>
              `| ${m.label} | ${typeof m.value === 'number' ? format(m.value) : m.value} | ${m.detail.replace(/\|/g, '\\|')} |`,
          ),
        ].join('\n'),
        '\n## 계산값',
        ...Object.entries(result.values).map(
          ([k, v]) =>
            `- ${k}: ${Number.isFinite(v) ? v.toPrecision(17) : '산정 불가'}`,
        ),
        result.formula ? `\n모델: ${result.formula}` : '',
        regressionReportSections(result),
        result.coefficients?.length
          ? [
              '\n## Coefficients · 95% Confidence Interval',
              '| Coefficient | Estimate | 95% CI |',
              '| --- | --- | --- |',
              ...result.coefficients.map(
                (c) =>
                  `| ${c.name} | ${c.estimate.toPrecision(17)} | ${c.fixed ? 'Fixed by model' : c.confidence95 ? `[${c.confidence95.lower.toPrecision(17)}, ${c.confidence95.upper.toPrecision(17)}]` : 'Not estimated'} |`,
              ),
              'Student-t marginal intervals under independent, constant-variance normal observation errors. Nonlinear intervals are a local approximation; these are not prediction intervals or numerical error bounds.',
            ].join('\n')
          : '',
        result.warnings.length
          ? '\n## 확인할 사항\n' +
            result.warnings.map((x) => '- ' + x).join('\n')
          : '',
        `## 입력 모델\n\n\`\`\`text\n${draft.source}\n\`\`\``,
        '\n## 조정한 상수',
        JSON.stringify(draft.parameters, null, 2),
        '\n## 계산 설정',
        JSON.stringify(draft.options, null, 2),
        `계산 시간: ${result.durationMs.toFixed(3)} ms`,
      ]
        .filter(Boolean)
        .join('\n\n'),
      'text/markdown',
    )
  }
  const plotted = useMemo(() => {
    if (!result) return []
    if (module === 'ode' && phase && result.columns.length > 2) {
      const ix = Math.min(phaseX, result.columns.length - 1),
        iy = Math.min(phaseY, result.columns.length - 1)
      return [
        {
          name: `${result.columns[iy]} · ${result.columns[ix]}`,
          x: result.rows.map((r) => r[ix]),
          y: result.rows.map((r) => r[iy]),
          style: 'line' as const,
        },
      ]
    }
    if (module === 'integration') {
      const cumulative = result.series.filter((s) =>
        /누적|cumulative|I\(x\)/i.test(s.name),
      )
      return plotGroup === 'cumulative'
        ? cumulative
        : result.series.filter((s) => !cumulative.includes(s))
    }
    if (module === 'lsq')
      return plotGroup === 'convergence'
        ? result.series.filter((s) => s.axisLabel === 'iteration')
        : result.series.filter((s) => s.axisLabel !== 'iteration')
    const residual = result.series.filter((s) =>
      /잔차|residual|오차/.test(s.name),
    )
    return plotGroup === 'residual'
      ? residual
      : result.series.filter((s) => !residual.includes(s))
  }, [result, module, phase, phaseX, phaseY, plotGroup])
  const reportResult = result && !stale && !pending
  const visibleParameters = parameters.filter(
    (p) => !draft.hiddenParameters?.includes(p.name),
  )
  function hideParameter(name: string, hidden: boolean) {
    setDraft((d) => ({
      ...d,
      hiddenParameters: hidden
        ? [...new Set([...(d.hiddenParameters ?? []), name])]
        : d.hiddenParameters?.filter((n) => n !== name),
    }))
  }
  function setRange(
    name: string,
    value: { min: number; max: number; step: number },
  ) {
    if (
      ![value.min, value.max, value.step, value.max - value.min].every(
        Number.isFinite,
      ) ||
      value.min >= value.max ||
      value.step <= 0
    )
      return
    const current =
      draft.parameters[name] ??
      parameters.find((p) => p.name === name)?.value ??
      0
    const nextValue = Math.max(value.min, Math.min(value.max, current))
    const next = {
      ...draft,
      ranges: { ...draft.ranges, [name]: value },
      parameters:
        nextValue === current
          ? draft.parameters
          : { ...draft.parameters, [name]: nextValue },
    }
    setDraft(next)
    if (nextValue !== current) start(next, 140)
  }
  const fieldValues = result?.rows[Math.min(cursor, result.rows.length - 1)]
  return (
    <AxisTransformProvider
      value={draft.axisTransforms}
      onChange={(axisTransforms) => setDraft((d) => ({ ...d, axisTransforms }))}
    >
      <div className="scientific-workspace">
        <header className="scientific-header ivc-toolbar">
          <button type="button" onClick={onHome}>
            <ArrowLeft size={16} />
            Home
          </button>
          <strong className="ivc-brand">{scientificTitles[module]}</strong>
          <div className="ivc-toolbar-actions">
            <button
              type="button"
              onClick={() => {
                setUndoDraft(draft)
                const next: Draft = {
                  source: '',
                  parameters: {},
                  options: defaultOptions(module),
                }
                if (timer.current) clearTimeout(timer.current)
                worker.current?.terminate()
                version.current++
                setDraft(next)
                setResult(null)
                setSolvedKey('')
                setError('')
                setPending(false)
                setPlaying(false)
                setScreen('model')
                setToast('새 모델을 열었습니다.')
              }}
            >
              <Plus size={15} /> New
            </button>
            <button type="button" onClick={() => importRef.current?.click()}>
              <FolderOpen size={15} /> Import
            </button>
            <button type="button" onClick={saveProject}>
              <Download size={15} /> Save Project
            </button>
            <span className="local-status">
              <i />
              {storageOk ? 'Autosaved' : 'Save unavailable'}
            </span>
            <button type="button" onClick={() => setGuide(true)}>
              <BookOpen size={16} /> User Guide
            </button>
            <a
              className="github-link"
              href="https://github.com/kis3751-spec/polymath-exceeding-"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub 저장소"
            >
              <Code2 size={19} />
            </a>
          </div>
          <input
            ref={importRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              void importProject(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </header>
        <nav className="scientific-navigation" aria-label="과학 계산 작업 화면">
          {(['model', 'simulation', 'report'] as const).map((s, i) => (
            <button
              type="button"
              key={s}
              aria-current={screen === s ? 'page' : undefined}
              onClick={() => {
                setScreen(s)
                setPlaying(false)
              }}
            >
              <span>0{i + 1}</span>
              {s === 'model'
                ? 'Model & Data'
                : s === 'simulation'
                  ? 'Simulation'
                  : 'Report'}
            </button>
          ))}
          {['curve-fit', 'multilinear'].includes(module) && (
            <label>
              Regression Module{' '}
              <select
                aria-label="Regression Module"
                value={module}
                onChange={(e) =>
                  onModuleChange?.(e.target.value as ScientificModule)
                }
              >
                <option value="curve-fit">Curve Fitting</option>
                <option value="multilinear">Multilinear Regression</option>
              </select>
            </label>
          )}
          {['optimization', 'lsq'].includes(module) && (
            <label>
              Optimization Module{' '}
              <select
                aria-label="Optimization Module"
                value={module}
                onChange={(e) =>
                  onModuleChange?.(e.target.value as ScientificModule)
                }
              >
                <option value="optimization">Constrained Optimization</option>
                <option value="lsq">LSQ Optimization</option>
              </select>
            </label>
          )}
        </nav>
        {error && (
          <div className="science-error" role="alert">
            {error}
          </div>
        )}
        {screen === 'model' && (
          <main className="scientific-model">
            <section className="science-panel">
              <div className="science-section-title">
                <h1>{labels[module]}</h1>
                <select
                  aria-label="과학 계산 예제"
                  value=""
                  onChange={(e) => applyExample(Number(e.target.value))}
                >
                  <option value="" disabled>
                    Examples
                  </option>
                  {examples.map((x, i) => (
                    <option key={i} value={i}>
                      {x.title}
                    </option>
                  ))}
                </select>
              </div>
              <p className="science-description">
                {scientificDescriptions[module]}
              </p>
              <label
                className="science-editor-label"
                htmlFor="scientific-source"
              >
                Input
              </label>
              <textarea
                id="scientific-source"
                aria-label="과학 계산 모델 입력"
                spellCheck={false}
                value={draft.source}
                onChange={(e) => editSource(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault()
                    start()
                  }
                }}
              />
              <div className="science-model-actions">
                <button
                  type="button"
                  className="science-primary"
                  onClick={() => {
                    start()
                    setScreen('simulation')
                  }}
                >
                  <Play size={15} />
                  Compute & Simulate
                </button>
                <span>Ctrl / ⌘ + Enter</span>
              </div>
            </section>
            <aside className="science-panel">
              <h2>Settings</h2>
              {module === 'curve-fit' && (
                <div className="ivc-fit-settings">
                  <label>
                    Fit Type
                    <select
                      aria-label="Fit Type"
                      disabled={!polyfit}
                      value={fitDegree > 1 ? 'polynomial' : 'linear'}
                      onChange={(e) =>
                        editFit(
                          e.target.value === 'linear'
                            ? 1
                            : Math.max(2, fitDegree),
                        )
                      }
                    >
                      <option value="linear">Linear Regression</option>
                      <option value="polynomial">Polynomial Regression</option>
                    </select>
                  </label>
                  {fitDegree > 1 && (
                    <label>
                      Degree
                      <input
                        aria-label="Polynomial Degree"
                        type="number"
                        min="2"
                        max="12"
                        step="1"
                        value={fitDegree}
                        onChange={(e) => {
                          const n = Number(e.target.value)
                          if (Number.isInteger(n) && n >= 2 && n <= 12)
                            editFit(n)
                        }}
                      />
                    </label>
                  )}
                  <label className="ivc-checkbox">
                    <input
                      aria-label="Through Origin"
                      type="checkbox"
                      disabled={!polyfit}
                      checked={Boolean(polyfit?.[4])}
                      onChange={(e) => editFit(fitDegree, e.target.checked)}
                    />{' '}
                    Through Origin
                  </label>
                  {polyfit ? (
                    <code className="ivc-command">{polyfit[0].trim()}</code>
                  ) : (
                    <p>
                      데이터 표 아래에 <code>polyfit x y 1</code>을 입력하면
                      선택할 수 있습니다. x와 y는 표의 열 이름입니다.
                    </p>
                  )}
                  <details className="science-help">
                    <summary>Fit Type 읽는 법</summary>
                    <p>
                      Linear는 직선으로, Polynomial은 곡선으로 데이터 경향을
                      맞춥니다. Degree 2는 제곱항까지, Degree 3은 세제곱항까지
                      사용합니다. Degree를 높이면 데이터에 더 잘 맞아 보여도 새
                      데이터 예측은 나빠질 수 있습니다. Through Origin은 x=0일
                      때 y=0이라는 조건을 강제하므로 실험 이론상 맞을 때만
                      선택하세요. 선택 내용은 Input의 polyfit 명령에 그대로
                      반영되며 문법으로 직접 바꿀 수도 있습니다.
                    </p>
                  </details>
                </div>
              )}
              {module === 'ode' && (
                <>
                  <label>
                    Integration Method
                    <select
                      aria-label="미분방정식 적분 방법"
                      value={draft.options.method ?? 'auto'}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          options: { ...draft.options, method: e.target.value },
                        })
                      }
                    >
                      <option value="auto">Auto · RK45 / Implicit Euler</option>
                      <option value="rk45">RK45</option>
                      <option value="implicit">
                        Implicit Euler · Stiffness
                      </option>
                    </select>
                  </label>
                  <details className="science-help ivc-method-help">
                    <summary>Integration Method 선택 가이드</summary>
                    <p>
                      <b>Auto</b>는 RK45로 시작하고 반복적인 스텝 축소 부담이
                      감지되면 Implicit Euler로 전환합니다. 처음 사용할 때
                      권장합니다. 모든 모델의 강성을 자동으로 증명하는 판정은
                      아닙니다.
                    </p>
                    <p>
                      <b>RK45</b>는 같은 짧은 구간을 4차·5차 공식으로 계산한
                      차이로 오차를 추정해 내부 시간 간격을 조절합니다. 부드럽게
                      변하는 일반적인 모델에 효율적입니다.
                    </p>
                    <p>
                      <b>Implicit Euler</b>는 다음 상태가 다음 상태의 변화율도
                      만족하도록 반복해서 풉니다. 빠른 변화와 느린 변화가 섞인
                      Stiff 모델에서 유리할 수 있습니다. 1회 전체 스텝과 2회 반
                      스텝을 비교해 오차를 제어하며 RK45보다 많은 계산이 필요할
                      수 있습니다.
                    </p>
                    <p>
                      <b>Tolerance</b>는 각 내부 스텝의 수치 오차 제어
                      목표입니다. Output Samples는 표와 그래프에 출력할 지점
                      수로 내부 스텝 간격과 다릅니다. 실제 측정 오차나 전 구간의
                      엄밀한 오차 상한을 보장하는 설정은 아닙니다. 자세한 계산
                      과정은 User Guide의 ODE 탭을 참고하세요.
                    </p>
                  </details>
                  <label>
                    Output Samples
                    <input
                      aria-label="ODE 출력 샘플 수"
                      type="number"
                      min="2"
                      max="2000"
                      value={draft.options.samples ?? 201}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          options: {
                            ...draft.options,
                            samples: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </label>
                </>
              )}
              {module === 'integration' && (
                <label>
                  Interpolation Method
                  <select
                    aria-label="이산 적분 보간 방법"
                    value={draft.options.method ?? ''}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        options: {
                          ...draft.options,
                          method: e.target.value || undefined,
                        },
                      })
                    }
                  >
                    <option value="">From Source</option>
                    <option value="lin">Piecewise Linear</option>
                    <option value="ccs">Natural Cubic Spline</option>
                    <option value="akm">Akima</option>
                  </select>
                </label>
              )}
              {['ode', 'nonlinear-fit', 'optimization', 'lsq'].includes(
                module,
              ) && (
                <label>
                  Tolerance
                  <input
                    aria-label="과학 계산 허용 오차"
                    type="number"
                    step="any"
                    min="1e-12"
                    max="0.01"
                    value={
                      draft.options.tolerance ??
                      (module === 'nonlinear-fit' ? 1e-8 : 1e-7)
                    }
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        options: {
                          ...draft.options,
                          tolerance: Number(e.target.value),
                        },
                      })
                    }
                  />
                </label>
              )}
              {['optimization', 'lsq', 'nonlinear-fit'].includes(module) && (
                <label>
                  Max Iterations
                  <input
                    aria-label="최대 반복 횟수"
                    type="number"
                    min="1"
                    max={module === 'nonlinear-fit' ? 2000 : 20000}
                    value={
                      draft.options.maxIterations ??
                      (module === 'nonlinear-fit' ? 250 : 1000)
                    }
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        options: {
                          ...draft.options,
                          maxIterations: Number(e.target.value),
                        },
                      })
                    }
                  />
                </label>
              )}
              <details className="science-help">
                <summary>설정을 해석하는 방법</summary>
                {settingDescriptions[module].map((text) => (
                  <p key={text}>{text}</p>
                ))}
              </details>
              <button
                type="button"
                className="science-secondary"
                onClick={() => {
                  start()
                  setScreen('report')
                }}
              >
                Compute & Report
              </button>
            </aside>
          </main>
        )}
        {screen !== 'model' && (
          <main className="scientific-results" aria-busy={pending}>
            <div className="science-status">
              <span>
                {pending
                  ? '계산 중…'
                  : stale
                    ? '입력이 바뀌었습니다. 다시 계산해 주세요.'
                    : result?.status === 'stopped'
                      ? '계산 중단 · 진단 확인'
                      : result
                        ? '계산 완료'
                        : '모델을 입력해 주세요.'}
              </span>
              <button
                type="button"
                className="science-primary"
                onClick={() => start()}
              >
                <Play size={14} />
                다시 계산
              </button>
            </div>
            {parameters.length > 0 && screen === 'simulation' && (
              <section
                className="science-parameters"
                aria-label="과학 모델 파라미터"
              >
                <p>
                  Parameters · 지정 상수를 자동 표시합니다. Remove는 현재 값을
                  고정하고 슬라이더만 숨깁니다. Range는 조절 범위, Sample
                  Spacing은 ± Step 이동 간격입니다. 슬라이더의 현재값은 연속
                  조절합니다.
                </p>
                {parameters
                  .filter((p) => draft.hiddenParameters?.includes(p.name))
                  .map((p) => (
                    <button
                      type="button"
                      key={p.name}
                      onClick={() => hideParameter(p.name, false)}
                    >
                      Restore {p.name} (
                      {format(draft.parameters[p.name] ?? p.value)})
                    </button>
                  ))}
                {visibleParameters.map((p) => {
                  const val = draft.parameters[p.name] ?? p.value,
                    r = draft.ranges?.[p.name] ?? defaultParameterRange(p.value)
                  return (
                    <div key={p.name}>
                      <button
                        type="button"
                        onClick={() => hideParameter(p.name, true)}
                        aria-label={`${p.name} Remove Parameter`}
                      >
                        Remove · {p.name}
                      </button>
                      <label>
                        {p.name}
                        <input
                          aria-label={`${p.name} 과학 파라미터 값`}
                          type="number"
                          step="any"
                          value={val}
                          onChange={(e) => {
                            if (e.target.value !== '')
                              editParameter(p.name, Number(e.target.value))
                          }}
                        />
                      </label>
                      <input
                        aria-label={`${p.name} 과학 파라미터 슬라이더`}
                        type="range"
                        min={Math.min(r.min, val)}
                        max={Math.max(r.max, val)}
                        step="any"
                        value={val}
                        onChange={(e) =>
                          editParameter(p.name, Number(e.target.value))
                        }
                      />
                      <details>
                        <summary>Range & Sample Spacing</summary>
                        <label>
                          Sample Spacing
                          <input
                            aria-label={`${p.name} Sample Spacing`}
                            type="number"
                            step="any"
                            min="0"
                            value={r.step}
                            onChange={(e) =>
                              setRange(p.name, {
                                ...r,
                                step: Number(e.target.value),
                              })
                            }
                          />
                        </label>
                        <label>
                          최소
                          <input
                            type="number"
                            step="any"
                            value={r.min}
                            onChange={(e) => {
                              const v = Number(e.target.value)
                              if (Number.isFinite(v) && v < r.max)
                                setRange(p.name, { ...r, min: v })
                            }}
                          />
                        </label>
                        <label>
                          최대
                          <input
                            type="number"
                            step="any"
                            value={r.max}
                            onChange={(e) => {
                              const v = Number(e.target.value)
                              if (Number.isFinite(v) && v > r.min)
                                setRange(p.name, { ...r, max: v })
                            }}
                          />
                        </label>
                      </details>
                      <button
                        type="button"
                        onClick={() =>
                          editParameter(p.name, Math.max(r.min, val - r.step))
                        }
                      >
                        − Step
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          editParameter(p.name, Math.min(r.max, val + r.step))
                        }
                      >
                        + Step
                      </button>
                    </div>
                  )
                })}
              </section>
            )}
            {result && screen === 'simulation' && (
              <section
                className={`science-panel science-visualization${pending || stale ? ' is-stale' : ''}`}
              >
                <div className="science-section-title">
                  <h2>
                    {module === 'ode'
                      ? 'Time Series'
                      : module === 'integration'
                        ? 'Integration'
                        : 'Output'}
                  </h2>
                  <div className="science-plot-switch">
                    {module === 'ode' && result.columns.length > 2 ? (
                      <>
                        <button
                          type="button"
                          aria-pressed={!phase}
                          onClick={() => setPhase(false)}
                        >
                          Time Series
                        </button>
                        <button
                          type="button"
                          aria-pressed={phase}
                          onClick={() => setPhase(true)}
                        >
                          Phase Plot
                        </button>
                        {phase && (
                          <>
                            <label className="ivc-axis-select">
                              X Axis
                              <select
                                aria-label="위상 X 변수"
                                value={phaseX}
                                onChange={(e) =>
                                  setPhaseX(Number(e.target.value))
                                }
                              >
                                {result.columns.slice(1).map((x, i) => (
                                  <option key={i} value={i + 1}>
                                    {x}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="ivc-axis-select">
                              Y Axis
                              <select
                                aria-label="위상 Y 변수"
                                value={phaseY}
                                onChange={(e) =>
                                  setPhaseY(Number(e.target.value))
                                }
                              >
                                {result.columns.slice(1).map((x, i) => (
                                  <option key={i} value={i + 1}>
                                    {x}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </>
                        )}
                      </>
                    ) : null}
                    {module === 'lsq' && (
                      <>
                        <button
                          type="button"
                          aria-pressed={plotGroup === 'model'}
                          onClick={() => setPlotGroup('model')}
                        >
                          Data & Fit
                        </button>
                        <button
                          type="button"
                          aria-pressed={plotGroup === 'convergence'}
                          onClick={() => setPlotGroup('convergence')}
                        >
                          Convergence
                        </button>
                      </>
                    )}
                    {module === 'integration' ? (
                      <>
                        <button
                          type="button"
                          aria-pressed={plotGroup === 'model'}
                          onClick={() => setPlotGroup('model')}
                        >
                          Data & Interpolation
                        </button>
                        <button
                          type="button"
                          aria-pressed={plotGroup === 'cumulative'}
                          onClick={() => setPlotGroup('cumulative')}
                        >
                          Cumulative Integral
                        </button>
                      </>
                    ) : (
                      result.series.some((s) =>
                        /잔차|residual|오차/.test(s.name),
                      ) && (
                        <>
                          <button
                            type="button"
                            aria-pressed={plotGroup === 'model'}
                            onClick={() => setPlotGroup('model')}
                          >
                            Data & Model
                          </button>
                          <button
                            type="button"
                            aria-pressed={plotGroup === 'residual'}
                            onClick={() => setPlotGroup('residual')}
                          >
                            Error
                          </button>
                        </>
                      )
                    )}
                  </div>
                </div>
                {module === 'integration' && (
                  <IntegralFormula result={result} />
                )}
                <ScientificChart
                  series={plotted}
                  yLabel={
                    phase
                      ? result.columns[phaseY]
                      : module === 'integration'
                        ? plotGroup === 'cumulative'
                          ? `I(${result.integration?.independent ?? result.columns[0]})`
                          : result.integration?.dependent
                        : plotGroup === 'residual'
                          ? 'Prediction Error'
                          : module === 'optimization' ||
                              plotGroup === 'convergence'
                            ? 'Objective'
                            : module === 'ode'
                              ? 'State Value'
                              : 'Response'
                  }
                  area={
                    module === 'integration' &&
                    plotGroup !== 'cumulative' &&
                    result.integration
                      ? {
                          from: result.integration.from,
                          to: result.integration.to,
                          seriesName: plotted.find((s) => s.style !== 'points')
                            ?.name,
                        }
                      : undefined
                  }
                  xLabel={
                    phase
                      ? result.columns[phaseX]
                      : (plotted[0]?.axisLabel ?? result.columns[0])
                  }
                  cursorIndex={module === 'ode' ? cursor : undefined}
                  onSelectIndex={module === 'ode' ? setCursor : undefined}
                />
                {module === 'ode' && result.rows.length > 0 && (
                  <div className="science-playback">
                    <button
                      type="button"
                      aria-label={playing ? '재생 일시정지' : '시간 변화 재생'}
                      onClick={() => {
                        if (cursor >= result.rows.length - 1) setCursor(0)
                        setPlaying((x) => !x)
                      }}
                    >
                      {playing ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <input
                      aria-label="ODE 시점 선택"
                      type="range"
                      min="0"
                      max={result.rows.length - 1}
                      step="1"
                      value={cursor}
                      onChange={(e) => {
                        setPlaying(false)
                        setCursor(Number(e.target.value))
                      }}
                    />
                    <div className="science-current-values">
                      {result.columns.slice(0, 7).map((name, i) => (
                        <span key={name}>
                          {name} <b>{format(fieldValues?.[i] ?? 0)}</b>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <details className="science-data">
                  <summary>Data Table · {result.rows.length} rows</summary>
                  <button
                    type="button"
                    disabled={stale || pending}
                    onClick={() =>
                      download(
                        `ivc-${module}-data.csv`,
                        '\uFEFF' + encodeCsv([result.columns, ...result.rows]),
                        'text/csv',
                      )
                    }
                  >
                    <Download size={14} />
                    CSV 저장
                  </button>
                  {result.rows.length > 100 && (
                    <div className="science-pagination">
                      <button
                        type="button"
                        disabled={dataPage === 0}
                        onClick={() => setDataPage((x) => x - 1)}
                      >
                        이전 100행
                      </button>
                      <span>
                        {dataPage * 100 + 1}–
                        {Math.min((dataPage + 1) * 100, result.rows.length)} /{' '}
                        {result.rows.length}
                      </span>
                      <button
                        type="button"
                        disabled={(dataPage + 1) * 100 >= result.rows.length}
                        onClick={() => setDataPage((x) => x + 1)}
                      >
                        다음 100행
                      </button>
                    </div>
                  )}
                  <div className="science-table-scroll">
                    <table>
                      <thead>
                        <tr>
                          {result.columns.map((x, i) => (
                            <th key={i}>{x}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.rows
                          .slice(dataPage * 100, (dataPage + 1) * 100)
                          .map((row, i) => (
                            <tr
                              key={dataPage * 100 + i}
                              className={
                                module === 'ode' &&
                                dataPage * 100 + i === cursor
                                  ? 'is-current'
                                  : ''
                              }
                              onClick={() =>
                                module === 'ode' &&
                                setCursor(dataPage * 100 + i)
                              }
                            >
                              {row.map((x, j) => (
                                <td key={j}>{format(x)}</td>
                              ))}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </section>
            )}
            {screen === 'report' && result && (
              <section className="science-panel science-report">
                <div className="science-section-title">
                  <h1>Report</h1>
                  <button
                    type="button"
                    disabled={!reportResult}
                    onClick={exportReport}
                  >
                    <Download size={16} />
                    Save Report
                  </button>
                </div>
                {!reportResult ? (
                  <p>현재 입력의 계산이 완료되면 지표를 표시합니다.</p>
                ) : (
                  <>
                    <div
                      className={`science-verdict ${result.status === 'stopped' ? 'is-stopped' : ''}`}
                    >
                      <strong>
                        {result.status === 'stopped'
                          ? 'Stopped'
                          : result.status === 'converged'
                            ? 'Converged'
                            : 'Completed'}
                      </strong>
                      <span>{result.message ?? result.method}</span>
                    </div>
                    {['curve-fit', 'multilinear', 'nonlinear-fit'].includes(
                      module,
                    ) ? (
                      <>
                        <RegressionResult result={result} />
                        {module === 'curve-fit' && (
                          <PolynomialComparison
                            result={result}
                            onCompare={(compareDegrees) => {
                              const next = {
                                ...draft,
                                options: { ...draft.options, compareDegrees },
                              }
                              setDraft(next)
                              start(next)
                            }}
                            onApply={(degree) => {
                              if (!polyfit) return
                              const command = `polyfit ${polyfit[1]} ${polyfit[2]} ${degree}${polyfit[4] ? ' origin' : ''}`
                              const next = {
                                ...draft,
                                source:
                                  draft.source.slice(0, polyfit.index) +
                                  command +
                                  draft.source.slice(
                                    polyfit.index + polyfit[0].length,
                                  ),
                              }
                              setDraft(next)
                              start(next)
                            }}
                          />
                        )}
                      </>
                    ) : (
                      <>
                        <ScientificOutput
                          result={result}
                          source={draft.source}
                          options={draft.options}
                        />
                        {module === 'lsq' && (
                          <RegressionResidualPlot result={result} />
                        )}
                      </>
                    )}
                  </>
                )}
              </section>
            )}
            {result?.warnings.length && (!stale || pending) ? (
              <details
                className="science-warning"
                open={result.status === 'stopped'}
              >
                <summary>확인할 사항 · {result.warnings.length}</summary>
                {result.warnings.map((w, i) => (
                  <p key={i}>{w}</p>
                ))}
              </details>
            ) : null}
          </main>
        )}
        {toast && (
          <div role="status" className="science-toast">
            {toast}
            {undoDraft && (
              <button
                type="button"
                onClick={() => {
                  const previous = undoDraft
                  setUndoDraft(null)
                  setDraft(previous)
                  start(previous)
                  setToast('이전 모델을 복원했습니다.')
                }}
              >
                Undo New
              </button>
            )}
          </div>
        )}
        {guide && (
          <ModuleGuide initialTopic={module} onClose={() => setGuide(false)} />
        )}
      </div>
    </AxisTransformProvider>
  )
}
```

<a id="source-17"></a>

## src/components/ScientificWorkspace.css

원본: [src/components/ScientificWorkspace.css](../../src/components/ScientificWorkspace.css) · 650줄 · SHA-256: `2bcb183964d064763ad47911acb95d9cadc15cadbb233759a5bc549270b155c4`

```css
.scientific-workspace {
  min-height: 100vh;
  background: #f7f9f5;
  color: #30473c;
  padding: 0 28px 30px;
  font-family: 'Noto Sans KR', sans-serif;
}
.scientific-header {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  min-height: 68px;
  border-bottom: 1px solid #e3e9df;
  padding: 10px 0;
  font-size: 12px;
}
.scientific-header strong {
  font-size: 18px;
  flex: 1;
}
.scientific-header button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 5px;
}
.scientific-header button:hover {
  background: #edf3e9;
}
.scientific-navigation {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 16px 0 22px;
}
.scientific-navigation > button {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border: 1px solid transparent;
  border-radius: 7px;
  color: #87978c;
  font-size: 13px;
}
.scientific-navigation > button span {
  font: 11px monospace;
  opacity: 0.7;
}
.scientific-navigation > button[aria-current='page'] {
  background: #ebf2e7;
  border-color: #dce7d4;
  color: #367361;
  font-weight: 600;
}
.scientific-navigation > label {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #7e8d81;
}
.scientific-workspace select,
.scientific-workspace input[type='number'] {
  border: 1px solid #d8e2d3;
  border-radius: 5px;
  background: #fff;
  padding: 8px 10px;
  color: #42674f;
  font-size: 12px;
  max-width: 100%;
  min-width: 0;
}
.scientific-model {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(270px, 1fr);
  gap: 20px;
  align-items: start;
}
.science-panel {
  min-width: 0;
  background: #fffffd;
  border: 1px solid #dfe7dc;
  border-radius: 10px;
  padding: 22px;
}
.science-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 15px;
}
.science-section-title h1,
.science-section-title h2,
.science-panel > h2 {
  font-size: 18px;
  font-weight: 650;
  margin: 0;
  color: #344d40;
}
.science-description {
  font-size: 13px;
  line-height: 1.9;
  color: #819080;
  margin-bottom: 22px;
}
.science-editor-label {
  display: block;
  font-size: 12px;
  color: #6e826f;
  margin-bottom: 9px;
}
.scientific-model textarea {
  display: block;
  width: 100%;
  min-height: 390px;
  max-height: 65vh;
  resize: vertical;
  border: 1px solid #e0e7dc;
  border-radius: 6px;
  background: #f7f9f4;
  padding: 18px;
  line-height: 1.95;
  font:
    12px/1.95 'IBM Plex Mono',
    monospace;
  color: #356770;
  tab-size: 2;
  white-space: pre;
  overflow-wrap: normal;
}
.science-model-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 20px;
}
.science-model-actions > span {
  font-size: 10px;
  color: #9ba78f;
}
.science-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 17px;
  background: #427f70;
  border: 1px solid #427f70;
  border-radius: 5px;
  color: #fff;
  font-size: 12px;
  min-height: 39px;
}
.science-primary:hover {
  background: #326b5c;
}
.science-secondary {
  border: 1px solid #dce5d5;
  padding: 10px 15px;
  border-radius: 5px;
  font-size: 12px;
  color: #51715b;
  background: #f5f8f1;
}
.science-panel > label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12px;
  color: #71856d;
  margin: 18px 0;
}
.science-panel > .science-secondary {
  width: 100%;
  margin-top: 20px;
}
.science-status {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: space-between;
  margin: 0 0 14px;
  font-size: 12px;
  color: #7b8a79;
  min-height: 40px;
}
.scientific-results {
  overflow-anchor: none;
}
.science-parameters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px 28px;
  padding: 15px 20px;
  margin-bottom: 14px;
  border: 1px solid #dfe8d8;
  border-radius: 8px;
  background: #f4f8ef;
}
.science-parameters > div {
  min-width: 0;
}
.science-parameters > p {
  grid-column: 1 / -1;
  margin: 0;
  font-size: 12px;
  line-height: 1.8;
}
.science-parameters label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  color: #5f795d;
}
.science-parameters input[type='number'] {
  width: 95px;
  padding: 5px 7px;
  font: 11px monospace;
}
.science-parameters input[type='range'] {
  width: 100%;
  accent-color: #658f74;
  display: block;
  margin: 12px 0 5px;
  height: 5px;
}
.science-parameters details {
  font-size: 10px;
  color: #8a9c7e;
}
.science-parameters summary {
  cursor: pointer;
}
.science-parameters details label {
  margin-top: 7px;
}
.science-visualization.is-stale {
  opacity: 0.6;
}
.science-plot-switch {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
  font-size: 12px;
}
.science-plot-switch button {
  padding: 7px 10px;
  border: 1px solid #e0e8db;
  border-radius: 5px;
  color: #78906d;
}
.science-plot-switch button[aria-pressed='true'] {
  background: #eef4e8;
  color: #3d775d;
  border-color: #bdd2b1;
}
.science-playback {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
  padding: 15px 0;
  border-top: 1px solid #e9eee3;
  margin-top: 15px;
}
.science-playback > button {
  color: #3c7862;
  padding: 9px;
  border: 1px solid #cfdcc8;
  border-radius: 5px;
  display: flex;
}
.science-playback > input {
  flex: 1;
  min-width: 180px;
  accent-color: #4c836c;
}
.science-current-values {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 11px;
  color: #829078;
}
.science-current-values b {
  font-family: monospace;
  color: #3b7057;
  margin-left: 6px;
}
.science-data {
  border-top: 1px solid #e4ebdd;
  margin-top: 20px;
  padding-top: 15px;
  font-size: 12px;
  color: #668260;
}
.science-data summary {
  cursor: pointer;
  margin-bottom: 12px;
}
.science-data > button {
  display: flex;
  gap: 6px;
  align-items: center;
  border: 1px solid #dbe5d3;
  border-radius: 5px;
  padding: 7px 11px;
  margin-bottom: 12px;
  font-size: 12px;
}
.science-table-scroll {
  overflow: auto;
  max-height: 410px;
}
.science-data table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.science-data th,
.science-data td {
  padding: 9px 12px;
  text-align: right;
  border-bottom: 1px solid #e6ecdf;
  white-space: nowrap;
  font:
    11px/1.7 'IBM Plex Mono',
    monospace;
}
.science-data th {
  color: #6a8261;
  background: #f3f7ed;
  position: sticky;
  top: 0;
}
.science-data tr.is-current {
  background: #edf6e7;
}
.science-metric-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 13px;
  margin: 22px 0;
}
.science-metric-grid article {
  padding: 20px 16px;
  border: 1px solid #dfe7d7;
  background: #f8faf4;
  border-radius: 8px;
  min-width: 0;
}
.science-metric-grid article > span {
  font-size: 12px;
  color: #798b70;
}
.science-metric-grid strong {
  display: block;
  font:
    500 clamp(20px, 2.3vw, 31px) / 1.5 'IBM Plex Mono',
    monospace;
  color: #4f7659;
  margin: 12px 0;
  overflow-wrap: anywhere;
}
.science-metric-grid details {
  font-size: 11px;
  color: #6f8666;
  line-height: 1.8;
}
.science-metric-grid summary {
  cursor: pointer;
}
.science-metric-grid p {
  margin-top: 9px;
}
.science-formula {
  padding: 14px 18px;
  background: #f2f6ec;
  border-radius: 6px;
  overflow-wrap: anywhere;
  color: #3e7562;
  font: 13px/1.9 monospace;
}
.science-verdict {
  padding: 12px 0;
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
  font-size: 12px;
  color: #7c8c73;
}
.science-verdict strong {
  color: #4b7955;
  font-size: 16px;
}
.science-verdict.is-stopped strong {
  color: #ad733c;
}
.science-report .science-section-title > button {
  display: flex;
  align-items: center;
  gap: 7px;
  border: 1px solid #dce5d6;
  border-radius: 5px;
  padding: 9px 12px;
  font-size: 12px;
}
.science-error,
.science-warning {
  padding: 15px 19px;
  margin-bottom: 17px;
  border: 1px solid #e7cfb4;
  background: #fff8ec;
  border-radius: 7px;
  color: #926338;
  font-size: 12px;
  line-height: 1.9;
  overflow-wrap: anywhere;
}
.science-warning {
  margin-top: 18px;
}
.science-warning summary {
  cursor: pointer;
}
.science-warning p {
  margin-top: 8px;
}
.science-toast {
  position: fixed;
  bottom: 25px;
  left: 50%;
  transform: translateX(-50%);
  background: #385f49;
  color: white;
  border-radius: 7px;
  padding: 13px 20px;
  font-size: 12px;
  z-index: 100;
}
.science-modal-backdrop {
  position: fixed;
  inset: 0;
  background: #1d34246b;
  z-index: 90;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 25px;
}
.science-guide-modal {
  position: relative;
  width: min(900px, 95vw);
  max-height: 90vh;
  overflow: auto;
  background: #fffffc;
  border: 1px solid #dfe6d6;
  border-radius: 15px;
  padding: 38px;
  box-shadow: 0 25px 90px #213b2633;
}
.science-guide-modal h2 {
  font-size: 23px;
  margin: 5px 0 22px;
}
.science-guide-modal h3 {
  font-size: 16px;
  margin: 20px 0;
}
.science-guide-modal p {
  font-size: 13px;
  line-height: 1.9;
  margin: 14px 0;
  color: #718067;
}
.science-guide-modal table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.science-guide-modal th,
.science-guide-modal td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e2e9d9;
  line-height: 1.9;
}
.science-guide-modal th {
  width: 130px;
  color: #54704d;
}
.science-guide-modal pre,
.science-report pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  background: #f4f7ef;
  border-radius: 7px;
  padding: 17px;
  font: 12px/1.9 monospace;
  color: #496e56;
}
.science-guide-close {
  position: absolute;
  right: 18px;
  top: 18px;
  color: #7e8b73;
  display: flex;
}
.scientific-workspace button:focus-visible,
.scientific-workspace summary:focus-visible {
  outline: 2px solid #548b70;
  outline-offset: 3px;
}
.scientific-workspace button:disabled {
  opacity: 0.5;
  cursor: default;
}
@media (min-width: 1800px) {
  .scientific-model {
    max-width: 1600px;
    margin: auto;
  }
}
@media (max-width: 850px) {
  .scientific-model {
    grid-template-columns: 1fr;
  }
  .science-metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .scientific-header strong {
    flex-basis: 55%;
  }
  .science-panel {
    padding: 18px;
  }
  .scientific-workspace {
    padding: 0 15px 25px;
  }
}
@media (max-width: 550px) {
  .scientific-workspace {
    padding: 0 8px 20px;
  }
  .scientific-header {
    gap: 6px;
  }
  .scientific-header strong {
    font-size: 15px;
  }
  .scientific-header button {
    font-size: 10px;
  }
  .scientific-navigation {
    gap: 3px;
    padding: 10px 0 16px;
  }
  .scientific-navigation > button {
    font-size: 11px;
    padding: 10px;
  }
  .scientific-navigation > label {
    width: 100%;
    justify-content: flex-end;
    font-size: 11px;
  }
  .science-panel {
    padding: 15px 11px;
  }
  .scientific-model textarea {
    font-size: 11px;
    min-height: 350px;
  }
  .science-section-title {
    gap: 9px;
  }
  .science-section-title h1,
  .science-section-title h2 {
    font-size: 16px;
  }
  .science-metric-grid {
    grid-template-columns: 1fr;
  }
  .science-parameters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 15px;
    padding: 13px 10px;
  }
  .science-parameters label {
    font-size: 11px;
    gap: 5px;
  }
  .science-parameters input[type='number'] {
    width: 65px;
  }
  .science-guide-modal {
    padding: 28px 15px;
  }
  .science-guide-modal th,
  .science-guide-modal td {
    padding: 9px 5px;
  }
  .science-guide-modal th {
    width: 90px;
  }
  .science-modal-backdrop {
    padding: 8px;
  }
  .science-playback {
    gap: 9px;
  }
  .science-current-values {
    gap: 10px;
  }
}
.science-pagination {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin: 10px 0;
  font-size: 11px;
}
.science-pagination button {
  padding: 7px 10px;
  border: 1px solid #dce6d5;
  border-radius: 5px;
}
.science-data > button:disabled {
  opacity: 0.45;
}
.science-guide-modal td {
  overflow-wrap: anywhere;
}
.science-guide-modal code {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
```

<a id="source-18"></a>

## src/components/ScientificChart.tsx

원본: [src/components/ScientificChart.tsx](../../src/components/ScientificChart.tsx) · 648줄 · SHA-256: `875b98e41229f2cd998b41618d9df9842817732b46016d146e76405af01089d0`

```tsx
import AxisTransforms, { useAxisTransform } from './AxisTransforms'
import {
  identityAxes,
  transformSeries,
  type AxisTransform,
} from '../axis-transform'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ScientificSeries } from '../engine/scientific/types'
import {
  identitySegment,
  integrationAreaPolygons,
} from './scientific-chart-geometry'
import './ScientificChart.css'
const colors = [
  '#376eae',
  '#b37836',
  '#7961a8',
  '#368078',
  '#a85773',
  '#6c8039',
]
const num = (x: number) =>
  Math.abs(x) > 1e5 || (x !== 0 && Math.abs(x) < 0.001)
    ? x.toExponential(3)
    : Number(x.toPrecision(5)).toString()
type Props = {
  series: ScientificSeries[]
  axisValue?: AxisTransform
  hideAxisControls?: boolean
  onSelectPoint?: (seriesIndex: number, pointIndex: number) => void
  xLabel?: string
  yLabel?: string
  area?: { from: number; to: number; seriesName?: string }
  identityLine?: boolean
  zeroLine?: boolean
  cursorIndex?: number
  onSelectIndex?: (i: number) => void
}
export default function ScientificChart({
  series: rawSeries,
  axisValue,
  hideAxisControls = false,
  onSelectPoint,
  xLabel = '',
  yLabel = '',
  area: rawArea,
  identityLine: rawIdentityLine = false,
  zeroLine: rawZeroLine = false,
  cursorIndex,
  onSelectIndex,
}: Props) {
  const [savedAxes, setAxes] = useAxisTransform(
    `science:${xLabel}:${yLabel}:${rawSeries.map((s) => s.name).join('|')}`,
  )
  const axes = axisValue ?? savedAxes
  const changedAxes = !identityAxes(axes)
  const area = changedAxes ? undefined : rawArea
  const identityLine = !changedAxes && rawIdentityLine
  const zeroLine = !changedAxes && rawZeroLine
  const series = useMemo(() => {
    if (!changedAxes) return rawSeries
    let data = rawSeries
    if (rawZeroLine) {
      const xs = rawSeries.flatMap((s) => s.x).filter(Number.isFinite)
      const lo = xs.reduce((a, b) => Math.min(a, b), Infinity),
        hi = xs.reduce((a, b) => Math.max(a, b), -Infinity)
      if (Number.isFinite(lo) && Number.isFinite(hi)) {
        const x = Array.from(
          { length: 201 },
          (_, i) => lo * (1 - i / 200) + (hi * i) / 200,
        )
        data = [
          ...data,
          { name: 'Reference: original residual = 0', x, y: x.map(() => 0) },
        ]
      }
    }
    if (rawIdentityLine) {
      const finite = rawSeries
        .flatMap((s) => [...s.x, ...s.y])
        .filter(Number.isFinite)
      const lo = finite.reduce((a, b) => Math.min(a, b), Infinity),
        hi = finite.reduce((a, b) => Math.max(a, b), -Infinity)
      if (Number.isFinite(lo) && Number.isFinite(hi)) {
        const v = Array.from(
          { length: 201 },
          (_, i) => lo * (1 - i / 200) + (hi * i) / 200,
        )
        data = [...data, { name: 'Reference: original y=x', x: v, y: v }]
      }
    }
    return transformSeries(data, axes)
  }, [rawSeries, axes.x, axes.y, changedAxes, rawIdentityLine, rawZeroLine])
  const omitted = changedAxes
    ? series.reduce(
        (n, s) =>
          n +
          s.x.filter((x, i) => !Number.isFinite(x) || !Number.isFinite(s.y[i]))
            .length,
        0,
      )
    : 0
  const displayX = changedAxes
    ? `${axes.x} [x: ${xLabel || 'x'}, y: ${yLabel || 'y'}]`
    : xLabel
  const displayY = changedAxes ? axes.y : yLabel
  const container = useRef<HTMLDivElement>(null),
    svg = useRef<SVGSVGElement>(null)
  const clip = `science-plot-${useId()}`
  const hoverFrame = useRef<number | null>(null)
  const pointer = useRef<{ x: number; y: number } | null>(null)
  const latestSeries = useRef(series)
  latestSeries.current = series
  const [size, setSize] = useState({ width: 900, height: 450 }),
    [hidden, setHidden] = useState<string[]>([])
  const [zoom, setZoom] = useState({ l: 0, r: 1, b: 0, t: 1 }),
    [hover, setHover] = useState<{
      s: number
      i: number
      source: ScientificSeries[]
    } | null>(null)
  const [axis, setAxis] = useState('both')
  useEffect(() => {
    const el = container.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: Math.max(280, entry.contentRect.width),
        height: Math.max(280, entry.contentRect.height),
      }),
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  function cancelHoverFrame() {
    if (hoverFrame.current !== null) cancelAnimationFrame(hoverFrame.current)
    hoverFrame.current = null
    pointer.current = null
  }
  function clearHover() {
    cancelHoverFrame()
    setHover(null)
  }
  useEffect(() => {
    setZoom({ l: 0, r: 1, b: 0, t: 1 })
    cancelHoverFrame()
    setHover(null)
    setHidden([])
  }, [series])
  useEffect(() => () => cancelHoverFrame(), [])
  const bounds = useMemo(() => {
    let xmin = Infinity,
      xmax = -Infinity,
      ymin = Infinity,
      ymax = -Infinity
    for (const s of series)
      for (let i = 0; i < s.x.length; i++) {
        const x = s.x[i],
          y = s.y[i]
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue
        xmin = Math.min(xmin, x)
        xmax = Math.max(xmax, x)
        ymin = Math.min(ymin, y)
        ymax = Math.max(ymax, y)
      }
    if (!Number.isFinite(xmin)) return null
    if (area || zeroLine) {
      ymin = Math.min(ymin, 0)
      ymax = Math.max(ymax, 0)
    }
    const xs = Math.max(Math.abs(xmin), Math.abs(xmax)) || 1,
      ys = Math.max(Math.abs(ymin), Math.abs(ymax)) || 1
    let x0 = xmin / xs,
      x1 = xmax / xs,
      y0 = ymin / ys,
      y1 = ymax / ys
    const dx = x1 - x0 || Math.max(0.2, Math.abs(x0) * 0.2),
      dy = y1 - y0 || Math.max(0.2, Math.abs(y0) * 0.2)
    x0 -= dx * 0.03
    x1 += dx * 0.03
    y0 -= dy * 0.08
    y1 += dy * 0.08
    return { xs, ys, x0, x1, y0, y1 }
  }, [series, area, zeroLine])
  const width = size.width,
    height = size.height,
    left = 70,
    right = width - 22,
    top = 30,
    bottom = height - 55
  const plotWidth = Math.max(1, right - left),
    plotHeight = Math.max(1, bottom - top)
  const geometry = useMemo(() => {
    if (!bounds) return null
    const x0 = bounds.x0 + (bounds.x1 - bounds.x0) * zoom.l,
      x1 = bounds.x0 + (bounds.x1 - bounds.x0) * zoom.r
    const y0 = bounds.y0 + (bounds.y1 - bounds.y0) * zoom.b,
      y1 = bounds.y0 + (bounds.y1 - bounds.y0) * zoom.t
    return {
      x0,
      x1,
      y0,
      y1,
      x: (x: number) => left + ((x / bounds.xs - x0) / (x1 - x0)) * plotWidth,
      y: (y: number) =>
        bottom - ((y / bounds.ys - y0) / (y1 - y0)) * plotHeight,
    }
  }, [bounds, zoom, width, height])
  const paths = useMemo(
    () =>
      series.map((s) => {
        if (!geometry) return ''
        let path = '',
          connected = false
        for (let i = 0; i < s.x.length; i++) {
          if (!Number.isFinite(s.x[i]) || !Number.isFinite(s.y[i])) {
            connected = false
            continue
          }
          path += `${connected ? 'L' : 'M'}${geometry.x(s.x[i]).toFixed(2)},${geometry.y(s.y[i]).toFixed(2)} `
          connected = true
        }
        return path
      }),
    [series, geometry],
  )
  const areaPolygons = useMemo(() => {
    if (!area || !geometry) return []
    const source = area.seriesName
      ? series.find((s) => s.name === area.seriesName)
      : series.find((s) => s.style !== 'points')
    if (!source || hidden.includes(source.name)) return []
    return integrationAreaPolygons(source.x, source.y, area.from, area.to).map(
      (polygon) => ({
        sign: polygon.sign,
        points: polygon.points
          .map((p) => `${geometry.x(p.x)},${geometry.y(p.y)}`)
          .join(' '),
      }),
    )
  }, [area, series, hidden, geometry])
  const diagonal =
    geometry && bounds && identityLine
      ? identitySegment(
          geometry.x0 * bounds.xs,
          geometry.x1 * bounds.xs,
          geometry.y0 * bounds.ys,
          geometry.y1 * bounds.ys,
        )
      : null
  useEffect(() => {
    const el = svg.current
    if (!el) return
    const wheel = (event: WheelEvent) => {
      if (document.activeElement !== el) return
      event.preventDefault()
      const rect = el.getBoundingClientRect()
      if (!(rect.width > 0) || !(rect.height > 0)) return
      const localX = ((event.clientX - rect.left) * width) / rect.width
      const localY = ((event.clientY - rect.top) * height) / rect.height
      const u = Math.min(1, Math.max(0, (localX - left) / plotWidth)),
        v = 1 - Math.min(1, Math.max(0, (localY - top) / plotHeight))
      const factor = Math.exp(
        Math.max(-100, Math.min(100, event.deltaY)) * 0.0018,
      )
      setZoom((z) => {
        const shift = (a: number, b: number, f: number) => {
          const span = Math.min(12, Math.max(0.0001, (b - a) * factor)),
            center = a + (b - a) * f
          return [center - span * f, center + span * (1 - f)]
        }
        const [l, r] = axis === 'y' ? [z.l, z.r] : shift(z.l, z.r, u),
          [b, t] = axis === 'x' ? [z.b, z.t] : shift(z.b, z.t, v)
        return { l, r, b, t }
      })
    }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => el.removeEventListener('wheel', wheel)
  }, [axis, plotWidth, plotHeight, left, top, width, height])
  function locate(
    clientX: number,
    clientY: number,
  ): { s: number; i: number } | null {
    const rect = svg.current?.getBoundingClientRect()
    if (!rect || !geometry || !(rect.width > 0) || !(rect.height > 0))
      return null
    const x = ((clientX - rect.left) * width) / rect.width,
      y = ((clientY - rect.top) * height) / rect.height
    if (x < left || x > right || y < top || y > bottom) return null
    let nearest: { s: number; i: number } | null = null,
      dist = Infinity
    series.forEach((s, si) => {
      if (hidden.includes(s.name)) return
      for (let i = 0; i < Math.min(s.x.length, s.y.length); i++) {
        if (!Number.isFinite(s.x[i]) || !Number.isFinite(s.y[i])) continue
        const dx = geometry.x(s.x[i]) - x,
          dy = geometry.y(s.y[i]) - y,
          d = dx * dx + dy * dy
        if (d < dist) {
          dist = d
          nearest = { s: si, i }
        }
      }
    })
    return nearest
  }
  const latestLocate = useRef(locate)
  latestLocate.current = locate
  function selectHover(point: { s: number; i: number } | null) {
    setHover((previous) => {
      if (!point) return null
      if (
        previous?.source === series &&
        previous.s === point.s &&
        previous.i === point.i
      )
        return previous
      return { ...point, source: series }
    })
  }
  function scheduleHover(clientX: number, clientY: number) {
    pointer.current = { x: clientX, y: clientY }
    if (hoverFrame.current !== null) return
    const source = series
    hoverFrame.current = requestAnimationFrame(() => {
      hoverFrame.current = null
      if (latestSeries.current !== source || !pointer.current) return
      selectHover(latestLocate.current(pointer.current.x, pointer.current.y))
    })
  }
  // An effect cannot clear a previous point before the first render with new
  // data. Bind hover state to its data array and validate both coordinates.
  const hoverSeries = hover?.source === series ? series[hover.s] : undefined
  const hovered =
    hover &&
    hoverSeries &&
    !hidden.includes(hoverSeries.name) &&
    Number.isInteger(hover.i) &&
    hover.i >= 0 &&
    Number.isFinite(hoverSeries.x[hover.i]) &&
    Number.isFinite(hoverSeries.y[hover.i])
      ? {
          name: hoverSeries.name,
          x: hoverSeries.x[hover.i],
          y: hoverSeries.y[hover.i],
        }
      : null
  return (
    <div className="scientific-chart">
      {!hideAxisControls && <AxisTransforms value={axes} onChange={setAxes} />}
      {changedAxes && (
        <p className="science-help" role="status">
          Display transform · 원본 결과 유지
          {omitted ? ` · 정의역 밖 ${omitted}개 지점은 표시하지 않습니다.` : ''}
          {rawArea
            ? ' · 변환된 좌표의 면적은 원래 적분이 아니므로 음영을 생략합니다.'
            : ''}
        </p>
      )}
      <div className="science-chart-tools">
        <div className="science-chart-legend">
          {series.map((s, i) => (
            <button
              key={s.name}
              type="button"
              aria-pressed={!hidden.includes(s.name)}
              onClick={() =>
                setHidden((h) =>
                  h.includes(s.name)
                    ? h.filter((x) => x !== s.name)
                    : [...h, s.name],
                )
              }
            >
              <i style={{ background: s.color ?? colors[i % colors.length] }} />
              {s.name}
            </button>
          ))}
        </div>
        <label>
          Zoom{' '}
          <select
            aria-label="시각화 확대 축"
            value={axis}
            onChange={(e) => setAxis(e.target.value)}
          >
            <option value="both">X & Y</option>
            <option value="x">X</option>
            <option value="y">Y</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => setZoom({ l: 0, r: 1, b: 0, t: 1 })}
        >
          Reset
        </button>
      </div>
      <div className="scientific-chart-stage" ref={container}>
        <svg
          ref={svg}
          role="img"
          aria-label={`X: ${displayX || 'x'}, Y: ${displayY || 'y'}${identityLine ? ', y = x reference' : ''}${zeroLine ? ', residual zero reference' : ''}`}
          tabIndex={0}
          width={width}
          height={height}
          onPointerMove={(e) => scheduleHover(e.clientX, e.clientY)}
          onPointerLeave={clearHover}
          onBlur={clearHover}
          onPointerDown={(e) => {
            e.preventDefault()
            svg.current?.focus({ preventScroll: true })
            cancelHoverFrame()
            const p = locate(e.clientX, e.clientY)
            selectHover(p)
            if (p) {
              if (p.s < rawSeries.length) {
                onSelectIndex?.(p.i)
                onSelectPoint?.(p.s, p.i)
              }
            }
          }}
          onKeyDown={(e) => {
            if (
              onSelectIndex &&
              (e.key === 'ArrowLeft' || e.key === 'ArrowRight')
            ) {
              e.preventDefault()
              const first = series[0]
              const count = first ? Math.min(first.x.length, first.y.length) : 0
              if (!count) return
              const current = Number.isInteger(cursorIndex)
                ? Math.max(0, Math.min(count - 1, cursorIndex!))
                : 0
              onSelectIndex(
                Math.max(
                  0,
                  Math.min(
                    count - 1,
                    current + (e.key === 'ArrowRight' ? 1 : -1),
                  ),
                ),
              )
            }
          }}
        >
          <defs>
            <clipPath id={clip}>
              <rect x={left} y={top} width={plotWidth} height={plotHeight} />
            </clipPath>
          </defs>
          {geometry &&
            bounds &&
            Array.from({ length: width < 500 ? 3 : 5 }, (_, i) => {
              const f = i / (width < 500 ? 2 : 4),
                x = left + f * plotWidth,
                y = bottom - f * plotHeight
              return (
                <g key={i}>
                  <line
                    x1={left}
                    y1={y}
                    x2={right}
                    y2={y}
                    className="science-grid"
                  />
                  <line
                    x1={x}
                    y1={top}
                    x2={x}
                    y2={bottom}
                    className="science-grid"
                  />
                  <text x={left - 9} y={y + 4} textAnchor="end">
                    {num(
                      (geometry.y0 + f * (geometry.y1 - geometry.y0)) *
                        bounds.ys,
                    )}
                  </text>
                  <text x={x} y={bottom + 23} textAnchor="middle">
                    {num(
                      (geometry.x0 + f * (geometry.x1 - geometry.x0)) *
                        bounds.xs,
                    )}
                  </text>
                </g>
              )
            })}
          <g clipPath={`url(#${clip})`}>
            {zeroLine && !area && geometry && (
              <line
                x1={left}
                y1={geometry.y(0)}
                x2={right}
                y2={geometry.y(0)}
                className="science-zero-line"
                strokeDasharray="6 5"
              />
            )}
            {areaPolygons.map((polygon, i) => (
              <polygon
                key={i}
                points={polygon.points}
                className={
                  polygon.sign > 0
                    ? 'science-area-positive'
                    : 'science-area-negative'
                }
              />
            ))}
            {area && geometry && (
              <>
                <line
                  x1={left}
                  y1={geometry.y(0)}
                  x2={right}
                  y2={geometry.y(0)}
                  className="science-zero-line"
                />
                {[area.from, area.to]
                  .filter(Number.isFinite)
                  .map((value, i) => (
                    <line
                      key={i}
                      x1={geometry.x(value)}
                      y1={top}
                      x2={geometry.x(value)}
                      y2={bottom}
                      className="science-area-limit"
                    />
                  ))}
              </>
            )}
            {diagonal && geometry && (
              <line
                x1={geometry.x(diagonal.from)}
                y1={geometry.y(diagonal.from)}
                x2={geometry.x(diagonal.to)}
                y2={geometry.y(diagonal.to)}
                className="science-identity-line"
              />
            )}
            {series.map((s, i) =>
              hidden.includes(s.name) || !geometry ? null : (
                <g key={s.name}>
                  {s.style !== 'points' && (
                    <path
                      d={paths[i]}
                      fill="none"
                      stroke={s.color ?? colors[i % colors.length]}
                      strokeWidth="2.3"
                    />
                  )}
                  {s.style === 'points' &&
                    s.x.map((x, j) =>
                      j % Math.max(1, Math.ceil(s.x.length / 600)) === 0 &&
                      Number.isFinite(x) &&
                      Number.isFinite(s.y[j]) ? (
                        <circle
                          key={j}
                          cx={geometry.x(x)}
                          cy={geometry.y(s.y[j])}
                          r="3.4"
                          fill="white"
                          stroke={s.color ?? colors[i % colors.length]}
                          strokeWidth="1.7"
                        />
                      ) : null,
                    )}
                  {cursorIndex !== undefined &&
                    Number.isInteger(cursorIndex) &&
                    cursorIndex >= 0 &&
                    Number.isFinite(s.x[cursorIndex]) &&
                    Number.isFinite(s.y[cursorIndex]) && (
                      <circle
                        cx={geometry.x(s.x[cursorIndex])}
                        cy={geometry.y(s.y[cursorIndex])}
                        r="5"
                        fill={s.color ?? colors[i % colors.length]}
                        stroke="white"
                        strokeWidth="2"
                      />
                    )}
                </g>
              ),
            )}
          </g>
          <text
            className="science-axis-label"
            x={(left + right) / 2}
            y={height - 8}
            textAnchor="middle"
          >
            X: {displayX || 'x'}
          </text>
          <text className="science-axis-label" x={left} y={15}>
            Y: {displayY || 'y'}
          </text>
          {!bounds && (
            <text x={width / 2} y={height / 2} textAnchor="middle">
              표시할 계산 결과가 없습니다.
            </text>
          )}
        </svg>
        {hovered && (
          <div className="science-chart-tooltip">
            <strong>{hovered.name}</strong>
            {changedAxes && hover && rawSeries[hover.s] && (
              <span>
                Original: x={num(rawSeries[hover.s].x[hover.i])}, y=
                {num(rawSeries[hover.s].y[hover.i])}
              </span>
            )}
            <span>
              {displayX || 'x'} {num(hovered.x)}
            </span>
            <span>
              {displayY || 'y'} {num(hovered.y)}
            </span>
          </div>
        )}
      </div>
      <details className="science-help">
        <summary>Graph controls</summary>
        <p>
          범례로 곡선을 숨기거나 표시합니다. 그래프를 클릭한 뒤 휠로 확대·축소할
          수 있습니다. 빈 원은 관측값이며 600개를 넘으면 마커 일부만 표시합니다.
          표와 CSV에는 전체 데이터가 포함됩니다. ODE 그래프에서는 클릭하거나
          방향키로 계산 시점을 선택합니다.
        </p>
        {area && (
          <p>
            음영은 지정한 적분 범위에서 곡선과 Y=0 사이의 면적입니다. 파란
            영역은 양의 기여, 주황 영역은 음의 기여입니다. 적분 한계의 순서를
            바꾸면 최종 적분값의 부호가 반대로 바뀝니다.
          </p>
        )}
        {identityLine && (
          <p>
            점선 y=x는 예측값과 관측값이 같은 위치입니다. 점이 점선 위에 있으면
            과대 예측, 아래에 있으면 과소 예측입니다. 두 축은 동일한 물리 단위를
            사용합니다.
          </p>
        )}
      </details>
    </div>
  )
}
```

<a id="source-19"></a>

## src/components/ScientificChart.css

원본: [src/components/ScientificChart.css](../../src/components/ScientificChart.css) · 147줄 · SHA-256: `382ad4ebbc7819f595725928ce327472e7f1572fcd62552c27886d5555e3394b`

```css
.scientific-chart {
  min-width: 0;
  width: 100%;
}
.science-chart-tools {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
  margin: 4px 0 12px;
}
.science-chart-legend {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 8px;
}
.science-chart-legend button {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 6px;
  border-radius: 5px;
  color: #3f4b59;
  background: transparent;
  border: 1px solid transparent;
}
.science-chart-legend button:hover {
  background: #f3f5f8;
}
.science-chart-legend button[aria-pressed='false'] {
  opacity: 0.4;
}
.science-chart-legend i {
  width: 16px;
  height: 3px;
  border-radius: 3px;
}
.science-chart-tools select,
.science-chart-tools > button {
  border: 1px solid #d3d9e0;
  border-radius: 5px;
  padding: 5px 7px;
  background: #fff;
  color: #465568;
}
.scientific-chart-stage {
  height: clamp(310px, 57vh, 620px);
  width: 100%;
  min-width: 0;
  position: relative;
}
.scientific-chart-stage svg {
  display: block;
  max-width: 100%;
  outline: none;
  touch-action: pan-y;
  background: #fff;
}
.scientific-chart-stage svg:focus-visible {
  outline: 2px solid #567eae;
  outline-offset: 3px;
}
.scientific-chart-stage text {
  font:
    11px 'IBM Plex Mono',
    monospace;
  fill: #566373;
}
.scientific-chart-stage .science-axis-label {
  fill: #344154;
  font-weight: 600;
  font-size: 12px;
}
.science-grid {
  stroke: #e4e8ee;
  stroke-width: 1;
}
.science-area-positive {
  fill: #528ac7;
  fill-opacity: 0.2;
}
.science-area-negative {
  fill: #c58545;
  fill-opacity: 0.22;
}
.science-zero-line {
  stroke: #8d99a8;
  stroke-width: 1;
}
.science-area-limit {
  stroke: #738296;
  stroke-width: 1;
  stroke-dasharray: 3 5;
}
.science-identity-line {
  stroke: #697789;
  stroke-width: 1.3;
  stroke-dasharray: 6 5;
}
.science-chart-tooltip {
  pointer-events: none;
  position: absolute;
  top: 35px;
  right: 20px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 14px;
  border: 1px solid #d3d9e0;
  border-radius: 6px;
  background: #fffffff2;
  font-size: 12px;
  color: #344154;
  box-shadow: 0 4px 12px #26344810;
}
.science-help {
  font-size: 12px;
  color: #5c6877;
  line-height: 1.8;
  margin-top: 10px;
}
.science-help summary {
  cursor: pointer;
}
.science-help p {
  font-size: 12px;
  max-width: 90ch;
  margin-top: 7px;
}
@media (max-width: 600px) {
  .science-chart-tools {
    gap: 8px;
  }
  .scientific-chart-stage {
    height: 330px;
  }
  .science-chart-tooltip {
    top: 0;
    right: 3px;
    font-size: 10px;
    padding: 6px;
    gap: 7px;
  }
}
```

<a id="source-20"></a>

## src/components/scientific-chart-geometry.ts

원본: [src/components/scientific-chart-geometry.ts](../../src/components/scientific-chart-geometry.ts) · 128줄 · SHA-256: `31ea029dcdad218c62c2f55396836906f5e66b26dbdedf9e135da8df4282009a`

```typescript
export type ChartPoint = { x: number; y: number }
export type IntegrationArea = { points: ChartPoint[]; sign: -1 | 1 }

const lerp = (a: number, b: number, t: number) =>
  t === 0 ? a : t === 1 ? b : (1 - t) * a + t * b
const same = (a: ChartPoint, b: ChartPoint) => a.x === b.x && a.y === b.y

/** Clip the displayed polyline, preserving undefined gaps and the exact limits. */
function clippedRuns(x: number[], y: number[], from: number, to: number) {
  const lower = Math.min(from, to),
    upper = Math.max(from, to)
  const runs: ChartPoint[][] = []
  let run: ChartPoint[] = []
  const flush = () => {
    if (run.length > 1) runs.push(run)
    run = []
  }
  for (let i = 1; i < Math.min(x.length, y.length); i++) {
    const a = { x: x[i - 1], y: y[i - 1] },
      b = { x: x[i], y: y[i] }
    if (![a.x, a.y, b.x, b.y].every(Number.isFinite) || a.x === b.x) {
      flush()
      continue
    }
    // Normalized coordinates avoid overflowing b.x - a.x for finite extremes.
    const clippedLower = Math.max(lower, Math.min(a.x, b.x))
    const clippedUpper = Math.min(upper, Math.max(a.x, b.x))
    if (!(clippedLower < clippedUpper)) {
      flush()
      continue
    }
    const scale = Math.max(Math.abs(a.x), Math.abs(b.x)) || 1
    const dx = b.x / scale - a.x / scale
    const point = (value: number): ChartPoint => ({
      x: value,
      y: lerp(
        a.y,
        b.y,
        value === a.x
          ? 0
          : value === b.x
            ? 1
            : (value / scale - a.x / scale) / dx,
      ),
    })
    const first = point(a.x < b.x ? clippedLower : clippedUpper)
    const last = point(a.x < b.x ? clippedUpper : clippedLower)
    if (run.length && !same(run[run.length - 1], first)) flush()
    if (!run.length) run.push(first)
    run.push(last)
  }
  flush()
  return runs
}

/** Polygons follow the displayed curve, split at zero, and never bridge NaN gaps. */
export function integrationAreaPolygons(
  x: number[],
  y: number[],
  from: number,
  to: number,
): IntegrationArea[] {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) return []
  const areas: IntegrationArea[] = []
  for (const run of clippedRuns(x, y, from, to)) {
    let curve: ChartPoint[] = [],
      sign: -1 | 0 | 1 = 0
    const flush = () => {
      if (sign && curve.length > 1 && curve.some((p) => p.x !== curve[0].x)) {
        areas.push({
          sign,
          points: [
            { x: curve[0].x, y: 0 },
            ...curve,
            { x: curve[curve.length - 1].x, y: 0 },
          ],
        })
      }
      curve = []
      sign = 0
    }
    const add = (a: ChartPoint, b: ChartPoint) => {
      const nextSign = Math.sign(a.y || b.y) as -1 | 0 | 1
      if (!nextSign) {
        flush()
        return
      }
      if (
        nextSign !== sign ||
        (curve.length && !same(curve[curve.length - 1], a))
      )
        flush()
      sign = nextSign
      if (!curve.length) curve.push(a)
      curve.push(b)
    }
    for (let i = 1; i < run.length; i++) {
      const a = run[i - 1],
        b = run[i]
      if ((a.y < 0 && b.y > 0) || (a.y > 0 && b.y < 0)) {
        const scale = Math.max(Math.abs(a.y), Math.abs(b.y))
        const t =
          Math.abs(a.y) /
          scale /
          (Math.abs(a.y) / scale + Math.abs(b.y) / scale)
        const crossing = { x: lerp(a.x, b.x, t), y: 0 }
        add(a, crossing)
        add(crossing, b)
      } else add(a, b)
    }
    flush()
  }
  return areas
}

/** A y=x segment clipped to the actual visible data rectangle. */
export function identitySegment(
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
) {
  const from = Math.max(xMin, yMin),
    to = Math.min(xMax, yMax)
  return Number.isFinite(from) && Number.isFinite(to) && from < to
    ? { from, to }
    : null
}
```

<a id="source-21"></a>

## src/components/ScientificOutput.tsx

원본: [src/components/ScientificOutput.tsx](../../src/components/ScientificOutput.tsx) · 225줄 · SHA-256: `1422c0290e1329d6a9f78f6b6b94f4e45178d792056d85014d9dc8764122ee09`

```tsx
import type {
  ScientificOptions,
  ScientificResult,
} from '../engine/scientific/types'

const number = (value: number) =>
  !Number.isFinite(value)
    ? '—'
    : value === 0
      ? '0'
      : Number(value.toPrecision(8)).toString()

export function IntegralFormula({ result }: { result: ScientificResult }) {
  const integral = result.integration
  if (!integral) return null
  return (
    <div
      className="ivc-integral"
      aria-label={`Integral from ${integral.from} to ${integral.to} of ${integral.dependent} with respect to ${integral.independent} equals ${integral.value}`}
    >
      <span className="ivc-integral-sign" aria-hidden="true">
        <sup>{number(integral.to)}</sup>
        <span>∫</span>
        <sub>{number(integral.from)}</sub>
      </span>
      <span>
        {integral.dependent}({integral.independent}) d{integral.independent} ={' '}
        <strong>{number(integral.value)}</strong>
      </span>
    </div>
  )
}

const metricNames: Record<string, string> = {
  '완료한 시각': 'Final Time',
  '허용 오차': 'Tolerance',
  '최대 국소 오차 추정': 'Estimated Local Error',
  '승인 / 거부 스텝': 'Accepted / Rejected Steps',
  정적분: 'Integral',
  '사다리꼴 대비 차이': 'Interpolation Difference',
  '입력 데이터': 'Data Points',
  '그래프 샘플': 'Output Samples',
  '제곱 오차 합 SSE': 'SSE',
  '목적함수 최종값': 'Objective',
  '최대 제약 위반': 'Constraint Violation',
  '정규화 국소 정상성': 'Projected Gradient',
  '반복 횟수': 'Iterations',
}

function MetricTable({
  result,
  primary,
}: {
  result: ScientificResult
  primary: boolean
}) {
  const preferred =
    result.module === 'ode'
      ? ['완료한 시각', '허용 오차']
      : result.module === 'integration'
        ? ['사다리꼴 대비 차이', '입력 데이터']
        : result.module === 'lsq'
          ? ['제곱 오차 합 SSE', 'RMSE', '최대 제약 위반']
          : ['목적함수 최종값', '최대 제약 위반']
  const metrics = result.metrics.filter(
    (m) => preferred.includes(m.label) === primary && !/ 범위$/.test(m.label),
  )
  if (!metrics.length) return null
  return (
    <table className="ivc-output-table ivc-metrics-table">
      <thead>
        <tr>
          <th>Metric</th>
          <th>Value</th>
          <th>Interpretation</th>
        </tr>
      </thead>
      <tbody>
        {metrics.map((m) => (
          <tr key={m.label}>
            <th>{metricNames[m.label] ?? m.label}</th>
            <td>{typeof m.value === 'number' ? number(m.value) : m.value}</td>
            <td>
              <details>
                <summary>
                  이 지표 읽는 법<span className="sr-only"> {m.label}</span>
                </summary>
                <p>{m.detail}</p>
              </details>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Compact output keeps numerical claims supplied by the engine; display never upgrades estimates to bounds. */
export default function ScientificOutput({
  result,
  source,
  options,
}: {
  result: ScientificResult
  source: string
  options: ScientificOptions
}) {
  const ode = result.module === 'ode'
  const optimization =
    result.module === 'optimization' || result.module === 'lsq'
  const variables = Object.entries(result.values)
  const stateNames = result.series.map((s) => s.name)
  const initials = new Map(
    [
      ...source.matchAll(
        /^\s*([A-Za-z][A-Za-z0-9_]*)\s*\|\s*(\S+)\s+(\S+)\s+(\S+)\s*$/gm,
      ),
    ].map((m) => [m[1], m.slice(2)]),
  )
  return (
    <>
      {result.module === 'integration' ? (
        <IntegralFormula result={result} />
      ) : (
        result.formula && (
          <div className="science-formula">{result.formula}</div>
        )
      )}
      {ode ? (
        <>
          <div className="science-table-scroll">
            <table className="ivc-output-table ivc-state-table">
              <thead>
                <tr>
                  <th>Variable</th>
                  <th>Initial</th>
                  <th>Min</th>
                  <th>Max</th>
                  <th>Final Value</th>
                </tr>
              </thead>
              <tbody>
                {stateNames.map((name) => {
                  const index = result.columns.indexOf(name)
                  const values = result.rows
                    .map((row) => row[index])
                    .filter(Number.isFinite)
                  if (index < 0 || !values.length) return null
                  return (
                    <tr key={name}>
                      <th>{name}</th>
                      <td>{number(values[0])}</td>
                      <td>{number(Math.min(...values))}</td>
                      <td>{number(Math.max(...values))}</td>
                      <td className="ivc-result-value">
                        {number(values.at(-1)!)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <details className="science-help">
            <summary>Min / Max 읽는 법</summary>
            <p>
              Min과 Max는 출력한 샘플 지점의 최솟값과 최댓값입니다. 두 지점
              사이의 순간적인 극값을 모두 찾은 결과는 아닙니다. Initial은 시작
              상태, Final Value는 마지막으로 계산을 완료한 시점의 상태입니다.
              계산이 중단되면 요청한 종료 시점과 다를 수 있으므로 Final Time도
              확인하세요.
            </p>
          </details>
        </>
      ) : (
        result.module !== 'integration' && (
          <div className="science-table-scroll">
            <table className="ivc-output-table">
              <thead>
                <tr>
                  <th>Variable</th>
                  {optimization && (
                    <>
                      <th>Initial</th>
                      <th>Lower</th>
                      <th>Upper</th>
                    </>
                  )}
                  <th>{optimization ? 'Optimal Value' : 'Value'}</th>
                </tr>
              </thead>
              <tbody>
                {variables.map(([name, value]) => (
                  <tr key={name}>
                    <th>{name}</th>
                    {optimization &&
                      (initials.get(name) ?? ['—', '—', '—']).map((x, i) => (
                        <td key={i}>{x}</td>
                      ))}
                    <td className="ivc-result-value">{number(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
      <MetricTable result={result} primary />
      <details className="science-help ivc-report-details">
        <summary>Calculation Details</summary>
        <p>
          {result.method} · {result.durationMs.toFixed(2)} ms
          {result.iterations !== undefined
            ? ` · ${result.iterations} iterations`
            : ''}
          {result.evaluations !== undefined
            ? ` · ${result.evaluations} evaluations`
            : ''}
        </p>
        <MetricTable result={result} primary={false} />
        <pre>{JSON.stringify(options, null, 2)}</pre>
      </details>
    </>
  )
}
```

<a id="source-22"></a>

## src/components/RegressionResult.tsx

원본: [src/components/RegressionResult.tsx](../../src/components/RegressionResult.tsx) · 332줄 · SHA-256: `312a83ee1ceccd5f33a7638711640400925f9dcf55bf536d75482244ef14070c`

```tsx
import { useMemo } from 'react'
import type { ScientificResult } from '../engine/scientific/types'
import ScientificChart from './ScientificChart'
import RegressionResidualPlot from './RegressionResidualPlot'
import './RegressionResult.css'

const format = (value: number | string) => {
  if (typeof value === 'string') return value
  if (!Number.isFinite(value)) return 'Not available'
  if (value === 0) return '0'
  return Math.abs(value) < 1e-4 || Math.abs(value) >= 1e7
    ? value.toExponential(5)
    : Number(value.toPrecision(8)).toString()
}

export default function RegressionResult({
  result,
}: {
  result: ScientificResult
}) {
  const regression = result.regression
  const primary = result.metrics.filter(
    (m) => m.label === 'RMSE' || m.label === 'R²',
  )
  const diagnostics = result.metrics.filter(
    (m) => m.label !== 'RMSE' && m.label !== 'R²',
  )
  const comparison = useMemo(
    () =>
      result.comparison
        ? [
            {
              name: 'Fitted observations',
              x: result.comparison.observed,
              y: result.comparison.predicted,
              style: 'points' as const,
            },
          ]
        : [],
    [result.comparison],
  )
  const nonlinear = regression?.confidenceMethod === 'nonlinear-local'
  return (
    <div className="regression-result">
      <div className="regression-output-heading">
        <h2>Regression output</h2>
        <span
          className={
            result.status === 'stopped'
              ? 'regression-status stopped'
              : 'regression-status'
          }
        >
          {result.status === 'stopped' ? 'Stopped' : 'Fit completed'}
        </span>
      </div>
      {result.message && result.status === 'stopped' && (
        <p className="regression-stop">{result.message}</p>
      )}
      {regression?.model && (
        <p className="regression-model">
          <code>{regression.model}</code>
        </p>
      )}
      <div className="regression-primary">
        {primary.map((metric) => (
          <div key={metric.label}>
            <span>{metric.label}</span>
            <strong>{format(metric.value)}</strong>
          </div>
        ))}
        {regression && (
          <div>
            <span>Observations / Parameters</span>
            <strong>
              {regression.sampleCount} / {regression.parameterCount}
            </strong>
          </div>
        )}
      </div>
      <details className="regression-help">
        <summary>RMSE · R²를 어떻게 읽나요?</summary>
        <p>
          <strong>RMSE</strong>는 입력한 데이터에서 모델의 예측이 관측값과 보통
          얼마나 떨어지는지 나타냅니다. 종속변수와 단위가 같습니다. 예를 들어
          압력의 RMSE가 2 kPa이면, 적합한 데이터에서 오차의 대표적인 크기가 약 2
          kPa라는 뜻입니다. 미래의 측정값도 항상 이 범위에 들어간다는 의미는
          아닙니다.
        </p>
        <p>
          <strong>R²</strong>는 관측값의 평균 하나만 쓰는 방법에 비해 제곱오차를
          줄인 비율입니다. 1이면 입력 데이터와 정확히 일치하고, 0이면 평균만
          쓰는 것과 같은 수준입니다. 음수이면 그보다도 나쁩니다. 관측값이 모두
          같으면 비교 기준의 변동이 없어 정의하지 않습니다.
        </p>
        <p>
          RMSE는 같은 종속변수·단위에서 비교하세요. R²가 높아도 잘못된 물리
          모델일 수 있고, 데이터가 없는 범위의 예측은 나쁠 수 있습니다. 여기의
          RMSE와 R²는 적합에 사용한 데이터의 결과이며 별도의 검증 데이터 점수는
          아닙니다. <strong>Observations / Parameters</strong>는 관측 행 수와
          실제로 추정한 계수 수입니다.
        </p>
      </details>
      <div className="regression-table-scroll">
        <table className="regression-coefficients">
          <caption>
            Coefficients{nonlinear ? ' · Local approximation' : ''}
          </caption>
          <thead>
            <tr>
              <th scope="col">Coefficient</th>
              <th scope="col">Estimate</th>
              <th scope="col">95% CI</th>
            </tr>
          </thead>
          <tbody>
            {result.coefficients?.map((coefficient) => (
              <tr key={coefficient.name}>
                <th scope="row">
                  <code>{coefficient.name}</code>
                  {coefficient.fixed && <small>Fixed</small>}
                </th>
                <td>{format(coefficient.estimate)}</td>
                <td>
                  {coefficient.confidence95 ? (
                    <>
                      <span>
                        [{format(coefficient.confidence95.lower)},{' '}
                        {format(coefficient.confidence95.upper)}]
                      </span>
                      <small>
                        ± {format(coefficient.confidence95.halfWidth)}
                      </small>
                    </>
                  ) : coefficient.fixed ? (
                    'Fixed by model'
                  ) : (
                    <details className="regression-inline-help">
                      <summary>Not estimated</summary>
                      <p>
                        {coefficient.note ??
                          '현재 결과에서 유효한 구간을 계산하지 못했습니다.'}
                      </p>
                    </details>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {regression?.confidenceUnavailableReason && (
        <p className="regression-confidence-note">
          {regression.confidenceUnavailableReason}
        </p>
      )}
      <details className="regression-help">
        <summary>Estimate · 95% CI · Standard Error 읽는 법</summary>
        <p>
          <strong>Estimate</strong>는 현재 관측 데이터에 가장 잘 맞도록 찾은
          계수 값입니다. <strong>95% CI (Confidence Interval)</strong>는 같은
          측정 조건과 같은 회귀 방법으로 데이터를 반복해서 얻었을 때, 그렇게
          만든 구간의 약 95%가 고정된 실제 계수를 포함하도록 설계한 구간입니다.
          실제 계수가 이 한 구간에 있을 확률이 95%라는 뜻이나, 예측의 95%가
          맞는다는 뜻은 아닙니다.
        </p>
        <p>
          표의 대괄호는 아래쪽·위쪽 끝값이고, <strong>±</strong>는 Estimate에서
          끝값까지의 거리입니다. 구간이 넓으면 현재 데이터로 해당 계수를
          정밀하게 정하기 어렵다는 뜻입니다. 0을 포함하면 다른 계수를 함께
          추정한 이 모델에서 그 계수가 0인 경우를 양측 5% 검정으로 배제하지
          못합니다. 불필요한 변수라고 자동으로 결론 내릴 수는 없습니다.
        </p>
        <p>
          <strong>Standard Error (SE)</strong>는 반복 측정 시 계수 추정값이
          얼마나 흔들릴지 추정한 표준편차입니다. 95% CI의 반폭은 Student-t
          임계값 × SE입니다. 데이터 수에서 추정한 계수 수를 뺀{' '}
          <strong>Degrees of freedom</strong>이 작으면 1.96보다 큰 임계값을 써서
          구간을 더 넓게 만듭니다. SE 값은 아래 Diagnostics에서 확인할 수
          있습니다.
        </p>
        <p>
          이 구간은 설명변수를 오차 없는 고정값으로 보고, 관측 오차가 서로
          독립이며 같은 분산을 갖는 정규분포라는 통계 모델을 가정합니다.
          선형·다항·다중선형 회귀는 선택한 모델이 맞다는 가정 아래의 구간입니다.
          각 계수마다 95%인 구간이며, 모든 계수가 동시에 포함될 확률을 95%로
          맞춘 구간은 아닙니다. 측정 장치의 오차, 변수 누락, 외삽 오차를 모두
          합친 보장도 아닙니다.
        </p>
        {nonlinear && (
          <p>
            <strong>Nonlinear regression</strong>에서는 수렴한 위치에서 모델을
            국소 선형화해 SE와 95% CI를 근사합니다. 적은 데이터, 큰 비선형성
            또는 나쁜 초기값에서는 구간이 부정확할 수 있습니다. 국소 최소값이며
            전역 최적을 보장하지 않습니다. 경계에 놓인 계수, 랭크 부족, 자유도
            부족 또는 수렴하지 않은 결과에는 일반적인 대칭 CI를 표시하지
            않습니다.
          </p>
        )}
        {regression?.origin && (
          <p>
            <strong>Origin</strong> 조건은 모델이 원점을 지나도록 강제합니다.
            이때 고정된 0은 데이터로 추정한 계수가 아니므로 CI를 붙이지
            않습니다. Origin을 강제한 모델도 R²는 관측 평균을 기준으로
            계산합니다.
          </p>
        )}
        <p>
          동일 데이터가 모델에 정확히 들어맞으면 SE와 구간 폭이 매우 작거나 0이
          될 수 있습니다. 측정이 완벽하다는 증거는 아니며, 데이터에 드러나지
          않은 오차는 반영하지 못합니다. 종속변수를 log 등으로 변환했다면 회귀
          오차와 통계 가정도 변환한 값의 단위에 적용됩니다.
        </p>
      </details>
      <RegressionResidualPlot result={result} />
      {comparison.length > 0 && (
        <section className="regression-comparison">
          <h3>Observed vs Predicted</h3>
          <ScientificChart
            series={comparison}
            xLabel={`Observed ${result.comparison?.dependent ?? ''}`}
            yLabel={`Predicted ${result.comparison?.dependent ?? ''}`}
            identityLine
          />
          <details className="regression-help">
            <summary>이 그래프로 무엇을 확인하나요?</summary>
            <p>
              가로축은 관측값, 세로축은 같은 행에 대한 모델의 예측값입니다. 기준
              대각선은 관측값과 예측값이 같은 위치입니다. 점이 선 위에 있으면
              과대 예측, 아래에 있으면 과소 예측입니다. 한쪽으로 휘거나 특정
              값에서만 오차가 커지는지 살펴보세요. 이 점들은 적합에 사용한
              데이터이며, 계수의 95% CI나 미래 관측값의 Prediction Interval을
              나타내는 그림은 아닙니다.
            </p>
          </details>
        </section>
      )}
      <details className="regression-diagnostics">
        <summary>Diagnostics · Calculation details</summary>
        <dl className="regression-run-details">
          <dt>Method</dt>
          <dd>{result.method}</dd>
          <dt>Status</dt>
          <dd>{result.status}</dd>
          <dt>Duration</dt>
          <dd>{format(result.durationMs)} ms</dd>
        </dl>
        {result.message && <p>{result.message}</p>}
        <div className="regression-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
                <th>Interpretation</th>
              </tr>
            </thead>
            <tbody>
              {diagnostics.map((metric) => (
                <tr key={metric.label}>
                  <th scope="row">{metric.label}</th>
                  <td>{format(metric.value)}</td>
                  <td>{metric.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="regression-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Coefficient</th>
                <th>Standard Error</th>
              </tr>
            </thead>
            <tbody>
              {result.coefficients
                ?.filter((row) => !row.fixed)
                .map((row) => (
                  <tr key={row.name}>
                    <th scope="row">{row.name}</th>
                    <td>
                      {row.standardError === undefined
                        ? 'Not estimated'
                        : format(row.standardError)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <details className="regression-help">
          <summary>Rank · Condition number의 차이</summary>
          <p>
            <strong>Rank</strong>는 데이터가 계수들을 서로 구분할 수 있는지
            확인합니다. 예를 들어 설명변수 두 열이 항상 정확히 두 배 관계라면 두
            계수의 개별 효과를 구분하기 어렵습니다.{' '}
            <strong>Condition number</strong>는 입력을 조금 바꿨을 때 계산이
            얼마나 민감해질 수 있는지를 보여주는 수치 진단이며, 이 보고서에서는
            정규화한 설계행렬을 사용합니다. 실제 측정 오차의 크기를 추정하는
            SE나 통계적 CI와 목적이 다릅니다. 조건수가 작아도 관측 오차가 크거나
            모델이 틀리면 좋은 예측을 보장하지 않습니다.
          </p>
          <p>
            SE와 95% CI는 SVD에서 구한 공분산을 사용합니다. 다항식의 표시 계수는
            원래 x의 거듭제곱으로 변환하면서 계수 사이의 공분산도 함께
            반영합니다. 큰 좌표 오프셋에서 펼친 식은 숫자의 상쇄에 민감하므로
            아래의 정규화된 Prediction formula와 그래프가 계산에 사용한
            표현입니다.
          </p>
        </details>
        {result.formula && (
          <details className="regression-help">
            <summary>Prediction formula</summary>
            <code className="regression-full-formula">{result.formula}</code>
          </details>
        )}
        {result.warnings.length > 0 && (
          <details className="regression-help">
            <summary>Assumptions · Warnings ({result.warnings.length})</summary>
            <ul>
              {result.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </details>
        )}
      </details>
    </div>
  )
}
```

<a id="source-23"></a>

## src/components/RegressionResult.css

원본: [src/components/RegressionResult.css](../../src/components/RegressionResult.css) · 316줄 · SHA-256: `2a39ae8c2e34a5a182c0334b2893d52107f1ee7d12d434d893247eeacc189e7d`

```css
.regression-result {
  color: #29323d;
  font-size: 14px;
}
.regression-output-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.regression-output-heading h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}
.regression-status {
  margin-left: auto;
  padding: 3px 8px;
  border: 1px solid #cbd5ce;
  color: #365c47;
  border-radius: 3px;
  font-size: 12px;
}
.regression-status.stopped {
  color: #8e511f;
  border-color: #dbc5b2;
}
.regression-stop,
.regression-confidence-note {
  color: #8e511f;
  font-size: 13px;
  line-height: 1.6;
}
.regression-model {
  margin: 10px 0 16px;
  overflow-wrap: anywhere;
  font-size: 16px;
}
.regression-primary {
  display: flex;
  gap: 14px 32px;
  flex-wrap: wrap;
  margin: 0 0 10px;
  padding: 12px 0;
  border-top: 1px solid #d7dce1;
  border-bottom: 1px solid #d7dce1;
}
.regression-primary > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.regression-primary span {
  font-size: 12px;
  color: #586473;
}
.regression-primary strong {
  font-family: var(--mono, monospace);
  font-size: 21px;
  font-weight: 500;
  color: #2e587d;
}
.regression-table-scroll {
  overflow-x: auto;
  margin: 12px 0;
}
.regression-result table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.regression-result caption {
  text-align: left;
  color: #4c5967;
  font-weight: 600;
  padding: 5px 0 8px;
}
.regression-result th,
.regression-result td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #e1e5e9;
  vertical-align: top;
}
.regression-result thead th {
  background: #f2f4f7;
  font-weight: 600;
  white-space: nowrap;
}
.regression-result tbody th {
  font-weight: 500;
}
.regression-coefficients td {
  font-family: var(--mono, monospace);
  color: #2e587d;
}
.regression-result td small,
.regression-result th small {
  display: block;
  margin-top: 3px;
  font-family: var(--sans, sans-serif);
  font-size: 11px;
  color: #687381;
}
.regression-help {
  margin: 10px 0;
  font-size: 13px;
  line-height: 1.8;
}
.regression-help summary,
.regression-diagnostics > summary {
  cursor: pointer;
  color: #486478;
  font-size: 13px;
}
.regression-help p {
  max-width: 90ch;
  margin: 9px 0;
  color: #465362;
}
.regression-help li {
  margin: 5px 0;
  color: #465362;
}
.regression-inline-help {
  font-family: var(--sans, sans-serif);
  font-size: 12px;
  color: #687381;
}
.regression-inline-help summary {
  cursor: pointer;
}
.regression-inline-help p {
  max-width: 55ch;
  line-height: 1.6;
}
.regression-comparison {
  margin-top: 22px;
  border-top: 1px solid #d7dce1;
  padding-top: 14px;
}
.regression-comparison h3 {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 10px;
}
.regression-section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
}
.regression-comparison > p {
  color: #52616e;
  line-height: 1.7;
  font-size: 13px;
}
.regression-section-heading label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}
.regression-section-heading select {
  padding: 7px 10px;
  max-width: 230px;
  border: 1px solid #cbd4dc;
  border-radius: 5px;
  background: white;
}
.regression-degree-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  margin: 12px 0;
  padding: 12px;
  border: 1px solid #d7dce1;
  border-radius: 6px;
}
.regression-degree-picker legend {
  font-size: 12px;
  color: #52616e;
}
.regression-degree-picker label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
.regression-degree-picker input {
  accent-color: #376eae;
}
.regression-compare-button,
.regression-degree-table button,
.regression-view-switch button {
  border: 1px solid #cbd4dc;
  background: white;
  padding: 8px 12px;
  border-radius: 5px;
  color: #305876;
  cursor: pointer;
}
.regression-compare-button {
  background: #305876;
  color: white;
}
.regression-compare-button:disabled {
  opacity: 0.5;
  cursor: default;
}
.regression-recommendation {
  padding: 12px;
  background: #edf4f6;
  border-left: 3px solid #376eae;
}
.regression-degree-table {
  min-width: 850px;
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.regression-degree-table :is(th, td) {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #e1e5e9;
  vertical-align: top;
}
.regression-degree-table thead th {
  background: #f2f4f7;
  white-space: nowrap;
  font-weight: 600;
}
.regression-degree-table tbody th {
  font-weight: 500;
  white-space: nowrap;
}
.regression-degree-table small {
  display: block;
  margin-top: 4px;
  color: #5c6877;
  font-size: 11px;
  line-height: 1.5;
}
.regression-degree-table caption {
  text-align: left;
  padding: 5px 0 8px;
  color: #4c5967;
}
.regression-degree-table tr[data-recommended='true'] {
  background: #f0f6f9;
}
.regression-degree-table td:last-child {
  max-width: 32ch;
  min-width: 140px;
  line-height: 1.6;
}
.regression-degree-swatch {
  display: inline-block;
  width: 12px;
  height: 3px;
  margin-right: 7px;
  vertical-align: middle;
}
.regression-view-switch {
  display: flex;
  gap: 8px;
  margin: 16px 0;
}
.regression-view-switch button[aria-pressed='true'] {
  background: #eaf0f6;
  border-color: #5a7a9a;
}
.regression-comparison .scientific-chart-stage {
  height: 340px;
  min-height: 260px;
}
.regression-diagnostics {
  border-top: 1px solid #d7dce1;
  padding-top: 12px;
  margin-top: 20px;
}
.regression-run-details {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 6px 16px;
  margin: 16px 0;
  font-size: 12px;
}
.regression-run-details dd {
  margin: 0;
}
.regression-run-details dt {
  color: #66717f;
}
.regression-full-formula {
  display: block;
  padding: 10px;
  background: #f5f6f8;
  color: #3d4855;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.7;
}
@media (max-width: 600px) {
  .regression-result th,
  .regression-result td {
    padding: 7px 8px;
  }
  .regression-primary {
    gap: 12px 22px;
  }
  .regression-primary strong {
    font-size: 18px;
  }
}
```

<a id="source-24"></a>

## src/components/RegressionResidualPlot.tsx

원본: [src/components/RegressionResidualPlot.tsx](../../src/components/RegressionResidualPlot.tsx) · 94줄 · SHA-256: `9166919e0d5d307d5e3ff83de07ad545f0fb5638f86ca682baad4ef6a8166e7a`

```tsx
import { useMemo, useState } from 'react'
import type { ScientificResult } from '../engine/scientific/types'
import ScientificChart from './ScientificChart'
import './RegressionResult.css'

export default function RegressionResidualPlot({
  result,
}: {
  result: ScientificResult
}) {
  const [against, setAgainst] = useState('fitted')
  const residuals = result.residuals
  const data = result.comparison
  const predictor = residuals?.predictors[Number(against.split(':')[1])]
  const xLabel =
    against === 'row'
      ? 'Observation row'
      : predictor
        ? predictor.name
        : `Predicted ${data?.dependent ?? ''}`
  const series = useMemo(
    () =>
      residuals && data
        ? [
            {
              name: 'Residuals',
              style: 'points' as const,
              y: residuals.values,
              x:
                against === 'row'
                  ? residuals.values.map((_, i) => i + 1)
                  : (predictor?.values ?? data.predicted),
            },
          ]
        : [],
    [residuals, data, against, predictor],
  )
  if (!residuals || !data) return null
  return (
    <section
      className="regression-comparison regression-residuals"
      aria-label="Residual plot"
    >
      <div className="regression-section-heading">
        <h3>Residual Plot</h3>
        <label>
          Plot residuals against
          <select
            aria-label="Plot residuals against"
            value={against}
            onChange={(e) => setAgainst(e.target.value)}
          >
            <option value="fitted">Predicted value</option>
            <option value="row">Observation row</option>
            {residuals.predictors.map((p, i) => (
              <option key={p.name} value={`predictor:${i}`}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p>
        Residual = Observed − Predicted · {residuals.values.length} observations
      </p>
      {result.status === 'stopped' && (
        <p className="regression-stop">
          마지막 유효 반복의 잔차입니다. 수렴한 적합으로 해석하지 마세요.
        </p>
      )}
      <ScientificChart
        series={series}
        xLabel={xLabel}
        yLabel={`Residual (${data.dependent})`}
        zeroLine
      />
      <details className="regression-help">
        <summary>How to read residuals</summary>
        <p>
          0 기준선 위의 점은 모델이 낮게 예측한 관측, 아래의 점은 높게 예측한
          관측입니다. 0 주위에 고르게 섞이는지 보세요. 휘어진 패턴은 빠진 곡률,
          부채꼴은 일정하지 않은 오차 분산, 행 순서에 따른 패턴은 오차의 상관
          가능성을 시사합니다. 패턴만으로 원인을 확정할 수는 없습니다.
        </p>
        <p>
          예측값·각 설명변수·관측 행 번호를 바꿔 확인할 수 있습니다. 행 번호는
          원래 입력 순서이며 시간으로 가정하지 않습니다. 이 잔차는 적합에 사용한
          데이터의 오차이고, 표준화 잔차나 별도 검증 데이터의 예측 오차는
          아닙니다. 변환한 종속변수를 적합했다면 잔차도 그 단위입니다.
        </p>
      </details>
    </section>
  )
}
```

<a id="source-25"></a>

## src/components/PolynomialComparison.tsx

원본: [src/components/PolynomialComparison.tsx](../../src/components/PolynomialComparison.tsx) · 242줄 · SHA-256: `86f1f3d983dcc815a2d8b3bf86efb8811b9f70f56c607e69f61f215044e9c413`

```tsx
import { useMemo, useState } from 'react'
import type { ScientificResult } from '../engine/scientific/types'
import ScientificChart from './ScientificChart'

const colors = [
  '#376eae',
  '#b37836',
  '#7961a8',
  '#368078',
  '#a85773',
  '#6c8039',
  '#2d4b73',
  '#97412a',
  '#565478',
  '#207254',
  '#a63e88',
  '#80621c',
]
const format = (v: number | string | undefined) =>
  v === undefined
    ? 'Not available'
    : typeof v === 'string'
      ? v
      : Number(v.toPrecision(6)).toString()
export default function PolynomialComparison({
  result,
  onCompare,
  onApply,
}: {
  result: ScientificResult
  onCompare: (degrees: number[]) => void
  onApply: (degree: number) => void
}) {
  const comparison = result.polynomialComparison
  const [degrees, setDegrees] = useState(
    () => comparison?.candidates.map((c) => c.degree) ?? [1, 2, 3, 4, 5],
  )
  const [view, setView] = useState('fits')
  const series = useMemo(() => {
    if (!comparison) return []
    const candidates = comparison.candidates.flatMap((c) => {
      const s = view === 'fits' ? c.curve : c.residuals
      return s ? [{ ...s, color: colors[c.degree - 1] }] : []
    })
    return view === 'fits'
      ? [{ ...comparison.observed, color: '#52616e' }, ...candidates]
      : candidates
  }, [comparison, view])
  return (
    <section
      className="regression-comparison regression-degree-comparison"
      aria-label="Polynomial degree comparison"
    >
      <div className="regression-section-heading">
        <h3>Compare Polynomial Degrees</h3>
        <span>Current degree: {result.regression?.degree}</span>
      </div>
      <p>
        같은 데이터·종속변수·Origin 조건으로 차수를 비교합니다. 차수 선택 후
        Compare Fits를 누르세요.
      </p>
      <fieldset className="regression-degree-picker">
        <legend>Degrees to compare</legend>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((d) => (
          <label key={d}>
            <input
              type="checkbox"
              checked={degrees.includes(d)}
              onChange={(e) =>
                setDegrees(
                  e.target.checked
                    ? [...degrees, d]
                    : degrees.filter((v) => v !== d),
                )
              }
            />
            Degree {d}
          </label>
        ))}
      </fieldset>
      <button
        type="button"
        className="regression-compare-button"
        disabled={degrees.length < 2}
        onClick={() => onCompare(degrees)}
      >
        Compare Fits
      </button>
      {degrees.length < 2 && <p>비교할 차수를 두 개 이상 선택하세요.</p>}
      {comparison && (
        <>
          {degrees
            .slice()
            .sort((a, b) => a - b)
            .join(',') !==
            comparison.candidates.map((c) => c.degree).join(',') && (
            <p role="status">
              선택한 차수가 바뀌었습니다. 아래는 이전 비교 결과입니다. Compare
              Fits로 갱신하세요.
            </p>
          )}
          <p className="regression-recommendation" role="status">
            {comparison.recommendedDegree === undefined
              ? 'LOOCV를 산정할 수 있는 후보가 없어 추천 차수를 표시하지 않았습니다.'
              : `Lowest LOOCV error: Degree ${comparison.recommendedDegree} · 선택한 후보 중 추천 (수치적으로 같은 점수이면 낮은 차수)`}
          </p>
          <div className="regression-table-scroll">
            <table className="regression-degree-table">
              <caption>
                Same-data model comparison ·{' '}
                {comparison.origin ? 'Through origin' : 'With intercept'}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Degree</th>
                  <th scope="col">Parameters</th>
                  <th scope="col">Training RMSE ↓</th>
                  <th scope="col">LOOCV RMSE ↓</th>
                  <th scope="col">Adjusted R² ↑</th>
                  <th scope="col">AIC ↓</th>
                  <th scope="col">Action / Status</th>
                </tr>
              </thead>
              <tbody>
                {comparison.candidates.map((c) => {
                  const metric = (label: string) =>
                    c.metrics?.find((m) => m.label === label)?.value
                  return (
                    <tr
                      key={c.degree}
                      data-recommended={
                        c.degree === comparison.recommendedDegree
                      }
                    >
                      <th scope="row">
                        <i
                          className="regression-degree-swatch"
                          style={{ background: colors[c.degree - 1] }}
                        />
                        Degree {c.degree}
                        {c.degree === comparison.recommendedDegree && (
                          <small>Lowest LOOCV</small>
                        )}
                      </th>
                      <td>{c.degree + (comparison.origin ? 0 : 1)}</td>
                      <td>{format(metric('RMSE'))}</td>
                      <td>
                        {format(c.crossValidation?.rmse)}
                        {c.crossValidation?.unavailableReason && (
                          <small>{c.crossValidation.unavailableReason}</small>
                        )}
                      </td>
                      <td>{format(metric('Adjusted R²'))}</td>
                      <td>{format(metric('AIC'))}</td>
                      <td>
                        {c.status === 'unavailable' ? (
                          <span>{c.reason}</span>
                        ) : c.degree === result.regression?.degree ? (
                          'Current fit'
                        ) : (
                          <button
                            type="button"
                            onClick={() => onApply(c.degree)}
                          >
                            Use Degree {c.degree}
                          </button>
                        )}
                        {!!c.warnings?.length && (
                          <details>
                            <summary>Warnings</summary>
                            {c.warnings.map((w) => (
                              <p key={w}>{w}</p>
                            ))}
                          </details>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div
            className="regression-view-switch"
            role="group"
            aria-label="Degree comparison plot"
          >
            <button
              type="button"
              aria-pressed={view === 'fits'}
              onClick={() => setView('fits')}
            >
              Fit Overlay
            </button>
            <button
              type="button"
              aria-pressed={view === 'residuals'}
              onClick={() => setView('residuals')}
            >
              Residual Overlay
            </button>
          </div>
          <ScientificChart
            series={series}
            xLabel={comparison.independent}
            yLabel={
              view === 'fits'
                ? comparison.dependent
                : `Residual (${comparison.dependent})`
            }
            zeroLine={view === 'residuals'}
          />
          <details className="regression-help">
            <summary>Choosing a degree · LOOCV, overfitting and limits</summary>
            <p>
              LOOCV RMSE는 각 관측을 한 행씩 빼고 그 점을 예측한 오차의
              제곱평균제곱근입니다. 선형 최소제곱의 PRESS 공식으로 계산합니다.
              작은 값이 같은 데이터의 후보 사이에서 선호됩니다. 훈련 RMSE만 보고
              차수를 높이면 과적합할 수 있으므로 LOOCV와 잔차 패턴을 함께
              확인하세요. 수치 반올림 수준에서 같은 점수는 더 낮은 차수를
              추천합니다.
            </p>
            <p>
              차수 비교는 선택한 후보에 한합니다. 관측 수 부족·랭크 부족은 실패
              이유를 표시하고, 행 제외 시 불안정하거나 자유도가 없으면 LOOCV를
              비워 둡니다. AIC·Adjusted R²도 산정할 수 없으면 표시하지 않습니다.
              LOOCV는 외부 검증 데이터나 외삽 정확도 보장이 아니며, 시간·그룹
              상관 데이터에서는 별도의 블록·그룹 검증이 필요합니다. Through
              Origin 조건과 보조식은 모든 후보에 동일하게 적용됩니다.
            </p>
            <p>
              Use Degree는 실제 Input의 polyfit 차수를 바꾸고 현재
              계수·Simulation·Report를 다시 계산합니다. 비교 그래프의 범례를
              눌러 곡선을 숨길 수 있으며 같은 차수는 두 그림에서 같은 색을
              사용합니다.
            </p>
          </details>
        </>
      )}
    </section>
  )
}
```

<a id="source-26"></a>

## src/regression-report.ts

원본: [src/regression-report.ts](../../src/regression-report.ts) · 48줄 · SHA-256: `47b377adde562e0a79ca163fa4a7dab2264a6f0c2b20c3173732e039b37b150a`

```typescript
import type { ScientificResult } from './engine/scientific/types'
const cell = (value: number | string | undefined) =>
  value === undefined
    ? 'Not available'
    : String(value)
        .replace(/\|/g, '\\|')
        .replace(/[\r\n]+/g, ' ')

/** Keep the downloadable report's residual sign and comparison scores identical
 * to the report on screen. Use full precision and preserve original row order. */
export function regressionReportSections(result: ScientificResult): string {
  const sections: string[] = []
  if (result.residuals && result.comparison) {
    sections.push(
      [
        '## Residuals · Observed − Predicted',
        'Original input row order; errors in the fitted dependent variable units. These are training residuals, not validation errors.',
        '| Row | Observed | Predicted | Residual |',
        '| --- | --- | --- | --- |',
        ...result.residuals.values.map(
          (v, i) =>
            `| ${i + 1} | ${cell(result.comparison!.observed[i])} | ${cell(result.comparison!.predicted[i])} | ${cell(v)} |`,
        ),
      ].join('\n'),
    )
  }
  if (result.polynomialComparison) {
    const comparison = result.polynomialComparison
    sections.push(
      [
        '## Polynomial degree comparison',
        `Same observations and dependent variable (${cell(comparison.dependent)}); ${comparison.origin ? 'through origin' : 'with intercept'}.`,
        comparison.recommendedDegree === undefined
          ? 'No LOOCV recommendation available.'
          : `Lowest LOOCV error among selected candidates: Degree ${comparison.recommendedDegree}. Numerical ties prefer the lower degree.`,
        '| Degree | Training RMSE | LOOCV RMSE | Adjusted R² | AIC | Status |',
        '| --- | --- | --- | --- | --- | --- |',
        ...comparison.candidates.map((c) => {
          const metric = (label: string) =>
            c.metrics?.find((m) => m.label === label)?.value
          return `| ${c.degree} | ${cell(metric('RMSE'))} | ${cell(c.crossValidation?.rmse)} | ${cell(metric('Adjusted R²'))} | ${cell(metric('AIC'))} | ${cell(c.reason ?? c.crossValidation?.unavailableReason ?? c.status)} |`
        }),
        'LOOCV uses PRESS residuals / (1 − leverage) for linear least squares. It is not independent external validation or an extrapolation guarantee. Rank loss, insufficient observations or numerical instability are not zero errors.',
      ].join('\n'),
    )
  }
  return sections.join('\n\n')
}
```
