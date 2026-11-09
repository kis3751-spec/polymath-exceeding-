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
