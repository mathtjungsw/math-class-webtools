const test = require("node:test");
const assert = require("node:assert/strict");

const {
  BUILTIN_PROBLEMS,
  analyzePolynomial,
  derivative,
  realPolynomialRoots,
  getHintCatalogue,
  makeCandidates,
  getHintTier,
  calculateRoundScore,
  validateProblem
} = require("../math-game/function-graph-blind-game/game-logic.js");

function nearlyEqualList(actual, expected, epsilon = 1e-5) {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => assert.ok(Math.abs(value - expected[index]) < epsilon, `${value} ≈ ${expected[index]}`));
}

test("삼차함수의 도함수, 교점, 극대·극소를 정확히 분석한다", () => {
  const problem = BUILTIN_PROBLEMS.find((item) => item.id === "easy-wave");
  const analysis = analyzePolynomial(problem.coefficients);
  assert.deepEqual(derivative(problem.coefficients), [3, 0, -3]);
  nearlyEqualList(analysis.xRoots, [-Math.sqrt(3), 0, Math.sqrt(3)]);
  nearlyEqualList(analysis.criticalRoots, [-1, 1]);
  assert.deepEqual(analysis.extrema.map((point) => point.type), ["max", "min"]);
});

test("사차함수의 네 실근과 접하는 중근을 놓치지 않는다", () => {
  nearlyEqualList(realPolynomialRoots([1, 0, -5, 0, 4]), [-2, -1, 1, 2]);
  nearlyEqualList(realPolynomialRoots([-1, 0, 4, 0, 0]), [-2, 0, 2]);
  nearlyEqualList(realPolynomialRoots([1, 0, -2, 0, 1]), [-1, 1]);
});

test("도함수 중근인 임계점을 정지점으로 구분한다", () => {
  const problem = BUILTIN_PROBLEMS.find((item) => item.id === "hard-stationary");
  const analysis = analyzePolynomial(problem.coefficients);
  nearlyEqualList(analysis.criticalRoots, [0, 3]);
  assert.equal(analysis.extrema[0].type, "stationary");
  assert.equal(analysis.extrema[0].repeated, true);
  assert.equal(analysis.extrema[1].type, "min");
});

test("원자료를 재구성한 17개 힌트가 문제마다 계산된다", () => {
  const problem = BUILTIN_PROBLEMS.find((item) => item.id === "normal-w");
  const hints = getHintCatalogue(problem);
  assert.equal(hints.length, 17);
  assert.deepEqual(hints.map((hint) => hint.id), Array.from({ length: 17 }, (_, index) => index + 1));
  assert.match(hints.find((hint) => hint.id === 14).answer, /4개/);
  assert.match(hints.find((hint) => hint.id === 3).answer, /양수/);
});

test("후보 그래프 네 개는 서로 다르고 정답은 정확히 하나다", () => {
  BUILTIN_PROBLEMS.forEach((problem) => {
    const candidates = makeCandidates(problem);
    assert.equal(candidates.length, 4);
    assert.equal(candidates.filter((candidate) => candidate.isAnswer).length, 1);
    assert.equal(new Set(candidates.map((candidate) => candidate.coefficients.join(","))).size, 4);
  });
});

test("힌트 수 기준과 점수는 적은 힌트를 보상한다", () => {
  assert.equal(getHintTier(4).label, "상");
  assert.equal(getHintTier(5).label, "중");
  assert.equal(getHintTier(7).label, "하");
  const four = calculateRoundScore({ correct: true, hintCount: 4, elapsedSeconds: 120, timeLimitSeconds: 480 });
  const seven = calculateRoundScore({ correct: true, hintCount: 7, elapsedSeconds: 120, timeLimitSeconds: 480 });
  assert.ok(four.score > seven.score);
  assert.equal(calculateRoundScore({ correct: false, hintCount: 2, elapsedSeconds: 20, timeLimitSeconds: 480 }).score, 0);
});

test("교사 문제는 2차부터 4차까지만 허용한다", () => {
  assert.equal(validateProblem({ title: "이차", coefficients: [1, 0, -1], xRange: [-3, 3] }).valid, true);
  assert.equal(validateProblem({ title: "일차", coefficients: [1, 0], xRange: [-3, 3] }).valid, false);
  assert.equal(validateProblem({ title: "오차", coefficients: [1, 0, 0, 0, 0, 1], xRange: [-3, 3] }).valid, false);
  assert.equal(validateProblem({ title: "범위 오류", coefficients: [1, 0, -1], xRange: [3, -3] }).valid, false);
});
