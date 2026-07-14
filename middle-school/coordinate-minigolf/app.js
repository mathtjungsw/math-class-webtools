const lineMissions = [
  { title: "첫 번째 티샷", difficulty: "입문", ball: [-4, -2], hole: [4, 2], hint: ["두 점 사이에서 x는 8, y는 4만큼 변해요.", "기울기는 4/8 = 1/2입니다.", "정답은 y = 1/2x입니다."], description: "두 점을 지나는 직선을 찾아 한 번에 홀에 넣어 보세요." },
  { title: "내리막 퍼팅", difficulty: "입문", ball: [-3, 4], hole: [3, -2], hint: ["오른쪽으로 6, 아래로 6 이동해요.", "기울기는 -1입니다.", "정답은 y = -x + 1입니다."], description: "오른쪽으로 갈수록 낮아지는 직선입니다. 기울기의 부호에 주의하세요." },
  { title: "평평한 그린", difficulty: "기본", ball: [-5, 3], hole: [4, 3], hint: ["두 점의 y좌표가 같아요.", "수평선의 기울기는 0입니다.", "정답은 y = 3입니다."], description: "높이가 변하지 않는 공의 길을 식으로 나타내세요." },
  { title: "수직 홀", difficulty: "기본", ball: [2, -4], hole: [2, 4], hint: ["두 점의 x좌표가 같아요.", "이 직선은 y = ax + b 꼴로 나타낼 수 없어요.", "식의 종류를 x = c로 바꾸고 x = 2를 입력하세요."], description: "이번 홀은 공의 바로 위에 있습니다. 알맞은 식의 종류부터 골라 보세요." },
  { title: "절편을 지나서", difficulty: "도전", ball: [-5, -2], hole: [1, 4], hint: ["x와 y가 모두 6씩 증가해요.", "기울기는 1입니다.", "(-5, -2)를 y = x + b에 넣으면 b = 3입니다."], description: "기울기뿐 아니라 y절편까지 정확해야 공이 출발할 수 있습니다." },
  { title: "정교한 롱 퍼트", difficulty: "도전", ball: [-5, 3], hole: [3, -1], hint: ["x는 8 증가하고 y는 4 감소해요.", "기울기는 -4/8 = -1/2입니다.", "정답은 y = -1/2x + 1/2입니다."], description: "분수로 나타나는 기울기와 절편을 모두 찾아 마지막 홀을 공략하세요." }
];

const commandMissions = [
  { title: "벡터 한 걸음", difficulty: "입문", ball: [-4, -3], hole: [3, 2], max: 2, obstacles: [], hint: ["홀의 x좌표에서 공의 x좌표를 빼 보세요.", "x는 7, y는 5만큼 이동하면 됩니다.", "(7, 5) 한 번이면 홀에 도착해요."], description: "가로와 세로의 변화량을 하나의 이동 명령으로 만들어 보세요." },
  { title: "모래밭 피하기", difficulty: "기본", ball: [-5, -3], hole: [5, -3], max: 3, obstacles: [{ x1: -2, y1: -4, x2: 2, y2: 1 }], hint: ["직선으로 가면 모래밭을 지나게 돼요.", "먼저 위로 5 이상 이동해 보세요.", "예: (0, 5) → (10, 0) → (0, -5)"], description: "선분이 모래밭을 지나지 않도록 명령을 나누어 입력하세요." },
  { title: "연못 건너편", difficulty: "기본", ball: [-5, 0], hole: [5, 0], max: 3, obstacles: [{ x1: -2, y1: -2, x2: 2, y2: 2 }], hint: ["연못의 위쪽이나 아래쪽으로 돌아갈 수 있어요.", "먼저 y좌표를 3 또는 -3으로 바꿔 보세요.", "예: (0, 3) → (10, 0) → (0, -3)"], description: "연못을 가로지르지 않고 세 번 이하의 이동으로 홀에 도착하세요." },
  { title: "대각선 우회", difficulty: "도전", ball: [-4, -4], hole: [4, 4], max: 3, obstacles: [{ x1: -1, y1: -2, x2: 1, y2: 2 }], hint: ["정중앙을 지나는 대각선은 벽에 막혀요.", "벽의 오른쪽 또는 왼쪽 끝을 돌아가세요.", "예: (6, 1) → (0, 5) → (2, 2)"], description: "대각선 길목의 긴 벽을 피해 이동 명령을 설계하세요." },
  { title: "두 개의 벙커", difficulty: "도전", ball: [-5, -4], hole: [5, 4], max: 3, obstacles: [{ x1: -3, y1: -2, x2: 0, y2: 0 }, { x1: 1, y1: 1, x2: 4, y2: 3 }], hint: ["두 장애물의 아래와 위를 차례로 돌아보세요.", "x = 0인 선을 중간 통로로 사용할 수 있어요.", "예: (5, 1) → (0, 7) → (5, 0)"], description: "두 벙커 사이의 좁은 통로를 지나는 경로를 만들어 보세요." },
  { title: "마지막 코스", difficulty: "챌린지", ball: [-5, 5], hole: [5, -5], max: 4, obstacles: [{ x1: -4, y1: 1, x2: 1, y2: 3 }, { x1: -1, y1: -3, x2: 4, y2: -1 }], hint: ["두 장애물의 오른쪽 바깥으로 크게 돌아갈 수 있어요.", "먼저 (5, 4)로 이동해 보세요.", "예: (10, -1) → (0, -9)"], description: "두 개의 긴 벽 사이를 꺾어 가며 최종 홀에 도착하세요." }
];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const canvas = $("#courseCanvas");
const ctx = canvas.getContext("2d");
const state = {
  mode: "line",
  level: 0,
  commands: [],
  ball: [...lineMissions[0].ball],
  attempts: 0,
  missionAttempts: 0,
  solved: { line: new Set(), command: new Set() },
  stars: { line: {}, command: {} },
  hintStep: 0,
  animating: false,
  sound: true,
  sandbox: false,
  sandboxStep: "ball",
  custom: null,
  preview: null,
  animationPath: null,
  animationBall: null
};

function mission() {
  if (state.custom) return state.custom;
  return (state.mode === "line" ? lineMissions : commandMissions)[state.level];
}

function formatNumber(value) {
  if (Math.abs(value) < 1e-9) return "0";
  if (Number.isInteger(value)) return String(value);
  return String(Math.round(value * 100) / 100);
}

function pointLabel(point) { return `(${formatNumber(point[0])}, ${formatNumber(point[1])})`; }

function parseMathValue(raw) {
  const value = String(raw).trim().replace(/\s/g, "");
  if (!value) return NaN;
  if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) return Number(value);
  const match = value.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\/([+-]?(?:\d+(?:\.\d*)?|\.\d+))$/);
  if (!match || Number(match[2]) === 0) return NaN;
  return Number(match[1]) / Number(match[2]);
}

function nearly(a, b, epsilon = 0.035) { return Math.abs(a - b) <= epsilon; }

function setFeedback(title, detail, type = "info") {
  const box = $("#feedback");
  box.className = `feedback${type === "error" ? " is-error" : type === "success" ? " is-success" : ""}`;
  box.querySelector(".feedback-icon").textContent = type === "error" ? "!" : type === "success" ? "✓" : "?";
  box.querySelector("strong").textContent = title;
  box.querySelector("p span").textContent = detail;
}

function updateStats() {
  const solved = state.solved.line.size + state.solved.command.size;
  const stars = Object.values(state.stars.line).reduce((a, b) => a + b, 0) + Object.values(state.stars.command).reduce((a, b) => a + b, 0);
  $("#solvedCount").textContent = solved;
  $("#attemptCount").textContent = state.attempts;
  $("#starCount").textContent = stars;
}

function renderLevelTrack() {
  const track = $("#levelTrack");
  track.innerHTML = "";
  for (let index = 0; index < 6; index += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `level-button${index === state.level && !state.custom ? " is-active" : ""}${state.solved[state.mode].has(index) ? " is-solved" : ""}`;
    button.textContent = index + 1;
    button.setAttribute("aria-label", `${index + 1}번 미션${state.solved[state.mode].has(index) ? ", 완료" : ""}`);
    button.addEventListener("click", () => loadLevel(index));
    track.append(button);
  }
}

function clearInputs() {
  $("#slopeInput").value = "";
  $("#interceptInput").value = "";
  $("#constantInput").value = "";
  state.commands = [];
  state.preview = null;
  renderCommands();
}

function loadLevel(index, preserveCustom = false) {
  if (state.animating) return;
  state.level = Math.max(0, Math.min(5, index));
  if (!preserveCustom) state.custom = null;
  state.missionAttempts = 0;
  state.hintStep = 0;
  state.animationPath = null;
  state.animationBall = null;
  state.ball = [...mission().ball];
  clearInputs();
  $("#successCard").hidden = true;
  setFeedback("좌표를 먼저 살펴보세요.", state.mode === "line" ? "격자의 한 칸은 1입니다." : "장애물을 피해 이동 명령을 이어 붙이세요.");
  updateMissionUI();
  draw();
}

function updateMissionUI() {
  const data = mission();
  $("#missionNumber").textContent = state.custom ? "FREE" : String(state.level + 1).padStart(2, "0");
  $("#missionTitle").textContent = state.custom ? "자유 연습" : data.title;
  $("#difficulty").textContent = state.custom ? "사용자 코스" : data.difficulty;
  $("#missionDescription").textContent = data.description;
  $("#ballCoordinate").textContent = pointLabel(data.ball);
  $("#holeCoordinate").textContent = pointLabel(data.hole);
  $("#commandLimit").textContent = `최대 ${data.max || 4}개`;
  $("#obstacleLegend").hidden = state.mode === "line" || !(data.obstacles || []).length;
  $("#boardMessage").textContent = state.sandbox ? "게임판을 클릭해 새 문제를 만드세요" : "공을 홀까지 보내 보세요";
  renderLevelTrack();
  updateEquationPreview();
}

function switchMode(mode) {
  if (state.animating || state.mode === mode) return;
  state.mode = mode;
  state.level = 0;
  state.custom = null;
  state.sandbox = false;
  $("#sandboxButton").setAttribute("aria-pressed", "false");
  $("#sandboxNote").hidden = true;
  $$(".mode-button").forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  $("#lineControls").hidden = mode !== "line";
  $("#commandControls").hidden = mode !== "command";
  loadLevel(0);
}

function updateEquationPreview() {
  if (state.mode === "command") {
    const total = state.commands.reduce((sum, item) => [sum[0] + item[0], sum[1] + item[1]], [0, 0]);
    $("#equationPreview").textContent = state.commands.length ? `전체 이동: (${formatNumber(total[0])}, ${formatNumber(total[1])})` : "명령을 추가하면 예상 경로가 나타납니다.";
    return;
  }
  const type = $("#lineType").value;
  if (type === "vertical") {
    const c = parseMathValue($("#constantInput").value);
    state.preview = Number.isFinite(c) ? { type, c } : null;
    $("#equationPreview").textContent = Number.isFinite(c) ? `입력한 식: x = ${formatNumber(c)}` : "입력한 식이 여기에 표시됩니다.";
  } else {
    const m = parseMathValue($("#slopeInput").value);
    const b = parseMathValue($("#interceptInput").value);
    state.preview = Number.isFinite(m) && Number.isFinite(b) ? { type, m, b } : null;
    if (state.preview) {
      const sign = b < 0 ? "−" : "+";
      $("#equationPreview").textContent = `입력한 식: y = ${formatNumber(m)}x ${sign} ${formatNumber(Math.abs(b))}`;
    } else {
      $("#equationPreview").textContent = "입력한 식이 여기에 표시됩니다.";
    }
  }
  draw();
}

function renderCommands() {
  const list = $("#commandList");
  list.innerHTML = "";
  state.commands.forEach((command, index) => {
    const item = document.createElement("li");
    item.className = "command-item";
    item.innerHTML = `<span class="command-index">${index + 1}</span><span>(${formatNumber(command[0])}, ${formatNumber(command[1])})</span><button type="button" aria-label="${index + 1}번 명령 삭제">삭제</button>`;
    item.querySelector("button").addEventListener("click", () => {
      state.commands.splice(index, 1);
      renderCommands();
      draw();
    });
    list.append(item);
  });
  updateEquationPreview();
}

function addCommand() {
  const data = mission();
  const dx = Number($("#deltaXInput").value);
  const dy = Number($("#deltaYInput").value);
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || (!dx && !dy)) {
    setFeedback("이동량을 확인하세요.", "x와 y 중 적어도 하나는 0이 아니어야 합니다.", "error");
    return;
  }
  if (!Number.isInteger(dx) || !Number.isInteger(dy)) {
    setFeedback("정수로 입력하세요.", "이 코스에서는 격자 칸 단위로 이동합니다.", "error");
    return;
  }
  if (state.commands.length >= (data.max || 4)) {
    setFeedback("명령 수를 모두 사용했어요.", "기존 명령을 삭제하거나 더 짧은 경로를 찾아보세요.", "error");
    return;
  }
  state.commands.push([dx, dy]);
  renderCommands();
  draw();
  setFeedback("명령을 추가했어요.", "점선으로 예상 경로를 확인하세요.");
}

function lineSolution(data) {
  const [x1, y1] = data.ball;
  const [x2, y2] = data.hole;
  if (nearly(x1, x2)) return { type: "vertical", c: x1 };
  const m = (y2 - y1) / (x2 - x1);
  return { type: "slope", m, b: y1 - m * x1 };
}

function playTone(frequency = 520, duration = 0.09) {
  if (!state.sound) return;
  try {
    const audio = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = "sine";
    gain.gain.setValueAtTime(0.05, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
  } catch (_) { /* Sound is an enhancement only. */ }
}

function registerAttempt() {
  state.attempts += 1;
  state.missionAttempts += 1;
  updateStats();
}

async function shoot() {
  if (state.animating) return;
  updateEquationPreview();
  const data = mission();
  const entered = state.preview;
  if (!entered) {
    setFeedback("식을 완성하세요.", "모든 빈칸에 수를 입력한 뒤 다시 공을 치세요.", "error");
    return;
  }
  registerAttempt();
  const solution = lineSolution(data);
  let passesStart = false;
  let endpoint;
  let correct = false;
  if (entered.type === "vertical") {
    passesStart = nearly(entered.c, data.ball[0]);
    endpoint = [entered.c, data.hole[1]];
    correct = solution.type === "vertical" && nearly(entered.c, solution.c);
  } else {
    passesStart = nearly(data.ball[1], entered.m * data.ball[0] + entered.b);
    endpoint = [data.hole[0], entered.m * data.hole[0] + entered.b];
    correct = solution.type === "slope" && nearly(entered.m, solution.m) && nearly(entered.b, solution.b);
  }
  if (!passesStart) {
    playTone(180, .12);
    setFeedback("공이 직선 위에 없어요.", `입력한 식에 공의 좌표 ${pointLabel(data.ball)}를 대입해 보세요.`, "error");
    nudgeBall();
    return;
  }
  await animatePath([data.ball, endpoint]);
  if (correct) completeMission("정확한 직선의 식으로 홀에 도착했어요.");
  else {
    playTone(190, .14);
    setFeedback("홀을 지나쳤어요.", `공은 ${pointLabel(endpoint)} 근처로 향했어요. 기울기를 다시 확인하세요.`, "error");
    setTimeout(resetBallPosition, 650);
  }
}

function segmentHitsRect(a, b, rect) {
  const margin = 0.12;
  for (let i = 0; i <= 120; i += 1) {
    const t = i / 120;
    const x = a[0] + (b[0] - a[0]) * t;
    const y = a[1] + (b[1] - a[1]) * t;
    if (x > rect.x1 + margin && x < rect.x2 - margin && y > rect.y1 + margin && y < rect.y2 - margin) return true;
  }
  return false;
}

async function runCommands() {
  if (state.animating) return;
  if (!state.commands.length) {
    setFeedback("이동 명령을 추가하세요.", "가로와 세로 이동량을 입력하고 ‘추가’를 누르세요.", "error");
    return;
  }
  const data = mission();
  const path = [[...data.ball]];
  for (const command of state.commands) {
    const prev = path[path.length - 1];
    path.push([prev[0] + command[0], prev[1] + command[1]]);
  }
  registerAttempt();
  const collisionIndex = path.slice(1).findIndex((point, index) => (data.obstacles || []).some((rect) => segmentHitsRect(path[index], point, rect)));
  const outIndex = path.slice(1).findIndex((point) => Math.abs(point[0]) > 6 || Math.abs(point[1]) > 6);
  const stopIndex = collisionIndex >= 0 ? collisionIndex + 1 : outIndex >= 0 ? outIndex + 1 : path.length - 1;
  await animatePath(path.slice(0, stopIndex + 1));
  if (collisionIndex >= 0) {
    playTone(150, .16);
    setFeedback("장애물에 빠졌어요.", `${collisionIndex + 1}번째 이동 경로를 다른 방향으로 바꿔 보세요.`, "error");
    setTimeout(resetBallPosition, 650);
    return;
  }
  if (outIndex >= 0) {
    playTone(150, .16);
    setFeedback("코스 밖으로 나갔어요.", "모든 중간 지점이 격자 범위 안에 오도록 이동량을 줄여 보세요.", "error");
    setTimeout(resetBallPosition, 650);
    return;
  }
  const end = path[path.length - 1];
  if (nearly(end[0], data.hole[0]) && nearly(end[1], data.hole[1])) completeMission("모든 이동 명령이 정확하게 연결되었어요.");
  else {
    playTone(190, .14);
    setFeedback("아직 홀에 닿지 않았어요.", `마지막 위치는 ${pointLabel(end)}입니다. 남은 이동량을 계산해 보세요.`, "error");
    setTimeout(resetBallPosition, 650);
  }
}

function missionStars() { return state.missionAttempts <= 1 ? 3 : state.missionAttempts <= 3 ? 2 : 1; }

function completeMission(message) {
  playTone(660, .16);
  setTimeout(() => playTone(880, .18), 120);
  const stars = missionStars();
  if (!state.custom) {
    state.solved[state.mode].add(state.level);
    state.stars[state.mode][state.level] = Math.max(state.stars[state.mode][state.level] || 0, stars);
  }
  updateStats();
  renderLevelTrack();
  setFeedback("성공! 홀에 들어갔어요.", message, "success");
  $("#successStars").textContent = "★".repeat(stars) + "☆".repeat(3 - stars);
  $("#successMessage").textContent = message;
  $("#nextButton").textContent = state.custom ? "다시 배치하기" : state.level === 5 ? "첫 미션으로" : "다음 미션";
  $("#successCard").hidden = false;
}

function nextMission() {
  if (state.custom) {
    $("#successCard").hidden = true;
    startSandbox();
  } else {
    loadLevel(state.level === 5 ? 0 : state.level + 1);
  }
}

function resetBallPosition() {
  state.animationBall = null;
  state.animationPath = null;
  state.ball = [...mission().ball];
  draw();
}

function nudgeBall() {
  const start = [...mission().ball];
  state.animationBall = [start[0] + .12, start[1]];
  draw();
  setTimeout(() => { state.animationBall = [start[0] - .12, start[1]]; draw(); }, 80);
  setTimeout(resetBallPosition, 160);
}

function animatePath(points) {
  return new Promise((resolve) => {
    state.animating = true;
    state.animationPath = points;
    const segmentDuration = 520;
    let segment = 0;
    let startTime = null;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function frame(time) {
      if (startTime === null) startTime = time;
      const progress = reducedMotion ? 1 : Math.min(1, (time - startTime) / segmentDuration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const from = points[segment];
      const to = points[segment + 1];
      state.animationBall = [from[0] + (to[0] - from[0]) * eased, from[1] + (to[1] - from[1]) * eased];
      draw();
      if (progress < 1) requestAnimationFrame(frame);
      else if (segment < points.length - 2) {
        segment += 1;
        startTime = null;
        playTone(380 + segment * 40, .06);
        requestAnimationFrame(frame);
      } else {
        state.animating = false;
        state.ball = [...to];
        resolve();
      }
    }
    if (points.length < 2) { state.animating = false; resolve(); }
    else requestAnimationFrame(frame);
  });
}

function showHint() {
  const hints = mission().hint || ["공과 홀의 좌표 차이를 먼저 계산해 보세요."];
  const index = Math.min(state.hintStep, hints.length - 1);
  setFeedback(`힌트 ${index + 1}/${hints.length}`, hints[index]);
  state.hintStep = Math.min(state.hintStep + 1, hints.length - 1);
}

function startSandbox() {
  if (state.animating) return;
  state.sandbox = true;
  state.sandboxStep = "ball";
  state.custom = {
    title: "자유 연습",
    difficulty: "사용자 코스",
    ball: [-4, -2],
    hole: [4, 2],
    max: 4,
    obstacles: [],
    hint: ["공과 홀의 좌표 차이를 계산해 보세요."],
    description: "게임판에서 공과 홀을 직접 놓아 만든 연습 문제입니다."
  };
  state.ball = [...state.custom.ball];
  clearInputs();
  $("#successCard").hidden = true;
  $("#sandboxButton").setAttribute("aria-pressed", "true");
  $("#sandboxNote").hidden = false;
  $("#sandboxNote b").textContent = "공을 놓을 칸을 클릭하세요";
  $("#sandboxNote span").textContent = "그다음 홀 위치를 선택합니다.";
  updateMissionUI();
  draw();
}

function stopSandbox() {
  state.sandbox = false;
  $("#sandboxButton").setAttribute("aria-pressed", "false");
  $("#sandboxNote").hidden = true;
  loadLevel(state.level);
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const metrics = boardMetrics(rect.width, rect.height);
  const px = event.clientX - rect.left;
  const py = event.clientY - rect.top;
  return [Math.max(-6, Math.min(6, Math.round((px - metrics.cx) / metrics.unit))), Math.max(-6, Math.min(6, Math.round((metrics.cy - py) / metrics.unit)))];
}

function handleCanvasClick(event) {
  if (!state.sandbox || state.animating) return;
  const point = canvasPoint(event);
  if (state.sandboxStep === "ball") {
    state.custom.ball = point;
    state.ball = [...point];
    state.sandboxStep = "hole";
    $("#sandboxNote b").textContent = "이제 홀을 놓을 칸을 클릭하세요";
  } else if (point[0] === state.custom.ball[0] && point[1] === state.custom.ball[1]) {
    setFeedback("다른 칸을 선택하세요.", "공과 홀은 같은 위치에 놓을 수 없습니다.", "error");
    return;
  } else {
    state.custom.hole = point;
    state.sandbox = false;
    $("#sandboxNote").hidden = true;
    $("#sandboxButton").setAttribute("aria-pressed", "true");
    setFeedback("새 연습 문제가 완성됐어요.", state.mode === "line" ? "두 점을 지나는 직선의 식을 입력하세요." : "이동 명령으로 두 점을 연결하세요.");
  }
  updateMissionUI();
  draw();
}

function boardMetrics(width, height) {
  const padding = Math.max(34, Math.min(width, height) * .075);
  const unit = Math.min((width - padding * 2) / 12, (height - padding * 2) / 12);
  return { unit, cx: width / 2, cy: height / 2 };
}

function toPixel(point, metrics) { return [metrics.cx + point[0] * metrics.unit, metrics.cy - point[1] * metrics.unit]; }

function roundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function drawGrid(metrics, width, height) {
  ctx.fillStyle = "#fbfcf7";
  ctx.fillRect(0, 0, width, height);
  const left = metrics.cx - 6 * metrics.unit;
  const top = metrics.cy - 6 * metrics.unit;
  const size = 12 * metrics.unit;
  roundedRect(left - 8, top - 8, size + 16, size + 16, 12);
  ctx.fillStyle = "#fffefb";
  ctx.fill();
  ctx.strokeStyle = "#deddd5";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.font = `${Math.max(9, metrics.unit * .22)}px Pretendard, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let value = -6; value <= 6; value += 1) {
    const [x] = toPixel([value, 0], metrics);
    const [, y] = toPixel([0, value], metrics);
    ctx.strokeStyle = value === 0 ? "#17383d" : value % 2 === 0 ? "#d5ddd7" : "#e8ebe6";
    ctx.lineWidth = value === 0 ? 1.8 : 1;
    ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top + size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(left + size, y); ctx.stroke();
    if (value !== 0) {
      ctx.fillStyle = "#7c8987";
      ctx.fillText(String(value), x, metrics.cy + 13);
      ctx.textAlign = "right";
      ctx.fillText(String(value), metrics.cx - 8, y);
      ctx.textAlign = "center";
    }
  }
  ctx.fillStyle = "#17383d";
  ctx.font = `800 ${Math.max(10, metrics.unit * .24)}px Pretendard, sans-serif`;
  ctx.fillText("x", left + size + 16, metrics.cy);
  ctx.fillText("y", metrics.cx, top - 17);
}

function drawObstacle(rect, metrics) {
  const [x1, yTop] = toPixel([rect.x1, rect.y2], metrics);
  const [x2, yBottom] = toPixel([rect.x2, rect.y1], metrics);
  ctx.save();
  roundedRect(x1, yTop, x2 - x1, yBottom - yTop, 8);
  ctx.fillStyle = "rgba(228,185,111,.42)";
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = "rgba(151,105,39,.34)";
  ctx.lineWidth = 2;
  for (let offset = -200; offset < 500; offset += 12) {
    ctx.beginPath(); ctx.moveTo(x1 + offset, yBottom); ctx.lineTo(x1 + offset + (yBottom - yTop), yTop); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = "#c99644";
  ctx.lineWidth = 1.5;
  roundedRect(x1, yTop, x2 - x1, yBottom - yTop, 8);
  ctx.stroke();
}

function drawPreview(metrics) {
  const data = mission();
  ctx.save();
  ctx.strokeStyle = "rgba(90,166,180,.9)";
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 7]);
  if (state.mode === "line" && state.preview) {
    let a, b;
    if (state.preview.type === "vertical") {
      a = toPixel([state.preview.c, -6], metrics);
      b = toPixel([state.preview.c, 6], metrics);
    } else {
      a = toPixel([-6, state.preview.m * -6 + state.preview.b], metrics);
      b = toPixel([6, state.preview.m * 6 + state.preview.b], metrics);
    }
    ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
  }
  if (state.mode === "command" && state.commands.length) {
    let current = [...data.ball];
    ctx.beginPath(); ctx.moveTo(...toPixel(current, metrics));
    state.commands.forEach(([dx, dy]) => {
      current = [current[0] + dx, current[1] + dy];
      ctx.lineTo(...toPixel(current, metrics));
    });
    ctx.stroke();
    current = [...data.ball];
    state.commands.forEach(([dx, dy], index) => {
      current = [current[0] + dx, current[1] + dy];
      const [x, y] = toPixel(current, metrics);
      ctx.setLineDash([]);
      ctx.fillStyle = "#5aa6b4";
      ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "white";
      ctx.font = "800 10px Pretendard, sans-serif";
      ctx.fillText(String(index + 1), x, y + .5);
      ctx.setLineDash([8, 7]);
    });
  }
  ctx.restore();
}

function drawHole(point, metrics) {
  const [x, y] = toPixel(point, metrics);
  ctx.save();
  ctx.fillStyle = "rgba(16,42,46,.18)";
  ctx.beginPath(); ctx.ellipse(x, y + 4, 14, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#102a2e";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x, y - 35); ctx.stroke();
  ctx.fillStyle = "#f0785c";
  ctx.beginPath(); ctx.moveTo(x, y - 35); ctx.lineTo(x + 25, y - 27); ctx.lineTo(x, y - 19); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawBall(point, metrics) {
  const [x, y] = toPixel(point, metrics);
  const radius = Math.max(8, metrics.unit * .25);
  ctx.save();
  ctx.fillStyle = "rgba(16,42,46,.2)";
  ctx.beginPath(); ctx.ellipse(x + 2, y + radius * .8, radius * .9, radius * .33, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fffefb";
  ctx.strokeStyle = "#102a2e";
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "rgba(16,42,46,.24)";
  [[-.3,-.28],[.28,-.18],[-.1,.27]].forEach(([dx,dy]) => { ctx.beginPath(); ctx.arc(x + radius * dx, y + radius * dy, 1.6, 0, Math.PI * 2); ctx.fill(); });
  ctx.restore();
}

function draw() {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = rect.width;
  const height = rect.height;
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const metrics = boardMetrics(width, height);
  drawGrid(metrics, width, height);
  (mission().obstacles || []).forEach((rectData) => drawObstacle(rectData, metrics));
  drawPreview(metrics);
  drawHole(mission().hole, metrics);
  drawBall(state.animationBall || state.ball || mission().ball, metrics);
}

function resetAll() {
  if (state.animating || !window.confirm("모든 완료 기록과 별을 지우고 처음부터 시작할까요?")) return;
  state.attempts = 0;
  state.solved.line.clear();
  state.solved.command.clear();
  state.stars.line = {};
  state.stars.command = {};
  updateStats();
  switchMode("line");
  if (state.mode === "line") loadLevel(0);
}

$$(".mode-button").forEach((button) => button.addEventListener("click", () => switchMode(button.dataset.mode)));
$("#lineType").addEventListener("change", () => {
  const vertical = $("#lineType").value === "vertical";
  $("#slopeBuilder").hidden = vertical;
  $("#verticalBuilder").hidden = !vertical;
  state.preview = null;
  updateEquationPreview();
});
["#slopeInput", "#interceptInput", "#constantInput"].forEach((selector) => $(selector).addEventListener("input", updateEquationPreview));
["#slopeInput", "#interceptInput", "#constantInput"].forEach((selector) => $(selector).addEventListener("keydown", (event) => { if (event.key === "Enter") shoot(); }));
$("#shootButton").addEventListener("click", shoot);
$("#addCommandButton").addEventListener("click", addCommand);
$("#deltaYInput").addEventListener("keydown", (event) => { if (event.key === "Enter") addCommand(); });
$("#clearCommandsButton").addEventListener("click", () => { state.commands = []; renderCommands(); draw(); });
$("#runCommandsButton").addEventListener("click", runCommands);
$("#replayButton").addEventListener("click", resetBallPosition);
$("#hintButton").addEventListener("click", showHint);
$("#sandboxButton").addEventListener("click", () => state.custom || state.sandbox ? stopSandbox() : startSandbox());
$("#courseCanvas").addEventListener("click", handleCanvasClick);
$("#nextButton").addEventListener("click", nextMission);
$("#guideButton").addEventListener("click", () => $("#guideDialog").showModal());
$("#soundButton").addEventListener("click", () => {
  state.sound = !state.sound;
  $("#soundButton").textContent = state.sound ? "소리 켬" : "소리 끔";
  $("#soundButton").setAttribute("aria-pressed", String(state.sound));
  if (state.sound) playTone(520, .08);
});
$("#resetButton").addEventListener("click", resetAll);
window.addEventListener("resize", draw);
new ResizeObserver(draw).observe($("#canvasWrap"));

updateStats();
loadLevel(0);
if (new URLSearchParams(window.location.search).get("manual") === "1") {
  $("#guideDialog").showModal();
}
