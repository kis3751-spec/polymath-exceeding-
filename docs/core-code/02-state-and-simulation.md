# 02 · 상태 관리, 분기 추적과 비동기 계산

수식·파라미터·선택한 해가 화면과 계산 엔진 사이를 오가는 실제 코드입니다. `models.ts`는 저장할 모델을, `App.tsx`는 화면 이동·모델 편집·계산 요청·저장 및 리포트 생성을 연결합니다.

`solver.worker.ts`는 UI 스레드 밖에서 계산하고, 요청 번호를 사용하는 UI가 이전 응답으로 최신 결과를 덮어쓰지 않게 합니다. `sweep.ts`는 그래프용 지점과 사용자가 정한 간격의 데이터 표 지점을 구분합니다.

`branches.ts`는 기준 해에서 파라미터를 조금씩 바꾸어 동일한 가지를 수치적으로 추적합니다. 국소 보정과 역방향 확인에 실패한 구간을 다른 해로 임의 연결하지 않습니다. `simulation-panels.ts`는 해별 기준 스냅샷과 계산 캐시를 관리합니다.

탐색 변수의 현재값은 곡선 위의 현재 지점을 가리킵니다. 같은 기준 해·다른 고정 파라미터·범위·간격에서는 현재 탐색 변수만 움직여도 기준 곡선이 달라지지 않도록 계산과 표시를 구분합니다. 다른 고정 파라미터, 선택한 해 또는 탐색 범위가 바뀌면 곡선을 다시 계산할 수 있습니다.

## 읽는 방법

아래 코드 블록은 표시한 원본 파일의 전체 내용을 그대로 복사한 읽기용 묶음입니다. 요약용 의사 코드나 별도의 구현이 아니며, 모듈의 import 경로는 원래 프로젝트 구조를 따릅니다. 이 Markdown을 하나의 TypeScript 파일로 바꾸어 실행하는 용도는 아닙니다. 실행은 저장소에서 `npm ci`와 `npm run dev`를 사용합니다.

원본을 수정한 뒤 `npm run docs:core`로 다시 만들고, `npm run docs:core -- --check`로 문서와 현재 소스가 같은지 확인할 수 있습니다. 각 파일의 SHA-256은 원문 일치 확인용이며 생성 시각을 넣지 않아 같은 소스에서 같은 문서를 만듭니다.

소스 묶음 SHA-256: `b6432f7a06b7dfcf9c1bc8be5b09606dc190c396ba2020ff5ce3405db4837f13`

## 다른 코드 묶음

- [01 · 수식 파싱과 수치해석 엔진](./01-math-engine.md)
- [02 · 상태 관리, 분기 추적과 비동기 계산](./02-state-and-simulation.md) · 현재 문서
- [03 · 그래프, 마우스 조작과 화면 표현](./03-chart-and-interaction.md)
- [04 · 미분방정식·회귀·적분·최적화](./04-scientific-modules.md)

## 포함한 원본

- [src/editor-input.ts](#source-1) · [저장소 원본](../../src/editor-input.ts)
- [src/equation-project.ts](#source-2) · [저장소 원본](../../src/equation-project.ts)
- [src/models.ts](#source-3) · [저장소 원본](../../src/models.ts)
- [src/showcase-examples.ts](#source-4) · [저장소 원본](../../src/showcase-examples.ts)
- [src/solver-input.ts](#source-5) · [저장소 원본](../../src/solver-input.ts)
- [src/use-project-persistence.ts](#source-6) · [저장소 원본](../../src/use-project-persistence.ts)
- [src/account-storage.ts](#source-7) · [저장소 원본](../../src/account-storage.ts)
- [server/store.mjs](#source-8) · [저장소 원본](../../server/store.mjs)
- [server/app.mjs](#source-9) · [저장소 원본](../../server/app.mjs)
- [server/start.mjs](#source-10) · [저장소 원본](../../server/start.mjs)
- [server/runtime-config.mjs](#source-11) · [저장소 원본](../../server/runtime-config.mjs)
- [server/sharing.mjs](#source-12) · [저장소 원본](../../server/sharing.mjs)
- [scripts/share-codespaces.mjs](#source-13) · [저장소 원본](../../scripts/share-codespaces.mjs)
- [scripts/diagnose-codespaces.mjs](#source-14) · [저장소 원본](../../scripts/diagnose-codespaces.mjs)
- [server/setup.mjs](#source-15) · [저장소 원본](../../server/setup.mjs)
- [server/dev.mjs](#source-16) · [저장소 원본](../../server/dev.mjs)
- [src/equation-count.ts](#source-17) · [저장소 원본](../../src/equation-count.ts)
- [src/csv.ts](#source-18) · [저장소 원본](../../src/csv.ts)
- [src/engine/sweep.ts](#source-19) · [저장소 원본](../../src/engine/sweep.ts)
- [src/engine/branches.ts](#source-20) · [저장소 원본](../../src/engine/branches.ts)
- [src/engine/branch-events.ts](#source-21) · [저장소 원본](../../src/engine/branch-events.ts)
- [src/engine/simulation-panels.ts](#source-22) · [저장소 원본](../../src/engine/simulation-panels.ts)
- [src/engine/manual-simulation.ts](#source-23) · [저장소 원본](../../src/engine/manual-simulation.ts)
- [src/use-interaction-viewport.ts](#source-24) · [저장소 원본](../../src/use-interaction-viewport.ts)
- [src/engine/default-overview.ts](#source-25) · [저장소 원본](../../src/engine/default-overview.ts)
- [src/engine/solver.worker.ts](#source-26) · [저장소 원본](../../src/engine/solver.worker.ts)
- [src/App.tsx](#source-27) · [저장소 원본](../../src/App.tsx)

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

원본: [src/models.ts](../../src/models.ts) · 173줄 · SHA-256: `dbfb55abce3f381f8ebf93105a7d07588b6c1840c89709057654c36b06b93a49`

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
  inputNoiseSigma?: number
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
  title: 'New Linear Model',
  description: '방정식을 입력하고 조절할 값을 Parameter로 추가하세요.',
  source: '',
  parameters: [],
  sweepName: '',
  conditionNorm: 'infinity',
}

export const DEFAULT_NONLINEAR_PROJECT: Project = {
  mode: 'nonlinear',
  title: 'New Nonlinear Model',
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

export const ALL_NONLINEAR_EXAMPLES: NonlinearExample[] = [
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

// The full catalogue remains available to regression fixtures; the user menu
// deliberately contains only complementary introductory and scientific models.
const CORE_EXAMPLE_IDS = new Set([
  'positive-root',
  'circle-intersection',
  'landau-fold',
  'dimensional-van-der-waals',
  'transcendental-folds',
  'cubic-passage',
])
export const NONLINEAR_EXAMPLES = ALL_NONLINEAR_EXAMPLES.filter((example) =>
  CORE_EXAMPLE_IDS.has(example.id),
)
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

원본: [src/solver-input.ts](../../src/solver-input.ts) · 37줄 · SHA-256: `6fda7923fd60c1b156e308d09ea165e63ef4b00acc3804a5d80ce40b4bc1af57`

```typescript
import type { Project } from './models'

/** Only inputs that affect a calculation belong in this request. */
export function createSolverInput(project: Project) {
  const sweep = project.parameters.find((p) => p.name === project.sweepName)
  return {
    defaultOverview:
      project.mode === 'nonlinear' &&
      (project.nonlinearSearch ?? 'auto') === 'auto',
    source: project.source,
    conditionNorm: project.conditionNorm ?? 'infinity',
    mode: project.mode ?? 'linear',
    nonlinearSearch: project.nonlinearSearch ?? 'auto',
    certifyRoots: project.certifyRoots ?? false,
    inputNoiseSigma: project.inputNoiseSigma ?? 1e-6,
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

## src/account-storage.ts

원본: [src/account-storage.ts](../../src/account-storage.ts) · 21줄 · SHA-256: `dd5120fc9a3b62da6788715d202c5da83c8fbb8a3dae895ac1cbeb3106964764`

```typescript
let accountId: string | null = null
export function selectAccountStorage(user: { id: string; role: string }) {
  accountId = user.id
  // Existing calculator projects belong to the owner, never to a new invited member.
  if (user.role === 'owner') {
    try {
      for (const key of Object.keys(localStorage)) {
        if (!/^polymath-(studio-project|scientific-)/.test(key)) continue
        const target = `ivc-account:${user.id}:${key}`
        if (localStorage.getItem(target) === null)
          localStorage.setItem(target, localStorage.getItem(key)!)
        localStorage.removeItem(key)
      }
    } catch {
      /* Import/Save Project remains available when browser storage is restricted. */
    }
  }
}
export function accountStorageKey(key: string) {
  return accountId ? `ivc-account:${accountId}:${key}` : key
}
```

<a id="source-8"></a>

## server/store.mjs

원본: [server/store.mjs](../../server/store.mjs) · 368줄 · SHA-256: `530cb3f87468ce53e812395e6ca9cf2ae5634a113f3881fca68eb2f88271107e`

```javascript
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, chmodSync } from 'node:fs'
import { dirname } from 'node:path'
import {
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
  createHash,
} from 'node:crypto'
import { promisify } from 'node:util'
const rawDerive = promisify(scrypt)
export const SESSION_MAX_AGE_MS = 30 * 24 * 3600_000
export const SESSION_IDLE_MS = 7 * 24 * 3600_000
let activeHashes = 0
const waiters = []
async function derive(...args) {
  if (activeHashes >= 2) {
    if (waiters.length >= 8) {
      const error = new Error('Busy')
      error.code = 'EBUSY'
      throw error
    }
    await new Promise((resolve) => waiters.push(resolve))
  } else activeHashes++
  try {
    return await rawDerive(...args)
  } finally {
    const next = waiters.shift()
    if (next) next()
    else activeHashes--
  }
}
export const digest = (value) =>
  createHash('sha256').update(value).digest('hex')
export const secret = () => randomBytes(32).toString('base64url')
const validSecret = (value) =>
  typeof value === 'string' && /^[\w-]{43}$/.test(value)
export const normalizeEmail = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : ''
export const validEmail = (value) =>
  value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
export function validPassword(value) {
  return typeof value === 'string' && value.length >= 12 && value.length <= 128
}
export async function hashPassword(password) {
  const salt = randomBytes(24).toString('hex')
  const key = await derive(password, salt, 64, {
    N: 65536,
    r: 8,
    p: 1,
    maxmem: 128 * 1024 * 1024,
  })
  return `scrypt$65536$8$1$${salt}$${key.toString('hex')}`
}
export async function verifyPassword(password, encoded) {
  if (
    typeof password !== 'string' ||
    password.length > 128 ||
    typeof encoded !== 'string'
  )
    return false
  const [kind, n, r, p, salt, expected] = encoded.split('$')
  if (
    kind !== 'scrypt' ||
    n !== '65536' ||
    r !== '8' ||
    p !== '1' ||
    !/^[a-f0-9]{48}$/.test(salt ?? '') ||
    !/^[a-f0-9]{128}$/.test(expected ?? '')
  )
    return false
  const actual = await derive(password, salt, 64, {
    N: 65536,
    r: 8,
    p: 1,
    maxmem: 128 * 1024 * 1024,
  })
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'))
}
export class AccessStore {
  constructor(path, now = () => Date.now()) {
    if (path !== ':memory:') {
      mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
      chmodSync(dirname(path), 0o700)
    }
    this.db = new DatabaseSync(path)
    this.now = now
    if (path !== ':memory:') chmodSync(path, 0o600)
    this.db
      .exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=DELETE; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT, role TEXT NOT NULL CHECK(role IN ('owner','member')), active INTEGER NOT NULL DEFAULT 1, created INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), csrf TEXT NOT NULL, created INTEGER NOT NULL, touched INTEGER NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS invites (hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS invite_flows (hash TEXT PRIMARY KEY, invite_hash TEXT NOT NULL REFERENCES invites(hash) ON DELETE CASCADE, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, time INTEGER NOT NULL, actor TEXT, action TEXT NOT NULL, target TEXT);
      CREATE INDEX IF NOT EXISTS session_user ON sessions(user_id);`)
  }
  query(sql, ...args) {
    return this.db.prepare(sql).get(...args)
  }
  run(sql, ...args) {
    return this.db.prepare(sql).run(...args)
  }
  transaction(fn) {
    this.db.exec('BEGIN IMMEDIATE')
    try {
      const result = fn()
      this.db.exec('COMMIT')
      return result
    } catch (e) {
      this.db.exec('ROLLBACK')
      throw e
    }
  }
  audit(actor, action, target = null) {
    this.run(
      'INSERT INTO audit(time,actor,action,target) VALUES(?,?,?,?)',
      this.now(),
      actor,
      action,
      target,
    )
  }
  async bootstrap(email, password) {
    email = normalizeEmail(email)
    if (!validEmail(email) || !validPassword(password))
      throw Error('유효한 이메일과 12~128자 비밀번호가 필요합니다.')
    if (this.owner())
      throw Error(
        '최고 관리자가 이미 설정되어 있습니다. 초기화로 덮어쓸 수 없습니다.',
      )
    const encoded = await hashPassword(password)
    return this.transaction(() => {
      if (this.owner()) throw Error('최고 관리자가 이미 설정되어 있습니다.')
      const id = randomUUID()
      this.run(
        'INSERT INTO users VALUES(?,?,?,?,?,?)',
        id,
        email,
        encoded,
        'owner',
        1,
        this.now(),
      )
      this.run('INSERT INTO config VALUES(?,?)', 'owner', id)
      this.audit(id, 'owner.bootstrap', id)
      return id
    })
  }
  owner() {
    return this.query("SELECT value FROM config WHERE key='owner'")?.value
  }
  isOwner(user) {
    return (
      user?.role === 'owner' && user.id === this.owner() && user.active === 1
    )
  }
  user(id) {
    return this.query('SELECT * FROM users WHERE id=?', id)
  }
  byEmail(email) {
    return this.query(
      'SELECT * FROM users WHERE email=?',
      normalizeEmail(email),
    )
  }
  allow(key, max, duration) {
    const now = this.now()
    this.run('DELETE FROM limits WHERE expires<=?', now)
    const row = this.query('SELECT * FROM limits WHERE key=?', key)
    if (!row || row.expires <= now) {
      this.run(
        'INSERT OR REPLACE INTO limits VALUES(?,?,?)',
        key,
        1,
        now + duration,
      )
      return true
    }
    if (row.count >= max) return false
    this.run('UPDATE limits SET count=count+1 WHERE key=?', key)
    return true
  }
  session(token, touch = false) {
    if (!/^[\w-]{43}$/.test(token ?? '')) return null
    const row = this.query(
      'SELECT s.*,u.email,u.role,u.active,u.password FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.hash=?',
      digest(token),
    )
    const now = this.now()
    if (
      !row ||
      row.active !== 1 ||
      !row.password ||
      row.expires <= now ||
      row.touched + SESSION_IDLE_MS <= now
    ) {
      if (row) this.run('DELETE FROM sessions WHERE hash=?', row.hash)
      return null
    }
    if (touch && now - row.touched > 60_000) {
      this.run('UPDATE sessions SET touched=? WHERE hash=?', now, row.hash)
      row.touched = now
    }
    return { ...row, id: row.user_id }
  }
  createSession(user) {
    const token = secret(),
      csrf = secret(),
      now = this.now()
    this.run(
      'DELETE FROM sessions WHERE expires<=? OR touched<=?',
      now,
      now - SESSION_IDLE_MS,
    )
    this.run(
      'INSERT INTO sessions VALUES(?,?,?,?,?,?)',
      digest(token),
      user.id,
      csrf,
      now,
      now,
      now + SESSION_MAX_AGE_MS,
    )
    return { token, csrf, expires: now + SESSION_MAX_AGE_MS }
  }
  issueInvite(user, actor, action = 'member.invite') {
    this.run('UPDATE users SET active=1,password=NULL WHERE id=?', user.id)
    this.run('DELETE FROM sessions WHERE user_id=?', user.id)
    this.run('DELETE FROM invites WHERE user_id=?', user.id)
    const token = secret()
    this.run(
      'INSERT INTO invites VALUES(?,?,?)',
      digest(token),
      user.id,
      this.now() + 48 * 3600_000,
    )
    this.audit(actor, action, user.id)
    return token
  }
  invite(email, actor) {
    email = normalizeEmail(email)
    if (!validEmail(email)) throw Error('올바른 이메일을 입력하세요.')
    return this.transaction(() => {
      let user = this.byEmail(email)
      if (user?.role === 'owner')
        throw Error('최고 관리자 계정은 변경할 수 없습니다.')
      if (user?.active && user.password)
        throw Error(
          '이미 활성화된 계정입니다. 비밀번호 재설정은 Reset account를 사용하세요.',
        )
      if (!user) {
        const id = randomUUID()
        this.run(
          'INSERT INTO users VALUES(?,?,?,?,?,?)',
          id,
          email,
          null,
          'member',
          1,
          this.now(),
        )
        user = this.user(id)
      }
      return this.issueInvite(user, actor)
    })
  }
  resetInvite(id, actor) {
    return this.transaction(() => {
      const user = this.user(id)
      if (!user || user.role !== 'member' || id === this.owner())
        throw Error('재설정할 수 없는 계정입니다.')
      return this.issueInvite(user, actor, 'member.reset')
    })
  }
  validInviteHash(hash) {
    const row = this.query(
      'SELECT i.*,u.email,u.active,u.role FROM invites i JOIN users u ON u.id=i.user_id WHERE i.hash=?',
      hash,
    )
    return row &&
      row.expires > this.now() &&
      row.active === 1 &&
      row.role === 'member'
      ? row
      : null
  }
  inviteInfo(token) {
    if (!validSecret(token)) return null
    return this.validInviteHash(digest(token))
  }
  beginInvite(token) {
    const row = this.inviteInfo(token)
    if (!row) return null
    this.run('DELETE FROM invite_flows WHERE expires<=?', this.now())
    const flow = secret(),
      expires = Math.min(row.expires, this.now() + 15 * 60_000)
    this.run(
      'INSERT INTO invite_flows VALUES(?,?,?)',
      digest(flow),
      row.hash,
      expires,
    )
    return { token: flow, email: row.email, expires }
  }
  flowInfo(flow) {
    if (!validSecret(flow)) return null
    const row = this.query(
      'SELECT * FROM invite_flows WHERE hash=?',
      digest(flow),
    )
    if (!row || row.expires <= this.now()) return null
    const invite = this.validInviteHash(row.invite_hash)
    return invite ? { ...invite, flowExpires: row.expires } : null
  }
  async accept(token, email, password, withSession = false) {
    if (!validSecret(token)) return false
    return this.activateInvite(
      digest(token),
      email,
      password,
      undefined,
      withSession,
    )
  }
  async acceptFlow(flow, email, password, withSession = false) {
    const row = this.flowInfo(flow)
    if (!row) return false
    return this.activateInvite(row.hash, email, password, flow, withSession)
  }
  async activateInvite(hash, email, password, flow, withSession) {
    if (!validPassword(password)) return false
    const encoded = await hashPassword(password)
    return this.transaction(() => {
      const row = this.validInviteHash(hash)
      if (
        !row ||
        row.email !== normalizeEmail(email) ||
        (flow && !this.flowInfo(flow))
      )
        return false
      this.run('UPDATE users SET password=? WHERE id=?', encoded, row.user_id)
      this.run('DELETE FROM invites WHERE user_id=?', row.user_id)
      this.run('DELETE FROM sessions WHERE user_id=?', row.user_id)
      this.audit(row.user_id, 'member.activate', row.user_id)
      // Issue within the same transaction: a later reset/revocation deletes this
      // session even if the HTTP response has not been sent yet.
      return withSession ? this.createSession(this.user(row.user_id)) : true
    })
  }
  revoke(id, actor) {
    return this.transaction(() => {
      const user = this.user(id)
      if (!user || user.role !== 'member' || id === this.owner()) return false
      this.run('UPDATE users SET active=0 WHERE id=?', id)
      this.run('DELETE FROM sessions WHERE user_id=?', id)
      this.run('DELETE FROM invites WHERE user_id=?', id)
      this.audit(actor, 'member.revoke', id)
      return true
    })
  }
  close() {
    this.db.close()
  }
}
```

<a id="source-9"></a>

## server/app.mjs

원본: [server/app.mjs](../../server/app.mjs) · 544줄 · SHA-256: `77f6d1e9205c2310919afd72cb7d555a7915e59e8d7c65a7f6a3a86d7551260e`

```javascript
import { createServer } from 'node:http'
import { acceptedHost, proxyRewrittenOrigin } from './runtime-config.mjs'
import { AUTH_VERSION, probePublicAccess } from './sharing.mjs'
import { readFile, realpath } from 'node:fs/promises'
import { resolve, sep, extname } from 'node:path'
import {
  AccessStore,
  digest,
  normalizeEmail,
  validEmail,
  validPassword,
  hashPassword,
  verifyPassword,
  secret,
  SESSION_MAX_AGE_MS,
} from './store.mjs'
const gateway = resolve(import.meta.dirname, 'gateway')
const mime = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.json': 'application/json',
}
function config(input) {
  const url = new URL(input.origin)
  const local = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
  if (
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    !['https:', 'http:'].includes(url.protocol)
  )
    throw Error('APP_ORIGIN은 경로 없는 사이트 원점이어야 합니다.')
  if (url.protocol !== 'https:' && (!local || input.production))
    throw Error('공유 및 운영에는 HTTPS APP_ORIGIN이 필요합니다.')
  return { ...input, origin: url.origin, secure: url.protocol === 'https:' }
}
export async function createAccessServer(input) {
  const cfg = config(input),
    store = input.store ?? new AccessStore(cfg.database)
  if (!store.owner())
    throw Error('먼저 npm run auth:setup으로 최고 관리자를 설정하세요.')
  const dummy = await hashPassword('unused-' + crypto.randomUUID())
  const instance = crypto.randomUUID()
  let sharingCheck = null,
    sharingAt = 0,
    sharingPending = false
  function sharing(force = false) {
    if (
      (!sharingCheck || force || Date.now() - sharingAt > 10_000) &&
      !sharingPending
    ) {
      sharingAt = Date.now()
      sharingPending = true
      sharingCheck = probePublicAccess(cfg.origin, instance, input.fetchSharing)
        .then((result) => ({
          ...result,
          origin: cfg.origin,
          codespaces: !!cfg.codespaces,
          checkedAt: Date.now(),
        }))
        .finally(() => {
          sharingPending = false
        })
    }
    return sharingCheck
  }
  const cookieName = cfg.secure ? '__Host-ivc-session' : 'ivc-local-session'
  const entryCookie = cfg.secure ? '__Host-ivc-entry' : 'ivc-local-entry'
  const flowCookie = cfg.secure
    ? '__Host-ivc-invitation'
    : 'ivc-local-invitation'
  const invitationCookie = (token = '', remove = false) =>
    `${flowCookie}=${token}; HttpOnly; ${cfg.secure ? 'Secure; ' : ''}SameSite=Strict; Path=/; Max-Age=${remove ? 0 : 900}`
  function cookieValue(req, name) {
    const values = (req.headers.cookie ?? '')
      .split(';')
      .map((x) => x.trim())
      .filter((x) => x.startsWith(name + '='))
    return values.length === 1 ? values[0].slice(name.length + 1) : null
  }
  const cookie = (token, remove = false) =>
    `${cookieName}=${token}; HttpOnly; ${cfg.secure ? 'Secure; ' : ''}SameSite=Strict; Path=/; Max-Age=${remove ? 0 : SESSION_MAX_AGE_MS / 1000}`
  function readSession(req) {
    const values = (req.headers.cookie ?? '')
      .split(';')
      .map((x) => x.trim())
      .filter((x) => x.startsWith(cookieName + '='))
    return values.length === 1
      ? store.session(
          values[0].slice(cookieName.length + 1),
          req.method === 'POST' || req.headers['x-ivc-active'] === '1',
        )
      : null
  }
  const server = createServer(async (req, res) => {
    // Public process identity, not an authentication token. Lets probes reject
    // stale/proxy HTML and scripts even when the status API is reachable.
    res.setHeader('X-IVC-Instance', instance)
    res.setHeader('Cache-Control', 'no-store, private, max-age=0')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('Referrer-Policy', 'no-referrer')
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    )
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    )
    if (cfg.secure)
      res.setHeader('Strict-Transport-Security', 'max-age=31536000')
    function json(code, value) {
      const body = Buffer.from(JSON.stringify(value), 'utf8')
      res.writeHead(code, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': body.length,
        'X-IVC-Response': 'json',
      })
      res.end(body)
    }
    function fail(code, message, reason) {
      json(code, { error: message, ...(reason ? { code: reason } : {}) })
    }
    try {
      if (!acceptedHost(req, cfg)) return fail(421, '접속 주소를 확인하세요.')
      const raw = req.url ?? '/'
      if (raw.length > 4096) return fail(414, 'URL이 너무 깁니다.')
      let path
      try {
        path = decodeURIComponent(new URL(raw, cfg.origin).pathname)
      } catch {
        return fail(400, '잘못된 경로입니다.')
      }
      if (
        path.includes('\0') ||
        path.includes('\\') ||
        path.split('/').includes('..')
      )
        return fail(400, '잘못된 경로입니다.')
      // Dedicated application namespace avoids collisions in forwarding layers.
      // Legacy /api routes share the same handlers and authorization checks.
      path = path.replace(/^\/ivc-auth(?=\/)/, '/api')
      const authActions = new Set([
        '/api/login',
        '/api/logout',
        '/api/accept-invite',
        '/api/begin-invite',
        '/api/change-password',
        '/api/admin/invite',
        '/api/admin/revoke',
        '/api/admin/reset',
      ])
      if (req.method === 'POST' && authActions.has(path)) {
        const action = path.slice('/api/'.length)
        res.once('finish', () =>
          console.info(`IVC auth ${action}: HTTP ${res.statusCode}`),
        )
      }
      if (/^\/assets\/[A-Za-z0-9_.-]+$/.test(path) || path === '/solver.wasm') {
        const asset = path.slice(1)
        res.once('finish', () => {
          if (res.statusCode >= 400)
            console.info(`IVC asset ${asset}: HTTP ${res.statusCode}`)
        })
      }
      const user = readSession(req)
      if (!['GET', 'HEAD', 'POST'].includes(req.method))
        return fail(405, '허용되지 않은 요청입니다.')
      if (req.method === 'POST') {
        const token = req.headers['x-csrf-token']
        const entries = (req.headers.cookie ?? '')
          .split(';')
          .map((x) => x.trim())
          .filter((x) => x.startsWith(entryCookie + '='))
        const nonce =
          entries.length === 1 ? entries[0].slice(entryCookie.length + 1) : null
        const sessionProof = user && token === user.csrf
        const entryProof =
          typeof token === 'string' &&
          /^[\w-]{43}$/.test(token) &&
          nonce === token
        const entryAction = [
          '/api/login',
          '/api/begin-invite',
          '/api/accept-invite',
        ].includes(path)
        const validProof = sessionProof || (entryAction && entryProof)
        if (req.headers['sec-fetch-site'] === 'cross-site') {
          console.info('IVC auth blocked: cross-site request')
          return fail(403, '다른 사이트에서 보낸 요청은 허용되지 않습니다.')
        }
        if (
          req.headers.origin !== cfg.origin &&
          !(proxyRewrittenOrigin(req, cfg) && validProof)
        ) {
          // Strip userinfo, paths and query text even from malformed client headers.
          let originLabel = req.headers.origin ? 'invalid' : 'missing'
          try {
            originLabel = new URL(req.headers.origin).origin
          } catch {}
          const siteLabel = [
            'same-origin',
            'same-site',
            'cross-site',
            'none',
          ].includes(req.headers['sec-fetch-site'])
            ? req.headers['sec-fetch-site']
            : 'missing/invalid'
          console.info(
            `IVC auth blocked: origin/proof mismatch (origin=${originLabel}, expected=${cfg.origin}, site=${siteLabel})`,
          )
          return fail(
            403,
            '요청 출처 또는 로그인 보안 토큰을 확인할 수 없습니다. 새로고침하세요.',
            proxyRewrittenOrigin(req, cfg)
              ? entryAction
                ? 'ENTRY_CSRF'
                : 'SESSION_CSRF'
              : 'REQUEST_ORIGIN',
          )
        }
        if (
          !/^application\/json(?:\s*;.*)?$/i.test(
            req.headers['content-type'] ?? '',
          )
        )
          return fail(415, 'JSON 요청이 필요합니다.')
        const chunks = []
        let size = 0
        for await (const chunk of req) {
          size += chunk.length
          if (size > 8192) {
            fail(413, '요청이 너무 큽니다.')
            return
          }
          chunks.push(chunk)
        }
        let body
        try {
          body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        } catch {
          return fail(400, '잘못된 요청입니다.')
        }
        if (!body || typeof body !== 'object' || Array.isArray(body))
          return fail(400, '잘못된 요청입니다.')
        const ip = req.socket.remoteAddress ?? 'unknown',
          email = normalizeEmail(body.email)
        const rate = (key, max = 10) =>
          store.allow(digest(key), max, 15 * 60_000)
        if (path === '/api/login') {
          // A global budget bounds concurrent memory-hard password work; do not trust X-Forwarded-For.
          if (
            !rate('login-ip:' + ip, 30) ||
            !rate('login-email:' + email, 12) ||
            !rate('login-global', 120)
          )
            return fail(429, '로그인 시도가 많습니다. 15분 후 다시 시도하세요.')
          const candidate = store.byEmail(email)
          const ok = await verifyPassword(
            body.password,
            candidate?.password ?? dummy,
          )
          if (!ok || !candidate?.active || !candidate.password) {
            store.audit(null, 'login.denied')
            return fail(401, '이메일 또는 비밀번호를 확인하세요.')
          }
          // Re-read after asynchronous hashing: a concurrent revocation/password change wins.
          const current = store.user(candidate.id)
          if (!current?.active || current.password !== candidate.password)
            return fail(401, '이메일 또는 비밀번호를 확인하세요.')
          if (user) store.run('DELETE FROM sessions WHERE hash=?', user.hash)
          const session = store.createSession(current)
          res.setHeader('Set-Cookie', cookie(session.token))
          store.audit(current.id, 'login.success')
          return json(200, { ok: true })
        }
        if (path === '/api/begin-invite' || path === '/api/accept-invite') {
          if (!rate('invite-ip:' + ip, 15) || !rate('invite-global', 60))
            return fail(429, '시도가 많습니다. 잠시 후 다시 시도하세요.')
          if (user)
            return fail(
              409,
              '이미 로그인되어 있습니다. 초대받은 계정을 설정하려면 먼저 로그아웃하세요.',
              'ALREADY_SIGNED_IN',
            )
          if (path === '/api/begin-invite') {
            const flow = store.beginInvite(body.token)
            if (!flow)
              return fail(
                410,
                '초대가 만료·사용·회수되었거나 새 초대로 교체되었습니다. 관리자에게 새 초대를 요청하세요.',
                'INVITATION_EXPIRED',
              )
            res.setHeader('Set-Cookie', invitationCookie(flow.token))
            return json(200, { email: flow.email, expires: flow.expires })
          }
          if (!validEmail(email) || !validPassword(body.password))
            return fail(400, '이메일과 12~128자 비밀번호를 입력하세요.')
          const flow = cookieValue(req, flowCookie)
          const session = body.token
            ? await store.accept(body.token, email, body.password, true)
            : await store.acceptFlow(flow, email, body.password, true)
          if (!session)
            return fail(
              body.token ? 400 : 410,
              '초대가 유효하지 않거나 만료되었습니다. 링크를 다시 열거나 관리자에게 새 초대를 요청하세요.',
              'INVITATION_EXPIRED',
            )
          res.setHeader('Set-Cookie', [
            cookie(session.token),
            invitationCookie('', true),
          ])
          return json(200, { ok: true })
        }
        if (!user) return fail(401, '로그인이 필요합니다.', 'SESSION_REQUIRED')
        if (req.headers['x-csrf-token'] !== user.csrf)
          return fail(
            403,
            '세션 확인에 실패했습니다. 새로고침하세요.',
            'SESSION_CSRF',
          )
        if (path === '/api/logout') {
          store.run('DELETE FROM sessions WHERE hash=?', user.hash)
          res.setHeader('Set-Cookie', cookie('', true))
          return json(200, { ok: true })
        }
        if (path === '/api/change-password' || path.startsWith('/api/admin/')) {
          if (path.startsWith('/api/admin/') && !store.isOwner(user))
            return fail(403, '최고 관리자 권한이 필요합니다.')
          if (!rate('stepup:' + user.id, 10))
            return fail(429, '확인 시도가 많습니다. 15분 후 다시 시도하세요.')
          if (!(await verifyPassword(body.currentPassword, user.password)))
            return fail(403, '현재 비밀번호를 확인하세요.')
          const current = store.session(
            (req.headers.cookie ?? '')
              .split(';')
              .map((x) => x.trim())
              .find((x) => x.startsWith(cookieName + '='))
              ?.slice(cookieName.length + 1),
          )
          if (!current || current.password !== user.password)
            return fail(401, '다시 로그인하세요.', 'SESSION_REQUIRED')
          if (path === '/api/change-password') {
            if (!validPassword(body.newPassword))
              return fail(400, '새 비밀번호는 12~128자여야 합니다.')
            const encoded = await hashPassword(body.newPassword)
            const fresh = store.user(user.id)
            if (!fresh?.active || fresh.password !== user.password)
              return fail(401, '다시 로그인하세요.', 'SESSION_REQUIRED')
            store.transaction(() => {
              store.run(
                'UPDATE users SET password=? WHERE id=?',
                encoded,
                user.id,
              )
              store.run('DELETE FROM sessions WHERE user_id=?', user.id)
              store.audit(user.id, 'password.change')
            })
            res.setHeader('Set-Cookie', cookie('', true))
            return json(200, { ok: true })
          }
          if (path === '/api/admin/invite' || path === '/api/admin/reset') {
            if (path === '/api/admin/invite' && !validEmail(email))
              return fail(400, '올바른 이메일을 입력하세요.')
            // Connectivity is advisory, not authorization. A server-side probe
            // cannot decide whether another person's browser can connect.
            const fresh = readSession(req)
            if (
              !fresh ||
              !store.isOwner(fresh) ||
              fresh.password !== user.password
            )
              return fail(401, '다시 로그인하세요.', 'SESSION_REQUIRED')
            try {
              const token =
                path === '/api/admin/reset'
                  ? store.resetInvite(
                      typeof body.id === 'string' ? body.id : '',
                      user.id,
                    )
                  : store.invite(email, user.id)
              return json(201, {
                url: `${cfg.origin}/#invite=${token}`,
                code: token,
                expiresHours: 48,
              })
            } catch (e) {
              return fail(409, e.message)
            }
          }
          if (path === '/api/admin/revoke') {
            if (typeof body.id !== 'string' || !store.revoke(body.id, user.id))
              return fail(400, '변경할 수 없는 계정입니다.')
            return json(200, { ok: true })
          }
        }
        return fail(404, '요청을 찾을 수 없습니다.')
      }
      if (path === '/api/csrf') {
        const existing = cookieValue(req, entryCookie)
        const nonce = /^[\w-]{43}$/.test(existing ?? '') ? existing : secret()
        res.setHeader(
          'Set-Cookie',
          `${entryCookie}=${nonce}; HttpOnly; ${cfg.secure ? 'Secure; ' : ''}SameSite=Strict; Path=/; Max-Age=600`,
        )
        return json(200, { csrf: nonce })
      }
      if (path === '/api/status')
        return json(200, {
          service: 'IVC',
          api: '/ivc-auth',
          version: AUTH_VERSION,
          accessControl: 'invite-only',
          instance,
        })
      if (path === '/api/invitation') {
        const token = cookieValue(req, flowCookie)
        const flow = store.flowInfo(token)
        if (!flow) {
          if (token) res.setHeader('Set-Cookie', invitationCookie('', true))
          return token
            ? fail(
                410,
                '계정 설정 시간이 지났거나 초대가 변경되었습니다. 원래 링크나 초대 코드를 다시 여세요.',
                'INVITATION_EXPIRED',
              )
            : json(200, { invitation: null })
        }
        return json(200, {
          invitation: { email: flow.email, expires: flow.flowExpires },
        })
      }
      if (path === '/api/session') {
        if (!user) return fail(401, '로그인이 필요합니다.', 'SESSION_REQUIRED')
        return json(200, {
          user: {
            id: user.id,
            email: user.email,
            role: store.isOwner(user) ? 'owner' : 'member',
          },
          csrf: user.csrf,
          expiresAt: user.expires,
        })
      }
      if (path === '/api/admin/sharing' || path === '/api/admin/users') {
        if (!user) return fail(401, '로그인이 필요합니다.', 'SESSION_REQUIRED')
        if (!store.isOwner(user))
          return fail(403, '최고 관리자 권한이 필요합니다.')
        if (path === '/api/admin/sharing') {
          const result = await sharing(true)
          const fresh = readSession(req)
          if (!fresh || !store.isOwner(fresh))
            return fail(401, '다시 로그인하세요.', 'SESSION_REQUIRED')
          return json(200, result)
        }
        return json(200, {
          users: store.db
            .prepare(
              'SELECT u.id,u.email,u.role,u.active,u.created,u.password IS NOT NULL AS activated,i.expires AS invitationExpires FROM users u LEFT JOIN invites i ON i.user_id=u.id ORDER BY u.created',
            )
            .all()
            .map((row) => ({
              ...row,
              status: !row.active
                ? 'revoked'
                : row.activated
                  ? 'active'
                  : row.invitationExpires > store.now()
                    ? 'invited'
                    : 'expired',
            })),
        })
      }
      if (path.startsWith('/api/')) return fail(404, '요청을 찾을 수 없습니다.')
      let root, file
      if (path === '/' || path === '/index.html') {
        root = gateway
        file = 'index.html'
      } else if (
        path === '/welcome.css' ||
        path === '/welcome.js' ||
        path === '/auth-client.js' ||
        path === '/response.js'
      ) {
        root = gateway
        file = path.slice(1)
      } else {
        if (!user) {
          if (path === '/calculator' || path === '/calculator/') {
            res.writeHead(303, { Location: '/' })
            return res.end()
          }
          return fail(401, '로그인이 필요합니다.')
        }
        root = cfg.dist
        if (path === '/calculator' || path === '/calculator/')
          file = 'index.html'
        else if (
          /^\/assets\/[A-Za-z0-9_.-]+$/.test(path) ||
          path === '/solver.wasm' ||
          path === '/favicon.svg'
        )
          file = path.slice(1)
        else return fail(404, '파일을 찾을 수 없습니다.')
      }
      const resolved = await realpath(resolve(root, file)),
        safeRoot = await realpath(root)
      if (!resolved.startsWith(safeRoot + sep))
        return fail(403, '허용되지 않은 경로입니다.')
      const data = await readFile(resolved)
      res.writeHead(200, {
        'Content-Type': mime[extname(file)] ?? 'application/octet-stream',
        'Content-Length': data.length,
      })
      res.end(req.method === 'HEAD' ? undefined : data)
    } catch (e) {
      if (!res.headersSent)
        fail(
          e.code === 'ENOENT' ? 404 : e.code === 'EBUSY' ? 503 : 500,
          e.code === 'ENOENT'
            ? '파일을 찾을 수 없습니다.'
            : e.code === 'EBUSY'
              ? '요청이 많습니다. 잠시 후 다시 시도하세요.'
              : '요청 처리에 실패했습니다.',
        )
      else res.end()
      // No request bodies, passwords, invitation URLs or session values in logs.
      if (e.code !== 'ENOENT')
        console.error('IVC request failed:', e.code ?? 'internal')
    }
  })
  server.requestTimeout = 15_000
  server.headersTimeout = 10_000
  server.keepAliveTimeout = 5000
  server.maxHeadersCount = 40
  return { server, store }
}
```

<a id="source-10"></a>

## server/start.mjs

원본: [server/start.mjs](../../server/start.mjs) · 44줄 · SHA-256: `f13d8b4b9887b8b8208b9cad27de0467b2c27f3dcecb81998816d9e256b6369b`

```javascript
import { runtimeConfig, runtimePort } from './runtime-config.mjs'
import { createAccessServer } from './app.mjs'
import { AUTH_VERSION } from './sharing.mjs'
import { diagnoseCodespaces } from '../scripts/diagnose-codespaces.mjs'
const args = process.argv.slice(2),
  at = args.indexOf('--port')
if (at >= 0 && !args[at + 1]) throw Error('--port 값이 필요합니다.')
const port = runtimePort(process.env, at >= 0 ? args[at + 1] : undefined)
const cfg = runtimeConfig(process.env, port)
const { server } = await createAccessServer(cfg)
server.listen(port, cfg.host, () => {
  console.log(
    `IVC secure server: ${cfg.origin}\nInternal listener: http://${cfg.host.includes(':') ? `[${cfg.host}]` : cfg.host}:${port}\nAuthentication routes: /ivc-auth (${AUTH_VERSION})\n로그인 후 계산기에 접속할 수 있습니다.${cfg.codespaces ? `\nCodespaces port: ${port} · Port Protocol = HTTP, Port Visibility = Public\n타인 초대 전: 새 터미널에서 PORT=${port} npm run share:codespaces\n404 진단: 새 터미널에서 PORT=${port} npm run diagnose:codespaces` : ''}`,
  )
  if (cfg.codespaces)
    void diagnoseCodespaces({ ...process.env, PORT: String(port) })
      .then((report) => {
        console.log(
          `IVC local check: ${report.local.state} · ${report.local.message}`,
        )
        if (report.external)
          console.log(
            `IVC public check: ${report.external.state}${report.external.status ? ` (HTTP ${report.external.status})` : ''} · ${report.external.message}`,
          )
        if (
          report.local.state === 'ready' &&
          ['blocked', 'unavailable'].includes(report.external?.state)
        )
          console.log(
            `로컬 서버는 정상입니다. Codespaces의 기존 포트 전달을 중지한 뒤 ${port}을 다시 추가하고 HTTP · Public으로 설정한 후 Open in Browser로 여세요.`,
          )
      })
      .catch(() =>
        console.error('IVC connection check: 진단을 완료하지 못했습니다.'),
      )
})
server.on('error', (e) => {
  console.error('IVC server:', e.code)
  if (e.code === 'EADDRINUSE')
    console.error(
      `${port} 포트를 사용하는 기존 서버를 먼저 종료하세요. 현재 새 서버는 시작되지 않았습니다.`,
    )
  process.exitCode = 1
})
```

<a id="source-11"></a>

## server/runtime-config.mjs

원본: [server/runtime-config.mjs](../../server/runtime-config.mjs) · 79줄 · SHA-256: `898e3859c4a8d0b025742560ca513602cc2714f6ff769232b8dae101547a22da`

```javascript
import { resolve } from 'node:path'

export const isCodespaces = (env) =>
  Boolean(env.CODESPACE_NAME && env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN)
export function runtimePort(env, explicit) {
  const port = Number(explicit ?? env.PORT ?? (isCodespaces(env) ? 5180 : 5173))
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw Error('유효한 포트가 필요합니다.')
  return port
}
/** Only trusted process configuration selects the public origin/proxy hosts. */
export function runtimeConfig(env, port) {
  const codespaces = isCodespaces(env)
  const origin =
    env.APP_ORIGIN ??
    (codespaces
      ? `https://${env.CODESPACE_NAME}-${port}.${env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`
      : `http://127.0.0.1:${port}`)
  // Codespaces forwards through its container network. Local/production installs
  // keep the loopback default; an explicit operator override still wins.
  const host = env.HOST ?? (codespaces ? '0.0.0.0' : '127.0.0.1')
  if (env.NODE_ENV === 'production' && !env.APP_ORIGIN)
    throw Error('운영 APP_ORIGIN을 명시하세요.')
  if (
    origin.startsWith('http:') &&
    !['127.0.0.1', 'localhost', '::1'].includes(host)
  )
    throw Error(
      'HTTP 개발 서버는 loopback에서만 열 수 있습니다. HTTPS 프록시와 APP_ORIGIN을 설정하세요.',
    )
  return {
    origin,
    host,
    codespaces,
    production: env.NODE_ENV === 'production',
    proxyHost: env.IVC_PROXY_HOST,
    // Codespaces replaces Host with an internal loopback authority.
    // Forwarded headers are never used to choose trusted hosts or origins.
    loopbackProxyHosts: codespaces
      ? [
          'localhost',
          '127.0.0.1',
          '[::1]',
          ...(host === '0.0.0.0' ? ['0.0.0.0'] : []),
        ].flatMap((host) => [host, `${host}:${port}`])
      : [],
    database: resolve(env.IVC_DATA_DIR ?? '.ivc-data', 'access.sqlite'),
    dist: resolve('dist'),
  }
}
export function acceptedHost(req, cfg) {
  const host = req.headers.host
  if (
    host === new URL(cfg.origin).host ||
    (cfg.proxyHost && host === cfg.proxyHost)
  )
    return true
  const peer = req.socket.remoteAddress
  return (
    ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(peer) &&
    (cfg.loopbackProxyHosts ?? []).includes(host)
  )
}

/** A proxy-origin exception never suffices on its own: callers also verify CSRF. */
export function proxyRewrittenOrigin(req, cfg) {
  const peer = req.socket.remoteAddress
  if (
    !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(peer) ||
    !cfg.loopbackProxyHosts?.length ||
    !acceptedHost(req, cfg)
  )
    return false
  const origin = req.headers.origin
  if (!origin) return req.headers['sec-fetch-site'] === 'same-origin'
  return cfg.loopbackProxyHosts.some(
    (host) => origin === `http://${host}` || origin === `https://${host}`,
  )
}
```

<a id="source-12"></a>

## server/sharing.mjs

원본: [server/sharing.mjs](../../server/sharing.mjs) · 202줄 · SHA-256: `a7681af23e42f468bf05ea2dcd137bb677d10a6a1653900b9b2be52a996111e6`

```javascript
import { isIP } from 'node:net'

export const AUTH_VERSION = 'auth-v4'
export function localOrigin(origin) {
  const host = new URL(origin).hostname.replace(/^\[|\]$/g, '')
  return (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === '::1' ||
    (isIP(host) === 4 && host.startsWith('127.'))
  )
}

async function readBounded(response, limit) {
  const reader = response.body?.getReader(),
    chunks = []
  let size = 0
  if (reader)
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > limit) {
        await reader.cancel()
        throw Error('response size')
      }
      chunks.push(value)
    }
  return Buffer.concat(chunks).toString('utf8')
}
const scriptContent = (text) => text.trim().length > 0 && !/^\s*</.test(text)

/** Checks from this server's network only; cannot certify another user's route. */
export async function probePublicAccess(origin, instance, fetchImpl = fetch) {
  if (localOrigin(origin))
    return {
      state: 'local',
      reachable: false,
      message:
        '현재 주소는 이 컴퓨터에서만 열립니다. 다른 사람과 공유하려면 공개 HTTPS 주소가 필요합니다.',
    }
  const checks = [],
    signal = AbortSignal.timeout(6500)
  const get = (path, accept) =>
    fetchImpl(new URL(path, origin), {
      redirect: 'manual',
      credentials: 'omit',
      cache: 'no-store',
      signal,
      headers: { Accept: accept, 'Cache-Control': 'no-cache' },
    })
  function blocked(path, status) {
    return {
      state: 'blocked',
      reachable: false,
      path,
      status,
      checks,
      message:
        status >= 300 && status < 400
          ? `공유 주소의 ${path} 요청이 다른 화면으로 이동합니다. 실행 중인 포트의 Public 설정과 전달 주소를 확인하세요.`
          : `공유 주소의 ${path} 요청이 HTTP ${status}로 실패했습니다. 포트 전달 · HTTP 프로토콜 · 현재 주소를 확인하세요.`,
    }
  }
  try {
    const response = await get('/ivc-auth/status', 'application/json')
    if (!response.ok) {
      await response.body?.cancel()
      return blocked('/ivc-auth/status', response.status)
    }
    let data
    try {
      data = JSON.parse(await readBounded(response, 16384))
    } catch {
      return {
        state: 'unverified',
        reachable: false,
        path: '/ivc-auth/status',
        checks,
        message:
          '공유 주소가 IVC 상태 응답을 반환하지 않습니다. 다른 서버나 프록시 응답인지 확인하세요.',
      }
    }
    if (data?.service !== 'IVC' || typeof data.instance !== 'string')
      return {
        state: 'unverified',
        reachable: false,
        path: '/ivc-auth/status',
        checks,
        message:
          '서버 연결 검사 응답에서 IVC 정보를 확인하지 못했습니다. 이 결과는 관리자 초대 발급을 차단하지 않습니다.',
      }
    if (data.instance !== instance)
      return {
        state: 'mismatch',
        reachable: false,
        path: '/ivc-auth/status',
        checks,
        message:
          '공유 주소가 현재 서버와 다릅니다. APP_ORIGIN과 실행 중인 서버를 확인하세요.',
      }
    checks.push({ path: '/ivc-auth/status', status: response.status, ok: true })
    // Verify the actual page and every module needed by the public login form.
    // One deadline covers all requests; no cookies, redirects or arbitrary URLs.
    const targets = [
      {
        path: '/',
        mime: /^text\/html\b/i,
        content: (text) => text.includes('id="login-form"'),
      },
      {
        path: '/welcome.js',
        mime: /^(?:text|application)\/javascript\b/i,
        content: scriptContent,
      },
      {
        path: '/welcome.css',
        mime: /^text\/css\b/i,
        content: (text) => text.trim().length > 0,
      },
      {
        path: '/response.js',
        mime: /^(?:text|application)\/javascript\b/i,
        content: scriptContent,
      },
      {
        path: '/auth-client.js',
        mime: /^(?:text|application)\/javascript\b/i,
        content: scriptContent,
      },
    ]
    const outcomes = await Promise.allSettled(
      targets.map(async (target) => {
        const r = await get(
          target.path,
          target.path === '/' ? 'text/html' : '*/*',
        )
        if (!r.ok) {
          await r.body?.cancel()
          return {
            path: target.path,
            status: r.status,
            ok: false,
            issue: 'http',
          }
        }
        const text = await readBounded(r, 65536)
        const identity = r.headers.get('x-ivc-instance')
        const issue =
          identity && identity !== instance
            ? 'instance'
            : !target.mime.test(r.headers.get('content-type') ?? '')
              ? 'mime'
              : !target.content(text)
                ? 'content'
                : undefined
        const ok = !issue
        return {
          path: target.path,
          status: r.status,
          ok,
          ...(issue ? { issue } : {}),
          ...(!identity ? { note: 'instance-header-missing' } : {}),
        }
      }),
    )
    for (let i = 0; i < outcomes.length; i++) {
      const outcome = outcomes[i]
      checks.push(
        outcome.status === 'fulfilled'
          ? outcome.value
          : { path: targets[i].path, ok: false, issue: 'connection' },
      )
    }
    const failed = checks.find((check) => !check.ok)
    if (failed) {
      return {
        state: 'partial',
        reachable: false,
        path: failed.path,
        ...(failed.status ? { status: failed.status } : {}),
        checks,
        message: `현재 IVC 상태 API에 연결했습니다. ${failed.path} 페이지·파일 검사는 완료하지 못했지만, 관리자 초대 발급과 계정 재설정은 사용할 수 있습니다. 아래 상세 결과를 참고하고 상대방 브라우저에서 초대 링크를 확인하세요.`,
      }
    }
    return {
      state: 'ready',
      reachable: true,
      checks,
      message:
        '서버에서 공유 주소의 상태 API·소개 화면·로그인 파일을 확인했습니다. 다른 사용자의 브라우저·네트워크 접속은 별도 확인이 필요합니다.',
    }
  } catch {
    return {
      state: 'unavailable',
      reachable: false,
      checks,
      message:
        '서버에서 공유 주소 연결을 확인하지 못했습니다. Codespace 실행 상태·포트 전달·현재 HTTPS 주소를 확인하세요.',
    }
  }
}
```

<a id="source-13"></a>

## scripts/share-codespaces.mjs

원본: [scripts/share-codespaces.mjs](../../scripts/share-codespaces.mjs) · 83줄 · SHA-256: `64491dee7c031005711cdad78d04cb5d2cece896598625c589c16f2cd72065a6`

```javascript
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { runtimeConfig, runtimePort } from '../server/runtime-config.mjs'
import { AUTH_VERSION, probePublicAccess } from '../server/sharing.mjs'

/** Explicit operator action; never opens a port automatically at server startup. */
export async function shareCodespaces(
  env = process.env,
  run = spawnSync,
  fetchImpl = fetch,
) {
  const port = runtimePort(env)
  const cfg = runtimeConfig(env, port)
  if (!cfg.codespaces)
    throw Error('이 명령은 실행 중인 Codespaces 터미널에서 사용하세요.')
  if (!/^[a-zA-Z0-9-]+$/.test(env.CODESPACE_NAME))
    throw Error('Codespace 이름을 확인하세요.')
  const local = `http://127.0.0.1:${port}`
  const options = {
    redirect: 'manual',
    credentials: 'omit',
    signal: AbortSignal.timeout(4000),
  }
  let status
  try {
    const response = await fetchImpl(local + '/ivc-auth/status', options)
    if (!response.ok) throw Error('status')
    status = await response.json()
    const protectedFile = await fetchImpl(local + '/solver.wasm', options)
    await protectedFile.body?.cancel()
    if (
      status.service !== 'IVC' ||
      status.version !== AUTH_VERSION ||
      status.accessControl !== 'invite-only' ||
      typeof status.instance !== 'string' ||
      protectedFile.status !== 401
    )
      throw Error('guard')
  } catch {
    throw Error(
      `${port} 포트에서 최신 IVC 보호 서버를 확인하지 못했습니다. 먼저 npm run dev -- --port ${port}를 실행하세요. 공개 설정은 변경하지 않았습니다.`,
    )
  }
  const result = run(
    'gh',
    [
      'codespace',
      'ports',
      'visibility',
      `${port}:public`,
      '--codespace',
      env.CODESPACE_NAME,
    ],
    { stdio: 'inherit' },
  )
  if (result.error || result.status !== 0)
    throw Error(
      `GitHub에서 Public 설정을 적용하지 못했습니다. Ports → ${port} → Port Visibility → Public으로 변경하세요. 조직 정책이 제한하면 상시 HTTPS 서버에 배포해야 합니다.`,
    )
  const probe = await probePublicAccess(cfg.origin, status.instance, fetchImpl)
  if (probe.state === 'partial')
    console.warn(`페이지 확인 미완료: ${probe.message}`)
  else if (!probe.reachable)
    throw Error(
      probe.message +
        ' 설정 반영 후 Manage Access → Check connection으로 다시 확인하세요.',
    )
  return cfg.origin
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const origin = await shareCodespaces()
    console.log(
      `포트 Public 설정 적용: ${origin}\nManage Access에서 초대 링크·코드를 만들고 상대방 브라우저에서 접속을 확인하세요. 계산기는 IVC 로그인으로 보호됩니다.\nCodespace가 정지되면 주소도 중단됩니다.`,
    )
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
```

<a id="source-14"></a>

## scripts/diagnose-codespaces.mjs

원본: [scripts/diagnose-codespaces.mjs](../../scripts/diagnose-codespaces.mjs) · 113줄 · SHA-256: `e44281c46cd14856e7fce06966377fc13cb0629fc2734f5c25f96870feb74c0d`

```javascript
import { pathToFileURL } from 'node:url'
import { runtimeConfig, runtimePort } from '../server/runtime-config.mjs'
import { AUTH_VERSION, probePublicAccess } from '../server/sharing.mjs'

/** Read-only diagnostics; never send cookies or change port visibility. */
export async function diagnoseCodespaces(env = process.env, fetchImpl = fetch) {
  const port = runtimePort(env)
  const cfg = runtimeConfig(env, port)
  const url = new URL(cfg.origin)
  if (
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  )
    throw Error('APP_ORIGIN은 경로·인증 정보 없는 원점이어야 합니다.')
  const base = `http://127.0.0.1:${port}`
  const get = (path, method = 'GET') =>
    fetchImpl(base + path, {
      method,
      redirect: 'manual',
      credentials: 'omit',
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    })
  const result = {
    origin: url.origin,
    port,
    local: { state: 'unavailable', message: '' },
    external: null,
  }
  try {
    const status = await get('/ivc-auth/status')
    // Public state is small. Never include a proxy response body in output.
    const text = await status.text()
    if (!status.ok || text.length > 16384) throw Error('status')
    const data = JSON.parse(text)
    if (
      data.service !== 'IVC' ||
      data.version !== AUTH_VERSION ||
      data.accessControl !== 'invite-only' ||
      typeof data.instance !== 'string'
    )
      throw Error('server')
    const welcome = await get('/', 'HEAD')
    if (
      !welcome.ok ||
      !welcome.headers.get('content-type')?.includes('text/html')
    ) {
      result.local = {
        state: 'gateway-error',
        message: `상태 API는 정상이나 소개 화면에 문제가 있습니다(HTTP ${welcome.status}). server/gateway 파일과 실행 경로를 확인하세요.`,
      }
      return result
    }
    const protectedFile = await get('/solver.wasm')
    await protectedFile.body?.cancel()
    if (protectedFile.status !== 401) {
      result.local = {
        state: 'unprotected',
        message:
          '익명 계산 파일 차단을 확인하지 못했습니다. 해당 포트를 공유하지 말고 IVC 보호 서버를 실행하세요.',
      }
      return result
    }
    result.local = {
      state: 'ready',
      message: '로컬 IVC · 소개 화면 · 익명 계산 파일 차단 정상',
    }
    result.external = await probePublicAccess(
      cfg.origin,
      data.instance,
      fetchImpl,
    )
    return result
  } catch {
    result.local.message = `${port} 포트에서 최신 IVC 상태 응답을 받지 못했습니다. 서버가 실행 중인지, 다른 서버가 포트를 차지하는지 확인하세요.`
    return result
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const report = await diagnoseCodespaces()
    console.log(
      `IVC connection check\nSite: ${report.origin}\nLocal: ${report.local.state} · ${report.local.message}`,
    )
    if (report.external)
      console.log(
        `Public: ${report.external.state}${report.external.status ? ` (HTTP ${report.external.status})` : ''} · ${report.external.message}`,
      )
    if (
      report.local.state === 'ready' &&
      ['blocked', 'unavailable'].includes(report.external?.state)
    )
      console.log(
        `로컬 서버는 정상입니다. Codespaces Ports에서 ${report.port} 전달 항목을 중지한 뒤 다시 추가하고, Port Protocol=HTTP · Port Visibility=Public으로 설정한 뒤 Open in Browser로 여세요. Codespace 재시작·주소 변경 여부도 확인하세요.`,
      )
    if (
      report.local.state !== 'ready' ||
      !['ready', 'partial'].includes(report.external?.state)
    )
      process.exitCode = 1
  } catch {
    console.error(
      '진단 설정을 확인하세요. PORT와 APP_ORIGIN은 실행 중인 서버와 같아야 합니다.',
    )
    process.exitCode = 1
  }
}
```

<a id="source-15"></a>

## server/setup.mjs

원본: [server/setup.mjs](../../server/setup.mjs) · 63줄 · SHA-256: `5bf05e966cf1136ed0c506b7709c60bb15404643ff00bbcfc07a70224c3da8a4`

```javascript
import { resolve } from 'node:path'
import { AccessStore } from './store.mjs'
const email = process.env.IVC_ADMIN_EMAIL ?? 'eerrtteerrt12@gmail.com'
const store = new AccessStore(
  resolve(process.env.IVC_DATA_DIR ?? '.ivc-data', 'access.sqlite'),
)
if (store.owner()) {
  console.error(
    '최고 관리자가 이미 설정되어 있습니다. 기존 계정으로 로그인하세요.',
  )
  store.close()
  process.exit(1)
}
let password = process.env.IVC_ADMIN_PASSWORD
if (!password) {
  if (!process.stdin.isTTY)
    throw Error(
      '터미널에서 실행하거나 IVC_ADMIN_PASSWORD 서버 비밀값을 설정하세요.',
    )
  // Raw mode prevents terminal echo and avoids putting credentials in command history.
  async function readSecret(prompt) {
    process.stdout.write(prompt)
    process.stdin.setRawMode(true)
    process.stdin.resume()
    let value = ''
    return new Promise((resolve, reject) => {
      const onData = (chunk) => {
        for (const char of chunk.toString()) {
          if (char === '\u0003') {
            cleanup()
            reject(Error('설정을 취소했습니다.'))
            return
          }
          if (char === '\r' || char === '\n') {
            cleanup()
            resolve(value)
            return
          }
          if (char === '\u007f' || char === '\b') value = value.slice(0, -1)
          else if (char >= ' ' && value.length < 128) value += char
        }
      }
      function cleanup() {
        process.stdin.off('data', onData)
        process.stdin.setRawMode(false)
        process.stdin.pause()
        process.stdout.write('\n')
      }
      process.stdin.on('data', onData)
    })
  }
  password = await readSecret(`${email} 최고 관리자 비밀번호 (입력 숨김): `)
  const confirm = await readSecret('비밀번호 확인: ')
  if (password !== confirm) throw Error('비밀번호가 일치하지 않습니다.')
}
try {
  await store.bootstrap(email, password)
  console.log('최고 관리자 설정 완료. 비밀번호 원문은 저장하지 않았습니다.')
} finally {
  password = undefined
  delete process.env.IVC_ADMIN_PASSWORD
  store.close()
}
```

<a id="source-16"></a>

## server/dev.mjs

원본: [server/dev.mjs](../../server/dev.mjs) · 5줄 · SHA-256: `9cf34dab279a7fae9781b6f7ab7cf258746956b6f2741f6e8dabc895cebe52bf`

```javascript
import { spawnSync } from 'node:child_process'
// The public development command uses the same access gate as deployment.
const built = spawnSync('npm', ['run', 'build'], { stdio: 'inherit' })
if (built.status !== 0) process.exit(built.status ?? 1)
await import('./start.mjs')
```

<a id="source-17"></a>

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

<a id="source-18"></a>

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

<a id="source-19"></a>

## src/engine/sweep.ts

원본: [src/engine/sweep.ts](../../src/engine/sweep.ts) · 182줄 · SHA-256: `ea140ec8de02e2bc5e695630a52088bbfffad2e2d95978c21f491eb08e331d43`

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
  /** Base rendering samples, supplemented by the tabulated vertices. */
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

/** Supplement the base graph with every table/CSV vertex, preserving exact samples. */
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
    const dataset = parameterValues(
      min,
      max,
      step,
      settings.maxPoints ?? MAX_DATASET_POINTS,
    ).map(pointAt)
    return {
      // Every sample marker must also be a vertex of the rendered polyline.
      sweep: [...cache.values()].sort((a, b) => a.parameter - b.parameter),
      dataset,
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

<a id="source-20"></a>

## src/engine/branches.ts

원본: [src/engine/branches.ts](../../src/engine/branches.ts) · 516줄 · SHA-256: `f5215e6c3f55cff594846186ca1ad9b312b70f62e237ce3d6874d317e4f6e9e6`

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
  for (const p of targets) {
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

<a id="source-21"></a>

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

<a id="source-22"></a>

## src/engine/simulation-panels.ts

원본: [src/engine/simulation-panels.ts](../../src/engine/simulation-panels.ts) · 545줄 · SHA-256: `9a89deffb65dbb394e64b808cd24c9d80fd1d82b4bf01f8c92d77b3a18d3068e`

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
                  model.jacobian?.(seed.values!, {
                    ...referenceParameters,
                    [sweep.name]: seed.parameter,
                  })?.[0]?.[0],
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
          // Incorporate a locally verified terminal root once, when the
          // reference curve is built. Slider updates continue to reuse it.
          if (sweep)
            for (const event of curve.events ?? []) {
              const t = event.tangency
              if (
                !t?.verified ||
                event.kind === 'contact' ||
                t.geometry === 'degenerate'
              )
                continue
              const p = t.parameterStar
              const valid = curve.sweep.filter(
                (point) =>
                  point.values && (point.parameter - p) * event.direction <= 0,
              )
              valid.sort(
                (a, b) => Math.abs(a.parameter - p) - Math.abs(b.parameter - p),
              )
              const near = valid[0]
              if (!near?.values) continue
              try {
                const target = solveNear(
                  source,
                  { ...referenceParameters, [sweep.name]: p },
                  near.values,
                  { computeCondition: false },
                )
                const scale = Math.max(
                  Number.MIN_VALUE,
                  ...near.values.map(Math.abs),
                  ...t.valuesStar.map(Math.abs),
                )
                const gap = Math.max(
                  ...near.values.map((v, i) => Math.abs(v - t.valuesStar[i])),
                )
                if (
                  target.values.some(
                    (v, i) =>
                      Math.abs(v - t.valuesStar[i]) >
                      Math.max(gap, 128 * Number.EPSILON * scale),
                  )
                )
                  continue
                const lo = Math.min(p, near.parameter),
                  hi = Math.max(p, near.parameter)
                curve.sweep = curve.sweep.filter(
                  (point) =>
                    point.parameter !== p &&
                    (point.values ||
                      point.parameter < lo ||
                      point.parameter > hi),
                )
                curve.sweep.push({ parameter: p, values: [...t.valuesStar] })
                curve.sweep.sort((a, b) => a.parameter - b.parameter)
              } catch {
                /* A marker may remain separate if the original model cannot confirm the endpoint. */
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
        a.tangency?.geometry !== 'degenerate' &&
        typeof a.tangency?.bifurcationOrder === 'number' &&
        a.tangency.bifurcationOrder % 2 === 0
      const nonFold = [a, b].some(
        (ev) =>
          ev.tangency?.verified &&
          (ev.tangency.geometry === 'degenerate' ||
            (typeof ev.tangency.bifurcationOrder === 'number' &&
              ev.tangency.bifurcationOrder % 2 === 1)),
      )
      if (!nonFold && ((sameParam && sameValues) || sameFold) && converging) {
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

<a id="source-23"></a>

## src/engine/manual-simulation.ts

원본: [src/engine/manual-simulation.ts](../../src/engine/manual-simulation.ts) · 68줄 · SHA-256: `e8913afb37db6d6f55bca02750522ead9817f288b13cac6007f09de33062f26f`

```typescript
import { ModelError } from './index'
import type {
  ConditionNorm,
  SimulationAnchor,
  SolveResult,
  SolverOptions,
} from './index'
import type { NearSolver } from './branches'
import type { SweepSettings } from './sweep'
import { compileNonlinear, manualEquationSource } from './nonlinear-parser'
import { createSimulationPanelComputer } from './simulation-panels'

/** Manual Newton chooses a root once. Parameter exploration then follows that
 * saved root, rather than repeatedly applying the original initial guess. */
export function createManualSimulation(
  solve: (
    source: string,
    parameters: Record<string, number>,
    options?: SolverOptions,
  ) => SolveResult,
  solveNear: NearSolver,
) {
  const boundedNear: NearSolver = (source, parameters, seed, options) => {
    const result = solveNear(source, parameters, seed, options)
    const bounds = compileNonlinear(source, Object.keys(parameters)).bounds
    if (
      bounds &&
      (result.values[0] < bounds.min || result.values[0] > bounds.max)
    )
      throw new ModelError('선택한 해가 지정한 미지수 범위를 벗어났습니다.')
    return result
  }
  const compute = createSimulationPanelComputer(boundedNear)
  let saved: { key: string; anchor: SimulationAnchor } | undefined
  let serial = 0
  return (
    source: string,
    parameters: Record<string, number>,
    sweep: SweepSettings | null,
    conditionNorm: ConditionNorm = 'infinity',
    restart = false,
  ) => {
    const names = Object.keys(parameters).sort()
    const key = JSON.stringify([source, names])
    if (restart || saved?.key !== key) {
      const result = solve(source, parameters, { conditionNorm })
      saved = {
        key,
        anchor: {
          id: `manual-${++serial}`,
          label: '초기값으로 선택한 해',
          variables: [...result.variables],
          values: [...result.values],
          parameters: { ...parameters },
        },
      }
    }
    const anchor = saved!.anchor
    const [panel] = compute(
      manualEquationSource(source, names),
      parameters,
      sweep,
      [anchor],
      conditionNorm,
    )
    return { anchor, panel }
  }
}
```

<a id="source-24"></a>

## src/use-interaction-viewport.ts

원본: [src/use-interaction-viewport.ts](../../src/use-interaction-viewport.ts) · 68줄 · SHA-256: `cad0b802a913d2d397ab9d4b07f6255fbb2c4c53257a307c8750268fd2674f30`

```typescript
import { useEffect, useLayoutEffect, useRef } from 'react'

/** Keep a parameter edit in place through its asynchronous reply. Explicit
 * wheel/touch/keyboard scrolling cancels the reservation immediately. */
export function useInteractionViewport(busy: boolean) {
  const saved = useRef<{
    x: number
    y: number
    area: HTMLElement | null
    top: number
    until: number
  } | null>(null)
  useEffect(() => {
    const cancel = () => {
      saved.current = null
    }
    const key = (e: KeyboardEvent) => {
      if (
        [
          'PageDown',
          'PageUp',
          'Home',
          'End',
          'ArrowDown',
          'ArrowUp',
          ' ',
        ].includes(e.key)
      )
        cancel()
    }
    window.addEventListener('wheel', cancel, { passive: true })
    window.addEventListener('touchmove', cancel, { passive: true })
    window.addEventListener('keydown', key)
    return () => {
      window.removeEventListener('wheel', cancel)
      window.removeEventListener('touchmove', cancel)
      window.removeEventListener('keydown', key)
    }
  }, [])
  useLayoutEffect(() => {
    const at = saved.current
    if (!at) return
    if (performance.now() > at.until) {
      saved.current = null
      return
    }
    window.scrollTo({ left: at.x, top: at.y, behavior: 'instant' })
    if (at.area?.isConnected) at.area.scrollTop = at.top
    // The pending state starts in a passive effect, so keep the reservation
    // through the first render and release only after a settled animation frame.
    if (!busy) {
      const frame = requestAnimationFrame(() => {
        if (saved.current === at) saved.current = null
      })
      return () => cancelAnimationFrame(frame)
    }
  })
  return () => {
    const area = document.querySelector<HTMLElement>('.results-expanded')
    saved.current = {
      x: window.scrollX,
      y: window.scrollY,
      area,
      top: area?.scrollTop ?? 0,
      until: performance.now() + 10000,
    }
  }
}
```

<a id="source-25"></a>

## src/engine/default-overview.ts

원본: [src/engine/default-overview.ts](../../src/engine/default-overview.ts) · 117줄 · SHA-256: `382b854d5522e48b4eed91f150b76407ab32261b1fb064ae4d4a98e476ec0e5c`

```typescript
import type { AutomaticSolver } from './automatic'
import type { SimulationAnchor, SimulationPanel } from './index'
import type { SweepSettings } from './sweep'
import { createSimulationPanelComputer } from './simulation-panels'
import { sameComputedRoot } from './root-comparison'

/** Bounded discovery at several parameter positions, then immutable anchored
 * sweeps. This is an overview of discovered branches, not a completeness proof. */
export function createDefaultOverview(search: AutomaticSolver) {
  const compute = createSimulationPanelComputer(search.solveNear)
  const cache = new Map<string, SimulationAnchor[]>()
  return (
    source: string,
    parameters: Record<string, number>,
    sweep: SweepSettings | null,
    options: Parameters<AutomaticSolver>[2],
    current?: ReturnType<AutomaticSolver>,
  ): { anchors: SimulationAnchor[]; panels: SimulationPanel[] } => {
    const key = JSON.stringify([
      source,
      Object.entries(parameters)
        .filter(([k]) => k !== sweep?.name)
        .sort(),
      sweep,
      options?.searchBounds,
      options?.variableBounds,
    ])
    let anchors = cache.get(key)
    if (!anchors) {
      anchors = []
      const start = performance.now()
      const candidates = [
        parameters,
        ...(sweep
          ? [0.5, 0, 1, 0.25, 0.75].map((t) => ({
              ...parameters,
              [sweep.name]: sweep.min * (1 - t) + sweep.max * t,
            }))
          : []),
      ]
      for (let i = 0; i < candidates.length; i++) {
        if (anchors.length >= 6 || (i > 0 && performance.now() - start > 900))
          break
        const at = candidates[i]
        try {
          const found =
            i === 0 && current
              ? current
              : search(source, at, { ...options, certifyRoots: false })
          const existing = compute(source, at, sweep, anchors)
          for (const root of found.solutions) {
            if (anchors.length >= 6) break
            if (
              existing.some((p) => p.result && sameComputedRoot(p.result, root))
            )
              continue
            if (sweep && root.condition === Infinity) continue
            anchors.push({
              id: crypto.randomUUID(),
              label: `해 ${anchors.length + 1}`,
              variables: [...root.variables],
              values: [...root.values],
              parameters: { ...at },
            })
          }
        } catch {
          /* Invalid domain at one position does not invalidate others. */
        }
      }
      if (!anchors.length && current)
        for (const root of current.solutions.slice(0, 6))
          anchors.push({
            id: crypto.randomUUID(),
            label: `해 ${anchors.length + 1}`,
            variables: [...root.variables],
            values: [...root.values],
            parameters: { ...parameters },
          })
      if (cache.size >= 6) cache.delete(cache.keys().next().value!)
      cache.set(key, anchors)
    }
    let panels = compute(
      source,
      parameters,
      sweep,
      anchors,
      options?.conditionNorm,
    )
    // A narrow branch may lie between the initial probe positions. Include
    // newly discovered roots without replacing any existing reference curve.
    if (current)
      for (const root of current.solutions) {
        if (anchors.length >= 6) break
        if (panels.some((p) => p.result && sameComputedRoot(p.result, root)))
          continue
        anchors = [
          ...anchors,
          {
            id: crypto.randomUUID(),
            label: `해 ${anchors.length + 1}`,
            variables: [...root.variables],
            values: [...root.values],
            parameters: { ...parameters },
          },
        ]
        cache.set(key, anchors)
        panels = compute(
          source,
          parameters,
          sweep,
          anchors,
          options?.conditionNorm,
        )
      }
    return { anchors, panels }
  }
}
```

<a id="source-26"></a>

## src/engine/solver.worker.ts

원본: [src/engine/solver.worker.ts](../../src/engine/solver.worker.ts) · 407줄 · SHA-256: `044d836a05e74f3c3d2c3812524fa105fcfa4770e9f36a05fdc6ec716126edf2`

```typescript
import { compileNonlinear } from './nonlinear-parser'
import { createManualSimulation } from './manual-simulation'
import { createDefaultOverview } from './default-overview'
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
  inputNoiseSigma?: number
  searchBounds?: { min: number; max: number }
  variableBounds?: VariableBounds
  solutionIndex?: number
  simulationAnchors?: SimulationAnchor[]
  selectedAnchor?: SimulationAnchor
  // Interactions may display current anchored values first while the full
  // discovery list is refreshed after a short quiet period.
  defaultOverview?: boolean
  restartBranch?: boolean
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
let computeManual: ReturnType<typeof createManualSimulation> | undefined
let computeOverview: ReturnType<typeof createDefaultOverview> | undefined
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
    request.inputNoiseSigma ?? 1e-6,
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
    request.inputNoiseSigma ?? 1e-6,
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
    inputNoiseSigma,
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
        const overview =
          request.defaultOverview && computeOverview
            ? computeOverview(source, parameters, sweep, {
                conditionNorm,
                searchBounds,
                variableBounds,
              })
            : undefined
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
          self.postMessage({
            id,
            ok: true,
            discoveryPending: true,
            payload,
            overview,
          })
        } else {
          self.postMessage({
            id,
            ok: false,
            discoveryPending: true,
            overview,
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
          inputNoiseSigma,
          conditionNorm,
          searchBounds,
          variableBounds,
        })
        if (searches.size >= 8) searches.delete(searches.keys().next().value!)
        searches.set(key, found)
      }
      const overview = request.defaultOverview
        ? (computeOverview ??= createDefaultOverview(search))(
            source,
            parameters,
            sweep,
            { conditionNorm, searchBounds, variableBounds },
            found,
          )
        : undefined
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
          overview,
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
        overview,
        ...(adoptedAnchor ? { adoptedAnchor } : {}),
      })
      return
    }
    const solve = await (mode === 'nonlinear' ? nonlinearReady : ready)
    if (work.generation !== generation) return
    if (
      mode === 'nonlinear' &&
      sweep &&
      compileNonlinear(source, Object.keys(parameters)).variables.length
    ) {
      const automatic = await (automaticReady ??= createAutomaticSolver())
      if (work.generation !== generation) return
      computeManual ??= createManualSimulation(solve, automatic.solveNear)
      const { anchor, panel } = computeManual(
        source,
        parameters,
        sweep,
        conditionNorm,
        work.request.restartBranch,
      )
      if (!panel.result) {
        self.postMessage({
          id,
          ok: false,
          discoveryPending: false,
          error:
            panel.error ?? '현재 파라미터까지 선택한 해를 추적하지 못했습니다.',
          selectedSimulation: panel,
          manualAnchor: anchor,
        })
      } else {
        self.postMessage({
          id,
          ok: true,
          discoveryPending: false,
          manualAnchor: anchor,
          payload: {
            result: panel.result,
            selectedSimulation: panel,
            sweep: panel.sweep,
            dataset: panel.dataset,
            datasetError: panel.datasetError,
            sweepName: panel.sweepName,
          },
        })
      }
      return
    }
    const calculationSource = source
    const result = solve(calculationSource, parameters, { conditionNorm })
    const payload: SolvePayload = {
      result,
      ...computeSweeps(solve, calculationSource, parameters, sweep),
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

<a id="source-27"></a>

## src/App.tsx

원본: [src/App.tsx](../../src/App.tsx) · 3,582줄 · SHA-256: `c227405c0dbc976d5db93b7f5afd93a7debc2707e6f41b8809fc65ddb4e4c953`

```tsx
import { accountStorageKey } from './account-storage'
import CertificationReport from './components/CertificationReport'
import { currentCertificate } from './components/certification-view'
import type { ScientificModule } from './engine/scientific/types'
import { useInteractionViewport } from './use-interaction-viewport'
import AnalysisSummary from './components/AnalysisSummary'
import { rootStructureLabel, tangencyOrderLabel } from './engine/tangency'
import {
  reportDiagnostics,
  coveragePercent,
  searchConclusion,
} from './engine/report-diagnostics'
import {
  uniqueBranchEvents,
  branchEventLabel,
  eventLocation,
} from './engine/branch-events'
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
import { useEffect, useRef, useState, useMemo, lazy, Suspense } from 'react'
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
import ModuleGuide from './components/ModuleGuide'
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
  ALL_NONLINEAR_EXAMPLES,
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
        ? n.toExponential(Math.min(16, digits - 1))
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
    (p.inputNoiseSigma === undefined ||
      (typeof p.inputNoiseSigma === 'number' &&
        Number.isFinite(p.inputNoiseSigma) &&
        p.inputNoiseSigma > 0)) &&
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
    const p = JSON.parse(
      localStorage.getItem(accountStorageKey(STORAGE_KEY)) || 'null',
    )
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
const ScientificWorkspace = lazy(
  () => import('./components/ScientificWorkspace'),
)

export default function App() {
  const [scientificModule, setScientificModule] =
    useState<ScientificModule | null>(null)
  const [project, setProject] = useState<Project>(initialProject)
  const [basePayload, setPayload] = useState<SolvePayload | null>(null)
  const [computeError, setError] = useState('')
  const [overview, setOverview] = useState<{
    anchors: SimulationAnchor[]
    panels: SimulationPanel[]
  } | null>(null)
  const [overviewHidden, setOverviewHidden] = useState(false)
  const [overviewExcluded, setOverviewExcluded] = useState<string[]>([])
  useEffect(() => {
    setOverview(null)
    setOverviewHidden(false)
    setOverviewExcluded([])
  }, [project.source, project.mode])
  const [manualAnchor, setManualAnchor] = useState<SimulationAnchor | null>(
    null,
  )
  const [selectedSimulation, setSelectedSimulation] =
    useState<SimulationPanel | null>(null)
  const [simulationResults, setSimulationResults] = useState<SimulationPanel[]>(
    [],
  )
  const [searchInfo, setSearchInfo] = useState<SearchSummary | null>(null)
  const [pending, setPending] = useState(false)
  const [discoveryPending, setDiscoveryPending] = useState(false)
  const preserveViewport = useInteractionViewport(pending || discoveryPending)
  const solutionsRef = useRef<HTMLDetailsElement>(null)
  const [solutionsHeight, setSolutionsHeight] = useState(0)
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
    nonlinear &&
    (!automatic || project.selectedAnchor?.id === selectedSimulation?.id)
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
  const certificateWithoutRoot =
    !result && automatic
      ? currentCertificate(
          searchInfo?.certification,
          project.source,
          Object.fromEntries(project.parameters.map((p) => [p.name, p.value])),
        )
      : undefined
  const verifiedEmpty =
    certificateWithoutRoot?.complete &&
    certificateWithoutRoot.uniqueRootCount === 0
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
          (w.startsWith('자동 탐색에서 검증한 실근') ||
            w.startsWith('지정 구간에서 찾은 하나의 근') ||
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
      { type: 'module', credentials: 'include' },
    )
    worker.current = w
    w.onmessage = ({ data }) => {
      if (data.id !== requestId.current) return
      if (data.manualAnchor) setManualAnchor(data.manualAnchor)
      if (data.overview) setOverview(data.overview)
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
    const list = solutionsRef.current
    setSolutionsHeight(list?.open ? list.getBoundingClientRect().height : 0)
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
          restartBranch: explicitSolve,
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
    project.inputNoiseSigma,
    solutionIndex,
    project.simulations,
    project.selectedAnchor,
    revision,
    workerReady,
  ])
  useProjectPersistence(project, accountStorageKey(STORAGE_KEY), setStorageOk)
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
    area
      ?.querySelector<HTMLButtonElement>('.results-heading button')
      ?.focus({ preventScroll: true })
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
      previousFocus?.focus({ preventScroll: true })
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
      previous?.focus({ preventScroll: true })
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
    // Adding another panel is an in-place action, including in fullscreen.
    if (next === screen) return
    setScreen(next)
    setExpanded(false)
    setExamplesOpen(false)
    setParamOpen(false)
    if (next === 'report' && automatic && boundsVariables.length === 1)
      setProject((p) => ({ ...p, certifyRoots: true }))
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
          localStorage.getItem(
            `${accountStorageKey(STORAGE_KEY)}-${nextMode}`,
          ) || 'null',
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
    ? ALL_NONLINEAR_EXAMPLES.find(
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
  function updateSweepName(name: string) {
    preserveViewport()
    setProject((p) => ({ ...p, sweepName: name }))
  }
  function updateParameter(id: string, value: number) {
    preserveViewport()
    setProject((p) => {
      const current = p.parameters.find((v) => v.id === id)
      if (!current) return p
      const next = Math.min(current.max, Math.max(current.min, value))
      if (next === current.value) return p
      return {
        ...p,
        parameters: p.parameters.map((v) =>
          v.id === id ? { ...v, value: next } : v,
        ),
      }
    })
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
    const diagnostics = reportDiagnostics(
      target,
      project.source,
      Object.fromEntries(project.parameters.map((p) => [p.name, p.value])),
      coverage,
    )
    const critical = uniqueBranchEvents(
      (index === undefined
        ? selectedBranch?.events
        : simulationResults.find(
            (panel) => panel.result && sameComputedRoot(panel.result, target),
          )?.events) ?? [],
    )
    return (
      [
        `# ${project.title}${branchLabel ? ` · ${branchLabel}` : index === undefined ? '' : ` · 해 ${index + 1}`}`,
        project.description,
        `유형: ${nonlinear ? 'Nonlinear' : 'Linear'}`,
        coverage
          ? `탐색: ${coverage.method}\n\n범위: ${coverage.min} ~ ${coverage.max}\n\n${coverage.certification ? searchConclusion(coverage) : coverage.note}`
          : '',
        coverage?.certification
          ? certificateReport(coverage.certification)
          : (coverage?.certificationUnavailable ?? ''),
        target.method
          ? `방법: ${target.method} · 반복 ${target.iterations ?? 0}회`
          : '',
        !isEvaluation
          ? `## 해의 품질\n\n${searchConclusion(coverage, !nonlinear)}\n\n근 종류: ${rootStructureLabel(target.rootStructure)}\n\n정규화 등식 오차: ${diagnostics.normalizedError ?? '해당 없음'}\n\n${diagnostics.errorBound !== undefined ? `해의 절대 오차 상한: ${diagnostics.errorBound} (포함 구간 [${diagnostics.enclosure!.lo}, ${diagnostics.enclosure!.hi}])` : `국소 보정량 |J⁻¹F|: ${diagnostics.correction?.join(', ') ?? '선형 보정 적용 불가'}`}\n\n등식 절대 오차 증폭률 ||J⁻¹||∞: ${diagnostics.amplification ?? '중근·특이계 또는 미분 적용 불가'}\n\n${diagnostics.powerResponse ? `${diagnostics.powerResponse.order}중근 변화 크기: |Δx| ≈ (${diagnostics.powerResponse.coefficient}·δ)^(1/${diagnostics.powerResponse.order}). 오차 방향에 따라 실근이 사라질 수 있습니다.` : ''}\n\n탐색 구간 검증률: ${coveragePercent(coverage) ?? '미실행'} (구간 길이 비율이며 발견 확률이 아닙니다.)\n\n포함 구간은 검증된 오차 범위, 보정량과 증폭률은 현재 단위에서의 국소 추정입니다.`
          : '',
        diagnostics.parameterSensitivity.length
          ? `## 파라미터별 변화율 dx/dp\n\n${diagnostics.parameterSensitivity.map((p) => `- ${p.name}: ${target.variables.map((v, i) => `${v} ${p.derivatives[i]}`).join(', ')}`).join('\n')}`
          : '',
        critical.length
          ? `## 기준 곡선의 특별한 지점\n\n${critical
              .map((ev) => {
                const at = eventLocation(ev)
                return `- ${branchEventLabel(ev)}${ev.tangency?.verified ? ` (${tangencyOrderLabel(ev.tangency)})` : ''}: ${project.sweepName}=${at.parameter}, 해=[${at.values.join(', ')}]. ${ev.tangency?.geometricSummary ?? ev.description}`
              })
              .join('\n')}`
          : '',
        `## 입력 수식\n\n\`\`\`text\n${project.source}\n\`\`\``,
        `## 파라미터\n\n${project.parameters.map((p) => `- ${p.name} = ${p.value}`).join('\n') || '없음'}`,
        `## 해\n\n| 변수 | 값 |\n| --- | ---: |\n${target.variables.map((name, i) => `| ${name} | ${target.values[i].toPrecision(17)} |`).join('\n')}`,
        target.auxiliary && Object.keys(target.auxiliary).length
          ? `## 보조식 계산값\n\n${Object.entries(target.auxiliary)
              .map(([name, value]) => `- ${name} = ${value.toPrecision(12)}`)
              .join('\n')}`
          : '',
        `최대 절대 등식 오차: ${isEvaluation ? '해당 없음' : target.maxResidual.toExponential(5)}`,
        `조건수 (${target.conditionNorm === '2' ? '2-norm · SVD' : '∞-norm'}): ${isEvaluation ? '해당 없음' : Number.isNaN(target.condition) ? '계산 불가' : target.condition.toPrecision(8)}`,
        `행렬 조건수 참고 등급: ${isEvaluation ? '해당 없음' : classifyCondition(target.condition).label}`,
        '참고 기준: κ < 10^4 안정, 10^4 ≤ κ < 10^8 민감, κ ≥ 10^8 매우 민감. 참고 범위이며 입력 오차와 단위에 따라 해석해야 합니다.',
        target.conditionError || '',
        `계산 엔진: ${target.engine}`,
        target.warnings
          .filter((w) => !w.startsWith('자동 탐색에서 검증한 실근'))
          .join('\n'),
      ]
        .filter(Boolean)
        .join('\n\n') + '\n'
    )
  }
  function exportReport() {
    if (!result || pending || error) return
    downloadFile(
      'ivc-report.md',
      buildReport(
        result,
        automatic && !selectedBranch ? solutionIndex : undefined,
        searchInfo,
        selectedBranch ? project.selectedAnchor?.label : undefined,
      ),
      'text/markdown;charset=utf-8',
    )
    setToast('계산 리포트를 내려받았습니다.')
  }
  function exportAllReports() {
    if (!solutions.length || pending || discoveryPending || error) return
    downloadFile(
      'ivc-all-solutions.md',
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
          ? `ivc-${project.selectedAnchor.label.replaceAll(' ', '-')}-data.csv`
          : `ivc-solution-${solutionIndex + 1}-data.csv`
        : 'ivc-data.csv',
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
  if (scientificModule)
    return (
      <Suspense
        fallback={
          <p className="loading-state">계산 도구를 불러오고 있습니다…</p>
        }
      >
        <ScientificWorkspace
          key={scientificModule}
          module={scientificModule}
          onHome={() => setScientificModule(null)}
          onModuleChange={setScientificModule}
        />
      </Suspense>
    )
  return (
    <div
      className={`app-shell ${screen === 'simulation' ? 'simulation-focused' : ''}`}
    >
      <div className="workspace">
        <header className="ivc-toolbar">
          {screen !== 'home' && (
            <button
              type="button"
              className="ivc-home"
              onClick={() => navigate('home')}
            >
              <ArrowRight size={16} className="ivc-back-arrow" /> Home
            </button>
          )}
          <strong className="ivc-brand">
            {screen === 'home' ? 'IVC' : 'Equation Solver'}
            {screen === 'home' && <span>Interaction Visual Calculator</span>}
          </strong>
          <div className="ivc-toolbar-actions">
            {screen !== 'home' && (
              <>
                <button type="button" onClick={newModel}>
                  <Plus size={15} /> New
                </button>
                <button
                  type="button"
                  onClick={() => importRef.current?.click()}
                >
                  <FolderOpen size={15} /> Import
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadFile(
                      'ivc-project.json',
                      JSON.stringify(project, null, 2),
                      'application/json',
                    )
                    setToast('프로젝트를 JSON 파일로 저장했습니다.')
                  }}
                >
                  <Download size={15} /> Save Project
                </button>
              </>
            )}
            <span className="local-status">
              <i />
              {storageOk ? 'Autosaved' : 'Save unavailable'}
            </span>
            <button
              className="quiet-button"
              aria-label="User Guide"
              onClick={() => setGuide(true)}
            >
              <BookOpen size={16} />
              <span>User Guide</span>
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
        {screen === 'home' && (
          <main className="module-home-page" data-screen="home">
            <LandingModules
              onOpenEquationSolver={() => navigate('model')}
              onOpenScientific={setScientificModule}
            />
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
              Linear
            </button>
            <button
              role="tab"
              aria-label="Nonlinear"
              aria-selected={nonlinear}
              className={`problem-tab ${nonlinear ? 'selected' : ''}`}
              onClick={() => switchMode('nonlinear')}
            >
              <Activity size={16} />
              Nonlinear
            </button>
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
            aria-label={expanded ? 'Simulation 전체화면' : undefined}
          >
            <div className="model-column" hidden={screen !== 'model'}>
              <section className="panel model-panel">
                <div className="panel-heading">
                  <div className="section-label">
                    <span className="step-number">01</span>
                    <h2>Model</h2>
                  </div>
                  {nonlinear && (
                    <div className="examples-wrap" ref={examplesRef}>
                      <button
                        className="text-button"
                        aria-expanded={examplesOpen}
                        onClick={() => setExamplesOpen((v) => !v)}
                      >
                        Examples
                        <ChevronDown size={14} />
                      </button>
                      {examplesOpen && (
                        <div className="examples-menu">
                          <span className="menu-label">
                            Examples · Mathematics & Science
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
                <p className="model-description">
                  {project.description.replace(
                    '방정식을 한 줄씩 입력하고 조절할 값을 파라미터로 추가하세요.',
                    '방정식을 입력하고 조절할 값을 Parameter로 추가하세요.',
                  )}
                </p>
                <div className="editor-toolbar">
                  <span>
                    <Code2 size={14} />
                    Input
                  </span>
                  <span>
                    {nonlinear
                      ? automatic
                        ? '식만 입력 · 실수 해 자동 탐색'
                        : '등식 입력 · 초기값 또는 범위로 한 해 탐색'
                      : 'Linear equations'}
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
                          ? 'x^2 = 4'
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
                    Syntax Guide
                    <ArrowRight size={13} />
                  </button>
                </div>
                {nonlinear && (
                  <details className="nonlinear-settings">
                    <summary>
                      <Settings2 size={14} />
                      Solver Settings
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
                    {pending ? '계산 중' : 'Solve'}
                    <span className="button-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </button>
                </div>
              </section>
              <section className="panel parameter-panel">
                <div className="panel-heading">
                  <div className="section-label">
                    <span className="step-number">02</span>
                    <h2>Parameters</h2>
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
                        <span>Sample Spacing {String(p.step)}</span>
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
                  Add Parameter
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
                        : '방정식을 입력해 계산을 시작하세요.'}
                </p>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => navigate('simulation')}
                >
                  Open Simulation <ArrowRight size={15} />
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
                className={`panel results-panel ${view === 'report' ? 'analysis-view' : ''} ${automatic && view === 'simulation' ? 'automatic-simulation-view' : ''} ${automatic && anchors.length > 0 && view === 'simulation' ? 'multi-simulation-view' : ''}`}
              >
                <div className="results-heading">
                  <div className="section-label">
                    <span className="step-number">03</span>
                    <h2>{view === 'simulation' ? 'Simulation' : 'Report'}</h2>
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
                          ? automatic && overview?.anchors.length
                            ? '현재 해 미확인'
                            : '입력 확인'
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
                {view === 'simulation' &&
                  project.parameters.length > 0 &&
                  !(
                    automatic &&
                    !overviewHidden &&
                    overview?.anchors.length
                  ) && (
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
                    {overviewHidden && (
                      <button
                        className="secondary-button"
                        onClick={() => setOverviewHidden(false)}
                      >
                        기본 병합 보기
                      </button>
                    )}
                    <span>최대 6개 세트 · 해별 색상 비교</span>
                  </div>
                )}
                {automatic && (solutions.length > 0 || discoveryPending) && (
                  <details
                    className="solutions-section"
                    ref={solutionsRef}
                    style={{
                      minHeight:
                        (pending || discoveryPending) && solutionsHeight
                          ? solutionsHeight
                          : undefined,
                    }}
                    onToggle={(e) => {
                      if (!e.currentTarget.open) setSolutionsHeight(0)
                    }}
                  >
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
                    {automatic && discoveryPending && (
                      <p className="discovery-status" role="status">
                        현재 해를 표시하고 있습니다. 전체 해 목록을 갱신하는
                        중입니다.
                      </p>
                    )}
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
                {view === 'simulation' &&
                (selectedBranch ||
                  (automatic &&
                    !overviewHidden &&
                    overview?.anchors.length)) ? null : error ? (
                  <div
                    className={`error-state${verifiedEmpty ? ' certified-empty-state' : ''}`}
                    role={verifiedEmpty ? 'status' : 'alert'}
                  >
                    <div className="error-icon">
                      <Sigma size={24} />
                    </div>
                    <h3>
                      {verifiedEmpty
                        ? '이 범위에는 실근이 없습니다.'
                        : nonlinear
                          ? '해를 구하지 못했습니다.'
                          : '수식을 한 번 확인해 주세요.'}
                    </h3>
                    <p>
                      {verifiedEmpty
                        ? '아래에서 구간 검증과 입력 오차에 따른 근 개수 유지 확률을 확인할 수 있습니다.'
                        : error}
                    </p>
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
                        : '방정식을 입력하세요. 알려진 값은 Parameter로 등록할 수 있습니다.'}
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
                            <strong>
                              {fmt(
                                result.values[i],
                                view === 'report' ? 17 : 7,
                              )}
                            </strong>
                            <span className="value-caption">
                              {nonlinear
                                ? rootStructureLabel(result.rootStructure)
                                : '계산된 값'}
                            </span>
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
                              ? searchConclusion(searchInfo)
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
                        {!automatic && !(nonlinear && selectedSimulation) && (
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
                                    Add Parameter
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
                            Save Report
                          </button>
                        </div>
                        {automatic && solutions.length > 1 && (
                          <button
                            className="all-reports-button"
                            disabled={pending}
                            onClick={exportAllReports}
                          >
                            <Download size={14} />
                            Save All Reports
                            <span>{solutions.length}개 해</span>
                          </button>
                        )}
                        {!evaluation && (
                          <AnalysisSummary
                            result={result}
                            source={project.source}
                            parameters={Object.fromEntries(
                              project.parameters.map((p) => [p.name, p.value]),
                            )}
                            search={searchInfo}
                            events={selectedBranch?.events}
                            sweepName={project.sweepName}
                            pending={pending || discoveryPending}
                            inputNoiseSigma={project.inputNoiseSigma ?? 1e-6}
                            onInputNoiseSigmaChange={(sigma) =>
                              setProject((p) => ({
                                ...p,
                                inputNoiseSigma: sigma,
                                certifyRoots: true,
                              }))
                            }
                          />
                        )}
                        {!evaluation && (
                          <div className="condition-controls">
                            <div>
                              <label htmlFor="condition-norm">
                                {nonlinear
                                  ? 'Local Condition Number'
                                  : 'Condition Number'}
                              </label>
                              <details className="analysis-details condition-help">
                                <summary>조건수는 어떻게 해석하나요?</summary>
                                <p>
                                  조건수는 같은 비율의 입력 변화가 해에 얼마나
                                  큰 비율의 변화로 증폭될 수 있는지 보여주는
                                  국소 지표입니다. 선형식은 계수 행렬,
                                  비선형식은 현재 해 근처의 Jacobian을
                                  사용합니다. 값이 클수록 입력의 작은 변화나
                                  반올림에 취약한 방향이 있습니다. 실제 측정
                                  오차나 해를 모두 찾았을 확률을 뜻하지
                                  않습니다.
                                </p>
                                <p>
                                  ∞-norm은 성분별 최대 오차와 행 합을 기준으로,
                                  2-norm은 전체 벡터 길이와 최대·최소 특이값의
                                  비율을 기준으로 계산합니다. 선택을 바꾸면 진단
                                  기준이 달라집니다. 계산 자릿수가 늘어나거나
                                  해가 더 정확해지는 설정은 아닙니다.
                                </p>
                                <p>
                                  위의 ‘등식 오차 → 해 변화 증폭률’은 절대
                                  오차가 해의 절대 변화로 바뀌는 크기이고,
                                  조건수는 상대 변화와 방향 간 불균형을
                                  나타냅니다. 단일 변수의 비특이 Jacobian
                                  조건수는 항상 1이므로, 이 경우에는 증폭률과
                                  파라미터별 영향으로 민감도를 판단하세요.
                                  단위와 스케일이 같은 모델끼리 비교하는 것이
                                  적절합니다.
                                </p>
                              </details>
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
                        <details className="analysis-details technical-diagnostics">
                          <summary>Numerical Diagnostics</summary>
                          <div
                            className={`report-metrics ${evaluation ? 'evaluation-metrics' : ''}`}
                          >
                            <div>
                              <span>
                                {evaluation
                                  ? '계산 항목'
                                  : '최대 절대 등식 오차'}
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
                              <span>Runtime</span>
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
                                  두 방식은 서로 다른 norm으로 민감도를
                                  측정하므로 값이 달라질 수 있습니다. 2-norm
                                  선택이 해 자체의 계산 정밀도를 높이는 것은
                                  아닙니다.
                                </p>
                                <p>
                                  {nonlinear
                                    ? '조건수는 수렴점에서 계산한 Jacobian J를 기준으로 합니다.'
                                    : '조건수는 수식에서 추출한 계수 행렬 A를 기준으로 합니다.'}{' '}
                                  식이나 변수의 단위를 바꾸면 값이 달라질 수
                                  있습니다. 계산 방식 선택은 진단에 적용되며,
                                  해를 구하는 솔버는 동일합니다.
                                </p>
                              </details>
                            </div>
                          )}
                        </details>
                        <details className="analysis-details">
                          <summary>Model & Calculation Details</summary>
                          <h4>Source</h4>
                          <pre>{project.source}</pre>
                          <h4>Parameters</h4>
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
                          <h4>Numerical Method</h4>
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
                        </details>
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
                {view === 'report' && certificateWithoutRoot && (
                  <section className="report-without-root">
                    <CertificationReport
                      certificate={certificateWithoutRoot}
                      pending={pending || discoveryPending}
                      truncated={searchInfo?.truncated}
                      inputNoiseSigma={project.inputNoiseSigma ?? 1e-6}
                      onInputNoiseSigmaChange={(sigma) =>
                        setProject((p) => ({
                          ...p,
                          inputNoiseSigma: sigma,
                          certifyRoots: true,
                        }))
                      }
                    />
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={pending || discoveryPending}
                      onClick={() =>
                        downloadFile(
                          'ivc-verification-report.md',
                          `# ${project.title}\n\n${certificateReport(certificateWithoutRoot)}\n\n## 입력 모델\n\n\`\`\`text\n${project.source}\n\`\`\``,
                          'text/markdown;charset=utf-8',
                        )
                      }
                    >
                      Save Verification Report
                    </button>
                  </section>
                )}
                {nonlinear &&
                  !automatic &&
                  view === 'simulation' &&
                  selectedSimulation &&
                  manualAnchor && (
                    <SimulationPanelView
                      panel={selectedSimulation}
                      anchor={manualAnchor}
                      parameters={project.parameters}
                      onSweepNameChange={updateSweepName}
                      expanded={expanded}
                      pending={pending}
                      closable={false}
                      onClose={() => {}}
                      onParameterChange={
                        sweepParam
                          ? (value) => updateParameter(sweepParam.id, value)
                          : undefined
                      }
                      onReport={() => navigate('report')}
                    />
                  )}
                {automatic &&
                  view === 'simulation' &&
                  anchors.length === 0 &&
                  (!overview || overviewHidden) &&
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
                        onSweepNameChange={updateSweepName}
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
                  !overviewHidden &&
                  overview &&
                  overview.anchors.length > 0 && (
                    <div className="default-overview">
                      <MergedSimulationSetView
                        mergedSet={{
                          id: 'default-overview',
                          name: '전체 해 탐색',
                          anchorIds: overview.anchors
                            .filter((a) => !overviewExcluded.includes(a.id))
                            .map((a) => a.id),
                        }}
                        anchors={overview.anchors}
                        selectedAnchorId={project.selectedAnchor?.id}
                        panels={overview.panels}
                        parameters={project.parameters}
                        sweepName={project.sweepName}
                        onSweepNameChange={updateSweepName}
                        controls={
                          <ResultParameters
                            parameters={project.parameters}
                            onChange={updateParameter}
                          />
                        }
                        expanded={expanded}
                        large
                        pending={pending}
                        onRemoveSet={() => setOverviewHidden(true)}
                        onToggleAnchorInSet={(id) =>
                          setOverviewExcluded((ids) =>
                            ids.includes(id)
                              ? ids.filter((v) => v !== id)
                              : [...ids, id],
                          )
                        }
                        onParameterChange={
                          sweepParam
                            ? (value) => updateParameter(sweepParam.id, value)
                            : undefined
                        }
                        onSelectAnchor={(anchor) =>
                          setProject((p) => ({ ...p, selectedAnchor: anchor }))
                        }
                        onReportAnchor={openSimulationReport}
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
                          onSweepNameChange={updateSweepName}
                          controls={
                            <ResultParameters
                              parameters={project.parameters}
                              onChange={updateParameter}
                              idPrefix={set.id}
                            />
                          }
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
                              onSweepNameChange={updateSweepName}
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
              IVC
              <span className="footer-studio">
                {' '}
                Interaction Visual Calculator
              </span>
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
      {guide && (
        <ModuleGuide initialTopic={mode} onClose={() => setGuide(false)} />
      )}
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
                  Add Parameter
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
                    rows.current[Math.min(i + 1, points.length - 1)]?.focus({
                      preventScroll: true,
                    })
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    rows.current[Math.max(0, i - 1)]?.focus({
                      preventScroll: true,
                    })
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
      {c.reduction && <p>{c.reduction}</p>}
      <p>
        검증 범위: {c.variable} ∈ [{String(c.domain.min)},{' '}
        {String(c.domain.max)}].{' '}
        {c.reduction ? '서로 다른 근 구간' : '유일한 단순근 구간'}{' '}
        {c.uniqueRootCount}개 · 정의역 제외 구간 {c.excludedDomainCount}개.
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
            'ivc-interval-verification.md',
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
  idPrefix = 'main',
}: {
  parameters: Parameter[]
  onChange: (id: string, value: number) => void
  idPrefix?: string
}) {
  return (
    <section className="results-parameters" aria-label="파라미터 조절">
      <div className="results-parameters-heading">
        <span>
          <SlidersHorizontal size={14} />
          파라미터 조절
        </span>
      </div>
      <div className="results-parameter-grid">
        {parameters.map((p) => (
          <div key={p.id} className="result-parameter">
            <div className="parameter-top">
              <label
                htmlFor={`param-${idPrefix}-${p.id}`}
                className="parameter-name"
              >
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
              id={`param-${idPrefix}-${p.id}`}
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
