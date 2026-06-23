const BOARD_SIZE = 25;
const HIDDEN_INDEX = 12;
const PRIME_COUNT = 9;
const COMPOSITE_COUNT = 16;
const ROUND_LIMIT = 3;
const SCORE_TARGET = 6;
const TURN_SECONDS = 30;

const TEAM_COLORS = ["#275aa8", "#de6a32"];

const SOURCE_INTERVALS = [
  [480, 550], [490, 560], [500, 570], [510, 580], [660, 730], [680, 750],
  [740, 810], [750, 820], [840, 910], [860, 930], [870, 940], [890, 970],
  [900, 970], [920, 990], [1100, 1180], [1110, 1190], [1120, 1200], [1300, 1380],
  [1310, 1410], [1330, 1430], [1340, 1430], [1350, 1430], [1360, 1430], [1370, 1440],
  [1380, 1450], [1460, 1530], [1490, 1560], [1630, 1710], [1660, 1730], [1670, 1750],
  [1680, 1750], [1700, 1780], [1740, 1810], [1750, 1830], [1760, 1850], [1770, 1850],
  [1890, 1980], [1900, 1980], [1940, 2010], [2000, 2070], [2030, 2100], [2090, 2160],
  [2100, 2170], [2130, 2210], [2140, 2230], [2150, 2240], [2160, 2250], [2170, 2260],
  [2210, 2280], [2270, 2340], [2310, 2380], [2390, 2460], [2420, 2510], [2430, 2530],
  [2460, 2550], [2480, 2580], [2490, 2580], [2500, 2580], [2530, 2600], [2540, 2620],
  [2550, 2640], [2580, 2660], [2590, 2660], [2610, 2680], [2730, 2800], [2750, 2820],
  [2770, 2840], [2780, 2850], [2800, 2870], [2810, 2890], [2820, 2900], [2830, 2900],
  [2840, 2910], [2850, 2920], [2860, 2940], [2880, 2960], [2900, 2970], [2910, 3000],
  [2920, 3010], [2940, 3020], [2950, 3020], [2960, 3040], [2970, 3050], [3000, 3070],
  [3010, 3080], [3020, 3090], [3030, 3110], [3040, 3120], [3050, 3140], [3060, 3140],
  [3080, 3170], [3090, 3190], [3100, 3190], [3110, 3200], [3130, 3210], [3140, 3220],
  [3150, 3220], [3210, 3300], [3260, 3340], [3270, 3340], [3330, 3400], [3340, 3410],
  [3350, 3440], [3360, 3450], [3370, 3460], [3400, 3470], [3420, 3500], [3430, 3500],
  [3450, 3520], [3540, 3610], [3550, 3620], [3590, 3660], [3630, 3700], [3640, 3710],
  [3650, 3720], [3660, 3730], [3700, 3770], [3720, 3800], [3730, 3810], [3740, 3830],
  [3750, 3830], [3760, 3830], [3780, 3860], [3790, 3860], [3800, 3880], [3830, 3910],
  [3940, 4020], [3950, 4030], [3960, 4030], [3970, 4050], [3980, 4050], [4010, 4080],
  [4030, 4120], [4040, 4120], [4100, 4180], [4110, 4180], [4120, 4210], [4140, 4230],
  [4150, 4230], [4160, 4250], [4170, 4250], [4250, 4330], [4260, 4340], [4270, 4350],
  [4280, 4370], [4300, 4400], [4310, 4400], [4320, 4400], [4330, 4410], [4340, 4430],
  [4360, 4450], [4380, 4460], [4390, 4460], [4410, 4490], [4420, 4490], [4430, 4510],
  [4440, 4510], [4460, 4530], [4500, 4570], [4510, 4590], [4520, 4610], [4530, 4630],
  [4540, 4630], [4550, 4640], [4560, 4640], [4570, 4650], [4580, 4650], [4600, 4670],
  [4640, 4710], [4660, 4740], [4710, 4790], [4720, 4790], [4730, 4810], [4760, 4840],
  [4770, 4840], [4790, 4880], [4810, 4910], [4870, 4940], [4890, 4960], [5000, 5080],
  [5010, 5090], [5020, 5100], [5030, 5110],
];

const elements = {
  board: document.querySelector("#board"),
  roundDisplay: document.querySelector("#roundDisplay"),
  rangeDisplay: document.querySelector("#rangeDisplay"),
  foundDisplay: document.querySelector("#foundDisplay"),
  activeTeamName: document.querySelector("#activeTeamName"),
  timerRing: document.querySelector("#timerRing"),
  timerDisplay: document.querySelector("#timerDisplay"),
  timerButton: document.querySelector("#timerButton"),
  passButton: document.querySelector("#passButton"),
  undoButton: document.querySelector("#undoButton"),
  teamList: document.querySelector("#teamList"),
  bandSelect: document.querySelector("#bandSelect"),
  newBoardButton: document.querySelector("#newBoardButton"),
  nextRoundButton: document.querySelector("#nextRoundButton"),
  copyBoardButton: document.querySelector("#copyBoardButton"),
  newGameButton: document.querySelector("#newGameButton"),
  answerButton: document.querySelector("#answerButton"),
  rulesButton: document.querySelector("#rulesButton"),
  statusMessage: document.querySelector("#statusMessage"),
  activityLog: document.querySelector("#activityLog"),
  logCount: document.querySelector("#logCount"),
  hiddenDialog: document.querySelector("#hiddenDialog"),
  hiddenForm: document.querySelector("#hiddenForm"),
  hiddenGuessInput: document.querySelector("#hiddenGuessInput"),
  rulesDialog: document.querySelector("#rulesDialog"),
  resultDialog: document.querySelector("#resultDialog"),
  resultTitle: document.querySelector("#resultTitle"),
  resultDescription: document.querySelector("#resultDescription"),
  resultNewGameButton: document.querySelector("#resultNewGameButton"),
  toast: document.querySelector("#toast"),
};

let state = null;
let timerId = null;
let toastTimer = null;
let pendingHiddenIndex = null;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

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

function sampleOne(values) {
  return values[secureRandomInt(values.length)];
}

function sampleMany(values, count) {
  return shuffle(values).slice(0, count);
}

function isPrime(number) {
  if (number < 2) return false;
  if (number % 2 === 0) return number === 2;
  if (number % 3 === 0) return number === 3;
  for (let divisor = 5; divisor * divisor <= number; divisor += 6) {
    if (number % divisor === 0 || number % (divisor + 2) === 0) return false;
  }
  return true;
}

function oddNonFiveValues(start, end) {
  const first = start % 2 === 0 ? start + 1 : start;
  const values = [];
  for (let value = first; value <= end; value += 2) {
    if (value % 5 !== 0) values.push(value);
  }
  return values;
}

function intervalMatchesBand([start, end], band) {
  if (band === "under1000") return end < 1000;
  if (band === "1000to2999") return start >= 1000 && start < 3000;
  if (band === "3000plus") return start >= 3000;
  return true;
}

function intervalKey(interval) {
  return `${interval[0]}-${interval[1]}`;
}

function getAvailableIntervals() {
  const banded = SOURCE_INTERVALS.filter((interval) => intervalMatchesBand(interval, state.band));
  const unused = banded.filter((interval) => !state.usedRanges.includes(intervalKey(interval)));
  return unused.length ? unused : banded;
}

function createBoard() {
  const interval = sampleOne(getAvailableIntervals());
  const [start, end] = interval;
  const values = oddNonFiveValues(start, end);
  const primes = values.filter(isPrime);
  const composites = values.filter((value) => !isPrime(value));

  if (primes.length !== PRIME_COUNT || composites.length < COMPOSITE_COUNT) {
    throw new Error(`Invalid interval ${start}-${end}`);
  }

  const hiddenPrime = sampleOne(primes);
  const visiblePrimes = primes.filter((value) => value !== hiddenPrime);
  const visibleComposites = sampleMany(composites, COMPOSITE_COUNT);
  const visibleTiles = shuffle([
    ...visiblePrimes.map((number) => makeTile(number, false)),
    ...visibleComposites.map((number) => makeTile(number, false)),
  ]);

  const board = [];
  let visibleIndex = 0;

  for (let index = 0; index < BOARD_SIZE; index += 1) {
    if (index === HIDDEN_INDEX) {
      board.push(makeTile(hiddenPrime, true));
    } else {
      board.push(visibleTiles[visibleIndex]);
      visibleIndex += 1;
    }
  }

  state.usedRanges.push(intervalKey(interval));
  return { board, range: { start, end } };
}

function makeTile(number, hidden) {
  return {
    number,
    hidden,
    prime: isPrime(number),
    revealed: false,
    status: "idle",
    foundBy: null,
  };
}

function createInitialState() {
  state = {
    round: 1,
    band: elements.bandSelect.value,
    usedRanges: [],
    range: null,
    board: [],
    teams: [
      { name: "A팀", score: 0, color: TEAM_COLORS[0] },
      { name: "B팀", score: 0, color: TEAM_COLORS[1] },
    ],
    activeTeam: 0,
    timeLeft: TURN_SECONDS,
    timerRunning: false,
    answersVisible: false,
    actionCount: 0,
    log: [],
    history: [],
    finished: false,
    status: "참가자의 답을 들은 뒤 해당 숫자를 눌러 판정하세요.",
  };

  const next = createBoard();
  state.board = next.board;
  state.range = next.range;
}

function snapshot() {
  const { history, ...rest } = state;
  return JSON.parse(JSON.stringify(rest));
}

function checkpoint(label) {
  state.history.push({ label, data: snapshot() });
  if (state.history.length > 80) state.history.shift();
}

function undo() {
  if (!state.history.length) return;
  const history = state.history;
  const previous = history.pop().data;
  stopTimer();
  state = { ...previous, history, timerRunning: false };
  state.status = "직전 판정을 되돌렸습니다.";
  render();
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("show"), 2200);
}

function addLog(text) {
  state.actionCount += 1;
  state.log.unshift({
    number: state.actionCount,
    round: state.round,
    text,
  });
  state.log = state.log.slice(0, 36);
}

function activeTeam() {
  return state.teams[state.activeTeam];
}

function foundPrimeCount() {
  return state.board.filter((tile) => tile.prime && tile.revealed).length;
}

function switchTurn(message, restartTimer) {
  state.activeTeam = (state.activeTeam + 1) % state.teams.length;
  state.timeLeft = TURN_SECONDS;
  state.status = message || `${activeTeam().name} 차례입니다.`;
  if (restartTimer && !state.finished) startTimer();
}

function handleCorrect(tile, points, restartTimer) {
  const team = activeTeam();
  tile.revealed = true;
  tile.status = "correct";
  tile.foundBy = state.activeTeam;
  team.score += points;
  state.timeLeft = TURN_SECONDS;
  state.status = `${team.name} 정답입니다. ${points}점을 얻고 한 번 더 도전합니다.`;

  if (team.score >= SCORE_TARGET) {
    finishGame(`${team.name} 승리`, `${team.name}이(가) ${team.score}점으로 먼저 ${SCORE_TARGET}점에 도달했습니다.`);
    return;
  }

  if (foundPrimeCount() === PRIME_COUNT) {
    state.status = "이번 라운드의 소수를 모두 찾았습니다.";
  }

  if (restartTimer && !state.finished) startTimer();
}

function handleWrong(tile, restartTimer) {
  const team = activeTeam();
  tile.revealed = true;
  tile.status = "wrong";
  addLog(`${team.name} 오답 · ${tile.number}은(는) 합성수`);
  switchTurn(`${team.name} 오답입니다. ${activeTeam().name}에게 기회가 넘어갑니다.`, restartTimer);
}

function judgeTile(index) {
  if (state.finished) return;
  const tile = state.board[index];
  if (!tile || tile.status !== "idle") return;

  if (tile.hidden && !tile.revealed) {
    pendingHiddenIndex = index;
    elements.hiddenGuessInput.value = "";
    elements.hiddenDialog.showModal();
    window.setTimeout(() => elements.hiddenGuessInput.focus(), 0);
    return;
  }

  const restartTimer = state.timerRunning;
  stopTimer();
  checkpoint("숫자 판정");

  if (tile.prime) {
    addLog(`${activeTeam().name} 정답 · ${tile.number} 소수`);
    handleCorrect(tile, 1, restartTimer);
  } else {
    handleWrong(tile, restartTimer);
  }

  render();
}

function judgeHidden(event) {
  event.preventDefault();
  if (pendingHiddenIndex === null || state.finished) return;

  const tile = state.board[pendingHiddenIndex];
  const guessText = elements.hiddenGuessInput.value.trim();
  const guess = Number(guessText);
  const team = activeTeam();
  const restartTimer = state.timerRunning;

  stopTimer();
  checkpoint("히든 소수 판정");
  elements.hiddenDialog.close();

  if (guessText && Number.isInteger(guess) && guess === tile.number) {
    addLog(`${team.name} 히든 정답 · ${tile.number} 소수`);
    handleCorrect(tile, 3, restartTimer);
  } else {
    const written = guessText && Number.isInteger(guess) ? guess : "미입력";
    addLog(`${team.name} 히든 오답 · ${written}`);
    switchTurn(`${team.name} 히든 오답입니다. ${activeTeam().name}에게 기회가 넘어갑니다.`, restartTimer);
  }

  pendingHiddenIndex = null;
  render();
}

function passTurn() {
  if (state.finished) return;
  const restartTimer = state.timerRunning;
  const team = activeTeam();
  stopTimer();
  checkpoint("기회 넘김");
  addLog(`${team.name} 기회 넘김`);
  switchTurn(`${team.name}이(가) 기회를 넘겼습니다. ${activeTeam().name} 차례입니다.`, restartTimer);
  render();
}

function tickTimer() {
  let expired = false;
  state.timeLeft = Math.max(0, state.timeLeft - 1);
  if (state.timeLeft === 0) {
    expired = true;
    const team = activeTeam();
    stopTimer();
    checkpoint("시간 초과");
    addLog(`${team.name} 시간 초과`);
    switchTurn(`${team.name} 시간 초과입니다. ${activeTeam().name} 차례입니다.`, true);
  }
  render({ timerOnly: !expired });
}

function startTimer() {
  if (state.finished) return;
  window.clearInterval(timerId);
  state.timerRunning = true;
  timerId = window.setInterval(tickTimer, 1000);
  render({ timerOnly: true });
}

function stopTimer() {
  window.clearInterval(timerId);
  timerId = null;
  if (state) state.timerRunning = false;
}

function toggleTimer() {
  if (state.timerRunning) {
    stopTimer();
  } else {
    startTimer();
  }
  render({ timerOnly: true });
}

function newBoard({ keepRound = true } = {}) {
  stopTimer();
  state.band = elements.bandSelect.value;
  state.timeLeft = TURN_SECONDS;
  state.answersVisible = false;
  state.finished = false;
  if (!keepRound) state.round = 1;

  const next = createBoard();
  state.board = next.board;
  state.range = next.range;
  state.status = "새 보드를 만들었습니다.";
  addLog(`${state.round}라운드 보드 생성 · ${state.range.start}-${state.range.end}`);
  render();
}

function nextRound() {
  if (state.round >= ROUND_LIMIT) {
    finishByCurrentScore();
    return;
  }

  checkpoint("다음 라운드");
  state.round += 1;
  newBoard();
}

function newGame() {
  stopTimer();
  createInitialState();
  addLog(`1라운드 보드 생성 · ${state.range.start}-${state.range.end}`);
  render();
  showToast("새 게임을 시작했습니다.");
}

function finishByCurrentScore() {
  const [first, second] = state.teams;
  if (first.score === second.score) {
    finishGame("무승부", `두 팀 모두 ${first.score}점입니다.`);
    return;
  }
  const winner = first.score > second.score ? first : second;
  finishGame(`${winner.name} 승리`, `${winner.name}이(가) ${winner.score}점으로 앞섰습니다.`);
}

function finishGame(title, description) {
  stopTimer();
  state.finished = true;
  state.status = description;
  elements.resultTitle.textContent = title;
  elements.resultDescription.textContent = description;
  if (!elements.resultDialog.open) elements.resultDialog.showModal();
}

function toggleAnswers() {
  state.answersVisible = !state.answersVisible;
  elements.answerButton.textContent = state.answersVisible ? "정답 숨기기" : "정답 보기";
  render();
}

async function copyBoard() {
  const lines = state.board.reduce((rows, tile, index) => {
    const rowIndex = Math.floor(index / 5);
    if (!rows[rowIndex]) rows[rowIndex] = [];
    rows[rowIndex].push(tile.hidden && !tile.revealed ? "?" : String(tile.number));
    return rows;
  }, []);
  const text = [
    `소수 체크 게임 ${state.round}라운드 (${state.range.start} ~ ${state.range.end})`,
    ...lines.map((row) => row.join("\t")),
    "조건: 2의 배수와 5의 배수 제외, 소수 9개",
  ].join("\n");

  try {
    await navigator.clipboard.writeText(text);
    showToast("보드 내용을 복사했습니다.");
  } catch {
    showToast("복사 권한이 없어 보드 복사를 완료하지 못했습니다.");
  }
}

function tileLabel(tile) {
  if (tile.status === "correct") return tile.hidden ? "히든 정답" : "소수";
  if (tile.status === "wrong") return "합성수";
  if (state.answersVisible) return tile.prime ? "소수" : "합성수";
  if (tile.hidden) return "히든";
  return "";
}

function renderBoard() {
  elements.board.innerHTML = state.board.map((tile, index) => {
    const showNumber = !tile.hidden || tile.revealed || state.answersVisible;
    const classes = [
      "tile",
      tile.hidden ? "is-hidden" : "",
      tile.status === "correct" ? "is-correct" : "",
      tile.status === "wrong" ? "is-wrong" : "",
      state.answersVisible && tile.prime ? "is-answer-prime" : "",
      state.answersVisible && !tile.prime ? "is-answer-composite" : "",
    ].filter(Boolean).join(" ");
    const label = tileLabel(tile);

    return `
      <button class="${classes}" type="button" data-index="${index}" aria-label="${index + 1}번 칸">
        <span class="tile-number">${showNumber ? tile.number : "?"}</span>
        ${label ? `<span class="tile-label">${escapeHtml(label)}</span>` : ""}
      </button>
    `;
  }).join("");
}

function renderTimer() {
  const angle = Math.round((state.timeLeft / TURN_SECONDS) * 360);
  elements.timerRing.style.setProperty("--timer-angle", `${angle}deg`);
  elements.timerDisplay.textContent = state.timeLeft;
  elements.timerButton.textContent = state.timerRunning ? "타이머 정지" : "타이머 시작";
}

function renderTeams() {
  if (elements.teamList.contains(document.activeElement)) return;

  elements.teamList.innerHTML = state.teams.map((team, index) => `
    <div class="team-row ${index === state.activeTeam ? "is-active" : ""}" style="--team-color: ${team.color}">
      <input data-team-name="${index}" type="text" maxlength="14" value="${escapeHtml(team.name)}" aria-label="${index + 1}팀 이름" />
      <div class="team-score">
        <strong>${team.score}</strong>
        <span>점</span>
      </div>
    </div>
  `).join("");
}

function renderLog() {
  elements.logCount.textContent = `${state.actionCount}회`;
  elements.activityLog.innerHTML = state.log.length
    ? state.log.map((item) => `<li><strong>${item.number}.</strong> R${item.round} · ${escapeHtml(item.text)}</li>`).join("")
    : `<li class="empty-log">아직 기록이 없습니다.</li>`;
}

function render({ timerOnly = false } = {}) {
  elements.roundDisplay.textContent = state.round;
  elements.rangeDisplay.textContent = `${state.range.start} ~ ${state.range.end}`;
  elements.foundDisplay.textContent = foundPrimeCount();
  elements.activeTeamName.textContent = activeTeam().name;
  elements.statusMessage.textContent = state.status;
  elements.answerButton.textContent = state.answersVisible ? "정답 숨기기" : "정답 보기";
  elements.undoButton.disabled = state.history.length === 0;
  elements.nextRoundButton.disabled = state.finished;
  elements.newBoardButton.disabled = state.finished;
  elements.passButton.disabled = state.finished;
  renderTimer();

  if (timerOnly) return;

  renderBoard();
  renderTeams();
  renderLog();
}

function updateTeamName(event) {
  const input = event.target.closest("[data-team-name]");
  if (!input) return;
  const index = Number(input.dataset.teamName);
  state.teams[index].name = input.value.trim() || `${index + 1}팀`;
  elements.activeTeamName.textContent = activeTeam().name;
}

function closeDialogFromButton(event) {
  const button = event.target.closest("[data-close-dialog]");
  if (!button) return;
  button.closest("dialog")?.close();
}

elements.board.addEventListener("click", (event) => {
  const button = event.target.closest("[data-index]");
  if (!button) return;
  judgeTile(Number(button.dataset.index));
});
elements.hiddenForm.addEventListener("submit", judgeHidden);
elements.timerButton.addEventListener("click", toggleTimer);
elements.passButton.addEventListener("click", passTurn);
elements.undoButton.addEventListener("click", undo);
elements.newBoardButton.addEventListener("click", () => newBoard());
elements.nextRoundButton.addEventListener("click", nextRound);
elements.copyBoardButton.addEventListener("click", copyBoard);
elements.newGameButton.addEventListener("click", newGame);
elements.answerButton.addEventListener("click", toggleAnswers);
elements.rulesButton.addEventListener("click", () => elements.rulesDialog.showModal());
elements.resultNewGameButton.addEventListener("click", () => {
  elements.resultDialog.close();
  newGame();
});
elements.teamList.addEventListener("input", updateTeamName);
document.addEventListener("click", closeDialogFromButton);

newGame();
