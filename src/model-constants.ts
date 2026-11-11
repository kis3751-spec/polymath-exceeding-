import type { Project } from './models'
import { normalizeEquationSource } from './engine/source-statements'
function normalized(project: Project) {
  try {
    return normalizeEquationSource(
      project.source,
      project.parameters.map((p) => p.name),
    )
  } catch {
    return project.source
  }
}
export function numericConstants(source: string) {
  let table = false
  const list: { name: string; value: number }[] = []
  for (const raw of source.split('\n')) {
    const line = raw.split('#')[0].trim()
    if (line === '[') {
      table = true
      continue
    }
    if (line === ']') {
      table = false
      continue
    }
    if (table) continue
    const m =
      /^([A-Za-z][A-Za-z0-9_]*)\s*=\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)$/.exec(
        line,
      )
    if (m && Number.isFinite(Number(m[2])))
      list.push({ name: m[1], value: Number(m[2]) })
  }
  return list
}
export function defaultParameterRange(value: number) {
  const span = Math.max(Math.abs(value), 1)
  const min = Math.max(-Number.MAX_VALUE / 4, value - span),
    max = Math.min(Number.MAX_VALUE / 4, value + span)
  if (!(min < max)) return { min: -1, max: 1, step: 0.02 }
  return { min, max, step: Number(((max - min) / 100).toPrecision(4)) }
}
/** Numeric definitions consumed by another equation are designated constants.
 * A standalone x=2 remains an equation; the solver grammar is unchanged. */
export function withAutomaticConstants(project: Project): Project {
  const source = normalized(project)
  const constants = numericConstants(source)
  const candidates = constants.filter((c) => {
    if (
      ['e', 'pi'].includes(c.name) ||
      constants.filter((p) => p.name === c.name).length !== 1
    )
      return false
    return source.split('\n').some((raw) => {
      const line = raw.split('#')[0].trim()
      if (!line || numericConstants(line).some((p) => p.name === c.name))
        return false
      return new RegExp(`\\b${c.name}\\b`).test(line)
    })
  })
  let parameters = project.parameters.filter(
    (p) => !p.autoConstant || candidates.some((c) => c.name === p.name),
  )
  for (const c of candidates) {
    const existing = parameters.find((p) => p.name === c.name)
    if (existing?.autoConstant && existing.definitionValue !== c.value) {
      parameters = parameters.map((p) =>
        p === existing
          ? {
              ...p,
              value: c.value,
              definitionValue: c.value,
              min: Math.min(p.min, c.value),
              max: Math.max(p.max, c.value),
            }
          : p,
      )
    }
    if (!existing && parameters.length < 24)
      parameters = [
        ...parameters,
        {
          id: `constant-${c.name}`,
          name: c.name,
          value: c.value,
          ...defaultParameterRange(c.value),
          autoConstant: true,
          definitionValue: c.value,
        },
      ]
  }
  const sweepName = parameters.some(
    (p) => p.name === project.sweepName && !p.hidden,
  )
    ? project.sweepName
    : (parameters.find((p) => !p.hidden)?.name ?? '')
  if (
    JSON.stringify(parameters) === JSON.stringify(project.parameters) &&
    sweepName === project.sweepName
  )
    return project
  return { ...project, parameters, sweepName }
}
/** Remove only the literal definition already represented by an explicit UI
 * parameter; all other equations, helpers and conditions remain untouched. */
export function parameterizedSource(project: Project) {
  const source = normalized(project)
  const definitions = numericConstants(source)
  const names = new Set(
    project.parameters
      .filter((p) => definitions.filter((c) => c.name === p.name).length === 1)
      .map((p) => p.name),
  )
  if (!names.size) return project.source
  return source
    .split('\n')
    .map((line) => {
      const c = numericConstants(line)[0]
      return c && names.has(c.name)
        ? `# Fixed parameter definition: ${line}`
        : line
    })
    .join('\n')
}
