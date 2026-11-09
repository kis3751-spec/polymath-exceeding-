import { polynomialCoefficients } from './automatic-polynomial'
import type { NonlinearNode as Node } from './nonlinear-parser'
export type Bounds = { min: number; max: number }
export type VariableBounds = Record<string, Bounds>
export type SearchWindow = {
  min: number
  max: number
  maxWidth: number
  requestedMin: number
  requestedMax: number
  reason: 'periodic' | 'density'
  variable: string
}
export const nonsmoothSource = (source: string) =>
  /\b(abs|min|max|floor|ceil|sign)\s*\(/i.test(source)
export function nodeText(n: Node): string {
  if (n.kind === 'number') return String(n.value)
  if (n.kind === 'name') return n.name
  if (n.kind === 'unary') return `(${n.sign}${nodeText(n.child)})`
  if (n.kind === 'call') return `${n.name}(${n.args.map(nodeText).join(',')})`
  return `(${nodeText(n.left)}${n.operator}${nodeText(n.right)})`
}
export function peelZeroPower(n: Node): Node {
  if (n.kind === 'unary') return peelZeroPower(n.child)
  if (
    n.kind === 'binary' &&
    (n.operator === '+' || n.operator === '-') &&
    n.right.kind === 'number' &&
    n.right.value === 0
  )
    return peelZeroPower(n.left)
  if (
    n.kind === 'binary' &&
    n.operator === '^' &&
    n.right.kind === 'number' &&
    Number.isInteger(n.right.value) &&
    n.right.value > 0
  )
    return peelZeroPower(n.left)
  if (
    n.kind === 'call' &&
    n.name === 'pow' &&
    n.args[1].kind === 'number' &&
    Number.isInteger(n.args[1].value) &&
    n.args[1].value > 0
  )
    return peelZeroPower(n.args[0])
  return n
}
/** Multiplicity contributed only by removable outer powers, not powers
 * inside a sum or function argument. Used to disclose zero-set reduction. */
export function zeroPowerMultiplicity(n: Node): number {
  if (n.kind === 'unary') return zeroPowerMultiplicity(n.child)
  if (
    n.kind === 'binary' &&
    ['+', '-'].includes(n.operator) &&
    n.right.kind === 'number' &&
    n.right.value === 0
  )
    return zeroPowerMultiplicity(n.left)
  const base =
    n.kind === 'binary' && n.operator === '^'
      ? n.left
      : n.kind === 'call' && n.name === 'pow'
        ? n.args[0]
        : undefined
  const exponent =
    n.kind === 'binary' ? n.right : n.kind === 'call' ? n.args[1] : undefined
  if (
    base &&
    exponent?.kind === 'number' &&
    Number.isInteger(exponent.value) &&
    exponent.value > 0
  )
    return exponent.value * zeroPowerMultiplicity(base)
  return 1
}
/** A single sin/cos/tan with affine phase and constant affine outer operations. */
export function periodicFamily(
  node: Node,
  variable: string,
  constants: Record<string, number>,
  helpers: Map<string, Node>,
) {
  type Form = { call?: Node & { kind: 'call' }; scale: number; offset: number }
  const active = new Set<string>()
  const visit = (n: Node): Form | undefined => {
    const c = polynomialCoefficients(n, variable, constants, helpers)
    if (c?.length === 1) return { scale: 0, offset: c[0] }
    if (n.kind === 'name' && helpers.has(n.name) && !active.has(n.name)) {
      active.add(n.name)
      const r = visit(helpers.get(n.name)!)
      active.delete(n.name)
      return r
    }
    if (n.kind === 'call' && ['sin', 'cos', 'tan'].includes(n.name))
      return { call: n, scale: 1, offset: 0 }
    if (n.kind === 'unary') {
      const a = visit(n.child)
      return a
        ? {
            ...a,
            scale: a.scale * (n.sign === '-' ? -1 : 1),
            offset: a.offset * (n.sign === '-' ? -1 : 1),
          }
        : undefined
    }
    if (n.kind !== 'binary') return undefined
    const a = visit(n.left),
      b = visit(n.right)
    if (!a || !b || (a.call && b.call)) return undefined
    if (n.operator === '+' || n.operator === '-') {
      const sign = n.operator === '-' ? -1 : 1
      return {
        call: a.call ?? b.call,
        scale: a.scale + sign * b.scale,
        offset: a.offset + sign * b.offset,
      }
    }
    if (n.operator === '*')
      return {
        call: a.call ?? b.call,
        scale: a.call ? a.scale * b.offset : b.scale * a.offset,
        offset: a.offset * b.offset,
      }
    if (n.operator === '/' && !b.call && b.offset !== 0)
      return {
        call: a.call,
        scale: a.scale / b.offset,
        offset: a.offset / b.offset,
      }
    return undefined
  }
  const f = visit(node)
  if (!f?.call || !f.scale || !Number.isFinite(f.scale)) return undefined
  const phase = polynomialCoefficients(
    f.call.args[0],
    variable,
    constants,
    helpers,
  )
  if (phase?.length !== 2 || !phase[1] || !phase.every(Number.isFinite))
    return undefined
  const target = -f.offset / f.scale,
    a = phase[1],
    b = phase[0],
    name = f.call.name
  if (!Number.isFinite(target)) return undefined
  const period = name === 'tan' ? Math.PI : 2 * Math.PI
  const angles =
    name === 'sin'
      ? Math.abs(target) <= 1
        ? [Math.asin(target), Math.PI - Math.asin(target)]
        : []
      : name === 'cos'
        ? Math.abs(target) <= 1
          ? [Math.acos(target), -Math.acos(target)]
          : []
        : [Math.atan(target)]
  const phases = angles.filter(
    (v, i) =>
      angles.findIndex(
        (w) => Math.abs(Math.sin((v - w) / 2)) < 8 * Number.EPSILON,
      ) === i,
  )
  return {
    a,
    b,
    target,
    period,
    phases,
    maxWidth: (28 * Math.PI) / Math.abs(a),
    name,
    residualScale: Math.abs(f.scale),
  }
}
export function periodicWindow(
  f: NonNullable<ReturnType<typeof periodicFamily>>,
  bounds: Bounds,
  variable: string,
): SearchWindow | undefined {
  if (!Number.isFinite(f.maxWidth) || f.maxWidth <= 0) return undefined
  const center = bounds.min / 2 + bounds.max / 2
  const width = Math.min(bounds.max - bounds.min, f.maxWidth)
  const min = center - width / 2,
    max = center + width / 2
  if (
    !Number.isFinite(min) ||
    !Number.isFinite(max) ||
    min === max ||
    Math.max(Math.abs(f.a * min + f.b), Math.abs(f.a * max + f.b)) > 1e8
  )
    return undefined
  return {
    min,
    max,
    maxWidth: f.maxWidth,
    requestedMin: bounds.min,
    requestedMax: bounds.max,
    reason: 'periodic',
    variable,
  }
}
