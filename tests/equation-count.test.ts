import { describe, expect, it } from 'vitest'
import { countEquations } from '../src/equation-count'

describe('model equation count', () => {
  it('accepts spaced root declarations while excluding helpers and conditions', () => {
    expect(
      countEquations('k=4\nf( x ) = x^2-k\nx( min ) = 0\nx(max)=3', true),
    ).toBe(1)
    expect(countEquations('f(f) = f^2-4\nf(min)=0\nf(max)=3', true)).toBe(1)
  })
  it('keeps ordinary equalities and function calls rather than inferring helpers', () => {
    expect(countEquations('k=4\nx^2=k', true)).toBe(2)
    expect(countEquations('SIN(0)=x\nmin(x,1)=0.5', true)).toBe(2)
    expect(countEquations('# f(x)=0\nx+y=5\nx-y=1', false)).toBe(2)
  })
})
