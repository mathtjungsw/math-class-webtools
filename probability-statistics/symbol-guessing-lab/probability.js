(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SymbolGuessingProbability = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function combination(n, k) {
    if (!Number.isInteger(n) || !Number.isInteger(k) || n < 0 || k < 0 || k > n) return 0;
    const r = Math.min(k, n - k);
    let result = 1;
    for (let i = 1; i <= r; i += 1) result = result * (n - r + i) / i;
    return Math.round(result);
  }

  function binomialPMF(n, p) {
    if (!Number.isInteger(n) || n < 0) throw new RangeError("n은 0 이상의 정수여야 합니다.");
    if (!Number.isFinite(p) || p < 0 || p > 1) throw new RangeError("p는 0 이상 1 이하여야 합니다.");
    const probabilities = Array(n + 1).fill(0);
    if (p === 0) {
      probabilities[0] = 1;
      return probabilities;
    }
    if (p === 1) {
      probabilities[n] = 1;
      return probabilities;
    }
    probabilities[0] = Math.pow(1 - p, n);
    const ratio = p / (1 - p);
    for (let k = 0; k < n; k += 1) {
      probabilities[k + 1] = probabilities[k] * ((n - k) / (k + 1)) * ratio;
    }
    const sum = probabilities.reduce((total, value) => total + value, 0);
    return probabilities.map((value) => value / sum);
  }

  function cumulativeAtMost(probabilities, score) {
    const end = clamp(Math.floor(score), -1, probabilities.length - 1);
    if (end < 0) return 0;
    return probabilities.slice(0, end + 1).reduce((total, value) => total + value, 0);
  }

  function cumulativeAtLeast(probabilities, score) {
    const start = clamp(Math.ceil(score), 0, probabilities.length);
    if (start >= probabilities.length) return 0;
    return probabilities.slice(start).reduce((total, value) => total + value, 0);
  }

  function binomialSummary(n, p) {
    return { mean: n * p, standardDeviation: Math.sqrt(n * p * (1 - p)) };
  }

  function mulberry32(seed) {
    let value = (Number(seed) || 1) >>> 0;
    return function () {
      value += 0x6D2B79F5;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function simulateBinomial(n, p, repetitions, random, dependence) {
    if (!Number.isInteger(repetitions) || repetitions < 1) throw new RangeError("반복 횟수는 1 이상의 정수여야 합니다.");
    const rng = typeof random === "function" ? random : Math.random;
    const link = clamp(Number(dependence) || 0, 0, 1);
    const counts = Array(n + 1).fill(0);
    for (let repeat = 0; repeat < repetitions; repeat += 1) {
      let score = 0;
      let previous = null;
      for (let item = 0; item < n; item += 1) {
        const success = previous !== null && rng() < link ? previous : rng() < p;
        if (success) score += 1;
        previous = success;
      }
      counts[score] += 1;
    }
    return counts;
  }

  function simulateAssumptions(options) {
    const n = options.n;
    const repetitions = options.repetitions;
    const p = clamp(Number(options.p), 0, 1);
    const leftBias = clamp(Number(options.leftBias), 0, 1);
    const dependence = clamp(Number(options.dependence), 0, 1);
    const rng = typeof options.random === "function" ? options.random : Math.random;
    const scoreCounts = Array(n + 1).fill(0);
    let totalLeft = 0;
    let adjacentSame = 0;
    let adjacentPairs = 0;

    for (let repeat = 0; repeat < repetitions; repeat += 1) {
      let score = 0;
      let previousCorrect = null;
      let previousLeft = null;
      for (let item = 0; item < n; item += 1) {
        const chooseLeft = previousLeft !== null && rng() < dependence ? previousLeft : rng() < leftBias;
        const correct = previousCorrect !== null && rng() < dependence ? previousCorrect : rng() < p;
        if (chooseLeft) totalLeft += 1;
        if (correct) score += 1;
        if (previousLeft !== null) {
          adjacentPairs += 1;
          if (chooseLeft === previousLeft) adjacentSame += 1;
        }
        previousLeft = chooseLeft;
        previousCorrect = correct;
      }
      scoreCounts[score] += 1;
    }
    return {
      scoreCounts,
      leftRate: totalLeft / (n * repetitions),
      adjacentSameRate: adjacentPairs ? adjacentSame / adjacentPairs : 0,
    };
  }

  function summarizeValues(values) {
    if (!values.length) return { count: 0, mean: 0, standardDeviation: 0, min: 0, max: 0 };
    const mean = values.reduce((total, value) => total + value, 0) / values.length;
    const variance = values.reduce((total, value) => total + Math.pow(value - mean, 2), 0) / values.length;
    return {
      count: values.length,
      mean,
      standardDeviation: Math.sqrt(variance),
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }

  function countsToValues(counts) {
    const values = [];
    counts.forEach((count, score) => {
      for (let i = 0; i < count; i += 1) values.push(score);
    });
    return values;
  }

  function totalVariation(counts, theoreticalProbabilities) {
    const total = counts.reduce((sum, count) => sum + count, 0);
    if (!total) return 0;
    return 0.5 * counts.reduce((sum, count, score) => {
      return sum + Math.abs(count / total - (theoreticalProbabilities[score] || 0));
    }, 0);
  }

  function parseScores(text, maxScore) {
    const accepted = [];
    const rejected = [];
    String(text || "")
      .split(/[\s,;]+/)
      .map((token) => token.trim())
      .filter(Boolean)
      .forEach((token) => {
        const value = Number(token);
        if (Number.isInteger(value) && value >= 0 && value <= maxScore) accepted.push(value);
        else rejected.push(token);
      });
    return { accepted, rejected };
  }

  function generateAnswerKey(n, pattern, customPattern, random) {
    const rng = typeof random === "function" ? random : Math.random;
    if (pattern === "alternating") return Array.from({ length: n }, (_, index) => index % 2);
    if (pattern === "custom") {
      const source = String(customPattern || "")
        .toUpperCase()
        .split("")
        .filter((value) => value === "L" || value === "R");
      if (!source.length) return Array.from({ length: n }, (_, index) => index % 2);
      return Array.from({ length: n }, (_, index) => source[index % source.length] === "R" ? 1 : 0);
    }
    if (pattern === "random") return Array.from({ length: n }, () => rng() < 0.5 ? 0 : 1);
    const balanced = Array.from({ length: n }, (_, index) => index < Math.ceil(n / 2) ? 0 : 1);
    for (let index = balanced.length - 1; index > 0; index -= 1) {
      const target = Math.floor(rng() * (index + 1));
      [balanced[index], balanced[target]] = [balanced[target], balanced[index]];
    }
    return balanced;
  }

  function scoreAnswers(answers, answerKey) {
    let score = 0;
    const correctness = answerKey.map((answer, index) => {
      const correct = answers[index] === answer;
      if (correct) score += 1;
      return correct;
    });
    return { score, correctness, answered: answers.filter((answer) => answer === 0 || answer === 1).length };
  }

  function sanitizePreset(input) {
    const source = input && typeof input === "object" ? input : {};
    const patternOptions = ["balanced", "random", "alternating", "custom"];
    const languageOptions = ["arabic", "georgian", "armenian", "amharic", "egyptian", "sanskrit", "sumerian", "mixed", "ancient_mixed", "all_mixed"];
    return {
      name: String(source.name || "수업 프리셋").trim().slice(0, 40) || "수업 프리셋",
      questionCount: clamp(Math.round(Number(source.questionCount) || 20), 10, 50),
      language: languageOptions.includes(source.language) ? source.language : "arabic",
      leftLabel: String(source.leftLabel || "모양 A").trim().slice(0, 20) || "모양 A",
      rightLabel: String(source.rightLabel || "모양 B").trim().slice(0, 20) || "모양 B",
      answerPattern: patternOptions.includes(source.answerPattern) ? source.answerPattern : "balanced",
      customPattern: String(source.customPattern || "LR").toUpperCase().replace(/[^LR]/g, "").slice(0, 100) || "LR",
      timeLimit: clamp(Math.round(Number(source.timeLimit) || 0), 0, 3600),
      seed: clamp(Math.round(Number(source.seed) || 2026), 1, 999999999),
    };
  }

  return {
    binomialPMF,
    binomialSummary,
    combination,
    countsToValues,
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
  };
});
