(function () {
  "use strict";

  const P = window.PathProbability;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const STORAGE_KEY = "pathProbabilityLabProblemsV1";

  function cloneProblem(problem) {
    return JSON.parse(JSON.stringify(problem));
  }

  function removeEdges(rows, columns, removed) {
    const removedSet = new Set(removed.map((edge) => {
      const [first, second] = edge.split("|");
      return P.edgeKey(first, second);
    }));
    return P.fullGridEdges(rows, columns).filter((edge) => !removedSet.has(edge));
  }

  const PRESETS = {
    source: {
      title: "대표 예제: 10개의 최단 경로",
      rows: 3,
      columns: 4,
      start: "0,0",
      end: "2,3",
      checkpoint: "1,3",
      blocked: [],
      edges: P.fullGridEdges(3, 4),
    },
    basic: {
      title: "기본: 가운데 B를 지나는 길",
      rows: 3,
      columns: 3,
      start: "0,0",
      end: "2,2",
      checkpoint: "1,1",
      blocked: [],
      edges: P.fullGridEdges(3, 3),
    },
    obstacle: {
      title: "도전: 두 장애물 사이의 최단 경로",
      rows: 4,
      columns: 4,
      start: "0,0",
      end: "3,3",
      checkpoint: "1,2",
      blocked: ["1,1", "2,2"],
      edges: P.fullGridEdges(4, 4),
    },
    asymmetric: {
      title: "심화: 비대칭 갈림길",
      rows: 4,
      columns: 5,
      start: "0,0",
      end: "3,4",
      checkpoint: "1,3",
      blocked: [],
      edges: removeEdges(4, 5, [
        "0,0|1,0", "0,3|1,3", "0,4|1,4", "3,0|3,1", "3,3|3,4",
      ]),
    },
  };

  const state = {
    mode: "explore",
    problem: P.normalizeProblem(PRESETS.source),
    analysis: null,
    activePreset: "source",
    editTool: "inspect",
    step: 1,
    unlocked: false,
    prediction: null,
    selectedPathIndex: 0,
    pathFilter: "all",
    propagationLevel: 0,
    simulation: null,
    selectedNode: null,
    toastTimer: null,
  };

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2400);
  }

  function formatInteger(value) {
    return BigInt(value).toLocaleString("ko-KR");
  }

  function formatPercent(fraction) {
    return `${(P.fractionToNumber(fraction) * 100).toFixed(2)}%`;
  }

  function fractionText(value) {
    return P.fractionToString(value);
  }

  function coordinateLabel(key) {
    const point = P.parseNodeKey(key);
    return `${point.row + 1}행 ${point.column + 1}열`;
  }

  function roleAt(key) {
    if (key === state.problem.start) return "A 출발점";
    if (key === state.problem.checkpoint) return "B 확인 지점";
    if (key === state.problem.end) return "C 도착점";
    return "일반 지점";
  }

  function resultsLocked() {
    return state.mode === "explore" && !state.unlocked;
  }

  function clearPredictionInputs() {
    $("#relationshipPrediction").value = "";
    $("#pathPrediction").value = "";
    $("#branchPrediction").value = "";
    $("#predictionReason").value = "";
    $("#revealButton").disabled = true;
    $("#predictionFeedback").textContent = "관계와 근거를 입력하면 결과를 공개할 수 있습니다.";
  }

  function resetDiscovery(clearInputs = true) {
    state.step = 1;
    state.unlocked = false;
    state.prediction = null;
    state.selectedPathIndex = 0;
    state.pathFilter = "all";
    state.propagationLevel = 0;
    state.simulation = null;
    state.selectedNode = null;
    if (clearInputs) clearPredictionInputs();
  }

  function recalculate(options = {}) {
    try {
      state.problem = P.normalizeProblem(state.problem);
      state.analysis = P.analyzeProblem(state.problem, { enumerationLimit: P.DEFAULT_ENUMERATION_LIMIT });
      if (options.reset !== false) resetDiscovery(options.clearInputs !== false);
      renderAll();
    } catch (error) {
      showToast(error.message);
    }
  }

  function setProblem(problem, presetName = null) {
    try {
      state.problem = P.normalizeProblem(cloneProblem(problem));
      state.activePreset = presetName;
      recalculate();
      showToast(`${state.problem.title}을 불러왔습니다.`);
    } catch (error) {
      showToast(`문제를 불러오지 못했습니다: ${error.message}`);
    }
  }

  function markCustomProblem() {
    state.activePreset = null;
    $$("[data-preset]").forEach((button) => button.classList.remove("is-active"));
  }

  function renderAll() {
    document.body.dataset.mode = state.mode;
    $("#problemTitle").value = state.problem.title;
    $("#stageTitle").textContent = state.problem.title;
    $("#rowCount").value = String(state.problem.rows);
    $("#columnCount").value = String(state.problem.columns);
    $$("[data-preset]").forEach((button) => button.classList.toggle("is-active", button.dataset.preset === state.activePreset));
    renderMode();
    renderStatus();
    renderGraph();
    renderStepNavigation();
    renderResults();
    updateRevealState();
  }

  function renderMode() {
    $$("[data-mode-button]").forEach((button) => {
      const active = button.dataset.modeButton === state.mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function renderStatus() {
    const analysis = state.analysis;
    const status = $("#stageStatus");
    const safety = $("#safetyMessage");
    status.classList.toggle("is-error", !analysis.hasPath);
    safety.className = "safety-message";

    if (!analysis.hasPath) {
      status.textContent = "경로 없음";
      safety.classList.add("is-error");
      safety.textContent = "A에서 C까지 이어지는 길이 없습니다. 장애물을 치우거나 길 편집 도구로 끊어진 길을 다시 켜 주세요.";
      return;
    }

    status.textContent = resultsLocked()
      ? "예상 대기"
      : `최단 ${analysis.shortestDistance}칸 · ${formatInteger(analysis.totalPaths)}개 경로`;

    const messages = [];
    if (!analysis.checkpointOnShortestPath) messages.push("B는 어떤 최단 완성 경로에도 놓이지 않아 두 모형의 확률이 모두 0입니다.");
    if (analysis.hasCycle) messages.push("원래 길에서는 되돌아가며 순환할 수 있지만, 계산은 남은 최단거리를 한 칸 줄이는 방향만 사용합니다.");
    if (analysis.ignoredEdgeCount > 0) messages.push(`우회·되돌림·막다른 길 ${analysis.ignoredEdgeCount}개는 최단 완성 경로 표본공간에서 제외했습니다.`);
    if (analysis.enumerationTruncated) messages.push(`계산량을 제한하기 위해 경로 목록은 앞 ${analysis.paths.length}개만 표시하고, 전체 개수와 확률은 정확히 계산합니다.`);
    safety.textContent = messages.join(" ");
  }

  function selectedPathEdgeSet() {
    if (state.step !== 3 || !state.analysis.paths.length) return new Set();
    const selected = state.analysis.paths[state.selectedPathIndex] || state.analysis.paths[0];
    const edges = new Set();
    selected.nodes.slice(0, -1).forEach((node, index) => edges.add(P.edgeKey(node, selected.nodes[index + 1])));
    return edges;
  }

  function graphNodeValue(key) {
    const analysis = state.analysis;
    if (resultsLocked() || !analysis.hasPath) return "";
    if (state.step === 2 && analysis.pathsFromStart.get(key) > 0n && analysis.pathsToEnd.get(key) > 0n) {
      return `${analysis.pathsFromStart.get(key)}×${analysis.pathsToEnd.get(key)}`;
    }
    if (state.step === 4 && analysis.distanceFromStart.get(key) <= state.propagationLevel
      && analysis.distanceFromStart.get(key) + analysis.distanceToEnd.get(key) === analysis.shortestDistance) {
      return fractionText(analysis.branchReach.get(key));
    }
    return "";
  }

  function renderGraph() {
    const { problem, analysis } = state;
    const plane = $("#graphPlane");
    const stage = $("#graphStage");
    const width = Math.max(520, (problem.columns - 1) * 105 + 100);
    const height = Math.max(320, (problem.rows - 1) * 86 + 100);
    stage.style.width = `${width}px`;
    stage.style.height = `${height}px`;
    plane.replaceChildren();
    const enabledEdges = new Set(problem.edges);
    const blocked = new Set(problem.blocked);
    const shortestDirections = new Map(analysis.directedEdges.map((edge) => [edge.key, edge]));
    const selectedEdges = selectedPathEdgeSet();
    const mayShowAnalysis = !resultsLocked() && analysis.hasPath;

    P.fullGridEdges(problem.rows, problem.columns).forEach((key) => {
      const [first, second] = P.parseEdgeKey(key);
      const a = P.parseNodeKey(first);
      const b = P.parseNodeKey(second);
      const horizontal = a.row === b.row;
      const firstPoint = horizontal
        ? (a.column < b.column ? a : b)
        : (a.row < b.row ? a : b);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `graph-road ${horizontal ? "horizontal" : "vertical"}`;
      button.dataset.edge = key;
      button.tabIndex = state.editTool === "road" ? 0 : -1;
      const enabled = enabledEdges.has(key);
      button.classList.toggle("is-off", !enabled);
      button.classList.toggle("is-blocked-road", blocked.has(first) || blocked.has(second));
      button.classList.toggle("is-selected", selectedEdges.has(key));

      const direction = shortestDirections.get(key);
      if (mayShowAnalysis && direction) {
        button.classList.add("is-shortest", "is-directed");
        const from = P.parseNodeKey(direction.from);
        const reverse = horizontal ? from.column !== firstPoint.column : from.row !== firstPoint.row;
        button.classList.toggle("is-reverse", reverse);
      }

      if (horizontal) {
        button.style.left = `${(firstPoint.column / (problem.columns - 1)) * 100}%`;
        button.style.top = `${(firstPoint.row / (problem.rows - 1)) * 100}%`;
        button.style.width = `${100 / (problem.columns - 1)}%`;
      } else {
        button.style.left = `${(firstPoint.column / (problem.columns - 1)) * 100}%`;
        button.style.top = `${(firstPoint.row / (problem.rows - 1)) * 100}%`;
        button.style.height = `${100 / (problem.rows - 1)}%`;
      }
      button.setAttribute("aria-pressed", String(enabled));
      button.setAttribute("aria-label", `${coordinateLabel(first)}과 ${coordinateLabel(second)} 사이 길, ${enabled ? "켜짐" : "꺼짐"}${state.editTool === "road" ? ", 눌러서 전환" : ""}`);
      plane.append(button);
    });

    P.allNodeKeys(problem.rows, problem.columns).forEach((key) => {
      const point = P.parseNodeKey(key);
      const button = document.createElement("button");
      const isBlocked = blocked.has(key);
      const onShortest = analysis.hasPath
        && analysis.distanceFromStart.get(key) + analysis.distanceToEnd.get(key) === analysis.shortestDistance;
      const value = graphNodeValue(key);
      const selectedPath = state.step === 3 && analysis.paths[state.selectedPathIndex];
      button.type = "button";
      button.className = "graph-node";
      button.dataset.node = key;
      button.style.left = `${(point.column / (problem.columns - 1)) * 100}%`;
      button.style.top = `${(point.row / (problem.rows - 1)) * 100}%`;
      button.classList.toggle("is-start", key === problem.start);
      button.classList.toggle("is-checkpoint", key === problem.checkpoint);
      button.classList.toggle("is-end", key === problem.end);
      button.classList.toggle("is-blocked", isBlocked);
      button.classList.toggle("is-off-shortest", mayShowAnalysis && !onShortest);
      button.classList.toggle("is-path-selected", Boolean(selectedPath && selectedPath.nodes.includes(key)));
      button.classList.toggle("is-current-level", state.step === 4 && analysis.distanceFromStart.get(key) === state.propagationLevel);
      const name = isBlocked ? "×" : key === problem.start ? "A" : key === problem.checkpoint ? "B" : key === problem.end ? "C" : "•";
      button.innerHTML = `<span class="node-name">${name}</span>${value ? `<span class="node-value">${escapeHtml(value)}</span>` : ""}`;
      button.setAttribute("aria-label", `${coordinateLabel(key)}, ${isBlocked ? "장애물" : roleAt(key)}${value ? `, 표시값 ${value}` : ""}`);
      plane.append(button);
    });

    const summary = analysis.hasPath
      ? `${problem.rows}행 ${problem.columns}열 격자. A는 ${coordinateLabel(problem.start)}, B는 ${coordinateLabel(problem.checkpoint)}, C는 ${coordinateLabel(problem.end)}. ${resultsLocked() ? "결과는 아직 잠겨 있습니다." : `최단 거리는 ${analysis.shortestDistance}칸이고 완성 경로는 ${analysis.totalPaths}개입니다.`}`
      : `${problem.rows}행 ${problem.columns}열 격자. 현재 A에서 C까지 이어지는 경로가 없습니다.`;
    $("#graphSummary").textContent = summary;
  }

  function renderStepNavigation() {
    const disabledByResult = resultsLocked() || !state.analysis.hasPath;
    $$("[data-step]").forEach((button) => {
      const step = Number(button.dataset.step);
      const active = step === state.step;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
      button.disabled = step > 1 && disabledByResult;
    });
  }

  function branchFormulaAtCheckpoint() {
    const analysis = state.analysis;
    if (!analysis.checkpointOnShortestPath) return "B가 최단 경로 위에 없음 → 0";
    const contributions = analysis.incoming.get(state.problem.checkpoint).map((parent) => {
      const share = P.divideFraction(analysis.branchReach.get(parent), analysis.outgoing.get(parent).length);
      return fractionText(share);
    });
    return `${contributions.join(" + ")} = ${fractionText(analysis.branchUniformProbability)}`;
  }

  function renderResults() {
    const analysis = state.analysis;
    const locked = resultsLocked();
    $("#resultsShell").classList.toggle("is-locked", locked);

    if (!analysis.hasPath) {
      $("#pathFraction").textContent = "—";
      $("#branchFraction").textContent = "—";
      $("#pathDecimal").textContent = "계산할 경로 없음";
      $("#branchDecimal").textContent = "계산할 경로 없음";
      $("#pathFormula").textContent = "A와 C를 먼저 연결해 주세요.";
      $("#branchFormula").textContent = "A와 C를 먼저 연결해 주세요.";
      $("#comparisonInsight").textContent = "현재 편집 상태에서는 이론값과 반복 실험을 계산하지 않습니다.";
      $("#stepContent").innerHTML = '<div class="empty-state">길을 다시 연결하면 단계별 분석이 시작됩니다.</div>';
      return;
    }

    $("#pathFraction").textContent = fractionText(analysis.pathUniformProbability);
    $("#branchFraction").textContent = fractionText(analysis.branchUniformProbability);
    $("#pathDecimal").textContent = `= ${P.fractionToDecimal(analysis.pathUniformProbability)} · ${formatPercent(analysis.pathUniformProbability)}`;
    $("#branchDecimal").textContent = `= ${P.fractionToDecimal(analysis.branchUniformProbability)} · ${formatPercent(analysis.branchUniformProbability)}`;
    $("#pathFormula").textContent = `${formatInteger(analysis.pathsThroughCheckpoint)} / ${formatInteger(analysis.totalPaths)} = ${fractionText(analysis.pathUniformProbability)}`;
    $("#branchFormula").textContent = branchFormulaAtCheckpoint();

    const same = P.fractionsEqual(analysis.pathUniformProbability, analysis.branchUniformProbability);
    const pathNumber = P.fractionToNumber(analysis.pathUniformProbability);
    const branchNumber = P.fractionToNumber(analysis.branchUniformProbability);
    const insight = $("#comparisonInsight");
    insight.classList.toggle("is-warning", !same);
    if (same) {
      insight.textContent = `이 문제에서는 두 가정이 우연히 같은 ${fractionText(analysis.pathUniformProbability)}이지만, 표본공간의 뜻까지 같은 것은 아닙니다.`;
    } else {
      const larger = pathNumber > branchNumber ? "경로 균등" : "갈림길 균등";
      insight.textContent = `두 값은 같지 않습니다. ${larger} 모형이 ${(Math.abs(pathNumber - branchNumber) * 100).toFixed(2)}%p 더 큽니다. 경로별 갈림길 수가 달라 완성 경로의 확률도 달라지기 때문입니다.`;
    }
    renderStepContent();
  }

  function stepHeader(kicker, title, description) {
    return `<div class="step-header"><div><span>${kicker}</span><h3>${title}</h3></div><p>${description}</p></div>`;
  }

  function renderPredictionReview() {
    const analysis = state.analysis;
    const prediction = state.prediction;
    const relationshipLabels = {
      same: "두 확률은 같다",
      "path-greater": "경로 균등이 더 크다",
      "branch-greater": "갈림길 균등이 더 크다",
    };
    const review = prediction
      ? `<div class="formula-board"><article><span>나의 관계 예상</span><strong>${escapeHtml(relationshipLabels[prediction.relationship])}</strong><small>${prediction.pathValue ? `경로 ${escapeHtml(prediction.pathValue)}` : "경로값 미입력"} · ${prediction.branchValue ? `갈림길 ${escapeHtml(prediction.branchValue)}` : "갈림길값 미입력"}</small></article><article><span>나의 근거</span><strong>기록 완료</strong><small>${escapeHtml(prediction.reason)}</small></article><article><span>실제 비교</span><strong>${fractionText(analysis.pathUniformProbability)} ${P.fractionsEqual(analysis.pathUniformProbability, analysis.branchUniformProbability) ? "=" : "≠"} ${fractionText(analysis.branchUniformProbability)}</strong><small>예상과 달랐다면 ‘무엇을 균등하게 보았는지’를 다시 적어 보세요.</small></article></div>`
      : `<div class="formula-board"><article><span>교사용 즉시 보기</span><strong>${formatInteger(analysis.totalPaths)}개</strong><small>가능한 최단 완성 경로</small></article><article><span>B 경유 경로</span><strong>${formatInteger(analysis.pathsThroughCheckpoint)}개</strong><small>경로 균등 모형의 유리한 결과</small></article><article><span>갈림길 전파</span><strong>${fractionText(analysis.branchUniformProbability)}</strong><small>각 지점의 다음 선택지를 균등 분배</small></article></div>`;
    return `${stepHeader("STEP 1 · PREDICTION", "예상과 실제를 나란히 놓기", "정답 여부만 보지 말고, 예상할 때 어떤 결과들을 같은 가능성으로 놓았는지 비교하세요.")}${review}`;
  }

  function renderCountingStep() {
    const analysis = state.analysis;
    const rows = analysis.levels.flat().map((key) => {
      const from = analysis.pathsFromStart.get(key);
      const to = analysis.pathsToEnd.get(key);
      return `<tr><td>${escapeHtml(P.nodeLabel(key, state.problem))}<small> · ${coordinateLabel(key)}</small></td><td>${from}</td><td>${to}</td><td>${from * to}</td></tr>`;
    }).join("");
    return `${stepHeader("STEP 2 · COUNT", "앞에서 세고, 뒤에서 다시 세기", "각 지점까지 오는 경로 수와 그 지점에서 C까지 가는 경로 수를 곱하면 그 지점을 지나는 완성 경로 수가 됩니다.")}
      <div class="formula-board">
        <article><span>A → C 전체</span><strong>${formatInteger(analysis.totalPaths)}</strong><small>A에서 출발해 C까지 가는 최단 완성 경로</small></article>
        <article><span>A → B → C</span><strong>${formatInteger(analysis.pathsThroughCheckpoint)}</strong><small>${analysis.pathsFromStart.get(state.problem.checkpoint)} × ${analysis.pathsToEnd.get(state.problem.checkpoint)}</small></article>
        <article><span>경로 균등 P(B)</span><strong>${fractionText(analysis.pathUniformProbability)}</strong><small>${analysis.pathsThroughCheckpoint}/${analysis.totalPaths}을 약분</small></article>
      </div>
      <div class="table-scroll"><table class="count-table"><thead><tr><th>지점</th><th>A에서 오는 수</th><th>C까지 가는 수</th><th>이 지점을 지나는 수</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function pathDisplay(path) {
    return path.nodes.map((key) => P.nodeLabel(key, state.problem)).join(" → ");
  }

  function renderPathStep() {
    const analysis = state.analysis;
    const filtered = analysis.paths
      .map((path, index) => ({ path, index }))
      .filter(({ path }) => state.pathFilter === "all" || (state.pathFilter === "through" ? path.passesCheckpoint : !path.passesCheckpoint));
    const uniformEach = P.fraction(1n, analysis.totalPaths);
    const rows = filtered.map(({ path, index }) => `<button type="button" class="path-row ${index === state.selectedPathIndex ? "is-selected" : ""}" data-path-index="${index}"><code>${escapeHtml(pathDisplay(path))}</code><span class="${path.passesCheckpoint ? "passes" : ""}">${path.passesCheckpoint ? "B 지남" : "B 안 지남"}</span><span class="path-probabilities"><i>경로 ${fractionText(uniformEach)}</i><i>갈림길 ${fractionText(path.branchProbability)}</i></span></button>`).join("");
    return `${stepHeader("STEP 3 · ENUMERATE", "완성 경로마다 실제 확률 붙이기", "경로 균등에서는 모든 행이 같은 확률이지만, 갈림길 균등에서는 선택지가 몇 번 나타나는지에 따라 경로의 확률이 달라집니다.")}
      <div class="path-toolbar" role="group" aria-label="경로 목록 필터">
        <button type="button" data-path-filter="all" class="${state.pathFilter === "all" ? "is-active" : ""}">전체 ${analysis.paths.length}</button>
        <button type="button" data-path-filter="through" class="${state.pathFilter === "through" ? "is-active" : ""}">B를 지남</button>
        <button type="button" data-path-filter="avoid" class="${state.pathFilter === "avoid" ? "is-active" : ""}">B를 안 지남</button>
      </div>
      <div class="path-list" aria-label="최단 경로 목록">${rows || '<div class="empty-state">이 조건에 맞는 표시 경로가 없습니다.</div>'}</div>
      ${analysis.enumerationTruncated ? `<p class="notice">전체 ${formatInteger(analysis.totalPaths)}개 중 앞 ${analysis.paths.length}개만 열거했습니다. 위 이론값은 생략 없이 전체 경로로 계산했습니다.</p>` : ""}`;
  }

  function renderPropagationStep() {
    const analysis = state.analysis;
    const level = Math.min(state.propagationLevel, analysis.shortestDistance);
    const nodes = analysis.levels.slice(0, level + 1).flat();
    const rows = nodes.map((key) => {
      const choices = analysis.outgoing.get(key).length;
      const reach = analysis.branchReach.get(key);
      const share = choices ? fractionText(P.divideFraction(reach, choices)) : "도착";
      return `<tr><td>${escapeHtml(P.nodeLabel(key, state.problem))}<small> · ${coordinateLabel(key)}</small></td><td>${fractionText(reach)}</td><td>${choices || "—"}</td><td>${share}</td></tr>`;
    }).join("");
    return `${stepHeader("STEP 4 · PROPAGATE", "도달 확률을 갈림길마다 나누기", "한 지점의 도달 확률을 가능한 다음 방향 수로 나누어 보내고, 여러 길에서 들어온 확률은 더합니다.")}
      <div class="propagation-controls">
        <button type="button" data-propagation="reset">처음</button>
        <button type="button" data-propagation="previous" ${level === 0 ? "disabled" : ""}>이전</button>
        <button type="button" class="primary" data-propagation="next" ${level === analysis.shortestDistance ? "disabled" : ""}>한 단계 전파</button>
        <output>거리 ${level} / ${analysis.shortestDistance}</output>
      </div>
      <div class="table-scroll"><table class="propagation-table"><thead><tr><th>지점</th><th>도달 확률</th><th>다음 방향 수</th><th>각 방향으로</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="notice">B에서 합쳐진 값: ${branchFormulaAtCheckpoint()}</p>`;
  }

  function renderSimulationStep() {
    const analysis = state.analysis;
    let results = '<div class="empty-state">두 모형을 같은 횟수만큼 실행해 상대도수와 이론값을 비교해 보세요.</div>';
    if (state.simulation) {
      const pathObserved = state.simulation.pathHits / state.simulation.trials;
      const branchObserved = state.simulation.branchHits / state.simulation.trials;
      results = `<div class="simulation-results">
        <article class="simulation-card path-sim"><span>경로 균등 실험</span><strong>${(pathObserved * 100).toFixed(2)}%</strong><small>${state.simulation.pathHits.toLocaleString("ko-KR")} / ${state.simulation.trials.toLocaleString("ko-KR")}회 · 이론 ${formatPercent(analysis.pathUniformProbability)}</small><div class="frequency-bar"><i style="width:${Math.min(100, pathObserved * 100)}%"></i></div></article>
        <article class="simulation-card branch-sim"><span>갈림길 균등 실험</span><strong>${(branchObserved * 100).toFixed(2)}%</strong><small>${state.simulation.branchHits.toLocaleString("ko-KR")} / ${state.simulation.trials.toLocaleString("ko-KR")}회 · 이론 ${formatPercent(analysis.branchUniformProbability)}</small><div class="frequency-bar"><i style="width:${Math.min(100, branchObserved * 100)}%"></i></div></article>
      </div>`;
    }
    return `${stepHeader("STEP 5 · SIMULATE", "두 선택 규칙을 따로 반복하기", "경로 균등 실험은 남은 완성 경로 수에 비례해 다음 길을 고르고, 갈림길 균등 실험은 현재 가능한 방향을 같은 확률로 고릅니다.")}
      <div class="simulation-controls"><label for="trialCount">반복 횟수</label><select id="trialCount"><option value="100">100회</option><option value="1000">1,000회</option><option value="10000" selected>10,000회</option><option value="50000">50,000회</option></select><button type="button" class="primary" data-run-simulation>두 모형 실험 실행</button></div>${results}`;
  }

  function renderStepContent() {
    if (!state.analysis.hasPath || resultsLocked()) return;
    const renderers = {
      1: renderPredictionReview,
      2: renderCountingStep,
      3: renderPathStep,
      4: renderPropagationStep,
      5: renderSimulationStep,
    };
    $("#stepContent").innerHTML = renderers[state.step]();
  }

  function updateRevealState() {
    const relationship = $("#relationshipPrediction").value;
    const reason = $("#predictionReason").value.trim();
    const valid = Boolean(state.analysis.hasPath && relationship && reason.length >= 5);
    $("#revealButton").disabled = !valid;
    if (!state.analysis.hasPath) $("#predictionFeedback").textContent = "먼저 A에서 C까지 가는 길을 연결해 주세요.";
    else if (!relationship) $("#predictionFeedback").textContent = "먼저 두 확률의 관계를 예상해 주세요.";
    else if (reason.length < 5) $("#predictionFeedback").textContent = "근거를 5글자 이상 적어 주세요.";
    else $("#predictionFeedback").textContent = "준비되었습니다. 결과를 공개해 비교해 보세요.";
  }

  function setMode(mode) {
    state.mode = mode === "teacher" ? "teacher" : "explore";
    if (state.mode === "explore" && !state.unlocked) state.step = 1;
    renderAll();
  }

  function selectEditTool(tool) {
    state.editTool = tool;
    const hints = {
      inspect: "지점을 누르면 좌표와 계산 역할을 확인합니다. 화살표 키로 이웃 지점으로 이동할 수 있습니다.",
      start: "A로 지정할 지점을 누르세요. B, C와 같은 지점은 선택할 수 없습니다.",
      checkpoint: "확률을 확인할 B 지점을 누르세요.",
      end: "C로 지정할 도착 지점을 누르세요.",
      obstacle: "일반 지점을 눌러 장애물을 놓거나 치우세요. 연결된 길은 남지만 계산에서는 막힙니다.",
      road: "점 사이의 선을 눌러 길을 켜거나 끄세요. Tab 키로 모든 길을 차례로 선택할 수 있습니다.",
    };
    $$("[data-edit-tool]").forEach((button) => {
      const active = button.dataset.editTool === tool;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    $("#toolHint").textContent = hints[tool];
    renderGraph();
  }

  function editNode(key) {
    const problem = state.problem;
    if (state.editTool === "inspect" || state.editTool === "road") {
      const blocked = problem.blocked.includes(key);
      const analysisNote = state.analysis.hasPath && state.analysis.distanceFromStart.get(key) + state.analysis.distanceToEnd.get(key) === state.analysis.shortestDistance
        ? "최단 경로에 쓰일 수 있습니다."
        : "최단 경로에는 쓰이지 않습니다.";
      showToast(`${coordinateLabel(key)} · ${blocked ? "장애물" : roleAt(key)} · ${analysisNote}`);
      return;
    }

    if (state.editTool === "obstacle") {
      if ([problem.start, problem.checkpoint, problem.end].includes(key)) {
        showToast("A, B, C에는 장애물을 놓을 수 없습니다.");
        return;
      }
      const blocked = new Set(problem.blocked);
      if (blocked.has(key)) blocked.delete(key);
      else blocked.add(key);
      problem.blocked = [...blocked];
    } else {
      const roleMap = { start: "start", checkpoint: "checkpoint", end: "end" };
      const field = roleMap[state.editTool];
      if (!field) return;
      const occupiedBy = ["start", "checkpoint", "end"].find((role) => role !== field && problem[role] === key);
      if (occupiedBy) {
        showToast("A, B, C는 서로 다른 지점이어야 합니다.");
        return;
      }
      problem.blocked = problem.blocked.filter((blockedKey) => blockedKey !== key);
      problem[field] = key;
    }
    markCustomProblem();
    recalculate();
  }

  function editRoad(key) {
    if (state.editTool !== "road") {
      showToast("먼저 ‘길’ 편집 도구를 선택해 주세요.");
      return;
    }
    const edges = new Set(state.problem.edges);
    if (edges.has(key)) edges.delete(key);
    else edges.add(key);
    state.problem.edges = [...edges];
    markCustomProblem();
    recalculate();
  }

  function resizeProblem() {
    const rows = Number($("#rowCount").value);
    const columns = Number($("#columnCount").value);
    const checkpoint = P.nodeKey(Math.max(0, Math.floor((rows - 1) / 2)), columns - 1);
    state.problem = P.normalizeProblem({
      title: state.problem.title,
      rows,
      columns,
      start: "0,0",
      end: P.nodeKey(rows - 1, columns - 1),
      checkpoint,
      blocked: [],
      edges: P.fullGridEdges(rows, columns),
    });
    markCustomProblem();
    recalculate();
    showToast(`${rows}행 ${columns}열 전체 격자로 바꿨습니다.`);
  }

  function readSavedProblems() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  function writeSavedProblems(problems) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(problems));
  }

  function renderSavedOptions(selectedId = "") {
    const select = $("#savedProblemSelect");
    select.replaceChildren(new Option("저장한 문제 선택", ""));
    readSavedProblems().forEach((entry) => select.append(new Option(entry.problem.title, entry.id)));
    select.value = selectedId;
  }

  function saveProblem() {
    try {
      const problems = readSavedProblems();
      const existing = problems.find((entry) => entry.problem.title === state.problem.title);
      const id = existing ? existing.id : `problem-${Date.now()}`;
      const entry = { id, savedAt: new Date().toISOString(), problem: cloneProblem(state.problem) };
      const next = problems.filter((item) => item.id !== id);
      next.unshift(entry);
      writeSavedProblems(next.slice(0, 30));
      renderSavedOptions(id);
      showToast("문제를 이 브라우저에 저장했습니다.");
    } catch (_error) {
      showToast("브라우저 저장 공간을 사용할 수 없습니다. JSON 내보내기를 이용해 주세요.");
    }
  }

  function loadSavedProblem() {
    const id = $("#savedProblemSelect").value;
    const entry = readSavedProblems().find((item) => item.id === id);
    if (!entry) return showToast("불러올 문제를 선택해 주세요.");
    setProblem(entry.problem);
  }

  function deleteSavedProblem() {
    const id = $("#savedProblemSelect").value;
    if (!id) return showToast("삭제할 문제를 선택해 주세요.");
    writeSavedProblems(readSavedProblems().filter((item) => item.id !== id));
    renderSavedOptions();
    showToast("저장한 문제를 삭제했습니다.");
  }

  function exportProblem() {
    const data = JSON.stringify({ type: "path-probability-lab", version: 1, problem: state.problem }, null, 2);
    const blob = new Blob([data], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${state.problem.title.replace(/[\\/:*?"<>|]/g, "-") || "길찾기-확률-문제"}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("문제 JSON 파일을 만들었습니다.");
  }

  function importProblem(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const problem = parsed.problem || parsed;
        setProblem(P.normalizeProblem(problem));
      } catch (error) {
        showToast(`JSON을 불러오지 못했습니다: ${error.message}`);
      } finally {
        $("#importProblemInput").value = "";
      }
    };
    reader.onerror = () => showToast("파일을 읽지 못했습니다.");
    reader.readAsText(file, "utf-8");
  }

  function initializeSizeSelects() {
    [$("#rowCount"), $("#columnCount")].forEach((select) => {
      for (let size = 2; size <= P.MAX_GRID_SIZE; size += 1) select.append(new Option(String(size), String(size)));
    });
  }

  function wireEvents() {
    $$("[data-mode-button]").forEach((button) => button.addEventListener("click", () => setMode(button.dataset.modeButton)));
    $$("[data-preset]").forEach((button) => button.addEventListener("click", () => setProblem(PRESETS[button.dataset.preset], button.dataset.preset)));
    $$("[data-edit-tool]").forEach((button) => button.addEventListener("click", () => selectEditTool(button.dataset.editTool)));
    $$("[data-step]").forEach((button) => button.addEventListener("click", () => {
      if (button.disabled) return;
      state.step = Number(button.dataset.step);
      if (state.step === 4) state.propagationLevel = Math.min(state.propagationLevel, state.analysis.shortestDistance);
      renderAll();
      $("#resultsShell").scrollIntoView({ behavior: "smooth", block: "start" });
    }));

    $("#problemTitle").addEventListener("input", (event) => {
      state.problem.title = event.target.value.slice(0, 60) || "이름 없는 길찾기 문제";
      $("#stageTitle").textContent = state.problem.title;
      markCustomProblem();
    });
    $("#resizeButton").addEventListener("click", resizeProblem);
    [$("#relationshipPrediction"), $("#predictionReason")].forEach((input) => input.addEventListener("input", updateRevealState));
    $("#revealButton").addEventListener("click", () => {
      state.prediction = {
        relationship: $("#relationshipPrediction").value,
        pathValue: $("#pathPrediction").value.trim(),
        branchValue: $("#branchPrediction").value.trim(),
        reason: $("#predictionReason").value.trim(),
      };
      state.unlocked = true;
      state.step = 1;
      renderAll();
      $("#resultsShell").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    $("#graphPlane").addEventListener("click", (event) => {
      const node = event.target.closest("[data-node]");
      if (node) return editNode(node.dataset.node);
      const road = event.target.closest("[data-edge]");
      if (road) editRoad(road.dataset.edge);
    });
    $("#graphPlane").addEventListener("keydown", (event) => {
      const node = event.target.closest("[data-node]");
      if (!node || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
      const point = P.parseNodeKey(node.dataset.node);
      const delta = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[event.key];
      const nextKey = P.nodeKey(point.row + delta[0], point.column + delta[1]);
      const next = $(`[data-node="${nextKey}"]`, $("#graphPlane"));
      if (next) {
        event.preventDefault();
        next.focus();
      }
    });

    $("#stepContent").addEventListener("click", (event) => {
      const pathButton = event.target.closest("[data-path-index]");
      if (pathButton) {
        state.selectedPathIndex = Number(pathButton.dataset.pathIndex);
        renderGraph();
        renderStepContent();
        return;
      }
      const filterButton = event.target.closest("[data-path-filter]");
      if (filterButton) {
        state.pathFilter = filterButton.dataset.pathFilter;
        renderStepContent();
        return;
      }
      const propagationButton = event.target.closest("[data-propagation]");
      if (propagationButton) {
        if (propagationButton.dataset.propagation === "reset") state.propagationLevel = 0;
        if (propagationButton.dataset.propagation === "previous") state.propagationLevel = Math.max(0, state.propagationLevel - 1);
        if (propagationButton.dataset.propagation === "next") state.propagationLevel = Math.min(state.analysis.shortestDistance, state.propagationLevel + 1);
        renderGraph();
        renderStepContent();
        return;
      }
      if (event.target.closest("[data-run-simulation]")) {
        const trials = Number($("#trialCount").value);
        state.simulation = P.runSimulation(state.analysis, trials, Math.random);
        renderStepContent();
        showToast(`${trials.toLocaleString("ko-KR")}회씩 실험했습니다.`);
      }
    });

    $("#saveProblemButton").addEventListener("click", saveProblem);
    $("#loadProblemButton").addEventListener("click", loadSavedProblem);
    $("#deleteProblemButton").addEventListener("click", deleteSavedProblem);
    $("#exportProblemButton").addEventListener("click", exportProblem);
    $("#importProblemInput").addEventListener("change", (event) => importProblem(event.target.files[0]));

    const helpDialog = $("#helpDialog");
    $("#helpButton").addEventListener("click", () => helpDialog.showModal());
    $("#closeHelpButton").addEventListener("click", () => helpDialog.close());
    $("#dialogStartButton").addEventListener("click", () => {
      helpDialog.close();
      $("#labWorkspace").scrollIntoView({ behavior: "smooth" });
    });
    helpDialog.addEventListener("click", (event) => {
      if (event.target === helpDialog) helpDialog.close();
    });
  }

  initializeSizeSelects();
  renderSavedOptions();
  wireEvents();
  recalculate();
})();
