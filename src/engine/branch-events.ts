import type { BranchTerminalEvent } from './index'
import { tangencyLabel } from './tangency'

export const eventLocation = (event: BranchTerminalEvent) =>
  event.tangency?.verified
    ? {
        parameter: event.tangency.parameterStar,
        values: event.tangency.valuesStar,
      }
    : { parameter: event.parameter, values: event.values }

// Compare refined coordinates, not the coarser points where tracking stopped.
// This is presentation/event reconciliation; it never merges computed roots.
function nearCoordinate(a: number, b: number) {
  return (
    a === b ||
    Math.abs(a - b) <=
      8192 *
        Number.EPSILON *
        Math.max(Number.MIN_VALUE, Math.abs(a), Math.abs(b))
  )
}
export function sameVerifiedEvent(
  a: BranchTerminalEvent,
  b: BranchTerminalEvent,
) {
  if (
    !a.tangency?.verified ||
    !b.tangency?.verified ||
    a.tangency.bifurcationOrder !== b.tangency.bifurcationOrder
  )
    return false
  const x = eventLocation(a),
    y = eventLocation(b)
  return (
    nearCoordinate(x.parameter, y.parameter) &&
    x.values.length === y.values.length &&
    x.values.every((v, i) => nearCoordinate(v, y.values[i]))
  )
}
export function uniqueBranchEvents(
  events: readonly BranchTerminalEvent[],
): BranchTerminalEvent[] {
  const result: BranchTerminalEvent[] = []
  for (const event of events) {
    const index = result.findIndex(
      (other) =>
        sameVerifiedEvent(event, other) ||
        (event.kind === other.kind &&
          event.parameter === other.parameter &&
          event.values.length === other.values.length &&
          event.values.every((v, i) => v === other.values[i])),
    )
    if (index < 0) result.push(event)
    else if (
      event.kind === 'merge' ||
      (event.tangency?.verified && !result[index].tangency?.verified)
    )
      result[index] = event
  }
  return result
}
export function branchEventLabel(event: BranchTerminalEvent) {
  const t = event.tangency
  if (t?.verified) return tangencyLabel(t)
  return event.kind === 'merge' ? '근 병합 추정' : '추적 종료'
}
export function branchEventText(
  event: BranchTerminalEvent,
  parameterName: string,
) {
  const location = eventLocation(event)
  return `${branchEventLabel(event)} · ${parameterName || '파라미터'} ≈ ${Number(location.parameter.toPrecision(8))}`
}
