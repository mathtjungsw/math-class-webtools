const ATTRIBUTE_VALUES = [0, 1, 2];
const MODE_CONFIG = {
  four: {
    title: "4속성",
    deckSize: 81,
    boardSize: 12,
    attributes: ["number", "shape", "color", "fill"],
    eyebrow: "4 ATTRIBUTES · 81 CARDS",
    learningEyebrow: "4 ATTRIBUTES · LEARNING",
  },
  three: {
    title: "3속성",
    deckSize: 27,
    boardSize: 9,
    attributes: ["shape", "color", "fill"],
    eyebrow: "3 ATTRIBUTES · 27 CARDS",
    learningEyebrow: "3 ATTRIBUTES · LEARNING",
  },
};

const ATTRIBUTE_NAMES = {
  number: "개수",
  shape: "모양",
  color: "색깔",
  fill: "투명도",
};

const ATTRIBUTE_VALUE_NAMES = {
  number: ["1개", "2개", "3개"],
  shape: ["원", "마름모", "별"],
  color: ["빨강", "초록", "파랑"],
  fill: ["불투명", "반투명", "투명"],
};

const ATTRIBUTE_RULE_TEXT = {
  number: "1개·2개·3개가 전부 같거나 전부 달라야 합니다.",
  shape: "원·마름모·별이 전부 같거나 전부 달라야 합니다.",
  color: "빨강·초록·파랑이 전부 같거나 전부 달라야 합니다.",
  fill: "불투명·반투명·투명이 전부 같거나 전부 달라야 합니다.",
};

const SHAPE_NAMES = ATTRIBUTE_VALUE_NAMES.shape;
const COLOR_NAMES = ATTRIBUTE_VALUE_NAMES.color;
const FILL_NAMES = ATTRIBUTE_VALUE_NAMES.fill;
const COLORS = ["#e5484d", "#16a46f", "#3b6bdc"];

const elements = {
  modeButtons: document.querySelectorAll("[data-mode]"),
  tabButtons: document.querySelectorAll("[data-tab]"),
  views: document.querySelectorAll("[data-view]"),
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
  learningModeLabel: document.querySelector("#learningModeLabel"),
  sourceNoteText: document.querySelector("#sourceNoteText"),
  combinationRules: document.querySelector("#combinationRules"),
  setExampleButton: document.querySelector("#setExampleButton"),
  nonSetExampleButton: document.querySelector("#nonSetExampleButton"),
  vectorCards: document.querySelector("#vectorCards"),
  vectorTable: document.querySelector("#vectorTable"),
  vectorResult: document.querySelector("#vectorResult"),
  thirdPair: document.querySelector("#thirdPair"),
  thirdRule: document.querySelector("#thirdRule"),
  thirdCandidates: document.querySelector("#thirdCandidates"),
  thirdResult: document.querySelector("#thirdResult"),
  newThirdPuzzleButton: document.querySelector("#newThirdPuzzleButton"),
  noSetMeta: document.querySelector("#noSetMeta"),
  noSetBoard: document.querySelector("#noSetBoard"),
  noSetCandidates: document.querySelector("#noSetCandidates"),
  noSetResult: document.querySelector("#noSetResult"),
  resetNoSetButton: document.querySelector("#resetNoSetButton"),
  refreshNoSetButton: document.querySelector("#refreshNoSetButton"),
  toast: document.querySelector("#toast"),
};

let activeTab = "game";
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

function randomItem(values) {
  return values[secureRandomInt(values.length)];
}

function takeRandom(values, count) {
  return shuffle(values).slice(0, count);
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

function activeAttributes(mode = state?.mode || "four") {
  return MODE_CONFIG[mode].attributes;
}

function isSet(cards, mode = state?.mode || "four") {
  if (!Array.isArray(cards) || cards.length !== 3) return false;
  return activeAttributes(mode).every((attribute) => {
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

function completingValue(firstValue, secondValue) {
  return firstValue === secondValue ? firstValue : 3 - firstValue - secondValue;
}

function matchingThirdCard(first, second, mode, deck) {
  const values = {};
  for (const attribute of activeAttributes(mode)) {
    values[attribute] = completingValue(first[attribute], second[attribute]);
  }
  return deck.find((card) =>
    activeAttributes(mode).every((attribute) => card[attribute] === values[attribute])
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

function generateVectorExample(mode, shouldBeSet = true) {
  const deck = generateDeck(mode);
  if (shouldBeSet) {
    const first = randomItem(deck);
    const second = randomItem(deck.filter((card) => card.id !== first.id));
    const third = matchingThirdCard(first, second, mode, deck);
    return shuffle([first, second, third]);
  }

  for (let attempt = 0; attempt < 400; attempt += 1) {
    const cards = takeRandom(deck, 3);
    if (!isSet(cards, mode)) return cards;
  }
  return takeRandom(deck, 3);
}

function createThirdPuzzle(mode) {
  const deck = generateDeck(mode);
  const first = randomItem(deck);
  const second = randomItem(deck.filter((card) => card.id !== first.id));
  const correct = matchingThirdCard(first, second, mode, deck);
  const excluded = new Set([first.id, second.id, correct.id]);
  const distractors = takeRandom(deck.filter((card) => !excluded.has(card.id)), 3);

  return {
    pair: [first, second],
    candidates: shuffle([correct, ...distractors]),
    correctId: correct.id,
    selectedId: null,
    message: "두 카드의 속성값을 보고 SET을 완성하는 한 장을 고르세요.",
    messageType: "normal",
  };
}

function createNoSetCandidates(mode, board) {
  const deck = generateDeck(mode);
  const boardIds = new Set(board.map((card) => card.id));
  const remaining = deck.filter((card) => !boardIds.has(card.id));
  const traps = [];
  const safe = [];

  for (const card of remaining) {
    const createsSet = findSets([...board, card], mode).length > 0;
    (createsSet ? traps : safe).push(card);
  }

  const selected = [];
  if (traps.length) selected.push(randomItem(traps));
  selected.push(...takeRandom(safe, Math.min(4 - selected.length, safe.length)));

  if (selected.length < 4) {
    const used = new Set(selected.map((card) => card.id));
    selected.push(...takeRandom(traps.filter((card) => !used.has(card.id)), 4 - selected.length));
  }

  return shuffle(selected);
}

function createNoSetChallenge(mode) {
  const deck = generateDeck(mode);
  const first = randomItem(deck);
  const second = randomItem(deck.filter((card) => card.id !== first.id));
  const board = shuffle([first, second]);

  return {
    board,
    candidates: createNoSetCandidates(mode, board),
    conflictIds: [],
    conflictCandidateId: null,
    message: "두 장으로 시작합니다. 후보 중 SET을 만들지 않는 카드를 골라 배치를 키워 보세요.",
    messageType: "normal",
  };
}

function createLearningState(mode) {
  return {
    vectorCards: generateVectorExample(mode, true),
    vectorKind: "set",
    thirdPuzzle: createThirdPuzzle(mode),
    noSetChallenge: createNoSetChallenge(mode),
  };
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
    learning: createLearningState(mode),
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

function valueName(attribute, value) {
  return ATTRIBUTE_VALUE_NAMES[attribute][value];
}

function cardDescription(card, mode = state?.mode || "four") {
  const parts = mode === "four" ? [`${card.number + 1}개`] : [];
  parts.push(SHAPE_NAMES[card.shape], COLOR_NAMES[card.color], FILL_NAMES[card.fill]);
  return parts.join(" · ");
}

function sourceCode(card, mode = state?.mode || "four") {
  if (mode === "four") {
    return [card.color, card.number, card.shape, card.fill].map((value) => value + 1).join("");
  }
  return activeAttributes(mode).map((attribute) => card[attribute] + 1).join("");
}

function activeCode(card, mode = state?.mode || "four") {
  return activeAttributes(mode).map((attribute) => card[attribute]).join("");
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

function cardSvg(card, compact = false, mode = state?.mode || "four") {
  const count = mode === "three" ? 1 : card.number + 1;
  const positions = count === 1 ? [50] : count === 2 ? [34, 66] : [23, 50, 77];
  const shapes = positions.map((centerY) => shapeMarkup(card, centerY)).join("");
  const compactClass = compact ? " is-compact" : "";

  return `
    <svg class="card-art${compactClass}" viewBox="0 0 100 100" role="img" aria-label="${cardDescription(card, mode)}">
      ${shapes}
    </svg>
  `;
}

function renderCardTile(card, options = {}) {
  const {
    mode = state.mode,
    dataName = "",
    extraClass = "",
    labelPrefix = "",
    disabled = false,
  } = options;
  const isButton = Boolean(dataName);
  const tag = isButton ? "button" : "div";
  const type = isButton ? ` type="button" ${dataName}="${card.id}"` : ` role="img"`;
  const disabledText = isButton && disabled ? " disabled" : "";
  const ariaLabel = `${labelPrefix}${cardDescription(card, mode)}, 코드 ${activeCode(card, mode)}`;

  return `
    <${tag} class="set-card learning-set-card ${extraClass}"${type}${disabledText} aria-label="${ariaLabel}">
      <span class="set-card-code">${sourceCode(card, mode)}</span>
      ${cardSvg(card, true, mode)}
    </${tag}>
  `;
}

function renderTabs() {
  elements.tabButtons.forEach((button) => {
    const active = button.dataset.tab === activeTab;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  elements.views.forEach((view) => {
    view.hidden = view.dataset.view !== activeTab;
  });
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
        aria-label="${index + 1}번 카드: ${cardDescription(card, state.mode)}"
      >
        <span class="set-card-number">${index + 1}</span>
        ${cardSvg(card, false, state.mode)}
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
    return `<div class="selection-slot has-card" title="${cardDescription(card, state.mode)}">${cardSvg(card, true, state.mode)}</div>`;
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

function attributeCheckRows(cards, mode = state.mode) {
  return activeAttributes(mode).map((attribute) => {
    const values = cards.map((card) => card[attribute]);
    const uniqueCount = new Set(values).size;
    const sum = values.reduce((total, value) => total + value, 0);
    const ok = uniqueCount === 1 || uniqueCount === 3;
    const status = uniqueCount === 1 ? "전부 같음" : uniqueCount === 3 ? "전부 다름" : "2종류라 실패";

    return {
      attribute,
      values,
      sum,
      remainder: sum % 3,
      ok,
      status,
    };
  });
}

function invalidAttributeForMode(cards, mode = state.mode) {
  return attributeCheckRows(cards, mode).find((row) => !row.ok)?.attribute;
}

function renderCombinationRules() {
  elements.learningModeLabel.textContent = MODE_CONFIG[state.mode].learningEyebrow;
  elements.sourceNoteText.textContent = state.mode === "four"
    ? "엑셀 원자료는 색·개수·모양·배경을 1·2·3 코드로 바꿔 세 카드 조합을 검사합니다."
    : "축소판은 개수를 제외하고 모양·색깔·투명도 세 속성만 1·2·3 코드로 검사합니다.";

  elements.combinationRules.innerHTML = activeAttributes(state.mode).map((attribute) => `
    <article>
      <strong>${ATTRIBUTE_NAMES[attribute]}</strong>
      <span>${ATTRIBUTE_VALUE_NAMES[attribute].join(" · ")}</span>
      <p>${ATTRIBUTE_RULE_TEXT[attribute]}</p>
    </article>
  `).join("");
}

function renderVectorCheck() {
  const cards = state.learning.vectorCards;
  const rows = attributeCheckRows(cards, state.mode);
  const set = rows.every((row) => row.ok);

  elements.vectorCards.innerHTML = cards.map((card) =>
    renderCardTile(card, { labelPrefix: "검토 카드: " })
  ).join("");

  elements.vectorTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>속성</th>
          <th>카드 1</th>
          <th>카드 2</th>
          <th>카드 3</th>
          <th>0·1·2 합</th>
          <th>판정</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((row) => `
          <tr class="${row.ok ? "is-ok" : "is-bad"}">
            <th>${ATTRIBUTE_NAMES[row.attribute]}</th>
            ${row.values.map((value) => `<td>${valueName(row.attribute, value)}<small>${value}</small></td>`).join("")}
            <td>${row.values.join(" + ")} ≡ ${row.remainder}</td>
            <td>${row.status}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  elements.vectorResult.className = `learning-result ${set ? "is-success" : "is-error"}`;
  elements.vectorResult.textContent = set
    ? "모든 속성에서 합의 나머지가 0입니다. 즉, SET입니다."
    : "나머지가 0이 아닌 속성이 있습니다. 그 속성에서 값이 2종류만 섞여 SET이 아닙니다.";
}

function renderThirdPuzzle() {
  const puzzle = state.learning.thirdPuzzle;
  const pair = puzzle.pair;
  const chosenCorrect = puzzle.selectedId === puzzle.correctId;

  elements.thirdPair.innerHTML = pair.map((card) =>
    renderCardTile(card, { labelPrefix: "문제 카드: " })
  ).join("");

  elements.thirdRule.innerHTML = activeAttributes(state.mode).map((attribute) => {
    const first = pair[0][attribute];
    const second = pair[1][attribute];
    const target = completingValue(first, second);
    const rule = first === second ? "같게 맞추기" : "남은 값 고르기";
    return `
      <div>
        <strong>${ATTRIBUTE_NAMES[attribute]}</strong>
        <span>${valueName(attribute, first)} + ${valueName(attribute, second)} → ${valueName(attribute, target)}</span>
        <small>${rule}</small>
      </div>
    `;
  }).join("");

  elements.thirdCandidates.innerHTML = puzzle.candidates.map((card) => {
    const selected = puzzle.selectedId === card.id;
    const isCorrect = card.id === puzzle.correctId;
    const extraClass = [
      selected ? "is-selected" : "",
      selected && isCorrect ? "is-correct" : "",
      selected && !isCorrect ? "is-wrong" : "",
    ].filter(Boolean).join(" ");
    return renderCardTile(card, {
      dataName: "data-third-id",
      extraClass,
      labelPrefix: "후보 카드: ",
      disabled: chosenCorrect,
    });
  }).join("");

  elements.thirdResult.className = `learning-result ${puzzle.messageType === "success" ? "is-success" : puzzle.messageType === "error" ? "is-error" : ""}`;
  elements.thirdResult.textContent = puzzle.message;
}

function noSetSafeCount(challenge = state.learning.noSetChallenge) {
  const deck = generateDeck(state.mode);
  const boardIds = new Set(challenge.board.map((card) => card.id));
  return deck
    .filter((card) => !boardIds.has(card.id))
    .filter((card) => findSets([...challenge.board, card], state.mode).length === 0)
    .length;
}

function renderNoSetChallenge() {
  const challenge = state.learning.noSetChallenge;
  const setCount = findSets(challenge.board, state.mode).length;
  const goal = MODE_CONFIG[state.mode].boardSize;

  elements.noSetMeta.innerHTML = `
    <span>현재 ${challenge.board.length}/${goal}장</span>
    <span>생긴 SET ${setCount}개</span>
    <span>안전 후보 ${noSetSafeCount(challenge)}장</span>
  `;

  elements.noSetBoard.classList.toggle("is-nine-card", state.mode === "three");
  elements.noSetBoard.innerHTML = challenge.board.map((card) => {
    const conflict = challenge.conflictIds.includes(card.id);
    return renderCardTile(card, {
      extraClass: conflict ? "is-conflict" : "",
      labelPrefix: "배치된 카드: ",
    });
  }).join("");

  elements.noSetCandidates.innerHTML = challenge.candidates.length
    ? challenge.candidates.map((card) =>
      renderCardTile(card, {
        dataName: "data-no-set-id",
        extraClass: card.id === challenge.conflictCandidateId ? "is-conflict" : "",
        labelPrefix: "배치 후보: ",
      })
    ).join("")
    : `<p class="empty-learning">더 이상 추가할 수 있는 후보가 없습니다. 처음부터 다시 시도해 보세요.</p>`;

  elements.noSetResult.className = `learning-result ${challenge.messageType === "success" ? "is-success" : challenge.messageType === "error" ? "is-error" : ""}`;
  elements.noSetResult.textContent = challenge.message;
}

function renderLearning() {
  renderCombinationRules();
  renderVectorCheck();
  renderThirdPuzzle();
  renderNoSetChallenge();
}

function render() {
  renderTabs();
  renderModes();
  renderSummary();
  renderGuide();
  renderBoard();
  renderSelection();
  renderStatus();
  renderHistory();
  renderTimer();
  renderLearning();
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
  return invalidAttributeForMode(cards, state.mode);
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

function setVectorExample(shouldBeSet) {
  state.learning.vectorCards = generateVectorExample(state.mode, shouldBeSet);
  state.learning.vectorKind = shouldBeSet ? "set" : "non-set";
  render();
}

function answerThirdPuzzle(cardId) {
  const puzzle = state.learning.thirdPuzzle;
  if (puzzle.selectedId === puzzle.correctId) return;

  puzzle.selectedId = cardId;
  if (cardId === puzzle.correctId) {
    puzzle.message = "정답입니다. 두 카드가 요구하는 속성값이 모두 맞아 SET이 완성됩니다.";
    puzzle.messageType = "success";
    render();
    return;
  }

  const chosen = puzzle.candidates.find((card) => card.id === cardId);
  const badAttribute = invalidAttributeForMode([...puzzle.pair, chosen], state.mode);
  puzzle.message = `${ATTRIBUTE_NAMES[badAttribute]} 속성에서 2종류만 섞입니다. 위의 규칙 줄을 다시 따라가 보세요.`;
  puzzle.messageType = "error";
  render();
}

function newThirdPuzzle() {
  state.learning.thirdPuzzle = createThirdPuzzle(state.mode);
  render();
}

function answerNoSetCandidate(cardId) {
  const challenge = state.learning.noSetChallenge;
  const card = challenge.candidates.find((candidate) => candidate.id === cardId);
  if (!card) return;

  const nextBoard = [...challenge.board, card];
  const sets = findSets(nextBoard, state.mode);
  if (sets.length) {
    const conflict = sets[0];
    challenge.conflictIds = conflict.map((item) => item.id);
    challenge.conflictCandidateId = card.id;
    challenge.message = `이 카드는 SET을 만듭니다. 표시된 세 장이 ${activeAttributes(state.mode).map((attribute) => ATTRIBUTE_NAMES[attribute]).join("·")} 규칙을 모두 통과합니다.`;
    challenge.messageType = "error";
    render();
    return;
  }

  challenge.board = nextBoard;
  challenge.conflictIds = [];
  challenge.conflictCandidateId = null;
  const goal = MODE_CONFIG[state.mode].boardSize;
  if (challenge.board.length >= goal) {
    challenge.candidates = [];
    challenge.message = `${goal}장 목표 달성! 현재 배치에는 SET이 하나도 없습니다.`;
    challenge.messageType = "success";
    render();
    return;
  }

  challenge.candidates = createNoSetCandidates(state.mode, challenge.board);
  challenge.message = "좋습니다. SET을 만들지 않고 한 장을 추가했습니다.";
  challenge.messageType = "success";
  render();
}

function resetNoSetChallenge() {
  state.learning.noSetChallenge = createNoSetChallenge(state.mode);
  render();
}

function refreshNoSetCandidates() {
  const challenge = state.learning.noSetChallenge;
  challenge.conflictIds = [];
  challenge.conflictCandidateId = null;
  challenge.candidates = createNoSetCandidates(state.mode, challenge.board);
  challenge.message = "후보를 새로 뽑았습니다. 안전한 카드를 다시 골라 보세요.";
  challenge.messageType = "normal";
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

function switchTab(tab) {
  if (!["game", "learn"].includes(tab)) return;
  activeTab = tab;
  render();
}

function closeDialogFromButton(event) {
  const button = event.target.closest("[data-close-dialog]");
  if (!button) return;
  button.closest("dialog")?.close();
}

elements.modeButtons.forEach((button) => {
  button.addEventListener("click", () => switchMode(button.dataset.mode));
});
elements.tabButtons.forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tab));
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
elements.setExampleButton.addEventListener("click", () => setVectorExample(true));
elements.nonSetExampleButton.addEventListener("click", () => setVectorExample(false));
elements.newThirdPuzzleButton.addEventListener("click", newThirdPuzzle);
elements.resetNoSetButton.addEventListener("click", resetNoSetChallenge);
elements.refreshNoSetButton.addEventListener("click", refreshNoSetCandidates);
elements.thirdCandidates.addEventListener("click", (event) => {
  const button = event.target.closest("[data-third-id]");
  if (button) answerThirdPuzzle(button.dataset.thirdId);
});
elements.noSetCandidates.addEventListener("click", (event) => {
  const button = event.target.closest("[data-no-set-id]");
  if (button) answerNoSetCandidate(button.dataset.noSetId);
});
document.addEventListener("click", closeDialogFromButton);
document.addEventListener("keydown", (event) => {
  if (elements.rulesDialog.open || activeTab !== "game") return;
  if (event.key === "Escape") clearSelection();
  if (event.key === "Enter" && state.selectedIds.length === 3) judgeSelection();
  if (event.key.toLowerCase() === "t") toggleTimer();
});

window.__setGameDebug = {
  isSet,
  findSets,
  generateDeck,
  matchingThirdCard,
  createNoSetCandidates,
  newGame,
  switchMode,
  switchTab,
  getState: () => JSON.parse(JSON.stringify(state)),
};

newGame("four");
