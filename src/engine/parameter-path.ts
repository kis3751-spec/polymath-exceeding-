import {
  evaluateIntervalJet,
  containsZero as intervalContainsZero,
} from './interval-arithmetic'
import type { NonlinearNode } from './nonlinear-parser'

type Node = NonlinearNode
type Interval = [number, number] | null
type PolyCoeffs = Node[] // ascending degree: [c_0(p), c_1(p), ..., c_d(p)]

const MAX_DEGREE = 12
const number = (value: number): Node => ({ kind: 'number', value })
const zero = (node: Node) => node.kind === 'number' && node.value === 0
const binary = (
  operator: '+' | '-' | '*' | '/' | '^',
  left: Node,
  right: Node,
): Node => {
  if (left.kind === 'number' && right.kind === 'number') {
    const value =
      operator === '+'
        ? left.value + right.value
        : operator === '-'
          ? left.value - right.value
          : operator === '*'
            ? left.value * right.value
            : operator === '/'
              ? left.value / right.value
              : left.value ** right.value
    if (Number.isFinite(value)) return number(value)
  }
  if (operator === '*' && (zero(left) || zero(right))) return number(0)
  if ((operator === '+' || operator === '-') && zero(right)) return left
  if (operator === '+' && zero(left)) return right
  return { kind: 'binary', operator, left, right }
}
const containsZero = (value: [number, number]) => value[0] <= 0 && value[1] >= 0

function trimPoly(coeffs: Node[]): PolyCoeffs {
  const out = [...coeffs]
  while (out.length > 1 && zero(out.at(-1)!)) out.pop()
  return out
}

function addPoly(a: PolyCoeffs, b: PolyCoeffs, sign: 1 | -1): PolyCoeffs {
  const len = Math.max(a.length, b.length)
  const out: Node[] = []
  for (let i = 0; i < len; i++) {
    const ca = a[i] ?? number(0)
    const cb = b[i] ?? number(0)
    out.push(sign === 1 ? binary('+', ca, cb) : binary('-', ca, cb))
  }
  return trimPoly(out)
}

function mulPoly(a: PolyCoeffs, b: PolyCoeffs): PolyCoeffs | null {
  const degA = a.length - 1
  const degB = b.length - 1
  if (degA + degB > MAX_DEGREE) return null
  const out: Node[] = Array.from({ length: degA + degB + 1 }, () => number(0))
  for (let i = 0; i <= degA; i++) {
    if (zero(a[i])) continue
    for (let j = 0; j <= degB; j++) {
      if (zero(b[j])) continue
      out[i + j] = binary('+', out[i + j], binary('*', a[i], b[j]))
    }
  }
  return trimPoly(out)
}

/** Domain checks for algebraic parameter denominators and degenerate parameter
 * poles (such as x = 1/p, x = 1/(p-0.1)^2, p*x = 1, or (p*x - 1)^3 = 0).
 * Higher-order polynomials with a surviving lower-degree term (such as
 * p*x^3 + x = 1 at p = 0) are NOT blocked because c_1(0) = 1 != 0. */
export function createParameterPathValidator(
  expression: Node,
  variable: string,
  helpers: Map<string, Node>,
) {
  const literal = (node: Node): number | undefined =>
    node.kind === 'number'
      ? node.value
      : node.kind === 'unary'
        ? (literal(node.child) ?? NaN) * (node.sign === '-' ? -1 : 1)
        : undefined
  const denominators: Node[] = []
  const visited = new Set<Node>()
  const collect = (node: Node, depth = 0) => {
    if (depth > 256 || visited.has(node)) return
    visited.add(node)
    if (node.kind === 'name') {
      const helper = helpers.get(node.name)
      if (helper) collect(helper, depth + 1)
    } else if (node.kind === 'unary') collect(node.child, depth + 1)
    else if (node.kind === 'binary') {
      if (node.operator === '/') denominators.push(node.right)
      if (node.operator === '^' && (literal(node.right) ?? NaN) < 0)
        denominators.push(node.left)
      collect(node.left, depth + 1)
      collect(node.right, depth + 1)
    } else if (node.kind === 'call') {
      if (node.name === 'tan')
        denominators.push({ kind: 'call', name: 'cos', args: [node.args[0]] })
      if (
        node.name === 'pow' &&
        node.args[1] &&
        (literal(node.args[1]) ?? NaN) < 0
      )
        denominators.push(node.args[0])
      node.args.forEach((child) => collect(child, depth + 1))
    }
  }
  collect(expression)

  const polyActive = new Set<string>()
  const asPolyInVar = (node: Node, depth = 0): PolyCoeffs | null => {
    if (depth > 256) return null
    if (node.kind === 'number') return [node]
    if (node.kind === 'name') {
      if (node.name === variable) return [number(0), number(1)]
      const helper = helpers.get(node.name)
      if (!helper) return [node]
      if (polyActive.has(node.name)) return null
      polyActive.add(node.name)
      const result = asPolyInVar(helper, depth + 1)
      polyActive.delete(node.name)
      return result
    }
    if (node.kind === 'unary') {
      const child = asPolyInVar(node.child, depth + 1)
      if (!child) return null
      return node.sign === '+'
        ? child
        : child.map((c) => binary('*', number(-1), c))
    }
    if (node.kind === 'binary') {
      const left = asPolyInVar(node.left, depth + 1)
      const right = asPolyInVar(node.right, depth + 1)
      if (!left || !right) return null
      if (node.operator === '+') return addPoly(left, right, 1)
      if (node.operator === '-') return addPoly(left, right, -1)
      if (node.operator === '*') return mulPoly(left, right)
      if (node.operator === '/') {
        if (right.length !== 1) return null
        return left.map((c) => binary('/', c, right[0]))
      }
      if (
        node.operator === '^' &&
        right.length === 1 &&
        right[0].kind === 'number'
      ) {
        const exp = right[0].value
        if (exp === 0) return [number(1)]
        if (exp === 1) return left
        if (left.length === 1) return [node]
        if (Number.isInteger(exp) && exp > 1 && exp <= MAX_DEGREE) {
          let acc: PolyCoeffs | null = [number(1)]
          for (let i = 0; i < exp && acc; i++) acc = mulPoly(acc, left)
          return acc
        }
      }
      return null
    }
    if (node.kind === 'call') {
      const args = node.args.map((child) => asPolyInVar(child, depth + 1))
      return args.every((child) => child && child.length === 1) ? [node] : null
    }
    return null
  }
  const poly = asPolyInVar(expression)

  return (
    from: Record<string, number>,
    to: Record<string, number>,
  ): boolean => {
    const active = new Set<string>()
    const interval = (node: Node, depth = 0): Interval => {
      if (depth > 256) return null
      const finite = (values: number[]): Interval =>
        values.every(Number.isFinite)
          ? [Math.min(...values), Math.max(...values)]
          : null
      if (node.kind === 'number') return finite([node.value])
      if (node.kind === 'name') {
        if (node.name === variable) return null
        if (Object.hasOwn(from, node.name) && Object.hasOwn(to, node.name))
          return finite([from[node.name], to[node.name]])
        if (node.name === 'pi') return [Math.PI, Math.PI]
        if (node.name === 'e') return [Math.E, Math.E]
        const helper = helpers.get(node.name)
        if (!helper || active.has(node.name)) return null
        active.add(node.name)
        const result = interval(helper, depth + 1)
        active.delete(node.name)
        return result
      }
      if (node.kind === 'unary') {
        const child = interval(node.child, depth + 1)
        return child && (node.sign === '+' ? child : [-child[1], -child[0]])
      }
      const power = (
        base: [number, number],
        exponent: [number, number],
      ): Interval => {
        const n = exponent[0]
        if (n !== exponent[1] || !Number.isInteger(n) || Math.abs(n) > 12)
          return null
        if (n < 0 && containsZero(base)) return null
        const values = [base[0] ** n, base[1] ** n]
        if (n > 0 && n % 2 === 0 && containsZero(base)) values.push(0)
        return finite(values)
      }
      if (node.kind === 'call') {
        if (node.name !== 'pow') return null
        const base = interval(node.args[0], depth + 1)
        const exponent = interval(node.args[1], depth + 1)
        return base && exponent ? power(base, exponent) : null
      }
      const left = interval(node.left, depth + 1)
      const right = interval(node.right, depth + 1)
      if (!left || !right) return null
      if (node.operator === '+')
        return finite([left[0] + right[0], left[1] + right[1]])
      if (node.operator === '-')
        return finite([left[0] - right[1], left[1] - right[0]])
      if (node.operator === '*')
        return finite([
          left[0] * right[0],
          left[0] * right[1],
          left[1] * right[0],
          left[1] * right[1],
        ])
      if (node.operator === '/')
        return containsZero(right)
          ? null
          : finite([
              left[0] / right[0],
              left[0] / right[1],
              left[1] / right[0],
              left[1] / right[1],
            ])
      if (node.operator === '^') return power(left, right)
      return null
    }
    // Enclose the complete straight parameter path. A parameter-only
    // denominator must be proven nonzero; unsupported evaluation cannot approve it.
    const dependsOnVariable = (
      node: Node,
      seen = new Set<string>(),
    ): boolean => {
      if (node.kind === 'name') {
        if (node.name === variable) return true
        const helper = helpers.get(node.name)
        if (!helper || seen.has(node.name)) return false
        seen.add(node.name)
        return dependsOnVariable(helper, seen)
      }
      if (node.kind === 'unary') return dependsOnVariable(node.child, seen)
      if (node.kind === 'binary')
        return (
          dependsOnVariable(node.left, new Set(seen)) ||
          dependsOnVariable(node.right, new Set(seen))
        )
      return (
        node.kind === 'call' &&
        node.args.some((n) => dependsOnVariable(n, new Set(seen)))
      )
    }
    const pathConstants = Object.fromEntries(
      Object.keys(from).map((name) => [
        name,
        {
          lo: Math.min(from[name], to[name]),
          hi: Math.max(from[name], to[name]),
        },
      ]),
    )
    for (const denominator of denominators) {
      if (dependsOnVariable(denominator)) continue
      const jet = evaluateIntervalJet(
        denominator,
        '__path_coordinate',
        { lo: 0, hi: 0 },
        pathConstants,
        helpers,
      )
      if (jet.domain !== 'all' || jet.issue || intervalContainsZero(jet.val))
        return false
    }
    // Check if ALL non-constant coefficients c_1(p)...c_d(p) can vanish in [from, to]
    // while the constant term c_0(p) stays strictly non-zero (e.g. p*x = 1, (p*x - 1)^3 = 0).
    // For p*x^3 + x = 1, c_1(p) = [1, 1] does NOT contain 0, so it remains safe!
    if (poly && poly.length > 1) {
      const c0 = interval(poly[0])
      const higher = poly.slice(1).map((c) => interval(c))
      if (
        c0 &&
        !containsZero(c0) &&
        higher.every((r) => r !== null && containsZero(r))
      ) {
        return false
      }
    }
    return true
  }
}
