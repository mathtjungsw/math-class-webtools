"use strict";

const Logic = window.ClassificationGameLogic;

const SOLID_CATEGORIES = [
  ["tetrahedron", "정사면체", "4", "정삼각형 4개 · 꼭짓점마다 3개 면"],
  ["cube", "정육면체", "6", "정사각형 6개 · 꼭짓점마다 3개 면"],
  ["octahedron", "정팔면체", "8", "정삼각형 8개 · 꼭짓점마다 4개 면"],
  ["dodecahedron", "정십이면체", "12", "정오각형 12개 · 꼭짓점마다 3개 면"],
  ["icosahedron", "정이십면체", "20", "정삼각형 20개 · 꼭짓점마다 5개 면"],
].map(([id, name, symbol, summary]) => ({ id, name, symbol, summary }));

function solidCards(id, visual, figureLabel, face, around, counts) {
  const name = SOLID_CATEGORIES.find((category) => category.id === id).name;
  const faceCount = counts.split("·")[0];
  return [
    { id: `${id}-visual`, text: "입체 모형을 관찰하세요", category: id, kind: "visual", visual, ariaLabel: figureLabel, explanation: `이 모형은 ${name}입니다. ${face}으로 둘러싸인 정다면체의 전체 모양을 확인할 수 있습니다.` },
    { id: `${id}-face`, text: `모든 면은 ${face} · 전체 ${faceCount}면`, category: id, explanation: `${name}는 서로 합동인 ${face} ${faceCount}개로 이루어집니다.` },
    { id: `${id}-vertex`, text: `꼭짓점마다 ${around}개 면 · 전체 ${faceCount}면`, category: id, explanation: `${name}에서는 꼭짓점 하나에 ${around}개의 면이 모이고, 전체 면은 ${faceCount}개입니다.` },
    { id: `${id}-counts`, text: `면·꼭짓점·모서리 수는 ${counts}`, category: id, explanation: `${name}의 면·꼭짓점·모서리 수는 차례로 ${counts}입니다.` },
  ];
}

const BUILT_IN_SETS = {
  solids: {
    version: 1,
    id: "platonic-solids",
    title: "정다면체 성질 분류",
    subtitle: "카드에 담긴 성질을 살펴보고 다섯 정다면체의 집으로 보내세요.",
    teacherNote: "같은 정삼각형을 면으로 써도 꼭짓점에 모이는 면의 수에 따라 정사면체·정팔면체·정이십면체로 달라짐을 비교합니다.",
    categories: SOLID_CATEGORIES,
    cards: [
      ...solidCards("tetrahedron", "tetra", "삼각형 면 네 개가 모인 뾰족한 입체 모형", "정삼각형", 3, "4·4·6"),
      ...solidCards("cube", "cube", "정사각형 면으로 이루어진 상자 모양 입체 모형", "정사각형", 3, "6·8·12"),
      ...solidCards("octahedron", "octa", "두 사각뿔의 밑면을 붙인 듯한 입체 모형", "정삼각형", 4, "8·6·12"),
      ...solidCards("dodecahedron", "dodeca", "오각형 면이 둥글게 이어진 입체 모형", "정오각형", 3, "12·20·30"),
      ...solidCards("icosahedron", "icosa", "많은 삼각형 면이 공처럼 이어진 입체 모형", "정삼각형", 5, "20·12·30"),
    ],
  },
  algebra: {
    version: 1,
    id: "algebra-types",
    title: "대수식 종류 분류",
    subtitle: "등호·부등호·함수 기호와 최고차항을 단서로 식의 종류를 판별하세요.",
    teacherNote: "먼저 식·등식·부등식을 구분한 뒤 차수를 확인하는 두 단계 분류 전략을 사용합니다.",
    categories: [
      { id: "linear-expression", name: "일차식", symbol: "1식", summary: "등호·부등호가 없고 최고차항의 차수가 1인 식" },
      { id: "quadratic-expression", name: "이차식", symbol: "2식", summary: "등호·부등호가 없고 최고차항의 차수가 2인 식" },
      { id: "linear-function", name: "일차함수", symbol: "1함", summary: "y=ax+b 꼴(a≠0)로 나타낼 수 있는 함수" },
      { id: "quadratic-function", name: "이차함수", symbol: "2함", summary: "y=ax²+bx+c 꼴(a≠0)로 나타낼 수 있는 함수" },
      { id: "linear-inequality", name: "일차부등식", symbol: "1부", summary: "부등호가 있고 정리했을 때 최고차항의 차수가 1인 부등식" },
      { id: "quadratic-inequality", name: "이차부등식", symbol: "2부", summary: "부등호가 있고 정리했을 때 최고차항의 차수가 2인 부등식" },
      { id: "quadratic-equation", name: "이차방정식", symbol: "2방", summary: "등호가 있고 정리했을 때 ax²+bx+c=0(a≠0)인 방정식" },
    ],
    cards: [
      ["le-1", "3x + 2", "linear-expression", "등호나 부등호가 없고 x의 최고차수가 1이므로 일차식입니다."],
      ["le-2", "a − 4b + 7", "linear-expression", "두 문자의 항이 모두 1차이고 등호가 없으므로 일차식입니다."],
      ["le-3", "5 − 2y", "linear-expression", "y의 최고차수가 1인 다항식이므로 일차식입니다."],
      ["qe-1", "x² + 2x − 3", "quadratic-expression", "등호가 없고 최고차항 x²의 차수가 2이므로 이차식입니다."],
      ["qe-2", "2a² − ab + 1", "quadratic-expression", "2a²와 −ab의 차수가 2이고 등호가 없으므로 이차식입니다."],
      ["qe-3", "(x + 1)(x − 2)", "quadratic-expression", "전개하면 x²−x−2가 되어 최고차수가 2인 이차식입니다."],
      ["lf-1", "y = 2x − 1", "linear-function", "y가 x에 관한 일차식으로 나타나므로 일차함수입니다."],
      ["lf-2", "f(x) = −3x + 4", "linear-function", "f(x)=ax+b에서 a=−3≠0이므로 일차함수입니다."],
      ["lf-3", "y = x/2 + 5", "linear-function", "x의 계수가 1/2인 y=ax+b 꼴이므로 일차함수입니다."],
      ["qf-1", "y = x² − 4", "quadratic-function", "y가 x에 관한 이차식으로 나타나므로 이차함수입니다."],
      ["qf-2", "f(x) = 2x² + 3x − 1", "quadratic-function", "f(x)=ax²+bx+c에서 a=2≠0이므로 이차함수입니다."],
      ["qf-3", "y = −(x − 2)² + 3", "quadratic-function", "전개했을 때 x²항의 계수가 −1인 이차함수입니다."],
      ["li-1", "2x + 3 > 7", "linear-inequality", "부등호가 있고 정리하면 2x−4>0인 일차부등식입니다."],
      ["li-2", "−x + 4 ≤ 9", "linear-inequality", "부등호가 있고 x의 최고차수가 1이므로 일차부등식입니다."],
      ["li-3", "3a − 2 < a + 6", "linear-inequality", "한쪽으로 이항하면 2a−8<0인 일차부등식입니다."],
      ["qi-1", "x² − 5x + 6 ≥ 0", "quadratic-inequality", "부등호가 있고 최고차항이 x²이므로 이차부등식입니다."],
      ["qi-2", "2x² + 3 < 7", "quadratic-inequality", "정리하면 2x²−4<0이 되어 이차부등식입니다."],
      ["qi-3", "(x − 1)(x + 2) ≤ 0", "quadratic-inequality", "좌변을 전개하면 x²+x−2이고 부등호가 있으므로 이차부등식입니다."],
      ["qq-1", "x² − 5x + 6 = 0", "quadratic-equation", "등호가 있고 ax²+bx+c=0 꼴이므로 이차방정식입니다."],
      ["qq-2", "2x² + 3x = 1", "quadratic-equation", "한쪽으로 이항하면 2x²+3x−1=0이 되는 이차방정식입니다."],
      ["qq-3", "(x − 4)² = 9", "quadratic-equation", "전개·이항하면 x²−8x+7=0이 되는 이차방정식입니다."],
    ].map(([id, text, category, explanation]) => ({ id, text, category, explanation, kind: "text", visual: "", ariaLabel: text })),
  },
};

const els = Object.fromEntries([
  "setSubtitle", "customSetTab", "durationWrap", "durationSelect", "startButton", "progressText", "progressBar", "scoreText", "clockLabel", "clockText",
  "interactionHint", "categoryGrid", "categoryCount", "cardPool", "remainingCount", "emptyPool", "submitButton", "feedbackPanel", "feedbackIcon",
  "feedbackTitle", "feedbackText", "conceptGrid", "guideDialog", "guideConceptTitle", "guideConceptBody", "resultDialog", "resultMark", "resultTitle",
  "resultSummary", "resultScore", "resultCorrect", "resultTime", "retryWrongButton", "retryAllButton", "editorDialog", "editorTitle", "editorCategoryList",
  "editorCardList", "editorError", "importInput", "toast",
].map((id) => [id, document.querySelector(`#${id}`)]));

const CUSTOM_STORAGE_KEY = "math-classification-custom-set-v1";
const state = {
  setKey: "solids",
  customSet: loadCustomSet(),
  settings: { checkMode: "instant", playMode: "practice", duration: 300 },
  game: null,
  editorDraft: null,
  toastTimer: 0,
};

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function currentSet() { return state.setKey === "custom" ? state.customSet : BUILT_IN_SETS[state.setKey]; }
function categoryById(id) { return currentSet().categories.find((category) => category.id === id); }

function loadCustomSet() {
  try {
    const saved = localStorage.getItem(CUSTOM_STORAGE_KEY);
    return saved ? Logic.sanitizeSet(JSON.parse(saved)) : null;
  } catch {
    return null;
  }
}

function showToast(message) {
  clearTimeout(state.toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  state.toastTimer = setTimeout(() => els.toast.classList.remove("is-visible"), 2200);
}

function showFeedback(type, title, text) {
  els.feedbackPanel.className = `feedback-panel is-${type}`;
  els.feedbackIcon.textContent = type === "correct" ? "✓" : type === "wrong" ? "!" : "i";
  els.feedbackTitle.textContent = title;
  els.feedbackText.textContent = text;
}

function createCardElement(card, location) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "sort-card";
  if (card.kind === "visual") button.classList.add("visual-card");
  if (state.setKey === "algebra") button.classList.add("math-card");
  if (state.game.selectedCardId === card.id) button.classList.add("is-selected");
  if (state.game.graded) {
    const correct = state.game.placements[card.id] === card.category;
    button.classList.add(correct ? "is-correct" : "is-wrong");
  }
  button.dataset.cardId = card.id;
  button.dataset.location = location;
  button.draggable = !state.game.graded;
  button.setAttribute("aria-pressed", String(state.game.selectedCardId === card.id));
  button.setAttribute("aria-label", `${card.ariaLabel || card.text}. ${location === "pool" ? "분류할 카드" : `${categoryById(location)?.name || "항목"}에 놓인 카드`}`);

  if (card.kind === "visual") {
    const figure = document.createElement("span");
    figure.className = `solid-figure solid-${card.visual}`;
    figure.setAttribute("aria-hidden", "true");
    button.append(figure);
  }
  const text = document.createElement("span");
  text.className = "sort-card-text";
  text.textContent = card.text;
  button.append(text);
  return button;
}

function renderCategories() {
  const set = currentSet();
  els.categoryGrid.replaceChildren(...set.categories.map((category) => {
    const zone = document.createElement("section");
    zone.className = "category-zone";
    zone.dataset.categoryId = category.id;

    const target = document.createElement("button");
    target.type = "button";
    target.className = "category-target";
    target.dataset.categoryTarget = category.id;
    target.disabled = state.game.graded;
    target.setAttribute("aria-label", `${category.name}에 선택한 카드 놓기`);

    const symbol = document.createElement("span");
    symbol.className = "category-symbol";
    symbol.textContent = category.symbol;
    const copy = document.createElement("span");
    const name = document.createElement("strong");
    name.textContent = category.name;
    const summary = document.createElement("small");
    summary.textContent = category.summary;
    copy.append(name, summary);
    const drop = document.createElement("span");
    drop.className = "drop-label";
    drop.textContent = "여기에 놓기";
    target.append(symbol, copy, drop);

    const placed = document.createElement("div");
    placed.className = "placed-list";
    placed.setAttribute("aria-label", `${category.name}에 놓인 카드`);
    const cards = state.game.cards.filter((card) => state.game.placements[card.id] === category.id);
    placed.append(...cards.map((card) => createCardElement(card, category.id)));
    zone.append(target, placed);
    return zone;
  }));
  els.categoryCount.textContent = `${set.categories.length}개 항목`;
}

function renderPool() {
  const poolCards = state.game.cards.filter((card) => !state.game.placements[card.id]);
  els.cardPool.replaceChildren(...poolCards.map((card) => createCardElement(card, "pool")));
  els.remainingCount.textContent = `${poolCards.length}장`;
  els.emptyPool.hidden = poolCards.length !== 0;
  els.submitButton.hidden = state.settings.checkMode !== "submit" || state.game.graded;
  els.submitButton.disabled = poolCards.length !== 0;
}

function renderConcepts() {
  const set = currentSet();
  els.conceptGrid.replaceChildren(...set.categories.map((category) => {
    const article = document.createElement("article");
    article.className = "concept-card";
    const title = document.createElement("strong");
    title.textContent = `${category.symbol} · ${category.name}`;
    const summary = document.createElement("p");
    summary.textContent = category.summary;
    article.append(title, summary);
    return article;
  }));

  els.guideConceptTitle.textContent = `${set.title} · 핵심 요약`;
  const list = document.createElement("ul");
  list.append(...set.categories.map((category) => {
    const item = document.createElement("li");
    item.textContent = `${category.name}: ${category.summary}`;
    return item;
  }));
  if (set.teacherNote) {
    const item = document.createElement("li");
    item.textContent = `비교 포인트: ${set.teacherNote}`;
    list.append(item);
  }
  els.guideConceptBody.replaceChildren(list);
}

function renderHint() {
  const card = state.game.cards.find((item) => item.id === state.game.selectedCardId);
  const marker = els.interactionHint.querySelector("span");
  const title = els.interactionHint.querySelector("strong");
  const copy = els.interactionHint.querySelector("p");
  if (!card) {
    els.interactionHint.classList.remove("has-selection");
    marker.textContent = "①";
    title.textContent = state.game.graded ? "채점 결과를 확인하세요." : "카드를 먼저 선택하세요.";
    copy.textContent = state.game.graded ? "빨간 카드를 누르면 정답과 분류 근거를 다시 볼 수 있습니다." : "카드를 누른 뒤 분류 항목의 ‘여기에 놓기’를 누르세요. 큰 화면에서는 드래그할 수도 있습니다.";
  } else {
    els.interactionHint.classList.add("has-selection");
    marker.textContent = "②";
    title.textContent = `‘${card.text}’ 카드가 선택되었습니다.`;
    copy.textContent = "알맞은 분류 항목의 ‘여기에 놓기’를 누르세요. 같은 카드를 다시 누르면 선택이 해제됩니다.";
  }
}

function currentCorrectCount() {
  return state.game.cards.filter((card) => state.game.placements[card.id] === card.category).length;
}

function renderStatus() {
  const total = state.game.cards.length;
  const progress = state.settings.checkMode === "instant" ? state.game.locked.size : Object.keys(state.game.placements).length;
  const correct = currentCorrectCount();
  const score = state.game.graded || state.settings.checkMode === "instant"
    ? Logic.calculateScore({ total, correct, mistakes: state.game.mistakeCount, mode: state.settings.checkMode })
    : 0;
  els.progressText.textContent = `${progress} / ${total}`;
  els.progressBar.style.width = `${(progress / total) * 100}%`;
  const progressTrack = els.progressBar.parentElement;
  progressTrack.setAttribute("aria-valuemax", total);
  progressTrack.setAttribute("aria-valuenow", progress);
  els.scoreText.textContent = score;
}

function renderGame() {
  els.setSubtitle.textContent = currentSet().subtitle;
  document.querySelector("#pageTitle").textContent = currentSet().title;
  renderCategories();
  renderPool();
  renderStatus();
  renderHint();
}

function updateModeUI() {
  document.querySelectorAll("[data-set-key]").forEach((button) => {
    const active = button.dataset.setKey === state.setKey;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  els.customSetTab.hidden = !state.customSet;
}

function startGame(cardIds = null) {
  clearInterval(state.game?.timerId);
  const set = currentSet();
  const sourceCards = cardIds ? set.cards.filter((card) => cardIds.includes(card.id)) : set.cards;
  state.game = {
    cards: Logic.shuffled(sourceCards),
    placements: {},
    selectedCardId: null,
    locked: new Set(),
    mistakeCards: new Set(),
    mistakeCount: 0,
    graded: false,
    elapsed: 0,
    remaining: state.settings.duration,
    timerId: 0,
    wrongIds: [],
  };
  updateModeUI();
  renderConcepts();
  showFeedback("neutral", "분류 근거를 말해 보세요.", "면의 모양, 식의 최고차항처럼 눈에 보이는 근거를 먼저 찾으면 좋습니다.");
  renderGame();
  updateClock();
  state.game.timerId = setInterval(tickClock, 1000);
}

function tickClock() {
  if (!state.game || state.game.graded) return;
  if (state.settings.playMode === "timed") {
    state.game.remaining = Math.max(0, state.game.remaining - 1);
    if (state.game.remaining === 0) {
      updateClock();
      finishRound(true);
      return;
    }
  } else {
    state.game.elapsed += 1;
  }
  updateClock();
}

function updateClock() {
  const timed = state.settings.playMode === "timed";
  els.clockLabel.textContent = timed ? "남은 시간" : "연습 시간";
  els.clockText.textContent = Logic.formatClock(timed ? state.game.remaining : state.game.elapsed);
  els.clockText.classList.toggle("is-urgent", timed && state.game.remaining <= 30);
}

function selectCard(cardId) {
  const card = state.game.cards.find((item) => item.id === cardId);
  if (!card) return;
  if (state.game.graded) {
    const expected = categoryById(card.category)?.name;
    const correct = state.game.placements[card.id] === card.category;
    showFeedback(correct ? "correct" : "wrong", correct ? `정답 · ${expected}` : `정답은 ‘${expected}’`, card.explanation);
    return;
  }
  if (state.game.locked.has(cardId)) return;
  state.game.selectedCardId = state.game.selectedCardId === cardId ? null : cardId;
  renderGame();
  if (state.game.selectedCardId) document.querySelector(`[data-category-target]`)?.focus({ preventScroll: true });
}

function placeCard(cardId, categoryId) {
  if (state.game.graded || !categoryById(categoryId)) return;
  const card = state.game.cards.find((item) => item.id === cardId);
  if (!card || state.game.locked.has(cardId)) return;

  if (state.settings.checkMode === "instant") {
    if (card.category === categoryId) {
      state.game.placements[card.id] = categoryId;
      state.game.locked.add(card.id);
      showFeedback("correct", `맞았습니다 · ${categoryById(categoryId).name}`, card.explanation);
    } else {
      state.game.mistakeCount += 1;
      state.game.mistakeCards.add(card.id);
      const expected = categoryById(card.category).name;
      showFeedback("wrong", `다시 생각해 보세요 · 정답은 ${expected}`, card.explanation);
    }
  } else {
    state.game.placements[card.id] = categoryId;
    showFeedback("neutral", `${categoryById(categoryId).name}에 놓았습니다.`, "제출 전에는 다른 항목으로 옮길 수 있습니다. 모든 카드를 놓은 뒤 결과를 제출하세요.");
  }
  state.game.selectedCardId = null;
  renderGame();
  if (state.settings.checkMode === "instant" && state.game.locked.size === state.game.cards.length) finishRound(false);
}

function finishRound(timedOut) {
  if (state.game.graded) return;
  clearInterval(state.game.timerId);
  const results = Logic.evaluate(state.game.cards, state.game.placements);
  const correct = results.filter((result) => result.correct).length;
  const wrongIds = state.settings.checkMode === "instant"
    ? Array.from(new Set([...state.game.mistakeCards, ...results.filter((result) => !result.correct).map((result) => result.cardId)]))
    : results.filter((result) => !result.correct).map((result) => result.cardId);
  state.game.wrongIds = wrongIds;
  state.game.graded = true;
  const total = state.game.cards.length;
  const score = Logic.calculateScore({ total, correct, mistakes: state.game.mistakeCount, mode: state.settings.checkMode });
  renderGame();

  els.resultMark.textContent = wrongIds.length ? "!" : "✓";
  els.resultTitle.textContent = timedOut ? "제한시간이 끝났습니다." : wrongIds.length ? "분류 결과를 확인해 보세요." : "모든 카드를 분류했습니다!";
  els.resultSummary.textContent = wrongIds.length
    ? `${wrongIds.length}장의 오답이 있습니다. 창을 닫고 빨간 카드를 누르면 정답 근거를 확인할 수 있습니다.`
    : state.game.mistakeCount ? `완료했습니다. 과정에서 다시 생각한 카드는 ${state.game.mistakeCards.size}장입니다.` : "첫 시도에 모든 분류 근거를 정확히 찾았습니다.";
  els.resultScore.textContent = `${score}점`;
  els.resultCorrect.textContent = `${correct} / ${total}`;
  const usedSeconds = state.settings.playMode === "timed" ? state.settings.duration - state.game.remaining : state.game.elapsed;
  els.resultTime.textContent = Logic.formatClock(usedSeconds);
  els.retryWrongButton.hidden = wrongIds.length === 0;
  els.resultDialog.showModal();
}

function setSetting(type, value) {
  state.settings[type] = value;
  document.querySelectorAll(type === "checkMode" ? "[data-check-mode]" : "[data-play-mode]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset[type === "checkMode" ? "checkMode" : "playMode"] === value));
  });
  els.durationWrap.hidden = state.settings.playMode !== "timed";
  startGame();
}

function openEditor() {
  const base = state.customSet || currentSet();
  state.editorDraft = clone(base);
  state.editorDraft.id = "custom-set";
  state.editorDraft.title = state.customSet?.title || `나의 ${base.title}`;
  state.editorDraft.cards = state.editorDraft.cards.map((card) => ({ ...card, kind: "text", visual: "", text: card.kind === "visual" ? card.ariaLabel : card.text }));
  renderEditor();
  els.editorDialog.showModal();
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function renderEditor() {
  const draft = state.editorDraft;
  els.editorTitle.value = draft.title;
  els.editorCategoryList.replaceChildren(...draft.categories.map((category) => {
    const row = document.createElement("div");
    row.className = "editor-row";
    row.dataset.categoryId = category.id;
    const name = document.createElement("input");
    name.value = category.name;
    name.placeholder = "항목 이름";
    name.setAttribute("aria-label", "분류 항목 이름");
    name.dataset.categoryName = "";
    const summary = document.createElement("input");
    summary.value = category.summary;
    summary.placeholder = "판단 기준 또는 개념 요약";
    summary.setAttribute("aria-label", `${category.name} 판단 기준`);
    summary.dataset.categorySummary = "";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-row";
    remove.dataset.removeCategory = category.id;
    remove.setAttribute("aria-label", `${category.name} 항목 삭제`);
    remove.textContent = "×";
    row.append(name, summary, remove);
    return row;
  }));

  els.editorCardList.replaceChildren(...draft.cards.map((card) => {
    const row = document.createElement("div");
    row.className = "editor-row";
    row.dataset.cardId = card.id;
    const content = document.createElement("input");
    content.value = card.text;
    content.placeholder = "카드 내용";
    content.setAttribute("aria-label", "카드 내용");
    content.dataset.cardText = "";
    const select = document.createElement("select");
    select.setAttribute("aria-label", "카드 정답 항목");
    select.dataset.cardCategory = "";
    draft.categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category.id;
      option.textContent = category.name;
      option.selected = card.category === category.id;
      select.append(option);
    });
    const explanation = document.createElement("input");
    explanation.value = card.explanation;
    explanation.placeholder = "정답인 이유";
    explanation.setAttribute("aria-label", "카드 분류 근거");
    explanation.dataset.cardExplanation = "";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-row";
    remove.dataset.removeCard = card.id;
    remove.setAttribute("aria-label", "카드 삭제");
    remove.textContent = "×";
    row.append(content, select, explanation, remove);
    return row;
  }));
  els.editorError.textContent = "";
}

function syncEditorDraft() {
  state.editorDraft.title = els.editorTitle.value;
  state.editorDraft.categories = [...els.editorCategoryList.querySelectorAll(".editor-row")].map((row, index) => ({
    id: row.dataset.categoryId,
    name: row.querySelector("[data-category-name]").value,
    symbol: String(index + 1),
    summary: row.querySelector("[data-category-summary]").value,
  }));
  state.editorDraft.cards = [...els.editorCardList.querySelectorAll(".editor-row")].map((row) => ({
    id: row.dataset.cardId,
    text: row.querySelector("[data-card-text]").value,
    category: row.querySelector("[data-card-category]").value,
    explanation: row.querySelector("[data-card-explanation]").value,
    kind: "text",
    visual: "",
    ariaLabel: row.querySelector("[data-card-text]").value,
  }));
}

function saveCustomSet() {
  try {
    syncEditorDraft();
    const clean = Logic.sanitizeSet(state.editorDraft);
    localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(clean));
    state.customSet = clean;
    state.setKey = "custom";
    els.editorDialog.close();
    startGame();
    showToast("나의 문제 세트를 저장하고 시작했습니다.");
  } catch (error) {
    els.editorError.textContent = error.message;
  }
}

function exportDraft() {
  try {
    syncEditorDraft();
    const clean = Logic.sanitizeSet(state.editorDraft);
    const blob = new Blob([JSON.stringify(clean, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${clean.title.replace(/[\\/:*?"<>|]/g, "-")}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    showToast("문제 세트를 JSON 파일로 저장했습니다.");
  } catch (error) {
    els.editorError.textContent = error.message;
  }
}

async function importDraft(file) {
  try {
    state.editorDraft = Logic.sanitizeSet(JSON.parse(await file.text()));
    renderEditor();
    showToast("JSON 문제 세트를 불러왔습니다.");
  } catch (error) {
    els.editorError.textContent = error.message || "JSON 파일을 확인하세요.";
  }
}

document.querySelectorAll("[data-set-key]").forEach((button) => button.addEventListener("click", () => {
  if (button.dataset.setKey === "custom" && !state.customSet) return;
  state.setKey = button.dataset.setKey;
  startGame();
}));
document.querySelectorAll("[data-check-mode]").forEach((button) => button.addEventListener("click", () => setSetting("checkMode", button.dataset.checkMode)));
document.querySelectorAll("[data-play-mode]").forEach((button) => button.addEventListener("click", () => setSetting("playMode", button.dataset.playMode)));
els.durationSelect.addEventListener("change", () => { state.settings.duration = Number(els.durationSelect.value); startGame(); });
els.startButton.addEventListener("click", () => { startGame(); showToast("카드를 다시 섞었습니다."); });
els.submitButton.addEventListener("click", () => finishRound(false));

document.addEventListener("click", (event) => {
  const card = event.target.closest(".sort-card[data-card-id]");
  if (card) selectCard(card.dataset.cardId);
  const target = event.target.closest("[data-category-target]");
  if (target) {
    if (!state.game.selectedCardId) showFeedback("neutral", "카드를 먼저 선택하세요.", "모바일과 키보드에서는 카드 선택 후 ‘여기에 놓기’를 누르면 됩니다.");
    else placeCard(state.game.selectedCardId, target.dataset.categoryTarget);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest(".sort-card[data-card-id]");
  const target = event.target.closest("[data-category-target]");
  if (!card && !target) return;
  event.preventDefault();
  if (card) selectCard(card.dataset.cardId);
  if (target) {
    if (!state.game.selectedCardId) showFeedback("neutral", "카드를 먼저 선택하세요.", "카드를 선택한 뒤 분류 항목에서 Enter 또는 Space 키를 누르세요.");
    else placeCard(state.game.selectedCardId, target.dataset.categoryTarget);
  }
});

document.addEventListener("dragstart", (event) => {
  const card = event.target.closest(".sort-card[data-card-id]");
  if (!card || state.game.graded) return;
  event.dataTransfer.setData("text/plain", card.dataset.cardId);
  event.dataTransfer.effectAllowed = "move";
  card.classList.add("is-dragging");
});
document.addEventListener("dragend", (event) => {
  event.target.closest(".sort-card[data-card-id]")?.classList.remove("is-dragging");
  document.querySelectorAll(".category-zone").forEach((zone) => zone.classList.remove("is-drop-target"));
});
els.categoryGrid.addEventListener("dragover", (event) => {
  const zone = event.target.closest(".category-zone");
  if (!zone || state.game.graded) return;
  event.preventDefault();
  document.querySelectorAll(".category-zone").forEach((item) => item.classList.toggle("is-drop-target", item === zone));
});
els.categoryGrid.addEventListener("dragleave", (event) => {
  if (!event.currentTarget.contains(event.relatedTarget)) document.querySelectorAll(".category-zone").forEach((zone) => zone.classList.remove("is-drop-target"));
});
els.categoryGrid.addEventListener("drop", (event) => {
  const zone = event.target.closest(".category-zone");
  if (!zone) return;
  event.preventDefault();
  document.querySelectorAll(".category-zone").forEach((item) => item.classList.remove("is-drop-target"));
  placeCard(event.dataTransfer.getData("text/plain"), zone.dataset.categoryId);
});

document.querySelectorAll("#guideButton, #openGuideFromConcept").forEach((button) => button.addEventListener("click", () => els.guideDialog.showModal()));
document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => button.closest("dialog").close()));
document.querySelector("#editorButton").addEventListener("click", openEditor);
document.querySelectorAll("[data-close-editor]").forEach((button) => button.addEventListener("click", () => els.editorDialog.close()));
document.querySelector("#saveCustomButton").addEventListener("click", saveCustomSet);
document.querySelector("#exportButton").addEventListener("click", exportDraft);
document.querySelector("#addCategoryButton").addEventListener("click", () => {
  syncEditorDraft();
  const id = uid("category");
  state.editorDraft.categories.push({ id, name: `새 항목 ${state.editorDraft.categories.length + 1}`, symbol: String(state.editorDraft.categories.length + 1), summary: "판단 기준을 입력하세요." });
  renderEditor();
});
document.querySelector("#addCardButton").addEventListener("click", () => {
  syncEditorDraft();
  if (!state.editorDraft.categories.length) return;
  state.editorDraft.cards.push({ id: uid("card"), text: "", category: state.editorDraft.categories[0].id, explanation: "", kind: "text", visual: "", ariaLabel: "" });
  renderEditor();
  els.editorCardList.lastElementChild?.querySelector("input")?.focus();
});
els.editorDialog.addEventListener("click", (event) => {
  const removeCategory = event.target.closest("[data-remove-category]");
  const removeCard = event.target.closest("[data-remove-card]");
  if (removeCategory) {
    syncEditorDraft();
    if (state.editorDraft.categories.length <= 2) return showToast("분류 항목은 2개 이상 필요합니다.");
    state.editorDraft.categories = state.editorDraft.categories.filter((category) => category.id !== removeCategory.dataset.removeCategory);
    const fallback = state.editorDraft.categories[0].id;
    state.editorDraft.cards.forEach((card) => { if (card.category === removeCategory.dataset.removeCategory) card.category = fallback; });
    renderEditor();
  }
  if (removeCard) {
    syncEditorDraft();
    if (state.editorDraft.cards.length <= 2) return showToast("카드는 2장 이상 필요합니다.");
    state.editorDraft.cards = state.editorDraft.cards.filter((card) => card.id !== removeCard.dataset.removeCard);
    renderEditor();
  }
});
els.importInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) importDraft(file);
  event.target.value = "";
});
els.retryAllButton.addEventListener("click", () => { els.resultDialog.close(); startGame(); });
els.retryWrongButton.addEventListener("click", () => { const ids = [...state.game.wrongIds]; els.resultDialog.close(); startGame(ids); });
document.querySelector("#reviewBoardButton").addEventListener("click", () => els.resultDialog.close());

startGame();
if (new URLSearchParams(location.search).get("manual") === "1") els.guideDialog.showModal();
