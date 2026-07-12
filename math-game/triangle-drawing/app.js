const BOARD_VALUES = [
  [4, 5, 1, 1, 2, 4, 4, 2, 2, 2, 4, 5, 3, 4, 5],
  [1, 6, 4, 6, 2, 4, 3, 3, 5, 5, 6, 2, 3, 1, 6],
  [6, 3, 3, 5, 4, 2, 1, 5, 6, 5, 1, 6, 2, 6, 3],
  [1, 3, 3, 4, 5, 2, 6, 3, 6, 6, 2, 4, 2, 1, 3],
  [4, 3, 1, 1, 2, 1, 1, 5, 5, 1, 4, 2, 1, 4, 3],
  [4, 1, 1, 2, 1, 2, 5, 2, 5, 1, 4, 3, 1, 4, 1],
  [2, 2, 6, 5, 2, 5, 3, 5, 2, 6, 3, 4, 4, 2, 2],
  [5, 1, 1, 5, 5, 2, 3, 6, 6, 3, 4, 3, 6, 5, 1],
  [5, 1, 1, 4, 6, 5, 2, 2, 5, 1, 5, 2, 1, 5, 1],
  [1, 6, 1, 1, 4, 1, 2, 1, 5, 4, 1, 4, 5, 1, 6],
  [2, 3, 5, 1, 1, 3, 3, 3, 3, 3, 3, 6, 4, 2, 3],
  [5, 5, 3, 3, 5, 4, 6, 2, 6, 1, 5, 4, 6, 5, 5],
  [1, 2, 2, 3, 4, 4, 4, 4, 5, 2, 6, 6, 4, 1, 2],
  [2, 2, 2, 6, 3, 5, 3, 5, 5, 6, 6, 1, 4, 2, 2],
  [1, 2, 5, 3, 5, 1, 1, 6, 6, 6, 2, 5, 1, 1, 2],
  [6, 3, 2, 3, 6, 5, 2, 2, 3, 5, 1, 1, 4, 6, 3],
  [6, 3, 3, 1, 4, 5, 2, 3, 6, 6, 6, 5, 4, 6, 3],
  [6, 3, 4, 4, 2, 4, 3, 4, 6, 6, 6, 3, 1, 6, 3],
  [6, 5, 1, 3, 4, 2, 2, 2, 1, 4, 2, 6, 6, 6, 5],
  [1, 3, 6, 6, 2, 1, 4, 4, 6, 5, 1, 5, 4, 1, 3],
];

const COLORS = ["#1f7a52", "#2f65b1", "#d85b44", "#c89020", "#7b58a5", "#16878e"];
const TYPE_COLORS = {
  acute: "#1f7a52",
  right: "#2f65b1",
  obtuse: "#d85b44",
};
const TYPE_LABELS = {
  acute: "예각삼각형",
  right: "직각삼각형",
  obtuse: "둔각삼각형",
};
const TYPE_DIE_MAP = {
  1: "acute",
  2: "acute",
  3: "right",
  4: "right",
  5: "obtuse",
  6: "obtuse",
};
const SVG_NS = "http://www.w3.org/2000/svg";
const BOARD = {
  width: 1000,
  height: 1320,
  left: 54,
  top: 58,
  gapX: 64,
  gapY: 62,
};
const EPSILON = 0.000001;

const elements = {
  heroPanel: document.querySelector("#heroPanel"),
  setupPanel: document.querySelector("#setupPanel"),
  gamePanel: document.querySelector("#gamePanel"),
  playerCount: document.querySelector("#playerCount"),
  colorMode: document.querySelector("#colorMode"),
  startButton: document.querySelector("#startButton"),
  newGameButton: document.querySelector("#newGameButton"),
  rulesButton: document.querySelector("#rulesButton"),
  rulesDialog: document.querySelector("#rulesDialog"),
  turnPlayer: document.querySelector("#turnPlayer"),
  turnMessage: document.querySelector("#turnMessage"),
  diceRow: document.querySelector("#diceRow"),
  rollButton: document.querySelector("#rollButton"),
  selectionSlots: document.querySelector("#selectionSlots"),
  selectionHint: document.querySelector("#selectionHint"),
  clearSelectionButton: document.querySelector("#clearSelectionButton"),
  hintButton: document.querySelector("#hintButton"),
  confirmButton: document.querySelector("#confirmButton"),
  giveUpButton: document.querySelector("#giveUpButton"),
  playerList: document.querySelector("#playerList"),
  roundCount: document.querySelector("#roundCount"),
  boardStatus: document.querySelector("#boardStatus"),
  boardScroll: document.querySelector("#boardScroll"),
  gameBoard: document.querySelector("#gameBoard"),
  historyCount: document.querySelector("#historyCount"),
  historyList: document.querySelector("#historyList"),
  zoomOutButton: document.querySelector("#zoomOutButton"),
  zoomResetButton: document.querySelector("#zoomResetButton"),
  zoomInButton: document.querySelector("#zoomInButton"),
  toast: document.querySelector("#toast"),
};

let state = createInitialState();
let toastTimer = null;
let hintTimer = null;

function createInitialState() {
  return {
    started: false,
    players: [],
    currentPlayerIndex: 0,
    dice: [],
    typeDie: null,
    targetType: null,
    hasRolled: false,
    selectedIds: [],
    triangles: [],
    zoom: 1,
    points: buildPoints(),
    hintIds: new Set(),
    finished: false,
  };
}

function buildPoints() {
  return BOARD_VALUES.flatMap((row, rowIndex) =>
    row.map((value, colIndex) => ({
      id: `p-${rowIndex}-${colIndex}`,
      row: rowIndex,
      col: colIndex,
      value,
      x: BOARD.left + colIndex * BOARD.gapX,
      y: BOARD.top + rowIndex * BOARD.gapY,
    })),
  );
}

function secureRandomInt(maxExclusive) {
  if (window.crypto?.getRandomValues) {
    const bucket = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
    const value = new Uint32Array(1);
    do {
      window.crypto.getRandomValues(value);
    } while (value[0] >= bucket);
    return value[0] % maxExclusive;
  }
  return Math.floor(Math.random() * maxExclusive);
}

function rollNumberDice() {
  return Array.from({ length: 3 }, () => secureRandomInt(6) + 1);
}

function rollTypeDie() {
  const value = secureRandomInt(6) + 1;
  return {
    value,
    type: TYPE_DIE_MAP[value],
  };
}

function startGame() {
  const count = Number(elements.playerCount.value);
  state = createInitialState();
  state.started = true;
  state.players = Array.from({ length: count }, (_, index) => ({
    id: `player-${index}`,
    name: `${index + 1}번`,
    color: COLORS[index],
    score: 0,
    out: false,
    reason: "",
  }));
  state.currentPlayerIndex = 0;
  state.zoom = 1;
  elements.heroPanel.hidden = true;
  elements.setupPanel.hidden = true;
  elements.gamePanel.hidden = false;
  render();
  showToast("게임을 시작했습니다. 첫 참가자가 주사위를 굴립니다.");
}

function resetGame() {
  state = createInitialState();
  elements.heroPanel.hidden = false;
  elements.setupPanel.hidden = false;
  elements.gamePanel.hidden = true;
  renderSetupDice();
}

function getCurrentPlayer() {
  return state.players[state.currentPlayerIndex];
}

function activePlayers() {
  return state.players.filter((player) => !player.out);
}

function endTurn(message = "다음 참가자 차례입니다.") {
  state.dice = [];
  state.typeDie = null;
  state.targetType = null;
  state.hasRolled = false;
  state.selectedIds = [];
  state.hintIds = new Set();
  if (activePlayers().length <= 1) {
    render();
    finishGame();
    return;
  }
  moveToNextPlayer();
  render();
  showToast(message);
}

function moveToNextPlayer() {
  for (let step = 1; step <= state.players.length; step += 1) {
    const nextIndex = (state.currentPlayerIndex + step) % state.players.length;
    if (!state.players[nextIndex].out) {
      state.currentPlayerIndex = nextIndex;
      return;
    }
  }
}

function finishGame() {
  state.finished = true;
  const remaining = activePlayers();
  if (remaining.length === 1) {
    showToast(`${remaining[0].name} 참가자가 마지막까지 남았습니다.`);
    elements.turnMessage.textContent = "게임이 끝났습니다.";
  } else {
    const winner = [...state.players].sort((a, b) => b.score - a.score)[0];
    showToast(`게임 종료. 가장 많이 만든 참가자는 ${winner.name}입니다.`);
  }
  renderControls();
}

function handleRoll() {
  if (!state.started || state.finished || state.hasRolled || getCurrentPlayer()?.out) return;
  state.dice = rollNumberDice();
  const typeRoll = rollTypeDie();
  state.typeDie = typeRoll.value;
  state.targetType = typeRoll.type;
  state.hasRolled = true;
  state.selectedIds = [];
  state.hintIds = new Set();
  render();
  const possible = findLegalMoves(state.dice, 1, state.targetType).length;
  if (possible === 0) {
    showToast(`이번 주사위로 만들 수 있는 ${TYPE_LABELS[state.targetType]}을 찾지 못했습니다. 기권하거나 다시 살펴볼 수 있습니다.`);
  }
}

function selectPoint(pointId) {
  if (!state.hasRolled) {
    showToast("먼저 주사위를 굴려 주세요.");
    return;
  }
  const point = state.points.find((item) => item.id === pointId);
  if (!point) return;
  if (!isPointSelectable(point)) {
    showToast("이번 주사위 눈에 맞는 점만 선택할 수 있습니다.");
    return;
  }
  if (state.selectedIds.includes(pointId)) {
    state.selectedIds = state.selectedIds.filter((id) => id !== pointId);
    render();
    return;
  }
  if (state.selectedIds.length >= 3) {
    showToast("점은 3개까지만 선택합니다.");
    return;
  }
  state.selectedIds.push(pointId);
  state.hintIds = new Set();
  render();
}

function isPointSelectable(point) {
  const needed = valueCounts(state.dice);
  const selected = state.selectedIds.map(getPointById);
  const usedForValue = selected.filter((item) => item.value === point.value).length;
  return (needed.get(point.value) || 0) > usedForValue;
}

function valueCounts(values) {
  const counts = new Map();
  values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return counts;
}

function getPointById(id) {
  return state.points.find((point) => point.id === id);
}

function clearSelection() {
  state.selectedIds = [];
  state.hintIds = new Set();
  render();
}

function showHint() {
  if (!state.hasRolled) {
    showToast("주사위를 먼저 굴리면 가능한 삼각형을 찾아볼 수 있습니다.");
    return;
  }
  const moves = findLegalMoves(state.dice, 1, state.targetType);
  if (!moves.length) {
    showToast(`이번 주사위로는 선을 지나가지 않는 ${TYPE_LABELS[state.targetType]}을 찾지 못했습니다.`);
    return;
  }
  state.hintIds = new Set(moves[0].map((point) => point.id));
  renderBoard();
  showToast("가능한 삼각형 하나를 노란색으로 표시했습니다.");
  window.clearTimeout(hintTimer);
  hintTimer = window.setTimeout(() => {
    state.hintIds = new Set();
    renderBoard();
  }, 4500);
}

function confirmTriangle() {
  if (state.selectedIds.length !== 3) {
    showToast("점 3개를 선택해야 합니다.");
    return;
  }
  const selected = state.selectedIds.map(getPointById);
  if (!matchesDice(selected)) {
    showToast("선택한 점의 숫자가 주사위 결과와 맞지 않습니다.");
    return;
  }
  if (isCollinear(selected[0], selected[1], selected[2])) {
    showToast("세 점이 일직선이라 삼각형이 되지 않습니다.");
    return;
  }
  const type = classifyTriangle(selected);
  if (type !== state.targetType) {
    showToast(`이번 차례에는 ${TYPE_LABELS[state.targetType]}을 만들어야 합니다. 지금 선택한 것은 ${TYPE_LABELS[type]}입니다.`);
    return;
  }
  const blocked = findBlockingSegment(selected);
  if (blocked) {
    eliminateCurrentPlayer("이미 만들어진 선을 지나갔습니다.");
    return;
  }
  const player = getCurrentPlayer();
  const color = elements.colorMode.value === "type" ? TYPE_COLORS[type] : player.color;
  const triangle = {
    id: `t-${Date.now()}-${state.triangles.length}`,
    playerId: player.id,
    playerName: player.name,
    playerColor: player.color,
    type,
    color,
    points: selected.map((point) => point.id),
    numbers: selected.map((point) => point.value),
  };
  state.triangles.push(triangle);
  player.score += 1;
  endTurn(`${player.name} 참가자가 ${TYPE_LABELS[type]}을 만들었습니다.`);
}

function matchesDice(points) {
  const diceCounts = valueCounts(state.dice);
  const pointCounts = valueCounts(points.map((point) => point.value));
  if (diceCounts.size !== pointCounts.size) return false;
  for (const [value, count] of diceCounts.entries()) {
    if (pointCounts.get(value) !== count) return false;
  }
  return true;
}

function signedArea(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function isCollinear(a, b, c) {
  return Math.abs(signedArea(a, b, c)) < EPSILON;
}

function classifyTriangle(points) {
  const lengths = [
    distanceSquared(points[0], points[1]),
    distanceSquared(points[1], points[2]),
    distanceSquared(points[2], points[0]),
  ].sort((a, b) => a - b);
  const diff = lengths[0] + lengths[1] - lengths[2];
  if (Math.abs(diff) < EPSILON) return "right";
  return diff > 0 ? "acute" : "obtuse";
}

function distanceSquared(a, b) {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

function findBlockingSegment(points) {
  const newSegments = getSegmentsFromPoints(points);
  const existingSegments = state.triangles.flatMap((triangle) => getTriangleSegments(triangle));
  return newSegments.find((segment) =>
    existingSegments.some((existing) => segmentsConflict(segment[0], segment[1], existing[0], existing[1])),
  );
}

function getSegmentsFromPoints(points) {
  return [
    [points[0], points[1]],
    [points[1], points[2]],
    [points[2], points[0]],
  ];
}

function getTriangleSegments(triangle) {
  const points = triangle.points.map(getPointById);
  return getSegmentsFromPoints(points);
}

function segmentsConflict(a, b, c, d) {
  const sharedEndpoint = samePoint(a, c) || samePoint(a, d) || samePoint(b, c) || samePoint(b, d);
  const relation = segmentIntersectionType(a, b, c, d);
  if (relation === "none") return false;
  if (relation === "endpoint" && sharedEndpoint) return false;
  return true;
}

function samePoint(a, b) {
  return a.id === b.id;
}

function orientation(a, b, c) {
  const area = signedArea(a, b, c);
  if (Math.abs(area) < EPSILON) return 0;
  return area > 0 ? 1 : -1;
}

function between(a, b, c) {
  return (
    Math.min(a.x, b.x) - EPSILON <= c.x &&
    c.x <= Math.max(a.x, b.x) + EPSILON &&
    Math.min(a.y, b.y) - EPSILON <= c.y &&
    c.y <= Math.max(a.y, b.y) + EPSILON
  );
}

function segmentIntersectionType(a, b, c, d) {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);

  if (o1 !== o2 && o3 !== o4) {
    const endpointTouch = [a, b].some((p) => sameCoordinates(p, c) || sameCoordinates(p, d));
    return endpointTouch ? "endpoint" : "cross";
  }

  const touches = [];
  if (o1 === 0 && between(a, b, c)) touches.push(c);
  if (o2 === 0 && between(a, b, d)) touches.push(d);
  if (o3 === 0 && between(c, d, a)) touches.push(a);
  if (o4 === 0 && between(c, d, b)) touches.push(b);
  if (!touches.length) return "none";
  const unique = new Set(touches.map((point) => `${point.x},${point.y}`));
  return unique.size === 1 ? "endpoint" : "overlap";
}

function sameCoordinates(a, b) {
  return Math.abs(a.x - b.x) < EPSILON && Math.abs(a.y - b.y) < EPSILON;
}

function eliminateCurrentPlayer(reason) {
  const player = getCurrentPlayer();
  player.out = true;
  player.reason = reason;
  state.selectedIds = [];
  state.hintIds = new Set();
  endTurn(`${player.name} 참가자가 탈락했습니다. ${reason}`);
}

function giveUp() {
  if (!state.started || state.finished) return;
  const player = getCurrentPlayer();
  player.out = true;
  player.reason = "기권";
  endTurn(`${player.name} 참가자가 기권했습니다.`);
}

function findLegalMoves(dice, limit = 12, targetType = state.targetType) {
  const pools = dice.map((value) => state.points.filter((point) => point.value === value));
  const results = [];
  const seen = new Set();

  function visit(depth, chosen) {
    if (results.length >= limit) return;
    if (depth === pools.length) {
      const key = chosen
        .map((point) => point.id)
        .sort()
        .join("|");
      if (seen.has(key)) return;
      seen.add(key);
      if (new Set(chosen.map((point) => point.id)).size !== 3) return;
      if (isCollinear(chosen[0], chosen[1], chosen[2])) return;
      if (targetType && classifyTriangle(chosen) !== targetType) return;
      if (findBlockingSegment(chosen)) return;
      results.push([...chosen]);
      return;
    }
    for (const point of pools[depth]) {
      if (chosen.some((item) => item.id === point.id)) continue;
      chosen.push(point);
      visit(depth + 1, chosen);
      chosen.pop();
      if (results.length >= limit) return;
    }
  }

  visit(0, []);
  return results;
}

function setZoom(nextZoom) {
  state.zoom = Math.min(1.55, Math.max(0.58, nextZoom));
  elements.gameBoard.style.setProperty("--zoom", state.zoom);
}

function render() {
  renderDice();
  renderSelection();
  renderPlayers();
  renderHistory();
  renderTurn();
  renderControls();
  renderBoard();
}

function renderSetupDice() {
  elements.diceRow.innerHTML = "";
  [1, 2, 3].forEach(() => {
    const die = document.createElement("span");
    die.className = "die";
    die.textContent = "-";
    elements.diceRow.append(die);
  });
  const typeDie = document.createElement("span");
  typeDie.className = "die type-die";
  typeDie.textContent = "종류";
  elements.diceRow.append(typeDie);
}

function renderDice() {
  elements.diceRow.innerHTML = "";
  const dice = state.dice.length ? state.dice : ["-", "-", "-"];
  dice.forEach((value) => {
    const die = document.createElement("span");
    die.className = "die";
    die.textContent = value;
    elements.diceRow.append(die);
  });
  const typeDie = document.createElement("span");
  typeDie.className = "die type-die";
  typeDie.textContent = state.targetType ? `${TYPE_LABELS[state.targetType].replace("삼각형", "")} ${state.typeDie}` : "종류";
  elements.diceRow.append(typeDie);
}

function renderSelection() {
  elements.selectionSlots.innerHTML = "";
  const selected = state.selectedIds.map(getPointById);
  for (let index = 0; index < 3; index += 1) {
    const slot = document.createElement("span");
    slot.className = `slot${selected[index] ? " is-filled" : ""}`;
    slot.textContent = selected[index]
      ? `${selected[index].value} · ${selected[index].row + 1}행 ${selected[index].col + 1}열`
      : `${index + 1}번째 점`;
    elements.selectionSlots.append(slot);
  }
  elements.confirmButton.disabled = selected.length !== 3 || !state.hasRolled;
  const remaining = getRemainingDiceText(selected);
  elements.selectionHint.textContent = state.hasRolled
    ? remaining
    : "주사위를 굴리면 선택할 수 있는 점이 켜집니다.";
}

function getRemainingDiceText(selected) {
  const counts = valueCounts(state.dice);
  selected.forEach((point) => counts.set(point.value, Math.max(0, (counts.get(point.value) || 0) - 1)));
  const remaining = [];
  [...counts.entries()].forEach(([value, count]) => {
    for (let index = 0; index < count; index += 1) remaining.push(value);
  });
  return remaining.length
    ? `더 골라야 할 숫자: ${remaining.join(", ")} · 목표: ${TYPE_LABELS[state.targetType]}`
    : `목표 ${TYPE_LABELS[state.targetType]}인지 확인하고 확정하세요.`;
}

function renderControls() {
  const blocked = !state.started || state.finished;
  elements.rollButton.disabled = blocked || state.hasRolled;
  elements.hintButton.disabled = blocked || !state.hasRolled;
  elements.clearSelectionButton.disabled = blocked || state.selectedIds.length === 0;
  elements.giveUpButton.disabled = blocked;
  elements.confirmButton.disabled = blocked || state.selectedIds.length !== 3 || !state.hasRolled;
}

function renderPlayers() {
  elements.playerList.innerHTML = "";
  state.players.forEach((player, index) => {
    const item = document.createElement("li");
    item.className = `player-item${index === state.currentPlayerIndex ? " is-current" : ""}${player.out ? " is-out" : ""}`;
    item.style.setProperty("--player-color", player.color);
    item.innerHTML = `
      <span class="player-dot" aria-hidden="true"></span>
      <span><span class="player-name">${player.name}</span><span class="player-meta">${player.out ? player.reason : "진행 중"}</span></span>
      <strong>${player.score}</strong>
    `;
    elements.playerList.append(item);
  });
  elements.roundCount.textContent = `${state.triangles.length}개 완성`;
}

function renderHistory() {
  elements.historyCount.textContent = String(state.triangles.length);
  elements.historyList.innerHTML = "";
  [...state.triangles].reverse().forEach((triangle, index) => {
    const item = document.createElement("li");
    item.className = "history-item";
    item.style.setProperty("--history-color", triangle.color);
    item.innerHTML = `
      <strong>${state.triangles.length - index}. ${triangle.playerName} · ${TYPE_LABELS[triangle.type]}</strong>
      <span>점 숫자 ${triangle.numbers.join(" - ")}</span>
    `;
    elements.historyList.append(item);
  });
}

function renderTurn() {
  const player = getCurrentPlayer();
  elements.turnPlayer.textContent = player ? `${player.name} 참가자` : "-";
  elements.turnMessage.textContent = state.hasRolled
    ? `${TYPE_LABELS[state.targetType]}이 되도록 주사위 눈에 맞는 점 3개를 고르세요.`
    : "주사위를 굴려 주세요.";
  elements.boardStatus.textContent = state.hasRolled
    ? `숫자 ${state.dice.join(", ")} · 목표 ${TYPE_LABELS[state.targetType]}`
    : "점을 선택하려면 주사위를 굴리세요";
}

function renderBoard() {
  elements.gameBoard.innerHTML = "";
  elements.gameBoard.setAttribute("viewBox", `0 0 ${BOARD.width} ${BOARD.height}`);
  elements.gameBoard.style.setProperty("--zoom", state.zoom);

  const bg = svg("rect", {
    class: "board-bg",
    x: 8,
    y: 8,
    width: BOARD.width - 16,
    height: BOARD.height - 16,
    rx: 8,
  });
  elements.gameBoard.append(bg);
  renderGrid();
  renderTriangles();
  renderPreview();
  renderPoints();
}

function renderGrid() {
  BOARD_VALUES[0].forEach((_, colIndex) => {
    const x = BOARD.left + colIndex * BOARD.gapX;
    elements.gameBoard.append(svg("line", { class: "grid-line", x1: x, y1: 32, x2: x, y2: BOARD.height - 32 }));
  });
  BOARD_VALUES.forEach((_, rowIndex) => {
    const y = BOARD.top + rowIndex * BOARD.gapY;
    elements.gameBoard.append(svg("line", { class: "grid-line", x1: 32, y1: y, x2: BOARD.width - 32, y2: y }));
  });
}

function renderTriangles() {
  state.triangles.forEach((triangle) => {
    const points = triangle.points.map(getPointById);
    const polygon = svg("polygon", {
      class: "triangle-fill",
      points: points.map((point) => `${point.x},${point.y}`).join(" "),
      fill: triangle.color,
      stroke: triangle.color,
    });
    elements.gameBoard.append(polygon);
    getSegmentsFromPoints(points).forEach(([a, b]) => {
      elements.gameBoard.append(
        svg("line", {
          class: "triangle-edge",
          x1: a.x,
          y1: a.y,
          x2: b.x,
          y2: b.y,
          stroke: triangle.color,
        }),
      );
    });
  });
}

function renderPreview() {
  const selected = state.selectedIds.map(getPointById);
  if (selected.length < 2) return;
  const pairs = selected.length === 2 ? [[selected[0], selected[1]]] : getSegmentsFromPoints(selected);
  pairs.forEach(([a, b]) => {
    elements.gameBoard.append(svg("line", { class: "preview-edge", x1: a.x, y1: a.y, x2: b.x, y2: b.y }));
  });
}

function renderPoints() {
  state.points.forEach((point) => {
    const group = svg("g", { class: getPointClasses(point), "data-point-id": point.id });
    const hit = svg("circle", { class: "point-hit", cx: point.x, cy: point.y, r: 23 });
    const dot = svg("circle", { class: "point-dot", cx: point.x, cy: point.y, r: 18 });
    const label = svg("text", { class: "point-label", x: point.x, y: point.y });
    label.textContent = point.value;
    hit.addEventListener("click", () => selectPoint(point.id));
    group.append(hit, dot, label);
    elements.gameBoard.append(group);
  });
}

function getPointClasses(point) {
  const classes = ["board-point"];
  if (state.hasRolled && isPointPotentiallyAvailable(point)) classes.push("is-available");
  if (state.hasRolled && !isPointPotentiallyAvailable(point)) classes.push("is-muted");
  if (state.selectedIds.includes(point.id)) classes.push("is-selected");
  if (state.hintIds.has(point.id)) classes.push("is-hint");
  return classes.join(" ");
}

function isPointPotentiallyAvailable(point) {
  return state.dice.includes(point.value);
}

function svg(tagName, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tagName);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 3600);
}

elements.startButton.addEventListener("click", startGame);
elements.newGameButton.addEventListener("click", resetGame);
elements.rollButton.addEventListener("click", handleRoll);
elements.clearSelectionButton.addEventListener("click", clearSelection);
elements.hintButton.addEventListener("click", showHint);
elements.confirmButton.addEventListener("click", confirmTriangle);
elements.giveUpButton.addEventListener("click", giveUp);
elements.zoomOutButton.addEventListener("click", () => setZoom(state.zoom - 0.12));
elements.zoomResetButton.addEventListener("click", () => setZoom(1));
elements.zoomInButton.addEventListener("click", () => setZoom(state.zoom + 0.12));
elements.rulesButton.addEventListener("click", () => elements.rulesDialog.showModal());

renderSetupDice();
