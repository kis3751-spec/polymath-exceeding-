import type { SolveResult } from './index'

// An internal, process-local hint from the existing bounded-degree polynomial
// isolator. It is not serialized as a mathematical completeness certificate.
// Generic correctors and unverified candidates never receive this hint.
const uniquePolynomialRoots = new WeakSet<SolveResult>()

export function markUniquePolynomialRoot(result: SolveResult): SolveResult {
  uniquePolynomialRoots.add(result)
  return result
}

export function isUniquePolynomialRoot(result: SolveResult): boolean {
  return uniquePolynomialRoots.has(result)
}
