(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.BayesFilter = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const EPSILON = 1e-12;

  function clamp(value, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.min(max, Math.max(min, number));
  }

  function sum(values) {
    return values.reduce((total, value) => total + value, 0);
  }

  function almostEqual(a, b, tolerance) {
    return Math.abs(a - b) <= (tolerance || 1e-9);
  }

  function mapSize(map) {
    return Number(map.width) * Number(map.height);
  }

  function indexOf(map, x, y) {
    return y * map.width + x;
  }

  function pointOf(map, index) {
    return { x: index % map.width, y: Math.floor(index / map.width) };
  }

  function inBounds(map, x, y) {
    return x >= 0 && y >= 0 && x < map.width && y < map.height;
  }

  function isPassable(map, index) {
    return index >= 0 && index < mapSize(map) && !map.cells[index].blocked;
  }

  function passableIndices(map) {
    const indices = [];
    for (let index = 0; index < mapSize(map); index += 1) {
      if (isPassable(map, index)) indices.push(index);
    }
    return indices;
  }

  function assertMap(map) {
    if (!map || !Number.isInteger(map.width) || !Number.isInteger(map.height)) {
      throw new Error("지도 너비와 높이는 정수여야 합니다.");
    }
    if (map.width < 1 || map.height < 1 || map.width > 12 || map.height > 12) {
      throw new Error("지도 크기는 1×1 이상 12×12 이하여야 합니다.");
    }
    if (!Array.isArray(map.cells) || map.cells.length !== mapSize(map)) {
      throw new Error("지도 칸 수가 너비×높이와 일치하지 않습니다.");
    }
    if (!passableIndices(map).length) throw new Error("이동 가능한 칸이 하나 이상 필요합니다.");
    return true;
  }

  function normalize(values) {
    if (!Array.isArray(values) || !values.length) {
      return { ok: false, distribution: [], total: 0, reason: "정규화할 값이 없습니다." };
    }
    const cleaned = values.map((value) => {
      const number = Number(value);
      return Number.isFinite(number) && number > 0 ? number : 0;
    });
    const total = sum(cleaned);
    if (!(total > EPSILON)) {
      return {
        ok: false,
        distribution: cleaned.map(() => 0),
        total,
        reason: "모든 가능도가 0이어서 정규화할 수 없습니다. 관측값이나 센서 모형을 확인하세요.",
      };
    }
    return { ok: true, distribution: cleaned.map((value) => value / total), total, reason: "" };
  }

  function validateDistribution(distribution, map, tolerance) {
    assertMap(map);
    if (!Array.isArray(distribution) || distribution.length !== mapSize(map)) {
      return { ok: false, reason: "확률 배열 길이가 지도 칸 수와 다릅니다." };
    }
    for (let index = 0; index < distribution.length; index += 1) {
      const value = distribution[index];
      if (!Number.isFinite(value) || value < 0) return { ok: false, reason: "확률은 0 이상의 유한한 수여야 합니다." };
      if (!isPassable(map, index) && value > (tolerance || 1e-9)) return { ok: false, reason: "막힌 칸에는 양의 확률을 둘 수 없습니다." };
    }
    const total = sum(distribution);
    if (!almostEqual(total, 1, tolerance || 1e-9)) {
      return { ok: false, reason: `확률의 합이 1이 아닙니다(현재 ${total}).` };
    }
    return { ok: true, reason: "" };
  }

  function uniformPrior(map) {
    assertMap(map);
    const available = passableIndices(map);
    const probability = 1 / available.length;
    return map.cells.map((_, index) => (isPassable(map, index) ? probability : 0));
  }

  function biasedPrior(map, focusIndex, focusMass) {
    assertMap(map);
    const available = passableIndices(map);
    if (!isPassable(map, focusIndex)) throw new Error("편향 사전분포의 중심은 이동 가능한 칸이어야 합니다.");
    const mass = clamp(focusMass === undefined ? 0.55 : focusMass, 0, 1);
    if (available.length === 1) return map.cells.map((_, index) => (index === focusIndex ? 1 : 0));
    const remainder = (1 - mass) / (available.length - 1);
    return map.cells.map((_, index) => {
      if (!isPassable(map, index)) return 0;
      return index === focusIndex ? mass : remainder;
    });
  }

  function validateMotion(motion, tolerance) {
    const keys = ["stay", "under", "exact", "over"];
    const probabilities = keys.map((key) => Number(motion && motion[key]));
    if (probabilities.some((value) => !Number.isFinite(value) || value < 0 || value > 1)) {
      return { ok: false, reason: "이동 확률은 각각 0 이상 1 이하여야 합니다." };
    }
    const total = sum(probabilities);
    if (!almostEqual(total, 1, tolerance || 1e-9)) {
      return { ok: false, reason: `이동 확률의 합은 1이어야 합니다(현재 ${total.toFixed(6)}).` };
    }
    return { ok: true, reason: "" };
  }

  function movementOutcomes(command, motion) {
    const validation = validateMotion(motion);
    if (!validation.ok) throw new Error(validation.reason);
    const dx = Number(command && command.dx) || 0;
    const dy = Number(command && command.dy) || 0;
    const steps = Math.max(1, Math.round(Math.abs(Number(command && command.steps) || 1)));
    const raw = [
      { label: "제자리", dx: 0, dy: 0, steps: 0, probability: Number(motion.stay) },
      { label: "덜 이동", dx, dy, steps: Math.max(0, steps - 1), probability: Number(motion.under) },
      { label: "명령대로", dx, dy, steps, probability: Number(motion.exact) },
      { label: "더 이동", dx, dy, steps: steps + 1, probability: Number(motion.over) },
    ];
    const merged = new Map();
    raw.forEach((outcome) => {
      if (outcome.probability <= 0) return;
      const key = `${outcome.dx},${outcome.dy},${outcome.steps}`;
      if (!merged.has(key)) merged.set(key, { ...outcome });
      else merged.get(key).probability += outcome.probability;
    });
    return Array.from(merged.values());
  }

  function moveIndex(map, startIndex, dx, dy, steps) {
    assertMap(map);
    if (!isPassable(map, startIndex)) throw new Error("출발 칸은 이동 가능해야 합니다.");
    let point = pointOf(map, startIndex);
    let current = startIndex;
    for (let count = 0; count < steps; count += 1) {
      let nextX = point.x + dx;
      let nextY = point.y + dy;
      if (map.topology === "cycle" && map.height === 1) {
        nextX = ((nextX % map.width) + map.width) % map.width;
      }
      if (!inBounds(map, nextX, nextY)) break;
      const next = indexOf(map, nextX, nextY);
      if (!isPassable(map, next)) break;
      current = next;
      point = { x: nextX, y: nextY };
    }
    return current;
  }

  function transitionRow(map, startIndex, command, motion) {
    const row = new Array(mapSize(map)).fill(0);
    movementOutcomes(command, motion).forEach((outcome) => {
      const target = moveIndex(map, startIndex, outcome.dx, outcome.dy, outcome.steps);
      row[target] += outcome.probability;
    });
    return row;
  }

  function predict(prior, map, command, motion) {
    const distributionCheck = validateDistribution(prior, map, 1e-8);
    if (!distributionCheck.ok) throw new Error(distributionCheck.reason);
    const motionCheck = validateMotion(motion, 1e-8);
    if (!motionCheck.ok) throw new Error(motionCheck.reason);
    const prediction = new Array(mapSize(map)).fill(0);
    prior.forEach((probability, startIndex) => {
      if (probability <= 0) return;
      const row = transitionRow(map, startIndex, command, motion);
      row.forEach((transitionProbability, targetIndex) => {
        prediction[targetIndex] += probability * transitionProbability;
      });
    });
    const normalized = normalize(prediction);
    if (!normalized.ok) throw new Error(normalized.reason);
    return normalized.distribution;
  }

  function cellFeature(cell, sensorType) {
    if (sensorType === "terrain") return cell.terrain || "일반도로";
    if (sensorType === "landmark") return cell.landmark || "없음";
    return null;
  }

  function nearestDistance(map, index, target) {
    const origin = pointOf(map, index);
    let nearest = Infinity;
    map.cells.forEach((cell, candidate) => {
      const matches = target === "wall" ? cell.blocked : Boolean(cell.landmark);
      if (!matches) return;
      const point = pointOf(map, candidate);
      nearest = Math.min(nearest, Math.abs(origin.x - point.x) + Math.abs(origin.y - point.y));
    });
    return Number.isFinite(nearest) ? nearest : "없음";
  }

  function expectedObservation(map, index, sensor) {
    if (!isPassable(map, index)) return null;
    if (sensor.type === "terrain" || sensor.type === "landmark") return cellFeature(map.cells[index], sensor.type);
    if (sensor.type === "distance-wall") return nearestDistance(map, index, "wall");
    if (sensor.type === "distance-landmark") return nearestDistance(map, index, "landmark");
    throw new Error(`지원하지 않는 센서 유형입니다: ${sensor.type}`);
  }

  function likelihoods(map, observation, sensor) {
    assertMap(map);
    const accuracy = clamp(sensor && sensor.accuracy, 0, 1);
    const falsePositive = clamp(sensor && sensor.falsePositive, 0, 1);
    return map.cells.map((_, index) => {
      if (!isPassable(map, index)) return 0;
      return expectedObservation(map, index, sensor) === observation ? accuracy : falsePositive;
    });
  }

  function update(prediction, likelihood) {
    if (!Array.isArray(prediction) || !Array.isArray(likelihood) || prediction.length !== likelihood.length) {
      throw new Error("예측분포와 가능도 배열의 길이가 같아야 합니다.");
    }
    const unnormalized = prediction.map((probability, index) => probability * Math.max(0, Number(likelihood[index]) || 0));
    const normalized = normalize(unnormalized);
    if (!normalized.ok) {
      return {
        ok: false,
        prediction: prediction.slice(),
        likelihood: likelihood.slice(),
        unnormalized,
        evidence: normalized.total,
        posterior: prediction.slice(),
        reason: normalized.reason,
      };
    }
    return {
      ok: true,
      prediction: prediction.slice(),
      likelihood: likelihood.slice(),
      unnormalized,
      evidence: normalized.total,
      posterior: normalized.distribution,
      reason: "",
    };
  }

  function combineLikelihoods(likelihoodSets) {
    if (!Array.isArray(likelihoodSets) || !likelihoodSets.length) throw new Error("결합할 가능도가 필요합니다.");
    const length = likelihoodSets[0].length;
    if (likelihoodSets.some((values) => !Array.isArray(values) || values.length !== length)) {
      throw new Error("결합할 가능도 배열의 길이가 모두 같아야 합니다.");
    }
    return Array.from({ length }, (_, index) => likelihoodSets.reduce((product, values) => product * values[index], 1));
  }

  function updateTogether(prediction, likelihoodSets) {
    return update(prediction, combineLikelihoods(likelihoodSets));
  }

  function updateSequential(prediction, likelihoodSets) {
    let current = prediction.slice();
    const stages = [];
    for (const likelihood of likelihoodSets) {
      const result = update(current, likelihood);
      stages.push(result);
      if (!result.ok) return { ok: false, stages, posterior: current, reason: result.reason };
      current = result.posterior;
    }
    return { ok: true, stages, posterior: current, reason: "" };
  }

  function entropy(distribution) {
    return distribution.reduce((total, probability) => {
      if (!(probability > 0)) return total;
      return total - probability * Math.log2(probability);
    }, 0);
  }

  function maxProbability(distribution) {
    const max = Math.max(...distribution);
    return { index: distribution.indexOf(max), probability: max };
  }

  function hashSeed(seed) {
    const text = String(seed === undefined ? "bayes-lab" : seed);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function createRng(seed) {
    let value = hashSeed(seed);
    return function random() {
      value += 0x6D2B79F5;
      let result = value;
      result = Math.imul(result ^ (result >>> 15), result | 1);
      result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
      return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
    };
  }

  function weightedChoice(weights, random) {
    const normalized = normalize(weights);
    if (!normalized.ok) throw new Error(normalized.reason);
    const draw = (random || Math.random)();
    let cumulative = 0;
    for (let index = 0; index < normalized.distribution.length; index += 1) {
      cumulative += normalized.distribution[index];
      if (draw < cumulative || index === normalized.distribution.length - 1) return index;
    }
    return normalized.distribution.length - 1;
  }

  function sampleMove(map, actualIndex, command, motion, random) {
    const outcomes = movementOutcomes(command, motion);
    const chosen = outcomes[weightedChoice(outcomes.map((outcome) => outcome.probability), random)];
    return {
      index: moveIndex(map, actualIndex, chosen.dx, chosen.dy, chosen.steps),
      outcome: chosen.label,
    };
  }

  function possibleObservations(map, sensor) {
    const values = passableIndices(map).map((index) => expectedObservation(map, index, sensor));
    return Array.from(new Set(values));
  }

  function sampleObservation(map, actualIndex, sensor, random) {
    const correct = expectedObservation(map, actualIndex, sensor);
    const values = possibleObservations(map, sensor);
    const alternatives = values.filter((value) => value !== correct);
    if (!(random || Math.random)() < clamp(sensor.accuracy, 0, 1) && alternatives.length) {
      return alternatives[Math.floor((random || Math.random)() * alternatives.length)];
    }
    return correct;
  }

  function scenarioForExport(scenario) {
    return {
      schema: "bayes-localization-lab",
      version: 1,
      name: String(scenario.name || "사용자 시나리오").slice(0, 80),
      mode: scenario.mode === "2d" ? "2d" : "1d",
      map: {
        width: Number(scenario.map.width),
        height: Number(scenario.map.height),
        topology: scenario.map.topology === "cycle" ? "cycle" : "finite",
        cells: scenario.map.cells.map((cell) => ({
          blocked: Boolean(cell.blocked),
          terrain: String(cell.terrain || "일반도로").slice(0, 30),
          landmark: String(cell.landmark || "").slice(0, 30),
        })),
      },
      prior: scenario.prior.map(Number),
      actualIndex: Number(scenario.actualIndex),
      motion: {
        stay: Number(scenario.motion.stay), under: Number(scenario.motion.under),
        exact: Number(scenario.motion.exact), over: Number(scenario.motion.over),
      },
      sensors: scenario.sensors.slice(0, 2).map((sensor) => ({
        type: sensor.type,
        accuracy: Number(sensor.accuracy),
        falsePositive: Number(sensor.falsePositive),
      })),
      mission: {
        goal: String((scenario.mission && scenario.mission.goal) || "").slice(0, 200),
        maxSensorUses: Math.max(1, Math.min(20, Math.round(Number((scenario.mission && scenario.mission.maxSensorUses) || 5)))),
        targetIndex: Number((scenario.mission && scenario.mission.targetIndex) || 0),
      },
    };
  }

  function validateScenario(scenario) {
    try {
      if (!scenario || scenario.schema !== "bayes-localization-lab" || Number(scenario.version) !== 1) {
        return { ok: false, reason: "이 실험실의 JSON 형식이 아니거나 지원하지 않는 버전입니다." };
      }
      assertMap(scenario.map);
      const distributionCheck = validateDistribution(scenario.prior, scenario.map, 1e-6);
      if (!distributionCheck.ok) return distributionCheck;
      const motionCheck = validateMotion(scenario.motion, 1e-6);
      if (!motionCheck.ok) return motionCheck;
      if (!isPassable(scenario.map, Number(scenario.actualIndex))) return { ok: false, reason: "실제 시작 위치가 막힌 칸입니다." };
      if (!Array.isArray(scenario.sensors) || scenario.sensors.length < 1 || scenario.sensors.length > 2) {
        return { ok: false, reason: "센서는 1개 또는 2개여야 합니다." };
      }
      const allowed = ["terrain", "landmark", "distance-wall", "distance-landmark"];
      for (const sensor of scenario.sensors) {
        if (!allowed.includes(sensor.type)) return { ok: false, reason: "지원하지 않는 센서 유형이 포함되어 있습니다." };
        if (!Number.isFinite(Number(sensor.accuracy)) || Number(sensor.accuracy) < 0 || Number(sensor.accuracy) > 1 ||
            !Number.isFinite(Number(sensor.falsePositive)) || Number(sensor.falsePositive) < 0 || Number(sensor.falsePositive) > 1) {
          return { ok: false, reason: "센서 정확도와 오인식률은 0 이상 1 이하여야 합니다." };
        }
      }
      return { ok: true, reason: "" };
    } catch (error) {
      return { ok: false, reason: error.message };
    }
  }

  function exportScenario(scenario) {
    const safe = scenarioForExport(scenario);
    const validation = validateScenario(safe);
    if (!validation.ok) throw new Error(validation.reason);
    return JSON.stringify(safe, null, 2);
  }

  function importScenario(text) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (_) {
      throw new Error("JSON 문법을 확인해 주세요.");
    }
    if (!parsed || parsed.schema !== "bayes-localization-lab" || Number(parsed.version) !== 1) {
      throw new Error("이 실험실의 JSON 형식이 아니거나 지원하지 않는 버전입니다.");
    }
    if (!parsed.map || !Array.isArray(parsed.map.cells) || !Array.isArray(parsed.prior) || !parsed.motion || !Array.isArray(parsed.sensors)) {
      throw new Error("필수 지도·확률·센서 설정이 없는 JSON 형식입니다.");
    }
    const safe = scenarioForExport(parsed);
    safe.schema = parsed.schema;
    safe.version = parsed.version;
    const validation = validateScenario(safe);
    if (!validation.ok) throw new Error(validation.reason);
    return safe;
  }

  return {
    EPSILON,
    almostEqual,
    sum,
    mapSize,
    indexOf,
    pointOf,
    inBounds,
    isPassable,
    passableIndices,
    assertMap,
    normalize,
    validateDistribution,
    uniformPrior,
    biasedPrior,
    validateMotion,
    movementOutcomes,
    moveIndex,
    transitionRow,
    predict,
    nearestDistance,
    expectedObservation,
    possibleObservations,
    likelihoods,
    update,
    combineLikelihoods,
    updateTogether,
    updateSequential,
    entropy,
    maxProbability,
    hashSeed,
    createRng,
    weightedChoice,
    sampleMove,
    sampleObservation,
    scenarioForExport,
    validateScenario,
    exportScenario,
    importScenario,
  };
});
