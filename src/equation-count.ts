import { isNonlinearFunction } from './engine/nonlinear-parser'

/** Count the same equation/metadata roles accepted by the model parser. */
export function countEquations(source: string, nonlinear: boolean) {
  const lines = source
    .split('\n')
    .map((line) => line.split('#')[0].trim())
    .filter(Boolean)
  const isCondition = (line: string) => {
    const match = /^([A-Za-z][A-Za-z0-9_]*)\(\s*(min|max|0)\s*\)\s*=/.exec(line)
    return Boolean(match && !isNonlinearFunction(match[1]))
  }
  const isRoot = (line: string) =>
    !isCondition(line) && /^f\(\s*[A-Za-z][A-Za-z0-9_]*\s*\)\s*=/.test(line)
  return nonlinear && lines.some(isRoot)
    ? lines.filter(isRoot).length
    : lines.filter((line) => !isCondition(line)).length
}
