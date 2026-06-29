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

echo.
echo PyInstaller와 변환 서버 의존성을 설치합니다.
echo "%PYTHON_EXE%" %PYTHON_ARGS% -m pip install pyinstaller fastapi uvicorn python-multipart pywin32
echo.

"%PYTHON_EXE%" %PYTHON_ARGS% -m pip install pyinstaller fastapi uvicorn python-multipart pywin32
if errorlevel 1 (
    echo.
    echo 필요한 패키지를 설치하지 못했습니다.
    echo 인터넷 연결과 Python 환경을 확인해 주세요.
    echo.
    pause
    exit /b 1
)

echo.
echo AssignmentConverterHelper.exe를 빌드합니다.
echo.

"%PYTHON_EXE%" %PYTHON_ARGS% -m PyInstaller ^
    --onefile ^
    --name AssignmentConverterHelper ^
    --collect-all uvicorn ^
    --hidden-import pythoncom ^
    --hidden-import pywintypes ^
    --hidden-import win32com ^
    --hidden-import win32com.client ^
    "%~dp0local_converter_server.py"

if errorlevel 1 (
    echo.
    echo EXE 빌드에 실패했습니다. 위 오류 내용을 확인해 주세요.
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  빌드가 완료되었습니다.
echo  결과 파일: %~dp0dist\AssignmentConverterHelper.exe
echo.
echo  EXE 실행 후 아래 주소로 상태를 확인할 수 있습니다.
echo  http://127.0.0.1:8765/health
echo ============================================================
echo.
pause
endlocal
