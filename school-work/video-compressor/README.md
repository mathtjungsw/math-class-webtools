# 동영상 용량 줄이기

FFmpeg의 2-pass 인코딩을 이용해 큰 동영상 파일을 원하는 목표 용량 아래로 줄이는 Windows용 로컬 웹툴입니다. 영상은 인터넷이나 외부 서버로 전송되지 않고 현재 PC에서만 처리됩니다.

## 주요 기능

- 드래그 앤 드롭과 파일 선택 지원
- 원본 파일명, 용량, 재생시간, 해상도 표시
- 기본 목표 490MB, 3% 안전 여유를 적용한 비트레이트 자동 계산
- H.264(기본) 또는 H.265 선택
- AAC 128kbps 오디오와 FFmpeg 2-pass 인코딩
- 실시간 진행률, 예상 남은 시간, 압축 중지
- 목표 용량을 넘으면 비트레이트를 낮춰 한 번 자동 재압축
- 한글·공백 파일명과 Windows 경로 지원
- 2GB 이상 파일 처리(최대 20GB로 설정)
- 다운로드 후 임시 결과 자동 삭제

## 1. 준비하기

### Node.js 설치

1. [Node.js 공식 사이트](https://nodejs.org/ko)에서 **LTS 버전**을 내려받습니다.
2. 설치 프로그램의 기본 설정대로 설치합니다.
3. PowerShell을 새로 열고 아래 명령을 입력합니다.

```powershell
node --version
npm --version
```

두 명령 모두 버전 번호가 나오면 준비된 것입니다.

### FFmpeg 설치

이 도구에는 FFmpeg 실행 파일을 포함하지 않습니다. PC에 `ffmpeg`와 `ffprobe`가 설치되어 있고 Windows의 `Path`에서 찾을 수 있어야 합니다.

가장 간단한 방법은 Windows 패키지 관리자를 사용하는 것입니다. PowerShell에서 다음 명령을 실행합니다.

```powershell
winget install --id Gyan.FFmpeg -e
```

설치가 끝나면 **PowerShell을 완전히 닫았다가 새로 열고** 다음 명령으로 확인합니다.

```powershell
ffmpeg -version
ffprobe -version
```

버전 정보가 표시되면 설치가 완료된 것입니다. `winget`을 사용할 수 없다면 [FFmpeg Windows builds](https://www.gyan.dev/ffmpeg/builds/)에서 release essentials ZIP을 받아 압축을 풀고, 압축을 푼 폴더 안의 `bin` 폴더를 Windows 환경 변수 `Path`에 추가합니다.

## 2. 처음 한 번 설치하기

1. 파일 탐색기에서 이 `video-compressor` 폴더를 엽니다.
2. 폴더의 빈 곳에서 `Shift` 키를 누른 채 마우스 오른쪽 버튼을 클릭합니다.
3. **터미널에서 열기** 또는 **PowerShell 창 열기**를 선택합니다.
4. 다음 명령을 입력합니다.

```powershell
npm install
```

설치는 처음 한 번만 하면 됩니다.

PowerShell 보안 설정으로 `npm.ps1을 로드할 수 없습니다`라는 메시지가 나오면 같은 명령을 Windows 실행 파일 이름으로 입력하세요.

```powershell
npm.cmd install
```

## 3. 실행하기

같은 폴더의 PowerShell에서 다음 명령을 입력합니다.

```powershell
npm start
```

같은 PowerShell 보안 오류가 나오면 다음 명령을 사용해도 동일하게 실행됩니다.

```powershell
npm.cmd start
```

잠시 뒤 기본 브라우저에서 `http://127.0.0.1:3210` 주소가 자동으로 열립니다. 자동으로 열리지 않으면 주소를 직접 입력해 주세요.

서버를 종료하려면 PowerShell 창에서 `Ctrl + C`를 누릅니다.

## 4. 사용 방법

1. 영상 파일을 점선 영역으로 끌어 놓거나 **파일 선택**을 누릅니다.
2. 원본 파일 정보가 표시될 때까지 기다립니다.
3. 목표 용량을 입력합니다. 업로드 제한이 500MB라면 기본값인 490MB 사용을 권장합니다.
4. H.264 또는 H.265를 선택합니다.
   - **H.264:** 대부분의 PC와 웹 서비스에서 잘 재생되며 더 빠릅니다.
   - **H.265:** 같은 용량에서 화질이 좋을 수 있지만 더 오래 걸리고 일부 기기에서 재생되지 않을 수 있습니다.
5. **압축 시작**을 누릅니다.
6. 완료되면 결과 용량을 확인하고 **결과 파일 다운로드**를 누릅니다.

## 임시 파일과 디스크 공간

- 업로드 원본과 2-pass 분석 로그는 작업 완료, 오류 또는 중지 시 자동으로 삭제됩니다.
- 결과 파일은 다운로드가 끝나면 자동으로 삭제됩니다.
- 다운로드하지 않은 결과도 1시간 뒤 자동으로 삭제됩니다.
- 비정상 종료로 남은 24시간 이전 임시 파일은 다음 실행 시 자동으로 정리됩니다.
- 압축 중에는 원본 영상 크기의 2~3배 정도 디스크 여유 공간을 확보하는 것이 좋습니다.

## 문제 해결

### “FFmpeg를 찾지 못했습니다”가 표시될 때

FFmpeg 설치 후 기존 PowerShell 창을 계속 사용하면 새 `Path`가 반영되지 않을 수 있습니다. 모든 터미널을 닫고 새로 연 뒤 `ffmpeg -version`과 `ffprobe -version`을 확인하고 다시 `npm start`를 실행하세요.

### 포트가 이미 사용 중이라고 나올 때

다른 프로그램이 3210 포트를 사용 중입니다. 다음처럼 다른 포트를 지정할 수 있습니다.

```powershell
$env:PORT=3211
npm start
```

### 압축에 매우 오래 걸릴 때

2-pass 방식은 영상을 두 번 읽으며, 목표를 넘으면 두 번 더 읽을 수 있습니다. H.265는 H.264보다 대체로 오래 걸립니다. 빠른 처리가 중요하면 H.264를 선택하세요.

### 목표 용량을 아주 조금 넘을 때

도구는 3% 안전 여유를 적용하고 한 번 자동 재압축합니다. 그래도 목표를 넘는 특수한 영상은 목표값을 5~10MB 더 낮춰 다시 실행해 주세요.

## 폴더 구조

```text
video-compressor/
├─ package.json          # 의존성 및 npm start 설정
├─ server.js             # Express, 업로드, FFprobe, FFmpeg 처리
├─ README.md             # 설치 및 사용 안내
├─ .gitignore
└─ public/
   ├─ index.html         # 한글 사용자 화면
   ├─ style.css          # 반응형 디자인
   └─ app.js             # 업로드, 진행률, 설정, 다운로드 동작
```

## 기술 구성

- Node.js 18 이상
- Express
- Multer 디스크 스트리밍 업로드
- 설치된 FFmpeg / FFprobe
- Server-Sent Events(SSE) 실시간 진행 정보
