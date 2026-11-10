# 03 · 그래프, 마우스 조작과 화면 표현

그래프를 화면 좌표로 바꾸고, 포인터·키보드·휠 입력을 처리하는 실제 React·TypeScript 및 CSS입니다. `main.tsx`에서 앱을 올리고, `WorkspaceNavigation`에서 모듈 홈과 각 작업 화면의 이동을 표현합니다.

`chart-domain.ts`와 다른 `chart-*.ts` 파일은 수치 좌표와 화면 좌표, 축 범위 및 그래프 조작에 필요한 계산을 분리합니다. `SolutionChart.tsx`는 SVG 곡선·축·현재 지점·탐색 표시를 렌더링합니다. `SimulationPanelView.tsx`는 해별 그래프와 데이터 표, 내보내기를 묶습니다.

마우스로 보이는 곡선을 탐색하는 것과 파라미터를 실제로 변경하여 모델을 다시 푸는 동작은 구분합니다. 표의 행 선택, 그래프의 연속적인 탐색 표시, 클릭으로 선택한 현재값은 각각 소스의 이벤트 처리에서 확인할 수 있습니다. 유효하지 않은 구간은 선으로 이어 그리지 않습니다.

조작은 그래프 클릭으로 파라미터 적용, 활성화한 그래프 위의 휠로 축 확대·축소입니다. 그래프 확대 축에서 양축·X축·Y축을 선택하고 축 초기화로 복원합니다. 좌우/Home/End는 표 지점 탐색, Enter/Space는 값 적용, +/-는 확대·축소, 0은 초기화에 연결됩니다. 호버 툴팁의 곡선 보간값은 표의 직접 계산값과 구분합니다.

공통 `styles.css`, 분리 화면의 `workspace-screens.css`와 컴포넌트별 CSS를 함께 담아 화면 배치, 반응형 크기, 전환 효과와 애니메이션의 실제 정의를 읽을 수 있게 했습니다. 휠에 의한 축 조정은 표시 범위를 바꾸며 계산한 해 자체를 변경하지 않습니다.

## 읽는 방법

아래 코드 블록은 표시한 원본 파일의 전체 내용을 그대로 복사한 읽기용 묶음입니다. 요약용 의사 코드나 별도의 구현이 아니며, 모듈의 import 경로는 원래 프로젝트 구조를 따릅니다. 이 Markdown을 하나의 TypeScript 파일로 바꾸어 실행하는 용도는 아닙니다. 실행은 저장소에서 `npm ci`와 `npm run dev`를 사용합니다.

원본을 수정한 뒤 `npm run docs:core`로 다시 만들고, `npm run docs:core -- --check`로 문서와 현재 소스가 같은지 확인할 수 있습니다. 각 파일의 SHA-256은 원문 일치 확인용이며 생성 시각을 넣지 않아 같은 소스에서 같은 문서를 만듭니다.

소스 묶음 SHA-256: `de3be04d6b5747ec1646a2b9439d945ce7a8d745a8c7e7c1925ccae900dc40ad`

## 다른 코드 묶음

- [01 · 수식 파싱과 수치해석 엔진](./01-math-engine.md)
- [02 · 상태 관리, 분기 추적과 비동기 계산](./02-state-and-simulation.md)
- [03 · 그래프, 마우스 조작과 화면 표현](./03-chart-and-interaction.md) · 현재 문서
- [04 · 미분방정식·회귀·적분·최적화](./04-scientific-modules.md)

## 포함한 원본

- [src/main.tsx](#source-1) · [저장소 원본](../../src/main.tsx)
- [src/components/AccountSession.tsx](#source-2) · [저장소 원본](../../src/components/AccountSession.tsx)
- [src/components/AccountSession.css](#source-3) · [저장소 원본](../../src/components/AccountSession.css)
- [server/gateway/index.html](#source-4) · [저장소 원본](../../server/gateway/index.html)
- [server/gateway/welcome.js](#source-5) · [저장소 원본](../../server/gateway/welcome.js)
- [server/gateway/response.js](#source-6) · [저장소 원본](../../server/gateway/response.js)
- [server/gateway/welcome.css](#source-7) · [저장소 원본](../../server/gateway/welcome.css)
- [src/components/chart-domain.ts](#source-8) · [저장소 원본](../../src/components/chart-domain.ts)
- [src/components/chart-interaction.ts](#source-9) · [저장소 원본](../../src/components/chart-interaction.ts)
- [src/components/EquationReference.tsx](#source-10) · [저장소 원본](../../src/components/EquationReference.tsx)
- [src/components/ExampleWalkthrough.tsx](#source-11) · [저장소 원본](../../src/components/ExampleWalkthrough.tsx)
- [src/components/AnalysisSummary.tsx](#source-12) · [저장소 원본](../../src/components/AnalysisSummary.tsx)
- [src/components/AnalysisSummary.css](#source-13) · [저장소 원본](../../src/components/AnalysisSummary.css)
- [src/components/CertificationReport.tsx](#source-14) · [저장소 원본](../../src/components/CertificationReport.tsx)
- [src/components/certification-view.ts](#source-15) · [저장소 원본](../../src/components/certification-view.ts)
- [src/components/Guide.tsx](#source-16) · [저장소 원본](../../src/components/Guide.tsx)
- [src/components/Guide.css](#source-17) · [저장소 원본](../../src/components/Guide.css)
- [src/components/ModuleGuide.tsx](#source-18) · [저장소 원본](../../src/components/ModuleGuide.tsx)
- [src/components/ModuleGuide.css](#source-19) · [저장소 원본](../../src/components/ModuleGuide.css)
- [src/components/guide-content.ts](#source-20) · [저장소 원본](../../src/components/guide-content.ts)
- [src/components/SolutionChart.tsx](#source-21) · [저장소 원본](../../src/components/SolutionChart.tsx)
- [src/components/SolutionChart.css](#source-22) · [저장소 원본](../../src/components/SolutionChart.css)
- [src/components/SimulationPanelView.tsx](#source-23) · [저장소 원본](../../src/components/SimulationPanelView.tsx)
- [src/components/MergedSimulationSetView.tsx](#source-24) · [저장소 원본](../../src/components/MergedSimulationSetView.tsx)
- [src/components/SimulationPanelView.css](#source-25) · [저장소 원본](../../src/components/SimulationPanelView.css)
- [src/components/WorkspaceNavigation.tsx](#source-26) · [저장소 원본](../../src/components/WorkspaceNavigation.tsx)
- [src/components/WorkspaceNavigation.css](#source-27) · [저장소 원본](../../src/components/WorkspaceNavigation.css)
- [src/styles.css](#source-28) · [저장소 원본](../../src/styles.css)
- [src/workspace-screens.css](#source-29) · [저장소 원본](../../src/workspace-screens.css)
- [src/ivc.css](#source-30) · [저장소 원본](../../src/ivc.css)

<a id="source-1"></a>

## src/main.tsx

원본: [src/main.tsx](../../src/main.tsx) · 15줄 · SHA-256: `88239fc32cdb9a7c733dfcccde347bd6d1e365e545e9269b6df2164dfb5af7db`

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import AccountSession from './components/AccountSession'
import './styles.css'
import './workspace-screens.css'
import './ivc.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AccountSession>
      <App />
    </AccountSession>
  </React.StrictMode>,
)
```

<a id="source-2"></a>

## src/components/AccountSession.tsx

원본: [src/components/AccountSession.tsx](../../src/components/AccountSession.tsx) · 137줄 · SHA-256: `c30bd1ac24336ae8027d992be5da69d84ec11974b65cce3cf4377ae034e16a51`

```tsx
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { selectAccountStorage } from '../account-storage'
import './AccountSession.css'
type Session = {
  user: { id: string; email: string; role: 'owner' | 'member' }
  csrf: string
}
export default function AccountSession({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null),
    [error, setError] = useState('')
  const current = useRef<Session | null>(null),
    lastActivity = useRef(Date.now()),
    version = useRef(0)
  useEffect(() => {
    let alive = true
    async function check() {
      const request = ++version.current
      try {
        const response = await fetch('/api/session', {
          credentials: 'same-origin',
          cache: 'no-store',
          headers:
            Date.now() - lastActivity.current < 25_000
              ? { 'X-IVC-Active': '1' }
              : {},
        })
        if (!alive || request !== version.current) return
        if (response.status === 401) {
          setSession(null)
          location.replace('/?expired=1')
          return
        }
        if (!response.ok) throw Error('서버 연결을 확인할 수 없습니다.')
        const data = (await response.json()) as Session
        if (!alive || request !== version.current) return
        if (!data.user?.id || !data.csrf)
          throw Error('인증 확인에 실패했습니다.')
        if (current.current && current.current.user.id !== data.user.id) {
          setSession(null)
          location.replace('/calculator')
          return
        }
        selectAccountStorage(data.user)
        current.current = data
        setSession(data)
        setError('')
      } catch {
        if (alive && request === version.current) {
          setSession(null)
          setError(
            '세션을 확인할 수 없어 작업 화면을 잠갔습니다. 연결을 확인하고 다시 접속하세요.',
          )
        }
      }
    }
    const activity = () => {
      lastActivity.current = Date.now()
    }
    const focus = () => {
      activity()
      void check()
    }
    const channel = new BroadcastChannel('ivc-session')
    channel.onmessage = () => {
      version.current++
      setSession(null)
      location.replace('/')
    }
    const pageshow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setSession(null)
        location.reload()
      }
    }
    window.addEventListener('pointerdown', activity)
    window.addEventListener('keydown', activity)
    window.addEventListener('focus', focus)
    window.addEventListener('pageshow', pageshow)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void check()
    }, 20_000)
    void check()
    return () => {
      alive = false
      version.current++
      clearInterval(interval)
      channel.close()
      window.removeEventListener('pointerdown', activity)
      window.removeEventListener('keydown', activity)
      window.removeEventListener('focus', focus)
      window.removeEventListener('pageshow', pageshow)
    }
  }, [])
  async function logout() {
    if (!session) return
    version.current++
    setSession(null)
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': session.csrf,
        },
        body: '{}',
      })
      if (!response.ok) throw Error('logout')
      new BroadcastChannel('ivc-session').postMessage('logout')
      location.replace('/')
    } catch {
      setError(
        '서버 로그아웃을 확인하지 못했습니다. 연결 후 다시 로그인해 로그아웃하세요.',
      )
    }
  }
  if (!session)
    return (
      <div className="account-lock" role="status">
        <strong>IVC</strong>
        <p>{error || '사용 권한을 확인하고 있습니다.'}</p>
        {error && <a href="/">Log in again</a>}
      </div>
    )
  return (
    <>
      <div className="account-bar">
        <span>{session.user.email}</span>
        <a href={session.user.role === 'owner' ? '/?manage=1' : '/?account=1'}>
          {session.user.role === 'owner' ? 'Manage Access' : 'Account'}
        </a>
        <button onClick={() => void logout()}>Log out</button>
      </div>
      {children}
    </>
  )
}
```

<a id="source-3"></a>

## src/components/AccountSession.css

원본: [src/components/AccountSession.css](../../src/components/AccountSession.css) · 56줄 · SHA-256: `fd1b00564b4703dcdda19f77582317cd82eeb96dc942ecdeb47a38e932c504fe`

```css
.account-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  padding: 7px 25px;
  background: #eaf0ef;
  border-bottom: 1px solid #d1dcda;
  color: #506c68;
  font:
    11px/1.6 system-ui,
    sans-serif;
}
.account-bar a,
.account-bar button {
  font: inherit;
  color: #305f59;
}
.account-bar button {
  padding: 0;
  border: 0;
  background: none;
}
.account-bar span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 55vw;
}
.account-lock {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px;
  background: #f4f6f2;
  color: #375c56;
  gap: 15px;
  text-align: center;
}
.account-lock strong {
  font:
    italic 40px Georgia,
    serif;
}
.account-lock p {
  font:
    14px/1.9 system-ui,
    sans-serif;
  max-width: 60ch;
}
.account-lock a {
  font-size: 13px;
  text-decoration: underline;
}
```

<a id="source-4"></a>

## server/gateway/index.html

원본: [server/gateway/index.html](../../server/gateway/index.html) · 289줄 · SHA-256: `414bfdbc596831b135087e0ef825ee4ae64d68e4c9c02452576c5203b02ca849`

```text
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#122f39" />
    <meta
      name="description"
      content="식을 움직여 관계를 발견하는 수학 작업 공간. Interaction Visual Calculator."
    />
    <title>IVC — Interaction Visual Calculator</title>
    <link rel="stylesheet" href="/welcome.css" />
    <script type="module" src="/welcome.js"></script>
  </head>
  <body>
    <header class="site-header">
      <a href="/" class="brand" aria-label="IVC Home"
        ><span class="brand-icon">i<span>v</span>c</span
        ><span>IVC<small>Interaction Visual Calculator</small></span></a
      >
      <nav>
        <a href="#approach">Our approach</a
        ><button class="login-trigger subtle">
          Log in <span aria-hidden="true">↗</span></button
        ><button id="logout" class="subtle" hidden>Log out</button>
      </nav>
    </header>
    <main>
      <section class="hero">
        <div class="hero-copy">
          <span class="eyebrow"
            ><i></i> A SPACE FOR MATHEMATICAL DISCOVERY</span
          >
          <h1>정답에서 시작해,<br /><em>관계까지</em> 이해하다.</h1>
          <p>
            하나의 식에 담긴 가능성을 펼쳐 보세요.<br />값을 바꾸고, 변화를
            관찰하고, 수학이 설명하는 세계를 탐색합니다.
          </p>
          <div class="hero-actions">
            <button class="primary login-trigger">
              Log in to IVC <span aria-hidden="true">↗</span></button
            ><a href="#approach"
              >계산을 넘어 탐색으로 <span aria-hidden="true">↓</span></a
            >
          </div>
          <div class="workspace-entry" hidden>
            <a class="primary" href="/calculator"
              >Open Workspace <span aria-hidden="true">↗</span></a
            ><button id="manage-access" hidden>Manage Access</button
            ><span id="signed-in"></span>
          </div>
          <span class="access-note">초대받은 사용자를 위한 수학 작업 공간</span>
        </div>
        <div class="hero-visual" aria-hidden="true">
          <div class="visual-label">
            <span>EXPLORATION 001</span><span>F(x, p) = 0</span>
          </div>
          <svg class="relationship" viewBox="0 0 560 460">
            <defs>
              <pattern
                id="grid"
                width="46"
                height="46"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M46 0H0V46"
                  fill="none"
                  stroke="#dce6e3"
                  stroke-width="1"
                />
              </pattern>
            </defs>
            <rect x="0" y="0" width="560" height="460" fill="url(#grid)" />
            <path class="plot-axis" d="M30 230H530 M280 30V430" />
            <path class="ghost-curve" d="M30 390C170 390 320 230 530 50" />
            <path
              class="main-curve"
              d="M40 380C230 370 400 290 310 230S200 95 520 55"
            />
            <path class="second-curve" d="M45 100C250 80 290 370 520 360" />
            <circle class="traveler" r="7" />
            <circle class="fixed-point" cx="310" cy="230" r="7" />
            <text x="530" y="253">p</text>
            <text x="258" y="36">x</text>
          </svg>
          <div class="visual-readout">
            <span><i></i> A parameter moves.</span
            ><strong>A relationship unfolds.</strong>
          </div>
          <div class="float-formula">x³ − x = p</div>
        </div>
      </section>
      <section id="approach" class="approach">
        <div class="section-intro">
          <span class="eyebrow">THINK IN RELATIONSHIPS</span>
          <h2>계산은 정확하게.<br />이해는 직관적으로.</h2>
        </div>
        <div class="principles">
          <article>
            <span>01 / DEFINE</span>
            <h3>질문을 수식으로</h3>
            <p>
              방정식, 미분방정식, 실험 데이터.<br />당신이 풀고 싶은 문제에서
              출발합니다.
            </p>
          </article>
          <article>
            <span>02 / INTERACT</span>
            <h3>변화를 직접 관찰하기</h3>
            <p>
              파라미터를 움직이며 여러 해와 모델의 변화를 같은 그래프에서
              비교합니다.
            </p>
          </article>
          <article>
            <span>03 / UNDERSTAND</span>
            <h3>답의 의미까지 읽기</h3>
            <p>
              결과와 검증의 근거를 함께 살피고, 모듈별 교재로 새로운 개념을
              배웁니다.
            </p>
          </article>
        </div>
      </section>
      <section
        class="access-card"
        id="access-panel"
        hidden
        aria-labelledby="login-title"
      >
        <div>
          <span class="eyebrow">YOUR WORKSPACE AWAITS</span>
          <h2 id="login-title">Log in</h2>
          <p id="login-description">관리자가 허용한 계정으로 로그인하세요.</p>
        </div>
        <form id="login-form">
          <label
            >Email<input
              name="email"
              type="email"
              autocomplete="username"
              required
              maxlength="254" /></label
          ><label
            >Password<input
              name="password"
              type="password"
              autocomplete="current-password"
              required
              maxlength="128" /></label
          ><button class="primary" type="submit">
            Log in <span aria-hidden="true">↗</span>
          </button>
        </form>
      </section>
      <section id="invite-panel" class="access-card" hidden>
        <div>
          <span class="eyebrow">A NEW PERSPECTIVE STARTS HERE</span>
          <h2>Accept invitation</h2>
          <p>
            초대받은 이메일과 새 비밀번호를 입력하세요. 초대 링크는 한 번만
            사용할 수 있습니다.
          </p>
        </div>
        <form id="invite-form">
          <label
            >Email<input
              name="email"
              type="email"
              autocomplete="username"
              maxlength="254"
              required /></label
          ><label
            >New Password<input
              name="password"
              type="password"
              autocomplete="new-password"
              minlength="12"
              maxlength="128"
              required /></label
          ><label
            >Confirm Password<input
              name="confirm"
              type="password"
              autocomplete="new-password"
              minlength="12"
              maxlength="128"
              required /></label
          ><small>12~128자. 다른 서비스와 다른 비밀번호를 사용하세요.</small
          ><button class="primary">Activate account</button>
        </form>
      </section>
      <section id="admin-panel" class="admin-panel" hidden>
        <div class="admin-title">
          <div>
            <span class="eyebrow">OWNER CONSOLE</span>
            <h2>Manage Access</h2>
            <p>
              최고 관리자만 계정을 초대하거나 접근 권한을 회수할 수 있습니다.
            </p>
          </div>
          <button id="refresh-users">Refresh</button>
        </div>
        <form id="invite-user-form" class="invite-user-form">
          <label
            >Allowed Email<input
              name="email"
              type="email"
              maxlength="254"
              required /></label
          ><label
            >Admin Password<input
              name="currentPassword"
              type="password"
              autocomplete="current-password"
              maxlength="128"
              required /></label
          ><button class="primary">Create invitation</button>
        </form>
        <div id="invitation-result" hidden>
          <label
            >One-time invitation link<input
              readonly
              id="invitation-link" /></label
          ><button id="copy-invitation">Copy link</button>
          <p>
            48시간 안에 사용할 수 있습니다. 해당 이메일 사용자에게 안전한 경로로
            직접 전달하세요. 링크를 가진 사람이 계정을 활성화할 수 있습니다.
          </p>
        </div>
        <div class="user-table">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Access</th>
              </tr>
            </thead>
            <tbody id="user-list"></tbody>
          </table>
        </div>
        <p class="admin-note">
          권한을 회수하면 로그인 중인 세션과 미사용 초대도 폐기됩니다. 재허용할
          때는 새 초대를 만드세요.
        </p>
      </section>
      <section id="password-panel" class="access-card" hidden>
        <div>
          <h2>Change Password</h2>
          <p>비밀번호를 변경하면 모든 기기에서 로그아웃됩니다.</p>
        </div>
        <form id="password-form">
          <label
            >Current Password<input
              type="password"
              name="currentPassword"
              autocomplete="current-password"
              required
              maxlength="128" /></label
          ><label
            >New Password<input
              type="password"
              name="newPassword"
              autocomplete="new-password"
              required
              minlength="12"
              maxlength="128" /></label
          ><label
            >Confirm Password<input
              type="password"
              name="confirm"
              autocomplete="new-password"
              required
              minlength="12"
              maxlength="128" /></label
          ><button class="primary">Change password</button>
        </form>
      </section>
      <div id="feedback" role="status" aria-live="polite" hidden></div>
    </main>
    <footer>
      <span>IVC · Interaction Visual Calculator</span
      ><span>Explore the change. Understand the why.</span>
    </footer>
  </body>
</html>
```

<a id="source-5"></a>

## server/gateway/welcome.js

원본: [server/gateway/welcome.js](../../server/gateway/welcome.js) · 212줄 · SHA-256: `79bcd73966b3f661aabfb9700063bd9861c328484ed1c11b971e635cb152f630`

```text
import { responseData } from '/response.js'
let session = null,
  invitation = null
const $ = (selector) => document.querySelector(selector)
function feedback(message, error = false) {
  const el = $('#feedback')
  el.textContent = message
  el.classList.toggle('error', error)
  el.hidden = false
}
async function api(path, body) {
  const response = await fetch(path, {
    redirect: 'error',
    method: body ? 'POST' : 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: body
      ? {
          'Content-Type': 'application/json',
          ...(session ? { 'X-CSRF-Token': session.csrf } : {}),
        }
      : {},
    ...(body ? { body: JSON.stringify(body) } : {}),
  }).catch(() => {
    throw Error(
      '로그인 요청의 연결 또는 리디렉션이 차단되었습니다. Codespaces 포트 주소와 접근 권한을 확인하세요.',
    )
  })
  return responseData(response, path)
}
function scrollToPanel(id) {
  $(id).hidden = false
  $(id).scrollIntoView({
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'instant'
      : 'smooth',
    block: 'start',
  })
  $(id).querySelector('input')?.focus({ preventScroll: true })
}
for (const button of document.querySelectorAll('.login-trigger'))
  button.addEventListener('click', () => scrollToPanel('#access-panel'))
function busy(form, value) {
  for (const button of form.querySelectorAll('button')) button.disabled = value
}
function submit(id, work) {
  $(id).addEventListener('submit', async (e) => {
    e.preventDefault()
    const form = e.currentTarget
    busy(form, true)
    try {
      await work(Object.fromEntries(new FormData(form)), form)
    } catch (error) {
      feedback(error.message, true)
    } finally {
      busy(form, false)
    }
  })
}
submit('#login-form', async (body) => {
  await api('/api/login', body)
  location.assign('/calculator')
})
submit('#invite-form', async (body, form) => {
  if (body.password !== body.confirm)
    throw Error('비밀번호가 일치하지 않습니다.')
  await api('/api/accept-invite', {
    token: invitation,
    email: body.email,
    password: body.password,
  })
  invitation = null
  form.reset()
  $('#invite-panel').hidden = true
  feedback('계정이 활성화되었습니다. 새 비밀번호로 로그인하세요.')
  scrollToPanel('#access-panel')
})
async function loadUsers() {
  const data = await api('/api/admin/users')
  const list = $('#user-list')
  list.replaceChildren()
  for (const user of data.users) {
    const row = document.createElement('tr')
    for (const text of [
      user.email,
      user.role === 'owner' ? 'Super Admin' : 'Member',
      !user.active ? 'Revoked' : user.activated ? 'Allowed' : 'Invited',
    ]) {
      const td = document.createElement('td')
      td.textContent = text
      row.append(td)
    }
    const action = document.createElement('td')
    if (user.role !== 'owner' && user.active) {
      const button = document.createElement('button')
      button.textContent = 'Revoke access'
      button.setAttribute('aria-label', `Revoke ${user.email}`)
      button.addEventListener('click', async () => {
        const input = $('#invite-user-form input[name=currentPassword]')
        if (!input.value) {
          input.focus()
          return feedback(
            'Admin Password에 현재 비밀번호를 입력한 뒤 회수하세요.',
            true,
          )
        }
        if (!confirm(`${user.email}의 접근 권한과 기존 세션을 회수할까요?`))
          return
        button.disabled = true
        try {
          await api('/api/admin/revoke', {
            id: user.id,
            currentPassword: input.value,
          })
          input.value = ''
          await loadUsers()
          feedback('접근 권한과 세션을 회수했습니다.')
        } catch (e) {
          feedback(e.message, true)
        } finally {
          button.disabled = false
        }
      })
      action.append(button)
    } else action.textContent = '—'
    row.append(action)
    list.append(row)
  }
}
submit('#invite-user-form', async (body, form) => {
  const data = await api('/api/admin/invite', body)
  $('#invitation-link').value = data.url
  $('#invitation-result').hidden = false
  form.querySelector('[name=currentPassword]').value = ''
  await loadUsers()
  feedback('48시간 유효한 일회용 초대를 만들었습니다.')
})
$('#refresh-users').addEventListener('click', () =>
  loadUsers().catch((e) => feedback(e.message, true)),
)
$('#copy-invitation').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('#invitation-link').value)
    feedback('초대 링크를 복사했습니다.')
  } catch {
    $('#invitation-link').select()
    feedback('링크를 선택했습니다. 복사해서 안전하게 전달하세요.')
  }
})
$('#manage-access').addEventListener('click', () => {
  scrollToPanel('#admin-panel')
  loadUsers().catch((e) => feedback(e.message, true))
})
submit('#password-form', async (body, form) => {
  if (body.newPassword !== body.confirm)
    throw Error('비밀번호가 일치하지 않습니다.')
  await api('/api/change-password', body)
  form.reset()
  location.replace('/?changed=1')
})
$('#logout').addEventListener('click', async () => {
  try {
    await api('/api/logout', {})
    new BroadcastChannel('ivc-session').postMessage('logout')
    location.replace('/')
  } catch (e) {
    feedback(e.message, true)
  }
})
async function initialize() {
  const hash = new URLSearchParams(location.hash.slice(1))
  invitation = hash.get('invite')
  if (invitation) {
    history.replaceState(null, '', '/')
    scrollToPanel('#invite-panel')
  }
  try {
    session = await api('/api/session')
  } catch {
    session = null
  }
  if (session) {
    for (const el of document.querySelectorAll(
      '.login-trigger,.hero-actions,.access-note',
    ))
      el.hidden = true
    $('.workspace-entry').hidden = false
    $('#signed-in').textContent = session.user.email
    $('#logout').hidden = false
    $('#password-panel').hidden = false
    if (new URLSearchParams(location.search).has('account'))
      scrollToPanel('#password-panel')
    if (session.user.role === 'owner') {
      $('#manage-access').hidden = false
      if (new URLSearchParams(location.search).has('manage')) {
        scrollToPanel('#admin-panel')
        await loadUsers()
      }
    }
  } else if (new URLSearchParams(location.search).has('changed')) {
    feedback('비밀번호를 변경했습니다. 다시 로그인하세요.')
    scrollToPanel('#access-panel')
  } else if (new URLSearchParams(location.search).has('expired')) {
    feedback(
      '세션이 만료되었거나 접근 권한이 변경되었습니다. 다시 로그인하세요.',
    )
    scrollToPanel('#access-panel')
  }
}
initialize().catch(() =>
  feedback('서버에 연결하지 못했습니다. 잠시 후 새로고침하세요.', true),
)
```

<a id="source-6"></a>

## server/gateway/response.js

원본: [server/gateway/response.js](../../server/gateway/response.js) · 31줄 · SHA-256: `d932d11ed9d8eb68022d83f6f842bf02e5ce79298ab7915f10fb2f13bdb04dc3`

```text
/** Never treat an empty/HTML proxy response as successful authentication. */
export async function responseData(response, path) {
  const text = await response.text()
  let data
  if (text.trim()) {
    try {
      data = JSON.parse(text)
    } catch {
      /* The forwarder can return an HTML sign-in or error page. */
    }
  }
  if (!response.ok) {
    if (data && typeof data.error === 'string') throw Error(data.error)
    if (
      response.status === 401 &&
      path === '/api/login' &&
      response.headers.get('x-ivc-response') === 'json'
    )
      throw Error('이메일 또는 비밀번호를 확인하세요. (HTTP 401)')
    if (response.status === 429)
      throw Error('로그인 시도가 많습니다. 잠시 후 다시 시도하세요. (HTTP 429)')
    throw Error(
      `로그인 서버의 응답을 확인할 수 없습니다. Codespaces 포트 접근 권한과 서버 실행 상태를 확인하세요. (HTTP ${response.status})`,
    )
  }
  if (!data || typeof data !== 'object' || Array.isArray(data))
    throw Error(
      `서버가 비어 있거나 올바르지 않은 응답을 보냈습니다. 새로고침 후 다시 시도하세요. (HTTP ${response.status})`,
    )
  return data
}
```

<a id="source-7"></a>

## server/gateway/welcome.css

원본: [server/gateway/welcome.css](../../server/gateway/welcome.css) · 600줄 · SHA-256: `9c70190180c4f4774d836c9c59db268cbdb80d2da99aea746f426156bd353985`

```css
:root {
  font-family: Inter, Pretendard, 'Noto Sans KR', system-ui, sans-serif;
  color: #183b43;
  background: #f6f7f2;
  font-synthesis: none;
}
* {
  box-sizing: border-box;
}
body {
  margin: 0;
}
button,
input {
  font: inherit;
}
button,
a {
  -webkit-tap-highlight-color: transparent;
}
button {
  cursor: pointer;
}
a {
  color: inherit;
  text-decoration: none;
}
button {
  border: 1px solid #c7d7d2;
  border-radius: 6px;
  color: #234b50;
  background: transparent;
  padding: 11px 17px;
  font-size: 13px;
}
button:hover {
  background: #e9efea;
}
button:disabled {
  opacity: 0.55;
  cursor: wait;
}
button:focus-visible,
a:focus-visible,
input:focus-visible {
  outline: 3px solid #82b5a9;
  outline-offset: 4px;
}
[hidden] {
  display: none !important;
}
.site-header {
  height: 100px;
  max-width: 1440px;
  margin: auto;
  padding: 0 5%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #dce4dd;
  gap: 20px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 13px;
  font-size: 20px;
  font-weight: 650;
  letter-spacing: 1px;
}
.brand-icon {
  font:
    italic 34px Georgia,
    serif;
  letter-spacing: -6px;
  width: 48px;
  color: #225c56;
}
.brand-icon span {
  color: #839e66;
}
.brand small {
  display: block;
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 1.7px;
  margin-top: 4px;
  color: #6d837d;
}
nav {
  display: flex;
  gap: 24px;
  align-items: center;
  font-size: 13px;
}
nav > a {
  color: #667e77;
}
.subtle {
  border: none;
}
.hero {
  max-width: 1440px;
  padding: 90px 5% 80px;
  margin: auto;
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  gap: 60px;
  align-items: center;
}
.eyebrow {
  font-size: 10px;
  letter-spacing: 2px;
  line-height: 1.8;
  font-weight: 650;
  color: #627f70;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.eyebrow i {
  width: 6px;
  height: 6px;
  background: #689c80;
  border-radius: 50%;
  box-shadow: 0 0 0 4px #689c8016;
}
h1 {
  font-size: clamp(34px, 3.7vw, 56px);
  line-height: 1.42;
  letter-spacing: -2.4px;
  font-weight: 620;
  margin: 28px 0;
}
h1 em {
  font-style: normal;
  color: #387365;
  position: relative;
}
h1 em:after {
  content: '';
  height: 5px;
  background: #c6d8b6;
  position: absolute;
  bottom: 1px;
  left: 0;
  right: 0;
  z-index: -1;
  transform: rotate(-2deg);
}
.hero-copy > p {
  color: #657d76;
  line-height: 2;
  font-size: 15px;
  margin: 24px 0 32px;
}
.hero-actions,
.workspace-entry {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}
.primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 28px;
  background: #245b53;
  color: #fff;
  border: 1px solid #245b53;
  border-radius: 5px;
  padding: 14px 22px;
  font-size: 13px;
  min-height: 46px;
}
.primary:hover {
  background: #1b4842;
}
.hero-actions > a {
  font-size: 12px;
  color: #6e8478;
}
.access-note {
  display: block;
  font-size: 11px;
  color: #839288;
  margin-top: 24px;
}
.hero-visual {
  position: relative;
  border: 1px solid #d1dfd5;
  border-radius: 18px;
  background: linear-gradient(140deg, #eef3e8, #f7f8f2);
  padding: 22px;
  box-shadow: 0 25px 65px #304c3a08;
  transform: rotate(1.5deg);
}
.visual-label {
  display: flex;
  justify-content: space-between;
  font:
    10px ui-monospace,
    monospace;
  letter-spacing: 1.5px;
  color: #829388;
}
.relationship {
  width: 100%;
  display: block;
  overflow: visible;
}
.plot-axis {
  stroke: #b4c9c0;
  stroke-width: 1.5;
  fill: none;
}
.ghost-curve {
  stroke: #d0dcbf;
  stroke-width: 2;
  fill: none;
  stroke-dasharray: 5 7;
}
.main-curve {
  stroke: #3a7a6c;
  stroke-width: 3;
  fill: none;
  stroke-linecap: round;
}
.second-curve {
  stroke: #acb47a;
  stroke-width: 2.5;
  fill: none;
  stroke-linecap: round;
}
.relationship text {
  fill: #8ca093;
  font:
    italic 15px Georgia,
    serif;
}
.traveler {
  fill: #245b53;
  stroke: #fff;
  stroke-width: 4;
  offset-path: path('M40 380C230 370 400 290 310 230S200 95 520 55');
  animation: explore 15s ease-in-out infinite alternate;
}
.fixed-point {
  fill: #f6f7f2;
  stroke: #3a7a6c;
  stroke-width: 2;
}
.visual-readout {
  border-top: 1px solid #d7e1d3;
  padding: 17px 6px 3px;
  display: grid;
  gap: 8px;
  font-size: 11px;
  color: #7c8c7f;
}
.visual-readout strong {
  color: #496d5d;
  font-size: 13px;
  font-weight: 500;
}
.visual-readout i {
  display: inline-block;
  width: 5px;
  height: 5px;
  background: #74956c;
  margin-right: 6px;
  border-radius: 50%;
}
.float-formula {
  position: absolute;
  right: -18px;
  bottom: 110px;
  background: #fffdf7;
  border: 1px solid #dfdfd0;
  border-radius: 8px;
  box-shadow: 0 8px 32px #4b5f3710;
  padding: 14px 23px;
  font:
    italic 21px Georgia,
    serif;
  color: #718260;
  transform: rotate(-5deg);
}
.approach {
  max-width: 1440px;
  margin: 0 auto;
  padding: 55px 5% 70px;
  border-top: 1px solid #dce4dd;
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 50px;
}
.section-intro h2 {
  font-size: 24px;
  font-weight: 550;
  line-height: 1.7;
  letter-spacing: -0.8px;
  margin: 14px 0;
}
.principles {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 25px;
  padding-top: 5px;
}
.principles article > span {
  font:
    10px ui-monospace,
    monospace;
  letter-spacing: 1px;
  color: #8a9a8d;
}
.principles h3 {
  font-size: 15px;
  font-weight: 600;
  margin-top: 20px;
}
.principles p {
  font-size: 12px;
  color: #718478;
  line-height: 1.95;
}
.access-card,
.admin-panel {
  max-width: 1160px;
  margin: 20px auto 60px;
  border: 1px solid #cedcd3;
  background: #fff;
  border-radius: 12px;
  padding: 38px;
  scroll-margin-top: 25px;
}
.access-card {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
}
.access-card h2,
.admin-title h2 {
  margin: 12px 0;
  font-size: 26px;
  letter-spacing: -0.5px;
}
.access-card p,
.admin-title p,
.admin-note {
  color: #6d8078;
  font-size: 13px;
  line-height: 1.9;
}
.access-card form {
  display: grid;
  gap: 18px;
}
label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12px;
  font-weight: 550;
  color: #59746b;
}
input {
  width: 100%;
  min-width: 0;
  background: #fafbf9;
  border: 1px solid #cddbd4;
  border-radius: 5px;
  padding: 12px 14px;
  color: #25463e;
  font-size: 14px;
}
small {
  font-size: 11px;
  color: #7f8e83;
}
.access-card .primary {
  margin-top: 3px;
}
.workspace-entry > span {
  font-size: 11px;
  color: #6c8176;
}
.admin-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 25px;
}
.invite-user-form {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 18px;
  align-items: end;
  margin: 25px 0;
}
.user-table {
  overflow: auto;
  margin-top: 25px;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  text-align: left;
}
th,
td {
  border-bottom: 1px solid #dee6de;
  padding: 13px 10px;
}
th {
  background: #f4f7f2;
  color: #597266;
  font-weight: 550;
}
td {
  color: #49675b;
}
td button {
  padding: 7px 11px;
  font-size: 12px;
  color: #935d45;
}
.badge {
  font:
    11px ui-monospace,
    monospace;
}
.admin-note {
  font-size: 12px;
}
#invitation-result {
  padding: 20px;
  background: #f2f7ef;
  border: 1px solid #dce6d4;
  border-radius: 6px;
}
#invitation-result p {
  font-size: 12px;
  color: #6a8068;
  line-height: 1.8;
}
#invitation-result button {
  margin-top: 10px;
}
#feedback {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  width: max-content;
  max-width: calc(100vw - 32px);
  z-index: 10;
  background: #264f48;
  color: #fff;
  border: 1px solid #476d63;
  padding: 14px 22px;
  border-radius: 7px;
  font-size: 13px;
  line-height: 1.8;
  box-shadow: 0 5px 25px #213c3320;
}
#feedback.error {
  background: #713c34;
  border-color: #99584c;
}
footer {
  max-width: 1440px;
  margin: auto;
  border-top: 1px solid #dce4dd;
  padding: 25px 5% 35px;
  display: flex;
  justify-content: space-between;
  gap: 20px;
  font-size: 10px;
  color: #859287;
  letter-spacing: 0.5px;
}
@keyframes explore {
  0%,
  5% {
    offset-distance: 0%;
  }
  95%,
  100% {
    offset-distance: 100%;
  }
}
@media (max-width: 1000px) {
  .hero {
    gap: 28px;
    padding-top: 65px;
  }
  .approach {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .access-card,
  .admin-panel {
    margin-inline: 5%;
  }
  .hero-visual {
    padding: 16px;
  }
  .brand small {
    font-size: 8px;
  }
  .hero-copy > p {
    font-size: 13px;
  }
}
@media (max-width: 680px) {
  .site-header {
    height: 80px;
  }
  .site-header nav > a {
    display: none;
  }
  .brand {
    font-size: 18px;
  }
  .brand small {
    letter-spacing: 0.5px;
  }
  .hero {
    grid-template-columns: 1fr;
    padding-block: 45px;
    gap: 38px;
  }
  h1 {
    font-size: 38px;
    letter-spacing: -1.8px;
  }
  .hero-visual {
    max-width: 480px;
    width: 100%;
    margin: auto;
    transform: none;
  }
  .float-formula {
    right: 8px;
    bottom: 80px;
  }
  .principles {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  .principles article {
    border-top: 1px solid #dde5d9;
    padding-top: 18px;
  }
  .principles h3 {
    margin-top: 10px;
  }
  .access-card {
    grid-template-columns: 1fr;
    gap: 20px;
    padding: 24px;
  }
  .admin-panel {
    padding: 22px;
  }
  .invite-user-form {
    grid-template-columns: 1fr;
  }
  .admin-title {
    align-items: start;
  }
  .approach {
    padding-block: 35px;
  }
  .hero-actions {
    gap: 16px;
  }
  footer {
    flex-direction: column;
    gap: 9px;
  }
  .user-table th,
  .user-table td {
    font-size: 12px;
    padding: 10px 8px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .traveler {
    animation: none;
    offset-distance: 55%;
  }
  * {
    scroll-behavior: auto !important;
  }
}
```

<a id="source-8"></a>

## src/components/chart-domain.ts

원본: [src/components/chart-domain.ts](../../src/components/chart-domain.ts) · 85줄 · SHA-256: `1c0901a9485e4f31d9765bb66e6d107f68625a10f857a4f0f5bb6e6944597337`

```typescript
export type ChartDomain = [number, number, number[]]

// Weighted interpolation and normalized coordinates avoid overflowing the span
// when finite endpoints have opposite signs near Number.MAX_VALUE.
export function interpolate(min: number, max: number, ratio: number): number {
  if (ratio === 0) return min
  if (ratio === 1) return max
  const span = max - min
  if (Number.isFinite(span)) return min + span * ratio
  return min * (1 - ratio) + max * ratio
}

export function fraction(value: number, min: number, max: number): number {
  const scale = Math.max(Math.abs(min), Math.abs(max))
  if (!scale || min === max) return 0.5
  return (value / scale - min / scale) / (max / scale - min / scale)
}

/** Fit visible values, preserving variation even for roots far from zero. */
export function fittedDomain(values: readonly number[]): ChartDomain {
  let min = Infinity
  let max = -Infinity
  for (const value of values) {
    if (!Number.isFinite(value)) continue
    min = Math.min(min, value)
    max = Math.max(max, value)
  }
  if (min === Infinity) return [0, 1, [0, 0.25, 0.5, 0.75, 1]]

  // Compute the padding before subtracting large endpoints. A single constant
  // also needs a local range, rather than an axis anchored at zero.
  const padding =
    min === max
      ? min === 0
        ? 1
        : Math.max(Math.abs(min) * 0.05, Number.MIN_VALUE)
      : Math.max(max * 0.08 - min * 0.08, Number.MIN_VALUE)
  const paddedMin = min - padding
  const paddedMax = max + padding
  if (Number.isFinite(paddedMin)) min = paddedMin
  if (Number.isFinite(paddedMax)) max = paddedMax

  const fallback = (): ChartDomain => [
    min,
    max,
    [
      ...new Set(
        Array.from({ length: 5 }, (_, i) => interpolate(min, max, i / 4)),
      ),
    ],
  ]
  const rawStep = max / 4 - min / 4
  if (!Number.isFinite(rawStep) || rawStep <= 0) return fallback()
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  if (!Number.isFinite(magnitude) || magnitude === 0) return fallback()
  const factor = rawStep / magnitude
  const step =
    (factor <= 1
      ? 1
      : factor <= 2
        ? 2
        : factor <= 2.5
          ? 2.5
          : factor <= 5
            ? 5
            : 10) * magnitude
  if (!Number.isFinite(step) || step <= 0) return fallback()
  const roundedMin = Math.floor(min / step) * step
  const roundedMax = Math.ceil(max / step) * step
  if (Number.isFinite(roundedMin) && roundedMin <= min) min = roundedMin
  if (Number.isFinite(roundedMax) && roundedMax >= max) max = roundedMax
  const count = Math.round(max / step - min / step)
  if (!Number.isFinite(count) || count < 1 || count > 20) return fallback()
  return [
    min,
    max,
    [
      ...new Set(
        Array.from({ length: count + 1 }, (_, i) =>
          interpolate(min, max, i / count),
        ),
      ),
    ],
  ]
}
```

<a id="source-9"></a>

## src/components/chart-interaction.ts

원본: [src/components/chart-interaction.ts](../../src/components/chart-interaction.ts) · 116줄 · SHA-256: `e479b0f5db5855a4ec7606b34f944659ee0d8c7e544294a554729e7c611fce1c`

```typescript
import { fraction, interpolate } from './chart-domain'

export type CurvePoint = {
  parameter: number
  values: number[] | null
  error?: string
}

export type AxisWindow = [number, number]
export type ChartWindow = { x: AxisWindow; y: AxisWindow }
export type ZoomAxis = 'both' | 'x' | 'y'

export const initialWindow = (): ChartWindow => ({ x: [0, 1], y: [0, 1] })

/** Evaluate the displayed polyline, rather than snapping to the table's
 * usually much coarser interval. Null solve points always split a branch. */
export function pointOnCurve(
  points: readonly CurvePoint[],
  parameter: number,
): CurvePoint | null {
  if (!points.length || !Number.isFinite(parameter)) return null
  let low = 0
  let high = points.length - 1
  if (parameter < points[low].parameter || parameter > points[high].parameter)
    return null
  while (low <= high) {
    const middle = (low + high) >>> 1
    const sample = points[middle]
    if (sample.parameter === parameter) return { ...sample }
    if (sample.parameter < parameter) low = middle + 1
    else high = middle - 1
  }
  const left = points[high]
  const right = points[low]
  if (!left || !right) return null
  if (!left.values || !right.values)
    return {
      parameter,
      values: null,
      error: left.error || right.error || '이 구간에는 추적한 해가 없습니다.',
    }
  const ratio = fraction(parameter, left.parameter, right.parameter)
  return {
    parameter,
    values: left.values.map((value, index) =>
      Number.isFinite(value) && Number.isFinite(right.values![index])
        ? interpolate(value, right.values![index], ratio)
        : NaN,
    ),
  }
}

export function nearestPointIndex(
  coordinates: readonly { parameter: number; index: number }[],
  parameter: number,
): number {
  if (!coordinates.length || !Number.isFinite(parameter)) return -1
  let low = 0
  let high = coordinates.length
  while (low < high) {
    const middle = (low + high) >>> 1
    if (coordinates[middle].parameter < parameter) low = middle + 1
    else high = middle
  }
  if (low === 0) return coordinates[0].index
  if (low === coordinates.length) return coordinates[low - 1].index
  const left = coordinates[low - 1]
  const right = coordinates[low]
  // Normalize first so opposite extreme finite endpoints cannot overflow.
  const ratio = fraction(parameter, left.parameter, right.parameter)
  return ratio <= 0.5 ? left.index : right.index
}

/** A notch changes the span by about 20%. Limits prevent an unusably tiny
 * window, floating-point collapse, and accidental unlimited zooming out. */
export function zoomAxis(
  window: AxisWindow,
  anchorRatio: number,
  factor: number,
): AxisWindow {
  if (!Number.isFinite(factor) || factor <= 0 || !Number.isFinite(anchorRatio))
    return window
  const ratio = Math.min(1, Math.max(0, anchorRatio))
  const span = Math.min(8, Math.max(1 / 128, (window[1] - window[0]) * factor))
  if (span === 8) return [-3.5, 4.5]
  const anchor = interpolate(window[0], window[1], ratio)
  let min = anchor - ratio * span
  let max = min + span
  if (min < -3.5) {
    max += -3.5 - min
    min = -3.5
  }
  if (max > 4.5) {
    min -= max - 4.5
    max = 4.5
  }
  return [min, max]
}

export function zoomWindow(
  window: ChartWindow,
  axis: ZoomAxis,
  xRatio: number,
  yRatio: number,
  factor: number,
): ChartWindow {
  return {
    x: axis === 'y' ? window.x : zoomAxis(window.x, xRatio, factor),
    y: axis === 'x' ? window.y : zoomAxis(window.y, yRatio, factor),
  }
}

export function wheelFactor(deltaY: number, deltaMode = 0): number {
  const pixels = deltaY * (deltaMode === 1 ? 16 : deltaMode === 2 ? 600 : 1)
  return Math.exp(Math.max(-120, Math.min(120, pixels)) * 0.0015)
}
```

<a id="source-10"></a>

## src/components/EquationReference.tsx

원본: [src/components/EquationReference.tsx](../../src/components/EquationReference.tsx) · 186줄 · SHA-256: `87f0c3b4d66825b838404d622e335ce0f6875bce88093df6d2216991d884447f`

```tsx
const functions = [
  [
    '삼각함수',
    'sin(x), cos(x), tan(x)',
    '각도는 라디안. tan은 π/2+kπ에서 정의되지 않습니다.',
  ],
  [
    '역삼각함수',
    'asin(x), acos(x), atan(x)',
    'asin·acos의 실수 정의역은 −1 ≤ x ≤ 1입니다.',
  ],
  [
    '쌍곡함수',
    'sinh(x), cosh(x), tanh(x)',
    '반응·열역학 등의 비선형 모델에 사용합니다.',
  ],
  [
    '지수·로그',
    'exp(x), ln(x), log(x), log10(x)',
    'ln은 자연로그, log·log10은 밑 10. 로그 인수는 양수입니다.',
  ],
  [
    '제곱근·절댓값',
    'sqrt(x), abs(x)',
    'sqrt의 실수 인수는 0 이상. abs의 꺾인 점은 매끄러운 접점과 다릅니다.',
  ],
  [
    '거듭제곱·비교',
    'pow(x, 2), min(x, y), max(x, y)',
    'pow는 x^2와 같은 용도입니다. min·max는 두 인수를 받습니다.',
  ],
]
export default function EquationReference() {
  return (
    <section
      className="guide-section guide-reference"
      aria-label="Equation Solver 함수·문법 공식집"
    >
      <div>
        <h3>함수·문법 공식집</h3>
        <p>
          Linear는 미지수에 대해 선형인 식, Nonlinear는 아래 내장 함수를 포함한
          실수 방정식을 풉니다. 함수 이름은 대소문자를 허용하지만 변수 x와 X는
          구분합니다.
        </p>
        <h4>입력 규칙</h4>
        <ul>
          <li>
            <code>2x + y = 10</code>: 등호 양쪽에 식을 씁니다. 여러 등식은
            줄바꿈·쉼표·세미콜론으로 구분할 수 있습니다. 일반 등식의 이름은
            미지수이며 상수를 자동 추측하지 않습니다.
          </li>
          <li>
            <code>+ - * / ^</code>와 괄호를 사용합니다. <code>-2^2 = -4</code>,{' '}
            <code>(-2)^2 = 4</code>, <code>2^3^2 = 512</code>입니다.
          </li>
          <li>
            <code>2x</code>, <code>2(x+1)</code>처럼 곱셈을 생략할 수 있습니다.
            혼동을 피하려면 <code>x*(y+1)</code>처럼 *를 적습니다.
          </li>
          <li>
            <code>1e-3</code>은 0.001, <code>#</code> 뒤는 주석입니다. 이름은
            영문자로 시작하고 영문·숫자·밑줄을 사용합니다.
          </li>
          <li>
            Nonlinear 내장 상수는 <code>pi</code>, <code>e</code>입니다.
            Linear에서는 기존 파일 호환을 위해 같은 이름을 일반 변수로
            취급합니다.
          </li>
        </ul>
        <h4>여러 등식·단위 주석</h4>
        <pre>
          {
            '2x + y = x - y + 8 = 10\na = 3.59, b = 0.0427, R = 0.08314, T = 280\nf1(x) = 2x + 4 = 0'
          }
        </pre>
        <p>
          첫 줄은 두 등식이며 x=4, y=2입니다. 쉼표·세미콜론으로 등식을 나누거나
          연쇄 등호를 쓸 수 있습니다. 숫자로 고정된 변수도 계산 결과에 남습니다.
          f1(x)는 정의 후 0과 같게 두므로 x=−2입니다. 위 세 줄은 각각 별개의
          문법 예시입니다.
        </p>
        <p>
          숫자 뒤 공백과 괄호의 <code>280 (K)</code>,{' '}
          <code>3.59 (L^2·bar/mol^2)</code>는 알려진 단위의 주석으로 읽습니다.
          단위 환산·차원 검사는 수행하지 않으므로 같은 단위 체계의 수치를
          입력하세요. 해당 기호가 변수나 파라미터로 사용되면 곱셈 의미를
          유지합니다. 곱셈을 의도하면 <code>2*K</code>처럼 *를 명시하세요.
        </p>
        <p>
          붙여넣기는 코드 블록 테두리와 특수 마이너스를 정리합니다. 수식 줄
          번호는 편집기의 실제 행이고, 방정식 개수는 연쇄 등식 등을 나눈 논리적
          등식 수입니다.
        </p>
        <h4>함수·혼합식 정의</h4>
        <pre>{'f1(x) = 2x + 4\nf2(x) = -3x + 7\nf1(x) - f2(x) = 0'}</pre>
        <p>
          위 식의 해는 x=0.6입니다. 함수 번호는 f1, f2처럼 구분합니다. f1(x)는
          x와 등록한 파라미터로 정의하고 x를 포함한 인수나 숫자로 호출합니다.
          다른 미지수 y를 넣으려면 별도로 정의하세요. 정의 뒤{' '}
          <code>f1(x)=0</code>은 방정식입니다.
        </p>
        <pre>
          {'f1 = 2x + y - 10\nf2 = x - y - 2\nf1 + f2 = 0\nf1 - f2 = 0'}
        </pre>
        <p>
          미지수를 혼합하려면 괄호 없는 수식 이름을 사용합니다. 함수 합성{' '}
          <code>f1(f2(x))</code>도 가능하며 순환 정의는 금지합니다.
        </p>
        <h4>Nonlinear 내장 함수</h4>
        <div
          className="guide-table-scroll"
          tabIndex={0}
          aria-label="지원 함수 표"
        >
          <table>
            <thead>
              <tr>
                <th>종류</th>
                <th>표기</th>
                <th>의미·정의역</th>
              </tr>
            </thead>
            <tbody>
              {functions.map(([kind, syntax, note]) => (
                <tr key={kind}>
                  <td>{kind}</td>
                  <td>
                    <code>{syntax}</code>
                  </td>
                  <td>{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h4>탐색 창과 비매끄러운 식</h4>
        <p>
          고급 탐색 설정에서 미지수별 최솟값·최댓값을 지정할 수 있습니다.
          지정하지 않으면 공통 범위를 따릅니다. 일반 함수의 기본 범위는
          −100~100이며, 다항식·유리식은 계수 기반 자동 범위도 사용합니다.
        </p>
        <p>
          <code>sin(1000*x)=0</code>처럼 분석 가능한 주기식은 최대 32개 표시
          한도에 맞춰 탐색 창을 줄입니다. 표시된 최대 폭을 넘길 수 없고 ‘탐색 창
          중심’으로 위치를 옮길 수 있습니다. 일반 함수는 관찰한 근의 밀도로 줄일
          수 있지만 모든 근을 찾았다는 증명은 아닙니다.
        </p>
        <p>
          <code>floor(x)</code>는 내림, <code>ceil(x)</code>은 올림,{' '}
          <code>sign(x)</code>은 부호입니다. abs·min·max 등을 포함한 비매끄러운
          스칼라 식에는 미분 없는 탐색을 사용합니다. 0이 이어지는 구간은
          대표값으로 표시하며, 매끄러운 접점 차수를 붙이지 않습니다. 비매끄러운
          다변수계의 미분 없는 탐색은 아직 지원하지 않습니다.
        </p>
        <h4>계산·시뮬레이션 읽기</h4>
        <p>
          고급 탐색 설정의 ‘구간 검증 사용’을 켜면 현재 탐색 범위를 작은
          구간으로 나누어 해 부재와 단순근의 유일성을 추가 검증합니다. 결과
          탐색과 리포트에서 검증 범위·유일근 구간·미결정 구간을 확인하고 ‘구간
          검증 저장’으로 내보낼 수 있습니다. 검증한 길이 비율은 해를 모두 찾았을
          확률이 아닙니다. 미결정 구간이 있으면 전체 검증은 보류되며,
          연립식·일부 연산은 아직 구간 검증을 지원하지 않습니다.
        </p>
        <p>
          조절할 상수는 파라미터에 등록합니다. 값은 연속 조절하며 샘플 포인트
          간격은 표·CSV·그래프 마커에만 적용합니다. 병합 세트는 여러 해를 색으로
          비교합니다. 범위·다른 고정 파라미터를 유지하면 현재값 조절로 기준
          곡선을 바꾸지 않습니다.
        </p>
        <p>
          자동 탐색은 유한한 수치 탐색이며 모든 실근을 보장하지 않습니다. ‘추적
          불가’는 실근 부재의 증명이 아닙니다. 접점 ‘확인됨’은 등식 오차와 1~8차
          도함수의 국소 수치 검증이며 일반 Cusp 분기의 엄밀한 증명을 뜻하지
          않습니다.
        </p>
        <p>
          고급 수동 모드도 <code>x^2=4</code>처럼 등식을 씁니다.{' '}
          <code>x(0)=1</code>, <code>x(min)=0</code>, <code>x(max)=10</code>으로
          초기값·범위를 지정할 수 있습니다. 새 함수 모델에는 번호 있는 표기를
          권장합니다.
        </p>
      </div>
    </section>
  )
}
```

<a id="source-11"></a>

## src/components/ExampleWalkthrough.tsx

원본: [src/components/ExampleWalkthrough.tsx](../../src/components/ExampleWalkthrough.tsx) · 32줄 · SHA-256: `bf3a9a6c4e717769e8f9a991d977d1e1e0f6cffa0eef5901431c1cf095dc1ea0`

```tsx
import type { NonlinearExample } from '../models'

export default function ExampleWalkthrough({
  example,
}: {
  example: NonlinearExample
}) {
  const guide = example.guide
  if (!guide) return null
  return (
    <details className="example-walkthrough">
      <summary>
        예제 관찰 안내 <span>{guide.features.join(' · ')}</span>
      </summary>
      <div>
        <p>{guide.context}</p>
        <ol>
          {guide.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <a href={guide.reference.url} target="_blank" rel="noreferrer">
          모형 배경: {guide.reference.label} ↗
        </a>
        <small>
          교과서 모형에 교육용 파라미터를 적용한 예제입니다. 접점 표시는 국소
          수치 검증이며 실제 장치·물질의 임계값을 뜻하지 않습니다.
        </small>
      </div>
    </details>
  )
}
```

<a id="source-12"></a>

## src/components/AnalysisSummary.tsx

원본: [src/components/AnalysisSummary.tsx](../../src/components/AnalysisSummary.tsx) · 423줄 · SHA-256: `f2ffc9481608ed161d45a5d1575f6cfc60ba4b293360b41bb8519d6154a7d585`

```tsx
import { useMemo, useState } from 'react'
import type { BranchTerminalEvent, SearchSummary, SolveResult } from '../engine'
import {
  coveragePercent,
  reportDiagnostics,
  searchConclusion,
} from '../engine/report-diagnostics'
import { eventLocation, uniqueBranchEvents } from '../engine/branch-events'
import CertificationReport from './CertificationReport'
import { currentCertificate, certifiedConclusion } from './certification-view'
import './AnalysisSummary.css'

export const diagnosticNumber = (n?: number) =>
  n === undefined || Number.isNaN(n)
    ? '—'
    : !Number.isFinite(n)
      ? '∞'
      : n === 0
        ? '0'
        : Math.abs(n) < 1e-3 || Math.abs(n) >= 1e6
          ? n.toExponential(3)
          : Number(n.toPrecision(6)).toString()

function boundNumber(n: number) {
  if (!Number.isFinite(n) || n === 0) return diagnosticNumber(n)
  const text = n.toExponential(3)
  if (Number(text) >= n) return text
  const [m, e] = text.split('e')
  const up = `${(Number(m) + 0.001).toFixed(3)}e${e}`
  return Number(up) >= n ? up : n.toString()
}

type Props = {
  result: SolveResult
  source: string
  parameters: Record<string, number>
  search?: SearchSummary | null
  events?: BranchTerminalEvent[]
  sweepName: string
  pending: boolean
  inputNoiseSigma?: number
  onInputNoiseSigmaChange?: (sigma: number) => void
}
export default function AnalysisSummary({
  result,
  source,
  parameters,
  search,
  events = [],
  sweepName,
  pending,
  inputNoiseSigma,
  onInputNoiseSigmaChange,
}: Props) {
  const [perturbation, setPerturbation] = useState('0.000001')
  const d = useMemo(
    () => reportDiagnostics(result, source, parameters, search),
    [result, source, JSON.stringify(parameters), search],
  )
  const critical = uniqueBranchEvents(events)
  const c = currentCertificate(search?.certification, source, parameters)
  const delta = Number(perturbation)
  const response =
    perturbation.trim() && Number.isFinite(delta) && delta >= 0
      ? d.powerResponse
        ? (d.powerResponse.coefficient * delta) ** (1 / d.powerResponse.order)
        : d.amplification !== undefined
          ? d.amplification * delta
          : undefined
      : undefined
  const linear = result.kind !== 'nonlinear'
  const root = result.rootStructure
  const rootKind = linear
    ? 'Unique Solution'
    : result.variables.length > 1
      ? d.rank === result.variables.length
        ? `Regular System · Rank ${d.rank}/${result.variables.length}`
        : d.rank === undefined
          ? 'System Solution · Rank not evaluated'
          : `Singular System · Rank ${d.rank}/${result.variables.length}`
      : root?.kind === 'multiple'
        ? `Multiple Root · Order ${root.order ?? '?'}`
        : root?.kind === 'boundary'
          ? 'Boundary Root'
          : root?.kind === 'nonsmooth'
            ? 'Nonsmooth Root'
            : root?.kind === 'simple'
              ? 'Simple Root'
              : 'Root · Order not classified'
  return (
    <section
      className="analysis-summary"
      aria-label="해의 품질과 검증"
      aria-busy={pending}
    >
      <div className="analysis-verdict">
        <span
          className="analysis-root-kind"
          data-kind={result.rootStructure?.kind ?? 'simple'}
        >
          {root?.kind === 'multiple' ? '◆' : '●'} {rootKind}
        </span>
        <h3>
          {pending
            ? '현재 입력 검증 중…'
            : c
              ? certifiedConclusion(c).title
              : searchConclusion(
                  search?.certification ? undefined : search,
                  linear,
                )}
        </h3>
        {c && (
          <p>
            {c.variable} ∈ [{diagnosticNumber(c.domain.min)},{' '}
            {diagnosticNumber(c.domain.max)}] · 현재 파라미터에서 검증
          </p>
        )}
      </div>
      <div className="quality-grid analysis-table-scroll">
        <table className="quality-table">
          <caption className="visually-hidden">
            Accuracy, Sensitivity and Verification
          </caption>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
              <th>Interpretation</th>
            </tr>
          </thead>
          <tbody>
            <tr
              data-quality={
                d.errorBound !== undefined ? 'verified' : 'measured'
              }
            >
              <th scope="row">
                {d.errorBound !== undefined
                  ? 'Absolute Error Bound'
                  : 'Last Correction'}
              </th>
              <td className="quality-value">
                {d.errorBound !== undefined ? '≤ ' : '≈ '}
                {d.errorBound !== undefined
                  ? boundNumber(d.errorBound)
                  : diagnosticNumber(
                      d.correction ? Math.max(...d.correction) : undefined,
                    )}
              </td>
              <td>
                <span>
                  {d.errorBound !== undefined
                    ? '입력한 모델에서 확인한 위치 오차의 상한'
                    : d.powerResponse
                      ? '중근에서는 아래의 비선형 변화 크기를 확인하세요.'
                      : '현재 해에 남은 수치 보정량의 국소 추정'}
                </span>
                <details className="metric-help">
                  <summary>이 수치 읽는 법</summary>
                  <p>
                    {d.errorBound !== undefined
                      ? '표시한 해와 수학적 해 사이의 거리가 이 값 이하라는 뜻입니다. 예를 들어 ≤ 0.0001이면 해의 위치가 표시한 숫자에서 최대 0.0001만큼 떨어져 있을 수 있습니다. 입력한 식과 파라미터를 고정한 계산 오차이며, 측정값의 오차까지 포함하지는 않습니다. 작은 값일수록 해의 위치를 좁게 확인했다는 뜻입니다.'
                      : '현재 계산값에 남아 있는 등식 오차를 줄이려면 해를 얼마나 더 움직여야 하는지 추정한 값입니다. 작을수록 식을 잘 만족하지만, 엄밀한 오차 상한이나 정확한 소수 자릿수 보장은 아닙니다. 특히 평탄한 중근 근처에서는 아래 Sensitivity와 함께 확인하세요.'}
                  </p>
                </details>
              </td>
            </tr>
            <tr>
              <th scope="row">
                {d.powerResponse
                  ? 'Nonlinear Sensitivity'
                  : 'Absolute Sensitivity'}
              </th>
              <td className="quality-value">
                {d.powerResponse
                  ? `δ¹⁄${d.powerResponse.order}`
                  : d.amplification === undefined
                    ? '—'
                    : `${diagnosticNumber(d.amplification)} ×`}
              </td>
              <td>
                <span>
                  {d.powerResponse
                    ? `${d.powerResponse.order}중근: 입력 오차와 해 변화가 비례하지 않습니다.`
                    : '등식에 생긴 작은 절대 오차가 해의 변화로 전달되는 크기'}
                </span>
                <details className="metric-help">
                  <summary>이 수치 읽는 법</summary>
                  <p>
                    등식의 우변에 생긴 작은 절대 오차가 해의 절대 변화로 얼마나
                    커질지 나타냅니다. 예를 들어 0.736896×라면 등식 오차
                    0.0003에 대해 해 변화는 약 0.0002211로 예상합니다. 값이
                    클수록 같은 오차에 더 민감합니다. 단위를 바꾸면 숫자도
                    달라지므로 서로 다른 단위의 문제끼리 숫자만 비교하지 마세요.
                    이 값은 계산 성공률이나 정답일 확률이 아닙니다.
                  </p>
                  <p>
                    Absolute Error Bound는 입력을 고정했을 때의 계산 위치
                    오차입니다. Sensitivity는 입력 자체가 바뀔 때 해가 얼마나
                    움직이는지를 예상합니다. Multiple Root에서는 작은 오차에
                    근이 새로 생기거나 없어질 수 있어 선형 배율 대신 비선형 반응
                    차수를 표시합니다. 아래 Input Error Scenario에서 실제 변화
                    크기를 살펴볼 수 있습니다.
                  </p>
                </details>
              </td>
            </tr>
            <tr
              data-quality={
                c?.complete && c.allRootsRepresented ? 'verified' : 'measured'
              }
            >
              <th scope="row">{linear ? 'Rank' : 'Verified Coverage'}</th>
              <td className="quality-value">
                {linear
                  ? `${d.rank ?? '—'} / ${result.values.length}`
                  : c
                    ? coveragePercent(search)
                    : '—'}
              </td>
              <td>
                <span>
                  {linear
                    ? '독립적인 조건 수 / 미지수 수'
                    : c
                      ? `${c.uniqueRootCount} Root Interval · ${c.unresolved.length} Unresolved`
                      : (search?.certificationUnavailable ??
                        '지원하는 단일 변수 자동 탐색에서 계산합니다.')}
                </span>
                <details className="metric-help">
                  <summary>이 수치 읽는 법</summary>
                  <p>
                    {linear
                      ? '미지수 개수와 Rank가 같으면 독립적인 조건이 충분한 선형계입니다. 예를 들어 Rank 3 / 3이면 세 미지수를 정할 독립적인 조건 세 개가 있습니다. 같은 조건을 반복해 입력하면 Rank는 늘어나지 않습니다. Rank가 부족하면 해가 없거나 무한히 많을 수 있어 추가 조건을 확인해야 합니다.'
                      : '현재 파라미터와 표시한 미지수 범위에서, 근의 존재·부재가 판정된 길이의 비율입니다. 예를 들어 99.9%이면 나머지 좁은 구간에 추가 근이 있을 가능성을 아직 배제하지 못했다는 뜻입니다. 100%로 반올림되어도 Unresolved가 남았는지와 결과 목록의 일치 여부를 함께 확인해야 합니다. 전체 실수 영역이나 파라미터 변화 전체를 검증한 값도, 모든 근을 찾았을 확률도 아닙니다. 맨 위의 전체 근 확인 여부가 최종 판정입니다.'}
                  </p>
                </details>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {!linear && (
        <CertificationReport
          certificate={c}
          pending={pending}
          inputNoiseSigma={inputNoiseSigma}
          onInputNoiseSigmaChange={onInputNoiseSigmaChange}
          truncated={search?.truncated}
        />
      )}
      <details className="analysis-details sensitivity-detail">
        <summary>
          Input Error Scenario · 입력이 흔들리면 해는 얼마나 달라질까요?
        </summary>
        <div className="sensitivity-scenario">
          <div>
            <h4>Input Error Scenario</h4>
            <details className="metric-help">
              <summary>어떤 오차를 입력하나요?</summary>
              <p>
                각 등식의 우변이 흔들릴 수 있는 절대 크기를 입력합니다. 측정
                오차를 알고 있다면 현재 등식의 단위로 환산해 넣으세요. 아래
                결과는 해 성분 중 가장 큰 변화 크기의 예측으로, 파라미터
                슬라이더의 이동량이나 확률이 아닙니다. 큰 오차·접점 근처에서는
                선형 근사가 맞지 않을 수 있으므로 실제 식을 바꿔 다시 계산해야
                합니다.
              </p>
            </details>
          </div>
          <label>
            Equation Offset δ
            <input
              aria-label="가정한 등식 오차"
              type="number"
              min="0"
              step="any"
              value={perturbation}
              onChange={(e) => setPerturbation(e.target.value)}
            />
          </label>
          <div className="scenario-result">
            <span>Estimated Solution Change</span>
            <strong>{diagnosticNumber(response)}</strong>
          </div>
        </div>
      </details>
      <details className="analysis-details">
        <summary>Accuracy & Sensitivity · 계산 근거</summary>
        {d.enclosure && (
          <p>
            선택한 해의 포함 구간: [{d.enclosure.lo.toPrecision(17)},{' '}
            {d.enclosure.hi.toPrecision(17)}]. 바깥쪽 반올림을 사용하는 구간
            Newton 교집합으로 축소했습니다.
          </p>
        )}
        <p>
          최대 절대 등식 오차 {diagnosticNumber(result.maxResidual)} · 정규화
          등식 오차 {diagnosticNumber(d.normalizedError)}.{' '}
          {linear
            ? '정규화는 |Ax−b|/(|A||x|+|b|)의 성분별 최댓값입니다.'
            : '정규화는 |Fᵢ|/(Σ|Jᵢⱼ|max(1,|xⱼ|)+|Fᵢ|)입니다.'}
        </p>
        <p>
          일반근: Δx ≈ −J⁻¹F, 증폭률 ||J⁻¹||∞. 단일 변수는 1/|F′|이므로 조건수가
          1이어도 민감한 근을 구분합니다. 등식과 미지수의 단위를 바꾸면 절대
          증폭률도 달라집니다.
        </p>
        {d.powerResponse && (
          <p>
            {d.powerResponse.order}중근: |Δx| ≈ (
            {diagnosticNumber(d.powerResponse.coefficient)}·δ)¹⁄
            {d.powerResponse.order}. 첫 비영 도함수로 계산한 국소 변화 크기이며,
            오차 방향에 따라 실근이 사라질 수 있습니다.
          </p>
        )}
        <p>
          포함 구간이 있을 때만 실제 해의 오차 상한을 표시합니다. 그 외
          보정량·민감도는 국소 추정이며, 잃은 유효숫자나 입력 측정 오차를
          복구하지 않습니다.
        </p>
        {d.reason && <p>{d.reason}</p>}
        {result.rootStructure && <p>{result.rootStructure.evidence}</p>}
      </details>
      {d.parameterSensitivity.length > 0 && (
        <details className="analysis-details">
          <summary>Parameter Sensitivity · dx/dp</summary>
          <p>
            현재 해에서 −J⁻¹∂F/∂p를 계산했습니다. 파라미터 1단위 증가에 대한
            국소 해 변화입니다.
          </p>
          <div className="analysis-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Parameter</th>
                  {result.variables.map((v) => (
                    <th key={v}>d{v}/dp</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.parameterSensitivity.map((p) => (
                  <tr key={p.name}>
                    <th>{p.name}</th>
                    {p.derivatives.map((x, i) => (
                      <td key={i}>{diagnosticNumber(x)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
      {critical.length > 0 && (
        <div className="report-critical">
          <h4>
            Branch Events <span>{critical.length}</span>
          </h4>
          <p>
            현재 해의 기준 곡선에 대한 접점·중근·추적 경계입니다. 현재
            파라미터의 해와 별도로 표시합니다.
          </p>
          {critical.map((ev, i) => {
            const at = eventLocation(ev)
            return (
              <details className="analysis-details" key={i}>
                <summary>
                  <span className="critical-symbol">
                    {ev.tangency?.verified
                      ? ev.tangency.bifurcationOrder === 'boundary'
                        ? '■'
                        : Number(ev.tangency.bifurcationOrder) % 2
                          ? '⬡'
                          : '◆'
                      : '△'}
                  </span>{' '}
                  {ev.tangency?.verified
                    ? ev.tangency.bifurcationOrder === 'boundary'
                      ? 'Boundary Contact'
                      : ev.tangency.geometry === 'degenerate'
                        ? 'Degenerate Contact'
                        : ev.tangency.bifurcationOrder % 2
                          ? 'Inflection Crossing'
                          : 'Root Merge'
                    : ev.kind === 'merge'
                      ? 'Possible Root Merge'
                      : 'Tracking Boundary'}
                  {ev.tangency?.verified && (
                    <small>
                      {ev.tangency.bifurcationOrder === 'boundary'
                        ? ev.tangency.multiplicity
                          ? `Order ${ev.tangency.multiplicity}`
                          : 'Boundary'
                        : `Order ${ev.tangency.bifurcationOrder}`}
                    </small>
                  )}{' '}
                  · {sweepName} ≈ {diagnosticNumber(at.parameter)}
                </summary>
                <p>
                  {result.variables
                    .map((v, j) => `${v} ≈ ${diagnosticNumber(at.values[j])}`)
                    .join(' · ')}
                </p>
                <p>{ev.tangency?.geometricSummary ?? ev.description}</p>
                {ev.tangency && (
                  <p>
                    등식 오차 {diagnosticNumber(ev.tangency.residualAtStar)} ·
                    기울기 크기 {diagnosticNumber(ev.tangency.slopeAtStar)}.
                    접점 차수는 국소 수치 판정이며, 스칼라 홀수 중근만으로
                    다변수 Cusp 분기를 증명하지 않습니다.
                  </p>
                )}
              </details>
            )
          })}
        </div>
      )}
    </section>
  )
}
```

<a id="source-13"></a>

## src/components/AnalysisSummary.css

원본: [src/components/AnalysisSummary.css](../../src/components/AnalysisSummary.css) · 381줄 · SHA-256: `cc2e3edcbd8c5363df564acfa3f294da7c817f1f1f96ccd99357b9dbcd1a01a9`

```css
.analysis-summary {
  margin: 16px 0;
  color: #283344;
}
.analysis-verdict {
  margin-bottom: 14px;
}
.analysis-root-kind {
  display: inline-flex;
  padding: 3px 7px;
  border: 1px solid #d7dfe8;
  border-radius: 3px;
  background: #f2f5f9;
  color: #385a7e;
  font-size: 11px;
  font-weight: 600;
}
.analysis-root-kind[data-kind='multiple'],
.analysis-root-kind[data-kind='boundary'] {
  color: #82591f;
  background: #fbf7ef;
  border-color: #e4d8bc;
}
.analysis-verdict h3 {
  font-size: 18px;
  margin: 8px 0 5px;
  font-weight: 600;
}
.analysis-verdict p,
.analysis-summary p {
  font-size: 12px;
  line-height: 1.85;
  color: #546173;
}
.analysis-summary .quality-grid {
  display: block;
  max-height: none;
  margin: 14px 0 18px;
  border: 1px solid #d8dfe7;
  border-radius: 3px;
}
.analysis-summary .quality-table {
  min-width: 580px;
  table-layout: fixed;
  margin: 0;
}
.quality-table caption {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
.analysis-summary .quality-table thead th {
  background: #f2f4f7;
  color: #3c485b;
  font-weight: 600;
  padding: 8px 11px;
}
.analysis-summary .quality-table th:first-child {
  width: 24%;
}
.analysis-summary .quality-table th:nth-child(2) {
  width: 22%;
}
.analysis-summary .quality-table tbody th {
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  background: #fff;
}
.analysis-summary .quality-table td,
.analysis-summary .quality-table tbody th {
  padding: 11px;
  vertical-align: top;
  border-bottom: 1px solid #e5e9ee;
}
.analysis-summary .quality-table tr:last-child td,
.analysis-summary .quality-table tr:last-child th {
  border-bottom: 0;
}
.analysis-summary .quality-table .quality-value {
  font:
    500 18px/1.4 'IBM Plex Mono',
    ui-monospace,
    monospace;
  color: #305c91;
  overflow-wrap: anywhere;
}
.analysis-summary .quality-table td > span {
  display: block;
  font-size: 11px;
  line-height: 1.8;
  color: #596577;
}
.sensitivity-scenario {
  margin: 12px 0 4px;
  padding: 12px;
  border: 1px solid #dde3eb;
  border-radius: 3px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  background: #fafbfc;
}
.sensitivity-scenario > div:first-child {
  flex: 1 1 230px;
}
.sensitivity-scenario h4,
.report-critical h4 {
  margin: 0 0 5px;
  font-size: 13px;
}
.sensitivity-scenario p {
  margin: 0;
}
.sensitivity-scenario label {
  display: grid;
  gap: 7px;
  font-size: 11px;
  color: #566273;
}
.sensitivity-scenario input {
  width: 140px;
  max-width: 100%;
  padding: 7px;
  border: 1px solid #cbd3de;
  border-radius: 3px;
  background: white;
  color: #25364b;
}
.scenario-result {
  display: grid;
  gap: 7px;
  min-width: 130px;
}
.scenario-result span {
  font-size: 11px;
  color: #596577;
}
.scenario-result strong {
  font:
    500 18px ui-monospace,
    monospace;
  color: #305c91;
}
.analysis-details {
  border-top: 1px solid #e0e5ec;
  padding: 10px 0;
}
.analysis-details summary {
  cursor: pointer;
  font-size: 12px;
  line-height: 1.8;
  color: #405671;
}
.analysis-details summary small {
  margin-left: 7px;
  padding: 2px 5px;
  border-radius: 3px;
  background: #f8f5ef;
  color: #8a632e;
  font-size: 11px;
}
.analysis-details p {
  margin: 8px 0;
}
.analysis-table-scroll {
  overflow-x: auto;
  max-height: 280px;
}
.analysis-summary table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  text-align: left;
}
.analysis-summary td,
.analysis-summary th {
  padding: 8px 11px;
  border-bottom: 1px solid #e2e7ed;
}
.report-critical {
  margin: 18px 0;
}
.report-critical h4 span {
  margin-left: 7px;
  font-weight: 400;
}
.critical-symbol {
  color: #9b6b2c;
}
.analysis-view > .nonlinear-status {
  display: none;
}
.analysis-summary[aria-busy='true'] .quality-grid {
  opacity: 0.5;
}
.metric-help summary {
  font-size: 11px;
  cursor: pointer;
  color: #42618a;
  line-height: 1.8;
}
.metric-help p {
  margin: 8px 0 0;
}
.certification-report {
  margin: 16px 0;
  padding: 12px 14px;
  border: 1px solid #dbe1e9;
  border-radius: 3px;
  background: #fff;
  min-width: 0;
}
.certificate-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}
.certificate-heading h4 {
  font-size: 12px;
  margin: 0;
  color: #3d516c;
}
.certificate-state {
  border-radius: 3px;
  padding: 3px 7px;
  color: #86602c;
  background: #fbf6eb;
  font-size: 11px;
}
.certificate-state.is-complete {
  color: #315b83;
  background: #edf3fa;
}
.certificate-map {
  height: 18px;
  overflow: hidden;
  border-radius: 3px;
  background: #eef1f5;
}
.certificate-map svg {
  width: 100%;
  height: 18px;
  display: block;
}
.certificate-segment.is-free {
  fill: #dee9f6;
}
.certificate-segment.is-root {
  fill: #3c6f9c;
}
.certificate-segment.is-excluded {
  fill: #c4c9d2;
}
.certificate-segment.is-unresolved {
  fill: #c99548;
}
.certificate-map-scale {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin: 5px 0 10px;
  color: #657286;
  font:
    10px ui-monospace,
    monospace;
}
.certificate-counts {
  display: flex;
  flex-wrap: wrap;
  gap: 7px 15px;
  color: #526174;
  font-size: 11px;
  margin-bottom: 10px;
}
.certificate-counts span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.certificate-counts i {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}
.certificate-counts i.is-free {
  background: #dee9f6;
  border: 1px solid #b9cde2;
}
.certificate-counts i.is-root {
  background: #3c6f9c;
}
.certificate-counts i.is-excluded {
  background: #c4c9d2;
}
.certificate-counts i.is-unresolved {
  background: #c99548;
}
.probability-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(145px, 0.5fr);
  align-items: center;
  gap: 18px;
  padding: 12px 0;
}
.probability-value {
  display: grid;
  gap: 7px;
  min-width: 0;
}
.probability-value > span {
  color: #405671;
  font-size: 12px;
}
.probability-value strong {
  font:
    500 20px/1.4 'IBM Plex Mono',
    ui-monospace,
    monospace;
  color: #305c91;
  overflow-wrap: anywhere;
}
.probability-value small {
  color: #647286;
  font-size: 10px;
  line-height: 1.8;
}
.probability-sigma {
  display: grid;
  gap: 7px;
  color: #526174;
  font-size: 11px;
}
.probability-sigma input {
  width: 100%;
  max-width: 190px;
  border: 1px solid #cbd3de;
  border-radius: 3px;
  padding: 7px;
  background: #fff;
  color: #25364b;
  font-family: ui-monospace, monospace;
}
.probability-sigma small[role='alert'] {
  color: #9a5829;
  line-height: 1.8;
}
.certification-report[aria-busy='true'] .certificate-map {
  opacity: 0.5;
}
.report-without-root {
  padding: 8px 20px 22px;
}
.certified-empty-state h3 {
  color: #355c83;
}
.certified-empty-state .error-icon {
  background: #edf3fa;
  color: #355c83;
}
@media (max-width: 600px) {
  .certification-report {
    padding: 11px;
  }
  .probability-summary {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }
  .analysis-summary .quality-table {
    min-width: 540px;
  }
  .analysis-summary .quality-table .quality-value {
    font-size: 16px;
  }
}
```

<a id="source-14"></a>

## src/components/CertificationReport.tsx

원본: [src/components/CertificationReport.tsx](../../src/components/CertificationReport.tsx) · 277줄 · SHA-256: `7da18ab9d3ebb2cfa1e0f1e90729408a4a8951e21e04da91411b47e87e383480`

```tsx
import { useEffect, useState } from 'react'
import type { RootCertificate } from '../engine/interval-certification'
import { unresolvedReason } from '../engine/interval-certification'
import {
  certificateSegments,
  certifiedConclusion,
  probabilityBoundsText,
} from './certification-view'

type Props = {
  certificate?: RootCertificate
  pending: boolean
  truncated?: boolean
  inputNoiseSigma?: number
  onInputNoiseSigmaChange?: (sigma: number) => void
}
const number = (value: number) =>
  value === 0
    ? '0'
    : Math.abs(value) < 0.001 || Math.abs(value) >= 1e6
      ? value.toExponential(4)
      : Number(value.toPrecision(7)).toString()

export default function CertificationReport({
  certificate: c,
  pending,
  truncated = false,
  inputNoiseSigma,
  onInputNoiseSigmaChange,
}: Props) {
  const gp = c?.completeness?.gaussianPerturbation
  const sigma = inputNoiseSigma ?? gp?.sigma ?? 1e-6
  const [sigmaText, setSigmaText] = useState(String(sigma))
  const [sigmaError, setSigmaError] = useState('')
  useEffect(() => {
    setSigmaText(String(sigma))
    setSigmaError('')
  }, [sigma])

  function applySigma() {
    const next = Number(sigmaText)
    if (!sigmaText.trim() || !Number.isFinite(next) || next <= 0) {
      setSigmaError('0보다 큰 유한한 표준편차를 입력하세요.')
      return
    }
    setSigmaError('')
    if (next !== sigma) onInputNoiseSigmaChange?.(next)
  }

  if (!c) return null
  const state = certifiedConclusion(c)
  const draftValue = Number(sigmaText)
  const draftMatches =
    sigmaText.trim() !== '' &&
    Number.isFinite(draftValue) &&
    draftValue === sigma
  const freshGp =
    !pending && draftMatches && gp?.sigma === sigma ? gp : undefined
  const probability = freshGp?.criticalPointsCertified
    ? probabilityBoundsText(freshGp.domainRootCountInvarianceBounds)
    : undefined
  const segments = certificateSegments(c)
  const span = c.domain.max - c.domain.min
  const counts = [
    ['root', 'Root Interval', c.rootIntervals.length],
    ['free', 'Root-free', c.rootFreeIntervals?.length ?? 0],
    [
      'excluded',
      'Excluded',
      c.excludedIntervals?.length ?? c.excludedDomainCount,
    ],
    ['unresolved', 'Unresolved', c.unresolved.length],
  ] as const

  return (
    <section
      className="certification-report"
      aria-label="탐색 검증과 입력 오차"
      aria-busy={pending}
    >
      <div className="certificate-heading">
        <h4>Search Domain Verification</h4>
        <span
          className={`certificate-state${state.complete ? ' is-complete' : ''}`}
        >
          {pending ? '갱신 중' : state.status}
        </span>
      </div>
      <div
        className="certificate-map"
        role="img"
        aria-label={`${c.variable} 탐색 범위의 검증 기록`}
      >
        <svg
          viewBox="0 0 1000 24"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {Number.isFinite(span) &&
            span > 0 &&
            segments.map((segment, i) => (
              <rect
                key={i}
                className={`certificate-segment is-${segment.kind}`}
                x={((segment.lo - c.domain.min) / span) * 1000}
                y="2"
                width={Math.max(1, ((segment.hi - segment.lo) / span) * 1000)}
                height="20"
              />
            ))}
        </svg>
      </div>
      <div className="certificate-map-scale">
        <span>{number(c.domain.min)}</span>
        <span>{c.variable}</span>
        <span>{number(c.domain.max)}</span>
      </div>
      <div className="certificate-counts">
        {counts.map(([kind, label, count]) => (
          <span key={kind}>
            <i className={`is-${kind}`} />
            {label} <b>{count}</b>
          </span>
        ))}
      </div>
      <details className="analysis-details certificate-reading">
        <summary>Verification Map · 검증 지도 읽는 법</summary>
        <p>
          색은 구간 연산으로 기록한 판정입니다. Root Interval은 그 상자 안에
          확인된 근이 있다는 뜻으로, 상자 전체가 해라는 뜻은 아닙니다. 작은 근
          상자는 위치를 식별할 수 있도록 최소 너비로 표시합니다. Root-free는
          추가 근이 없다고 검증한 구간이고 Excluded는 실수 수식이 정의되지 않는
          구간입니다. Unresolved는 아직 판정이 끝나지 않은 구간입니다.
        </p>
        {truncated && (
          <p>
            탐색 또는 표시 한도에 도달했습니다. 현재 목록만으로 모든 근 발견을
            판정하지 않습니다.
          </p>
        )}
        <p>
          미결정 영역에는 아직 검증하지 못한 근이 있을 수 있습니다. 구간 길이
          검증률이 높다는 사실은 근을 모두 발견했을 확률을 뜻하지 않습니다. 전체
          근 확인은 구간 검증과 표시 결과의 일대일 대조가 모두 끝났을 때만
          표시합니다.
        </p>
      </details>

      <details className="analysis-details gaussian-model">
        <summary>Gaussian Noise Model · 입력 오차와 근 개수</summary>
        <p>
          입력 오차에 따른 근 개수 유지 확률을 따로 살펴보는 선택 항목입니다.
          측정 오차 모형을 알고 있을 때 사용하세요.
        </p>
        <div className="probability-summary">
          <div className="probability-value">
            <span>Root Count Stability</span>
            <strong>
              {pending ? '계산 중…' : (probability ?? '산정 조건 확인')}
            </strong>
            <small>
              {probability
                ? '현재 탐색 구간 · 검증된 확률 범위'
                : '검증된 임계점과 확률 범위가 있는 경우 표시'}
            </small>
          </div>
          <label className="probability-sigma">
            Noise Standard Deviation σ
            <input
              aria-label="입력 오차 표준편차"
              type="number"
              min="0"
              step="any"
              value={sigmaText}
              readOnly={!onInputNoiseSigmaChange}
              onChange={(e) => setSigmaText(e.target.value)}
              onBlur={applySigma}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  applySigma()
                }
                if (e.key === 'Escape') {
                  setSigmaText(String(sigma))
                  setSigmaError('')
                }
              }}
            />
            {sigmaError && <small role="alert">{sigmaError}</small>}
          </label>
        </div>
        <details className="analysis-details probability-assumptions">
          <summary>Assumptions · 이 확률을 해석하는 방법</summary>
          <p>
            현재 스칼라 방정식의 좌변·우변 차이 F 전체에 하나의 일정한 오차 ε가
            더해진다고 가정합니다. ε는 평균 0, 표준편차 σ의 정규분포를 따릅니다.
            표시한 값은 F+ε=0의 근 개수가 현재 탐색 구간에서 유지될 확률의
            상하한입니다. 미발견 근을 모두 찾았을 확률, 개별 해가 맞을 확률, 각
            측정값에 독립 오차가 생기는 일반 모형과는 다릅니다.
          </p>
          <p>
            Regression의 95% Confidence Interval과도 구별하세요. Confidence
            Interval은 여러 관측값으로 추정한 계수의 불확실성을 나타내고,
            여기서는 한 방정식 전체에 같은 오차가 더해질 때 근의 개수가
            유지되는지를 다룹니다. 두 숫자를 서로의 정확도 점수처럼 비교할 수
            없습니다.
          </p>
          <p>
            σ는 등식의 단위로 환산한 입력 오차 크기입니다. 실제 측정 오차를 알고
            있으면 그 값을 사용하세요. 같은 σ라도 등식의 단위나 스케일을 바꾸면
            다른 오차 모형이 됩니다. 근 개수가 유지되더라도 위치가 크게 움직일
            수 있으므로 위의 해 변화 증폭률과 함께 해석하세요.
          </p>
          {c.completeness?.perturbationUnavailableReason && !pending && (
            <p>{c.completeness.perturbationUnavailableReason}</p>
          )}
          {!gp &&
            !pending &&
            !c.completeness?.perturbationUnavailableReason && (
              <p>
                현재 식·정의역·검증 예산에서는 확률을 검증하지 못했습니다. 이를
                0%나 100%로 대신 표시하지 않습니다.
              </p>
            )}
          {freshGp && !freshGp.criticalPointsCertified && (
            <p>
              원래 함수의 모든 임계점과 경계 높이를 검증해야 이 확률을 산정할 수
              있습니다.
            </p>
          )}
          {freshGp?.twoSidedSafetyMarginBounds && (
            <p>
              근 개수를 바꾸지 않는 양방향 등식 오차 여유: [
              {number(freshGp.twoSidedSafetyMarginBounds.lo)},{' '}
              {number(freshGp.twoSidedSafetyMarginBounds.hi)}]. 이 값이 0인
              접점에서는 작은 오차로도 근이 생성·소멸할 수 있습니다.
            </p>
          )}
          {freshGp?.twoSidedSafetyProbabilityBounds && (
            <p>
              위 안전 여유 안에 오차가 머무를 확률:{' '}
              {probabilityBoundsText(freshGp.twoSidedSafetyProbabilityBounds)}.
              안전 여유 밖에서도 근 개수가 같아질 수 있으므로 주 지표와 서로
              다를 수 있습니다.
            </p>
          )}
        </details>
      </details>

      {c.unresolved.length > 0 && (
        <details className="analysis-details unresolved-report">
          <summary>추가 검증이 필요한 {c.unresolved.length}곳</summary>
          <div className="analysis-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>From</th>
                  <th>To</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {c.unresolved.map((u, i) => (
                  <tr key={i}>
                    <td>{number(u.lo)}</td>
                    <td>{number(u.hi)}</td>
                    <td>{unresolvedReason(u.reason)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  )
}
```

<a id="source-15"></a>

## src/components/certification-view.ts

원본: [src/components/certification-view.ts](../../src/components/certification-view.ts) · 109줄 · SHA-256: `696fe551afcb2c32f7f428f81b511f351a72f2c7015b0aa7ddabfcb31114b7f8`

```typescript
import { diagnosticModel } from '../engine/automatic'
import { nextDown, nextUp, type Interval } from '../engine/interval-arithmetic'
import type { RootCertificate } from '../engine/interval-certification'

/** Never display another model's proof while the next worker request is pending. */
export function currentCertificate(
  certificate: RootCertificate | null | undefined,
  source: string,
  parameters: Record<string, number>,
): RootCertificate | undefined {
  if (!certificate?.model) return undefined
  const stored = certificate.model.parameters
  const names = Object.keys(parameters)
  if (
    Object.keys(stored).length !== names.length ||
    names.some(
      (name) =>
        !Object.hasOwn(stored, name) || stored[name] !== parameters[name],
    )
  )
    return undefined
  try {
    return diagnosticModel(source, names).source === certificate.model.source
      ? certificate
      : undefined
  } catch {
    return undefined
  }
}

/** Display outward rounded percentage endpoints. A result near one must not
 * silently become a statement of exactly 100%. */
export function probabilityBoundsText(bounds?: Interval): string | undefined {
  if (
    !bounds ||
    !Number.isFinite(bounds.lo) ||
    !Number.isFinite(bounds.hi) ||
    bounds.lo > bounds.hi ||
    bounds.hi < 0 ||
    bounds.lo > 1
  )
    return undefined
  const lo = Math.max(0, bounds.lo),
    hi = Math.min(1, bounds.hi)
  if (lo === 0 && hi === 0) return '0%'
  if (lo === 1 && hi === 1) return '100%'
  const scale = 10000
  const lower =
    lo === 0
      ? 0
      : Math.max(0, Math.floor(nextDown(nextDown(lo * 100) * scale)) / scale)
  const upper =
    hi === 1
      ? 100
      : Math.min(100, Math.ceil(nextUp(nextUp(hi * 100) * scale)) / scale)
  return `${lower.toFixed(4)}–${upper.toFixed(4)}%`
}

export function certifiedConclusion(c: RootCertificate): {
  complete: boolean
  title: string
  status: string
} {
  if (c.complete && c.allRootsRepresented === true)
    return {
      complete: true,
      title: `구간 내 전체 ${c.uniqueRootCount}개 근 확인`,
      status: '검증 완료',
    }
  if (c.complete)
    return {
      complete: false,
      title: `${c.uniqueRootCount}개 근 구간 확정`,
      status: '표시 결과 대조 필요',
    }
  return {
    complete: false,
    title: `확인된 근 구간 ${c.uniqueRootCount}개`,
    status: `미결정 ${c.unresolved.length}곳`,
  }
}

export type CertificateSegment = Interval & {
  kind: 'root' | 'free' | 'excluded' | 'unresolved'
}

/** These are recorded proof boxes, not root values or a distribution of roots. */
export function certificateSegments(c: RootCertificate): CertificateSegment[] {
  const clip = (
    intervals: readonly Interval[],
    kind: CertificateSegment['kind'],
  ) =>
    intervals
      .map((iv) => ({
        lo: Math.max(c.domain.min, iv.lo),
        hi: Math.min(c.domain.max, iv.hi),
        kind,
      }))
      .filter(
        (iv) =>
          Number.isFinite(iv.lo) && Number.isFinite(iv.hi) && iv.lo <= iv.hi,
      )
  return [
    ...clip(c.rootFreeIntervals ?? [], 'free'),
    ...clip(c.excludedIntervals ?? [], 'excluded'),
    ...clip(c.rootIntervals, 'root'),
    ...clip(c.unresolved, 'unresolved'),
  ]
}
```

<a id="source-16"></a>

## src/components/Guide.tsx

원본: [src/components/Guide.tsx](../../src/components/Guide.tsx) · 452줄 · SHA-256: `04e0e7363bd79f0e52ae7bedd7443b6a83723948aaed5409ead57468f0fef049`

```tsx
import EquationReference from './EquationReference'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, BookOpen, Check, Lightbulb, X } from 'lucide-react'
import type { SolverMode } from '../models'
import './Guide.css'

export default function Guide({
  mode = 'linear',
  onClose,
}: {
  mode?: SolverMode
  onClose: () => void
}) {
  const dialog = useRef<HTMLDivElement>(null)
  const nonlinear = mode === 'nonlinear'
  const [page, setPage] = useState<'reference' | 'usage'>('reference')

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab' || !dialog.current) return
      const focusable = Array.from(
        dialog.current.querySelectorAll<HTMLElement>(
          'button, a[href], input, select, textarea, [tabindex="0"]',
        ),
      ).filter((element) => element.getClientRects().length > 0)
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === dialog.current)
      ) {
        event.preventDefault()
        last?.focus()
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          document.activeElement === dialog.current)
      ) {
        event.preventDefault()
        first?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
      previousFocus?.focus()
    }
  }, [onClose])

  return (
    <div
      className="guide-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="guide-dialog"
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
        tabIndex={-1}
      >
        <header className="guide-header">
          <div className="guide-book">
            <BookOpen size={22} />
          </div>
          <button
            className="guide-close"
            onClick={onClose}
            aria-label="사용 가이드 닫기"
          >
            <X size={21} />
          </button>
          <p className="guide-eyebrow">
            EQUATION SOLVER · {nonlinear ? 'NONLINEAR' : 'LINEAR'}
          </p>
          <h2 id="guide-title">
            {nonlinear
              ? '식을 적고, 발견한 해를 비교하세요.'
              : '수식을 쓰는 것부터 시작하세요.'}
          </h2>
          <p>복잡한 코딩 없이, 익숙한 수학 문법으로 모델을 만듭니다.</p>
        </header>

        <nav className="guide-navigation" aria-label="가이드 내용">
          <button
            type="button"
            aria-pressed={page === 'reference'}
            onClick={() => setPage('reference')}
          >
            함수·문법
          </button>
          <button
            type="button"
            aria-pressed={page === 'usage'}
            onClick={() => setPage('usage')}
          >
            사용 방법
          </button>
        </nav>
        <div className="guide-content" key={page}>
          {page === 'reference' ? (
            <EquationReference />
          ) : (
            <>
              <section className="guide-section">
                <span className="guide-step">01</span>
                <div>
                  <h3>필요한 화면부터 열어보세요</h3>
                  <p>
                    첫 화면의 <strong>Equation Solver</strong> 카드를 누르면
                    계산기를 엽니다. 준비 중인 모듈은 아직 계산할 수 없습니다.
                  </p>
                  <p>
                    <strong>수식·파라미터</strong>에서 식과 범위·간격을
                    설정하고, <strong>시뮬레이션</strong>에서 해와 그래프를
                    탐색하세요. <strong>해석 리포트</strong>에서는 수치 검증과
                    상세 결과를 확인합니다. 화면 이동은 작성한 모델과 선택한
                    해를 지우지 않습니다.
                  </p>
                  <p className="guide-small">
                    상단의 화면 이동 버튼으로 작업을 바꾸고, 모듈 홈으로 돌아갈
                    수 있습니다. Linear와 Nonlinear 유형은 수식·파라미터
                    화면에서 선택합니다.
                  </p>
                </div>
              </section>

              <section className="guide-section">
                <span className="guide-step">02</span>
                <div>
                  <h3>
                    {nonlinear ? '방정식을 그대로 입력하세요' : 'Equations'}
                  </h3>
                  {nonlinear ? (
                    <>
                      <p>
                        <code>x^2 = 4</code>처럼 익숙한 등식으로 적으면 자동으로
                        실수 해를 탐색합니다. 기본 모드에는 초기값이나 min/max를
                        입력하지 않아도 됩니다.
                      </p>
                      <pre className="guide-code">
                        <span># 발견한 실수 해 -2, 2를 함께 확인합니다</span>
                        {'\n'}x^2 = 4
                      </pre>
                      <p className="guide-small">
                        자동 탐색은 실수 해만 다룹니다. 복소수 계산기는 이후
                        별도 기능으로 제공할 예정입니다.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        모르는 값은 문자로, 알고 있는 값은 숫자로 적으세요. 양쪽
                        모두에 미지수가 있어도 괜찮습니다.
                      </p>
                      <pre className="guide-code">
                        <span># 두 식, 두 미지수</span>
                        {'\n'}2x + 3y = 12{'\n'}4x = 5 + y
                      </pre>
                    </>
                  )}
                  <div className="guide-rule">
                    <Check size={14} />
                    <span>
                      <code>2x</code>와 <code>2*x</code>는 같은 뜻입니다.
                    </span>
                  </div>
                  {!nonlinear && (
                    <p className="guide-small">
                      <code>2*(x + y)</code> 같은 괄호와 <code>x/2</code>처럼
                      알려진 값으로 나누기도 지원합니다. 미지수끼리 곱하거나
                      제곱하는 식은 Nonlinear 탭에서 입력하세요.
                    </p>
                  )}
                </div>
              </section>

              <section className="guide-section">
                <span className="guide-step">03</span>
                <div>
                  {nonlinear ? (
                    <>
                      <h3>여러 해를 목록에서 선택하세요</h3>
                      <p>
                        연립식은 줄바꿈, 쉼표, 세미콜론으로 구분할 수 있습니다.
                        미지수 수와 독립적인 식 수를 맞추면 여러 시작점을
                        자동으로 시도합니다. 시뮬레이션 화면의 발견한 해
                        목록에서 해를 선택하고, 시뮬레이션 추가로 여러 창을 열어
                        비교하세요. 선택한 해의 자세한 계산 결과는 해석
                        리포트에서 볼 수 있습니다.
                      </p>
                      <pre className="guide-code">
                        <span># 원과 직선의 교점을 자동으로 탐색합니다</span>
                        {'\n'}x^2 + y^2 = 25{'\n'}x - y = 1
                      </pre>
                      <p className="guide-small">
                        일반 함수는 기본 -100~100 영역을 탐색하며, 지원되는 단일
                        다항식은 계수에서 탐색 범위를 잡습니다. 실제 사용한
                        범위와 방법은 결과에 표시됩니다. 필요하면 ‘고급 탐색
                        설정’에서 자동 탐색 범위를 바꿀 수 있습니다.
                      </p>
                      <p className="guide-small">
                        결과는 <strong>발견한 실수 해</strong>입니다. 유한한
                        수치 탐색으로 모든 해를 찾았거나 해가 없음을 보장하지는
                        않습니다.
                        <code>sin(x) = 0</code>처럼 해가 무한히 많은 식도
                        있습니다. 0에 가까운 해부터 최대 32개를 표시하며 제한에
                        도달하면 안내합니다. 같은 거리에서는 양수 해가 먼저
                        나옵니다.
                      </p>
                    </>
                  ) : (
                    <>
                      <h3>미지수와 파라미터를 구분해요</h3>
                      <p>
                        <strong>미지수</strong>는 계산으로 구할 값입니다.{' '}
                        <strong>파라미터</strong>는 내가 조절하는 알려진 값으로,
                        파라미터 패널에 추가합니다.
                      </p>
                      <div className="guide-equation">
                        <code>x + y = F</code>
                        <ArrowRight size={17} />
                        <span>
                          <b>x, y</b>를 구하고 <b>F</b>를 조절해요
                        </span>
                      </div>
                      <p className="guide-small">
                        파라미터로 등록하지 않은 문자는 모두 미지수입니다.
                        이름은 영문자로 시작하고 영문·숫자·밑줄(_)을 사용하세요.
                        대소문자를 구분합니다.
                      </p>
                    </>
                  )}
                </div>
              </section>

              <section className="guide-section">
                <span className="guide-step">함수</span>
                <div>
                  <h3>번호를 붙인 함수를 정의하고 조합하세요</h3>
                  <pre>
                    {'f1(x) = 2x + 4\nf2(x) = -3x + 7\nf1(x) - f2(x) = 0'}
                  </pre>
                  <p>
                    x에 대한 함수는 f1(x), f2(x)처럼 적습니다. 등록한 파라미터
                    외의 다른 미지수를 혼합하려면 <code>f1 = 2x + y - 10</code>
                    처럼 괄호 없이 정의하고, <code>f1 + f2 = 0</code>처럼 식을
                    만드세요. 정의한 함수에 목표값을 지정하려면{' '}
                    <code>f1(x)=4</code>처럼 입력합니다.
                  </p>
                  <p>
                    파라미터 값은 연속적으로 조절합니다. <b>샘플 포인트 간격</b>
                    은 표와 그래프의 샘플 마커 간격이며 슬라이더의 이동 폭을
                    제한하지 않습니다. 여러 해를 함께 보려면 시뮬레이션 화면의
                    병합 세트 추가를 누르세요. 각 세트의 해는 칩으로 선택하며,
                    경계·병합 표시는 수치적 추정입니다.
                  </p>
                </div>
              </section>
              {nonlinear && (
                <section className="guide-section">
                  <span className="guide-step">04</span>
                  <div>
                    <h3>파라미터와 보조식으로 모델을 나누세요</h3>
                    <p>
                      조절할 상수는 파라미터 패널에 추가합니다. 일반 등식에서
                      <code>y = 2</code>도 풀어야 할 조건으로 취급합니다. 함수가
                      필요하면 <code>f1(x) = ln(x) + 4*x^2</code>를 정의하고{' '}
                      <code>f1(x) = target</code>처럼 목표값과 같게 두세요.
                      target은 패널의 파라미터입니다.
                    </p>
                    <p className="guide-small">
                      보조식의 입력 순서는 자유롭지만 서로 순환해서 참조할 수
                      없습니다. 이름을 미지수나 파라미터와 중복해서 정의하지
                      마세요. 이름은 영문자로 시작하고 영문·숫자·밑줄(_)을
                      사용하며, 대소문자를 구분합니다.
                    </p>
                    <p className="guide-small">
                      <code>ln(x)</code>는 자연로그, <code>log(x)</code>는 밑이
                      10인 상용로그입니다. <code>sqrt(x)</code>,{' '}
                      <code>exp(x)</code>, <code>sin(x)</code> 등도 사용할 수
                      있습니다. 로그·제곱근의 정의역을 벗어난 계산 지점은 자동
                      탐색에서 제외합니다.
                    </p>
                    <details className="guide-small">
                      <summary>고급 옵션: 초기조건으로 한 해 찾기</summary>
                      <p>
                        ‘고급 탐색 설정 → 해 탐색 방식’에서 수동 모드를 선택하면
                        등식에 초기값 또는 범위를 추가합니다. 단일근에는
                        <code>x(0)=1</code> 또는 <code>x(min)</code>·
                        <code>x(max)</code>, 연립식에는 각 변수의{' '}
                        <code>x(0)</code> 초기 추정값을 적습니다. 명시식만
                        계산하는 NLE0도 수동 모드에서 사용합니다.
                      </p>
                    </details>
                  </div>
                </section>
              )}

              <section className="guide-section">
                <span className="guide-step">{nonlinear ? '05' : '04'}</span>
                <div>
                  <h3>슬라이더와 그래프로 값을 선택하세요</h3>
                  <p>
                    범위와 간격은 수식·파라미터 화면에서, 실제 값은 시뮬레이션
                    화면의 슬라이더나 숫자 입력으로 조절합니다. 화면 확대 버튼을
                    누르면 더 큰 그래프와 값 조절을 함께 사용할 수 있습니다.
                  </p>
                  <p>
                    그래프는 선택한 탐색 변수의 범위에서 해가 어떻게 달라지는지
                    보여줍니다. 같은 기준 해와 설정에서 탐색 변수의 현재값만
                    바꾸면 곡선은 유지되고 현재 점만 이동합니다. 다른 고정
                    파라미터나 선택한 해, 범위를 바꾸면 곡선도 달라질 수
                    있습니다.
                  </p>
                  <p>
                    마우스를 움직이면 표시한 곡선을 따라 탐색 점이 부드럽게
                    이동합니다.{' '}
                    <strong>
                      그래프를 클릭하면 해당 가로축 값을 실제 파라미터로 적용
                    </strong>
                    합니다. 마우스를 치워도 선택한 현재값은 유지되며, 해는 그
                    값으로 다시 계산합니다.
                  </p>
                  <p className="guide-small">
                    데이터 표와 CSV는 설정한 간격을 따릅니다. 예를 들어 0.2~0.8,
                    간격 0.01이면 61행입니다. 마우스 탐색 점의 곡선 보간값과
                    표의 직접 계산값은 다를 수 있습니다. 표에서는 가장 가까운
                    계산 행을 표시하며, 표의 간격을 화면 움직임에 맞춰 바꾸지는
                    않습니다. 유효하지 않은 구간을 가로질러 선을 연결하지도
                    않습니다.
                  </p>
                  <p className="guide-small">
                    그래프를 클릭하여 초점을 둔 뒤 휠을 움직이면 축을 점진적으로
                    확대·축소합니다. <strong>그래프 확대 축</strong>에서
                    양축·X축·Y축을 선택하고 <strong>축 초기화</strong>로 원래
                    범위를 복원하세요. 축 조정은 표시 비율만 바꾸며 계산한 해나
                    표는 바꾸지 않습니다. 초점이 없는 그래프 위에서는 일반
                    페이지 스크롤을 유지합니다.
                  </p>
                  <p className="guide-small">
                    키보드로는 좌우 방향키와 Home/End로 표의 지점을 탐색하고,
                    Enter/Space로 값을 적용합니다. +/−는 확대·축소, 0은 축
                    초기화입니다.
                  </p>
                  <p className="guide-small">
                    최댓값은 항상 마지막 행에 포함하므로 마지막 구간만 짧을 수
                    있습니다. 데이터가 {nonlinear ? '500' : '2,000'}행을 넘으면
                    간격이나 범위를 조정하세요. 이 시뮬레이션은 정상상태
                    파라미터 분석이며 시간에 따른 적분은 아닙니다.
                  </p>
                  {nonlinear && (
                    <p className="guide-small">
                      시뮬레이션 추가로 최대 6개 해의 창을 동시에 열 수
                      있습니다. 파라미터 값은 모든 창에 함께 적용되며, 각 창은
                      추가한 시점의 기준 해에서 이어 풉니다. 이는 수치적
                      추적이며 모든 분기를 찾아내거나 분기점에서 같은 가지를
                      유지한다고 보장할 수는 없습니다. 찾지 못한 지점은 숫자를
                      만들어 채우지 않고 표와 그래프에 빈 결과로 표시합니다.
                      CSV는 현재 선택한 해의 데이터입니다.
                    </p>
                  )}
                </div>
              </section>

              <section className="guide-section">
                <span className="guide-step">{nonlinear ? '06' : '05'}</span>
                <div>
                  <h3>오차 범위와 입력 민감도를 확인하세요</h3>
                  <p>
                    리포트는 해의 절대 오차 상한(구간 검증 시), 국소 보정량,
                    등식 오차의 증폭률, 탐색 구간 검증률을 보여줍니다. ‘가정한
                    등식 오차’를 입력하면 해 변화 크기를 예측합니다. 중근은 선형
                    증폭 대신 차수에 따른 비선형 반응을 표시합니다.
                  </p>
                  <p className="guide-small">
                    ◆ 짝수 중근·접점, ⬡ 홀수 중근·관통, ■ 정의역 경계를
                    구분합니다. 2~8중근을 국소 미분으로 판정하며, 분기 다중근을
                    교차·병합으로 임의 확정하지 않습니다. 구간 검증률은 구간
                    길이 비율로, 모든 해를 찾았을 확률이 아닙니다.
                  </p>
                  <p>
                    해석 리포트에서 ∞-norm 또는 2-norm(SVD)을 선택할 수
                    있습니다. 조건수가 클수록 입력의 작은 오차가 해에 크게
                    영향을 줄 수 있습니다.
                  </p>
                  {nonlinear && (
                    <p className="guide-small">
                      비선형 모델에서는 찾은 해 근처의 Jacobian 행렬로 계산한
                      국소 조건수입니다. 미지수가 하나면 0이 아닌 미분값의 행렬
                      조건수는 1이므로, 이것만으로 전체 구간의 안정성이나 수렴을
                      판단할 수 없습니다. 등식 오차와 식의 단위도 함께
                      확인하세요.
                    </p>
                  )}
                  <p className="guide-small">
                    초록 ‘안정’은 10⁴ 미만, 노랑 ‘민감’은 10⁴ 이상~10⁸ 미만,
                    주황 ‘매우 민감’은 10⁸ 이상입니다. 참고 범위이므로 측정
                    오차와 단위도 함께 확인하세요.
                  </p>
                  <p className="guide-small">
                    2-norm은 다른 기준으로 민감도를 측정하는 도구이며,
                    선택한다고 해 자체의 정밀도가 높아지는 것은 아닙니다. 자세한
                    계산 방식은 리포트에서 확인할 수 있습니다.
                  </p>
                </div>
              </section>

              <div className="guide-note">
                <Lightbulb size={19} />
                <div>
                  <h4>
                    {nonlinear
                      ? '탐색 결과와 물리적 의미를 함께 확인하세요'
                      : '모델을 직접 구성하세요'}
                  </h4>
                  <p>
                    {nonlinear
                      ? '작은 등식 오차는 해당 식을 잘 만족한다는 뜻입니다. 발견한 해가 실제 모델에서 가능한 값인지 확인하세요. 예를 들어 음수 농도는 수학적 해여도 실제 운전 조건으로는 적합하지 않을 수 있습니다. 탐색 범위를 넓혀 다른 해가 있는지도 확인할 수 있습니다.'
                      : 'Linear는 빈 계산기로 시작합니다. 독립적인 방정식 수와 미지수 수를 맞추고, 조절할 상수는 파라미터로 추가하세요.'}{' '}
                    <code>#</code> 뒤에는 메모를 적을 수 있습니다. Differential
                    Equation Solver 등 다른 큰 카테고리는 추후 추가될
                    예정입니다.
                  </p>
                </div>
              </div>
              <p className="guide-privacy">
                계산은 브라우저의 Web Worker와 WebAssembly에서 실행됩니다.
                모델은 외부 서버로 전송되지 않습니다.
              </p>
            </>
          )}
        </div>
        <footer className="guide-footer">
          <button onClick={onClose}>
            작업으로 돌아가기 <ArrowRight size={16} />
          </button>
        </footer>
      </div>
    </div>
  )
}
```

<a id="source-17"></a>

## src/components/Guide.css

원본: [src/components/Guide.css](../../src/components/Guide.css) · 369줄 · SHA-256: `d98998f04efaf08ca35acfdbe838234e3acb4032c651ff99c815119748026c40`

```css
.guide-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(20, 39, 35, 0.34);
  backdrop-filter: blur(5px);
}
.guide-dialog {
  width: 100%;
  max-width: 860px;
  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - 48px);
  overflow: hidden;
  background: #fffefb;
  border: 1px solid #e8ece5;
  border-radius: 22px;
  box-shadow: 0 24px 100px rgba(21, 43, 36, 0.2);
  outline: none;
  box-sizing: border-box;
  color: #243c35;
  font-family: inherit;
}
.guide-header {
  position: relative;
  padding: 24px 28px 20px;
  flex-shrink: 0;
  border-bottom: 1px solid #e8ece5;
  background: linear-gradient(145deg, #f0f7f1, #fffdf8);
  border-radius: 22px 22px 0 0;
}
.guide-book {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border: 1px solid #d3e6dd;
  border-radius: 13px;
  background: #e4f1e8;
  color: #087f74;
  margin-bottom: 20px;
}
.guide-close {
  position: absolute;
  top: 23px;
  right: 23px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: #6b7d73;
  cursor: pointer;
}
.guide-close:hover {
  background: #e7eee6;
  color: #203f34;
}
.guide-eyebrow {
  font-size: 10px !important;
  font-weight: 700;
  letter-spacing: 1.8px;
  color: #087f74 !important;
  margin: 0 0 9px !important;
}
.guide-header h2 {
  margin: 0 0 10px;
  font-size: 25px;
  letter-spacing: -1px;
  line-height: 1.4;
  font-weight: 650;
}
.guide-header > p:last-child {
  margin: 0;
  font-size: 13px;
  color: #768077;
  line-height: 1.8;
}
.guide-content {
  padding: 24px 28px 18px;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.guide-section {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 15px;
  margin-bottom: 25px;
}
.guide-step {
  padding-top: 2px;
  color: #98aba1;
  font:
    12px/1.8 ui-monospace,
    monospace;
  letter-spacing: 1px;
}
.guide-section h3 {
  font-size: 15px;
  margin: 0 0 8px;
  letter-spacing: -0.3px;
  font-weight: 650;
}
.guide-section p,
.guide-note p {
  font-size: 12px;
  line-height: 1.9;
  margin: 0 0 12px;
  color: #6d7a73;
  word-break: keep-all;
}
.guide-section strong {
  font-weight: 600;
  color: #3b5d4f;
}
.guide-code {
  margin: 13px 0 11px;
  padding: 16px 20px;
  border-radius: 11px;
  background: #f4f6f0;
  color: #315d4a;
  font:
    13px/1.9 ui-monospace,
    SFMono-Regular,
    Consolas,
    monospace;
  overflow: auto;
  border: 1px solid #e7ece2;
}
.guide-code span {
  color: #98a595;
  font-size: 11px;
}
.guide-rule {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  color: #6d7a73;
}
.guide-rule svg {
  color: #087f74;
}
.guide-content code {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}
.guide-equation {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  border: 1px solid #e6ece5;
  border-radius: 10px;
  padding: 15px 17px;
  margin: 12px 0;
  color: #638275;
}
.guide-equation > code {
  font-size: 14px;
  color: #087f74;
}
.guide-equation > span {
  font-size: 11px;
}
.guide-equation b {
  font-weight: 600;
  color: #3d5e50;
}
.guide-small {
  font-size: 11px !important;
  color: #89948c !important;
  margin-bottom: 0 !important;
}
.guide-small + .guide-small {
  margin-top: 9px;
}
.guide-note {
  display: flex;
  gap: 12px;
  background: #f6f3eb;
  border: 1px solid #ece8d9;
  border-radius: 12px;
  padding: 17px 18px;
  margin: 0 0 20px;
}
.guide-note > svg {
  flex: 0 0 auto;
  color: #b29a60;
  margin-top: 2px;
}
.guide-note h4 {
  font-size: 12px;
  font-weight: 600;
  margin: 0 0 7px;
  color: #7d704d;
}
.guide-note p {
  margin: 0;
  font-size: 11px;
  color: #8b8063;
}
.guide-privacy {
  font-size: 10px;
  line-height: 1.8;
  color: #96a097;
  text-align: center;
  margin: 0 0 6px;
}
.guide-footer {
  padding: 14px 28px;
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid #eff0e9;
}
.guide-footer button {
  display: flex;
  align-items: center;
  gap: 14px;
  border: 0;
  background: #087f74;
  color: white;
  font-family: inherit;
  font-size: 12px;
  font-weight: 550;
  border-radius: 9px;
  padding: 12px 17px;
  cursor: pointer;
}
.guide-footer button:hover {
  background: #06695f;
}
.guide-dialog button:focus-visible {
  outline: 3px solid #b4d8cb;
  outline-offset: 3px;
}
@media (max-width: 600px) {
  .guide-backdrop {
    padding: 12px;
  }
  .guide-dialog {
    max-height: calc(100dvh - 24px);
    border-radius: 16px;
  }
  .guide-header {
    padding: 24px;
  }
  .guide-header h2 {
    font-size: 22px;
  }
  .guide-content {
    padding: 24px;
  }
  .guide-section {
    gap: 9px;
    grid-template-columns: 24px minmax(0, 1fr);
  }
  .guide-footer {
    padding: 16px 24px 20px;
  }
}
.guide-section table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  line-height: 1.7;
}
.guide-section th,
.guide-section td {
  text-align: left;
  padding: 10px 8px;
  border-bottom: 1px solid #e3e9dd;
  vertical-align: top;
}
.guide-section pre {
  padding: 14px;
  overflow-x: auto;
  border-radius: 8px;
  background: #f2f6ed;
  line-height: 1.8;
}

.guide-section > div {
  min-width: 0;
}
.guide-section.guide-reference {
  display: block;
}
.guide-section h4 {
  margin: 24px 0 10px;
  font-size: 14px;
}
.guide-section ul {
  padding-left: 20px;
  font-size: 12px;
  line-height: 1.9;
  color: #52675b;
}
.guide-section li {
  margin-block: 8px;
  overflow-wrap: anywhere;
}
.guide-table-scroll {
  overflow-x: auto;
  max-width: 100%;
}
.guide-table-scroll table {
  min-width: 520px;
}
.guide-table-scroll th {
  color: #315d4a;
  background: #f4f6f0;
}
.guide-navigation {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 12px 28px;
  border-bottom: 1px solid #e8ece5;
  flex-shrink: 0;
}
.guide-navigation button {
  padding: 9px 14px;
  border: 1px solid #dbe4d9;
  border-radius: 8px;
  color: #52675b;
  background: #fff;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.guide-navigation button[aria-pressed='true'] {
  background: #e8f3ed;
  border-color: #a6cbb9;
  color: #146b5b;
}
@media (max-width: 600px) {
  .guide-header {
    padding: 16px 20px;
  }
  .guide-header h2 {
    font-size: 19px;
    padding-right: 20px;
  }
  .guide-book {
    display: none;
  }
  .guide-header > p:last-child {
    display: none;
  }
  .guide-navigation {
    padding: 10px 20px;
  }
  .guide-content {
    padding: 20px;
  }
  .guide-footer {
    padding: 12px 20px;
  }
}
```

<a id="source-18"></a>

## src/components/ModuleGuide.tsx

원본: [src/components/ModuleGuide.tsx](../../src/components/ModuleGuide.tsx) · 347줄 · SHA-256: `02093389c640397ffdc0420ae8825de04dc1ba2be94b73882e79e8af99357581`

```tsx
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { BookOpen, Check, Copy, Search, X } from 'lucide-react'
import {
  getModuleGuide,
  moduleGuides,
  sectionSearchText,
  type GuideBlock,
  type GuideTopic,
} from './guide-content'
import './ModuleGuide.css'

export type { GuideTopic } from './guide-content'

function CodeExample({ text, caption }: { text: string; caption?: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  return (
    <figure className="ivc-guide-example">
      <div className="ivc-guide-example-heading">
        <figcaption>{caption ?? 'Example Input'}</figcaption>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text)
              setCopied(true)
              clearTimeout(timer.current)
              timer.current = setTimeout(() => setCopied(false), 1600)
            } catch {
              // The selectable source remains available when clipboard access is denied.
            }
          }}
          aria-label="Copy example input"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre tabIndex={0}>
        <code>{text}</code>
      </pre>
    </figure>
  )
}

function ContentBlock({ block }: { block: GuideBlock }) {
  if (block.kind === 'paragraph') return <p>{block.text}</p>
  if (block.kind === 'code')
    return <CodeExample text={block.text} caption={block.caption} />
  if (block.kind === 'list')
    return (
      <ul>
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    )
  if (block.kind === 'note')
    return (
      <aside className="ivc-guide-note">
        <strong>{block.title}</strong>
        <p>{block.text}</p>
      </aside>
    )
  return (
    <div
      className="ivc-guide-table-wrap"
      tabIndex={0}
      role="region"
      aria-label={`${block.headers[0]} reference table`}
    >
      <table>
        <thead>
          <tr>
            {block.headers.map((header) => (
              <th scope="col" key={header}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, column) =>
                column === 0 ? (
                  <th scope="row" key={column}>
                    {cell}
                  </th>
                ) : (
                  <td key={column}>{cell}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ModuleGuide({
  initialTopic = 'linear',
  onClose,
}: {
  initialTopic?: GuideTopic
  onClose: () => void
}) {
  const [topic, setTopic] = useState<GuideTopic>(initialTopic)
  const [query, setQuery] = useState('')
  const dialog = useRef<HTMLDivElement>(null)
  const readingPane = useRef<HTMLElement>(null)
  const closeCallback = useRef(onClose)
  closeCallback.current = onClose
  const uid = useId()
  const guide = getModuleGuide(topic)
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  const sections = useMemo(
    () =>
      guide.sections.filter((item) => {
        const searchText = sectionSearchText(item)
        return terms.every((term) => searchText.includes(term))
      }),
    [guide, query],
  ) // The search is confined to the active module.

  useEffect(() => {
    setTopic(initialTopic)
    setQuery('')
  }, [initialTopic])

  useEffect(() => {
    readingPane.current?.scrollTo({ top: 0 })
  }, [topic, query])

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.focus({ preventScroll: true })
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        closeCallback.current()
        return
      }
      if (event.key !== 'Tab' || !dialog.current) return
      const focusable = [
        ...dialog.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
        ),
      ].filter(
        (element) =>
          element.tabIndex >= 0 && element.getClientRects().length > 0,
      )
      const first = focusable[0]
      const last = focusable.at(-1)
      const active = document.activeElement
      const outside =
        !dialog.current.contains(active) || active === dialog.current
      if (event.shiftKey && (active === first || outside)) {
        event.preventDefault()
        last?.focus({ preventScroll: true })
      } else if (!event.shiftKey && (active === last || outside)) {
        event.preventDefault()
        first?.focus({ preventScroll: true })
      }
    }
    document.addEventListener('keydown', handleKeyDown, true)
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected)
        previousFocus.focus({ preventScroll: true })
    }
  }, [])

  const chooseTopic = (next: GuideTopic) => {
    setTopic(next)
    setQuery('')
  }
  const tabId = (id: GuideTopic) => `${uid}-tab-${id}`
  const panelId = `${uid}-panel`
  const jumpTo = (id: string) => {
    const pane = readingPane.current
    const target = document.getElementById(`${uid}-${topic}-${id}`)
    if (!pane || !target) return
    pane.scrollTo({
      top:
        pane.scrollTop +
        target.getBoundingClientRect().top -
        pane.getBoundingClientRect().top -
        20,
    })
    target.focus({ preventScroll: true })
  }

  return (
    <div
      className="ivc-guide-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="ivc-guide-dialog"
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-title`}
        tabIndex={-1}
      >
        <header className="ivc-guide-header">
          <h2 id={`${uid}-title`}>
            <BookOpen size={20} aria-hidden="true" />
            User Guide
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="ivc-guide-close"
            aria-label="Close User Guide"
          >
            <X size={20} />
          </button>
        </header>
        <div className="ivc-guide-layout">
          <aside className="ivc-guide-sidebar">
            <div
              className="ivc-guide-tabs"
              role="tablist"
              aria-label="Module guides"
              aria-orientation="vertical"
            >
              {moduleGuides.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={tabId(item.id)}
                  aria-selected={item.id === topic}
                  aria-controls={item.id === topic ? panelId : undefined}
                  tabIndex={item.id === topic ? 0 : -1}
                  onClick={() => chooseTopic(item.id)}
                  onKeyDown={(event) => {
                    let nextIndex: number
                    if (event.key === 'ArrowDown' || event.key === 'ArrowRight')
                      nextIndex = (index + 1) % moduleGuides.length
                    else if (
                      event.key === 'ArrowUp' ||
                      event.key === 'ArrowLeft'
                    )
                      nextIndex =
                        (index + moduleGuides.length - 1) % moduleGuides.length
                    else if (event.key === 'Home') nextIndex = 0
                    else if (event.key === 'End')
                      nextIndex = moduleGuides.length - 1
                    else return
                    event.preventDefault()
                    chooseTopic(moduleGuides[nextIndex].id)
                    document
                      .getElementById(tabId(moduleGuides[nextIndex].id))
                      ?.focus({ preventScroll: true })
                  }}
                >
                  {item.title}
                </button>
              ))}
            </div>
            <nav
              className="ivc-guide-toc"
              aria-label={`${guide.title} contents`}
            >
              <h3>Contents</h3>
              {sections.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => jumpTo(item.id)}
                >
                  {item.title.replace(/^\d+\.\s*/, '')}
                </button>
              ))}
            </nav>
          </aside>
          <div
            className="ivc-guide-reading-layout"
            role="tabpanel"
            id={panelId}
            aria-labelledby={tabId(topic)}
          >
            <div className="ivc-guide-search">
              <label htmlFor={`${uid}-search`}>
                <Search size={16} aria-hidden="true" />
                <span className="ivc-guide-sr-only">Search current guide</span>
              </label>
              <input
                id={`${uid}-search`}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search this guide · 용어 검색"
              />
              {query && (
                <span className="ivc-guide-search-count" aria-live="polite">
                  {sections.length} sections
                </span>
              )}
            </div>
            <main className="ivc-guide-reading" ref={readingPane} key={topic}>
              <header className="ivc-guide-chapter-heading">
                <h3>{guide.title}</h3>
                <p>{guide.summary}</p>
              </header>
              {sections.length === 0 ? (
                <p className="ivc-guide-no-results" role="status">
                  이 가이드에서 찾을 수 없습니다. 다른 용어로 검색하거나
                  검색어를 지워 전체 목차를 보세요.
                </p>
              ) : (
                sections.map((item) => (
                  <section
                    className="ivc-guide-section"
                    key={item.id}
                    aria-labelledby={`${uid}-${topic}-${item.id}`}
                  >
                    <h4 id={`${uid}-${topic}-${item.id}`} tabIndex={-1}>
                      {item.title}
                    </h4>
                    {item.blocks.map((block, index) => (
                      <ContentBlock block={block} key={index} />
                    ))}
                  </section>
                ))
              )}
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
```

<a id="source-19"></a>

## src/components/ModuleGuide.css

원본: [src/components/ModuleGuide.css](../../src/components/ModuleGuide.css) · 430줄 · SHA-256: `5b406b67931cae3d27ade0e80ea419f6f73bd9f31634c6e43a59b94c8bc21c31`

```css
.ivc-guide-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgb(22 30 42 / 45%);
}

.ivc-guide-dialog {
  width: min(1200px, 100%);
  height: min(940px, 94dvh);
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  color: #253044;
  background: #fff;
  border: 1px solid #cdd3dd;
  border-radius: 8px;
  box-shadow: 0 18px 60px rgb(0 0 0 / 20%);
  font-size: 15px;
  line-height: 1.8;
  text-align: left;
}

.ivc-guide-dialog *,
.ivc-guide-dialog *::before,
.ivc-guide-dialog *::after {
  box-sizing: border-box;
}
.ivc-guide-dialog :is(h2, h3, h4, p, figure, ul) {
  margin: 0;
}
.ivc-guide-dialog button {
  font: inherit;
  cursor: pointer;
}
.ivc-guide-dialog button:focus-visible,
.ivc-guide-dialog input:focus-visible,
.ivc-guide-dialog [tabindex]:focus-visible {
  outline: 2px solid #245ec1;
  outline-offset: 3px;
}

.ivc-guide-header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 18px;
  border-bottom: 1px solid #dce0e6;
  background: #f7f8fa;
}
.ivc-guide-header h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 17px;
  font-weight: 650;
  color: #24324b;
}
.ivc-guide-close {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid #d4dae3;
  border-radius: 4px;
  background: #fff;
  color: #4c5667;
}
.ivc-guide-close:hover {
  background: #eaf0f8;
}
.ivc-guide-layout {
  flex: 1;
  display: grid;
  grid-template-columns: 250px minmax(0, 1fr);
  min-height: 0;
  min-width: 0;
}
.ivc-guide-sidebar {
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
  padding: 14px 10px 24px;
  background: #f6f7f9;
  border-right: 1px solid #dce0e6;
  overscroll-behavior: contain;
}
.ivc-guide-tabs {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.ivc-guide-tabs button {
  display: block;
  width: 100%;
  padding: 8px 10px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 4px;
  color: #424c5e;
  font-size: 13px;
  line-height: 1.5;
  text-align: left;
  overflow-wrap: normal;
  word-break: normal;
}
.ivc-guide-tabs button:hover {
  background: #e8edf5;
}
.ivc-guide-tabs button[aria-selected='true'] {
  color: #174c9a;
  border-color: #bed0eb;
  background: #e8f0fc;
  font-weight: 650;
}
.ivc-guide-toc {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 22px;
  padding: 0 10px;
}
.ivc-guide-toc h3 {
  color: #596476;
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 4px;
}
.ivc-guide-toc button {
  padding: 3px 0;
  border: 0;
  background: none;
  text-align: left;
  color: #535d6d;
  font-size: 12px;
  line-height: 1.6;
}
.ivc-guide-toc button:hover {
  color: #174c9a;
  text-decoration: underline;
}
.ivc-guide-reading-layout {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
.ivc-guide-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  border-bottom: 1px solid #e2e5eb;
  background: #fff;
  flex: 0 0 auto;
}
.ivc-guide-search label {
  display: flex;
  color: #647087;
}
.ivc-guide-search input {
  display: block;
  width: 100%;
  min-width: 0;
  padding: 7px 8px;
  border: 1px solid #d4dae3;
  border-radius: 4px;
  background: #fff;
  color: #253044;
  font: inherit;
  font-size: 13px;
}
.ivc-guide-search-count {
  white-space: nowrap;
  color: #667080;
  font-size: 12px;
}
.ivc-guide-reading {
  flex: 1;
  width: 100%;
  max-width: none;
  margin: 0;
  align-self: stretch;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: 28px 32px 50px;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  overflow-wrap: anywhere;
  word-break: normal;
}
.ivc-guide-chapter-heading {
  padding-bottom: 24px;
  border-bottom: 1px solid #dce2eb;
}
.ivc-guide-chapter-heading h3 {
  color: #1e3558;
  font-size: 24px;
  font-weight: 650;
  line-height: 1.4;
  margin-bottom: 10px;
}
.ivc-guide-chapter-heading p {
  color: #556176;
  line-height: 1.8;
}
.ivc-guide-section {
  display: block;
  width: 100%;
  min-width: 0;
  padding-top: 28px;
}
.ivc-guide-section + .ivc-guide-section {
  margin-top: 26px;
  border-top: 1px solid #e5e8ed;
}
.ivc-guide-section h4 {
  display: block;
  width: 100%;
  font-size: 18px;
  font-weight: 650;
  line-height: 1.6;
  color: #283d5d;
  margin-bottom: 15px;
}
.ivc-guide-section p {
  display: block;
  width: 100%;
  color: #354052;
  margin: 12px 0;
  line-height: 1.9;
}
.ivc-guide-section ul {
  padding-left: 22px;
  margin: 14px 0;
}
.ivc-guide-section li {
  margin: 9px 0;
  padding-left: 2px;
  line-height: 1.9;
  color: #354052;
}
.ivc-guide-example {
  margin: 18px 0 !important;
  min-width: 0;
  border: 1px solid #d4dce7;
  border-radius: 5px;
  overflow: hidden;
  background: #f7f9fc;
}
.ivc-guide-example-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  padding: 8px 12px;
  border-bottom: 1px solid #dfe5ee;
  background: #edf1f7;
}
.ivc-guide-example figcaption {
  color: #4c5970;
  font-size: 12px;
  line-height: 1.6;
}
.ivc-guide-example-heading button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  flex: 0 0 auto;
  padding: 3px 8px;
  color: #27569a;
  border: 1px solid #c2cee0;
  border-radius: 3px;
  font-size: 12px;
  background: #fff;
}
.ivc-guide-example pre {
  margin: 0;
  padding: 15px 16px;
  overflow-x: auto;
  white-space: pre;
  color: #233b61;
  background: transparent;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
  font-size: 13px;
  line-height: 1.85;
  tab-size: 2;
}
.ivc-guide-example code {
  font: inherit;
  white-space: inherit;
}
.ivc-guide-table-wrap {
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  margin: 16px 0;
  border: 1px solid #d8dfe9;
  border-radius: 4px;
}
.ivc-guide-table-wrap table {
  width: 100%;
  min-width: 360px;
  border-collapse: collapse;
  table-layout: auto;
  font-size: 13px;
  color: #354052;
}
.ivc-guide-table-wrap :is(th, td) {
  padding: 10px 12px;
  border-bottom: 1px solid #e2e6ed;
  text-align: left;
  vertical-align: top;
  line-height: 1.8;
}
.ivc-guide-table-wrap thead th {
  color: #344d70;
  font-weight: 650;
  background: #f0f3f8;
}
.ivc-guide-table-wrap tbody th {
  width: 29%;
  min-width: 145px;
  color: #2b4264;
  font-weight: 600;
  background: #fafbfd;
}
.ivc-guide-table-wrap tr:last-child :is(th, td) {
  border-bottom: 0;
}
.ivc-guide-note {
  display: block;
  margin: 18px 0;
  padding: 12px 15px;
  border-left: 3px solid #6b91c5;
  background: #f0f4fa;
  border-radius: 0 4px 4px 0;
}
.ivc-guide-note strong {
  font-size: 13px;
  color: #30517d;
  font-weight: 650;
}
.ivc-guide-note p {
  margin: 6px 0 0;
  font-size: 13px;
  color: #405472;
  line-height: 1.85;
}
.ivc-guide-no-results {
  padding: 24px 0;
  color: #5c6677;
}
.ivc-guide-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 760px) {
  .ivc-guide-backdrop {
    padding: 8px;
  }
  .ivc-guide-dialog {
    height: 97dvh;
    font-size: 14px;
    border-radius: 6px;
  }
  .ivc-guide-layout {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
  }
  .ivc-guide-sidebar {
    padding: 7px 10px;
    border-right: 0;
    border-bottom: 1px solid #dce0e6;
    overflow: visible;
  }
  .ivc-guide-tabs {
    flex-direction: row;
    overflow-x: auto;
    gap: 5px;
    padding: 3px;
    overscroll-behavior-x: contain;
  }
  .ivc-guide-tabs button {
    width: auto;
    flex: 0 0 auto;
    padding: 7px 9px;
    white-space: nowrap;
    font-size: 12px;
  }
  .ivc-guide-toc {
    display: none;
  }
  .ivc-guide-search {
    padding: 9px 14px;
  }
  .ivc-guide-reading {
    padding: 22px 18px 36px;
  }
  .ivc-guide-chapter-heading h3 {
    font-size: 21px;
  }
  .ivc-guide-section h4 {
    font-size: 17px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ivc-guide-dialog * {
    scroll-behavior: auto !important;
  }
}
```

<a id="source-20"></a>

## src/components/guide-content.ts

원본: [src/components/guide-content.ts](../../src/components/guide-content.ts) · 1,413줄 · SHA-256: `cc7d0ba6187cce455e4842e66837aa1a75686d90f393f07f991cd72f85210cce`

```typescript
export type GuideTopic =
  | 'linear'
  | 'nonlinear'
  | 'ode'
  | 'curve-fit'
  | 'multilinear'
  | 'nonlinear-fit'
  | 'integration'
  | 'optimization'
  | 'lsq'

export type GuideBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'code'; text: string; caption?: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'table'; headers: string[]; rows: string[][] }
  | { kind: 'note'; title: string; text: string }

export type GuideSection = { id: string; title: string; blocks: GuideBlock[] }
export type ModuleGuideContent = {
  id: GuideTopic
  title: string
  summary: string
  sections: GuideSection[]
}

const p = (text: string): GuideBlock => ({ kind: 'paragraph', text })
const code = (text: string, caption?: string): GuideBlock => ({
  kind: 'code',
  text,
  caption,
})
const list = (...items: string[]): GuideBlock => ({ kind: 'list', items })
const table = (headers: string[], rows: string[][]): GuideBlock => ({
  kind: 'table',
  headers,
  rows,
})
const note = (title: string, text: string): GuideBlock => ({
  kind: 'note',
  title,
  text,
})
const section = (
  id: string,
  title: string,
  ...blocks: GuideBlock[]
): GuideSection => ({ id, title, blocks })

export const guideExamples = {
  linear: '2x+y=10\nx-y=2',
  nonlinear: 'x^3-x=p',
  ode: 'd(A)/d(t)=-k*A\nk=0.25\nA(0)=1\nt|0:10',
  'curve-fit': '[\nx y\n0 1\n1 3\n2 5\n3 7\n4 9\n]\npolyfit x y 1',
  multilinear:
    '[\nx1 x2 y\n0 0 2\n1 0 5\n0 1 -2\n1 1 1\n2 1 4\n1 2 -3\n]\nmlinfit x1 x2 y',
  'nonlinear-fit':
    '[\nS v\n0.1 0.3333333333333333\n0.25 0.6666666666666666\n0.5 1\n1 1.3333333333333333\n2 1.6\n4 1.7777777777777777\n]\nnlinfit v=Vmax*S/(Km+S)\nm(Vmax)=1.5\nm(Km)=0.8\nVmax(min)=0\nKm(min)=0.001',
  integration: '[\nt Q\n0 0\n1 1\n2 2\n]\nintegrate Q(t) 0 2 100 lin',
  optimization: 'min: (x-1)^2+(y-1)^2\nx+y=1\nx|0.2 0 2\ny|0.2 0 2',
  lsq: '[\nx y\n0 1\n1 3\n2 5\n3 7\n4 9\n]\nfit: y=a*x+b\na|1 0 4\nb|0 -1 2\na+b=3',
} satisfies Record<GuideTopic, string>

const expressionBasics = (): GuideBlock[] => [
  p(
    '수식은 일반 텍스트로 입력합니다. 더하기 +, 빼기 -, 곱하기 *, 나누기 /, 거듭제곱 ^를 사용하고 괄호로 계산 순서를 정합니다. 1e-6은 0.000001입니다. 변수 x와 X는 서로 다르며, # 뒤는 주석입니다. 긴 변수 이름의 곱은 a*b처럼 *를 쓰면 뜻이 분명합니다.',
  ),
  table(
    ['Input', 'Meaning'],
    [
      [
        '2*x, 2x, 2(x+1)',
        '숫자와 변수·괄호의 곱. 복잡한 식에는 *를 명시하면 읽기 쉽습니다.',
      ],
      ['-2^2 / (-2)^2', '각각 -4 / 4. 음수 밑을 제곱하려면 괄호를 씁니다.'],
      ['2^-2 / 2^3^2', '각각 0.25 / 512. 거듭제곱은 오른쪽부터 결합합니다.'],
      ['f1(x)=x^2+1', '번호 있는 함수 정의. 정의한 다음 f1(x)로 재사용합니다.'],
      [
        'f1=x^2+y^2',
        '여러 변수를 쓰는 번호 있는 식 정의. 목표 등식·모델에서 f1을 참조합니다.',
      ],
    ],
  ),
  p(
    '숫자 뒤의 단위 주석을 인식하더라도 단위를 자동 환산하지는 않습니다. cm와 m, bar와 Pa를 섞지 말고 먼저 한 체계로 맞추세요. 계산값의 단위는 입력한 식에서 직접 이어집니다.',
  ),
]

const functionReference = (): GuideBlock[] => [
  table(
    ['Function', 'Use / Domain'],
    [
      [
        'sin(x), cos(x), tan(x)',
        '각도는 Radian입니다. 90°는 pi/2로 바꿉니다. tan은 pi/2+k*pi 근처에서 정의되지 않습니다.',
      ],
      [
        'asin(x), acos(x), atan(x)',
        '역삼각함수 결과도 Radian. asin·acos의 실수 입력 범위는 [-1,1]입니다.',
      ],
      [
        'sinh(x), cosh(x), tanh(x)',
        '쌍곡함수. 큰 입력의 sinh·cosh는 Float64 범위를 넘을 수 있습니다.',
      ],
      [
        'exp(x), ln(x)',
        'exp는 e^x, ln은 자연로그. ln의 실수 입력은 0보다 커야 합니다.',
      ],
      ['log(x), log10(x)', '모두 밑이 10인 로그. 자연로그는 ln을 사용합니다.'],
      [
        'sqrt(x), pow(x,n)',
        '제곱근은 x≥0. 음수의 비정수 거듭제곱은 일반적으로 실수 범위를 벗어납니다.',
      ],
      [
        'abs(x), min(a,b), max(a,b)',
        '절댓값·두 값의 최소·최대. 꺾이는 지점에서는 매끄러운 미분을 가정할 수 없습니다.',
      ],
      [
        'floor(x), ceil(x), sign(x)',
        '내림·올림·부호. 점프나 평탄 구간이 있어 미분 기반 풀이가 제한됩니다.',
      ],
      [
        'pi, e',
        '비선형·과학 계산의 내장 상수. Linear Equations의 기존 e·pi 식별자 규칙과 구별합니다.',
      ],
    ],
  ),
  note(
    'Domain',
    '분모가 0인 점, ln(0), 음수의 sqrt를 유효한 해로 받아들이지 않습니다. 그래프가 끊겼다면 정의역·추적 상태를 먼저 확인하세요. 끊어진 선을 임의로 이어서 해가 존재한다고 해석하지 않습니다.',
  ),
]

const workflow = (noun: string): GuideBlock[] => [
  p(
    `Model / Data에서 ${noun}을 작성하고 계산합니다. Simulation에서는 그래프·표를 살펴보고, Report에서는 중요한 결과와 계산 상태를 읽습니다. Guide는 현재 모듈의 설명을 엽니다. 모듈을 바꿔도 이 가이드 안에는 선택한 모듈의 내용만 표시됩니다.`,
  ),
  p(
    '프로젝트 저장은 입력·설정을 다시 열기 위한 JSON 파일입니다. 결과 CSV는 표 데이터를 다른 프로그램에서 분석할 때, Markdown Report는 결과와 설정을 함께 보관할 때 씁니다. 입력을 바꾸면 새 계산이 끝난 결과를 사용하세요. 이전 결과를 새 조건의 답으로 해석하면 안 됩니다.',
  ),
]

const dataSyntax = (): GuideBlock[] => [
  p(
    '[ 와 ] 사이에 열 이름과 숫자 데이터를 넣습니다. 각 데이터 행의 숫자 개수는 열 이름 개수와 같아야 합니다. 이름은 x, concentration처럼 문자로 시작하고, 숫자는 1.25 또는 1e-3처럼 적습니다. 결측값·NaN·Infinity는 계산할 수 없으므로 입력 전에 정리하세요. 소수점은 마침표를 사용합니다.',
  ),
  p(
    '표 밖에서 u=2*x처럼 계산 열을 정의하거나 f1(x)=...를 재사용할 수 있습니다. 보조식은 의존 관계에 맞춰 평가하며 순환 참조는 거부합니다. 관측된 목표값 y를 모델의 입력으로 다시 넣으면 답을 미리 알려주는 셈이므로 허용하지 않습니다. 단위 표시는 열 이름에 넣기보다 주석으로 기록하세요.',
  ),
]

const regressionMetrics = (): GuideBlock[] => [
  table(
    ['Metric', 'How to read it'],
    [
      [
        'RMSE',
        '관측값과 예측값 차이의 제곱 평균에 제곱근을 취한 크기. y가 mg/L이면 RMSE도 mg/L입니다. 0.2라면 이 데이터에서 차이의 대표 크기가 약 0.2입니다. 새 데이터의 오차 상한은 아닙니다.',
      ],
      [
        'R²',
        '데이터 평균만 예측하는 기준과 비교한 오차 감소 정도. 0.9는 이 기준의 제곱 오차 합을 90% 줄였다는 뜻입니다. “모델이 90% 확률로 맞다”는 뜻이 아닙니다. 음수도 가능하고 y가 모두 같으면 정의되지 않습니다.',
      ],
      [
        'SSE / DOF',
        'SSE는 차이 제곱의 합. DOF는 데이터 개수−추정 계수 개수입니다. 관측 수가 늘면 SSE 크기 자체도 달라집니다. DOF≤0이면 데이터로 오차 분산을 추정할 여유가 없습니다.',
      ],
      [
        'Adjusted R² / AIC',
        '계수 수 증가의 대가를 반영해 같은 데이터의 후보 모델을 비교합니다. 목적변수·단위·사용 행이 다른 모델의 점수는 직접 비교하지 않습니다.',
      ],
    ],
  ),
  p(
    'R²가 높아도 데이터 오차가 한쪽에서만 양수이고 다른 쪽에서 음수이면 곡선 모양이 맞지 않을 수 있습니다. Data Error를 x 또는 예측값에 대해 살펴보고, 남겨 둔 검증 데이터를 예측해 보세요. 모델을 복잡하게 만드는 것만으로 측정 정보가 늘어나지는 않습니다.',
  ),
]

const confidenceIntervals = (): GuideBlock[] => [
  p(
    'Coefficient는 데이터에서 추정한 계수이고, Standard Error (SE)는 데이터의 잡음 때문에 그 계수 추정이 얼마나 흔들릴지 나타내는 통계적 크기입니다. SE는 계수와 같은 단위입니다. 소수점 계산 오차나 “정답과의 절대 거리”는 아닙니다.',
  ),
  p(
    '95% Confidence Interval은 estimate ± t(0.975, DOF)×SE로 구합니다. 예를 들어 계수 2.00, SE=0.10, DOF=8이면 Student-t 임계값은 약 2.306이므로 약 [1.769, 2.231]입니다. 표에 ±0.231처럼 보이면 구간의 반폭이지 SE 자체가 아닙니다.',
  ),
  p(
    '같은 실험을 같은 방식으로 반복해 구간을 만들면 그 구간들이 참 계수를 포함하는 비율이 약 95%라는 해석입니다. 이번에 얻은 고정된 구간에 참 계수가 95% 확률로 들어 있다는 말이나, 측정값의 95%가 그 안에 든다는 말과 구별하세요.',
  ),
  list(
    '이 해석은 선택한 모델이 적절하고, 설명변수 값을 고정해 다루며, 오차가 독립이고 대체로 동일한 분산을 갖는다는 가정에 의존합니다. 작은 표본의 정확한 Student-t 해석에는 Gaussian 오차 가정도 필요합니다.',
    '비선형 모델은 최적점 주변의 Local Linearization을 사용하므로 근사 구간입니다. 강한 비선형성·계수 상관·부족한 데이터에서는 대칭 구간이 부적절할 수 있습니다.',
    'Rank 부족, DOF 부족, 계수의 Active Bound 또는 미수렴 때문에 제공할 수 없으면 해당 사유를 확인합니다. origin으로 0에 고정한 Intercept는 추정한 계수가 아니므로 CI가 없습니다. “미산정”은 오차 0이라는 뜻이 아닙니다.',
    'Coefficient CI는 계수 하나의 불확실성입니다. 평균 응답의 Confidence Band와 새 측정값의 Prediction Interval은 다른 계산이며 이 표가 대신하지 않습니다. 새 관측값에는 모델 계수 불확실성과 새 관측 잡음이 모두 있습니다.',
  ),
]

export const moduleGuides: ModuleGuideContent[] = [
  {
    id: 'linear',
    title: 'Linear Equations',
    summary:
      '여러 조건을 동시에 만족하는 수를 찾고, 답의 정확도와 민감도를 읽는 방법입니다.',
    sections: [
      section(
        'purpose',
        '1. What is a Linear Equation?',
        p(
          '미지수는 아직 모르는 수입니다. 방정식은 그 수가 만족해야 하는 조건입니다. 2x+y=10은 “x 두 개와 y 한 개를 합하면 10”이라는 뜻입니다. Linear는 미지수를 제곱하거나 서로 곱하지 않는다는 뜻입니다. 3x−2y=4는 선형이고 x*y=4, x^2=4는 비선형입니다.',
        ),
        p(
          '조건을 여러 개 함께 적용하는 것이 System입니다. 평면에서 두 직선이 한 점에서 만나면 유일한 해, 평행하면 해 없음, 같은 직선이면 해가 무한히 많습니다. 계산기는 독립적인 조건으로 유일하게 정해지는 문제를 풉니다.',
        ),
        ...workflow('조건과 조절할 Parameters'),
      ),
      section(
        'first-model',
        '2. First Model · 두 조건으로 두 수 찾기',
        code(guideExamples.linear, '복사해서 Linear에 입력'),
        list(
          'Linear를 선택하고 위 식을 입력합니다. 이 예제에는 Parameter를 추가할 필요가 없습니다.',
          '계산하면 x=4, y=2입니다. 첫 조건은 2×4+2=10, 두 번째는 4−2=2로 직접 확인할 수 있습니다.',
          'Simulation에 Parameter가 없으면 결과값을 확인합니다. 해가 변하는 그래프를 보려면 오른쪽 10을 P로 바꾸고 P를 Parameter로 등록합니다.',
        ),
        p(
          'P=10에서 시작해 P를 12로 바꾸면 해는 x=14/3≈4.666667, y=8/3≈2.666667입니다. 두 조건을 동시에 유지하면서 답이 바뀝니다. 이 변화 곡선은 서로 다른 시간의 움직임이 아니라 설정값별 해입니다.',
        ),
      ),
      section(
        'syntax',
        '3. Input & Parameters',
        ...expressionBasics(),
        p(
          'Linear에서는 2x, 2(x+y), (x+y)*3 같은 선형 조합을 쓸 수 있습니다. x*y, sin(x), 1/x처럼 미지수에 대해 비선형인 식은 Nonlinear로 전환하세요. 함수값이 고정된 Parameter에만 의존해 숫자가 되는 경우와 미지수에 의존하는 경우는 다릅니다.',
        ),
        p(
          '일반 등식 k=4를 적으면 k도 조건에 의해 정해지는 미지수입니다. 조절할 상수로 쓰려면 k를 UI의 Parameters에 등록하세요. Linear의 e, pi는 기존 모델에서 변수 이름으로 쓸 수 있으므로 내장 상수라고 가정하지 않습니다. 필요하면 Parameter로 명확히 지정합니다.',
        ),
        note(
          'Unknown vs Parameter',
          'Unknown은 계산기가 찾아야 할 값, Parameter는 사용자가 정하는 값입니다. Parameter를 Unknown처럼 중복 지정하면 조건 수나 독립성이 달라질 수 있습니다.',
        ),
      ),
      section(
        'simulation',
        '4. Parameter Exploration',
        p(
          'Parameter의 Min / Max는 그래프에서 탐색할 설정 범위입니다. Sample Spacing은 계산된 점을 저장·표시하는 간격이며, 슬라이더 현재값을 그 간격에 고정하지 않습니다. 그래프의 빈 점은 실제 샘플, 선은 그 사이를 시각적으로 연결한 것입니다.',
        ),
        p(
          '슬라이더를 움직이거나 그래프를 클릭하면 해당 설정을 다시 계산합니다. Hover는 값을 살펴보는 Preview입니다. 클릭은 값을 적용하는 동작입니다. 선택한 파라미터의 현재값을 바꿀 때에는 기준 곡선을 유지하고 현재 위치 표시점이 움직입니다. 다른 고정 Parameter나 모델 자체가 바뀌면 새 곡선이 필요합니다.',
        ),
        p(
          '그래프를 선택한 뒤 Wheel로 확대·축소할 수 있습니다. 축 선택으로 X / Y / Both를 고릅니다. 확대는 데이터의 표시 범위만 바꾸며 입력한 수나 계산 정밀도를 바꾸지 않습니다. Reset Axes로 전체 범위를 다시 봅니다.',
        ),
      ),
      section(
        'report',
        '5. Report · 먼저 볼 세 가지',
        table(
          ['Item', 'Interpretation'],
          [
            [
              'Solution',
              '모든 조건을 동시에 만족하는 미지수 값. 표시 자릿수와 실제 내부 정밀도는 다릅니다.',
            ],
            [
              'Equation Error',
              '계산한 값을 원래 좌변·우변에 대입했을 때의 차이. 10^-12처럼 작으면 조건을 잘 맞춘 것이지만 해 위치의 오차 상한과 같지는 않습니다.',
            ],
            [
              'Absolute Sensitivity',
              '조건의 우변이 조금 달라질 때 해의 변화가 얼마나 커질 수 있는지. 20×라면 같은 단위에서 조건 오차 0.001이 해 변화 약 0.02로 증폭될 수 있다는 국소 예측입니다.',
            ],
          ],
        ),
        p(
          'Sensitivity는 데이터 단위에 의존합니다. 서로 다른 방정식의 단위가 다르면 같은 절대 오차를 넣는 가정이 적절한지 먼저 확인하세요. 계산기의 Float64 반올림 오차와 측정 장비의 오차도 다른 문제입니다.',
        ),
      ),
      section(
        'conditioning',
        '6. Condition Number & Rank',
        p(
          'Rank는 조건이 서로 얼마나 독립적인지 나타냅니다. x+y=2와 2x+2y=4는 두 줄이지만 같은 정보라서 x와 y를 각각 정하지 못합니다. 두 번째 우변을 5로 바꾸면 조건끼리 충돌합니다. 이때 임의의 유일한 해를 만들어 내지 않습니다.',
        ),
        p(
          'Condition Number는 입력의 상대적인 작은 변화가 해의 상대적인 변화로 증폭될 가능성입니다. 거의 평행한 두 직선은 교점이 멀리 이동하기 쉬워 조건수가 큽니다. 절대 민감도는 현재 단위로 “0.001의 조건 오차가 답을 얼마나 움직이는가”, 조건수는 상대적인 문제의 불안정성을 봅니다.',
        ),
        p(
          '예를 들어 0.000001*x=1은 x=1000000입니다. 1×1 비영 행렬의 Condition Number는 1이지만 우변이 0.001 바뀌면 x는 1000 바뀝니다. 조건수 1만 보고 절대 오차가 작다고 결론 내릴 수 없습니다. ∞-Norm은 가장 큰 행 합에 따른 최악 성분 기준, 2-Norm은 SVD의 방향별 확대 비율 기준입니다. 선택은 진단 관점을 바꾸며 답을 더 정확한 산술로 다시 만드는 기능은 아닙니다.',
        ),
      ),
      section(
        'algorithm',
        '7. How the Calculation Works',
        p(
          '수식에서 미지수별 계수와 우변을 모아 Ax=b라는 표로 바꿉니다. 행렬 A는 조건의 계수, 벡터 x는 미지수, b는 목표값입니다. 엔진은 크기 차이와 피벗을 고려해 선형계를 풀고, 원래 조건에 다시 대입해 결과를 점검합니다. 선형 계산에 비선형 접점 분류를 적용하지 않습니다.',
        ),
        p(
          '입력은 제한된 수학 구문으로 해석하며 실행 가능한 프로그램 코드로 실행하지 않습니다. 최대 64개 미지수의 유일한 해 문제를 지원합니다. 무한히 많은 해의 전체 매개변수 표현, 일반 부등식 풀이, 복소수 선형계는 이 화면의 기능이 아닙니다.',
        ),
      ),
      section(
        'troubleshooting',
        '8. Troubleshooting',
        table(
          ['Problem', 'What to check'],
          [
            [
              '조건 수가 맞지 않음',
              '조절 상수를 Parameter로 등록했는지, 미지수 이름을 잘못 썼는지 확인합니다.',
            ],
            [
              '독립적인 해가 없음',
              '같은 조건의 배수·서로 충돌하는 조건을 찾아 수정합니다.',
            ],
            [
              'Parameter를 바꿀 때 급격히 커짐',
              '조건이 거의 종속되는지, 분모가 되는 계수가 0에 가까워지는지 봅니다. 이는 모델의 실제 민감성일 수 있습니다.',
            ],
            [
              '소수점 마지막 자리가 달라짐',
              '표시 반올림과 수치 오차를 구별합니다. 유효 자릿수는 식의 조건성과 입력 측정 정밀도를 함께 고려합니다.',
            ],
          ],
        ),
      ),
    ],
  },
  {
    id: 'nonlinear',
    title: 'Nonlinear Equations',
    summary:
      '실수 해를 발견하고, 여러 해의 생성·병합과 검증 결과를 그래프로 해석합니다.',
    sections: [
      section(
        'purpose',
        '1. What is a Nonlinear Equation?',
        p(
          'x^2=4의 답은 2와 −2 두 개입니다. x=2 하나만으로 끝내면 조건을 만족하는 다른 수를 놓칩니다. Nonlinear는 제곱·변수끼리의 곱·삼각함수·로그처럼 직선보다 복잡한 관계를 뜻합니다. 해가 없거나 여러 개 또는 무한히 많을 수 있습니다.',
        ),
        ...workflow('등식과 Parameters'),
        p(
          '기본 Automatic Search는 초기 추정값 없이 유한한 범위의 실수 해를 탐색합니다. 별도의 Complex Roots 계산기는 포함하지 않습니다. “모든 해” 표시는 결과에서 실제로 검증한 범위에 대한 말이며 실수축 전체를 뜻하지 않습니다.',
        ),
      ),
      section(
        'first-model',
        '2. First Model · 세 해와 근 병합',
        code(
          guideExamples.nonlinear,
          'p를 Parameter로 등록하고 현재값 0, 범위 -1…1, Sample Spacing 0.05로 설정',
        ),
        list(
          'p=0이면 x=−1, 0, 1 세 실근입니다. Merged Simulation에서 각 해를 서로 다른 색으로 함께 표시합니다.',
          'p를 약 0.384900으로 움직이면 x≈−0.577350 부근에서 두 해가 만나며, 이를 넘으면 그 두 실근이 사라지고 나머지 실근만 남습니다.',
          '반대쪽 p≈−0.384900에서는 x≈0.577350 부근에서 두 해가 만납니다. 병합 표시를 클릭해 좌표와 판정 근거를 봅니다.',
          '현재값에서 실근이 하나여도 전체 Parameter 범위를 탐색하면 다른 조건에서 생기는 해가 보일 수 있습니다. 현재 Solution 목록과 범위 전체의 곡선 수는 다른 정보입니다.',
        ),
        note(
          'Expected values',
          '임계값은 ±2/(3√3)입니다. Sample Spacing 격자가 정확히 임계값을 밟지 않을 수 있으므로 마지막 샘플 좌표와 접점 보정 좌표가 같을 필요는 없습니다.',
        ),
      ),
      section(
        'syntax',
        '3. Equations, Definitions & Functions',
        ...expressionBasics(),
        code(
          'f1(x)=cos((3/pi)*x)\nf2(x)=(1/3)*sinh(x)+tr\nf1(x)=f2(x)',
          'tr을 Parameter로 등록하면 두 곡선의 교점을 탐색합니다.',
        ),
        p(
          'f1(x)=...는 식을 정의하는 동작입니다. 목표 등식 f1(x)=f2(x) 또는 f1(x)=0을 별도로 적어야 풀이 조건이 됩니다. f1+f2, f1-f2처럼 정의한 식의 합·차도 쓸 수 있습니다. 번호 없는 k=4는 일반 등식이므로 k를 조절 상수로 쓰려면 Parameters에 등록하세요.',
        ),
        ...functionReference(),
      ),
      section(
        'search',
        '4. Search Range, Initial Guess & Limits',
        p(
          '기본 탐색 범위는 미지수마다 −100…100입니다. 물리적으로 부피가 양수라면 그에 맞는 Min / Max를 지정하세요. 범위 밖의 해를 발견했다고 해석하지 않습니다. 유리식은 분자 다항식 후보를 원래 식에서 다시 검증하고 분모 0을 해로 채택하지 않습니다.',
        ),
        p(
          '근이 매우 많은 주기식에서는 표시·계산 예산 안에서 자세히 볼 수 있는 Search Window로 줄일 수 있습니다. 결과에 실제 범위와 창 제한을 표시합니다. 창의 위치를 옮겨 다른 구간을 살펴보세요. 무한한 근 목록이나 임의 고주파 함수의 모든 근을 유한한 시간에 표시하는 기능은 아닙니다.',
        ),
        code(
          'x^2=4\nx(0)=1',
          'Initial Guess 모드: 처음에 양의 근을 선택하는 예',
        ),
        p(
          'Initial Guess는 첫 해를 선택하는 출발점입니다. Parameter를 움직이면 매번 그 숫자에서 새로 출발해 아무 근이나 고르는 대신, 선택한 해를 연속 추적합니다. x(min)=0, x(max)=3처럼 미지수 범위를 명시할 수도 있습니다. Initial Guess는 정답을 강제로 지정하는 값이 아닙니다.',
        ),
      ),
      section(
        'simulation',
        '5. Curves, Samples & Merged Simulation',
        p(
          'X축은 선택한 Parameter, Y축은 해의 값입니다. 서로 다른 해를 다른 색으로 표시하고, Merged Set을 여러 개 만들어 필요한 해끼리 비교할 수 있습니다. 한 해를 숨기거나 선택해도 원래 모델의 해를 지우는 것은 아닙니다.',
        ),
        p(
          'Sample Spacing은 저장할 실제 계산점 사이의 간격입니다. 곡선은 추적 계산점들을 연결해 그리며 샘플 마커도 그 계산점에 놓입니다. 곡선의 정확한 곡률을 보기 위해 내부에 더 촘촘한 점이 쓰일 수 있습니다. 샘플 간격이 크면 급격한 변화를 성기게 보게 됩니다. 현재 Parameter는 샘플 간격과 무관하게 연속 조절됩니다.',
        ),
        p(
          'Hover는 곡선의 값을 미리 살펴보며 Click은 그 Parameter를 적용해 직접 계산합니다. 클릭 후 Wheel 확대는 표시 축만 바꿉니다. 가까이 확대했다고 근의 수치 정밀도가 증가하지 않습니다. 탐색 Parameter를 바꾸면 X축의 의미와 추적 곡선도 다시 계산합니다.',
        ),
        note(
          'A gap in a curve',
          '끊어진 선은 이 추적이 해당 구간을 연결하지 못했다는 뜻입니다. 실제 근 소멸, 분모 극점, 정의역 이탈, 수치 보정 실패가 원인일 수 있습니다. 상태·이벤트 좌표를 확인하고 그 Parameter에서 Automatic Search를 별도로 실행해 구별하세요. 끊김만으로 “근 없음”을 증명하지 않습니다.',
        ),
      ),
      section(
        'events',
        '6. Root Events · 다른 모양의 표식',
        table(
          ['Event', 'Data interpretation'],
          [
            [
              'Root Merge · Even-order Tangency',
              '짝수차 접점에서 둘 이상의 실근이 만나고 한쪽 설정에서 사라질 수 있습니다. x^2=p의 p=0처럼 해 개수가 바뀌는 경계입니다.',
            ],
            [
              'Inflection Passage · Third-order Contact',
              'x^3=p는 p=0에서 평평해져도 유일한 실근이 관통합니다. 세제곱 접점이라는 이유만으로 세 가지가 생성되었다거나 일반적인 Cusp 분기가 증명되었다고 말하지 않습니다.',
            ],
            [
              'Higher-order Contact',
              '(x−1)^4=p처럼 더 평평한 접점은 2차 가정 대신 고차 도함수 모델로 국소 검증합니다. 고차일수록 위치와 차수 판정이 민감할 수 있습니다.',
            ],
            [
              'Boundary Reached',
              'sqrt, ln, 분모 등의 유효 영역 끝에 도달한 상태입니다. 열린 정의역의 극한값을 실제 해로 바꾸지 않습니다.',
            ],
            [
              'Non-smooth / Flat solution set',
              'abs의 꺾임이나 min·floor의 평탄 구간은 매끄러운 접점과 다릅니다. 구간 전체가 해이면 몇 개의 고립근으로 세지 않습니다.',
            ],
          ],
        ),
        p(
          '특별 표식은 일반 샘플과 구별되는 이벤트입니다. “검증”은 원래 등식과 국소 도함수 조건을 수치적으로 확인했다는 뜻입니다. 모든 다변수 분기 구조의 수학적 증명은 아닙니다. 좌표가 같은 이벤트는 중복 메시지로 반복하지 않습니다.',
        ),
      ),
      section(
        'accuracy',
        '7. Accuracy, Sensitivity & Condition Number',
        p(
          'Equation Error는 해를 원래 등식에 대입한 좌변−우변의 크기입니다. 작은 값은 조건을 잘 맞췄다는 뜻이지만 평탄한 식에서는 위치 오차가 클 수 있습니다. (x−2)^6은 x가 2에서 조금 떨어져도 값이 매우 작기 때문입니다.',
        ),
        p(
          'Certified Error Bound는 구간 검증으로 참 해를 포함하는 상자가 있을 때 보고한 값 주변의 최대 거리를 계산한 상한입니다. 단순 Newton Correction은 다음 보정량의 국소 추정이며 같은 보장이 아닙니다. 리포트가 어느 종류를 표시하는지 확인하세요.',
        ),
        p(
          'Absolute Sensitivity는 등식에 절대 오차 δ가 생겼을 때 해가 얼마나 움직일지 보는 국소 지표입니다. 한 변수의 단순근에서는 약 1/|F′|입니다. 값이 0.737×, δ=0.0003이면 최대 변화의 국소 예측은 약 0.000221입니다. 중근에서는 기울기가 0이 되어 선형 예측이 깨지므로 접점 차수에 따른 비선형 반응을 따로 봅니다.',
        ),
        p(
          'Condition Number는 Jacobian의 상대적인 방향 불균형입니다. 다변수에서 조건이 거의 종속되는지 진단합니다. 한 변수의 비영 1×1 Jacobian은 조건수가 항상 1이므로 민감하지 않다는 뜻이 아닙니다. ∞-Norm은 최악 성분, 2-Norm은 SVD의 방향별 확대를 사용합니다. 둘 다 현재 해 근방의 진단이고 전역 보장이 아닙니다.',
        ),
      ),
      section(
        'certification',
        '8. Verification Map & Probability',
        p(
          'Verification Map은 탐색 범위를 Root Isolated, Root-free, Domain Excluded, Unresolved로 나눕니다. Root Isolated는 해를 격리한 상자, Root-free는 해가 없음을 구간 계산으로 확인한 구간, Domain Excluded는 실수 정의역 밖, Unresolved는 예산·지원 연산·접점 때문에 판정을 끝내지 못한 구간입니다.',
        ),
        p(
          'Verified Coverage는 판정된 구간 길이의 비율입니다. 99.99%여도 남은 작은 틈에 근이 있을 수 있으므로 “해를 전부 찾을 확률 99.99%”가 아닙니다. 전체 근 확인은 지원되는 단일 변수 모델·명시한 유한 범위에서 구간 판정이 완료되고 실제 결과 목록과 일대일 대조된 경우에만 표시합니다.',
        ),
        p(
          'Root Count Stability는 다른 질문입니다. 계산 대상 등식을 F(x)=0이라고 할 때, 전체 범위에서 같은 크기로 더해지는 하나의 오차 ε를 가정해 F(x)+ε=0으로 바꿉니다. ε가 평균 0, Standard Deviation σ인 Gaussian 변수라고 명시했을 때, 범위 안 근의 개수가 유지될 확률의 상하한을 검증합니다.',
        ),
        p(
          '예를 들어 x^2+0.000001=0은 현재 실근이 없지만 음의 오프셋이 충분히 크면 두 실근이 생길 수 있습니다. σ가 크면 개수의 안정성이 떨어질 수 있습니다. 여기의 확률은 발견한 해가 맞을 확률·미발견 근이 없을 확률·각 측정값의 독립 잡음 모델이 아닙니다.',
        ),
        note(
          'Choose σ in the equation unit',
          'σ는 좌변−우변의 단위입니다. 식 전체를 100배 하면 같은 측정 가정을 유지하려면 σ도 100배 해야 합니다. 검증할 수 없는 모델에는 임의의 0%나 100%를 주지 않으며 사유를 표시합니다.',
        ),
      ),
      section(
        'algorithm',
        '9. How Search Works & Troubleshooting',
        p(
          '단일 변수의 다항식·유리식은 구조에서 후보 근을 분리하고 원래 식에 다시 대입합니다. 일반 함수는 격자·부호 변화·국소 보정 등 여러 경로를 사용합니다. 지원하는 식에는 Interval Arithmetic으로 작은 점 사이 전체 구간을 평가해 숨은 근 가능성을 판정합니다. 다변수는 여러 출발점의 국소 풀이를 모으므로 일반적인 전체 해 보장은 없습니다.',
        ),
        table(
          ['Symptom', 'Action'],
          [
            [
              '예상한 해가 없음',
              '변수별 탐색 범위·현재 Parameters·실수 정의역부터 확인합니다. 동일 식의 물리 상수·단위를 다시 확인하세요.',
            ],
            [
              '근이 매우 많이 나옴',
              '표시 한도·Search Window를 확인하고 필요한 위치로 범위를 옮깁니다.',
            ],
            [
              '원점이나 접점 근처에 값이 흔들림',
              '평탄함·중근에서는 작은 등식 오차가 충분하지 않습니다. Error Bound와 접점 검증 상태를 함께 봅니다.',
            ],
            [
              '그래프가 다른 해로 점프한 듯함',
              '직접 계산값과 Preview를 구별하고 추적 실패 사유·병합 이벤트를 확인합니다. 실패 구간을 잇는 선이 정답은 아닙니다.',
            ],
          ],
        ),
        p(
          'Float64, 유한 탐색 범위, 시간·근 개수 한도가 있습니다. 기본 표시 실근 수 상한은 32개입니다. 고주파 진동, 매우 가까운 고차 중근, 비매끄러운 함수, 고차원 계에서는 미결정 상태를 남길 수 있습니다. 이 상태를 정답이나 해 부재로 조용히 바꾸지 않습니다.',
        ),
      ),
    ],
  },
  {
    id: 'ode',
    title: 'Differential Equations',
    summary:
      '현재 상태에서 변화율을 계산하고 작은 시간 이동을 쌓아 미래 궤적을 구합니다.',
    sections: [
      section(
        'purpose',
        '1. What is an Initial Value Problem?',
        p(
          '방정식 A=2는 어떤 순간의 값을 말합니다. d(A)/d(t)=−k*A는 시간이 흐를 때 A가 얼마나 빠르게 변하는지 말합니다. d(A)/d(t)는 Change Rate입니다. 음수면 감소, 양수면 증가합니다. 현재 남아 있는 양에 비례해서 감소하는 약물·반응물·방사성 물질에 쓰는 기본 모델입니다.',
        ),
        p(
          '미분식만으로는 출발량을 알 수 없습니다. Initial Value A(0)=1과 계산 시간 범위가 필요합니다. 이 모듈은 이런 초기값 Ordinary Differential Equation (ODE)을 풉니다. 서로 영향을 주는 여러 상태도 함께 계산할 수 있습니다.',
        ),
        ...workflow('변화율·Initial Values·계산 범위'),
      ),
      section(
        'first-model',
        '2. First Model · 지수 감소',
        code(
          guideExamples.ode,
          'A의 단위를 mol/L, t의 단위를 s로 생각해 봅니다.',
        ),
        list(
          '계산 설정에서 Auto 또는 RK45, Output Samples 101, Tolerance 1e-7을 사용합니다.',
          '시작값은 A=1입니다. t=4에서는 A≈0.367879, t=10에서는 A≈0.082085가 나옵니다.',
          '이는 A(t)=exp(−0.25*t)라는 해석해와 비교할 수 있습니다. k의 단위는 1/s여야 우변이 농도/시간 단위가 됩니다.',
          'k를 0.5로 바꾸면 더 빨리 감소합니다. 최종값만 보지 말고 같은 시각의 곡선을 비교하세요.',
        ),
        note(
          'Initial Value is a state',
          'A(0)=1은 출발 상태를 정확히 주는 모델 설정입니다. Equation Solver의 Newton Initial Guess와 달리 단순한 계산 출발 추정이 아닙니다. 시작량을 바꾸면 다른 물리 문제입니다.',
        ),
      ),
      section(
        'syntax',
        '3. Derivatives, Helpers & Syntax',
        code(
          'd(A)/d(t)=-r\nr=k*A\nk=0.25\nA(0)=1\nt(0)=0\nt(f)=10',
          '같은 문제의 풀어 쓴 형태',
        ),
        p(
          "d(A)/d(t), dA/dt, A' 세 미분 표기를 지원합니다. A(0)=1 또는 A|1로 초기값을 지정하고, t|0:10은 시작·끝을 합친 표기입니다. 독립변수는 한 문제에서 하나이며 끝은 시작보다 커야 합니다. 초기값·범위에는 유한한 숫자를 사용합니다.",
        ),
        p(
          'r=k*A 같은 Helper는 현재 A로 매번 다시 계산합니다. 입력 순서에 관계없이 의존성을 정리하며 순환 참조는 거부합니다. 숫자로 정의한 k는 Parameter로 조절할 수 있지만 동적 Helper r나 상태 A를 상수로 덮어쓸 수는 없습니다. f1(A)=−k*A를 정의해 변화율에 재사용할 수도 있습니다.',
        ),
        ...expressionBasics(),
      ),
      section(
        'methods',
        '4. Integration Method · 어떤 방법을 고르나요?',
        table(
          ['Method', 'Practical interpretation'],
          [
            [
              'RK45',
              '여러 중간 기울기를 사용한 5차/4차 예측의 차이로 국소 오차를 추정합니다. 변화가 느리면 큰 시간 간격, 빠르면 작은 시간 간격으로 적응합니다. 일반적으로 매끄럽고 강성이 심하지 않은 초기값 문제에 적합합니다.',
            ],
            [
              'Implicit Euler',
              '다음 시각의 상태 자체를 식에 넣은 연립식을 Newton 보정으로 풉니다. 빠르게 감쇠하는 성분 때문에 RK45가 너무 작게 나아가는 강성 문제에 유용합니다. 전체 스텝과 두 반 스텝의 차이로 오차를 추정하는 1차 계열입니다. 같은 설정에서 RK45보다 누적 오차가 클 수 있습니다.',
            ],
            [
              'Auto',
              'RK45로 시작하고 반복 거부·과도한 스텝 부담을 관찰하면 Implicit 방법으로 전환합니다. 실제 사용 경로를 결과에 표시합니다. 강성의 수학적 증명이나 항상 가장 빠른 선택을 뜻하지 않습니다.',
            ],
          ],
        ),
        p(
          'Stiffness는 눈에 보이는 궤적이 느리게 변해도 내부에 아주 빠르게 가라앉는 변화가 함께 있어 계산이 작은 스텝을 요구하는 현상입니다. 화학 반응에서 1초 규모 반응과 백만분의 1초 반응이 섞인 경우를 떠올리면 됩니다. 곡선이 예쁘게 매끄럽다는 이유로 강성이 없다고 판단할 수 없습니다.',
        ),
        p(
          '처음에는 Auto를 선택하세요. RK45의 스텝 수가 과도하거나 진행이 멈추면 Implicit을 비교합니다. 중요한 결론은 Tolerance를 줄였을 때 값이 안정되는지, 해석해·보존량과 맞는지 함께 확인합니다. 이 구현은 Radau나 BDF와 동일하지 않습니다.',
        ),
      ),
      section(
        'settings',
        '5. Tolerance, Output Samples & Internal Steps',
        p(
          'Output Samples는 결과 표와 그래프에 저장하는 시각 개수입니다. 0~10을 101개로 출력하면 0, 0.1, …, 10의 101개 시각을 얻습니다. 이 0.1은 내부 적분 스텝을 0.1로 고정한다는 뜻이 아닙니다. 각 출력 시각에 도달하기 위해 더 작은 여러 적응 스텝을 사용할 수 있습니다.',
        ),
        p(
          'Tolerance는 한 스텝의 오차를 승인할 때 쓰는 척도입니다. 성분마다 tol×(0.01+max(|이전값|,|다음값|))를 사용합니다. tol=1e-7이고 상태가 약 1이면 기준은 약 1.01e-7, 상태가 매우 작으면 약 1e-9입니다. 모든 시각의 실제 오차가 반드시 이 수 이하라는 뜻은 아닙니다.',
        ),
        p(
          'Output Samples를 늘리면 급한 봉우리를 더 잘 볼 수 있지만 새 측정 정보가 생기거나 전역 정확도가 자동 보장되지는 않습니다. Tolerance를 줄이면 내부 계산량이 늘 수 있습니다. Float64 반올림 때문에 무조건 작게 설정하는 것이 좋지는 않습니다.',
        ),
        note(
          'Partial result',
          'Status가 Stopped면 마지막 도달 시각까지만 계산한 부분 궤적입니다. 정의역 이탈·허용 오차 미달·발산·시간 예산 초과 사유를 확인하세요. 마지막 행을 요청한 최종시각의 답이라고 읽으면 안 됩니다.',
        ),
      ),
      section(
        'plots',
        '6. Time Series & Phase Plot',
        p(
          'Time Series의 X축은 독립변수 t, Y축은 선택한 상태입니다. A와 B의 단위가 다르면 크기만 직접 비교하지 마세요. Phase Plot은 X와 Y에 두 상태를 직접 지정합니다. X=A, Y=B라면 가로 좌표가 A, 세로 좌표가 B이며 시간은 어느 축도 아닙니다.',
        ),
        code(
          "x'=v\nv'=-x\nx|1\nv|0\nt|0:6.283185307179586",
          'Phase Plot에서 X=x, Y=v를 선택',
        ),
        p(
          '감쇠 없는 진동자에서는 x=cos(t), v=−sin(t)라서 Phase Plot이 원을 그립니다. 같은 점을 다시 지나는 것은 시간이 뒤로 갔다는 뜻이 아니라 상태가 반복된다는 뜻입니다. 시간 방향은 현재 시각 표시·재생 순서로 확인합니다. 위치와 속도의 단위가 다르면 원·타원의 화면 모양만으로 에너지 크기를 판단하지 않습니다.',
        ),
        p(
          '표의 Init / Min / Max / Final Value는 계산에 저장된 출력 시각에 대한 요약입니다. 출력 사이의 진짜 연속 극값까지 전부 분리한 결과가 아닙니다. 아주 짧은 봉우리가 중요하면 출력 간격·시간 범위를 세밀하게 조정하세요.',
        ),
      ),
      section(
        'report',
        '7. Report · 결과를 믿기 전에',
        table(
          ['Item', 'Interpretation'],
          [
            [
              'Status / Reached Time',
              '요청한 끝까지 실제 도달했는지 먼저 봅니다. Stopped는 실패 사유와 도달 범위를 함께 읽습니다.',
            ],
            [
              'Final Value',
              '도달한 마지막 시각의 상태. 농도·온도처럼 입력의 상태 단위를 그대로 갖습니다.',
            ],
            [
              'Estimated Local Error',
              '승인한 스텝에서 두 방법의 차이에 근거한 오차 추정. 누적 전역 오차 상한·측정 신뢰도·확률이 아닙니다.',
            ],
            [
              'Steps / Evaluations',
              '계산 노력의 크기. 많으면 급변·강성·엄격한 설정 등이 원인일 수 있습니다. 큰 수 자체가 더 정확한 결과를 증명하지는 않습니다.',
            ],
          ],
        ),
        p(
          'A→B→C처럼 닫힌 반응계라면 Total=A+B+C가 일정한지 확인합니다. 이런 Conservation Check는 식을 잘못 쓰거나 큰 오차를 발견하는 데 유용합니다. 보존량 하나가 맞아도 모든 성분이 정확하다는 충분조건은 아니므로 설정을 줄여 재계산한 결과도 비교하세요.',
        ),
      ),
      section(
        'functions',
        '8. Functions, Domain & Units',
        ...functionReference(),
        p(
          '시간이 s라면 모든 변화율의 단위는 상태 단위/s가 되어야 합니다. 온도 의존 반응식은 K와 °C를 구별하세요. ln(A)처럼 차원이 있는 물리량을 직접 로그에 넣기보다 기준량과의 비 ln(A/Aref)를 모델에 맞게 사용합니다. 이는 계산 문법의 제한과 별개인 물리 모델의 문제입니다.',
        ),
      ),
      section(
        'troubleshooting',
        '9. Troubleshooting & Supported Problems',
        table(
          ['Problem', 'Action'],
          [
            [
              'Initial Value가 없다는 오류',
              '모든 미분 상태에 출발값이 있는지, 대소문자가 같은지 확인합니다.',
            ],
            [
              '계산이 아주 느림',
              'Auto / Implicit 비교, 시간 범위 축소, 단위·강성·폭발적 계수 확인 순서로 검토합니다.',
            ],
            [
              '농도가 약간 음수 / 로그 오류',
              '수치 오차·모델의 경계 조건을 확인합니다. 자동 양수 강제 기능은 아니며 음수를 몰래 0으로 만들지 않습니다.',
            ],
            [
              '결과가 매끈하지만 틀려 보임',
              '변화율의 부호·단위·초기값을 확인하고 해석해나 보존량으로 독립 검증합니다.',
            ],
          ],
        ),
        p(
          '초기값 ODE, 최대 32개 상태와 256개 Helper를 지원합니다. PDE, 일반 DAE, 양 끝에서 조건을 주는 Boundary Value Problem, 이벤트 위치의 엄밀한 분리는 포함하지 않습니다. 시간·스텝·함수 평가 예산을 넘으면 부분 결과와 중단 사유를 반환합니다.',
        ),
      ),
    ],
  },
  {
    id: 'curve-fit',
    title: 'Linear / Polynomial Regression',
    summary:
      '측정점을 모두 지나는 대신, 데이터의 전체 경향을 설명하는 직선·다항식의 계수를 추정합니다.',
    sections: [
      section(
        'purpose',
        '1. What is Regression?',
        p(
          '측정에는 흔들림이 있으므로 모든 점을 지나는 식이 좋은 모델인 것은 아닙니다. Regression은 관측값과 모델값 차이의 제곱합이 작도록 계수를 고릅니다. x는 설명변수, y는 측정한 목표값입니다. 센서 검량선의 농도→신호, 거리→에너지 관계 등이 예입니다.',
        ),
        p(
          'Linear Regression은 y=a0+a1*x, Polynomial Regression은 y=a0+a1*x+a2*x^2+…입니다. x의 제곱을 쓰더라도 추정 계수 a0,a1,…에는 선형이므로 안정적인 선형 최소제곱으로 풀 수 있습니다.',
        ),
        ...workflow('관측 데이터와 polyfit 명령'),
      ),
      section(
        'first-model',
        '2. First Fit · 알려진 직선 복원',
        code(guideExamples['curve-fit']),
        list(
          'Curve Fitting에서 데이터를 넣고 Linear 또는 명령 차수 1을 사용합니다.',
          '이 자료는 정확히 y=1+2*x에 놓여 있으므로 a0≈1, a1≈2, RMSE≈0, R²≈1입니다.',
          '예측 x=2.5에서 모델값은 6입니다. 입력 측정점 사이의 모델 예측이지 실제로 새 측정을 한 값은 아닙니다.',
          '데이터 한 점을 조금 바꾸어 계수와 RMSE가 어떻게 달라지는지 관찰하세요. 실제 측정에서는 완벽한 0 오차를 기대하지 않습니다.',
        ),
      ),
      section(
        'syntax',
        '3. polyfit · Degree & Origin',
        ...dataSyntax(),
        table(
          ['Command', 'Model'],
          [
            ['polyfit x y 1', 'y=a0+a1*x: 절편이 있는 직선'],
            ['polyfit x y 2', 'y=a0+a1*x+a2*x^2: 2차 다항식'],
            [
              'polyfit x y 2 origin',
              'y=a1*x+a2*x^2: 원점을 반드시 지나는 2차 다항식',
            ],
          ],
        ),
        p(
          'Degree는 1~12의 정수입니다. origin은 좌표를 편리하게 이동한다는 뜻이 아니라 Intercept를 정확히 0으로 고정한다는 물리적 제약입니다. 원점 근처 측정이 0이 아니라면 억지로 origin을 넣을 때 전체 모델이 왜곡될 수 있습니다. UI의 모델 선택을 바꾸면 실제 polyfit 명령의 차수도 확인하세요.',
        ),
        code(
          '[\nx y\n-2 5\n-1 2\n0 1\n1 2\n2 5\n3 10\n]\npolyfit x y 2',
          'Expected: a0≈1, a1≈0, a2≈1',
        ),
      ),
      section(
        'plots',
        '4. Fit Plot & Data Error',
        p(
          '점은 관측 데이터, 곡선은 추정한 모델입니다. Data Error는 관측값−예측값입니다. +0.2이면 모델이 그 관측을 0.2 낮게 예측한 것입니다. 오차 점들이 0 주위로 섞이는지, 곡선 모양이나 부채꼴 패턴이 남는지 확인합니다.',
        ),
        p(
          '한 점의 큰 오차는 이상 측정일 수도 있고 중요한 실제 현상일 수도 있습니다. 잘 맞는 결과를 만들기 위해 근거 없이 지우지 마세요. 자료 범위 바깥 Extrapolation은 높은 R²라도 불안정합니다. 고차 다항식은 특히 양 끝 밖에서 급격히 커질 수 있습니다.',
        ),
      ),
      section('metrics', '5. Report · Fit Quality', ...regressionMetrics()),
      section(
        'confidence',
        '6. Standard Error & 95% Confidence Interval',
        ...confidenceIntervals(),
      ),
      section(
        'algorithm',
        '7. SVD, Rank & Polynomial Scaling',
        p(
          '엔진은 데이터 행마다 1,x,x^2,…의 계수 표를 만들고 SVD로 최소제곱을 풉니다. SVD는 서로 구별할 수 있는 정보 방향과 거의 겹치는 방향을 나누어 보는 계산입니다. 직접 정규방정식 XᵀX를 만들지 않아 그 과정의 조건성 악화를 줄입니다.',
        ),
        p(
          'x=1000000000 부근처럼 좌표가 큰 경우 중심과 크기를 정규화한 모델에서 예측을 계산합니다. Report의 a0,a1,…는 원래 x의 전개 계수이므로 큰 수끼리 상쇄할 수 있습니다. 예측·곡선에는 안정적인 정규화 표현을 사용하며, 전개 계수만 손으로 대입한 값과 마지막 자리가 다를 수 있습니다.',
        ),
        p(
          '독립 데이터가 부족하거나 설명 열들이 같은 정보를 주면 Rank가 부족합니다. 같은 x만 여러 번 측정해서는 기울기를 정할 수 없습니다. Degree를 올릴 때는 서로 다른 x의 수와 DOF를 확보해야 합니다. 랭크가 부족하면 임의의 유일 계수를 반환하지 않습니다.',
        ),
      ),
      section(
        'troubleshooting',
        '8. Model Choice & Troubleshooting',
        list(
          '먼저 작은 Degree로 시작하고 Data Error에 남는 곡률을 봅니다. 차수를 높여 학습 오차만 줄이는 Overfitting을 피하세요.',
          '같은 자료의 Linear / Polynomial을 비교하고 별도 검증 데이터가 있다면 그 예측 오차를 우선합니다.',
          '입력 y 단위가 바뀌면 계수·RMSE·SE도 바뀝니다. CI가 좁아도 잘못된 단위나 모델식은 고쳐 주지 못합니다.',
          '강한 이분산·상관 오차·Outlier가 있으면 기본 동일 가중 최소제곱의 CI 가정이 맞지 않을 수 있습니다. 현재 일반 Weighted / GLS 회귀를 자동으로 제공하지 않습니다.',
        ),
        p(
          '정확히 맞는 작은 교과서 데이터의 거의 0인 SE는 그 데이터와 오차 모델 안의 결과입니다. 실제 센서 정밀도가 무한히 좋다는 뜻은 아닙니다.',
        ),
      ),
    ],
  },
  {
    id: 'multilinear',
    title: 'Multilinear Regression',
    summary:
      '여러 설명변수가 함께 변하는 데이터에서 각 변수의 계수를 구분해 추정합니다.',
    sections: [
      section(
        'purpose',
        '1. Several Predictors, One Response',
        p(
          '온도와 유량이 모두 수율에 영향을 줄 때 y=a0+b1*T+b2*flow처럼 여러 설명변수를 사용합니다. Multilinear는 각 계수가 선형으로 들어간다는 뜻입니다. 변수 이름이 여러 개라고 모든 복잡한 상호작용을 자동으로 찾아 주지는 않습니다.',
        ),
        p(
          'b1은 “다른 모델 변수를 고정했을 때 T 한 단위 증가에 따른 예측 변화”입니다. 관찰 데이터의 상관관계만으로 원인·결과를 증명하는 값이 아닙니다. 포함하지 않은 변수의 영향이 계수에 섞일 수도 있습니다.',
        ),
        ...workflow('여러 열의 데이터와 mlinfit 명령'),
      ),
      section(
        'first-model',
        '2. First Fit · 두 입력의 효과 구분',
        code(guideExamples.multilinear),
        list(
          '명령의 마지막 열 이름 y가 목표값입니다. 그 앞 x1, x2는 설명변수입니다.',
          '예상 모델은 y≈2+3*x1−4*x2입니다. Intercept≈2, b_x1≈3, b_x2≈−4입니다.',
          'x1=2, x2=1이면 예측값은 2+6−4=4입니다.',
          'x2를 고정하면 x1이 1 증가할 때 y가 3 증가합니다. 반대로 x1을 고정하면 x2가 1 증가할 때 4 감소합니다.',
        ),
      ),
      section(
        'syntax',
        '3. mlinfit & Derived Predictors',
        ...dataSyntax(),
        code(
          'interaction=x1*x2\nmlinfit x1 x2 interaction y',
          '표의 x1, x2로 상호작용 열을 만들어 넣는 명령 예',
        ),
        p(
          '명령은 mlinfit x1 x2 ... y [origin]입니다. origin은 Intercept=0을 강제합니다. Helper로 x1*x2 같은 설명 열을 직접 만들 수 있지만, 각 계수가 충분히 구별되도록 데이터가 있어야 합니다. 설명변수는 최대 24개이며 추정 계수보다 충분히 많은 독립 자료를 권장합니다.',
        ),
        p(
          '모델을 정한 뒤 y를 가공해 그 값을 설명변수로 다시 쓰면 답을 이미 모델 입력에 넣는 Data Leakage가 됩니다. 엔진은 이런 종속변수 유출을 거부합니다. x 열의 변환은 관측 전에 알 수 있는 정보로만 정의하세요.',
        ),
      ),
      section(
        'plots',
        '4. Observed vs Predicted',
        p(
          '설명변수가 여러 개이면 단일 x축 곡선 하나로 모델 전체를 표현할 수 없습니다. Predicted vs Observed에서는 한 점이 한 데이터 행입니다. 가로가 관측 y, 세로가 예측 y이면 y=x 대각선 가까울수록 잘 맞습니다. 이 대각선은 회귀식 자체가 아니라 비교 기준입니다.',
        ),
        p(
          'Row Plot의 X축은 자료 행 번호일 수 있습니다. 행 번호를 시간이나 온도라고 해석하면 안 됩니다. 오차를 각 설명변수에 대해 비교해 누락한 곡률·상호작용 패턴이 있는지 봅니다.',
        ),
      ),
      section(
        'coefficients',
        '5. Coefficients, Units & Collinearity',
        p(
          'T가 K, flow가 L/min, y가 kg라면 b_T는 kg/K, b_flow는 kg/(L/min)입니다. 숫자 크기만 보고 영향력이 더 크다고 비교하면 단위 차이를 혼동합니다. 실제 운영 범위에서 각 변수를 얼마나 바꿀 수 있는지도 함께 봅니다.',
        ),
        p(
          '두 열이 거의 같이 변하면 각 효과를 나누기 어렵습니다. 예를 들어 x2=2*x1이면 3*x1−4*x2와 다른 계수 조합이 같은 예측을 만들 수 있습니다. 이것이 Collinearity입니다. 완전히 종속되면 Rank 오류, 거의 종속되면 계수 SE와 Condition Number 증가로 나타납니다.',
        ),
        p(
          '데이터를 추가할 때 같은 비율의 행만 늘리는 것보다 설명변수들을 독립적으로 바꾼 실험이 계수 구분에 도움이 됩니다. 예측은 안정돼 보여도 개별 계수의 해석은 매우 불안정할 수 있습니다.',
        ),
      ),
      section('metrics', '6. Report · Model Quality', ...regressionMetrics()),
      section(
        'confidence',
        '7. Coefficient Confidence',
        ...confidenceIntervals(),
        p(
          '각 계수의 95% CI가 넓으면 다른 변수의 영향과 분리하기 어렵다는 신호일 수 있습니다. CI에 0이 들어간다고 그 변수가 현실에서 절대 영향이 없다는 뜻은 아닙니다. 여러 계수를 동시에 해석할 때 개별 95% 구간들을 합친 전체 동시 신뢰수준도 95%라고 가정하면 안 됩니다.',
        ),
      ),
      section(
        'algorithm',
        '8. Algorithm & Troubleshooting',
        p(
          '설명 열을 정규화한 뒤 직접 SVD 최소제곱으로 계산합니다. 선형 계수 문제이므로 초기 추정값은 필요하지 않습니다. SVD는 독립 정보와 겹치는 정보를 구별하고 랭크가 부족하면 유일한 계수를 반환하지 않습니다.',
        ),
        list(
          '열 순서를 확인하세요. mlinfit의 마지막 이름이 예측 대상입니다.',
          '계수가 예상과 반대 부호이면 단위·입력 오류 외에도 변수 상관·누락 변수·작은 표본을 검토합니다.',
          '설명변수의 범위를 벗어나는 조합은 위험합니다. 각 열 값이 개별 범위 안이어도 실제로 관측하지 않은 조합일 수 있습니다.',
          'R²가 높아도 인과관계를 증명하지 않습니다. 물리 지식·실험 설계와 함께 해석하세요.',
        ),
      ),
    ],
  },
  {
    id: 'nonlinear-fit',
    title: 'Nonlinear Regression',
    summary:
      '포화·지수 변화처럼 계수에 비선형인 과학 모델을 데이터에 맞춥니다.',
    sections: [
      section(
        'purpose',
        '1. A Model with Unknown Parameters',
        p(
          '반응속도 v=Vmax*S/(Km+S)는 농도 S가 커지면 Vmax에 가까워지는 포화 모델입니다. 여기서는 각 S의 방정식 해를 찾는 것이 아니라 여러 측정 S,v를 동시에 설명하는 Vmax와 Km을 추정합니다. Equation Solver의 Unknown과 Regression의 추정 Coefficient는 역할이 다릅니다.',
        ),
        p(
          'Nonlinear Regression은 계수에 대해 직선적인 표로 바로 풀리지 않으므로 초기 추정값을 주고 반복 개선합니다. 서로 다른 초기값에서 다른 국소 최솟값에 도달할 수 있습니다.',
        ),
        ...workflow('관측 데이터·모델·계수 Initial Guesses'),
      ),
      section(
        'first-model',
        '2. First Fit · Michaelis–Menten',
        code(guideExamples['nonlinear-fit']),
        list(
          'S는 농도, v는 측정한 속도입니다. Vmax와 Km에만 m(...) 초기 추정값을 줍니다.',
          '이 자료는 Vmax=2, Km=0.5에서 생성했습니다. 계산하면 두 계수가 각각 약 2와 0.5로 복원됩니다.',
          'Vmax는 속도의 단위, Km은 S와 같은 농도 단위입니다. S=Km이면 속도는 Vmax의 절반입니다.',
          '실제 데이터는 잡음이 있으므로 이 예제처럼 완벽하게 일치하지 않습니다. Initial Guess를 바꾸고 수렴 상태·모델 곡선·Data Error를 함께 비교하세요.',
        ),
      ),
      section(
        'syntax',
        '3. nlinfit, Guesses & Bounds',
        ...dataSyntax(),
        p(
          'nlinfit y=모델식에 목표 열과 모델을 적습니다. m(a)=1 또는 a(0)=1은 계수 초기값입니다. a(min)=0, a(max)=10은 선택적인 계수 범위이며 한쪽만 지정할 수도 있습니다. 초기값은 범위 안의 유효한 수여야 합니다.',
        ),
        code(
          'Ta=25\nnlinfit T=Ta+A*exp(-k*t)\nm(A)=50\nm(k)=0.2\nA(min)=0\nk(min)=0',
          't,T 표가 있을 때의 냉각 모델 명령 예',
        ),
        p(
          'Ta=25 같은 숫자 Helper는 고정 상수이고 외부 Parameter로 조절할 수 있습니다. m(A)는 데이터로 추정할 계수입니다. 물리적으로 양수여야 하는 계수에는 적절한 양수 경계를 사용하되, 경계에 걸리면 자유로운 계수의 대칭 CI 해석이 성립하지 않을 수 있습니다.',
        ),
        ...expressionBasics(),
      ),
      section(
        'algorithm',
        '4. Levenberg–Marquardt · 반복의 의미',
        p(
          '현재 계수에서 각 측정 행을 예측하고 관측−예측 차이를 계산합니다. 계수를 조금 바꿀 때 이 차이가 어떻게 변하는지 Jacobian으로 구한 뒤, 차이 제곱합이 줄어드는 방향을 찾습니다. 불안정한 큰 이동을 감쇠하는 것이 Levenberg–Marquardt의 역할입니다.',
        ),
        p(
          '엔진은 가능한 수식에 Automatic Differentiation을 쓰고 감쇠를 추가한 선형 스텝을 SVD로 풉니다. 일부 경계·비매끄러운 방향에서는 정의역 안 수치 미분을 사용하며 그 상태를 알립니다. 최대 반복·시간 예산을 넘기면 마지막 유효 결과를 Stopped로 표시합니다.',
        ),
        p(
          'Converged는 현재 초기값에서 국소 개선 조건을 만족했다는 뜻입니다. 전역 최적·유일한 물리 계수·정확한 모델이 증명되었다는 뜻이 아닙니다. 여러 초기값과 물리적으로 타당한 경계에서 같은 값으로 가는지 확인하면 유용합니다.',
        ),
      ),
      section(
        'plots',
        '5. Fit Plot & Identifiability',
        p(
          '한 설명변수 모델은 측정점과 적합 곡선을 직접 비교할 수 있습니다. 여러 설명변수 모델은 행별 예측을 봅니다. 곡선이 맞아도 개별 계수가 확실히 정해졌다고 단정하지 않습니다.',
        ),
        p(
          'Michaelis–Menten에서 S가 모두 Km보다 훨씬 작으면 v≈(Vmax/Km)*S입니다. 이 자료는 주로 비율만 알려주므로 Vmax와 Km을 따로 구분하기 어렵습니다. 포화 영역과 반응이 변하는 중간 영역을 포함한 자료가 개별 계수를 식별하는 데 도움이 됩니다. 이를 Identifiability라고 합니다.',
        ),
        p(
          '계수를 크게 바꿔도 곡선이 거의 같다면 불확실성이 큰 것입니다. 단순히 반복 수나 표시 자릿수를 늘려 해결할 수 없고, 모델을 단순화하거나 다른 영역의 측정이 필요할 수 있습니다.',
        ),
      ),
      section(
        'metrics',
        '6. Report · Fit & Convergence',
        ...regressionMetrics(),
        p(
          '먼저 Convergence Status와 마지막 유효 반복을 보고 RMSE·계수를 해석합니다. Stopped 결과의 작은 RMSE를 완성된 추정으로 오해하지 마세요. 작은 스텝도 민감도가 너무 작아 움직이지 못한 상태일 수 있어, 기울기·랭크 진단과 함께 봅니다.',
        ),
      ),
      section(
        'confidence',
        '7. Local Confidence Intervals',
        ...confidenceIntervals(),
        p(
          'Active Bound는 추정 계수가 허용 범위 끝에 닿았다는 뜻입니다. 예를 들어 k≥0에서 k=0이면 대칭 구간이 음수까지 확장되는 방식은 적절하지 않을 수 있습니다. 제공하지 않는 SE·CI를 0으로 읽지 마세요.',
        ),
      ),
      section(
        'functions',
        '8. Functions & Domain',
        ...functionReference(),
        p(
          'ln(a*x) 모델이라면 모든 관측 행과 시도할 계수에서 a*x>0이어야 합니다. 분모·지수 폭발도 확인합니다. 오차가 큰 데이터 한 점에서조차 모델이 정의되지 않으면 반복 계산이 실패할 수 있습니다.',
        ),
      ),
      section(
        'troubleshooting',
        '9. Troubleshooting',
        list(
          '초기 추정값은 그래프의 크기·포화값·반감 시간 같은 물리 정보로 정합니다. 0을 모든 계수의 만능 출발값으로 쓰지 마세요.',
          '수렴이 느리면 단위와 계수 스케일을 맞추고, 과도한 계수 수·상관·정의역 경계를 확인합니다.',
          '계수 범위 끝에서 멈추면 범위가 물리적으로 맞는지와 모델이 자료를 설명할 수 있는지 함께 검토합니다.',
          '가중치·상관 오차·강한 Outlier에 대한 특별 모델은 현재 기본 최소제곱에 자동 포함되지 않습니다. 자료의 오차 구조와 CI 가정을 확인하세요.',
        ),
      ),
    ],
  },
  {
    id: 'integration',
    title: 'Discrete Integration',
    summary:
      '측정점 사이를 어떤 곡선으로 연결할지 정하고, 그 곡선 아래의 부호 있는 면적을 계산합니다.',
    sections: [
      section(
        'purpose',
        '1. From a Rate to a Total',
        p(
          '유량이 일정하게 3 L/s로 4초 동안 흐르면 총량은 12 L입니다. 유량이 변하면 작은 시간 구간의 유량×시간을 모아야 합니다. 이것이 Integration입니다. 이 모듈은 알려진 함수의 기호 적분 대신 측정된 x,y 표를 적분합니다.',
        ),
        p(
          '자료 사이의 진짜 곡선은 측정만으로 알 수 없습니다. 먼저 Interpolation으로 연결 모양을 정하고, 그 선택한 곡선을 적분합니다. 결과를 해석할 때 보간 선택과 실제 측정 오차를 구별해야 합니다.',
        ),
        ...workflow('데이터·적분 범위·Interpolation Method'),
      ),
      section(
        'first-model',
        '2. First Integral · 삼각형 면적',
        code(guideExamples.integration),
        list(
          '시각 t와 유량 Q가 (0,0), (1,1), (2,2)입니다. lin은 점을 직선으로 잇습니다.',
          '적분은 ∫₀² Q(t) dt=2입니다. 밑변 2×높이 2÷2로 직접 확인할 수 있습니다.',
          't가 s, Q가 L/s라면 결과 2의 단위는 L입니다.',
          'Cumulative Integral은 시작부터 각 시각까지의 누적량입니다. t=1에서 0.5, t=2에서 2입니다. 원래 유량 그래프와 누적량 그래프는 Y 단위가 다릅니다.',
        ),
      ),
      section(
        'syntax',
        '3. integrate Command & Data Rules',
        ...dataSyntax(),
        code(
          'integrate Q(t) 0 2 100 lin',
          'integrate y(x) start end [sections] [method]',
        ),
        p(
          'start와 end는 데이터 x 범위 안에 있어야 하며 일부 범위만 적분할 수 있습니다. 끝을 작게 주면 역방향 적분으로 부호가 반대입니다. 정렬되지 않은 x는 안내 후 정렬하지만 같은 x가 중복되면 거부합니다. 표 범위 밖 값을 가정하는 Extrapolation은 지원하지 않습니다.',
        ),
        p(
          'sections는 그래프·누적 표를 나눌 표시 구간 수입니다. 원래 측정점 사이에 새 측정값을 만드는 옵션이 아닙니다. UI에서 Method를 선택하면 실제 계산에는 그 선택을 우선 적용하며 결과의 사용 Method를 확인할 수 있습니다.',
        ),
      ),
      section(
        'methods',
        '4. Interpolation Method',
        table(
          ['Method', 'How to choose'],
          [
            [
              'lin · Piecewise Linear',
              '이웃 측정점을 직선으로 연결합니다. 가장 직접적인 사다리꼴 해석이며 두 점 이상이 필요합니다. 자료가 성기거나 연결 모양의 근거가 부족할 때 좋은 비교 기준입니다.',
            ],
            [
              'ccs · Natural Cubic Spline',
              '점들을 부드러운 3차 다항식 조각으로 잇고 양 끝의 2차 도함수를 0으로 둡니다. 두 점 이상이 필요합니다. 매끈하지만 큰 간격·급변 영역에서 측정점 사이를 과도하게 굽힐 수 있습니다.',
            ],
            [
              'akm · Akima',
              '주변 구간의 기울기를 가중해 3차 조각을 만듭니다. 서로 다른 x가 최소 5개 필요합니다. 급격한 기울기 변화의 불필요한 진동을 줄이는 데 유용하지만 항상 실제 곡선을 맞힌다는 보장은 아닙니다.',
            ],
          ],
        ),
        p(
          '여기서는 각 보간 다항식 조각을 직접 적분합니다. sections를 100에서 1000으로 늘려도 같은 Method·데이터의 면적 계산이 정밀한 새 근사로 바뀌는 것이 아닙니다. 중요한 차이는 실제 데이터의 촘촘함과 보간 모델의 타당성입니다.',
        ),
      ),
      section(
        'plots',
        '5. Shaded Area & Signed Integral',
        p(
          '음영은 지정한 적분 범위 안에서 0선과 곡선 사이를 표시합니다. 0선 위의 면적은 더하고 아래 면적은 뺍니다. ∫y(x)dx는 Signed Integral이며 항상 양수인 기하학적 면적 ∫|y(x)|dx와 다릅니다.',
        ),
        code(
          '[\nx y\n0 -1\n1 0\n2 1\n]\nintegrate y(x) 0 2 100 lin',
          'Expected: signed integral=0, absolute geometric area=1',
        ),
        p(
          '왼쪽 음의 삼각형 −0.5와 오른쪽 양의 삼각형 +0.5가 상쇄됩니다. 적분 0은 곡선이 모두 0이거나 변화가 전혀 없다는 뜻이 아닙니다. 총 이동거리와 변위의 차이처럼 목적에 맞는 양을 구별하세요.',
        ),
        p(
          '원래 자료 전체를 표시하더라도 적분 범위 밖의 점은 이 적분 합에 포함되지 않습니다. Curve와 Cumulative를 전환할 때 X는 같아도 Y의 의미·단위는 달라집니다.',
        ),
      ),
      section(
        'report',
        '6. Report · 무엇이 정확한가요?',
        table(
          ['Item', 'Interpretation'],
          [
            [
              'Integral',
              '선택한 보간 곡선의 부호 있는 면적. 단위는 y단위×x단위입니다.',
            ],
            [
              'Bounds / Method',
              '어느 범위를 어떤 연결 모양으로 적분했는지. 결과 숫자를 비교할 때 반드시 같아야 하는 조건입니다.',
            ],
            [
              'Difference from Trapezoid',
              '직선 보간 결과와의 차이. 보간 선택에 얼마나 민감한지 보는 참고값입니다. 실제 정답과의 오차 상한이 아닙니다.',
            ],
            [
              'Data / Cumulative Table',
              '입력점과 누적값을 점검하고 CSV로 보관할 수 있습니다. 표시 점은 독립 관측을 추가한 값이 아닙니다.',
            ],
          ],
        ),
        p(
          '두 Method가 비슷해도 그 사이 진짜 곡선이 같다는 증명은 아닙니다. 급격한 변화가 중요하면 추가 측정이 필요합니다. 수치 적분 오차를 작게 계산했다고 측정 장비의 오차가 사라지지는 않습니다.',
        ),
      ),
      section(
        'units',
        '7. Units & Uncertainty',
        p(
          '시간을 min으로 입력하고 유량을 L/s로 쓰면 결과는 L·min/s처럼 단위가 섞입니다. 먼저 시간을 s로 바꾸거나 유량을 L/min으로 바꾸세요. 면적이 m²가 되는 것은 x,y가 모두 길이일 때이며 모든 적분의 단위가 면적인 것은 아닙니다.',
        ),
        p(
          '자료마다 측정 오차가 있다면 반복 실험·오차 모델을 별도로 검토해야 합니다. 현재 보고하는 적분은 주어진 숫자와 보간 선택의 결과이며 측정 오차를 포함한 95% CI를 자동으로 제공하지 않습니다.',
        ),
      ),
      section(
        'troubleshooting',
        '8. Troubleshooting',
        list(
          '범위를 벗어났다는 오류는 start/end와 데이터 x의 최소·최대부터 확인합니다.',
          '중복 x는 하나의 x에 서로 다른 y가 생겨 함수 보간을 정의하지 못하는 문제입니다. 반복 측정이면 과학적 근거로 집계한 후 입력하세요.',
          '곡선이 원래 점 사이에서 과하게 흔들리면 lin과 akm을 비교하고 부족한 영역에 실제 측정을 추가합니다.',
          '한 번의 큰 적분보다 구간별 누적값을 보면 어느 영역이 전체 결과에 가장 크게 기여하는지 알 수 있습니다.',
        ),
      ),
    ],
  },
  {
    id: 'optimization',
    title: 'Constrained Optimization',
    summary:
      '허용 조건을 지키면서 비용·면적·손실 같은 목적값을 줄이는 설계값을 찾습니다.',
    sections: [
      section(
        'purpose',
        '1. Objective, Variables & Constraints',
        p(
          'Equation Solver는 조건을 만족하는 값을 찾고 Optimization은 만족하는 값들 중 목적이 더 좋은 값을 찾습니다. Objective는 줄이려는 비용·손실, Decision Variable은 조절할 설계값, Constraint는 지켜야 하는 조건입니다.',
        ),
        p(
          '예산·용량·최소 농도처럼 현실에는 조건이 많습니다. 목적값이 작아도 예산을 넘으면 쓸 수 없는 해이므로 목적과 제약을 같이 봅니다. 이 모듈은 범위·등식·부등식 제약 아래 국소 최적점을 탐색합니다.',
        ),
        ...workflow('목적식·변수 Initial Guess·허용 조건'),
      ),
      section(
        'first-model',
        '2. First Design · 합이 고정된 두 변수',
        code(guideExamples.optimization),
        list(
          'min: 뒤가 목적식입니다. x+y=1은 반드시 지켜야 하는 합 조건입니다.',
          'x|0.2 0 2는 시작 추정 0.2, 하한 0, 상한 2입니다. y도 같은 방식입니다.',
          '예상 결과는 x≈0.5, y≈0.5, Objective≈0.5입니다. 합이 1이어야 하므로 둘 다 1인 목적값 0의 점은 허용되지 않습니다.',
          'Report에서 Constraint Violation이 작고 Converged인지 확인한 뒤 변수값을 사용합니다.',
        ),
      ),
      section(
        'syntax',
        '3. min, Bounds & Inequalities',
        code(
          'min: (x-2)^2+(y-3)^2\nx+y<=2\nx|0.2 0 1\ny|0.2 0 4',
          'Expected: x≈0.5, y≈1.5',
        ),
        p(
          '일반 등식 =, 부등식 <= 또는 >=를 사용합니다. <와 >도 수치 계산에서는 경계를 포함하는 조건으로 취급하므로 엄격한 열린 영역의 달성 여부를 별도로 주의해야 합니다. 허용 범위는 x|초기값 하한 상한 또는 x(0), x(min), x(max)로 지정할 수 있습니다.',
        ),
        p(
          '직접 최대화하는 명령 대신 원하는 이득의 음수를 min:에 넣으면 됩니다. 예를 들어 이득 G를 크게 하려면 −G를 줄입니다. 결과 Objective는 입력한 음수식의 값이므로 실제 이득의 부호를 되돌려 읽으세요.',
        ),
        ...expressionBasics(),
      ),
      section(
        'algorithm',
        '4. How a Constrained Search Works',
        p(
          '현재 지점에서 목적값을 줄이는 방향을 찾고, 허용 박스 경계에 맞게 이동을 투영합니다. 등식·부등식 위반에는 승수와 벌점을 조절하는 Augmented Lagrangian을 사용하고 BFGS로 국소 곡률 정보를 갱신합니다. 가능한 수식에서는 Automatic Differentiation으로 기울기를 계산합니다.',
        ),
        p(
          '초기값은 물리적 상태 자체가 아니라 반복 탐색의 출발점입니다. 비볼록 문제는 계곡이 여러 개일 수 있어 출발점에 따라 결과가 달라집니다. 여러 시작점에서 비교하되 같은 답을 여러 번 얻었다는 사실만으로 전역 최적 증명이라고 말할 수는 없습니다.',
        ),
        p(
          'Converged는 현재 스케일에서 국소 정상성과 제약 허용 오차를 만족했다는 뜻입니다. 모든 가능한 방향의 전역 최소를 인증하는 기능이 아닙니다. 반복·시간 한도에 도달하면 마지막 유효 후보와 Stopped 사유를 제공합니다.',
        ),
      ),
      section(
        'report',
        '5. Report · 세 가지를 같이 봅니다',
        table(
          ['Metric', 'Interpretation'],
          [
            [
              'Objective',
              '입력한 목적식의 최종값입니다. 작을수록 목적에 유리하지만 단위·식 자체가 달라진 두 문제의 숫자는 직접 비교할 수 없습니다.',
            ],
            [
              'Constraint Violation',
              '가장 크게 남은 등식 차이 또는 부등식 경계 밖의 크기입니다. 0.001이라면 실제 제약 단위에서 그만큼 벗어난 것입니다. 허용할 수 있는지는 물리 기준과 비교합니다.',
            ],
            [
              'Projected Gradient / Stationarity',
              '경계·제약을 고려했을 때 목적을 더 줄일 국소 방향이 얼마나 남았는지 보는 지표입니다. 작으면 근방에서 개선이 어려운 상태이지만 전역 최적·작은 측정 오차를 뜻하지 않습니다.',
            ],
            [
              'Status / Iterations',
              '수렴했는지 또는 왜 중단됐는지. 반복 수는 작업량이며 품질 점수나 정답 확률이 아닙니다.',
            ],
          ],
        ),
        p(
          '변수 x를 0~2로 제한하고 (x−5)^2를 줄이면 최선은 x=2입니다. 일반 기울기는 0이 아니어도 더 나아갈 수 있는 방향이 범위 밖이므로 경계 최적일 수 있습니다. 이 때문에 단순 Gradient와 Projected Gradient를 구별합니다.',
        ),
        note(
          'Feasible vs Optimal',
          'Feasible은 조건을 지켰다는 뜻, Optimal은 그 조건 안에서 목적이 더 개선되지 않는다는 뜻입니다. 둘 중 하나만으로 완성된 결과가 아닙니다.',
        ),
      ),
      section(
        'plots',
        '6. Objective History & Variable Trajectory',
        p(
          'Convergence History의 X축은 시간·변수값이 아니라 승인한 Iteration 번호입니다. Objective와 Constraint Violation은 서로 다른 의미·단위이므로 모드를 나눠 확인합니다. 변수 궤적은 탐색 과정이지 물체의 실제 운동이 아닙니다.',
        ),
        p(
          '제약을 맞추는 동안 목적값이 일시적으로 커질 수 있습니다. 제약 없는 낮은 목적값보다 제약을 지키는 약간 높은 값이 실제로 쓸 수 있는 답입니다. 마지막 유효값과 최종 상태를 함께 확인하세요.',
        ),
      ),
      section(
        'science',
        '7. Engineering Example · 최소 면적 용기',
        code(
          'volume=100\nmin: 2*pi*r^2+2*pi*r*h\npi*r^2*h=volume\nr|2 0.1 10\nh|5 0.1 30',
          '닫힌 원기둥: 고정 부피에서 표면적 최소화',
        ),
        p(
          '이 문제의 알려진 관계는 h=2r, r=(100/(2*pi))^(1/3)≈2.515398, h≈5.030796입니다. 실제 계산 결과와 이 관계를 비교해 독립 검증할 수 있습니다. 길이를 cm로 넣었다면 부피 100은 cm³, 목적 면적은 cm²입니다.',
        ),
        p(
          '1000배 다른 크기의 목적과 제약을 섞으면 검색이 어려울 수 있습니다. 대표 크기로 나눈 무차원 식을 쓰되, Report에 보이는 원래 제약 위반의 단위와 허용 의미를 유지하세요.',
        ),
      ),
      section(
        'functions',
        '8. Functions, Domain & Limits',
        ...functionReference(),
        p(
          '로그를 포함한 변수는 유효한 양수 하한과 Initial Guess를 지정하세요. abs·min 같은 비매끄러운 목적은 기울기 기반 탐색이 어려울 수 있습니다. 정수·조합 최적화나 전역 최적 인증은 포함하지 않습니다.',
        ),
      ),
      section(
        'troubleshooting',
        '9. Troubleshooting',
        list(
          '제약끼리 모순인지 확인합니다. x=2와 0≤x≤1은 동시에 만족할 수 없습니다.',
          '목적이 계속 감소하며 범위 끝으로 가면 유한한 최소가 없는지, 필요한 물리 범위를 빠뜨렸는지 봅니다.',
          'Stopped일 때 반복 수를 늘리기 전에 단위·스케일·정의역·초기값·제약 가능성을 확인합니다.',
          '전문적 설계 결정에는 다른 시작점·독립 해석해·외부 검증을 함께 사용합니다. 작은 Gradient 하나를 정확성 확률로 읽지 않습니다.',
        ),
      ),
    ],
  },
  {
    id: 'lsq',
    title: 'LSQ Optimization',
    summary:
      '데이터 적합과 계수의 물리적 제약을 동시에 적용하는 Least Squares 설계입니다.',
    sections: [
      section(
        'purpose',
        '1. Least Squares with Constraints',
        p(
          'LSQ는 Least Squares의 약자로, 측정값과 모델 예측 차이의 제곱합을 줄인다는 뜻입니다. 일반 Regression에 더해 a+b=3 같은 계수 관계나 부등식·범위를 함께 지키고 싶을 때 사용합니다.',
        ),
        p(
          '관측값 y는 데이터이고 a,b는 찾아야 할 계수입니다. 각 데이터 행의 y 자체를 바꾸어 오차를 줄이는 계산이 아닙니다. 목표는 측정점 모두를 정확히 통과시키는 것이 아니라, 제약 안에서 전체 차이를 작게 하는 것입니다.',
        ),
        ...workflow('데이터·fit 모델·계수 Initial Guess·제약'),
      ),
      section(
        'first-model',
        '2. First LSQ · 합이 고정된 보정 계수',
        code(guideExamples.lsq),
        list(
          '모델 y=a*x+b와 물리 조건 a+b=3을 함께 적습니다.',
          'a,b의 | 뒤 숫자는 Initial Guess / Min / Max입니다. 이 예제의 유효 결과는 a≈2, b≈1입니다.',
          'SSE≈0이고 각 예측값이 측정값과 일치합니다. 실제 데이터에서는 근소한 불일치가 자연스럽습니다.',
          '데이터를 y=2*x+1에서 조금 흔들면 합 조건을 지키면서 최선의 절충값을 찾습니다. 제약을 제거한 회귀와 계수가 달라도 오류라고 단정할 수 없습니다.',
        ),
      ),
      section(
        'syntax',
        '3. fit, Parameters & Constraints',
        ...dataSyntax(),
        p(
          'fit: 목표열=모델식으로 입력합니다. 추정할 계수마다 Initial Guess를 지정합니다. 계수끼리의 일반 등식·부등식을 추가할 수 있습니다. 표의 설명 열은 모델 계산에 쓰지만 제약은 계수·고정 상수에 대한 전역 조건입니다. 데이터 행마다 달라지는 개별 제약은 현재 지원하지 않습니다.',
        ),
        code(
          'fit: rate=vmax*S/(Km+S)\nvmax|0.8 0.01 3\nKm|0.4 0.001 5',
          'S,rate 표가 있을 때의 포화 반응 모델 예',
        ),
        p(
          '단순한 직선·다항식 적합만 필요하면 Linear / Polynomial Regression이 더 직접적입니다. 자유로운 비선형 적합에는 Nonlinear Regression을 사용할 수 있습니다. LSQ는 별도의 등식·부등식 조건을 결합해야 할 때 특히 유용합니다.',
        ),
      ),
      section(
        'algorithm',
        '4. Objective & Search Algorithm',
        p(
          '각 행 i에서 eᵢ=관측값−예측값을 계산하고 SSE=Σeᵢ²를 Objective로 사용합니다. 큰 차이가 제곱되어 더 크게 작용하므로 Outlier의 영향이 클 수 있습니다. 모든 행은 기본적으로 같은 가중치를 갖습니다.',
        ),
        p(
          '계수는 투영 BFGS와 Augmented Lagrangian으로 국소 탐색합니다. Box Bounds는 허용 범위에 직접 적용하고 등식·부등식 제약은 위반을 줄이는 승수·벌점을 함께 갱신합니다. 초기값·스케일에 영향을 받고 전역 최적을 인증하지 않습니다.',
        ),
        p(
          'Converged는 수치적 제약·정상성 조건을 만족한 상태입니다. 데이터가 충분한지·모델이 과학적으로 타당한지는 별도로 검토해야 합니다. Stopped 결과는 마지막 유효 후보이며 완성된 추정으로 표시하지 않습니다.',
        ),
      ),
      section(
        'report',
        '5. Report · Fit Quality & Feasibility',
        ...regressionMetrics(),
        table(
          ['Additional metric', 'Interpretation'],
          [
            [
              'Constraint Violation',
              '계수 사이 조건이 얼마나 남아 있는지. 좋은 RMSE와 별도로 작아야 합니다.',
            ],
            [
              'Projected Gradient / Stationarity',
              '허용 방향으로 더 줄일 국소 개선이 남았는지 봅니다. 제약된 계수의 일반 기울기가 0이 아니어도 정상일 수 있습니다.',
            ],
            [
              'Coefficient Bounds',
              '계수가 끝값에 닿았는지 확인합니다. 최적값이 범위 밖에 있을 수도 있고 실제 물리 경계일 수도 있습니다.',
            ],
          ],
        ),
        p(
          '기본 회귀의 자유로운 계수 SE·95% CI를 제약된 LSQ 결과에 그대로 붙일 수는 없습니다. 활성 제약은 계수의 가능한 변동 방향을 바꿉니다. 이 모듈에서 제공하지 않는 통계적 구간을 RMSE나 작은 Gradient로 대신 해석하지 마세요.',
        ),
      ),
      section(
        'plots',
        '6. Fit Plot vs Convergence History',
        p(
          'Fit Plot은 설명변수 또는 관측값에 대한 예측을 비교합니다. 점은 원래 관측이고 곡선·예측점은 현재 계수 모델입니다. Data Error는 각 관측에서 얼마나 높거나 낮게 예측했는지 보여줍니다.',
        ),
        p(
          'History의 X축은 Iteration입니다. SSE 감소가 정체했더라도 Constraint Violation이 줄고 있는지 확인합니다. Projected Gradient를 Log Scale로 보면 여러 자릿수의 변화가 보이지만 10^-8이라는 값 자체가 실제 측정 정확도 10^-8을 보장하지는 않습니다.',
        ),
      ),
      section(
        'units',
        '7. Units, Scaling & Data Interpretation',
        p(
          'y가 mg/L이면 RMSE는 mg/L, SSE는 (mg/L)²입니다. SSE는 자료 수에도 의존하므로 다른 개수의 자료에서 숫자만 비교하지 마세요. 계수 제약도 같은 단위의 양끼리 세웠는지 확인합니다. 기울기 a와 절편 b의 단위가 다르면 a+b=3은 일반적으로 물리적 관계가 아닙니다. 교과서 예제에서는 무차원 수로 사용했습니다.',
        ),
        p(
          '자료가 알려주는 것보다 계수가 많으면 여러 조합이 비슷한 예측을 만들 수 있습니다. 범위를 좁혔다고 실제 정보가 생기는 것은 아니며 가정이 추가된 것입니다. 결과를 전달할 때 모델식·데이터 범위·물리 제약·수렴 상태를 함께 남기세요.',
        ),
      ),
      section(
        'functions',
        '8. Functions & Troubleshooting',
        ...functionReference(),
        list(
          'Model 우변에 관측 목표열을 다시 넣지 않습니다. 간접 Helper를 통한 Data Leakage도 허용하지 않습니다.',
          '제약이 불가능하면 SSE가 줄어도 유효한 해가 아닙니다. 변수 범위와 제약을 직접 대입해 확인하세요.',
          '비선형 모델에서는 여러 Initial Guess를 비교하고, 모든 관측 행에서 분모·로그·제곱근이 유효한지 봅니다.',
          '허용할 수 있는 오차는 실험 단위와 활용 목적에 따라 정합니다. 작은 RMSE만으로 물리적 모델을 증명하지 않습니다.',
        ),
      ),
    ],
  },
]

export function getModuleGuide(topic: GuideTopic): ModuleGuideContent {
  return moduleGuides.find((guide) => guide.id === topic)!
}

export function sectionSearchText(section: GuideSection): string {
  return [
    section.title,
    ...section.blocks.flatMap((block) => {
      if (block.kind === 'table')
        return [...block.headers, ...block.rows.flat()]
      if (block.kind === 'list') return block.items
      if (block.kind === 'note') return [block.title, block.text]
      return [block.text]
    }),
  ]
    .join(' ')
    .toLocaleLowerCase()
}

export function renderTextbookMarkdown(): string {
  const chapters = moduleGuides
    .map((guide) => {
      const sections = guide.sections
        .map((item) => {
          const blocks = item.blocks
            .map((block) => {
              if (block.kind === 'paragraph') return block.text
              if (block.kind === 'code')
                return `${block.caption ? `${block.caption}\n\n` : ''}\`\`\`text\n${block.text}\n\`\`\``
              if (block.kind === 'list')
                return block.items.map((text) => `- ${text}`).join('\n')
              if (block.kind === 'note')
                return `> **${block.title}**\n>\n> ${block.text}`
              const escape = (cell: string) => cell.replaceAll('|', '\\|')
              return [
                `| ${block.headers.map(escape).join(' | ')} |`,
                `| ${block.headers.map(() => '---').join(' | ')} |`,
                ...block.rows.map(
                  (row) => `| ${row.map(escape).join(' | ')} |`,
                ),
              ].join('\n')
            })
            .join('\n\n')
          return `### ${item.title}\n\n${blocks}`
        })
        .join('\n\n')
      return `## ${guide.title}\n\n${guide.summary}\n\n${sections}`
    })
    .join('\n\n')
  return `# Interaction Visual Calculator · User Textbook\n\n사이트의 Guide와 같은 모듈별 학습 자료입니다. 전문 용어는 영어로, 설명은 한국어로 제공합니다. 원하는 모듈의 장부터 읽으세요.\n\n이 문서는 src/components/guide-content.ts의 renderTextbookMarkdown()으로 생성한 읽기용 사본입니다. 내용을 바꾸면 원본과 이 사본을 함께 갱신합니다.\n\n${chapters}\n`
}
```

<a id="source-21"></a>

## src/components/SolutionChart.tsx

원본: [src/components/SolutionChart.tsx](../../src/components/SolutionChart.tsx) · 1,157줄 · SHA-256: `fdfa6012201651c78a80150dd2e10ab2119810a1e35f67bb70ac1db50369299c`

```tsx
import { tangencyOrderLabel } from '../engine/tangency'
import {
  branchEventLabel,
  branchEventText,
  uniqueBranchEvents,
} from '../engine/branch-events'
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import './SolutionChart.css'
import { fittedDomain, fraction, interpolate } from './chart-domain'
import {
  initialWindow,
  nearestPointIndex,
  pointOnCurve,
  wheelFactor,
  zoomWindow,
  type CurvePoint,
  type ZoomAxis,
} from './chart-interaction'
import type { BranchTerminalEvent } from '../engine'

export type MultiBranchSeries = {
  id: string
  label: string
  color: string
  points: CurvePoint[]
  samplePoints?: CurvePoint[]
  currentValues?: number[]
  events?: BranchTerminalEvent[]
}

export interface SolutionChartProps {
  modelKind?: 'linear' | 'nonlinear'
  expanded?: boolean
  large?: boolean
  points: CurvePoint[]
  selectionPoints?: CurvePoint[]
  variables: string[]
  parameterName: string
  currentParameter: number
  currentValues?: number[]
  selectedIndex: number | null
  onSelectIndex: (index: number | null) => void
  visibleVariables: string[]
  onToggleVariable: (name: string) => void
  onParameterChange?: (value: number) => void
  /** Terminal / bifurcation events (merge or disappearance) for single-branch view */
  events?: BranchTerminalEvent[]
  /** Optional multi-branch series for Merged Simulation Sets (병합 세트) */
  multiBranchSeries?: MultiBranchSeries[]
  /** When multiBranchSeries is provided, which variable index is plotted (default 0) */
  activeVariableIndex?: number
}

export const SERIES_COLORS = [
  '#087f74',
  '#df9963',
  '#4c6ef5',
  '#be4bdb',
  '#e67700',
  '#2b8a3e',
]

const MAX_WIDTH = 680
const EXPANDED_MAX_WIDTH = 1200
const MIN_WIDTH = 320
const HEIGHT = 290
const PLOT = { left: 51, right: 20, top: 24, bottom: 37 }

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '—'
  if (value === 0) return '0'
  const absolute = Math.abs(value)
  if (absolute >= 1e6 || absolute < 0.0001) return value.toExponential(2)
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(
    value,
  )
}

function axisNumber(value: number): string {
  if (value === 0) return '0'
  if (Math.abs(value) >= 1e5 || Math.abs(value) < 0.001)
    return value.toExponential(1)
  return Number(value.toPrecision(4)).toString()
}

export default function SolutionChart({
  modelKind = 'linear',
  expanded = false,
  large = false,
  points,
  selectionPoints,
  variables,
  parameterName,
  currentParameter,
  currentValues,
  selectedIndex,
  onSelectIndex,
  visibleVariables,
  onToggleVariable,
  onParameterChange,
  events = [],
  multiBranchSeries,
  activeVariableIndex = 0,
}: SolutionChartProps) {
  const titleId = useId()
  const descriptionId = useId()
  const clipId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [width, setWidth] = useState(MAX_WIDTH)
  const [hover, setHover] = useState<CurvePoint | null>(null)
  const [hoverParameter, setHoverParameter] = useState<number | null>(null)
  const [zoomAxis, setZoomAxis] = useState<ZoomAxis>('both')
  const [window, setWindow] = useState(initialWindow)
  const [zoomActive, setZoomActive] = useState(false)
  const [showSampleDots, setShowSampleDots] = useState(true)
  const frame = useRef<number | null>(null)
  const pointerParameter = useRef<number | null>(null)
  const selectionRef = useRef(selectedIndex)
  const selectionCallback = useRef(onSelectIndex)
  selectionRef.current = selectedIndex
  selectionCallback.current = onSelectIndex

  const isMultiBranch = Boolean(
    multiBranchSeries && multiBranchSeries.length > 0,
  )
  const height = large
    ? Math.max(
        420,
        Math.min(880, (globalThis.innerHeight || 900) - (expanded ? 240 : 360)),
      )
    : expanded
      ? Math.min(520, Math.max(420, width * 0.48))
      : HEIGHT
  const innerWidth = width - PLOT.left - PLOT.right
  const innerHeight = height - PLOT.top - PLOT.bottom

  const interactivePoints = selectionPoints?.length ? selectionPoints : points
  const curvePoints = useMemo(
    () =>
      points
        .filter((point) => Number.isFinite(point.parameter))
        .sort((a, b) => a.parameter - b.parameter),
    [points],
  )
  const samplePoints = useMemo(
    () =>
      (selectionPoints ?? []).filter(
        (point) =>
          Number.isFinite(point.parameter) &&
          point.values &&
          point.values.some(Number.isFinite),
      ),
    [selectionPoints],
  )
  const coordinates = useMemo(
    () =>
      interactivePoints
        .map((point, index) => ({ parameter: point.parameter, index }))
        .filter((point) => Number.isFinite(point.parameter))
        .sort((a, b) => a.parameter - b.parameter),
    [interactivePoints],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const updateWidth = (measuredWidth: number) => {
      if (Number.isFinite(measuredWidth) && measuredWidth > 0) {
        setWidth(
          Math.min(
            large ? 2400 : expanded ? EXPANDED_MAX_WIDTH : MAX_WIDTH,
            Math.max(MIN_WIDTH, Math.round(measuredWidth)),
          ),
        )
      }
    }
    updateWidth(container.getBoundingClientRect().width)
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) updateWidth(entries[0].contentRect.width)
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [expanded, large])

  const visible = variables
    .map((name, index) => ({ name, index }))
    .filter(({ name }) => visibleVariables.includes(name))

  const baseChart = useMemo(() => {
    if (isMultiBranch && multiBranchSeries) {
      const allParams: number[] = []
      const values: number[] = []
      multiBranchSeries.forEach((branch) => {
        if (!visibleVariables.includes(branch.id)) return
        branch.points.forEach((pt) => {
          if (Number.isFinite(pt.parameter)) allParams.push(pt.parameter)
          const v = pt.values?.[activeVariableIndex]
          if (typeof v === 'number' && Number.isFinite(v)) values.push(v)
        })
      })
      if (!allParams.length) return null
      let minX = Math.min(...allParams)
      let maxX = Math.max(...allParams)
      if (minX === maxX) {
        const padding = Math.abs(minX) * 0.1 || 0.5
        minX -= padding
        maxX += padding
      }
      const [minY, maxY, yTicks] = fittedDomain(values)
      return { minX, maxX, minY, maxY, yTicks, hasData: values.length > 0 }
    }

    if (!curvePoints.length) return null
    let minX = curvePoints[0].parameter
    let maxX = curvePoints.at(-1)!.parameter
    if (minX === maxX) {
      const padding = Math.abs(minX) * 0.1 || 0.5
      if (Number.isFinite(minX - padding)) minX -= padding
      if (Number.isFinite(maxX + padding)) maxX += padding
    }
    const values: number[] = []
    curvePoints.forEach((point) => {
      variables.forEach((name, index) => {
        const value = point.values?.[index]
        if (
          visibleVariables.includes(name) &&
          typeof value === 'number' &&
          Number.isFinite(value)
        )
          values.push(value)
      })
    })
    const [minY, maxY, yTicks] = fittedDomain(values)
    return { minX, maxX, minY, maxY, yTicks, hasData: values.length > 0 }
  }, [
    isMultiBranch,
    multiBranchSeries,
    activeVariableIndex,
    curvePoints,
    variables,
    visibleVariables,
  ])

  const chart = useMemo(() => {
    if (!baseChart) return null
    const minX = interpolate(baseChart.minX, baseChart.maxX, window.x[0])
    const maxX = interpolate(baseChart.minX, baseChart.maxX, window.x[1])
    const minY = interpolate(baseChart.minY, baseChart.maxY, window.y[0])
    const maxY = interpolate(baseChart.minY, baseChart.maxY, window.y[1])
    if (
      ![minX, maxX, minY, maxY].every(Number.isFinite) ||
      minX >= maxX ||
      minY >= maxY
    )
      return baseChart
    return {
      ...baseChart,
      minX,
      maxX,
      minY,
      maxY,
      yTicks:
        window.y[0] === 0 && window.y[1] === 1
          ? baseChart.yTicks
          : Array.from({ length: 5 }, (_, i) => interpolate(minY, maxY, i / 4)),
    }
  }, [baseChart, window])

  const modelDomainKey = `${parameterName}|${variables.join('|')}|${baseChart?.minX}|${baseChart?.maxX}`
  useEffect(() => {
    setWindow(initialWindow())
    setHover(null)
    setHoverParameter(null)
  }, [modelDomainKey])
  useEffect(() => {
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    }
  }, [])

  const activeIndex =
    selectedIndex !== null &&
    selectedIndex >= 0 &&
    selectedIndex < interactivePoints.length
      ? selectedIndex
      : nearestPointIndex(coordinates, currentParameter)
  const activePoint =
    hover ??
    (selectedIndex !== null ? interactivePoints[activeIndex] : undefined)
  const activeParam = hoverParameter ?? activePoint?.parameter ?? null
  const hasSelection =
    hover !== null || hoverParameter !== null || selectedIndex !== null
  const x = (value: number) =>
    PLOT.left + fraction(value, chart!.minX, chart!.maxX) * innerWidth
  const y = (value: number) =>
    PLOT.top +
    innerHeight -
    fraction(value, chart!.minY, chart!.maxY) * innerHeight
  const currentInDomain =
    chart &&
    Number.isFinite(currentParameter) &&
    currentParameter >= chart.minX &&
    currentParameter <= chart.maxX
  const selectedInDomain =
    chart &&
    activeParam !== null &&
    Number.isFinite(activeParam) &&
    activeParam >= chart.minX &&
    activeParam <= chart.maxX

  function localPointer(svg: SVGSVGElement, clientX: number, clientY: number) {
    const matrix = svg.getScreenCTM()
    if (matrix) {
      const point = svg.createSVGPoint()
      point.x = clientX
      point.y = clientY
      return point.matrixTransform(matrix.inverse())
    }
    const rect = svg.getBoundingClientRect()
    if (!rect.width || !rect.height) return null
    return {
      x: ((clientX - rect.left) / rect.width) * width,
      y: ((clientY - rect.top) / rect.height) * height,
    }
  }
  function pointerValue(svg: SVGSVGElement, clientX: number, clientY: number) {
    if (!chart) return null
    const local = localPointer(svg, clientX, clientY)
    if (
      !local ||
      local.x < PLOT.left ||
      local.x > width - PLOT.right ||
      local.y < PLOT.top ||
      local.y > height - PLOT.bottom
    )
      return null
    const xRatio = (local.x - PLOT.left) / innerWidth
    const yRatio = 1 - (local.y - PLOT.top) / innerHeight
    return {
      parameter: interpolate(chart.minX, chart.maxX, xRatio),
      xRatio,
      yRatio,
    }
  }
  function selectNearest(parameter: number) {
    const index = nearestPointIndex(coordinates, parameter)
    if (index >= 0 && selectionRef.current !== index) {
      selectionRef.current = index
      selectionCallback.current(index)
    }
  }
  function clearHover() {
    pointerParameter.current = null
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
    setHover(null)
    setHoverParameter(null)
    if (selectionRef.current !== null) {
      selectionRef.current = null
      selectionCallback.current(null)
    }
  }
  function handlePointer(event: PointerEvent<SVGSVGElement>) {
    const point = pointerValue(
      event.currentTarget,
      event.clientX,
      event.clientY,
    )
    if (!point) {
      clearHover()
      return
    }
    pointerParameter.current = point.parameter
    if (frame.current !== null) return
    frame.current = requestAnimationFrame(() => {
      frame.current = null
      const parameter = pointerParameter.current
      if (parameter === null) return
      setHoverParameter(parameter)
      if (!isMultiBranch) {
        setHover(
          pointOnCurve(curvePoints, parameter) ?? {
            parameter,
            values: null,
            error: '표시된 탐색 범위 밖입니다.',
          },
        )
      }
      selectNearest(parameter)
    })
  }
  function handleClick(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.focus({ preventScroll: true })
    const point = pointerValue(
      event.currentTarget,
      event.clientX,
      event.clientY,
    )
    if (!point || !baseChart) return
    const parameter = Math.min(
      baseChart.maxX,
      Math.max(baseChart.minX, point.parameter),
    )
    setHoverParameter(parameter)
    if (!isMultiBranch) {
      setHover(pointOnCurve(curvePoints, parameter))
    }
    selectNearest(parameter)
    onParameterChange?.(parameter)
  }

  const wheelHandler = useRef<(event: WheelEvent) => void>(() => {})
  wheelHandler.current = (event) => {
    const svg = svgRef.current
    // Native focus is immediate; React's focus indicator may still be queued
    // when a wheel event arrives directly after a click or axis selection.
    if (!svg || document.activeElement !== svg) return
    const point = pointerValue(svg, event.clientX, event.clientY)
    if (!point) return
    event.preventDefault()
    setWindow((previous) =>
      zoomWindow(
        previous,
        zoomAxis,
        point.xRatio,
        point.yRatio,
        wheelFactor(event.deltaY, event.deltaMode),
      ),
    )
    clearHover()
  }
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const handler = (event: WheelEvent) => wheelHandler.current(event)
    svg.addEventListener('wheel', handler, { passive: false })
    return () => svg.removeEventListener('wheel', handler)
  }, [])

  function handleKey(event: KeyboardEvent<SVGSVGElement>) {
    if (!interactivePoints.length) return
    const current = activeIndex < 0 ? 0 : activeIndex
    let index = current
    if (event.key === 'ArrowLeft') index = Math.max(0, current - 1)
    else if (event.key === 'ArrowRight')
      index = Math.min(interactivePoints.length - 1, current + 1)
    else if (event.key === 'Home') index = 0
    else if (event.key === 'End') index = interactivePoints.length - 1
    else if (event.key === 'Enter' || event.key === ' ') {
      if (activeParam !== null) onParameterChange?.(activeParam)
      event.preventDefault()
      return
    } else if (event.key === '+' || event.key === '=' || event.key === '-') {
      event.preventDefault()
      setWindow((previous) =>
        zoomWindow(
          previous,
          zoomAxis,
          0.5,
          0.5,
          event.key === '-' ? 1.2 : 1 / 1.2,
        ),
      )
      return
    } else if (event.key === '0') {
      event.preventDefault()
      setWindow(initialWindow())
      return
    } else if (event.key === 'Escape') {
      clearHover()
      return
    } else return
    event.preventDefault()
    setHover(null)
    setHoverParameter(null)
    onSelectIndex(index)
  }

  const curvePaths = useMemo(() => {
    if (!chart) return []
    if (isMultiBranch && multiBranchSeries) {
      return multiBranchSeries.map((branch) => {
        let path = ''
        let connected = false
        const sortedPts = [...branch.points]
          .filter((p) => Number.isFinite(p.parameter))
          .sort((a, b) => a.parameter - b.parameter)
        sortedPts.forEach((point) => {
          const value = point.values?.[activeVariableIndex]
          if (typeof value !== 'number' || !Number.isFinite(value)) {
            connected = false
            return
          }
          const px =
            PLOT.left +
            fraction(point.parameter, chart.minX, chart.maxX) * innerWidth
          const py =
            PLOT.top +
            innerHeight -
            fraction(value, chart.minY, chart.maxY) * innerHeight
          path += `${connected ? 'L' : 'M'}${px.toFixed(3)},${py.toFixed(3)} `
          connected = true
        })
        return path
      })
    }
    return variables.map((_, variableIndex) => {
      let path = ''
      let connected = false
      curvePoints.forEach((point) => {
        const value = point.values?.[variableIndex]
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          connected = false
          return
        }
        const px =
          PLOT.left +
          fraction(point.parameter, chart.minX, chart.maxX) * innerWidth
        const py =
          PLOT.top +
          innerHeight -
          fraction(value, chart.minY, chart.maxY) * innerHeight
        path += `${connected ? 'L' : 'M'}${px.toFixed(3)},${py.toFixed(3)} `
        connected = true
      })
      return path
    })
  }, [
    isMultiBranch,
    multiBranchSeries,
    activeVariableIndex,
    curvePoints,
    variables,
    chart,
    innerWidth,
    innerHeight,
  ])

  const allBifurcationEvents = useMemo(() => {
    if (isMultiBranch && multiBranchSeries) {
      const list: BranchTerminalEvent[] = []
      multiBranchSeries.forEach((branch) => {
        if (!visibleVariables.includes(branch.id)) return
        for (const ev of branch.events ?? []) {
          list.push(ev)
        }
      })
      return uniqueBranchEvents(list)
    }
    return uniqueBranchEvents(events)
  }, [
    isMultiBranch,
    multiBranchSeries,
    visibleVariables,
    activeVariableIndex,
    events,
  ])

  const emptyMessage =
    !points.length && !isMultiBranch
      ? '모델을 계산하면 파라미터에 따른 해의 변화를 볼 수 있어요.'
      : !visibleVariables.length
        ? '위의 범례 버튼을 눌러 그래프에 표시할 곡선을 선택해 보세요.'
        : modelKind === 'nonlinear'
          ? '이 범위에는 선택한 해의 유효한 계산 결과가 없어요. 파라미터 범위를 조절해 보세요.'
          : '이 범위에는 유일한 해가 없어요. 파라미터 범위를 조절해 보세요.'

  return (
    <div
      className={`solution-chart${expanded ? ' is-expanded' : ''}`}
      ref={containerRef}
    >
      <div className="sc-legend-row">
        <div className="sc-legend" aria-label="그래프에 표시할 항목">
          {isMultiBranch && multiBranchSeries
            ? multiBranchSeries.map((branch) => (
                <button
                  key={branch.id}
                  type="button"
                  className={`sc-legend-button ${visibleVariables.includes(branch.id) ? 'is-visible' : ''}`}
                  aria-pressed={visibleVariables.includes(branch.id)}
                  aria-label={`${branch.label} 곡선 표시`}
                  onClick={() => onToggleVariable(branch.id)}
                >
                  <span
                    className="sc-legend-dot"
                    style={{ background: branch.color }}
                  />
                  <span>{branch.label}</span>
                </button>
              ))
            : variables.map((name, index) => (
                <button
                  key={name}
                  type="button"
                  className={`sc-legend-button ${visibleVariables.includes(name) ? 'is-visible' : ''}`}
                  aria-pressed={visibleVariables.includes(name)}
                  aria-label={`${name} 곡선 표시`}
                  onClick={() => onToggleVariable(name)}
                >
                  <span
                    className="sc-legend-dot"
                    style={{
                      background: SERIES_COLORS[index % SERIES_COLORS.length],
                    }}
                  />
                  <span>{name}</span>
                </button>
              ))}
        </div>
      </div>

      <div className="sc-view-controls">
        <details className="chart-help">
          <summary>그래프 사용법</summary>
          <p>
            마우스 이동으로 값을 살펴보고, 클릭하면 그 위치의 파라미터를 실제
            계산에 적용합니다. 클릭 후 휠로 선택한 축을 확대·축소합니다. 빈 원은
            표·CSV의 샘플 포인트이며 그래프 선도 같은 계산점을 통과합니다. 선
            사이의 위치는 보간 표시이고 클릭 후 현재점은 솔버로 다시 계산합니다.
          </p>
        </details>
        <label className="sc-sample-toggle">
          <input
            type="checkbox"
            checked={showSampleDots}
            onChange={(e) => setShowSampleDots(e.target.checked)}
          />
          샘플 포인트 표시
        </label>
        <label>
          확대 축
          <select
            aria-label="그래프 확대 축"
            value={zoomAxis}
            onChange={(event) => setZoomAxis(event.target.value as ZoomAxis)}
          >
            <option value="both">양축</option>
            <option value="x">X축</option>
            <option value="y">Y축</option>
          </select>
        </label>
        <button
          type="button"
          className="sc-reset-view"
          onClick={() => {
            setWindow(initialWindow())
            clearHover()
          }}
          aria-label="그래프 축 초기화"
        >
          축 초기화
        </button>
      </div>

      <div className="sc-stage">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          tabIndex={0}
          aria-labelledby={`${titleId} ${descriptionId}`}
          onPointerMove={handlePointer}
          onPointerDown={handleClick}
          onPointerLeave={clearHover}
          onFocus={() => setZoomActive(true)}
          onBlur={() => {
            setZoomActive(false)
            clearHover()
          }}
          onKeyDown={handleKey}
        >
          <title id={titleId}>
            {`${parameterName}에 따른 ${modelKind === 'nonlinear' ? '비선형' : '선형'} 방정식 해의 변화`}
          </title>
          <desc id={descriptionId}>
            파라미터는 연속적으로 움직이며 설정한 샘플 포인트 간격마다 그래프
            위에 샘플 마커가 표시됩니다. 해가 병합되거나 소멸하는 분기점은 경계
            마커로 표시됩니다.
          </desc>
          <defs>
            <clipPath id={clipId}>
              <rect
                x={PLOT.left}
                y={PLOT.top}
                width={innerWidth}
                height={innerHeight}
              />
            </clipPath>
          </defs>

          {chart && (
            <>
              <text x={PLOT.left} y="12" className="sc-axis-caption">
                {isMultiBranch
                  ? `${variables[activeVariableIndex] ?? '해'}의 값`
                  : '해의 값'}
              </text>
              {chart.yTicks.map((tick, index) => (
                <g key={index}>
                  <line
                    x1={PLOT.left}
                    x2={width - PLOT.right}
                    y1={y(tick)}
                    y2={y(tick)}
                    className={
                      tick === 0 ? 'sc-grid-line sc-zero-line' : 'sc-grid-line'
                    }
                  />
                  <text
                    x={PLOT.left - 13}
                    y={y(tick) + 4}
                    textAnchor="end"
                    className="sc-axis-label"
                  >
                    {axisNumber(tick)}
                  </text>
                </g>
              ))}
              {Array.from({ length: 5 }, (_, index) => {
                const tick = interpolate(chart.minX, chart.maxX, index / 4)
                return (
                  <g key={index}>
                    <line
                      x1={x(tick)}
                      x2={x(tick)}
                      y1={PLOT.top}
                      y2={height - PLOT.bottom}
                      className="sc-grid-line sc-grid-vertical"
                    />
                    <text
                      x={x(tick)}
                      y={height - PLOT.bottom + 22}
                      textAnchor="middle"
                      className="sc-axis-label"
                    >
                      {axisNumber(tick)}
                    </text>
                  </g>
                )
              })}

              {/* 1. Render Continuous Curves */}
              {chart.hasData &&
                (isMultiBranch && multiBranchSeries
                  ? multiBranchSeries.map((branch, idx) =>
                      visibleVariables.includes(branch.id) ? (
                        <path
                          key={branch.id}
                          d={curvePaths[idx]}
                          stroke={branch.color}
                          className="sc-curve"
                          clipPath={`url(#${clipId})`}
                        />
                      ) : null,
                    )
                  : visible.map(({ name, index }) => (
                      <path
                        key={name}
                        d={curvePaths[index]}
                        stroke={SERIES_COLORS[index % SERIES_COLORS.length]}
                        className="sc-curve"
                        clipPath={`url(#${clipId})`}
                      />
                    )))}

              {/* 2. Render Sample Point Interval Markers on Curves */}
              {chart.hasData && showSampleDots && (
                <g clipPath={`url(#${clipId})`} className="sc-sample-dots">
                  {isMultiBranch && multiBranchSeries
                    ? multiBranchSeries.map((branch) =>
                        visibleVariables.includes(branch.id)
                          ? (branch.samplePoints ?? []).map((pt, sIdx) => {
                              const val = pt.values?.[activeVariableIndex]
                              if (
                                typeof val !== 'number' ||
                                !Number.isFinite(val)
                              )
                                return null
                              return (
                                <circle
                                  key={`${branch.id}-sample-${sIdx}`}
                                  cx={x(pt.parameter)}
                                  cy={y(val)}
                                  r="2.4"
                                  fill="#fff"
                                  stroke={branch.color}
                                  strokeWidth="1.5"
                                />
                              )
                            })
                          : null,
                      )
                    : samplePoints.map((pt, sIdx) =>
                        visible.map(({ name, index }) => {
                          const val = pt.values?.[index]
                          if (typeof val !== 'number' || !Number.isFinite(val))
                            return null
                          return (
                            <circle
                              key={`${name}-sample-${sIdx}`}
                              cx={x(pt.parameter)}
                              cy={y(val)}
                              r="2.4"
                              fill="#fff"
                              stroke={
                                SERIES_COLORS[index % SERIES_COLORS.length]
                              }
                              strokeWidth="1.5"
                            />
                          )
                        }),
                      )}
                </g>
              )}

              {/* 3. Render Bifurcation / Merge / Disappearance Markers */}
              {chart.hasData && allBifurcationEvents.length > 0 && (
                <g
                  clipPath={`url(#${clipId})`}
                  className="sc-bifurcation-markers"
                >
                  {allBifurcationEvents.map((ev, eIdx) => {
                    const val = isMultiBranch
                      ? (ev.tangency?.verified
                          ? ev.tangency.valuesStar
                          : ev.values)[activeVariableIndex]
                      : (ev.tangency?.verified
                          ? ev.tangency.valuesStar
                          : ev.values)[visible[0]?.index ?? 0]
                    if (typeof val !== 'number' || !Number.isFinite(val))
                      return null
                    const cx = x(
                      ev.tangency?.verified
                        ? ev.tangency.parameterStar
                        : ev.parameter,
                    )
                    const cy = y(val)
                    const isMerge = ev.kind === 'merge'
                    const order = ev.tangency?.verified
                      ? ev.tangency.bifurcationOrder
                      : undefined
                    const shape =
                      order === 'boundary'
                        ? 'boundary'
                        : typeof order === 'number'
                          ? order % 2
                            ? 'passage'
                            : 'contact'
                          : 'candidate'
                    const color = shape === 'passage' ? '#7662a5' : '#b56827'
                    return (
                      <g
                        key={`event-${eIdx}`}
                        className="sc-critical-point"
                        data-order={order ?? 'candidate'}
                      >
                        <line
                          x1={cx}
                          x2={cx}
                          y1={PLOT.top}
                          y2={height - PLOT.bottom}
                          stroke={isMerge ? '#d9480f' : '#e67700'}
                          strokeDasharray="2 3"
                          strokeWidth="1"
                          opacity="0.65"
                        />
                        {shape === 'boundary' ? (
                          <rect
                            x={cx - 5}
                            y={cy - 5}
                            width="10"
                            height="10"
                            fill="white"
                            stroke={color}
                            strokeWidth="2"
                          />
                        ) : (
                          <path
                            d={
                              shape === 'passage'
                                ? `M ${cx - 6} ${cy} l 3 -5 h 6 l 3 5 l -3 5 h -6 Z`
                                : shape === 'contact'
                                  ? `M ${cx} ${cy - 7} l 7 7 l -7 7 l -7 -7 Z`
                                  : `M ${cx} ${cy - 6} l 6 11 h -12 Z`
                            }
                            fill="white"
                            stroke={color}
                            strokeWidth="2"
                          />
                        )}
                        <title>
                          {branchEventText(ev, parameterName)}
                          {ev.tangency?.verified
                            ? ` · ${tangencyOrderLabel(ev.tangency)}`
                            : ''}
                        </title>
                      </g>
                    )
                  })}
                </g>
              )}

              {/* 4. Render Current Continuous Parameter Line & Dots */}
              {chart.hasData && currentInDomain && (
                <g clipPath={`url(#${clipId})`}>
                  <line
                    x1={x(currentParameter)}
                    x2={x(currentParameter)}
                    y1={PLOT.top}
                    y2={height - PLOT.bottom}
                    className="sc-current-line"
                  />
                  {!hasSelection &&
                    (isMultiBranch && multiBranchSeries
                      ? multiBranchSeries.map((branch) => {
                          if (!visibleVariables.includes(branch.id)) return null
                          const value =
                            branch.currentValues?.[activeVariableIndex]
                          if (
                            typeof value !== 'number' ||
                            !Number.isFinite(value)
                          )
                            return null
                          return (
                            <circle
                              key={branch.id}
                              cx={x(currentParameter)}
                              cy={y(value)}
                              r="4.5"
                              fill={branch.color}
                              className="sc-active-dot sc-current-dot"
                            />
                          )
                        })
                      : currentValues &&
                        visible.map(({ name, index }) => {
                          const value = currentValues[index]
                          if (!Number.isFinite(value)) return null
                          return (
                            <circle
                              key={name}
                              cx={x(currentParameter)}
                              cy={y(value)}
                              r="4.5"
                              fill={SERIES_COLORS[index % SERIES_COLORS.length]}
                              className="sc-active-dot sc-current-dot"
                            />
                          )
                        }))}
                  <circle
                    cx={x(currentParameter)}
                    cy={height - PLOT.bottom}
                    r="3"
                    fill="#6c827d"
                  />
                </g>
              )}

              {/* 5. Render Hover / Selected Crosshair & Dots */}
              {chart.hasData &&
                hasSelection &&
                selectedInDomain &&
                activeParam !== null && (
                  <g clipPath={`url(#${clipId})`}>
                    <line
                      x1={x(activeParam)}
                      x2={x(activeParam)}
                      y1={PLOT.top}
                      y2={height - PLOT.bottom}
                      className="sc-crosshair"
                    />
                    {isMultiBranch && multiBranchSeries
                      ? multiBranchSeries.map((branch) => {
                          if (!visibleVariables.includes(branch.id)) return null
                          const pt = pointOnCurve(branch.points, activeParam)
                          const val = pt?.values?.[activeVariableIndex]
                          if (typeof val !== 'number' || !Number.isFinite(val))
                            return null
                          return (
                            <circle
                              key={branch.id}
                              cx={x(activeParam)}
                              cy={y(val)}
                              r="4.5"
                              fill={branch.color}
                              className="sc-active-dot"
                            />
                          )
                        })
                      : activePoint &&
                        visible.map(({ name, index }) => {
                          const value = activePoint.values?.[index]
                          if (
                            typeof value !== 'number' ||
                            !Number.isFinite(value)
                          )
                            return null
                          return (
                            <circle
                              key={name}
                              cx={x(activePoint.parameter)}
                              cy={y(value)}
                              r="4.5"
                              fill={SERIES_COLORS[index % SERIES_COLORS.length]}
                              className="sc-active-dot"
                            />
                          )
                        })}
                  </g>
                )}
            </>
          )}
        </svg>

        {(!chart?.hasData || !visibleVariables.length) && (
          <div className="sc-empty">
            <span>⌁</span>
            <p>{emptyMessage}</p>
          </div>
        )}

        {chart?.hasData &&
          hasSelection &&
          selectedInDomain &&
          activeParam !== null && (
            <div
              className="sc-tooltip"
              style={{
                left: `clamp(8px, ${(x(activeParam) / width) * 100 + 2}%, calc(100% - 175px))`,
              }}
            >
              <div className="sc-tooltip-heading">
                <span>{parameterName}</span>
                <strong>{formatNumber(activeParam)}</strong>
              </div>
              {isMultiBranch && multiBranchSeries ? (
                multiBranchSeries
                  .filter((b) => visibleVariables.includes(b.id))
                  .map((branch) => {
                    const pt = pointOnCurve(branch.points, activeParam)
                    const val = pt?.values?.[activeVariableIndex]
                    return (
                      <div className="sc-tooltip-value" key={branch.id}>
                        <span>
                          <i style={{ background: branch.color }} />
                          {branch.label}
                        </span>
                        <strong>
                          {typeof val === 'number' && Number.isFinite(val)
                            ? formatNumber(val)
                            : '현재 분기 추적 불가'}
                        </strong>
                      </div>
                    )
                  })
              ) : activePoint?.values ? (
                visible.map(({ name, index }) => (
                  <div className="sc-tooltip-value" key={name}>
                    <span>
                      <i
                        style={{
                          background:
                            SERIES_COLORS[index % SERIES_COLORS.length],
                        }}
                      />
                      {name}
                    </span>
                    <strong>{formatNumber(activePoint.values![index])}</strong>
                  </div>
                ))
              ) : (
                <p className="sc-tooltip-error">
                  {activePoint?.error ||
                    '이 구간에는 검증된 분기 데이터가 없습니다.'}
                </p>
              )}
            </div>
          )}
      </div>

      {allBifurcationEvents.length > 0 && (
        <div className="sc-bifurcation-banner" role="status">
          {allBifurcationEvents.map((ev, idx) => (
            <button
              type="button"
              key={idx}
              className={`sc-bifurcation-chip is-${ev.kind}`}
              onClick={() =>
                onParameterChange?.(
                  ev.tangency?.verified
                    ? ev.tangency.parameterStar
                    : ev.parameter,
                )
              }
              title={
                ev.tangency?.verified
                  ? '원래 등식과 도함수를 국소 수치 검증한 지점입니다.'
                  : '수치 추적으로 추정한 지점입니다.'
              }
            >
              <b>{branchEventLabel(ev)}</b>
              {ev.tangency?.verified && (
                <small className="sc-event-order">
                  {tangencyOrderLabel(ev.tangency)}
                </small>
              )}{' '}
              · {parameterName || '파라미터'} ≈{' '}
              {formatNumber(
                ev.tangency?.verified
                  ? ev.tangency.parameterStar
                  : ev.parameter,
              )}
            </button>
          ))}
        </div>
      )}

      {allBifurcationEvents.length > 0 && (
        <div className="sc-critical-legend" aria-label="특별한 근 기호">
          ○ 일반 해 <span>◆ 짝수 중근·접점</span>
          <span>⬡ 홀수 중근·관통</span>
          <span>■ 정의역 경계</span>
          <span>△ 추적 경계 추정</span>
        </div>
      )}
      <div className="sc-chart-footer">
        <span>
          연속 파라미터 <strong>{parameterName || '—'}</strong>
        </span>
        <span className="sc-current-note">
          <i />
          {hasSelection ? '탐색 지점' : '현재 파라미터'}
          <strong>
            {hasSelection && activeParam !== null
              ? formatNumber(activeParam)
              : Number.isFinite(currentParameter)
                ? formatNumber(currentParameter)
                : '—'}
          </strong>
        </span>
      </div>
    </div>
  )
}
```

<a id="source-22"></a>

## src/components/SolutionChart.css

원본: [src/components/SolutionChart.css](../../src/components/SolutionChart.css) · 342줄 · SHA-256: `d631eb8b0888bbcb90a9d0d0735e06bd2814490b5bd3094a40c51b1c9c3f1fd0`

```css
.solution-chart {
  width: 100%;
  max-width: 680px;
  min-width: 0;
  margin-inline: auto;
  color: #243d37;
}

.solution-chart.is-expanded {
  max-width: 1200px;
}

.sc-legend-row {
  min-height: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 4px 10px;
}

.sc-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.sc-legend-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 6px;
  padding: 5px 9px;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  color: #50675f;
  cursor: pointer;
  opacity: 0.4;
  transition:
    opacity 150ms,
    background 150ms;
}

.sc-legend-button.is-visible {
  opacity: 1;
}
.sc-legend-button:hover {
  background: #f1f5f1;
}
.sc-legend-button:focus-visible {
  outline: 2px solid #087f74;
  outline-offset: 2px;
}
.sc-legend-dot {
  width: 17px;
  height: 3px;
  border-radius: 4px;
  display: block;
}
.sc-explore-hint {
  color: #96a09a;
  font-size: 10px;
  letter-spacing: -0.15px;
  white-space: nowrap;
}
.sc-stage {
  position: relative;
  width: 100%;
}
.sc-view-controls {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin: 0 4px 14px;
  font-size: 10px;
  color: #8c9a91;
}
.sc-view-controls label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.sc-view-controls select,
.sc-reset-view {
  border: 1px solid #e0e8de;
  border-radius: 5px;
  background: #fbfcf9;
  color: #617c6d;
  font: inherit;
  min-height: 28px;
  padding: 4px 7px;
}
.sc-reset-view {
  cursor: pointer;
}
.sc-reset-view:hover {
  background: #edf5ec;
}
.sc-view-controls select:focus-visible,
.sc-reset-view:focus-visible {
  outline: 2px solid #80b8ae;
  outline-offset: 2px;
}
.sc-zoom-hint {
  margin-right: auto;
  font-size: 9px;
}
.sc-zoom-hint.is-active {
  color: #087f74;
}
.sc-stage svg {
  display: block;
  width: 100%;
  overflow: visible;
  outline: none;
  cursor: crosshair;
}
.sc-stage svg:focus-visible {
  outline: 2px solid #80b8ae;
  outline-offset: 3px;
  border-radius: 6px;
}
.sc-grid-line {
  stroke: #e9eeea;
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}
.sc-grid-vertical {
  stroke-dasharray: 3 5;
  stroke: #eef1ed;
}
.sc-zero-line {
  stroke: #dce4dc;
}
.sc-axis-label {
  fill: #94a099;
  font-size: 10px;
  font-family: 'DM Mono', 'SFMono-Regular', Consolas, monospace;
}
.sc-axis-caption {
  fill: #8a9890;
  font-size: 10px;
}
.sc-curve {
  fill: none;
  stroke-width: 2.5;
  stroke-linejoin: round;
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
}
.sc-current-line {
  stroke: #91a59a;
  stroke-dasharray: 3 5;
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}
.sc-crosshair {
  stroke: #c0cdc5;
  stroke-dasharray: 2 5;
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}
.sc-active-dot {
  stroke: #fff;
  stroke-width: 2.5;
  vector-effect: non-scaling-stroke;
}
.sc-tooltip {
  position: absolute;
  top: 20px;
  box-sizing: border-box;
  width: 152px;
  max-width: calc(100% - 16px);
  pointer-events: none;
  padding: 12px 14px;
  background: #fffefb;
  border: 1px solid #e0e7df;
  border-radius: 9px;
  box-shadow: 0 6px 24px #20372b0d;
  font-size: 11px;
  z-index: 2;
}
.sc-tooltip-heading {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding-bottom: 8px;
  margin-bottom: 7px;
  border-bottom: 1px solid #edf0eb;
  color: #819189;
}
.sc-tooltip-heading strong {
  color: #52665b;
}
.sc-tooltip-value {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  line-height: 1.9;
}
.sc-tooltip-value span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.sc-tooltip-value i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}
.sc-tooltip-value strong,
.sc-tooltip-heading strong {
  font-family: 'DM Mono', 'SFMono-Regular', Consolas, monospace;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
.sc-tooltip-error {
  font-size: 10px;
  line-height: 1.6;
  margin: 0;
  color: #b56e55;
}
.sc-tooltip-sample {
  color: #93a095;
  font-size: 8px;
  line-height: 1.5;
  margin: 8px 0 0;
}
.sc-chart-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #98a29a;
  font-size: 10px;
  padding: 6px 14px 1px 51px;
}
.sc-chart-footer strong {
  color: #637a6d;
  font-weight: 500;
  margin-left: 5px;
}
.sc-current-note {
  display: flex;
  align-items: center;
  gap: 5px;
}
.sc-current-note i {
  display: inline-block;
  background: #8ba497;
  width: 5px;
  height: 5px;
  border-radius: 50%;
}
.sc-current-note strong {
  font-family: 'DM Mono', 'SFMono-Regular', Consolas, monospace;
}
.sc-empty {
  position: absolute;
  inset: 15px 0 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: #8e9e92;
  background: #fffefaaf;
  pointer-events: none;
}
.sc-empty > span {
  font-size: 38px;
  color: #a0b6aa;
  line-height: 1;
}
.sc-empty p {
  margin: 13px 20px 0;
  text-align: center;
  max-width: 280px;
  font-size: 12px;
  line-height: 1.8;
}
.sc-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 700px) {
  .sc-explore-hint {
    display: none;
  }
  .sc-legend-row {
    padding-bottom: 7px;
  }
  .sc-tooltip {
    padding: 9px 10px;
    font-size: 10px;
  }
  .sc-chart-footer {
    padding-left: 25px;
  }
}

.sc-event-order {
  margin-left: 6px;
  padding: 1px 5px;
  border-radius: 4px;
  background: #f2ece2;
  font-size: 10px;
  color: #8e622e;
}
.sc-critical-legend {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  color: #788474;
  font-size: 10px;
  padding: 8px 0;
}

.chart-help {
  margin-right: auto;
  max-width: 65ch;
  font-size: 11px;
  color: #60766c;
}
.chart-help summary {
  cursor: pointer;
}
.chart-help p {
  line-height: 1.8;
}
```

<a id="source-23"></a>

## src/components/SimulationPanelView.tsx

원본: [src/components/SimulationPanelView.tsx](../../src/components/SimulationPanelView.tsx) · 338줄 · SHA-256: `e807b139b2dae28c72ee3a66eb44ef6952aadc66509860ddf8df9f83b302e0bf`

```tsx
import { rootStructureLabel } from '../engine/tangency'
import { useEffect, useRef, useState } from 'react'
import { Download, FileText, X } from 'lucide-react'
import type { Parameter, SimulationAnchor, SimulationPanel } from '../engine'
import SolutionChart, { SERIES_COLORS } from './SolutionChart'
import './SimulationPanelView.css'
import { encodeCsv } from '../csv'

export type SimulationPanelViewProps = {
  panel: SimulationPanel
  anchor: SimulationAnchor
  parameters: Parameter[]
  expanded: boolean
  onClose: () => void
  closable?: boolean
  onParameterChange?: (value: number) => void
  onSweepNameChange?: (name: string) => void
  onReport?: () => void
  pending?: boolean
}

function formatNumber(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return '—'
  if (value === 0) return '0'
  return Number(value.toPrecision(8)).toString()
}

function vectorText(variables: string[], values: number[]): string {
  return variables
    .map((name, index) => `${name} = ${formatNumber(values[index])}`)
    .join(' · ')
}

export default function SimulationPanelView({
  panel,
  anchor,
  parameters,
  expanded,
  onClose,
  closable = true,
  onParameterChange,
  onSweepNameChange,
  onReport,
  pending = false,
}: SimulationPanelViewProps) {
  const variables = panel.result?.variables ?? anchor.variables
  const variableKey = variables.join('\u0000')
  const [visibleVariables, setVisibleVariables] = useState(variables)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const rows = useRef<(HTMLTableRowElement | null)[]>([])
  const parameter = parameters.find((item) => item.name === panel.sweepName)
  const hasSweep = Boolean(panel.sweepName && parameter)

  useEffect(() => {
    setVisibleVariables(variables)
  }, [variableKey])

  useEffect(() => {
    setSelectedIndex(null)
  }, [panel.dataset, panel.sweepName])

  useEffect(() => {
    if (selectedIndex === null) return
    const row = rows.current[selectedIndex]
    const container = scroller.current
    if (!row || !container || !container.clientHeight) return
    const headingHeight = 38
    if (row.offsetTop < container.scrollTop + headingHeight) {
      container.scrollTop = Math.max(0, row.offsetTop - headingHeight)
    } else if (
      row.offsetTop + row.offsetHeight >
      container.scrollTop + container.clientHeight
    ) {
      container.scrollTop =
        row.offsetTop + row.offsetHeight - container.clientHeight
    }
  }, [selectedIndex])

  function downloadCsv() {
    const content = hasSweep
      ? [
          [panel.sweepName, ...variables],
          ...panel.dataset.map((point) => [
            point.parameter,
            ...variables.map((_, index) => point.values?.[index] ?? ''),
          ]),
        ]
      : [
          ['변수', '값'],
          ...variables.map((name, index) => [
            name,
            panel.result?.values[index] ?? '',
          ]),
        ]
    const text = encodeCsv(content)
    const url = URL.createObjectURL(
      new Blob(['\uFEFF', text], { type: 'text/csv;charset=utf-8' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = `ivc-simulation-${panel.id.replace(/[^a-zA-Z0-9_-]/g, '_')}-data.csv`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <section
      className={`simulation-panel${expanded ? ' is-expanded' : ''}${pending ? ' is-pending' : ''}`}
      aria-label={`${panel.label} 시뮬레이션`}
      aria-busy={pending}
    >
      <header className="simulation-panel-header">
        <div className="simulation-panel-heading">
          <h3>{panel.label}</h3>
          <p className="simulation-panel-anchor">
            <span>선택 기준</span>
            <span title={vectorText(anchor.variables, anchor.values)}>
              {vectorText(anchor.variables, anchor.values)}
            </span>
          </p>
        </div>
        {closable && (
          <button
            type="button"
            className="simulation-panel-close"
            onClick={onClose}
            aria-label={`${panel.label} 시뮬레이션 닫기`}
            title="시뮬레이션 닫기"
          >
            <X size={17} aria-hidden="true" />
          </button>
        )}
      </header>

      <div className="simulation-panel-current">
        <span>
          현재 해
          {panel.result?.rootStructure &&
            ` · ${rootStructureLabel(panel.result.rootStructure)}`}
        </span>
        <strong>
          {panel.result
            ? vectorText(panel.result.variables, panel.result.values)
            : '현재 분기 추적 불가'}
        </strong>
        {pending && <small role="status">계산 중…</small>}
      </div>

      {!panel.result && (
        <p className="simulation-panel-error" role="alert">
          {panel.error ||
            '현재 파라미터에서 선택한 해를 찾지 못했습니다. 파라미터를 조정해 주세요.'}
        </p>
      )}

      {hasSweep ? (
        <div className="simulation-panel-chart">
          {onSweepNameChange && (
            <label className="sweep-selector">
              가로축 파라미터
              <select
                aria-label={`${panel.label} 가로축 파라미터`}
                value={panel.sweepName}
                onChange={(e) => onSweepNameChange(e.target.value)}
              >
                {parameters.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <SolutionChart
            expanded={expanded}
            modelKind="nonlinear"
            points={panel.sweep}
            events={panel.events}
            selectionPoints={panel.dataset}
            variables={variables}
            parameterName={panel.sweepName}
            currentParameter={parameter?.value ?? 0}
            currentValues={panel.result?.values}
            onParameterChange={onParameterChange}
            selectedIndex={selectedIndex}
            onSelectIndex={setSelectedIndex}
            visibleVariables={visibleVariables}
            onToggleVariable={(name) =>
              setVisibleVariables((current) =>
                current.includes(name)
                  ? current.filter((item) => item !== name)
                  : [...current, name],
              )
            }
          />
        </div>
      ) : (
        <p className="simulation-panel-helper">
          파라미터를 추가하면 이 해가 어떻게 변하는지 탐색할 수 있습니다.
        </p>
      )}

      <details className="analysis-details simulation-reading-help">
        <summary>초기값과 끊긴 곡선은 어떻게 읽나요?</summary>
        <p>
          초기값은 여러 해 중 처음 선택할 해를 정합니다. 이후에는 그 해를 연속
          추적합니다. 탐색 파라미터만 움직이면 기준 곡선은 유지되고 현재점만
          이동합니다. 다른 고정 파라미터를 바꾸면 식 자체가 달라져 곡선을 다시
          계산합니다.
        </p>
        <p>
          빈 구간은 선택한 해를 연속적으로 추적하지 못한 곳입니다. 근이
          병합·소멸하거나 정의역을 벗어날 수 있고, 수치 보정이 실패할 수도
          있습니다. 다른 해의 부재를 뜻하지는 않습니다. 모든 가지를 비교하려면
          자동 탐색을 사용하세요. ‘모델 풀기’를 다시 누르면 현재 설정과
          초기값으로 기준 해를 새로 선택합니다.
        </p>
      </details>
      {panel.datasetError && (
        <p className="simulation-panel-error" role="alert">
          {panel.datasetError}
        </p>
      )}

      {hasSweep && panel.dataset.length > 0 && (
        <details className="simulation-panel-data">
          <summary>데이터 표</summary>
          <p className="simulation-panel-data-note">
            설정한 샘플 포인트 간격으로 계산한 값입니다. 표와 그래프의 선택
            지점을 함께 확인할 수 있습니다.
          </p>
          <div
            className="simulation-panel-table-scroll"
            ref={scroller}
            onPointerLeave={() => setSelectedIndex(null)}
          >
            <table>
              <caption className="simulation-panel-sr-only">
                {panel.label}의 {panel.sweepName}별 계산 결과
              </caption>
              <thead>
                <tr>
                  <th scope="col">{panel.sweepName}</th>
                  {variables.map((name, index) => (
                    <th scope="col" key={name}>
                      <i
                        style={{
                          background:
                            SERIES_COLORS[index % SERIES_COLORS.length],
                        }}
                        aria-hidden="true"
                      />
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {panel.dataset.map((point, index) => (
                  <tr
                    key={index}
                    ref={(element) => {
                      rows.current[index] = element
                    }}
                    tabIndex={0}
                    aria-label={`${panel.sweepName} ${String(point.parameter)} 탐색`}
                    aria-selected={selectedIndex === index}
                    className={selectedIndex === index ? 'is-selected' : ''}
                    onPointerEnter={() => setSelectedIndex(index)}
                    onFocus={() => setSelectedIndex(index)}
                    onClick={() => setSelectedIndex(index)}
                    onBlur={() => setSelectedIndex(null)}
                    onKeyDown={(event) => {
                      const next =
                        event.key === 'ArrowDown'
                          ? index + 1
                          : event.key === 'ArrowUp'
                            ? index - 1
                            : null
                      if (next !== null) {
                        event.preventDefault()
                        rows.current[next]?.focus()
                      }
                    }}
                  >
                    <td>{formatNumber(point.parameter)}</td>
                    {point.values ? (
                      variables.map((name, variableIndex) => (
                        <td key={name}>
                          {formatNumber(point.values?.[variableIndex])}
                        </td>
                      ))
                    ) : (
                      <td
                        colSpan={Math.max(1, variables.length)}
                        className="simulation-panel-no-solution"
                        title={point.error}
                      >
                        추적 미완료
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      <footer className="simulation-panel-actions">
        <button
          type="button"
          onClick={downloadCsv}
          disabled={
            pending ||
            (hasSweep
              ? Boolean(panel.datasetError) || panel.dataset.length === 0
              : !panel.result)
          }
          aria-label={`${panel.label} CSV 저장`}
        >
          <Download size={14} aria-hidden="true" /> CSV 저장
        </button>
        {onReport && (
          <button
            type="button"
            onClick={onReport}
            disabled={pending || !panel.result}
            aria-label={`${panel.label} 해석 리포트`}
          >
            <FileText size={14} aria-hidden="true" /> 해석 리포트
          </button>
        )}
      </footer>
    </section>
  )
}
```

<a id="source-24"></a>

## src/components/MergedSimulationSetView.tsx

원본: [src/components/MergedSimulationSetView.tsx](../../src/components/MergedSimulationSetView.tsx) · 360줄 · SHA-256: `d91b6ed2bc1fa21afb84da23d82422de66b9bc8f2c14b940942446e3ad40841c`

```tsx
import { useEffect, useState, type ReactNode } from 'react'
import { Download, Layers3, Trash2, X } from 'lucide-react'
import type {
  MergedSimulationSet,
  Parameter,
  SimulationAnchor,
  SimulationPanel,
} from '../engine'
import { encodeCsv } from '../csv'
import { detectMergedBranchEvents } from '../engine/simulation-panels'
import { branchEventLabel } from '../engine/branch-events'
import SolutionChart, {
  SERIES_COLORS,
  type MultiBranchSeries,
} from './SolutionChart'

export type MergedSimulationSetViewProps = {
  mergedSet: MergedSimulationSet
  anchors: SimulationAnchor[]
  panels: SimulationPanel[]
  parameters: Parameter[]
  sweepName: string
  selectedAnchorId?: string
  large?: boolean
  onSelectAnchor?: (anchor: SimulationAnchor) => void
  onReportAnchor?: (anchor: SimulationAnchor) => void
  expanded: boolean
  pending: boolean
  onRemoveSet: () => void
  onToggleAnchorInSet: (anchorId: string) => void
  onParameterChange?: (value: number) => void
  onSweepNameChange?: (name: string) => void
  controls?: ReactNode
}

function formatNumber(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return '—'
  if (value === 0) return '0'
  return Number(value.toPrecision(7)).toString()
}

export default function MergedSimulationSetView({
  mergedSet,
  anchors,
  panels,
  parameters,
  sweepName,
  expanded,
  large = false,
  selectedAnchorId,
  onSelectAnchor,
  onReportAnchor,
  pending,
  onRemoveSet,
  onToggleAnchorInSet,
  onParameterChange,
  onSweepNameChange,
  controls,
}: MergedSimulationSetViewProps) {
  const includedAnchors = anchors.filter((a) =>
    mergedSet.anchorIds.includes(a.id),
  )
  const includedPanels = includedAnchors.map(
    (anchor) =>
      panels.find((p) => p.id === anchor.id) ?? {
        id: anchor.id,
        label: anchor.label,
        result: null,
        sweep: [],
        dataset: [],
        sweepName,
        events: [],
      },
  )

  const variables = includedPanels[0]?.result?.variables ??
    includedAnchors[0]?.variables ?? ['x']
  const [activeVarIdx, setActiveVarIdx] = useState(0)
  const [visibleBranchIds, setVisibleBranchIds] = useState<string[]>(
    mergedSet.anchorIds,
  )
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  useEffect(() => {
    setVisibleBranchIds(mergedSet.anchorIds)
  }, [mergedSet.anchorIds.join('|')])

  useEffect(() => {
    setActiveVarIdx(0)
    setSelectedIndex(null)
  }, [variables.join('|'), sweepName])
  const branchColor = (id: string) =>
    SERIES_COLORS[
      Math.max(
        0,
        anchors.findIndex((a) => a.id === id),
      ) % SERIES_COLORS.length
    ]
  const sweepParam = parameters.find((p) => p.name === sweepName)
  const mergedEvents = detectMergedBranchEvents(includedPanels)

  const multiBranchSeries: MultiBranchSeries[] = includedPanels.map(
    (panel, idx) => ({
      id: panel.id,
      label: panel.label,
      color: branchColor(panel.id),
      points: panel.sweep,
      samplePoints: panel.dataset,
      currentValues: panel.result?.values,
      events: mergedEvents.filter(
        (event) =>
          event.branchId === panel.id || event.mergedWithAnchorId === panel.id,
      ),
    }),
  )

  function exportMergedCsv() {
    if (
      !sweepParam ||
      !includedPanels.length ||
      includedPanels.some((p) => p.datasetError)
    )
      return
    const baseDataset = includedPanels[0].dataset
    const header = [
      sweepName,
      ...includedPanels.map(
        (p) => `${p.label} (${variables[activeVarIdx] ?? 'x'})`,
      ),
    ]
    const rows = baseDataset.map((pt, rowIdx) => [
      pt.parameter,
      ...includedPanels.map(
        (p) => p.dataset[rowIdx]?.values?.[activeVarIdx] ?? '',
      ),
    ])
    const csv = encodeCsv([header, ...rows])
    const url = URL.createObjectURL(
      new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = `ivc-${mergedSet.name.replace(/\s+/g, '-')}-data.csv`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <section
      className={`simulation-panel merged-simulation-panel${expanded ? ' is-expanded' : ''}`}
      aria-busy={pending}
      aria-label={`${mergedSet.name} 병합 시뮬레이션`}
    >
      <header className="simulation-panel-header">
        <div className="simulation-panel-heading">
          <h3>
            <Layers3
              size={15}
              style={{ verticalAlign: '-2px', marginRight: '6px' }}
            />
            {mergedSet.name}
          </h3>
        </div>
        <button
          type="button"
          className="simulation-panel-close"
          onClick={onRemoveSet}
          aria-label={`${mergedSet.name} 삭제`}
          title="병합 세트 삭제"
        >
          <X size={17} />
        </button>
      </header>

      {/* 해 포함/제외 토글 칩 */}
      <div className="merged-set-Chips">
        {anchors.map((anchor, idx) => {
          const active = mergedSet.anchorIds.includes(anchor.id)
          return (
            <button
              key={anchor.id}
              type="button"
              className={`merged-branch-chip${active ? ' is-active' : ''}`}
              aria-pressed={active}
              onClick={() => onToggleAnchorInSet(anchor.id)}
              title={active ? '클릭하여 세트에서 제외' : '클릭하여 세트에 추가'}
            >
              <i
                style={{
                  background: active ? branchColor(anchor.id) : '#ccc',
                }}
              />
              <span>{anchor.label}</span>
            </button>
          )
        })}
      </div>

      {/* 다변수 연립방정식일 때 비교할 미지수 선택 */}
      {variables.length > 1 && (
        <div className="merged-variable-selector">
          <span>표시할 미지수:</span>
          {variables.map((v, idx) => (
            <button
              key={v}
              type="button"
              className={activeVarIdx === idx ? 'is-selected' : ''}
              onClick={() => setActiveVarIdx(idx)}
            >
              {v}
            </button>
          ))}
        </div>
      )}

      {/* 현재 파라미터에서 각 해의 상태 요약 (생존 vs 소멸/병합) */}
      <details className="merged-current-wrap" open={!large}>
        <summary>각 해 결과·선택</summary>
        <div className="merged-current-grid">
          {includedPanels.map((panel, idx) => {
            const val = panel.result?.values[activeVarIdx]
            const color = branchColor(panel.id)
            const mergeEvent = mergedEvents.find(
              (event) =>
                event.kind === 'merge' &&
                (event.branchId === panel.id ||
                  event.mergedWithAnchorId === panel.id),
            )
            return (
              <div
                key={panel.id}
                className={`merged-current-card${!panel.result ? ' is-vanished' : ''}`}
                data-selected={selectedAnchorId === panel.id}
              >
                <span className="merged-card-label">
                  <i style={{ background: color }} />
                  {panel.label}
                </span>
                <strong>
                  {panel.result
                    ? `${variables[activeVarIdx]} = ${formatNumber(val)}`
                    : mergeEvent
                      ? `${branchEventLabel(mergeEvent)} · 현재 추적 불가`
                      : '현재 분기 추적 불가'}
                </strong>
                {onSelectAnchor && (
                  <button
                    type="button"
                    aria-pressed={selectedAnchorId === panel.id}
                    onClick={() => onSelectAnchor(includedAnchors[idx])}
                  >
                    해 선택
                  </button>
                )}
                {onReportAnchor && (
                  <button
                    type="button"
                    onClick={() => onReportAnchor(includedAnchors[idx])}
                  >
                    리포트
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </details>
      <div className="merged-parameter-controls">
        {parameters.length > 0 && onSweepNameChange && (
          <label className="sweep-selector">
            가로축 파라미터
            <select
              aria-label={`${mergedSet.name} 가로축 파라미터`}
              value={sweepName}
              onChange={(e) => onSweepNameChange(e.target.value)}
            >
              {parameters.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {controls}
      </div>
      {sweepParam ? (
        <div className="simulation-panel-chart">
          <SolutionChart
            expanded={expanded}
            large={large}
            modelKind="nonlinear"
            points={includedPanels[0]?.sweep ?? []}
            selectionPoints={includedPanels[0]?.dataset ?? []}
            variables={variables}
            parameterName={sweepName}
            currentParameter={sweepParam.value}
            selectedIndex={selectedIndex}
            onSelectIndex={setSelectedIndex}
            visibleVariables={visibleBranchIds}
            onToggleVariable={(id) =>
              setVisibleBranchIds((prev) =>
                prev.includes(id)
                  ? prev.filter((item) => item !== id)
                  : [...prev, id],
              )
            }
            onParameterChange={onParameterChange}
            multiBranchSeries={multiBranchSeries}
            activeVariableIndex={activeVarIdx}
            events={mergedEvents}
          />
        </div>
      ) : (
        <p className="simulation-panel-helper">
          파라미터를 추가하면 여러 해가 어떻게 만나서 병합·소멸하는지 한
          그래프에서 볼 수 있습니다.
        </p>
      )}

      <details className="analysis-details simulation-reading-help">
        <summary>해의 범위와 끊긴 곡선 읽기</summary>
        <p>
          각 색은 저장한 한 해에서 연속적으로 추적한 계산 결과입니다. 현재값에서
          존재하지 않는 해도 다른 파라미터 구간에는 표시될 수 있습니다. 범례나
          위 선택 버튼으로 숨기거나 다시 표시할 수 있습니다.
        </p>
        <p>
          ◆는 국소적으로 확인한 근 병합 지점입니다. 빈 구간은 추적 실패를
          뜻하며, 해가 없다는 증명과는 다릅니다. 실제 근 소멸, 분모 0·정의역
          이탈, 수치 보정 실패를 구분하려면 지점 안내와 리포트를 확인하세요.
          수렴하지 않은 구간을 다른 해로 연결하지 않습니다.
        </p>
        <p>
          전체 해 탐색은 설정한 범위의 여러 파라미터에서 발견한 해를 최대
          6개까지 함께 추적합니다. 유한한 탐색이므로 이 그래프만으로 모든 해가
          포함되었다고 판정하지 않습니다. 가로축 파라미터를 바꾸면 기존 기준
          해에서 새 곡선을 계산하며 세트를 삭제할 필요가 없습니다.
        </p>
      </details>
      <footer className="simulation-panel-actions">
        <button
          type="button"
          onClick={exportMergedCsv}
          disabled={
            pending ||
            !sweepParam ||
            includedPanels.length === 0 ||
            includedPanels.some((p) => p.datasetError)
          }
        >
          <Download size={14} /> 병합 세트 CSV 저장
        </button>
        <button type="button" onClick={onRemoveSet}>
          <Trash2 size={14} /> 세트 삭제
        </button>
      </footer>
    </section>
  )
}
```

<a id="source-25"></a>

## src/components/SimulationPanelView.css

원본: [src/components/SimulationPanelView.css](../../src/components/SimulationPanelView.css) · 270줄 · SHA-256: `42048b6eaf9f4a93cc8124973394fe06817d31a3070e27c91fd94e16eeb0e805`

```css
.simulation-panel {
  min-width: 0;
  width: 100%;
  padding: 20px;
  border: 1px solid #e1e8df;
  border-radius: 12px;
  background: #fffefb;
  color: #344b41;
}

.simulation-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.simulation-panel-heading {
  min-width: 0;
}

.simulation-panel-heading h3 {
  color: #276c60;
  font-size: 16px;
  font-weight: 650;
}

.simulation-panel-anchor {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 9px;
  margin-top: 7px;
  color: #87958b;
  font-size: 11px;
  line-height: 1.7;
}

.simulation-panel-anchor > :last-child,
.simulation-panel-current strong {
  min-width: 0;
  font-family: 'DM Mono', 'SFMono-Regular', Consolas, monospace;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.simulation-panel-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  margin: -5px -6px 0 0;
  border-radius: 6px;
  color: #8c9b91;
}

.simulation-panel-close:hover {
  color: #506b5d;
  background: #edf3eb;
}

.simulation-panel-current {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 7px 12px;
  padding: 12px 14px;
  margin: 17px 0;
  border-radius: 7px;
  background: #f1f6ef;
  font-size: 11px;
  color: #7b8a7b;
  line-height: 1.75;
}

.simulation-panel-current strong {
  font-size: 13px;
  font-weight: 500;
  color: #3a6957;
}

.simulation-panel-current small {
  margin-left: auto;
  font-size: 11px;
  color: #59877b;
}

.simulation-panel-sweep-label {
  margin: 0 0 12px 3px;
  color: #93a091;
  font-size: 11px;
}

.simulation-panel-sweep-label strong {
  color: #607d6e;
  font-weight: 500;
}

.simulation-panel-helper {
  padding: 38px 12px;
  color: #8a9b8d;
  text-align: center;
  font-size: 12px;
  line-height: 1.9;
}

.simulation-panel-error {
  padding: 10px 12px;
  margin: 12px 0;
  border: 1px solid #eeddd0;
  border-radius: 6px;
  background: #fcf6ef;
  color: #a4704e;
  font-size: 12px;
  line-height: 1.8;
  overflow-wrap: anywhere;
}

.simulation-panel-data {
  margin-top: 19px;
  border-top: 1px solid #e9ede5;
  padding-top: 13px;
}

.simulation-panel-data summary {
  width: fit-content;
  cursor: pointer;
  color: #6b8170;
  font-size: 12px;
  padding: 3px 0;
}

.simulation-panel-data summary:focus-visible {
  outline: 2px solid #80b8ae;
  outline-offset: 4px;
  border-radius: 3px;
}

.simulation-panel-data-note {
  margin: 10px 0;
  color: #98a294;
  font-size: 10px;
  line-height: 1.8;
}

.simulation-panel-table-scroll {
  position: relative;
  max-height: 260px;
  overflow: auto;
  overscroll-behavior: contain;
  border: 1px solid #e8ede4;
  border-radius: 7px;
}

.simulation-panel-table-scroll table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  color: #536e5d;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.simulation-panel-table-scroll th,
.simulation-panel-table-scroll td {
  padding: 10px 13px;
  text-align: right;
  white-space: nowrap;
  border-bottom: 1px solid #edf0e9;
}

.simulation-panel-table-scroll th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #f5f7f0;
  color: #7c8d78;
  font-weight: 500;
}

.simulation-panel-table-scroll th i {
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  margin-right: 7px;
  vertical-align: middle;
}

.simulation-panel-table-scroll td {
  font-family: 'DM Mono', 'SFMono-Regular', Consolas, monospace;
}

.simulation-panel-table-scroll tr:last-child td {
  border-bottom: 0;
}

.simulation-panel-table-scroll tbody tr:focus-visible {
  outline: 2px solid #77b5a4;
  outline-offset: -2px;
}

.simulation-panel-table-scroll tbody tr.is-selected {
  background: #eaf4e9;
}

.simulation-panel-table-scroll td.simulation-panel-no-solution {
  color: #ac927b;
  text-align: center;
  font-family: inherit;
}

.simulation-panel-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 7px;
  margin-top: 17px;
}

.simulation-panel-actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 32px;
  padding: 7px 10px;
  border: 1px solid #e3e9dd;
  border-radius: 6px;
  background: #fffefb;
  color: #69836f;
  font-size: 11px;
}

.simulation-panel-actions button:hover:enabled {
  background: #f0f5eb;
  border-color: #d5e1ce;
}

.simulation-panel-actions button:disabled {
  opacity: 0.42;
}

.simulation-panel-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 600px) {
  .simulation-panel {
    padding: 16px 12px;
  }

  .simulation-panel-current {
    padding: 10px;
  }

  .simulation-panel-actions button {
    min-height: 36px;
  }
}
```

<a id="source-26"></a>

## src/components/WorkspaceNavigation.tsx

원본: [src/components/WorkspaceNavigation.tsx](../../src/components/WorkspaceNavigation.tsx) · 236줄 · SHA-256: `ca3fe4e8de6b1d7cf114fc527e30d2ef3907df86335f2d548f6dfbb2062b984b`

```tsx
import type { ScientificModule } from '../engine/scientific/types'
import { ArrowRight, Code2, FileText, Activity } from 'lucide-react'
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
  available?: boolean
}[] = [
  {
    kind: 'equation',
    letter: 'E',
    name: 'Equation Solver',
    available: true,
  },
  {
    kind: 'differential',
    available: true,
    letter: 'D',
    name: 'Differential Equations',
  },
  {
    kind: 'curve',
    available: true,
    letter: 'P',
    name: 'Curve Fitting',
  },
  {
    kind: 'nonlinear',
    available: true,
    letter: 'N',
    name: 'Nonlinear Fitting',
  },
  {
    kind: 'optimum',
    available: true,
    letter: 'O',
    name: 'Optimum Finder',
  },
  {
    kind: 'integration',
    available: true,
    letter: 'I',
    name: 'Discrete Integration',
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
  onOpenScientific,
}: {
  onOpenEquationSolver: () => void
  onOpenScientific: (module: ScientificModule) => void
}) {
  return (
    <section className="module-home" aria-label="계산 도구">
      <div className="module-grid">
        {modules.map((module) => (
          <button
            type="button"
            className={`module-card module-${module.kind}${module.available ? ' is-available' : ''}`}
            key={module.kind}
            disabled={!module.available}
            aria-label={`${module.name} ${module.available ? '열기' : '준비 중'}`}
            onClick={() =>
              module.kind === 'equation'
                ? onOpenEquationSolver()
                : onOpenScientific(
                    (
                      {
                        differential: 'ode',
                        curve: 'curve-fit',
                        nonlinear: 'nonlinear-fit',
                        optimum: 'optimization',
                        integration: 'integration',
                      } as const
                    )[module.kind],
                  )
            }
          >
            <span className="module-card-title">
              <span className="module-letter">{module.letter}</span>
              <span>{module.name}</span>
            </span>
            <ModuleIllustration kind={module.kind} />
            <span className="module-card-footer">
              {module.available ? (
                <>
                  <ArrowRight size={16} />
                </>
              ) : (
                <span className="module-coming-soon">준비 중</span>
              )}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

const screens = [
  { screen: 'model', name: 'Model & Data', icon: Code2 },
  { screen: 'simulation', name: 'Simulation', icon: Activity },
  { screen: 'report', name: 'Report', icon: FileText },
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
```

<a id="source-27"></a>

## src/components/WorkspaceNavigation.css

원본: [src/components/WorkspaceNavigation.css](../../src/components/WorkspaceNavigation.css) · 366줄 · SHA-256: `a7fef9cca920fcd2108a4636b91db1b827773a9fdb3819a6376f9739d592f93f`

```css
.module-home {
  max-width: 1180px;
  margin: 0 auto;
  padding: 52px 12px 40px;
}
.module-home-heading {
  margin-bottom: 35px;
}
.module-home-eyebrow {
  display: block;
  color: #809086;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 2px;
  margin-bottom: 15px;
}
.module-home-heading h1 {
  font-size: clamp(25px, 2.5vw, 35px);
  font-weight: 600;
  letter-spacing: -1.3px;
  color: #2d423a;
}
.module-home-heading p {
  margin-top: 12px;
  color: #87968e;
  font-size: 13px;
  line-height: 1.8;
}
.module-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 21px;
}
.module-card {
  --module-ink: #4e8b65;
  --module-soft: #f0f7ed;
  --module-border: #cddfc6;
  --module-accent: #7bab75;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-width: 0;
  min-height: 244px;
  padding: 25px 25px 17px;
  border: 1px solid var(--module-border);
  border-radius: 13px;
  background: linear-gradient(125deg, #fff 0%, var(--module-soft) 100%);
  color: #394c43;
  overflow: hidden;
  white-space: normal;
  text-align: left;
  transition:
    transform 0.2s,
    box-shadow 0.2s,
    border-color 0.2s;
}
.module-card::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 4px;
  background: linear-gradient(
    90deg,
    var(--module-border),
    var(--module-accent)
  );
}
.module-card.is-available:hover {
  transform: translateY(-3px);
  box-shadow: 0 9px 30px #426b4e12;
  border-color: #82ad82;
}
.module-card.is-available:active {
  transform: translateY(0);
}
.module-card:disabled {
  opacity: 1;
}
.module-differential {
  --module-ink: #6f88b1;
  --module-soft: #eef3fb;
  --module-border: #d6e1f0;
  --module-accent: #90acd6;
}
.module-curve {
  --module-ink: #9581b4;
  --module-soft: #f3eff9;
  --module-border: #e1d7ef;
  --module-accent: #b4a1d0;
}
.module-nonlinear {
  --module-ink: #b6809d;
  --module-soft: #f9f0f4;
  --module-border: #ecd8e2;
  --module-accent: #cda1b8;
}
.module-optimum {
  --module-ink: #b88e5d;
  --module-soft: #faf4e9;
  --module-border: #ebdfcc;
  --module-accent: #d3b284;
}
.module-integration {
  --module-ink: #68998f;
  --module-soft: #eef8f5;
  --module-border: #d5e8e2;
  --module-accent: #9bc5b9;
}
.module-card-title {
  display: flex;
  gap: 11px;
  align-items: center;
  font-size: 18px;
  line-height: 1.35;
  font-weight: 550;
  letter-spacing: -0.4px;
}
.module-letter {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  border-radius: 8px;
  background: var(--module-ink);
  color: #fff;
  font-size: 19px;
  font-weight: 650;
}
.module-description {
  color: #85918b;
  font-size: 12px;
  line-height: 1.8;
  display: block;
  margin: 17px 0 0;
  min-height: 43px;
  word-break: keep-all;
}
.module-card.is-available .module-description {
  color: #6a8273;
}
.module-illustration {
  color: var(--module-ink);
  display: block;
  width: 156px;
  height: 75px;
  margin: 11px auto 3px;
  overflow: visible;
}
.module-line {
  fill: none;
  stroke: currentColor;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.module-line-muted {
  opacity: 0.62;
  stroke-width: 2;
}
.module-line-dashed {
  stroke-width: 1.5;
  stroke-dasharray: 4 4;
  opacity: 0.65;
}
.module-point {
  fill: #fff;
  stroke: currentColor;
  stroke-width: 2.2;
}
.module-arrow {
  fill: currentColor;
}
.module-area {
  fill: currentColor;
  opacity: 0.2;
}
.module-card-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 7px;
  min-height: 22px;
  margin-top: auto;
  color: var(--module-ink);
  font-size: 11px;
}
.module-card-footer > svg {
  transition: transform 0.2s;
}
.module-card:hover .module-card-footer > svg {
  transform: translateX(3px);
}
.module-coming-soon {
  background: #ffffffa6;
  border: 1px solid var(--module-border);
  border-radius: 20px;
  padding: 3px 9px;
  font-size: 10px;
}
.module-home-note {
  margin-top: 26px;
  font-size: 11px;
  line-height: 1.8;
  color: #96a198;
  text-align: center;
}
.workspace-navigation {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 0 0 25px;
  padding: 0 0 16px;
  border-bottom: 1px solid #e3e9e0;
}
.workspace-home-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
  padding: 10px 4px;
  font-size: 11px;
  color: #8a9a8c;
}
.workspace-home-button:hover {
  color: #427c68;
}
.workspace-nav-divider {
  height: 22px;
  border-left: 1px solid #dde5db;
}
.workspace-screen-links {
  display: flex;
  align-items: center;
  gap: 8px;
}
.workspace-screen-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 17px;
  color: #8d9b90;
  font-size: 12px;
  border: 1px solid transparent;
  border-radius: 7px;
}
.workspace-screen-button:hover {
  background: #f1f5ed;
  color: #4d806c;
}
.workspace-screen-button.is-current {
  color: #377d69;
  background: #edf4e9;
  border-color: #dce8d5;
  font-weight: 600;
}
.workspace-screen-number {
  font-family: ui-monospace, monospace;
  font-size: 10px;
  opacity: 0.65;
}
.workspace-screen-button > svg {
  display: none;
}
@media (max-width: 1050px) {
  .module-card {
    padding-inline: 20px;
  }
  .module-card-title {
    font-size: 16px;
  }
  .module-grid {
    gap: 15px;
  }
}
@media (max-width: 850px) {
  .module-home {
    padding-top: 30px;
  }
  .module-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .workspace-navigation {
    gap: 10px;
  }
  .workspace-screen-button {
    padding-inline: 12px;
    gap: 6px;
  }
}
@media (max-width: 540px) {
  .module-home {
    padding: 23px 0 25px;
  }
  .module-home-heading {
    margin-bottom: 25px;
  }
  .module-home-heading h1 {
    font-size: 25px;
  }
  .module-home-heading p {
    font-size: 11px;
    margin-top: 10px;
  }
  .module-home-eyebrow {
    font-size: 8px;
    letter-spacing: 1.5px;
  }
  .module-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 13px;
  }
  .module-card {
    min-height: 211px;
    padding: 22px 23px 16px;
  }
  .module-description {
    min-height: 0;
    margin-top: 13px;
  }
  .module-illustration {
    margin-top: 5px;
    height: 66px;
  }
  .workspace-navigation {
    gap: 9px;
    margin-bottom: 20px;
    padding-bottom: 12px;
  }
  .workspace-home-button {
    width: 29px;
    justify-content: center;
  }
  .workspace-home-button > span,
  .workspace-nav-divider,
  .workspace-screen-number {
    display: none;
  }
  .workspace-screen-links {
    gap: 3px;
    flex: 1;
    justify-content: space-between;
  }
  .workspace-screen-button {
    padding: 11px 8px;
    font-size: 10px;
    gap: 5px;
  }
  .workspace-screen-button > svg {
    display: block;
    width: 13px;
    height: 13px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .module-card,
  .module-card-footer > svg {
    transition: none;
  }
  .module-card.is-available:hover,
  .module-card:hover .module-card-footer > svg {
    transform: none;
  }
}
```

<a id="source-28"></a>

## src/styles.css

원본: [src/styles.css](../../src/styles.css) · 3,791줄 · SHA-256: `3a61760e55a15f2428dee05b945cfc4381047378c3baf8d59f8c43bafc11b019`

```css
:root {
  font-family:
    'Pretendard',
    'Noto Sans KR',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
  color: #27332f;
  background: #f7f8f6;
  font-synthesis: none;
  font-weight: 400;
  --teal: #087f74;
  --muted: #929b96;
  --line: #e8ece7;
  --panel: #fff;
}
* {
  box-sizing: border-box;
}
body {
  margin: 0;
}
button,
input,
textarea,
select {
  font: inherit;
}
button,
a,
input,
select,
textarea {
  -webkit-tap-highlight-color: transparent;
}
button {
  cursor: pointer;
}
button:disabled {
  cursor: default;
}
button,
a {
  touch-action: manipulation;
}
button {
  transition:
    background 0.16s,
    color 0.16s,
    border-color 0.16s;
  white-space: nowrap;
}
button:focus-visible,
a:focus-visible,
select:focus-visible {
  outline: 3px solid #7fd0c3;
  outline-offset: 3px;
}
input:focus-visible,
textarea:focus-visible {
  outline: 2px solid #6db9a9;
  outline-offset: 2px;
}
button {
  border: 0;
  background: none;
  color: inherit;
}
a {
  color: inherit;
  text-decoration: none;
}
svg {
  flex-shrink: 0;
}
h1,
h2,
h3,
h4,
p {
  margin: 0;
}
.app-shell {
  display: flex;
  min-height: 100vh;
}
.rail {
  width: 76px;
  flex: 0 0 76px;
  background: #fff;
  border-right: 1px solid var(--line);
  display: flex;
  align-items: center;
  flex-direction: column;
  position: fixed;
  height: 100dvh;
  z-index: 30;
  padding-top: 23px;
}
.brand-mark {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  background: var(--teal);
  color: #fff;
  display: flex;
  position: relative;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 7px #087f7418;
}
.brand-mark span {
  font-family: Georgia, serif;
  font-size: 36px;
  line-height: 1;
  transform: translateY(-3px);
  font-style: italic;
}
.brand-mark i {
  height: 5px;
  width: 5px;
  border-radius: 50%;
  position: absolute;
  top: 8px;
  right: 7px;
  background: #b2d2b1;
}
.rail-group {
  margin-top: 44px;
  display: flex;
  flex-direction: column;
  gap: 17px;
}
.rail-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: 52px;
  height: 57px;
  border-radius: 10px;
  color: #939d98;
  font-size: 12px;
  font-weight: 600;
}
.rail-item:hover {
  background: #f4f7f4;
  color: var(--teal);
}
.rail-item.active {
  color: var(--teal);
  background: #eaf4ef;
}
.rail-bottom {
  margin-top: auto;
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 22px;
  padding-bottom: 23px;
}
.avatar {
  width: 31px;
  height: 31px;
  border: 3px solid #fff;
  box-shadow: 0 0 0 1px #e7e9e4;
  background: #edece3;
  color: #74796a;
  font-size: 11px;
  font-weight: 700;
  border-radius: 50%;
  display: grid;
  place-items: center;
}
.workspace {
  margin-left: 76px;
  width: calc(100% - 76px);
}
.topbar {
  height: 77px;
  border-bottom: 1px solid var(--line);
  background: #ffffffbb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 38px;
}
.wordmark {
  display: flex;
  align-items: baseline;
  gap: 5px;
  font-weight: 750;
  font-size: 22px;
  letter-spacing: -1px;
  color: #253c33;
}
.wordmark > span:first-child {
  font-size: 19px;
  color: #87978d;
  font-weight: 450;
  letter-spacing: -0.6px;
}
.beta {
  align-self: center;
  font-size: 10px;
  color: #8d998b;
  border: 1px solid #e2e9de;
  background: #f7f9f3;
  border-radius: 4px;
  margin-left: 9px;
  padding: 3px 5px;
  font-weight: 600;
  letter-spacing: 1px;
}
.top-right {
  display: flex;
  align-items: center;
  gap: 22px;
}
.local-status {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #959e98;
  font-size: 12px;
}
.local-status i,
.browser-badge > span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #7ca28a;
}
.top-divider {
  width: 1px;
  height: 17px;
  background: var(--line);
}
.quiet-button {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  color: #7c8880;
  padding: 7px 0;
}
.quiet-button:hover {
  color: var(--teal);
}
.github-link {
  color: #9aa39b;
  display: grid;
  place-items: center;
}
.github-link:hover {
  color: var(--teal);
}
main {
  max-width: 1510px;
  margin: 0 auto;
  padding: 27px 38px 0;
}
.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #a4aca5;
  font-size: 12px;
}
.breadcrumbs > span:last-child {
  color: #6d7d70;
}
.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32px 0 28px;
  gap: 15px;
}
.eyebrow {
  font-size: 10px;
  letter-spacing: 1.8px;
  color: #849485;
  font-weight: 650;
  margin-bottom: 11px;
  display: flex;
  align-items: center;
  gap: 7px;
}
.eyebrow > span {
  width: 12px;
  height: 1px;
  background: #739d7d;
}
h1 {
  font-size: 30px;
  font-weight: 600;
  letter-spacing: -1.6px;
  line-height: 1.45;
}
h1 > span {
  color: var(--teal);
}
.page-heading p {
  font-size: 13px;
  color: #8a948b;
  margin-top: 9px;
  letter-spacing: -0.1px;
}
.heading-actions {
  display: flex;
  gap: 8px;
  margin-top: 20px;
}
.secondary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid #e0e6dd;
  background: #fff;
  font-size: 12px;
  padding: 10px 13px;
  border-radius: 6px;
  color: #5b6b5f;
  min-height: 35px;
}
.secondary-button:hover {
  background: #f2f7f2;
  border-color: #afc8b8;
}
.secondary-button:disabled {
  opacity: 0.45;
}
.primary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--teal);
  color: #fff;
  border: 1px solid var(--teal);
  border-radius: 6px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 550;
  box-shadow: 0 3px 5px #087f7415;
}
.primary-button:hover {
  background: #066b61;
}
.primary-button:disabled {
  opacity: 0.6;
}
.button-arrow {
  margin-left: 12px;
  color: #b9d7c8;
}
.problem-tabs {
  display: flex;
  align-items: center;
  gap: 20px;
  border-bottom: 1px solid #dfe6dd;
  margin-bottom: 24px;
  min-height: 47px;
}
.problem-tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: 7px;
  color: #9da79d;
  font-size: 13px;
  padding: 13px 0 15px;
}
.problem-tab > span {
  font-size: 10px;
  letter-spacing: 0.2px;
  background: #eef0eb;
  color: #9ba297;
  border-radius: 3px;
  padding: 2px 4px;
  line-height: 1.3;
}
.problem-tab.selected {
  color: var(--teal);
  font-weight: 600;
}
.problem-tab.selected:after {
  content: '';
  height: 2px;
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  background: var(--teal);
}
.problem-tab.selected > span {
  background: #e6f1e9;
  color: #388275;
}
.problem-tab:disabled {
  opacity: 0.7;
}
.browser-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  font-size: 11px;
  color: #9aa395;
  padding-bottom: 3px;
  white-space: nowrap;
}
.studio-grid {
  display: grid;
  grid-template-columns: minmax(330px, 0.76fr) minmax(0, 1.24fr);
  gap: 22px;
  align-items: start;
}
.model-column,
.results-column {
  display: flex;
  flex-direction: column;
  gap: 15px;
  min-width: 0;
}
.panel {
  background: var(--panel);
  border: 1px solid #e1e7dd;
  border-radius: 11px;
  box-shadow: 0 3px 8px #34482d02;
}
.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 21px;
}
.section-label {
  display: flex;
  align-items: center;
  gap: 8px;
}
.step-number {
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 11px;
  color: #83927e;
  border: 1px solid #e3eadf;
  background: #fafbf7;
  width: 22px;
  height: 21px;
  display: grid;
  place-items: center;
  border-radius: 5px;
}
h2 {
  font-size: 13px;
  font-weight: 650;
  letter-spacing: -0.4px;
}
.model-panel {
  padding: 21px 21px 0;
}
.text-button {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #839180;
  font-size: 11px;
  padding: 3px 0;
}
.text-button:hover {
  color: var(--teal);
}
.text-button:disabled {
  opacity: 0.4;
}
.examples-wrap {
  position: relative;
}
.examples-menu {
  position: absolute;
  right: 0;
  top: 29px;
  z-index: 35;
  width: min(340px, calc(100vw - 48px));
  max-height: min(520px, 65dvh);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 9px;
  background: #fff;
  border: 1px solid var(--line);
  box-shadow: 0 12px 40px #1e392b1a;
  border-radius: 10px;
}
.menu-label {
  font-size: 11px;
  color: #a0a89b;
  display: block;
  padding: 7px 8px 10px;
}
.examples-menu > button {
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  width: 100%;
  padding: 11px 8px;
  border-radius: 6px;
}
.examples-menu > button:hover {
  background: #f0f6ef;
}
.example-icon {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid #e1eadd;
  border-radius: 7px;
  background: #f6f9f3;
  color: #4b8c73;
}
.examples-menu b {
  font-size: 13px;
  font-weight: 550;
}
.examples-menu small {
  font-size: 11px;
  color: #96a08f;
  display: block;
  margin-top: 4px;
}
.examples-menu > button > svg {
  margin-left: auto;
  color: #a5ad9e;
}
.model-title {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.model-title input {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.6px;
  border: 0;
  background: transparent;
  color: #314030;
  padding: 0;
  min-width: 100px;
  width: 100%;
  text-overflow: ellipsis;
}
.model-tag {
  font-size: 9px;
  letter-spacing: 0.7px;
  color: #759873;
  border: 1px solid #e0e9d9;
  background: #f6f9ef;
  padding: 3px 5px;
  border-radius: 3px;
  display: none;
}
.model-description {
  font-size: 12px;
  color: #929d8d;
  margin: 9px 0 23px;
  line-height: 1.7;
  word-break: keep-all;
}
.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #85917f;
  font-size: 10px;
  margin-bottom: 10px;
}
.editor-toolbar > span:first-child {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #657a64;
  font-size: 11px;
}
.equation-editor {
  background: #f6f8f3;
  display: flex;
  border: 1px solid #e9ede3;
  border-radius: 6px;
  min-height: 160px;
  padding: 17px 0;
  overflow: hidden;
}
.line-numbers {
  overflow: hidden;
  flex-shrink: 0;
  padding: 0 12px 24px 13px;
  display: flex;
  flex-direction: column;
  font-size: 12px;
  line-height: 28px;
  color: #bdc7b2;
  user-select: none;
  text-align: right;
}
.equation-editor textarea {
  resize: none;
  min-height: 140px;
  max-height: 420px;
  display: block;
  margin: 0;
  line-height: 28px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
  font-size: 13px;
  border: 0;
  padding: 0 12px 0 2px;
  width: 100%;
  color: #226d5b;
  background: transparent;
  outline: none;
  white-space: pre;
  tab-size: 2;
  overflow: auto;
}
.equation-editor:focus-within {
  border-color: #b3d0b8;
  box-shadow: 0 0 0 2px #4b9e7511;
}
.equation-editor textarea:focus-visible {
  outline: 0;
}
.editor-error {
  border-color: #eab9aa;
}
.editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 11px 0 19px;
  gap: 8px;
}
.editor-footer > span {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  color: #92a083;
}
.status-dot {
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #75a17c;
  flex-shrink: 0;
}
.error-dot {
  background: #c4755a;
}
.syntax-button {
  font-size: 10px;
}
.model-run-row {
  border-top: 1px solid #ecf0e6;
  margin: 0 -21px;
  padding: 14px 21px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.model-run-row > span {
  font-size: 10px;
  color: #a1aa98;
  display: flex;
  align-items: center;
  gap: 4px;
}
.keycap {
  font-size: 11px;
  display: inline-grid;
  place-items: center;
  border: 1px solid #e9ede3;
  border-radius: 3px;
  width: 17px;
  height: 17px;
  background: #f9faf6;
}
.parameter-panel {
  padding: 20px 21px 17px;
}
.parameter-panel .panel-heading {
  margin-bottom: 10px;
}
.count-badge {
  font-size: 10px;
  display: grid;
  place-items: center;
  background: #f0f4ea;
  color: #9aa78e;
  width: 16px;
  height: 16px;
  border-radius: 4px;
}
.icon-button {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  color: #99a38e;
  border-radius: 4px;
  padding: 0;
}
.icon-button:hover,
.icon-button.is-selected {
  background: #edf4e8;
  color: var(--teal);
}
.section-description {
  font-size: 11px;
  color: #98a28e;
  margin-bottom: 20px;
}
.parameter-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.parameter-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  gap: 8px;
}
.parameter-top > div:first-child {
  display: flex;
  align-items: center;
  gap: 9px;
}
.parameter-name {
  font-family: Consolas, monospace;
  font-size: 13px;
  color: #476a50;
  font-weight: 600;
}
.parameter-role {
  font-size: 10px;
  color: #a0aa92;
}
.parameter-input-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
}
.parameter-input-wrap > input {
  border: 1px solid #e3e9db;
  background: #fafbf7;
  border-radius: 4px;
  width: 64px;
  padding: 4px 4px;
  text-align: center;
  font-family: Consolas, monospace;
  font-size: 12px;
  color: #5d7754;
  height: 25px;
  appearance: textfield;
}
.parameter-input-wrap > input::-webkit-inner-spin-button {
  appearance: none;
}
.delete-param {
  padding: 3px;
  color: #bb8e73;
  display: flex;
}
.parameter-slider {
  width: 100%;
  height: 4px;
  appearance: none;
  -webkit-appearance: none;
  background: linear-gradient(
    to right,
    #6a9d86 var(--range-fill),
    #e8eee1 var(--range-fill)
  );
  border-radius: 9px;
  cursor: pointer;
  display: block;
  margin: 11px 0 9px;
}
.parameter-slider::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  background: white;
  border: 2px solid #6b9d84;
  border-radius: 50%;
  box-shadow: 0 1px 2px #1d552720;
}
.parameter-slider::-moz-range-thumb {
  width: 9px;
  height: 9px;
  background: #fff;
  border: 2px solid #6b9d84;
  border-radius: 50%;
}
.parameter-slider:focus-visible {
  outline: 2px solid #98cbb4;
  outline-offset: 5px;
}
.range-labels {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #a3ae97;
  font-size: 10px;
  font-family: Consolas, monospace;
}
.range-labels > span:nth-child(2):not(:last-child) {
  font-family: inherit;
  font-size: 9px;
  color: #b0b7a4;
}
.add-parameter {
  margin-top: 22px;
  width: 100%;
  height: 32px;
  border: 1px dashed #dce6d4;
  border-radius: 5px;
  color: #839978;
  display: flex;
  gap: 5px;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}
.add-parameter:hover {
  background: #f4f8ef;
  border-color: #a3bf92;
}
.live-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 9.5px;
  color: #a1ad91;
  margin-top: 13px;
}
.live-dot {
  width: 4px;
  height: 4px;
  background: #92ad70;
  border-radius: 50%;
}
.range-editor {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 10px;
  background: #f7f9f3;
  border-radius: 5px;
  align-items: flex-end;
}
.range-editor label {
  flex: 1;
  min-width: 50px;
  font-size: 10px;
  color: #8a9b7d;
}
.range-editor input {
  display: block;
  width: 100%;
  min-width: 0;
  border: 1px solid #dfe6d7;
  background: #fff;
  border-radius: 4px;
  padding: 5px;
  font-size: 12px;
  margin-top: 5px;
}
.range-editor button {
  display: grid;
  place-items: center;
  background: #e6efdf;
  border-radius: 4px;
  padding: 6px;
  color: var(--teal);
}
.range-editor > span {
  color: #b55d45;
  font-size: 11px;
  width: 100%;
}
.no-parameters {
  padding: 8px 0 12px;
  text-align: center;
  color: #90a080;
  font-size: 12px;
  line-height: 1.9;
}
.no-parameters svg {
  margin-bottom: 8px;
  color: #a5b89b;
}
.tip-card {
  display: flex;
  gap: 11px;
  align-items: center;
  background: #f0f3e9;
  border: 1px solid #e5ebdc;
  border-radius: 8px;
  padding: 15px;
}
.tip-icon {
  align-self: flex-start;
  margin-top: 1px;
  color: #8d9d6e;
}
.tip-card b {
  font-size: 12px;
  font-weight: 500;
  color: #748461;
  display: block;
  margin-bottom: 5px;
}
.tip-card p > span {
  font-size: 10px;
  line-height: 1.8;
  color: #98a386;
  display: block;
  word-break: keep-all;
}
.tip-card > svg {
  margin-left: auto;
  color: #a0ae8c;
}
.results-panel {
  overflow: hidden;
}
.results-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 22px 19px;
}
.results-heading-right {
  display: flex;
  gap: 9px;
  align-items: center;
}
.engine-status {
  font-size: 10px;
  font-family: Consolas, monospace;
  display: flex;
  align-items: center;
  gap: 5px;
  color: #72967d;
  transition: opacity 0.2s;
}
.engine-status.has-error {
  color: #bf735d;
}
.result-mode-tabs {
  display: flex;
  align-items: center;
  gap: 24px;
  margin: 0 22px;
  border-bottom: 1px solid #e8ede3;
}
.result-mode-tabs > button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 0 14px;
  font-size: 12px;
  color: #939f8a;
  position: relative;
}
.result-mode-tabs > button.active {
  color: var(--teal);
  font-weight: 550;
}
.result-mode-tabs > button.active:after {
  content: '';
  position: absolute;
  height: 2px;
  background: var(--teal);
  bottom: -1px;
  left: 0;
  right: 0;
}
.new-badge {
  font-size: 8px;
  letter-spacing: 0.8px;
  background: #ecf5e7;
  color: #6b945d;
  padding: 3px 4px;
  border-radius: 3px;
  margin-left: 3px;
}
.solution-summary {
  padding: 21px 22px 18px;
}
.summary-label {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #96a48a;
  font-size: 11px;
}
.found-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: #f0f7e8;
  color: #72935b;
  font-size: 10px;
  padding: 4px 6px;
  border-radius: 4px;
}
.solution-cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}
.solution-cards.many-values {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.solution-value {
  background: #f6f9f3;
  border: 1px solid #e7eddf;
  border-radius: 7px;
  position: relative;
  padding: 14px 16px 12px;
  min-width: 0;
}
.solution-value:nth-child(2) {
  background: #fcf9f3;
  border-color: #f0e8db;
}
.solution-value:nth-child(3n) {
  background: #f7f8fb;
  border-color: #e5e9f3;
}
.solution-value > div {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-family: Consolas, monospace;
  color: #66886b;
}
.solution-value > div > i {
  height: 5px;
  width: 5px;
  border-radius: 50%;
}
.solution-value:nth-child(2) > div {
  color: #ac8d67;
}
.solution-value > strong {
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-weight: 500;
  font-size: 29px;
  letter-spacing: -1px;
  color: #3c694e;
  display: block;
  line-height: 1.5;
  margin: 3px 0;
  overflow-wrap: anywhere;
}
.solution-value:nth-child(2) > strong {
  color: #a17f51;
}
.value-caption {
  font-size: 10px;
  color: #9eac94;
}
.solution-value:nth-child(2) .value-caption {
  color: #b4a48d;
}
.chart-section {
  padding: 17px 22px 19px;
  border-top: 1px solid #eef1e9;
}
.chart-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.chart-heading h3 {
  font-size: 13px;
  font-weight: 550;
  color: #4a654e;
  letter-spacing: -0.3px;
}
.chart-heading p {
  font-size: 10px;
  color: #a0ac92;
  margin-top: 6px;
}
.chart-kicker {
  font-size: 8px;
  color: #b1bca2;
  letter-spacing: 1px;
}
.chart-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 18px;
  font-size: 10px;
  color: #8b9b7f;
}
.chart-controls label {
  margin-right: 2px;
}
.select-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.select-wrap select {
  border: 1px solid #e0e8d5;
  border-radius: 4px;
  background: #fbfcf8;
  font-size: 12px;
  color: #598064;
  appearance: none;
  padding: 5px 24px 5px 9px;
  min-width: 67px;
  font-family: Consolas, monospace;
  cursor: pointer;
}
.select-wrap svg {
  position: absolute;
  right: 7px;
  pointer-events: none;
  color: #9aaa8c;
}
.sweep-domain {
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: Consolas, monospace;
  color: #a0ad92;
}
.chart-footnote {
  font-size: 9px;
  color: #a4af99;
  margin-top: 8px;
  display: flex;
  gap: 5px;
  align-items: center;
}
.chart-current-dot {
  width: 5px;
  height: 5px;
  background: #97ab86;
  border-radius: 50%;
}
.data-section {
  border-top: 1px solid #e9eee1;
  padding: 0 22px 5px;
}
.data-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 14px 0 7px;
}
.data-toolbar > .text-button {
  font-size: 10px;
  color: #9dac91;
}
.table-scroll {
  width: 100%;
  overflow-x: auto;
}
.result-table {
  width: 100%;
  text-align: left;
  border-collapse: collapse;
  font-size: 12px;
  white-space: nowrap;
}
.result-table th {
  color: #9ca98c;
  font-size: 10px;
  font-weight: 400;
  padding: 10px;
  background: #f8faf4;
  border-top: 1px solid #edf1e5;
  border-bottom: 1px solid #e9efdf;
}
.result-table th:last-child,
.result-table td:last-child {
  text-align: right;
}
.result-table th:nth-child(2),
.result-table td:nth-child(2) {
  text-align: right;
}
.result-table td {
  padding: 12px 10px;
  border-bottom: 1px solid #eff3e8;
  font-family: Consolas, monospace;
  color: #6f8463;
}
.result-table tr:last-child td {
  border-bottom: 0;
}
.result-table td:first-child {
  color: #597b58;
}
.result-table td:last-child {
  color: #94a385;
  font-size: 11px;
}
.table-color {
  width: 5px;
  height: 5px;
  display: inline-block;
  border-radius: 50%;
  margin-right: 8px;
  vertical-align: 2px;
}
.result-table tr.highlighted td {
  background: #f0f7e9;
}
.result-footer {
  padding: 12px 22px;
  border-top: 1px solid #e9eee1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fcfdf9;
  color: #a1ae94;
  font-size: 9px;
}
.result-footer > span:first-child {
  display: flex;
  align-items: center;
  gap: 6px;
}
.result-footer i {
  font-style: normal;
  color: #c8d0be;
}
.result-footer > span:last-child {
  font-family: Consolas, monospace;
}
.insight-card {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 18px 19px;
  border: 1px solid #dce8dc;
  border-radius: 8px;
  background: linear-gradient(115deg, #eaf2e8, #f3f7f0);
  min-height: 78px;
}
.insight-icon {
  width: 32px;
  height: 32px;
  background: #e1ecdf;
  border: 1px solid #d5e5d1;
  color: #7e9d73;
  border-radius: 8px;
  display: grid;
  place-items: center;
}
.insight-card b {
  font-size: 12px;
  font-weight: 500;
  color: #65805e;
}
.insight-card p {
  font-size: 10px;
  color: #97a98b;
  line-height: 1.8;
  margin-top: 4px;
}
.insight-symbol {
  font-family: Georgia, serif;
  font-size: 37px;
  letter-spacing: -3px;
  font-style: italic;
  color: #c0d4b8;
  margin-left: auto;
  padding-right: 8px;
}
.page-footer {
  margin-top: 29px;
  border-top: 1px solid #e7ece0;
  padding: 19px 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #a5b099;
  font-size: 10px;
}
.page-footer > span:first-child {
  display: flex;
  align-items: center;
  font-weight: 550;
  color: #91a084;
}
.footer-studio {
  font-weight: 400;
  margin-left: 3px;
  color: #b1bba7;
}
.page-footer i {
  height: 8px;
  width: 1px;
  background: #dbe3d2;
  margin: 0 10px;
}
.footer-dot {
  margin: 0 7px;
}
.error-state,
.loading-state {
  min-height: 480px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  text-align: center;
  padding: 35px;
}
.error-state h3,
.loading-state h3 {
  font-size: 16px;
  font-weight: 550;
  color: #536a4f;
}
.error-state p {
  font-size: 13px;
  color: #aa705a;
  line-height: 1.9;
  max-width: 420px;
  overflow-wrap: anywhere;
}
.error-icon {
  display: grid;
  place-items: center;
  background: #fbf1e9;
  color: #c89170;
  width: 54px;
  height: 54px;
  border: 1px solid #eedfce;
  border-radius: 15px;
  margin-bottom: 7px;
}
.error-state .secondary-button {
  margin-top: 7px;
}
.loading-state {
  color: #7ba178;
}
.loading-state p {
  font-size: 12px;
  color: #a0ad94;
}
.empty-chart {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  min-height: 285px;
  color: #9eaf8d;
}
.empty-chart h4 {
  font-size: 13px;
  margin: 13px 0 7px;
  font-weight: 500;
  color: #79946e;
}
.empty-chart p {
  font-size: 12px;
  line-height: 1.9;
  text-align: center;
  color: #a2b193;
}
.empty-chart .text-button {
  margin-top: 15px;
  color: var(--teal);
}
.warning-box {
  margin: 0 22px 15px;
  border: 1px solid #eedbb5;
  padding: 10px 12px;
  background: #fffaf0;
  font-size: 12px;
  color: #9d7c35;
  line-height: 1.8;
  border-radius: 5px;
}
.report-content {
  padding: 21px 22px;
}
.report-title {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-bottom: 22px;
}
.report-title > div:nth-child(2) {
  min-width: 0;
}
.report-document-icon {
  width: 38px;
  height: 44px;
  display: grid;
  place-items: center;
  background: #f2f7ec;
  border: 1px solid #e1ead8;
  border-radius: 5px;
  color: #76966a;
}
.report-title span {
  font-size: 8px;
  letter-spacing: 1.7px;
  color: #9dab8d;
}
.report-title h3 {
  font-size: 14px;
  font-weight: 550;
  margin-top: 5px;
  overflow-wrap: anywhere;
}
.report-title button {
  margin-left: auto;
  font-size: 11px;
  flex-shrink: 0;
}
.report-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 29px;
}
.report-metrics > div {
  padding: 13px 10px;
  background: #f8faf4;
  border: 1px solid #e8eedf;
  border-radius: 5px;
  min-width: 0;
}
.report-metrics span {
  font-size: 10px;
  color: #94a385;
}
.report-metrics strong {
  font-size: 15px;
  display: block;
  font-family: Consolas, monospace;
  font-weight: 500;
  color: #68875e;
  margin-top: 8px;
  overflow-wrap: anywhere;
}
.report-metrics small {
  font-size: 11px;
  color: #a2ad96;
}
.report-content h4 {
  font-size: 12px;
  font-weight: 550;
  color: #6e8862;
  margin: 19px 0 12px;
}
.report-content pre {
  font-family: Consolas, monospace;
  font-size: 13px;
  line-height: 2;
  background: #f7f9f3;
  border: 1px solid #e9efdf;
  padding: 14px;
  border-radius: 5px;
  color: #6c8c60;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.report-param-list {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
}
.report-param-list > span {
  border: 1px solid #e3eada;
  border-radius: 4px;
  padding: 6px 9px;
  background: #fbfcf8;
  font-family: Consolas, monospace;
  font-size: 12px;
  color: #91a383;
}
.report-param-list b {
  font-weight: 500;
  color: #557c50;
  margin-left: 10px;
}
.report-param-list p {
  font-size: 12px;
  color: #97a98c;
}
.report-explanation {
  font-size: 12px;
  line-height: 1.9;
  color: #91a084;
  word-break: keep-all;
}
.matrix-view {
  padding: 16px 0 14px;
  overflow-x: auto;
}
.matrix-caption {
  font-size: 12px;
  color: #7d946d;
  font-family: Consolas, monospace;
  display: flex;
  align-items: center;
  gap: 12px;
  white-space: nowrap;
}
.matrix-caption span {
  font-size: 10px;
  font-family: inherit;
  color: #a7b19a;
}
.matrix-equation {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 17px 0 0;
  color: #a4b194;
  min-width: max-content;
  font-family: Consolas, monospace;
}
.matrix-bracket {
  padding: 3px 7px;
  position: relative;
  max-height: 220px;
  overflow: auto;
  border-left: 1.5px solid #b6c7a8;
  border-right: 1.5px solid #b6c7a8;
  border-radius: 2px;
}
.matrix-bracket td {
  text-align: center;
  font-size: 12px;
  padding: 5px 9px;
  color: #7d926c;
}
.matrix-bracket .matrix-variable {
  font-style: italic;
  color: var(--teal);
}
.residual-list {
  border-top: 1px solid #e7eddf;
  margin-top: 8px;
}
.residual-list > div {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 2px;
  border-bottom: 1px solid #edf1e7;
  font-size: 11px;
  color: #95a687;
}
.residual-list code {
  margin-left: auto;
  color: #809a71;
}
.residual-list svg {
  color: #93b680;
}
.results-expanded {
  grid-template-columns: 1fr;
}
.results-expanded .model-column {
  display: none;
}
.results-expanded .results-column {
  max-width: none;
  width: 100%;
  margin: auto;
}
.results-expanded .solution-chart {
  max-width: none;
  margin-inline: 0;
}
.toast {
  position: fixed;
  bottom: 26px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  background: #284b3b;
  color: #e4efdf;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #52795c;
  box-shadow: 0 8px 35px #213c2d24;
  padding: 13px 16px;
  border-radius: 8px;
  font-size: 13px;
  max-width: calc(100vw - 32px);
}
.toast > svg {
  color: #b0cc9b;
}
.toast button {
  display: grid;
  place-items: center;
  color: #a4bea0;
  padding: 2px;
  margin-left: 10px;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: #1c35275c;
  backdrop-filter: blur(4px);
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.parameter-modal {
  background: #fcfdf8;
  border: 1px solid #dce7d6;
  width: 440px;
  max-width: 100%;
  padding: 34px;
  border-radius: 15px;
  box-shadow: 0 24px 100px #1c35272b;
  position: relative;
}
.modal-close {
  position: absolute;
  top: 15px;
  right: 15px;
}
.modal-eyebrow {
  font-size: 9px;
  letter-spacing: 1.5px;
  color: #8ca17b;
}
.parameter-modal h2 {
  font-size: 23px;
  letter-spacing: -1px;
  margin: 13px 0;
  color: #376c4c;
}
.parameter-modal > p {
  font-size: 12px;
  line-height: 1.9;
  color: #92a182;
}
.parameter-modal form > label {
  display: block;
  font-size: 12px;
  color: #748e62;
  margin-top: 21px;
}
.parameter-modal form > label > input {
  display: block;
  margin-top: 7px;
  padding: 10px;
  border: 1px solid #dce7d1;
  background: #fff;
  width: 100%;
  border-radius: 5px;
  font-size: 13px;
  color: #3c6e4d;
}
.parameter-modal input::placeholder {
  color: #b0bda5;
  font-size: 13px;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 27px;
}
.form-error {
  color: #bc7457;
  font-size: 12px;
  margin-top: 12px;
}
.spin {
  animation: spin 1.2s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@media (min-width: 1550px) {
  main {
    padding-top: 32px;
  }
  .page-heading {
    padding-top: 36px;
    padding-bottom: 34px;
  }
  .studio-grid {
    grid-template-columns: minmax(390px, 0.76fr) minmax(0, 1.24fr);
  }
  .equation-editor {
    min-height: 185px;
  }
  .equation-editor textarea {
    min-height: 147px;
  }
  .parameter-list {
    gap: 21px;
  }
  .model-title input {
    font-size: 18px;
  }
  .model-description {
    font-size: 13px;
  }
  .solution-value > strong {
    font-size: 35px;
  }
  .solution-value {
    padding: 18px;
  }
  .solution-summary {
    padding-bottom: 24px;
  }
  .chart-section {
    padding-top: 23px;
  }
  .results-heading {
    padding-top: 22px;
  }
  .chart-heading h3 {
    font-size: 13px;
  }
  .parameter-panel {
    padding-top: 23px;
    padding-bottom: 22px;
  }
}
@media (max-width: 1190px) {
  main {
    padding-left: 25px;
    padding-right: 25px;
  }
  .topbar {
    padding: 0 25px;
  }
  .studio-grid {
    gap: 16px;
    grid-template-columns: minmax(300px, 0.8fr) minmax(0, 1.2fr);
  }
  .problem-tabs {
    gap: 17px;
  }
  .browser-badge {
    display: none;
  }
  .chart-kicker {
    display: none;
  }
  .solution-value > strong {
    font-size: 25px;
  }
  .model-panel {
    padding: 18px 17px 0;
  }
  .parameter-panel {
    padding: 18px 17px;
  }
  .model-run-row {
    margin: 0 -17px;
    padding: 13px 17px;
  }
  .result-mode-tabs {
    gap: 17px;
  }
  .result-mode-tabs > button {
    font-size: 11px;
  }
  .new-badge {
    font-size: 5px;
  }
  .results-heading {
    padding: 18px;
  }
  .chart-section,
  .solution-summary,
  .report-content {
    padding-left: 18px;
    padding-right: 18px;
  }
  .result-mode-tabs {
    margin-inline: 18px;
  }
  .data-section {
    padding-inline: 18px;
  }
  .insight-symbol {
    display: none;
  }
  .page-heading h1 {
    font-size: 27px;
  }
  .page-heading p {
    font-size: 12px;
  }
  .heading-actions .secondary-button {
    padding: 9px;
    font-size: 11px;
  }
  .local-status {
    font-size: 11px;
  }
  .solution-cards {
    gap: 9px;
  }
}
@media (max-width: 960px) {
  .rail {
    width: 62px;
    flex-basis: 62px;
  }
  .workspace {
    margin-left: 62px;
    width: calc(100% - 62px);
  }
  main {
    padding: 23px 22px 0;
  }
  .topbar {
    padding: 0 22px;
    height: 68px;
  }
  .brand-mark {
    width: 32px;
    height: 32px;
  }
  .rail {
    padding-top: 18px;
  }
  .rail-item {
    width: 44px;
  }
  .wordmark {
    font-size: 20px;
  }
  .wordmark > span:first-child {
    font-size: 17px;
  }
  .beta {
    font-size: 8px;
  }
  .top-right {
    gap: 14px;
  }
  .top-right .local-status {
    display: none;
  }
  .top-divider {
    display: none;
  }
  .studio-grid {
    grid-template-columns: minmax(270px, 0.85fr) minmax(0, 1.15fr);
    gap: 12px;
  }
  .model-description {
    font-size: 11px;
  }
  .model-title input {
    font-size: 14px;
  }
  .line-numbers {
    overflow: hidden;
    flex-shrink: 0;
    padding-left: 9px;
    padding-right: 8px;
  }
  .equation-editor textarea {
    font-size: 12px;
  }
  .section-description {
    font-size: 10px;
  }
  .panel-heading {
    margin-bottom: 17px;
  }
  .model-panel {
    padding-inline: 14px;
  }
  .model-run-row {
    margin-inline: -14px;
    padding-inline: 14px;
  }
  .model-run-row > span {
    font-size: 9px;
  }
  .model-run-row .primary-button {
    font-size: 12px;
    padding: 9px 11px;
  }
  .button-arrow {
    margin-left: 3px;
  }
  .parameter-panel {
    padding-inline: 14px;
  }
  .result-mode-tabs > button {
    font-size: 10px;
    gap: 4px;
  }
  .result-mode-tabs {
    gap: 14px;
    margin-inline: 15px;
  }
  .new-badge {
    display: none;
  }
  .results-heading {
    padding-inline: 15px;
  }
  .solution-summary {
    padding: 16px 15px;
  }
  .solution-value {
    padding: 11px;
  }
  .solution-value > strong {
    font-size: 23px;
  }
  .chart-section {
    padding-inline: 15px;
  }
  .data-section {
    padding-inline: 15px;
  }
  .engine-status {
    font-size: 9px;
  }
  .page-heading h1 {
    font-size: 25px;
  }
  .page-heading p {
    font-size: 11px;
  }
  .heading-actions .import-button {
    display: none;
  }
  .eyebrow {
    font-size: 9px;
  }
  .result-footer {
    padding-inline: 15px;
    font-size: 8px;
  }
  .result-table th,
  .result-table td {
    padding-inline: 6px;
  }
  .chart-footnote {
    font-size: 8px;
  }
  .tip-card {
    padding: 12px;
    gap: 8px;
  }
  .tip-card b {
    font-size: 11px;
  }
  .tip-card p > span {
    font-size: 9px;
  }
  .insight-card {
    padding: 14px;
    gap: 9px;
  }
  .insight-card b {
    font-size: 11px;
  }
  .insight-card p {
    font-size: 9px;
  }
  .insight-icon {
    width: 27px;
    height: 27px;
  }
  .problem-tab {
    font-size: 12px;
    gap: 5px;
  }
  .problem-tabs {
    gap: 20px;
  }
  .problem-tab > svg {
    width: 13px;
  }
  .problem-tab > span {
    font-size: 8px;
  }
  .page-footer > span:last-child {
    font-size: 9px;
  }
  .parameter-role {
    font-size: 9px;
  }
  .live-note {
    font-size: 8.5px;
  }
  .chart-heading p {
    font-size: 9px;
  }
  .report-title {
    flex-wrap: wrap;
  }
  .report-title button {
    font-size: 10px;
    padding: 8px;
  }
  .report-title h3 {
    font-size: 13px;
  }
  .report-metrics {
    gap: 5px;
  }
  .report-metrics > div {
    padding: 10px 7px;
  }
  .report-metrics strong {
    font-size: 13px;
  }
  .report-metrics span {
    font-size: 9px;
  }
}
@media (max-width: 760px) {
  .rail {
    width: 54px;
    flex-basis: 54px;
  }
  .workspace {
    margin-left: 54px;
    width: calc(100% - 54px);
  }
  .rail-item {
    width: 40px;
    font-size: 10px;
  }
  .rail-item svg {
    width: 18px;
  }
  .rail-group {
    margin-top: 30px;
  }
  .rail-bottom {
    gap: 15px;
  }
  .avatar {
    width: 27px;
    height: 27px;
    font-size: 10px;
  }
  .brand-mark {
    width: 29px;
    height: 29px;
    border-radius: 9px;
  }
  .brand-mark span {
    font-size: 30px;
  }
  .brand-mark i {
    width: 4px;
    height: 4px;
    right: 5px;
    top: 6px;
  }
  .topbar {
    height: 64px;
    padding: 0 17px;
  }
  .top-right .quiet-button {
    padding: 4px;
  }
  .top-right .quiet-button > span {
    display: none;
  }
  .top-right .github-link {
    display: none;
  }
  .wordmark {
    font-size: 19px;
  }
  .wordmark > span:first-child {
    font-size: 15px;
  }
  .beta {
    margin-left: 4px;
    font-size: 5px;
    padding: 3px;
  }
  .top-right {
    gap: 5px;
  }
  main {
    padding: 20px 16px 0;
  }
  .breadcrumbs {
    font-size: 10px;
    gap: 5px;
  }
  .page-heading {
    padding: 24px 0;
    align-items: flex-start;
    position: relative;
    display: block;
  }
  .page-heading h1 {
    font-size: 25px;
  }
  .page-heading p {
    font-size: 11px;
    max-width: 240px;
    line-height: 1.8;
  }
  .eyebrow {
    font-size: 8px;
    letter-spacing: 1.4px;
  }
  .heading-actions {
    margin-top: 16px;
    gap: 7px;
  }
  .heading-actions .import-button {
    display: inline-flex;
  }
  .heading-actions .secondary-button {
    font-size: 10px;
    min-height: 30px;
    padding: 7px 9px;
  }
  .heading-actions svg {
    width: 13px;
  }
  .problem-tabs {
    gap: 16px;
    overflow: auto;
    margin-bottom: 17px;
    min-height: 43px;
  }
  .problem-tab {
    font-size: 11px;
    gap: 5px;
    flex-shrink: 0;
    padding: 11px 0 13px;
  }
  .problem-tab > span {
    font-size: 8px;
  }
  .problem-tab > svg {
    display: none;
  }
  .studio-grid {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .model-column,
  .results-column {
    width: 100%;
    gap: 12px;
  }
  .model-panel {
    padding: 19px 18px 0;
  }
  .panel-heading {
    margin-bottom: 20px;
  }
  .model-title input {
    font-size: 17px;
  }
  .model-description {
    font-size: 12px;
    margin-bottom: 20px;
  }
  .equation-editor textarea {
    font-size: 13px;
    min-height: 123px;
  }
  .line-numbers {
    overflow: hidden;
    flex-shrink: 0;
    padding-inline: 11px;
  }
  .editor-toolbar {
    font-size: 9px;
  }
  .editor-toolbar > span:first-child {
    font-size: 11px;
  }
  .editor-footer {
    font-size: 10px;
  }
  .model-run-row {
    margin-inline: -18px;
    padding: 13px 18px;
  }
  .model-run-row > span {
    font-size: 10px;
  }
  .model-run-row .primary-button {
    font-size: 13px;
    padding: 10px 16px;
  }
  .button-arrow {
    margin-left: 10px;
  }
  .parameter-panel {
    padding: 19px 18px;
  }
  .parameter-panel .section-description {
    font-size: 11px;
  }
  .parameter-list {
    gap: 19px;
  }
  .parameter-top {
    margin-bottom: 8px;
  }
  .parameter-input-wrap > input {
    width: 67px;
  }
  .parameter-slider {
    height: 5px;
  }
  .range-labels {
    font-size: 11px;
  }
  .parameter-role {
    font-size: 10px;
  }
  .live-note {
    font-size: 10px;
  }
  .tip-card {
    display: none;
  }
  .results-heading {
    padding: 19px 18px;
  }
  .result-mode-tabs {
    margin-inline: 18px;
    gap: 21px;
  }
  .result-mode-tabs > button {
    font-size: 11px;
  }
  .new-badge {
    display: inline-block;
  }
  .engine-status {
    font-size: 10px;
  }
  .solution-summary {
    padding: 19px 18px;
  }
  .solution-value {
    padding: 14px;
  }
  .solution-value > strong {
    font-size: 27px;
  }
  .solution-cards {
    gap: 11px;
  }
  .chart-section {
    padding: 19px 14px 18px;
  }
  .chart-heading h3 {
    font-size: 13px;
  }
  .chart-heading p {
    font-size: 10px;
  }
  .chart-controls {
    margin-top: 17px;
  }
  .chart-footnote {
    font-size: 8.5px;
    line-height: 1.8;
  }
  .data-section {
    padding-inline: 16px;
  }
  .data-toolbar {
    margin-top: 12px;
  }
  .result-table th {
    font-size: 9px;
  }
  .result-table td {
    font-size: 12px;
    padding-block: 12px;
  }
  .result-footer {
    padding: 11px 16px;
    font-size: 8.5px;
  }
  .insight-card {
    padding: 16px 14px;
  }
  .insight-card b {
    font-size: 12px;
  }
  .insight-card p {
    font-size: 10px;
  }
  .page-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 19px 0;
    margin-top: 24px;
  }
  .page-footer > span:last-child {
    font-size: 9px;
  }
  .toast {
    font-size: 12px;
    width: max-content;
    bottom: 15px;
    padding: 12px;
  }
  .parameter-modal {
    padding: 29px 24px;
  }
  .modal-backdrop {
    padding: 15px;
  }
  .report-content {
    padding: 20px 18px;
  }
  .report-metrics strong {
    font-size: 13px;
  }
  .report-title button {
    font-size: 10px;
  }
  .matrix-equation {
    gap: 12px;
  }
  .report-metrics > div {
    padding: 12px 8px;
  }
  .report-metrics span {
    font-size: 9px;
  }
  .results-expanded .model-column {
    display: none;
  }
  .empty-chart {
    min-height: 250px;
  }
  .error-state {
    padding: 27px;
    min-height: 350px;
  }
  .error-state h3 {
    font-size: 14px;
  }
  .error-state p {
    font-size: 12px;
  }
  .chart-controls select {
    font-size: 12px;
  }
  .chart-section .solution-chart {
    margin-inline: -3px;
  }
}
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation: none !important;
    transition: none !important;
    scroll-behavior: auto !important;
  }
}
@media print {
  .rail,
  .topbar,
  .page-heading,
  .breadcrumbs,
  .problem-tabs,
  .model-column,
  .result-mode-tabs,
  .results-heading-right,
  .report-title button,
  .page-footer,
  .toast,
  .insight-card {
    display: none !important;
  }
  .workspace {
    margin: 0;
    width: 100%;
  }
  main {
    padding: 0;
  }
  .studio-grid {
    display: block;
  }
  .panel {
    border: 0;
    box-shadow: none;
  }
  .report-content {
    padding: 0;
  }
  .results-heading {
    padding-left: 0;
  }
  .solution-summary {
    padding-left: 0;
  }
  .results-column {
    display: block;
  }
  .result-footer {
    display: none;
  }
}

@media (max-width: 760px) {
  .result-mode-tabs {
    gap: 15px;
  }
  .result-mode-tabs > button {
    font-size: 10px;
  }
  .new-badge {
    display: none;
  }
  .live-note {
    font-size: 9px;
  }
  .problem-tabs {
    gap: 16px;
  }
  .problem-tab {
    font-size: 10px;
  }
  .problem-tab > span {
    font-size: 7px;
  }
  .problem-tab > svg {
    display: none;
  }
}
.sweep-table-caption {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 9px;
  color: #8e9e84;
  margin: 4px 0 10px;
  line-height: 1.6;
}
.sweep-table-caption > span:last-child {
  color: #a2ae98;
}
.sweep-table-scroll {
  max-height: 185px;
  position: relative;
  scrollbar-width: thin;
  scrollbar-color: #cad8bf #f7faf3;
}
.sweep-table thead {
  position: sticky;
  top: 0;
  z-index: 2;
}
.sweep-table th {
  background: #f5f8f0;
}
.sweep-table th:not(:first-child),
.sweep-table td:not(:first-child) {
  text-align: right;
}
.sweep-table td:last-child {
  color: #6f8463;
  font-size: 11px;
}
.sweep-table tr {
  outline-offset: -2px;
  cursor: crosshair;
}
.sweep-table tr:focus-visible {
  outline: 2px solid #a4c7a3;
}
.sweep-table tr.highlighted td {
  background: #eaf3e4;
  color: #407048;
}
.physical-warning {
  border-color: #ecd6b8;
  background: #fffbf2;
  color: #a18558;
}
.is-computing .solution-cards,
.is-computing .chart-section .solution-chart,
.is-computing .data-section table {
  opacity: 0.55;
  transition: opacity 0.15s;
}
.is-computing .data-section table {
  pointer-events: none;
}
@media (max-width: 760px) {
  .sweep-table-caption {
    font-size: 8px;
  }
  .sweep-table-caption > span:last-child {
    display: none;
  }
  .sweep-table td:last-child {
    font-size: 11px;
  }
  .chart-footnote {
    font-size: 8px;
  }
  .result-footer {
    font-size: 8px;
  }
  .result-footer > span:last-child {
    font-size: 7px;
  }
  .engine-status {
    font-size: 9px;
  }
}

.data-section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 550;
  color: #537955;
  padding: 5px 0;
}
.sweep-table-caption b {
  font-weight: 500;
  color: #64835a;
  font-variant-numeric: tabular-nums;
}
.dataset-endpoint-note {
  font-size: 9px;
  line-height: 1.7;
  color: #8b977b;
  margin: 0 0 9px;
}
.dataset-error {
  border: 1px solid #ebd9b9;
  background: #fffaf1;
  border-radius: 6px;
  padding: 13px 14px;
  margin: 8px 0 15px;
  font-size: 11px;
  line-height: 1.9;
  color: #9a7942;
}
.dataset-error span {
  display: block;
  margin-top: 5px;
  color: #9e977f;
  font-size: 10px;
}
.matrix-details {
  border: 1px solid #e2eadb;
  border-radius: 6px;
  margin-top: 17px;
  background: #fbfcf8;
  padding: 0 12px;
}
.matrix-details summary {
  display: flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  color: #6b845f;
  font-size: 11px;
  padding: 13px 0;
  list-style: none;
}
.matrix-details summary::-webkit-details-marker {
  display: none;
}
.matrix-details summary svg:last-child {
  margin-left: auto;
  transition: transform 0.15s;
}
.matrix-details[open] summary svg:last-child {
  transform: rotate(180deg);
}
.matrix-details summary:focus-visible {
  outline: 2px solid #91b783;
  outline-offset: 3px;
}
.matrix-details > p {
  font-size: 10px;
  color: #90a084;
  line-height: 1.9;
  border-top: 1px solid #e8eddf;
  padding-top: 12px;
}
.matrix-details .residual-list {
  margin-bottom: 12px;
}
@media print {
  .matrix-details {
    border: 0;
    padding: 0;
  }
  .matrix-details > summary {
    display: none;
  }
  .matrix-details > *:not(summary) {
    display: block !important;
  }
}

.condition-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 0;
  margin-bottom: 8px;
  border-top: 1px solid #e9eee3;
}
.condition-controls label {
  font-size: 11px;
  font-weight: 550;
  color: #64825b;
}
.condition-controls p {
  font-size: 9px;
  color: #94a286;
  margin-top: 5px;
  line-height: 1.7;
}
.condition-select-wrap {
  position: relative;
  min-width: 0;
}
.condition-select-wrap select {
  appearance: none;
  border: 1px solid #dce6d3;
  border-radius: 5px;
  background: #fafcf6;
  color: #607e54;
  font-size: 11px;
  padding: 9px 30px 9px 10px;
  width: 100%;
  cursor: pointer;
}
.condition-select-wrap > svg {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: #97aa86;
}
.report-metrics .condition-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: inherit;
  font-size: 9px;
  padding: 3px 5px;
  border-radius: 4px;
  margin-top: 9px;
  border: 1px solid;
  line-height: 1.3;
}
.condition-badge i,
.condition-dot {
  height: 5px;
  width: 5px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}
.report-metrics .condition-badge[data-level='stable'] {
  background: #edf5e7;
  color: #64814e;
  border-color: #dce9d1;
}
.condition-badge[data-level='stable'] i,
.condition-dot.stable {
  background: #7ca65d;
}
.report-metrics .condition-badge[data-level='sensitive'] {
  background: #fff6df;
  color: #a17a25;
  border-color: #ebdcac;
}
.condition-badge[data-level='sensitive'] i,
.condition-dot.sensitive {
  background: #c6a047;
}
.report-metrics .condition-badge[data-level='very-sensitive'] {
  background: #fff0e9;
  color: #b56d4c;
  border-color: #efd7c9;
}
.condition-badge[data-level='very-sensitive'] i,
.condition-dot.very-sensitive {
  background: #d38a65;
}
.report-metrics .condition-badge[data-level='unavailable'] {
  background: #f2f3ef;
  color: #8b9385;
  border-color: #e1e5da;
}
.condition-badge[data-level='unavailable'] i {
  background: #a7af9d;
}
.condition-explanation {
  margin-top: -12px;
  border: 1px solid #e4ebdb;
  background: #fafcf6;
  border-radius: 6px;
  padding: 13px 14px;
  color: #7c916e;
  font-size: 10px;
  line-height: 1.9;
}
.condition-explanation[data-level='sensitive'] {
  border-color: #ecdfb6;
  background: #fffcf3;
}
.condition-explanation[data-level='very-sensitive'] {
  border-color: #eed9cc;
  background: #fff9f5;
}
.condition-thresholds {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin: 10px 0 9px;
  font-size: 9px;
}
.condition-thresholds > span {
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  color: #87977c;
}
.condition-thresholds b {
  font-weight: 550;
  color: #718564;
}
.condition-caveat {
  font-size: 9px;
  color: #9ba78d;
  line-height: 1.8;
}
.condition-guide {
  margin-top: 11px;
  padding-top: 8px;
  border-top: 1px solid #e5ebdc;
}
.condition-guide summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  cursor: pointer;
  color: #7c946c;
  font-size: 9px;
  list-style: none;
}
.condition-guide summary::-webkit-details-marker {
  display: none;
}
.condition-guide summary:focus-visible {
  outline: 2px solid #b1c7a0;
  outline-offset: 3px;
}
.condition-guide[open] summary > svg {
  transform: rotate(180deg);
}
.condition-guide p {
  font-size: 9px;
  line-height: 1.9;
  margin-top: 9px;
  color: #8d9d7f;
}
.condition-guide b {
  font-weight: 550;
  color: #718962;
}
.is-computing .condition-value,
.is-computing .condition-badge,
.is-computing .condition-explanation {
  opacity: 0.5;
}
@media (max-width: 760px) {
  .condition-controls {
    align-items: stretch;
    flex-direction: column;
    gap: 10px;
  }
  .condition-controls label {
    font-size: 11px;
  }
  .condition-controls p {
    font-size: 9px;
  }
  .condition-select-wrap select {
    font-size: 11px;
  }
  .condition-thresholds {
    flex-direction: column;
    gap: 4px;
  }
  .report-metrics .condition-badge {
    font-size: 8px;
    padding: 3px;
  }
  .condition-explanation {
    padding: 11px;
    font-size: 10px;
  }
}
.planned-category:disabled {
  opacity: 0.45;
  cursor: default;
  gap: 4px;
}
.planned-category small {
  font-size: 7px;
  color: #a1ad95;
  font-weight: 400;
}
.planned-category span {
  font-size: 9px;
  letter-spacing: -0.4px;
}
.empty-workspace {
  min-height: 500px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 40px;
  text-align: center;
  background: radial-gradient(ellipse at 50% 36%, #f6f9f2, transparent 60%);
}
.empty-workspace-icon {
  height: 61px;
  width: 61px;
  display: grid;
  place-items: center;
  border: 1px solid #e2ead8;
  border-radius: 17px;
  background: #f0f5e9;
  color: #8aa777;
  margin-bottom: 24px;
  box-shadow: 0 5px 20px #4e775708;
}
.empty-workspace > span {
  font-size: 8px;
  letter-spacing: 1.8px;
  color: #a3b196;
  margin-bottom: 13px;
}
.empty-workspace h3 {
  font-size: 17px;
  font-weight: 500;
  letter-spacing: -0.7px;
  color: #64825b;
}
.empty-workspace > p {
  font-size: 11px;
  color: #9ba88e;
  line-height: 1.9;
  max-width: 310px;
  margin-top: 12px;
  word-break: keep-all;
}
.empty-workspace > button {
  margin-top: 26px;
  color: #7d956c;
  border-color: #dce7d0;
}
.nonlinear-status {
  margin: 0 22px 17px;
  border: 1px solid #e3eadb;
  background: #f8fbf4;
  border-radius: 6px;
  padding: 12px 14px;
}
.nonlinear-status > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #78936b;
  font-size: 10px;
}
.nonlinear-status b {
  font-size: 9px;
  font-weight: 500;
  border: 1px solid #dfebd4;
  border-radius: 3px;
  padding: 2px 5px;
  background: #eff6e7;
  color: #8ca079;
}
.nonlinear-status p {
  font-size: 9px;
  line-height: 1.8;
  color: #9ba98e;
  margin-top: 8px;
  word-break: keep-all;
}
.nonlinear-sweep-note {
  font-size: 9px;
  line-height: 1.8;
  background: #f7f9f2;
  color: #9daa8e;
  padding: 8px 10px;
  margin-top: 12px;
  border-radius: 4px;
}
.auxiliary-values {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
  margin: 0 22px 17px;
  font-size: 10px;
  color: #98a68c;
}
.auxiliary-values > span:not(:first-child) {
  border: 1px solid #e6ecdd;
  border-radius: 4px;
  background: #fafcf7;
  padding: 5px 8px;
}
.auxiliary-values code {
  font-size: 10px;
  color: #7c9570;
}
.auxiliary-values b {
  font-family: Consolas, monospace;
  font-weight: 400;
  margin-left: 8px;
  color: #88a17a;
}
.local-condition-note {
  font-size: 10px;
  line-height: 1.9;
  color: #9d8c65;
  margin: 9px 0;
}
.evaluation-metrics {
  grid-template-columns: 1fr 1fr;
}
.toast .undo-button {
  display: inline-block;
  padding: 3px 6px;
  border: 1px solid #65825c;
  border-radius: 4px;
  color: #d3e3c3;
  font-size: 10px;
}
@media (max-width: 760px) {
  .empty-workspace {
    min-height: 360px;
    padding: 25px 20px;
  }
  .empty-workspace h3 {
    font-size: 14px;
  }
  .empty-workspace > p {
    font-size: 10px;
  }
  .nonlinear-status {
    margin-inline: 18px;
    padding: 11px;
  }
  .nonlinear-status > div {
    gap: 7px;
    font-size: 9px;
  }
  .nonlinear-status p {
    font-size: 9px;
  }
  .heading-actions {
    flex-wrap: wrap;
  }
  .heading-actions .new-model-button {
    display: flex;
  }
  .breadcrumbs {
    flex-wrap: wrap;
  }
  .planned-category span {
    font-size: 7px;
  }
  .planned-category small {
    font-size: 6px;
  }
  .auxiliary-values {
    margin-inline: 18px;
  }
  .page-heading h1 {
    font-size: 28px;
  }
}
.nonlinear-settings {
  border-top: 1px solid #e9eee3;
  margin: 0 -21px;
  padding: 0 21px;
  background: #fbfcf8;
}
.nonlinear-settings > summary {
  display: flex;
  align-items: center;
  gap: 6px;
  list-style: none;
  padding: 12px 0;
  color: #8b9e7c;
  cursor: pointer;
  font-size: 10px;
}
.nonlinear-settings > summary::-webkit-details-marker {
  display: none;
}
.nonlinear-settings > summary > svg:last-child {
  margin-left: auto;
}
.nonlinear-settings[open] > summary > svg:last-child {
  transform: rotate(180deg);
}
.nonlinear-settings-body {
  padding-bottom: 14px;
  color: #93a286;
  font-size: 10px;
}
.nonlinear-settings-body > label {
  display: block;
  margin-bottom: 7px;
  color: #738c63;
}
.nonlinear-settings-body > select {
  border: 1px solid #dce6d2;
  background: #fff;
  color: #6f885f;
  border-radius: 5px;
  padding: 8px;
  width: 100%;
  font-size: 11px;
}
.nonlinear-settings-body > p {
  line-height: 1.9;
  margin-top: 10px;
}
.search-bounds-form > p {
  font-size: 9px;
  line-height: 1.9;
  margin: 11px 0;
  color: #9ba98e;
}
.search-bounds-form > div {
  display: flex;
  align-items: flex-end;
  gap: 6px;
}
.search-bounds-form label {
  flex: 1;
  min-width: 0;
  font-size: 9px;
  color: #829774;
}
.search-bounds-form input {
  display: block;
  margin-top: 5px;
  border: 1px solid #dce7d2;
  border-radius: 4px;
  padding: 7px;
  width: 100%;
  min-width: 0;
  font-family: Consolas, monospace;
  font-size: 10px;
  color: #66875b;
}
.search-bounds-form button {
  border: 1px solid #d6e4ca;
  background: #eef5e8;
  border-radius: 4px;
  padding: 7px 8px;
  color: #6b885b;
  font-size: 10px;
  height: 29px;
}
.search-bounds-form > span {
  display: block;
  margin-top: 8px;
  color: #b17b54;
  font-size: 9px;
}
.legacy-conditions-note {
  font-size: 9px;
  color: #a99877;
  line-height: 1.8;
  margin: 10px 0;
}
.solutions-section {
  padding: 20px 22px 17px;
  border-bottom: 1px solid #e8eee0;
  background: linear-gradient(135deg, #fcfdf9, #fff);
}
.solutions-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 9px;
  margin-bottom: 13px;
}
.solution-count {
  font-size: 12px;
  letter-spacing: -0.3px;
  font-weight: 550;
  color: #5a7d55;
}
.solutions-title > span {
  font-size: 8px;
  color: #a0ae92;
}
.solution-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
  max-height: 215px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #d3dfc9 #f8faf5;
}
.solution-choice {
  text-align: left;
  white-space: normal;
  border: 1px solid #e2ead8;
  background: #fff;
  border-radius: 6px;
  padding: 10px 12px;
  min-width: 0;
}
.solution-choice > span {
  font-size: 8px;
  display: block;
  letter-spacing: 0.6px;
  color: #a0af92;
  margin-bottom: 6px;
}
.solution-choice > strong {
  font-family: Consolas, monospace;
  font-size: 12px;
  line-height: 1.7;
  font-weight: 400;
  color: #7b956c;
  overflow-wrap: anywhere;
}
.solution-choice.selected {
  background: #eef5e8;
  border-color: #a5c28e;
  box-shadow: inset 0 0 0 1px #b8cfa63d;
}
.solution-choice.selected > span {
  color: #73965e;
}
.solution-choice.selected > strong {
  color: #466e3c;
}
.solution-choice:disabled {
  opacity: 0.6;
}
.search-summary {
  margin-top: 13px;
  color: #8fa07f;
  font-size: 9px;
  line-height: 1.9;
}
.certification-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.certification-toggle input {
  width: auto;
}
.interval-certificate {
  margin-top: 12px;
  padding: 12px;
  border: 1px solid #d9e3d6;
  border-radius: 8px;
}
.interval-certificate summary {
  cursor: pointer;
  font-weight: 600;
}
.interval-certificate p,
.interval-certificate li {
  line-height: 1.7;
  overflow-wrap: anywhere;
}
.interval-certificate ul {
  padding-left: 20px;
  max-height: 240px;
  overflow: auto;
}
.search-summary > div {
  display: flex;
  align-items: center;
  gap: 5px 12px;
  flex-wrap: wrap;
}
.search-summary strong {
  font-weight: 400;
  color: #81996f;
  font-family: Consolas, monospace;
  overflow-wrap: anywhere;
}
.search-summary > p {
  font-size: 8px;
  color: #a3af96;
  margin-top: 5px;
  max-width: none;
}
.error-state .search-summary {
  max-width: 430px;
  padding: 12px;
  border: 1px solid #e5eadf;
  border-radius: 6px;
  background: #fafcf7;
  text-align: left;
}
.error-state .search-summary > p {
  font-size: 9px;
  color: #97a588;
}
.solution-cards.single-value {
  grid-template-columns: 1fr;
}
.all-reports-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: 100%;
  border: 1px solid #dce7d2;
  background: #f5f9ef;
  border-radius: 5px;
  color: #819970;
  font-size: 10px;
  padding: 9px;
  margin: -5px 0 17px;
}
.all-reports-button > span {
  border: 1px solid #dfebd3;
  border-radius: 3px;
  padding: 1px 4px;
  font-size: 8px;
  color: #99ad87;
}
.all-reports-button:hover {
  background: #eef5e5;
}
.all-reports-button:disabled {
  opacity: 0.5;
}
@media (max-width: 960px) {
  .nonlinear-settings {
    margin-inline: -14px;
    padding-inline: 14px;
  }
}
@media (max-width: 760px) {
  .nonlinear-settings {
    margin-inline: -18px;
    padding-inline: 18px;
  }
  .solutions-section {
    padding-inline: 18px;
  }
  .solutions-title {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }
  .solutions-title > span {
    font-size: 9px;
  }
  .solution-list {
    gap: 6px;
  }
  .solution-choice {
    padding: 9px;
  }
  .solution-choice > strong {
    font-size: 11px;
  }
  .search-summary > div {
    align-items: flex-start;
    flex-direction: column;
    gap: 2px;
  }
  .search-summary > p {
    font-size: 9px;
  }
  .all-reports-button {
    font-size: 10px;
  }
}

.parameter-current-value {
  font-size: 9px;
  font-family: Consolas, monospace;
  color: #94a287;
}
.results-parameters {
  padding: 15px 22px;
  background: #fbfdf7;
  border-top: 1px solid #edf1e6;
  border-bottom: 1px solid #e7eedf;
}
.results-parameters-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 13px;
  color: #76906a;
  font-size: 11px;
}
.results-parameters-heading > span {
  display: flex;
  align-items: center;
  gap: 6px;
}
.results-parameters-heading > small {
  font-size: 8px;
  color: #9bab8c;
}
.results-parameter-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 23px;
}
.result-parameter {
  min-width: 0;
}
.result-parameter .parameter-top {
  margin: 0;
}
.result-parameter .parameter-name {
  font-size: 11px;
}
.result-parameter .parameter-input-wrap > input {
  width: 67px;
  background: #fff;
}
.result-parameter .range-labels {
  font-size: 8px;
}
.result-parameter .parameter-slider {
  margin-top: 12px;
}
.solution-item {
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.solution-item > .solution-choice {
  width: 100%;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  flex: 1;
}
.add-simulation-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: 100%;
  padding: 7px 6px;
  color: #91a77c;
  background: #f9fbf5;
  border: 1px solid #e1ead6;
  border-top: 0;
  border-radius: 0 0 5px 5px;
  font-size: 9px;
}
.add-simulation-button:hover {
  background: #eef5e7;
  color: #658a50;
}
.add-simulation-button:disabled {
  color: #acb8a0;
  background: #fbfcf8;
  opacity: 0.7;
}
.multi-simulation-view .solution-summary,
.multi-simulation-view > .nonlinear-status,
.multi-simulation-view > .auxiliary-values {
  display: none;
}
.multi-simulation-view .solution-list {
  max-height: 135px;
}
.multi-simulation-view .solutions-section {
  padding-bottom: 13px;
}
.multi-simulation-workspace {
  padding: 19px 20px 20px;
  border-top: 1px solid #e4ebdb;
  background: #f8faf4;
}
.multi-simulation-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 17px;
}
.multi-simulation-toolbar h3 {
  font-size: 12px;
  font-weight: 550;
  color: #6e895d;
}
.multi-simulation-toolbar h3 span {
  font-size: 9px;
  font-weight: 400;
  color: #9aab88;
  margin-left: 6px;
}
.multi-simulation-toolbar p {
  font-size: 9px;
  line-height: 1.8;
  color: #a0ad92;
  margin-top: 6px;
}
.multi-simulation-toolbar > label {
  font-size: 9px;
  color: #8ca17a;
  display: flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;
}
.multi-simulation-toolbar select {
  appearance: auto;
  border: 1px solid #dde8d0;
  border-radius: 4px;
  background: #fff;
  color: #749466;
  font-size: 10px;
  padding: 6px;
  max-width: 110px;
}
.simulation-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 15px;
  align-items: start;
}
.multi-simulation-note {
  font-size: 9px;
  color: #a1af92;
  line-height: 1.9;
  margin-top: 14px;
}
.results-expanded {
  position: fixed;
  inset: 0;
  z-index: 65;
  width: 100vw;
  height: 100dvh;
  overflow-y: auto;
  background: #f6f8f2;
  padding: 18px 24px;
  display: block;
  overscroll-behavior: contain;
}
.results-expanded .results-column {
  max-width: 1750px;
  margin: auto;
  gap: 15px;
}
.results-expanded .results-panel {
  overflow: visible;
}
.results-expanded .results-heading {
  position: sticky;
  top: 0;
  z-index: 8;
  background: #fff;
  border-radius: 10px 10px 0 0;
  border-bottom: 1px solid #e8eedf;
  padding-top: 19px;
  padding-bottom: 19px;
}
.results-expanded .results-parameters {
  position: sticky;
  top: 63px;
  z-index: 7;
  max-height: 190px;
  overflow-y: auto;
  background: #fbfdf7;
  box-shadow: 0 5px 10px #344d2910;
}
.results-expanded .results-parameter-grid {
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 15px 28px;
}
.results-expanded .multi-simulation-workspace {
  padding: 20px 24px 24px;
}
.results-expanded .simulation-grid {
  gap: 20px;
}
.results-expanded .chart-section {
  padding-inline: 30px;
}
.results-expanded .insight-card {
  display: none;
}
@media (max-width: 1190px) {
  .simulation-grid {
    grid-template-columns: 1fr;
  }
  .results-expanded .simulation-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .results-parameters {
    padding-inline: 18px;
  }
  .multi-simulation-toolbar {
    align-items: flex-start;
    flex-wrap: wrap;
  }
}
@media (max-width: 760px) {
  .results-parameters {
    padding: 15px 18px;
  }
  .results-parameter-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  .results-parameters-heading {
    font-size: 10px;
  }
  .results-parameters-heading > small {
    font-size: 7px;
  }
  .multi-simulation-workspace {
    padding: 16px 13px;
  }
  .simulation-grid,
  .results-expanded .simulation-grid {
    grid-template-columns: 1fr;
  }
  .multi-simulation-toolbar {
    gap: 10px;
  }
  .multi-simulation-toolbar h3 {
    font-size: 11px;
  }
  .results-expanded {
    padding: 8px;
  }
  .results-expanded .results-heading {
    padding: 15px;
  }
  .results-expanded .results-parameters {
    top: 57px;
    max-height: 185px;
  }
  .results-expanded .multi-simulation-workspace {
    padding: 15px 12px;
  }
  .results-expanded .chart-section {
    padding-inline: 16px;
  }
  .results-expanded .results-parameter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 15px;
  }
  .solution-item .add-simulation-button {
    font-size: 8px;
  }
}

.example-walkthrough {
  margin: 16px 38px 0;
  padding: 0 18px;
  border: 1px solid #dce7d7;
  border-radius: 10px;
  background: #f6faf2;
  color: #3e6252;
}
.example-walkthrough summary {
  padding: 14px 0;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.example-walkthrough summary span {
  margin-left: 12px;
  color: #75866d;
  font-size: 11px;
  font-weight: 400;
}
.example-walkthrough p,
.example-walkthrough li {
  font-size: 12px;
  line-height: 1.9;
}
.example-walkthrough ol {
  padding-left: 20px;
}
.example-walkthrough a {
  display: inline-block;
  margin: 4px 0 12px;
  color: #28765d;
  font-size: 12px;
  text-decoration: underline;
}
.example-walkthrough small {
  display: block;
  padding-bottom: 16px;
  font-size: 11px;
  color: #7b8775;
  line-height: 1.7;
}
@media (max-width: 600px) {
  .example-walkthrough {
    margin-inline: 16px;
  }
  .example-walkthrough summary span {
    display: block;
    margin: 7px 0 0;
    line-height: 1.7;
  }
}

.line-numbers > span {
  flex: 0 0 28px;
  height: 28px;
  line-height: 28px;
}

.variable-bounds {
  margin-top: 12px;
  width: 100%;
}
.variable-bounds summary {
  cursor: pointer;
}
.variable-bounds > div {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 0;
}
.variable-bounds input {
  max-width: 120px;
}
.search-window-controls {
  border: 1px solid #c8dace;
  border-radius: 8px;
  padding: 12px;
  margin-top: 12px;
}
.search-window-controls input {
  max-width: 150px;
}
.search-window-note {
  color: #206a57;
}

/* Live calculation updates must not move the browser's scroll anchor. */
.results-panel,
.results-expanded {
  overflow-anchor: none;
}
.merged-parameter-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 22px;
  padding: 6px 0;
  background: var(--surface, #fff);
  border-bottom: 1px solid #e5e9e1;
}
.merged-parameter-controls .results-parameters {
  position: static;
  flex: 1 1 260px;
  padding: 6px 0;
  border: 0;
  box-shadow: none;
}
.merged-parameter-controls .results-parameters-heading {
  display: none;
}
.sweep-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #536b60;
  font-size: 12px;
}
.sweep-selector select {
  padding: 7px 12px;
  border: 1px solid #d7e1d3;
  border-radius: 5px;
  background: #fff;
  color: inherit;
}
.simulation-reading-help {
  margin: 8px 20px;
}
.simulation-reading-help p,
.condition-help p {
  font-size: 12px;
  line-height: 1.8;
  color: #68766e;
  max-width: 90ch;
}
.condition-help {
  max-width: 80ch;
  border: 0;
  padding: 5px 0;
}

.merged-parameter-controls .results-parameter-grid {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}
@media (max-width: 600px) {
  .merged-parameter-controls {
    gap: 4px;
  }
  .merged-parameter-controls .results-parameters {
    flex-basis: 100%;
  }
}
```

<a id="source-29"></a>

## src/workspace-screens.css

원본: [src/workspace-screens.css](../../src/workspace-screens.css) · 410줄 · SHA-256: `15d85306676189a9ac2e1a43a820e936a3e14edaee71f754fd8a0f13fbb6fcb3`

```css
[hidden] {
  display: none !important;
}
.merge-actions,
.merged-set-Chips,
.merged-variable-selector {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 14px 20px;
}
.merge-actions > span {
  font-size: 11px;
  color: #84927b;
}
.merged-sets-grid {
  display: grid;
  gap: 20px;
  padding: 20px;
  background: #f7f9f3;
}
.merged-branch-chip {
  border: 1px solid #dae3d5;
  border-radius: 20px;
  padding: 7px 12px;
  font-size: 12px;
}
.merged-branch-chip.is-active {
  background: #edf6e9;
  color: #3a6856;
}
.merged-branch-chip i,
.merged-card-label i {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 7px;
}
.merged-variable-selector button {
  padding: 6px 14px;
  border-radius: 5px;
  border: 1px solid #dce5d5;
}
.merged-variable-selector .is-selected {
  background: #e9f4e7;
}
.merged-current-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  padding: 0 20px 16px;
}
.merged-current-card {
  background: #f3f7ef;
  border: 1px solid #e1e8dc;
  border-radius: 7px;
  padding: 14px;
  display: grid;
  gap: 10px;
}
.merged-card-label {
  font-size: 11px;
  color: #809178;
}
.merged-current-card strong {
  font-size: 15px;
  color: #4d7461;
}
.sc-sample-toggle {
  display: flex;
  align-items: center;
  gap: 5px;
}
.sc-sample-toggle input {
  width: 13px;
  height: 13px;
  accent-color: #087f74;
}
.sc-bifurcation-banner {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 0;
}
.sc-bifurcation-chip {
  border: 1px solid #ecd3b4;
  background: #fffbf3;
  border-radius: 5px;
  padding: 8px;
  font-size: 11px;
}

.workspace {
  margin-left: 0;
  width: 100%;
}

.module-home-page {
  min-height: calc(100dvh - 77px);
  display: grid;
  align-items: center;
}

.module-home-page .module-home {
  width: 100%;
  padding-block: 36px;
}

.workspace-nav-container {
  max-width: 1510px;
  margin: 0 auto;
  padding: 22px 38px 0;
}
.workspace-nav-container .workspace-navigation {
  margin-bottom: 0;
}
.workspace-content {
  padding-top: 18px;
}
.workspace-content .page-heading {
  margin-block: 20px 25px;
}
.workspace-content .page-heading h1 {
  font-size: 29px;
}
.sectioned-workspace.studio-grid {
  display: block;
}
.sectioned-workspace .model-column {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.85fr);
  align-items: start;
  gap: 20px;
}
.sectioned-workspace .model-panel {
  grid-row: 1 / 3;
}
.sectioned-workspace .model-column > .tip-card,
.sectioned-workspace .insight-card {
  display: none;
}
.model-next-step {
  padding: 18px;
  border: 1px solid #e1e8dc;
  border-radius: 9px;
  background: #f3f7ed;
}
.model-next-step p {
  font-size: 12px;
  line-height: 1.8;
  color: #7c8c75;
  margin-bottom: 15px;
  overflow-wrap: anywhere;
}
.model-next-step button {
  width: 100%;
  justify-content: center;
}
.sectioned-workspace .results-column {
  max-width: none;
}
.sectioned-workspace .solutions-section {
  padding: 0;
}
.sectioned-workspace .solutions-title {
  list-style: none;
  margin: 0;
  padding: 20px 24px;
  cursor: pointer;
}
.sectioned-workspace .solutions-title::-webkit-details-marker {
  display: none;
}
.sectioned-workspace .solutions-title > span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.sectioned-workspace .solutions-section[open] .solutions-title > span svg {
  transform: rotate(180deg);
}
.sectioned-workspace .solutions-section .solution-list {
  margin: 0 24px 12px;
  max-height: 260px;
}
.sectioned-workspace .solutions-section .search-summary {
  padding: 0 24px 18px;
  margin-top: 10px;
}
.sectioned-workspace .automatic-simulation-view > .solution-summary,
.sectioned-workspace .automatic-simulation-view > .nonlinear-status,
.sectioned-workspace .automatic-simulation-view > .warning-box,
.sectioned-workspace .automatic-simulation-view > .auxiliary-values,
.sectioned-workspace .automatic-simulation-view > .result-footer {
  display: none;
}
.selected-simulation-workspace {
  padding: 20px 24px 24px;
  background: #f7f9f3;
}
.discovery-status {
  padding: 14px 24px;
  color: #7c8c75;
  font-size: 11px;
  line-height: 1.7;
  border-bottom: 1px solid #e8ece1;
}
.selected-simulation-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  color: #85957a;
  font-size: 11px;
}
.selected-simulation-toolbar label,
.selected-simulation-toolbar select {
  font-size: 12px;
}
.selected-simulation-toolbar select {
  margin-left: 8px;
  padding: 8px 12px;
  border: 1px solid #dce6d3;
  border-radius: 6px;
  background: #fff;
  color: #64815b;
}
.sectioned-workspace .selected-simulation-workspace .solution-chart {
  max-width: 100%;
}
.sectioned-workspace .simulation-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.sectioned-workspace .simulation-panel-sweep-label {
  margin-block: 15px;
}
.results-expanded .selected-simulation-workspace {
  padding-bottom: 30px;
}
.workspace-screen-report .result-footer {
  border-top: 1px solid #edf0e7;
}
@media (max-width: 900px) {
  .workspace-nav-container {
    padding-inline: 20px;
  }
  .sectioned-workspace .model-column,
  .sectioned-workspace .simulation-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .sectioned-workspace .model-panel {
    grid-row: auto;
  }
}
@media (max-width: 600px) {
  .workspace-nav-container {
    padding: 14px 13px 0;
  }
  .workspace-content,
  .module-home-page {
    padding-inline: 13px;
  }
  .workspace-content .page-heading h1 {
    font-size: 24px;
  }
  .workspace-content .page-heading {
    margin-bottom: 20px;
  }
  .workspace-content .breadcrumbs {
    font-size: 10px;
  }
  .selected-simulation-workspace {
    padding: 16px 12px;
  }
  .selected-simulation-toolbar {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .sectioned-workspace .solutions-title {
    padding-inline: 16px;
    gap: 12px;
  }
  .sectioned-workspace .solutions-title > span {
    font-size: 9px;
  }
  .sectioned-workspace .solutions-section .solution-list {
    margin-inline: 16px;
  }
}

/* Simulation is a working canvas: compact tools above a wide default overview. */
.simulation-focused .topbar {
  display: none;
}
.simulation-focused .breadcrumbs,
.simulation-focused .page-heading > div:first-child,
.simulation-focused .example-walkthrough,
.simulation-focused .insight-card,
.simulation-focused .workspace-footer {
  display: none;
}
.simulation-focused .workspace-nav-container {
  padding-top: 6px;
}
.simulation-focused .workspace-content {
  max-width: none;
  padding: 0 16px 16px;
}
.simulation-focused .page-heading {
  margin: 0;
  padding: 5px 0;
  min-height: 0;
  justify-content: flex-end;
}
.simulation-focused .heading-actions button {
  padding: 7px 11px;
  font-size: 11px;
}
.simulation-focused .results-heading {
  padding: 10px 16px;
}
.simulation-focused .results-parameters {
  padding: 10px 16px;
}
.simulation-focused .results-parameters-heading {
  display: none;
}
.simulation-focused .merge-actions {
  padding: 7px 16px;
}
.simulation-focused .default-overview {
  padding: 8px;
}
.default-overview .simulation-panel {
  padding: 12px 16px;
}
.default-overview .simulation-panel-anchor {
  display: none;
}
.default-overview .merged-set-Chips {
  padding: 8px 0;
}
.default-overview .merged-current-wrap {
  margin: 5px 0;
  font-size: 12px;
  color: #587666;
}
.default-overview .merged-current-wrap summary {
  cursor: pointer;
}
.default-overview .merged-current-grid {
  padding: 10px 0;
}
.default-overview .merged-current-card button {
  font-size: 11px;
  color: #286b5b;
}
.default-overview .sc-stage,
.default-overview .solution-chart {
  max-width: none;
}
.default-overview .simulation-panel-actions {
  margin-top: 6px;
}
@media (max-width: 600px) {
  .simulation-focused .workspace-content {
    padding: 0 6px 10px;
  }
  .default-overview .simulation-panel {
    padding: 10px;
  }
}
.simulation-focused .page-heading {
  display: none;
}
.simulation-focused .workspace-nav-container {
  max-width: none;
  padding: 4px 16px 0;
}
.simulation-focused .workspace-navigation {
  padding-bottom: 5px;
}
.simulation-focused .results-parameters {
  padding: 6px 16px;
}
.simulation-focused .result-parameter .parameter-slider {
  margin-top: 5px;
}
.simulation-focused .merge-actions {
  padding-block: 4px;
}
.simulation-focused .solutions-title {
  padding-block: 6px;
}
.default-overview .sc-legend-row {
  min-height: 25px;
  padding-bottom: 2px;
}
.default-overview .overview-limit {
  color: #84927b;
  font-size: 10px;
  margin-top: 6px;
}
.default-overview .merged-current-card[data-selected='true'] {
  border-color: #3d8371;
  background: #e8f3ee;
}
```

<a id="source-30"></a>

## src/ivc.css

원본: [src/ivc.css](../../src/ivc.css) · 899줄 · SHA-256: `44d31e4f11a469949ce71143adad4f8d12623934deef6e68081ab8fbc625bc75`

```css
/* IVC: one quiet, readable workspace across every numerical module. */
:root {
  color: #293442;
  background: #f4f5f7;
  --teal: #365f8d;
  --muted: #5f6b79;
  --line: #dce1e7;
  --panel: #fff;
  font-size: 14px;
}
body {
  background: #f4f5f7;
  color: #293442;
}
button,
input,
select,
textarea {
  accent-color: #416c9b;
}
button:focus-visible,
a:focus-visible,
summary:focus-visible,
input:focus-visible,
textarea:focus-visible,
select:focus-visible {
  outline: 2px solid #416c9b;
  outline-offset: 3px;
}
.workspace {
  margin-left: 0;
  width: 100%;
}
.workspace .ivc-toolbar,
.scientific-workspace .ivc-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  min-height: 62px;
  padding: 10px 0;
  border-bottom: 1px solid #d6dce4;
  color: #293442;
  background: transparent;
  font-size: 13px;
}
.workspace .ivc-toolbar {
  margin: 0 24px;
}
.ivc-toolbar .ivc-brand {
  flex: 1;
  min-width: 140px;
  display: flex;
  align-items: baseline;
  gap: 12px;
  font-size: 19px;
  font-weight: 650;
}
.ivc-brand > span {
  font-size: 13px;
  color: #5f6b79;
  font-weight: 400;
}
.ivc-toolbar-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
}
.ivc-toolbar button,
.ivc-toolbar a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 6px 9px;
  font-size: 12px;
  color: #43536a;
  border-radius: 4px;
}
.ivc-toolbar button:hover,
.ivc-toolbar a:hover {
  background: #e8edf3;
}
.ivc-back-arrow {
  transform: rotate(180deg);
}
.ivc-toolbar .local-status {
  color: #697482;
  font-size: 11px;
  margin-inline: 8px;
}
.ivc-toolbar .local-status i {
  background: #62836d;
}
.workspace-nav-container {
  max-width: none;
  padding: 14px 24px 0;
}
.workspace .workspace-content {
  max-width: none;
  padding: 0 24px 28px;
}
.workspace-navigation {
  border: 0;
  padding: 0;
}
.workspace-screen-links {
  gap: 6px;
}
.workspace-navigation .workspace-screen-button,
.scientific-workspace .scientific-navigation > button {
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  color: #596677;
  padding: 10px 14px;
  min-height: 41px;
  font-size: 13px;
  gap: 9px;
}
.workspace-navigation .workspace-screen-button.is-current,
.scientific-workspace .scientific-navigation > button[aria-current='page'] {
  background: #e7edf5;
  border-color: #cbd7e6;
  color: #294d76;
  font-weight: 600;
}
.workspace-screen-button svg {
  display: none;
}
.workspace-screen-number {
  color: inherit;
  opacity: 0.65;
}
.workspace-content .problem-tabs {
  margin: 12px 0 16px;
  padding: 0;
  border-color: #d6dce4;
  min-height: auto;
  gap: 24px;
}
.workspace-content .problem-tab {
  min-height: auto;
  padding: 10px 0;
  color: #596677;
  font-size: 13px;
}
.workspace-content .problem-tab.selected {
  color: #294d76;
}
.workspace-content .sectioned-workspace .model-column {
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  gap: 18px;
}
.workspace .panel,
.scientific-workspace .science-panel {
  background: #fff;
  border: 1px solid #d6dce4;
  border-radius: 5px;
  box-shadow: none;
}
.workspace .panel-heading {
  padding: 16px 18px 12px;
  border: 0;
}
.workspace .panel-heading h2,
.workspace .parameters-panel h2,
.scientific-workspace .science-section-title h1,
.scientific-workspace .science-section-title h2,
.scientific-workspace .science-panel > h2 {
  font-size: 16px;
  color: #2e3a4b;
}
.workspace .step-number,
.workspace .model-tag,
.workspace .editor-toolbar > span:nth-child(2) {
  display: none;
}
.workspace .model-title {
  margin: 0 18px 8px;
  padding: 0;
}
.workspace .model-title input {
  color: #2e3a4b;
  font-size: 16px;
}
.workspace .model-description {
  margin: 0 18px 14px;
  color: #596677;
  font-size: 13px;
  line-height: 1.8;
}
.workspace .editor-toolbar {
  margin: 0 18px 8px;
  padding: 0;
  color: #596677;
}
.workspace .equation-editor {
  background: #fafbfc;
  border: 1px solid #d9dfe7;
  border-radius: 4px;
  margin: 0 18px 16px;
}
.workspace .equation-editor textarea {
  font-size: 13px;
  color: #344e70;
  background: transparent;
}
.workspace .line-numbers {
  background: #f1f3f6;
  color: #7a8592;
  border-right: 1px solid #e1e5eb;
}
.workspace .editor-meta {
  color: #596677;
  margin-inline: 18px;
}
.workspace .model-action-bar,
.workspace .model-footer {
  background: #fff;
  border-color: #dce1e7;
}
.workspace .solve-button,
.workspace .primary-button,
.scientific-workspace .science-primary {
  background: #365f8d;
  border-color: #365f8d;
  color: #fff;
  box-shadow: none;
  border-radius: 4px;
}
.workspace .solve-button:hover,
.workspace .primary-button:hover,
.scientific-workspace .science-primary:hover {
  background: #294d76;
}
.workspace .secondary-button,
.scientific-workspace .science-secondary {
  background: #f6f8fa;
  border: 1px solid #cfd7e2;
  color: #3c5472;
  box-shadow: none;
  border-radius: 4px;
}
.workspace .parameters-panel > p,
.workspace .parameters-description,
.workspace .parameter-type,
.workspace .parameter-value,
.workspace .range-labels {
  color: #596677;
}
.workspace .live-note {
  display: none;
}
.workspace .add-parameter {
  border: 1px solid #ccd6e2;
  color: #365f8d;
  border-radius: 4px;
  background: #fafbfd;
}
.workspace .range-editor,
.workspace .search-settings {
  background: #f6f8fa;
  color: #526175;
  border-color: #dce1e7;
}
.workspace .model-next-step {
  background: #fff;
  border-color: #d6dce4;
  border-radius: 5px;
  padding: 14px;
}
.workspace .model-next-step p {
  display: none;
}
.workspace .results-column {
  min-width: 0;
}
.workspace .results-panel {
  overflow: hidden;
}
.workspace .result-mode-tabs {
  margin-inline: 18px;
}
.workspace .result-mode-tabs > button {
  color: #53647a;
}
.workspace .summary-label {
  color: #526175;
}
.workspace .found-badge {
  color: #365b86;
  background: #edf2f8;
}
.workspace .solution-summary {
  padding: 14px 18px;
}
.workspace .solution-cards,
.workspace .solution-cards.single-value,
.workspace .solution-cards.many-values {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
  margin-top: 12px;
  border: 1px solid #d9dfe7;
  border-radius: 3px;
}
.workspace .solution-value,
.workspace .solution-value:nth-child(n) {
  display: grid;
  grid-template-columns: minmax(50px, 0.4fr) minmax(100px, 1fr) minmax(
      90px,
      0.6fr
    );
  gap: 15px;
  align-items: center;
  padding: 8px 12px;
  background: #fff;
  border: 0;
  border-bottom: 1px solid #e1e5eb;
  border-radius: 0;
}
.workspace .solution-value:last-child {
  border: 0;
}
.workspace .solution-value > div,
.workspace .solution-value:nth-child(n) > div {
  font-size: 13px;
  color: #344357;
}
.workspace .solution-value > strong,
.workspace .solution-value:nth-child(n) > strong {
  margin: 0;
  font:
    500 15px/1.6 ui-monospace,
    Consolas,
    monospace;
  letter-spacing: 0;
  color: #315f98;
}
.workspace .value-caption,
.workspace .solution-value:nth-child(n) .value-caption {
  color: #5f6b79;
  font-size: 12px;
}
.workspace .report-content {
  padding: 16px 18px;
}
.workspace .report-title {
  margin-bottom: 14px;
  padding: 0 0 12px;
  border-bottom: 1px solid #dce1e7;
  gap: 10px;
}
.workspace .report-title .report-document-icon,
.workspace .report-title > div > span {
  display: none;
}
.workspace .report-title h3 {
  font-size: 17px;
  color: #2f4057;
}
.workspace .report-metrics {
  gap: 10px;
}
.workspace .report-metrics strong {
  font-size: 20px;
}
.workspace .condition-norm-controls {
  background: #f8f9fb;
  padding: 12px;
}
.workspace .page-footer {
  display: none;
}
.workspace .selected-simulation-workspace,
.workspace .merged-sets-grid {
  background: #f5f7fa;
  padding: 12px;
}
.workspace .merged-current-card {
  background: #fff;
  border-color: #d6dce4;
  border-radius: 4px;
  padding: 10px 12px;
}
.workspace .merged-current-card strong,
.workspace .merged-card-label {
  color: #43546b;
}
.workspace .simulation-parameters {
  background: #f6f8fa;
  border-color: #d6dce4;
}
.workspace .chart-heading,
.workspace .chart-description,
.workspace .data-section-title {
  color: #526175;
}
.workspace .module-home-page {
  min-height: calc(100dvh - 64px);
}
.workspace .module-home {
  max-width: 1220px;
  padding: 35px 0;
}
.workspace .module-grid {
  gap: 16px;
}
.workspace .module-card {
  min-height: 210px;
  border-radius: 5px;
  border-color: #cfd7e2;
  background: #fff;
  color: #2e3d51;
  padding: 20px;
}
.workspace .module-card::before {
  height: 2px;
  background: #91a8c2;
}
.workspace .module-card:hover {
  transform: none;
  box-shadow: 0 3px 12px #24384f10;
  border-color: #6e8eb4;
  background: #fafcfe;
}
.workspace .module-letter {
  background: #e9eff7;
  color: #365f8d;
  border-radius: 4px;
}
.workspace .module-illustration {
  opacity: 0.85;
}
body .scientific-workspace {
  background: #f4f5f7;
  color: #293442;
  padding: 0 24px 28px;
  font-family: inherit;
}
.scientific-workspace .scientific-navigation {
  padding: 14px 0 18px;
  gap: 6px;
}
.scientific-workspace .scientific-navigation > label {
  color: #596677;
}
.scientific-workspace .scientific-model {
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  max-width: none;
  gap: 18px;
}
.scientific-workspace .science-panel {
  padding: 18px;
}
.scientific-workspace .science-description,
.scientific-workspace .science-editor-label,
.scientific-workspace .science-panel > label,
.scientific-workspace .science-status {
  color: #596677;
}
.scientific-workspace .science-description {
  margin-bottom: 14px;
}
.scientific-workspace .scientific-model textarea {
  min-height: 340px;
  max-height: 66vh;
  background: #fafbfc;
  color: #344e70;
  border-color: #d9dfe7;
  border-radius: 4px;
  padding: 14px;
  font-size: 13px;
}
body .scientific-workspace select,
body .scientific-workspace input[type='number'] {
  background: #fff;
  color: #34465f;
  border-color: #cbd4e0;
  border-radius: 4px;
  font-size: 13px;
}
.scientific-workspace .science-help {
  margin-top: 12px;
  color: #56677d;
  font-size: 12px;
  line-height: 1.9;
}
.scientific-workspace .science-help summary {
  cursor: pointer;
  color: #3e5f84;
}
.scientific-workspace .science-help p {
  margin: 9px 0;
  max-width: 90ch;
}
.scientific-workspace .science-help b {
  color: #334c69;
}
.scientific-workspace .science-parameters {
  background: #f8f9fb;
  border-color: #d6dce4;
  border-radius: 4px;
  padding: 12px 16px;
}
.scientific-workspace .science-parameters label,
.scientific-workspace .science-parameters details {
  color: #53647a;
}
.scientific-workspace .science-plot-switch button {
  background: #fff;
  border-color: #cfd7e2;
  color: #53647a;
}
.scientific-workspace .science-plot-switch button[aria-pressed='true'] {
  background: #eaf0f7;
  border-color: #9eb5cf;
  color: #2f557e;
}
.scientific-workspace .science-data {
  border-color: #dce1e7;
  color: #53647a;
}
.scientific-workspace .science-data th {
  background: #f1f4f8;
  color: #435674;
}
.scientific-workspace .science-data td,
.scientific-workspace .science-data th {
  border-color: #dce1e7;
  font-size: 12px;
  padding: 7px 10px;
}
.scientific-workspace .science-formula {
  background: #f6f8fb;
  color: #344f73;
  border: 1px solid #dce3ed;
  border-radius: 3px;
  padding: 10px 12px;
}
.scientific-workspace .science-verdict {
  color: #58687c;
  padding: 0 0 14px;
}
.scientific-workspace .science-verdict strong {
  color: #325d88;
  font-size: 15px;
}
.scientific-workspace .science-current-values {
  color: #596677;
}
.scientific-workspace .science-current-values b {
  color: #355e8a;
}
.ivc-output-table {
  width: 100%;
  border-collapse: collapse;
  margin: 14px 0;
  font-size: 13px;
  color: #344357;
}
.ivc-output-table th,
.ivc-output-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #dce1e7;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.ivc-output-table thead th {
  background: #f1f4f8;
  font-weight: 550;
  color: #3d506b;
}
.ivc-output-table th:first-child,
.ivc-output-table td:first-child {
  text-align: left;
}
.ivc-output-table td {
  font-family: ui-monospace, Consolas, monospace;
}
.ivc-output-table .ivc-result-value {
  color: #315f98;
  font-weight: 500;
}
.ivc-metrics-table {
  font-size: 12px;
}
.ivc-metrics-table th {
  width: 28%;
  font-weight: 500;
}
.ivc-metrics-table td:last-child {
  width: 42%;
  text-align: left;
  font-family: inherit;
}
.ivc-metrics-table summary {
  cursor: pointer;
  color: #486b95;
}
.ivc-metrics-table p {
  color: #526175;
  line-height: 1.9;
  margin-top: 8px;
  max-width: 65ch;
}
.ivc-report-details {
  border-top: 1px solid #dce1e7;
  padding-top: 14px;
}
.ivc-fit-settings {
  display: grid;
  gap: 12px;
  margin-top: 16px;
  font-size: 13px;
}
.ivc-fit-settings label {
  display: flex;
  flex-direction: column;
  gap: 7px;
  color: #53647a;
}
.ivc-fit-settings .ivc-checkbox {
  flex-direction: row;
  align-items: center;
}
.ivc-command {
  display: block;
  white-space: pre-wrap;
  background: #f1f4f8;
  padding: 10px;
  border: 1px solid #dce3ed;
  border-radius: 3px;
  color: #355b88;
  font-size: 13px;
}
.ivc-axis-select {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #4c5e76;
}
.ivc-integral {
  display: flex;
  gap: 13px;
  align-items: center;
  padding: 8px 12px 16px;
  color: #293b53;
  font:
    22px/1.5 Georgia,
    'Times New Roman',
    serif;
}
.ivc-integral strong {
  font-weight: 500;
  color: #315f98;
}
.ivc-integral-sign {
  display: inline-grid;
  justify-items: center;
  align-items: center;
  grid-template-rows: 18px 56px 18px;
  min-width: 36px;
  height: 92px;
}
.ivc-integral-sign > span {
  grid-area: 2 / 1;
  font-size: 57px;
  line-height: 1;
}
.ivc-integral-sign sup {
  grid-area: 1 / 1;
}
.ivc-integral-sign sub {
  grid-area: 3 / 1;
}
.ivc-integral-sign sup,
.ivc-integral-sign sub {
  display: block;
  position: static;
  color: #293b53;
  font:
    13px/1.3 ui-monospace,
    Consolas,
    monospace;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
@media (max-width: 850px) {
  .workspace .ivc-toolbar {
    margin: 0 14px;
  }
  .workspace .workspace-content {
    padding-inline: 14px;
  }
  .workspace-nav-container {
    padding-inline: 14px;
  }
  .workspace .sectioned-workspace .model-column,
  .scientific-workspace .scientific-model {
    grid-template-columns: 1fr;
  }
  body .scientific-workspace {
    padding-inline: 14px;
  }
  .ivc-toolbar .ivc-brand {
    flex-basis: 50%;
  }
  .ivc-toolbar .local-status {
    display: none;
  }
  .workspace .module-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 550px) {
  .ivc-brand > span {
    font-size: 11px;
  }
  .ivc-toolbar .ivc-brand {
    font-size: 16px;
  }
  .ivc-toolbar-actions {
    width: 100%;
  }
  .ivc-toolbar .github-link {
    display: none;
  }
  .workspace-screen-links {
    width: 100%;
  }
  .workspace-navigation .workspace-screen-button,
  .scientific-workspace .scientific-navigation > button {
    padding: 9px 10px;
    font-size: 12px;
  }
  .workspace .solution-value,
  .workspace .solution-value:nth-child(n) {
    gap: 8px;
    padding: 8px;
    grid-template-columns: 45px minmax(80px, 1fr);
  }
  .workspace .solution-value .value-caption {
    grid-column: 2;
  }
  .workspace .module-card {
    min-height: 175px;
    padding: 15px;
  }
  .workspace .module-card-title {
    font-size: 15px;
  }
  .workspace .module-grid {
    gap: 10px;
  }
  .scientific-workspace .science-panel {
    padding: 14px;
  }
  .ivc-output-table th,
  .ivc-output-table td {
    padding: 7px;
    font-size: 12px;
  }
  .ivc-metrics-table td:last-child {
    min-width: 105px;
  }
  .ivc-integral {
    font-size: 19px;
  }
}

/* Keep the large branch plot close to the top while retaining every control. */
.workspace .simulation-panel {
  border-color: #d6dce4;
  border-radius: 5px;
  background: #fff;
  color: #344357;
}
.workspace .simulation-panel-heading h3 {
  color: #365779;
}
.workspace .merged-branch-chip {
  border-radius: 4px;
  border-color: #cfd9e5;
  color: #425a77;
}
.workspace .merged-branch-chip.is-active {
  background: #edf2f8;
}
.workspace .merged-parameter-controls {
  border-color: #dce1e7;
}
.workspace .merged-parameter-controls .results-parameters {
  background: #f8f9fb;
}
.workspace .sc-view-controls {
  color: #586a7f;
}
.workspace .sc-view-controls select,
.workspace .sc-reset-view {
  background: #fff;
  border-color: #cfd7e2;
  color: #4a607b;
}
.workspace .report-content h4,
.workspace .report-content .report-explanation,
.workspace .report-content .report-param-list p {
  color: #53647a;
}
.workspace .report-content pre {
  background: #f5f7fa;
  border-color: #d8dfe8;
  color: #3d5677;
}
.workspace .condition-norm-setting,
.workspace .condition-norm-controls {
  border-color: #d8dfe8;
}
.workspace .analysis-view .solution-summary > .summary-label {
  display: none;
}
.simulation-focused .ivc-toolbar {
  min-height: 50px;
  padding-block: 5px;
}
.simulation-focused .workspace-nav-container {
  padding-top: 4px;
}
.simulation-focused .workspace-navigation .workspace-screen-button {
  min-height: 34px;
  padding-block: 6px;
}
.simulation-focused .results-heading {
  padding-block: 6px;
}
.simulation-focused .merge-actions {
  padding-block: 2px;
}
.simulation-focused .merge-actions .secondary-button {
  padding-block: 6px;
}
.simulation-focused .default-overview .simulation-panel {
  padding: 10px 14px;
}
.simulation-focused .default-overview .simulation-panel-header h3 {
  font-size: 14px;
}
.simulation-focused .default-overview .merged-set-Chips {
  padding-block: 3px;
}
.simulation-focused .default-overview .merged-branch-chip {
  padding: 4px 8px;
}
.simulation-focused .default-overview .merged-current-wrap {
  margin-block: 2px;
  font-size: 11px;
}
.simulation-focused .default-overview .sc-view-controls {
  margin-bottom: 4px;
}

.workspace .condition-controls {
  border-color: #dce1e7;
}
.workspace .condition-controls label {
  color: #53647a;
}
.workspace .condition-select-wrap select {
  color: #425f82;
  border-color: #cfd8e4;
  background: #f8fafc;
}

/* Preserve plot space after adding the authenticated account strip. */
.simulation-focused .ivc-toolbar {
  min-height: 44px;
  padding-block: 2px;
}
.simulation-focused .workspace-navigation .workspace-screen-button {
  min-height: 30px;
  padding-block: 4px;
}
.simulation-focused .results-heading {
  padding-block: 2px;
}
.simulation-focused .merge-actions .secondary-button {
  padding-block: 3px;
}
```
