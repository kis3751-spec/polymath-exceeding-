import type { Project } from './models'

/** Only inputs that affect a calculation belong in this request. */
export function createSolverInput(project: Project) {
  const sweep = project.parameters.find((p) => p.name === project.sweepName)
  return {
    defaultOverview:
      project.mode === 'nonlinear' &&
      (project.nonlinearSearch ?? 'auto') === 'auto',
    source: project.source,
    conditionNorm: project.conditionNorm ?? 'infinity',
    mode: project.mode ?? 'linear',
    nonlinearSearch: project.nonlinearSearch ?? 'auto',
    certifyRoots: project.certifyRoots ?? false,
    inputNoiseSigma: project.inputNoiseSigma ?? 1e-6,
    searchBounds: project.searchBounds,
    variableBounds: project.variableBounds,
    solutionIndex: project.selectedSolution ?? 0,
    simulationAnchors: project.simulations,
    selectedAnchor: project.selectedAnchor,
    parameters: Object.fromEntries(
      project.parameters.map((p) => [p.name, p.value]),
    ),
    sweep: sweep
      ? {
          name: sweep.name,
          min: sweep.min,
          max: sweep.max,
          steps: 81,
          step: sweep.step,
        }
      : null,
  }
}

export const solverInputKey = (project: Project, revision: number) =>
  JSON.stringify([createSolverInput(project), revision])
