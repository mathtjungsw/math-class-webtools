const test = require("node:test");
const assert = require("node:assert/strict");

const { analyzeSquare, canonicalKey, formatRadical } = require("../math-game/square-battle/geometry.js");

test("축에 평행한 정사각형의 길이와 넓이를 계산한다", () => {
  const result = analyzeSquare([
    { x: -2, y: -1 },
    { x: 1, y: 2 },
    { x: -2, y: 2 },
    { x: 1, y: -1 }
  ]);

  assert.equal(result.valid, true);
  assert.equal(result.tilted, false);
  assert.equal(result.sideSquared, 9);
  assert.equal(result.sideExpression, "3");
  assert.equal(result.area, 9);
  assert.equal(result.diagonalExpression, "3√2");
});

test("기울어진 정사각형을 순서와 관계없이 판정한다", () => {
  const result = analyzeSquare([
    { x: 0, y: 3 },
    { x: -2, y: 2 },
    { x: -1, y: 0 },
    { x: 1, y: 1 }
  ]);

  assert.equal(result.valid, true);
  assert.equal(result.tilted, true);
  assert.equal(result.sideSquared, 5);
  assert.equal(result.sideExpression, "√5");
  assert.equal(result.area, 5);
  assert.equal(result.diagonalExpression, "√10");
});

test("네 변이 같은 마름모를 정사각형으로 판정하지 않는다", () => {
  const result = analyzeSquare([
    { x: 0, y: 0 },
    { x: 2, y: 1 },
    { x: 3, y: 3 },
    { x: 1, y: 2 }
  ]);

  assert.equal(result.valid, false);
  assert.match(result.reason, /대각선/);
});

test("직사각형과 점이 부족한 선택을 거부한다", () => {
  assert.equal(
    analyzeSquare([
      { x: 0, y: 0 },
      { x: 3, y: 0 },
      { x: 3, y: 2 },
      { x: 0, y: 2 }
    ]).valid,
    false
  );
  assert.equal(analyzeSquare([{ x: 0, y: 0 }]).valid, false);
});

test("중복 판정 키와 제곱근 표현이 안정적이다", () => {
  const points = [
    { x: 2, y: 2 },
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 0, y: 2 }
  ];
  assert.equal(canonicalKey(points), "0,0|0,2|2,0|2,2");
  assert.equal(formatRadical(72), "6√2");
  assert.equal(formatRadical(25), "5");
});
