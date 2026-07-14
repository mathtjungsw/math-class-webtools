const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const scenarios = [
  { id: "exam", icon: "📝", title: "수학 시험 점수", note: "전교생의 평균 점수 추정", mean: 70, sd: 12, shape: "normal", unit: "점", population: 1000, mission: 3 },
  { id: "lunch", icon: "🍱", title: "급식 만족도", note: "학생 전체의 만족도 조사", mean: 76, sd: 15, shape: "uniform", unit: "점", population: 1200, mission: 4 },
  { id: "commute", icon: "🚌", title: "통학 시간", note: "우리 학교의 평균 통학 시간", mean: 32, sd: 11, shape: "skewed", unit: "분", population: 800, mission: 3 },
  { id: "snack", icon: "🍪", title: "과자 봉지 무게", note: "공장 제품의 평균 무게 검사", mean: 52, sd: 5, shape: "normal", unit: "g", population: 2000, mission: 1.5 },
  { id: "game", icon: "🎮", title: "게임 미션 점수", note: "초보·고수 전체의 평균 점수", mean: 65, sd: 16, shape: "bimodal", unit: "점", population: 1500, mission: 4 },
];

const shapeLabels = { normal: "종 모양", skewed: "오른쪽 꼬리", uniform: "고른 모양", bimodal: "두 봉우리" };
const state = { scenario: scenarios[0], shape: "normal", population: [], sampleIndices: [], sampleMeans: [], intervals: [], rng: null, seed: 2026, actualMean: 0, actualSd: 0, lastSample: null };
let toastTimer;

function mulberry32(seed) {
  return function () {
    let t = seed += 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalRandom(rng) {
  const u = Math.max(rng(), 1e-9);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function mean(values) { return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1); }
function sd(values, center = mean(values)) { return Math.sqrt(values.reduce((sum, value) => sum + (value - center) ** 2, 0) / Math.max(values.length - 1, 1)); }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function format(value, digits = 1) { return Number.isFinite(value) ? value.toFixed(digits) : "—"; }

function renderScenarios() {
  $("#scenarioGrid").innerHTML = scenarios.map((scenario) => `<button class="scenario-card${scenario.id === state.scenario.id ? " active" : ""}" type="button" data-scenario="${scenario.id}"><span class="scenario-icon">${scenario.icon}</span><strong>${scenario.title}</strong><small>${scenario.note}</small><i>✓</i></button>`).join("");
  $$("[data-scenario]").forEach((button) => button.addEventListener("click", () => selectScenario(button.dataset.scenario)));
}

function selectScenario(id) {
  state.scenario = scenarios.find((scenario) => scenario.id === id) || scenarios[0];
  state.shape = state.scenario.shape;
  $("#populationRange").value = state.scenario.population;
  $("#meanRange").value = state.scenario.mean;
  $("#sdRange").value = state.scenario.sd;
  $("#methodSelect").value = "random";
  updateControlLabels();
  renderScenarios();
  rebuildPopulation(true);
  showToast(`${state.scenario.title} 모집단을 만들었어요.`);
}

function createPopulation() {
  const size = Number($("#populationRange").value);
  const targetMean = Number($("#meanRange").value);
  const targetSd = Number($("#sdRange").value);
  const raw = [];
  for (let i = 0; i < size; i += 1) {
    let z;
    if (state.shape === "skewed") z = -Math.log(Math.max(1e-9, 1 - state.rng())) - 1;
    else if (state.shape === "uniform") z = (state.rng() - 0.5) * Math.sqrt(12);
    else if (state.shape === "bimodal") z = normalRandom(state.rng) * 0.52 + (state.rng() < 0.52 ? -0.9 : 0.98);
    else z = normalRandom(state.rng);
    const cluster = Math.floor((i / size) * 4);
    z += (cluster - 1.5) * 0.09;
    raw.push(z);
  }
  const rawMean = mean(raw);
  const rawSd = sd(raw, rawMean) || 1;
  state.population = raw.map((value) => clamp(targetMean + ((value - rawMean) / rawSd) * targetSd, 0, 120));
  state.actualMean = mean(state.population);
  state.actualSd = sd(state.population, state.actualMean);
}

function rebuildPopulation(clear = true) {
  state.seed = clamp(Number($("#seedInput").value) || 2026, 1, 999999);
  $("#seedInput").value = state.seed;
  state.rng = mulberry32(state.seed);
  createPopulation();
  state.sampleIndices = [];
  state.lastSample = null;
  if (clear) { state.sampleMeans = []; state.intervals = []; }
  updateControlLabels();
  updateAll();
}

function candidatePool(method, requested) {
  const all = state.population.map((_, index) => index);
  if (method === "front") return all.slice(0, Math.max(requested, Math.floor(all.length * 0.3)));
  if (method === "high") {
    const sorted = [...all].sort((a, b) => state.population[b] - state.population[a]);
    return sorted.slice(0, Math.max(requested, Math.floor(sorted.length * 0.38)));
  }
  if (method === "cluster") {
    const clusterSize = Math.max(requested, Math.floor(all.length / 4));
    const start = Math.floor(state.rng() * Math.max(1, all.length - clusterSize + 1));
    return all.slice(start, start + clusterSize);
  }
  return all;
}

function drawSample(render = true) {
  const requested = Number($("#sampleRange").value);
  const replace = $("#replaceToggle").checked;
  const pool = candidatePool($("#methodSelect").value, requested);
  const picked = [];
  const available = [...pool];
  const count = replace ? requested : Math.min(requested, available.length);
  for (let i = 0; i < count; i += 1) {
    const position = Math.floor(state.rng() * (replace ? pool.length : available.length));
    picked.push(replace ? pool[position] : available.splice(position, 1)[0]);
  }
  const values = picked.map((index) => state.population[index]);
  const sampleMean = mean(values);
  const sampleSd = sd(values, sampleMean);
  const n = values.length;
  const fpc = !replace && n < state.population.length ? Math.sqrt((state.population.length - n) / (state.population.length - 1)) : 1;
  const se = (sampleSd / Math.sqrt(n)) * fpc;
  const confidence = Number($("#confidenceSelect").value);
  const z = confidence === 0.9 ? 1.645 : confidence === 0.99 ? 2.576 : 1.96;
  const interval = [sampleMean - z * se, sampleMean + z * se];
  const covers = interval[0] <= state.actualMean && interval[1] >= state.actualMean;
  state.sampleIndices = picked;
  state.lastSample = { values, mean: sampleMean, sd: sampleSd, se, interval, covers };
  state.sampleMeans.push(sampleMean);
  state.intervals.push(covers);
  if (render) updateAll();
  return state.lastSample;
}

function repeatSamples(count) {
  for (let i = 0; i < count; i += 1) drawSample(false);
  updateAll();
  showToast(`${count.toLocaleString("ko-KR")}회 표집을 완료했어요.`);
}

function updateControlLabels() {
  const population = Number($("#populationRange").value);
  const sample = Number($("#sampleRange").value);
  $("#populationOutput").textContent = `${population.toLocaleString("ko-KR")}명`;
  $("#sampleOutput").textContent = `${sample}명`;
  $("#sampleBadge").textContent = `n = ${sample}`;
  $("#meanOutput").textContent = Number($("#meanRange").value).toFixed(1);
  $("#sdOutput").textContent = Number($("#sdRange").value).toFixed(1);
  $("#populationSummary").textContent = `${population.toLocaleString("ko-KR")}명 · ${shapeLabels[state.shape]}`;
  $$("[data-size]").forEach((button) => button.classList.toggle("active", Number(button.dataset.size) === sample));
  $$("[data-shape]").forEach((button) => button.classList.toggle("active", button.dataset.shape === state.shape));
  $("#coverageTarget").textContent = `목표 ${Math.round(Number($("#confidenceSelect").value) * 100)}%`;
}

function updateAll() {
  updateStageText();
  renderPopulation();
  renderSample();
  renderHistogram();
  updateStats();
}

function updateStageText() {
  const unit = state.scenario.unit;
  $("#stageTitle").textContent = state.scenario.title;
  $("#truthValue").textContent = `${format(state.actualMean)}${unit}`;
  const values = state.population;
  $("#axisMin").textContent = `${format(Math.min(...values), 0)}${unit}`;
  $("#axisMax").textContent = `${format(Math.max(...values), 0)}${unit}`;
}

function prepareCanvas(canvas) {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(10, rect.width);
  const height = Math.max(10, rect.height);
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);
  return { ctx, width, height };
}

function renderPopulation() {
  const canvas = $("#populationCanvas");
  const { ctx, width, height } = prepareCanvas(canvas);
  ctx.clearRect(0, 0, width, height);
  const values = state.population;
  if (!values.length) return;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const selected = new Set(state.sampleIndices);
  const maxDots = Math.min(values.length, 950);
  const stride = Math.max(1, Math.floor(values.length / maxDots));
  const rows = Math.max(5, Math.floor((height - 24) / 11));
  for (let i = 0, visible = 0; i < values.length; i += stride, visible += 1) {
    const x = 12 + ((values[i] - min) / Math.max(max - min, 1)) * (width - 24);
    const row = (visible * 17 + Math.floor(values[i] * 3)) % rows;
    const y = height - 12 - row * 10;
    ctx.beginPath();
    ctx.arc(x, y, selected.has(i) ? 4.6 : 2.7, 0, Math.PI * 2);
    ctx.fillStyle = selected.has(i) ? "#ff765d" : "rgba(136,169,183,.56)";
    ctx.fill();
  }
  state.sampleIndices.forEach((index) => {
    if (index % stride === 0) return;
    const x = 12 + ((values[index] - min) / Math.max(max - min, 1)) * (width - 24);
    const y = 14 + (index * 19 % Math.max(20, height - 30));
    ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fillStyle = "#ff765d"; ctx.fill();
  });
}

function renderSample() {
  const sample = state.lastSample;
  if (!sample) {
    $("#sampleAvatars").innerHTML = "";
    $("#sampleMessage").textContent = "아직 표본을 뽑지 않았어요.";
    $("#sampleMean").textContent = $("#sampleError").textContent = $("#standardError").textContent = "—";
    $("#confidenceText").textContent = "표본을 뽑으면 신뢰구간이 나타납니다.";
    $("#confidenceBar").style.width = "0";
    $("#heroEstimate").textContent = "?";
    return;
  }
  const unit = state.scenario.unit;
  const shown = sample.values.slice(0, 12);
  $("#sampleAvatars").innerHTML = shown.map((value) => `<span>${format(value, 0)}</span>`).join("") + (sample.values.length > shown.length ? `<span>+${sample.values.length - shown.length}</span>` : "");
  $("#sampleMessage").textContent = `${sample.values.length}명을 뽑았어요. ${$("#methodSelect option:checked").textContent} 결과입니다.`;
  $("#sampleMean").textContent = `${format(sample.mean)}${unit}`;
  $("#heroEstimate").textContent = format(sample.mean);
  $("#sampleError").textContent = `${sample.mean >= state.actualMean ? "+" : ""}${format(sample.mean - state.actualMean)}${unit}`;
  $("#standardError").textContent = `${format(sample.se, 2)}${unit}`;
  const popMin = Math.min(...state.population), popMax = Math.max(...state.population), span = Math.max(popMax - popMin, 1);
  const left = clamp(((sample.interval[0] - popMin) / span) * 100, 0, 100);
  const right = clamp(((sample.interval[1] - popMin) / span) * 100, 0, 100);
  $("#confidenceBar").style.left = `${left}%`;
  $("#confidenceBar").style.width = `${Math.max(2, right - left)}%`;
  $("#confidenceBar").style.background = sample.covers ? "#36c69d" : "#ff765d";
  $("#confidenceTruth").style.left = `${clamp(((state.actualMean - popMin) / span) * 100, 0, 100)}%`;
  $("#confidenceText").textContent = `${Math.round(Number($("#confidenceSelect").value) * 100)}% 신뢰구간 ${format(sample.interval[0])} ~ ${format(sample.interval[1])}${unit} · ${sample.covers ? "모평균 포함 ✓" : "모평균 미포함"}`;
}

function renderHistogram() {
  const canvas = $("#histogramCanvas");
  const { ctx, width, height } = prepareCanvas(canvas);
  ctx.clearRect(0, 0, width, height);
  const values = state.sampleMeans;
  const expectedSe = state.actualSd / Math.sqrt(Number($("#sampleRange").value));
  const observedMin = values.length ? Math.min(...values) : state.actualMean - 3.5 * expectedSe;
  const observedMax = values.length ? Math.max(...values) : state.actualMean + 3.5 * expectedSe;
  const min = Math.min(observedMin, state.actualMean - 3.5 * expectedSe);
  const max = Math.max(observedMax, state.actualMean + 3.5 * expectedSe);
  const bins = Array(25).fill(0);
  values.forEach((value) => { const index = clamp(Math.floor(((value - min) / Math.max(max - min, .001)) * bins.length), 0, bins.length - 1); bins[index] += 1; });
  const maxCount = Math.max(...bins, 1);
  const plotTop = 20, plotBottom = height - 24, plotHeight = plotBottom - plotTop;
  ctx.strokeStyle = "rgba(143,174,191,.12)"; ctx.lineWidth = 1;
  for (let i = 0; i < 4; i += 1) { const y = plotTop + (plotHeight / 3) * i; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
  const gap = 2, barWidth = width / bins.length;
  bins.forEach((count, index) => { const barHeight = (count / maxCount) * plotHeight; ctx.fillStyle = count ? "#36c69d" : "rgba(54,198,157,.08)"; ctx.fillRect(index * barWidth + gap / 2, plotBottom - barHeight, Math.max(1, barWidth - gap), barHeight); });
  const meanX = ((state.actualMean - min) / Math.max(max - min, .001)) * width;
  ctx.setLineDash([5, 4]); ctx.strokeStyle = "#ffd76a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(meanX, 8); ctx.lineTo(meanX, plotBottom + 3); ctx.stroke(); ctx.setLineDash([]);
  $("#histMin").textContent = format(min);
  $("#histCenter").textContent = `μ = ${format(state.actualMean)}`;
  $("#histMax").textContent = format(max);
}

function updateStats() {
  const count = state.sampleMeans.length;
  $("#missionTitle").textContent = `오차 ${state.scenario.mission}${state.scenario.unit} 이내로 맞히기`;
  $("#trialCount").textContent = count.toLocaleString("ko-KR");
  if (!count) {
    $("#meansMean").textContent = $("#coverageRate").textContent = "—";
    $("#meansBias").textContent = "편향 확인 전";
    $("#missionStars").textContent = "☆ ☆ ☆";
    $("#insightText").textContent = "표본 크기와 추출 방법을 바꾸고 결과를 비교해 보세요.";
    return;
  }
  const avg = mean(state.sampleMeans);
  const bias = avg - state.actualMean;
  const coverage = state.intervals.filter(Boolean).length / count;
  $("#meansMean").textContent = format(avg);
  $("#meansBias").textContent = `모평균과 ${bias >= 0 ? "+" : ""}${format(bias)} 차이`;
  $("#coverageRate").textContent = `${format(coverage * 100, 1)}%`;
  const error = state.lastSample ? Math.abs(state.lastSample.mean - state.actualMean) : Infinity;
  const target = state.scenario.mission;
  const stars = error <= target ? 3 : error <= target * 2 ? 2 : error <= target * 3 ? 1 : 0;
  $("#missionStars").textContent = `${"★ ".repeat(stars)}${"☆ ".repeat(3 - stars)}`.trim();
  const method = $("#methodSelect").value;
  const n = Number($("#sampleRange").value);
  if (method !== "random") $("#insightText").textContent = `표본을 ${$("#methodSelect option:checked").textContent}(으)로 뽑자 평균 편향이 ${format(Math.abs(bias))}${state.scenario.unit} 나타났어요. 표본 수보다 뽑는 방법이 먼저입니다.`;
  else if (n >= 100) $("#insightText").textContent = `n=${n}에서는 표본평균들이 모평균 주변에 촘촘히 모여요. 표준오차가 약 ${format(state.actualSd / Math.sqrt(n), 2)}${state.scenario.unit}입니다.`;
  else $("#insightText").textContent = `공정하게 뽑은 ${count}개 표본의 평균은 모평균과 ${format(Math.abs(bias))}${state.scenario.unit} 차이예요. n을 키워 분포 폭을 비교해 보세요.`;
}

function showToast(message) {
  clearTimeout(toastTimer);
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 1800);
}

function randomChallenge() {
  const challenge = [
    { size: 10, method: "random", confidence: .95, text: "n=10으로 100회 반복해 분포 폭을 관찰하세요." },
    { size: 100, method: "random", confidence: .99, text: "n=100, 신뢰수준 99%에서 적중률을 확인하세요." },
    { size: 50, method: "high", confidence: .95, text: "큰 값 위주로 100회 뽑아 편향을 찾아보세요." },
    { size: 30, method: "cluster", confidence: .90, text: "한 집단만 뽑았을 때 추정이 흔들리는지 확인하세요." },
  ][Math.floor(Math.random() * 4)];
  $("#sampleRange").value = challenge.size;
  $("#methodSelect").value = challenge.method;
  $("#confidenceSelect").value = challenge.confidence;
  state.sampleMeans = []; state.intervals = []; state.lastSample = null; state.sampleIndices = [];
  updateControlLabels(); updateAll();
  $("#missionHint").textContent = challenge.text;
  showToast(`도전: ${challenge.text}`);
}

function bindEvents() {
  $("#populationRange").addEventListener("input", updateControlLabels);
  $("#sampleRange").addEventListener("input", () => { updateControlLabels(); state.sampleMeans = []; state.intervals = []; state.lastSample = null; state.sampleIndices = []; updateAll(); });
  $("#meanRange").addEventListener("input", updateControlLabels);
  $("#sdRange").addEventListener("input", updateControlLabels);
  $$("[data-size]").forEach((button) => button.addEventListener("click", () => { $("#sampleRange").value = button.dataset.size; $("#sampleRange").dispatchEvent(new Event("input")); }));
  $$("[data-shape]").forEach((button) => button.addEventListener("click", () => { state.shape = button.dataset.shape; updateControlLabels(); rebuildPopulation(true); }));
  $("#methodSelect").addEventListener("change", () => { state.sampleMeans = []; state.intervals = []; state.lastSample = null; state.sampleIndices = []; updateAll(); });
  $("#confidenceSelect").addEventListener("change", () => { state.sampleMeans = []; state.intervals = []; state.lastSample = null; state.sampleIndices = []; updateControlLabels(); updateAll(); });
  $("#replaceToggle").addEventListener("change", () => { state.sampleMeans = []; state.intervals = []; state.lastSample = null; state.sampleIndices = []; updateAll(); });
  $("#rebuildButton").addEventListener("click", () => { rebuildPopulation(true); showToast("새 모집단을 만들었어요."); });
  $("#shuffleSeed").addEventListener("click", () => { $("#seedInput").value = Math.floor(Math.random() * 999999) + 1; rebuildPopulation(true); });
  $("#drawButton").addEventListener("click", () => drawSample(true));
  $$("[data-repeat]").forEach((button) => button.addEventListener("click", () => repeatSamples(Number(button.dataset.repeat))));
  $("#clearButton").addEventListener("click", () => { state.sampleMeans = []; state.intervals = []; state.lastSample = null; state.sampleIndices = []; updateAll(); showToast("표집 기록을 지웠어요."); });
  $("#resetButton").addEventListener("click", () => { $("#sampleRange").value = 30; $("#confidenceSelect").value = .95; $("#replaceToggle").checked = false; $("#seedInput").value = 2026; selectScenario("exam"); });
  $("#challengeButton").addEventListener("click", randomChallenge);
  $("#guideButton").addEventListener("click", () => $("#guideDialog").showModal());
  $("#closeGuide").addEventListener("click", () => $("#guideDialog").close());
  $("#dialogStart").addEventListener("click", () => { $("#guideDialog").close(); $(".scenario-section").scrollIntoView({ behavior: "smooth" }); });
  $("#guideDialog").addEventListener("click", (event) => { if (event.target === $("#guideDialog")) $("#guideDialog").close(); });
  window.addEventListener("resize", () => { renderPopulation(); renderHistogram(); });
}

renderScenarios();
bindEvents();
updateControlLabels();
rebuildPopulation(true);
