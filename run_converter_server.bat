@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

set "PYTHON_EXE="
set "PYTHON_ARGS="

python --version >nul 2>&1
if not errorlevel 1 (
    set "PYTHON_EXE=python"
) else (
    py -3 --version >nul 2>&1
    if not errorlevel 1 (
        set "PYTHON_EXE=py"
        set "PYTHON_ARGS=-3"
    )
)

if not defined PYTHON_EXE (
    echo.
    echo Python을 찾을 수 없습니다.
    echo Python을 설치하고 "Add Python to PATH" 옵션을 선택해 주세요.
    echo.
    pause
    exit /b 1
)

"%PYTHON_EXE%" %PYTHON_ARGS% -c "import fastapi, uvicorn, multipart, win32com.client" >nul 2>&1
if errorlevel 1 (
    echo.
    echo 변환 서버 실행에 필요한 Python 패키지가 설치되어 있지 않습니다.
    echo 아래 명령을 실행한 뒤 이 파일을 다시 실행해 주세요.
    echo.
    echo "%PYTHON_EXE%" %PYTHON_ARGS% -m pip install fastapi uvicorn python-multipart pywin32
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  과제 파일 변환 도우미를 실행합니다.
echo  서버 주소: http://127.0.0.1:8765
echo  종료하려면 이 창에서 Ctrl+C를 누르세요.
echo ============================================================
echo.

"%PYTHON_EXE%" %PYTHON_ARGS% "%~dp0local_converter_server.py"

echo.
echo 변환 도우미가 종료되었습니다.
pause
endlocal
