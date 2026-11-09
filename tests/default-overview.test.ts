import { it, expect } from 'vitest'
import { createAutomaticSolver } from '../src/engine/automatic'
import { createDefaultOverview } from '../src/engine/default-overview'
it('initializes multiple branches while the current parameter has only one root and keeps curves fixed', async () => {
  const search = await createAutomaticSolver(new ArrayBuffer(0)),
    overview = createDefaultOverview(search)
  const source = 'x^3-x=h',
    sweep = { name: 'h', min: -0.6, max: 0.6, step: 0.01, steps: 81 }
  const initial = search(source, { h: 0.5 })
  expect(initial.solutions).toHaveLength(1)
  const a = overview(source, { h: 0.5 }, sweep, {}, initial)
  expect(a.anchors).toHaveLength(3)
  const b = overview(source, { h: 0 }, sweep, {}, search(source, { h: 0 }))
  expect(b.anchors).toBe(a.anchors)
  expect(b.panels.filter((p) => p.result)).toHaveLength(3)
  b.panels.forEach((p, i) => expect(p.sweep).toBe(a.panels[i].sweep))
})
it('prepares both branches when the current parameter has no real root', async () => {
  const search = await createAutomaticSolver(new ArrayBuffer(0)),
    overview = createDefaultOverview(search)
  const current = search('x^2=p', { p: -1 })
  const view = overview(
    'x^2=p',
    { p: -1 },
    { name: 'p', min: -1, max: 1, step: 0.1, steps: 81 },
    {},
    current,
  )
  expect(view.anchors).toHaveLength(2)
  expect(
    view.panels.every((p) => !p.result && p.sweep.some((pt) => pt.values)),
  ).toBe(true)
})

it('adds a branch discovered between initial probe positions without replacing previous curves', async () => {
  const search = await createAutomaticSolver(new ArrayBuffer(0)),
    overview = createDefaultOverview(search)
  const source = 'x^2=1e-8-(p-0.123)^2',
    sweep = { name: 'p', min: -1, max: 1, step: 0.1, steps: 81 }
  expect(
    overview(source, { p: -1 }, sweep, {}, search(source, { p: -1 })).anchors,
  ).toHaveLength(0)
  expect(
    overview(source, { p: 0.123 }, sweep, {}, search(source, { p: 0.123 }))
      .anchors,
  ).toHaveLength(2)
})
