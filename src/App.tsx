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
  const [selectedSimulation, setSelectedSimulation] =
    useState<SimulationPanel | null>(null)
  const [simulationResults, setSimulationResults] = useState<SimulationPanel[]>(
    [],
  )
  const [searchInfo, setSearchInfo] = useState<SearchSummary | null>(null)
  const [pending, setPending] = useState(false)
  const [discoveryPending, setDiscoveryPending] = useState(false)
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
      { type: 'module' },
    )
    worker.current = w
    w.onmessage = ({ data }) => {
      if (data.id !== requestId.current) return
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
  function updateParameter(id: string, value: number) {
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
      'polymath-report.md',
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
    <div
      className={`app-shell ${screen === 'simulation' ? 'simulation-focused' : ''}`}
    >
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
                className={`panel results-panel ${view === 'report' ? 'analysis-view' : ''} ${automatic && view === 'simulation' ? 'automatic-simulation-view' : ''} ${automatic && anchors.length > 0 && view === 'simulation' ? 'multi-simulation-view' : ''}`}
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
                {automatic &&
                view === 'simulation' &&
                (selectedBranch ||
                  (!overviewHidden &&
                    overview?.anchors.length)) ? null : error ? (
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
                          />
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
                        <details className="analysis-details technical-diagnostics">
                          <summary>
                            조건수·등식 오차·계산 시간 자세히 보기
                          </summary>
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
