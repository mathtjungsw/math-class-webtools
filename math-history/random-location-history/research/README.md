# 역사 장소 데이터 조사

사용자 지정 공통 원칙: **모든 장소의 역사 진행 종료 연도는 서기 1950년이다.**

1950년 이후의 논문·발굴보고서도 그 이전 역사를 확인하는 근거로 사용할 수 있다. 출판 연도와 역사 사건의 연도를 분리한다.

1950년은 방사성탄소연대 BP(Before Present)의 기준년이다. 미보정 방사성탄소 BP를 단순 뺄셈으로 달력 연도로 바꾸지 않으며, 보정 연대와 측정값을 구분해 보관한다.

장소별 조사본은 좌표, 적용 지역, 사건·시기별 서술, 출처, 연대 정확도, 연구 해석을 함께 보관한다. 연대 미확정 사실과 조사 공백을 가공의 사건으로 메우지 않는다.

첫 장소: [진주 남강 유역 조사 보고서](jinju-namgang/report.md) · [구현용 조사 데이터](jinju-namgang/location.json) · [세 단계 읽기 원고](jinju-namgang/readings.json)

2026-10-09 보강본은 53개 연대 기록과 4개 연도 미확정 해설, 45개 출처, 여섯 장의 세 단계 읽기로 구성되어 있다. `tools/build-static.mjs`가 이 자료를 정적 HTML에 내장한다. [GitHub Pages 게임](https://mathtjungsw.github.io/math-class-webtools/math-history/random-location-history/)에서 읽을 수 있다.
