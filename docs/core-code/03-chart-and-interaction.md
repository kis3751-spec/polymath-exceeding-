# 03 · 그래프, 마우스 조작과 화면 표현

그래프를 화면 좌표로 바꾸고, 포인터·키보드·휠 입력을 처리하는 실제 React·TypeScript 및 CSS입니다. `main.tsx`에서 앱을 올리고, `WorkspaceNavigation`에서 모듈 홈과 각 작업 화면의 이동을 표현합니다.

`chart-domain.ts`와 다른 `chart-*.ts` 파일은 수치 좌표와 화면 좌표, 축 범위 및 그래프 조작에 필요한 계산을 분리합니다. `SolutionChart.tsx`는 SVG 곡선·축·현재 지점·탐색 표시를 렌더링합니다. `SimulationPanelView.tsx`는 해별 그래프와 데이터 표, 내보내기를 묶습니다.

마우스로 보이는 곡선을 탐색하는 것과 파라미터를 실제로 변경하여 모델을 다시 푸는 동작은 구분합니다. 표의 행 선택, 그래프의 연속적인 탐색 표시, 클릭으로 선택한 현재값은 각각 소스의 이벤트 처리에서 확인할 수 있습니다. 유효하지 않은 구간은 선으로 이어 그리지 않습니다.

조작은 그래프 클릭으로 파라미터 적용, 활성화한 그래프 위의 휠로 축 확대·축소입니다. 그래프 확대 축에서 양축·X축·Y축을 선택하고 축 초기화로 복원합니다. 좌우/Home/End는 표 지점 탐색, Enter/Space는 값 적용, +/-는 확대·축소, 0은 초기화에 연결됩니다. 호버 툴팁의 곡선 보간값은 표의 직접 계산값과 구분합니다.

공통 `styles.css`, 분리 화면의 `workspace-screens.css`와 컴포넌트별 CSS를 함께 담아 화면 배치, 반응형 크기, 전환 효과와 애니메이션의 실제 정의를 읽을 수 있게 했습니다. 휠에 의한 축 조정은 표시 범위를 바꾸며 계산한 해 자체를 변경하지 않습니다.

## 읽는 방법

아래 코드 블록은 표시한 원본 파일의 전체 내용을 그대로 복사한 읽기용 묶음입니다. 요약용 의사 코드나 별도의 구현이 아니며, 모듈의 import 경로는 원래 프로젝트 구조를 따릅니다. 이 Markdown을 하나의 TypeScript 파일로 바꾸어 실행하는 용도는 아닙니다. 실행은 저장소에서 `npm ci`와 `npm run dev`를 사용합니다.

원본을 수정한 뒤 `npm run docs:core`로 다시 만들고, `npm run docs:core -- --check`로 문서와 현재 소스가 같은지 확인할 수 있습니다. 각 파일의 SHA-256은 원문 일치 확인용이며 생성 시각을 넣지 않아 같은 소스에서 같은 문서를 만듭니다.

소스 묶음 SHA-256: `549c20e2216b3281c0c6b2cd7e99a5e904c72f44ab8039a0ce24c5c32ea6deff`

## 다른 코드 묶음

- [01 · 수식 파싱과 수치해석 엔진](./01-math-engine.md)
- [02 · 상태 관리, 분기 추적과 비동기 계산](./02-state-and-simulation.md)
- [03 · 그래프, 마우스 조작과 화면 표현](./03-chart-and-interaction.md) · 현재 문서

## 포함한 원본

- [src/main.tsx](#source-1) · [저장소 원본](../../src/main.tsx)
- [src/components/chart-domain.ts](#source-2) · [저장소 원본](../../src/components/chart-domain.ts)
- [src/components/chart-interaction.ts](#source-3) · [저장소 원본](../../src/components/chart-interaction.ts)
- [src/components/EquationReference.tsx](#source-4) · [저장소 원본](../../src/components/EquationReference.tsx)
- [src/components/ExampleWalkthrough.tsx](#source-5) · [저장소 원본](../../src/components/ExampleWalkthrough.tsx)
- [src/components/Guide.tsx](#source-6) · [저장소 원본](../../src/components/Guide.tsx)
- [src/components/Guide.css](#source-7) · [저장소 원본](../../src/components/Guide.css)
- [src/components/SolutionChart.tsx](#source-8) · [저장소 원본](../../src/components/SolutionChart.tsx)
- [src/components/SolutionChart.css](#source-9) · [저장소 원본](../../src/components/SolutionChart.css)
- [src/components/SimulationPanelView.tsx](#source-10) · [저장소 원본](../../src/components/SimulationPanelView.tsx)
- [src/components/MergedSimulationSetView.tsx](#source-11) · [저장소 원본](../../src/components/MergedSimulationSetView.tsx)
- [src/components/SimulationPanelView.css](#source-12) · [저장소 원본](../../src/components/SimulationPanelView.css)
- [src/components/WorkspaceNavigation.tsx](#source-13) · [저장소 원본](../../src/components/WorkspaceNavigation.tsx)
- [src/components/WorkspaceNavigation.css](#source-14) · [저장소 원본](../../src/components/WorkspaceNavigation.css)
- [src/styles.css](#source-15) · [저장소 원본](../../src/styles.css)
- [src/workspace-screens.css](#source-16) · [저장소 원본](../../src/workspace-screens.css)

<a id="source-1"></a>

## src/main.tsx

원본: [src/main.tsx](../../src/main.tsx) · 11줄 · SHA-256: `d025631efb7cd1fb984be635174d651d76413dcfe6762dcc8a82ecf3528976fa`

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
import './workspace-screens.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

<a id="source-2"></a>

## src/components/chart-domain.ts

원본: [src/components/chart-domain.ts](../../src/components/chart-domain.ts) · 85줄 · SHA-256: `1c0901a9485e4f31d9765bb66e6d107f68625a10f857a4f0f5bb6e6944597337`

```typescript
export type ChartDomain = [number, number, number[]]

// Weighted interpolation and normalized coordinates avoid overflowing the span
// when finite endpoints have opposite signs near Number.MAX_VALUE.
export function interpolate(min: number, max: number, ratio: number): number {
  if (ratio === 0) return min
  if (ratio === 1) return max
  const span = max - min
  if (Number.isFinite(span)) return min + span * ratio
  return min * (1 - ratio) + max * ratio
}

export function fraction(value: number, min: number, max: number): number {
  const scale = Math.max(Math.abs(min), Math.abs(max))
  if (!scale || min === max) return 0.5
  return (value / scale - min / scale) / (max / scale - min / scale)
}

/** Fit visible values, preserving variation even for roots far from zero. */
export function fittedDomain(values: readonly number[]): ChartDomain {
  let min = Infinity
  let max = -Infinity
  for (const value of values) {
    if (!Number.isFinite(value)) continue
    min = Math.min(min, value)
    max = Math.max(max, value)
  }
  if (min === Infinity) return [0, 1, [0, 0.25, 0.5, 0.75, 1]]

  // Compute the padding before subtracting large endpoints. A single constant
  // also needs a local range, rather than an axis anchored at zero.
  const padding =
    min === max
      ? min === 0
        ? 1
        : Math.max(Math.abs(min) * 0.05, Number.MIN_VALUE)
      : Math.max(max * 0.08 - min * 0.08, Number.MIN_VALUE)
  const paddedMin = min - padding
  const paddedMax = max + padding
  if (Number.isFinite(paddedMin)) min = paddedMin
  if (Number.isFinite(paddedMax)) max = paddedMax

  const fallback = (): ChartDomain => [
    min,
    max,
    [
      ...new Set(
        Array.from({ length: 5 }, (_, i) => interpolate(min, max, i / 4)),
      ),
    ],
  ]
  const rawStep = max / 4 - min / 4
  if (!Number.isFinite(rawStep) || rawStep <= 0) return fallback()
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  if (!Number.isFinite(magnitude) || magnitude === 0) return fallback()
  const factor = rawStep / magnitude
  const step =
    (factor <= 1
      ? 1
      : factor <= 2
        ? 2
        : factor <= 2.5
          ? 2.5
          : factor <= 5
            ? 5
            : 10) * magnitude
  if (!Number.isFinite(step) || step <= 0) return fallback()
  const roundedMin = Math.floor(min / step) * step
  const roundedMax = Math.ceil(max / step) * step
  if (Number.isFinite(roundedMin) && roundedMin <= min) min = roundedMin
  if (Number.isFinite(roundedMax) && roundedMax >= max) max = roundedMax
  const count = Math.round(max / step - min / step)
  if (!Number.isFinite(count) || count < 1 || count > 20) return fallback()
  return [
    min,
    max,
    [
      ...new Set(
        Array.from({ length: count + 1 }, (_, i) =>
          interpolate(min, max, i / count),
        ),
      ),
    ],
  ]
}
```

<a id="source-3"></a>

## src/components/chart-interaction.ts

원본: [src/components/chart-interaction.ts](../../src/components/chart-interaction.ts) · 116줄 · SHA-256: `e479b0f5db5855a4ec7606b34f944659ee0d8c7e544294a554729e7c611fce1c`

```typescript
import { fraction, interpolate } from './chart-domain'

export type CurvePoint = {
  parameter: number
  values: number[] | null
  error?: string
}

export type AxisWindow = [number, number]
export type ChartWindow = { x: AxisWindow; y: AxisWindow }
export type ZoomAxis = 'both' | 'x' | 'y'

export const initialWindow = (): ChartWindow => ({ x: [0, 1], y: [0, 1] })

/** Evaluate the displayed polyline, rather than snapping to the table's
 * usually much coarser interval. Null solve points always split a branch. */
export function pointOnCurve(
  points: readonly CurvePoint[],
  parameter: number,
): CurvePoint | null {
  if (!points.length || !Number.isFinite(parameter)) return null
  let low = 0
  let high = points.length - 1
  if (parameter < points[low].parameter || parameter > points[high].parameter)
    return null
  while (low <= high) {
    const middle = (low + high) >>> 1
    const sample = points[middle]
    if (sample.parameter === parameter) return { ...sample }
    if (sample.parameter < parameter) low = middle + 1
    else high = middle - 1
  }
  const left = points[high]
  const right = points[low]
  if (!left || !right) return null
  if (!left.values || !right.values)
    return {
      parameter,
      values: null,
      error: left.error || right.error || '이 구간에는 추적한 해가 없습니다.',
    }
  const ratio = fraction(parameter, left.parameter, right.parameter)
  return {
    parameter,
    values: left.values.map((value, index) =>
      Number.isFinite(value) && Number.isFinite(right.values![index])
        ? interpolate(value, right.values![index], ratio)
        : NaN,
    ),
  }
}

export function nearestPointIndex(
  coordinates: readonly { parameter: number; index: number }[],
  parameter: number,
): number {
  if (!coordinates.length || !Number.isFinite(parameter)) return -1
  let low = 0
  let high = coordinates.length
  while (low < high) {
    const middle = (low + high) >>> 1
    if (coordinates[middle].parameter < parameter) low = middle + 1
    else high = middle
  }
  if (low === 0) return coordinates[0].index
  if (low === coordinates.length) return coordinates[low - 1].index
  const left = coordinates[low - 1]
  const right = coordinates[low]
  // Normalize first so opposite extreme finite endpoints cannot overflow.
  const ratio = fraction(parameter, left.parameter, right.parameter)
  return ratio <= 0.5 ? left.index : right.index
}

/** A notch changes the span by about 20%. Limits prevent an unusably tiny
 * window, floating-point collapse, and accidental unlimited zooming out. */
export function zoomAxis(
  window: AxisWindow,
  anchorRatio: number,
  factor: number,
): AxisWindow {
  if (!Number.isFinite(factor) || factor <= 0 || !Number.isFinite(anchorRatio))
    return window
  const ratio = Math.min(1, Math.max(0, anchorRatio))
  const span = Math.min(8, Math.max(1 / 128, (window[1] - window[0]) * factor))
  if (span === 8) return [-3.5, 4.5]
  const anchor = interpolate(window[0], window[1], ratio)
  let min = anchor - ratio * span
  let max = min + span
  if (min < -3.5) {
    max += -3.5 - min
    min = -3.5
  }
  if (max > 4.5) {
    min -= max - 4.5
    max = 4.5
  }
  return [min, max]
}

export function zoomWindow(
  window: ChartWindow,
  axis: ZoomAxis,
  xRatio: number,
  yRatio: number,
  factor: number,
): ChartWindow {
  return {
    x: axis === 'y' ? window.x : zoomAxis(window.x, xRatio, factor),
    y: axis === 'x' ? window.y : zoomAxis(window.y, yRatio, factor),
  }
}

export function wheelFactor(deltaY: number, deltaMode = 0): number {
  const pixels = deltaY * (deltaMode === 1 ? 16 : deltaMode === 2 ? 600 : 1)
  return Math.exp(Math.max(-120, Math.min(120, pixels)) * 0.0015)
}
```

<a id="source-4"></a>

## src/components/EquationReference.tsx

원본: [src/components/EquationReference.tsx](../../src/components/EquationReference.tsx) · 158줄 · SHA-256: `65885a221d31d58b0ba7ae4145398112a0bc4b38a72b3da6919e920838a5251a`

```tsx
const functions = [
  [
    '삼각함수',
    'sin(x), cos(x), tan(x)',
    '각도는 라디안. tan은 π/2+kπ에서 정의되지 않습니다.',
  ],
  [
    '역삼각함수',
    'asin(x), acos(x), atan(x)',
    'asin·acos의 실수 정의역은 −1 ≤ x ≤ 1입니다.',
  ],
  [
    '쌍곡함수',
    'sinh(x), cosh(x), tanh(x)',
    '반응·열역학 등의 비선형 모델에 사용합니다.',
  ],
  [
    '지수·로그',
    'exp(x), ln(x), log(x), log10(x)',
    'ln은 자연로그, log·log10은 밑 10. 로그 인수는 양수입니다.',
  ],
  [
    '제곱근·절댓값',
    'sqrt(x), abs(x)',
    'sqrt의 실수 인수는 0 이상. abs의 꺾인 점은 매끄러운 접점과 다릅니다.',
  ],
  [
    '거듭제곱·비교',
    'pow(x, 2), min(x, y), max(x, y)',
    'pow는 x^2와 같은 용도입니다. min·max는 두 인수를 받습니다.',
  ],
]
export default function EquationReference() {
  return (
    <section
      className="guide-section guide-reference"
      aria-label="Equation Solver 함수·문법 공식집"
    >
      <div>
        <h3>함수·문법 공식집</h3>
        <p>
          Linear는 미지수에 대해 선형인 식, Nonlinear는 아래 내장 함수를 포함한
          실수 방정식을 풉니다. 함수 이름은 대소문자를 허용하지만 변수 x와 X는
          구분합니다.
        </p>
        <h4>입력 규칙</h4>
        <ul>
          <li>
            <code>2x + y = 10</code>: 등호 양쪽에 식을 씁니다. 방정식은 한 줄에
            하나씩 적는 것을 권장합니다. 일반 등식의 이름은 미지수이며 상수를
            자동 추측하지 않습니다.
          </li>
          <li>
            <code>+ - * / ^</code>와 괄호를 사용합니다. <code>-2^2 = -4</code>,{' '}
            <code>(-2)^2 = 4</code>, <code>2^3^2 = 512</code>입니다.
          </li>
          <li>
            <code>2x</code>, <code>2(x+1)</code>처럼 곱셈을 생략할 수 있습니다.
            혼동을 피하려면 <code>x*(y+1)</code>처럼 *를 적습니다.
          </li>
          <li>
            <code>1e-3</code>은 0.001, <code>#</code> 뒤는 주석입니다. 이름은
            영문자로 시작하고 영문·숫자·밑줄을 사용합니다.
          </li>
          <li>
            Nonlinear 내장 상수는 <code>pi</code>, <code>e</code>입니다.
            Linear에서는 기존 파일 호환을 위해 같은 이름을 일반 변수로
            취급합니다.
          </li>
        </ul>
        <h4>여러 등식·단위 주석</h4>
        <pre>
          {
            '2x + y = x - y + 8 = 10\na = 3.59, b = 0.0427, R = 0.08314, T = 280\nf1(x) = 2x + 4 = 0'
          }
        </pre>
        <p>
          첫 줄은 두 등식이며 x=4, y=2입니다. 쉼표·세미콜론으로 등식을 나누거나
          연쇄 등호를 쓸 수 있습니다. 숫자로 고정된 변수도 계산 결과에 남습니다.
          f1(x)는 정의 후 0과 같게 두므로 x=−2입니다. 위 세 줄은 각각 별개의
          문법 예시입니다.
        </p>
        <p>
          숫자 뒤 공백과 괄호의 <code>280 (K)</code>,{' '}
          <code>3.59 (L^2·bar/mol^2)</code>는 알려진 단위의 주석으로 읽습니다.
          단위 환산·차원 검사는 수행하지 않으므로 같은 단위 체계의 수치를
          입력하세요. 해당 기호가 변수나 파라미터로 사용되면 곱셈 의미를
          유지합니다. 곱셈을 의도하면 <code>2*K</code>처럼 *를 명시하세요.
        </p>
        <p>
          붙여넣기는 코드 블록 테두리와 특수 마이너스를 정리합니다. 수식 줄
          번호는 편집기의 실제 행이고, 방정식 개수는 연쇄 등식 등을 나눈 논리적
          등식 수입니다.
        </p>
        <h4>함수·혼합식 정의</h4>
        <pre>{'f1(x) = 2x + 4\nf2(x) = -3x + 7\nf1(x) - f2(x) = 0'}</pre>
        <p>
          위 식의 해는 x=0.6입니다. 함수 번호는 f1, f2처럼 구분합니다. f1(x)는
          x와 등록한 파라미터로 정의하고 x를 포함한 인수나 숫자로 호출합니다.
          다른 미지수 y를 넣으려면 별도로 정의하세요. 정의 뒤{' '}
          <code>f1(x)=0</code>은 방정식입니다.
        </p>
        <pre>
          {'f1 = 2x + y - 10\nf2 = x - y - 2\nf1 + f2 = 0\nf1 - f2 = 0'}
        </pre>
        <p>
          미지수를 혼합하려면 괄호 없는 수식 이름을 사용합니다. 함수 합성{' '}
          <code>f1(f2(x))</code>도 가능하며 순환 정의는 금지합니다.
        </p>
        <h4>Nonlinear 내장 함수</h4>
        <div
          className="guide-table-scroll"
          tabIndex={0}
          aria-label="지원 함수 표"
        >
          <table>
            <thead>
              <tr>
                <th>종류</th>
                <th>표기</th>
                <th>의미·정의역</th>
              </tr>
            </thead>
            <tbody>
              {functions.map(([kind, syntax, note]) => (
                <tr key={kind}>
                  <td>{kind}</td>
                  <td>
                    <code>{syntax}</code>
                  </td>
                  <td>{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h4>계산·시뮬레이션 읽기</h4>
        <p>
          조절할 상수는 파라미터에 등록합니다. 값은 연속 조절하며 샘플 포인트
          간격은 표·CSV·그래프 마커에만 적용합니다. 병합 세트는 여러 해를 색으로
          비교합니다. 범위·다른 고정 파라미터를 유지하면 현재값 조절로 기준
          곡선을 바꾸지 않습니다.
        </p>
        <p>
          자동 탐색은 유한한 수치 탐색이며 모든 실근을 보장하지 않습니다. ‘추적
          불가’는 실근 부재의 증명이 아닙니다. 접점 ‘확인됨’은 잔차와 도함수의
          국소 수치 검증이며 일반 Cusp 분기의 엄밀한 증명을 뜻하지 않습니다.
        </p>
        <p>
          기존 <code>f(x)=잔차식</code>은 호환용입니다. 고급 수동 모드에서{' '}
          <code>x(0)=1</code>, <code>x(min)=0</code>, <code>x(max)=10</code>으로
          초기값·범위를 지정할 수 있습니다. 새 함수 모델에는 번호 있는 표기를
          권장합니다.
        </p>
      </div>
    </section>
  )
}
```

<a id="source-5"></a>

## src/components/ExampleWalkthrough.tsx

원본: [src/components/ExampleWalkthrough.tsx](../../src/components/ExampleWalkthrough.tsx) · 32줄 · SHA-256: `bf3a9a6c4e717769e8f9a991d977d1e1e0f6cffa0eef5901431c1cf095dc1ea0`

```tsx
import type { NonlinearExample } from '../models'

export default function ExampleWalkthrough({
  example,
}: {
  example: NonlinearExample
}) {
  const guide = example.guide
  if (!guide) return null
  return (
    <details className="example-walkthrough">
      <summary>
        예제 관찰 안내 <span>{guide.features.join(' · ')}</span>
      </summary>
      <div>
        <p>{guide.context}</p>
        <ol>
          {guide.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <a href={guide.reference.url} target="_blank" rel="noreferrer">
          모형 배경: {guide.reference.label} ↗
        </a>
        <small>
          교과서 모형에 교육용 파라미터를 적용한 예제입니다. 접점 표시는 국소
          수치 검증이며 실제 장치·물질의 임계값을 뜻하지 않습니다.
        </small>
      </div>
    </details>
  )
}
```

<a id="source-6"></a>

## src/components/Guide.tsx

원본: [src/components/Guide.tsx](../../src/components/Guide.tsx) · 442줄 · SHA-256: `90933e856106205fb5aa321a03a1eb4d6bc300c4ec8aa44d1b37836d23f89463`

```tsx
import EquationReference from './EquationReference'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, BookOpen, Check, Lightbulb, X } from 'lucide-react'
import type { SolverMode } from '../models'
import './Guide.css'

export default function Guide({
  mode = 'linear',
  onClose,
}: {
  mode?: SolverMode
  onClose: () => void
}) {
  const dialog = useRef<HTMLDivElement>(null)
  const nonlinear = mode === 'nonlinear'
  const [page, setPage] = useState<'reference' | 'usage'>('reference')

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab' || !dialog.current) return
      const focusable = Array.from(
        dialog.current.querySelectorAll<HTMLElement>(
          'button, a[href], input, select, textarea, [tabindex="0"]',
        ),
      ).filter((element) => element.getClientRects().length > 0)
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === dialog.current)
      ) {
        event.preventDefault()
        last?.focus()
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          document.activeElement === dialog.current)
      ) {
        event.preventDefault()
        first?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
      previousFocus?.focus()
    }
  }, [onClose])

  return (
    <div
      className="guide-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="guide-dialog"
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
        tabIndex={-1}
      >
        <header className="guide-header">
          <div className="guide-book">
            <BookOpen size={22} />
          </div>
          <button
            className="guide-close"
            onClick={onClose}
            aria-label="사용 가이드 닫기"
          >
            <X size={21} />
          </button>
          <p className="guide-eyebrow">
            EQUATION SOLVER · {nonlinear ? 'NONLINEAR' : 'LINEAR'}
          </p>
          <h2 id="guide-title">
            {nonlinear
              ? '식을 적고, 발견한 해를 비교하세요.'
              : '수식을 쓰는 것부터 시작하세요.'}
          </h2>
          <p>복잡한 코딩 없이, 익숙한 수학 문법으로 모델을 만듭니다.</p>
        </header>

        <nav className="guide-navigation" aria-label="가이드 내용">
          <button
            type="button"
            aria-pressed={page === 'reference'}
            onClick={() => setPage('reference')}
          >
            함수·문법
          </button>
          <button
            type="button"
            aria-pressed={page === 'usage'}
            onClick={() => setPage('usage')}
          >
            사용 방법
          </button>
        </nav>
        <div className="guide-content" key={page}>
          {page === 'reference' ? (
            <EquationReference />
          ) : (
            <>
              <section className="guide-section">
                <span className="guide-step">01</span>
                <div>
                  <h3>필요한 화면부터 열어보세요</h3>
                  <p>
                    첫 화면의 <strong>Equation Solver</strong> 카드를 누르면
                    계산기를 엽니다. 준비 중인 모듈은 아직 계산할 수 없습니다.
                  </p>
                  <p>
                    <strong>수식·파라미터</strong>에서 식과 범위·간격을
                    설정하고, <strong>시뮬레이션</strong>에서 해와 그래프를
                    탐색하세요. <strong>해석 리포트</strong>에서는 수치 검증과
                    상세 결과를 확인합니다. 화면 이동은 작성한 모델과 선택한
                    해를 지우지 않습니다.
                  </p>
                  <p className="guide-small">
                    상단의 화면 이동 버튼으로 작업을 바꾸고, 모듈 홈으로 돌아갈
                    수 있습니다. Linear와 Nonlinear 유형은 수식·파라미터
                    화면에서 선택합니다.
                  </p>
                </div>
              </section>

              <section className="guide-section">
                <span className="guide-step">02</span>
                <div>
                  <h3>
                    {nonlinear
                      ? '방정식을 그대로 입력하세요'
                      : '한 줄에 방정식 하나'}
                  </h3>
                  {nonlinear ? (
                    <>
                      <p>
                        <code>x^2 = 4</code>처럼 익숙한 등식으로 적으면 자동으로
                        실수 해를 탐색합니다. 기본 모드에는 초기값이나 min/max를
                        입력하지 않아도 됩니다.
                      </p>
                      <pre className="guide-code">
                        <span># 발견한 실수 해 -2, 2를 함께 확인합니다</span>
                        {'\n'}x^2 = 4
                      </pre>
                      <p className="guide-small">
                        <code>f(x) = x^2 - 4</code> 같은 잔차식도 사용할 수
                        있습니다. 자동 탐색은 실수 해만 다룹니다. 복소수
                        계산기는 이후 별도 기능으로 제공할 예정입니다.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        모르는 값은 문자로, 알고 있는 값은 숫자로 적으세요. 양쪽
                        모두에 미지수가 있어도 괜찮습니다.
                      </p>
                      <pre className="guide-code">
                        <span># 두 식, 두 미지수</span>
                        {'\n'}2x + 3y = 12{'\n'}4x = 5 + y
                      </pre>
                    </>
                  )}
                  <div className="guide-rule">
                    <Check size={14} />
                    <span>
                      <code>2x</code>와 <code>2*x</code>는 같은 뜻입니다.
                    </span>
                  </div>
                  {!nonlinear && (
                    <p className="guide-small">
                      <code>2*(x + y)</code> 같은 괄호와 <code>x/2</code>처럼
                      알려진 값으로 나누기도 지원합니다. 미지수끼리 곱하거나
                      제곱하는 식은 Nonlinear 탭에서 입력하세요.
                    </p>
                  )}
                </div>
              </section>

              <section className="guide-section">
                <span className="guide-step">03</span>
                <div>
                  {nonlinear ? (
                    <>
                      <h3>여러 해를 목록에서 선택하세요</h3>
                      <p>
                        연립식은 한 줄씩 적거나 쉼표·세미콜론으로 나눕니다.
                        미지수 수와 독립적인 식 수를 맞추면 여러 시작점을
                        자동으로 시도합니다. 시뮬레이션 화면의 발견한 해
                        목록에서 해를 선택하고, 시뮬레이션 추가로 여러 창을 열어
                        비교하세요. 선택한 해의 자세한 계산 결과는 해석
                        리포트에서 볼 수 있습니다.
                      </p>
                      <pre className="guide-code">
                        <span># 원과 직선의 교점을 자동으로 탐색합니다</span>
                        {'\n'}x^2 + y^2 = 25{'\n'}x - y = 1
                      </pre>
                      <p className="guide-small">
                        일반 함수는 기본 -100~100 영역을 탐색하며, 지원되는 단일
                        다항식은 계수에서 탐색 범위를 잡습니다. 실제 사용한
                        범위와 방법은 결과에 표시됩니다. 필요하면 ‘고급 탐색
                        설정’에서 자동 탐색 범위를 바꿀 수 있습니다.
                      </p>
                      <p className="guide-small">
                        결과는 <strong>발견한 실수 해</strong>입니다. 유한한
                        수치 탐색으로 모든 해를 찾았거나 해가 없음을 보장하지는
                        않습니다.
                        <code>sin(x) = 0</code>처럼 해가 무한히 많은 식도
                        있습니다. 0에 가까운 해부터 최대 32개를 표시하며 제한에
                        도달하면 안내합니다. 같은 거리에서는 양수 해가 먼저
                        나옵니다.
                      </p>
                    </>
                  ) : (
                    <>
                      <h3>미지수와 파라미터를 구분해요</h3>
                      <p>
                        <strong>미지수</strong>는 계산으로 구할 값입니다.{' '}
                        <strong>파라미터</strong>는 내가 조절하는 알려진 값으로,
                        파라미터 패널에 추가합니다.
                      </p>
                      <div className="guide-equation">
                        <code>x + y = F</code>
                        <ArrowRight size={17} />
                        <span>
                          <b>x, y</b>를 구하고 <b>F</b>를 조절해요
                        </span>
                      </div>
                      <p className="guide-small">
                        파라미터로 등록하지 않은 문자는 모두 미지수입니다.
                        이름은 영문자로 시작하고 영문·숫자·밑줄(_)을 사용하세요.
                        대소문자를 구분합니다.
                      </p>
                    </>
                  )}
                </div>
              </section>

              <section className="guide-section">
                <span className="guide-step">함수</span>
                <div>
                  <h3>번호를 붙인 함수를 정의하고 조합하세요</h3>
                  <pre>
                    {'f1(x) = 2x + 4\nf2(x) = -3x + 7\nf1(x) - f2(x) = 0'}
                  </pre>
                  <p>
                    x에 대한 함수는 f1(x), f2(x)처럼 적습니다. 등록한 파라미터
                    외의 다른 미지수를 혼합하려면 <code>f1 = 2x + y - 10</code>
                    처럼 괄호 없이 정의하고, <code>f1 + f2 = 0</code>처럼 식을
                    만드세요. 기존의 단독 f(x) 잔차 표기는 호환성을 위해
                    유지합니다.
                  </p>
                  <p>
                    파라미터 값은 연속적으로 조절합니다. <b>샘플 포인트 간격</b>
                    은 표와 그래프의 샘플 마커 간격이며 슬라이더의 이동 폭을
                    제한하지 않습니다. 여러 해를 함께 보려면 시뮬레이션 화면의
                    병합 세트 추가를 누르세요. 각 세트의 해는 칩으로 선택하며,
                    경계·병합 표시는 수치적 추정입니다.
                  </p>
                </div>
              </section>
              {nonlinear && (
                <section className="guide-section">
                  <span className="guide-step">04</span>
                  <div>
                    <h3>파라미터와 보조식으로 모델을 나누세요</h3>
                    <p>
                      조절할 상수는 파라미터 패널에 추가합니다. 일반 등식에서
                      <code>y = 2</code>도 풀어야 할 조건으로 취급합니다.
                      보조식이 필요하면 <code>f(x) = h - target</code>과
                      <code>h = ln(x)</code>를 함께 적으세요. f 형식의
                      모델에서는 h를 보조식으로 계산하고, target은 패널의
                      파라미터입니다.
                    </p>
                    <p className="guide-small">
                      보조식의 입력 순서는 자유롭지만 서로 순환해서 참조할 수
                      없습니다. 이름을 미지수나 파라미터와 중복해서 정의하지
                      마세요. 이름은 영문자로 시작하고 영문·숫자·밑줄(_)을
                      사용하며, 대소문자를 구분합니다.
                    </p>
                    <p className="guide-small">
                      <code>ln(x)</code>는 자연로그, <code>log(x)</code>는 밑이
                      10인 상용로그입니다. <code>sqrt(x)</code>,{' '}
                      <code>exp(x)</code>, <code>sin(x)</code> 등도 사용할 수
                      있습니다. 로그·제곱근의 정의역을 벗어난 계산 지점은 자동
                      탐색에서 제외합니다.
                    </p>
                    <details className="guide-small">
                      <summary>고급 옵션: 초기조건으로 한 해 찾기</summary>
                      <p>
                        ‘고급 탐색 설정 → 해 탐색 방식’에서 수동 모드를 선택하면
                        기존 Polymath 형식을 사용할 수 있습니다. 단일근에는
                        <code>x(min)</code>·<code>x(max)</code>, 연립식에는 각
                        변수의 <code>x(0)</code> 초기 추정값을 적습니다.
                        명시식만 계산하는 NLE0도 수동 모드에서 사용합니다.
                      </p>
                    </details>
                  </div>
                </section>
              )}

              <section className="guide-section">
                <span className="guide-step">{nonlinear ? '05' : '04'}</span>
                <div>
                  <h3>슬라이더와 그래프로 값을 선택하세요</h3>
                  <p>
                    범위와 간격은 수식·파라미터 화면에서, 실제 값은 시뮬레이션
                    화면의 슬라이더나 숫자 입력으로 조절합니다. 화면 확대 버튼을
                    누르면 더 큰 그래프와 값 조절을 함께 사용할 수 있습니다.
                  </p>
                  <p>
                    그래프는 선택한 탐색 변수의 범위에서 해가 어떻게 달라지는지
                    보여줍니다. 같은 기준 해와 설정에서 탐색 변수의 현재값만
                    바꾸면 곡선은 유지되고 현재 점만 이동합니다. 다른 고정
                    파라미터나 선택한 해, 범위를 바꾸면 곡선도 달라질 수
                    있습니다.
                  </p>
                  <p>
                    마우스를 움직이면 표시한 곡선을 따라 탐색 점이 부드럽게
                    이동합니다.{' '}
                    <strong>
                      그래프를 클릭하면 해당 가로축 값을 실제 파라미터로 적용
                    </strong>
                    합니다. 마우스를 치워도 선택한 현재값은 유지되며, 해는 그
                    값으로 다시 계산합니다.
                  </p>
                  <p className="guide-small">
                    데이터 표와 CSV는 설정한 간격을 따릅니다. 예를 들어 0.2~0.8,
                    간격 0.01이면 61행입니다. 마우스 탐색 점의 곡선 보간값과
                    표의 직접 계산값은 다를 수 있습니다. 표에서는 가장 가까운
                    계산 행을 표시하며, 표의 간격을 화면 움직임에 맞춰 바꾸지는
                    않습니다. 유효하지 않은 구간을 가로질러 선을 연결하지도
                    않습니다.
                  </p>
                  <p className="guide-small">
                    그래프를 클릭하여 초점을 둔 뒤 휠을 움직이면 축을 점진적으로
                    확대·축소합니다. <strong>그래프 확대 축</strong>에서
                    양축·X축·Y축을 선택하고 <strong>축 초기화</strong>로 원래
                    범위를 복원하세요. 축 조정은 표시 비율만 바꾸며 계산한 해나
                    표는 바꾸지 않습니다. 초점이 없는 그래프 위에서는 일반
                    페이지 스크롤을 유지합니다.
                  </p>
                  <p className="guide-small">
                    키보드로는 좌우 방향키와 Home/End로 표의 지점을 탐색하고,
                    Enter/Space로 값을 적용합니다. +/−는 확대·축소, 0은 축
                    초기화입니다.
                  </p>
                  <p className="guide-small">
                    최댓값은 항상 마지막 행에 포함하므로 마지막 구간만 짧을 수
                    있습니다. 데이터가 {nonlinear ? '500' : '2,000'}행을 넘으면
                    간격이나 범위를 조정하세요. 이 시뮬레이션은 정상상태
                    파라미터 분석이며 시간에 따른 적분은 아닙니다.
                  </p>
                  {nonlinear && (
                    <p className="guide-small">
                      시뮬레이션 추가로 최대 6개 해의 창을 동시에 열 수
                      있습니다. 파라미터 값은 모든 창에 함께 적용되며, 각 창은
                      추가한 시점의 기준 해에서 이어 풉니다. 이는 수치적
                      추적이며 모든 분기를 찾아내거나 분기점에서 같은 가지를
                      유지한다고 보장할 수는 없습니다. 찾지 못한 지점은 숫자를
                      만들어 채우지 않고 표와 그래프에 빈 결과로 표시합니다.
                      CSV는 현재 선택한 해의 데이터입니다.
                    </p>
                  )}
                </div>
              </section>

              <section className="guide-section">
                <span className="guide-step">{nonlinear ? '06' : '05'}</span>
                <div>
                  <h3>조건수로 해의 민감도를 살펴보세요</h3>
                  <p>
                    해석 리포트에서 ∞-norm 또는 2-norm(SVD)을 선택할 수
                    있습니다. 조건수가 클수록 입력의 작은 오차가 해에 크게
                    영향을 줄 수 있습니다.
                  </p>
                  {nonlinear && (
                    <p className="guide-small">
                      비선형 모델에서는 찾은 해 근처의 Jacobian 행렬로 계산한
                      국소 조건수입니다. 미지수가 하나면 0이 아닌 미분값의 행렬
                      조건수는 1이므로, 이것만으로 전체 구간의 안정성이나 수렴을
                      판단할 수 없습니다. 잔차와 식의 단위도 함께 확인하세요.
                    </p>
                  )}
                  <p className="guide-small">
                    초록 ‘안정’은 10⁴ 미만, 노랑 ‘민감’은 10⁴ 이상~10⁸ 미만,
                    주황 ‘매우 민감’은 10⁸ 이상입니다. 참고 범위이므로 측정
                    오차와 단위도 함께 확인하세요.
                  </p>
                  <p className="guide-small">
                    2-norm은 다른 기준으로 민감도를 측정하는 도구이며,
                    선택한다고 해 자체의 정밀도가 높아지는 것은 아닙니다. 자세한
                    계산 방식은 리포트에서 확인할 수 있습니다.
                  </p>
                </div>
              </section>

              <div className="guide-note">
                <Lightbulb size={19} />
                <div>
                  <h4>
                    {nonlinear
                      ? '탐색 결과와 물리적 의미를 함께 확인하세요'
                      : '모델을 직접 구성하세요'}
                  </h4>
                  <p>
                    {nonlinear
                      ? '작은 잔차는 해당 식을 잘 만족한다는 뜻입니다. 발견한 해가 실제 모델에서 가능한 값인지 확인하세요. 예를 들어 음수 농도는 수학적 해여도 실제 운전 조건으로는 적합하지 않을 수 있습니다. 탐색 범위를 넓혀 다른 해가 있는지도 확인할 수 있습니다.'
                      : 'Linear는 빈 계산기로 시작합니다. 독립적인 방정식 수와 미지수 수를 맞추고, 조절할 상수는 파라미터로 추가하세요.'}{' '}
                    <code>#</code> 뒤에는 메모를 적을 수 있습니다. Differential
                    Equation Solver 등 다른 큰 카테고리는 추후 추가될
                    예정입니다.
                  </p>
                </div>
              </div>
              <p className="guide-privacy">
                계산은 브라우저의 Web Worker와 WebAssembly에서 실행됩니다.
                모델은 외부 서버로 전송되지 않습니다.
              </p>
            </>
          )}
        </div>
        <footer className="guide-footer">
          <button onClick={onClose}>
            작업으로 돌아가기 <ArrowRight size={16} />
          </button>
        </footer>
      </div>
    </div>
  )
}
```

<a id="source-7"></a>

## src/components/Guide.css

원본: [src/components/Guide.css](../../src/components/Guide.css) · 369줄 · SHA-256: `d98998f04efaf08ca35acfdbe838234e3acb4032c651ff99c815119748026c40`

```css
.guide-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(20, 39, 35, 0.34);
  backdrop-filter: blur(5px);
}
.guide-dialog {
  width: 100%;
  max-width: 860px;
  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - 48px);
  overflow: hidden;
  background: #fffefb;
  border: 1px solid #e8ece5;
  border-radius: 22px;
  box-shadow: 0 24px 100px rgba(21, 43, 36, 0.2);
  outline: none;
  box-sizing: border-box;
  color: #243c35;
  font-family: inherit;
}
.guide-header {
  position: relative;
  padding: 24px 28px 20px;
  flex-shrink: 0;
  border-bottom: 1px solid #e8ece5;
  background: linear-gradient(145deg, #f0f7f1, #fffdf8);
  border-radius: 22px 22px 0 0;
}
.guide-book {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border: 1px solid #d3e6dd;
  border-radius: 13px;
  background: #e4f1e8;
  color: #087f74;
  margin-bottom: 20px;
}
.guide-close {
  position: absolute;
  top: 23px;
  right: 23px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: #6b7d73;
  cursor: pointer;
}
.guide-close:hover {
  background: #e7eee6;
  color: #203f34;
}
.guide-eyebrow {
  font-size: 10px !important;
  font-weight: 700;
  letter-spacing: 1.8px;
  color: #087f74 !important;
  margin: 0 0 9px !important;
}
.guide-header h2 {
  margin: 0 0 10px;
  font-size: 25px;
  letter-spacing: -1px;
  line-height: 1.4;
  font-weight: 650;
}
.guide-header > p:last-child {
  margin: 0;
  font-size: 13px;
  color: #768077;
  line-height: 1.8;
}
.guide-content {
  padding: 24px 28px 18px;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.guide-section {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 15px;
  margin-bottom: 25px;
}
.guide-step {
  padding-top: 2px;
  color: #98aba1;
  font:
    12px/1.8 ui-monospace,
    monospace;
  letter-spacing: 1px;
}
.guide-section h3 {
  font-size: 15px;
  margin: 0 0 8px;
  letter-spacing: -0.3px;
  font-weight: 650;
}
.guide-section p,
.guide-note p {
  font-size: 12px;
  line-height: 1.9;
  margin: 0 0 12px;
  color: #6d7a73;
  word-break: keep-all;
}
.guide-section strong {
  font-weight: 600;
  color: #3b5d4f;
}
.guide-code {
  margin: 13px 0 11px;
  padding: 16px 20px;
  border-radius: 11px;
  background: #f4f6f0;
  color: #315d4a;
  font:
    13px/1.9 ui-monospace,
    SFMono-Regular,
    Consolas,
    monospace;
  overflow: auto;
  border: 1px solid #e7ece2;
}
.guide-code span {
  color: #98a595;
  font-size: 11px;
}
.guide-rule {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  color: #6d7a73;
}
.guide-rule svg {
  color: #087f74;
}
.guide-content code {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}
.guide-equation {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  border: 1px solid #e6ece5;
  border-radius: 10px;
  padding: 15px 17px;
  margin: 12px 0;
  color: #638275;
}
.guide-equation > code {
  font-size: 14px;
  color: #087f74;
}
.guide-equation > span {
  font-size: 11px;
}
.guide-equation b {
  font-weight: 600;
  color: #3d5e50;
}
.guide-small {
  font-size: 11px !important;
  color: #89948c !important;
  margin-bottom: 0 !important;
}
.guide-small + .guide-small {
  margin-top: 9px;
}
.guide-note {
  display: flex;
  gap: 12px;
  background: #f6f3eb;
  border: 1px solid #ece8d9;
  border-radius: 12px;
  padding: 17px 18px;
  margin: 0 0 20px;
}
.guide-note > svg {
  flex: 0 0 auto;
  color: #b29a60;
  margin-top: 2px;
}
.guide-note h4 {
  font-size: 12px;
  font-weight: 600;
  margin: 0 0 7px;
  color: #7d704d;
}
.guide-note p {
  margin: 0;
  font-size: 11px;
  color: #8b8063;
}
.guide-privacy {
  font-size: 10px;
  line-height: 1.8;
  color: #96a097;
  text-align: center;
  margin: 0 0 6px;
}
.guide-footer {
  padding: 14px 28px;
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid #eff0e9;
}
.guide-footer button {
  display: flex;
  align-items: center;
  gap: 14px;
  border: 0;
  background: #087f74;
  color: white;
  font-family: inherit;
  font-size: 12px;
  font-weight: 550;
  border-radius: 9px;
  padding: 12px 17px;
  cursor: pointer;
}
.guide-footer button:hover {
  background: #06695f;
}
.guide-dialog button:focus-visible {
  outline: 3px solid #b4d8cb;
  outline-offset: 3px;
}
@media (max-width: 600px) {
  .guide-backdrop {
    padding: 12px;
  }
  .guide-dialog {
    max-height: calc(100dvh - 24px);
    border-radius: 16px;
  }
  .guide-header {
    padding: 24px;
  }
  .guide-header h2 {
    font-size: 22px;
  }
  .guide-content {
    padding: 24px;
  }
  .guide-section {
    gap: 9px;
    grid-template-columns: 24px minmax(0, 1fr);
  }
  .guide-footer {
    padding: 16px 24px 20px;
  }
}
.guide-section table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  line-height: 1.7;
}
.guide-section th,
.guide-section td {
  text-align: left;
  padding: 10px 8px;
  border-bottom: 1px solid #e3e9dd;
  vertical-align: top;
}
.guide-section pre {
  padding: 14px;
  overflow-x: auto;
  border-radius: 8px;
  background: #f2f6ed;
  line-height: 1.8;
}

.guide-section > div {
  min-width: 0;
}
.guide-section.guide-reference {
  display: block;
}
.guide-section h4 {
  margin: 24px 0 10px;
  font-size: 14px;
}
.guide-section ul {
  padding-left: 20px;
  font-size: 12px;
  line-height: 1.9;
  color: #52675b;
}
.guide-section li {
  margin-block: 8px;
  overflow-wrap: anywhere;
}
.guide-table-scroll {
  overflow-x: auto;
  max-width: 100%;
}
.guide-table-scroll table {
  min-width: 520px;
}
.guide-table-scroll th {
  color: #315d4a;
  background: #f4f6f0;
}
.guide-navigation {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 12px 28px;
  border-bottom: 1px solid #e8ece5;
  flex-shrink: 0;
}
.guide-navigation button {
  padding: 9px 14px;
  border: 1px solid #dbe4d9;
  border-radius: 8px;
  color: #52675b;
  background: #fff;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.guide-navigation button[aria-pressed='true'] {
  background: #e8f3ed;
  border-color: #a6cbb9;
  color: #146b5b;
}
@media (max-width: 600px) {
  .guide-header {
    padding: 16px 20px;
  }
  .guide-header h2 {
    font-size: 19px;
    padding-right: 20px;
  }
  .guide-book {
    display: none;
  }
  .guide-header > p:last-child {
    display: none;
  }
  .guide-navigation {
    padding: 10px 20px;
  }
  .guide-content {
    padding: 20px;
  }
  .guide-footer {
    padding: 12px 20px;
  }
}
```

<a id="source-8"></a>

## src/components/SolutionChart.tsx

원본: [src/components/SolutionChart.tsx](../../src/components/SolutionChart.tsx) · 1,089줄 · SHA-256: `c2aad936222049d12eec5c728a5ef4cc94c7d3e976fb3bbcd8399bce11f56250`

```tsx
import { tangencyLabel } from '../engine/tangency'
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import './SolutionChart.css'
import { fittedDomain, fraction, interpolate } from './chart-domain'
import {
  initialWindow,
  nearestPointIndex,
  pointOnCurve,
  wheelFactor,
  zoomWindow,
  type CurvePoint,
  type ZoomAxis,
} from './chart-interaction'
import type { BranchTerminalEvent } from '../engine'

export type MultiBranchSeries = {
  id: string
  label: string
  color: string
  points: CurvePoint[]
  samplePoints?: CurvePoint[]
  currentValues?: number[]
  events?: BranchTerminalEvent[]
}

export interface SolutionChartProps {
  modelKind?: 'linear' | 'nonlinear'
  expanded?: boolean
  points: CurvePoint[]
  selectionPoints?: CurvePoint[]
  variables: string[]
  parameterName: string
  currentParameter: number
  currentValues?: number[]
  selectedIndex: number | null
  onSelectIndex: (index: number | null) => void
  visibleVariables: string[]
  onToggleVariable: (name: string) => void
  onParameterChange?: (value: number) => void
  /** Terminal / bifurcation events (merge or disappearance) for single-branch view */
  events?: BranchTerminalEvent[]
  /** Optional multi-branch series for Merged Simulation Sets (병합 세트) */
  multiBranchSeries?: MultiBranchSeries[]
  /** When multiBranchSeries is provided, which variable index is plotted (default 0) */
  activeVariableIndex?: number
}

export const SERIES_COLORS = [
  '#087f74',
  '#df9963',
  '#4c6ef5',
  '#be4bdb',
  '#e67700',
  '#2b8a3e',
]

const MAX_WIDTH = 680
const EXPANDED_MAX_WIDTH = 1200
const MIN_WIDTH = 320
const HEIGHT = 290
const PLOT = { left: 51, right: 20, top: 24, bottom: 37 }

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '—'
  if (value === 0) return '0'
  const absolute = Math.abs(value)
  if (absolute >= 1e6 || absolute < 0.0001) return value.toExponential(2)
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(
    value,
  )
}

function axisNumber(value: number): string {
  if (value === 0) return '0'
  if (Math.abs(value) >= 1e5 || Math.abs(value) < 0.001)
    return value.toExponential(1)
  return Number(value.toPrecision(4)).toString()
}

export default function SolutionChart({
  modelKind = 'linear',
  expanded = false,
  points,
  selectionPoints,
  variables,
  parameterName,
  currentParameter,
  currentValues,
  selectedIndex,
  onSelectIndex,
  visibleVariables,
  onToggleVariable,
  onParameterChange,
  events = [],
  multiBranchSeries,
  activeVariableIndex = 0,
}: SolutionChartProps) {
  const titleId = useId()
  const descriptionId = useId()
  const clipId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [width, setWidth] = useState(MAX_WIDTH)
  const [hover, setHover] = useState<CurvePoint | null>(null)
  const [hoverParameter, setHoverParameter] = useState<number | null>(null)
  const [zoomAxis, setZoomAxis] = useState<ZoomAxis>('both')
  const [window, setWindow] = useState(initialWindow)
  const [zoomActive, setZoomActive] = useState(false)
  const [showSampleDots, setShowSampleDots] = useState(true)
  const frame = useRef<number | null>(null)
  const pointerParameter = useRef<number | null>(null)
  const selectionRef = useRef(selectedIndex)
  const selectionCallback = useRef(onSelectIndex)
  selectionRef.current = selectedIndex
  selectionCallback.current = onSelectIndex

  const isMultiBranch = Boolean(
    multiBranchSeries && multiBranchSeries.length > 0,
  )
  const height = expanded ? Math.min(520, Math.max(420, width * 0.48)) : HEIGHT
  const innerWidth = width - PLOT.left - PLOT.right
  const innerHeight = height - PLOT.top - PLOT.bottom

  const interactivePoints = selectionPoints?.length ? selectionPoints : points
  const curvePoints = useMemo(
    () =>
      points
        .filter((point) => Number.isFinite(point.parameter))
        .sort((a, b) => a.parameter - b.parameter),
    [points],
  )
  const samplePoints = useMemo(
    () =>
      (selectionPoints ?? []).filter(
        (point) =>
          Number.isFinite(point.parameter) &&
          point.values &&
          point.values.some(Number.isFinite),
      ),
    [selectionPoints],
  )
  const coordinates = useMemo(
    () =>
      interactivePoints
        .map((point, index) => ({ parameter: point.parameter, index }))
        .filter((point) => Number.isFinite(point.parameter))
        .sort((a, b) => a.parameter - b.parameter),
    [interactivePoints],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const updateWidth = (measuredWidth: number) => {
      if (Number.isFinite(measuredWidth) && measuredWidth > 0) {
        setWidth(
          Math.min(
            expanded ? EXPANDED_MAX_WIDTH : MAX_WIDTH,
            Math.max(MIN_WIDTH, Math.round(measuredWidth)),
          ),
        )
      }
    }
    updateWidth(container.getBoundingClientRect().width)
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) updateWidth(entries[0].contentRect.width)
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [expanded])

  const visible = variables
    .map((name, index) => ({ name, index }))
    .filter(({ name }) => visibleVariables.includes(name))

  const baseChart = useMemo(() => {
    if (isMultiBranch && multiBranchSeries) {
      const allParams: number[] = []
      const values: number[] = []
      multiBranchSeries.forEach((branch) => {
        if (!visibleVariables.includes(branch.id)) return
        branch.points.forEach((pt) => {
          if (Number.isFinite(pt.parameter)) allParams.push(pt.parameter)
          const v = pt.values?.[activeVariableIndex]
          if (typeof v === 'number' && Number.isFinite(v)) values.push(v)
        })
      })
      if (!allParams.length) return null
      let minX = Math.min(...allParams)
      let maxX = Math.max(...allParams)
      if (minX === maxX) {
        const padding = Math.abs(minX) * 0.1 || 0.5
        minX -= padding
        maxX += padding
      }
      const [minY, maxY, yTicks] = fittedDomain(values)
      return { minX, maxX, minY, maxY, yTicks, hasData: values.length > 0 }
    }

    if (!curvePoints.length) return null
    let minX = curvePoints[0].parameter
    let maxX = curvePoints.at(-1)!.parameter
    if (minX === maxX) {
      const padding = Math.abs(minX) * 0.1 || 0.5
      if (Number.isFinite(minX - padding)) minX -= padding
      if (Number.isFinite(maxX + padding)) maxX += padding
    }
    const values: number[] = []
    curvePoints.forEach((point) => {
      variables.forEach((name, index) => {
        const value = point.values?.[index]
        if (
          visibleVariables.includes(name) &&
          typeof value === 'number' &&
          Number.isFinite(value)
        )
          values.push(value)
      })
    })
    const [minY, maxY, yTicks] = fittedDomain(values)
    return { minX, maxX, minY, maxY, yTicks, hasData: values.length > 0 }
  }, [
    isMultiBranch,
    multiBranchSeries,
    activeVariableIndex,
    curvePoints,
    variables,
    visibleVariables,
  ])

  const chart = useMemo(() => {
    if (!baseChart) return null
    const minX = interpolate(baseChart.minX, baseChart.maxX, window.x[0])
    const maxX = interpolate(baseChart.minX, baseChart.maxX, window.x[1])
    const minY = interpolate(baseChart.minY, baseChart.maxY, window.y[0])
    const maxY = interpolate(baseChart.minY, baseChart.maxY, window.y[1])
    if (
      ![minX, maxX, minY, maxY].every(Number.isFinite) ||
      minX >= maxX ||
      minY >= maxY
    )
      return baseChart
    return {
      ...baseChart,
      minX,
      maxX,
      minY,
      maxY,
      yTicks:
        window.y[0] === 0 && window.y[1] === 1
          ? baseChart.yTicks
          : Array.from({ length: 5 }, (_, i) => interpolate(minY, maxY, i / 4)),
    }
  }, [baseChart, window])

  const modelDomainKey = `${parameterName}|${variables.join('|')}|${baseChart?.minX}|${baseChart?.maxX}`
  useEffect(() => {
    setWindow(initialWindow())
    setHover(null)
    setHoverParameter(null)
  }, [modelDomainKey])
  useEffect(() => {
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    }
  }, [])

  const activeIndex =
    selectedIndex !== null &&
    selectedIndex >= 0 &&
    selectedIndex < interactivePoints.length
      ? selectedIndex
      : nearestPointIndex(coordinates, currentParameter)
  const activePoint =
    hover ??
    (selectedIndex !== null ? interactivePoints[activeIndex] : undefined)
  const activeParam = hoverParameter ?? activePoint?.parameter ?? null
  const hasSelection =
    hover !== null || hoverParameter !== null || selectedIndex !== null
  const x = (value: number) =>
    PLOT.left + fraction(value, chart!.minX, chart!.maxX) * innerWidth
  const y = (value: number) =>
    PLOT.top +
    innerHeight -
    fraction(value, chart!.minY, chart!.maxY) * innerHeight
  const currentInDomain =
    chart &&
    Number.isFinite(currentParameter) &&
    currentParameter >= chart.minX &&
    currentParameter <= chart.maxX
  const selectedInDomain =
    chart &&
    activeParam !== null &&
    Number.isFinite(activeParam) &&
    activeParam >= chart.minX &&
    activeParam <= chart.maxX

  function localPointer(svg: SVGSVGElement, clientX: number, clientY: number) {
    const matrix = svg.getScreenCTM()
    if (matrix) {
      const point = svg.createSVGPoint()
      point.x = clientX
      point.y = clientY
      return point.matrixTransform(matrix.inverse())
    }
    const rect = svg.getBoundingClientRect()
    if (!rect.width || !rect.height) return null
    return {
      x: ((clientX - rect.left) / rect.width) * width,
      y: ((clientY - rect.top) / rect.height) * height,
    }
  }
  function pointerValue(svg: SVGSVGElement, clientX: number, clientY: number) {
    if (!chart) return null
    const local = localPointer(svg, clientX, clientY)
    if (
      !local ||
      local.x < PLOT.left ||
      local.x > width - PLOT.right ||
      local.y < PLOT.top ||
      local.y > height - PLOT.bottom
    )
      return null
    const xRatio = (local.x - PLOT.left) / innerWidth
    const yRatio = 1 - (local.y - PLOT.top) / innerHeight
    return {
      parameter: interpolate(chart.minX, chart.maxX, xRatio),
      xRatio,
      yRatio,
    }
  }
  function selectNearest(parameter: number) {
    const index = nearestPointIndex(coordinates, parameter)
    if (index >= 0 && selectionRef.current !== index) {
      selectionRef.current = index
      selectionCallback.current(index)
    }
  }
  function clearHover() {
    pointerParameter.current = null
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
    setHover(null)
    setHoverParameter(null)
    if (selectionRef.current !== null) {
      selectionRef.current = null
      selectionCallback.current(null)
    }
  }
  function handlePointer(event: PointerEvent<SVGSVGElement>) {
    const point = pointerValue(
      event.currentTarget,
      event.clientX,
      event.clientY,
    )
    if (!point) {
      clearHover()
      return
    }
    pointerParameter.current = point.parameter
    if (frame.current !== null) return
    frame.current = requestAnimationFrame(() => {
      frame.current = null
      const parameter = pointerParameter.current
      if (parameter === null) return
      setHoverParameter(parameter)
      if (!isMultiBranch) {
        setHover(
          pointOnCurve(curvePoints, parameter) ?? {
            parameter,
            values: null,
            error: '표시된 탐색 범위 밖입니다.',
          },
        )
      }
      selectNearest(parameter)
    })
  }
  function handleClick(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return
    event.currentTarget.focus()
    const point = pointerValue(
      event.currentTarget,
      event.clientX,
      event.clientY,
    )
    if (!point || !baseChart) return
    const parameter = Math.min(
      baseChart.maxX,
      Math.max(baseChart.minX, point.parameter),
    )
    setHoverParameter(parameter)
    if (!isMultiBranch) {
      setHover(pointOnCurve(curvePoints, parameter))
    }
    selectNearest(parameter)
    onParameterChange?.(parameter)
  }

  const wheelHandler = useRef<(event: WheelEvent) => void>(() => {})
  wheelHandler.current = (event) => {
    const svg = svgRef.current
    if (!svg || document.activeElement !== svg || !zoomActive) return
    const point = pointerValue(svg, event.clientX, event.clientY)
    if (!point) return
    event.preventDefault()
    setWindow((previous) =>
      zoomWindow(
        previous,
        zoomAxis,
        point.xRatio,
        point.yRatio,
        wheelFactor(event.deltaY, event.deltaMode),
      ),
    )
    clearHover()
  }
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const handler = (event: WheelEvent) => wheelHandler.current(event)
    svg.addEventListener('wheel', handler, { passive: false })
    return () => svg.removeEventListener('wheel', handler)
  }, [])

  function handleKey(event: KeyboardEvent<SVGSVGElement>) {
    if (!interactivePoints.length) return
    const current = activeIndex < 0 ? 0 : activeIndex
    let index = current
    if (event.key === 'ArrowLeft') index = Math.max(0, current - 1)
    else if (event.key === 'ArrowRight')
      index = Math.min(interactivePoints.length - 1, current + 1)
    else if (event.key === 'Home') index = 0
    else if (event.key === 'End') index = interactivePoints.length - 1
    else if (event.key === 'Enter' || event.key === ' ') {
      if (activeParam !== null) onParameterChange?.(activeParam)
      event.preventDefault()
      return
    } else if (event.key === '+' || event.key === '=' || event.key === '-') {
      event.preventDefault()
      setWindow((previous) =>
        zoomWindow(
          previous,
          zoomAxis,
          0.5,
          0.5,
          event.key === '-' ? 1.2 : 1 / 1.2,
        ),
      )
      return
    } else if (event.key === '0') {
      event.preventDefault()
      setWindow(initialWindow())
      return
    } else if (event.key === 'Escape') {
      clearHover()
      return
    } else return
    event.preventDefault()
    setHover(null)
    setHoverParameter(null)
    onSelectIndex(index)
  }

  const curvePaths = useMemo(() => {
    if (!chart) return []
    if (isMultiBranch && multiBranchSeries) {
      return multiBranchSeries.map((branch) => {
        let path = ''
        let connected = false
        const sortedPts = [...branch.points]
          .filter((p) => Number.isFinite(p.parameter))
          .sort((a, b) => a.parameter - b.parameter)
        sortedPts.forEach((point) => {
          const value = point.values?.[activeVariableIndex]
          if (typeof value !== 'number' || !Number.isFinite(value)) {
            connected = false
            return
          }
          const px =
            PLOT.left +
            fraction(point.parameter, chart.minX, chart.maxX) * innerWidth
          const py =
            PLOT.top +
            innerHeight -
            fraction(value, chart.minY, chart.maxY) * innerHeight
          path += `${connected ? 'L' : 'M'}${px.toFixed(3)},${py.toFixed(3)} `
          connected = true
        })
        return path
      })
    }
    return variables.map((_, variableIndex) => {
      let path = ''
      let connected = false
      curvePoints.forEach((point) => {
        const value = point.values?.[variableIndex]
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          connected = false
          return
        }
        const px =
          PLOT.left +
          fraction(point.parameter, chart.minX, chart.maxX) * innerWidth
        const py =
          PLOT.top +
          innerHeight -
          fraction(value, chart.minY, chart.maxY) * innerHeight
        path += `${connected ? 'L' : 'M'}${px.toFixed(3)},${py.toFixed(3)} `
        connected = true
      })
      return path
    })
  }, [
    isMultiBranch,
    multiBranchSeries,
    activeVariableIndex,
    curvePoints,
    variables,
    chart,
    innerWidth,
    innerHeight,
  ])

  const allBifurcationEvents = useMemo(() => {
    if (isMultiBranch && multiBranchSeries) {
      const list: BranchTerminalEvent[] = []
      const seen = new Set<string>()
      multiBranchSeries.forEach((branch) => {
        if (!visibleVariables.includes(branch.id)) return
        for (const ev of branch.events ?? []) {
          const key = `${ev.kind}|${ev.direction}|${ev.parameter.toPrecision(5)}|${(ev.tangency?.verified ? ev.tangency.valuesStar : ev.values)[activeVariableIndex]?.toPrecision(4)}`
          if (!seen.has(key)) {
            seen.add(key)
            list.push(ev)
          }
        }
      })
      return list
    }
    return events
  }, [
    isMultiBranch,
    multiBranchSeries,
    visibleVariables,
    activeVariableIndex,
    events,
  ])

  const emptyMessage =
    !points.length && !isMultiBranch
      ? '모델을 계산하면 파라미터에 따른 해의 변화를 볼 수 있어요.'
      : !visibleVariables.length
        ? '위의 범례 버튼을 눌러 그래프에 표시할 곡선을 선택해 보세요.'
        : modelKind === 'nonlinear'
          ? '이 범위에는 선택한 해의 유효한 계산 결과가 없어요. 파라미터 범위를 조절해 보세요.'
          : '이 범위에는 유일한 해가 없어요. 파라미터 범위를 조절해 보세요.'

  return (
    <div
      className={`solution-chart${expanded ? ' is-expanded' : ''}`}
      ref={containerRef}
    >
      <div className="sc-legend-row">
        <div className="sc-legend" aria-label="그래프에 표시할 항목">
          {isMultiBranch && multiBranchSeries
            ? multiBranchSeries.map((branch) => (
                <button
                  key={branch.id}
                  type="button"
                  className={`sc-legend-button ${visibleVariables.includes(branch.id) ? 'is-visible' : ''}`}
                  aria-pressed={visibleVariables.includes(branch.id)}
                  aria-label={`${branch.label} 곡선 표시`}
                  onClick={() => onToggleVariable(branch.id)}
                >
                  <span
                    className="sc-legend-dot"
                    style={{ background: branch.color }}
                  />
                  <span>{branch.label}</span>
                </button>
              ))
            : variables.map((name, index) => (
                <button
                  key={name}
                  type="button"
                  className={`sc-legend-button ${visibleVariables.includes(name) ? 'is-visible' : ''}`}
                  aria-pressed={visibleVariables.includes(name)}
                  aria-label={`${name} 곡선 표시`}
                  onClick={() => onToggleVariable(name)}
                >
                  <span
                    className="sc-legend-dot"
                    style={{
                      background: SERIES_COLORS[index % SERIES_COLORS.length],
                    }}
                  />
                  <span>{name}</span>
                </button>
              ))}
        </div>
        <span className="sc-explore-hint">
          연속 탐색 · 샘플 포인트 마커 표시 · 클릭으로 파라미터 적용
        </span>
      </div>

      <div className="sc-view-controls">
        <span className={`sc-zoom-hint${zoomActive ? ' is-active' : ''}`}>
          {zoomActive ? '휠로 축 확대·축소' : '그래프 클릭 후 휠로 확대·축소'}
        </span>
        <label className="sc-sample-toggle">
          <input
            type="checkbox"
            checked={showSampleDots}
            onChange={(e) => setShowSampleDots(e.target.checked)}
          />
          샘플 포인트 표시
        </label>
        <label>
          확대 축
          <select
            aria-label="그래프 확대 축"
            value={zoomAxis}
            onChange={(event) => setZoomAxis(event.target.value as ZoomAxis)}
          >
            <option value="both">양축</option>
            <option value="x">X축</option>
            <option value="y">Y축</option>
          </select>
        </label>
        <button
          type="button"
          className="sc-reset-view"
          onClick={() => {
            setWindow(initialWindow())
            clearHover()
          }}
          aria-label="그래프 축 초기화"
        >
          축 초기화
        </button>
      </div>

      <div className="sc-stage">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          tabIndex={0}
          aria-labelledby={`${titleId} ${descriptionId}`}
          onPointerMove={handlePointer}
          onPointerDown={handleClick}
          onPointerLeave={clearHover}
          onFocus={() => setZoomActive(true)}
          onBlur={() => {
            setZoomActive(false)
            clearHover()
          }}
          onKeyDown={handleKey}
        >
          <title id={titleId}>
            {`${parameterName}에 따른 ${modelKind === 'nonlinear' ? '비선형' : '선형'} 방정식 해의 변화`}
          </title>
          <desc id={descriptionId}>
            파라미터는 연속적으로 움직이며 설정한 샘플 포인트 간격마다 그래프
            위에 샘플 마커가 표시됩니다. 해가 병합되거나 소멸하는 분기점은 경계
            마커로 표시됩니다.
          </desc>
          <defs>
            <clipPath id={clipId}>
              <rect
                x={PLOT.left}
                y={PLOT.top}
                width={innerWidth}
                height={innerHeight}
              />
            </clipPath>
          </defs>

          {chart && (
            <>
              <text x={PLOT.left} y="12" className="sc-axis-caption">
                {isMultiBranch
                  ? `${variables[activeVariableIndex] ?? '해'}의 값`
                  : '해의 값'}
              </text>
              {chart.yTicks.map((tick, index) => (
                <g key={index}>
                  <line
                    x1={PLOT.left}
                    x2={width - PLOT.right}
                    y1={y(tick)}
                    y2={y(tick)}
                    className={
                      tick === 0 ? 'sc-grid-line sc-zero-line' : 'sc-grid-line'
                    }
                  />
                  <text
                    x={PLOT.left - 13}
                    y={y(tick) + 4}
                    textAnchor="end"
                    className="sc-axis-label"
                  >
                    {axisNumber(tick)}
                  </text>
                </g>
              ))}
              {Array.from({ length: 5 }, (_, index) => {
                const tick = interpolate(chart.minX, chart.maxX, index / 4)
                return (
                  <g key={index}>
                    <line
                      x1={x(tick)}
                      x2={x(tick)}
                      y1={PLOT.top}
                      y2={height - PLOT.bottom}
                      className="sc-grid-line sc-grid-vertical"
                    />
                    <text
                      x={x(tick)}
                      y={height - PLOT.bottom + 22}
                      textAnchor="middle"
                      className="sc-axis-label"
                    >
                      {axisNumber(tick)}
                    </text>
                  </g>
                )
              })}

              {/* 1. Render Continuous Curves */}
              {chart.hasData &&
                (isMultiBranch && multiBranchSeries
                  ? multiBranchSeries.map((branch, idx) =>
                      visibleVariables.includes(branch.id) ? (
                        <path
                          key={branch.id}
                          d={curvePaths[idx]}
                          stroke={branch.color}
                          className="sc-curve"
                          clipPath={`url(#${clipId})`}
                        />
                      ) : null,
                    )
                  : visible.map(({ name, index }) => (
                      <path
                        key={name}
                        d={curvePaths[index]}
                        stroke={SERIES_COLORS[index % SERIES_COLORS.length]}
                        className="sc-curve"
                        clipPath={`url(#${clipId})`}
                      />
                    )))}

              {/* 2. Render Sample Point Interval Markers on Curves */}
              {chart.hasData && showSampleDots && (
                <g clipPath={`url(#${clipId})`} className="sc-sample-dots">
                  {isMultiBranch && multiBranchSeries
                    ? multiBranchSeries.map((branch) =>
                        visibleVariables.includes(branch.id)
                          ? (branch.samplePoints ?? []).map((pt, sIdx) => {
                              const val = pt.values?.[activeVariableIndex]
                              if (
                                typeof val !== 'number' ||
                                !Number.isFinite(val)
                              )
                                return null
                              return (
                                <circle
                                  key={`${branch.id}-sample-${sIdx}`}
                                  cx={x(pt.parameter)}
                                  cy={y(val)}
                                  r="2.4"
                                  fill="#fff"
                                  stroke={branch.color}
                                  strokeWidth="1.5"
                                />
                              )
                            })
                          : null,
                      )
                    : samplePoints.map((pt, sIdx) =>
                        visible.map(({ name, index }) => {
                          const val = pt.values?.[index]
                          if (typeof val !== 'number' || !Number.isFinite(val))
                            return null
                          return (
                            <circle
                              key={`${name}-sample-${sIdx}`}
                              cx={x(pt.parameter)}
                              cy={y(val)}
                              r="2.4"
                              fill="#fff"
                              stroke={
                                SERIES_COLORS[index % SERIES_COLORS.length]
                              }
                              strokeWidth="1.5"
                            />
                          )
                        }),
                      )}
                </g>
              )}

              {/* 3. Render Bifurcation / Merge / Disappearance Markers */}
              {chart.hasData && allBifurcationEvents.length > 0 && (
                <g
                  clipPath={`url(#${clipId})`}
                  className="sc-bifurcation-markers"
                >
                  {allBifurcationEvents.map((ev, eIdx) => {
                    const val = isMultiBranch
                      ? (ev.tangency?.verified
                          ? ev.tangency.valuesStar
                          : ev.values)[activeVariableIndex]
                      : (ev.tangency?.verified
                          ? ev.tangency.valuesStar
                          : ev.values)[visible[0]?.index ?? 0]
                    if (typeof val !== 'number' || !Number.isFinite(val))
                      return null
                    const cx = x(
                      ev.tangency?.verified
                        ? ev.tangency.parameterStar
                        : ev.parameter,
                    )
                    const cy = y(val)
                    const isMerge = ev.kind === 'merge'
                    return (
                      <g key={`event-${eIdx}`}>
                        <line
                          x1={cx}
                          x2={cx}
                          y1={PLOT.top}
                          y2={height - PLOT.bottom}
                          stroke={isMerge ? '#d9480f' : '#e67700'}
                          strokeDasharray="2 3"
                          strokeWidth="1"
                          opacity="0.65"
                        />
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isMerge ? '5.5' : '4.5'}
                          fill={isMerge ? '#fff4e6' : '#fff9db'}
                          stroke={isMerge ? '#d9480f' : '#e67700'}
                          strokeWidth="2.2"
                        />
                        <title>{ev.description}</title>
                      </g>
                    )
                  })}
                </g>
              )}

              {/* 4. Render Current Continuous Parameter Line & Dots */}
              {chart.hasData && currentInDomain && (
                <g clipPath={`url(#${clipId})`}>
                  <line
                    x1={x(currentParameter)}
                    x2={x(currentParameter)}
                    y1={PLOT.top}
                    y2={height - PLOT.bottom}
                    className="sc-current-line"
                  />
                  {!hasSelection &&
                    (isMultiBranch && multiBranchSeries
                      ? multiBranchSeries.map((branch) => {
                          if (!visibleVariables.includes(branch.id)) return null
                          const value =
                            branch.currentValues?.[activeVariableIndex]
                          if (
                            typeof value !== 'number' ||
                            !Number.isFinite(value)
                          )
                            return null
                          return (
                            <circle
                              key={branch.id}
                              cx={x(currentParameter)}
                              cy={y(value)}
                              r="4.5"
                              fill={branch.color}
                              className="sc-active-dot sc-current-dot"
                            />
                          )
                        })
                      : currentValues &&
                        visible.map(({ name, index }) => {
                          const value = currentValues[index]
                          if (!Number.isFinite(value)) return null
                          return (
                            <circle
                              key={name}
                              cx={x(currentParameter)}
                              cy={y(value)}
                              r="4.5"
                              fill={SERIES_COLORS[index % SERIES_COLORS.length]}
                              className="sc-active-dot sc-current-dot"
                            />
                          )
                        }))}
                  <circle
                    cx={x(currentParameter)}
                    cy={height - PLOT.bottom}
                    r="3"
                    fill="#6c827d"
                  />
                </g>
              )}

              {/* 5. Render Hover / Selected Crosshair & Dots */}
              {chart.hasData &&
                hasSelection &&
                selectedInDomain &&
                activeParam !== null && (
                  <g clipPath={`url(#${clipId})`}>
                    <line
                      x1={x(activeParam)}
                      x2={x(activeParam)}
                      y1={PLOT.top}
                      y2={height - PLOT.bottom}
                      className="sc-crosshair"
                    />
                    {isMultiBranch && multiBranchSeries
                      ? multiBranchSeries.map((branch) => {
                          if (!visibleVariables.includes(branch.id)) return null
                          const pt = pointOnCurve(branch.points, activeParam)
                          const val = pt?.values?.[activeVariableIndex]
                          if (typeof val !== 'number' || !Number.isFinite(val))
                            return null
                          return (
                            <circle
                              key={branch.id}
                              cx={x(activeParam)}
                              cy={y(val)}
                              r="4.5"
                              fill={branch.color}
                              className="sc-active-dot"
                            />
                          )
                        })
                      : activePoint &&
                        visible.map(({ name, index }) => {
                          const value = activePoint.values?.[index]
                          if (
                            typeof value !== 'number' ||
                            !Number.isFinite(value)
                          )
                            return null
                          return (
                            <circle
                              key={name}
                              cx={x(activePoint.parameter)}
                              cy={y(value)}
                              r="4.5"
                              fill={SERIES_COLORS[index % SERIES_COLORS.length]}
                              className="sc-active-dot"
                            />
                          )
                        })}
                  </g>
                )}
            </>
          )}
        </svg>

        {(!chart?.hasData || !visibleVariables.length) && (
          <div className="sc-empty">
            <span>⌁</span>
            <p>{emptyMessage}</p>
          </div>
        )}

        {chart?.hasData &&
          hasSelection &&
          selectedInDomain &&
          activeParam !== null && (
            <div
              className="sc-tooltip"
              style={{
                left: `clamp(8px, ${(x(activeParam) / width) * 100 + 2}%, calc(100% - 175px))`,
              }}
            >
              <div className="sc-tooltip-heading">
                <span>{parameterName}</span>
                <strong>{formatNumber(activeParam)}</strong>
              </div>
              {isMultiBranch && multiBranchSeries ? (
                multiBranchSeries
                  .filter((b) => visibleVariables.includes(b.id))
                  .map((branch) => {
                    const pt = pointOnCurve(branch.points, activeParam)
                    const val = pt?.values?.[activeVariableIndex]
                    return (
                      <div className="sc-tooltip-value" key={branch.id}>
                        <span>
                          <i style={{ background: branch.color }} />
                          {branch.label}
                        </span>
                        <strong>
                          {typeof val === 'number' && Number.isFinite(val)
                            ? formatNumber(val)
                            : '현재 분기 추적 불가'}
                        </strong>
                      </div>
                    )
                  })
              ) : activePoint?.values ? (
                visible.map(({ name, index }) => (
                  <div className="sc-tooltip-value" key={name}>
                    <span>
                      <i
                        style={{
                          background:
                            SERIES_COLORS[index % SERIES_COLORS.length],
                        }}
                      />
                      {name}
                    </span>
                    <strong>{formatNumber(activePoint.values![index])}</strong>
                  </div>
                ))
              ) : (
                <p className="sc-tooltip-error">
                  {activePoint?.error ||
                    '이 구간에는 검증된 분기 데이터가 없습니다.'}
                </p>
              )}
            </div>
          )}
      </div>

      {allBifurcationEvents.length > 0 && (
        <div className="sc-bifurcation-banner" role="status">
          {allBifurcationEvents.map((ev, idx) => (
            <button
              type="button"
              key={idx}
              className={`sc-bifurcation-chip is-${ev.kind}`}
              onClick={() =>
                onParameterChange?.(
                  ev.tangency?.verified
                    ? ev.tangency.parameterStar
                    : ev.parameter,
                )
              }
              title={ev.tangency?.geometricSummary ?? ev.description}
            >
              <b>
                {ev.tangency?.verified
                  ? tangencyLabel(ev.tangency)
                  : ev.kind === 'merge'
                    ? '● 병합·소멸 후보'
                    : '○ 추적 경계'}
              </b>{' '}
              {ev.description}
            </button>
          ))}
        </div>
      )}

      <div className="sc-chart-footer">
        <span>
          연속 파라미터 <strong>{parameterName || '—'}</strong>
        </span>
        <span className="sc-current-note">
          <i />
          {hasSelection ? '탐색 지점' : '현재 파라미터'}
          <strong>
            {hasSelection && activeParam !== null
              ? formatNumber(activeParam)
              : Number.isFinite(currentParameter)
                ? formatNumber(currentParameter)
                : '—'}
          </strong>
        </span>
      </div>
    </div>
  )
}
```

<a id="source-9"></a>

## src/components/SolutionChart.css

원본: [src/components/SolutionChart.css](../../src/components/SolutionChart.css) · 312줄 · SHA-256: `4c04335890e9f0118c2738e8cecb3f662bac6c9f6f16d7774eccf1bccc046f95`

```css
.solution-chart {
  width: 100%;
  max-width: 680px;
  min-width: 0;
  margin-inline: auto;
  color: #243d37;
}

.solution-chart.is-expanded {
  max-width: 1200px;
}

.sc-legend-row {
  min-height: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 4px 10px;
}

.sc-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.sc-legend-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 6px;
  padding: 5px 9px;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  color: #50675f;
  cursor: pointer;
  opacity: 0.4;
  transition:
    opacity 150ms,
    background 150ms;
}

.sc-legend-button.is-visible {
  opacity: 1;
}
.sc-legend-button:hover {
  background: #f1f5f1;
}
.sc-legend-button:focus-visible {
  outline: 2px solid #087f74;
  outline-offset: 2px;
}
.sc-legend-dot {
  width: 17px;
  height: 3px;
  border-radius: 4px;
  display: block;
}
.sc-explore-hint {
  color: #96a09a;
  font-size: 10px;
  letter-spacing: -0.15px;
  white-space: nowrap;
}
.sc-stage {
  position: relative;
  width: 100%;
}
.sc-view-controls {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin: 0 4px 14px;
  font-size: 10px;
  color: #8c9a91;
}
.sc-view-controls label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.sc-view-controls select,
.sc-reset-view {
  border: 1px solid #e0e8de;
  border-radius: 5px;
  background: #fbfcf9;
  color: #617c6d;
  font: inherit;
  min-height: 28px;
  padding: 4px 7px;
}
.sc-reset-view {
  cursor: pointer;
}
.sc-reset-view:hover {
  background: #edf5ec;
}
.sc-view-controls select:focus-visible,
.sc-reset-view:focus-visible {
  outline: 2px solid #80b8ae;
  outline-offset: 2px;
}
.sc-zoom-hint {
  margin-right: auto;
  font-size: 9px;
}
.sc-zoom-hint.is-active {
  color: #087f74;
}
.sc-stage svg {
  display: block;
  width: 100%;
  overflow: visible;
  outline: none;
  cursor: crosshair;
}
.sc-stage svg:focus-visible {
  outline: 2px solid #80b8ae;
  outline-offset: 3px;
  border-radius: 6px;
}
.sc-grid-line {
  stroke: #e9eeea;
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}
.sc-grid-vertical {
  stroke-dasharray: 3 5;
  stroke: #eef1ed;
}
.sc-zero-line {
  stroke: #dce4dc;
}
.sc-axis-label {
  fill: #94a099;
  font-size: 10px;
  font-family: 'DM Mono', 'SFMono-Regular', Consolas, monospace;
}
.sc-axis-caption {
  fill: #8a9890;
  font-size: 10px;
}
.sc-curve {
  fill: none;
  stroke-width: 2.5;
  stroke-linejoin: round;
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
}
.sc-current-line {
  stroke: #91a59a;
  stroke-dasharray: 3 5;
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}
.sc-crosshair {
  stroke: #c0cdc5;
  stroke-dasharray: 2 5;
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}
.sc-active-dot {
  stroke: #fff;
  stroke-width: 2.5;
  vector-effect: non-scaling-stroke;
}
.sc-tooltip {
  position: absolute;
  top: 20px;
  box-sizing: border-box;
  width: 152px;
  max-width: calc(100% - 16px);
  pointer-events: none;
  padding: 12px 14px;
  background: #fffefb;
  border: 1px solid #e0e7df;
  border-radius: 9px;
  box-shadow: 0 6px 24px #20372b0d;
  font-size: 11px;
  z-index: 2;
}
.sc-tooltip-heading {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding-bottom: 8px;
  margin-bottom: 7px;
  border-bottom: 1px solid #edf0eb;
  color: #819189;
}
.sc-tooltip-heading strong {
  color: #52665b;
}
.sc-tooltip-value {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  line-height: 1.9;
}
.sc-tooltip-value span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.sc-tooltip-value i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}
.sc-tooltip-value strong,
.sc-tooltip-heading strong {
  font-family: 'DM Mono', 'SFMono-Regular', Consolas, monospace;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
.sc-tooltip-error {
  font-size: 10px;
  line-height: 1.6;
  margin: 0;
  color: #b56e55;
}
.sc-tooltip-sample {
  color: #93a095;
  font-size: 8px;
  line-height: 1.5;
  margin: 8px 0 0;
}
.sc-chart-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #98a29a;
  font-size: 10px;
  padding: 6px 14px 1px 51px;
}
.sc-chart-footer strong {
  color: #637a6d;
  font-weight: 500;
  margin-left: 5px;
}
.sc-current-note {
  display: flex;
  align-items: center;
  gap: 5px;
}
.sc-current-note i {
  display: inline-block;
  background: #8ba497;
  width: 5px;
  height: 5px;
  border-radius: 50%;
}
.sc-current-note strong {
  font-family: 'DM Mono', 'SFMono-Regular', Consolas, monospace;
}
.sc-empty {
  position: absolute;
  inset: 15px 0 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: #8e9e92;
  background: #fffefaaf;
  pointer-events: none;
}
.sc-empty > span {
  font-size: 38px;
  color: #a0b6aa;
  line-height: 1;
}
.sc-empty p {
  margin: 13px 20px 0;
  text-align: center;
  max-width: 280px;
  font-size: 12px;
  line-height: 1.8;
}
.sc-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 700px) {
  .sc-explore-hint {
    display: none;
  }
  .sc-legend-row {
    padding-bottom: 7px;
  }
  .sc-tooltip {
    padding: 9px 10px;
    font-size: 10px;
  }
  .sc-chart-footer {
    padding-left: 25px;
  }
}
```

<a id="source-10"></a>

## src/components/SimulationPanelView.tsx

원본: [src/components/SimulationPanelView.tsx](../../src/components/SimulationPanelView.tsx) · 302줄 · SHA-256: `9fc667c2cd61e9f0351a7f5bc6158055c34622a4357115b606fa512d9e2b7ac9`

```tsx
import { useEffect, useRef, useState } from 'react'
import { Download, FileText, X } from 'lucide-react'
import type { Parameter, SimulationAnchor, SimulationPanel } from '../engine'
import SolutionChart, { SERIES_COLORS } from './SolutionChart'
import './SimulationPanelView.css'
import { encodeCsv } from '../csv'

export type SimulationPanelViewProps = {
  panel: SimulationPanel
  anchor: SimulationAnchor
  parameters: Parameter[]
  expanded: boolean
  onClose: () => void
  closable?: boolean
  onParameterChange?: (value: number) => void
  onReport?: () => void
  pending?: boolean
}

function formatNumber(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return '—'
  if (value === 0) return '0'
  return Number(value.toPrecision(8)).toString()
}

function vectorText(variables: string[], values: number[]): string {
  return variables
    .map((name, index) => `${name} = ${formatNumber(values[index])}`)
    .join(' · ')
}

export default function SimulationPanelView({
  panel,
  anchor,
  parameters,
  expanded,
  onClose,
  closable = true,
  onParameterChange,
  onReport,
  pending = false,
}: SimulationPanelViewProps) {
  const variables = panel.result?.variables ?? anchor.variables
  const variableKey = variables.join('\u0000')
  const [visibleVariables, setVisibleVariables] = useState(variables)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const rows = useRef<(HTMLTableRowElement | null)[]>([])
  const parameter = parameters.find((item) => item.name === panel.sweepName)
  const hasSweep = Boolean(panel.sweepName && parameter)

  useEffect(() => {
    setVisibleVariables(variables)
  }, [variableKey])

  useEffect(() => {
    setSelectedIndex(null)
  }, [panel.dataset, panel.sweepName])

  useEffect(() => {
    if (selectedIndex === null) return
    const row = rows.current[selectedIndex]
    const container = scroller.current
    if (!row || !container) return
    const headingHeight = 38
    if (row.offsetTop < container.scrollTop + headingHeight) {
      container.scrollTop = Math.max(0, row.offsetTop - headingHeight)
    } else if (
      row.offsetTop + row.offsetHeight >
      container.scrollTop + container.clientHeight
    ) {
      container.scrollTop =
        row.offsetTop + row.offsetHeight - container.clientHeight
    }
  }, [selectedIndex])

  function downloadCsv() {
    const content = hasSweep
      ? [
          [panel.sweepName, ...variables],
          ...panel.dataset.map((point) => [
            point.parameter,
            ...variables.map((_, index) => point.values?.[index] ?? ''),
          ]),
        ]
      : [
          ['변수', '값'],
          ...variables.map((name, index) => [
            name,
            panel.result?.values[index] ?? '',
          ]),
        ]
    const text = encodeCsv(content)
    const url = URL.createObjectURL(
      new Blob(['\uFEFF', text], { type: 'text/csv;charset=utf-8' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = `polymath-simulation-${panel.id.replace(/[^a-zA-Z0-9_-]/g, '_')}-data.csv`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <section
      className={`simulation-panel${expanded ? ' is-expanded' : ''}${pending ? ' is-pending' : ''}`}
      aria-label={`${panel.label} 시뮬레이션`}
      aria-busy={pending}
    >
      <header className="simulation-panel-header">
        <div className="simulation-panel-heading">
          <h3>{panel.label}</h3>
          <p className="simulation-panel-anchor">
            <span>선택 기준</span>
            <span title={vectorText(anchor.variables, anchor.values)}>
              {vectorText(anchor.variables, anchor.values)}
            </span>
          </p>
        </div>
        {closable && (
          <button
            type="button"
            className="simulation-panel-close"
            onClick={onClose}
            aria-label={`${panel.label} 시뮬레이션 닫기`}
            title="시뮬레이션 닫기"
          >
            <X size={17} aria-hidden="true" />
          </button>
        )}
      </header>

      <div className="simulation-panel-current">
        <span>현재 해</span>
        <strong>
          {panel.result
            ? vectorText(panel.result.variables, panel.result.values)
            : '현재 분기 추적 불가'}
        </strong>
        {pending && <small role="status">계산 중…</small>}
      </div>

      {!panel.result && (
        <p className="simulation-panel-error" role="alert">
          {panel.error ||
            '현재 파라미터에서 선택한 해를 찾지 못했습니다. 파라미터를 조정해 주세요.'}
        </p>
      )}

      {hasSweep ? (
        <div className="simulation-panel-chart">
          <p className="simulation-panel-sweep-label">
            <strong>{panel.sweepName}</strong>에 따른 해의 변화
          </p>
          <SolutionChart
            expanded={expanded}
            modelKind="nonlinear"
            points={panel.sweep}
            events={panel.events}
            selectionPoints={panel.dataset}
            variables={variables}
            parameterName={panel.sweepName}
            currentParameter={parameter?.value ?? 0}
            currentValues={panel.result?.values}
            onParameterChange={onParameterChange}
            selectedIndex={selectedIndex}
            onSelectIndex={setSelectedIndex}
            visibleVariables={visibleVariables}
            onToggleVariable={(name) =>
              setVisibleVariables((current) =>
                current.includes(name)
                  ? current.filter((item) => item !== name)
                  : [...current, name],
              )
            }
          />
        </div>
      ) : (
        <p className="simulation-panel-helper">
          파라미터를 추가하면 이 해가 어떻게 변하는지 탐색할 수 있습니다.
        </p>
      )}

      {panel.datasetError && (
        <p className="simulation-panel-error" role="alert">
          {panel.datasetError}
        </p>
      )}

      {hasSweep && panel.dataset.length > 0 && (
        <details className="simulation-panel-data">
          <summary>데이터 표</summary>
          <p className="simulation-panel-data-note">
            설정한 샘플 포인트 간격으로 계산한 값입니다. 표와 그래프의 선택
            지점을 함께 확인할 수 있습니다.
          </p>
          <div
            className="simulation-panel-table-scroll"
            ref={scroller}
            onPointerLeave={() => setSelectedIndex(null)}
          >
            <table>
              <caption className="simulation-panel-sr-only">
                {panel.label}의 {panel.sweepName}별 계산 결과
              </caption>
              <thead>
                <tr>
                  <th scope="col">{panel.sweepName}</th>
                  {variables.map((name, index) => (
                    <th scope="col" key={name}>
                      <i
                        style={{
                          background:
                            SERIES_COLORS[index % SERIES_COLORS.length],
                        }}
                        aria-hidden="true"
                      />
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {panel.dataset.map((point, index) => (
                  <tr
                    key={index}
                    ref={(element) => {
                      rows.current[index] = element
                    }}
                    tabIndex={0}
                    aria-label={`${panel.sweepName} ${String(point.parameter)} 탐색`}
                    aria-selected={selectedIndex === index}
                    className={selectedIndex === index ? 'is-selected' : ''}
                    onPointerEnter={() => setSelectedIndex(index)}
                    onFocus={() => setSelectedIndex(index)}
                    onClick={() => setSelectedIndex(index)}
                    onBlur={() => setSelectedIndex(null)}
                    onKeyDown={(event) => {
                      const next =
                        event.key === 'ArrowDown'
                          ? index + 1
                          : event.key === 'ArrowUp'
                            ? index - 1
                            : null
                      if (next !== null) {
                        event.preventDefault()
                        rows.current[next]?.focus()
                      }
                    }}
                  >
                    <td>{formatNumber(point.parameter)}</td>
                    {point.values ? (
                      variables.map((name, variableIndex) => (
                        <td key={name}>
                          {formatNumber(point.values?.[variableIndex])}
                        </td>
                      ))
                    ) : (
                      <td
                        colSpan={Math.max(1, variables.length)}
                        className="simulation-panel-no-solution"
                        title={point.error}
                      >
                        해 없음
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      <footer className="simulation-panel-actions">
        <button
          type="button"
          onClick={downloadCsv}
          disabled={
            pending ||
            (hasSweep
              ? Boolean(panel.datasetError) || panel.dataset.length === 0
              : !panel.result)
          }
          aria-label={`${panel.label} CSV 저장`}
        >
          <Download size={14} aria-hidden="true" /> CSV 저장
        </button>
        {onReport && (
          <button
            type="button"
            onClick={onReport}
            disabled={pending || !panel.result}
            aria-label={`${panel.label} 해석 리포트`}
          >
            <FileText size={14} aria-hidden="true" /> 해석 리포트
          </button>
        )}
      </footer>
    </section>
  )
}
```

<a id="source-11"></a>

## src/components/MergedSimulationSetView.tsx

원본: [src/components/MergedSimulationSetView.tsx](../../src/components/MergedSimulationSetView.tsx) · 291줄 · SHA-256: `3ec5be841a5c0c04cbee3063ee54b06f2101c52b8d404eaa33fb50aa6d135ca2`

```tsx
import { useEffect, useState } from 'react'
import { Download, Layers3, Trash2, X } from 'lucide-react'
import type {
  MergedSimulationSet,
  Parameter,
  SimulationAnchor,
  SimulationPanel,
} from '../engine'
import { encodeCsv } from '../csv'
import { detectMergedBranchEvents } from '../engine/simulation-panels'
import SolutionChart, {
  SERIES_COLORS,
  type MultiBranchSeries,
} from './SolutionChart'

export type MergedSimulationSetViewProps = {
  mergedSet: MergedSimulationSet
  anchors: SimulationAnchor[]
  panels: SimulationPanel[]
  parameters: Parameter[]
  sweepName: string
  expanded: boolean
  pending: boolean
  onRemoveSet: () => void
  onToggleAnchorInSet: (anchorId: string) => void
  onParameterChange?: (value: number) => void
}

function formatNumber(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return '—'
  if (value === 0) return '0'
  return Number(value.toPrecision(7)).toString()
}

export default function MergedSimulationSetView({
  mergedSet,
  anchors,
  panels,
  parameters,
  sweepName,
  expanded,
  pending,
  onRemoveSet,
  onToggleAnchorInSet,
  onParameterChange,
}: MergedSimulationSetViewProps) {
  const includedAnchors = anchors.filter((a) =>
    mergedSet.anchorIds.includes(a.id),
  )
  const includedPanels = includedAnchors.map(
    (anchor) =>
      panels.find((p) => p.id === anchor.id) ?? {
        id: anchor.id,
        label: anchor.label,
        result: null,
        sweep: [],
        dataset: [],
        sweepName,
        events: [],
      },
  )

  const variables = includedPanels[0]?.result?.variables ??
    includedAnchors[0]?.variables ?? ['x']
  const [activeVarIdx, setActiveVarIdx] = useState(0)
  const [visibleBranchIds, setVisibleBranchIds] = useState<string[]>(
    mergedSet.anchorIds,
  )
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  useEffect(() => {
    setVisibleBranchIds(mergedSet.anchorIds)
  }, [mergedSet.anchorIds.join('|')])

  useEffect(() => {
    setActiveVarIdx(0)
    setSelectedIndex(null)
  }, [variables.join('|'), sweepName])
  const branchColor = (id: string) =>
    SERIES_COLORS[
      Math.max(
        0,
        anchors.findIndex((a) => a.id === id),
      ) % SERIES_COLORS.length
    ]
  const sweepParam = parameters.find((p) => p.name === sweepName)
  const mergedEvents = detectMergedBranchEvents(includedPanels)

  const multiBranchSeries: MultiBranchSeries[] = includedPanels.map(
    (panel, idx) => ({
      id: panel.id,
      label: panel.label,
      color: branchColor(panel.id),
      points: panel.sweep,
      samplePoints: panel.dataset,
      currentValues: panel.result?.values,
      events: mergedEvents.filter(
        (event) =>
          event.branchId === panel.id || event.mergedWithAnchorId === panel.id,
      ),
    }),
  )

  function exportMergedCsv() {
    if (
      !sweepParam ||
      !includedPanels.length ||
      includedPanels.some((p) => p.datasetError)
    )
      return
    const baseDataset = includedPanels[0].dataset
    const header = [
      sweepName,
      ...includedPanels.map(
        (p) => `${p.label} (${variables[activeVarIdx] ?? 'x'})`,
      ),
    ]
    const rows = baseDataset.map((pt, rowIdx) => [
      pt.parameter,
      ...includedPanels.map(
        (p) => p.dataset[rowIdx]?.values?.[activeVarIdx] ?? '',
      ),
    ])
    const csv = encodeCsv([header, ...rows])
    const url = URL.createObjectURL(
      new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = `polymath-${mergedSet.name.replace(/\s+/g, '-')}-data.csv`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <section
      className={`simulation-panel merged-simulation-panel${expanded ? ' is-expanded' : ''}`}
      aria-label={`${mergedSet.name} 병합 시뮬레이션`}
    >
      <header className="simulation-panel-header">
        <div className="simulation-panel-heading">
          <h3>
            <Layers3
              size={15}
              style={{ verticalAlign: '-2px', marginRight: '6px' }}
            />
            {mergedSet.name}
          </h3>
          <p className="simulation-panel-anchor">
            <span>포함된 해 ({includedAnchors.length}개)</span>
            <span>
              하나의 좌표계에서 여러 해의 궤적과 병합·소멸 지점을 비교합니다.
            </span>
          </p>
        </div>
        <button
          type="button"
          className="simulation-panel-close"
          onClick={onRemoveSet}
          aria-label={`${mergedSet.name} 삭제`}
          title="병합 세트 삭제"
        >
          <X size={17} />
        </button>
      </header>

      {/* 해 포함/제외 토글 칩 */}
      <div className="merged-set-Chips">
        {anchors.map((anchor, idx) => {
          const active = mergedSet.anchorIds.includes(anchor.id)
          return (
            <button
              key={anchor.id}
              type="button"
              className={`merged-branch-chip${active ? ' is-active' : ''}`}
              aria-pressed={active}
              onClick={() => onToggleAnchorInSet(anchor.id)}
              title={active ? '클릭하여 세트에서 제외' : '클릭하여 세트에 추가'}
            >
              <i
                style={{
                  background: active ? branchColor(anchor.id) : '#ccc',
                }}
              />
              <span>{anchor.label}</span>
            </button>
          )
        })}
      </div>

      {/* 다변수 연립방정식일 때 비교할 미지수 선택 */}
      {variables.length > 1 && (
        <div className="merged-variable-selector">
          <span>표시할 미지수:</span>
          {variables.map((v, idx) => (
            <button
              key={v}
              type="button"
              className={activeVarIdx === idx ? 'is-selected' : ''}
              onClick={() => setActiveVarIdx(idx)}
            >
              {v}
            </button>
          ))}
        </div>
      )}

      {/* 현재 파라미터에서 각 해의 상태 요약 (생존 vs 소멸/병합) */}
      <div className="merged-current-grid">
        {includedPanels.map((panel, idx) => {
          const val = panel.result?.values[activeVarIdx]
          const color = branchColor(panel.id)
          return (
            <div
              key={panel.id}
              className={`merged-current-card${!panel.result ? ' is-vanished' : ''}`}
            >
              <span className="merged-card-label">
                <i style={{ background: color }} />
                {panel.label}
              </span>
              <strong>
                {panel.result
                  ? `${variables[activeVarIdx]} = ${formatNumber(val)}`
                  : mergedEvents.some(
                        (event) =>
                          event.kind === 'merge' &&
                          (event.branchId === panel.id ||
                            event.mergedWithAnchorId === panel.id),
                      )
                    ? '병합·소멸 후보 / 추적 불가'
                    : '현재 분기 추적 불가'}
              </strong>
            </div>
          )
        })}
      </div>

      {sweepParam ? (
        <div className="simulation-panel-chart">
          <SolutionChart
            expanded={expanded}
            modelKind="nonlinear"
            points={includedPanels[0]?.sweep ?? []}
            selectionPoints={includedPanels[0]?.dataset ?? []}
            variables={variables}
            parameterName={sweepName}
            currentParameter={sweepParam.value}
            selectedIndex={selectedIndex}
            onSelectIndex={setSelectedIndex}
            visibleVariables={visibleBranchIds}
            onToggleVariable={(id) =>
              setVisibleBranchIds((prev) =>
                prev.includes(id)
                  ? prev.filter((item) => item !== id)
                  : [...prev, id],
              )
            }
            onParameterChange={onParameterChange}
            multiBranchSeries={multiBranchSeries}
            activeVariableIndex={activeVarIdx}
            events={mergedEvents}
          />
        </div>
      ) : (
        <p className="simulation-panel-helper">
          파라미터를 추가하면 여러 해가 어떻게 만나서 병합·소멸하는지 한
          그래프에서 볼 수 있습니다.
        </p>
      )}

      <footer className="simulation-panel-actions">
        <button
          type="button"
          onClick={exportMergedCsv}
          disabled={
            pending ||
            !sweepParam ||
            includedPanels.length === 0 ||
            includedPanels.some((p) => p.datasetError)
          }
        >
          <Download size={14} /> 병합 세트 CSV 저장
        </button>
        <button type="button" onClick={onRemoveSet}>
          <Trash2 size={14} /> 세트 삭제
        </button>
      </footer>
    </section>
  )
}
```

<a id="source-12"></a>

## src/components/SimulationPanelView.css

원본: [src/components/SimulationPanelView.css](../../src/components/SimulationPanelView.css) · 270줄 · SHA-256: `42048b6eaf9f4a93cc8124973394fe06817d31a3070e27c91fd94e16eeb0e805`

```css
.simulation-panel {
  min-width: 0;
  width: 100%;
  padding: 20px;
  border: 1px solid #e1e8df;
  border-radius: 12px;
  background: #fffefb;
  color: #344b41;
}

.simulation-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.simulation-panel-heading {
  min-width: 0;
}

.simulation-panel-heading h3 {
  color: #276c60;
  font-size: 16px;
  font-weight: 650;
}

.simulation-panel-anchor {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 9px;
  margin-top: 7px;
  color: #87958b;
  font-size: 11px;
  line-height: 1.7;
}

.simulation-panel-anchor > :last-child,
.simulation-panel-current strong {
  min-width: 0;
  font-family: 'DM Mono', 'SFMono-Regular', Consolas, monospace;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.simulation-panel-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  margin: -5px -6px 0 0;
  border-radius: 6px;
  color: #8c9b91;
}

.simulation-panel-close:hover {
  color: #506b5d;
  background: #edf3eb;
}

.simulation-panel-current {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 7px 12px;
  padding: 12px 14px;
  margin: 17px 0;
  border-radius: 7px;
  background: #f1f6ef;
  font-size: 11px;
  color: #7b8a7b;
  line-height: 1.75;
}

.simulation-panel-current strong {
  font-size: 13px;
  font-weight: 500;
  color: #3a6957;
}

.simulation-panel-current small {
  margin-left: auto;
  font-size: 11px;
  color: #59877b;
}

.simulation-panel-sweep-label {
  margin: 0 0 12px 3px;
  color: #93a091;
  font-size: 11px;
}

.simulation-panel-sweep-label strong {
  color: #607d6e;
  font-weight: 500;
}

.simulation-panel-helper {
  padding: 38px 12px;
  color: #8a9b8d;
  text-align: center;
  font-size: 12px;
  line-height: 1.9;
}

.simulation-panel-error {
  padding: 10px 12px;
  margin: 12px 0;
  border: 1px solid #eeddd0;
  border-radius: 6px;
  background: #fcf6ef;
  color: #a4704e;
  font-size: 12px;
  line-height: 1.8;
  overflow-wrap: anywhere;
}

.simulation-panel-data {
  margin-top: 19px;
  border-top: 1px solid #e9ede5;
  padding-top: 13px;
}

.simulation-panel-data summary {
  width: fit-content;
  cursor: pointer;
  color: #6b8170;
  font-size: 12px;
  padding: 3px 0;
}

.simulation-panel-data summary:focus-visible {
  outline: 2px solid #80b8ae;
  outline-offset: 4px;
  border-radius: 3px;
}

.simulation-panel-data-note {
  margin: 10px 0;
  color: #98a294;
  font-size: 10px;
  line-height: 1.8;
}

.simulation-panel-table-scroll {
  position: relative;
  max-height: 260px;
  overflow: auto;
  overscroll-behavior: contain;
  border: 1px solid #e8ede4;
  border-radius: 7px;
}

.simulation-panel-table-scroll table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  color: #536e5d;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.simulation-panel-table-scroll th,
.simulation-panel-table-scroll td {
  padding: 10px 13px;
  text-align: right;
  white-space: nowrap;
  border-bottom: 1px solid #edf0e9;
}

.simulation-panel-table-scroll th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #f5f7f0;
  color: #7c8d78;
  font-weight: 500;
}

.simulation-panel-table-scroll th i {
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  margin-right: 7px;
  vertical-align: middle;
}

.simulation-panel-table-scroll td {
  font-family: 'DM Mono', 'SFMono-Regular', Consolas, monospace;
}

.simulation-panel-table-scroll tr:last-child td {
  border-bottom: 0;
}

.simulation-panel-table-scroll tbody tr:focus-visible {
  outline: 2px solid #77b5a4;
  outline-offset: -2px;
}

.simulation-panel-table-scroll tbody tr.is-selected {
  background: #eaf4e9;
}

.simulation-panel-table-scroll td.simulation-panel-no-solution {
  color: #ac927b;
  text-align: center;
  font-family: inherit;
}

.simulation-panel-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 7px;
  margin-top: 17px;
}

.simulation-panel-actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 32px;
  padding: 7px 10px;
  border: 1px solid #e3e9dd;
  border-radius: 6px;
  background: #fffefb;
  color: #69836f;
  font-size: 11px;
}

.simulation-panel-actions button:hover:enabled {
  background: #f0f5eb;
  border-color: #d5e1ce;
}

.simulation-panel-actions button:disabled {
  opacity: 0.42;
}

.simulation-panel-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 600px) {
  .simulation-panel {
    padding: 16px 12px;
  }

  .simulation-panel-current {
    padding: 10px;
  }

  .simulation-panel-actions button {
    min-height: 36px;
  }
}
```

<a id="source-13"></a>

## src/components/WorkspaceNavigation.tsx

원본: [src/components/WorkspaceNavigation.tsx](../../src/components/WorkspaceNavigation.tsx) · 224줄 · SHA-256: `5fe0469e275d7ec211daa93d3ea6ecd52170896ba0c39c9b49ceedcbb9a61889`

```tsx
import { ArrowRight, Code2, FileText, Home, Activity } from 'lucide-react'
import './WorkspaceNavigation.css'

export type WorkspaceScreen = 'home' | 'model' | 'simulation' | 'report'

type ModuleKind =
  | 'equation'
  | 'differential'
  | 'curve'
  | 'nonlinear'
  | 'optimum'
  | 'integration'

const modules: {
  kind: ModuleKind
  letter: string
  name: string
  available?: boolean
}[] = [
  {
    kind: 'equation',
    letter: 'E',
    name: 'Equation Solver',
    available: true,
  },
  {
    kind: 'differential',
    letter: 'D',
    name: 'Differential Equations',
  },
  {
    kind: 'curve',
    letter: 'P',
    name: 'Curve Fitting',
  },
  {
    kind: 'nonlinear',
    letter: 'N',
    name: 'Nonlinear Fitting',
  },
  {
    kind: 'optimum',
    letter: 'O',
    name: 'Optimum Finder',
  },
  {
    kind: 'integration',
    letter: 'I',
    name: 'Discrete Integration',
  },
]

function ModuleIllustration({ kind }: { kind: ModuleKind }) {
  return (
    <svg
      className="module-illustration"
      viewBox="0 0 180 84"
      aria-hidden="true"
    >
      {kind === 'equation' && (
        <>
          <path className="module-line module-line-muted" d="M30 65 148 15" />
          <path
            className="module-line"
            d="M28 47C45 8 63 15 86 42S125 77 151 35"
          />
          <circle className="module-point" cx="86" cy="42" r="4.5" />
        </>
      )}
      {kind === 'differential' && (
        <>
          <path className="module-line" d="M29 68C57 15 80 10 145 12" />
          <path
            className="module-line module-line-muted"
            d="M29 49C70 58 89 27 145 29"
          />
          <path className="module-line" d="M29 20C67 18 90 55 145 54" />
          <path
            className="module-arrow"
            d="m142 9 7 3-7 3m0 11 7 3-7 3m0 19 7 3-7 3"
          />
        </>
      )}
      {kind === 'curve' && (
        <>
          <path className="module-line" d="M30 67C86 69 122 54 145 13" />
          {[
            [37, 67],
            [74, 62],
            [106, 48],
            [131, 30],
            [145, 13],
          ].map(([cx, cy]) => (
            <circle className="module-point" key={cx} cx={cx} cy={cy} r="4" />
          ))}
        </>
      )}
      {kind === 'nonlinear' && (
        <>
          <path
            className="module-line module-line-dashed"
            d="M30 65C80 67 93 13 150 13M30 81C85 78 101 29 150 29"
          />
          <path className="module-line" d="M30 73C82 73 97 21 150 21" />
          <circle className="module-point" cx="46" cy="71" r="4" />
          <circle className="module-point" cx="91" cy="48" r="4" />
          <circle className="module-point" cx="137" cy="23" r="4" />
        </>
      )}
      {kind === 'optimum' && (
        <>
          <path className="module-line" d="M30 20Q90 102 151 20" />
          <path
            className="module-line module-line-dashed"
            d="m43 18 28 34 15 7"
          />
          <circle className="module-point" cx="43" cy="18" r="4" />
          <circle className="module-point" cx="90" cy="61" r="4" />
          <path className="module-arrow" d="m84 55 6 6-8 1" />
        </>
      )}
      {kind === 'integration' && (
        <>
          <path
            className="module-area"
            d="M29 65V54C47 1 69 4 95 33S131 64 151 65Z"
          />
          <path
            className="module-line"
            d="M29 54C47 1 69 4 95 33S131 64 151 65M22 65H157"
          />
          <path
            className="module-line module-line-muted"
            d="M42 29V65M57 16V65M72 15V65M87 25V65M102 41V65M117 55V65M132 62V65"
          />
        </>
      )}
    </svg>
  )
}

export function LandingModules({
  onOpenEquationSolver,
}: {
  onOpenEquationSolver: () => void
}) {
  return (
    <section className="module-home" aria-label="계산 도구">
      <div className="module-grid">
        {modules.map((module) => (
          <button
            type="button"
            className={`module-card module-${module.kind}${module.available ? ' is-available' : ''}`}
            key={module.kind}
            disabled={!module.available}
            aria-label={`${module.name} ${module.available ? '열기' : '준비 중'}`}
            onClick={module.available ? onOpenEquationSolver : undefined}
          >
            <span className="module-card-title">
              <span className="module-letter">{module.letter}</span>
              <span>{module.name}</span>
            </span>
            <ModuleIllustration kind={module.kind} />
            <span className="module-card-footer">
              {module.available ? (
                <>
                  <ArrowRight size={16} />
                </>
              ) : (
                <span className="module-coming-soon">준비 중</span>
              )}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

const screens = [
  { screen: 'model', name: '수식·파라미터', icon: Code2 },
  { screen: 'simulation', name: '시뮬레이션', icon: Activity },
  { screen: 'report', name: '해석 리포트', icon: FileText },
] as const

export function WorkspaceNavigation({
  screen,
  onNavigate,
}: {
  screen: WorkspaceScreen
  onNavigate: (screen: WorkspaceScreen) => void
}) {
  return (
    <nav className="workspace-navigation" aria-label="Equation Solver 화면">
      <button
        type="button"
        className="workspace-home-button"
        aria-label="모듈 홈"
        onClick={() => onNavigate('home')}
      >
        <Home size={16} aria-hidden="true" />
        <span>모듈 홈</span>
      </button>
      <span className="workspace-nav-divider" aria-hidden="true" />
      <div className="workspace-screen-links">
        {screens.map(({ screen: target, name, icon: Icon }, index) => (
          <button
            type="button"
            className={`workspace-screen-button${screen === target ? ' is-current' : ''}`}
            key={target}
            onClick={() => onNavigate(target)}
            aria-current={screen === target ? 'page' : undefined}
          >
            <span className="workspace-screen-number" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            <Icon size={16} aria-hidden="true" />
            <span>{name}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
```

<a id="source-14"></a>

## src/components/WorkspaceNavigation.css

원본: [src/components/WorkspaceNavigation.css](../../src/components/WorkspaceNavigation.css) · 366줄 · SHA-256: `a7fef9cca920fcd2108a4636b91db1b827773a9fdb3819a6376f9739d592f93f`

```css
.module-home {
  max-width: 1180px;
  margin: 0 auto;
  padding: 52px 12px 40px;
}
.module-home-heading {
  margin-bottom: 35px;
}
.module-home-eyebrow {
  display: block;
  color: #809086;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 2px;
  margin-bottom: 15px;
}
.module-home-heading h1 {
  font-size: clamp(25px, 2.5vw, 35px);
  font-weight: 600;
  letter-spacing: -1.3px;
  color: #2d423a;
}
.module-home-heading p {
  margin-top: 12px;
  color: #87968e;
  font-size: 13px;
  line-height: 1.8;
}
.module-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 21px;
}
.module-card {
  --module-ink: #4e8b65;
  --module-soft: #f0f7ed;
  --module-border: #cddfc6;
  --module-accent: #7bab75;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-width: 0;
  min-height: 244px;
  padding: 25px 25px 17px;
  border: 1px solid var(--module-border);
  border-radius: 13px;
  background: linear-gradient(125deg, #fff 0%, var(--module-soft) 100%);
  color: #394c43;
  overflow: hidden;
  white-space: normal;
  text-align: left;
  transition:
    transform 0.2s,
    box-shadow 0.2s,
    border-color 0.2s;
}
.module-card::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 4px;
  background: linear-gradient(
    90deg,
    var(--module-border),
    var(--module-accent)
  );
}
.module-card.is-available:hover {
  transform: translateY(-3px);
  box-shadow: 0 9px 30px #426b4e12;
  border-color: #82ad82;
}
.module-card.is-available:active {
  transform: translateY(0);
}
.module-card:disabled {
  opacity: 1;
}
.module-differential {
  --module-ink: #6f88b1;
  --module-soft: #eef3fb;
  --module-border: #d6e1f0;
  --module-accent: #90acd6;
}
.module-curve {
  --module-ink: #9581b4;
  --module-soft: #f3eff9;
  --module-border: #e1d7ef;
  --module-accent: #b4a1d0;
}
.module-nonlinear {
  --module-ink: #b6809d;
  --module-soft: #f9f0f4;
  --module-border: #ecd8e2;
  --module-accent: #cda1b8;
}
.module-optimum {
  --module-ink: #b88e5d;
  --module-soft: #faf4e9;
  --module-border: #ebdfcc;
  --module-accent: #d3b284;
}
.module-integration {
  --module-ink: #68998f;
  --module-soft: #eef8f5;
  --module-border: #d5e8e2;
  --module-accent: #9bc5b9;
}
.module-card-title {
  display: flex;
  gap: 11px;
  align-items: center;
  font-size: 18px;
  line-height: 1.35;
  font-weight: 550;
  letter-spacing: -0.4px;
}
.module-letter {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  border-radius: 8px;
  background: var(--module-ink);
  color: #fff;
  font-size: 19px;
  font-weight: 650;
}
.module-description {
  color: #85918b;
  font-size: 12px;
  line-height: 1.8;
  display: block;
  margin: 17px 0 0;
  min-height: 43px;
  word-break: keep-all;
}
.module-card.is-available .module-description {
  color: #6a8273;
}
.module-illustration {
  color: var(--module-ink);
  display: block;
  width: 156px;
  height: 75px;
  margin: 11px auto 3px;
  overflow: visible;
}
.module-line {
  fill: none;
  stroke: currentColor;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.module-line-muted {
  opacity: 0.62;
  stroke-width: 2;
}
.module-line-dashed {
  stroke-width: 1.5;
  stroke-dasharray: 4 4;
  opacity: 0.65;
}
.module-point {
  fill: #fff;
  stroke: currentColor;
  stroke-width: 2.2;
}
.module-arrow {
  fill: currentColor;
}
.module-area {
  fill: currentColor;
  opacity: 0.2;
}
.module-card-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 7px;
  min-height: 22px;
  margin-top: auto;
  color: var(--module-ink);
  font-size: 11px;
}
.module-card-footer > svg {
  transition: transform 0.2s;
}
.module-card:hover .module-card-footer > svg {
  transform: translateX(3px);
}
.module-coming-soon {
  background: #ffffffa6;
  border: 1px solid var(--module-border);
  border-radius: 20px;
  padding: 3px 9px;
  font-size: 10px;
}
.module-home-note {
  margin-top: 26px;
  font-size: 11px;
  line-height: 1.8;
  color: #96a198;
  text-align: center;
}
.workspace-navigation {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 0 0 25px;
  padding: 0 0 16px;
  border-bottom: 1px solid #e3e9e0;
}
.workspace-home-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
  padding: 10px 4px;
  font-size: 11px;
  color: #8a9a8c;
}
.workspace-home-button:hover {
  color: #427c68;
}
.workspace-nav-divider {
  height: 22px;
  border-left: 1px solid #dde5db;
}
.workspace-screen-links {
  display: flex;
  align-items: center;
  gap: 8px;
}
.workspace-screen-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 17px;
  color: #8d9b90;
  font-size: 12px;
  border: 1px solid transparent;
  border-radius: 7px;
}
.workspace-screen-button:hover {
  background: #f1f5ed;
  color: #4d806c;
}
.workspace-screen-button.is-current {
  color: #377d69;
  background: #edf4e9;
  border-color: #dce8d5;
  font-weight: 600;
}
.workspace-screen-number {
  font-family: ui-monospace, monospace;
  font-size: 10px;
  opacity: 0.65;
}
.workspace-screen-button > svg {
  display: none;
}
@media (max-width: 1050px) {
  .module-card {
    padding-inline: 20px;
  }
  .module-card-title {
    font-size: 16px;
  }
  .module-grid {
    gap: 15px;
  }
}
@media (max-width: 850px) {
  .module-home {
    padding-top: 30px;
  }
  .module-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .workspace-navigation {
    gap: 10px;
  }
  .workspace-screen-button {
    padding-inline: 12px;
    gap: 6px;
  }
}
@media (max-width: 540px) {
  .module-home {
    padding: 23px 0 25px;
  }
  .module-home-heading {
    margin-bottom: 25px;
  }
  .module-home-heading h1 {
    font-size: 25px;
  }
  .module-home-heading p {
    font-size: 11px;
    margin-top: 10px;
  }
  .module-home-eyebrow {
    font-size: 8px;
    letter-spacing: 1.5px;
  }
  .module-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 13px;
  }
  .module-card {
    min-height: 211px;
    padding: 22px 23px 16px;
  }
  .module-description {
    min-height: 0;
    margin-top: 13px;
  }
  .module-illustration {
    margin-top: 5px;
    height: 66px;
  }
  .workspace-navigation {
    gap: 9px;
    margin-bottom: 20px;
    padding-bottom: 12px;
  }
  .workspace-home-button {
    width: 29px;
    justify-content: center;
  }
  .workspace-home-button > span,
  .workspace-nav-divider,
  .workspace-screen-number {
    display: none;
  }
  .workspace-screen-links {
    gap: 3px;
    flex: 1;
    justify-content: space-between;
  }
  .workspace-screen-button {
    padding: 11px 8px;
    font-size: 10px;
    gap: 5px;
  }
  .workspace-screen-button > svg {
    display: block;
    width: 13px;
    height: 13px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .module-card,
  .module-card-footer > svg {
    transition: none;
  }
  .module-card.is-available:hover,
  .module-card:hover .module-card-footer > svg {
    transform: none;
  }
}
```

<a id="source-15"></a>

## src/styles.css

원본: [src/styles.css](../../src/styles.css) · 3,666줄 · SHA-256: `380507dd0905de2f7bbe7471f43b2724235774a62abc7bddd74f0be99dbd5477`

```css
:root {
  font-family:
    'Pretendard',
    'Noto Sans KR',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
  color: #27332f;
  background: #f7f8f6;
  font-synthesis: none;
  font-weight: 400;
  --teal: #087f74;
  --muted: #929b96;
  --line: #e8ece7;
  --panel: #fff;
}
* {
  box-sizing: border-box;
}
body {
  margin: 0;
}
button,
input,
textarea,
select {
  font: inherit;
}
button,
a,
input,
select,
textarea {
  -webkit-tap-highlight-color: transparent;
}
button {
  cursor: pointer;
}
button:disabled {
  cursor: default;
}
button,
a {
  touch-action: manipulation;
}
button {
  transition:
    background 0.16s,
    color 0.16s,
    border-color 0.16s;
  white-space: nowrap;
}
button:focus-visible,
a:focus-visible,
select:focus-visible {
  outline: 3px solid #7fd0c3;
  outline-offset: 3px;
}
input:focus-visible,
textarea:focus-visible {
  outline: 2px solid #6db9a9;
  outline-offset: 2px;
}
button {
  border: 0;
  background: none;
  color: inherit;
}
a {
  color: inherit;
  text-decoration: none;
}
svg {
  flex-shrink: 0;
}
h1,
h2,
h3,
h4,
p {
  margin: 0;
}
.app-shell {
  display: flex;
  min-height: 100vh;
}
.rail {
  width: 76px;
  flex: 0 0 76px;
  background: #fff;
  border-right: 1px solid var(--line);
  display: flex;
  align-items: center;
  flex-direction: column;
  position: fixed;
  height: 100dvh;
  z-index: 30;
  padding-top: 23px;
}
.brand-mark {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  background: var(--teal);
  color: #fff;
  display: flex;
  position: relative;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 7px #087f7418;
}
.brand-mark span {
  font-family: Georgia, serif;
  font-size: 36px;
  line-height: 1;
  transform: translateY(-3px);
  font-style: italic;
}
.brand-mark i {
  height: 5px;
  width: 5px;
  border-radius: 50%;
  position: absolute;
  top: 8px;
  right: 7px;
  background: #b2d2b1;
}
.rail-group {
  margin-top: 44px;
  display: flex;
  flex-direction: column;
  gap: 17px;
}
.rail-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: 52px;
  height: 57px;
  border-radius: 10px;
  color: #939d98;
  font-size: 12px;
  font-weight: 600;
}
.rail-item:hover {
  background: #f4f7f4;
  color: var(--teal);
}
.rail-item.active {
  color: var(--teal);
  background: #eaf4ef;
}
.rail-bottom {
  margin-top: auto;
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 22px;
  padding-bottom: 23px;
}
.avatar {
  width: 31px;
  height: 31px;
  border: 3px solid #fff;
  box-shadow: 0 0 0 1px #e7e9e4;
  background: #edece3;
  color: #74796a;
  font-size: 11px;
  font-weight: 700;
  border-radius: 50%;
  display: grid;
  place-items: center;
}
.workspace {
  margin-left: 76px;
  width: calc(100% - 76px);
}
.topbar {
  height: 77px;
  border-bottom: 1px solid var(--line);
  background: #ffffffbb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 38px;
}
.wordmark {
  display: flex;
  align-items: baseline;
  gap: 5px;
  font-weight: 750;
  font-size: 22px;
  letter-spacing: -1px;
  color: #253c33;
}
.wordmark > span:first-child {
  font-size: 19px;
  color: #87978d;
  font-weight: 450;
  letter-spacing: -0.6px;
}
.beta {
  align-self: center;
  font-size: 10px;
  color: #8d998b;
  border: 1px solid #e2e9de;
  background: #f7f9f3;
  border-radius: 4px;
  margin-left: 9px;
  padding: 3px 5px;
  font-weight: 600;
  letter-spacing: 1px;
}
.top-right {
  display: flex;
  align-items: center;
  gap: 22px;
}
.local-status {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #959e98;
  font-size: 12px;
}
.local-status i,
.browser-badge > span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #7ca28a;
}
.top-divider {
  width: 1px;
  height: 17px;
  background: var(--line);
}
.quiet-button {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  color: #7c8880;
  padding: 7px 0;
}
.quiet-button:hover {
  color: var(--teal);
}
.github-link {
  color: #9aa39b;
  display: grid;
  place-items: center;
}
.github-link:hover {
  color: var(--teal);
}
main {
  max-width: 1510px;
  margin: 0 auto;
  padding: 27px 38px 0;
}
.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #a4aca5;
  font-size: 12px;
}
.breadcrumbs > span:last-child {
  color: #6d7d70;
}
.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32px 0 28px;
  gap: 15px;
}
.eyebrow {
  font-size: 10px;
  letter-spacing: 1.8px;
  color: #849485;
  font-weight: 650;
  margin-bottom: 11px;
  display: flex;
  align-items: center;
  gap: 7px;
}
.eyebrow > span {
  width: 12px;
  height: 1px;
  background: #739d7d;
}
h1 {
  font-size: 30px;
  font-weight: 600;
  letter-spacing: -1.6px;
  line-height: 1.45;
}
h1 > span {
  color: var(--teal);
}
.page-heading p {
  font-size: 13px;
  color: #8a948b;
  margin-top: 9px;
  letter-spacing: -0.1px;
}
.heading-actions {
  display: flex;
  gap: 8px;
  margin-top: 20px;
}
.secondary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid #e0e6dd;
  background: #fff;
  font-size: 12px;
  padding: 10px 13px;
  border-radius: 6px;
  color: #5b6b5f;
  min-height: 35px;
}
.secondary-button:hover {
  background: #f2f7f2;
  border-color: #afc8b8;
}
.secondary-button:disabled {
  opacity: 0.45;
}
.primary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--teal);
  color: #fff;
  border: 1px solid var(--teal);
  border-radius: 6px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 550;
  box-shadow: 0 3px 5px #087f7415;
}
.primary-button:hover {
  background: #066b61;
}
.primary-button:disabled {
  opacity: 0.6;
}
.button-arrow {
  margin-left: 12px;
  color: #b9d7c8;
}
.problem-tabs {
  display: flex;
  align-items: center;
  gap: 20px;
  border-bottom: 1px solid #dfe6dd;
  margin-bottom: 24px;
  min-height: 47px;
}
.problem-tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: 7px;
  color: #9da79d;
  font-size: 13px;
  padding: 13px 0 15px;
}
.problem-tab > span {
  font-size: 10px;
  letter-spacing: 0.2px;
  background: #eef0eb;
  color: #9ba297;
  border-radius: 3px;
  padding: 2px 4px;
  line-height: 1.3;
}
.problem-tab.selected {
  color: var(--teal);
  font-weight: 600;
}
.problem-tab.selected:after {
  content: '';
  height: 2px;
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  background: var(--teal);
}
.problem-tab.selected > span {
  background: #e6f1e9;
  color: #388275;
}
.problem-tab:disabled {
  opacity: 0.7;
}
.browser-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  font-size: 11px;
  color: #9aa395;
  padding-bottom: 3px;
  white-space: nowrap;
}
.studio-grid {
  display: grid;
  grid-template-columns: minmax(330px, 0.76fr) minmax(0, 1.24fr);
  gap: 22px;
  align-items: start;
}
.model-column,
.results-column {
  display: flex;
  flex-direction: column;
  gap: 15px;
  min-width: 0;
}
.panel {
  background: var(--panel);
  border: 1px solid #e1e7dd;
  border-radius: 11px;
  box-shadow: 0 3px 8px #34482d02;
}
.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 21px;
}
.section-label {
  display: flex;
  align-items: center;
  gap: 8px;
}
.step-number {
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 11px;
  color: #83927e;
  border: 1px solid #e3eadf;
  background: #fafbf7;
  width: 22px;
  height: 21px;
  display: grid;
  place-items: center;
  border-radius: 5px;
}
h2 {
  font-size: 13px;
  font-weight: 650;
  letter-spacing: -0.4px;
}
.model-panel {
  padding: 21px 21px 0;
}
.text-button {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #839180;
  font-size: 11px;
  padding: 3px 0;
}
.text-button:hover {
  color: var(--teal);
}
.text-button:disabled {
  opacity: 0.4;
}
.examples-wrap {
  position: relative;
}
.examples-menu {
  position: absolute;
  right: 0;
  top: 29px;
  z-index: 35;
  width: min(340px, calc(100vw - 48px));
  max-height: min(520px, 65dvh);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 9px;
  background: #fff;
  border: 1px solid var(--line);
  box-shadow: 0 12px 40px #1e392b1a;
  border-radius: 10px;
}
.menu-label {
  font-size: 11px;
  color: #a0a89b;
  display: block;
  padding: 7px 8px 10px;
}
.examples-menu > button {
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  width: 100%;
  padding: 11px 8px;
  border-radius: 6px;
}
.examples-menu > button:hover {
  background: #f0f6ef;
}
.example-icon {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid #e1eadd;
  border-radius: 7px;
  background: #f6f9f3;
  color: #4b8c73;
}
.examples-menu b {
  font-size: 13px;
  font-weight: 550;
}
.examples-menu small {
  font-size: 11px;
  color: #96a08f;
  display: block;
  margin-top: 4px;
}
.examples-menu > button > svg {
  margin-left: auto;
  color: #a5ad9e;
}
.model-title {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.model-title input {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.6px;
  border: 0;
  background: transparent;
  color: #314030;
  padding: 0;
  min-width: 100px;
  width: 100%;
  text-overflow: ellipsis;
}
.model-tag {
  font-size: 9px;
  letter-spacing: 0.7px;
  color: #759873;
  border: 1px solid #e0e9d9;
  background: #f6f9ef;
  padding: 3px 5px;
  border-radius: 3px;
  display: none;
}
.model-description {
  font-size: 12px;
  color: #929d8d;
  margin: 9px 0 23px;
  line-height: 1.7;
  word-break: keep-all;
}
.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #85917f;
  font-size: 10px;
  margin-bottom: 10px;
}
.editor-toolbar > span:first-child {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #657a64;
  font-size: 11px;
}
.equation-editor {
  background: #f6f8f3;
  display: flex;
  border: 1px solid #e9ede3;
  border-radius: 6px;
  min-height: 160px;
  padding: 17px 0;
  overflow: hidden;
}
.line-numbers {
  overflow: hidden;
  flex-shrink: 0;
  padding: 0 12px 24px 13px;
  display: flex;
  flex-direction: column;
  font-size: 12px;
  line-height: 28px;
  color: #bdc7b2;
  user-select: none;
  text-align: right;
}
.equation-editor textarea {
  resize: none;
  min-height: 140px;
  max-height: 420px;
  display: block;
  margin: 0;
  line-height: 28px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
  font-size: 13px;
  border: 0;
  padding: 0 12px 0 2px;
  width: 100%;
  color: #226d5b;
  background: transparent;
  outline: none;
  white-space: pre;
  tab-size: 2;
  overflow: auto;
}
.equation-editor:focus-within {
  border-color: #b3d0b8;
  box-shadow: 0 0 0 2px #4b9e7511;
}
.equation-editor textarea:focus-visible {
  outline: 0;
}
.editor-error {
  border-color: #eab9aa;
}
.editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 11px 0 19px;
  gap: 8px;
}
.editor-footer > span {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  color: #92a083;
}
.status-dot {
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #75a17c;
  flex-shrink: 0;
}
.error-dot {
  background: #c4755a;
}
.syntax-button {
  font-size: 10px;
}
.model-run-row {
  border-top: 1px solid #ecf0e6;
  margin: 0 -21px;
  padding: 14px 21px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.model-run-row > span {
  font-size: 10px;
  color: #a1aa98;
  display: flex;
  align-items: center;
  gap: 4px;
}
.keycap {
  font-size: 11px;
  display: inline-grid;
  place-items: center;
  border: 1px solid #e9ede3;
  border-radius: 3px;
  width: 17px;
  height: 17px;
  background: #f9faf6;
}
.parameter-panel {
  padding: 20px 21px 17px;
}
.parameter-panel .panel-heading {
  margin-bottom: 10px;
}
.count-badge {
  font-size: 10px;
  display: grid;
  place-items: center;
  background: #f0f4ea;
  color: #9aa78e;
  width: 16px;
  height: 16px;
  border-radius: 4px;
}
.icon-button {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  color: #99a38e;
  border-radius: 4px;
  padding: 0;
}
.icon-button:hover,
.icon-button.is-selected {
  background: #edf4e8;
  color: var(--teal);
}
.section-description {
  font-size: 11px;
  color: #98a28e;
  margin-bottom: 20px;
}
.parameter-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.parameter-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  gap: 8px;
}
.parameter-top > div:first-child {
  display: flex;
  align-items: center;
  gap: 9px;
}
.parameter-name {
  font-family: Consolas, monospace;
  font-size: 13px;
  color: #476a50;
  font-weight: 600;
}
.parameter-role {
  font-size: 10px;
  color: #a0aa92;
}
.parameter-input-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
}
.parameter-input-wrap > input {
  border: 1px solid #e3e9db;
  background: #fafbf7;
  border-radius: 4px;
  width: 64px;
  padding: 4px 4px;
  text-align: center;
  font-family: Consolas, monospace;
  font-size: 12px;
  color: #5d7754;
  height: 25px;
  appearance: textfield;
}
.parameter-input-wrap > input::-webkit-inner-spin-button {
  appearance: none;
}
.delete-param {
  padding: 3px;
  color: #bb8e73;
  display: flex;
}
.parameter-slider {
  width: 100%;
  height: 4px;
  appearance: none;
  -webkit-appearance: none;
  background: linear-gradient(
    to right,
    #6a9d86 var(--range-fill),
    #e8eee1 var(--range-fill)
  );
  border-radius: 9px;
  cursor: pointer;
  display: block;
  margin: 11px 0 9px;
}
.parameter-slider::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  background: white;
  border: 2px solid #6b9d84;
  border-radius: 50%;
  box-shadow: 0 1px 2px #1d552720;
}
.parameter-slider::-moz-range-thumb {
  width: 9px;
  height: 9px;
  background: #fff;
  border: 2px solid #6b9d84;
  border-radius: 50%;
}
.parameter-slider:focus-visible {
  outline: 2px solid #98cbb4;
  outline-offset: 5px;
}
.range-labels {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #a3ae97;
  font-size: 10px;
  font-family: Consolas, monospace;
}
.range-labels > span:nth-child(2):not(:last-child) {
  font-family: inherit;
  font-size: 9px;
  color: #b0b7a4;
}
.add-parameter {
  margin-top: 22px;
  width: 100%;
  height: 32px;
  border: 1px dashed #dce6d4;
  border-radius: 5px;
  color: #839978;
  display: flex;
  gap: 5px;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}
.add-parameter:hover {
  background: #f4f8ef;
  border-color: #a3bf92;
}
.live-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 9.5px;
  color: #a1ad91;
  margin-top: 13px;
}
.live-dot {
  width: 4px;
  height: 4px;
  background: #92ad70;
  border-radius: 50%;
}
.range-editor {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 10px;
  background: #f7f9f3;
  border-radius: 5px;
  align-items: flex-end;
}
.range-editor label {
  flex: 1;
  min-width: 50px;
  font-size: 10px;
  color: #8a9b7d;
}
.range-editor input {
  display: block;
  width: 100%;
  min-width: 0;
  border: 1px solid #dfe6d7;
  background: #fff;
  border-radius: 4px;
  padding: 5px;
  font-size: 12px;
  margin-top: 5px;
}
.range-editor button {
  display: grid;
  place-items: center;
  background: #e6efdf;
  border-radius: 4px;
  padding: 6px;
  color: var(--teal);
}
.range-editor > span {
  color: #b55d45;
  font-size: 11px;
  width: 100%;
}
.no-parameters {
  padding: 8px 0 12px;
  text-align: center;
  color: #90a080;
  font-size: 12px;
  line-height: 1.9;
}
.no-parameters svg {
  margin-bottom: 8px;
  color: #a5b89b;
}
.tip-card {
  display: flex;
  gap: 11px;
  align-items: center;
  background: #f0f3e9;
  border: 1px solid #e5ebdc;
  border-radius: 8px;
  padding: 15px;
}
.tip-icon {
  align-self: flex-start;
  margin-top: 1px;
  color: #8d9d6e;
}
.tip-card b {
  font-size: 12px;
  font-weight: 500;
  color: #748461;
  display: block;
  margin-bottom: 5px;
}
.tip-card p > span {
  font-size: 10px;
  line-height: 1.8;
  color: #98a386;
  display: block;
  word-break: keep-all;
}
.tip-card > svg {
  margin-left: auto;
  color: #a0ae8c;
}
.results-panel {
  overflow: hidden;
}
.results-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 22px 19px;
}
.results-heading-right {
  display: flex;
  gap: 9px;
  align-items: center;
}
.engine-status {
  font-size: 10px;
  font-family: Consolas, monospace;
  display: flex;
  align-items: center;
  gap: 5px;
  color: #72967d;
  transition: opacity 0.2s;
}
.engine-status.has-error {
  color: #bf735d;
}
.result-mode-tabs {
  display: flex;
  align-items: center;
  gap: 24px;
  margin: 0 22px;
  border-bottom: 1px solid #e8ede3;
}
.result-mode-tabs > button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 0 14px;
  font-size: 12px;
  color: #939f8a;
  position: relative;
}
.result-mode-tabs > button.active {
  color: var(--teal);
  font-weight: 550;
}
.result-mode-tabs > button.active:after {
  content: '';
  position: absolute;
  height: 2px;
  background: var(--teal);
  bottom: -1px;
  left: 0;
  right: 0;
}
.new-badge {
  font-size: 8px;
  letter-spacing: 0.8px;
  background: #ecf5e7;
  color: #6b945d;
  padding: 3px 4px;
  border-radius: 3px;
  margin-left: 3px;
}
.solution-summary {
  padding: 21px 22px 18px;
}
.summary-label {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #96a48a;
  font-size: 11px;
}
.found-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: #f0f7e8;
  color: #72935b;
  font-size: 10px;
  padding: 4px 6px;
  border-radius: 4px;
}
.solution-cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}
.solution-cards.many-values {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.solution-value {
  background: #f6f9f3;
  border: 1px solid #e7eddf;
  border-radius: 7px;
  position: relative;
  padding: 14px 16px 12px;
  min-width: 0;
}
.solution-value:nth-child(2) {
  background: #fcf9f3;
  border-color: #f0e8db;
}
.solution-value:nth-child(3n) {
  background: #f7f8fb;
  border-color: #e5e9f3;
}
.solution-value > div {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-family: Consolas, monospace;
  color: #66886b;
}
.solution-value > div > i {
  height: 5px;
  width: 5px;
  border-radius: 50%;
}
.solution-value:nth-child(2) > div {
  color: #ac8d67;
}
.solution-value > strong {
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-weight: 500;
  font-size: 29px;
  letter-spacing: -1px;
  color: #3c694e;
  display: block;
  line-height: 1.5;
  margin: 3px 0;
  overflow-wrap: anywhere;
}
.solution-value:nth-child(2) > strong {
  color: #a17f51;
}
.value-caption {
  font-size: 10px;
  color: #9eac94;
}
.solution-value:nth-child(2) .value-caption {
  color: #b4a48d;
}
.chart-section {
  padding: 17px 22px 19px;
  border-top: 1px solid #eef1e9;
}
.chart-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.chart-heading h3 {
  font-size: 13px;
  font-weight: 550;
  color: #4a654e;
  letter-spacing: -0.3px;
}
.chart-heading p {
  font-size: 10px;
  color: #a0ac92;
  margin-top: 6px;
}
.chart-kicker {
  font-size: 8px;
  color: #b1bca2;
  letter-spacing: 1px;
}
.chart-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 18px;
  font-size: 10px;
  color: #8b9b7f;
}
.chart-controls label {
  margin-right: 2px;
}
.select-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.select-wrap select {
  border: 1px solid #e0e8d5;
  border-radius: 4px;
  background: #fbfcf8;
  font-size: 12px;
  color: #598064;
  appearance: none;
  padding: 5px 24px 5px 9px;
  min-width: 67px;
  font-family: Consolas, monospace;
  cursor: pointer;
}
.select-wrap svg {
  position: absolute;
  right: 7px;
  pointer-events: none;
  color: #9aaa8c;
}
.sweep-domain {
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: Consolas, monospace;
  color: #a0ad92;
}
.chart-footnote {
  font-size: 9px;
  color: #a4af99;
  margin-top: 8px;
  display: flex;
  gap: 5px;
  align-items: center;
}
.chart-current-dot {
  width: 5px;
  height: 5px;
  background: #97ab86;
  border-radius: 50%;
}
.data-section {
  border-top: 1px solid #e9eee1;
  padding: 0 22px 5px;
}
.data-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 14px 0 7px;
}
.data-toolbar > .text-button {
  font-size: 10px;
  color: #9dac91;
}
.table-scroll {
  width: 100%;
  overflow-x: auto;
}
.result-table {
  width: 100%;
  text-align: left;
  border-collapse: collapse;
  font-size: 12px;
  white-space: nowrap;
}
.result-table th {
  color: #9ca98c;
  font-size: 10px;
  font-weight: 400;
  padding: 10px;
  background: #f8faf4;
  border-top: 1px solid #edf1e5;
  border-bottom: 1px solid #e9efdf;
}
.result-table th:last-child,
.result-table td:last-child {
  text-align: right;
}
.result-table th:nth-child(2),
.result-table td:nth-child(2) {
  text-align: right;
}
.result-table td {
  padding: 12px 10px;
  border-bottom: 1px solid #eff3e8;
  font-family: Consolas, monospace;
  color: #6f8463;
}
.result-table tr:last-child td {
  border-bottom: 0;
}
.result-table td:first-child {
  color: #597b58;
}
.result-table td:last-child {
  color: #94a385;
  font-size: 11px;
}
.table-color {
  width: 5px;
  height: 5px;
  display: inline-block;
  border-radius: 50%;
  margin-right: 8px;
  vertical-align: 2px;
}
.result-table tr.highlighted td {
  background: #f0f7e9;
}
.result-footer {
  padding: 12px 22px;
  border-top: 1px solid #e9eee1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fcfdf9;
  color: #a1ae94;
  font-size: 9px;
}
.result-footer > span:first-child {
  display: flex;
  align-items: center;
  gap: 6px;
}
.result-footer i {
  font-style: normal;
  color: #c8d0be;
}
.result-footer > span:last-child {
  font-family: Consolas, monospace;
}
.insight-card {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 18px 19px;
  border: 1px solid #dce8dc;
  border-radius: 8px;
  background: linear-gradient(115deg, #eaf2e8, #f3f7f0);
  min-height: 78px;
}
.insight-icon {
  width: 32px;
  height: 32px;
  background: #e1ecdf;
  border: 1px solid #d5e5d1;
  color: #7e9d73;
  border-radius: 8px;
  display: grid;
  place-items: center;
}
.insight-card b {
  font-size: 12px;
  font-weight: 500;
  color: #65805e;
}
.insight-card p {
  font-size: 10px;
  color: #97a98b;
  line-height: 1.8;
  margin-top: 4px;
}
.insight-symbol {
  font-family: Georgia, serif;
  font-size: 37px;
  letter-spacing: -3px;
  font-style: italic;
  color: #c0d4b8;
  margin-left: auto;
  padding-right: 8px;
}
.page-footer {
  margin-top: 29px;
  border-top: 1px solid #e7ece0;
  padding: 19px 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #a5b099;
  font-size: 10px;
}
.page-footer > span:first-child {
  display: flex;
  align-items: center;
  font-weight: 550;
  color: #91a084;
}
.footer-studio {
  font-weight: 400;
  margin-left: 3px;
  color: #b1bba7;
}
.page-footer i {
  height: 8px;
  width: 1px;
  background: #dbe3d2;
  margin: 0 10px;
}
.footer-dot {
  margin: 0 7px;
}
.error-state,
.loading-state {
  min-height: 480px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  text-align: center;
  padding: 35px;
}
.error-state h3,
.loading-state h3 {
  font-size: 16px;
  font-weight: 550;
  color: #536a4f;
}
.error-state p {
  font-size: 13px;
  color: #aa705a;
  line-height: 1.9;
  max-width: 420px;
  overflow-wrap: anywhere;
}
.error-icon {
  display: grid;
  place-items: center;
  background: #fbf1e9;
  color: #c89170;
  width: 54px;
  height: 54px;
  border: 1px solid #eedfce;
  border-radius: 15px;
  margin-bottom: 7px;
}
.error-state .secondary-button {
  margin-top: 7px;
}
.loading-state {
  color: #7ba178;
}
.loading-state p {
  font-size: 12px;
  color: #a0ad94;
}
.empty-chart {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  min-height: 285px;
  color: #9eaf8d;
}
.empty-chart h4 {
  font-size: 13px;
  margin: 13px 0 7px;
  font-weight: 500;
  color: #79946e;
}
.empty-chart p {
  font-size: 12px;
  line-height: 1.9;
  text-align: center;
  color: #a2b193;
}
.empty-chart .text-button {
  margin-top: 15px;
  color: var(--teal);
}
.warning-box {
  margin: 0 22px 15px;
  border: 1px solid #eedbb5;
  padding: 10px 12px;
  background: #fffaf0;
  font-size: 12px;
  color: #9d7c35;
  line-height: 1.8;
  border-radius: 5px;
}
.report-content {
  padding: 21px 22px;
}
.report-title {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-bottom: 22px;
}
.report-title > div:nth-child(2) {
  min-width: 0;
}
.report-document-icon {
  width: 38px;
  height: 44px;
  display: grid;
  place-items: center;
  background: #f2f7ec;
  border: 1px solid #e1ead8;
  border-radius: 5px;
  color: #76966a;
}
.report-title span {
  font-size: 8px;
  letter-spacing: 1.7px;
  color: #9dab8d;
}
.report-title h3 {
  font-size: 14px;
  font-weight: 550;
  margin-top: 5px;
  overflow-wrap: anywhere;
}
.report-title button {
  margin-left: auto;
  font-size: 11px;
  flex-shrink: 0;
}
.report-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 29px;
}
.report-metrics > div {
  padding: 13px 10px;
  background: #f8faf4;
  border: 1px solid #e8eedf;
  border-radius: 5px;
  min-width: 0;
}
.report-metrics span {
  font-size: 10px;
  color: #94a385;
}
.report-metrics strong {
  font-size: 15px;
  display: block;
  font-family: Consolas, monospace;
  font-weight: 500;
  color: #68875e;
  margin-top: 8px;
  overflow-wrap: anywhere;
}
.report-metrics small {
  font-size: 11px;
  color: #a2ad96;
}
.report-content h4 {
  font-size: 12px;
  font-weight: 550;
  color: #6e8862;
  margin: 19px 0 12px;
}
.report-content pre {
  font-family: Consolas, monospace;
  font-size: 13px;
  line-height: 2;
  background: #f7f9f3;
  border: 1px solid #e9efdf;
  padding: 14px;
  border-radius: 5px;
  color: #6c8c60;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.report-param-list {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
}
.report-param-list > span {
  border: 1px solid #e3eada;
  border-radius: 4px;
  padding: 6px 9px;
  background: #fbfcf8;
  font-family: Consolas, monospace;
  font-size: 12px;
  color: #91a383;
}
.report-param-list b {
  font-weight: 500;
  color: #557c50;
  margin-left: 10px;
}
.report-param-list p {
  font-size: 12px;
  color: #97a98c;
}
.report-explanation {
  font-size: 12px;
  line-height: 1.9;
  color: #91a084;
  word-break: keep-all;
}
.matrix-view {
  padding: 16px 0 14px;
  overflow-x: auto;
}
.matrix-caption {
  font-size: 12px;
  color: #7d946d;
  font-family: Consolas, monospace;
  display: flex;
  align-items: center;
  gap: 12px;
  white-space: nowrap;
}
.matrix-caption span {
  font-size: 10px;
  font-family: inherit;
  color: #a7b19a;
}
.matrix-equation {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 17px 0 0;
  color: #a4b194;
  min-width: max-content;
  font-family: Consolas, monospace;
}
.matrix-bracket {
  padding: 3px 7px;
  position: relative;
  max-height: 220px;
  overflow: auto;
  border-left: 1.5px solid #b6c7a8;
  border-right: 1.5px solid #b6c7a8;
  border-radius: 2px;
}
.matrix-bracket td {
  text-align: center;
  font-size: 12px;
  padding: 5px 9px;
  color: #7d926c;
}
.matrix-bracket .matrix-variable {
  font-style: italic;
  color: var(--teal);
}
.residual-list {
  border-top: 1px solid #e7eddf;
  margin-top: 8px;
}
.residual-list > div {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 2px;
  border-bottom: 1px solid #edf1e7;
  font-size: 11px;
  color: #95a687;
}
.residual-list code {
  margin-left: auto;
  color: #809a71;
}
.residual-list svg {
  color: #93b680;
}
.results-expanded {
  grid-template-columns: 1fr;
}
.results-expanded .model-column {
  display: none;
}
.results-expanded .results-column {
  max-width: none;
  width: 100%;
  margin: auto;
}
.results-expanded .solution-chart {
  max-width: none;
  margin-inline: 0;
}
.toast {
  position: fixed;
  bottom: 26px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  background: #284b3b;
  color: #e4efdf;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #52795c;
  box-shadow: 0 8px 35px #213c2d24;
  padding: 13px 16px;
  border-radius: 8px;
  font-size: 13px;
  max-width: calc(100vw - 32px);
}
.toast > svg {
  color: #b0cc9b;
}
.toast button {
  display: grid;
  place-items: center;
  color: #a4bea0;
  padding: 2px;
  margin-left: 10px;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: #1c35275c;
  backdrop-filter: blur(4px);
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.parameter-modal {
  background: #fcfdf8;
  border: 1px solid #dce7d6;
  width: 440px;
  max-width: 100%;
  padding: 34px;
  border-radius: 15px;
  box-shadow: 0 24px 100px #1c35272b;
  position: relative;
}
.modal-close {
  position: absolute;
  top: 15px;
  right: 15px;
}
.modal-eyebrow {
  font-size: 9px;
  letter-spacing: 1.5px;
  color: #8ca17b;
}
.parameter-modal h2 {
  font-size: 23px;
  letter-spacing: -1px;
  margin: 13px 0;
  color: #376c4c;
}
.parameter-modal > p {
  font-size: 12px;
  line-height: 1.9;
  color: #92a182;
}
.parameter-modal form > label {
  display: block;
  font-size: 12px;
  color: #748e62;
  margin-top: 21px;
}
.parameter-modal form > label > input {
  display: block;
  margin-top: 7px;
  padding: 10px;
  border: 1px solid #dce7d1;
  background: #fff;
  width: 100%;
  border-radius: 5px;
  font-size: 13px;
  color: #3c6e4d;
}
.parameter-modal input::placeholder {
  color: #b0bda5;
  font-size: 13px;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 27px;
}
.form-error {
  color: #bc7457;
  font-size: 12px;
  margin-top: 12px;
}
.spin {
  animation: spin 1.2s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@media (min-width: 1550px) {
  main {
    padding-top: 32px;
  }
  .page-heading {
    padding-top: 36px;
    padding-bottom: 34px;
  }
  .studio-grid {
    grid-template-columns: minmax(390px, 0.76fr) minmax(0, 1.24fr);
  }
  .equation-editor {
    min-height: 185px;
  }
  .equation-editor textarea {
    min-height: 147px;
  }
  .parameter-list {
    gap: 21px;
  }
  .model-title input {
    font-size: 18px;
  }
  .model-description {
    font-size: 13px;
  }
  .solution-value > strong {
    font-size: 35px;
  }
  .solution-value {
    padding: 18px;
  }
  .solution-summary {
    padding-bottom: 24px;
  }
  .chart-section {
    padding-top: 23px;
  }
  .results-heading {
    padding-top: 22px;
  }
  .chart-heading h3 {
    font-size: 13px;
  }
  .parameter-panel {
    padding-top: 23px;
    padding-bottom: 22px;
  }
}
@media (max-width: 1190px) {
  main {
    padding-left: 25px;
    padding-right: 25px;
  }
  .topbar {
    padding: 0 25px;
  }
  .studio-grid {
    gap: 16px;
    grid-template-columns: minmax(300px, 0.8fr) minmax(0, 1.2fr);
  }
  .problem-tabs {
    gap: 17px;
  }
  .browser-badge {
    display: none;
  }
  .chart-kicker {
    display: none;
  }
  .solution-value > strong {
    font-size: 25px;
  }
  .model-panel {
    padding: 18px 17px 0;
  }
  .parameter-panel {
    padding: 18px 17px;
  }
  .model-run-row {
    margin: 0 -17px;
    padding: 13px 17px;
  }
  .result-mode-tabs {
    gap: 17px;
  }
  .result-mode-tabs > button {
    font-size: 11px;
  }
  .new-badge {
    font-size: 5px;
  }
  .results-heading {
    padding: 18px;
  }
  .chart-section,
  .solution-summary,
  .report-content {
    padding-left: 18px;
    padding-right: 18px;
  }
  .result-mode-tabs {
    margin-inline: 18px;
  }
  .data-section {
    padding-inline: 18px;
  }
  .insight-symbol {
    display: none;
  }
  .page-heading h1 {
    font-size: 27px;
  }
  .page-heading p {
    font-size: 12px;
  }
  .heading-actions .secondary-button {
    padding: 9px;
    font-size: 11px;
  }
  .local-status {
    font-size: 11px;
  }
  .solution-cards {
    gap: 9px;
  }
}
@media (max-width: 960px) {
  .rail {
    width: 62px;
    flex-basis: 62px;
  }
  .workspace {
    margin-left: 62px;
    width: calc(100% - 62px);
  }
  main {
    padding: 23px 22px 0;
  }
  .topbar {
    padding: 0 22px;
    height: 68px;
  }
  .brand-mark {
    width: 32px;
    height: 32px;
  }
  .rail {
    padding-top: 18px;
  }
  .rail-item {
    width: 44px;
  }
  .wordmark {
    font-size: 20px;
  }
  .wordmark > span:first-child {
    font-size: 17px;
  }
  .beta {
    font-size: 8px;
  }
  .top-right {
    gap: 14px;
  }
  .top-right .local-status {
    display: none;
  }
  .top-divider {
    display: none;
  }
  .studio-grid {
    grid-template-columns: minmax(270px, 0.85fr) minmax(0, 1.15fr);
    gap: 12px;
  }
  .model-description {
    font-size: 11px;
  }
  .model-title input {
    font-size: 14px;
  }
  .line-numbers {
    overflow: hidden;
    flex-shrink: 0;
    padding-left: 9px;
    padding-right: 8px;
  }
  .equation-editor textarea {
    font-size: 12px;
  }
  .section-description {
    font-size: 10px;
  }
  .panel-heading {
    margin-bottom: 17px;
  }
  .model-panel {
    padding-inline: 14px;
  }
  .model-run-row {
    margin-inline: -14px;
    padding-inline: 14px;
  }
  .model-run-row > span {
    font-size: 9px;
  }
  .model-run-row .primary-button {
    font-size: 12px;
    padding: 9px 11px;
  }
  .button-arrow {
    margin-left: 3px;
  }
  .parameter-panel {
    padding-inline: 14px;
  }
  .result-mode-tabs > button {
    font-size: 10px;
    gap: 4px;
  }
  .result-mode-tabs {
    gap: 14px;
    margin-inline: 15px;
  }
  .new-badge {
    display: none;
  }
  .results-heading {
    padding-inline: 15px;
  }
  .solution-summary {
    padding: 16px 15px;
  }
  .solution-value {
    padding: 11px;
  }
  .solution-value > strong {
    font-size: 23px;
  }
  .chart-section {
    padding-inline: 15px;
  }
  .data-section {
    padding-inline: 15px;
  }
  .engine-status {
    font-size: 9px;
  }
  .page-heading h1 {
    font-size: 25px;
  }
  .page-heading p {
    font-size: 11px;
  }
  .heading-actions .import-button {
    display: none;
  }
  .eyebrow {
    font-size: 9px;
  }
  .result-footer {
    padding-inline: 15px;
    font-size: 8px;
  }
  .result-table th,
  .result-table td {
    padding-inline: 6px;
  }
  .chart-footnote {
    font-size: 8px;
  }
  .tip-card {
    padding: 12px;
    gap: 8px;
  }
  .tip-card b {
    font-size: 11px;
  }
  .tip-card p > span {
    font-size: 9px;
  }
  .insight-card {
    padding: 14px;
    gap: 9px;
  }
  .insight-card b {
    font-size: 11px;
  }
  .insight-card p {
    font-size: 9px;
  }
  .insight-icon {
    width: 27px;
    height: 27px;
  }
  .problem-tab {
    font-size: 12px;
    gap: 5px;
  }
  .problem-tabs {
    gap: 20px;
  }
  .problem-tab > svg {
    width: 13px;
  }
  .problem-tab > span {
    font-size: 8px;
  }
  .page-footer > span:last-child {
    font-size: 9px;
  }
  .parameter-role {
    font-size: 9px;
  }
  .live-note {
    font-size: 8.5px;
  }
  .chart-heading p {
    font-size: 9px;
  }
  .report-title {
    flex-wrap: wrap;
  }
  .report-title button {
    font-size: 10px;
    padding: 8px;
  }
  .report-title h3 {
    font-size: 13px;
  }
  .report-metrics {
    gap: 5px;
  }
  .report-metrics > div {
    padding: 10px 7px;
  }
  .report-metrics strong {
    font-size: 13px;
  }
  .report-metrics span {
    font-size: 9px;
  }
}
@media (max-width: 760px) {
  .rail {
    width: 54px;
    flex-basis: 54px;
  }
  .workspace {
    margin-left: 54px;
    width: calc(100% - 54px);
  }
  .rail-item {
    width: 40px;
    font-size: 10px;
  }
  .rail-item svg {
    width: 18px;
  }
  .rail-group {
    margin-top: 30px;
  }
  .rail-bottom {
    gap: 15px;
  }
  .avatar {
    width: 27px;
    height: 27px;
    font-size: 10px;
  }
  .brand-mark {
    width: 29px;
    height: 29px;
    border-radius: 9px;
  }
  .brand-mark span {
    font-size: 30px;
  }
  .brand-mark i {
    width: 4px;
    height: 4px;
    right: 5px;
    top: 6px;
  }
  .topbar {
    height: 64px;
    padding: 0 17px;
  }
  .top-right .quiet-button {
    padding: 4px;
  }
  .top-right .quiet-button > span {
    display: none;
  }
  .top-right .github-link {
    display: none;
  }
  .wordmark {
    font-size: 19px;
  }
  .wordmark > span:first-child {
    font-size: 15px;
  }
  .beta {
    margin-left: 4px;
    font-size: 5px;
    padding: 3px;
  }
  .top-right {
    gap: 5px;
  }
  main {
    padding: 20px 16px 0;
  }
  .breadcrumbs {
    font-size: 10px;
    gap: 5px;
  }
  .page-heading {
    padding: 24px 0;
    align-items: flex-start;
    position: relative;
    display: block;
  }
  .page-heading h1 {
    font-size: 25px;
  }
  .page-heading p {
    font-size: 11px;
    max-width: 240px;
    line-height: 1.8;
  }
  .eyebrow {
    font-size: 8px;
    letter-spacing: 1.4px;
  }
  .heading-actions {
    margin-top: 16px;
    gap: 7px;
  }
  .heading-actions .import-button {
    display: inline-flex;
  }
  .heading-actions .secondary-button {
    font-size: 10px;
    min-height: 30px;
    padding: 7px 9px;
  }
  .heading-actions svg {
    width: 13px;
  }
  .problem-tabs {
    gap: 16px;
    overflow: auto;
    margin-bottom: 17px;
    min-height: 43px;
  }
  .problem-tab {
    font-size: 11px;
    gap: 5px;
    flex-shrink: 0;
    padding: 11px 0 13px;
  }
  .problem-tab > span {
    font-size: 8px;
  }
  .problem-tab > svg {
    display: none;
  }
  .studio-grid {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .model-column,
  .results-column {
    width: 100%;
    gap: 12px;
  }
  .model-panel {
    padding: 19px 18px 0;
  }
  .panel-heading {
    margin-bottom: 20px;
  }
  .model-title input {
    font-size: 17px;
  }
  .model-description {
    font-size: 12px;
    margin-bottom: 20px;
  }
  .equation-editor textarea {
    font-size: 13px;
    min-height: 123px;
  }
  .line-numbers {
    overflow: hidden;
    flex-shrink: 0;
    padding-inline: 11px;
  }
  .editor-toolbar {
    font-size: 9px;
  }
  .editor-toolbar > span:first-child {
    font-size: 11px;
  }
  .editor-footer {
    font-size: 10px;
  }
  .model-run-row {
    margin-inline: -18px;
    padding: 13px 18px;
  }
  .model-run-row > span {
    font-size: 10px;
  }
  .model-run-row .primary-button {
    font-size: 13px;
    padding: 10px 16px;
  }
  .button-arrow {
    margin-left: 10px;
  }
  .parameter-panel {
    padding: 19px 18px;
  }
  .parameter-panel .section-description {
    font-size: 11px;
  }
  .parameter-list {
    gap: 19px;
  }
  .parameter-top {
    margin-bottom: 8px;
  }
  .parameter-input-wrap > input {
    width: 67px;
  }
  .parameter-slider {
    height: 5px;
  }
  .range-labels {
    font-size: 11px;
  }
  .parameter-role {
    font-size: 10px;
  }
  .live-note {
    font-size: 10px;
  }
  .tip-card {
    display: none;
  }
  .results-heading {
    padding: 19px 18px;
  }
  .result-mode-tabs {
    margin-inline: 18px;
    gap: 21px;
  }
  .result-mode-tabs > button {
    font-size: 11px;
  }
  .new-badge {
    display: inline-block;
  }
  .engine-status {
    font-size: 10px;
  }
  .solution-summary {
    padding: 19px 18px;
  }
  .solution-value {
    padding: 14px;
  }
  .solution-value > strong {
    font-size: 27px;
  }
  .solution-cards {
    gap: 11px;
  }
  .chart-section {
    padding: 19px 14px 18px;
  }
  .chart-heading h3 {
    font-size: 13px;
  }
  .chart-heading p {
    font-size: 10px;
  }
  .chart-controls {
    margin-top: 17px;
  }
  .chart-footnote {
    font-size: 8.5px;
    line-height: 1.8;
  }
  .data-section {
    padding-inline: 16px;
  }
  .data-toolbar {
    margin-top: 12px;
  }
  .result-table th {
    font-size: 9px;
  }
  .result-table td {
    font-size: 12px;
    padding-block: 12px;
  }
  .result-footer {
    padding: 11px 16px;
    font-size: 8.5px;
  }
  .insight-card {
    padding: 16px 14px;
  }
  .insight-card b {
    font-size: 12px;
  }
  .insight-card p {
    font-size: 10px;
  }
  .page-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 19px 0;
    margin-top: 24px;
  }
  .page-footer > span:last-child {
    font-size: 9px;
  }
  .toast {
    font-size: 12px;
    width: max-content;
    bottom: 15px;
    padding: 12px;
  }
  .parameter-modal {
    padding: 29px 24px;
  }
  .modal-backdrop {
    padding: 15px;
  }
  .report-content {
    padding: 20px 18px;
  }
  .report-metrics strong {
    font-size: 13px;
  }
  .report-title button {
    font-size: 10px;
  }
  .matrix-equation {
    gap: 12px;
  }
  .report-metrics > div {
    padding: 12px 8px;
  }
  .report-metrics span {
    font-size: 9px;
  }
  .results-expanded .model-column {
    display: none;
  }
  .empty-chart {
    min-height: 250px;
  }
  .error-state {
    padding: 27px;
    min-height: 350px;
  }
  .error-state h3 {
    font-size: 14px;
  }
  .error-state p {
    font-size: 12px;
  }
  .chart-controls select {
    font-size: 12px;
  }
  .chart-section .solution-chart {
    margin-inline: -3px;
  }
}
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation: none !important;
    transition: none !important;
    scroll-behavior: auto !important;
  }
}
@media print {
  .rail,
  .topbar,
  .page-heading,
  .breadcrumbs,
  .problem-tabs,
  .model-column,
  .result-mode-tabs,
  .results-heading-right,
  .report-title button,
  .page-footer,
  .toast,
  .insight-card {
    display: none !important;
  }
  .workspace {
    margin: 0;
    width: 100%;
  }
  main {
    padding: 0;
  }
  .studio-grid {
    display: block;
  }
  .panel {
    border: 0;
    box-shadow: none;
  }
  .report-content {
    padding: 0;
  }
  .results-heading {
    padding-left: 0;
  }
  .solution-summary {
    padding-left: 0;
  }
  .results-column {
    display: block;
  }
  .result-footer {
    display: none;
  }
}

@media (max-width: 760px) {
  .result-mode-tabs {
    gap: 15px;
  }
  .result-mode-tabs > button {
    font-size: 10px;
  }
  .new-badge {
    display: none;
  }
  .live-note {
    font-size: 9px;
  }
  .problem-tabs {
    gap: 16px;
  }
  .problem-tab {
    font-size: 10px;
  }
  .problem-tab > span {
    font-size: 7px;
  }
  .problem-tab > svg {
    display: none;
  }
}
.sweep-table-caption {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 9px;
  color: #8e9e84;
  margin: 4px 0 10px;
  line-height: 1.6;
}
.sweep-table-caption > span:last-child {
  color: #a2ae98;
}
.sweep-table-scroll {
  max-height: 185px;
  position: relative;
  scrollbar-width: thin;
  scrollbar-color: #cad8bf #f7faf3;
}
.sweep-table thead {
  position: sticky;
  top: 0;
  z-index: 2;
}
.sweep-table th {
  background: #f5f8f0;
}
.sweep-table th:not(:first-child),
.sweep-table td:not(:first-child) {
  text-align: right;
}
.sweep-table td:last-child {
  color: #6f8463;
  font-size: 11px;
}
.sweep-table tr {
  outline-offset: -2px;
  cursor: crosshair;
}
.sweep-table tr:focus-visible {
  outline: 2px solid #a4c7a3;
}
.sweep-table tr.highlighted td {
  background: #eaf3e4;
  color: #407048;
}
.physical-warning {
  border-color: #ecd6b8;
  background: #fffbf2;
  color: #a18558;
}
.is-computing .solution-cards,
.is-computing .chart-section .solution-chart,
.is-computing .data-section table {
  opacity: 0.55;
  transition: opacity 0.15s;
}
.is-computing .data-section table {
  pointer-events: none;
}
@media (max-width: 760px) {
  .sweep-table-caption {
    font-size: 8px;
  }
  .sweep-table-caption > span:last-child {
    display: none;
  }
  .sweep-table td:last-child {
    font-size: 11px;
  }
  .chart-footnote {
    font-size: 8px;
  }
  .result-footer {
    font-size: 8px;
  }
  .result-footer > span:last-child {
    font-size: 7px;
  }
  .engine-status {
    font-size: 9px;
  }
}

.data-section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 550;
  color: #537955;
  padding: 5px 0;
}
.sweep-table-caption b {
  font-weight: 500;
  color: #64835a;
  font-variant-numeric: tabular-nums;
}
.dataset-endpoint-note {
  font-size: 9px;
  line-height: 1.7;
  color: #8b977b;
  margin: 0 0 9px;
}
.dataset-error {
  border: 1px solid #ebd9b9;
  background: #fffaf1;
  border-radius: 6px;
  padding: 13px 14px;
  margin: 8px 0 15px;
  font-size: 11px;
  line-height: 1.9;
  color: #9a7942;
}
.dataset-error span {
  display: block;
  margin-top: 5px;
  color: #9e977f;
  font-size: 10px;
}
.matrix-details {
  border: 1px solid #e2eadb;
  border-radius: 6px;
  margin-top: 17px;
  background: #fbfcf8;
  padding: 0 12px;
}
.matrix-details summary {
  display: flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  color: #6b845f;
  font-size: 11px;
  padding: 13px 0;
  list-style: none;
}
.matrix-details summary::-webkit-details-marker {
  display: none;
}
.matrix-details summary svg:last-child {
  margin-left: auto;
  transition: transform 0.15s;
}
.matrix-details[open] summary svg:last-child {
  transform: rotate(180deg);
}
.matrix-details summary:focus-visible {
  outline: 2px solid #91b783;
  outline-offset: 3px;
}
.matrix-details > p {
  font-size: 10px;
  color: #90a084;
  line-height: 1.9;
  border-top: 1px solid #e8eddf;
  padding-top: 12px;
}
.matrix-details .residual-list {
  margin-bottom: 12px;
}
@media print {
  .matrix-details {
    border: 0;
    padding: 0;
  }
  .matrix-details > summary {
    display: none;
  }
  .matrix-details > *:not(summary) {
    display: block !important;
  }
}

.condition-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 0;
  margin-bottom: 8px;
  border-top: 1px solid #e9eee3;
}
.condition-controls label {
  font-size: 11px;
  font-weight: 550;
  color: #64825b;
}
.condition-controls p {
  font-size: 9px;
  color: #94a286;
  margin-top: 5px;
  line-height: 1.7;
}
.condition-select-wrap {
  position: relative;
  min-width: 0;
}
.condition-select-wrap select {
  appearance: none;
  border: 1px solid #dce6d3;
  border-radius: 5px;
  background: #fafcf6;
  color: #607e54;
  font-size: 11px;
  padding: 9px 30px 9px 10px;
  width: 100%;
  cursor: pointer;
}
.condition-select-wrap > svg {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: #97aa86;
}
.report-metrics .condition-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: inherit;
  font-size: 9px;
  padding: 3px 5px;
  border-radius: 4px;
  margin-top: 9px;
  border: 1px solid;
  line-height: 1.3;
}
.condition-badge i,
.condition-dot {
  height: 5px;
  width: 5px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}
.report-metrics .condition-badge[data-level='stable'] {
  background: #edf5e7;
  color: #64814e;
  border-color: #dce9d1;
}
.condition-badge[data-level='stable'] i,
.condition-dot.stable {
  background: #7ca65d;
}
.report-metrics .condition-badge[data-level='sensitive'] {
  background: #fff6df;
  color: #a17a25;
  border-color: #ebdcac;
}
.condition-badge[data-level='sensitive'] i,
.condition-dot.sensitive {
  background: #c6a047;
}
.report-metrics .condition-badge[data-level='very-sensitive'] {
  background: #fff0e9;
  color: #b56d4c;
  border-color: #efd7c9;
}
.condition-badge[data-level='very-sensitive'] i,
.condition-dot.very-sensitive {
  background: #d38a65;
}
.report-metrics .condition-badge[data-level='unavailable'] {
  background: #f2f3ef;
  color: #8b9385;
  border-color: #e1e5da;
}
.condition-badge[data-level='unavailable'] i {
  background: #a7af9d;
}
.condition-explanation {
  margin-top: -12px;
  border: 1px solid #e4ebdb;
  background: #fafcf6;
  border-radius: 6px;
  padding: 13px 14px;
  color: #7c916e;
  font-size: 10px;
  line-height: 1.9;
}
.condition-explanation[data-level='sensitive'] {
  border-color: #ecdfb6;
  background: #fffcf3;
}
.condition-explanation[data-level='very-sensitive'] {
  border-color: #eed9cc;
  background: #fff9f5;
}
.condition-thresholds {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin: 10px 0 9px;
  font-size: 9px;
}
.condition-thresholds > span {
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  color: #87977c;
}
.condition-thresholds b {
  font-weight: 550;
  color: #718564;
}
.condition-caveat {
  font-size: 9px;
  color: #9ba78d;
  line-height: 1.8;
}
.condition-guide {
  margin-top: 11px;
  padding-top: 8px;
  border-top: 1px solid #e5ebdc;
}
.condition-guide summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  cursor: pointer;
  color: #7c946c;
  font-size: 9px;
  list-style: none;
}
.condition-guide summary::-webkit-details-marker {
  display: none;
}
.condition-guide summary:focus-visible {
  outline: 2px solid #b1c7a0;
  outline-offset: 3px;
}
.condition-guide[open] summary > svg {
  transform: rotate(180deg);
}
.condition-guide p {
  font-size: 9px;
  line-height: 1.9;
  margin-top: 9px;
  color: #8d9d7f;
}
.condition-guide b {
  font-weight: 550;
  color: #718962;
}
.is-computing .condition-value,
.is-computing .condition-badge,
.is-computing .condition-explanation {
  opacity: 0.5;
}
@media (max-width: 760px) {
  .condition-controls {
    align-items: stretch;
    flex-direction: column;
    gap: 10px;
  }
  .condition-controls label {
    font-size: 11px;
  }
  .condition-controls p {
    font-size: 9px;
  }
  .condition-select-wrap select {
    font-size: 11px;
  }
  .condition-thresholds {
    flex-direction: column;
    gap: 4px;
  }
  .report-metrics .condition-badge {
    font-size: 8px;
    padding: 3px;
  }
  .condition-explanation {
    padding: 11px;
    font-size: 10px;
  }
}
.planned-category:disabled {
  opacity: 0.45;
  cursor: default;
  gap: 4px;
}
.planned-category small {
  font-size: 7px;
  color: #a1ad95;
  font-weight: 400;
}
.planned-category span {
  font-size: 9px;
  letter-spacing: -0.4px;
}
.empty-workspace {
  min-height: 500px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 40px;
  text-align: center;
  background: radial-gradient(ellipse at 50% 36%, #f6f9f2, transparent 60%);
}
.empty-workspace-icon {
  height: 61px;
  width: 61px;
  display: grid;
  place-items: center;
  border: 1px solid #e2ead8;
  border-radius: 17px;
  background: #f0f5e9;
  color: #8aa777;
  margin-bottom: 24px;
  box-shadow: 0 5px 20px #4e775708;
}
.empty-workspace > span {
  font-size: 8px;
  letter-spacing: 1.8px;
  color: #a3b196;
  margin-bottom: 13px;
}
.empty-workspace h3 {
  font-size: 17px;
  font-weight: 500;
  letter-spacing: -0.7px;
  color: #64825b;
}
.empty-workspace > p {
  font-size: 11px;
  color: #9ba88e;
  line-height: 1.9;
  max-width: 310px;
  margin-top: 12px;
  word-break: keep-all;
}
.empty-workspace > button {
  margin-top: 26px;
  color: #7d956c;
  border-color: #dce7d0;
}
.nonlinear-status {
  margin: 0 22px 17px;
  border: 1px solid #e3eadb;
  background: #f8fbf4;
  border-radius: 6px;
  padding: 12px 14px;
}
.nonlinear-status > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #78936b;
  font-size: 10px;
}
.nonlinear-status b {
  font-size: 9px;
  font-weight: 500;
  border: 1px solid #dfebd4;
  border-radius: 3px;
  padding: 2px 5px;
  background: #eff6e7;
  color: #8ca079;
}
.nonlinear-status p {
  font-size: 9px;
  line-height: 1.8;
  color: #9ba98e;
  margin-top: 8px;
  word-break: keep-all;
}
.nonlinear-sweep-note {
  font-size: 9px;
  line-height: 1.8;
  background: #f7f9f2;
  color: #9daa8e;
  padding: 8px 10px;
  margin-top: 12px;
  border-radius: 4px;
}
.auxiliary-values {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
  margin: 0 22px 17px;
  font-size: 10px;
  color: #98a68c;
}
.auxiliary-values > span:not(:first-child) {
  border: 1px solid #e6ecdd;
  border-radius: 4px;
  background: #fafcf7;
  padding: 5px 8px;
}
.auxiliary-values code {
  font-size: 10px;
  color: #7c9570;
}
.auxiliary-values b {
  font-family: Consolas, monospace;
  font-weight: 400;
  margin-left: 8px;
  color: #88a17a;
}
.local-condition-note {
  font-size: 10px;
  line-height: 1.9;
  color: #9d8c65;
  margin: 9px 0;
}
.evaluation-metrics {
  grid-template-columns: 1fr 1fr;
}
.toast .undo-button {
  display: inline-block;
  padding: 3px 6px;
  border: 1px solid #65825c;
  border-radius: 4px;
  color: #d3e3c3;
  font-size: 10px;
}
@media (max-width: 760px) {
  .empty-workspace {
    min-height: 360px;
    padding: 25px 20px;
  }
  .empty-workspace h3 {
    font-size: 14px;
  }
  .empty-workspace > p {
    font-size: 10px;
  }
  .nonlinear-status {
    margin-inline: 18px;
    padding: 11px;
  }
  .nonlinear-status > div {
    gap: 7px;
    font-size: 9px;
  }
  .nonlinear-status p {
    font-size: 9px;
  }
  .heading-actions {
    flex-wrap: wrap;
  }
  .heading-actions .new-model-button {
    display: flex;
  }
  .breadcrumbs {
    flex-wrap: wrap;
  }
  .planned-category span {
    font-size: 7px;
  }
  .planned-category small {
    font-size: 6px;
  }
  .auxiliary-values {
    margin-inline: 18px;
  }
  .page-heading h1 {
    font-size: 28px;
  }
}
.nonlinear-settings {
  border-top: 1px solid #e9eee3;
  margin: 0 -21px;
  padding: 0 21px;
  background: #fbfcf8;
}
.nonlinear-settings > summary {
  display: flex;
  align-items: center;
  gap: 6px;
  list-style: none;
  padding: 12px 0;
  color: #8b9e7c;
  cursor: pointer;
  font-size: 10px;
}
.nonlinear-settings > summary::-webkit-details-marker {
  display: none;
}
.nonlinear-settings > summary > svg:last-child {
  margin-left: auto;
}
.nonlinear-settings[open] > summary > svg:last-child {
  transform: rotate(180deg);
}
.nonlinear-settings-body {
  padding-bottom: 14px;
  color: #93a286;
  font-size: 10px;
}
.nonlinear-settings-body > label {
  display: block;
  margin-bottom: 7px;
  color: #738c63;
}
.nonlinear-settings-body > select {
  border: 1px solid #dce6d2;
  background: #fff;
  color: #6f885f;
  border-radius: 5px;
  padding: 8px;
  width: 100%;
  font-size: 11px;
}
.nonlinear-settings-body > p {
  line-height: 1.9;
  margin-top: 10px;
}
.search-bounds-form > p {
  font-size: 9px;
  line-height: 1.9;
  margin: 11px 0;
  color: #9ba98e;
}
.search-bounds-form > div {
  display: flex;
  align-items: flex-end;
  gap: 6px;
}
.search-bounds-form label {
  flex: 1;
  min-width: 0;
  font-size: 9px;
  color: #829774;
}
.search-bounds-form input {
  display: block;
  margin-top: 5px;
  border: 1px solid #dce7d2;
  border-radius: 4px;
  padding: 7px;
  width: 100%;
  min-width: 0;
  font-family: Consolas, monospace;
  font-size: 10px;
  color: #66875b;
}
.search-bounds-form button {
  border: 1px solid #d6e4ca;
  background: #eef5e8;
  border-radius: 4px;
  padding: 7px 8px;
  color: #6b885b;
  font-size: 10px;
  height: 29px;
}
.search-bounds-form > span {
  display: block;
  margin-top: 8px;
  color: #b17b54;
  font-size: 9px;
}
.legacy-conditions-note {
  font-size: 9px;
  color: #a99877;
  line-height: 1.8;
  margin: 10px 0;
}
.solutions-section {
  padding: 20px 22px 17px;
  border-bottom: 1px solid #e8eee0;
  background: linear-gradient(135deg, #fcfdf9, #fff);
}
.solutions-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 9px;
  margin-bottom: 13px;
}
.solution-count {
  font-size: 12px;
  letter-spacing: -0.3px;
  font-weight: 550;
  color: #5a7d55;
}
.solutions-title > span {
  font-size: 8px;
  color: #a0ae92;
}
.solution-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
  max-height: 215px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #d3dfc9 #f8faf5;
}
.solution-choice {
  text-align: left;
  white-space: normal;
  border: 1px solid #e2ead8;
  background: #fff;
  border-radius: 6px;
  padding: 10px 12px;
  min-width: 0;
}
.solution-choice > span {
  font-size: 8px;
  display: block;
  letter-spacing: 0.6px;
  color: #a0af92;
  margin-bottom: 6px;
}
.solution-choice > strong {
  font-family: Consolas, monospace;
  font-size: 12px;
  line-height: 1.7;
  font-weight: 400;
  color: #7b956c;
  overflow-wrap: anywhere;
}
.solution-choice.selected {
  background: #eef5e8;
  border-color: #a5c28e;
  box-shadow: inset 0 0 0 1px #b8cfa63d;
}
.solution-choice.selected > span {
  color: #73965e;
}
.solution-choice.selected > strong {
  color: #466e3c;
}
.solution-choice:disabled {
  opacity: 0.6;
}
.search-summary {
  margin-top: 13px;
  color: #8fa07f;
  font-size: 9px;
  line-height: 1.9;
}
.search-summary > div {
  display: flex;
  align-items: center;
  gap: 5px 12px;
  flex-wrap: wrap;
}
.search-summary strong {
  font-weight: 400;
  color: #81996f;
  font-family: Consolas, monospace;
  overflow-wrap: anywhere;
}
.search-summary > p {
  font-size: 8px;
  color: #a3af96;
  margin-top: 5px;
  max-width: none;
}
.error-state .search-summary {
  max-width: 430px;
  padding: 12px;
  border: 1px solid #e5eadf;
  border-radius: 6px;
  background: #fafcf7;
  text-align: left;
}
.error-state .search-summary > p {
  font-size: 9px;
  color: #97a588;
}
.solution-cards.single-value {
  grid-template-columns: 1fr;
}
.all-reports-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: 100%;
  border: 1px solid #dce7d2;
  background: #f5f9ef;
  border-radius: 5px;
  color: #819970;
  font-size: 10px;
  padding: 9px;
  margin: -5px 0 17px;
}
.all-reports-button > span {
  border: 1px solid #dfebd3;
  border-radius: 3px;
  padding: 1px 4px;
  font-size: 8px;
  color: #99ad87;
}
.all-reports-button:hover {
  background: #eef5e5;
}
.all-reports-button:disabled {
  opacity: 0.5;
}
@media (max-width: 960px) {
  .nonlinear-settings {
    margin-inline: -14px;
    padding-inline: 14px;
  }
}
@media (max-width: 760px) {
  .nonlinear-settings {
    margin-inline: -18px;
    padding-inline: 18px;
  }
  .solutions-section {
    padding-inline: 18px;
  }
  .solutions-title {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }
  .solutions-title > span {
    font-size: 9px;
  }
  .solution-list {
    gap: 6px;
  }
  .solution-choice {
    padding: 9px;
  }
  .solution-choice > strong {
    font-size: 11px;
  }
  .search-summary > div {
    align-items: flex-start;
    flex-direction: column;
    gap: 2px;
  }
  .search-summary > p {
    font-size: 9px;
  }
  .all-reports-button {
    font-size: 10px;
  }
}

.parameter-current-value {
  font-size: 9px;
  font-family: Consolas, monospace;
  color: #94a287;
}
.results-parameters {
  padding: 15px 22px;
  background: #fbfdf7;
  border-top: 1px solid #edf1e6;
  border-bottom: 1px solid #e7eedf;
}
.results-parameters-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 13px;
  color: #76906a;
  font-size: 11px;
}
.results-parameters-heading > span {
  display: flex;
  align-items: center;
  gap: 6px;
}
.results-parameters-heading > small {
  font-size: 8px;
  color: #9bab8c;
}
.results-parameter-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 23px;
}
.result-parameter {
  min-width: 0;
}
.result-parameter .parameter-top {
  margin: 0;
}
.result-parameter .parameter-name {
  font-size: 11px;
}
.result-parameter .parameter-input-wrap > input {
  width: 67px;
  background: #fff;
}
.result-parameter .range-labels {
  font-size: 8px;
}
.result-parameter .parameter-slider {
  margin-top: 12px;
}
.solution-item {
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.solution-item > .solution-choice {
  width: 100%;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  flex: 1;
}
.add-simulation-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: 100%;
  padding: 7px 6px;
  color: #91a77c;
  background: #f9fbf5;
  border: 1px solid #e1ead6;
  border-top: 0;
  border-radius: 0 0 5px 5px;
  font-size: 9px;
}
.add-simulation-button:hover {
  background: #eef5e7;
  color: #658a50;
}
.add-simulation-button:disabled {
  color: #acb8a0;
  background: #fbfcf8;
  opacity: 0.7;
}
.multi-simulation-view .solution-summary,
.multi-simulation-view > .nonlinear-status,
.multi-simulation-view > .auxiliary-values {
  display: none;
}
.multi-simulation-view .solution-list {
  max-height: 135px;
}
.multi-simulation-view .solutions-section {
  padding-bottom: 13px;
}
.multi-simulation-workspace {
  padding: 19px 20px 20px;
  border-top: 1px solid #e4ebdb;
  background: #f8faf4;
}
.multi-simulation-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 17px;
}
.multi-simulation-toolbar h3 {
  font-size: 12px;
  font-weight: 550;
  color: #6e895d;
}
.multi-simulation-toolbar h3 span {
  font-size: 9px;
  font-weight: 400;
  color: #9aab88;
  margin-left: 6px;
}
.multi-simulation-toolbar p {
  font-size: 9px;
  line-height: 1.8;
  color: #a0ad92;
  margin-top: 6px;
}
.multi-simulation-toolbar > label {
  font-size: 9px;
  color: #8ca17a;
  display: flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;
}
.multi-simulation-toolbar select {
  appearance: auto;
  border: 1px solid #dde8d0;
  border-radius: 4px;
  background: #fff;
  color: #749466;
  font-size: 10px;
  padding: 6px;
  max-width: 110px;
}
.simulation-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 15px;
  align-items: start;
}
.multi-simulation-note {
  font-size: 9px;
  color: #a1af92;
  line-height: 1.9;
  margin-top: 14px;
}
.results-expanded {
  position: fixed;
  inset: 0;
  z-index: 65;
  width: 100vw;
  height: 100dvh;
  overflow-y: auto;
  background: #f6f8f2;
  padding: 18px 24px;
  display: block;
  overscroll-behavior: contain;
}
.results-expanded .results-column {
  max-width: 1750px;
  margin: auto;
  gap: 15px;
}
.results-expanded .results-panel {
  overflow: visible;
}
.results-expanded .results-heading {
  position: sticky;
  top: 0;
  z-index: 8;
  background: #fff;
  border-radius: 10px 10px 0 0;
  border-bottom: 1px solid #e8eedf;
  padding-top: 19px;
  padding-bottom: 19px;
}
.results-expanded .results-parameters {
  position: sticky;
  top: 63px;
  z-index: 7;
  max-height: 190px;
  overflow-y: auto;
  background: #fbfdf7;
  box-shadow: 0 5px 10px #344d2910;
}
.results-expanded .results-parameter-grid {
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 15px 28px;
}
.results-expanded .multi-simulation-workspace {
  padding: 20px 24px 24px;
}
.results-expanded .simulation-grid {
  gap: 20px;
}
.results-expanded .chart-section {
  padding-inline: 30px;
}
.results-expanded .insight-card {
  display: none;
}
@media (max-width: 1190px) {
  .simulation-grid {
    grid-template-columns: 1fr;
  }
  .results-expanded .simulation-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .results-parameters {
    padding-inline: 18px;
  }
  .multi-simulation-toolbar {
    align-items: flex-start;
    flex-wrap: wrap;
  }
}
@media (max-width: 760px) {
  .results-parameters {
    padding: 15px 18px;
  }
  .results-parameter-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  .results-parameters-heading {
    font-size: 10px;
  }
  .results-parameters-heading > small {
    font-size: 7px;
  }
  .multi-simulation-workspace {
    padding: 16px 13px;
  }
  .simulation-grid,
  .results-expanded .simulation-grid {
    grid-template-columns: 1fr;
  }
  .multi-simulation-toolbar {
    gap: 10px;
  }
  .multi-simulation-toolbar h3 {
    font-size: 11px;
  }
  .results-expanded {
    padding: 8px;
  }
  .results-expanded .results-heading {
    padding: 15px;
  }
  .results-expanded .results-parameters {
    top: 57px;
    max-height: 185px;
  }
  .results-expanded .multi-simulation-workspace {
    padding: 15px 12px;
  }
  .results-expanded .chart-section {
    padding-inline: 16px;
  }
  .results-expanded .results-parameter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 15px;
  }
  .solution-item .add-simulation-button {
    font-size: 8px;
  }
}

.example-walkthrough {
  margin: 16px 38px 0;
  padding: 0 18px;
  border: 1px solid #dce7d7;
  border-radius: 10px;
  background: #f6faf2;
  color: #3e6252;
}
.example-walkthrough summary {
  padding: 14px 0;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.example-walkthrough summary span {
  margin-left: 12px;
  color: #75866d;
  font-size: 11px;
  font-weight: 400;
}
.example-walkthrough p,
.example-walkthrough li {
  font-size: 12px;
  line-height: 1.9;
}
.example-walkthrough ol {
  padding-left: 20px;
}
.example-walkthrough a {
  display: inline-block;
  margin: 4px 0 12px;
  color: #28765d;
  font-size: 12px;
  text-decoration: underline;
}
.example-walkthrough small {
  display: block;
  padding-bottom: 16px;
  font-size: 11px;
  color: #7b8775;
  line-height: 1.7;
}
@media (max-width: 600px) {
  .example-walkthrough {
    margin-inline: 16px;
  }
  .example-walkthrough summary span {
    display: block;
    margin: 7px 0 0;
    line-height: 1.7;
  }
}

.line-numbers > span {
  flex: 0 0 28px;
  height: 28px;
  line-height: 28px;
}
```

<a id="source-16"></a>

## src/workspace-screens.css

원본: [src/workspace-screens.css](../../src/workspace-screens.css) · 292줄 · SHA-256: `f14e5e6d45b2cbcf3e10803aa2b7a765d6dcc45fa59845d402366eb3cbef3987`

```css
[hidden] {
  display: none !important;
}
.merge-actions,
.merged-set-Chips,
.merged-variable-selector {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 14px 20px;
}
.merge-actions > span {
  font-size: 11px;
  color: #84927b;
}
.merged-sets-grid {
  display: grid;
  gap: 20px;
  padding: 20px;
  background: #f7f9f3;
}
.merged-branch-chip {
  border: 1px solid #dae3d5;
  border-radius: 20px;
  padding: 7px 12px;
  font-size: 12px;
}
.merged-branch-chip.is-active {
  background: #edf6e9;
  color: #3a6856;
}
.merged-branch-chip i,
.merged-card-label i {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 7px;
}
.merged-variable-selector button {
  padding: 6px 14px;
  border-radius: 5px;
  border: 1px solid #dce5d5;
}
.merged-variable-selector .is-selected {
  background: #e9f4e7;
}
.merged-current-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  padding: 0 20px 16px;
}
.merged-current-card {
  background: #f3f7ef;
  border: 1px solid #e1e8dc;
  border-radius: 7px;
  padding: 14px;
  display: grid;
  gap: 10px;
}
.merged-card-label {
  font-size: 11px;
  color: #809178;
}
.merged-current-card strong {
  font-size: 15px;
  color: #4d7461;
}
.sc-sample-toggle {
  display: flex;
  align-items: center;
  gap: 5px;
}
.sc-sample-toggle input {
  width: 13px;
  height: 13px;
  accent-color: #087f74;
}
.sc-bifurcation-banner {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 0;
}
.sc-bifurcation-chip {
  border: 1px solid #ecd3b4;
  background: #fffbf3;
  border-radius: 5px;
  padding: 8px;
  font-size: 11px;
}

.workspace {
  margin-left: 0;
  width: 100%;
}

.module-home-page {
  min-height: calc(100dvh - 77px);
  display: grid;
  align-items: center;
}

.module-home-page .module-home {
  width: 100%;
  padding-block: 36px;
}

.workspace-nav-container {
  max-width: 1510px;
  margin: 0 auto;
  padding: 22px 38px 0;
}
.workspace-nav-container .workspace-navigation {
  margin-bottom: 0;
}
.workspace-content {
  padding-top: 18px;
}
.workspace-content .page-heading {
  margin-block: 20px 25px;
}
.workspace-content .page-heading h1 {
  font-size: 29px;
}
.sectioned-workspace.studio-grid {
  display: block;
}
.sectioned-workspace .model-column {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.85fr);
  align-items: start;
  gap: 20px;
}
.sectioned-workspace .model-panel {
  grid-row: 1 / 3;
}
.sectioned-workspace .model-column > .tip-card,
.sectioned-workspace .insight-card {
  display: none;
}
.model-next-step {
  padding: 18px;
  border: 1px solid #e1e8dc;
  border-radius: 9px;
  background: #f3f7ed;
}
.model-next-step p {
  font-size: 12px;
  line-height: 1.8;
  color: #7c8c75;
  margin-bottom: 15px;
  overflow-wrap: anywhere;
}
.model-next-step button {
  width: 100%;
  justify-content: center;
}
.sectioned-workspace .results-column {
  max-width: none;
}
.sectioned-workspace .solutions-section {
  padding: 0;
}
.sectioned-workspace .solutions-title {
  list-style: none;
  margin: 0;
  padding: 20px 24px;
  cursor: pointer;
}
.sectioned-workspace .solutions-title::-webkit-details-marker {
  display: none;
}
.sectioned-workspace .solutions-title > span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.sectioned-workspace .solutions-section[open] .solutions-title > span svg {
  transform: rotate(180deg);
}
.sectioned-workspace .solutions-section .solution-list {
  margin: 0 24px 12px;
  max-height: 260px;
}
.sectioned-workspace .solutions-section .search-summary {
  padding: 0 24px 18px;
  margin-top: 10px;
}
.sectioned-workspace .automatic-simulation-view > .solution-summary,
.sectioned-workspace .automatic-simulation-view > .nonlinear-status,
.sectioned-workspace .automatic-simulation-view > .warning-box,
.sectioned-workspace .automatic-simulation-view > .auxiliary-values,
.sectioned-workspace .automatic-simulation-view > .result-footer {
  display: none;
}
.selected-simulation-workspace {
  padding: 20px 24px 24px;
  background: #f7f9f3;
}
.discovery-status {
  padding: 14px 24px;
  color: #7c8c75;
  font-size: 11px;
  line-height: 1.7;
  border-bottom: 1px solid #e8ece1;
}
.selected-simulation-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  color: #85957a;
  font-size: 11px;
}
.selected-simulation-toolbar label,
.selected-simulation-toolbar select {
  font-size: 12px;
}
.selected-simulation-toolbar select {
  margin-left: 8px;
  padding: 8px 12px;
  border: 1px solid #dce6d3;
  border-radius: 6px;
  background: #fff;
  color: #64815b;
}
.sectioned-workspace .selected-simulation-workspace .solution-chart {
  max-width: 100%;
}
.sectioned-workspace .simulation-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.sectioned-workspace .simulation-panel-sweep-label {
  margin-block: 15px;
}
.results-expanded .selected-simulation-workspace {
  padding-bottom: 30px;
}
.workspace-screen-report .result-footer {
  border-top: 1px solid #edf0e7;
}
@media (max-width: 900px) {
  .workspace-nav-container {
    padding-inline: 20px;
  }
  .sectioned-workspace .model-column,
  .sectioned-workspace .simulation-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .sectioned-workspace .model-panel {
    grid-row: auto;
  }
}
@media (max-width: 600px) {
  .workspace-nav-container {
    padding: 14px 13px 0;
  }
  .workspace-content,
  .module-home-page {
    padding-inline: 13px;
  }
  .workspace-content .page-heading h1 {
    font-size: 24px;
  }
  .workspace-content .page-heading {
    margin-bottom: 20px;
  }
  .workspace-content .breadcrumbs {
    font-size: 10px;
  }
  .selected-simulation-workspace {
    padding: 16px 12px;
  }
  .selected-simulation-toolbar {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .sectioned-workspace .solutions-title {
    padding-inline: 16px;
    gap: 12px;
  }
  .sectioned-workspace .solutions-title > span {
    font-size: 9px;
  }
  .sectioned-workspace .solutions-section .solution-list {
    margin-inline: 16px;
  }
}
```
