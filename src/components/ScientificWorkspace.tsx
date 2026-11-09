import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  BookOpen,
  Download,
  FolderOpen,
  Play,
  Pause,
  Save,
  X,
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
const storageKey = (m: string) => `polymath-scientific-${m}-v1`
const format = (x: number) =>
  !Number.isFinite(x)
    ? '산정 불가'
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
const labels: Record<ScientificModule, string> = {
  ode: '미분방정식',
  'curve-fit': '선형·다항 회귀',
  multilinear: '다중선형 회귀',
  'nonlinear-fit': '비선형 회귀',
  integration: '이산 적분',
  optimization: '제약 최적화',
  lsq: '최소제곱 최적화',
}
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
        { type: 'module' },
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
  useEffect(() => {
    if (!guide) return
    const before = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setGuide(false)
      if (e.key === 'Tab') {
        const dialog = document.querySelector<HTMLElement>(
          '.science-guide-modal',
        )
        const controls = Array.from(
          dialog?.querySelectorAll<HTMLElement>(
            'button,a,input,select,summary,[tabindex="0"]',
          ) ?? [],
        )
        const first = controls[0],
          last = controls.at(-1)
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('keydown', key)
      document.body.style.overflow = previousOverflow
      before?.focus({ preventScroll: true })
    }
  }, [guide])
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
      `polymath-${module}.json`,
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
      `polymath-${module}-report.md`,
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
      <header className="scientific-header">
        <button type="button" onClick={onHome}>
          <ArrowLeft size={16} />
          모듈 홈
        </button>
        <strong>{scientificTitles[module]}</strong>
        <button type="button" onClick={() => setGuide(true)}>
          <BookOpen size={16} />
          사용법
        </button>
        <button type="button" onClick={saveProject}>
          <Save size={16} />
          프로젝트 저장
        </button>
        <button type="button" onClick={() => importRef.current?.click()}>
          <FolderOpen size={16} />
          불러오기
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
              ? '모델·데이터'
              : s === 'simulation'
                ? '시뮬레이션'
                : '해석 리포트'}
          </button>
        ))}
        {['curve-fit', 'multilinear'].includes(module) && (
          <label>
            회귀 모델{' '}
            <select
              aria-label="회귀 모델"
              value={module}
              onChange={(e) =>
                onModuleChange?.(e.target.value as ScientificModule)
              }
            >
              <option value="curve-fit">선형·다항 회귀</option>
              <option value="multilinear">다중선형 회귀</option>
            </select>
          </label>
        )}
        {['optimization', 'lsq'].includes(module) && (
          <label>
            최적화 방식{' '}
            <select
              aria-label="최적화 방식"
              value={module}
              onChange={(e) =>
                onModuleChange?.(e.target.value as ScientificModule)
              }
            >
              <option value="optimization">목적함수·제약조건</option>
              <option value="lsq">최소제곱·제약조건</option>
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
                  예제 불러오기
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
              수식·데이터
            </label>
            <textarea
              id="scientific-source"
              aria-label="과학 계산 모델 입력"
              spellCheck={false}
              value={draft.source}
              onChange={(e) => {
                if (timer.current) clearTimeout(timer.current)
                worker.current?.terminate()
                version.current++
                setPending(false)
                setDraft({ ...draft, source: e.target.value, parameters: {} })
                setRanges({})
                setError('')
              }}
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
                계산·시뮬레이션
              </button>
              <span>Ctrl / ⌘ + Enter</span>
            </div>
          </section>
          <aside className="science-panel">
            <h2>계산 설정</h2>
            {module === 'ode' && (
              <>
                <label>
                  적분 방법
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
                    <option value="auto">자동 · RK45 / 강성 대응</option>
                    <option value="rk45">RK45</option>
                    <option value="implicit">음해법 · 강성 대응</option>
                  </select>
                </label>
                <label>
                  출력 샘플 수
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
                보간 방법
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
                  <option value="">입력 모델의 설정</option>
                  <option value="lin">구간별 선형</option>
                  <option value="ccs">자연 3차 스플라인</option>
                  <option value="akm">Akima</option>
                </select>
              </label>
            )}
            {['ode', 'nonlinear-fit', 'optimization', 'lsq'].includes(
              module,
            ) && (
              <label>
                수치 허용 오차
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
                최대 반복
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
              계산 후 리포트 보기
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
                    ? '시간에 따른 변화'
                    : module === 'integration'
                      ? '데이터와 적분'
                      : '계산 결과'}
                </h2>
                <div className="science-plot-switch">
                  {module === 'ode' && result.columns.length > 2 ? (
                    <>
                      <button
                        type="button"
                        aria-pressed={!phase}
                        onClick={() => setPhase(false)}
                      >
                        시간 그래프
                      </button>
                      <button
                        type="button"
                        aria-pressed={phase}
                        onClick={() => setPhase(true)}
                      >
                        위상 그래프
                      </button>
                      {phase && (
                        <>
                          <select
                            aria-label="위상 X 변수"
                            value={phaseX}
                            onChange={(e) => setPhaseX(Number(e.target.value))}
                          >
                            {result.columns.slice(1).map((x, i) => (
                              <option key={i} value={i + 1}>
                                {x}
                              </option>
                            ))}
                          </select>
                          <select
                            aria-label="위상 Y 변수"
                            value={phaseY}
                            onChange={(e) => setPhaseY(Number(e.target.value))}
                          >
                            {result.columns.slice(1).map((x, i) => (
                              <option key={i} value={i + 1}>
                                {x}
                              </option>
                            ))}
                          </select>
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
                        데이터·적합
                      </button>
                      <button
                        type="button"
                        aria-pressed={plotGroup === 'convergence'}
                        onClick={() => setPlotGroup('convergence')}
                      >
                        수렴 이력
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
                        측정·보간
                      </button>
                      <button
                        type="button"
                        aria-pressed={plotGroup === 'cumulative'}
                        onClick={() => setPlotGroup('cumulative')}
                      >
                        누적 적분
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
                          데이터·모델
                        </button>
                        <button
                          type="button"
                          aria-pressed={plotGroup === 'residual'}
                          onClick={() => setPlotGroup('residual')}
                        >
                          오차
                        </button>
                      </>
                    )
                  )}
                </div>
              </div>
              <ScientificChart
                series={plotted}
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
                <summary>데이터 표 · {result.rows.length}행</summary>
                <button
                  type="button"
                  disabled={stale || pending}
                  onClick={() =>
                    download(
                      `polymath-${module}-data.csv`,
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
                <h1>해석 리포트</h1>
                <button
                  type="button"
                  disabled={!reportResult}
                  onClick={exportReport}
                >
                  <Download size={16} />
                  리포트 저장
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
                        ? '수렴·정확도 조건 미충족'
                        : result.status === 'converged'
                          ? '수렴 조건 충족'
                          : '계산 완료'}
                    </strong>
                    <span>{result.message ?? result.method}</span>
                  </div>
                  {result.formula && (
                    <div className="science-formula">{result.formula}</div>
                  )}
                  <div className="science-metric-grid">
                    {result.metrics.map((m, i) => (
                      <article key={i}>
                        <span>{m.label}</span>
                        <strong>
                          {typeof m.value === 'number'
                            ? format(m.value)
                            : m.value}
                        </strong>
                        <details>
                          <summary>이 지표 읽는 법</summary>
                          <p>{m.detail}</p>
                        </details>
                      </article>
                    ))}
                  </div>
                  <details className="science-data" open>
                    <summary>계산값·계수</summary>
                    <table>
                      <thead>
                        <tr>
                          <th>변수</th>
                          <th>값</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(result.values).map(([name, value]) => (
                          <tr key={name}>
                            <th>{name}</th>
                            <td>{format(value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </details>
                  <details className="science-help">
                    <summary>계산 방법·설정</summary>
                    <p>
                      {result.method} · {result.durationMs.toFixed(2)} ms{' '}
                      {result.iterations !== undefined
                        ? ` · 반복 ${result.iterations}회`
                        : ''}
                      {result.evaluations !== undefined
                        ? ` · 평가 ${result.evaluations}회`
                        : ''}
                    </p>
                    <pre>{JSON.stringify(draft.options, null, 2)}</pre>
                  </details>
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
        <div
          className="science-modal-backdrop"
          onPointerDown={(e) => {
            if (e.currentTarget === e.target) setGuide(false)
          }}
        >
          <section
            className="science-guide-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="science-guide-title"
          >
            <button
              type="button"
              autoFocus
              className="science-guide-close"
              aria-label="과학 계산 사용법 닫기"
              onClick={() => setGuide(false)}
            >
              <X size={22} />
            </button>
            <h2 id="science-guide-title">{scientificTitles[module]} 사용법</h2>
            <p>{scientificDescriptions[module]}</p>
            <p>
              모델·데이터에서 식과 측정값을 입력하고 계산합니다. 시뮬레이션에서
              그래프·표를 확인하고, 리포트에서 지표를 클릭해 해석을 확인하세요.
              JSON 프로젝트는 입력과 설정을 함께 저장합니다.
            </p>
            <table>
              <thead>
                <tr>
                  <th>도구</th>
                  <th>입력 문법</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>미분방정식</th>
                  <td>
                    <code>d(A)/d(t)=-k*A</code>
                    <br />
                    <code>A(0)=1; t(0)=0; t(f)=10</code> (조건은 한 줄씩)
                  </td>
                </tr>
                <tr>
                  <th>선형·다항 회귀</th>
                  <td>
                    <code>polyfit x y 1</code> · 차수를 2 이상으로 바꾸면 다항식
                  </td>
                </tr>
                <tr>
                  <th>다중선형 회귀</th>
                  <td>
                    <code>mlinfit x1 x2 y</code>
                  </td>
                </tr>
                <tr>
                  <th>비선형 회귀</th>
                  <td>
                    <code>nlinfit y = a*x/(b+x)</code>
                    <br />
                    <code>m(a)=2</code>, <code>m(b)=1</code>을 각 줄에 입력
                  </td>
                </tr>
                <tr>
                  <th>이산 적분</th>
                  <td>
                    <code>integrate y(x) 0 4 200 lin</code> · lin / ccs / akm
                  </td>
                </tr>
                <tr>
                  <th>최적화</th>
                  <td>
                    <code>min: (x-2)^2+(y-1)^2</code>
                    <br />
                    <code>x|0 -10 10</code> · 이름|초기값 최소 최대
                  </td>
                </tr>
                <tr>
                  <th>LSQ 최적화</th>
                  <td>
                    <code>fit: y = a*x+b</code> · 표와 계수의 초기값·범위,
                    제약조건
                  </td>
                </tr>
              </tbody>
            </table>
            <p>
              표는 <code>[</code>와 <code>]</code> 사이에 첫 줄로 열 이름, 이후
              줄에 숫자를 입력합니다. 탭·공백·쉼표로 열을 구분할 수 있고
              소수점은 .을 사용합니다. # 뒤는 주석입니다.
            </p>
            <p>
              함수: sin, cos, tan, asin, acos, atan, exp, ln(자연로그),
              log·log10(상용로그), sqrt, abs, sinh, cosh, tanh, min, max.
              거듭제곱은 ^, 곱셈은 *입니다. 정의역 밖의 식은 계산 오류로
              안내합니다.
            </p>
            <h3>예제의 입력 형태</h3>
            <pre>{examples[0]?.source}</pre>
          </section>
        </div>
      )}
    </div>
  )
}
