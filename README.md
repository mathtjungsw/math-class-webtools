# 수학 수업 웹툴 모음

고등학교 수학 수업에서 바로 실행할 수 있는 정적 웹툴 모음입니다.

## 현재 포함된 과목과 도구

- 확률과 통계
  - 몬티홀 딜레마 실험
- 인공지능 수학
  - 이미지 지도학습 인공지능 만들기
  - 감성 분석 인공지능 만들기 실습
  - 데이터의 경향성을 파악하여 예측하기
- 수학 게임
  - 마이너스 경매: 2~10개 조, 음수 카드·칩을 이용한 정수 덧셈 전략 게임
  - 배팅 게임
  - 스트림스 수 추출기: 기본 스트림스 숫자 덱과 사용자 편집 덱에서 무복원 추출
  - 소수 체크 게임: 5의 배수를 제외한 25칸 소수 찾기 게임
  - 돼지 주사위 게임(Pig Dice): 2~10명 점수 경쟁, 6가지 변형 규칙 게임, 인터랙티브 확률·기대값 탐구, 인쇄 학습지
  - 야구 게임 시뮬레이션: 2025 KBO 타자 카드, 드래그 라인업 구성 및 9이닝 모의 경기

## 실행 방법

이 프로젝트는 서버 없이 브라우저에서 실행됩니다.

1. `index.html`을 브라우저로 엽니다.
2. 원하는 과목을 선택합니다.
3. 사용할 웹툴을 선택해 시작합니다.

## GitHub Pages 배포

GitHub 저장소에 올린 뒤 저장소의 `Settings > Pages`에서 배포 브랜치를 선택하면 정적 사이트로 사용할 수 있습니다.

GitHub Pages 주소에서 실행할 때는 화면의 `GitHub` 링크가 저장소 주소를 자동으로 추정합니다. 로컬에서 직접 열거나 다른 호스팅을 사용할 경우 `assets/app.js`, `ai-math/sentiment-ai/sentiment.js`, `ai-math/image-supervised-learning/image-supervised.js`, `ai-math/trendline-prediction/trendline.js`의 `MANUAL_GITHUB_REPOSITORY_URL` 값을 저장소 주소로 바꾸면 됩니다.

## KBO 조건부 확률 실험실 개발

실행용 빌드 파일은 `math-game/kbo-conditional-probability`에 있으며, React·TypeScript 원본은
`math-game/kbo-conditional-probability-src`에 있습니다.

```bash
cd math-game/kbo-conditional-probability-src
npm install
npm run dev
```

`npm run build`를 실행하면 실제 웹툴 폴더가 갱신됩니다.
