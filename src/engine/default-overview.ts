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
