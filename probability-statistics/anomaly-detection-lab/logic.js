(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AnomalyLabLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const METHODS = ["distance", "zscore", "iqr", "moving", "twoFeature"];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function finiteNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function finiteValues(values) {
    return (Array.isArray(values) ? values : []).map(Number).filter(Number.isFinite);
  }

  function mean(values) {
    const clean = finiteValues(values);
    if (!clean.length) return 0;
    return clean.reduce((sum, value) => sum + value, 0) / clean.length;
  }

  function standardDeviation(values, center = mean(values)) {
    const clean = finiteValues(values);
    if (!clean.length) return 0;
    return Math.sqrt(clean.reduce((sum, value) => sum + (value - center) ** 2, 0) / clean.length);
  }

  function quantile(values, probability) {
    const clean = finiteValues(values).sort((a, b) => a - b);
    if (!clean.length) return 0;
    if (clean.length === 1) return clean[0];
    const position = clamp(finiteNumber(probability), 0, 1) * (clean.length - 1);
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    const weight = position - lower;
    return clean[lower] * (1 - weight) + clean[upper] * weight;
  }

  function summarize(values) {
    const clean = finiteValues(values);
    const center = mean(clean);
    const sd = standardDeviation(clean, center);
    const q1 = quantile(clean, 0.25);
    const median = quantile(clean, 0.5);
    const q3 = quantile(clean, 0.75);
    return {
      n: clean.length,
      mean: center,
      sd,
      min: clean.length ? Math.min(...clean) : 0,
      q1,
      median,
      q3,
      max: clean.length ? Math.max(...clean) : 0,
      iqr: q3 - q1,
    };
  }

  function safeStandardScore(value, center, spread) {
    const difference = finiteNumber(value) - finiteNumber(center);
    const sd = Math.abs(finiteNumber(spread));
    if (sd === 0) return difference === 0 ? 0 : (difference > 0 ? Infinity : -Infinity);
    return difference / sd;
  }

  function movingContext(data, index, windowSize = 8) {
    const points = Array.isArray(data) ? data : [];
    const safeIndex = clamp(Math.trunc(finiteNumber(index)), 0, Math.max(0, points.length - 1));
    const size = clamp(Math.trunc(finiteNumber(windowSize, 8)), 2, 50);
    const previous = points
      .slice(Math.max(0, safeIndex - size), safeIndex)
      .map((point) => point && point.value)
      .filter(Number.isFinite);
    const fallback = points.map((point) => point && point.value).filter(Number.isFinite);
    const reference = previous.length >= 2 ? previous : fallback;
    const stats = summarize(reference);
    const value = points[safeIndex] ? finiteNumber(points[safeIndex].value) : 0;
    const score = Math.abs(safeStandardScore(value, stats.mean, stats.sd));
    return { ...stats, score, start: Math.max(0, safeIndex - size), end: safeIndex - 1, usedFallback: previous.length < 2 };
  }

  function prepareModel(data, windowSize = 8) {
    const points = (Array.isArray(data) ? data : []).filter((point) => point && Number.isFinite(Number(point.value)));
    const valueStats = summarize(points.map((point) => Number(point.value)));
    const featureStats = summarize(points.map((point) => finiteNumber(point.feature2)));
    const moving = points.map((_, index) => movingContext(points, index, windowSize));
    return { points, valueStats, featureStats, moving, windowSize };
  }

  function inspectPoint(point, index, method, threshold, model) {
    const selectedMethod = METHODS.includes(method) ? method : "zscore";
    const limit = Math.max(0, finiteNumber(threshold));
    const value = finiteNumber(point && point.value);
    const feature2 = finiteNumber(point && point.feature2);
    const valueStats = model.valueStats || summarize([]);
    const featureStats = model.featureStats || summarize([]);
    const z = safeStandardScore(value, valueStats.mean, valueStats.sd);
    const z2 = safeStandardScore(feature2, featureStats.mean, featureStats.sd);
    const moving = model.moving && model.moving[index]
      ? model.moving[index]
      : movingContext(model.points || [], index, model.windowSize);
    let score;
    let flagged;
    let lower = null;
    let upper = null;

    if (selectedMethod === "distance") {
      score = Math.abs(value - valueStats.mean);
      lower = valueStats.mean - limit;
      upper = valueStats.mean + limit;
      flagged = score > limit;
    } else if (selectedMethod === "iqr") {
      lower = valueStats.q1 - limit * valueStats.iqr;
      upper = valueStats.q3 + limit * valueStats.iqr;
      score = valueStats.iqr === 0
        ? (value < lower || value > upper ? Infinity : 0)
        : Math.max(0, (valueStats.q1 - value) / valueStats.iqr, (value - valueStats.q3) / valueStats.iqr);
      flagged = value < lower || value > upper;
    } else if (selectedMethod === "moving") {
      score = moving.score;
      lower = moving.mean - limit * moving.sd;
      upper = moving.mean + limit * moving.sd;
      flagged = score > limit;
    } else if (selectedMethod === "twoFeature") {
      score = Math.sqrt(z ** 2 + z2 ** 2);
      flagged = score > limit;
    } else {
      score = Math.abs(z);
      lower = valueStats.mean - limit * valueStats.sd;
      upper = valueStats.mean + limit * valueStats.sd;
      flagged = score > limit;
    }

    return { method: selectedMethod, threshold: limit, value, feature2, z, z2, score, lower, upper, flagged, moving };
  }

  function predict(data, method, threshold, options = {}) {
    const model = options.model || prepareModel(data, options.windowSize);
    return model.points.map((point, index) => inspectPoint(point, index, method, threshold, model).flagged);
  }

  function confusionMatrix(actual, predicted) {
    const truth = Array.isArray(actual) ? actual : [];
    const guesses = Array.isArray(predicted) ? predicted : [];
    const total = Math.max(truth.length, guesses.length);
    let tp = 0;
    let fp = 0;
    let tn = 0;
    let fn = 0;
    for (let index = 0; index < total; index += 1) {
      const isPositive = Boolean(truth[index]);
      const guessedPositive = Boolean(guesses[index]);
      if (isPositive && guessedPositive) tp += 1;
      else if (!isPositive && guessedPositive) fp += 1;
      else if (!isPositive && !guessedPositive) tn += 1;
      else fn += 1;
    }
    return { tp, fp, tn, fn, total };
  }

  function safeRatio(numerator, denominator) {
    return denominator > 0 ? numerator / denominator : null;
  }

  function evaluationMetrics(matrix, costs = {}) {
    const m = matrix || confusionMatrix([], []);
    const fpCost = Math.max(0, finiteNumber(costs.fp, 1));
    const fnCost = Math.max(0, finiteNumber(costs.fn, 1));
    return {
      accuracy: safeRatio(m.tp + m.tn, m.total),
      precision: safeRatio(m.tp, m.tp + m.fp),
      recall: safeRatio(m.tp, m.tp + m.fn),
      specificity: safeRatio(m.tn, m.tn + m.fp),
      falseAlarmRate: safeRatio(m.fp, m.fp + m.tn),
      prevalence: safeRatio(m.tp + m.fn, m.total),
      totalCost: m.fp * fpCost + m.fn * fnCost,
      fpCost,
      fnCost,
    };
  }

  function evaluate(actual, predicted, costs) {
    const matrix = confusionMatrix(actual, predicted);
    return { matrix, metrics: evaluationMetrics(matrix, costs) };
  }

  function splitCsvLine(line) {
    const result = [];
    let current = "";
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      if (character === '"' && line[index + 1] === '"' && quoted) {
        current += '"';
        index += 1;
      } else if (character === '"') quoted = !quoted;
      else if (character === "," && !quoted) {
        result.push(current.trim());
        current = "";
      } else current += character;
    }
    result.push(current.trim());
    return result;
  }

  function labelFrom(value) {
    const normalized = String(value == null ? "" : value).trim().toLowerCase();
    return ["1", "true", "yes", "y", "anomaly", "abnormal", "이상"].includes(normalized);
  }

  function parseCsv(text) {
    const lines = String(text == null ? "" : text)
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) throw new Error("CSV가 비어 있습니다.");

    const rows = lines.map(splitCsvLine);
    const normalizedHeader = rows[0].map((cell) => cell.toLowerCase().replace(/\s+/g, ""));
    const aliases = {
      value: ["value", "값", "측정값", "amount", "금액", "weight", "무게", "count", "계수"],
      feature2: ["feature2", "특성2", "두번째특성", "length", "길이", "frequency", "빈도"],
      time: ["time", "시간", "순서", "index"],
      label: ["label", "정답", "이상여부", "isanomaly", "anomaly"],
    };
    const indices = {};
    Object.entries(aliases).forEach(([key, names]) => {
      indices[key] = normalizedHeader.findIndex((name) => names.includes(name));
    });
    const hasHeader = indices.value >= 0 || normalizedHeader.some((cell) => Number.isNaN(Number(cell)));
    const start = hasHeader ? 1 : 0;
    if (!hasHeader) {
      indices.value = 0;
      indices.feature2 = 1;
      indices.time = 2;
      indices.label = 3;
    }
    if (indices.value < 0) throw new Error("value(값) 열을 찾을 수 없습니다.");

    const points = [];
    let skipped = 0;
    for (let rowIndex = start; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex];
      const rawValue = row[indices.value];
      const value = Number(rawValue);
      if (rawValue == null || String(rawValue).trim() === "" || !Number.isFinite(value)) {
        skipped += 1;
        continue;
      }
      const featureCandidate = indices.feature2 >= 0 ? Number(row[indices.feature2]) : rowIndex - start;
      const timeCandidate = indices.time >= 0 ? Number(row[indices.time]) : rowIndex - start + 1;
      points.push({
        id: `csv-${rowIndex + 1}`,
        index: points.length,
        value,
        feature2: Number.isFinite(featureCandidate) ? featureCandidate : points.length,
        time: Number.isFinite(timeCandidate) ? timeCandidate : points.length + 1,
        isAnomaly: indices.label >= 0 ? labelFrom(row[indices.label]) : false,
      });
    }
    if (!points.length) throw new Error("유효한 숫자 행이 없습니다.");
    return { points, skipped, hasLabels: indices.label >= 0 };
  }

  function validateSavedState(input) {
    const state = typeof input === "string" ? JSON.parse(input) : input;
    if (!state || typeof state !== "object") throw new Error("활동 상태 형식이 올바르지 않습니다.");
    if (state.version !== 1) throw new Error("지원하지 않는 활동 상태 버전입니다.");
    if (!Array.isArray(state.data) || !state.data.length) throw new Error("저장된 자료가 비어 있습니다.");
    if (state.data.length > 5000) throw new Error("자료는 5,000행 이하만 불러올 수 있습니다.");
    const data = state.data.map((point, index) => {
      const rawValue = point && point.value;
      const value = Number(rawValue);
      if (rawValue == null || String(rawValue).trim() === "" || !Number.isFinite(value)) throw new Error(`${index + 1}번째 자료의 값이 올바르지 않습니다.`);
      return {
        id: String(point.id || `saved-${index + 1}`),
        index,
        value,
        feature2: finiteNumber(point.feature2, index),
        time: finiteNumber(point.time, index + 1),
        isAnomaly: Boolean(point.isAnomaly),
      };
    });
    return { ...state, data };
  }

  return {
    METHODS,
    clamp,
    finiteValues,
    mean,
    standardDeviation,
    quantile,
    summarize,
    safeStandardScore,
    movingContext,
    prepareModel,
    inspectPoint,
    predict,
    confusionMatrix,
    evaluationMetrics,
    evaluate,
    parseCsv,
    validateSavedState,
  };
});
