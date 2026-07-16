"use strict";

const L = window.AnomalyLabLogic;
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const scenarios = [
  {
    id: "quality", code: "Q-CHECK", icon: "QC", title: "물체 무게·길이 품질 검사", short: "공장 품질 검사",
    description: "생산 순서 속 무게와 길이의 흔들림", center: 100, featureCenter: 50, baseSd: 1.2,
    valueName: "무게", valueUnit: "g", featureName: "길이", featureUnit: "mm", timeName: "생산 순서",
  },
  {
    id: "sensor", code: "SENSOR", icon: "S↗", title: "시간에 따라 변하는 센서", short: "센서 측정값",
    description: "주기적 변동과 갑작스러운 튐", center: 20, featureCenter: 0, baseSd: 1.1,
    valueName: "센서값", valueUnit: "단위", featureName: "직전 변화량", featureUnit: "단위", timeName: "측정 시점",
  },
  {
    id: "count", code: "COUNT", icon: "∴", title: "자연 배경과 드문 계수 신호", short: "자연 신호 계수",
    description: "배경 신호 위로 드물게 나타나는 큰 계수", center: 12, featureCenter: 4, baseSd: 3.2,
    valueName: "계수", valueUnit: "회", featureName: "배경 지수", featureUnit: "점", timeName: "관측 구간",
  },
  {
    id: "transaction", code: "VIRTUAL", icon: "₩?", title: "가상 거래의 금액·시간·빈도", short: "가상 거래 패턴",
    description: "실제 개인정보가 아닌 가상 주문 이벤트", center: 60, featureCenter: 3, baseSd: 16,
    valueName: "가상 금액", valueUnit: "점", featureName: "10분당 빈도", featureUnit: "회", timeName: "이벤트 순서",
  },
];

const methods = {
  distance: { number: "01", name: "평균에서 고정 거리", hint: "평균과의 차이가 정해 둔 거리보다 큰지 봅니다.", note: "단위가 분명하지만 자료 규모가 바뀌면 같은 숫자를 그대로 쓰기 어렵습니다." },
  zscore: { number: "02", name: "z점수·표준편차", hint: "평균에서 몇 표준편차 이상 떨어졌는지 비교합니다.", note: "단위가 달라도 비교하기 쉽지만 평균과 표준편차가 극단값에 영향을 받습니다." },
  iqr: { number: "03", name: "사분위범위(IQR)", hint: "가운데 50%의 폭을 이용해 아래·위 울타리 밖을 찾습니다.", note: "극단값의 영향을 덜 받지만 작은 표본이나 동일값이 많을 때 울타리가 좁아집니다." },
  moving: { number: "04", name: "이동평균·최근 구간", hint: "전체 대신 바로 앞의 최근 구간과 비교해 갑작스러운 변화를 찾습니다.", note: "시간 흐름을 반영하지만 구간 크기에 따라 느리거나 민감해질 수 있습니다." },
  twoFeature: { number: "05", name: "두 특성 함께 보기", hint: "값과 두 번째 특성의 표준화 거리를 함께 계산합니다.", note: "한 특성만 보면 놓칠 패턴을 찾지만 두 특성의 관계를 단순화한 경계입니다." },
};

const thresholdConfig = {
  zscore: { min: .25, max: 5, step: .05, defaultValue: 2, label: "|z| 임계값" },
  iqr: { min: 0, max: 3, step: .05, defaultValue: 1.5, label: "IQR 울타리 배수 k" },
  moving: { min: .25, max: 6, step: .05, defaultValue: 2, label: "최근 구간 |z| 임계값" },
  twoFeature: { min: .25, max: 6, step: .05, defaultValue: 2.5, label: "두 특성 거리 임계값" },
};

const missionRules = {
  balanced: { fp: 3, fn: 4, label: "균형 잡힌 검사", check: (metrics) => metrics.recall >= .7 && metrics.falseAlarmRate <= .25, target: "재현율 70% 이상·거짓 경보율 25% 이하" },
  safety: { fp: 1, fn: 12, label: "놓침을 줄여라", check: (metrics) => metrics.recall >= .9, target: "재현율 90% 이상" },
  review: { fp: 10, fn: 3, label: "검사 자원이 부족하다", check: (metrics) => metrics.falseAlarmRate <= .08, target: "거짓 경보율 8% 이하" },
};

const state = {
  scenarioId: "quality",
  data: [],
  originalData: [],
  model: null,
  plot: "time",
  method: "zscore",
  thresholds: { distance: null, zscore: 2, iqr: 1.5, moving: 2, twoFeature: 2.5 },
  windowSize: 8,
  manualIds: new Set(),
  revealed: false,
  selectedIndex: 0,
  focusedIndex: 0,
  hitTargets: [],
  costs: { fp: 2, fn: 8 },
  mission: "balanced",
  snapshots: { a: null, b: null },
  source: "synthetic",
  labelsProvided: true,
};

let toastTimer;
let resizeFrame;

function currentScenario() {
  return scenarios.find((scenario) => scenario.id === state.scenarioId) || scenarios[0];
}

function mulberry32(seed) {
  let value = seed >>> 0;
  return function random() {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalGenerator(random) {
  let spare = null;
  return function normal() {
    if (spare !== null) {
      const result = spare;
      spare = null;
      return result;
    }
    const u = Math.max(random(), 1e-12);
    const v = random();
    const radius = Math.sqrt(-2 * Math.log(u));
    spare = radius * Math.sin(2 * Math.PI * v);
    return radius * Math.cos(2 * Math.PI * v);
  };
}

function shuffle(values, random) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function settings() {
  return {
    sampleSize: Number($("#sampleSizeRange").value),
    baseRate: Number($("#baseRateRange").value),
    noise: Number($("#noiseRange").value),
    signal: Number($("#signalRange").value),
    shift: Number($("#shiftRange").value),
    seed: L.clamp(Math.trunc(Number($("#seedInput").value) || 11011), 1, 2147483646),
  };
}

function synthesizeData() {
  const scenario = currentScenario();
  const config = settings();
  $("#seedInput").value = config.seed;
  const random = mulberry32(config.seed);
  const normal = normalGenerator(random);
  const count = config.sampleSize;
  const anomalyCount = L.clamp(Math.round(count * config.baseRate / 100), 0, count);
  const eligible = Array.from({ length: count }, (_, index) => index).filter((index) => index > 2);
  const anomalyIndices = new Set(shuffle(eligible, random).slice(0, anomalyCount));
  const data = [];
  let previousValue = scenario.center;

  for (let index = 0; index < count; index += 1) {
    const isAnomaly = anomalyIndices.has(index);
    const shifted = index >= Math.floor(count * .65) ? config.shift * scenario.baseSd : 0;
    const noiseScale = scenario.baseSd * config.noise;
    const direction = random() < .5 ? -1 : 1;
    const anomalyEffect = isAnomaly ? direction * scenario.baseSd * config.signal * (.8 + random() * .45) : 0;
    let value;
    let feature2;

    if (scenario.id === "quality") {
      value = scenario.center + shifted + normal() * noiseScale + anomalyEffect;
      feature2 = scenario.featureCenter + .32 * (value - scenario.center) + normal() * Math.max(.12, noiseScale * .55);
      if (isAnomaly && index % 3 === 0) feature2 += direction * config.signal * .65;
    } else if (scenario.id === "sensor") {
      const cycle = Math.sin(index / 9) * scenario.baseSd * .7;
      value = scenario.center + cycle + shifted + normal() * noiseScale * .7 + anomalyEffect;
      feature2 = index === 0 ? 0 : value - previousValue;
    } else if (scenario.id === "count") {
      const countNoise = normal() * noiseScale;
      value = Math.max(0, Math.round(scenario.center + shifted + countNoise + (isAnomaly ? Math.abs(anomalyEffect) * 1.35 : 0)));
      feature2 = Math.max(0, scenario.featureCenter + normal() * Math.max(.25, config.noise) + (isAnomaly && index % 2 === 0 ? config.signal * .4 : 0));
    } else {
      const hourWave = 10 * Math.sin(index / 13);
      value = Math.max(1, scenario.center + hourWave + shifted + normal() * noiseScale + (isAnomaly ? Math.abs(anomalyEffect) * 1.25 : 0));
      feature2 = Math.max(0, scenario.featureCenter + normal() * Math.max(.3, config.noise) + (isAnomaly && index % 2 === 1 ? config.signal * .65 : 0));
    }

    value = Number(value.toFixed(scenario.id === "count" ? 0 : 2));
    feature2 = Number(feature2.toFixed(2));
    data.push({ id: `${scenario.id}-${config.seed}-${index + 1}`, index, time: index + 1, value, feature2, isAnomaly });
    previousValue = value;
  }
  return data;
}

function rebuildModel({ preserveDistance = false } = {}) {
  state.model = L.prepareModel(state.data, state.windowSize);
  const spread = Math.max(state.model.valueStats.sd, (state.model.valueStats.max - state.model.valueStats.min) / 8, .1);
  if (!preserveDistance || !Number.isFinite(state.thresholds.distance)) state.thresholds.distance = Number((spread * 2).toFixed(2));
  updateThresholdControl();
}

function generateData({ announce = true } = {}) {
  state.data = synthesizeData();
  state.originalData = state.data.map((point) => ({ ...point }));
  state.source = "synthetic";
  state.labelsProvided = true;
  state.manualIds.clear();
  state.revealed = false;
  state.selectedIndex = 0;
  state.focusedIndex = 0;
  state.snapshots = { a: null, b: null };
  rebuildModel();
  syncRevealState();
  updateAll();
  if (announce) showToast(`시드 ${settings().seed}의 합성 자료를 만들었습니다.`);
}

function renderScenarios() {
  $("#scenarioGrid").innerHTML = scenarios.map((scenario) => `
    <button class="scenario-card${scenario.id === state.scenarioId ? " active" : ""}" type="button" data-scenario="${scenario.id}">
      <span class="scenario-icon">${scenario.icon}</span><strong>${scenario.short}</strong><small>${scenario.description}</small><i>✓</i>
    </button>`).join("");
  $$('[data-scenario]').forEach((button) => button.addEventListener("click", () => {
    state.scenarioId = button.dataset.scenario;
    state.source = "synthetic";
    renderScenarios();
    generateData({ announce: false });
    showToast(`${currentScenario().short} 상황으로 바꾸었습니다.`);
  }));
}

function updateParameterOutputs() {
  $("#sampleSizeOutput").textContent = `${Number($("#sampleSizeRange").value)}개`;
  $("#baseRateOutput").textContent = `${Number($("#baseRateRange").value)}%`;
  $("#noiseOutput").textContent = Number($("#noiseRange").value).toFixed(1);
  $("#signalOutput").textContent = Number($("#signalRange").value).toFixed(1);
  const shift = Number($("#shiftRange").value);
  $("#shiftOutput").textContent = `${shift > 0 ? "+" : ""}${shift.toFixed(2)}σ`;
}

function scenarioText() {
  const scenario = currentScenario();
  if (state.source === "csv") {
    return { kicker: "CSV · LOCAL", title: "불러온 수업용 CSV", subtitle: "불러온 개별 관측값과 두 번째 특성을 비교하세요.", x: "시간·순서", y: "값", feature: "두 번째 특성" };
  }
  const subtitles = {
    quality: "생산 순서에 따른 무게의 흔들림과 길이의 관계를 살펴보세요.",
    sensor: "주기 변화·후반부 이동과 순간적인 튐을 구분해 보세요.",
    count: "자연 배경 계수의 흔들림과 드문 큰 신호를 구분해 보세요.",
    transaction: "실제 사람이 아닌 가상 이벤트의 금액과 빈도 패턴을 살펴보세요.",
  };
  return { kicker: `${scenario.code} · SYNTHETIC`, title: scenario.title, subtitle: subtitles[scenario.id], x: scenario.timeName, y: `${scenario.valueName}(${scenario.valueUnit})`, feature: `${scenario.featureName}(${scenario.featureUnit})` };
}

function updateDataText() {
  const scenario = currentScenario();
  const text = scenarioText();
  $("#plotKicker").textContent = text.kicker;
  $("#dataTitle").textContent = text.title;
  $("#dataSubtitle").textContent = text.subtitle;
  $("#featureNames").textContent = state.source === "csv" ? "값 · 두 번째 특성" : `${scenario.valueName} · ${scenario.featureName}`;
  $("#dataId").textContent = state.source === "csv" ? `CSV-${state.data.length}` : `${scenario.code}-${settings().seed}`;
  $("#truthState").textContent = state.revealed ? "공개됨" : "숨김";
  $("#truthBadge").textContent = state.revealed ? "정답 라벨 공개됨" : "정답 라벨 숨김";
  $("#truthBadge").classList.toggle("revealed", state.revealed);
  $("#xAxisLabel").textContent = state.plot === "scatter" ? text.feature : state.plot === "histogram" ? text.y : text.x;
  $("#yAxisLabel").textContent = state.plot === "histogram" ? "빈도" : text.y;
}

function distanceConfig() {
  const stats = state.model ? state.model.valueStats : { sd: 1, max: 1, min: 0 };
  const max = Math.max(stats.sd * 5, (stats.max - stats.min) * .75, 1);
  return { min: 0, max: Number(max.toFixed(2)), step: Math.max(.01, Number((max / 120).toFixed(2))), defaultValue: stats.sd * 2, label: `평균과 거리 (${currentScenario().valueUnit || "단위"})` };
}

function updateThresholdControl() {
  const config = state.method === "distance" ? distanceConfig() : thresholdConfig[state.method];
  const range = $("#thresholdRange");
  range.min = config.min;
  range.max = config.max;
  range.step = config.step;
  if (!Number.isFinite(state.thresholds[state.method])) state.thresholds[state.method] = config.defaultValue;
  state.thresholds[state.method] = L.clamp(state.thresholds[state.method], Number(config.min), Number(config.max));
  range.value = state.thresholds[state.method];
  $("#thresholdLabel").textContent = config.label;
  $("#thresholdOutput").textContent = formatThreshold(state.thresholds[state.method]);
  $("#methodHint").textContent = methods[state.method].hint;
  $("#windowControl").hidden = state.method !== "moving";
  $("#windowRange").value = state.windowSize;
  $("#windowOutput").textContent = `${state.windowSize}개`;
}

function formatThreshold(value) {
  if (!Number.isFinite(value)) return "—";
  return Math.abs(value) >= 10 ? value.toFixed(1) : value.toFixed(2);
}

function fmt(value, digits = 2) {
  if (value === Infinity) return "∞";
  if (value === -Infinity) return "−∞";
  if (!Number.isFinite(value)) return "—";
  return Number(value).toLocaleString("ko-KR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function percent(value) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "—";
}

function currentPredictions(method = state.method) {
  if (!state.data.length) return [];
  return L.predict(state.data, method, state.thresholds[method], { model: method === state.method ? state.model : L.prepareModel(state.data, state.windowSize), windowSize: state.windowSize });
}

function currentEvaluation(method = state.method) {
  const predictions = currentPredictions(method);
  return L.evaluate(state.data.map((point) => point.isAnomaly), predictions, state.costs);
}

function ruleDescription(method = state.method, threshold = state.thresholds[method]) {
  if (method === "distance") return `|값 − 평균| > ${formatThreshold(threshold)}`;
  if (method === "zscore") return `|z| > ${formatThreshold(threshold)}`;
  if (method === "iqr") return `Q1 − ${formatThreshold(threshold)}×IQR 밖`;
  if (method === "moving") return `최근 ${state.windowSize}개 기준 |z| > ${formatThreshold(threshold)}`;
  return `√(z₁² + z₂²) > ${formatThreshold(threshold)}`;
}

function prepareCanvas(canvas) {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(40, rect.width);
  const height = Math.max(40, rect.height);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const context = canvas.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { context, width, height };
}

function scale(value, domainMin, domainMax, rangeMin, rangeMax) {
  if (domainMax === domainMin) return (rangeMin + rangeMax) / 2;
  return rangeMin + (value - domainMin) / (domainMax - domainMin) * (rangeMax - rangeMin);
}

function paddedExtent(values, ratio = .08) {
  const clean = values.filter(Number.isFinite);
  if (!clean.length) return [0, 1];
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const padding = Math.max((max - min) * ratio, Math.abs(min || 1) * .025, .5);
  return [min - padding, max + padding];
}

function drawGrid(context, width, height, padding, yExtent, xExtent) {
  context.save();
  context.font = '10px system-ui, sans-serif';
  context.fillStyle = "#7a8793";
  context.strokeStyle = "#e2e7e8";
  context.lineWidth = 1;
  for (let index = 0; index <= 4; index += 1) {
    const y = padding.top + (height - padding.top - padding.bottom) * index / 4;
    const value = yExtent[1] - (yExtent[1] - yExtent[0]) * index / 4;
    context.beginPath(); context.moveTo(padding.left, y); context.lineTo(width - padding.right, y); context.stroke();
    context.textAlign = "right"; context.textBaseline = "middle"; context.fillText(fmt(value, Math.abs(value) < 10 ? 1 : 0), padding.left - 7, y);
  }
  for (let index = 0; index <= 4; index += 1) {
    const x = padding.left + (width - padding.left - padding.right) * index / 4;
    const value = xExtent[0] + (xExtent[1] - xExtent[0]) * index / 4;
    context.textAlign = "center"; context.textBaseline = "top"; context.fillText(fmt(value, Math.abs(value) < 10 ? 1 : 0), x, height - padding.bottom + 8);
  }
  context.restore();
}

function drawDiamond(context, x, y, radius, color) {
  context.save(); context.translate(x, y); context.rotate(Math.PI / 4); context.fillStyle = color; context.fillRect(-radius, -radius, radius * 2, radius * 2); context.restore();
}

function drawBoundary(context, width, height, padding, xExtent, yExtent) {
  if (!state.model) return;
  const threshold = state.thresholds[state.method];
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  context.save();
  context.strokeStyle = "rgba(232,116,59,.82)";
  context.lineWidth = 1.5;
  context.setLineDash([6, 5]);

  if (state.method === "twoFeature" && state.plot === "scatter") {
    const xCenter = scale(state.model.featureStats.mean, xExtent[0], xExtent[1], padding.left, width - padding.right);
    const yCenter = scale(state.model.valueStats.mean, yExtent[0], yExtent[1], height - padding.bottom, padding.top);
    const radiusX = Math.abs(threshold * state.model.featureStats.sd / (xExtent[1] - xExtent[0]) * plotWidth);
    const radiusY = Math.abs(threshold * state.model.valueStats.sd / (yExtent[1] - yExtent[0]) * plotHeight);
    if (radiusX > 0 && radiusY > 0) { context.beginPath(); context.ellipse(xCenter, yCenter, radiusX, radiusY, 0, 0, Math.PI * 2); context.stroke(); }
  } else if (state.method === "moving" && state.plot === "time") {
    const upper = state.model.moving.map((item) => item.mean + threshold * item.sd);
    const lower = state.model.moving.map((item) => item.mean - threshold * item.sd);
    [upper, lower].forEach((line) => {
      context.beginPath();
      line.forEach((value, index) => {
        const x = scale(state.data[index].time, xExtent[0], xExtent[1], padding.left, width - padding.right);
        const y = scale(value, yExtent[0], yExtent[1], height - padding.bottom, padding.top);
        if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
      });
      context.stroke();
    });
  } else if (["distance", "zscore", "iqr"].includes(state.method)) {
    const inspection = L.inspectPoint(state.data[0], 0, state.method, threshold, state.model);
    [inspection.lower, inspection.upper].filter(Number.isFinite).forEach((boundary) => {
      const y = scale(boundary, yExtent[0], yExtent[1], height - padding.bottom, padding.top);
      context.beginPath(); context.moveTo(padding.left, y); context.lineTo(width - padding.right, y); context.stroke();
    });
  }
  context.restore();
}

function drawPlot() {
  const canvas = $("#plotCanvas");
  const { context, width, height } = prepareCanvas(canvas);
  context.clearRect(0, 0, width, height);
  state.hitTargets = [];
  if (!state.data.length) return;

  const padding = { top: 22, right: 16, bottom: 38, left: 49 };
  const predictions = currentPredictions();
  const values = state.data.map((point) => point.value);
  const yExtent = paddedExtent(values, .12);
  let xValues = state.data.map((point) => state.plot === "scatter" ? point.feature2 : point.time);
  let xExtent = paddedExtent(xValues, .04);

  if (state.plot === "histogram") {
    drawHistogram(context, width, height, padding, predictions);
    return;
  }

  drawGrid(context, width, height, padding, yExtent, xExtent);
  drawBoundary(context, width, height, padding, xExtent, yExtent);

  if (state.plot === "time") {
    context.save(); context.strokeStyle = "rgba(77,103,126,.32)"; context.lineWidth = 1.2; context.beginPath();
    state.data.forEach((point, index) => {
      const x = scale(point.time, xExtent[0], xExtent[1], padding.left, width - padding.right);
      const y = scale(point.value, yExtent[0], yExtent[1], height - padding.bottom, padding.top);
      if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
    }); context.stroke(); context.restore();
  }

  state.data.forEach((point, index) => {
    const xValue = state.plot === "scatter" ? point.feature2 : point.time;
    const x = scale(xValue, xExtent[0], xExtent[1], padding.left, width - padding.right);
    const y = scale(point.value, yExtent[0], yExtent[1], height - padding.bottom, padding.top);
    drawPoint(context, point, index, x, y, predictions[index]);
    state.hitTargets.push({ index, x, y, radius: 10 });
  });
}

function drawHistogram(context, width, height, padding, predictions) {
  const values = state.data.map((point) => point.value);
  const extent = paddedExtent(values, .02);
  const binCount = L.clamp(Math.round(Math.sqrt(values.length)), 7, 18);
  const bins = Array.from({ length: binCount }, () => []);
  state.data.forEach((point, index) => {
    const bin = L.clamp(Math.floor((point.value - extent[0]) / Math.max(extent[1] - extent[0], .001) * binCount), 0, binCount - 1);
    bins[bin].push(index);
  });
  const maxCount = Math.max(...bins.map((bin) => bin.length), 1);
  const xExtent = extent;
  const yExtent = [0, maxCount * 1.12];
  drawGrid(context, width, height, padding, yExtent, xExtent);
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const binWidth = plotWidth / binCount;

  bins.forEach((indices, binIndex) => {
    const barHeight = indices.length / yExtent[1] * plotHeight;
    const left = padding.left + binIndex * binWidth + 2;
    context.fillStyle = "rgba(40,120,200,.16)";
    context.fillRect(left, height - padding.bottom - barHeight, Math.max(2, binWidth - 4), barHeight);
    const dotStep = Math.min(10, Math.max(3, barHeight / Math.max(indices.length, 1)));
    indices.forEach((pointIndex, rank) => {
      const jitter = (((pointIndex * 37) % 11) / 10 - .5) * Math.max(0, binWidth - 12);
      const x = left + (binWidth - 4) / 2 + jitter;
      const y = height - padding.bottom - 6 - rank * dotStep;
      drawPoint(context, state.data[pointIndex], pointIndex, x, y, predictions[pointIndex], 3.4);
      state.hitTargets.push({ index: pointIndex, x, y, radius: 9 });
    });
  });

  if (["distance", "zscore", "iqr"].includes(state.method)) {
    const inspection = L.inspectPoint(state.data[0], 0, state.method, state.thresholds[state.method], state.model);
    context.save(); context.strokeStyle = "rgba(232,116,59,.85)"; context.setLineDash([6, 5]);
    [inspection.lower, inspection.upper].filter(Number.isFinite).forEach((boundary) => {
      const x = scale(boundary, xExtent[0], xExtent[1], padding.left, width - padding.right);
      context.beginPath(); context.moveTo(x, padding.top); context.lineTo(x, height - padding.bottom); context.stroke();
    }); context.restore();
  }
}

function drawPoint(context, point, index, x, y, predicted, radius = 4.7) {
  const manual = state.manualIds.has(point.id);
  context.save();
  if (state.revealed && point.isAnomaly) drawDiamond(context, x, y, radius + .6, "#e8743b");
  else {
    context.beginPath(); context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = manual && !state.revealed ? "#7557c8" : (state.revealed ? "#2878c8" : "#718190");
    context.fill();
  }
  if (predicted) {
    context.beginPath(); context.arc(x, y, radius + 4, 0, Math.PI * 2); context.strokeStyle = "#2878c8"; context.lineWidth = 2; context.stroke();
  }
  if (manual) {
    context.beginPath(); context.arc(x, y, radius + 7, 0, Math.PI * 2); context.strokeStyle = "#7557c8"; context.lineWidth = 1.5; context.setLineDash([3, 2]); context.stroke();
  }
  if (index === state.focusedIndex) {
    context.beginPath(); context.arc(x, y, radius + 10, 0, Math.PI * 2); context.strokeStyle = "#f0ae2a"; context.lineWidth = 2; context.setLineDash([]); context.stroke();
  }
  context.restore();
}

function nearestTarget(event) {
  const rect = $("#plotCanvas").getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  return state.hitTargets.reduce((best, target) => {
    const distance = Math.hypot(target.x - x, target.y - y);
    return distance < best.distance ? { target, distance } : best;
  }, { target: null, distance: Infinity });
}

function selectOrInspectPoint(index, toggle = true) {
  if (!state.data[index]) return;
  state.focusedIndex = index;
  state.selectedIndex = index;
  const point = state.data[index];
  if (toggle && !state.revealed) {
    if (state.manualIds.has(point.id)) state.manualIds.delete(point.id);
    else state.manualIds.add(point.id);
  }
  $("#selectedNarration").textContent = `${index + 1}번 자료점, 값 ${fmt(point.value, 2)}. ${state.manualIds.has(point.id) ? "이상 의심으로 선택됨" : "선택되지 않음"}.`;
  $("#pointSelect").value = String(index);
  updateManualCount();
  renderPointExplanation();
  drawPlot();
}

function updateManualCount() {
  $("#manualCount").textContent = `${state.manualIds.size}개`;
  $("#clearManualButton").disabled = state.revealed;
  $("#selectionHint").textContent = state.revealed ? "· 공개 전 선택이 고정됨" : "· 그래프의 점을 눌러 선택";
}

function syncRevealState() {
  document.body.classList.toggle("truth-revealed", state.revealed);
  $("#results").classList.toggle("is-locked", !state.revealed);
  $("#resultsContent").setAttribute("aria-hidden", String(!state.revealed));
  $("#revealButton").disabled = state.revealed;
  $("#revealButton span").textContent = state.revealed ? "정답 라벨 공개됨" : "정답 라벨 공개";
}

function revealTruth() {
  if (!state.data.length) return;
  state.revealed = true;
  syncRevealState();
  updateAll();
  $("#results").scrollIntoView({ behavior: "smooth", block: "start" });
  showToast("정답을 공개했습니다. 임계값을 움직여 결과를 비교하세요.");
}

function renderResults() {
  if (!state.revealed || !state.data.length) return;
  const evaluation = currentEvaluation();
  const { matrix, metrics } = evaluation;
  $("#tpValue").textContent = matrix.tp;
  $("#fpValue").textContent = matrix.fp;
  $("#fnValue").textContent = matrix.fn;
  $("#tnValue").textContent = matrix.tn;
  $("#accuracyValue").textContent = percent(metrics.accuracy);
  $("#precisionValue").textContent = percent(metrics.precision);
  $("#recallValue").textContent = percent(metrics.recall);
  $("#specificityValue").textContent = percent(metrics.specificity);
  $("#falseAlarmValue").textContent = percent(metrics.falseAlarmRate);
  $("#totalCostValue").textContent = metrics.totalCost.toLocaleString("ko-KR");
  $("#costFormula").textContent = `FP ${matrix.fp} × ${state.costs.fp} + FN ${matrix.fn} × ${state.costs.fn}`;
  $("#evaluatedRule").textContent = `${methods[state.method].name} · ${formatThreshold(state.thresholds[state.method])}`;
  $("#baseRateBadge").textContent = `실제 이상 ${percent(metrics.prevalence)}`;
  $("#metricInsight").textContent = metricMessage(matrix, metrics);

  const manualPredictions = state.data.map((point) => state.manualIds.has(point.id));
  const manual = L.confusionMatrix(state.data.map((point) => point.isAnomaly), manualPredictions);
  $("#manualResultText").textContent = `TP ${manual.tp} · FP ${manual.fp} · FN ${manual.fn} · TN ${manual.tn}`;
  renderPointExplanation();
  renderSummary();
  renderMethodComparison();
  renderMissionStatus();
  renderSnapshots();
}

function metricMessage(matrix, metrics) {
  if ((metrics.prevalence || 0) < .05 && (metrics.accuracy || 0) > .9 && (metrics.recall || 0) < .5) return "기저율이 낮을 때는 거의 모두 정상이라고 해도 정확도가 높아 보일 수 있습니다. 재현율과 혼동행렬을 함께 보세요.";
  if (matrix.fp > matrix.fn * 2) return "거짓 경보가 놓침보다 많습니다. 임계값을 올리면 FP는 줄 수 있지만 FN이 늘 수 있습니다.";
  if (matrix.fn > matrix.fp * 2) return "놓친 이상이 거짓 경보보다 많습니다. 임계값을 내리면 FN은 줄 수 있지만 FP가 늘 수 있습니다.";
  return "현재는 두 오류가 비교적 비슷합니다. 비용을 바꾸면 같은 혼동행렬의 의미도 달라집니다.";
}

function renderPointOptions() {
  const selected = L.clamp(state.selectedIndex, 0, Math.max(0, state.data.length - 1));
  $("#pointSelect").innerHTML = state.data.map((point, index) => `<option value="${index}">${index + 1}번 · ${fmt(point.value, 2)}</option>`).join("");
  $("#pointSelect").value = String(selected);
}

function renderPointExplanation() {
  if (!state.data.length || !state.model) return;
  const index = L.clamp(state.selectedIndex, 0, state.data.length - 1);
  const point = state.data[index];
  const threshold = state.thresholds[state.method];
  const detail = L.inspectPoint(point, index, state.method, threshold, state.model);
  const scenario = currentScenario();
  const truth = state.revealed ? (point.isAnomaly ? "실제 이상" : "실제 정상") : "정답 숨김";
  $("#pointSummary").innerHTML = `<span><b>${index + 1}번</b> 자료점</span><span>${scenario.valueName}: <b>${fmt(point.value, 2)}${scenario.valueUnit}</b></span><span>${scenario.featureName}: <b>${fmt(point.feature2, 2)}${scenario.featureUnit}</b></span><span>정답: <b>${truth}</b></span><span>규칙 판정: <b>${detail.flagged ? "경고" : "통과"}</b></span>`;

  let steps;
  if (state.method === "distance") {
    steps = [
      ["전체 평균 계산", `모든 값 ${state.model.valueStats.n}개의 평균`, `x̄ = ${fmt(state.model.valueStats.mean)}`],
      ["평균과 거리", "선택한 값에서 평균을 뺀 절댓값", `|${fmt(point.value)} − ${fmt(state.model.valueStats.mean)}| = ${fmt(detail.score)}`],
      ["임계값과 비교", detail.flagged ? "거리가 더 커서 경고" : "거리가 임계값 안이라 통과", `${fmt(detail.score)} ${detail.flagged ? ">" : "≤"} ${formatThreshold(threshold)}`],
    ];
  } else if (state.method === "zscore") {
    steps = [
      ["평균·표준편차", "중심과 정상적인 퍼짐의 기준", `x̄=${fmt(state.model.valueStats.mean)}, σ=${fmt(state.model.valueStats.sd)}`],
      ["z점수 계산", "평균과의 차이를 표준편차로 나눔", `z=(${fmt(point.value)}−${fmt(state.model.valueStats.mean)})/${fmt(state.model.valueStats.sd)}=${fmt(detail.z)}`],
      ["절댓값 비교", detail.flagged ? "임계값 밖이라 경고" : "임계값 안이라 통과", `|z|=${fmt(Math.abs(detail.z))} ${detail.flagged ? ">" : "≤"} ${formatThreshold(threshold)}`],
    ];
  } else if (state.method === "iqr") {
    steps = [
      ["사분위수", "정렬한 자료의 25%와 75% 위치", `Q1=${fmt(state.model.valueStats.q1)}, Q3=${fmt(state.model.valueStats.q3)}`],
      ["IQR·울타리", "IQR=Q3−Q1, 양쪽으로 k배 확장", `IQR=${fmt(state.model.valueStats.iqr)}, [${fmt(detail.lower)}, ${fmt(detail.upper)}]`],
      ["울타리와 비교", detail.flagged ? "울타리 밖이라 경고" : "울타리 안이라 통과", `${fmt(point.value)} ${detail.flagged ? "∉" : "∈"} [${fmt(detail.lower)}, ${fmt(detail.upper)}]`],
    ];
  } else if (state.method === "moving") {
    const rangeText = detail.moving.usedFallback ? "초기점이라 전체 자료를 보조 기준으로 사용" : `${detail.moving.start + 1}~${detail.moving.end + 1}번 자료 사용`;
    steps = [
      ["최근 구간 선택", rangeText, `최근 평균=${fmt(detail.moving.mean)}`],
      ["최근 퍼짐으로 표준화", "현재 값과 최근 평균의 차이를 최근 표준편차로 나눔", `|z최근|=${fmt(detail.score)}, σ최근=${fmt(detail.moving.sd)}`],
      ["임계값과 비교", detail.flagged ? "갑작스러운 변화로 경고" : "최근 흐름 안이라 통과", `${fmt(detail.score)} ${detail.flagged ? ">" : "≤"} ${formatThreshold(threshold)}`],
    ];
  } else {
    steps = [
      ["두 특성 표준화", "값과 두 번째 특성을 각각 z점수로 바꿈", `z₁=${fmt(detail.z)}, z₂=${fmt(detail.z2)}`],
      ["2차원 거리", "두 z점수로 원점에서의 거리 계산", `d=√(${fmt(detail.z)}²+${fmt(detail.z2)}²)=${fmt(detail.score)}`],
      ["경계와 비교", detail.flagged ? "원형 경계 밖이라 경고" : "원형 경계 안이라 통과", `${fmt(detail.score)} ${detail.flagged ? ">" : "≤"} ${formatThreshold(threshold)}`],
    ];
  }
  $("#calculationSteps").innerHTML = steps.map(([title, description, formula]) => `<li><b>${title}</b><span>${description}</span><code>${formula}</code></li>`).join("");
}

function renderSummary() {
  if (!state.model) return;
  const stats = state.model.valueStats;
  $("#summaryStats").innerHTML = [
    ["표본 수 n", stats.n], ["평균 x̄", fmt(stats.mean)], ["표준편차 σ", fmt(stats.sd)],
    ["제1사분위수 Q1", fmt(stats.q1)], ["중앙값", fmt(stats.median)], ["제3사분위수 Q3", fmt(stats.q3)], ["사분위범위 IQR", fmt(stats.iqr)],
  ].map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("");
}

function renderMethodComparison() {
  if (!state.revealed) return;
  $("#methodGrid").innerHTML = Object.entries(methods).map(([id, method]) => {
    const evaluation = currentEvaluation(id);
    const metrics = evaluation.metrics;
    return `<button class="method-card${id === state.method ? " active" : ""}" type="button" data-method-card="${id}"><span>METHOD ${method.number}</span><strong>${method.name}</strong><div class="method-score"><b>${percent(metrics.accuracy)}</b><small>정확도</small></div><small>재현율 ${percent(metrics.recall)} · 경보율 ${percent(metrics.falseAlarmRate)}<br />비용 ${metrics.totalCost}</small></button>`;
  }).join("");
  $$('[data-method-card]').forEach((button) => button.addEventListener("click", () => setMethod(button.dataset.methodCard, true)));
}

function renderMissionStatus() {
  if (!state.revealed) {
    $("#missionStatus strong").textContent = "정답 공개 후 임계값을 조정해 보세요.";
    return;
  }
  const mission = missionRules[state.mission];
  const metrics = currentEvaluation().metrics;
  const success = mission.check(metrics);
  $("#missionStatus strong").textContent = `${mission.label} · ${mission.target} — ${success ? "달성! 근거를 설명해 보세요." : "아직 미달성. 임계값을 조정해 보세요."}`;
}

function renderSnapshots() {
  ["a", "b"].forEach((key) => {
    const snapshot = state.snapshots[key];
    $(`#snapshot${key.toUpperCase()}Text`).textContent = snapshot
      ? `${methods[snapshot.method].name} ${formatThreshold(snapshot.threshold)} · FP ${snapshot.fp} / FN ${snapshot.fn} · 비용 ${snapshot.cost}`
      : "아직 저장 안 함";
  });
}

function updateRulePreview() {
  const predictions = currentPredictions();
  $("#alertCount").textContent = `${predictions.filter(Boolean).length}개`;
  $("#ruleText").textContent = ruleDescription();
}

function updateAll() {
  updateParameterOutputs();
  updateDataText();
  updateManualCount();
  updateRulePreview();
  renderPointOptions();
  renderPointExplanation();
  renderSummary();
  drawPlot();
  renderResults();
}

function setMethod(method, scroll = false) {
  if (!methods[method]) return;
  state.method = method;
  $("#methodSelect").value = method;
  rebuildModel({ preserveDistance: true });
  updateAll();
  if (scroll) $("#lab").scrollIntoView({ behavior: "smooth", block: "center" });
}

function applyMission(id) {
  if (!missionRules[id]) return;
  state.mission = id;
  state.costs.fp = missionRules[id].fp;
  state.costs.fn = missionRules[id].fn;
  $("#fpCostRange").value = state.costs.fp;
  $("#fnCostRange").value = state.costs.fn;
  updateCostOutputs();
  $$('[data-mission]').forEach((button) => button.classList.toggle("active", button.dataset.mission === id));
  renderResults();
}

function updateCostOutputs() {
  state.costs.fp = Number($("#fpCostRange").value);
  state.costs.fn = Number($("#fnCostRange").value);
  $("#fpCostOutput").textContent = state.costs.fp;
  $("#fnCostOutput").textContent = state.costs.fn;
}

function applyPreset() {
  const preset = $("#presetSelect").value;
  const presets = {
    balanced: { scenario: "quality", n: 120, rate: 8, noise: 1, signal: 3, shift: 0, fp: 3, fn: 4, mission: "balanced" },
    rare: { scenario: "count", n: 220, rate: 3, noise: 1, signal: 4.2, shift: 0, fp: 2, fn: 12, mission: "safety" },
    shift: { scenario: "sensor", n: 160, rate: 6, noise: 1, signal: 3.2, shift: 1.5, fp: 3, fn: 5, mission: "balanced" },
    missCost: { scenario: "sensor", n: 150, rate: 7, noise: 1.2, signal: 2.8, shift: .5, fp: 1, fn: 12, mission: "safety" },
    falseAlarmCost: { scenario: "transaction", n: 180, rate: 5, noise: 1.1, signal: 3.5, shift: 0, fp: 10, fn: 3, mission: "review" },
  };
  const selected = presets[preset];
  state.scenarioId = selected.scenario;
  $("#sampleSizeRange").value = selected.n;
  $("#baseRateRange").value = selected.rate;
  $("#noiseRange").value = selected.noise;
  $("#signalRange").value = selected.signal;
  $("#shiftRange").value = selected.shift;
  $("#fpCostRange").value = selected.fp;
  $("#fnCostRange").value = selected.fn;
  updateCostOutputs();
  renderScenarios();
  applyMission(selected.mission);
  generateData({ announce: false });
  showToast("수업 프리셋을 적용했습니다.");
}

function resetSelections() {
  state.manualIds.clear();
  state.revealed = false;
  state.selectedIndex = 0;
  state.focusedIndex = 0;
  state.snapshots = { a: null, b: null };
  $("#evidenceText").value = "";
  $("#reflectionText").value = "";
  syncRevealState();
  updateAll();
  showToast("자료는 그대로 두고 선택과 결과 공개만 초기화했습니다.");
}

function downloadBlob(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvContent() {
  const scenario = currentScenario();
  const header = `index,time,value,feature2,label,${scenario.valueName},${scenario.featureName}`;
  const rows = state.data.map((point, index) => `${index + 1},${point.time},${point.value},${point.feature2},${point.isAnomaly ? 1 : 0},${point.value},${point.feature2}`);
  return `\ufeff${[header, ...rows].join("\r\n")}`;
}

function saveState() {
  const payload = {
    version: 1,
    savedAt: new Date().toISOString(),
    scenarioId: state.scenarioId,
    source: state.source,
    settings: settings(),
    data: state.data,
    plot: state.plot,
    method: state.method,
    thresholds: state.thresholds,
    windowSize: state.windowSize,
    manualIds: [...state.manualIds],
    revealed: state.revealed,
    selectedIndex: state.selectedIndex,
    costs: state.costs,
    mission: state.mission,
    snapshots: state.snapshots,
    evidence: $("#evidenceText").value,
    reflection: $("#reflectionText").value,
    labelsProvided: state.labelsProvided,
  };
  downloadBlob(JSON.stringify(payload, null, 2), `anomaly-lab-${Date.now()}.json`, "application/json;charset=utf-8");
  showToast("활동 상태를 JSON으로 저장했습니다.");
}

function restoreSettings(saved) {
  const config = saved.settings || {};
  if (Number.isFinite(Number(config.sampleSize))) $("#sampleSizeRange").value = L.clamp(Number(config.sampleSize), 20, 300);
  if (Number.isFinite(Number(config.baseRate))) $("#baseRateRange").value = L.clamp(Number(config.baseRate), 1, 30);
  if (Number.isFinite(Number(config.noise))) $("#noiseRange").value = L.clamp(Number(config.noise), 0, 3);
  if (Number.isFinite(Number(config.signal))) $("#signalRange").value = L.clamp(Number(config.signal), 0, 6);
  if (Number.isFinite(Number(config.shift))) $("#shiftRange").value = L.clamp(Number(config.shift), -3, 3);
  if (Number.isFinite(Number(config.seed))) $("#seedInput").value = L.clamp(Number(config.seed), 1, 2147483646);
}

async function loadJson(file) {
  try {
    const saved = L.validateSavedState(await file.text());
    state.scenarioId = scenarios.some((scenario) => scenario.id === saved.scenarioId) ? saved.scenarioId : "quality";
    state.source = saved.source === "csv" ? "csv" : "synthetic";
    restoreSettings(saved);
    state.data = saved.data;
    state.originalData = saved.data.map((point) => ({ ...point }));
    state.plot = ["time", "scatter", "histogram"].includes(saved.plot) ? saved.plot : "time";
    state.method = methods[saved.method] ? saved.method : "zscore";
    state.thresholds = { ...state.thresholds, ...(saved.thresholds || {}) };
    state.windowSize = L.clamp(Number(saved.windowSize) || 8, 3, 30);
    state.manualIds = new Set((saved.manualIds || []).map(String).filter((id) => state.data.some((point) => point.id === id)));
    state.revealed = Boolean(saved.revealed);
    state.selectedIndex = L.clamp(Number(saved.selectedIndex) || 0, 0, state.data.length - 1);
    state.focusedIndex = state.selectedIndex;
    state.costs = { fp: L.clamp(Number(saved.costs && saved.costs.fp) || 0, 0, 20), fn: L.clamp(Number(saved.costs && saved.costs.fn) || 0, 0, 20) };
    state.mission = missionRules[saved.mission] ? saved.mission : "balanced";
    state.snapshots = saved.snapshots || { a: null, b: null };
    state.labelsProvided = saved.labelsProvided !== false;
    $("#evidenceText").value = saved.evidence || "";
    $("#reflectionText").value = saved.reflection || "";
    $("#methodSelect").value = state.method;
    $("#windowRange").value = state.windowSize;
    $("#fpCostRange").value = state.costs.fp;
    $("#fnCostRange").value = state.costs.fn;
    $$('[data-plot]').forEach((button) => { button.classList.toggle("active", button.dataset.plot === state.plot); button.setAttribute("aria-pressed", String(button.dataset.plot === state.plot)); });
    $$('[data-mission]').forEach((button) => button.classList.toggle("active", button.dataset.mission === state.mission));
    updateCostOutputs();
    renderScenarios();
    rebuildModel({ preserveDistance: true });
    syncRevealState();
    updateAll();
    showToast("저장한 활동 상태를 복원했습니다.");
  } catch (error) {
    showToast(error instanceof Error ? error.message : "JSON을 불러오지 못했습니다.");
  }
}

async function loadCsv(file) {
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error("CSV는 5MB 이하만 불러올 수 있습니다.");
    const parsed = L.parseCsv(await file.text());
    if (parsed.points.length > 5000) throw new Error("CSV는 최대 5,000행까지 사용할 수 있습니다.");
    state.data = parsed.points;
    state.originalData = parsed.points.map((point) => ({ ...point }));
    state.source = "csv";
    state.labelsProvided = parsed.hasLabels;
    state.manualIds.clear();
    state.revealed = false;
    state.selectedIndex = 0;
    state.focusedIndex = 0;
    rebuildModel();
    syncRevealState();
    updateAll();
    const labelNote = parsed.hasLabels ? "정답 열을 찾았습니다." : "정답 열이 없어 모두 정상으로 두었습니다.";
    showToast(`${parsed.points.length}행을 불러왔습니다. ${parsed.skipped}행 건너뜀 · ${labelNote}`);
  } catch (error) {
    showToast(error instanceof Error ? error.message : "CSV를 불러오지 못했습니다.");
  }
}

function storeSnapshot(key) {
  if (!state.revealed) { showToast("정답을 공개한 뒤 기준을 저장할 수 있습니다."); return; }
  const evaluation = currentEvaluation();
  state.snapshots[key] = {
    method: state.method,
    threshold: state.thresholds[state.method],
    fp: evaluation.matrix.fp,
    fn: evaluation.matrix.fn,
    cost: evaluation.metrics.totalCost,
  };
  renderSnapshots();
  showToast(`현재 기준을 ${key.toUpperCase()}에 저장했습니다.`);
}

function showToast(message) {
  clearTimeout(toastTimer);
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 2600);
}

function bindEvents() {
  ["sampleSizeRange", "baseRateRange", "noiseRange", "signalRange", "shiftRange"].forEach((id) => $(`#${id}`).addEventListener("input", updateParameterOutputs));
  $("#generateButton").addEventListener("click", () => generateData());
  $("#reuseButton").addEventListener("click", resetSelections);
  $("#resetActivityButton").addEventListener("click", resetSelections);
  $("#randomSeedButton").addEventListener("click", () => { $("#seedInput").value = Math.floor(Math.random() * 2147483645) + 1; generateData(); });
  $("#applyPresetButton").addEventListener("click", applyPreset);
  $("#clearManualButton").addEventListener("click", () => { if (!state.revealed) { state.manualIds.clear(); updateAll(); } });
  $("#revealButton").addEventListener("click", revealTruth);

  $$('[data-plot]').forEach((button) => button.addEventListener("click", () => {
    state.plot = button.dataset.plot;
    $$('[data-plot]').forEach((item) => { item.classList.toggle("active", item === button); item.setAttribute("aria-pressed", String(item === button)); });
    updateDataText();
    drawPlot();
  }));

  $("#methodSelect").addEventListener("change", (event) => setMethod(event.target.value));
  $("#thresholdRange").addEventListener("input", (event) => {
    state.thresholds[state.method] = Number(event.target.value);
    $("#thresholdOutput").textContent = formatThreshold(state.thresholds[state.method]);
    updateAll();
  });
  $("#windowRange").addEventListener("input", (event) => {
    state.windowSize = Number(event.target.value);
    $("#windowOutput").textContent = `${state.windowSize}개`;
    rebuildModel({ preserveDistance: true });
    updateAll();
  });
  ["fpCostRange", "fnCostRange"].forEach((id) => $(`#${id}`).addEventListener("input", () => { updateCostOutputs(); renderResults(); }));
  $("#pointSelect").addEventListener("change", (event) => { state.selectedIndex = Number(event.target.value); state.focusedIndex = state.selectedIndex; renderPointExplanation(); drawPlot(); });
  $$('[data-mission]').forEach((button) => button.addEventListener("click", () => applyMission(button.dataset.mission)));
  $$('[data-snapshot]').forEach((button) => button.addEventListener("click", () => storeSnapshot(button.dataset.snapshot)));

  $("#plotCanvas").addEventListener("pointerdown", (event) => {
    const nearest = nearestTarget(event);
    if (nearest.target && nearest.distance <= Math.max(14, nearest.target.radius + 5)) selectOrInspectPoint(nearest.target.index, true);
  });
  $("#plotCanvas").addEventListener("keydown", (event) => {
    if (!state.data.length) return;
    if (["ArrowLeft", "ArrowRight", "Home", "End", " ", "Enter"].includes(event.key)) event.preventDefault();
    if (event.key === "ArrowLeft") state.focusedIndex = (state.focusedIndex - 1 + state.data.length) % state.data.length;
    else if (event.key === "ArrowRight") state.focusedIndex = (state.focusedIndex + 1) % state.data.length;
    else if (event.key === "Home") state.focusedIndex = 0;
    else if (event.key === "End") state.focusedIndex = state.data.length - 1;
    else if (event.key === " " || event.key === "Enter") { selectOrInspectPoint(state.focusedIndex, true); return; }
    else return;
    state.selectedIndex = state.focusedIndex;
    $("#pointSelect").value = String(state.selectedIndex);
    $("#selectedNarration").textContent = `${state.focusedIndex + 1}번 자료점으로 이동했습니다. 값 ${fmt(state.data[state.focusedIndex].value, 2)}.`;
    renderPointExplanation();
    drawPlot();
  });

  $("#downloadCsvButton").addEventListener("click", () => downloadBlob(csvContent(), "anomaly-lab-data.csv", "text/csv;charset=utf-8"));
  $("#printButton").addEventListener("click", () => window.print());
  $("#saveStateButton").addEventListener("click", saveState);
  $("#csvInput").addEventListener("change", (event) => { const [file] = event.target.files; if (file) loadCsv(file); event.target.value = ""; });
  $("#jsonInput").addEventListener("change", (event) => { const [file] = event.target.files; if (file) loadJson(file); event.target.value = ""; });

  $("#helpButton").addEventListener("click", () => $("#helpDialog").showModal());
  $("#closeHelpButton").addEventListener("click", () => $("#helpDialog").close());
  $("#startHelpButton").addEventListener("click", () => { $("#helpDialog").close(); $("#lab").scrollIntoView({ behavior: "smooth" }); });
  $("#helpDialog").addEventListener("click", (event) => { if (event.target === $("#helpDialog")) $("#helpDialog").close(); });
  $("#fullscreenButton").addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch { showToast("이 브라우저에서는 전체화면을 열 수 없습니다."); }
  });
  document.addEventListener("fullscreenchange", () => { $("#fullscreenButton").textContent = document.fullscreenElement ? "전체화면 닫기" : "전체화면"; });
  window.addEventListener("resize", () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(drawPlot);
  });
}

function init() {
  renderScenarios();
  bindEvents();
  updateCostOutputs();
  updateParameterOutputs();
  generateData({ announce: false });
}

init();
