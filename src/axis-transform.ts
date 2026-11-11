import { compileExpression } from './engine/scientific/expression'
import type { ScientificSeries } from './engine/scientific/types'

export type AxisTransform = { x: string; y: string }
export const DEFAULT_AXES: AxisTransform = { x: 'x', y: 'y' }
export const identityAxes = (axes: AxisTransform) =>
  axes.x.trim() === 'x' && axes.y.trim() === 'y'
export function compileAxes(axes: AxisTransform) {
  const compile = (text: string) => {
    if (!text.trim() || text.length > 512)
      throw Error('축 수식은 1~512자로 입력하세요.')
    const expression = compileExpression(text)
    for (const name of expression.references)
      if (!['x', 'y', 'pi', 'e'].includes(name))
        throw Error(`'${name}' 대신 원래 좌표를 뜻하는 x, y를 사용하세요.`)
    return expression
  }
  const x = compile(axes.x),
    y = compile(axes.y)
  return (rawX: number, rawY: number): [number, number] => {
    if (!Number.isFinite(rawX) || !Number.isFinite(rawY)) return [NaN, NaN]
    try {
      const scope = { x: rawX, y: rawY }
      const a = x.evaluate(scope),
        b = y.evaluate(scope)
      return Number.isFinite(a) && Number.isFinite(b) ? [a, b] : [NaN, NaN]
    } catch {
      return [NaN, NaN]
    }
  }
}
export function transformSeries(
  series: ScientificSeries[],
  axes: AxisTransform,
) {
  const transform = compileAxes(axes)
  return series.map((s) => {
    const pairs = s.x.map((x, i) => transform(x, s.y[i]))
    return { ...s, x: pairs.map((p) => p[0]), y: pairs.map((p) => p[1]) }
  })
}
