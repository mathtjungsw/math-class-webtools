"use strict";

const presets = {
  default: {
    prevalence: 1,
    sensitivity: 99,
    specificity: 99,
    description: "검사의 정확도가 높아도 기저율에 따라 양성의 의미가 달라지는 기본 상황입니다.",
  },
  flu: {
    prevalence: 5,
    sensitivity: 90,
    specificity: 95,
    description: "독감이 유행하는 시기에 양성 판정이 실제 감염을 얼마나 잘 의미하는지 확인합니다.",
  },
  rare: {
    prevalence: 0.1,
    sensitivity: 99,
    specificity: 99,
    description: "검사가 매우 정확해도 병이 드물면 양성자 중 위양성이 많이 섞일 수 있습니다.",
  },
  airport: {
    prevalence: 0.01,
    sensitivity: 98,
    specificity: 99,
    description: "위험 사례가 매우 적으면 경보가 울려도 실제 위험 사례가 아닐 가능성이 큽니다.",
  },
  spam: {
    prevalence: 20,
    sensitivity: 95,
    specificity: 97,
    description: "스팸을 잘 잡는 것과 정상 메일을 잘못 차단하지 않는 것의 균형을 살펴봅니다.",
  },
  factory: {
    prevalence: 2,
    sensitivity: 96,
    specificity: 98,
    description: "공장 품질 검사에서 위양성과 위음성이 생산 과정에 미치는 영향을 확인합니다.",
  },
  doping: {
    prevalence: 0.5,
    sensitivity: 99,
    specificity: 99.5,
    description: "양성 판정을 받은 선수가 실제 도핑일 조건부 확률을 계산합니다.",
  },
};

const scenarios = {
  rare: { prevalence: 0.1, sensitivity: 99, specificity: 99 },
  epidemic: { prevalence: 30, sensitivity: 99, specificity: 99 },
  lowAccuracy: { prevalence: 10, sensitivity: 75, specificity: 75 },
  lowSpecificity: { prevalence: 1, sensitivity: 99, specificity: 80 },
  lowSensitivity: { prevalence: 10, sensitivity: 60, specificity: 99 },
};

const state = {
  population: 10000,
  prevalence: 1,
  sensitivity: 99,
  specificity: 99,
  cost: 10000,
  retest: false,
  sensitivity2: 99,
  specificity2: 99,
  prediction: 99,
  predictionRevealed: false,
  step: 5,
  positiveOnly: false,
  comparePrevalence: 20,
  quizIndex: 0,
  quizAnswered: false,
};

const quizzes = [
  {
    scenario: "유병률 1%, 민감도 99%, 특이도 99%",
    question: "양성 판정을 받은 사람이 실제 환자일 확률에 가장 가까운 값은?",
    options: ["약 99%", "약 90%", "약 50%", "약 1%"],
    answer: 2,
    explanation: "10,000명 중 진짜 양성 약 99명과 위양성 약 99명이 생기므로, 양성자 중 환자는 약 절반입니다.",
  },
  {
    scenario: "다른 조건은 그대로 두고 유병률만 낮춥니다.",
    question: "유병률이 낮아질수록 일반적으로 P(병|양성)은 어떻게 될까요?",
    options: ["높아진다", "낮아진다", "항상 같다", "계산할 수 없다"],
    answer: 1,
    explanation: "실제 환자가 드물어지면 진짜 양성 수는 줄지만, 많은 정상인에서 생기는 위양성은 여전히 남습니다.",
  },
  {
    scenario: "정상인을 양성으로 잘못 분류하는 일을 줄이려 합니다.",
    question: "직접 높여야 하는 검사 성능은 무엇일까요?",
    options: ["유병률", "민감도", "특이도", "표본 수"],
    answer: 2,
    explanation: "특이도는 정상인이 음성으로 나올 확률입니다. 특이도가 높을수록 위양성률 1−특이도가 낮아집니다.",
  },
  {
    scenario: "양성 판정자에게 독립적인 2차 검사를 실시합니다.",
    question: "두 검사 모두 양성인 사람만 최종 양성으로 보면 대체로 어떤 변화가 생길까요?",
    options: ["양성예측도가 높아진다", "유병률이 0이 된다", "민감도가 항상 100%가 된다", "검사 비용이 줄어든다"],
    answer: 0,
    explanation: "위양성이 두 검사에서 연속으로 나타날 확률은 작아져 최종 양성자 중 실제 환자의 비율이 대체로 높아집니다.",
  },
  {
    scenario: "민감도 99%인 검사",
    question: "민감도 99%가 직접 뜻하는 문장은 무엇일까요?",
    options: [
      "양성자의 99%가 환자다",
      "환자의 99%가 양성으로 나온다",
      "정상인의 99%가 양성으로 나온다",
      "전체 인구의 99%가 정확히 분류된다",
    ],
    answer: 1,
    explanation: "민감도는 P(양성|병)입니다. 조건의 방향을 바꾸면 P(병|양성)이 되어 전혀 다른 확률입니다.",
  },
];

const ids = [
  "presetSelect", "presetDescription", "populationRange", "populationInput", "prevalenceRange",
  "prevalenceInput", "sensitivityRange", "sensitivityInput", "specificityRange", "specificityInput",
  "costInput", "retestToggle", "retestOptions", "sensitivity2Input", "specificity2Input",
  "predictionInput", "predictionResult", "revealPredictionButton", "positiveOnlyButton",
  "populationCanvas", "canvasEmpty", "stageExplanation", "naturalFrequency", "heroPpv", "heroTp",
  "heroFp", "heroInsight", "ppvResult", "ppvMeter", "ppvCaption", "npvResult", "fpResult",
  "fprResult", "fnResult", "fnrResult", "positiveResult", "positiveRateResult", "totalCostResult",
  "costPerDetectionResult", "retestResultCard", "firstPpvResult", "secondPpvResult", "retestSentence",
  "matrixTp", "matrixFp", "matrixFn", "matrixTn", "matrixPositive", "matrixNegative",
  "matrixDisease", "matrixHealthy", "matrixTotal", "formulaSubstitution", "populationChartTotal",
  "diseaseBar", "healthyBar", "diseaseChartLabel", "healthyChartLabel", "positiveChartTotal",
  "tpBar", "fpBar", "tpChartLabel", "fpChartLabel", "negativeChartTotal", "tnBar", "fnBar",
  "tnChartLabel", "fnChartLabel", "predictionDifference", "predictionBar", "actualBar",
  "predictionBarLabel", "actualBarLabel", "comparePrevalenceRange", "comparePrevalenceLabel",
  "compareAPpv", "compareAPrevalence", "compareABar", "compareBPpv", "compareBPrevalence",
  "compareBBar", "comparisonInsight", "theoryPpv", "experimentalPpv", "experimentDifference",
  "experimentSummary", "quizProgress", "quizScenario", "quizQuestion", "quizOptions", "quizFeedback",
  "quizNextButton", "worksheetQuestions", "lessonSummary", "teacherDialog", "teacherButton",
  "closeTeacherButton", "copyReportButton", "refreshQuestionsButton", "resetButton",
  "rareDiseaseButton", "toast",
];

const elements = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
const canvasContext = elements.populationCanvas.getContext("2d");
let toastTimer = null;

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function ratio(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : 0;
}

function calculate(values = state) {
  const population = clamp(values.population, 100, 1000000);
  const prevalence = clamp(values.prevalence, 0.01, 50) / 100;
  const sensitivity = clamp(values.sensitivity, 50, 100) / 100;
  const specificity = clamp(values.specificity, 50, 100) / 100;
  const disease = population * prevalence;
  const healthy = population - disease;
  const tp = disease * sensitivity;
  const fn = disease - tp;
  const tn = healthy * specificity;
  const fp = healthy - tn;
  const positive = tp + fp;
  const negative = fn + tn;
  const ppv = ratio(tp, positive);
  const npv = ratio(tn, negative);
  const sensitivity2 = clamp(values.sensitivity2 ?? 99, 50, 100) / 100;
  const specificity2 = clamp(values.specificity2 ?? 99, 50, 100) / 100;
  const retestTp = tp * sensitivity2;
  const retestFp = fp * (1 - specificity2);
  const retestPositive = retestTp + retestFp;
  const retestPpv = ratio(retestTp, retestPositive);
  const totalCost = population * Math.max(0, Number(values.cost) || 0) +
    (values.retest ? positive * Math.max(0, Number(values.cost) || 0) : 0);
  const detected = values.retest ? retestTp : tp;

  return {
    population, prevalence, sensitivity, specificity, disease, healthy,
    tp, fn, tn, fp, positive, negative, ppv, npv,
    fpr: ratio(fp, healthy), fnr: ratio(fn, disease),
    positiveRate: ratio(positive, population),
    retestTp, retestFp, retestPositive, retestPpv,
    totalCost, costPerDetection: ratio(totalCost, detected),
  };
}

function formatCount(value) {
  if (!Number.isFinite(value)) return "0명";
  const decimals = Math.abs(value - Math.round(value)) < 0.05 ? 0 : value < 100 ? 1 : 0;
  return `${value.toLocaleString("ko-KR", { maximumFractionDigits: decimals })}명`;
}

function formatPlainNumber(value, maximumFractionDigits = 2) {
  return Number(value).toLocaleString("ko-KR", { maximumFractionDigits });
}

function formatPercent(value, digits = 1) {
  if (!Number.isFinite(value)) return "0%";
  const percent = value * 100;
  const adaptiveDigits = percent > 0 && percent < 0.1 ? 2 : digits;
  return `${percent.toLocaleString("ko-KR", {
    minimumFractionDigits: adaptiveDigits,
    maximumFractionDigits: adaptiveDigits,
  })}%`;
}

function formatInputPercent(value) {
  return Number(value).toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

function formatMoney(value) {
  if (!Number.isFinite(value)) return "0원";
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function setText(id, value) {
  elements[id].textContent = value;
}

function setWidth(id, ratioValue) {
  elements[id].style.width = `${clamp(ratioValue * 100, 0, 100)}%`;
}

function syncControls() {
  elements.populationRange.value = state.population;
  elements.populationInput.value = state.population;
  elements.prevalenceRange.value = state.prevalence;
  elements.prevalenceInput.value = state.prevalence;
  elements.sensitivityRange.value = state.sensitivity;
  elements.sensitivityInput.value = state.sensitivity;
  elements.specificityRange.value = state.specificity;
  elements.specificityInput.value = state.specificity;
  elements.costInput.value = state.cost;
  elements.retestToggle.checked = state.retest;
  elements.retestOptions.hidden = !state.retest;
  elements.sensitivity2Input.value = state.sensitivity2;
  elements.specificity2Input.value = state.specificity2;
  elements.predictionInput.value = state.prediction;
  elements.comparePrevalenceRange.value = state.comparePrevalence;
}

function updateStateFromControl(key, rawValue) {
  const limits = {
    population: [100, 1000000],
    prevalence: [0.01, 50],
    sensitivity: [50, 100],
    specificity: [50, 100],
    cost: [0, 10000000],
    sensitivity2: [50, 100],
    specificity2: [50, 100],
    prediction: [0, 100],
    comparePrevalence: [0.01, 50],
  };
  state[key] = clamp(rawValue, limits[key][0], limits[key][1]);
  if (key !== "prediction" && key !== "comparePrevalence") {
    elements.presetSelect.value = "custom";
  }
  syncControls();
  render();
}

function buildNaturalFrequency(result) {
  return `
    <strong>${formatCount(result.population)}</strong> 중 실제 환자는 <strong>${formatCount(result.disease)}</strong>입니다.
    그중 약 <strong>${formatCount(result.tp)}</strong>이 양성 판정을 받습니다.
    하지만 정상인 <strong>${formatCount(result.healthy)}</strong> 중 약 <strong>${formatCount(result.fp)}</strong>도
    양성 판정을 받습니다. 따라서 양성자는 모두 <strong>${formatCount(result.positive)}</strong>이고,
    그중 실제 환자는 <strong>${formatCount(result.tp)}</strong>이므로
    P(병|양성)은 <strong>${formatPercent(result.ppv)}</strong>입니다.
  `;
}

function buildHeroInsight(result) {
  if (result.ppv < 0.1) {
    return "양성 판정의 대부분이 위양성입니다. 실제 환자가 드문 기저율을 먼저 살펴야 합니다.";
  }
  if (result.ppv < 0.6) {
    return "검사가 정확해 보여도 양성자 안에는 위양성이 상당히 섞여 있습니다.";
  }
  if (result.ppv < 0.9) {
    return "양성 판정은 꽤 강한 증거지만, 검사 정확도와 같은 값은 아닙니다.";
  }
  return "현재 조건에서는 양성 판정이 실제 환자일 가능성을 매우 강하게 높입니다.";
}

function renderSummary(result) {
  const values = {
    heroPpv: formatPercent(result.ppv),
    heroTp: formatCount(result.tp),
    heroFp: formatCount(result.fp),
    heroInsight: buildHeroInsight(result),
    ppvResult: formatPercent(result.ppv),
    ppvCaption: `양성자 ${formatCount(result.positive)} 중 약 ${formatCount(result.tp)}이 실제 환자입니다.`,
    npvResult: formatPercent(result.npv, 2),
    fpResult: formatCount(result.fp),
    fprResult: `정상인의 ${formatPercent(result.fpr)}`,
    fnResult: formatCount(result.fn),
    fnrResult: `환자의 ${formatPercent(result.fnr)}`,
    positiveResult: formatCount(result.positive),
    positiveRateResult: `전체의 ${formatPercent(result.positiveRate)}`,
    totalCostResult: formatMoney(result.totalCost),
    costPerDetectionResult: formatMoney(result.costPerDetection),
  };
  Object.entries(values).forEach(([id, value]) => setText(id, value));
  setWidth("ppvMeter", result.ppv);
}

function renderPrediction(result) {
  const prediction = clamp(state.prediction, 0, 100);
  setWidth("predictionBar", prediction / 100);
  setWidth("actualBar", result.ppv);
  setText("predictionBarLabel", `${formatPlainNumber(prediction, 1)}%`);
  setText("actualBarLabel", formatPercent(result.ppv));

  if (!state.predictionRevealed) {
    elements.predictionResult.textContent = "값을 정한 뒤 결과를 확인해 보세요.";
    setText("predictionDifference", "−");
    return;
  }

  const actualPercent = result.ppv * 100;
  const difference = Math.abs(prediction - actualPercent);
  const direction = prediction > actualPercent ? "높게" : prediction < actualPercent ? "낮게" : "정확히";
  setText("predictionDifference", `${formatPlainNumber(difference, 1)}%p 차이`);
  elements.predictionResult.innerHTML = `
    실제값은 <strong>${formatPercent(result.ppv)}</strong>입니다.
    예상보다 <strong>${formatPlainNumber(difference, 1)}%p ${direction}</strong> 보았습니다.
    ${difference >= 20 ? "검사의 정확도와 양성 판정 후 실제 확률은 다를 수 있습니다." : "조건의 방향을 구분한 좋은 추론입니다."}
  `;
}

function renderMatrix(result) {
  const values = {
    matrixTp: formatCount(result.tp),
    matrixFp: formatCount(result.fp),
    matrixFn: formatCount(result.fn),
    matrixTn: formatCount(result.tn),
    matrixPositive: formatCount(result.positive),
    matrixNegative: formatCount(result.negative),
    matrixDisease: formatCount(result.disease),
    matrixHealthy: formatCount(result.healthy),
    matrixTotal: formatCount(result.population),
  };
  Object.entries(values).forEach(([id, value]) => setText(id, value));
}

function renderFormula(result) {
  const p = result.prevalence;
  const s = result.sensitivity;
  const falsePositiveRate = 1 - result.specificity;
  elements.formulaSubstitution.innerHTML = `
    P(병|양성)<br />
    = (${s.toFixed(3)} × ${p.toFixed(4)}) ÷
    {(${s.toFixed(3)} × ${p.toFixed(4)}) + (${falsePositiveRate.toFixed(3)} × ${(1 - p).toFixed(4)})}<br />
    = ${result.ppv.toFixed(4)}<br />
    = <strong>${formatPercent(result.ppv)}</strong>
  `;
}

function renderCharts(result) {
  const entries = {
    populationChartTotal: formatCount(result.population),
    diseaseChartLabel: formatCount(result.disease),
    healthyChartLabel: formatCount(result.healthy),
    positiveChartTotal: formatCount(result.positive),
    tpChartLabel: formatCount(result.tp),
    fpChartLabel: formatCount(result.fp),
    negativeChartTotal: formatCount(result.negative),
    tnChartLabel: formatCount(result.tn),
    fnChartLabel: formatCount(result.fn),
  };
  Object.entries(entries).forEach(([id, value]) => setText(id, value));
  setWidth("diseaseBar", ratio(result.disease, result.population));
  setWidth("healthyBar", ratio(result.healthy, result.population));
  setWidth("tpBar", ratio(result.tp, result.positive));
  setWidth("fpBar", ratio(result.fp, result.positive));
  setWidth("tnBar", ratio(result.tn, result.negative));
  setWidth("fnBar", ratio(result.fn, result.negative));
}

function renderRetest(result) {
  elements.retestResultCard.hidden = !state.retest;
  if (!state.retest) return;
  setText("firstPpvResult", formatPercent(result.ppv));
  setText("secondPpvResult", formatPercent(result.retestPpv));
  setText(
    "retestSentence",
    `두 검사 모두 양성인 사람은 약 ${formatCount(result.retestPositive)}이며, 그중 실제 환자는 약 ${formatCount(result.retestTp)}입니다.`
  );
}

function renderComparison(result) {
  const comparison = calculate({
    ...state,
    prevalence: state.comparePrevalence,
    retest: false,
  });
  setText("comparePrevalenceLabel", formatInputPercent(state.comparePrevalence));
  setText("compareAPpv", formatPercent(result.ppv));
  setText("compareAPrevalence", `${formatInputPercent(state.prevalence)}%`);
  setText("compareBPpv", formatPercent(comparison.ppv));
  setText("compareBPrevalence", `${formatInputPercent(state.comparePrevalence)}%`);
  setWidth("compareABar", result.ppv);
  setWidth("compareBBar", comparison.ppv);
  const gap = Math.abs(comparison.ppv - result.ppv);
  const higher = comparison.ppv > result.ppv ? "B" : "A";
  setText(
    "comparisonInsight",
    `민감도 ${formatInputPercent(state.sensitivity)}%, 특이도 ${formatInputPercent(state.specificity)}%가 같아도 양성예측도는 ${formatPlainNumber(gap * 100, 1)}%p 차이입니다. 유병률이 더 높은 상황 ${higher}에서 양성 판정의 의미가 더 강합니다.`
  );
}

function renderWorksheet(result) {
  const questions = [
    `전체 ${formatCount(result.population)}에서 유병률이 ${formatInputPercent(state.prevalence)}%라면 실제 환자 수를 먼저 예상하고 계산해 보세요.`,
    `민감도를 그대로 두고 특이도를 1%p 낮추면 위양성 수와 P(병|양성)은 어떤 방향으로 변할까요? 이유도 설명하세요.`,
    `현재 양성자 ${formatCount(result.positive)} 중 위양성은 ${formatCount(result.fp)}입니다. 이 결과를 확률이 아닌 자연빈도 문장으로 다시 써 보세요.`,
  ];
  elements.worksheetQuestions.innerHTML = questions.map((question) => `<li>${question}</li>`).join("");
  setText(
    "lessonSummary",
    `검사의 민감도와 특이도만으로 양성의 의미를 판단할 수 없습니다. 현재 조건에서는 양성 판정자의 실제 환자 확률이 ${formatPercent(result.ppv)}이며, 이 값은 유병률 ${formatInputPercent(state.prevalence)}%의 영향을 함께 받은 결과입니다.`
  );
}

function renderStage() {
  const messages = {
    1: "먼저 전체 집단을 실제 환자와 정상인으로 나눕니다. 유병률은 이 첫 분할의 크기를 정합니다.",
    2: "실제 환자 안에서 민감도만큼 진짜 양성이 되고, 나머지는 위음성이 됩니다.",
    3: "정상인 안에서 특이도만큼 진짜 음성이 되고, 나머지는 위양성이 됩니다.",
    4: "이제 검사 결과가 양성인 사람만 모읍니다. 진짜 양성과 위양성이 함께 보입니다.",
    5: "양성 판정자 전체를 분모로 놓고, 그중 진짜 양성이 차지하는 비율 P(병|양성)을 계산합니다.",
  };
  setText("stageExplanation", messages[state.step]);
  document.querySelectorAll("[data-step]").forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.step) === state.step);
  });
  elements.positiveOnlyButton.setAttribute("aria-pressed", String(state.positiveOnly));
  elements.positiveOnlyButton.textContent = state.positiveOnly ? "전체 인구 보기" : "양성자만 보기";
}

function apportionCounts(result, sampleSize, categories) {
  const raw = categories.map((key) => ratio(result[key], categories.reduce((sum, item) => sum + result[item], 0)) * sampleSize);
  const counts = raw.map(Math.floor);
  let remainder = sampleSize - counts.reduce((sum, count) => sum + count, 0);
  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);
  for (let i = 0; i < remainder; i += 1) counts[order[i % order.length].index] += 1;
  return Object.fromEntries(categories.map((key, index) => [key, counts[index]]));
}

function resizeCanvas() {
  const rect = elements.populationCanvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(280, rect.width);
  const height = Math.max(260, rect.height);
  if (elements.populationCanvas.width !== Math.round(width * dpr) ||
      elements.populationCanvas.height !== Math.round(height * dpr)) {
    elements.populationCanvas.width = Math.round(width * dpr);
    elements.populationCanvas.height = Math.round(height * dpr);
  }
  canvasContext.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { width, height };
}

function drawPopulation(result) {
  const { width, height } = resizeCanvas();
  canvasContext.clearRect(0, 0, width, height);

  const onlyPositive = state.positiveOnly || state.step >= 4;
  const totalRelevant = onlyPositive ? result.positive : result.population;
  if (totalRelevant <= 0) {
    elements.canvasEmpty.hidden = false;
    return;
  }
  elements.canvasEmpty.hidden = true;

  const maxDots = 10000;
  const sampleSize = Math.min(maxDots, Math.max(1, Math.round(totalRelevant)));
  const categories = onlyPositive ? ["tp", "fp"] : ["tp", "fn", "fp", "tn"];
  const counts = apportionCounts(result, sampleSize, categories);
  const palette = {
    tp: "#20a486",
    fp: "#f3a249",
    fn: "#df5a64",
    tn: "#4f77ca",
    disease: "#7866d5",
    healthy: "#cbd3dc",
    muted: "#e2e7ed",
  };

  const gap = sampleSize > 5000 ? 1.3 : sampleSize > 2000 ? 1.8 : 2.7;
  const columns = Math.max(1, Math.floor(width / gap));
  const rows = Math.ceil(sampleSize / columns);
  const availableGap = Math.min(gap, (height - 8) / Math.max(rows, 1), (width - 8) / Math.max(Math.min(columns, sampleSize), 1));
  const radius = Math.max(0.55, Math.min(2.4, availableGap * 0.34));
  const usedWidth = Math.min(columns, sampleSize) * availableGap;
  const usedHeight = rows * availableGap;
  const startX = (width - usedWidth) / 2 + availableGap / 2;
  const startY = (height - usedHeight) / 2 + availableGap / 2;

  const ordered = [];
  categories.forEach((key) => {
    for (let i = 0; i < counts[key]; i += 1) ordered.push(key);
  });

  ordered.forEach((category, index) => {
    let color = palette[category];
    if (!onlyPositive) {
      if (state.step === 1) color = category === "tp" || category === "fn" ? palette.disease : palette.healthy;
      if (state.step === 2 && (category === "fp" || category === "tn")) color = palette.muted;
    }
    const x = startX + (index % columns) * availableGap;
    const y = startY + Math.floor(index / columns) * availableGap;
    canvasContext.beginPath();
    canvasContext.fillStyle = color;
    canvasContext.arc(x, y, radius, 0, Math.PI * 2);
    canvasContext.fill();
  });
}

function render() {
  const result = calculate();
  renderSummary(result);
  renderPrediction(result);
  renderMatrix(result);
  renderFormula(result);
  renderCharts(result);
  renderRetest(result);
  renderComparison(result);
  renderWorksheet(result);
  renderStage();
  elements.naturalFrequency.innerHTML = buildNaturalFrequency(result);
  setText("theoryPpv", formatPercent(result.ppv));
  drawPopulation(result);
}

function applyPreset(key) {
  const preset = presets[key];
  if (!preset) return;
  state.prevalence = preset.prevalence;
  state.sensitivity = preset.sensitivity;
  state.specificity = preset.specificity;
  elements.presetSelect.value = key;
  elements.presetDescription.textContent = preset.description;
  state.predictionRevealed = false;
  syncControls();
  render();
}

function applyScenario(key) {
  const scenario = scenarios[key];
  if (!scenario) return;
  Object.assign(state, scenario);
  elements.presetSelect.value = "custom";
  elements.presetDescription.textContent = "극단 상황 버튼으로 만든 사용자 설정입니다. 각 성능값의 영향을 비교해 보세요.";
  syncControls();
  render();
  showToast("극단 상황 값을 적용했습니다.");
}

function resetState() {
  Object.assign(state, {
    population: 10000,
    prevalence: 1,
    sensitivity: 99,
    specificity: 99,
    cost: 10000,
    retest: false,
    sensitivity2: 99,
    specificity2: 99,
    prediction: 99,
    predictionRevealed: false,
    step: 5,
    positiveOnly: false,
    comparePrevalence: 20,
  });
  elements.presetSelect.value = "default";
  elements.presetDescription.textContent = presets.default.description;
  elements.experimentalPpv.textContent = "아직 실험 전";
  elements.experimentDifference.textContent = "−";
  elements.experimentSummary.textContent = "실험 버튼을 눌러 표본의 우연한 변동을 관찰하세요.";
  syncControls();
  render();
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  toastTimer = setTimeout(() => elements.toast.classList.remove("is-visible"), 2200);
}

function normalRandom() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function binomialSample(n, probability) {
  if (n <= 0 || probability <= 0) return 0;
  if (probability >= 1) return n;
  if (n <= 2000) {
    let successes = 0;
    for (let i = 0; i < n; i += 1) if (Math.random() < probability) successes += 1;
    return successes;
  }
  const mean = n * probability;
  const deviation = Math.sqrt(n * probability * (1 - probability));
  return Math.round(clamp(mean + normalRandom() * deviation, 0, n));
}

function runExperiment(runs) {
  let totalTp = 0;
  let totalFp = 0;
  let totalDisease = 0;
  const population = Math.round(state.population);
  const prevalence = state.prevalence / 100;
  const sensitivity = state.sensitivity / 100;
  const falsePositiveRate = 1 - state.specificity / 100;

  for (let i = 0; i < runs; i += 1) {
    const disease = binomialSample(population, prevalence);
    const tp = binomialSample(disease, sensitivity);
    const fp = binomialSample(population - disease, falsePositiveRate);
    totalDisease += disease;
    totalTp += tp;
    totalFp += fp;
  }

  const experimental = ratio(totalTp, totalTp + totalFp);
  const theory = calculate().ppv;
  setText("experimentalPpv", formatPercent(experimental));
  setText("experimentDifference", `${formatPlainNumber(Math.abs(experimental - theory) * 100, 1)}%p`);
  setText(
    "experimentSummary",
    `${runs.toLocaleString("ko-KR")}회 실험에서 회당 평균 환자는 ${formatCount(totalDisease / runs)}, 진짜 양성은 ${formatCount(totalTp / runs)}, 위양성은 ${formatCount(totalFp / runs)}이었습니다.`
  );
}

function renderQuiz() {
  const quiz = quizzes[state.quizIndex];
  state.quizAnswered = false;
  setText("quizProgress", `${state.quizIndex + 1} / ${quizzes.length}`);
  setText("quizScenario", quiz.scenario);
  setText("quizQuestion", quiz.question);
  elements.quizFeedback.textContent = "";
  elements.quizNextButton.hidden = true;
  elements.quizNextButton.textContent = state.quizIndex === quizzes.length - 1 ? "처음부터 다시" : "다음 문제";
  elements.quizOptions.innerHTML = quiz.options
    .map((option, index) => `<button type="button" data-option="${index}">${index + 1}. ${option}</button>`)
    .join("");
}

function answerQuiz(index) {
  if (state.quizAnswered) return;
  state.quizAnswered = true;
  const quiz = quizzes[state.quizIndex];
  elements.quizOptions.querySelectorAll("button").forEach((button) => {
    const buttonIndex = Number(button.dataset.option);
    button.disabled = true;
    if (buttonIndex === quiz.answer) button.classList.add("is-correct");
    if (buttonIndex === index && index !== quiz.answer) button.classList.add("is-wrong");
  });
  elements.quizFeedback.innerHTML = `<strong>${index === quiz.answer ? "정답입니다." : "다시 생각해 볼 지점입니다."}</strong> ${quiz.explanation}`;
  elements.quizNextButton.hidden = false;
}

function nextQuiz() {
  state.quizIndex = (state.quizIndex + 1) % quizzes.length;
  renderQuiz();
}

function switchMode(mode) {
  document.querySelectorAll("[data-mode]").forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
  document.querySelectorAll("[data-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.panel !== mode;
  });
}

function buildReport(result) {
  const retest = state.retest
    ? `\n- 2차 검사까지 양성일 때 실제 환자일 확률: ${formatPercent(result.retestPpv)}`
    : "";
  return `조건부 확률 실험 결과
- 전체 인구: ${formatCount(result.population)}
- 유병률: ${formatInputPercent(state.prevalence)}%
- 민감도: ${formatInputPercent(state.sensitivity)}%
- 특이도: ${formatInputPercent(state.specificity)}%
- 실제 환자: ${formatCount(result.disease)}
- 진짜 양성: ${formatCount(result.tp)}
- 위양성: ${formatCount(result.fp)}
- 위음성: ${formatCount(result.fn)}
- 진짜 음성: ${formatCount(result.tn)}
- P(병|양성): ${formatPercent(result.ppv)}
- P(정상|음성): ${formatPercent(result.npv, 2)}
- 총 검사 비용: ${formatMoney(result.totalCost)}${retest}

해석: ${elements.lessonSummary.textContent}`;
}

async function copyReport() {
  const report = buildReport(calculate());
  try {
    await navigator.clipboard.writeText(report);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = report;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
  showToast("현재 결과와 해석을 복사했습니다.");
}

function bindRangeAndInput(rangeElement, inputElement, key) {
  rangeElement.addEventListener("input", (event) => updateStateFromControl(key, event.target.value));
  inputElement.addEventListener("change", (event) => updateStateFromControl(key, event.target.value));
}

bindRangeAndInput(elements.populationRange, elements.populationInput, "population");
bindRangeAndInput(elements.prevalenceRange, elements.prevalenceInput, "prevalence");
bindRangeAndInput(elements.sensitivityRange, elements.sensitivityInput, "sensitivity");
bindRangeAndInput(elements.specificityRange, elements.specificityInput, "specificity");

elements.costInput.addEventListener("change", (event) => updateStateFromControl("cost", event.target.value));
elements.sensitivity2Input.addEventListener("change", (event) => updateStateFromControl("sensitivity2", event.target.value));
elements.specificity2Input.addEventListener("change", (event) => updateStateFromControl("specificity2", event.target.value));
elements.predictionInput.addEventListener("input", (event) => {
  state.prediction = clamp(event.target.value, 0, 100);
  renderPrediction(calculate());
});
elements.comparePrevalenceRange.addEventListener("input", (event) => {
  state.comparePrevalence = clamp(event.target.value, 0.01, 50);
  renderComparison(calculate());
});

elements.presetSelect.addEventListener("change", (event) => applyPreset(event.target.value));
elements.retestToggle.addEventListener("change", (event) => {
  state.retest = event.target.checked;
  elements.retestOptions.hidden = !state.retest;
  render();
});
elements.revealPredictionButton.addEventListener("click", () => {
  state.prediction = clamp(elements.predictionInput.value, 0, 100);
  state.predictionRevealed = true;
  renderPrediction(calculate());
});
elements.positiveOnlyButton.addEventListener("click", () => {
  state.positiveOnly = !state.positiveOnly;
  if (state.positiveOnly && state.step < 4) state.step = 4;
  renderStage();
  drawPopulation(calculate());
});
elements.resetButton.addEventListener("click", resetState);
elements.rareDiseaseButton.addEventListener("click", () => {
  applyPreset("rare");
  document.getElementById("laboratory").scrollIntoView({ behavior: "smooth" });
});
elements.copyReportButton.addEventListener("click", copyReport);
elements.refreshQuestionsButton.addEventListener("click", () => {
  renderWorksheet(calculate());
  showToast("현재 조건으로 질문을 새로 구성했습니다.");
});

document.querySelectorAll("[data-step]").forEach((button) => {
  button.addEventListener("click", () => {
    state.step = Number(button.dataset.step);
    state.positiveOnly = state.step >= 4;
    renderStage();
    drawPopulation(calculate());
  });
});

document.querySelectorAll("[data-scenario]").forEach((button) => {
  button.addEventListener("click", () => applyScenario(button.dataset.scenario));
});

document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => switchMode(button.dataset.mode));
});

document.querySelectorAll("[data-runs]").forEach((button) => {
  button.addEventListener("click", () => runExperiment(Number(button.dataset.runs)));
});

elements.quizOptions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-option]");
  if (button) answerQuiz(Number(button.dataset.option));
});
elements.quizNextButton.addEventListener("click", nextQuiz);

elements.teacherButton.addEventListener("click", () => elements.teacherDialog.showModal());
elements.closeTeacherButton.addEventListener("click", () => elements.teacherDialog.close());
elements.teacherDialog.addEventListener("click", (event) => {
  const rect = elements.teacherDialog.getBoundingClientRect();
  const outside = event.clientX < rect.left || event.clientX > rect.right ||
    event.clientY < rect.top || event.clientY > rect.bottom;
  if (outside) elements.teacherDialog.close();
});

window.addEventListener("resize", () => drawPopulation(calculate()));

syncControls();
renderQuiz();
render();
