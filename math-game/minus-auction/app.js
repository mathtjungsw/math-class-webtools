const STORAGE_KEY = "mathTools.minusAuction.v2";
const TOTAL_CARDS = 33;
const TEAM_COLORS = [
  "#6f42a1",
  "#d89018",
  "#2f7b9f",
  "#d65745",
  "#218267",
  "#985276",
  "#5b70b5",
  "#bd6a2b",
  "#527b3d",
  "#776056",
];

const elements = {
  setupPanel: document.querySelector("#setupPanel"),
  gamePanel: document.querySelector("#gamePanel"),
  teamCount: document.querySelector("#teamCount"),
  startingChips: document.querySelector("#startingChips"),
  teamNameFields: document.querySelector("#teamNameFields"),
  resetNamesButton: document.querySelector("#resetNamesButton"),
  startButton: document.querySelector("#startButton"),
  newGameButton: document.querySelector("#newGameButton"),
  fullscreenButton: document.querySelector("#fullscreenButton"),
  rulesButton: document.querySelector("#rulesButton"),
  rulesDialog: document.querySelector("#rulesDialog"),
  resultDialog: document.querySelector("#resultDialog"),
  resultTitle: document.querySelector("#resultTitle"),
  resultDescription: document.querySelector("#resultDescription"),
  resultRanking: document.querySelector("#resultRanking"),
  resultNewGameButton: document.querySelector("#resultNewGameButton"),
  roundDisplay: document.querySelector("#roundDisplay"),
  remainingDisplay: document.querySelector("#remainingDisplay"),
  potDisplay: document.querySelector("#potDisplay"),
  potLarge: document.querySelector("#potLarge"),
  turnDisplay: document.querySelector("#turnDisplay"),
  turnOrderDisplay: document.querySelector("#turnOrderDisplay"),
  activeTeamName: document.querySelector("#activeTeamName"),
  numberCard: document.querySelector("#numberCard"),
  currentNumber: document.querySelector("#currentNumber"),
  numberCaption: document.querySelector("#numberCaption"),
  statusMessage: document.querySelector("#statusMessage"),
  revealButton: document.querySelector("#revealButton"),
  passButton: document.querySelector("#passButton"),
  takeButton: document.querySelector("#takeButton"),
  undoButton: document.querySelector("#undoButton"),
  undoLabel: document.querySelector("#undoLabel"),
  scoreButton: document.querySelector("#scoreButton"),
  scoreHint: document.querySelector("#scoreHint"),
  teamGrid: document.querySelector("#teamGrid"),
  activityLog: document.querySelector("#activityLog"),
  actionCount: document.querySelector("#actionCount"),
  toast: document.querySelector("#toast"),
};

let state = null;
let toastTimer = null;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function shuffle(values) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function makeDeck() {
  return shuffle(Array.from({ length: TOTAL_CARDS }, (_, index) => -(index + 3)));
}

function buildNameFields(count, names = []) {
  elements.teamNameFields.innerHTML = Array.from({ length: count }, (_, index) => {
    const name = names[index] || `${index + 1}조`;
    return `
      <label class="name-field" style="--team-color: ${TEAM_COLORS[index]}">
        <span class="name-number">${index + 1}</span>
        <input type="text" maxlength="16" value="${escapeHtml(name)}" aria-label="${index + 1}조 이름" />
      </label>
    `;
  }).join("");
}

function readNames() {
  return [...elements.teamNameFields.querySelectorAll("input")].map((input, index) => (
    input.value.trim() || `${index + 1}조`
  ));
}

function startGame() {
  const teamCount = Number(elements.teamCount.value);
  const startingChips = Math.max(1, Math.min(99, Number(elements.startingChips.value) || 30));
  const names = readNames();

  state = {
    version: 2,
    startedAt: Date.now(),
    startingChips,
    teams: Array.from({ length: teamCount }, (_, index) => ({
      name: names[index] || `${index + 1}조`,
      chips: startingChips,
      cards: [],
      color: TEAM_COLORS[index],
    })),
    deck: makeDeck(),
    currentCard: null,
    currentTeam: 0,
    round: 0,
    pot: 0,
    actionNumber: 0,
    log: [],
    history: [],
    scoreVisible: false,
    finished: false,
    status: "첫 숫자를 제시하면 경매가 시작됩니다.",
  };

  showGame();
  saveState();
  render();
  showToast("게임을 준비했습니다. 첫 숫자를 제시해 주세요.");
}

function snapshot() {
  const { history, ...rest } = state;
  return structuredClone(rest);
}

function checkpoint(label) {
  state.history.push({ label, data: snapshot() });
  if (state.history.length > 120) state.history.shift();
}

function addLog(text) {
  state.actionNumber += 1;
  state.log.unshift({ number: state.actionNumber, round: state.round, text });
  state.log = state.log.slice(0, 40);
}

function revealCard({ keepHistory = false, automatic = false } = {}) {
  if (!state || state.currentCard !== null || state.finished || state.deck.length === 0) return;
  if (!keepHistory) checkpoint("숫자 제시");

  state.currentCard = state.deck.shift();
  state.round += 1;
  const team = state.teams[state.currentTeam];
  state.status = automatic
    ? `${state.currentCard}이(가) 이어서 제시되었습니다. ${team.name}이 선택할 차례입니다.`
    : `${state.currentCard}이(가) 제시되었습니다. ${team.name}이 선택할 차례입니다.`;
  addLog(`${state.currentCard} 제시 · ${team.name} 차례`);
  state.scoreVisible = false;
  saveState();
  render({ animateCard: true });
}

function passCard() {
  if (!state || state.currentCard === null || state.finished) return;
  const team = state.teams[state.currentTeam];
  if (team.chips <= 0) {
    showToast(`${team.name}은(는) 남은 칩이 없어 낙찰을 선택해야 합니다.`);
    return;
  }

  checkpoint("낙찰 거부");
  team.chips -= 1;
  state.pot += 1;
  addLog(`${team.name} 낙찰 거부 · 칩 1개 지불`);
  state.currentTeam = (state.currentTeam + 1) % state.teams.length;
  state.status = `${team.name}이(가) 칩 1개를 냈습니다. ${state.teams[state.currentTeam].name}의 선택입니다.`;
  state.scoreVisible = false;
  saveState();
  render();
}

function takeCard() {
  if (!state || state.currentCard === null || state.finished) return;
  checkpoint("낙찰");

  const team = state.teams[state.currentTeam];
  const takenCard = state.currentCard;
  const receivedChips = state.pot;
  team.cards.push(takenCard);
  team.chips += receivedChips;
  addLog(`${team.name} 낙찰 · ${takenCard}, 칩 ${receivedChips}개 획득`);

  state.currentCard = null;
  state.pot = 0;
  state.currentTeam = (state.currentTeam + 1) % state.teams.length;
  state.scoreVisible = false;

  if (state.deck.length === 0) {
    state.finished = true;
    state.scoreVisible = true;
    state.status = "모든 숫자의 경매가 끝났습니다. 최종 총점을 확인하세요.";
    saveState();
    render();
    window.setTimeout(showResult, 250);
    return;
  }

  state.status = `${team.name}이(가) ${takenCard}을(를) 낙찰받았습니다.`;
  revealCard({ keepHistory: true, automatic: true });
}

function undoLastAction() {
  if (!state || state.history.length === 0) return;
  const history = [...state.history];
  const previous = history.pop();
  state = { ...structuredClone(previous.data), history };
  saveState();
  render();
  showToast(`${previous.label} 동작을 되돌렸습니다.`);
}

function getScoreDetails(team) {
  const sorted = [...team.cards].sort((a, b) => b - a);
  const scoringCards = sorted.filter((card, index) => index === 0 || card !== sorted[index - 1] - 1);
  const skippedCards = sorted.filter((card) => !scoringCards.includes(card));
  return {
    sorted,
    scoringCards,
    skippedCards,
    score: team.chips + scoringCards.reduce((sum, card) => sum + card, 0),
  };
}

function toggleScores() {
  if (!state) return;
  state.scoreVisible = !state.scoreVisible;
  state.status = state.scoreVisible
    ? "총점을 공개했습니다. 흐리게 표시된 연속 숫자는 합계에서 제외됩니다."
    : "총점을 다시 가렸습니다.";
  saveState();
  render();
}

function render(options = {}) {
  if (!state) return;

  const activeTeam = state.teams[state.currentTeam];
  const hasCard = state.currentCard !== null;
  const lastHistory = state.history[state.history.length - 1];

  elements.roundDisplay.textContent = `${state.round} / ${TOTAL_CARDS}`;
  elements.remainingDisplay.textContent = `${state.deck.length}개`;
  elements.potDisplay.textContent = state.pot;
  elements.potLarge.textContent = state.pot;
  elements.turnDisplay.textContent = activeTeam.name;
  elements.activeTeamName.textContent = activeTeam.name;
  elements.turnOrderDisplay.textContent = `선택 ${state.actionNumber + 1}`;
  elements.statusMessage.textContent = state.status;

  elements.currentNumber.textContent = hasCard ? state.currentCard : (state.finished ? "끝" : "준비");
  elements.numberCaption.textContent = hasCard
    ? `${state.round}번째 경매 숫자`
    : (state.finished ? "모든 경매가 끝났습니다" : "숫자를 제시해 주세요");
  elements.numberCard.classList.toggle("is-ready", !hasCard);

  if (options.animateCard) {
    elements.numberCard.classList.remove("is-flipping");
    void elements.numberCard.offsetWidth;
    elements.numberCard.classList.add("is-flipping");
  }

  elements.passButton.disabled = !hasCard || state.finished || activeTeam.chips <= 0;
  elements.takeButton.disabled = !hasCard || state.finished;
  elements.revealButton.disabled = hasCard || state.finished || state.deck.length === 0;
  elements.revealButton.querySelector("span:nth-child(2)").textContent = state.round === 0 ? "첫 숫자 제시" : "숫자 제시";
  elements.undoButton.disabled = state.history.length === 0;
  elements.undoLabel.textContent = lastHistory ? `${lastHistory.label} 되돌리기` : "되돌리기";
  elements.scoreButton.querySelector("span:first-child").textContent = state.scoreVisible ? "총점 가리기" : "총점 공개";
  elements.scoreHint.textContent = state.scoreVisible
    ? "흐리게 표시된 연속 숫자는 총점에서 제외됩니다."
    : "총점은 공개 버튼을 누를 때까지 가려집니다.";

  renderTeams();
  renderLog();
}

function renderTeams() {
  elements.teamGrid.dataset.teamCount = String(state.teams.length);
  elements.teamGrid.innerHTML = state.teams.map((team, index) => {
    const details = getScoreDetails(team);
    const chips = details.sorted.length === 0
      ? '<span class="empty-cards">아직 낙찰받은 숫자가 없습니다.</span>'
      : details.sorted.map((card) => {
        const skipped = state.scoreVisible && details.skippedCards.includes(card);
        return `<span class="number-chip${skipped ? " is-skipped" : ""}">${card}</span>`;
      }).join("");

    return `
      <article class="team-card${index === state.currentTeam && !state.finished ? " is-active" : ""}" style="--team-color: ${team.color}">
        <div class="team-card-header">
          <h3 title="${escapeHtml(team.name)}">${escapeHtml(team.name)}</h3>
          <span class="active-badge">현재 차례</span>
        </div>
        <div class="team-metrics">
          <div><span>보유 칩</span><strong>${team.chips}개</strong></div>
          <div class="team-score"><span>총점</span><strong class="${state.scoreVisible ? "" : "is-hidden"}">${state.scoreVisible ? details.score : "?"}</strong></div>
        </div>
        <div class="owned-cards">
          <span>낙찰 숫자 ${team.cards.length}개</span>
          <div class="card-chips">${chips}</div>
        </div>
      </article>
    `;
  }).join("");
}

function renderLog() {
  elements.actionCount.textContent = `${state.actionNumber}회`;
  if (state.log.length === 0) {
    elements.activityLog.innerHTML = '<li class="empty-log">아직 기록이 없습니다.</li>';
    return;
  }

  elements.activityLog.innerHTML = state.log.slice(0, 9).map((entry) => (
    `<li><span>${entry.number}</span><div>${escapeHtml(entry.text)}</div></li>`
  )).join("");
}

function showResult() {
  if (!state) return;
  state.scoreVisible = true;
  const ranking = state.teams
    .map((team) => ({ team, ...getScoreDetails(team) }))
    .sort((a, b) => b.score - a.score);
  const topScore = ranking[0].score;
  const winners = ranking.filter((item) => item.score === topScore);
  const winnerNames = winners.map((item) => item.team.name).join(", ");

  elements.resultTitle.textContent = winners.length > 1 ? `${winnerNames} 공동 우승!` : `${winnerNames} 우승!`;
  elements.resultDescription.textContent = `가장 높은 총점 ${topScore}점을 기록했습니다.`;
  elements.resultRanking.innerHTML = ranking.map((item, index) => `
    <div class="ranking-row">
      <span>${index + 1}위</span>
      <div>${escapeHtml(item.team.name)}</div>
      <strong>${item.score}점</strong>
    </div>
  `).join("");
  saveState();
  render();
  if (!elements.resultDialog.open) elements.resultDialog.showModal();
}

function showGame() {
  document.body.classList.add("is-playing");
  elements.setupPanel.hidden = true;
  elements.gamePanel.hidden = false;
}

function showSetup(names = []) {
  document.body.classList.remove("is-playing");
  elements.gamePanel.hidden = true;
  elements.setupPanel.hidden = false;
  if (names.length) {
    elements.teamCount.value = String(names.length);
    buildNameFields(names.length, names);
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function requestNewGame(force = false) {
  if (!force && state && !window.confirm("현재 게임을 끝내고 새 게임을 준비할까요?")) return;
  const names = state?.teams.map((team) => team.name) || readNames();
  if (state) elements.startingChips.value = String(state.startingChips);
  localStorage.removeItem(STORAGE_KEY);
  state = null;
  if (elements.resultDialog.open) elements.resultDialog.close();
  showSetup(names);
}

function saveState() {
  if (!state) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("게임 저장에 실패했습니다.", error);
  }
}

function restoreState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || saved.version !== 2 || !Array.isArray(saved.teams) || !Array.isArray(saved.deck)) return false;
    state = saved;
    state.history ||= [];
    state.log ||= [];
    showGame();
    render();
    showToast("이전에 진행하던 게임을 복구했습니다.");
    return true;
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
    return false;
  }
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 2600);
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
    return;
  }
  document.documentElement.requestFullscreen().catch(() => showToast("이 브라우저에서는 전체 화면을 열 수 없습니다."));
}

function dialogIsOpen() {
  return elements.rulesDialog.open || elements.resultDialog.open;
}

elements.teamCount.addEventListener("change", () => buildNameFields(Number(elements.teamCount.value), readNames()));
elements.resetNamesButton.addEventListener("click", () => buildNameFields(Number(elements.teamCount.value)));
elements.startButton.addEventListener("click", startGame);
elements.revealButton.addEventListener("click", () => revealCard());
elements.passButton.addEventListener("click", passCard);
elements.takeButton.addEventListener("click", takeCard);
elements.undoButton.addEventListener("click", undoLastAction);
elements.scoreButton.addEventListener("click", toggleScores);
elements.newGameButton.addEventListener("click", () => requestNewGame());
elements.resultNewGameButton.addEventListener("click", () => requestNewGame(true));
elements.rulesButton.addEventListener("click", () => elements.rulesDialog.showModal());
elements.fullscreenButton.addEventListener("click", toggleFullscreen);

document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => button.closest("dialog").close());
});

document.addEventListener("fullscreenchange", () => {
  elements.fullscreenButton.textContent = document.fullscreenElement ? "전체 화면 종료" : "전체 화면";
});

document.addEventListener("keydown", (event) => {
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || dialogIsOpen() || !state) return;

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    undoLastAction();
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    if (!elements.revealButton.disabled) revealCard();
  } else if (event.key.toLowerCase() === "p") {
    if (!elements.passButton.disabled) passCard();
  } else if (event.key === "Enter") {
    if (!elements.takeButton.disabled) takeCard();
  }
});

buildNameFields(Number(elements.teamCount.value));
restoreState();
