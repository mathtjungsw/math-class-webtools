const test = require("node:test");
const assert = require("node:assert/strict");

const M = require("../middle-school/rabbit-fox-ecosystem/model.js");

function almostEqual(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≈ ${expected}`);
}

test("표준 로트카–볼테라 변화율을 정확히 계산한다", () => {
  const config = { ...M.DEFAULTS, rabbitGrowth: .2, predationRate: .01, foxDeathRate: .1, foxGrowthRate: .002 };
  const change = M.derivatives(100, 10, config);
  almostEqual(change.rabbits, 10);
  almostEqual(change.foxes, 1);
});

test("양의 공존 균형점에서는 두 종의 변화율이 0이다", () => {
  const config = { ...M.DEFAULTS, rabbitGrowth: .2, predationRate: .01, foxDeathRate: .1, foxGrowthRate: .001 };
  const point = M.equilibrium(config);
  assert.equal(point.exists, true);
  almostEqual(point.rabbits, 100);
  almostEqual(point.foxes, 20);
  const change = M.derivatives(point.rabbits, point.foxes, config);
  almostEqual(change.rabbits, 0);
  almostEqual(change.foxes, 0);
});

test("환경수용력 확장 모델의 공존 균형점을 계산한다", () => {
  const config = { ...M.DEFAULTS, rabbitGrowth: .2, predationRate: .01, foxDeathRate: .1, foxGrowthRate: .001, useCapacity: true, carryingCapacity: 500 };
  const point = M.equilibrium(config);
  assert.equal(point.exists, true);
  almostEqual(point.rabbits, 100);
  almostEqual(point.foxes, 16);
  const change = M.derivatives(point.rabbits, point.foxes, config);
  almostEqual(change.rabbits, 0);
  almostEqual(change.foxes, 0);
});

test("점화식은 현재 값과 Δt를 이용해 다음 값을 계산한다", () => {
  const config = { ...M.DEFAULTS, rabbitGrowth: .2, predationRate: .01, foxDeathRate: .1, foxGrowthRate: .002 };
  const next = M.eulerStep(100, 10, .5, config);
  almostEqual(next.rabbits, 105);
  almostEqual(next.foxes, 10.5);
});

test("평형점에서 시작하면 RK4와 점화식 모두 일정하게 유지된다", () => {
  const result = M.simulate({ rabbitGrowth: .2, predationRate: .01, foxDeathRate: .1, foxGrowthRate: .001, initialRabbits: 100, initialFoxes: 20, duration: 50, dt: .25 });
  result.continuous.rabbits.forEach((value) => almostEqual(value, 100, 1e-8));
  result.continuous.foxes.forEach((value) => almostEqual(value, 20, 1e-8));
  result.discrete.rabbits.forEach((value) => almostEqual(value, 100, 1e-8));
  result.discrete.foxes.forEach((value) => almostEqual(value, 20, 1e-8));
});

test("계산 시점은 0부터 정확한 종료 시각까지 증가한다", () => {
  const result = M.simulate({ ...M.DEFAULTS, duration: 7, dt: .3 });
  assert.equal(result.times[0], 0);
  almostEqual(result.times.at(-1), 7);
  result.times.slice(1).forEach((time, index) => assert.ok(time > result.times[index]));
});

test("화면에 노출되지 않은 내부 안전값은 기본값을 쓰되 경고하지 않는다", () => {
  const result = M.simulate({ rabbitGrowth: .1, predationRate: .002, foxDeathRate: .1, foxGrowthRate: .0004, initialRabbits: 300, initialFoxes: 30, duration: 120, dt: .2 });
  assert.equal(result.config.maxSteps, M.DEFAULTS.maxSteps);
  assert.equal(result.config.maxPopulation, M.DEFAULTS.maxPopulation);
  assert.deepEqual(result.warnings, []);
});

test("너무 많은 계산 단계는 상한에 맞춰 안전하게 조정한다", () => {
  const result = M.simulate({ ...M.DEFAULTS, duration: 1000, dt: .001, maxSteps: 500 });
  assert.equal(result.config.steps, 500);
  assert.equal(result.times.length, 501);
  assert.ok(result.warnings.some((warning) => warning.includes("계산량")));
});

test("음수·비정상 입력과 수치 폭주에서도 유한한 비음수 개체수만 반환한다", () => {
  const result = M.simulate({ rabbitGrowth: 2, predationRate: .1, foxDeathRate: 0, foxGrowthRate: .1, initialRabbits: -5, initialFoxes: 100000000, duration: 10, dt: 20, maxPopulation: 5000 });
  [...result.continuous.rabbits, ...result.continuous.foxes, ...result.discrete.rabbits, ...result.discrete.foxes].forEach((value) => {
    assert.ok(Number.isFinite(value));
    assert.ok(value >= 0 && value <= 5000);
  });
});

test("주기적 결과에서 토끼 최고점 뒤의 여우 최고점과 시간차를 찾는다", () => {
  const result = M.simulate(M.DEFAULTS);
  const summary = M.summarize(result, "continuous");
  assert.ok(summary.rabbitPeaks.length >= 1);
  assert.ok(summary.foxPeaks.length >= 1);
  assert.ok(summary.firstFoxPeak.time >= summary.firstRabbitPeak.time);
  assert.ok(summary.lag >= 0);
});

test("현재 변화율의 부호로 생태계 단계를 분류한다", () => {
  const config = { ...M.DEFAULTS, rabbitGrowth: .2, predationRate: .01, foxDeathRate: .1, foxGrowthRate: .001 };
  assert.equal(M.phaseAt(200, 10, config).label, "여우 추격 단계");
  assert.equal(M.phaseAt(50, 30, config).label, "여우 감소 단계");
});
