(() => {
  "use strict";

  const logic = window.BoardGameLogic;
  const STORAGE_KEY = "calculus-board-game-maker-project-v1";
  const TYPE_LABELS = { start: "출발", finish: "도착", problem: "문제", event: "이벤트", reward: "보상", penalty: "벌칙", normal: "일반" };
  const CARD_LABELS = { choice: "객관식", short: "단답형", explain: "설명형", action: "행동" };
  const STEP_ORDER = ["plan", "board", "cards", "rules", "play", "share"];
  const els = Object.fromEntries([...document.querySelectorAll("[id]")].map((element) => [element.id, element]));

  let selectedSpaceId = "";
  let selectedCardId = "";
  let saveTimer = 0;
  let toastTimer = 0;
  let dragSpaceId = "";
  let play = null;
  let drawnCard = null;
  let selectedPlayAnswer = "";
  let cardResolved = false;

  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function tutorialProject() {
    const board = logic.createBoardTemplate("branch");
    board.spaces[2].label = "경로 선택";
    board.spaces[3].label = "접선 카드";
    board.spaces[4].label = "힌트 토큰 +1";
    board.spaces[6].label = "한 칸 뒤로";
    board.spaces[7].label = "적분 카드";
    return logic.sanitizeProject({
      meta: {
        title: "변화율 원정대 · 튜토리얼",
        concept: "두 갈래 길에서 자신 있는 미분·적분 주제를 선택하고, 풀이 점수와 도착 보너스를 함께 겨룬다.",
        audience: "고등학교 미적분 학습 모둠 · 2~4명",
        note: "튜토리얼: 칸 문구와 문제를 바꾸고, 우리 모둠만의 선택 규칙을 한 가지 더해 보세요.",
      },
      board,
      cards: [
        { id: "tutorial-1", type: "short", topic: "극한", question: "lim x→2 (x²-4)/(x-2)의 값을 구하세요.", answer: "4", solution: "x²-4=(x-2)(x+2)이므로 x≠2에서 약분한 뒤 2를 대입하면 4입니다.", hint: "인수분해한 뒤 약분해 보세요.", difficulty: 1, points: 2 },
        { id: "tutorial-2", type: "short", topic: "도함수", question: "f(x)=x³-3x의 도함수 f′(x)를 구하세요.", answer: "3x²-3|3x^2-3", solution: "거듭제곱의 미분법을 항별로 적용하면 f′(x)=3x²-3입니다.", hint: "xⁿ의 도함수는 nxⁿ⁻¹입니다.", difficulty: 1, points: 2 },
        { id: "tutorial-3", type: "choice", topic: "접선", question: "y=x² 위의 x=1인 점에서 접선의 기울기는?", choices: ["1", "2", "3", "4"], answer: "2", solution: "y′=2x이고 x=1을 대입하면 기울기는 2입니다.", difficulty: 1, points: 2 },
        { id: "tutorial-4", type: "explain", topic: "증가·감소", question: "f′(x)의 부호표를 이용해 함수의 증가 구간을 설명하세요.", answer: "모둠 판정", solution: "f′(x)>0인 구간에서 f는 증가합니다. 만든 함수의 임계점과 부호 변화를 함께 설명합니다.", hint: "도함수가 양수인 구간을 찾으세요.", difficulty: 2, points: 4 },
        { id: "tutorial-5", type: "short", topic: "부정적분", question: "∫(2x+1) dx를 구하세요. 적분상수도 쓰세요.", answer: "x²+x+C|x^2+x+C", solution: "항별로 적분하면 x²+x+C입니다.", difficulty: 1, points: 2 },
        { id: "tutorial-6", type: "short", topic: "넓이", question: "y=x와 x축, x=0, x=2로 둘러싸인 넓이는?", answer: "2", solution: "∫₀² x dx=[x²/2]₀²=2입니다.", hint: "0부터 2까지 정적분하세요.", difficulty: 2, points: 4 },
      ],
      rules: {
        playersMin: 2, playersMax: 4, movementMode: "dice",
        victoryCondition: "도착 칸에 도달한 사람 중 카드 점수가 가장 높은 사람이 이긴다.",
        turnOrder: "주사위를 굴린다 → 갈림길을 고른다 → 이동한다 → 도착한 칸의 카드나 효과를 처리한다 → 다음 사람에게 넘긴다.",
        movementDetail: "주사위 1개만큼 이동한다. 갈림길에서는 이동 전에 경로를 선택한다.",
        correctAction: "카드 점수를 얻는다. 보상 칸이면 힌트 토큰도 1개 얻는다.",
        wrongAction: "점수를 얻지 못하고 현재 칸에 머문다.",
        collisionRule: "같은 칸에 여러 말이 있어도 모두 그대로 둔다.",
        tieRule: "어려움 3 카드를 한 장씩 풀어 먼저 맞힌 사람이 이긴다.",
        customRules: "튜토리얼 규칙입니다. 실제 게임에서는 이동·보상·방해 중 하나를 모둠의 독창적인 규칙으로 바꾸세요.",
      },
      quality: { math: 3, fun: 2, finish: 2, checks: [] },
    });
  }

  function blankProject() {
    return logic.sanitizeProject({
      meta: { title: "나의 미적분 보드게임", concept: "", audience: "고등학교 미적분 학습 모둠", note: "" },
      board: logic.createBoardTemplate("path"), cards: [],
      rules: { playersMin: 2, playersMax: 4, movementMode: "dice" },
      quality: { math: 1, fun: 1, finish: 1, checks: [] },
    });
  }

  function loadLocalProject() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? logic.sanitizeProject(JSON.parse(stored)) : tutorialProject();
    } catch {
      return tutorialProject();
    }
  }

  let project = loadLocalProject();
  selectedSpaceId = project.board.spaces[0]?.id || "";
  selectedCardId = project.cards[0]?.id || "";

  function scheduleSave() {
    clearTimeout(saveTimer);
    els.saveStatus?.classList.add("is-saving");
    if (els.saveStatus) els.saveStatus.lastChild.textContent = " 저장 중…";
    saveTimer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
        els.saveStatus?.classList.remove("is-saving");
        if (els.saveStatus) els.saveStatus.lastChild.textContent = " 이 기기에 자동 저장됨";
      } catch {
        if (els.saveStatus) els.saveStatus.lastChild.textContent = " 자동 저장 공간이 부족함";
      }
    }, 180);
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => els.toast.classList.remove("is-visible"), 2600);
  }

  function openManual() {
    els.manualModal.hidden = false;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => els.manualModal.querySelector(".manual-dialog")?.focus(), 0);
  }

  function closeManual() {
    els.manualModal.hidden = true;
    document.body.style.overflow = "";
    els.manualButton.focus();
  }

  function showStep(step, focusHeading = true) {
    if (!STEP_ORDER.includes(step)) return;
    document.querySelectorAll("[data-panel]").forEach((panel) => {
      const active = panel.dataset.panel === step;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });
    document.querySelectorAll(".stage-button").forEach((button) => {
      const active = button.dataset.step === step;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });
    history.replaceState(null, "", `#${step}`);
    const activeButton = document.querySelector(`.stage-button[data-step="${step}"]`);
    activeButton?.scrollIntoView({ block: "nearest", inline: "center" });
    if (focusHeading) {
      window.scrollTo({ top: document.querySelector(".stage-nav").offsetTop, behavior: "smooth" });
      window.setTimeout(() => document.querySelector(`[data-panel="${step}"] h2`)?.focus({ preventScroll: true }), 250);
    }
    if (step === "share") renderFinalCheck();
    if (step === "play") renderPlay();
  }

  function calculateReadiness() {
    const issues = logic.validateProject(project);
    const topics = logic.usedTopics(project);
    const checks = [
      project.meta.title.trim(), project.meta.concept.trim(),
      !issues.some((issue) => issue.target === "board" && issue.level === "error"),
      project.cards.filter((card) => card.question.trim()).length >= 5,
      topics.length >= 5,
      !issues.some((issue) => issue.target === "cards" && issue.level === "error"),
      !issues.some((issue) => issue.code === "missing-rules"),
      project.quality.math >= 3 && project.quality.fun >= 3 && project.quality.finish >= 3,
    ];
    return Math.round(checks.filter(Boolean).length / checks.length * 100);
  }

  function renderSummary() {
    const topics = logic.usedTopics(project);
    const issues = logic.validateProject(project);
    const readiness = calculateReadiness();
    els.heroTitle.textContent = project.meta.title.trim() || "제목 없는 보드게임";
    els.heroConcept.textContent = project.meta.concept.trim() || "한 줄 기획을 입력해 보세요.";
    els.heroSpaceCount.textContent = project.board.spaces.length;
    els.heroCardCount.textContent = project.cards.length;
    els.heroTopicCount.textContent = topics.length;
    els.heroMeter.style.width = `${Math.min(100, topics.length / 5 * 100)}%`;
    els.readinessScore.textContent = readiness;
    els.readinessText.textContent = readiness >= 100 ? "인쇄 준비" : readiness >= 63 ? "테스트 중" : "설계 중";
    document.querySelectorAll(".stage-button").forEach((button) => {
      button.classList.toggle("has-issue", issues.some((issue) => issue.target === button.dataset.step && issue.level === "error"));
    });
  }

  function renderPlan() {
    els.gameTitle.value = project.meta.title;
    els.gameConcept.value = project.meta.concept;
    els.gameAudience.value = project.meta.audience;
    els.gameNote.value = project.meta.note;
  }

  function typeLabel(type) { return TYPE_LABELS[type] || "일반"; }

  function renderBoard() {
    if (!project.board.spaces.some((space) => space.id === selectedSpaceId)) selectedSpaceId = project.board.spaces[0]?.id || "";
    els.boardStage.className = `board-stage is-${project.board.template}`;
    const names = { path: "경로형 보드", loop: "순환형 보드", branch: "갈림길형 보드" };
    els.boardTemplateName.textContent = names[project.board.template];
    const connectionCount = project.board.spaces.reduce((sum, space) => sum + space.next.length, 0);
    els.boardConnectionSummary.textContent = `칸 ${project.board.spaces.length}개 · 연결 ${connectionCount}개`;
    els.boardStage.replaceChildren(...project.board.spaces.map((space, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `board-space${space.id === selectedSpaceId ? " is-selected" : ""}`;
      button.dataset.id = space.id;
      button.dataset.type = space.type;
      button.style.setProperty("--space-color", space.color);
      button.setAttribute("aria-label", `${index + 1}번 ${typeLabel(space.type)} 칸, ${space.label}`);
      button.draggable = matchMedia("(min-width: 761px)").matches;
      const order = document.createElement("span"); order.className = "space-order"; order.textContent = String(index + 1).padStart(2, "0");
      const icon = document.createElement("span"); icon.className = "space-icon"; icon.textContent = space.icon;
      const label = document.createElement("b"); label.className = "space-label"; label.textContent = space.label || "문구 없음";
      const kind = document.createElement("small"); kind.className = "space-kind"; kind.textContent = typeLabel(space.type);
      button.append(order, icon, label, kind);
      if (space.next.length) {
        const line = document.createElement("i"); line.className = "space-next"; line.setAttribute("aria-hidden", "true"); button.append(line);
      }
      if (space.next.length > 1) {
        const branch = document.createElement("span"); branch.className = "space-branch-tag"; branch.textContent = `${space.next.length}갈래`; button.append(branch);
      }
      return button;
    }));
    document.querySelectorAll("[data-template]").forEach((button) => button.classList.toggle("is-active", button.dataset.template === project.board.template));
    renderSpaceInspector();
  }

  function renderSpaceInspector() {
    const index = project.board.spaces.findIndex((space) => space.id === selectedSpaceId);
    const space = project.board.spaces[index];
    if (!space) {
      els.spaceInspector.hidden = true;
      return;
    }
    els.spaceInspector.hidden = false;
    els.selectedSpaceOrder.textContent = `${index + 1} / ${project.board.spaces.length}`;
    els.spaceType.value = space.type;
    els.spaceLabel.value = space.label;
    els.spaceIcon.value = space.icon;
    els.spaceColor.value = space.color;
    els.moveSpaceBack.disabled = index === 0;
    els.moveSpaceForward.disabled = index === project.board.spaces.length - 1;
    els.deleteSpaceButton.disabled = project.board.spaces.length <= 2;
    els.connectionPicker.replaceChildren(...project.board.spaces.filter((candidate) => candidate.id !== space.id).map((candidate) => {
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = candidate.id;
      checkbox.checked = space.next.includes(candidate.id);
      const name = document.createElement("span");
      const order = project.board.spaces.findIndex((item) => item.id === candidate.id) + 1;
      name.textContent = `${order}. ${candidate.label}`;
      label.append(checkbox, name);
      return label;
    }));
  }

  function moveSpace(fromIndex, toIndex) {
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= project.board.spaces.length || toIndex >= project.board.spaces.length || fromIndex === toIndex) return;
    const spaces = [...project.board.spaces];
    const [moved] = spaces.splice(fromIndex, 1);
    spaces.splice(toIndex, 0, moved);
    project.board.spaces = logic.rebuildBoardConnections(spaces, project.board.template);
    scheduleSave(); renderBoard(); renderSummary();
  }

  function leastUsedTopic() {
    const counts = Object.fromEntries(logic.TOPICS.map((topic) => [topic, 0]));
    project.cards.forEach((card) => { counts[card.topic] += 1; });
    return logic.TOPICS.reduce((best, topic) => counts[topic] < counts[best] ? topic : best, logic.TOPICS[0]);
  }

  function renderTopicDashboard() {
    const topics = logic.usedTopics(project);
    els.topicCount.textContent = topics.length;
    els.topicChips.replaceChildren(...logic.TOPICS.map((topic) => {
      const chip = document.createElement("span");
      chip.textContent = topic;
      chip.classList.toggle("is-used", topics.includes(topic));
      return chip;
    }));
  }

  function renderCardList() {
    if (!project.cards.some((card) => card.id === selectedCardId)) selectedCardId = project.cards[0]?.id || "";
    els.cardCount.textContent = project.cards.length;
    els.cardList.replaceChildren(...project.cards.map((card, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `deck-card${card.id === selectedCardId ? " is-selected" : ""}`;
      button.dataset.cardId = card.id;
      const number = document.createElement("span"); number.textContent = String(index + 1).padStart(2, "0");
      const copy = document.createElement("div");
      const title = document.createElement("b"); title.textContent = card.question.trim() || "내용 없는 카드";
      const meta = document.createElement("small"); meta.textContent = `${card.topic} · ${CARD_LABELS[card.type]}`;
      copy.append(title, meta);
      const point = document.createElement("i"); point.textContent = `${card.points}점`;
      button.append(number, copy, point);
      return button;
    }));
  }

  function renderCardEditor() {
    const index = project.cards.findIndex((card) => card.id === selectedCardId);
    const card = project.cards[index];
    els.emptyCardEditor.hidden = Boolean(card);
    els.cardEditorFields.hidden = !card;
    if (!card) return;
    els.cardEditorTitle.textContent = `카드 ${index + 1}`;
    els.cardType.value = card.type;
    els.cardTopic.value = card.topic;
    els.cardQuestion.value = card.question;
    els.cardChoices.value = card.choices.join("\n");
    els.cardAnswer.value = card.answer;
    els.cardHint.value = card.hint;
    els.cardSolution.value = card.solution;
    els.cardDifficulty.value = card.difficulty;
    els.cardPoints.value = card.points;
    els.choicesField.hidden = card.type !== "choice";
    els.cardAnswer.closest("label").hidden = card.type === "action";
    renderMathPreview();
  }

  function renderMathPreview() {
    const content = logic.mathDisplay(els.cardQuestion.value.trim());
    els.mathPreview.textContent = content || "카드 내용을 입력하세요.";
  }

  function renderCards() {
    renderTopicDashboard();
    renderCardList();
    renderCardEditor();
  }

  function renderRules() {
    Object.entries(project.rules).forEach(([key, value]) => { if (els[key]) els[key].value = value; });
    ["Math", "Fun", "Finish"].forEach((suffix) => {
      const key = suffix.toLowerCase();
      const input = els[`quality${suffix}`];
      input.value = project.quality[key];
      updateQualityOutput(input);
    });
    renderIssues();
  }

  function updateQualityOutput(input) {
    const labels = ["", "초안", "보통", "좋음", "완성"];
    const output = input.closest("label").querySelector("output");
    output.textContent = `${input.value} · ${labels[Number(input.value)]}`;
  }

  function renderIssues() {
    const issues = logic.validateProject(project);
    const errors = issues.filter((issue) => issue.level === "error").length;
    const warnings = issues.filter((issue) => issue.level === "warning").length;
    els.checkerSummary.replaceChildren();
    const label = document.createElement("span"); label.textContent = errors ? "먼저 고칠 오류" : warnings ? "확인할 제안" : "설계 검사 완료";
    const count = document.createElement("b"); count.textContent = errors ? `${errors}개` : warnings ? `${warnings}개` : "통과";
    els.checkerSummary.append(label, count);
    if (!issues.length) {
      const clear = document.createElement("li"); clear.className = "is-clear"; clear.textContent = "필수 오류를 찾지 못했습니다. 이제 실제 플레이로 재미와 예외 상황을 확인하세요.";
      els.issueList.replaceChildren(clear);
    } else {
      els.issueList.replaceChildren(...issues.map((issue) => {
        const item = document.createElement("li"); item.dataset.level = issue.level; item.textContent = issue.message; return item;
      }));
    }
    renderSummary();
  }

  function renderPlay() {
    els.playWorkspace.hidden = !play;
    if (!play) return;
    const active = play.players[play.currentPlayer];
    const spaceMap = new Map(project.board.spaces.map((space) => [space.id, space]));
    els.playerStrip.replaceChildren(...play.players.map((player, index) => {
      const item = document.createElement("div");
      item.className = `player-token${index === play.currentPlayer ? " is-active" : ""}`;
      item.style.setProperty("--player-color", player.color);
      const token = document.createElement("span"); token.textContent = index + 1;
      const name = document.createElement("b"); name.textContent = `${player.name}${play.winnerId === player.id ? " · 승자" : ""}`;
      const detail = document.createElement("small"); detail.textContent = `${spaceMap.get(player.spaceId)?.label || "연결 없음"} · ${player.score}점`;
      item.append(token, name, detail); return item;
    }));
    els.turnBadge.textContent = `${play.turn}턴`;
    els.activePlayerName.textContent = active.name;
    els.activePlayerScore.textContent = `${active.score}점`;
    const currentSpace = spaceMap.get(active.spaceId);
    const branch = currentSpace?.next?.length > 1 ? currentSpace : null;
    els.branchField.hidden = !branch;
    if (branch) {
      els.branchTarget.replaceChildren(...branch.next.map((id) => {
        const option = document.createElement("option"); option.value = id; option.textContent = spaceMap.get(id)?.label || "연결 끊김"; return option;
      }));
    }
    els.playLog.replaceChildren(...play.log.slice().reverse().map((entry) => { const item = document.createElement("li"); item.textContent = entry.text; return item; }));
    renderDrawnCard();
  }

  function renderDrawnCard() {
    els.drawnCardEmpty.hidden = Boolean(drawnCard);
    els.drawnCard.hidden = !drawnCard;
    if (!drawnCard) return;
    els.drawnTopic.textContent = `${drawnCard.topic} · ${CARD_LABELS[drawnCard.type]}`;
    els.drawnPoints.textContent = `${drawnCard.points}점`;
    els.drawnQuestion.textContent = logic.mathDisplay(drawnCard.question);
    els.playAnswer.value = selectedPlayAnswer;
    els.playAnswerField.hidden = drawnCard.type === "action" || drawnCard.type === "choice";
    els.autoJudgeButton.hidden = !logic.canAutoJudge(drawnCard);
    els.answerOptions.replaceChildren();
    if (drawnCard.type === "choice") {
      const options = document.createElement("div"); options.className = "play-options";
      drawnCard.choices.forEach((choice) => {
        const button = document.createElement("button"); button.type = "button"; button.dataset.answerChoice = choice; button.textContent = choice; button.classList.toggle("is-selected", selectedPlayAnswer === choice); options.append(button);
      });
      els.answerOptions.append(options);
    }
    [els.autoJudgeButton, els.markCorrectButton, els.markWrongButton].forEach((button) => { button.disabled = cardResolved; });
  }

  function resolveDrawnCard(correct, reason) {
    if (!play || !drawnCard || cardResolved) return;
    const player = play.players[play.currentPlayer];
    cardResolved = true;
    if (correct) play = logic.adjustScore(play, drawnCard.points, play.currentPlayer, `${drawnCard.topic} 카드 정답`);
    else play = logic.addLog(play, `${player.name}: ${drawnCard.topic} 카드 오답 · 오답 규칙은 진행자가 적용`);
    els.answerFeedback.textContent = reason || (correct ? `${drawnCard.points}점을 반영했습니다.` : "오답으로 기록했습니다. 사용자 오답 규칙은 수동 적용하세요.");
    els.answerFeedback.className = `answer-feedback ${correct ? "is-correct" : "is-wrong"}`;
    renderPlay();
  }

  function renderFinalCheck() {
    const issues = logic.validateProject(project);
    const errors = issues.filter((issue) => issue.level === "error");
    const warnings = issues.filter((issue) => issue.level === "warning");
    if (!errors.length && !warnings.length) {
      els.finalCheckIcon.textContent = "✓";
      els.finalCheckTitle.textContent = "제작 꾸러미를 꺼낼 준비가 됐습니다.";
      els.finalCheckText.textContent = "검사기가 필수 오류를 찾지 못했습니다. 인쇄 전에 실제 모둠 플레이로 최종 확인하세요.";
      els.fixIssuesButton.hidden = true;
    } else {
      els.finalCheckIcon.textContent = errors.length ? "!" : "?";
      els.finalCheckTitle.textContent = errors.length ? `필수 오류 ${errors.length}개를 먼저 고쳐 주세요.` : `확인할 제안이 ${warnings.length}개 있습니다.`;
      els.finalCheckText.textContent = (errors[0] || warnings[0])?.message || "검사 결과를 확인하세요.";
      els.fixIssuesButton.hidden = false;
    }
  }

  function renderAll() {
    renderPlan(); renderBoard(); renderCards(); renderRules(); renderSummary(); renderPlay(); renderFinalCheck();
  }

  function updateMeta() {
    project.meta.title = els.gameTitle.value.slice(0, 80);
    project.meta.concept = els.gameConcept.value.slice(0, 500);
    project.meta.audience = els.gameAudience.value.slice(0, 120);
    project.meta.note = els.gameNote.value.slice(0, 800);
    scheduleSave(); renderSummary();
  }

  function currentSpace() { return project.board.spaces.find((space) => space.id === selectedSpaceId); }
  function currentCard() { return project.cards.find((card) => card.id === selectedCardId); }

  function syncCardFromEditor() {
    const card = currentCard();
    if (!card) return;
    card.type = els.cardType.value;
    card.topic = els.cardTopic.value;
    card.question = els.cardQuestion.value.slice(0, 1000);
    card.choices = els.cardChoices.value.split(/\r?\n/).map((choice) => choice.trim()).filter(Boolean).slice(0, 6);
    card.answer = els.cardAnswer.value.slice(0, 400);
    card.hint = els.cardHint.value.slice(0, 500);
    card.solution = els.cardSolution.value.slice(0, 1200);
    card.difficulty = Number(els.cardDifficulty.value);
    card.points = Math.min(100, Math.max(-50, Number(els.cardPoints.value) || 0));
    els.choicesField.hidden = card.type !== "choice";
    els.cardAnswer.closest("label").hidden = card.type === "action";
    scheduleSave(); renderMathPreview(); renderCardList(); renderTopicDashboard(); renderIssues();
  }

  function syncRules() {
    const keys = ["playersMin", "playersMax", "victoryCondition", "turnOrder", "movementMode", "movementDetail", "correctAction", "wrongAction", "collisionRule", "tieRule", "customRules"];
    keys.forEach((key) => { project.rules[key] = ["playersMin", "playersMax"].includes(key) ? Number(els[key].value) : els[key].value; });
    project.rules = logic.sanitizeRules(project.rules);
    scheduleSave(); renderIssues();
  }

  function projectBlob(shared = false) {
    const exported = logic.clone(project);
    if (shared) exported.meta.note = "";
    return new Blob([JSON.stringify(exported, null, 2)], { type: "application/json" });
  }

  function safeFilename(suffix = "") {
    return `${(project.meta.title.trim() || "미적분-보드게임").replace(/[\\/:*?"<>|]/g, "-")}${suffix}.json`;
  }

  function downloadBlob(blob, filename) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob); link.download = filename; link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function saveProject() {
    downloadBlob(projectBlob(false), safeFilename());
    showToast("전체 제작 프로젝트를 JSON으로 저장했습니다.");
  }

  async function shareProject() {
    const file = new File([projectBlob(true)], safeFilename("-공유용"), { type: "application/json" });
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      try { await navigator.share({ title: project.meta.title, text: "미적분 보드게임 제작 프로젝트", files: [file] }); showToast("공유 창을 열었습니다. 모둠 메모는 제외했습니다."); return; } catch (error) { if (error.name === "AbortError") return; }
    }
    downloadBlob(file, file.name);
    showToast("공유용 JSON을 저장했습니다. 모둠 메모는 제외했습니다.");
  }

  async function importProject(file) {
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed.kind !== "calculus-board-game-project") throw new Error("kind");
      project = logic.sanitizeProject(parsed);
      selectedSpaceId = project.board.spaces[0]?.id || "";
      selectedCardId = project.cards[0]?.id || "";
      play = null; drawnCard = null;
      scheduleSave(); renderAll(); showStep("plan", false); showToast("제작 프로젝트를 불러왔습니다.");
    } catch { showToast("올바른 미적분 보드게임 JSON 파일이 아닙니다."); }
  }

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function printHeader(label) {
    const header = makeElement("header", "print-head");
    const title = document.createElement("div"); title.append(makeElement("small", "", label), makeElement("h1", "", project.meta.title));
    header.append(title, makeElement("span", "", "모둠: ____________________"));
    return header;
  }

  function boardPrintSheet() {
    const sheet = makeElement("section", "print-sheet"); sheet.append(printHeader("CALCULUS BOARD · 게임 보드"));
    sheet.append(makeElement("h2", "print-section-title", `보드 경로 · ${project.board.spaces.length}칸`));
    const grid = makeElement("div", "print-board-grid");
    project.board.spaces.forEach((space, index) => {
      const item = makeElement("div", "print-space"); item.style.setProperty("--space-color", space.color);
      const targets = space.next.map((id) => project.board.spaces.findIndex((candidate) => candidate.id === id) + 1).filter(Boolean);
      item.append(makeElement("span", "", `${index + 1} · ${typeLabel(space.type)}`), makeElement("b", "", `${space.icon} ${space.label}`), makeElement("small", "", targets.length ? `다음: ${targets.join(", ")}번 칸` : "이동 종료")); grid.append(item);
    });
    sheet.append(grid); return sheet;
  }

  function cardsPrintSheet() {
    const sheet = makeElement("section", "print-sheet"); sheet.append(printHeader("CALCULUS DECK · 문제 카드"));
    sheet.append(makeElement("h2", "print-section-title", `문제·행동 카드 ${project.cards.length}장`));
    const grid = makeElement("div", "print-card-grid");
    project.cards.forEach((card, index) => {
      const item = makeElement("article", "print-card");
      const head = document.createElement("header"); head.append(makeElement("b", "", `${String(index + 1).padStart(2, "0")} · ${card.topic}`), makeElement("span", "", `${CARD_LABELS[card.type]} · ${card.points}점`));
      item.append(head, makeElement("p", "", logic.mathDisplay(card.question || "내용 없음")));
      if (card.type === "choice" && card.choices.length) item.append(makeElement("footer", "", card.choices.map((choice, choiceIndex) => `${choiceIndex + 1}) ${choice}`).join("   ")));
      else item.append(makeElement("footer", "", card.hint ? `힌트: ${card.hint}` : "답: ______________________________"));
      grid.append(item);
    }); sheet.append(grid); return sheet;
  }

  function rulesPrintSheet() {
    const sheet = makeElement("section", "print-sheet"); sheet.append(printHeader("RULE BOOK · 게임 규칙서"));
    const rules = makeElement("div", "print-rules");
    const entries = [
      ["게임 한 줄 기획", project.meta.concept], ["인원", `${project.rules.playersMin}~${project.rules.playersMax}명`], ["승리 조건", project.rules.victoryCondition], ["턴 순서", project.rules.turnOrder],
      ["이동 방식", project.rules.movementDetail], ["정답 처리", project.rules.correctAction], ["오답 처리", project.rules.wrongAction], ["같은 칸 충돌", project.rules.collisionRule], ["동점 처리", project.rules.tieRule], ["그 밖의 규칙", project.rules.customRules],
    ];
    entries.forEach(([label, value]) => { const rule = makeElement("div", "print-rule"); rule.append(makeElement("b", "", label), makeElement("p", "", value || "아직 정하지 않음")); rules.append(rule); });
    sheet.append(makeElement("h2", "print-section-title", "게임 규칙"), rules); return sheet;
  }

  function answersPrintSheet() {
    const sheet = makeElement("section", "print-sheet"); sheet.append(printHeader("TEACHER KEY · 정답 및 해설"));
    project.cards.forEach((card, index) => {
      const item = makeElement("article", "print-answer");
      item.append(makeElement("h3", "", `${index + 1}. [${card.topic}] ${logic.mathDisplay(card.question || "내용 없음")}`));
      item.append(makeElement("p", "", `정답: ${card.type === "action" ? "모둠/교사 판정" : card.answer || "등록되지 않음"}`));
      item.append(makeElement("p", "", `해설: ${card.solution || "등록되지 않음"}`)); sheet.append(item);
    }); return sheet;
  }

  function printProject(mode) {
    const builders = { board: boardPrintSheet, cards: cardsPrintSheet, rules: rulesPrintSheet, answers: answersPrintSheet };
    const modes = mode === "all" ? ["board", "cards", "rules", "answers"] : [mode];
    els.printRoot.replaceChildren(...modes.map((key) => builders[key]()));
    els.printRoot.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => window.print());
  }

  function bindEvents() {
    document.querySelectorAll(".stage-button").forEach((button) => button.addEventListener("click", () => showStep(button.dataset.step)));
    document.querySelectorAll("[data-next]").forEach((button) => button.addEventListener("click", () => showStep(button.dataset.next)));
    [els.gameTitle, els.gameConcept, els.gameAudience, els.gameNote].forEach((input) => input.addEventListener("input", updateMeta));
    els.headerPlayButton.addEventListener("click", () => showStep("play"));
    els.manualButton.addEventListener("click", openManual);
    els.manualModal.querySelectorAll("[data-manual-close]").forEach((element) => element.addEventListener("click", closeManual));
    document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !els.manualModal.hidden) closeManual(); });

    els.loadTutorialButton.addEventListener("click", () => {
      if (!confirm("현재 프로젝트를 튜토리얼 예제로 바꿀까요?")) return;
      project = tutorialProject(); selectedSpaceId = project.board.spaces[0].id; selectedCardId = project.cards[0].id; play = null; drawnCard = null; scheduleSave(); renderAll(); showToast("튜토리얼을 불러왔습니다. 문구와 규칙을 바꿔 보세요.");
    });
    els.newProjectButton.addEventListener("click", () => {
      if (!confirm("현재 프로젝트를 지우고 빈 프로젝트를 시작할까요?")) return;
      project = blankProject(); selectedSpaceId = project.board.spaces[0].id; selectedCardId = ""; play = null; drawnCard = null; scheduleSave(); renderAll(); showStep("plan", false); showToast("빈 프로젝트를 시작했습니다.");
    });

    document.querySelectorAll("[data-template]").forEach((button) => button.addEventListener("click", () => {
      project.board = logic.createBoardTemplate(button.dataset.template); selectedSpaceId = project.board.spaces[0].id; play = null; scheduleSave(); renderBoard(); renderIssues(); showToast(`${button.querySelector("b").textContent} 뼈대를 적용했습니다.`);
    }));
    els.boardStage.addEventListener("click", (event) => {
      const space = event.target.closest(".board-space"); if (!space) return; selectedSpaceId = space.dataset.id; renderBoard();
    });
    els.boardStage.addEventListener("dragstart", (event) => { const space = event.target.closest(".board-space"); if (!space) return; dragSpaceId = space.dataset.id; space.classList.add("is-dragging"); event.dataTransfer.effectAllowed = "move"; });
    els.boardStage.addEventListener("dragover", (event) => { if (event.target.closest(".board-space")) event.preventDefault(); });
    els.boardStage.addEventListener("drop", (event) => { event.preventDefault(); const target = event.target.closest(".board-space"); const from = project.board.spaces.findIndex((space) => space.id === dragSpaceId); const to = project.board.spaces.findIndex((space) => space.id === target?.dataset.id); moveSpace(from, to); });
    els.boardStage.addEventListener("dragend", () => { dragSpaceId = ""; document.querySelectorAll(".is-dragging").forEach((item) => item.classList.remove("is-dragging")); });
    els.spaceType.addEventListener("change", () => { const space = currentSpace(); if (!space) return; const old = space.type; space.type = els.spaceType.value; if (space.color === logic.DEFAULT_COLORS[old]) space.color = logic.DEFAULT_COLORS[space.type]; if (space.icon === logic.DEFAULT_ICONS[old]) space.icon = logic.DEFAULT_ICONS[space.type]; scheduleSave(); renderBoard(); renderIssues(); });
    els.spaceLabel.addEventListener("input", () => { const space = currentSpace(); if (!space) return; space.label = els.spaceLabel.value.slice(0, 40); scheduleSave(); renderBoard(); renderSummary(); els.spaceLabel.focus(); els.spaceLabel.setSelectionRange(els.spaceLabel.value.length, els.spaceLabel.value.length); });
    els.spaceIcon.addEventListener("input", () => { const space = currentSpace(); if (!space) return; space.icon = els.spaceIcon.value.slice(0, 8); scheduleSave(); renderBoard(); els.spaceIcon.focus(); });
    els.spaceColor.addEventListener("input", () => { const space = currentSpace(); if (!space) return; space.color = els.spaceColor.value; scheduleSave(); renderBoard(); });
    els.connectionPicker.addEventListener("change", () => { const space = currentSpace(); if (!space) return; space.next = [...els.connectionPicker.querySelectorAll("input:checked")].map((input) => input.value); scheduleSave(); renderBoard(); renderIssues(); });
    els.moveSpaceBack.addEventListener("click", () => { const index = project.board.spaces.findIndex((space) => space.id === selectedSpaceId); moveSpace(index, index - 1); });
    els.moveSpaceForward.addEventListener("click", () => { const index = project.board.spaces.findIndex((space) => space.id === selectedSpaceId); moveSpace(index, index + 1); });
    els.addSpaceButton.addEventListener("click", () => { const index = Math.max(0, project.board.spaces.findIndex((space) => space.id === selectedSpaceId)); const newSpace = { id: uid("space"), type: "normal", label: "새 칸", color: logic.DEFAULT_COLORS.normal, icon: "·", next: [] }; const spaces = [...project.board.spaces]; spaces.splice(index + 1, 0, newSpace); project.board.spaces = logic.rebuildBoardConnections(spaces, project.board.template); selectedSpaceId = newSpace.id; scheduleSave(); renderBoard(); renderIssues(); });
    els.deleteSpaceButton.addEventListener("click", () => { if (project.board.spaces.length <= 2) return; const index = project.board.spaces.findIndex((space) => space.id === selectedSpaceId); const spaces = project.board.spaces.filter((space) => space.id !== selectedSpaceId); project.board.spaces = logic.rebuildBoardConnections(spaces, project.board.template); selectedSpaceId = project.board.spaces[Math.min(index, project.board.spaces.length - 1)].id; scheduleSave(); renderBoard(); renderIssues(); });

    els.cardTopic.replaceChildren(...logic.TOPICS.map((topic) => { const option = document.createElement("option"); option.value = topic; option.textContent = topic; return option; }));
    els.addCardButton.addEventListener("click", () => { const card = { id: uid("card"), type: "short", topic: leastUsedTopic(), question: "", answer: "", solution: "", hint: "", difficulty: 2, points: 3, choices: [] }; project.cards.push(card); selectedCardId = card.id; scheduleSave(); renderCards(); renderIssues(); window.setTimeout(() => els.cardQuestion.focus(), 50); });
    els.cardList.addEventListener("click", (event) => { const card = event.target.closest("[data-card-id]"); if (!card) return; selectedCardId = card.dataset.cardId; renderCards(); });
    [els.cardType, els.cardTopic, els.cardQuestion, els.cardChoices, els.cardAnswer, els.cardHint, els.cardSolution, els.cardDifficulty, els.cardPoints].forEach((input) => { input.addEventListener("input", syncCardFromEditor); input.addEventListener("change", syncCardFromEditor); });
    document.querySelectorAll("[data-symbol]").forEach((button) => button.addEventListener("click", () => { const input = els.cardQuestion; const start = input.selectionStart; const end = input.selectionEnd; input.setRangeText(button.dataset.symbol, start, end, "end"); input.dispatchEvent(new Event("input", { bubbles: true })); input.focus(); }));
    els.duplicateCardButton.addEventListener("click", () => { const card = currentCard(); if (!card) return; const copy = logic.clone(card); copy.id = uid("card"); copy.question = `${copy.question} (복사본)`; const index = project.cards.findIndex((item) => item.id === card.id); project.cards.splice(index + 1, 0, copy); selectedCardId = copy.id; scheduleSave(); renderCards(); renderIssues(); });
    els.deleteCardButton.addEventListener("click", () => { const index = project.cards.findIndex((card) => card.id === selectedCardId); if (index < 0) return; project.cards.splice(index, 1); selectedCardId = project.cards[Math.min(index, project.cards.length - 1)]?.id || ""; scheduleSave(); renderCards(); renderIssues(); });

    ["playersMin", "playersMax", "victoryCondition", "turnOrder", "movementMode", "movementDetail", "correctAction", "wrongAction", "collisionRule", "tieRule", "customRules"].forEach((id) => { els[id].addEventListener("input", syncRules); els[id].addEventListener("change", syncRules); });
    ["Math", "Fun", "Finish"].forEach((suffix) => els[`quality${suffix}`].addEventListener("input", (event) => { project.quality[suffix.toLowerCase()] = Number(event.target.value); updateQualityOutput(event.target); scheduleSave(); renderIssues(); }));
    els.runCheckButton.addEventListener("click", () => { renderIssues(); showToast("보드 연결·카드·규칙·점수 균형을 다시 검사했습니다."); });

    els.startPlayButton.addEventListener("click", () => { play = logic.createPlayState(project, Number(els.playPlayerCount.value)); drawnCard = null; selectedPlayAnswer = ""; cardResolved = false; renderPlay(); showToast("새 플레이 테스트를 시작했습니다."); });
    els.rollDiceButton.addEventListener("click", () => { const value = Math.floor(Math.random() * 6) + 1; els.diceFace.textContent = value; els.moveAmount.value = value; });
    els.movePlayerButton.addEventListener("click", () => { if (!play) return; const result = logic.moveCurrentPlayer(play, project.board, Number(els.moveAmount.value), els.branchTarget.value); play = result.play; renderPlay(); });
    els.drawCardButton.addEventListener("click", () => { if (!play) return; drawnCard = logic.drawCard(project.cards); selectedPlayAnswer = ""; cardResolved = false; els.answerFeedback.textContent = ""; els.answerFeedback.className = "answer-feedback"; els.solutionBox.hidden = true; if (!drawnCard) showToast("내용이 입력된 카드가 없습니다."); renderDrawnCard(); });
    els.answerOptions.addEventListener("click", (event) => { const button = event.target.closest("[data-answer-choice]"); if (!button) return; selectedPlayAnswer = button.dataset.answerChoice; renderDrawnCard(); });
    els.playAnswer.addEventListener("input", () => { selectedPlayAnswer = els.playAnswer.value; });
    els.autoJudgeButton.addEventListener("click", () => { if (!drawnCard) return; const result = logic.judgeAnswer(drawnCard, selectedPlayAnswer); if (!result.supported) { els.answerFeedback.textContent = result.message; return; } resolveDrawnCard(result.correct, result.message + (result.correct ? ` ${drawnCard.points}점을 반영했습니다.` : "")); });
    els.markCorrectButton.addEventListener("click", () => resolveDrawnCard(true));
    els.markWrongButton.addEventListener("click", () => resolveDrawnCard(false));
    els.revealSolutionButton.addEventListener("click", () => { if (!drawnCard) return; els.solutionBox.textContent = `정답: ${drawnCard.type === "action" ? "직접 판정" : drawnCard.answer || "미등록"}\n해설: ${drawnCard.solution || "미등록"}`; els.solutionBox.hidden = false; });
    els.nextTurnButton.addEventListener("click", () => { if (!play) return; play = logic.nextTurn(play); drawnCard = null; selectedPlayAnswer = ""; cardResolved = false; els.diceFace.textContent = "?"; renderPlay(); });
    document.querySelector(".manual-controls").addEventListener("click", (event) => { const button = event.target.closest("[data-score]"); if (!button || !play) return; play = logic.adjustScore(play, Number(button.dataset.score)); renderPlay(); });
    els.manualWinnerButton.addEventListener("click", () => { if (!play) return; const winner = play.players[play.currentPlayer]; play.winnerId = winner.id; play = logic.addLog(play, `${winner.name}: 진행자가 승자로 표시`); renderPlay(); });

    els.saveProjectButton.addEventListener("click", saveProject);
    els.shareProjectButton.addEventListener("click", shareProject);
    els.loadProjectInput.addEventListener("change", (event) => { const [file] = event.target.files; if (file) importProject(file); event.target.value = ""; });
    document.querySelectorAll("[data-print]").forEach((button) => button.addEventListener("click", () => printProject(button.dataset.print)));
    window.addEventListener("afterprint", () => { els.printRoot.setAttribute("aria-hidden", "true"); });
  }

  renderAll();
  bindEvents();
  const initialStep = STEP_ORDER.includes(location.hash.slice(1)) ? location.hash.slice(1) : "plan";
  showStep(initialStep, false);
  if (new URLSearchParams(location.search).get("manual") === "1") openManual();
})();
