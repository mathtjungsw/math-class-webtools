const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const model = require("../probability-statistics/graph-framing-lab/model.js");

function row(group, x, n, strongYes, yes, no, strongNo) {
  return model.normalizeRow({ group, x, n, strongYes, yes, no, strongNo });
}

test("CSV 범주 빈도를 비율로 정규화한다", () => {
  const rows = model.parseCSV([
    "group,x,n,strong_yes,yes,no,strong_no",
    "집단 A,1,100,20,50,20,10",
    "집단 B,1,80,8,32,32,8",
    "집단 A,2,90,18,45,18,9",
    "집단 B,2,70,7,28,28,7"
  ].join("\n"));

  assert.equal(rows.length, 4);
  assert.equal(rows[0].strongYes, 0.2);
  assert.equal(rows[0].yes, 0.5);
  assert.ok(Math.abs(rows[0].no + rows[0].strongNo - 0.3) < 1e-12);
});

test("4범주 기대점수와 이항 통합은 같은 원자료에서 다른 요약값을 만든다", () => {
  const source = row("집단 A", 1, 100, 0.2, 0.5, 0.2, 0.1);
  const ordinal = model.pointEstimate(source, "ordinal");
  const binary = model.pointEstimate(source, "binary");

  assert.ok(Math.abs(ordinal.value - 0.6) < 1e-12);
  assert.ok(Math.abs(binary.value - 0.7) < 1e-12);
  assert.notEqual(ordinal.variance, binary.variance);
});

test("표본 크기가 커지면 95% 신뢰구간 폭이 줄어든다", () => {
  const source = row("집단 A", 1, 50, 0.2, 0.4, 0.3, 0.1);
  const small = model.calculateInterval(source, "binary", 0.5);
  const large = model.calculateInterval(source, "binary", 2);

  assert.ok((small.high - small.low) > (large.high - large.low));
  assert.equal(small.n, 25);
  assert.equal(large.n, 100);
});

test("자료가 적은 x 구간을 표시 상태에 따라 포함하거나 제외한다", () => {
  const rows = [
    row("집단 A", 1, 50, .2, .5, .2, .1),
    row("집단 B", 1, 50, .2, .4, .3, .1),
    row("집단 A", 2, 4, .2, .5, .2, .1),
    row("집단 B", 2, 4, .2, .4, .3, .1)
  ];
  const base = { xMin: 1, xMax: 2, visibleGroups: ["집단 A", "집단 B"], sparseThreshold: 40 };

  assert.deepEqual(model.sparseXValues(rows, 40), [2]);
  assert.equal(model.visibleRows(rows, { ...base, includeSparse: true }).length, 4);
  assert.equal(model.visibleRows(rows, { ...base, includeSparse: false }).length, 2);
});

test("잘린 y축의 시각적 확대 비율을 전체 0~1축과 비교한다", () => {
  assert.equal(model.computeVisualAmplification(0, 1), 1);
  assert.equal(model.computeVisualAmplification(0.4, 0.9), 2);
  assert.ok(Math.abs(model.computeVisualAmplification(0.7, 0.8) - 10) < 1e-12);
});

test("요약 통계는 끝점 실제 차이, 구간 중첩, 표본 수를 계산한다", () => {
  const rows = [
    row("집단 A", 1, 100, .1, .5, .3, .1),
    row("집단 A", 2, 100, .1, .4, .4, .1),
    row("집단 B", 1, 100, .2, .5, .2, .1),
    row("집단 B", 2, 100, .3, .5, .1, .1)
  ];
  const state = {
    yMin: .4,
    yMax: .9,
    xMin: 1,
    xMax: 2,
    includeSparse: true,
    sparseThreshold: 40,
    visibleGroups: ["집단 A", "집단 B"],
    analysisMode: "binary",
    sampleScale: 1
  };
  const summary = model.summarize(rows, state);

  assert.ok(Math.abs(summary.actualGap - 0.3) < 1e-12);
  assert.equal(summary.ciOverlap, false);
  assert.equal(summary.totalN, 400);
  assert.equal(summary.visualAmplification, 2);
});

test("축 표기는 확률·백분율·0~10 변환을 구분한다", () => {
  assert.equal(model.formatAxisValue(0.75, "probability"), "0.75");
  assert.equal(model.formatAxisValue(0.75, "percent"), "75%");
  assert.equal(model.formatAxisValue(0.75, "score10"), "7.5");
});

test("정보가 생략된 상태를 단정 대신 근거 신호로 반환한다", () => {
  const rows = [
    row("집단 A", 1, 100, .1, .5, .3, .1),
    row("집단 A", 2, 100, .1, .4, .4, .1),
    row("집단 B", 1, 100, .2, .5, .2, .1),
    row("집단 B", 2, 100, .3, .5, .1, .1)
  ];
  const signals = model.evaluateSignals(rows, {
    yMin: .5,
    yMax: .9,
    axisUnit: "score10",
    xMin: 1,
    xMax: 2,
    includeSparse: true,
    showCI: false,
    analysisMode: "binary",
    lineWidth: 8,
    emphasizeSlope: true,
    visibleGroups: ["집단 A"]
  });

  assert.equal(signals.find((signal) => signal.id === "axis").level, "watch");
  assert.equal(signals.find((signal) => signal.id === "ci").level, "risk");
  assert.equal(signals.find((signal) => signal.id === "unit").level, "risk");
  assert.equal(signals.find((signal) => signal.id === "groups").level, "watch");
  assert.ok(signals.some((signal) => signal.id === "style"));
});

test("학생 설명서 버튼·대화상자와 직접 열기 동작이 연결되어 있다", () => {
  const toolDir = path.join(__dirname, "..", "probability-statistics", "graph-framing-lab");
  const html = fs.readFileSync(path.join(toolDir, "index.html"), "utf8");
  const app = fs.readFileSync(path.join(toolDir, "app.js"), "utf8");

  assert.match(html, /id="manualButton">설명서 보기</);
  assert.match(html, /<dialog id="manualDialog" aria-labelledby="manualDialogTitle">/);
  assert.match(html, /학생 활동 5단계/);
  assert.match(app, /manualButton[^\n]+manualDialog\.showModal\(\)/);
  assert.match(app, /get\("manual"\) === "1"/);
});
