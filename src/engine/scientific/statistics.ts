// Statistical (not interval-certified) Student-t confidence calculations.
// The incomplete beta continued fraction uses Lentz's method; all inputs to
// this module come from a finite, positive regression degrees of freedom.
const lanczos = [
  676.5203681218851, -1259.1392167224028, 771.3234287776531, -176.6150291621406,
  12.507343278686905, -0.13857109526572012, 9.984369578019572e-6,
  1.5056327351493116e-7,
]
function logGamma(z: number): number {
  if (z < 0.5)
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z)
  const a = z - 1
  let x = 0.9999999999998099
  for (let i = 0; i < lanczos.length; i++) x += lanczos[i] / (a + i + 1)
  const t = a + 7.5
  return 0.5 * Math.log(2 * Math.PI) + (a + 0.5) * Math.log(t) - t + Math.log(x)
}
function betaFraction(a: number, b: number, x: number): number {
  const tiny = 1e-300
  const guard = (v: number) => (Math.abs(v) < tiny ? (v < 0 ? -tiny : tiny) : v)
  const qab = a + b,
    qap = a + 1,
    qam = a - 1
  let c = 1,
    d = 1 / guard(1 - (qab * x) / qap),
    h = d
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1 / guard(1 + aa * d)
    c = guard(1 + aa / c)
    h *= d * c
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1 / guard(1 + aa * d)
    c = guard(1 + aa / c)
    const change = d * c
    h *= change
    if (Math.abs(change - 1) <= 8 * Number.EPSILON) return h
  }
  throw new Error('Student-t incomplete beta did not converge.')
}
function regularizedBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const front = Math.exp(
    logGamma(a + b) -
      logGamma(a) -
      logGamma(b) +
      a * Math.log(x) +
      b * Math.log1p(-x),
  )
  const result =
    x < (a + 1) / (a + b + 2)
      ? (front * betaFraction(a, b, x)) / a
      : 1 - (front * betaFraction(b, a, 1 - x)) / b
  return Math.max(0, Math.min(1, result))
}
/** Two-sided 95% Student-t critical value, using the upper tail to avoid
 * subtracting a CDF close to one. Valid for finite positive degrees of freedom. */
export function studentTCritical95(df: number): number {
  if (!(df > 0) || !Number.isFinite(df))
    throw new RangeError(
      'Student-t degrees of freedom must be positive and finite.',
    )
  const tail = (t: number) =>
    0.5 * regularizedBeta(df / (df + t * t), df / 2, 0.5)
  let low = 0,
    high = 2
  while (tail(high) > 0.025 && Number.isFinite(high)) high *= 2
  if (!Number.isFinite(high))
    throw new RangeError('Student-t critical value exceeded Float64.')
  for (let i = 0; i < 90; i++) {
    const mid = low / 2 + high / 2
    if (mid === low || mid === high) break
    if (tail(mid) > 0.025) low = mid
    else high = mid
  }
  return low / 2 + high / 2
}

export function coefficientConfidence95(
  estimate: number,
  standardError: number,
  critical: number,
) {
  if (
    ![estimate, standardError, critical].every(Number.isFinite) ||
    standardError < 0 ||
    critical <= 0
  )
    return undefined
  const halfWidth = critical * standardError
  const lower = estimate - halfWidth,
    upper = estimate + halfWidth
  return Number.isFinite(lower) && Number.isFinite(upper)
    ? { lower, upper, halfWidth }
    : undefined
}
