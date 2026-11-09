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
  // Intersect with the known sign, retaining all real values between zero
  // and MIN_VALUE when a positive or negative product underflows.
  if ((a.lo >= 0 && b.lo >= 0) || (a.hi <= 0 && b.hi <= 0)) lo = Math.max(0, lo)
  else if ((a.lo >= 0 && b.hi <= 0) || (a.hi <= 0 && b.lo >= 0))
    hi = Math.min(0, hi)
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

// ln(m) = 2*atanh((m-1)/(m+1)), 1<=m<=2. The remaining
// positive series is bounded by its first term / (1-t^2).
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
  // Construct the exact binary power instead of relying on Math.pow.
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

// A known rational enclosure of mathematical pi (both endpoints are dyadic).
const PI: Interval = { lo: Math.PI, hi: nextUp(Math.PI) }
const HALF_PI = div(PI, point(2))
function trigPoint(x: number, cosine: boolean): Interval {
  if (x === 0) return cosine ? ONE : ZERO
  if (!Number.isFinite(x) || Math.abs(x) > 1e6) return { lo: -1, hi: 1 }
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
    // Taylor's theorem; all real derivatives of sin/cos have magnitude <=1.
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
    maxAbs(a) > 1e6 ||
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

// Verify a sqrt seed with exact dyadic integer comparisons. We do not assume
// an implementation-specific error bound for Math.sqrt.
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
        const c = constants[n.name]
        return typeof c === 'number'
          ? constant(c)
          : { val: c, der: ZERO, domain: 'all' }
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
      if (op === '^' && r.val.lo === 0.5 && r.val.hi === 0.5 && isZero(r.der))
        return visit(
          {
            kind: 'call',
            name: 'sqrt',
            args: [n.kind === 'binary' ? n.left : n.args[0]],
          },
          depth + 1,
        )
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
