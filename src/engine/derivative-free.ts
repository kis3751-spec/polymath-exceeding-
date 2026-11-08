import type { Bounds } from './search-analysis'
/** No derivative calls: bracketed sign roots and local minimization of |F|.
 * A sign jump alone never counts as a zero. Zero plateaus produce representatives. */
export function derivativeFreeRoots(
  evaluate: (x: number) => number | undefined,
  bounds: Bounds,
  resolution = 4096,
  deadline = performance.now() + 1800,
) {
  const nodes = new Set(
    Array.from(
      { length: resolution + 1 },
      (_, i) =>
        bounds.min * (1 - i / resolution) + bounds.max * (i / resolution),
    ),
  )
  for (let i = 0; resolution >= 1024 && i <= 800; i++) {
    const x = -1 + i / 400
    if (x >= bounds.min && x <= bounds.max) nodes.add(x)
  }
  const grid = [...nodes].sort((a, b) => a - b),
    samples: (number | undefined)[] = [],
    roots: number[] = []
  let truncated = false
  for (const x of grid) {
    if (performance.now() > deadline) {
      truncated = true
      break
    }
    samples.push(evaluate(x))
  }
  let plateau = false,
    run = false
  const add = (x: number) => {
    if (
      !roots.some(
        (r) =>
          Math.abs(r - x) <=
          128 *
            Number.EPSILON *
            Math.max(Number.MIN_VALUE, Math.abs(x), Math.abs(r)),
      )
    )
      roots.push(x)
  }
  for (let i = 0; i < grid.length; i++) {
    if (performance.now() > deadline) {
      truncated = true
      break
    }
    const f = samples[i]
    if (f === 0) {
      if (!run) add(grid[i])
      else plateau = true
      run = true
    } else run = false
    if (
      i &&
      f !== undefined &&
      samples[i - 1] !== undefined &&
      f !== 0 &&
      samples[i - 1] !== 0 &&
      Math.sign(f) !== Math.sign(samples[i - 1]!)
    ) {
      let lo = grid[i - 1],
        hi = grid[i],
        fl = samples[i - 1]!,
        baseline = Math.min(Math.abs(fl), Math.abs(f))
      for (let k = 0; k < 160; k++) {
        const mid = lo / 2 + hi / 2,
          fm = evaluate(mid)
        if (fm === undefined) break
        if (fm === 0) {
          add(mid)
          break
        }
        if (mid === lo || mid === hi) {
          if (Math.abs(fm) <= baseline * 1e-11) add(mid)
          break
        }
        if (Math.sign(fm) === Math.sign(fl)) {
          lo = mid
          fl = fm
        } else hi = mid
      }
    }
    if (
      i > 0 &&
      i + 1 < grid.length &&
      f !== undefined &&
      f !== 0 &&
      samples[i - 1] !== undefined &&
      samples[i + 1] !== undefined &&
      Math.abs(f) < Math.abs(samples[i - 1]!) &&
      Math.abs(f) < Math.abs(samples[i + 1]!)
    ) {
      let lo = grid[i - 1],
        hi = grid[i + 1]
      for (let k = 0; k < 160; k++) {
        const a = lo + (hi - lo) * 0.3819660112501051,
          b = lo + (hi - lo) * 0.6180339887498949
        const fa = evaluate(a),
          fb = evaluate(b)
        if (fa === 0) {
          add(a)
          break
        }
        if (fb === 0) {
          add(b)
          break
        }
        if (fa === undefined || fb === undefined || a === lo || b === hi) break
        if (Math.abs(fa) < Math.abs(fb)) hi = b
        else lo = a
      }
      for (const x of [lo, hi, lo / 2 + hi / 2]) if (evaluate(x) === 0) add(x)
    }
  }
  return { roots, plateau, truncated }
}
