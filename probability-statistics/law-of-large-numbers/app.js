const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const experiments = {
  coin: {
    title: "동전을 던져 보세요",
    events: [{ value: "heads", label: "앞면이 나온다" }, { value: "tails", label: "뒷면이 나온다" }],
    outcomes: ["앞면", "뒷면"],
  },
  dice: {
    title: "주사위를 굴려 보세요",
    events: [
      { value: "one", label: "1이 나온다" }, { value: "six", label: "6이 나온다" },
      { value: "even", label: "짝수가 나온다" }, { value: "fourPlus", label: "4 이상이 나온다" },
    ],
    outcomes: ["1", "2", "3", "4", "5", "6"],
  },
  cards: {
    title: "카드를 한 장 뽑아 보세요",
    events: [
      { value: "red", label: "빨간색 카드가 나온다" }, { value: "spade", label: "스페이드가 나온다" },
      { value: "ace", label: "에이스가 나온다" }, { value: "face", label: "그림 카드가 나온다" },
    ],
    outcomes: ["♠", "♥", "♦", "♣"],
  },
};

const state = {
  type: "coin", event: "heads", total: 0, success: 0, counts: [], history: [], trail: [],
  seed: 2026, rng: null, auto: false, showPercent: true, streak: 0, bestStreak: 0,
  milestones: {}, frame: null, lastTimestamp: 0,
};

function mulberry32(seed) {
  return function () {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function probability() {
  if (state.type === "coin") {
    const heads = Number($("#biasRange").value) / 100;
    return state.event === "heads" ? heads : 1 - heads;
  }
  if (state.type === "dice") return { one: 1 / 6, six: 1 / 6, even: 1 / 2, fourPlus: 1 / 2 }[state.event];
  return { red: 1 / 2, spade: 1 / 4, ace: 1 / 13, face: 3 / 13 }[state.event];
}

function formula() {
  const p = probability();
  const label = experiments[state.type].events.find((e) => e.value === state.event).label.replace("이 나온다", "").replace("가 나온다", "");
  const fractions = { "0.5": "1/2", "0.25": "1/4", [String(1 / 6)]: "1/6", [String(1 / 13)]: "4/52", [String(3 / 13)]: "12/52" };
  const value = state.type === "coin" && Number($("#biasRange").value) !== 50 ? `${(p * 100).toFixed(0)}/100` : (fractions[String(p)] || p.toFixed(2));
  return `P(${label}) = ${value}`;
}

function populateEvents() {
  const select = $("#eventSelect");
  select.innerHTML = experiments[state.type].events.map((event) => `<option value="${event.value}">${event.label}</option>`).join("");
  state.event = experiments[state.type].events[0].value;
  $("#stageTitle").textContent = experiments[state.type].title;
  $("#biasBlock").hidden = state.type !== "coin";
}

function setupObject(outcomeIndex = 0) {
  const object = $("#experimentObject");
  object.className = "experiment-object";
  if (state.type === "coin") {
    object.classList.add("coin-object");
    object.innerHTML = '<div class="coin-face front">앞</div><div class="coin-face back">뒤</div>';
    if (outcomeIndex === 1) object.classList.add("show-back");
  } else if (state.type === "dice") {
    object.classList.add("dice-object");
    renderDie(object, outcomeIndex + 1);
  } else {
    object.classList.add("card-object");
    renderCard(object, outcomeIndex);
  }
}

const dotPositions = { 1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9] };
function renderDie(object, face) {
  object.innerHTML = Array.from({ length: 9 }, (_, i) => dotPositions[face].includes(i + 1) ? '<i class="die-dot"></i>' : '<i></i>').join("");
}

function renderCard(object, suitIndex, rankIndex = 0) {
  const suit = experiments.cards.outcomes[suitIndex];
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const rank = ranks[rankIndex];
  object.classList.toggle("red", suitIndex === 1 || suitIndex === 2);
  object.innerHTML = `<span class="card-corner">${rank}<br>${suit}</span><span>${suit}</span>`;
}

function isSuccess(outcome, extra = 0) {
  if (state.type === "coin") return state.event === "heads" ? outcome === 0 : outcome === 1;
  if (state.type === "dice") return { one: outcome === 0, six: outcome === 5, even: (outcome + 1) % 2 === 0, fourPlus: outcome >= 3 }[state.event];
  return { red: outcome === 1 || outcome === 2, spade: outcome === 0, ace: extra === 0, face: extra >= 10 }[state.event];
}

function trial() {
  let outcome, extra = 0;
  if (state.type === "coin") outcome = state.rng() < Number($("#biasRange").value) / 100 ? 0 : 1;
  else if (state.type === "dice") outcome = Math.floor(state.rng() * 6);
  else { outcome = Math.floor(state.rng() * 4); extra = Math.floor(state.rng() * 13); }
  const success = isSuccess(outcome, extra);
  state.total += 1;
  state.counts[outcome] += 1;
  if (success) { state.success += 1; state.streak += 1; state.bestStreak = Math.max(state.bestStreak, state.streak); }
  else state.streak = 0;
  state.trail.push(success);
  if (state.trail.length > 60) state.trail.shift();
  const interval = state.total < 100 ? 1 : state.total < 1000 ? 5 : state.total < 10000 ? 50 : 250;
  if (state.total === 1 || state.total % interval === 0) state.history.push([state.total, state.success / state.total]);
  if ([100, 1000, 10000].includes(state.total)) state.milestones[state.total] = Math.abs(state.success / state.total - probability());
  if (state.history.length > 700) state.history = state.history.filter((_, i) => i % 2 === 0);
  return { outcome, extra, success };
}

function runTrials(amount, animate = true) {
  let result;
  for (let i = 0; i < amount; i += 1) result = trial();
  if (animate && result) animateResult(result);
  checkMilestones();
  updateAll();
}

function animateResult(result) {
  setupObject(result.outcome);
  const object = $("#experimentObject");
  if (state.type === "cards") renderCard(object, result.outcome, result.extra);
  requestAnimationFrame(() => object.classList.add("tossing"));
  const outcomeLabel = state.type === "cards" ? `${["A","2","3","4","5","6","7","8","9","10","J","Q","K"][result.extra]}${experiments.cards.outcomes[result.outcome]}` : experiments[state.type].outcomes[result.outcome];
  $("#resultCallout strong").textContent = outcomeLabel;
  $("#resultCallout small").textContent = result.success ? "관찰한 사건이 발생했어요!" : "이번에는 사건이 발생하지 않았어요";
  $("#resultCallout small").style.color = result.success ? "var(--green2)" : "var(--muted)";
}

function updateTheory() {
  const p = probability();
  $("#theoryPercent").textContent = `${(p * 100).toFixed(1)}%`;
  $("#theoryFormula").textContent = formula();
  $("#biasOutput").textContent = `${$("#biasRange").value}%`;
}

function updateAll() {
  const p = probability();
  const observed = state.total ? state.success / state.total : 0;
  const error = state.total ? Math.abs(observed - p) : null;
  $("#totalCount").textContent = state.total.toLocaleString("ko-KR");
  $("#successCount").textContent = state.success.toLocaleString("ko-KR");
  $("#relativeFrequency").textContent = state.total ? `${(observed * 100).toFixed(2)}%` : "—";
  $("#errorValue").textContent = state.total ? `${(error * 100).toFixed(2)}%p` : "—";
  $("#gaugeValue").textContent = state.total ? (error * 100).toFixed(2) : "—";
  const gaugeScore = error === null ? 0 : Math.max(0, Math.min(360, (1 - error / Math.max(p, .01)) * 360));
  $("#gaugeRing").style.background = `conic-gradient(var(--lime) ${gaugeScore}deg,#345861 ${gaugeScore}deg)`;
  $("#currentStreak").textContent = state.streak;
  $("#bestStreak").textContent = state.bestStreak;
  $("#chartEndLabel").textContent = state.total ? `${state.total.toLocaleString("ko-KR")}회` : "시행 횟수";
  updateErrorMessage(error);
  updateTrail();
  renderDistribution();
  drawConvergence();
  updateInsight(observed, p, error);
}

function updateErrorMessage(error) {
  if (error === null) $("#errorMessage").textContent = "첫 실험을 기다리고 있어요.";
  else if (state.total < 30) $("#errorMessage").textContent = "적은 횟수에서는 결과가 크게 흔들리는 것이 자연스러워요.";
  else if (error < .01) $("#errorMessage").textContent = "이론확률과 1%p 이내로 아주 가까워졌어요!";
  else if (error < .03) $("#errorMessage").textContent = "실험값이 이론확률 근처에서 움직이고 있어요.";
  else $("#errorMessage").textContent = "아직 차이가 보여요. 시행 횟수를 더 늘려 볼까요?";
}

function updateTrail() {
  const trail = $("#trialTrail");
  const empty = Math.max(0, 60 - state.trail.length);
  trail.innerHTML = `${'<i></i>'.repeat(empty)}${state.trail.map((success, i) => `<i class="${success ? "success" : ""} ${i === state.trail.length - 1 ? "latest" : ""}" title="${success ? "사건 발생" : "사건 미발생"}"></i>`).join("")}`;
}

function renderDistribution() {
  const names = experiments[state.type].outcomes;
  const total = Math.max(state.total, 1);
  const maxRate = Math.max(...state.counts.map((count) => count / total), 1 / names.length) * 1.14;
  $("#distributionChart").innerHTML = names.map((name, i) => {
    const rate = state.counts[i] / total;
    const expected = state.type === "coin" ? (i === 0 ? Number($("#biasRange").value) / 100 : 1 - Number($("#biasRange").value) / 100) : 1 / names.length;
    const height = state.total ? Math.max(1, rate / maxRate * 100) : 0;
    const tick = expected / maxRate * 100;
    const display = state.showPercent ? `${(rate * 100).toFixed(state.total > 999 ? 1 : 0)}%` : state.counts[i].toLocaleString("ko-KR");
    return `<div class="distribution-bar"><strong>${state.total ? display : "—"}</strong><div class="bar-track"><span class="expected-tick" style="bottom:${tick}%"></span><i style="height:${height}%"></i></div><span>${name}</span></div>`;
  }).join("");
}

function drawConvergence() {
  const canvas = $("#convergenceChart");
  const rect = canvas.getBoundingClientRect();
  if (!rect.width) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
  const ctx = canvas.getContext("2d"); ctx.scale(dpr, dpr);
  const w = rect.width, h = rect.height, pad = { l: 45, r: 15, t: 18, b: 23 };
  ctx.clearRect(0, 0, w, h); ctx.font = "9px Pretendard"; ctx.textAlign = "right"; ctx.textBaseline = "middle";
  [0, .25, .5, .75, 1].forEach((v) => {
    const y = pad.t + (1 - v) * (h - pad.t - pad.b);
    ctx.strokeStyle = "rgba(255,255,255,.09)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
    ctx.fillStyle = "#789699"; ctx.fillText(`${v * 100}%`, pad.l - 8, y);
  });
  const p = probability();
  const py = pad.t + (1 - p) * (h - pad.t - pad.b);
  ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = "#f4a781"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(pad.l, py); ctx.lineTo(w - pad.r, py); ctx.stroke(); ctx.restore();
  if (!state.history.length) return;
  const maxX = Math.max(state.total, 2);
  const xPos = (n) => pad.l + (Math.log10(Math.max(1, n)) / Math.log10(maxX)) * (w - pad.l - pad.r);
  const yPos = (v) => pad.t + (1 - v) * (h - pad.t - pad.b);
  ctx.beginPath();
  state.history.forEach(([n, v], i) => { const x = xPos(n), y = yPos(v); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
  ctx.strokeStyle = "#d9f28f"; ctx.lineWidth = 2.5; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke();
  const last = state.history[state.history.length - 1]; ctx.fillStyle = "#d9f28f"; ctx.beginPath(); ctx.arc(xPos(last[0]), yPos(last[1]), 4, 0, Math.PI * 2); ctx.fill();
}

function updateInsight(observed, p, error) {
  if (!state.total) {
    $("#countGap").textContent = "—"; $("#relativeError").textContent = "—";
    $("#insightSentence").textContent = "실험을 시작하면 두 종류의 오차를 비교해 드릴게요."; return;
  }
  const gap = state.success - state.total * p;
  $("#countGap").textContent = `${gap >= 0 ? "+" : ""}${gap.toFixed(1)}회`;
  $("#relativeError").textContent = `${(error / p * 100).toFixed(1)}%`;
  const direction = observed >= p ? "많이" : "적게";
  $("#insightSentence").textContent = `현재 사건은 기대보다 ${Math.abs(gap).toFixed(1)}회 ${direction} 발생했습니다. 횟수의 차이와 비율의 차이가 함께 어떻게 변하는지 관찰해 보세요.`;
}

function checkMilestones() {
  [100, 1000, 10000].forEach((n) => {
    const el = $(`[data-milestone="${n}"]`);
    if (state.milestones[n] !== undefined) { el.classList.add("done"); el.querySelector("b").textContent = `오차 ${(state.milestones[n] * 100).toFixed(1)}%p`; }
  });
}

function reset(showToast = false) {
  stopAuto();
  state.total = 0; state.success = 0; state.counts = Array(experiments[state.type].outcomes.length).fill(0);
  state.history = []; state.trail = []; state.streak = 0; state.bestStreak = 0; state.milestones = {};
  state.seed = Math.max(1, Number($("#seedInput").value) || 2026); state.rng = mulberry32(state.seed);
  $$("[data-milestone]").forEach((el) => { el.classList.remove("done"); el.querySelector("b").textContent = "대기"; });
  setupObject();
  $("#resultCallout strong").textContent = "—"; $("#resultCallout small").textContent = "실험을 시작해 보세요";
  updateTheory(); updateAll(); if (showToast) toast("실험 기록을 초기화했어요.");
}

const speeds = [10, 100, 500, 5000];
function autoLoop(timestamp) {
  if (!state.auto) return;
  const speed = speeds[Number($("#speedRange").value) - 1];
  const elapsed = Math.min(100, timestamp - (state.lastTimestamp || timestamp));
  const amount = Math.max(1, Math.round(speed * elapsed / 1000));
  runTrials(amount, speed <= 100);
  state.lastTimestamp = timestamp; state.frame = requestAnimationFrame(autoLoop);
}
function startAuto() {
  if (state.auto) return; state.auto = true; state.lastTimestamp = 0;
  $("#autoButton").classList.add("active"); $("#autoButton b").textContent = "일시 정지"; $("#autoButton .play-icon").textContent = "Ⅱ";
  $("#liveStatus").classList.add("running"); $("#liveStatus").lastChild.textContent = " 실행 중";
  state.frame = requestAnimationFrame(autoLoop);
}
function stopAuto() {
  state.auto = false; cancelAnimationFrame(state.frame);
  $("#autoButton").classList.remove("active"); $("#autoButton b").textContent = "연속 실험"; $("#autoButton .play-icon").textContent = "▶";
  $("#liveStatus").classList.remove("running"); $("#liveStatus").lastChild.textContent = state.total ? " 일시 정지" : " 준비";
}
function toast(message) { const el = $("#toast"); el.textContent = message; el.classList.add("show"); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove("show"), 1800); }

$$('[data-experiment]').forEach((button) => button.addEventListener("click", () => {
  $$('[data-experiment]').forEach((b) => b.classList.toggle("active", b === button)); state.type = button.dataset.experiment; populateEvents(); reset();
}));
$("#eventSelect").addEventListener("change", (e) => { state.event = e.target.value; reset(); });
$("#biasRange").addEventListener("input", () => reset());
$("#fairButton").addEventListener("click", () => { $("#biasRange").value = 50; reset(); });
$("#seedInput").addEventListener("change", () => reset());
$("#randomSeedButton").addEventListener("click", () => { $("#seedInput").value = Math.floor(Math.random() * 999999) + 1; reset(); toast("새 실험 번호를 만들었어요."); });
$$('[data-run]').forEach((button) => button.addEventListener("click", () => { stopAuto(); runTrials(Number(button.dataset.run)); }));
$("#autoButton").addEventListener("click", () => state.auto ? stopAuto() : startAuto());
$("#resetButton").addEventListener("click", () => reset(true));
$("#speedRange").addEventListener("input", () => $("#speedOutput").textContent = speeds[Number($("#speedRange").value) - 1].toLocaleString("ko-KR"));
$("#togglePercentButton").addEventListener("click", (e) => { state.showPercent = !state.showPercent; e.currentTarget.textContent = state.showPercent ? "횟수 보기" : "비율 보기"; renderDistribution(); });
$("#helpButton").addEventListener("click", () => $("#helpDialog").showModal());
$("#closeHelpButton").addEventListener("click", () => $("#helpDialog").close());
$("#dialogStartButton").addEventListener("click", () => $("#helpDialog").close());
$("#helpDialog").addEventListener("click", (e) => { if (e.target === $("#helpDialog")) $("#helpDialog").close(); });
window.addEventListener("keydown", (e) => { if (["INPUT", "SELECT"].includes(document.activeElement.tagName)) return; if (e.code === "Space") { e.preventDefault(); state.auto ? stopAuto() : startAuto(); } if (e.key.toLowerCase() === "r") reset(true); });
window.addEventListener("resize", drawConvergence);

populateEvents(); reset(); updateTrail();
