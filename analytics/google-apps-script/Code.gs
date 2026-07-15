const SHEET_NAME = "click_counts";

const TOOL_SEED = [
  ["tessellation-lab", "테셀레이션 조각 공방"],
  ["golden-ratio-lab", "황금비 측정 실험실"],
  ["paraboloid-conic-lab", "포물면 반사·원뿔곡선 실험실"],
  ["rabbit-fox-ecosystem", "토끼와 여우 생태계 모델"],
  ["mathematician-story", "수학자 이야기 수업관"],
  ["escape-room-maker", "수학 방탈출 제작기"],
  ["pi-day-mission-land", "파이데이 미션랜드"],
  ["coordinate-minigolf", "좌표평면 미니골프"],
  ["sound-math-lab", "소리와 수학 실험실"],
  ["motion-shot", "모션 샷 만들기"],
  ["optimal-stopping", "내 짝은 몇 번째일까?"],
  ["monty-hall", "몬티홀 딜레마 실험"],
  ["conditional-probability", "조건부 확률 실험기"],
  ["sampling-studio", "표본추출 스튜디오"],
  ["graph-framing-lab", "그래프 프레이밍·왜곡 실험실"],
  ["law-of-large-numbers", "확률 대수의 법칙 실험실"],
  ["symbol-guessing-lab", "낯선 문자 찍기 확률 실험"],
  ["genetics-simulator", "유전 확률 시뮬레이터"],
  ["benford-lab", "벤포드 법칙 실험기"],
  ["huffman-compression-lab", "허프만 부호·파일 압축 실험실"],
  ["pixel-matrix-lab", "픽셀 행렬·이미지 필터 실험실"],
  ["image-supervised-learning", "이미지 지도학습 AI 만들기"],
  ["sentiment-ai", "감성 분석 AI 실습"],
  ["trendline-prediction", "추세선으로 예측하기"],
  ["investment-portfolio", "투자 포트폴리오 LAB"],
  ["minus-auction", "마이너스 경매"],
  ["betting-game", "베팅 게임"],
  ["dice-sum-game", "주사위 눈 합 게임"],
  ["streams-number-drawer", "스트림스 수 추출기"],
  ["classification-card-game", "수학 분류 카드 게임"],
  ["set-game", "SET 게임"],
  ["double-72", "DOUBLE 72"],
  ["square-battle", "정사각형 만들기 대결"],
  ["triangle-drawing", "삼각형 그리기"],
  ["prime-check-battle", "소수 체크 게임"],
  ["number-baseball", "숫자 야구"],
  ["pig-dice", "돼지 주사위 게임"],
  ["liars-dice", "라이어스 다이스 확률 게임"],
  ["pharaoh-code", "파라오 코드"],
  ["monopoly-pricing-game", "독점 보드게임"],
  ["kbo-conditional-probability", "야구 게임 시뮬레이터"],
  ["school-file-renamer", "파일명 일괄 수정기"],
  ["item-score-generator", "문항 배점 생성기"],
  ["grade-calculator", "성적 산출 미리 해보기"],
  ["assignment-viewer", "채점용 학생 과제 통합 뷰어"],
  ["excel-personal-viewer", "엑셀 개인자료 조회기"],
  ["pdf-file-splitter", "PDF 파일 분할기"],
  ["video-compressor", "동영상 용량 줄이기"]
];

function setup() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error("이 스크립트를 클릭 통계용 Google Sheet에 연결한 뒤 다시 실행하세요.");

  PropertiesService.getScriptProperties().setProperty("SPREADSHEET_ID", spreadsheet.getId());
  const sheet = ensureSheet_(spreadsheet);
  sheet.autoResizeColumns(1, 4);
  return `준비 완료: ${TOOL_SEED.length}개 웹툴`;
}

function doGet(event) {
  const action = String(event?.parameter?.action || "counts");
  if (action !== "counts") return output_({ ok: false, error: "unsupported_action" }, event);

  const sheet = ensureSheet_(getSpreadsheet_());
  const counts = {};
  const rowCount = Math.max(sheet.getLastRow() - 1, 0);

  if (rowCount > 0) {
    sheet.getRange(2, 1, rowCount, 3).getValues().forEach(([toolId, , clickCount]) => {
      if (toolId) counts[String(toolId)] = Number(clickCount) || 0;
    });
  }

  return output_({ ok: true, counts, updated_at: new Date().toISOString() }, event);
}

function doPost(event) {
  const toolId = String(event?.parameter?.tool_id || "").trim();
  if (!/^[a-z0-9-]{1,80}$/.test(toolId)) return output_({ ok: false, error: "invalid_tool_id" });

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    const sheet = ensureSheet_(getSpreadsheet_());
    const rowCount = Math.max(sheet.getLastRow() - 1, 0);
    const match = rowCount > 0
      ? sheet.getRange(2, 1, rowCount, 1).createTextFinder(toolId).matchEntireCell(true).findNext()
      : null;

    if (!match) return output_({ ok: false, error: "unknown_tool_id" });

    const row = match.getRow();
    const countCell = sheet.getRange(row, 3);
    const nextCount = (Number(countCell.getValue()) || 0) + 1;
    countCell.setValue(nextCount);
    sheet.getRange(row, 4).setValue(new Date());
    SpreadsheetApp.flush();
    return output_({ ok: true, tool_id: toolId, count: nextCount });
  } catch (error) {
    return output_({ ok: false, error: "write_failed" });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function getSpreadsheet_() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (!spreadsheetId) throw new Error("먼저 Apps Script 편집기에서 setup 함수를 한 번 실행하세요.");
  return SpreadsheetApp.openById(spreadsheetId);
}

function ensureSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);

  sheet.getRange(1, 1, 1, 4).setValues([["tool_id", "tool_name", "click_count", "updated_at"]]);
  sheet.getRange(1, 1, 1, 4).setFontWeight("bold");
  sheet.setFrozenRows(1);

  const existingIds = new Set();
  const rowCount = Math.max(sheet.getLastRow() - 1, 0);
  if (rowCount > 0) {
    sheet.getRange(2, 1, rowCount, 1).getValues().forEach(([toolId]) => {
      if (toolId) existingIds.add(String(toolId));
    });
  }

  const missingRows = TOOL_SEED
    .filter(([toolId]) => !existingIds.has(toolId))
    .map(([toolId, toolName]) => [toolId, toolName, 0, ""]);

  if (missingRows.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, missingRows.length, 4).setValues(missingRows);
  }
  return sheet;
}

function output_(payload, event) {
  const callback = String(event?.parameter?.callback || "");
  if (callback && /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) {
    return ContentService
      .createTextOutput(`${callback}(${JSON.stringify(payload)});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
