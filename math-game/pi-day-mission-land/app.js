const PI_DIGITS = "31415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679";

const CATEGORY_META = {
  memory: { label: "암기·스피드", color: "#ffd6e3" },
  experiment: { label: "확률·실험", color: "#c9f5f2" },
  calculation: { label: "계산·추론", color: "#fff0a6" },
  team: { label: "팀·교실", color: "#e4d9ff" }
};

const missions = [
  { id: "memory", title: "파이 암기왕", category: "memory", symbol: "π", time: "2~5분", level: "개인전", engine: "memory", desc: "잠깐 공개된 원주율을 기억해 소수점 아래 숫자를 최대한 정확히 입력합니다.", supplies: "준비물 없음" },
  { id: "next", title: "다음 자리 추리", category: "memory", symbol: "?", time: "3분", level: "개인전", engine: "next", desc: "원주율의 중간 조각을 보고 바로 다음 숫자를 네 개의 선택지에서 고릅니다.", supplies: "준비물 없음" },
  { id: "typing", title: "파이 타자 스프린트", category: "memory", symbol: "⌨", time: "1분", level: "개인전", engine: "typing", desc: "60초 동안 화면의 원주율을 보고 정확하게 타이핑해 최고 기록에 도전합니다.", supplies: "키보드" },
  { id: "order", title: "숫자 순서 복원", category: "memory", symbol: "314", time: "3분", level: "개인전", engine: "order", desc: "섞여 있는 숫자 타일을 눌러 원주율의 올바른 순서를 복원합니다.", supplies: "준비물 없음" },
  { id: "reaction", title: "3·1·4 반응왕", category: "memory", symbol: "⚡", time: "2분", level: "개인전", engine: "reaction", desc: "빠르게 바뀌는 숫자 속에서 3, 1, 4를 차례로 포착하는 순발력 종목입니다.", supplies: "준비물 없음" },

  { id: "dart", title: "파이 다트", category: "experiment", symbol: "◎", time: "5분", level: "팀전", engine: "dart", desc: "정사각형 표적에 점을 던져 원 안에 들어간 비율로 원주율을 추정합니다.", supplies: "준비물 없음" },
  { id: "montecarlo", title: "몬테카를로 π 실험", category: "experiment", symbol: "∴", time: "4분", level: "탐구", engine: "montecarlo", desc: "무작위 점을 10개부터 1만 개까지 뿌리며 추정값이 π에 가까워지는지 관찰합니다.", supplies: "준비물 없음" },
  { id: "buffon", title: "버퐁의 바늘", category: "experiment", symbol: "╱", time: "5분", level: "탐구", engine: "buffon", desc: "평행선 위에 바늘을 무작위로 떨어뜨려 선과 만나는 확률로 π를 추정합니다.", supplies: "준비물 없음" },
  { id: "random-points", title: "점 찍기 릴레이", category: "experiment", symbol: "•••", time: "7분", level: "팀전", engine: "physical", desc: "종이 정사각형에 팀원이 번갈아 점을 찍고 원 안팎의 개수를 세어 π를 구합니다.", supplies: "원 표적 활동지, 사인펜", rules: ["정사각형 안에 내접원을 크게 그립니다.", "눈을 감고 팀원마다 10개의 점을 빠르게 찍습니다.", "원 안의 점 수×4÷전체 점 수로 π를 계산합니다.", "실제 π와 차이가 가장 작은 팀이 승리합니다."], scoring: "오차 0.05 이하 15점 · 0.15 이하 10점 · 참가 5점" },

  { id: "circumference", title: "원주 계산 질주", category: "calculation", symbol: "2πr", time: "3분", level: "개인전", engine: "circumference", desc: "주어진 반지름으로 원주를 빠르게 계산합니다. π는 3.14를 사용합니다.", supplies: "준비물 없음" },
  { id: "area", title: "원의 넓이 번개퀴즈", category: "calculation", symbol: "πr²", time: "3분", level: "개인전", engine: "area", desc: "반지름이나 지름을 읽고 원의 넓이를 제한 시간 안에 계산합니다.", supplies: "준비물 없음" },
  { id: "radius", title: "반지름 탐정", category: "calculation", symbol: "r?", time: "3분", level: "개인전", engine: "radius", desc: "원주 또는 넓이라는 단서만으로 숨어 있는 반지름을 찾아냅니다.", supplies: "준비물 없음" },
  { id: "fraction", title: "π 분수 근사왕", category: "calculation", symbol: "22⁄7", time: "4분", level: "개인전", engine: "fraction", desc: "여러 분수의 값을 비교해 π에 더 가까운 근삿값을 골라냅니다.", supplies: "준비물 없음" },
  { id: "polygon", title: "아르키메데스 다각형", category: "calculation", symbol: "⬡", time: "5분", level: "탐구", engine: "polygon", desc: "원 안팎의 정다각형 변 수를 늘리며 둘레의 범위가 π를 어떻게 조이는지 살펴봅니다.", supplies: "준비물 없음" },
  { id: "facts", title: "파이 팩트 OX", category: "calculation", symbol: "OX", time: "5분", level: "팀전", engine: "facts", desc: "원주율의 성질과 역사에 관한 문장을 듣고 O 또는 X로 빠르게 이동합니다.", supplies: "준비물 없음" },
  { id: "measure-relay", title: "원주 재기 릴레이", category: "calculation", symbol: "○↔", time: "8분", level: "팀전", engine: "physical", desc: "교실 속 둥근 물건의 둘레와 지름을 재고 두 값의 비를 계산하는 측정 경기입니다.", supplies: "실, 자, 둥근 물건", rules: ["팀마다 크기가 다른 둥근 물건 3개를 고릅니다.", "실로 둘레를 재고 자로 지름을 잽니다.", "둘레÷지름을 소수 둘째 자리까지 계산합니다.", "세 결과의 평균이 3.14에 가장 가까운 팀이 승리합니다."], scoring: "측정표 완성 5점 · 오차 0.05 이하 물건마다 5점" },

  { id: "bingo", title: "원주율 숫자 빙고", category: "team", symbol: "▦", time: "10분", level: "전체", engine: "bingo", desc: "원주율의 연속된 두 자리 수를 찾아 표시하며 가로·세로·대각선 빙고를 완성합니다.", supplies: "프린터(선택)" },
  { id: "quiz-relay", title: "파이 퀴즈 릴레이", category: "team", symbol: "🏁", time: "10분", level: "팀전", engine: "physical", desc: "원과 원주율 문제를 한 명씩 풀고 다음 주자에게 펜을 넘기는 박진감 있는 릴레이입니다.", supplies: "문제 카드, 종이, 펜", rules: ["팀별로 한 줄로 서고 첫 주자만 문제를 봅니다.", "정답을 쓰면 진행자가 확인하고 다음 주자에게 펜을 넘깁니다.", "틀리면 같은 주자가 다시 계산합니다.", "5문제를 먼저 모두 맞힌 팀이 승리합니다."], scoring: "1위 15점 · 2위 10점 · 완주 5점" },
  { id: "circle-drawing", title: "완벽한 원 그리기", category: "team", symbol: "◯", time: "5분", level: "개인전", engine: "physical", desc: "컴퍼스 없이 한 번에 원을 그리고 가로·세로 지름의 차이로 완성도를 겨룹니다.", supplies: "A4 종이, 사인펜, 자", rules: ["손목이나 팔꿈치를 종이에 고정하지 않고 한 번에 원을 그립니다.", "가장 길어 보이는 지름과 그에 수직인 지름을 잽니다.", "두 지름의 차이가 작을수록 완벽한 원에 가깝습니다.", "한 사람당 두 번 도전해 더 좋은 기록을 사용합니다."], scoring: "지름 차이 3mm 이하 15점 · 7mm 이하 10점 · 참가 5점" },
  { id: "hoop", title: "원 한 바퀴 굴리기", category: "team", symbol: "◉", time: "7분", level: "팀전", engine: "physical", desc: "훌라후프나 원형 뚜껑의 한 바퀴 이동 거리를 예상하고 실제 원주와 비교합니다.", supplies: "훌라후프 또는 원형 뚜껑, 줄자", rules: ["원의 지름을 재고 한 바퀴 굴러갈 거리를 먼저 예상합니다.", "시작점을 표시한 뒤 정확히 한 바퀴 굴립니다.", "실제 이동 거리와 3.14×지름을 비교합니다.", "예상과 실제의 차이가 가장 작은 팀이 승리합니다."], scoring: "오차 2cm 이하 15점 · 5cm 이하 10점 · 참가 5점" },
  { id: "photo-hunt", title: "교실 속 원 포토헌트", category: "team", symbol: "⌾", time: "8분", level: "팀전", engine: "physical", desc: "주변에서 원을 찾아 사진으로 모으고 지름·원주·원의 쓰임을 설명합니다.", supplies: "태블릿 또는 휴대폰", rules: ["제한 시간 5분 동안 원 모양 물건을 찾습니다.", "같은 물건은 한 번만 인정하고 사진에 팀 표식을 함께 담습니다.", "사진마다 물건 이름과 원이 쓰인 이유를 말합니다.", "희귀한 원과 수학 설명에 보너스를 줍니다."], scoring: "서로 다른 원 1개당 1점 · 수학 설명 우수 5점" },
  { id: "human-pi", title: "인간 π 만들기", category: "team", symbol: "π", time: "6분", level: "전체", engine: "physical", desc: "팀원들의 몸과 준비물을 이용해 거대한 π 모양을 가장 빠르고 창의적으로 완성합니다.", supplies: "색종이 또는 끈(선택)", rules: ["바닥에 안전한 넓은 공간을 확보합니다.", "팀원 전원이 참여해 위에서 보이는 π 모양을 만듭니다.", "완성 신호 뒤 5초 동안 자세를 유지합니다.", "정확성·협동·창의성을 각각 평가합니다."], scoring: "정확성 5점 · 협동 5점 · 창의성 5점" },
  { id: "treasure", title: "3·1·4 보물찾기", category: "team", symbol: "314", time: "10분", level: "팀전", engine: "physical", desc: "3개·1개·4개의 단서 묶음을 해결해 마지막 파이 암호 상자를 찾습니다.", supplies: "단서 카드, 작은 상품", rules: ["교사는 교실 세 곳에 3개, 1개, 4개의 단서 카드를 숨깁니다.", "첫 단서의 답이 다음 카드 위치를 가리키게 만듭니다.", "모든 답을 순서대로 이어 314 암호를 완성합니다.", "가장 먼저 암호와 풀이를 함께 제출한 팀이 승리합니다."], scoring: "1위 15점 · 2위 10점 · 해결 5점" },
  { id: "tower", title: "파이 종이탑 챌린지", category: "team", symbol: "3.14m", time: "12분", level: "팀전", engine: "physical", desc: "종이 3장, 테이프 1m, 제작 4분이라는 3·1·4 조건으로 가장 높은 탑을 만듭니다.", supplies: "A4 3장, 테이프 1m, 가위", rules: ["팀마다 A4 3장과 테이프 1m만 사용합니다.", "설계 2분 뒤 제작 시간 4분을 시작합니다.", "탑은 손을 떼고 10초 이상 서 있어야 합니다.", "바닥부터 가장 높은 지점까지 수직 높이를 잽니다."], scoring: "1위 15점 · 2위 10점 · 자립 성공 5점" }
];

const els = {
  teamList: document.querySelector("#teamList"),
  missionGrid: document.querySelector("#missionGrid"),
  visibleCount: document.querySelector("#visibleCount"),
  completedCount: document.querySelector("#completedCount"),
  emptyState: document.querySelector("#emptyState"),
  searchInput: document.querySelector("#searchInput"),
  gameDialog: document.querySelector("#gameDialog"),
  gameContent: document.querySelector("#gameContent"),
  dialogTitle: document.querySelector("#dialogTitle"),
  dialogSubtitle: document.querySelector("#dialogSubtitle"),
  dialogNumber: document.querySelector("#dialogNumber"),
  timerDisplay: document.querySelector("#timerDisplay"),
  timerToggle: document.querySelector("#timerToggleButton"),
  activeTeamLabel: document.querySelector("#activeTeamLabel"),
  toast: document.querySelector("#toast")
};

const TEAM_COLORS = ["#ff5d8f", "#75e4e8", "#ffd84d", "#c7f36b", "#b69cff", "#ff986b"];
const savedState = JSON.parse(localStorage.getItem("pi-day-mission-land") || "null");
let state = savedState || {
  teams: [
    { name: "자주 팀", score: 0, color: TEAM_COLORS[0] },
    { name: "노랑 팀", score: 0, color: TEAM_COLORS[2] },
    { name: "민트 팀", score: 0, color: TEAM_COLORS[1] }
  ],
  activeTeam: 0,
  completed: [],
  sound: true
};
let activeCategory = "all";
let currentMission = null;
let timerSeconds = 60;
let timerInterval = null;
let toastTimeout = null;
let gameCleanup = null;

function saveState() {
  localStorage.setItem("pi-day-mission-land", JSON.stringify(state));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function showToast(message) {
  clearTimeout(toastTimeout);
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  toastTimeout = setTimeout(() => els.toast.classList.remove("is-visible"), 2100);
}

function beep(frequency = 660, duration = 0.08) {
  if (!state.sound) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    gain.connect(context.destination);
    gain.gain.setValueAtTime(0.05, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
    oscillator.addEventListener("ended", () => context.close());
  } catch (_) {}
}

function renderTeams() {
  if (state.activeTeam >= state.teams.length) state.activeTeam = 0;
  els.teamList.innerHTML = state.teams.map((team, index) => `
    <div class="team-chip ${index === state.activeTeam ? "is-active" : ""}" role="button" tabindex="0" data-team="${index}" style="--team-color:${team.color}" aria-label="${escapeHtml(team.name)}, ${team.score}점${index === state.activeTeam ? ", 현재 팀" : ""}">
      <span class="team-dot"></span>
      <input class="team-name" value="${escapeHtml(team.name)}" data-team-name="${index}" maxlength="8" aria-label="${index + 1}번 팀 이름" />
      <span class="team-score">${team.score}</span>
    </div>
  `).join("");
  els.activeTeamLabel.textContent = state.teams[state.activeTeam]?.name || "현재 팀";

  els.teamList.querySelectorAll(".team-chip").forEach((chip) => {
    const selectTeam = (event) => {
      if (event.target.matches("input")) return;
      state.activeTeam = Number(chip.dataset.team);
      saveState();
      renderTeams();
    };
    chip.addEventListener("click", selectTeam);
    chip.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectTeam(event);
      }
    });
  });
  els.teamList.querySelectorAll(".team-name").forEach((input) => {
    input.addEventListener("click", (event) => event.stopPropagation());
    input.addEventListener("change", () => {
      const index = Number(input.dataset.teamName);
      state.teams[index].name = input.value.trim() || `${index + 1}팀`;
      saveState();
      renderTeams();
    });
  });
}

function addScore(points) {
  const team = state.teams[state.activeTeam];
  if (!team) return;
  team.score += points;
  saveState();
  renderTeams();
  beep(points >= 10 ? 880 : 720);
  showToast(`${team.name} +${points}점! 현재 ${team.score}점`);
}

function renderMissions() {
  const query = els.searchInput.value.trim().toLowerCase();
  const filtered = missions.filter((mission) => {
    const categoryMatch = activeCategory === "all" || mission.category === activeCategory;
    const text = `${mission.title} ${mission.desc} ${mission.supplies}`.toLowerCase();
    return categoryMatch && text.includes(query);
  });
  els.missionGrid.innerHTML = filtered.map((mission) => {
    const index = missions.indexOf(mission) + 1;
    const category = CATEGORY_META[mission.category];
    const completed = state.completed.includes(mission.id);
    const tilt = `${(index % 2 ? -1 : 1) * (2 + index % 4)}deg`;
    return `
      <article class="mission-card ${completed ? "is-completed" : ""}" style="--card-bg:${category.color};--tilt:${tilt}">
        <div class="card-top"><span class="mission-index">MISSION ${String(index).padStart(2, "0")}</span><span class="mission-kind">${category.label}</span></div>
        <div class="card-symbol"><span class="symbol-ring">${mission.symbol}</span></div>
        <div class="card-body">
          <h3>${mission.title}</h3>
          <p>${mission.desc}</p>
          <div class="card-meta"><span>${mission.time} · ${mission.level}</span><button class="play-button" type="button" data-mission="${mission.id}">${mission.engine === "physical" ? "운영하기" : "도전하기"} <span aria-hidden="true">→</span></button></div>
        </div>
      </article>`;
  }).join("");
  els.visibleCount.textContent = filtered.length;
  els.completedCount.textContent = state.completed.length;
  els.emptyState.hidden = filtered.length !== 0;
  els.missionGrid.querySelectorAll("[data-mission]").forEach((button) => button.addEventListener("click", () => openMission(button.dataset.mission)));
}

function formatTime(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function updateTimer() {
  els.timerDisplay.textContent = formatTime(timerSeconds);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  els.timerToggle.textContent = "타이머 시작";
}

function toggleTimer() {
  if (timerInterval) {
    stopTimer();
    return;
  }
  if (timerSeconds <= 0) timerSeconds = 60;
  els.timerToggle.textContent = "일시 정지";
  timerInterval = setInterval(() => {
    timerSeconds -= 1;
    updateTimer();
    if (timerSeconds <= 0) {
      stopTimer();
      beep(300, 0.45);
      showToast("시간 종료! 기록을 확인하세요.");
    }
  }, 1000);
}

function setResult(message, status = "") {
  const result = document.querySelector("#gameResult");
  if (!result) return;
  result.className = `result-message ${status}`;
  result.textContent = message;
}

function openMission(id) {
  currentMission = missions.find((mission) => mission.id === id);
  if (!currentMission) return;
  if (gameCleanup) gameCleanup();
  gameCleanup = null;
  stopTimer();
  timerSeconds = 60;
  updateTimer();
  const index = missions.indexOf(currentMission) + 1;
  els.dialogNumber.textContent = `MISSION ${String(index).padStart(2, "0")} · ${CATEGORY_META[currentMission.category].label}`;
  els.dialogTitle.textContent = currentMission.title;
  els.dialogSubtitle.textContent = currentMission.desc;
  els.activeTeamLabel.textContent = state.teams[state.activeTeam]?.name || "현재 팀";
  renderEngine(currentMission);
  els.gameDialog.showModal();
}

function closeMission() {
  stopTimer();
  if (gameCleanup) gameCleanup();
  gameCleanup = null;
  els.gameDialog.close();
}

function renderEngine(mission) {
  const handlers = {
    memory: renderMemory,
    next: renderNextDigit,
    typing: renderTyping,
    order: renderOrder,
    reaction: renderReaction,
    dart: renderDart,
    montecarlo: () => renderPointSimulation("montecarlo"),
    buffon: () => renderPointSimulation("buffon"),
    circumference: () => renderNumericQuiz("circumference"),
    area: () => renderNumericQuiz("area"),
    radius: () => renderNumericQuiz("radius"),
    fraction: renderFraction,
    polygon: renderPolygon,
    facts: renderFacts,
    bingo: renderBingo,
    physical: () => renderPhysical(mission)
  };
  (handlers[mission.engine] || (() => renderPhysical(mission)))();
}

function renderMemory() {
  els.gameContent.innerHTML = `
    <section class="game-stage"><div>
      <h3>몇 자리까지 기억할 수 있나요?</h3>
      <p class="instruction">자릿수를 고른 뒤 5초 동안 숫자를 보고, 사라지면 기억나는 만큼 입력하세요.</p>
      <div class="big-display" id="memoryDisplay">3.1415926535</div>
      <div class="game-controls">
        <select class="game-input" id="memoryLength" aria-label="암기할 자릿수" style="max-width:170px"><option value="10">10자리</option><option value="20">20자리</option><option value="40">40자리</option><option value="60">60자리</option></select>
        <button class="game-button pink" id="memoryStart" type="button">5초 암기 시작</button>
      </div>
      <div class="game-controls"><input class="game-input" id="memoryInput" inputmode="decimal" placeholder="숫자를 입력하세요" disabled /><button class="game-button" id="memoryCheck" type="button" disabled>채점하기</button></div>
      <p class="result-message" id="gameResult"></p>
    </div></section>`;
  const display = document.querySelector("#memoryDisplay");
  const input = document.querySelector("#memoryInput");
  const check = document.querySelector("#memoryCheck");
  let target = PI_DIGITS.slice(0, 10);
  let revealTimeout;
  document.querySelector("#memoryStart").addEventListener("click", () => {
    const length = Number(document.querySelector("#memoryLength").value);
    target = PI_DIGITS.slice(0, length);
    display.textContent = `${target[0]}.${target.slice(1)}`;
    input.value = "";
    input.disabled = true;
    check.disabled = true;
    setResult("5초 동안 집중하세요!");
    clearTimeout(revealTimeout);
    revealTimeout = setTimeout(() => {
      display.textContent = "?".repeat(Math.min(length, 20));
      input.disabled = false;
      check.disabled = false;
      input.focus();
      beep();
      setResult("이제 기억나는 숫자를 입력하세요.");
    }, 5000);
  });
  check.addEventListener("click", () => {
    const answer = input.value.replace(/\D/g, "");
    let correct = 0;
    while (correct < answer.length && answer[correct] === target[correct]) correct += 1;
    const perfect = correct === target.length;
    display.textContent = `${target[0]}.${target.slice(1)}`;
    setResult(perfect ? `완벽해요! ${correct}자리 모두 성공!` : `처음부터 ${correct}자리 연속 정답!`, perfect ? "success" : "fail");
    beep(perfect ? 900 : 420);
  });
  gameCleanup = () => clearTimeout(revealTimeout);
}

function renderNextDigit() {
  let score = 0;
  let round = 0;
  function newQuestion() {
    const start = 1 + Math.floor(Math.random() * 75);
    const sequence = PI_DIGITS.slice(start, start + 7);
    const answer = PI_DIGITS[start + 7];
    const choices = [...new Set([answer, ...shuffle("0123456789".split(""))])].slice(0, 4);
    els.gameContent.innerHTML = `
      <section class="game-stage"><div>
        <h3>다음에 올 숫자는?</h3><p class="instruction">원주율 속 연속된 7자리입니다. 기억력과 직감을 함께 써 보세요.</p>
        <div class="big-display">…${sequence}<span style="color:var(--pink)">?</span></div>
        <div class="choice-grid">${shuffle(choices).map((choice) => `<button class="choice-button" data-choice="${choice}" type="button">${choice}</button>`).join("")}</div>
        <p class="result-message" id="gameResult">${round}문제 완료 · ${score}점</p>
      </div></section>`;
    document.querySelectorAll("[data-choice]").forEach((button) => button.addEventListener("click", () => {
      round += 1;
      if (button.dataset.choice === answer) {
        score += 1;
        beep(880);
        showToast(`정답! 현재 ${score}점`);
      } else {
        beep(350);
        showToast(`아쉬워요. 정답은 ${answer}`);
      }
      setTimeout(newQuestion, 500);
    }));
  }
  newQuestion();
}

function renderTyping() {
  let startTime = null;
  let interval;
  els.gameContent.innerHTML = `
    <section class="game-stage"><div>
      <h3>정확도가 먼저, 속도는 그다음!</h3><p class="instruction">시작을 누른 뒤 아래 원주율을 보고 그대로 입력하세요. 틀린 자리부터는 기록에 포함되지 않습니다.</p>
      <div class="big-display" style="min-height:100px;font-size:25px;letter-spacing:.04em">3.${PI_DIGITS.slice(1, 81)}</div>
      <div class="game-controls"><input class="game-input" id="typingInput" inputmode="decimal" placeholder="3.14159…" disabled /><button class="game-button pink" id="typingStart" type="button">60초 시작</button></div>
      <p class="result-message" id="gameResult">정확한 연속 입력 0자리 · 남은 시간 60초</p>
    </div></section>`;
  const input = document.querySelector("#typingInput");
  const startButton = document.querySelector("#typingStart");
  function evaluate() {
    const answer = input.value.replace(/\D/g, "");
    let correct = 0;
    while (correct < answer.length && answer[correct] === PI_DIGITS[correct]) correct += 1;
    const left = startTime ? Math.max(0, 60 - Math.floor((Date.now() - startTime) / 1000)) : 60;
    setResult(`정확한 연속 입력 ${correct}자리 · 남은 시간 ${left}초`, correct === answer.length ? "success" : "fail");
    if (left === 0) {
      clearInterval(interval);
      input.disabled = true;
      startButton.textContent = "다시 도전";
      startTime = null;
      beep(300, .35);
    }
  }
  startButton.addEventListener("click", () => {
    clearInterval(interval);
    input.value = "";
    input.disabled = false;
    input.focus();
    startTime = Date.now();
    startButton.textContent = "진행 중";
    interval = setInterval(evaluate, 250);
  });
  input.addEventListener("input", evaluate);
  gameCleanup = () => clearInterval(interval);
}

function renderOrder() {
  let round = 1;
  let score = 0;
  function nextRound() {
    const start = Math.floor(Math.random() * 75);
    const target = PI_DIGITS.slice(start, start + Math.min(5 + round, 9));
    let answer = "";
    els.gameContent.innerHTML = `
      <section class="game-stage"><div><h3>ROUND ${round} · ${target.length}자리</h3><p class="instruction">숫자 타일을 올바른 순서로 눌러 원주율 조각을 복원하세요.</p>
      <div class="big-display" id="orderAnswer">${"_".repeat(target.length)}</div>
      <div class="digit-buttons">${shuffle(target.split("")).map((digit, index) => `<button class="digit-button" data-digit="${digit}" data-index="${index}" type="button">${digit}</button>`).join("")}</div>
      <div class="game-controls"><button class="game-button secondary" id="orderReset" type="button">다시 배열</button><button class="game-button" id="orderCheck" type="button">확인</button></div>
      <p class="result-message" id="gameResult">누적 ${score}점</p></div></section>`;
    const display = document.querySelector("#orderAnswer");
    document.querySelectorAll("[data-digit]").forEach((button) => button.addEventListener("click", () => {
      if (button.disabled) return;
      answer += button.dataset.digit;
      button.disabled = true;
      button.style.opacity = ".3";
      display.textContent = answer.padEnd(target.length, "_");
    }));
    document.querySelector("#orderReset").addEventListener("click", nextRound);
    document.querySelector("#orderCheck").addEventListener("click", () => {
      if (answer === target) {
        score += target.length;
        beep(900);
        showToast(`정답! +${target.length}점`);
        round = Math.min(round + 1, 5);
        setTimeout(nextRound, 550);
      } else {
        setResult(`순서가 달라요. 정답은 ${target}`, "fail");
        beep(350);
      }
    });
  }
  nextRound();
}

function renderReaction() {
  let current = "-";
  let nextTargetIndex = 0;
  let score = 0;
  let mistakes = 0;
  let interval = null;
  const targets = ["3", "1", "4"];
  els.gameContent.innerHTML = `
    <section class="game-stage"><div><h3>3 → 1 → 4 순서로 잡으세요!</h3><p class="instruction">숫자가 빠르게 바뀝니다. 지금 필요한 숫자가 보이는 순간 큰 판을 누르세요.</p>
    <button class="big-display" id="reactionPad" type="button" style="width:100%;cursor:pointer">READY</button>
    <div class="game-controls"><button class="game-button pink" id="reactionStart" type="button">20초 시작</button></div>
    <p class="result-message" id="gameResult">다음 목표: 3 · 성공 0회 · 실수 0회</p></div></section>`;
  const pad = document.querySelector("#reactionPad");
  function updateStatus(message = "") {
    setResult(`${message}${message ? " · " : ""}다음 목표: ${targets[nextTargetIndex]} · 성공 ${score}회 · 실수 ${mistakes}회`);
  }
  document.querySelector("#reactionStart").addEventListener("click", () => {
    clearInterval(interval);
    score = 0; mistakes = 0; nextTargetIndex = 0;
    let ticks = 0;
    interval = setInterval(() => {
      current = String(Math.floor(Math.random() * 10));
      pad.textContent = current;
      ticks += 1;
      if (ticks >= 40) {
        clearInterval(interval); interval = null; pad.textContent = "끝!";
        updateStatus(`최종 ${score}회 성공`); beep(300,.35);
      }
    }, 500);
    updateStatus("시작");
  });
  pad.addEventListener("click", () => {
    if (!interval) return;
    if (current === targets[nextTargetIndex]) {
      nextTargetIndex += 1;
      beep(800);
      if (nextTargetIndex === targets.length) { score += 1; nextTargetIndex = 0; }
      updateStatus("정확해요");
    } else {
      mistakes += 1;
      beep(300);
      updateStatus("앗");
    }
  });
  gameCleanup = () => clearInterval(interval);
}

function renderDart() {
  let total = 0;
  let inside = 0;
  els.gameContent.innerHTML = `
    <section class="game-stage"><div class="dart-wrap">
      <div class="dart-board" id="dartBoard" aria-label="점을 찍는 정사각형 표적"><div class="dart-circle"></div></div>
      <div><h3>표적 아무 곳이나 빠르게 클릭!</h3><p class="instruction">원의 넓이÷정사각형의 넓이 ≈ π÷4라는 관계를 이용합니다.</p>
      <div class="stats-grid"><div class="stat-box"><span>전체 점</span><strong id="dartTotal">0</strong></div><div class="stat-box"><span>원 안의 점</span><strong id="dartInside">0</strong></div><div class="stat-box"><span>π 추정값</span><strong id="dartEstimate">-</strong></div><div class="stat-box"><span>실제값과 차이</span><strong id="dartError">-</strong></div></div>
      <div class="game-controls"><button class="game-button" id="dartAuto" type="button">무작위 20점</button><button class="game-button secondary" id="dartReset" type="button">초기화</button></div></div>
    </div></section>`;
  const board = document.querySelector("#dartBoard");
  function addPoint(x, y) {
    total += 1;
    const isInside = ((x - .5) ** 2 + (y - .5) ** 2) <= .25;
    if (isInside) inside += 1;
    const point = document.createElement("i");
    point.className = `dart-point ${isInside ? "" : "out"}`;
    point.style.left = `${x * 100}%`; point.style.top = `${y * 100}%`;
    board.appendChild(point);
    document.querySelector("#dartTotal").textContent = total;
    document.querySelector("#dartInside").textContent = inside;
    const estimate = 4 * inside / total;
    document.querySelector("#dartEstimate").textContent = estimate.toFixed(3);
    document.querySelector("#dartError").textContent = Math.abs(Math.PI - estimate).toFixed(3);
  }
  board.addEventListener("click", (event) => {
    const rect = board.getBoundingClientRect();
    addPoint((event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
  });
  document.querySelector("#dartAuto").addEventListener("click", () => { for (let i = 0; i < 20; i += 1) addPoint(Math.random(), Math.random()); });
  document.querySelector("#dartReset").addEventListener("click", renderDart);
}

function renderPointSimulation(type) {
  const isBuffon = type === "buffon";
  let total = 0;
  let hits = 0;
  els.gameContent.innerHTML = `
    <section class="game-stage"><div>
      <h3>${isBuffon ? "바늘이 선을 가로지를 확률은?" : "점이 많아질수록 π에 가까워질까요?"}</h3>
      <p class="instruction">${isBuffon ? "바늘 길이와 평행선 간격이 같을 때 π ≈ 2×전체÷교차 횟수입니다." : "사분원의 넓이 비율을 이용해 π ≈ 4×원 안의 점÷전체 점으로 계산합니다."}</p>
      <canvas class="simulation-canvas" id="simulationCanvas" width="720" height="220"></canvas>
      <div class="stats-grid"><div class="stat-box"><span>전체 시행</span><strong id="simTotal">0</strong></div><div class="stat-box"><span>${isBuffon ? "선과 교차" : "원 안의 점"}</span><strong id="simHits">0</strong></div><div class="stat-box"><span>π 추정값</span><strong id="simEstimate">-</strong></div><div class="stat-box"><span>실제값과 차이</span><strong id="simError">-</strong></div></div>
      <div class="game-controls"><button class="game-button" data-batch="10" type="button">+10회</button><button class="game-button" data-batch="100" type="button">+100회</button><button class="game-button pink" data-batch="1000" type="button">+1,000회</button><button class="game-button secondary" id="simReset" type="button">초기화</button></div>
    </div></section>`;
  const canvas = document.querySelector("#simulationCanvas");
  const ctx = canvas.getContext("2d");
  function background() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = "#75e4e8"; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle = "#24164f"; ctx.lineWidth = 2;
    if (isBuffon) {
      for (let x = 90; x < canvas.width; x += 90) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke(); }
    } else {
      ctx.fillStyle = "rgba(255,216,77,.65)"; ctx.beginPath(); ctx.arc(0,canvas.height,canvas.height, -Math.PI/2, 0); ctx.lineTo(0,canvas.height); ctx.fill(); ctx.stroke();
    }
  }
  background();
  function run(batch) {
    if (batch >= 1000 || total > 3000) background();
    for (let i = 0; i < batch; i += 1) {
      total += 1;
      if (isBuffon) {
        const centerX = Math.random() * canvas.width;
        const centerY = Math.random() * canvas.height;
        const angle = Math.random() * Math.PI;
        const half = 45;
        const x1 = centerX - Math.cos(angle) * half;
        const y1 = centerY - Math.sin(angle) * half;
        const x2 = centerX + Math.cos(angle) * half;
        const y2 = centerY + Math.sin(angle) * half;
        const crossed = Math.floor(x1 / 90) !== Math.floor(x2 / 90);
        if (crossed) hits += 1;
        if (batch <= 100) { ctx.strokeStyle = crossed ? "#ff5d8f" : "rgba(36,22,79,.35)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); }
      } else {
        const x = Math.random(); const y = Math.random();
        const hit = x*x + y*y <= 1;
        if (hit) hits += 1;
        if (batch <= 100) { ctx.fillStyle = hit ? "#ff5d8f" : "#24164f"; ctx.fillRect(x*canvas.height, canvas.height-y*canvas.height, 3,3); }
      }
    }
    const estimate = isBuffon ? (hits ? 2 * total / hits : 0) : 4 * hits / total;
    document.querySelector("#simTotal").textContent = total.toLocaleString();
    document.querySelector("#simHits").textContent = hits.toLocaleString();
    document.querySelector("#simEstimate").textContent = estimate ? estimate.toFixed(5) : "-";
    document.querySelector("#simError").textContent = estimate ? Math.abs(Math.PI-estimate).toFixed(5) : "-";
  }
  document.querySelectorAll("[data-batch]").forEach((button) => button.addEventListener("click", () => run(Number(button.dataset.batch))));
  document.querySelector("#simReset").addEventListener("click", () => renderPointSimulation(type));
}

function renderNumericQuiz(type) {
  let score = 0;
  let question;
  function makeQuestion() {
    const radius = 1 + Math.floor(Math.random() * 12);
    if (type === "circumference") question = { prompt: `반지름이 ${radius} cm인 원의 원주는?`, answer: 2 * 3.14 * radius, unit: "cm", formula: "2 × 3.14 × 반지름" };
    if (type === "area") question = { prompt: `반지름이 ${radius} cm인 원의 넓이는?`, answer: 3.14 * radius * radius, unit: "cm²", formula: "3.14 × 반지름 × 반지름" };
    if (type === "radius") {
      const useArea = Math.random() > .5;
      question = useArea
        ? { prompt: `넓이가 ${(3.14*radius*radius).toFixed(2)} cm²인 원의 반지름은?`, answer: radius, unit: "cm", formula: "√(넓이 ÷ 3.14)" }
        : { prompt: `원주가 ${(2*3.14*radius).toFixed(2)} cm인 원의 반지름은?`, answer: radius, unit: "cm", formula: "원주 ÷ (2 × 3.14)" };
    }
    els.gameContent.innerHTML = `
      <section class="game-stage"><div><h3>ROUND ${score + 1}</h3><p class="instruction">π = 3.14로 계산하고, 숫자만 입력하세요.</p>
      <div class="big-display" style="font-family:inherit;letter-spacing:-.03em">${question.prompt}</div>
      <div class="game-controls"><input class="game-input" id="numericAnswer" inputmode="decimal" placeholder="정답 입력" /><button class="game-button" id="numericCheck" type="button">정답 확인</button></div>
      <p class="result-message" id="gameResult">현재 ${score}문제 연속 정답</p></div></section>`;
    const input = document.querySelector("#numericAnswer");
    const check = () => {
      const value = Number(input.value.replace(",", "."));
      if (Number.isFinite(value) && Math.abs(value-question.answer) < .011) {
        score += 1; beep(900); showToast(`정답! ${question.answer.toFixed(2).replace(/\.00$/, "")} ${question.unit}`); setTimeout(makeQuestion,550);
      } else {
        setResult(`다시 계산해 보세요. 힌트: ${question.formula}`, "fail"); beep(350);
      }
    };
    document.querySelector("#numericCheck").addEventListener("click", check);
    input.addEventListener("keydown", (event) => { if (event.key === "Enter") check(); });
    input.focus();
  }
  makeQuestion();
}

function renderFraction() {
  const fractions = [
    { text: "22 / 7", value: 22/7 }, { text: "333 / 106", value: 333/106 }, { text: "355 / 113", value: 355/113 },
    { text: "201 / 64", value: 201/64 }, { text: "104348 / 33215", value: 104348/33215 }, { text: "3 / 1", value: 3 }
  ];
  let score = 0;
  function question() {
    const pair = shuffle(fractions).slice(0,2);
    const answer = Math.abs(pair[0].value-Math.PI) < Math.abs(pair[1].value-Math.PI) ? pair[0] : pair[1];
    els.gameContent.innerHTML = `
      <section class="game-stage"><div><h3>어느 분수가 π에 더 가까울까요?</h3><p class="instruction">두 분수를 소수로 바꾸거나 교차 계산해 비교하세요.</p>
      <div class="choice-grid">${pair.map((item) => `<button class="choice-button" data-fraction="${item.text}" type="button"><strong style="font-size:25px">${item.text}</strong><br><small>≈ ${item.value.toFixed(6)}</small></button>`).join("")}</div>
      <p class="result-message" id="gameResult">연속 ${score}문제 정답</p></div></section>`;
    document.querySelectorAll("[data-fraction]").forEach((button) => button.addEventListener("click", () => {
      if (button.dataset.fraction === answer.text) { score += 1; beep(900); showToast(`정답! 오차 ${Math.abs(answer.value-Math.PI).toFixed(8)}`); setTimeout(question,550); }
      else { setResult(`더 가까운 값은 ${answer.text}입니다.`, "fail"); beep(350); }
    }));
  }
  question();
}

function renderPolygon() {
  els.gameContent.innerHTML = `
    <section class="game-stage"><div><h3>다각형이 원에 가까워지는 순간</h3><p class="instruction">반지름 1인 원의 안쪽·바깥쪽 정다각형 둘레의 절반으로 π의 아래·위 경계를 구합니다.</p>
    <div class="big-display" id="polygonDisplay" style="font-family:inherit;font-size:25px;line-height:1.7;letter-spacing:0"></div>
    <div class="game-controls" style="flex-direction:column"><label for="polygonSides"><strong>변의 수: <span id="sideLabel">6</span></strong></label><input id="polygonSides" type="range" min="6" max="192" step="6" value="6" style="width:min(520px,100%)" /></div>
    <p class="result-message" id="gameResult">변을 늘려 두 값 사이의 간격을 좁혀 보세요.</p></div></section>`;
  const slider = document.querySelector("#polygonSides");
  function update() {
    const n = Number(slider.value);
    const lower = n * Math.sin(Math.PI/n);
    const upper = n * Math.tan(Math.PI/n);
    document.querySelector("#sideLabel").textContent = n;
    document.querySelector("#polygonDisplay").innerHTML = `<b>${lower.toFixed(8)}</b> &lt; π &lt; <b>${upper.toFixed(8)}</b><br><small>경계 사이 간격 ${Math.abs(upper-lower).toFixed(8)}</small>`;
  }
  slider.addEventListener("input", update); update();
}

const factQuestions = [
  ["π는 원의 둘레를 지름으로 나눈 값이다.", true, "모든 원에서 원주÷지름은 같은 값 π가 됩니다."],
  ["π는 정확히 22/7과 같다.", false, "22/7은 π에 가까운 유리수 근삿값입니다."],
  ["π의 소수는 끝없이 이어지고 반복 주기가 없다.", true, "π는 무리수입니다."],
  ["파이데이는 3월 14일이다.", true, "미국식 날짜 표기 3/14에서 시작되었습니다."],
  ["반지름이 2배가 되면 원의 넓이도 2배가 된다.", false, "넓이는 반지름의 제곱에 비례하므로 4배가 됩니다."],
  ["π는 3보다 크고 4보다 작다.", true, "π ≈ 3.141592…입니다."],
  ["원주율은 원의 크기에 따라 달라진다.", false, "원의 크기와 관계없이 원주÷지름은 일정합니다."],
  ["π는 무리수이면서 초월수이다.", true, "정수 계수 다항식의 근도 될 수 없는 초월수입니다."]
];

function renderFacts() {
  let index = 0; let score = 0;
  function next() {
    const [text, answer, explanation] = factQuestions[index];
    els.gameContent.innerHTML = `
      <section class="game-stage"><div><h3>문제 ${index+1} / ${factQuestions.length}</h3><p class="instruction">문장이 맞으면 O, 틀리면 X를 선택하세요.</p>
      <div class="big-display" style="font-family:inherit;font-size:clamp(23px,4vw,38px);letter-spacing:-.03em">${text}</div>
      <div class="choice-grid"><button class="choice-button" data-fact="true" type="button" style="font-size:32px">O</button><button class="choice-button" data-fact="false" type="button" style="font-size:32px">X</button></div>
      <p class="result-message" id="gameResult">현재 ${score}점</p></div></section>`;
    document.querySelectorAll("[data-fact]").forEach((button) => button.addEventListener("click", () => {
      const correct = String(answer) === button.dataset.fact;
      if (correct) { score += 1; beep(900); } else beep(350);
      showToast(`${correct ? "정답" : "아쉬워요"}! ${explanation}`);
      index += 1;
      if (index < factQuestions.length) setTimeout(next, 900);
      else setTimeout(() => {
        els.gameContent.innerHTML = `<section class="game-stage"><div><div class="big-display">${score} / ${factQuestions.length}</div><h3 style="margin-top:25px">파이 팩트 퀴즈 완료!</h3><p class="instruction">${score >= 7 ? "원주율 박사로 인정합니다!" : "틀린 설명을 다시 읽고 한 번 더 도전해 보세요."}</p><button class="game-button" id="factsRestart" type="button">다시 도전</button></div></section>`;
        document.querySelector("#factsRestart").addEventListener("click", () => { index = 0; score = 0; next(); });
      }, 900);
    }));
  }
  next();
}

function renderBingo() {
  function createCard() {
    const numbers = [];
    for (let i = 0; i < 24; i += 1) {
      const start = Math.floor(Math.random() * (PI_DIGITS.length - 2));
      numbers.push(PI_DIGITS.slice(start,start+2));
    }
    numbers.splice(12,0,"π");
    document.querySelector("#bingoCard").innerHTML = numbers.map((number,index) => `<div class="bingo-cell ${index===12 ? "free" : ""}">${number}</div>`).join("");
  }
  els.gameContent.innerHTML = `
    <section class="game-stage"><div><h3>원주율 속 두 자리 수 빙고</h3><p class="instruction">진행자는 원주율을 앞에서부터 두 자리씩 읽습니다. 카드에서 같은 수를 찾아 표시하고 먼저 2줄을 완성하면 빙고!</p>
    <div class="bingo-card" id="bingoCard"></div>
    <div class="game-controls"><button class="game-button" id="newBingo" type="button">새 카드</button><button class="game-button secondary" id="printBingo" type="button">인쇄하기</button></div><p class="result-message" id="gameResult">가운데 π 칸은 자유 칸입니다.</p></div></section>`;
  createCard();
  document.querySelector("#newBingo").addEventListener("click", createCard);
  document.querySelector("#printBingo").addEventListener("click", () => window.print());
}

function renderPhysical(mission) {
  els.gameContent.innerHTML = `
    <section class="game-stage"><div>
      <h3>교실에서 바로 운영하는 활동</h3><p class="instruction">준비물을 확인하고 규칙을 화면에 띄운 뒤, 아래 공용 타이머와 팀 점수판을 사용하세요.</p>
      <div class="rule-layout">
        <div class="rule-box" style="--game-bg:${CATEGORY_META[mission.category].color}"><h3>진행 방법</h3><ol>${(mission.rules || []).map((rule) => `<li>${rule}</li>`).join("")}</ol></div>
        <div class="rule-box" style="--game-bg:#fff0a6"><h3>추천 점수</h3><p style="margin:0;color:#5f5478;font-size:14px;font-weight:700;line-height:1.7">${mission.scoring || "참가 5점 · 성공 10점"}</p><div class="prep-list"><span>⏱ ${mission.time}</span>${mission.supplies.split(",").map((item) => `<span>✓ ${item.trim()}</span>`).join("")}</div></div>
      </div>
    </div></section>`;
}

function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

document.querySelector("#addTeamButton").addEventListener("click", () => {
  if (state.teams.length >= 6) return showToast("팀은 최대 6개까지 만들 수 있어요.");
  const index = state.teams.length;
  state.teams.push({ name: `${index + 1}팀`, score: 0, color: TEAM_COLORS[index] });
  saveState(); renderTeams();
});

document.querySelector("#resetBoardButton").addEventListener("click", () => {
  if (!window.confirm("모든 팀 점수와 완료 기록을 초기화할까요?")) return;
  state.teams.forEach((team) => { team.score = 0; });
  state.completed = [];
  saveState(); renderTeams(); renderMissions(); showToast("점수와 완료 기록을 초기화했습니다.");
});

document.querySelectorAll("[data-category]").forEach((button) => button.addEventListener("click", () => {
  activeCategory = button.dataset.category;
  document.querySelectorAll("[data-category]").forEach((item) => item.classList.toggle("is-active", item === button));
  renderMissions();
}));

els.searchInput.addEventListener("input", renderMissions);
document.querySelector("#randomMissionButton").addEventListener("click", () => {
  const pool = missions.filter((mission) => !state.completed.includes(mission.id));
  const mission = (pool.length ? pool : missions)[Math.floor(Math.random() * (pool.length || missions.length))];
  showToast(`오늘의 행운 종목: ${mission.title}`);
  setTimeout(() => openMission(mission.id), 500);
});

document.querySelector("#soundButton").addEventListener("click", (event) => {
  state.sound = !state.sound; saveState();
  event.currentTarget.textContent = state.sound ? "소리 켬" : "소리 끔";
  event.currentTarget.setAttribute("aria-pressed", String(state.sound));
  if (state.sound) beep();
});

document.querySelector("#soundButton").textContent = state.sound ? "소리 켬" : "소리 끔";
document.querySelector("#soundButton").setAttribute("aria-pressed", String(state.sound));
document.querySelector("#fullscreenButton").addEventListener("click", async () => {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  } catch (_) { showToast("이 브라우저에서는 전체 화면을 사용할 수 없어요."); }
});
document.querySelector("#showGuideButton").addEventListener("click", () => document.querySelector("#guideDialog").showModal());
document.querySelector("#closeGuideButton").addEventListener("click", () => document.querySelector("#guideDialog").close());
document.querySelector("#guideStartButton").addEventListener("click", () => { document.querySelector("#guideDialog").close(); document.querySelector("#missions").scrollIntoView(); });
document.querySelector("#closeDialogButton").addEventListener("click", closeMission);
els.gameDialog.addEventListener("click", (event) => { if (event.target === els.gameDialog) closeMission(); });
document.querySelector("#timerMinusButton").addEventListener("click", () => { timerSeconds = Math.max(0,timerSeconds-10); updateTimer(); });
document.querySelector("#timerPlusButton").addEventListener("click", () => { timerSeconds = Math.min(5990,timerSeconds+10); updateTimer(); });
els.timerToggle.addEventListener("click", toggleTimer);
document.querySelector("#addFiveButton").addEventListener("click", () => addScore(5));
document.querySelector("#addTenButton").addEventListener("click", () => addScore(10));
document.querySelector("#completeMissionButton").addEventListener("click", () => {
  if (!currentMission) return;
  const isCompleted = state.completed.includes(currentMission.id);
  state.completed = isCompleted ? state.completed.filter((id) => id !== currentMission.id) : [...state.completed, currentMission.id];
  saveState(); renderMissions();
  showToast(isCompleted ? "완료 표시를 취소했습니다." : `${currentMission.title} 완료!`);
  if (!isCompleted) beep(980,.18);
});

renderTeams();
renderMissions();
updateTimer();
