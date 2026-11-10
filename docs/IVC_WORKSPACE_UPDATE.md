# IVC · Workspace and Learning Guide Update

제품 이름을 **Interaction Visual Calculator (IVC)**로 변경했습니다. 기존 Equation Solver와 각 과학 계산 모듈의 브라우저 저장 키·프로젝트 파일 형식은 유지하여 작성한 모델을 계속 불러올 수 있습니다.

## Workspace

- 모든 도구에 같은 compact toolbar와 **Model & Data / Simulation / Report** 흐름을 적용했습니다. 장식 제목·긴 여백·색이 강한 결과 카드를 줄이고 흰색 표와 회색 배경, 읽기 쉬운 텍스트로 정리했습니다. 기존 방정식의 병합 시뮬레이션·곡선·샘플·클릭/슬라이더·확대 기능은 유지합니다.
- 입력 안내에서 방정식 개수를 행 하나로 제한하던 문구를 제거했습니다. 기존 줄바꿈·쉼표·세미콜론·연쇄 등식 지원을 유지합니다.
- Report는 해/상태/계수 표와 핵심 지표를 먼저 보여 줍니다. 계산 방법, 입력 모델, 진단, Gaussian Noise Model, 오차 시나리오 등은 펼쳐 확인합니다.

## User Guide

[User Textbook](IVC_USER_TEXTBOOK.md)은 화면의 User Guide와 같은 원본으로 만든 9개 독립 교재입니다. Linear / Nonlinear / ODE / Linear·Polynomial Regression / Multilinear Regression / Nonlinear Regression / Discrete Integration / Constrained Optimization / LSQ Optimization을 각각 탭으로 구분합니다.

각 장은 무엇을 계산하는지, 실제 Input, 계산 순서, 예상 결과, 알고리즘의 역할, 숫자 해석 예시와 지원 한계를 설명합니다. Technical terms는 English, 설명은 한국어입니다. 현재 탭의 검색·목차·예제 복사와 키보드 탐색을 제공합니다. 새 기능 설명을 추가할 때 `src/components/guide-content.ts`와 이 파일에서 생성한 교재를 함께 갱신합니다.

## Scientific Output

- **ODE:** Auto / RK45 / Implicit Euler 선택 설명을 Settings에서 펼쳐 읽을 수 있습니다. Output Samples와 내부 적응 스텝, Tolerance와 측정 오차를 구분했습니다. Phase Plot은 X / Y 선택 변수명을 그래프 축에도 표시합니다. Report에는 Initial / Min / Max / Final Value를 정리합니다. Min / Max는 출력 샘플에 대한 요약입니다.
- **Regression:** Fit Type / Degree / Through Origin을 선택하면 Input의 `polyfit x y degree [origin]` 명령을 직접 수정합니다. Report에는 모델식·계수·95% CI·RMSE·R²와 Observed vs Predicted 비교를 표시합니다. Standard Error·Rank·Condition Number와 가정은 접어 둡니다. Markdown 내보내기에도 계수 CI를 포함합니다.
- **Integration:** 실제 적분 시작·종료값을 ∫의 아래·위에 놓고 계산값을 표시합니다. 보간 곡선 아래의 요청 구간을 음영으로 보여 주며 양·음의 면적을 구분합니다. Cumulative Integral은 별도 그래프로 전환합니다. 곡선의 표시용 샘플과 조각별 적분 계산은 구분합니다.
- **Optimization / LSQ:** 변수의 Initial / Lower / Upper / Optimal Value와 Objective 또는 SSE·RMSE·Constraint Violation을 요약하고, 반복·정상성 진단은 접어 둡니다.

## 95% CI의 의미와 검토

95% Confidence Interval은 계수의 추정 불확실성을 설명하므로 RMSE나 R²가 대체하지 못합니다. 유한한 Degrees of Freedom에 맞춘 Student-t 임계값과 SVD 공분산을 사용합니다. 다항식 계수를 원래 변수 기준으로 변환할 때 공분산의 교차항도 포함합니다. 예를 들어 Estimate=2, SE=0.1, DOF=8이면 약 [1.769, 2.231]입니다.

선택한 회귀 모델과 독립·동일분산 정규 관측 오차 등의 가정 아래, 같은 방식으로 반복 생성한 구간의 약 95%가 참 계수를 포함한다는 의미입니다. 이번 구간에 참 계수가 95% 확률로 들어 있다는 주장, 미래 관측의 Prediction Interval, 모든 근 발견 확률, 수치 오차 상한과 다릅니다. 비선형 회귀의 CI는 Local Approximation입니다.

Origin 고정 계수·자유도 부족·활성 계수 경계·수렴 실패에서는 일반적인 CI를 표시하지 않습니다. 추가 반례인 `nlinfit y=a+abs(a)`와 `nlinfit y=max(a,0)`의 `a=0`에서는 중앙차분이 가짜 full rank를 만들 수 있었습니다. 최종점에서 자동미분이 실패하면 그 차분은 계산 보조에만 사용하고 SE·CI·식별 랭크를 표시하지 않도록 수정했습니다. 초기 반복에서만 차분을 사용하고 최종점은 매끄러운 사례는 CI를 유지합니다.

Prediction Interval·가중/상관 오차 회귀·동시 CI·nonlinear Bootstrap/Profile CI는 이번 구현에 포함하지 않았습니다. 현재 지원 범위는 [회귀 문서](FITTING_MODULE.md), 나머지 계산 한계는 [Known Issues](KNOWN_ISSUES.md)를 참고합니다.

## Verification

- 전체 단위 검사 **764개** 통과. 회귀 38개에는 SciPy Student-t 기준값, Cauchy 해석식, 닫힌 형태 공분산, NumPy 변환 공분산, 비매끄러운 CI 반례를 포함합니다.
- 교재 검사 10개는 각 모듈 예제를 실제 엔진으로 풀고 예상 결과를 확인하며, 독립 탭과 Markdown 원본 일치를 검사합니다.
- 브라우저 검사 19개는 English navigation, 모듈별 가이드·모바일·스크롤, 회귀 명령/CI 내보내기, ODE 재생·축·표, 적분 영역·정적분, 최적화, 기존 병합 시뮬레이션 불변성을 확인합니다.
- TypeScript 및 프로덕션 빌드, 핵심 코드 문서 4개 동기화 검사를 수행했습니다.
