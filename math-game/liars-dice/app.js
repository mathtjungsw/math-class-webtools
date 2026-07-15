(() => {
  "use strict";

  const logic = window.LiarsDiceLogic;
  const STORAGE_KEY = "math-webtools-liars-dice-v1";
  const TUTORIAL_KEY = "math-webtools-liars-dice-tutorial";
  const COLORS = ["#dd653f", "#3f78ac", "#42ad92", "#8665a6", "#c7852e", "#4d8791"];
  const DIE_GLYPHS = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

  const $ = (selector) => document.querySelector(selector);
  const elements = {
    setupPanel: $("#setupPanel"), gamePanel: $("#gamePanel"), startButton: $("#startButton"), resumeButton: $("#resumeButton"),
    soloSettings: $("#soloSettings"), passSettings: $("#passSettings"), soloName: $("#soloName"), aiCount: $("#aiCount"),
    aiDifficulty: $("#aiDifficulty"), passCount: $("#passCount"), passNameFields: $("#passNameFields"), playerSettingHint: $("#playerSettingHint"),
    rulePreview: $("#rulePreview"), tutorialButton: $("#tutorialButton"), rulesButton: $("#rulesButton"), newGameButton: $("#newGameButton"),
    tutorialDialog: $("#tutorialDialog"), tutorialDoneButton: $("#tutorialDoneButton"), rulesDialog: $("#rulesDialog"),
    roundNumber: $("#roundNumber"), ruleBadge: $("#ruleBadge"), turnAnnouncement: $("#turnAnnouncement"), playerStrip: $("#playerStrip"),
    viewerName: $("#viewerName"), ownDice: $("#ownDice"), currentBidDisplay: $("#currentBidDisplay"), bidderLabel: $("#bidderLabel"), bidTrail: $("#bidTrail"),
    actionPanel: $("#actionPanel"), actionTitle: $("#actionTitle"), legalBidHint: $("#legalBidHint"), bidQuantity: $("#bidQuantity"), quantityDown: $("#quantityDown"),
    quantityUp: $("#quantityUp"), faceButtons: $("#faceButtons"), bidButton: $("#bidButton"), challengeButton: $("#challengeButton"), actionFeedback: $("#actionFeedback"),
    undoButton: $("#undoButton"), analysisToggle: $("#analysisToggle"), analysisColumn: $("#analysisColumn"), probabilityValue: $("#probabilityValue"),
    probabilityVerdict: $("#probabilityVerdict"), probabilityMeter: $("#probabilityMeter"), probabilityFill: $("#probabilityFill"), probabilityCopy: $("#probabilityCopy"),
    formulaExplanation: $("#formulaExplanation"), distributionChart: $("#distributionChart"), compareCard: $("#compareCard"), compareSymbol: $("#compareSymbol"),
    predictedValue: $("#predictedValue"), actualValue: $("#actualValue"), compareCopy: $("#compareCopy"), roundLog: $("#roundLog"), logCount: $("#logCount"),
    privacyScreen: $("#privacyScreen"), privacyMessage: $("#privacyMessage"), nextPlayerName: $("#nextPlayerName"), revealTurnButton: $("#revealTurnButton"), privacyUndoButton: $("#privacyUndoButton"),
    revealDialog: $("#revealDialog"), revealKicker: $("#revealKicker"), revealTitle: $("#revealTitle"), revealSummary: $("#revealSummary"), revealBid: $("#revealBid"),
    revealPlayers: $("#revealPlayers"), lossCallout: $("#lossCallout"), nextRoundButton: $("#nextRoundButton"), winnerDialog: $("#winnerDialog"), winnerName: $("#winnerName"),
    winnerSummary: $("#winnerSummary"), winnerStats: $("#winnerStats"), winnerSetupButton: $("#winnerSetupButton"), rematchButton: $("#rematchButton"), toast: $("#toast"),
  };

  let state = null;
  let selectedFace = 1;
  let undoStack = [];
  let aiTimer = null;
  let toastTimer = null;
  let privacyVisible = false;

  function clone(value) {
    return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    toastTimer = setTimeout(() => elements.toast.classList.remove("is-visible"), 2200);
  }

  function showDialog(dialog) {
    if (!dialog.open) dialog.showModal();
  }

  function closeDialog(dialog) {
    if (dialog.open) dialog.close();
  }

  function activePlayers() {
    return state.players.filter((player) => player.diceCount > 0);
  }

  function totalDice() {
    return activePlayers().reduce((sum, player) => sum + player.diceCount, 0);
  }

  function currentPlayer() {
    return state.players[state.currentIndex];
  }

  function observerIndex() {
    return state.mode === "solo" ? 0 : state.currentIndex;
  }

  function saveGame() {
    if (!state) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      elements.resumeButton.hidden = false;
    } catch (_) {
      // 게임은 저장 공간이 없어도 계속 진행됩니다.
    }
  }

  function clearSavedGame() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
    elements.resumeButton.hidden = true;
  }

  function loadSavedGame() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved?.version === 1 && Array.isArray(saved.players) && saved.players.length >= 2) return saved;
    } catch (_) {}
    return null;
  }

  function renderPassNameFields(preferred = []) {
    const count = Number(elements.passCount.value);
    elements.passNameFields.innerHTML = Array.from({ length: count }, (_, index) => `
      <label class="field player-name-field" style="--player-color:${COLORS[index]}" data-label="P${index + 1}">
        <span class="sr-only">참가자 ${index + 1} 이름</span>
        <input type="text" maxlength="16" value="${escapeHtml(preferred[index] || `플레이어 ${index + 1}`)}" aria-label="참가자 ${index + 1} 이름" autocomplete="off" />
      </label>
    `).join("");
  }

  function updateSetupMode() {
    const mode = document.querySelector('input[name="gameMode"]:checked').value;
    document.querySelectorAll(".mode-option").forEach((label) => label.classList.toggle("is-selected", label.querySelector("input").checked));
    elements.soloSettings.hidden = mode !== "solo";
    elements.passSettings.hidden = mode !== "pass";
    elements.playerSettingHint.textContent = mode === "solo" ? "나와 AI 수를 정하세요." : "한 기기에서 번갈아 할 참가자를 정하세요.";
  }

  function updateWildRule() {
    const wild = document.querySelector('input[name="wildRule"]:checked').value === "wild";
    document.querySelectorAll(".rule-option").forEach((label) => label.classList.toggle("is-selected", label.querySelector("input").checked));
    elements.rulePreview.innerHTML = wild
      ? '<span>예</span><p><b>“3개의 5”</b>라면 모든 주사위에서 5와 1을 합쳐 3개 이상인지 확인합니다.</p>'
      : '<span>예</span><p><b>“3개의 5”</b>라면 모든 주사위에서 5만 3개 이상인지 확인합니다.</p>';
  }

  function createPlayers(mode) {
    if (mode === "solo") {
      const humanName = elements.soloName.value.trim() || "플레이어";
      const aiNames = ["루나 AI", "노바 AI", "오비트 AI"];
      return [humanName, ...aiNames.slice(0, Number(elements.aiCount.value))].map((name, index) => ({
        id: `p${index + 1}`, name, type: index === 0 ? "human" : "ai", color: COLORS[index], diceCount: 5, dice: [],
      }));
    }
    return [...elements.passNameFields.querySelectorAll("input")].map((input, index) => ({
      id: `p${index + 1}`, name: input.value.trim() || `플레이어 ${index + 1}`, type: "human", color: COLORS[index], diceCount: 5, dice: [],
    }));
  }

  function rollAllPlayers() {
    state.players.forEach((player) => {
      player.dice = player.diceCount > 0 ? logic.rollDice(player.diceCount) : [];
    });
  }

  function startGame() {
    const mode = document.querySelector('input[name="gameMode"]:checked').value;
    state = {
      version: 1,
      mode,
      wildOnes: document.querySelector('input[name="wildRule"]:checked').value === "wild",
      difficulty: elements.aiDifficulty.value,
      players: createPlayers(mode),
      currentIndex: 0,
      round: 1,
      bid: null,
      bids: [],
      phase: "turn",
      history: [],
      lastComparison: null,
      lastLoserIndex: null,
      stats: { bids: 0, challenges: 0, successfulChallenges: 0 },
    };
    rollAllPlayers();
    undoStack = [];
    selectedFace = 1;
    privacyVisible = mode === "pass";
    elements.setupPanel.hidden = true;
    elements.gamePanel.hidden = false;
    saveGame();
    render();
    if (privacyVisible) showPrivacyScreen();
    else startAITurnIfNeeded();
  }

  function resumeGame() {
    const saved = loadSavedGame();
    if (!saved) {
      showToast("계속할 게임을 찾지 못했어요.");
      clearSavedGame();
      return;
    }
    state = saved;
    if (state.phase === "revealed" && activePlayers().length > 1) {
      state.round += 1;
      state.bid = null;
      state.bids = [];
      state.phase = "turn";
      const loserIndex = state.lastLoserIndex;
      state.currentIndex = state.players[loserIndex].diceCount > 0
        ? loserIndex
        : logic.nextActiveIndex(state.players, (loserIndex - 1 + state.players.length) % state.players.length);
      rollAllPlayers();
    }
    if (state.phase === "turn" && state.players.some((player) => player.dice.length !== player.diceCount)) rollAllPlayers();
    undoStack = [];
    privacyVisible = state.mode === "pass" && state.phase === "turn";
    elements.setupPanel.hidden = true;
    elements.gamePanel.hidden = false;
    render();
    if (state.phase === "gameover" || activePlayers().length === 1) showWinner();
    else if (privacyVisible) showPrivacyScreen();
    else startAITurnIfNeeded();
    showToast("저장한 게임을 이어서 시작했어요.");
  }

  function returnToSetup(clearSave = false) {
    clearTimeout(aiTimer);
    closeDialog(elements.revealDialog);
    closeDialog(elements.winnerDialog);
    elements.privacyScreen.hidden = true;
    elements.gamePanel.inert = false;
    privacyVisible = false;
    elements.gamePanel.hidden = true;
    elements.setupPanel.hidden = false;
    if (clearSave) clearSavedGame();
    state = null;
    undoStack = [];
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderPlayerStrip() {
    elements.playerStrip.style.setProperty("--player-count", Math.min(state.players.length, 4));
    elements.playerStrip.innerHTML = state.players.map((player, index) => `
      <article class="player-chip${index === state.currentIndex && state.phase === "turn" ? " is-current" : ""}${player.diceCount === 0 ? " is-eliminated" : ""}" style="--player-color:${player.color}" ${index === state.currentIndex ? 'aria-current="true"' : ""}>
        <span class="player-avatar">${player.type === "ai" ? "AI" : `P${index + 1}`}</span>
        <span><strong>${escapeHtml(player.name)}</strong><small>${player.diceCount === 0 ? "탈락" : state.phase !== "turn" && index === state.currentIndex ? "판정 완료" : index === state.currentIndex ? "현재 차례" : "대기"}</small></span>
        <span class="dice-count" aria-label="주사위 ${player.diceCount}개">◆ ${player.diceCount}</span>
      </article>
    `).join("");
  }

  function renderOwnDice() {
    const player = state.players[observerIndex()];
    elements.viewerName.textContent = player.name;
    if (!player.dice.length) {
      elements.ownDice.innerHTML = '<p class="empty-chart">남은 주사위가 없습니다. AI들의 마지막 승부를 지켜보세요.</p>';
      return;
    }
    elements.ownDice.innerHTML = player.dice.map((value) => `
      <span class="game-die${state.wildOnes && value === 1 ? " is-wild" : ""}" role="img" aria-label="주사위 눈 ${value}${state.wildOnes && value === 1 ? ", 와일드" : ""}">
        <span aria-hidden="true">${DIE_GLYPHS[value]}</span><small aria-hidden="true">${value}</small>
      </span>
    `).join("");
  }

  function renderCurrentBid() {
    if (!state.bid) {
      elements.currentBidDisplay.className = "bid-display is-empty";
      elements.currentBidDisplay.innerHTML = "<b>—</b><strong>첫 입찰을 기다리는 중</strong>";
      elements.bidderLabel.textContent = "수량을 정하고 눈금을 고르세요.";
      elements.bidTrail.innerHTML = '<li class="empty">아직 입찰이 없습니다.</li>';
      return;
    }
    const bidder = state.players[state.bid.bidderIndex];
    elements.currentBidDisplay.className = "bid-display";
    elements.currentBidDisplay.innerHTML = `<b aria-hidden="true">${DIE_GLYPHS[state.bid.face]}</b><strong>${state.bid.quantity}개의 ${state.bid.face}</strong>`;
    elements.bidderLabel.textContent = `${bidder.name}의 주장 · 전체 주사위 ${totalDice()}개 기준`;
    elements.bidTrail.innerHTML = state.bids.slice(-7).map((bid) => `<li><b>${escapeHtml(state.players[bid.bidderIndex].name)}</b> · ${bid.quantity}×${bid.face}</li>`).join("");
  }

  function nextMinimumBid() {
    return logic.legalBids(state.bid, totalDice())[0] || null;
  }

  function syncBidControls(force = false) {
    const candidate = { quantity: Number(elements.bidQuantity.value), face: selectedFace };
    if (force || !logic.isHigherBid(candidate, state.bid) || candidate.quantity > totalDice()) {
      const next = nextMinimumBid();
      if (next) {
        elements.bidQuantity.value = next.quantity;
        selectedFace = next.face;
      }
    }
    elements.bidQuantity.max = totalDice();
    elements.faceButtons.querySelectorAll("button").forEach((button) => button.setAttribute("aria-pressed", String(Number(button.dataset.face) === selectedFace)));
    elements.legalBidHint.textContent = state.bid
      ? `현재 ${state.bid.quantity}개의 ${state.bid.face}보다 수량을 늘리거나, 같은 수량에서 더 큰 눈금을 고르세요.`
      : "첫 입찰은 어떤 조합도 가능합니다.";
  }

  function renderActions() {
    const player = currentPlayer();
    const isHumanTurn = state.phase === "turn" && player.type === "human" && player.diceCount > 0 && !privacyVisible;
    elements.actionPanel.setAttribute("aria-busy", String(state.phase === "turn" && player.type === "ai"));
    elements.actionTitle.textContent = state.phase !== "turn" ? "공개 결과를 확인하세요" : player.type === "ai" ? `${player.name}가 판단하고 있어요` : "더 높게 입찰하거나 도전하세요";
    elements.turnAnnouncement.innerHTML = state.phase !== "turn"
      ? "도전 결과와 <strong>예측 ↔ 실제</strong> 비교를 확인하세요."
      : player.type === "ai"
        ? `<strong>${escapeHtml(player.name)}</strong>가 숨은 주사위를 추정하는 중입니다…`
        : `<strong>${escapeHtml(player.name)}</strong> 차례입니다. 근거를 말하고 선택하세요.`;
    elements.bidButton.disabled = !isHumanTurn || !nextMinimumBid();
    elements.challengeButton.disabled = !isHumanTurn || !state.bid;
    elements.bidQuantity.disabled = !isHumanTurn;
    elements.quantityDown.disabled = !isHumanTurn;
    elements.quantityUp.disabled = !isHumanTurn;
    elements.faceButtons.querySelectorAll("button").forEach((button) => { button.disabled = !isHumanTurn; });
    elements.undoButton.disabled = !undoStack.length || state.phase !== "turn";
    elements.privacyUndoButton.hidden = !undoStack.length;
    syncBidControls(false);
  }

  function probabilityVerdict(probability) {
    if (probability >= .75) return "성립 가능성이 꽤 높아요";
    if (probability >= .5) return "참일 쪽이 조금 더 우세해요";
    if (probability >= .25) return "허세일 가능성도 살펴보세요";
    return "낮은 확률 · 도전을 검토할 구간";
  }

  function renderAnalysis() {
    if (!state.bid) {
      elements.probabilityValue.textContent = "—";
      elements.probabilityVerdict.textContent = "입찰이 나오면 계산합니다";
      elements.probabilityFill.style.width = "0%";
      elements.probabilityMeter.setAttribute("aria-label", "아직 계산할 입찰이 없습니다");
      elements.probabilityCopy.textContent = "내 주사위와 다른 사람이 가진 주사위 개수를 이용해 계산해요.";
      elements.formulaExplanation.innerHTML = "입찰 뒤에는 <b>이미 확인한 일치 개수</b>를 먼저 세고, 숨은 주사위에서 몇 개가 더 필요한지 이항분포로 계산합니다.";
      elements.distributionChart.innerHTML = '<p class="empty-chart">현재 입찰 뒤에 분포가 나타납니다.</p>';
    } else {
      const observer = state.players[observerIndex()];
      const unknown = totalDice() - observer.dice.length;
      const knownMatches = logic.countMatches(observer.dice, state.bid.face, state.wildOnes);
      const needed = Math.max(0, state.bid.quantity - knownMatches);
      const p = logic.matchChance(state.bid.face, state.wildOnes);
      const probability = logic.atLeastProbability({ knownDice: observer.dice, unknownDice: unknown, quantity: state.bid.quantity, face: state.bid.face, wildOnes: state.wildOnes });
      const formatted = logic.formatPercent(probability);
      elements.probabilityValue.textContent = formatted;
      elements.probabilityVerdict.textContent = probabilityVerdict(probability);
      elements.probabilityFill.style.width = formatted;
      elements.probabilityMeter.setAttribute("aria-label", `현재 입찰이 성립할 확률 ${formatted}`);
      elements.probabilityCopy.textContent = `내 주사위에서 ${knownMatches}개를 확인했습니다. 숨은 ${unknown}개 중 ${needed}개 이상이 더 맞으면 입찰이 성립해요.`;
      elements.formulaExplanation.innerHTML = `
        <b>조건:</b> 내 주사위 ${observer.dice.length}개를 본 상태<br />
        <b>숨은 한 개가 맞을 확률:</b> ${state.wildOnes && state.bid.face !== 1 ? "2/6 (입찰 눈금 또는 1)" : "1/6 (입찰 눈금)"}
        <code>P(X ≥ ${needed}), X ~ B(${unknown}, ${(p).toFixed(3)})</code>
        숨은 ${unknown}개를 각각 독립이라고 보고, 그중 필요한 수 이상이 맞을 확률을 모두 더한 값입니다. “적어도”는 ${needed}개, ${needed + 1}개, …를 전부 포함한다는 뜻이에요.
      `;
      const distribution = logic.matchDistribution({ knownDice: observer.dice, unknownDice: unknown, face: state.bid.face, wildOnes: state.wildOnes });
      const max = Math.max(...distribution.map((item) => item.probability), .0001);
      elements.distributionChart.innerHTML = distribution.map((item) => {
        const height = Math.max(3, item.probability / max * 82);
        return `<div class="distribution-bar${item.totalMatches >= state.bid.quantity ? " is-target" : ""}" style="--height:${height}px" aria-label="${item.totalMatches}개일 확률 ${logic.formatPercent(item.probability)}"><b>${item.probability >= .035 ? logic.formatPercent(item.probability, 0) : ""}</b><span>${item.totalMatches}</span></div>`;
      }).join("");
    }

    elements.compareCard.hidden = !state.lastComparison;
    if (state.lastComparison) {
      const comparison = state.lastComparison;
      elements.compareCard.classList.toggle("is-miss", !comparison.challengeSucceeded);
      elements.compareSymbol.textContent = comparison.challengeSucceeded ? "✓" : "×";
      elements.predictedValue.textContent = logic.formatPercent(comparison.probability);
      elements.actualValue.textContent = `${comparison.actual}개`;
      elements.compareCopy.textContent = `${comparison.challengerName}의 계산에서는 입찰이 맞을 확률이 ${logic.formatPercent(comparison.probability)}였습니다. 실제로는 ${comparison.actual}개여서 도전이 ${comparison.challengeSucceeded ? "성공" : "실패"}했습니다.`;
    }
  }

  function renderLog() {
    elements.logCount.textContent = `${state.history.length}회`;
    if (!state.history.length) {
      elements.roundLog.innerHTML = '<li class="empty">첫 도전을 기다리고 있어요.</li>';
      return;
    }
    elements.roundLog.innerHTML = state.history.slice().reverse().map((item) => `
      <li><b>R${item.round}</b><div><strong>${escapeHtml(item.challengerName)} → ${item.challengeSucceeded ? "도전 성공" : "도전 실패"}</strong><span>${item.bid.quantity}개의 ${item.bid.face} · 실제 ${item.actual}개 · ${escapeHtml(item.loserName)} 주사위 상실</span></div></li>
    `).join("");
  }

  function render() {
    if (!state) return;
    elements.roundNumber.textContent = state.round;
    elements.ruleBadge.textContent = state.wildOnes ? "1 와일드" : "기본 규칙";
    renderPlayerStrip();
    renderOwnDice();
    renderCurrentBid();
    renderActions();
    renderAnalysis();
    renderLog();
  }

  function pushUndo() {
    undoStack.push(clone(state));
    if (undoStack.length > 12) undoStack.shift();
  }

  function performBid(bid, source = "human") {
    if (state.phase !== "turn" || !logic.isHigherBid(bid, state.bid) || bid.quantity > totalDice()) return false;
    pushUndo();
    const bidderIndex = state.currentIndex;
    state.bid = { quantity: bid.quantity, face: bid.face, bidderIndex };
    state.bids.push({ ...state.bid });
    state.stats.bids += 1;
    state.currentIndex = logic.nextActiveIndex(state.players, bidderIndex);
    selectedFace = 1;
    elements.actionFeedback.textContent = "";
    saveGame();
    privacyVisible = state.mode === "pass";
    render();
    if (privacyVisible) showPrivacyScreen(`${state.players[bidderIndex].name}의 입찰이 기록되었습니다.`);
    else if (source === "human") {
      showToast(`${bid.quantity}개의 ${bid.face}로 입찰했습니다.`);
      startAITurnIfNeeded();
    } else {
      startAITurnIfNeeded();
    }
    return true;
  }

  function submitHumanBid() {
    if (!state || currentPlayer().type !== "human" || privacyVisible) return;
    const quantity = Math.floor(Number(elements.bidQuantity.value));
    const bid = { quantity, face: selectedFace };
    if (quantity < 1 || quantity > totalDice()) {
      elements.actionFeedback.textContent = `수량은 1부터 전체 주사위 ${totalDice()}개 사이여야 합니다.`;
      elements.bidQuantity.focus();
      return;
    }
    if (!logic.isHigherBid(bid, state.bid)) {
      elements.actionFeedback.textContent = "현재 입찰보다 높여야 합니다. 수량을 늘리거나 같은 수량에서 더 큰 눈금을 고르세요.";
      return;
    }
    performBid(bid, "human");
  }

  function challengeCurrentBid(source = "human") {
    if (!state?.bid || state.phase !== "turn" || privacyVisible) return;
    const challengerIndex = state.currentIndex;
    const challenger = state.players[challengerIndex];
    if (source === "human" && challenger.type !== "human") return;
    clearTimeout(aiTimer);
    const observerProbability = logic.atLeastProbability({
      knownDice: challenger.dice,
      unknownDice: totalDice() - challenger.dice.length,
      quantity: state.bid.quantity,
      face: state.bid.face,
      wildOnes: state.wildOnes,
    });
    const result = logic.resolveChallenge({ bid: state.bid, dice: activePlayers().map((player) => player.dice), wildOnes: state.wildOnes });
    const bidderIndex = state.bid.bidderIndex;
    const loserIndex = result.bidIsTrue ? challengerIndex : bidderIndex;
    const loser = state.players[loserIndex];
    loser.diceCount = Math.max(0, loser.diceCount - 1);
    const challengeSucceeded = !result.bidIsTrue;
    state.stats.challenges += 1;
    if (challengeSucceeded) state.stats.successfulChallenges += 1;
    state.lastLoserIndex = loserIndex;
    state.lastComparison = {
      probability: observerProbability,
      actual: result.actual,
      challengeSucceeded,
      challengerName: challenger.name,
    };
    state.history.push({
      round: state.round,
      challengerName: challenger.name,
      bidderName: state.players[bidderIndex].name,
      loserName: loser.name,
      bid: { quantity: state.bid.quantity, face: state.bid.face },
      actual: result.actual,
      probability: observerProbability,
      challengeSucceeded,
    });
    state.phase = "revealed";
    undoStack = [];
    saveGame();
    privacyVisible = false;
    render();
    showReveal(result, challengerIndex, bidderIndex, loserIndex);
  }

  function showReveal(result, challengerIndex, bidderIndex, loserIndex) {
    const bid = state.bid;
    const challenger = state.players[challengerIndex];
    const bidder = state.players[bidderIndex];
    const loser = state.players[loserIndex];
    elements.revealKicker.textContent = result.bidIsTrue ? "입찰 성립 · 도전 실패" : "입찰 거짓 · 도전 성공";
    elements.revealKicker.style.background = result.bidIsTrue ? "var(--red-soft)" : "var(--mint-soft)";
    elements.revealKicker.style.color = result.bidIsTrue ? "var(--red)" : "#16745d";
    elements.revealTitle.textContent = result.bidIsTrue ? `${bidder.name}의 입찰이 맞았습니다` : `${challenger.name}의 의심이 맞았습니다`;
    elements.revealSummary.textContent = `${bid.quantity}개 이상이 필요했고, 실제로 ${result.actual}개였습니다.`;
    elements.revealBid.innerHTML = `<b>${bid.quantity}개의 ${bid.face}</b><span>${state.wildOnes && bid.face !== 1 ? `${bid.face}와 1을 함께 계산` : `${bid.face}만 계산`}</span>`;
    elements.revealPlayers.innerHTML = state.players.filter((player) => player.dice.length).map((player) => {
      const matches = logic.countMatches(player.dice, bid.face, state.wildOnes);
      return `<div class="revealed-player"><strong>${escapeHtml(player.name)}</strong><div class="revealed-dice">${player.dice.map((value) => {
        const isMatch = value === bid.face || (state.wildOnes && bid.face !== 1 && value === 1);
        return `<span class="revealed-die${isMatch ? " is-match" : ""}" aria-label="${value}${isMatch ? ", 일치" : ""}">${DIE_GLYPHS[value]}</span>`;
      }).join("")}</div><span>일치 ${matches}개</span></div>`;
    }).join("");
    elements.lossCallout.textContent = `${loser.name}이(가) 주사위 1개를 잃었습니다.${loser.diceCount === 0 ? " 이번 게임에서 탈락합니다." : ` 이제 ${loser.diceCount}개가 남았습니다.`}`;
    const gameOver = activePlayers().length === 1;
    elements.nextRoundButton.innerHTML = gameOver ? '최종 승자 확인 <span aria-hidden="true">→</span>' : '다음 라운드 <span aria-hidden="true">→</span>';
    showDialog(elements.revealDialog);
  }

  function beginNextRound() {
    closeDialog(elements.revealDialog);
    if (activePlayers().length === 1) {
      showWinner();
      return;
    }
    state.round += 1;
    state.bid = null;
    state.bids = [];
    state.phase = "turn";
    const loserIndex = state.lastLoserIndex;
    state.currentIndex = state.players[loserIndex].diceCount > 0
      ? loserIndex
      : logic.nextActiveIndex(state.players, (loserIndex - 1 + state.players.length) % state.players.length);
    rollAllPlayers();
    selectedFace = 1;
    undoStack = [];
    privacyVisible = state.mode === "pass";
    saveGame();
    render();
    if (privacyVisible) showPrivacyScreen("새 라운드의 주사위가 준비되었습니다.");
    else startAITurnIfNeeded();
  }

  function showWinner() {
    const winner = activePlayers()[0];
    state.phase = "gameover";
    saveGame();
    elements.winnerName.textContent = winner.name;
    elements.winnerSummary.textContent = `${state.round}라운드 동안 제한된 정보와 입찰 흐름을 읽고 마지막까지 살아남았습니다.`;
    const challengeRate = state.stats.challenges ? state.stats.successfulChallenges / state.stats.challenges : 0;
    elements.winnerStats.innerHTML = `<div><span>진행 라운드</span><strong>${state.round}</strong></div><div><span>전체 입찰</span><strong>${state.stats.bids}</strong></div><div><span>도전 적중률</span><strong>${logic.formatPercent(challengeRate, 0)}</strong></div>`;
    showDialog(elements.winnerDialog);
  }

  function startAITurnIfNeeded() {
    clearTimeout(aiTimer);
    if (!state || state.phase !== "turn" || privacyVisible) return;
    const player = currentPlayer();
    if (player.type !== "ai") return;
    renderActions();
    aiTimer = setTimeout(() => {
      if (!state || state.phase !== "turn" || currentPlayer().type !== "ai") return;
      const ai = currentPlayer();
      const action = logic.chooseAIAction({ currentBid: state.bid, ownDice: ai.dice, totalDice: totalDice(), wildOnes: state.wildOnes, difficulty: state.difficulty });
      if (action.type === "challenge") {
        showToast(`${ai.name}: “그 입찰에 도전합니다!”`);
        challengeCurrentBid("ai");
      } else {
        showToast(`${ai.name}: “${action.bid.quantity}개의 ${action.bid.face}.”`);
        performBid(action.bid, "ai");
      }
    }, 850);
  }

  function showPrivacyScreen(context = "화면을 가린 뒤 다음 참가자만 버튼을 누르세요.") {
    privacyVisible = true;
    elements.gamePanel.inert = true;
    const next = currentPlayer();
    elements.nextPlayerName.textContent = next.name;
    elements.privacyMessage.textContent = `${context} ${next.name}만 아래 버튼을 눌러 주세요.`;
    elements.privacyScreen.hidden = false;
    elements.privacyUndoButton.hidden = !undoStack.length;
    setTimeout(() => elements.revealTurnButton.focus(), 30);
  }

  function revealPassTurn() {
    privacyVisible = false;
    elements.gamePanel.inert = false;
    elements.privacyScreen.hidden = true;
    render();
    elements.bidButton.focus();
  }

  function undoLastBid() {
    if (!undoStack.length || !state || state.phase !== "turn") return;
    clearTimeout(aiTimer);
    state = undoStack.pop();
    selectedFace = 1;
    privacyVisible = state.mode === "pass";
    saveGame();
    render();
    showToast("직전 입찰을 취소했습니다.");
    if (privacyVisible) showPrivacyScreen("직전 입찰이 취소되었습니다.");
    else startAITurnIfNeeded();
  }

  function rematch() {
    closeDialog(elements.winnerDialog);
    state.players.forEach((player) => { player.diceCount = 5; player.dice = []; });
    state.currentIndex = 0;
    state.round = 1;
    state.bid = null;
    state.bids = [];
    state.phase = "turn";
    state.history = [];
    state.lastComparison = null;
    state.lastLoserIndex = null;
    state.stats = { bids: 0, challenges: 0, successfulChallenges: 0 };
    rollAllPlayers();
    undoStack = [];
    privacyVisible = state.mode === "pass";
    saveGame();
    render();
    if (privacyVisible) showPrivacyScreen(); else startAITurnIfNeeded();
  }

  document.querySelectorAll('input[name="gameMode"]').forEach((input) => input.addEventListener("change", updateSetupMode));
  document.querySelectorAll('input[name="wildRule"]').forEach((input) => input.addEventListener("change", updateWildRule));
  elements.passCount.addEventListener("change", () => {
    const names = [...elements.passNameFields.querySelectorAll("input")].map((input) => input.value);
    renderPassNameFields(names);
  });
  elements.startButton.addEventListener("click", startGame);
  elements.resumeButton.addEventListener("click", resumeGame);
  elements.tutorialButton.addEventListener("click", () => showDialog(elements.tutorialDialog));
  elements.rulesButton.addEventListener("click", () => showDialog(elements.rulesDialog));
  elements.tutorialDoneButton.addEventListener("click", () => { try { localStorage.setItem(TUTORIAL_KEY, "seen"); } catch (_) {} });
  elements.newGameButton.addEventListener("click", () => {
    if (state && state.phase !== "gameover" && !window.confirm("현재 게임을 끝내고 설정 화면으로 돌아갈까요?")) return;
    returnToSetup(true);
  });
  elements.faceButtons.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-face]");
    if (!button || button.disabled) return;
    selectedFace = Number(button.dataset.face);
    elements.faceButtons.querySelectorAll("button").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    elements.actionFeedback.textContent = "";
  });
  elements.quantityDown.addEventListener("click", () => { elements.bidQuantity.value = Math.max(1, Number(elements.bidQuantity.value) - 1); });
  elements.quantityUp.addEventListener("click", () => { elements.bidQuantity.value = Math.min(totalDice(), Number(elements.bidQuantity.value) + 1); });
  elements.bidQuantity.addEventListener("input", () => { elements.actionFeedback.textContent = ""; });
  elements.bidButton.addEventListener("click", submitHumanBid);
  elements.challengeButton.addEventListener("click", () => challengeCurrentBid("human"));
  elements.undoButton.addEventListener("click", undoLastBid);
  elements.privacyUndoButton.addEventListener("click", undoLastBid);
  elements.revealTurnButton.addEventListener("click", revealPassTurn);
  elements.nextRoundButton.addEventListener("click", beginNextRound);
  elements.analysisToggle.addEventListener("click", () => {
    const visible = elements.analysisColumn.classList.toggle("is-hidden") === false;
    elements.analysisToggle.setAttribute("aria-pressed", String(visible));
    elements.analysisToggle.querySelector("span:last-child").textContent = visible ? "분석 켜짐" : "분석 꺼짐";
  });
  elements.winnerSetupButton.addEventListener("click", () => returnToSetup(true));
  elements.rematchButton.addEventListener("click", rematch);

  document.addEventListener("keydown", (event) => {
    if (!state || state.phase !== "turn" || privacyVisible || document.querySelector("dialog[open]")) return;
    if (event.target.matches("input, select, textarea")) return;
    if (event.key === "Enter" && !elements.bidButton.disabled) { event.preventDefault(); submitHumanBid(); }
    if (event.code === "Space" && !elements.challengeButton.disabled) { event.preventDefault(); challengeCurrentBid("human"); }
  });

  renderPassNameFields();
  updateSetupMode();
  updateWildRule();
  elements.resumeButton.hidden = !loadSavedGame();
  const manualRequested = new URLSearchParams(window.location.search).get("manual") === "1";
  if (manualRequested) {
    setTimeout(() => showDialog(elements.rulesDialog), 120);
  } else {
    try {
      if (!localStorage.getItem(TUTORIAL_KEY)) setTimeout(() => showDialog(elements.tutorialDialog), 350);
    } catch (_) {}
  }
})();
