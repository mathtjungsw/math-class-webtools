# 이스탄불 역사 학습 자료 조사본

조사 정리일: **2026-10-10**

이 자료집은 역사 반도·예니카프를 중심으로 금각만과 보스포루스의 관계를 따라가는 첫 조사본이다. 왕조의 교체와 함께 주거·급수·항구 노동·이주·신앙·재산·권리의 변화를 읽도록 구성했다. 조사 자료와 원고를 게임 HTML에 내장하여 진주와 함께 선택할 수 있도록 구성했다. 공개 배포 주소는 상위 README에 안내한다.

- [세 단계 읽기 원고](readings.md): 바로 읽을 수 있는 한국어 본문
- [연표·장소·출처 데이터](location.json): 사건별 근거와 한계
- [세 단계 읽기 데이터](readings.json): 기존 게임과 연결할 수 있는 구조
- [구조 검증 결과](validation.json)

## 조사 범위와 시간

| 항목 | 이번 조사에서 사용하는 값 |
|---|---|
| 대표 좌표 | 북위 **41.008°**, 동경 **28.983°** |
| 좌표의 의미 | UNESCO 술탄아흐메트 도시고고학 구성구역의 대표점. 개별 유적의 측량 좌표가 아님 |
| 주요 공간 | 역사 반도·예니카프·금각만·갈라타, 보스포루스 연결 관계 |
| 도입 연대 | 기원전 **약 6500년 무렵**, 예니카프 자료의 개괄 편년 |
| 종료 연도 | 서기 **1950년 포함** |
| 분량 | 연대 기록 **58개**, 연도 없는 해설 **3개**, 출처 **42개** |
| 읽기 | **8개 시대 × 3단계**. 깊이 읽기 본문은 장마다 3,000자 이상 |

좌표는 UNESCO 정기보고서의 구성구역 표를 근거로 했다. 예니카프의 선사 정착을 이 대표 좌표에서 일어난 일로 표시하지 않는다. [IS01](https://whc.unesco.org/document/216600)

기원전 약 6500~4800년은 발굴 해설이 제시한 넓은 편년이다. 매장 연구 초록의 Fikirtepe 자료군은 6500~5600 cal BC로 설명되어 있어 두 범위를 별도로 보존했다. 최초 주민의 도착일이나 한 마을의 끊임없는 존속 기간으로 사용하지 않는다. [IS03](https://istanbultarihi.ist/15-istanbul-kazilari-marmaray-metro-projeleri-ve-arkeolojik-kurtarma-kazilarinin-sehir-tarihine-katkilari) · [IS05](https://dergipark.org.tr/en/pub/tubaar/article/1723090)

미보정 방사성탄소 BP를 단순 뺄셈으로 달력 연도로 바꾸지 않는다. 개별 시료의 측정·보정 표를 모두 검토했다고 주장하지 않으며, 이번에는 출처가 보고한 편년을 사용한다. 1950년 종료는 사용자가 정한 학습 설계 기준이다. 이후 출판된 연구는 1950년 이전 사실의 근거로 사용할 수 있다.

## 시대별 이야기

예상 시간은 기존 진주 자료와 같은 **공백 포함 600자/분** 기준이다. 개인차가 있으며, 출처를 열어 보는 시간은 포함하지 않는다. 깊이 읽기는 확인된 역사 설명과 자료 해석·비교 질문을 함께 담는다.

| 시대 | 핵심 질문 | 깊이 읽기 | 연대 기록 |
|---|---|---|---|
| 기원전 약 6500년~서기 3세기 — 수도보다 오래된 사람들의 자리 | 황제도 도시 이름도 없던 시절, 이곳 사람들의 삶을 어떻게 알 수 있을까? | 약 5.2분 | 4개 |
| 330~565년 — 수도를 먹이고 지키는 사람들 | 새로운 수도를 실제로 유지한 것은 누구의 노동과 어떤 시설이었을까? | 약 5.2분 | 9개 |
| 626~12세기 — 항구·시장·이웃으로 이어진 도시 | 제국이 위기를 겪는 동안 주민의 생활은 무엇에 기대어 이어졌을까? | 약 5.3분 | 6개 |
| 1204~1453년 5월 — 점령과 회복, 다른 질서가 만나는 물가 | 수도를 되찾으면 주민의 삶과 도시의 힘도 예전으로 돌아갈까? | 약 5.1분 | 7개 |
| 1453년 6월~1557년 — 정복 이후, 누가 이 도시의 주민이 되었나 | 다양한 주민이 모였다는 말 뒤에는 어떤 이동과 권리의 차이가 있었을까? | 약 5.4분 | 8개 |
| 1584~1790년대 — 목욕탕·화재·책·이주민의 도시 | 살림을 유지하는 제도는 누구를 돕고 누구를 통제했을까? | 약 5.2분 | 5개 |
| 1826~1913년 — 배와 철도, 개혁과 권리의 목소리 | 이동이 빨라지고 제도가 바뀌면 누구의 삶에 어떤 가능성이 열렸을까? | 약 5.5분 | 7개 |
| 1914~1950년 — 전쟁·추방·공화국과 시민의 불평등 | 국가가 바뀐 뒤에도 같은 도시에 남아 산다는 것은 누구에게나 가능했을까? | 약 5.3분 | 12개 |

## 이야기를 관통하는 연결

**물과 먹을 것.** 고대 어업, 수도의 수로, 중세 항만과 시장 규정을 이어 읽는다. 해협을 군사적 요충지로만 설명하지 않고 주민이 생계를 꾸리는 공간으로 다룬다. [IS07](https://istanbultarihi.ist/553-fishery-in-istanbul-in-ancient-history) · [IS09](https://istanbultarihi.ist/554-the-water-supply-of-byzantine-constantinople) · [IS12](https://www.istanbul.edu.tr/tr/haber/yenikapi-12-denizle-bulustu-590042004100650066007900690068004A00360049003100) · [IS13](https://istanbultarihi.ist/552-financial-foundation-of-constantinoples-rise)

**누가 주민이 되는가.** 정복 뒤 강제·자발적 이주, 가구 조사, 세파르디 이주와 기존 유대인 공동체를 연결한다. 종교적 다양성과 법적 평등을 같은 뜻으로 쓰지 않는다. [IS15](https://istanbultarihi.ist/159-konstantinopolis-yahudileri) · [IS21](https://istanbultarihi.ist/376-sultan-mehmed-the-conquerors-istanbul) · [IS22](https://istanbultarihi.ist/377-galata) · [IS23](https://istanbultarihi.ist/94-istanbul-nufusu-fetihten-xviii-yuzyil-sonlarina-kadar) · [IS24](https://istanbultarihi.ist/246-judeo-espanyol-ladino-turkiye-yahudilerinin-dili)

**시설을 유지하는 돈과 노동.** 목욕탕 수입이 다른 지역의 교육·복지시설을 지원한 관계와, 노동·거주를 파악하는 보증·검문 제도를 읽는다. 후원자의 이름만으로 도시를 설명하지 않는다. [IS25](https://istanbultarihi.ist/491-cemberlitas-hamam) · [IS27](https://istanbultarihi.ist/473-slavery-in-ottoman-istanbul) · [IS30](https://istanbultarihi.ist/509-surety-kefalet-and-inspection-registers-of-istanbul)

**재난 뒤의 선택.** 1660년 대화재와 그 뒤의 주민 배제·공간 재편을 구분한다. 불이 난 사실과 이후 통치자가 결정한 정책은 같은 종류의 원인이 아니다. [IS26](https://istanbultarihi.ist/394-the-great-istanbul-fire-of-1660)

**권리를 직접 요구하는 사람들.** 여성 잡지의 노동·교육 요구를 다루며, 여성의 역사를 국가가 권리를 부여한 날짜만으로 구성하지 않는다. 잡지 필자가 여성 전체를 대표한다는 가정도 피한다. [IS34](https://dergipark.org.tr/tr/download/article-file/935506)

**국가의 새 출발과 불평등.** 1915년 체포·추방을 아르메니아인 집단학살과 연결하고, 1923년 주민 교환 협약의 조건부 예외와 1942년 재산세의 차별적 영향을 다룬다. [IS36](https://encyclopedia.ushmm.org/content/en/article/the-armenian-genocide-1915-16-in-depth) · [IS38](https://www.mfa.gov.tr/lausanne-peace-treaty-vi_-convention-concerning-the-exchange-of-greek-and-turkish-populations-signed-at-lausanne_.en.mfa) · [IS40](https://www.cambridge.org/core/journals/journal-of-economic-history/article/abs/wealth-tax-of-1942-and-the-disappearance-of-nonmuslim-enterprises-in-turkey/B05523EDB4D0AC1E4931C0562DE3E652)

## 연표 목록

아래 범위는 자료의 시간 해상도를 표시한다. 넓은 시기 카드를 매해 발생한 사건으로 재생하지 않는다. 전체 문장·해석·제약은 [location.json](location.json)에 함께 저장했다.

| ID | 연대 표시 | 기록 | 출처 |
|---|---|---|---|
| IST-001 | 기원전 약 6500~4800년의 개괄 편년 | 예니카프의 신석기 정착 흔적 | [IS03](https://istanbultarihi.ist/15-istanbul-kazilari-marmaray-metro-projeleri-ve-arkeolojik-kurtarma-kazilarinin-sehir-tarihine-katkilari) · [IS04](https://avesis.istanbul.edu.tr/yayin/5019e9ee-4387-4ed9-841a-0d79f8a81627/holocene-coastal-change-in-the-ancient-harbor-of-yenikapi-istanbul-and-its-impact-on-cultural-history) |
| IST-002 | 기원전 7세기 | 비잔티온의 성립 전승 | [IS06](https://istanbultarihi.ist/404-a-political-history-of-istanbul-in-antiquity-from-byzantium-to-constantinople) |
| IST-003 | 기원전 5세기 무렵 | 어업과 소금의 도시 | [IS07](https://istanbultarihi.ist/553-fishery-in-istanbul-in-ancient-history) |
| IST-004 | 서기 117~138년, 하드리아누스 재위기 | 어업 공동체가 남긴 비문 | [IS07](https://istanbultarihi.ist/553-fishery-in-istanbul-in-ancient-history) |
| IST-005 | 330년 | 콘스탄티노폴리스, 로마의 새 수도 | [IS44](https://www.metmuseum.org/essays/byzantium-ca-330-1453) |
| IST-006 | 341년 | 교회와 거리의 정치적 충돌 | [IS08](https://istanbultarihi.ist/405-politics-and-society-in-the-early-byzantine-capital-330-565) |
| IST-007 | 373년 | 서쪽 수원이 높은 언덕으로 연결되다 | [IS09](https://istanbultarihi.ist/554-the-water-supply-of-byzantine-constantinople) |
| IST-008 | 4세기 말, 테오도시우스 1세 재위기 | 테오도시우스 항구의 성장 | [IS03](https://istanbultarihi.ist/15-istanbul-kazilari-marmaray-metro-projeleri-ve-arkeolojik-kurtarma-kazilarinin-sehir-tarihine-katkilari) |
| IST-009 | 약 440~441년 | 물 사용을 둘러싼 규정 | [IS09](https://istanbultarihi.ist/554-the-water-supply-of-byzantine-constantinople) |
| IST-010 | 447년 | 육지 성벽의 방어 체계가 강화되다 | [IS02](https://whc.unesco.org/en/list/356/) |
| IST-011 | 532년 1월 | 니카 봉기와 진압 | [IS10](https://istanbultarihi.ist/407-the-nika-riot) |
| IST-012 | 532~537년 | 하기아 소피아의 재건 | [IS02](https://whc.unesco.org/en/list/356/) · [IS10](https://istanbultarihi.ist/407-the-nika-riot) |
| IST-013 | 542년 | 수도를 덮친 역병 | [IS11](https://sourcebooks.web.fordham.edu/source/542procopius-plague.asp) |
| IST-014 | 626년 | 포위전으로 끊긴 장거리 급수 | [IS09](https://istanbultarihi.ist/554-the-water-supply-of-byzantine-constantinople) |
| IST-015 | 765년, 채택한 연구의 편년 | 수로를 다시 잇는 노동 | [IS09](https://istanbultarihi.ist/554-the-water-supply-of-byzantine-constantinople) |
| IST-016 | 9세기 | 9세기 화물선 YK12 | [IS12](https://www.istanbul.edu.tr/tr/haber/yenikapi-12-denizle-bulustu-590042004100650066007900690068004A00360049003100) |
| IST-017 | 10세기 | 시장 규칙을 적은 도시 행정 | [IS13](https://istanbultarihi.ist/552-financial-foundation-of-constantinoples-rise) |
| IST-018 | 10~11세기 중심의 교역 맥락 | 흑해와 동지중해를 잇는 상인들 | [IS13](https://istanbultarihi.ist/552-financial-foundation-of-constantinoples-rise) |
| IST-019 | 12세기 | 금각만 건너편 유대인 주민의 삶 | [IS15](https://istanbultarihi.ist/159-konstantinopolis-yahudileri) |
| IST-020 | 1204년 | 1204년의 점령과 약탈 | [IS17](https://sourcebooks.web.fordham.edu/source/choniates1.asp) |
| IST-021 | 1204~1261년 | 라틴 지배 아래 남은 도시 생활 | [IS16](https://istanbultarihi.ist/408-constantinople-1204-1261) |
| IST-022 | 1261년 7월 | 비잔티움의 수도 회복 | [IS16](https://istanbultarihi.ist/408-constantinople-1204-1261) |
| IST-023 | 1267년 | 갈라타의 제노바 거류지 | [IS19](https://muze.gov.tr/s3/MysFileLibrary/566f7fe8-c812-421d-9baa-86e7bb228337.pdf) |
| IST-024 | 1316~1321년 | 코라 수도원의 그림과 후원 | [IS18](https://www.metmuseum.org/essays/frescoes-and-wall-painting-in-late-byzantine-art) |
| IST-025 | 1348년 | 제노바의 갈라타 탑 | [IS19](https://muze.gov.tr/s3/MysFileLibrary/566f7fe8-c812-421d-9baa-86e7bb228337.pdf) |
| IST-026 | 1453년 5월 | 오스만의 정복 | [IS20](https://istanbultarihi.ist/424-the-final-siege-and-fall-of-constantinople-1453) · [IS21](https://istanbultarihi.ist/376-sultan-mehmed-the-conquerors-istanbul) |
| IST-027 | 1453년 6월 | 갈라타 항복 문서의 보장 | [IS22](https://istanbultarihi.ist/377-galata) |
| IST-028 | 1454년 | 겐나디오스와 정교회 조직 | [IS21](https://istanbultarihi.ist/376-sultan-mehmed-the-conquerors-istanbul) |
| IST-029 | 1455년 | 집과 주민을 다시 기록하다 | [IS21](https://istanbultarihi.ist/376-sultan-mehmed-the-conquerors-istanbul) · [IS22](https://istanbultarihi.ist/377-galata) |
| IST-030 | 1477년 | 다양한 주민을 세대 단위로 세다 | [IS23](https://istanbultarihi.ist/94-istanbul-nufusu-fetihten-xviii-yuzyil-sonlarina-kadar) |
| IST-031 | 1492년 이후 이주가 이어짐 | 이베리아에서 온 세파르디 유대인 | [IS24](https://istanbultarihi.ist/246-judeo-espanyol-ladino-turkiye-yahudilerinin-dili) · [IS45](https://istanbultarihi.ist/chronology) |
| IST-032 | 1493년 | 히브리어 인쇄의 등장 | [IS45](https://istanbultarihi.ist/chronology) |
| IST-033 | 1509년 지진과 1510년 수리 | 지진 이후의 갈라타 탑 수리 | [IS19](https://muze.gov.tr/s3/MysFileLibrary/566f7fe8-c812-421d-9baa-86e7bb228337.pdf) |
| IST-034 | 1550~1557년 | 쉴레이마니예 복합시설 | [IS02](https://whc.unesco.org/en/list/356/) |
| IST-035 | 1584년 | 쳄베를리타쉬 목욕탕의 수입과 노동 | [IS25](https://istanbultarihi.ist/491-cemberlitas-hamam) |
| IST-036 | 1660년 | 1660년 대화재와 재건의 불평등 | [IS26](https://istanbultarihi.ist/394-the-great-istanbul-fire-of-1660) |
| IST-037 | 1729년 | 1729년의 사전 인쇄 | [IS28](https://wwws.loc.gov/rr/amed/guide/nes-turkey.html) |
| IST-038 | 1730년 | 시장이 멈춘 1730년 봉기 | [IS29](https://istanbultarihi.ist/413-the-1730-rebellion) |
| IST-039 | 1790년대 | 도시에 살기 위한 보증인 | [IS30](https://istanbultarihi.ist/509-surety-kefalet-and-inspection-registers-of-istanbul) |
| IST-040 | 1826년 | 예니체리 군단의 폐지 | [IS31](https://istanbultarihi.ist/46-payitaht-istanbulun-son-yuzyili) · [IS45](https://istanbultarihi.ist/chronology) |
| IST-041 | 1839년 11월 | 귈하네에서 발표된 개혁 칙령 | [IS31](https://istanbultarihi.ist/46-payitaht-istanbulun-son-yuzyili) |
| IST-042 | 1850년 설립 과정·1851년 인가 | 정기 증기선 회사의 설립과 인가 | [IS32](https://istanbultarihi.ist/585-sea-transportation-in-ottoman-istanbul-modern-period) |
| IST-043 | 1875년 1월 | 갈라타와 언덕을 잇는 튀넬 | [IS33](https://iett.istanbul/icerik/kronolojik-tarihce) |
| IST-044 | 1876년 | 헌법과 의회의 시대가 열리다 | [IS31](https://istanbultarihi.ist/46-payitaht-istanbulun-son-yuzyili) · [IS45](https://istanbultarihi.ist/chronology) |
| IST-045 | 1908년 | 입헌정의 부활 | [IS31](https://istanbultarihi.ist/46-payitaht-istanbulun-son-yuzyili) · [IS34](https://dergipark.org.tr/tr/download/article-file/935506) · [IS45](https://istanbultarihi.ist/chronology) |
| IST-046 | 1913년 | 여성이 자신의 권리를 쓰다 | [IS34](https://dergipark.org.tr/tr/download/article-file/935506) |
| IST-047 | 1914년 | 제1차 세계대전에 들어선 제국 | [IS36](https://encyclopedia.ushmm.org/content/en/article/the-armenian-genocide-1915-16-in-depth) |
| IST-048 | 1915년 4월 24일 | 아르메니아인 지도자들의 체포 | [IS36](https://encyclopedia.ushmm.org/content/en/article/the-armenian-genocide-1915-16-in-depth) |
| IST-049 | 1918년 10~11월 | 휴전 뒤 연합군의 진입 | [IS37](https://istanbultarihi.ist/419-istanbul-during-the-mutareke-era-1918-1923) · [IS45](https://istanbultarihi.ist/chronology) |
| IST-050 | 1920년 3월 16일 | 공식 점령과 수도의 통치 | [IS37](https://istanbultarihi.ist/419-istanbul-during-the-mutareke-era-1918-1923) |
| IST-051 | 1922년 11월 | 술탄제의 폐지 | [IS37](https://istanbultarihi.ist/419-istanbul-during-the-mutareke-era-1918-1923) |
| IST-052 | 1923년 1월 30일 | 주민 교환 협약의 예외 | [IS38](https://www.mfa.gov.tr/lausanne-peace-treaty-vi_-convention-concerning-the-exchange-of-greek-and-turkish-populations-signed-at-lausanne_.en.mfa) |
| IST-053 | 1923년 10월 | 점령의 종료 | [IS39](https://istanbultarihi.ist/421-political-events-in-istanbul-in-the-republican-era) |
| IST-054 | 1923년 10월 29일 | 공화국의 탄생 | [IS39](https://istanbultarihi.ist/421-political-events-in-istanbul-in-the-republican-era) |
| IST-055 | 1928년 | 새 문자를 배우는 시대 | [IS45](https://istanbultarihi.ist/chronology) |
| IST-056 | 1942년 | 재산세가 바꾼 기업과 재산 | [IS40](https://www.cambridge.org/core/journals/journal-of-economic-history/article/abs/wealth-tax-of-1942-and-the-disappearance-of-nonmuslim-enterprises-in-turkey/B05523EDB4D0AC1E4931C0562DE3E652) |
| IST-057 | 1950년 4월 10일, 자료 작성일 | 시장 구역 재편을 그린 계획 기록 | [IS41](https://archives.saltresearch.org/handle/123456789/103333) |
| IST-058 | 1950년 5월 14일 | 1950년 선거와 대표의 교체 | [IS42](https://istanbultarihi.ist/453-the-history-of-elections-in-istanbul-18761950) |

연도 없는 해설: IST-C01 「첫 주민의 도착 연도는 모른다」 / IST-C02 「누가 자유롭게 이동할 수 있었나」 / IST-C03 「이스탄불이라는 이름의 긴 역사」.

## 채택한 설명과 남겨 둔 불확실성

- **초기 연대와 공백:** 약 기원전 6500~4800년은 출토 자료군의 개괄 편년. 최초 거주·단일 마을의 연속 존속·개별 시료의 신뢰구간으로 표현하지 않는다. [IS03](https://istanbultarihi.ist/15-istanbul-kazilari-marmaray-metro-projeleri-ve-arkeolojik-kurtarma-kazilarinin-sehir-tarihine-katkilari) · [IS04](https://avesis.istanbul.edu.tr/yayin/5019e9ee-4387-4ed9-841a-0d79f8a81627/holocene-coastal-change-in-the-ancient-harbor-of-yenikapi-istanbul-and-its-impact-on-cultural-history)
- **자료의 직접성:** 발굴 해설, 논문, 번역 사료, 기관 안내, 기록목록을 구분. 초록만 본 논문은 원문 전체 검토로 표시하지 않는다. [IS04](https://avesis.istanbul.edu.tr/yayin/5019e9ee-4387-4ed9-841a-0d79f8a81627/holocene-coastal-change-in-the-ancient-harbor-of-yenikapi-istanbul-and-its-impact-on-cultural-history) · [IS05](https://dergipark.org.tr/en/pub/tubaar/article/1723090) · [IS40](https://www.cambridge.org/core/journals/journal-of-economic-history/article/abs/wealth-tax-of-1942-and-the-disappearance-of-nonmuslim-enterprises-in-turkey/B05523EDB4D0AC1E4931C0562DE3E652) · [IS41](https://archives.saltresearch.org/handle/123456789/103333)
- **번역과 숫자:** 신석기 기간 산술, 침몰선 전체 연대, 노예 인구 비율, 공화국 행사 월명의 오류·불일치를 그대로 복제하지 않는다. [IS03](https://istanbultarihi.ist/15-istanbul-kazilari-marmaray-metro-projeleri-ve-arkeolojik-kurtarma-kazilarinin-sehir-tarihine-katkilari) · [IS12](https://www.istanbul.edu.tr/tr/haber/yenikapi-12-denizle-bulustu-590042004100650066007900690068004A00360049003100) · [IS27](https://istanbultarihi.ist/473-slavery-in-ottoman-istanbul) · [IS39](https://istanbultarihi.ist/421-political-events-in-istanbul-in-the-republican-era)
- **다양성과 권리:** 종교적 다양성을 법적 평등으로 설명하지 않는다. 1453년 포로화, 1660년 이후 배제, 1915년 집단학살, 1942년 차별을 함께 다룬다. [IS21](https://istanbultarihi.ist/376-sultan-mehmed-the-conquerors-istanbul) · [IS26](https://istanbultarihi.ist/394-the-great-istanbul-fire-of-1660) · [IS36](https://encyclopedia.ushmm.org/content/en/article/the-armenian-genocide-1915-16-in-depth) · [IS40](https://www.cambridge.org/core/journals/journal-of-economic-history/article/abs/wealth-tax-of-1942-and-the-disappearance-of-nonmuslim-enterprises-in-turkey/B05523EDB4D0AC1E4931C0562DE3E652)
- **주민 교환:** 1923년 협약의 종교·국적 기준과 이스탄불의 조건부 예외를 함께 표시한다. [IS38](https://www.mfa.gov.tr/lausanne-peace-treaty-vi_-convention-concerning-the-exchange-of-greek-and-turkish-populations-signed-at-lausanne_.en.mfa)
- **장소의 이름:** 1930년을 이스탄불이라는 이름이 처음 등장한 해로 쓰지 않는다. [IS21](https://istanbultarihi.ist/376-sultan-mehmed-the-conquerors-istanbul)
- **1950년 종료:** 사용자 지정 공통 종료점. 1955년 폭력과 이후 도시 개발은 다음 시대 사건으로 삽입하지 않는다.
- **신석기 편년의 서로 다른 범위:** IS05의 6500–5600 cal BC는 초록이 설명하는 Fikirtepe 자료군의 범위이다. IS03의 6500–4800년 개괄 편년과 수치만 합치거나 단일 시료 범위로 취급하지 않는다. [IS03](https://istanbultarihi.ist/15-istanbul-kazilari-marmaray-metro-projeleri-ve-arkeolojik-kurtarma-kazilarinin-sehir-tarihine-katkilari) · [IS05](https://dergipark.org.tr/en/pub/tubaar/article/1723090)

자료를 교차 확인하는 과정에서 신석기 기간의 산술, 선박군의 연대 번역, 노예 인구 비율, 공화국 기념행사 월명에서 오류·불일치를 확인했다. 해당 수치를 그대로 복제하지 않았다. 1850~1851년 증기선 회사의 설립·인가, 1875년 튀넬 개통식·일반 운행도 단계별로 구분했다. [IS03](https://istanbultarihi.ist/15-istanbul-kazilari-marmaray-metro-projeleri-ve-arkeolojik-kurtarma-kazilarinin-sehir-tarihine-katkilari) · [IS12](https://www.istanbul.edu.tr/tr/haber/yenikapi-12-denizle-bulustu-590042004100650066007900690068004A00360049003100) · [IS27](https://istanbultarihi.ist/473-slavery-in-ottoman-istanbul) · [IS32](https://istanbultarihi.ist/585-sea-transportation-in-ottoman-istanbul-modern-period) · [IS33](https://iett.istanbul/icerik/kronolojik-tarihce) · [IS39](https://istanbultarihi.ist/421-political-events-in-istanbul-in-the-republican-era)

## 출처를 읽은 범위

문헌·논문·발굴 해설·번역 사료·박물관 안내·기록목록을 함께 사용했다. 상당수 시대별 연구가 다수 학자의 공동 집필서 *History of Istanbul*에 모여 있어 같은 출판 플랫폼의 비중이 높다. 개별 필자의 연구를 근거로 삼되, 이 책과 다른 기관의 자료를 함께 대조했다. 모든 주제에서 복수의 독립 연구를 확보했다는 뜻은 아니다.

초록 확인 자료와 기록목록은 특히 제한을 분명히 했다. IS40의 정오표는 온라인 목차 저자명의 철자 수정이며 논문의 정량 결과를 검증한 자료가 아니다. IS41의 작성일을 실제 공사 완료일로 사용하지 않았다.

| ID | 출처·저자 | 확인 수준 |
|---|---|---|
| IS01 | [Historic Areas of Istanbul — Periodic Report, Section II](https://whc.unesco.org/document/216600) | 관련 본문·절 확인 |
| IS02 | [Historic Areas of Istanbul](https://whc.unesco.org/en/list/356/) | 관련 본문·절 확인 |
| IS03 | [İstanbul Kazıları / Istanbul Excavations](https://istanbultarihi.ist/15-istanbul-kazilari-marmaray-metro-projeleri-ve-arkeolojik-kurtarma-kazilarinin-sehir-tarihine-katkilari) — Zeynep Kızıltan | 관련 본문·절 확인 |
| IS04 | [Holocene coastal change in the ancient harbor of Yenikapi-Istanbul and its impact on cultural history](https://avesis.istanbul.edu.tr/yayin/5019e9ee-4387-4ed9-841a-0d79f8a81627/holocene-coastal-change-in-the-ancient-harbor-of-yenikapi-istanbul-and-its-impact-on-cultural-history) — Oya Algan et al. | 공개 초록 확인 |
| IS05 | [Marmara Bölgesi Neolitik Dönem Ölü Gömme Geleneklerinde İlkler: Yenikapı Kazı Bulguları](https://dergipark.org.tr/en/pub/tubaar/article/1723090) — Yasemin Yılmaz | 공개 초록 확인 |
| IS06 | [A Political History of Istanbul in Antiquity: From Byzantium to Constantinople](https://istanbultarihi.ist/404-a-political-history-of-istanbul-in-antiquity-from-byzantium-to-constantinople) — Murat Arslan | 관련 본문·절 확인 |
| IS07 | [Fishery in Istanbul in Ancient History](https://istanbultarihi.ist/553-fishery-in-istanbul-in-ancient-history) — Oğuz Tekin | 관련 본문·절 확인 |
| IS08 | [Politics and Society in the Early Byzantine Capital (330–565)](https://istanbultarihi.ist/405-politics-and-society-in-the-early-byzantine-capital-330-565) — Turhan Kaçar | 관련 본문·절 확인 |
| IS09 | [The Water Supply of Byzantine Constantinople](https://istanbultarihi.ist/554-the-water-supply-of-byzantine-constantinople) — James Crow | 관련 본문·절 확인 |
| IS10 | [The Nika Riot](https://istanbultarihi.ist/407-the-nika-riot) — Geoffrey Greatrex | 관련 본문·절 확인 |
| IS11 | [Procopius: The Plague, 542](https://sourcebooks.web.fordham.edu/source/542procopius-plague.asp) — Procopius | 공개된 번역 발췌 확인 |
| IS12 | [“Yenikapı 12” Denizle Buluştu](https://www.istanbul.edu.tr/tr/haber/yenikapi-12-denizle-bulustu-590042004100650066007900690068004A00360049003100) — Istanbul University | 관련 본문·절 확인 |
| IS13 | [Financial Foundation of Constantinople’s Rise](https://istanbultarihi.ist/552-financial-foundation-of-constantinoples-rise) — Koray Durak | 관련 본문·절 확인 |
| IS15 | [Konstantinopolis Yahudileri / The Jews in Byzantine Constantinople](https://istanbultarihi.ist/159-konstantinopolis-yahudileri) — Nicholas de Lange | 관련 본문·절 확인 |
| IS16 | [Constantinople 1204–1261](https://istanbultarihi.ist/408-constantinople-1204-1261) — Philip Van Tricht | 관련 본문·절 확인 |
| IS17 | [Nicetas Choniates: The Sack of Constantinople (1204)](https://sourcebooks.web.fordham.edu/source/choniates1.asp) — Niketas Choniates | 공개된 번역 발췌 확인 |
| IS18 | [Frescoes and Wall Painting in Late Byzantine Art](https://www.metmuseum.org/essays/frescoes-and-wall-painting-in-late-byzantine-art) — Annie Montgomery Labatt | 관련 본문·절 확인 |
| IS19 | [Galata Tower — museum leaflet](https://muze.gov.tr/s3/MysFileLibrary/566f7fe8-c812-421d-9baa-86e7bb228337.pdf) | 관련 본문·절 확인 |
| IS20 | [The Final Siege and Fall of Constantinople (1453)](https://istanbultarihi.ist/424-the-final-siege-and-fall-of-constantinople-1453) — Feridun M. Emecen | 관련 본문·절 확인 |
| IS21 | [Sultan Mehmed the Conqueror’s Istanbul](https://istanbultarihi.ist/376-sultan-mehmed-the-conquerors-istanbul) — Halil İnalcık | 관련 본문·절 확인 |
| IS22 | [Galata](https://istanbultarihi.ist/377-galata) — Halil İnalcık | 관련 본문·절 확인 |
| IS23 | [İstanbul Nüfusu: Fetihten XVIII. Yüzyıl Sonlarına Kadar](https://istanbultarihi.ist/94-istanbul-nufusu-fetihten-xviii-yuzyil-sonlarina-kadar) — Mehmet Öz | 관련 본문·절 확인 |
| IS24 | [Judeo-Espanyol/Ladino: Türkiye Yahudilerinin Dili](https://istanbultarihi.ist/246-judeo-espanyol-ladino-turkiye-yahudilerinin-dili) — Karen Gerson Şarhon | 관련 본문·절 확인 |
| IS25 | [Çemberlitaş Hamam](https://istanbultarihi.ist/491-cemberlitas-hamam) — Nina Ergin | 관련 본문·절 확인 |
| IS26 | [The Great Istanbul Fire of 1660](https://istanbultarihi.ist/394-the-great-istanbul-fire-of-1660) — Kenan Yıldız | 관련 본문·절 확인 |
| IS27 | [Slavery in Ottoman Istanbul](https://istanbultarihi.ist/473-slavery-in-ottoman-istanbul) — Nida Nebahat Nalçacı | 관련 본문·절 확인 |
| IS28 | [Near East Collections: Turkey](https://wwws.loc.gov/rr/amed/guide/nes-turkey.html) | 관련 본문·절 확인 |
| IS29 | [The 1730 Rebellion](https://istanbultarihi.ist/413-the-1730-rebellion) — Selim Karahasanoğlu | 관련 본문·절 확인 |
| IS30 | [Surety (Kefalet) and Inspection Registers of Istanbul](https://istanbultarihi.ist/509-surety-kefalet-and-inspection-registers-of-istanbul) — Betül Başaran | 관련 본문·절 확인 |
| IS31 | [Payitaht İstanbul’un Son Yüzyılı / The Last Century of Ottoman Istanbul](https://istanbultarihi.ist/46-payitaht-istanbulun-son-yuzyili) — Gültekin Yıldız | 관련 본문·절 확인 |
| IS32 | [Sea Transportation in Ottoman Istanbul (Modern Period)](https://istanbultarihi.ist/585-sea-transportation-in-ottoman-istanbul-modern-period) — Ali Akyıldız | 관련 본문·절 확인 |
| IS33 | [Kronolojik Tarihçe — Tünel](https://iett.istanbul/icerik/kronolojik-tarihce) | 관련 본문·절 확인 |
| IS34 | [“Kadınlık Yalnız Meyve Değildir”: Kadınlar Dünyası Dergisi’nin Başyazılarında Kadın Kategorisinin İnşası](https://dergipark.org.tr/tr/download/article-file/935506) — Özge Özdemir | 관련 본문·절 확인 |
| IS36 | [The Armenian Genocide (1915–16): In Depth](https://encyclopedia.ushmm.org/content/en/article/the-armenian-genocide-1915-16-in-depth) | 관련 본문·절 확인 |
| IS37 | [Istanbul during the Mütareke Era (1918–1923)](https://istanbultarihi.ist/419-istanbul-during-the-mutareke-era-1918-1923) — Mete Tunçay | 관련 본문·절 확인 |
| IS38 | [Convention Concerning the Exchange of Greek and Turkish Populations, 30 January 1923](https://www.mfa.gov.tr/lausanne-peace-treaty-vi_-convention-concerning-the-exchange-of-greek-and-turkish-populations-signed-at-lausanne_.en.mfa) | 관련 본문·절 확인 |
| IS39 | [Political Events in Istanbul in the Republican Era](https://istanbultarihi.ist/421-political-events-in-istanbul-in-the-republican-era) — Bülent Bakar | 관련 본문·절 확인 |
| IS40 | [The Wealth Tax of 1942 and the Disappearance of Non-Muslim Enterprises in Turkey](https://www.cambridge.org/core/journals/journal-of-economic-history/article/abs/wealth-tax-of-1942-and-the-disappearance-of-nonmuslim-enterprises-in-turkey/B05523EDB4D0AC1E4931C0562DE3E652) — Seven Ağır, Cihan Artunç | 공개 초록 확인 |
| IS41 | [Transformation du Secteur du Çarşı. Extrait du plan d’aménagement.](https://archives.saltresearch.org/handle/123456789/103333) — Henri Prost | 기록목록·서지 정보 확인 |
| IS42 | [The History of Elections in Istanbul, 1876–1950](https://istanbultarihi.ist/453-the-history-of-elections-in-istanbul-18761950) — Cezmi Eraslan, Kenan Olgun | 관련 본문·절 확인 |
| IS44 | [Byzantium (ca. 330–1453)](https://www.metmuseum.org/essays/byzantium-ca-330-1453) — Sarah T. Brooks | 관련 본문·절 확인 |
| IS45 | [Chronology / Kronoloji](https://istanbultarihi.ist/chronology) | 선택 연표 항목 확인 |

세부 확인 절, DOI, 번역상의 주의점은 [출처 데이터](location.json)의 sources 항목에 있다. 이미지·도판·PDF 전체는 이 자료집에 복제하지 않았다.

## 후속 조사가 필요한 부분

- 신석기 이후 철기시대 이전의 역사 반도 활동과 개별 시료 편년
- 7~8세기 및 11~12세기의 주거·인구 변화
- 여성·아동·노예의 개별 생애와 소득·주거 수준
- 19세기 노동자·아르메니아인·그리스계 주민의 개인 기록
- 제1차 세계대전의 배급·물가·피란을 보여 주는 도시 단위 원자료
- 정확한 유적 좌표·역사 해안선·시대별 8방위 비교

인접 지역은 트라키아의 급수, 흑해·동지중해의 교역, 이베리아발 이주처럼 근거가 있는 연결부터 다룬다. **시대별 8방위 비교표는 아직 완성하지 않았다.** 현대의 이웃 국가를 선사·고대의 이웃으로 자동 배치하지 않는다.

## 데이터와 게임 연결 시 지켜야 할 점

- 대표점과 각 사건의 장소를 구분하고, 정확한 좌표를 미검증한 지점은 null을 유지한다.
- date.label을 먼저 보여 주고, 범위의 시작값을 정확한 발생일처럼 표시하지 않는다.
- 국가적 배경은 scope: national_context로 표시한다.
- 스킵 구간은 “이번 자료집에 수록된 기록이 없는 기간”으로 설명한다.
- 사료의 서술과 학자의 해석, 작성자의 학습용 비교를 구별한다.
- 1950년 이후 사건을 자동 생성하지 않는다.

기존 JSON 구조에 맞춰 모든 연대 기록을 하나의 시대 장에 연결했고, 출처·장소 참조와 연대 범위·읽기 분량을 검사했다. 이는 자료 구조 검증이며 모든 역사 해석의 최종 확정을 뜻하지 않는다.
