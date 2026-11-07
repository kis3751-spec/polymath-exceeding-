import { describe, expect, it } from 'vitest'
import {
  initialWindow,
  nearestPointIndex,
  pointOnCurve,
  wheelFactor,
  zoomAxis,
  zoomWindow,
} from '../src/components/chart-interaction'
import { fraction, interpolate } from '../src/components/chart-domain'

describe('continuous graph exploration', () => {
  const curve = [
    { parameter: 0, values: [0, -40] },
    { parameter: 0.5, values: [1, -39.5] },
    { parameter: 1, values: [4, -39] },
  ]
  it('moves along rendered segments even within the same table interval', () => {
    const table = [
      { parameter: 0, index: 0 },
      { parameter: 1, index: 1 },
    ]
    const first = pointOnCurve(curve, 0.1)!
    const second = pointOnCurve(curve, 0.2)!
    expect(first.values).toEqual([0.2, -39.9])
    expect(second.values).toEqual([0.4, -39.8])
    expect(nearestPointIndex(table, first.parameter)).toBe(0)
    expect(nearestPointIndex(table, second.parameter)).toBe(0)
  })
  it('uses the displayed polyline rather than inventing an analytic solve', () => {
    expect(pointOnCurve(curve, 0.75)?.values).toEqual([2.5, -39.25])
  })
  it('returns exact samples at solved endpoints', () => {
    expect(pointOnCurve(curve, 0)).toEqual(curve[0])
    expect(pointOnCurve(curve, 1)).toEqual(curve[2])
  })
  it('never bridges a failed solve or extrapolates outside the graph', () => {
    const split = [
      curve[0],
      { parameter: 0.5, values: null, error: '추적 실패' },
      curve[2],
    ]
    for (const parameter of [0.25, 0.5, 0.75]) {
      expect(pointOnCurve(split, parameter)?.values).toBeNull()
      expect(pointOnCurve(split, parameter)?.error).toBe('추적 실패')
    }
    expect(pointOnCurve(split, -0.1)).toBeNull()
    expect(pointOnCurve(split, 1.1)).toBeNull()
  })
  it('supports extreme finite coordinates without overflow', () => {
    const result = pointOnCurve(
      [
        { parameter: -1e308, values: [-1e308] },
        { parameter: 1e308, values: [1e308] },
      ],
      0,
    )
    expect(result?.values).toEqual([0])
    expect(
      nearestPointIndex(
        [
          { parameter: -1e308, index: 2 },
          { parameter: 1e308, index: 4 },
        ],
        1e307,
      ),
    ).toBe(4)
  })
  it('handles empty and single sample charts without undefined indices', () => {
    expect(pointOnCurve([], 0)).toBeNull()
    expect(pointOnCurve([curve[0]], 0)).toEqual(curve[0])
    expect(pointOnCurve([curve[0]], 0.1)).toBeNull()
    expect(nearestPointIndex([], 0)).toBe(-1)
  })
})

describe('focused, cursor-anchored wheel scaling', () => {
  it('uses a moderate speed and normalizes pixel, line and page wheel units', () => {
    expect(wheelFactor(120)).toBeCloseTo(1.197217, 5)
    expect(wheelFactor(-120)).toBeCloseTo(1 / wheelFactor(120), 12)
    expect(wheelFactor(3, 1)).toBe(wheelFactor(48))
    expect(wheelFactor(1, 2)).toBe(wheelFactor(120))
  })
  it('keeps the data value under the cursor stationary', () => {
    const before: [number, number] = [0.2, 0.8]
    const ratio = 0.3
    const after = zoomAxis(before, ratio, wheelFactor(-120))
    const anchor = interpolate(before[0], before[1], ratio)
    expect(fraction(anchor, after[0], after[1])).toBeCloseTo(ratio, 12)
    expect(after[1] - after[0]).toBeLessThan(before[1] - before[0])
  })
  it('can adjust only one axis without altering the other aspect', () => {
    const initial = initialWindow()
    const horizontal = zoomWindow(initial, 'x', 0.5, 0.5, 0.8)
    expect(horizontal.x).toEqual([0.09999999999999998, 0.9])
    expect(horizontal.y).toBe(initial.y)
    const vertical = zoomWindow(initial, 'y', 0.5, 0.5, 0.8)
    expect(vertical.x).toBe(initial.x)
    expect(vertical.y).toEqual(horizontal.x)
  })
  it('bounds repeated zooming and keeps an ordered finite window', () => {
    let narrow: [number, number] = [0, 1]
    let wide: [number, number] = [0, 1]
    for (let step = 0; step < 200; step++) {
      narrow = zoomAxis(narrow, 0.3, 0.8)
      wide = zoomAxis(wide, 0.9, 1.2)
    }
    expect(narrow[1] - narrow[0]).toBeCloseTo(1 / 128)
    expect(wide[1] - wide[0]).toBe(8)
    expect(wide).toEqual([-3.5, 4.5])
    expect([...narrow, ...wide].every(Number.isFinite)).toBe(true)
  })
  it('ignores invalid scaling factors', () => {
    const axis: [number, number] = [0, 1]
    for (const invalid of [NaN, Infinity, 0, -1])
      expect(zoomAxis(axis, 0.5, invalid)).toBe(axis)
  })
  it('keeps the fully zoomed-out view identical at either pointer edge', () => {
    for (const pointer of [0, 0.3, 0.9, 1]) {
      expect(zoomAxis([-3.5, 4.5], pointer, 1.2)).toEqual([-3.5, 4.5])
    }
  })
})
