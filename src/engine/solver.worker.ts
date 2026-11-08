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
