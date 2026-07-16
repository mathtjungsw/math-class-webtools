const test = require("node:test");
const assert = require("node:assert/strict");
const {
  TOPICS,
  createBoardTemplate,
  rebuildBoardConnections,
  sanitizeProject,
  reachableSpaceIds,
  getUnreachableSpaceIds,
  validateProject,
  judgeAnswer,
  createPlayState,
  moveCurrentPlayer,
  adjustScore,
  nextTurn,
  drawCard,
  mathDisplay,
} = require("../math-game/calculus-board-game-maker/game-logic.js");

function completeProject() {
  return sanitizeProject({
    meta: { title: "테스트 게임", concept: "미분과 적분 문제를 풀며 갈림길을 선택한다." },
    board: createBoardTemplate("branch"),
    cards: TOPICS.slice(0, 5).map((topic, index) => ({
      id: `card-${index}`,
      type: index === 0 ? "choice" : "short",
      topic,
      question: `${topic} 문제`,
      choices: index === 0 ? ["1", "2"] : [],
      answer: index === 0 ? "1" : String(index),
      solution: "풀이",
      difficulty: index % 3 + 1,
      points: index % 3 + 1,
    })),
    rules: {
      playersMin: 2,
      playersMax: 4,
      victoryCondition: "도착 후 최고 점수",
      turnOrder: "굴리고 이동하고 푼다",
      movementMode: "dice",
      movementDetail: "주사위만큼 이동",
      correctAction: "점수 획득",
      wrongAction: "그대로 있기",
      collisionRule: "함께 있기",
      tieRule: "추가 문제",
    },
    quality: { math: 4, fun: 4, finish: 4 },
  });
}

test("세 보드 템플릿은 모든 칸이 출발점에서 도달 가능하고 형태별 연결을 가진다", () => {
  const path = createBoardTemplate("path");
  const loop = createBoardTemplate("loop");
  const branch = createBoardTemplate("branch");
  assert.equal(path.spaces.length, 14);
  assert.deepEqual(path.spaces.at(-1).next, []);
  assert.equal(loop.spaces.at(-1).next[0], loop.spaces[0].id);
  assert.ok(branch.spaces.some((space) => space.next.length === 2));
  [path, loop, branch].forEach((board) => assert.equal(reachableSpaceIds(board).size, board.spaces.length));
});

test("칸 재배열 뒤 연결을 다시 만들면 순서와 갈림길 구조가 함께 갱신된다", () => {
  const board = createBoardTemplate("branch");
  const moved = [...board.spaces];
  moved.splice(4, 0, moved.splice(8, 1)[0]);
  const rebuilt = rebuildBoardConnections(moved, "branch");
  assert.equal(rebuilt.length, board.spaces.length);
  assert.equal(reachableSpaceIds({ spaces: rebuilt }).size, rebuilt.length);
  assert.equal(rebuilt.filter((space) => space.next.length > 1).length, 1);
});

test("끊어진 연결과 도달 불가능한 칸을 찾아 검사 결과에 오류로 표시한다", () => {
  const project = completeProject();
  project.board.spaces[0].next = [];
  assert.ok(getUnreachableSpaceIds(project.board).length > 0);
  const issue = validateProject(project).find((item) => item.code === "unreachable-spaces");
  assert.equal(issue.level, "error");
});

test("카드 데이터와 프로젝트 JSON은 정제 후에도 필요한 필드를 보존한다", () => {
  const project = completeProject();
  const roundTrip = sanitizeProject(JSON.parse(JSON.stringify(project)));
  assert.equal(roundTrip.kind, "calculus-board-game-project");
  assert.equal(roundTrip.cards.length, 5);
  assert.deepEqual(roundTrip.cards[0].choices, ["1", "2"]);
  assert.equal(roundTrip.rules.victoryCondition, "도착 후 최고 점수");
});

test("검사기는 정답 누락, 주제 부족, 점수 불균형을 구분해 찾는다", () => {
  const project = completeProject();
  project.cards = project.cards.slice(0, 2);
  project.cards[0].answer = "";
  project.cards[0].points = 1;
  project.cards[1].points = 20;
  const codes = validateProject(project).map((issue) => issue.code);
  assert.ok(codes.includes("missing-answers"));
  assert.ok(codes.includes("topic-coverage"));
  assert.ok(codes.includes("point-imbalance"));
});

test("자동 답 판정은 등록 문자열만 비교하고 식의 동치를 추정하지 않는다", () => {
  const card = { type: "short", answer: "1/2|0.5" };
  assert.equal(judgeAnswer(card, "0.5").correct, true);
  assert.equal(judgeAnswer(card, "2/4").correct, false);
  assert.equal(judgeAnswer({ type: "explain", answer: "설명" }, "설명").supported, false);
});

test("플레이 테스트는 갈림길 이동, 점수 조정, 턴 변경을 불변 상태로 처리한다", () => {
  const project = completeProject();
  const split = project.board.spaces.find((space) => space.next.length === 2);
  let play = createPlayState(project, 3);
  play.players[0].spaceId = split.id;
  const target = split.next[1];
  const moved = moveCurrentPlayer(play, project.board, 1, target);
  assert.equal(moved.play.players[0].spaceId, target);
  assert.equal(play.players[0].spaceId, split.id);
  const scored = adjustScore(moved.play, 5);
  assert.equal(scored.players[0].score, 5);
  const next = nextTurn(scored);
  assert.equal(next.currentPlayer, 1);
  assert.equal(next.turn, 1);
});

test("카드 뽑기는 주제 필터와 주입 난수를 따르고 수식 미리보기는 안전한 문자 변환만 한다", () => {
  const cards = completeProject().cards;
  const selected = drawCard(cards, () => 0, cards[2].topic);
  assert.equal(selected.topic, cards[2].topic);
  assert.equal(mathDisplay("int x^2 dx -> F(x)"), "∫ x² dx → F(x)");
});
