(function () {
  "use strict";

  const M = window.EcosystemModel;
  if (!M) throw new Error("EcosystemModel을 불러오지 못했습니다.");

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const parameterIds = ["rabbitGrowth", "predationRate", "foxDeathRate", "foxGrowthRate", "initialRabbits", "initialFoxes", "duration", "dt", "carryingCapacity"];
  const STORAGE_KEY = "rabbit-fox-ecosystem-scenarios-v1";
  const colors = { rabbit: "#138477", fox: "#d65d3f", ink: "#172624", grid: "#ddd8ce", observed: "#6b5b8f", equilibrium: "#e1a925" };
  const presets = {
    balance: { rabbitGrowth: .1, predationRate: .002, foxDeathRate: .1, foxGrowthRate: .0004, initialRabbits: 300, initialFoxes: 30, duration: 120, dt: .2, useCapacity: false, carryingCapacity: 900 },
    rabbitBoom: { rabbitGrowth: .13, predationRate: .0018, foxDeathRate: .1, foxGrowthRate: .0004, initialRabbits: 600, initialFoxes: 22, duration: 120, dt: .2, useCapacity: false, carryingCapacity: 1100 },
    foxHeavy: { rabbitGrowth: .1, predationRate: .002, foxDeathRate: .11, foxGrowthRate: .0004, initialRabbits: 280, initialFoxes: 85, duration: 120, dt: .2, useCapacity: false, carryingCapacity: 900 },
    predation: { rabbitGrowth: .1, predationRate: .0032, foxDeathRate: .1, foxGrowthRate: .0004, initialRabbits: 300, initialFoxes: 30, duration: 120, dt: .2, useCapacity: false, carryingCapacity: 900 }
  };

  const state = {
    result: null,
    index: 0,
    playing: false,
    animationFrame: 0,
    previousFrameTime: 0,
    playPosition: 0,
    observations: [],
    toastTimer: 0,
    activePreset: "balance"
  };

  function number(value, digits) {
    if (!Number.isFinite(value)) return "—";
    return value.toLocaleString("ko-KR", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
  }

  function percent(value) {
    return Number.isFinite(value) ? `${value.toFixed(1)}%` : "—";
  }

  function readConfig() {
    const config = {};
    parameterIds.forEach((id) => { config[id] = Number($(`#${id}`).value); });
    config.useCapacity = $("#capacityToggle").checked;
    return config;
  }

  function writeConfig(config) {
    parameterIds.forEach((id) => {
      if (config[id] !== undefined) $(`#${id}`).value = config[id];
    });
    $("#capacityToggle").checked = Boolean(config.useCapacity);
    $("#capacityField").hidden = !config.useCapacity;
  }

  function setActivePreset(name) {
    state.activePreset = name;
    $$('[data-preset]').forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.preset === name)));
  }

  function runSimulation(options) {
    const keepTime = Boolean(options && options.keepTime);
    const previousRatio = state.result && state.result.config.steps ? state.index / state.result.config.steps : 0;
    pause();
    state.result = M.simulate(readConfig());
    state.index = keepTime ? Math.round(previousRatio * state.result.config.steps) : 0;
    state.playPosition = state.index;
    $("#timeSlider").max = String(state.result.config.steps);
    $("#timeSlider").value = String(state.index);
    renderWarnings();
    renderStaticInsights();
    renderAll();
  }

  function renderWarnings() {
    const box = $("#warningBox");
    const warnings = state.result.warnings;
    box.hidden = warnings.length === 0;
    box.textContent = warnings.join(" ");
  }

  function renderStaticInsights() {
    const eq = state.result.equilibrium;
    if (eq.exists) {
      $("#equilibriumText").textContent = `R* = ${number(eq.rabbits, 1)} · F* = ${number(eq.foxes, 1)}`;
      $("#equilibriumMeaning").textContent = state.result.config.useCapacity
        ? "환경수용력이 반영된 두 변화율의 공존 균형점입니다. K가 낮아지면 여우의 균형 개체수도 낮아집니다."
        : "두 변화율이 동시에 0이 되는 기준점입니다. 정확히 그 점에서 시작하면 표준 모델의 값은 변하지 않습니다.";
    } else {
      $("#equilibriumText").textContent = "양의 공존 균형점 없음";
      $("#equilibriumMeaning").textContent = eq.reason;
    }

    const summary = M.summarize(state.result, "continuous");
    if (summary.firstRabbitPeak && summary.firstFoxPeak) {
      const order = summary.lag >= 0 ? "토끼가 먼저" : "여우가 먼저";
      $("#lagText").textContent = `${order} · ${number(Math.abs(summary.lag), 1)} 시간차`;
      $("#lagMeaning").textContent = `토끼 첫 최고점 t=${number(summary.firstRabbitPeak.time, 1)}, 여우 첫 최고점 t=${number(summary.firstFoxPeak.time, 1)}입니다.${summary.averagePeriod ? ` 토끼의 평균 주기는 약 ${number(summary.averagePeriod, 1)}입니다.` : ""}`;
    } else {
      $("#lagText").textContent = "기간 안에서 최고점 부족";
      $("#lagMeaning").textContent = "기간을 늘리거나 시작 조건을 바꾸어 두 종의 최고점을 찾아보세요.";
    }
  }

  function renderAll() {
    if (!state.result) return;
    renderCurrent();
    drawTimeChart();
    drawPhaseChart();
    renderTable();
  }

  function renderCurrent() {
    const index = state.index;
    const result = state.result;
    const time = result.times[index];
    const rabbits = result.continuous.rabbits[index];
    const foxes = result.continuous.foxes[index];
    const discreteRabbits = result.discrete.rabbits[index];
    const discreteFoxes = result.discrete.foxes[index];
    const phase = M.phaseAt(rabbits, foxes, result.config);
    $("#currentTime").textContent = number(time, 1);
    $("#timeOutput").textContent = number(time, 1);
    $("#currentRabbits").textContent = number(rabbits, 1);
    $("#currentFoxes").textContent = number(foxes, 1);
    $("#phaseLabel").textContent = phase.label;
    $("#directionLabel").textContent = `토끼 ${phase.rabbitDirection} · 여우 ${phase.foxDirection}`;
    $("#timeSlider").value = String(index);

    const rabbitDifference = Math.abs(discreteRabbits - rabbits) / Math.max(1, rabbits);
    const foxDifference = Math.abs(discreteFoxes - foxes) / Math.max(1, foxes);
    $("#differenceText").textContent = percent((rabbitDifference + foxDifference) * 50);
    renderScene(rabbits, foxes);
  }

  function renderScene(rabbits, foxes) {
    const result = state.result.continuous;
    const maxRabbits = Math.max(1, ...result.rabbits);
    const maxFoxes = Math.max(1, ...result.foxes);
    const rabbitRatio = Math.min(1, rabbits / maxRabbits);
    const foxRatio = Math.min(1, foxes / maxFoxes);
    const rabbitCount = rabbits < .5 ? 0 : Math.max(1, Math.round(4 + rabbitRatio * 38));
    const foxCount = foxes < .5 ? 0 : Math.max(1, Math.round(2 + foxRatio * 20));
    $("#rabbitDots").innerHTML = "<i></i>".repeat(rabbitCount);
    $("#foxDots").innerHTML = "<i></i>".repeat(foxCount);
    $("#rabbitMeterText").textContent = number(rabbits, 1);
    $("#foxMeterText").textContent = number(foxes, 1);
    $("#rabbitMeter").style.width = `${rabbitRatio * 100}%`;
    $("#foxMeter").style.width = `${foxRatio * 100}%`;
    $("#ecosystemScene").setAttribute("aria-label", `현재 토끼 ${number(rabbits, 0)}마리와 여우 ${number(foxes, 0)}마리의 상대적 규모`);
  }

  function setupCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(300, rect.width || 300);
    const height = Math.max(220, rect.height || 220);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    return { ctx, width, height };
  }

  function niceMaximum(value) {
    if (!Number.isFinite(value) || value <= 0) return 1;
    const power = 10 ** Math.floor(Math.log10(value));
    const scaled = value / power;
    const nice = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
    return nice * power;
  }

  function drawAxes(ctx, width, height, maxX, maxY, xLabel, yLabel) {
    const pad = { left: 52, right: 17, top: 17, bottom: 39 };
    const plotWidth = width - pad.left - pad.right;
    const plotHeight = height - pad.top - pad.bottom;
    ctx.strokeStyle = colors.grid;
    ctx.fillStyle = "#66736f";
    ctx.lineWidth = 1;
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let tick = 0; tick <= 5; tick += 1) {
      const y = pad.top + plotHeight * tick / 5;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(width - pad.right, y); ctx.stroke();
      ctx.fillText(number(maxY * (1 - tick / 5), maxY < 10 ? 1 : 0), pad.left - 7, y);
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let tick = 0; tick <= 5; tick += 1) {
      const x = pad.left + plotWidth * tick / 5;
      ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, height - pad.bottom); ctx.stroke();
      ctx.fillText(number(maxX * tick / 5, maxX < 10 ? 1 : 0), x, height - pad.bottom + 7);
    }
    ctx.fillStyle = colors.ink;
    ctx.font = "700 10px system-ui, sans-serif";
    ctx.fillText(xLabel, pad.left + plotWidth / 2, height - 14);
    ctx.save(); ctx.translate(13, pad.top + plotHeight / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(yLabel, 0, 0); ctx.restore();
    return { pad, plotWidth, plotHeight };
  }

  function drawSeries(ctx, values, mapX, mapY, color, dashed, currentLimit) {
    const limit = Math.min(values.length - 1, currentLimit == null ? values.length - 1 : currentLimit);
    const stride = Math.max(1, Math.floor(limit / 1400));
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = dashed ? 1.8 : 2.8; ctx.setLineDash(dashed ? [7, 5] : []); ctx.lineJoin = "round";
    ctx.beginPath();
    for (let index = 0; index <= limit; index += stride) {
      const x = mapX(index); const y = mapY(values[index]);
      if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    if (limit % stride !== 0) ctx.lineTo(mapX(limit), mapY(values[limit]));
    ctx.stroke(); ctx.restore();
  }

  function drawTimeChart() {
    const canvas = $("#timeChart");
    const { ctx, width, height } = setupCanvas(canvas);
    const result = state.result;
    const maxObserved = state.observations.reduce((max, row) => Math.max(max, row.rabbits, row.foxes), 0);
    const maxY = niceMaximum(Math.max(maxObserved, ...result.continuous.rabbits, ...result.continuous.foxes, ...result.discrete.rabbits, ...result.discrete.foxes) * 1.04);
    const axes = drawAxes(ctx, width, height, result.config.duration, maxY, "시간 t", "개체수");
    const mapX = (index) => axes.pad.left + axes.plotWidth * result.times[index] / result.config.duration;
    const mapTime = (time) => axes.pad.left + axes.plotWidth * time / result.config.duration;
    const mapY = (value) => axes.pad.top + axes.plotHeight * (1 - Math.min(maxY, Math.max(0, value)) / maxY);
    drawSeries(ctx, result.continuous.rabbits, mapX, mapY, colors.rabbit, false, result.config.steps);
    drawSeries(ctx, result.continuous.foxes, mapX, mapY, colors.fox, false, result.config.steps);
    drawSeries(ctx, result.discrete.rabbits, mapX, mapY, colors.rabbit, true, result.config.steps);
    drawSeries(ctx, result.discrete.foxes, mapX, mapY, colors.fox, true, result.config.steps);

    ctx.save(); ctx.strokeStyle = colors.ink; ctx.globalAlpha = .45; ctx.setLineDash([3, 4]);
    const currentX = mapX(state.index); ctx.beginPath(); ctx.moveTo(currentX, axes.pad.top); ctx.lineTo(currentX, height - axes.pad.bottom); ctx.stroke(); ctx.restore();
    state.observations.forEach((row) => {
      if (row.time < 0 || row.time > result.config.duration) return;
      [[row.rabbits, colors.rabbit], [row.foxes, colors.fox]].forEach(([value, color]) => {
        ctx.beginPath(); ctx.arc(mapTime(row.time), mapY(value), 4.5, 0, Math.PI * 2); ctx.fillStyle = "#fffdf8"; ctx.fill(); ctx.lineWidth = 2.3; ctx.strokeStyle = color; ctx.stroke();
      });
    });
  }

  function drawPhaseChart() {
    const canvas = $("#phaseChart");
    const { ctx, width, height } = setupCanvas(canvas);
    const result = state.result;
    const maxRabbits = niceMaximum(Math.max(...result.continuous.rabbits, ...result.discrete.rabbits, ...state.observations.map((row) => row.rabbits)) * 1.05);
    const maxFoxes = niceMaximum(Math.max(...result.continuous.foxes, ...result.discrete.foxes, ...state.observations.map((row) => row.foxes)) * 1.05);
    const axes = drawAxes(ctx, width, height, maxRabbits, maxFoxes, "토끼 수 R", "여우 수 F");
    const mapR = (value) => axes.pad.left + axes.plotWidth * Math.min(maxRabbits, Math.max(0, value)) / maxRabbits;
    const mapF = (value) => axes.pad.top + axes.plotHeight * (1 - Math.min(maxFoxes, Math.max(0, value)) / maxFoxes);
    const drawPhaseSeries = (rabbits, foxes, color, dashed) => {
      const limit = result.config.steps; const stride = Math.max(1, Math.floor(limit / 1400));
      ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = dashed ? 1.8 : 2.8; ctx.setLineDash(dashed ? [7, 5] : []); ctx.beginPath();
      for (let index = 0; index <= limit; index += stride) { const x = mapR(rabbits[index]); const y = mapF(foxes[index]); if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.stroke(); ctx.restore();
    };
    drawPhaseSeries(result.continuous.rabbits, result.continuous.foxes, colors.rabbit, false);
    drawPhaseSeries(result.discrete.rabbits, result.discrete.foxes, colors.fox, true);
    if (result.equilibrium.exists && result.equilibrium.rabbits <= maxRabbits && result.equilibrium.foxes <= maxFoxes) {
      const x = mapR(result.equilibrium.rabbits); const y = mapF(result.equilibrium.foxes);
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); ctx.fillStyle = colors.equilibrium; ctx.fillRect(-5, -5, 10, 10); ctx.restore();
      ctx.fillStyle = colors.ink; ctx.font = "700 10px system-ui"; ctx.fillText("균형점", x + 9, y - 7);
    }
    const x = mapR(result.continuous.rabbits[state.index]); const y = mapF(result.continuous.foxes[state.index]);
    ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fillStyle = "#fffdf8"; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = colors.ink; ctx.stroke();
    if (state.observations.length > 1) {
      ctx.save(); ctx.strokeStyle = colors.observed; ctx.setLineDash([2, 4]); ctx.beginPath(); state.observations.forEach((row, index) => index ? ctx.lineTo(mapR(row.rabbits), mapF(row.foxes)) : ctx.moveTo(mapR(row.rabbits), mapF(row.foxes))); ctx.stroke(); ctx.restore();
    }
  }

  function renderTable() {
    const result = state.result;
    const start = Math.max(0, Math.min(result.config.steps - 6, state.index - 3));
    const end = Math.min(result.config.steps, start + 6);
    const rows = [];
    for (let index = start; index <= end; index += 1) {
      const cr = result.continuous.rabbits[index]; const cf = result.continuous.foxes[index]; const dr = result.discrete.rabbits[index]; const df = result.discrete.foxes[index];
      rows.push(`<tr${index === state.index ? ' class="current" aria-current="true"' : ""}><td>${index}${index === state.index ? " · 현재" : ""}</td><td>${number(result.times[index], 2)}</td><td>${number(cr, 2)}</td><td>${number(cf, 2)}</td><td>${number(dr, 2)}</td><td>${number(df, 2)}</td><td>${number(dr - cr, 2)}</td><td>${number(df - cf, 2)}</td></tr>`);
    }
    $("#calculationRows").innerHTML = rows.join("");
  }

  function play() {
    if (state.index >= state.result.config.steps) { state.index = 0; state.playPosition = 0; }
    state.playing = true; state.previousFrameTime = 0;
    $("#playButton").setAttribute("aria-pressed", "true"); $("#playButton").innerHTML = '<span aria-hidden="true">Ⅱ</span> 일시정지';
    state.animationFrame = requestAnimationFrame(animate);
  }

  function pause() {
    state.playing = false; cancelAnimationFrame(state.animationFrame);
    const button = $("#playButton");
    if (button) { button.setAttribute("aria-pressed", "false"); button.innerHTML = '<span aria-hidden="true">▶</span> 재생'; }
  }

  function animate(time) {
    if (!state.playing) return;
    if (!state.previousFrameTime) state.previousFrameTime = time;
    const elapsed = Math.min(100, time - state.previousFrameTime); state.previousFrameTime = time;
    const speed = Number($("#speedSelect").value);
    state.playPosition += elapsed / 1000 * speed * state.result.config.steps / 24;
    state.index = Math.min(state.result.config.steps, Math.floor(state.playPosition));
    renderAll();
    if (state.index >= state.result.config.steps) pause(); else state.animationFrame = requestAnimationFrame(animate);
  }

  function stepForward() {
    pause(); state.index = Math.min(state.result.config.steps, state.index + 1); state.playPosition = state.index; renderAll();
  }

  function resetTime() {
    pause(); state.index = 0; state.playPosition = 0; renderAll();
  }

  function parseObservations(text) {
    const rows = String(text).trim().split(/\r?\n/).filter(Boolean);
    const parsed = [];
    rows.forEach((line, index) => {
      const cells = line.split(/[;,\t]/).map((cell) => cell.trim());
      const values = cells.slice(0, 3).map(Number);
      if (index === 0 && values.some((value) => !Number.isFinite(value))) return;
      if (values.length < 3 || values.some((value) => !Number.isFinite(value))) throw new Error(`${index + 1}번째 줄의 세 값을 확인하세요.`);
      if (values.some((value) => value < 0)) throw new Error(`${index + 1}번째 줄에는 음수를 사용할 수 없습니다.`);
      parsed.push({ time: values[0], rabbits: values[1], foxes: values[2] });
    });
    if (!parsed.length) throw new Error("숫자로 된 관측값이 없습니다.");
    return parsed.sort((a, b) => a.time - b.time);
  }

  function applyObservations() {
    try {
      state.observations = parseObservations($("#observationInput").value);
      $("#observationStatus").textContent = `관측값 ${state.observations.length}개를 그래프에 표시했습니다.`;
      renderAll(); showToast("관측 자료를 적용했습니다.");
    } catch (error) {
      $("#observationStatus").textContent = error.message;
      showToast(error.message);
    }
  }

  function exportCsv() {
    const result = state.result;
    const observationMap = new Map(state.observations.map((row) => [row.time.toFixed(9), row]));
    const c = result.config;
    const lines = [
      "# E2 토끼와 여우 생태계 모델",
      `# alpha=${c.rabbitGrowth}, beta=${c.predationRate}, gamma=${c.foxDeathRate}, delta=${c.foxGrowthRate}, R0=${c.initialRabbits}, F0=${c.initialFoxes}, duration=${c.duration}, dt=${c.actualDt}, carryingCapacity=${c.useCapacity ? c.carryingCapacity : "off"}`,
      "time,continuous_rabbits,continuous_foxes,discrete_rabbits,discrete_foxes,observed_rabbits,observed_foxes"
    ];
    result.times.forEach((time, index) => {
      const observed = observationMap.get(time.toFixed(9));
      lines.push([time, result.continuous.rabbits[index], result.continuous.foxes[index], result.discrete.rabbits[index], result.discrete.foxes[index], observed ? observed.rabbits : "", observed ? observed.foxes : ""].map((value) => typeof value === "number" ? value.toFixed(3) : value).join(","));
    });
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "rabbit-fox-ecosystem-result.csv"; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("계산 결과 CSV를 만들었습니다.");
  }

  function getSavedScenarios() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
  }

  function setSavedScenarios(value) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); return true; } catch { showToast("이 브라우저에서는 저장 공간을 사용할 수 없습니다."); return false; }
  }

  function renderSavedScenarios() {
    const select = $("#savedScenario"); const current = select.value; const saved = getSavedScenarios();
    select.innerHTML = '<option value="">저장한 상황 선택</option>' + Object.keys(saved).sort().map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
    if (saved[current]) select.value = current;
  }

  function escapeHtml(text) {
    const div = document.createElement("div"); div.textContent = text; return div.innerHTML;
  }

  function saveScenario() {
    const name = $("#scenarioName").value.trim(); if (!name) { showToast("상황 이름을 먼저 입력하세요."); return; }
    const saved = getSavedScenarios(); saved[name] = readConfig();
    if (setSavedScenarios(saved)) { renderSavedScenarios(); $("#savedScenario").value = name; showToast(`‘${name}’ 상황을 저장했습니다.`); }
  }

  function loadScenario() {
    const name = $("#savedScenario").value; const saved = getSavedScenarios(); if (!name || !saved[name]) { showToast("불러올 상황을 선택하세요."); return; }
    writeConfig(saved[name]); setActivePreset(""); runSimulation(); showToast(`‘${name}’ 상황을 불러왔습니다.`);
  }

  function deleteScenario() {
    const name = $("#savedScenario").value; const saved = getSavedScenarios(); if (!name || !saved[name]) { showToast("삭제할 상황을 선택하세요."); return; }
    delete saved[name]; if (setSavedScenarios(saved)) { renderSavedScenarios(); showToast(`‘${name}’ 상황을 삭제했습니다.`); }
  }

  function showToast(message) {
    const toast = $("#toast"); clearTimeout(state.toastTimer); toast.textContent = message; toast.hidden = false;
    state.toastTimer = setTimeout(() => { toast.hidden = true; }, 2600);
  }

  function bindEvents() {
    const guideDialog = $("#guideDialog");
    $("#guideButton").addEventListener("click", () => guideDialog.showModal());
    $("#guideCloseButton").addEventListener("click", () => guideDialog.close());
    guideDialog.addEventListener("click", (event) => { if (event.target === guideDialog) guideDialog.close(); });
    $$('[data-preset]').forEach((button) => button.addEventListener("click", () => { const name = button.dataset.preset; writeConfig(presets[name]); setActivePreset(name); runSimulation(); showToast(`${button.querySelector("b").textContent} 조건을 적용했습니다.`); }));
    $$('[data-parameter]').forEach((input) => input.addEventListener("change", () => { setActivePreset(""); runSimulation({ keepTime: true }); }));
    $("#capacityToggle").addEventListener("change", (event) => { $("#capacityField").hidden = !event.target.checked; setActivePreset(""); runSimulation({ keepTime: true }); });
    $("#playButton").addEventListener("click", () => state.playing ? pause() : play());
    $("#stepButton").addEventListener("click", stepForward); $("#resetButton").addEventListener("click", resetTime);
    $("#timeSlider").addEventListener("input", (event) => { pause(); state.index = Number(event.target.value); state.playPosition = state.index; renderAll(); });
    $("#saveScenario").addEventListener("click", saveScenario); $("#loadScenario").addEventListener("click", loadScenario); $("#deleteScenario").addEventListener("click", deleteScenario);
    $("#applyObservation").addEventListener("click", applyObservations);
    $("#clearObservation").addEventListener("click", () => { state.observations = []; $("#observationStatus").textContent = "관측값을 지웠습니다."; renderAll(); });
    $("#csvFile").addEventListener("change", (event) => { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { $("#observationInput").value = String(reader.result); applyObservations(); }; reader.onerror = () => showToast("CSV 파일을 읽지 못했습니다."); reader.readAsText(file, "utf-8"); });
    $("#exportCsv").addEventListener("click", exportCsv);
    window.addEventListener("resize", () => requestAnimationFrame(renderAll));
    document.addEventListener("keydown", (event) => {
      const tag = document.activeElement && document.activeElement.tagName;
      if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(tag)) return;
      if (event.code === "Space") { event.preventDefault(); state.playing ? pause() : play(); }
      if (event.code === "ArrowRight") { event.preventDefault(); stepForward(); }
      if (event.code === "Home") { event.preventDefault(); resetTime(); }
    });
  }

  function init() {
    bindEvents(); renderSavedScenarios(); setActivePreset("balance");
    try { state.observations = parseObservations($("#observationInput").value); } catch { state.observations = []; }
    runSimulation();
  }

  init();
})();
