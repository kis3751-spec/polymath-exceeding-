# Regression residuals and degree comparison · 2026-11-12

Linear / Polynomial, Multilinear, Nonlinear Regression과 LSQ 데이터 적합의 Report에 Residual Plot을 표시합니다. 잔차는 모든 보고서에서 **Observed − Predicted**이며, 입력 행 순서를 보존합니다. 양수는 모델의 과소 예측, 음수는 과대 예측입니다. 기본 X는 예측값이고 Plot residuals against에서 각 설명변수 또는 Observation row로 바꿀 수 있습니다. 행 번호를 시간이라고 가정하지 않습니다.

0 기준선과 점의 패턴을 함께 읽습니다. 곡률·부채꼴·순서 패턴은 누락한 모델 구조, 일정하지 않은 분산 또는 상관 오차를 살펴볼 근거이지 그 원인의 증명은 아닙니다. 종속변수를 변환했다면 잔차도 변환한 단위입니다. Stopped 결과는 마지막 유효 반복의 진단으로 표시합니다. 일반 잔차이며 표준화 잔차나 별도 검증 오차를 뜻하지 않습니다.

## Comparing polynomial degrees

1. Curve Fitting에서 데이터를 적합한 뒤 Report를 엽니다.
2. Compare Polynomial Degrees에서 1~12 중 두 개 이상을 선택하고 Compare Fits를 누릅니다.
3. 같은 관측 행·종속변수·보조식·파라미터·Through Origin 조건에서 후보들을 비교합니다. 비교하는 동안 현재 모델의 차수를 임의로 바꾸지 않습니다.
4. Fit Overlay로 측정점과 후보 곡선을, Residual Overlay로 후보별 잔차를 같은 축에서 비교합니다. 같은 차수는 두 그림에서 같은 색입니다. 범례로 각 후보를 숨기거나 표시합니다.
5. Use Degree를 누르면 Input의 polyfit 차수를 바꾸고 계수·Simulation·Report를 다시 계산합니다. 선택한 비교 차수 목록은 프로젝트와 계정별 자동 저장에 포함됩니다.

Training RMSE가 낮아도 고차식이 과적합할 수 있습니다. LOOCV RMSE는 한 행을 뺀 나머지 자료로 모델을 적합하고, 뺀 관측을 예측하는 절차의 오차입니다. 정규화 SVD 최소제곱의 hat matrix에서 leverage hᵢ를 구하고 PRESS 잔차 eᵢ/(1−hᵢ)를 이용합니다. 절편과 Origin 조건을 정확히 같은 설계행렬에 반영합니다. 이는 추정 계수에 선형인 Polynomial에만 적용합니다. Nonlinear Regression에 이 공식을 그대로 적용하지 않습니다.

유효한 LOOCV RMSE가 가장 작은 선택 후보를 추천하며 수치 반올림 수준에서 같은 점수이면 낮은 차수를 우선합니다. 같은 데이터에서의 Adjusted R²와 AIC도 표시합니다. 데이터 수 부족·랭크 부족으로 적합에 실패한 후보는 이유를 남깁니다. 자유도가 없거나 행 제외 시 랭크가 사라지는 단위 leverage·수치적 불안정·범위 초과이면 LOOCV를 미산정으로 표시하고 추천에 포함하지 않습니다. 모든 후보가 미산정이면 추천하지 않습니다. 점수를 0으로 대신하지 않습니다.

LOOCV도 모델 선택에 사용한 같은 자료의 내부 검증입니다. 외부 검증 데이터, 독립적인 일반화 성능 또는 외삽 정확도의 보장은 아닙니다. 시간·그룹 상관 데이터에는 별도의 블록·그룹 검증이 필요합니다. 현재 비교는 단일 설명변수 다항식의 선택 차수들에 한정됩니다.

## Saved reports and compatibility

Save Report의 Markdown에 원래 행 순서의 Observed / Predicted / Residual과 같은 후보 점수·미산정 사유를 포함합니다. 기존 CSV의 열과 원래 계산 결과를 바꾸지 않습니다. 특히 LSQ의 기존 `error` 열은 Predicted − Observed로 유지되며, 새 Report의 Residual 열은 Observed − Predicted라고 명시합니다. 표시 축 수식은 원래 수치·점수·CSV를 바꾸지 않고, 0 기준선에도 같은 표시 변환을 적용합니다.

계산은 기존 Worker에서 실행하며 최신 요청 ID와 입력 키가 일치한 결과만 표시합니다. 입력이 바뀌거나 계산이 진행 중이면 과거 보고서를 현재 결과로 내보내지 않습니다. 차수 비교를 요청하지 않으면 추가 후보를 적합하지 않습니다.

## Verification

수학·상태 검사 783개, 임시 DB 인증 검사 79개, HTTPS 브라우저 시나리오 15개와 프로덕션 빌드를 확인했습니다. PRESS 점수는 각 관측을 실제로 제외하고 다시 적합한 독립 계산과 대조했습니다. Origin 조건·큰 좌표 오프셋·보조식 파라미터·동일 점수·상수 관측값·데이터 수 부족·행 제외 시 랭크 부족을 포함합니다. 브라우저에서는 각 회귀와 LSQ의 잔차, 설명변수·행 선택, 0 기준선의 축 변환, 후보 색상 일치·범례, 실제 차수 적용, 프로젝트·Markdown 내보내기, 과거 결과 차단과 모바일 가로 넘침을 확인했습니다. 사용자 Codespace의 실행 중인 서버에는 업데이트 뒤 재시작해야 적용됩니다.
