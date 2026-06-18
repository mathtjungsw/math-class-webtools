const MANUAL_GITHUB_REPOSITORY_URL = "https://github.com/mathtjungsw/math-class-webtools";

const samples = {
  study: {
    xName: "공부 시간(시간)",
    yName: "시험 점수(점)",
    values: [[1, 52], [2, 58], [3, 61], [4, 68], [5, 72], [6, 81], [7, 84], [8, 91]],
  },
  yearTemperature: {
    xName: "연도",
    yName: "평균 기온(℃)",
    values: [[2014, 13.4], [2015, 13.6], [2016, 13.6], [2017, 13.3], [2018, 13.0], [2019, 13.5], [2020, 13.2], [2021, 13.6], [2022, 13.7], [2023, 14.1]],
  },
  exercise: {
    xName: "주간 운동 시간(시간)",
    yName: "체력 점수(점)",
    values: [[1, 43], [2, 49], [3, 55], [4, 62], [5, 65], [6, 73], [7, 76], [8, 85]],
  },
  advertising: {
    xName: "광고비(만원)",
    yName: "판매량(개)",
    values: [[10, 82], [20, 101], [30, 117], [40, 139], [50, 147], [60, 174], [70, 188]],
  },
  smartphone: {
    xName: "스마트폰 사용 시간(시간)",
    yName: "수면 시간(시간)",
    values: [[1, 8.1], [2, 7.8], [3, 7.4], [4, 6.9], [5, 6.6], [6, 6.1], [7, 5.8]],
  },
};

const state = {
  rows: [],
  nextRowId: 1,
  model: null,
  showTrend: false,
  history: [],
  nextHistoryId: 1,
  graphPoints: [],
};

const els = {
  statusMessage: document.querySelector("#statusMessage"),
  xAxisName: document.querySelector("#xAxisName"),
  yAxisName: document.querySelector("#yAxisName"),
  xTableHeading: document.querySelector("#xTableHeading"),
  yTableHeading: document.querySelector("#yTableHeading"),
  dataRows: document.querySelector("#dataRows"),
  validCount: document.querySelector("#validCount"),
  sampleSelect: document.querySelector("#sampleSelect"),
  loadSampleButton: document.querySelector("#loadSampleButton"),
  addRowButton: document.querySelector("#addRowButton"),
  clearDataButton: document.querySelector("#clearDataButton"),
  pasteInput: document.querySelector("#pasteInput"),
  applyPasteButton: document.querySelector("#applyPasteButton"),
  trendToggle: document.querySelector("#trendToggle"),
  chartShell: document.querySelector("#chartShell"),
  dataChart: document.querySelector("#dataChart"),
  chartTooltip: document.querySelector("#chartTooltip"),
  chartCaption: document.querySelector("#chartCaption"),
  calculateButton: document.querySelector("#calculateButton"),
  analysisEmpty: document.querySelector("#analysisEmpty"),
  analysisResult: document.querySelector("#analysisResult"),
  equationText: document.querySelector("#equationText"),
  slopeValue: document.querySelector("#slopeValue"),
  interceptValue: document.querySelector("#interceptValue"),
  dataCountValue: document.querySelector("#dataCountValue"),
  rSquaredValue: document.querySelector("#rSquaredValue"),
  interpretationText: document.querySelector("#interpretationText"),
  predictionInputLabel: document.querySelector("#predictionInputLabel"),
  predictionX: document.querySelector("#predictionX"),
  predictButton: document.querySelector("#predictButton"),
  predictionOutput: document.querySelector("#predictionOutput"),
  historyRows: document.querySelector("#historyRows"),
  historyEmpty: document.querySelector("#historyEmpty"),
  clearHistoryButton: document.querySelector("#clearHistoryButton"),
  openReportButton: document.querySelector("#openReportButton"),
  reportBuilder: document.querySelector("#reportBuilder"),
  reportTopic: document.querySelector("#reportTopic"),
  reportPurpose: document.querySelector("#reportPurpose"),
  reportDataDescription: document.querySelector("#reportDataDescription"),
  reportInterpretation: document.querySelector("#reportInterpretation"),
  reportPredictionSummary: document.querySelector("#reportPredictionSummary"),
  reportLearned: document.querySelector("#reportLearned"),
  reportQuestion: document.querySelector("#reportQuestion"),
  fillInterpretationButton: document.querySelector("#fillInterpretationButton"),
  fillPredictionSummaryButton: document.querySelector("#fillPredictionSummaryButton"),
  buildReportButton: document.querySelector("#buildReportButton"),
  downloadPdfButton: document.querySelector("#downloadPdfButton"),
  pdfProgress: document.querySelector("#pdfProgress"),
  reportPreviewShell: document.querySelector("#reportPreviewShell"),
  reportDocument: document.querySelector("#reportDocument"),
};

function showStatus(message, type = "normal") {
  els.statusMessage.textContent = message;
  els.statusMessage.classList.toggle("is-warning", type === "warning");
  els.statusMessage.classList.toggle("is-error", type === "error");
}

function getAxisNames() {
  return {
    x: els.xAxisName.value.trim() || "x",
    y: els.yAxisName.value.trim() || "y",
  };
}

function formatNumber(value, digits = 3) {
  if (!Number.isFinite(value)) return "-";
  const rounded = Math.abs(value) < 10 ** (-digits) ? 0 : value;
  return rounded.toFixed(digits).replace(/\.0+$|(?<=\.[0-9]*?)0+$/g, "").replace(/\.$/, "");
}

function formatEquation(model = state.model) {
  if (!model) return "추세선 없음";
  const sign = model.intercept < 0 ? "−" : "+";
  return `y = ${formatNumber(model.slope)}x ${sign} ${formatNumber(Math.abs(model.intercept))}`;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function makeRow(x = "", y = "") {
  return { id: state.nextRowId++, x: String(x), y: String(y) };
}

function resetRows() {
  state.rows = Array.from({ length: 5 }, () => makeRow());
}

function getValidData() {
  const valid = [];
  let excluded = 0;

  state.rows.forEach((row) => {
    const xText = String(row.x).trim();
    const yText = String(row.y).trim();
    if (!xText && !yText) return;

    const x = Number(xText);
    const y = Number(yText);
    if (xText && yText && Number.isFinite(x) && Number.isFinite(y)) {
      valid.push({ x, y, rowId: row.id });
    } else {
      excluded += 1;
    }
  });

  return { valid, excluded };
}

function renderRows() {
  els.dataRows.replaceChildren();
  const names = getAxisNames();
  els.xTableHeading.textContent = names.x;
  els.yTableHeading.textContent = names.y;
  els.predictionInputLabel.textContent = `예측할 ${names.x}`;

  state.rows.forEach((row, index) => {
    const tr = document.createElement("tr");
    tr.dataset.rowId = row.id;

    const numberCell = document.createElement("td");
    numberCell.textContent = index + 1;

    const xCell = document.createElement("td");
    const xInput = document.createElement("input");
    xInput.type = "number";
    xInput.step = "any";
    xInput.value = row.x;
    xInput.dataset.field = "x";
    xInput.setAttribute("aria-label", `${index + 1}번 ${names.x}`);
    xCell.append(xInput);

    const yCell = document.createElement("td");
    const yInput = document.createElement("input");
    yInput.type = "number";
    yInput.step = "any";
    yInput.value = row.y;
    yInput.dataset.field = "y";
    yInput.setAttribute("aria-label", `${index + 1}번 ${names.y}`);
    yCell.append(yInput);

    const actionCell = document.createElement("td");
    const removeButton = document.createElement("button");
    removeButton.className = "icon-button";
    removeButton.type = "button";
    removeButton.dataset.removeRow = String(row.id);
    removeButton.setAttribute("aria-label", `${index + 1}번 행 삭제`);
    removeButton.textContent = "×";
    actionCell.append(removeButton);

    tr.append(numberCell, xCell, yCell, actionCell);
    els.dataRows.append(tr);
  });

  const { valid, excluded } = getValidData();
  els.validCount.textContent = `유효 데이터 ${valid.length}개${excluded ? ` · 제외 ${excluded}개` : ""}`;
  drawChart();
}

function invalidateModel() {
  state.model = null;
  state.showTrend = false;
  els.trendToggle.checked = false;
  els.trendToggle.disabled = true;
  els.analysisEmpty.hidden = false;
  els.analysisResult.hidden = true;
  els.predictionOutput.classList.remove("has-result");
  els.predictionOutput.textContent = "추세선을 만든 뒤 예측할 수 있습니다.";
  els.reportPreviewShell.hidden = true;
}

function handleDataInput(event) {
  const input = event.target.closest("input[data-field]");
  if (!input) return;
  const row = state.rows.find((item) => item.id === Number(input.closest("tr").dataset.rowId));
  if (!row) return;
  row[input.dataset.field] = input.value;
  invalidateModel();
  const { valid, excluded } = getValidData();
  els.validCount.textContent = `유효 데이터 ${valid.length}개${excluded ? ` · 제외 ${excluded}개` : ""}`;
  drawChart();
}

function removeRow(rowId) {
  state.rows = state.rows.filter((row) => row.id !== rowId);
  if (state.rows.length === 0) state.rows.push(makeRow());
  invalidateModel();
  renderRows();
}

function addRow() {
  state.rows.push(makeRow());
  renderRows();
  const inputs = els.dataRows.querySelectorAll("input");
  inputs[inputs.length - 2]?.focus();
}

function clearData() {
  if (!window.confirm("입력한 데이터를 모두 지우고 빈 행 5개로 되돌릴까요?")) return;
  resetRows();
  invalidateModel();
  renderRows();
  showStatus("모든 데이터를 지웠습니다. 새 자료를 입력하세요.");
}

function loadSample() {
  const sample = samples[els.sampleSelect.value];
  if (!sample) return;
  els.xAxisName.value = sample.xName;
  els.yAxisName.value = sample.yName;
  state.rows = sample.values.map(([x, y]) => makeRow(x, y));
  invalidateModel();
  renderRows();
  showStatus(`‘${sample.xName}과(와) ${sample.yName}’ 예시 데이터 ${sample.values.length}개를 불러왔습니다.`);
}

// 붙여넣은 자료는 줄 단위로 나누고, 각 줄의 앞 두 값을 x와 y로 사용한다.
// 탭·쉼표·연속 공백을 모두 허용해 엑셀과 구글 스프레드시트 자료를 쉽게 옮길 수 있다.
function applyPastedData() {
  const lines = els.pasteInput.value.split(/\r?\n/);
  const parsed = [];
  let excluded = 0;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const parts = trimmed.split(/[\t,; ]+/).filter(Boolean);
    const x = Number(parts[0]);
    const y = Number(parts[1]);
    if (parts.length >= 2 && Number.isFinite(x) && Number.isFinite(y)) parsed.push([x, y]);
    else excluded += 1;
  });

  if (parsed.length === 0) {
    showStatus("반영할 숫자 쌍을 찾지 못했습니다. 한 줄에 x와 y 숫자를 하나씩 입력하세요.", "error");
    return;
  }

  state.rows = parsed.map(([x, y]) => makeRow(x, y));
  invalidateModel();
  renderRows();
  showStatus(`${parsed.length}개의 데이터를 반영했습니다.${excluded ? ` 숫자가 아닌 ${excluded}개 줄은 제외했습니다.` : ""}`, excluded ? "warning" : "normal");
}

// 최소제곱법: 각 점과 직선 사이의 세로 거리 제곱합이 가장 작아지도록
// 기울기(a)와 y절편(b)을 계산한다.
function calculateTrendline() {
  const { valid, excluded } = getValidData();
  if (valid.length < 2) {
    showStatus("추세선을 만들려면 유효한 데이터가 2개 이상 필요합니다.", "error");
    return;
  }

  const meanX = valid.reduce((sum, point) => sum + point.x, 0) / valid.length;
  const meanY = valid.reduce((sum, point) => sum + point.y, 0) / valid.length;
  const sxx = valid.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);

  if (Math.abs(sxx) < Number.EPSILON) {
    showStatus("모든 x값이 같아서 직선 추세선을 계산할 수 없습니다. 서로 다른 x값을 입력하세요.", "error");
    return;
  }

  const sxy = valid.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0);
  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  const predicted = valid.map((point) => slope * point.x + intercept);
  const ssResidual = valid.reduce((sum, point, index) => sum + (point.y - predicted[index]) ** 2, 0);
  const ssTotal = valid.reduce((sum, point) => sum + (point.y - meanY) ** 2, 0);

  // R² = 1 - (오차 제곱합 / 전체 편차 제곱합).
  // y가 모두 같아 전체 편차가 0이면 완전히 맞는 수평선이므로 1로 처리한다.
  const rSquared = ssTotal < Number.EPSILON ? 1 : Math.max(0, Math.min(1, 1 - ssResidual / ssTotal));

  state.model = { slope, intercept, rSquared, n: valid.length, meanX, meanY };
  state.showTrend = true;
  els.trendToggle.disabled = false;
  els.trendToggle.checked = true;
  renderAnalysis();
  drawChart();
  showStatus(`추세선을 만들었습니다.${excluded ? ` 유효하지 않은 ${excluded}개 행은 제외했습니다.` : ""}`, excluded ? "warning" : "normal");
}

function buildInterpretation() {
  if (!state.model) return "먼저 추세선을 만들어 주세요.";
  const names = getAxisNames();
  const { slope, rSquared } = state.model;
  let direction;
  if (Math.abs(slope) < 0.000001) {
    direction = `${names.x}이(가) 변해도 ${names.y}은(는) 거의 변하지 않는 경향이 있습니다.`;
  } else if (slope > 0) {
    direction = `${names.x}이(가) 1 증가할 때 ${names.y}은(는) 약 ${formatNumber(Math.abs(slope))}만큼 증가하는 경향이 있습니다.`;
  } else {
    direction = `${names.x}이(가) 1 증가할 때 ${names.y}은(는) 약 ${formatNumber(Math.abs(slope))}만큼 감소하는 경향이 있습니다.`;
  }
  const strength = rSquared >= 0.8 ? "높은" : rSquared >= 0.5 ? "보통의" : "낮은";
  return `${direction} 이 직선의 결정계수 R²는 ${formatNumber(rSquared, 4)}로, 현재 데이터에 대해 ${strength} 설명력을 보입니다.`;
}

function renderAnalysis() {
  if (!state.model) return;
  els.analysisEmpty.hidden = true;
  els.analysisResult.hidden = false;
  els.equationText.textContent = formatEquation();
  els.slopeValue.textContent = formatNumber(state.model.slope, 4);
  els.interceptValue.textContent = formatNumber(state.model.intercept, 4);
  els.dataCountValue.textContent = `${state.model.n}개`;
  els.rSquaredValue.textContent = formatNumber(state.model.rSquared, 4);
  els.interpretationText.textContent = buildInterpretation();
}

function getGraphRange(values) {
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    const spread = Math.abs(min) * 0.1 || 1;
    min -= spread;
    max += spread;
  } else {
    const padding = (max - min) * 0.1;
    min -= padding;
    max += padding;
  }
  return { min, max };
}

// 캔버스는 화면의 실제 픽셀 밀도에 맞춰 다시 그려 선과 글자가 흐려지지 않게 한다.
// 입력 점의 화면 좌표도 함께 저장하여 마우스 오버 툴팁에 사용한다.
function drawChart() {
  const canvas = els.dataChart;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);

  const width = rect.width;
  const height = rect.height;
  const margin = { top: 34, right: 28, bottom: 62, left: 72 };
  const plotWidth = Math.max(1, width - margin.left - margin.right);
  const plotHeight = Math.max(1, height - margin.top - margin.bottom);
  const { valid } = getValidData();
  state.graphPoints = [];

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  if (valid.length === 0) {
    ctx.fillStyle = "#819087";
    ctx.font = "700 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("유효한 데이터를 입력하면 산점도가 나타납니다.", width / 2, height / 2);
    els.chartCaption.textContent = "유효한 x, y 값을 입력하면 점이 표시됩니다.";
    return;
  }

  const xRange = getGraphRange(valid.map((point) => point.x));
  const yRange = getGraphRange(valid.map((point) => point.y));
  const toX = (x) => margin.left + ((x - xRange.min) / (xRange.max - xRange.min)) * plotWidth;
  const toY = (y) => margin.top + plotHeight - ((y - yRange.min) / (yRange.max - yRange.min)) * plotHeight;

  ctx.strokeStyle = "#e2e9e5";
  ctx.lineWidth = 1;
  ctx.font = "11px sans-serif";
  ctx.fillStyle = "#718077";
  for (let i = 0; i <= 5; i += 1) {
    const ratio = i / 5;
    const x = margin.left + plotWidth * ratio;
    const y = margin.top + plotHeight * ratio;
    ctx.beginPath(); ctx.moveTo(x, margin.top); ctx.lineTo(x, margin.top + plotHeight); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(margin.left, y); ctx.lineTo(margin.left + plotWidth, y); ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillText(formatNumber(xRange.min + (xRange.max - xRange.min) * ratio, 2), x, margin.top + plotHeight + 21);
    ctx.textAlign = "right";
    ctx.fillText(formatNumber(yRange.max - (yRange.max - yRange.min) * ratio, 2), margin.left - 10, y + 4);
  }

  ctx.strokeStyle = "#87978e";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, margin.top + plotHeight);
  ctx.lineTo(margin.left + plotWidth, margin.top + plotHeight);
  ctx.stroke();

  if (state.model && state.showTrend) {
    const yAtMin = state.model.slope * xRange.min + state.model.intercept;
    const yAtMax = state.model.slope * xRange.max + state.model.intercept;
    ctx.save();
    ctx.beginPath();
    ctx.rect(margin.left, margin.top, plotWidth, plotHeight);
    ctx.clip();
    ctx.strokeStyle = "#e0584e";
    ctx.lineWidth = 3;
    ctx.setLineDash([9, 6]);
    ctx.beginPath();
    ctx.moveTo(toX(xRange.min), toY(yAtMin));
    ctx.lineTo(toX(xRange.max), toY(yAtMax));
    ctx.stroke();
    ctx.restore();
  }

  valid.forEach((point) => {
    const x = toX(point.x);
    const y = toY(point.y);
    state.graphPoints.push({ ...point, screenX: x, screenY: y });
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#2d6f9c";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  const names = getAxisNames();
  ctx.fillStyle = "#34453b";
  ctx.font = "800 13px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(names.x, margin.left + plotWidth / 2, height - 15);
  ctx.save();
  ctx.translate(18, margin.top + plotHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(names.y, 0, 0);
  ctx.restore();
  els.chartCaption.textContent = state.model && state.showTrend
    ? `파란 점은 실제 데이터, 붉은 점선은 ${formatEquation()} 추세선입니다.`
    : `${valid.length}개의 데이터 점이 표시되었습니다. 추세선을 만들면 경향을 비교할 수 있습니다.`;
}

function showChartTooltip(event) {
  if (!state.graphPoints.length) return;
  const rect = els.dataChart.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;
  const nearest = state.graphPoints
    .map((point) => ({ point, distance: Math.hypot(point.screenX - mouseX, point.screenY - mouseY) }))
    .sort((a, b) => a.distance - b.distance)[0];
  if (!nearest || nearest.distance > 14) {
    els.chartTooltip.hidden = true;
    return;
  }
  const names = getAxisNames();
  els.chartTooltip.textContent = `${names.x}: ${nearest.point.x} · ${names.y}: ${nearest.point.y}`;
  els.chartTooltip.style.left = `${nearest.point.screenX}px`;
  els.chartTooltip.style.top = `${nearest.point.screenY}px`;
  els.chartTooltip.hidden = false;
}

function predict() {
  if (!state.model) {
    showStatus("먼저 추세선을 만들어 주세요.", "error");
    return;
  }
  const x = Number(els.predictionX.value);
  if (!els.predictionX.value.trim() || !Number.isFinite(x)) {
    showStatus("예측할 x값을 숫자로 입력하세요.", "error");
    els.predictionX.focus();
    return;
  }
  const y = state.model.slope * x + state.model.intercept;
  const names = getAxisNames();
  const record = {
    id: state.nextHistoryId++,
    x,
    y,
    equation: formatEquation(),
    createdAt: new Date(),
  };
  state.history.push(record);
  els.predictionOutput.classList.add("has-result");
  els.predictionOutput.innerHTML = `<span>${escapeHtml(names.x)} = ${formatNumber(x)}일 때</span><strong>${escapeHtml(names.y)} ≈ ${formatNumber(y, 2)}</strong>`;
  renderHistory();
  showStatus(`${state.history.length}번째 예측 결과를 기록했습니다.`);
}

// 예측을 수행할 때마다 식과 시각을 함께 보관해, 이후 추세선을 다시 계산해도
// 당시 사용한 예측 조건이 보고서에 그대로 남도록 한다.
function renderHistory() {
  els.historyRows.replaceChildren();
  els.historyEmpty.hidden = state.history.length > 0;
  state.history.forEach((record, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${formatNumber(record.x)}</td>
      <td><b>${formatNumber(record.y, 2)}</b></td>
      <td>${escapeHtml(record.equation)}</td>
      <td>${escapeHtml(formatDateTime(record.createdAt))}</td>
      <td><button class="icon-button" type="button" data-remove-history="${record.id}" aria-label="${index + 1}번 예측 기록 삭제">×</button></td>
    `;
    els.historyRows.append(tr);
  });
}

function fillInterpretationDraft() {
  if (!state.model) {
    showStatus("자동 초안을 만들려면 먼저 추세선을 만들어 주세요.", "warning");
    return;
  }
  els.reportInterpretation.value = `${buildInterpretation()} y절편은 ${formatNumber(state.model.intercept)}이며, 이는 x가 0일 때 예상되는 y값이다. 다만 분석한 범위를 크게 벗어난 값의 예측에는 주의해야 한다.`;
  showStatus("추세선 해석 초안을 작성했습니다. 나의 말로 다듬어 보세요.");
}

function getPredictionSummary() {
  const names = getAxisNames();
  if (state.history.length === 0) return "아직 수행한 예측이 없다.";
  return state.history.map((record, index) => `${index + 1}) ${names.x}이(가) ${formatNumber(record.x)}일 때 ${names.y}은(는) 약 ${formatNumber(record.y, 2)}로 예측되었다.`).join("\n");
}

function fillPredictionSummaryDraft() {
  els.reportPredictionSummary.value = getPredictionSummary();
  showStatus(state.history.length ? "예측 결과 초안을 작성했습니다." : "예측 기록이 없어 안내 문장을 작성했습니다.", state.history.length ? "normal" : "warning");
}

function makeGraphImageWithTrend() {
  const previous = state.showTrend;
  state.showTrend = Boolean(state.model);
  drawChart();
  const image = els.dataChart.toDataURL("image/png");
  state.showTrend = previous;
  drawChart();
  return image;
}

function buildReport() {
  if (!state.model) {
    showStatus("보고서를 만들려면 먼저 추세선을 계산해 주세요.", "error");
    return false;
  }
  const { valid } = getValidData();
  const names = getAxisNames();
  const chartImage = makeGraphImageWithTrend();
  const dataRows = valid.map((point, index) => `<tr><td>${index + 1}</td><td>${formatNumber(point.x, 4)}</td><td>${formatNumber(point.y, 4)}</td></tr>`).join("");
  const historyRows = state.history.map((record, index) => `<tr><td>${index + 1}</td><td>${formatNumber(record.x)}</td><td>${formatNumber(record.y, 2)}</td><td>${escapeHtml(record.equation)}</td><td>${escapeHtml(formatDateTime(record.createdAt))}</td></tr>`).join("");
  const text = (element, fallback = "작성하지 않음") => escapeHtml(element.value.trim() || fallback);

  els.reportDocument.innerHTML = `
    <header class="report-header">
      <h1>${text(els.reportTopic, "데이터의 경향성을 이용한 예측 탐구")}</h1>
      <p>작성 날짜 · ${escapeHtml(new Intl.DateTimeFormat("ko-KR", { dateStyle: "long" }).format(new Date()))}</p>
    </header>
    <h2>1. 탐구 개요</h2>
    <h3>탐구 목적</h3><p>${text(els.reportPurpose)}</p>
    <h3>자료 설명</h3><p>${text(els.reportDataDescription)}</p>
    <h3>분석 변수</h3><p>x축: ${escapeHtml(names.x)} / y축: ${escapeHtml(names.y)}</p>
    <h2>2. 입력 데이터</h2>
    <table><thead><tr><th>번호</th><th>${escapeHtml(names.x)}</th><th>${escapeHtml(names.y)}</th></tr></thead><tbody>${dataRows}</tbody></table>
    <h2>3. 산점도와 추세선</h2>
    <img class="report-chart" src="${chartImage}" alt="입력 데이터 산점도와 직선 추세선" />
    <div class="report-equation">${escapeHtml(formatEquation())}</div>
    <p class="report-note">기울기 a = ${formatNumber(state.model.slope, 4)} · y절편 b = ${formatNumber(state.model.intercept, 4)} · 데이터 수 n = ${state.model.n} · 결정계수 R² = ${formatNumber(state.model.rSquared, 4)}</p>
    <h3>추세선 해석</h3><p>${text(els.reportInterpretation, buildInterpretation())}</p>
    <h2>4. 예측 기록</h2>
    <table><thead><tr><th>번호</th><th>예측 x</th><th>예측 y</th><th>사용한 식</th><th>예측 시간</th></tr></thead><tbody>${historyRows || '<tr><td colspan="5">예측 기록 없음</td></tr>'}</tbody></table>
    <h3>예측 결과 정리</h3><p>${text(els.reportPredictionSummary, getPredictionSummary())}</p>
    <h2>5. 탐구를 마치며</h2>
    <h3>배운 점</h3><p>${text(els.reportLearned)}</p>
    <h3>더 알고 싶은 점</h3><p>${text(els.reportQuestion)}</p>
    <p class="report-note">추세선은 현재 데이터의 전체적인 경향을 보여 주는 수학적 모델입니다. 데이터 범위를 크게 벗어난 예측은 실제 결과와 다를 수 있습니다.</p>
  `;
  els.reportPreviewShell.hidden = false;
  showStatus("보고서 미리보기를 새로 만들었습니다.");
  return true;
}

function waitForPaint() {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function setPdfBusy(isBusy) {
  els.downloadPdfButton.disabled = isBusy;
  els.buildReportButton.disabled = isBusy;
  els.pdfProgress.hidden = !isBusy;
  els.downloadPdfButton.textContent = isBusy ? "생성 중…" : "PDF로 다운로드";
}

// 긴 보고서는 A4 한 페이지 높이에 맞춰 캔버스를 여러 조각으로 잘라 넣는다.
// 이 방식은 페이지 경계에서 전체 그래프가 잘려 사라지는 문제를 줄이고 여러 페이지 저장을 지원한다.
async function downloadPdf() {
  if (!window.html2canvas || !window.jspdf?.jsPDF) {
    showStatus("PDF 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.", "error");
    return;
  }
  if (!buildReport()) return;
  setPdfBusy(true);

  try {
    await waitForPaint();
    const canvas = await window.html2canvas(els.reportDocument, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");
    const margin = 8;
    const pageWidth = 210;
    const pageHeight = 297;
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = pageHeight - margin * 2;
    const pixelsPerPage = Math.floor((contentHeight / contentWidth) * canvas.width);
    let sourceY = 0;
    let page = 0;

    while (sourceY < canvas.height) {
      const sliceHeight = Math.min(pixelsPerPage, canvas.height - sourceY);
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = sliceHeight;
      const sliceContext = slice.getContext("2d");
      sliceContext.fillStyle = "#ffffff";
      sliceContext.fillRect(0, 0, slice.width, slice.height);
      sliceContext.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
      if (page > 0) pdf.addPage();
      const renderedHeight = (sliceHeight * contentWidth) / canvas.width;
      pdf.addImage(slice.toDataURL("image/jpeg", 0.96), "JPEG", margin, margin, contentWidth, renderedHeight);
      sourceY += sliceHeight;
      page += 1;
    }

    const date = new Date().toISOString().slice(0, 10);
    pdf.save(`추세선_탐구보고서_${date}.pdf`);
    showStatus(`보고서를 ${page}쪽 PDF로 저장했습니다.`);
  } catch (error) {
    console.error(error);
    showStatus("PDF를 만드는 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.", "error");
  } finally {
    setPdfBusy(false);
  }
}

function handleAxisNameChange() {
  renderRows();
  if (state.model) renderAnalysis();
  els.reportPreviewShell.hidden = true;
}

function toggleReportBuilder() {
  const willOpen = els.reportBuilder.hidden;
  els.reportBuilder.hidden = !willOpen;
  els.openReportButton.setAttribute("aria-expanded", String(willOpen));
  els.openReportButton.textContent = willOpen ? "작성 영역 닫기" : "보고서 작성";
}

function clearHistory() {
  if (state.history.length === 0) {
    showStatus("삭제할 예측 기록이 없습니다.", "warning");
    return;
  }
  if (!window.confirm("모든 예측 기록을 삭제할까요?")) return;
  state.history = [];
  renderHistory();
  els.reportPreviewShell.hidden = true;
  showStatus("예측 기록을 모두 삭제했습니다.");
}

function wireGithubLinks() {
  document.querySelectorAll("[data-github-link]").forEach((link) => {
    link.href = MANUAL_GITHUB_REPOSITORY_URL;
  });
}

function wireEvents() {
  els.dataRows.addEventListener("input", handleDataInput);
  els.dataRows.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-row]");
    if (button) removeRow(Number(button.dataset.removeRow));
  });
  els.addRowButton.addEventListener("click", addRow);
  els.clearDataButton.addEventListener("click", clearData);
  els.loadSampleButton.addEventListener("click", loadSample);
  els.applyPasteButton.addEventListener("click", applyPastedData);
  els.xAxisName.addEventListener("input", handleAxisNameChange);
  els.yAxisName.addEventListener("input", handleAxisNameChange);
  els.calculateButton.addEventListener("click", calculateTrendline);
  els.trendToggle.addEventListener("change", () => {
    state.showTrend = els.trendToggle.checked;
    drawChart();
  });
  els.dataChart.addEventListener("mousemove", showChartTooltip);
  els.dataChart.addEventListener("mouseleave", () => { els.chartTooltip.hidden = true; });
  els.predictButton.addEventListener("click", predict);
  els.predictionX.addEventListener("keydown", (event) => { if (event.key === "Enter") predict(); });
  els.historyRows.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-history]");
    if (!button) return;
    state.history = state.history.filter((record) => record.id !== Number(button.dataset.removeHistory));
    renderHistory();
    els.reportPreviewShell.hidden = true;
  });
  els.clearHistoryButton.addEventListener("click", clearHistory);
  els.openReportButton.addEventListener("click", toggleReportBuilder);
  els.fillInterpretationButton.addEventListener("click", fillInterpretationDraft);
  els.fillPredictionSummaryButton.addEventListener("click", fillPredictionSummaryDraft);
  els.buildReportButton.addEventListener("click", buildReport);
  els.downloadPdfButton.addEventListener("click", downloadPdf);

  const resizeObserver = new ResizeObserver(() => drawChart());
  resizeObserver.observe(els.chartShell);
}

resetRows();
wireEvents();
wireGithubLinks();
renderRows();
renderHistory();
