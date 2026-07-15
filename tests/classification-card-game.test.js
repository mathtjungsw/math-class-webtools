const test = require("node:test");
const assert = require("node:assert/strict");
const {
  sanitizeSet,
  evaluate,
  calculateScore,
  shuffled,
  formatClock,
} = require("../math-game/classification-card-game/game-logic.js");

const sampleSet = {
  title: "테스트 분류",
  categories: [
    { id: "a", name: "A", summary: "A 기준" },
    { id: "b", name: "B", summary: "B 기준" },
  ],
  cards: [
    { id: "one", text: "첫 카드", category: "a", explanation: "A이기 때문" },
    { id: "two", text: "둘째 카드", category: "b", explanation: "B이기 때문" },
  ],
};

test("문제 세트를 안전한 공통 형식으로 정리한다", () => {
  const clean = sanitizeSet(sampleSet);
  assert.equal(clean.version, 1);
  assert.equal(clean.categories.length, 2);
  assert.equal(clean.cards.length, 2);
  assert.equal(clean.cards[0].kind, "text");
  assert.equal(clean.cards[1].category, "b");
});

test("존재하지 않는 분류 항목을 정답으로 둔 카드는 거부한다", () => {
  const broken = structuredClone(sampleSet);
  broken.cards[0].category = "missing";
  assert.throws(() => sanitizeSet(broken), /분류 항목/);
});

test("제출 배치를 카드별로 정확하게 채점한다", () => {
  const clean = sanitizeSet(sampleSet);
  const results = evaluate(clean.cards, { one: "a", two: "a" });
  assert.deepEqual(results.map((result) => result.correct), [true, false]);
  assert.equal(results[1].expected, "b");
});

test("즉시 채점은 오답 시도에 작은 감점을 적용하고 0~100 범위를 지킨다", () => {
  assert.equal(calculateScore({ total: 10, correct: 10, mistakes: 2, mode: "instant" }), 96);
  assert.equal(calculateScore({ total: 10, correct: 0, mistakes: 99, mode: "instant" }), 0);
  assert.equal(calculateScore({ total: 4, correct: 3, mode: "submit" }), 75);
});

test("카드 섞기는 원본을 바꾸지 않고 모든 카드를 보존한다", () => {
  const original = [1, 2, 3, 4];
  const result = shuffled(original, () => 0);
  assert.deepEqual(original, [1, 2, 3, 4]);
  assert.deepEqual([...result].sort(), original);
});

test("초 단위를 수업용 시계 문자열로 표시한다", () => {
  assert.equal(formatClock(0), "00:00");
  assert.equal(formatClock(305), "05:05");
  assert.equal(formatClock(-10), "00:00");
});
