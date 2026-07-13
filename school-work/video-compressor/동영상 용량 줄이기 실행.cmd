@echo off
chcp 65001 >nul
setlocal
title 동영상 용량 줄이기 - 실행 도우미
cd /d "%~dp0"

cls
echo ========================================================
echo          동영상 용량 줄이기 - 실행 도우미
echo ========================================================
echo.
echo 필요한 항목을 확인하고 있습니다. 잠시만 기다려 주세요.
echo.

set "NEED_RESTART=0"
set "CAN_INSTALL=1"
where winget >nul 2>nul
if errorlevel 1 set "CAN_INSTALL=0"

where node >nul 2>nul
if errorlevel 1 (
  echo [준비 1/2] 기본 실행 프로그램이 필요합니다.
  if "%CAN_INSTALL%"=="1" (
    echo 자동 설치를 시작합니다. Windows 확인 창이 뜨면 허용해 주세요.
    winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
    if errorlevel 1 goto install_error
    set "NEED_RESTART=1"
  ) else (
    echo 설치 안내 페이지를 엽니다.
    start "" "https://nodejs.org/ko/download"
    goto manual_install
  )
) else (
  echo [준비 1/2] 기본 실행 프로그램 확인 완료
)

where ffmpeg >nul 2>nul
if errorlevel 1 (
  echo [준비 2/2] 영상 처리 프로그램이 필요합니다.
  if "%CAN_INSTALL%"=="1" (
    echo 자동 설치를 시작합니다. Windows 확인 창이 뜨면 허용해 주세요.
    winget install --id Gyan.FFmpeg -e --accept-package-agreements --accept-source-agreements
    if errorlevel 1 goto install_error
    set "NEED_RESTART=1"
  ) else (
    echo 설치 안내 페이지를 엽니다.
    start "" "https://www.gyan.dev/ffmpeg/builds/"
    goto manual_install
  )
) else (
  echo [준비 2/2] 영상 처리 프로그램 확인 완료
)

if "%NEED_RESTART%"=="1" (
  echo.
  echo 준비가 완료되었습니다.
  echo 이 창을 닫은 뒤 같은 실행 파일을 다시 더블클릭해 주세요.
  echo.
  pause
  exit /b 0
)

if not exist "node_modules\" (
  echo.
  echo [마지막 준비] 필요한 파일을 처음 한 번만 내려받습니다.
  echo 인터넷 연결 상태에 따라 잠시 걸릴 수 있습니다.
  call npm.cmd install --no-audit --no-fund
  if errorlevel 1 goto npm_error
)

echo.
echo 준비 완료! 잠시 뒤 인터넷 창이 자동으로 열립니다.
echo 이 검은 창은 압축 도구를 사용하는 동안 닫지 마세요.
echo.
call npm.cmd start
goto end

:manual_install
echo.
echo 열린 안내 페이지에서 설치를 마친 뒤 이 파일을 다시 더블클릭해 주세요.
echo.
pause
exit /b 1

:install_error
echo.
echo 자동 설치를 완료하지 못했습니다.
echo 인터넷 연결을 확인하거나 관리자에게 설치를 요청해 주세요.
echo 자세한 내용은 README.md의 문제 해결 부분에서 확인할 수 있습니다.
echo.
pause
exit /b 1

:npm_error
echo.
echo 필요한 파일을 내려받지 못했습니다.
echo 인터넷 연결을 확인한 뒤 다시 실행해 주세요.
echo.
pause
exit /b 1

:end
echo.
echo 도구가 종료되었습니다. 이 창을 닫아도 됩니다.
pause
endlocal
