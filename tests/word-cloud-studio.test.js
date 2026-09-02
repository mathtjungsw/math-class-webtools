const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const W = require("../ai-math/word-cloud-studio/engine.js");

test("한글·영문·숫자를 문장부호와 분리해 정규화한다", () => {
  assert.deepEqual(W.tokenize("수학, AI-Model! 2026년 수학"), ["수학", "ai-model", "2026년", "수학"]);
});

test("기본 한국어 불용어와 짧은 단어를 제외하고 빈도를 센다", () => {
  const result = W.analyzeText("수학 그리고 수학 데이터 는 데이터 AI", {
    maxWords: 50,
    minLength: 2,
    includeNumbers: false
  });
  assert.deepEqual(result.allEntries.map(({ word, count }) => ({ word, count })), [
    { word: "데이터", count: 2 },
    { word: "수학", count: 2 },
    { word: "ai", count: 1 }
  ]);
  assert.equal(result.stats.removedStopwords, 2);
  assert.equal(result.stats.analyzedTokens, 5);
});

test("한국어 단어에 붙은 흔한 조사를 기초 규칙으로 묶어 센다", () => {
  const result = W.analyzeText("수학은 수학을 학교에서 데이터가", { minLength: 2 });
  assert.deepEqual(result.allEntries.map(({ word, count }) => ({ word, count })), [
    { word: "수학", count: 2 },
    { word: "데이터", count: 1 },
    { word: "학교", count: 1 }
  ]);
  assert.equal(result.stats.normalizedParticles, 4);
  assert.equal(W.stripKoreanParticle("사과"), "사과");
});

test("사용자 불용어·숫자 포함·최대 단어 수 설정을 적용한다", () => {
  const result = W.analyzeText("사과 사과 배 배 포도 2026 2026", {
    customStopwords: "사과",
    includeNumbers: true,
    minLength: 1,
    maxWords: 2
  });
  assert.deepEqual(result.entries.map((entry) => entry.word), ["2026", "배"]);
  assert.equal(result.stats.uniqueWords, 3);
  assert.equal(result.stats.selectedWords, 2);
  assert.equal(result.stats.removedStopwords, 2);
});

test("숫자 제외와 비율 합계를 정확히 계산한다", () => {
  const result = W.analyzeText("자료 자료 분석 123", {
    useDefaultStopwords: false,
    includeNumbers: false,
    minLength: 1
  });
  assert.equal(result.stats.removedNumbers, 1);
  assert.equal(result.allEntries[0].percent, 2 / 3 * 100);
  assert.equal(Math.round(result.allEntries.reduce((sum, entry) => sum + entry.percent, 0)), 100);
});

test("CSV는 순위·빈도·비율 열을 포함한다", () => {
  const result = W.analyzeText("데이터 데이터 수학", { minLength: 1 });
  const csv = W.toCsv(result);
  assert.match(csv, /^순위,단어,빈도,비율\(%\)/);
  assert.match(csv, /1,데이터,2,66\.67/);
});

test("메인 카탈로그의 인공지능 수학 과목에 워드클라우드 도구가 등록되어 있다", () => {
  const root = path.resolve(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(html, /data-tool-id="word-cloud-studio"/);
  assert.match(html, /data-tool-tags="[^"]*ai-math[^"]*statistics[^"]*"/);
  assert.match(html, /href="\.\/ai-math\/word-cloud-studio\/index\.html"/);
});

test("화면 스크립트가 참조하는 모든 고정 요소가 HTML에 존재한다", () => {
  const root = path.resolve(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "ai-math/word-cloud-studio/index.html"), "utf8");
  const app = fs.readFileSync(path.join(root, "ai-math/word-cloud-studio/app.js"), "utf8");
  const ids = [...app.matchAll(/\$\("([A-Za-z][A-Za-z0-9_-]*)"\)/g)].map((match) => match[1]);
  [...new Set(ids)].forEach((id) => assert.match(html, new RegExp(`id="${id}"`), `missing #${id}`));
});
