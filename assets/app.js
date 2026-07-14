const MANUAL_GITHUB_REPOSITORY_URL = "https://github.com/mathtjungsw/math-class-webtools";

const TAG_META = {
  common: { label: "공통", group: "subject" },
  "middle-school-1": { label: "중학교 수학1", group: "subject" },
  "middle-school-2": { label: "중학교 수학2", group: "subject" },
  "middle-school-3": { label: "중학교 수학3", group: "subject" },
  "common-math1": { label: "공통수학1", group: "subject" },
  "probability-statistics": { label: "확률과 통계", group: "subject" },
  "ai-math": { label: "인공지능 수학", group: "subject" },
  "economic-math": { label: "경제 수학", group: "subject" },
  "math-game": { label: "수학 게임", group: "format" },
  simulation: { label: "시뮬레이션", group: "format" },
  visualization: { label: "시각화·탐구", group: "format" },
  "ai-data-practice": { label: "AI·데이터 실습", group: "format" },
  "work-automation": { label: "업무 자동화", group: "format" },
  "coordinate-geometry": { label: "좌표·도형", group: "topic" },
  "ratio-proportion": { label: "비·비율", group: "topic" },
  "sound-waves": { label: "소리·파동", group: "topic" },
  "number-operations": { label: "수와 연산", group: "topic" },
  probability: { label: "확률", group: "topic" },
  statistics: { label: "통계", group: "topic" },
  ai: { label: "인공지능", group: "topic" },
  "finance-economy": { label: "금융·경제", group: "topic" },
  "logic-reasoning": { label: "논리·추론", group: "topic" },
  "history-culture": { label: "수학사·문화", group: "topic" },
  "assessment-grades": { label: "평가·성적", group: "topic" },
  "file-data-management": { label: "파일·자료 관리", group: "topic" },
  "class-use": { label: "수업용", group: "purpose" },
  "school-work": { label: "학교 업무용", group: "purpose" }
};

const CLICK_STATS_CONFIG = window.CLICK_STATS_CONFIG || {};
const CLICK_STATS_ENDPOINT = String(CLICK_STATS_CONFIG.endpoint || "").trim();
const CLICK_STATS_TIMEOUT_MS = Number(CLICK_STATS_CONFIG.requestTimeoutMs) || 5000;
const CLICK_STATS_DUPLICATE_WINDOW_MS = Number(CLICK_STATS_CONFIG.duplicateWindowMs) || 3000;

const TOOL_GUIDES = {
  "황금비 측정 실험실": {
    usage: "예시 사진을 선택하거나 ‘사진 추가’로 직접 촬영한 사진을 불러옵니다. ‘사각형’에서는 두 꼭짓점 A·B로 수평·수직 사각형을 만들고 긴 변 ÷ 짧은 변을 계산합니다. ‘선분’에서는 전체 선분 A–B를 먼저 만든 뒤 분할점 P를 지정해 긴 부분 ÷ 짧은 부분과 전체 ÷ 긴 부분을 함께 계산합니다.",
    tips: "사진 회전·이동·확대는 사진에만 적용되고 측정점과 도형은 화면에 고정됩니다. 사진의 경계를 사각형이나 선분에 맞춘 뒤 측정하세요. ↶ 90°와 90° ↷ 버튼으로 빠르게 회전하거나 회전 슬라이더로 −180°부터 180°까지 1° 단위로 기울기를 맞출 수 있습니다. 측정 뒤 A·B·P 점을 끌어 세밀하게 조정할 수 있습니다.",
    purpose: "자연물·건축물·생활용품의 사각형 비율과 선분의 황금분할을 직접 측정해 황금비 φ ≈ 1.618과 비교합니다. ‘황금비처럼 보인다’는 인상과 실제 측정값을 구분하고, 측정 위치에 따라 값이 달라지는 이유를 수치로 설명하는 탐구 활동에 활용합니다.",
    preparation: "학생이 측정할 사진을 준비하거나 내장된 해바라기·고전 건축·노트 예시를 사용하세요. 사진에서 무엇의 경계를 잴지 먼저 정하고, 긴 변 ÷ 짧은 변으로 비율을 계산한다는 약속과 황금비 1.618의 의미를 간단히 확인합니다.",
    studentSteps: "사진 선택 → 사각형 또는 선분 측정 선택 → 사진만 회전·이동해 경계 맞추기 → 사각형의 두 꼭짓점 또는 선분 A–B와 분할점 P 지정 → 두 비율 기록 → 점 위치를 조정해 값의 변화 관찰 → 다른 결과와 비교 → 황금비에 가깝다고 판단한 근거 설명의 순서로 진행합니다.",
    flow: "황금비일 것 같은 대상 예상 → 사각형과 선분 황금분할의 차이 확인 → 사진만 회전해 측정선에 맞추기 → 사각형 비율 측정 → A–P–B 선분 분할 측정 → 기준 도형·분할점 관찰 → 결과 발표와 ‘가깝다’의 기준 토론",
    teacherTips: "처음부터 황금비라고 알려 주기보다 학생들이 먼저 예상하고 측정하게 하세요. 같은 사진을 여러 모둠이 재면 선택한 경계에 따라 값이 달라질 수 있으므로, 숫자만 비교하지 말고 어디를 측정했는지 함께 설명하게 하면 측정의 타당성을 다루기 좋습니다.",
    questions: "사각형은 어떤 두 점을 경계로 정했나요? 선분의 P를 움직일 때 긴÷짧은과 전체÷긴은 어떻게 변하나요? 두 비율이 같아지는 지점의 값은 얼마인가요? 자연이나 건축에 황금비가 있다는 주장을 한 번의 측정만으로 확정할 수 있을까요?",
    cautions: "사진의 원근, 기울기, 렌즈 왜곡과 모호한 경계 때문에 측정값이 실제 대상의 비율과 다를 수 있습니다. 해바라기 나선이나 특정 건축물이 반드시 황금비라는 뜻은 아니며, 예시 사진은 측정과 비판적 검토를 위한 탐구 자료입니다. 업로드한 사진은 서버로 전송되지 않고 현재 브라우저 안에서만 처리됩니다."
  },
  "표본추출 스튜디오": {
    purpose: "모집단에서 표본을 반복 추출하며 표본평균의 변동, 표본 크기와 표준오차의 관계, 편향된 추출의 영향, 신뢰구간의 의미를 시각적으로 탐구합니다. 같은 모집단에서도 표본마다 결과가 달라진다는 사실과 공정한 표집 설계의 중요성을 함께 이해할 수 있습니다.",
    preparation: "첫 활동은 ‘수학 시험 점수’, 모집단 1,000명, 표본 크기 30명, 단순무작위추출, 신뢰수준 95%로 시작하면 좋습니다. 비교 활동에서는 표본 크기·추출 방법·신뢰수준 가운데 한 조건만 바꾸어 결과 차이의 원인을 분명히 하세요.",
    studentSteps: "예시 상황을 고르고 모집단 크기와 모양을 확인합니다. 표본 크기와 추출 방법을 정한 뒤 표본을 한 번 뽑아 표본평균, 오차, 표준오차와 신뢰구간을 읽습니다. 이어 100회 또는 1,000회 반복하여 표본평균의 분포와 신뢰구간 적중률을 관찰하고 조건을 바꾸어 비교합니다.",
    flow: "표본평균 예상 → 표본 한 번 추출 → 모평균과 오차 확인 → n=10과 n=100 반복 표집 비교 → 편향된 추출 실험 → 90%·95%·99% 신뢰구간 비교 → 탐구 질문 토론",
    teacherTips: "먼저 모평균을 보지 않고 학생들이 표본만으로 값을 예상하게 해 보세요. 표본 크기를 늘리면 무작위 오차는 줄지만 ‘큰 값 위주 추출’처럼 뽑는 방법이 편향되면 큰 표본도 틀릴 수 있다는 점을 강조하면 표본 크기와 대표성을 구분하기 좋습니다. 실험 번호를 같게 두면 조건 비교가 더 선명합니다.",
    questions: "표본 크기가 커질수록 표본평균 분포의 폭은 왜 좁아질까요? 큰 값 위주로 뽑은 표본은 표본 수를 늘려도 왜 모평균에 가까워지지 않을까요? 신뢰수준을 높이면 신뢰구간의 폭과 적중률은 각각 어떻게 변하나요? ‘95% 신뢰구간’에서 95%는 무엇을 뜻하나요?",
    cautions: "이 웹툴의 모집단은 수업을 위해 단순화한 가상 자료입니다. 실제 조사는 표본틀, 무응답, 측정 문항, 층화와 군집 구조 등을 함께 고려해야 합니다. 신뢰구간은 개별 구간에 모평균이 들어갈 확률이 95%라는 뜻이 아니라, 같은 절차를 반복할 때 만들어진 구간의 약 95%가 모평균을 포함한다는 뜻으로 지도해 주세요."
  },
  "유전 확률 시뮬레이터": {
    purpose: "두 부모의 유전자형으로 F1의 이론 확률을 구하고, 무작위로 만들어진 가상 자녀와 여러 세대 집단의 결과를 비교합니다. 퍼넷 사각형, 표현형 분포, 대립유전자 빈도 그래프를 연결해 확률과 통계적 변동을 함께 탐구할 수 있습니다.",
    preparation: "완전 우성, 불완전 우성, 공우성, 복대립, X-연관 유전 가운데 수업 주제에 맞는 모형을 고르세요. 1차 활동은 100명·5세대로 시작하고, 비교 활동에서는 개체 수나 실험 번호 중 한 가지만 바꾸면 차이를 해석하기 좋습니다.",
    studentSteps: "형질과 부모 유전자형을 선택한 뒤 관찰 세대와 세대별 개체 수를 정합니다. 새로운 세대 만들기를 누르고 F1 퍼넷 사각형과 가상 자녀 20명을 먼저 비교합니다. 이어 세대별 표현형 막대와 대립유전자 빈도 그래프를 읽고, 실험 번호를 바꾸어 결과의 흔들림을 확인합니다.",
    flow: "유전 모형과 기호 확인 → 부모 유전자형 선택 → F1 이론 확률 예상 → 가상 자녀 표본 관찰 → 여러 세대 집단 시뮬레이션 → 집단 크기별 변동 비교 → 결과 해석 공유",
    teacherTips: "학생들이 ‘75%이면 네 아이 중 정확히 세 명’이라고 오해하지 않도록 20명 표본과 이론 확률의 차이를 먼저 말하게 하세요. 같은 부모라도 실험 번호를 바꾸면 결과가 달라지고, 세대별 개체 수를 줄이면 유전적 부동에 해당하는 우연한 변동이 더 선명하게 나타납니다.",
    questions: "퍼넷 사각형의 이론 비율과 가상 자녀 20명의 비율은 왜 다를까요? 개체 수가 20명과 500명일 때 어느 집단의 대립유전자 빈도가 더 크게 흔들리나요? 우성 형질이 반드시 세대를 지날수록 많아진다고 말할 수 있을까요?",
    cautions: "이 웹툴은 교과 개념을 위한 단순화 모형입니다. 실제 사람의 외모·능력·건강은 여러 유전자와 환경의 영향을 함께 받으므로 개인 예측이나 의학적 판단에 사용하지 않습니다."
  },
  "수학 방탈출 제작기": {
    purpose: "교사가 준비한 수학 문제를 순차형 탈출 미션으로 바꾸어 문제 해결, 풀이 점검, 모둠 의사소통을 자연스럽게 연결합니다. 정답의 형태에 따라 숫자 키패드·문자 암호·선택형 자물쇠가 자동으로 만들어지고, 각 정답에서 얻은 코드 조각을 모아 최종 탈출 코드를 완성합니다.",
    preparation: "수업 목표에 맞는 문제 3~5개와 정답을 준비하세요. 문제는 쉬운 것에서 어려운 것 순으로 배치하고, 힌트는 ‘접근 방향 → 핵심 개념 → 계산 직전 도움’의 세 단계로 적으면 좋습니다. 예시 불러오기로 진행 방식을 먼저 체험한 뒤 제목, 도입 이야기, 제한 시간을 학급에 맞게 바꾸세요.",
    studentSteps: "모둠 이름을 입력하고 미션을 시작합니다. 현재 문제를 풀어 자물쇠에 정답을 입력하고, 막히면 힌트를 한 단계씩 엽니다. 정답이면 공개되는 코드 조각을 기록한 뒤 다음 미션으로 이동합니다. 모든 문제를 해결한 후 모은 조각을 순서대로 입력하면 탈출합니다.",
    flow: "도입 이야기와 역할 안내 → 모둠별 문제 해결 → 필요할 때 단계별 힌트 사용 → 코드 조각 기록 → 최종 탈출 코드 입력 → 풀이 전략과 힌트 사용 시점 공유",
    teacherTips: "정답 칸에는 1/2|0.5처럼 세로줄을 넣어 동치인 복수 정답을 허용할 수 있습니다. 선택지를 입력하면 선택형 잠금이 자동으로 만들어집니다. 학생용 링크를 복사해 모둠 기기에 보내거나 교실 기기 한 대에서 미리보기로 진행할 수 있고, 학생 활동지와 교사용 정답지를 따로 인쇄할 수 있습니다.",
    questions: "어떤 단서가 문제 해결의 출발점이 되었나요? 첫 번째 힌트만으로 해결하려면 어떤 개념을 떠올려야 했나요? 모둠에서 서로 다른 풀이가 나왔을 때 정답을 어떻게 검증했나요? 같은 답을 얻는 다른 식이나 방법도 있나요?",
    cautions: "학생용 공유 링크에는 방탈출 데이터가 포함되므로 공개 게시판보다 학급 안에서 전달하세요. 링크를 받은 학생 화면에는 정답이 보이지 않지만, 중요한 평가 문항이나 개인정보는 넣지 않는 것이 안전합니다. 수업 전에 학생 화면 미리보기로 정답·선택지·최종 코드를 한 번 확인하세요."
  },
  "좌표평면 미니골프": {
    purpose: "좌표평면에서 순서쌍 (x, y)의 위치를 읽고, 두 점 사이의 변화량을 직선의 식 또는 이동 명령으로 표현하며 좌표와 이동의 관계를 탐구합니다.",
    preparation: "공과 홀의 좌표를 함께 읽는 짧은 시범으로 시작하세요. 직선의 식 모드에서는 기울기와 y절편, 이동 명령 모드에서는 오른쪽·위쪽을 양수, 왼쪽·아래쪽을 음수로 나타낸다는 약속을 먼저 확인하면 좋습니다.",
    studentSteps: "공과 홀의 좌표 차이를 확인한 뒤 직선의 식 또는 이동 명령을 입력합니다. 예상 경로를 살펴보고 공 치기나 명령 실행을 눌러 결과를 확인합니다. 실패하면 도착 위치와 장애물 충돌 안내를 근거로 식이나 명령을 고쳐 다시 도전합니다.",
    flow: "좌표와 변화량 예상 → 직선의 식 1~3번 미션 → 풀이 방법 비교 → 이동 명령 미션 → 장애물 우회 경로 설계 → 자유 배치로 모둠별 문제 만들기·교환",
    teacherTips: "첫 시도에서는 힌트를 닫고 두 좌표의 x 변화량과 y 변화량을 말로 설명하게 해 보세요. 자유 배치 기능으로 한 모둠이 공과 홀을 놓고 다른 모둠이 식이나 명령을 만드는 문제 교환 활동도 할 수 있습니다. 별은 첫 시도 성공 3개, 3회 이내 성공 2개, 그 이후 성공 1개입니다.",
    questions: "두 점을 지나는 직선의 기울기는 좌표 변화량과 어떤 관계가 있나요? x좌표가 같은 두 점은 왜 y = ax + b 꼴로 나타내기 어려울까요? 여러 이동 명령의 순서를 바꾸면 마지막 위치도 항상 같을까요? 장애물을 피하는 서로 다른 경로는 몇 가지인가요?",
    cautions: "분수는 1/2처럼 슬래시로 입력합니다. 이동 명령은 앞 명령이 끝난 위치에서 이어지며 모든 중간 지점이 -6부터 6 사이에 있어야 합니다. 한 번의 성공 여부보다 실패 경로를 좌표와 식으로 설명하는 과정에 초점을 맞춰 주세요."
  },
  "내 짝은 몇 번째일까?": {
    purpose: "한 번 지나간 선택으로 돌아갈 수 없는 상황을 비서 문제로 모델링하고, 관찰 구간과 선택 구간의 균형을 확률·경우의 수·반복 실험으로 탐구합니다.",
    preparation: "도입에서는 ‘100명을 차례로 한 번씩만 만날 수 있고, 지나간 사람은 다시 선택할 수 없다면 몇 번째쯤 결정하겠는가?’를 먼저 묻고 학생의 예상 관찰 인원과 이유를 기록하게 해 보세요.",
    studentSteps: "전체 인원과 먼저 관찰할 인원을 바꾸어 이론 성공률 그래프의 꼭짓점을 찾습니다. 한 명씩 만나 보기에서 실제 순위를 숨긴 채 규칙을 체험한 뒤, 1천 번 이상 반복하여 실험값과 이론값을 비교하고 성공·실패 경우의 수도 확인합니다.",
    flow: "나의 멈춤 지점 예상 → 관찰 인원 조작 → 한 명씩 선택 체험 → 37% 전략 적용 → 반복 실험 → N!과 성공 경우의 수 해석 → 최적의 의미 토론",
    teacherTips: "먼저 10명으로 순서를 눈으로 추적한 뒤 100명으로 확대하면 규칙이 잘 보입니다. 그래프에서 관찰 인원을 너무 작게 또는 크게 했을 때 성공률이 모두 낮아지는 이유를 학생의 말로 설명하게 해 보세요.",
    questions: "왜 앞의 사람들을 일부러 선택하지 않고 보내야 하나요? 관찰 인원이 너무 많으면 어떤 문제가 생기나요? 성공률을 최대로 만들었는데도 약 63%는 실패한다는 사실에서 ‘최적’은 무엇을 뜻하나요?",
    cautions: "짝이나 사람의 가치를 실제로 순위 매기는 활동으로 오해하지 않도록, 채용 후보의 서류 점수나 무작위 카드처럼 수학적 순위가 명확한 가상 상황으로 설명하세요. 각 순서가 같은 가능성으로 나타난다는 모형의 가정도 함께 확인하세요."
  },
  "모션 샷 만들기": {
    purpose: "시간에 따라 달라지는 물체의 위치를 한 장의 사진에서 비교하며 운동 궤적, 위치 변화, 규칙성을 관찰합니다.",
    preparation: "HTTPS로 접속하고 카메라 권한을 허용해 주세요. 스마트폰이나 웹캠을 책상 또는 삼각대에 고정하고, 공이나 장난감이 움직일 공간과 밝기를 미리 확인하면 좋습니다.",
    studentSteps: "카메라를 시작한 뒤 촬영을 누르고 물체를 움직입니다. 결과가 만들어지면 모션 간격을 바꾸어 위치가 촘촘하거나 띄엄띄엄 나타날 때 운동을 어떻게 다르게 읽을 수 있는지 비교합니다.",
    flow: "운동 궤적 예상 → 카메라 고정 → 최대 10초 촬영 → 합성 결과 관찰 → 모션 간격 조절 → 위치 변화와 규칙성 설명",
    teacherTips: "공 던지기, 점프, 진자, 자동차 장난감처럼 이동 방향이 분명한 활동부터 시작하세요. 같은 촬영 결과에서 모션 간격만 바꾸면 관찰 기준을 공정하게 비교할 수 있습니다.",
    questions: "물체의 위치 사이 간격이 넓어지는 곳과 좁아지는 곳은 어디인가요? 같은 시간 간격으로 촬영했다고 볼 때 속력은 어떻게 달라졌다고 해석할 수 있을까요?",
    cautions: "사람을 촬영할 때에는 동의를 받고 결과 이미지에 개인정보가 남지 않게 해 주세요. 기기가 크게 흔들리면 다시 고정하여 촬영하고, 공을 던질 때 주변의 안전거리를 확보하세요."
  },
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
  "투자 포트폴리오 LAB": {
    purpose: "가중평균, 표준편차, 공분산과 상관관계를 자산 배분에 적용하고 역사적 충격 시뮬레이션을 통해 합리적인 금융 의사결정을 경험합니다.",
    preparation: "도입에서 ‘기대수익률이 가장 높은 자산 하나에 모두 투자하면 왜 위험할까?’를 묻고 학생의 직관을 수집하세요. 2~4명 모둠을 권장하며 모둠별 투자 성향과 초기 투자금을 먼저 정하면 좋습니다.",
    studentSteps: "주식·채권·현금·금의 비중을 합계 100%로 구성하고 기대수익과 예상 위험을 확인합니다. 역사적 사건을 골라 각 국면에서 유지·리밸런싱·안전자산 이동 중 하나를 선택한 뒤 결과 지표와 의사결정 기록을 분석합니다.",
    flow: "투자 목표 설정 → 자산 비중 설계 → 가중평균·상관관계 확인 → 역사적 충격 시뮬레이션 → 수익률·최대 낙폭·변동성 비교 → 보고서 PDF 작성",
    teacherTips: "같은 시나리오에서 성장형과 안정형을 비교하거나, 같은 포트폴리오로 유지와 리밸런싱 규칙을 비교하면 자산 배분의 효과가 선명하게 드러납니다.",
    questions: "수익률이 더 높아도 최대 낙폭이 크다면 어느 전략이 더 합리적일까요? 상관계수가 낮은 자산을 섞었을 때 예상 위험은 왜 단순 가중평균과 달라질까요? 결과가 좋았던 선택은 당시 정보로도 합리적이었을까요?",
    cautions: "모든 사건별 수익률은 개념 학습을 위해 단순화한 모의 자료이며 실제 투자 조언이나 미래 예측에 사용할 수 없음을 강조하세요."
  },
  "DOUBLE 72": {
    purpose: "연간 증가율과 자산이 두 배가 되는 시간의 관계를 여러 시각화로 탐구하고, 72의 법칙이 복리 상황에서 사용하는 근삿값임을 이해합니다.",
    preparation: "학생은 이름만 입력해도 시작할 수 있습니다. 수업 전에 그래프·막대·두 배 타임라인·자산 블록·표가 화면에서 잘 보이는지 확인하고, 개인 또는 2명 모둠별 기기를 준비해 주세요.",
    studentSteps: "초기 자산, 연간 증가율, 관찰 기간, 단리·복리와 비교 증가율을 바꾸며 다섯 가지 시각화를 관찰합니다. 서로 다른 증가율을 네 번 이상 실험해 규칙을 발견하고, 역사 타임머신의 가상 복리 결과를 해석한 뒤 생각 정리와 자산 증가율 문제를 풀고 활동 보고서를 작성합니다.",
    flow: "증가율과 두 배 기간 예상 → 72 탐구실 조작 → 시각화별 공통점과 차이 비교 → 증가율×두 배 기간 규칙 발견 → 역사 타임머신 해석 → 생각 정리 → 문제 풀이 → 활동 보고서 작성",
    teacherTips: "먼저 연 6%와 12%를 비교하면 두 배 기간이 약 12년에서 6년으로 줄어드는 관계가 선명합니다. 초기 자산만 바꾸어 두 배 기간이 달라지지 않는다는 점을 확인한 뒤, 단리와 복리 그래프의 모양을 비교하게 하면 좋습니다.",
    questions: "증가율이 두 배가 되면 두 배 기간은 어떻게 달라지나요? 초기 자산을 바꾸어도 두 배 기간이 같은 이유는 무엇인가요? 역사 타임머신의 큰 결과를 실제 현재 가치라고 부를 수 없는 이유는 무엇인가요?",
    cautions: "72의 법칙은 증가율이 일정한 복리 상황에서 사용하는 빠른 근삿값입니다. 세금·수수료·변동 금리·입출금은 반영하지 않으며, 역사 사례의 씨앗돈은 수업용 가정이므로 실제 물가 환산이나 투자 조언으로 해석하지 않게 해 주세요."
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
  "주사위 눈 합 게임": {
    purpose: "주사위 눈의 합이 만드는 확률분포를 예상해 칸을 배치하고, 반복 시행의 실제 분포와 이론적 분포를 비교합니다.",
    preparation: "2~4명이 함께 볼 기기와 학생별 활동지를 준비하세요. 먼저 주사위 개수와 학생 수를 정하고, 칸은 같은 열의 아래쪽부터 채운다는 규칙을 한 번 시범으로 보여 주세요.",
    studentSteps: "각자 자주 나올 것 같은 합을 예상해 정해진 수만큼 칸을 배치합니다. 주사위를 1~10묶음씩 던지면 나온 합의 칸에 자동으로 X가 표시되며, 모든 칸을 먼저 지운 학생이 승리합니다. 게임 뒤에는 대량 시행 그래프에서 실험 분포와 이론 분포를 비교합니다.",
    flow: "합의 분포 예상 → 칸 배치 전략 결정 → 주사위 투척과 X 표시 → 승리 전략 비교 → 대량 시행 → 실험·이론 그래프 비교 → 주사위 개수에 따른 분포 변화 설명",
    teacherTips: "주사위 1개부터 4개까지 차례로 진행하면 균등분포에서 가운데로 모이는 종 모양 분포까지 자연스럽게 비교할 수 있습니다. 승패보다 칸을 그렇게 배치한 근거를 먼저 말하게 하세요.",
    questions: "가장 자주 나올 합 하나에 칸을 몰아 놓는 것이 항상 유리할까요? 시행 횟수가 늘어날수록 실험 그래프는 이론 그래프와 어떻게 달라지나요? 주사위 개수가 늘면 분포가 가운데로 모이는 이유는 무엇인가요?",
    cautions: "여러 묶음을 던질 때 결과는 기록에 나온 순서대로 처리됩니다. 적은 횟수의 우연한 결과만으로 전략을 단정하지 말고, 충분한 시행과 이론적 경우의 수를 함께 비교하세요."
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
  "삼각형 그리기": {
    purpose: "주사위 조건에 맞는 세 점을 찾아 예각삼각형, 직각삼각형, 둔각삼각형을 만들며 삼각형의 각 분류와 선분의 교차 조건을 탐구합니다.",
    preparation: "도입에서는 같은 세 점이라도 위치에 따라 삼각형의 종류가 달라질 수 있음을 간단한 그림으로 보여 주세요. 2~6명의 참가 순서를 정하고, 숫자 주사위 3개는 점의 숫자, 종류 주사위 1개는 만들 삼각형의 종류를 정한다는 점을 먼저 확인합니다.",
    studentSteps: "학생들은 자기 차례에 주사위를 굴리고 숫자 주사위와 같은 점 3개를 고릅니다. 선택한 세 점이 종류 주사위가 정한 예각·직각·둔각삼각형인지 확인하고, 이미 그어진 선을 지나가지 않는지도 함께 살펴봅니다. 막히면 가능한 수 보기를 참고하거나 기권을 선택할 수 있습니다.",
    flow: "예각·직각·둔각삼각형 복습 → 주사위 네 개의 역할 확인 → 연습 차례 진행 → 본 게임 → 완성 기록으로 삼각형 종류 비교 → 전략과 막힌 상황 토론",
    teacherTips: "처음에는 가능한 수 보기를 함께 눌러 후보 세 점이 왜 해당 종류의 삼각형인지 말하게 하세요. 직각삼각형은 세 변의 길이 제곱 관계와 연결하고, 둔각삼각형은 가장 긴 변의 맞은편 각에 주목하게 하면 좋습니다.",
    questions: "정리에서는 “선택한 세 점이 왜 예각·직각·둔각삼각형인가요?”, “같은 숫자 주사위라도 어떤 점을 고르느냐에 따라 결과가 왜 달라지나요?”를 묻습니다. 이어 “이미 그어진 선 때문에 다음 사람이 선택할 수 없는 경우는 어떻게 생기나요?”로 전략까지 확장할 수 있습니다.",
    cautions: "목표 종류와 다른 삼각형을 선택했을 때는 탈락이 아니라 다시 고르게 안내됩니다. 단, 새 선이 기존 선을 지나가거나 겹치면 탈락 처리되므로 선 교차 규칙을 시작 전에 분명히 설명하세요."
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
  "숫자 야구": {
    purpose: "스트라이크와 볼이라는 조건을 이용해 가능한 비밀 숫자를 좁히며 순열의 경우의 수, 조건부확률, 정보가 후보를 줄이는 과정을 탐구합니다.",
    preparation: "개인 또는 2~4명 모둠별 기기를 준비하고 3자리부터 시작하세요. 첫 자리는 0이 아니며 모든 자리의 숫자가 서로 다르다는 조건, 숫자와 자리가 모두 맞으면 스트라이크이고 숫자만 맞으면 볼이라는 규칙을 먼저 예시로 확인합니다.",
    studentSteps: "학생들은 서로 다른 숫자를 입력해 결과를 확인하고 제안 기록을 근거로 다음 수를 정합니다. ‘남은 경우’의 보기를 눌러 해당 시점의 후보를 확인하되, 먼저 후보 수를 예상한 뒤 공개하게 하세요. TIP에서는 현재 입력한 수의 예상 판정, 판정 확률, 정보 효율을 살펴보고 실제 결과와 비교합니다.",
    flow: "초기 경우의 수 예상 → 3자리 연습 게임 → 판정별 후보 제거 → 기록별 남은 수 확인 → TIP의 예상 결과와 실제 결과 비교 → 4자리 게임 → 효율적인 질문 전략 발표",
    teacherTips: "남은 수 전체 보기는 정답 찾기용 힌트보다 조건 검산 도구로 사용하게 하세요. 각 시도 전에 가장 가능성이 큰 판정과 그 이유를 적게 하면 결과 확률을 더 의미 있게 읽을 수 있습니다. 기록 패널은 필요에 따라 끄고 켤 수 있습니다.",
    questions: "같은 1S 1B 결과라도 제안한 수에 따라 남은 경우의 수가 달라질 수 있을까요? 어떤 수를 제안해야 한 번에 더 많은 후보를 나눌 수 있을까요? 기록이 하나 추가될 때 정답 확률은 왜 달라지나요?",
    cautions: "TIP은 정답을 알려 주는 기능이 아니라 현재 남은 후보를 기준으로 결과 분포를 계산하는 기능입니다. 남은 수 목록을 먼저 공개하기보다 학생이 자신의 후보를 기록한 뒤 검산에 사용하게 하세요."
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
    usage: "이름을 바꿀 파일이나 폴더를 불러온 뒤 원하는 변경 규칙을 설정하세요. 화면의 미리보기에서 원래 이름과 바뀔 이름을 나란히 확인하고, 결과가 맞으면 변경을 실행합니다. 작업이 끝난 뒤에는 첫 파일과 마지막 파일, 이름이 특이했던 파일을 열어 변경 결과를 한 번 더 확인하면 좋습니다.",
    tips: "학번·이름·차시처럼 꼭 남겨야 할 요소와 구분 기호를 먼저 정하면 규칙을 만들기 쉽습니다. 파일이 많을 때는 전체를 한 번에 처리하기보다 복사한 파일 몇 개로 먼저 시험해 보세요. 미리보기에서 이름이 비거나 같은 이름이 반복되는 파일을 중심으로 살펴보면 실수를 빠르게 찾을 수 있습니다.",
    cautions: "미리보기를 건너뛰지 말고 원본 백업을 유지하세요. 학생 이름 등 개인정보가 포함된 화면을 공유하지 않도록 주의하세요."
  },
  "문항 배점 생성기": {
    usage: "문항 수와 총점, 선택형·서답형 점수, 난이도 비율 등 필요한 조건을 입력한 뒤 배점안을 생성하세요. 결과표에서 전체 합계와 영역별 합계를 확인하고, 마음에 들지 않으면 조건을 조정해 다시 생성할 수 있습니다. 사용할 배점안이 정해지면 CSV 파일로 저장해 출제표나 검토 자료에 활용하세요.",
    tips: "평가 계획에 적힌 조건을 먼저 한곳에 정리한 뒤 입력하면 누락을 줄일 수 있습니다. 여러 배점안을 만들어 비교하고, 높은 배점이 중요한 성취기준이나 풀이 과정이 긴 문항에 적절히 배치되었는지 확인하세요. 자동 결과를 초안으로 활용하고 마지막 배점 결정은 실제 문항 내용과 함께 검토하는 것이 좋습니다.",
    cautions: "학교 평가 규정과 소수점 사용 기준을 확인하고, 생성 결과의 합계 및 선택형·서답형 점수를 교차 검산하세요."
  },
  "성적 산출 미리 해보기": {
    usage: "먼저 1차 시험 버전 또는 학기말 합산 버전을 선택하세요. 학년과 등급제, 성취도 기준을 정한 뒤 평가 항목별 엑셀을 올리거나 반·번호·점수를 직접 붙여넣고 계산합니다. 결과표에서 환산점수, 석차, 동점자 중간석차, 등급 컷과 성취도 분포를 확인할 수 있습니다.",
    tips: "학기말 버전에서는 평가 항목의 반영비율 합계가 100%인지 먼저 확인하세요. 1차 시험 버전은 한 항목을 100%로 자동 설정합니다. 다른 PC에서 이어서 작업하려면 정리 엑셀을 내려받아 안전하게 보관한 뒤 복원 기능으로 불러오세요.",
    cautions: "이 도구는 공식 성적 처리 프로그램이 아닌 미리 보기 도구입니다. 최종 산출 전 학교 학업성적관리규정과 결시·동점자·분할점수 기준을 반드시 확인하고, 학생 개인정보가 포함된 엑셀은 안전하게 관리하세요."
  },
  "채점용 학생 과제 통합 뷰어": {
    usage: "학생 과제 파일을 한꺼번에 불러오면 제출물을 한 화면에서 순서대로 확인할 수 있습니다. 학생별 과제를 보면서 평가 기준에 따른 점수와 간단한 근거 메모를 입력하세요. 채점이 끝나면 미입력 점수와 누락된 학생이 없는지 확인한 뒤 결과를 엑셀 파일로 저장합니다.",
    tips: "채점을 시작하기 전에 대표 과제 두세 개로 점수 기준과 메모 방식을 맞춰 두면 일관성을 유지하기 쉽습니다. 중간중간 앞서 채점한 과제로 돌아가 기준이 달라지지 않았는지 확인하고, 미제출이나 열리지 않는 파일은 별도 메모로 표시하세요. 작업 시간이 길다면 일정한 간격으로 결과를 저장해 두는 것이 안전합니다.",
    cautions: "학생 개인정보가 있는 화면을 공개하지 말고, 브라우저를 닫기 전에 반드시 결과를 저장하세요. 원본 과제 파일도 별도로 보관하세요."
  },
  "엑셀 개인자료 조회기": {
    usage: "엑셀 파일을 불러온 뒤 조회할 시트와 제목 행을 확인하세요. 열 이름은 필요에 맞게 수정할 수 있습니다. 학번이나 이름 같은 key 열을 고르고, 화면에 보여 줄 열의 체크 상태를 정한 다음 순서대로 보기·key 직접 입력·key 목록 클릭 중 원하는 방식으로 자료를 조회합니다.",
    tips: "표시 열은 처음에 모두 선택됩니다. 공개할 필요가 없는 열은 체크를 해제하고 미리보기에서 빠졌는지 확인하세요. 시트마다 제목 행과 열 구성이 다를 수 있으므로 시트를 바꾼 뒤에는 설정을 다시 확인하는 것이 안전합니다.",
    cautions: "학생 개인정보는 현재 PC와 브라우저 안에서만 처리됩니다. 공용 PC에서는 사용 후 자료 초기화를 누르고, 화면 공유 중에는 민감한 열을 반드시 숨겨 주세요."
  },
  "PDF 파일 분할기": {
    usage: "나눌 PDF 파일을 불러온 뒤 분할 기준이나 페이지 범위를 입력하세요. 생성될 파일 목록에서 각 파일의 시작 페이지와 마지막 페이지를 확인한 다음 분할을 실행합니다. 작업이 끝나면 결과물을 ZIP 파일로 내려받고 압축을 풀어 필요한 PDF가 모두 만들어졌는지 확인하세요.",
    tips: "전체 페이지 수와 나눌 범위를 메모해 둔 뒤 작업하면 페이지 누락을 줄일 수 있습니다. 처음 사용하는 경우 페이지 수가 적은 PDF로 먼저 시험해 보세요. 결과 파일명에 단원명이나 학생 이름처럼 구분 가능한 정보를 넣고, 내려받은 첫 파일과 마지막 파일을 실제로 열어 범위가 맞는지 확인하는 것이 좋습니다.",
    cautions: "민감한 문서는 공용 기기에서 처리하지 말고, 잘못된 범위로 원본 일부가 빠지지 않았는지 확인한 뒤 배포하세요."
  },
  "확률 대수의 법칙 실험실": {
    purpose: "동일한 확률 실험을 반복할 때 상대도수가 이론적 확률에 가까워지는 경향을 시각적으로 관찰하고, 적은 시행에서 나타나는 큰 변동과 많은 시행에서 나타나는 안정화를 비교합니다.",
    preparation: "먼저 동전 앞면처럼 학생들이 이론적 확률을 쉽게 계산할 수 있는 사건을 고르세요. 학생에게 10회, 100회, 1,000회 뒤의 상대도수와 오차를 미리 예상하게 한 뒤 실험을 시작하면 좋습니다.",
    studentSteps: "실험 도구와 관찰할 사건을 선택합니다. 1회와 10회 버튼으로 결과의 흔들림을 확인한 뒤 100회, 1,000회 또는 연속 실험으로 시행 횟수를 늘립니다. 수렴 그래프, 결과 분포, 절대 오차와 마일스톤 기록을 비교하고 관찰한 경향을 설명합니다.",
    flow: "이론적 확률 계산 → 적은 횟수 결과 예상 → 10회 실험 → 100회·1,000회로 확대 → 상대도수와 횟수 차이 비교 → 편향 동전 또는 다른 사건으로 조건 변경 → 대수의 법칙의 의미 정리",
    teacherTips: "같은 실험 번호를 사용하면 모든 모둠이 동일한 결과를 재현할 수 있고, 서로 다른 번호를 사용하면 모둠별 표본 변동을 비교할 수 있습니다. 동전 확률 슬라이더를 바꿔도 실험값이 새 이론확률로 수렴하는지 확인해 보세요.",
    questions: "10회 결과가 이론확률과 크게 달라도 이상하지 않은 이유는 무엇인가요? 시행 횟수의 차이는 커지는데 상대도수의 차이는 작아질 수 있을까요? 1,000회를 하면 반드시 이론확률과 정확히 같아지나요? 실험 번호가 달라져도 공통으로 나타나는 경향은 무엇인가요?",
    cautions: "대수의 법칙은 유한한 시행에서 정확히 같아짐을 보장하는 법칙이 아닙니다. 개별 실험 결과를 예측하는 규칙이나 도박에서 다음 결과를 맞히는 방법으로 오해하지 않도록 상대도수의 장기적 경향이라는 점을 강조하세요."
  }
};

const GUIDE_SECTION_LABELS = [
  ["usage", "사용 방법"],
  ["tips", "사용 팁"],
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
    content.replaceChildren(...GUIDE_SECTION_LABELS.filter(([key]) => guide[key]).map(([key, label]) => {
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

const toolCards = [...document.querySelectorAll("[data-tool-tags]")];
const filterButtons = [...document.querySelectorAll("[data-tag-filter]")];
const selectedTags = new Set();
const originalToolOrder = new Map(toolCards.map((card, index) => [card.dataset.toolId, index]));

function sanitizeClickCounts(rawCounts) {
  if (!rawCounts || typeof rawCounts !== "object") return {};
  return Object.fromEntries(Object.entries(rawCounts).flatMap(([toolId, rawCount]) => {
    const count = Number(rawCount);
    return originalToolOrder.has(toolId) && Number.isFinite(count) && count >= 0
      ? [[toolId, Math.floor(count)]]
      : [];
  }));
}

function sortCardsByPopularity(rawCounts) {
  const counts = sanitizeClickCounts(rawCounts);
  document.querySelectorAll(".tool-grid").forEach((grid) => {
    const cards = [...grid.querySelectorAll(":scope > [data-tool-id]")];
    cards.sort((left, right) => {
      const clickDifference = (counts[right.dataset.toolId] || 0) - (counts[left.dataset.toolId] || 0);
      return clickDifference || originalToolOrder.get(left.dataset.toolId) - originalToolOrder.get(right.dataset.toolId);
    });
    cards.forEach((card) => {
      card.dataset.clickCount = String(counts[card.dataset.toolId] || 0);
      grid.append(card);
    });
  });
}

function requestClickCounts() {
  if (!CLICK_STATS_ENDPOINT) return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    const callbackName = `__mathToolCounts_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    let settled = false;
    const timeoutId = window.setTimeout(() => finish(new Error("click_stats_timeout")), CLICK_STATS_TIMEOUT_MS);

    function cleanup() {
      window.clearTimeout(timeoutId);
      script.remove();
      delete window[callbackName];
    }

    function finish(error, payload) {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve(payload);
    }

    window[callbackName] = (payload) => {
      if (!payload?.ok || typeof payload.counts !== "object") {
        finish(new Error("click_stats_invalid_response"));
        return;
      }
      finish(null, payload.counts);
    };

    script.async = true;
    script.onerror = () => finish(new Error("click_stats_load_failed"));
    let endpoint;
    try {
      endpoint = new URL(CLICK_STATS_ENDPOINT);
    } catch {
      finish(new Error("click_stats_invalid_endpoint"));
      return;
    }
    endpoint.searchParams.set("action", "counts");
    endpoint.searchParams.set("callback", callbackName);
    endpoint.searchParams.set("_", String(Date.now()));
    script.src = endpoint.toString();
    document.head.append(script);
  });
}

async function loadAndSortByPopularity() {
  if (!CLICK_STATS_ENDPOINT) return;
  try {
    const counts = await requestClickCounts();
    if (counts) sortCardsByPopularity(counts);
  } catch {
    document.documentElement.dataset.popularityStatus = "fallback";
  }
}

function wasRecentlyCounted(toolId) {
  const key = `math-tool-click:${toolId}`;
  try {
    const now = Date.now();
    const previous = Number(window.localStorage.getItem(key)) || 0;
    if (now - previous < CLICK_STATS_DUPLICATE_WINDOW_MS) return true;
    window.localStorage.setItem(key, String(now));
  } catch {
    return false;
  }
  return false;
}

function recordToolClick(toolId) {
  if (!CLICK_STATS_ENDPOINT || !originalToolOrder.has(toolId) || wasRecentlyCounted(toolId)) return;

  const body = new URLSearchParams({ tool_id: toolId });
  if (navigator.sendBeacon?.(CLICK_STATS_ENDPOINT, body)) return;
  fetch(CLICK_STATS_ENDPOINT, {
    method: "POST",
    mode: "no-cors",
    body,
    keepalive: true
  }).catch(() => {});
}

function wirePopularityTracking() {
  toolCards.forEach((card) => {
    const primaryLink = card.querySelector(".tool-footer a:not(.guide-link)");
    if (!primaryLink || !card.dataset.toolId) return;
    primaryLink.dataset.clickTrack = card.dataset.toolId;
    primaryLink.addEventListener("click", () => recordToolClick(card.dataset.toolId));
  });
}

function getCardTags(card) {
  return card.dataset.toolTags.split(/\s+/).filter(Boolean);
}

function renderCardTags() {
  toolCards.forEach((card) => {
    const container = card.querySelector(".tool-tags");
    if (!container) return;

    const tags = getCardTags(card);
    const displayTags = tags.filter((tag) => tag !== "class-use").slice(0, 3);
    container.replaceChildren(...displayTags.map((tag) => {
      const chip = document.createElement("span");
      const meta = TAG_META[tag];
      chip.className = `tool-tag tool-tag--${meta?.group || "topic"}`;
      chip.textContent = meta?.label || tag;
      return chip;
    }));
    container.title = tags.map((tag) => TAG_META[tag]?.label || tag).join(" · ");
  });
}

function updateFilterCounts() {
  filterButtons.forEach((button) => {
    const tag = button.dataset.tagFilter;
    const count = toolCards.filter((card) => getCardTags(card).includes(tag)).length;
    const countElement = button.querySelector("span");
    if (countElement) countElement.textContent = count;
  });
}

function matchesSelectedTags(card) {
  const cardTags = getCardTags(card);
  const activeGroups = new Map();

  selectedTags.forEach((tag) => {
    const group = TAG_META[tag]?.group;
    if (!group) return;
    if (!activeGroups.has(group)) activeGroups.set(group, []);
    activeGroups.get(group).push(tag);
  });

  return [...activeGroups.values()].every((groupTags) => groupTags.some((tag) => cardTags.includes(tag)));
}

function renderSelectedTags() {
  const container = document.querySelector("[data-selected-tags]");
  if (!container) return;

  if (!selectedTags.size) {
    const hint = document.createElement("span");
    hint.className = "selected-tags__hint";
    hint.textContent = "원하는 태그를 여러 개 선택할 수 있어요.";
    container.replaceChildren(hint);
    return;
  }

  container.replaceChildren(...[...selectedTags].map((tag) => {
    const button = document.createElement("button");
    button.className = "selected-tag";
    button.type = "button";
    button.dataset.removeTag = tag;
    button.setAttribute("aria-label", `${TAG_META[tag].label} 태그 해제`);
    button.innerHTML = `${TAG_META[tag].label} <span aria-hidden="true">×</span>`;
    return button;
  }));
}

function updateTagFilters(updateHash = false) {
  filterButtons.forEach((button) => {
    const isSelected = selectedTags.has(button.dataset.tagFilter);
    button.classList.toggle("is-active", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });

  let visibleCount = 0;
  toolCards.forEach((card) => {
    const isVisible = matchesSelectedTags(card);
    card.classList.toggle("is-hidden", !isVisible);
    card.setAttribute("aria-hidden", String(!isVisible));
    if (isVisible) visibleCount += 1;
  });

  document.querySelectorAll("[data-tool-section]").forEach((section) => {
    const hasVisibleCards = Boolean(section.querySelector("[data-tool-tags]:not(.is-hidden)"));
    section.classList.toggle("is-hidden", !hasVisibleCards);
    section.setAttribute("aria-hidden", String(!hasVisibleCards));
  });

  const countElement = document.querySelector("[data-visible-count]");
  if (countElement) countElement.textContent = visibleCount;
  document.querySelector(".empty-message").hidden = visibleCount !== 0;
  document.querySelector("[data-filter-reset]").hidden = selectedTags.size === 0;
  renderSelectedTags();

  const hasTopicTag = [...selectedTags].some((tag) => TAG_META[tag]?.group === "topic");
  if (hasTopicTag) document.querySelector(".filter-more")?.setAttribute("open", "");

  if (updateHash) {
    const nextHash = selectedTags.size ? `tags=${[...selectedTags].join(",")}` : "tools";
    window.history.replaceState({}, "", `#${nextHash}`);
  }
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const tag = button.dataset.tagFilter;
    if (selectedTags.has(tag)) selectedTags.delete(tag);
    else selectedTags.add(tag);
    updateTagFilters(true);
  });
});

document.querySelector("[data-selected-tags]")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-tag]");
  if (!button) return;
  selectedTags.delete(button.dataset.removeTag);
  updateTagFilters(true);
});

document.querySelector("[data-filter-reset]")?.addEventListener("click", () => {
  selectedTags.clear();
  document.querySelector(".filter-more")?.removeAttribute("open");
  updateTagFilters(true);
});

const initialHash = window.location.hash.slice(1);
const initialTagValue = initialHash.startsWith("tags=") ? initialHash.slice(5) : initialHash;
initialTagValue.split(",").filter((tag) => TAG_META[tag]).forEach((tag) => selectedTags.add(tag));
renderCardTags();
updateFilterCounts();
updateTagFilters();
wireGithubLinks();
wireGuideModal();
wirePopularityTracking();
loadAndSortByPopularity();
