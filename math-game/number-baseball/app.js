const Logic = window.NumberBaseballLogic;
const STORAGE_KEY = "number-baseball-game-v1";
const RECORD_VISIBILITY_KEY = "number-baseball-record-hidden";

const elements = {
  lengthButtons: [...document.querySelectorAll("[data-length]")],
  attemptCount: document.querySelector("#attemptCount"),
  remainingCount: document.querySelector("#remainingCount"),
  eliminatedCount: document.querySelector("#eliminatedCount"),
  answerChance: document.querySelector("#answerChance"),
  digitLabel: document.querySelector("#digitLabel"),
  guessForm: document.querySelector("#guessForm"),
  guessInput: document.querySelector("#guessInput"),
  inputMessage: document.querySelector("#inputMessage"),
  keypad: document.querySelector("#keypad"),
  backspaceButton: document.querySelector("#backspaceButton"),
  clearButton: document.querySelector("#clearButton"),
  tipButton: document.querySelector("#tipButton"),
  tipPanel: document.querySelector("#tipPanel"),
  tipGuess: document.querySelector("#tipGuess"),
  tipSummary: document.querySelector("#tipSummary"),
  tipMeter: document.querySelector("#tipMeter"),
  tipDescription: document.querySelector("#tipDescription"),
  closeTipButton: document.querySelector("#closeTipButton"),
  probabilityButton: document.querySelector("#probabilityButton"),
  probabilityDialog: document.querySelector("#probabilityDialog"),
  formulaText: document.querySelector("#formulaText"),
  drawerRemaining: document.querySelector("#drawerRemaining"),
  drawerChance: document.querySelector("#drawerChance"),
  distributionGuess: document.querySelector("#distributionGuess"),
  distributionList: document.querySelector("#distributionList"),
  recordBody: document.querySelector("#recordBody"),
  gameGrid: document.querySelector(".game-grid"),
  recordPanel: document.querySelector(".record-panel"),
  recordContent: document.querySelector("#recordContent"),
  recordToggleButton: document.querySelector("#recordToggleButton"),
  undoButton: document.querySelector("#undoButton"),
  progressLabel: document.querySelector("#progressLabel"),
  progressBar: document.querySelector("#progressBar"),
  revealButton: document.querySelector("#revealButton"),
  statusBadge: document.querySelector("#statusBadge"),
  rulesButton: document.querySelector("#rulesButton"),
  rulesDialog: document.querySelector("#rulesDialog"),
  copyButton: document.querySelector("#copyButton"),
  newGameButton: document.querySelector("#newGameButton"),
  resultDialog: document.querySelector("#resultDialog"),
  resultDescription: document.querySelector("#resultDescription"),
  answerDisplay: document.querySelector("#answerDisplay"),
  resultNewGameButton: document.querySelector("#resultNewGameButton"),
  remainingDialog: document.querySelector("#remainingDialog"),
  remainingTitle: document.querySelector("#remainingTitle"),
  remainingTurnLabel: document.querySelector("#remainingTurnLabel"),
  remainingModalCount: document.querySelector("#remainingModalCount"),
  remainingCondition: document.querySelector("#remainingCondition"),
  remainingListTitle: document.querySelector("#remainingListTitle"),
  remainingListMeta: document.querySelector("#remainingListMeta"),
  candidateList: document.querySelector("#candidateList"),
  showAllRemainingButton: document.querySelector("#showAllRemainingButton"),
  toast: document.querySelector("#toast"),
};

let state = loadState() || createState(3);
let allCandidates = Logic.generateCandidates(state.length);
let currentCandidates = [];
let toastTimer = 0;
let recordHidden = localStorage.getItem(RECORD_VISIBILITY_KEY) === "true";
let viewedCandidates = [];
let showingAllCandidates = false;

function createState(length) {
  const candidates = Logic.generateCandidates(length);
  return {
    length,
    secret: candidates[Math.floor(Math.random() * candidates.length)],
    history: [],
    completed: false,
    revealed: false,
  };
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (![3, 4].includes(parsed?.length)) return null;
    if (typeof parsed.secret !== "string" || parsed.secret.length !== parsed.length) return null;
    if (!Array.isArray(parsed.history)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatNumber(value) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatPercent(value, digits = 1) {
  if (!Number.isFinite(value)) return "0%";
  if (value > 0 && value < 0.001) return `${(value * 100).toFixed(2)}%`;
  return `${(value * 100).toFixed(digits)}%`;
}

function validateGuess(guess) {
  if (guess.length !== state.length) return `${state.length}자리 숫자를 모두 입력해 주세요.`;
  if (!/^\d+$/.test(guess)) return "숫자만 입력할 수 있어요.";
  if (guess.startsWith("0")) return "첫 자리에는 0을 쓸 수 없어요.";
  if (new Set(guess).size !== guess.length) return "같은 숫자는 한 번만 사용할 수 있어요.";
  return "";
}

function resultLabel(strikes, balls) {
  if (strikes === 0 && balls === 0) return "OUT";
  return `${strikes}S ${balls}B`;
}

function resultChips(strikes, balls) {
  if (strikes === 0 && balls === 0) return '<span class="chip chip-out">OUT</span>';
  const chips = [];
  if (strikes) chips.push(`<span class="chip chip-strike">${strikes}S</span>`);
  if (balls) chips.push(`<span class="chip chip-ball">${balls}B</span>`);
  return chips.join("");
}

function buildKeypad() {
  elements.keypad.replaceChildren();
  for (let digit = 1; digit <= 9; digit += 1) addKey(String(digit));
  addKey("0");
}

function addKey(label) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.setAttribute("aria-label", `${label} 입력`);
  button.addEventListener("click", () => {
    if (elements.guessInput.value.length >= state.length) return;
    elements.guessInput.value += label;
    handleInput();
    elements.guessInput.focus();
  });
  elements.keypad.append(button);
}

function recalculate() {
  currentCandidates = Logic.filterCandidates(allCandidates, state.history);
  state.history.forEach((turn, index) => {
    turn.remaining = Logic.filterCandidates(allCandidates, state.history.slice(0, index + 1)).length;
  });
}

function render() {
  recalculate();
  const initial = allCandidates.length;
  const remaining = currentCandidates.length;
  const eliminated = initial - remaining;
  const progress = initial ? eliminated / initial : 0;

  elements.lengthButtons.forEach((button) => {
    const active = Number(button.dataset.length) === state.length;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  elements.digitLabel.textContent = state.length;
  elements.guessInput.maxLength = state.length;
  elements.guessInput.placeholder = state.length === 3 ? "123" : "1234";
  elements.attemptCount.textContent = state.history.length;
  elements.remainingCount.textContent = formatNumber(remaining);
  elements.eliminatedCount.textContent = formatNumber(eliminated);
  elements.answerChance.textContent = formatPercent(remaining ? 1 / remaining : 0, 2);
  elements.progressLabel.textContent = formatPercent(progress, 1);
  elements.progressBar.style.width = `${progress * 100}%`;
  elements.undoButton.disabled = state.history.length === 0 || state.completed;
  elements.statusBadge.textContent = state.completed ? (state.revealed ? "정답 공개" : "경기 종료") : "경기 중";
  elements.statusBadge.style.background = state.completed ? "#fff0e9" : "";
  elements.statusBadge.style.color = state.completed ? "#b5471d" : "";
  elements.guessInput.disabled = state.completed;
  elements.tipButton.disabled = state.completed;
  document.querySelector("#submitButton").disabled = state.completed;
  [...elements.keypad.children].forEach((button) => { button.disabled = state.completed; });
  elements.backspaceButton.disabled = state.completed;
  elements.clearButton.disabled = state.completed;
  elements.recordContent.hidden = recordHidden;
  elements.recordPanel.classList.toggle("is-collapsed", recordHidden);
  elements.gameGrid.classList.toggle("is-record-collapsed", recordHidden);
  elements.recordToggleButton.textContent = recordHidden ? "기록 보기" : "기록 끄기";
  elements.recordToggleButton.setAttribute("aria-expanded", String(!recordHidden));

  renderRecords();
  renderProbability();
  saveState();
}

function renderRecords() {
  if (!state.history.length) {
    elements.recordBody.innerHTML = '<tr class="empty-row"><td colspan="4"><span>⚾</span><strong>아직 제안한 숫자가 없어요</strong><small>첫 숫자를 던지면 이곳에 기록됩니다.</small></td></tr>';
    return;
  }

  elements.recordBody.innerHTML = state.history.map((turn, index) => `
    <tr>
      <td class="turn-number">${index + 1}</td>
      <td class="guess-number">${turn.guess}</td>
      <td><div class="result-chips">${resultChips(turn.strikes, turn.balls)}</div></td>
      <td class="remaining-cell"><div class="remaining-cell-content"><button class="remaining-view-button" type="button" data-view-turn="${index}" aria-label="${index + 1}회 기록 후 남은 경우 보기">보기</button></div></td>
    </tr>
  `).reverse().join("");
}

function handleInput() {
  const cleaned = elements.guessInput.value.replace(/\D/g, "").slice(0, state.length);
  if (elements.guessInput.value !== cleaned) elements.guessInput.value = cleaned;
  elements.guessInput.classList.remove("is-error");
  elements.inputMessage.classList.remove("is-error");
  elements.inputMessage.textContent = "첫 자리에는 0을 쓸 수 없고, 같은 숫자는 한 번만 써요.";
  elements.tipPanel.hidden = true;
  renderProbability();
}

function eraseLastDigit() {
  if (state.completed || !elements.guessInput.value) return;
  elements.guessInput.value = elements.guessInput.value.slice(0, -1);
  handleInput();
  elements.guessInput.focus();
}

function clearGuess() {
  if (state.completed || !elements.guessInput.value) return;
  elements.guessInput.value = "";
  handleInput();
  elements.guessInput.focus();
}

function submitGuess(event) {
  event.preventDefault();
  if (state.completed) return;
  const guess = elements.guessInput.value;
  const error = validateGuess(guess);
  if (error) {
    elements.guessInput.classList.add("is-error");
    elements.inputMessage.classList.add("is-error");
    elements.inputMessage.textContent = error;
    elements.guessInput.focus();
    return;
  }

  const result = Logic.score(state.secret, guess);
  state.history.push({ guess, ...result });
  state.completed = result.strikes === state.length;
  state.revealed = false;
  elements.guessInput.value = "";
  elements.tipPanel.hidden = true;
  render();

  if (state.completed) showResult(false);
  else {
    elements.inputMessage.textContent = `${resultLabel(result.strikes, result.balls)}! 기록을 바탕으로 다음 숫자를 생각해 보세요.`;
    elements.guessInput.focus();
  }
}

function showTip() {
  const guess = elements.guessInput.value;
  const error = validateGuess(guess);
  if (error) {
    elements.guessInput.classList.add("is-error");
    elements.inputMessage.classList.add("is-error");
    elements.inputMessage.textContent = `TIP을 보려면 ${error}`;
    elements.guessInput.focus();
    return;
  }

  const analysis = Logic.analyzeGuess(guess, currentCandidates);
  const reduction = currentCandidates.length
    ? 1 - analysis.expectedRemaining / currentCandidates.length
    : 0;
  const likely = analysis.mostLikely;
  const quality = reduction >= 0.8 ? "매우 좋음" : reduction >= 0.65 ? "좋음" : reduction >= 0.5 ? "보통" : "낮음";
  const recommendation = Logic.recommendGuess(currentCandidates);

  elements.tipGuess.textContent = guess;
  elements.tipSummary.innerHTML = `
    <div><span>가장 유력한 판정</span><strong>${likely ? resultLabel(likely.strikes, likely.balls) : "—"}</strong></div>
    <div><span>그 판정의 확률</span><strong>${likely ? formatPercent(likely.probability) : "—"}</strong></div>
    <div><span>정보 효율</span><strong>${quality}</strong></div>
  `;
  elements.tipMeter.style.width = `${Math.max(5, reduction * 100)}%`;

  const answerNote = analysis.possibleAnswer
    ? `이 숫자가 바로 정답일 확률은 ${formatPercent(analysis.exactProbability, 2)}입니다.`
    : "이 숫자는 지금까지의 기록과 맞지 않아 정답 후보는 아니지만, 확인용 숫자로는 사용할 수 있어요.";
  const recommendNote = recommendation && recommendation !== guess
    ? ` 더 많은 후보를 가를 만한 수로는 ${recommendation}도 살펴보세요.`
    : " 현재 후보 중 좋은 선택입니다.";
  elements.tipDescription.textContent = `${answerNote} 결과를 본 뒤 평균 약 ${Math.max(1, Math.round(analysis.expectedRemaining))}가지 후보가 남을 것으로 예상해요.${recommendNote}`;
  elements.tipPanel.hidden = false;
  elements.tipPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  renderProbability();
}

function renderProbability() {
  elements.formulaText.textContent = state.length === 3 ? "8 × 9 × 9 = 648" : "7 × 8 × 9 × 9 = 4,536";
  elements.drawerRemaining.textContent = formatNumber(currentCandidates.length);
  elements.drawerChance.textContent = formatPercent(currentCandidates.length ? 1 / currentCandidates.length : 0, 2);

  const guess = elements.guessInput.value;
  if (validateGuess(guess)) {
    elements.distributionGuess.textContent = "숫자를 입력하세요";
    elements.distributionList.innerHTML = '<p class="empty-distribution">유효한 숫자를 입력하면 각 판정이 나올 확률을 계산합니다.</p>';
    return;
  }

  const analysis = Logic.analyzeGuess(guess, currentCandidates.length ? currentCandidates : allCandidates);
  elements.distributionGuess.textContent = `${guess} 기준`;
  elements.distributionList.innerHTML = analysis.outcomes.map((outcome) => `
    <div class="distribution-row">
      <span class="distribution-label">${resultLabel(outcome.strikes, outcome.balls)}</span>
      <span class="distribution-bar"><i style="width:${outcome.probability * 100}%"></i></span>
      <span class="distribution-value">${formatPercent(outcome.probability)}</span>
    </div>
  `).join("");
}

function toggleRecordPanel() {
  recordHidden = !recordHidden;
  localStorage.setItem(RECORD_VISIBILITY_KEY, String(recordHidden));
  render();
}

function openRemainingCases(turnIndex) {
  const turns = state.history.slice(0, turnIndex + 1);
  const lastTurn = turns[turns.length - 1];
  viewedCandidates = Logic.filterCandidates(allCandidates, turns);
  showingAllCandidates = false;

  elements.remainingTitle.textContent = `${turnIndex + 1}회 기록 후 남은 경우`;
  elements.remainingTurnLabel.textContent = `${turnIndex + 1}회 기록 후`;
  elements.remainingModalCount.textContent = formatNumber(viewedCandidates.length);
  elements.remainingCondition.textContent = `1회부터 ${turnIndex + 1}회까지의 모든 판정을 만족하는 수입니다. 마지막 조건: ${lastTurn.guess} → ${resultLabel(lastTurn.strikes, lastTurn.balls)}`;
  renderRemainingList();
  elements.remainingDialog.showModal();
}

function renderRemainingList() {
  const previewLimit = 24;
  const displayed = showingAllCandidates ? viewedCandidates : viewedCandidates.slice(0, previewLimit);
  elements.remainingListTitle.textContent = showingAllCandidates ? "남은 수 전체 목록" : "남은 수 미리보기";
  elements.remainingListMeta.textContent = showingAllCandidates
    ? `전체 ${formatNumber(viewedCandidates.length)}개`
    : `${formatNumber(Math.min(viewedCandidates.length, previewLimit))}개 미리 표시`;
  elements.candidateList.innerHTML = displayed.length
    ? displayed.map((candidate) => `<span class="candidate-number">${candidate}</span>`).join("")
    : '<p class="empty-distribution">조건을 만족하는 수가 없습니다.</p>';
  elements.showAllRemainingButton.textContent = showingAllCandidates ? "간단히 보기" : "남은 수 전체 보기";
}

function toggleAllRemainingCases() {
  showingAllCandidates = !showingAllCandidates;
  renderRemainingList();
  elements.candidateList.scrollTop = 0;
}

function startNewGame(length = state.length, force = false) {
  if (!force && state.history.length && !window.confirm("현재 기록을 지우고 새 게임을 시작할까요?")) return;
  state = createState(length);
  allCandidates = Logic.generateCandidates(length);
  elements.guessInput.value = "";
  elements.tipPanel.hidden = true;
  render();
  elements.guessInput.focus();
}

function undoLast() {
  if (!state.history.length || state.completed) return;
  const removed = state.history.pop();
  elements.guessInput.value = removed.guess;
  elements.tipPanel.hidden = true;
  render();
  showToast(`${removed.guess} 기록을 취소했어요.`);
}

function revealAnswer() {
  if (state.completed) {
    showResult(state.revealed);
    return;
  }
  if (!window.confirm("정답을 공개하면 이번 게임이 종료됩니다. 공개할까요?")) return;
  state.completed = true;
  state.revealed = true;
  render();
  showResult(true);
}

function showResult(revealed) {
  elements.answerDisplay.innerHTML = [...state.secret].map((digit) => `<b>${digit}</b>`).join("");
  elements.resultDescription.textContent = revealed
    ? `정답은 ${state.secret}였습니다. 기록의 조건과 남은 후보를 비교해 보세요.`
    : `${state.history.length}번의 시도 끝에 모든 자리를 정확히 맞혔습니다.`;
  if (!elements.resultDialog.open) elements.resultDialog.showModal();
}

async function copyRecords() {
  const lines = [
    `숫자 야구 (${state.length}자리)`,
    ...state.history.map((turn, index) => `${index + 1}. ${turn.guess} → ${resultLabel(turn.strikes, turn.balls)} (남은 경우 ${formatNumber(turn.remaining)})`),
    state.completed ? `정답: ${state.secret}` : `현재 남은 경우: ${formatNumber(currentCandidates.length)}`,
  ];
  try {
    const text = lines.join("\n");
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const field = document.createElement("textarea");
      field.value = text;
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.append(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
    showToast("게임 기록을 복사했어요.");
  } catch {
    showToast("이 브라우저에서는 기록을 복사할 수 없어요.");
  }
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("show"), 2200);
}

elements.guessInput.addEventListener("input", handleInput);
elements.guessForm.addEventListener("submit", submitGuess);
elements.backspaceButton.addEventListener("click", eraseLastDigit);
elements.clearButton.addEventListener("click", clearGuess);
elements.tipButton.addEventListener("click", showTip);
elements.closeTipButton.addEventListener("click", () => { elements.tipPanel.hidden = true; });
elements.probabilityButton.addEventListener("click", () => {
  renderProbability();
  elements.probabilityDialog.showModal();
});
elements.rulesButton.addEventListener("click", () => elements.rulesDialog.showModal());
elements.copyButton.addEventListener("click", copyRecords);
elements.newGameButton.addEventListener("click", () => startNewGame());
elements.undoButton.addEventListener("click", undoLast);
elements.recordToggleButton.addEventListener("click", toggleRecordPanel);
elements.recordBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-view-turn]");
  if (!button) return;
  openRemainingCases(Number(button.dataset.viewTurn));
});
elements.showAllRemainingButton.addEventListener("click", toggleAllRemainingCases);
elements.revealButton.addEventListener("click", revealAnswer);
elements.resultNewGameButton.addEventListener("click", () => {
  elements.resultDialog.close();
  startNewGame(state.length, true);
});
elements.lengthButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const length = Number(button.dataset.length);
    if (length !== state.length) startNewGame(length);
  });
});
document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => button.closest("dialog").close());
});
document.querySelectorAll("dialog").forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
});

buildKeypad();
render();
