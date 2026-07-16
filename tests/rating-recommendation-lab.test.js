const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../ai-math/rating-recommendation-lab/recommender.js");

const matrix = [
  [5, 4, null, 1],
  [5, 3, 4, 1],
  [1, 2, 5, 5],
  [4, 4, 5, null]
];

test("공통 평점만 골라 사용자 벡터를 만든다", () => {
  assert.deepEqual(R.commonRatings(matrix, "user", 0, 1), [
    { index: 0, first: 5, second: 5 },
    { index: 1, first: 4, second: 3 },
    { index: 3, first: 1, second: 1 }
  ]);
});

test("초급 평점 일치도는 평균 절대거리를 0~1로 바꾼다", () => {
  const result = R.similarity(matrix, "user", 0, 1, "agreement", 2);
  assert.equal(result.usable, true);
  assert.ok(Math.abs(result.distance - 1 / 3) < 1e-10);
  assert.ok(Math.abs(result.value - 11 / 12) < 1e-8);
});

test("코사인 유사도는 내적과 벡터 길이로 계산한다", () => {
  const result = R.similarity(matrix, "user", 0, 1, "cosine", 2);
  assert.equal(result.dot, 38);
  assert.ok(Math.abs(result.denominator - Math.sqrt(42 * 35)) < 1e-10);
  assert.ok(Math.abs(result.value - 38 / Math.sqrt(42 * 35)) < 1e-8);
});

test("피어슨 유사도는 공통 벡터를 평균 중심화한다", () => {
  const result = R.similarity(matrix, "user", 0, 1, "pearson", 2);
  assert.ok(Math.abs(result.firstMean - 10 / 3) < 1e-10);
  assert.equal(result.secondMean, 3);
  assert.ok(Math.abs(result.numerator - 8) < 1e-10);
  assert.ok(Math.abs(result.value - 8 / Math.sqrt((26 / 3) * 8)) < 1e-8);
});

test("공통 평점 없음과 최소 공통 수 부족을 안전하게 제외한다", () => {
  const noCommon = [[5, null], [null, 4]];
  const empty = R.similarity(noCommon, "user", 0, 1, "agreement", 1);
  assert.equal(empty.usable, false);
  assert.equal(empty.value, null);
  assert.match(empty.reason, /공통/);

  const insufficient = R.similarity(matrix, "item", 2, 3, "cosine", 3);
  assert.equal(insufficient.common.length, 2);
  assert.equal(insufficient.usable, false);
  assert.match(insufficient.reason, /최소 3개/);
});

test("모든 공통 평점이 같은 경우 피어슨 분모 0을 처리한다", () => {
  const constant = [[3, 3, null], [4, 4, 5], [2, 2, 1]];
  const result = R.similarity(constant, "user", 0, 1, "pearson", 2);
  assert.equal(result.denominator, 0);
  assert.equal(result.usable, false);
  assert.equal(result.value, null);
  assert.match(result.reason, /모두 같아/);
});

test("유사도 순으로 필터링한 k개 사용자 이웃의 가중평균을 구한다", () => {
  const prediction = R.predictRating(matrix, 0, 2, { basis: "user", method: "agreement", k: 2, minCommon: 2 });
  assert.deepEqual(prediction.neighbors.map((neighbor) => neighbor.index), [1, 3]);
  assert.ok(Math.abs(prediction.prediction - 4.4884) < 1e-4);
  assert.equal(prediction.usedFallback, false);
});

test("같은 행렬에서도 사용자 기반과 아이템 기반 예측이 달라진다", () => {
  const userBased = R.predictRating(matrix, 0, 2, { basis: "user", method: "agreement", k: 2, minCommon: 2 });
  const itemBased = R.predictRating(matrix, 0, 2, { basis: "item", method: "agreement", k: 2, minCommon: 2 });
  assert.ok(Math.abs(itemBased.prediction - 2.4483) < 1e-4);
  assert.notEqual(userBased.prediction, itemBased.prediction);
});

test("이웃이 부족하면 사용자·콘텐츠·전체 평균 기준값으로 대체한다", () => {
  const coldStart = [[null, null], [5, 4], [3, 2]];
  const prediction = R.predictRating(coldStart, 0, 0, { basis: "user", method: "pearson", k: 2, minCommon: 2 });
  assert.equal(prediction.usedFallback, true);
  assert.ok(Number.isFinite(prediction.prediction));
  assert.ok(prediction.prediction >= 1 && prediction.prediction <= 5);
  assert.match(prediction.reason, /이웃/);
});

test("인기 가중치가 추천 점수와 순위를 즉시 바꿀 수 있다", () => {
  const popularityMatrix = [
    [5, null, null],
    [5, 4, 5],
    [4, null, 5],
    [5, null, 4],
    [4, 5, null]
  ];
  const withoutBonus = R.recommendForUser(popularityMatrix, 0, { basis: "user", method: "agreement", k: 3, minCommon: 1, popularityWeight: 0 });
  const withBonus = R.recommendForUser(popularityMatrix, 0, { basis: "user", method: "agreement", k: 3, minCommon: 1, popularityWeight: 1.5 });
  assert.equal(withoutBonus.length, 2);
  assert.ok(withBonus.every((entry) => entry.score >= entry.prediction));
  assert.ok(withBonus.some((entry) => entry.score > entry.prediction));
});

test("숨긴 실제 평점의 절대오차·MAE·RMSE를 계산한다", () => {
  const complete = [
    [5, 4, 5, 1],
    [5, 3, 4, 1],
    [1, 2, 5, 5],
    [4, 4, 5, 2]
  ];
  const hidden = R.hideRatings(complete, [{ userIndex: 0, itemIndex: 2 }]);
  const metrics = R.competitionMetrics(hidden.matrix, hidden.answers, { basis: "user", method: "agreement", k: 2, minCommon: 2 });
  assert.equal(metrics.count, 1);
  assert.equal(metrics.rows[0].actual, 5);
  assert.ok(Math.abs(metrics.mae - Math.abs(metrics.rows[0].predicted - 5)) < 1e-6);
  assert.equal(metrics.rmse, metrics.mae);
});

test("여러 오차에서는 RMSE가 MAE보다 작지 않다", () => {
  const answers = [{ userIndex: 0, itemIndex: 2, actual: 5 }, { userIndex: 3, itemIndex: 3, actual: 2 }];
  const metrics = R.competitionMetrics(matrix, answers, { basis: "user", method: "agreement", k: 2, minCommon: 2 });
  assert.equal(metrics.count, 2);
  assert.ok(metrics.rmse >= metrics.mae);
});

test("CSV의 빈칸·따옴표·쉼표 이름을 보존하며 왕복한다", () => {
  const dataset = { users: ["가은", "나,래"], items: ["별빛", "책 \"둘\""], ratings: [[5, null], [3, 4]] };
  const csv = R.toCsv(dataset);
  assert.deepEqual(R.parseCsv(csv), dataset);
});

test("잘못된 CSV 평점과 중복 이름을 거부한다", () => {
  assert.throws(() => R.parseCsv("사용자/콘텐츠,A\n가은,6"), /1~5/);
  assert.throws(() => R.parseCsv("사용자/콘텐츠,A\n가은,5\n가은,4"), /서로 달라야/);
});

test("활동 JSON에서 데이터셋을 검증하고 정규화한다", () => {
  const saved = JSON.stringify({ dataset: { users: [" 가은 "], items: [" 별빛 "], ratings: [["5"]] }, controls: { k: 2 } });
  const parsed = R.parseStateJson(saved);
  assert.deepEqual(parsed.dataset, { users: ["가은"], items: ["별빛"], ratings: [[5]] });
  assert.equal(parsed.controls.k, 2);
  assert.throws(() => R.parseStateJson("{broken"), /JSON 문법/);
});
