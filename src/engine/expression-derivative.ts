import type { NonlinearNode } from './nonlinear-parser'
export type Dual = { value: number; derivative: number }
/** Forward-mode differentiation of the existing safe AST, without executing source text.
 * Undefined means a domain boundary, a non-smooth point, or arithmetic overflow. */
export function evaluateDual(
  node: NonlinearNode,
  environment: Map<string, Dual>,
): Dual | undefined {
  const make = (value: number, derivative: number): Dual | undefined =>
    Number.isFinite(value) && Number.isFinite(derivative)
      ? { value, derivative }
      : undefined
  const power = (a: Dual, b: Dual) => {
    const value = a.value ** b.value
    if (b.derivative === 0) {
      if (b.value === 0) return make(value, 0)
      return make(value, b.value * a.value ** (b.value - 1) * a.derivative)
    }
    return a.value > 0
      ? make(
          value,
          value *
            (b.derivative * Math.log(a.value) +
              (b.value * a.derivative) / a.value),
        )
      : undefined
  }
  if (node.kind === 'number') return make(node.value, 0)
  if (node.kind === 'name') return environment.get(node.name)
  if (node.kind === 'unary') {
    const a = evaluateDual(node.child, environment)
    return a
      ? make(
          node.sign === '-' ? -a.value : a.value,
          node.sign === '-' ? -a.derivative : a.derivative,
        )
      : undefined
  }
  if (node.kind === 'binary') {
    const a = evaluateDual(node.left, environment),
      b = evaluateDual(node.right, environment)
    if (!a || !b) return undefined
    if (node.operator === '+')
      return make(a.value + b.value, a.derivative + b.derivative)
    if (node.operator === '-')
      return make(a.value - b.value, a.derivative - b.derivative)
    if (node.operator === '*')
      return make(
        a.value * b.value,
        a.derivative * b.value + a.value * b.derivative,
      )
    if (node.operator === '/')
      return make(
        a.value / b.value,
        (a.derivative - (a.value / b.value) * b.derivative) / b.value,
      )
    return power(a, b)
  }
  const args = node.args.map((a) => evaluateDual(a, environment))
  if (args.some((a) => !a)) return undefined
  const a = args[0]!,
    b = args[1]
  if (node.name === 'pow') return power(a, b!)
  if (node.name === 'min' || node.name === 'max') {
    if (a.value === b!.value)
      return a.derivative === b!.derivative ? a : undefined
    return (node.name === 'min' ? a.value < b!.value : a.value > b!.value)
      ? a
      : b
  }
  let value: number, slope: number
  switch (node.name) {
    case 'sin':
      value = Math.sin(a.value)
      slope = Math.cos(a.value)
      break
    case 'cos':
      value = Math.cos(a.value)
      slope = -Math.sin(a.value)
      break
    case 'tan':
      value = Math.tan(a.value)
      slope = 1 / Math.cos(a.value) ** 2
      break
    case 'asin':
      value = Math.asin(a.value)
      slope = 1 / Math.sqrt(1 - a.value * a.value)
      break
    case 'acos':
      value = Math.acos(a.value)
      slope = -1 / Math.sqrt(1 - a.value * a.value)
      break
    case 'atan':
      value = Math.atan(a.value)
      slope = 1 / (1 + a.value * a.value)
      break
    case 'sinh':
      value = Math.sinh(a.value)
      slope = Math.cosh(a.value)
      break
    case 'cosh':
      value = Math.cosh(a.value)
      slope = Math.sinh(a.value)
      break
    case 'tanh':
      value = Math.tanh(a.value)
      slope = 1 - value * value
      break
    case 'exp':
      value = Math.exp(a.value)
      slope = value
      break
    case 'ln':
      value = Math.log(a.value)
      slope = 1 / a.value
      break
    case 'log':
    case 'log10':
      value = Math.log10(a.value)
      slope = 1 / a.value / Math.LN10
      break
    case 'sqrt':
      value = Math.sqrt(a.value)
      slope = 1 / (2 * value)
      break
    case 'abs':
      if (a.value === 0) return undefined
      value = Math.abs(a.value)
      slope = Math.sign(a.value)
      break
    default:
      return undefined
  }
  return make(value, slope * a.derivative)
}
