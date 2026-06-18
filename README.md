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
  - 배팅 게임

## 실행 방법

이 프로젝트는 서버 없이 브라우저에서 실행됩니다.

1. `index.html`을 브라우저로 엽니다.
2. 원하는 과목을 선택합니다.
3. 사용할 웹툴을 선택해 시작합니다.

## GitHub Pages 배포

GitHub 저장소에 올린 뒤 저장소의 `Settings > Pages`에서 배포 브랜치를 선택하면 정적 사이트로 사용할 수 있습니다.

GitHub Pages 주소에서 실행할 때는 화면의 `GitHub` 링크가 저장소 주소를 자동으로 추정합니다. 로컬에서 직접 열거나 다른 호스팅을 사용할 경우 `assets/app.js`, `ai-math/sentiment-ai/sentiment.js`, `ai-math/image-supervised-learning/image-supervised.js`, `ai-math/trendline-prediction/trendline.js`의 `MANUAL_GITHUB_REPOSITORY_URL` 값을 저장소 주소로 바꾸면 됩니다.
