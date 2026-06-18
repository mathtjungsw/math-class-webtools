/**
 * 배팅 게임 Google Apps Script 백엔드
 * 구글 스프레드시트에서 확장 프로그램 → Apps Script를 열어 이 파일 전체를 붙여넣으세요.
 */

const SHEET_NAME = "시트1";
const DEFAULT_TEAM_COUNT = 5;
const MIN_TEAM_COUNT = 2;
const MAX_TEAM_COUNT = 20;
const DEFAULT_ROUND_COUNT = 6;
const MIN_ROUND_COUNT = 2;
const MAX_ROUND_COUNT = 20;
const CURRENT_LAYOUT_VERSION = 3;
const TEAM_DATA_ROW = 14;
const SUBMISSION_TITLE_ROW = 36;
const SUBMISSION_HEADER_ROW = 37;
const SUBMISSION_DATA_ROW = 38;
const MAX_SUBMISSION_ROWS = MAX_TEAM_COUNT * MAX_ROUND_COUNT;
const RESULT_TITLE_ROW = 440;
const RESULT_HEADER_ROW = 441;
const RESULT_DATA_ROW = 442;
const SETTINGS_KEYS = [
  "spreadsheetId",
  "gameId",
  "status",
  "currentRound",
  "teamCount",
  "roundCount",
  "createdAt",
  "updatedAt",
  "layoutVersion",
];

function doGet(e) {
  const parameters = (e && e.parameter) || {};
  const callback = sanitizeCallback_(parameters.callback);
  try {
    const data = routeRequest_(parameters);
    return createResponse_({ success: true, data: data, message: "처리되었습니다." }, callback);
  } catch (error) {
    return createResponse_({ success: false, error: error.message || String(error) }, callback);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const data = routeRequest_(body);
    return createResponse_({ success: true, data: data, message: "처리되었습니다." });
  } catch (error) {
    return createResponse_({ success: false, error: error.message || String(error) });
  }
}

function routeRequest_(parameters) {
  const action = String(parameters.action || "");
  switch (action) {
    case "createGame":
      return createGame(parameters.spreadsheetUrl, parameters.teamCount, parameters.roundCount);
    case "startGame":
      return startGame(parameters.spreadsheetId);
    case "getGameState":
      return getGameState(parameters.spreadsheetId);
    case "joinGame":
      return joinGame(parameters.spreadsheetId, parameters.teamCode);
    case "getPlayerState":
      return getPlayerState(parameters.spreadsheetId, parameters.teamCode);
    case "submitNumber":
      return submitNumber(parameters.spreadsheetId, parameters.teamCode, Number(parameters.round), Number(parameters.number));
    case "adminSubmitNumber":
      return adminSubmitNumber(parameters.spreadsheetId, Number(parameters.teamId), Number(parameters.round), Number(parameters.number));
    case "revealSubmission":
      return revealSubmission(parameters.spreadsheetId, Number(parameters.round), Number(parameters.teamId));
    case "revealAllCurrentRound":
      return revealAllCurrentRound(parameters.spreadsheetId);
    case "calculateRoundResult":
      return calculateRoundResult(parameters.spreadsheetId, Number(parameters.round));
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
    return ContentService.createTextOutput(callback + "(" + json + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
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

function createGame(spreadsheetUrl, teamCount, roundCount) {
  return withGameLock_(function () {
    const spreadsheetId = extractSpreadsheetId(spreadsheetUrl);
    let spreadsheet;
    try {
      spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    } catch (error) {
      throw new Error("구글 스프레드시트 주소가 잘못되었거나 접근 권한이 없습니다.");
    }
    initializeGameSheet_(
      spreadsheet,
      normalizeGameSize_(teamCount, DEFAULT_TEAM_COUNT, MIN_TEAM_COUNT, MAX_TEAM_COUNT, "팀 수"),
      normalizeGameSize_(roundCount, DEFAULT_ROUND_COUNT, MIN_ROUND_COUNT, MAX_ROUND_COUNT, "라운드 수")
    );
    return getGameState_(spreadsheetId);
  });
}

function startGame(spreadsheetId) {
  return withGameLock_(function () {
    const id = resolveSpreadsheetId_(spreadsheetId);
    const sheet = getGameSheet_(id);
    const settings = readSettings_(sheet);
    if (settings.status === "playing") throw new Error("이미 게임이 진행 중입니다.");
    if (settings.status === "finished") throw new Error("종료된 게임입니다. 새 게임을 시작하려면 초기화해 주세요.");
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
  const teams = readTeams_(sheet).map(function (team) {
    team.remainingNumbers = getRemainingNumbers(team, settings.roundCount);
    return team;
  });
  const submissions = readSubmissions_(sheet);
  const roundResults = readRoundResults_(sheet);
  const ranking = settings.status === "finished" ? buildFinalRanking_(teams) : [];
  return {
    settings: settings,
    teams: teams,
    submissions: submissions,
    roundResults: roundResults,
    ranking: ranking,
  };
}

function joinGame(spreadsheetId, teamCode) {
  return withGameLock_(function () {
    const id = resolveSpreadsheetId_(spreadsheetId);
    const sheet = getGameSheet_(id);
    const teams = readTeams_(sheet);
    const team = findTeamByCode_(teams, teamCode);
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
  const teams = readTeams_(sheet);
  const team = findTeamByCode_(teams, teamCode);
  const submissions = readSubmissions_(sheet);
  const ownSubmission = submissions.find(function (item) {
    return Number(item.round) === Number(settings.currentRound) && Number(item.teamId) === Number(team.teamId);
  }) || null;
  const safeTeam = {
    teamId: team.teamId,
    teamName: team.teamName,
    usedNumbers: team.usedNumbers,
    remainingNumbers: getRemainingNumbers(team, settings.roundCount),
    scoreTotal: team.scoreTotal,
    earnedScores: team.earnedScores,
    earnedRounds: team.earnedRounds,
  };
  return {
    settings: settings,
    team: safeTeam,
    ownSubmission: ownSubmission ? {
      round: ownSubmission.round,
      submittedNumber: ownSubmission.submittedNumber,
      submittedAt: ownSubmission.submittedAt,
      isRevealed: ownSubmission.isRevealed,
    } : null,
    ranking: settings.status === "finished" ? buildFinalRanking_(teams) : [],
  };
}

function submitNumber(spreadsheetId, teamCode, round, number) {
  return withGameLock_(function () {
    const id = resolveSpreadsheetId_(spreadsheetId);
    const sheet = getGameSheet_(id);
    const validation = validateSubmission_(sheet, teamCode, round, number);
    saveSubmission_(sheet, validation.team, round, number, "");
    return getPlayerState_(id, teamCode);
  });
}

function adminSubmitNumber(spreadsheetId, teamId, round, number) {
  return withGameLock_(function () {
    const id = resolveSpreadsheetId_(spreadsheetId);
    const sheet = getGameSheet_(id);
    const settings = normalizeSettings_(readSettings_(sheet));
    const team = readTeams_(sheet).find(function (item) { return Number(item.teamId) === Number(teamId); });
    if (!team) throw new Error("해당 팀을 찾을 수 없습니다.");
    validateTeamSubmission_(sheet, team, round, number, settings);
    saveSubmission_(sheet, team, round, number, "관리자 직접 입력");
    return getGameState_(id);
  });
}

function saveSubmission_(sheet, team, round, number, memo) {
  const normalizedNumber = Number(number);
  appendSubmission_(sheet, [Number(round), team.teamId, team.teamName, normalizedNumber, new Date().toISOString(), false, "", memo || ""]);
  team.usedNumbers.push(normalizedNumber);
  writeTeam_(sheet, team);
  touchUpdatedAt_(sheet);
}

function revealSubmission(spreadsheetId, round, teamId) {
  return withGameLock_(function () {
    const id = resolveSpreadsheetId_(spreadsheetId);
    const sheet = getGameSheet_(id);
    const settings = normalizeSettings_(readSettings_(sheet));
    if (settings.status !== "playing") throw new Error("진행 중인 게임에서만 숫자를 공개할 수 있습니다.");
    if (Number(round) !== Number(settings.currentRound)) throw new Error("현재 라운드의 제출만 공개할 수 있습니다.");
    const row = findSubmissionRow_(sheet, round, teamId);
    if (!row) throw new Error("해당 팀의 제출을 찾을 수 없습니다.");
    sheet.getRange(row, 6, 1, 2).setValues([[true, new Date().toISOString()]]);
    touchUpdatedAt_(sheet);
    calculateIfReady_(sheet, round);
    return getGameState_(id);
  });
}

function revealAllCurrentRound(spreadsheetId) {
  return withGameLock_(function () {
    const id = resolveSpreadsheetId_(spreadsheetId);
    const sheet = getGameSheet_(id);
    const settings = normalizeSettings_(readSettings_(sheet));
    if (settings.status !== "playing") throw new Error("진행 중인 게임에서만 전체 공개할 수 있습니다.");
    const submissions = readSubmissions_(sheet).filter(function (item) { return Number(item.round) === Number(settings.currentRound); });
    if (submissions.length !== settings.teamCount) throw new Error(settings.teamCount + "개 팀이 모두 제출해야 전체 공개할 수 있습니다.");
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

function calculateRoundResult(spreadsheetId, round) {
  return withGameLock_(function () {
    const id = resolveSpreadsheetId_(spreadsheetId);
    const sheet = getGameSheet_(id);
    calculateRoundResult_(sheet, round);
    return getGameState_(id);
  });
}

function calculateRoundResult_(sheet, round) {
  const settings = normalizeSettings_(readSettings_(sheet));
  if (Number(round) !== Number(settings.currentRound)) throw new Error("현재 라운드만 계산할 수 있습니다.");
  const existing = readRoundResults_(sheet).find(function (item) { return Number(item.round) === Number(round); });
  if (existing) return existing;
  const submissions = readSubmissions_(sheet).filter(function (item) { return Number(item.round) === Number(round); });
  if (submissions.length !== settings.teamCount) throw new Error("모든 팀이 제출한 뒤 점수를 계산할 수 있습니다.");
  if (submissions.some(function (item) { return !item.isRevealed; })) throw new Error("모든 제출 숫자를 공개한 뒤 점수를 계산할 수 있습니다.");

  const counts = {};
  submissions.forEach(function (item) { counts[item.submittedNumber] = (counts[item.submittedNumber] || 0) + 1; });
  const duplicatedNumbers = Object.keys(counts).filter(function (number) { return counts[number] > 1; }).map(Number).sort(function (a, b) { return b - a; });
  const validSubmissions = submissions.filter(function (item) { return counts[item.submittedNumber] === 1; }).sort(function (a, b) { return b.submittedNumber - a.submittedNumber; });
  const validNumbers = validSubmissions.map(function (item) { return item.submittedNumber; });
  const winner = validSubmissions.length ? validSubmissions[0] : null;
  const resultText = winner
    ? winner.teamName + "이 " + winner.submittedNumber + "점을 획득했습니다." + (duplicatedNumbers.length ? " 중복으로 무효: " + duplicatedNumbers.join(", ") : "")
    : "모든 제출 숫자가 중복되어 점수 획득 팀이 없습니다.";

  if (winner) {
    const teams = readTeams_(sheet);
    const winningTeam = teams.find(function (team) { return Number(team.teamId) === Number(winner.teamId); });
    winningTeam.scoreTotal += Number(winner.submittedNumber);
    winningTeam.earnedScores.push(Number(winner.submittedNumber));
    winningTeam.earnedRounds.push(Number(round));
    writeTeam_(sheet, winningTeam);
  }

  const result = {
    round: Number(round),
    winnerTeamId: winner ? winner.teamId : "",
    winnerTeamName: winner ? winner.teamName : "",
    winningNumber: winner ? winner.submittedNumber : "",
    duplicatedNumbers: duplicatedNumbers,
    validNumbers: validNumbers,
    resultText: resultText,
    calculatedAt: new Date().toISOString(),
  };
  writeRoundResult_(sheet, result);
  touchUpdatedAt_(sheet);
  if (Number(round) === settings.roundCount) finishGame_(sheet);
  return result;
}

function nextRound(spreadsheetId) {
  return withGameLock_(function () {
    const id = resolveSpreadsheetId_(spreadsheetId);
    const sheet = getGameSheet_(id);
    const settings = normalizeSettings_(readSettings_(sheet));
    if (settings.status === "finished") throw new Error("이미 모든 라운드가 종료되었습니다.");
    if (settings.status !== "playing") throw new Error("먼저 게임을 시작해 주세요.");
    const submissions = readSubmissions_(sheet).filter(function (item) { return Number(item.round) === Number(settings.currentRound); });
    if (submissions.length !== settings.teamCount) throw new Error("현재 라운드에 아직 제출하지 않은 팀이 있습니다.");
    if (submissions.some(function (item) { return !item.isRevealed; })) throw new Error("현재 라운드의 모든 숫자를 먼저 공개해 주세요.");
    const result = readRoundResults_(sheet).find(function (item) { return Number(item.round) === Number(settings.currentRound); });
    if (!result) throw new Error("현재 라운드의 점수 계산이 아직 끝나지 않았습니다.");
    if (Number(settings.currentRound) >= settings.roundCount) {
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
  const finalResult = readRoundResults_(sheet).find(function (item) { return Number(item.round) === settings.roundCount; });
  if (!finalResult) throw new Error(settings.roundCount + "라운드 결과가 계산된 뒤 게임을 종료할 수 있습니다.");
  updateGameSetting_(sheet, "status", "finished");
  touchUpdatedAt_(sheet);
}

function resetGame(spreadsheetId) {
  return withGameLock_(function () {
    const id = resolveSpreadsheetId_(spreadsheetId);
    const spreadsheet = SpreadsheetApp.openById(id);
    const previousSettings = readSettings_(getGameSheet_(id));
    initializeGameSheet_(
      spreadsheet,
      Number(previousSettings.teamCount || DEFAULT_TEAM_COUNT),
      Number(previousSettings.roundCount || DEFAULT_ROUND_COUNT)
    );
    return getGameState_(id);
  });
}

function validateSubmission(spreadsheetId, teamCode, round, number) {
  const id = resolveSpreadsheetId_(spreadsheetId);
  return validateSubmission_(getGameSheet_(id), teamCode, Number(round), Number(number));
}

function validateSubmission_(sheet, teamCode, round, number) {
  const settings = normalizeSettings_(readSettings_(sheet));
  const team = findTeamByCode_(readTeams_(sheet), teamCode);
  return validateTeamSubmission_(sheet, team, round, number, settings);
}

function validateTeamSubmission_(sheet, team, round, number, settings) {
  if (settings.status === "created") throw new Error("아직 게임이 시작되지 않았습니다.");
  if (settings.status === "finished") throw new Error("이미 종료된 게임입니다.");
  if (settings.status !== "playing") throw new Error("게임 상태를 확인해 주세요.");
  if (Number(round) !== Number(settings.currentRound)) throw new Error("현재 라운드에만 제출할 수 있습니다.");
  if (!Number.isInteger(Number(number)) || Number(number) < 1 || Number(number) > settings.roundCount) {
    throw new Error("1부터 " + settings.roundCount + "까지의 숫자만 제출할 수 있습니다.");
  }
  if (team.usedNumbers.includes(Number(number))) throw new Error("이미 사용한 숫자입니다. 남은 숫자 중에서 골라 주세요.");
  const alreadySubmitted = readSubmissions_(sheet).some(function (item) {
    return Number(item.round) === Number(round) && Number(item.teamId) === Number(team.teamId);
  });
  if (alreadySubmitted) throw new Error("이번 라운드에는 이미 숫자를 제출했습니다.");
  return { valid: true, team: team, settings: settings };
}

function createNumberRange_(roundCount) {
  return Array.from({ length: Number(roundCount) }, function (_, index) { return index + 1; });
}

function getRemainingNumbers(team, roundCount) {
  const used = (team.usedNumbers || []).map(Number);
  const count = normalizeGameSize_(roundCount, DEFAULT_ROUND_COUNT, MIN_ROUND_COUNT, MAX_ROUND_COUNT, "라운드 수");
  return createNumberRange_(count).filter(function (number) { return !used.includes(number); });
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

function generateTeamCodes(teamCount) {
  const codes = [];
  const count = normalizeGameSize_(teamCount, DEFAULT_TEAM_COUNT, MIN_TEAM_COUNT, MAX_TEAM_COUNT, "팀 수");
  while (codes.length < count) {
    const code = String(Math.floor(Math.random() * 9000) + 1000);
    if (!codes.includes(code)) codes.push(code);
  }
  return codes;
}

function compareFinalRanking(a, b) {
  if (Number(a.scoreTotal) !== Number(b.scoreTotal)) return Number(b.scoreTotal) - Number(a.scoreTotal);
  const aPairs = scoreRoundPairs_(a);
  const bPairs = scoreRoundPairs_(b);
  const length = Math.max(aPairs.length, bPairs.length);
  for (let index = 0; index < length; index += 1) {
    const ap = aPairs[index] || { score: 0, round: 999 };
    const bp = bPairs[index] || { score: 0, round: 999 };
    if (ap.score !== bp.score) return bp.score - ap.score;
    if (ap.round !== bp.round) return ap.round - bp.round;
  }
  return 0;
}

function scoreRoundPairs_(team) {
  return (team.earnedScores || []).map(function (score, index) {
    return { score: Number(score), round: Number((team.earnedRounds || [])[index]) };
  }).sort(function (a, b) { return b.score - a.score; });
}

function buildFinalRanking_(teams) {
  const sorted = teams.slice().sort(function (a, b) {
    return compareFinalRanking(a, b) || Number(a.teamId) - Number(b.teamId);
  });
  let previous = null;
  let currentRank = 0;
  sorted.forEach(function (team, index) {
    if (!previous || compareFinalRanking(previous, team) !== 0) currentRank = index + 1;
    team.rank = currentRank;
    previous = team;
  });
  const jointWinner = sorted.filter(function (team) { return team.rank === 1; }).length > 1;
  return sorted.map(function (team) {
    return {
      rank: team.rank,
      teamId: team.teamId,
      teamName: team.teamName,
      scoreTotal: team.scoreTotal,
      earnedScores: team.earnedScores,
      earnedRounds: team.earnedRounds,
      isJointWinner: jointWinner && team.rank === 1,
    };
  });
}

function normalizeGameSize_(value, fallback, minimum, maximum, label) {
  const parsed = value === undefined || value === null || value === "" ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(label + "는 " + minimum + "부터 " + maximum + " 사이의 정수여야 합니다.");
  }
  return parsed;
}

function initializeGameSheet_(spreadsheet, requestedTeamCount, requestedRoundCount) {
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
  const teamCount = normalizeGameSize_(requestedTeamCount, DEFAULT_TEAM_COUNT, MIN_TEAM_COUNT, MAX_TEAM_COUNT, "팀 수");
  const roundCount = normalizeGameSize_(requestedRoundCount, DEFAULT_ROUND_COUNT, MIN_ROUND_COUNT, MAX_ROUND_COUNT, "라운드 수");
  if (sheet.getMaxRows() < 470) sheet.insertRowsAfter(sheet.getMaxRows(), 470 - sheet.getMaxRows());
  sheet.getRange("A1:H470").breakApart().clear({ contentsOnly: false });
  const now = new Date().toISOString();
  const gameId = "BG-" + Utilities.getUuid().replace(/-/g, "").slice(0, 6).toUpperCase();
  const settings = {
    spreadsheetId: spreadsheet.getId(),
    gameId: gameId,
    status: "created",
    currentRound: 1,
    teamCount: teamCount,
    roundCount: roundCount,
    createdAt: now,
    updatedAt: now,
    layoutVersion: CURRENT_LAYOUT_VERSION,
  };
  const descriptions = {
    spreadsheetId: "연결된 스프레드시트 ID",
    gameId: "참여자용 게임 ID",
    status: "created / playing / finished",
    currentRound: "현재 진행 라운드",
    teamCount: "전체 팀 수",
    roundCount: "전체 라운드 수",
    createdAt: "게임 생성 시각",
    updatedAt: "마지막 변경 시각",
    layoutVersion: "데이터 구조 버전",
  };

  sheet.getRange("A1:H1").merge().setValue("배팅 게임 · 게임 설정");
  sheet.getRange("A2:C2").setValues([["key", "value", "description"]]);
  sheet.getRange(3, 1, SETTINGS_KEYS.length, 3).setValues(SETTINGS_KEYS.map(function (key) { return [key, settings[key], descriptions[key]]; }));
  sheet.getRange("A12:H12").merge().setValue("팀 정보");
  sheet.getRange("A13:H13").setValues([["teamId", "teamName", "teamCode", "usedNumbers", "scoreTotal", "earnedScores", "earnedRounds", "joinedAt"]]);
  const codes = generateTeamCodes(teamCount);
  sheet.getRange(TEAM_DATA_ROW, 1, teamCount, 8).setValues(codes.map(function (code, index) { return [index + 1, index + 1 + "팀", code, "[]", 0, "[]", "[]", ""]; }));
  sheet.getRange(SUBMISSION_TITLE_ROW, 1, 1, 8).merge().setValue("제출 정보");
  sheet.getRange(SUBMISSION_HEADER_ROW, 1, 1, 8).setValues([["round", "teamId", "teamName", "submittedNumber", "submittedAt", "isRevealed", "revealedAt", "memo"]]);
  sheet.getRange(RESULT_TITLE_ROW, 1, 1, 8).merge().setValue("라운드 결과");
  sheet.getRange(RESULT_HEADER_ROW, 1, 1, 8).setValues([["round", "winnerTeamId", "winnerTeamName", "winningNumber", "duplicatedNumbers", "validNumbers", "resultText", "calculatedAt"]]);

  ["A1:H1", "A12:H12", "A36:H36", "A440:H440"].forEach(function (range) {
    sheet.getRange(range).setBackground("#17695d").setFontColor("#ffffff").setFontWeight("bold");
  });
  ["A2:C2", "A13:H13", "A37:H37", "A441:H441"].forEach(function (range) {
    sheet.getRange(range).setBackground("#dff3eb").setFontColor("#124e46").setFontWeight("bold");
  });
  sheet.setFrozenRows(2);
  sheet.setColumnWidths(1, 8, 135);
  sheet.setColumnWidth(7, 260);
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
  if (!sheet) throw new Error("‘시트1’을 찾을 수 없습니다. 관리자 모드에서 게임을 먼저 생성해 주세요.");
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
    throw new Error("게임 데이터 형식이 업데이트되었습니다. 관리자 모드에서 게임을 새로 생성해 주세요.");
  }
  return {
    spreadsheetId: String(settings.spreadsheetId || ""),
    gameId: String(settings.gameId || ""),
    status: String(settings.status || "created"),
    currentRound: Number(settings.currentRound || 1),
    teamCount: normalizeGameSize_(settings.teamCount, DEFAULT_TEAM_COUNT, MIN_TEAM_COUNT, MAX_TEAM_COUNT, "팀 수"),
    roundCount: normalizeGameSize_(settings.roundCount, DEFAULT_ROUND_COUNT, MIN_ROUND_COUNT, MAX_ROUND_COUNT, "라운드 수"),
    createdAt: dateString_(settings.createdAt),
    updatedAt: dateString_(settings.updatedAt),
    layoutVersion: layoutVersion,
  };
}

function updateGameSetting(spreadsheetId, key, value) {
  return withGameLock_(function () {
    const id = resolveSpreadsheetId_(spreadsheetId);
    const sheet = getGameSheet_(id);
    updateGameSetting_(sheet, key, value);
    touchUpdatedAt_(sheet);
    return getGameState_(id);
  });
}

function updateGameSetting_(sheet, key, value) {
  const index = SETTINGS_KEYS.indexOf(String(key));
  if (index < 0) throw new Error("알 수 없는 게임 설정입니다: " + key);
  sheet.getRange(3 + index, 2).setValue(value);
}

function touchUpdatedAt_(sheet) {
  const index = SETTINGS_KEYS.indexOf("updatedAt");
  sheet.getRange(3 + index, 2).setValue(new Date().toISOString());
  SpreadsheetApp.flush();
}

function readTeams_(sheet) {
  return sheet.getRange(TEAM_DATA_ROW, 1, MAX_TEAM_COUNT, 8).getValues().filter(function (row) { return row[0] !== ""; }).map(function (row) {
    return {
      teamId: Number(row[0]),
      teamName: String(row[1]),
      teamCode: String(row[2]),
      usedNumbers: parseNumberArray_(row[3]),
      scoreTotal: Number(row[4] || 0),
      earnedScores: parseNumberArray_(row[5]),
      earnedRounds: parseNumberArray_(row[6]),
      joinedAt: dateString_(row[7]),
    };
  });
}

function writeTeam_(sheet, team) {
  const row = TEAM_DATA_ROW - 1 + Number(team.teamId);
  sheet.getRange(row, 1, 1, 8).setValues([[
    team.teamId,
    team.teamName,
    team.teamCode,
    JSON.stringify(team.usedNumbers || []),
    Number(team.scoreTotal || 0),
    JSON.stringify(team.earnedScores || []),
    JSON.stringify(team.earnedRounds || []),
    team.joinedAt || "",
  ]]);
}

function readSubmissions_(sheet) {
  return sheet.getRange(SUBMISSION_DATA_ROW, 1, MAX_SUBMISSION_ROWS, 8).getValues().filter(function (row) { return row[0] !== ""; }).map(function (row) {
    return {
      round: Number(row[0]),
      teamId: Number(row[1]),
      teamName: String(row[2]),
      submittedNumber: Number(row[3]),
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
  return sheet.getRange(RESULT_DATA_ROW, 1, MAX_ROUND_COUNT, 8).getValues().filter(function (row) { return row[0] !== ""; }).map(function (row) {
    return {
      round: Number(row[0]),
      winnerTeamId: row[1] === "" ? "" : Number(row[1]),
      winnerTeamName: String(row[2] || ""),
      winningNumber: row[3] === "" ? "" : Number(row[3]),
      duplicatedNumbers: parseNumberArray_(row[4]),
      validNumbers: parseNumberArray_(row[5]),
      resultText: String(row[6] || ""),
      calculatedAt: dateString_(row[7]),
    };
  });
}

function writeRoundResult_(sheet, result) {
  const row = RESULT_DATA_ROW - 1 + Number(result.round);
  sheet.getRange(row, 1, 1, 8).setValues([[
    result.round,
    result.winnerTeamId,
    result.winnerTeamName,
    result.winningNumber,
    JSON.stringify(result.duplicatedNumbers),
    JSON.stringify(result.validNumbers),
    result.resultText,
    result.calculatedAt,
  ]]);
}

function calculateIfReady_(sheet, round) {
  const settings = normalizeSettings_(readSettings_(sheet));
  const submissions = readSubmissions_(sheet).filter(function (item) { return Number(item.round) === Number(round); });
  if (submissions.length === settings.teamCount && submissions.every(function (item) { return item.isRevealed; })) {
    calculateRoundResult_(sheet, round);
  }
}

function findTeamByCode_(teams, teamCode) {
  const code = String(teamCode || "").trim();
  const team = teams.find(function (item) { return String(item.teamCode) === code; });
  if (!team) throw new Error("존재하지 않는 참여 코드입니다. 선생님에게 코드를 다시 확인해 주세요.");
  return team;
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
