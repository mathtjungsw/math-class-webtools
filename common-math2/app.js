const SUITES = {
  coordinate: {
    title: "좌표와 직선 통합 탐구실",
    unit: "Ⅰ. 평면좌표와 직선의 방정식",
    accent: "#14796f",
    description:
      "두 점 사이의 거리와 내분부터 직선의 여러 표현, 평행·수직, 점과 직선 사이의 거리까지 한 좌표평면 학습 흐름으로 연결합니다.",
    manual: {
      purpose:
        "좌표를 움직여 수치와 그래프가 함께 변하는 경험을 중심으로, 거리·내분·직선의 방정식·평행과 수직·점과 직선 사이 거리의 핵심 관계를 하나의 도구에서 이어서 탐구합니다. 교과서 23쪽의 직선 미술 활동은 마지막 적용 탭에 통합했습니다.",
      preparation:
        "개인 또는 2인 1기기, 활동 기록지를 준비하세요. 처음 수업에서는 ‘두 점 사이 거리 → 내분 → 직선 관계 → 점과 직선 사이 거리’ 순서를 권장하며, 이미 배운 내용은 필요한 탭부터 바로 열어도 됩니다.",
      studentSteps:
        "점을 움직여 거리 공식을 관찰 → 내분비를 바꾸며 가중평균 확인 → 기준 직선과 평행·수직 직선 비교 → 같은 직선의 여러 방정식 표현 연결 → 임의의 선분과 수직거리 비교 → 거리 공식의 분자와 분모 의미 확인 → 평행·수직 직선으로 작품 제작의 순서로 진행합니다.",
      flow:
        "예측하기 → 한 값만 조절하기 → 그래프와 식의 변화 말하기 → 규칙을 기호로 정리하기 → 교과서 문제 또는 직선 미술에 적용하기",
      teacherTips:
        "기울기가 정의되지 않는 수직선은 기울기 공식의 예외로 따로 짚어 주세요. 거리 공식에서는 직선 방정식을 상수배해도 실제 거리가 바뀌지 않는 이유를 분자와 분모가 함께 변한다는 말로 설명하게 하면 좋습니다.",
      questions:
        "내분점은 어느 끝점에 더 가까워지나요? 평행한 두 직선에서 같아야 하는 값은 무엇인가요? 수직인 두 직선의 기울기는 어떤 관계인가요? 점에서 직선까지 가장 짧은 선분은 왜 수직인가요?",
      cautions:
        "모션 캡처 3차원 복원, 와이파이 신호 세기처럼 별도 가정이 큰 활동은 공통수학2 핵심 개념을 흐릴 수 있어 게시 대상에서 제외했습니다. 이 도구는 좌표와 직선의 수학적 관계를 직접 확인하는 데 초점을 둡니다."
    },
    tabs: [
      ["distance", "두 점 사이 거리", "수직선의 거리에서 좌표평면의 거리 공식이 만들어지는 과정을 관찰합니다.", "coordinate-distance.html"],
      ["section", "내분점과 가중평균", "내분비를 바꾸며 점의 위치와 좌표의 가중평균을 연결합니다.", "coordinate-section.html"],
      ["line-relations", "평행·수직 직선", "두 직선의 기울기와 절편을 비교하고 평행·수직 조건을 확인합니다.", "coordinate-line-relations.html"],
      ["line-forms", "직선의 여러 표현", "한 직선을 기울기절편형·점기울기형·일반형 등으로 바꾸어 봅니다.", "coordinate-line-forms.html"],
      ["point-line", "점과 직선의 거리", "여러 후보 선분과 수선의 발을 비교하여 최단거리를 찾습니다.", "coordinate-point-line-distance.html"],
      ["formula", "거리 공식 해부", "절댓값과 √(a²+b²)의 역할, 방정식 상수배 불변성을 확인합니다.", "coordinate-distance-formula.html"],
      ["line-art", "교과서 직선 미술", "평행·수직 직선과 구간을 조합하여 규칙이 드러나는 작품을 만듭니다.", "coordinate-line-art.html"]
    ]
  },
  circle: {
    title: "원과 직선 관계 통합 실험실",
    unit: "Ⅱ-01~02. 원의 방정식과 원·직선의 위치 관계",
    accent: "#cb5f35",
    description:
      "원의 중심·반지름·방정식을 조절하고, 직선과의 교점 수·접선·거리·판별식을 한 화면 흐름으로 연결합니다.",
    manual: {
      purpose:
        "원의 방정식과 원·직선의 위치 관계를 따로 외우지 않고 중심에서 직선까지의 거리, 교점 수, 판별식, 접점에서의 수직 관계가 같은 상황을 설명하는 여러 표현임을 탐구합니다.",
      preparation:
        "좌표평면에서 두 점 사이 거리와 점·직선 사이 거리 공식을 간단히 복습하세요. 원의 기본형 탭에서 시작해 위치 관계와 접선 탭으로 이동한 뒤, 자취 또는 충돌 프로젝트를 선택하는 흐름을 권장합니다.",
      studentSteps:
        "중심과 반지름 조절 → 일반형을 완전제곱식으로 변환 → 직선을 움직이며 교점 수 예측 → 판별식과 거리 판정 비교 → 접점과 반지름의 수직 관계 확인 → 거리비 자취 또는 게임 충돌 상황 적용",
      flow:
        "원의 방정식 읽기 → 그래프와 식 동기화 → 직선 접근 관찰 → d와 r 비교 → D의 부호와 연결 → 접선식 설명 → 교과서 프로젝트 적용",
      teacherTips:
        "접선은 ‘한 점에서 만나는 직선’만으로 끝내지 말고 중심에서 접선까지의 거리가 반지름과 같다는 조건과 연결하세요. 자취 탭의 m=n일 때 원이 아니라 수직이등분선이 되는 경계 사례가 좋은 토론 소재입니다.",
      questions:
        "일반형이 실수 좌표에서 원을 나타내려면 어떤 조건이 필요한가요? d<r, d=r, d>r일 때 교점은 각각 몇 개인가요? 접점으로 향한 반지름은 접선과 왜 수직인가요?",
      cautions:
        "컬링·위성·접선 탄생 순간 등은 핵심 조작이 다른 탭과 겹쳐 별도 게시하지 않았습니다. 충돌 판정은 원형 물체와 직선 벽으로 단순화한 교육용 모형입니다."
    },
    tabs: [
      ["equation", "원의 기본형", "중심 (h,k)와 반지름 r이 그래프와 방정식을 어떻게 결정하는지 관찰합니다.", "circle-equation.html"],
      ["general", "일반형 원 판정", "일반형을 완전제곱하여 원·한 점·도형 없음의 조건을 구분합니다.", "circle-general-form.html"],
      ["position", "원과 직선의 위치", "판별식 D와 중심에서 직선까지의 거리 d가 같은 결론을 내는지 비교합니다.", "circle-line-position.html"],
      ["tangent", "접점과 접선", "원 위 접점을 움직이며 반지름과 접선의 수직 관계와 접선식을 확인합니다.", "circle-tangent.html"],
      ["apollonius", "거리비의 자취", "AP:BP가 일정한 점 P의 자취와 m=n인 경계 사례를 탐구합니다.", "circle-apollonius.html"],
      ["collision", "교과서 충돌 판정", "원의 중심에서 벽까지의 거리와 반지름으로 충돌 시점을 판정합니다.", "circle-collision.html"]
    ]
  },
  transform: {
    title: "도형의 이동 통합 변환기",
    unit: "Ⅱ-03~04. 평행이동과 대칭이동",
    accent: "#6b58b6",
    description:
      "점·그래프·방정식의 평행이동을 연동하고, 네 가지 대칭 규칙과 합성 변환을 같은 좌표 체계에서 탐구합니다.",
    manual: {
      purpose:
        "평행이동과 대칭이동을 좌표 공식 암기가 아니라 점의 실제 움직임, 그래프의 위치, 방정식의 치환이 서로 대응하는 하나의 변환으로 이해합니다.",
      preparation:
        "좌표평면과 함수 그래프의 기본 읽기만 필요합니다. 점의 이동부터 시작해 그래프·방정식으로 확장한 뒤 대칭이동과 두 번 대칭을 다루세요.",
      studentSteps:
        "이동 벡터로 점 옮기기 → 점·그래프·방정식 동시 관찰 → 식 속 x-a, y-b의 역추적 이해 → 좌표평면 접기 → 대칭식 치환 → 두 대칭의 합성 결과 비교",
      flow:
        "직접 움직이기 → 변한 것과 보존된 것 구분 → 좌표 규칙 쓰기 → 방정식 치환 설명 → 두 변환 합성 예측과 검증",
      teacherTips:
        "평행이동 식의 부호를 외우게 하기보다 새 점에서 원래 점으로 돌아가는 좌표가 x-a, y-b임을 애니메이션으로 먼저 보이세요. 대칭을 두 번 시행할 때는 순서가 결과에 영향을 주는지 사례별로 말하게 합니다.",
      questions:
        "평행이동 전후에 길이와 기울기는 변하나요? 오른쪽으로 a만큼 이동한 그래프의 식에 x-a가 들어가는 이유는 무엇인가요? x축과 y축 대칭을 차례로 하면 어떤 변환과 같나요?",
      cautions:
        "원본·이동본 겹치기와 게임 캐릭터 활동은 핵심 조작이 통합 탭과 중복되어 제외했습니다. 변환 순서에 따라 결과가 달라질 수 있으므로 각 단계의 좌표를 기록하게 해 주세요."
    },
    tabs: [
      ["vector", "이동 벡터", "점 P와 이동 벡터를 조작하여 P'(x+a,y+b)를 확인합니다.", "translate-vector.html"],
      ["coordinated", "점·그래프·식 연동", "같은 평행이동을 점, 그래프, 방정식의 세 표현으로 동시에 관찰합니다.", "translate-coordinated.html"],
      ["sign", "식 속 부호", "새 좌표에서 원래 좌표로 역추적하며 x-a와 y-b의 의미를 이해합니다.", "translate-sign.html"],
      ["fold", "좌표평면 접기", "x축·y축·원점·y=x에 대한 점의 대칭 규칙을 확인합니다.", "reflect-fold.html"],
      ["equation", "대칭식 번역", "x→-x, y→-y, x↔y가 그래프를 어떻게 이동시키는지 봅니다.", "reflect-equation.html"],
      ["compose", "두 번 대칭", "대칭이동의 순서를 정하고 두 변환을 합친 결과를 탐구합니다.", "reflect-compose.html"]
    ]
  },
  set: {
    title: "집합과 연산 통합 탐구실",
    unit: "Ⅲ. 집합",
    accent: "#16795d",
    description:
      "집합의 표현과 포함 관계부터 교집합·합집합·여집합·차집합·드모르간 법칙까지 벤 다이어그램으로 연결합니다.",
    manual: {
      purpose:
        "원소나열법, 조건제시법, 벤 다이어그램을 동기화하고 집합 연산의 결과 영역을 직접 확인하여 기호와 그림을 서로 번역하는 능력을 기릅니다.",
      preparation:
        "학생들이 익숙한 분류 기준 두 가지를 준비하거나 도구의 기본 자료를 사용하세요. 전체집합 U가 무엇인지 먼저 합의한 뒤 연산을 시작하면 여집합의 의미가 선명해집니다.",
      studentSteps:
        "한 집합을 세 방법으로 표현 → 부분집합 포함 판정 → AND·OR 필터로 교집합·합집합 구성 → 연산 법칙 양변 비교 → 포함배제 원소 수 세기 → 전체집합을 바꾸며 여집합 비교 → 드모르간 법칙 확인 → 해양 보호구역 자료 분류",
      flow:
        "분류 기준 정하기 → 원소 배치 → 기호식 쓰기 → 벤 영역 예측 → 결과 공개 → 법칙 설명 → 실제 자료에 적용",
      teacherTips:
        "‘또는’을 배타적 또는로 오해하지 않도록 교집합 원소도 합집합에 포함됨을 확인하세요. 드모르간 법칙에서는 괄호 전체를 부정할 때 연산기호가 바뀌는 과정을 영역별로 추적하게 합니다.",
      questions:
        "집합을 세 방법으로 표현해도 같은 집합임을 어떻게 알 수 있나요? 전체집합이 바뀌면 여집합이 달라지는 이유는 무엇인가요? 합집합의 원소 수에서 교집합을 한 번 빼는 이유는 무엇인가요?",
      cautions:
        "군집 만들기처럼 통계적 거리 기준을 사용하는 활동은 집합 단원의 포함·연산 개념과 거리가 있어 제외했습니다. 실제 자료 분류는 선택한 조건 정의에 따라 결과가 달라질 수 있습니다."
    },
    tabs: [
      ["representations", "집합의 세 표현", "원소나열법·조건제시법·벤 다이어그램을 실시간으로 동기화합니다.", "set-representations.html"],
      ["subset", "부분집합", "작은 집합의 모든 원소가 큰 집합에 포함되는지 직접 판정합니다.", "set-subset.html"],
      ["operations", "교집합과 합집합", "AND·OR 검색 필터를 집합 연산과 연결합니다.", "set-operations.html"],
      ["laws", "집합의 연산 법칙", "교환·결합·분배법칙의 양변 영역을 벤 다이어그램으로 비교합니다.", "set-laws.html"],
      ["count", "포함배제", "공통 원소의 중복 계산을 시각화하여 원소 수 공식을 이해합니다.", "set-inclusion-exclusion.html"],
      ["universe", "전체집합과 여집합", "전체집합 U를 바꿀 때 여집합이 어떻게 달라지는지 확인합니다.", "set-complement-universe.html"],
      ["demorgan", "드모르간 법칙", "두 식의 계산 순서와 최종 영역을 한 화면에서 비교합니다.", "set-demorgan.html"],
      ["marine", "교과서 자료 분류", "해양 보호구역 자료를 조건에 따라 세 집합으로 분류합니다.", "set-marine.html"]
    ]
  },
  logic: {
    title: "명제와 증명 통합 논리실",
    unit: "Ⅳ. 명제",
    accent: "#7a4fb0",
    description:
      "조건의 진리집합, 모든·어떤, 반례, 역·대우, 필요충분조건, 직접 증명과 귀류법을 한 논리 흐름으로 묶었습니다.",
    manual: {
      purpose:
        "명제의 참과 거짓을 진리집합과 반례로 판정하고, 역·대우·필요충분조건에서 증명 방법까지 이어지는 논리 구조를 시각적으로 구성합니다.",
      preparation:
        "전체집합이 작은 유한집합인 예로 시작하면 좋습니다. 기호 p, q, ~p, ~q의 뜻을 확인하고 각 단계에서 자연어 문장과 기호 표현을 함께 쓰게 하세요.",
      studentSteps:
        "조건의 진리집합 만들기 → 모든·어떤 명제 검사 → 반례 찾기 → 역과 대우 조립 → 두 방향 포함 관계로 필요·충분 판정 → 직접 증명과 대우 증명 비교 → 부정을 가정해 모순 찾기 → 역설과 교과서 논리 추론 적용",
      flow:
        "문장 분해 → 전체집합과 조건 설정 → 원소별 참·거짓 검사 → 반례 영역 확인 → 명제 변환 → 증명 경로 선택 → 실제 추론 문제 해결",
      teacherTips:
        "원명제와 역은 참·거짓이 같지 않을 수 있지만 대우는 원명제와 동치임을 반례 영역으로 확인하세요. 귀류법에서는 단순히 이상한 결론이 아니라 서로 양립할 수 없는 두 명제를 정확히 지목하게 합니다.",
      questions:
        "‘모든’ 명제를 거짓으로 만드는 데 반례가 몇 개 필요한가요? p→q가 참일 때 P와 Q의 포함 관계는 무엇인가요? 충분조건과 필요조건의 방향은 어떻게 구분하나요? 귀류법에서 실제로 모순인 두 결론은 무엇인가요?",
      cautions:
        "논리 예시는 제한된 전체집합에서 판정하므로 전체집합이 바뀌면 진리값이 달라질 수 있습니다. 역설은 논리 구조 관찰용이며 철학적 해석 전체를 다루지 않습니다."
    },
    tabs: [
      ["truth-set", "조건과 진리집합", "전체집합의 원소를 조건에 대입하여 진리집합을 만듭니다.", "logic-truth-set.html"],
      ["quantifiers", "모든·어떤", "전칭·존재 명제의 뜻과 부정 관계를 원소 검사로 이해합니다.", "logic-quantifiers.html"],
      ["counterexample", "반례", "반례 한 점이 ‘모든’ 명제를 무너뜨리는 과정을 탐색합니다.", "logic-counterexample.html"],
      ["converse", "역과 대우", "p, q, ~p, ~q 카드를 배치해 역과 대우를 구성합니다.", "logic-converse-contrapositive.html"],
      ["conditions", "필요·충분조건", "p→q와 q→p를 각각 검사하여 조건 관계를 판정합니다.", "logic-conditions.html"],
      ["proof", "직접·대우 증명", "같은 명제의 직접 증명과 대우 증명 경로를 나란히 비교합니다.", "logic-proof-compare.html"],
      ["contradiction", "귀류법", "명제의 부정을 가정하고 모순 쌍을 찾아 결론을 확정합니다.", "logic-contradiction.html"],
      ["paradox", "교과서 역설 탐구", "참·거짓 가정에서 자기모순으로 이어지는 두 경로를 관찰합니다.", "logic-paradox.html"],
      ["deduction", "교과서 조건 추론", "조건을 하나씩 적용하며 후보 제거 근거를 기록합니다.", "logic-deduction.html"]
    ]
  },
  function: {
    title: "함수와 합성함수 통합 기계",
    unit: "Ⅴ-01~02. 함수와 합성함수",
    accent: "#2267a8",
    description:
      "함수의 대응 조건과 여러 표현을 확인한 뒤, 합성 순서·정의 가능 조건·세 단계 합성을 기계 흐름으로 탐구합니다.",
    manual: {
      purpose:
        "함수를 식 하나로만 보지 않고 대응 관계로 구성하며, 화살표·표·순서쌍·그래프를 연결합니다. 합성함수에서는 중간값과 정의역 조건을 단계별로 추적합니다.",
      preparation:
        "정의역·공역·치역의 뜻을 짧게 확인하세요. 함수 기계의 입력과 출력 카드를 사용하면 합성 순서를 왼쪽에서 오른쪽으로 읽는 오해를 줄일 수 있습니다.",
      studentSteps:
        "정의역의 각 원소를 공역에 배선 → 네 가지 표현 동기화 → 수직선 검사로 함수 여부 판정 → 수평선 검사로 일대일 판정 → 두 함수 기계 통과 → 순서 바꾸기 비교 → 합성 정의 가능 게이트 검사 → 세 단계 합성의 결합법칙 확인",
      flow:
        "대응 만들기 → 함수 조건 검사 → 표현 바꾸기 → 일대일 여부 확인 → 합성 입력·중간값·출력 추적 → 순서와 정의역 조건 설명",
      teacherTips:
        "함수는 서로 다른 두 입력이 같은 출력으로 가도 될 수 있지만 한 입력이 두 출력으로 가면 안 된다는 점을 먼저 분명히 하세요. 합성함수는 g∘f에서 f가 먼저 실행됨을 매 단계의 값으로 읽게 합니다.",
      questions:
        "함수가 되기 위한 입력 쪽 조건은 무엇인가요? 치역과 공역은 언제 같나요? g∘f와 f∘g가 다른 이유를 중간값으로 설명할 수 있나요? 합성함수가 정의되려면 첫 함수의 치역이 어디에 포함되어야 하나요?",
      cautions:
        "할인쿠폰 활동은 합성 순서 비교 탭과 핵심 구조가 같아 제외했습니다. 유한집합 대응과 연속함수 그래프의 판정 방식은 화면 표현이 다르므로 각각의 전체 정의역에서 판단해야 합니다."
    },
    tabs: [
      ["wiring", "함수 배선", "정의역의 각 원소에서 공역으로 전선을 연결하며 함수 조건을 구성합니다.", "function-wiring.html"],
      ["representations", "함수의 여러 표현", "화살표·대응표·순서쌍·그래프를 하나의 상태로 동기화합니다.", "function-representations.html"],
      ["test", "함수 여부", "수직선을 이동해 같은 x에 대응하는 y의 개수를 검사합니다.", "function-test.html"],
      ["one-to-one", "일대일함수", "수평선으로 서로 다른 입력이 같은 출력을 만드는지 탐지합니다.", "function-one-to-one.html"],
      ["pipeline", "합성함수 기계", "입력 x가 f와 g를 차례로 지나며 변하는 값을 확인합니다.", "composition-pipeline.html"],
      ["order", "합성 순서 비교", "g∘f와 f∘g의 중간값·최종값·함수식을 비교합니다.", "composition-order.html"],
      ["domain", "합성 정의 조건", "첫 함수의 치역이 다음 함수의 정의역에 포함되는지 원소별로 검사합니다.", "composition-domain.html"],
      ["three-stage", "세 단계 합성", "세 함수의 실제 실행 순서와 결합법칙의 두 괄호를 비교합니다.", "composition-three-stage.html"]
    ]
  },
  inverse: {
    title: "역함수 통합 되감기 실험실",
    unit: "Ⅴ-03. 역함수",
    accent: "#b95c37",
    description:
      "일대일대응 조건, y=x 대칭, 정의역 제한, 합성에 의한 원상복구와 역문제를 ‘되감기’라는 한 흐름으로 연결합니다.",
    manual: {
      purpose:
        "함수의 출력을 입력으로 되돌리는 역함수를 대응·그래프·식·합성의 네 관점에서 확인하고, 역함수가 존재하지 않는 경우를 정의역 제한으로 개선합니다.",
      preparation:
        "함수와 일대일함수, 정의역·공역·치역을 복습하세요. 정방향과 역방향의 입력·출력 색을 다르게 기록하면 혼동을 줄일 수 있습니다.",
      studentSteps:
        "함수 기계 실행 후 되감기 → 일대일대응 잠금 조건 검사 → (a,b)를 (b,a)로 바꾸며 y=x 대칭 확인 → 정의역을 잘라 일대일대응 만들기 → f와 f⁻¹ 합성으로 항등함수 확인 → 관찰 결과에서 원인을 찾는 역문제 적용",
      flow:
        "정방향 대응 확인 → 역방향 화살표 그리기 → 역함수 존재 조건 판정 → 그래프 대칭 → 식 구하기 → 합성 검산 → 교과서 역문제 연결",
      teacherTips:
        "일대일이기만 하면 끝이 아니라 치역과 공역이 일치해야 주어진 두 집합 사이의 역함수가 된다는 점을 확인하세요. 이차함수는 정의역을 제한하고 공역을 치역에 맞출 때 역함수를 만들 수 있습니다.",
      questions:
        "역방향에서 한 입력이 두 출력으로 가는 문제는 언제 생기나요? 함수와 역함수 그래프의 교점은 왜 y=x 위에 있나요? f⁻¹∘f와 f∘f⁻¹의 정의역은 각각 무엇인가요? 역문제의 해가 하나로 정해지려면 무엇이 필요한가요?",
      cautions:
        "지도 좌표 왕복 변환은 역함수 기계와 구조가 중복되어 제외했습니다. 역문제 내부 구조 탭은 실제 비파괴검사 계산이 아니라 일대일 대응과 원인 추정의 교육용 단순 모형입니다."
    },
    tabs: [
      ["rewind", "되감기 함수", "함수의 출력을 역함수에 넣어 원래 입력으로 돌아갑니다.", "inverse-rewind.html"],
      ["bijection", "일대일대응 조건", "일대일 여부와 치역·공역 일치를 각각 검사합니다.", "inverse-bijection.html"],
      ["mirror", "y=x 거울", "점 (a,b)를 (b,a)로 반사하여 함수와 역함수 그래프를 비교합니다.", "inverse-mirror.html"],
      ["restrict", "정의역 제한", "정의역과 공역을 조절해 일대일대응과 역함수를 만듭니다.", "inverse-restrict-domain.html"],
      ["compose", "합성으로 원상복구", "f와 f⁻¹의 왕복 합성이 항등함수가 되는지 확인합니다.", "inverse-compose.html"],
      ["inverse-problem", "교과서 역문제", "관찰된 결과에서 가능한 원인을 찾으며 역함수 존재 조건을 탐구합니다.", "inverse-problem.html"]
    ]
  },
  rational: {
    title: "유리함수 그래프 통합 조종실",
    unit: "Ⅵ-01. 유리함수와 그 그래프",
    accent: "#176a89",
    description:
      "y=k/x에서 y=k/(x-p)+q까지 그래프·점근선·식 변형·정의역을 조절하고 실제 함수 모델과 연결합니다.",
    manual: {
      purpose:
        "유리함수의 그래프를 점근선, 대칭의 중심, 정의역·치역, 식의 변형과 함께 탐구하고 반비례 상황 및 교과서 자료 모델링에 적용합니다.",
      preparation:
        "반비례 y=k/x와 그래프 사분면을 복습하세요. 기본형에서 k를 조절한 뒤 점근선과 평행이동을 다루고, 일반형을 표준형으로 바꾸는 순서를 권장합니다.",
      studentSteps:
        "k의 부호와 크기 조절 → x가 0 또는 무한히 커질 때 값 관찰 → p,q로 점근선 이동 → 일반형을 k/(x-p)+q로 변형 → 분모가 0인 값과 정의역 확인 → 파일 전송 반비례 상황 → 기대수명 자료의 함수 모델 비교",
      flow:
        "기본형 그래프 조작 → 점근선 관찰 → 평행이동 → 식 변형과 검산 → 정의역 판정 → 실제 상황의 정의역 설정 → 모델 적합성 토론",
      teacherTips:
        "그래프가 점근선에 ‘닿지 않는다’는 말보다 정의역에서 제외되는 x값과 함숫값의 극한적 변화를 함께 말하게 하세요. 실제 자료 모델에서는 한 시점의 오차만으로 모델을 선택하지 않고 전체 자료와 정의역을 함께 보게 합니다.",
      questions:
        "k의 부호가 그래프가 놓이는 사분면을 어떻게 바꾸나요? 점근선의 교점은 왜 대칭의 중심인가요? 일반형에서 p,q,k를 어떻게 찾나요? 실제 상황에서 수학적 정의역보다 더 좁은 범위를 써야 하는 이유는 무엇인가요?",
      cautions:
        "기대수명 예측은 교과서 자료를 활용한 단순 함수 모델 비교이며 공식 통계 전망이 아닙니다. 점근선 근처의 화면 값은 표시 범위 때문에 잘릴 수 있으므로 식과 함께 판단하세요."
    },
    tabs: [
      ["basic", "기본형 y=k/x", "k의 부호와 절댓값, 사분면, 대칭, 정의역·치역을 탐구합니다.", "rational-basic.html"],
      ["asymptote", "점근선 탐험", "|x|가 커질 때와 x가 0에 가까워질 때 점의 움직임을 관찰합니다.", "rational-asymptote.html"],
      ["translation", "점근선 평행이동", "p,q,k를 조절하며 점근선과 대칭의 중심을 이동합니다.", "rational-translation.html"],
      ["form", "식 변형", "일반형을 k/(x-p)+q 꼴로 분해하고 그래프로 검산합니다.", "rational-form.html"],
      ["domain", "정의되지 않는 값", "분모가 0인 값, 함수의 영점, 수직 점근선을 구분합니다.", "rational-domain.html"],
      ["transfer", "파일 전송 모델", "파일 크기와 시간으로 y=S/x와 실생활 정의역 x>0을 확인합니다.", "rational-transfer.html"],
      ["life", "교과서 함수 모델", "기대수명 자료에 유리·무리함수 모델을 적용하고 예측을 비교합니다.", "rational-life-expectancy.html"]
    ]
  },
  radical: {
    title: "무리함수 그래프 통합 탐구실",
    unit: "Ⅵ-02. 무리함수와 그 그래프",
    accent: "#9a5c22",
    description:
      "근호의 허용 범위와 계산부터 제곱근 그래프의 방향·시작점·역함수 대칭·교점 검증까지 단계별로 연결합니다.",
    manual: {
      purpose:
        "근호 안의 조건이 정의역을 결정하는 원리와 무리함수 그래프의 시작점·방향을 연결하고, 역함수 관계와 양변 제곱에서 생기는 무연근을 검증합니다.",
      preparation:
        "제곱근의 뜻과 실수 범위, 이차함수 y=x²의 그래프를 복습하세요. 식의 허용 범위를 먼저 정한 뒤 계산이나 제곱을 수행하는 습관을 강조합니다.",
      studentSteps:
        "근호 안 부등식으로 허용 범위 판정 → 켤레식과 유리화 계산 → a와 바깥 부호로 그래프 방향 조절 → 시작점 (p,q) 이동 → y=x 대칭으로 역함수 연결 → 후보해를 원래 식에 대입해 실제 교점 판정",
      flow:
        "정의역 먼저 확인 → 식 계산 → 기본 그래프 조작 → 평행이동 → 역함수 대칭 → 대수적 후보와 그래프 교점 교차 검증",
      teacherTips:
        "분모에 근호가 있을 때는 R(x)>0이어야 한다는 경계 차이를 비교하세요. 양변을 제곱하면 필요조건만 얻을 수 있으므로 후보해를 원래 식에 대입하는 검산을 마지막 필수 단계로 두세요.",
      questions:
        "√R(x)와 1/√R(x)의 허용 조건은 왜 다른가요? a의 부호와 근호 밖 부호는 그래프 방향을 각각 어떻게 바꾸나요? 시작점에서 정의역과 치역은 어느 방향으로 뻗나요? 제곱한 방정식에서 무연근이 생기는 이유는 무엇인가요?",
      cautions:
        "유리화로 식이 간단해져도 원래 식의 정의역은 유지해야 합니다. 그래프 화면에 후보점이 보이더라도 원래 식의 근호와 부호 조건을 모두 만족하는지 대입해 확인하세요."
    },
    tabs: [
      ["domain", "근호의 허용 범위", "근호와 분모의 위치에 따라 ≥0과 >0 조건을 구분합니다.", "radical-domain.html"],
      ["algebra", "무리식 계산", "켤레식과 합차 공식을 배열하고 원래 식의 정의역을 유지합니다.", "radical-algebra.html"],
      ["direction", "그래프 방향", "a와 근호 밖 부호를 바꾸며 정의역·치역·사분면을 관찰합니다.", "radical-direction.html"],
      ["translation", "시작점 이동", "y=±√(a(x-p))+q의 시작점과 뻗는 방향을 조절합니다.", "radical-translation.html"],
      ["inverse", "역함수 거울", "점 P(u,v)와 Q(v,u)를 연결하여 y=x 대칭을 확인합니다.", "radical-inverse.html"],
      ["intersection", "교점과 무연근", "제곱으로 얻은 후보해를 원래 식에 대입해 실제 교점을 판정합니다.", "radical-intersection.html"]
    ]
  }
};

const MANUAL_LABELS = [
  ["purpose", "이 도구로 배우는 것"],
  ["preparation", "수업 전 준비"],
  ["studentSteps", "학생 활동 순서"],
  ["flow", "권장 수업 흐름"],
  ["teacherTips", "교사 활용 팁"],
  ["questions", "생각을 여는 질문"],
  ["cautions", "유의 사항"]
];

const params = new URLSearchParams(window.location.search);
const suiteKey = SUITES[params.get("tool")] ? params.get("tool") : "coordinate";
const suite = SUITES[suiteKey];
let activeIndex = Math.max(
  0,
  suite.tabs.findIndex(([id]) => id === params.get("tab"))
);
let lastFocus = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const frame = $("[data-frame]");
const loading = $("[data-frame-loading]");
const manual = $("[data-manual]");
const manualDialog = $(".manual-dialog");

document.documentElement.style.setProperty("--accent", suite.accent);
document.documentElement.style.setProperty(
  "--accent-soft",
  `color-mix(in srgb, ${suite.accent} 12%, white)`
);
$("[data-unit-label]").textContent = suite.unit;
$("[data-suite-title]").textContent = suite.title;
$("[data-suite-description]").textContent = suite.description;
$("[data-tab-count]").textContent = suite.tabs.length;
$("[data-manual-title]").textContent = `${suite.title} 설명서`;
document.title = `${suite.title} | 수학 수업 웹툴 모음`;

const tabList = $("[data-tabs]");
suite.tabs.forEach(([id, label], index) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "tab";
  button.id = `tab-${id}`;
  button.role = "tab";
  button.setAttribute("aria-controls", "tool-frame");
  button.innerHTML = `<span>${String(index + 1).padStart(2, "0")}</span>${label}`;
  button.addEventListener("click", () => selectTab(index, true));
  tabList.append(button);
});

function selectTab(index, focus = false) {
  activeIndex = (index + suite.tabs.length) % suite.tabs.length;
  const [id, title, description, file] = suite.tabs[activeIndex];
  const tabs = $$(".tab");
  tabs.forEach((tab, tabIndex) => {
    const selected = tabIndex === activeIndex;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });

  $("[data-tab-step]").textContent = `${suite.unit} · 탭 ${activeIndex + 1}/${suite.tabs.length}`;
  $("[data-tab-title]").textContent = title;
  $("[data-tab-description]").textContent = description;
  const source = `./modules/${file}`;
  loading.classList.remove("is-ready");
  frame.id = "tool-frame";
  frame.title = `${suite.title} - ${title}`;
  frame.src = source;
  $("[data-open-module]").href = source;

  const nextParams = new URLSearchParams(window.location.search);
  nextParams.set("tool", suiteKey);
  nextParams.set("tab", id);
  nextParams.delete("manual");
  history.replaceState(null, "", `${window.location.pathname}?${nextParams.toString()}`);

  if (focus) {
    tabs[activeIndex].focus();
    tabs[activeIndex].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }
}

frame.addEventListener("load", () => loading.classList.add("is-ready"));
$("[data-refresh]").addEventListener("click", () => {
  loading.classList.remove("is-ready");
  frame.src = frame.src;
});

tabList.addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  if (event.key === "Home") selectTab(0, true);
  else if (event.key === "End") selectTab(suite.tabs.length - 1, true);
  else selectTab(activeIndex + (event.key === "ArrowRight" ? 1 : -1), true);
});

suite.tabs.forEach(([, label]) => {
  const chip = document.createElement("span");
  chip.textContent = label;
  $("[data-manual-tabs]").append(chip);
});

MANUAL_LABELS.forEach(([key, label]) => {
  const section = document.createElement("section");
  section.className = "manual-section";
  const heading = document.createElement("h3");
  heading.textContent = label;
  const paragraph = document.createElement("p");
  paragraph.textContent = suite.manual[key];
  section.append(heading, paragraph);
  $("[data-manual-sections]").append(section);
});

function openManual(trigger) {
  lastFocus = trigger || document.activeElement;
  manual.hidden = false;
  document.body.classList.add("manual-open");
  const nextParams = new URLSearchParams(window.location.search);
  nextParams.set("tool", suiteKey);
  nextParams.set("tab", suite.tabs[activeIndex][0]);
  nextParams.set("manual", "1");
  history.replaceState(null, "", `${window.location.pathname}?${nextParams.toString()}`);
  requestAnimationFrame(() => manualDialog.focus());
}

function closeManual() {
  manual.hidden = true;
  document.body.classList.remove("manual-open");
  const nextParams = new URLSearchParams(window.location.search);
  nextParams.delete("manual");
  history.replaceState(null, "", `${window.location.pathname}?${nextParams.toString()}`);
  lastFocus?.focus?.();
}

$$("[data-manual-open]").forEach((button) =>
  button.addEventListener("click", () => openManual(button))
);
$$("[data-manual-close]").forEach((element) =>
  element.addEventListener("click", closeManual)
);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !manual.hidden) closeManual();
});

selectTab(activeIndex);
if (params.get("manual") === "1") openManual();
