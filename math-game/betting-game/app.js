const STORAGE_KEYS = {
  admin: "bettingGame.admin.v1",
  player: "bettingGame.player.v1",
};

const appState = {
  mode: "home",
  admin: null,
  player: null,
  selectedNumber: null,
  pollTimer: null,
  busy: false,
};

const $ = (selector) => document.querySelector(selector);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function readStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}") || {};
  } catch (_error) {
    return {};
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_error) {
    // Private browsing can disable storage. The game still works for this tab.
  }
}

function extractSpreadsheetId(value) {
  const text = String(value || "").trim();
  const urlMatch = text.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch) return urlMatch[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(text)) return text;
  return text;
}

function validateApiUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "https:" && /script\.google\.com$/.test(url.hostname) && /\/(exec|dev)$/.test(url.pathname);
  } catch (_error) {
    return false;
  }
}

function getAdminConnection() {
  const apiUrl = $("#adminApiUrl").value.trim();
  const spreadsheet = $("#adminSpreadsheet").value.trim();
  return { apiUrl, spreadsheet, spreadsheetId: extractSpreadsheetId(spreadsheet) };
}

function getPlayerConnection() {
  const apiUrl = $("#playerApiUrl").value.trim();
  const spreadsheet = $("#playerSpreadsheet").value.trim();
  const teamCode = $("#playerTeamCode").value.trim();
  return { apiUrl, spreadsheet, spreadsheetId: extractSpreadsheetId(spreadsheet), teamCode };
}

function assertConnection(connection, needsCode = false) {
  if (!validateApiUrl(connection.apiUrl)) {
    throw new Error("Apps Script 웹앱 URL을 확인해 주세요. 배포된 /exec 주소를 입력해야 합니다.");
  }
  if (!connection.spreadsheetId) {
    throw new Error("구글 스프레드시트 주소 또는 게임 ID를 입력해 주세요.");
  }
  if (needsCode && !/^\d{4}$/.test(connection.teamCode)) {
    throw new Error("참여 코드는 숫자 4자리로 입력해 주세요.");
  }
}

function requestJsonp(apiUrl, action, params = {}) {
  return new Promise((resolve, reject) => {
    const callbackName = `__bettingGame_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const query = new URLSearchParams({ action, callback: callbackName, _: Date.now().toString() });
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) query.set(key, String(value));
    });

    const script = document.createElement("script");
    const separator = apiUrl.includes("?") ? "&" : "?";
    script.src = `${apiUrl}${separator}${query.toString()}`;
    script.async = true;

    let settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      script.remove();
      try { delete window[callbackName]; } catch (_error) { window[callbackName] = undefined; }
    };
    const fail = (message) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(message));
    };

    const timer = setTimeout(() => fail("서버 응답이 늦어지고 있습니다. 네트워크와 웹앱 배포 권한을 확인한 뒤 다시 시도해 주세요."), 20000);
    window[callbackName] = (response) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (response && response.success) resolve(response.data);
      else reject(new Error(response?.error || "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요."));
    };
    script.onerror = () => fail("Apps Script에 연결할 수 없습니다. URL과 웹앱 액세스 권한을 확인해 주세요.");
    document.head.appendChild(script);
  });
}

function setLoading(active, text = "처리 중입니다…") {
  appState.busy = active;
  $("#loadingOverlay").hidden = !active;
  $("#loadingText").textContent = text;
}

function showMessage(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  $("#toastRegion").appendChild(toast);
  window.setTimeout(() => toast.remove(), 4300);
}

function updateConnectionPill(connected) {
  const pill = $("#connectionPill");
  pill.textContent = connected ? "● 연결됨" : "연결 전";
  pill.classList.toggle("connected", connected);
}

function stopPolling() {
  if (appState.pollTimer) window.clearInterval(appState.pollTimer);
  appState.pollTimer = null;
}

function startPolling(mode) {
  stopPolling();
  appState.pollTimer = window.setInterval(() => {
    if (document.hidden || appState.busy || appState.mode !== mode) return;
    if (mode === "admin" && appState.admin) loadAdminState({ silent: true });
    if (mode === "player" && appState.player) loadPlayerState({ silent: true });
  }, 5000);
}

function switchMode(mode) {
  stopPolling();
  appState.mode = mode;
  $("#modeSelection").hidden = mode !== "home";
  $("#adminScreen").hidden = mode !== "admin";
  $("#playerScreen").hidden = mode !== "player";
  updateConnectionPill(Boolean((mode === "admin" && appState.admin) || (mode === "player" && appState.player)));

  if (mode === "admin") {
    const saved = readStorage(STORAGE_KEYS.admin);
    $("#adminApiUrl").value ||= saved.apiUrl || "";
    $("#adminSpreadsheet").value ||= saved.spreadsheet || saved.spreadsheetId || "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else if (mode === "player") {
    const saved = readStorage(STORAGE_KEYS.player);
    $("#playerApiUrl").value ||= saved.apiUrl || "";
    $("#playerSpreadsheet").value ||= saved.spreadsheet || saved.spreadsheetId || "";
    $("#playerTeamCode").value ||= saved.teamCode || "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    updateConnectionPill(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function saveLocalGameInfo(mode, connection, extra = {}) {
  writeStorage(STORAGE_KEYS[mode], { ...connection, ...extra });
}

function loadLocalGameInfo(mode) {
  return readStorage(STORAGE_KEYS[mode]);
}

async function createGame() {
  try {
    const connection = getAdminConnection();
    assertConnection(connection);
    if (!window.confirm("‘시트1’의 기존 게임 영역을 새 게임으로 바꿉니다. 계속할까요?")) return;
    setLoading(true, "게임과 참여 코드를 만들고 있습니다…");
    const state = await requestJsonp(connection.apiUrl, "createGame", { spreadsheetUrl: connection.spreadsheet });
    appState.admin = state;
    saveLocalGameInfo("admin", connection, { spreadsheetId: state.settings.spreadsheetId });
    renderAdminBoard(state);
    updateConnectionPill(true);
    startPolling("admin");
    showMessage("새 게임과 5개 팀의 참여 코드를 만들었습니다.", "success");
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    setLoading(false);
  }
}

async function startGame() {
  try {
    const connection = getAdminConnection();
    assertConnection(connection);
    setLoading(true, "1라운드를 시작하고 있습니다…");
    const state = await requestJsonp(connection.apiUrl, "startGame", { spreadsheetId: connection.spreadsheetId });
    appState.admin = state;
    renderAdminBoard(state);
    startPolling("admin");
    showMessage("게임을 시작했습니다. 이제 팀이 숫자를 제출할 수 있습니다.", "success");
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    setLoading(false);
  }
}

async function loadAdminState(options = {}) {
  try {
    const saved = loadLocalGameInfo("admin");
    const connection = getAdminConnection();
    if (!connection.spreadsheetId && saved.spreadsheetId) connection.spreadsheetId = saved.spreadsheetId;
    assertConnection(connection);
    if (!options.silent) setLoading(true, "스프레드시트와 동기화하고 있습니다…");
    const state = await requestJsonp(connection.apiUrl, "getGameState", { spreadsheetId: connection.spreadsheetId });
    appState.admin = state;
    saveLocalGameInfo("admin", connection, { spreadsheetId: state.settings.spreadsheetId });
    renderAdminBoard(state);
    updateConnectionPill(true);
    startPolling("admin");
    if (!options.silent) showMessage("최신 상태를 불러왔습니다.", "success");
  } catch (error) {
    if (!options.silent) showMessage(error.message, "error");
  } finally {
    if (!options.silent) setLoading(false);
  }
}

async function revealCell(round, teamId) {
  if (!appState.admin || appState.busy) return;
  try {
    const connection = getAdminConnection();
    assertConnection(connection);
    setLoading(true, "선택한 숫자를 공개하고 있습니다…");
    const state = await requestJsonp(connection.apiUrl, "revealSubmission", { spreadsheetId: connection.spreadsheetId, round, teamId });
    appState.admin = state;
    renderAdminBoard(state);
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    setLoading(false);
  }
}

async function revealAllCurrentRound() {
  if (!appState.admin) return;
  const { settings, submissions } = appState.admin;
  const submittedCount = submissions.filter((item) => Number(item.round) === Number(settings.currentRound)).length;
  if (submittedCount < settings.teamCount) {
    showMessage(`아직 ${settings.teamCount - submittedCount}개 팀이 제출하지 않았습니다.`, "info");
    return;
  }
  try {
    const connection = getAdminConnection();
    setLoading(true, "모든 숫자를 공개하고 점수를 계산합니다…");
    const state = await requestJsonp(connection.apiUrl, "revealAllCurrentRound", { spreadsheetId: connection.spreadsheetId });
    appState.admin = state;
    renderAdminBoard(state);
    showMessage("숫자를 모두 공개하고 라운드 결과를 계산했습니다.", "success");
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    setLoading(false);
  }
}

async function nextRound() {
  if (!appState.admin) return;
  try {
    const connection = getAdminConnection();
    setLoading(true, "다음 라운드로 이동하고 있습니다…");
    const state = await requestJsonp(connection.apiUrl, "nextRound", { spreadsheetId: connection.spreadsheetId });
    appState.admin = state;
    renderAdminBoard(state);
    showMessage(state.settings.status === "finished" ? "게임이 끝났습니다. 최종 결과를 확인하세요!" : `${state.settings.currentRound}라운드를 시작합니다.`, "success");
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    setLoading(false);
  }
}

async function resetGame() {
  if (!appState.admin || !window.confirm("모든 제출과 점수가 지워지고 새 참여 코드가 만들어집니다. 정말 초기화할까요?")) return;
  try {
    const connection = getAdminConnection();
    setLoading(true, "게임을 초기화하고 있습니다…");
    const state = await requestJsonp(connection.apiUrl, "resetGame", { spreadsheetId: connection.spreadsheetId });
    appState.admin = state;
    renderAdminBoard(state);
    showMessage("게임을 초기화하고 새 참여 코드를 만들었습니다.", "success");
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    setLoading(false);
  }
}

function renderAdminBoard(state) {
  const { settings, teams = [], submissions = [], roundResults = [], ranking = [] } = state;
  const isCreated = settings.status === "created";
  const isFinished = settings.status === "finished";
  $("#adminSetupStatus").textContent = isCreated ? "게임 생성됨" : isFinished ? "게임 종료" : "진행 중";
  $("#adminSetupStatus").classList.add("ready");
  $("#adminRoundBadge").innerHTML = `<small>현재 라운드</small><strong>${isCreated ? "준비 중" : isFinished ? "종료" : `${settings.currentRound} / ${settings.roundCount}`}</strong>`;
  $("#teamCodesPanel").hidden = false;
  $("#adminGamePanel").hidden = isCreated;
  $("#adminSummaryPanel").hidden = isCreated;
  $("#adminFinalPanel").hidden = !isFinished;
  $("#startGameButton").hidden = !isCreated;
  $("#gameIdDisplay").textContent = settings.gameId;

  $("#teamCodeGrid").innerHTML = teams.map((team) => `<article class="team-code-card"><small>${escapeHtml(team.teamName)}</small><strong>${escapeHtml(team.teamCode)}</strong></article>`).join("");
  if (isCreated) return;

  $("#roundProgress").innerHTML = Array.from({ length: settings.roundCount }, (_, index) => {
    const round = index + 1;
    const klass = round < settings.currentRound || isFinished ? "done" : round === settings.currentRound ? "current" : "";
    return `<span class="progress-step ${klass}" title="${round}라운드"></span>`;
  }).join("");

  $("#adminBoardHead").innerHTML = `<tr><th scope="col">라운드</th>${teams.map((team) => `<th scope="col">${escapeHtml(team.teamName)}</th>`).join("")}</tr>`;
  $("#adminBoardBody").innerHTML = Array.from({ length: settings.roundCount }, (_, index) => {
    const round = index + 1;
    const result = roundResults.find((item) => Number(item.round) === round);
    const rowClass = round === Number(settings.currentRound) && !isFinished ? "current-round" : round < Number(settings.currentRound) || isFinished ? "past-round" : "";
    const cells = teams.map((team) => {
      const submission = submissions.find((item) => Number(item.round) === round && Number(item.teamId) === Number(team.teamId));
      if (!submission) return `<td><button class="cell-button pending" type="button" disabled>미제출</button></td>`;
      if (!submission.isRevealed) return `<td><button class="cell-button submitted" type="button" onclick="revealCell(${round}, ${team.teamId})">제출 완료</button></td>`;
      const won = result && Number(result.winnerTeamId) === Number(team.teamId);
      return `<td><button class="cell-button revealed ${won ? "winner" : ""}" type="button" disabled>${escapeHtml(submission.submittedNumber)}${won ? " ★" : ""}</button></td>`;
    }).join("");
    return `<tr class="${rowClass}"><th class="round-label" scope="row"><strong>${round}R</strong><small>${result ? "계산 완료" : round === settings.currentRound && !isFinished ? "진행 중" : ""}</small></th>${cells}</tr>`;
  }).join("");

  const currentSubmissions = submissions.filter((item) => Number(item.round) === Number(settings.currentRound));
  const currentResult = roundResults.find((item) => Number(item.round) === Number(settings.currentRound));
  $("#submissionCount").textContent = `${currentSubmissions.length} / ${settings.teamCount}팀 제출`;
  $("#roundHint").textContent = isFinished ? "모든 라운드가 끝났습니다." : currentResult ? "결과 계산이 끝났습니다. 다음 라운드로 이동하세요." : currentSubmissions.length === settings.teamCount ? "모든 팀이 제출했습니다. 숫자를 공개하세요." : "각 팀의 제출을 기다리고 있습니다.";
  $("#revealAllButton").disabled = isFinished || Boolean(currentResult) || currentSubmissions.length < settings.teamCount;
  $("#nextRoundButton").disabled = isFinished;
  $("#nextRoundButton").textContent = Number(settings.currentRound) === Number(settings.roundCount) ? "최종 결과 보기 →" : "다음 라운드 →";

  $("#teamStatusList").innerHTML = teams.map((team) => `<div class="team-status-item"><strong>${escapeHtml(team.teamName)}</strong><div class="mini-numbers">${team.remainingNumbers.map((number) => `<span class="mini-number">${number}</span>`).join("") || '<span class="empty-state">모두 사용</span>'}</div><div class="score-box"><strong>${team.scoreTotal}</strong><small>점</small></div></div>`).join("");
  renderRoundResult(roundResults);
  if (isFinished) renderFinalRanking(ranking, "#adminFinalRanking");
}

function renderRoundResult(results = []) {
  const container = $("#roundResultList");
  if (!results.length) {
    container.innerHTML = '<p class="empty-state">공개가 끝난 라운드의 결과가 여기에 나타납니다.</p>';
    return;
  }
  container.innerHTML = [...results].reverse().map((result) => `<article class="result-item ${result.winnerTeamId ? "" : "no-winner"}"><strong>${result.round}라운드 · ${result.winnerTeamId ? `${escapeHtml(result.winnerTeamName)} ${result.winningNumber}점` : "획득 팀 없음"}</strong><p>${escapeHtml(result.resultText)}</p></article>`).join("");
}

async function joinGame() {
  try {
    const connection = getPlayerConnection();
    assertConnection(connection, true);
    setLoading(true, "팀 정보를 확인하고 있습니다…");
    const state = await requestJsonp(connection.apiUrl, "joinGame", { spreadsheetId: connection.spreadsheetId, teamCode: connection.teamCode });
    appState.player = state;
    appState.selectedNumber = null;
    saveLocalGameInfo("player", connection, { spreadsheetId: state.settings.spreadsheetId });
    renderPlayerBoard(state);
    $("#playerJoinPanel").hidden = true;
    $("#playerGamePanel").hidden = false;
    updateConnectionPill(true);
    startPolling("player");
    showMessage(`${state.team.teamName}으로 접속했습니다.`, "success");
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    setLoading(false);
  }
}

async function loadPlayerState(options = {}) {
  try {
    const connection = getPlayerConnection();
    assertConnection(connection, true);
    if (!options.silent) setLoading(true, "게임 상태를 확인하고 있습니다…");
    const state = await requestJsonp(connection.apiUrl, "getPlayerState", { spreadsheetId: connection.spreadsheetId, teamCode: connection.teamCode });
    appState.player = state;
    renderPlayerBoard(state);
    updateConnectionPill(true);
  } catch (error) {
    if (!options.silent) showMessage(error.message, "error");
  } finally {
    if (!options.silent) setLoading(false);
  }
}

function selectNumber(number) {
  if (!appState.player || appState.player.ownSubmission || appState.player.settings.status !== "playing") return;
  if (!appState.player.team.remainingNumbers.includes(number)) return;
  appState.selectedNumber = number;
  renderPlayerBoard(appState.player);
}

async function submitNumber() {
  if (!appState.player || !appState.selectedNumber) {
    showMessage("먼저 제출할 숫자를 골라 주세요.", "info");
    return;
  }
  const number = appState.selectedNumber;
  if (!window.confirm(`${number}을(를) 제출할까요? 제출 후에는 바꿀 수 없습니다.`)) return;
  try {
    const connection = getPlayerConnection();
    assertConnection(connection, true);
    setLoading(true, `${number}을(를) 제출하고 있습니다…`);
    const state = await requestJsonp(connection.apiUrl, "submitNumber", { spreadsheetId: connection.spreadsheetId, teamCode: connection.teamCode, round: appState.player.settings.currentRound, number });
    appState.player = state;
    appState.selectedNumber = null;
    renderPlayerBoard(state);
    showMessage("제출 완료! 관리자가 공개할 때까지 기다려 주세요.", "success");
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    setLoading(false);
  }
}

function renderPlayerBoard(state) {
  const { settings, team, ownSubmission, ranking = [] } = state;
  const isCreated = settings.status === "created";
  const isFinished = settings.status === "finished";
  $("#playerTeamName").textContent = team.teamName;
  $("#playerRoundBadge").innerHTML = `<small>현재 라운드</small><strong>${isCreated ? "준비 중" : isFinished ? "종료" : `${settings.currentRound} / ${settings.roundCount}`}</strong>`;
  $("#playerScoreChip").textContent = `현재 ${team.scoreTotal}점`;

  const status = $("#playerStatusMessage");
  status.className = `player-status ${isCreated || ownSubmission ? "waiting" : isFinished ? "finished" : ""}`;
  status.innerHTML = `<span class="pulse-dot"></span><strong>${isCreated ? "선생님이 게임을 시작할 때까지 기다려 주세요." : isFinished ? "모든 라운드가 끝났습니다. 최종 결과를 확인하세요!" : ownSubmission ? `${settings.currentRound}라운드 제출 완료 · 다음 안내를 기다려 주세요.` : `${settings.currentRound}라운드 · 사용할 숫자를 하나 골라 주세요.`}</strong>`;

  renderRemainingNumbers(team);
  const used = new Set(team.usedNumbers.map(Number));
  $("#numberGrid").innerHTML = [1, 2, 3, 4, 5, 6].map((number) => {
    const isUsed = used.has(number);
    const selected = appState.selectedNumber === number;
    const disabled = isUsed || Boolean(ownSubmission) || settings.status !== "playing";
    return `<button class="number-button ${isUsed ? "used" : ""} ${selected ? "selected" : ""}" type="button" onclick="selectNumber(${number})" ${disabled ? "disabled" : ""} aria-pressed="${selected}">${number}</button>`;
  }).join("");
  $("#selectedNumberDisplay").textContent = ownSubmission ? ownSubmission.submittedNumber : appState.selectedNumber || "–";
  $("#submitNumberButton").disabled = !appState.selectedNumber || Boolean(ownSubmission) || settings.status !== "playing";
  $("#submitNumberButton").textContent = ownSubmission ? "제출 완료" : appState.selectedNumber ? `${appState.selectedNumber} 제출하기` : "숫자를 선택하세요";
  $("#playerFinalPanel").hidden = !isFinished;
  if (isFinished) renderFinalRanking(ranking, "#playerFinalRanking");
}

function renderRemainingNumbers(team) {
  const used = new Set((team.usedNumbers || []).map(Number));
  $("#remainingNumbers").innerHTML = `<div class="remaining-overview">${[1, 2, 3, 4, 5, 6].map((number) => `<span class="remaining-token ${used.has(number) ? "used" : ""}" title="${used.has(number) ? "사용 완료" : "사용 가능"}">${number}</span>`).join("")}</div>`;
}

function renderFinalRanking(ranking, targetSelector) {
  const winners = ranking.filter((item) => Number(item.rank) === 1);
  const winnerText = winners.length > 1 ? `공동 우승 · ${winners.map((item) => item.teamName).join(", ")}` : `${winners[0]?.teamName || "-"} 우승!`;
  $(targetSelector).innerHTML = `<div class="final-heading"><span class="trophy">🏆</span><h2>최종 결과</h2><p>${escapeHtml(winnerText)}</p></div><div class="ranking-list">${ranking.map((item) => `<article class="ranking-item ${Number(item.rank) === 1 ? "winner" : ""}"><span class="rank-number">${item.rank}위</span><div class="ranking-team"><strong>${escapeHtml(item.teamName)}</strong><small>획득 점수 ${item.earnedScores.length ? item.earnedScores.join(" · ") : "없음"}</small></div><span class="ranking-score">${item.scoreTotal}점</span></article>`).join("")}</div>`;
}

function calculateRankingClientSide(state) {
  const teams = (state.teams || []).map((team) => ({ ...team }));
  const compare = (a, b) => {
    if (a.scoreTotal !== b.scoreTotal) return b.scoreTotal - a.scoreTotal;
    const aPairs = (a.earnedScores || []).map((score, index) => ({ score: Number(score), round: Number(a.earnedRounds[index]) })).sort((x, y) => y.score - x.score);
    const bPairs = (b.earnedScores || []).map((score, index) => ({ score: Number(score), round: Number(b.earnedRounds[index]) })).sort((x, y) => y.score - x.score);
    for (let index = 0; index < Math.max(aPairs.length, bPairs.length); index += 1) {
      const ap = aPairs[index] || { score: 0, round: 99 };
      const bp = bPairs[index] || { score: 0, round: 99 };
      if (ap.score !== bp.score) return bp.score - ap.score;
      if (ap.round !== bp.round) return ap.round - bp.round;
    }
    return 0;
  };
  return teams.sort(compare);
}

function leavePlayerGame() {
  stopPolling();
  appState.player = null;
  appState.selectedNumber = null;
  localStorage.removeItem(STORAGE_KEYS.player);
  $("#playerJoinPanel").hidden = false;
  $("#playerGamePanel").hidden = true;
  $("#playerApiUrl").value = "";
  $("#playerSpreadsheet").value = "";
  $("#playerTeamCode").value = "";
  $("#playerRoundBadge").innerHTML = "<small>현재 라운드</small><strong>접속 전</strong>";
  updateConnectionPill(false);
}

document.addEventListener("DOMContentLoaded", () => {
  const admin = loadLocalGameInfo("admin");
  const player = loadLocalGameInfo("player");
  $("#adminApiUrl").value = admin.apiUrl || "";
  $("#adminSpreadsheet").value = admin.spreadsheet || admin.spreadsheetId || "";
  $("#playerApiUrl").value = player.apiUrl || "";
  $("#playerSpreadsheet").value = player.spreadsheet || player.spreadsheetId || "";
  $("#playerTeamCode").value = player.teamCode || "";
  $("#playerTeamCode").addEventListener("input", (event) => { event.target.value = event.target.value.replace(/\D/g, "").slice(0, 4); });
});
