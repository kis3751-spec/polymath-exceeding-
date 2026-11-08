import { normalizeMathCharacters } from './engine/source-statements'

/** Clipboard plain text only. Remove an enclosing code fence, preserving deliberate blank lines. */
export function normalizeEquationPaste(text: string) {
  text = normalizeMathCharacters(text)
  const fence = /^\s*```[^\n]*\n([\s\S]*?)\n```\s*$/.exec(text)
  text = fence ? fence[1] : text
  const lines = text.split('\n')
  const nonempty = lines.flatMap((line, i) => (line.trim() ? [i] : []))
  // Some rich-text code blocks duplicate every line break. Do not remove ordinary paragraph gaps.
  if (
    nonempty.length >= 3 &&
    nonempty.slice(1).every((index, i) => index - nonempty[i] === 2)
  )
    return lines.filter((line) => line.trim()).join('\n')
  return text
}
