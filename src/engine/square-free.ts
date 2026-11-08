// Exact integer polynomial GCD on the decimal representation of Float64
// coefficients. This removes repeated factors of the coefficient polynomial;
// the original expression remains the final authority for domain/residuals.
const abs = (n: bigint) => (n < 0n ? -n : n)
const gcd = (a: bigint, b: bigint): bigint => {
  a = abs(a)
  b = abs(b)
  while (b) {
    ;[a, b] = [b, a % b]
  }
  return a
}
function trim(a: bigint[]) {
  while (a.length > 1 && a.at(-1) === 0n) a.pop()
  return a
}
function primitive(a: bigint[]) {
  trim(a)
  let g = 0n
  for (const c of a) g = gcd(g, c)
  if (!g) return [0n]
  if (a.at(-1)! < 0n) g = -g
  return a.map((c) => c / g)
}
function limited(a: bigint[]) {
  if (a.some((c) => abs(c).toString(2).length > 32768))
    throw new Error('gcd budget')
  return a
}
function remainder(a: bigint[], b: bigint[]) {
  a = [...a]
  while (a.length >= b.length && a.some((c) => c !== 0n)) {
    const c = a.at(-1)!,
      lead = b.at(-1)!,
      d = a.length - b.length
    a = a.map((v) => v * lead)
    b.forEach((v, i) => (a[i + d] -= v * c))
    a = primitive(limited(a))
  }
  return a
}
export function squareFreeCoefficients(
  coefficients: number[],
): number[] | undefined {
  if (
    coefficients.length < 5 ||
    coefficients.length > 13 ||
    !coefficients.every(Number.isFinite)
  )
    return undefined
  try {
    const parts = coefficients.map((n) => {
      const [mantissa, exponent = '0'] = n.toString().split('e')
      const places = (mantissa.split('.')[1] ?? '').length
      return {
        n: BigInt(mantissa.replace('.', '')),
        e: Number(exponent) - places,
      }
    })
    const min = Math.min(...parts.map((p) => p.e))
    const original = primitive(parts.map((p) => p.n * 10n ** BigInt(p.e - min)))
    let a = original,
      b = primitive(original.slice(1).map((v, i) => v * BigInt(i + 1)))
    while (b.some((c) => c !== 0n)) {
      const r = remainder(a, b)
      a = b
      b = r
    }
    const divisor = primitive(a)
    if (divisor.length <= 1) return undefined
    let r = [...original],
      q = Array<bigint>(original.length - divisor.length + 1).fill(0n)
    while (r.length >= divisor.length && r.some((c) => c !== 0n)) {
      const lead = divisor.at(-1)!,
        c = r.at(-1)!,
        d = r.length - divisor.length
      q = q.map((v) => v * lead)
      q[d] += c
      r = r.map((v) => v * lead)
      divisor.forEach((v, i) => (r[i + d] -= c * v))
      trim(limited(r))
      limited(q)
    }
    if (r.some((c) => c !== 0n)) return undefined
    q = primitive(q)
    const digits = Math.max(...q.map((v) => abs(v).toString().length))
    const out = q.map((v) => {
      if (!v) return 0
      const text = abs(v).toString()
      return (
        (v < 0n ? -1 : 1) *
        Number(text.slice(0, 16)) *
        10 ** (text.length - Math.min(16, text.length) - digits)
      )
    })
    return out.every(Number.isFinite) &&
      out.every((v, i) => v !== 0 || q[i] === 0n)
      ? out
      : undefined
  } catch {
    return undefined
  }
}
