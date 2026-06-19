# KBO 조건부 확률 타자 카드 실험실

React, TypeScript, Tailwind CSS, Vite로 만든 수업용 조건부 확률 웹툴의 원본 프로젝트입니다.

- 2025 KBO 타자 296명의 전체 및 주자 상황별 타율 내장
- CSV 업로드와 포지션 자동 분류
- 선수 카드, 두 선수 비교, 확률 반복 실험
- 포수·내야·외야·지명타자 조건을 검증하는 라인업 구성
- 타율 배율을 조절하며 한 타석씩 진행하는 9이닝 모의 경기
- 수업 미션과 인쇄 가능한 탐구 보고서

```bash
npm install
npm run dev
```

배포용 정적 파일 만들기:

```bash
npm run build
```

빌드 결과는 `../kbo-conditional-probability`에 생성되며 수학 웹툴 모음의 홈 화면에서 바로 연결됩니다.
