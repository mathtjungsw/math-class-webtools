const THEORY = Array.from({ length: 9 }, (_, index) => Math.log10(1 + 1 / (index + 1)));

const samples = {
  cities: `도시별 인구 조사 자료 (단위: 명)
서울 9,386,034 / 부산 3,293,362 / 인천 3,012,997 / 대구 2,374,960
대전 1,446,749 / 광주 1,419,237 / 수원 1,233,424 / 울산 1,098,728
용인 1,077,508 / 고양 1,073,069 / 창원 1,009,038 / 성남 918,771
화성 916,400 / 청주 849,573 / 부천 779,968 / 남양주 736,287
천안 658,486 / 전주 654,121 / 안산 634,284 / 평택 591,022
안양 547,467 / 시흥 524,301 / 김해 533,659 / 파주 497,775
의정부 463,724 / 김포 486,122 / 구미 405,506 / 광주 392,817
세종 386,126 / 원주 361,065 / 양산 355,122 / 진주 342,998
제주 492,466 / 춘천 286,426 / 군산 262,467 / 순천 278,737
목포 216,939 / 충주 207,778 / 강릉 210,456 / 거제 236,518`,
  finance: `가상 기업 50곳의 연간 매출액 (단위: 억 원)
12450, 7830, 2150, 936, 4120, 1670, 583, 2780, 1140, 6980
341, 892, 1360, 477, 10240, 3280, 749, 1950, 5210, 286
153, 681, 2460, 119, 8730, 364, 1320, 4910, 764, 205
1820, 558, 3170, 981, 144, 6120, 2390, 426, 1080, 337
729, 1690, 253, 3840, 1170, 604, 2980, 194, 845, 4370`,
  uniform: `사람이 고르게 만든 첫째 자리 숫자 예시
113, 128, 204, 253, 314, 386, 407, 468, 512, 596
608, 674, 703, 781, 806, 895, 902, 978, 145, 267
356, 489, 534, 619, 742, 863, 916, 187, 295, 372
458, 579, 631, 754, 821, 943, 164, 238, 327, 497
541, 686, 719, 872, 934, 192, 284, 345, 476, 568
657, 738, 819, 925`
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const sourceText = $("#sourceText");
const resultsSection = $("#results");
const reportDialog = $("#reportDialog");
let analysis = null;
let toastTimer;

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function cleanTextBeforeExtraction(text) {
  if (!$("#excludeDates").checked) return text;
  return text
    .replace(/\b(?:19|20)\d{2}[./-]\d{1,2}[./-]\d{1,2}\b/g, (match) => " ".repeat(match.length))
    .replace(/\b\d{1,2}[./-]\d{1,2}[./-](?:\d{2}|\d{4})\b/g, (match) => " ".repeat(match.length));
}

function extractData(text) {
  const prepared = cleanTextBeforeExtraction(text);
  const matches = [...prepared.matchAll(/[-+]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?:[eE][-+]?\d+)?%?/g)];
  const valid = [];
  const excluded = [];
  const seen = new Set();

  matches.forEach((match) => {
    const raw = match[0];
    const normalized = raw.replaceAll(",", "").replace("%", "");
    const value = Number(normalized);
    let reason = "";
    if (!Number.isFinite(value)) reason = "숫자로 읽을 수 없음";
    else if (value === 0) reason = "0은 첫째 자리 숫자가 없음";
    else if ($("#excludePercent").checked && raw.endsWith("%")) reason = "백분율";
    else if ($("#excludeYears").checked && Number.isInteger(value) && value >= 1900 && value <= 2099) reason = "연도로 추정";
    else if ($("#uniqueOnly").checked && seen.has(String(value))) reason = "중복값";

    if (reason) {
      excluded.push({ raw, reason });
      return;
    }
    seen.add(String(value));
    valid.push({ raw, value, digit: firstSignificantDigit(value) });
  });
  return { found: matches.length, valid, excluded };
}

function firstSignificantDigit(value) {
  const absolute = Math.abs(value);
  const exponent = Math.floor(Math.log10(absolute));
  return Math.floor(absolute / 10 ** exponent + 1e-10);
}

function gammaQ(a, x) {
  if (x < 0 || a <= 0) return NaN;
  if (x === 0) return 1;
  const logGamma = logGammaValue(a);
  if (x < a + 1) {
    let ap = a;
    let sum = 1 / a;
    let delta = sum;
    for (let i = 1; i <= 100; i += 1) {
      ap += 1;
      delta *= x / ap;
      sum += delta;
      if (Math.abs(delta) < Math.abs(sum) * 3e-14) break;
    }
    return 1 - sum * Math.exp(-x + a * Math.log(x) - logGamma);
  }
  let b = x + 1 - a;
  let c = 1 / 1e-30;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= 100; i += 1) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 3e-14) break;
  }
  return Math.exp(-x + a * Math.log(x) - logGamma) * h;
}

function logGammaValue(z) {
  const coefficients = [676.5203681218851, -1259.1392167224028, 771.3234287776531, -176.6150291621406, 12.507343278686905, -0.13857109526572012, 9.984369578019571e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGammaValue(1 - z);
  let x = 0.9999999999998099;
  const adjusted = z - 1;
  coefficients.forEach((coefficient, index) => { x += coefficient / (adjusted + index + 1); });
  const t = adjusted + coefficients.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (adjusted + 0.5) * Math.log(t) - t + Math.log(x);
}

function calculate(extraction) {
  const counts = Array(9).fill(0);
  extraction.valid.forEach((item) => { if (item.digit >= 1 && item.digit <= 9) counts[item.digit - 1] += 1; });
  const n = counts.reduce((sum, value) => sum + value, 0);
  const proportions = counts.map((count) => count / n);
  const differences = proportions.map((value, index) => value - THEORY[index]);
  const mad = differences.reduce((sum, value) => sum + Math.abs(value), 0) / 9;
  const chiSquare = counts.reduce((sum, count, index) => {
    const expected = n * THEORY[index];
    return sum + (count - expected) ** 2 / expected;
  }, 0);
  const pValue = gammaQ(4, chiSquare / 2);
  const maxGapIndex = differences.reduce((best, value, index) => Math.abs(value) > Math.abs(differences[best]) ? index : best, 0);
  return { ...extraction, counts, n, proportions, differences, mad, chiSquare, pValue, maxGapIndex };
}

function fitLabel(mad) {
  if (mad <= 0.006) return { label: "매우 유사", detail: "벤포드 분포에 가깝습니다", tone: "close" };
  if (mad <= 0.012) return { label: "대체로 유사", detail: "수용 가능한 정도의 차이", tone: "acceptable" };
  if (mad <= 0.015) return { label: "경계 수준", detail: "차이의 원인을 살펴보세요", tone: "marginal" };
  return { label: "차이가 큼", detail: "자료의 성격과 범위를 확인하세요", tone: "different" };
}

function formatPercent(value, digits = 1) { return `${(value * 100).toFixed(digits)}%`; }
function formatP(value) { return value < 0.001 ? "p < 0.001" : `p = ${value.toFixed(3)}`; }

function renderExtraction(data) {
  $("#emptyState").hidden = true;
  $("#extractionResult").hidden = false;
  $("#foundCount").textContent = data.found.toLocaleString("ko-KR");
  $("#usedCount").textContent = data.valid.length.toLocaleString("ko-KR");
  $("#excludedCount").textContent = data.excluded.length.toLocaleString("ko-KR");
  const shown = data.valid.slice(0, 120);
  $("#numberChips").innerHTML = shown.map((item) => `<span title="첫째 자리 ${item.digit}">${escapeHtml(item.raw)}</span>`).join("");
  $("#numberNote").textContent = data.valid.length > shown.length ? `처음 ${shown.length}개만 표시했습니다. 전체 ${data.valid.length.toLocaleString("ko-KR")}개가 분석에 사용됩니다.` : `모든 ${data.valid.length.toLocaleString("ko-KR")}개 값을 표시했습니다.`;
  $("#excludedList").innerHTML = data.excluded.length ? data.excluded.slice(0, 80).map((item) => `<li>${escapeHtml(item.raw)} — ${item.reason}</li>`).join("") : "<li>제외된 값이 없습니다.</li>";
  $("#candidateCount").textContent = `숫자 후보 ${data.found.toLocaleString("ko-KR")}개`;
}

function renderResults(data) {
  resultsSection.hidden = false;
  const fit = fitLabel(data.mad);
  $("#metricN").textContent = data.n.toLocaleString("ko-KR");
  $("#metricMad").textContent = data.mad.toFixed(3);
  $("#metricChi").textContent = data.chiSquare.toFixed(2);
  $("#metricP").textContent = `${formatP(data.pValue)} · 자유도 8`;
  $("#metricFit").textContent = fit.label;
  $("#metricFitDetail").textContent = fit.detail;
  $("#sampleComment").textContent = data.n < 100 ? "개 · 작은 표본 주의" : "개의 유효한 수";

  const digit = data.maxGapIndex + 1;
  const gap = data.differences[data.maxGapIndex];
  $("#largestGapDigit").textContent = digit;
  $("#largestGapText").textContent = `관측값이 이론값보다 ${Math.abs(gap * 100).toFixed(1)}%p ${gap >= 0 ? "높습니다" : "낮습니다"}.`;
  $("#insightTitle").textContent = fit.label === "차이가 큼" ? "이론 분포와 눈에 띄는 차이가 있어요" : "벤포드 곡선의 흐름이 관찰돼요";
  $("#insightText").textContent = `${data.n.toLocaleString("ko-KR")}개의 수를 분석한 MAD는 ${data.mad.toFixed(3)}입니다. ${fit.detail}. 이 판정은 분포의 모양을 설명할 뿐, 자료의 진위나 부정을 판정하지 않습니다.`;
  $("#sampleWarning").textContent = data.n < 100
    ? "표본이 100개보다 적어 우연한 흔들림이 클 수 있습니다. 더 많은 자료로 다시 확인해 보세요."
    : "표본 크기는 비교에 충분한 편이지만, 데이터가 여러 자릿수 범위에 걸쳐 자연적으로 생성되었는지도 확인하세요.";

  $("#resultTableBody").innerHTML = data.counts.map((count, index) => {
    const difference = data.differences[index];
    return `<tr><td>${index + 1}</td><td>${count.toLocaleString("ko-KR")}</td><td>${formatPercent(data.proportions[index], 2)}</td><td>${formatPercent(THEORY[index], 2)}</td><td class="${difference >= 0 ? "positive-gap" : "negative-gap"}">${difference >= 0 ? "+" : ""}${(difference * 100).toFixed(2)}%p</td></tr>`;
  }).join("");
  drawChart();
}

function drawChart() {
  if (!analysis || resultsSection.hidden) return;
  const canvas = $("#benfordChart");
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const context = canvas.getContext("2d");
  context.scale(dpr, dpr);
  const width = rect.width;
  const height = rect.height;
  const padding = { top: 28, right: 24, bottom: 38, left: 46 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const max = 0.36;
  context.font = '10px "DM Mono", monospace';
  context.textAlign = "right";
  context.textBaseline = "middle";
  for (let i = 0; i <= 3; i += 1) {
    const value = i * 0.1;
    const y = padding.top + chartHeight - value / max * chartHeight;
    context.strokeStyle = "#e2e6e3";
    context.lineWidth = 1;
    context.beginPath(); context.moveTo(padding.left, y); context.lineTo(width - padding.right, y); context.stroke();
    context.fillStyle = "#869196";
    context.fillText(`${Math.round(value * 100)}%`, padding.left - 8, y);
  }
  const group = chartWidth / 9;
  const barWidth = Math.min(40, group * 0.5);
  analysis.proportions.forEach((value, index) => {
    const x = padding.left + group * index + group / 2;
    const barHeight = Math.min(value, max) / max * chartHeight;
    context.fillStyle = "#57d4b4";
    context.beginPath();
    if (context.roundRect) context.roundRect(x - barWidth / 2, padding.top + chartHeight - barHeight, barWidth, barHeight, [5, 5, 0, 0]);
    else context.rect(x - barWidth / 2, padding.top + chartHeight - barHeight, barWidth, barHeight);
    context.fill();
    context.fillStyle = "#3f4f57";
    context.textAlign = "center";
    context.textBaseline = "top";
    context.fillText(String(index + 1), x, padding.top + chartHeight + 11);
  });
  context.strokeStyle = "#ff8d4b";
  context.lineWidth = 2.5;
  context.lineJoin = "round";
  context.beginPath();
  THEORY.forEach((value, index) => {
    const x = padding.left + group * index + group / 2;
    const y = padding.top + chartHeight - value / max * chartHeight;
    if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
  });
  context.stroke();
  THEORY.forEach((value, index) => {
    const x = padding.left + group * index + group / 2;
    const y = padding.top + chartHeight - value / max * chartHeight;
    context.fillStyle = "#fffef9"; context.strokeStyle = "#ff8d4b"; context.lineWidth = 2;
    context.beginPath(); context.arc(x, y, 4, 0, Math.PI * 2); context.fill(); context.stroke();
  });
}

function analyze() {
  const text = sourceText.value.trim();
  if (!text) { showToast("분석할 기사나 데이터를 먼저 붙여넣어 주세요."); sourceText.focus(); return; }
  const extraction = extractData(text);
  renderExtraction(extraction);
  if (!extraction.valid.length) { resultsSection.hidden = true; showToast("분석에 사용할 수 있는 0이 아닌 수를 찾지 못했습니다."); return; }
  analysis = calculate(extraction);
  renderResults(analysis);
  resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function buildReportData() {
  if (!analysis) return null;
  const fit = fitLabel(analysis.mad);
  const digit = analysis.maxGapIndex + 1;
  const defaultInterpretation = `${analysis.n.toLocaleString("ko-KR")}개의 유효한 수를 분석했다. 평균 절대 편차(MAD)는 ${analysis.mad.toFixed(3)}, 카이제곱 통계량은 ${analysis.chiSquare.toFixed(2)}(${formatP(analysis.pValue)})였다. 분포는 벤포드 이론값과 비교해 ‘${fit.label}’으로 나타났다. 가장 큰 차이를 보인 첫째 자리 숫자는 ${digit}이었다.`;
  if (!$("#reportInterpretation").value.trim()) $("#reportInterpretation").value = defaultInterpretation;
  return {
    title: $("#reportTitle").value.trim() || "벤포드 법칙 탐구 보고서",
    author: $("#reportAuthor").value.trim() || "—",
    className: $("#reportClass").value.trim() || "—",
    source: $("#reportSource").value.trim() || "자료 출처를 기록하지 않음",
    hypothesis: $("#reportHypothesis").value.trim() || "가설을 작성하지 않음",
    interpretation: $("#reportInterpretation").value.trim() || defaultInterpretation,
    limit: $("#reportLimit").value.trim() || "표본의 크기와 자료의 범위가 결과에 미치는 영향을 추가로 확인할 필요가 있다.",
    fit, digit
  };
}

function reportTableHtml() {
  return `<table><thead><tr><th>첫째 자리</th><th>관측 도수</th><th>관측 비율</th><th>이론 비율</th><th>차이</th></tr></thead><tbody>${analysis.counts.map((count, index) => `<tr><td>${index + 1}</td><td>${count}</td><td>${formatPercent(analysis.proportions[index], 2)}</td><td>${formatPercent(THEORY[index], 2)}</td><td>${analysis.differences[index] >= 0 ? "+" : ""}${(analysis.differences[index] * 100).toFixed(2)}%p</td></tr>`).join("")}</tbody></table>`;
}

function reportHtml(documentMode = false) {
  const data = buildReportData();
  if (!data) return "";
  const content = `<div class="report-document"><h1>${escapeHtml(data.title)}</h1><div class="report-meta"><span>작성자: ${escapeHtml(data.author)}</span><span>학급·모둠: ${escapeHtml(data.className)}</span><span>작성일: ${new Date().toLocaleDateString("ko-KR")}</span></div><section><h2>1. 탐구 자료</h2><p>${escapeHtml(data.source)}</p></section><section><h2>2. 나의 가설</h2><p>${escapeHtml(data.hypothesis)}</p></section><section><h2>3. 분석 결과</h2><p>표본 크기 ${analysis.n.toLocaleString("ko-KR")}개 · MAD ${analysis.mad.toFixed(3)} · χ² ${analysis.chiSquare.toFixed(2)} · ${formatP(analysis.pValue)} · 판정 ${data.fit.label}</p>${reportTableHtml()}</section><section><h2>4. 결과 해석</h2><p>${escapeHtml(data.interpretation)}</p></section><section><h2>5. 한계와 더 알아볼 점</h2><p>${escapeHtml(data.limit)}</p></section><section><h2>6. 결론</h2><p>이 자료의 첫째 자리 분포는 벤포드 이론 분포와 비교해 ‘${data.fit.label}’으로 나타났다. 이 결과만으로 자료의 진위나 조작 여부를 단정할 수 없으며, 자료가 생성된 과정과 범위를 함께 살펴야 한다.</p></section></div>`;
  if (!documentMode) return content;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${escapeHtml(data.title)}</title><style>body{max-width:800px;margin:40px auto;padding:0 24px;font-family:Arial,'Noto Sans KR',sans-serif;color:#18242b}h1{font-size:28px}.report-meta{display:flex;gap:24px;padding:12px 0;border-top:2px solid #18242b;border-bottom:1px solid #aaa;font-size:12px}section{margin-top:26px}h2{font-size:16px;border-bottom:1px solid #555;padding-bottom:6px}p{white-space:pre-wrap;line-height:1.7;font-size:13px}table{width:100%;border-collapse:collapse}th,td{padding:7px;border:1px solid #ccc;text-align:right;font-size:11px}th:first-child,td:first-child{text-align:center}@media print{body{margin:0}}</style></head><body>${content}</body></html>`;
}

function openReport() {
  if (!analysis) { showToast("먼저 데이터를 분석한 뒤 보고서를 만들 수 있어요."); $("#experiment").scrollIntoView({ behavior: "smooth" }); return; }
  buildReportData();
  reportDialog.showModal();
}

function updateReportPreview() { $("#reportPreview").innerHTML = reportHtml(false); }

function reportMarkdown() {
  const data = buildReportData();
  const rows = analysis.counts.map((count, index) => `| ${index + 1} | ${count} | ${formatPercent(analysis.proportions[index], 2)} | ${formatPercent(THEORY[index], 2)} |`).join("\n");
  return `# ${data.title}\n\n작성자: ${data.author} · 학급·모둠: ${data.className}\n\n## 1. 탐구 자료\n${data.source}\n\n## 2. 나의 가설\n${data.hypothesis}\n\n## 3. 분석 결과\n표본 크기 ${analysis.n}개, MAD ${analysis.mad.toFixed(3)}, χ² ${analysis.chiSquare.toFixed(2)}, ${formatP(analysis.pValue)}, 판정: ${data.fit.label}\n\n| 첫째 자리 | 관측 도수 | 관측 비율 | 이론 비율 |\n|---:|---:|---:|---:|\n${rows}\n\n## 4. 결과 해석\n${data.interpretation}\n\n## 5. 한계와 더 알아볼 점\n${data.limit}\n\n## 6. 결론\n이 자료의 첫째 자리 분포는 벤포드 이론 분포와 비교해 ‘${data.fit.label}’으로 나타났다. 결과만으로 자료의 진위나 조작 여부를 단정할 수 없다.`;
}

function downloadBlob(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

sourceText.addEventListener("input", () => { $("#characterCount").textContent = sourceText.value.length.toLocaleString("ko-KR"); });
$("#analyzeButton").addEventListener("click", analyze);
$("#clearButton").addEventListener("click", () => {
  sourceText.value = ""; sourceText.dispatchEvent(new Event("input")); analysis = null; resultsSection.hidden = true;
  $("#emptyState").hidden = false; $("#extractionResult").hidden = true; $("#candidateCount").textContent = "아직 분석 전"; sourceText.focus();
});
$$('[data-sample]').forEach((button) => button.addEventListener("click", () => { sourceText.value = samples[button.dataset.sample]; sourceText.dispatchEvent(new Event("input")); analyze(); }));
$("#fileInput").addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { showToast("5MB 이하의 텍스트 파일을 선택해 주세요."); return; }
  sourceText.value = await file.text(); sourceText.dispatchEvent(new Event("input")); showToast(`${file.name}을 불러왔습니다.`);
});
$("#copyNumbersButton").addEventListener("click", async () => { if (!analysis) return; await navigator.clipboard.writeText(analysis.valid.map((item) => item.raw).join("\n")); showToast("분석에 사용한 숫자를 복사했습니다."); });
$("#downloadCsvButton").addEventListener("click", () => {
  if (!analysis) return;
  const csv = "첫째 자리,관측 도수,관측 비율,벤포드 이론 비율,차이(%p)\r\n" + analysis.counts.map((count, index) => `${index + 1},${count},${(analysis.proportions[index] * 100).toFixed(2)},${(THEORY[index] * 100).toFixed(2)},${(analysis.differences[index] * 100).toFixed(2)}`).join("\r\n");
  downloadBlob(`\ufeff${csv}`, "benford-analysis.csv", "text/csv;charset=utf-8");
});
$("#toggleTableButton").addEventListener("click", (event) => { const hidden = $("#tableWrap").hidden; $("#tableWrap").hidden = !hidden; event.currentTarget.textContent = hidden ? "표 접기" : "표 펼치기"; event.currentTarget.setAttribute("aria-expanded", String(hidden)); });
$$('[data-open-report]').forEach((button) => button.addEventListener("click", openReport));
$("#closeReportButton").addEventListener("click", () => reportDialog.close());
reportDialog.addEventListener("click", (event) => { if (event.target === reportDialog) reportDialog.close(); });
$("#copyReportButton").addEventListener("click", async () => { await navigator.clipboard.writeText(reportMarkdown()); showToast("보고서 내용을 복사했습니다."); });
$("#downloadReportButton").addEventListener("click", () => { downloadBlob(reportHtml(true), "benford-report.html", "text/html;charset=utf-8"); });
$("#printReportButton").addEventListener("click", () => { updateReportPreview(); window.print(); });
$("[data-scroll-theory]").addEventListener("click", () => $("#theory").scrollIntoView({ behavior: "smooth" }));
window.addEventListener("resize", () => requestAnimationFrame(drawChart));
