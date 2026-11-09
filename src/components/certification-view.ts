import { diagnosticModel } from '../engine/automatic'
import { nextDown, nextUp, type Interval } from '../engine/interval-arithmetic'
import type { RootCertificate } from '../engine/interval-certification'

/** Never display another model's proof while the next worker request is pending. */
export function currentCertificate(
  certificate: RootCertificate | null | undefined,
  source: string,
  parameters: Record<string, number>,
): RootCertificate | undefined {
  if (!certificate?.model) return undefined
  const stored = certificate.model.parameters
  const names = Object.keys(parameters)
  if (
    Object.keys(stored).length !== names.length ||
    names.some(
      (name) =>
        !Object.hasOwn(stored, name) || stored[name] !== parameters[name],
    )
  )
    return undefined
  try {
    return diagnosticModel(source, names).source === certificate.model.source
      ? certificate
      : undefined
  } catch {
    return undefined
  }
}

/** Display outward rounded percentage endpoints. A result near one must not
 * silently become a statement of exactly 100%. */
export function probabilityBoundsText(bounds?: Interval): string | undefined {
  if (
    !bounds ||
    !Number.isFinite(bounds.lo) ||
    !Number.isFinite(bounds.hi) ||
    bounds.lo > bounds.hi ||
    bounds.hi < 0 ||
    bounds.lo > 1
  )
    return undefined
  const lo = Math.max(0, bounds.lo),
    hi = Math.min(1, bounds.hi)
  if (lo === 0 && hi === 0) return '0%'
  if (lo === 1 && hi === 1) return '100%'
  const scale = 10000
  const lower =
    lo === 0
      ? 0
      : Math.max(0, Math.floor(nextDown(nextDown(lo * 100) * scale)) / scale)
  const upper =
    hi === 1
      ? 100
      : Math.min(100, Math.ceil(nextUp(nextUp(hi * 100) * scale)) / scale)
  return `${lower.toFixed(4)}–${upper.toFixed(4)}%`
}

export function certifiedConclusion(c: RootCertificate): {
  complete: boolean
  title: string
  status: string
} {
  if (c.complete && c.allRootsRepresented === true)
    return {
      complete: true,
      title: `구간 내 전체 ${c.uniqueRootCount}개 근 확인`,
      status: '검증 완료',
    }
  if (c.complete)
    return {
      complete: false,
      title: `${c.uniqueRootCount}개 근 구간 확정`,
      status: '표시 결과 대조 필요',
    }
  return {
    complete: false,
    title: `확인된 근 구간 ${c.uniqueRootCount}개`,
    status: `미결정 ${c.unresolved.length}곳`,
  }
}

export type CertificateSegment = Interval & {
  kind: 'root' | 'free' | 'excluded' | 'unresolved'
}

/** These are recorded proof boxes, not root values or a distribution of roots. */
export function certificateSegments(c: RootCertificate): CertificateSegment[] {
  const clip = (
    intervals: readonly Interval[],
    kind: CertificateSegment['kind'],
  ) =>
    intervals
      .map((iv) => ({
        lo: Math.max(c.domain.min, iv.lo),
        hi: Math.min(c.domain.max, iv.hi),
        kind,
      }))
      .filter(
        (iv) =>
          Number.isFinite(iv.lo) && Number.isFinite(iv.hi) && iv.lo <= iv.hi,
      )
  return [
    ...clip(c.rootFreeIntervals ?? [], 'free'),
    ...clip(c.excludedIntervals ?? [], 'excluded'),
    ...clip(c.rootIntervals, 'root'),
    ...clip(c.unresolved, 'unresolved'),
  ]
}
