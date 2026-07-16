(() => {
  "use strict";

  const P = window.SymbolGuessingProbability;
  const W = window.SymbolGuessingWords;
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const PRESET_KEY = "symbol-guessing-lab-presets-v1";

  const state = {
    config: P.sanitizePreset({}),
    experimentNumber: 0,
    answers: [],
    answerKey: [],
    questionSet: [],
    currentQuestion: 0,
    timer: null,
    remainingSeconds: 0,
    predictionLevels: [1, 2, 4, 7, 9, 10, 9, 7, 4, 2, 1],
    predictionSnapshot: null,
    simulationCounts: null,
    simulationRepetitions: 0,
  };

  function toast(message) {
    const element = $("#toast");
    element.textContent = message;
    element.classList.add("show");
    clearTimeout(toast.timeout);
    toast.timeout = setTimeout(() => element.classList.remove("show"), 2200);
  }

  function formatNumber(value, digits = 2) {
    return Number(value).toLocaleString("ko-KR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function formatPercent(value) {
    if (value === 0) return "0%";
    if (value < 0.000001) return `${(value * 100).toExponential(3)}%`;
    if (value < 0.001) return `${(value * 100).toFixed(5)}%`;
    return `${(value * 100).toFixed(2)}%`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  }

  function setView(name, scroll = true) {
    $$('[data-view]').forEach((view) => {
      const active = view.dataset.view === name;
      view.classList.toggle("active", active);
      view.hidden = !active;
    });
    $$('[data-view-button]').forEach((button) => {
      const active = button.dataset.viewButton === name;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    if (name === "simulation") refreshSimulationTheory();
    if (scroll) $(".mode-tabs").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateCountOption(select, count, suffix = "") {
    const value = String(count);
    let option = [...select.options].find((item) => item.value === value);
    if (!option) {
      option = document.createElement("option");
      option.value = value;
      option.textContent = `${value}${suffix}`;
      select.append(option);
    }
    select.value = value;
  }

  function syncQuestionCounts(count) {
    updateCountOption($("#questionCountSelect"), count, "문항");
    updateCountOption($("#simulationN"), count);
    updateCountOption($("#classQuestionCount"), count, "문항");
    updatePredictionBounds();
  }

  function updatePredictionBounds() {
    const n = Number($("#questionCountSelect").value);
    [$("#predictedMean"), $("#predictedLow"), $("#predictedHigh")].forEach((input) => { input.max = n; });
    if (Number($("#predictedMean").value) > n) $("#predictedMean").value = Math.round(n / 2);
    if (Number($("#predictedLow").value) > n) $("#predictedLow").value = Math.max(0, Math.round(n / 2 - Math.sqrt(n)));
    if (Number($("#predictedHigh").value) > n) $("#predictedHigh").value = Math.min(n, Math.round(n / 2 + Math.sqrt(n)));
    renderPredictionDraw();
  }

  function renderLanguagePreview() {
    const language = $("#languageSelect").value;
    const meta = W.LANGUAGE_META[language];
    const previewLanguages = language === "mixed"
      ? W.MODERN_LANGUAGE_IDS
      : language === "ancient_mixed"
        ? W.ANCIENT_LANGUAGE_IDS
        : language === "all_mixed"
          ? W.LANGUAGE_IDS
          : [language];
    $("#languagePreview").innerHTML = `
      <div>
        <strong>${escapeHtml(meta.name)}</strong>
        <span>${escapeHtml(meta.note)}</span>
      </div>
      <p>${previewLanguages.map((languageId, index) => {
        const item = W.LANGUAGE_META[languageId];
        const words = W.WORD_SETS[languageId];
        const word = words[(index * 7) % words.length];
        return `<b lang="${item.lang}" dir="${item.dir}" title="${escapeHtml(item.name)}">${escapeHtml(word)}</b>`;
      }).join("")}</p>`;
  }

  function renderPredictionDraw() {
    const n = Number($("#questionCountSelect").value);
    $("#predictionDraw").innerHTML = state.predictionLevels.map((level, index) => {
      const score = Math.round(index * n / 10);
      return `<button class="prediction-bar" type="button" style="--level:${level}" data-prediction-index="${index}" aria-label="${score}점 부근 예상 높이 ${level}, 위아래 화살표로 조절"><i></i><span>${score}</span></button>`;
    }).join("");
    $$('[data-prediction-index]').forEach((button) => {
      button.addEventListener("click", (event) => {
        const rect = button.getBoundingClientRect();
        const ratio = 1 - (event.clientY - rect.top) / rect.height;
        state.predictionLevels[Number(button.dataset.predictionIndex)] = Math.max(1, Math.min(10, Math.ceil(ratio * 10)));
        renderPredictionDraw();
      });
      button.addEventListener("keydown", (event) => {
        if (!["ArrowUp", "ArrowDown"].includes(event.key)) return;
        event.preventDefault();
        const index = Number(button.dataset.predictionIndex);
        state.predictionLevels[index] = Math.max(1, Math.min(10, state.predictionLevels[index] + (event.key === "ArrowUp" ? 1 : -1)));
        renderPredictionDraw();
        $(`[data-prediction-index="${index}"]`).focus();
      });
    });
  }

  function startExperiment() {
    const n = Number($("#questionCountSelect").value);
    state.config = P.sanitizePreset({ ...state.config, questionCount: n, language: $("#languageSelect").value });
    state.experimentNumber += 1;
    const rng = P.mulberry32(state.config.seed + state.experimentNumber * 1009);
    state.answerKey = P.generateAnswerKey(n, state.config.answerPattern, state.config.customPattern, rng);
    state.questionSet = W.buildQuestionSet({ language: state.config.language, n, answerKey: state.answerKey, random: rng });
    state.answerKey = state.questionSet.map((question) => question.correctSide);
    state.answers = Array(n).fill(null);
    state.currentQuestion = 0;
    state.predictionSnapshot = {
      mean: Number($("#predictedMean").value),
      low: Number($("#predictedLow").value),
      high: Number($("#predictedHigh").value),
      levels: [...state.predictionLevels],
    };
    $(".personal-layout").hidden = true;
    $("#personalResult").hidden = true;
    $("#questionStage").hidden = false;
    setNavigationLocked(true);
    renderAnswerDots();
    renderQuestion();
    startTimer();
    $("#questionStage").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function renderQuestion() {
    const n = state.config.questionCount;
    const index = state.currentQuestion;
    const question = state.questionSet[index];
    $("#questionProgressText").textContent = `${index + 1} / ${n}`;
    $("#questionProgressBar").style.width = `${index / n * 100}%`;
    $("#questionNumber").textContent = `문항 ${index + 1} · ${question.languageName}`;
    $("#glyphCard").innerHTML = `<span class="language-chip">${escapeHtml(question.languageName)}</span><strong class="word-display" lang="${question.lang}" dir="${question.dir}">${escapeHtml(question.word)}</strong>${question.reading ? `<small class="word-reading">${escapeHtml(question.reading)}</small>` : ""}`;
    $("#glyphCard").setAttribute("aria-label", `문항 ${index + 1}, ${question.languageName} 단어 ${question.word}`);
    $("#leftChoiceLabel").textContent = question.options[0];
    $("#rightChoiceLabel").textContent = question.options[1];
  }

  function renderAnswerDots() {
    $("#answerDots").innerHTML = state.answers.map((answer, index) => `<i class="${answer === 0 || answer === 1 ? "done" : ""}" aria-label="${index + 1}번 ${answer === 0 || answer === 1 ? "응답 완료" : "미응답"}"></i>`).join("");
  }

  function chooseAnswer(choice) {
    if ($("#questionStage").hidden) return;
    state.answers[state.currentQuestion] = choice;
    renderAnswerDots();
    if (state.currentQuestion >= state.config.questionCount - 1) {
      setTimeout(() => finishExperiment(false), 120);
      return;
    }
    state.currentQuestion += 1;
    renderQuestion();
  }

  function startTimer() {
    clearInterval(state.timer);
    const limit = state.config.timeLimit;
    $("#timerChip").hidden = limit <= 0;
    if (!limit) return;
    state.remainingSeconds = limit;
    updateTimer();
    state.timer = setInterval(() => {
      state.remainingSeconds -= 1;
      updateTimer();
      if (state.remainingSeconds <= 0) finishExperiment(true);
    }, 1000);
  }

  function updateTimer() {
    const minutes = Math.floor(state.remainingSeconds / 60);
    const seconds = state.remainingSeconds % 60;
    $("#timerText").textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    $("#timerChip").classList.toggle("warning", state.remainingSeconds <= 10);
  }

  function finishExperiment(timedOut) {
    if ($("#questionStage").hidden) return;
    clearInterval(state.timer);
    setNavigationLocked(false);
    $("#questionStage").hidden = true;
    const result = P.scoreAnswers(state.answers, state.answerKey);
    renderPersonalResult(result, timedOut);
    $("#personalResult").hidden = false;
    $("#personalResult").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function describeRarity(score, n, lower, upper, answered, timedOut) {
    if (timedOut && answered < n) return `시간이 끝나 ${answered}문항에 응답했습니다. 미응답은 오답으로 처리했으므로 B(${n}, 0.5)와의 직접 비교에는 주의가 필요합니다.`;
    const mean = n / 2;
    const tail = score >= mean ? upper : lower;
    const direction = score >= mean ? "이상" : "이하";
    if (tail < 0.01) return `${score}점 ${direction}이 나올 확률은 ${formatPercent(tail)}입니다. 가정 아래에서 드물지만, 이 결과만으로 원인을 판정할 수는 없습니다.`;
    if (tail < 0.1) return `${score}점 ${direction}은 비교적 드문 쪽에 있습니다(${formatPercent(tail)}). 여러 번 반복하면 가끔 관찰될 수 있습니다.`;
    return `${score}점 ${direction}이 나올 누적확률은 ${formatPercent(tail)}입니다. 한 번의 점수보다 전체 분포와 가정을 함께 보세요.`;
  }

  function renderPersonalResult(result, timedOut) {
    const n = state.config.questionCount;
    const probabilities = P.binomialPMF(n, 0.5);
    const summary = P.binomialSummary(n, 0.5);
    const below = P.cumulativeAtMost(probabilities, result.score);
    const above = P.cumulativeAtLeast(probabilities, result.score);
    $("#personalScore").textContent = result.score;
    $("#personalScoreTotal").textContent = ` / ${n}점`;
    $("#personalExpected").textContent = formatNumber(summary.mean);
    $("#personalSd").textContent = formatNumber(summary.standardDeviation);
    $("#personalBelow").textContent = formatPercent(below);
    $("#personalAbove").textContent = formatPercent(above);
    $("#raritySentence").textContent = describeRarity(result.score, n, below, above, result.answered, timedOut);
    $("#predictionRecall").innerHTML = `<strong>실험 전 예상</strong> · 평균 ${state.predictionSnapshot.mean}점 · 대부분 ${state.predictionSnapshot.low}~${state.predictionSnapshot.high}점으로 예상했습니다. 실제 이론의 중심 ${formatNumber(summary.mean)}점, 표준편차 ${formatNumber(summary.standardDeviation)}점과 비교해 보세요.`;
    renderDistributionChart($("#personalTheoryChart"), probabilities, null, { highlight: result.score, label: "정확한 이항확률" });
    const leftCount = state.answers.filter((answer) => answer === 0).length;
    const rightCount = state.answers.filter((answer) => answer === 1).length;
    let switches = 0;
    for (let i = 1; i < state.answers.length; i += 1) if (state.answers[i] !== null && state.answers[i - 1] !== null && state.answers[i] !== state.answers[i - 1]) switches += 1;
    $("#patternSummary").innerHTML = `<div><span>왼쪽 · 오른쪽</span><strong>${leftCount} · ${rightCount}</strong></div><div><span>선택 전환</span><strong>${switches}회</strong></div>`;
    $("#choicePattern").innerHTML = state.answers.map((answer, index) => {
      const label = answer === 0 ? "L" : answer === 1 ? "R" : "—";
      const sideClass = answer === 1 ? "right" : "";
      const correctClass = result.correctness[index] ? "correct" : "";
      return `<span class="${sideClass} ${correctClass}" title="${index + 1}번: ${answer === null ? "미응답" : answer === 0 ? "왼쪽" : "오른쪽"}, ${result.correctness[index] ? "정답" : "오답"}">${label}</span>`;
    }).join("");
    const languageMeta = W.LANGUAGE_META[state.config.language];
    $("#patternSummary").insertAdjacentHTML("beforeend", `<div class="language-summary"><span>단어 언어</span><strong>${escapeHtml(languageMeta.name)}</strong></div>`);
    $("#wordReview").innerHTML = state.questionSet.map((question, index) => {
      const answer = state.answers[index];
      const correct = result.correctness[index];
      const chosenMeaning = answer === 0 || answer === 1 ? question.options[answer] : "미응답";
      return `<article class="${correct ? "correct" : "incorrect"}">
        <span>${index + 1}</span>
        <strong lang="${question.lang}" dir="${question.dir}">${escapeHtml(question.word)}</strong>
        <small>${escapeHtml(question.languageName)}${question.reading ? ` · ${escapeHtml(question.reading)}` : ""}</small>
        <p>정답 <b>${escapeHtml(question.meaning)}</b></p>
        <p>나의 선택 ${escapeHtml(chosenMeaning)}</p>
      </article>`;
    }).join("");
    updateCountOption($("#simulationN"), n);
    refreshSimulationTheory();
  }

  function resetPersonal() {
    clearInterval(state.timer);
    state.answers = [];
    state.answerKey = [];
    state.questionSet = [];
    state.currentQuestion = 0;
    setNavigationLocked(false);
    $("#questionStage").hidden = true;
    $("#personalResult").hidden = true;
    $(".personal-layout").hidden = false;
    $(".personal-layout").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function wrapChart(container) {
    const inner = document.createElement("div");
    inner.className = "bar-chart-inner";
    container.replaceChildren(inner);
    return inner;
  }

  function setNavigationLocked(locked) {
    $$('[data-view-button]').forEach((button) => {
      if (button.dataset.viewButton === "personal") return;
      button.disabled = locked;
      button.title = locked ? "개인 실험을 제출하거나 나간 뒤 이동할 수 있습니다." : "";
    });
  }

  function renderDistributionChart(container, theoretical, observed, options = {}) {
    const inner = wrapChart(container);
    const observedRates = observed ? observed.map((count) => count / Math.max(1, observed.reduce((sum, value) => sum + value, 0))) : Array(theoretical.length).fill(0);
    const maxValue = Math.max(...theoretical, ...observedRates, 0.000001);
    inner.style.setProperty("--columns", theoretical.length);
    inner.style.gridTemplateColumns = `repeat(${theoretical.length}, minmax(17px, 1fr))`;
    inner.innerHTML = theoretical.map((probability, score) => {
      const theoryHeight = probability / maxValue * 100;
      const observedHeight = observedRates[score] / maxValue * 100;
      const showLabel = theoretical.length <= 31 || score % 5 === 0 || score === theoretical.length - 1;
      const highlight = score === options.highlight ? "observed-score" : "";
      const title = `${score}점: 이론 ${formatPercent(probability)}${observed ? `, 실험 ${formatPercent(observedRates[score])}` : ""}`;
      return `<div class="bar-group ${highlight}" style="--theory:${theoryHeight}%;--observed:${observedHeight}%" title="${title}"><i class="theory-bar"></i>${observed ? '<i class="observed-bar"></i>' : ""}${score === options.highlight ? `<strong>${score}점</strong>` : ""}<span>${showLabel ? score : ""}</span></div>`;
    }).join("");
    container.setAttribute("aria-label", options.label || "이항분포 막대그래프");
  }

  function refreshSimulationTheory() {
    const n = Number($("#simulationN").value);
    const probabilities = P.binomialPMF(n, 0.5);
    state.simulationCounts = null;
    state.simulationRepetitions = 0;
    renderDistributionChart($("#simulationChart"), probabilities, null, { label: `B(${n}, 0.5)의 정확한 확률분포` });
    $("#simulationStats").innerHTML = '<div><span>반복 횟수</span><strong>0회</strong></div><div><span>실험 평균</span><strong>—</strong></div><div><span>실험 표준편차</span><strong>—</strong></div><div><span>이론과의 총 차이</span><strong>—</strong></div>';
    $("#simulationCaption").textContent = "반복 횟수를 골라 실험해 보세요. 1회에서는 한 막대만, 10,000회에서는 전체 윤곽이 보입니다.";
    renderProbabilityTable(n, probabilities);
  }

  function renderProbabilityTable(n, probabilities) {
    $("#probabilityTableBody").innerHTML = probabilities.map((probability, score) => `<tr><td>${score}</td><td>${(probability * 100).toFixed(8)}%</td><td>${(P.cumulativeAtMost(probabilities, score) * 100).toFixed(8)}%</td><td>${(P.cumulativeAtLeast(probabilities, score) * 100).toFixed(8)}%</td></tr>`).join("");
  }

  function runSimulation(repetitions, button) {
    const n = Number($("#simulationN").value);
    const seed = Math.max(1, Number($("#simulationSeed").value) || 2026);
    const probabilities = P.binomialPMF(n, 0.5);
    const counts = P.simulateBinomial(n, 0.5, repetitions, P.mulberry32(seed));
    const summary = P.summarizeValues(P.countsToValues(counts));
    const difference = P.totalVariation(counts, probabilities);
    state.simulationCounts = counts;
    state.simulationRepetitions = repetitions;
    $$('[data-simulations]').forEach((item) => item.classList.toggle("active", item === button));
    $("#simulationStats").innerHTML = `<div><span>반복 횟수</span><strong>${repetitions.toLocaleString("ko-KR")}회</strong></div><div><span>실험 평균</span><strong>${formatNumber(summary.mean)}</strong></div><div><span>실험 표준편차</span><strong>${formatNumber(summary.standardDeviation)}</strong></div><div><span>이론과의 총 차이</span><strong>${formatPercent(difference)}</strong></div>`;
    renderDistributionChart($("#simulationChart"), probabilities, counts, { label: `B(${n}, 0.5)와 ${repetitions}회 모의실험 비교` });
    $("#simulationCaption").textContent = repetitions === 1 ? `한 번의 실험에서는 ${counts.findIndex((count) => count)}점 하나만 관찰됩니다. 이것만으로 분포의 모양을 판단할 수 없습니다.` : `${repetitions.toLocaleString("ko-KR")}회 결과의 평균은 ${formatNumber(summary.mean)}점입니다. 반복 횟수를 바꾸며 채운 막대가 이론 윤곽에 가까워지는지 비교하세요.`;
  }

  function updateClassFeedback() {
    const n = Number($("#classQuestionCount").value);
    const parsed = P.parseScores($("#classScores").value, n);
    $("#classInputFeedback").textContent = `${parsed.accepted.length}명의 유효한 점수${parsed.rejected.length ? ` · 제외 ${parsed.rejected.length}개 (${parsed.rejected.slice(0, 4).join(", ")})` : ""}`;
    return parsed;
  }

  function analyzeClass() {
    const n = Number($("#classQuestionCount").value);
    const parsed = updateClassFeedback();
    if (!parsed.accepted.length) {
      toast("분석할 유효 점수를 입력해 주세요.");
      $("#classScores").focus();
      return;
    }
    const probabilities = P.binomialPMF(n, 0.5);
    const counts = Array(n + 1).fill(0);
    parsed.accepted.forEach((score) => { counts[score] += 1; });
    const observed = P.summarizeValues(parsed.accepted);
    const theory = P.binomialSummary(n, 0.5);
    const difference = P.totalVariation(counts, probabilities);
    $("#classStats").innerHTML = `<div><span>학생 수</span><strong>${observed.count}명</strong></div><div><span>학급 평균</span><strong>${formatNumber(observed.mean)}</strong></div><div><span>학급 표준편차(모집단)</span><strong>${formatNumber(observed.standardDeviation)}</strong></div><div><span>이론과의 총 차이</span><strong>${formatPercent(difference)}</strong></div>`;
    renderDistributionChart($("#classChart"), probabilities, counts, { label: `${observed.count}명 학급 점수와 B(${n}, 0.5) 비교` });
    const meanGap = observed.mean - theory.mean;
    const sdGap = observed.standardDeviation - theory.standardDeviation;
    $("#classInterpretation").textContent = `학급 평균은 이론 기댓값보다 ${Math.abs(meanGap).toFixed(2)}점 ${meanGap >= 0 ? "높고" : "낮고"}, 퍼짐은 이론 표준편차보다 ${Math.abs(sdGap).toFixed(2)}점 ${sdGap >= 0 ? "큽니다" : "작습니다"}. 차이의 원인을 판단하기 전에 ${observed.count}명이라는 표본 크기와 실험 가정을 함께 확인하세요.`;
    $("#classResult").hidden = false;
    $("#classResult").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateExtensionLabels() {
    const n = Number($("#extensionN").value);
    const p = Number($("#extensionP").value);
    const left = Number($("#leftBias").value) / 100;
    const dependence = Number($("#dependence").value) / 100;
    const summary = P.binomialSummary(n, p);
    $("#extensionNOutput").textContent = n;
    $("#extensionPOutput").textContent = p.toFixed(2);
    $("#leftBiasOutput").textContent = `${Math.round(left * 100)}%`;
    $("#dependenceOutput").textContent = `${Math.round(dependence * 100)}%`;
    $("#extensionExpected").textContent = formatNumber(summary.mean);
    $("#extensionExpectedSd").textContent = formatNumber(summary.standardDeviation);
    let headline = `설정: p=${p.toFixed(2)}, 의존 ${Math.round(dependence * 100)}%`;
    let explanation = "맞힐 확률 p가 바뀌면 중심이 n×p로 이동합니다.";
    if (dependence > 0) explanation += " 앞 결과를 이어 가는 경향 때문에 독립 이항분포보다 양끝이 두꺼워질 수 있습니다.";
    if (Math.abs(left - 0.5) > 0.001) explanation += " 좌우 선택 편향은 관찰되지만, 그것만으로 정답 확률이 달라진다고 볼 수는 없습니다.";
    if (p === 0.5 && dependence === 0 && left === 0.5) {
      headline = `기본 가정: X ~ B(${n}, 0.5)`;
      explanation = "각 문항을 맞힐 확률이 같고 결과가 서로 독립일 때 이항분포를 사용할 수 있습니다.";
    }
    $("#assumptionHeadline").textContent = headline;
    $("#assumptionExplanation").textContent = explanation;
    renderDistributionChart($("#extensionChart"), P.binomialPMF(n, 0.5), null, { label: `기본 B(${n}, 0.5) 분포` });
    $("#extensionLeftRate").textContent = "—";
    $("#extensionRepeatRate").textContent = "—";
  }

  function runExtension() {
    const n = Number($("#extensionN").value);
    const p = Number($("#extensionP").value);
    const leftBias = Number($("#leftBias").value) / 100;
    const dependence = Number($("#dependence").value) / 100;
    const result = P.simulateAssumptions({ n, p, leftBias, dependence, repetitions: 10000, random: P.mulberry32(80731 + n * 13 + Math.round(p * 1000) + Math.round(leftBias * 100) + Math.round(dependence * 100)) });
    $("#extensionLeftRate").textContent = formatPercent(result.leftRate);
    $("#extensionRepeatRate").textContent = formatPercent(result.adjacentSameRate);
    renderDistributionChart($("#extensionChart"), P.binomialPMF(n, 0.5), result.scoreCounts, { label: `기본 B(${n}, 0.5)와 가정을 바꾼 10,000회 결과 비교` });
    toast("확장 실험 10,000회를 완료했어요.");
  }

  function resetExtension() {
    $("#extensionN").value = 30;
    $("#extensionP").value = 0.5;
    $("#leftBias").value = 50;
    $("#dependence").value = 0;
    updateExtensionLabels();
  }

  function readTeacherForm() {
    return P.sanitizePreset({
      name: $("#presetName").value,
      questionCount: $("#teacherQuestionCount").value,
      language: $("#teacherLanguage").value,
      answerPattern: $("#teacherAnswerPattern").value,
      customPattern: $("#teacherCustomPattern").value,
      timeLimit: $("#teacherTimeLimit").value,
      seed: $("#teacherSeed").value,
    });
  }

  function fillTeacherForm(config) {
    const preset = P.sanitizePreset(config);
    $("#teacherQuestionCount").value = preset.questionCount;
    $("#teacherLanguage").value = preset.language;
    $("#teacherAnswerPattern").value = preset.answerPattern;
    $("#teacherCustomPattern").value = preset.customPattern;
    updateCountOption($("#teacherTimeLimit"), preset.timeLimit, "초");
    $("#teacherSeed").value = preset.seed;
    $("#customPatternLabel").hidden = preset.answerPattern !== "custom";
  }

  function applyTeacherSettings(event) {
    if (event) event.preventDefault();
    state.config = readTeacherForm();
    syncQuestionCounts(state.config.questionCount);
    $("#languageSelect").value = state.config.language;
    renderLanguagePreview();
    resetPersonal();
    toast(`${W.LANGUAGE_META[state.config.language].name} ${state.config.questionCount}문항 설정을 적용했어요.`);
  }

  function readPresets() {
    try {
      const parsed = JSON.parse(localStorage.getItem(PRESET_KEY) || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed.map(P.sanitizePreset);
    } catch (error) {
      return [];
    }
  }

  function writePresets(presets) {
    try {
      localStorage.setItem(PRESET_KEY, JSON.stringify(presets.map(P.sanitizePreset)));
      return true;
    } catch (error) {
      toast("브라우저 저장소를 사용할 수 없습니다.");
      return false;
    }
  }

  function refreshPresetSelect(selectedName = "") {
    const presets = readPresets();
    $("#presetSelect").innerHTML = presets.length ? `<option value="">프리셋 선택</option>${presets.map((preset, index) => `<option value="${index}">${escapeHtml(preset.name)}</option>`).join("")}` : '<option value="">저장된 프리셋 없음</option>';
    if (selectedName) {
      const index = presets.findIndex((preset) => preset.name === selectedName);
      if (index >= 0) $("#presetSelect").value = String(index);
    }
  }

  function savePreset() {
    const preset = readTeacherForm();
    preset.name = String($("#presetName").value || "").trim().slice(0, 40) || `수업 ${new Date().toLocaleDateString("ko-KR")}`;
    const presets = readPresets();
    const existing = presets.findIndex((item) => item.name === preset.name);
    if (existing >= 0) presets[existing] = preset;
    else presets.push(preset);
    if (writePresets(presets)) {
      refreshPresetSelect(preset.name);
      toast(existing >= 0 ? "같은 이름의 프리셋을 업데이트했어요." : "프리셋을 이 브라우저에 저장했어요.");
    }
  }

  function selectedPreset() {
    const index = Number($("#presetSelect").value);
    const presets = readPresets();
    return Number.isInteger(index) && index >= 0 ? presets[index] : null;
  }

  function loadPreset() {
    const preset = selectedPreset();
    if (!preset) return toast("불러올 프리셋을 선택해 주세요.");
    fillTeacherForm(preset);
    $("#presetName").value = preset.name;
    state.config = preset;
    syncQuestionCounts(preset.questionCount);
    $("#languageSelect").value = preset.language;
    renderLanguagePreview();
    resetPersonal();
    toast(`‘${preset.name}’ 설정을 불러왔어요.`);
  }

  function deletePreset() {
    const index = Number($("#presetSelect").value);
    const presets = readPresets();
    if (!Number.isInteger(index) || index < 0 || !presets[index]) return toast("삭제할 프리셋을 선택해 주세요.");
    const removed = presets.splice(index, 1)[0];
    if (writePresets(presets)) {
      refreshPresetSelect();
      toast(`‘${removed.name}’ 프리셋을 삭제했어요.`);
    }
  }

  function openHelp() {
    const dialog = $("#helpDialog");
    if (typeof dialog.showModal === "function") dialog.showModal();
  }

  function setupEvents() {
    $$('[data-view-button]').forEach((button) => button.addEventListener("click", () => setView(button.dataset.viewButton)));
    $$('[data-go-view]').forEach((button) => button.addEventListener("click", () => setView(button.dataset.goView)));
    $("#questionCountSelect").addEventListener("change", updatePredictionBounds);
    $("#languageSelect").addEventListener("change", renderLanguagePreview);
    $("#startExperimentButton").addEventListener("click", startExperiment);
    $("#leftChoiceButton").addEventListener("click", () => chooseAnswer(0));
    $("#rightChoiceButton").addEventListener("click", () => chooseAnswer(1));
    $("#cancelExperimentButton").addEventListener("click", resetPersonal);
    $("#restartExperimentButton").addEventListener("click", resetPersonal);
    $("#simulationN").addEventListener("change", refreshSimulationTheory);
    $$('[data-simulations]').forEach((button) => button.addEventListener("click", () => runSimulation(Number(button.dataset.simulations), button)));
    $("#classScores").addEventListener("input", updateClassFeedback);
    $("#classQuestionCount").addEventListener("change", updateClassFeedback);
    $("#analyzeClassButton").addEventListener("click", analyzeClass);
    $("#sampleClassButton").addEventListener("click", () => {
      const n = Number($("#classQuestionCount").value);
      const sample = P.countsToValues(P.simulateBinomial(n, 0.5, 32, P.mulberry32(20260716)));
      $("#classScores").value = sample.join(", ");
      updateClassFeedback();
    });
    $("#csvFileInput").addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (!file) return;
      if (file.size > 1024 * 1024) return toast("1MB 이하의 점수 CSV를 사용해 주세요.");
      const reader = new FileReader();
      reader.onload = () => {
        $("#classScores").value = String(reader.result || "").replace(/^\uFEFF/, "");
        updateClassFeedback();
        toast("CSV 내용을 불러왔어요. 유효 점수를 확인해 주세요.");
      };
      reader.onerror = () => toast("CSV 파일을 읽지 못했습니다.");
      reader.readAsText(file, "UTF-8");
    });
    [$("#extensionN"), $("#extensionP"), $("#leftBias"), $("#dependence")].forEach((input) => input.addEventListener("input", updateExtensionLabels));
    $("#runExtensionButton").addEventListener("click", runExtension);
    $("#resetExtensionButton").addEventListener("click", resetExtension);
    $("#teacherAnswerPattern").addEventListener("change", () => { $("#customPatternLabel").hidden = $("#teacherAnswerPattern").value !== "custom"; });
    $("#teacherForm").addEventListener("submit", applyTeacherSettings);
    $("#savePresetButton").addEventListener("click", savePreset);
    $("#loadPresetButton").addEventListener("click", loadPreset);
    $("#deletePresetButton").addEventListener("click", deletePreset);
    $("#clearReflectionButton").addEventListener("click", () => { $$('.question-card textarea').forEach((textarea) => { textarea.value = ""; }); toast("탐구 기록을 지웠어요."); });
    $("#printReflectionButton").addEventListener("click", () => window.print());
    $("#printButton").addEventListener("click", () => window.print());
    $("#fullscreenButton").addEventListener("click", async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      } catch (error) {
        toast("이 브라우저에서는 전체화면을 열 수 없습니다.");
      }
    });
    document.addEventListener("fullscreenchange", () => { $("#fullscreenButton span:last-child").textContent = document.fullscreenElement ? "전체화면 종료" : "전체화면"; });
    $("#helpButton").addEventListener("click", openHelp);
    $("#closeHelpButton").addEventListener("click", () => $("#helpDialog").close());
    $("#dialogStartButton").addEventListener("click", () => $("#helpDialog").close());
    $("#helpDialog").addEventListener("click", (event) => { if (event.target === $("#helpDialog")) $("#helpDialog").close(); });
    window.addEventListener("keydown", (event) => {
      if ($("#questionStage").hidden || $("#helpDialog").open) return;
      if (["ArrowLeft", "1"].includes(event.key)) { event.preventDefault(); chooseAnswer(0); }
      if (["ArrowRight", "2"].includes(event.key)) { event.preventDefault(); chooseAnswer(1); }
    });
  }

  function init() {
    fillTeacherForm(state.config);
    syncQuestionCounts(state.config.questionCount);
    $("#languageSelect").value = state.config.language;
    renderLanguagePreview();
    renderPredictionDraw();
    refreshSimulationTheory();
    updateClassFeedback();
    updateExtensionLabels();
    refreshPresetSelect();
    setupEvents();
    setView("personal", false);
    if (new URLSearchParams(location.search).get("manual") === "1") openHelp();
  }

  init();
})();
