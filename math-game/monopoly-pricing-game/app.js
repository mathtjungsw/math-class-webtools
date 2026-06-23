const STORAGE_KEYS = {
  admin: "monopolyPricing.admin.v2",
  player: "monopolyPricing.player.v2",
};

const PRICES = ["A", "B", "C"];
const PRICE_INFO = {
  A: { label: "A", detail: "낮은 가격", color: "#147a5c" },
  B: { label: "B", detail: "중간 가격", color: "#8a6900" },
  C: { label: "C", detail: "높은 가격", color: "#2d6cdf" },
};
const ROUND_COUNT = 12;
const MIN_TEAM_COUNT = 3;
const MAX_TEAM_COUNT = 8;
const MIN_A = 4;
const MAX_C = 4;

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

const appState = {
  mode: "home",
  admin: null,
  player: null,
  selectedChoice: "",
  commonJoinUrl: "",
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
    // Private browsing can disable storage. The page still works for this tab.
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

function getAdminTeamCount() {
  const teamCount = Number($("#adminTeamCount").value);
  if (!Number.isInteger(teamCount) || teamCount < MIN_TEAM_COUNT || teamCount > MAX_TEAM_COUNT) {
    throw new Error(`팀 수는 ${MIN_TEAM_COUNT}팀부터 ${MAX_TEAM_COUNT}팀까지 선택할 수 있습니다.`);
  }
  return teamCount;
}

function renderPayoffPreview() {
  const teamCount = getAdminTeamCount();
  $("#payoffPanel").hidden = false;
  renderPayoffTable(teamCount);
}

function assertConnection(connection, needsCode = false) {
  if (!validateApiUrl(connection.apiUrl)) {
    throw new Error("Apps Script 웹앱 URL을 확인해 주세요. 배포된 /exec 주소가 필요합니다.");
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
    const callbackName = `__monopolyPricing_${Date.now()}_${Math.random().toString(36).slice(2)}`;
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
      try {
        delete window[callbackName];
      } catch (_error) {
        window[callbackName] = undefined;
      }
    };
    const fail = (message) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(message));
    };

    const timer = setTimeout(() => fail("서버 응답이 늦어지고 있습니다. 배포 URL과 권한을 확인한 뒤 다시 시도해 주세요."), 20000);
    window[callbackName] = (response) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (response && response.success) resolve(response.data);
      else reject(new Error(response?.error || "요청을 처리하지 못했습니다."));
    };
    script.onerror = () => fail("Apps Script에 연결할 수 없습니다. URL과 웹앱 접근 권한을 확인해 주세요.");
    document.head.appendChild(script);
  });
}

function setLoading(active, text = "처리 중입니다...") {
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
  pill.textContent = connected ? "연결됨" : "연결 전";
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
    renderPayoffPreview();
  } else if (mode === "player") {
    const saved = readStorage(STORAGE_KEYS.player);
    $("#playerApiUrl").value ||= saved.apiUrl || "";
    $("#playerSpreadsheet").value ||= saved.spreadsheet || saved.spreadsheetId || "";
    $("#playerTeamCode").value ||= saved.teamCode || "";
  } else {
    updateConnectionPill(false);
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function saveLocalGameInfo(mode, connection, extra = {}) {
  writeStorage(STORAGE_KEYS[mode], { ...connection, ...extra });
}

function buildCommonJoinUrl(apiUrl, spreadsheetId) {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("mode", "player");
  url.searchParams.set("api", apiUrl);
  url.searchParams.set("game", spreadsheetId);
  return url.toString();
}

function renderCommonJoinQr(settings) {
  const panel = $("#commonQrPanel");
  const container = $("#commonQrCode");
  const connection = getAdminConnection();
  if (!validateApiUrl(connection.apiUrl) || !settings.spreadsheetId) {
    panel.hidden = true;
    appState.commonJoinUrl = "";
    return;
  }

  const joinUrl = buildCommonJoinUrl(connection.apiUrl, settings.spreadsheetId);
  appState.commonJoinUrl = joinUrl;
  panel.hidden = false;
  if (container.dataset.joinUrl === joinUrl) return;
  container.dataset.joinUrl = joinUrl;
  container.innerHTML = "";

  if (typeof QRCode !== "function") {
    container.innerHTML = '<p class="empty-state">QR 생성기를 불러오지 못했습니다.<br />접속 링크 복사를 사용하세요.</p>';
    return;
  }
  new QRCode(container, {
    text: joinUrl,
    width: 188,
    height: 188,
    colorDark: "#17202a",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.M,
  });
}

async function copyCommonJoinLink() {
  if (!appState.commonJoinUrl) {
    showMessage("게임을 먼저 생성하거나 불러와 주세요.", "info");
    return;
  }
  try {
    await copyTextToClipboard(appState.commonJoinUrl);
    showMessage("공통 접속 링크를 복사했습니다.", "success");
  } catch (error) {
    showMessage(error.message, "error");
  }
}

function applySharedJoinParameters() {
  const parameters = new URLSearchParams(window.location.search);
  if (parameters.get("mode") !== "player") return false;
  const apiUrl = parameters.get("api") || "";
  const game = parameters.get("game") || "";
  if (!validateApiUrl(apiUrl) || !game) return false;
  $("#playerApiUrl").value = apiUrl;
  $("#playerSpreadsheet").value = game;
  $("#playerTeamCode").value = "";
  $("#playerConnectionFields").hidden = true;
  $("#qrJoinNotice").hidden = false;
  switchMode("player");
  window.setTimeout(() => $("#playerTeamCode").focus(), 0);
  return true;
}

function showManualConnectionFields() {
  $("#playerConnectionFields").hidden = false;
  $("#qrJoinNotice").hidden = true;
  $("#playerApiUrl").focus();
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("브라우저가 클립보드 복사를 허용하지 않았습니다.");
}

async function copyAppsScriptCode() {
  const button = $("#copyAppsScriptButton");
  const originalText = "코드 전체 복사";
  try {
    button.disabled = true;
    button.textContent = "코드 불러오는 중...";
    const response = await fetch(`./Code.gs?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Apps Script 코드 파일을 불러오지 못했습니다.");
    const code = await response.text();
    if (!code.includes("function doGet") || !code.includes("function createGame")) {
      throw new Error("코드 파일의 내용을 확인할 수 없습니다.");
    }
    await copyTextToClipboard(code);
    button.textContent = "복사 완료";
    button.classList.add("copied");
    showMessage("Apps Script 전체 코드를 복사했습니다.", "success");
    window.setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove("copied");
    }, 3500);
  } catch (error) {
    button.textContent = originalText;
    button.classList.remove("copied");
    showMessage(error.message, "error");
  } finally {
    button.disabled = false;
  }
}

function countChoices(items = []) {
  const counts = { A: 0, B: 0, C: 0 };
  items.forEach((choice) => {
    if (PRICES.includes(choice)) counts[choice] += 1;
  });
  return counts;
}

function comboFromCounts(counts) {
  return "A".repeat(counts.A || 0) + "B".repeat(counts.B || 0) + "C".repeat(counts.C || 0);
}

function generateCountRows(teamCount) {
  const rows = [];
  for (let a = teamCount; a >= 0; a -= 1) {
    for (let b = teamCount - a; b >= 0; b -= 1) {
      const c = teamCount - a - b;
      rows.push({ A: a, B: b, C: c });
    }
  }
  return rows;
}

function generatedProfit(teamCount, counts, price) {
  const same = counts[price] || 0;
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

  const raw = config.base
    + config.lowerBonus * lowerShare
    - config.higherPenalty * higherShare
    - config.crowdPenalty * crowd
    + config.scarcityBonus * scarcity;

  return Math.max(-120, Math.min(180, Math.round(raw / 2) * 2));
}

function generatePayoffRows(teamCount) {
  if (Number(teamCount) === 3) {
    return ORIGINAL_THREE_TEAM_PAYOFFS.map((row) => ({
      combo: row.combo,
      counts: countChoices(row.combo.split("")),
      profits: { ...row.profits },
      source: "original",
    }));
  }

  return generateCountRows(Number(teamCount)).map((counts) => {
    const profits = {};
    PRICES.forEach((price) => {
      const profit = generatedProfit(Number(teamCount), counts, price);
      if (profit !== null) profits[price] = profit;
    });
    return {
      combo: comboFromCounts(counts),
      counts,
      profits,
      source: "generated",
    };
  });
}

function profitForChoice(teamCount, counts, choice) {
  const row = generatePayoffRows(Number(teamCount)).find((item) => item.combo === comboFromCounts(counts));
  return row?.profits?.[choice] ?? null;
}

function getTeamChoiceCounts(team) {
  return {
    A: Number(team.choiceCounts?.A || 0),
    B: Number(team.choiceCounts?.B || 0),
    C: Number(team.choiceCounts?.C || 0),
  };
}

function canChoosePrice(team, settings, price) {
  if (!team || settings.status !== "playing") return false;
  const counts = getTeamChoiceCounts(team);
  counts[price] += 1;
  const remainingAfterThisRound = ROUND_COUNT - Number(settings.currentRound);
  if (counts.C > MAX_C) return false;
  if (counts.A + remainingAfterThisRound < MIN_A) return false;
  return true;
}

function constraintText(team, currentRound = 1) {
  const counts = getTeamChoiceCounts(team);
  const remaining = Math.max(0, ROUND_COUNT - Number(currentRound) + 1);
  const aNeed = Math.max(0, MIN_A - counts.A);
  const cLeft = Math.max(0, MAX_C - counts.C);
  return {
    a: `A ${counts.A}/${MIN_A}${aNeed ? ` · ${aNeed}회 필요` : " · 충족"}`,
    c: `C ${counts.C}/${MAX_C}${cLeft ? ` · ${cLeft}회 가능` : " · 마감"}`,
    aRisk: counts.A + remaining < MIN_A,
    cRisk: counts.C > MAX_C,
  };
}

async function createGame() {
  try {
    const connection = getAdminConnection();
    const teamCount = getAdminTeamCount();
    assertConnection(connection);
    if (!window.confirm(`${teamCount}팀 모드로 새 게임을 생성할까요?\n\n시트의 이전 게임 기록과 참여 코드는 초기화됩니다.`)) return;
    stopPolling();
    setLoading(true, "새 게임을 만들고 있습니다...");
    const state = await requestJsonp(connection.apiUrl, "createGame", { spreadsheetUrl: connection.spreadsheet, teamCount });
    appState.admin = state;
    saveLocalGameInfo("admin", connection, { spreadsheetId: state.settings.spreadsheetId });
    $("#adminTeamCount").value = state.settings.teamCount;
    renderAdminBoard(state);
    updateConnectionPill(true);
    startPolling("admin");
    showMessage(`${state.settings.teamCount}팀 모드 게임을 만들었습니다.`, "success");
  } catch (error) {
    showMessage(error.message, "error");
    if (appState.admin) startPolling("admin");
  } finally {
    setLoading(false);
  }
}

async function startGame() {
  try {
    const connection = getAdminConnection();
    assertConnection(connection);
    setLoading(true, "1월을 시작하고 있습니다...");
    const state = await requestJsonp(connection.apiUrl, "startGame", { spreadsheetId: connection.spreadsheetId });
    appState.admin = state;
    renderAdminBoard(state);
    startPolling("admin");
    showMessage("게임을 시작했습니다.", "success");
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    setLoading(false);
  }
}

async function loadAdminState(options = {}) {
  try {
    const saved = readStorage(STORAGE_KEYS.admin);
    const connection = getAdminConnection();
    if (!connection.spreadsheetId && saved.spreadsheetId) connection.spreadsheetId = saved.spreadsheetId;
    assertConnection(connection);
    if (!options.silent) setLoading(true, "최신 상태를 불러오고 있습니다...");
    const state = await requestJsonp(connection.apiUrl, "getGameState", { spreadsheetId: connection.spreadsheetId });
    appState.admin = state;
    saveLocalGameInfo("admin", connection, { spreadsheetId: state.settings.spreadsheetId });
    $("#adminTeamCount").value = state.settings.teamCount;
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

async function adminSubmitChoice(round, teamId) {
  if (!appState.admin || appState.busy) return;
  const { settings, teams = [], submissions = [] } = appState.admin;
  if (settings.status !== "playing" || Number(round) !== Number(settings.currentRound)) {
    showMessage("현재 진행 중인 월에만 직접 입력할 수 있습니다.", "info");
    return;
  }
  const team = teams.find((item) => Number(item.teamId) === Number(teamId));
  if (!team) return;
  const alreadySubmitted = submissions.some((item) => Number(item.round) === Number(round) && Number(item.teamId) === Number(teamId));
  if (alreadySubmitted) {
    showMessage(`${team.teamName}은 이미 이번 월에 제출했습니다.`, "info");
    return;
  }
  const available = PRICES.filter((price) => canChoosePrice(team, settings, price));
  if (!available.length) {
    showMessage(`${team.teamName}이 선택할 수 있는 가격이 없습니다. 제약 조건을 확인해 주세요.`, "error");
    return;
  }
  const input = window.prompt(`${team.teamName}의 가격을 입력하세요.\n가능한 가격: ${available.join(", ")}`, available[0]);
  if (input === null) return;
  const choice = String(input).trim().toUpperCase();
  if (!available.includes(choice)) {
    showMessage(`가능한 가격 중 하나를 입력해 주세요: ${available.join(", ")}`, "error");
    return;
  }
  if (!window.confirm(`${team.teamName}을 ${choice}로 제출할까요? 제출 후에는 바꿀 수 없습니다.`)) return;

  try {
    const connection = getAdminConnection();
    assertConnection(connection);
    setLoading(true, `${team.teamName}의 가격을 제출하고 있습니다...`);
    const state = await requestJsonp(connection.apiUrl, "adminSubmitChoice", { spreadsheetId: connection.spreadsheetId, teamId, round, choice });
    appState.admin = state;
    renderAdminBoard(state);
    showMessage(`${team.teamName}의 가격을 제출했습니다.`, "success");
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    setLoading(false);
  }
}

async function revealAllCurrentRound() {
  if (!appState.admin) return;
  const { settings, submissions = [] } = appState.admin;
  const currentSubmissions = submissions.filter((item) => Number(item.round) === Number(settings.currentRound));
  if (currentSubmissions.length < settings.teamCount) {
    showMessage(`아직 ${settings.teamCount - currentSubmissions.length}팀이 제출하지 않았습니다.`, "info");
    return;
  }
  try {
    const connection = getAdminConnection();
    setLoading(true, "선택을 공개하고 점수를 계산합니다...");
    const state = await requestJsonp(connection.apiUrl, "revealAllCurrentRound", { spreadsheetId: connection.spreadsheetId });
    appState.admin = state;
    renderAdminBoard(state);
    showMessage("현재 월의 결과를 공개했습니다.", "success");
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
    setLoading(true, "다음 월로 이동하고 있습니다...");
    const state = await requestJsonp(connection.apiUrl, "nextRound", { spreadsheetId: connection.spreadsheetId });
    appState.admin = state;
    renderAdminBoard(state);
    showMessage(state.settings.status === "finished" ? "게임이 종료되었습니다." : `${state.settings.currentRound}월을 시작합니다.`, "success");
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    setLoading(false);
  }
}

async function resetGame() {
  if (!appState.admin || !window.confirm("모든 제출과 점수가 지워지고 새 참여 코드가 만들어집니다. 초기화할까요?")) return;
  try {
    const connection = getAdminConnection();
    setLoading(true, "게임을 초기화하고 있습니다...");
    const state = await requestJsonp(connection.apiUrl, "resetGame", { spreadsheetId: connection.spreadsheetId });
    appState.admin = state;
    renderAdminBoard(state);
    showMessage("게임을 초기화했습니다.", "success");
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
  $("#adminRoundBadge").innerHTML = `<small>현재 월</small><strong>${isCreated ? "준비 중" : isFinished ? "종료" : `${settings.currentRound} / ${ROUND_COUNT}`}</strong>`;
  $("#teamCodesPanel").hidden = false;
  $("#adminGamePanel").hidden = isCreated;
  $("#adminSummaryPanel").hidden = isCreated;
  $("#payoffPanel").hidden = false;
  $("#startGameButton").hidden = !isCreated;
  $("#gameIdDisplay").textContent = settings.gameId;
  renderCommonJoinQr(settings);
  renderPayoffTable(settings.teamCount, state.payoffRows || generatePayoffRows(settings.teamCount));

  $("#teamCodeGrid").innerHTML = teams.map((team) => `<article class="team-code-card"><small>${escapeHtml(team.teamName)}</small><strong>${escapeHtml(team.teamCode)}</strong></article>`).join("");
  if (isCreated) return;

  $("#roundProgress").innerHTML = Array.from({ length: ROUND_COUNT }, (_, index) => {
    const round = index + 1;
    const klass = round < settings.currentRound || isFinished ? "done" : round === settings.currentRound ? "current" : "";
    return `<span class="progress-step ${klass}" title="${round}월"></span>`;
  }).join("");

  $("#adminBoardHead").innerHTML = `<tr><th scope="col">월</th>${teams.map((team) => `<th scope="col">${escapeHtml(team.teamName)}</th>`).join("")}<th scope="col">결과</th></tr>`;
  $(".game-board").style.minWidth = `${Math.max(820, 140 + teams.length * 118)}px`;
  const leaderScore = Math.max(...teams.map((team) => Number(team.scoreTotal || 0)));

  const roundRows = Array.from({ length: ROUND_COUNT }, (_, index) => {
    const round = index + 1;
    const result = roundResults.find((item) => Number(item.round) === round);
    const rowClass = round === Number(settings.currentRound) && !isFinished ? "current-round" : round < Number(settings.currentRound) || isFinished ? "past-round" : "";
    const cells = teams.map((team) => {
      const submission = submissions.find((item) => Number(item.round) === round && Number(item.teamId) === Number(team.teamId));
      if (!submission) {
        const canEnter = !isFinished && round === Number(settings.currentRound);
        return canEnter
          ? `<td><button class="cell-button admin-entry" type="button" onclick="adminSubmitChoice(${round}, ${team.teamId})">직접 입력</button></td>`
          : `<td><button class="cell-button pending" type="button" disabled>미제출</button></td>`;
      }
      if (!submission.isRevealed) return `<td><button class="cell-button submitted" type="button" disabled>제출 완료</button></td>`;
      const profit = result?.profitsByTeam?.[String(team.teamId)];
      const profitClass = Number(profit) >= 0 ? "positive" : "negative";
      return `<td><div class="revealed-choice"><strong>${escapeHtml(submission.choice)}</strong><small class="${profitClass}">${formatNumber(profit)}</small></div></td>`;
    }).join("");
    const resultText = result ? `<strong>${escapeHtml(result.combo)}</strong><small>${escapeHtml(result.resultText)}</small>` : round === settings.currentRound && !isFinished ? "진행 중" : "";
    return `<tr class="${rowClass}"><th class="round-label" scope="row"><strong>${round}월</strong></th>${cells}<td class="result-cell">${resultText || "-"}</td></tr>`;
  }).join("");

  const scoreRow = `<tr class="score-total-row"><th scope="row"><strong>합계</strong></th>${teams.map((team) => `
    <td class="score-total-cell ${Number(team.scoreTotal || 0) === leaderScore ? "winner" : ""}">
      <strong>${formatNumber(team.scoreTotal)}</strong>
      <small>${formatCounts(team.choiceCounts)}</small>
    </td>
  `).join("")}<td>${isFinished ? "최종 결과" : "실시간"}</td></tr>`;
  $("#adminBoardBody").innerHTML = roundRows + scoreRow;

  const currentSubmissions = submissions.filter((item) => Number(item.round) === Number(settings.currentRound));
  const currentResult = roundResults.find((item) => Number(item.round) === Number(settings.currentRound));
  $("#submissionCount").textContent = `${currentSubmissions.length} / ${settings.teamCount}팀 제출`;
  $("#roundHint").textContent = isFinished
    ? "모든 월이 종료되었습니다."
    : currentResult
      ? "결과 계산이 끝났습니다. 다음 월로 이동하세요."
      : currentSubmissions.length === settings.teamCount
        ? "모든 팀이 제출했습니다. 전체 공개를 누르세요."
        : "미제출 팀은 직접 입력할 수 있습니다.";
  $("#revealAllButton").disabled = isFinished || Boolean(currentResult) || currentSubmissions.length < settings.teamCount;
  $("#nextRoundButton").disabled = isFinished;
  $("#nextRoundButton").textContent = Number(settings.currentRound) === ROUND_COUNT ? "최종 결과 보기" : "다음 월로";

  $("#teamStatusList").innerHTML = teams.map((team) => {
    const text = constraintText(team, settings.currentRound);
    return `<div class="team-status-item">
      <strong>${escapeHtml(team.teamName)}</strong>
      <div class="constraint-mini"><span>${text.a}</span><span>${text.c}</span></div>
      <div class="score-box"><strong>${formatNumber(team.scoreTotal)}</strong><small>점</small></div>
    </div>`;
  }).join("");
  renderRoundResult(roundResults);
  if (isFinished) renderFinalRanking(ranking, "#roundResultList", true);
}

function renderRoundResult(results = []) {
  const container = $("#roundResultList");
  if (!results.length) {
    container.innerHTML = '<p class="empty-state">공개된 월의 결과가 여기에 표시됩니다.</p>';
    return;
  }
  container.innerHTML = [...results].reverse().map((result) => `<article class="result-item"><strong>${result.round}월 · ${escapeHtml(result.combo)}</strong><p>${escapeHtml(result.resultText)}</p></article>`).join("");
}

function renderPayoffTable(teamCount, rows = generatePayoffRows(teamCount)) {
  $("#payoffTitle").textContent = `${teamCount}팀 점수표`;
  $("#payoffSourceChip").textContent = teamCount === 3 ? "3팀은 원본 표 사용" : `${teamCount}팀은 자동 생성 표`;
  $("#payoffTable").innerHTML = `
    <thead>
      <tr><th>가격 조합</th><th>A 수</th><th>B 수</th><th>C 수</th><th>A 이익</th><th>B 이익</th><th>C 이익</th></tr>
    </thead>
    <tbody>
      ${rows.map((row) => `
        <tr>
          <td>${escapeHtml(row.combo)}</td>
          <td>${row.counts.A}</td>
          <td>${row.counts.B}</td>
          <td>${row.counts.C}</td>
          ${PRICES.map((price) => `<td class="profit-cell ${Number(row.profits?.[price]) < 0 ? "negative" : ""}">${row.profits?.[price] === undefined ? "-" : formatNumber(row.profits[price])}</td>`).join("")}
        </tr>
      `).join("")}
    </tbody>
  `;
}

async function joinGame() {
  try {
    const connection = getPlayerConnection();
    assertConnection(connection, true);
    setLoading(true, "팀 정보를 확인하고 있습니다...");
    const state = await requestJsonp(connection.apiUrl, "joinGame", { spreadsheetId: connection.spreadsheetId, teamCode: connection.teamCode });
    appState.player = state;
    appState.selectedChoice = "";
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
    if (!options.silent) setLoading(true, "게임 상태를 확인하고 있습니다...");
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

function selectChoice(choice) {
  if (!appState.player || appState.player.ownSubmission || appState.player.settings.status !== "playing") return;
  if (!canChoosePrice(appState.player.team, appState.player.settings, choice)) return;
  appState.selectedChoice = choice;
  renderPlayerBoard(appState.player);
}

async function submitChoice() {
  if (!appState.player || !appState.selectedChoice) {
    showMessage("먼저 제출할 가격을 골라 주세요.", "info");
    return;
  }
  const choice = appState.selectedChoice;
  if (!window.confirm(`${choice} 가격으로 제출할까요? 제출 후에는 바꿀 수 없습니다.`)) return;
  try {
    const connection = getPlayerConnection();
    assertConnection(connection, true);
    setLoading(true, `${choice} 가격을 제출하고 있습니다...`);
    const state = await requestJsonp(connection.apiUrl, "submitChoice", {
      spreadsheetId: connection.spreadsheetId,
      teamCode: connection.teamCode,
      round: appState.player.settings.currentRound,
      choice,
    });
    appState.player = state;
    appState.selectedChoice = "";
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
  $("#playerRoundBadge").innerHTML = `<small>현재 월</small><strong>${isCreated ? "준비 중" : isFinished ? "종료" : `${settings.currentRound} / ${ROUND_COUNT}`}</strong>`;
  $("#playerScoreChip").textContent = `현재 ${formatNumber(team.scoreTotal)}점`;

  const status = $("#playerStatusMessage");
  status.className = `player-status ${isCreated || ownSubmission ? "waiting" : isFinished ? "finished" : ""}`;
  status.innerHTML = `<span class="pulse-dot"></span><strong>${isCreated ? "선생님이 게임을 시작할 때까지 기다려 주세요." : isFinished ? "게임이 종료되었습니다. 최종 결과를 확인하세요." : ownSubmission ? `${settings.currentRound}월 제출 완료 · 다음 안내를 기다려 주세요.` : `${settings.currentRound}월 · 가격을 하나 골라 주세요.`}</strong>`;

  $("#playerPriceGrid").innerHTML = PRICES.map((price) => {
    const selected = appState.selectedChoice === price;
    const disabled = Boolean(ownSubmission) || settings.status !== "playing" || !canChoosePrice(team, settings, price);
    return `<button class="player-price-button ${selected ? "selected" : ""}" data-price="${price}" type="button" onclick="selectChoice('${price}')" ${disabled ? "disabled" : ""} aria-pressed="${selected}">
      <strong>${price}</strong><small>${PRICE_INFO[price].detail}</small>
    </button>`;
  }).join("");
  $("#selectedChoiceDisplay").textContent = ownSubmission ? ownSubmission.choice : appState.selectedChoice || "-";
  $("#submitChoiceButton").disabled = !appState.selectedChoice || Boolean(ownSubmission) || settings.status !== "playing";
  $("#submitChoiceButton").textContent = ownSubmission ? "제출 완료" : appState.selectedChoice ? `${appState.selectedChoice} 제출하기` : "가격을 선택하세요";
  renderPlayerConstraints(team, settings.currentRound);
  $("#playerFinalPanel").hidden = !isFinished;
  if (isFinished) renderFinalRanking(ranking, "#playerFinalRanking");
}

function renderPlayerConstraints(team, currentRound) {
  const counts = getTeamChoiceCounts(team);
  const aProgress = Math.min(100, (counts.A / MIN_A) * 100);
  const cProgress = Math.min(100, (counts.C / MAX_C) * 100);
  const text = constraintText(team, currentRound);
  $("#playerConstraintBars").innerHTML = `
    <div class="constraint-line ${text.aRisk ? "is-bad" : ""}">
      <span>${text.a}</span>
      <div class="bar"><i style="--progress:${aProgress}%"></i></div>
    </div>
    <div class="constraint-line ${text.cRisk ? "is-bad" : ""}">
      <span>${text.c}</span>
      <div class="bar"><i style="--progress:${cProgress}%"></i></div>
    </div>
    <div class="choice-counts">
      <span>A ${counts.A}</span><span>B ${counts.B}</span><span>C ${counts.C}</span>
    </div>
  `;
}

function renderFinalRanking(ranking, targetSelector, compact = false) {
  const winners = ranking.filter((item) => Number(item.rank) === 1);
  const winnerText = winners.length > 1 ? `공동 우승 · ${winners.map((item) => item.teamName).join(", ")}` : `${winners[0]?.teamName || "-"} 우승`;
  $(targetSelector).innerHTML = `<div class="final-heading"><span class="trophy">★</span><h3>최종 결과</h3><p>${escapeHtml(winnerText)}</p></div><div class="ranking-list ${compact ? "compact" : ""}">${ranking.map((item) => `<article class="ranking-item ${Number(item.rank) === 1 ? "winner" : ""}"><span class="rank-number">${item.rank}위</span><div class="ranking-team"><strong>${escapeHtml(item.teamName)}</strong><small>${formatCounts(item.choiceCounts)}</small></div><span class="ranking-score">${formatNumber(item.scoreTotal)}</span></article>`).join("")}</div>`;
}

function leavePlayerGame() {
  stopPolling();
  appState.player = null;
  appState.selectedChoice = "";
  localStorage.removeItem(STORAGE_KEYS.player);
  $("#playerJoinPanel").hidden = false;
  $("#playerGamePanel").hidden = true;
  $("#playerApiUrl").value = "";
  $("#playerSpreadsheet").value = "";
  $("#playerTeamCode").value = "";
  $("#playerConnectionFields").hidden = false;
  $("#qrJoinNotice").hidden = true;
  const cleanUrl = new URL(window.location.href);
  cleanUrl.search = "";
  cleanUrl.hash = "";
  window.history.replaceState({}, "", cleanUrl);
  $("#playerRoundBadge").innerHTML = "<small>현재 월</small><strong>접속 전</strong>";
  updateConnectionPill(false);
}

function downloadAdminCsv() {
  if (!appState.admin) return;
  const { settings, teams = [], submissions = [], roundResults = [] } = appState.admin;
  const header = ["월", "결과"];
  teams.forEach((team) => header.push(`${team.teamName} 가격`, `${team.teamName} 이익`));
  const rows = Array.from({ length: ROUND_COUNT }, (_, index) => {
    const round = index + 1;
    const result = roundResults.find((item) => Number(item.round) === round);
    const row = [round, result?.combo || ""];
    teams.forEach((team) => {
      const submission = submissions.find((item) => Number(item.round) === round && Number(item.teamId) === Number(team.teamId));
      row.push(submission?.isRevealed ? submission.choice : "", result?.profitsByTeam?.[String(team.teamId)] ?? "");
    });
    return row;
  });
  const totals = ["합계", ""];
  teams.forEach((team) => totals.push("", team.scoreTotal));
  const csv = [header, ...rows, totals]
    .map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `독점보드게임_${settings.teamCount}팀_결과.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function printResults() {
  window.print();
}

function formatCounts(counts = {}) {
  return `A ${Number(counts.A || 0)} · B ${Number(counts.B || 0)} · C ${Number(counts.C || 0)}`;
}

function formatNumber(value) {
  if (value === "" || value === null || value === undefined || Number.isNaN(Number(value))) return "";
  return new Intl.NumberFormat("ko-KR").format(Number(value));
}

document.addEventListener("DOMContentLoaded", () => {
  const admin = readStorage(STORAGE_KEYS.admin);
  const player = readStorage(STORAGE_KEYS.player);
  $("#adminApiUrl").value = admin.apiUrl || "";
  $("#adminSpreadsheet").value = admin.spreadsheet || admin.spreadsheetId || "";
  $("#playerApiUrl").value = player.apiUrl || "";
  $("#playerSpreadsheet").value = player.spreadsheet || player.spreadsheetId || "";
  $("#playerTeamCode").value = player.teamCode || "";
  $("#playerTeamCode").addEventListener("input", (event) => {
    event.target.value = event.target.value.replace(/\D/g, "").slice(0, 4);
  });
  $("#adminTeamCount").addEventListener("change", () => {
    if (appState.mode === "admin" && !appState.admin) renderPayoffPreview();
  });
  applySharedJoinParameters();
});
