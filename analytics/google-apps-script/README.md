# Google Sheets 클릭 통계 연결

1. Google Sheets에서 새 스프레드시트를 만들고 이름을 `수학 수업 웹툴 클릭 통계`로 지정합니다.
2. `확장 프로그램 → Apps Script`를 엽니다.
3. 기본 `Code.gs` 내용을 이 폴더의 `Code.gs` 내용으로 교체하고 저장합니다.
4. 함수 목록에서 `setup`을 선택해 한 번 실행하고 Google 권한을 승인합니다.
5. `배포 → 새 배포 → 웹 앱`을 선택합니다.
6. 실행 사용자는 `나`, 액세스 권한은 `모든 사용자`로 지정해 배포합니다.
7. `/exec`로 끝나는 웹 앱 URL을 복사합니다.
8. `assets/click-stats-config.js`의 `endpoint`에 해당 URL을 입력합니다.

시트에는 `tool_id`, `tool_name`, `click_count`, `updated_at` 열이 자동 생성됩니다. `setup`을 다시 실행해도 기존 클릭수는 유지되며 새 웹툴 행만 추가됩니다.
