import { ModelError } from '../index'
import {
  parseNonlinearExpression,
  evaluateNonlinearExpression,
  isNonlinearFunction,
} from '../nonlinear-parser'

export function compileExpression(text: string, line = 1) {
  const expression = parseNonlinearExpression(text, line)
  return {
    references: expression.references,
    evaluate(scope: Record<string, number>) {
      return evaluateNonlinearExpression(
        expression,
        new Map([['pi', Math.PI], ['e', Math.E], ...Object.entries(scope)]),
      )
    },
  }
}

/** Order-independent explicit helper equations; externally adjusted constants
 * replace numeric definitions, never state variables or derived expressions. */
export function compileAssignments(
  lines: string[],
  options: { reserved?: string[]; parameters?: Record<string, number> } = {},
) {
  const defs = new Map<string, ReturnType<typeof compileExpression>>()
  const overrides = options.parameters ?? {}
  for (const [i, raw] of lines.entries()) {
    const text = raw.split('#')[0].trim()
    if (!text) continue
    const m = /^([A-Za-z][A-Za-z0-9_]*)\s*=\s*(.+)$/.exec(text)
    if (!m)
      throw new ModelError('보조식은 이름 = 수식 형태로 입력하세요.', i + 1)
    const name = m[1]
    if (
      defs.has(name) ||
      options.reserved?.includes(name) ||
      isNonlinearFunction(name) ||
      ['pi', 'e'].includes(name)
    )
      throw new ModelError(
        `중복되거나 사용할 수 없는 보조식 이름 '${name}'입니다.`,
        i + 1,
      )
    const expression = compileExpression(m[2], i + 1)
    if (Object.hasOwn(overrides, name) && expression.references.size === 0) {
      if (!Number.isFinite(overrides[name]))
        throw new ModelError('파라미터는 유한한 숫자여야 합니다.')
      defs.set(name, compileExpression(String(overrides[name]), i + 1))
    } else defs.set(name, expression)
  }
  const order: string[] = [],
    visited = new Set<string>(),
    active = new Set<string>()
  const walk = (name: string) => {
    if (visited.has(name)) return
    if (active.has(name))
      throw new ModelError(`보조식 '${name}'에 순환 참조가 있습니다.`)
    active.add(name)
    for (const dep of defs.get(name)!.references) if (defs.has(dep)) walk(dep)
    active.delete(name)
    visited.add(name)
    order.push(name)
  }
  for (const name of defs.keys()) walk(name)
  return {
    names: order,
    evaluate(scope: Record<string, number> = {}) {
      const values = { ...scope }
      for (const name of order) values[name] = defs.get(name)!.evaluate(values)
      return values
    },
  }
}
