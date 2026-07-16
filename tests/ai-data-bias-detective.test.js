const test = require("node:test");
const assert = require("node:assert/strict");
const model = require("../ai-math/ai-data-bias-detective/model.js");

function defaultLab(overrides = {}) {
  const config = model.createConfig(overrides);
  const cards = model.generateDataset(config);
  const trained = model.trainModel(cards, config, []);
  return { config, cards, trained, evaluations: model.evaluateAll(trained, cards, config) };
}

test("기본 편향 자료는 같은 분포에서 높고 배경 반전에서 실패한다", () => {
  const { cards, trained, evaluations } = defaultLab();
  assert.equal(cards.length, 44);
  assert.equal(model.splitCards(cards, "train").length, 12);
  assert.equal(trained.ok, true);
  assert.equal(evaluations.train.accuracy, 1);
  assert.equal(evaluations.validation.accuracy, 1);
  assert.equal(evaluations.general.accuracy, 1);
  assert.equal(evaluations.counterfactual.accuracy, 0);
  assert.equal(evaluations.counterfactual.worstGroupAccuracy, 0);
});

test("나이브 베이즈 점수와 특징 기여는 유한하고 결정적이다", () => {
  const { cards, trained } = defaultLab();
  const card = model.splitCards(cards, "general")[0];
  const first = model.predict(trained, card);
  const second = model.predict(trained, card);
  assert.deepEqual(first, second);
  assert.ok(first.scores.every((entry) => Number.isFinite(entry.score)));
  assert.ok(model.FEATURE_KEYS.every((key) => Number.isFinite(first.contribution[key])));
  const importanceSum = Object.values(trained.importance).reduce((sum, item) => sum + item.percent, 0);
  assert.ok(Math.abs(importanceSum - 100) < 1e-9);
});

test("동률은 선언된 첫 클래스로 결정한다", () => {
  const config = model.createConfig({});
  const cards = [
    { id: "a", sceneId: "a", split: "train", label: "classA", features: { target: "a", background: "a", weather: "a", camera: "a" }, included: true },
    { id: "b", sceneId: "b", split: "train", label: "classB", features: { target: "b", background: "b", weather: "b", camera: "b" }, included: true },
  ];
  const trained = model.trainModel(cards, config, ["weather", "camera"]);
  const result = model.predict(trained, { label: "classA", features: { target: "a", background: "b", weather: "a", camera: "a" } });
  assert.equal(result.tied, true);
  assert.equal(result.predicted, "classA");
});

test("빈 훈련 자료와 한 클래스 자료를 명시적으로 거부한다", () => {
  const config = model.createConfig({});
  const empty = model.trainModel([], config, []);
  assert.equal(empty.ok, false);
  assert.equal(empty.code, "EMPTY_TRAINING");
  const oneClass = model.trainModel([
    { id: "a", split: "train", label: "classA", features: { target: "a", background: "a", weather: "a", camera: "a" }, included: true },
  ], config, []);
  assert.equal(oneClass.ok, false);
  assert.equal(oneClass.code, "ONE_CLASS");
  assert.equal(model.predict(oneClass, {}).ok, false);
});

test("보지 못한 특징값도 라플라스 평활로 안전하게 예측한다", () => {
  const { trained } = defaultLab();
  const result = model.predict(trained, { label: "classA", features: { target: "new-value", background: "a", weather: "a", camera: "a" } });
  assert.equal(result.ok, true);
  assert.ok(result.scores.every((entry) => Number.isFinite(entry.score)));
  assert.ok(result.scores.some((entry) => entry.parts.some((part) => part.unseen)));
});

test("교차표 연관도는 편향 자료에서 1이고 균형화 뒤 0이다", () => {
  const { config, cards } = defaultLab();
  const biased = model.crossTable(model.splitCards(cards, "train"), "background", config);
  assert.equal(biased.association, 1);
  const balancedCards = model.balanceTraining(cards, config);
  const balanced = model.crossTable(model.splitCards(balancedCards, "train"), "background", config);
  assert.equal(balanced.association, 0);
  assert.equal(model.splitCards(balancedCards, "train").length, 16);
});

test("반례 추가와 8조합 균형화는 반사실 성능을 회복한다", () => {
  const { config, cards } = defaultLab();
  [model.addCounterexamples(cards), model.balanceTraining(cards, config)].forEach((repaired) => {
    const trained = model.trainModel(repaired, config, []);
    const evaluations = model.evaluateAll(trained, repaired, config);
    assert.equal(evaluations.counterfactual.accuracy, 1);
    assert.equal(evaluations.counterfactual.worstGroupAccuracy, 1);
  });
});

test("지름길 특징 제거는 배경 반전 시험을 목표 특징만으로 해결한다", () => {
  const { config, cards } = defaultLab();
  const trained = model.trainModel(cards, config, ["background", "weather", "camera"]);
  assert.deepEqual(trained.activeFeatures, ["target"]);
  assert.equal(model.evaluateAll(trained, cards, config).counterfactual.accuracy, 1);
});

test("반사실 변환은 원본을 바꾸지 않고 지정한 특징만 바꾼다", () => {
  const { config, cards } = defaultLab();
  const original = model.splitCards(cards, "general")[0];
  const before = model.deepCopy(original);
  const background = model.transformCard(original, "background", config);
  assert.equal(background.label, original.label);
  assert.notEqual(background.features.background, original.features.background);
  assert.equal(background.features.target, original.features.target);
  const target = model.transformCard(original, "target", config);
  assert.notEqual(target.label, original.label);
  assert.notEqual(target.features.target, original.features.target);
  assert.equal(target.features.background, original.features.background);
  const masked = model.transformCard(original, "mask", config, "weather");
  assert.equal(masked.features.weather, model.MASKED_VALUE);
  assert.deepEqual(original, before);
});

test("평가 분할은 훈련 id와 겹치지 않고 재생성해도 결정적이다", () => {
  const { config, cards } = defaultLab();
  const trainingIds = new Set(cards.filter((card) => card.split === "train").map((card) => card.id));
  assert.ok(cards.filter((card) => card.split !== "train").every((card) => !trainingIds.has(card.id)));
  const first = model.rebuildEvaluationSplits(cards, config);
  const second = model.rebuildEvaluationSplits(cards, config);
  assert.deepEqual(first, second);
});

test("빈 평가와 작은 조합은 null과 insufficient로 안전하게 표시한다", () => {
  const { config, trained, cards } = defaultLab({ minimumGroupSize: 3 });
  const empty = model.evaluate(trained, [], config);
  assert.equal(empty.accuracy, null);
  assert.equal(empty.worstGroupAccuracy, null);
  const one = model.evaluate(trained, [model.splitCards(cards, "general")[0]], config);
  assert.equal(one.groups[0].insufficient, true);
  assert.equal(one.worstGroupAccuracy, null);
});

test("무작위화는 씨앗에 따라 결정적이며 원본을 변경하지 않는다", () => {
  const { config, cards } = defaultLab();
  const original = model.deepCopy(cards);
  const first = model.randomizeShortcuts(cards, config);
  const second = model.randomizeShortcuts(cards, config);
  assert.deepEqual(first, second);
  assert.deepEqual(cards, original);
});

test("CSV는 BOM·따옴표·CRLF를 포함해 의미적으로 왕복한다", () => {
  const { config, cards } = defaultLab();
  const text = model.exportCsv(cards);
  assert.ok(text.startsWith("\uFEFF"));
  assert.match(text, /\r\n/);
  const parsed = model.parseCsv(text, config);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.cards.length, cards.length);
  const quoted = '\uFEFFid,sceneId,split,label,target,background,weather,camera,included\r\n"card,1","scene\n1",train,classA,a,a,a,a,true';
  const parsedQuoted = model.parseCsv(quoted, config);
  assert.equal(parsedQuoted.ok, true);
  assert.equal(parsedQuoted.cards[0].id, "card,1");
  assert.equal(parsedQuoted.cards[0].sceneId, "scene\n1");
});

test("CSV는 필수 열·분할·중복 id·특징값 오류를 거부한다", () => {
  const config = model.createConfig({});
  assert.equal(model.parseCsv("id,split\na,train", config).code, "MISSING_COLUMNS");
  const head = "id,split,label,target,background,weather,camera,included\n";
  assert.equal(model.parseCsv(`${head}a,bad,classA,a,a,a,a,true`, config).code, "INVALID_SPLIT");
  assert.equal(model.parseCsv(`${head}a,train,classA,a,a,a,a,true\na,train,classB,b,b,b,b,true`, config).code, "DUPLICATE_ID");
  assert.equal(model.parseCsv(`${head}a,train,classA,z,a,a,a,true`, config).code, "INVALID_FEATURE");
});

test("프리셋 JSON은 설정·카드·마스킹·기록을 왕복하고 잘못된 버전을 거부한다", () => {
  const { config, cards } = defaultLab();
  const source = {
    config,
    cards,
    maskedFeatures: ["background"],
    notes: { expectation: "예상", evidence: "근거", conclusion: "결론", modelChoice: "B가 견고하다" },
    history: [{ label: "초기", train: 1 }],
  };
  const loaded = model.deserializeState(model.serializeState(source));
  assert.equal(loaded.ok, true);
  assert.equal(loaded.state.cards.length, cards.length);
  assert.deepEqual(loaded.state.maskedFeatures, ["background"]);
  assert.equal(loaded.state.notes.evidence, "근거");
  assert.equal(loaded.state.cards.find((card) => card.source === "candidate").included, false);
  assert.equal(model.deserializeState("not json").code, "INVALID_JSON");
  assert.equal(model.deserializeState('{"version":2,"type":"ai-data-bias-detective","cards":[]}').code, "INVALID_SCHEMA");
});
