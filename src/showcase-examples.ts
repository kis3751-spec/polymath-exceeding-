import type { NonlinearExample, Project } from './models'

const parameter = (
  name: string,
  value: number,
  min: number,
  max: number,
  step: number,
) => ({ id: name, name, value, min, max, step })
const example = (
  id: string,
  category: string,
  title: string,
  description: string,
  source: string,
  parameters: Project['parameters'],
  sweepName: string,
  guide: NonNullable<NonlinearExample['guide']>,
): NonlinearExample => ({
  id,
  category,
  guide,
  project: {
    mode: 'nonlinear',
    nonlinearSearch: 'auto',
    conditionNorm: 'infinity',
    title,
    description,
    source,
    parameters,
    sweepName,
  },
})

// Textbook models with illustrative dimensionless parameters, not fitted experimental data.
export const SHOWCASE_EXAMPLES: NonlinearExample[] = [
  example(
    'landau-fold',
    '수학·물리 · 세 분기와 두 접점',
    'Landau 모형의 평형 분기',
    '퍼텐셜 U=x⁴/4−x²/2−h·x의 평형 x³−x=h를 풉니다. h=0의 세 해를 병합해 ±0.3849 부근에서 두 해가 만나는 모습을 관찰하세요.',
    '# dU/dx=0: 평형 조건이며 시간 적분은 하지 않습니다\nf1(x) = x^3 - x\nf1(x) - h = 0',
    [parameter('h', 0, -0.6, 0.6, 0.01)],
    'h',
    {
      context:
        'Landau 퍼텐셜의 정상점입니다. 그래프는 외부장 h에 따른 평형 위치이며 시간 궤적이 아닙니다.',
      features: ['다중 실근', '2차 접점', '병합 세트'],
      steps: [
        '시뮬레이션에서 병합 세트 추가를 눌러 세 해를 한 그래프에 담으세요.',
        'h를 −0.6에서 0.6으로 움직여 두 접점 h=±2/(3√3)≈±0.384900을 확인하세요.',
        '병합 뒤 빈 분기는 추적이 종료된 가지입니다. 반대로 움직이면 두 실근이 다시 나타납니다.',
      ],
      reference: {
        label: 'Landau theory · Landau 자유에너지 모형',
        url: 'https://en.wikipedia.org/wiki/Landau_theory',
      },
    },
  ),
  example(
    'mean-field-magnet',
    '통계물리 · 비선형 자기일관 방정식',
    '평균장 Ising 모형의 자기화',
    'm=tanh(βm+h)의 자기일관 방정식입니다. β=2에서 세 평형 자기화를 비교하고 외부장 h로 두 분기가 합쳐지는 임계점을 탐색합니다.',
    '# 무차원 자기화 m, 상호작용 beta, 외부장 h\nf1(m) = m\nf2(m) = tanh(beta*m + h)\nf1(m) - f2(m) = 0',
    [parameter('beta', 2, 0.5, 3, 0.05), parameter('h', 0, -0.9, 0.9, 0.01)],
    'h',
    {
      context:
        '평균장 근사의 Ising 자기화 식입니다. 수학적 평형과 열역학적 안정성은 별개이며 안정성을 자동 판정하지 않습니다.',
      features: ['쌍곡함수', '함수 간 연산', '분기 소멸'],
      steps: [
        'β=2, h=0을 유지하고 세 해를 병합 세트에 담으세요. m≈0, ±0.9575입니다.',
        'h를 양쪽으로 움직이면 h≈±0.53284에서 두 분기가 만납니다.',
        'β를 0.8로 낮추면 단일 평형만 남습니다. β 변경은 모델 곡선을 재계산하므로, 새 해를 선택해 비교하세요.',
      ],
      reference: {
        label: 'Ising model · Mean field theory',
        url: 'https://en.wikipedia.org/wiki/Ising_model#Mean_field_theory',
      },
    },
  ),
  example(
    'semenov-ignition',
    '반응·열공학 · 발열과 냉각의 접점',
    'Semenov 열폭주 임계점',
    '무차원 발열 exp(θ)과 열제거 q·θ의 평형입니다. q=4에서 두 온도 해를 비교하고 q=e, θ=1의 접점을 확인하세요.',
    '# Semenov 집중정수 모형의 지수 근사 정상 열수지\nf1(theta) = exp(theta)\nf2(theta) = q*theta\nf1(theta) - f2(theta) = 0',
    [parameter('q', 4, 2, 6, 0.05)],
    'q',
    {
      context:
        'Arrhenius 발열을 지수로 근사한 Semenov 정상 열수지입니다. θ는 온도 상승, q는 열제거 계수의 무차원 값입니다.',
      features: ['지수함수', '열폭주 임계점', '2차 접점'],
      steps: [
        'q=4의 두 해 θ≈0.3574, 2.1533을 병합해 보세요.',
        'q를 낮춰 e≈2.718282에 접근하면 두 정상 온도가 θ=1에서 접합니다.',
        'q<e에서는 이 근사 모형의 정상 열수지 해가 없습니다. 온도의 시간적 발산 자체를 계산하는 예제는 아닙니다.',
      ],
      reference: {
        label: 'Thermal runaway · 열폭주와 열수지',
        url: 'https://en.wikipedia.org/wiki/Thermal_runaway',
      },
    },
  ),
  example(
    'van-der-waals',
    '열역학 · 비이상 기체의 다중 체적',
    'van der Waals 등온선',
    '환산 상태방정식 P=8T/(3v−1)−3/v²를 풉니다. T=0.9에서 압력에 따른 세 체적 해와 스피노달 접점을 비교하세요.',
    '# 환산 압력 P, 온도 T, 몰체적 v\n# 물리적 체적은 v > 1/3\nf1(v) = 8*T/(3*v - 1) - 3/v^2\nf1(v) - P = 0',
    [
      parameter('T', 0.9, 0.85, 1.1, 0.01),
      parameter('P', 0.6, 0.3, 0.85, 0.01),
    ],
    'P',
    {
      context:
        'van der Waals 환산 상태방정식의 수학적 해입니다. 중간 가지까지 표시하며 Maxwell 등면적 구성이나 상평형을 대신하지 않습니다.',
      features: ['유리함수', '세 체적 해', '정의역·극점'],
      steps: [
        'T=0.9와 P=0.6의 세 체적 해를 병합 세트에 담으세요.',
        'P를 움직여 P≈0.41984, 0.72401 부근의 스피노달 끝점을 살펴보세요.',
        'v>1/3의 물리적 영역을 확인하세요. v=0, 1/3은 원래 식의 극점이므로 연결하면 안 됩니다.',
      ],
      reference: {
        label: 'Van der Waals equation · 환산 상태방정식',
        url: 'https://en.wikipedia.org/wiki/Van_der_Waals_equation#Reduced_form',
      },
    },
  ),
  example(
    'transcendental-folds',
    '수학 · 초월함수의 두 접점',
    '삼각·쌍곡함수의 교점 병합',
    'cos((3/π)x)와 sinh(x)/3+tr의 교점을 구합니다. 함수 정의를 조합하고 두 접점에서의 분기 병합을 비교하는 예제입니다.',
    'f1(x) = cos((3/pi)*x)\nf2(x) = (1/3)*sinh(x) + tr\nf1(x) - f2(x) = 0',
    [parameter('tr', 0.95, 0.75, 1.15, 0.005)],
    'tr',
    {
      context:
        '다항식이 아닌 두 곡선의 교점 문제입니다. 함수값 일치와 접선 기울기 일치를 함께 살펴봅니다.',
      features: ['번호 함수', '초월함수 접점', '그래프 클릭'],
      steps: [
        'tr=0.95의 세 해를 병합 세트에 추가하세요.',
        'tr≈0.8292548과 1.0648626에서 만나는 해의 쌍을 비교하세요.',
        '접점 배너를 클릭해 추정 임계 파라미터로 이동하고 해석 리포트의 잔차를 함께 확인하세요.',
      ],
      reference: {
        label: 'Saddle-node bifurcation · Fold 정상형',
        url: 'https://en.wikipedia.org/wiki/Saddle-node_bifurcation',
      },
    },
  ),
  example(
    'quartic-contact',
    '수학 · 4차 평탄 접점',
    '4차 접점에서 생기는 두 해',
    '(x−1)⁴=p의 두 해는 p=0, x=1에서 만납니다. 2차 접점보다 평탄한 고차 접점을 비교하세요.',
    '(x - 1)^4 = p',
    [parameter('p', 0.0625, -0.05, 0.2, 0.005)],
    'p',
    {
      context:
        '고차 중근의 정상형 예제입니다. p>0에서는 두 실근, p=0에서는 4중근 하나, p<0에서는 실근이 없습니다.',
      features: ['4차 평탄 접점', '두 해의 생성·병합'],
      steps: [
        '기본값의 x=0.5, 1.5를 병합하세요.',
        'p=0 부근을 확대해 4차 접점 배너를 확인하세요.',
        'p의 부호에 따라 달라지는 실근 수를 확인하세요. 실패 구간을 가로지르는 선은 그리지 않습니다.',
      ],
      reference: {
        label: 'Multiplicity · 중근의 차수',
        url: 'https://en.wikipedia.org/wiki/Multiplicity_(mathematics)#Multiplicity_of_a_root_of_a_polynomial',
      },
    },
  ),
  example(
    'cubic-passage',
    '수학 · 소멸 없이 관통하는 3차 접점',
    '3차 변곡 접점을 지나는 해',
    'x³=p의 유일 실근은 원점을 통과합니다. 접점이 있다고 항상 두 해가 병합·소멸하는 것은 아님을 확인하세요.',
    'x^3 = p',
    [parameter('p', 0.125, -1, 1, 0.05)],
    'p',
    {
      context:
        '3차 변곡 접점의 정상형입니다. 두 파라미터가 필요한 일반적인 Cusp 분기 전체를 표현하는 예제는 아닙니다.',
      features: ['3차 변곡 접점', '0 교차', '연속 추적'],
      steps: [
        'p를 음수에서 양수로 움직여 해가 끊기지 않고 원점을 통과하는지 살펴보세요.',
        '원점의 3중 접점 배너와 x=∛p의 수직 접선 모양을 확인하세요.',
        '그래프 클릭으로 샘플 사이의 연속 값을 선택하고 표의 샘플 포인트와 비교하세요.',
      ],
      reference: {
        label: 'Cubic function · 삼차함수',
        url: 'https://en.wikipedia.org/wiki/Cubic_function',
      },
    },
  ),
  example(
    'mass-action-system',
    '화학 · 세 변수와 질량작용 평형',
    'A+B ⇌ C의 비선형 화학평형',
    '두 물질수지와 C=K·A·B를 함께 풉니다. 세 미지수와 혼합식 정의를 사용하고 수학적 실근에서 가능한 농도를 고르세요.',
    '# 농도는 같은 기준 농도로 무차원화한 예시\nf1 = A + C - A0\nf2 = B + C - B0\nf3 = C - K*A*B\nf1 = 0\nf2 = 0\nf3 = 0',
    [
      parameter('A0', 2, 0.5, 3, 0.1),
      parameter('B0', 1, 0.5, 3, 0.1),
      parameter('K', 4, 0.25, 8, 0.05),
    ],
    'K',
    {
      context:
        '이상 혼합물에서 A+B⇌C의 질량작용 평형과 원료 수지입니다. 표준화한 농도·평형상수의 교육용 값입니다.',
      features: ['비선형 연립식', '혼합식 정의', '물리적 해 선택'],
      steps: [
        '발견한 해 중 A≥0, B≥0, 0≤C≤min(A0,B0)를 만족하는 해를 선택하세요.',
        '기본값의 물리적 해는 C≈0.824609입니다. 다른 실근은 농도 조건을 만족하지 않습니다.',
        'K를 움직이며 농도 변화를 탐색하고, 리포트에서 물질수지 잔차와 Jacobian 조건수를 확인하세요.',
      ],
      reference: {
        label: 'Law of mass action · 질량작용 법칙',
        url: 'https://en.wikipedia.org/wiki/Law_of_mass_action',
      },
    },
  ),
]
