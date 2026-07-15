const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const model = require("../probability-statistics/equiprobability-detective/model.js");

test("구별되는 두 공정한 동전의 네 미시 결과에서 앞면 1개는 1/2이다", () => {
  const theory = model.coinTheory();
  assert.deepEqual(theory.micro, ["HH", "HT", "TH", "TT"]);
  assert.equal(theory.target.text, "1/2");
  assert.deepEqual(theory.macro.map((item) => item.count), [1, 2, 1]);
});

test("직육면체 주사위는 면 쌍 가중치를 각 면으로 나누어 계산한다", () => {
  const theory = model.diceTheory([6, 3, 1]);
  assert.deepEqual(theory.faceWeights, [6, 3, 1, 1, 3, 6]);
  assert.equal(theory.faces[0].probability.text, "3/10");
  assert.equal(theory.faces[2].probability.text, "1/20");
  assert.equal(theory.faces.reduce((sum, face) => sum + face.probability.value, 0), 1);
});

test("검정 2개와 흰색 2개의 여섯 배치는 이웃형 4개, 교대형 2개이다", () => {
  const theory = model.necklaceTheory();
  assert.equal(theory.micro.length, 6);
  assert.equal(theory.groups.find((group) => group.key === "adjacent").states.length, 4);
  assert.equal(theory.groups.find((group) => group.key === "alternating").states.length, 2);
  assert.equal(theory.target.text, "2/3");
});

test("베르트랑 상자에서 관찰된 금화 세 경우 중 두 경우의 반대편이 금이다", () => {
  const theory = model.bertrandTheory([2, 0, 1]);
  assert.equal(theory.observedGold, 3);
  assert.equal(theory.partnerGold, 2);
  assert.equal(theory.target.text, "2/3");
});

test("두 단계 상자 선택의 기본 확률은 11/30이고 단순 합산 3/8과 다르다", () => {
  const theory = model.twoStageTheory({
    boxWeights: [1, 1],
    boxes: [{ black: 2, white: 1 }, { black: 3, white: 2 }],
  });
  assert.equal(theory.target.text, "11/30");
  assert.equal(theory.naivePooled.text, "3/8");
  assert.deepEqual(theory.branches.map((branch) => branch.whitePath.text), ["1/6", "1/5"]);
});

test("고정 시드 몬테카를로 결과가 각 이론확률에 가까워진다", () => {
  const configs = model.createDefaultSession().configs;
  const checks = [
    ["coin", (result) => result.counts.one / result.trials, 1 / 2],
    ["dice", (result) => result.counts["face-1"] / result.trials, 3 / 10],
    ["necklace", (result) => result.counts.adjacent / result.trials, 2 / 3],
    ["bertrand", (result) => result.counts["partner-gold"] / result.evidenceCount, 2 / 3],
    ["two-stage", (result) => result.counts.white / result.trials, 11 / 30],
  ];
  checks.forEach(([id, observed, expected]) => {
    const result = model.simulateMission(id, configs, 100000, 1701);
    assert.ok(Math.abs(observed(result) - expected) < 0.01, `${id} simulation drifted`);
  });
});

test("초기화와 저장 데이터 복원이 안전한 기본값을 유지한다", () => {
  const initial = model.createDefaultSession();
  assert.equal(initial.mode, "solo");
  assert.deepEqual(initial.configs.diceWeights, [6, 3, 1]);

  const restored = model.sanitizeSession({
    mode: "team",
    activeMission: "bertrand",
    score: 999,
    configs: { diceWeights: [0, 0, 0], bertrandGolds: [2, 1, 0] },
    records: { coin: { prediction: "1/2", points: 20, correct: true } },
  });
  assert.equal(restored.mode, "team");
  assert.equal(restored.activeMission, "bertrand");
  assert.equal(restored.score, 100);
  assert.deepEqual(restored.configs.diceWeights, [6, 3, 1]);
  assert.equal(restored.records.coin.points, 20);
});

test("정적 페이지에 접근성, 저장, 초기화, 인쇄 진입점이 연결되어 있다", () => {
  const root = path.join(__dirname, "..", "probability-statistics", "equiprobability-detective");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.match(html, /<html lang="ko">/);
  assert.match(html, /id="missionNav"/);
  assert.match(html, /id="printButton"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(app, /localStorage\.setItem/);
  assert.match(app, /window\.print\(\)/);
  assert.match(app, /createDefaultSession/);
});
