const test = require("node:test");
const assert = require("node:assert/strict");
const {
  atLeastProbability,
  chooseAIAction,
  countMatches,
  isHigherBid,
  legalBids,
  matchDistribution,
  nextActiveIndex,
  resolveChallenge,
  rollDice,
} = require("../math-game/liars-dice/game-logic.js");

test("입찰은 수량이 늘거나 같은 수량에서 눈금이 커야 한다", () => {
  assert.equal(isHigherBid({ quantity: 3, face: 2 }, { quantity: 2, face: 6 }), true);
  assert.equal(isHigherBid({ quantity: 2, face: 5 }, { quantity: 2, face: 4 }), true);
  assert.equal(isHigherBid({ quantity: 2, face: 4 }, { quantity: 2, face: 4 }), false);
  assert.equal(isHigherBid({ quantity: 1, face: 6 }, { quantity: 2, face: 1 }), false);
});

test("1 와일드는 목표가 1이 아닐 때만 함께 센다", () => {
  const dice = [1, 1, 2, 5, 5];
  assert.equal(countMatches(dice, 5, false), 2);
  assert.equal(countMatches(dice, 5, true), 4);
  assert.equal(countMatches(dice, 1, true), 2);
});

test("알려진 주사위를 조건으로 적어도 확률을 계산한다", () => {
  const standard = atLeastProbability({ knownDice: [4], unknownDice: 2, quantity: 2, face: 4 });
  assert.ok(Math.abs(standard - 11 / 36) < 1e-12);

  const wild = atLeastProbability({ knownDice: [1], unknownDice: 2, quantity: 2, face: 4, wildOnes: true });
  assert.ok(Math.abs(wild - 5 / 9) < 1e-12);

  const distribution = matchDistribution({ knownDice: [6], unknownDice: 3, face: 6 });
  assert.ok(Math.abs(distribution.reduce((sum, item) => sum + item.probability, 0) - 1) < 1e-12);
  assert.deepEqual(distribution.map((item) => item.totalMatches), [1, 2, 3, 4]);
});

test("도전 판정은 실제 일치 개수와 입찰 수량을 비교한다", () => {
  const result = resolveChallenge({ bid: { quantity: 3, face: 5 }, dice: [[5, 2], [1, 5]], wildOnes: true });
  assert.deepEqual(result, { actual: 3, bidIsTrue: true, difference: 0 });
});

test("탈락한 사람을 건너뛰어 다음 참가자를 찾는다", () => {
  const players = [{ diceCount: 2 }, { diceCount: 0 }, { diceCount: 3 }];
  assert.equal(nextActiveIndex(players, 0), 2);
  assert.equal(nextActiveIndex(players, 2), 0);
});

test("주사위 생성은 주입한 난수를 1~6으로 바꾼다", () => {
  const values = [0, 0.2, 0.999999];
  assert.deepEqual(rollDice(3, () => values.shift()), [1, 2, 6]);
});

test("AI는 불가능하게 높은 입찰에 도전하고 모든 AI 입찰은 합법이다", () => {
  const challenge = chooseAIAction({
    currentBid: { quantity: 5, face: 6 },
    ownDice: [2, 3],
    totalDice: 5,
    random: () => 0.5,
  });
  assert.equal(challenge.type, "challenge");

  const action = chooseAIAction({
    currentBid: { quantity: 1, face: 2 },
    ownDice: [2, 2, 4],
    totalDice: 8,
    random: () => 0.5,
  });
  assert.equal(action.type, "bid");
  assert.equal(isHigherBid(action.bid, { quantity: 1, face: 2 }), true);
  assert.ok(legalBids({ quantity: 1, face: 2 }, 8).some((bid) => bid.quantity === action.bid.quantity && bid.face === action.bid.face));
});
