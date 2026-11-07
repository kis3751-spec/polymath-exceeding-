import { fraction, interpolate } from './chart-domain'

export type CurvePoint = {
  parameter: number
  values: number[] | null
  error?: string
}

export type AxisWindow = [number, number]
export type ChartWindow = { x: AxisWindow; y: AxisWindow }
export type ZoomAxis = 'both' | 'x' | 'y'

export const initialWindow = (): ChartWindow => ({ x: [0, 1], y: [0, 1] })

/** Evaluate the displayed polyline, rather than snapping to the table's
 * usually much coarser interval. Null solve points always split a branch. */
export function pointOnCurve(
  points: readonly CurvePoint[],
  parameter: number,
): CurvePoint | null {
  if (!points.length || !Number.isFinite(parameter)) return null
  let low = 0
  let high = points.length - 1
  if (parameter < points[low].parameter || parameter > points[high].parameter)
    return null
  while (low <= high) {
    const middle = (low + high) >>> 1
    const sample = points[middle]
    if (sample.parameter === parameter) return { ...sample }
    if (sample.parameter < parameter) low = middle + 1
    else high = middle - 1
  }
  const left = points[high]
  const right = points[low]
  if (!left || !right) return null
  if (!left.values || !right.values)
    return {
      parameter,
      values: null,
      error: left.error || right.error || '이 구간에는 추적한 해가 없습니다.',
    }
  const ratio = fraction(parameter, left.parameter, right.parameter)
  return {
    parameter,
    values: left.values.map((value, index) =>
      Number.isFinite(value) && Number.isFinite(right.values![index])
        ? interpolate(value, right.values![index], ratio)
        : NaN,
    ),
  }
}

export function nearestPointIndex(
  coordinates: readonly { parameter: number; index: number }[],
  parameter: number,
): number {
  if (!coordinates.length || !Number.isFinite(parameter)) return -1
  let low = 0
  let high = coordinates.length
  while (low < high) {
    const middle = (low + high) >>> 1
    if (coordinates[middle].parameter < parameter) low = middle + 1
    else high = middle
  }
  if (low === 0) return coordinates[0].index
  if (low === coordinates.length) return coordinates[low - 1].index
  const left = coordinates[low - 1]
  const right = coordinates[low]
  // Normalize first so opposite extreme finite endpoints cannot overflow.
  const ratio = fraction(parameter, left.parameter, right.parameter)
  return ratio <= 0.5 ? left.index : right.index
}

/** A notch changes the span by about 20%. Limits prevent an unusably tiny
 * window, floating-point collapse, and accidental unlimited zooming out. */
export function zoomAxis(
  window: AxisWindow,
  anchorRatio: number,
  factor: number,
): AxisWindow {
  if (!Number.isFinite(factor) || factor <= 0) return window
  const ratio = Math.min(1, Math.max(0, anchorRatio))
  const span = Math.min(8, Math.max(1 / 128, (window[1] - window[0]) * factor))
  const anchor = interpolate(window[0], window[1], ratio)
  let min = anchor - ratio * span
  let max = min + span
  if (min < -4) {
    max += -4 - min
    min = -4
  }
  if (max > 5) {
    min -= max - 5
    max = 5
  }
  return [min, max]
}

export function zoomWindow(
  window: ChartWindow,
  axis: ZoomAxis,
  xRatio: number,
  yRatio: number,
  factor: number,
): ChartWindow {
  return {
    x: axis === 'y' ? window.x : zoomAxis(window.x, xRatio, factor),
    y: axis === 'x' ? window.y : zoomAxis(window.y, yRatio, factor),
  }
}

export function wheelFactor(deltaY: number, deltaMode = 0): number {
  const pixels = deltaY * (deltaMode === 1 ? 16 : deltaMode === 2 ? 600 : 1)
  return Math.exp(Math.max(-120, Math.min(120, pixels)) * 0.0015)
}
