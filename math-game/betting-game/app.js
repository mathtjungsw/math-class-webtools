const STORAGE_KEYS = { admin: "bettingGame.rooms.firebase.v1", player: "bettingGame.seat.firebase.v2" };
const MIN_GAME_SIZE = 2;
const MAX_GAME_SIZE = 20;
const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_ID = /^[A-HJ-NP-Z2-9]{10}$/;
const TEAM_CODE = /^(?:\d{6}|\d{8})$/;
const appState = { mode: "home", admin: null, player: null, selectedNumber: null, commonJoinUrl: "", busy: false, session: null };
const $ = (selector) => document.querySelector(selector);
const localMemory = new Map();
let sdk;
let nativeBoardFullscreen = false;
let enteringBoardFullscreen = false;

function firebase() {
  return sdk ||= import("./firebase-client.js?v=4").catch((error) => {
    sdk = null;
    throw new Error("Firebase 기능을 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.", { cause: error });
  });
}

function readStorage(key) {
  try { return localMemory.get(key) ?? JSON.parse(localStorage.getItem(key) || "null"); }
  catch { return localMemory.get(key) ?? null; }
}

function saveStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    localMemory.delete(key);
    return true;
  } catch {
    localMemory.set(key, value);
    return false;
  }
}

function recentRoomHistory() {
  const entries = readStorage(STORAGE_KEYS.admin);
  return Array.isArray(entries) ? entries.filter((entry) => ROOM_ID.test(entry?.roomId)) : [];
}

function rememberRoom(entry) {
  const previous = recentRoomHistory();
  const prior = previous.find((item) => item.roomId === entry.roomId);
  return saveStorage(STORAGE_KEYS.admin, [{ ...prior, ...entry }, ...previous.filter((item) => item.roomId !== entry.roomId)].slice(0, 30));
}

function renderHistory() {
  const rooms = recentRoomHistory();
  $("#recentRooms").innerHTML = rooms.length ? rooms.map((entry) =>
    `<li><button class="button secondary compact" type="button" data-room="${entry.roomId}">${entry.pending ? "다시 연결" : "이어하기"}</button><div><strong>${escapeHtml(entry.name || "배팅 게임")}</strong><small>${entry.roomId} · ${entry.pending ? "생성 확인 전" : `${Number(entry.teamCount)}팀 · ${Number(entry.roundCount)}라운드`}</small></div></li>`
  ).join("") : '<li class="empty-state">이 브라우저에 저장된 게임이 없습니다.</li>';
}

function setRoute(mode, roomId) {
  const url = new URL(window.location.href);
  url.search = "";
  if (mode !== "home") url.searchParams.set("mode", mode);
  if (roomId) url.searchParams.set("game", roomId);
  url.hash = "";
  window.history.replaceState(null, "", url);
}

function buildCommonJoinUrl(roomId) {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("mode", "player");
  url.searchParams.set("game", roomId);
  return url.toString();
}

function gameCredentials() {
  const roomId = Array.from(crypto.getRandomValues(new Uint8Array(10)), (value) => ROOM_ALPHABET[value & 31]).join("");
  const key = crypto.getRandomValues(new Uint8Array(24));
  const recoveryKey = btoa(String.fromCharCode(...key)).replaceAll("+", "-").replaceAll("/", "_");
  return { roomId, recoveryKey };
}


function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getAdminGameSize() {
  const teamCount = Number($("#adminTeamCount").value);
  const roundCount = Number($("#adminRoundCount").value);
  if (!Number.isInteger(teamCount) || teamCount < MIN_GAME_SIZE || teamCount > MAX_GAME_SIZE) {
    throw new Error(`팀 수는 ${MIN_GAME_SIZE}부터 ${MAX_GAME_SIZE} 사이의 정수로 입력해 주세요.`);
  }
  if (!Number.isInteger(roundCount) || roundCount < MIN_GAME_SIZE || roundCount > MAX_GAME_SIZE) {
    throw new Error(`라운드 수는 ${MIN_GAME_SIZE}부터 ${MAX_GAME_SIZE} 사이의 정수로 입력해 주세요.`);
  }
  return { teamCount, roundCount };
}

function syncAdminGameSize(settings, force = false) {
  const teamInput = $("#adminTeamCount");
  const roundInput = $("#adminRoundCount");
  if (force || teamInput.dataset.dirty !== "true") teamInput.value = settings.teamCount;
  if (force || roundInput.dataset.dirty !== "true") roundInput.value = settings.roundCount;
  if (force) {
    teamInput.dataset.dirty = "false";
    roundInput.dataset.dirty = "false";
  }
}

function createNumberRange(count) {
  return Array.from({ length: Number(count) }, (_, index) => index + 1);
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
  if (!copied) throw new Error("클립보드 복사를 허용하지 않는 브라우저입니다.");
}


function renderCommonJoinQr(settings) {
  const panel = $("#commonQrPanel");
  const container = $("#commonQrCode");
  const joinUrl = buildCommonJoinUrl(settings.gameId);
  appState.commonJoinUrl = joinUrl;
  panel.hidden = false;
  if (container.dataset.joinUrl === joinUrl) return;
  container.dataset.joinUrl = joinUrl;
  container.innerHTML = "";

  if (typeof QRCode !== "function") {
    container.innerHTML = '<p class="empty-state">QR 생성기를 불러오지 못했습니다.<br />접속 링크 복사를 이용하세요.</p>';
    return;
  }
  new QRCode(container, {
    text: joinUrl,
    width: 188,
    height: 188,
    colorDark: "#17322e",
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

function stopSession() {
  const session = appState.session;
  appState.session = null;
  if (session) for (const unsubscribe of session.stops) unsubscribe();
  updateConnectionPill(false);
}

function setBoardFullscreen(active) {
  document.body.classList.toggle("board-fullscreen", active);
  $("#boardFullscreenButton").setAttribute("aria-pressed", String(active));
  $("#boardFullscreenLabel").textContent = active ? "전체화면 닫기" : "전체화면";
}

async function closeBoardFullscreen() {
  if (!document.body.classList.contains("board-fullscreen")) return;
  const wasNative = nativeBoardFullscreen;
  nativeBoardFullscreen = false;
  setBoardFullscreen(false);
  if (wasNative && document.fullscreenElement === document.documentElement) {
    try { await document.exitFullscreen(); } catch { /* The board layout is already restored. */ }
  }
}

async function toggleBoardFullscreen() {
  if (document.body.classList.contains("board-fullscreen")) return closeBoardFullscreen();
  if (enteringBoardFullscreen || appState.mode !== "admin" || $("#adminBoardLayout").hidden) return;

  // The same two-panel layout remains available where the browser blocks native fullscreen.
  setBoardFullscreen(true);
  const root = document.documentElement;
  if (!root.requestFullscreen || document.fullscreenElement) return;
  enteringBoardFullscreen = true;
  try {
    await root.requestFullscreen();
    nativeBoardFullscreen = document.fullscreenElement === root;
    if (nativeBoardFullscreen && !document.body.classList.contains("board-fullscreen")) {
      await document.exitFullscreen();
      nativeBoardFullscreen = false;
    }
  } catch { /* Keep the in-page full-window layout. */ }
  finally { enteringBoardFullscreen = false; }
}

function switchMode(mode, keepRoute = false) {
  if (appState.busy) return;
  void closeBoardFullscreen();
  stopSession();
  appState.mode = mode;
  appState.admin = appState.player = appState.selectedNumber = null;
  appState.commonJoinUrl = "";
  $("#adminSetupStatus").textContent = "게임 선택 전";
  $("#adminSetupStatus").classList.remove("ready");
  $("#adminRoundBadge").innerHTML = "<small>현재 라운드</small><strong>준비 중</strong>";
  $("#playerRoundBadge").innerHTML = "<small>현재 라운드</small><strong>접속 전</strong>";
  for (const id of ["teamCodesPanel", "adminBoardLayout", "playerGamePanel", "recoveryPanel"]) $(`#${id}`).hidden = true;
  $("#playerJoinPanel").hidden = false;
  const saved = readStorage(STORAGE_KEYS.player);
  $("#playerRoomId").value = saved?.roomId || "";
  $("#playerTeamCode").value = "";
  $("#modeSelection").hidden = mode !== "home";
  $("#adminScreen").hidden = mode !== "admin";
  $("#playerScreen").hidden = mode !== "player";
  $("#playerConnectionFields").hidden = false;
  $("#qrJoinNotice").hidden = true;
  if (mode === "admin") renderHistory();
  if (!keepRoute) setRoute(mode);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function cleanError(error) {
  const kind = String(error.code || "").split("/").at(-1);
  if (["unavailable", "deadline-exceeded", "network-request-failed"].includes(kind)) {
    return "서버 응답을 확인하지 못했습니다. 인터넷 연결과 게임의 최신 상태를 확인해 주세요.";
  }
  if (kind === "operation-not-allowed") return "Firebase에서 익명 로그인이 아직 활성화되지 않았습니다.";
  if (kind === "permission-denied" && error.name === "FirebaseError") {
    return "이 브라우저에 접근 권한이 없습니다. 관리자 복구 코드 또는 참가 팀 코드를 다시 입력해 주세요.";
  }
  if (kind === "internal" && error.message === "internal") return "Firebase 서버에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.";
  return error.message || "요청을 처리하지 못했습니다.";
}

async function runBusy(message, work) {
  if (appState.busy) return;
  setLoading(true, message);
  try { await work(); }
  catch (error) { showMessage(cleanError(error), "error"); }
  finally { setLoading(false); }
}

function beginSession(mode, roomId, extra = {}) {
  stopSession();
  const session = { mode, roomId, stops: new Set(), ...extra };
  appState.session = session;
  return session;
}

async function watch(session, view, update) {
  const api = await firebase();
  return new Promise((resolve, reject) => {
    let ready = false;
    let unsubscribe;
    let missedUnsubscribe = false;
    const cancel = () => {
      clearTimeout(timer);
      if (unsubscribe) unsubscribe();
      else missedUnsubscribe = true;
      if (!ready) reject(new Error("게임 연결이 종료되었습니다."));
    };
    const fail = (error) => {
      clearTimeout(timer);
      if (appState.session !== session) return;
      if (!ready) {
        reject(error);
      } else {
        stopSession();
        if (session.mode === "player") {
          appState.player = appState.selectedNumber = null;
          saveStorage(STORAGE_KEYS.player, null);
          $("#playerJoinPanel").hidden = false;
          $("#playerGamePanel").hidden = true;
          $("#playerTeamCode").focus();
        } else {
          appState.admin = null;
          void closeBoardFullscreen();
          for (const id of ["teamCodesPanel", "adminBoardLayout", "recoveryPanel"]) $(`#${id}`).hidden = true;
          $("#adminSetupStatus").textContent = "연결 끊김";
        }
        showMessage(cleanError(error), "error");
      }
    };
    const timer = setTimeout(() => fail(new Error("서버 응답이 늦습니다. 연결을 확인하고 다시 열어 주세요.")), 15000);
    session.stops.add(cancel);
    api.watchView(session.roomId, view, (data, live) => {
      if (appState.session !== session) return;
      if (live && data) {
        update(data);
        if (!ready) {
          clearTimeout(timer);
          ready = true;
          resolve();
        }
      }
      session[`live:${view}`] = live;
      updateConnectionPill(session.mode === "admin" ? live : session["live:game"] && session[`live:team-${session.seatId}`]);
    }, fail).then((stop) => {
      unsubscribe = stop;
      if (missedUnsubscribe || appState.session !== session) stop();
    }).catch(fail);
  });
}

async function call(action, data) {
  return (await firebase()).command(action, data);
}

async function openAdmin(roomId, recoveryKey, { forceRecovery = false } = {}) {
  if (!ROOM_ID.test(roomId)) throw new Error("게임 코드를 확인해 주세요.");
  const api = await firebase();
  const attach = async () => {
    const session = beginSession("admin", roomId, { recoveryKey });
    appState.admin = null;
    void closeBoardFullscreen();
    for (const id of ["teamCodesPanel", "adminBoardLayout", "recoveryPanel"]) $(`#${id}`).hidden = true;
    await watch(session, "admin", (state) => {
      appState.admin = state;
      renderAdminBoard(state);
    });
  };
  try {
    if (forceRecovery) await api.command("recover", { roomId, recoveryKey });
    try { await attach(); }
    catch (error) {
      if (forceRecovery || !recoveryKey || error.code !== "permission-denied") throw error;
      await api.command("recover", { roomId, recoveryKey });
      await attach();
    }
  } catch (error) {
    if (appState.session?.roomId === roomId) stopSession();
    throw error;
  }
  const { settings } = appState.admin;
  const stored = rememberRoom({ roomId, ...(recoveryKey ? { recoveryKey } : {}), name: settings.name,
    teamCount: settings.teamCount, roundCount: settings.roundCount, pending: false });
  syncAdminGameSize(settings, true);
  renderHistory();
  $("#recoveryPanel").hidden = !recoveryKey;
  $("#activeRoomName").textContent = settings.name;
  setRoute("admin", roomId);
  if (!stored) showMessage("이 브라우저에 기록을 저장할 수 없습니다. 관리자 복구 코드를 따로 보관하세요.", "info");
}

async function createGame() {
  await runBusy("새 게임을 만들고 있습니다…", async () => {
    const size = getAdminGameSize();
    const name = $("#adminGameName").value.trim() || "배팅 게임";
    const draft = { ...gameCredentials(), ...size, name, pending: true };
    // Save credentials before the request in case the network drops after commit.
    rememberRoom(draft);
    renderHistory();
    await call("create", draft);
    await openAdmin(draft.roomId, draft.recoveryKey);
    showMessage("독립된 새 게임을 만들었습니다. 관리자 복구 코드를 따로 보관하세요.", "success");
  });
}

async function resumeRoom(roomId) {
  await runBusy("저장된 게임을 불러오고 있습니다…", async () => {
    const entry = recentRoomHistory().find((room) => room.roomId === roomId);
    if (entry?.pending) {
      try { await call("create", entry); }
      catch (error) { if (!["already-exists", "permission-denied"].includes(error.code)) throw error; }
    }
    await openAdmin(roomId, entry?.recoveryKey);
    showMessage("저장된 라운드부터 이어서 진행합니다.", "success");
  });
}

async function recoverRoom() {
  await runBusy("관리자 복구 코드를 확인하고 있습니다…", async () => {
    const input = $("#recoveryCode");
    const match = input.value.trim().match(/^([A-HJ-NP-Z2-9]{10})\.([A-Za-z0-9_-]{32})$/);
    if (!match) throw new Error("복사해 둔 관리자 복구 코드 전체를 입력해 주세요.");
    await openAdmin(match[1], match[2], { forceRecovery: true });
    input.value = "";
    showMessage("이 PC에서 게임을 이어갈 수 있습니다.", "success");
  });
}

async function copyRecoveryCode(roomId = appState.session?.roomId) {
  const recoveryKey = recentRoomHistory().find((entry) => entry.roomId === roomId)?.recoveryKey
    || (appState.session?.roomId === roomId ? appState.session.recoveryKey : null);
  if (!roomId || !recoveryKey) return;
  const code = `${roomId}.${recoveryKey}`;
  try {
    await copyTextToClipboard(code);
    showMessage("관리자 복구 코드를 복사했습니다. 학생에게 공유하지 마세요.", "success");
  } catch {
    window.prompt("관리자 복구 코드 — 학생에게 공유하지 마세요.", code);
  }
}

async function loadAdminState() {
  const session = appState.session;
  if (!session || session.mode !== "admin") return;
  await runBusy("최신 게임 상태를 확인하고 있습니다…", async () => {
    const state = await (await firebase()).readView(session.roomId, "admin");
    if (appState.session !== session || state.settings.updatedAt < (appState.admin?.settings.updatedAt || 0)) return;
    appState.admin = state;
    renderAdminBoard(state);
    showMessage("최신 상태를 확인했습니다.", "success");
  });
}

async function adminAction(action, params = {}, message = "게임을 갱신하고 있습니다…", success) {
  if (!appState.admin || !appState.session || appState.busy) return;
  const { settings } = appState.admin;
  await runBusy(message, async () => {
    const data = await call(action, { roomId: settings.gameId, round: settings.currentRound, epoch: settings.epoch,
      updatedAt: settings.updatedAt, ...params });
    if (success) showMessage(typeof success === "function" ? success(data) : success, "success");
  });
}

function startGame() {
  return adminAction("start", {}, "1라운드를 시작하고 있습니다…", "게임을 시작했습니다.");
}

function revealCell(round, teamId) {
  return adminAction("reveal", { round, teamId });
}

function autoSubmitFinalRound() {
  if (!appState.admin || appState.busy) return;
  const { settings, submissions } = appState.admin;
  if (settings.status !== "playing" || settings.currentRound !== settings.roundCount) return;
  if (submissions.filter((item) => item.round === settings.currentRound).length >= settings.teamCount) return;
  if (!window.confirm("미제출 팀에 남은 마지막 숫자를 자동으로 제출할까요? 제출 후에는 바꿀 수 없습니다.")) return;
  return adminAction("autoSubmitFinalRound", {}, "마지막 숫자를 제출하고 있습니다…",
    ({ count }) => count ? `${count}개 팀의 마지막 숫자를 제출했습니다.` : "이미 모든 팀이 제출했습니다.");
}

function revealAllCurrentRound() {
  return adminAction("revealAll", {}, "숫자를 공개하고 점수를 계산하고 있습니다…");
}

function nextRound() {
  return adminAction("nextRound", {}, "다음 라운드로 이동하고 있습니다…");
}

function resetGame() {
  if (!appState.admin || appState.busy || !window.confirm("현재 게임의 제출과 점수가 지워지고 새 팀 코드가 발급됩니다. 이 게임만 초기화할까요?")) return;
  return adminAction("reset", {}, "현재 게임을 초기화하고 있습니다…", "게임을 초기화하고 새 팀 코드를 만들었습니다.");
}


async function adminSubmitNumber(round, teamId) {
  if (!appState.admin || appState.busy) return;
  const { settings, teams = [], submissions = [] } = appState.admin;
  if (settings.status !== "playing" || Number(round) !== Number(settings.currentRound)) {
    showMessage("현재 진행 중인 라운드에만 대신 제출할 수 있습니다.", "info");
    return;
  }
  const team = teams.find((item) => Number(item.teamId) === Number(teamId));
  if (!team) {
    showMessage("팀 정보를 찾을 수 없습니다. 동기화 후 다시 시도해 주세요.", "error");
    return;
  }
  const alreadySubmitted = submissions.some((item) => Number(item.round) === Number(round) && Number(item.teamId) === Number(teamId));
  if (alreadySubmitted) {
    showMessage(`${team.teamName}은 이미 이번 라운드에 제출했습니다.`, "info");
    return;
  }
  const remainingNumbers = (team.remainingNumbers || createNumberRange(settings.roundCount).filter((number) => !(team.usedNumbers || []).map(Number).includes(number))).map(Number);
  if (!remainingNumbers.length) {
    showMessage(`${team.teamName}에 남은 숫자가 없습니다.`, "error");
    return;
  }
  const input = window.prompt(`${team.teamName} 대신 제출할 숫자를 입력하세요.\n사용 가능: ${remainingNumbers.join(", ")}`, "");
  if (input === null) return;
  const number = Number(String(input).trim());
  if (!Number.isInteger(number) || !remainingNumbers.includes(number)) {
    showMessage(`사용 가능한 숫자 중에서 입력해 주세요: ${remainingNumbers.join(", ")}`, "error");
    return;
  }
  if (!window.confirm(`${team.teamName} 대신 ${number}을(를) 제출할까요? 제출 후에는 바꿀 수 없습니다.`)) return;

  return adminAction("adminSubmit", { round, teamId, number }, "관리자 대신 제출을 저장하고 있습니다…",
    `${team.teamName} 대신 ${number}을(를) 제출했습니다.`);
}

function renderAdminBoard(state) {
  const { settings, teams: receivedTeams = [], submissions = [], roundResults = [], ranking = [] } = state;
  const teams = receivedTeams.slice(0, Number(settings.teamCount) || receivedTeams.length);
  const isCreated = settings.status === "created";
  const isFinished = settings.status === "finished";
  $("#adminSetupStatus").textContent = isCreated ? "게임 생성됨" : isFinished ? "게임 종료" : "진행 중";
  $("#adminSetupStatus").classList.add("ready");
  $("#adminRoundBadge").innerHTML = `<small>현재 라운드</small><strong>${isCreated ? "준비 중" : isFinished ? "종료" : `${settings.currentRound} / ${settings.roundCount}`}</strong>`;
  $("#teamCodesPanel").hidden = false;
  $("#adminBoardLayout").hidden = isCreated;
  if (isCreated) void closeBoardFullscreen();
  $("#startGameButton").hidden = !isCreated;
  $("#gameIdDisplay").textContent = settings.gameId;
  syncAdminGameSize(settings);
  renderCommonJoinQr(settings);

  $("#teamCodeGrid").innerHTML = teams.map((team) => `<article class="team-code-card"><small>${escapeHtml(team.teamName)}</small><strong>${escapeHtml(team.teamCode)}</strong></article>`).join("");
  if (isCreated) return;

  $("#roundProgress").style.setProperty("--round-columns", Math.min(settings.roundCount, 10));
  $("#roundProgress").innerHTML = Array.from({ length: settings.roundCount }, (_, index) => {
    const round = index + 1;
    const klass = round < settings.currentRound || isFinished ? "done" : round === settings.currentRound ? "current" : "";
    return `<span class="progress-step ${klass}" title="${round}라운드"></span>`;
  }).join("");

  $("#adminBoardHead").innerHTML = `<tr><th scope="col">라운드</th>${teams.map((team) => `<th scope="col">${escapeHtml(team.teamName)}</th>`).join("")}</tr>`;
  $(".game-board").style.setProperty("--team-columns", teams.length);
  const roundRows = Array.from({ length: settings.roundCount }, (_, index) => {
    const round = index + 1;
    const result = roundResults.find((item) => Number(item.round) === round);
    const rowClass = round === Number(settings.currentRound) && !isFinished ? "current-round" : round < Number(settings.currentRound) || isFinished ? "past-round" : "";
    const cells = teams.map((team) => {
      const submission = submissions.find((item) => Number(item.round) === round && Number(item.teamId) === Number(team.teamId));
      if (!submission) {
        const canEnterForTeam = !isFinished && round === Number(settings.currentRound);
        return canEnterForTeam
          ? `<td><button class="cell-button admin-entry" type="button" onclick="adminSubmitNumber(${round}, ${team.teamId})" title="${escapeHtml(team.teamName)} 대신 숫자 제출">직접 입력</button></td>`
          : `<td><button class="cell-button pending" type="button" disabled>미제출</button></td>`;
      }
      if (!submission.isRevealed) return `<td><button class="cell-button submitted" type="button" onclick="revealCell(${round}, ${team.teamId})">제출 완료</button></td>`;
      const won = result && Number(result.winnerTeamId) === Number(team.teamId);
      return `<td><button class="cell-button revealed ${won ? "winner" : ""}" type="button" disabled>${escapeHtml(submission.submittedNumber)}${won ? " ★" : ""}</button></td>`;
    }).join("");
    return `<tr class="${rowClass}"><th class="round-label" scope="row"><strong>${round}R</strong><small>${result ? "계산 완료" : round === settings.currentRound && !isFinished ? "진행 중" : ""}</small></th>${cells}</tr>`;
  }).join("");
  const firstPlaceCount = ranking.filter((item) => Number(item.rank) === 1).length;
  const scoreCells = teams.map((team) => {
    const rankItem = ranking.find((item) => Number(item.teamId) === Number(team.teamId));
    const isWinner = isFinished && Number(rankItem?.rank) === 1;
    const rankLabel = isFinished && rankItem
      ? isWinner && firstPlaceCount > 1 ? "공동 1위" : `${rankItem.rank}위`
      : "";
    return `<td class="score-total-cell ${isWinner ? "winner" : ""}"><strong>${team.scoreTotal}점</strong>${rankLabel ? `<small>${isWinner ? "🏆 " : ""}${escapeHtml(rankLabel)}</small>` : ""}</td>`;
  }).join("");
  const scoreRow = `<tr class="score-total-row"><th scope="row"><strong>점수 합계</strong><small>${isFinished ? "최종 결과" : "실시간"}</small></th>${scoreCells}</tr>`;
  $("#adminBoardBody").innerHTML = roundRows + scoreRow;

  const currentSubmissions = submissions.filter((item) => Number(item.round) === Number(settings.currentRound));
  const currentResult = roundResults.find((item) => Number(item.round) === Number(settings.currentRound));
  const isFinalRound = Number(settings.currentRound) === Number(settings.roundCount);
  $("#autoSubmitFinalRoundButton").hidden = !isFinalRound || isFinished;
  $("#autoSubmitFinalRoundButton").disabled = isFinished || Boolean(currentResult) || currentSubmissions.length >= settings.teamCount;
  $("#submissionCount").textContent = `${currentSubmissions.length} / ${settings.teamCount}팀 제출`;
  $("#roundHint").textContent = isFinished ? "모든 라운드가 끝났습니다." : currentResult ? "결과 계산이 끝났습니다. 다음 라운드로 이동하세요." : currentSubmissions.length === settings.teamCount ? "모든 팀이 제출했습니다. 숫자를 공개하세요." : isFinalRound ? "자동 제출 버튼으로 각 팀의 마지막 숫자를 입력할 수 있습니다." : "미제출 팀은 게임판에서 직접 입력할 수 있습니다.";
  $("#revealAllButton").disabled = isFinished || Boolean(currentResult) || currentSubmissions.length < settings.teamCount;
  $("#nextRoundButton").disabled = isFinished || !currentResult;
  $("#nextRoundButton").textContent = Number(settings.currentRound) === Number(settings.roundCount) ? "최종 결과 보기 →" : "다음 라운드 →";

  $("#teamStatusList").innerHTML = teams.map((team) => `<div class="team-status-item"><strong>${escapeHtml(team.teamName)}</strong><div class="mini-numbers">${team.remainingNumbers.map((number) => `<span class="mini-number">${number}</span>`).join("") || '<span class="empty-state">모두 사용</span>'}</div><div class="score-box"><strong>${team.scoreTotal}</strong><small>점</small></div></div>`).join("");
  renderRoundResult(roundResults);
}

function renderRoundResult(results = []) {
  const container = $("#roundResultList");
  if (!results.length) {
    container.innerHTML = '<p class="empty-state">공개가 끝난 라운드의 결과가 여기에 나타납니다.</p>';
    return;
  }
  container.innerHTML = [...results].reverse().map((result) => `<article class="result-item ${result.winnerTeamId ? "" : "no-winner"}"><strong>${result.round}라운드 · ${result.winnerTeamId ? `${escapeHtml(result.winnerTeamName)} ${result.winningNumber}점` : "획득 팀 없음"}</strong><p>${escapeHtml(result.resultText)}</p></article>`).join("");
}


function selectNumber(number) {
  if (!appState.player || appState.player.ownSubmission || appState.player.settings.status !== "playing") return;
  if (!appState.player.team.remainingNumbers.includes(number)) return;
  appState.selectedNumber = number;
  renderPlayerBoard(appState.player);
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

  renderRemainingNumbers(team, settings.roundCount);
  const used = new Set(team.usedNumbers.map(Number));
  $("#numberGrid").innerHTML = createNumberRange(settings.roundCount).map((number) => {
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

function renderRemainingNumbers(team, roundCount) {
  const used = new Set((team.usedNumbers || []).map(Number));
  $("#remainingNumbers").innerHTML = `<div class="remaining-overview">${createNumberRange(roundCount).map((number) => `<span class="remaining-token ${used.has(number) ? "used" : ""}" title="${used.has(number) ? "사용 완료" : "사용 가능"}">${number}</span>`).join("")}</div>`;
}

function renderFinalRanking(ranking, targetSelector) {
  const winners = ranking.filter((item) => Number(item.rank) === 1);
  const winnerText = winners.length > 1 ? `공동 우승 · ${winners.map((item) => item.teamName).join(", ")}` : `${winners[0]?.teamName || "-"} 우승!`;
  $(targetSelector).innerHTML = `<div class="final-heading"><span class="trophy">🏆</span><h2>최종 결과</h2><p>${escapeHtml(winnerText)}</p></div><div class="ranking-list">${ranking.map((item) => {
    const scores = Array.isArray(item.earnedScores) ? item.earnedScores.join(" · ") : "";
    return `<article class="ranking-item ${Number(item.rank) === 1 ? "winner" : ""}"><span class="rank-number">${escapeHtml(item.rank)}위</span><div class="ranking-team"><strong>${escapeHtml(item.teamName)}</strong><small>획득 점수 ${escapeHtml(scores || "없음")}</small></div><span class="ranking-score">${escapeHtml(item.scoreTotal)}점</span></article>`;
  }).join("")}</div>`;
}

function combinePlayerState(session) {
  if (!session.game || !session.seat || session.game.settings.epoch !== session.seat.epoch) return;
  const { settings } = session.game;
  const ranking = Array.isArray(session.game.ranking) ? session.game.ranking.filter((row) => row && typeof row === "object") : [];
  const { team, lastSubmission } = session.seat;
  const ownSubmission = lastSubmission?.round === settings.currentRound ? lastSubmission : null;
  if (ownSubmission || appState.player?.settings.currentRound !== settings.currentRound) appState.selectedNumber = null;
  appState.player = { settings, team, ownSubmission, ranking };
  renderPlayerBoard(appState.player);
}

async function openPlayer(roomId, seatId) {
  const session = beginSession("player", roomId, { seatId });
  try {
    await Promise.all([
      watch(session, "game", (data) => { session.game = data; combinePlayerState(session); }),
      watch(session, `team-${seatId}`, (data) => { session.seat = data; combinePlayerState(session); }),
    ]);
  } catch (error) {
    if (appState.session === session) stopSession();
    throw error;
  }
  if (appState.session !== session) throw new Error("참여 상태가 바뀌었습니다. 팀 코드로 다시 접속해 주세요.");
  saveStorage(STORAGE_KEYS.player, { roomId, seatId });
  $("#playerJoinPanel").hidden = true;
  $("#playerGamePanel").hidden = false;
  setRoute("player", roomId);
}

function joinGame() {
  return runBusy("팀 정보를 확인하고 있습니다…", async () => {
    const roomId = $("#playerRoomId").value.trim().toUpperCase();
    const teamCode = $("#playerTeamCode").value.trim();
    if (!ROOM_ID.test(roomId)) throw new Error("선생님이 알려준 10자리 게임 코드를 입력해 주세요.");
    if (!TEAM_CODE.test(teamCode)) throw new Error("팀 코드는 숫자 6자리입니다. 기존 게임의 8자리 코드도 사용할 수 있습니다.");
    const { seatId } = await call("join", { roomId, teamCode });
    await openPlayer(roomId, seatId);
    $("#playerTeamCode").value = "";
    showMessage(`${appState.player.team.teamName}으로 접속했습니다.`, "success");
  });
}

function submitNumber() {
  if (!appState.player || appState.busy || !appState.selectedNumber) return;
  const number = appState.selectedNumber;
  const { team, settings } = appState.player;
  if (!window.confirm(`${number}을(를) 제출할까요? 제출 후에는 바꿀 수 없습니다.`)) return;
  return runBusy("선택한 숫자를 제출하고 있습니다…", async () => {
    await call("submit", { roomId: settings.gameId, seatId: appState.session.seatId, teamId: team.teamId,
      round: settings.currentRound, epoch: settings.epoch, number });
    appState.selectedNumber = null;
    if (appState.player) renderPlayerBoard(appState.player);
    showMessage("제출했습니다. 관리자가 공개할 때까지 기다려 주세요.", "success");
  });
}

function showManualConnectionFields() {
  $("#playerConnectionFields").hidden = false;
  $("#qrJoinNotice").hidden = true;
  $("#playerRoomId").focus();
}

function leavePlayerGame() {
  saveStorage(STORAGE_KEYS.player, null);
  switchMode("player");
}

document.addEventListener("DOMContentLoaded", () => {
  $("#boardFullscreenButton").addEventListener("click", toggleBoardFullscreen);
  document.addEventListener("fullscreenchange", () => {
    if (nativeBoardFullscreen && document.fullscreenElement !== document.documentElement) {
      nativeBoardFullscreen = false;
      setBoardFullscreen(false);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !document.fullscreenElement) void closeBoardFullscreen();
  });
  for (const id of ["adminTeamCount", "adminRoundCount"]) {
    $(`#${id}`).addEventListener("input", (event) => { event.target.dataset.dirty = "true"; });
  }
  $("#playerTeamCode").addEventListener("input", (event) => { event.target.value = event.target.value.replace(/\D/g, "").slice(0, 8); });
  $("#playerTeamCode").addEventListener("keydown", (event) => { if (event.key === "Enter") joinGame(); });
  $("#recoveryCode").addEventListener("keydown", (event) => { if (event.key === "Enter") recoverRoom(); });
  $("#recentRooms").addEventListener("click", (event) => {
    const room = event.target.closest("[data-room]");
    if (room) resumeRoom(room.dataset.room);
  });
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEYS.admin && appState.mode === "admin") renderHistory();
  });
  const parameters = new URLSearchParams(window.location.search);
  const mode = parameters.get("mode");
  const roomId = parameters.get("game") || "";
  if (mode === "admin") {
    switchMode("admin", true);
    if (ROOM_ID.test(roomId)) resumeRoom(roomId);
  } else if (mode === "player") {
    switchMode("player", true);
    if (!ROOM_ID.test(roomId)) return;
    $("#playerRoomId").value = roomId;
    $("#playerConnectionFields").hidden = true;
    $("#qrJoinNotice").hidden = false;
    const seat = readStorage(STORAGE_KEYS.player);
    if (seat?.roomId === roomId && typeof seat.seatId === "string" && TEAM_CODE.test(seat.seatId)) {
      runBusy("팀을 다시 연결하고 있습니다…", async () => {
        try { await openPlayer(roomId, seat.seatId); }
        catch (error) {
          if (error.code === "permission-denied") saveStorage(STORAGE_KEYS.player, null);
          throw error;
        }
      });
    } else $("#playerTeamCode").focus();
  }
});
