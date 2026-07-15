"use strict";

const M = window.GraphFramingModel;
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const STORAGE_KEY = "graph-framing-lab-presets-v1";
const NOTE_KEY = "graph-framing-lab-notes-v1";
const SVG_NS = "http://www.w3.org/2000/svg";

const PALETTES = {
  accessible: ["#0072b2", "#d55e00", "#009e73", "#cc79a7", "#6f5a00", "#59636b", "#56b4e9", "#8c564b"],
  headline: ["#d64f45", "#2a70a1", "#e2a128", "#7356a3", "#13866d", "#9b5962", "#54636b", "#c66f24"],
  mono: ["#223640", "#223640", "#223640", "#223640", "#223640", "#223640", "#223640", "#223640"]
};
const DASHES = ["", "9 5", "2 4", "11 4 2 4", "5 3", "12 3", "2 2", "8 3 2 3"];
const SHAPES = ["circle", "square", "triangle", "diamond", "circle", "square", "triangle", "diamond"];

const MISSION_LABELS = {
  yAxis: "y축 범위 자르기",
  unit: "축 단위 바꾸기",
  xRange: "x축 범위 선택",
  sparse: "희박 구간 처리",
  ci: "신뢰구간 숨기기",
  line: "선·기울기 강조",
  groups: "일부 집단 숨기기",
  model: "응답 범주 합치기"
};

const MISSIONS = [
  {
    title: "차이가 아주 큰 것처럼 보이는 이유를 찾으세요.",
    changes: { yMin: 0.55, yMax: 0.85, showCI: false, lineWidth: 8, emphasizeSlope: true, xMax: 8, includeSparse: false },
    answers: ["yAxis", "xRange", "sparse", "ci", "line"]
  },
  {
    title: "비교 대상이 달라진 흔적을 찾으세요.",
    changes: { xMin: 3, xMax: 10, includeSparse: false, showCI: true, lineWidth: 4, palette: "headline", visibleGroups: ["집단 A", "집단 C"] },
    answers: ["xRange", "sparse", "groups"]
  },
  {
    title: "숫자의 의미와 응답 정의가 어떻게 바뀌었나요?",
    changes: { yMin: 0.5, yMax: 0.98, axisUnit: "score10", analysisMode: "binary", showCI: false, lineWidth: 6 },
    answers: ["yAxis", "unit", "ci", "model", "line"]
  },
  {
    title: "차분해 보이는 단색 그래프에도 프레이밍이 있을까요?",
    changes: { yMin: 0.58, yMax: 0.86, xMin: 4, xMax: 8, includeSparse: false, palette: "mono", lineWidth: 7, emphasizeSlope: true },
    answers: ["yAxis", "xRange", "sparse", "line"]
  }
];

function makeSyntheticRows() {
  const groups = [
    { name: "집단 A", binary: (x) => 0.81 - 0.028 * (x - 1), strong: (x) => 0.30 - 0.008 * (x - 1) },
    { name: "집단 B", binary: (x) => 0.70 + 0.006 * (x - 1), strong: (x) => 0.23 + 0.006 * (x - 1) },
    { name: "집단 C", binary: (x) => 0.64 + 0.032 * (x - 1), strong: (x) => 0.20 + 0.014 * (x - 1) },
    { name: "집단 D", binary: (x) => 0.68 + 0.023 * (x - 1), strong: (x) => 0.19 + 0.012 * (x - 1) }
  ];
  const sampleSizes = [30, 45, 62, 78, 85, 78, 55, 32, 6, 1];
  return groups.flatMap((group) => sampleSizes.map((n, index) => {
    const x = index + 1;
    const positive = M.clamp(group.binary(x), 0.08, 0.96);
    const strongShare = M.clamp(group.strong(x), 0.12, 0.48);
    const strongYes = positive * strongShare;
    const yes = positive - strongYes;
    const strongNo = (1 - positive) * 0.14;
    const no = 1 - positive - strongNo;
    return M.normalizeRow({ group: group.name, x, n, strongYes, yes, no, strongNo });
  }));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function rangeOf(rows) {
  const xs = M.xValues(rows);
  return { min: Math.min(...xs), max: Math.max(...xs) };
}

function inferSparseThreshold(rows) {
  const totals = M.xValues(rows).map((x) => rows.filter((row) => row.x === x).reduce((sum, row) => sum + row.n, 0)).sort((left, right) => left - right);
  const middle = Math.floor(totals.length / 2);
  const median = totals.length % 2 ? totals[middle] : (totals[middle - 1] + totals[middle]) / 2;
  return Math.max(3, median * 0.2);
}

function makeSafeState(rows) {
  const range = rangeOf(rows);
  return {
    yMin: 0,
    yMax: 1,
    axisUnit: "probability",
    xMin: range.min,
    xMax: range.max,
    includeSparse: true,
    sparseThreshold: inferSparseThreshold(rows),
    showCI: true,
    analysisMode: "ordinal",
    sampleScale: 1,
    lineWidth: 3,
    palette: "accessible",
    emphasizeSlope: false,
    visibleGroups: M.groupNames(rows)
  };
}

function makeHeadlineState(rows) {
  const base = makeSafeState(rows);
  const denseXs = M.xValues(rows).filter((x) => !M.sparseXValues(rows, base.sparseThreshold).includes(x));
  return {
    ...base,
    yMin: 0.45,
    yMax: 0.9,
    xMax: Math.max(...denseXs),
    includeSparse: false,
    showCI: false,
    lineWidth: 7,
    palette: "headline",
    emphasizeSlope: true
  };
}

const state = {
  rows: makeSyntheticRows(),
  datasetName: "익명 수업 참여 의향 · 합성자료",
  mode: "experiment",
  edited: null,
  experimentState: null,
  missionIndex: -1,
  activeMission: null
};
state.edited = makeHeadlineState(state.rows);

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function styleForGroup(index, paletteName) {
  return {
    color: (PALETTES[paletteName] || PALETTES.accessible)[index % 8],
    dash: DASHES[index % DASHES.length],
    shape: SHAPES[index % SHAPES.length]
  };
}

function pointShape(shape, x, y, color, size = 5) {
  if (shape === "square") return `<rect x="${(x - size).toFixed(2)}" y="${(y - size).toFixed(2)}" width="${size * 2}" height="${size * 2}" rx="1" fill="${color}" stroke="#fffef9" stroke-width="2" />`;
  if (shape === "triangle") return `<path d="M ${x.toFixed(2)} ${(y - size - 1).toFixed(2)} L ${(x + size + 1).toFixed(2)} ${(y + size).toFixed(2)} L ${(x - size - 1).toFixed(2)} ${(y + size).toFixed(2)} Z" fill="${color}" stroke="#fffef9" stroke-width="2" />`;
  if (shape === "diamond") return `<path d="M ${x.toFixed(2)} ${(y - size - 1).toFixed(2)} L ${(x + size + 1).toFixed(2)} ${y.toFixed(2)} L ${x.toFixed(2)} ${(y + size + 1).toFixed(2)} L ${(x - size - 1).toFixed(2)} ${y.toFixed(2)} Z" fill="${color}" stroke="#fffef9" stroke-width="2" />`;
  return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${size}" fill="${color}" stroke="#fffef9" stroke-width="2" />`;
}

function renderChart(container, rows, chartState, id) {
  const width = 720;
  const height = 430;
  const plot = { left: 66, right: 690, top: 48, bottom: 334 };
  const summary = M.summarize(rows, chartState);
  const xs = summary.xValues;
  const xMin = xs.length ? Math.min(...xs) : chartState.xMin;
  const xMax = xs.length ? Math.max(...xs) : chartState.xMax;
  const xSpan = Math.max(xMax - xMin, 1);
  const ySpan = Math.max(chartState.yMax - chartState.yMin, 0.01);
  const xScale = (value) => plot.left + ((value - xMin) / xSpan) * (plot.right - plot.left);
  const yScale = (value) => plot.bottom - ((value - chartState.yMin) / ySpan) * (plot.bottom - plot.top);
  const yTicks = Array.from({ length: 6 }, (_, index) => chartState.yMin + (ySpan * index) / 5);
  const tickStep = Math.max(1, Math.ceil(xs.length / 10));
  const xTicks = xs.filter((_, index) => index % tickStep === 0 || index === xs.length - 1);
  const allGroups = M.groupNames(rows);
  const clipId = `chart-clip-${id}`;
  const sparseXs = new Set(summary.sparseXs);
  const stepWidth = xs.length > 1 ? Math.abs(xScale(xs[1]) - xScale(xs[0])) : 50;

  let markup = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${id}-title ${id}-desc" xmlns="${SVG_NS}">
    <title id="${id}-title">${escapeHtml(state.datasetName)} 선 그래프</title>
    <desc id="${id}-desc">${escapeHtml(M.axisTitle(chartState.axisUnit, chartState.analysisMode))}. ${summary.series.length}개 집단, ${summary.xValues.length}개 x값을 표시합니다.</desc>
    <defs><clipPath id="${clipId}"><rect x="${plot.left}" y="${plot.top}" width="${plot.right - plot.left}" height="${plot.bottom - plot.top}" /></clipPath></defs>
    <text class="chart-title" x="${plot.left}" y="26">${escapeHtml(state.datasetName)}</text>`;

  xs.filter((x) => sparseXs.has(x)).forEach((x) => {
    markup += `<rect class="sparse-band" x="${Math.max(plot.left, xScale(x) - stepWidth * 0.43).toFixed(2)}" y="${plot.top}" width="${Math.min(stepWidth * 0.86, plot.right - plot.left).toFixed(2)}" height="${plot.bottom - plot.top}" />`;
  });
  if (xs.some((x) => sparseXs.has(x))) markup += `<text class="sparse-label" x="${plot.right - 5}" y="${plot.top + 14}" text-anchor="end">표본이 적은 구간</text>`;

  yTicks.forEach((value) => {
    const y = yScale(value);
    markup += `<line class="grid" x1="${plot.left}" x2="${plot.right}" y1="${y.toFixed(2)}" y2="${y.toFixed(2)}" /><text class="axis-label" x="${plot.left - 10}" y="${(y + 3).toFixed(2)}" text-anchor="end">${escapeHtml(M.formatAxisValue(value, chartState.axisUnit))}</text>`;
  });
  xTicks.forEach((value) => {
    const x = xScale(value);
    markup += `<line class="grid" x1="${x.toFixed(2)}" x2="${x.toFixed(2)}" y1="${plot.top}" y2="${plot.bottom}" /><text class="axis-label" x="${x.toFixed(2)}" y="${plot.bottom + 20}" text-anchor="middle">${escapeHtml(Number(value).toLocaleString("ko-KR"))}</text>`;
  });
  markup += `<line class="axis" x1="${plot.left}" x2="${plot.right}" y1="${plot.bottom}" y2="${plot.bottom}" /><line class="axis" x1="${plot.left}" x2="${plot.left}" y1="${plot.top}" y2="${plot.bottom}" />
    <text class="axis-title" x="${(plot.left + plot.right) / 2}" y="${plot.bottom + 43}" text-anchor="middle">자기평가 수준 (x)</text>
    <text class="axis-title" x="17" y="${(plot.top + plot.bottom) / 2}" text-anchor="middle" transform="rotate(-90 17 ${(plot.top + plot.bottom) / 2})">${escapeHtml(M.axisTitle(chartState.axisUnit, chartState.analysisMode))}</text>
    <g clip-path="url(#${clipId})">`;

  summary.series.forEach((series, visibleIndex) => {
    const groupIndex = Math.max(0, allGroups.indexOf(series.group));
    const style = styleForGroup(groupIndex, chartState.palette);
    if (chartState.showCI) {
      series.points.forEach((point) => {
        const x = xScale(point.x);
        const low = yScale(point.low);
        const high = yScale(point.high);
        markup += `<g class="ci" stroke="${style.color}" stroke-width="1.6"><line x1="${x}" x2="${x}" y1="${high}" y2="${low}" /><line x1="${x - 5}" x2="${x + 5}" y1="${high}" y2="${high}" /><line x1="${x - 5}" x2="${x + 5}" y1="${low}" y2="${low}" /></g>`;
      });
    }
    const path = series.points.map((point, index) => `${index ? "L" : "M"} ${xScale(point.x).toFixed(2)} ${yScale(point.value).toFixed(2)}`).join(" ");
    markup += `<path d="${path}" fill="none" stroke="${style.color}" stroke-width="${chartState.lineWidth}" stroke-linecap="round" stroke-linejoin="round"${style.dash ? ` stroke-dasharray="${style.dash}"` : ""} />`;
    series.points.forEach((point) => { markup += pointShape(style.shape, xScale(point.x), yScale(point.value), style.color, chartState.lineWidth >= 7 ? 6 : 5); });
    if (chartState.emphasizeSlope && series.points.length > 1) {
      const first = series.points[0];
      const last = series.points[series.points.length - 1];
      const change = (last.value - first.value) * 100;
      markup += `<circle cx="${xScale(last.x)}" cy="${yScale(last.value)}" r="12" fill="none" stroke="${style.color}" stroke-width="3" opacity=".45" /><text class="slope-label" x="${xScale(last.x) - 7}" y="${yScale(last.value) - 14}" text-anchor="end" fill="${style.color}">${change >= 0 ? "+" : ""}${change.toFixed(1)}%p</text>`;
    }
  });
  markup += "</g>";

  summary.series.forEach((series, index) => {
    const groupIndex = Math.max(0, allGroups.indexOf(series.group));
    const style = styleForGroup(groupIndex, chartState.palette);
    const legendX = plot.left + (index % 4) * 150;
    const legendY = 397 + Math.floor(index / 4) * 19;
    markup += `<line x1="${legendX}" x2="${legendX + 24}" y1="${legendY - 3}" y2="${legendY - 3}" stroke="${style.color}" stroke-width="3"${style.dash ? ` stroke-dasharray="${style.dash}"` : ""} />${pointShape(style.shape, legendX + 12, legendY - 3, style.color, 3.5)}<text class="legend-label" x="${legendX + 31}" y="${legendY}">${escapeHtml(series.group.slice(0, 14))}</text>`;
  });
  markup += "</svg>";
  container.innerHTML = markup;
  return summary;
}

function renderTable(container, rows, chartState) {
  const series = M.seriesFor(rows, chartState);
  const body = series.flatMap((item) => item.points.map((point) => `<tr><td>${escapeHtml(item.group)}</td><td>${escapeHtml(point.x)}</td><td>${M.formatAxisValue(point.value, chartState.axisUnit)}</td><td>${M.formatAxisValue(point.low, chartState.axisUnit)}~${M.formatAxisValue(point.high, chartState.axisUnit)}</td><td>${point.n.toLocaleString("ko-KR")}</td></tr>`)).join("");
  container.innerHTML = `<table><thead><tr><th>집단</th><th>x</th><th>요약값</th><th>95% 구간</th><th>n</th></tr></thead><tbody>${body}</tbody></table>`;
}

function stateDescription(chartState) {
  const groups = `${chartState.visibleGroups.length}/${M.groupNames(state.rows).length}개 집단`;
  const ci = chartState.showCI ? "95% 구간 표시" : "95% 구간 숨김";
  const model = chartState.analysisMode === "binary" ? "응답 2범주 통합" : "응답 4범주 유지";
  const sparse = chartState.includeSparse ? "희박 구간 포함" : "희박 구간 제외";
  return `${M.formatAxisValue(chartState.yMin, chartState.axisUnit)}~${M.formatAxisValue(chartState.yMax, chartState.axisUnit)} y축 · ${chartState.xMin}~${chartState.xMax} x축 · ${groups} · ${ci} · ${sparse} · ${model}`;
}

function renderSignals(chartState, summary) {
  const signals = M.evaluateSignals(state.rows, chartState);
  $("#signalList").innerHTML = signals.map((signal) => `<article class="signal-card" data-level="${signal.level}"><h3>${escapeHtml(signal.title)}</h3><p>${escapeHtml(signal.evidence)}</p></article>`).join("");
  const nonGood = signals.filter((signal) => signal.level !== "good");
  $("#editedBadge").className = `status-badge${signals.some((signal) => signal.level === "risk") ? " status-badge--risk" : ""}`;
  $("#editedBadge").textContent = nonGood.length ? `확인 신호 ${nonGood.length}` : "충분한 정보";
  $("#sentenceEdit").textContent = nonGood.length ? nonGood.slice(0, 3).map((signal) => signal.title).join(", ") : "충분한 정보 표시";
  $("#sentenceGap").textContent = `${(summary.actualGap * 100).toFixed(1)}%p`;
  $("#sentenceCI").textContent = summary.ciOverlap === null ? "비교할 수 없음" : summary.ciOverlap ? "겹침" : "겹치지 않음";
}

function renderMetrics(summary) {
  $("#actualDifference").textContent = `${(summary.actualGap * 100).toFixed(1)}%p`;
  $("#amplification").textContent = `${summary.visualAmplification.toFixed(1)}배`;
  $("#ciOverlap").textContent = summary.ciOverlap === null ? "비교 불가" : summary.ciOverlap ? "겹침" : "겹치지 않음";
  $("#sampleCount").textContent = `${summary.totalN.toLocaleString("ko-KR")}명`;
  $("#sampleNote").textContent = `${summary.visiblePointCount}개 집단×구간 점의 유효 표본 합`;
  $("#modelSummary").textContent = state.edited.analysisMode === "binary" ? "2범주 통합" : "4범주 유지";
}

function renderControls() {
  const controlValues = {
    yMinInput: state.edited.yMin,
    yMaxInput: state.edited.yMax,
    axisUnitSelect: state.edited.axisUnit,
    xMinInput: state.edited.xMin,
    xMaxInput: state.edited.xMax,
    analysisModeSelect: state.edited.analysisMode,
    sampleScaleRange: Math.round(state.edited.sampleScale * 100),
    lineWidthRange: state.edited.lineWidth,
    paletteSelect: state.edited.palette
  };
  Object.entries(controlValues).forEach(([id, value]) => { if ($( `#${id}`)) $( `#${id}`).value = value; });
  $("#sparseToggle").checked = state.edited.includeSparse;
  $("#ciToggle").checked = state.edited.showCI;
  $("#slopeToggle").checked = state.edited.emphasizeSlope;
  $("#lineWidthOutput").textContent = `${state.edited.lineWidth} px`;
  const total = state.rows.reduce((sum, row) => sum + Math.max(2, Math.round(row.n * state.edited.sampleScale)), 0);
  $("#sampleScaleOutput").textContent = `${total.toLocaleString("ko-KR")}명`;
  $("#modelNote").textContent = state.edited.analysisMode === "binary"
    ? "‘매우 그렇다+그렇다’를 긍정, 나머지를 부정으로 합칩니다. 읽기 쉬워지지만 네 범주의 정보가 줄어듭니다."
    : "네 응답의 순서를 남긴 기대점수를 0~1로 표준화합니다. 실제 회귀모형을 적합하는 기능은 아닙니다.";
}

function renderGroupControls() {
  const groups = M.groupNames(state.rows);
  $("#groupControls").innerHTML = groups.map((group, index) => {
    const style = styleForGroup(index, state.edited.palette);
    return `<label><input type="checkbox" value="${escapeHtml(group)}" ${state.edited.visibleGroups.includes(group) ? "checked" : ""} /><span style="color:${style.color}">●</span>${escapeHtml(group)}</label>`;
  }).join("");
}

function renderAll() {
  const originalState = makeSafeState(state.rows);
  const originalSummary = renderChart($("#originalChart"), state.rows, originalState, "original");
  const editedSummary = renderChart($("#editedChart"), state.rows, state.edited, "edited");
  renderTable($("#originalTable"), state.rows, originalState);
  renderTable($("#editedTable"), state.rows, state.edited);
  $("#originalCaption").textContent = `0~1 전체 축 · ${originalSummary.series.length}개 집단 · 95% 구간 · 희박 구간 음영 · 4범주 유지`;
  $("#editedCaption").textContent = stateDescription(state.edited);
  renderMetrics(editedSummary);
  renderSignals(state.edited, editedSummary);
  renderControls();
  renderGroupControls();
}

function normalizeEditedState(next) {
  const range = rangeOf(state.rows);
  const allGroups = M.groupNames(state.rows);
  const yMin = M.clamp(Number(next.yMin), 0, 0.95);
  const yMax = M.clamp(Number(next.yMax), 0.05, 1);
  const xMin = M.clamp(Number(next.xMin), range.min, range.max);
  const xMax = M.clamp(Number(next.xMax), range.min, range.max);
  const visibleGroups = (next.visibleGroups || allGroups).filter((group) => allGroups.includes(group));
  return {
    ...makeSafeState(state.rows),
    ...next,
    yMin: Math.min(yMin, yMax - 0.05),
    yMax: Math.max(yMax, yMin + 0.05),
    xMin: Math.min(xMin, xMax),
    xMax: Math.max(xMax, xMin),
    sampleScale: M.clamp(Number(next.sampleScale) || 1, 0.25, 2),
    lineWidth: M.clamp(Math.round(Number(next.lineWidth) || 3), 1, 9),
    visibleGroups: visibleGroups.length ? visibleGroups : [allGroups[0]]
  };
}

function readControls() {
  state.edited = normalizeEditedState({
    ...state.edited,
    yMin: $("#yMinInput").value,
    yMax: $("#yMaxInput").value,
    axisUnit: $("#axisUnitSelect").value,
    xMin: $("#xMinInput").value,
    xMax: $("#xMaxInput").value,
    includeSparse: $("#sparseToggle").checked,
    showCI: $("#ciToggle").checked,
    analysisMode: $("#analysisModeSelect").value,
    sampleScale: Number($("#sampleScaleRange").value) / 100,
    lineWidth: $("#lineWidthRange").value,
    palette: $("#paletteSelect").value,
    emphasizeSlope: $("#slopeToggle").checked
  });
  renderAll();
}

function setEdited(next, message) {
  state.edited = normalizeEditedState(next);
  renderAll();
  if (message) showToast(message);
}

function configureRangeInputs() {
  const range = rangeOf(state.rows);
  [$("#xMinInput"), $("#xMaxInput")].forEach((input) => {
    input.min = range.min;
    input.max = range.max;
    input.step = Number.isInteger(range.min) && Number.isInteger(range.max) ? "1" : "any";
  });
}

function rowsToCSV(rows) {
  const header = "group,x,n,strong_yes,yes,no,strong_no";
  return [header, ...rows.map((row) => [row.group, row.x, row.n, row.strongYes, row.yes, row.no, row.strongNo].map((value) => typeof value === "string" && /[,\"\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : typeof value === "number" ? Number(value.toFixed(6)) : value).join(","))].join("\n");
}

function downloadText(filename, text, type = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function applyCSV(text, datasetName = "내 CSV 자료") {
  const rows = M.parseCSV(text);
  state.rows = rows;
  state.datasetName = datasetName;
  state.edited = makeHeadlineState(rows);
  state.experimentState = null;
  configureRangeInputs();
  $("#csvTextarea").value = rowsToCSV(rows);
  renderAll();
}

function readPresets() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writePresets(presets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

function renderPresetOptions(selected = "") {
  const names = Object.keys(readPresets()).sort((left, right) => left.localeCompare(right, "ko"));
  $("#presetSelect").innerHTML = names.length ? `<option value="">프리셋 선택</option>${names.map((name) => `<option value="${escapeHtml(name)}"${name === selected ? " selected" : ""}>${escapeHtml(name)}</option>`).join("")}` : '<option value="">저장된 프리셋 없음</option>';
}

function setStatus(element, message, type = "") {
  element.textContent = message;
  element.className = `form-status${type ? ` is-${type}` : ""}`;
}

let toastTimer;
function showToast(message) {
  window.clearTimeout(toastTimer);
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  toastTimer = window.setTimeout(() => $("#toast").classList.remove("show"), 1900);
}

function noteReady() {
  return $("#originalMessage").value.trim().length >= 8 && $("#editedMessage").value.trim().length >= 8;
}

function saveNotes() {
  if (state.mode !== "experiment") return;
  try {
    localStorage.setItem(NOTE_KEY, JSON.stringify({ original: $("#originalMessage").value, edited: $("#editedMessage").value, final: $("#finalInterpretation").value }));
  } catch {}
}

function loadNotes() {
  try {
    const notes = JSON.parse(localStorage.getItem(NOTE_KEY) || "{}");
    $("#originalMessage").value = notes.original || "";
    $("#editedMessage").value = notes.edited || "";
    $("#finalInterpretation").value = notes.final || "";
  } catch {}
}

function updateWritingStatus() {
  const ready = noteReady();
  $("#writingStatus").classList.toggle("is-ready", ready);
  $("#writingStatus").textContent = ready ? "두 메시지를 기록했습니다. 이제 편집 근거를 확인하세요." : "각 그래프의 메시지를 8자 이상 쓰면 미션 답안이 열립니다.";
  if (state.mode === "mission") $("#missionAnswers").disabled = !ready;
}

function updateModeUI() {
  $$('[data-mode]').forEach((button) => {
    const active = button.dataset.mode === state.mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const mission = state.mode === "mission";
  $("#missionBanner").hidden = !mission;
  $("#missionQuiz").hidden = !mission;
  $("#editorControls").disabled = mission;
  $("#editedChartTitle").textContent = mission ? "숨겨진 편집 설정" : "선택한 설정을 적용";
  updateWritingStatus();
}

function startMission(next = true) {
  if (state.mode !== "mission") state.experimentState = clone(state.edited);
  state.mode = "mission";
  if (next) state.missionIndex = (state.missionIndex + 1) % MISSIONS.length;
  if (state.missionIndex < 0) state.missionIndex = 0;
  state.activeMission = MISSIONS[state.missionIndex];
  const safe = makeSafeState(state.rows);
  const availableGroups = M.groupNames(state.rows);
  const changes = clone(state.activeMission.changes);
  if (changes.visibleGroups) changes.visibleGroups = changes.visibleGroups.filter((group) => availableGroups.includes(group));
  if (changes.visibleGroups && changes.visibleGroups.length < 2) changes.visibleGroups = availableGroups.slice(0, 2);
  state.edited = normalizeEditedState({ ...safe, ...changes });
  $("#missionNumber").textContent = state.missionIndex + 1;
  $("#missionTitle").textContent = state.activeMission.title;
  $("#originalMessage").value = "";
  $("#editedMessage").value = "";
  $$('#missionAnswers input').forEach((input) => { input.checked = false; });
  $("#quizResult").hidden = true;
  updateModeUI();
  renderAll();
}

function setMode(mode) {
  if (mode === "mission") {
    startMission(true);
    return;
  }
  state.mode = "experiment";
  state.activeMission = null;
  state.edited = normalizeEditedState(state.experimentState || makeHeadlineState(state.rows));
  loadNotes();
  updateModeUI();
  renderAll();
}

function bindEvents() {
  ["yMinInput", "yMaxInput", "axisUnitSelect", "xMinInput", "xMaxInput", "sparseToggle", "ciToggle", "analysisModeSelect", "sampleScaleRange", "lineWidthRange", "paletteSelect", "slopeToggle"].forEach((id) => {
    $( `#${id}`).addEventListener(id.includes("Range") ? "input" : "change", readControls);
  });

  $("#groupControls").addEventListener("change", (event) => {
    if (!event.target.matches('input[type="checkbox"]')) return;
    const selected = $$('#groupControls input:checked').map((input) => input.value);
    if (!selected.length) {
      event.target.checked = true;
      showToast("비교할 집단을 한 개 이상 남겨 주세요.");
      return;
    }
    state.edited.visibleGroups = selected;
    renderAll();
  });

  $("#safePresetButton").addEventListener("click", () => setEdited(makeSafeState(state.rows), "충분한 정보 프리셋을 적용했습니다."));
  $("#broadcastPresetButton").addEventListener("click", () => setEdited(makeHeadlineState(state.rows), "강한 헤드라인 프리셋을 적용했습니다."));
  $("#sparsePresetButton").addEventListener("click", () => setEdited({ ...makeSafeState(state.rows), yMin: .35, yMax: 1, lineWidth: 4, emphasizeSlope: true }, "희박 구간을 포함했습니다. 넓어진 오차막대를 확인하세요."));
  $("#resetButton").addEventListener("click", () => setEdited(makeHeadlineState(state.rows), "처음 상태로 돌아왔습니다."));

  $$('[data-mode]').forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
  $("#heroMissionButton").addEventListener("click", () => { startMission(true); $("#compare").scrollIntoView({ behavior: "smooth" }); });
  $("#newMissionButton").addEventListener("click", () => startMission(true));
  [$("#originalMessage"), $("#editedMessage")].forEach((textarea) => textarea.addEventListener("input", () => { updateWritingStatus(); saveNotes(); }));
  $("#finalInterpretation").addEventListener("input", saveNotes);

  $("#missionQuiz").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!noteReady() || !state.activeMission) return;
    const selected = $$('#missionAnswers input:checked').map((input) => input.value);
    const correct = state.activeMission.answers;
    const found = selected.filter((answer) => correct.includes(answer));
    const missed = correct.filter((answer) => !selected.includes(answer));
    const extra = selected.filter((answer) => !correct.includes(answer));
    const result = $("#quizResult");
    result.hidden = false;
    result.innerHTML = `<strong>${found.length}/${correct.length}개 편집을 찾았습니다.</strong>${missed.length ? `더 확인할 것: ${missed.map((id) => MISSION_LABELS[id]).join(", ")}. ` : "핵심 편집을 모두 찾았습니다. "}${extra.length ? `추가 선택: ${extra.map((id) => MISSION_LABELS[id]).join(", ")}.` : ""}<br />B 아래의 실제 차이·확대 배율·표본 수와 위험 신호를 근거로 처음 쓴 메시지를 다시 다듬어 보세요.`;
  });

  $("#applyDataButton").addEventListener("click", () => {
    try {
      applyCSV($("#csvTextarea").value);
      setStatus($("#dataStatus"), `${state.rows.length}개 행, ${M.groupNames(state.rows).length}개 집단을 적용했습니다.`, "success");
    } catch (error) {
      setStatus($("#dataStatus"), error.message, "error");
    }
  });
  $("#csvFileInput").addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      $("#csvTextarea").value = String(reader.result || "");
      try {
        applyCSV($("#csvTextarea").value, file.name.replace(/\.csv$/i, ""));
        setStatus($("#dataStatus"), `${file.name}을 적용했습니다.`, "success");
      } catch (error) {
        setStatus($("#dataStatus"), error.message, "error");
      }
    };
    reader.onerror = () => setStatus($("#dataStatus"), "파일을 읽지 못했습니다.", "error");
    reader.readAsText(file, "utf-8");
  });
  $("#downloadDataButton").addEventListener("click", () => downloadText("graph-framing-data.csv", `\uFEFF${rowsToCSV(state.rows)}`, "text/csv;charset=utf-8"));

  $("#savePresetButton").addEventListener("click", () => {
    const name = $("#presetNameInput").value.trim();
    if (!name) {
      setStatus($("#presetStatus"), "프리셋 이름을 입력해 주세요.", "error");
      return;
    }
    try {
      const presets = readPresets();
      presets[name] = { edited: state.edited, rows: state.rows, datasetName: state.datasetName, savedAt: new Date().toISOString() };
      writePresets(presets);
      renderPresetOptions(name);
      setStatus($("#presetStatus"), `“${name}” 프리셋을 이 브라우저에 저장했습니다.`, "success");
    } catch {
      setStatus($("#presetStatus"), "브라우저 저장소에 프리셋을 저장하지 못했습니다.", "error");
    }
  });
  $("#loadPresetButton").addEventListener("click", () => {
    const name = $("#presetSelect").value;
    const preset = readPresets()[name];
    if (!preset) {
      setStatus($("#presetStatus"), "불러올 프리셋을 선택해 주세요.", "error");
      return;
    }
    try {
      state.rows = preset.rows.map((row, index) => M.normalizeRow(row, index));
      state.datasetName = preset.datasetName || name;
      state.edited = normalizeEditedState(preset.edited);
      state.mode = "experiment";
      state.experimentState = null;
      configureRangeInputs();
      $("#csvTextarea").value = rowsToCSV(state.rows);
      updateModeUI();
      renderAll();
      setStatus($("#presetStatus"), `“${name}” 프리셋을 불러왔습니다.`, "success");
    } catch (error) {
      setStatus($("#presetStatus"), `프리셋을 읽지 못했습니다: ${error.message}`, "error");
    }
  });
  $("#deletePresetButton").addEventListener("click", () => {
    const name = $("#presetSelect").value;
    if (!name) {
      setStatus($("#presetStatus"), "삭제할 프리셋을 선택해 주세요.", "error");
      return;
    }
    const presets = readPresets();
    delete presets[name];
    writePresets(presets);
    renderPresetOptions();
    setStatus($("#presetStatus"), `“${name}” 프리셋을 삭제했습니다.`, "success");
  });

  const manualDialog = $("#manualDialog");
  const teacherDialog = $("#teacherDialog");
  $("#manualButton").addEventListener("click", () => manualDialog.showModal());
  $("#closeManualDialog").addEventListener("click", () => manualDialog.close());
  manualDialog.addEventListener("click", (event) => { if (event.target === manualDialog) manualDialog.close(); });
  $("#teacherButton").addEventListener("click", () => teacherDialog.showModal());
  $("#closeTeacherDialog").addEventListener("click", () => teacherDialog.close());
  teacherDialog.addEventListener("click", (event) => { if (event.target === teacherDialog) teacherDialog.close(); });
  $("#printButton").addEventListener("click", () => window.print());

  if (new URLSearchParams(window.location.search).get("manual") === "1") manualDialog.showModal();
}

function init() {
  configureRangeInputs();
  $("#csvTextarea").value = rowsToCSV(state.rows);
  renderPresetOptions();
  loadNotes();
  updateModeUI();
  bindEvents();
  renderAll();
  updateWritingStatus();
}

init();
