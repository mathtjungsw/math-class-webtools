"use strict";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = {
  total: 100,
  sample: 37,
  optimal: 37,
  mode: "auto",
  seed: 372100,
  sequence: [],
  position: -1,
  bestSeen: -1,
  selected: -1,
  finished: false,
  autoTimer: null,
  trials: 1000,
  batchRun: 0,
  batchRunning: false,
  lastSingle: null,
  lastBatch: null,
  exact: { total: 0n, win: 0n, lose: 0n }
};

const REPORT_STORAGE_KEY = "optimal-stopping-lab-report-v1";

const speedDelays = [900, 520, 260, 90];
const speedLabels = ["천천히", "보통", "빠르게", "매우 빠르게"];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function probability(total, sample) {
  if (sample <= 0) return 1 / total;
  let harmonic = 0;
  for (let j = sample; j <= total - 1; j += 1) harmonic += 1 / j;
  return (sample / total) * harmonic;
}

function findOptimal(total) {
  let bestSample = 0;
  let bestProbability = probability(total, 0);
  for (let r = 1; r < total; r += 1) {
    const value = probability(total, r);
    if (value > bestProbability) {
      bestProbability = value;
      bestSample = r;
    }
  }
  return { sample: bestSample, probability: bestProbability };
}

function factorial(n) {
  let value = 1n;
  for (let i = 2n; i <= BigInt(n); i += 1n) value *= i;
  return value;
}

function calculateCases(total, sample) {
  const previousFactorial = factorial(total - 1);
  const all = previousFactorial * BigInt(total);
  let win = 0n;
  if (sample === 0) {
    win = previousFactorial;
  } else {
    for (let j = sample; j <= total - 1; j += 1) {
      win += (previousFactorial / BigInt(j)) * BigInt(sample);
    }
  }
  return { total: all, win, lose: all - win };
}

function superscript(number) {
  const chars = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻" };
  return String(number).split("").map((char) => chars[char] || char).join("");
}

function scientificBigInt(value) {
  const digits = value.toString();
  if (digits.length <= 18) return value.toLocaleString("ko-KR");
  const lead = `${digits[0]}.${digits.slice(1, 10)}`.replace(/0+$/, "");
  return `${lead} × 10${superscript(digits.length - 1)}`;
}

function compactBigInt(value) {
  const digits = value.toString();
  if (digits.length <= 24) return value.toLocaleString("ko-KR");
  return `${digits.slice(0, 12)}…${digits.slice(-6)} (${digits.length}자리)`;
}

function mulberry32(seed) {
  return function random() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffledRanks(total, seed) {
  const random = mulberry32(seed);
  const ranks = Array.from({ length: total }, (_, index) => total - index);
  for (let i = ranks.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [ranks[i], ranks[j]] = [ranks[j], ranks[i]];
  }
  return ranks;
}

function percentile(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function updateStrategy() {
  state.optimal = findOptimal(state.total).sample;
  state.sample = clamp(state.sample, 0, state.total - 1);
  const currentProbability = probability(state.total, state.sample);
  const optimalProbability = probability(state.total, state.optimal);
  const ratio = (state.sample / state.total) * 100;
  const selectionStart = state.sample + 1;

  $("[data-total-range]").value = state.total;
  $("[data-total-input]").value = state.total;
  $("[data-total-output]").textContent = `${state.total}명`;
  $("[data-sample-range]").max = state.total - 1;
  $("[data-sample-range]").value = state.sample;
  $("[data-sample-input]").max = state.total - 1;
  $("[data-sample-input]").value = state.sample;
  $("[data-sample-output]").textContent = `${state.sample}명 · ${ratio.toFixed(1)}%`;

  $("[data-hero-sample]").textContent = state.sample;
  $("[data-hero-total]").textContent = `/ ${state.total}명`;
  $("[data-hero-sample-copy]").textContent = state.sample === 0 ? "아무도 관찰하지 않고" : `앞의 ${state.sample}명`;
  $("[data-hero-prob]").textContent = percentile(currentProbability);
  $("[data-stat-sample]").textContent = state.sample === 0 ? "관찰 없음" : state.sample === 1 ? "1번" : `1–${state.sample}번`;
  $("[data-stat-select]").textContent = `${selectionStart}–${state.total}번`;
  $("[data-stat-prob]").textContent = percentile(currentProbability);
  const delta = (optimalProbability - currentProbability) * 100;
  $("[data-stat-delta]").textContent = delta < 0.00005 ? "최적 전략과 같습니다" : `최적점보다 ${delta.toFixed(2)}%p 낮습니다`;
  $("[data-stat-optimal]").textContent = `${state.optimal}명`;
  $("[data-stat-optimal-prob]").textContent = `최대 ${percentile(optimalProbability)}`;
  $("[data-rule-note]").textContent = state.sample === 0
    ? "첫 번째 사람을 바로 선택합니다. 비교 기준이 없기 때문에 전체 1위일 확률은 1/N입니다."
    : `${state.sample}명은 무조건 보내고, ${state.sample + 1}번째부터 앞선 모두보다 좋은 사람이 나타나면 즉시 선택합니다.`;

  const formula = state.sample === 0
    ? `1/${state.total}`
    : `${state.sample}/${state.total} × (1/${state.sample} + 1/${state.sample + 1}${state.total - 1 > state.sample + 1 ? ` + … + 1/${state.total - 1}` : ""})`;
  $("[data-formula]").textContent = formula;
  $("[data-formula-result]").textContent = `= ${currentProbability.toFixed(4)}`;

  state.exact = calculateCases(state.total, state.sample);
  $("[data-cases-total]").textContent = `${state.total}!`;
  $("[data-cases-total-value]").textContent = scientificBigInt(state.exact.total);
  $("[data-cases-win]").textContent = compactBigInt(state.exact.win);
  $("[data-cases-lose]").textContent = compactBigInt(state.exact.lose);
  $("[data-cases-win-percent]").textContent = `전체의 ${percentile(currentProbability)}`;
  $("[data-cases-lose-percent]").textContent = `전체의 ${percentile(1 - currentProbability)}`;
  $("[data-exact-total]").textContent = state.exact.total.toString();
  $("[data-exact-win]").textContent = state.exact.win.toString();
  $("[data-exact-lose]").textContent = state.exact.lose.toString();
  $("[data-meter-theory]").style.left = `${currentProbability * 100}%`;
  $("[data-meter-theory-copy]").textContent = percentile(currentProbability);
  state.lastBatch = null;
  $("[data-batch-success]").textContent = "—";
  $("[data-batch-total]").textContent = "새 조건에서 실험 전";
  $("[data-batch-rate]").textContent = "—";
  $("[data-batch-ci]").textContent = "95% 오차 범위가 표시됩니다";
  $("[data-batch-gap]").textContent = "—";
  $("[data-meter-experiment]").textContent = "0%";
  $("[data-meter-fill]").style.width = "0%";
  $("[data-threshold-marker]").style.left = `${ratio}%`;

  drawChart();
  newSequence(false);
}

function setTotal(value) {
  const previousRatio = state.total ? state.sample / state.total : 1 / Math.E;
  state.total = clamp(Math.round(Number(value) || 100), 5, 500);
  state.sample = clamp(Math.round(previousRatio * state.total), 0, state.total - 1);
  updateStrategy();
}

function setSample(value) {
  state.sample = clamp(Math.round(Number(value) || 0), 0, state.total - 1);
  updateStrategy();
}

function setOptimal() {
  state.sample = findOptimal(state.total).sample;
  updateStrategy();
}

function renderStrip() {
  const strip = $("[data-candidate-strip]");
  const fragment = document.createDocumentFragment();
  state.sequence.forEach((rank, index) => {
    const item = document.createElement("div");
    item.className = `mini-candidate ${index >= state.sample ? "select-zone" : ""}`;
    item.dataset.index = index;
    item.title = `${index + 1}번째`;
    item.innerHTML = `<span>${index + 1}</span><b>${state.total - rank + 1}위</b>`;
    fragment.append(item);
  });
  strip.replaceChildren(fragment);
}

function newSequence(changeSeed = true) {
  stopAuto();
  if (changeSeed) {
    const entered = clamp(Math.round(Number($("[data-seed-input]").value) || 1), 1, 999999999);
    state.seed = entered;
  }
  $("[data-seed-input]").value = state.seed;
  state.sequence = shuffledRanks(state.total, state.seed);
  state.position = -1;
  state.bestSeen = -1;
  state.selected = -1;
  state.finished = false;
  state.lastSingle = null;
  renderStrip();
  $("[data-result-panel]").hidden = true;
  $("[data-result-panel]").classList.remove("is-fail");
  $("[data-progress-fill]").style.width = "0%";
  $("[data-progress-copy]").textContent = "아직 아무도 만나지 않았습니다";
  $("[data-progress-count]").textContent = `0 / ${state.total}`;
  $("[data-current-phase]").textContent = "준비 완료";
  $("[data-current-title]").textContent = "첫 번째 만남을 시작해 보세요";
  $("[data-current-badges]").innerHTML = `<span>전체 ${state.total}명</span><span>관찰 ${state.sample}명</span>`;
  $("[data-current-description]").textContent = "실제 순위는 선택을 마칠 때까지 숨겨집니다. 만난 사람들 사이의 상대 순위만 알 수 있습니다.";
  $("[data-relative-rank]").textContent = "—";
  $("[data-avatar] span").textContent = "?";
  $("[data-next]").textContent = "첫 만남 시작";
  $("[data-next]").disabled = false;
  $("[data-pass]").disabled = true;
  $("[data-select]").disabled = true;
  updateReveal();
}

function relativeRankAt(position) {
  const score = state.sequence[position];
  let better = 0;
  for (let index = 0; index <= position; index += 1) {
    if (state.sequence[index] > score) better += 1;
  }
  return better + 1;
}

function revealCandidate(position) {
  const rank = relativeRankAt(position);
  const isRecord = state.sequence[position] > state.bestSeen;
  state.bestSeen = Math.max(state.bestSeen, state.sequence[position]);
  const isSample = position < state.sample;
  const mini = $(`.mini-candidate[data-index="${position}"]`);
  mini.classList.add("is-seen");
  if (isRecord) mini.classList.add("is-record");
  mini.scrollIntoView({ block: "nearest", inline: "nearest" });

  $("[data-progress-fill]").style.width = `${((position + 1) / state.total) * 100}%`;
  $("[data-progress-count]").textContent = `${position + 1} / ${state.total}`;
  $("[data-progress-copy]").textContent = isSample ? `기준을 만드는 중 · ${state.sample - position - 1}명 남음` : "선택 가능한 구간입니다";
  $("[data-current-phase]").textContent = isSample ? "관찰 구간 · 선택 불가" : "선택 구간 · 결정 가능";
  $("[data-current-title]").textContent = `${position + 1}번째 사람을 만났습니다`;
  const rankText = rank === 1 ? "새로운 1위" : `현재 ${rank}위`;
  const actualRank = state.total - state.sequence[position] + 1;
  $("[data-current-badges]").innerHTML = `<span>${rankText}</span><span>${isRecord ? "기록 갱신" : "앞선 기록 이하"}</span>${$("[data-reveal-toggle]").checked ? `<span>실제 ${actualRank}위</span>` : ""}`;
  $("[data-current-description]").textContent = isSample
    ? "관찰 구간에서는 아무리 좋아 보여도 선택할 수 없습니다. 이 기록이 이후의 비교 기준이 됩니다."
    : isRecord
      ? "앞에서 만난 모든 사람보다 좋습니다. 최적 멈춤 규칙이라면 바로 지금 멈춥니다."
      : "앞에서 세운 최고 기록을 넘지 못했습니다. 규칙에 따르면 계속 진행합니다.";
  $("[data-relative-rank]").textContent = rank === 1 ? "1위!" : `${rank}위`;
  $("[data-avatar] span").textContent = position + 1;
  $("[data-next]").textContent = "다음 사람";

  if (state.mode === "manual") {
    $("[data-pass]").disabled = false;
    $("[data-select]").disabled = false;
    $("[data-next]").disabled = true;
    return;
  }

  $("[data-pass]").disabled = true;
  $("[data-select]").disabled = true;
  if (!isSample && isRecord) {
    finish(position, "규칙이 멈춘 순간");
  } else if (position === state.total - 1) {
    finish(position, "마지막 사람 자동 선택");
  }
}

function nextCandidate() {
  if (state.finished) return;
  if (state.mode === "manual" && state.position >= 0 && $("[data-next]").disabled) return;
  if (state.position + 1 >= state.total) {
    finish(state.total - 1, "마지막 사람 자동 선택");
    return;
  }
  state.position += 1;
  revealCandidate(state.position);
}

function manualPass() {
  if (state.finished || state.position < 0) return;
  if (state.position === state.total - 1) {
    finish(state.position, "마지막 사람 자동 선택");
    return;
  }
  $("[data-pass]").disabled = true;
  $("[data-select]").disabled = true;
  $("[data-next]").disabled = false;
  $("[data-current-description]").textContent = "이번 사람을 보냈습니다. 이 선택은 되돌릴 수 없습니다.";
}

function finish(position, reason) {
  stopAuto();
  state.finished = true;
  state.selected = position;
  const actualRank = state.total - state.sequence[position] + 1;
  const bestPosition = state.sequence.indexOf(state.total);
  const success = actualRank === 1;
  state.lastSingle = {
    total: state.total,
    sample: state.sample,
    selectedPosition: position + 1,
    actualRank,
    bestPosition: bestPosition + 1,
    success,
    reason
  };
  const panel = $("[data-result-panel]");
  panel.hidden = false;
  panel.classList.toggle("is-fail", !success);
  $("[data-result-icon]").textContent = success ? "✓" : "!";
  $("[data-result-label]").textContent = reason;
  $("[data-result-title]").textContent = success ? `성공! ${position + 1}번째가 전체 1위였습니다` : `${position + 1}번째를 선택 · 실제 ${actualRank}위`;
  $("[data-result-copy]").textContent = success
    ? "이번 순서에서는 전략이 정확히 맞았습니다."
    : `전체 1위는 ${bestPosition + 1}번째에 있었습니다. 최적 전략도 모든 순서에서 성공하지는 않습니다.`;
  $("[data-progress-copy]").textContent = "선택이 끝났습니다 · 실제 순위를 공개합니다";
  $("[data-next]").disabled = true;
  $("[data-pass]").disabled = true;
  $("[data-select]").disabled = true;
  $(`.mini-candidate[data-index="${position}"]`).classList.add("is-selected");
  $(`.mini-candidate[data-index="${bestPosition}"]`).classList.add("is-best");
  $$(".mini-candidate").forEach((item) => item.classList.add("show-rank"));
  $("[data-current-badges]").insertAdjacentHTML("beforeend", `<span>실제 ${actualRank}위</span>`);
  syncReportCapture();
}

function updateReveal() {
  const reveal = $("[data-reveal-toggle]").checked || state.finished;
  $$(".mini-candidate").forEach((item) => item.classList.toggle("show-rank", reveal));
}

function stopAuto() {
  if (state.autoTimer) window.clearTimeout(state.autoTimer);
  state.autoTimer = null;
  $("[data-auto-run]").textContent = "자동 진행";
}

function toggleAuto() {
  if (state.autoTimer) {
    stopAuto();
    return;
  }
  if (state.finished) newSequence(false);
  $("[data-auto-run]").textContent = "자동 멈춤";
  const tick = () => {
    if (state.finished) return stopAuto();
    if (state.mode === "manual" && state.position >= 0 && $("[data-next]").disabled) manualPass();
    nextCandidate();
    if (!state.finished) state.autoTimer = window.setTimeout(tick, speedDelays[Number($("[data-speed-range]").value) - 1]);
  };
  tick();
}

function drawChart() {
  const canvas = $("[data-strategy-chart]");
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width) return;
  const scale = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.round(rect.width * scale);
  canvas.height = Math.round(rect.height * scale);
  const context = canvas.getContext("2d");
  context.setTransform(scale, 0, 0, scale, 0, 0);
  const width = rect.width;
  const height = rect.height;
  const pad = { left: 52, right: 20, top: 24, bottom: 44 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const maxY = 0.42;
  const xAt = (sample) => pad.left + (sample / (state.total - 1)) * plotWidth;
  const yAt = (value) => pad.top + plotHeight - (value / maxY) * plotHeight;

  context.clearRect(0, 0, width, height);
  context.font = "11px Pretendard, sans-serif";
  context.fillStyle = "#7b8290";
  context.strokeStyle = "#d9d5cb";
  context.lineWidth = 1;
  [0, 0.1, 0.2, 0.3, 0.4].forEach((tick) => {
    const y = yAt(tick);
    context.beginPath(); context.moveTo(pad.left, y); context.lineTo(width - pad.right, y); context.stroke();
    context.fillText(`${Math.round(tick * 100)}%`, 13, y + 4);
  });
  [0, .25, .5, .75, 1].forEach((ratio) => {
    const sample = Math.round((state.total - 1) * ratio);
    const x = xAt(sample);
    context.fillText(`${sample}명`, x - 10, height - 15);
  });

  const gradient = context.createLinearGradient(0, pad.top, 0, height - pad.bottom);
  gradient.addColorStop(0, "rgba(32,168,116,.30)");
  gradient.addColorStop(1, "rgba(32,168,116,.02)");
  context.beginPath();
  for (let sample = 0; sample < state.total; sample += 1) {
    const x = xAt(sample); const y = yAt(probability(state.total, sample));
    if (sample === 0) context.moveTo(x, y); else context.lineTo(x, y);
  }
  context.lineTo(xAt(state.total - 1), yAt(0)); context.lineTo(xAt(0), yAt(0)); context.closePath(); context.fillStyle = gradient; context.fill();
  context.beginPath();
  for (let sample = 0; sample < state.total; sample += 1) {
    const x = xAt(sample); const y = yAt(probability(state.total, sample));
    if (sample === 0) context.moveTo(x, y); else context.lineTo(x, y);
  }
  context.strokeStyle = "#20a874"; context.lineWidth = 3; context.stroke();

  const optimalX = xAt(state.optimal); const optimalY = yAt(probability(state.total, state.optimal));
  context.fillStyle = "#14233f"; context.beginPath(); context.arc(optimalX, optimalY, 6, 0, Math.PI * 2); context.fill();
  context.fillStyle = "#14233f"; context.font = "800 11px Pretendard, sans-serif"; context.fillText(`최적 ${state.optimal}명`, clamp(optimalX - 27, pad.left, width - 90), optimalY - 13);

  const currentX = xAt(state.sample); const currentY = yAt(probability(state.total, state.sample));
  context.setLineDash([5, 5]); context.strokeStyle = "#ff6f59"; context.lineWidth = 1.5;
  context.beginPath(); context.moveTo(currentX, currentY); context.lineTo(currentX, yAt(0)); context.stroke(); context.setLineDash([]);
  context.fillStyle = "#ff6f59"; context.beginPath(); context.arc(currentX, currentY, 7, 0, Math.PI * 2); context.fill();
  canvas._chart = { pad, plotWidth, width };
}

function chartSampleFromEvent(event) {
  const canvas = $("[data-strategy-chart]");
  const rect = canvas.getBoundingClientRect();
  const chart = canvas._chart;
  const x = clamp(event.clientX - rect.left, chart.pad.left, chart.width - chart.pad.right);
  return clamp(Math.round(((x - chart.pad.left) / chart.plotWidth) * (state.total - 1)), 0, state.total - 1);
}

function chartInteract(event, commit = false) {
  const sample = chartSampleFromEvent(event);
  const tooltip = $("[data-chart-tooltip]");
  const canvasRect = $("[data-strategy-chart]").getBoundingClientRect();
  const shellRect = tooltip.parentElement.getBoundingClientRect();
  tooltip.hidden = false;
  tooltip.innerHTML = `${sample}명 관찰<br><b>${percentile(probability(state.total, sample))}</b>`;
  tooltip.style.left = `${clamp(event.clientX - shellRect.left + 12, 8, shellRect.width - 145)}px`;
  tooltip.style.top = `${clamp(event.clientY - shellRect.top - 50, 8, canvasRect.height - 30)}px`;
  if (commit) setSample(sample);
}

async function runBatch() {
  if (state.batchRunning) return;
  state.batchRunning = true;
  const button = $("[data-run-batch]");
  const progress = $("[data-batch-progress]");
  const bar = $("i", progress);
  button.disabled = true;
  button.textContent = "실험하는 중…";
  progress.hidden = false;
  let done = 0;
  let success = 0;
  state.batchRun += 1;
  const random = mulberry32((state.seed ^ state.trials ^ (state.sample << 12) ^ Math.imul(state.batchRun, 2654435761)) >>> 0);
  const chunkSize = Math.max(100, Math.ceil(state.trials / 50));

  await new Promise((resolve) => {
    const chunk = () => {
      const end = Math.min(state.trials, done + chunkSize);
      for (; done < end; done += 1) {
        const bestPosition = Math.floor(random() * state.total) + 1;
        if (state.sample === 0) {
          if (bestPosition === 1) success += 1;
        } else if (bestPosition > state.sample) {
          const previousBestPosition = Math.floor(random() * (bestPosition - 1)) + 1;
          if (previousBestPosition <= state.sample) success += 1;
        }
      }
      bar.style.width = `${(done / state.trials) * 100}%`;
      if (done < state.trials) requestAnimationFrame(chunk); else resolve();
    };
    requestAnimationFrame(chunk);
  });

  const rate = success / state.trials;
  const theory = probability(state.total, state.sample);
  const margin = 1.96 * Math.sqrt((rate * (1 - rate)) / state.trials);
  const prediction = clamp(Number($("[data-prediction]").value) || 0, 0, 100);
  state.lastBatch = {
    total: state.total,
    sample: state.sample,
    trials: state.trials,
    success,
    rate,
    theory,
    margin,
    prediction
  };
  $("[data-batch-success]").textContent = `${success.toLocaleString("ko-KR")}회`;
  $("[data-batch-total]").textContent = `${state.trials.toLocaleString("ko-KR")}번 중`;
  $("[data-batch-rate]").textContent = percentile(rate);
  $("[data-batch-ci]").textContent = `약 ${percentile(Math.max(0, rate - margin))}–${percentile(Math.min(1, rate + margin))}`;
  const gap = (rate - theory) * 100;
  $("[data-batch-gap]").textContent = `${gap >= 0 ? "+" : ""}${gap.toFixed(2)}%p`;
  $("[data-batch-prediction]").textContent = `나의 예상과 ${Math.abs(rate * 100 - prediction).toFixed(2)}%p 차이`;
  $("[data-meter-experiment]").textContent = percentile(rate);
  $("[data-meter-fill]").style.width = `${rate * 100}%`;
  button.disabled = false;
  button.textContent = "한 번 더 실험";
  state.batchRunning = false;
  syncReportCapture();
  window.setTimeout(() => { progress.hidden = true; bar.style.width = "0%"; }, 500);
}

function todayString() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function reportFields() {
  return $$('[data-report-field]');
}

function saveReport() {
  const data = {};
  reportFields().forEach((field) => { data[field.dataset.reportField] = field.value; });
  try {
    localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(data));
    $("[data-report-save-status]").textContent = "입력 내용이 이 기기에 자동 저장되었습니다.";
  } catch (_) {
    $("[data-report-save-status]").textContent = "현재 브라우저에서는 자동 저장을 사용할 수 없습니다.";
  }
}

function loadReport() {
  let data = {};
  try { data = JSON.parse(localStorage.getItem(REPORT_STORAGE_KEY) || "{}"); } catch (_) { data = {}; }
  reportFields().forEach((field) => {
    const saved = data[field.dataset.reportField];
    if (typeof saved === "string") field.value = saved;
  });
  const dateField = $('[data-report-field="activityDate"]');
  if (!dateField.value) dateField.value = todayString();
}

function syncReportCapture() {
  const theory = probability(state.total, state.sample);
  $("[data-report-condition]").textContent = `${state.total}명 중 ${state.sample}명 관찰`;
  $("[data-report-theory]").textContent = `이론 성공률 ${percentile(theory)} · 최적 관찰 ${state.optimal}명`;
  $("[data-report-cases]").textContent = `${state.total}!가지`;
  $("[data-report-cases-detail]").textContent = `성공 ${compactBigInt(state.exact.win)} · 실패 ${compactBigInt(state.exact.lose)}`;

  if (state.lastSingle) {
    const single = state.lastSingle;
    $("[data-report-single]").textContent = single.success ? `성공 · ${single.selectedPosition}번째가 1위` : `${single.selectedPosition}번째 선택 · 실제 ${single.actualRank}위`;
    $("[data-report-single-detail]").textContent = single.success ? "전체 1위를 선택했습니다" : `전체 1위는 ${single.bestPosition}번째였습니다`;
  } else {
    $("[data-report-single]").textContent = "아직 완료하지 않음";
    $("[data-report-single-detail]").textContent = "한 명씩 만나기를 완료하면 자동 기록됩니다";
  }

  if (state.lastBatch) {
    const batch = state.lastBatch;
    $("[data-report-batch]").textContent = `${batch.trials.toLocaleString("ko-KR")}번 중 ${batch.success.toLocaleString("ko-KR")}번 성공`;
    $("[data-report-batch-detail]").textContent = `실험 ${percentile(batch.rate)} · 이론 ${percentile(batch.theory)} · 차이 ${Math.abs((batch.rate - batch.theory) * 100).toFixed(2)}%p`;
  } else {
    $("[data-report-batch]").textContent = "아직 실행하지 않음";
    $("[data-report-batch-detail]").textContent = "1,000번 이상의 반복 실험을 권장합니다";
  }
}

function reportText() {
  const value = (key) => $(`[data-report-field="${key}"]`).value.trim() || "(미작성)";
  const single = state.lastSingle
    ? (state.lastSingle.success ? `${state.lastSingle.selectedPosition}번째에서 전체 1위 선택 성공` : `${state.lastSingle.selectedPosition}번째 선택, 실제 ${state.lastSingle.actualRank}위 (전체 1위는 ${state.lastSingle.bestPosition}번째)`)
    : "미실시";
  const batch = state.lastBatch
    ? `${state.lastBatch.trials.toLocaleString("ko-KR")}번 중 ${state.lastBatch.success.toLocaleString("ko-KR")}번 성공 (${percentile(state.lastBatch.rate)})`
    : "미실시";
  return [
    "[최적 멈춤 이론 활동 보고서]",
    `학년·반: ${value("className")}  번호: ${value("studentNumber")}  이름: ${value("studentName")}`,
    `활동일: ${value("activityDate")}`,
    "",
    "1. 실험 전 예상",
    `예상 관찰 인원: ${value("predictedSample")}명 / 예상 성공률: ${value("predictedProbability")}%`,
    `예상 이유: ${value("hypothesisReason")}`,
    "",
    "2. 실험 기록",
    `현재 조건: ${state.total}명 중 ${state.sample}명 관찰 / 이론 성공률 ${percentile(probability(state.total, state.sample))}`,
    `한 명씩 만나기: ${single}`,
    `반복 실험: ${batch}`,
    `관찰 내용: ${value("observation")}`,
    "",
    "3. 결과 해석",
    `관찰과 선택의 균형: ${value("balanceReason")}`,
    `최적의 의미: ${value("optimalMeaning")}`,
    `다른 적용 상황과 한계: ${value("application")}`,
    "",
    `한 문장 결론: ${value("conclusion")}`
  ].join("\n");
}

function openReport() {
  loadReport();
  syncReportCapture();
  $("[data-report-dialog]").showModal();
}

function clearReport() {
  if (!window.confirm("작성한 보고서 내용을 모두 지울까요?")) return;
  reportFields().forEach((field) => { field.value = ""; });
  $('[data-report-field="activityDate"]').value = todayString();
  try { localStorage.removeItem(REPORT_STORAGE_KEY); } catch (_) { /* 저장소를 사용할 수 없는 경우 무시 */ }
  $("[data-report-save-status]").textContent = "보고서 내용을 지웠습니다.";
}

function wireEvents() {
  $("[data-total-range]").addEventListener("input", (event) => setTotal(event.target.value));
  $("[data-total-input]").addEventListener("change", (event) => setTotal(event.target.value));
  $$('[data-total-step]').forEach((button) => button.addEventListener("click", () => setTotal(state.total + Number(button.dataset.totalStep))));
  $("[data-sample-range]").addEventListener("input", (event) => setSample(event.target.value));
  $("[data-sample-input]").addEventListener("change", (event) => setSample(event.target.value));
  $$('[data-sample-step]').forEach((button) => button.addEventListener("click", () => setSample(state.sample + Number(button.dataset.sampleStep))));
  $$('[data-preset]').forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.preset === "optimal") setOptimal();
    else setSample(Math.round(state.total * Number(button.dataset.preset)));
  }));
  $$('[data-reset-optimal]').forEach((button) => button.addEventListener("click", setOptimal));
  $("[data-scroll-lab]").addEventListener("click", () => $("#lab").scrollIntoView({ behavior: "smooth" }));
  $$('[data-mode]').forEach((button) => button.addEventListener("click", () => {
    state.mode = button.dataset.mode;
    $$('[data-mode]').forEach((item) => item.classList.toggle("is-active", item === button));
    newSequence(false);
  }));
  $$('[data-new-sequence]').forEach((button) => button.addEventListener("click", () => newSequence(true)));
  $("[data-random-seed]").addEventListener("click", () => {
    state.seed = Math.floor(Math.random() * 999999998) + 1;
    $("[data-seed-input]").value = state.seed;
    newSequence(false);
  });
  $("[data-next]").addEventListener("click", nextCandidate);
  $("[data-pass]").addEventListener("click", manualPass);
  $("[data-select]").addEventListener("click", () => finish(state.position, "내가 선택한 순간"));
  $("[data-auto-run]").addEventListener("click", toggleAuto);
  $("[data-reveal-toggle]").addEventListener("change", updateReveal);
  $("[data-speed-range]").addEventListener("input", (event) => { $("[data-speed-output]").textContent = speedLabels[Number(event.target.value) - 1]; });
  $$('[data-trials]').forEach((button) => button.addEventListener("click", () => {
    state.trials = Number(button.dataset.trials);
    $$('[data-trials]').forEach((item) => item.classList.toggle("is-active", item === button));
  }));
  $("[data-run-batch]").addEventListener("click", runBatch);

  const guideDialog = $("[data-guide-dialog]");
  const reportDialog = $("[data-report-dialog]");
  $("[data-report-form]").addEventListener("submit", (event) => event.preventDefault());
  $("[data-open-guide]").addEventListener("click", () => guideDialog.showModal());
  $("[data-close-guide]").addEventListener("click", () => guideDialog.close());
  $("[data-guide-start]").addEventListener("click", () => { guideDialog.close(); $("#lab").scrollIntoView({ behavior: "smooth" }); });
  $("[data-guide-report]").addEventListener("click", () => { guideDialog.close(); openReport(); });
  guideDialog.addEventListener("click", (event) => { if (event.target === guideDialog) guideDialog.close(); });
  $("[data-open-report]").addEventListener("click", openReport);
  $("[data-close-report]").addEventListener("click", () => reportDialog.close());
  reportDialog.addEventListener("click", (event) => { if (event.target === reportDialog) reportDialog.close(); });
  $("[data-sync-report]").addEventListener("click", syncReportCapture);
  $("[data-clear-report]").addEventListener("click", clearReport);
  $("[data-print-report]").addEventListener("click", () => { saveReport(); syncReportCapture(); window.print(); });
  $("[data-copy-report]").addEventListener("click", async () => {
    saveReport();
    const button = $("[data-copy-report]");
    try {
      await navigator.clipboard.writeText(reportText());
      const oldText = button.textContent;
      button.textContent = "복사됨";
      window.setTimeout(() => { button.textContent = oldText; }, 1200);
    } catch (_) {
      button.textContent = "복사할 수 없음";
    }
  });
  let reportSaveTimer;
  reportFields().forEach((field) => field.addEventListener("input", () => {
    window.clearTimeout(reportSaveTimer);
    $("[data-report-save-status]").textContent = "작성 내용을 저장하는 중…";
    reportSaveTimer = window.setTimeout(saveReport, 250);
  }));

  const canvas = $("[data-strategy-chart]");
  let dragging = false;
  canvas.addEventListener("pointerdown", (event) => { dragging = true; canvas.setPointerCapture(event.pointerId); chartInteract(event, true); });
  canvas.addEventListener("pointermove", (event) => chartInteract(event, dragging));
  canvas.addEventListener("pointerup", () => { dragging = false; });
  canvas.addEventListener("pointerleave", () => { if (!dragging) $("[data-chart-tooltip]").hidden = true; });
  window.addEventListener("resize", drawChart);

  const dialog = $("[data-exact-dialog]");
  $("[data-open-exact]").addEventListener("click", () => dialog.showModal());
  $("[data-close-exact]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  $$('[data-copy]').forEach((button) => button.addEventListener("click", async () => {
    const value = state.exact[button.dataset.copy].toString();
    try {
      await navigator.clipboard.writeText(value);
      const oldText = button.textContent;
      button.textContent = "복사됨";
      window.setTimeout(() => { button.textContent = oldText; }, 1200);
    } catch (_) {
      button.textContent = "복사할 수 없음";
    }
  }));
}

wireEvents();
updateStrategy();
loadReport();
syncReportCapture();
