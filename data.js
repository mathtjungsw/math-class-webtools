// 교사 정보는 이 배열에서 관리합니다.
// image에는 로컬 이미지 경로("./images/teacher.png"), 원격 이미지 URL, data URL을 넣을 수 있습니다.
// tools에는 웹툴 검색에 노출할 개별 웹툴 정보를 넣습니다.
const teachers = [
  {
    name: "정승원",
    school: "경남 웅천고등학교",
    description: "수학 수업에 바로 활용할 수 있는 인터랙티브 웹툴을 제작하고 공유합니다.",
    tags: ["함수", "확률", "통계", "인공지능 수학", "공학도구", "수업활동"],
    url: "https://mathtjungsw.github.io/math-class-webtools/",
    image: "",
    imageAlt: "정승원 선생님 웹툴 모음 페이지 미리보기",
    tools: [
      {
        title: "몬티홀 딜레마 실험",
        description: "반복 실험으로 선택 유지와 변경의 확률 차이를 비교합니다.",
        tags: ["확률", "통계", "수업활동"],
        url: "https://mathtjungsw.github.io/math-class-webtools/probability-statistics/monty-hall/",
      },
      {
        title: "이미지 지도학습 AI 만들기",
        description: "직접 모은 이미지로 분류 모델을 학습시키는 인공지능 수학 활동입니다.",
        tags: ["인공지능 수학", "공학도구", "수업활동"],
        url: "https://mathtjungsw.github.io/math-class-webtools/ai-math/image-supervised-learning/",
      },
      {
        title: "감성 분석 AI 실습",
        description: "문장 데이터를 바탕으로 간단한 감성 분류 원리를 탐구합니다.",
        tags: ["인공지능 수학", "통계", "공학도구"],
        url: "https://mathtjungsw.github.io/math-class-webtools/ai-math/sentiment-ai/",
      },
      {
        title: "추세선으로 예측하기",
        description: "산점도, 추세선, 결정계수를 이용해 데이터를 해석하고 예측합니다.",
        tags: ["함수", "통계", "공학도구"],
        url: "https://mathtjungsw.github.io/math-class-webtools/ai-math/trendline-prediction/",
      },
      {
        title: "마이너스 경매",
        description: "정수 계산과 전략적 선택을 함께 다루는 수학 게임입니다.",
        tags: ["게임형 수업", "수업활동"],
        url: "https://mathtjungsw.github.io/math-class-webtools/math-game/minus-auction/",
      },
      {
        title: "베팅 게임",
        description: "확률과 기대값을 생각하며 모둠별 전략을 세우는 게임형 활동입니다.",
        tags: ["확률", "게임형 수업", "수업활동"],
        url: "https://mathtjungsw.github.io/math-class-webtools/math-game/betting-game/",
      },
      {
        title: "돼지 주사위 게임",
        description: "주사위 확률과 의사결정 전략을 탐구하는 게임형 수업 도구입니다.",
        tags: ["확률", "게임형 수업", "수업활동"],
        url: "https://mathtjungsw.github.io/math-class-webtools/math-game/pig-dice/",
      },
      {
        title: "야구 게임 시뮬레이터",
        description: "야구 상황을 활용해 조건부 확률을 탐구하는 시뮬레이션입니다.",
        tags: ["확률", "통계", "게임형 수업"],
        url: "https://mathtjungsw.github.io/math-class-webtools/math-game/kbo-conditional-probability/",
      },
    ],
  },
  {
    name: "정종엽",
    school: "경남 창원북면고등학교",
    description: "학생 참여형 수업과 탐구 활동에 활용할 수 있는 수학 웹툴 모음입니다.",
    tags: ["수업활동", "공학도구", "게임형 수업"],
    url: "https://shootting.github.io/student-app/",
    image: "",
    imageAlt: "정종엽 선생님 웹툴 모음 페이지 미리보기",
    tools: [
      {
        title: "학생용 수업 앱 모음",
        description: "학생들이 접속해 수업 활동에 참여할 수 있는 웹 기반 활동 모음입니다.",
        tags: ["수업활동", "공학도구"],
        url: "https://shootting.github.io/student-app/",
      },
    ],
  },
  {
    name: "백승욱",
    school: "경남 계룡중학교",
    description: "중학교 수학 개념을 조작하고 발견하며 배울 수 있는 웹툴을 모았습니다.",
    tags: ["기하", "함수", "게임형 수업", "수업활동"],
    url: "https://bsw0131.github.io/mathfactory/",
    image: "",
    imageAlt: "백승욱 선생님 웹툴 모음 페이지 미리보기",
    tools: [
      {
        title: "Math Factory",
        description: "중학교 수학 개념을 활동 중심으로 다루는 웹툴 모음입니다.",
        tags: ["중학수학", "기하", "함수", "수업활동"],
        url: "https://bsw0131.github.io/mathfactory/",
      },
    ],
  },
];

const tagFilters = [
  "함수",
  "확률",
  "통계",
  "기하",
  "인공지능 수학",
  "경제수학",
  "공학도구",
  "게임형 수업",
  "수업활동",
];

window.teachers = teachers;
window.tagFilters = tagFilters;
