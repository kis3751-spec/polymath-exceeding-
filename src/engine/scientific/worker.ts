/// <reference lib="webworker" />
import type { ScientificRequest } from './types'
self.onmessage = async ({
  data,
}: MessageEvent<ScientificRequest & { id: number }>) => {
  const { id, ...request } = data
  try {
    let result
    if (request.module === 'ode')
      result = (await import('./ode')).solveOde(request)
    else if (
      ['curve-fit', 'multilinear', 'nonlinear-fit'].includes(request.module)
    )
      result = (await import('./fitting')).solveFitting(request)
    else if (request.module === 'integration')
      result = (await import('./integration')).solveIntegration(request)
    else if (request.module === 'optimization' || request.module === 'lsq')
      result = (await import('./optimization')).solveOptimization(request)
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
