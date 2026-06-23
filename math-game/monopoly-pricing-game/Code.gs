/**
 * 독점 보드게임 Google Apps Script backend.
 * 구글 스프레드시트에서 확장 프로그램 > Apps Script를 열고 이 파일 전체를 붙여 넣은 뒤 웹앱으로 배포하세요.
 */

const SHEET_NAME = "시트1";
const ROUND_COUNT = 12;
const MIN_TEAM_COUNT = 3;
const MAX_TEAM_COUNT = 8;
const DEFAULT_TEAM_COUNT = 3;
const MIN_A = 4;
const MAX_C = 4;
const CURRENT_LAYOUT_VERSION = 1;
const TEAM_TITLE_ROW = 14;
const TEAM_HEADER_ROW = 15;
const TEAM_DATA_ROW = 16;
const SUBMISSION_TITLE_ROW = 30;
const SUBMISSION_HEADER_ROW = 31;
const SUBMISSION_DATA_ROW = 32;
const MAX_SUBMISSION_ROWS = MAX_TEAM_COUNT * ROUND_COUNT;
const RESULT_TITLE_ROW = 136;
const RESULT_HEADER_ROW = 137;
const RESULT_DATA_ROW = 138;
const PAYOFF_TITLE_ROW = 154;
const PAYOFF_HEADER_ROW = 155;
const PAYOFF_DATA_ROW = 156;
const MAX_PAYOFF_ROWS = 60;
const PRICES = ["A", "B", "C"];
const SETTINGS_KEYS = [
  "spreadsheetId",
  "gameId",
  "status",
  "currentRound",
  "teamCount",
  "roundCount",
  "minA",
  "maxC",
  "createdAt",
  "updatedAt",
  "layoutVersion",
];

const ORIGINAL_THREE_TEAM_PAYOFFS = [
  { combo: "AAA", profits: { A: 80 } },
  { combo: "AAB", profits: { A: 20, B: 140 } },
  { combo: "ABB", profits: { A: -40, B: 100 } },
  { combo: "BBB", profits: { B: 60 } },
  { combo: "AAC", profits: { A: -100, C: 160 } },
  { combo: "ABC", profits: { A: -100, B: -16, C: 120 } },
  { combo: "ACC", profits: { A: -100, C: 32 } },
  { combo: "BBC", profits: { B: -20, C: 86 } },
  { combo: "BCC", profits: { B: -84, C: 30 } },
  { combo: "CCC", profits: { C: -10 } },
];

function doGet(e) {
  const parameters = (e && e.parameter) || {};
  const callback = sanitizeCallback_(parameters.callback);
  try {
    const data = routeRequest_(parameters);
    return createResponse_({ success: true, data: data }, callback);
  } catch (error) {
    return createResponse_({ success: false, error: error.message || String(error) }, callback);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const data = routeRequest_(body);
    return createResponse_({ success: true, data: data });
  } catch (error) {
    return createResponse_({ success: false, error: error.message || String(error) });
  }
}

function routeRequest_(parameters) {
  const action = String(parameters.action || "");
  switch (action) {
    case "createGame":
      return createGame(parameters.spreadsheetUrl, parameters.teamCount);
    case "startGame":
      return startGame(parameters.spreadsheetId);
    case "getGameState":
      return getGameState(parameters.spreadsheetId);
    case "joinGame":
      return joinGame(parameters.spreadsheetId, parameters.teamCode);
    case "getPlayerState":
      return getPlayerState(parameters.spreadsheetId, parameters.teamCode);
    case "submitChoice":
      return submitChoice(parameters.spreadsheetId, parameters.teamCode, Number(parameters.round), parameters.choice);
    case "adminSubmitChoice":
      return adminSubmitChoice(parameters.spreadsheetId, Number(parameters.teamId), Number(parameters.round), parameters.choice);
    case "revealAllCurrentRound":
      return revealAllCurrentRound(parameters.spreadsheetId);
    case "nextRound":
      return nextRound(parameters.spreadsheetId);
    case "finishGame":
      return finishGame(parameters.spreadsheetId);
    case "resetGame":
      return resetGame(parameters.spreadsheetId);
    default:
      throw new Error("지원하지 않는 요청입니다.");
  }
}

function createResponse_(payload, callback) {
  const json = JSON.stringify(payload);
  if (callback) {
    return ContentService.createTextOutput(callback + "(" + json + ");").setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function sanitizeCallback_(callback) {
  const value = String(callback || "");
  return /^[a-zA-Z_$][0-9a-zA-Z_$.]*$/.test(value) ? value : "";
}

function withGameLock_(work) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error("다른 요청을 처리 중입니다. 잠시 후 다시 시도해 주세요.");
  try {
    return work();
  } finally {
    lock.releaseLock();
  }
}

function createGame(spreadsheetUrl, teamCount) {
  return withGameLock_(function () {
    const spreadsheetId = extractSpreadsheetId(spreadsheetUrl);
    let spreadsheet;
    try {
      spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    } catch (error) {
      throw new Error("구글 스프레드시트 주소가 잘못되었거나 접근 권한이 없습니다.");
    }
    initializeGameSheet_(spreadsheet, normalizeTeamCount_(teamCount));
    return getGameState_(spreadsheetId);
  });
}

function startGame(spreadsheetId) {
  return withGameLock_(function () {
    const id = resolveSpreadsheetId_(spreadsheetId);
    const sheet = getGameSheet_(id);
    const settings = readSettings_(sheet);
    if (settings.status === "playing") throw new Error("이미 게임이 진행 중입니다.");
    if (settings.status === "finished") throw new Error("종료된 게임입니다. 새 게임을 생성해 주세요.");
    updateGameSetting_(sheet, "status", "playing");
    updateGameSetting_(sheet, "currentRound", 1);
    touchUpdatedAt_(sheet);
    return getGameState_(id);
  });
}

function getGameState(spreadsheetId) {
  return getGameState_(resolveSpreadsheetId_(spreadsheetId));
}

function getGameState_(spreadsheetId) {
  const sheet = getGameSheet_(spreadsheetId);
  const settings = normalizeSettings_(readSettings_(sheet));
  const teams = readTeams_(sheet, settings.teamCount);
  const submissions = readSubmissions_(sheet);
  const roundResults = readRoundResults_(sheet);
  const ranking = buildFinalRanking_(teams);
  return {
    settings: settings,
    teams: teams,
    submissions: submissions,
    roundResults: roundResults,
    payoffRows: generatePayoffRows_(settings.teamCount),
    ranking: ranking,
  };
}

function joinGame(spreadsheetId, teamCode) {
  return withGameLock_(function () {
    const id = resolveSpreadsheetId_(spreadsheetId);
    const sheet = getGameSheet_(id);
    const settings = normalizeSettings_(readSettings_(sheet));
    const team = findTeamByCode_(readTeams_(sheet, settings.teamCount), teamCode);
    if (!team.joinedAt) {
      team.joinedAt = new Date().toISOString();
      writeTeam_(sheet, team);
      touchUpdatedAt_(sheet);
    }
    return getPlayerState_(id, teamCode);
  });
}

function getPlayerState(spreadsheetId, teamCode) {
  return getPlayerState_(resolveSpreadsheetId_(spreadsheetId), teamCode);
}

function getPlayerState_(spreadsheetId, teamCode) {
  const sheet = getGameSheet_(spreadsheetId);
  const settings = normalizeSettings_(readSettings_(sheet));
  const teams = readTeams_(sheet, settings.teamCount);
  const team = findTeamByCode_(teams, teamCode);
  const submissions = readSubmissions_(sheet);
  const ownSubmission = submissions.find(function (item) {
    return Number(item.round) === Number(settings.currentRound) && Number(item.teamId) === Number(team.teamId);
  }) || null;
  return {
    settings: settings,
    team: {
      teamId: team.teamId,
      teamName: team.teamName,
      choiceCounts: team.choiceCounts,
      scoreTotal: team.scoreTotal,
      profits: team.profits,
    },
    ownSubmission: ownSubmission ? {
      round: ownSubmission.round,
      choice: ownSubmission.choice,
      submittedAt: ownSubmission.submittedAt,
      isRevealed: ownSubmission.isRevealed,
    } : null,
    ranking: settings.status === "finished" ? buildFinalRanking_(teams) : [],
  };
}

function submitChoice(spreadsheetId, teamCode, round, choice) {
  return withGameLock_(function () {
    const id = resolveSpreadsheetId_(spreadsheetId);
    const sheet = getGameSheet_(id);
    const validation = validateSubmission_(sheet, teamCode, round, choice);
    saveSubmission_(sheet, validation.team, round, choice, "");
    return getPlayerState_(id, teamCode);
  });
}

function adminSubmitChoice(spreadsheetId, teamId, round, choice) {
  return withGameLock_(function () {
    const id = resolveSpreadsheetId_(spreadsheetId);
    const sheet = getGameSheet_(id);
    const settings = normalizeSettings_(readSettings_(sheet));
    const team = readTeams_(sheet, settings.teamCount).find(function (item) { return Number(item.teamId) === Number(teamId); });
    if (!team) throw new Error("해당 팀을 찾을 수 없습니다.");
    validateTeamSubmission_(sheet, team, round, choice, settings);
    saveSubmission_(sheet, team, round, choice, "관리자 직접 입력");
    return getGameState_(id);
  });
}

function saveSubmission_(sheet, team, round, choice, memo) {
  const normalizedChoice = normalizeChoice_(choice);
  appendSubmission_(sheet, [Number(round), team.teamId, team.teamName, normalizedChoice, new Date().toISOString(), false, "", memo || ""]);
  team.choiceCounts[normalizedChoice] = Number(team.choiceCounts[normalizedChoice] || 0) + 1;
  writeTeam_(sheet, team);
  touchUpdatedAt_(sheet);
}

function revealAllCurrentRound(spreadsheetId) {
  return withGameLock_(function () {
    const id = resolveSpreadsheetId_(spreadsheetId);
    const sheet = getGameSheet_(id);
    const settings = normalizeSettings_(readSettings_(sheet));
    if (settings.status !== "playing") throw new Error("진행 중인 게임에서만 공개할 수 있습니다.");
    const submissions = readSubmissions_(sheet).filter(function (item) { return Number(item.round) === Number(settings.currentRound); });
    if (submissions.length !== settings.teamCount) throw new Error(settings.teamCount + "팀이 모두 제출해야 전체 공개할 수 있습니다.");
    submissions.forEach(function (submission) {
      if (!submission.isRevealed) {
        const row = findSubmissionRow_(sheet, settings.currentRound, submission.teamId);
        sheet.getRange(row, 6, 1, 2).setValues([[true, new Date().toISOString()]]);
      }
    });
    touchUpdatedAt_(sheet);
    calculateRoundResult_(sheet, settings.currentRound);
    return getGameState_(id);
  });
}

function calculateRoundResult_(sheet, round) {
  const settings = normalizeSettings_(readSettings_(sheet));
  const existing = readRoundResults_(sheet).find(function (item) { return Number(item.round) === Number(round); });
  if (existing) return existing;
  const submissions = readSubmissions_(sheet).filter(function (item) { return Number(item.round) === Number(round); });
  if (submissions.length !== settings.teamCount) throw new Error("모든 팀이 제출해야 점수를 계산할 수 있습니다.");
  if (submissions.some(function (item) { return !item.isRevealed; })) throw new Error("모든 선택을 공개해야 점수를 계산할 수 있습니다.");

  const choices = submissions.map(function (item) { return item.choice; });
  const counts = countChoices_(choices);
  const combo = comboFromCounts_(counts);
  const profitsByTeam = {};
  const teams = readTeams_(sheet, settings.teamCount);
  submissions.forEach(function (submission) {
    const profit = profitForChoice_(settings.teamCount, counts, submission.choice);
    profitsByTeam[String(submission.teamId)] = profit;
    const team = teams.find(function (item) { return Number(item.teamId) === Number(submission.teamId); });
    team.scoreTotal = Number(team.scoreTotal || 0) + Number(profit || 0);
    team.profits.push(Number(profit || 0));
    writeTeam_(sheet, team);
  });

  const bestProfit = Math.max.apply(null, Object.keys(profitsByTeam).map(function (key) { return profitsByTeam[key]; }));
  const bestTeams = submissions.filter(function (submission) { return Number(profitsByTeam[String(submission.teamId)]) === Number(bestProfit); }).map(function (submission) { return submission.teamName; });
  const result = {
    round: Number(round),
    combo: combo,
    counts: counts,
    profitsByTeam: profitsByTeam,
    resultText: bestTeams.join(", ") + " 최고 이익 " + bestProfit + "점",
    calculatedAt: new Date().toISOString(),
  };
  writeRoundResult_(sheet, result);
  touchUpdatedAt_(sheet);
  if (Number(round) === ROUND_COUNT) finishGame_(sheet);
  return result;
}

function nextRound(spreadsheetId) {
  return withGameLock_(function () {
    const id = resolveSpreadsheetId_(spreadsheetId);
    const sheet = getGameSheet_(id);
    const settings = normalizeSettings_(readSettings_(sheet));
    if (settings.status === "finished") throw new Error("이미 모든 월이 종료되었습니다.");
    if (settings.status !== "playing") throw new Error("먼저 게임을 시작해 주세요.");
    const submissions = readSubmissions_(sheet).filter(function (item) { return Number(item.round) === Number(settings.currentRound); });
    if (submissions.length !== settings.teamCount) throw new Error("현재 월에 아직 제출하지 않은 팀이 있습니다.");
    if (submissions.some(function (item) { return !item.isRevealed; })) throw new Error("현재 월의 선택을 먼저 공개해 주세요.");
    const result = readRoundResults_(sheet).find(function (item) { return Number(item.round) === Number(settings.currentRound); });
    if (!result) throw new Error("현재 월의 점수 계산이 끝나지 않았습니다.");
    if (Number(settings.currentRound) >= ROUND_COUNT) {
      finishGame_(sheet);
    } else {
      updateGameSetting_(sheet, "currentRound", Number(settings.currentRound) + 1);
      touchUpdatedAt_(sheet);
    }
    return getGameState_(id);
  });
}

function finishGame(spreadsheetId) {
  return withGameLock_(function () {
    const id = resolveSpreadsheetId_(spreadsheetId);
    const sheet = getGameSheet_(id);
    finishGame_(sheet);
    return getGameState_(id);
  });
}

function finishGame_(sheet) {
  const settings = normalizeSettings_(readSettings_(sheet));
  const finalResult = readRoundResults_(sheet).find(function (item) { return Number(item.round) === ROUND_COUNT; });
  if (!finalResult) throw new Error("12월 결과가 계산되어야 게임을 종료할 수 있습니다.");
  updateGameSetting_(sheet, "status", "finished");
  touchUpdatedAt_(sheet);
}

function resetGame(spreadsheetId) {
  return withGameLock_(function () {
    const id = resolveSpreadsheetId_(spreadsheetId);
    const spreadsheet = SpreadsheetApp.openById(id);
    const previousSettings = readSettings_(getGameSheet_(id));
    initializeGameSheet_(spreadsheet, normalizeTeamCount_(previousSettings.teamCount || DEFAULT_TEAM_COUNT));
    return getGameState_(id);
  });
}

function validateSubmission_(sheet, teamCode, round, choice) {
  const settings = normalizeSettings_(readSettings_(sheet));
  const team = findTeamByCode_(readTeams_(sheet, settings.teamCount), teamCode);
  return validateTeamSubmission_(sheet, team, round, choice, settings);
}

function validateTeamSubmission_(sheet, team, round, choice, settings) {
  const normalizedChoice = normalizeChoice_(choice);
  if (settings.status === "created") throw new Error("아직 게임이 시작되지 않았습니다.");
  if (settings.status === "finished") throw new Error("이미 종료된 게임입니다.");
  if (settings.status !== "playing") throw new Error("게임 상태를 확인해 주세요.");
  if (Number(round) !== Number(settings.currentRound)) throw new Error("현재 월에만 제출할 수 있습니다.");
  const alreadySubmitted = readSubmissions_(sheet).some(function (item) {
    return Number(item.round) === Number(round) && Number(item.teamId) === Number(team.teamId);
  });
  if (alreadySubmitted) throw new Error("이번 월에는 이미 가격을 제출했습니다.");

  const projected = {
    A: Number(team.choiceCounts.A || 0),
    B: Number(team.choiceCounts.B || 0),
    C: Number(team.choiceCounts.C || 0),
  };
  projected[normalizedChoice] += 1;
  const remainingAfterThisRound = ROUND_COUNT - Number(settings.currentRound);
  if (projected.C > MAX_C) throw new Error("C는 최대 4번까지만 사용할 수 있습니다.");
  if (projected.A + remainingAfterThisRound < MIN_A) throw new Error("A를 최소 4번 사용해야 하므로 이 선택은 할 수 없습니다.");
  return { valid: true, team: team, settings: settings };
}

function extractSpreadsheetId(url) {
  const value = String(url || "").trim();
  const match = value.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(value)) return value;
  throw new Error("구글 스프레드시트 주소가 잘못되었습니다.");
}

function resolveSpreadsheetId_(locator) {
  const value = String(locator || "").trim();
  try {
    const id = extractSpreadsheetId(value);
    SpreadsheetApp.openById(id);
    return id;
  } catch (_error) {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) {
      const sheet = active.getSheetByName(SHEET_NAME);
      if (sheet) {
        const settings = readSettings_(sheet);
        if (String(settings.gameId || "") === value) return active.getId();
      }
    }
    throw new Error("스프레드시트 또는 게임 ID를 찾을 수 없습니다.");
  }
}

function initializeGameSheet_(spreadsheet, requestedTeamCount) {
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.getSheets()[0] || spreadsheet.insertSheet(SHEET_NAME);
    sheet.setName(SHEET_NAME);
  }
  const teamCount = normalizeTeamCount_(requestedTeamCount);
  if (sheet.getMaxRows() < 230) sheet.insertRowsAfter(sheet.getMaxRows(), 230 - sheet.getMaxRows());
  if (sheet.getMaxColumns() < 8) sheet.insertColumnsAfter(sheet.getMaxColumns(), 8 - sheet.getMaxColumns());
  const filter = sheet.getFilter();
  if (filter) filter.remove();
  sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).breakApart();
  sheet.clear();
  sheet.setFrozenRows(0);
  sheet.setFrozenColumns(0);
  const now = new Date().toISOString();
  const gameId = "MP-" + Utilities.getUuid().replace(/-/g, "").slice(0, 6).toUpperCase();
  const settings = {
    spreadsheetId: spreadsheet.getId(),
    gameId: gameId,
    status: "created",
    currentRound: 1,
    teamCount: teamCount,
    roundCount: ROUND_COUNT,
    minA: MIN_A,
    maxC: MAX_C,
    createdAt: now,
    updatedAt: now,
    layoutVersion: CURRENT_LAYOUT_VERSION,
  };
  const descriptions = {
    spreadsheetId: "연결된 스프레드시트 ID",
    gameId: "참여자용 게임 ID",
    status: "created / playing / finished",
    currentRound: "현재 진행 월",
    teamCount: "전체 팀 수",
    roundCount: "전체 월 수",
    minA: "A 최소 사용 횟수",
    maxC: "C 최대 사용 횟수",
    createdAt: "게임 생성 시각",
    updatedAt: "마지막 변경 시각",
    layoutVersion: "데이터 구조 버전",
  };

  sheet.getRange("A1:H1").merge().setValue("독점 보드게임 · 게임 설정");
  sheet.getRange("A2:C2").setValues([["key", "value", "description"]]);
  sheet.getRange(3, 1, SETTINGS_KEYS.length, 3).setValues(SETTINGS_KEYS.map(function (key) { return [key, settings[key], descriptions[key]]; }));
  sheet.getRange(TEAM_TITLE_ROW, 1, 1, 8).merge().setValue("팀 정보");
  sheet.getRange(TEAM_HEADER_ROW, 1, 1, 7).setValues([["teamId", "teamName", "teamCode", "choiceCounts", "scoreTotal", "profits", "joinedAt"]]);
  const codes = generateTeamCodes_(teamCount);
  sheet.getRange(TEAM_DATA_ROW, 1, teamCount, 7).setValues(codes.map(function (code, index) {
    return [index + 1, index + 1 + "팀", code, JSON.stringify({ A: 0, B: 0, C: 0 }), 0, "[]", ""];
  }));
  sheet.getRange(SUBMISSION_TITLE_ROW, 1, 1, 8).merge().setValue("제출 정보");
  sheet.getRange(SUBMISSION_HEADER_ROW, 1, 1, 8).setValues([["round", "teamId", "teamName", "choice", "submittedAt", "isRevealed", "revealedAt", "memo"]]);
  sheet.getRange(RESULT_TITLE_ROW, 1, 1, 8).merge().setValue("월별 결과");
  sheet.getRange(RESULT_HEADER_ROW, 1, 1, 6).setValues([["round", "combo", "counts", "profitsByTeam", "resultText", "calculatedAt"]]);
  sheet.getRange(PAYOFF_TITLE_ROW, 1, 1, 8).merge().setValue("점수표");
  sheet.getRange(PAYOFF_HEADER_ROW, 1, 1, 8).setValues([["combo", "A count", "B count", "C count", "A profit", "B profit", "C profit", "source"]]);
  const payoffRows = generatePayoffRows_(teamCount).map(function (row) {
    return [row.combo, row.counts.A, row.counts.B, row.counts.C, valueOrBlank_(row.profits.A), valueOrBlank_(row.profits.B), valueOrBlank_(row.profits.C), row.source];
  });
  sheet.getRange(PAYOFF_DATA_ROW, 1, payoffRows.length, 8).setValues(payoffRows);

  ["A1:H1", "A14:H14", "A30:H30", "A136:H136", "A154:H154"].forEach(function (range) {
    sheet.getRange(range).setBackground("#132238").setFontColor("#ffffff").setFontWeight("bold");
  });
  ["A2:C2", "A15:G15", "A31:H31", "A137:F137", "A155:H155"].forEach(function (range) {
    sheet.getRange(range).setBackground("#e5f5ee").setFontColor("#147a5c").setFontWeight("bold");
  });
  sheet.setFrozenRows(2);
  sheet.setColumnWidths(1, 8, 135);
  sheet.setColumnWidth(5, 220);
  SpreadsheetApp.flush();
}

function getGameSheet_(spreadsheetId) {
  let spreadsheet;
  try {
    spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  } catch (_error) {
    throw new Error("스프레드시트에 접근할 수 없습니다. 주소와 권한을 확인해 주세요.");
  }
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error("게임 시트를 찾을 수 없습니다. 관리자 모드에서 게임을 먼저 생성해 주세요.");
  const firstKey = sheet.getRange("A3").getValue();
  if (firstKey !== "spreadsheetId") throw new Error("게임 데이터가 없습니다. 관리자 모드에서 게임을 먼저 생성해 주세요.");
  return sheet;
}

function readSettings_(sheet) {
  const values = sheet.getRange(3, 1, SETTINGS_KEYS.length, 2).getValues();
  const settings = {};
  values.forEach(function (row) { if (row[0]) settings[String(row[0])] = row[1]; });
  return settings;
}

function normalizeSettings_(settings) {
  const layoutVersion = Number(settings.layoutVersion || 0);
  if (layoutVersion !== CURRENT_LAYOUT_VERSION) {
    throw new Error("게임 데이터 형식이 바뀌었습니다. 관리자 모드에서 게임을 새로 생성해 주세요.");
  }
  return {
    spreadsheetId: String(settings.spreadsheetId || ""),
    gameId: String(settings.gameId || ""),
    status: String(settings.status || "created"),
    currentRound: Number(settings.currentRound || 1),
    teamCount: normalizeTeamCount_(settings.teamCount),
    roundCount: ROUND_COUNT,
    minA: MIN_A,
    maxC: MAX_C,
    createdAt: dateString_(settings.createdAt),
    updatedAt: dateString_(settings.updatedAt),
    layoutVersion: layoutVersion,
  };
}

function updateGameSetting_(sheet, key, value) {
  const index = SETTINGS_KEYS.indexOf(String(key));
  if (index < 0) throw new Error("알 수 없는 게임 설정입니다. " + key);
  sheet.getRange(3 + index, 2).setValue(value);
}

function touchUpdatedAt_(sheet) {
  const index = SETTINGS_KEYS.indexOf("updatedAt");
  sheet.getRange(3 + index, 2).setValue(new Date().toISOString());
  SpreadsheetApp.flush();
}

function readTeams_(sheet, teamCount) {
  const count = normalizeTeamCount_(teamCount);
  return sheet.getRange(TEAM_DATA_ROW, 1, count, 7).getValues().filter(function (row) { return row[0] !== ""; }).map(function (row) {
    return {
      teamId: Number(row[0]),
      teamName: String(row[1]),
      teamCode: String(row[2]),
      choiceCounts: parseCounts_(row[3]),
      scoreTotal: Number(row[4] || 0),
      profits: parseNumberArray_(row[5]),
      joinedAt: dateString_(row[6]),
    };
  });
}

function writeTeam_(sheet, team) {
  const row = TEAM_DATA_ROW - 1 + Number(team.teamId);
  sheet.getRange(row, 1, 1, 7).setValues([[
    team.teamId,
    team.teamName,
    team.teamCode,
    JSON.stringify(team.choiceCounts || { A: 0, B: 0, C: 0 }),
    Number(team.scoreTotal || 0),
    JSON.stringify(team.profits || []),
    team.joinedAt || "",
  ]]);
}

function readSubmissions_(sheet) {
  return sheet.getRange(SUBMISSION_DATA_ROW, 1, MAX_SUBMISSION_ROWS, 8).getValues().filter(function (row) { return row[0] !== ""; }).map(function (row) {
    return {
      round: Number(row[0]),
      teamId: Number(row[1]),
      teamName: String(row[2]),
      choice: String(row[3]),
      submittedAt: dateString_(row[4]),
      isRevealed: row[5] === true || String(row[5]).toLowerCase() === "true",
      revealedAt: dateString_(row[6]),
      memo: String(row[7] || ""),
    };
  });
}

function appendSubmission_(sheet, values) {
  const firstColumn = sheet.getRange(SUBMISSION_DATA_ROW, 1, MAX_SUBMISSION_ROWS, 1).getValues();
  const emptyIndex = firstColumn.findIndex(function (row) { return row[0] === ""; });
  if (emptyIndex < 0) throw new Error("제출 저장 공간이 가득 찼습니다.");
  sheet.getRange(SUBMISSION_DATA_ROW + emptyIndex, 1, 1, 8).setValues([values]);
}

function findSubmissionRow_(sheet, round, teamId) {
  const values = sheet.getRange(SUBMISSION_DATA_ROW, 1, MAX_SUBMISSION_ROWS, 2).getValues();
  const index = values.findIndex(function (row) { return Number(row[0]) === Number(round) && Number(row[1]) === Number(teamId); });
  return index < 0 ? 0 : SUBMISSION_DATA_ROW + index;
}

function readRoundResults_(sheet) {
  return sheet.getRange(RESULT_DATA_ROW, 1, ROUND_COUNT, 6).getValues().filter(function (row) { return row[0] !== ""; }).map(function (row) {
    return {
      round: Number(row[0]),
      combo: String(row[1] || ""),
      counts: parseCounts_(row[2]),
      profitsByTeam: parseObject_(row[3]),
      resultText: String(row[4] || ""),
      calculatedAt: dateString_(row[5]),
    };
  });
}

function writeRoundResult_(sheet, result) {
  const row = RESULT_DATA_ROW - 1 + Number(result.round);
  sheet.getRange(row, 1, 1, 6).setValues([[
    result.round,
    result.combo,
    JSON.stringify(result.counts),
    JSON.stringify(result.profitsByTeam),
    result.resultText,
    result.calculatedAt,
  ]]);
}

function findTeamByCode_(teams, teamCode) {
  const code = String(teamCode || "").trim();
  const team = teams.find(function (item) { return String(item.teamCode) === code; });
  if (!team) throw new Error("존재하지 않는 참여 코드입니다. 선생님에게 코드를 다시 확인해 주세요.");
  return team;
}

function generateTeamCodes_(teamCount) {
  const codes = [];
  while (codes.length < teamCount) {
    const code = String(Math.floor(Math.random() * 9000) + 1000);
    if (!codes.includes(code)) codes.push(code);
  }
  return codes;
}

function normalizeTeamCount_(value) {
  const parsed = value === undefined || value === null || value === "" ? DEFAULT_TEAM_COUNT : Number(value);
  if (!Number.isInteger(parsed) || parsed < MIN_TEAM_COUNT || parsed > MAX_TEAM_COUNT) {
    throw new Error("팀 수는 " + MIN_TEAM_COUNT + "팀부터 " + MAX_TEAM_COUNT + "팀까지 선택할 수 있습니다.");
  }
  return parsed;
}

function normalizeChoice_(choice) {
  const value = String(choice || "").trim().toUpperCase();
  if (!PRICES.includes(value)) throw new Error("가격은 A, B, C 중 하나여야 합니다.");
  return value;
}

function countChoices_(items) {
  const counts = { A: 0, B: 0, C: 0 };
  items.forEach(function (choice) {
    if (PRICES.includes(choice)) counts[choice] += 1;
  });
  return counts;
}

function comboFromCounts_(counts) {
  return "A".repeat(Number(counts.A || 0)) + "B".repeat(Number(counts.B || 0)) + "C".repeat(Number(counts.C || 0));
}

function generateCountRows_(teamCount) {
  const rows = [];
  for (let a = teamCount; a >= 0; a -= 1) {
    for (let b = teamCount - a; b >= 0; b -= 1) {
      const c = teamCount - a - b;
      rows.push({ A: a, B: b, C: c });
    }
  }
  return rows;
}

function generatedProfit_(teamCount, counts, price) {
  const same = Number(counts[price] || 0);
  if (!same) return null;
  if (same === teamCount) return { A: 80, B: 60, C: -10 }[price];

  const lower = price === "A" ? 0 : price === "B" ? counts.A : counts.A + counts.B;
  const higher = price === "A" ? counts.B + counts.C : price === "B" ? counts.C : 0;
  const crowd = (same - 1) / (teamCount - 1);
  const lowerShare = lower / teamCount;
  const higherShare = higher / teamCount;
  const scarcity = 1 - crowd;
  const config = {
    A: { base: 86, lowerBonus: 0, higherPenalty: 165, crowdPenalty: 70, scarcityBonus: 8 },
    B: { base: 62, lowerBonus: 92, higherPenalty: 116, crowdPenalty: 46, scarcityBonus: 14 },
    C: { base: -8, lowerBonus: 175, higherPenalty: 0, crowdPenalty: 92, scarcityBonus: 18 },
  }[price];
  const raw = config.base + config.lowerBonus * lowerShare - config.higherPenalty * higherShare - config.crowdPenalty * crowd + config.scarcityBonus * scarcity;
  return Math.max(-120, Math.min(180, Math.round(raw / 2) * 2));
}

function generatePayoffRows_(teamCount) {
  const count = normalizeTeamCount_(teamCount);
  if (count === 3) {
    return ORIGINAL_THREE_TEAM_PAYOFFS.map(function (row) {
      return { combo: row.combo, counts: countChoices_(row.combo.split("")), profits: row.profits, source: "original" };
    });
  }
  return generateCountRows_(count).map(function (counts) {
    const profits = {};
    PRICES.forEach(function (price) {
      const profit = generatedProfit_(count, counts, price);
      if (profit !== null) profits[price] = profit;
    });
    return { combo: comboFromCounts_(counts), counts: counts, profits: profits, source: "generated" };
  });
}

function profitForChoice_(teamCount, counts, choice) {
  const combo = comboFromCounts_(counts);
  const row = generatePayoffRows_(teamCount).find(function (item) { return item.combo === combo; });
  return row && row.profits ? Number(row.profits[choice]) : 0;
}

function compareFinalRanking_(a, b) {
  if (Number(a.scoreTotal) !== Number(b.scoreTotal)) return Number(b.scoreTotal) - Number(a.scoreTotal);
  const aProfits = (a.profits || []).slice().sort(function (x, y) { return y - x; });
  const bProfits = (b.profits || []).slice().sort(function (x, y) { return y - x; });
  for (let index = 0; index < Math.max(aProfits.length, bProfits.length); index += 1) {
    const ap = Number(aProfits[index] || 0);
    const bp = Number(bProfits[index] || 0);
    if (ap !== bp) return bp - ap;
  }
  return Number(a.teamId) - Number(b.teamId);
}

function buildFinalRanking_(teams) {
  const sorted = teams.slice().sort(compareFinalRanking_);
  let previous = null;
  let currentRank = 0;
  sorted.forEach(function (team, index) {
    if (!previous || compareFinalRanking_(previous, team) !== 0) currentRank = index + 1;
    team.rank = currentRank;
    previous = team;
  });
  return sorted.map(function (team) {
    return {
      rank: team.rank,
      teamId: team.teamId,
      teamName: team.teamName,
      choiceCounts: team.choiceCounts,
      scoreTotal: team.scoreTotal,
      profits: team.profits,
    };
  });
}

function valueOrBlank_(value) {
  return value === undefined || value === null ? "" : value;
}

function parseCounts_(value) {
  const parsed = parseObject_(value);
  return {
    A: Number(parsed.A || 0),
    B: Number(parsed.B || 0),
    C: Number(parsed.C || 0),
  };
}

function parseObject_(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (value === "" || value === null || value === undefined) return {};
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function parseNumberArray_(value) {
  if (Array.isArray(value)) return value.map(Number);
  if (value === "" || value === null || value === undefined) return [];
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed.map(Number) : [];
  } catch (_error) {
    return String(value).split(",").map(function (item) { return Number(item.trim()); }).filter(function (item) { return !isNaN(item); });
  }
}

function dateString_(value) {
  if (!value) return "";
  if (Object.prototype.toString.call(value) === "[object Date]") return value.toISOString();
  return String(value);
}
