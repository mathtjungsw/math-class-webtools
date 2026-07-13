const ROWS = 10;
const players = [
  { name: "학생 1", allocations: [], crossed: [] },
  { name: "학생 2", allocations: [], crossed: [] },
  { name: "학생 3", allocations: [], crossed: [] },
  { name: "학생 4", allocations: [], crossed: [] },
];

const state = {
  diceCount: 2,
  playerCount: 2,
  bundleCount: 1,
  tokenTarget: 20,
  locked: false,
  rolling: false,
  gameOver: false,
  rollCount: 0,
  recentSums: [],
  throwHistory: [],
  simulation: { diceCount: 2, counts: [], total: 0, running: false, animationId: 0 },
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const elements = {
  tabs: $$(".tab"), panels: $$(".tab-panel"), playerCount: $("#playerCount"), diceCount: $("#diceCount"), tokenTarget: $("#tokenTarget"), bundleCount: $("#bundleCount"),
  playersGrid: $("#playersGrid"), range: $("#sumRangeText"), targetHeading: $("#targetInHeading"),
  resetSetup: $("#resetSetupButton"), lock: $("#lockButton"), roll: $("#rollButton"), rematch: $("#rematchButton"),
  diceRow: $("#diceRow"), rollCaption: $("#rollCaption"), sumDisplay: $("#sumDisplay"), rollButtonText: $("#rollButtonText"), rollCount: $("#rollCount"), recentSums: $("#recentSums"), throwHistory: $("#throwHistory"),
  rulesDialog: $("#rulesDialog"), winnerDialog: $("#winnerDialog"), winnerTitle: $("#winnerTitle"), winnerMessage: $("#winnerMessage"),
  simulationDiceCount: $("#simulationDiceCount"), simulationBatch: $("#simulationBatch"), runSimulation: $("#runSimulationButton"), resetSimulation: $("#resetSimulationButton"),
  distributionChart: $("#distributionChart"), simulationTotal: $("#simulationTotal"), simulationProgress: $("#simulationProgress"),
  chartTitle: $("#chartTitle"), expectedMean: $("#expectedMean"), mostLikelySum: $("#mostLikelySum"), mostLikelyDetail: $("#mostLikelyDetail"), shapeInsight: $("#shapeInsight"),
};

function sumsForDice(count = state.diceCount) {
  return Array.from({ length: count * 5 + 1 }, (_, index) => index + count);
}

function activePlayers() { return players.slice(0, state.playerCount); }

function totalAllocation(player) { return player.allocations.reduce((sum, value) => sum + value, 0); }
function totalCrossed(player) { return player.crossed.reduce((sum, value) => sum + value, 0); }

function resetPlayers({ keepAllocations = false } = {}) {
  const columns = sumsForDice().length;
  players.forEach((player) => {
    if (!keepAllocations || player.allocations.length !== columns) player.allocations = Array(columns).fill(0);
    player.crossed = Array(columns).fill(0);
  });
  state.locked = keepAllocations;
  state.rolling = false;
  state.gameOver = false;
  state.rollCount = 0;
  state.recentSums = [];
  state.throwHistory = [];
  elements.rollCount.textContent = "0묶음";
  elements.recentSums.textContent = "–";
  elements.sumDisplay.textContent = keepAllocations ? "전략 유지" : "준비 중";
  elements.rollCaption.textContent = keepAllocations ? "같은 전략으로 새 경기를 시작합니다." : `${state.playerCount}명이 칸을 모두 채우면 시작할 수 있어요.`;
  renderBoards();
  renderThrowHistory();
  renderDice(Array(state.diceCount).fill(1));
  updateControls();
}

function renderBoards() {
  const sums = sumsForDice();
  elements.playersGrid.innerHTML = "";
  elements.playersGrid.classList.toggle("is-stacked", state.diceCount === 4);
  activePlayers().forEach((player, playerIndex) => {
    const card = document.createElement("article");
    card.className = `player-card player-${["one", "two", "three", "four"][playerIndex]}`;
    const allocated = totalAllocation(player);
    const crossed = totalCrossed(player);
    card.innerHTML = `
      <div class="player-heading">
        <div class="player-title"><span class="player-badge">${playerIndex + 1}</span><input class="player-name" maxlength="12" aria-label="학생 ${playerIndex + 1} 이름" value="${escapeHtml(player.name)}" ${state.locked ? "disabled" : ""}></div>
        <div class="allocation-total"><strong>${allocated}</strong> / ${state.tokenTarget}칸</div>
      </div>
      <div class="board-scroll"><div class="strategy-board dice-${state.diceCount}" style="--columns:${sums.length}" role="grid" aria-label="${escapeHtml(player.name)}의 전략표"></div></div>
      <div class="board-footnote"><span>${state.locked ? "주사위 합이 나오면 X가 표시됩니다." : "빈 칸을 누르면 아래부터 채워집니다."}</span><span class="player-progress">X ${crossed} / ${state.tokenTarget}</span></div>`;
    const nameInput = card.querySelector(".player-name");
    nameInput.addEventListener("input", (event) => { player.name = event.target.value.trimStart() || `학생 ${playerIndex + 1}`; });
    const board = card.querySelector(".strategy-board");
    for (let row = ROWS; row >= 1; row -= 1) {
      sums.forEach((sum, columnIndex) => {
        const cell = document.createElement("button");
        const filled = row <= player.allocations[columnIndex];
        const isCrossed = row <= player.crossed[columnIndex];
        cell.type = "button";
        cell.className = `board-cell${filled ? " is-filled" : ""}${isCrossed ? " is-crossed" : ""}`;
        cell.setAttribute("role", "gridcell");
        cell.setAttribute("aria-label", `${sum} 열 ${row}번째 칸, ${isCrossed ? "X 표시됨" : filled ? "채움" : "비어 있음"}`);
        cell.disabled = state.locked;
        cell.addEventListener("click", () => changeAllocation(playerIndex, columnIndex, row));
        board.appendChild(cell);
      });
    }
    sums.forEach((sum) => { const label = document.createElement("div"); label.className = "sum-label"; label.textContent = sum; board.appendChild(label); });
    elements.playersGrid.appendChild(card);
  });
}

function changeAllocation(playerIndex, columnIndex, level) {
  if (state.locked) return;
  const player = players[playerIndex];
  const current = player.allocations[columnIndex];
  const next = level <= current ? level - 1 : level;
  const projected = totalAllocation(player) - current + next;
  if (projected > state.tokenTarget) {
    elements.rollCaption.textContent = `${player.name}은(는) ${state.tokenTarget}칸까지만 채울 수 있어요.`;
    return;
  }
  player.allocations[columnIndex] = next;
  player.crossed[columnIndex] = 0;
  renderBoards();
  updateControls();
}

function updateControls() {
  const everyoneReady = activePlayers().every((player) => totalAllocation(player) === state.tokenTarget);
  elements.lock.disabled = state.locked || !everyoneReady;
  elements.roll.disabled = !state.locked || state.rolling || state.gameOver;
  elements.rematch.disabled = !state.locked || state.rolling;
  elements.diceCount.disabled = state.locked;
  elements.playerCount.disabled = state.locked;
  elements.tokenTarget.disabled = state.locked;
  elements.bundleCount.disabled = state.rolling;
  elements.resetSetup.disabled = state.locked;
  elements.rollButtonText.textContent = `${state.bundleCount}묶음 던지기`;
  if (!state.locked && everyoneReady) elements.rollCaption.textContent = `${state.playerCount}명의 전략이 완성됐어요. 전략을 확정하세요!`;
}

function lockStrategies() {
  if (!activePlayers().every((player) => totalAllocation(player) === state.tokenTarget)) return;
  state.locked = true;
  elements.sumDisplay.textContent = "게임 시작!";
  elements.rollCaption.textContent = "전략을 잠갔습니다. 이제 주사위를 던져 보세요.";
  renderBoards();
  updateControls();
}

function pipPattern(value) {
  const positions = { 1: [5], 2: [1,9], 3: [1,5,9], 4: [1,3,7,9], 5: [1,3,5,7,9], 6: [1,3,4,6,7,9] };
  return Array.from({ length: 9 }, (_, index) => positions[value].includes(index + 1));
}

function renderDice(values, rolling = false) {
  elements.diceRow.innerHTML = "";
  values.forEach((value) => {
    const die = document.createElement("div");
    die.className = `result-die${rolling ? " is-rolling" : ""}`;
    die.setAttribute("aria-label", `${value}`);
    pipPattern(value).forEach((visible) => { const pip = document.createElement("i"); if (!visible) pip.className = "is-hidden"; die.appendChild(pip); });
    elements.diceRow.appendChild(die);
  });
}

function randomDie() { return Math.floor(Math.random() * 6) + 1; }

function rollDice() {
  if (!state.locked || state.rolling || state.gameOver) return;
  const bundleCount = state.bundleCount;
  state.rolling = true;
  updateControls();
  elements.rollCaption.textContent = "주사위가 구르는 중…";
  let ticks = 0;
  const timer = window.setInterval(() => {
    renderDice(Array.from({ length: state.diceCount }, randomDie), true);
    ticks += 1;
    if (ticks < 8) return;
    window.clearInterval(timer);
    const bundles = Array.from({ length: bundleCount }, () => Array.from({ length: state.diceCount }, randomDie));
    renderDice(bundles[0]);
    finishRollBatch(bundles);
  }, 80);
}

function finishRollBatch(bundles) {
  const processed = [];
  let winners = [];
  for (const values of bundles) {
    const sum = values.reduce((total, value) => total + value, 0);
    const columnIndex = sum - state.diceCount;
    const hits = [];
    activePlayers().forEach((player) => {
      if (player.crossed[columnIndex] < player.allocations[columnIndex]) {
        player.crossed[columnIndex] += 1;
        hits.push(player.name);
      }
    });
    state.rollCount += 1;
    state.recentSums.unshift(sum);
    state.throwHistory.unshift({ number: state.rollCount, values, sum, hits });
    processed.push({ values, sum, hits });
    winners = activePlayers().filter((player) => totalCrossed(player) === state.tokenTarget);
    if (winners.length) break;
  }
  state.recentSums = state.recentSums.slice(0, 10);
  const last = processed.at(-1);
  renderDice(last.values);
  elements.rollCount.textContent = `${state.rollCount.toLocaleString("ko-KR")}묶음`;
  elements.recentSums.textContent = state.recentSums.join(" · ");
  elements.sumDisplay.textContent = processed.length === 1 ? `합 ${last.sum}` : `합 ${processed.map((result) => result.sum).join(" · ")}`;
  if (winners.length && processed.length < bundles.length) {
    elements.rollCaption.textContent = `${processed.length}번째 묶음에서 승부가 결정되어 나머지 ${bundles.length - processed.length}묶음은 처리하지 않았어요.`;
  } else {
    const hitCount = processed.filter((result) => result.hits.length).length;
    elements.rollCaption.textContent = `${processed.length}묶음을 순서대로 처리했고, ${hitCount}묶음에서 X가 표시됐어요.`;
  }
  state.rolling = false;
  renderBoards();
  renderThrowHistory();
  updateControls();
  if (winners.length) announceWinner(winners);
}

function renderThrowHistory() {
  if (!state.throwHistory.length) {
    elements.throwHistory.className = "throw-history is-empty";
    elements.throwHistory.innerHTML = "<p>아직 던진 기록이 없습니다.</p>";
    return;
  }
  elements.throwHistory.className = "throw-history";
  elements.throwHistory.innerHTML = state.throwHistory.map((entry) => {
    const hitText = entry.hits.length ? `${entry.hits.map(escapeHtml).join(", ")} X 표시` : "남은 칸 없음";
    return `<div class="history-row"><span class="history-index">#${entry.number}</span><span class="history-dice">${entry.values.join(" + ")}</span><strong class="history-sum">합 ${entry.sum}</strong><span class="history-hit${entry.hits.length ? "" : " is-miss"}">${hitText}</span></div>`;
  }).join("");
}

function announceWinner(winners) {
  state.gameOver = true;
  elements.roll.disabled = true;
  if (winners.length > 1) {
    elements.winnerTitle.textContent = "동시에 완성! 공동 승리";
    elements.winnerMessage.textContent = `${state.rollCount}번째 묶음에서 ${winners.map((winner) => winner.name).join(", ")}의 모든 칸에 X가 표시되었습니다.`;
  } else {
    elements.winnerTitle.textContent = `${winners[0].name} 승리!`;
    elements.winnerMessage.textContent = `${state.rollCount}번째 묶음에서 모든 칸을 먼저 지웠습니다.`;
  }
  elements.winnerDialog.showModal();
}

function exactDistribution(diceCount) {
  let ways = [1];
  for (let die = 0; die < diceCount; die += 1) {
    const next = Array(ways.length + 6).fill(0);
    ways.forEach((count, index) => { for (let face = 1; face <= 6; face += 1) next[index + face] += count; });
    ways = next;
  }
  return sumsForDice(diceCount).map((sum) => ways[sum] / (6 ** diceCount));
}

function resetSimulation() {
  cancelAnimationFrame(state.simulation.animationId);
  state.simulation.running = false;
  state.simulation.diceCount = Number(elements.simulationDiceCount.value);
  state.simulation.counts = Array(sumsForDice(state.simulation.diceCount).length).fill(0);
  state.simulation.total = 0;
  elements.runSimulation.textContent = "실험 시작";
  elements.runSimulation.disabled = false;
  elements.simulationDiceCount.disabled = false;
  elements.simulationProgress.style.width = "0%";
  renderSimulation();
}

function renderSimulation() {
  const diceCount = state.simulation.diceCount;
  const sums = sumsForDice(diceCount);
  const theory = exactDistribution(diceCount);
  const maxRate = Math.max(...theory) * 1.13;
  elements.distributionChart.style.setProperty("--columns", sums.length);
  elements.distributionChart.innerHTML = "";
  sums.forEach((sum, index) => {
    const observed = state.simulation.total ? state.simulation.counts[index] / state.simulation.total : 0;
    const column = document.createElement("div");
    column.className = "chart-column";
    const observedPercent = Math.max(0.5, (observed / maxRate) * 100);
    const theoryPercent = (theory[index] / maxRate) * 100;
    column.innerHTML = `<div class="observed-bar" style="height:${observedPercent}%"><span>${state.simulation.total ? `${(observed * 100).toFixed(state.simulation.total < 1000 ? 1 : 2)}%` : ""}</span></div><div class="theory-mark" style="--theory-height:${theoryPercent}%" title="이론 확률 ${(theory[index] * 100).toFixed(2)}%"></div><div class="chart-label">${sum}</div>`;
    elements.distributionChart.appendChild(column);
  });
  const maxTheory = Math.max(...theory);
  const modes = sums.filter((_, index) => Math.abs(theory[index] - maxTheory) < 1e-12);
  elements.simulationTotal.textContent = state.simulation.total.toLocaleString("ko-KR");
  elements.chartTitle.textContent = `주사위 ${diceCount}개 눈의 합 분포`;
  elements.expectedMean.textContent = Number((3.5 * diceCount).toFixed(1)).toLocaleString("ko-KR");
  elements.mostLikelySum.textContent = modes.join(", ");
  elements.mostLikelyDetail.textContent = `이론 확률 ${(maxTheory * 100).toFixed(1)}%`;
  elements.shapeInsight.textContent = diceCount === 1 ? "모든 눈의 높이가 같은 균등한 모양" : diceCount === 2 ? "가운데가 높고 직선으로 오르내리는 삼각형 모양" : "가운데가 높고 좌우가 대칭인 종 모양";
}

function runSimulation() {
  if (state.simulation.running) return;
  const target = Number(elements.simulationBatch.value);
  let completed = 0;
  const chunk = Math.max(1, Math.ceil(target / 75));
  state.simulation.running = true;
  elements.runSimulation.disabled = true;
  elements.simulationDiceCount.disabled = true;
  elements.runSimulation.textContent = "실험 중…";
  const step = () => {
    const iterations = Math.min(chunk, target - completed);
    for (let i = 0; i < iterations; i += 1) {
      let sum = 0;
      for (let die = 0; die < state.simulation.diceCount; die += 1) sum += randomDie();
      state.simulation.counts[sum - state.simulation.diceCount] += 1;
    }
    completed += iterations;
    state.simulation.total += iterations;
    elements.simulationProgress.style.width = `${(completed / target) * 100}%`;
    renderSimulation();
    if (completed < target) state.simulation.animationId = requestAnimationFrame(step);
    else {
      state.simulation.running = false;
      elements.runSimulation.disabled = false;
      elements.simulationDiceCount.disabled = false;
      elements.runSimulation.textContent = "더 실험하기";
      window.setTimeout(() => { elements.simulationProgress.style.width = "0%"; }, 350);
    }
  };
  state.simulation.animationId = requestAnimationFrame(step);
}

function switchTab(name) {
  elements.tabs.forEach((tab) => { const active = tab.dataset.tab === name; tab.classList.toggle("is-active", active); tab.setAttribute("aria-selected", active); });
  elements.panels.forEach((panel) => { const active = panel.dataset.panel === name; panel.classList.toggle("is-active", active); panel.hidden = !active; });
  if (name === "simulation") renderSimulation();
}

function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]); }

elements.tabs.forEach((tab) => tab.addEventListener("click", () => switchTab(tab.dataset.tab)));
elements.playerCount.addEventListener("change", () => { state.playerCount = Number(elements.playerCount.value); resetPlayers(); });
elements.diceCount.addEventListener("change", () => { state.diceCount = Number(elements.diceCount.value); const sums = sumsForDice(); elements.range.textContent = `${sums[0]}부터 ${sums.at(-1)}까지`; resetPlayers(); });
elements.tokenTarget.addEventListener("change", () => { state.tokenTarget = Number(elements.tokenTarget.value); elements.targetHeading.textContent = `${state.tokenTarget}칸`; resetPlayers(); });
elements.bundleCount.addEventListener("change", () => { state.bundleCount = Number(elements.bundleCount.value); updateControls(); });
elements.resetSetup.addEventListener("click", () => resetPlayers());
elements.lock.addEventListener("click", lockStrategies);
elements.roll.addEventListener("click", rollDice);
elements.rematch.addEventListener("click", () => resetPlayers({ keepAllocations: true }));
$("#openRulesButton").addEventListener("click", () => elements.rulesDialog.showModal());
$("#dialogRematchButton").addEventListener("click", () => window.setTimeout(() => resetPlayers({ keepAllocations: true })));
$("#dialogNewStrategyButton").addEventListener("click", () => window.setTimeout(() => resetPlayers()));
elements.simulationDiceCount.addEventListener("change", resetSimulation);
elements.runSimulation.addEventListener("click", runSimulation);
elements.resetSimulation.addEventListener("click", resetSimulation);

resetPlayers();
resetSimulation();
