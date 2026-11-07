import { readFile } from 'node:fs/promises'
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { createAutomaticSolver } from '../src/engine/automatic'
import { type NearSolver } from '../src/engine/branches'
import {
  createSimulationPanelComputer,
  MAX_SIMULATION_PANELS,
} from '../src/engine/simulation-panels'
import type { SimulationAnchor, SolveResult } from '../src/engine'

function root(value: number): SolveResult {
  return {
    kind: 'nonlinear',
    variables: ['x'],
    values: [value],
    matrix: [[1]],
    rhs: [0],
    residuals: [0],
    maxResidual: 0,
    condition: 1,
    conditionNorm: 'infinity',
    engine: 'javascript',
    durationMs: 0,
    warnings: [],
  }
}

function anchor(
  id: string,
  value: number,
  parameters: Record<string, number>,
): SimulationAnchor {
  return { id, label: id, variables: ['x'], values: [value], parameters }
}

describe('independent pinned-root simulations', () => {
  let search: Awaited<ReturnType<typeof createAutomaticSolver>>
  beforeAll(async () => {
    search = await createAutomaticSolver(
      await readFile(new URL('../public/solver.wasm', import.meta.url)),
    )
  })

  it('keeps both square-root branches across shared parameter changes', () => {
    const compute = createSimulationPanelComputer(search.solveNear)
    const anchors = [
      anchor('negative', -2, { p: 4 }),
      anchor('positive', 2, { p: 4 }),
    ]
    const snapshots = structuredClone(anchors)
    const panels = compute(
      'x^2=p',
      { p: 9 },
      { name: 'p', min: 1, max: 16, step: 1, steps: 31 },
      anchors,
    )
    expect(panels[0].result?.values[0]).toBeCloseTo(-3, 8)
    expect(panels[1].result?.values[0]).toBeCloseTo(3, 8)
    for (const [i, panel] of panels.entries()) {
      const sign = i === 0 ? -1 : 1
      expect(panel.error).toBeUndefined()
      expect(panel.dataset).toHaveLength(16)
      for (const point of panel.dataset)
        expect(point.values?.[0]).toBeCloseTo(
          sign * Math.sqrt(point.parameter),
          6,
        )
    }
    expect(anchors).toEqual(snapshots)
    const returned = compute('x^2=p', { p: 1 }, null, anchors)
    expect(returned[0].result?.values[0]).toBeCloseTo(-1, 8)
    expect(returned[1].result?.values[0]).toBeCloseTo(1, 8)
  })

  it('keeps the exact same curve and table when only the swept parameter moves', () => {
    const compute = createSimulationPanelComputer(search.solveNear)
    const source = 'f(x)=x^2+y*z-a+8\nf(y)=sin(y)+x^2-z-3\nf(z)=exp(z)+x*y-a'
    const origin = search.solveNear(source, { a: 64 }, [-2.9, 10.46, 4.54])
    const selected: SimulationAnchor[] = [
      {
        id: 'system',
        label: 'system',
        variables: origin.variables,
        values: origin.values,
        parameters: { a: 64 },
      },
    ]
    const sweep = { name: 'a', min: 0, max: 800, step: 10, steps: 81 }
    const first = compute(source, { a: 64 }, sweep, selected)[0]
    const second = compute(source, { a: 199 }, sweep, selected)[0]
    expect(first.error).toBeUndefined()
    expect(second.error).toBeUndefined()
    expect(second.result?.values[0]).toBeCloseTo(-2.8100771016, 8)
    expect(second.result?.values[1]).toBeCloseTo(32.2987367662, 8)
    expect(second.sweep).toBe(first.sweep)
    expect(second.dataset).toBe(first.dataset)
    expect(second.sweep.filter((point) => point.values)).toHaveLength(80)
    const independent = createSimulationPanelComputer(search.solveNear)(
      source,
      { a: 199 },
      sweep,
      selected,
    )[0]
    expect(independent.sweep).toEqual(first.sweep)
    expect(independent.dataset).toEqual(first.dataset)
    for (const point of second.sweep) {
      if (!point.values) continue
      const [x, y, z] = point.values
      expect(Math.abs(x * x + y * z - point.parameter + 8)).toBeLessThan(1e-6)
      expect(Math.abs(Math.sin(y) + x * x - z - 3)).toBeLessThan(1e-6)
      expect(Math.abs(Math.exp(z) + x * y - point.parameter)).toBeLessThan(1e-6)
    }
  })

  it('changes a cached curve only when another parameter or the range changes', () => {
    const compute = createSimulationPanelComputer(search.solveNear)
    const selected = [anchor('positive', 1, { p: 1, q: 0 })]
    const sweep = { name: 'p', min: 0, max: 4, step: 0.5, steps: 17 }
    const first = compute('x^2=p+q', { p: 1, q: 0 }, sweep, selected)[0]
    const moved = compute('x^2=p+q', { p: 3, q: 0 }, sweep, selected)[0]
    expect(moved.sweep).toBe(first.sweep)
    const changed = compute('x^2=p+q', { p: 3, q: 1 }, sweep, selected)[0]
    expect(changed.sweep).not.toBe(first.sweep)
    for (const point of changed.sweep)
      expect(point.values?.[0]).toBeCloseTo(Math.sqrt(point.parameter + 1), 6)
    const ranged = compute(
      'x^2=p+q',
      { p: 3, q: 1 },
      { ...sweep, max: 5 },
      selected,
    )[0]
    expect(ranged.sweep).not.toBe(changed.sweep)
    expect(ranged.sweep.at(-1)?.parameter).toBe(5)
  })

  it('retains an identical periodic curve through current branch loss and recovery', () => {
    const compute = createSimulationPanelComputer(search.solveNear)
    const selected = [anchor('far', -13 * Math.PI, { target: 0 })]
    const sweep = { name: 'target', min: 0, max: 1, step: 0.05, steps: 81 }
    const first = compute(
      'sin(x)*cos(x)=target',
      { target: 0.2 },
      sweep,
      selected,
    )[0]
    const lost = compute(
      'sin(x)*cos(x)=target',
      { target: 0.8 },
      sweep,
      selected,
    )[0]
    const restored = compute(
      'sin(x)*cos(x)=target',
      { target: 0.4 },
      sweep,
      selected,
    )[0]
    expect(lost.result).toBeNull()
    expect(lost.sweep).toBe(first.sweep)
    expect(restored.sweep).toBe(first.sweep)
    expect(restored.result?.values[0]).toBeCloseTo(
      -13 * Math.PI + Math.asin(0.8) / 2,
      7,
    )
  })

  it('interpolates several changed parameters from the pinned state', () => {
    const compute = createSimulationPanelComputer(search.solveNear)
    const panels = compute(
      'x^2=a+b',
      { a: 9, b: 7 },
      null,
      [anchor('positive', 2, { a: 1, b: 3 })],
      '2',
    )
    expect(panels[0].error).toBeUndefined()
    expect(panels[0].result?.values[0]).toBeCloseTo(4, 8)
    expect(panels[0].result?.conditionNorm).toBe('2')
  })

  it.each([0, -13 * Math.PI])(
    'keeps a periodic root pinned at %s through its fold and leaves no false curve beyond it',
    (origin) => {
      const compute = createSimulationPanelComputer(search.solveNear)
      const anchors = [anchor('periodic', origin, { target: 0 })]
      const panels = compute(
        'sin(x)*cos(x)=target',
        { target: 0.4 },
        { name: 'target', min: 0, max: 1, step: 0.1, steps: 41 },
        anchors,
      )
      const panel = panels[0]
      expect(panel.error).toBeUndefined()
      expect(panel.result?.values[0]).toBeCloseTo(
        origin + Math.asin(0.8) / 2,
        7,
      )
      for (const point of panel.dataset) {
        if (point.parameter <= 0.5)
          expect(point.values?.[0]).toBeCloseTo(
            origin + Math.asin(2 * point.parameter) / 2,
            4,
          )
        else {
          expect(point.values).toBeNull()
          expect(point.error).toContain('분기')
        }
      }
      const lost = compute(
        'sin(x)*cos(x)=target',
        { target: 0.6 },
        null,
        anchors,
      )
      expect(lost[0].result).toBeNull()
      expect(lost[0].error).toContain('분기')
      expect(lost[0].sweep).toEqual([])
      expect(lost[0].dataset).toEqual([])
      const restored = compute(
        'sin(x)*cos(x)=target',
        { target: 0.2 },
        null,
        anchors,
      )
      expect(restored[0].result?.values[0]).toBeCloseTo(
        origin + Math.asin(0.4) / 2,
        7,
      )
    },
  )

  it('retains a valid panel when another selected branch disappears', () => {
    const compute = createSimulationPanelComputer(search.solveNear)
    const panels = compute('(x-10)*(x^2-p)=0', { p: -1 }, null, [
      anchor('lost', 1, { p: 1 }),
      anchor('fixed', 10, { p: 1 }),
    ])
    expect(panels[0].result).toBeNull()
    expect(panels[0].error).toContain('분기')
    expect(panels[0].dataset).toEqual([])
    expect(panels[1].error).toBeUndefined()
    expect(panels[1].result?.values[0]).toBeCloseTo(10, 8)
  })

  it.each([0, -13 * Math.PI])(
    'retains the valid periodic curve from anchor %s when the current sweep value has no root',
    (offset) => {
      const compute = createSimulationPanelComputer(search.solveNear)
      const selected = anchor('periodic', offset + Math.asin(0.4) / 2, {
        target: 0.2,
      })
      const panels = compute(
        'sin(x)*cos(x)=target',
        { target: 0.8 },
        { name: 'target', min: 0, max: 1, step: 0.1, steps: 41 },
        [selected],
      )
      expect(panels[0].result).toBeNull()
      expect(panels[0].error).toContain('분기')
      expect(panels[0].sweep).toHaveLength(41)
      expect(panels[0].dataset).toHaveLength(11)
      for (const point of panels[0].dataset) {
        if (point.parameter <= 0.5) {
          expect(point.error).toBeUndefined()
          expect(point.values?.[0]).toBeCloseTo(
            offset + Math.asin(2 * point.parameter) / 2,
            4,
          )
        } else {
          expect(point.values).toBeNull()
          expect(point.error).toContain('분기')
        }
      }
    },
  )

  it('uses all other current parameter values when recovering a partial curve', () => {
    const compute = createSimulationPanelComputer(search.solveNear)
    const panels = compute(
      'x^2=p+q',
      { p: -2, q: 1 },
      { name: 'p', min: -2, max: 2, step: 0.5, steps: 17 },
      [anchor('positive', 1, { p: 1, q: 0 })],
    )
    expect(panels[0].result).toBeNull()
    expect(panels[0].error).toContain('분기')
    expect(panels[0].dataset).toHaveLength(9)
    for (const point of panels[0].dataset) {
      if (point.parameter >= -1)
        expect(point.values?.[0]).toBeCloseTo(Math.sqrt(point.parameter + 1), 5)
      else expect(point.values).toBeNull()
    }
  })

  it('keeps the panel empty when the anchor cannot reach the other current parameters', () => {
    const compute = createSimulationPanelComputer(search.solveNear)
    const panels = compute(
      'x^2=p*q',
      { p: 1, q: -1 },
      { name: 'p', min: -1, max: 1, step: 0.25, steps: 9 },
      [anchor('positive', 1, { p: 1, q: 1 })],
    )
    expect(panels[0].result).toBeNull()
    expect(panels[0].error).toContain('분기')
    expect(panels[0].sweep).toEqual([])
    expect(panels[0].dataset).toEqual([])
  })

  it('rejects stale model snapshots and malformed anchors without replacing their roots', () => {
    const compute = createSimulationPanelComputer(search.solveNear)
    expect(
      compute('x=10', {}, null, [anchor('stale', 1, {})])[0],
    ).toMatchObject({
      result: null,
      sweep: [],
      dataset: [],
    })
    expect(
      compute(
        'x=p+10',
        { p: 1 },
        { name: 'p', min: 0, max: 2, step: 0.5, steps: 5 },
        [anchor('stale sweep', 1, { p: 1 })],
      )[0],
    ).toMatchObject({ result: null, sweep: [], dataset: [] })
    expect(
      compute('x=p', { p: 1 }, null, [anchor('changed', 1, { q: 1 })])[0].error,
    ).toContain('파라미터')
    expect(
      compute('x=p', { p: 1 }, null, [anchor('invalid', NaN, { p: 1 })])[0]
        .error,
    ).toContain('저장 정보')
    expect(() =>
      compute(
        'x=1',
        {},
        null,
        Array.from({ length: MAX_SIMULATION_PANELS + 1 }, (_, i) =>
          anchor(String(i), 1, {}),
        ),
      ),
    ).toThrow('최대 6개')
    expect(() =>
      compute('x=1', {}, null, [anchor('same', 1, {}), anchor('same', 1, {})]),
    ).toThrow('식별자')
  })

  it('reuses cached panels across root selection and parameter object order, with bounded eviction', () => {
    const near = vi.fn<NearSolver>((_source, parameters) =>
      root(parameters.a + parameters.b),
    )
    const compute = createSimulationPanelComputer(near)
    const selected = [anchor('selected', 3, { a: 1, b: 2 })]
    const first = compute('x=a+b', { a: 1, b: 2 }, null, selected)
    const calls = near.mock.calls.length
    const again = compute('x=a+b', { b: 2, a: 1 }, null, selected)
    expect(again[0]).toBe(first[0])
    expect(near).toHaveBeenCalledTimes(calls)
    compute('x=a+b', { a: 1, b: 2 }, null, selected, '2')
    expect(near.mock.calls.length).toBeGreaterThan(calls)
    for (let i = 0; i < 49; i++)
      compute('x=a+b', { a: 1, b: 2 }, null, [
        anchor(`other-${i}`, 3, { a: 1, b: 2 }),
      ])
    const beforeEvicted = near.mock.calls.length
    compute('x=a+b', { a: 1, b: 2 }, null, selected)
    expect(near.mock.calls.length).toBeGreaterThan(beforeEvicted)
  })

  it.each([
    [1e-12, 2e-12],
    [-1e-12, 1e-12],
    [0, 1e-12],
    [1e-12, 0],
  ])(
    'rejects a stale tiny root %s after the model changes to %s',
    (saved, current) => {
      const compute = createSimulationPanelComputer(search.solveNear)
      const panels = compute(`x=${current}`, {}, null, [
        anchor('tiny', saved, {}),
      ])
      expect(panels[0].result).toBeNull()
      expect(panels[0].error).toContain('저장한 해가 현재 수식과 다릅니다')
      expect(panels[0].sweep).toEqual([])
      expect(panels[0].dataset).toEqual([])
    },
  )

  it.each([1e-12, -1e-12, 1e-120, -1e-120, 0])(
    'preserves a valid tiny root %s with ordinary relative refinement',
    (value) => {
      const compute = createSimulationPanelComputer(search.solveNear)
      const panels = compute(`x=${value}`, {}, null, [
        anchor('tiny', value * (1 + 1e-10), {}),
      ])
      expect(panels[0].error).toBeUndefined()
      const actual = panels[0].result?.values[0]
      expect(actual).toBeDefined()
      if (value === 0) expect(actual).toBe(0)
      else expect(actual! / value).toBeCloseTo(1, 10)
    },
  )

  it('preserves a valid simultaneous-system anchor through numerical refinement', () => {
    const compute = createSimulationPanelComputer(search.solveNear)
    const panels = compute(
      'x^2+y^2=p\nx-y=1',
      { p: 13 },
      { name: 'p', min: 1, max: 13, step: 2, steps: 13 },
      [
        {
          id: 'system',
          label: 'system',
          variables: ['x', 'y'],
          values: [2 * (1 + 1e-10), 1 + 1e-10],
          parameters: { p: 5 },
        },
      ],
    )
    expect(panels[0].error).toBeUndefined()
    expect(panels[0].result?.values[0]).toBeCloseTo(3, 8)
    expect(panels[0].result?.values[1]).toBeCloseTo(2, 8)
    for (const point of panels[0].dataset) {
      expect(point.values?.[0]).toBeCloseTo(
        (1 + Math.sqrt(2 * point.parameter - 1)) / 2,
        7,
      )
      expect(point.values?.[1]).toBeCloseTo(
        (-1 + Math.sqrt(2 * point.parameter - 1)) / 2,
        7,
      )
    }
  })

  it('rejects a changed origin root even at a large coordinate offset', () => {
    const compute = createSimulationPanelComputer(() => root(1e9 + Math.PI))
    const panels = compute('sin(x)=0', {}, null, [anchor('far', 1e9, {})])
    expect(panels[0].result).toBeNull()
    expect(panels[0].error).toContain('저장한 해가 현재 수식과 다릅니다')
  })
})

describe('pinned simulation worker responses', () => {
  let scope: {
    onmessage?: (event: MessageEvent) => void
    postMessage: ReturnType<typeof vi.fn>
  }
  let automatic: ReturnType<typeof vi.fn>
  let near: ReturnType<typeof vi.fn<NearSolver>>

  beforeEach(async () => {
    vi.resetModules()
    vi.useFakeTimers()
    scope = { postMessage: vi.fn() }
    vi.stubGlobal('self', scope)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('JS fallback')
      }),
    )
    near = vi.fn<NearSolver>((_source, parameters, seed, options) => {
      if (parameters.p < 0) throw new Error('no local root')
      const value = Array.isArray(seed) ? seed[0] : seed.values[0]
      return {
        ...root(Math.sign(value) * Math.sqrt(parameters.p)),
        conditionNorm: options?.conditionNorm ?? 'infinity',
      }
    })
    automatic = Object.assign(
      vi.fn((_source, parameters: Record<string, number>) => ({
        solutions: parameters.p === 4 ? [root(-2), root(2)] : [],
        search: { method: 'test', min: -1, max: 1, attempts: 1, note: 'test' },
      })),
      { solveNear: near },
    )
    vi.doMock('../src/engine/automatic', () => ({
      createAutomaticSolver: async () => automatic,
    }))
    await import('../src/engine/solver.worker')
  })

  afterEach(() => {
    vi.doUnmock('../src/engine/automatic')
    vi.unstubAllGlobals()
    vi.useRealTimers()
    vi.resetModules()
  })

  async function send(request: Record<string, unknown>) {
    scope.onmessage!({
      data: {
        id: 1,
        mode: 'nonlinear',
        source: 'x^2=p',
        parameters: { p: 4 },
        sweep: null,
        ...request,
      },
    } as MessageEvent)
    await vi.runAllTimersAsync()
    return scope.postMessage.mock.lastCall?.[0]
  }

  it('includes independent simulations and preserves their cache when only the selected global root changes', async () => {
    const simulationAnchors = [
      anchor('negative', -2, { p: 4 }),
      anchor('positive', 2, { p: 4 }),
    ]
    const first = await send({ simulationAnchors })
    expect(
      first.payload.simulations.map(
        (panel: { result: SolveResult }) => panel.result.values[0],
      ),
    ).toEqual([-2, 2])
    const calls = near.mock.calls.length
    const second = await send({ id: 2, solutionIndex: 1, simulationAnchors })
    expect(second.payload.result.values).toEqual([2])
    expect(near).toHaveBeenCalledTimes(calls)
    expect(automatic).toHaveBeenCalledTimes(1)
  })

  it('uses the explicitly anchored current root instead of a changing discovery index', async () => {
    const selectedAnchor = anchor('selected', 2, { p: 4 })
    const response = await send({ selectedAnchor, solutionIndex: 0 })
    expect(response.ok).toBe(true)
    expect(response.payload.result.values).toEqual([2])
    expect(response.payload.selectedSolution).toBe(1)
    expect(response.payload.selectedSimulation.result.values).toEqual([2])
    expect(
      response.payload.solutions.map(
        (solution: SolveResult) => solution.values[0],
      ),
    ).toEqual([-2, 2])
  })

  it('keeps an anchored root and stable graph after it leaves global discovery coverage', async () => {
    const selectedAnchor = anchor('selected', 2, { p: 4 })
    const sweep = { name: 'p', min: 1, max: 16, step: 1, steps: 31 }
    const first = await send({ selectedAnchor, sweep })
    const response = await send({
      id: 2,
      parameters: { p: 9 },
      selectedAnchor,
      sweep,
    })
    expect(response.ok).toBe(true)
    expect(response.payload.result.values[0]).toBeCloseTo(3, 8)
    expect(response.payload.solutions).toEqual([])
    expect(response.payload.selectedSimulation.sweep).toEqual(
      first.payload.selectedSimulation.sweep,
    )
    expect(response.payload.sweep).toEqual(first.payload.sweep)
  })

  it('returns a lost selected branch with its unchanged curve rather than switching to another root', async () => {
    const selectedAnchor = anchor('selected', 2, { p: 4 })
    const sweep = { name: 'p', min: 1, max: 9, step: 1, steps: 17 }
    const first = await send({ selectedAnchor, sweep })
    const response = await send({
      id: 2,
      parameters: { p: -1 },
      selectedAnchor,
      sweep,
    })
    expect(response.ok).toBe(false)
    expect(response.selectedSimulation.result).toBeNull()
    expect(response.selectedSimulation.error).toContain('분기')
    expect(response.selectedSimulation.sweep).toEqual(
      first.payload.selectedSimulation.sweep,
    )
  })

  it('returns valid pinned panels outside global coverage even when no current global root was found', async () => {
    const response = await send({
      parameters: { p: 9 },
      simulationAnchors: [anchor('outside search', 2, { p: 4 })],
    })
    expect(response.ok).toBe(false)
    expect(response.payload).toBeUndefined()
    expect(response.simulations[0].result.values[0]).toBeCloseTo(3, 8)
    expect(response.simulations[0].error).toBeUndefined()
  })

  it('returns explicit panel errors if a pinned branch is lost instead of showing stale data', async () => {
    const response = await send({
      parameters: { p: -1 },
      simulationAnchors: [anchor('lost', 2, { p: 4 })],
    })
    expect(response.ok).toBe(false)
    expect(response.simulations[0]).toMatchObject({
      result: null,
      sweep: [],
      dataset: [],
    })
    expect(response.simulations[0].error).toContain('분기')
  })

  it('ignores pinned automatic roots in the linear and manual solvers', async () => {
    const response = await send({
      mode: 'linear',
      source: '2*x=6',
      simulationAnchors: [anchor('old', 2, {})],
    })
    expect(response.payload.result.values).toEqual([3])
    expect(response.payload.simulations).toBeUndefined()
    const manual = await send({
      nonlinearSearch: 'manual',
      source: 'a=1\nb=4\nx=a+b^2\nx+2',
      parameters: {},
      simulationAnchors: [anchor('old', 2, {})],
    })
    expect(manual.payload.result.kind).toBe('evaluation')
    expect(manual.payload.simulations).toBeUndefined()
    expect(automatic).not.toHaveBeenCalled()
    expect(near).not.toHaveBeenCalled()
  })
})
