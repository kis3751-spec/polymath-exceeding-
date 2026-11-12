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
