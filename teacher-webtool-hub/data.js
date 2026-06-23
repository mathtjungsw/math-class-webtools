// 교사 정보는 이 배열에서 관리합니다.
// image에는 로컬 이미지 경로("./images/teacher.png"), 원격 이미지 URL, data URL을 넣을 수 있습니다.
// tools에는 허브의 "웹툴 검색"에 노출할 대표 페이지나 대표 웹툴 정보를 넣습니다.
const teachers = [
  {
    name: "정승원",
    school: "경남 웅천고등학교",
    description: "수학 수업에 바로 활용할 수 있는 인터랙티브 웹툴을 제작하고 공유합니다.",
    tags: ["함수", "확률", "통계", "인공지능 수학", "공학도구", "수업활동"],
    url: "../",
    image: "",
    imageAlt: "정승원 선생님 수학 수업 웹툴 모음 페이지 미리보기",
    tools: [
      {
        title: "수학 수업 웹툴 모음",
        description: "확률과 통계, 인공지능 수학, 수학 게임 등 수업용 웹툴 모음 페이지입니다.",
        tags: ["함수", "확률", "통계", "인공지능 수학", "공학도구", "수업활동"],
        url: "../",
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
