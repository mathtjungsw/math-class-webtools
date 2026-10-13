# 역사 장소 데이터 조사

새 장소 조사: [쳄바·키도카 인근 보고서](chemba-kidoka/report.md) · [연표·출처 데이터](chemba-kidoka/location.json) · [집필안](chemba-kidoka/story-plan.md) · [검토 메모](chemba-kidoka/research-notes.md)

2026-10-13 실제 무작위 추첨점은 탄자니아 중부 쳄바 구역의 키도카 인근(남위 5.370992°, 동경 35.838650°)이다. 2026-10-14 보강 후 연대 기록 25개, 연도 미확정 해설 7개, 지리 자료를 포함한 출처 17개와 다섯 시대의 세 단계 읽기를 갖췄다. 깊이 읽기는 모두 5분 이상이다. 이 점의 최초 거주는 미확인이고, 이웃 파르콰와 북쪽 콘도아 유적·남쪽 우고고 비교 자료는 장소 범위를 나누어 보관했다. [전체 읽기 원고](chemba-kidoka/readings.md) · [추첨 기록](chemba-kidoka/draw.json) · [구조 검증 결과](chemba-kidoka/validation.json).

사용자 지정 공통 원칙: **모든 장소의 역사 진행 종료 연도는 서기 1950년이다.**

1950년 이후의 논문·발굴보고서도 그 이전 역사를 확인하는 근거로 사용할 수 있다. 출판 연도와 역사 사건의 연도를 분리한다.

1950년은 방사성탄소연대 BP(Before Present)의 기준년이다. 미보정 방사성탄소 BP를 단순 뺄셈으로 달력 연도로 바꾸지 않으며, 보정 연대와 측정값을 구분해 보관한다.

장소별 조사본은 좌표, 적용 지역, 사건·시기별 서술, 출처, 연대 정확도, 연구 해석을 함께 보관한다. 연대 미확정 사실과 조사 공백을 가공의 사건으로 메우지 않는다.

첫 장소: [진주 남강 유역 조사 보고서](jinju-namgang/report.md) · [구현용 조사 데이터](jinju-namgang/location.json) · [세 단계 읽기 원고](jinju-namgang/readings.json)

2026-10-09 보강본은 53개 연대 기록과 4개 연도 미확정 해설, 45개 출처, 여섯 장의 세 단계 읽기로 구성되어 있다. `tools/build-static.mjs`가 이 자료를 정적 HTML에 내장한다. [GitHub Pages 게임](https://mathtjungsw.github.io/math-class-webtools/math-history/random-location-history/)에서 읽을 수 있다.

두 번째 장소: [이스탄불 조사 보고서](istanbul/report.md) · [바로 읽는 세 단계 원고](istanbul/readings.md) · [연표·출처 데이터](istanbul/location.json) · [읽기 데이터](istanbul/readings.json)

2026-10-10 이스탄불 1차 조사본은 연대 기록 58개, 연도 없는 해설 3개, 출처 42개, 여덟 장의 세 단계 읽기로 구성되어 있다. 깊이 읽기는 장마다 3,000자 이상이며 600자/분 기준 약 5.1~5.5분이다. 예니카프의 신석기 흔적부터 1950년까지 다루며 최초 거주 연도는 확정하지 않는다. 정적 HTML에 내장하며 장소 선택으로 탐험할 수 있다. 구조 검증 결과는 HTML 통합 전 조사 단계의 기록이다. [구조 검증 결과](istanbul/validation.json)를 함께 보관한다.
