# 02 · 상태 관리, 분기 추적과 비동기 계산

수식·파라미터·선택한 해가 화면과 계산 엔진 사이를 오가는 실제 코드입니다. `models.ts`는 저장할 모델을, `App.tsx`는 화면 이동·모델 편집·계산 요청·저장 및 리포트 생성을 연결합니다.

`solver.worker.ts`는 UI 스레드 밖에서 계산하고, 요청 번호를 사용하는 UI가 이전 응답으로 최신 결과를 덮어쓰지 않게 합니다. `sweep.ts`는 그래프용 지점과 사용자가 정한 간격의 데이터 표 지점을 구분합니다.

`branches.ts`는 기준 해에서 파라미터를 조금씩 바꾸어 동일한 가지를 수치적으로 추적합니다. 국소 보정과 역방향 확인에 실패한 구간을 다른 해로 임의 연결하지 않습니다. `simulation-panels.ts`는 해별 기준 스냅샷과 계산 캐시를 관리합니다.

탐색 변수의 현재값은 곡선 위의 현재 지점을 가리킵니다. 같은 기준 해·다른 고정 파라미터·범위·간격에서는 현재 탐색 변수만 움직여도 기준 곡선이 달라지지 않도록 계산과 표시를 구분합니다. 다른 고정 파라미터, 선택한 해 또는 탐색 범위가 바뀌면 곡선을 다시 계산할 수 있습니다.

## 읽는 방법

아래 코드 블록은 표시한 원본 파일의 전체 내용을 그대로 복사한 읽기용 묶음입니다. 요약용 의사 코드나 별도의 구현이 아니며, 모듈의 import 경로는 원래 프로젝트 구조를 따릅니다. 이 Markdown을 하나의 TypeScript 파일로 바꾸어 실행하는 용도는 아닙니다. 실행은 저장소에서 `npm ci`와 `npm run dev`를 사용합니다.

원본을 수정한 뒤 `npm run docs:core`로 다시 만들고, `npm run docs:core -- --check`로 문서와 현재 소스가 같은지 확인할 수 있습니다. 각 파일의 SHA-256은 원문 일치 확인용이며 생성 시각을 넣지 않아 같은 소스에서 같은 문서를 만듭니다.

소스 묶음 SHA-256: `f2f3902b10466c00e26f87c08ea2dcaa18da639d639f713a86e315fe5536e686`

## 다른 코드 묶음

- [01 · 수식 파싱과 수치해석 엔진](./01-math-engine.md)
- [02 · 상태 관리, 분기 추적과 비동기 계산](./02-state-and-simulation.md) · 현재 문서
- [03 · 그래프, 마우스 조작과 화면 표현](./03-chart-and-interaction.md)

## 포함한 원본

- [src/editor-input.ts](#source-1) · [저장소 원본](../../src/editor-input.ts)
- [src/equation-project.ts](#source-2) · [저장소 원본](../../src/equation-project.ts)
- [src/models.ts](#source-3) · [저장소 원본](../../src/models.ts)
- [src/showcase-examples.ts](#source-4) · [저장소 원본](../../src/showcase-examples.ts)
- [src/solver-input.ts](#source-5) · [저장소 원본](../../src/solver-input.ts)
- [src/use-project-persistence.ts](#source-6) · [저장소 원본](../../src/use-project-persistence.ts)
- [src/equation-count.ts](#source-7) · [저장소 원본](../../src/equation-count.ts)
- [src/csv.ts](#source-8) · [저장소 원본](../../src/csv.ts)
- [src/engine/sweep.ts](#source-9) · [저장소 원본](../../src/engine/sweep.ts)
- [src/engine/branches.ts](#source-10) · [저장소 원본](../../src/engine/branches.ts)
- [src/engine/branch-events.ts](#source-11) · [저장소 원본](../../src/engine/branch-events.ts)
- [src/engine/simulation-panels.ts](#source-12) · [저장소 원본](../../src/engine/simulation-panels.ts)
- [src/engine/solver.worker.ts](#source-13) · [저장소 원본](../../src/engine/solver.worker.ts)
- [src/App.tsx](#source-14) · [저장소 원본](../../src/App.tsx)

<a id="source-1"></a>

## src/editor-input.ts

원본: [src/editor-input.ts](../../src/editor-input.ts) · 17줄 · SHA-256: `a36c825cf048f6e4bf0b3fda4238e022da711c4b3e253de0a068a15fe8e33b8f`

````typescript
import { normalizeMathCharacters } from './engine/source-statements'

/** Clipboard plain text only. Remove an enclosing code fence, preserving deliberate blank lines. */
export function normalizeEquationPaste(text: string) {
  text = normalizeMathCharacters(text)
  const fence = /^\s*```[^\n]*\n([\s\S]*?)\n```\s*$/.exec(text)
  text = fence ? fence[1] : text
  const lines = text.split('\n')
  const nonempty = lines.flatMap((line, i) => (line.trim() ? [i] : []))
  // Some rich-text code blocks duplicate every line break. Do not remove ordinary paragraph gaps.
  if (
    nonempty.length >= 3 &&
    nonempty.slice(1).every((index, i) => index - nonempty[i] === 2)
  )
    return lines.filter((line) => line.trim()).join('\n')
  return text
}
````

<a id="source-2"></a>

## src/equation-project.ts

원본: [src/equation-project.ts](../../src/equation-project.ts) · 100줄 · SHA-256: `69160dbbf5e578ea1e2316676f55a301eeb7f4a2a7baecdb0d9c7ab299dd2fef`

```typescript
import type { Project } from './models'
import { normalizeAutomaticModel } from './engine/automatic'
import {
  parseNonlinearExpression,
  type NonlinearNode as Node,
} from './engine/nonlinear-parser'
import { nodeText } from './engine/search-analysis'
import { normalizeEquationSource } from './engine/source-statements'

/** Show saved formula wrappers as ordinary equalities, preserving anchors. */
export function equationProject(project: Project): Project {
  if (project.mode !== 'nonlinear') return project
  try {
    const params = project.parameters.map((p) => p.name)
    const lines = normalizeEquationSource(project.source, params).split('\n')
    if (lines.some((l) => /^\s*f\d+\s*(?:\([^)]*\))?\s*=/.test(l)))
      return project
    const root = /^\s*f\(\s*([A-Za-z][A-Za-z0-9_]*)\s*\)\s*=\s*(.+)$/
    const roots = lines.map((l) => {
      const m = root.exec(l.split('#')[0].trim())
      return m && !['min', 'max'].includes(m[1]) ? m : null
    })
    if (!roots.some(Boolean)) return project
    const rootNames = new Set(roots.flatMap((r) => (r ? [r[1]] : [])))
    const helpers = new Map<string, Node>(),
      helperRows = new Set<number>()
    lines.forEach((l, i) => {
      const m = /^\s*([A-Za-z][A-Za-z0-9_]*)\s*=\s*(.+)$/.exec(l.split('#')[0])
      if (m && !rootNames.has(m[1]) && !params.includes(m[1])) {
        if (helpers.has(m[1])) throw new Error('duplicate helper')
        helpers.set(m[1], parseNonlinearExpression(m[2]).node)
        helperRows.add(i)
      }
    })
    const active = new Set<string>()
    let visits = 0
    const expand = (n: Node, depth = 0): Node => {
      if (depth > 128 || ++visits > 10000) throw new Error('expansion limit')
      if (n.kind === 'name' && helpers.has(n.name)) {
        if (active.has(n.name)) throw new Error('cyclic helper')
        active.add(n.name)
        const r = expand(helpers.get(n.name)!, depth + 1)
        active.delete(n.name)
        return r
      }
      if (n.kind === 'binary')
        return {
          ...n,
          left: expand(n.left, depth + 1),
          right: expand(n.right, depth + 1),
        }
      if (n.kind === 'unary') return { ...n, child: expand(n.child, depth + 1) }
      if (n.kind === 'call')
        return { ...n, args: n.args.map((a) => expand(a, depth + 1)) }
      return n
    }
    const source = lines
      .map((line, i) => {
        if (helperRows.has(i)) return `# ${line.trim()}`
        if (!roots[i]) return line
        const n = expand(parseNonlinearExpression(roots[i]![2]).node)
        return n.kind === 'binary' && n.operator === '-'
          ? `${nodeText(n.left)} = ${nodeText(n.right)}`
          : `${nodeText(n)} = 0`
      })
      .join('\n')
    if (source.length > 30000) return project
    const variables = normalizeAutomaticModel(source, params).variables
    if (
      variables.length !== rootNames.size ||
      variables.some((v) => !rootNames.has(v))
    )
      return project
    const reorder = (anchor: NonNullable<Project['selectedAnchor']>) => {
      if (
        anchor.variables.length !== variables.length ||
        variables.some((v) => !anchor.variables.includes(v))
      )
        return anchor
      return {
        ...anchor,
        variables: [...variables],
        values: variables.map(
          (v) => anchor.values[anchor.variables.indexOf(v)],
        ),
      }
    }
    return {
      ...project,
      source,
      selectedAnchor: project.selectedAnchor
        ? reorder(project.selectedAnchor)
        : undefined,
      simulations: project.simulations?.map(reorder),
    }
  } catch {
    // Invalid drafts remain editable; never erase them during migration.
    return project
  }
}
```

<a id="source-3"></a>

## src/models.ts

원본: [src/models.ts](../../src/models.ts) · 158줄 · SHA-256: `f4743b22f1768d165580c5e77999a544d22f1d39709f60ec537008083ee72639`

```typescript
import type { VariableBounds } from './engine/search-analysis'
import { SHOWCASE_EXAMPLES } from './showcase-examples'
import type {
  ConditionNorm,
  SimulationAnchor,
  MergedSimulationSet,
} from './engine'

export type SolverMode = 'linear' | 'nonlinear'

export type Project = {
  mode?: SolverMode
  title: string
  description: string
  source: string
  parameters: Array<{
    id: string
    name: string
    value: number
    min: number
    max: number
    step: number
  }>
  sweepName: string
  conditionNorm?: ConditionNorm
  nonlinearSearch?: 'auto' | 'manual'
  certifyRoots?: boolean
  searchBounds?: { min: number; max: number }
  variableBounds?: VariableBounds
  selectedSolution?: number
  selectedAnchor?: SimulationAnchor
  simulations?: SimulationAnchor[]
  individualIds?: string[]
  mergedSets?: MergedSimulationSet[]
}

export const DEFAULT_PROJECT: Project = {
  mode: 'linear',
  title: '새 선형 모델',
  description: '방정식을 한 줄씩 입력하고 조절할 값을 파라미터로 추가하세요.',
  source: '',
  parameters: [],
  sweepName: '',
  conditionNorm: 'infinity',
}

export const DEFAULT_NONLINEAR_PROJECT: Project = {
  mode: 'nonlinear',
  title: '새 비선형 모델',
  description:
    '방정식을 그대로 입력하면 실수 해를 자동으로 탐색합니다. 발견한 해를 선택해 결과를 비교하세요.',
  source: '',
  parameters: [],
  sweepName: '',
  conditionNorm: 'infinity',
  nonlinearSearch: 'auto',
}

export type NonlinearExample = {
  id: string
  category: string
  project: Project
  guide?: {
    context: string
    features: string[]
    steps: string[]
    reference: { label: string; url: string }
  }
}

export const NONLINEAR_EXAMPLES: NonlinearExample[] = [
  {
    id: 'positive-root',
    category: '기초 · 여러 실근과 파라미터',
    project: {
      mode: 'nonlinear',
      nonlinearSearch: 'auto',
      title: '제곱식의 두 실근',
      description:
        'x² = target에서 양수와 음수 실근을 함께 탐색합니다. 각 해를 선택하고 target 변화에 따른 결과를 비교하세요.',
      source:
        '# 식을 그대로 적으면 실수 해를 자동으로 탐색합니다\nx^2 = target',
      parameters: [
        { id: 'target', name: 'target', value: 4, min: 1, max: 25, step: 1 },
      ],
      sweepName: 'target',
      conditionNorm: 'infinity',
    },
  },
  {
    id: 'cubic-roots',
    category: '기초 · 세 개의 실근',
    project: {
      mode: 'nonlinear',
      nonlinearSearch: 'auto',
      title: '세 실근을 가진 삼차식',
      description:
        '하나의 방정식에서 x = 1, 2, 3을 탐색합니다. 해 목록에서 각 결과를 선택해 등식 오차와 리포트를 확인하세요.',
      source:
        '# 한 방정식에도 여러 실수 해가 있을 수 있습니다\n(x - 1)*(x - 2)*(x - 3) = 0',
      parameters: [],
      sweepName: '',
      conditionNorm: 'infinity',
    },
  },
  {
    id: 'circle-intersection',
    category: '연립 · 여러 교점 자동 탐색',
    project: {
      mode: 'nonlinear',
      nonlinearSearch: 'auto',
      title: '원과 직선의 교점',
      description:
        '원과 직선의 두 교점 (-3, -4), (4, 3)을 자동으로 탐색합니다. 해 목록에서 각 교점을 선택하세요.',
      source:
        '# 미지수 수와 독립적인 방정식 수를 맞춰 주세요\nx^2 + y^2 = 25\nx - y = 1',
      parameters: [],
      sweepName: '',
      conditionNorm: 'infinity',
    },
  },
  {
    id: 'equilibrium-concentration',
    category: '화학공학 · 평형 농도',
    project: {
      mode: 'nonlinear',
      nonlinearSearch: 'auto',
      title: '비선형 물질수지와 평형 농도',
      description:
        'k·C² + C = C0의 두 실근을 탐색합니다. 기본값에서는 약 -3.236068과 1.236068이며, 실제 농도로 해석할 때는 양수 해를 선택하세요.',
      source:
        '# 수학적 실근 중 물리적으로 가능한 농도를 선택하세요\nk*C^2 + C = C0',
      parameters: [
        { id: 'k', name: 'k', value: 0.5, min: 0.1, max: 2, step: 0.1 },
        { id: 'C0', name: 'C0', value: 2, min: 0.5, max: 5, step: 0.1 },
      ],
      sweepName: 'C0',
      conditionNorm: 'infinity',
    },
  },
  {
    id: 'helper-logarithm',
    category: '응용 · 보조식과 로그 함수',
    project: {
      mode: 'nonlinear',
      nonlinearSearch: 'auto',
      title: '보조식으로 나누어 쓰는 비선형 모델',
      description:
        '함수를 정의한 뒤 원하는 값과 같게 두세요. 상용로그 log를 사용하며, 자동 탐색에서 x = 20을 찾습니다.',
      source:
        '# 함수 정의 후 목표값과 같은 방정식을 입력합니다\nf1(x) = x*log(x/2) + 4*x^2\nf1(x) = 1620',
      parameters: [],
      sweepName: '',
      conditionNorm: 'infinity',
    },
  },
  ...SHOWCASE_EXAMPLES,
]
```

<a id="source-4"></a>

## src/showcase-examples.ts

원본: [src/showcase-examples.ts](../../src/showcase-examples.ts) · 257줄 · SHA-256: `5143c2615adbc11880a4c32f628a8e74864824dc7f552b6f8e5bc7d51751fb24`

```typescript
import type { NonlinearExample, Project } from './models'

const parameter = (
  name: string,
  value: number,
  min: number,
  max: number,
  step: number,
) => ({ id: name, name, value, min, max, step })
const example = (
  id: string,
  category: string,
  title: string,
  description: string,
  source: string,
  parameters: Project['parameters'],
  sweepName: string,
  guide: NonNullable<NonlinearExample['guide']>,
): NonlinearExample => ({
  id,
  category,
  guide,
  project: {
    mode: 'nonlinear',
    nonlinearSearch: 'auto',
    conditionNorm: 'infinity',
    title,
    description,
    source,
    parameters,
    sweepName,
  },
})

// Textbook models with illustrative dimensionless parameters, not fitted experimental data.
export const SHOWCASE_EXAMPLES: NonlinearExample[] = [
  example(
    'landau-fold',
    '수학·물리 · 세 분기와 두 접점',
    'Landau 모형의 평형 분기',
    '퍼텐셜 U=x⁴/4−x²/2−h·x의 평형 x³−x=h를 풉니다. h=0의 세 해를 병합해 ±0.3849 부근에서 두 해가 만나는 모습을 관찰하세요.',
    '# dU/dx=0: 평형 조건이며 시간 적분은 하지 않습니다\nf1(x) = x^3 - x\nf1(x) - h = 0',
    [parameter('h', 0, -0.6, 0.6, 0.01)],
    'h',
    {
      context:
        'Landau 퍼텐셜의 정상점입니다. 그래프는 외부장 h에 따른 평형 위치이며 시간 궤적이 아닙니다.',
      features: ['다중 실근', '근 병합', '병합 세트'],
      steps: [
        '시뮬레이션에서 병합 세트 추가를 눌러 세 해를 한 그래프에 담으세요.',
        'h를 −0.6에서 0.6으로 움직여 두 접점 h=±2/(3√3)≈±0.384900을 확인하세요.',
        '병합 뒤 빈 분기는 추적이 종료된 가지입니다. 반대로 움직이면 두 실근이 다시 나타납니다.',
      ],
      reference: {
        label: 'Landau theory · Landau 자유에너지 모형',
        url: 'https://en.wikipedia.org/wiki/Landau_theory',
      },
    },
  ),
  example(
    'mean-field-magnet',
    '통계물리 · 비선형 자기일관 방정식',
    '평균장 Ising 모형의 자기화',
    'm=tanh(βm+h)의 자기일관 방정식입니다. β=2에서 세 평형 자기화를 비교하고 외부장 h로 두 분기가 합쳐지는 임계점을 탐색합니다.',
    '# 무차원 자기화 m, 상호작용 beta, 외부장 h\nf1(m) = m\nf2(m) = tanh(beta*m + h)\nf1(m) - f2(m) = 0',
    [parameter('beta', 2, 0.5, 3, 0.05), parameter('h', 0, -0.9, 0.9, 0.01)],
    'h',
    {
      context:
        '평균장 근사의 Ising 자기화 식입니다. 수학적 평형과 열역학적 안정성은 별개이며 안정성을 자동 판정하지 않습니다.',
      features: ['쌍곡함수', '함수 간 연산', '분기 소멸'],
      steps: [
        'β=2, h=0을 유지하고 세 해를 병합 세트에 담으세요. m≈0, ±0.9575입니다.',
        'h를 양쪽으로 움직이면 h≈±0.53284에서 두 분기가 만납니다.',
        'β를 0.8로 낮추면 단일 평형만 남습니다. β 변경은 모델 곡선을 재계산하므로, 새 해를 선택해 비교하세요.',
      ],
      reference: {
        label: 'Ising model · Mean field theory',
        url: 'https://en.wikipedia.org/wiki/Ising_model#Mean_field_theory',
      },
    },
  ),
  example(
    'semenov-ignition',
    '반응·열공학 · 발열과 냉각의 접점',
    'Semenov 열폭주 임계점',
    '무차원 발열 exp(θ)과 열제거 q·θ의 평형입니다. q=4에서 두 온도 해를 비교하고 q=e, θ=1의 접점을 확인하세요.',
    '# Semenov 집중정수 모형의 지수 근사 정상 열수지\nf1(theta) = exp(theta)\nf2(theta) = q*theta\nf1(theta) - f2(theta) = 0',
    [parameter('q', 4, 2, 6, 0.05)],
    'q',
    {
      context:
        'Arrhenius 발열을 지수로 근사한 Semenov 정상 열수지입니다. θ는 온도 상승, q는 열제거 계수의 무차원 값입니다.',
      features: ['지수함수', '열폭주 임계점', '근 병합'],
      steps: [
        'q=4의 두 해 θ≈0.3574, 2.1533을 병합해 보세요.',
        'q를 낮춰 e≈2.718282에 접근하면 두 정상 온도가 θ=1에서 접합니다.',
        'q<e에서는 이 근사 모형의 정상 열수지 해가 없습니다. 온도의 시간적 발산 자체를 계산하는 예제는 아닙니다.',
      ],
      reference: {
        label: 'Thermal runaway · 열폭주와 열수지',
        url: 'https://en.wikipedia.org/wiki/Thermal_runaway',
      },
    },
  ),
  example(
    'van-der-waals',
    '열역학 · 비이상 기체의 다중 체적',
    'van der Waals 등온선',
    '환산 상태방정식 P=8T/(3v−1)−3/v²를 풉니다. T=0.9에서 압력에 따른 세 체적 해와 스피노달 접점을 비교하세요.',
    '# 환산 압력 P, 온도 T, 몰체적 v\n# 물리적 체적은 v > 1/3\nf1(v) = 8*T/(3*v - 1) - 3/v^2\nf1(v) - P = 0',
    [
      parameter('T', 0.9, 0.85, 1.1, 0.01),
      parameter('P', 0.6, 0.3, 0.85, 0.01),
    ],
    'P',
    {
      context:
        'van der Waals 환산 상태방정식의 수학적 해입니다. 중간 가지까지 표시하며 Maxwell 등면적 구성이나 상평형을 대신하지 않습니다.',
      features: ['유리함수', '세 체적 해', '정의역·극점'],
      steps: [
        'T=0.9와 P=0.6의 세 체적 해를 병합 세트에 담으세요.',
        'P를 움직여 P≈0.41984, 0.72401 부근의 스피노달 끝점을 살펴보세요.',
        'v>1/3의 물리적 영역을 확인하세요. v=0, 1/3은 원래 식의 극점이므로 연결하면 안 됩니다.',
      ],
      reference: {
        label: 'Van der Waals equation · 환산 상태방정식',
        url: 'https://en.wikipedia.org/wiki/Van_der_Waals_equation#Reduced_form',
      },
    },
  ),
  example(
    'dimensional-van-der-waals',
    '열역학 · L·bar·K 단위와 유리식',
    '몰체적을 계산하는 van der Waals',
    'a=3.59, b=0.0427, R=0.08314에서 T=280 K, P=53 bar의 세 몰체적을 풉니다. 유리식과 삼차식 표현을 비교하세요.',
    '# V: L/mol, P: bar, T: K\n(P + a/V^2)*(V - b) = R*T',
    [
      parameter('a', 3.59, 3, 4, 0.01),
      parameter('b', 0.0427, 0.03, 0.05, 0.0001),
      parameter('R', 0.08314, 0.08, 0.09, 0.00001),
      parameter('T', 280, 270, 310, 1),
      parameter('P', 53, 45, 62, 0.1),
    ],
    'P',
    {
      context:
        '예시 상수를 사용하는 van der Waals 몰 상태방정식입니다. 모든 상수는 L·bar·K·mol 단위 체계에 맞추었습니다. 임계온도는 약 299.628 K입니다.',
      features: ['유리식의 세 근', '단위 체계', '표현식 비교'],
      steps: [
        '기본값의 V≈0.0853504100, 0.1245926854, 0.2719870933 L/mol을 비교하세요. 세 해 모두 V>b인지 확인하세요.',
        '세 해를 병합해 P≈47.1563, 58.7502 bar의 분기 끝점을 살펴보세요. T를 300 K로 바꾸면 임계온도보다 높아 하나의 실근만 남습니다. 온도 변경 후에는 새 해를 선택하세요.',
        '식 에디터를 P*V^3-(P*b+R*T)*V^2+a*V-a*b=0 으로 바꿔 같은 세 근인지 비교할 수 있습니다. 분모를 제거한 후보는 원래 식에서 검증해야 합니다.',
      ],
      reference: {
        label: 'Van der Waals equation · 임계 상수',
        url: 'https://en.wikipedia.org/wiki/Van_der_Waals_equation#Critical_point',
      },
    },
  ),
  example(
    'transcendental-folds',
    '수학 · 초월함수의 두 접점',
    '삼각·쌍곡함수의 교점 병합',
    'cos((3/π)x)와 sinh(x)/3+tr의 교점을 구합니다. 함수 정의를 조합하고 두 접점에서의 분기 병합을 비교하는 예제입니다.',
    'f1(x) = cos((3/pi)*x)\nf2(x) = (1/3)*sinh(x) + tr\nf1(x) - f2(x) = 0',
    [parameter('tr', 0.95, 0.75, 1.15, 0.005)],
    'tr',
    {
      context:
        '다항식이 아닌 두 곡선의 교점 문제입니다. 함수값 일치와 접선 기울기 일치를 함께 살펴봅니다.',
      features: ['번호 함수', '초월함수 접점', '그래프 클릭'],
      steps: [
        'tr=0.95의 세 해를 병합 세트에 추가하세요.',
        'tr≈0.8292548과 1.0648626에서 만나는 해의 쌍을 비교하세요.',
        '근 병합 안내를 클릭해 추정 임계 파라미터로 이동하고 해석 리포트의 등식 오차를 함께 확인하세요.',
      ],
      reference: {
        label: 'Saddle-node bifurcation · Fold 정상형',
        url: 'https://en.wikipedia.org/wiki/Saddle-node_bifurcation',
      },
    },
  ),
  example(
    'quartic-contact',
    '수학 · 4차 평탄 접점',
    '4차 접점에서 생기는 두 해',
    '(x−1)⁴=p의 두 해는 p=0, x=1에서 만납니다. 2차 접점보다 평탄한 고차 접점을 비교하세요.',
    '(x - 1)^4 = p',
    [parameter('p', 0.0625, -0.05, 0.2, 0.005)],
    'p',
    {
      context:
        '고차 중근의 정상형 예제입니다. p>0에서는 두 실근, p=0에서는 4중근 하나, p<0에서는 실근이 없습니다.',
      features: ['평탄한 근 병합', '두 해의 생성·병합'],
      steps: [
        '기본값의 x=0.5, 1.5를 병합하세요.',
        'p=0 부근을 확대해 근 병합 안내를 확인하세요.',
        'p의 부호에 따라 달라지는 실근 수를 확인하세요. 실패 구간을 가로지르는 선은 그리지 않습니다.',
      ],
      reference: {
        label: 'Multiplicity · 중근의 차수',
        url: 'https://en.wikipedia.org/wiki/Multiplicity_(mathematics)#Multiplicity_of_a_root_of_a_polynomial',
      },
    },
  ),
  example(
    'cubic-passage',
    '수학 · 소멸 없이 관통하는 3차 접점',
    '3차 변곡 접점을 지나는 해',
    'x³=p의 유일 실근은 원점을 통과합니다. 접점이 있다고 항상 두 해가 병합·소멸하는 것은 아님을 확인하세요.',
    'x^3 = p',
    [parameter('p', 0.125, -1, 1, 0.05)],
    'p',
    {
      context:
        '3차 변곡 접점의 정상형입니다. 두 파라미터가 필요한 일반적인 Cusp 분기 전체를 표현하는 예제는 아닙니다.',
      features: ['변곡점 통과', '0 교차', '연속 추적'],
      steps: [
        'p를 음수에서 양수로 움직여 해가 끊기지 않고 원점을 통과하는지 살펴보세요.',
        '원점의 변곡점 통과 안내와 x=∛p의 수직 접선 모양을 확인하세요.',
        '그래프 클릭으로 샘플 사이의 연속 값을 선택하고 표의 샘플 포인트와 비교하세요.',
      ],
      reference: {
        label: 'Cubic function · 삼차함수',
        url: 'https://en.wikipedia.org/wiki/Cubic_function',
      },
    },
  ),
  example(
    'mass-action-system',
    '화학 · 세 변수와 질량작용 평형',
    'A+B ⇌ C의 비선형 화학평형',
    '두 물질수지와 C=K·A·B를 함께 풉니다. 세 미지수와 혼합식 정의를 사용하고 수학적 실근에서 가능한 농도를 고르세요.',
    '# 농도는 같은 기준 농도로 무차원화한 예시\nf1 = A + C - A0\nf2 = B + C - B0\nf3 = C - K*A*B\nf1 = 0\nf2 = 0\nf3 = 0',
    [
      parameter('A0', 2, 0.5, 3, 0.1),
      parameter('B0', 1, 0.5, 3, 0.1),
      parameter('K', 4, 0.25, 8, 0.05),
    ],
    'K',
    {
      context:
        '이상 혼합물에서 A+B⇌C의 질량작용 평형과 원료 수지입니다. 표준화한 농도·평형상수의 교육용 값입니다.',
      features: ['비선형 연립식', '혼합식 정의', '물리적 해 선택'],
      steps: [
        '발견한 해 중 A≥0, B≥0, 0≤C≤min(A0,B0)를 만족하는 해를 선택하세요.',
        '기본값의 물리적 해는 C≈0.824609입니다. 다른 실근은 농도 조건을 만족하지 않습니다.',
        'K를 움직이며 농도 변화를 탐색하고, 리포트에서 물질수지 등식 오차와 Jacobian 조건수를 확인하세요.',
      ],
      reference: {
        label: 'Law of mass action · 질량작용 법칙',
        url: 'https://en.wikipedia.org/wiki/Law_of_mass_action',
      },
    },
  ),
]
```

<a id="source-5"></a>

## src/solver-input.ts

원본: [src/solver-input.ts](../../src/solver-input.ts) · 33줄 · SHA-256: `3ca2bb87c4650b981380ff1a890ba8304a10c7ae5d12f87523b38abbc68cc9a2`

```typescript
import type { Project } from './models'

/** Only inputs that affect a calculation belong in this request. */
export function createSolverInput(project: Project) {
  const sweep = project.parameters.find((p) => p.name === project.sweepName)
  return {
    source: project.source,
    conditionNorm: project.conditionNorm ?? 'infinity',
    mode: project.mode ?? 'linear',
    nonlinearSearch: project.nonlinearSearch ?? 'auto',
    certifyRoots: project.certifyRoots ?? false,
    searchBounds: project.searchBounds,
    variableBounds: project.variableBounds,
    solutionIndex: project.selectedSolution ?? 0,
    simulationAnchors: project.simulations,
    selectedAnchor: project.selectedAnchor,
    parameters: Object.fromEntries(
      project.parameters.map((p) => [p.name, p.value]),
    ),
    sweep: sweep
      ? {
          name: sweep.name,
          min: sweep.min,
          max: sweep.max,
          steps: 81,
          step: sweep.step,
        }
      : null,
  }
}

export const solverInputKey = (project: Project, revision: number) =>
  JSON.stringify([createSolverInput(project), revision])
```

<a id="source-6"></a>

## src/use-project-persistence.ts

원본: [src/use-project-persistence.ts](../../src/use-project-persistence.ts) · 54줄 · SHA-256: `f7c04347bf5ce7e49117f36e3cf4f3229a8360f98c25337d19e0aacc5502a838`

```typescript
import { useEffect, useRef } from 'react'
import type { Project, SolverMode } from './models'

/** Batch synchronous storage writes, flushing committed edits before leaving. */
export function useProjectPersistence(
  project: Project,
  storageKey: string,
  onStatus: (ok: boolean) => void,
) {
  const latest = useRef(project)
  const dirtyModes = useRef(new Map<SolverMode, Project>())
  const saved = useRef<Project | null>(null)
  const flushRef = useRef<() => void>(() => {})
  latest.current = project
  flushRef.current = () => {
    const current = latest.current
    if (!dirtyModes.current.size && saved.current === current) return
    dirtyModes.current.set(current.mode ?? 'linear', current)
    try {
      let currentJson = ''
      for (const [mode, draft] of dirtyModes.current) {
        const json = JSON.stringify(draft)
        localStorage.setItem(`${storageKey}-${mode}`, json)
        if (draft === current) currentJson = json
      }
      localStorage.setItem(storageKey, currentJson)
      dirtyModes.current.clear()
      saved.current = current
      onStatus(true)
    } catch {
      onStatus(false)
    }
  }
  useEffect(() => {
    dirtyModes.current.set(project.mode ?? 'linear', project)
    const timer = setTimeout(() => flushRef.current(), 300)
    return () => clearTimeout(timer)
  }, [project])
  useEffect(() => {
    const flush = () => flushRef.current()
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', flush)
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('beforeunload', flush)
      document.removeEventListener('visibilitychange', onVisibility)
      flush()
    }
  }, [storageKey])
}
```

<a id="source-7"></a>

## src/equation-count.ts

원본: [src/equation-count.ts](../../src/equation-count.ts) · 32줄 · SHA-256: `ce7ae70fb45164fd52d5a716d511e6808db12fd42f88c2c711d2aa6b7733841a`

```typescript
import { preprocessSolverSource } from './engine/preprocessor'
import { isNonlinearFunction } from './engine/nonlinear-parser'

/** Count the same equation/metadata roles accepted by the model parser. */
export function countEquations(
  source: string,
  nonlinear: boolean,
  parameters: string[] = [],
) {
  try {
    source = preprocessSolverSource(
      source,
      parameters,
      nonlinear ? 'nonlinear' : 'linear',
    )
  } catch {
    return 0
  }
  const lines = source
    .split('\n')
    .map((line) => line.split('#')[0].trim())
    .filter(Boolean)
  const isCondition = (line: string) => {
    const match = /^([A-Za-z][A-Za-z0-9_]*)\(\s*(min|max|0)\s*\)\s*=/.exec(line)
    return Boolean(match && !isNonlinearFunction(match[1]))
  }
  const isRoot = (line: string) =>
    !isCondition(line) && /^f\(\s*[A-Za-z][A-Za-z0-9_]*\s*\)\s*=/.test(line)
  return nonlinear && lines.some(isRoot)
    ? lines.filter(isRoot).length
    : lines.filter((line) => !isCondition(line)).length
}
```

<a id="source-8"></a>

## src/csv.ts

원본: [src/csv.ts](../../src/csv.ts) · 14줄 · SHA-256: `bb546b391ed7aafb20d55bdf2733ef13de576a4a7a273b299c5385a4d34edfa3`

```typescript
export function encodeCsv(rows: readonly (readonly (string | number)[])[]) {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const text = String(value)
          return /[",\r\n]/.test(text)
            ? `"${text.replaceAll('"', '""')}"`
            : text
        })
        .join(','),
    )
    .join('\r\n')
}
```

<a id="source-9"></a>

## src/engine/sweep.ts

원본: [src/engine/sweep.ts](../../src/engine/sweep.ts) · 180줄 · SHA-256: `1cbcb5546e4e7b6ad3d26be96d10b4b324f4d86a57ea0e254a0b46f1bd4e20b8`

```typescript
import {
  ModelError,
  type SolvePayload,
  type SolveResult,
  type SolverOptions,
  type SweepPoint,
} from './index'

export const MAX_DATASET_POINTS = 2000

export type SweepSettings = {
  name: string
  min: number
  max: number
  /** Uniform rendering samples; independent from the tabulated interval. */
  steps: number
  /** User-selected interval for the table and CSV dataset. */
  step: number
  maxPoints?: number
}

/** Represent the user's decimal inputs on one integer lattice, avoiding drift
 * from repeated floating-point addition (for example 0.2 + 0.01 + ...). */
function decimalParts(value: number): {
  coefficient: bigint
  exponent: number
} {
  const [mantissa, power = '0'] = value.toString().split('e')
  const [whole, fraction = ''] = mantissa.split('.')
  return {
    coefficient: BigInt(whole + fraction),
    exponent: Number(power) - fraction.length,
  }
}

export function parameterValues(
  min: number,
  max: number,
  step: number,
  limit = MAX_DATASET_POINTS,
): number[] {
  if (![min, max, step].every(Number.isFinite) || min >= max || step <= 0)
    throw new ModelError(
      '데이터 간격은 0보다 큰 유한한 숫자여야 하며, 최솟값은 최댓값보다 작아야 합니다.',
    )
  if (!Number.isSafeInteger(limit) || limit < 2)
    throw new ModelError('데이터 행 수의 상한은 2 이상의 정수여야 합니다.')

  const parts = [min, max, step].map(decimalParts)
  const exponent = Math.min(...parts.map((part) => part.exponent))
  const [start, end, interval] = parts.map(
    (part) => part.coefficient * 10n ** BigInt(part.exponent - exponent),
  )
  const span = end - start
  const intervals = span / interval
  const remainder = span % interval
  const toNumber = (units: bigint) => Number(`${units}e${exponent}`)

  // A computed endpoint such as 0.1 + 0.2 can be one ULP above 0.3.
  // In that case use the exact supplied maximum once, not a phantom extra row.
  const lastRegular = toNumber(start + intervals * interval)
  const endpointTolerance = Math.min(
    Number.EPSILON *
      4 *
      Math.max(Math.abs(lastRegular), Math.abs(max), Math.abs(step)),
    Math.abs(step) * 1e-9,
  )
  const endsAtMaximum =
    remainder === 0n ||
    (intervals > 0n && Math.abs(max - lastRegular) <= endpointTolerance)
  const rowCount = intervals + (endsAtMaximum ? 1n : 2n)
  if (rowCount > BigInt(limit))
    throw new ModelError(
      `현재 간격의 데이터는 최대 ${limit.toLocaleString('ko-KR')}행을 초과합니다. 간격을 키우거나 범위를 줄여 주세요. 설정 간격은 자동으로 변경하지 않습니다.`,
    )

  const values: number[] = []
  for (let i = 0; i <= Number(intervals); i++) {
    const value =
      endsAtMaximum && i === Number(intervals)
        ? max
        : toNumber(start + BigInt(i) * interval)
    if (
      !Number.isFinite(value) ||
      (values.length > 0 && value <= values[values.length - 1])
    )
      throw new ModelError(
        '설정 간격이 현재 숫자의 정밀도보다 작습니다. 간격을 키우거나 범위를 조정해 주세요.',
      )
    values.push(value)
  }
  if (!endsAtMaximum) {
    if (max <= values[values.length - 1])
      throw new ModelError(
        '설정 간격으로 서로 다른 데이터 지점을 표현할 수 없습니다. 간격을 조정해 주세요.',
      )
    values.push(max)
  }
  return values
}

type Solver = (
  source: string,
  parameters: Record<string, number>,
  options?: SolverOptions,
) => SolveResult
type Sweeps = Pick<
  SolvePayload,
  'sweep' | 'dataset' | 'datasetError' | 'sweepName'
>

/** Graph density stays stable while the table and CSV preserve the user's step. */
export function computeSweeps(
  solve: Solver,
  source: string,
  parameters: Record<string, number>,
  settings: SweepSettings | null,
): Sweeps {
  if (!settings) return { sweep: [], dataset: [], sweepName: '' }
  const { name, min, max, steps, step } = settings
  if (
    !Object.hasOwn(parameters, name) ||
    ![min, max, steps].every(Number.isFinite) ||
    max <= min
  )
    throw new ModelError('시뮬레이션 파라미터와 범위를 확인해 주세요.')

  const cache = new Map<number, SweepPoint>()
  const pointAt = (parameter: number): SweepPoint => {
    const cached = cache.get(parameter)
    if (cached) return cached
    let point: SweepPoint
    try {
      point = {
        parameter,
        values: solve(
          source,
          { ...parameters, [name]: parameter },
          { computeCondition: false },
        ).values,
      }
    } catch (error) {
      point = {
        parameter,
        values: null,
        error: error instanceof Error ? error.message : '계산 실패',
      }
    }
    cache.set(parameter, point)
    return point
  }

  const graphCount = Math.min(201, Math.max(2, Math.round(steps)))
  const sweep = Array.from({ length: graphCount }, (_, i) => {
    const fraction = i / (graphCount - 1)
    return pointAt(min * (1 - fraction) + max * fraction)
  })
  try {
    return {
      sweep,
      dataset: parameterValues(
        min,
        max,
        step,
        settings.maxPoints ?? MAX_DATASET_POINTS,
      ).map(pointAt),
      sweepName: name,
    }
  } catch (error) {
    return {
      sweep,
      dataset: [],
      datasetError:
        error instanceof Error
          ? error.message
          : '데이터를 생성하지 못했습니다.',
      sweepName: name,
    }
  }
}
```

<a id="source-10"></a>

## src/engine/branches.ts

원본: [src/engine/branches.ts](../../src/engine/branches.ts) · 516줄 · SHA-256: `a3a6d4c4233db71808b87bd0f2281cfe1ec86efd970863d108a7c58f7741bb9c`

```typescript
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
              ? `${name} ≈ ${Number(singleTangency.parameterStar.toPrecision(6))} 부근의 접점 후보입니다. 원래 식의 등식 오차·도함수 재검증이 필요합니다.`
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
```

<a id="source-11"></a>

## src/engine/branch-events.ts

원본: [src/engine/branch-events.ts](../../src/engine/branch-events.ts) · 74줄 · SHA-256: `da7ddaa15bed08a0b2b88f480a25ca1352ca7231946ccd34dd80a09c2983e291`

```typescript
import type { BranchTerminalEvent } from './index'
import { tangencyLabel } from './tangency'

export const eventLocation = (event: BranchTerminalEvent) =>
  event.tangency?.verified
    ? {
        parameter: event.tangency.parameterStar,
        values: event.tangency.valuesStar,
      }
    : { parameter: event.parameter, values: event.values }

// Compare refined coordinates, not the coarser points where tracking stopped.
// This is presentation/event reconciliation; it never merges computed roots.
function nearCoordinate(a: number, b: number) {
  return (
    a === b ||
    Math.abs(a - b) <=
      8192 *
        Number.EPSILON *
        Math.max(Number.MIN_VALUE, Math.abs(a), Math.abs(b))
  )
}
export function sameVerifiedEvent(
  a: BranchTerminalEvent,
  b: BranchTerminalEvent,
) {
  if (
    !a.tangency?.verified ||
    !b.tangency?.verified ||
    a.tangency.bifurcationOrder !== b.tangency.bifurcationOrder
  )
    return false
  const x = eventLocation(a),
    y = eventLocation(b)
  return (
    nearCoordinate(x.parameter, y.parameter) &&
    x.values.length === y.values.length &&
    x.values.every((v, i) => nearCoordinate(v, y.values[i]))
  )
}
export function uniqueBranchEvents(
  events: readonly BranchTerminalEvent[],
): BranchTerminalEvent[] {
  const result: BranchTerminalEvent[] = []
  for (const event of events) {
    const index = result.findIndex(
      (other) =>
        sameVerifiedEvent(event, other) ||
        (event.kind === other.kind &&
          event.parameter === other.parameter &&
          event.values.length === other.values.length &&
          event.values.every((v, i) => v === other.values[i])),
    )
    if (index < 0) result.push(event)
    else if (
      event.kind === 'merge' ||
      (event.tangency?.verified && !result[index].tangency?.verified)
    )
      result[index] = event
  }
  return result
}
export function branchEventLabel(event: BranchTerminalEvent) {
  const t = event.tangency
  if (t?.verified) return tangencyLabel(t)
  return event.kind === 'merge' ? '근 병합 추정' : '추적 종료'
}
export function branchEventText(
  event: BranchTerminalEvent,
  parameterName: string,
) {
  const location = eventLocation(event)
  return `${branchEventLabel(event)} · ${parameterName || '파라미터'} ≈ ${Number(location.parameter.toPrecision(8))}`
}
```

<a id="source-12"></a>

## src/engine/simulation-panels.ts

원본: [src/engine/simulation-panels.ts](../../src/engine/simulation-panels.ts) · 474줄 · SHA-256: `2c587acd2b9c2638599fc8a1aaf48306f35137793b3c8f45e21a5d69f483e63f`

```typescript
import { nonsmoothSource } from './search-analysis'
import { sameVerifiedEvent } from './branch-events'
import { normalizeAutomaticModel } from './automatic'
import { compileNonlinear } from './nonlinear-parser'
import { adaptiveDerivative, verifyScalarTangency } from './tangency'
import {
  ModelError,
  type ConditionNorm,
  type SimulationAnchor,
  type SimulationPanel,
  type SolveResult,
  type BranchTerminalEvent,
} from './index'
import { computeBranchSweeps, continueRoot, type NearSolver } from './branches'
import type { SweepSettings } from './sweep'

export const MAX_SIMULATION_PANELS = 6
const MAX_CACHED_PANELS = 48

const sortedParameters = (parameters: Record<string, number>) =>
  Object.entries(parameters).sort(([a], [b]) => a.localeCompare(b))

function validateAnchor(
  anchor: SimulationAnchor,
  parameters: Record<string, number>,
) {
  if (
    !anchor ||
    typeof anchor.id !== 'string' ||
    !anchor.id ||
    typeof anchor.label !== 'string' ||
    !Array.isArray(anchor.variables) ||
    !anchor.variables.length ||
    anchor.variables.length > 64 ||
    Array.from(anchor.variables).some(
      (name) =>
        typeof name !== 'string' || !/^[A-Za-z][A-Za-z0-9_]*$/.test(name),
    ) ||
    new Set(anchor.variables).size !== anchor.variables.length ||
    !Array.isArray(anchor.values) ||
    anchor.values.length !== anchor.variables.length ||
    !Array.from(anchor.values).every(Number.isFinite) ||
    !anchor.parameters ||
    typeof anchor.parameters !== 'object' ||
    Array.isArray(anchor.parameters) ||
    !Object.values(anchor.parameters).every(Number.isFinite)
  )
    throw new ModelError('선택한 해의 저장 정보를 확인해 주세요.')

  const originNames = Object.keys(anchor.parameters).sort()
  const currentNames = Object.keys(parameters).sort()
  if (
    !Object.values(parameters).every(Number.isFinite) ||
    originNames.length !== currentNames.length ||
    originNames.some((name, i) => name !== currentNames[i])
  )
    throw new ModelError('파라미터가 변경되었습니다. 해를 다시 선택해 주세요.')
}

function matchesAnchor(result: SolveResult, anchor: SimulationAnchor) {
  return (
    result.variables.length === anchor.variables.length &&
    result.values.length === anchor.values.length &&
    result.variables.every((name, i) => name === anchor.variables[i]) &&
    result.values.every(
      (value, i) =>
        Number.isFinite(value) &&
        Math.abs(value - anchor.values[i]) <=
          1e-9 *
            Math.max(
              Number.MIN_VALUE,
              Math.abs(value),
              Math.abs(anchor.values[i]),
            ),
    )
  )
}

type ReferenceCurve = Pick<
  SimulationPanel,
  'sweep' | 'dataset' | 'datasetError' | 'sweepName' | 'events'
> & {
  reference: SolveResult
  parameters: Record<string, number>
}

/** The reference point and sampled curve are immutable while the swept
 * parameter moves. Only the exact current root is recomputed. Other parameter
 * changes intentionally define a new curve, reached from the saved anchor. */
export function createSimulationPanelComputer(solveNear: NearSolver) {
  const cache = new Map<string, SimulationPanel>()
  const curves = new Map<string, ReferenceCurve>()

  function remember<T>(map: Map<string, T>, key: string, value: T) {
    if (map.size >= MAX_CACHED_PANELS) map.delete(map.keys().next().value!)
    map.set(key, value)
  }

  return (
    source: string,
    parameters: Record<string, number>,
    sweep: SweepSettings | null,
    anchors: SimulationAnchor[],
    conditionNorm: ConditionNorm = 'infinity',
  ): SimulationPanel[] => {
    if (!Array.isArray(anchors) || anchors.length > MAX_SIMULATION_PANELS)
      throw new ModelError(
        `동시에 탐색할 수 있는 해는 최대 ${MAX_SIMULATION_PANELS}개입니다.`,
      )
    if (
      Array.from(anchors).some(
        (anchor) => !anchor || typeof anchor.id !== 'string',
      ) ||
      new Set(anchors.map((anchor) => anchor.id)).size !== anchors.length
    )
      throw new ModelError('시뮬레이션의 해 식별자가 올바르지 않습니다.')

    return anchors.map((anchor) => {
      const empty = {
        id: anchor.id,
        label: anchor.label,
        result: null,
        sweep: [],
        dataset: [],
        sweepName: sweep?.name ?? '',
      }
      try {
        validateAnchor(anchor, parameters)
        if (sweep && !Object.hasOwn(anchor.parameters, sweep.name))
          throw new ModelError('탐색할 파라미터를 확인해 주세요.')
        const anchorKey = [
          source,
          anchor.id,
          anchor.label,
          anchor.variables,
          anchor.values,
          sortedParameters(anchor.parameters),
        ]
        const sweepKey = sweep
          ? [
              sweep.name,
              sweep.min,
              sweep.max,
              sweep.steps,
              sweep.step,
              sweep.maxPoints ?? 500,
            ]
          : null
        const key = JSON.stringify([
          ...anchorKey,
          sortedParameters(parameters),
          sweepKey,
          conditionNorm,
        ])
        const cached = cache.get(key)
        if (cached) {
          cache.delete(key)
          cache.set(key, cached)
          return cached
        }

        // Hold the sweep coordinate at its saved value. Re-seeding from the
        // moving current point changes continuation paths and visible gaps.
        const referenceParameters = sweep
          ? { ...parameters, [sweep.name]: anchor.parameters[sweep.name] }
          : { ...anchor.parameters }
        const curveKey = JSON.stringify([
          ...anchorKey,
          sortedParameters(referenceParameters),
          sweepKey,
        ])
        let curve = curves.get(curveKey)
        if (curve) {
          curves.delete(curveKey)
          curves.set(curveKey, curve)
        } else {
          const origin = solveNear(
            source,
            anchor.parameters,
            [...anchor.values],
            { computeCondition: false },
          )
          if (!matchesAnchor(origin, anchor))
            throw new ModelError(
              '저장한 해가 현재 수식과 다릅니다. 해를 다시 선택해 주세요.',
            )
          let reference: SolveResult
          try {
            reference = continueRoot(
              solveNear,
              source,
              anchor.parameters,
              referenceParameters,
              origin,
              { computeCondition: false },
            )
          } catch (cause) {
            throw new ModelError(
              `선택한 해의 분기를 기준점까지 추적할 수 없습니다. ${cause instanceof Error ? cause.message : '계산 실패'}`,
            )
          }
          curve = {
            reference,
            parameters: referenceParameters,
            ...computeBranchSweeps(
              solveNear,
              source,
              referenceParameters,
              sweep ? { ...sweep, maxPoints: 500 } : null,
              reference,
            ),
          }
          // Local verification is cached with the reference curve, never with the slider.
          if (
            sweep &&
            reference.kind === 'nonlinear' &&
            !nonsmoothSource(source) &&
            reference.variables.length === 1
          ) {
            try {
              const normalized = normalizeAutomaticModel(
                source,
                Object.keys(referenceParameters),
              )
              const model = compileNonlinear(
                `${normalized.source}\n${reference.variables[0]}(min) = -1e100\n${reference.variables[0]}(max) = 1e100`,
                Object.keys(referenceParameters),
              )
              const evaluate = (x: number, p: number) => {
                try {
                  const f = model.evaluate([x], {
                    ...referenceParameters,
                    [sweep.name]: p,
                  }).residuals[0]
                  return Number.isFinite(f) ? f : undefined
                } catch {
                  return undefined
                }
              }
              const ranked = curve.sweep
                .filter((pt) => pt.values)
                .map((pt) => ({
                  pt,
                  slope: adaptiveDerivative(
                    (x) => evaluate(x, pt.parameter),
                    pt.values![0],
                  ),
                }))
                .filter((v) => v.slope)
                .sort(
                  (a, b) => Math.abs(a.slope!.value) - Math.abs(b.slope!.value),
                )
              const seeds = [
                ...(curve.events ?? []).map((ev) => ({
                  parameter: ev.parameter,
                  values: ev.values,
                })),
                ...ranked.slice(0, 3).map((v) => v.pt),
              ]
              for (const seed of seeds) {
                const verified = verifyScalarTangency(
                  evaluate,
                  seed.values![0],
                  seed.parameter,
                )
                if (
                  !verified ||
                  verified.parameterStar < sweep.min ||
                  verified.parameterStar > sweep.max
                )
                  continue
                const duplicate = curve.events?.find(
                  (ev) =>
                    ev.tangency?.verified &&
                    Math.abs(
                      ev.tangency.parameterStar - verified.parameterStar,
                    ) <=
                      128 *
                        Number.EPSILON *
                        Math.max(1, Math.abs(verified.parameterStar)),
                )
                if (duplicate) continue
                const edge = curve.events?.find(
                  (ev) =>
                    ev.kind !== 'contact' &&
                    Math.abs(ev.parameter - verified.parameterStar) <=
                      Math.abs(sweep.max - sweep.min) / 40,
                )
                const event = {
                  kind: 'contact' as const,
                  direction: 1 as const,
                  parameter: verified.parameterStar,
                  values: verified.valuesStar,
                  tangency: verified,
                  description: verified.geometricSummary,
                }
                // Keep terminal coordinates for conservative continuation guards.
                if (edge) {
                  edge.tangency = verified
                  edge.description = verified.geometricSummary
                } else curve.events = [...(curve.events ?? []), event]
              }
            } catch {
              /* A diagnostic must not prevent the verified solve result. */
            }
          }
          remember(curves, curveKey, curve)
        }

        let result: SolveResult | null = null
        let error: string | undefined
        try {
          const current = sweep ? parameters[sweep.name] : undefined
          const terminal = curve.events?.find(
            (event) =>
              event.kind !== 'contact' &&
              current !== undefined &&
              (current - event.parameter) * event.direction > 0,
          )
          if (terminal)
            throw new ModelError(
              '현재 값은 검증된 분기 추적 범위 밖입니다. 해 목록에서 현재 해를 새로 선택할 수 있습니다.',
            )
          const nearby =
            current === undefined
              ? undefined
              : curve.sweep
                  .filter((point) => point.values !== null)
                  .reduce<
                    (typeof curve.sweep)[number] | undefined
                  >((best, point) => (!best || Math.abs(point.parameter - current) < Math.abs(best.parameter - current) ? point : best), undefined)
          const originParameters =
            nearby && sweep
              ? { ...curve.parameters, [sweep.name]: nearby.parameter }
              : curve.parameters
          const origin = nearby?.values
            ? { ...curve.reference, values: [...nearby.values] }
            : curve.reference
          result = continueRoot(
            solveNear,
            source,
            originParameters,
            parameters,
            origin,
            { conditionNorm },
          )
        } catch (cause) {
          error = `선택한 해의 분기를 현재 설정까지 추적할 수 없습니다. ${cause instanceof Error ? cause.message : '계산 실패'}`
        }
        const panel: SimulationPanel = {
          id: anchor.id,
          label: anchor.label,
          result,
          ...(error ? { error } : {}),
          sweep: curve.sweep,
          dataset: curve.dataset,
          ...(curve.datasetError ? { datasetError: curve.datasetError } : {}),
          sweepName: curve.sweepName,
          events: curve.events,
        }
        remember(cache, key, panel)
        return panel
      } catch (error) {
        return {
          ...empty,
          error:
            error instanceof Error
              ? error.message
              : '해를 불러오지 못했습니다.',
        }
      }
    })
  }
}

export function detectMergedBranchEvents(
  panels: readonly SimulationPanel[],
): BranchTerminalEvent[] {
  const allEvents: BranchTerminalEvent[] = []
  for (const panel of panels) {
    for (const ev of panel.events ?? []) {
      allEvents.push({
        ...ev,
        branchId: panel.id,
        branchLabel: panel.label,
      })
    }
  }
  const reconciled: BranchTerminalEvent[] = []
  const used = new Set<number>()

  for (let i = 0; i < allEvents.length; i++) {
    if (used.has(i)) continue
    const a = allEvents[i]
    let matchedIndex = -1
    for (let j = i + 1; j < allEvents.length; j++) {
      if (used.has(j)) continue
      const b = allEvents[j]
      if (a.branchId === b.branchId || a.direction !== b.direction) continue
      const paramScale = Math.max(
        1,
        Math.abs(a.parameter),
        Math.abs(b.parameter),
      )
      const sameParam = Math.abs(a.parameter - b.parameter) <= 2e-5 * paramScale
      const sameValues =
        a.values.length === b.values.length &&
        a.values.every((val, k) => {
          const vScale = Math.max(1, Math.abs(val), Math.abs(b.values[k]))
          return Math.abs(val - b.values[k]) <= 2e-2 * vScale
        })
      const panelA = panels.find((panel) => panel.id === a.branchId)
      const panelB = panels.find((panel) => panel.id === b.branchId)
      const gap = Math.max(
        ...a.values.map((value, k) => Math.abs(value - b.values[k])),
      )
      // Nearby endpoints alone are insufficient: require clear convergence
      // from a shared, earlier verified sample before calling it a candidate.
      const converging = panelA?.sweep.some((point) => {
        if (
          !point.values ||
          (a.parameter - point.parameter) * a.direction < 1e-3 * paramScale
        )
          return false
        const other = panelB?.sweep.find(
          (sample) => sample.parameter === point.parameter && sample.values,
        )
        return (
          other?.values &&
          Math.max(
            ...point.values.map((value, k) =>
              Math.abs(value - other.values![k]),
            ),
          ) >
            10 * gap
        )
      })
      const sameFold =
        sameVerifiedEvent(a, b) &&
        a.tangency?.bifurcationOrder !== 3 &&
        a.tangency?.bifurcationOrder !== 'boundary'
      if (((sameParam && sameValues) || sameFold) && converging) {
        matchedIndex = j
        break
      }
    }
    if (matchedIndex >= 0) {
      used.add(i)
      used.add(matchedIndex)
      const b = allEvents[matchedIndex]
      const avgParam = 0.5 * (a.parameter + b.parameter)
      const avgValues = a.values.map((v, k) => 0.5 * (v + b.values[k]))
      reconciled.push({
        ...(a.tangency?.verified
          ? { tangency: a.tangency }
          : b.tangency?.verified
            ? { tangency: b.tangency }
            : {}),
        kind: 'merge',
        direction: a.direction,
        parameter: avgParam,
        values: avgValues,
        branchId: a.branchId,
        branchLabel: a.branchLabel,
        mergedWithAnchorId: b.branchId,
        mergedWithLabel: b.branchLabel,
        description: `${a.branchLabel}과(와) ${b.branchLabel}이(가) 파라미터 ≈ ${Number(avgParam.toPrecision(6))}에서 만나는 병합·소멸 후보입니다 (수치 추정).`,
      })
    } else {
      reconciled.push(a)
    }
  }
  return reconciled
}
```

<a id="source-13"></a>

## src/engine/solver.worker.ts

원본: [src/engine/solver.worker.ts](../../src/engine/solver.worker.ts) · 331줄 · SHA-256: `51b1dddd2ed6b59ae96faa8c77098d4e9a2553a3fcd57cf6f057f9abbea9f80f`

```typescript
import type { VariableBounds } from './search-analysis'
import { sameComputedRoot } from './root-comparison'
/// <reference lib="webworker" />
import {
  createSolver,
  ModelError,
  type SolvePayload,
  type ConditionNorm,
  type SimulationAnchor,
} from './index'
import { computeSweeps, type SweepSettings } from './sweep'
import { createNonlinearSolver } from './nonlinear'
import { createAutomaticSolver, type AutomaticSearchResult } from './automatic'
import { createSimulationPanelComputer } from './simulation-panels'
type Request = {
  id: number
  source: string
  parameters: Record<string, number>
  sweep: SweepSettings | null
  conditionNorm?: ConditionNorm
  mode?: 'linear' | 'nonlinear'
  nonlinearSearch?: 'auto' | 'manual'
  certifyRoots?: boolean
  searchBounds?: { min: number; max: number }
  variableBounds?: VariableBounds
  solutionIndex?: number
  simulationAnchors?: SimulationAnchor[]
  selectedAnchor?: SimulationAnchor
  // Interactions may display current anchored values first while the full
  // discovery list is refreshed after a short quiet period.
  deferDiscovery?: boolean
}
type QueuedRequest = {
  request: Request
  generation: number
  discoveryOnly?: boolean
}
const ready = createSolver()
const nonlinearReady = createNonlinearSolver()
let automaticReady: ReturnType<typeof createAutomaticSolver> | undefined
const searches = new Map<string, AutomaticSearchResult>()
let computePanels: ReturnType<typeof createSimulationPanelComputer> | undefined
let pendingRequest: QueuedRequest | undefined
let processing = false
let generation = 0
let deferredDiscovery: ReturnType<typeof setTimeout> | undefined
let lastDiscoveryContext: string | undefined
const DISCOVERY_QUIET_MS = 180

const sortedParameters = (parameters: Record<string, number>) =>
  Object.entries(parameters).sort(([a], [b]) => a.localeCompare(b))

function discoveryKey(request: Request) {
  return JSON.stringify([
    request.certifyRoots ?? false,
    request.source,
    Object.entries(request.variableBounds ?? {}).sort(([a], [b]) =>
      a.localeCompare(b),
    ),
    sortedParameters(request.parameters),
    request.conditionNorm ?? 'infinity',
    request.searchBounds
      ? [request.searchBounds.min, request.searchBounds.max]
      : null,
  ])
}

// Only the coordinate of the currently swept parameter may differ. Changed
// equations, fixed parameters, ranges, diagnostics or bounds require a fresh
// discovery before the UI presents a new root list.
function discoveryContext(request: Request) {
  return JSON.stringify([
    request.certifyRoots ?? false,
    request.source,
    Object.entries(request.variableBounds ?? {}).sort(([a], [b]) =>
      a.localeCompare(b),
    ),
    sortedParameters(request.parameters).filter(
      ([name]) => name !== request.sweep?.name,
    ),
    request.sweep ?? null,
    request.conditionNorm ?? 'infinity',
    request.searchBounds
      ? [request.searchBounds.min, request.searchBounds.max]
      : null,
  ])
}

function queueLatest(work: QueuedRequest) {
  pendingRequest = work
  if (!processing) {
    processing = true
    setTimeout(processLatest, 0)
  }
}

function scheduleDiscovery(work: QueuedRequest) {
  deferredDiscovery = setTimeout(() => {
    deferredDiscovery = undefined
    if (work.generation === generation)
      queueLatest({ ...work, discoveryOnly: true })
  }, DISCOVERY_QUIET_MS)
}

// Yield between calculations so queued slider events replace each other rather
// than starting an expensive global root search for every intermediate value.
self.onmessage = (event: MessageEvent<Request>) => {
  if (deferredDiscovery !== undefined) clearTimeout(deferredDiscovery)
  deferredDiscovery = undefined
  queueLatest({ request: event.data, generation: ++generation })
}

async function processLatest() {
  const work = pendingRequest!
  pendingRequest = undefined
  try {
    await handleRequest(work)
  } finally {
    if (pendingRequest) setTimeout(processLatest, 0)
    else processing = false
  }
}

async function handleRequest(work: QueuedRequest) {
  const { request } = work
  const {
    id,
    source,
    parameters,
    sweep,
    conditionNorm,
    mode,
    nonlinearSearch,
    certifyRoots,
    searchBounds,
    variableBounds,
    solutionIndex,
    simulationAnchors,
    selectedAnchor,
  } = request
  try {
    if (mode === 'nonlinear' && nonlinearSearch !== 'manual') {
      automaticReady ??= createAutomaticSolver()
      const search = await automaticReady
      if (work.generation !== generation) return
      const key = discoveryKey(request)
      const context = discoveryContext(request)
      computePanels ??= createSimulationPanelComputer(search.solveNear)
      if (
        !work.discoveryOnly &&
        request.deferDiscovery &&
        selectedAnchor &&
        lastDiscoveryContext === context &&
        !searches.has(key)
      ) {
        const simulations = simulationAnchors
          ? computePanels(
              source,
              parameters,
              sweep,
              simulationAnchors,
              conditionNorm,
            )
          : undefined
        const selectedSimulation = computePanels(
          source,
          parameters,
          sweep,
          [selectedAnchor],
          conditionNorm,
        )[0]
        const result = selectedSimulation.result
        if (result) {
          const payload: SolvePayload = {
            result,
            solutions: [],
            selectedSimulation,
            ...(simulations ? { simulations } : {}),
            sweep: selectedSimulation.sweep,
            dataset: selectedSimulation.dataset,
            ...(selectedSimulation.datasetError
              ? { datasetError: selectedSimulation.datasetError }
              : {}),
            sweepName: selectedSimulation.sweepName,
          }
          self.postMessage({ id, ok: true, discoveryPending: true, payload })
        } else {
          self.postMessage({
            id,
            ok: false,
            discoveryPending: true,
            error:
              selectedSimulation.error ||
              '선택한 해의 현재값을 계산하지 못했습니다.',
            selectedSimulation,
            ...(simulations ? { simulations } : {}),
          })
        }
        // Never label old discovered roots as values at the new parameter.
        // The staged payload deliberately contains no coverage or root list.
        scheduleDiscovery(work)
        return
      }
      let found = searches.get(key)
      if (!found) {
        found = search(source, parameters, {
          certifyRoots,
          conditionNorm,
          searchBounds,
          variableBounds,
        })
        if (searches.size >= 8) searches.delete(searches.keys().next().value!)
        searches.set(key, found)
      }
      lastDiscoveryContext = context
      const simulations = simulationAnchors
        ? computePanels(
            source,
            parameters,
            sweep,
            simulationAnchors,
            conditionNorm,
          )
        : undefined
      let selectedSimulation = selectedAnchor
        ? computePanels(
            source,
            parameters,
            sweep,
            [selectedAnchor],
            conditionNorm,
          )[0]
        : undefined
      if (!found.solutions.length && !selectedSimulation?.result) {
        const certificate = found.search.certification
        self.postMessage({
          id,
          ok: false,
          discoveryPending: false,
          error:
            certificate?.complete && certificate.uniqueRootCount === 0
              ? `구간 검증 범위 [${certificate.domain.min}, ${certificate.domain.max}]에서 정의된 실수 해가 없습니다. 범위 밖의 해는 판정하지 않았습니다.`
              : certificate?.uniqueRootCount
                ? '구간 검증에서 유일근 구간을 분리했지만 표시할 근의 수치 보정에 실패했습니다. 구간 검증 내역을 확인하세요.'
                : '자동 탐색 범위에서 실수 해를 찾지 못했습니다. 수식을 확인하거나 고급 설정에서 탐색 범위를 조정해 주세요. 일반적인 수치 탐색은 모든 실수 해의 존재 여부를 판정하지 못합니다.',
          search: found.search,
          ...(simulations ? { simulations } : {}),
          ...(selectedSimulation ? { selectedSimulation } : {}),
        })
        return
      }
      let selectedSolution =
        Number.isInteger(solutionIndex) && solutionIndex! >= 0
          ? Math.min(solutionIndex!, Math.max(0, found.solutions.length - 1))
          : 0
      if (selectedSimulation?.result) {
        const current = selectedSimulation.result
        const matching = found.solutions.findIndex((candidate) =>
          sameComputedRoot(candidate, current),
        )
        if (matching >= 0) selectedSolution = matching
      }
      const globalResult = found.solutions[selectedSolution]
      const result = selectedSimulation?.result ?? globalResult
      // The first response supplies the same immutable anchor used to build
      // its graph. Adopting it in the UI does not require a second solve.
      let adoptedAnchor: SimulationAnchor | undefined
      if (!selectedAnchor) {
        adoptedAnchor = {
          id: crypto.randomUUID(),
          label: `해 ${selectedSolution + 1}`,
          variables: [...result.variables],
          values: [...result.values],
          parameters: { ...parameters },
        }
        selectedSimulation = computePanels(
          source,
          parameters,
          sweep,
          [adoptedAnchor],
          conditionNorm,
        )[0]
      }
      const single = selectedSimulation!
      const payload: SolvePayload = {
        result,
        solutions: found.solutions,
        selectedSolution,
        search: found.search,
        ...(simulations ? { simulations } : {}),
        ...(selectedSimulation ? { selectedSimulation } : {}),
        sweep: single.sweep,
        dataset: single.dataset,
        ...(single.datasetError ? { datasetError: single.datasetError } : {}),
        sweepName: single.sweepName,
      }
      self.postMessage({
        id,
        ok: true,
        discoveryPending: false,
        payload,
        ...(adoptedAnchor ? { adoptedAnchor } : {}),
      })
      return
    }
    const solve = await (mode === 'nonlinear' ? nonlinearReady : ready)
    if (work.generation !== generation) return
    const calculationSource = source
    const result = solve(calculationSource, parameters, { conditionNorm })
    const payload: SolvePayload = {
      result,
      ...computeSweeps(
        solve,
        calculationSource,
        parameters,
        mode === 'nonlinear' && sweep ? { ...sweep, maxPoints: 500 } : sweep,
      ),
    }
    self.postMessage({ id, ok: true, discoveryPending: false, payload })
  } catch (error) {
    if (work.generation !== generation) return
    self.postMessage({
      id,
      ok: false,
      discoveryPending: false,
      error:
        error instanceof Error ? error.message : '계산 중 오류가 발생했습니다.',
      line: error instanceof ModelError ? error.line : undefined,
    })
  }
}
```

<a id="source-14"></a>

## src/App.tsx

원본: [src/App.tsx](../../src/App.tsx) · 3,235줄 · SHA-256: `c5146e45d84cf4b55492e096be880ee38e064f5dfce281d40df2c9c8ef71f71e`

```tsx
import { normalizeAutomaticModel } from './engine/automatic'
import { equationProject } from './equation-project'
import {
  certificateSummary,
  certificateReport,
  unresolvedReason,
  type RootCertificate,
} from './engine/interval-certification'
import type { VariableBounds, SearchWindow } from './engine/search-analysis'
import { sameComputedRoot } from './engine/root-comparison'
import { normalizeEquationPaste } from './editor-input'
import ExampleWalkthrough from './components/ExampleWalkthrough'
import { useEffect, useRef, useState, useMemo } from 'react'
import {
  Activity,
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Code2,
  Download,
  FileText,
  FolderOpen,
  Grid2X2,
  Layers3,
  LoaderCircle,
  Maximize2,
  Play,
  Plus,
  Settings2,
  Sigma,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import SolutionChart, { SERIES_COLORS } from './components/SolutionChart'
import Guide from './components/Guide'
import SimulationPanelView from './components/SimulationPanelView'
import MergedSimulationSetView from './components/MergedSimulationSetView'
import { createSolverInput, solverInputKey } from './solver-input'
import { useProjectPersistence } from './use-project-persistence'
import { countEquations } from './equation-count'
import { encodeCsv } from './csv'
import {
  LandingModules,
  WorkspaceNavigation,
  type WorkspaceScreen,
} from './components/WorkspaceNavigation'
import {
  DEFAULT_PROJECT,
  DEFAULT_NONLINEAR_PROJECT,
  NONLINEAR_EXAMPLES,
  type Project,
} from './models'
import {
  classifyCondition,
  type ConditionNorm,
  type SolvePayload,
  type SolveResult,
  type SearchSummary,
  type SimulationAnchor,
  type SimulationPanel,
  type Parameter,
} from './engine'

const STORAGE_KEY = 'polymath-studio-project-v1'
const colors = SERIES_COLORS
const fmt = (n: number, digits = 5) =>
  !Number.isFinite(n)
    ? n === Infinity
      ? '∞'
      : '—'
    : n === 0
      ? '0'
      : Math.abs(n) < 0.000001 || Math.abs(n) >= 1e9
        ? n.toExponential(Math.min(15, digits - 1))
        : Number(n.toPrecision(digits)).toLocaleString('en-US', {
            maximumSignificantDigits: digits,
          })
function validAnchor(value: unknown): value is SimulationAnchor {
  if (!value || typeof value !== 'object') return false
  const a = value as SimulationAnchor
  return (
    typeof a.id === 'string' &&
    a.id.length <= 100 &&
    typeof a.label === 'string' &&
    a.label.length <= 100 &&
    Array.isArray(a.variables) &&
    a.variables.length > 0 &&
    a.variables.length <= 16 &&
    a.variables.every(
      (n) => typeof n === 'string' && /^[A-Za-z][A-Za-z0-9_]*$/.test(n),
    ) &&
    new Set(a.variables).size === a.variables.length &&
    Array.isArray(a.values) &&
    a.values.length === a.variables.length &&
    a.values.every(Number.isFinite) &&
    !!a.parameters &&
    typeof a.parameters === 'object' &&
    !Array.isArray(a.parameters) &&
    Object.keys(a.parameters).length <= 24 &&
    Object.entries(a.parameters).every(
      ([name, v]) =>
        /^[A-Za-z][A-Za-z0-9_]*$/.test(name) &&
        typeof v === 'number' &&
        Number.isFinite(v),
    )
  )
}
function isProject(value: unknown): value is Project {
  if (!value || typeof value !== 'object') return false
  const p = value as Project
  return (
    typeof p.title === 'string' &&
    p.title.length <= 120 &&
    typeof p.description === 'string' &&
    typeof p.source === 'string' &&
    p.source.length <= 30000 &&
    typeof p.sweepName === 'string' &&
    (p.selectedAnchor === undefined || validAnchor(p.selectedAnchor)) &&
    (p.simulations === undefined ||
      (Array.isArray(p.simulations) &&
        p.simulations.length <= 6 &&
        p.simulations.every(validAnchor) &&
        new Set(p.simulations.map((a) => a.id)).size ===
          p.simulations.length)) &&
    (p.individualIds === undefined ||
      (Array.isArray(p.individualIds) &&
        p.individualIds.length <= 6 &&
        p.individualIds.every(
          (id) =>
            typeof id === 'string' && p.simulations?.some((a) => a.id === id),
        ))) &&
    (p.mergedSets === undefined ||
      (Array.isArray(p.mergedSets) &&
        p.mergedSets.length <= 6 &&
        new Set(p.mergedSets.map((set) => set?.id)).size ===
          p.mergedSets.length &&
        p.mergedSets.every(
          (set) =>
            set &&
            typeof set.id === 'string' &&
            set.id.length <= 100 &&
            typeof set.name === 'string' &&
            set.name.length <= 100 &&
            Array.isArray(set.anchorIds) &&
            set.anchorIds.length <= 6 &&
            new Set(set.anchorIds).size === set.anchorIds.length &&
            set.anchorIds.every(
              (id) =>
                typeof id === 'string' &&
                p.simulations?.some((a) => a.id === id),
            ),
        ))) &&
    (p.nonlinearSearch === undefined ||
      p.nonlinearSearch === 'auto' ||
      p.nonlinearSearch === 'manual') &&
    (p.certifyRoots === undefined || typeof p.certifyRoots === 'boolean') &&
    (p.selectedSolution === undefined ||
      (Number.isInteger(p.selectedSolution) &&
        p.selectedSolution >= 0 &&
        p.selectedSolution < 32)) &&
    (p.variableBounds === undefined ||
      (p.variableBounds &&
        typeof p.variableBounds === 'object' &&
        !Array.isArray(p.variableBounds) &&
        Object.keys(p.variableBounds).length <= 64 &&
        Object.entries(p.variableBounds).every(
          ([name, b]) =>
            /^[A-Za-z][A-Za-z0-9_]*$/.test(name) &&
            b &&
            Number.isFinite(b.min) &&
            Number.isFinite(b.max) &&
            Number.isFinite(b.max - b.min) &&
            b.min < b.max,
        ))) &&
    (p.searchBounds === undefined ||
      (!!p.searchBounds &&
        Number.isFinite(p.searchBounds.min) &&
        Number.isFinite(p.searchBounds.max) &&
        Number.isFinite(p.searchBounds.max - p.searchBounds.min) &&
        p.searchBounds.min < p.searchBounds.max)) &&
    (p.mode === undefined || p.mode === 'linear' || p.mode === 'nonlinear') &&
    (p.conditionNorm === undefined ||
      p.conditionNorm === 'infinity' ||
      p.conditionNorm === '2') &&
    Array.isArray(p.parameters) &&
    p.parameters.length <= 24 &&
    p.parameters.every(
      (v) =>
        !!v &&
        typeof v === 'object' &&
        typeof v.id === 'string' &&
        /^[A-Za-z][A-Za-z0-9_]*$/.test(v.name) &&
        [v.value, v.min, v.max, v.step].every(Number.isFinite) &&
        v.min < v.max &&
        Number.isFinite(v.max - v.min) &&
        v.step > 0 &&
        v.value >= v.min &&
        v.value <= v.max,
    ) &&
    new Set(p.parameters.map((v) => v.name)).size === p.parameters.length &&
    new Set(p.parameters.map((v) => v.id)).size === p.parameters.length
  )
}
function initialProject(): Project {
  try {
    const p = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (isProject(p)) return equationProject(p)
  } catch {
    /* A clean model is usable if storage is unavailable. */
  }
  return structuredClone(DEFAULT_PROJECT)
}
function downloadFile(name: string, data: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export default function App() {
  const [project, setProject] = useState<Project>(initialProject)
  const [basePayload, setPayload] = useState<SolvePayload | null>(null)
  const [computeError, setError] = useState('')
  const [selectedSimulation, setSelectedSimulation] =
    useState<SimulationPanel | null>(null)
  const [simulationResults, setSimulationResults] = useState<SimulationPanel[]>(
    [],
  )
  const [searchInfo, setSearchInfo] = useState<SearchSummary | null>(null)
  const [pending, setPending] = useState(false)
  const [discoveryPending, setDiscoveryPending] = useState(false)
  const [workerReady, setWorkerReady] = useState(false)
  const [revision, setRevision] = useState(0)
  const [screen, setScreen] = useState<WorkspaceScreen>('home')
  const view = screen === 'report' ? 'report' : 'simulation'
  const [guide, setGuide] = useState(false)
  const [examplesOpen, setExamplesOpen] = useState(false)
  const [paramOpen, setParamOpen] = useState(false)
  const [paramName, setParamName] = useState('')
  const [paramValue, setParamValue] = useState('1')
  const [paramError, setParamError] = useState('')
  const [rangeEditor, setRangeEditor] = useState(false)
  const [toast, setToast] = useState('')
  const [undoProject, setUndoProject] = useState<Project | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [visibleVariables, setVisibleVariables] = useState<string[]>([])
  const [expanded, setExpanded] = useState(false)
  const [storageOk, setStorageOk] = useState(true)
  const drafts = useRef<Partial<Record<'linear' | 'nonlinear', Project>>>({})
  const worker = useRef<Worker | null>(null)
  const requestId = useRef(0)
  const importRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)
  const examplesRef = useRef<HTMLDivElement>(null)
  const projectRef = useRef(project)
  projectRef.current = project
  const revisionRef = useRef(revision)
  revisionRef.current = revision
  const dispatchedKey = useRef('')
  const adoptedReplyKey = useRef('')
  const previousRequest = useRef({
    source: '',
    mode: '',
    search: '',
    revision: -1,
  })
  // Projects are immutable; mode drafts need a reference, not a clone per frame.
  drafts.current[project.mode ?? 'linear'] = project
  const mode = project.mode ?? 'linear'
  const nonlinear = mode === 'nonlinear'
  const nonlinearSearch = project.nonlinearSearch ?? 'auto'
  const automatic = nonlinear && nonlinearSearch === 'auto'
  const selectedBranch =
    automatic && project.selectedAnchor?.id === selectedSimulation?.id
      ? selectedSimulation
      : null
  const payload =
    basePayload && selectedBranch
      ? {
          ...basePayload,
          sweep: selectedBranch.sweep,
          dataset: selectedBranch.dataset,
          datasetError: selectedBranch.datasetError,
          sweepName: selectedBranch.sweepName,
        }
      : basePayload
  const result = selectedBranch
    ? (selectedBranch.result ?? undefined)
    : payload?.result
  const error = selectedBranch?.error || computeError
  const solutionIndex = project.selectedSolution ?? 0
  const anchors = project.simulations ?? []
  const individualAnchors = anchors.filter(
    (a) =>
      project.individualIds === undefined ||
      project.individualIds.includes(a.id),
  )
  const mergedSets = project.mergedSets ?? []
  const solutions = basePayload?.solutions ?? (result ? [result] : [])
  const highlightedSolution = selectedBranch
    ? solutions.findIndex(
        (item) =>
          selectedBranch.result &&
          sameComputedRoot(item, selectedBranch.result),
      )
    : (basePayload?.selectedSolution ?? solutionIndex)
  const evaluation = result?.kind === 'evaluation'
  const displayWarnings =
    result?.warnings.filter(
      (w) =>
        !(
          nonlinear &&
          (w.startsWith('지정 구간에서 찾은 하나의 근') ||
            w.startsWith('초기 추정값에서 찾은 하나의 해'))
        ),
    ) ?? []
  const hasSource = project.source
    .split('\n')
    .some((l) => l.split('#')[0].trim())
  const conditionNorm = project.conditionNorm ?? 'infinity'
  const sensitivity = result ? classifyCondition(result.condition) : null
  const sweepParam = project.parameters.find(
    (p) => p.name === project.sweepName,
  )
  const boundsVariables = useMemo(() => {
    try {
      return normalizeAutomaticModel(
        project.source,
        project.parameters.map((p) => p.name),
      ).variables
    } catch {
      return Object.keys(project.variableBounds ?? {})
    }
  }, [project.source, project.parameters.map((p) => p.name).join('|')])
  const sourceLines = project.source.replace(/\r\n?/g, '\n').split('\n')
  const editorHeight = Math.min(
    420,
    Math.max(164, sourceLines.length * 28 + 24),
  )
  const equationCount = countEquations(
    project.source,
    nonlinear,
    project.parameters.map((p) => p.name),
  )
  useEffect(() => {
    const w = new Worker(
      new URL('./engine/solver.worker.ts', import.meta.url),
      { type: 'module' },
    )
    worker.current = w
    w.onmessage = ({ data }) => {
      if (data.id !== requestId.current) return
      setPending(false)
      setDiscoveryPending(data.discoveryPending === true)
      if (data.ok) {
        setPayload(data.payload)
        setSelectedSimulation(data.payload.selectedSimulation ?? null)
        setSimulationResults(data.payload.simulations ?? [])
        setSearchInfo(data.payload.search ?? null)
        setError('')
        const latest = projectRef.current
        // A reply may normalize its selection metadata without changing inputs.
        // Adopt that same anchor/result once, rather than solving a second time.
        if (
          solverInputKey(latest, revisionRef.current) === dispatchedKey.current
        ) {
          const adopted =
            !latest.selectedAnchor &&
            data.adoptedAnchor &&
            validAnchor(data.adoptedAnchor)
              ? (data.adoptedAnchor as SimulationAnchor)
              : latest.selectedAnchor
          const nextIndex =
            data.payload.selectedSolution ?? latest.selectedSolution
          if (
            adopted !== latest.selectedAnchor ||
            nextIndex !== latest.selectedSolution
          ) {
            const next = {
              ...latest,
              selectedAnchor: adopted,
              selectedSolution: nextIndex,
            }
            adoptedReplyKey.current = solverInputKey(next, revisionRef.current)
            setProject(next)
          }
        }
      } else {
        setError(data.line ? `${data.line}행 · ${data.error}` : data.error)
        setPayload(null)
        setSimulationResults(data.simulations ?? [])
        setSelectedSimulation(data.selectedSimulation ?? null)
        setSearchInfo(data.search ?? null)
      }
    }
    w.onerror = () => {
      setPending(false)
      setDiscoveryPending(false)
      setError('계산 워커를 시작하지 못했습니다. 페이지를 새로고침해 주세요.')
    }
    setWorkerReady(true)
    return () => {
      w.terminate()
      worker.current = null
    }
  }, [])
  useEffect(() => {
    if (!workerReady) return
    const key = solverInputKey(project, revision)
    if (adoptedReplyKey.current === key) {
      adoptedReplyKey.current = ''
      dispatchedKey.current = key
      return
    }
    adoptedReplyKey.current = ''
    const sourceChanged =
      previousRequest.current.source !== project.source ||
      previousRequest.current.mode !== mode ||
      previousRequest.current.search !== nonlinearSearch
    const explicitSolve = previousRequest.current.revision !== revision
    previousRequest.current = {
      source: project.source,
      mode,
      search: nonlinearSearch,
      revision,
    }
    const id = ++requestId.current
    if (!hasSource) {
      setPayload(null)
      setPending(false)
      setError('')
      setSearchInfo(null)
      setSimulationResults([])
      setSelectedSimulation(null)
      setDiscoveryPending(false)
      return
    }
    setPending(true)
    setDiscoveryPending(false)
    setError('')
    setSearchInfo(null)
    setSelectedIndex(null)
    const timer = setTimeout(
      () => {
        dispatchedKey.current = key
        worker.current?.postMessage({
          id,
          ...createSolverInput(project),
          deferDiscovery: !sourceChanged && !explicitSolve,
        })
      },
      sourceChanged ? 160 : 16,
    )
    return () => clearTimeout(timer)
  }, [
    project.source,
    project.parameters,
    project.sweepName,
    conditionNorm,
    mode,
    nonlinearSearch,
    project.searchBounds,
    project.variableBounds,
    project.certifyRoots,
    solutionIndex,
    project.simulations,
    project.selectedAnchor,
    revision,
    workerReady,
  ])
  useProjectPersistence(project, STORAGE_KEY, setStorageOk)
  const variableKey = result?.variables.join('|') || ''
  useEffect(() => {
    setVisibleVariables(variableKey ? variableKey.split('|') : [])
  }, [variableKey])
  useEffect(() => {
    if (!expanded) return
    const previousOverflow = document.body.style.overflow
    const previousFocus = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'
    const area = document.querySelector<HTMLElement>('.results-expanded')
    area?.querySelector<HTMLButtonElement>('.results-heading button')?.focus()
    const trap = (e: KeyboardEvent) => {
      if (
        e.key !== 'Tab' ||
        !area ||
        document.querySelector('[aria-modal="true"]:not(.results-expanded)')
      )
        return
      const items = Array.from(
        area.querySelectorAll<HTMLElement>(
          'button:not([disabled]),input:not([disabled]),select:not([disabled]),summary,[tabindex="0"]',
        ),
      ).filter((el) => el.getClientRects().length > 0)
      const first = items[0],
        last = items.at(-1)
      if (
        e.shiftKey &&
        (document.activeElement === first ||
          !area.contains(document.activeElement))
      ) {
        e.preventDefault()
        last?.focus()
      } else if (
        !e.shiftKey &&
        (document.activeElement === last ||
          !area.contains(document.activeElement))
      ) {
        e.preventDefault()
        first?.focus()
      }
    }
    document.addEventListener('keydown', trap)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', trap)
      previousFocus?.focus()
    }
  }, [expanded])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => {
      setToast('')
      setUndoProject(null)
    }, 5000)
    return () => clearTimeout(t)
  }, [toast])
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        setRevision((v) => v + 1)
      }
      if (e.key === 'Escape') {
        if (guide) setGuide(false)
        else if (paramOpen) setParamOpen(false)
        else if (examplesOpen) setExamplesOpen(false)
        else setExpanded(false)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [guide, paramOpen, examplesOpen])
  useEffect(() => {
    if (!paramOpen) return
    const previous = document.activeElement as HTMLElement | null
    const dialog = document.querySelector<HTMLElement>('.parameter-modal')
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !dialog) return
      const controls = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]),input:not([disabled]),[tabindex="0"]',
        ),
      )
      const first = controls[0],
        last = controls[controls.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }
    document.addEventListener('keydown', trap)
    return () => {
      document.removeEventListener('keydown', trap)
      previous?.focus()
    }
  }, [paramOpen])
  useEffect(() => {
    if (!examplesOpen) return
    const close = (e: PointerEvent) => {
      if (!examplesRef.current?.contains(e.target as Node))
        setExamplesOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [examplesOpen])
  function navigate(next: WorkspaceScreen) {
    setScreen(next)
    setExpanded(false)
    setExamplesOpen(false)
    setParamOpen(false)
    requestAnimationFrame(() =>
      window.scrollTo({ top: 0, behavior: 'instant' }),
    )
  }
  function selectRoot(item: SolveResult, index: number) {
    setProject((p) => ({
      ...p,
      selectedSolution: index,
      selectedAnchor: {
        id: crypto.randomUUID(),
        label: `해 ${index + 1}`,
        variables: [...item.variables],
        values: [...item.values],
        parameters: Object.fromEntries(
          p.parameters.map((v) => [v.name, v.value]),
        ),
      },
    }))
    setSelectedIndex(null)
  }
  function switchMode(nextMode: 'linear' | 'nonlinear') {
    if (nextMode === mode) return
    drafts.current[mode] = structuredClone(project)
    let next = drafts.current[nextMode]
    if (!next) {
      try {
        const saved = JSON.parse(
          localStorage.getItem(`${STORAGE_KEY}-${nextMode}`) || 'null',
        )
        if (isProject(saved) && (saved.mode ?? 'linear') === nextMode)
          next = equationProject(saved)
      } catch {}
    }
    setProject(
      structuredClone(
        next ??
          (nextMode === 'linear' ? DEFAULT_PROJECT : DEFAULT_NONLINEAR_PROJECT),
      ),
    )
    setPayload(null)
    setSelectedSimulation(null)
    setSelectedIndex(null)
    setError('')
    setExamplesOpen(false)
    setExpanded(false)
    setRangeEditor(false)
  }
  function newModel() {
    navigate('model')
    setUndoProject(structuredClone(project))
    setProject(
      structuredClone(nonlinear ? DEFAULT_NONLINEAR_PROJECT : DEFAULT_PROJECT),
    )
    setPayload(null)
    setError('')
    setExamplesOpen(false)
    setSelectedIndex(null)
    setToast('새 모델을 열었습니다.')
  }
  const activeExample = nonlinear
    ? NONLINEAR_EXAMPLES.find(
        (ex) => ex.project.source === project.source && ex.guide,
      )
    : undefined
  function loadExample(p: Project) {
    setUndoProject(structuredClone(project))
    setProject(structuredClone(p))
    setExamplesOpen(false)
    setSelectedIndex(null)
    setToast('예제 모델을 불러왔습니다.')
  }
  function matchingPanel(item: SolveResult) {
    return simulationResults.find(
      (panel) =>
        anchors.some((anchor) => anchor.id === panel.id) &&
        panel.result &&
        sameComputedRoot(panel.result, item),
    )
  }
  function rootAlreadyOpen(item: SolveResult) {
    const panel = matchingPanel(item)
    return Boolean(
      panel && individualAnchors.some((anchor) => anchor.id === panel.id),
    )
  }
  function addSimulation(item: SolveResult, index: number) {
    if (pending || rootAlreadyOpen(item)) return
    const existing = matchingPanel(item)
    if (existing) {
      setProject((p) => ({
        ...p,
        individualIds: [
          ...(p.individualIds ?? (p.simulations ?? []).map((a) => a.id)),
          existing.id,
        ],
      }))
      return
    }
    if (anchors.length >= 6) return
    const base = `해 ${index + 1}`
    const label = anchors.some((a) => a.label === base)
      ? `${base} · 비교 ${anchors.length + 1}`
      : base
    const anchor: SimulationAnchor = {
      id: crypto.randomUUID(),
      label,
      variables: [...item.variables],
      values: [...item.values],
      parameters: Object.fromEntries(
        project.parameters.map((p) => [p.name, p.value]),
      ),
    }
    setProject((p) => ({
      ...p,
      simulations: [...(p.simulations ?? []), anchor],
      individualIds: [
        ...(p.individualIds ?? (p.simulations ?? []).map((a) => a.id)),
        anchor.id,
      ],
    }))
    navigate('simulation')
    setToast(`${label} 시뮬레이션을 추가했습니다.`)
  }
  function closeSimulation(id: string) {
    setProject((p) => ({
      ...p,
      individualIds: (
        p.individualIds ?? (p.simulations ?? []).map((a) => a.id)
      ).filter((value) => value !== id),
      simulations: (p.simulations ?? []).filter(
        (a) =>
          a.id !== id ||
          p.mergedSets?.some((set) => set.anchorIds.includes(id)),
      ),
    }))
  }
  function createMergedSet() {
    if (
      pending ||
      discoveryPending ||
      mergedSets.length >= 6 ||
      !solutions.length
    )
      return
    setProject((p) => {
      const pool = [...(p.simulations ?? [])]
      solutions.slice(0, 6).forEach((item, index) => {
        if (pool.length >= 6 || matchingPanel(item)) return
        pool.push({
          id: crypto.randomUUID(),
          label: `해 ${index + 1}`,
          variables: [...item.variables],
          values: [...item.values],
          parameters: Object.fromEntries(
            p.parameters.map((v) => [v.name, v.value]),
          ),
        })
      })
      let number = 1
      while (p.mergedSets?.some((set) => set.name === `병합 세트 ${number}`))
        number++
      return {
        ...p,
        simulations: pool,
        individualIds:
          p.individualIds ?? (p.simulations ?? []).map((a) => a.id),
        mergedSets: [
          ...(p.mergedSets ?? []),
          {
            id: crypto.randomUUID(),
            name: `병합 세트 ${number}`,
            anchorIds: pool.map((a) => a.id),
          },
        ],
      }
    })
  }
  function removeMergedSet(id: string) {
    setProject((p) => {
      const sets = (p.mergedSets ?? []).filter((set) => set.id !== id)
      const individual =
        p.individualIds ?? (p.simulations ?? []).map((a) => a.id)
      return {
        ...p,
        mergedSets: sets,
        simulations: (p.simulations ?? []).filter(
          (a) =>
            individual.includes(a.id) ||
            sets.some((set) => set.anchorIds.includes(a.id)),
        ),
      }
    })
  }
  function openSimulationReport(anchor: SimulationAnchor) {
    setProject((p) => ({ ...p, selectedAnchor: anchor }))
    navigate('report')
  }
  function updateParameter(id: string, value: number) {
    setProject((p) => ({
      ...p,
      parameters: p.parameters.map((v) =>
        v.id === id
          ? { ...v, value: Math.min(v.max, Math.max(v.min, value)) }
          : v,
      ),
    }))
  }
  function addParameter(e: React.FormEvent) {
    e.preventDefault()
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(paramName)) {
      setParamError('영문자로 시작하는 이름을 입력해 주세요. 예: F, c_A')
      return
    }
    if (
      [
        'sin',
        'cos',
        'tan',
        'sqrt',
        'log',
        'ln',
        'abs',
        'exp',
        'if',
        'then',
        'else',
        'and',
        'or',
        'constructor',
        '__proto__',
        'prototype',
      ].includes(paramName.toLowerCase()) ||
      project.parameters.some((v) => v.name === paramName)
    ) {
      setParamError('이미 사용 중이거나 예약된 이름입니다.')
      return
    }
    const value = Number(paramValue)
    if (!paramValue.trim() || !Number.isFinite(value)) {
      setParamError('유한한 숫자를 입력해 주세요.')
      return
    }
    const min = value > 0 ? 0 : value - 5,
      max = value > 0 ? value * 2 : Math.max(5, value + 5),
      step = Number(((max - min) / 100).toPrecision(4))
    if (
      ![min, max, step, max - min].every(Number.isFinite) ||
      !Number.isFinite(max - min) ||
      min >= max ||
      step <= 0
    ) {
      setParamError(
        '슬라이더로 표현할 수 있는 더 작은 범위의 값을 입력해 주세요.',
      )
      return
    }
    setProject((p) => ({
      ...p,
      selectedAnchor: undefined,
      simulations: [],
      mergedSets: [],
      individualIds: [],
      parameters: [
        ...p.parameters,
        { id: crypto.randomUUID(), name: paramName, value, min, max, step },
      ],
      sweepName: p.sweepName || paramName,
    }))
    setParamOpen(false)
    setParamName('')
    setParamValue('1')
    setParamError('')
  }
  function buildReport(
    target: SolveResult,
    index?: number,
    coverage: SearchSummary | null = searchInfo,
    branchLabel?: string,
  ) {
    const isEvaluation = target.kind === 'evaluation'
    return (
      [
        `# ${project.title}${branchLabel ? ` · ${branchLabel}` : index === undefined ? '' : ` · 해 ${index + 1}`}`,
        project.description,
        `유형: ${nonlinear ? 'Nonlinear' : 'Linear'}`,
        coverage
          ? `탐색: ${coverage.method}\n\n범위: ${coverage.min} ~ ${coverage.max}\n\n${coverage.note}`
          : '',
        coverage?.certification
          ? certificateReport(coverage.certification)
          : (coverage?.certificationUnavailable ?? ''),
        target.method
          ? `방법: ${target.method} · 반복 ${target.iterations ?? 0}회`
          : '',
        nonlinear && !isEvaluation
          ? '발견한 하나의 실수 해입니다. 다른 해가 존재할 수 있으며 조건수는 해 주변 Jacobian의 국소 값입니다.'
          : '',
        `## 입력 수식\n\n\`\`\`text\n${project.source}\n\`\`\``,
        `## 파라미터\n\n${project.parameters.map((p) => `- ${p.name} = ${p.value}`).join('\n') || '없음'}`,
        `## 해\n\n| 변수 | 값 |\n| --- | ---: |\n${target.variables.map((name, i) => `| ${name} | ${target.values[i].toPrecision(12)} |`).join('\n')}`,
        target.auxiliary && Object.keys(target.auxiliary).length
          ? `## 보조식 계산값\n\n${Object.entries(target.auxiliary)
              .map(([name, value]) => `- ${name} = ${value.toPrecision(12)}`)
              .join('\n')}`
          : '',
        `최대 절대 등식 오차: ${isEvaluation ? '해당 없음' : target.maxResidual.toExponential(5)}`,
        `조건수 (${target.conditionNorm === '2' ? '2-norm · SVD' : '∞-norm'}): ${isEvaluation ? '해당 없음' : Number.isNaN(target.condition) ? '계산 불가' : target.condition.toPrecision(8)}`,
        `민감도: ${isEvaluation ? '해당 없음' : classifyCondition(target.condition).label}`,
        '참고 기준: κ < 10^4 안정, 10^4 ≤ κ < 10^8 민감, κ ≥ 10^8 매우 민감. 참고 범위이며 입력 오차와 단위에 따라 해석해야 합니다.',
        target.conditionError || '',
        `계산 엔진: ${target.engine}`,
        target.warnings.join('\n'),
      ]
        .filter(Boolean)
        .join('\n\n') + '\n'
    )
  }
  function exportReport() {
    if (!result || pending || error) return
    downloadFile(
      'polymath-report.md',
      buildReport(
        result,
        automatic && !selectedBranch ? solutionIndex : undefined,
        selectedBranch ? null : searchInfo,
        selectedBranch ? project.selectedAnchor?.label : undefined,
      ),
      'text/markdown;charset=utf-8',
    )
    setToast('계산 리포트를 내려받았습니다.')
  }
  function exportAllReports() {
    if (!solutions.length || pending || discoveryPending || error) return
    downloadFile(
      'polymath-all-solutions.md',
      solutions.map((item, i) => buildReport(item, i)).join('\n---\n\n'),
      'text/markdown;charset=utf-8',
    )
    setToast('발견한 각 실수 해의 리포트를 내려받았습니다.')
  }
  function exportCSV() {
    if (!result || !payload || pending || (sweepParam && payload.datasetError))
      return
    const rows = sweepParam
      ? [
          [project.sweepName, ...result.variables],
          ...payload.dataset.map((point) => [
            point.parameter,
            ...(point.values || result.variables.map(() => '')),
          ]),
        ]
      : [
          ['variable', 'value'],
          ...result.variables.map((name, index) => [
            name,
            result.values[index],
          ]),
        ]
    const csv = encodeCsv(rows)
    downloadFile(
      automatic
        ? project.selectedAnchor
          ? `polymath-${project.selectedAnchor.label.replaceAll(' ', '-')}-data.csv`
          : `polymath-solution-${solutionIndex + 1}-data.csv`
        : 'polymath-data.csv',
      '\uFEFF' + csv,
      'text/csv;charset=utf-8',
    )
    setToast('데이터를 CSV로 내려받았습니다.')
  }
  async function importProject(file?: File) {
    if (!file) return
    if (file.size > 150000) {
      setToast('150KB 이하의 프로젝트 파일을 선택해 주세요.')
      return
    }
    try {
      const p = JSON.parse(await file.text())
      if (!isProject(p)) throw new Error()
      drafts.current[mode] = structuredClone(project)
      setProject(equationProject(p))
      setPayload(null)
      setSelectedSimulation(null)
      if (screen === 'home') navigate('model')
      setToast('프로젝트를 불러왔습니다.')
    } catch {
      setToast('올바른 Polymath 프로젝트 JSON 파일이 아닙니다.')
    }
  }
  return (
    <div className="app-shell">
      <div className="workspace">
        <header className="topbar">
          <div className="wordmark">
            polymath<span>studio</span>
            <span className="beta">PREVIEW</span>
          </div>
          <div className="top-right">
            <span className="local-status">
              <i />
              {storageOk ? '로컬 자동 저장' : '자동 저장 불가'}
            </span>
            <div className="top-divider" />
            <button
              className="quiet-button"
              aria-label="사용 가이드"
              onClick={() => setGuide(true)}
            >
              <CircleHelp size={16} />
              <span>사용 가이드 · 공식집</span>
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
        </header>
        {screen === 'home' && (
          <main className="module-home-page" data-screen="home">
            <LandingModules onOpenEquationSolver={() => navigate('model')} />
          </main>
        )}
        {screen !== 'home' && (
          <div className="workspace-nav-container">
            <WorkspaceNavigation screen={screen} onNavigate={navigate} />
          </div>
        )}
        <main
          hidden={screen === 'home'}
          data-screen={screen}
          className={`workspace-content workspace-screen-${screen}`}
        >
          <div className="breadcrumbs">
            <span>계산 도구</span>
            <ChevronRight size={13} />
            <span>Equation Solver</span>
            <ChevronRight size={13} />
            <span>{nonlinear ? 'Nonlinear' : 'Linear'}</span>
          </div>
          <section className="page-heading">
            <div>
              <div className="eyebrow">
                <span /> ENGINEERING TOOLKIT · 01
              </div>
              <h1>
                Equation <span>Solver</span>
              </h1>
              <p>
                {screen === 'model'
                  ? '수식과 파라미터를 정의하세요.'
                  : screen === 'simulation'
                    ? '같은 해의 변화를 그래프로 살펴보세요.'
                    : '계산 결과와 수치 검증을 확인하세요.'}
              </p>
            </div>
            <div className="heading-actions">
              <button
                className="secondary-button new-model-button"
                onClick={newModel}
              >
                <Plus size={16} />
                <span>새 모델</span>
              </button>
              <button
                className="secondary-button import-button"
                onClick={() => importRef.current?.click()}
              >
                <FolderOpen size={16} />
                <span>불러오기</span>
              </button>
              <button
                className="secondary-button"
                onClick={() => {
                  downloadFile(
                    'polymath-project.json',
                    JSON.stringify(project, null, 2),
                    'application/json',
                  )
                  setToast('프로젝트를 JSON 파일로 저장했습니다.')
                }}
              >
                <Download size={16} />
                <span>프로젝트 저장</span>
              </button>
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
          </section>
          <div
            className="problem-tabs"
            hidden={screen !== 'model'}
            role="tablist"
            aria-label="Equation Solver 유형"
          >
            <button
              role="tab"
              aria-label="Linear"
              aria-selected={!nonlinear}
              className={`problem-tab ${!nonlinear ? 'selected' : ''}`}
              onClick={() => switchMode('linear')}
            >
              <Grid2X2 size={16} />
              Linear<span>선형 방정식</span>
            </button>
            <button
              role="tab"
              aria-label="Nonlinear"
              aria-selected={nonlinear}
              className={`problem-tab ${nonlinear ? 'selected' : ''}`}
              onClick={() => switchMode('nonlinear')}
            >
              <Activity size={16} />
              Nonlinear<span>비선형 방정식</span>
            </button>
            <div className="browser-badge">
              <span />내 브라우저에서 안전하게 연산
            </div>
          </div>
          {activeExample && !expanded && (
            <ExampleWalkthrough
              key={activeExample.id}
              example={activeExample}
            />
          )}
          <div
            className={`studio-grid sectioned-workspace ${expanded ? 'results-expanded' : ''}`}
            data-screen={screen}
            role={expanded ? 'dialog' : undefined}
            aria-modal={expanded ? true : undefined}
            aria-label={expanded ? '결과 탐색 전체화면' : undefined}
          >
            <div className="model-column" hidden={screen !== 'model'}>
              <section className="panel model-panel">
                <div className="panel-heading">
                  <div className="section-label">
                    <span className="step-number">01</span>
                    <h2>모델 정의</h2>
                  </div>
                  {nonlinear && (
                    <div className="examples-wrap" ref={examplesRef}>
                      <button
                        className="text-button"
                        aria-expanded={examplesOpen}
                        onClick={() => setExamplesOpen((v) => !v)}
                      >
                        예제 불러오기
                        <ChevronDown size={14} />
                      </button>
                      {examplesOpen && (
                        <div className="examples-menu">
                          <span className="menu-label">
                            수학·과학 예제 · 모델을 선택하세요
                          </span>
                          {NONLINEAR_EXAMPLES.map((ex) => (
                            <button
                              key={ex.id}
                              onClick={() => loadExample(ex.project)}
                            >
                              <span className="example-icon">
                                <Grid2X2 size={17} />
                              </span>
                              <span>
                                <b>{ex.project.title}</b>
                                <small>{ex.category}</small>
                              </span>
                              <ChevronRight size={14} />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="model-title">
                  <input
                    aria-label="모델 이름"
                    value={project.title}
                    maxLength={120}
                    onChange={(e) =>
                      setProject((p) => ({ ...p, title: e.target.value }))
                    }
                  />
                  <span className="model-tag">
                    {nonlinear ? 'NONLINEAR SYSTEM' : 'LINEAR SYSTEM'}
                  </span>
                </div>
                <p className="model-description">{project.description}</p>
                <div className="editor-toolbar">
                  <span>
                    <Code2 size={14} />
                    수식 에디터
                  </span>
                  <span>
                    {nonlinear
                      ? automatic
                        ? '식만 입력 · 실수 해 자동 탐색'
                        : '등식 입력 · 초기값 또는 범위로 한 해 탐색'
                      : '한 줄에 하나의 방정식'}
                  </span>
                </div>
                <div
                  className={`equation-editor ${error ? 'editor-error' : ''}`}
                >
                  <div
                    className="line-numbers"
                    ref={lineNumbersRef}
                    style={{ height: editorHeight }}
                    aria-hidden="true"
                  >
                    {sourceLines.map((_, i) => (
                      <span key={i}>{String(i + 1).padStart(2, '0')}</span>
                    ))}
                  </div>
                  <textarea
                    ref={editorRef}
                    wrap="off"
                    style={{ height: editorHeight }}
                    onScroll={(e) => {
                      if (lineNumbersRef.current)
                        lineNumbersRef.current.scrollTop =
                          e.currentTarget.scrollTop
                    }}
                    onPaste={(e) => {
                      e.preventDefault()
                      const el = e.currentTarget,
                        start = el.selectionStart,
                        end = el.selectionEnd
                      const pasted = normalizeEquationPaste(
                        e.clipboardData.getData('text/plain'),
                      )
                      const available = Math.max(
                        0,
                        30000 - project.source.length + (end - start),
                      )
                      const insertion = pasted.slice(0, available)
                      setProject((p) => ({
                        ...p,
                        source:
                          p.source.slice(0, start) +
                          insertion +
                          p.source.slice(end),
                        selectedSolution: 0,
                        selectedAnchor: undefined,
                        simulations: [],
                        mergedSets: [],
                        individualIds: [],
                      }))
                      requestAnimationFrame(() => {
                        el.selectionStart = el.selectionEnd =
                          start + insertion.length
                        if (lineNumbersRef.current)
                          lineNumbersRef.current.scrollTop = el.scrollTop
                      })
                    }}
                    aria-label="방정식 입력"
                    spellCheck={false}
                    maxLength={30000}
                    value={project.source}
                    onChange={(e) =>
                      setProject((p) => ({
                        ...p,
                        source: e.target.value,
                        selectedSolution: 0,
                        selectedAnchor: undefined,
                        simulations: [],
                        mergedSets: [],
                        individualIds: [],
                      }))
                    }
                    placeholder={
                      nonlinear
                        ? automatic
                          ? 'x^2 = 4\n\n# 연립식도 한 줄에 하나씩 입력하세요'
                          : 'x^2 = 4\nx(0) = 1'
                        : '방정식을 입력하세요\n예: 2x + y = 10'
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Tab') {
                        e.preventDefault()
                        const el = e.currentTarget,
                          start = el.selectionStart,
                          end = el.selectionEnd
                        setProject((p) => ({
                          ...p,
                          source:
                            p.source.slice(0, start) +
                            '  ' +
                            p.source.slice(end),
                          selectedSolution: 0,
                          selectedAnchor: undefined,
                          simulations: [],
                          mergedSets: [],
                          individualIds: [],
                        }))
                        requestAnimationFrame(() => {
                          el.selectionStart = el.selectionEnd = start + 2
                        })
                      }
                    }}
                  />
                </div>
                <div className="editor-footer">
                  <span>
                    <i
                      className={error ? 'status-dot error-dot' : 'status-dot'}
                    />
                    {evaluation
                      ? `명시식·표현식 ${result.variables.length}개`
                      : `${equationCount}개 방정식${result && !error ? ` · ${result.variables.length}개 미지수` : ''}`}
                  </span>
                  <button
                    className="text-button syntax-button"
                    onClick={() => setGuide(true)}
                  >
                    문법 알아보기
                    <ArrowRight size={13} />
                  </button>
                </div>
                {nonlinear && (
                  <details className="nonlinear-settings">
                    <summary>
                      <Settings2 size={14} />
                      고급 탐색 설정
                      <ChevronDown size={13} />
                    </summary>
                    <div className="nonlinear-settings-body">
                      <label htmlFor="nonlinear-search">해 탐색 방식</label>
                      <select
                        id="nonlinear-search"
                        aria-label="해 탐색 방식"
                        value={nonlinearSearch}
                        onChange={(e) =>
                          setProject((p) => ({
                            ...p,
                            nonlinearSearch: e.target.value as
                              | 'auto'
                              | 'manual',
                            selectedSolution: 0,
                            selectedAnchor: undefined,
                            simulations: [],
                            mergedSets: [],
                            individualIds: [],
                          }))
                        }
                      >
                        <option value="auto">자동으로 여러 실수 해 찾기</option>
                        <option value="manual">초기 조건으로 한 해 찾기</option>
                      </select>
                      {automatic ? (
                        <>
                          <label className="certification-toggle">
                            <input
                              type="checkbox"
                              checked={project.certifyRoots ?? false}
                              onChange={(e) =>
                                setProject((p) => ({
                                  ...p,
                                  certifyRoots: e.target.checked,
                                }))
                              }
                            />
                            구간 검증 사용 (단일 변수·추가 계산)
                          </label>
                          <SearchBoundsEditor
                            bounds={project.searchBounds}
                            variables={boundsVariables}
                            variableBounds={project.variableBounds}
                            window={
                              searchInfo?.window ?? basePayload?.search?.window
                            }
                            onApply={(bounds, variableBounds) =>
                              setProject((p) => ({
                                ...p,
                                searchBounds: bounds,
                                variableBounds,
                                selectedAnchor: undefined,
                                selectedSolution: 0,
                              }))
                            }
                          />
                        </>
                      ) : (
                        <p>
                          x^2=4처럼 등식을 입력하고 x(0)=1로 초기값을
                          지정하세요. x(min)·x(max)로 범위를 지정할 수도
                          있습니다. 연립식은 각 미지수의 초기값을 적습니다.
                          이름=수식 계산도 지원합니다.
                        </p>
                      )}
                    </div>
                  </details>
                )}
                {automatic &&
                  /^\s*[A-Za-z][A-Za-z0-9_]*\(\s*(min|max|0)\s*\)\s*=/m.test(
                    project.source,
                  ) && (
                    <p className="legacy-conditions-note">
                      자동 모드에서는 수식에 적힌 초기값·구간 대신 자동 탐색
                      설정을 사용합니다. 기존 조건으로 풀려면 고급 설정에서
                      방식을 바꾸세요.
                    </p>
                  )}
                <div className="model-run-row">
                  <span>
                    <span className="keycap">⌘</span> / Ctrl + Enter
                  </span>
                  <button
                    className="primary-button"
                    onClick={() => {
                      setRevision((v) => v + 1)
                      navigate('simulation')
                    }}
                    disabled={pending || !hasSource}
                  >
                    {pending ? (
                      <LoaderCircle size={15} className="spin" />
                    ) : (
                      <Play size={14} fill="currentColor" />
                    )}
                    {pending ? '계산 중' : '모델 풀기'}
                    <span className="button-arrow">↗</span>
                  </button>
                </div>
              </section>
              <section className="panel parameter-panel">
                <div className="panel-heading">
                  <div className="section-label">
                    <span className="step-number">02</span>
                    <h2>파라미터</h2>
                    <span className="count-badge">
                      {project.parameters.length}
                    </span>
                  </div>
                  <button
                    className={`icon-button ${rangeEditor ? 'is-selected' : ''}`}
                    aria-label="파라미터 범위 설정"
                    title="파라미터 범위 설정"
                    onClick={() => setRangeEditor((v) => !v)}
                  >
                    <Settings2 size={16} />
                  </button>
                </div>
                <p className="section-description">
                  범위와 샘플 포인트 간격을 설정하세요. 값은 시뮬레이션 화면에서
                  조절합니다.
                </p>
                <div className="parameter-list">
                  {project.parameters.map((p, i) => (
                    <div className="parameter" key={p.id}>
                      <div className="parameter-top">
                        <div>
                          <label
                            htmlFor={`param-${p.id}`}
                            className="parameter-name"
                          >
                            {p.name}
                          </label>
                          <span className="parameter-role">
                            {p.name === project.sweepName
                              ? '탐색 변수'
                              : '상수'}
                          </span>
                        </div>
                        <div className="parameter-input-wrap">
                          <span className="parameter-current-value">
                            현재 {fmt(p.value, 10)}
                          </span>
                          {rangeEditor && (
                            <button
                              className="delete-param"
                              title={`${p.name} 삭제`}
                              aria-label={`${p.name} 삭제`}
                              onClick={() =>
                                setProject((prev) => ({
                                  ...prev,
                                  selectedAnchor: undefined,
                                  simulations: [],
                                  mergedSets: [],
                                  individualIds: [],
                                  parameters: prev.parameters.filter(
                                    (v) => v.id !== p.id,
                                  ),
                                  sweepName:
                                    prev.sweepName === p.name
                                      ? prev.parameters.find(
                                          (v) => v.id !== p.id,
                                        )?.name || ''
                                      : prev.sweepName,
                                }))
                              }
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="range-labels">
                        <span>{fmt(p.min)}</span>
                        <span>샘플 간격 {String(p.step)}</span>
                        <span>{fmt(p.max)}</span>
                      </div>
                      {rangeEditor && (
                        <RangeEditor
                          parameter={p}
                          onChange={(next) =>
                            setProject((prev) => ({
                              ...prev,
                              parameters: prev.parameters.map((v) =>
                                v.id === p.id ? next : v,
                              ),
                            }))
                          }
                        />
                      )}
                    </div>
                  ))}
                </div>
                {project.parameters.length === 0 && (
                  <div className="no-parameters">
                    <SlidersHorizontal size={22} />
                    <p>
                      수식 속 상수를 파라미터로 등록하면
                      <br />
                      슬라이더로 해의 변화를 탐색할 수 있어요.
                    </p>
                  </div>
                )}
                <button
                  className="add-parameter"
                  disabled={project.parameters.length >= 24}
                  onClick={() => {
                    setParamOpen(true)
                    setParamError('')
                  }}
                >
                  <Plus size={15} />
                  파라미터 추가
                </button>
                <div className="live-note">
                  <span className="live-dot" />
                  시뮬레이션 화면에서 슬라이더와 그래프를 조작할 수 있습니다.
                </div>
              </section>
              <div className="model-next-step">
                <p role="status">
                  {pending
                    ? '수식을 확인하고 있습니다.'
                    : computeError
                      ? computeError
                      : hasSource
                        ? '설정을 마쳤다면 시뮬레이션으로 이동하세요.'
                        : '한 줄에 방정식을 하나씩 입력해 시작하세요.'}
                </p>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => navigate('simulation')}
                >
                  시뮬레이션 열기 <ArrowRight size={15} />
                </button>
              </div>
              <div className="tip-card">
                <div className="tip-icon">
                  <Sparkles size={17} />
                </div>
                <p>
                  <b>작은 변화가 만드는 새로운 발견</b>
                  <span>
                    {nonlinear
                      ? automatic
                        ? '발견한 실수 해를 선택해 각 해의 리포트와 변화를 비교하세요.'
                        : '구간이나 초기값을 바꿔 다른 해가 존재하는지 살펴보세요.'
                      : '수식 속 상수를 파라미터로 등록해 해의 변화를 탐색해 보세요.'}
                  </span>
                </p>
                <ArrowRight size={16} />
              </div>
            </div>
            <div
              className={`results-column ${pending ? 'is-computing' : ''}`}
              hidden={screen !== 'simulation' && screen !== 'report'}
            >
              <section
                className={`panel results-panel ${automatic && view === 'simulation' ? 'automatic-simulation-view' : ''} ${automatic && anchors.length > 0 && view === 'simulation' ? 'multi-simulation-view' : ''}`}
              >
                <div className="results-heading">
                  <div className="section-label">
                    <span className="step-number">03</span>
                    <h2>
                      {view === 'simulation' ? '시뮬레이션' : '해석 리포트'}
                    </h2>
                  </div>
                  <div className="results-heading-right">
                    <span
                      className={`engine-status ${error ? 'has-error' : ''}`}
                    >
                      {pending ? (
                        <LoaderCircle size={12} className="spin" />
                      ) : error ? (
                        <X size={12} />
                      ) : (
                        <CheckCircle2 size={12} />
                      )}{' '}
                      {pending
                        ? '계산 중'
                        : error
                          ? '입력 확인'
                          : !result
                            ? '입력 대기'
                            : result?.engine === 'wasm'
                              ? 'WebAssembly'
                              : 'JavaScript'}
                    </span>
                    <button
                      className="icon-button"
                      title={expanded ? '기본 레이아웃' : '결과 화면 확대'}
                      aria-label={expanded ? '기본 레이아웃' : '결과 화면 확대'}
                      onClick={() => setExpanded((v) => !v)}
                    >
                      <Maximize2 size={16} />
                    </button>
                  </div>
                </div>
                {view === 'simulation' && project.parameters.length > 0 && (
                  <ResultParameters
                    parameters={project.parameters}
                    onChange={updateParameter}
                  />
                )}
                {automatic && view === 'simulation' && (
                  <div className="merge-actions">
                    <button
                      className="secondary-button"
                      disabled={
                        pending ||
                        discoveryPending ||
                        !solutions.length ||
                        mergedSets.length >= 6
                      }
                      onClick={createMergedSet}
                    >
                      <Layers3 size={15} /> 시뮬레이션 병합 세트 추가
                    </button>
                    <span>최대 6개 세트 · 해별 색상 비교</span>
                  </div>
                )}
                {automatic && discoveryPending && (
                  <p className="discovery-status" role="status">
                    현재 해를 표시하고 있습니다. 전체 해 목록을 갱신하는
                    중입니다.
                  </p>
                )}
                {automatic && (solutions.length > 0 || discoveryPending) && (
                  <details className="solutions-section">
                    <summary className="solutions-title">
                      <h3 className="solution-count">
                        {discoveryPending
                          ? '해 목록 갱신 중'
                          : basePayload?.search?.nonIsolated
                            ? `구간 해 대표값 ${solutions.length}개`
                            : `발견한 실수 해 ${solutions.length}개`}
                      </h3>
                      <span>
                        해 선택 · 시뮬레이션 추가 <ChevronDown size={14} />
                      </span>
                    </summary>
                    <div className="solution-list" aria-label="발견한 실수 해">
                      {solutions.map((item, i) => (
                        <div className="solution-item" key={i}>
                          <button
                            className={`solution-choice ${highlightedSolution === i ? 'selected' : ''}`}
                            aria-pressed={highlightedSolution === i}
                            aria-label={`해 ${i + 1} ${item.variables.map((name, j) => `${name} ${fmt(item.values[j], 10)}`).join(' ')}`}
                            disabled={pending}
                            onClick={() => selectRoot(item, i)}
                          >
                            <span>해 {i + 1}</span>
                            <strong>
                              {item.variables
                                .map(
                                  (name, j) =>
                                    `${name} = ${fmt(item.values[j], 10)}`,
                                )
                                .join(' · ')}
                            </strong>
                          </button>
                          <button
                            className="add-simulation-button"
                            aria-label={`해 ${i + 1} 시뮬레이션 추가`}
                            disabled={
                              pending ||
                              (anchors.length >= 6 && !matchingPanel(item)) ||
                              rootAlreadyOpen(item)
                            }
                            onClick={() => addSimulation(item, i)}
                          >
                            <Plus size={12} />
                            {rootAlreadyOpen(item)
                              ? '열린 시뮬레이션'
                              : '시뮬레이션 추가'}
                          </button>
                        </div>
                      ))}
                    </div>
                    {searchInfo && <SearchCoverage search={searchInfo} />}
                  </details>
                )}
                {automatic &&
                view === 'simulation' &&
                selectedBranch ? null : error ? (
                  <div className="error-state" role="alert">
                    <div className="error-icon">
                      <Sigma size={24} />
                    </div>
                    <h3>
                      {nonlinear
                        ? '해를 구하지 못했습니다.'
                        : '수식을 한 번 확인해 주세요.'}
                    </h3>
                    <p>{error}</p>
                    {searchInfo && <SearchCoverage search={searchInfo} />}
                    <button
                      className="secondary-button"
                      onClick={() => {
                        setGuide(true)
                      }}
                    >
                      입력 가이드 보기
                      <ArrowRight size={14} />
                    </button>
                  </div>
                ) : !hasSource ? (
                  <div className="empty-workspace">
                    <div className="empty-workspace-icon">
                      <Sigma size={28} />
                    </div>
                    <span>
                      {nonlinear ? 'NONLINEAR EQUATIONS' : 'LINEAR EQUATIONS'}
                    </span>
                    <h3>모델을 입력하면 해석을 시작합니다.</h3>
                    <p>
                      {nonlinear
                        ? automatic
                          ? '방정식을 그대로 입력하면 실수 해를 자동으로 탐색합니다. 초기값이나 구간을 입력하지 않아도 됩니다.'
                          : '단일근은 탐색 구간을, 연립방정식은 초기 추정값을 함께 적어 주세요.'
                        : '한 줄에 방정식 하나를 입력하세요. 알려진 값은 파라미터로 등록할 수 있습니다.'}
                    </p>
                    {nonlinear && (
                      <button
                        className="secondary-button"
                        onClick={() =>
                          loadExample(NONLINEAR_EXAMPLES[0].project)
                        }
                      >
                        <BookOpen size={15} />
                        비선형 예제로 시작하기
                      </button>
                    )}
                  </div>
                ) : !result ? (
                  <div className="loading-state">
                    <LoaderCircle className="spin" size={26} />
                    <h3>수식을 해석하고 있습니다.</h3>
                    <p>잠시 후 모델의 해가 표시됩니다.</p>
                  </div>
                ) : (
                  <>
                    <div className="solution-summary">
                      <div className="summary-label">
                        <span className="found-badge">
                          <Check size={12} />
                          {nonlinear
                            ? evaluation
                              ? '계산 완료'
                              : automatic
                                ? (project.selectedAnchor?.label ??
                                  `해 ${solutionIndex + 1}`)
                                : '수렴'
                            : '유일해'}
                        </span>
                        <span>
                          {evaluation
                            ? `${result.variables.length}개 계산 결과`
                            : `${result.variables.length}개 미지수의 해를 찾았습니다`}
                        </span>
                      </div>
                      <div
                        className={`solution-cards ${result.variables.length > 3 ? 'many-values' : ''} ${result.variables.length === 1 ? 'single-value' : ''}`}
                      >
                        {result.variables.map((v, i) => (
                          <div className="solution-value" key={v}>
                            <div>
                              <i
                                style={{
                                  background: colors[i % colors.length],
                                }}
                              />
                              <span>{v}</span>
                            </div>
                            <strong>{fmt(result.values[i], 7)}</strong>
                            <span className="value-caption">계산된 값</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {displayWarnings.length > 0 && (
                      <div className="warning-box">
                        {displayWarnings.map((w, i) => (
                          <p key={i}>{w}</p>
                        ))}
                      </div>
                    )}
                    {nonlinear && (
                      <div className="nonlinear-status">
                        <div>
                          <span>{result.method}</span>
                          {!evaluation && (
                            <b>반복 {result.iterations ?? 0}회</b>
                          )}
                        </div>
                        <p>
                          {evaluation
                            ? '명시식을 계산한 결과입니다.'
                            : automatic
                              ? '현재 선택한 실수 해의 결과입니다. 발견하지 못한 해가 더 존재할 수 있습니다.'
                              : '초기값·탐색 구간에 따라 다른 해에 수렴할 수 있습니다. 이 결과가 전체 해의 유일성을 뜻하지는 않습니다.'}
                        </p>
                      </div>
                    )}
                    {result.auxiliary &&
                      Object.keys(result.auxiliary).length > 0 && (
                        <div className="auxiliary-values">
                          <span>보조식 계산값</span>
                          {Object.entries(result.auxiliary).map(
                            ([name, value]) => (
                              <span key={name}>
                                <code>{name}</code>
                                <b>{fmt(value, 10)}</b>
                              </span>
                            ),
                          )}
                        </div>
                      )}
                    {view === 'simulation' ? (
                      <>
                        {!automatic && (
                          <>
                            <div className="chart-section">
                              <div className="chart-heading">
                                <div>
                                  <h3>파라미터에 따른 해의 변화</h3>
                                  <p>
                                    한 변수를 움직이면, 해답은 어떻게
                                    달라질까요?
                                  </p>
                                </div>
                                <span className="chart-kicker">
                                  PARAMETRIC EXPLORATION
                                </span>
                              </div>
                              {sweepParam ? (
                                <>
                                  <div className="chart-controls">
                                    <label htmlFor="sweep-param">
                                      탐색 변수
                                    </label>
                                    <div className="select-wrap">
                                      <select
                                        id="sweep-param"
                                        value={project.sweepName}
                                        onChange={(e) =>
                                          setProject((p) => ({
                                            ...p,
                                            sweepName: e.target.value,
                                          }))
                                        }
                                      >
                                        {project.parameters.map((p) => (
                                          <option key={p.id} value={p.name}>
                                            {p.name}
                                          </option>
                                        ))}
                                      </select>
                                      <ChevronDown size={12} />
                                    </div>
                                    <span className="sweep-domain">
                                      {fmt(sweepParam.min)}
                                      <ArrowRight size={12} />
                                      {fmt(sweepParam.max)}
                                    </span>
                                  </div>
                                  <SolutionChart
                                    points={payload?.sweep || []}
                                    expanded={expanded}
                                    modelKind={
                                      nonlinear ? 'nonlinear' : 'linear'
                                    }
                                    selectionPoints={payload?.dataset}
                                    variables={result.variables}
                                    parameterName={project.sweepName}
                                    currentParameter={sweepParam.value}
                                    currentValues={result.values}
                                    onParameterChange={
                                      payload?.sweepName === project.sweepName
                                        ? (value) =>
                                            updateParameter(
                                              sweepParam.id,
                                              value,
                                            )
                                        : undefined
                                    }
                                    selectedIndex={selectedIndex}
                                    onSelectIndex={setSelectedIndex}
                                    visibleVariables={visibleVariables}
                                    onToggleVariable={(v) =>
                                      setVisibleVariables((prev) =>
                                        prev.includes(v)
                                          ? prev.filter((n) => n !== v)
                                          : [...prev, v],
                                      )
                                    }
                                  />
                                  {nonlinear && (
                                    <p className="nonlinear-sweep-note">
                                      {automatic
                                        ? '선택한 해에서 이어지는 가지를 수치적으로 추적합니다. 가지가 끝나거나 추적에 실패한 지점은 빈 값으로 표시됩니다.'
                                        : '각 지점은 같은 초기값·구간으로 다시 풉니다. 모든 해를 추적하는 그래프는 아닙니다.'}
                                    </p>
                                  )}
                                  <p className="chart-footnote">
                                    <span className="chart-current-dot" />
                                    점선은 현재 설정값입니다. 그래프 위에
                                    마우스를 올려 값을 확인하세요.
                                  </p>
                                </>
                              ) : (
                                <div className="empty-chart">
                                  <Activity size={34} />
                                  <h4>상수에 움직임을 더해 보세요.</h4>
                                  <p>
                                    파라미터를 추가하고 수식에 사용하면
                                    <br />
                                    해의 변화를 그래프로 탐색할 수 있습니다.
                                  </p>
                                  <button
                                    className="text-button"
                                    onClick={() => setParamOpen(true)}
                                  >
                                    첫 파라미터 추가
                                    <Plus size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="data-section">
                              <div className="data-toolbar">
                                <h3 className="data-section-title">
                                  <Grid2X2 size={13} />
                                  데이터 표
                                </h3>
                                <button
                                  className="text-button"
                                  disabled={
                                    pending ||
                                    !!(sweepParam && payload?.datasetError)
                                  }
                                  onClick={exportCSV}
                                >
                                  <ArrowDownToLine size={13} />
                                  CSV
                                </button>
                              </div>
                              {sweepParam && payload ? (
                                <SweepTable
                                  payload={payload}
                                  parameterStep={sweepParam.step}
                                  selectedIndex={selectedIndex}
                                  onSelectIndex={setSelectedIndex}
                                />
                              ) : (
                                <div className="table-scroll">
                                  <table className="result-table">
                                    <thead>
                                      <tr>
                                        <th>변수</th>
                                        <th>값</th>
                                        {!evaluation && (
                                          <th>방정식 최대 절대 등식 오차</th>
                                        )}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {result.variables.map((v, i) => (
                                        <tr key={v}>
                                          <td>
                                            <span
                                              className="table-color"
                                              style={{
                                                background:
                                                  colors[i % colors.length],
                                              }}
                                            />
                                            {v}
                                          </td>
                                          <td>{fmt(result.values[i], 10)}</td>
                                          {!evaluation && (
                                            <td>
                                              {result.maxResidual.toExponential(
                                                2,
                                              )}
                                            </td>
                                          )}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="report-content">
                        <div className="report-title">
                          <div className="report-document-icon">
                            <FileText size={22} />
                          </div>
                          <div>
                            <span>ANALYSIS REPORT</span>
                            <h3>{project.title}</h3>
                          </div>
                          <button
                            className="secondary-button"
                            disabled={pending}
                            onClick={exportReport}
                          >
                            <Download size={14} />
                            리포트 저장
                          </button>
                        </div>
                        {automatic && solutions.length > 1 && (
                          <button
                            className="all-reports-button"
                            disabled={pending}
                            onClick={exportAllReports}
                          >
                            <Download size={14} />
                            모든 해 리포트 저장
                            <span>{solutions.length}개 해</span>
                          </button>
                        )}
                        {!evaluation && (
                          <div className="condition-controls">
                            <div>
                              <label htmlFor="condition-norm">
                                {nonlinear
                                  ? '국소 조건수 계산 방식'
                                  : '조건수 계산 방식'}
                              </label>
                              <p>입력 오차에 대한 해의 민감도를 확인합니다.</p>
                            </div>
                            <div className="condition-select-wrap">
                              <select
                                id="condition-norm"
                                aria-label="조건수 계산 방식"
                                value={conditionNorm}
                                onChange={(e) =>
                                  setProject((p) => ({
                                    ...p,
                                    conditionNorm: e.target
                                      .value as ConditionNorm,
                                  }))
                                }
                              >
                                <option value="infinity">
                                  ∞-norm · 행 합 기준
                                </option>
                                <option value="2">2-norm · SVD 기준</option>
                              </select>
                              <ChevronDown size={13} />
                            </div>
                          </div>
                        )}
                        <div
                          className={`report-metrics ${evaluation ? 'evaluation-metrics' : ''}`}
                        >
                          <div>
                            <span>
                              {evaluation ? '계산 항목' : '최대 절대 등식 오차'}
                            </span>
                            <strong>
                              {evaluation
                                ? `${result.variables.length}개`
                                : result.maxResidual.toExponential(3)}
                            </strong>
                          </div>
                          {!evaluation && (
                            <div>
                              <span>
                                조건수 ·{' '}
                                {result.conditionNorm === '2'
                                  ? '2-norm'
                                  : '∞-norm'}
                                {nonlinear && !evaluation ? ' · 국소' : ''}
                              </span>
                              <strong className="condition-value">
                                {fmt(result.condition, 7)}
                              </strong>
                              <span
                                className="condition-badge"
                                data-level={sensitivity?.level}
                                role="status"
                                aria-live="polite"
                                aria-busy={pending}
                              >
                                <i />
                                {sensitivity?.label}
                              </span>
                            </div>
                          )}
                          <div>
                            <span>계산 시간</span>
                            <strong>
                              {fmt(result.durationMs, 3)}
                              <small> ms</small>
                            </strong>
                          </div>
                        </div>
                        {!evaluation && (
                          <div
                            className="condition-explanation"
                            data-level={sensitivity?.level}
                          >
                            <p>
                              {result.conditionError ||
                                sensitivity?.description}
                            </p>
                            <div
                              className="condition-thresholds"
                              aria-label="조건수 민감도 참고 범위"
                            >
                              <span>
                                <i className="condition-dot stable" />
                                <b>안정</b> κ &lt; 10⁴
                              </span>
                              <span>
                                <i className="condition-dot sensitive" />
                                <b>민감</b> 10⁴ ≤ κ &lt; 10⁸
                              </span>
                              <span>
                                <i className="condition-dot very-sensitive" />
                                <b>매우 민감</b> κ ≥ 10⁸
                              </span>
                            </div>
                            {nonlinear && (
                              <p className="local-condition-note">
                                {evaluation
                                  ? '명시식 계산에는 조건수가 적용되지 않습니다.'
                                  : '조건수는 수렴점의 Jacobian에 대한 국소 진단입니다. 1×1 비영 Jacobian의 조건수는 항상 1이므로 단일근의 민감도는 도함수 크기도 함께 확인하세요. 전체 영역의 안정성은 보장하지 않습니다.'}
                              </p>
                            )}
                            <p className="condition-caveat">
                              위 범위는 참고 기준입니다. 실제 신뢰도는 측정
                              오차와 단위·스케일에 따라 달라지며, 작은 등식
                              오차만으로 해의 정확도를 보장하지는 않습니다.
                            </p>
                            <details className="condition-guide">
                              <summary>
                                계산 방식의 차이 알아보기
                                <ChevronDown size={12} />
                              </summary>
                              <p>
                                <b>∞-norm</b>은 A와 A⁻¹의 최대 절댓값 행 합을
                                곱합니다. <b>2-norm</b>은 직접 SVD로 구한
                                최대·최소 특이값의 비율 σmax / σmin입니다.
                              </p>
                              <p>
                                두 방식은 서로 다른 norm으로 민감도를 측정하므로
                                값이 달라질 수 있습니다. 2-norm 선택이 해 자체의
                                계산 정밀도를 높이는 것은 아닙니다.
                              </p>
                              <p>
                                {nonlinear
                                  ? '조건수는 수렴점에서 계산한 Jacobian J를 기준으로 합니다.'
                                  : '조건수는 수식에서 추출한 계수 행렬 A를 기준으로 합니다.'}{' '}
                                식이나 변수의 단위를 바꾸면 값이 달라질 수
                                있습니다. 계산 방식 선택은 진단에 적용되며, 해를
                                구하는 솔버는 동일합니다.
                              </p>
                            </details>
                          </div>
                        )}
                        <h4>01 / 입력 모델</h4>
                        <pre>{project.source}</pre>
                        <h4>02 / 파라미터</h4>
                        <div className="report-param-list">
                          {project.parameters.length ? (
                            project.parameters.map((p) => (
                              <span key={p.id}>
                                {p.name}
                                <b>{fmt(p.value, 10)}</b>
                              </span>
                            ))
                          ) : (
                            <p>별도로 정의된 파라미터가 없습니다.</p>
                          )}
                        </div>
                        <h4>03 / 수치 검증</h4>
                        <p className="report-explanation">
                          {nonlinear
                            ? evaluation
                              ? '명시식의 의존 관계를 확인하여 순서대로 계산합니다.'
                              : '등식 오차는 구한 해를 넣었을 때 좌변과 우변의 차이입니다. 아래 Jacobian은 해 주변의 국소 변화율이며, 조건수가 클수록 작은 입력 변화에 해가 민감할 수 있습니다.'
                            : '부분 피벗팅 가우스 소거법으로 A·x = b를 풉니다. 등식 오차는 입력 방정식의 좌변과 우변 차이입니다. 조건수가 클수록 작은 입력 오차에 해가 민감할 수 있습니다.'}
                        </p>
                        {!evaluation && (
                          <details className="matrix-details">
                            <summary>
                              <Grid2X2 size={14} />
                              <span>
                                {nonlinear
                                  ? 'Jacobian·수치 검증 자세히 보기'
                                  : '행렬·수치 검증 자세히 보기'}
                              </span>
                              <ChevronDown size={15} />
                            </summary>
                            <p>
                              {nonlinear
                                ? '해 주변의 Jacobian J와 각 방정식의 좌변·우변 차이를 확인합니다. 수치 계산의 수렴과 민감도를 검토할 수 있습니다.'
                                : '수식을 A·x = b로 변환한 계수와 우변을 확인합니다. 부호나 누락된 항을 검토할 때 활용하세요.'}
                            </p>
                            <MatrixView result={result} />
                            <div className="residual-list">
                              {result.residuals.map((r, i) => (
                                <div key={i}>
                                  <span>방정식 {i + 1}</span>
                                  <code>{r.toExponential(3)}</code>
                                  <CheckCircle2 size={13} />
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    )}
                    <div className="result-footer">
                      <span>
                        <span className="status-dot" />
                        {pending ? '새 설정으로 계산 중…' : '계산 완료'}
                        <i>·</i>
                        {fmt(result.durationMs, 3)} ms
                      </span>
                      <span>
                        {nonlinear ? result.method : '부분 피벗팅'}
                        {!evaluation && (
                          <>
                            {' '}
                            · {result.matrix.length} × {result.variables.length}
                          </>
                        )}
                      </span>
                    </div>
                  </>
                )}
                {automatic &&
                  view === 'simulation' &&
                  anchors.length === 0 &&
                  selectedBranch &&
                  project.selectedAnchor && (
                    <div className="selected-simulation-workspace">
                      <div className="selected-simulation-toolbar">
                        <span>선택한 해의 고정된 곡선</span>
                        {project.parameters.length > 0 && (
                          <label>
                            탐색 변수{' '}
                            <select
                              aria-label="탐색 변수"
                              value={project.sweepName}
                              onChange={(e) =>
                                setProject((p) => ({
                                  ...p,
                                  sweepName: e.target.value,
                                }))
                              }
                            >
                              {project.parameters.map((p) => (
                                <option key={p.id} value={p.name}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                      </div>
                      <SimulationPanelView
                        panel={selectedBranch}
                        anchor={project.selectedAnchor}
                        parameters={project.parameters}
                        expanded={expanded}
                        pending={pending}
                        closable={false}
                        onClose={() => {}}
                        onParameterChange={
                          sweepParam &&
                          selectedBranch.sweepName === project.sweepName
                            ? (value) => updateParameter(sweepParam.id, value)
                            : undefined
                        }
                        onReport={() => navigate('report')}
                      />
                    </div>
                  )}
                {automatic &&
                  view === 'simulation' &&
                  mergedSets.length > 0 && (
                    <div className="merged-sets-grid">
                      {mergedSets.map((set) => (
                        <MergedSimulationSetView
                          key={set.id}
                          mergedSet={set}
                          anchors={anchors}
                          panels={simulationResults}
                          parameters={project.parameters}
                          sweepName={project.sweepName}
                          expanded={expanded}
                          pending={pending}
                          onRemoveSet={() => removeMergedSet(set.id)}
                          onToggleAnchorInSet={(id) =>
                            setProject((p) => ({
                              ...p,
                              mergedSets: p.mergedSets?.map((item) =>
                                item.id !== set.id
                                  ? item
                                  : {
                                      ...item,
                                      anchorIds: item.anchorIds.includes(id)
                                        ? item.anchorIds.filter(
                                            (value) => value !== id,
                                          )
                                        : [...item.anchorIds, id],
                                    },
                              ),
                            }))
                          }
                          onParameterChange={
                            sweepParam
                              ? (value) => updateParameter(sweepParam.id, value)
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  )}
                {automatic &&
                  view === 'simulation' &&
                  individualAnchors.length > 0 && (
                    <div className="multi-simulation-workspace">
                      <div className="multi-simulation-toolbar">
                        <div>
                          <h3>
                            동시 시뮬레이션{' '}
                            <span>{individualAnchors.length} / 6</span>
                          </h3>
                          <p>
                            오른쪽 위 파라미터 조절은 열린 모든 시뮬레이션에
                            함께 적용됩니다.
                          </p>
                        </div>
                        <label>
                          탐색 변수
                          <select
                            aria-label="동시 시뮬레이션 탐색 변수"
                            value={project.sweepName}
                            onChange={(e) =>
                              setProject((p) => ({
                                ...p,
                                sweepName: e.target.value,
                              }))
                            }
                          >
                            {project.parameters.map((p) => (
                              <option key={p.id} value={p.name}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="simulation-grid">
                        {individualAnchors.map((anchor) => {
                          const panel = simulationResults.find(
                            (p) => p.id === anchor.id,
                          ) ?? {
                            id: anchor.id,
                            label: anchor.label,
                            result: null,
                            sweep: [],
                            dataset: [],
                            sweepName: project.sweepName,
                            error: pending
                              ? '계산 중입니다.'
                              : '시뮬레이션 결과를 준비하고 있습니다.',
                          }
                          return (
                            <SimulationPanelView
                              key={anchor.id}
                              panel={panel}
                              anchor={anchor}
                              parameters={project.parameters}
                              expanded={expanded}
                              pending={pending}
                              onClose={() => closeSimulation(anchor.id)}
                              onParameterChange={
                                sweepParam &&
                                panel.sweepName === project.sweepName
                                  ? (value) =>
                                      updateParameter(sweepParam.id, value)
                                  : undefined
                              }
                              onReport={() => openSimulationReport(anchor)}
                            />
                          )
                        })}
                      </div>
                      <p className="multi-simulation-note">
                        파라미터는 연속적으로 움직이며 샘플 포인트 간격은
                        표·그래프 마커에 적용됩니다. 각 창은 추가한 시점의 해를
                        기준으로 이어서 풉니다. 분기점·교차점에서는 가지 구분이
                        어려울 수 있으며 추적 실패 구간은 빈 값으로 표시합니다.
                      </p>
                    </div>
                  )}
              </section>
              {view === 'simulation' && (
                <div className="insight-card">
                  <span className="insight-icon">
                    <ArrowLeftRight size={20} />
                  </span>
                  <div>
                    <b>정적인 정답을 넘어, 변화의 관계를 이해하세요.</b>
                    <p>
                      여러 파라미터 중 하나를 선택해 해의 변화를 탐색할 수
                      있습니다.
                    </p>
                  </div>
                  <span className="insight-symbol">ƒ(x)</span>
                </div>
              )}
            </div>
          </div>
          <footer className="page-footer">
            <span>
              polymath<span className="footer-studio"> studio</span>
              <i />
              모델링의 다음 가능성
            </span>
            <span>
              Equation Solver <span className="footer-dot">·</span> 데이터는 이
              브라우저에만 저장됩니다.
            </span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} />
          {toast}
          {undoProject && (
            <button
              className="undo-button"
              onClick={() => {
                setProject(undoProject)
                setUndoProject(null)
                setToast('이전 모델을 복원했습니다.')
              }}
            >
              되돌리기
            </button>
          )}
          <button aria-label="알림 닫기" onClick={() => setToast('')}>
            <X size={14} />
          </button>
        </div>
      )}
      {guide && <Guide mode={mode} onClose={() => setGuide(false)} />}
      {paramOpen && (
        <div className="modal-backdrop" onClick={() => setParamOpen(false)}>
          <section
            className="parameter-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="parameter-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close icon-button"
              aria-label="닫기"
              onClick={() => setParamOpen(false)}
            >
              <X size={19} />
            </button>
            <span className="modal-eyebrow">MAKE IT INTERACTIVE</span>
            <h2 id="parameter-dialog-title">상수를 파라미터로.</h2>
            <p>
              알려진 값을 등록하고 수식에서 이름으로 사용하세요.
              <br />
              슬라이더 범위는 추가 후 설정에서 바꿀 수 있습니다.
            </p>
            <form onSubmit={addParameter}>
              <label>
                이름
                <input
                  autoFocus
                  placeholder="예: k, F, concentration"
                  maxLength={40}
                  value={paramName}
                  onChange={(e) => setParamName(e.target.value)}
                />
              </label>
              <label>
                현재 값
                <input
                  type="number"
                  step="any"
                  value={paramValue}
                  onChange={(e) => setParamValue(e.target.value)}
                />
              </label>
              {paramError && (
                <p className="form-error" role="alert">
                  {paramError}
                </p>
              )}
              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setParamOpen(false)}
                >
                  취소
                </button>
                <button className="primary-button" type="submit">
                  <Plus size={15} />
                  파라미터 추가
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
function MatrixView({
  result,
}: {
  result: NonNullable<SolvePayload['result']>
}) {
  return (
    <div className="matrix-view">
      <div className="matrix-caption">
        {result.kind === 'nonlinear' ? 'J · Δx = −(좌변 − 우변)' : 'A · x = b'}{' '}
        <span>
          {result.kind === 'nonlinear'
            ? '수렴점에서의 국소 선형화'
            : '입력 수식을 자동으로 행렬로 변환합니다.'}
        </span>
      </div>
      <div className="matrix-equation">
        <div className="matrix-bracket">
          <table>
            <tbody>
              {result.matrix.map((row, i) => (
                <tr key={i}>
                  {row.map((n, j) => (
                    <td key={j}>{fmt(n)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <span className="matrix-dot">·</span>
        <div className="matrix-bracket">
          <table>
            <tbody>
              {result.variables.map((v) => (
                <tr key={v}>
                  <td className="matrix-variable">
                    {result.kind === 'nonlinear' ? 'Δ' : ''}
                    {v}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <span>=</span>
        <div className="matrix-bracket">
          <table>
            <tbody>
              {result.rhs.map((n, i) => (
                <tr key={i}>
                  <td>{fmt(n)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
function RangeEditor({
  parameter: p,
  onChange,
}: {
  parameter: Project['parameters'][number]
  onChange: (p: Project['parameters'][number]) => void
}) {
  const [range, setRange] = useState({
    min: String(p.min),
    max: String(p.max),
    step: String(p.step),
  })
  const [error, setError] = useState('')
  useEffect(() => {
    setRange({ min: String(p.min), max: String(p.max), step: String(p.step) })
  }, [p.min, p.max, p.step])
  return (
    <form
      className="range-editor"
      onSubmit={(e) => {
        e.preventDefault()
        const min = Number(range.min),
          max = Number(range.max),
          step = Number(range.step)
        if (
          Object.values(range).some((v) => !v.trim()) ||
          ![min, max, step].every(Number.isFinite) ||
          !Number.isFinite(max - min) ||
          min >= max ||
          step <= 0
        ) {
          setError('최솟값 < 최댓값, 샘플 포인트 간격 > 0이어야 합니다.')
          return
        }
        setError('')
        onChange({
          ...p,
          min,
          max,
          step,
          value: Math.max(min, Math.min(max, p.value)),
        })
      }}
    >
      {(['min', 'max', 'step'] as const).map((k, i) => (
        <label key={k}>
          {['최솟값', '최댓값', '샘플 포인트 간격'][i]}
          <input
            aria-label={`${p.name} ${['최솟값', '최댓값', '샘플 포인트 간격'][i]}`}
            type="number"
            step="any"
            value={range[k]}
            onChange={(e) => setRange((v) => ({ ...v, [k]: e.target.value }))}
          />
        </label>
      ))}
      <button
        type="submit"
        title="범위 적용"
        aria-label={`${p.name} 범위 적용`}
      >
        <Check size={14} />
      </button>
      {error && <span role="alert">{error}</span>}
    </form>
  )
}
function SweepTable({
  payload,
  parameterStep,
  selectedIndex,
  onSelectIndex,
}: {
  payload: SolvePayload
  parameterStep: number
  selectedIndex: number | null
  onSelectIndex: (index: number | null) => void
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const rows = useRef<(HTMLTableRowElement | null)[]>([])
  const points = payload.dataset
  const lastGap =
    points.length > 1
      ? points.at(-1)!.parameter - points.at(-2)!.parameter
      : parameterStep
  const shorterFinalGap =
    lastGap < parameterStep &&
    Math.abs(lastGap - parameterStep) >
      Math.max(Math.abs(lastGap), Math.abs(parameterStep)) * 1e-10
  useEffect(() => {
    if (selectedIndex === null) return
    const el = rows.current[selectedIndex],
      parent = scroller.current
    if (!el || !parent) return
    const rowTop = el.offsetTop,
      headHeight = 35
    if (rowTop < parent.scrollTop + headHeight)
      parent.scrollTop = Math.max(0, rowTop - headHeight)
    else if (rowTop + el.offsetHeight > parent.scrollTop + parent.clientHeight)
      parent.scrollTop = rowTop + el.offsetHeight - parent.clientHeight
  }, [selectedIndex])
  if (payload.datasetError)
    return (
      <div className="dataset-error" role="alert">
        <p>{payload.datasetError}</p>
        <span>
          현재 해와 그래프는 계속 확인할 수 있습니다. 파라미터 범위 설정에서
          샘플 포인트 간격을 조정해 주세요.
        </span>
      </div>
    )
  return (
    <>
      <div className="sweep-table-caption">
        <span>
          샘플 포인트 간격 <b>{String(parameterStep)}</b> ·{' '}
          <b>{points.length.toLocaleString('en-US')}</b>행
          {selectedIndex !== null ? ` · 선택 ${selectedIndex + 1}` : ''}
        </span>
        <span>표와 CSV는 같은 계산 지점을 사용합니다.</span>
      </div>
      {shorterFinalGap && (
        <p className="dataset-endpoint-note">
          최댓값을 포함하도록 마지막 구간만 설정 간격보다 짧게 계산했습니다.
        </p>
      )}
      <div
        className="table-scroll sweep-table-scroll"
        ref={scroller}
        onPointerLeave={() => onSelectIndex(null)}
      >
        <table className="result-table sweep-table">
          <thead>
            <tr>
              <th>{payload.sweepName}</th>
              {payload.result.variables.map((v, i) => (
                <th key={v}>
                  <span
                    className="table-color"
                    style={{ background: colors[i % colors.length] }}
                  />
                  {v}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {points.map((p, i) => (
              <tr
                key={i}
                ref={(el) => {
                  rows.current[i] = el
                }}
                tabIndex={0}
                data-parameter={p.parameter}
                aria-label={`${payload.sweepName} ${String(p.parameter)} 탐색`}
                aria-selected={selectedIndex === i}
                className={selectedIndex === i ? 'highlighted' : ''}
                onPointerEnter={() => onSelectIndex(i)}
                onFocus={() => onSelectIndex(i)}
                onClick={() => onSelectIndex(i)}
                onBlur={() => onSelectIndex(null)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    rows.current[Math.min(i + 1, points.length - 1)]?.focus()
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    rows.current[Math.max(0, i - 1)]?.focus()
                  }
                }}
              >
                <td>{String(p.parameter)}</td>
                {payload.result.variables.map((_, j) => (
                  <td key={j} title={p.values ? undefined : p.error}>
                    {p.values ? fmt(p.values[j], 9) : '해 없음'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function ParameterValueInput({
  parameter: p,
  onCommit,
}: {
  parameter: Project['parameters'][number]
  onCommit: (value: number) => void
}) {
  const [draft, setDraft] = useState(String(p.value))
  useEffect(() => setDraft(String(p.value)), [p.value])
  const commit = () => {
    const value = Number(draft)
    if (!draft.trim() || !Number.isFinite(value)) {
      setDraft(String(p.value))
      return
    }
    const next = Math.min(p.max, Math.max(p.min, value))
    setDraft(String(next))
    onCommit(next)
  }
  return (
    <input
      aria-label={`${p.name} 값`}
      title={`범위 ${p.min} ~ ${p.max} · Enter로 적용`}
      type="number"
      min={p.min}
      max={p.max}
      step="any"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          commit()
        }
        if (e.key === 'Escape') {
          setDraft(String(p.value))
          e.currentTarget.blur()
        }
      }}
    />
  )
}

function SearchCoverage({ search }: { search: SearchSummary }) {
  return (
    <div className="search-summary">
      <div>
        <span>{search.method}</span>
        <strong>
          탐색 범위 {fmt(search.min, 8)} ~ {fmt(search.max, 8)}
        </strong>
      </div>
      <p>{search.note}</p>
      {search.window && (
        <p className="search-window-note">
          탐색 창 {fmt(search.window.min, 10)} ~ {fmt(search.window.max, 10)} ·
          최대 폭 {fmt(search.window.maxWidth, 10)} ·{' '}
          {search.window.reason === 'periodic'
            ? '주기 분석 기준'
            : '관찰 밀도 기준 (완전성 보장 아님)'}
        </p>
      )}
      {search.variableBounds &&
        Object.keys(search.variableBounds).length > 1 && (
          <p>
            {Object.entries(search.variableBounds)
              .map(([name, b]) => `${name}: ${b.min} ~ ${b.max}`)
              .join(' · ')}
          </p>
        )}
      {search.certification && (
        <IntervalCertificateView certificate={search.certification} />
      )}
      {search.certificationUnavailable && (
        <p>{search.certificationUnavailable}</p>
      )}
    </div>
  )
}
function IntervalCertificateView({
  certificate: c,
}: {
  certificate: RootCertificate
}) {
  return (
    <details className="interval-certificate">
      <summary>{certificateSummary(c)}</summary>
      <p>
        검증 범위: {c.variable} ∈ [{String(c.domain.min)},{' '}
        {String(c.domain.max)}]. 유일한 단순근 구간 {c.uniqueRootCount}개 ·
        정의역 제외 구간 {c.excludedDomainCount}개.
      </p>
      <p>
        길이 비율은 근을 모두 찾았을 확률이 아닙니다. 미결정 구간이 하나라도
        있으면 전체 실근 검증은 보류됩니다. 입력한 Float64 상수의 실수 모델을
        검증하며 측정 오차는 포함하지 않습니다.
      </p>
      {c.complete && (
        <p>
          {c.allRootsRepresented
            ? '분리한 모든 근 구간에 계산 결과가 대응합니다.'
            : '분리한 근 구간과 표시된 계산 결과의 대응을 확인하지 못했습니다.'}
        </p>
      )}
      {c.rootIntervals.length > 0 && (
        <details>
          <summary>유일근 분리 구간 보기</summary>
          <ul>
            {c.rootIntervals.slice(0, 24).map((i, n) => (
              <li key={n}>
                [{String(i.lo)}, {String(i.hi)}]
              </li>
            ))}
          </ul>
        </details>
      )}
      {c.unresolved.length > 0 && (
        <ul>
          {c.unresolved.slice(0, 24).map((i, n) => (
            <li key={n}>
              [{String(i.lo)}, {String(i.hi)}] · {unresolvedReason(i.reason)}
            </li>
          ))}
        </ul>
      )}
      {c.unresolved.length > 24 && (
        <p>
          나머지 {c.unresolved.length - 24}곳은 내려받은 리포트에서 확인하세요.
        </p>
      )}
      <button
        type="button"
        className="outline-button"
        onClick={() =>
          downloadFile(
            'polymath-interval-verification.md',
            certificateReport(c),
            'text/markdown;charset=utf-8',
          )
        }
      >
        구간 검증 저장
      </button>
    </details>
  )
}
function SearchBoundsEditor({
  bounds,
  variables,
  variableBounds,
  window,
  onApply,
}: {
  bounds?: { min: number; max: number }
  variables: string[]
  variableBounds?: VariableBounds
  window?: SearchWindow
  onApply: (
    bounds: { min: number; max: number } | undefined,
    variableBounds?: VariableBounds,
  ) => void
}) {
  const [min, setMin] = useState(bounds ? String(bounds.min) : '')
  const [max, setMax] = useState(bounds ? String(bounds.max) : '')
  const [custom, setCustom] = useState<
    Record<string, { min: string; max: string }>
  >({})
  const [center, setCenter] = useState('0')
  const [error, setError] = useState('')
  useEffect(() => {
    setCustom(
      Object.fromEntries(
        Object.entries(variableBounds ?? {}).map(([v, b]) => [
          v,
          { min: String(b.min), max: String(b.max) },
        ]),
      ),
    )
  }, [JSON.stringify(variableBounds)])
  useEffect(() => {
    if (window) {
      setMin(String(window.min))
      setMax(String(window.max))
      setCenter(String(window.min / 2 + window.max / 2))
    }
  }, [window?.min, window?.max])
  const readCustom = () => {
    const out: VariableBounds = {}
    for (const [name, b] of Object.entries(custom)) {
      if (!b.min.trim() && !b.max.trim()) continue
      const min = Number(b.min),
        max = Number(b.max)
      if (
        !b.min.trim() ||
        !b.max.trim() ||
        ![min, max, max - min].every(Number.isFinite) ||
        min >= max
      )
        throw new Error(`${name}의 최솟값과 최댓값을 확인하세요.`)
      if (
        window?.variable === name &&
        max - min > window.maxWidth * (1 + 1e-12)
      )
        throw new Error('탐색 창의 최대 폭을 초과했습니다. 위치를 옮겨 주세요.')
      out[name] = { min, max }
    }
    return Object.keys(out).length ? out : undefined
  }
  useEffect(() => {
    if (window) return
    setMin(bounds ? String(bounds.min) : '')
    setMax(bounds ? String(bounds.max) : '')
    setError('')
  }, [bounds?.min, bounds?.max])
  return (
    <form
      className="search-bounds-form"
      onSubmit={(e) => {
        e.preventDefault()
        try {
          const chosen = readCustom()
          if (!min.trim() && !max.trim()) {
            onApply(undefined, chosen)
            setError('')
            return
          }
          const a = Number(min),
            b = Number(max)
          if (
            !min.trim() ||
            !max.trim() ||
            ![a, b, b - a].every(Number.isFinite) ||
            a >= b
          ) {
            setError('최솟값보다 큰 유한한 최댓값을 입력하세요.')
            return
          }
          if (window && b - a > window.maxWidth * (1 + 1e-12))
            throw new Error(
              '탐색 창의 최대 폭을 초과했습니다. 폭을 줄이거나 중심 위치를 옮겨 주세요.',
            )
          onApply({ min: a, max: b }, chosen)
          setError('')
        } catch (e) {
          setError(e instanceof Error ? e.message : '범위를 확인하세요.')
        }
      }}
    >
      <p>
        범위는 선택 사항입니다. 비워 두면 자동 범위를 사용합니다. 더 넓거나 좁은
        영역이 필요할 때 지정하세요.
      </p>
      <div>
        <label>
          최솟값
          <input
            aria-label="자동 탐색 최솟값"
            type="number"
            step="any"
            value={min}
            placeholder="자동"
            onChange={(e) => setMin(e.target.value)}
          />
        </label>
        <label>
          최댓값
          <input
            aria-label="자동 탐색 최댓값"
            type="number"
            step="any"
            value={max}
            placeholder="자동"
            onChange={(e) => setMax(e.target.value)}
          />
        </label>
        <button type="submit">범위 적용</button>
      </div>
      <details className="variable-bounds">
        <summary>미지수별 탐색 범위</summary>
        {variables.map((name) => (
          <div key={name}>
            <b>{name}</b>
            {(['min', 'max'] as const).map((key) => (
              <label key={key}>
                {key === 'min' ? '최솟값' : '최댓값'}
                <input
                  type="number"
                  step="any"
                  aria-label={`${name} 탐색 ${key === 'min' ? '최솟값' : '최댓값'}`}
                  placeholder="공통 범위"
                  value={custom[name]?.[key] ?? ''}
                  onChange={(e) =>
                    setCustom((p) => ({
                      ...p,
                      [name]: {
                        ...(p[name] ?? { min: '', max: '' }),
                        [key]: e.target.value,
                      },
                    }))
                  }
                />
              </label>
            ))}
          </div>
        ))}
      </details>
      {window && (
        <div className="search-window-controls">
          <p>
            탐색 창 · 최대 폭 {fmt(window.maxWidth, 10)}. 더 넓힐 수 없으며
            중심을 이동할 수 있습니다.
            {window.reason === 'density'
              ? ' 일반 함수의 모든 근을 보장하지 않습니다.'
              : ''}
          </p>
          <label>
            탐색 창 중심
            <input
              aria-label="탐색 창 중심"
              type="number"
              step="any"
              value={center}
              onChange={(e) => setCenter(e.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={() => {
              const c = Number(center)
              if (!center.trim() || !Number.isFinite(c)) {
                setError('유한한 중심 위치를 입력하세요.')
                return
              }
              const b = {
                min: c - window.maxWidth / 2,
                max: c + window.maxWidth / 2,
              }
              if (
                ![b.min, b.max, b.max - b.min].every(Number.isFinite) ||
                b.min >= b.max
              ) {
                setError(
                  '이 위치에서는 Float64로 탐색 창의 폭을 표현할 수 없습니다. 중심 위치를 줄여 주세요.',
                )
                return
              }
              try {
                const vars = readCustom()
                onApply(
                  b,
                  vars?.[window.variable]
                    ? { ...vars, [window.variable]: b }
                    : vars,
                )
                setError('')
              } catch (e) {
                setError((e as Error).message)
              }
            }}
          >
            탐색 창 이동
          </button>
        </div>
      )}
      {error && <span role="alert">{error}</span>}
    </form>
  )
}

function ResultParameters({
  parameters,
  onChange,
}: {
  parameters: Parameter[]
  onChange: (id: string, value: number) => void
}) {
  return (
    <section className="results-parameters" aria-label="파라미터 조절">
      <div className="results-parameters-heading">
        <span>
          <SlidersHorizontal size={14} />
          파라미터 조절
        </span>
        <small>열린 모든 시뮬레이션에 적용</small>
      </div>
      <div className="results-parameter-grid">
        {parameters.map((p) => (
          <div key={p.id} className="result-parameter">
            <div className="parameter-top">
              <label htmlFor={`param-${p.id}`} className="parameter-name">
                {p.name}
              </label>
              <div className="parameter-input-wrap">
                <ParameterValueInput
                  parameter={p}
                  onCommit={(v) => onChange(p.id, v)}
                />
              </div>
            </div>
            <input
              id={`param-${p.id}`}
              aria-label={`${p.name} 슬라이더`}
              className="parameter-slider"
              type="range"
              min={p.min}
              max={p.max}
              step="any"
              value={p.value}
              style={
                {
                  '--range-fill': `${((p.value - p.min) / (p.max - p.min)) * 100}%`,
                } as React.CSSProperties
              }
              onChange={(e) => onChange(p.id, Number(e.target.value))}
            />
            <div className="range-labels">
              <span>{String(p.min)}</span>
              <span>{String(p.max)}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
```
