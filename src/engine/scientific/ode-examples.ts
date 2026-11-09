export const odeExamples = [
  {
    title: '순차 반응 A → B → C',
    module: 'ode' as const,
    description:
      '반응 속도와 총 농도 보조식을 함께 계산합니다. k1·k2를 바꾸어 중간 생성물 B의 최대값과 반응 시간을 비교하세요.',
    source: `d(A)/d(t) = -r1
d(B)/d(t) = r1-r2
d(C)/d(t) = r2
r1 = k1*A
r2 = k2*B
Total = A+B+C
k1 = 1
k2 = 0.5
A(0) = 1
B(0) = 0
C(0) = 0
t|0:10`,
  },
  {
    title: '감쇠 진동자의 위치와 속도',
    module: 'ode' as const,
    description:
      '위치 x와 속도 v를 동시에 적분합니다. 감쇠비 zeta가 커질 때 과도 응답과 위상 궤적이 어떻게 달라지는지 확인하세요.',
    source: `x' = v
v' = -2*zeta*omega*v-omega^2*x
Energy = (v^2+omega^2*x^2)/2
zeta = 0.1
omega = 2
x|1
v|0
t|0:12`,
  },
  {
    title: 'Robertson 강성 반응계',
    module: 'ode' as const,
    description:
      '속도 척도가 크게 다른 고전적인 강성 화학 반응 예제입니다. 자동 또는 암시적 해법을 사용하고 총 몰분율 A+B+C를 점검하세요.',
    source: `d(A)/d(t) = -k1*A+k2*B*C
d(B)/d(t) = k1*A-k2*B*C-k3*B^2
d(C)/d(t) = k3*B^2
Total = A+B+C
k1 = 0.04
k2 = 10000
k3 = 30000000
A(0) = 1
B(0) = 0
C(0) = 0
t|0:1`,
  },
]
