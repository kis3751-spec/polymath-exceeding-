import { accountStorageKey } from '../account-storage'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  BookOpen,
  Download,
  FolderOpen,
  Play,
  Pause,
  Save,
} from 'lucide-react'
import { encodeCsv } from '../csv'
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
import ScientificOutput, { IntegralFormula } from './ScientificOutput'
import './ScientificWorkspace.css'

type Draft = {
  source: string
  parameters: Record<string, number>
  options: ScientificOptions
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
        source: saved.source,
        parameters: saved.parameters,
        options: { ...defaultOptions(module), ...(saved.options ?? {}) },
      }
  } catch {}
  return {
    source: getModuleExamples(module)[0]?.source ?? '',
    parameters: {},
    options: defaultOptions(module),
  }
}
function constants(source: string) {
  let table = false
  const list: { name: string; value: number }[] = []
  for (const raw of source.split('\n')) {
    const text = raw.split('#')[0].trim()
    if (text === '[') {
      table = true
      continue
    }
    if (text === ']') {
      table = false
      continue
    }
    if (table) continue
    const m =
      /^([A-Za-z][A-Za-z0-9_]*)\s*=\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)$/.exec(
        text,
      )
    if (m && Number.isFinite(Number(m[2])))
      list.push({ name: m[1], value: Number(m[2]) })
  }
  return list
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
    [guide, setGuide] = useState(false)
  const [cursor, setCursor] = useState(0),
    [playing, setPlaying] = useState(false),
    [phase, setPhase] = useState(false),
    [phaseX, setPhaseX] = useState(1),
    [phaseY, setPhaseY] = useState(2),
    [plotGroup, setPlotGroup] = useState('model')
  const [dataPage, setDataPage] = useState(0)
  const [ranges, setRanges] = useState<
    Record<string, { min: number; max: number }>
  >({})
  const worker = useRef<Worker | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    version = useRef(0),
    importRef = useRef<HTMLInputElement>(null)
  const draftKey = JSON.stringify(draft),
    stale = solvedKey !== draftKey
  const examples = getModuleExamples(module),
    parameters = useMemo(() => constants(draft.source), [draft.source])
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
          setSolvedKey(JSON.stringify(next))
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
      } catch {
        setToast('자동 저장을 사용할 수 없습니다. 프로젝트 파일로 저장하세요.')
      }
    }, 300)
    return () => clearTimeout(handle)
  }, [draftKey, module])
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
    setDraft({ ...draft, source, parameters: {} })
    setRanges({})
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
      ...initialDraft(module),
      source: example.source,
      parameters: {},
    }
    setDraft(next)
    setRanges({})
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
  const fieldValues = result?.rows[Math.min(cursor, result.rows.length - 1)]
  return (
    <div className="scientific-workspace">
      <header className="scientific-header ivc-toolbar">
        <button type="button" onClick={onHome}>
          <ArrowLeft size={16} />
          Home
        </button>
        <strong className="ivc-brand">{scientificTitles[module]}</strong>
        <button type="button" onClick={() => setGuide(true)}>
          <BookOpen size={16} />
          User Guide
        </button>
        <button type="button" onClick={saveProject}>
          <Save size={16} />
          Save Project
        </button>
        <button type="button" onClick={() => importRef.current?.click()}>
          <FolderOpen size={16} />
          Import
        </button>
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
            <label className="science-editor-label" htmlFor="scientific-source">
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
                        if (Number.isInteger(n) && n >= 2 && n <= 12) editFit(n)
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
                    데이터 예측은 나빠질 수 있습니다. Through Origin은 x=0일 때
                    y=0이라는 조건을 강제하므로 실험 이론상 맞을 때만
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
                    <option value="implicit">Implicit Euler · Stiffness</option>
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
                    스텝을 비교해 오차를 제어하며 RK45보다 많은 계산이 필요할 수
                    있습니다.
                  </p>
                  <p>
                    <b>Tolerance</b>는 각 내부 스텝의 수치 오차 제어 목표입니다.
                    Output Samples는 표와 그래프에 출력할 지점 수로 내부 스텝
                    간격과 다릅니다. 실제 측정 오차나 전 구간의 엄밀한 오차
                    상한을 보장하는 설정은 아닙니다. 자세한 계산 과정은 User
                    Guide의 ODE 탭을 참고하세요.
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
              <p>
                ODE 출력 샘플 수는 표와 그래프의 지점 수이며 솔버 내부 스텝 수와
                다릅니다. 허용 오차는 수치 제어 목표로 측정 오차나 전역 정확도의
                보장이 아닙니다. 비선형 회귀·최적화는 초기 추정값과 범위에 따라
                다른 국소 해를 찾을 수 있습니다.
              </p>
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
              {parameters.map((p) => {
                const val = draft.parameters[p.name] ?? p.value,
                  r = ranges[p.name] ?? {
                    min: p.value > 0 ? 0 : p.value < 0 ? p.value * 3 : -1,
                    max:
                      p.value > 0
                        ? Math.min(Number.MAX_VALUE, p.value * 3)
                        : p.value < 0
                          ? 0
                          : 1,
                  }
                return (
                  <div key={p.name}>
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
                      <summary>범위</summary>
                      <label>
                        최소
                        <input
                          type="number"
                          step="any"
                          value={r.min}
                          onChange={(e) => {
                            const v = Number(e.target.value)
                            if (Number.isFinite(v) && v < r.max)
                              setRanges({
                                ...ranges,
                                [p.name]: { ...r, min: v },
                              })
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
                              setRanges({
                                ...ranges,
                                [p.name]: { ...r, max: v },
                              })
                          }}
                        />
                      </label>
                    </details>
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
              {module === 'integration' && <IntegralFormula result={result} />}
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
                              module === 'ode' && dataPage * 100 + i === cursor
                                ? 'is-current'
                                : ''
                            }
                            onClick={() =>
                              module === 'ode' && setCursor(dataPage * 100 + i)
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
                    <RegressionResult result={result} />
                  ) : (
                    <ScientificOutput
                      result={result}
                      source={draft.source}
                      options={draft.options}
                    />
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
        </div>
      )}
      {guide && (
        <ModuleGuide initialTopic={module} onClose={() => setGuide(false)} />
      )}
    </div>
  )
}
