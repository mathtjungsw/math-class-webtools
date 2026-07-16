const test = require("node:test");
const assert = require("node:assert/strict");
const {
  summarize,
  safeStandardScore,
  prepareModel,
  inspectPoint,
  predict,
  confusionMatrix,
  evaluationMetrics,
  parseCsv,
  validateSavedState,
} = require("../probability-statistics/anomaly-detection-lab/logic.js");

function points(values, features = values) {
  return values.map((value, index) => ({
    id: `p-${index}`,
    index,
    time: index + 1,
    value,
    feature2: features[index],
    isAnomaly: false,
  }));
}

test("요약 통계는 평균·모표준편차·사분위수·IQR을 계산한다", () => {
  const stats = summarize([1, 2, 3, 4]);
  assert.equal(stats.mean, 2.5);
  assert.ok(Math.abs(stats.sd - Math.sqrt(1.25)) < 1e-12);
  assert.equal(stats.q1, 1.75);
  assert.equal(stats.median, 2.5);
  assert.equal(stats.q3, 3.25);
  assert.equal(stats.iqr, 1.5);
});

test("분산이 0인 자료의 z점수는 동일값이면 0, 다른 값이면 무한대로 안전하게 처리한다", () => {
  assert.equal(safeStandardScore(5, 5, 0), 0);
  assert.equal(safeStandardScore(6, 5, 0), Infinity);
  assert.equal(safeStandardScore(4, 5, 0), -Infinity);
  assert.deepEqual(summarize([]), { n: 0, mean: 0, sd: 0, min: 0, q1: 0, median: 0, q3: 0, max: 0, iqr: 0 });
});

test("고정 거리·z점수·IQR 임계값 판정을 고정 자료에서 재현한다", () => {
  const data = points([10, 10, 10, 10, 30]);
  const model = prepareModel(data, 3);
  assert.equal(inspectPoint(data[4], 4, "distance", 10, model).flagged, true);
  assert.equal(inspectPoint(data[0], 0, "distance", 10, model).flagged, false);
  assert.equal(inspectPoint(data[4], 4, "zscore", 1.5, model).flagged, true);
  assert.equal(inspectPoint(data[4], 4, "iqr", 1.5, model).flagged, true);
  assert.deepEqual(predict(data, "iqr", 1.5, { model }), [false, false, false, false, true]);
});

test("이동평균은 최근 동일값 구간 뒤의 급격한 변화를 경고한다", () => {
  const data = points([10, 10, 10, 20]);
  const model = prepareModel(data, 3);
  const detail = inspectPoint(data[3], 3, "moving", 2, model);
  assert.equal(detail.moving.mean, 10);
  assert.equal(detail.moving.sd, 0);
  assert.equal(detail.score, Infinity);
  assert.equal(detail.flagged, true);
});

test("두 특성 경계는 각 특성의 z점수를 합친 거리로 판정한다", () => {
  const data = points([0, 0, 0, 4], [0, 0, 0, 4]);
  const model = prepareModel(data);
  const detail = inspectPoint(data[3], 3, "twoFeature", 2, model);
  assert.ok(detail.score > 2);
  assert.equal(detail.flagged, true);
});

test("혼동행렬·평가 지표·오류 비용을 정확히 계산한다", () => {
  const matrix = confusionMatrix([true, false, true, false], [true, true, false, false]);
  assert.deepEqual(matrix, { tp: 1, fp: 1, tn: 1, fn: 1, total: 4 });
  const metrics = evaluationMetrics(matrix, { fp: 2, fn: 8 });
  assert.equal(metrics.accuracy, 0.5);
  assert.equal(metrics.precision, 0.5);
  assert.equal(metrics.recall, 0.5);
  assert.equal(metrics.specificity, 0.5);
  assert.equal(metrics.falseAlarmRate, 0.5);
  assert.equal(metrics.totalCost, 10);
});

test("분모가 0인 평가지표는 잘못된 숫자 대신 null을 돌려준다", () => {
  const metrics = evaluationMetrics(confusionMatrix([], []), { fp: 1, fn: 1 });
  assert.equal(metrics.accuracy, null);
  assert.equal(metrics.precision, null);
  assert.equal(metrics.recall, null);
  assert.equal(metrics.specificity, null);
  assert.equal(metrics.falseAlarmRate, null);
});

test("CSV는 한글·영문 열 이름, 결측 행, 따옴표와 정답 라벨을 안전하게 처리한다", () => {
  const parsed = parseCsv("값,특성2,시간,정답\n10,2,1,정상\n\"20\",5,2,이상\n,7,3,1\nnot-a-number,9,4,1");
  assert.equal(parsed.points.length, 2);
  assert.equal(parsed.skipped, 2);
  assert.equal(parsed.hasLabels, true);
  assert.equal(parsed.points[0].isAnomaly, false);
  assert.equal(parsed.points[1].isAnomaly, true);
  assert.throws(() => parseCsv(""), /비어/);
  assert.throws(() => parseCsv("name,label\na,1"), /value/);
});

test("활동 JSON 저장 형식은 동일 자료를 복원하고 빈 자료·잘못된 버전을 거부한다", () => {
  const saved = {
    version: 1,
    scenarioId: "quality",
    data: [{ id: "a", value: 10, feature2: 3, time: 1, isAnomaly: true }],
  };
  const restored = validateSavedState(JSON.stringify(saved));
  assert.deepEqual(restored.data[0], { id: "a", index: 0, value: 10, feature2: 3, time: 1, isAnomaly: true });
  assert.throws(() => validateSavedState({ version: 2, data: saved.data }), /버전/);
  assert.throws(() => validateSavedState({ version: 1, data: [] }), /비어/);
  assert.throws(() => validateSavedState({ version: 1, data: [{ value: null }] }), /값/);
});
