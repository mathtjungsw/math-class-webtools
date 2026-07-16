(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.RecommenderLab = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var METHODS = ["agreement", "cosine", "pearson"];
  var BASES = ["user", "item"];

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function round(value, digits) {
    var scale = Math.pow(10, digits === undefined ? 4 : digits);
    return Math.round((value + Number.EPSILON) * scale) / scale;
  }

  function isRating(value) {
    return Number.isFinite(value) && value >= 1 && value <= 5;
  }

  function cloneMatrix(matrix) {
    return matrix.map(function (row) { return row.slice(); });
  }

  function mean(values) {
    var numbers = values.filter(Number.isFinite);
    if (!numbers.length) return null;
    return numbers.reduce(function (sum, value) { return sum + value; }, 0) / numbers.length;
  }

  function rowValues(matrix, rowIndex) {
    return (matrix[rowIndex] || []).filter(Number.isFinite);
  }

  function columnValues(matrix, columnIndex) {
    return matrix.map(function (row) { return row[columnIndex]; }).filter(Number.isFinite);
  }

  function globalMean(matrix) {
    return mean(matrix.reduce(function (all, row) { return all.concat(row.filter(Number.isFinite)); }, []));
  }

  function validateDataset(dataset) {
    var errors = [];
    if (!dataset || !Array.isArray(dataset.users) || !Array.isArray(dataset.items) || !Array.isArray(dataset.ratings)) {
      return { valid: false, errors: ["사용자, 콘텐츠, 평점 행렬이 필요합니다."] };
    }
    if (!dataset.users.length) errors.push("사용자가 한 명 이상 필요합니다.");
    if (!dataset.items.length) errors.push("콘텐츠가 하나 이상 필요합니다.");
    if (dataset.ratings.length !== dataset.users.length) errors.push("사용자 수와 평점 행 수가 다릅니다.");
    dataset.ratings.forEach(function (row, rowIndex) {
      if (!Array.isArray(row) || row.length !== dataset.items.length) {
        errors.push((rowIndex + 1) + "번째 평점 행의 칸 수가 콘텐츠 수와 다릅니다.");
        return;
      }
      row.forEach(function (value, columnIndex) {
        if (value !== null && value !== "" && !isRating(Number(value))) {
          errors.push((rowIndex + 1) + "행 " + (columnIndex + 1) + "열은 빈칸 또는 1~5여야 합니다.");
        }
      });
    });
    var cleanNames = dataset.users.concat(dataset.items).every(function (name) { return String(name || "").trim().length > 0; });
    if (!cleanNames) errors.push("사용자와 콘텐츠 이름은 비워 둘 수 없습니다.");
    if (new Set(dataset.users.map(String)).size !== dataset.users.length) errors.push("사용자 이름은 서로 달라야 합니다.");
    if (new Set(dataset.items.map(String)).size !== dataset.items.length) errors.push("콘텐츠 이름은 서로 달라야 합니다.");
    return { valid: !errors.length, errors: errors };
  }

  function normalizeDataset(dataset) {
    var result = {
      users: dataset.users.map(function (name) { return String(name).trim(); }),
      items: dataset.items.map(function (name) { return String(name).trim(); }),
      ratings: dataset.ratings.map(function (row) {
        return row.map(function (value) { return value === null || value === "" ? null : Number(value); });
      })
    };
    var validation = validateDataset(result);
    if (!validation.valid) throw new Error(validation.errors.join(" "));
    return result;
  }

  function commonRatings(matrix, basis, firstIndex, secondIndex) {
    if (BASES.indexOf(basis) === -1) throw new Error("비교 기준은 user 또는 item이어야 합니다.");
    var common = [];
    if (basis === "user") {
      var width = matrix[0] ? matrix[0].length : 0;
      for (var itemIndex = 0; itemIndex < width; itemIndex += 1) {
        var first = matrix[firstIndex] && matrix[firstIndex][itemIndex];
        var second = matrix[secondIndex] && matrix[secondIndex][itemIndex];
        if (Number.isFinite(first) && Number.isFinite(second)) common.push({ index: itemIndex, first: first, second: second });
      }
    } else {
      for (var userIndex = 0; userIndex < matrix.length; userIndex += 1) {
        var a = matrix[userIndex] && matrix[userIndex][firstIndex];
        var b = matrix[userIndex] && matrix[userIndex][secondIndex];
        if (Number.isFinite(a) && Number.isFinite(b)) common.push({ index: userIndex, first: a, second: b });
      }
    }
    return common;
  }

  function similarity(matrix, basis, firstIndex, secondIndex, method, minCommon) {
    method = method || "agreement";
    minCommon = Math.max(1, Number(minCommon) || 1);
    if (METHODS.indexOf(method) === -1) throw new Error("지원하지 않는 유사도 방법입니다.");
    var common = commonRatings(matrix, basis, firstIndex, secondIndex);
    var result = { method: method, basis: basis, common: common, value: null, usable: false, reason: "", terms: [] };
    if (common.length < minCommon) {
      result.reason = common.length ? "공통 평점이 최소 " + minCommon + "개보다 적습니다." : "공통으로 평가한 항목이 없습니다.";
      return result;
    }

    if (method === "agreement") {
      var distance = common.reduce(function (sum, pair) {
        var difference = Math.abs(pair.first - pair.second);
        result.terms.push({ first: pair.first, second: pair.second, difference: difference, match: 1 - difference / 4 });
        return sum + difference;
      }, 0) / common.length;
      result.distance = distance;
      result.value = clamp(1 - distance / 4, 0, 1);
    } else if (method === "cosine") {
      var dot = 0;
      var firstSquares = 0;
      var secondSquares = 0;
      common.forEach(function (pair) {
        dot += pair.first * pair.second;
        firstSquares += pair.first * pair.first;
        secondSquares += pair.second * pair.second;
        result.terms.push({ first: pair.first, second: pair.second, product: pair.first * pair.second, firstSquare: pair.first * pair.first, secondSquare: pair.second * pair.second });
      });
      var cosineDenominator = Math.sqrt(firstSquares) * Math.sqrt(secondSquares);
      if (cosineDenominator === 0) {
        result.reason = "벡터의 길이가 0이라 코사인 유사도를 계산할 수 없습니다.";
        return result;
      }
      result.dot = dot;
      result.denominator = cosineDenominator;
      result.value = dot / cosineDenominator;
    } else {
      var firstMean = mean(common.map(function (pair) { return pair.first; }));
      var secondMean = mean(common.map(function (pair) { return pair.second; }));
      var numerator = 0;
      var firstDeviationSquares = 0;
      var secondDeviationSquares = 0;
      common.forEach(function (pair) {
        var firstDeviation = pair.first - firstMean;
        var secondDeviation = pair.second - secondMean;
        numerator += firstDeviation * secondDeviation;
        firstDeviationSquares += firstDeviation * firstDeviation;
        secondDeviationSquares += secondDeviation * secondDeviation;
        result.terms.push({ first: pair.first, second: pair.second, firstDeviation: firstDeviation, secondDeviation: secondDeviation, product: firstDeviation * secondDeviation });
      });
      var pearsonDenominator = Math.sqrt(firstDeviationSquares) * Math.sqrt(secondDeviationSquares);
      result.firstMean = firstMean;
      result.secondMean = secondMean;
      result.numerator = numerator;
      result.denominator = pearsonDenominator;
      if (pearsonDenominator === 0) {
        result.reason = "공통 평점이 모두 같아 평균에서 벗어난 정도가 0입니다.";
        return result;
      }
      result.value = numerator / pearsonDenominator;
    }
    result.value = round(clamp(result.value, -1, 1), 8);
    result.usable = Number.isFinite(result.value);
    return result;
  }

  function candidateNeighbors(matrix, targetUser, targetItem, options) {
    options = options || {};
    var basis = options.basis || "user";
    var method = options.method || "agreement";
    var minCommon = Math.max(1, Number(options.minCommon) || 1);
    var candidates = [];
    if (basis === "user") {
      matrix.forEach(function (row, userIndex) {
        if (userIndex === targetUser || !Number.isFinite(row[targetItem])) return;
        var score = similarity(matrix, "user", targetUser, userIndex, method, minCommon);
        candidates.push({ index: userIndex, rating: row[targetItem], similarity: score.value, details: score, eligible: score.usable && score.value > 0 });
      });
    } else {
      var width = matrix[0] ? matrix[0].length : 0;
      for (var itemIndex = 0; itemIndex < width; itemIndex += 1) {
        if (itemIndex === targetItem || !Number.isFinite(matrix[targetUser] && matrix[targetUser][itemIndex])) continue;
        var itemScore = similarity(matrix, "item", targetItem, itemIndex, method, minCommon);
        candidates.push({ index: itemIndex, rating: matrix[targetUser][itemIndex], similarity: itemScore.value, details: itemScore, eligible: itemScore.usable && itemScore.value > 0 });
      }
    }
    return candidates.sort(function (a, b) {
      if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
      return (b.similarity === null ? -Infinity : b.similarity) - (a.similarity === null ? -Infinity : a.similarity) || a.index - b.index;
    });
  }

  function baselinePrediction(matrix, targetUser, targetItem) {
    var userMean = mean(rowValues(matrix, targetUser));
    var itemMean = mean(columnValues(matrix, targetItem));
    var overall = globalMean(matrix);
    var parts = [userMean, itemMean, overall].filter(Number.isFinite);
    return {
      value: parts.length ? mean(parts) : 3,
      userMean: userMean,
      itemMean: itemMean,
      globalMean: overall
    };
  }

  function predictRating(matrix, targetUser, targetItem, options) {
    options = options || {};
    var basis = options.basis || "user";
    var method = options.method || "agreement";
    var k = clamp(Math.floor(Number(options.k) || 2), 1, 20);
    var candidates = candidateNeighbors(matrix, targetUser, targetItem, { basis: basis, method: method, minCommon: options.minCommon });
    var neighbors = candidates.filter(function (candidate) { return candidate.eligible; }).slice(0, k);
    var baseline = baselinePrediction(matrix, targetUser, targetItem);
    var result = {
      targetUser: targetUser,
      targetItem: targetItem,
      basis: basis,
      method: method,
      k: k,
      candidates: candidates,
      neighbors: neighbors,
      baseline: baseline,
      prediction: null,
      rawPrediction: null,
      numerator: 0,
      denominator: 0,
      base: 0,
      terms: [],
      usedFallback: false,
      reason: ""
    };

    if (!neighbors.length) {
      result.prediction = round(clamp(baseline.value, 1, 5), 4);
      result.rawPrediction = result.prediction;
      result.usedFallback = true;
      result.reason = "조건을 만족하는 이웃이 없어 사용자·콘텐츠·전체 평균을 섞은 기준값을 사용했습니다.";
      return result;
    }

    if (method === "pearson") {
      if (basis === "user") {
        result.base = mean(rowValues(matrix, targetUser));
        if (!Number.isFinite(result.base)) result.base = baseline.value;
        neighbors.forEach(function (neighbor) {
          var neighborMean = mean(rowValues(matrix, neighbor.index));
          var deviation = neighbor.rating - neighborMean;
          var contribution = neighbor.similarity * deviation;
          result.numerator += contribution;
          result.denominator += Math.abs(neighbor.similarity);
          result.terms.push({ index: neighbor.index, similarity: neighbor.similarity, rating: neighbor.rating, center: neighborMean, deviation: deviation, contribution: contribution });
        });
      } else {
        result.base = mean(columnValues(matrix, targetItem));
        if (!Number.isFinite(result.base)) result.base = baseline.value;
        neighbors.forEach(function (neighbor) {
          var neighborItemMean = mean(columnValues(matrix, neighbor.index));
          var deviation = neighbor.rating - neighborItemMean;
          var contribution = neighbor.similarity * deviation;
          result.numerator += contribution;
          result.denominator += Math.abs(neighbor.similarity);
          result.terms.push({ index: neighbor.index, similarity: neighbor.similarity, rating: neighbor.rating, center: neighborItemMean, deviation: deviation, contribution: contribution });
        });
      }
      result.rawPrediction = result.base + result.numerator / result.denominator;
    } else {
      neighbors.forEach(function (neighbor) {
        var contribution = neighbor.similarity * neighbor.rating;
        result.numerator += contribution;
        result.denominator += Math.abs(neighbor.similarity);
        result.terms.push({ index: neighbor.index, similarity: neighbor.similarity, rating: neighbor.rating, center: null, deviation: null, contribution: contribution });
      });
      result.rawPrediction = result.numerator / result.denominator;
    }
    if (!Number.isFinite(result.rawPrediction) || result.denominator === 0) {
      result.prediction = round(clamp(baseline.value, 1, 5), 4);
      result.usedFallback = true;
      result.reason = "가중평균의 분모가 0이라 평균 기준값을 사용했습니다.";
    } else {
      result.prediction = round(clamp(result.rawPrediction, 1, 5), 4);
      if (result.rawPrediction < 1 || result.rawPrediction > 5) result.reason = "평점 범위를 벗어난 계산값을 1~5 사이로 제한했습니다.";
    }
    return result;
  }

  function itemPopularity(matrix, itemIndex) {
    var values = columnValues(matrix, itemIndex);
    return { count: values.length, mean: mean(values) };
  }

  function recommendForUser(matrix, targetUser, options) {
    options = options || {};
    var width = matrix[0] ? matrix[0].length : 0;
    var popularities = [];
    for (var i = 0; i < width; i += 1) popularities.push(itemPopularity(matrix, i));
    var maxCount = Math.max.apply(null, [1].concat(popularities.map(function (item) { return item.count; })));
    var popularityWeight = clamp(Number(options.popularityWeight) || 0, 0, 2);
    var recommendations = [];
    for (var itemIndex = 0; itemIndex < width; itemIndex += 1) {
      if (Number.isFinite(matrix[targetUser] && matrix[targetUser][itemIndex])) continue;
      var prediction = predictRating(matrix, targetUser, itemIndex, options);
      var popularity = popularities[itemIndex];
      var popularityRatio = popularity.count / maxCount;
      recommendations.push({
        itemIndex: itemIndex,
        prediction: prediction.prediction,
        detail: prediction,
        popularityCount: popularity.count,
        popularityMean: popularity.mean,
        popularityRatio: popularityRatio,
        score: round(prediction.prediction + popularityWeight * popularityRatio, 4)
      });
    }
    return recommendations.sort(function (a, b) { return b.score - a.score || b.prediction - a.prediction || a.itemIndex - b.itemIndex; });
  }

  function hideRatings(matrix, cells) {
    var hidden = cloneMatrix(matrix);
    var answers = [];
    (cells || []).forEach(function (cell) {
      var userIndex = Number(cell.userIndex);
      var itemIndex = Number(cell.itemIndex);
      var actual = hidden[userIndex] && hidden[userIndex][itemIndex];
      if (!Number.isFinite(actual)) return;
      answers.push({ userIndex: userIndex, itemIndex: itemIndex, actual: actual });
      hidden[userIndex][itemIndex] = null;
    });
    return { matrix: hidden, answers: answers };
  }

  function competitionMetrics(matrix, answers, options) {
    var rows = (answers || []).map(function (answer) {
      var prediction = predictRating(matrix, answer.userIndex, answer.itemIndex, options);
      var error = prediction.prediction - answer.actual;
      return {
        userIndex: answer.userIndex,
        itemIndex: answer.itemIndex,
        actual: answer.actual,
        predicted: prediction.prediction,
        absoluteError: Math.abs(error),
        squaredError: error * error,
        usedFallback: prediction.usedFallback
      };
    });
    if (!rows.length) return { count: 0, mae: null, rmse: null, rows: [] };
    var mae = rows.reduce(function (sum, row) { return sum + row.absoluteError; }, 0) / rows.length;
    var rmse = Math.sqrt(rows.reduce(function (sum, row) { return sum + row.squaredError; }, 0) / rows.length);
    return { count: rows.length, mae: round(mae, 6), rmse: round(rmse, 6), rows: rows };
  }

  function parseCsvRows(text) {
    var source = String(text || "").replace(/^\uFEFF/, "");
    var rows = [];
    var row = [];
    var field = "";
    var quoted = false;
    for (var index = 0; index < source.length; index += 1) {
      var char = source[index];
      if (quoted) {
        if (char === '"' && source[index + 1] === '"') { field += '"'; index += 1; }
        else if (char === '"') quoted = false;
        else field += char;
      } else if (char === '"') quoted = true;
      else if (char === ",") { row.push(field); field = ""; }
      else if (char === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
      else field += char;
    }
    if (field.length || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
    return rows.filter(function (cells) { return cells.some(function (cell) { return String(cell).trim() !== ""; }); });
  }

  function parseCsv(text) {
    var rows = parseCsvRows(text);
    if (rows.length < 2 || rows[0].length < 2) throw new Error("첫 행에는 콘텐츠 이름, 다음 행부터는 사용자와 평점을 넣어 주세요.");
    var items = rows[0].slice(1).map(function (name) { return String(name).trim(); });
    var users = [];
    var ratings = [];
    rows.slice(1).forEach(function (row, rowIndex) {
      if (row.length > items.length + 1 && row.slice(items.length + 1).some(function (value) { return String(value).trim(); })) {
        throw new Error((rowIndex + 2) + "행의 열 수가 너무 많습니다.");
      }
      users.push(String(row[0] || "").trim());
      var values = [];
      for (var itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
        var raw = String(row[itemIndex + 1] === undefined ? "" : row[itemIndex + 1]).trim();
        if (!raw) values.push(null);
        else {
          var value = Number(raw);
          if (!isRating(value)) throw new Error((rowIndex + 2) + "행 " + (itemIndex + 2) + "열은 빈칸 또는 1~5여야 합니다.");
          values.push(value);
        }
      }
      ratings.push(values);
    });
    return normalizeDataset({ users: users, items: items, ratings: ratings });
  }

  function csvCell(value) {
    var text = String(value === null || value === undefined ? "" : value);
    return /[",\n\r]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }

  function toCsv(dataset) {
    dataset = normalizeDataset(dataset);
    var rows = [["사용자/콘텐츠"].concat(dataset.items)];
    dataset.users.forEach(function (user, userIndex) { rows.push([user].concat(dataset.ratings[userIndex])); });
    return "\uFEFF" + rows.map(function (row) { return row.map(csvCell).join(","); }).join("\r\n");
  }

  function parseStateJson(text) {
    var parsed;
    try { parsed = JSON.parse(String(text)); }
    catch (error) { throw new Error("JSON 문법을 확인해 주세요."); }
    var dataset = parsed && parsed.dataset ? parsed.dataset : parsed;
    var normalized = normalizeDataset(dataset);
    if (parsed && parsed.dataset) parsed.dataset = normalized;
    else parsed = { dataset: normalized };
    return parsed;
  }

  return {
    METHODS: METHODS.slice(),
    BASES: BASES.slice(),
    clamp: clamp,
    round: round,
    mean: mean,
    cloneMatrix: cloneMatrix,
    rowValues: rowValues,
    columnValues: columnValues,
    globalMean: globalMean,
    validateDataset: validateDataset,
    normalizeDataset: normalizeDataset,
    commonRatings: commonRatings,
    similarity: similarity,
    candidateNeighbors: candidateNeighbors,
    baselinePrediction: baselinePrediction,
    predictRating: predictRating,
    itemPopularity: itemPopularity,
    recommendForUser: recommendForUser,
    hideRatings: hideRatings,
    competitionMetrics: competitionMetrics,
    parseCsvRows: parseCsvRows,
    parseCsv: parseCsv,
    toCsv: toCsv,
    parseStateJson: parseStateJson
  };
});
