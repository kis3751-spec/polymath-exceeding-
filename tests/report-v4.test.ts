import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { RootCertificate } from '../src/engine/interval-certification'
import { diagnosticModel } from '../src/engine/automatic'
import CertificationReport from '../src/components/CertificationReport'
import {
  certificateSegments,
  certifiedConclusion,
  currentCertificate,
  probabilityBoundsText,
} from '../src/components/certification-view'

function proof(): RootCertificate {
  return {
    variable: 'x',
    domain: { min: -1, max: 1 },
    model: {
      source: diagnosticModel('x=p', ['p']).source,
      parameters: { p: 0 },
    },
    complete: true,
    allRootsRepresented: true,
    coverageLowerBound: 1,
    uniqueRootCount: 1,
    rootIntervals: [{ lo: -0.01, hi: 0.01 }],
    rootFreeIntervals: [
      { lo: -1, hi: -0.01 },
      { lo: 0.01, hi: 1 },
    ],
    excludedIntervals: [],
    unresolved: [],
    excludedDomainCount: 0,
    processedIntervals: 4,
    budgetExhausted: false,
    elapsedMs: 1,
    completeness: {
      grade: 'certified',
      domainCoverage: 1,
      unresolvedMeasureUpper: 0,
      allRootsFoundProbability: 1,
      rootSensitivities: [],
      gaussianPerturbation: {
        model: 'additive_gaussian_residual',
        sigma: 0.01,
        criticalPointsCertified: true,
        domainRootCountInvarianceBounds: {
          lo: 0.8317946345531823,
          hi: 0.8317946345531825,
        },
        twoSidedSafetyMarginBounds: { lo: 0.5, hi: 0.500001 },
        twoSidedSafetyProbabilityBounds: { lo: 0.6, hi: 0.61 },
      },
    },
  }
}

describe('V4 practical report semantics', () => {
  it('accepts proof metadata only for the current source and exact parameter values', () => {
    const c = proof()
    expect(currentCertificate(c, 'x=p', { p: 0 })).toBe(c)
    expect(currentCertificate(c, 'x=p', { p: 1 })).toBeUndefined()
    expect(currentCertificate(c, '2*x=p', { p: 0 })).toBeUndefined()
    expect(currentCertificate(c, 'x=p', {})).toBeUndefined()
    expect(
      currentCertificate({ ...c, model: undefined }, 'x=p', { p: 0 }),
    ).toBeUndefined()
  })

  it('does not label an unverified result list as all roots found', () => {
    const c = proof()
    expect(certifiedConclusion(c).complete).toBe(true)
    for (const represented of [false, undefined]) {
      const result = certifiedConclusion({
        ...c,
        allRootsRepresented: represented,
      })
      expect(result.complete).toBe(false)
      expect(result.status).toContain('대조')
      expect(result.title).not.toContain('전체')
    }
  })

  it('cannot round a near-one interval into exactly 100 percent', () => {
    expect(probabilityBoundsText({ lo: 1, hi: 1 })).toBe('100%')
    expect(probabilityBoundsText({ lo: 0, hi: 0 })).toBe('0%')
    expect(probabilityBoundsText({ lo: 1 - Number.EPSILON, hi: 1 })).not.toBe(
      '100%',
    )
    for (const p of [0.000001, 0.1, 0.5, 0.8317946345531824, 0.999999]) {
      const text = probabilityBoundsText({ lo: p, hi: p })!
      const [lo, hi] = text.replace('%', '').split('–').map(Number)
      expect(lo).toBeLessThanOrEqual(p * 100)
      expect(hi).toBeGreaterThanOrEqual(p * 100)
    }
    expect(probabilityBoundsText({ lo: NaN, hi: 1 })).toBeUndefined()
    expect(probabilityBoundsText({ lo: 0.8, hi: 0.2 })).toBeUndefined()
  })

  it('labels the probability as a finite-domain conditional noise model', () => {
    const html = renderToStaticMarkup(
      createElement(CertificationReport, {
        certificate: proof(),
        pending: false,
        inputNoiseSigma: 0.01,
      }),
    )
    expect(html).toContain('입력 오차에 따른 근 개수 유지 확률')
    expect(html).toContain('83.1794–83.1795%')
    expect(html).toContain('하나의 일정한 오차')
    expect(html).toContain('미발견 근을 모두 찾았을 확률')
    expect(html).toContain('평균 0, 표준편차 σ')
  })

  it('hides old probability values while sigma is changing or a new request is pending', () => {
    for (const props of [
      { pending: true, inputNoiseSigma: 0.01 },
      { pending: false, inputNoiseSigma: 0.02 },
    ]) {
      const html = renderToStaticMarkup(
        createElement(CertificationReport, { certificate: proof(), ...props }),
      )
      expect(html).not.toContain('83.1794–83.1795%')
      expect(html).not.toContain('0.500001')
    }
  })

  it('keeps unknown probability and unresolved locations explicit', () => {
    const c = proof()
    c.complete = false
    c.allRootsRepresented = false
    c.completeness = undefined
    c.unresolved = [{ lo: 0.3, hi: 0.4, reason: 'domain' }]
    const html = renderToStaticMarkup(
      createElement(CertificationReport, { certificate: c, pending: false }),
    )
    expect(html).toContain('<strong>산정 조건 확인</strong>')
    expect(html).toContain('추가 검증이 필요한 1곳')
    expect(html).toContain('<td>0.3</td>')
    expect(html).toContain('<td>0.4</td>')
  })

  it('clips recorded proof boxes to the actual finite verification domain', () => {
    const c = proof()
    c.excludedIntervals = [{ lo: -3, hi: -0.9 }]
    c.unresolved = [{ lo: 0.4, hi: 2, reason: 'resolution' }]
    const segments = certificateSegments(c)
    expect(segments.every((iv) => iv.lo >= -1 && iv.hi <= 1)).toBe(true)
    expect(new Set(segments.map((iv) => iv.kind))).toEqual(
      new Set(['root', 'free', 'excluded', 'unresolved']),
    )
  })
})
