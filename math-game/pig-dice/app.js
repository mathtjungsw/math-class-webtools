const PLAYER_COLORS = [
  "#e95470",
  "#39749e",
  "#218065",
  "#b56a2f",
  "#7861ad",
  "#d48026",
  "#2f8b91",
  "#bb4d92",
  "#66784a",
  "#5d6c89",
];

const $ = (selector) => document.querySelector(selector);

const elements = {
  setupPanel: $("#setupPanel"),
  gamePanel: $("#gamePanel"),
  learnPanel: $("#learnPanel"),
  variantGamePanel: $("#variantGamePanel"),
  playerCount: $("#playerCount"),
  targetScore: $("#targetScore"),
  playerNameFields: $("#playerNameFields"),
  shuffleNamesButton: $("#shuffleNamesButton"),
  startButton: $("#startButton"),
  newGameButton: $("#newGameButton"),
  rulesButton: $("#rulesButton"),
  rulesDialog: $("#rulesDialog"),
  winnerDialog: $("#winnerDialog"),
  scoreboard: $("#scoreboard"),
  targetScoreDisplay: $("#targetScoreDisplay"),
  turnNumber: $("#turnNumber"),
  currentPlayerName: $("#currentPlayerName"),
  die: $("#die"),
  statusMessage: $("#statusMessage"),
  turnScore: $("#turnScore"),
  rollButton: $("#rollButton"),
  holdButton: $("#holdButton"),
  expectedChange: $("#expectedChange"),
  expectationHint: $("#expectationHint"),
  rollCount: $("#rollCount"),
  oneCount: $("#oneCount"),
  oneRate: $("#oneRate"),
  historyList: $("#historyList"),
  winnerName: $("#winnerName"),
  winnerSummary: $("#winnerSummary"),
  rematchButton: $("#rematchButton"),
  changeSettingsButton: $("#changeSettingsButton"),
  riskScoreSlider: $("#riskScoreSlider"),
  riskScoreValue: $("#riskScoreValue"),
  decisionChip: $("#decisionChip"),
  outcomeGrid: $("#outcomeGrid"),
  formulaScore: $("#formulaScore"),
  formulaResult: $("#formulaResult"),
  labExplanation: $("#labExplanation"),
  variantSelect: $("#variantSelect"),
  diceCountControl: $("#diceCountControl"),
  diceCountSlider: $("#diceCountSlider"),
  diceCountValue: $("#diceCountValue"),
  variantDescription: $("#variantDescription"),
  bustProbability: $("#bustProbability"),
  bustPercent: $("#bustPercent"),
  safeProbability: $("#safeProbability"),
  safePercent: $("#safePercent"),
  experimentCount: $("#experimentCount"),
  experimentRate: $("#experimentRate"),
  riskMeterFill: $("#riskMeterFill"),
  simulateVariantButton: $("#simulateVariantButton"),
  checkQuizButton: $("#checkQuizButton"),
  quizSummary: $("#quizSummary"),
  printWorksheetButton: $("#printWorksheetButton"),
  printWorksheetButtonBottom: $("#printWorksheetButtonBottom"),
  playSelectedVariantButton: $("#playSelectedVariantButton"),
  variantSetupPanel: $("#variantSetupPanel"),
  variantPlayPanel: $("#variantPlayPanel"),
  variantGameRule: $("#variantGameRule"),
  variantGameDiceCountField: $("#variantGameDiceCountField"),
  variantGameDiceCount: $("#variantGameDiceCount"),
  variantSetupBustRate: $("#variantSetupBustRate"),
  variantSetupDescription: $("#variantSetupDescription"),
  variantPlayerCount: $("#variantPlayerCount"),
  variantTargetScore: $("#variantTargetScore"),
  variantPlayerNameFields: $("#variantPlayerNameFields"),
  startVariantGameButton: $("#startVariantGameButton"),
  activeVariantRuleName: $("#activeVariantRuleName"),
  activeVariantRuleDescription: $("#activeVariantRuleDescription"),
  changeVariantSettingsButton: $("#changeVariantSettingsButton"),
  variantTargetDisplay: $("#variantTargetDisplay"),
  variantTurnNumber: $("#variantTurnNumber"),
  variantScoreboard: $("#variantScoreboard"),
  variantCurrentPlayer: $("#variantCurrentPlayer"),
  variantDiceRow: $("#variantDiceRow"),
  variantStatusMessage: $("#variantStatusMessage"),
  variantTurnScore: $("#variantTurnScore"),
  variantScoreHint: $("#variantScoreHint"),
  variantRollButton: $("#variantRollButton"),
  variantHoldButton: $("#variantHoldButton"),
  activeVariantBustRate: $("#activeVariantBustRate"),
  activeVariantSafeRate: $("#activeVariantSafeRate"),
  variantActualBustRate: $("#variantActualBustRate"),
  variantBustCount: $("#variantBustCount"),
  variantRollCount: $("#variantRollCount"),
  variantHistoryList: $("#variantHistoryList"),
  variantWinnerDialog: $("#variantWinnerDialog"),
  variantWinnerName: $("#variantWinnerName"),
  variantWinnerSummary: $("#variantWinnerSummary"),
  variantRematchButton: $("#variantRematchButton"),
  variantChangeSettingsButton: $("#variantChangeSettingsButton"),
};

let state = null;
let animationTimer = null;
let gameView = "setup";
let variantGameState = null;
let variantGameView = "setup";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function currentNameValues() {
  return [...elements.playerNameFields.querySelectorAll("input")].map((input) => input.value);
}

function renderNameFields(preferredNames = currentNameValues()) {
  const count = Number(elements.playerCount.value);
  elements.playerNameFields.innerHTML = Array.from({ length: count }, (_, index) => {
    const name = preferredNames[index]?.trim() || `플레이어 ${index + 1}`;
    return `
      <label class="player-name-field" style="--player-color: ${PLAYER_COLORS[index]}">
        <span class="player-color">P${index + 1}</span>
        <input type="text" maxlength="18" value="${escapeHtml(name)}" aria-label="플레이어 ${index + 1} 이름" />
      </label>
    `;
  }).join("");
}

function normalizedTarget() {
  const value = Number(elements.targetScore.value);
  const target = Number.isFinite(value) ? Math.min(500, Math.max(20, Math.round(value))) : 100;
  elements.targetScore.value = target;
  return target;
}

function buildPlayers(names) {
  return names.map((name, index) => ({
    name: name.trim() || `플레이어 ${index + 1}`,
    score: 0,
    color: PLAYER_COLORS[index],
  }));
}

function initializeGame(names = currentNameValues()) {
  state = {
    players: buildPlayers(names),
    target: normalizedTarget(),
    currentIndex: 0,
    turnScore: 0,
    turnNumber: 1,
    rollCount: 0,
    oneCount: 0,
    history: [],
    gameOver: false,
    busy: false,
    dieValue: 5,
    status: {
      text: "주사위를 던져 이번 턴의 점수를 모으세요.",
      tone: "",
    },
  };
  gameView = "play";

  elements.setupPanel.hidden = true;
  elements.gamePanel.hidden = false;
  elements.learnPanel.hidden = true;
  elements.variantGamePanel.hidden = true;
  renderGame();
  window.scrollTo({ top: 0, behavior: "smooth" });
  window.setTimeout(() => elements.rollButton.focus(), 250);
}

function renderGame() {
  if (!state) return;
  const currentPlayer = state.players[state.currentIndex];

  elements.targetScoreDisplay.textContent = `${state.target}점`;
  elements.turnNumber.textContent = state.turnNumber;
  elements.currentPlayerName.textContent = currentPlayer.name;
  elements.currentPlayerName.closest(".turn-banner").style.setProperty("--current-color", currentPlayer.color);
  elements.turnScore.textContent = state.turnScore;
  elements.die.dataset.value = state.dieValue;
  elements.die.setAttribute("aria-label", `주사위 눈 ${state.dieValue}`);
  elements.statusMessage.textContent = state.status.text;
  elements.statusMessage.className = `status-message ${state.status.tone}`.trim();

  elements.scoreboard.innerHTML = state.players.map((player, index) => {
    const isActive = index === state.currentIndex && !state.gameOver;
    const isWinner = state.gameOver && player.score >= state.target;
    return `
      <article class="player-card ${isActive ? "active" : ""} ${isWinner ? "winner" : ""}" style="--player-color: ${player.color}">
        <p title="${escapeHtml(player.name)}">${escapeHtml(player.name)}</p>
        <strong>${player.score}</strong><small>점</small>
        ${isActive ? '<span class="active-label">진행 중</span>' : ""}
        ${isWinner ? '<span class="active-label">우승</span>' : ""}
      </article>
    `;
  }).join("");

  elements.rollButton.disabled = state.busy || state.gameOver;
  elements.holdButton.disabled = state.busy || state.gameOver || state.turnScore === 0;
  renderMathInsight();
  renderStats();
  renderHistory();
}

function renderMathInsight() {
  const change = (20 - state.turnScore) / 6;
  const rounded = Math.abs(change) < 0.005 ? 0 : change;
  elements.expectedChange.textContent = `${rounded > 0 ? "+" : ""}${rounded.toFixed(2)}점`;
  elements.expectedChange.classList.toggle("negative", rounded < 0);

  if (rounded > 0) {
    elements.expectationHint.textContent = "현재는 평균적으로 점수가 늘어나는 구간이에요.";
  } else if (rounded < 0) {
    elements.expectationHint.textContent = "위험에 비해 기대 변화가 작아진 구간이에요.";
  } else {
    elements.expectationHint.textContent = "기대 변화가 0이 되는 경계예요. 위험 선호가 선택을 가릅니다.";
  }
}

function renderStats() {
  elements.rollCount.textContent = state.rollCount;
  elements.oneCount.textContent = state.oneCount;
  elements.oneRate.textContent = state.rollCount
    ? `${((state.oneCount / state.rollCount) * 100).toFixed(1)}%`
    : "—";
}

function renderHistory() {
  if (!state.history.length) {
    elements.historyList.innerHTML = '<li class="empty-history">아직 기록이 없습니다.</li>';
    return;
  }

  elements.historyList.innerHTML = state.history.slice(0, 12).map((item) => {
    if (item.type === "hold") {
      return `
        <li>
          <span class="history-value">✓</span>
          <span><strong>${escapeHtml(item.player)}</strong> · ${item.points}점 저장, 총 ${item.total}점</span>
        </li>
      `;
    }

    const bustClass = item.value === 1 ? "bust" : "";
    const detail = item.value === 1
      ? `1이 나와 이번 턴 ${item.lost}점을 잃음`
      : `${item.value} 획득, 이번 턴 ${item.turnTotal}점`;
    return `
      <li>
        <span class="history-value ${bustClass}">${item.value}</span>
        <span><strong>${escapeHtml(item.player)}</strong> · ${detail}</span>
      </li>
    `;
  }).join("");
}

function setRandomDieFace() {
  const value = Math.floor(Math.random() * 6) + 1;
  elements.die.dataset.value = value;
  elements.die.setAttribute("aria-label", `굴러가는 주사위 눈 ${value}`);
}

function secureDieRoll() {
  if (window.crypto?.getRandomValues) {
    const value = new Uint32Array(1);
    window.crypto.getRandomValues(value);
    return (value[0] % 6) + 1;
  }
  return Math.floor(Math.random() * 6) + 1;
}

async function rollDice() {
  if (!state || state.busy || state.gameOver) return;
  state.busy = true;
  state.status = { text: "주사위가 데굴데굴…", tone: "" };
  renderGame();

  elements.die.classList.remove("rolling");
  void elements.die.offsetWidth;
  elements.die.classList.add("rolling");
  animationTimer = window.setInterval(setRandomDieFace, 75);
  await new Promise((resolve) => window.setTimeout(resolve, 610));
  window.clearInterval(animationTimer);
  elements.die.classList.remove("rolling");

  const value = secureDieRoll();
  const player = state.players[state.currentIndex];
  state.dieValue = value;
  state.rollCount += 1;

  if (value === 1) {
    const lost = state.turnScore;
    state.oneCount += 1;
    state.turnScore = 0;
    state.history.unshift({ type: "roll", player: player.name, value, lost });
    state.status = {
      text: lost ? `아차, 1! 이번 턴 ${lost}점이 사라졌어요.` : "1이 나왔어요. 다음 플레이어 차례입니다.",
      tone: "bust",
    };
    renderGame();
    await new Promise((resolve) => window.setTimeout(resolve, 950));
    nextPlayer();
    return;
  }

  state.turnScore += value;
  state.history.unshift({
    type: "roll",
    player: player.name,
    value,
    turnTotal: state.turnScore,
  });
  state.status = { text: `${value}점 획득! 더 굴릴까요, 여기서 멈출까요?`, tone: "gain" };
  state.busy = false;
  renderGame();
}

function holdScore() {
  if (!state || state.busy || state.gameOver || state.turnScore === 0) return;
  state.busy = true;
  const player = state.players[state.currentIndex];
  const saved = state.turnScore;
  player.score += saved;
  state.turnScore = 0;
  state.history.unshift({
    type: "hold",
    player: player.name,
    points: saved,
    total: player.score,
  });

  if (player.score >= state.target) {
    state.gameOver = true;
    state.status = { text: `${player.name} 승리!`, tone: "gain" };
    renderGame();
    showWinner(player, saved);
    return;
  }

  state.status = { text: `${saved}점을 안전하게 저장했습니다.`, tone: "gain" };
  renderGame();
  window.setTimeout(nextPlayer, 520);
}

function nextPlayer() {
  if (!state || state.gameOver) return;
  state.currentIndex = (state.currentIndex + 1) % state.players.length;
  state.turnNumber += 1;
  state.turnScore = 0;
  state.busy = false;
  state.status = {
    text: `${state.players[state.currentIndex].name}, 주사위를 던져 주세요.`,
    tone: "",
  };
  renderGame();
  elements.rollButton.focus({ preventScroll: true });
}

function showWinner(player, finalTurnScore) {
  elements.winnerName.textContent = player.name;
  elements.winnerSummary.textContent = `마지막 턴에 ${finalTurnScore}점을 저장해 총 ${player.score}점으로 목표를 달성했습니다.`;
  window.setTimeout(() => elements.winnerDialog.showModal(), 350);
}

function returnToSetup() {
  if (elements.winnerDialog.open) elements.winnerDialog.close();
  if (state) {
    elements.playerCount.value = state.players.length;
    elements.targetScore.value = state.target;
    renderNameFields(state.players.map((player) => player.name));
  }
  gameView = "setup";
  elements.gamePanel.hidden = true;
  elements.setupPanel.hidden = false;
  elements.learnPanel.hidden = true;
  elements.variantGamePanel.hidden = true;
  setModeTabState("game");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function requestNewGame() {
  if (state && !state.gameOver && !elements.gamePanel.hidden) {
    const confirmed = window.confirm("진행 중인 점수와 기록이 사라집니다. 새 게임을 준비할까요?");
    if (!confirmed) return;
  }
  returnToSetup();
}

elements.playerCount.addEventListener("change", () => renderNameFields());

elements.shuffleNamesButton.addEventListener("click", () => {
  const names = currentNameValues();
  for (let index = names.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [names[index], names[randomIndex]] = [names[randomIndex], names[index]];
  }
  renderNameFields(names);
});

elements.startButton.addEventListener("click", () => initializeGame());
elements.rollButton.addEventListener("click", rollDice);
elements.holdButton.addEventListener("click", holdScore);
elements.newGameButton.addEventListener("click", requestNewGame);
elements.rulesButton.addEventListener("click", () => elements.rulesDialog.showModal());

elements.rematchButton.addEventListener("click", () => {
  const names = state.players.map((player) => player.name);
  elements.targetScore.value = state.target;
  elements.winnerDialog.close();
  initializeGame(names);
});

elements.changeSettingsButton.addEventListener("click", returnToSetup);

function setModeTabState(mode) {
  document.querySelectorAll("[data-mode]").forEach((button) => {
    const selected = button.dataset.mode === mode;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-selected", String(selected));
  });
}

function showMode(mode, updateHash = true) {
  const selectedMode = mode === "learn" || mode === "variant" ? mode : "game";
  setModeTabState(selectedMode);
  const learning = selectedMode === "learn";
  const variantPlaying = selectedMode === "variant";
  elements.learnPanel.hidden = !learning;
  elements.variantGamePanel.hidden = !variantPlaying;
  elements.rulesButton.hidden = learning || variantPlaying;
  elements.newGameButton.hidden = learning || variantPlaying;

  if (learning) {
    elements.setupPanel.hidden = true;
    elements.gamePanel.hidden = true;
  } else if (variantPlaying) {
    elements.setupPanel.hidden = true;
    elements.gamePanel.hidden = true;
  } else if (state && gameView === "play") {
    elements.setupPanel.hidden = true;
    elements.gamePanel.hidden = false;
  } else {
    elements.setupPanel.hidden = false;
    elements.gamePanel.hidden = true;
  }

  if (updateHash) window.history.replaceState({}, "", `#${selectedMode}`);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => showMode(button.dataset.mode));
});

function formatSigned(value) {
  const normalized = Math.abs(value) < 0.005 ? 0 : value;
  return `${normalized > 0 ? "+" : ""}${normalized.toFixed(2)}점`;
}

function renderExpectationLab() {
  const score = Number(elements.riskScoreSlider.value);
  const expected = (20 - score) / 6;
  elements.riskScoreValue.textContent = score;
  elements.formulaScore.textContent = score;
  elements.formulaResult.textContent = formatSigned(expected);

  const changes = [score === 0 ? 0 : -score, 2, 3, 4, 5, 6];
  elements.outcomeGrid.innerHTML = changes.map((change, index) => `
    <div class="outcome-card ${index === 0 ? "bust" : ""}">
      <span class="mini-die">${index + 1}</span>
      <span>확률 1/6</span>
      <strong>${change > 0 ? "+" : change < 0 ? "−" : ""}${Math.abs(change)}</strong>
      <small>${index === 0 ? "턴 점수 잃기" : "점수 얻기"}</small>
    </div>
  `).join("");

  elements.decisionChip.className = "decision-chip";
  if (score < 20) {
    elements.decisionChip.classList.add("roll");
    elements.decisionChip.innerHTML = "<small>기대값 기준</small><strong>ROLL</strong>";
    elements.labExplanation.textContent = "기대 변화가 양수이므로 한 번 더 던지는 선택이 평균적으로 유리합니다.";
  } else if (score === 20) {
    elements.decisionChip.classList.add("neutral");
    elements.decisionChip.innerHTML = "<small>기대값 0</small><strong>HOLD</strong>";
    elements.labExplanation.textContent = "기대 변화가 0인 경계입니다. 원자료의 기대값 전략은 이때부터 HOLD를 권합니다.";
  } else {
    elements.decisionChip.classList.add("hold");
    elements.decisionChip.innerHTML = "<small>기대값 기준</small><strong>HOLD</strong>";
    elements.labExplanation.textContent = "기대 변화가 음수이므로 현재 턴 점수를 안전하게 저장하는 편이 평균적으로 유리합니다.";
  }
}

const VARIANTS = PigVariantEngine.rules;
const fractionText = PigVariantEngine.fractionText;
const getVariantDetails = PigVariantEngine.getDetails;

function currentVariantDetails() {
  const key = elements.variantSelect.value;
  return getVariantDetails(key, elements.diceCountSlider.value);
}

function renderVariantLab(resetExperiment = true) {
  const details = currentVariantDetails();
  const bustRate = details.bustOutcomes / details.denominator;
  const safeRate = details.safeOutcomes / details.denominator;
  const isNVariant = details.key === "n-one";

  elements.diceCountControl.hidden = !isNVariant;
  elements.diceCountValue.textContent = `${details.dice}개`;
  elements.variantDescription.textContent = details.description;
  elements.bustProbability.textContent = fractionText(details.bustOutcomes, details.denominator);
  elements.safeProbability.textContent = fractionText(details.safeOutcomes, details.denominator);
  elements.bustPercent.textContent = `${(bustRate * 100).toFixed(1)}%`;
  elements.safePercent.textContent = `${(safeRate * 100).toFixed(1)}%`;
  elements.riskMeterFill.style.width = `${bustRate * 100}%`;

  if (resetExperiment) {
    elements.experimentCount.textContent = "—";
    elements.experimentRate.textContent = "버튼을 눌러 확인";
  }
}

function simulateVariant() {
  const details = currentVariantDetails();
  let busts = 0;
  for (let trial = 0; trial < 100; trial += 1) {
    const rolls = Array.from({ length: details.dice }, () => secureDieRoll());
    if (details.isBust(rolls)) busts += 1;
  }
  elements.experimentCount.textContent = `${busts}회 실패`;
  elements.experimentRate.textContent = `실험 확률 ${busts}%`;
}

function currentVariantPlayerNames() {
  return [...elements.variantPlayerNameFields.querySelectorAll("input")].map((input) => input.value);
}

function renderVariantPlayerNameFields(preferredNames = currentVariantPlayerNames()) {
  const count = Number(elements.variantPlayerCount.value);
  elements.variantPlayerNameFields.innerHTML = Array.from({ length: count }, (_, index) => {
    const name = preferredNames[index]?.trim() || `플레이어 ${index + 1}`;
    return `
      <label class="player-name-field" style="--player-color: ${PLAYER_COLORS[index]}">
        <span class="player-color">P${index + 1}</span>
        <input type="text" maxlength="18" value="${escapeHtml(name)}" aria-label="변형 게임 플레이어 ${index + 1} 이름" />
      </label>
    `;
  }).join("");
}

function normalizedVariantTarget() {
  const value = Number(elements.variantTargetScore.value);
  const target = Number.isFinite(value) ? Math.min(300, Math.max(20, Math.round(value))) : 50;
  elements.variantTargetScore.value = target;
  return target;
}

function variantDetailsFromSetup() {
  return getVariantDetails(elements.variantGameRule.value, elements.variantGameDiceCount.value);
}

function renderVariantGameSetup() {
  const details = variantDetailsFromSetup();
  const bustRate = details.bustOutcomes / details.denominator;
  elements.variantGameDiceCountField.hidden = details.key !== "n-one";
  elements.variantSetupBustRate.textContent = `${fractionText(details.bustOutcomes, details.denominator)} · ${(bustRate * 100).toFixed(1)}%`;
  elements.variantSetupDescription.textContent = details.description;
}

function startVariantGame(names = currentVariantPlayerNames()) {
  const details = variantDetailsFromSetup();
  variantGameState = {
    ruleKey: details.key,
    dice: details.dice,
    target: normalizedVariantTarget(),
    players: buildPlayers(names),
    currentIndex: 0,
    turnScore: 0,
    turnNumber: 1,
    rolls: Array(details.dice).fill(1),
    rollCount: 0,
    bustCount: 0,
    history: [],
    status: { text: "주사위를 던져 변형 규칙을 체험하세요.", tone: "" },
    lastResult: null,
    busy: false,
    gameOver: false,
  };
  variantGameView = "play";
  elements.variantSetupPanel.hidden = true;
  elements.variantPlayPanel.hidden = false;
  renderVariantGame();
  window.scrollTo({ top: 0, behavior: "smooth" });
  window.setTimeout(() => elements.variantRollButton.focus(), 220);
}

function isVariantBustDie(details, rolls, index) {
  if (!variantGameState?.lastResult?.bust) return false;
  if (details.key === "two-double") return true;
  if (details.key === "two-six") return rolls[index] === 6;
  return rolls[index] === 1;
}

function renderVariantHistory() {
  if (!variantGameState.history.length) {
    elements.variantHistoryList.innerHTML = '<li class="empty-history">아직 기록이 없습니다.</li>';
    return;
  }

  elements.variantHistoryList.innerHTML = variantGameState.history.slice(0, 12).map((item) => {
    if (item.type === "hold") {
      return `<li><span class="history-value">✓</span><span><strong>${escapeHtml(item.player)}</strong> · ${item.points}점 저장, 총 ${item.total}점</span></li>`;
    }
    const faces = item.rolls.join("+");
    if (item.bust) {
      return `<li><span class="history-value bust">×</span><span><strong>${escapeHtml(item.player)}</strong> · ${faces}, 실패! ${item.lost}점 소멸</span></li>`;
    }
    return `<li><span class="history-value">${item.points}</span><span><strong>${escapeHtml(item.player)}</strong> · ${faces}${item.bonus ? " ×2 보너스" : ""}, 턴 ${item.turnTotal}점</span></li>`;
  }).join("");
}

function renderVariantGame() {
  if (!variantGameState) return;
  const details = getVariantDetails(variantGameState.ruleKey, variantGameState.dice);
  const currentPlayer = variantGameState.players[variantGameState.currentIndex];
  const theoreticalBustRate = details.bustOutcomes / details.denominator;

  elements.activeVariantRuleName.textContent = details.name;
  elements.activeVariantRuleDescription.textContent = details.description;
  elements.variantTargetDisplay.textContent = `${variantGameState.target}점`;
  elements.variantTurnNumber.textContent = variantGameState.turnNumber;
  elements.variantCurrentPlayer.textContent = currentPlayer.name;
  elements.variantCurrentPlayer.closest(".turn-banner").style.setProperty("--current-color", currentPlayer.color);
  elements.variantTurnScore.textContent = variantGameState.turnScore;
  elements.variantStatusMessage.textContent = variantGameState.status.text;
  elements.variantStatusMessage.className = `status-message ${variantGameState.status.tone}`.trim();
  elements.variantScoreHint.textContent = variantGameState.ruleKey === "two-one-double"
    ? "실패 눈이 없고 두 눈이 같으면 합계 점수가 두 배입니다."
    : "실패 조건이 나오면 이번 턴 점수는 사라집니다.";

  elements.variantScoreboard.innerHTML = variantGameState.players.map((player, index) => {
    const active = index === variantGameState.currentIndex && !variantGameState.gameOver;
    const winner = variantGameState.gameOver && player.score >= variantGameState.target;
    return `
      <article class="player-card ${active ? "active" : ""} ${winner ? "winner" : ""}" style="--player-color: ${player.color}">
        <p title="${escapeHtml(player.name)}">${escapeHtml(player.name)}</p>
        <strong>${player.score}</strong><small>점</small>
        ${active ? '<span class="active-label">진행 중</span>' : ""}
        ${winner ? '<span class="active-label">우승</span>' : ""}
      </article>
    `;
  }).join("");

  elements.variantDiceRow.innerHTML = variantGameState.rolls.map((value, index) => {
    const bust = isVariantBustDie(details, variantGameState.rolls, index);
    const bonus = Boolean(variantGameState.lastResult?.bonus);
    return `<span class="variant-die ${bust ? "bust" : ""} ${bonus ? "bonus" : ""}" aria-label="주사위 ${index + 1}: ${value}">${value}</span>`;
  }).join("");

  elements.activeVariantBustRate.textContent = `${(theoreticalBustRate * 100).toFixed(1)}%`;
  elements.activeVariantSafeRate.textContent = `안전 확률 ${((1 - theoreticalBustRate) * 100).toFixed(1)}%`;
  elements.variantRollCount.textContent = variantGameState.rollCount;
  elements.variantBustCount.textContent = variantGameState.bustCount;
  elements.variantActualBustRate.textContent = variantGameState.rollCount
    ? `${((variantGameState.bustCount / variantGameState.rollCount) * 100).toFixed(1)}%`
    : "—";
  elements.variantRollButton.disabled = variantGameState.busy || variantGameState.gameOver;
  elements.variantHoldButton.disabled = variantGameState.busy || variantGameState.gameOver || variantGameState.turnScore === 0;
  elements.changeVariantSettingsButton.disabled = variantGameState.busy;
  renderVariantHistory();
}

function evaluateVariantRoll(details, rolls) {
  return PigVariantEngine.evaluateRoll(details, rolls);
}

async function rollVariantDice() {
  if (!variantGameState || variantGameState.busy || variantGameState.gameOver) return;
  variantGameState.busy = true;
  variantGameState.status = { text: "변형 주사위가 데굴데굴…", tone: "" };
  variantGameState.lastResult = null;
  renderVariantGame();
  elements.variantDiceRow.querySelectorAll(".variant-die").forEach((die) => die.classList.add("rolling"));
  await new Promise((resolve) => window.setTimeout(resolve, 470));

  const details = getVariantDetails(variantGameState.ruleKey, variantGameState.dice);
  const player = variantGameState.players[variantGameState.currentIndex];
  const rolls = Array.from({ length: details.dice }, () => secureDieRoll());
  const result = evaluateVariantRoll(details, rolls);
  const lost = variantGameState.turnScore;
  variantGameState.rolls = rolls;
  variantGameState.lastResult = result;
  variantGameState.rollCount += 1;

  if (result.bust) {
    variantGameState.bustCount += 1;
    variantGameState.turnScore = 0;
    variantGameState.history.unshift({ type: "roll", player: player.name, rolls, bust: true, lost });
    variantGameState.status = { text: `실패 조건! 이번 턴 ${lost}점이 사라졌어요.`, tone: "bust" };
    renderVariantGame();
    await new Promise((resolve) => window.setTimeout(resolve, 950));
    nextVariantPlayer();
    return;
  }

  variantGameState.turnScore += result.points;
  variantGameState.history.unshift({
    type: "roll",
    player: player.name,
    rolls,
    bust: false,
    bonus: result.bonus,
    points: result.points,
    turnTotal: variantGameState.turnScore,
  });
  variantGameState.status = {
    text: result.bonus
      ? `같은 눈 보너스! ${rolls.join("+")}의 합계를 두 배로 계산해 ${result.points}점 획득!`
      : `${rolls.join("+")} = ${result.points}점 획득! 더 던질까요?`,
    tone: "gain",
  };
  variantGameState.busy = false;
  renderVariantGame();
}

function holdVariantScore() {
  if (!variantGameState || variantGameState.busy || variantGameState.gameOver || variantGameState.turnScore === 0) return;
  variantGameState.busy = true;
  const player = variantGameState.players[variantGameState.currentIndex];
  const saved = variantGameState.turnScore;
  player.score += saved;
  variantGameState.turnScore = 0;
  variantGameState.lastResult = null;
  variantGameState.history.unshift({ type: "hold", player: player.name, points: saved, total: player.score });

  if (player.score >= variantGameState.target) {
    variantGameState.gameOver = true;
    variantGameState.status = { text: `${player.name} 승리!`, tone: "gain" };
    renderVariantGame();
    elements.variantWinnerName.textContent = player.name;
    elements.variantWinnerSummary.textContent = `${saved}점을 저장해 총 ${player.score}점으로 변형 게임에서 승리했습니다.`;
    window.setTimeout(() => elements.variantWinnerDialog.showModal(), 300);
    return;
  }

  variantGameState.status = { text: `${saved}점을 안전하게 저장했습니다.`, tone: "gain" };
  renderVariantGame();
  window.setTimeout(nextVariantPlayer, 500);
}

function nextVariantPlayer() {
  if (!variantGameState || variantGameState.gameOver) return;
  variantGameState.currentIndex = (variantGameState.currentIndex + 1) % variantGameState.players.length;
  variantGameState.turnNumber += 1;
  variantGameState.turnScore = 0;
  variantGameState.lastResult = null;
  variantGameState.busy = false;
  variantGameState.status = {
    text: `${variantGameState.players[variantGameState.currentIndex].name}, 주사위를 던져 주세요.`,
    tone: "",
  };
  renderVariantGame();
  elements.variantRollButton.focus({ preventScroll: true });
}

function returnToVariantSetup() {
  if (elements.variantWinnerDialog.open) elements.variantWinnerDialog.close();
  if (variantGameState) {
    elements.variantGameRule.value = variantGameState.ruleKey;
    elements.variantGameDiceCount.value = variantGameState.dice;
    elements.variantTargetScore.value = variantGameState.target;
    elements.variantPlayerCount.value = variantGameState.players.length;
    renderVariantPlayerNameFields(variantGameState.players.map((player) => player.name));
  }
  variantGameView = "setup";
  elements.variantSetupPanel.hidden = false;
  elements.variantPlayPanel.hidden = true;
  renderVariantGameSetup();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function playSelectedVariant() {
  elements.variantGameRule.value = elements.variantSelect.value;
  elements.variantGameDiceCount.value = elements.diceCountSlider.value;
  variantGameView = "setup";
  elements.variantSetupPanel.hidden = false;
  elements.variantPlayPanel.hidden = true;
  renderVariantGameSetup();
  showMode("variant");
}

function checkQuiz() {
  const explanations = [
    "정답! (20−12)÷6 = +1.33이므로 ROLL입니다.",
    "정답! (20−x)÷6 = 0에서 x = 20입니다.",
    "정답! 1−(5/6)² = 11/36입니다.",
  ];
  let correctCount = 0;
  let answeredCount = 0;

  document.querySelectorAll(".quiz-grid fieldset").forEach((fieldset, index) => {
    const selected = fieldset.querySelector("input:checked");
    const correct = selected?.value === fieldset.dataset.answer;
    const feedback = fieldset.querySelector(".quiz-feedback");
    fieldset.classList.remove("correct", "incorrect");
    if (!selected) {
      feedback.textContent = "답을 선택해 주세요.";
      return;
    }
    answeredCount += 1;
    fieldset.classList.add(correct ? "correct" : "incorrect");
    feedback.textContent = correct ? explanations[index] : `다시 생각해 보세요. ${explanations[index].replace("정답! ", "")}`;
    if (correct) correctCount += 1;
  });

  elements.quizSummary.textContent = answeredCount < 3
    ? `${answeredCount}/3문제에 답했습니다. 나머지 문제도 골라 보세요.`
    : correctCount === 3
      ? "3문제 모두 정답! 기대값 전략을 정확히 이해했습니다."
      : `${correctCount}/3문제 정답입니다. 풀이를 확인하고 다시 도전해 보세요.`;
}

elements.riskScoreSlider.addEventListener("input", renderExpectationLab);
elements.variantSelect.addEventListener("change", () => renderVariantLab(true));
elements.diceCountSlider.addEventListener("input", () => renderVariantLab(true));
elements.simulateVariantButton.addEventListener("click", simulateVariant);
elements.checkQuizButton.addEventListener("click", checkQuiz);
elements.printWorksheetButton.addEventListener("click", () => window.print());
elements.printWorksheetButtonBottom.addEventListener("click", () => window.print());
elements.playSelectedVariantButton.addEventListener("click", playSelectedVariant);
elements.variantGameRule.addEventListener("change", renderVariantGameSetup);
elements.variantGameDiceCount.addEventListener("change", renderVariantGameSetup);
elements.variantPlayerCount.addEventListener("change", () => renderVariantPlayerNameFields());
elements.startVariantGameButton.addEventListener("click", () => startVariantGame());
elements.variantRollButton.addEventListener("click", rollVariantDice);
elements.variantHoldButton.addEventListener("click", holdVariantScore);
elements.changeVariantSettingsButton.addEventListener("click", returnToVariantSetup);
elements.variantRematchButton.addEventListener("click", () => {
  const names = variantGameState.players.map((player) => player.name);
  elements.variantWinnerDialog.close();
  startVariantGame(names);
});
elements.variantChangeSettingsButton.addEventListener("click", returnToVariantSetup);

window.addEventListener("hashchange", () => showMode(window.location.hash.slice(1), false));

document.addEventListener("keydown", (event) => {
  if (!state || elements.gamePanel.hidden || state.gameOver || elements.rulesDialog.open || elements.winnerDialog.open) return;
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) return;

  if (event.code === "Space") {
    event.preventDefault();
    rollDice();
  } else if (event.key === "Enter") {
    event.preventDefault();
    holdScore();
  }
});

document.addEventListener("keydown", (event) => {
  if (!variantGameState || elements.variantGamePanel.hidden || elements.variantPlayPanel.hidden || variantGameState.gameOver || elements.variantWinnerDialog.open) return;
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) return;
  if (event.code === "Space") {
    event.preventDefault();
    rollVariantDice();
  } else if (event.key === "Enter") {
    event.preventDefault();
    holdVariantScore();
  }
});

renderNameFields();
renderExpectationLab();
renderVariantLab();
renderVariantPlayerNameFields();
renderVariantGameSetup();
showMode(window.location.hash.slice(1), false);
