const MANUAL_GITHUB_REPOSITORY_URL = "https://github.com/mathtjungsw/math-class-webtools";

const TOOL_GUIDES = {
  "몬티홀 딜레마 실험": {
    purpose: "직관으로 예상한 결과와 반복 실험에서 나타나는 확률을 비교하며 조건부 확률과 표본의 안정화를 이해합니다.",
    preparation: "도입에서는 문 세 개만 보여 준 뒤 ‘처음 고른 문을 끝까지 믿을까, 바꿀까?’를 가볍게 손들어 선택하게 해 보세요. 학생별 또는 모둠별 기기를 준비하고, 첫 예상과 그 이유를 짧게 남겨 두면 활동 후 생각의 변화를 확인하기 좋습니다.",
    studentSteps: "학생들은 문 하나를 고르고 염소 문이 공개된 뒤 유지 또는 변경을 결정합니다. 처음 몇 번의 승패보다 같은 전략을 충분히 반복했을 때 성공률이 어디로 모이는지, 두 전략의 기록 차이가 점차 선명해지는지를 살펴보게 해 주세요.",
    flow: "예상 공유 → 교사와 함께 2~3회 체험 → 모둠별로 ‘항상 유지’ 또는 ‘항상 변경’ 실험 → 결과 비교 → 처음 예상 돌아보기",
    teacherTips: "초반에는 전략을 섞지 말고 모둠별로 ‘항상 유지’와 ‘항상 변경’을 맡기면 차이가 더 선명하게 드러납니다.",
    questions: "활동 후에는 “처음 선택한 문이 당첨일 확률은 얼마였나요?”, “염소 문이 열린 뒤 나머지 확률은 어디로 갔다고 볼 수 있을까요?”를 물어 보세요. 마지막으로 “적은 횟수의 경험과 충분히 반복한 결과가 다를 때 무엇을 믿어야 할까요?”로 정리할 수 있습니다.",
    cautions: "몇 번의 결과만으로 결론 내리지 않도록 충분히 반복하고, 진행자가 당첨 문을 알고 염소 문을 연다는 조건을 강조하세요."
  },
  "조건부 확률 실험기": {
    purpose: "검사 정확도만으로 실제 양성 확률을 판단할 수 없음을 확인하고, 기저율·위양성·재검사의 관계를 탐구합니다.",
    preparation: "도입 화면에는 ‘정확도 99% 검사에서 양성이면 실제 환자일 확률도 99%일까?’라는 질문만 먼저 띄워 보세요. 계산 전에 각자 예상값을 적게 하고, 100명이나 1,000명 중 몇 명이라는 자연빈도 표현을 간단히 되짚으면 이후 화면을 읽기가 한결 수월합니다.",
    studentSteps: "학생들이 유병률과 검사 정확도를 직접 바꿀 때에는 환자 중 양성자와 비환자 중 양성자를 따로 세어 보게 하세요. 숫자를 움직일 때 전체 양성자 중 실제 환자의 비율이 어떻게 달라지는지, 재검사를 하면 어떤 집단이 남는지를 눈여겨보게 합니다.",
    flow: "직관적인 예상 제시 → 기본값을 함께 읽기 → 변수 하나씩 조절 → 자연빈도로 다시 계산 → 재검사 결과 비교 → 첫 예상 수정",
    teacherTips: "100명 또는 1,000명 중 몇 명인지 말로 읽게 하면 분모 혼동이 줄어듭니다. 한 번에 하나의 변수만 바꾸게 하세요.",
    questions: "정리할 때는 “양성인 사람 중 실제 환자는 몇 명인가요?”, “유병률이 낮아지면 같은 검사에서도 결과의 의미가 왜 달라질까요?”를 물어 보세요. 이어 “검사 정확도 하나만 듣고 판단하면 놓치는 정보는 무엇인가요?”로 기저율의 중요성을 학생의 말로 정리하게 합니다.",
    cautions: "의학적 진단 도구가 아니라 확률 학습용 모형임을 밝히고, 민감도·특이도와 양성 예측도를 구분하세요."
  },
  "이미지 지도학습 AI 만들기": {
    purpose: "직접 만든 학습 데이터로 분류 모델을 훈련하며 데이터의 양·다양성·편향이 성능에 미치는 영향을 경험합니다.",
    preparation: "도입에서는 같은 물건을 배경만 달리해 보여 주며 ‘AI는 물건과 배경 중 무엇을 보고 맞힐까?’를 묻는 것이 좋습니다. 구분할 두 범주와 촬영 규칙을 정하고 카메라 권한을 미리 확인하세요. 얼굴이나 이름처럼 개인을 식별할 수 있는 이미지는 모으지 않는다는 약속도 먼저 나눕니다.",
    studentSteps: "학생들은 범주별 이미지를 모아 1차 모델을 학습한 뒤 새로운 환경에서 예측을 시험합니다. 정확도 숫자만 보는 데 그치지 않고 어떤 사진에서 자주 틀리는지, 혼동 행렬의 어느 칸이 커지는지, 학습 자료를 어떻게 보완하면 결과가 달라지는지를 관찰하게 해 주세요.",
    flow: "분류 기준과 예상 단서 나누기 → 데이터 수집 → 1차 학습 → 낯선 배경에서 시험 → 오분류 원인 찾기 → 데이터 보완·재학습",
    teacherTips: "처음에는 배경이 치우친 데이터로 학습한 뒤 배경을 바꾸어 시험하면 데이터 편향을 쉽게 발견할 수 있습니다.",
    questions: "활동 후에는 “모델은 사물 자체와 배경 중 무엇을 단서로 삼았을까요?”, “정확도를 높이려면 어떤 사진을 더 모아야 할까요?”를 물어 보세요. “훈련 화면에서 높은 정확도가 실제 상황에서도 그대로 이어질까?”라는 질문으로 일반화와 데이터 편향까지 자연스럽게 연결할 수 있습니다.",
    cautions: "얼굴·이름 등 개인정보를 촬영하지 말고, 높은 정확도가 모든 상황에서 좋은 판단을 보장하지 않음을 짚어 주세요."
  },
  "감성 분석 AI 실습": {
    purpose: "문장을 벡터로 표현하고 코사인 유사도로 분류하는 과정을 통해 간단한 자연어 분류 원리를 이해합니다.",
    preparation: "도입에서는 뜻이 분명한 문장과 ‘정말 잘도 했네’처럼 맥락에 따라 감성이 달라지는 문장을 함께 보여 주세요. 학생에게 먼저 긍정·부정을 판단하게 한 뒤, 컴퓨터는 문장의 의미를 어떻게 수로 바꿀지 궁금증을 열어 두면 좋습니다. 사용할 예시 문장에는 개인정보가 없도록 확인합니다.",
    studentSteps: "학생들이 긍정·부정 학습 문장을 넣고 새 문장을 분석할 때에는 결과만 맞히기보다 단어 하나를 바꿀 때 벡터와 유사도가 어떻게 움직이는지 보게 하세요. 부정어, 강조 표현, 반어법에서 오분류가 생기는지도 비교하면 모델이 읽는 방식과 사람의 이해 차이가 드러납니다.",
    flow: "사람의 감성 판단 나누기 → 학습 문장 입력 → 새 문장 예측 → 표현을 조금씩 바꾸기 → 오분류 원인 토의 → 데이터 보완",
    teacherTips: "부정어, 반어법, 중의적 문장을 단계적으로 넣어 단순한 수치 모델의 한계를 토론하게 하면 좋습니다.",
    questions: "정리에서는 “두 문장이 가깝다는 것을 수학적으로 어떻게 나타낼 수 있을까요?”, “사람은 이해하지만 모델이 놓친 맥락은 무엇인가요?”를 물어 보세요. 마지막으로 “학습 문장이 달라지면 같은 문장의 판단도 달라질까?”를 던지면 데이터와 결과의 관계를 되짚을 수 있습니다.",
    cautions: "분석 결과를 사람의 실제 감정이나 성향 판단에 사용하지 말고, 입력 문장에 개인정보를 포함하지 않게 하세요."
  },
  "추세선으로 예측하기": {
    purpose: "산점도, 추세선, 결정계수의 의미를 연결하고 관측 범위 안팎의 예측이 갖는 차이와 한계를 이해합니다.",
    preparation: "도입에서는 자료를 입력하기 전에 두 변수의 이름만 제시하고 산점도의 모양과 관계의 방향을 예상하게 해 보세요. 관련성이 기대되는 실제 수치 자료를 준비하되 단위와 조사 범위를 함께 알려 주고, 어느 변수를 설명에 쓰고 어느 변수를 예측하려는지 먼저 확인합니다.",
    studentSteps: "학생들은 x, y 자료를 넣어 산점도와 추세선을 확인하고 새 값을 예측합니다. 점 하나를 크게 바꾸거나 이상치를 넣고 뺄 때 기울기와 결정계수가 얼마나 달라지는지, 관측 범위 안의 예측과 바깥의 예측이 어떻게 다른지를 집중해서 보게 해 주세요.",
    flow: "두 변수의 관계 예상 → 자료와 단위 확인 → 산점도·추세선 만들기 → 이상치 조작 → 예측값 비교 → 타당성과 한계 정리",
    teacherTips: "이상치를 넣고 빼며 기울기와 결정계수 변화를 비교하면 추세선이 자료에 민감하다는 점을 보여 주기 좋습니다.",
    questions: "활동 후에는 “결정계수가 높으면 한 변수가 다른 변수의 원인이라고 말할 수 있을까요?”, “관측 범위를 벗어난 예측은 왜 더 조심해야 할까요?”를 묻습니다. “이 추세선이 믿을 만하려면 자료에 대해 무엇을 더 알아야 할까요?”로 자료의 맥락까지 돌아보게 하세요.",
    cautions: "상관관계와 인과관계를 구분하고, 단위와 자료 범위를 확인하지 않은 무리한 외삽을 피하도록 안내하세요."
  },
  "마이너스 경매": {
    purpose: "경매와 점수 계산을 통해 음수의 덧셈·뺄셈을 익히고, 위험과 보상을 고려한 의사결정을 경험합니다.",
    preparation: "도입에서는 음수 카드 한 장을 보여 주고 ‘이 카드를 가져오면 내 점수는 어떻게 될까?’부터 계산하게 해 보세요. 2~10개 모둠을 만들고 교사용 화면으로 낙찰 절차를 한 번 시범 보입니다. 승리 조건과 입찰 제한 시간을 짧고 분명하게 안내하면 계산에 더 집중할 수 있습니다.",
    studentSteps: "학생들은 공개 카드의 가치와 현재 점수를 보고 입찰합니다. 낙찰 직전 예상한 점수와 실제 반영된 점수를 나란히 적게 하고, 남은 카드와 다른 모둠의 움직임에 따라 입찰 상한을 어떻게 바꾸는지 살펴보세요. 음수를 빼는 상황에서 부호를 어떻게 처리하는지도 좋은 관찰 지점입니다.",
    flow: "음수 카드로 점수 변화 예상 → 연습 경매 → 본 게임과 점수 기록 → 전략 조정 → 최종 점수 검산 → 선택 근거 공유",
    teacherTips: "입찰 전에 예상 최종 점수를 적게 하고, 낙찰 뒤 실제 변화와 비교시키면 연산 설명이 자연스럽게 나옵니다.",
    questions: "정리에서는 “이 카드를 가져오면 총점은 어떻게 변하나요?”, “현재 점수뿐 아니라 남은 카드를 고려하면 얼마까지 입찰할 수 있었나요?”를 묻습니다. 이어 “결과가 좋았던 선택은 계산도 타당했을까?”를 질문해 운과 합리적인 의사결정을 구분해 보세요.",
    cautions: "승패보다 계산 근거를 말하는 데 초점을 두고, 입찰 순서와 제한 시간을 명확히 정해 과열을 막으세요."
  },
  "베팅 게임": {
    purpose: "확률, 기대값, 중복 선택의 영향을 고려해 모둠 전략을 세우고 결과에 따라 전략을 수정합니다.",
    preparation: "도입에서는 보상이 큰 선택과 당첨 가능성이 높은 선택을 함께 보여 주고 어느 쪽에 걸지 빠르게 정하게 해 보세요. 모둠과 기록용 Google Sheets 환경을 확인한 뒤, 선택·베팅·정산 과정을 한 라운드만 시범으로 진행합니다. 실제 돈이 아닌 수업용 점수라는 점도 분명히 해 주세요.",
    studentSteps: "학생들은 모둠별 숫자와 베팅량을 정하고 추첨 결과를 기록합니다. 당첨 여부만 보지 말고 선택 당시 예상한 확률과 보상을 곱해 보게 하며, 다른 모둠과 선택이 겹칠 때 기대 수익이 어떻게 달라지는지를 관찰하게 하세요. 라운드가 쌓일수록 전략이 어떤 근거로 바뀌는지도 기록합니다.",
    flow: "두 선택 중 직관적 베팅 → 규칙 시범 → 라운드별 선택·추첨·기록 → 모둠 간 전략 비교 → 기대값 계산 → 전략 수정 이유 발표",
    teacherTips: "각 라운드 전에 선택 이유를 한 문장으로 기록하게 하면 결과론이 아니라 의사결정 과정을 평가할 수 있습니다.",
    questions: "활동 후에는 “당첨 확률과 보상 크기를 함께 보면 어떤 선택이 유리했나요?”, “다른 모둠의 선택이 내 전략에 어떤 영향을 주었나요?”를 물어 보세요. “한 번의 성공과 여러 라운드에서 좋은 전략은 같은가?”라는 질문으로 기대값의 의미를 정리할 수 있습니다.",
    cautions: "실제 금전과 연결하지 말고 수업용 점수만 사용하세요. 공유 시트 권한과 학생 이름 공개 범위도 미리 확인하세요."
  },
  "스트림스 수 추출기": {
    purpose: "무작위로 나오는 수를 제한된 칸에 배치하며 수의 대소 관계, 순서, 불확실성 속 의사결정을 연습합니다.",
    preparation: "도입에서는 1부터 30 사이의 수 세 개를 차례로 보여 주고 제한된 빈칸에 어디부터 놓을지 함께 결정해 보세요. 학생별 기록지와 필기구를 준비하고 사용할 숫자 덱과 카드 수를 설정합니다. 한 번 쓴 수는 옮길 수 없다는 규칙을 연습 카드로 확인하는 것이 중요합니다.",
    studentSteps: "학생들은 추출된 수를 빈칸 하나에 배치하며 오름차순 연결을 최대화합니다. 수 하나의 위치만 보기보다 남은 빈칸을 어떤 수 구간으로 나누고 있는지, 예상보다 크거나 작은 수가 나왔을 때 계획을 어떻게 조정하는지 보게 하세요. 중간 선택의 이유를 짝에게 설명하게 해도 좋습니다.",
    flow: "세 수로 배치 시범 → 연습 카드 3장 → 전체 게임 → 점수 계산 → 서로 다른 기록지 비교 → 수 구간 배치 전략 정리",
    teacherTips: "중간에 ‘지금 가장 아쉬운 배치’를 짝과 공유하게 하면 수 범위 분할 전략이 자연스럽게 드러납니다.",
    questions: "정리에서는 “빈칸의 위치를 정할 때 어떤 수 범위를 예상했나요?”, “같은 숫자 순서에서도 점수가 달라진 이유는 무엇인가요?”를 묻습니다. 마지막으로 “처음부터 다시 한다면 빈칸을 어떻게 나누어 생각할까?”를 질문해 불확실성 속 계획을 돌아보게 하세요.",
    cautions: "숫자 추출 뒤에는 배치를 바꾸지 않는 규칙을 일관되게 적용하고, 편집 덱의 중복·범위를 시작 전에 확인하세요."
  },
  "SET 게임": {
    purpose: "여러 속성을 동시에 비교하며 분류, 경우의 수, 논리적 조건인 ‘모두 같거나 모두 다름’을 탐구합니다.",
    preparation: "도입에서는 SET인 세 장과 거의 맞지만 한 속성만 어긋난 세 장을 나란히 보여 주고 차이를 찾아보게 하세요. 모양·색깔·투명도에서 ‘모두 같거나 모두 다름’이라는 조건을 속성별로 천천히 읽은 뒤 모둠별 기기를 나눠 줍니다. 색은 이름으로도 확인할 수 있게 안내합니다.",
    studentSteps: "학생들은 화면에서 세 장을 고르고 각 속성이 조건을 만족하는지 확인합니다. 빠르게 누르는 것보다 모양, 색깔, 투명도를 차례로 말하게 하고, 두 카드를 먼저 골랐을 때 세 번째 카드의 속성이 사실상 정해진다는 점을 발견하는지 살펴보세요. 틀린 조합도 어느 속성에서 깨졌는지 설명하게 합니다.",
    flow: "SET과 반례 비교 → 속성별 판정 연습 → 모둠 게임 → 틀린 조합 분석 → 두 카드로 세 번째 카드 예측 → 경우의 수로 확장",
    teacherTips: "빠르게 찾는 것보다 세 속성을 차례로 말하게 하세요. 세 번째 카드가 앞의 두 카드로 결정된다는 관찰로 확장할 수 있습니다.",
    questions: "활동 후에는 “두 카드를 골랐을 때 SET을 완성하는 세 번째 카드는 어떤 속성을 가져야 하나요?”, “‘두 개만 같음’이 허용되지 않는 이유는 무엇인가요?”를 묻습니다. “세 번째 카드가 하나로 정해진다는 사실을 전략에 어떻게 쓸 수 있을까?”로 탐색 방법까지 정리해 보세요.",
    cautions: "색 구분이 어려운 학생을 위해 모양과 투명도 표현을 함께 읽어 주고, 속성 조건을 빠뜨리지 않게 하세요."
  },
  "소수 체크 게임": {
    purpose: "합성수를 빠르게 제외하는 전략을 사용해 소수 판별 기준과 배수의 성질을 익힙니다.",
    preparation: "도입에서는 숫자판 일부만 보여 주고 ‘소수를 하나씩 찾는 것과 합성수를 한꺼번에 지우는 것 중 무엇이 빠를까?’를 물어 보세요. 소수의 정의와 1이 소수가 아닌 이유를 짚고, 2·3·5의 배수 판정법을 짧게 복습합니다. 모둠 안에서는 찾기와 검산 역할을 나누면 좋습니다.",
    studentSteps: "학생들은 25칸 숫자판에서 소수 9개를 찾습니다. 처음부터 모든 수를 나누어 보지 않고 짝수, 5의 배수, 3의 배수 순으로 후보가 얼마나 줄어드는지 보게 하세요. 남은 수는 어느 약수까지 확인하면 충분한지 생각하게 하고, 정답을 낼 때에는 소수인 근거 또는 합성수의 약수를 함께 말하게 합니다.",
    flow: "빠른 제외 방법 예상 → 배수 판정 복습 → 모둠별 숫자판 탐색 → 후보 수 검산 → 오답 원인 확인 → 효율적인 판별 순서 공유",
    teacherTips: "수를 하나씩 나누기보다 먼저 배수 판정으로 후보를 줄이게 하고, 오답은 어떤 약수를 놓쳤는지 찾게 하세요.",
    questions: "정리에서는 “어떤 수부터 제외하면 가장 많은 칸을 빠르게 지울 수 있었나요?”, “합성수임을 확인하려면 어디까지 나누어 보면 충분할까요?”를 묻습니다. “소수임을 보이는 일과 합성수임을 보이는 일은 어떻게 다른가?”로 판별 논리를 말하게 해 보세요.",
    cautions: "1을 소수로 처리하지 않도록 하고, 속도 경쟁 때문에 판별 근거가 생략되지 않게 점수 기준에 설명을 포함하세요."
  },
  "돼지 주사위 게임": {
    purpose: "계속 굴리기와 멈추기 사이에서 확률·기대값·위험을 비교하고 변형 규칙에 따른 최적 전략을 탐색합니다.",
    preparation: "도입에서는 턴 점수 15점을 가진 상황을 보여 주고 ‘지금 멈출까, 한 번 더 굴릴까?’를 즉석에서 선택하게 해 보세요. 모둠을 구성하고 목표 점수와 기본 규칙을 정한 뒤, 누적 점수와 1이 나왔을 때 사라지는 점수를 한 턴 시범으로 분명히 보여 줍니다.",
    studentSteps: "학생들은 주사위를 굴릴 때마다 현재 점수를 확보할지 위험을 감수할지 결정합니다. 단순히 이긴 횟수보다 몇 점에서 멈추기로 했는지, 그 전략이 여러 판에서 어떤 평균 결과를 냈는지를 기록하게 하세요. 목표 점수에 가까워지거나 상대 점수가 달라질 때 선택 기준이 바뀌는지도 중요한 관찰 지점입니다.",
    flow: "멈춤 선택으로 도입 → 기본 규칙 체험 → 모둠별 전략 선언 → 여러 판 기록 → 평균 결과 비교 → 변형 규칙에서 전략 재검토",
    teacherTips: "‘몇 점이면 멈춘다’와 같은 전략을 미리 선언하게 하고 실제 결과를 모으면 감이 아닌 데이터로 토론할 수 있습니다.",
    questions: "활동 후에는 “한 번 더 굴렸을 때 얻을 수 있는 이익과 잃을 수 있는 것은 무엇인가요?”, “목표 점수나 상대 점수에 따라 전략은 왜 달라졌나요?”를 묻습니다. “한 판에서 진 전략도 좋은 전략일 수 있을까?”로 확률적 판단과 실제 결과를 구분해 주세요.",
    cautions: "변형 규칙을 적용할 때는 한 번에 한 요소만 바꾸고, 운에 따른 한 판의 결과를 최적 전략으로 일반화하지 않게 하세요."
  },
  "파라오 코드": {
    purpose: "여러 주사위 수에 사칙연산과 괄호를 적용해 목표 수를 만들며 수 감각과 다양한 식 표현을 기릅니다.",
    preparation: "도입에서는 같은 세 수로 목표 수를 만드는 서로 다른 식 두 개를 보여 주고 어느 풀이가 먼저 보였는지 이야기해 보세요. 모둠별 기록지와 기기를 준비하고 사용할 수 있는 연산, 각 주사위 수의 사용 횟수, 괄호와 난이도별 배점 규칙을 예시 한 문제로 확인합니다.",
    studentSteps: "학생들은 6면·8면·12면 주사위 결과를 조합해 목표 수를 만드는 식을 씁니다. 답을 빨리 찾는 데 그치지 않고 어떤 수끼리 먼저 묶었는지, 연산 순서나 괄호를 바꾸면 다른 식이 되는지 살펴보게 하세요. 식을 제출하기 전에는 모든 수를 정확히 한 번씩 썼는지 서로 검산하게 합니다.",
    flow: "서로 다른 식 비교 → 쉬운 문제 공동 해결 → 난이도별 모둠 도전 → 짝 모둠 검산 → 다양한 식 전시 → 유용했던 수 감각 공유",
    teacherTips: "답만 외치기보다 식을 먼저 쓰게 하고, 같은 목표를 만드는 서로 다른 식에 추가 가치를 주면 사고가 풍성해집니다.",
    questions: "정리에서는 “어떤 수를 먼저 결합하면 목표 수에 가까워졌나요?”, “같은 주사위 수로 다른 연산 순서의 식도 만들 수 있나요?”를 묻습니다. “막혔을 때 목표 수에서 거꾸로 생각하는 방법은 어떻게 도움이 되었나?”로 문제 해결 전략을 정리해 보세요.",
    cautions: "주사위 수의 중복 사용이나 누락 여부, 괄호와 연산 순서를 함께 검산하게 하고 난이도 선택이 편중되지 않게 하세요."
  },
  "독점 보드게임": {
    purpose: "가격 선택과 시장 조합에 따른 순이익을 분석하며 함수적 사고, 최적화, 경쟁 상황의 전략적 의사결정을 경험합니다.",
    preparation: "도입에서는 같은 상품을 파는 두 팀이 높은 가격과 낮은 가격 중 무엇을 택할지 짧게 예상하게 해 보세요. 3~8개 팀을 구성하고 A·B·C 가격 조합에 따른 순이익표를 함께 한 줄 읽습니다. 12개월 진행 시간, 선택 마감, 공개 순서와 제약 조건을 미리 정하면 게임이 매끄럽습니다.",
    studentSteps: "학생들은 매월 시장 상황과 누적 이익을 보고 가격을 정합니다. 우리 팀의 선택만 보지 않고 상대가 무엇을 고를 것으로 예상했는지, 실제 조합에서 순이익이 왜 그렇게 나왔는지를 기록하게 하세요. 단기 이익을 높이는 선택과 여러 달 동안 안정적으로 이익을 쌓는 선택이 달라지는지도 관찰합니다.",
    flow: "가격 선택 직관 나누기 → 순이익표 읽기 → 연습 월 진행 → 12개월 선택·기록 → 누적 이익 비교 → 전략 변화의 근거 발표",
    teacherTips: "선택 제출 전에 예상 상대 선택과 근거를 기록시키면 게임 이론적 사고와 사후 분석이 더 선명해집니다.",
    questions: "활동 후에는 “우리 팀에 유리한 가격이 다른 팀의 선택에 따라 왜 달라졌나요?”, “한 달의 최대 이익과 12개월 누적 이익을 높이는 전략은 어떻게 달랐나요?”를 묻습니다. “모든 팀이 합리적으로 선택해도 모두에게 좋은 결과가 나올까?”로 전략적 상호작용을 정리하세요.",
    cautions: "가격 선택 마감과 공개 순서를 공정하게 유지하고, 순이익 계산 및 제약 조건 누락을 매 라운드 확인하세요."
  },
  "야구 게임 시뮬레이터": {
    purpose: "실제 타자 자료를 바탕으로 조건부 확률을 해석하고, 라인업 구성과 반복 시뮬레이션으로 확률 모형의 변동성을 경험합니다.",
    preparation: "도입에서는 타율이 높은 타자를 무조건 1번에 놓는 것이 좋을지 먼저 투표해 보세요. 야구의 기본 득점과 주자 상황을 간단히 안내하고, 2025 KBO 자료의 각 수치가 어떤 조건에서 얻은 확률인지 함께 읽습니다. 야구에 익숙하지 않은 학생에게는 출루와 아웃만으로 단순화해 설명해도 좋습니다.",
    studentSteps: "학생들은 타자 자료를 비교해 라인업을 만들고 9이닝 경기를 실행합니다. 한 경기의 승패에 머물지 말고 같은 라인업을 여러 번 돌렸을 때 평균 득점과 결과의 퍼짐이 어떻게 나타나는지 보게 하세요. 주자 상황이 달라질 때 같은 타자의 결과 확률이 바뀌는지도 화면에서 확인합니다.",
    flow: "라인업 직관 투표 → 데이터 항목 읽기 → 라인업 가설 세우기 → 한 경기 체험 → 반복 시뮬레이션 → 평균과 변동 비교 → 전략 평가",
    teacherTips: "한 경기의 승패보다 동일 라인업을 여러 번 실행한 평균 결과를 비교하게 하면 확률적 변동을 이해하기 쉽습니다.",
    questions: "정리에서는 “주자가 있는 상황에서 같은 타자의 결과 확률은 어떻게 달라졌나요?”, “좋은 타자를 앞에 모으는 것이 항상 최선이었나요?”를 묻습니다. “한 경기 결과와 여러 경기의 평균 중 라인업을 평가할 때 무엇을 더 믿어야 할까?”로 확률 모형의 변동성을 정리하세요.",
    cautions: "실제 선수 능력을 단정하는 평가로 사용하지 말고, 데이터 시점과 모형에 포함되지 않은 경기 요인이 있음을 밝혀 주세요."
  },
  "파일명 일괄 수정기": {
    purpose: "과제·평가 자료처럼 많은 파일의 이름을 일정한 규칙으로 빠르고 안전하게 정리합니다.",
    preparation: "수업 자료나 과제 파일이 뒤섞인 폴더를 예로 보여 주고, ‘나중에 한눈에 찾으려면 이름에 어떤 정보가 필요할까?’부터 정해 보세요. 실제 작업 전에는 원본을 별도 폴더에 복사하고, 학번·이름·차시처럼 남길 요소와 구분 기호, 중복 이름 처리 방식을 메모해 둡니다.",
    studentSteps: "도구에 파일이나 폴더를 불러온 뒤 변경 규칙을 넣고 미리보기를 확인합니다. 교사는 첫 파일과 마지막 파일, 예외적인 이름이 있는 파일을 함께 대조해 보세요. 규칙이 모든 파일에 같은 방식으로 적용되는지, 빈 이름이나 중복 이름이 생기지 않는지를 확인한 뒤에만 실행하도록 안내합니다.",
    flow: "정리하기 어려운 파일명 사례 보기 → 이름 규칙 설계 → 원본 백업 → 소량 파일로 미리보기 → 전체 적용 → 변경 결과와 예외 확인",
    teacherTips: "학번 자릿수나 구분 기호처럼 실수가 잦은 요소를 작은 파일 묶음으로 먼저 시험한 뒤 전체에 적용하세요.",
    questions: "작업 후에는 “모든 파일에 공통으로 적용한 규칙은 무엇인가요?”, “중복되거나 비어 있는 이름은 어떻게 처리해야 안전할까요?”를 확인하세요. “몇 달 뒤 다른 사람이 이 폴더를 보아도 파일을 찾을 수 있을까?”를 기준으로 이름 규칙의 실용성을 점검하면 좋습니다.",
    cautions: "미리보기를 건너뛰지 말고 원본 백업을 유지하세요. 학생 이름 등 개인정보가 포함된 화면을 공유하지 않도록 주의하세요."
  },
  "문항 배점 생성기": {
    purpose: "문항 수와 총점, 난이도 비율 등의 조건을 만족하는 배점 조합을 효율적으로 만들고 검토합니다.",
    preparation: "도입에서는 같은 100점 시험이라도 문항별 배점이 달라지면 평가의 무게가 어떻게 달라지는지 간단한 두 배점표로 비교해 보세요. 평가 계획에 따른 총점, 문항 수, 선택형·서답형 구분, 난이도 비율, 허용할 배점 단위를 먼저 한곳에 정리해 둡니다.",
    studentSteps: "조건을 입력해 여러 배점안을 생성한 뒤 총점만 맞는지 보는 데 그치지 말고 영역별 합계와 난이도 비율을 함께 확인합니다. 높은 배점이 실제로 중요한 성취기준이나 사고가 많이 필요한 문항에 배치되었는지 살펴보고, 필요하면 조건을 조정해 다시 생성한 뒤 CSV로 저장하세요.",
    flow: "두 배점표 비교 → 평가 조건 정리 → 배점안 생성 → 총점·영역·난이도 검증 → 문항 내용과 대조 → 조정안 저장",
    teacherTips: "자동 생성 결과를 그대로 쓰기보다 성취기준 중요도와 실제 문항 난이도에 맞는지 마지막에 반드시 사람이 검토하세요.",
    questions: "마무리에서는 “생성된 배점이 평가하려는 성취기준의 중요도를 반영하나요?”, “같은 총점에서도 배점 구성이 달라지면 학생의 결과에 어떤 영향을 줄까요?”를 점검하세요. “자동 생성 결과에서 반드시 교사가 다시 판단해야 할 부분은 무엇인가?”도 함께 확인합니다.",
    cautions: "학교 평가 규정과 소수점 사용 기준을 확인하고, 생성 결과의 합계 및 선택형·서답형 점수를 교차 검산하세요."
  },
  "채점용 학생 과제 통합 뷰어": {
    purpose: "여러 학생의 과제 파일을 한 화면에서 순서대로 확인하며 기준별 점수와 피드백을 일관되게 기록합니다.",
    preparation: "채점을 시작하기 전에 서로 다른 수준의 대표 과제 두세 개를 먼저 보며 기준의 의미와 점수 간격을 정해 두세요. 과제 파일 형식과 이름 규칙을 통일하고, 평가 기준·배점·메모 방식과 개인정보가 포함된 자료의 보관 위치를 확인합니다. 원본 파일은 별도로 유지하는 것이 안전합니다.",
    studentSteps: "학생별 제출물을 한 화면에서 넘겨 보며 기준별 점수와 짧은 근거 메모를 함께 남깁니다. 초반과 후반의 채점 기준이 달라지지 않는지 중간마다 대표 과제로 되돌아가 확인하고, 미제출·열리지 않는 파일·이상 점수는 별도 표시해 두세요. 종료 전에는 누락을 검토하고 엑셀로 저장합니다.",
    flow: "대표 과제로 기준 맞추기 → 파일 일괄 불러오기 → 기준별 점수와 근거 기록 → 중간 보정 → 누락·이상값 확인 → 엑셀 저장·백업",
    teacherTips: "대표 과제 몇 개로 기준을 먼저 보정하고, 일정한 간격으로 저장 파일을 내려받아 진행 상황을 백업하세요.",
    questions: "채점 후에는 “같은 기준을 모든 과제에 일관되게 적용했나요?”, “메모만 보아도 나중에 점수의 근거를 다시 설명할 수 있나요?”를 확인하세요. “특정 학생의 순서나 인상 때문에 판단이 달라진 지점은 없었나?”를 돌아보면 채점의 신뢰도를 높일 수 있습니다.",
    cautions: "학생 개인정보가 있는 화면을 공개하지 말고, 브라우저를 닫기 전에 반드시 결과를 저장하세요. 원본 과제 파일도 별도로 보관하세요."
  },
  "PDF 파일 분할기": {
    purpose: "한 PDF를 원하는 페이지 범위로 나누어 수업 자료·학생별 자료·단원별 파일을 간편하게 정리합니다.",
    preparation: "도입에서는 한 권으로 묶인 자료를 단원별 또는 학생별로 나누어야 하는 상황을 떠올리고, 파일을 어떤 기준으로 자르면 다시 찾기 쉬울지 먼저 정해 보세요. 원본 PDF를 백업하고 전체 페이지 수, 시작·끝 페이지와 결과 파일명을 메모합니다. 암호화된 파일은 미리 열림 여부를 확인합니다.",
    studentSteps: "PDF를 불러와 분할 기준이나 페이지 범위를 지정한 뒤 결과 목록에서 첫 페이지와 마지막 페이지를 확인합니다. 범위 사이에 빠지거나 겹친 페이지가 없는지, 생성될 파일명이 서로 구분되는지를 살펴보세요. ZIP을 내려받은 뒤에는 첫 파일과 마지막 파일을 실제로 열어 보는 것까지 작업에 포함합니다.",
    flow: "자료를 나눌 기준 정하기 → 원본 백업 → 전체 페이지와 범위 기록 → 분할 결과 미리 확인 → ZIP 다운로드 → 처음·마지막 파일 검수",
    teacherTips: "페이지 수가 적은 자료로 먼저 시험하고, 내려받은 ZIP 안의 첫 파일과 마지막 파일을 열어 범위가 맞는지 확인하세요.",
    questions: "작업 후에는 “자료를 어떤 기준으로 나누어야 이후 배포와 관리가 쉬울까요?”, “모든 원본 페이지가 빠짐없이 한 번씩 포함되었나요?”를 확인하세요. “파일을 받은 사람이 이름만 보고도 내용을 예상할 수 있을까?”까지 점검하면 실제 수업 배포에서 실수가 줄어듭니다.",
    cautions: "민감한 문서는 공용 기기에서 처리하지 말고, 잘못된 범위로 원본 일부가 빠지지 않았는지 확인한 뒤 배포하세요."
  }
};

const GUIDE_SECTION_LABELS = [
  ["purpose", "수업 활용 목적"],
  ["preparation", "수업 전 준비"],
  ["studentSteps", "학생 사용 방법"],
  ["flow", "추천 수업 흐름"],
  ["teacherTips", "교사용 진행 팁"],
  ["questions", "핵심 발문"],
  ["cautions", "주의할 점"]
];

function inferGithubRepositoryUrl() {
  const host = window.location.hostname;

  if (!host.endsWith(".github.io")) return "";

  const owner = host.replace(".github.io", "");
  const firstPath = window.location.pathname.split("/").filter(Boolean)[0];
  const repo = firstPath || `${owner}.github.io`;

  return `https://github.com/${owner}/${repo}`;
}

function wireGithubLinks() {
  const githubUrl = MANUAL_GITHUB_REPOSITORY_URL || inferGithubRepositoryUrl();

  document.querySelectorAll("[data-github-link]").forEach((link) => {
    if (!githubUrl) {
      link.hidden = true;
      return;
    }

    link.href = githubUrl;
  });
}

function wireGuideModal() {
  const modal = document.querySelector("[data-guide-modal]");
  const dialog = modal?.querySelector(".guide-modal__dialog");
  const title = modal?.querySelector("#guide-modal-title");
  const content = modal?.querySelector("[data-guide-content]");
  if (!modal || !dialog || !title || !content) return;

  let triggerButton = null;

  function closeGuide() {
    modal.hidden = true;
    document.body.classList.remove("is-modal-open");
    triggerButton?.focus();
    triggerButton = null;
  }

  function openGuide(toolTitle, button) {
    const guide = TOOL_GUIDES[toolTitle];
    if (!guide) return;

    title.textContent = `${toolTitle} 설명서`;
    content.replaceChildren(...GUIDE_SECTION_LABELS.map(([key, label]) => {
      const section = document.createElement("section");
      section.className = "guide-section";

      const heading = document.createElement("h3");
      heading.textContent = label;
      const paragraph = document.createElement("p");
      paragraph.textContent = guide[key];

      section.append(heading, paragraph);
      return section;
    }));

    triggerButton = button;
    modal.hidden = false;
    document.body.classList.add("is-modal-open");
    dialog.focus();
  }

  document.querySelectorAll(".tool-card").forEach((card) => {
    const toolTitle = card.querySelector("h3")?.textContent.trim();
    const footer = card.querySelector(".tool-footer");
    if (!toolTitle || !footer || !TOOL_GUIDES[toolTitle]) return;

    let actions = footer.querySelector(".tool-actions");
    if (!actions) {
      actions = document.createElement("div");
      actions.className = "tool-actions";
      footer.querySelectorAll(":scope > a").forEach((link) => actions.append(link));
      footer.append(actions);
    }

    const oldGuideLink = actions.querySelector(".guide-link");
    if (oldGuideLink) oldGuideLink.remove();

    const button = document.createElement("button");
    button.className = "guide-button";
    button.type = "button";
    button.textContent = "설명서 보기";
    button.setAttribute("aria-label", `${toolTitle} 설명서 보기`);
    button.addEventListener("click", () => openGuide(toolTitle, button));
    actions.prepend(button);
  });

  modal.querySelectorAll("[data-guide-close]").forEach((element) => {
    element.addEventListener("click", closeGuide);
  });

  document.addEventListener("keydown", (event) => {
    if (modal.hidden) return;

    if (event.key === "Escape") {
      closeGuide();
      return;
    }

    if (event.key === "Tab") {
      const focusable = [...dialog.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")]
        .filter((element) => !element.disabled && !element.hidden);
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
}

function selectFilter(filter, updateHash = false) {
  const selectedButton = document.querySelector(`[data-filter="${filter}"]`);
  if (!selectedButton) return;

  document.querySelectorAll("[data-filter]").forEach((button) => {
    const isSelected = button === selectedButton;
    button.classList.toggle("is-active", isSelected);
    button.setAttribute("aria-selected", String(isSelected));
  });

  let visibleCount = 0;
  document.querySelectorAll("[data-tool-category]").forEach((card) => {
    const isVisible = filter === "all" || card.dataset.toolCategory === filter;
    card.classList.toggle("is-hidden", !isVisible);
    card.setAttribute("aria-hidden", String(!isVisible));
    if (isVisible) visibleCount += 1;
  });

  document.querySelectorAll("[data-tool-section]").forEach((section) => {
    const hasVisibleCards = Boolean(section.querySelector("[data-tool-category]:not(.is-hidden)"));
    section.classList.toggle("is-hidden", !hasVisibleCards);
    section.setAttribute("aria-hidden", String(!hasVisibleCards));
  });

  document.querySelector(".empty-message").hidden = visibleCount !== 0;

  if (updateHash) {
    const nextHash = filter === "all" ? "tools" : filter;
    window.history.replaceState({}, "", `#${nextHash}`);
  }
}

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => selectFilter(button.dataset.filter, true));
});

const initialFilter = window.location.hash.slice(1);
selectFilter(document.querySelector(`[data-filter="${initialFilter}"]`) ? initialFilter : "all");
wireGithubLinks();
wireGuideModal();
