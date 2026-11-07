import { ArrowRight, Code2, FileText, Home, Activity } from 'lucide-react'
import './WorkspaceNavigation.css'

export type WorkspaceScreen = 'home' | 'model' | 'simulation' | 'report'

type ModuleKind =
  | 'equation'
  | 'differential'
  | 'curve'
  | 'nonlinear'
  | 'optimum'
  | 'integration'

const modules: {
  kind: ModuleKind
  letter: string
  name: string
  description: string
  available?: boolean
}[] = [
  {
    kind: 'equation',
    letter: 'E',
    name: 'Equation Solver',
    description: '선형·비선형 방정식의 해를 구하고 변화를 탐색하세요.',
    available: true,
  },
  {
    kind: 'differential',
    letter: 'D',
    name: 'Differential Equations',
    description: '미분방정식으로 시간에 따른 변화를 계산합니다.',
  },
  {
    kind: 'curve',
    letter: 'P',
    name: 'Curve Fitting',
    description: '데이터에 맞는 선형·다항식 모델을 찾습니다.',
  },
  {
    kind: 'nonlinear',
    letter: 'N',
    name: 'Nonlinear Fitting',
    description: '비선형 모델의 파라미터를 데이터에서 추정합니다.',
  },
  {
    kind: 'optimum',
    letter: 'O',
    name: 'Optimum Finder',
    description: '조건을 만족하는 최적의 값을 탐색합니다.',
  },
  {
    kind: 'integration',
    letter: 'I',
    name: 'Discrete Integration',
    description: '측정한 데이터 사이의 면적과 적분값을 구합니다.',
  },
]

function ModuleIllustration({ kind }: { kind: ModuleKind }) {
  return (
    <svg
      className="module-illustration"
      viewBox="0 0 180 84"
      aria-hidden="true"
    >
      {kind === 'equation' && (
        <>
          <path className="module-line module-line-muted" d="M30 65 148 15" />
          <path
            className="module-line"
            d="M28 47C45 8 63 15 86 42S125 77 151 35"
          />
          <circle className="module-point" cx="86" cy="42" r="4.5" />
        </>
      )}
      {kind === 'differential' && (
        <>
          <path className="module-line" d="M29 68C57 15 80 10 145 12" />
          <path
            className="module-line module-line-muted"
            d="M29 49C70 58 89 27 145 29"
          />
          <path className="module-line" d="M29 20C67 18 90 55 145 54" />
          <path
            className="module-arrow"
            d="m142 9 7 3-7 3m0 11 7 3-7 3m0 19 7 3-7 3"
          />
        </>
      )}
      {kind === 'curve' && (
        <>
          <path className="module-line" d="M30 67C86 69 122 54 145 13" />
          {[
            [37, 67],
            [74, 62],
            [106, 48],
            [131, 30],
            [145, 13],
          ].map(([cx, cy]) => (
            <circle className="module-point" key={cx} cx={cx} cy={cy} r="4" />
          ))}
        </>
      )}
      {kind === 'nonlinear' && (
        <>
          <path
            className="module-line module-line-dashed"
            d="M30 65C80 67 93 13 150 13M30 81C85 78 101 29 150 29"
          />
          <path className="module-line" d="M30 73C82 73 97 21 150 21" />
          <circle className="module-point" cx="46" cy="71" r="4" />
          <circle className="module-point" cx="91" cy="48" r="4" />
          <circle className="module-point" cx="137" cy="23" r="4" />
        </>
      )}
      {kind === 'optimum' && (
        <>
          <path className="module-line" d="M30 20Q90 102 151 20" />
          <path
            className="module-line module-line-dashed"
            d="m43 18 28 34 15 7"
          />
          <circle className="module-point" cx="43" cy="18" r="4" />
          <circle className="module-point" cx="90" cy="61" r="4" />
          <path className="module-arrow" d="m84 55 6 6-8 1" />
        </>
      )}
      {kind === 'integration' && (
        <>
          <path
            className="module-area"
            d="M29 65V54C47 1 69 4 95 33S131 64 151 65Z"
          />
          <path
            className="module-line"
            d="M29 54C47 1 69 4 95 33S131 64 151 65M22 65H157"
          />
          <path
            className="module-line module-line-muted"
            d="M42 29V65M57 16V65M72 15V65M87 25V65M102 41V65M117 55V65M132 62V65"
          />
        </>
      )}
    </svg>
  )
}

export function LandingModules({
  onOpenEquationSolver,
}: {
  onOpenEquationSolver: () => void
}) {
  return (
    <section className="module-home" aria-labelledby="module-home-title">
      <header className="module-home-heading">
        <span className="module-home-eyebrow">YOUR MATHEMATICAL WORKSPACE</span>
        <h1 id="module-home-title">어떤 계산을 시작할까요?</h1>
        <p>필요한 도구를 선택하고, 한 화면에서 한 가지 작업에 집중하세요.</p>
      </header>
      <div className="module-grid">
        {modules.map((module) => (
          <button
            type="button"
            className={`module-card module-${module.kind}${module.available ? ' is-available' : ''}`}
            key={module.kind}
            disabled={!module.available}
            aria-label={`${module.name} ${module.available ? '열기' : '준비 중'}`}
            onClick={module.available ? onOpenEquationSolver : undefined}
          >
            <span className="module-card-title">
              <span className="module-letter">{module.letter}</span>
              <span>{module.name}</span>
            </span>
            <span className="module-description">{module.description}</span>
            <ModuleIllustration kind={module.kind} />
            <span className="module-card-footer">
              {module.available ? (
                <>
                  <span>계산 시작</span>
                  <ArrowRight size={16} />
                </>
              ) : (
                <span className="module-coming-soon">준비 중</span>
              )}
            </span>
          </button>
        ))}
      </div>
      <p className="module-home-note">
        Equation Solver에서 선형·비선형 계산을 사용할 수 있습니다.
      </p>
    </section>
  )
}

const screens = [
  { screen: 'model', name: '수식·파라미터', icon: Code2 },
  { screen: 'simulation', name: '시뮬레이션', icon: Activity },
  { screen: 'report', name: '해석 리포트', icon: FileText },
] as const

export function WorkspaceNavigation({
  screen,
  onNavigate,
}: {
  screen: WorkspaceScreen
  onNavigate: (screen: WorkspaceScreen) => void
}) {
  return (
    <nav className="workspace-navigation" aria-label="Equation Solver 화면">
      <button
        type="button"
        className="workspace-home-button"
        aria-label="모듈 홈"
        onClick={() => onNavigate('home')}
      >
        <Home size={16} aria-hidden="true" />
        <span>모듈 홈</span>
      </button>
      <span className="workspace-nav-divider" aria-hidden="true" />
      <div className="workspace-screen-links">
        {screens.map(({ screen: target, name, icon: Icon }, index) => (
          <button
            type="button"
            className={`workspace-screen-button${screen === target ? ' is-current' : ''}`}
            key={target}
            onClick={() => onNavigate(target)}
            aria-current={screen === target ? 'page' : undefined}
          >
            <span className="workspace-screen-number" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            <Icon size={16} aria-hidden="true" />
            <span>{name}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
