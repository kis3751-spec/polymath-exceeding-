import { describe, expect, it } from 'vitest'
import {
  identitySegment,
  integrationAreaPolygons,
} from '../src/components/scientific-chart-geometry'

describe('integration area geometry', () => {
  it('clips at exact integration limits and separates signed contributions', () => {
    const areas = integrationAreaPolygons([0, 1, 2], [-1, 0, 1], 0.5, 1.5)
    expect(areas).toEqual([
      {
        sign: -1,
        points: [
          { x: 0.5, y: 0 },
          { x: 0.5, y: -0.5 },
          { x: 1, y: 0 },
          { x: 1, y: 0 },
        ],
      },
      {
        sign: 1,
        points: [
          { x: 1, y: 0 },
          { x: 1, y: 0 },
          { x: 1.5, y: 0.5 },
          { x: 1.5, y: 0 },
        ],
      },
    ])
  })
  it('inserts a zero crossing rather than shading negative area as positive', () => {
    const areas = integrationAreaPolygons([-2, 2], [-3, 1], -1, 2)
    expect(areas.map((area) => area.sign)).toEqual([-1, 1])
    expect(areas[0].points.at(-1)?.x).toBeCloseTo(1, 14)
    expect(areas[1].points[0].x).toBeCloseTo(1, 14)
    expect(areas[0].points.at(-1)?.y).toBe(0)
    expect(areas[0].points).toContainEqual({ x: -1, y: -2 })
  })
  it('does not shade across undefined data or outside the supplied range', () => {
    const areas = integrationAreaPolygons(
      [0, 1, 2, 3, 4],
      [1, 1, NaN, 2, 2],
      0.25,
      3.5,
    )
    expect(areas).toHaveLength(2)
    expect(areas[0].points.every((p) => p.x >= 0.25 && p.x <= 1)).toBe(true)
    expect(areas[1].points.every((p) => p.x >= 3 && p.x <= 3.5)).toBe(true)
  })
  it('keeps the same geometric area for reversed integration limits', () => {
    expect(integrationAreaPolygons([0, 1, 2], [2, 3, 2], 1.5, 0.5)).toEqual(
      integrationAreaPolygons([0, 1, 2], [2, 3, 2], 0.5, 1.5),
    )
  })
  it('supports descending sampled coordinates', () => {
    const areas = integrationAreaPolygons([2, 1, 0], [1, 2, 3], 0.5, 1.5)
    expect(areas).toHaveLength(1)
    expect(areas[0].points).toContainEqual({ x: 1.5, y: 1.5 })
    expect(areas[0].points).toContainEqual({ x: 0.5, y: 2.5 })
  })
  it('does not lose a tiny curve inside very broad finite bounds', () => {
    expect(
      integrationAreaPolygons([0, 1e-308], [1, 2], -1e308, 1e308),
    ).toHaveLength(1)
  })
  it('returns no area for empty, invalid, or zero-width ranges', () => {
    expect(integrationAreaPolygons([], [], 0, 1)).toEqual([])
    expect(integrationAreaPolygons([0, 1], [0, 0], 0, 1)).toEqual([])
    expect(integrationAreaPolygons([0, 1], [1, 1], 0.5, 0.5)).toEqual([])
    expect(integrationAreaPolygons([0, 1], [1, 1], NaN, 1)).toEqual([])
  })
})

describe('observed/predicted reference line', () => {
  it('clips y=x to the overlapping data ranges', () => {
    expect(identitySegment(-2, 5, 1, 8)).toEqual({ from: 1, to: 5 })
    expect(identitySegment(-5, -2, 1, 8)).toBeNull()
    expect(identitySegment(1, 1, 1, 8)).toBeNull()
  })
})
