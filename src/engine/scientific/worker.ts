/// <reference lib="webworker" />
import type { ScientificRequest } from './types'
import { solveOde } from './ode'
import { solveFitting } from './fitting'
import { solveIntegration } from './integration'
import { solveOptimization } from './optimization'
self.onmessage = async ({
  data,
}: MessageEvent<ScientificRequest & { id: number }>) => {
  const { id, ...request } = data
  try {
    let result
    if (request.module === 'ode') result = solveOde(request)
    else if (
      ['curve-fit', 'multilinear', 'nonlinear-fit'].includes(request.module)
    )
      result = solveFitting(request)
    else if (request.module === 'integration')
      result = solveIntegration(request)
    else if (request.module === 'optimization' || request.module === 'lsq')
      result = solveOptimization(request)
    else throw new Error('지원하지 않는 계산 도구입니다.')
    self.postMessage({ id, ok: true, result })
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error:
        error instanceof Error ? error.message : '계산을 완료하지 못했습니다.',
    })
  }
}
