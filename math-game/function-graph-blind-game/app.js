(function () {
  "use strict";

  const Logic = window.FunctionGraphGame;
  const STORAGE_KEY = "functionGraphBlindGame.v1";
  const TEAM_COLORS = ["#19745f", "#315f9a", "#d56b3b", "#7655a3"];
  const DEFAULT_STATE = {
    settings: {
      mode: "group",
      difficulty: "easy",
      selectedProblemId: "random",
      timeLimitSeconds: 480,
      teamCount: 2,
      solverTeamId: "team-1",
      graphTeamId: "team-2"
    },
    teams: [
      { id: "team-1", name: "1조", score: 0 },
      { id: "team-2", name: "2조", score: 0 },
      { id: "team-3", name: "3조", score: 0 },
      { id: "team-4", name: "4조", score: 0 }
    ],
    customProblems: [],
    history: [],
    activeRound: null
  };

  const elements = {};
  let state = loadState();
  let timerId = null;
  let toastTimer = null;
  let activeStroke = null;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function sanitizeState(saved) {
    const next = clone(DEFAULT_STATE);
    if (!saved || typeof saved !== "object") return next;
    next.settings = { ...next.settings, ...(saved.settings || {}) };
    next.settings.teamCount = Math.min(4, Math.max(2, Number(next.settings.teamCount) || 2));
    next.settings.timeLimitSeconds = Math.min(1800, Math.max(60, Number(next.settings.timeLimitSeconds) || 480));
    if (!["group", "solo"].includes(next.settings.mode)) next.settings.mode = "group";
    if (!["easy", "normal", "hard", "custom"].includes(next.settings.difficulty)) next.settings.difficulty = "easy";
    if (Array.isArray(saved.teams)) {
      next.teams = next.teams.map((team, index) => {
        const incoming = saved.teams[index] || {};
        return { ...team, name: String(incoming.name || team.name).slice(0, 20), score: Number(incoming.score) || 0 };
      });
    }
    if (Array.isArray(saved.customProblems)) {
      next.customProblems = saved.customProblems.map((problem) => Logic.validateProblem(problem)).filter((result) => result.valid).map((result) => result.problem).slice(0, 60);
    }
    if (Array.isArray(saved.history)) next.history = saved.history.slice(0, 60);
    if (saved.activeRound && saved.activeRound.problem && Logic.validateProblem(saved.activeRound.problem).valid) {
      next.activeRound = saved.activeRound;
      next.activeRound.hints = Array.isArray(next.activeRound.hints) ? next.activeRound.hints : [];
      next.activeRound.sketchStrokes = Array.isArray(next.activeRound.sketchStrokes) ? next.activeRound.sketchStrokes : [];
    }
    return next;
  }

  function loadState() {
    try {
      return sanitizeState(JSON.parse(localStorage.getItem(STORAGE_KEY)));
    } catch (error) {
      return clone(DEFAULT_STATE);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      showToast("저장 공간이 부족해 이번 변경은 현재 화면에만 유지됩니다.");
    }
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function cacheElements() {
    [
      "setupView", "roundView", "teamSettings", "teamNameGrid", "solverTeamSelect", "graphTeamSelect", "scoreList", "problemSelect", "timeLimitSelect",
      "customDifficulty", "customProblemCount", "solverStage", "handoffStage", "graphStage", "resultStage", "solverTeamLabel", "targetEquation", "solverNotes",
      "helpChanceButton", "roleStatus", "problemStatus", "hintCountStatus", "tierStatus", "clockStatus", "handoffMessage", "turnBanner", "turnNumber", "turnOwner",
      "hintGrid", "clueLog", "contributionStatus", "sketchCanvas", "candidateGrid", "submitGraphButton", "resultMark", "resultTitle", "resultSummary",
      "resultScore", "resultTier", "resultTime", "resultHelp", "evidenceGrid", "answerCanvas", "answerReviewText", "historyBody", "emptyHistory",
      "guideDialog", "teacherDialog", "helpDialog", "customProblemList", "problemForm", "editProblemId", "editProblemTitle", "editProblemDifficulty",
      "editProblemCoefficients", "editXMin", "editXMax", "problemFormError", "problemImportInput", "helperTeamSelect", "helpForm", "helpTypeSelect", "toast"
    ].forEach((id) => { elements[id] = byId(id); });
  }

  function activeTeams() {
    return state.teams.slice(0, state.settings.teamCount);
  }

  function getTeam(id) {
    return state.teams.find((team) => team.id === id) || state.teams[0];
  }

  function getProblemPool() {
    if (state.settings.difficulty === "custom") return state.customProblems;
    return Logic.BUILTIN_PROBLEMS.filter((problem) => problem.difficulty === state.settings.difficulty);
  }

  function problemById(id) {
    return [...Logic.BUILTIN_PROBLEMS, ...state.customProblems].find((problem) => problem.id === id);
  }

  function chooseProblem() {
    const pool = getProblemPool();
    if (!pool.length) return null;
    if (state.settings.selectedProblemId !== "random") return problemById(state.settings.selectedProblemId) || pool[0];
    const recentId = state.history[0]?.problemId;
    const choices = pool.length > 1 ? pool.filter((problem) => problem.id !== recentId) : pool;
    return choices[Math.floor(Math.random() * choices.length)];
  }

  function setPressedGroup(selector, value, dataKey) {
    document.querySelectorAll(selector).forEach((button) => {
      const active = button.dataset[dataKey] === value;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function renderSetup() {
    setPressedGroup("[data-mode]", state.settings.mode, "mode");
    setPressedGroup("[data-difficulty]", state.settings.difficulty, "difficulty");
    elements.teamSettings.hidden = state.settings.mode !== "group";
    elements.timeLimitSelect.value = String(state.settings.timeLimitSeconds);
    renderTeamInputs();
    renderRoleSelects();
    renderProblemOptions();
    renderScoreboard();
    renderCustomProblemList();
    renderHistory();
  }

  function renderTeamInputs() {
    elements.teamNameGrid.replaceChildren();
    activeTeams().forEach((team, index) => {
      const label = document.createElement("label");
      label.className = "team-name-field";
      label.textContent = `${index + 1}번 모둠`;
      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 20;
      input.value = team.name;
      input.setAttribute("aria-label", `${index + 1}번 모둠 이름`);
      input.addEventListener("change", () => {
        team.name = input.value.trim() || `${index + 1}조`;
        input.value = team.name;
        saveState();
        renderRoleSelects();
        renderScoreboard();
      });
      label.append(input);
      elements.teamNameGrid.append(label);
    });
    document.querySelectorAll("[data-team-count]").forEach((button) => button.setAttribute("aria-pressed", String(Number(button.dataset.teamCount) === state.settings.teamCount)));
  }

  function fillTeamSelect(select, selectedId) {
    select.replaceChildren(...activeTeams().map((team) => {
      const option = document.createElement("option");
      option.value = team.id;
      option.textContent = team.name;
      return option;
    }));
    if (!activeTeams().some((team) => team.id === selectedId)) selectedId = activeTeams()[0].id;
    select.value = selectedId;
  }

  function renderRoleSelects() {
    const teams = activeTeams();
    if (!teams.some((team) => team.id === state.settings.solverTeamId)) state.settings.solverTeamId = teams[0].id;
    if (!teams.some((team) => team.id === state.settings.graphTeamId)) state.settings.graphTeamId = teams[Math.min(1, teams.length - 1)].id;
    fillTeamSelect(elements.solverTeamSelect, state.settings.solverTeamId);
    fillTeamSelect(elements.graphTeamSelect, state.settings.graphTeamId);
  }

  function renderProblemOptions() {
    const pool = getProblemPool();
    elements.problemSelect.replaceChildren();
    const randomOption = document.createElement("option");
    randomOption.value = "random";
    randomOption.textContent = `무작위 (${pool.length}문제)`;
    elements.problemSelect.append(randomOption);
    pool.forEach((problem) => {
      const option = document.createElement("option");
      option.value = problem.id;
      option.textContent = problem.title;
      elements.problemSelect.append(option);
    });
    if (![...elements.problemSelect.options].some((option) => option.value === state.settings.selectedProblemId)) state.settings.selectedProblemId = "random";
    elements.problemSelect.value = state.settings.selectedProblemId;
    elements.customDifficulty.hidden = state.customProblems.length === 0;
    elements.customProblemCount.textContent = `${state.customProblems.length}개`;
    if (state.settings.difficulty === "custom" && state.customProblems.length === 0) {
      state.settings.difficulty = "normal";
      renderProblemOptions();
      setPressedGroup("[data-difficulty]", state.settings.difficulty, "difficulty");
    }
  }

  function renderScoreboard() {
    const sorted = activeTeams().slice().sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
    elements.scoreList.replaceChildren(...sorted.map((team, index) => {
      const row = document.createElement("div");
      row.className = "score-row";
      const rank = document.createElement("span");
      rank.className = "score-rank";
      rank.textContent = String(index + 1);
      rank.style.background = TEAM_COLORS[state.teams.findIndex((item) => item.id === team.id)] || TEAM_COLORS[0];
      const name = document.createElement("div");
      name.innerHTML = `<strong></strong><small>${state.history.filter((record) => record.graphTeamId === team.id).length}라운드 그래프 담당</small>`;
      name.querySelector("strong").textContent = team.name;
      const score = document.createElement("b");
      score.textContent = `${team.score}점`;
      row.append(rank, name, score);
      return row;
    }));
  }

  function startRound() {
    const problem = chooseProblem();
    if (!problem) {
      showToast("먼저 교사용 편집에서 문제를 만들어 주세요.");
      return;
    }
    const now = Date.now();
    state.activeRound = {
      id: `round-${now}`,
      problemId: problem.id,
      problem: clone(problem),
      mode: state.settings.mode,
      stage: state.settings.mode === "group" ? "solver" : "graph",
      solverTeamId: state.settings.solverTeamId,
      graphTeamId: state.settings.graphTeamId,
      startedAt: now,
      timeLimitSeconds: state.settings.timeLimitSeconds,
      hints: [],
      selectedCandidateId: null,
      help: null,
      notes: "",
      sketchStrokes: [],
      scored: false,
      result: null
    };
    saveState();
    renderRound();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderRound() {
    const round = state.activeRound;
    if (!round) {
      elements.setupView.hidden = false;
      elements.roundView.hidden = true;
      stopTimer();
      renderSetup();
      return;
    }
    elements.setupView.hidden = true;
    elements.roundView.hidden = false;
    elements.solverStage.hidden = round.stage !== "solver";
    elements.handoffStage.hidden = round.stage !== "handoff";
    elements.graphStage.hidden = round.stage !== "graph";
    elements.resultStage.hidden = round.stage !== "result";
    const solver = getTeam(round.solverTeamId);
    const graph = getTeam(round.graphTeamId);
    elements.problemStatus.textContent = round.problem.title;
    elements.hintCountStatus.textContent = String(round.hints.length);
    elements.tierStatus.textContent = Logic.getHintTier(round.hints.length).label;
    elements.roleStatus.textContent = round.stage === "solver" ? `풀이팀 · ${solver.name}` : round.stage === "handoff" ? "화면 가림" : round.stage === "graph" ? (round.mode === "solo" ? "개인 연습" : `그래프팀 · ${graph.name}`) : "채점 완료";

    if (round.stage === "solver") {
      elements.solverTeamLabel.textContent = `${solver.name} 풀이팀 전용 화면`;
      elements.targetEquation.textContent = Logic.formatPolynomial(round.problem.coefficients);
      elements.solverNotes.value = round.notes || "";
      elements.helpChanceButton.disabled = Boolean(round.help);
      if (round.help) elements.helpChanceButton.querySelector("strong").textContent = "도움 찬스 사용 완료";
    }
    if (round.stage === "handoff") elements.handoffMessage.textContent = `${graph.name} 그래프팀에게 기기를 건네세요. 다음 화면에는 함수식과 답 그래프가 나타나지 않습니다.`;
    if (round.stage === "graph") renderGraphStage();
    if (round.stage === "result") renderResult();
    updateTimer();
    startTimer();
  }

  function nextHintOwner(round) {
    if (round.mode === "solo") return { role: "solo", teamId: null, name: "개인" };
    const isSolver = round.hints.length % 2 === 0;
    return isSolver ? { role: "solver", teamId: round.solverTeamId, name: getTeam(round.solverTeamId).name } : { role: "graph", teamId: round.graphTeamId, name: getTeam(round.graphTeamId).name };
  }

  function renderGraphStage() {
    const round = state.activeRound;
    const catalogue = Logic.getHintCatalogue(round.problem);
    const owner = nextHintOwner(round);
    elements.turnNumber.textContent = `${round.hints.length + 1}번째 선택`;
    elements.turnOwner.textContent = owner.role === "solo" ? "필요한 정보 카드 하나를 고르세요." : owner.role === "solver" ? `${owner.name} 풀이팀이 먼저 정보 카드 하나를 골라 말하세요.` : `${owner.name} 그래프팀이 질문 카드 하나를 고르세요.`;
    elements.turnBanner.classList.toggle("is-graph-turn", owner.role === "graph");
    const usedIds = new Set(round.hints.map((hint) => hint.id));
    elements.hintGrid.replaceChildren(...catalogue.map((hint) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `hint-card${usedIds.has(hint.id) ? " is-used" : ""}`;
      button.disabled = usedIds.has(hint.id);
      button.innerHTML = `<b>${String(hint.id).padStart(2, "0")}</b><span><strong></strong><small></small></span>`;
      button.querySelector("strong").textContent = hint.short;
      button.querySelector("small").textContent = usedIds.has(hint.id) ? "사용 완료" : hint.prompt;
      button.setAttribute("aria-label", `${hint.id}번 ${hint.short}. ${usedIds.has(hint.id) ? "사용 완료" : hint.prompt}`);
      button.addEventListener("click", () => useHint(hint));
      return button;
    }));
    renderClueLog(catalogue);
    renderCandidates();
    renderSketch();
  }

  function useHint(hint) {
    const round = state.activeRound;
    if (!round || round.stage !== "graph" || round.hints.some((item) => item.id === hint.id)) return;
    const owner = nextHintOwner(round);
    round.hints.push({ id: hint.id, role: owner.role, teamId: owner.teamId, at: Date.now() });
    saveState();
    renderGraphStage();
    elements.hintCountStatus.textContent = String(round.hints.length);
    elements.tierStatus.textContent = Logic.getHintTier(round.hints.length).label;
    const last = elements.clueLog.lastElementChild;
    if (last) last.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function renderClueLog(catalogue) {
    const round = state.activeRound;
    if (!round.hints.length) {
      elements.clueLog.innerHTML = '<li class="empty-clue">아직 고른 단서가 없습니다.</li>';
    } else {
      const map = new Map(catalogue.map((hint) => [hint.id, hint]));
      elements.clueLog.replaceChildren(...round.hints.map((record, index) => {
        const hint = map.get(record.id);
        const item = document.createElement("li");
        item.className = `clue-item${record.role === "graph" ? " is-graph" : ""}`;
        const owner = record.role === "solo" ? "개인 선택" : record.role === "solver" ? `${getTeam(record.teamId).name} 풀이팀 전달` : `${getTeam(record.teamId).name} 그래프팀 질문`;
        item.innerHTML = `<span>${index + 1}. ${owner} · ${hint.short}</span><strong></strong>`;
        item.querySelector("strong").textContent = hint.answer;
        return item;
      }));
    }
    const solverCount = round.hints.filter((hint) => hint.role === "solver").length;
    const graphCount = round.hints.filter((hint) => hint.role === "graph").length;
    elements.contributionStatus.textContent = round.mode === "solo" ? `개인 ${round.hints.length}` : `풀이 ${solverCount} · 그래프 ${graphCount}`;
  }

  function drawGraph(canvas, coefficients, bounds, color = "#d56b3b") {
    const context = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    const padding = Math.max(18, Math.round(width * .055));
    const plotWidth = width - padding * 2;
    const plotHeight = height - padding * 2;
    const xToPixel = (x) => padding + ((x - bounds.xMin) / (bounds.xMax - bounds.xMin)) * plotWidth;
    const yToPixel = (y) => padding + ((bounds.yMax - y) / (bounds.yMax - bounds.yMin)) * plotHeight;
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#fbfcfa";
    context.fillRect(0, 0, width, height);
    context.strokeStyle = "#e5ebe7";
    context.lineWidth = 1;
    const xStep = Math.max(1, Math.ceil((bounds.xMax - bounds.xMin) / 8));
    const yStep = Math.max(1, Math.ceil((bounds.yMax - bounds.yMin) / 7));
    for (let x = Math.ceil(bounds.xMin / xStep) * xStep; x <= bounds.xMax; x += xStep) {
      const px = xToPixel(x);
      context.beginPath(); context.moveTo(px, padding); context.lineTo(px, height - padding); context.stroke();
    }
    for (let y = Math.ceil(bounds.yMin / yStep) * yStep; y <= bounds.yMax; y += yStep) {
      const py = yToPixel(y);
      context.beginPath(); context.moveTo(padding, py); context.lineTo(width - padding, py); context.stroke();
    }
    context.strokeStyle = "#81908d";
    context.lineWidth = 1.4;
    if (bounds.xMin <= 0 && bounds.xMax >= 0) { const px = xToPixel(0); context.beginPath(); context.moveTo(px, padding); context.lineTo(px, height - padding); context.stroke(); }
    if (bounds.yMin <= 0 && bounds.yMax >= 0) { const py = yToPixel(0); context.beginPath(); context.moveTo(padding, py); context.lineTo(width - padding, py); context.stroke(); }
    context.save();
    context.beginPath();
    context.rect(padding, padding, plotWidth, plotHeight);
    context.clip();
    context.beginPath();
    let drawing = false;
    for (let index = 0; index <= 500; index += 1) {
      const x = bounds.xMin + ((bounds.xMax - bounds.xMin) * index) / 500;
      const y = Logic.evaluatePolynomial(coefficients, x);
      const px = xToPixel(x);
      const py = yToPixel(y);
      if (!Number.isFinite(py) || py < -height * 2 || py > height * 3) { drawing = false; continue; }
      if (!drawing) { context.moveTo(px, py); drawing = true; } else context.lineTo(px, py);
    }
    context.strokeStyle = color;
    context.lineWidth = Math.max(2.5, width / 150);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.stroke();
    context.restore();
  }

  function renderCandidates() {
    const round = state.activeRound;
    const candidates = Logic.makeCandidates(round.problem);
    const bounds = Logic.getGraphBounds(round.problem, candidates.map((candidate) => candidate.coefficients));
    elements.candidateGrid.replaceChildren(...candidates.map((candidate) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "candidate-button";
      button.setAttribute("role", "radio");
      button.setAttribute("aria-checked", String(round.selectedCandidateId === candidate.id));
      button.setAttribute("aria-label", `${candidate.label}번 그래프. ${Logic.describeGraph(candidate.coefficients)}`);
      const label = document.createElement("b");
      label.textContent = candidate.label;
      const canvas = document.createElement("canvas");
      canvas.width = 380;
      canvas.height = 230;
      canvas.setAttribute("aria-hidden", "true");
      button.append(label, canvas);
      button.addEventListener("click", () => {
        round.selectedCandidateId = candidate.id;
        saveState();
        renderCandidates();
        elements.submitGraphButton.disabled = false;
      });
      requestAnimationFrame(() => drawGraph(canvas, candidate.coefficients, bounds));
      return button;
    }));
    elements.submitGraphButton.disabled = !round.selectedCandidateId;
  }

  function renderSketch() {
    const canvas = elements.sketchCanvas;
    const context = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    context.strokeStyle = "#e5ebe7";
    context.lineWidth = 1;
    for (let x = 0; x <= 10; x += 1) { const px = (x / 10) * width; context.beginPath(); context.moveTo(px, 0); context.lineTo(px, height); context.stroke(); }
    for (let y = 0; y <= 8; y += 1) { const py = (y / 8) * height; context.beginPath(); context.moveTo(0, py); context.lineTo(width, py); context.stroke(); }
    context.strokeStyle = "#879591";
    context.lineWidth = 2;
    context.beginPath(); context.moveTo(width / 2, 0); context.lineTo(width / 2, height); context.stroke();
    context.beginPath(); context.moveTo(0, height / 2); context.lineTo(width, height / 2); context.stroke();
    const strokes = [...(state.activeRound?.sketchStrokes || []), ...(activeStroke ? [activeStroke] : [])];
    context.strokeStyle = "#19745f";
    context.lineWidth = 4;
    context.lineCap = "round";
    context.lineJoin = "round";
    strokes.forEach((stroke) => {
      if (!stroke.length) return;
      context.beginPath();
      stroke.forEach((point, index) => { const px = point.x * width; const py = point.y * height; if (index === 0) context.moveTo(px, py); else context.lineTo(px, py); });
      context.stroke();
    });
  }

  function sketchPoint(event) {
    const rect = elements.sketchCanvas.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)), y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)) };
  }

  function finishRound(correct, reason) {
    const round = state.activeRound;
    if (!round || round.scored) return;
    const elapsedSeconds = Math.min(round.timeLimitSeconds, Math.max(0, Math.floor((Date.now() - round.startedAt) / 1000)));
    const scoreInfo = Logic.calculateRoundScore({ correct, hintCount: round.hints.length, elapsedSeconds, timeLimitSeconds: round.timeLimitSeconds });
    const solverContribution = round.mode === "group" ? round.hints.filter((hint) => hint.role === "solver").length * 3 : 0;
    const graphScore = round.mode === "group" ? scoreInfo.score : 0;
    let helpAdjustment = 0;
    if (round.mode === "group") {
      getTeam(round.graphTeamId).score += graphScore;
      getTeam(round.solverTeamId).score += solverContribution;
      if (round.help) {
        helpAdjustment = round.help.result === "correct" ? 5 : -3;
        getTeam(round.help.helperTeamId).score += helpAdjustment;
      }
    }
    round.scored = true;
    round.stage = "result";
    round.result = { correct, reason, elapsedSeconds, score: scoreInfo.score, tier: scoreInfo.tier, solverContribution, graphScore, helpAdjustment };
    state.history.unshift({
      id: round.id,
      completedAt: new Date().toISOString(),
      mode: round.mode,
      solverTeamId: round.solverTeamId,
      graphTeamId: round.graphTeamId,
      solverName: getTeam(round.solverTeamId).name,
      graphName: getTeam(round.graphTeamId).name,
      problemId: round.problem.id,
      problemTitle: round.problem.title,
      correct,
      hintCount: round.hints.length,
      tier: scoreInfo.tier.label,
      score: scoreInfo.score,
      elapsedSeconds
    });
    state.history = state.history.slice(0, 60);
    saveState();
    renderRound();
    renderHistory();
    renderScoreboard();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderResult() {
    const round = state.activeRound;
    const result = round.result;
    const correct = result.correct;
    elements.resultMark.textContent = correct ? "✓" : "×";
    elements.resultMark.classList.toggle("is-wrong", !correct);
    elements.resultTitle.textContent = correct ? "정확한 그래프입니다!" : result.reason === "timeout" ? "시간이 끝났습니다." : "개형의 핵심 특징이 다릅니다.";
    elements.resultSummary.textContent = correct ? `힌트 ${round.hints.length}개로 개형을 복원했습니다. 어떤 단서가 결정적이었는지 서로 설명해 보세요.` : "정답 그래프의 양끝 행동, 극값, x축 교점을 단서 기록과 다시 연결해 보세요.";
    elements.resultScore.textContent = `${result.score}점`;
    elements.resultTier.textContent = `${result.tier.label} · ${round.hints.length <= 4 ? "4개 이하" : round.hints.length <= 6 ? "5–6개" : "7개 이상"}`;
    elements.resultTime.textContent = formatTime(result.elapsedSeconds);
    elements.resultHelp.textContent = round.help ? `${getTeam(round.help.helperTeamId).name} · ${round.help.type} ${result.helpAdjustment > 0 ? "+5" : "−3"}` : "사용 안 함";
    const solverCount = round.hints.filter((hint) => hint.role === "solver").length;
    const graphCount = round.hints.filter((hint) => hint.role === "graph").length;
    const evidence = [
      ["의사소통", round.mode === "solo" ? "선택한 단서를 말로 다시 설명해 보세요." : `${solverCount + graphCount}번 번갈아 질문·전달했습니다.`],
      ["문제해결", correct ? "그래프의 핵심 특징을 정확히 복원했습니다." : "오답과 정답의 다른 특징을 비교할 단계입니다."],
      ["정보처리", `${result.tier.label} 수준 · ${result.tier.description}`],
      ["태도·실천", result.reason === "timeout" ? "제한시간 뒤에도 정답 검토까지 이어 갑니다." : "제한시간 안에 제출을 마쳤습니다."]
    ];
    elements.evidenceGrid.replaceChildren(...evidence.map(([title, text]) => {
      const card = document.createElement("article");
      card.className = "evidence-card";
      card.innerHTML = "<b></b><p></p>";
      card.querySelector("b").textContent = title;
      card.querySelector("p").textContent = text;
      return card;
    }));
    elements.answerReviewText.textContent = `${Logic.formatPolynomial(round.problem.coefficients)} · ${Logic.describeGraph(round.problem.coefficients)}. 선택한 힌트 중 이 특징을 직접 알려 준 카드를 찾아보세요.`;
    const bounds = Logic.getGraphBounds(round.problem, [round.problem.coefficients]);
    requestAnimationFrame(() => drawGraph(elements.answerCanvas, round.problem.coefficients, bounds, "#19745f"));
  }

  function formatTime(seconds) {
    const safe = Math.max(0, Math.floor(seconds));
    return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
  }

  function remainingSeconds(round) {
    return Math.max(0, round.timeLimitSeconds - Math.floor((Date.now() - round.startedAt) / 1000));
  }

  function updateTimer() {
    const round = state.activeRound;
    if (!round) return;
    if (round.stage === "result") {
      elements.clockStatus.textContent = "완료";
      elements.clockStatus.classList.remove("is-urgent");
      return;
    }
    const remaining = remainingSeconds(round);
    elements.clockStatus.textContent = formatTime(remaining);
    elements.clockStatus.classList.toggle("is-urgent", remaining <= 60);
    if (remaining <= 0) finishRound(false, "timeout");
  }

  function startTimer() {
    stopTimer();
    if (state.activeRound && state.activeRound.stage !== "result") timerId = window.setInterval(updateTimer, 1000);
  }

  function stopTimer() {
    if (timerId) window.clearInterval(timerId);
    timerId = null;
  }

  function renderHistory() {
    const records = state.history.slice(0, 12);
    elements.historyBody.replaceChildren(...records.map((record) => {
      const row = document.createElement("tr");
      const date = new Date(record.completedAt);
      const roleText = record.mode === "solo" ? "개인 연습" : `${record.solverName} → ${record.graphName}`;
      row.innerHTML = `<td></td><td></td><td></td><td class="${record.correct ? "result-correct" : "result-wrong"}"><b>${record.correct ? "정답" : "오답"}</b></td><td>${record.hintCount}개 · ${record.tier}</td><td><b>${record.score}점</b></td>`;
      row.children[0].textContent = `${date.getMonth() + 1}.${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
      row.children[1].textContent = roleText;
      row.children[2].textContent = record.problemTitle;
      return row;
    }));
    elements.emptyHistory.hidden = records.length > 0;
  }

  function openDialog(dialog) {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function closeDialog(dialog) {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function showToast(message) {
    if (!elements.toast) return;
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 2600);
  }

  function clearProblemForm() {
    elements.editProblemId.value = "";
    elements.editProblemTitle.value = "";
    elements.editProblemDifficulty.value = "normal";
    elements.editProblemCoefficients.value = "1, 0, -5, 0, 4";
    elements.editXMin.value = "-4";
    elements.editXMax.value = "4";
    elements.problemFormError.textContent = "";
  }

  function editProblem(problem) {
    elements.editProblemId.value = problem.id;
    elements.editProblemTitle.value = problem.title;
    elements.editProblemDifficulty.value = problem.difficulty;
    elements.editProblemCoefficients.value = problem.coefficients.join(", ");
    elements.editXMin.value = String(problem.xRange[0]);
    elements.editXMax.value = String(problem.xRange[1]);
    elements.problemFormError.textContent = "";
  }

  function renderCustomProblemList() {
    if (!elements.customProblemList) return;
    if (!state.customProblems.length) {
      elements.customProblemList.innerHTML = '<p class="empty-custom">저장된 교사 문제가 없습니다.</p>';
      return;
    }
    elements.customProblemList.replaceChildren(...state.customProblems.map((problem) => {
      const item = document.createElement("div");
      item.className = "custom-problem-item";
      const edit = document.createElement("button");
      edit.type = "button";
      edit.innerHTML = "<strong></strong><small></small>";
      edit.querySelector("strong").textContent = problem.title;
      edit.querySelector("small").textContent = Logic.formatPolynomial(problem.coefficients, "");
      edit.addEventListener("click", () => editProblem(problem));
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "delete-problem";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `${problem.title} 삭제`);
      remove.addEventListener("click", () => {
        if (!window.confirm(`‘${problem.title}’ 문제를 삭제할까요?`)) return;
        state.customProblems = state.customProblems.filter((itemProblem) => itemProblem.id !== problem.id);
        saveState();
        renderSetup();
        clearProblemForm();
      });
      item.append(edit, remove);
      return item;
    }));
  }

  function exportProblems() {
    if (!state.customProblems.length) { showToast("저장할 교사 문제가 없습니다."); return; }
    const blob = new Blob([JSON.stringify(state.customProblems, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "함수-그래프-블라인드-문제.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function importProblems(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const incoming = JSON.parse(reader.result);
        if (!Array.isArray(incoming)) throw new Error("문제 배열이 아닙니다.");
        const validated = incoming.map((problem, index) => {
          const candidate = { ...problem, id: String(problem.id || `custom-${Date.now()}-${index}`) };
          const result = Logic.validateProblem(candidate);
          if (!result.valid) throw new Error(`${index + 1}번 문제: ${result.message}`);
          return result.problem;
        });
        const byId = new Map(state.customProblems.map((problem) => [problem.id, problem]));
        validated.forEach((problem) => byId.set(problem.id, problem));
        state.customProblems = [...byId.values()].slice(0, 60);
        saveState();
        renderSetup();
        showToast(`${validated.length}개 문제를 불러왔습니다.`);
      } catch (error) {
        showToast(`불러오기 실패: ${error.message}`);
      }
      elements.problemImportInput.value = "";
    };
    reader.readAsText(file);
  }

  function renderHelperOptions() {
    const round = state.activeRound;
    const helpers = activeTeams().filter((team) => team.id !== round.solverTeamId);
    elements.helperTeamSelect.replaceChildren(...helpers.map((team) => {
      const option = document.createElement("option");
      option.value = team.id;
      option.textContent = team.name;
      return option;
    }));
  }

  function bindEvents() {
    document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => {
      state.settings.mode = button.dataset.mode;
      saveState();
      renderSetup();
    }));
    document.querySelectorAll("[data-difficulty]").forEach((button) => button.addEventListener("click", () => {
      if (button.dataset.difficulty === "custom" && !state.customProblems.length) return;
      state.settings.difficulty = button.dataset.difficulty;
      state.settings.selectedProblemId = "random";
      saveState();
      renderSetup();
    }));
    document.querySelectorAll("[data-team-count]").forEach((button) => button.addEventListener("click", () => {
      state.settings.teamCount = Number(button.dataset.teamCount);
      saveState();
      renderSetup();
    }));
    document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => closeDialog(button.closest("dialog"))));
    byId("guideButton").addEventListener("click", () => openDialog(elements.guideDialog));
    byId("teacherButton").addEventListener("click", () => { renderCustomProblemList(); clearProblemForm(); openDialog(elements.teacherDialog); });
    elements.problemSelect.addEventListener("change", () => { state.settings.selectedProblemId = elements.problemSelect.value; saveState(); });
    elements.timeLimitSelect.addEventListener("change", () => { state.settings.timeLimitSeconds = Number(elements.timeLimitSelect.value); saveState(); });
    elements.solverTeamSelect.addEventListener("change", () => { state.settings.solverTeamId = elements.solverTeamSelect.value; saveState(); });
    elements.graphTeamSelect.addEventListener("change", () => { state.settings.graphTeamId = elements.graphTeamSelect.value; saveState(); });
    byId("startRoundButton").addEventListener("click", startRound);
    byId("finishSolvingButton").addEventListener("click", () => { state.activeRound.notes = elements.solverNotes.value; state.activeRound.stage = "handoff"; saveState(); renderRound(); });
    elements.solverNotes.addEventListener("input", () => { if (state.activeRound) { state.activeRound.notes = elements.solverNotes.value; saveState(); } });
    byId("revealGraphStageButton").addEventListener("click", () => { state.activeRound.stage = "graph"; saveState(); renderRound(); });
    elements.helpChanceButton.addEventListener("click", () => { renderHelperOptions(); openDialog(elements.helpDialog); });
    elements.helpForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const result = new FormData(elements.helpForm).get("helpResult");
      state.activeRound.help = { helperTeamId: elements.helperTeamSelect.value, type: elements.helpTypeSelect.value, result };
      saveState();
      closeDialog(elements.helpDialog);
      renderRound();
      showToast("도움 찬스를 기록했습니다.");
    });
    elements.submitGraphButton.addEventListener("click", () => {
      const candidate = Logic.makeCandidates(state.activeRound.problem).find((item) => item.id === state.activeRound.selectedCandidateId);
      finishRound(Boolean(candidate?.isAnswer), "submitted");
    });
    byId("undoSketchButton").addEventListener("click", () => { state.activeRound.sketchStrokes.pop(); saveState(); renderSketch(); });
    byId("clearSketchButton").addEventListener("click", () => { state.activeRound.sketchStrokes = []; saveState(); renderSketch(); });
    elements.sketchCanvas.addEventListener("pointerdown", (event) => {
      if (!state.activeRound || state.activeRound.stage !== "graph") return;
      activeStroke = [sketchPoint(event)];
      elements.sketchCanvas.setPointerCapture(event.pointerId);
      renderSketch();
    });
    elements.sketchCanvas.addEventListener("pointermove", (event) => {
      if (!activeStroke) return;
      const point = sketchPoint(event);
      const last = activeStroke[activeStroke.length - 1];
      if (Math.hypot(point.x - last.x, point.y - last.y) > .004) activeStroke.push(point);
      renderSketch();
    });
    const finishStroke = () => {
      if (!activeStroke) return;
      if (activeStroke.length > 1) state.activeRound.sketchStrokes.push(activeStroke.slice(0, 500));
      state.activeRound.sketchStrokes = state.activeRound.sketchStrokes.slice(-30);
      activeStroke = null;
      saveState();
      renderSketch();
    };
    elements.sketchCanvas.addEventListener("pointerup", finishStroke);
    elements.sketchCanvas.addEventListener("pointercancel", finishStroke);
    byId("quitRoundButton").addEventListener("click", () => {
      if (!window.confirm("진행 중인 라운드를 끝내고 설정으로 돌아갈까요? 기록과 점수에는 반영되지 않습니다.")) return;
      state.activeRound = null;
      saveState();
      renderRound();
    });
    byId("backToSetupButton").addEventListener("click", () => { state.activeRound = null; saveState(); renderRound(); });
    byId("nextRoundButton").addEventListener("click", () => {
      if (state.settings.mode === "group") {
        const oldSolver = state.settings.solverTeamId;
        state.settings.solverTeamId = state.settings.graphTeamId;
        state.settings.graphTeamId = oldSolver;
      }
      state.activeRound = null;
      saveState();
      startRound();
    });
    byId("resetScoresButton").addEventListener("click", () => {
      if (!window.confirm("모든 모둠의 누적 점수를 0점으로 바꿀까요? 라운드 기록은 유지됩니다.")) return;
      state.teams.forEach((team) => { team.score = 0; });
      saveState(); renderScoreboard();
    });
    byId("clearHistoryButton").addEventListener("click", () => {
      if (!state.history.length || !window.confirm("저장된 라운드 기록을 모두 지울까요?")) return;
      state.history = []; saveState(); renderHistory(); renderScoreboard();
    });
    byId("newProblemButton").addEventListener("click", clearProblemForm);
    elements.problemForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const coefficients = elements.editProblemCoefficients.value.split(/[,\s]+/).filter(Boolean).map(Number);
      const candidate = {
        id: elements.editProblemId.value || `custom-${Date.now()}`,
        title: elements.editProblemTitle.value,
        difficulty: elements.editProblemDifficulty.value,
        coefficients,
        xRange: [Number(elements.editXMin.value), Number(elements.editXMax.value)]
      };
      const validation = Logic.validateProblem(candidate);
      if (!validation.valid) { elements.problemFormError.textContent = validation.message; return; }
      const index = state.customProblems.findIndex((problem) => problem.id === candidate.id);
      if (index >= 0) state.customProblems[index] = validation.problem;
      else state.customProblems.push(validation.problem);
      state.settings.difficulty = "custom";
      state.settings.selectedProblemId = validation.problem.id;
      saveState();
      renderSetup();
      editProblem(validation.problem);
      showToast("교사 문제를 저장했습니다.");
    });
    byId("exportProblemsButton").addEventListener("click", exportProblems);
    elements.problemImportInput.addEventListener("change", () => { const file = elements.problemImportInput.files[0]; if (file) importProblems(file); });
    window.addEventListener("resize", () => {
      if (state.activeRound?.stage === "graph") renderSketch();
      if (state.activeRound?.stage === "result") renderResult();
    });
  }

  function init() {
    cacheElements();
    bindEvents();
    renderSetup();
    renderRound();
    const params = new URLSearchParams(window.location.search);
    if (params.get("manual") === "1") openDialog(elements.guideDialog);
  }

  init();
})();
