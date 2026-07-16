const test = require("node:test");
const assert = require("node:assert/strict");
const {
  binomialPMF,
  binomialSummary,
  combination,
  cumulativeAtLeast,
  cumulativeAtMost,
  generateAnswerKey,
  mulberry32,
  parseScores,
  sanitizePreset,
  scoreAnswers,
  simulateAssumptions,
  simulateBinomial,
  summarizeValues,
  totalVariation,
} = require("../probability-statistics/symbol-guessing-lab/probability.js");
const {
  ANCIENT_LANGUAGE_IDS,
  LANGUAGE_META,
  MEANINGS,
  MODERN_LANGUAGE_IDS,
  WORD_SETS,
  buildQuestionSet,
} = require("../probability-statistics/symbol-guessing-lab/words.js");

test("조합은 경계와 큰 값을 정확히 계산한다", () => {
  assert.equal(combination(0, 0), 1);
  assert.equal(combination(5, 2), 10);
  assert.equal(combination(50, 25), 126410606437752);
  assert.equal(combination(12, 4), combination(12, 8));
  assert.equal(combination(5, 8), 0);
});

test("B(20, 0.5)의 확률은 합이 1이고 가운데 값이 정확하다", () => {
  const probabilities = binomialPMF(20, 0.5);
  assert.equal(probabilities.length, 21);
  assert.ok(Math.abs(probabilities.reduce((sum, value) => sum + value, 0) - 1) < 1e-12);
  assert.ok(Math.abs(probabilities[10] - 184756 / 1048576) < 1e-15);
  probabilities.forEach((value, score) => assert.ok(Math.abs(value - probabilities[20 - score]) < 1e-15));
});

test("이항분포는 p=0과 p=1에서 퇴화하고 다른 p에서도 정규화된다", () => {
  assert.deepEqual(binomialPMF(4, 0), [1, 0, 0, 0, 0]);
  assert.deepEqual(binomialPMF(4, 1), [0, 0, 0, 0, 1]);
  const probabilities = binomialPMF(50, 0.3);
  assert.ok(probabilities.every((value) => Number.isFinite(value) && value >= 0));
  assert.ok(Math.abs(probabilities.reduce((sum, value) => sum + value, 0) - 1) < 1e-12);
});

test("기댓값과 표준편차를 np와 sqrt(npq)로 계산한다", () => {
  const summary = binomialSummary(20, 0.5);
  assert.equal(summary.mean, 10);
  assert.ok(Math.abs(summary.standardDeviation - Math.sqrt(5)) < 1e-15);
});

test("이하·이상 누적확률은 관측 점수를 포함한다", () => {
  const probabilities = binomialPMF(20, 0.5);
  assert.ok(Math.abs(cumulativeAtMost(probabilities, 5) - 21700 / 1048576) < 1e-15);
  assert.ok(Math.abs(cumulativeAtLeast(probabilities, 15) - 21700 / 1048576) < 1e-15);
  assert.ok(Math.abs(cumulativeAtMost(probabilities, 10) - 616666 / 1048576) < 1e-15);
  assert.ok(Math.abs(cumulativeAtLeast(probabilities, 10) - 616666 / 1048576) < 1e-15);
  assert.equal(cumulativeAtLeast(probabilities, 0), 1);
  assert.equal(cumulativeAtMost(probabilities, 20), 1);
});

test("고정 실험 번호의 모의실험은 재현되고 횟수를 보존한다", () => {
  const first = simulateBinomial(20, 0.5, 1000, mulberry32(2026));
  const second = simulateBinomial(20, 0.5, 1000, mulberry32(2026));
  assert.deepEqual(first, second);
  assert.equal(first.reduce((sum, count) => sum + count, 0), 1000);
  assert.equal(simulateBinomial(5, 0, 10, mulberry32(1))[0], 10);
  assert.equal(simulateBinomial(5, 1, 10, mulberry32(1))[5], 10);
});

test("의존도 1이면 한 실험 안의 정오 결과가 모두 이어진다", () => {
  const counts = simulateBinomial(4, 0.5, 6, mulberry32(77), 1);
  assert.equal(counts[1] + counts[2] + counts[3], 0);
  assert.equal(counts[0] + counts[4], 6);
});

test("확장 실험은 편향·연속 선택 지표와 점수 횟수를 반환한다", () => {
  const result = simulateAssumptions({ n: 10, p: 1, leftBias: 1, dependence: 0, repetitions: 20, random: mulberry32(9) });
  assert.equal(result.scoreCounts[10], 20);
  assert.equal(result.scoreCounts.reduce((sum, count) => sum + count, 0), 20);
  assert.equal(result.leftRate, 1);
  assert.equal(result.adjacentSameRate, 1);
});

test("학급 점수 파서는 범위 안 정수만 받고 제외 토큰을 보고한다", () => {
  const parsed = parseScores("점수\n0, 8, 10; 20 21 -1 9.5", 20);
  assert.deepEqual(parsed.accepted, [0, 8, 10, 20]);
  assert.deepEqual(parsed.rejected, ["점수", "21", "-1", "9.5"]);
  assert.deepEqual(summarizeValues([8, 10, 12]), { count: 3, mean: 10, standardDeviation: Math.sqrt(8 / 3), min: 8, max: 12 });
});

test("관측분포가 이론분포와 같으면 총변동거리는 0이다", () => {
  assert.equal(totalVariation([2, 2], [0.5, 0.5]), 0);
  assert.equal(totalVariation([4, 0], [0.5, 0.5]), 0.5);
});

test("정답 패턴 생성과 채점은 정답·미응답을 구분한다", () => {
  assert.deepEqual(generateAnswerKey(6, "alternating", "", mulberry32(1)), [0, 1, 0, 1, 0, 1]);
  assert.deepEqual(generateAnswerKey(5, "custom", "LRR", mulberry32(1)), [0, 1, 1, 0, 1]);
  const result = scoreAnswers([0, 0, null, 1], [0, 1, 0, 1]);
  assert.equal(result.score, 2);
  assert.equal(result.answered, 3);
  assert.deepEqual(result.correctness, [true, false, false, true]);
});

test("교사 프리셋은 범위와 허용 패턴을 안전하게 정리한다", () => {
  const preset = sanitizePreset({ name: "  실험반  ", questionCount: 999, language: "unknown", leftLabel: "", rightLabel: "오른쪽", answerPattern: "hidden", customPattern: "L-X-r", timeLimit: -10, seed: 0 });
  assert.deepEqual(preset, {
    name: "실험반",
    questionCount: 50,
    language: "arabic",
    leftLabel: "모양 A",
    rightLabel: "오른쪽",
    answerPattern: "balanced",
    customPattern: "LR",
    timeLimit: 0,
    seed: 2026,
  });
  assert.equal(sanitizePreset({ language: "sumerian" }).language, "sumerian");
  assert.equal(sanitizePreset({ language: "ancient_mixed" }).language, "ancient_mixed");
});

test("현대·고대 일곱 언어 어휘 세트는 50개 문항을 제공한다", () => {
  assert.equal(MEANINGS.length, 50);
  assert.deepEqual(MODERN_LANGUAGE_IDS, ["arabic", "georgian", "armenian", "amharic"]);
  assert.deepEqual(ANCIENT_LANGUAGE_IDS, ["egyptian", "sanskrit", "sumerian"]);
  assert.deepEqual(Object.keys(WORD_SETS), [...MODERN_LANGUAGE_IDS, ...ANCIENT_LANGUAGE_IDS]);
  Object.entries(WORD_SETS).forEach(([language, words]) => {
    assert.equal(words.length, MEANINGS.length, language);
    assert.ok(words.every((word) => typeof word === "string" && word.trim().length > 0));
    assert.ok(LANGUAGE_META[language]);
  });
});

test("실제 언어 문항은 정답 위치에 맞춰 두 뜻을 배치하고 50문항을 넘지 않는다", () => {
  const answerKey = Array.from({ length: 60 }, (_, index) => index % 2);
  const questions = buildQuestionSet({ language: "arabic", n: 60, answerKey, random: mulberry32(77) });
  assert.equal(questions.length, 50);
  questions.forEach((question, index) => {
    assert.equal(question.languageId, "arabic");
    assert.equal(question.options[question.correctSide], question.meaning);
    assert.equal(question.correctSide, answerKey[index]);
  });
});

test("혼합 모드는 네 언어를 모두 사용하고 같은 시드에서 재현된다", () => {
  const options = { language: "mixed", n: 20, answerKey: Array(20).fill(0) };
  const first = buildQuestionSet({ ...options, random: mulberry32(2026) });
  const second = buildQuestionSet({ ...options, random: mulberry32(2026) });
  assert.deepEqual(first, second);
  assert.deepEqual(new Set(first.map((question) => question.languageId)), new Set(["arabic", "georgian", "armenian", "amharic"]));
});

test("고대 문자 혼합은 세 고대어를 모두 사용하고 음역 정보를 보존한다", () => {
  const questions = buildQuestionSet({ language: "ancient_mixed", n: 20, answerKey: Array(20).fill(1), random: mulberry32(404) });
  assert.deepEqual(new Set(questions.map((question) => question.languageId)), new Set(["egyptian", "sanskrit", "sumerian"]));
  assert.ok(questions.filter((question) => question.languageId === "egyptian" || question.languageId === "sumerian").every((question) => question.reading));
  assert.ok(questions.every((question) => question.options[1] === question.meaning));
});
