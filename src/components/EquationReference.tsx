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
      className="guide-section"
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
            <code>2x + y = 10</code>: 등호 양쪽에 식을 씁니다. 방정식은 한 줄에
            하나입니다. 일반 등식의 이름은 미지수이며 상수를 자동 추측하지
            않습니다.
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
        <div style={{ overflowX: 'auto' }}>
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
        <h4>계산·시뮬레이션 읽기</h4>
        <p>
          조절할 상수는 파라미터에 등록합니다. 값은 연속 조절하며 샘플 포인트
          간격은 표·CSV·그래프 마커에만 적용합니다. 병합 세트는 여러 해를 색으로
          비교합니다. 범위·다른 고정 파라미터를 유지하면 현재값 조절로 기준
          곡선을 바꾸지 않습니다.
        </p>
        <p>
          자동 탐색은 유한한 수치 탐색이며 모든 실근을 보장하지 않습니다. ‘추적
          불가’는 실근 부재의 증명이 아닙니다. 접점 ‘확인됨’은 잔차와 도함수의
          국소 수치 검증이며 일반 Cusp 분기의 엄밀한 증명을 뜻하지 않습니다.
        </p>
        <p>
          기존 <code>f(x)=잔차식</code>은 호환용입니다. 고급 수동 모드에서{' '}
          <code>x(0)=1</code>, <code>x(min)=0</code>, <code>x(max)=10</code>으로
          초기값·범위를 지정할 수 있습니다. 새 함수 모델에는 번호 있는 표기를
          권장합니다.
        </p>
      </div>
    </section>
  )
}
