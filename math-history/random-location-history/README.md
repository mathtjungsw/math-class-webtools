# 랜덤 위치 역사 탐험

Google 로그인 없이 링크로 들어올 수 있는 HTML + GitHub Pages 게임입니다. 공개 역사 자료는 Google Apps Script의 HTTP API를 통해 기존 Google Sheets에 공동으로 누적됩니다. 공개 화면은 Google 계정 쿠키를 보내지 않아 Apps Script 화면에서 발생하는 다중 계정 접속 문제를 피합니다.

- [게임 실행](https://mathtjungsw.github.io/math-class-webtools/math-history/random-location-history/)
- [관리자 화면](https://script.google.com/macros/s/AKfycbxIZQaUgPSE2x5aWQ0PeHhabjbqZiYFCjLFUtwBbMp-TUX9DEVTXSsiI3XIjOQrTOO2/exec)
- [누적 자료 시트](https://docs.google.com/spreadsheets/d/1qCFAFU9D66C5LRc21HqJOzhwRW7yQ5FdMzSclC5uRPA/edit)
- [Apps Script 프로젝트](https://script.google.com/d/1fmNQzh_1_YFrW0gf062FWVA4tHwDUqVFRZ1wJCOwFPN0QbL_LvnWp4nB/edit)

플레이어는 Google 로그인이나 권한 승인 없이 접속할 수 있습니다. 서버는 배포한 소유자 권한으로 Sheets 읽기·쓰기와 공개 자료 조회를 실행합니다. 누구나 조회·재생·자동 자료 수집을 할 수 있고, 수동 자료 추가·검토 상태 수정·전체 백업과 시트 관리는 소유자만 할 수 있습니다. 관리자에게서 제외된 기록은 공개 응답에서 숨깁니다. 저장 시트의 직접 공유 권한은 게임의 공개 접근과 별개입니다. 새 자료 수집 한도는 모든 플레이어가 공유합니다.

## 사용하기

1. `새로운 육지 추첨`으로 시작하거나 특정 좌표를 입력합니다. 바다는 재추첨하며, 면적에 비례하도록 위도를 추첨합니다.
2. 처음 방문한 영역은 공개 자료를 수집합니다. 최근 30일 안의 성공한 수집 영역이 새 탐색 반경 전체를 포함하면 재사용합니다. 일부만 수집한 영역은 완료한 영역으로 취급하지 않습니다.
3. 수집한 연대 자료가 있으면 자동 재생합니다. 자동 재생을 끄고 직접 시작할 수도 있습니다. 새 기록에서 3초 머무르기를 켜면 빠른 속도에서도 기록이 순식간에 지나가지 않습니다. 재생 속도, 연표, 이전·다음 기록, 기록 없는 구간 스킵으로 이동합니다. 월 단위 재생도 원자료의 연도 정확도를 높이지는 않습니다.
4. 주변 8방향에서 같은 시점의 기록을 비교합니다. 과거의 기록을 보여줄 때는 그 연대와 현재 존속 여부 미확인을 표시합니다.
5. 자료 보관함에서 공개 기록의 출처를 확인합니다. 소유자는 검토 상태를 변경하고 논문·사료·기관 자료를 직접 추가할 수 있습니다. 사실 기록과 연구자의 해석은 설명에서 구분해 주세요.
6. 소유자는 `JSON 백업`으로 전체 자료를 내보낼 수 있습니다. 나중에 데이터베이스를 옮길 때 같은 ID와 지리·연대·출처 필드를 유지할 수 있습니다.

차탈회위크 예시는 UNESCO 자료를 바탕으로 구성한 별도 체험 자료이며 실제 보관함에 자동으로 저장되지 않습니다.

## 첫 버전의 자료 범위

- 자동 수집: 좌표 및 주변 8방향의 표본 지점에서 Wikipedia 장소를 찾고, 연결된 Wikidata의 사건 시점(P585)·기간 시작(P580/P582)·설립 시점(P571)을 가져옵니다. 각 표본의 장소 검색 반경은 10 km입니다. 선택한 전체 반경을 촘촘히 조사한 결과가 아닙니다.
- 모든 자동 연대는 `검토 대기`입니다. 설립 연도를 최초 거주 연도로 바꾸지 않습니다. 검토된 거주 증거가 해당 유적 범위에 있을 때만 거주 연대로 시작합니다. 없으면 가장 이른 수록 기록에서 시작하고 거주 시작 미확인을 표시합니다.
- 역사 논문과 사료의 본문을 자동 해석하는 기능, 고대 국가의 변동 경계, 완전한 지역별 역사 서술은 아직 없습니다. 출처 있는 자료를 직접 보완할 수 있습니다. 자료가 없다는 표시가 역사나 사람이 없었다는 뜻은 아닙니다.
- 공개 API가 느리거나 제한되면 일부 자료부터 저장합니다. `자료 보완`으로 다시 시도할 수 있습니다. Apps Script 새 수집은 하루 60회로 제한하며 저장 자료 조회는 계속 가능합니다. 수집 제한은 서비스 자체의 실행·요청 한도와 별개입니다.
- 수집 중에는 진행 단계와 경과 시간을 표시합니다. `수집 대기 중단`으로 다른 탐험을 시작할 수 있습니다. 브라우저 저장 버전은 진행 중인 요청을 취소합니다. Google Sheets 버전은 서버 작업 자체를 취소할 수 없어 이미 수집한 자료가 저장될 수 있지만, 취소한 응답이 새 탐험 화면을 덮어쓰지는 않습니다.
- 육지 판별은 현재 해안선의 Natural Earth 1:10 million 지도입니다. 작은 섬·해안과 과거 해안선에는 오차가 있습니다. 바다에 떠 있는 가상의 Null Island 도형은 제외했습니다. 사람이 살지 않는 육지도 나옵니다.

## 데이터 구조

| 시트 | 저장 내용 |
|---|---|
| 안내 | 사용 방법과 필드 설명 |
| 역사자료 | 사건 ID, 장소, 좌표, 적용 반경, 시작·종료 연대, 정확도, 검토 상태, 출처, 수집 시각 |
| 장소 | 장소 ID, 좌표, 소개, 출처 |
| 수집기록 | 조사 중심점·반경, 시각, 성공/부분 수집, 자료 수, 스키마 버전 |

열 이름과 순서는 서버가 검증합니다. 직접 시트를 편집할 때 열 이름을 바꾸지 마세요. 내부 연대는 계산을 위한 천문학 연도(0 = 기원전 1년)를 사용하며 화면에는 0년을 표시하지 않습니다. 지역 범위 자료는 별도 `bounds` 필드로 지정할 수 있으나 현재 수동 입력 화면은 유적의 좌표·반경을 사용합니다.

자동 재수집은 `검토 완료`와 `제외` 상태를 덮어쓰지 않습니다. 서버는 소유자 확인, 수집 한도, 중복 방지, 저장 잠금, 외부 문자열의 시트 수식 실행 방지를 적용합니다.

## 로컬 실행과 배포 갱신

저장소 루트에서 실행합니다.

```powershell
node math-history/random-location-history/tools/preview.mjs
```

`http://127.0.0.1:8799/`에서도 `config.js`의 공개 API에 연결해 같은 Google Sheets를 사용합니다. 오프라인 개발에서 브라우저 저장만 사용하려면 `config.js`의 `HISTORY_API_URL`을 비워 주세요. 브라우저 저장은 공유 시트와 동기화되지 않습니다.

공개 HTTP API는 `GET ?api=bootstrap`(조회)와 JSON을 `text/plain`으로 보내는 `POST`(수집)만 받습니다. Google ContentService의 JSON 응답을 사용하며 모든 공개 HTTP 응답에서는 소유자 여부와 관계없이 제외된 기록·관리 권한·시트 주소를 숨깁니다. HTML 파일을 바꾼 경우 GitHub Pages에도 배포하고, 서버 코드 변경은 아래 명령으로 별도로 배포합니다.

Apps Script용 파일 생성:

```powershell
node math-history/random-location-history/tools/build-gas.mjs
cd math-history/random-location-history/apps-script
clasp push --force
clasp redeploy AKfycbxIZQaUgPSE2x5aWQ0PeHhabjbqZiYFCjLFUtwBbMp-TUX9DEVTXSsiI3XIjOQrTOO2 --description "로그인 없는 공개 게임 버전 갱신"
```

다른 계정·시트에 설치하려면 `Code.gs`의 `HISTORY_CONFIG.spreadsheetId`를 설정하고 그 계정으로 별도 Apps Script 프로젝트를 만듭니다. 공개 플레이는 `ANYONE_ANONYMOUS`와 `USER_DEPLOYING` 설정을 사용합니다. 인증 토큰은 저장소에 넣지 않습니다. `.clasp.json`과 생성된 HTML/GS 파일은 Git에서 제외되어 있습니다.

검증:

```powershell
node --test tests/random-location-history.test.js tests/random-location-history-server.test.js tests/random-location-history-repository.test.js tests/catalog-common-features.test.js tests/tool-thumbnails.test.js
```

## 출처와 이용 조건

- [Natural Earth 육지 지도](https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-land/): public domain.
- [Wikidata](https://www.wikidata.org/): 구조화 데이터 CC0. 각 사건에서 원 항목과 수집한 연대 필드를 확인할 수 있습니다.
- [Wikipedia](https://en.wikipedia.org/): 장소 설명 CC BY-SA 4.0. 원문 페이지 링크와 자료 유형을 보존합니다.
- [UNESCO 차탈회위크](https://whc.unesco.org/en/list/1405/): 예시의 거주층 연대와 등재 연도 근거. 짧게 재서술했으며 원문을 대량 복제하지 않습니다.

논문·사료는 자료별 저작권 및 공개 범위를 확인하고, 제목·연대·출처 링크와 필요한 요약을 저장하는 방식으로 추가하세요.
