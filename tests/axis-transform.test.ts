import { describe, it, expect } from 'vitest'
import { compileAxes, transformSeries } from '../src/axis-transform'
import {
  numericConstants,
  withAutomaticConstants,
  parameterizedSource,
} from '../src/model-constants'
import { DEFAULT_NONLINEAR_PROJECT } from '../src/models'
import { createAutomaticSolver } from '../src/engine/automatic'
import { readFile } from 'node:fs/promises'
import { createSolverInput } from '../src/solver-input'

describe('display axes preserve raw mathematics', () => {
  it('applies coupled expressions while retaining point indexes and domain gaps', () => {
    const raw = [{ name: 'curve', x: [-1, 0, 10, 100], y: [2, 3, 4, 5] }]
    const plotted = transformSeries(raw, { x: 'log(x)', y: '2*y+1' })[0]
    expect(plotted.x.slice(0, 2).every(Number.isNaN)).toBe(true)
    expect(plotted.x.slice(2)).toEqual([1, 2])
    expect(plotted.y.slice(2)).toEqual([9, 11])
    expect(raw[0].x).toEqual([-1, 0, 10, 100])
    expect(compileAxes({ x: 'x+y', y: 'x^2' })(-2, 4)).toEqual([2, 4])
  })
  it.each(['window.alert(1)', 'constructor(x)', 'x=2', 'unknown+1', 'x; y'])(
    'refuses unsafe or unknown expressions: %s',
    (x) => {
      expect(() => compileAxes({ x, y: 'y' })).toThrow()
    },
  )
})
describe('designated constant parameters', () => {
  it('does not turn a standalone equation or legacy e/pi unknowns into constants', () => {
    for (const source of ['x=2', 'e=4\nx=e', 'pi=3\nx=pi'])
      expect(
        withAutomaticConstants({ ...DEFAULT_NONLINEAR_PROJECT, source })
          .parameters,
      ).toHaveLength(0)
  })
  it('ignores comments and data table values when detecting explicit constants', () => {
    expect(numericConstants('# k=9\n[\nx y\n1 2\n]\nk=2e-3')).toEqual([
      { name: 'k', value: 0.002 },
    ])
  })
  it('solves original and adjusted constants, hiding preserves the fixed value', async () => {
    const separated = withAutomaticConstants({
      ...DEFAULT_NONLINEAR_PROJECT,
      source: 'k=4; x^2=k',
    })
    expect(separated.parameters[0].name).toBe('k')
    expect(createSolverInput(separated).source).toContain('x^2=k')
    const solve = await createAutomaticSolver(
      await readFile(new URL('../public/solver.wasm', import.meta.url)),
    )
    const leftSide = createSolverInput(
      withAutomaticConstants({
        ...DEFAULT_NONLINEAR_PROJECT,
        source: 'k=4; k=x+1',
      }),
    )
    expect(
      solve(leftSide.source, leftSide.parameters).solutions[0].values,
    ).toEqual([3])
    let project = withAutomaticConstants({
      ...DEFAULT_NONLINEAR_PROJECT,
      source: 'k=4\nx^2=k',
    })
    expect(project.parameters[0].name).toBe('k')
    let request = createSolverInput(project)
    expect(
      solve(request.source, request.parameters).solutions.map((s) =>
        Math.abs(s.values[0]),
      ),
    ).toEqual([2, 2])
    project = {
      ...project,
      parameters: project.parameters.map((p) => ({
        ...p,
        value: 9,
        max: 20,
        hidden: true,
      })),
    }
    project = withAutomaticConstants(project)
    request = createSolverInput(project)
    expect(request.sweep).toBeNull()
    expect(request.parameters.k).toBe(9)
    expect(
      solve(request.source, request.parameters).solutions.map((s) =>
        Math.abs(s.values[0]),
      ),
    ).toEqual([3, 3])
    project = withAutomaticConstants({ ...project, source: 'k=16\nx^2=k' })
    expect(project.parameters[0].value).toBe(16)
    expect(project.parameters[0].hidden).toBe(true)
    expect(
      parameterizedSource({ ...project, source: 'k=16\nk=5\nx^2=k' }),
    ).toContain('k=5')
  })
})
