import { readFile } from 'node:fs/promises'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'
import ModuleGuide from '../src/components/ModuleGuide'
import {
  getModuleGuide,
  guideExamples,
  moduleGuides,
  renderTextbookMarkdown,
  sectionSearchText,
} from '../src/components/guide-content'
import { createSolver } from '../src/engine'
import { createAutomaticSolver } from '../src/engine/automatic'
import { solveFitting } from '../src/engine/scientific/fitting'
import { solveIntegration } from '../src/engine/scientific/integration'
import { solveOde } from '../src/engine/scientific/ode'
import { solveOptimization } from '../src/engine/scientific/optimization'

describe('independent module guides', () => {
  it('renders only the selected textbook, retaining accessible independent tabs', () => {
    const markup = renderToStaticMarkup(
      createElement(ModuleGuide, { initialTopic: 'ode', onClose() {} }),
    )
    expect(markup.match(/role="tabpanel"/g)).toHaveLength(1)
    expect(markup.match(/role="tab"/g)).toHaveLength(9)
    expect(markup).toContain('d(A)/d(t)=-k*A')
    expect(markup).not.toContain('polyfit x y 1')
    expect(markup).not.toContain('fit: y=a*x+b')
    expect(markup).toContain('aria-label="Close User Guide"')
  })

  it('keeps chapter IDs unique and provides searchable interpretation rather than mixed module text', () => {
    expect(new Set(moduleGuides.map((guide) => guide.id)).size).toBe(9)
    for (const guide of moduleGuides) {
      expect(guide.sections.length).toBeGreaterThanOrEqual(8)
      expect(new Set(guide.sections.map((section) => section.id)).size).toBe(
        guide.sections.length,
      )
      expect(
        guide.sections
          .flatMap((section) => section.blocks)
          .filter((block) => block.kind === 'code')
          .some((block) => block.text === guideExamples[guide.id]),
      ).toBe(true)
    }
    expect(
      getModuleGuide('curve-fit').sections.some((section) =>
        sectionSearchText(section).includes('student-t'),
      ),
    ).toBe(true)
    expect(
      getModuleGuide('nonlinear').sections.some((section) =>
        sectionSearchText(section).includes('gaussian'),
      ),
    ).toBe(true)
  })

  it('keeps the downloadable textbook synchronized and avoids the removed instructional restriction', async () => {
    const markdown = renderTextbookMarkdown()
    expect(markdown).not.toMatch(/한\s*줄에\s*(하나|한\s*개|방정식)/)
    expect(markdown).not.toContain('한 줄에 하나씩')
    expect(
      await readFile(
        new URL('../docs/IVC_USER_TEXTBOOK.md', import.meta.url),
        'utf8',
      ),
    ).toBe(markdown)
  })
})

describe('guide examples against the actual calculators', () => {
  let solve: Awaited<ReturnType<typeof createSolver>>
  let search: Awaited<ReturnType<typeof createAutomaticSolver>>
  beforeAll(async () => {
    const bytes = await readFile(
      new URL('../public/solver.wasm', import.meta.url),
    )
    solve = await createSolver(bytes)
    search = await createAutomaticSolver(bytes)
  })

  it('checks the Linear worked answer by solving and direct substitution', () => {
    const result = solve(guideExamples.linear, {})
    const [x, y] = result.values
    expect(x).toBeCloseTo(4, 12)
    expect(y).toBeCloseTo(2, 12)
    expect(2 * x + y).toBeCloseTo(10, 12)
    expect(x - y).toBeCloseTo(2, 12)
  })

  it('checks the nonlinear three-root example on both sides of a merge', () => {
    const roots = search(guideExamples.nonlinear, { p: 0 })
      .solutions.map((solution) => solution.values[0])
      .sort((a, b) => a - b)
    expect(roots).toEqual([-1, 0, 1])
    const after = search(guideExamples.nonlinear, { p: 0.4 }).solutions
    expect(after).toHaveLength(1)
    expect(after[0].values[0] ** 3 - after[0].values[0]).toBeCloseTo(0.4, 10)
  })

  it('checks the ODE final value against the independent exponential solution', () => {
    const result = solveOde({
      module: 'ode',
      source: guideExamples.ode,
      options: { samples: 101, tolerance: 1e-8 },
    })
    expect(result.status).toBe('completed')
    expect(result.values.A).toBeCloseTo(Math.exp(-2.5), 7)
    expect(result.rows[40][1]).toBeCloseTo(Math.exp(-1), 7)
  })

  it('checks linear regression and independent multilinear coefficient recovery', () => {
    const linear = solveFitting({
      module: 'curve-fit',
      source: guideExamples['curve-fit'],
    })
    expect(linear.values.a0).toBeCloseTo(1, 10)
    expect(linear.values.a1).toBeCloseTo(2, 10)
    const multi = solveFitting({
      module: 'multilinear',
      source: guideExamples.multilinear,
    })
    expect(multi.values.intercept).toBeCloseTo(2, 10)
    expect(multi.values.b_x1).toBeCloseTo(3, 10)
    expect(multi.values.b_x2).toBeCloseTo(-4, 10)
  })

  it('checks the nonlinear-fit saturation example rather than copying an unsupported answer', () => {
    const result = solveFitting({
      module: 'nonlinear-fit',
      source: guideExamples['nonlinear-fit'],
    })
    expect(result.status).toBe('converged')
    expect(result.values.Vmax).toBeCloseTo(2, 5)
    expect(result.values.Km).toBeCloseTo(0.5, 5)
  })

  it('checks the exact triangular integral and cumulative midpoint', () => {
    const result = solveIntegration({
      module: 'integration',
      source: guideExamples.integration,
    })
    expect(result.values.integral).toBeCloseTo(2, 12)
    expect(result.rows[50][2]).toBeCloseTo(0.5, 12)
  })

  it('checks constrained optimization and constrained LSQ including feasibility', () => {
    const opt = solveOptimization({
      module: 'optimization',
      source: guideExamples.optimization,
    })
    expect(opt.status).toBe('converged')
    expect(opt.values.x).toBeCloseTo(0.5, 5)
    expect(opt.values.y).toBeCloseTo(0.5, 5)
    expect(opt.values.objective).toBeCloseTo(0.5, 5)
    const lsq = solveOptimization({ module: 'lsq', source: guideExamples.lsq })
    expect(lsq.status).toBe('converged')
    expect(lsq.values.a).toBeCloseTo(2, 5)
    expect(lsq.values.b).toBeCloseTo(1, 5)
    expect(lsq.values.a + lsq.values.b).toBeCloseTo(3, 6)
  })
})
