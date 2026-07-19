const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const M = require("../middle-school/geometry-rhythm-sequencer/math.js");
const { AudioClockSequencer } = require("../middle-school/geometry-rhythm-sequencer/audio-engine.js");

test("gcd, lcm과 소인수분해를 결정적으로 계산한다", () => {
  assert.equal(M.gcd(6, 8), 2);
  assert.equal(M.lcm(6, 8), 24);
  assert.deepEqual(M.primeFactors(72), [[2, 3], [3, 2]]);
  assert.equal(M.lcmMany([3, 4, 6, 8]), 24);
});

test("같은 시작점의 공통 시간 격자와 공통 방향을 구분한다", () => {
  const result = M.commonHitInfo({ divisions: 4, phase: 0 }, { divisions: 6, phase: 0 });
  assert.equal(result.lcm, 12);
  assert.equal(result.gcd, 2);
  assert.equal(result.commonCount, 2);
  assert.deepEqual(result.positions, [0, 0.5]);
  assert.equal(result.patternShift, 0.5);
  assert.equal(result.fullGeometryReturn, 1);
});

test("위상 차이는 공통 격자 조건으로 따로 판정한다", () => {
  const compatible = M.commonHitInfo({ divisions: 4, phase: 0 }, { divisions: 6, phase: 30 / 360 });
  assert.equal(compatible.compatible, true);
  assert.equal(compatible.commonCount, 2);
  assert.deepEqual(compatible.positions, [0.25, 0.75]);

  const incompatible = M.commonHitInfo({ divisions: 4, phase: 0 }, { divisions: 6, phase: 10 / 360 });
  assert.equal(incompatible.compatible, false);
  assert.equal(incompatible.commonCount, 0);
  assert.deepEqual(incompatible.positions, []);
  assert.equal(incompatible.patternShift, 0.5);
});

test("한 바퀴 타격 스케줄은 끝점 동시 타격을 누락하거나 중복하지 않는다", () => {
  const layers = [
    { id: "a", divisions: 3, phase: 0, enabled: true, steps: [] },
    { id: "b", divisions: 4, phase: 0, enabled: true, steps: [] }
  ];
  const events = M.scheduleBetween(layers, 0, 1);
  assert.equal(events.length, 7);
  const groups = M.groupCoincidences(events);
  assert.equal(groups.length, 6);
  assert.equal(groups.at(-1).events.length, 2);
  assert.equal(groups.at(-1).position, 1);
});

test("쉼표와 악센트가 실제 타격 스케줄에 반영된다", () => {
  const layer = { id: "a", divisions: 4, phase: 0, enabled: true, steps: [
    { enabled: true, accent: true }, { enabled: false, accent: false }, { enabled: true, accent: false }, { enabled: false, accent: false }
  ] };
  const hits = M.hitFractions(layer, true);
  assert.deepEqual(hits.map((hit) => hit.step), [0, 2]);
  assert.equal(hits[0].accent, 1);
  assert.equal(M.patternRepeatInfo([
    layer,
    { divisions: 6, enabled: true, steps: Array.from({ length: 6 }, () => ({ enabled: true, accent: false })) }
  ]).value, 1);
});

test("속도 변경 전후에도 오디오 시계의 바퀴 위치를 보존한다", () => {
  const clock = new AudioClockSequencer();
  clock.context = { currentTime: 10 };
  clock.playing = true;
  clock.bpm = 60;
  clock.anchorTime = 8;
  clock.anchorPosition = 2;
  clock.scheduledUntil = 10;
  assert.equal(clock.currentPosition(), 2.5);
  clock.setBpm(120);
  assert.equal(clock.anchorPosition, 2.5);
  assert.equal(clock.bpm, 120);
  assert.equal(clock.pause(), 2.5);
  clock.stop();
  assert.equal(clock.pausedPosition, 0);
});

test("패턴 공유 문자열은 한글 설정까지 손실 없이 왕복한다", () => {
  const original = { kind: "geometry-rhythm-sequencer", bpm: 96, layers: [{ name: "층 가", divisions: 7 }] };
  assert.deepEqual(M.decodeShare(M.encodeShare(original)), original);
});

test("도구 안 설명서와 홈의 바로 열기 링크가 연결되어 있다", () => {
  const toolHtml = fs.readFileSync(path.join(__dirname, "..", "middle-school", "geometry-rhythm-sequencer", "index.html"), "utf8");
  const homeHtml = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.match(toolHtml, /id="guideButton"/);
  assert.match(toolHtml, /id="guideDialog"/);
  assert.match(toolHtml, /공통 시간 격자는 lcm\(n,m\)칸/);
  assert.match(homeHtml, /geometry-rhythm-sequencer\/index\.html\?manual=1/);
});
