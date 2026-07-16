(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WordVectors = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const EPSILON = 1e-12;

  function compareText(a, b) {
    const aa = Array.from(String(a), (value) => value.codePointAt(0));
    const bb = Array.from(String(b), (value) => value.codePointAt(0));
    for (let index = 0; index < Math.min(aa.length, bb.length); index += 1) {
      if (aa[index] !== bb[index]) return aa[index] - bb[index];
    }
    return aa.length - bb.length;
  }

  function tokenize(text) {
    const normalized = String(text || "").normalize("NFKC").toLocaleLowerCase("ko-KR");
    return normalized.match(/[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*/gu) || [];
  }

  function tokenizeSentences(text) {
    return String(text || "")
      .normalize("NFKC")
      .split(/[\r\n]+|[.!?。！？]+/u)
      .map(tokenize)
      .filter((tokens) => tokens.length > 0);
  }

  function frequencyTable(text) {
    const counts = new Map();
    tokenizeSentences(text).flat().forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
    return Array.from(counts, ([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count || compareText(a.word, b.word));
  }

  function assertVector(vector, name) {
    if (!Array.isArray(vector) || vector.some((value) => !Number.isFinite(value))) {
      throw new TypeError(`${name || "벡터"}의 모든 성분은 유한한 숫자여야 합니다.`);
    }
  }

  function assertSameLength(a, b) {
    assertVector(a, "첫 번째 벡터");
    assertVector(b, "두 번째 벡터");
    if (a.length !== b.length) throw new RangeError("두 벡터의 차원이 같아야 합니다.");
  }

  function dot(a, b) {
    assertSameLength(a, b);
    return a.reduce((sum, value, index) => sum + value * b[index], 0);
  }

  function magnitude(vector) {
    assertVector(vector);
    return Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  }

  function normalizeVector(vector) {
    assertVector(vector);
    const size = magnitude(vector);
    return size <= EPSILON ? vector.map(() => 0) : vector.map((value) => value / size);
  }

  function euclideanDistance(a, b) {
    assertSameLength(a, b);
    return Math.sqrt(a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0));
  }

  function cosineSimilarity(a, b) {
    assertSameLength(a, b);
    const denominator = magnitude(a) * magnitude(b);
    if (denominator <= EPSILON) return null;
    const value = dot(a, b) / denominator;
    return Math.max(-1, Math.min(1, value));
  }

  function cosineBreakdown(a, b) {
    assertSameLength(a, b);
    const products = a.map((value, index) => value * b[index]);
    const innerProduct = products.reduce((sum, value) => sum + value, 0);
    const magnitudeA = magnitude(a);
    const magnitudeB = magnitude(b);
    const denominator = magnitudeA * magnitudeB;
    return {
      products,
      innerProduct,
      magnitudeA,
      magnitudeB,
      denominator,
      value: denominator <= EPSILON ? null : Math.max(-1, Math.min(1, innerProduct / denominator))
    };
  }

  function buildCooccurrence(text, options) {
    const settings = Object.assign({ windowSize: 2, minFrequency: 1, normalize: false }, options || {});
    const windowSize = Math.max(1, Math.min(10, Math.trunc(Number(settings.windowSize) || 1)));
    const minFrequency = Math.max(1, Math.trunc(Number(settings.minFrequency) || 1));
    const sentences = tokenizeSentences(text);
    const frequencies = new Map();
    sentences.flat().forEach((word) => frequencies.set(word, (frequencies.get(word) || 0) + 1));
    const vocabulary = Array.from(frequencies)
      .filter((entry) => entry[1] >= minFrequency)
      .map((entry) => entry[0])
      .sort(compareText);
    const allowed = new Set(vocabulary);
    const indexByWord = new Map(vocabulary.map((word, index) => [word, index]));
    const rawMatrix = vocabulary.map(() => vocabulary.map(() => 0));

    sentences.forEach((tokens) => {
      tokens.forEach((word, position) => {
        if (!allowed.has(word)) return;
        const rowIndex = indexByWord.get(word);
        const start = Math.max(0, position - windowSize);
        const end = Math.min(tokens.length - 1, position + windowSize);
        for (let contextPosition = start; contextPosition <= end; contextPosition += 1) {
          if (contextPosition === position) continue;
          const contextWord = tokens[contextPosition];
          if (allowed.has(contextWord)) rawMatrix[rowIndex][indexByWord.get(contextWord)] += 1;
        }
      });
    });

    const rawVectors = {};
    const vectors = {};
    vocabulary.forEach((word, index) => {
      rawVectors[word] = rawMatrix[index].slice();
      vectors[word] = settings.normalize ? normalizeVector(rawMatrix[index]) : rawMatrix[index].slice();
    });
    const zeroWords = vocabulary.filter((word) => magnitude(rawVectors[word]) <= EPSILON);
    return {
      type: "cooccurrence",
      text: String(text || ""),
      windowSize,
      minFrequency,
      normalized: Boolean(settings.normalize),
      sentences,
      frequencies: Object.fromEntries(vocabulary.map((word) => [word, frequencies.get(word)])),
      words: vocabulary,
      dimensions: vocabulary.slice(),
      rawMatrix,
      rawVectors,
      vectors,
      zeroWords
    };
  }

  function rankNeighbors(dataset, queryWord, metric) {
    if (!dataset || !dataset.vectors || !dataset.vectors[queryWord]) return [];
    const method = metric === "euclidean" ? "euclidean" : "cosine";
    const query = dataset.vectors[queryWord];
    return Object.keys(dataset.vectors)
      .filter((word) => word !== queryWord)
      .map((word) => ({
        word,
        score: method === "euclidean"
          ? euclideanDistance(query, dataset.vectors[word])
          : cosineSimilarity(query, dataset.vectors[word])
      }))
      .sort((a, b) => {
        if (a.score === null && b.score === null) return compareText(a.word, b.word);
        if (a.score === null) return 1;
        if (b.score === null) return -1;
        const difference = method === "euclidean" ? a.score - b.score : b.score - a.score;
        return Math.abs(difference) <= EPSILON ? compareText(a.word, b.word) : difference;
      });
  }

  function vectorArithmetic(dataset, wordA, wordB, wordC) {
    const missing = [wordA, wordB, wordC].filter((word) => !dataset || !dataset.vectors || !dataset.vectors[word]);
    if (missing.length) return { error: `벡터를 찾을 수 없는 단어: ${missing.join(", ")}`, vector: null, neighbors: [] };
    const a = dataset.vectors[wordA];
    const b = dataset.vectors[wordB];
    const c = dataset.vectors[wordC];
    const vector = a.map((value, index) => value - b[index] + c[index]);
    const excluded = new Set([wordA, wordB, wordC]);
    const neighbors = Object.keys(dataset.vectors)
      .filter((word) => !excluded.has(word))
      .map((word) => ({ word, score: cosineSimilarity(vector, dataset.vectors[word]) }))
      .sort((left, right) => {
        if (left.score === null && right.score === null) return compareText(left.word, right.word);
        if (left.score === null) return 1;
        if (right.score === null) return -1;
        return right.score - left.score || compareText(left.word, right.word);
      });
    return { error: null, vector, neighbors };
  }

  function parseCsvRows(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    const source = String(text || "").replace(/^\uFEFF/, "");
    for (let index = 0; index < source.length; index += 1) {
      const character = source[index];
      if (quoted) {
        if (character === '"' && source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else if (character === '"') quoted = false;
        else cell += character;
      } else if (character === '"') quoted = true;
      else if (character === ",") {
        row.push(cell.trim());
        cell = "";
      } else if (character === "\n") {
        row.push(cell.trim());
        if (row.some((value) => value !== "")) rows.push(row);
        row = [];
        cell = "";
      } else if (character !== "\r") cell += character;
    }
    if (quoted) throw new Error("CSV의 따옴표가 닫히지 않았습니다.");
    row.push(cell.trim());
    if (row.some((value) => value !== "")) rows.push(row);
    return rows;
  }

  function parseVectorCsv(text) {
    const rows = parseCsvRows(text);
    if (rows.length < 2) throw new Error("머리글과 한 개 이상의 단어 행이 필요합니다.");
    const header = rows[0];
    if (header.length < 3) throw new Error("CSV에는 단어 열과 두 개 이상의 수치 차원이 필요합니다.");
    const dimensions = header.slice(1).map((value, index) => value || `차원${index + 1}`);
    const vectors = {};
    rows.slice(1).forEach((row, rowIndex) => {
      if (row.length !== header.length) throw new Error(`${rowIndex + 2}행의 열 수가 머리글과 다릅니다.`);
      const word = row[0];
      if (!word) throw new Error(`${rowIndex + 2}행의 단어가 비어 있습니다.`);
      if (Object.prototype.hasOwnProperty.call(vectors, word)) throw new Error(`단어가 중복되었습니다: ${word}`);
      const vector = row.slice(1).map((value, columnIndex) => {
        const number = Number(value);
        if (!Number.isFinite(number)) throw new Error(`${rowIndex + 2}행 ${columnIndex + 2}열은 숫자가 아닙니다.`);
        return number;
      });
      vectors[word] = vector;
    });
    const words = Object.keys(vectors).sort(compareText);
    const rawVectors = Object.fromEntries(words.map((word) => [word, vectors[word].slice()]));
    return {
      type: "csv",
      words,
      dimensions,
      vectors: rawVectors,
      rawVectors,
      rawMatrix: words.map((word) => rawVectors[word].slice()),
      normalized: false,
      zeroWords: words.filter((word) => magnitude(rawVectors[word]) <= EPSILON)
    };
  }

  function kMeans(dataset, requestedK, maxIterations) {
    const words = dataset && dataset.words ? dataset.words.filter((word) => dataset.vectors[word]) : [];
    if (!words.length) return { k: 0, assignments: {}, centers: [] };
    const k = Math.max(1, Math.min(words.length, Math.trunc(Number(requestedK) || 2)));
    const iterations = Math.max(1, Math.min(100, Math.trunc(Number(maxIterations) || 30)));
    const orderedWords = words.slice().sort(compareText);
    const centers = [dataset.vectors[orderedWords[0]].slice()];
    while (centers.length < k) {
      let bestWord = orderedWords[0];
      let bestDistance = -1;
      orderedWords.forEach((word) => {
        const distance = Math.min(...centers.map((center) => euclideanDistance(dataset.vectors[word], center)));
        if (distance > bestDistance + EPSILON) {
          bestDistance = distance;
          bestWord = word;
        }
      });
      centers.push(dataset.vectors[bestWord].slice());
    }
    const assignments = {};
    for (let iteration = 0; iteration < iterations; iteration += 1) {
      let changed = false;
      orderedWords.forEach((word) => {
        const distances = centers.map((center) => euclideanDistance(dataset.vectors[word], center));
        const cluster = distances.reduce((best, value, index) => value < distances[best] - EPSILON ? index : best, 0);
        if (assignments[word] !== cluster) changed = true;
        assignments[word] = cluster;
      });
      const nextCenters = centers.map((center, cluster) => {
        const members = orderedWords.filter((word) => assignments[word] === cluster);
        if (!members.length) return center.slice();
        return center.map((_, dimension) => members.reduce((sum, word) => sum + dataset.vectors[word][dimension], 0) / members.length);
      });
      centers.splice(0, centers.length, ...nextCenters);
      if (!changed) break;
    }
    return { k, assignments, centers };
  }

  function encodeState(state) {
    return JSON.stringify({ format: "word-vector-playground", version: 1, state }, null, 2);
  }

  function decodeState(text) {
    let parsed;
    try {
      parsed = JSON.parse(String(text || ""));
    } catch (error) {
      throw new Error("올바른 JSON 파일이 아닙니다.");
    }
    if (!parsed || parsed.format !== "word-vector-playground" || parsed.version !== 1 || typeof parsed.state !== "object") {
      throw new Error("단어 벡터 놀이터에서 저장한 JSON 형식이 아닙니다.");
    }
    return parsed.state;
  }

  return {
    EPSILON,
    compareText,
    tokenize,
    tokenizeSentences,
    frequencyTable,
    dot,
    magnitude,
    normalizeVector,
    euclideanDistance,
    cosineSimilarity,
    cosineBreakdown,
    buildCooccurrence,
    rankNeighbors,
    vectorArithmetic,
    parseCsvRows,
    parseVectorCsv,
    kMeans,
    encodeState,
    decodeState
  };
});
