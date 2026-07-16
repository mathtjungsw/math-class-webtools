const test = require("node:test");
const assert = require("node:assert/strict");
const B = require("../probability-statistics/bayes-localization-lab/bayes-filter.js");

function roadMap(width, options = {}) {
  return {
    width,
    height: 1,
    topology: options.topology || "finite",
    cells: Array.from({ length: width }, (_, index) => ({
      blocked: (options.blocked || []).includes(index),
      terrain: (options.terrains || [])[index] || "회색",
      landmark: (options.landmarks || [])[index] || "",
    })),
  };
}

test("순환 도로의 정확한 이동은 마지막 칸에서 첫 칸으로 이어진다", () => {
  const map = roadMap(4, { topology: "cycle" });
  const result = B.predict([0, 0, 0, 1], map, { dx: 1, dy: 0, steps: 1 }, { stay: 0, under: 0, exact: 1, over: 0 });
  assert.deepEqual(result, [1, 0, 0, 0]);
});

test("제자리·덜 이동·정확·더 이동 확률이 전이분포에 합쳐진다", () => {
  const map = roadMap(5, { topology: "cycle" });
  const row = B.transitionRow(map, 0, { dx: 1, dy: 0, steps: 1 }, { stay: 0.1, under: 0.1, exact: 0.7, over: 0.1 });
  assert.deepEqual(row, [0.2, 0.7, 0.1, 0, 0]);
  assert.ok(B.almostEqual(B.sum(row), 1));
});

test("지도 밖 또는 벽으로 향하는 이동은 마지막 이동 가능 칸에서 멈춘다", () => {
  const finite = roadMap(3);
  assert.equal(B.moveIndex(finite, 2, 1, 0, 2), 2);
  const walled = roadMap(4, { blocked: [2] });
  assert.equal(B.moveIndex(walled, 0, 1, 0, 3), 1);
});

test("예측 단계는 막힌 칸의 확률을 0으로 유지하고 전체 합을 보존한다", () => {
  const map = roadMap(5, { blocked: [2] });
  const prior = B.uniformPrior(map);
  const prediction = B.predict(prior, map, { dx: 1, dy: 0, steps: 1 }, { stay: 0.1, under: 0.1, exact: 0.7, over: 0.1 });
  assert.equal(prediction[2], 0);
  assert.ok(B.almostEqual(B.sum(prediction), 1));
});

test("센서 가능도와 정규화 전 곱을 이용해 사후분포를 계산한다", () => {
  const map = roadMap(3, { terrains: ["파랑", "빨강", "파랑"] });
  const likelihood = B.likelihoods(map, "빨강", { type: "terrain", accuracy: 0.8, falsePositive: 0.1 });
  assert.deepEqual(likelihood, [0.1, 0.8, 0.1]);
  const result = B.update([0.2, 0.5, 0.3], likelihood);
  assert.equal(result.ok, true);
  assert.deepEqual(result.unnormalized, [0.020000000000000004, 0.4, 0.03]);
  assert.ok(B.almostEqual(result.evidence, 0.45));
  assert.ok(B.almostEqual(B.sum(result.posterior), 1));
  assert.ok(B.almostEqual(result.posterior[1], 8 / 9));
});

test("모든 가능도가 0인 관측은 사전분포를 보존하며 이유를 돌려준다", () => {
  const prediction = [0.25, 0.75];
  const result = B.update(prediction, [0, 0]);
  assert.equal(result.ok, false);
  assert.deepEqual(result.posterior, prediction);
  assert.match(result.reason, /모든 가능도가 0/);
});

test("조건부 독립인 두 센서의 순차 갱신과 동시 갱신은 같다", () => {
  const prediction = [0.2, 0.3, 0.5];
  const first = [0.8, 0.2, 0.8];
  const second = [0.1, 0.9, 0.1];
  const sequential = B.updateSequential(prediction, [first, second]);
  const together = B.updateTogether(prediction, [first, second]);
  assert.equal(sequential.ok, true);
  assert.equal(together.ok, true);
  sequential.posterior.forEach((value, index) => assert.ok(B.almostEqual(value, together.posterior[index])));
});

test("벽과 랜드마크까지의 맨해튼 거리를 센서 예상값으로 사용한다", () => {
  const map = {
    width: 3,
    height: 3,
    topology: "finite",
    cells: Array.from({ length: 9 }, (_, index) => ({
      blocked: index === 8,
      terrain: "도로",
      landmark: index === 0 ? "학교" : "",
    })),
  };
  assert.equal(B.expectedObservation(map, 4, { type: "distance-wall" }), 2);
  assert.equal(B.expectedObservation(map, 4, { type: "distance-landmark" }), 2);
});

test("같은 시드는 실제 이동과 관측 난수 실험을 재현한다", () => {
  const map = roadMap(5, { topology: "cycle", terrains: ["파랑", "빨강", "파랑", "노랑", "회색"] });
  function run(seed) {
    const random = B.createRng(seed);
    const move = B.sampleMove(map, 0, { dx: 1, dy: 0, steps: 2 }, { stay: 0.1, under: 0.2, exact: 0.6, over: 0.1 }, random);
    const observation = B.sampleObservation(map, move.index, { type: "terrain", accuracy: 0.7, falsePositive: 0.1 }, random);
    return [move.index, move.outcome, observation];
  }
  assert.deepEqual(run("수업-14"), run("수업-14"));
});

test("이동 확률 합 오류와 사전분포 합 오류를 설명한다", () => {
  assert.equal(B.validateMotion({ stay: 0.1, under: 0.1, exact: 0.7, over: 0.2 }).ok, false);
  const map = roadMap(2);
  assert.equal(B.validateDistribution([0.4, 0.4], map).ok, false);
});

test("교사 프리셋 JSON은 저장 후 같은 설정으로 불러오며 손상 자료는 거부한다", () => {
  const map = roadMap(3, { topology: "cycle", landmarks: ["학교", "", "공원"] });
  const scenario = {
    name: "고정 사례",
    mode: "1d",
    map,
    prior: B.uniformPrior(map),
    actualIndex: 1,
    motion: { stay: 0.1, under: 0.1, exact: 0.7, over: 0.1 },
    sensors: [
      { type: "terrain", accuracy: 0.8, falsePositive: 0.1 },
      { type: "landmark", accuracy: 0.9, falsePositive: 0.05 },
    ],
    mission: { goal: "두 번 안에 위치 좁히기", maxSensorUses: 2, targetIndex: 2 },
  };
  const loaded = B.importScenario(B.exportScenario(scenario));
  assert.deepEqual(loaded.map, map);
  assert.deepEqual(loaded.prior, scenario.prior);
  assert.equal(loaded.mission.maxSensorUses, 2);
  assert.throws(() => B.importScenario('{"schema":"wrong","version":1}'), /형식/);
});
