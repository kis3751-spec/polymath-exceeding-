import type { ScientificModule } from './types'

export const integrationExamples: {
  title: string
  module: ScientificModule
  source: string
  description: string
}[] = [
  {
    title: '유량 데이터의 누적 부피',
    module: 'integration',
    description: '불규칙한 시간 간격의 유량 측정값에서 누적 부피를 구합니다.',
    source: `[
t Q
0 0
0.5 2
1.5 4
3 3
5 1
]
integrate Q(t) 0 5 200 lin`,
  },
  {
    title: '열용량 곡선의 엔탈피 변화',
    module: 'integration',
    description:
      '온도별 열용량을 자연 3차 스플라인으로 연결해 면적을 비교합니다.',
    source: `[
T Cp
300 29.1
350 29.8
400 30.7
500 32.9
600 35.2
700 37.6
]
integrate Cp(T) 300 700 200 ccs`,
  },
  {
    title: '제곱 곡선과 Akima 적분',
    module: 'integration',
    description: '알려진 포물선의 면적 64/3과 Akima 보간 결과를 비교합니다.',
    source: `[
x y
0 0
1 1
2 4
3 9
4 16
]
integrate y(x) 0 4 200 akm`,
  },
]
