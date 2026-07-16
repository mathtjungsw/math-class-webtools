(function () {
  "use strict";

  const B = window.BayesFilter;
  const $ = (id) => document.getElementById(id);
  const terrainColors = { "일반도로": "#7d8993", "파랑": "#2d76a8", "노랑": "#d1a11d", "빨강": "#b34b55" };
  const landmarkIcons = { "학교": "🏫", "공원": "🌳", "신호등": "🚦", "충전소": "⚡", "": "" };
  const sensorNames = { terrain: "도로색", landmark: "랜드마크", "distance-wall": "가까운 벽까지 거리", "distance-landmark": "가까운 랜드마크까지 거리" };
  const stageNames = { prior: "이동 전 믿음", prediction: "이동 예측분포", likelihood: "센서 가능도", unnormalized: "정규화 전 값", posterior: "정규화된 사후분포" };
  const moveCommands = {
    up: { dx: 0, dy: -1, label: "위쪽" },
    left: { dx: -1, dy: 0, label: "왼쪽" },
    right: { dx: 1, dy: 0, label: "오른쪽" },
    down: { dx: 0, dy: 1, label: "아래쪽" },
  };

  function cell(blocked, terrain, landmark) {
    return { blocked: Boolean(blocked), terrain: terrain || "일반도로", landmark: landmark || "" };
  }

  function make1dMap(terrains, landmarks, topology) {
    return { width: terrains.length, height: 1, topology: topology || "cycle", cells: terrains.map((terrain, index) => cell(false, terrain, landmarks[index])) };
  }

  function makeCityMap() {
    const width = 6;
    const height = 5;
    const blocked = new Set([2, 8, 11, 19, 20, 27]);
    const blue = new Set([0, 1, 6, 7, 12, 13, 18, 24, 25]);
    const yellow = new Set([4, 5, 10, 16, 22, 28, 29]);
    const landmarks = { 0: "학교", 5: "공원", 14: "신호등", 17: "학교", 24: "충전소", 29: "공원" };
    return {
      width, height, topology: "finite",
      cells: Array.from({ length: width * height }, (_, index) => cell(blocked.has(index), blue.has(index) ? "파랑" : yellow.has(index) ? "노랑" : "일반도로", landmarks[index] || "")),
    };
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function scenario(name, mode, map, actualIndex, motion, sensors, mission, priorKind) {
    const prior = priorKind === "biased" ? B.biasedPrior(map, actualIndex, .55) : B.uniformPrior(map);
    return { name, mode, map, prior, actualIndex, motion, sensors, mission };
  }

  function buildPresets() {
    const loopMap = make1dMap(
      ["파랑", "일반도로", "파랑", "노랑", "파랑", "일반도로", "파랑", "노랑"],
      ["학교", "", "신호등", "", "학교", "", "공원", ""],
      "cycle"
    );
    const driftMap = make1dMap(
      ["일반도로", "파랑", "파랑", "일반도로", "노랑", "일반도로", "파랑", "노랑", "일반도로"],
      ["", "", "학교", "", "", "", "신호등", "", "공원"],
      "finite"
    );
    const cityMap = makeCityMap();
    return {
      loop: {
        description: "같은 색과 학교 표지가 반복되어 한 번의 관측만으로는 후보 위치가 여러 곳에 남습니다.",
        scenario: scenario("반복 표지판 순환도로", "1d", loopMap, 3, { stay: .1, under: .1, exact: .7, over: .1 }, [
          { type: "terrain", accuracy: .85, falsePositive: .1 },
          { type: "landmark", accuracy: .9, falsePositive: .05 },
        ], { goal: "센서 4회 안에 최고확률을 70% 이상으로 만들기", maxSensorUses: 4, targetIndex: 6 })
      },
      drift: {
        description: "정확 이동 확률이 낮아 명령을 반복할수록 믿음이 퍼지고, 고유 표지 관측으로 다시 좁혀집니다.",
        scenario: scenario("이동 오차 누적 도로", "1d", driftMap, 1, { stay: .15, under: .15, exact: .5, over: .2 }, [
          { type: "terrain", accuracy: .72, falsePositive: .16 },
          { type: "landmark", accuracy: .92, falsePositive: .04 },
        ], { goal: "퍼진 분포를 센서 3회 안에 다시 좁히기", maxSensorUses: 3, targetIndex: 8 }, "biased")
      },
      city: {
        description: "도로·벽·랜드마크가 있는 알려진 지도에서 방향 이동과 두 센서 관측을 결합합니다.",
        scenario: scenario("알려진 격자 도시", "2d", cityMap, 13, { stay: .1, under: .1, exact: .72, over: .08 }, [
          { type: "distance-wall", accuracy: .82, falsePositive: .08 },
          { type: "landmark", accuracy: .9, falsePositive: .04 },
        ], { goal: "센서 5회 안에 목적지까지 이동하고 최고확률 45% 이상 만들기", maxSensorUses: 5, targetIndex: 29 })
      },
      wrong: {
        description: "실제 센서는 자주 틀리지만 필터는 거의 완벽하다고 잘못 믿습니다. 과신한 모형이 추정을 틀리게 할 수 있습니다.",
        scenario: Object.assign(scenario("과신한 센서 모형", "2d", clone(cityMap), 21, { stay: .12, under: .13, exact: .65, over: .1 }, [
          { type: "terrain", accuracy: .98, falsePositive: .01 },
          { type: "landmark", accuracy: .97, falsePositive: .01 },
        ], { goal: "센서 모형을 의심하며 추정 오류를 발견하기", maxSensorUses: 4, targetIndex: 5 }), {
          actualSensors: [
            { type: "terrain", accuracy: .56, falsePositive: .2 },
            { type: "landmark", accuracy: .62, falsePositive: .18 },
          ],
        })
      },
    };
  }

  const presets = buildPresets();
  const missions = [
    { name: "관측 전 최고확률 예상", description: "지금 분포에서 가장 높은 칸을 먼저 기록한 뒤 관측 결과와 비교하세요.", preset: "loop" },
    { name: "정확·부정확 센서 비교", description: "센서 A는 정확도 95%, 센서 B는 55%로 맞추고 같은 종류의 관측이 분포를 얼마나 다르게 좁히는지 비교하세요.", preset: "loop", tweak: "accuracy" },
    { name: "균등·편향 사전분포 비교", description: "같은 관측이라도 시작 믿음이 다르면 사후분포가 달라지는지 교사 설정의 시작 분포로 비교하세요.", preset: "loop", tweak: "prior" },
    { name: "반복 랜드마크의 여러 봉우리", description: "학교가 두 곳인 도로에서 학교 관측 뒤 확률이 한 곳으로 확정되지 않는 이유를 설명하세요.", preset: "loop", tweak: "repeat" },
    { name: "오차로 퍼지고 관측으로 좁히기", description: "이동을 세 번 먼저 적용해 엔트로피를 높인 뒤 랜드마크 관측으로 다시 낮춰 보세요.", preset: "drift", tweak: "drift" },
    { name: "잘못된 센서 모형의 과신", description: "실제 센서보다 훨씬 정확하다고 가정하면 틀린 관측 하나가 추정을 어떻게 끌고 가는지 확인하세요.", preset: "wrong", tweak: "wrong" },
  ];

  const state = {
    scenario: null,
    initialScenario: null,
    distribution: [],
    stages: { prior: [], prediction: [], likelihood: [], unnormalized: [], posterior: [] },
    actualIndex: 0,
    selectedIndex: 0,
    selectedStage: "prior",
    selectedMove: "right",
    rng: null,
    step: 0,
    history: [],
    lastEvidence: 1,
    lastObservation: null,
    observations: [],
    studentPrediction: null,
    revealActual: false,
    stageTimer: null,
    missionIndex: 0,
    completedMissions: new Set(),
    challenge: { active: false, sensorsRemaining: 0, moves: 0, score: null, kind: "identify" },
    editorTool: "road",
    teacherDraft: null,
    teacherPriorKind: "uniform",
  };

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
  }

  function formatProbability(value, digits) {
    if (!Number.isFinite(value)) return "—";
    return `${(value * 100).toFixed(digits === undefined ? (value < .01 ? 2 : 1) : digits)}%`;
  }

  function formatValue(value) {
    if (!Number.isFinite(value)) return "—";
    if (value === 0) return "0";
    if (Math.abs(value) < .0001) return value.toExponential(2);
    return value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
  }

  function locationLabel(index, map) {
    const point = B.pointOf(map || state.scenario.map, index);
    return (map || state.scenario.map).height === 1 ? `${index + 1}번 칸` : `(${point.x + 1}, ${point.y + 1}) 칸`;
  }

  function setStatus(message, type) {
    $("statusMessage").textContent = message;
    $("statusMessage").className = `status-message${type ? ` is-${type}` : ""}`;
  }

  function sensorFor(slot) {
    return state.scenario.sensors[slot === "A" ? 0 : 1];
  }

  function actualSensorFor(slot) {
    const index = slot === "A" ? 0 : 1;
    const actual = state.scenario.actualSensors && state.scenario.actualSensors[index];
    return actual ? { ...actual, type: state.scenario.sensors[index].type } : state.scenario.sensors[index];
  }

  function maxEntropy() {
    const count = B.passableIndices(state.scenario.map).length;
    return count > 1 ? Math.log2(count) : 1;
  }

  function uncertainty(distribution) {
    return B.entropy(distribution) / maxEntropy();
  }

  function addHistory(label) {
    const max = B.maxProbability(state.distribution);
    state.history.push({ label, confidence: max.probability, entropy: uncertainty(state.distribution) });
    if (state.history.length > 24) state.history.shift();
  }

  function resetStages(distribution) {
    state.stages = {
      prior: distribution.slice(),
      prediction: distribution.slice(),
      likelihood: distribution.map((value, index) => B.isPassable(state.scenario.map, index) ? 1 : 0),
      unnormalized: distribution.slice(),
      posterior: distribution.slice(),
    };
    state.lastEvidence = 1;
  }

  function loadScenario(nextScenario, description, presetKey) {
    state.scenario = clone(nextScenario);
    state.initialScenario = clone(nextScenario);
    state.distribution = state.scenario.prior.slice();
    state.actualIndex = state.scenario.actualIndex;
    state.selectedIndex = B.passableIndices(state.scenario.map)[0];
    state.selectedStage = "prior";
    state.rng = B.createRng($("seedInput").value || "O14-2026");
    state.step = 0;
    state.history = [];
    state.observations = [];
    state.lastObservation = null;
    state.studentPrediction = null;
    state.revealActual = false;
    state.challenge = { active: false, sensorsRemaining: 0, moves: 0, score: null, kind: state.scenario.mode === "2d" ? "destination" : "identify" };
    $("studentModeToggle").checked = true;
    resetStages(state.distribution);
    addHistory("시작");
    if (presetKey) $("presetSelect").value = presetKey;
    $("presetDescription").textContent = description || "교사가 만든 사용자 시나리오입니다.";
    $("comparisonPanel").hidden = true;
    $("observationText").textContent = "아직 관측하지 않음";
    $("predictionFeedback").textContent = "아직 예상하지 않았습니다.";
    renderAll();
    setStatus(`‘${state.scenario.name}’ 시나리오를 준비했습니다. 실제 위치와 확률분포는 서로 다를 수 있습니다.`);
  }

  function loadPreset(key) {
    const preset = presets[key] || presets.loop;
    loadScenario(preset.scenario, preset.description, key);
  }

  function updateScenarioSensorTypes() {
    state.scenario.sensors[0].type = $("sensorASelect").value;
    state.scenario.sensors[1].type = $("sensorBSelect").value;
    renderControls();
  }

  function renderControls() {
    const map = state.scenario.map;
    document.querySelectorAll("[data-mode]").forEach((button) => {
      const active = button.dataset.mode === state.scenario.mode;
      button.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll("[data-move]").forEach((button) => {
      const direction = button.dataset.move;
      const disabled = state.scenario.mode === "1d" && (direction === "up" || direction === "down");
      button.disabled = disabled;
      button.setAttribute("aria-pressed", String(direction === state.selectedMove));
    });
    if (state.scenario.mode === "1d" && (state.selectedMove === "up" || state.selectedMove === "down")) state.selectedMove = "right";
    $("sensorASelect").value = state.scenario.sensors[0].type;
    $("sensorBSelect").value = state.scenario.sensors[1].type;
    $("sensorAMeta").textContent = `정확도 ${formatProbability(state.scenario.sensors[0].accuracy, 0)} · 오인식 ${formatProbability(state.scenario.sensors[0].falsePositive, 0)}`;
    $("sensorBMeta").textContent = `정확도 ${formatProbability(state.scenario.sensors[1].accuracy, 0)} · 오인식 ${formatProbability(state.scenario.sensors[1].falsePositive, 0)}`;
    $("motionSummary").textContent = `정확 ${formatProbability(state.scenario.motion.exact, 0)}`;
    $("sensorBudgetBadge").textContent = state.challenge.active ? `남은 ${state.challenge.sensorsRemaining}회` : "제한 없음";
    $("revealActualButton").textContent = state.revealActual ? "실제 위치 다시 숨기기" : "실제 위치 잠깐 공개";
    $("actualHiddenNotice").hidden = !$("studentModeToggle").checked || state.revealActual;
    $("probabilityMap").style.setProperty("--cols", map.width);
    $("distributionStages").style.setProperty("--cols", map.width);
  }

  function terrainColor(terrain) {
    return terrainColors[terrain] || "#7d8993";
  }

  function mapCellHtml(cellData, index, maxProbability) {
    const probability = state.distribution[index] || 0;
    if (cellData.blocked) {
      return `<button class="map-cell is-blocked" type="button" role="gridcell" disabled aria-label="${locationLabel(index)} 벽 또는 장애물"><span class="cell-top"><span class="cell-number">${index + 1}</span></span><b class="cell-probability">벽</b><span class="cell-label">이동 불가</span></button>`;
    }
    const heat = maxProbability > 0 ? Math.min(100, probability / maxProbability * 100) : 0;
    const actualVisible = !$("studentModeToggle").checked || state.revealActual;
    const classes = ["map-cell", index === state.selectedIndex ? "is-selected" : "", actualVisible && index === state.actualIndex ? "is-actual" : "", state.challenge.active && state.challenge.kind === "destination" && index === state.scenario.mission.targetIndex ? "is-target" : ""].filter(Boolean).join(" ");
    const icon = landmarkIcons[cellData.landmark] || (cellData.landmark ? "◆" : "");
    const target = state.challenge.active && state.challenge.kind === "destination" && index === state.scenario.mission.targetIndex ? " · 목적지" : "";
    return `<button class="${classes}" type="button" role="gridcell" data-cell-index="${index}" aria-label="${locationLabel(index)}, 확률 ${formatProbability(probability)}, ${escapeHtml(cellData.terrain)}${cellData.landmark ? `, ${escapeHtml(cellData.landmark)}` : ""}${target}" style="--heat:${heat}%;--bar:${heat}%;--terrain-color:${terrainColor(cellData.terrain)};--heat-color:#159b91"><span class="cell-top"><span class="cell-number">${index + 1}</span><span class="cell-landmark" aria-hidden="true">${icon}</span></span><b class="cell-probability">${formatProbability(probability)}</b><span class="cell-label">${escapeHtml(cellData.landmark || cellData.terrain)}${target}</span><span class="cell-heat-bar"></span></button>`;
  }

  function renderMap() {
    const map = state.scenario.map;
    const max = Math.max(...state.distribution);
    const mapElement = $("probabilityMap");
    mapElement.classList.toggle("is-2d", map.height > 1);
    mapElement.innerHTML = map.cells.map((item, index) => mapCellHtml(item, index, max)).join("");
    const best = B.maxProbability(state.distribution);
    $("bestLocation").textContent = locationLabel(best.index);
    $("bestProbability").textContent = formatProbability(best.probability);
    $("entropyValue").textContent = `${B.entropy(state.distribution).toFixed(3)} bit`;
    const total = B.sum(state.distribution);
    $("probabilitySum").textContent = total.toFixed(6);
    $("probabilitySum").style.color = B.almostEqual(total, 1, 1e-8) ? "" : "var(--red)";
    const predictionSelect = $("studentPrediction");
    const currentValue = predictionSelect.value;
    predictionSelect.innerHTML = B.passableIndices(map).map((index) => `<option value="${index}">${locationLabel(index)}</option>`).join("");
    if (B.isPassable(map, Number(currentValue))) predictionSelect.value = currentValue;
  }

  function valuesForStage(stage) {
    return state.stages[stage] || [];
  }

  function renderStages() {
    document.querySelectorAll("[data-stage]").forEach((button) => {
      button.setAttribute("aria-selected", String(button.dataset.stage === state.selectedStage));
    });
    const values = valuesForStage(state.selectedStage);
    const max = Math.max(...values, 0);
    const map = state.scenario.map;
    const container = $("distributionStages");
    container.classList.toggle("is-2d", map.height > 1);
    container.innerHTML = map.cells.map((cellData, index) => {
      if (cellData.blocked) return `<div class="distribution-cell is-blocked"><b>벽</b><small>${index + 1}번</small></div>`;
      const value = values[index] || 0;
      const height = max > 0 ? value / max * 100 : 0;
      const selected = index === state.selectedIndex ? " is-selected" : "";
      const display = state.selectedStage === "likelihood" ? value.toFixed(3) : state.selectedStage === "unnormalized" ? formatValue(value) : formatProbability(value);
      return `<button type="button" class="distribution-cell${selected}" data-stage-cell="${index}" style="--height:${height}%" aria-label="${locationLabel(index)} ${stageNames[state.selectedStage]} ${display}"><b>${display}</b><small>${index + 1}번</small></button>`;
    }).join("");
    const explanations = {
      prior: `사전분포는 이동하기 전 각 위치에 대한 믿음입니다. 합은 ${B.sum(values).toFixed(6)}입니다.`,
      prediction: `이동 모형이 제자리·덜 이동·정확·더 이동 가능성을 섞었습니다. 벽이나 지도 밖 이동은 마지막 가능한 칸에서 멈춥니다. 합은 ${B.sum(values).toFixed(6)}입니다.`,
      likelihood: `가능도 P(관측|위치)는 현재 관측이 각 칸에서 나올 그럴듯함입니다. 위치 확률분포가 아니므로 합이 1일 필요가 없습니다.`,
      unnormalized: `각 칸에서 예측확률×가능도를 계산했습니다. 전체 합 ${formatValue(state.lastEvidence)}가 관측의 전체 가능성 P(관측)입니다.`,
      posterior: `정규화 전 값을 전체 합 ${formatValue(state.lastEvidence)}로 나누었습니다. 새 확률의 합은 ${B.sum(values).toFixed(6)}이고, 이 분포가 다음 단계의 사전분포가 됩니다.`,
    };
    $("stageExplanation").textContent = explanations[state.selectedStage];
  }

  function renderCalculation() {
    const index = state.selectedIndex;
    const prior = state.stages.prior[index] || 0;
    const prediction = state.stages.prediction[index] || 0;
    const likelihood = state.stages.likelihood[index] || 0;
    const product = state.stages.unnormalized[index] || 0;
    const posterior = state.stages.posterior[index] || 0;
    $("selectedCellBadge").textContent = locationLabel(index);
    $("formulaBox").textContent = `${formatProbability(posterior)} = (${formatValue(likelihood)} × ${formatValue(prediction)}) ÷ ${formatValue(state.lastEvidence)}`;
    $("calculationBody").innerHTML = [
      ["이동 전 믿음 Pₜ₋₁(x)", formatValue(prior), `전체 합 ${B.sum(state.stages.prior).toFixed(6)}`],
      ["이동 후 예측 P⁻ₜ(x)", formatValue(prediction), `전체 합 ${B.sum(state.stages.prediction).toFixed(6)}`],
      ["센서 가능도 P(z|x)", formatValue(likelihood), "각 위치에서 관측이 나올 그럴듯함"],
      ["정규화 전 곱", formatValue(product), `전체 칸의 곱 합 = ${formatValue(state.lastEvidence)}`],
      ["사후확률 P(x|z)", formatValue(posterior), `전체 합 ${B.sum(state.stages.posterior).toFixed(6)}`],
    ].map((row) => `<tr><th scope="row">${row[0]}</th><td>${row[1]}</td><td>${row[2]}</td></tr>`).join("");
    $("normalizationExplanation").textContent = state.lastEvidence > B.EPSILON
      ? `모든 칸의 ‘가능도×예측’을 더한 ${formatValue(state.lastEvidence)}로 각각을 나누면 합이 1인 사후분포가 됩니다. 이 나눗셈이 정규화입니다.`
      : "모든 칸의 곱이 0이면 나눌 수 없습니다. 이 경우 현재 믿음을 유지하고 센서 모형 또는 관측값을 점검합니다.";
  }

  function drawHistory() {
    const canvas = $("historyChart");
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(320, rect.width || 600);
    const height = Math.max(210, rect.height || 240);
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    const context = canvas.getContext("2d");
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    const pad = { left: 38, right: 15, top: 18, bottom: 35 };
    const plotWidth = width - pad.left - pad.right;
    const plotHeight = height - pad.top - pad.bottom;
    context.strokeStyle = "#dce3e8";
    context.lineWidth = 1;
    context.fillStyle = "#6b7785";
    context.font = "10px system-ui";
    [0, .25, .5, .75, 1].forEach((value) => {
      const y = pad.top + (1 - value) * plotHeight;
      context.beginPath(); context.moveTo(pad.left, y); context.lineTo(width - pad.right, y); context.stroke();
      context.fillText(`${Math.round(value * 100)}%`, 5, y + 3);
    });
    if (state.history.length < 1) return;
    const xFor = (index) => pad.left + (state.history.length === 1 ? plotWidth / 2 : index / (state.history.length - 1) * plotWidth);
    function drawLine(key, color) {
      context.beginPath();
      state.history.forEach((item, index) => {
        const x = xFor(index); const y = pad.top + (1 - item[key]) * plotHeight;
        if (!index) context.moveTo(x, y); else context.lineTo(x, y);
      });
      context.strokeStyle = color; context.lineWidth = 3; context.lineJoin = "round"; context.lineCap = "round"; context.stroke();
      state.history.forEach((item, index) => { const x = xFor(index); const y = pad.top + (1 - item[key]) * plotHeight; context.beginPath(); context.arc(x, y, 3, 0, Math.PI * 2); context.fillStyle = color; context.fill(); });
    }
    drawLine("confidence", "#087f79");
    drawLine("entropy", "#b96812");
    context.fillStyle = "#6b7785";
    const labels = state.history.length <= 8 ? state.history.map((_, index) => index) : [0, Math.floor((state.history.length - 1) / 2), state.history.length - 1];
    labels.forEach((index) => { const text = state.history[index].label.slice(0, 9); context.fillText(text, Math.max(2, xFor(index) - context.measureText(text).width / 2), height - 13); });
    canvas.setAttribute("aria-label", state.history.map((item) => `${item.label}: 최고확률 ${formatProbability(item.confidence)}, 정규화 엔트로피 ${formatProbability(item.entropy)}`).join(". "));
  }

  function renderChallenge() {
    const challenge = state.challenge;
    $("challengeScore").textContent = challenge.score === null ? "—점" : `${challenge.score}점`;
    $("challengeSensors").textContent = challenge.active ? challenge.sensorsRemaining : state.scenario.mission.maxSensorUses;
    $("challengeUncertainty").textContent = formatProbability(uncertainty(state.distribution), 0);
    $("challengeMoves").textContent = challenge.moves;
    $("finishChallengeButton").disabled = !challenge.active;
    $("startChallengeButton").textContent = challenge.active ? "도전 다시 시작" : "도전 시작";
    $("challengeGoal").textContent = challenge.kind === "destination"
      ? `${locationLabel(state.scenario.mission.targetIndex)} 목적지에 도달하고 최고확률을 45% 이상으로 만드세요. 센서는 ${state.scenario.mission.maxSensorUses}회까지 사용할 수 있습니다.`
      : state.scenario.mission.goal;
    $("sensorBudgetBadge").textContent = challenge.active ? `남은 ${challenge.sensorsRemaining}회` : "제한 없음";
  }

  function renderMission() {
    $("missionTabs").innerHTML = missions.map((mission, index) => `<button type="button" role="tab" aria-selected="${index === state.missionIndex}" data-mission-index="${index}">${state.completedMissions.has(index) ? "✓ " : ""}${index + 1}. ${escapeHtml(mission.name.split(" ")[0])}</button>`).join("");
    const mission = missions[state.missionIndex];
    $("missionNumber").textContent = `MISSION ${String(state.missionIndex + 1).padStart(2, "0")}`;
    $("missionName").textContent = mission.name;
    $("missionDescription").textContent = mission.description;
    $("missionProgress").textContent = `${state.completedMissions.size} / ${missions.length} 탐구`;
  }

  function renderAll() {
    renderControls();
    renderMap();
    renderStages();
    renderCalculation();
    drawHistory();
    renderChallenge();
    renderMission();
  }

  function selectCell(index) {
    if (!B.isPassable(state.scenario.map, index)) return;
    state.selectedIndex = index;
    renderMap();
    renderStages();
    renderCalculation();
  }

  function applyMove() {
    const motionCheck = B.validateMotion(state.scenario.motion, 1e-8);
    if (!motionCheck.ok) return setStatus(motionCheck.reason, "error");
    const direction = moveCommands[state.selectedMove];
    const command = { dx: direction.dx, dy: direction.dy, steps: Number($("moveSteps").value) };
    try {
      const prior = state.distribution.slice();
      const prediction = B.predict(prior, state.scenario.map, command, state.scenario.motion);
      const actual = B.sampleMove(state.scenario.map, state.actualIndex, command, state.scenario.motion, state.rng);
      state.actualIndex = actual.index;
      state.distribution = prediction;
      state.step += 1;
      state.stages = {
        prior,
        prediction: prediction.slice(),
        likelihood: prediction.map((value, index) => B.isPassable(state.scenario.map, index) ? 1 : 0),
        unnormalized: prediction.slice(),
        posterior: prediction.slice(),
      };
      state.lastEvidence = 1;
      state.selectedStage = "prediction";
      if (state.challenge.active) state.challenge.moves += 1;
      addHistory(`이동 ${state.step}`);
      renderAll();
      setStatus(`${direction.label} ${command.steps}칸 명령을 적용했습니다. 실제 차는 ‘${actual.outcome}’ 결과로 움직였고, 필터의 예측분포 합은 1입니다.`);
    } catch (error) {
      setStatus(error.message, "error");
    }
  }

  function canUseSensors(count) {
    if (!state.challenge.active) return true;
    if (state.challenge.sensorsRemaining < count) {
      setStatus(`남은 센서 사용 횟수가 ${state.challenge.sensorsRemaining}회라서 이 관측을 실행할 수 없습니다.`, "warning");
      return false;
    }
    state.challenge.sensorsRemaining -= count;
    return true;
  }

  function recordObservation(slot, observation, sensor) {
    const item = { step: state.step, slot, observation, sensor: sensorNames[sensor.type], at: locationLabel(state.actualIndex) };
    state.observations.push(item);
    const list = $("mappingLog");
    if (state.observations.length === 1) list.innerHTML = "";
    const li = document.createElement("li");
    li.textContent = `${state.step}단계 · 센서 ${slot}(${item.sensor}) = ${observation}. 위치를 모르면 이 기록만으로 지도와 위치를 동시에 정하기 어렵습니다.`;
    list.appendChild(li);
  }

  function observeSingle(slot) {
    if (!canUseSensors(1)) return;
    const filterSensor = sensorFor(slot);
    const actualSensor = actualSensorFor(slot);
    const observation = B.sampleObservation(state.scenario.map, state.actualIndex, actualSensor, state.rng);
    const prediction = state.distribution.slice();
    const likelihood = B.likelihoods(state.scenario.map, observation, filterSensor);
    const result = B.update(prediction, likelihood);
    state.lastObservation = { slot, observation };
    $("observationText").textContent = `센서 ${slot} · ${sensorNames[filterSensor.type]} = ${observation}`;
    recordObservation(slot, observation, filterSensor);
    if (!result.ok) {
      if (state.challenge.active) state.challenge.sensorsRemaining += 1;
      renderChallenge();
      return setStatus(`${result.reason} 현재 분포를 유지했습니다.`, "error");
    }
    state.stages = {
      prior: state.stages.prior.length ? state.stages.prior.slice() : prediction.slice(),
      prediction,
      likelihood,
      unnormalized: result.unnormalized,
      posterior: result.posterior,
    };
    state.lastEvidence = result.evidence;
    state.distribution = result.posterior;
    state.selectedStage = "posterior";
    addHistory(`센서 ${slot}`);
    renderAll();
    setStatus(`센서 ${slot} 관측 ‘${observation}’의 가능도를 곱하고 ${formatValue(result.evidence)}로 정규화했습니다. 결과는 추정이며 확정 위치가 아닙니다.`);
  }

  function miniDistributionHtml(distribution) {
    const max = Math.max(...distribution, 0);
    return distribution.map((value, index) => B.isPassable(state.scenario.map, index) ? `<i class="mini-bar" title="${locationLabel(index)} ${formatProbability(value)}" style="--value:${max ? value / max * 100 : 0}%"></i>` : "").join("");
  }

  function compareSensors() {
    if (!canUseSensors(2)) return;
    const filterA = sensorFor("A"); const filterB = sensorFor("B");
    const observationA = B.sampleObservation(state.scenario.map, state.actualIndex, actualSensorFor("A"), state.rng);
    const observationB = B.sampleObservation(state.scenario.map, state.actualIndex, actualSensorFor("B"), state.rng);
    const base = state.distribution.slice();
    const likelihoodA = B.likelihoods(state.scenario.map, observationA, filterA);
    const likelihoodB = B.likelihoods(state.scenario.map, observationB, filterB);
    const sequential = B.updateSequential(base, [likelihoodA, likelihoodB]);
    const together = B.updateTogether(base, [likelihoodA, likelihoodB]);
    recordObservation("A", observationA, filterA); recordObservation("B", observationB, filterB);
    $("observationText").textContent = `A=${observationA} · B=${observationB}`;
    if (!sequential.ok || !together.ok) {
      if (state.challenge.active) state.challenge.sensorsRemaining += 2;
      renderChallenge();
      return setStatus((sequential.reason || together.reason) + " 현재 분포를 유지했습니다.", "error");
    }
    const difference = Math.max(...sequential.posterior.map((value, index) => Math.abs(value - together.posterior[index])));
    $("sequentialDistribution").innerHTML = miniDistributionHtml(sequential.posterior);
    $("togetherDistribution").innerHTML = miniDistributionHtml(together.posterior);
    const seqBest = B.maxProbability(sequential.posterior); const togetherBest = B.maxProbability(together.posterior);
    $("sequentialSummary").textContent = `최고 ${locationLabel(seqBest.index)} · ${formatProbability(seqBest.probability)}`;
    $("togetherSummary").textContent = `최고 ${locationLabel(togetherBest.index)} · ${formatProbability(togetherBest.probability)}`;
    $("comparisonDifference").textContent = `최대 차이 ${difference.toExponential(1)}`;
    $("comparisonPanel").hidden = false;
    const combined = B.combineLikelihoods([likelihoodA, likelihoodB]);
    state.stages = { prior: base.slice(), prediction: base.slice(), likelihood: combined, unnormalized: together.unnormalized, posterior: together.posterior };
    state.lastEvidence = together.evidence;
    state.distribution = together.posterior;
    state.selectedStage = "posterior";
    addHistory("센서 A×B");
    renderAll();
    setStatus(`센서 A ‘${observationA}’, B ‘${observationB}’를 비교했습니다. 조건부 독립 가정에서 순차와 동시 결과가 수치 오차 범위에서 같습니다.`);
  }

  function recordPrediction() {
    const index = Number($("studentPrediction").value);
    state.studentPrediction = index;
    const best = B.maxProbability(state.distribution);
    const matches = index === best.index;
    $("predictionFeedback").textContent = `${locationLabel(index)}을 기록했습니다. ${matches ? "현재 분포의 최고확률 위치와 같습니다." : `현재 최고확률은 ${locationLabel(best.index)}이지만, 관측 후 순위가 바뀔 수 있습니다.`}`;
    $("missionPredictCheck").checked = true;
    updateMissionCompletion();
  }

  function switchMode(mode) {
    if (mode === state.scenario.mode) return;
    loadPreset(mode === "2d" ? "city" : "loop");
  }

  function animateStages() {
    if (state.stageTimer) {
      clearInterval(state.stageTimer); state.stageTimer = null; $("animateStagesButton").textContent = "▶ 단계 재생"; return;
    }
    const order = ["prior", "prediction", "likelihood", "unnormalized", "posterior"];
    let index = 0;
    state.selectedStage = order[index]; renderStages(); renderCalculation();
    $("animateStagesButton").textContent = "Ⅱ 멈추기";
    state.stageTimer = setInterval(() => {
      index += 1;
      if (index >= order.length) { clearInterval(state.stageTimer); state.stageTimer = null; $("animateStagesButton").textContent = "▶ 단계 재생"; return; }
      state.selectedStage = order[index]; renderStages(); renderCalculation();
    }, 850);
  }

  function selectMission(index) {
    state.missionIndex = index;
    $("missionPredictCheck").checked = false; $("missionCompareCheck").checked = false; $("missionExplainCheck").checked = false;
    renderMission();
  }

  function loadCurrentMission() {
    const mission = missions[state.missionIndex];
    loadPreset(mission.preset);
    if (mission.tweak === "accuracy") {
      state.scenario.sensors[0] = { type: "terrain", accuracy: .95, falsePositive: .03 };
      state.scenario.sensors[1] = { type: "terrain", accuracy: .55, falsePositive: .25 };
      resetStages(state.distribution); renderAll();
    } else if (mission.tweak === "prior") {
      state.scenario.prior = B.biasedPrior(state.scenario.map, state.actualIndex, .55);
      state.distribution = state.scenario.prior.slice(); resetStages(state.distribution); state.history = []; addHistory("편향 시작"); renderAll();
    } else if (mission.tweak === "repeat") {
      state.scenario.sensors[1].type = "landmark"; renderAll();
    }
    setStatus(`${mission.name} 미션을 준비했습니다. 먼저 예측을 기록하고 두 조건을 비교해 보세요.`);
  }

  function updateMissionCompletion() {
    const complete = $("missionPredictCheck").checked && $("missionCompareCheck").checked && $("missionExplainCheck").checked;
    if (complete) state.completedMissions.add(state.missionIndex);
    else state.completedMissions.delete(state.missionIndex);
    renderMission();
  }

  function startChallenge() {
    const initial = clone(state.initialScenario);
    loadScenario(initial, $("presetDescription").textContent, $("presetSelect").value);
    state.challenge = { active: true, sensorsRemaining: state.scenario.mission.maxSensorUses, moves: 0, score: null, kind: state.scenario.mode === "2d" ? "destination" : "identify" };
    $("challengeFeedback").textContent = state.challenge.kind === "destination" ? "목적지 칸이 지도에 표시됩니다. 분포를 보며 이동하고 필요한 순간에 센서를 사용하세요." : "센서를 아껴 쓰며 최고확률을 70% 이상으로 만드세요.";
    $("challengeFeedback").className = "feedback";
    renderAll();
  }

  function finishChallenge() {
    if (!state.challenge.active) return;
    const best = B.maxProbability(state.distribution);
    const normalEntropy = uncertainty(state.distribution);
    const targetReached = state.challenge.kind !== "destination" || state.actualIndex === state.scenario.mission.targetIndex;
    const confidenceReached = best.probability >= (state.challenge.kind === "destination" ? .45 : .7);
    const correct = best.index === state.actualIndex;
    const success = targetReached && confidenceReached && correct;
    const remainingBonus = state.challenge.sensorsRemaining / state.scenario.mission.maxSensorUses;
    const score = Math.max(0, Math.round((success ? 300 : 80) + best.probability * 320 + (1 - normalEntropy) * 220 + remainingBonus * 140 - state.challenge.moves * 12));
    state.challenge.score = score;
    state.challenge.active = false;
    state.revealActual = true;
    $("challengeFeedback").textContent = success
      ? `성공! 실제 위치 ${locationLabel(state.actualIndex)}과 최고확률 위치가 일치합니다. 남은 센서와 낮은 불확실성을 반영해 ${score}점입니다.`
      : `도전 종료. 실제 위치는 ${locationLabel(state.actualIndex)}, 최고확률 위치는 ${locationLabel(best.index)}입니다. ${!targetReached ? "목적지에 아직 도달하지 못했습니다. " : ""}${!correct ? "추정 위치가 실제 위치와 달랐습니다. " : ""}센서 모형과 이동 기록을 살펴보세요.`;
    $("challengeFeedback").className = `feedback ${success ? "is-good" : "is-bad"}`;
    renderAll();
  }

  function download(filename, content, type) {
    const blob = new Blob([content], { type: type || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
  }

  function recordText() {
    const best = B.maxProbability(state.distribution);
    return `자율주행 베이즈 위치 추정 실험 기록\n\n시나리오: ${state.scenario.name}\n모형: ${state.scenario.mode === "1d" ? "1차원" : "2차원"} 이산 베이즈 필터\n난수 시드: ${$("seedInput").value}\n이동 확률: 제자리 ${state.scenario.motion.stay}, 덜 이동 ${state.scenario.motion.under}, 정확 ${state.scenario.motion.exact}, 더 이동 ${state.scenario.motion.over}\n센서 A: ${sensorNames[state.scenario.sensors[0].type]} 정확도 ${state.scenario.sensors[0].accuracy}\n센서 B: ${sensorNames[state.scenario.sensors[1].type]} 정확도 ${state.scenario.sensors[1].accuracy}\n\n최고확률 위치: ${locationLabel(best.index)} (${formatProbability(best.probability)})\n엔트로피: ${B.entropy(state.distribution).toFixed(4)} bit\n확률 합: ${B.sum(state.distribution).toFixed(8)}\n실제 위치: ${state.revealActual || !$("studentModeToggle").checked ? locationLabel(state.actualIndex) : "학생 모드에서 숨김"}\n\n관측 기록\n${state.observations.map((item) => `- ${item.step}단계 센서 ${item.slot} ${item.sensor}: ${item.observation}`).join("\n") || "- 없음"}\n\n미션 기록\n${$("missionNotes").value}\n\n종합 결론\n${$("studentNotes").value}\n\n주의: 이 결과는 유한한 칸 위의 교육용 확률 추정이며 실제 자율주행 또는 산업용 SLAM 결과가 아닙니다.`;
  }

  function openTeacher() {
    state.teacherDraft = clone(state.scenario);
    state.teacherPriorKind = "uniform";
    syncTeacherForm();
    $("teacherDialog").showModal();
  }

  function syncTeacherForm() {
    const draft = state.teacherDraft;
    $("teacherMode").value = draft.mode;
    $("teacherWidth").value = draft.map.width; $("teacherHeight").value = draft.map.height; $("teacherTopology").value = draft.map.topology;
    $("teacherHeight").disabled = draft.mode === "1d"; $("teacherTopology").disabled = draft.mode === "2d";
    $("teacherPrior").value = state.teacherPriorKind;
    $("motionStay").value = draft.motion.stay; $("motionUnder").value = draft.motion.under; $("motionExact").value = draft.motion.exact; $("motionOver").value = draft.motion.over;
    $("teacherSensorA").value = draft.sensors[0].type; $("sensorAAccuracy").value = draft.sensors[0].accuracy; $("sensorAFp").value = draft.sensors[0].falsePositive;
    $("teacherSensorB").value = draft.sensors[1].type; $("sensorBAccuracy").value = draft.sensors[1].accuracy; $("sensorBFp").value = draft.sensors[1].falsePositive;
    $("teacherMissionGoal").value = draft.mission.goal; $("teacherMaxSensors").value = draft.mission.maxSensorUses;
    updateMotionSum(); renderTeacherMap();
  }

  function renderTeacherMap() {
    const draft = state.teacherDraft; const mapElement = $("teacherMap");
    mapElement.style.setProperty("--cols", draft.map.width);
    mapElement.innerHTML = draft.map.cells.map((item, index) => {
      const icon = item.blocked ? "▦" : landmarkIcons[item.landmark] || "";
      return `<button type="button" class="teacher-cell${item.blocked ? " is-blocked" : ""}${index === draft.actualIndex ? " is-actual" : ""}${index === draft.mission.targetIndex ? " is-target" : ""}" data-teacher-cell="${index}" style="--cell-color:${terrainColor(item.terrain)}" aria-label="${locationLabel(index, draft.map)} ${item.blocked ? "벽" : `${item.terrain} ${item.landmark}`}">${icon || index + 1}</button>`;
    }).join("");
  }

  function resizeTeacherMap() {
    if (!state.teacherDraft) return;
    const draft = state.teacherDraft;
    const mode = $("teacherMode").value;
    const width = Math.max(3, Math.min(12, Math.round(Number($("teacherWidth").value) || 3)));
    const height = mode === "1d" ? 1 : Math.max(3, Math.min(12, Math.round(Number($("teacherHeight").value) || 3)));
    const oldMap = draft.map; const cells = [];
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      cells.push(x < oldMap.width && y < oldMap.height ? clone(oldMap.cells[B.indexOf(oldMap, x, y)]) : cell(false, "일반도로", ""));
    }
    draft.mode = mode; draft.map = { width, height, topology: mode === "1d" ? $("teacherTopology").value : "finite", cells };
    draft.actualIndex = B.isPassable(draft.map, draft.actualIndex) ? draft.actualIndex : B.passableIndices(draft.map)[0];
    draft.mission.targetIndex = B.isPassable(draft.map, draft.mission.targetIndex) ? draft.mission.targetIndex : B.passableIndices(draft.map).slice(-1)[0];
    draft.prior = B.uniformPrior(draft.map);
    $("teacherHeight").value = height; $("teacherHeight").disabled = mode === "1d"; $("teacherTopology").disabled = mode === "2d";
    renderTeacherMap();
  }

  function editTeacherCell(index) {
    const draft = state.teacherDraft; const current = draft.map.cells[index]; const tool = state.editorTool;
    if (tool === "actual" || tool === "target") {
      if (current.blocked) return setStatus("막힌 칸은 실제 위치나 목적지로 선택할 수 없습니다.", "warning");
      if (tool === "actual") draft.actualIndex = index; else draft.mission.targetIndex = index;
    } else if (tool === "wall") {
      if (index === draft.actualIndex || index === draft.mission.targetIndex) return setStatus("실제 위치나 목적지 칸을 먼저 옮겨 주세요.", "warning");
      draft.map.cells[index] = cell(true, "일반도로", "");
    } else if (tool === "road") draft.map.cells[index] = cell(false, "일반도로", "");
    else if (tool === "blue") draft.map.cells[index] = cell(false, "파랑", current.landmark);
    else if (tool === "yellow") draft.map.cells[index] = cell(false, "노랑", current.landmark);
    else if (tool === "school") draft.map.cells[index] = cell(false, current.terrain, "학교");
    else if (tool === "park") draft.map.cells[index] = cell(false, current.terrain, "공원");
    else if (tool === "signal") draft.map.cells[index] = cell(false, current.terrain, "신호등");
    renderTeacherMap();
  }

  function collectTeacherScenario() {
    const draft = clone(state.teacherDraft);
    draft.name = "교사 사용자 시나리오";
    draft.map.topology = draft.mode === "1d" ? $("teacherTopology").value : "finite";
    draft.motion = { stay: Number($("motionStay").value), under: Number($("motionUnder").value), exact: Number($("motionExact").value), over: Number($("motionOver").value) };
    draft.sensors = [
      { type: $("teacherSensorA").value, accuracy: Number($("sensorAAccuracy").value), falsePositive: Number($("sensorAFp").value) },
      { type: $("teacherSensorB").value, accuracy: Number($("sensorBAccuracy").value), falsePositive: Number($("sensorBFp").value) },
    ];
    draft.mission = { goal: $("teacherMissionGoal").value.trim() || "가장 적은 관측으로 위치 특정하기", maxSensorUses: Math.max(1, Math.min(20, Number($("teacherMaxSensors").value) || 4)), targetIndex: draft.mission.targetIndex };
    const priorKind = $("teacherPrior").value;
    draft.prior = priorKind === "uniform" ? B.uniformPrior(draft.map) : B.biasedPrior(draft.map, priorKind === "biased" ? draft.actualIndex : state.selectedIndex < B.mapSize(draft.map) && B.isPassable(draft.map, state.selectedIndex) ? state.selectedIndex : draft.actualIndex, .55);
    delete draft.actualSensors;
    return draft;
  }

  function updateMotionSum() {
    const total = ["motionStay", "motionUnder", "motionExact", "motionOver"].reduce((sum, id) => sum + (Number($(id).value) || 0), 0);
    $("motionSumCheck").textContent = `이동 확률 합: ${total.toFixed(2)}${B.almostEqual(total, 1, 1e-8) ? " · 적용 가능" : " · 1이 되도록 수정하세요"}`;
    $("motionSumCheck").classList.toggle("is-error", !B.almostEqual(total, 1, 1e-8));
  }

  function applyTeacherScenario() {
    try {
      const draft = collectTeacherScenario();
      const exported = B.exportScenario(draft);
      const safe = B.importScenario(exported);
      $("teacherDialog").close();
      loadScenario(safe, "교사가 지도·확률·센서·미션을 편집한 사용자 시나리오입니다.");
      setStatus("교사 설정을 적용했습니다. 확률 합과 이동 가능 칸을 다시 검증했습니다.");
    } catch (error) { setStatus(error.message, "error"); }
  }

  function bindEvents() {
    $("openGuideButton").addEventListener("click", () => $("guideDialog").showModal());
    $("heroGuideButton").addEventListener("click", () => $("guideDialog").showModal());
    $("startGuideButton").addEventListener("click", () => { $("guideDialog").close(); $("presetSelect").focus(); });
    $("openTeacherButton").addEventListener("click", openTeacher);
    document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => $(button.dataset.closeDialog).close()));
    document.querySelectorAll("dialog").forEach((dialog) => dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); }));
    $("fullscreenButton").addEventListener("click", async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch (_) { setStatus("이 브라우저에서는 전체화면을 시작할 수 없습니다.", "warning"); } });
    $("presetSelect").addEventListener("change", (event) => loadPreset(event.target.value));
    document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => switchMode(button.dataset.mode)));
    $("seedInput").addEventListener("change", () => { state.rng = B.createRng($("seedInput").value); setStatus("난수 시드를 바꿨습니다. ‘같은 시나리오 다시’로 처음부터 재현할 수 있습니다."); });
    $("replayButton").addEventListener("click", () => loadScenario(state.initialScenario, $("presetDescription").textContent, $("presetSelect").value));
    $("resetButton").addEventListener("click", () => loadScenario(state.initialScenario, $("presetDescription").textContent, $("presetSelect").value));
    $("studentModeToggle").addEventListener("change", () => { state.revealActual = false; renderAll(); });
    $("revealActualButton").addEventListener("click", () => { state.revealActual = !state.revealActual; renderAll(); setStatus(state.revealActual ? `실제 위치는 ${locationLabel(state.actualIndex)}입니다. 확률분포와 비교해 보세요.` : "실제 위치를 다시 숨겼습니다."); });
    document.querySelectorAll("[data-move]").forEach((button) => button.addEventListener("click", () => { state.selectedMove = button.dataset.move; renderControls(); }));
    $("predictMoveButton").addEventListener("click", applyMove);
    $("sensorASelect").addEventListener("change", updateScenarioSensorTypes); $("sensorBSelect").addEventListener("change", updateScenarioSensorTypes);
    document.querySelectorAll("[data-observe]").forEach((button) => button.addEventListener("click", () => observeSingle(button.dataset.observe)));
    $("compareSensorsButton").addEventListener("click", () => { $("missionCompareCheck").checked = true; updateMissionCompletion(); compareSensors(); });
    $("probabilityMap").addEventListener("click", (event) => { const button = event.target.closest("[data-cell-index]"); if (button) selectCell(Number(button.dataset.cellIndex)); });
    $("distributionStages").addEventListener("click", (event) => { const button = event.target.closest("[data-stage-cell]"); if (button) selectCell(Number(button.dataset.stageCell)); });
    document.querySelectorAll("[data-stage]").forEach((button) => button.addEventListener("click", () => { state.selectedStage = button.dataset.stage; renderStages(); renderCalculation(); }));
    $("animateStagesButton").addEventListener("click", animateStages);
    $("recordPredictionButton").addEventListener("click", recordPrediction);
    $("clearHistoryButton").addEventListener("click", () => { state.history = []; addHistory("현재"); drawHistory(); });
    $("missionTabs").addEventListener("click", (event) => { const button = event.target.closest("[data-mission-index]"); if (button) selectMission(Number(button.dataset.missionIndex)); });
    $("loadMissionButton").addEventListener("click", loadCurrentMission);
    ["missionPredictCheck", "missionCompareCheck", "missionExplainCheck"].forEach((id) => $(id).addEventListener("change", updateMissionCompletion));
    $("missionNotes").addEventListener("input", () => { localStorage.setItem("bayes-localization-mission-notes", $("missionNotes").value); if ($("missionNotes").value.trim().length > 20) $("missionExplainCheck").checked = true; updateMissionCompletion(); });
    $("studentNotes").addEventListener("input", () => localStorage.setItem("bayes-localization-student-notes", $("studentNotes").value));
    $("startChallengeButton").addEventListener("click", startChallenge); $("finishChallengeButton").addEventListener("click", finishChallenge);
    $("clearMappingLogButton").addEventListener("click", () => { state.observations = []; $("mappingLog").innerHTML = "<li>아직 관측 기록이 없습니다.</li>"; });
    $("exportRecordButton").addEventListener("click", () => download("bayes-localization-record.txt", recordText(), "text/plain;charset=utf-8"));
    $("printButton").addEventListener("click", () => window.print());
    $("teacherMode").addEventListener("change", resizeTeacherMap); $("teacherWidth").addEventListener("change", resizeTeacherMap); $("teacherHeight").addEventListener("change", resizeTeacherMap); $("teacherTopology").addEventListener("change", () => { state.teacherDraft.map.topology = $("teacherTopology").value; });
    document.querySelectorAll("[data-editor-tool]").forEach((button) => button.addEventListener("click", () => { state.editorTool = button.dataset.editorTool; document.querySelectorAll("[data-editor-tool]").forEach((item) => item.setAttribute("aria-pressed", String(item === button))); }));
    $("teacherMap").addEventListener("click", (event) => { const button = event.target.closest("[data-teacher-cell]"); if (button) editTeacherCell(Number(button.dataset.teacherCell)); });
    ["motionStay", "motionUnder", "motionExact", "motionOver"].forEach((id) => $(id).addEventListener("input", updateMotionSum));
    $("applyTeacherButton").addEventListener("click", applyTeacherScenario);
    $("saveScenarioButton").addEventListener("click", () => { try { download("bayes-localization-scenario.json", B.exportScenario(collectTeacherScenario()), "application/json;charset=utf-8"); } catch (error) { setStatus(error.message, "error"); } });
    $("loadScenarioInput").addEventListener("change", async (event) => { const file = event.target.files[0]; if (!file) return; try { state.teacherDraft = B.importScenario(await file.text()); state.teacherPriorKind = "selected"; syncTeacherForm(); setStatus("JSON 프리셋을 검증해 교사 편집기에 불러왔습니다."); } catch (error) { setStatus(`JSON을 불러오지 못했습니다: ${error.message}`, "error"); } event.target.value = ""; });
    window.addEventListener("resize", drawHistory);
  }

  bindEvents();
  $("missionNotes").value = localStorage.getItem("bayes-localization-mission-notes") || "";
  $("studentNotes").value = localStorage.getItem("bayes-localization-student-notes") || "";
  loadPreset("loop");
})();
