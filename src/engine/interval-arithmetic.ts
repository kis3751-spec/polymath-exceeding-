import type { NonlinearNode as Node } from './nonlinear-parser'

/** Enclosures for real arithmetic on the parsed Float64 constants. Math's
 * transcendental functions are NOT used as proof bounds. Their endpoints are
 * enclosed using range reduction, Taylor remainders and directed basic ops. */
export type Interval = { lo: number; hi: number }
export type IntervalJet = {
  val: Interval
  der: Interval
  domain: 'all' | 'partial' | 'none'
  issue?: 'domain' | 'unsupported' | 'nonsmooth' | 'roundoff'
}
const bits = new DataView(new ArrayBuffer(8))
export function nextUp(x: number): number {
  if (Number.isNaN(x) || x === Infinity) return x
  if (x === 0) return Number.MIN_VALUE
  bits.setFloat64(0, x)
  bits.setBigUint64(0, bits.getBigUint64(0) + (x > 0 ? 1n : -1n))
  return bits.getFloat64(0)
}
export const nextDown = (x: number) => -nextUp(-x)
const point = (x: number): Interval => ({ lo: x, hi: x })
export const WHOLE: Interval = { lo: -Infinity, hi: Infinity }
const ZERO = point(0),
  ONE = point(1)
export const containsZero = (a: Interval) => a.lo <= 0 && a.hi >= 0
const bounded = (lo: number, hi: number): Interval =>
  Number.isNaN(lo) || Number.isNaN(hi) ? WHOLE : { lo, hi }
const isZero = (a: Interval) => a.lo === 0 && a.hi === 0
export const neg = (a: Interval): Interval => ({ lo: -a.hi, hi: -a.lo })
export function add(a: Interval, b: Interval): Interval {
  if (isZero(a)) return b
  if (isZero(b)) return a
  if (a.lo === a.hi && b.lo === b.hi && a.lo === -b.lo) return ZERO
  return bounded(nextDown(a.lo + b.lo), nextUp(a.hi + b.hi))
}
export const sub = (a: Interval, b: Interval) => add(a, neg(b))
export function mul(a: Interval, b: Interval): Interval {
  if (isZero(a) || isZero(b)) return ZERO
  if (a.lo === 1 && a.hi === 1) return b
  if (b.lo === 1 && b.hi === 1) return a
  const p = [a.lo * b.lo, a.lo * b.hi, a.hi * b.lo, a.hi * b.hi]
  if (p.some(Number.isNaN)) return WHOLE
  let lo = nextDown(Math.min(...p))
  let hi = nextUp(Math.max(...p))
  if ((a.lo >= 0 && b.lo >= 0) || (a.hi <= 0 && b.hi <= 0)) {
    lo = Math.max(0, lo)
  } else if ((a.lo >= 0 && b.hi <= 0) || (a.hi <= 0 && b.lo >= 0)) {
    hi = Math.min(0, hi)
  }
  return bounded(lo, hi)
}
export function div(a: Interval, b: Interval): Interval {
  if (containsZero(b)) return WHOLE
  if (b.lo === 1 && b.hi === 1) return a
  const invLo = b.lo > 0 ? Math.max(0, nextDown(1 / b.hi)) : nextDown(1 / b.hi)
  const invHi = b.hi < 0 ? Math.min(0, nextUp(1 / b.lo)) : nextUp(1 / b.lo)
  return mul(a, bounded(invLo, invHi))
}
const square = (a: Interval): Interval => {
  const p = mul(a, a)
  return { lo: containsZero(a) ? 0 : Math.max(0, p.lo), hi: p.hi }
}
export function integerPower(a: Interval, n: number): Interval {
  if (n === 0) return ONE
  if (n < 0) return div(ONE, integerPower(a, -n))
  const endpoint = (x: number) => {
    if (x === 0) return ZERO
    if (x === 1) return ONE
    let p = ONE,
      b = point(x),
      k = n
    while (k > 0) {
      if (k % 2) p = mul(p, b)
      k = Math.floor(k / 2)
      if (k) b = square(b)
    }
    return p
  }
  const l = endpoint(a.lo),
    r = endpoint(a.hi)
  return n % 2
    ? { lo: l.lo, hi: r.hi }
    : {
        lo: containsZero(a) ? 0 : Math.max(0, Math.min(l.lo, r.lo)),
        hi: Math.max(l.hi, r.hi),
      }
}
const maxAbs = (a: Interval) => Math.max(Math.abs(a.lo), Math.abs(a.hi))

export type ExactDyadic = { m: bigint; e: number }

export function toExactDyadic(x: number): ExactDyadic {
  if (!Number.isFinite(x))
    throw new Error('Exact dyadic arithmetic requires finite inputs.')
  if (x === 0) return { m: 0n, e: 0 }
  bits.setFloat64(0, x)
  const raw = bits.getBigUint64(0)
  const sign = raw >> 63n ? -1n : 1n
  const exp = Number((raw >> 52n) & 0x7ffn)
  const frac = raw & ((1n << 52n) - 1n)
  const sig = exp === 0 ? frac : frac | (1n << 52n)
  const e = (exp === 0 ? 1 : exp) - 1075
  return { m: sign * sig, e }
}

function guardDyadic(d: ExactDyadic): ExactDyadic {
  if (
    !Number.isSafeInteger(d.e) ||
    Math.abs(d.e) > 131072 ||
    d.m.toString(2).length > 32768
  )
    throw new Error('Exact polynomial arithmetic budget exceeded.')
  return d
}
export function addExactDyadic(a: ExactDyadic, b: ExactDyadic): ExactDyadic {
  guardDyadic(a)
  guardDyadic(b)
  if (Math.abs(a.e - b.e) > 131072)
    throw new Error('Exact dyadic alignment budget exceeded.')
  if (a.m === 0n) return b
  if (b.m === 0n) return a
  if (a.e === b.e) {
    const m = a.m + b.m
    return m === 0n ? { m: 0n, e: 0 } : { m, e: a.e }
  }
  if (a.e > b.e) {
    const shift = a.e - b.e
    const m = (a.m << BigInt(shift)) + b.m
    return m === 0n ? { m: 0n, e: 0 } : { m, e: b.e }
  }
  const shift = b.e - a.e
  const m = a.m + (b.m << BigInt(shift))
  return m === 0n ? { m: 0n, e: 0 } : { m, e: a.e }
}

export function mulExactDyadic(a: ExactDyadic, b: ExactDyadic): ExactDyadic {
  if (a.m === 0n || b.m === 0n) return { m: 0n, e: 0 }
  return guardDyadic({ m: a.m * b.m, e: a.e + b.e })
}

export function compareExactDyadic(a: ExactDyadic, b: ExactDyadic): number {
  const diff = addExactDyadic(a, { m: -b.m, e: b.e })
  return diff.m < 0n ? -1 : diff.m > 0n ? 1 : 0
}

/** Convert an exact dyadic rational m * 2^e to its tightest directed-rounding Float64 interval. */
export function dyadicToInterval(d: ExactDyadic): Interval {
  if (d.m === 0n) return ZERO
  const sign = d.m < 0n ? -1 : 1
  const absM = d.m < 0n ? -d.m : d.m
  const bitLen = absM.toString(2).length
  const topExp = d.e + bitLen - 1

  if (topExp < -1074) {
    return sign > 0
      ? { lo: 0, hi: Number.MIN_VALUE }
      : { lo: -Number.MIN_VALUE, hi: 0 }
  }
  if (topExp > 1023) {
    return sign > 0
      ? { lo: Number.MAX_VALUE, hi: Infinity }
      : { lo: -Infinity, hi: -Number.MAX_VALUE }
  }

  const lsbExp = Math.max(-1074, topExp - 52)
  const shift = d.e - lsbExp
  let q: bigint
  let hasRemainder: boolean
  if (shift >= 0) {
    q = absM << BigInt(shift)
    hasRemainder = false
  } else {
    const rShift = BigInt(-shift)
    q = absM >> rShift
    hasRemainder = (absM & ((1n << rShift) - 1n)) !== 0n
  }

  let rawMag: bigint
  if (topExp < -1022) {
    rawMag = q
  } else {
    const biasedExp = BigInt(topExp + 1023)
    rawMag = (biasedExp << 52n) | (q & ((1n << 52n) - 1n))
  }
  bits.setBigUint64(0, rawMag)
  const mag = bits.getFloat64(0)

  if (!hasRemainder) {
    const exact = sign > 0 ? mag : -mag
    return { lo: exact, hi: exact }
  }
  return sign > 0
    ? { lo: mag, hi: nextUp(mag) }
    : { lo: nextDown(-mag), hi: -mag }
}

const ZERO_DYADIC: ExactDyadic = { m: 0n, e: 0 }
const ONE_DYADIC: ExactDyadic = { m: 1n, e: 0 }

function trimDyadicPoly(p: ExactDyadic[]): ExactDyadic[] {
  const out = [...p]
  while (out.length > 1 && out.at(-1)!.m === 0n) out.pop()
  return out.length ? out : [ZERO_DYADIC]
}

function addDyadicPoly(
  a: readonly ExactDyadic[],
  b: readonly ExactDyadic[],
  subOp = false,
): ExactDyadic[] {
  const n = Math.max(a.length, b.length)
  const out: ExactDyadic[] = []
  for (let i = 0; i < n; i++) {
    const ai = a[i] ?? ZERO_DYADIC
    const bi = b[i] ?? ZERO_DYADIC
    const rhs = subOp ? { m: -bi.m, e: bi.e } : bi
    out.push(addExactDyadic(ai, rhs))
  }
  return trimDyadicPoly(out)
}

function mulDyadicPoly(
  a: readonly ExactDyadic[],
  b: readonly ExactDyadic[],
): ExactDyadic[] | null {
  if ((a.length === 1 && a[0].m === 0n) || (b.length === 1 && b[0].m === 0n)) {
    return [ZERO_DYADIC]
  }
  const deg = a.length - 1 + (b.length - 1)
  if (deg > 64) return null
  const out: ExactDyadic[] = Array.from({ length: deg + 1 }, () => ZERO_DYADIC)
  for (let i = 0; i < a.length; i++) {
    if (a[i].m === 0n) continue
    for (let j = 0; j < b.length; j++) {
      if (b[j].m === 0n) continue
      out[i + j] = addExactDyadic(out[i + j], mulExactDyadic(a[i], b[j]))
    }
  }
  return trimDyadicPoly(out)
}

/** Extract exact dyadic polynomial coefficients directly from the AST without Float64
 * expansion rounding (preserving terms like `(x - 1)^4 + 1e-20` exactly in BigInt). */
export function exactDyadicPolynomialCoefficients(
  node: Node,
  variable: string,
  constants: Record<string, number>,
  helpers: Map<string, Node> = new Map(),
): ExactDyadic[] | null {
  const active = new Set<string>()
  const memo = new Map<string, ExactDyadic[] | null>()
  const visit = (n: Node, depth = 0): ExactDyadic[] | null => {
    if (depth > 128) return null
    if (n.kind === 'number') {
      if (!Number.isFinite(n.value)) return null
      return [toExactDyadic(n.value)]
    }
    if (n.kind === 'name') {
      if (n.name === variable) return [ZERO_DYADIC, ONE_DYADIC]
      if (Object.hasOwn(constants, n.name)) {
        const v = constants[n.name]
        return Number.isFinite(v) ? [toExactDyadic(v)] : null
      }
      if (n.name === 'pi') return [toExactDyadic(Math.PI)]
      if (n.name === 'e') return [toExactDyadic(Math.E)]
      if (memo.has(n.name)) return memo.get(n.name)!
      const h = helpers.get(n.name)
      if (!h || active.has(n.name)) return null
      active.add(n.name)
      const r = visit(h, depth + 1)
      active.delete(n.name)
      memo.set(n.name, r)
      return r
    }
    if (n.kind === 'unary') {
      const c = visit(n.child, depth + 1)
      if (!c) return null
      return n.sign === '+'
        ? c
        : c.map((d) => (d.m === 0n ? ZERO_DYADIC : { m: -d.m, e: d.e }))
    }
    if (n.kind === 'binary' || n.name === 'pow') {
      const op = n.kind === 'binary' ? n.operator : '^'
      const lNode = n.kind === 'binary' ? n.left : n.args[0]
      const rNode = n.kind === 'binary' ? n.right : n.args[1]
      const l = visit(lNode, depth + 1)
      const r = visit(rNode, depth + 1)
      if (!l || !r) return null
      if (op === '+') return addDyadicPoly(l, r, false)
      if (op === '-') return addDyadicPoly(l, r, true)
      if (op === '*') return mulDyadicPoly(l, r)
      if (op === '/') {
        if (r.length !== 1 || r[0].m === 0n) return null
        let absDiv = r[0].m < 0n ? -r[0].m : r[0].m
        let tz = 0
        while ((absDiv & 1n) === 0n) {
          absDiv >>= 1n
          tz++
        }
        if (absDiv !== 1n) return null
        const signDiv = r[0].m < 0n ? -1n : 1n
        const shiftExp = r[0].e + tz
        return l.map((d) =>
          d.m === 0n ? ZERO_DYADIC : { m: signDiv * d.m, e: d.e - shiftExp },
        )
      }
      if (op === '^') {
        if (r.length !== 1) return null
        const expIv = dyadicToInterval(r[0])
        if (
          expIv.lo !== expIv.hi ||
          !Number.isInteger(expIv.lo) ||
          expIv.lo < 0 ||
          expIv.lo > 64
        )
          return null
        let k = expIv.lo
        if (k === 0) return [ONE_DYADIC]
        if ((l.length - 1) * k > 64) return null
        let acc: ExactDyadic[] = [ONE_DYADIC]
        let base: ExactDyadic[] = l
        while (k > 0) {
          if (k % 2 === 1) {
            const next = mulDyadicPoly(acc, base)
            if (!next) return null
            acc = next
          }
          k = Math.floor(k / 2)
          if (k > 0) {
            const nextBase = mulDyadicPoly(base, base)
            if (!nextBase) return null
            base = nextBase
          }
        }
        return acc
      }
      return null
    }
    return null
  }
  try {
    return visit(node)
  } catch {
    return null
  }
}

export function differentiateExactDyadicPoly(
  coeffs: readonly ExactDyadic[],
): ExactDyadic[] {
  if (coeffs.length <= 1) return [ZERO_DYADIC]
  const out: ExactDyadic[] = []
  for (let i = 1; i < coeffs.length; i++) {
    out.push(
      coeffs[i].m === 0n
        ? ZERO_DYADIC
        : { m: coeffs[i].m * BigInt(i), e: coeffs[i].e },
    )
  }
  return trimDyadicPoly(out)
}

export function evalExactDyadicPoly(
  coeffs: readonly ExactDyadic[],
  x: number,
): ExactDyadic {
  const dx = toExactDyadic(x)
  let acc = ZERO_DYADIC
  for (let i = coeffs.length - 1; i >= 0; i--) {
    acc = addExactDyadic(mulExactDyadic(acc, dx), coeffs[i])
  }
  return acc
}

export function exactPolynomialTaylorFromDyadic(
  exactCoeffs: readonly ExactDyadic[],
  x0: number,
): Interval[] {
  const work = exactCoeffs.map((d) => ({ m: d.m, e: d.e }))
  const dx0 = toExactDyadic(x0)
  const n = work.length
  for (let k = 0; k < n; k++) {
    for (let i = n - 2; i >= k; i--) {
      work[i] = addExactDyadic(work[i], mulExactDyadic(work[i + 1], dx0))
    }
  }
  return work.map(dyadicToInterval)
}

/** Compute the exact Taylor coefficients P^(k)(x0)/k! of a Float64-coefficient polynomial at x0. */
export function exactPolynomialTaylorIntervals(
  coefficients: readonly number[],
  x0: number,
): Interval[] {
  return exactPolynomialTaylorFromDyadic(coefficients.map(toExactDyadic), x0)
}

export function evaluateExactDyadicPolynomialCenteredJet(
  exactCoeffs: readonly ExactDyadic[],
  cell: Interval,
  criticalPoints: readonly number[] = [],
): IntervalJet {
  const evalAtCenter = (x0: number): { val: Interval; der: Interval } => {
    const t = exactPolynomialTaylorFromDyadic(exactCoeffs, x0)
    if (cell.lo === x0 && cell.hi === x0) {
      return { val: t[0] ?? ZERO, der: t[1] ?? ZERO }
    }
    const nx0 = toExactDyadic(-x0)
    const dLo = dyadicToInterval(addExactDyadic(toExactDyadic(cell.lo), nx0))
    const dHi = dyadicToInterval(addExactDyadic(toExactDyadic(cell.hi), nx0))
    const dx: Interval = { lo: dLo.lo, hi: dHi.hi }
    let val = t[0] ?? ZERO
    let der = ZERO
    for (let k = 1; k < t.length; k++) {
      const powK = integerPower(dx, k)
      val = add(val, mul(t[k], powK))
      const powKm1 = k === 1 ? ONE : integerPower(dx, k - 1)
      der = add(der, mul(mul(point(k), t[k]), powKm1))
    }
    return { val, der }
  }

  const mid = cell.lo / 2 + cell.hi / 2
  const center = Number.isFinite(mid) ? mid : 0
  let res = evalAtCenter(center)
  if (cell.lo < cell.hi) {
    for (const cp of criticalPoints) {
      if (
        Number.isFinite(cp) &&
        Math.abs(cp - center) <= Math.max(1e-2, 4 * (cell.hi - cell.lo))
      ) {
        const alt = evalAtCenter(cp)
        res = {
          val: {
            lo: Math.max(res.val.lo, alt.val.lo),
            hi: Math.min(res.val.hi, alt.val.hi),
          },
          der: {
            lo: Math.max(res.der.lo, alt.der.lo),
            hi: Math.min(res.der.hi, alt.der.hi),
          },
        }
      }
    }
  }
  return { ...res, domain: 'all' }
}

export function evaluatePolynomialCenteredIntervalJet(
  coefficients: readonly number[],
  cell: Interval,
  criticalPoints: readonly number[] = [],
): IntervalJet {
  return evaluateExactDyadicPolynomialCenteredJet(
    coefficients.map(toExactDyadic),
    cell,
    criticalPoints,
  )
}

// exp(z) = sum(z^k/k!) + R, |z|<=1/8. After k=20,
// |R| <= 2*|z^21/21!| since every subsequent term ratio is <1/2.
function expSmall(z: Interval): Interval {
  let sum = ONE,
    term = ONE
  for (let k = 1; k <= 20; k++) {
    term = div(mul(term, z), point(k))
    sum = add(sum, term)
  }
  const tail = nextUp(2 * maxAbs(div(mul(term, z), point(21))))
  return add(sum, { lo: -tail, hi: tail })
}
function expPoint(x: number): Interval {
  if (x === 0) return ONE
  if (x === -Infinity) return ZERO
  if (x === Infinity) return { lo: Number.MAX_VALUE, hi: Infinity }
  if (x < -512) return { lo: 0, hi: expPoint(-512).hi }
  if (x > 512) return { lo: expPoint(512).lo, hi: Infinity }
  let z = x,
    k = 0
  while (Math.abs(z) > 0.125) {
    z /= 2
    k++
  }
  let r = expSmall(point(z))
  while (k--) r = square(r)
  return { lo: Math.max(0, r.lo), hi: r.hi }
}
const expRange = (a: Interval): Interval => ({
  lo: expPoint(a.lo).lo,
  hi: expPoint(a.hi).hi,
})

// ln(m) = 2*atanh((m-1)/(m+1)), 1<=m<=2.
function logMantissa(m: number): Interval {
  if (m === 1) return ZERO
  const t = div(sub(point(m), ONE), add(point(m), ONE)),
    t2 = square(t)
  let power = t,
    sum = ZERO
  for (let k = 0; k < 32; k++) {
    sum = add(sum, div(power, point(2 * k + 1)))
    power = mul(power, t2)
  }
  const tail = div(power, mul(point(65), sub(ONE, t2)))
  return mul(point(2), add(sum, { lo: 0, hi: tail.hi }))
}
const LN2 = logMantissa(2)
function logPoint(x: number): Interval {
  if (x === Infinity) return { lo: 0, hi: Infinity }
  if (x === 0) return { lo: -Infinity, hi: -Number.MAX_VALUE }
  let normalized = x,
    shift = 0
  if (x < 2 ** -1022) {
    normalized = x * 2 ** 52
    shift = -52
  }
  bits.setFloat64(0, normalized)
  const exponent = Number((bits.getBigUint64(0) >> 52n) & 2047n) - 1023 + shift
  bits.setBigUint64(
    0,
    exponent >= -1022
      ? BigInt(exponent + 1023) << 52n
      : 1n << BigInt(exponent + 1074),
  )
  const mantissa = x / bits.getFloat64(0)
  return add(logMantissa(mantissa), mul(point(exponent), LN2))
}
const logRange = (a: Interval): Interval => ({
  lo: logPoint(a.lo).lo,
  hi: logPoint(a.hi).hi,
})
const LN10 = logPoint(10)

const PI: Interval = { lo: Math.PI, hi: nextUp(Math.PI) }
const HALF_PI = div(PI, point(2))
function trigPoint(x: number, cosine: boolean): Interval {
  if (x === 0) return cosine ? ONE : ZERO
  if (!Number.isFinite(x) || Math.abs(x) > 1e8) return { lo: -1, hi: 1 }
  const quadrant = Math.round(x / (Math.PI / 2))
  const y = sub(point(x), mul(point(quadrant), HALF_PI)),
    y2 = square(y)
  const sinSeries = (isCos: boolean) => {
    let term = isCos ? ONE : y,
      sum = term
    for (let k = 1; k < 16; k++) {
      term = div(
        neg(mul(term, y2)),
        point(isCos ? (2 * k - 1) * (2 * k) : 2 * k * (2 * k + 1)),
      )
      sum = add(sum, term)
    }
    const degree = isCos ? 32 : 33
    let tail = ONE
    for (let k = 1; k <= degree; k++)
      tail = div(mul(tail, point(maxAbs(y))), point(k))
    return add(sum, { lo: -tail.hi, hi: tail.hi })
  }
  const q = ((quadrant % 4) + 4) % 4,
    index = (q + (cosine ? 1 : 0)) % 4
  const s = sinSeries(index % 2 === 1),
    r = index >= 2 ? neg(s) : s
  return { lo: Math.max(-1, r.lo), hi: Math.min(1, r.hi) }
}
function trigRange(a: Interval, cosine: boolean): Interval {
  if (
    !Number.isFinite(a.lo) ||
    !Number.isFinite(a.hi) ||
    maxAbs(a) > 1e8 ||
    a.hi - a.lo >= 2 * PI.lo
  )
    return { lo: -1, hi: 1 }
  const l = trigPoint(a.lo, cosine),
    r = trigPoint(a.hi, cosine)
  let lo = Math.min(l.lo, r.lo),
    hi = Math.max(l.hi, r.hi)
  const start = Math.floor(a.lo / (Math.PI / 2)) - 2,
    end = Math.ceil(a.hi / (Math.PI / 2)) + 2
  for (let k = start; k <= end; k++) {
    const critical = mul(point(k), HALF_PI)
    if (critical.hi < a.lo || critical.lo > a.hi) continue
    const values = cosine ? [1, 0, -1, 0] : [0, 1, 0, -1],
      v = values[((k % 4) + 4) % 4]
    lo = Math.min(lo, v)
    hi = Math.max(hi, v)
  }
  return { lo, hi }
}
function sinhPoint(x: number): Interval {
  if (x === 0) return ZERO
  return div(sub(expPoint(x), expPoint(-x)), point(2))
}
function coshPoint(x: number): Interval {
  if (x === 0) return ONE
  return div(add(expPoint(x), expPoint(-x)), point(2))
}
const sinhRange = (a: Interval): Interval => ({
  lo: sinhPoint(a.lo).lo,
  hi: sinhPoint(a.hi).hi,
})
const coshRange = (a: Interval): Interval => ({
  lo: containsZero(a)
    ? 1
    : Math.max(1, Math.min(coshPoint(a.lo).lo, coshPoint(a.hi).lo)),
  hi: Math.max(coshPoint(a.lo).hi, coshPoint(a.hi).hi),
})
function tanhPoint(x: number): Interval {
  if (x === 0) return ZERO
  if (x < 0) return neg(tanhPoint(-x))
  if (x > 256) return { lo: tanhPoint(256).lo, hi: 1 }
  const e = expPoint(2 * x),
    r = div(sub(e, ONE), add(e, ONE))
  return { lo: Math.max(0, r.lo), hi: Math.min(1, r.hi) }
}
const tanhRange = (a: Interval): Interval => ({
  lo: tanhPoint(a.lo).lo,
  hi: tanhPoint(a.hi).hi,
})

function dyadic(x: number): [bigint, number] {
  bits.setFloat64(0, x)
  const raw = bits.getBigUint64(0),
    e = Number((raw >> 52n) & 2047n)
  return [
    (raw & ((1n << 52n) - 1n)) + (e ? 1n << 52n : 0n),
    e ? e - 1075 : -1074,
  ]
}
function compareSquare(y: number, x: number): number {
  const [m, e] = dyadic(y),
    [n, f] = dyadic(x),
    shift = 2 * e - f
  const a = shift >= 0 ? (m * m) << BigInt(shift) : m * m,
    b = shift < 0 ? n << BigInt(-shift) : n
  return a < b ? -1 : a > b ? 1 : 0
}
function sqrtPoint(x: number): Interval {
  if (x === 0) return ZERO
  if (x === Infinity) return { lo: 0, hi: Infinity }
  let lo = Math.sqrt(x),
    hi = lo
  if (!Number.isFinite(lo) || lo < 0) return { lo: 0, hi: Math.max(1, x) }
  for (let i = 0; i < 8 && compareSquare(lo, x) > 0; i++) lo = nextDown(lo)
  for (let i = 0; i < 8 && compareSquare(hi, x) < 0; i++) hi = nextUp(hi)
  return compareSquare(lo, x) <= 0 && compareSquare(hi, x) >= 0
    ? { lo, hi }
    : { lo: 0, hi: Math.max(1, x) }
}
const sqrtRange = (a: Interval): Interval => ({
  lo: sqrtPoint(a.lo).lo,
  hi: sqrtPoint(a.hi).hi,
})

const SQRT_PI = sqrtRange(PI)
const SQRT_2 = sqrtRange(point(2))
const TWO_OVER_SQRT_PI = div(point(2), SQRT_PI)

/** Rigorous interval enclosure of erf(x) using the purely positive series
 * (2/sqrt(pi))*exp(-x^2)*sum_{n>=0} (2^n x^(2n+1) / (2n+1)!!) for |x| <= 5.5
 * and alternating asymptotic erfc bracketing for |x| > 5.5. */
export function erfPoint(x: number): Interval {
  if (Number.isNaN(x)) return { lo: -1, hi: 1 }
  if (x === 0) return ZERO
  if (x < 0) return neg(erfPoint(-x))
  if (!Number.isFinite(x)) return ONE
  if (x > 5.5) {
    const ix = point(x)
    const x2 = square(ix)
    const twoX2 = mul(point(2), x2)
    const inv = div(ONE, twoX2)
    const inv2 = square(inv)
    const inv3 = mul(inv2, inv)
    const inv4 = square(inv2)
    const inv5 = mul(inv4, inv)
    const sUpper = add(
      sub(ONE, inv),
      add(
        mul(point(3), inv2),
        sub(mul(point(105), inv4), mul(point(15), inv3)),
      ),
    )
    const sLower = sub(sUpper, mul(point(945), inv5))
    const pref = div(expRange(neg(x2)), mul(SQRT_PI, ix))
    const erfcHi = mul(pref, sUpper).hi
    const erfcLo = Math.max(0, mul(pref, sLower).lo)
    return {
      lo: Math.max(0, nextDown(1 - erfcHi)),
      hi: Math.min(1, nextUp(1 - erfcLo)),
    }
  }
  const ix = point(x)
  const x2 = square(ix)
  const twoX2 = mul(point(2), x2)
  let term = ix
  let sum = ix
  for (let n = 1; n <= 96; n++) {
    term = div(mul(term, twoX2), point(2 * n + 1))
    sum = add(sum, term)
  }
  const nextTerm = div(mul(term, twoX2), point(195))
  const tailHi = mul(point(2), nextTerm).hi
  const totalSeries = add(sum, { lo: 0, hi: tailHi })
  const res = mul(TWO_OVER_SQRT_PI, mul(expRange(neg(x2)), totalSeries))
  return { lo: Math.max(0, res.lo), hi: Math.min(1, res.hi) }
}

export function erfRange(a: Interval): Interval {
  if (Number.isNaN(a.lo) || Number.isNaN(a.hi)) return { lo: -1, hi: 1 }
  return { lo: erfPoint(a.lo).lo, hi: erfPoint(a.hi).hi }
}

export function normalCdfRange(a: Interval): Interval {
  if (Number.isNaN(a.lo) || Number.isNaN(a.hi)) return { lo: 0, hi: 1 }
  if (a.lo === -Infinity && a.hi === -Infinity) return ZERO
  if (a.lo === Infinity && a.hi === Infinity) return ONE
  const scaled = div(a, SQRT_2)
  const e = erfRange(scaled)
  const c = mul(point(0.5), add(ONE, e))
  return {
    lo: a.lo === -Infinity ? 0 : Math.max(0, c.lo),
    hi: a.hi === Infinity ? 1 : Math.min(1, c.hi),
  }
}

const unknown = (issue: IntervalJet['issue'] = 'unsupported'): IntervalJet => ({
  val: WHOLE,
  der: WHOLE,
  domain: 'partial',
  issue,
})
const constant = (x: number): IntervalJet => ({
  val: point(x),
  der: ZERO,
  domain: 'all',
})
function combine(
  a: IntervalJet,
  b: IntervalJet,
): Pick<IntervalJet, 'domain' | 'issue'> {
  return {
    domain:
      a.domain === 'none' || b.domain === 'none'
        ? 'none'
        : a.domain === 'partial' || b.domain === 'partial'
          ? 'partial'
          : 'all',
    issue: a.issue ?? b.issue,
  }
}
export function evaluateIntervalJet(
  node: Node,
  variable: string,
  x: Interval,
  constants: Record<string, number | Interval>,
  helpers: Map<string, Node> = new Map(),
): IntervalJet {
  const memo = new Map<string, IntervalJet>(),
    active = new Set<string>()
  let visits = 0
  const visit = (n: Node, depth = 0): IntervalJet => {
    if (depth > 128 || ++visits > 10000) return unknown()
    if (n.kind === 'number') return constant(n.value)
    if (n.kind === 'name') {
      if (n.name === variable) return { val: x, der: ONE, domain: 'all' }
      if (Object.hasOwn(constants, n.name)) {
        const value = constants[n.name]
        return typeof value === 'number'
          ? constant(value)
          : { val: value, der: ZERO, domain: 'all' }
      }
      if (n.name === 'pi') return constant(Math.PI)
      if (n.name === 'e') return constant(Math.E)
      if (memo.has(n.name)) return memo.get(n.name)!
      const helper = helpers.get(n.name)
      if (!helper || active.has(n.name)) return unknown()
      active.add(n.name)
      const r = visit(helper, depth + 1)
      active.delete(n.name)
      memo.set(n.name, r)
      return r
    }
    if (n.kind === 'unary') {
      const a = visit(n.child, depth + 1)
      return n.sign === '+' ? a : { ...a, val: neg(a.val), der: neg(a.der) }
    }
    if (n.kind === 'binary' || n.name === 'pow') {
      const l = visit(n.kind === 'binary' ? n.left : n.args[0], depth + 1),
        r = visit(n.kind === 'binary' ? n.right : n.args[1], depth + 1),
        flags = combine(l, r)
      if (flags.domain === 'none')
        return { ...unknown('domain'), domain: 'none' }
      const op = n.kind === 'binary' ? n.operator : '^'
      if (op === '+')
        return { ...flags, val: add(l.val, r.val), der: add(l.der, r.der) }
      if (op === '-')
        return { ...flags, val: sub(l.val, r.val), der: sub(l.der, r.der) }
      if (op === '*')
        return {
          ...flags,
          val: mul(l.val, r.val),
          der: add(mul(l.der, r.val), mul(l.val, r.der)),
        }
      if (op === '/') {
        if (containsZero(r.val))
          return {
            ...unknown('domain'),
            domain: isZero(r.val) ? 'none' : 'partial',
          }
        return {
          ...flags,
          val: div(l.val, r.val),
          der: div(sub(mul(l.der, r.val), mul(l.val, r.der)), square(r.val)),
        }
      }
      if (
        op === '^' &&
        r.val.lo === r.val.hi &&
        Number.isInteger(r.val.lo) &&
        Math.abs(r.val.lo) <= 1024 &&
        isZero(r.der)
      ) {
        const k = r.val.lo
        if (k < 0 && containsZero(l.val))
          return {
            ...unknown('domain'),
            domain: isZero(l.val) ? 'none' : 'partial',
          }
        return {
          ...flags,
          val: integerPower(l.val, k),
          der:
            k === 0
              ? ZERO
              : mul(mul(point(k), integerPower(l.val, k - 1)), l.der),
        }
      }
      if (op === '^' && r.val.lo === 0.5 && r.val.hi === 0.5 && isZero(r.der)) {
        if (l.val.hi < 0) return { ...unknown('domain'), domain: 'none' }
        if (l.val.lo < 0) return unknown('domain')
        const v = sqrtRange(l.val)
        return {
          ...flags,
          val: v,
          der: div(l.der, mul(point(2), v)),
        }
      }
      return unknown()
    }
    const a = visit(n.args[0], depth + 1),
      u = a.val,
      du = a.der
    if (a.domain === 'none') return a
    const result = (val: Interval, der: Interval): IntervalJet => ({
      ...a,
      val,
      der,
    })
    switch (n.name) {
      case 'sin':
        return result(trigRange(u, false), mul(trigRange(u, true), du))
      case 'cos':
        return result(trigRange(u, true), neg(mul(trigRange(u, false), du)))
      case 'tan': {
        const c = trigRange(u, true)
        return containsZero(c)
          ? unknown('domain')
          : result(div(trigRange(u, false), c), div(du, square(c)))
      }
      case 'exp': {
        const v = expRange(u)
        return result(v, mul(v, du))
      }
      case 'sinh':
        return result(sinhRange(u), mul(coshRange(u), du))
      case 'cosh':
        return result(coshRange(u), mul(sinhRange(u), du))
      case 'tanh': {
        const v = tanhRange(u),
          d = sub(ONE, square(v))
        return result(
          v,
          mul({ lo: Math.max(0, d.lo), hi: Math.min(1, d.hi) }, du),
        )
      }
      case 'ln':
      case 'log':
      case 'log10': {
        if (u.hi <= 0) return { ...unknown('domain'), domain: 'none' }
        if (u.lo <= 0) return unknown('domain')
        const scale = n.name === 'ln' ? ONE : LN10
        return result(div(logRange(u), scale), div(du, mul(u, scale)))
      }
      case 'sqrt': {
        if (u.hi < 0) return { ...unknown('domain'), domain: 'none' }
        if (u.lo < 0) return unknown('domain')
        const v = sqrtRange(u)
        return result(v, div(du, mul(point(2), v)))
      }
      case 'abs': {
        const v = {
          lo: containsZero(u) ? 0 : Math.min(Math.abs(u.lo), Math.abs(u.hi)),
          hi: maxAbs(u),
        }
        return { ...result(v, WHOLE), issue: 'nonsmooth' }
      }
      case 'floor':
      case 'ceil':
      case 'sign': {
        const f =
          n.name === 'floor'
            ? Math.floor
            : n.name === 'ceil'
              ? Math.ceil
              : Math.sign
        return {
          ...result({ lo: f(u.lo), hi: f(u.hi) }, WHOLE),
          issue: 'nonsmooth',
        }
      }
      case 'min':
      case 'max': {
        const b = visit(n.args[1], depth + 1),
          f = n.name === 'min' ? Math.min : Math.max
        return {
          ...combine(a, b),
          val: { lo: f(u.lo, b.val.lo), hi: f(u.hi, b.val.hi) },
          der: WHOLE,
          issue: 'nonsmooth',
        }
      }
      default:
        return unknown()
    }
  }
  return visit(node)
}

const numNode = (value: number): Node => ({ kind: 'number', value })
const isZeroNode = (n: Node) => n.kind === 'number' && n.value === 0
const isOneNode = (n: Node) => n.kind === 'number' && n.value === 1
const binNode = (operator: string, left: Node, right: Node): Node => {
  if (operator === '+') {
    if (isZeroNode(left)) return right
    if (isZeroNode(right)) return left
  }
  if (operator === '-') {
    if (isZeroNode(right)) return left
    if (isZeroNode(left)) return { kind: 'unary', sign: '-', child: right }
  }
  if (operator === '*') {
    if (isZeroNode(left) || isZeroNode(right)) return numNode(0)
    if (isOneNode(left)) return right
    if (isOneNode(right)) return left
  }
  if (operator === '/' && isZeroNode(left)) return numNode(0)
  return { kind: 'binary', operator, left, right }
}

export function differentiateNode(
  node: Node,
  variable: string,
  helpers: Map<string, Node> = new Map(),
  depth = 0,
): Node | null {
  if (depth > 64) return null
  if (node.kind === 'number') return numNode(0)
  if (node.kind === 'name') {
    if (node.name === variable) return numNode(1)
    if (helpers.has(node.name))
      return differentiateNode(
        helpers.get(node.name)!,
        variable,
        helpers,
        depth + 1,
      )
    return numNode(0)
  }
  if (node.kind === 'unary') {
    const dc = differentiateNode(node.child, variable, helpers, depth + 1)
    if (!dc) return null
    return node.sign === '+'
      ? dc
      : isZeroNode(dc)
        ? numNode(0)
        : { kind: 'unary', sign: '-', child: dc }
  }
  if (node.kind === 'binary' || node.name === 'pow') {
    const op = node.kind === 'binary' ? node.operator : '^'
    const l = node.kind === 'binary' ? nLeft(node) : node.args[0]
    const r = node.kind === 'binary' ? nRight(node) : node.args[1]
    const dl = differentiateNode(l, variable, helpers, depth + 1)
    const dr = differentiateNode(r, variable, helpers, depth + 1)
    if (!dl || !dr) return null
    if (op === '+' || op === '-') return binNode(op, dl, dr)
    if (op === '*')
      return binNode('+', binNode('*', dl, r), binNode('*', l, dr))
    if (op === '/')
      return binNode(
        '/',
        binNode('-', binNode('*', dl, r), binNode('*', l, dr)),
        binNode('^', r, numNode(2)),
      )
    if (op === '^' && r.kind === 'number' && Number.isInteger(r.value)) {
      const k = r.value
      if (k === 0) return numNode(0)
      if (k === 1) return dl
      return binNode(
        '*',
        binNode('*', numNode(k), binNode('^', l, numNode(k - 1))),
        dl,
      )
    }
    return null
  }
  if (node.args.length !== 1) return null
  const u = node.args[0]
  const du = differentiateNode(u, variable, helpers, depth + 1)
  if (!du) return null
  if (isZeroNode(du)) return numNode(0)
  switch (node.name) {
    case 'sin':
      return binNode('*', { kind: 'call', name: 'cos', args: [u] }, du)
    case 'cos':
      return {
        kind: 'unary',
        sign: '-',
        child: binNode('*', { kind: 'call', name: 'sin', args: [u] }, du),
      }
    case 'tan':
      return binNode(
        '/',
        du,
        binNode('^', { kind: 'call', name: 'cos', args: [u] }, numNode(2)),
      )
    case 'exp':
      return binNode('*', { kind: 'call', name: 'exp', args: [u] }, du)
    case 'sinh':
      return binNode('*', { kind: 'call', name: 'cosh', args: [u] }, du)
    case 'cosh':
      return binNode('*', { kind: 'call', name: 'sinh', args: [u] }, du)
    case 'tanh':
      return binNode(
        '/',
        du,
        binNode('^', { kind: 'call', name: 'cosh', args: [u] }, numNode(2)),
      )
    case 'ln':
      return binNode('/', du, u)
    case 'log':
    case 'log10':
      return binNode(
        '/',
        du,
        binNode('*', u, { kind: 'call', name: 'ln', args: [numNode(10)] }),
      )
    case 'sqrt':
      return binNode(
        '/',
        du,
        binNode('*', numNode(2), { kind: 'call', name: 'sqrt', args: [u] }),
      )
    default:
      return null
  }
}

function nLeft(n: Extract<Node, { kind: 'binary' }>): Node {
  return n.left
}
function nRight(n: Extract<Node, { kind: 'binary' }>): Node {
  return n.right
}
