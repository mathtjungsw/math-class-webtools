(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GraphFramingModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const CATEGORY_KEYS = ["strongYes", "yes", "no", "strongNo"];
  const ORDINAL_SCORES = [1, 2 / 3, 1 / 3, 0];
  const HEADER_ALIASES = {
    group: ["group", "집단", "그룹"],
    x: ["x", "x값", "가로값", "수준"],
    n: ["n", "표본수", "표본크기"],
    strongYes: ["strong_yes", "strongyes", "매우그렇다", "매우긍정"],
    yes: ["yes", "그렇다", "긍정"],
    no: ["no", "그렇지않다", "부정"],
    strongNo: ["strong_no", "strongno", "전혀그렇지않다", "매우부정"]
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function finiteNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function splitCsvLine(line, delimiter) {
    const values = [];
    let current = "";
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      if (character === '"') {
        if (quoted && line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else quoted = !quoted;
      } else if (character === delimiter && !quoted) {
        values.push(current.trim());
        current = "";
      } else current += character;
    }
    values.push(current.trim());
    return values;
  }

  function detectDelimiter(header) {
    return [",", "\t", ";"].sort((left, right) => header.split(right).length - header.split(left).length)[0];
  }

  function canonicalHeader(value) {
    return String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  }

  function headerIndex(headers, key) {
    const aliases = HEADER_ALIASES[key].map(canonicalHeader);
    return headers.findIndex((header) => aliases.includes(canonicalHeader(header)));
  }

  function normalizeRow(raw, index = 0) {
    const group = String(raw.group || "").trim();
    const x = finiteNumber(raw.x, NaN);
    const n = Math.max(1, Math.round(finiteNumber(raw.n, 1)));
    const values = CATEGORY_KEYS.map((key) => Math.max(0, finiteNumber(raw[key], 0)));
    const total = values.reduce((sum, value) => sum + value, 0);
    if (!group) throw new Error(`${index + 1}번째 자료의 집단 이름이 비어 있습니다.`);
    if (!Number.isFinite(x)) throw new Error(`${index + 1}번째 자료의 x값이 숫자가 아닙니다.`);
    if (total <= 0) throw new Error(`${index + 1}번째 자료의 네 응답 범주 합이 0입니다.`);
    const probabilities = values.map((value) => value / total);
    return {
      group,
      x,
      n,
      strongYes: probabilities[0],
      yes: probabilities[1],
      no: probabilities[2],
      strongNo: probabilities[3]
    };
  }

  function parseCSV(text) {
    const lines = String(text || "").replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) throw new Error("머리글과 한 줄 이상의 자료가 필요합니다.");
    const delimiter = detectDelimiter(lines[0]);
    const headers = splitCsvLine(lines[0], delimiter);
    const indexes = Object.fromEntries(Object.keys(HEADER_ALIASES).map((key) => [key, headerIndex(headers, key)]));
    const missing = Object.entries(indexes).filter(([, value]) => value < 0).map(([key]) => key);
    if (missing.length) throw new Error(`필수 열을 찾지 못했습니다: ${missing.join(", ")}`);

    const rows = lines.slice(1).map((line, index) => {
      const cells = splitCsvLine(line, delimiter);
      return normalizeRow(Object.fromEntries(Object.entries(indexes).map(([key, column]) => [key, cells[column]])), index);
    });
    const groups = [...new Set(rows.map((row) => row.group))];
    const xs = [...new Set(rows.map((row) => row.x))];
    if (groups.length < 2) throw new Error("비교하려면 집단이 2개 이상이어야 합니다.");
    if (xs.length < 2) throw new Error("선을 그리려면 서로 다른 x값이 2개 이상이어야 합니다.");
    return rows.sort((left, right) => left.x - right.x || left.group.localeCompare(right.group, "ko"));
  }

  function pointEstimate(row, mode = "ordinal") {
    const probabilities = CATEGORY_KEYS.map((key) => row[key]);
    if (mode === "binary") {
      const value = row.strongYes + row.yes;
      return { value, variance: value * (1 - value), label: "긍정 응답 예측확률" };
    }
    const value = probabilities.reduce((sum, probability, index) => sum + probability * ORDINAL_SCORES[index], 0);
    const variance = probabilities.reduce((sum, probability, index) => sum + probability * (ORDINAL_SCORES[index] - value) ** 2, 0);
    return { value, variance, label: "4범주 기대점수(표준화)" };
  }

  function calculateInterval(row, mode = "ordinal", sampleScale = 1, z = 1.96) {
    const estimate = pointEstimate(row, mode);
    const effectiveN = Math.max(2, Math.round(row.n * finiteNumber(sampleScale, 1)));
    const standardError = Math.sqrt(Math.max(0, estimate.variance) / effectiveN);
    return {
      ...estimate,
      n: effectiveN,
      standardError,
      low: clamp(estimate.value - z * standardError, 0, 1),
      high: clamp(estimate.value + z * standardError, 0, 1)
    };
  }

  function groupNames(rows) {
    return [...new Set(rows.map((row) => row.group))];
  }

  function xValues(rows) {
    return [...new Set(rows.map((row) => row.x))].sort((left, right) => left - right);
  }

  function sparseXValues(rows, threshold = 40) {
    const totals = new Map();
    rows.forEach((row) => totals.set(row.x, (totals.get(row.x) || 0) + row.n));
    return [...totals.entries()].filter(([, total]) => total < threshold).map(([x]) => x);
  }

  function visibleRows(rows, state) {
    const visibleGroups = new Set(state.visibleGroups || groupNames(rows));
    const sparse = new Set(sparseXValues(rows, finiteNumber(state.sparseThreshold, 40)));
    return rows.filter((row) => {
      const inRange = row.x >= finiteNumber(state.xMin, -Infinity) && row.x <= finiteNumber(state.xMax, Infinity);
      return visibleGroups.has(row.group) && inRange && (state.includeSparse || !sparse.has(row.x));
    });
  }

  function seriesFor(rows, state) {
    const filtered = visibleRows(rows, state);
    return (state.visibleGroups || groupNames(rows)).map((group) => ({
      group,
      points: filtered.filter((row) => row.group === group).sort((left, right) => left.x - right.x).map((row) => ({
        x: row.x,
        ...calculateInterval(row, state.analysisMode, state.sampleScale)
      }))
    })).filter((series) => series.points.length);
  }

  function intervalsOverlap(left, right) {
    return Math.max(left.low, right.low) <= Math.min(left.high, right.high);
  }

  function computeVisualAmplification(yMin, yMax) {
    const span = finiteNumber(yMax, 1) - finiteNumber(yMin, 0);
    return span > 0 ? 1 / span : Infinity;
  }

  function summarize(rows, state) {
    const series = seriesFor(rows, state);
    const endpoints = series.map((item) => item.points[item.points.length - 1]).filter(Boolean);
    const highest = endpoints.reduce((best, point) => !best || point.value > best.value ? point : best, null);
    const lowest = endpoints.reduce((best, point) => !best || point.value < best.value ? point : best, null);
    const filtered = visibleRows(rows, state);
    const totalN = filtered.reduce((sum, row) => sum + Math.max(2, Math.round(row.n * state.sampleScale)), 0);
    return {
      series,
      actualGap: highest && lowest ? highest.value - lowest.value : 0,
      ciOverlap: highest && lowest ? intervalsOverlap(highest, lowest) : null,
      totalN,
      visiblePointCount: filtered.length,
      visualAmplification: computeVisualAmplification(state.yMin, state.yMax),
      hiddenGroupCount: Math.max(0, groupNames(rows).length - series.length),
      sparseXs: sparseXValues(rows, finiteNumber(state.sparseThreshold, 40)),
      xValues: [...new Set(filtered.map((row) => row.x))].sort((left, right) => left - right)
    };
  }

  function formatAxisValue(value, unit = "probability") {
    if (unit === "percent") return `${Math.round(value * 100)}%`;
    if (unit === "score10") return (value * 10).toFixed(1);
    return value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  }

  function axisTitle(unit = "probability", mode = "ordinal") {
    if (unit === "percent") return mode === "binary" ? "긍정 응답 비율(%)" : "표준화 기대점수(%)";
    if (unit === "score10") return "변환 지수(0~10 표기)";
    return mode === "binary" ? "긍정 응답 예측확률" : "4범주 기대점수(0~1)";
  }

  function evaluateSignals(rows, state) {
    const allGroups = groupNames(rows);
    const allXs = xValues(rows);
    const signals = [];
    signals.push({
      id: "axis",
      level: state.yMin <= 0 && state.yMax >= 1 ? "good" : "watch",
      title: state.yMin <= 0 && state.yMax >= 1 ? "전체 확률축을 보여 줌" : "잘린 y축이 차이를 확대함",
      evidence: state.yMin <= 0 && state.yMax >= 1 ? "0부터 1까지의 기준 범위를 모두 표시합니다." : `현재 범위 ${formatAxisValue(state.yMin, state.axisUnit)}~${formatAxisValue(state.yMax, state.axisUnit)}, 시각적 확대 약 ${computeVisualAmplification(state.yMin, state.yMax).toFixed(1)}배입니다.`
    });
    signals.push({
      id: "ci",
      level: state.showCI ? "good" : "risk",
      title: state.showCI ? "95% 신뢰구간을 함께 표시함" : "불확실성 표시가 숨겨짐",
      evidence: state.showCI ? "점추정치 주변의 표본 불확실성을 오차막대로 확인할 수 있습니다." : "선의 차이가 표본 오차보다 큰지 그래프만으로 판단하기 어렵습니다."
    });
    signals.push({
      id: "unit",
      level: state.axisUnit === "score10" ? "risk" : "good",
      title: state.axisUnit === "score10" ? "확률을 0~10 지수처럼 표기함" : "축의 단위가 자료와 맞음",
      evidence: state.axisUnit === "score10" ? "수치는 10배 표기되지만 원자료는 0~1 범위의 요약값입니다. 변환 사실을 밝혀야 합니다." : "확률 또는 비율이라는 단위를 축 제목에서 확인할 수 있습니다."
    });
    signals.push({
      id: "groups",
      level: (state.visibleGroups || []).length === allGroups.length ? "good" : "watch",
      title: (state.visibleGroups || []).length === allGroups.length ? "비교 집단을 모두 보여 줌" : "일부 집단이 숨겨짐",
      evidence: `${(state.visibleGroups || []).length}/${allGroups.length}개 집단을 표시하고 있습니다.`
    });
    const fullX = state.xMin <= Math.min(...allXs) && state.xMax >= Math.max(...allXs);
    signals.push({
      id: "range",
      level: fullX ? "good" : "watch",
      title: fullX ? "전체 x범위를 보여 줌" : "x범위를 선택해 보여 줌",
      evidence: fullX ? `자료의 전체 범위 ${Math.min(...allXs)}~${Math.max(...allXs)}를 표시합니다.` : `전체 ${Math.min(...allXs)}~${Math.max(...allXs)} 중 ${state.xMin}~${state.xMax}만 표시합니다.`
    });
    signals.push({
      id: "sparse",
      level: state.includeSparse ? "watch" : "good",
      title: state.includeSparse ? "표본이 적은 구간을 포함함" : "희박 구간을 제외함",
      evidence: state.includeSparse ? "끝 구간의 오차막대와 표본 수를 함께 확인해야 합니다." : "제외 기준과 제외된 x값을 그래프 아래에 밝혔는지 확인하세요."
    });
    signals.push({
      id: "model",
      level: state.analysisMode === "binary" ? "watch" : "good",
      title: state.analysisMode === "binary" ? "네 응답을 두 범주로 합침" : "네 응답 범주의 순서를 유지함",
      evidence: state.analysisMode === "binary" ? "‘매우 그렇다+그렇다’를 하나로 합치면 간단해지지만 범주 사이의 정보가 줄어듭니다." : "4범주 기대점수를 사용해 응답의 순서 정보를 남깁니다."
    });
    if (state.lineWidth >= 6 || state.emphasizeSlope) signals.push({
      id: "style",
      level: "watch",
      title: "강한 선·기울기 강조를 사용함",
      evidence: "값은 같아도 굵은 선, 끝점 강조와 증감 문구가 특정 변화에 시선을 모읍니다."
    });
    return signals;
  }

  return {
    CATEGORY_KEYS,
    clamp,
    normalizeRow,
    parseCSV,
    pointEstimate,
    calculateInterval,
    groupNames,
    xValues,
    sparseXValues,
    visibleRows,
    seriesFor,
    intervalsOverlap,
    computeVisualAmplification,
    summarize,
    formatAxisValue,
    axisTitle,
    evaluateSignals
  };
});
