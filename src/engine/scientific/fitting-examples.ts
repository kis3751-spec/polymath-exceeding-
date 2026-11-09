import type { ScientificModule } from './types'

export const fittingExamples: {
  title: string
  module: ScientificModule
  source: string
  description: string
}[] = [
  {
    title: '검량선 · 선형 회귀',
    module: 'curve-fit',
    description:
      '농도와 측정 신호의 관계를 적합하고 계수·데이터 오차·R²를 확인합니다.',
    source: `[
C signal
0 0.12
1 1.09
2 2.14
3 3.08
4 4.16
5 5.10
]
polyfit C signal 1`,
  },
  {
    title: '포물선 에너지 · 다항식 회귀',
    module: 'curve-fit',
    description: '2차 모델을 적합하고 선형 모델과 데이터 오차를 비교합니다.',
    source: `[
x E
-3 10.04
-2 5.02
-1 2.01
0 1.00
1 2.03
2 5.01
3 9.98
]
polyfit x E 2`,
  },
  {
    title: '공정 응답 · 다중선형 회귀',
    module: 'multilinear',
    description:
      '온도와 유량의 영향을 동시에 추정합니다. 계수의 단위와 설명변수 상관을 함께 확인하세요.',
    source: `[
T flow response
20 1 9.0
25 1 10.6
30 1 11.9
20 2 7.1
25 2 8.4
30 2 10.1
20 3 5.0
25 3 6.6
30 3 8.0
]
mlinfit T flow response`,
  },
  {
    title: '효소 반응 · Michaelis–Menten',
    module: 'nonlinear-fit',
    description:
      '포화 반응속도 v=Vmax*S/(Km+S)를 비선형 최소제곱으로 적합합니다.',
    source: `[
S v
0.1 0.300
0.3 0.720
0.5 1.000
0.8 1.280
1.2 1.516
1.8 1.728
2.5 1.875
3.2 1.969
]
nlinfit v = Vmax*S/(Km+S)
m(Vmax)=2
m(Km)=0.5
Vmax(min)=0
Km(min)=0`,
  },
  {
    title: '냉각 데이터 · 지수 회귀',
    module: 'nonlinear-fit',
    description:
      '온도 감소 모델을 적합합니다. 초기값을 바꾸고 수렴 결과·표준오차를 비교할 수 있습니다.',
    source: `[
t T
0 90.0
1 73.2
2 60.7
3 51.4
4 44.6
5 39.5
6 35.7
]
Ta = 25
nlinfit T = Ta + A*exp(-k*t)
m(A)=50
m(k)=0.2
A(min)=0
k(min)=0`,
  },
]
