const ATTRIBUTE_VALUES = [0, 1, 2];
const MODE_CONFIG = {
  four: {
    title: "4속성",
    deckSize: 81,
    boardSize: 12,
    attributes: ["number", "shape", "color", "fill"],
    eyebrow: "4 ATTRIBUTES · 81 CARDS",
  },
  three: {
    title: "3속성",
    deckSize: 27,
    boardSize: 9,
    attributes: ["shape", "color", "fill"],
    eyebrow: "3 ATTRIBUTES · 27 CARDS",
  },
};

const ATTRIBUTE_NAMES = {
  number: "개수",
  shape: "모양",
  color: "색깔",
  fill: "투명도",
};

const SHAPE_NAMES = ["원", "마름모", "별"];
const COLOR_NAMES = ["빨강", "초록", "파랑"];
const FILL_NAMES = ["불투명", "반투명", "투명"];
const COLORS = ["#e5484d", "#16a46f", "#3b6bdc"];

const elements = {
  modeButtons: document.querySelectorAll("[data-mode]"),
  modeSummary: document.querySelector("#modeSummary"),
  modeEyebrow: document.querySelector("#modeEyebrow"),
  foundCount: document.querySelector("#foundCount"),
  boardCount: document.querySelector("#boardCount"),
  deckCount: document.querySelector("#deckCount"),
  selectedCount: document.querySelector("#selectedCount"),
  attributeGuide: document.querySelector("#attributeGuide"),
  setBoard: document.querySelector("#setBoard"),
  statusMessage: document.querySelector("#statusMessage"),
  selectionSlots: document.querySelector("#selectionSlots"),
  judgeButton: document.querySelector("#judgeButton"),
  clearButton: document.querySelector("#clearButton"),
  hintButton: document.querySelector("#hintButton"),
  shuffleButton: document.querySelector("#shuffleButton"),
  noSetButton: document.querySelector("#noSetButton"),
  newGameButton: document.querySelector("#newGameButton"),
  rulesButton: document.querySelector("#rulesButton"),
  rulesDialog: document.querySelector("#rulesDialog"),
  historyCount: document.querySelector("#historyCount"),
  historyList: document.querySelector("#historyList"),
  timerDisplay: document.querySelector("#timerDisplay"),
  timerProgress: document.querySelector("#timerProgress"),
  timerPreset: document.querySelector("#timerPreset"),
  timerToggleButton: document.querySelector("#timerToggleButton"),
  timerResetButton: document.querySelector("#timerResetButton"),
  toast: document.querySelector("#toast"),
};

let state = null;
let toastTimer = null;
let hintTimer = null;
let timerId = null;

function secureRandomInt(maxExclusive) {
  if (maxExclusive <= 1) return 0;
  if (window.crypto?.getRandomValues) {
    const bucketSize = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
    const value = new Uint32Array(1);
    do {
      window.crypto.getRandomValues(value);
    } while (value[0] >= bucketSize);
    return value[0] % maxExclusive;
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

function generateDeck(mode) {
  const cards = [];
  let id = 0;
  const numbers = mode === "four" ? ATTRIBUTE_VALUES : [0];

  for (const number of numbers) {
    for (const shape of ATTRIBUTE_VALUES) {
      for (const color of ATTRIBUTE_VALUES) {
        for (const fill of ATTRIBUTE_VALUES) {
          cards.push({
            id: `${mode}-${id}`,
            number,
            shape,
            color,
            fill,
          });
          id += 1;
        }
      }
    }
  }

  return cards;
}

function isSet(cards, mode = state?.mode || "four") {
  if (!Array.isArray(cards) || cards.length !== 3) return false;
  return MODE_CONFIG[mode].attributes.every((attribute) => {
    const values = cards.map((card) => card[attribute]);
    return new Set(values).size === 1 || new Set(values).size === 3;
  });
}

function findSets(cards, mode = state?.mode || "four") {
  const sets = [];
  for (let first = 0; first < cards.length - 2; first += 1) {
    for (let second = first + 1; second < cards.length - 1; second += 1) {
      for (let third = second + 1; third < cards.length; third += 1) {
        const group = [cards[first], cards[second], cards[third]];
        if (isSet(group, mode)) sets.push(group);
      }
    }
  }
  return sets;
}

function matchingThirdCard(first, second, mode, deck) {
  const values = {};
  for (const attribute of MODE_CONFIG[mode].attributes) {
    values[attribute] =
      first[attribute] === second[attribute]
        ? first[attribute]
        : 3 - first[attribute] - second[attribute];
  }
  return deck.find((card) =>
    MODE_CONFIG[mode].attributes.every((attribute) => card[attribute] === values[attribute])
  );
}

function createBoardWithSet(mode) {
  const fullDeck = generateDeck(mode);
  const boardSize = MODE_CONFIG[mode].boardSize;
  const shuffled = shuffle(fullDeck);
  const first = shuffled[0];
  const second = shuffled[1];
  const third = matchingThirdCard(first, second, mode, fullDeck);
  const setIds = new Set([first.id, second.id, third.id]);
  const remaining = shuffle(fullDeck.filter((card) => !setIds.has(card.id)));
  const board = shuffle([first, second, third, ...remaining.slice(0, boardSize - 3)]);
  const boardIds = new Set(board.map((card) => card.id));
  return { board, deck: remaining.filter((card) => !boardIds.has(card.id)) };
}

function createInitialState(mode = "four") {
  const dealt = createBoardWithSet(mode);
  const duration = Number(elements.timerPreset.value);
  return {
    mode,
    board: dealt.board,
    deck: dealt.deck,
    selectedIds: [],
    hintIds: [],
    found: 0,
    history: [],
    status: "카드 세 장을 선택한 뒤 SET 판정 버튼을 누르세요.",
    statusType: "normal",
    timerDuration: duration,
    timeLeft: duration,
    timerRunning: false,
    timerEndsAt: null,
  };
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("show"), 2200);
}

function setStatus(message, type = "normal") {
  state.status = message;
  state.statusType = type;
}

function cardDescription(card) {
  const parts = state.mode === "four" ? [`${card.number + 1}개`] : [];
  parts.push(SHAPE_NAMES[card.shape], COLOR_NAMES[card.color], FILL_NAMES[card.fill]);
  return parts.join(" · ");
}

function starPath(centerY) {
  const points = [];
  const outer = 14;
  const inner = 6.2;
  for (let index = 0; index < 10; index += 1) {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    points.push(`${50 + Math.cos(angle) * radius},${centerY + Math.sin(angle) * radius}`);
  }
  return points.join(" ");
}

function shapeMarkup(card, centerY) {
  const color = COLORS[card.color];
  const fill = card.fill === 2 ? "#ffffff" : color;
  const fillOpacity = card.fill === 0 ? 1 : card.fill === 1 ? 0.38 : 0;
  const common = `fill="${fill}" stroke="${color}" stroke-width="3.5" stroke-linejoin="round"`;

  if (card.shape === 0) {
    return `<ellipse cx="50" cy="${centerY}" rx="20" ry="10.5" fill-opacity="${fillOpacity}" ${common} />`;
  }
  if (card.shape === 1) {
    return `<path d="M50 ${centerY - 13} L73 ${centerY} L50 ${centerY + 13} L27 ${centerY} Z" fill-opacity="${fillOpacity}" ${common} />`;
  }
  return `<polygon points="${starPath(centerY)}" fill-opacity="${fillOpacity}" ${common} />`;
}

function cardSvg(card, compact = false) {
  const count = card.number + 1;
  const positions = count === 1 ? [50] : count === 2 ? [34, 66] : [23, 50, 77];
  const shapes = positions.map((centerY) => shapeMarkup(card, centerY)).join("");

  return `
    <svg class="card-art" viewBox="0 0 100 100" role="img" aria-label="${cardDescription(card)}">
      ${shapes}
    </svg>
  `;
}

function renderModes() {
  elements.modeButtons.forEach((button) => {
    const active = button.dataset.mode === state.mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function renderSummary() {
  const config = MODE_CONFIG[state.mode];
  elements.modeSummary.textContent = `${config.title} · ${config.deckSize}장`;
  elements.modeEyebrow.textContent = config.eyebrow;
  elements.foundCount.textContent = state.found;
  elements.boardCount.textContent = state.board.length;
  elements.deckCount.textContent = state.deck.length;
  elements.selectedCount.textContent = state.selectedIds.length;
}

function renderGuide() {
  const labels = state.mode === "four"
    ? ["개수 1·2·3", "원·마름모·별", "빨강·초록·파랑", "불투명·반투명·투명"]
    : ["원·마름모·별", "빨강·초록·파랑", "불투명·반투명·투명"];
  elements.attributeGuide.innerHTML = labels.map((label) => `<span>${label}</span>`).join("");
}

function renderBoard() {
  elements.setBoard.classList.toggle("is-nine-card", state.mode === "three");
  elements.setBoard.innerHTML = state.board.map((card, index) => {
    const selected = state.selectedIds.includes(card.id);
    const hinted = state.hintIds.includes(card.id);
    const classes = [
      "set-card",
      selected ? "is-selected" : "",
      hinted ? "is-hint" : "",
    ].filter(Boolean).join(" ");

    return `
      <button
        class="${classes}"
        type="button"
        data-card-id="${card.id}"
        aria-pressed="${selected}"
        aria-label="${index + 1}번 카드: ${cardDescription(card)}"
      >
        <span class="set-card-number">${index + 1}</span>
        ${cardSvg(card)}
      </button>
    `;
  }).join("");
}

function selectedCards() {
  return state.selectedIds
    .map((id) => state.board.find((card) => card.id === id))
    .filter(Boolean);
}

function renderSelection() {
  const cards = selectedCards();
  elements.selectionSlots.innerHTML = Array.from({ length: 3 }, (_, index) => {
    const card = cards[index];
    if (!card) return `<div class="selection-slot">${index + 1}</div>`;
    return `<div class="selection-slot has-card" title="${cardDescription(card)}">${cardSvg(card, true)}</div>`;
  }).join("");
  elements.judgeButton.disabled = cards.length !== 3;
  elements.clearButton.disabled = cards.length === 0;
}

function renderStatus() {
  elements.statusMessage.textContent = state.status;
  elements.statusMessage.classList.toggle("is-success", state.statusType === "success");
  elements.statusMessage.classList.toggle("is-error", state.statusType === "error");
}

function renderHistory() {
  elements.historyCount.textContent = `${state.history.length}개`;
  elements.historyList.innerHTML = state.history.length
    ? state.history.map((item) => `
      <li>
        <strong>SET ${item.number}</strong>
        <span>${item.mode} · ${item.time}</span>
      </li>
    `).join("")
    : `<li class="empty-history">아직 찾은 SET이 없습니다.</li>`;
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function renderTimer() {
  const ratio = state.timerDuration ? Math.max(0, state.timeLeft / state.timerDuration) : 0;
  elements.timerDisplay.textContent = formatTime(state.timeLeft);
  elements.timerDisplay.classList.toggle("is-urgent", state.timeLeft <= 10);
  elements.timerProgress.style.width = `${ratio * 100}%`;
  elements.timerProgress.style.background = state.timeLeft <= 10 ? "var(--red)" : "var(--blue)";
  elements.timerToggleButton.textContent = state.timerRunning ? "일시정지" : "시작";
}

function render() {
  renderModes();
  renderSummary();
  renderGuide();
  renderBoard();
  renderSelection();
  renderStatus();
  renderHistory();
  renderTimer();
}

function toggleCard(cardId) {
  const selectedIndex = state.selectedIds.indexOf(cardId);
  state.hintIds = [];

  if (selectedIndex >= 0) {
    state.selectedIds.splice(selectedIndex, 1);
  } else if (state.selectedIds.length < 3) {
    state.selectedIds.push(cardId);
  } else {
    setStatus("이미 세 장을 선택했습니다. 한 장을 해제하거나 판정하세요.", "error");
  }
  render();
}

function invalidAttribute(cards) {
  return MODE_CONFIG[state.mode].attributes.find((attribute) => {
    const values = cards.map((card) => card[attribute]);
    const size = new Set(values).size;
    return size !== 1 && size !== 3;
  });
}

function replaceFoundSet(cards) {
  const selected = new Set(cards.map((card) => card.id));
  const boardSize = MODE_CONFIG[state.mode].boardSize;

  if (state.board.length > boardSize) {
    state.board = state.board.filter((card) => !selected.has(card.id));
    return;
  }

  state.board = state.board
    .map((card) => selected.has(card.id) ? (state.deck.shift() || null) : card)
    .filter(Boolean);
}

function judgeSelection() {
  const cards = selectedCards();
  if (cards.length !== 3) return;

  if (!isSet(cards, state.mode)) {
    const attribute = invalidAttribute(cards);
    setStatus(
      `${ATTRIBUTE_NAMES[attribute]} 속성이 모두 같지도, 모두 다르지도 않습니다. 다시 살펴보세요.`,
      "error",
    );
    showToast("SET이 아닙니다.");
    render();
    return;
  }

  state.found += 1;
  state.history.unshift({
    number: state.found,
    mode: MODE_CONFIG[state.mode].title,
    time: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
  });
  replaceFoundSet(cards);
  state.selectedIds = [];
  state.hintIds = [];

  const possibleSets = findSets(state.board, state.mode);
  if (state.board.length < 3 || (possibleSets.length === 0 && state.deck.length === 0)) {
    setStatus(`게임 완료! 모두 ${state.found}개의 SET을 찾았습니다.`, "success");
    stopTimer();
  } else {
    setStatus(`정답입니다! ${state.found}번째 SET을 찾았습니다.`, "success");
  }
  render();
}

function clearSelection() {
  state.selectedIds = [];
  setStatus("선택을 모두 해제했습니다.");
  render();
}

function showHint() {
  window.clearTimeout(hintTimer);
  const sets = findSets(state.board, state.mode);
  if (!sets.length) {
    state.hintIds = [];
    setStatus("현재 보드에는 SET이 없습니다. ‘SET 없음’을 눌러 카드를 추가하세요.", "success");
    render();
    return;
  }

  state.hintIds = sets[0].slice(0, 2).map((card) => card.id);
  setStatus("힌트: 표시된 두 장과 함께 SET이 되는 한 장을 찾아보세요.");
  render();
  hintTimer = window.setTimeout(() => {
    state.hintIds = [];
    render();
  }, 4500);
}

function shuffleBoard() {
  state.board = shuffle(state.board);
  state.selectedIds = [];
  state.hintIds = [];
  setStatus("카드의 위치를 섞었습니다.");
  render();
}

function judgeNoSet() {
  const sets = findSets(state.board, state.mode);
  if (sets.length) {
    setStatus("아직 보드에 SET이 있습니다. 조금 더 찾아보세요.", "error");
    showToast("현재 보드에 SET이 있습니다.");
    render();
    return;
  }

  if (!state.deck.length) {
    setStatus(`남은 카드가 없고 SET도 없습니다. 게임 완료! ${state.found}개를 찾았습니다.`, "success");
    stopTimer();
    render();
    return;
  }

  const added = state.deck.splice(0, Math.min(3, state.deck.length));
  state.board.push(...added);
  state.selectedIds = [];
  state.hintIds = [];
  setStatus(`맞습니다. SET이 없어 카드 ${added.length}장을 추가했습니다.`, "success");
  render();
}

function stopTimer() {
  window.clearInterval(timerId);
  timerId = null;
  if (state) {
    state.timerRunning = false;
    state.timerEndsAt = null;
  }
}

function timerTick() {
  if (!state.timerRunning || !state.timerEndsAt) return;
  state.timeLeft = Math.max(0, (state.timerEndsAt - Date.now()) / 1000);
  if (state.timeLeft <= 0) {
    stopTimer();
    state.timeLeft = 0;
    setStatus("시간이 끝났습니다. 카드를 확인하고 다음 라운드를 시작하세요.", "error");
    playAlarm();
    showToast("타이머가 끝났습니다.");
    render();
    return;
  }
  renderTimer();
}

function toggleTimer() {
  if (state.timerRunning) {
    state.timeLeft = Math.max(0, (state.timerEndsAt - Date.now()) / 1000);
    stopTimer();
    renderTimer();
    return;
  }

  if (state.timeLeft <= 0) state.timeLeft = state.timerDuration;
  state.timerRunning = true;
  state.timerEndsAt = Date.now() + state.timeLeft * 1000;
  window.clearInterval(timerId);
  timerId = window.setInterval(timerTick, 200);
  renderTimer();
}

function resetTimer() {
  stopTimer();
  state.timerDuration = Number(elements.timerPreset.value);
  state.timeLeft = state.timerDuration;
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
      oscillator.frequency.value = 740;
      gain.gain.setValueAtTime(0.0001, context.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + delay + 0.13);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(context.currentTime + delay);
      oscillator.stop(context.currentTime + delay + 0.14);
    });
  } catch {
    // 소리 재생을 지원하지 않는 환경에서는 화면 알림만 사용합니다.
  }
}

function newGame(mode = state?.mode || "four") {
  stopTimer();
  window.clearTimeout(hintTimer);
  state = createInitialState(mode);
  render();
}

function switchMode(mode) {
  if (!MODE_CONFIG[mode] || state.mode === mode) return;
  if (state.found > 0 && !window.confirm("버전을 바꾸면 현재 기록이 초기화됩니다. 계속할까요?")) return;
  newGame(mode);
}

function closeDialogFromButton(event) {
  const button = event.target.closest("[data-close-dialog]");
  if (!button) return;
  button.closest("dialog")?.close();
}

elements.modeButtons.forEach((button) => {
  button.addEventListener("click", () => switchMode(button.dataset.mode));
});
elements.setBoard.addEventListener("click", (event) => {
  const button = event.target.closest("[data-card-id]");
  if (button) toggleCard(button.dataset.cardId);
});
elements.judgeButton.addEventListener("click", judgeSelection);
elements.clearButton.addEventListener("click", clearSelection);
elements.hintButton.addEventListener("click", showHint);
elements.shuffleButton.addEventListener("click", shuffleBoard);
elements.noSetButton.addEventListener("click", judgeNoSet);
elements.newGameButton.addEventListener("click", () => newGame());
elements.rulesButton.addEventListener("click", () => elements.rulesDialog.showModal());
elements.timerToggleButton.addEventListener("click", toggleTimer);
elements.timerResetButton.addEventListener("click", resetTimer);
elements.timerPreset.addEventListener("change", resetTimer);
document.addEventListener("click", closeDialogFromButton);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !elements.rulesDialog.open) clearSelection();
  if (event.key === "Enter" && state.selectedIds.length === 3 && !elements.rulesDialog.open) judgeSelection();
  if (event.key.toLowerCase() === "t" && !elements.rulesDialog.open) toggleTimer();
});

window.__setGameDebug = {
  isSet,
  findSets,
  newGame,
  switchMode,
  getState: () => JSON.parse(JSON.stringify(state)),
};

newGame("four");
