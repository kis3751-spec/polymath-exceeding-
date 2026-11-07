import type { SolveResult } from './index'

// An internal, process-local hint from the existing bounded-degree polynomial
// isolator, restricted to regular families with polynomial parameter
// coefficients and a fixed nonzero leading term. It is not serialized as a
// mathematical completeness certificate. Parameter-denominator poles, generic
// correctors and unverified candidates never receive this hint.
const uniquePolynomialRoots = new WeakSet<SolveResult>()
export type ParameterPathValidator = (
  from: Record<string, number>,
  to: Record<string, number>,
) => boolean
const parameterPathValidators = new WeakMap<
  SolveResult,
  ParameterPathValidator
>()

export function withParameterPathValidator(
  result: SolveResult,
  validator: ParameterPathValidator,
): SolveResult {
  parameterPathValidators.set(result, validator)
  return result
}

export function isParameterPathSafe(
  result: SolveResult,
  from: Record<string, number>,
  to: Record<string, number>,
): boolean {
  return parameterPathValidators.get(result)?.(from, to) ?? true
}

export function markUniquePolynomialRoot(result: SolveResult): SolveResult {
  uniquePolynomialRoots.add(result)
  return result
}

export function isUniquePolynomialRoot(result: SolveResult): boolean {
  return uniquePolynomialRoots.has(result)
}
