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
          remember(curves, curveKey, curve)
        }

        let result: SolveResult | null = null
        let error: string | undefined
        try {
          const current = sweep ? parameters[sweep.name] : undefined
          const terminal = curve.events?.find(
            (event) =>
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
      if (sameParam && sameValues && converging) {
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
