import type { SolveResult } from './index'

const roundoff = (x: number) =>
  Math.max(8 * Number.MIN_VALUE, 128 * Number.EPSILON * Math.abs(x))
const cache = new WeakMap<SolveResult, number[]>()
/** Local error estimate from J*dx=-F; used for duplicate removal, never as a root certificate. */
function uncertainty(result: SolveResult) {
  const cached = cache.get(result)
  if (cached) return cached
  const n = result.values.length,
    errors = result.values.map(roundoff)
  if (result.matrix.length === n && result.residuals.length === n) {
    const a = result.matrix.map((row, i) => {
      const scale = Math.max(...row.map(Math.abs))
      return [...row.map((v) => v / scale), result.residuals[i] / scale]
    })
    let valid = a.every(
      (row) => row.length === n + 1 && row.every(Number.isFinite),
    )
    for (let k = 0; valid && k < n; k++) {
      let pivot = k
      for (let i = k + 1; i < n; i++)
        if (Math.abs(a[i][k]) > Math.abs(a[pivot][k])) pivot = i
      if (a[pivot][k] === 0) {
        valid = false
        break
      }
      ;[a[k], a[pivot]] = [a[pivot], a[k]]
      for (let i = k + 1; i < n; i++) {
        const f = a[i][k] / a[k][k]
        for (let j = k + 1; j <= n; j++) a[i][j] -= f * a[k][j]
      }
    }
    if (valid) {
      const dx = Array(n).fill(0)
      for (let i = n - 1; i >= 0; i--) {
        let rhs = a[i][n]
        for (let j = i + 1; j < n; j++) rhs -= a[i][j] * dx[j]
        dx[i] = rhs / a[i][i]
      }
      dx.forEach((v, i) => {
        if (Number.isFinite(v)) errors[i] += 8 * Math.abs(v)
      })
    }
  }
  cache.set(result, errors)
  return errors
}
export function sameComputedRoot(a: SolveResult, b: SolveResult) {
  if (
    a.variables.length !== b.variables.length ||
    a.variables.some((n, i) => n !== b.variables[i])
  )
    return false
  const ea = uncertainty(a),
    eb = uncertainty(b)
  return a.values.every(
    (v, i) =>
      Number.isFinite(v) &&
      Number.isFinite(b.values[i]) &&
      Math.abs(v - b.values[i]) <= ea[i] + eb[i],
  )
}
