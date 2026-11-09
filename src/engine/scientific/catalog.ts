import type { ScientificModule } from './types'
import { odeExamples } from './ode-examples'
import { fittingExamples } from './fitting-examples'
import { optimizationExamples } from './optimization-examples'
import { integrationExamples } from './integration-examples'
export type ScientificExample = {
  title: string
  module: ScientificModule
  source: string
  description: string
}
export const scientificTitles: Record<ScientificModule, string> = {
  ode: 'Differential Equations',
  'curve-fit': 'Curve Fitting',
  multilinear: 'Multilinear Regression',
  'nonlinear-fit': 'Nonlinear Regression',
  integration: 'Discrete Integration',
  optimization: 'Constrained Optimization',
  lsq: 'LSQ Optimization',
}
export const scientificDescriptions: Record<ScientificModule, string> = {
  ode: '초기 상태에서 출발해 시간에 따른 변화를 계산합니다.',
  'curve-fit': '관측 데이터에 선형·다항식 모델을 맞춥니다.',
  multilinear: '여러 설명 변수가 관측값에 미치는 영향을 추정합니다.',
  'nonlinear-fit': '관측 데이터에서 비선형 모델의 계수를 추정합니다.',
  integration: '측정된 데이터 사이의 면적과 누적량을 계산합니다.',
  optimization: '목적함수와 제약조건을 함께 만족하는 국소 최적점을 탐색합니다.',
  lsq: '범위·제약조건 안에서 관측값과 모델 차이의 제곱합을 줄입니다.',
}
export const getModuleExamples = (
  module: ScientificModule,
): ScientificExample[] =>
  [
    ...odeExamples,
    ...fittingExamples,
    ...optimizationExamples,
    ...integrationExamples,
  ].filter((x) => x.module === module) as ScientificExample[]
