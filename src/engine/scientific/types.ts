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
export type ScientificCoefficient = {
  name: string
  estimate: number
  standardError?: number
  confidence95?: { lower: number; upper: number; halfWidth: number }
  fixed?: boolean
  note?: string
}
export type RegressionDiagnostics = {
  model: string
  sampleCount: number
  parameterCount: number
  degreesOfFreedom: number
  rank?: number
  origin: boolean
  confidenceMethod: 'linear-normal' | 'nonlinear-local'
  confidenceUnavailableReason?: string
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
  coefficients?: ScientificCoefficient[]
  regression?: RegressionDiagnostics
  comparison?: {
    observed: number[]
    predicted: number[]
    dependent: string
  }
  integration?: {
    from: number
    to: number
    independent: string
    dependent: string
    value: number
  }
}
