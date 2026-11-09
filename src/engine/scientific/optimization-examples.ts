import type { ScientificModule } from './types'

export const optimizationExamples: {
  title: string
  module: ScientificModule
  source: string
  description: string
}[] = [
  {
    title: 'Rosenbrock 계곡의 국소 최솟값',
    module: 'optimization',
    description:
      '곡선 형태의 좁은 계곡에서 목적함수 감소와 국소 정상성의 차이를 살펴봅니다.',
    source:
      '# Rosenbrock 함수: 알려진 최솟값 (x,y)=(1,1)\nmin: 100*(y-x^2)^2+(1-x)^2\nx|-1.2 -3 3\ny|1 -2 4',
  },
  {
    title: '저장 용기의 최소 표면적',
    module: 'optimization',
    description:
      '부피를 보존하는 원기둥의 반지름·높이를 찾습니다. 이 모델의 해석적 최적 비율은 h=2r입니다.',
    source:
      '# 닫힌 원기둥, 길이·면적·부피는 일관된 단위를 사용\nvolume = 100\nmin: 2*pi*r^2+2*pi*r*h\npi*r^2*h = volume\nr|2 0.1 10\nh|5 0.1 30',
  },
  {
    title: '성분 합과 허용 영역을 갖는 설계',
    module: 'optimization',
    description:
      '등식·부등식과 변수 범위를 동시에 적용하며 최대 제약 위반을 확인합니다.',
    source: 'min: (x-1)^2+(y-1)^2\nx+y=1\n1.5-x^2-y^2>=0\nx|0.2 0 2\ny|0.2 0 2',
  },
  {
    title: '총 이득을 고정한 센서 보정',
    module: 'lsq',
    description:
      '관측 데이터를 선형 모델로 적합하면서 a+b=3이라는 교정 제약을 유지합니다.',
    source:
      '[\nx y\n0 1.02\n1 2.97\n2 5.04\n3 6.98\n4 9.01\n]\nfit: y = a*x+b\na|1 0 4\nb|0 -1 2\na+b=3',
  },
  {
    title: '양의 속도 상수를 갖는 반응 속도 적합',
    module: 'lsq',
    description:
      'Michaelis–Menten 곡선의 vmax와 Km을 물리적 범위 안에서 추정합니다.',
    source:
      '[\nS rate\n0.1 0.167\n0.25 0.333\n0.5 0.500\n1 0.667\n2 0.800\n4 0.889\n]\nfit: rate = vmax*S/(Km+S)\nvmax|0.8 0.01 3\nKm|0.4 0.001 5',
  },
]
