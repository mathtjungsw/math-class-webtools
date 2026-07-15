const test = require("node:test");
const assert = require("node:assert/strict");
const {
  addFractions,
  analyzeProblem,
  fraction,
  fractionToNumber,
  fractionsEqual,
  fullGridEdges,
  normalizeProblem,
  runSimulation,
} = require("../probability-statistics/path-probability-lab/engine.js");

function fullProblem(rows, columns, start, end, checkpoint, extra = {}) {
  return {
    title: "테스트",
    rows,
    columns,
    start,
    end,
    checkpoint,
    blocked: [],
    edges: fullGridEdges(rows, columns),
    ...extra,
  };
}

function mulberry32(seed) {
  return function random() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("원자료 대표 격자는 경로 균등 2/5, 갈림길 균등 5/16이다", () => {
  const analysis = analyzeProblem(fullProblem(3, 4, "0,0", "2,3", "1,3"));
  assert.equal(analysis.shortestDistance, 5);
  assert.equal(analysis.totalPaths, 10n);
  assert.equal(analysis.pathsThroughCheckpoint, 4n);
  assert.deepEqual(analysis.pathUniformProbability, fraction(2n, 5n));
  assert.deepEqual(analysis.branchUniformProbability, fraction(5n, 16n));
});

test("경로별 갈림길 확률의 합은 1이고 서로 같지 않을 수 있다", () => {
  const analysis = analyzeProblem(fullProblem(3, 4, "0,0", "2,3", "1,3"));
  const sum = analysis.paths.reduce((current, path) => addFractions(current, path.branchProbability), fraction(0n));
  assert.equal(fractionsEqual(sum, fraction(1n)), true);
  assert.ok(new Set(analysis.paths.map((path) => `${path.branchProbability.n}/${path.branchProbability.d}`)).size > 1);
  assert.equal(analysis.paths.filter((path) => path.passesCheckpoint).length, 4);
});

test("대칭 3×3 격자에서도 두 모형은 2/3과 1/2로 달라진다", () => {
  const analysis = analyzeProblem(fullProblem(3, 3, "0,0", "2,2", "1,1"));
  assert.equal(analysis.totalPaths, 6n);
  assert.deepEqual(analysis.pathUniformProbability, fraction(2n, 3n));
  assert.deepEqual(analysis.branchUniformProbability, fraction(1n, 2n));
});

test("순환이 있는 원래 길도 최단 경로 DAG로 바꾸어 유한하게 계산한다", () => {
  const analysis = analyzeProblem(fullProblem(2, 2, "0,0", "1,1", "0,1"));
  assert.equal(analysis.hasCycle, true);
  assert.equal(analysis.totalPaths, 2n);
  assert.equal(analysis.directedEdges.length, 4);
  assert.equal(analysis.paths.length, 2);
});

test("막다른 길과 우회로는 최단 경로 표본공간에서 제외한다", () => {
  const analysis = analyzeProblem(fullProblem(3, 3, "0,0", "0,2", "2,2"));
  assert.equal(analysis.totalPaths, 1n);
  assert.equal(analysis.checkpointOnShortestPath, false);
  assert.deepEqual(analysis.pathUniformProbability, fraction(0n));
  assert.deepEqual(analysis.branchUniformProbability, fraction(0n));
  assert.ok(analysis.ignoredEdgeCount > 0);
});

test("경로가 없는 편집 상태는 0개 경로로 안전하게 반환한다", () => {
  const analysis = analyzeProblem({
    title: "끊긴 길",
    rows: 3,
    columns: 3,
    start: "0,0",
    end: "2,2",
    checkpoint: "1,1",
    blocked: [],
    edges: [],
  });
  assert.equal(analysis.hasPath, false);
  assert.equal(analysis.shortestDistance, null);
  assert.equal(analysis.totalPaths, 0n);
  assert.equal(analysis.paths.length, 0);
});

test("큰 격자는 전체 개수를 정확히 세되 경로 목록만 제한한다", () => {
  const analysis = analyzeProblem(fullProblem(8, 8, "0,0", "7,7", "3,3"), { enumerationLimit: 5 });
  assert.equal(analysis.totalPaths, 3432n);
  assert.equal(analysis.paths.length, 5);
  assert.equal(analysis.enumerationTruncated, true);
});

test("두 몬테카를로 실험은 각자의 이론값에 가까워진다", () => {
  const analysis = analyzeProblem(fullProblem(3, 4, "0,0", "2,3", "1,3"));
  const result = runSimulation(analysis, 30000, mulberry32(20260715));
  assert.ok(Math.abs(result.pathHits / result.trials - fractionToNumber(analysis.pathUniformProbability)) < 0.015);
  assert.ok(Math.abs(result.branchHits / result.trials - fractionToNumber(analysis.branchUniformProbability)) < 0.015);
});

test("문제 데이터는 크기, 지점 중복, 인접하지 않은 길을 거부한다", () => {
  assert.throws(() => normalizeProblem(fullProblem(9, 3, "0,0", "2,2", "1,1")), /격자 크기/);
  assert.throws(() => normalizeProblem(fullProblem(3, 3, "0,0", "2,2", "0,0")), /서로 다른/);
  assert.throws(() => normalizeProblem({ ...fullProblem(3, 3, "0,0", "2,2", "1,1"), edges: ["0,0|2,2"] }), /올바르지 않은 길/);
});
