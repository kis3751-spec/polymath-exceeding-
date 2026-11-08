import type { Project } from './models'
import { normalizeAutomaticModel } from './engine/automatic'
import {
  parseNonlinearExpression,
  type NonlinearNode as Node,
} from './engine/nonlinear-parser'
import { nodeText } from './engine/search-analysis'
import { normalizeEquationSource } from './engine/source-statements'

/** Show saved formula wrappers as ordinary equalities, preserving anchors. */
export function equationProject(project: Project): Project {
  if (project.mode !== 'nonlinear') return project
  try {
    const params = project.parameters.map((p) => p.name)
    const lines = normalizeEquationSource(project.source, params).split('\n')
    if (lines.some((l) => /^\s*f\d+\s*(?:\([^)]*\))?\s*=/.test(l)))
      return project
    const root = /^\s*f\(\s*([A-Za-z][A-Za-z0-9_]*)\s*\)\s*=\s*(.+)$/
    const roots = lines.map((l) => {
      const m = root.exec(l.split('#')[0].trim())
      return m && !['min', 'max'].includes(m[1]) ? m : null
    })
    if (!roots.some(Boolean)) return project
    const rootNames = new Set(roots.flatMap((r) => (r ? [r[1]] : [])))
    const helpers = new Map<string, Node>(),
      helperRows = new Set<number>()
    lines.forEach((l, i) => {
      const m = /^\s*([A-Za-z][A-Za-z0-9_]*)\s*=\s*(.+)$/.exec(l.split('#')[0])
      if (m && !rootNames.has(m[1]) && !params.includes(m[1])) {
        if (helpers.has(m[1])) throw new Error('duplicate helper')
        helpers.set(m[1], parseNonlinearExpression(m[2]).node)
        helperRows.add(i)
      }
    })
    const active = new Set<string>()
    let visits = 0
    const expand = (n: Node, depth = 0): Node => {
      if (depth > 128 || ++visits > 10000) throw new Error('expansion limit')
      if (n.kind === 'name' && helpers.has(n.name)) {
        if (active.has(n.name)) throw new Error('cyclic helper')
        active.add(n.name)
        const r = expand(helpers.get(n.name)!, depth + 1)
        active.delete(n.name)
        return r
      }
      if (n.kind === 'binary')
        return {
          ...n,
          left: expand(n.left, depth + 1),
          right: expand(n.right, depth + 1),
        }
      if (n.kind === 'unary') return { ...n, child: expand(n.child, depth + 1) }
      if (n.kind === 'call')
        return { ...n, args: n.args.map((a) => expand(a, depth + 1)) }
      return n
    }
    const source = lines
      .map((line, i) => {
        if (helperRows.has(i)) return `# ${line.trim()}`
        if (!roots[i]) return line
        const n = expand(parseNonlinearExpression(roots[i]![2]).node)
        return n.kind === 'binary' && n.operator === '-'
          ? `${nodeText(n.left)} = ${nodeText(n.right)}`
          : `${nodeText(n)} = 0`
      })
      .join('\n')
    if (source.length > 30000) return project
    const variables = normalizeAutomaticModel(source, params).variables
    if (
      variables.length !== rootNames.size ||
      variables.some((v) => !rootNames.has(v))
    )
      return project
    const reorder = (anchor: NonNullable<Project['selectedAnchor']>) => {
      if (
        anchor.variables.length !== variables.length ||
        variables.some((v) => !anchor.variables.includes(v))
      )
        return anchor
      return {
        ...anchor,
        variables: [...variables],
        values: variables.map(
          (v) => anchor.values[anchor.variables.indexOf(v)],
        ),
      }
    }
    return {
      ...project,
      source,
      selectedAnchor: project.selectedAnchor
        ? reorder(project.selectedAnchor)
        : undefined,
      simulations: project.simulations?.map(reorder),
    }
  } catch {
    // Invalid drafts remain editable; never erase them during migration.
    return project
  }
}
