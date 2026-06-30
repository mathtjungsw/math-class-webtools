const $ = (selector) => document.querySelector(selector);

const elements = {
  modeTabs: document.querySelectorAll("[data-mode]"),
  editorPanel: $("#editorPanel"),
  modeLabel: $("#modeLabel"),
  drawTitle: $("#drawTitle"),
  currentStage: $("#currentStage"),
  currentNumber: $("#currentNumber"),
  currentCaption: $("#currentCaption"),
  drawnCount: $("#drawnCount"),
  targetCount: $("#targetCount"),
  totalCards: $("#totalCards"),
  drawsLeft: $("#drawsLeft"),
  cardsLeft: $("#cardsLeft"),
  progressText: $("#progressText"),
  progressFill: $("#progressFill"),
  drawButton: $("#drawButton"),
  topDrawButton: $("#topDrawButton"),
  undoButton: $("#undoButton"),
  resetButton: $("#resetButton"),
  historyGrid: $("#historyGrid"),
  copyHistoryButton: $("#copyHistoryButton"),
  deckBadge: $("#deckBadge"),
  deckSummary: $("#deckSummary"),
  remainingGrid: $("#remainingGrid"),
  editorTotal: $("#editorTotal"),
  editorTarget: $("#editorTarget"),
  exampleButtons: document.querySelectorAll("[data-example]"),
  rangeStart: $("#rangeStart"),
  rangeEnd: $("#rangeEnd"),
  rangeCount: $("#rangeCount"),
  addRangeButton: $("#addRangeButton"),
  singleValue: $("#singleValue"),
  singleCount: $("#singleCount"),
  addSingleButton: $("#addSingleButton"),
  poolTableBody: $("#poolTableBody"),
  clearPoolButton: $("#clearPoolButton"),
  applyEditorButton: $("#applyEditorButton"),
  worksheetButton: $("#worksheetButton"),
  passwordDialog: $("#passwordDialog"),
  passwordForm: $("#passwordForm"),
  worksheetPassword: $("#worksheetPassword"),
  passwordError: $("#passwordError"),
  cancelDownloadButton: $("#cancelDownloadButton"),
  confirmDownloadButton: $("#confirmDownloadButton"),
  toast: $("#toast"),
};

const WORKSHEET_PASSWORD_HASH = "d4c363025fb95b88563b72ac9f9914ba5e04b66d6e6b39591b90fffdd97a5f75";
const WORKSHEET_PATH = "./assets/streams-worksheet.pdf";

function rangeEntries(start, end, count = 1) {
  const step = start <= end ? 1 : -1;
  const entries = [];
  for (let value = start; step > 0 ? value <= end : value >= end; value += step) {
    entries.push({ value, count });
  }
  return entries;
}

function streamsEntries() {
  return [
    ...rangeEntries(1, 10, 1),
    ...rangeEntries(11, 20, 2),
    ...rangeEntries(21, 30, 1),
  ];
}

const EXAMPLES = {
  streams: {
    label: "기본 스트림스",
    target: 20,
    entries: streamsEntries(),
  },
  oneToThirty: {
    label: "1-30 한 벌",
    target: 20,
    entries: rangeEntries(1, 30, 1),
  },
  oneToTwentyDouble: {
    label: "1-20 두 벌",
    target: 20,
    entries: rangeEntries(1, 20, 2),
  },
  digitsFour: {
    label: "0-9 네 벌",
    target: 20,
    entries: rangeEntries(0, 9, 4),
  },
  integers: {
    label: "-10-10 정수",
    target: 15,
    entries: rangeEntries(-10, 10, 1),
  },
};

const BASIC_CONFIG = {
  key: "basic",
  title: "기본 스트림스 덱",
  target: 20,
  entries: streamsEntries(),
  summary: ["1-10, 21-30은 1장씩", "11-20은 2장씩", "총 40장 중 20장 추출"],
};

let currentMode = "basic";
let activeConfig = cloneConfig(BASIC_CONFIG);
let drawState = createDrawState(activeConfig);
let editorEntries = cloneEntries(BASIC_CONFIG.entries);
let editorExampleKey = "streams";
let toastTimer = null;
let previewTimer = null;

function cloneEntries(entries) {
  return entries.map((entry) => ({ value: entry.value, count: entry.count }));
}

function cloneConfig(config) {
  return {
    ...config,
    entries: cloneEntries(config.entries),
    summary: config.summary ? [...config.summary] : undefined,
  };
}

function normalizeEntries(entries) {
  const countByValue = new Map();

  entries.forEach((entry) => {
    const value = Number(entry.value);
    const count = Number(entry.count);
    if (!Number.isInteger(value) || !Number.isFinite(count)) return;
    const safeCount = Math.max(1, Math.min(999, Math.round(count)));
    countByValue.set(value, (countByValue.get(value) || 0) + safeCount);
  });

  return [...countByValue.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value - b.value);
}

function sumCards(entries) {
  return entries.reduce((sum, entry) => sum + entry.count, 0);
}

function expandCards(entries) {
  return entries.flatMap((entry) => Array.from({ length: entry.count }, () => entry.value));
}

function secureRandomInt(maxExclusive) {
  if (maxExclusive <= 1) return 0;
  if (window.crypto?.getRandomValues) {
    const value = new Uint32Array(1);
    window.crypto.getRandomValues(value);
    return value[0] % maxExclusive;
  }
  return Math.floor(Math.random() * maxExclusive);
}

function shuffle(values) {
  const array = [...values];
  for (let index = array.length - 1; index > 0; index -= 1) {
    const randomIndex = secureRandomInt(index + 1);
    [array[index], array[randomIndex]] = [array[randomIndex], array[index]];
  }
  return array;
}

function createDrawState(config) {
  return {
    drawPile: shuffle(expandCards(config.entries)),
    drawn: [],
    current: null,
    busy: false,
  };
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : String(value ?? "");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getCounts(values) {
  return values.reduce((map, value) => {
    map.set(value, (map.get(value) || 0) + 1);
    return map;
  }, new Map());
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("show"), 2200);
}

function hasProgress() {
  return drawState.drawn.length > 0;
}

function renderModeTabs() {
  elements.modeTabs.forEach((button) => {
    const selected = button.dataset.mode === currentMode;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-selected", String(selected));
  });
  elements.editorPanel.hidden = currentMode !== "edit";
}

function renderDrawPanel() {
  const total = sumCards(activeConfig.entries);
  const target = Math.min(activeConfig.target, total);
  const drawn = drawState.drawn.length;
  const drawLimitReached = drawn >= target;
  const pileEmpty = drawState.drawPile.length === 0;
  const percent = target ? Math.round((drawn / target) * 100) : 0;

  elements.modeLabel.textContent = activeConfig.title;
  elements.drawTitle.textContent = drawLimitReached ? "추출이 완료되었습니다" : "숫자를 하나씩 추출하세요";
  elements.drawnCount.textContent = drawn;
  elements.targetCount.textContent = target;
  elements.totalCards.textContent = total;
  elements.drawsLeft.textContent = Math.max(0, target - drawn);
  elements.cardsLeft.textContent = drawState.drawPile.length;
  elements.progressText.textContent = `${percent}%`;
  elements.progressFill.style.width = `${percent}%`;

  if (drawState.current === null) {
    elements.currentNumber.textContent = "준비";
    elements.currentCaption.textContent = "아직 추출한 수가 없습니다";
  } else {
    elements.currentNumber.textContent = formatNumber(drawState.current);
    elements.currentCaption.textContent = `${drawn}번째 추출`;
  }

  if (drawLimitReached) {
    elements.currentCaption.textContent = `${target}개 추출 완료`;
  } else if (pileEmpty) {
    elements.currentCaption.textContent = "카드 풀이 비었습니다";
  }

  const disabled = drawState.busy || drawLimitReached || pileEmpty;
  elements.drawButton.disabled = disabled;
  elements.topDrawButton.disabled = disabled;
  elements.undoButton.disabled = drawState.busy || drawn === 0;
}

function renderHistory() {
  const target = Math.min(activeConfig.target, sumCards(activeConfig.entries));
  const occurrenceCount = new Map();

  elements.historyGrid.innerHTML = Array.from({ length: target }, (_, index) => {
    const value = drawState.drawn[index];
    if (value === undefined) {
      return `<li class="history-cell"><small>${index + 1}</small></li>`;
    }

    const occurrence = (occurrenceCount.get(value) || 0) + 1;
    occurrenceCount.set(value, occurrence);
    const isCurrent = index === drawState.drawn.length - 1;
    const occurrenceText = occurrence > 1 ? ` · ${occurrence}회째` : "";

    return `
      <li class="history-cell is-filled ${isCurrent ? "current" : ""}">
        <strong>${escapeHtml(formatNumber(value))}</strong>
        <small>${index + 1}번째${occurrenceText}</small>
      </li>
    `;
  }).join("");
}

function renderDeckPanel() {
  const total = sumCards(activeConfig.entries);
  const remainingCounts = getCounts(drawState.drawPile);
  const currentValue = drawState.current;

  elements.deckBadge.textContent = `${drawState.drawPile.length}/${total}장`;
  const summary = activeConfig.summary || [
    `${activeConfig.entries.length}종의 수`,
    `총 ${total}장`,
    `${Math.min(activeConfig.target, total)}개 추출`,
  ];
  elements.deckSummary.innerHTML = summary.map((item) => `<span>${escapeHtml(item)}</span>`).join("");

  elements.remainingGrid.innerHTML = activeConfig.entries.map((entry) => {
    const remaining = remainingCounts.get(entry.value) || 0;
    const classes = [
      "remaining-tile",
      remaining === 0 ? "empty" : "",
      currentValue === entry.value ? "current" : "",
    ].filter(Boolean).join(" ");

    return `
      <div class="${classes}">
        <strong>${escapeHtml(formatNumber(entry.value))}</strong>
        <small>${remaining}/${entry.count}장</small>
      </div>
    `;
  }).join("");
}

function renderEditor() {
  const total = sumCards(editorEntries);
  elements.editorTotal.textContent = `${total}장`;
  elements.editorTarget.value = Math.max(1, Number(elements.editorTarget.value) || 1);

  elements.exampleButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.example === editorExampleKey);
  });

  elements.poolTableBody.innerHTML = editorEntries.length
    ? editorEntries.map((entry, index) => `
      <tr data-index="${index}">
        <td><input class="pool-value" type="number" step="1" value="${entry.value}" aria-label="${index + 1}번째 수" /></td>
        <td><input class="pool-count" type="number" min="1" max="999" step="1" value="${entry.count}" aria-label="${entry.value}의 카드 개수" /></td>
        <td><button class="delete-row" type="button" aria-label="${entry.value} 삭제">×</button></td>
      </tr>
    `).join("")
    : '<tr><td colspan="3" class="empty-pool">카드 풀이 비었습니다</td></tr>';
}

function render() {
  renderModeTabs();
  renderDrawPanel();
  renderHistory();
  renderDeckPanel();
  renderEditor();
}

function resetDrawState(reshuffle = true) {
  drawState = createDrawState(activeConfig);
  if (!reshuffle) {
    drawState.drawPile = expandCards(activeConfig.entries);
  }
  render();
}

async function drawOne() {
  const target = Math.min(activeConfig.target, sumCards(activeConfig.entries));
  if (drawState.busy || drawState.drawn.length >= target || drawState.drawPile.length === 0) return;

  drawState.busy = true;
  render();
  elements.currentStage.classList.add("is-drawing");

  previewTimer = window.setInterval(() => {
    const preview = drawState.drawPile[secureRandomInt(drawState.drawPile.length)];
    elements.currentNumber.textContent = formatNumber(preview);
    elements.currentCaption.textContent = "추출 중";
  }, 55);

  await new Promise((resolve) => window.setTimeout(resolve, 430));
  window.clearInterval(previewTimer);

  const value = drawState.drawPile.shift();
  drawState.drawn.push(value);
  drawState.current = value;
  drawState.busy = false;
  elements.currentStage.classList.remove("is-drawing");
  render();
}

function undoLast() {
  if (drawState.busy || drawState.drawn.length === 0) return;
  const value = drawState.drawn.pop();
  drawState.drawPile.unshift(value);
  drawState.current = drawState.drawn.at(-1) ?? null;
  render();
}

function requestReset() {
  if (hasProgress() && !window.confirm("현재 추출 기록을 지우고 다시 섞을까요?")) return;
  resetDrawState();
}

function switchMode(mode) {
  if (!["basic", "edit"].includes(mode) || currentMode === mode) return;

  if (mode === "basic") {
    if (hasProgress() && !window.confirm("기본 모드로 바꾸면 현재 추출 기록이 초기화됩니다. 계속할까요?")) {
      renderModeTabs();
      return;
    }
    currentMode = "basic";
    activeConfig = cloneConfig(BASIC_CONFIG);
    editorEntries = cloneEntries(BASIC_CONFIG.entries);
    editorExampleKey = "streams";
    elements.editorTarget.value = BASIC_CONFIG.target;
    resetDrawState();
    return;
  }

  currentMode = "edit";
  editorEntries = cloneEntries(activeConfig.entries);
  elements.editorTarget.value = activeConfig.target;
  editorExampleKey = activeConfig.key === "basic" ? "streams" : "";
  render();
}

function loadExample(key) {
  const example = EXAMPLES[key];
  if (!example) return;
  editorEntries = normalizeEntries(example.entries);
  editorExampleKey = key;
  elements.editorTarget.value = example.target;
  renderEditor();
}

function addEntriesToEditor(entries) {
  editorEntries = normalizeEntries([...editorEntries, ...entries]);
  editorExampleKey = "";
  renderEditor();
}

function addRange() {
  const start = Number(elements.rangeStart.value);
  const end = Number(elements.rangeEnd.value);
  const count = Number(elements.rangeCount.value);

  if (!Number.isInteger(start) || !Number.isInteger(end) || !Number.isInteger(count) || count < 1) {
    showToast("범위와 개수를 정수로 입력하세요.");
    return;
  }

  if (Math.abs(end - start) > 300) {
    showToast("한 번에 추가할 범위는 301개 이하로 제한됩니다.");
    return;
  }

  addEntriesToEditor(rangeEntries(start, end, Math.min(999, count)));
}

function addSingle() {
  const value = Number(elements.singleValue.value);
  const count = Number(elements.singleCount.value);

  if (!Number.isInteger(value) || !Number.isInteger(count) || count < 1) {
    showToast("수와 개수를 정수로 입력하세요.");
    return;
  }

  addEntriesToEditor([{ value, count: Math.min(999, count) }]);
}

function applyEditorConfig() {
  const entries = normalizeEntries(editorEntries);
  const total = sumCards(entries);
  let target = Number(elements.editorTarget.value);

  if (!entries.length || total === 0) {
    showToast("카드 풀에 수를 하나 이상 넣어 주세요.");
    return;
  }

  if (!Number.isInteger(target) || target < 1) {
    showToast("추출할 개수를 1 이상의 정수로 입력하세요.");
    return;
  }

  if (target > total) {
    target = total;
    elements.editorTarget.value = total;
    showToast(`카드가 ${total}장이라 추출 개수를 ${total}개로 맞췄습니다.`);
  }

  const example = EXAMPLES[editorExampleKey];
  activeConfig = {
    key: "custom",
    title: example ? example.label : "사용자 편집 덱",
    target,
    entries,
  };
  currentMode = "edit";
  editorEntries = cloneEntries(entries);
  resetDrawState();
}

function updatePoolRow(row, field, value) {
  const index = Number(row.dataset.index);
  if (!Number.isInteger(index) || !editorEntries[index]) return;

  if (field === "value") {
    const nextValue = Number(value);
    if (!Number.isInteger(nextValue)) {
      renderEditor();
      return;
    }
    editorEntries[index].value = nextValue;
  } else {
    const nextCount = Number(value);
    editorEntries[index].count = Number.isInteger(nextCount) ? Math.max(1, Math.min(999, nextCount)) : 1;
  }

  editorEntries = normalizeEntries(editorEntries);
  editorExampleKey = "";
  renderEditor();
}

function deletePoolRow(row) {
  const index = Number(row.dataset.index);
  if (!Number.isInteger(index)) return;
  editorEntries.splice(index, 1);
  editorExampleKey = "";
  renderEditor();
}

async function copyHistory() {
  if (!drawState.drawn.length) {
    showToast("복사할 추출 기록이 없습니다.");
    return;
  }

  const text = drawState.drawn.map((value, index) => `${index + 1}. ${formatNumber(value)}`).join("\n");

  try {
    await navigator.clipboard.writeText(text);
    showToast("추출 기록을 복사했습니다.");
  } catch {
    showToast("브라우저 권한 때문에 복사하지 못했습니다.");
  }
}

async function sha256(value) {
  const data = new TextEncoder().encode(value);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function openPasswordDialog() {
  elements.passwordForm.reset();
  elements.passwordError.textContent = "";
  elements.worksheetPassword.removeAttribute("aria-invalid");
  elements.passwordDialog.showModal();
  window.setTimeout(() => elements.worksheetPassword.focus(), 0);
}

async function downloadWorksheet() {
  elements.confirmDownloadButton.disabled = true;
  elements.confirmDownloadButton.textContent = "확인 중";

  try {
    const passwordHash = await sha256(elements.worksheetPassword.value);
    if (passwordHash !== WORKSHEET_PASSWORD_HASH) {
      elements.passwordError.textContent = "비밀번호가 올바르지 않습니다.";
      elements.worksheetPassword.setAttribute("aria-invalid", "true");
      elements.worksheetPassword.select();
      return;
    }

    const response = await fetch(WORKSHEET_PATH);
    if (!response.ok) throw new Error("Worksheet download failed");

    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = "스트림스 활동지.pdf";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    elements.passwordDialog.close();
    showToast("활동지 다운로드를 시작했습니다.");
  } catch {
    elements.passwordError.textContent = "파일을 불러오지 못했습니다. 잠시 후 다시 시도하세요.";
  } finally {
    elements.confirmDownloadButton.disabled = false;
    elements.confirmDownloadButton.textContent = "다운로드";
  }
}

elements.modeTabs.forEach((button) => {
  button.addEventListener("click", () => switchMode(button.dataset.mode));
});

elements.drawButton.addEventListener("click", drawOne);
elements.topDrawButton.addEventListener("click", drawOne);
elements.undoButton.addEventListener("click", undoLast);
elements.resetButton.addEventListener("click", requestReset);
elements.copyHistoryButton.addEventListener("click", copyHistory);
elements.worksheetButton.addEventListener("click", openPasswordDialog);
elements.cancelDownloadButton.addEventListener("click", () => elements.passwordDialog.close());
elements.passwordForm.addEventListener("submit", (event) => {
  event.preventDefault();
  downloadWorksheet();
});
elements.worksheetPassword.addEventListener("input", () => {
  elements.passwordError.textContent = "";
  elements.worksheetPassword.removeAttribute("aria-invalid");
});

elements.exampleButtons.forEach((button) => {
  button.addEventListener("click", () => loadExample(button.dataset.example));
});

elements.addRangeButton.addEventListener("click", addRange);
elements.addSingleButton.addEventListener("click", addSingle);
elements.clearPoolButton.addEventListener("click", () => {
  editorEntries = [];
  editorExampleKey = "";
  renderEditor();
});
elements.applyEditorButton.addEventListener("click", applyEditorConfig);

elements.poolTableBody.addEventListener("change", (event) => {
  const row = event.target.closest("tr[data-index]");
  if (!row) return;
  if (event.target.classList.contains("pool-value")) {
    updatePoolRow(row, "value", event.target.value);
  } else if (event.target.classList.contains("pool-count")) {
    updatePoolRow(row, "count", event.target.value);
  }
});

elements.poolTableBody.addEventListener("click", (event) => {
  const button = event.target.closest(".delete-row");
  if (!button) return;
  deletePoolRow(button.closest("tr[data-index]"));
});

document.addEventListener("keydown", (event) => {
  const activeElement = document.activeElement;
  const isTyping = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement;
  if (isTyping) return;

  if (event.code === "Space") {
    event.preventDefault();
    drawOne();
  }
});

render();
