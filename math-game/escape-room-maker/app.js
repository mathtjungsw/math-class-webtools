const STORAGE_KEY = "mathEscapeRoomMaker.v1";
const MAX_MISSIONS = 8;
const MIN_MISSIONS = 1;

const DEFAULT_STATE = {
  version: 1,
  title: "사라진 수학자의 연구실",
  story: "수학자의 연구실 문이 갑자기 잠겼습니다. 책상 위에 남겨진 문제를 차례로 해결하면 마지막 자물쇠를 열 수 있습니다. 제한 시간 안에 모든 암호를 찾아 탈출하세요!",
  timeLimit: 25,
  teamMode: "모둠",
  successMessage: "연구실의 모든 비밀을 풀고 무사히 탈출했습니다!",
  missions: [
    { id: "m1", question: "어떤 수에 7을 더한 값은 19입니다. 어떤 수를 구하세요.", answer: "12", type: "auto", choices: "", hints: ["어떤 수를 □로 놓아 보세요.", "□ + 7 = 19를 식으로 세워 보세요.", "19에서 7을 빼면 됩니다."] },
    { id: "m2", question: "연속한 세 자연수의 합이 72일 때, 가장 큰 수를 구하세요.", answer: "25", type: "auto", choices: "", hints: ["가운데 수를 기준으로 생각해 보세요.", "세 수의 평균은 가운데 수와 같습니다.", "72 ÷ 3으로 가운데 수를 먼저 구하세요."] },
    { id: "m3", question: "가로가 8cm, 세로가 5cm인 직사각형의 둘레는 몇 cm인가요?", answer: "26", type: "auto", choices: "22, 24, 26, 40", hints: ["둘레는 네 변의 길이의 합입니다.", "가로와 세로를 더한 뒤 2배 하세요.", "(8 + 5) × 2를 계산하세요."] }
  ]
};

const els = {
  builderView: document.querySelector("#builderView"),
  playerView: document.querySelector("#playerView"),
  missionList: document.querySelector("#missionList"),
  missionTemplate: document.querySelector("#missionTemplate"),
  title: document.querySelector("#escapeTitle"),
  story: document.querySelector("#escapeStory"),
  storyCount: document.querySelector("#storyCount"),
  time: document.querySelector("#timeLimit"),
  teamMode: document.querySelector("#teamMode"),
  success: document.querySelector("#successMessage"),
  toast: document.querySelector("#toast")
};

let state = loadState();
let play = createPlayState();
let saveTimer = null;
let countdownTimer = null;
let toastTimer = null;

function uid() {
  return `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function cleanState(candidate) {
  if (!candidate || !Array.isArray(candidate.missions)) return clone(DEFAULT_STATE);
  const cleanMissions = candidate.missions.slice(0, MAX_MISSIONS).map((mission) => ({
    id: String(mission.id || uid()),
    question: String(mission.question || "").slice(0, 500),
    answer: String(mission.answer || "").slice(0, 80),
    type: ["auto", "number", "text", "choice"].includes(mission.type) ? mission.type : "auto",
    choices: String(mission.choices || "").slice(0, 240),
    hints: Array.from({ length: 3 }, (_, index) => String(mission.hints?.[index] || "").slice(0, 160))
  }));
  return {
    version: 1,
    title: String(candidate.title || "나의 수학 방탈출").slice(0, 60),
    story: String(candidate.story || "").slice(0, 360),
    timeLimit: Math.min(90, Math.max(5, Number(candidate.timeLimit) || 25)),
    teamMode: ["모둠", "개인", "전체"].includes(candidate.teamMode) ? candidate.teamMode : "모둠",
    successMessage: String(candidate.successMessage || "모든 미션을 해결하고 탈출했습니다!").slice(0, 120),
    missions: cleanMissions.length ? cleanMissions : [clone(DEFAULT_STATE.missions[0])]
  };
}

function loadState() {
  const shared = readSharedState();
  if (shared) return cleanState(shared);
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? cleanState(JSON.parse(saved)) : clone(DEFAULT_STATE);
  } catch {
    return clone(DEFAULT_STATE);
  }
}

function readSharedState() {
  const match = location.hash.match(/(?:^#|&)escape=([^&]+)/);
  if (!match) return null;
  try {
    const binary = atob(match[1].replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

function createPlayState() {
  return { current: 0, completed: [], revealedHints: [], totalHints: 0, startedAt: null, remaining: 0, teamName: "", keypadValue: "", selectedChoice: "" };
}

function saveState() {
  clearTimeout(saveTimer);
  document.querySelector("#saveState").innerHTML = "<span>●</span> 저장 중…";
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      document.querySelector("#saveState").innerHTML = "<span>●</span> 이 브라우저에 자동 저장됨";
    } catch {
      document.querySelector("#saveState").textContent = "브라우저 저장 공간을 사용할 수 없습니다.";
    }
  }, 240);
}

function getChoices(mission) {
  return mission.choices.split(",").map((choice) => choice.trim()).filter(Boolean).slice(0, 6);
}

function primaryAnswer(mission) {
  return mission.answer.split("|").map((answer) => answer.trim()).find(Boolean) || "";
}

function resolveType(mission) {
  if (mission.type !== "auto") return mission.type;
  if (getChoices(mission).length >= 2) return "choice";
  const answer = primaryAnswer(mission).replace(/[\s,]/g, "");
  return answer && /^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(answer) ? "number" : "text";
}

function getLockMeta(mission) {
  const type = resolveType(mission);
  return {
    number: ["숫자 키패드", "NUMERIC LOCK"],
    text: ["문자 암호", "WORD LOCK"],
    choice: ["선택형 잠금", "CHOICE LOCK"]
  }[type];
}

function normalizeAnswer(value) {
  return String(value).normalize("NFKC").trim().toLowerCase().replace(/[\s,]/g, "");
}

function isCorrect(mission, submitted) {
  const value = normalizeAnswer(submitted);
  return mission.answer.split("|").some((answer) => normalizeAnswer(answer) === value && value !== "");
}

function getCodePiece(mission) {
  const answer = primaryAnswer(mission).normalize("NFKC").trim();
  if (!answer) return "?";
  const type = resolveType(mission);
  if (type === "choice") {
    const choices = getChoices(mission);
    const index = choices.findIndex((choice) => normalizeAnswer(choice) === normalizeAnswer(answer));
    return index >= 0 ? String(index + 1) : answer.charAt(0).toUpperCase();
  }
  if (type === "number") {
    const digits = answer.match(/\d/g);
    return digits?.at(-1) || answer.charAt(0);
  }
  return Array.from(answer.replace(/\s/g, ""))[0]?.toUpperCase() || "?";
}

function getFinalCode() {
  return state.missions.map(getCodePiece).join("");
}

function renderBuilder() {
  els.title.value = state.title;
  els.story.value = state.story;
  els.time.value = state.timeLimit;
  els.teamMode.value = state.teamMode;
  els.success.value = state.successMessage;
  els.storyCount.textContent = state.story.length;
  els.missionList.replaceChildren(...state.missions.map(renderMissionCard));
  renderSummary();
}

function renderMissionCard(mission, index) {
  const card = els.missionTemplate.content.firstElementChild.cloneNode(true);
  card.dataset.id = mission.id;
  card.querySelector(".mission-label").textContent = `MISSION ${String(index + 1).padStart(2, "0")}`;
  card.querySelector(".mission-title-preview").textContent = mission.question || "새 수학 미션";
  card.querySelector(".mission-question").value = mission.question;
  card.querySelector(".mission-answer").value = mission.answer;
  card.querySelector(".mission-type").value = mission.type;
  card.querySelector(".mission-choices").value = mission.choices;
  card.querySelectorAll(".mission-hint").forEach((input, hintIndex) => { input.value = mission.hints[hintIndex] || ""; });
  card.querySelector(".move-up").disabled = index === 0;
  card.querySelector(".move-down").disabled = index === state.missions.length - 1;
  card.querySelector(".delete-button").disabled = state.missions.length <= MIN_MISSIONS;
  updateCardPreview(card, mission);
  return card;
}

function updateCardPreview(card, mission) {
  const [label] = getLockMeta(mission);
  const hasAnswer = Boolean(primaryAnswer(mission));
  card.classList.toggle("has-choices", mission.type === "choice" || (mission.type === "auto" && getChoices(mission).length >= 2));
  card.querySelector(".auto-badge").textContent = mission.type === "auto" ? "AUTO LOCK" : "LOCK SET";
  card.querySelector(".mission-title-preview").textContent = mission.question || "새 수학 미션";
  card.querySelector(".lock-preview-name").textContent = hasAnswer ? `${label}가 생성됩니다.` : "정답을 입력하면 자물쇠가 정해집니다.";
  card.querySelector(".code-piece-preview").textContent = `CODE · ${getCodePiece(mission)}`;
}

function renderSummary() {
  const finalCode = getFinalCode();
  document.querySelector("#heroMissionCount").textContent = state.missions.length;
  document.querySelector("#heroTime").textContent = state.timeLimit;
  document.querySelector("#heroCode").textContent = finalCode;
  document.querySelector("#finalCodePreview").textContent = finalCode;
  document.querySelector("#addMissionButton").disabled = state.missions.length >= MAX_MISSIONS;
  document.querySelector("#codeBreakdown").replaceChildren(...state.missions.map((mission, index) => {
    const item = document.createElement("li");
    item.innerHTML = `<span>${index + 1}</span><b></b><code>${getCodePiece(mission)}</code>`;
    item.querySelector("b").textContent = mission.question || "문제를 입력하세요";
    return item;
  }));
}

function updateStateFromSettings() {
  state.title = els.title.value;
  state.story = els.story.value;
  state.timeLimit = Math.min(90, Math.max(5, Number(els.time.value) || 25));
  state.teamMode = els.teamMode.value;
  state.successMessage = els.success.value;
  els.storyCount.textContent = state.story.length;
  renderSummary();
  saveState();
}

function updateMissionFromCard(card) {
  const mission = state.missions.find((item) => item.id === card.dataset.id);
  if (!mission) return;
  mission.question = card.querySelector(".mission-question").value;
  mission.answer = card.querySelector(".mission-answer").value;
  mission.type = card.querySelector(".mission-type").value;
  mission.choices = card.querySelector(".mission-choices").value;
  mission.hints = [...card.querySelectorAll(".mission-hint")].map((input) => input.value);
  updateCardPreview(card, mission);
  renderSummary();
  saveState();
}

function validateReady(showMessage = true) {
  const missing = [];
  if (!state.title.trim()) missing.push("방탈출 제목");
  state.missions.forEach((mission, index) => {
    if (!mission.question.trim() || !primaryAnswer(mission)) missing.push(`미션 ${index + 1}`);
    if (resolveType(mission) === "number") {
      const hasKeypadAnswer = mission.answer.split("|").some((answer) => /^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(answer.trim().replace(/,/g, "")));
      if (!hasKeypadAnswer) missing.push(`미션 ${index + 1} 숫자 정답`);
    }
    if (resolveType(mission) === "choice") {
      const choices = getChoices(mission);
      if (choices.length < 2) missing.push(`미션 ${index + 1} 선택지`);
      else if (!choices.some((choice) => isCorrect(mission, choice))) missing.push(`미션 ${index + 1} 정답 선택지`);
    }
  });
  if (missing.length && showMessage) showToast(`${missing.slice(0, 3).join(", ")}을(를) 확인해주세요.`);
  return missing.length === 0;
}

function showToast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  toastTimer = setTimeout(() => els.toast.classList.remove("is-visible"), 2600);
}

function addMission() {
  if (state.missions.length >= MAX_MISSIONS) return;
  state.missions.push({ id: uid(), question: "", answer: "", type: "auto", choices: "", hints: ["", "", ""] });
  renderBuilder();
  saveState();
  const lastCard = els.missionList.lastElementChild;
  lastCard.scrollIntoView({ behavior: "smooth", block: "center" });
  lastCard.querySelector(".mission-question").focus({ preventScroll: true });
}

function moveMission(id, offset) {
  const index = state.missions.findIndex((mission) => mission.id === id);
  const nextIndex = index + offset;
  if (index < 0 || nextIndex < 0 || nextIndex >= state.missions.length) return;
  [state.missions[index], state.missions[nextIndex]] = [state.missions[nextIndex], state.missions[index]];
  renderBuilder();
  saveState();
  els.missionList.querySelector(`[data-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "center" });
}

function deleteMission(id) {
  if (state.missions.length <= MIN_MISSIONS) return;
  state.missions = state.missions.filter((mission) => mission.id !== id);
  renderBuilder();
  saveState();
}

function setupPlayer() {
  if (!validateReady()) return;
  clearInterval(countdownTimer);
  play = createPlayState();
  play.remaining = state.timeLimit * 60;
  document.body.classList.add("is-playing");
  els.builderView.hidden = true;
  els.playerView.hidden = false;
  document.querySelectorAll(".builder-only").forEach((element) => { element.hidden = true; });
  document.querySelectorAll(".player-only").forEach((element) => { element.hidden = false; });
  showPlayerScreen("gameIntro");
  document.querySelector("#playTitle").textContent = state.title;
  document.querySelector("#playStory").textContent = state.story || "모든 문제를 해결하고 최종 암호를 완성하세요.";
  document.querySelector("#briefTime").textContent = `${state.timeLimit}분`;
  document.querySelector("#briefCount").textContent = `${state.missions.length}개`;
  document.querySelector("#briefMode").textContent = state.teamMode;
  document.querySelector("#teamLabel").textContent = state.teamMode === "개인" ? "도전자 이름" : state.teamMode === "전체" ? "학급 이름" : "모둠 이름";
  document.querySelector("#teamName").value = "";
  scrollTo({ top: 0, behavior: "instant" });
}

function exitPlayer() {
  clearInterval(countdownTimer);
  document.body.classList.remove("is-playing");
  els.builderView.hidden = false;
  els.playerView.hidden = true;
  document.querySelectorAll(".builder-only").forEach((element) => { element.hidden = false; });
  document.querySelectorAll(".player-only").forEach((element) => { element.hidden = true; });
  history.replaceState({}, "", `${location.pathname}${location.search}#tools`);
  scrollTo({ top: 0, behavior: "instant" });
}

function showPlayerScreen(id) {
  ["gameIntro", "gameBoard", "codeReveal", "finalLockScreen", "escapeSuccess"].forEach((screenId) => {
    document.querySelector(`#${screenId}`).hidden = screenId !== id;
  });
}

function beginPlay() {
  const teamInput = document.querySelector("#teamName").value.trim();
  play.teamName = teamInput || (state.teamMode === "개인" ? "도전자" : state.teamMode === "전체" ? "우리 반" : "수학 탐정단");
  play.startedAt = Date.now();
  play.remaining = state.timeLimit * 60;
  document.querySelector("#statusTitle").textContent = state.title;
  document.querySelector("#statusTeam").textContent = play.teamName;
  showPlayerScreen("gameBoard");
  renderCurrentMission();
  updateTimer();
  countdownTimer = setInterval(() => {
    play.remaining = Math.max(0, play.remaining - 1);
    updateTimer();
    if (play.remaining === 0) clearInterval(countdownTimer);
  }, 1000);
}

function updateTimer() {
  const minutes = Math.floor(play.remaining / 60);
  const seconds = play.remaining % 60;
  document.querySelector("#timerDisplay").textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  document.querySelector("#timerBox").classList.toggle("is-urgent", play.remaining <= 60);
}

function renderProgress() {
  const rail = document.querySelector("#progressRail");
  rail.replaceChildren(...state.missions.map((_, index) => {
    const step = document.createElement("div");
    step.className = "rail-step";
    if (index < play.current) step.classList.add("is-complete");
    if (index === play.current) step.classList.add("is-current");
    step.innerHTML = `<span>${index < play.current ? "✓" : index + 1}</span>`;
    return step;
  }));
  document.querySelector("#progressText").textContent = `${play.completed.length} / ${state.missions.length}`;
}

function renderCurrentMission() {
  const mission = state.missions[play.current];
  if (!mission) return showFinalLock();
  play.keypadValue = "";
  play.selectedChoice = "";
  play.revealedHints = [];
  renderProgress();
  const [lockName, lockEnglish] = getLockMeta(mission);
  document.querySelector("#missionNumber").textContent = `MISSION ${String(play.current + 1).padStart(2, "0")}`;
  document.querySelector("#missionLockType").textContent = lockEnglish;
  document.querySelector("#currentMissionTitle").textContent = `${play.current + 1}번째 잠금장치`;
  document.querySelector("#problemText").textContent = mission.question;
  document.querySelector("#lockTitle").textContent = lockName;
  document.querySelector("#hintList").replaceChildren();
  document.querySelector("#hintUsage").textContent = "힌트 0개 사용";
  document.querySelector("#answerFeedback").textContent = "";
  const hintCount = mission.hints.filter((hint) => hint.trim()).length;
  const hintButton = document.querySelector("#hintButton");
  hintButton.hidden = hintCount === 0;
  hintButton.textContent = "";
  hintButton.innerHTML = '<span aria-hidden="true">?</span> 힌트 열기';
  renderAnswerControl(mission);
}

function renderAnswerControl(mission) {
  const container = document.querySelector("#answerControl");
  const type = resolveType(mission);
  if (type === "number") {
    container.innerHTML = `
      <div class="number-display is-placeholder" id="numberDisplay">숫자를 입력하세요</div>
      <div class="keypad" aria-label="숫자 키패드">
        ${[1,2,3,4,5,6,7,8,9].map((key) => `<button type="button" data-key="${key}">${key}</button>`).join("")}
        <button type="button" data-key="-">−</button><button type="button" data-key="0">0</button><button type="button" data-key=".">.</button>
        <button type="button" data-key="clear">지우기</button><button type="button" data-key="back">←</button>
      </div>
      <button class="answer-submit" type="button" data-submit-answer>암호 확인</button>`;
    return;
  }
  if (type === "choice") {
    const choices = getChoices(mission);
    container.innerHTML = `<div class="choice-lock">${choices.map((choice, index) => `<button type="button" data-choice="${escapeAttribute(choice)}"><b>${index + 1}</b><span></span></button>`).join("")}</div><button class="answer-submit" type="button" data-submit-answer>선택 확인</button>`;
    container.querySelectorAll("[data-choice]").forEach((button, index) => { button.querySelector("span").textContent = choices[index]; });
    return;
  }
  container.innerHTML = `<div class="text-lock"><label>암호를 입력하세요<input id="textAnswerInput" type="text" autocomplete="off" spellcheck="false" maxlength="80" /></label></div><button class="answer-submit" type="button" data-submit-answer>암호 확인</button>`;
  container.querySelector("input").focus();
}

function escapeAttribute(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function revealHint() {
  const mission = state.missions[play.current];
  const hints = mission.hints.filter((hint) => hint.trim());
  if (play.revealedHints.length >= hints.length) return;
  const nextHint = hints[play.revealedHints.length];
  play.revealedHints.push(nextHint);
  play.totalHints += 1;
  const hint = document.createElement("div");
  hint.className = "revealed-hint";
  hint.innerHTML = `<b>H${play.revealedHints.length}</b><span></span>`;
  hint.querySelector("span").textContent = nextHint;
  document.querySelector("#hintList").append(hint);
  document.querySelector("#hintUsage").textContent = `힌트 ${play.revealedHints.length}개 사용`;
  const button = document.querySelector("#hintButton");
  if (play.revealedHints.length >= hints.length) button.hidden = true;
}

function submitCurrentAnswer() {
  const mission = state.missions[play.current];
  const type = resolveType(mission);
  const submitted = type === "number" ? play.keypadValue : type === "choice" ? play.selectedChoice : document.querySelector("#textAnswerInput")?.value || "";
  if (!submitted) return showAnswerError("암호를 먼저 입력해주세요.");
  if (!isCorrect(mission, submitted)) return showAnswerError("자물쇠가 열리지 않습니다. 풀이를 다시 확인해보세요.");
  play.completed.push(play.current);
  document.querySelector("#revealNumber").textContent = `${play.current + 1}번째`;
  document.querySelector("#revealedCode").textContent = getCodePiece(mission);
  document.querySelector("#nextMissionButton").innerHTML = play.current === state.missions.length - 1 ? '최종 자물쇠로 <span aria-hidden="true">→</span>' : '다음 미션 <span aria-hidden="true">→</span>';
  showPlayerScreen("codeReveal");
}

function showAnswerError(message) {
  const feedback = document.querySelector("#answerFeedback");
  feedback.textContent = message;
  feedback.classList.remove("is-shake");
  requestAnimationFrame(() => feedback.classList.add("is-shake"));
}

function nextMission() {
  play.current += 1;
  if (play.current >= state.missions.length) showFinalLock();
  else {
    showPlayerScreen("gameBoard");
    renderCurrentMission();
  }
}

function showFinalLock() {
  showPlayerScreen("finalLockScreen");
  document.querySelector("#collectedCodes").replaceChildren(...state.missions.map((mission) => {
    const code = document.createElement("span");
    code.textContent = getCodePiece(mission);
    return code;
  }));
  document.querySelector("#finalCodeInput").value = "";
  document.querySelector("#finalFeedback").textContent = "";
  setTimeout(() => document.querySelector("#finalCodeInput").focus(), 50);
}

function completeEscape() {
  clearInterval(countdownTimer);
  const elapsed = Math.max(0, state.timeLimit * 60 - play.remaining);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  document.querySelector("#successText").textContent = state.successMessage;
  document.querySelector("#resultTime").textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  document.querySelector("#resultHints").textContent = `${play.totalHints}개`;
  document.querySelector("#resultTeam").textContent = play.teamName;
  showPlayerScreen("escapeSuccess");
}

function encodeShareState() {
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function copyShareLink() {
  if (!validateReady()) return;
  const base = location.href.split("#")[0];
  const url = `${base}#escape=${encodeShareState()}`;
  if (url.length > 12000) return showToast("내용이 길어 링크를 만들 수 없습니다. 제작 파일을 저장해주세요.");
  try {
    await navigator.clipboard.writeText(url);
    showToast("학생용 링크를 복사했습니다.");
  } catch {
    const input = document.createElement("textarea");
    input.value = url;
    document.body.append(input);
    input.select();
    document.execCommand("copy");
    input.remove();
    showToast("학생용 링크를 복사했습니다.");
  }
}

function downloadState() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  const filename = (state.title.trim() || "수학-방탈출").replace(/[\\/:*?"<>|]/g, "-");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  showToast("제작 파일을 저장했습니다.");
}

async function importState(file) {
  try {
    const imported = cleanState(JSON.parse(await file.text()));
    state = imported;
    renderBuilder();
    saveState();
    showToast("제작 파일을 불러왔습니다.");
  } catch {
    showToast("올바른 방탈출 제작 파일이 아닙니다.");
  }
}

function printSheet(teacher) {
  if (!validateReady()) return;
  const sheet = document.querySelector("#printSheet");
  sheet.innerHTML = "";
  const header = document.createElement("div");
  header.className = "print-title";
  header.innerHTML = `<small>${teacher ? "TEACHER ANSWER KEY" : "MATH ESCAPE WORKSHEET"}</small><h1></h1><div class="print-meta"><span>이름/모둠: ____________________</span><span>제한 시간: ${state.timeLimit}분</span><span>미션: ${state.missions.length}개</span></div>`;
  header.querySelector("h1").textContent = state.title;
  sheet.append(header);
  if (state.story) {
    const story = document.createElement("div");
    story.className = "print-story";
    story.textContent = state.story;
    sheet.append(story);
  }
  state.missions.forEach((mission, index) => {
    const section = document.createElement("section");
    section.className = "print-mission";
    section.innerHTML = `<h2>MISSION ${String(index + 1).padStart(2, "0")}</h2><p></p><div class="print-answer-line"></div>`;
    section.querySelector("p").textContent = mission.question;
    section.querySelector(".print-answer-line").innerHTML = teacher ? `<span class="teacher-answer">정답: ${escapeHtml(mission.answer)} · 코드 조각: ${escapeHtml(getCodePiece(mission))}</span>` : "답: ";
    const hints = mission.hints.filter((hint) => hint.trim());
    if (hints.length) {
      const hintBox = document.createElement("div");
      hintBox.className = "print-hints";
      hintBox.textContent = teacher ? `힌트: ${hints.join(" / ")}` : `힌트 기록: ${"__________________________________ ".repeat(2)}`;
      section.append(hintBox);
    }
    sheet.append(section);
  });
  const codes = document.createElement("div");
  codes.className = "print-code-boxes";
  codes.innerHTML = `<b>최종 탈출 코드</b> ${teacher ? `<span class="teacher-answer">${escapeHtml(getFinalCode())}</span>` : state.missions.map(() => "<i></i>").join("")}`;
  sheet.append(codes);
  requestAnimationFrame(() => window.print());
}

function escapeHtml(value) {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
}

function bindEvents() {
  [els.title, els.story, els.time, els.teamMode, els.success].forEach((input) => input.addEventListener("input", updateStateFromSettings));
  els.missionList.addEventListener("input", (event) => {
    const card = event.target.closest(".mission-card");
    if (card) updateMissionFromCard(card);
  });
  els.missionList.addEventListener("change", (event) => {
    const card = event.target.closest(".mission-card");
    if (card) updateMissionFromCard(card);
  });
  els.missionList.addEventListener("click", (event) => {
    const card = event.target.closest(".mission-card");
    if (!card) return;
    if (event.target.closest(".move-up")) moveMission(card.dataset.id, -1);
    if (event.target.closest(".move-down")) moveMission(card.dataset.id, 1);
    if (event.target.closest(".delete-button")) deleteMission(card.dataset.id);
  });
  document.querySelector("#addMissionButton").addEventListener("click", addMission);
  document.querySelector("#sampleButton").addEventListener("click", () => {
    state = clone(DEFAULT_STATE);
    renderBuilder();
    saveState();
    showToast("예시 방탈출을 불러왔습니다.");
  });
  document.querySelector("#resetButton").addEventListener("click", () => {
    if (!confirm("현재 내용을 지우고 새 방탈출을 만들까요?")) return;
    state = cleanState({ title: "나의 수학 방탈출", story: "", timeLimit: 25, teamMode: "모둠", successMessage: "모든 미션을 해결하고 탈출했습니다!", missions: [{ id: uid(), question: "", answer: "", type: "auto", choices: "", hints: ["", "", ""] }] });
    renderBuilder();
    saveState();
  });
  ["previewButton", "startButton"].forEach((id) => document.querySelector(`#${id}`).addEventListener("click", setupPlayer));
  ["exitPlayButton", "successExitButton"].forEach((id) => document.querySelector(`#${id}`).addEventListener("click", exitPlayer));
  document.querySelector("#beginMissionButton").addEventListener("click", beginPlay);
  document.querySelector("#hintButton").addEventListener("click", revealHint);
  document.querySelector("#nextMissionButton").addEventListener("click", nextMission);
  document.querySelector("#restartButton").addEventListener("click", () => { if (confirm("진행 기록을 지우고 처음부터 다시 시작할까요?")) setupPlayer(); });
  document.querySelector("#playAgainButton").addEventListener("click", setupPlayer);
  document.querySelector("#shareButton").addEventListener("click", copyShareLink);
  document.querySelector("#saveButton").addEventListener("click", downloadState);
  document.querySelector("#importInput").addEventListener("change", (event) => { const [file] = event.target.files; if (file) importState(file); event.target.value = ""; });
  document.querySelector("#printStudentButton").addEventListener("click", () => printSheet(false));
  document.querySelector("#printTeacherButton").addEventListener("click", () => printSheet(true));
  document.querySelector("#answerControl").addEventListener("click", (event) => {
    const key = event.target.closest("[data-key]")?.dataset.key;
    if (key !== undefined) {
      if (key === "clear") play.keypadValue = "";
      else if (key === "back") play.keypadValue = play.keypadValue.slice(0, -1);
      else if (key === "-" && play.keypadValue === "") play.keypadValue = "-";
      else if (key === "." && !play.keypadValue.includes(".")) play.keypadValue += play.keypadValue && play.keypadValue !== "-" ? "." : "0.";
      else if (/^\d$/.test(key) && play.keypadValue.length < 18) play.keypadValue += key;
      const display = document.querySelector("#numberDisplay");
      display.textContent = play.keypadValue || "숫자를 입력하세요";
      display.classList.toggle("is-placeholder", !play.keypadValue);
    }
    const choiceButton = event.target.closest("[data-choice]");
    if (choiceButton) {
      play.selectedChoice = choiceButton.dataset.choice;
      document.querySelectorAll("[data-choice]").forEach((button) => button.classList.toggle("is-selected", button === choiceButton));
    }
    if (event.target.closest("[data-submit-answer]")) submitCurrentAnswer();
  });
  document.querySelector("#answerControl").addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.matches("input")) submitCurrentAnswer();
  });
  document.querySelector("#finalCodeForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const submitted = document.querySelector("#finalCodeInput").value;
    if (normalizeAnswer(submitted) === normalizeAnswer(getFinalCode())) completeEscape();
    else {
      const feedback = document.querySelector("#finalFeedback");
      feedback.textContent = "코드의 순서를 다시 확인해보세요.";
      feedback.classList.remove("is-shake");
      requestAnimationFrame(() => feedback.classList.add("is-shake"));
    }
  });
}

renderBuilder();
bindEvents();

if (location.hash.includes("escape=")) {
  history.replaceState({}, "", `${location.pathname}${location.search}#escape=${encodeShareState()}`);
  setupPlayer();
}
