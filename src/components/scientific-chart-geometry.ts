export type ChartPoint = { x: number; y: number }
export type IntegrationArea = { points: ChartPoint[]; sign: -1 | 1 }

const lerp = (a: number, b: number, t: number) =>
  t === 0 ? a : t === 1 ? b : (1 - t) * a + t * b
const same = (a: ChartPoint, b: ChartPoint) => a.x === b.x && a.y === b.y

/** Clip the displayed polyline, preserving undefined gaps and the exact limits. */
function clippedRuns(x: number[], y: number[], from: number, to: number) {
  const lower = Math.min(from, to),
    upper = Math.max(from, to)
  const runs: ChartPoint[][] = []
  let run: ChartPoint[] = []
  const flush = () => {
    if (run.length > 1) runs.push(run)
    run = []
  }
  for (let i = 1; i < Math.min(x.length, y.length); i++) {
    const a = { x: x[i - 1], y: y[i - 1] },
      b = { x: x[i], y: y[i] }
    if (![a.x, a.y, b.x, b.y].every(Number.isFinite) || a.x === b.x) {
      flush()
      continue
    }
    // Normalized coordinates avoid overflowing b.x - a.x for finite extremes.
    const clippedLower = Math.max(lower, Math.min(a.x, b.x))
    const clippedUpper = Math.min(upper, Math.max(a.x, b.x))
    if (!(clippedLower < clippedUpper)) {
      flush()
      continue
    }
    const scale = Math.max(Math.abs(a.x), Math.abs(b.x)) || 1
    const dx = b.x / scale - a.x / scale
    const point = (value: number): ChartPoint => ({
      x: value,
      y: lerp(
        a.y,
        b.y,
        value === a.x
          ? 0
          : value === b.x
            ? 1
            : (value / scale - a.x / scale) / dx,
      ),
    })
    const first = point(a.x < b.x ? clippedLower : clippedUpper)
    const last = point(a.x < b.x ? clippedUpper : clippedLower)
    if (run.length && !same(run[run.length - 1], first)) flush()
    if (!run.length) run.push(first)
    run.push(last)
  }
  flush()
  return runs
}

/** Polygons follow the displayed curve, split at zero, and never bridge NaN gaps. */
export function integrationAreaPolygons(
  x: number[],
  y: number[],
  from: number,
  to: number,
): IntegrationArea[] {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) return []
  const areas: IntegrationArea[] = []
  for (const run of clippedRuns(x, y, from, to)) {
    let curve: ChartPoint[] = [],
      sign: -1 | 0 | 1 = 0
    const flush = () => {
      if (sign && curve.length > 1 && curve.some((p) => p.x !== curve[0].x)) {
        areas.push({
          sign,
          points: [
            { x: curve[0].x, y: 0 },
            ...curve,
            { x: curve[curve.length - 1].x, y: 0 },
          ],
        })
      }
      curve = []
      sign = 0
    }
    const add = (a: ChartPoint, b: ChartPoint) => {
      const nextSign = Math.sign(a.y || b.y) as -1 | 0 | 1
      if (!nextSign) {
        flush()
        return
      }
      if (
        nextSign !== sign ||
        (curve.length && !same(curve[curve.length - 1], a))
      )
        flush()
      sign = nextSign
      if (!curve.length) curve.push(a)
      curve.push(b)
    }
    for (let i = 1; i < run.length; i++) {
      const a = run[i - 1],
        b = run[i]
      if ((a.y < 0 && b.y > 0) || (a.y > 0 && b.y < 0)) {
        const scale = Math.max(Math.abs(a.y), Math.abs(b.y))
        const t =
          Math.abs(a.y) /
          scale /
          (Math.abs(a.y) / scale + Math.abs(b.y) / scale)
        const crossing = { x: lerp(a.x, b.x, t), y: 0 }
        add(a, crossing)
        add(crossing, b)
      } else add(a, b)
    }
    flush()
  }
  return areas
}

/** A y=x segment clipped to the actual visible data rectangle. */
export function identitySegment(
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
) {
  const from = Math.max(xMin, yMin),
    to = Math.min(xMax, yMax)
  return Number.isFinite(from) && Number.isFinite(to) && from < to
    ? { from, to }
    : null
}
