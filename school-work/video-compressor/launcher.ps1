$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$Host.UI.RawUI.WindowTitle = "동영상 용량 줄이기 - 실행 도우미"
Set-Location -LiteralPath $PSScriptRoot

if ($env:VIDEO_COMPRESSOR_LAUNCHER_TEST -eq "1") {
  Clear-Host
  Write-Host "동영상 용량 줄이기 실행 도우미" -ForegroundColor Cyan
  Write-Host "한글 표시와 실행 연결이 정상입니다." -ForegroundColor Green
  exit 0
}

function Write-Section([string]$Message) {
  Write-Host ""
  Write-Host $Message -ForegroundColor Cyan
}

function Wait-And-Exit([int]$Code = 0) {
  Write-Host ""
  Read-Host "계속하려면 Enter 키를 누르세요"
  exit $Code
}

function Test-Program([string]$Name) {
  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Install-With-Winget([string]$Id, [string]$DisplayName) {
  Write-Host "$DisplayName 설치를 시작합니다." -ForegroundColor Yellow
  Write-Host "Windows 확인 창이 뜨면 허용해 주세요."
  & winget install --id $Id -e --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) {
    throw "$DisplayName 자동 설치를 완료하지 못했습니다."
  }
}

Clear-Host
Write-Host "========================================================" -ForegroundColor DarkBlue
Write-Host "          동영상 용량 줄이기 - 실행 도우미" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor DarkBlue
Write-Host ""
Write-Host "필요한 항목을 확인하고 있습니다. 잠시만 기다려 주세요."

$canInstall = Test-Program "winget"
$needsRestart = $false

try {
  if (Test-Program "node") {
    Write-Host "[준비 1/2] 기본 실행 프로그램 확인 완료" -ForegroundColor Green
  } elseif ($canInstall) {
    Write-Section "[준비 1/2] 기본 실행 프로그램이 필요합니다."
    Install-With-Winget "OpenJS.NodeJS.LTS" "기본 실행 프로그램"
    $needsRestart = $true
  } else {
    Write-Section "[준비 1/2] 기본 실행 프로그램 설치가 필요합니다."
    Start-Process "https://nodejs.org/ko/download"
    Write-Host "열린 안내 페이지에서 설치한 뒤 실행 파일을 다시 더블클릭해 주세요."
    Wait-And-Exit 1
  }

  if (Test-Program "ffmpeg") {
    Write-Host "[준비 2/2] 영상 처리 프로그램 확인 완료" -ForegroundColor Green
  } elseif ($canInstall) {
    Write-Section "[준비 2/2] 영상 처리 프로그램이 필요합니다."
    Install-With-Winget "Gyan.FFmpeg" "영상 처리 프로그램"
    $needsRestart = $true
  } else {
    Write-Section "[준비 2/2] 영상 처리 프로그램 설치가 필요합니다."
    Start-Process "https://www.gyan.dev/ffmpeg/builds/"
    Write-Host "열린 안내 페이지에서 설치한 뒤 실행 파일을 다시 더블클릭해 주세요."
    Wait-And-Exit 1
  }

  if ($needsRestart) {
    Write-Section "준비가 완료되었습니다."
    Write-Host "이 창을 닫은 뒤 '동영상 용량 줄이기 실행.cmd'를 다시 더블클릭해 주세요."
    Wait-And-Exit 0
  }

  if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot "node_modules"))) {
    Write-Section "[마지막 준비] 필요한 파일을 처음 한 번만 내려받습니다."
    Write-Host "인터넷 연결 상태에 따라 잠시 걸릴 수 있습니다."
    & npm.cmd install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
      throw "필요한 파일을 내려받지 못했습니다."
    }
  }

  Write-Section "준비 완료! 잠시 뒤 인터넷 창이 자동으로 열립니다."
  Write-Host "이 창은 압축 도구를 사용하는 동안 닫지 마세요."
  Write-Host ""
  & npm.cmd start
} catch {
  Write-Host ""
  Write-Host "실행 준비를 완료하지 못했습니다." -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  Write-Host "인터넷 연결을 확인한 뒤 다시 실행하거나 학교 관리자에게 설치를 요청해 주세요."
  Write-Host "자세한 내용은 README.md의 문제 해결 부분에서 확인할 수 있습니다."
  Wait-And-Exit 1
}
