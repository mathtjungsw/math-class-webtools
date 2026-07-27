const CHAPTERS = {
  conic: {
    numeral: "Ⅰ",
    title: "이차곡선",
    unit: "Ⅰ. 이차곡선",
    accent: "#0f7f86",
    description:
      "포물선·타원·쌍곡선의 정의와 방정식, 접선, 반사 성질을 그래프와 교과서 프로젝트로 연결합니다.",
    topics: ["conic-overview", "parabola", "ellipse", "hyperbola", "tangent", "conic-project"]
  },
  space: {
    numeral: "Ⅱ",
    title: "공간도형과 공간좌표",
    unit: "Ⅱ. 공간도형과 공간좌표",
    accent: "#437a38",
    description:
      "공간의 위치 관계, 삼수선 정리, 정사영, 좌표와 내분점, 구의 방정식을 조작 가능한 3차원 모형으로 탐구합니다.",
    topics: ["space-relations", "three-perpendicular", "projection", "space-coordinates", "internal-division", "sphere", "space-project"]
  },
  vector: {
    numeral: "Ⅲ",
    title: "벡터",
    unit: "Ⅲ. 벡터",
    accent: "#5a58a6",
    description:
      "벡터의 연산·위치벡터·성분·내적에서 직선과 평면의 방정식, 상대 속도와 제트 기류까지 한 흐름으로 연결합니다.",
    topics: ["vector-operations", "scalar-vector", "position-vector", "components", "dot-product", "vector-lines", "vector-planes", "vector-project"]
  }
};

function makeManual({ purpose, steps, tips, questions, cautions }) {
  return {
    purpose,
    preparation:
      "먼저 화면 상단의 탐구 탭을 순서대로 살펴보세요. 개인 또는 2인 1기기를 권장하며, 값은 한 번에 하나씩 바꾸고 변한 것과 변하지 않은 것을 기록하면 좋습니다.",
    studentSteps: steps,
    flow:
      "예상하기 → 한 조건만 조절하기 → 그림·수치·식을 함께 관찰하기 → 발견한 규칙 설명하기 → 미션 또는 교과서 상황에 적용하기",
    teacherTips: tips,
    questions,
    cautions:
      cautions ||
      "화면의 3차원 장면과 실제 적용 사례는 핵심 개념을 드러내기 위한 교육용 모형입니다. 수치와 식을 함께 확인하고, 표시 범위 밖의 상황은 별도로 판단하세요."
  };
}

const TOPICS = {
  "conic-overview": {
    chapter: "conic",
    title: "이차곡선 한눈에",
    unit: "Ⅰ. 이차곡선 · 개념 연결",
    description: "원뿔의 절단과 이차방정식의 계수를 함께 보며 네 이차곡선을 분류합니다.",
    manual: makeManual({
      purpose: "원·포물선·타원·쌍곡선을 원뿔의 절단이라는 기하적 관점과 이차방정식 계수라는 대수적 관점으로 연결합니다.",
      steps: "절단면의 기울기로 곡선 만들기 → 모선과의 관계 확인 → 계수 A, B를 바꾸어 그래프 분류 → 두 분류 기준을 말로 연결하기",
      tips: "포물선은 타원과 쌍곡선 사이의 경계가 되는 절단임을 먼저 발견하게 한 뒤, AB의 부호와 계수 0의 의미를 연결하세요.",
      questions: "절단면이 모선과 평행할 때 왜 포물선이 되나요? AB의 부호는 그래프가 닫혀 있는지와 어떤 관련이 있나요?"
    }),
    tabs: [
      ["section", "원뿔 절단", "절단면의 높이와 기울기를 바꾸며 원·타원·포물선·쌍곡선을 만듭니다.", "conic-section.html"],
      ["classifier", "계수로 분류", "Ax²+By²+Cx+Dy+E=0의 계수로 이차곡선의 종류를 판정합니다.", "conic-classifier.html"]
    ]
  },
  parabola: {
    chapter: "conic",
    title: "포물선",
    unit: "Ⅰ-01. 포물선",
    description: "초점·준선의 거리 조건에서 그래프의 이동과 반사·집광 활용까지 이어서 탐구합니다.",
    manual: makeManual({
      purpose: "포물선의 정의 PF=PH를 자취로 만들고, 초점·준선·꼭짓점과 방정식의 관계 및 평행광의 반사 성질을 확인합니다.",
      steps: "초점과 준선으로 자취 만들기 → p와 평행이동 조절 → 방정식과 그래프 동기화 → 평행광 반사 관찰 → 태양열 조리기 설계",
      tips: "그림을 먼저 완성해 보여주기보다 같은 거리인 점을 여러 개 남겨 곡선을 추측하게 하세요. 반사 탭에서는 한 광선의 법선과 입사각·반사각을 추적합니다.",
      questions: "초점과 준선 사이가 멀어지면 포물선은 어떻게 달라지나요? 평행한 광선이 왜 초점에 모이나요?",
      cautions: "작도 실험실은 초점·준선 자취 생성기와 학습 목표가 겹쳐 제외하고, 자취·식·반사를 한 흐름으로 정리했습니다."
    }),
    tabs: [
      ["locus", "초점·준선 자취", "PF와 준선까지의 거리가 같은 점을 남겨 포물선을 생성합니다.", "parabola-locus.html"],
      ["transform", "그래프 변형", "매개변수와 평행이동이 초점·준선·꼭짓점에 미치는 영향을 비교합니다.", "parabola-transform.html"],
      ["reflection", "반사·집광", "평행광과 초점에서 나온 광선의 반사 경로를 추적합니다.", "parabola-reflection.html"],
      ["solar", "태양열 조리기", "포물선 반사판의 깊이와 초점 위치를 조절해 집광 장치를 설계합니다.", "parabola-solar-cooker.html"]
    ]
  },
  ellipse: {
    chapter: "conic",
    title: "타원",
    unit: "Ⅰ-02. 타원",
    description: "두 초점 거리의 합, 방정식의 매개변수, 행성 궤도와 두 초점 반사 성질을 연결합니다.",
    manual: makeManual({
      purpose: "PF+PF′가 일정한 자취와 타원 방정식의 a, b, c 관계를 확인하고 행성 궤도·속삭이는 회랑·쇄석기에 적용합니다.",
      steps: "두 초점 거리의 합으로 자취 만들기 → a, b, c 조절 → 이심률과 궤도 비교 → 한 초점에서 보낸 광선 추적 → 회랑·쇄석기 적용",
      tips: "끈 작도는 거리의 합 자취와 기능이 겹쳐 하나의 자취 탭으로 통합했습니다. c²=a²-b²을 초점 이동과 그래프 납작함에 연결하세요.",
      questions: "거리의 합이 두 초점 사이 거리와 같거나 작으면 왜 타원이 만들어지지 않나요? 이심률이 커지면 궤도는 어떻게 변하나요?"
    }),
    tabs: [
      ["locus", "거리의 합 자취", "PF+PF′가 일정한 점을 움직여 타원의 정의를 확인합니다.", "ellipse-locus.html"],
      ["parameters", "매개변수 탐색", "a, b, c와 장축·단축·초점·이심률을 한 화면에서 비교합니다.", "ellipse-parameters.html"],
      ["orbit", "행성 궤도", "태양을 한 초점으로 하는 궤도에서 거리와 이심률의 변화를 살펴봅니다.", "ellipse-orbit.html"],
      ["reflection", "두 초점 반사", "한 초점에서 나온 광선이 타원에 반사되어 다른 초점으로 가는지 확인합니다.", "ellipse-reflection.html"],
      ["applications", "회랑·쇄석기", "속삭이는 회랑과 체외 충격파 쇄석기의 공통 원리를 비교합니다.", "ellipse-applications.html"]
    ]
  },
  hyperbola: {
    chapter: "conic",
    title: "쌍곡선",
    unit: "Ⅰ-03. 쌍곡선",
    description: "두 초점 거리의 차, 점근선, 평행이동과 두 기지국 위치 추적을 한 흐름으로 탐구합니다.",
    manual: makeManual({
      purpose: "|PF-PF′|가 일정한 자취를 만들고 쌍곡선의 방정식·점근선·평행이동을 해석해 위치 추적에 적용합니다.",
      steps: "거리의 차로 자취 만들기 → 점근선 접근 관찰 → 중심과 점근선 평행이동 → 두 기지국 거리 차로 가능한 위치 찾기",
      tips: "점근선은 곡선의 일부가 아니라 멀리 갈수록 가까워지는 기준선임을 수치로 확인하게 하세요.",
      questions: "거리의 차는 왜 두 초점 사이 거리보다 작아야 하나요? 한 쌍의 기지국만으로 선박 위치가 한 점으로 정해지지 않는 이유는 무엇인가요?"
    }),
    tabs: [
      ["locus", "거리의 차 자취", "|PF-PF′|가 일정한 점의 두 갈래 자취를 생성합니다.", "hyperbola-locus.html"],
      ["asymptote", "점근선 접근", "쌍곡선 위의 점이 멀어질수록 점근선에 어떻게 가까워지는지 측정합니다.", "hyperbola-asymptote.html"],
      ["translate", "평행이동", "중심과 점근선을 이동시키며 표준형과 평행이동형을 연결합니다.", "hyperbola-translate.html"],
      ["tracking", "기지국 위치 추적", "두 기지국까지 거리의 차로 선박이 있을 수 있는 위치를 찾습니다.", "hyperbola-tracking.html"]
    ]
  },
  tangent: {
    chapter: "conic",
    title: "이차곡선의 접선",
    unit: "Ⅰ-04. 이차곡선의 접선의 방정식",
    description: "판별식 D=0, 접점 공식, 기울기가 같은 접선과 반사 법칙을 함께 비교합니다.",
    manual: makeManual({
      purpose: "직선과 이차곡선의 교점이 하나가 되는 조건과 접점에서의 접선 공식을 시각화하고, 접선의 법선으로 반사 성질을 설명합니다.",
      steps: "직선을 움직여 D의 부호 비교 → 접점 드래그와 접선식 확인 → 같은 기울기의 두 접선 비교 → 접선·법선·반사각 연결",
      tips: "접선을 ‘한 점에서 만나는 직선’으로만 기억하지 않고 중근, 접점 공식, 법선의 세 관점으로 설명하게 하세요.",
      questions: "D=0은 그래프에서 무엇을 뜻하나요? 같은 기울기의 접선이 두 개 생기는 경우 두 직선은 어떤 관계인가요?"
    }),
    tabs: [
      ["discriminant", "판별식 게이트", "교점 개수와 이차방정식의 판별식 부호를 실시간으로 비교합니다.", "tangent-discriminant.html"],
      ["drag", "접점 드래그", "포물선·타원·쌍곡선의 접점을 움직이며 접선의 방정식을 만듭니다.", "tangent-drag.html"],
      ["parallel", "같은 기울기 접선", "주어진 기울기를 갖는 두 접선의 위치와 식을 비교합니다.", "tangent-parallel.html"],
      ["reflection", "접선과 반사", "접점의 접선·법선과 입사각·반사각의 관계를 확인합니다.", "tangent-reflection.html"]
    ]
  },
  "conic-project": {
    chapter: "conic",
    title: "이차곡선 프로젝트",
    unit: "Ⅰ. 창의 수학 프로젝트 · 미래 수학 유니버스",
    description: "교과서 54~55쪽의 망원경과 건축 사례를 조작 가능한 모형으로 재구성했습니다.",
    manual: makeManual({
      purpose: "포물선과 쌍곡선 거울이 결합된 카세그레인 망원경, 쌍곡선형 구조와 여러 건축물의 이차곡선을 교과서 프로젝트와 연결합니다.",
      steps: "망원경의 두 초점 맞추기 → 광선 경로 추적 → 쌍곡선 구조의 단면·회전 관찰 → 건축 사례에서 사용된 곡선과 기능 설명",
      tips: "건축물의 겉모양만 닮았다고 판단하지 말고 단면, 회전체, 반사 또는 구조 안정성 중 어떤 수학적 성질을 쓰는지 구분하게 하세요.",
      questions: "카세그레인 망원경에 포물선과 쌍곡선이 함께 필요한 이유는 무엇인가요? 쌍곡선 단면을 회전하면 어떤 3차원 구조가 되나요?"
    }),
    tabs: [
      ["cassegrain", "카세그레인 망원경", "포물면 주거울과 쌍곡면 부거울의 초점·광선 경로를 맞춥니다.", "cassegrain.html"],
      ["structure", "쌍곡선형 구조", "냉각탑·고층 구조에 쓰이는 쌍곡선형 단면과 회전체를 탐색합니다.", "hyperbola-architecture.html"],
      ["gallery", "건축 전시관", "포물선·타원·쌍곡선이 사용된 건축 사례를 비교합니다.", "conic-architecture-gallery.html"]
    ]
  },
  "space-relations": {
    chapter: "space",
    title: "직선과 평면의 위치 관계",
    unit: "Ⅱ-01. 직선과 평면의 위치 관계",
    description: "공간에서 직선·평면의 평행, 수직, 교차, 포함, 꼬인 위치와 평면 결정 조건을 탐구합니다.",
    manual: makeManual({
      purpose: "직선과 직선, 직선과 평면, 평면과 평면의 위치 관계를 회전 가능한 모형과 정육면체에서 분류합니다.",
      steps: "두 대상 선택 → 장면 회전 → 위치 관계 판정 → 평면 결정 조건 조립 → 꼬인 두 직선의 각 측정 → 정육면체 문제 적용",
      tips: "한 시점의 그림에서 만나 보인다는 이유로 교차라고 판단하지 않도록 장면을 회전하고 공통점 존재 여부를 확인하게 하세요.",
      questions: "꼬인 두 직선과 평행한 두 직선은 무엇이 다른가요? 세 점이 한 평면을 결정하지 못하는 경우는 언제인가요?"
    }),
    tabs: [
      ["relations", "3D 위치 관계", "직선·평면 두 대상을 선택하고 공간 관계를 회전해 확인합니다.", "space-relations.html"],
      ["plane", "평면 결정 조건", "세 점, 직선과 점, 두 직선으로 평면이 결정되는 조건을 조립합니다.", "plane-conditions.html"],
      ["skew", "꼬인 직선의 각", "꼬인 두 직선과 평행한 교차 직선을 이용해 각을 측정합니다.", "skew-angle.html"],
      ["cube", "정육면체 관계 게임", "정육면체의 모서리와 면 사이 관계를 게임으로 분류합니다.", "cube-relations-game.html"]
    ]
  },
  "three-perpendicular": {
    chapter: "space",
    title: "삼수선 정리와 이면각",
    unit: "Ⅱ-02. 삼수선 정리",
    description: "세 수선의 관계에서 공간 최단거리와 두 평면의 이면각까지 연결합니다.",
    manual: makeManual({
      purpose: "삼수선 정리의 조건과 결론을 조작하고, 공간에서의 최단거리와 이면각을 수선으로 구성합니다.",
      steps: "평면 위·밖의 점과 수선 배치 → 세 수직 조건 확인 → 수선의 발로 최단거리 찾기 → 두 평면의 공통 수직 단면에서 이면각 측정",
      tips: "공간 그림을 평면 그림처럼 읽지 않도록 어떤 선이 어느 평면 위에 있는지 먼저 말하게 하세요.",
      questions: "점과 평면 사이 최단거리가 왜 수선의 길이인가요? 이면각은 왜 교선에 수직인 두 직선의 각으로 재나요?",
      cautions: "관람석·경기장 도구는 최단거리 탭과 기능이 겹쳐 제외하고, 정리·거리·이면각의 세 단계로 압축했습니다."
    }),
    tabs: [
      ["theorem", "삼수선 조작", "삼수선 정리의 가정과 결론을 점과 선을 움직여 확인합니다.", "three-perpendicular.html"],
      ["distance", "공간 최단거리", "점·직선·평면 사이의 최단거리 수선을 찾아 비교합니다.", "space-shortest-distance.html"],
      ["dihedral", "두 평면의 이면각", "교선에 수직인 두 직선을 구성해 이면각을 측정합니다.", "dihedral-angle.html"]
    ]
  },
  projection: {
    chapter: "space",
    title: "정사영",
    unit: "Ⅱ-03. 정사영",
    description: "빛 방향에 따른 그림자에서 선분 길이와 도형 넓이의 코사인 관계를 확인합니다.",
    manual: makeManual({
      purpose: "공간도형의 정사영을 빛의 방향과 수선 투영으로 만들고 길이·넓이가 cosθ와 연결되는 이유를 탐구합니다.",
      steps: "평행광으로 그림자 만들기 → 선분의 기울기와 정사영 길이 측정 → 평면 도형의 각도와 정사영 넓이 비교",
      tips: "정사영 길이 공식에서 θ가 선분과 투영 평면이 이루는 각인지, 두 방향벡터의 각인지 정확히 구분하세요.",
      questions: "정사영 길이가 원래 길이보다 길어질 수 있나요? 면이 투영 평면과 수직일 때 넓이는 왜 0이 되나요?",
      cautions: "원기둥 절단과 물그릇 도구는 정사영 핵심 목표보다 이차곡선·부피 해석 비중이 커 게시 대상에서 제외했습니다."
    }),
    tabs: [
      ["shadow", "3D 그림자", "공간도형과 빛의 방향을 바꾸어 정사영을 직접 만듭니다.", "projection-shadow.html"],
      ["length", "길이와 cos", "선분의 각도와 정사영 길이 L|cosθ|를 비교합니다.", "projection-length.html"],
      ["area", "넓이 비교", "평면 도형의 기울기와 정사영 넓이 S|cosθ|를 확인합니다.", "projection-area.html"]
    ]
  },
  "space-coordinates": {
    chapter: "space",
    title: "공간에서 점의 좌표",
    unit: "Ⅱ-04. 공간에서 점의 좌표",
    description: "세 좌표평면과의 거리로 3차원 좌표를 읽고 실제 좌석 배치에 적용합니다.",
    manual: makeManual({
      purpose: "x, y, z축과 세 좌표평면을 기준으로 점의 위치·팔분공간·대칭점을 읽고 공연장 좌석 체계에 적용합니다.",
      steps: "점을 세 축 방향으로 이동 → 좌표평면까지 거리 확인 → 팔분공간과 대칭점 판정 → 좌석의 위치를 좌표로 설계",
      tips: "2차원 그림의 위아래와 z좌표를 혼동하지 않도록 장면을 돌려 같은 점을 여러 시점에서 읽게 하세요.",
      questions: "점 (a,b,c)에서 xy평면까지 거리는 무엇인가요? 좌표평면에 대한 대칭은 어떤 좌표의 부호만 바꾸나요?",
      cautions: "2차원 대칭 최단경로와 광물 밀러 지수는 이 소단원의 핵심 좌표 읽기에서 벗어나 제외했습니다."
    }),
    tabs: [
      ["point", "3차원 좌표", "점을 이동해 세 좌표와 좌표평면까지의 거리를 읽습니다.", "space-coordinates.html"],
      ["seat", "좌석 좌표 설계", "공연장 좌석을 행·열·높이 좌표로 배치하고 위치를 찾습니다.", "seat-coordinates.html"]
    ]
  },
  "internal-division": {
    chapter: "space",
    title: "공간의 내분점과 무게중심",
    unit: "Ⅱ-05. 좌표공간에서 선분의 내분점",
    description: "3차원 선분의 내분점 공식과 여러 점의 가중평균을 시각적으로 연결합니다.",
    manual: makeManual({
      purpose: "좌표공간에서 선분의 내분점을 비에 따라 이동시키고 삼각형·사면체의 무게중심을 좌표의 평균으로 확인합니다.",
      steps: "두 점과 내분비 조절 → 좌표 공식과 거리비 확인 → 여러 점에 같은 무게 배치 → 무게를 바꾸어 가중점 이동 관찰",
      tips: "내분점 공식의 계수가 반대쪽 끝점에 붙는 이유를 거리비와 함께 설명하게 하세요.",
      questions: "m:n이 커질 때 내분점은 어느 점에 가까워지나요? 모든 꼭짓점의 무게가 같을 때 무게중심 좌표는 왜 평균인가요?",
      cautions: "베지에 곡선은 반복 내분의 확장 사례지만 교과서 핵심 목표보다 디자인 활동 비중이 커 제외했습니다."
    }),
    tabs: [
      ["section", "3차원 내분점", "두 점과 내분비를 조절해 내분점 좌표와 거리비를 확인합니다.", "internal-division.html"],
      ["centroid", "공간 무게중심", "여러 점의 무게와 가중평균으로 무게중심을 찾습니다.", "space-centroid.html"]
    ]
  },
  sphere: {
    chapter: "space",
    title: "구의 방정식",
    unit: "Ⅱ-06. 구의 방정식",
    description: "중심·반지름에서 표준형과 일반형을 만들고 구와 평면의 교차원을 탐구합니다.",
    manual: makeManual({
      purpose: "구의 중심과 반지름을 방정식에 연결하고 일반형을 완전제곱해 판정하며, 구와 평면의 위치 관계를 교차원의 반지름으로 해석합니다.",
      steps: "중심·반지름 조절 → 표준형 읽기 → 일반형 완전제곱 → 실수 구 조건 판정 → 평면 이동과 교차원 변화 관찰",
      tips: "구와 평면 사이 거리를 d라 할 때 d<r, d=r, d>r를 교차원·접평면·만나지 않음으로 연결하세요.",
      questions: "일반형이 점 하나 또는 공집합을 나타내는 경우는 언제인가요? 교차원의 반지름은 평면이 중심에서 멀어질수록 어떻게 변하나요?",
      cautions: "구의 그림자 도구는 정사영 탭과 기능이 겹쳐 제외했습니다."
    }),
    tabs: [
      ["equation", "표준형 조절", "중심과 반지름을 바꾸며 (x-a)²+(y-b)²+(z-c)²=r²을 확인합니다.", "sphere-equation.html"],
      ["general", "일반형 판별", "구의 일반형을 완전제곱해 중심·반지름과 존재 조건을 찾습니다.", "sphere-general.html"],
      ["plane", "구와 평면", "평면을 이동해 교차원·접평면·분리 상태를 비교합니다.", "sphere-plane.html"]
    ]
  },
  "space-project": {
    chapter: "space",
    title: "공간좌표 프로젝트",
    unit: "Ⅱ. 창의 수학 프로젝트 · 미래 수학 유니버스",
    description: "교과서 100~101쪽의 움직이는 두 점 최단거리와 비눗방울 최소 표면 구조를 탐구합니다.",
    manual: makeManual({
      purpose: "시간에 따라 움직이는 두 점의 좌표로 최소거리를 찾고, 비눗방울 경계가 120°로 만나는 최소 표면 구조를 관찰합니다.",
      steps: "두 이동 경로를 좌표로 설정 → 시간 슬라이더와 거리 그래프 비교 → 최소 시점 찾기 → 비눗방울 수와 압력 조절 → 경계면 각도·표면적 비교",
      tips: "두 프로젝트 모두 ‘최소’라는 공통 질문을 갖지만 첫 활동은 거리함수, 둘째 활동은 표면적이라는 목적량이 다름을 분명히 하세요.",
      questions: "거리의 제곱을 최소화해도 같은 시점이 나오는 이유는 무엇인가요? 세 비눗방울의 경계가 120°로 만나는 것이 왜 효율적인가요?"
    }),
    tabs: [
      ["distance", "움직이는 두 점", "자전거와 엘리베이터의 위치를 시간의 함수로 나타내 최소거리를 찾습니다.", "moving-min-distance.html"],
      ["bubble", "비눗방울 구조", "비눗방울이 만나는 각도와 최소 표면 구조를 조작합니다.", "bubble-minimal-surface.html"]
    ]
  },
  "vector-operations": {
    chapter: "vector",
    title: "벡터의 뜻과 덧셈·뺄셈",
    unit: "Ⅲ-01. 벡터의 뜻과 덧셈, 뺄셈",
    description: "방향과 크기, 삼각형·평행사변형법, 성분별 연산과 힘의 합성을 연결합니다.",
    manual: makeManual({
      purpose: "벡터를 크기와 방향으로 읽고 덧셈·뺄셈을 기하적 작도와 성분 계산으로 확인해 바람과 힘에 적용합니다.",
      steps: "풍향·풍속을 화살표로 표현 → 두 벡터를 이어 합성 → 평행사변형법과 비교 → 힘의 합력·분력 조절",
      tips: "벡터의 시작점이 달라도 크기와 방향이 같으면 같은 벡터임을 여러 위치에 평행이동해 확인하게 하세요.",
      questions: "벡터 덧셈의 순서를 바꾸어도 결과가 같은 이유는 무엇인가요? 힘이 평형을 이루려면 합벡터가 어떤 벡터여야 하나요?",
      cautions: "태풍 위험 반원은 기상학적 전제와 안전 판단 비중이 커 핵심 연산 탭에서 제외했습니다."
    }),
    tabs: [
      ["wind", "풍향·풍속", "방향각과 크기를 바람 벡터의 성분으로 바꿉니다.", "wind-vector.html"],
      ["addition", "벡터 덧셈", "삼각형법과 평행사변형법으로 합벡터·차벡터를 만듭니다.", "vector-addition.html"],
      ["force", "힘의 합성·분해", "두 힘의 합력과 한 힘의 성분 분해를 조절합니다.", "force-decomposition.html"]
    ]
  },
  "scalar-vector": {
    chapter: "vector",
    title: "벡터의 실수배",
    unit: "Ⅲ-02. 벡터의 실수배",
    description: "실수배에 따른 크기·방향 변화와 벡터의 정규화를 연결합니다.",
    manual: makeManual({
      purpose: "k·a에서 k의 부호와 절댓값이 방향과 크기를 어떻게 바꾸는지 확인하고, 단위벡터로 방향만 남기는 과정을 탐구합니다.",
      steps: "k를 양수·0·음수로 바꾸기 → 원벡터와 평행 여부 확인 → 크기 비율 계산 → 벡터를 크기로 나누어 단위벡터 만들기",
      tips: "영벡터는 방향이 없고 단위벡터로 정규화할 수 없다는 예외를 반드시 확인하세요.",
      questions: "k<0일 때 평행과 같은 방향은 어떻게 구분하나요? 벡터를 정규화해도 변하지 않는 정보는 무엇인가요?"
    }),
    tabs: [
      ["scalar", "확대·반전", "실수배 k를 바꾸며 벡터의 길이와 방향을 비교합니다.", "scalar-vector.html"],
      ["unit", "단위벡터", "벡터를 크기로 나누어 방향이 같은 길이 1의 벡터를 만듭니다.", "unit-vector.html"]
    ]
  },
  "position-vector": {
    chapter: "vector",
    title: "위치벡터",
    unit: "Ⅲ-03. 위치벡터",
    description: "도형의 점을 위치벡터로 표현하고 내분·무게중심 관계를 벡터식으로 확인합니다.",
    manual: makeManual({
      purpose: "원점을 기준으로 점의 위치를 벡터로 나타내고, 도형의 평행이동·내분점·가중점을 위치벡터의 결합으로 표현합니다.",
      steps: "점의 위치벡터 배치 → 두 위치벡터의 차로 변 벡터 만들기 → 도형 조립 → 계수의 합과 가중점 위치 비교",
      tips: "AB벡터=b-a를 ‘도착 위치에서 출발 위치를 뺀다’는 이동으로 설명하게 하세요.",
      questions: "원점을 바꾸면 위치벡터와 변벡터 중 무엇이 변하나요? 가중치의 합으로 나누는 이유는 무엇인가요?"
    }),
    tabs: [
      ["shape", "위치벡터 도형", "위치벡터와 두 점의 차로 도형의 변과 평행이동을 구성합니다.", "position-shape.html"],
      ["centroid", "무게중심·가중점", "위치벡터의 가중합으로 삼각형의 무게중심과 가중점을 찾습니다.", "weighted-centroid.html"]
    ]
  },
  components: {
    chapter: "vector",
    title: "벡터의 성분과 벡터방정식",
    unit: "Ⅲ-04. 벡터의 성분",
    description: "2차원·3차원 성분, 벡터 연산과 매개변수 벡터방정식의 자취를 동기화합니다.",
    manual: makeManual({
      purpose: "벡터의 기하적 화살표와 좌표 성분을 연결하고 성분별 연산 및 p=a+tu가 만드는 자취를 탐구합니다.",
      steps: "화살표를 축 방향으로 분해 → 2D와 3D 성분 읽기 → 합·차·실수배를 그림과 계산으로 비교 → t를 움직여 벡터방정식의 자취 만들기",
      tips: "성분은 벡터 자체가 아니라 선택한 좌표축에 따른 표현임을 좌표축 또는 장면을 바꾸어 확인하세요.",
      questions: "같은 벡터의 성분이 좌표축에 따라 달라질 수 있나요? p=a+tu에서 t의 범위를 제한하면 어떤 도형이 되나요?"
    }),
    tabs: [
      ["decompose", "2D·3D 성분", "벡터를 각 좌표축 방향 성분으로 분해합니다.", "vector-components.html"],
      ["operations", "연산 동기화", "화살표와 성분 계산을 동시에 보며 합·차·실수배를 확인합니다.", "vector-operations.html"],
      ["locus", "벡터방정식 자취", "매개변수 t가 만드는 직선·선분·반직선의 자취를 탐색합니다.", "vector-locus.html"]
    ]
  },
  "dot-product": {
    chapter: "vector",
    title: "벡터의 내적",
    unit: "Ⅲ-05. 벡터의 내적",
    description: "내적과 각, 부호가 정하는 영역, 움직이는 점에서의 최댓값·최솟값을 연결합니다.",
    manual: makeManual({
      purpose: "a·b=|a||b|cosθ를 각도와 성분 계산으로 확인하고 내적의 부호·조건·최적화 문제를 시각적으로 해결합니다.",
      steps: "두 벡터의 각 조절 → 내적과 cosθ 비교 → a·x의 부호 영역 색칠 → 움직이는 점의 내적 그래프에서 극값 찾기",
      tips: "내적이 0이라는 결론 전에 두 벡터가 영벡터가 아닌지 확인하고, 내적을 단순한 곱이 아니라 한 벡터 방향의 투영으로 설명하세요.",
      questions: "내적의 부호는 두 벡터가 이루는 각과 어떻게 연결되나요? 원 위를 움직이는 점에서 내적이 최대가 되는 방향은 무엇인가요?"
    }),
    tabs: [
      ["angle", "내적과 각", "각도·크기·성분을 바꾸며 두 내적 공식을 비교합니다.", "dot-angle.html"],
      ["region", "내적 조건 영역", "a·x>0, =0, <0을 만족하는 점의 영역을 탐색합니다.", "dot-region.html"],
      ["extrema", "내적의 최댓값·최솟값", "움직이는 점의 위치와 내적값 그래프에서 극값을 찾습니다.", "dot-extrema.html"]
    ]
  },
  "vector-lines": {
    chapter: "vector",
    title: "직선의 방정식",
    unit: "Ⅲ-06. 직선의 방정식",
    description: "한 점과 방향벡터로 직선을 만들고 두 직선 관계와 점·직선 최단거리를 탐구합니다.",
    manual: makeManual({
      purpose: "공간 직선의 벡터방정식과 매개방정식을 만들고 평행·일치·교차·꼬인 위치를 판정하며 최단거리를 구합니다.",
      steps: "점 A와 방향벡터 u 선택 → p=a+tu 생성 → 두 직선의 방향·공통점 검사 → 수선의 발 H를 찾아 최단거리 측정",
      tips: "방향벡터가 실수배라고 해서 두 직선이 항상 일치하는 것은 아니며, 한 점의 포함 여부를 추가로 확인하게 하세요.",
      questions: "두 직선의 방향벡터가 평행하면 가능한 위치 관계는 무엇인가요? 점과 직선의 최단거리 벡터는 방향벡터와 어떤 관계인가요?"
    }),
    tabs: [
      ["equation", "점·방향벡터 직선", "한 점과 방향벡터로 2D·3D 직선의 매개방정식을 만듭니다.", "line-equation.html"],
      ["relations", "공간 직선 관계", "두 직선을 평행·일치·교차·꼬인 위치로 판정합니다.", "line-relations.html"],
      ["distance", "점과 직선의 거리", "수선의 발과 내적 조건으로 점에서 직선까지 최단거리를 구합니다.", "point-line-distance.html"]
    ]
  },
  "vector-planes": {
    chapter: "vector",
    title: "평면과 구의 방정식",
    unit: "Ⅲ-07. 평면의 방정식과 구의 방정식",
    description: "점·법선벡터로 평면을 만들고 두 평면의 각과 구의 접평면을 연결합니다.",
    manual: makeManual({
      purpose: "한 점과 법선벡터에서 평면의 벡터·좌표방정식을 만들고, 법선의 내적으로 두 평면의 각과 구의 접평면을 구합니다.",
      steps: "점 A와 법선 n 조절 → (p-a)·n=0 확인 → 좌표방정식 변환 → 두 법선의 각 비교 → 구의 반지름벡터를 접평면 법선으로 사용",
      tips: "법선벡터의 0이 아닌 실수배는 같은 평면을 나타내므로 식의 계수만 비교하지 말고 비례 관계를 확인하게 하세요.",
      questions: "두 평면이 수직일 조건을 법선벡터로 어떻게 나타내나요? 구의 접점으로 향한 반지름이 접평면의 법선인 이유는 무엇인가요?",
      cautions: "빛의 평면 반사 설계실은 접선·반사 탭과 기능이 겹쳐 제외했습니다."
    }),
    tabs: [
      ["plane", "점·법선벡터 평면", "점과 법선벡터로 벡터방정식과 좌표방정식을 만듭니다.", "plane-equation.html"],
      ["angle", "두 평면의 각", "두 법선벡터의 내적으로 평면 사이의 예각을 구합니다.", "plane-angle.html"],
      ["tangent", "구의 접평면", "접점의 반지름벡터를 법선으로 사용해 접평면의 방정식을 만듭니다.", "sphere-tangent-plane.html"]
    ]
  },
  "vector-project": {
    chapter: "vector",
    title: "속도와 벡터 프로젝트",
    unit: "Ⅲ. 창의 수학 프로젝트 · 미래 수학 유니버스",
    description: "교과서 172~173쪽의 상대 속도와 제트 기류에 따른 항공시간 차이를 시뮬레이션합니다.",
    manual: makeManual({
      purpose: "상대 속도=(물체의 속도)-(관찰자의 속도)를 여러 관찰자 관점에서 확인하고, 비행기 속도와 바람 벡터의 합으로 항공시간 차이를 설명합니다.",
      steps: "물체 A·B의 속도 설정 → 관찰자 전환 → 상대 속도 계산 → 비행기 진행방향과 제트 기류 합성 → 지상속도와 비행시간 비교",
      tips: "속력은 스칼라, 속도는 벡터임을 구분하고 왕복 거리만 같다고 시간이 같아지는 것은 아님을 지상속도로 설명하게 하세요.",
      questions: "관찰자를 바꾸면 어떤 벡터를 빼야 하나요? 옆바람이 불 때 목적지로 가려면 기수 방향을 왜 보정해야 하나요?",
      cautions: "스포츠 동작 분석은 교과서 프로젝트와 직접 연결되지 않아 제외하고, 172~173쪽의 두 활동만 유지했습니다."
    }),
    tabs: [
      ["relative", "상대 속도", "관찰자를 바꾸며 보이는 상대 속도 벡터를 비교합니다.", "relative-velocity.html"],
      ["jetstream", "제트 기류와 항공시간", "비행기 속도와 바람을 합성해 왕복 비행시간 차이를 계산합니다.", "jetstream-flight.html"]
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
  ["cautions", "통합·제외 기준과 유의 사항"]
];

const params = new URLSearchParams(window.location.search);
let chapterKey = CHAPTERS[params.get("chapter")] ? params.get("chapter") : "conic";
let topicKey =
  TOPICS[params.get("topic")]?.chapter === chapterKey
    ? params.get("topic")
    : CHAPTERS[chapterKey].topics[0];
let activeIndex = 0;
let lastFocus = null;
let focusMode = params.get("view") !== "overview";
let moduleChromeHidden = params.get("chrome") !== "show";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const frame = $("[data-frame]");
const frameWrap = $(".frame-wrap");
const loading = $("[data-frame-loading]");
const manual = $("[data-manual]");
const manualDialog = $(".manual-dialog");
const chapterList = $("[data-chapters]");
const topicList = $("[data-topics]");
const tabList = $("[data-tabs]");

Object.entries(CHAPTERS).forEach(([key, chapter]) => {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.chapter = key;
  button.innerHTML = `<span>${chapter.numeral}</span><b>${chapter.title}</b><small>${chapter.topics.length}개 주제</small>`;
  button.addEventListener("click", () => selectChapter(key));
  chapterList.append(button);
});

function setAccent(chapter) {
  document.documentElement.style.setProperty("--accent", chapter.accent);
  document.documentElement.style.setProperty(
    "--accent-soft",
    `color-mix(in srgb, ${chapter.accent} 12%, white)`
  );
}

function selectChapter(nextKey) {
  chapterKey = nextKey;
  topicKey = CHAPTERS[chapterKey].topics[0];
  renderChapter();
}

function renderChapter() {
  const chapter = CHAPTERS[chapterKey];
  setAccent(chapter);
  $("[data-unit-label]").textContent = `${chapter.unit} · 2022 개정`;
  $("[data-suite-title]").textContent = chapter.title;
  $("[data-suite-description]").textContent = chapter.description;
  $("[data-topic-count]").textContent = chapter.topics.length;
  $("[data-tab-count]").textContent = chapter.topics.reduce(
    (sum, key) => sum + TOPICS[key].tabs.length,
    0
  );

  $$("[data-chapter]").forEach((button) => {
    const selected = button.dataset.chapter === chapterKey;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-current", selected ? "page" : "false");
  });

  topicList.replaceChildren();
  chapter.topics.forEach((key, index) => {
    const topic = TOPICS[key];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "topic";
    button.role = "tab";
    button.dataset.topic = key;
    button.innerHTML = `<span>${String(index + 1).padStart(2, "0")}</span><b>${topic.title}</b><small>${topic.tabs.length}개 탭</small>`;
    button.addEventListener("click", () => selectTopic(key));
    topicList.append(button);
  });

  selectTopic(topicKey, false);
}

function selectTopic(nextKey, updateUrl = true) {
  topicKey = nextKey;
  const topic = TOPICS[topicKey];
  [...topicList.children].forEach((button) => {
    const selected = button.dataset.topic === topicKey;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  renderTabs();
  renderManual();

  const requestedTab = params.get("tab");
  activeIndex = Math.max(
    0,
    topic.tabs.findIndex(([id]) => id === requestedTab)
  );
  selectTab(activeIndex, false, updateUrl);
}

function renderTabs() {
  tabList.replaceChildren();
  TOPICS[topicKey].tabs.forEach(([id, label], index) => {
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
}

function selectTab(index, focus = false, updateUrl = true) {
  const topic = TOPICS[topicKey];
  activeIndex = (index + topic.tabs.length) % topic.tabs.length;
  const [id, title, description, file] = topic.tabs[activeIndex];
  [...tabList.children].forEach((tab, tabIndex) => {
    const selected = tabIndex === activeIndex;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });

  $("[data-tab-step]").textContent =
    `${topic.unit} · 탭 ${activeIndex + 1}/${topic.tabs.length}`;
  $("[data-tab-title]").textContent = title;
  $("[data-tab-description]").textContent = description;
  const source = `./modules/${file}`;
  loading.classList.remove("is-ready");
  frame.id = "tool-frame";
  frame.title = `${topic.title} - ${title}`;
  frame.src = source;
  $("[data-open-module]").href = source;
  document.title = `${topic.title} | 기하 통합 웹툴`;

  if (updateUrl) {
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.set("chapter", chapterKey);
    nextParams.set("topic", topicKey);
    nextParams.set("tab", id);
    nextParams.delete("manual");
    history.replaceState(null, "", `${window.location.pathname}?${nextParams.toString()}`);
  }

  if (focus) {
    tabList.children[activeIndex]?.focus();
    tabList.children[activeIndex]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center"
    });
  }
}

const embeddedStyle = `
  html.geometry-compact-tool .app > header .title,
  html.geometry-compact-tool .app > header > .brand,
  html.geometry-compact-tool .shell > header .title,
  html.geometry-compact-tool body > header .title,
  html.geometry-compact-tool body > header > .brand,
  html.geometry-compact-tool .hero-copy,
  html.geometry-compact-tool .intro {
    display: none !important;
  }
  html.geometry-compact-tool .app > header,
  html.geometry-compact-tool .shell > header,
  html.geometry-compact-tool body > header {
    min-height: 0 !important;
    justify-content: flex-end !important;
    padding: 7px 12px !important;
  }
  html.geometry-compact-tool .app,
  html.geometry-compact-tool .wrap,
  html.geometry-compact-tool main,
  html.geometry-compact-tool main.shell {
    padding-top: 8px !important;
  }
  html.geometry-compact-tool .footer,
  html.geometry-compact-tool .footer-note,
  html.geometry-compact-tool body > footer {
    display: none !important;
  }
`;

function applyModuleChrome() {
  try {
    const doc = frame.contentDocument;
    if (!doc?.documentElement) return;
    let style = doc.getElementById("geometry-embed-style");
    if (!style) {
      style = doc.createElement("style");
      style.id = "geometry-embed-style";
      style.textContent = embeddedStyle;
      doc.head.append(style);
    }
    doc.documentElement.classList.toggle("geometry-compact-tool", moduleChromeHidden);
  } catch {
    // 새 창으로 연 경우에는 원래 도구 화면을 그대로 사용합니다.
  }
}

function syncViewMode(updateUrl = true) {
  document.body.classList.toggle("focus-view", focusMode);
  $$("[data-focus-toggle]").forEach((button) => {
    button.setAttribute("aria-pressed", String(focusMode));
  });
  $$("[data-focus-label]").forEach((label) => {
    label.textContent = focusMode ? "소개 보기" : "집중 보기";
  });
  $("[data-module-chrome-toggle]").setAttribute(
    "aria-pressed",
    String(moduleChromeHidden)
  );
  $("[data-module-chrome-label]").textContent = moduleChromeHidden
    ? "도구 소개 보기"
    : "도구 소개 숨기기";
  applyModuleChrome();

  if (updateUrl) {
    const nextParams = new URLSearchParams(window.location.search);
    if (focusMode) nextParams.delete("view");
    else nextParams.set("view", "overview");
    if (moduleChromeHidden) nextParams.delete("chrome");
    else nextParams.set("chrome", "show");
    history.replaceState(null, "", `${window.location.pathname}?${nextParams.toString()}`);
  }
}

function openModuleHelp() {
  try {
    const doc = frame.contentDocument;
    const direct = doc?.querySelector(
      "#helpBtn, #helpButton, #openHelp, #openGuideButton, [data-help], [data-guide-open]"
    );
    const textMatch = [...(doc?.querySelectorAll("button") || [])].find((button) =>
      /도움말|설명서|사용법/.test(button.textContent)
    );
    const trigger = direct || textMatch;
    if (trigger) {
      trigger.click();
      return;
    }
  } catch {
    // 아래의 소개 표시로 대체합니다.
  }
  moduleChromeHidden = false;
  syncViewMode();
}

frame.addEventListener("load", () => {
  applyModuleChrome();
  loading.classList.add("is-ready");
});
$("[data-refresh]").addEventListener("click", () => {
  loading.classList.remove("is-ready");
  frame.src = frame.src;
});
$("[data-module-help]").addEventListener("click", openModuleHelp);
$$("[data-focus-toggle]").forEach((button) => {
  button.addEventListener("click", () => {
    focusMode = !focusMode;
    syncViewMode();
    if (!focusMode) document.querySelector("main")?.scrollIntoView({ block: "start" });
  });
});
$("[data-module-chrome-toggle]").addEventListener("click", () => {
  moduleChromeHidden = !moduleChromeHidden;
  syncViewMode();
});
$("[data-fullscreen]").addEventListener("click", async () => {
  if (document.fullscreenElement) {
    await document.exitFullscreen?.();
    return;
  }
  await frameWrap.requestFullscreen?.();
});
document.addEventListener("fullscreenchange", () => {
  $("[data-fullscreen]").textContent = document.fullscreenElement
    ? "전체 화면 닫기"
    : "전체 화면";
});

tabList.addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const count = TOPICS[topicKey].tabs.length;
  if (event.key === "Home") selectTab(0, true);
  else if (event.key === "End") selectTab(count - 1, true);
  else selectTab(activeIndex + (event.key === "ArrowRight" ? 1 : -1), true);
});

function renderManual() {
  const topic = TOPICS[topicKey];
  $("[data-manual-title]").textContent = `${topic.title} 설명서`;
  const chipBox = $("[data-manual-tabs]");
  const sectionBox = $("[data-manual-sections]");
  chipBox.replaceChildren();
  sectionBox.replaceChildren();

  topic.tabs.forEach(([, label]) => {
    const chip = document.createElement("span");
    chip.textContent = label;
    chipBox.append(chip);
  });

  MANUAL_LABELS.forEach(([key, label]) => {
    const section = document.createElement("section");
    section.className = "manual-section";
    const heading = document.createElement("h3");
    heading.textContent = label;
    const paragraph = document.createElement("p");
    paragraph.textContent = topic.manual[key];
    section.append(heading, paragraph);
    sectionBox.append(section);
  });
}

function openManual(trigger) {
  lastFocus = trigger || document.activeElement;
  manual.hidden = false;
  document.body.classList.add("manual-open");
  const nextParams = new URLSearchParams(window.location.search);
  nextParams.set("chapter", chapterKey);
  nextParams.set("topic", topicKey);
  nextParams.set("tab", TOPICS[topicKey].tabs[activeIndex][0]);
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

renderChapter();
syncViewMode(false);
if (params.get("manual") === "1") openManual();
