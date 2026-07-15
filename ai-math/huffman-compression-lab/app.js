(function () {
  "use strict";
  const H = window.Huffman;
  const $ = (id) => document.getElementById(id);
  const samples = {
    banana: "BANANA는 바나나🍌",
    school: "수학은 패턴을 찾고 그 까닭을 설명하는 공부입니다.",
    balanced: "A1!B2?C3#D4$",
    skewed: "AAAAAAAAAAAAABBBCCD"
  };
  const predictionTexts = ["ABCDABCDABCD", "AAAAAAAAABBC"];
  const state = { tree: null, metrics: null, step: 0, timer: null, decodeIndex: 0, decodeResult: null, gameQueue: [], gameSelected: [], gameScore: 0 };

  function setStatus(message, type) {
    const el = $("statusMessage");
    el.textContent = message;
    el.className = "status-message" + (type ? ` is-${type}` : "");
  }

  function displaySymbol(symbol) { return H.printable(symbol); }
  function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]); }
  function percent(value) { return `${(value * 100).toFixed(1)}%`; }
  function download(name, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove();
    URL.revokeObjectURL(url);
  }

  function analyze() {
    stopAuto();
    const text = $("textInput").value;
    if (!H.symbolsOf(text).length) {
      state.tree = null; state.metrics = null; renderEmpty(); setStatus("빈 입력은 분석할 수 없습니다. 문자 하나 이상을 입력해 주세요.", "error"); return;
    }
    state.tree = H.buildTree(text);
    state.metrics = H.metrics(text, state.tree);
    state.step = 0; state.decodeIndex = 0; state.decodeResult = null;
    $("encodedBits").value = H.encode(text, state.tree.codes);
    $("decodedText").textContent = "—";
    renderAll(); resetGame();
    setStatus(`${state.metrics.length}개 문자와 ${state.metrics.unique}개 고유 문자를 분석했습니다. 이제 트리를 한 단계씩 만들어 보세요.`);
  }

  function renderAll() { renderFrequency(); renderChart(); renderProcess(); renderTree(); renderMetrics(); updateControls(); }
  function renderEmpty() {
    $("frequencyBody").innerHTML = '<tr><td colspan="4" class="empty-cell">분석 결과가 여기에 표시됩니다.</td></tr>';
    $("barChart").innerHTML = '<p class="empty-copy">텍스트를 분석하면 막대가 나타납니다.</p>';
    $("queueView").innerHTML = '<span class="empty-copy">분석 후 노드 카드가 표시됩니다.</span>';
    $("treeView").innerHTML = '<p class="empty-copy">완성된 트리가 여기에 표시됩니다.</p>';
    $("encodedBits").value = ""; $("decodedText").textContent = "—";
    ["fixedBits","huffmanBits","savedBits","compressionRatio"].forEach((id) => $(id).textContent = "—");
    $("stepBadge").textContent = "0 / 0단계"; updateControls();
  }

  function renderFrequency() {
    const total = state.metrics.length;
    $("frequencyBody").innerHTML = state.tree.rows.map((row) => `<tr><td><span class="symbol-token" title="${escapeHtml(displaySymbol(row.symbol))}">${escapeHtml(displaySymbol(row.symbol))}</span></td><td>${row.count}</td><td>${(row.count / total).toFixed(3)}</td><td><code>${state.tree.codes[row.symbol]}</code> <small>(${state.tree.codes[row.symbol].length}비트)</small></td></tr>`).join("");
  }

  function renderChart() {
    const max = Math.max(...state.tree.rows.map((row) => row.count));
    $("barChart").innerHTML = state.tree.rows.map((row) => `<div class="bar-item" title="${escapeHtml(displaySymbol(row.symbol))}: ${row.count}회"><div class="bar-fill" style="height:${Math.max(3, row.count / max * 190)}px"></div><strong>${row.count}회</strong><span>${escapeHtml(displaySymbol(row.symbol))}</span></div>`).join("");
    $("barChart").setAttribute("aria-label", state.tree.rows.map((row) => `${displaySymbol(row.symbol)} ${row.count}회`).join(", "));
  }

  function cardHtml(node, classes) {
    const label = node.isLeaf ? displaySymbol(node.symbol) : `묶음 ${node.weight}`;
    const detail = node.isLeaf ? `${node.weight}회` : `${H.symbolsOf(node.signature.replace(/\u0000/g, "")).length}종 · ${node.weight}회`;
    return `<span class="node-card ${classes || ""}" data-node-id="${node.id}"><strong>${escapeHtml(label)}</strong><small>${detail}</small></span>`;
  }

  function renderProcess() {
    if (!state.tree) return;
    const total = state.tree.steps.length;
    $("stepBadge").textContent = `${state.step} / ${total}단계`;
    if (!total) {
      $("queueView").innerHTML = cardHtml({ id: state.tree.root.id, isLeaf: true, symbol: state.tree.root.symbol, weight: state.tree.root.weight });
      $("stepExplanation").textContent = "문자가 한 종류뿐이라 합칠 단계가 없습니다. 단일 문자는 0으로 부호화합니다.";
      return;
    }
    const snapshot = state.step === 0 ? state.tree.steps[0].before : state.tree.steps[state.step - 1].after;
    const completedStep = state.step ? state.tree.steps[state.step - 1] : null;
    $("queueView").innerHTML = snapshot.map((node) => cardHtml(node, completedStep && node.id === completedStep.created ? "is-created" : "")).join("");
    if (!state.step) $("stepExplanation").textContent = "빈도 오름차순으로 정렬했습니다. 왼쪽의 가장 작은 두 노드를 선택할 차례입니다.";
    else {
      const step = state.tree.steps[state.step - 1];
      const selected = step.before.filter((node) => step.selected.includes(node.id));
      $("stepExplanation").textContent = `${state.step}단계: ${selected.map((node) => `${node.isLeaf ? displaySymbol(node.symbol) : "묶음"}(${node.weight})`).join(" + ")} → 새 묶음(${selected[0].weight + selected[1].weight})을 만들고 다시 정렬했습니다.`;
    }
  }

  function treeNodeHtml(node, activeId) {
    if (!node) return "";
    const leaf = !node.left && !node.right;
    const label = leaf ? displaySymbol(node.symbol) : node.weight;
    const current = node.id === activeId ? " is-active" : "";
    let html = `<span class="tree-node${leaf ? " is-leaf" : ""}${current}" data-tree-node="${node.id}"><b>${escapeHtml(label)}</b><small>${leaf ? `${node.weight}회 · ${state.tree.codes[node.symbol]}` : `${node.weight}회`}</small></span>`;
    if (!leaf) html += `<ul><li><span class="edge-label">0</span>${treeNodeHtml(node.left, activeId)}</li><li><span class="edge-label">1</span>${treeNodeHtml(node.right, activeId)}</li></ul>`;
    return html;
  }

  function renderTree(activeId) {
    if (!state.tree || !state.tree.root) return;
    $("treeView").innerHTML = `<ul class="tree-root"><li>${treeNodeHtml(state.tree.root, activeId)}</li></ul>`;
  }

  function renderMetrics() {
    const m = state.metrics;
    $("fixedBits").textContent = `${m.fixedBits}비트`; $("fixedDetail").textContent = `문자당 ${m.fixedWidth}비트`;
    $("huffmanBits").textContent = `${m.huffmanBits}비트`; $("averageDetail").textContent = `평균 ${m.averageLength.toFixed(3)}비트`;
    $("savedBits").textContent = `${m.savedBits}비트`; $("savedDetail").textContent = `${percent(m.savingsRate)} 절감`;
    $("compressionRatio").textContent = percent(m.compressionRatio);
    $("entropyText").textContent = `문자 엔트로피 H = ${m.entropy.toFixed(3)}비트/문자, 평균 허프만 부호 길이 L = ${m.averageLength.toFixed(3)}비트/문자입니다. 접두어 부호에서는 H ≤ L < H + 1 관계가 성립합니다. 엔트로피는 평균적으로 필요한 정보량의 이론적 아래 경계이고, 허프만 부호 길이는 정수 비트 길이여야 하므로 보통 조금 더 큽니다.`;
  }

  function updateControls() {
    const has = Boolean(state.tree); const total = has ? state.tree.steps.length : 0;
    $("previousStepButton").disabled = !has || state.step <= 0;
    $("nextStepButton").disabled = !has || state.step >= total;
    $("autoPlayButton").disabled = !has || !total || state.step >= total;
    $("resetStepsButton").disabled = !has || state.step === 0;
    $("decodeButton").disabled = !has; $("decodeStepButton").disabled = !has;
  }

  function stopAuto() { if (state.timer) window.clearInterval(state.timer); state.timer = null; $("autoPlayButton").textContent = "자동 재생"; }
  function nextStep() {
    if (!state.tree || state.step >= state.tree.steps.length) return;
    state.step += 1; renderProcess(); updateControls();
    if (state.step >= state.tree.steps.length) { stopAuto(); setStatus("허프만 트리가 완성되었습니다. 0/1 경로와 코드표를 확인해 보세요."); }
  }

  function decodeAll() {
    if (!state.tree) return;
    try {
      state.decodeResult = H.decode($("encodedBits").value, state.tree.root);
      state.decodeIndex = state.decodeResult.trace.length;
      $("decodedText").textContent = state.decodeResult.text || "(빈 문자열)";
      $("decodeTrace").textContent = `${state.decodeResult.trace.length}비트를 오류 없이 따라 원문을 복원했습니다.`;
      renderTree(); setStatus("디코딩에 성공했습니다. 인코딩한 문장과 복원 문장을 비교해 보세요.");
    } catch (error) { $("decodedText").textContent = "복원 실패"; $("decodeTrace").textContent = error.message; setStatus(error.message, "error"); }
  }

  function decodeStep() {
    if (!state.tree) return;
    try {
      const result = H.decode($("encodedBits").value, state.tree.root);
      if (!result.trace.length) { $("decodeTrace").textContent = "따라갈 비트가 없습니다."; return; }
      if (!state.decodeResult || state.decodeIndex >= result.trace.length) { state.decodeResult = result; state.decodeIndex = 0; $("decodedText").textContent = ""; }
      const item = result.trace[state.decodeIndex]; state.decodeIndex += 1;
      const completed = result.trace.slice(0, state.decodeIndex).filter((trace) => trace.symbol !== null && trace.symbol !== undefined).map((trace) => trace.symbol).join("");
      $("decodedText").textContent = completed || "(아직 문자 경로 중)";
      $("decodeTrace").textContent = `${item.index + 1}번째 비트 ${item.bit} → ${item.symbol !== null && item.symbol !== undefined ? `${displaySymbol(item.symbol)} 완성` : "중간 노드"}`;
      renderTree(item.nodeId);
    } catch (error) { $("decodeTrace").textContent = error.message; setStatus(error.message, "error"); }
  }

  function resetGame() {
    state.gameSelected = []; state.gameScore = 0;
    state.gameQueue = state.tree ? state.tree.allNodes.filter((node) => !node.left && !node.right).slice().sort(H.nodeComparator) : [];
    renderGame();
    $("gameFeedback").textContent = state.tree ? "가장 작은 두 카드를 선택해 첫 합치기를 시작하세요." : "분석을 마치면 미션이 시작됩니다.";
    $("gameFeedback").className = "feedback";
  }

  function renderGame() {
    $("gameScore").textContent = `${state.gameScore}회 성공`;
    if (!state.gameQueue.length) { $("gameQueue").innerHTML = '<span class="empty-copy">분석을 마치면 카드가 나타납니다.</span>'; return; }
    $("gameQueue").innerHTML = state.gameQueue.map((node) => `<button type="button" class="node-card ${state.gameSelected.includes(node.id) ? "is-selected" : ""}" data-game-id="${node.id}" aria-pressed="${state.gameSelected.includes(node.id)}"><strong>${escapeHtml(node.left ? `묶음 ${node.weight}` : displaySymbol(node.symbol))}</strong><small>${node.weight}회</small></button>`).join("");
  }

  function gameMerge() {
    if (state.gameQueue.length <= 1) { $("gameFeedback").textContent = "미션을 완성했습니다! 모든 문자가 하나의 트리로 연결되었습니다."; $("gameFeedback").className = "feedback is-good"; return; }
    if (state.gameSelected.length !== 2) { $("gameFeedback").textContent = "카드 두 개를 선택해 주세요."; $("gameFeedback").className = "feedback is-bad"; return; }
    const expected = state.gameQueue.slice().sort(H.nodeComparator).slice(0, 2).map((node) => node.id);
    if (!state.gameSelected.every((id) => expected.includes(id))) {
      $("gameFeedback").textContent = "다시 생각해 보세요. 그리디 전략은 지금 이 순간 빈도가 가장 작은 두 묶음을 선택합니다. 동률이면 문자 유니코드 순서를 따릅니다."; $("gameFeedback").className = "feedback is-bad"; return;
    }
    const chosen = state.gameQueue.filter((node) => state.gameSelected.includes(node.id)).sort(H.nodeComparator);
    const id = Math.max(...state.tree.allNodes.map((node) => node.id), ...state.gameQueue.map((node) => node.id)) + state.gameScore + 1;
    const parent = { id, symbol: null, weight: chosen[0].weight + chosen[1].weight, signature: [chosen[0].signature, chosen[1].signature].sort(H.compareText).join("\u0000"), left: chosen[0], right: chosen[1] };
    state.gameQueue = state.gameQueue.filter((node) => !state.gameSelected.includes(node.id)); state.gameQueue.push(parent); state.gameQueue.sort(H.nodeComparator);
    state.gameSelected = []; state.gameScore += 1; renderGame();
    $("gameFeedback").textContent = state.gameQueue.length === 1 ? "미션 완성! 매 단계의 올바른 선택으로 트리를 만들었습니다." : "정답입니다. 새 묶음을 큐에 넣고 다시 가장 작은 두 개를 찾아보세요.";
    $("gameFeedback").className = "feedback is-good";
  }

  function renderPredictions() {
    $("predictionOptions").innerHTML = predictionTexts.map((text, index) => `<button type="button" class="prediction-choice" data-prediction="${index}"><b>문장 ${index + 1}</b><span>${text}</span></button>`).join("");
  }

  function verifyPrediction(index) {
    const values = predictionTexts.map((text) => H.metrics(text, H.buildTree(text)));
    const winner = values[0].savingsRate > values[1].savingsRate ? 0 : 1;
    $("predictionResult").textContent = `문장 1은 ${percent(values[0].savingsRate)}, 문장 2는 ${percent(values[1].savingsRate)} 절감됩니다. ${index === winner ? "예측 성공!" : "예측과 달랐네요."} 빈도가 한쪽으로 치우칠수록 짧은 코드를 자주 사용할 수 있습니다.`;
    $("predictionResult").className = `feedback ${index === winner ? "is-good" : "is-bad"}`;
  }

  function setupEvents() {
    $("openGuideButton").addEventListener("click", () => $("guideDialog").showModal());
    $("closeGuideButton").addEventListener("click", () => $("guideDialog").close());
    $("startGuideActivityButton").addEventListener("click", () => { $("guideDialog").close(); $("textInput").focus(); });
    $("guideDialog").addEventListener("click", (event) => { if (event.target === $("guideDialog")) $("guideDialog").close(); });
    $("textInput").addEventListener("input", () => $("inputCount").textContent = `${H.symbolsOf($("textInput").value).length}문자`);
    $("loadSampleButton").addEventListener("click", () => { $("textInput").value = samples[$("sampleSelect").value]; $("textInput").dispatchEvent(new Event("input")); analyze(); });
    $("analyzeButton").addEventListener("click", analyze);
    $("clearButton").addEventListener("click", () => { $("textInput").value = ""; $("textInput").dispatchEvent(new Event("input")); state.tree = null; state.metrics = null; renderEmpty(); resetGame(); setStatus("입력과 결과를 비웠습니다."); });
    $("previousStepButton").addEventListener("click", () => { stopAuto(); if (state.step) state.step -= 1; renderProcess(); updateControls(); });
    $("nextStepButton").addEventListener("click", nextStep);
    $("resetStepsButton").addEventListener("click", () => { stopAuto(); state.step = 0; renderProcess(); updateControls(); });
    $("autoPlayButton").addEventListener("click", () => { if (state.timer) { stopAuto(); return; } $("autoPlayButton").textContent = "일시정지"; state.timer = window.setInterval(nextStep, 900); });
    $("decodeButton").addEventListener("click", decodeAll); $("decodeStepButton").addEventListener("click", decodeStep);
    $("decodeResetButton").addEventListener("click", () => { state.decodeIndex = 0; state.decodeResult = null; $("decodedText").textContent = "—"; $("decodeTrace").textContent = "비트열을 따라가면 방문한 노드가 트리에서 강조됩니다."; renderTree(); });
    $("copyBitsButton").addEventListener("click", async () => { try { await navigator.clipboard.writeText($("encodedBits").value); setStatus("비트열을 클립보드에 복사했습니다."); } catch (_) { $("encodedBits").select(); setStatus("비트열을 선택했습니다. Ctrl+C로 복사해 주세요.", "warning"); } });
    $("gameQueue").addEventListener("click", (event) => { const button = event.target.closest("[data-game-id]"); if (!button) return; const id = Number(button.dataset.gameId); if (state.gameSelected.includes(id)) state.gameSelected = state.gameSelected.filter((item) => item !== id); else if (state.gameSelected.length < 2) state.gameSelected.push(id); renderGame(); });
    $("mergeGameButton").addEventListener("click", gameMerge); $("resetGameButton").addEventListener("click", resetGame);
    $("predictionOptions").addEventListener("click", (event) => { const button = event.target.closest("[data-prediction]"); if (button) verifyPrediction(Number(button.dataset.prediction)); });
    $("studentNotes").addEventListener("input", () => localStorage.setItem("huffman-lab-notes", $("studentNotes").value));
    $("saveJsonButton").addEventListener("click", () => download("huffman-lab-settings.json", JSON.stringify({ version: 1, text: $("textInput").value, notes: $("studentNotes").value }, null, 2), "application/json;charset=utf-8"));
    $("loadJsonInput").addEventListener("change", async (event) => { const file = event.target.files[0]; if (!file) return; try { const data = JSON.parse(await file.text()); if (typeof data.text !== "string") throw new Error("text 항목이 없습니다."); $("textInput").value = data.text; $("studentNotes").value = typeof data.notes === "string" ? data.notes : ""; $("textInput").dispatchEvent(new Event("input")); analyze(); } catch (error) { setStatus(`JSON을 불러오지 못했습니다: ${error.message}`, "error"); } event.target.value = ""; });
    $("exportCsvButton").addEventListener("click", () => { if (!state.tree) return setStatus("먼저 텍스트를 분석해 주세요.", "warning"); const lines = ["문자,유니코드,출현횟수,상대도수,허프만코드,코드길이", ...state.tree.rows.map((row) => [JSON.stringify(displaySymbol(row.symbol)), `U+${row.symbol.codePointAt(0).toString(16).toUpperCase()}`, row.count, (row.count / state.metrics.length).toFixed(6), state.tree.codes[row.symbol], state.tree.codes[row.symbol].length].join(",")), "", `고정길이비트,${state.metrics.fixedBits}`, `허프만비트,${state.metrics.huffmanBits}`, `절감률,${percent(state.metrics.savingsRate)}`]; download("huffman-experiment.csv", "\ufeff" + lines.join("\r\n"), "text/csv;charset=utf-8"); });
    $("exportNotesButton").addEventListener("click", () => { const summary = state.metrics ? `고정 길이 ${state.metrics.fixedBits}비트 / 허프만 ${state.metrics.huffmanBits}비트 / 절감률 ${percent(state.metrics.savingsRate)}` : "아직 분석하지 않음"; download("huffman-experiment-notes.txt", `허프만 부호·파일 압축 실험 기록\n\n입력 문장\n${$("textInput").value}\n\n결과\n${summary}\n\n나의 기록\n${$("studentNotes").value}`, "text/plain;charset=utf-8"); });
  }

  function setGithubLink() {
    const manual = ""; let url = manual;
    if (!url && location.hostname.endsWith("github.io")) { const parts = location.pathname.split("/").filter(Boolean); url = `https://github.com/${location.hostname.split(".")[0]}/${parts[0] || ""}`; }
    document.querySelectorAll("[data-github-link]").forEach((link) => { if (url) link.href = url; else link.hidden = true; });
  }

  setupEvents(); setGithubLink(); renderPredictions();
  $("studentNotes").value = localStorage.getItem("huffman-lab-notes") || "";
  $("textInput").value = samples.banana; $("textInput").dispatchEvent(new Event("input")); analyze();
})();
