import { ModelError } from './index'

const NUMBER = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?'
const numericAssignment = new RegExp(
  `^[A-Za-z][A-Za-z0-9_]*\\s*=\\s*${NUMBER}(?:\\s+\\([^()]*\\))?$`,
)
const unitAnnotation = new RegExp(`^(${NUMBER})\\s+\\(([^()]+)\\)$`)
const units =
  '(?:mol|mmol|kmol|bar|mbar|Pa|kPa|MPa|atm|kg|mg|g|km|cm|mm|m|mL|L|K|J|kJ|cal|W|kW|s|min|h|Hz|V|A|ohm)'
const unitGrammar = new RegExp(
  `^${units}(?:\\^[+-]?\\d+)?(?:[*/·]${units}(?:\\^[+-]?\\d+)?)*$`,
)

export type LogicalStatement = { text: string; line: number }
export function normalizeMathCharacters(source: string) {
  return source
    .replace(/\r\n?/g, '\n')
    .replace(/\u2212/g, '-')
    .replace(/\u00d7/g, '*')
    .replace(/\u00f7/g, '/')
    .replace(/[\u00a0\u202f]/g, ' ')
    .replace(/[\u200b\ufeff]/g, '')
}

/** Split only at top level: function argument commas and conditional operators stay intact. */
function splitTopLevel(text: string, separators: string, line: number) {
  const parts: string[] = []
  let depth = 0,
    start = 0
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '(') depth++
    if (ch === ')' && --depth < 0)
      throw new ModelError('닫는 괄호가 너무 많습니다.', line)
    if (
      depth === 0 &&
      separators.includes(ch) &&
      !(ch === '=' && /[<>=!]/.test(text[i - 1] ?? ''))
    ) {
      parts.push(text.slice(start, i).trim())
      start = i + 1
    }
  }
  if (depth !== 0) throw new ModelError('괄호의 짝을 확인해 주세요.', line)
  parts.push(text.slice(start).trim())
  return parts
}

/** Pure input normalization; general name=value equations retain their unknowns. */
export function logicalStatements(
  source: string,
  parameterNames: readonly string[] = [],
): LogicalStatement[] {
  if (source.length > 30_000)
    throw new ModelError('수식은 30,000자 이내로 입력하세요.')
  source = normalizeMathCharacters(source)
  // A symbol used elsewhere remains a mathematical variable, even if it also names a unit.
  const withoutAnnotations = source.replace(
    new RegExp(`(${NUMBER})\\s+\\([^()]+\\)`, 'g'),
    '$1',
  )
  const symbols = new Set(
    [
      ...parameterNames,
      ...withoutAnnotations.matchAll(/\b[A-Za-z][A-Za-z0-9_]*\b/g),
    ].map((x) => (typeof x === 'string' ? x : x[0])),
  )
  const result: LogicalStatement[] = []
  const definitions = new Set<string>()
  source.split('\n').forEach((raw, index) => {
    const line = index + 1
    if (/^\s*#@/.test(raw)) {
      result.push({ text: raw, line })
      return
    }
    const commentAt = raw.indexOf('#')
    const content = (commentAt < 0 ? raw : raw.slice(0, commentAt)).trim()
    if (!content) {
      result.push({ text: raw, line })
      return
    }
    const firstResult = result.length
    const chunks = splitTopLevel(content, ',;', line)
    for (const [chunkIndex, chunk] of chunks.entries()) {
      if (!chunk && chunkIndex === chunks.length - 1) continue
      if (!chunk) throw new ModelError('구분자 사이에 식을 입력하세요.', line)
      const pieces: string[] = []
      let start = 0,
        depth = 0
      for (let i = 0; i < chunk.length; i++) {
        if (chunk[i] === '(') depth++
        if (chunk[i] === ')') depth--
        if (
          depth === 0 &&
          /\s/.test(chunk[i]) &&
          /^[A-Za-z][A-Za-z0-9_]*\s*=/.test(chunk.slice(i).trimStart()) &&
          numericAssignment.test(chunk.slice(start, i).trim())
        ) {
          pieces.push(chunk.slice(start, i).trim())
          start = i
        }
      }
      pieces.push(chunk.slice(start).trim())
      for (const piece of pieces) {
        const sides = splitTopLevel(piece, '=', line)
        if (sides.length > 1 && sides.some((x) => !x))
          throw new ModelError('등호 양쪽에 수식을 완성해 주세요.', line)
        if (sides.length === 1) {
          result.push({ text: piece, line })
          continue
        }
        let unitStripped = false
        if (sides.length === 2 && /^[A-Za-z][A-Za-z0-9_]*$/.test(sides[0])) {
          const annotation = unitAnnotation.exec(sides[1])
          if (annotation) {
            const unit = annotation[2].replace(/\s/g, '')
            const tokens = unit.match(/[A-Za-z]+/g) ?? []
            if (
              unitGrammar.test(unit) &&
              tokens.every((t) => !symbols.has(t))
            ) {
              sides[1] = annotation[1]
              unitStripped = true
            }
          }
        }
        const name = /^f\d+(?:\(\s*[A-Za-z][A-Za-z0-9_]*\s*\))?$/.test(sides[0])
          ? sides[0].replace(/\s/g, '')
          : undefined
        if (sides.length === 2 && !unitStripped)
          result.push({ text: piece, line })
        else if (sides.length > 2 && name && !definitions.has(name)) {
          result.push({ text: `${sides[0]} = ${sides[1]}`, line })
          for (const target of sides.slice(2))
            result.push({ text: `${sides[0]} = ${target}`, line })
        } else {
          for (const left of sides.slice(0, -1))
            result.push({ text: `${left} = ${sides.at(-1)}`, line })
        }
        if (name) definitions.add(name)
      }
    }
    if (
      result.length === firstResult + 1 &&
      result[firstResult].text === content
    )
      result[firstResult].text = raw
    else if (commentAt >= 0)
      result[result.length - 1].text += ' ' + raw.slice(commentAt)
  })
  if (result.length > 2048)
    throw new ModelError(
      '한 모델에는 최대 2,048개의 입력 행을 사용할 수 있습니다.',
    )
  return result
}
export function normalizeEquationSource(
  source: string,
  parameterNames: readonly string[] = [],
) {
  return logicalStatements(source, parameterNames)
    .map((s) => s.text)
    .join('\n')
}

/** Keep parser diagnostics tied to the user's physical row after expanding a chain/list. */
export function normalizedModelCall<T>(
  source: string,
  parameters: readonly string[],
  run: (normalized: string) => T,
): T {
  const statements = logicalStatements(source, parameters)
  try {
    return run(statements.map((s) => s.text).join('\n'))
  } catch (error) {
    if (error instanceof ModelError && error.line !== undefined)
      error.line = statements[error.line - 1]?.line ?? error.line
    throw error
  }
}
