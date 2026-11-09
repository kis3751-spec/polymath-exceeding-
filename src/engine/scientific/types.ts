export type ScientificModule =
  | 'ode'
  | 'curve-fit'
  | 'multilinear'
  | 'nonlinear-fit'
  | 'integration'
  | 'optimization'
  | 'lsq'
export type ScientificOptions = {
  tolerance?: number
  maxIterations?: number
  samples?: number
  degree?: number
  method?: string
}
export type ScientificRequest = {
  module: ScientificModule
  source: string
  parameters?: Record<string, number>
  options?: ScientificOptions
}
export type ScientificSeries = {
  name: string
  x: number[]
  y: number[]
  style?: 'line' | 'points'
  axisLabel?: string
}
export type ScientificMetric = {
  label: string
  value: number | string
  detail: string
}
export type ScientificResult = {
  module: ScientificModule
  method: string
  status: 'converged' | 'completed' | 'stopped'
  message?: string
  columns: string[]
  rows: number[][]
  series: ScientificSeries[]
  values: Record<string, number>
  metrics: ScientificMetric[]
  warnings: string[]
  iterations?: number
  evaluations?: number
  durationMs: number
  formula?: string
}
