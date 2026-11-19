# 배팅 게임

2~20팀이 2~20라운드 동안 1부터 라운드 수까지의 정수를 각각 한 번씩 사용합니다. 한 라운드에 중복으로 제출된 수는 모두 무효이며, 중복되지 않은 가장 큰 수를 낸 팀이 그 수만큼 점수를 얻습니다.

정적 화면은 GitHub Pages에 유지하고, Firebase 익명 로그인과 Cloud Firestore만 사용합니다. 라운드 공개, 중복 판정, 점수 계산, 순위는 교사 화면의 JavaScript가 처리합니다. 구글 시트나 Apps Script URL을 게임마다 설정할 필요가 없습니다. 옛 시트의 기록은 그대로 남지만 새 Firebase 방으로 자동 이전되지는 않습니다. `Code.gs`는 기존 시트용 코드로 남겨 두었습니다.

## 수업에서 사용하기

1. **관리자 모드 → 게임 생성**에서 게임 이름(선택), 팀 수, 라운드 수를 정합니다. 생성할 때마다 별도 게임 코드가 발급되고, 다른 PC나 탭에서 진행 중인 게임은 바뀌지 않습니다.
2. 학생들에게 공통 QR 또는 10자리 게임 코드를 안내합니다. 각 팀의 8자리 코드는 해당 팀에만 전달합니다. QR에는 게임 코드만 들어갑니다.
3. **게임 시작**을 누릅니다. 학생들은 자기 팀의 남은 수 중 하나를 제출합니다. 접속이 어려운 팀은 게임판의 **직접 입력**을 사용하고, 마지막 라운드에서는 **마지막 라운드 자동 제출**로 미제출 팀의 마지막 수를 한 번에 입력할 수 있습니다.
4. 제출 칸을 눌러 개별 공개하거나 전 팀 제출 후 전체 공개합니다. 모든 수가 공개되면 점수가 계산되며, 마지막 라운드 종료 시 게임판의 점수 합계 줄에 순위가 표시됩니다. 동점 비교 방식은 기존 게임과 같습니다.
5. 페이지를 닫거나 새로고침해도 Firebase에 기록이 남습니다. 같은 브라우저의 **최근 게임 → 이어하기**를 사용하세요. 최대 30개 게임이 로컬 목록에 보입니다. 다른 PC나 브라우저 데이터를 지운 뒤에는 **관리자 복구 코드 복사**로 별도 보관해 둔 코드를 입력하세요. 이 코드를 가진 기기는 관리자 권한을 얻으므로 학생과 공유하지 마세요.
6. **게임 초기화**는 선택된 방에만 적용됩니다. 게임·관리자 복구 코드는 유지하고 팀 코드와 기존 팀 세션, 제출·점수를 초기화합니다.

## 사이트 운영자: Firebase 한 번만 설정

이 저장소의 운영 대상은 [mathtj-betting-game-20261120](https://console.firebase.google.com/project/mathtj-betting-game-20261120/overview) 전용 프로젝트입니다. 운영 Firestore는 `nam5`입니다. 아래 절차는 새 프로젝트로 옮길 때도 사용할 수 있습니다.

1. 배팅 게임용 Firebase 프로젝트를 준비합니다. Firebase Console에서 웹 앱을 등록하고 **Authentication → 로그인 방법 → 익명**을 사용 설정합니다(CLI 배포로도 설정할 수 있습니다). Cloud Firestore를 **Native 모드**로 생성하고, 위치가 바뀌면 `firebase/firebase.json`의 `firestore.location`도 맞춥니다.
2. 등록된 웹 앱의 공개 설정 객체를 `firebase-config.js`의 `firebaseConfig`에 넣습니다. 서비스 계정 파일, 액세스 토큰이나 비공개 키는 넣지 마세요. Pages에서 설정 파일을 바꿀 때는 `firebase-client.js` 및 `app.js`의 관련 import 버전과 `index.html`의 앱 스크립트 버전도 갱신하세요.
3. Firebase CLI로 로그인한 후 이 게임의 `firebase` 폴더에서 배포합니다. 아래는 **전용 프로젝트** 기준입니다. 공유 프로젝트에서는 기존 Firestore 보안 규칙을 보존하도록 블록을 병합하고 다른 앱이 이 경로를 공개하는 포괄 허용 규칙이 없는지 확인해야 합니다.

   ```sh
   firebase deploy --project YOUR_PROJECT_ID --only auth,firestore:rules
   ```

4. 설정이 입력된 이 게임의 정적 파일을 GitHub Pages에 배포합니다. 배포 후 관리자·학생을 별도 브라우저 프로필로 열어 두 개의 게임을 동시에 진행하고, 복구 코드로 기존 방을 다시 여는지 확인합니다.

Cloud Functions를 사용하지 않으므로 [Spark 요금제](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)로 배포할 수 있습니다. 주기적인 조회 대신 현재 방의 필요한 문서만 실시간 구독합니다. 참여자 화면은 공통 라운드 문서와 자기 팀 문서만 읽으며, 팀이 제출해도 다른 팀 화면의 문서는 갱신하지 않습니다. 무료 사용량을 넘으면 과금되는 대신 서비스 이용이 제한될 수 있습니다.

참여자는 자기 팀의 제출만 저장할 수 있습니다. Firestore 보안 규칙은 제출 라운드, 범위, 값 재사용 및 중복 제출을 검사하고 관리자 설정, 점수 편집 및 방/팀 목록 열람을 차단합니다. 정확한 게임 코드를 아는 인증 사용자는 그 방의 제목·진행 상태와 종료 후 순위를 볼 수 있습니다. 팀 코드로 접속하면 해당 팀 권한만 얻습니다. 교사 화면에는 공개 전까지 '제출 완료'만 표시하지만, 점수를 계산하는 관리자 브라우저에는 팀 데이터에 대한 읽기 권한이 있습니다.

## 로컬 검증

Node.js 22와 Firebase CLI, Firestore Emulator가 지원하는 Java를 준비합니다. 게임의 `firebase` 폴더에서:

```sh
firebase emulators:exec --project demo-betting-game --only auth,firestore "node --test integration.test.mjs"
```

화면 테스트는 `firebase emulators:start --project demo-betting-game --only auth,firestore`로 가상 서버를 시작하고, 별도 정적 HTTP 서버를 저장소 루트에서 실행해 localhost의 게임 페이지를 엽니다. localhost에서는 공개 설정이 없어도 가상 Auth·Firestore에만 연결합니다. 이 에뮬레이터 명령은 종료하면 메모리상의 게임 기록을 보존하지 않습니다.
