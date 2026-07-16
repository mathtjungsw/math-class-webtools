(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.BoardGameLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION = 1;
  const TOPICS = [
    "극한", "미분계수", "도함수", "접선", "증가·감소",
    "극대·극소", "최댓값·최솟값", "부정적분", "정적분", "넓이",
  ];
  const SPACE_TYPES = ["start", "finish", "problem", "event", "reward", "penalty", "normal"];
  const CARD_TYPES = ["choice", "short", "explain", "action"];
  const DEFAULT_COLORS = {
    start: "#146c5b", finish: "#173f72", problem: "#ffcf5a", event: "#7b68c7",
    reward: "#55b98b", penalty: "#e56a54", normal: "#f4efe4",
  };
  const DEFAULT_ICONS = {
    start: "출발", finish: "도착", problem: "?", event: "!", reward: "+", penalty: "−", normal: "·",
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function text(value, maxLength, fallback = "") {
    const result = typeof value === "string" ? value : fallback;
    return result.slice(0, maxLength);
  }

  function numberIn(value, min, max, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
  }

  function makeSpace(index, type = "normal", label = "") {
    return {
      id: `space-${index + 1}`,
      type,
      label: label || ({ start: "출발", finish: "도착", problem: "문제", event: "사건", reward: "보상", penalty: "벌칙" }[type] || `${index + 1}칸`),
      color: DEFAULT_COLORS[type] || DEFAULT_COLORS.normal,
      icon: DEFAULT_ICONS[type] || DEFAULT_ICONS.normal,
      next: [],
    };
  }

  function rebuildBoardConnections(inputSpaces, template = "path") {
    const spaces = clone(inputSpaces);
    spaces.forEach((space) => { space.next = []; });
    if (spaces.length < 2) return spaces;

    if (template === "loop") {
      spaces.forEach((space, index) => { space.next = [spaces[(index + 1) % spaces.length].id]; });
      return spaces;
    }

    if (template === "branch" && spaces.length >= 8) {
      const split = 2;
      const rightStart = Math.ceil(spaces.length / 2);
      const join = spaces.length - 3;
      for (let index = 0; index < split; index += 1) spaces[index].next = [spaces[index + 1].id];
      spaces[split].next = [spaces[split + 1].id, spaces[rightStart].id];
      for (let index = split + 1; index < rightStart - 1; index += 1) spaces[index].next = [spaces[index + 1].id];
      spaces[rightStart - 1].next = [spaces[join].id];
      for (let index = rightStart; index < join - 1; index += 1) spaces[index].next = [spaces[index + 1].id];
      spaces[join - 1].next = [spaces[join].id];
      for (let index = join; index < spaces.length - 1; index += 1) spaces[index].next = [spaces[index + 1].id];
      return spaces;
    }

    spaces.forEach((space, index) => { space.next = index < spaces.length - 1 ? [spaces[index + 1].id] : []; });
    return spaces;
  }

  function createBoardTemplate(template = "path") {
    const mode = ["path", "loop", "branch"].includes(template) ? template : "path";
    const patterns = {
      path: ["start", "normal", "problem", "event", "problem", "reward", "normal", "problem", "penalty", "problem", "event", "problem", "normal", "finish"],
      loop: ["start", "problem", "normal", "event", "problem", "reward", "normal", "problem", "penalty", "problem", "event", "finish"],
      branch: ["start", "normal", "event", "problem", "reward", "problem", "penalty", "problem", "reward", "problem", "event", "finish"],
    };
    const spaces = patterns[mode].map((type, index) => makeSpace(index, type));
    if (mode === "branch") spaces[2].label = "갈림길";
    return { template: mode, spaces: rebuildBoardConnections(spaces, mode) };
  }

  function sanitizeSpace(space, index, usedIds) {
    let id = text(space?.id, 80, `space-${index + 1}`).trim() || `space-${index + 1}`;
    while (usedIds.has(id)) id = `${id}-${index + 1}`;
    usedIds.add(id);
    const type = SPACE_TYPES.includes(space?.type) ? space.type : "normal";
    return {
      id,
      type,
      label: text(space?.label, 40, `${index + 1}칸`),
      color: /^#[0-9a-f]{6}$/i.test(space?.color || "") ? space.color : DEFAULT_COLORS[type],
      icon: text(space?.icon, 8, DEFAULT_ICONS[type]),
      next: Array.isArray(space?.next) ? [...new Set(space.next.filter((id) => typeof id === "string"))].slice(0, 6) : [],
    };
  }

  function sanitizeCard(card, index) {
    const type = CARD_TYPES.includes(card?.type) ? card.type : "short";
    const topic = TOPICS.includes(card?.topic) ? card.topic : TOPICS[0];
    return {
      id: text(card?.id, 80, `card-${index + 1}`).trim() || `card-${index + 1}`,
      type,
      topic,
      question: text(card?.question, 1000),
      answer: text(card?.answer, 400),
      solution: text(card?.solution, 1200),
      hint: text(card?.hint, 500),
      difficulty: Math.round(numberIn(card?.difficulty, 1, 3, 2)),
      points: Math.round(numberIn(card?.points, -50, 100, type === "action" ? 0 : 2)),
      choices: Array.isArray(card?.choices)
        ? card.choices.map((choice) => text(choice, 160)).filter(Boolean).slice(0, 6)
        : text(card?.choices, 1000).split(/\r?\n/).map((choice) => choice.trim()).filter(Boolean).slice(0, 6),
    };
  }

  function sanitizeRules(rules = {}) {
    const playersMin = Math.round(numberIn(rules.playersMin, 2, 6, 2));
    return {
      playersMin,
      playersMax: Math.round(numberIn(rules.playersMax, playersMin, 6, Math.max(playersMin, 4))),
      victoryCondition: text(rules.victoryCondition, 500),
      turnOrder: text(rules.turnOrder, 500),
      movementMode: ["dice", "fixed", "custom"].includes(rules.movementMode) ? rules.movementMode : "dice",
      movementDetail: text(rules.movementDetail, 500),
      correctAction: text(rules.correctAction, 500),
      wrongAction: text(rules.wrongAction, 500),
      collisionRule: text(rules.collisionRule, 500),
      tieRule: text(rules.tieRule, 500),
      customRules: text(rules.customRules, 1600),
    };
  }

  function sanitizeProject(project = {}) {
    const template = ["path", "loop", "branch"].includes(project?.board?.template) ? project.board.template : "path";
    const usedIds = new Set();
    let spaces = Array.isArray(project?.board?.spaces)
      ? project.board.spaces.slice(0, 80).map((space, index) => sanitizeSpace(space, index, usedIds))
      : [];
    if (!spaces.length) spaces = createBoardTemplate(template).spaces;
    const validIds = new Set(spaces.map((space) => space.id));
    spaces.forEach((space) => { space.next = space.next.filter((id) => validIds.has(id) && id !== space.id); });

    const cards = Array.isArray(project.cards) ? project.cards.slice(0, 120).map(sanitizeCard) : [];
    const cardIds = new Set();
    cards.forEach((card, index) => {
      while (cardIds.has(card.id)) card.id = `${card.id}-${index + 1}`;
      cardIds.add(card.id);
    });

    return {
      version: VERSION,
      kind: "calculus-board-game-project",
      meta: {
        title: text(project?.meta?.title, 80, "나의 미적분 보드게임"),
        concept: text(project?.meta?.concept, 500),
        audience: text(project?.meta?.audience, 120, "고등학교 미적분 학습 모둠"),
        note: text(project?.meta?.note, 800),
      },
      board: { template, spaces },
      cards,
      rules: sanitizeRules(project.rules),
      quality: {
        math: Math.round(numberIn(project?.quality?.math, 1, 4, 2)),
        fun: Math.round(numberIn(project?.quality?.fun, 1, 4, 2)),
        finish: Math.round(numberIn(project?.quality?.finish, 1, 4, 2)),
        checks: Array.isArray(project?.quality?.checks) ? project.quality.checks.filter(Boolean).map(String).slice(0, 12) : [],
      },
    };
  }

  function usedTopics(project) {
    return [...new Set((project.cards || []).filter((card) => card.question.trim()).map((card) => card.topic))];
  }

  function reachableSpaceIds(board) {
    const spaces = board?.spaces || [];
    const starts = spaces.filter((space) => space.type === "start");
    const map = new Map(spaces.map((space) => [space.id, space]));
    const queue = starts.map((space) => space.id);
    const visited = new Set(queue);
    while (queue.length) {
      const current = map.get(queue.shift());
      (current?.next || []).forEach((id) => {
        if (map.has(id) && !visited.has(id)) { visited.add(id); queue.push(id); }
      });
    }
    return visited;
  }

  function getUnreachableSpaceIds(board) {
    const reachable = reachableSpaceIds(board);
    return (board?.spaces || []).filter((space) => !reachable.has(space.id)).map((space) => space.id);
  }

  function validateProject(rawProject) {
    const project = sanitizeProject(rawProject);
    const issues = [];
    const add = (level, code, message, target) => issues.push({ level, code, message, target });
    const starts = project.board.spaces.filter((space) => space.type === "start");
    const finishes = project.board.spaces.filter((space) => space.type === "finish");

    if (!project.meta.title.trim()) add("warning", "missing-title", "게임 제목을 정해 주세요.", "plan");
    if (!project.meta.concept.trim()) add("warning", "missing-concept", "어떤 재미와 학습 경험을 만들지 한 문장으로 적어 주세요.", "plan");
    if (!starts.length) add("error", "missing-start", "출발 칸이 없습니다.", "board");
    if (starts.length > 1) add("warning", "multiple-starts", "출발 칸은 하나만 두는 편이 명확합니다.", "board");
    if (!finishes.length) add("error", "missing-finish", "도착 칸이 없습니다.", "board");

    const unreachable = getUnreachableSpaceIds(project.board);
    if (unreachable.length) add("error", "unreachable-spaces", `출발 칸에서 갈 수 없는 칸이 ${unreachable.length}개 있습니다.`, "board");
    const deadEnds = project.board.spaces.filter((space) => space.type !== "finish" && space.next.length === 0);
    if (deadEnds.length) add("warning", "dead-ends", `도착이 아닌데 다음 연결이 없는 칸이 ${deadEnds.length}개 있습니다.`, "board");

    if (!project.cards.length) add("error", "no-cards", "문제 또는 행동 카드를 한 장 이상 만들어 주세요.", "cards");
    const blankQuestions = project.cards.filter((card) => !card.question.trim());
    if (blankQuestions.length) add("warning", "blank-questions", `내용이 비어 있는 카드가 ${blankQuestions.length}장 있습니다.`, "cards");
    const missingAnswers = project.cards.filter((card) => card.type !== "action" && card.question.trim() && !card.answer.trim());
    if (missingAnswers.length) add("error", "missing-answers", `정답이 없는 문제 카드가 ${missingAnswers.length}장 있습니다.`, "cards");
    const badChoices = project.cards.filter((card) => card.type === "choice" && (card.choices.length < 2 || (card.answer.trim() && !card.choices.some((choice) => normalizeAnswer(choice) === normalizeAnswer(card.answer)))));
    if (badChoices.length) add("error", "invalid-choices", `선택지나 정답 선택을 다시 확인할 객관식 카드가 ${badChoices.length}장 있습니다.`, "cards");

    const topics = usedTopics(project);
    if (topics.length < 5) add("warning", "topic-coverage", `미적분 하위 주제를 ${topics.length}개 사용했습니다. 최소 5개를 목표로 해 보세요.`, "cards");
    const scored = project.cards.filter((card) => card.type !== "action" && card.question.trim());
    if (scored.length > 1) {
      const values = scored.map((card) => card.points);
      const min = Math.min(...values);
      const max = Math.max(...values);
      if (max - min >= 6 || (min > 0 && max > min * 3)) add("warning", "point-imbalance", `문제 점수가 ${min}점부터 ${max}점까지 벌어져 있습니다. 난이도와 보상을 비교해 보세요.`, "cards");
      if (scored.some((card) => card.difficulty === 1 && scored.some((other) => other.difficulty === 3 && card.points > other.points))) add("warning", "difficulty-points", "쉬운 문제의 점수가 어려운 문제보다 높은 경우가 있습니다.", "cards");
    }

    const ruleFields = ["victoryCondition", "turnOrder", "movementDetail", "correctAction", "wrongAction", "collisionRule", "tieRule"];
    const missingRules = ruleFields.filter((field) => !project.rules[field].trim());
    if (missingRules.length) add("warning", "missing-rules", `필수 규칙 항목 ${missingRules.length}개가 비어 있습니다.`, "rules");
    if (project.quality.math < 3 || project.quality.fun < 3 || project.quality.finish < 3) add("info", "self-check", "수학적 내용·흥미·완성도 중 더 다듬을 항목이 표시되어 있습니다.", "rules");

    const rank = { error: 0, warning: 1, info: 2 };
    return issues.sort((a, b) => rank[a.level] - rank[b.level]);
  }

  function normalizeAnswer(value) {
    return String(value ?? "").normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
  }

  function canAutoJudge(card) {
    return Boolean(card && ["choice", "short"].includes(card.type) && card.answer?.trim());
  }

  function judgeAnswer(card, submitted) {
    if (!canAutoJudge(card)) return { supported: false, correct: null, message: "설명형·행동 카드는 모둠이 직접 판정합니다." };
    const accepted = card.answer.split("|").map(normalizeAnswer).filter(Boolean);
    const correct = accepted.includes(normalizeAnswer(submitted));
    return { supported: true, correct, message: correct ? "입력한 답이 등록된 정답과 정확히 같습니다." : "등록된 정답과 정확히 일치하지 않습니다. 식의 동치는 자동 판정하지 않습니다." };
  }

  function createPlayState(project, playerCount = 2) {
    const clean = sanitizeProject(project);
    const count = Math.round(numberIn(playerCount, 2, 6, 2));
    const start = clean.board.spaces.find((space) => space.type === "start") || clean.board.spaces[0];
    return {
      players: Array.from({ length: count }, (_, index) => ({ id: `player-${index + 1}`, name: `${index + 1}번 말`, color: ["#e45d48", "#246fa8", "#19805e", "#7d58b3", "#c07913", "#c04478"][index], spaceId: start?.id || "", score: 0, finished: false })),
      currentPlayer: 0,
      turn: 1,
      lastRoll: null,
      drawnCardId: null,
      log: [{ id: "log-1", text: `${count}명 플레이 테스트를 시작했습니다.` }],
      winnerId: null,
    };
  }

  function addLog(play, message) {
    const next = clone(play);
    next.log.push({ id: `log-${Date.now()}-${next.log.length}`, text: String(message).slice(0, 240) });
    next.log = next.log.slice(-100);
    return next;
  }

  function moveCurrentPlayer(playState, board, steps, branchTarget) {
    let play = clone(playState);
    const count = Math.round(numberIn(steps, 0, 50, 0));
    const map = new Map((board?.spaces || []).map((space) => [space.id, space]));
    const player = play.players[play.currentPlayer];
    if (!player || !map.has(player.spaceId)) return { play, path: [] };
    const path = [player.spaceId];
    for (let index = 0; index < count; index += 1) {
      const current = map.get(player.spaceId);
      if (!current || current.type === "finish" || !current.next.length) break;
      let target = current.next[0];
      if (current.next.length > 1 && current.next.includes(branchTarget)) target = branchTarget;
      if (!map.has(target)) break;
      player.spaceId = target;
      path.push(target);
      if (map.get(target).type === "finish") { player.finished = true; break; }
    }
    play.lastRoll = count;
    const destination = map.get(player.spaceId);
    play = addLog(play, `${player.name}: ${count}칸 이동 → ${destination?.label || "연결 끊김"}`);
    return { play, path };
  }

  function adjustScore(playState, amount, playerIndex = playState.currentPlayer, reason = "수동 조정") {
    let play = clone(playState);
    const player = play.players[playerIndex];
    if (!player) return play;
    const delta = Math.round(numberIn(amount, -999, 999, 0));
    player.score += delta;
    play = addLog(play, `${player.name}: ${delta >= 0 ? "+" : ""}${delta}점 (${reason})`);
    return play;
  }

  function nextTurn(playState) {
    let play = clone(playState);
    if (!play.players.length) return play;
    play.currentPlayer = (play.currentPlayer + 1) % play.players.length;
    if (play.currentPlayer === 0) play.turn += 1;
    play.drawnCardId = null;
    play = addLog(play, `${play.turn}턴 · ${play.players[play.currentPlayer].name} 차례`);
    return play;
  }

  function drawCard(cards, random = Math.random, topic = "") {
    const pool = (cards || []).filter((card) => card.question.trim() && (!topic || card.topic === topic));
    if (!pool.length) return null;
    return clone(pool[Math.min(pool.length - 1, Math.floor(numberIn(random(), 0, 0.999999999, 0) * pool.length))]);
  }

  function mathDisplay(value) {
    return String(value ?? "")
      .replace(/sqrt/gi, "√")
      .replace(/\bint\b/gi, "∫")
      .replace(/->/g, "→")
      .replace(/\^0/g, "⁰").replace(/\^1/g, "¹").replace(/\^2/g, "²").replace(/\^3/g, "³")
      .replace(/\^4/g, "⁴").replace(/\^5/g, "⁵").replace(/\^6/g, "⁶").replace(/\^7/g, "⁷").replace(/\^8/g, "⁸").replace(/\^9/g, "⁹");
  }

  return {
    VERSION, TOPICS, SPACE_TYPES, CARD_TYPES, DEFAULT_COLORS, DEFAULT_ICONS,
    clone, createBoardTemplate, rebuildBoardConnections, sanitizeProject, sanitizeRules,
    usedTopics, reachableSpaceIds, getUnreachableSpaceIds, validateProject,
    normalizeAnswer, canAutoJudge, judgeAnswer, createPlayState, moveCurrentPlayer,
    adjustScore, nextTurn, drawCard, addLog, mathDisplay,
  };
});
