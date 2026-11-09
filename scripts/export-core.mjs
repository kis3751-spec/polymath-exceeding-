import { createHash } from 'node:crypto'
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const checkOnly = process.argv.includes('--check')
const unexpected = process.argv
  .slice(2)
  .filter((argument) => argument !== '--check')
if (unexpected.length) {
  throw new Error(
    `지원하지 않는 옵션: ${unexpected.join(', ')}. 사용법: node scripts/export-core.mjs [--check]`,
  )
}

const chartHelpers = (await readdir(join(root, 'src/components')))
  .filter((name) => /^chart-.*\.ts$/.test(name))
  .sort()
  .map((name) => `src/components/${name}`)

const books = [
  {
    name: '01-math-engine.md',
    title: '01 · 수식 파싱과 수치해석 엔진',
    introduction: [
      '입력 문자열을 계산 가능한 식으로 바꾸고 실수 해를 구하는 실제 코드입니다. 선형식과 비선형식의 파서는 문자열을 임의 JavaScript로 실행하지 않고, 허용한 문법과 함수로 해석합니다.',
      '선형식은 계수 행렬로 바꾸어 부분 피벗팅 가우스 소거법으로 풉니다. 비선형식은 잔차 평가, 구간 이분법·Newton 보정, 자동 다항식 실근 분리·여러 시작점 탐색을 조합합니다. `conditioning.ts`는 ∞-norm과 직접 SVD에 의한 2-norm 조건수 및 참고 민감도 분류를 담당합니다.',
      '`solver.wat`는 실제 WebAssembly 선형 커널의 원문이며, `build-wasm.mjs`가 이를 컴파일합니다. 브라우저에서 WASM을 사용할 수 없으면 소스에 있는 JavaScript 대체 경로로 전환합니다. 단일근 계산과 함수 평가는 JavaScript 경로도 사용합니다.',
      '일반 비선형식에 대한 유한한 수치 탐색은 모든 실근의 발견이나 가지의 수학적 동일성을 증명하지 않습니다. 해의 존재 범위, 잔차, 조건수와 추적 실패를 함께 확인해야 합니다.',
    ],
    files: [
      'src/engine/index.ts',
      'src/engine/nonlinear-parser.ts',
      'src/engine/expression-derivative.ts',
      'src/engine/root-comparison.ts',
      'src/engine/search-analysis.ts',
      'src/engine/interval-arithmetic.ts',
      'src/engine/interval-certification.ts',
      'src/engine/derivative-free.ts',
      'src/engine/square-free.ts',
      'src/engine/source-statements.ts',
      'src/engine/preprocessor.ts',
      'src/engine/nonlinear.ts',
      'src/engine/automatic-polynomial.ts',
      'src/engine/parameter-path.ts',
      'src/engine/tangency.ts',
      'src/engine/report-diagnostics.ts',
      'src/engine/automatic.ts',
      'src/engine/root-isolation.ts',
      'src/engine/conditioning.ts',
      'src/engine/solver.wat',
      'scripts/build-wasm.mjs',
    ],
  },
  {
    name: '02-state-and-simulation.md',
    title: '02 · 상태 관리, 분기 추적과 비동기 계산',
    introduction: [
      '수식·파라미터·선택한 해가 화면과 계산 엔진 사이를 오가는 실제 코드입니다. `models.ts`는 저장할 모델을, `App.tsx`는 화면 이동·모델 편집·계산 요청·저장 및 리포트 생성을 연결합니다.',
      '`solver.worker.ts`는 UI 스레드 밖에서 계산하고, 요청 번호를 사용하는 UI가 이전 응답으로 최신 결과를 덮어쓰지 않게 합니다. `sweep.ts`는 그래프용 지점과 사용자가 정한 간격의 데이터 표 지점을 구분합니다.',
      '`branches.ts`는 기준 해에서 파라미터를 조금씩 바꾸어 동일한 가지를 수치적으로 추적합니다. 국소 보정과 역방향 확인에 실패한 구간을 다른 해로 임의 연결하지 않습니다. `simulation-panels.ts`는 해별 기준 스냅샷과 계산 캐시를 관리합니다.',
      '탐색 변수의 현재값은 곡선 위의 현재 지점을 가리킵니다. 같은 기준 해·다른 고정 파라미터·범위·간격에서는 현재 탐색 변수만 움직여도 기준 곡선이 달라지지 않도록 계산과 표시를 구분합니다. 다른 고정 파라미터, 선택한 해 또는 탐색 범위가 바뀌면 곡선을 다시 계산할 수 있습니다.',
    ],
    files: [
      'src/editor-input.ts',
      'src/equation-project.ts',
      'src/models.ts',
      'src/showcase-examples.ts',
      'src/solver-input.ts',
      'src/use-project-persistence.ts',
      'src/equation-count.ts',
      'src/csv.ts',
      'src/engine/sweep.ts',
      'src/engine/branches.ts',
      'src/engine/branch-events.ts',
      'src/engine/simulation-panels.ts',
      'src/engine/manual-simulation.ts',
      'src/use-interaction-viewport.ts',
      'src/engine/default-overview.ts',
      'src/engine/solver.worker.ts',
      'src/App.tsx',
    ],
  },
  {
    name: '03-chart-and-interaction.md',
    title: '03 · 그래프, 마우스 조작과 화면 표현',
    introduction: [
      '그래프를 화면 좌표로 바꾸고, 포인터·키보드·휠 입력을 처리하는 실제 React·TypeScript 및 CSS입니다. `main.tsx`에서 앱을 올리고, `WorkspaceNavigation`에서 모듈 홈과 각 작업 화면의 이동을 표현합니다.',
      '`chart-domain.ts`와 다른 `chart-*.ts` 파일은 수치 좌표와 화면 좌표, 축 범위 및 그래프 조작에 필요한 계산을 분리합니다. `SolutionChart.tsx`는 SVG 곡선·축·현재 지점·탐색 표시를 렌더링합니다. `SimulationPanelView.tsx`는 해별 그래프와 데이터 표, 내보내기를 묶습니다.',
      '마우스로 보이는 곡선을 탐색하는 것과 파라미터를 실제로 변경하여 모델을 다시 푸는 동작은 구분합니다. 표의 행 선택, 그래프의 연속적인 탐색 표시, 클릭으로 선택한 현재값은 각각 소스의 이벤트 처리에서 확인할 수 있습니다. 유효하지 않은 구간은 선으로 이어 그리지 않습니다.',
      '조작은 그래프 클릭으로 파라미터 적용, 활성화한 그래프 위의 휠로 축 확대·축소입니다. 그래프 확대 축에서 양축·X축·Y축을 선택하고 축 초기화로 복원합니다. 좌우/Home/End는 표 지점 탐색, Enter/Space는 값 적용, +/-는 확대·축소, 0은 초기화에 연결됩니다. 호버 툴팁의 곡선 보간값은 표의 직접 계산값과 구분합니다.',
      '공통 `styles.css`, 분리 화면의 `workspace-screens.css`와 컴포넌트별 CSS를 함께 담아 화면 배치, 반응형 크기, 전환 효과와 애니메이션의 실제 정의를 읽을 수 있게 했습니다. 휠에 의한 축 조정은 표시 범위를 바꾸며 계산한 해 자체를 변경하지 않습니다.',
    ],
    files: [
      'src/main.tsx',
      ...chartHelpers,
      'src/components/EquationReference.tsx',
      'src/components/ExampleWalkthrough.tsx',
      'src/components/AnalysisSummary.tsx',
      'src/components/AnalysisSummary.css',
      'src/components/Guide.tsx',
      'src/components/Guide.css',
      'src/components/SolutionChart.tsx',
      'src/components/SolutionChart.css',
      'src/components/SimulationPanelView.tsx',
      'src/components/MergedSimulationSetView.tsx',
      'src/components/SimulationPanelView.css',
      'src/components/WorkspaceNavigation.tsx',
      'src/components/WorkspaceNavigation.css',
      'src/styles.css',
      'src/workspace-screens.css',
    ],
  },
]

// Read every expected module before writing any output. A parallel feature
// branch may not have created its new components yet; a partial codebook would
// misleadingly look complete, so report the missing files and leave it alone.
const files = [...new Set(books.flatMap((book) => book.files))]
const sources = new Map()
const missing = []
for (const file of files) {
  try {
    sources.set(file, await readFile(join(root, file), 'utf8'))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    missing.push(file)
  }
}
if (missing.length) {
  throw new Error(
    `필수 소스가 아직 없습니다. 기능 구현이 끝난 뒤 다시 실행하세요. 문서는 변경하지 않았습니다.\n${missing.map((file) => `- ${file}`).join('\n')}`,
  )
}

const sha256 = (value) => createHash('sha256').update(value).digest('hex')
const syntax = (file) =>
  ({ tsx: 'tsx', ts: 'typescript', css: 'css', wat: 'wat', mjs: 'javascript' })[
    file.split('.').at(-1)
  ] ?? 'text'
const fencedSource = (file, source) => {
  const longest = Math.max(
    0,
    ...[...source.matchAll(/`+/g)].map((match) => match[0].length),
  )
  const fence = '`'.repeat(Math.max(3, longest + 1))
  return `${fence}${syntax(file)}\n${source}${source.endsWith('\n') ? '' : '\n'}${fence}`
}

function renderBook(book) {
  const digest = sha256(
    book.files.map((file) => `${file}\0${sources.get(file)}\0`).join(''),
  )
  return [
    `# ${book.title}`,
    '',
    ...book.introduction.flatMap((paragraph) => [paragraph, '']),
    '## 읽는 방법',
    '',
    '아래 코드 블록은 표시한 원본 파일의 전체 내용을 그대로 복사한 읽기용 묶음입니다. 요약용 의사 코드나 별도의 구현이 아니며, 모듈의 import 경로는 원래 프로젝트 구조를 따릅니다. 이 Markdown을 하나의 TypeScript 파일로 바꾸어 실행하는 용도는 아닙니다. 실행은 저장소에서 `npm ci`와 `npm run dev`를 사용합니다.',
    '',
    '원본을 수정한 뒤 `npm run docs:core`로 다시 만들고, `npm run docs:core -- --check`로 문서와 현재 소스가 같은지 확인할 수 있습니다. 각 파일의 SHA-256은 원문 일치 확인용이며 생성 시각을 넣지 않아 같은 소스에서 같은 문서를 만듭니다.',
    '',
    `소스 묶음 SHA-256: \`${digest}\``,
    '',
    '## 다른 코드 묶음',
    '',
    ...books.map(
      (other) =>
        `- [${other.title}](./${other.name})${other === book ? ' · 현재 문서' : ''}`,
    ),
    '',
    '## 포함한 원본',
    '',
    ...book.files.map(
      (file, index) =>
        `- [${file}](#source-${index + 1}) · [저장소 원본](../../${file})`,
    ),
    '',
    ...book.files.flatMap((file, index) => {
      const source = sources.get(file)
      const lineCount = source
        ? source.split('\n').length - Number(source.endsWith('\n'))
        : 0
      return [
        `<a id="source-${index + 1}"></a>`,
        '',
        `## ${file}`,
        '',
        `원본: [${file}](../../${file}) · ${lineCount.toLocaleString('en-US')}줄 · SHA-256: \`${sha256(source)}\``,
        '',
        fencedSource(file, source),
        '',
      ]
    }),
  ].join('\n')
}

const outputDirectory = join(root, 'docs/core-code')
const rendered = books.map((book) => ({
  name: book.name,
  content: renderBook(book),
}))
const stale = []
if (checkOnly) {
  for (const book of rendered) {
    let current
    try {
      current = await readFile(join(outputDirectory, book.name), 'utf8')
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    if (current !== book.content) stale.push(book.name)
  }
  const existing = await readdir(outputDirectory).catch((error) => {
    if (error.code === 'ENOENT') return []
    throw error
  })
  const expected = new Set(rendered.map((book) => book.name))
  for (const file of existing) {
    if (file.endsWith('.md') && !expected.has(file)) stale.push(file)
  }
  if (stale.length) {
    throw new Error(
      `핵심 코드 문서가 현재 소스와 다릅니다. npm run docs:core를 실행하세요.\n${stale.map((file) => `- docs/core-code/${file}`).join('\n')}`,
    )
  }
  console.log(`핵심 코드 문서 ${rendered.length}개가 현재 소스와 일치합니다.`)
} else {
  await mkdir(outputDirectory, { recursive: true })
  for (const book of rendered) {
    await writeFile(join(outputDirectory, book.name), book.content, 'utf8')
    console.log(
      `docs/core-code/${book.name} (${Buffer.byteLength(book.content).toLocaleString('en-US')} bytes)`,
    )
  }
}
