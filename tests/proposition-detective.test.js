const test = require("node:test");
const assert = require("node:assert/strict");
const { answerByRole, distributeRoles, evaluateProposition, sameSelection } = require("../math-game/proposition-detective/game-logic.js");

const people = [
  { id: 0, culprit: true, glasses: true, hat: false },
  { id: 1, culprit: true, glasses: false, hat: true },
  { id: 2, culprit: false, glasses: true, hat: true },
  { id: 3, culprit: false, glasses: false, hat: false },
];
const glasses = (person) => person.glasses;
const hat = (person) => person.hat;

test("전체·존재·개수 명제를 수학적 의미대로 판정한다", () => {
  assert.equal(evaluateProposition("allC", people, glasses), false);
  assert.equal(evaluateProposition("somePC", people, glasses), true);
  assert.equal(evaluateProposition("pAreC", people, glasses), false);
  assert.equal(evaluateProposition("countC", people, null, null, 2), true);
  assert.equal(evaluateProposition("someCand", people, glasses, hat), false);
  assert.equal(evaluateProposition("exactP", people, glasses, null, 2), true);
});

test("조건명제는 P이면서 Q가 아닌 반례가 있을 때만 거짓이다", () => {
  assert.equal(evaluateProposition("ifThen", people, glasses, hat), false);
  assert.equal(evaluateProposition("ifThen", people, hat, glasses), false);
  assert.equal(evaluateProposition("allCor", people, glasses, hat), true);
});

test("범인이 없을 때 범인에 대한 전체명제는 공허하게 참이다", () => {
  const innocentPeople = people.map((person) => ({ ...person, culprit: false }));
  assert.equal(evaluateProposition("allC", innocentPeople, glasses), true);
  assert.equal(evaluateProposition("somePC", innocentPeople, glasses), false);
});

test("진실·반대·자유 역할이 정해진 규칙으로 답한다", () => {
  assert.equal(answerByRole("truth", true), true);
  assert.equal(answerByRole("truth", false), false);
  assert.equal(answerByRole("lie", true), false);
  assert.equal(answerByRole("lie", false), true);
  assert.equal(answerByRole("free", true, () => 0.2), true);
  assert.equal(answerByRole("free", true, () => 0.8), false);
});

test("4~10명에서 진실·반대·자유 역할을 빠짐없이 자동 배분한다", () => {
  assert.deepEqual(distributeRoles(4), { truth: 2, lie: 1, free: 1 });
  assert.deepEqual(distributeRoles(5), { truth: 3, lie: 1, free: 1 });
  assert.deepEqual(distributeRoles(8), { truth: 4, lie: 2, free: 2 });
  assert.deepEqual(distributeRoles(10), { truth: 5, lie: 2, free: 3 });
  for (let count = 4; count <= 10; count += 1) {
    const roles = distributeRoles(count);
    assert.equal(roles.truth + roles.lie + roles.free, count);
  }
});

test("0명을 포함해 범인 지목 집합을 순서와 무관하게 비교한다", () => {
  assert.equal(sameSelection([1, 3], new Set([3, 1])), true);
  assert.equal(sameSelection([], new Set()), true);
  assert.equal(sameSelection([1], new Set([1, 2])), false);
});
