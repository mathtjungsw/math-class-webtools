"use strict";

const { analyzeSquare, orderVertices } = window.SquareGeometry;

const GRID_MIN = -4;
const GRID_MAX = 4;
const GRID_SIZE = GRID_MAX - GRID_MIN + 1;
const BOARD_MARGIN = 48;
const BOARD_STEP = 58;
const TEAM_COLORS = ["#1f7a52", "#315fa8", "#cf5945", "#73559f"];

const elements = {
  modeButtons: [...document.querySelectorAll("[data-mode]")],
  battleSettings: document.querySelector("#battleSettings"),
  playerCount: document.querySelector("#playerCount"),
  roundCount: document.querySelector("#roundCount"),
  applySettingsButton: document.querySelector("#applySettingsButton"),
  turnLabel: document.querySelector("#turnLabel"),
  turnDot: document.querySelector("#turnDot"),
  turnPlayer: document.querySelector("#turnPlayer"),
  turnMessage: document.querySelector("#turnMessage"),
  selectionCount: document.querySelector("#selectionCount"),
  coordinateSlots: document.querySelector("#coordinateSlots"),
  feedback: document.querySelector("#feedback"),
  clearButton: document.querySelector("#clearButton"),
  confirmButton: document.querySelector("#confirmButton"),
  undoButton: document.querySelector("#undoButton"),
  completedCount: document.querySelector("#completedCount"),
  scoreTitle: document.querySelector("#scoreTitle"),
  scoreList: document.querySelector("#scoreList"),
  boardArt: document.querySelector("#boardArt"),
  pointLayer: document.querySelector("#pointLayer"),
  emptyMath: document.querySelector("#emptyMath"),
  mathContent: document.querySelector("#mathContent"),
  shapeChip: document.querySelector("#shapeChip"),
  coordinateSummary: document.querySelector("#coordinateSummary"),
  sideValue: document.querySelector("#sideValue"),
  areaValue: document.querySelector("#areaValue"),
  diagonalValue: document.querySelector("#diagonalValue"),
  reasoningText: document.querySelector("#reasoningText"),
  historyCount: document.querySelector("#historyCount"),
  historyList: document.querySelector("#historyList"),
  helpButton: document.querySelector("#helpButton"),
  helpDialog: document.querySelector("#helpDialog"),
  newGameButton: document.querySelector("#newGameButton"),
  toast: document.querySelector("#toast")
};

const state = {
  mode: "practice",
  players: [],
  roundsPerPlayer: 5,
  currentPlayer: 0,
  movesCompleted: 0,
  selectedPoints: [],
  history: [],
  gameOver: false,
  focusedPointIndex: 40
};

let toastTimer = 0;

function createPlayers(count) {
  return Array.from({ length: count }, (_, index) => ({
    name: `팀 ${String.fromCharCode(65 + index)}`,
    color: TEAM_COLORS[index],
    score: 0,
    attempts: 0
  }));
}

function resetGame() {
  const playerCount = Number(elements.playerCount.value);
  state.players = createPlayers(state.mode === "battle" ? playerCount : 1);
  state.roundsPerPlayer = Number(elements.roundCount.value);
  state.currentPlayer = 0;
  state.movesCompleted = 0;
  state.selectedPoints = [];
  state.history = [];
  state.gameOver = false;
  render();
}

function selectMode(mode) {
  if (mode === state.mode) return;
  if ((state.history.length || state.selectedPoints.length) && !window.confirm("현재 기록을 지우고 게임 방식을 바꿀까요?")) {
    return;
  }
  state.mode = mode;
  elements.battleSettings.hidden = mode !== "battle";
  elements.modeButtons.forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  resetGame();
}

function pointKey(point) {
  return `${point.x},${point.y}`;
}

function coordinateText(point) {
  return `(${point.x}, ${point.y})`;
}

function pointToBoard(point) {
  return {
    x: BOARD_MARGIN + (point.x - GRID_MIN) * BOARD_STEP,
    y: BOARD_MARGIN + (GRID_MAX - point.y) * BOARD_STEP
  };
}

function createSvgElement(name, attributes = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function polygonPoints(points) {
  return points
    .map(pointToBoard)
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
}

function drawGrid() {
  elements.boardArt.replaceChildren();

  const gridGroup = createSvgElement("g");
  for (let index = 0; index < GRID_SIZE; index += 1) {
    const position = BOARD_MARGIN + index * BOARD_STEP;
    const coordinate = GRID_MIN + index;
    const verticalClass = coordinate === 0 ? "axis-line" : "grid-line";
    const horizontalCoordinate = GRID_MAX - index;
    const horizontalClass = horizontalCoordinate === 0 ? "axis-line" : "grid-line";

    gridGroup.append(
      createSvgElement("line", { x1: position, y1: BOARD_MARGIN, x2: position, y2: 512, class: verticalClass }),
      createSvgElement("line", { x1: BOARD_MARGIN, y1: position, x2: 512, y2: position, class: horizontalClass })
    );

    const xLabel = createSvgElement("text", { x: position, y: 540, class: "axis-label", "text-anchor": "middle" });
    xLabel.textContent = String(coordinate);
    const yLabel = createSvgElement("text", {
      x: 22,
      y: position + 5,
      class: "axis-label",
      "text-anchor": "middle"
    });
    yLabel.textContent = String(horizontalCoordinate);
    gridGroup.append(xLabel, yLabel);
  }
  elements.boardArt.append(gridGroup);

  state.history.forEach((record) => {
    const polygon = createSvgElement("polygon", {
      points: polygonPoints(record.analysis.orderedPoints),
      class: "saved-square",
      fill: record.color,
      stroke: record.color
    });
    elements.boardArt.append(polygon);
  });

  if (state.selectedPoints.length >= 2) {
    if (state.selectedPoints.length === 4) {
      const analysis = analyzeCurrentSelection();
      const ordered = analysis.valid ? analysis.orderedPoints : orderVertices(state.selectedPoints);
      elements.boardArt.append(
        createSvgElement("polygon", {
          points: polygonPoints(ordered),
          class: `preview-square${analysis.valid && !isDuplicate(analysis) ? "" : " is-invalid"}`
        })
      );
    } else {
      elements.boardArt.append(
        createSvgElement("polyline", {
          points: polygonPoints(state.selectedPoints),
          class: "preview-path"
        })
      );
    }
  }
}

function createPointButtons() {
  const fragment = document.createDocumentFragment();
  let pointIndex = 0;

  for (let y = GRID_MAX; y >= GRID_MIN; y -= 1) {
    for (let x = GRID_MIN; x <= GRID_MAX; x += 1) {
      const button = document.createElement("button");
      const left = (pointToBoard({ x, y }).x / 560) * 100;
      const top = (pointToBoard({ x, y }).y / 560) * 100;
      button.className = "grid-point";
      button.type = "button";
      button.style.left = `${left}%`;
      button.style.top = `${top}%`;
      button.dataset.x = String(x);
      button.dataset.y = String(y);
      button.dataset.index = String(pointIndex);
      button.setAttribute("role", "gridcell");
      button.setAttribute("aria-label", `좌표 ${coordinateText({ x, y })}`);
      button.setAttribute("aria-selected", "false");
      button.tabIndex = pointIndex === state.focusedPointIndex ? 0 : -1;
      fragment.append(button);
      pointIndex += 1;
    }
  }

  elements.pointLayer.replaceChildren(fragment);
}

function updatePointButtons() {
  const selectedMap = new Map(state.selectedPoints.map((point, index) => [pointKey(point), index + 1]));
  elements.pointLayer.querySelectorAll(".grid-point").forEach((button) => {
    const key = `${button.dataset.x},${button.dataset.y}`;
    const order = selectedMap.get(key);
    const isSelected = Boolean(order);
    button.setAttribute("aria-selected", String(isSelected));
    button.dataset.order = isSelected ? String(order) : "";
    button.disabled = state.gameOver || (state.selectedPoints.length >= 4 && !isSelected);
    button.tabIndex = Number(button.dataset.index) === state.focusedPointIndex ? 0 : -1;
  });
}

function analyzeCurrentSelection() {
  return analyzeSquare(state.selectedPoints);
}

function isDuplicate(analysis) {
  return analysis.valid && state.history.some((record) => record.analysis.key === analysis.key);
}

function renderSelection() {
  elements.selectionCount.textContent = String(state.selectedPoints.length);
  elements.coordinateSlots.replaceChildren(
    ...Array.from({ length: 4 }, (_, index) => {
      const item = document.createElement("li");
      const point = state.selectedPoints[index];
      item.className = `coordinate-slot${point ? " is-filled" : ""}`;
      item.textContent = point ? `${String.fromCharCode(65 + index)} ${coordinateText(point)}` : `${index + 1}번째 점`;
      return item;
    })
  );

  const analysis = analyzeCurrentSelection();
  const duplicate = isDuplicate(analysis);
  elements.feedback.className = "feedback";

  if (state.gameOver) {
    elements.feedback.classList.add("is-neutral");
    elements.feedback.textContent = "대결이 끝났습니다. 되돌리거나 새 게임을 시작할 수 있어요.";
  } else if (state.selectedPoints.length === 0) {
    elements.feedback.classList.add("is-neutral");
    elements.feedback.textContent = "첫 번째 점을 선택해 시작하세요.";
  } else if (state.selectedPoints.length < 4) {
    elements.feedback.classList.add("is-neutral");
    elements.feedback.textContent = `${4 - state.selectedPoints.length}개의 점을 더 선택하세요.`;
  } else if (!analysis.valid) {
    elements.feedback.classList.add("is-invalid");
    elements.feedback.textContent = analysis.reason;
  } else if (duplicate) {
    elements.feedback.classList.add("is-invalid");
    elements.feedback.textContent = "이미 완성한 정사각형입니다. 다른 네 점을 찾아보세요.";
  } else {
    elements.feedback.classList.add("is-valid");
    elements.feedback.textContent = `${analysis.tilted ? "기울어진" : "축에 평행한"} 정사각형입니다! 수학 설명을 확인하고 확정하세요.`;
  }

  elements.confirmButton.disabled = !analysis.valid || duplicate || state.gameOver;
  elements.clearButton.disabled = state.selectedPoints.length === 0;
  elements.undoButton.disabled = state.selectedPoints.length === 0 && state.history.length === 0;
}

function renderMath() {
  const analysis = analyzeCurrentSelection();
  const hasFourPoints = state.selectedPoints.length === 4;
  const duplicate = isDuplicate(analysis);

  elements.shapeChip.className = "shape-chip";
  if (!hasFourPoints) {
    elements.shapeChip.textContent = "선택 전";
    elements.emptyMath.hidden = false;
    elements.emptyMath.textContent = "점 4개를 선택하면 좌표, 변의 길이, 넓이와 대각선이 여기에 나타납니다.";
    elements.mathContent.hidden = true;
    return;
  }

  if (!analysis.valid || duplicate) {
    elements.shapeChip.classList.add("is-invalid");
    elements.shapeChip.textContent = duplicate ? "중복 도형" : "조건 불충족";
    elements.emptyMath.hidden = false;
    elements.emptyMath.textContent = duplicate ? "같은 네 꼭짓점으로 만든 정사각형은 한 번만 기록할 수 있습니다." : analysis.reason;
    elements.mathContent.hidden = true;
    return;
  }

  elements.shapeChip.classList.add("is-valid");
  elements.shapeChip.textContent = analysis.tilted ? "기울어진 정사각형" : "축에 평행한 정사각형";
  elements.emptyMath.hidden = true;
  elements.mathContent.hidden = false;
  elements.coordinateSummary.replaceChildren(
    ...analysis.orderedPoints.map((point, index) => {
      const chip = document.createElement("span");
      chip.textContent = `${String.fromCharCode(65 + index)} ${coordinateText(point)}`;
      return chip;
    })
  );
  elements.sideValue.textContent = analysis.sideExpression;
  elements.areaValue.textContent = `${analysis.area}`;
  elements.diagonalValue.textContent = analysis.diagonalExpression;

  const dx = Math.abs(analysis.vector.dx);
  const dy = Math.abs(analysis.vector.dy);
  elements.reasoningText.textContent =
    `한 변의 가로·세로 변화량은 ${dx}, ${dy}입니다. ` +
    `변² = ${dx}² + ${dy}² = ${analysis.sideSquared}이므로 변은 ${analysis.sideExpression}, 넓이는 ${analysis.area}입니다. ` +
    `대각선² = ${analysis.sideSquared} + ${analysis.sideSquared} = ${analysis.diagonalSquared}이므로 대각선은 ${analysis.diagonalExpression}입니다.`;
}

function renderTurn() {
  if (state.mode === "practice") {
    elements.turnLabel.textContent = "개인 연습";
    elements.turnPlayer.textContent = "자유 탐구";
    elements.turnDot.style.background = TEAM_COLORS[0];
    elements.turnMessage.textContent = "축에 평행한 모양과 기울어진 모양을 모두 찾아보세요.";
    return;
  }

  if (state.gameOver) {
    const highestScore = Math.max(...state.players.map((player) => player.score));
    const winners = state.players.filter((player) => player.score === highestScore).map((player) => player.name);
    elements.turnLabel.textContent = "대결 종료";
    elements.turnPlayer.textContent = winners.length === 1 ? `${winners[0]} 승리!` : `${winners.join(" · ")} 공동 우승`;
    elements.turnDot.style.background = winners.length === 1
      ? state.players.find((player) => player.name === winners[0]).color
      : "#b98518";
    elements.turnMessage.textContent = `최고 점수 ${highestScore}점 · 되돌리기로 마지막 도전을 다시 진행할 수 있습니다.`;
    return;
  }

  const player = state.players[state.currentPlayer];
  elements.turnLabel.textContent = `${player.attempts + 1} / ${state.roundsPerPlayer}번째 도전`;
  elements.turnPlayer.textContent = `${player.name} 차례`;
  elements.turnDot.style.background = player.color;
  elements.turnMessage.textContent = "넓이만큼 점수! 기울어진 정사각형은 보너스 2점입니다.";
}

function renderScores() {
  const totalArea = state.history.reduce((sum, record) => sum + record.analysis.area, 0);
  elements.completedCount.textContent = `${state.history.length}개`;
  elements.scoreTitle.textContent = state.mode === "battle" ? "팀 점수" : "발견 기록";

  if (state.mode === "practice") {
    const item = document.createElement("li");
    item.className = "score-item is-current";
    item.style.setProperty("--team-color", TEAM_COLORS[0]);
    item.innerHTML = `<i></i><span>완성 ${state.history.length}개<small>정사각형 넓이의 합</small></span><strong>${totalArea}</strong>`;
    elements.scoreList.replaceChildren(item);
    return;
  }

  elements.scoreList.replaceChildren(
    ...state.players.map((player, index) => {
      const item = document.createElement("li");
      item.className = `score-item${!state.gameOver && index === state.currentPlayer ? " is-current" : ""}`;
      item.style.setProperty("--team-color", player.color);
      const marker = document.createElement("i");
      const name = document.createElement("span");
      name.textContent = player.name;
      const meta = document.createElement("small");
      meta.textContent = `${player.attempts} / ${state.roundsPerPlayer}회`;
      name.append(meta);
      const score = document.createElement("strong");
      score.textContent = `${player.score}점`;
      item.append(marker, name, score);
      return item;
    })
  );
}

function renderHistory() {
  elements.historyCount.textContent = String(state.history.length);
  if (!state.history.length) {
    const empty = document.createElement("li");
    empty.className = "history-empty";
    empty.textContent = "아직 완성한 정사각형이 없습니다.";
    elements.historyList.replaceChildren(empty);
    return;
  }

  elements.historyList.replaceChildren(
    ...[...state.history].reverse().map((record, reversedIndex) => {
      const item = document.createElement("li");
      item.className = "history-item";
      item.style.setProperty("--history-color", record.color);
      const number = state.history.length - reversedIndex;
      const heading = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = `${number}. ${record.owner}`;
      const score = document.createElement("b");
      score.textContent = state.mode === "battle" ? `+${record.score}점` : `넓이 ${record.analysis.area}`;
      heading.append(title, score);
      const coordinates = document.createElement("p");
      coordinates.textContent = record.analysis.orderedPoints.map(coordinateText).join(" · ");
      const values = document.createElement("p");
      values.textContent = `변 ${record.analysis.sideExpression} · 대각선 ${record.analysis.diagonalExpression}${record.analysis.tilted ? " · 기울어짐" : ""}`;
      item.append(heading, coordinates, values);
      return item;
    })
  );
}

function render() {
  renderTurn();
  renderSelection();
  renderMath();
  renderScores();
  renderHistory();
  drawGrid();
  updatePointButtons();
}

function togglePoint(point) {
  if (state.gameOver) return;
  const key = pointKey(point);
  const selectedIndex = state.selectedPoints.findIndex((selected) => pointKey(selected) === key);
  if (selectedIndex >= 0) {
    state.selectedPoints.splice(selectedIndex, 1);
  } else if (state.selectedPoints.length < 4) {
    state.selectedPoints.push(point);
  }
  render();
}

function confirmSquare() {
  const analysis = analyzeCurrentSelection();
  if (!analysis.valid || isDuplicate(analysis) || state.gameOver) return;

  const player = state.players[state.mode === "battle" ? state.currentPlayer : 0];
  const score = analysis.area + (state.mode === "battle" && analysis.tilted ? 2 : 0);
  const record = {
    owner: state.mode === "battle" ? player.name : "개인 연습",
    teamIndex: state.mode === "battle" ? state.currentPlayer : 0,
    color: player.color,
    points: state.selectedPoints.map((point) => ({ ...point })),
    analysis,
    score
  };

  state.history.push(record);
  state.movesCompleted += 1;
  if (state.mode === "battle") {
    player.score += score;
    player.attempts += 1;
    if (state.movesCompleted >= state.players.length * state.roundsPerPlayer) {
      state.gameOver = true;
    } else {
      state.currentPlayer = (state.currentPlayer + 1) % state.players.length;
    }
  }

  state.selectedPoints = [];
  showToast(
    state.mode === "battle"
      ? `${record.owner}: ${analysis.area}점${analysis.tilted ? " + 기울기 보너스 2점" : ""}`
      : `${analysis.tilted ? "기울어진" : "축에 평행한"} 정사각형을 기록했습니다.`
  );
  render();
}

function undoLastAction() {
  if (state.selectedPoints.length) {
    state.selectedPoints.pop();
    render();
    return;
  }

  const record = state.history.pop();
  if (!record) return;
  state.movesCompleted = Math.max(0, state.movesCompleted - 1);
  state.gameOver = false;
  if (state.mode === "battle") {
    const player = state.players[record.teamIndex];
    player.score -= record.score;
    player.attempts -= 1;
    state.currentPlayer = record.teamIndex;
  }
  state.selectedPoints = record.points.map((point) => ({ ...point }));
  showToast("마지막 기록을 되돌렸습니다. 네 점을 다시 조정할 수 있어요.");
  render();
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 2600);
}

function handlePointLayerClick(event) {
  const button = event.target.closest(".grid-point");
  if (!button) return;
  state.focusedPointIndex = Number(button.dataset.index);
  togglePoint({ x: Number(button.dataset.x), y: Number(button.dataset.y) });
}

function handlePointKeydown(event) {
  const button = event.target.closest(".grid-point");
  if (!button) return;

  if (["Enter", " "].includes(event.key)) {
    event.preventDefault();
    state.focusedPointIndex = Number(button.dataset.index);
    togglePoint({ x: Number(button.dataset.x), y: Number(button.dataset.y) });
    return;
  }

  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;

  event.preventDefault();
  const index = Number(button.dataset.index);
  const row = Math.floor(index / GRID_SIZE);
  const column = index % GRID_SIZE;
  const next = {
    ArrowLeft: [row, Math.max(0, column - 1)],
    ArrowRight: [row, Math.min(GRID_SIZE - 1, column + 1)],
    ArrowUp: [Math.max(0, row - 1), column],
    ArrowDown: [Math.min(GRID_SIZE - 1, row + 1), column]
  }[event.key];
  const nextIndex = next[0] * GRID_SIZE + next[1];
  state.focusedPointIndex = nextIndex;
  updatePointButtons();
  elements.pointLayer.querySelector(`[data-index="${nextIndex}"]`)?.focus();
}

elements.modeButtons.forEach((button) => button.addEventListener("click", () => selectMode(button.dataset.mode)));
elements.applySettingsButton.addEventListener("click", () => {
  resetGame();
  showToast(`${elements.playerCount.value}팀 대결을 시작합니다.`);
});
elements.playerCount.addEventListener("change", () => {
  elements.applySettingsButton.textContent = "설정 적용";
});
elements.roundCount.addEventListener("change", () => {
  elements.applySettingsButton.textContent = "설정 적용";
});
elements.pointLayer.addEventListener("click", handlePointLayerClick);
elements.pointLayer.addEventListener("keydown", handlePointKeydown);
elements.clearButton.addEventListener("click", () => {
  state.selectedPoints = [];
  render();
});
elements.confirmButton.addEventListener("click", confirmSquare);
elements.undoButton.addEventListener("click", undoLastAction);
elements.helpButton.addEventListener("click", () => elements.helpDialog.showModal());
elements.newGameButton.addEventListener("click", () => {
  if ((state.history.length || state.selectedPoints.length) && !window.confirm("모든 점수와 기록을 지우고 새 게임을 시작할까요?")) {
    return;
  }
  resetGame();
  showToast("새 게임을 시작했습니다.");
});

createPointButtons();
resetGame();

if (new URLSearchParams(window.location.search).has("manual")) {
  elements.helpDialog.showModal();
}
