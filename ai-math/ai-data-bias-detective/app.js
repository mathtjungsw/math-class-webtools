(function () {
  "use strict";

  const M = window.BiasDetectiveModel;
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

  const SPLIT_META = {
    train: { title: "훈련", explanation: "모델이 조건부 빈도를 세는 자료입니다. 체크를 바꾸면 모델도 즉시 다시 계산됩니다." },
    validation: { title: "검증", explanation: "훈련과 같은 수집 규칙을 따르지만 훈련에는 쓰지 않은 자료입니다. 같은 편향을 공유하면 검증 정확도도 높을 수 있습니다." },
    general: { title: "일반 테스트", explanation: "훈련과 비슷한 분포에서 새 장면을 평가합니다. 카드 id는 훈련과 겹치지 않습니다." },
    counterfactual: { title: "배경 반전", explanation: "목표 특징과 정답은 유지하고 배경·날씨·카메라를 뒤집은 분포이동 시험입니다." },
  };

  const state = {
    config: M.createConfig({}),
    cards: [],
    maskedFeatures: [],
    model: null,
    evaluations: null,
    activeSplit: "train",
    changedCard: null,
    actionCount: 0,
    history: [],
    notes: { expectation: "", evidence: "", conclusion: "", modelChoice: "" },
    missions: { suspect: false, choice: false },
    lastRepair: "",
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function percent(value) {
    return value == null || !Number.isFinite(value) ? "—" : `${Math.round(value * 100)}%`;
  }

  function signed(value) {
    if (!Number.isFinite(value)) return "0.00";
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
  }

  function classById(id) {
    return state.config.scenario.classes.find((item) => item.id === id) || { id, name: id, short: id };
  }

  function featureByKey(key) {
    return state.config.scenario.features.find((item) => item.key === key) || { key, name: key, values: [] };
  }

  function valueName(key, id) {
    if (id === M.MASKED_VALUE) return "가림";
    const definition = featureByKey(key);
    const value = definition.values.find((item) => item.id === id);
    return value ? value.name : id;
  }

  function setStatus(message, warning) {
    const node = $("#statusMessage");
    node.textContent = message;
    node.classList.toggle("is-warning", Boolean(warning));
  }

  function openDialog(id) {
    const dialog = $(`#${id}`);
    if (!dialog) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function closeDialog(id) {
    const dialog = $(`#${id}`);
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function download(name, text, type) {
    const blob = new Blob([text], { type: type || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function initializeExperiment(config, keepHistory) {
    state.config = M.createConfig(config || state.config);
    state.cards = M.generateDataset(state.config);
    state.maskedFeatures = [];
    state.changedCard = null;
    state.actionCount = 0;
    state.lastRepair = "";
    state.missions = { suspect: false, choice: false };
    if (!keepHistory) state.history = [];
    recompute();
  }

  function recompute() {
    state.model = M.trainModel(state.cards, state.config, state.maskedFeatures);
    state.evaluations = state.model.ok ? M.evaluateAll(state.model, state.cards, state.config) : Object.fromEntries(M.SPLITS.map((split) => [split, M.evaluate(state.model, [], state.config)]));
    renderAll();
  }

  function renderAll() {
    renderSetup();
    renderDataset();
    renderModel();
    renderCounterfactual();
    renderRepair();
    renderMissions();
    renderHistory();
  }

  function renderSetup() {
    const scenario = state.config.scenario;
    $("#scenarioSelect").value = state.config.scenarioId;
    $("#caseTitle").textContent = scenario.title;
    $("#caseDescription").textContent = scenario.description;
    $("#caseSymbol").textContent = scenario.id === "robot" ? "⌁" : scenario.id === "animal" ? "⌃" : "♧";
    $("#targetFeatureName").textContent = scenario.features[0].name;
    $("#shortcutFeatureNames").textContent = scenario.features.slice(1).map((item) => item.name).join(" · ");
    $("#biasStrengthLabel").textContent = `${state.config.biasStrength}% 연결`;
    if ($("#expectationInput").value !== state.notes.expectation) $("#expectationInput").value = state.notes.expectation;
    if ($("#evidenceInput").value !== state.notes.evidence) $("#evidenceInput").value = state.notes.evidence;
    if ($("#conclusionInput").value !== state.notes.conclusion) $("#conclusionInput").value = state.notes.conclusion;
    if ($("#modelChoiceReason").value !== state.notes.modelChoice) $("#modelChoiceReason").value = state.notes.modelChoice;
  }

  function featureOptions(selected, includeTarget) {
    return state.config.scenario.features
      .filter((feature) => includeTarget || feature.role !== "target")
      .map((feature) => `<option value="${feature.key}"${feature.key === selected ? " selected" : ""}>${escapeHtml(feature.name)}</option>`).join("");
  }

  function renderFeatureControls() {
    const legend = state.config.scenario.features.map((feature) => {
      const masked = state.maskedFeatures.includes(feature.key);
      return `<span class="feature-chip ${feature.role === "target" ? "target" : ""} ${masked ? "masked" : ""}">${escapeHtml(feature.name)} · ${feature.role === "target" ? "목표" : "지름길 후보"}${masked ? " · 모델에서 제거" : ""}</span>`;
    }).join("");
    $("#featureLegend").innerHTML = legend;
    $("#activeFeatureChips").innerHTML = legend;
    const associationSelect = $("#associationFeatureSelect");
    const associationValue = associationSelect.value || "background";
    associationSelect.innerHTML = featureOptions(associationValue, true);
    const maskSelect = $("#maskFeatureSelect");
    const maskValue = maskSelect.value || "background";
    maskSelect.innerHTML = featureOptions(maskValue, true);
    const suspectSelect = $("#suspectFeatureSelect");
    const suspectValue = suspectSelect.value || "background";
    suspectSelect.innerHTML = featureOptions(suspectValue, true);
  }

  function sceneHtml(card, extraClass) {
    const features = card.features || {};
    const maskedClasses = M.FEATURE_KEYS.filter((key) => features[key] === M.MASKED_VALUE).map((key) => `is-masked-${key}`).join(" ");
    const shapeClass = state.config.scenarioId === "robot" ? "robot-shape" : state.config.scenarioId === "animal" ? "animal-shape" : "plant-shape";
    const aria = `${classById(card.label).name}, ${M.FEATURE_KEYS.map((key) => `${featureByKey(key).name} ${valueName(key, features[key])}`).join(", ")}`;
    return `<div class="synthetic-scene ${maskedClasses} ${extraClass || ""}" role="img" aria-label="${escapeHtml(aria)}" data-target="${escapeHtml(features.target)}" data-background="${escapeHtml(features.background)}" data-weather="${escapeHtml(features.weather)}" data-camera="${escapeHtml(features.camera)}"><span class="weather-mark" aria-hidden="true"></span><span class="${shapeClass}" aria-hidden="true"></span></div>`;
  }

  function renderDataset() {
    renderFeatureControls();
    const counts = Object.fromEntries(M.SPLITS.map((split) => [split, split === "train" ? state.cards.filter((card) => card.split === "train").length : M.splitCards(state.cards, split).length]));
    $$("[data-split-tab]").forEach((button) => {
      const active = button.dataset.splitTab === state.activeSplit;
      button.setAttribute("aria-selected", String(active));
      $("span", button).textContent = counts[button.dataset.splitTab];
    });
    const training = M.splitCards(state.cards, "train");
    $("#trainingCountBadge").textContent = `훈련 ${training.length}장 · 후보 ${state.cards.filter((card) => card.split === "train").length}장`;
    $("#splitExplanation").innerHTML = `<b>${SPLIT_META[state.activeSplit].title}</b> · ${SPLIT_META[state.activeSplit].explanation}`;
    const cards = state.cards.filter((card) => card.split === state.activeSplit);
    $("#dataCardGrid").innerHTML = cards.map((card) => {
      const train = card.split === "train";
      const included = !train || card.included !== false;
      const features = M.FEATURE_KEYS.map((key) => `<span title="${escapeHtml(featureByKey(key).name)}">${escapeHtml(valueName(key, card.features[key]))}</span>`).join("");
      return `<article class="data-item ${included ? "is-included" : "is-excluded"}" role="listitem" data-card-id="${escapeHtml(card.id)}">
        <div class="data-item__top"><strong>${escapeHtml(classById(card.label).name)}</strong>${train ? `<label class="include-toggle"><input type="checkbox" data-card-toggle="${escapeHtml(card.id)}" ${included ? "checked" : ""} /> 포함</label>` : ""}</div>
        ${sceneHtml(card)}
        <div class="data-item__features">${features}</div>
      </article>`;
    }).join("");
  }

  function metricTile(split, label, caption) {
    const result = state.evaluations[split];
    const dangerous = result.accuracy != null && result.accuracy < 0.6;
    return `<article class="metric-tile ${split === "counterfactual" ? "shift" : ""} ${dangerous ? "danger" : ""}"><span>${label}</span><strong>${percent(result.accuracy)}</strong><small>${result.total ? `${result.correct}/${result.total} 정답 · ${caption}` : "평가할 자료 없음"}</small></article>`;
  }

  function renderModel() {
    $("#metricGrid").innerHTML = [
      metricTile("train", "훈련 정확도", "본 자료"),
      metricTile("validation", "검증 정확도", "같은 수집 규칙"),
      metricTile("general", "일반 테스트", "비슷한 분포의 새 장면"),
      metricTile("counterfactual", "배경 반전", "지름길을 뒤집은 시험"),
    ].join("");
    if (!state.model.ok) {
      $("#metricWarning").textContent = state.model.message;
      $("#importanceChart").innerHTML = `<p class="empty-cell">${escapeHtml(state.model.message)}</p>`;
    } else {
      const gap = state.evaluations.general.accuracy != null && state.evaluations.counterfactual.accuracy != null ? state.evaluations.general.accuracy - state.evaluations.counterfactual.accuracy : null;
      $("#metricWarning").textContent = gap != null && gap >= 0.3 ? `주의: 일반 테스트와 배경 반전 시험의 차이가 ${percent(gap)}입니다. 높은 일반 정확도만으로 목표 특징을 배웠다고 말할 수 없습니다.` : "분포가 바뀐 시험과 조합별 최저 성능까지 함께 확인하세요.";
      renderImportance();
    }
    renderAssociation();
    renderConfusion();
    renderGroups();
  }

  function renderAssociation() {
    const key = $("#associationFeatureSelect").value || "background";
    const training = M.splitCards(state.cards, "train");
    const cross = M.crossTable(training, key, state.config);
    const definition = featureByKey(key);
    const classes = state.config.scenario.classes;
    const body = definition.values.map((value) => `<tr><th scope="row">${escapeHtml(value.name)}</th>${classes.map((item) => `<td>${cross.table[value.id][item.id]}장<br /><small>${percent(cross.percentages[value.id][item.id])}</small></td>`).join("")}</tr>`).join("");
    const label = cross.association >= 0.75 ? "매우 강한 연결" : cross.association >= 0.4 ? "뚜렷한 연결" : cross.association >= 0.15 ? "약한 연결" : "거의 연결 없음";
    $("#associationPanel").innerHTML = `<div class="table-wrap"><table class="cross-table"><thead><tr><th>${escapeHtml(definition.name)}</th>${classes.map((item) => `<th>${escapeHtml(item.name)}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></div><div class="association-summary"><div class="association-score">${Math.round(cross.association * 100)}</div><p><b>Cramér의 V × 100 · ${label}</b><br />0은 클래스별 비율이 같고 100은 특징값과 클래스가 완전히 묶였음을 뜻합니다.${cross.insufficient ? " 표본이 작아 해석에 주의하세요." : ""}</p></div>`;
  }

  function renderImportance() {
    const rows = state.config.scenario.features.map((feature) => {
      const item = state.model.importance[feature.key] || { percent: 0, raw: 0 };
      const masked = state.maskedFeatures.includes(feature.key);
      return `<div class="importance-row ${feature.role === "target" ? "target" : ""}"><span>${escapeHtml(feature.name)}${masked ? " (제거)" : ""}</span><div class="importance-track"><i style="width:${Math.min(100, item.percent)}%"></i></div><strong>${Math.round(item.percent)}%</strong></div>`;
    }).join("");
    $("#importanceChart").innerHTML = rows;
    $("#importanceChart").setAttribute("aria-label", `특징 중요도: ${state.config.scenario.features.map((feature) => `${feature.name} ${Math.round((state.model.importance[feature.key] || {}).percent || 0)}%`).join(", ")}`);
  }

  function renderConfusion() {
    const split = $("#matrixSplitSelect").value || "counterfactual";
    const result = state.evaluations[split];
    const classes = state.config.scenario.classes;
    if (!result.total) {
      $("#confusionMatrix").innerHTML = '<p class="empty-cell">평가할 자료가 없습니다.</p>';
      return;
    }
    const rows = classes.map((actual) => `<tr><th scope="row">실제 ${escapeHtml(actual.short)}</th>${classes.map((predicted) => { const count = result.matrix[actual.id][predicted.id]; return `<td class="${actual.id === predicted.id ? "is-diagonal" : count ? "is-error" : ""}">${count}</td>`; }).join("")}</tr>`).join("");
    $("#confusionMatrix").innerHTML = `<div class="matrix-wrap"><div class="matrix-axis">실제 클래스</div><div><div class="table-wrap"><table class="confusion-table"><thead><tr><th>실제 \ 예측</th>${classes.map((item) => `<th>${escapeHtml(item.short)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div><p class="matrix-caption">가로: 예측 클래스 · 세로: 실제 클래스</p></div></div>`;
  }

  function renderGroups() {
    const result = state.evaluations[$("#matrixSplitSelect").value || "counterfactual"];
    if (!result.groups.length) {
      $("#groupPerformance").innerHTML = '<p class="empty-cell">표시할 조합이 없습니다.</p>';
      return;
    }
    const rows = result.groups.map((group) => `<tr class="${group.insufficient ? "insufficient" : group.accuracy < 0.6 ? "danger" : ""}"><th scope="row">${escapeHtml(valueName("target", group.target))} × ${escapeHtml(valueName("background", group.background))}</th><td>${group.correct}/${group.total}</td><td>${percent(group.accuracy)}</td><td>${group.insufficient ? `표본 ${group.total}장 · 주의` : "평가 가능"}</td></tr>`).join("");
    $("#groupPerformance").innerHTML = `<div class="table-wrap"><table class="group-table"><thead><tr><th>조합</th><th>정답</th><th>정확도</th><th>표본 상태</th></tr></thead><tbody>${rows}</tbody></table></div><p class="small-note">신뢰 가능한 최저 조합 성능: <b>${percent(result.worstGroupAccuracy)}</b> · ${state.config.minimumGroupSize}장 미만 조합은 최저값 계산에서 제외</p>`;
  }

  function counterfactualSourceCards() {
    return state.cards.filter((card) => card.split === "general");
  }

  function predictionHtml(card) {
    const result = M.predict(state.model, card);
    if (!result.ok) return `<p class="empty-cell">${escapeHtml(result.message)}</p>`;
    const predicted = classById(result.predicted);
    const correct = result.predicted === card.label;
    const contributions = M.FEATURE_KEYS.filter((key) => result.contribution[key] != null && card.features[key] !== M.MASKED_VALUE);
    const maximum = Math.max(0.001, ...contributions.map((key) => Math.abs(result.contribution[key])));
    const rows = contributions.map((key) => {
      const amount = result.contribution[key];
      const supportsA = amount >= 0;
      const support = supportsA ? state.config.scenario.classes[0].short : state.config.scenario.classes[1].short;
      return `<div class="${supportsA ? "" : "against"}"><span>${escapeHtml(featureByKey(key).name)} → ${escapeHtml(support)}</span><i style="width:${Math.max(3, Math.abs(amount) / maximum * 100)}%"></i><b>${signed(amount)}</b></div>`;
    }).join("");
    return `<div class="prediction-head"><span>실제 ${escapeHtml(classById(card.label).name)}</span><strong>예측 ${escapeHtml(predicted.name)} ${correct ? "✓" : "✕"}${result.tied ? " · 동률 규칙" : ""}</strong></div><div class="score-list">${rows || "<small>사용한 특징이 없습니다.</small>"}</div><p class="small-note">양수는 ${escapeHtml(state.config.scenario.classes[0].short)}, 음수는 ${escapeHtml(state.config.scenario.classes[1].short)} 쪽으로 로그 점수를 밉니다.</p>`;
  }

  function renderCounterfactual() {
    const select = $("#counterfactualCardSelect");
    const cards = counterfactualSourceCards();
    const current = select.value;
    select.innerHTML = cards.map((card, index) => `<option value="${escapeHtml(card.id)}"${card.id === current || (!current && index === 0) ? " selected" : ""}>${escapeHtml(classById(card.label).name)} · ${index + 1}</option>`).join("");
    const original = cards.find((card) => card.id === select.value) || cards[0];
    if (!original) {
      $("#originalCardView").innerHTML = $("#changedCardView").innerHTML = '<p class="empty-cell">일반 테스트 카드가 없습니다.</p>';
      return;
    }
    if (!state.changedCard || !state.changedCard.id.startsWith(`${original.id}-cf-`)) state.changedCard = M.deepCopy(original);
    $("#originalCardView").innerHTML = sceneHtml(original);
    $("#changedCardView").innerHTML = sceneHtml(state.changedCard);
    $("#originalPrediction").innerHTML = predictionHtml(original);
    $("#changedPrediction").innerHTML = predictionHtml(state.changedCard);
    const first = M.predict(state.model, original);
    const second = M.predict(state.model, state.changedCard);
    const changed = first.ok && second.ok && first.predicted !== second.predicted;
    const actualChanged = original.label !== state.changedCard.label;
    const differences = M.FEATURE_KEYS.filter((key) => original.features[key] !== state.changedCard.features[key]).map((key) => featureByKey(key).name);
    $("#counterfactualVerdict").classList.toggle("changed", changed);
    $("#counterfactualVerdict").textContent = differences.length ? `${differences.join(" · ")}만 바꿨습니다. 예측은 ${changed ? "바뀌었습니다" : "유지되었습니다"}.${actualChanged ? " 목표를 바꿔 실제 정답도 함께 바뀐 유효한 반사실입니다." : " 실제 정답은 그대로입니다."}` : "원본과 같은 카드입니다. 버튼으로 한 특징만 바꿔 보세요.";
  }

  function renderRepair() {
    $("#actionCountBadge").textContent = `수정 ${state.actionCount}회`;
    $("#repairExplanation").textContent = state.lastRepair || "수정 방법을 선택하면 데이터 분포와 평가가 즉시 갱신됩니다.";
  }

  function benchmarkModels() {
    const baseCards = M.generateDataset(state.config);
    const modelA = M.trainModel(baseCards, state.config, []);
    const evalA = M.evaluateAll(modelA, baseCards, state.config);
    const balancedCards = M.balanceTraining(baseCards, state.config);
    const modelB = M.trainModel(balancedCards, state.config, []);
    const evalB = M.evaluateAll(modelB, balancedCards, state.config);
    return { A: evalA, B: evalB };
  }

  function setMission(id, solved, text) {
    const node = $(`#${id}`);
    node.classList.toggle("solved", solved);
    $(".mission-status", node).textContent = `${solved ? "✓ 해결 · " : "○ 진행 중 · "}${text}`;
    return solved;
  }

  function renderMissions() {
    const train = state.evaluations.train;
    const counter = state.evaluations.counterfactual;
    const includedCandidates = state.cards.filter((card) => card.split === "train" && card.included !== false && /candidate|counterexample/.test(card.source)).length;
    const baselineCondition = train.accuracy != null && train.accuracy >= 0.9 && counter.accuracy != null && counter.accuracy <= 0.5;
    const mission1 = setMission("missionRule", state.missions.suspect, baselineCondition ? "높은 정확도와 큰 분포이동 격차를 찾았습니다. 의심 특징을 선택하세요." : "훈련 90% 이상·배경 반전 50% 이하 상태를 관찰하세요.");
    const mission2Solved = includedCandidates > 0 && includedCandidates <= state.config.minCounterexamples && counter.accuracy != null && counter.accuracy >= 0.75;
    const mission2 = setMission("missionCounter", mission2Solved, `포함 반례 ${includedCandidates}/${state.config.minCounterexamples}장 · 배경 반전 ${percent(counter.accuracy)}`);
    const trainingCount = M.splitCards(state.cards, "train").length;
    const mission3Solved = trainingCount <= state.config.missionBudget && counter.accuracy != null && counter.accuracy >= 0.75 && counter.worstGroupAccuracy != null && counter.worstGroupAccuracy >= 0.75;
    const mission3 = setMission("missionBudget", mission3Solved, `훈련 ${trainingCount}/${state.config.missionBudget}장 · 반전 ${percent(counter.accuracy)} · 최저 ${percent(counter.worstGroupAccuracy)}`);
    const mission4 = setMission("missionChoice", state.missions.choice, state.missions.choice ? "분포이동과 최저 조합 성능을 근거로 B를 선택했습니다." : "두 모델의 일반 성능뿐 아니라 배경 반전 성능을 비교하세요.");
    $("#counterexampleMissionCount").textContent = `${state.config.minCounterexamples}장`;
    $("#budgetMissionCount").textContent = `${state.config.missionBudget}장`;
    const benchmark = benchmarkModels();
    $("#modelComparison").innerHTML = `<span>A · 일반 ${percent(benchmark.A.general.accuracy)} / 반전 ${percent(benchmark.A.counterfactual.accuracy)}</span><span>B · 일반 ${percent(benchmark.B.general.accuracy)} / 반전 ${percent(benchmark.B.counterfactual.accuracy)}</span>`;
    $("#missionScore").textContent = `${[mission1, mission2, mission3, mission4].filter(Boolean).length} / 4 해결`;
  }

  function snapshot(label) {
    const evaluations = state.evaluations;
    return {
      label,
      train: evaluations.train.accuracy,
      validation: evaluations.validation.accuracy,
      general: evaluations.general.accuracy,
      counterfactual: evaluations.counterfactual.accuracy,
      worst: evaluations.counterfactual.worstGroupAccuracy,
      features: state.model.ok ? state.model.activeFeatures.map((key) => featureByKey(key).name) : [],
    };
  }

  function addHistory(label) {
    state.history.push(M.deepCopy(snapshot(label)));
    if (state.history.length > 30) state.history.shift();
    renderHistory();
  }

  function renderHistory() {
    const body = $("#historyBody");
    if (!state.history.length) {
      body.innerHTML = '<tr><td class="empty-cell" colspan="7">‘모델 훈련·기록’ 또는 수정 방법을 눌러 비교 기록을 만드세요.</td></tr>';
      return;
    }
    body.innerHTML = state.history.map((item, index) => `<tr><td><b>${index + 1}</b> · ${escapeHtml(item.label)}</td><td>${percent(item.train)}</td><td>${percent(item.validation)}</td><td>${percent(item.general)}</td><td>${percent(item.counterfactual)}</td><td>${percent(item.worst)}</td><td>${escapeHtml((item.features || []).join(" · ") || "없음")}</td></tr>`).join("");
  }

  function applyRepair(kind) {
    if (kind === "counterexamples") {
      state.cards = M.addCounterexamples(state.cards);
      state.lastRepair = "후보 반례를 모두 포함했습니다. 한 카드가 세 지름길을 함께 뒤집어, 각 조건부 빈도를 직접 낮춥니다.";
    } else if (kind === "balance") {
      state.cards = M.balanceTraining(state.cards, state.config);
      state.lastRepair = "클래스마다 배경·날씨·카메라의 8가지 조합을 한 장씩 만들었습니다. 각 지름길의 주변 비율이 클래스와 분리됩니다.";
    } else if (kind === "randomize") {
      state.cards = M.randomizeShortcuts(state.cards, state.config);
      state.lastRepair = "결정적 씨앗으로 지름길 특징을 정답과 무관하게 재배치했습니다. 실행을 반복해도 같은 결과가 나옵니다.";
    } else if (kind === "mask") {
      state.maskedFeatures = ["background", "weather", "camera"];
      state.lastRepair = "모델 점수에서 배경·날씨·카메라 항을 제거했습니다. 화면에는 보이지만 모델 계산에는 들어가지 않습니다.";
    } else if (kind === "split") {
      state.cards = M.rebuildEvaluationSplits(state.cards, state.config);
      state.lastRepair = "훈련 장면과 겹치지 않는 검증·일반·배경 반전 분할을 다시 만들었습니다. 평가는 훈련과 분리되어야 합니다.";
    } else if (kind === "unmask") {
      state.maskedFeatures = [];
      state.lastRepair = "모든 특징 항을 다시 모델 점수에 포함했습니다.";
    }
    state.actionCount += 1;
    recompute();
    addHistory(`수정 ${state.actionCount} · ${$("[data-repair='" + kind + "'] span").textContent}`);
    setStatus(`${state.lastRepair} 네 시험과 교차표를 다시 계산했습니다.`);
  }

  function fillTeacherForm() {
    $("#teacherScenario").value = state.config.scenarioId;
    $("#teacherBiasStrength").value = state.config.biasStrength;
    $("#biasStrengthOutput").textContent = `${state.config.biasStrength}%`;
    $("#teacherClassA").value = state.config.scenario.classes[0].name;
    $("#teacherClassB").value = state.config.scenario.classes[1].name;
    $("#teacherTargetName").value = featureByKey("target").name;
    $("#teacherBackgroundName").value = featureByKey("background").name;
    $("#teacherWeatherName").value = featureByKey("weather").name;
    $("#teacherCameraName").value = featureByKey("camera").name;
    $("#teacherBudget").value = state.config.missionBudget;
    $("#teacherCounterexamples").value = state.config.minCounterexamples;
    $("#teacherGroupSize").value = state.config.minimumGroupSize;
    $("#teacherSeed").value = state.config.seed;
    renderCardEditor();
  }

  function selectOptions(items, selected) {
    return items.map((item) => `<option value="${escapeHtml(item.id || item)}"${(item.id || item) === selected ? " selected" : ""}>${escapeHtml(item.name || SPLIT_META[item] && SPLIT_META[item].title || item)}</option>`).join("");
  }

  function renderCardEditor() {
    const body = $("#cardEditorBody");
    body.innerHTML = state.cards.map((card) => `<tr data-editor-card="${escapeHtml(card.id)}">
      <td><input type="checkbox" data-card-field="included" ${card.included !== false ? "checked" : ""} ${card.split !== "train" ? "disabled" : ""} aria-label="${escapeHtml(card.id)} 사용" /></td>
      <td><select data-card-field="split">${selectOptions(M.SPLITS, card.split)}</select></td>
      <td><select data-card-field="label">${selectOptions(state.config.scenario.classes, card.label)}</select></td>
      ${M.FEATURE_KEYS.map((key) => `<td><select data-card-field="${key}">${selectOptions(featureByKey(key).values, card.features[key])}</select></td>`).join("")}
      <td><button class="delete-card-button" type="button" data-delete-card="${escapeHtml(card.id)}" aria-label="${escapeHtml(card.id)} 삭제">×</button></td>
    </tr>`).join("");
  }

  function teacherConfigFromForm() {
    return M.createConfig({
      scenarioId: $("#teacherScenario").value,
      biasStrength: $("#teacherBiasStrength").value,
      classNames: [$("#teacherClassA").value, $("#teacherClassB").value],
      featureNames: {
        target: $("#teacherTargetName").value,
        background: $("#teacherBackgroundName").value,
        weather: $("#teacherWeatherName").value,
        camera: $("#teacherCameraName").value,
      },
      missionBudget: $("#teacherBudget").value,
      minCounterexamples: $("#teacherCounterexamples").value,
      minimumGroupSize: $("#teacherGroupSize").value,
      seed: $("#teacherSeed").value,
    });
  }

  function updateTeacherScenarioDefaults() {
    const config = M.createConfig({ scenarioId: $("#teacherScenario").value, biasStrength: $("#teacherBiasStrength").value });
    $("#teacherClassA").value = config.scenario.classes[0].name;
    $("#teacherClassB").value = config.scenario.classes[1].name;
    $("#teacherTargetName").value = config.scenario.features[0].name;
    $("#teacherBackgroundName").value = config.scenario.features[1].name;
    $("#teacherWeatherName").value = config.scenario.features[2].name;
    $("#teacherCameraName").value = config.scenario.features[3].name;
  }

  async function loadFile(file, kind) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setStatus("파일이 너무 큽니다. 2MB 이하 파일을 사용하세요.", true);
      return;
    }
    const text = await file.text();
    if (kind === "json") {
      const parsed = M.deserializeState(text);
      if (!parsed.ok) { setStatus(parsed.message, true); return; }
      state.config = parsed.state.config;
      state.cards = parsed.state.cards;
      state.maskedFeatures = parsed.state.maskedFeatures;
      state.notes = parsed.state.notes;
      state.history = parsed.state.history;
      state.changedCard = null;
      state.actionCount = 0;
      closeDialog("teacherDialog");
      recompute();
      setStatus("프리셋 JSON을 안전하게 불러왔습니다.");
    } else {
      const parsed = M.parseCsv(text, state.config);
      if (!parsed.ok) { setStatus(parsed.message, true); return; }
      state.cards = parsed.cards;
      state.changedCard = null;
      recompute();
      renderCardEditor();
      setStatus(`CSV에서 ${state.cards.length}장의 특징 데이터를 불러왔습니다.`);
    }
  }

  function bindEvents() {
    $("#openGuideButton").addEventListener("click", () => openDialog("guideDialog"));
    $("#openTeacherButton").addEventListener("click", () => { fillTeacherForm(); openDialog("teacherDialog"); });
    $$('[data-close-dialog]').forEach((button) => button.addEventListener("click", () => closeDialog(button.dataset.closeDialog)));
    $$(".modal").forEach((dialog) => dialog.addEventListener("click", (event) => { if (event.target === dialog) closeDialog(dialog.id); }));
    $("#fullscreenButton").addEventListener("click", async () => {
      try {
        if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
        else await document.exitFullscreen();
      } catch (error) { setStatus("이 브라우저에서는 전체화면을 시작할 수 없습니다.", true); }
    });
    $("#scenarioSelect").addEventListener("change", (event) => {
      const previousNotes = M.deepCopy(state.notes);
      initializeExperiment(M.createConfig({ ...state.config, scenarioId: event.target.value }), false);
      state.notes = previousNotes;
      renderSetup();
      setStatus(`${state.config.scenario.title} 사례를 새로 준비했습니다.`);
    });
    $("#resetExperimentButton").addEventListener("click", () => {
      state.notes = { expectation: "", evidence: "", conclusion: "", modelChoice: "" };
      initializeExperiment(state.config, false);
      setStatus("현재 사례를 기본 편향 상태로 되돌렸습니다.");
    });
    $$("[data-split-tab]").forEach((button) => button.addEventListener("click", () => { state.activeSplit = button.dataset.splitTab; renderDataset(); }));
    $("#dataCardGrid").addEventListener("change", (event) => {
      const id = event.target.dataset.cardToggle;
      if (!id) return;
      const card = state.cards.find((item) => item.id === id && item.split === "train");
      if (!card) return;
      card.included = event.target.checked;
      recompute();
      setStatus(`${card.id}를 훈련에서 ${card.included ? "포함" : "제외"}했습니다. 평가를 다시 계산했습니다.`);
    });
    $("#selectAllTrainingButton").addEventListener("click", () => {
      state.cards.forEach((card) => { if (card.split === "train") card.included = true; });
      recompute();
      setStatus("모든 훈련 후보를 포함했습니다.");
    });
    $("#restoreBiasedTrainingButton").addEventListener("click", () => {
      const freshTraining = M.generateDataset(state.config).filter((card) => card.split === "train");
      state.cards = [...freshTraining, ...state.cards.filter((card) => card.split !== "train")];
      state.maskedFeatures = [];
      recompute();
      setStatus("기본 편향 훈련 카드만 포함했습니다.");
    });
    $("#trainButton").addEventListener("click", () => {
      recompute();
      if (state.model.ok) {
        addHistory(`훈련 기록 ${state.history.length + 1}`);
        setStatus(`훈련 카드 ${state.model.trainingCount}장으로 조건부 빈도를 다시 셌습니다.`);
      } else setStatus(state.model.message, true);
    });
    $("#associationFeatureSelect").addEventListener("change", renderAssociation);
    $("#matrixSplitSelect").addEventListener("change", () => { renderConfusion(); renderGroups(); });
    $("#counterfactualCardSelect").addEventListener("change", () => { state.changedCard = null; renderCounterfactual(); });
    $$("[data-counterfactual]").forEach((button) => button.addEventListener("click", () => {
      const original = counterfactualSourceCards().find((card) => card.id === $("#counterfactualCardSelect").value) || counterfactualSourceCards()[0];
      if (!original) return;
      state.changedCard = M.transformCard(original, button.dataset.counterfactual, state.config, $("#maskFeatureSelect").value);
      renderCounterfactual();
    }));
    $("#resetCounterfactualButton").addEventListener("click", () => { state.changedCard = null; renderCounterfactual(); });
    $$("[data-repair]").forEach((button) => button.addEventListener("click", () => applyRepair(button.dataset.repair)));
    $("#checkSuspectButton").addEventListener("click", () => {
      const key = $("#suspectFeatureSelect").value;
      const cross = M.crossTable(M.splitCards(state.cards, "train"), key, state.config);
      const baselineCondition = state.evaluations.train.accuracy >= 0.9 && state.evaluations.counterfactual.accuracy <= 0.5;
      state.missions.suspect = baselineCondition && featureByKey(key).role === "shortcut" && cross.association >= 0.7;
      renderMissions();
      setStatus(state.missions.suspect ? `${featureByKey(key).name}의 연관도는 ${Math.round(cross.association * 100)}입니다. 숨은 규칙의 강한 후보입니다.` : "훈련·반전 정확도와 연관도 70 이상인 지름길 특징을 함께 찾으세요.", !state.missions.suspect);
    });
    $("#checkModelChoiceButton").addEventListener("click", () => {
      const selected = $('input[name="modelChoice"]:checked');
      state.notes.modelChoice = $("#modelChoiceReason").value.trim();
      state.missions.choice = Boolean(selected && selected.value === "B" && state.notes.modelChoice.length >= 20 && /반전|분포|최저|조합|배경/.test(state.notes.modelChoice));
      renderMissions();
      setStatus(state.missions.choice ? "모델 B를 분포이동 근거와 함께 선택했습니다." : "B를 고르고 배경 반전·분포이동·최저 조합 성능 중 하나를 포함해 20자 이상 근거를 쓰세요.", !state.missions.choice);
    });
    ["expectation", "evidence", "conclusion"].forEach((key) => {
      $(`#${key}Input`).addEventListener("input", (event) => { state.notes[key] = event.target.value; });
    });
    $("#modelChoiceReason").addEventListener("input", (event) => { state.notes.modelChoice = event.target.value; });
    $("#printButton").addEventListener("click", () => window.print());
    $("#clearHistoryButton").addEventListener("click", () => { state.history = []; renderHistory(); setStatus("비교 기록을 지웠습니다. 데이터와 모델은 유지됩니다."); });

    $("#teacherBiasStrength").addEventListener("input", (event) => { $("#biasStrengthOutput").textContent = `${event.target.value}%`; });
    $("#teacherScenario").addEventListener("change", updateTeacherScenarioDefaults);
    $("#applyTeacherSettingsButton").addEventListener("click", () => {
      state.notes = { expectation: "", evidence: "", conclusion: "", modelChoice: "" };
      initializeExperiment(teacherConfigFromForm(), false);
      closeDialog("teacherDialog");
      setStatus("교사 설정으로 합성 카드와 미션 조건을 새로 만들었습니다.");
    });
    $("#saveJsonButton").addEventListener("click", () => download("ai-data-bias-detective-preset.json", M.serializeState(state), "application/json;charset=utf-8"));
    $("#exportCsvButton").addEventListener("click", () => download("ai-data-bias-cards.csv", M.exportCsv(state.cards), "text/csv;charset=utf-8"));
    $("#loadJsonInput").addEventListener("change", (event) => { loadFile(event.target.files[0], "json"); event.target.value = ""; });
    $("#loadCsvInput").addEventListener("change", (event) => { loadFile(event.target.files[0], "csv"); event.target.value = ""; });
    $("#addCardButton").addEventListener("click", () => {
      let index = 1;
      while (state.cards.some((card) => card.id === `teacher-card-${index}`)) index += 1;
      state.cards.push({ id: `teacher-card-${index}`, sceneId: `teacher-card-${index}`, split: "train", label: state.config.scenario.classes[0].id, features: { target: "a", background: "a", weather: "a", camera: "a" }, included: true, source: "teacher" });
      recompute();
      renderCardEditor();
      setStatus("교사용 훈련 카드를 한 장 추가했습니다.");
    });
    $("#cardEditorBody").addEventListener("change", (event) => {
      const row = event.target.closest("[data-editor-card]");
      const field = event.target.dataset.cardField;
      if (!row || !field) return;
      const card = state.cards.find((item) => item.id === row.dataset.editorCard);
      if (!card) return;
      if (field === "included") card.included = event.target.checked;
      else if (field === "split" || field === "label") card[field] = event.target.value;
      else card.features[field] = event.target.value;
      if (card.split !== "train") card.included = true;
      recompute();
      renderCardEditor();
      setStatus(`${card.id}의 ${field} 값을 수정했습니다.`);
    });
    $("#cardEditorBody").addEventListener("click", (event) => {
      const id = event.target.dataset.deleteCard;
      if (!id) return;
      state.cards = state.cards.filter((card) => card.id !== id);
      recompute();
      renderCardEditor();
      setStatus(`${id} 카드를 삭제했습니다.`);
    });
  }

  bindEvents();
  initializeExperiment(state.config, false);
})();
