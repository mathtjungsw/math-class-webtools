const test = require("node:test");
const assert = require("node:assert/strict");
const M = require("../curriculum-labs/model.js");

test("순열·조합·팩토리얼 관계를 보존한다", () => {
  for (let n = 1; n <= 10; n += 1) {
    for (let r = 0; r <= n; r += 1) {
      assert.equal(M.permutation(n, r), M.combination(n, r) * M.factorial(r));
    }
  }
});

test("다항식 전개와 2×2 행렬 연산을 정확히 계산한다", () => {
  assert.deepEqual(M.multiplyLinear(2, 3, 1, -4), [2, -5, -12]);
  const A = [[1, 2], [3, 4]], B = [[0, 1], [-1, 2]];
  assert.deepEqual(M.matrixAdd(A, B), [[1, 3], [2, 6]]);
  assert.deepEqual(M.matrixMultiply(A, B), [[-2, 5], [-4, 11]]);
  assert.equal(M.determinant2(A), -2);
});

test("음수 계수의 일차부등식은 부등호 방향을 바꾼다", () => {
  assert.deepEqual(M.solveInequality(-2, 3, 9), { bound: -3, op: ">", all: false, none: false });
});

test("등차·등비수열 항을 생성한다", () => {
  assert.deepEqual(M.sequenceTerms("arithmetic", 2, 3, 4), [2, 5, 8, 11]);
  assert.deepEqual(M.sequenceTerms("geometric", 2, 3, 4), [2, 6, 18, 54]);
});

test("평균변화율은 h가 작아질수록 이차함수의 미분계수에 가까워진다", () => {
  const derivative = M.derivativeQuadratic(1, -2, 2);
  const coarse = Math.abs(M.averageRateQuadratic(1, -2, 0, 2, 1) - derivative);
  const fine = Math.abs(M.averageRateQuadratic(1, -2, 0, 2, 0.001) - derivative);
  assert.ok(fine < coarse);
});

test("중점 리만 합은 이차함수 적분값에 가까워진다", () => {
  assert.ok(Math.abs(M.riemannQuadratic(1, 0, 0, 0, 2, 1000) - 8 / 3) < 0.001);
});

test("표본 크기가 커지면 같은 표본비율의 신뢰구간이 좁아진다", () => {
  const small = M.confidenceInterval(0.5, 50);
  const large = M.confidenceInterval(0.5, 500);
  assert.ok(large.margin < small.margin);
  const testResult = M.oneProportionZTest(0.7, 200, 0.5);
  assert.ok(testResult.pValue < 0.05);
});

test("상관계수와 연립방정식 해를 계산한다", () => {
  assert.equal(M.correlation([1, 2, 3], [2, 4, 6]), 1);
  assert.deepEqual(M.solveSystem2(1, 1, 4, 2, -1, 1), { kind: "one", x: 5 / 3, y: 7 / 3 });
});

test("선택 나무는 중복 없는 순열 전체를 만든다", () => {
  const values = M.arrangements(["A", "B", "C", "D"], 2);
  assert.equal(values.length, 12);
  assert.equal(new Set(values.map(value => value.join(""))).size, 12);
});
