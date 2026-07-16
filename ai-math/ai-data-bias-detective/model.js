(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.BiasDetectiveModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION = 1;
  const MASKED_VALUE = "__MASKED__";
  const SPLITS = ["train", "validation", "general", "counterfactual"];
  const FEATURE_KEYS = ["target", "background", "weather", "camera"];

  const SCENARIOS = {
    robot: {
      id: "robot",
      title: "로봇 차체 판별",
      description: "둥근 로봇과 각진 로봇을 가르지만 배경·날씨·카메라가 정답과 함께 움직입니다.",
      classes: [
        { id: "classA", name: "둥근 로봇", short: "둥근" },
        { id: "classB", name: "각진 로봇", short: "각진" },
      ],
      features: [
        { key: "target", name: "차체 모양", role: "target", values: [{ id: "a", name: "둥근 차체" }, { id: "b", name: "각진 차체" }] },
        { key: "background", name: "배경색", role: "shortcut", values: [{ id: "a", name: "레몬 배경" }, { id: "b", name: "남색 배경" }] },
        { key: "weather", name: "날씨", role: "shortcut", values: [{ id: "a", name: "맑음" }, { id: "b", name: "흐림" }] },
        { key: "camera", name: "카메라", role: "shortcut", values: [{ id: "a", name: "얇은 테두리" }, { id: "b", name: "굵은 테두리" }] },
      ],
    },
    animal: {
      id: "animal",
      title: "동물 귀 모양 판별",
      description: "긴 귀 동물과 뾰족 귀 동물을 가르지만 촬영 환경이 정답의 대리표가 됩니다.",
      classes: [
        { id: "classA", name: "긴 귀 동물", short: "긴 귀" },
        { id: "classB", name: "뾰족 귀 동물", short: "뾰족 귀" },
      ],
      features: [
        { key: "target", name: "귀 모양", role: "target", values: [{ id: "a", name: "긴 귀" }, { id: "b", name: "뾰족 귀" }] },
        { key: "background", name: "촬영 장소", role: "shortcut", values: [{ id: "a", name: "초원" }, { id: "b", name: "도시" }] },
        { key: "weather", name: "날씨", role: "shortcut", values: [{ id: "a", name: "맑음" }, { id: "b", name: "비" }] },
        { key: "camera", name: "촬영 거리", role: "shortcut", values: [{ id: "a", name: "가까이" }, { id: "b", name: "멀리" }] },
      ],
    },
    plant: {
      id: "plant",
      title: "식물 상태 판별",
      description: "잎의 상태를 가르지만 장소와 조명, 카메라 틀이 지름길이 될 수 있습니다.",
      classes: [
        { id: "classA", name: "생기 있는 식물", short: "생기 있음" },
        { id: "classB", name: "메마른 식물", short: "메마름" },
      ],
      features: [
        { key: "target", name: "잎 상태", role: "target", values: [{ id: "a", name: "위로 선 잎" }, { id: "b", name: "처진 잎" }] },
        { key: "background", name: "촬영 장소", role: "shortcut", values: [{ id: "a", name: "온실" }, { id: "b", name: "교실" }] },
        { key: "weather", name: "조명", role: "shortcut", values: [{ id: "a", name: "밝은 조명" }, { id: "b", name: "어두운 조명" }] },
        { key: "camera", name: "카메라 틀", role: "shortcut", values: [{ id: "a", name: "초록 테두리" }, { id: "b", name: "회색 테두리" }] },
      ],
    },
  };

  function deepCopy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function clamp(value, min, max) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : min;
  }

  function stableHash(text) {
    let hash = 2166136261;
    for (const character of String(text)) {
      hash ^= character.codePointAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function makeRng(seed) {
    let state = stableHash(seed || "bias-detective") || 1;
    return function () {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / 4294967296;
    };
  }

  function getScenario(id) {
    return deepCopy(SCENARIOS[id] || SCENARIOS.robot);
  }

  function createConfig(overrides) {
    const source = overrides && typeof overrides === "object" ? overrides : {};
    const scenario = getScenario(source.scenarioId || source.scenario || "robot");
    if (Array.isArray(source.classNames)) {
      scenario.classes.forEach((item, index) => {
        if (String(source.classNames[index] || "").trim()) item.name = String(source.classNames[index]).trim().slice(0, 40);
      });
    }
    if (source.featureNames && typeof source.featureNames === "object") {
      scenario.features.forEach((feature) => {
        const next = String(source.featureNames[feature.key] || "").trim();
        if (next) feature.name = next.slice(0, 40);
      });
    }
    return {
      version: VERSION,
      scenarioId: scenario.id,
      scenario,
      biasStrength: Math.round(clamp(source.biasStrength == null ? 100 : source.biasStrength, 50, 100)),
      seed: String(source.seed || "O15-2026").slice(0, 60),
      missionBudget: Math.round(clamp(source.missionBudget == null ? 20 : source.missionBudget, 4, 60)),
      minCounterexamples: Math.round(clamp(source.minCounterexamples == null ? 8 : source.minCounterexamples, 1, 30)),
      minimumGroupSize: Math.round(clamp(source.minimumGroupSize == null ? 2 : source.minimumGroupSize, 1, 10)),
    };
  }

  function correlatedValue(classIndex, index, count, strength, salt) {
    const matches = Math.round(count * clamp(strength, 50, 100) / 100);
    const offset = stableHash(salt) % count;
    return ((index + offset) % count) < matches ? (classIndex === 0 ? "a" : "b") : (classIndex === 0 ? "b" : "a");
  }

  function makeCard(config, split, classIndex, index, count, mode) {
    const classItem = config.scenario.classes[classIndex];
    const trueValue = classIndex === 0 ? "a" : "b";
    const sceneId = `${config.scenarioId}-${split}-${classIndex}-${index + 1}`;
    const values = { target: trueValue };
    FEATURE_KEYS.slice(1).forEach((key) => {
      if (mode === "counterexample" || mode === "counterfactual") {
        values[key] = trueValue === "a" ? "b" : "a";
      } else {
        values[key] = correlatedValue(classIndex, index, count, config.biasStrength, `${config.seed}-${split}-${key}`);
      }
    });
    return {
      id: sceneId,
      sceneId,
      split,
      label: classItem.id,
      features: values,
      included: split !== "train" || mode !== "counterexample",
      source: mode === "counterexample" ? "candidate" : "generated",
    };
  }

  function generateDataset(rawConfig) {
    const config = createConfig(rawConfig);
    const cards = [];
    config.scenario.classes.forEach((_, classIndex) => {
      for (let index = 0; index < 6; index += 1) cards.push(makeCard(config, "train", classIndex, index, 6, "biased"));
      for (let index = 0; index < 4; index += 1) cards.push(makeCard(config, "train", classIndex, index + 6, 4, "counterexample"));
      for (let index = 0; index < 4; index += 1) cards.push(makeCard(config, "validation", classIndex, index, 4, "biased"));
      for (let index = 0; index < 4; index += 1) cards.push(makeCard(config, "general", classIndex, index, 4, "biased"));
      for (let index = 0; index < 4; index += 1) cards.push(makeCard(config, "counterfactual", classIndex, index, 4, "counterfactual"));
    });
    return cards;
  }

  function featureDefinition(config, key) {
    return config.scenario.features.find((feature) => feature.key === key);
  }

  function validateTraining(cards, config) {
    const training = (cards || []).filter((card) => card.split === "train" && card.included !== false);
    if (!training.length) return { ok: false, code: "EMPTY_TRAINING", message: "훈련에 포함된 카드가 없습니다." };
    const labels = new Set(training.map((card) => card.label));
    if (labels.size < 2) return { ok: false, code: "ONE_CLASS", message: "두 클래스를 모두 한 장 이상 포함해야 합니다." };
    const allowed = new Set(config.scenario.classes.map((item) => item.id));
    if (training.some((card) => !allowed.has(card.label))) return { ok: false, code: "UNKNOWN_CLASS", message: "정의되지 않은 클래스가 있습니다." };
    return { ok: true, training };
  }

  function trainModel(cards, rawConfig, maskedFeatures) {
    const config = createConfig(rawConfig);
    const validation = validateTraining(cards, config);
    const ignored = new Set(Array.isArray(maskedFeatures) ? maskedFeatures.filter((key) => FEATURE_KEYS.includes(key)) : []);
    if (!validation.ok) return { ok: false, code: validation.code, message: validation.message, config, ignoredFeatures: [...ignored] };
    const training = validation.training;
    const alpha = 1;
    const classIds = config.scenario.classes.map((item) => item.id);
    const activeFeatures = FEATURE_KEYS.filter((key) => !ignored.has(key));
    const classCounts = Object.fromEntries(classIds.map((id) => [id, 0]));
    const counts = {};
    classIds.forEach((classId) => {
      counts[classId] = {};
      FEATURE_KEYS.forEach((key) => {
        counts[classId][key] = {};
        featureDefinition(config, key).values.forEach((value) => { counts[classId][key][value.id] = 0; });
      });
    });
    training.forEach((card) => {
      classCounts[card.label] += 1;
      FEATURE_KEYS.forEach((key) => {
        const value = card.features && card.features[key];
        if (value !== MASKED_VALUE) counts[card.label][key][value] = (counts[card.label][key][value] || 0) + 1;
      });
    });
    const model = {
      ok: true,
      alpha,
      config,
      classIds,
      activeFeatures,
      ignoredFeatures: [...ignored],
      trainingCount: training.length,
      classCounts,
      counts,
    };
    model.importance = computeModelImportance(model, training);
    return model;
  }

  function classScore(model, card, classId) {
    const classTotal = model.classCounts[classId];
    const prior = Math.log((classTotal + model.alpha) / (model.trainingCount + model.alpha * model.classIds.length));
    const parts = [{ feature: "prior", value: classId, logProbability: prior }];
    let score = prior;
    model.activeFeatures.forEach((key) => {
      const value = card.features && card.features[key];
      if (value === MASKED_VALUE || value == null || value === "") return;
      const known = featureDefinition(model.config, key).values.map((item) => item.id);
      const unseen = !known.includes(value);
      const valueCount = known.length + (unseen ? 1 : 0);
      const count = model.counts[classId][key][value] || 0;
      const logProbability = Math.log((count + model.alpha) / (classTotal + model.alpha * valueCount));
      score += logProbability;
      parts.push({ feature: key, value, count, denominator: classTotal + model.alpha * valueCount, logProbability, unseen });
    });
    return { classId, score, prior, parts };
  }

  function predict(model, card) {
    if (!model || !model.ok) return { ok: false, code: model && model.code ? model.code : "NO_MODEL", message: "먼저 두 클래스의 자료로 모델을 훈련하세요." };
    const scores = model.classIds.map((classId) => classScore(model, card, classId));
    const best = Math.max(...scores.map((item) => item.score));
    const epsilon = 1e-12;
    const tied = scores.filter((item) => Math.abs(item.score - best) <= epsilon);
    const predicted = tied[0].classId;
    const contribution = {};
    if (model.classIds.length === 2) {
      const first = scores[0];
      const second = scores[1];
      contribution.prior = first.prior - second.prior;
      model.activeFeatures.forEach((key) => {
        const left = first.parts.find((item) => item.feature === key);
        const right = second.parts.find((item) => item.feature === key);
        contribution[key] = (left ? left.logProbability : 0) - (right ? right.logProbability : 0);
      });
    }
    return { ok: true, predicted, tied: tied.length > 1, scores, contribution };
  }

  function computeModelImportance(model, cards) {
    const totals = Object.fromEntries(FEATURE_KEYS.map((key) => [key, 0]));
    let observations = 0;
    (cards || []).forEach((card) => {
      const result = predict({ ...model, importance: null }, card);
      if (!result.ok) return;
      model.activeFeatures.forEach((key) => { totals[key] += Math.abs(result.contribution[key] || 0); });
      observations += 1;
    });
    const averages = Object.fromEntries(FEATURE_KEYS.map((key) => [key, observations ? totals[key] / observations : 0]));
    const sum = Object.values(averages).reduce((total, value) => total + value, 0);
    return Object.fromEntries(FEATURE_KEYS.map((key) => [key, { raw: averages[key], percent: sum ? averages[key] / sum * 100 : 0 }]));
  }

  function evaluate(model, cards, rawConfig) {
    const config = createConfig(rawConfig || (model && model.config));
    const classIds = config.scenario.classes.map((item) => item.id);
    const matrix = Object.fromEntries(classIds.map((actual) => [actual, Object.fromEntries(classIds.map((predicted) => [predicted, 0]))]));
    const evaluated = [];
    (cards || []).forEach((card) => {
      const result = predict(model, card);
      if (!result.ok || !matrix[card.label] || matrix[card.label][result.predicted] == null) return;
      matrix[card.label][result.predicted] += 1;
      evaluated.push({ card, result, correct: result.predicted === card.label });
    });
    const correct = evaluated.filter((item) => item.correct).length;
    const groupMap = new Map();
    evaluated.forEach((item) => {
      const key = `${item.card.features.target}|${item.card.features.background}`;
      if (!groupMap.has(key)) groupMap.set(key, { key, target: item.card.features.target, background: item.card.features.background, total: 0, correct: 0 });
      const group = groupMap.get(key);
      group.total += 1;
      if (item.correct) group.correct += 1;
    });
    const groups = [...groupMap.values()].map((group) => ({
      ...group,
      accuracy: group.total ? group.correct / group.total : null,
      insufficient: group.total < config.minimumGroupSize,
    })).sort((left, right) => left.key.localeCompare(right.key));
    const reliable = groups.filter((group) => !group.insufficient && group.accuracy != null);
    const worstGroupAccuracy = reliable.length ? Math.min(...reliable.map((group) => group.accuracy)) : null;
    return {
      ok: Boolean(model && model.ok),
      total: evaluated.length,
      correct,
      accuracy: evaluated.length ? correct / evaluated.length : null,
      matrix,
      groups,
      worstGroupAccuracy,
      predictions: evaluated,
    };
  }

  function crossTable(cards, featureKey, rawConfig) {
    const config = createConfig(rawConfig);
    const classes = config.scenario.classes;
    const definition = featureDefinition(config, featureKey);
    const values = definition.values;
    const table = Object.fromEntries(values.map((value) => [value.id, Object.fromEntries(classes.map((item) => [item.id, 0]))]));
    const classTotals = Object.fromEntries(classes.map((item) => [item.id, 0]));
    let total = 0;
    (cards || []).forEach((card) => {
      const value = card.features && card.features[featureKey];
      if (!table[value] || classTotals[card.label] == null) return;
      table[value][card.label] += 1;
      classTotals[card.label] += 1;
      total += 1;
    });
    const rowTotals = Object.fromEntries(values.map((value) => [value.id, classes.reduce((sum, item) => sum + table[value.id][item.id], 0)]));
    let chiSquare = 0;
    if (total) {
      values.forEach((value) => classes.forEach((item) => {
        const expected = rowTotals[value.id] * classTotals[item.id] / total;
        if (expected > 0) chiSquare += ((table[value.id][item.id] - expected) ** 2) / expected;
      }));
    }
    const dimension = Math.min(values.length - 1, classes.length - 1);
    const association = total && dimension > 0 ? Math.sqrt(chiSquare / (total * dimension)) : 0;
    return {
      featureKey,
      table,
      classTotals,
      rowTotals,
      total,
      association: Number.isFinite(association) ? association : 0,
      insufficient: total < Math.max(4, values.length * classes.length),
      percentages: Object.fromEntries(values.map((value) => [value.id, Object.fromEntries(classes.map((item) => [item.id, classTotals[item.id] ? table[value.id][item.id] / classTotals[item.id] : null]))])),
    };
  }

  function splitCards(cards, split) {
    return (cards || []).filter((card) => card.split === split && (split !== "train" || card.included !== false));
  }

  function evaluateAll(model, cards, config) {
    return Object.fromEntries(SPLITS.map((split) => [split, evaluate(model, splitCards(cards, split), config)]));
  }

  function flipValue(config, featureKey, value) {
    const values = featureDefinition(config, featureKey).values.map((item) => item.id);
    const index = values.indexOf(value);
    return values.length < 2 ? value : values[(index + 1 + values.length) % values.length];
  }

  function transformCard(card, kind, rawConfig, featureKey) {
    const config = createConfig(rawConfig);
    const next = deepCopy(card);
    next.id = `${card.id}-cf-${kind}-${featureKey || ""}`;
    next.source = "counterfactual-pair";
    if (kind === "background") next.features.background = flipValue(config, "background", next.features.background);
    if (kind === "target") {
      next.features.target = flipValue(config, "target", next.features.target);
      const valueIndex = featureDefinition(config, "target").values.findIndex((item) => item.id === next.features.target);
      next.label = config.scenario.classes[Math.max(0, valueIndex % config.scenario.classes.length)].id;
    }
    if (kind === "mask") {
      const key = FEATURE_KEYS.includes(featureKey) ? featureKey : "background";
      next.features[key] = MASKED_VALUE;
    }
    return next;
  }

  function addCounterexamples(cards) {
    return (cards || []).map((card) => card.split === "train" && card.source === "candidate" ? { ...card, included: true } : deepCopy(card));
  }

  function balanceTraining(cards, rawConfig) {
    const config = createConfig(rawConfig);
    const next = deepCopy(cards || []);
    const combinations = [];
    for (let code = 0; code < 8; code += 1) {
      combinations.push({
        background: code & 1 ? "b" : "a",
        weather: code & 2 ? "b" : "a",
        camera: code & 4 ? "b" : "a",
      });
    }
    config.scenario.classes.forEach((classItem, classIndex) => {
      const pool = next.filter((card) => card.split === "train" && card.label === classItem.id).sort((left, right) => left.id.localeCompare(right.id));
      pool.forEach((card, index) => {
        card.included = index < combinations.length;
        if (card.included) {
          card.features.target = classIndex === 0 ? "a" : "b";
          Object.assign(card.features, combinations[index]);
          card.source = index >= 6 ? "balanced-counterexample" : card.source;
        }
      });
    });
    return next;
  }

  function randomizeShortcuts(cards, rawConfig) {
    const config = createConfig(rawConfig);
    const rng = makeRng(`${config.seed}-randomize`);
    return deepCopy(cards || []).map((card) => {
      if (card.split !== "train" || card.included === false) return card;
      FEATURE_KEYS.slice(1).forEach((key) => { card.features[key] = rng() < 0.5 ? "a" : "b"; });
      card.source = "randomized";
      return card;
    });
  }

  function rebuildEvaluationSplits(cards, rawConfig) {
    const config = createConfig(rawConfig);
    const fresh = generateDataset(config).filter((card) => card.split !== "train");
    return [...deepCopy((cards || []).filter((card) => card.split === "train")), ...fresh];
  }

  function parseCsvRows(text) {
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;
    const source = String(text || "").replace(/^\uFEFF/, "");
    for (let index = 0; index < source.length; index += 1) {
      const character = source[index];
      if (quoted) {
        if (character === '"' && source[index + 1] === '"') { field += '"'; index += 1; }
        else if (character === '"') quoted = false;
        else field += character;
      } else if (character === '"') quoted = true;
      else if (character === ",") { row.push(field); field = ""; }
      else if (character === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
      else field += character;
    }
    if (field.length || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
    return rows.filter((items) => items.some((item) => item !== ""));
  }

  function parseCsv(text, rawConfig) {
    const config = createConfig(rawConfig);
    const rows = parseCsvRows(text);
    if (!rows.length) return { ok: false, code: "EMPTY_CSV", message: "CSV가 비어 있습니다." };
    const headers = rows[0].map((item) => item.trim());
    const required = ["id", "split", "label", ...FEATURE_KEYS];
    const missing = required.filter((item) => !headers.includes(item));
    if (missing.length) return { ok: false, code: "MISSING_COLUMNS", message: `필수 열이 없습니다: ${missing.join(", ")}` };
    const cards = [];
    const ids = new Set();
    for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex];
      const record = Object.fromEntries(headers.map((header, index) => [header, String(row[index] == null ? "" : row[index]).trim()]));
      if (!record.id) return { ok: false, code: "INVALID_ROW", message: `${rowIndex + 1}행의 id가 비어 있습니다.` };
      if (ids.has(record.id)) return { ok: false, code: "DUPLICATE_ID", message: `중복 id: ${record.id}` };
      if (!SPLITS.includes(record.split)) return { ok: false, code: "INVALID_SPLIT", message: `${rowIndex + 1}행의 split이 올바르지 않습니다.` };
      if (!config.scenario.classes.some((item) => item.id === record.label)) return { ok: false, code: "INVALID_LABEL", message: `${rowIndex + 1}행의 label이 올바르지 않습니다.` };
      const invalidFeature = FEATURE_KEYS.find((key) => !featureDefinition(config, key).values.some((item) => item.id === record[key]));
      if (invalidFeature) return { ok: false, code: "INVALID_FEATURE", message: `${rowIndex + 1}행의 ${invalidFeature} 값이 올바르지 않습니다.` };
      ids.add(record.id);
      cards.push({
        id: record.id.slice(0, 80),
        sceneId: (record.sceneId || record.id).slice(0, 80),
        split: record.split,
        label: record.label,
        features: Object.fromEntries(FEATURE_KEYS.map((key) => [key, record[key]])),
        included: record.included !== "false" && record.included !== "0",
        source: "csv",
      });
    }
    if (cards.length > 500) return { ok: false, code: "TOO_MANY_CARDS", message: "카드는 최대 500장까지 불러올 수 있습니다." };
    return { ok: true, cards };
  }

  function csvEscape(value) {
    const text = String(value == null ? "" : value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function exportCsv(cards) {
    const headers = ["id", "sceneId", "split", "label", ...FEATURE_KEYS, "included"];
    const rows = (cards || []).map((card) => [card.id, card.sceneId || card.id, card.split, card.label, ...FEATURE_KEYS.map((key) => card.features[key]), card.included !== false]);
    return `\uFEFF${[headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n")}`;
  }

  function serializeState(state) {
    const payload = {
      version: VERSION,
      type: "ai-data-bias-detective",
      config: createConfig(state.config),
      cards: deepCopy(state.cards || []),
      maskedFeatures: (state.maskedFeatures || []).filter((key) => FEATURE_KEYS.includes(key)),
      notes: {
        expectation: String(state.notes && state.notes.expectation || "").slice(0, 2000),
        evidence: String(state.notes && state.notes.evidence || "").slice(0, 2000),
        conclusion: String(state.notes && state.notes.conclusion || "").slice(0, 2000),
        modelChoice: String(state.notes && state.notes.modelChoice || "").slice(0, 2000),
      },
      history: deepCopy((state.history || []).slice(-30)),
    };
    return JSON.stringify(payload, null, 2);
  }

  function deserializeState(text) {
    let payload;
    try { payload = JSON.parse(String(text || "")); }
    catch (error) { return { ok: false, code: "INVALID_JSON", message: "JSON 문법을 확인해 주세요." }; }
    if (!payload || payload.type !== "ai-data-bias-detective" || payload.version !== VERSION) return { ok: false, code: "INVALID_SCHEMA", message: "이 도구에서 저장한 버전 1 JSON이 아닙니다." };
    const config = createConfig(payload.config);
    if (!Array.isArray(payload.cards) || payload.cards.length > 500) return { ok: false, code: "INVALID_CARDS", message: "카드 배열이 없거나 너무 큽니다." };
    const parsedCsv = parseCsv(exportCsv(payload.cards), config);
    if (!parsedCsv.ok) return parsedCsv;
    const sourceById = new Map(payload.cards.map((card) => [String(card && card.id || ""), String(card && card.source || "json").slice(0, 40)]));
    return {
      ok: true,
      state: {
        config,
        cards: parsedCsv.cards.map((card) => ({ ...card, source: sourceById.get(card.id) || "json" })),
        maskedFeatures: Array.isArray(payload.maskedFeatures) ? payload.maskedFeatures.filter((key) => FEATURE_KEYS.includes(key)) : [],
        notes: payload.notes && typeof payload.notes === "object" ? {
          expectation: String(payload.notes.expectation || "").slice(0, 2000),
          evidence: String(payload.notes.evidence || "").slice(0, 2000),
          conclusion: String(payload.notes.conclusion || "").slice(0, 2000),
          modelChoice: String(payload.notes.modelChoice || "").slice(0, 2000),
        } : { expectation: "", evidence: "", conclusion: "", modelChoice: "" },
        history: Array.isArray(payload.history) ? deepCopy(payload.history.slice(-30)) : [],
      },
    };
  }

  return {
    VERSION,
    MASKED_VALUE,
    SPLITS,
    FEATURE_KEYS,
    SCENARIOS: deepCopy(SCENARIOS),
    createConfig,
    getScenario,
    generateDataset,
    splitCards,
    trainModel,
    predict,
    evaluate,
    evaluateAll,
    crossTable,
    transformCard,
    addCounterexamples,
    balanceTraining,
    randomizeShortcuts,
    rebuildEvaluationSplits,
    parseCsv,
    exportCsv,
    serializeState,
    deserializeState,
    deepCopy,
  };
});
