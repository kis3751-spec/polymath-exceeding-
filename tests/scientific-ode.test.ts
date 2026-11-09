import { describe, expect, it } from 'vitest'
import { odeExamples } from '../src/engine/scientific/ode-examples'
import { compileOde, solveOde } from '../src/engine/scientific/ode'

const decay = 'd(A)/d(t)=-k*A\nk=0.3\nA(0)=10\nt(0)=0\nt(f)=5'

describe('scientific ODE parser and explicit integration', () => {
  it('matches an analytic decay at every output endpoint', () => {
    const result = solveOde({
      module: 'ode',
      source: decay,
      options: { samples: 37, tolerance: 1e-8, method: 'rk45' },
    })
    expect(result.status).toBe('completed')
    expect(result.rows).toHaveLength(37)
    expect(result.rows[0][0]).toBe(0)
    expect(result.rows.at(-1)?.[0]).toBe(5)
    for (const [t, a] of result.rows)
      expect(Math.abs(a - 10 * Math.exp(-0.3 * t))).toBeLessThan(2e-7)
  })
  it('accepts prime/pipe notation and traces a harmonic oscillator', () => {
    const result = solveOde({
      module: 'ode',
      source: "x'=v\nv'=-x\nx|1\nv|0\nt|0:6.283185307179586",
      options: { samples: 81, tolerance: 1e-9 },
    })
    expect(result.status).toBe('completed')
    for (const [t, x, v] of result.rows) {
      expect(Math.abs(x - Math.cos(t))).toBeLessThan(2e-8)
      expect(Math.abs(v + Math.sin(t))).toBeLessThan(2e-8)
      expect(Math.abs(x * x + v * v - 1)).toBeLessThan(2e-8)
    }
  })
  it('topologically evaluates forward helpers and conserves sequential-reaction mass', () => {
    const result = solveOde({
      module: 'ode',
      source:
        'dA/dt=-r1\ndB/dt=r1-r2\ndC/dt=r2\nr2=k2*B\nr1=k1*A\nk2=2\nk1=1\nA(0)=1\nB(0)=0\nC(0)=0\nt|0:3',
      options: { tolerance: 1e-9, samples: 31 },
    })
    expect(result.status).toBe('completed')
    expect(result.columns).toContain('r1')
    for (const [t, a, b, c] of result.rows) {
      expect(Math.abs(a - Math.exp(-t))).toBeLessThan(1e-8)
      expect(Math.abs(b - (Math.exp(-t) - Math.exp(-2 * t)))).toBeLessThan(1e-8)
      expect(Math.abs(a + b + c - 1)).toBeLessThan(1e-12)
    }
  })
  it('accepts numbered reusable mathematical functions', () => {
    const result = solveOde({
      module: 'ode',
      source: 'f1(A)=-k*A\nd(A)/d(t)=f1(A)\nk=0.3\nA(0)=10\nt|0:5',
    })
    expect(result.status).toBe('completed')
    expect(result.values.A).toBeCloseTo(10 * Math.exp(-1.5), 6)
  })
  it('injects constant parameter changes without overriding dynamic helpers', () => {
    const result = solveOde({
      module: 'ode',
      source: decay,
      parameters: { k: 0.6 },
    })
    expect(result.values.A).toBeCloseTo(10 * Math.exp(-3), 6)
    expect(() =>
      compileOde('d(A)/d(t)=-r\nr=k*A\nk=1\nA(0)=1\nt|0:1', { r: 2 }),
    ).toThrow(/덮어쓸/)
  })
  it.each([
    ['missing initial', 'd(A)/d(t)=-A\nt|0:1', /초기값/],
    [
      'mixed independent',
      'd(A)/d(t)=-A\nd(B)/d(z)=-B\nA(0)=1\nB(0)=1\nt|0:1',
      /같은 독립/,
    ],
    ['circular helper', 'd(A)/d(t)=-k*A\nk=q+1\nq=k+1\nA(0)=1\nt|0:1', /순환/],
    ['undefined symbol', 'd(A)/d(t)=-k*A\nA(0)=1\nt|0:1', /정의되지/],
    ['duplicate initial', "A'= -A\nA|1\nA(0)=2\nt|0:1", /중복/],
    ['state range', "A'=-A\nA|0:1\nt|0:2", /최종값/],
    ['expression initial', "A'=-A\nA(0)=1+1\nt|0:2", /숫자/],
    ['reversed time', "A'=-A\nA|1\nt|1:0", /시작값/],
  ])('rejects %s', (_name, source, error) => {
    expect(() => solveOde({ module: 'ode', source })).toThrow(error)
  })
})

describe('ODE stiffness and honest failures', () => {
  it('solves a forced stiff equation with explicit implicit-method selection', () => {
    const result = solveOde({
      module: 'ode',
      source: 'd(y)/d(t)=-10000*(y-cos(t))-sin(t)\ny(0)=1\nt|0:1',
      options: { method: 'implicit', samples: 41, tolerance: 1e-7 },
    })
    expect(result.status).toBe('completed')
    expect(result.method).toMatch(/암시적/)
    for (const [t, y] of result.rows)
      expect(Math.abs(y - Math.cos(t))).toBeLessThan(2e-6)
  })
  it('can switch automatically under stiff explicit step burden', () => {
    const result = solveOde({
      module: 'ode',
      source: "A'=-100000*A\nA|1\nt|0:1",
      options: { method: 'auto', samples: 31, tolerance: 1e-6 },
    })
    expect(result.status).toBe('completed')
    expect(result.method).toMatch(/→/)
    expect(Math.abs(result.values.A)).toBeLessThan(1e-8)
  })
  it('returns a stopped partial trajectory when the step budget is exhausted', () => {
    const result = solveOde({
      module: 'ode',
      source: decay,
      options: { maxIterations: 1, samples: 101 },
    })
    expect(result.status).toBe('stopped')
    expect(result.message).toMatch(/한도/)
    expect(result.rows.at(-1)![0]).toBeLessThan(5)
    expect(result.warnings.join(' ')).toMatch(/최종 시각/)
  })
  it('never calls a domain failure or blow-up a completed integration', () => {
    const domain = solveOde({
      module: 'ode',
      source: "y'=ln(1-t)\ny|0\nt|0:2",
      options: { samples: 21 },
    })
    expect(domain.status).toBe('stopped')
    expect(domain.rows.at(-1)![0]).toBeLessThan(1)
    const blowup = solveOde({
      module: 'ode',
      source: "y'=y^2\ny|1\nt|0:2",
      options: { samples: 21, maxIterations: 3000 },
    })
    expect(blowup.status).toBe('stopped')
    expect(blowup.rows.at(-1)![0]).toBeLessThanOrEqual(1)
  })
})

it('preserves a representable subnormal time interval rather than imposing a fixed minimum step', () => {
  const result = solveOde({
    module: 'ode',
    source: "A'=1\nA|0\nt|0:5e-324",
    options: { samples: 2 },
  })
  expect(result.status).toBe('completed')
  expect(result.rows.at(-1)?.[0]).toBe(Number.MIN_VALUE)
  expect(result.values.A).toBe(Number.MIN_VALUE)
})
it('keeps Robertson reaction mass and agrees with an independent stiff reference', () => {
  const result = solveOde({
    module: 'ode',
    source: odeExamples[2].source,
    options: { samples: 31, tolerance: 1e-8 },
  })
  expect(result.status).toBe('completed')
  for (const row of result.rows)
    expect(Math.abs(row[1] + row[2] + row[3] - 1)).toBeLessThan(1e-8)
  // Reference at t=1 from an independent Radau solve (rtol=1e-12, atol=1e-14).
  expect(Math.abs(result.values.A - 0.966459737333)).toBeLessThan(2e-5)
  expect(Math.abs(result.values.B - 0.00003074626)).toBeLessThan(1e-8)
  expect(Math.abs(result.values.C - 0.033509516407)).toBeLessThan(2e-5)
})
