const STORAGE_KEY = "mathTools.pharaohCode.v1";

const TEAM_COLORS = [
  "#8c4b35",
  "#bf7b18",
  "#2376b9",
  "#159261",
  "#7652a5",
  "#c34567",
  "#557c31",
  "#277f86",
  "#9b5e20",
  "#5b667a",
];

const TIER_CONFIG = [
  {
    id: "peak",
    label: "최상",
    pointLabel: "7–8점",
    slots: 1,
    cards: [
      [64, 7],
      [90, 7],
      [49, 7],
      [84, 8],
    ],
  },
  {
    id: "high",
    label: "상",
    pointLabel: "5–6점",
    slots: 2,
    cards: [
      [23, 5],
      [54, 5],
      [26, 5],
      [70, 5],
      [80, 5],
      [50, 5],
      [33, 6],
      [63, 6],
      [44, 6],
    ],
  },
  {
    id: "middle",
    label: "중",
    pointLabel: "3–4점",
    slots: 3,
    cards: [
      [28, 3],
      [48, 3],
      [19, 3],
      [22, 3],
      [32, 3],
      [42, 3],
      [60, 3],
      [27, 3],
      [35, 3],
      [72, 3],
      [56, 3],
      [25, 4],
      [45, 4],
    ],
  },
  {
    id: "low",
    label: "하",
    pointLabel: "1–2점",
    slots: 4,
    cards: [
      [3, 1],
      [4, 1],
      [6, 1],
      [5, 1],
      [8, 1],
      [9, 1],
      [7, 1],
      [10, 1],
      [12, 1],
      [14, 1],
      [12, 1],
      [15, 1],
      [13, 1],
      [16, 1],
      [18, 1],
      [24, 1],
      [20, 2],
      [17, 2],
      [30, 2],
      [21, 2],
      [36, 2],
      [40, 2],
    ],
  },
];

const TOTAL_CARDS = TIER_CONFIG.reduce((sum, tier) => sum + tier.cards.length, 0);

const elements = {
  heroPanel: document.querySelector("#heroPanel"),
  setupPanel: document.querySelector("#setupPanel"),
  gamePanel: document.querySelector("#gamePanel"),
  teamCount: document.querySelector("#teamCount"),
  setupTimerSeconds: document.querySelector("#setupTimerSeconds"),
  teamNameFields: document.querySelector("#teamNameFields"),
  resetNamesButton: document.querySelector("#resetNamesButton"),
  startButton: document.querySelector("#startButton"),
  rulesButton: document.querySelector("#rulesButton"),
  rulesDialog: document.querySelector("#rulesDialog"),
  fullscreenButton: document.querySelector("#fullscreenButton"),
  newGameButton: document.querySelector("#newGameButton"),
  remainingCount: document.querySelector("#remainingCount"),
  solvedCount: document.querySelector("#solvedCount"),
  leaderDisplay: document.querySelector("#leaderDisplay"),
  roundCount: document.querySelector("#roundCount"),
  diceRoundBadge: document.querySelector("#diceRoundBadge"),
  targetPyramid: document.querySelector("#targetPyramid"),
  scoreGrid: document.querySelector("#scoreGrid"),
  historyCount: document.querySelector("#historyCount"),
  historyList: document.querySelector("#historyList"),
  undoButton: document.querySelector("#undoButton"),
  dieSix: document.querySelector("#dieSix"),
  dieEight: document.querySelector("#dieEight"),
  dieTwelve: document.querySelector("#dieTwelve"),
  diceRow: document.querySelector("#diceRow"),
  rollButton: document.querySelector("#rollButton"),
  diceHint: document.querySelector("#diceHint"),
  timerDisplay: document.querySelector("#timerDisplay"),
  timerProgress: document.querySelector("#timerProgress"),
  timerPreset: document.querySelector("#timerPreset"),
  timerToggleButton: document.querySelector("#timerToggleButton"),
  timerResetButton: document.querySelector("#timerResetButton"),
  scoreDialog: document.querySelector("#scoreDialog"),
  scoreTierLabel: document.querySelector("#scoreTierLabel"),
  scoreTargetValue: document.querySelector("#scoreTargetValue"),
  scoreTargetPoints: document.querySelector("#scoreTargetPoints"),
  scoreDiceValues: document.querySelector("#scoreDiceValues"),
  expressionInput: document.querySelector("#expressionInput"),
  teamPicker: document.querySelector("#teamPicker"),
  resultDialog: document.querySelector("#resultDialog"),
  resultTitle: document.querySelector("#resultTitle"),
  resultDescription: document.querySelector("#resultDescription"),
  resultRanking: document.querySelector("#resultRanking"),
  resultNewGameButton: document.querySelector("#resultNewGameButton"),
  toast: document.querySelector("#toast"),
};

let state = null;
let pendingTarget = null;
let timerId = null;
let toastId = null;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function secureRandomInt(maxExclusive) {
  if (maxExclusive <= 1) return 0;
  if (window.crypto?.getRandomValues) {
    const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
    const values = new Uint32Array(1);
    do {
      window.crypto.getRandomValues(values);
    } while (values[0] >= limit);
    return values[0] % maxExclusive;
  }
  return Math.floor(Math.random() * maxExclusive);
}

function shuffle(values) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = secureRandomInt(index + 1);
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function createTierState(config) {
  const cards = shuffle(
    config.cards.map(([value, points], index) => ({
      id: `${config.id}-${index}-${value}`,
      value,
      points,
      tierId: config.id,
    })),
  );

  return {
    board: cards.slice(0, config.slots),
    deck: cards.slice(config.slots),
    ended: false,
  };
}

function makeTeams(count, names) {
  return Array.from({ length: count }, (_, index) => ({
    name: names[index] || `${index + 1}조`,
    score: 0,
    solved: 0,
    color: TEAM_COLORS[index],
  }));
}

function normalizeTimerSeconds(value) {
  return Math.max(0, Math.min(600, Math.round(Number(value) || 0)));
}

function syncTimerPresetOption(seconds) {
  const value = String(seconds);
  const customOption = elements.timerPreset.querySelector("[data-custom-timer]");
  let option = [...elements.timerPreset.options].find((item) => item.value === value);
  if (option) {
    if (customOption && customOption !== option) customOption.remove();
    elements.timerPreset.value = value;
    return;
  }
  customOption?.remove();
  option = [...elements.timerPreset.options].find((item) => item.value === value);
  if (!option) {
    option = document.createElement("option");
    option.value = value;
    option.textContent = `${seconds}초`;
    option.dataset.customTimer = "true";
    elements.timerPreset.append(option);
  }
  elements.timerPreset.value = value;
}

function createInitialState(teamCount, names, timerSeconds) {
  return {
    version: 1,
    started: true,
    teams: makeTeams(teamCount, names),
    tiers: Object.fromEntries(TIER_CONFIG.map((config) => [config.id, createTierState(config)])),
    dice: { six: null, eight: null, twelve: null },
    diceRound: 0,
    solvedCount: 0,
    log: [],
    history: [],
    finished: false,
    endedTierId: null,
    timer: {
      duration: timerSeconds,
      remaining: timerSeconds,
      running: false,
      endsAt: null,
    },
  };
}

function buildNameFields(count, names = []) {
  elements.teamNameFields.innerHTML = Array.from({ length: count }, (_, index) => `
    <label class="name-field" style="--team-color:${TEAM_COLORS[index]}">
      <span class="name-number">${index + 1}</span>
      <input type="text" maxlength="16" value="${escapeHtml(names[index] || `${index + 1}조`)}" aria-label="${index + 1}조 이름" />
    </label>
  `).join("");
}

function readTeamNames() {
  return [...elements.teamNameFields.querySelectorAll("input")].map(
    (input, index) => input.value.trim() || `${index + 1}조`,
  );
}

function saveState() {
  if (!state) return;
  const saved = structuredClone(state);
  if (saved.timer.running && saved.timer.endsAt) {
    saved.timer.remaining = Math.max(0, (saved.timer.endsAt - Date.now()) / 1000);
  }
  saved.timer.running = false;
  saved.timer.endsAt = null;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!parsed || parsed.version !== 1 || !parsed.started) return null;
    parsed.timer.running = false;
    parsed.timer.endsAt = null;
    parsed.history ||= [];
    parsed.log ||= [];
    return parsed;
  } catch {
    return null;
  }
}

function showToast(message) {
  window.clearTimeout(toastId);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  toastId = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 2200);
}

function getTierConfig(tierId) {
  return TIER_CONFIG.find((tier) => tier.id === tierId);
}

function getRemainingCount() {
  return TIER_CONFIG.reduce((sum, config) => {
    const tier = state.tiers[config.id];
    return sum + tier.deck.length + tier.board.filter((card) => card && !card.end).length;
  }, 0);
}

function getLeaderText() {
  if (!state.teams.some((team) => team.score > 0)) return "아직 없음";
  const topScore = Math.max(...state.teams.map((team) => team.score));
  const leaders = state.teams.filter((team) => team.score === topScore);
  return `${leaders.map((team) => team.name).join(" · ")} ${topScore}점`;
}

function renderTargetPyramid() {
  elements.targetPyramid.innerHTML = TIER_CONFIG.map((config) => {
    const tier = state.tiers[config.id];
    const cards = tier.board.map((card, slotIndex) => {
      if (!card || card.end) {
        return `
          <button class="target-card is-end" type="button" disabled aria-label="${config.label} 단계 종료">
            <strong>END</strong>
          </button>
        `;
      }

      return `
        <button
          class="target-card"
          type="button"
          data-tier-id="${config.id}"
          data-slot-index="${slotIndex}"
          aria-label="${card.value}, ${card.points}점"
        >
          <strong>${card.value}</strong>
          <small>${card.points}점</small>
        </button>
      `;
    }).join("");

    return `
      <div class="target-row tier-${config.id}">
        <div class="tier-meta"><strong>${config.label}</strong><span>${config.pointLabel}</span></div>
        <div class="target-cards" style="--slot-count:${config.slots}">
          ${cards}
        </div>
      </div>
    `;
  }).join("");
}

function renderScores() {
  elements.scoreGrid.dataset.teamCount = state.teams.length;
  elements.scoreGrid.innerHTML = state.teams.map((team) => `
    <article class="team-card" style="--team-color:${team.color}">
      <span>${escapeHtml(team.name)}</span>
      <strong>${team.score}</strong>
      <small>해독 ${team.solved}장</small>
    </article>
  `).join("");
}

function renderHistory() {
  elements.historyCount.textContent = `${state.log.length}건`;
  if (!state.log.length) {
    elements.historyList.innerHTML = '<li class="empty-history">아직 해독한 숫자가 없습니다.</li>';
    return;
  }

  elements.historyList.innerHTML = state.log.slice(0, 20).map((entry) => `
    <li class="tier-${entry.tierId}">
      <span>${entry.value}</span>
      <div>
        <strong>${escapeHtml(entry.teamName)} · +${entry.points}점</strong>
        ${entry.expression ? `<div>${escapeHtml(entry.expression)}</div>` : ""}
      </div>
      <em>#${entry.number}</em>
    </li>
  `).join("");
}

function renderDice() {
  elements.dieSix.textContent = state.dice.six ?? "?";
  elements.dieEight.textContent = state.dice.eight ?? "?";
  elements.dieTwelve.textContent = state.dice.twelve ?? "?";
  elements.roundCount.textContent = state.diceRound;
  elements.diceRoundBadge.textContent = state.diceRound;

  const hasDice = Object.values(state.dice).every((value) => Number.isInteger(value));
  elements.diceHint.textContent = hasDice
    ? `${state.dice.six}, ${state.dice.eight}, ${state.dice.twelve} 중 두 수 또는 세 수를 사용하세요.`
    : "두 수 또는 세 수를 골라 사칙연산으로 목표 숫자를 만드세요.";
}

function syncTimer() {
  if (!state?.timer.running || !state.timer.endsAt) return;
  state.timer.remaining = Math.max(0, (state.timer.endsAt - Date.now()) / 1000);
  if (state.timer.remaining <= 0) {
    stopTimer();
    state.timer.remaining = 0;
    playAlarm();
    showToast("제한 시간이 끝났습니다.");
  }
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safe / 60);
  const remaining = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

function renderTimer() {
  syncTimer();
  const { duration, remaining, running } = state.timer;
  const ratio = duration > 0 ? Math.max(0, Math.min(1, remaining / duration)) : 0;
  const urgent = duration > 0 && remaining <= Math.min(10, duration * 0.2);

  elements.timerDisplay.textContent = duration === 0 ? "OFF" : formatTime(remaining);
  elements.timerDisplay.classList.toggle("is-urgent", urgent);
  elements.timerProgress.style.width = `${ratio * 100}%`;
  elements.timerProgress.classList.toggle("is-urgent", urgent);
  elements.timerToggleButton.textContent = running ? "멈춤" : remaining <= 0 ? "다시 시작" : "시작";
  syncTimerPresetOption(duration);
}

function renderStats() {
  elements.remainingCount.textContent = getRemainingCount();
  elements.solvedCount.textContent = state.solvedCount;
  elements.leaderDisplay.textContent = getLeaderText();
  elements.undoButton.disabled = state.history.length === 0;
}

function render() {
  if (!state) return;
  renderStats();
  renderTargetPyramid();
  renderScores();
  renderHistory();
  renderDice();
  renderTimer();
  elements.rollButton.disabled = state.finished;
}

function startGame() {
  const teamCount = Number(elements.teamCount.value);
  const names = readTeamNames();
  const timerSeconds = normalizeTimerSeconds(elements.setupTimerSeconds.value);
  state = createInitialState(teamCount, names, timerSeconds);
  syncTimerPresetOption(timerSeconds);
  document.body.classList.add("is-playing");
  elements.gamePanel.hidden = false;
  stopTimer();
  saveState();
  render();
  showToast("게임을 준비했습니다. 주사위를 던져 시작하세요.");
}

function showSetup() {
  stopTimer();
  state = null;
  pendingTarget = null;
  localStorage.removeItem(STORAGE_KEY);
  document.body.classList.remove("is-playing");
  elements.gamePanel.hidden = true;
  elements.resultDialog.close();
  elements.scoreDialog.close();
  buildNameFields(Number(elements.teamCount.value));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function requestNewGame() {
  if (state && !state.finished && (state.solvedCount > 0 || state.diceRound > 0)) {
    const confirmed = window.confirm("현재 점수와 기록을 지우고 새 게임을 시작할까요?");
    if (!confirmed) return;
  }
  showSetup();
}

function rollDice() {
  if (!state || state.finished) return;
  state.dice = {
    six: secureRandomInt(6) + 1,
    eight: secureRandomInt(8) + 1,
    twelve: secureRandomInt(12) + 1,
  };
  state.diceRound += 1;

  elements.diceRow.querySelectorAll(".poly-die").forEach((die) => {
    die.classList.remove("is-rolling");
    void die.offsetWidth;
    die.classList.add("is-rolling");
  });

  if (state.timer.duration > 0) {
    startTimer(true);
  }
  saveState();
  render();
}

function stopTimer() {
  window.clearInterval(timerId);
  timerId = null;
  if (state?.timer) {
    if (state.timer.running && state.timer.endsAt) {
      state.timer.remaining = Math.max(0, (state.timer.endsAt - Date.now()) / 1000);
    }
    state.timer.running = false;
    state.timer.endsAt = null;
  }
}

function startTimer(reset = false) {
  if (!state || state.timer.duration <= 0) return;
  if (reset || state.timer.remaining <= 0) state.timer.remaining = state.timer.duration;
  state.timer.running = true;
  state.timer.endsAt = Date.now() + state.timer.remaining * 1000;
  window.clearInterval(timerId);
  timerId = window.setInterval(() => {
    renderTimer();
    if (!state.timer.running) {
      saveState();
      renderTimer();
    }
  }, 200);
  renderTimer();
}

function toggleTimer() {
  if (!state || state.timer.duration <= 0) return;
  if (state.timer.running) {
    stopTimer();
    saveState();
    renderTimer();
    return;
  }
  startTimer();
}

function resetTimer() {
  if (!state) return;
  stopTimer();
  state.timer.remaining = state.timer.duration;
  saveState();
  renderTimer();
}

function changeTimerPreset() {
  if (!state) return;
  stopTimer();
  state.timer.duration = Number(elements.timerPreset.value);
  state.timer.remaining = state.timer.duration;
  saveState();
  renderTimer();
}

function playAlarm() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    [0, 0.18].forEach((delay) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 680;
      gain.gain.setValueAtTime(0.0001, context.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + delay + 0.14);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(context.currentTime + delay);
      oscillator.stop(context.currentTime + delay + 0.15);
    });
  } catch {
    // 소리를 지원하지 않는 환경에서는 화면 알림만 사용합니다.
  }
}

function openScoreDialog(tierId, slotIndex) {
  if (!state || state.finished) return;
  const config = getTierConfig(tierId);
  const card = state.tiers[tierId].board[slotIndex];
  if (!config || !card || card.end) return;

  pendingTarget = { tierId, slotIndex, cardId: card.id };
  elements.scoreTierLabel.textContent = `${config.label} 난이도 · ${config.pointLabel}`;
  elements.scoreTargetValue.textContent = card.value;
  elements.scoreTargetPoints.textContent = card.points;
  elements.expressionInput.value = "";

  const diceValues = Object.values(state.dice);
  elements.scoreDiceValues.textContent = diceValues.every(Number.isInteger)
    ? `${state.dice.six} · ${state.dice.eight} · ${state.dice.twelve}`
    : "아직 던지지 않음";

  elements.teamPicker.innerHTML = state.teams.map((team, index) => `
    <button class="team-pick-button" type="button" data-team-index="${index}" style="--team-color:${team.color}">
      <span>${index + 1}</span>
      <div><strong>${escapeHtml(team.name)}</strong><small>현재 ${team.score}점</small></div>
    </button>
  `).join("");

  elements.scoreDialog.showModal();
  window.setTimeout(() => elements.expressionInput.focus(), 0);
}

function snapshotForUndo(label) {
  const { history, ...rest } = state;
  state.history.push({ label, data: structuredClone(rest) });
  if (state.history.length > 60) state.history.shift();
}

function awardTarget(teamIndex) {
  if (!state || !pendingTarget || state.finished) return;
  const { tierId, slotIndex, cardId } = pendingTarget;
  const tier = state.tiers[tierId];
  const card = tier.board[slotIndex];
  const team = state.teams[teamIndex];
  if (!card || card.end || card.id !== cardId || !team) return;

  stopTimer();
  snapshotForUndo(`${team.name} ${card.value} 득점`);
  const expression = elements.expressionInput.value.trim();
  team.score += card.points;
  team.solved += 1;
  state.solvedCount += 1;
  state.log.unshift({
    number: state.solvedCount,
    teamName: team.name,
    teamIndex,
    value: card.value,
    points: card.points,
    tierId,
    expression,
    dice: structuredClone(state.dice),
  });

  if (tier.deck.length > 0) {
    tier.board[slotIndex] = tier.deck.shift();
  } else {
    tier.board[slotIndex] = { end: true, tierId };
    tier.ended = true;
    state.finished = true;
    state.endedTierId = tierId;
    stopTimer();
  }

  pendingTarget = null;
  elements.scoreDialog.close();
  saveState();
  render();
  showToast(`${team.name} +${card.points}점 · ${card.value} 해독`);

  if (state.finished) {
    window.setTimeout(showResult, 250);
  }
}

function undoScore() {
  if (!state || !state.history.length) return;
  stopTimer();
  const history = [...state.history];
  const previous = history.pop();
  state = { ...structuredClone(previous.data), history };
  saveState();
  render();
  showToast(`${previous.label}을(를) 되돌렸습니다.`);
}

function showResult() {
  if (!state?.finished) return;
  const ranking = state.teams
    .map((team, index) => ({ ...team, index }))
    .sort((a, b) => b.score - a.score || b.solved - a.solved || a.index - b.index);
  const topScore = ranking[0].score;
  const winners = ranking.filter((team) => team.score === topScore);
  const tier = getTierConfig(state.endedTierId);

  elements.resultTitle.textContent = winners.length === 1
    ? `${winners[0].name} 우승!`
    : `${winners.map((team) => team.name).join(" · ")} 공동 우승!`;
  elements.resultDescription.textContent =
    `${tier?.label || ""} 난이도 카드에서 END가 나왔습니다. 총 ${state.solvedCount}개의 암호를 해독했습니다.`;
  elements.resultRanking.innerHTML = ranking.map((team, index) => `
    <div class="ranking-row">
      <span>${index + 1}위</span>
      <span>${escapeHtml(team.name)} · ${team.solved}장</span>
      <strong>${team.score}점</strong>
    </div>
  `).join("");
  elements.resultDialog.showModal();
}

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch {
    showToast("이 브라우저에서는 전체 화면을 사용할 수 없습니다.");
  }
}

function closeDialogFromButton(event) {
  const button = event.target.closest("[data-close-dialog]");
  if (!button) return;
  button.closest("dialog")?.close();
}

elements.teamCount.addEventListener("change", () => {
  const previousNames = readTeamNames();
  buildNameFields(Number(elements.teamCount.value), previousNames);
});
elements.resetNamesButton.addEventListener("click", () => buildNameFields(Number(elements.teamCount.value)));
elements.startButton.addEventListener("click", startGame);
elements.rulesButton.addEventListener("click", () => elements.rulesDialog.showModal());
elements.fullscreenButton.addEventListener("click", toggleFullscreen);
elements.newGameButton.addEventListener("click", requestNewGame);
elements.rollButton.addEventListener("click", rollDice);
elements.timerToggleButton.addEventListener("click", toggleTimer);
elements.timerResetButton.addEventListener("click", resetTimer);
elements.timerPreset.addEventListener("change", changeTimerPreset);
elements.undoButton.addEventListener("click", undoScore);
elements.resultNewGameButton.addEventListener("click", showSetup);
elements.targetPyramid.addEventListener("click", (event) => {
  const card = event.target.closest("[data-tier-id]");
  if (card) openScoreDialog(card.dataset.tierId, Number(card.dataset.slotIndex));
});
elements.teamPicker.addEventListener("click", (event) => {
  const button = event.target.closest("[data-team-index]");
  if (button) awardTarget(Number(button.dataset.teamIndex));
});
document.addEventListener("click", closeDialogFromButton);
document.addEventListener("fullscreenchange", () => {
  elements.fullscreenButton.textContent = document.fullscreenElement ? "전체 화면 종료" : "전체 화면";
});
document.addEventListener("keydown", (event) => {
  if (event.code === "Space" && state && !state.finished && !elements.scoreDialog.open && !elements.rulesDialog.open) {
    event.preventDefault();
    rollDice();
  }
  if (event.key.toLowerCase() === "t" && state && !elements.scoreDialog.open && !elements.rulesDialog.open) {
    toggleTimer();
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && state) {
    event.preventDefault();
    undoScore();
  }
});

window.__pharaohCodeDebug = {
  getState: () => structuredClone(state),
  startGame: (teamCount = 6, timerSeconds = 60) => {
    state = createInitialState(
      teamCount,
      Array.from({ length: teamCount }, (_, index) => `${index + 1}조`),
      timerSeconds,
    );
    document.body.classList.add("is-playing");
    elements.gamePanel.hidden = false;
    saveState();
    render();
  },
  rollDice,
  awardTarget: (tierId, slotIndex, teamIndex = 0, expression = "") => {
    const card = state?.tiers?.[tierId]?.board?.[slotIndex];
    if (!card) return;
    pendingTarget = { tierId, slotIndex, cardId: card.id };
    elements.expressionInput.value = expression;
    awardTarget(teamIndex);
  },
  undoScore,
  getTierConfig: () => structuredClone(TIER_CONFIG),
  clearSavedGame: () => localStorage.removeItem(STORAGE_KEY),
};

buildNameFields(Number(elements.teamCount.value));
state = loadState();
if (state) {
  document.body.classList.add("is-playing");
  elements.gamePanel.hidden = false;
  syncTimerPresetOption(state.timer.duration);
  render();
} else {
  state = null;
}
