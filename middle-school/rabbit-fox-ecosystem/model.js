(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.EcosystemModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DEFAULTS = Object.freeze({
    rabbitGrowth: 0.1,
    predationRate: 0.002,
    foxDeathRate: 0.1,
    foxGrowthRate: 0.0004,
    initialRabbits: 300,
    initialFoxes: 30,
    duration: 120,
    dt: 0.2,
    useCapacity: false,
    carryingCapacity: 900,
    maxPopulation: 1000000,
    maxSteps: 20000
  });

  const LIMITS = Object.freeze({
    rabbitGrowth: [0, 2],
    predationRate: [0, 0.1],
    foxDeathRate: [0, 2],
    foxGrowthRate: [0, 0.1],
    initialRabbits: [0, 1000000],
    initialFoxes: [0, 1000000],
    duration: [0.1, 1000],
    dt: [0.001, 20],
    carryingCapacity: [1, 1000000],
    maxPopulation: [10, 1000000000],
    maxSteps: [10, 100000]
  });

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function normalizeConfig(input) {
    const source = input || {};
    const config = {};
    const warnings = [];

    Object.keys(LIMITS).forEach((key) => {
      const fallback = DEFAULTS[key];
      const provided = Object.prototype.hasOwnProperty.call(source, key) && source[key] !== "" && source[key] != null;
      const value = Number(source[key]);
      const [min, max] = LIMITS[key];
      if (!provided) {
        config[key] = fallback;
      } else if (!Number.isFinite(value)) {
        config[key] = fallback;
        warnings.push(`${key}: 올바른 수가 아니어서 기본값을 사용했습니다.`);
      } else {
        config[key] = clamp(value, min, max);
        if (config[key] !== value) warnings.push(`${key}: 안전 범위 ${min}~${max}로 조정했습니다.`);
      }
    });

    config.useCapacity = Boolean(source.useCapacity);
    config.maxSteps = Math.round(config.maxSteps);
    const requestedSteps = Math.ceil(config.duration / config.dt);
    const steps = Math.min(requestedSteps, config.maxSteps);
    if (requestedSteps > config.maxSteps) {
      warnings.push(`계산량을 안전하게 유지하기 위해 시간 간격을 ${config.maxSteps.toLocaleString()}단계에 맞췄습니다.`);
    }
    config.steps = Math.max(1, steps);
    config.actualDt = config.duration / config.steps;
    return { config, warnings };
  }

  function derivatives(rabbits, foxes, config) {
    const carryingFactor = config.useCapacity ? 1 - rabbits / config.carryingCapacity : 1;
    return {
      rabbits: config.rabbitGrowth * rabbits * carryingFactor - config.predationRate * rabbits * foxes,
      foxes: config.foxGrowthRate * rabbits * foxes - config.foxDeathRate * foxes
    };
  }

  function safePopulation(value, maxPopulation) {
    if (!Number.isFinite(value)) return { value: maxPopulation, limited: true };
    if (value <= 0) return { value: 0, limited: value < 0 };
    if (value > maxPopulation) return { value: maxPopulation, limited: true };
    return { value, limited: false };
  }

  function rk4Step(rabbits, foxes, dt, config) {
    const k1 = derivatives(rabbits, foxes, config);
    const k2 = derivatives(rabbits + k1.rabbits * dt / 2, foxes + k1.foxes * dt / 2, config);
    const k3 = derivatives(rabbits + k2.rabbits * dt / 2, foxes + k2.foxes * dt / 2, config);
    const k4 = derivatives(rabbits + k3.rabbits * dt, foxes + k3.foxes * dt, config);
    return {
      rabbits: rabbits + dt * (k1.rabbits + 2 * k2.rabbits + 2 * k3.rabbits + k4.rabbits) / 6,
      foxes: foxes + dt * (k1.foxes + 2 * k2.foxes + 2 * k3.foxes + k4.foxes) / 6
    };
  }

  function eulerStep(rabbits, foxes, dt, config) {
    const change = derivatives(rabbits, foxes, config);
    return {
      rabbits: rabbits + dt * change.rabbits,
      foxes: foxes + dt * change.foxes
    };
  }

  function equilibrium(input) {
    const { config } = normalizeConfig(input);
    if (config.foxGrowthRate <= 0 || config.predationRate <= 0) {
      return { rabbits: null, foxes: null, exists: false, reason: "상호작용 계수가 0이면 양의 공존 균형점이 없습니다." };
    }
    const rabbits = config.foxDeathRate / config.foxGrowthRate;
    const capacityFactor = config.useCapacity ? 1 - rabbits / config.carryingCapacity : 1;
    const foxes = config.rabbitGrowth * capacityFactor / config.predationRate;
    if (!Number.isFinite(rabbits) || !Number.isFinite(foxes) || rabbits <= 0 || foxes <= 0) {
      return { rabbits, foxes, exists: false, reason: "이 조건에서는 두 종이 함께 사는 양의 균형점이 없습니다." };
    }
    return { rabbits, foxes, exists: true, reason: "두 변화율이 동시에 0이 되는 공존 균형점입니다." };
  }

  function simulate(input) {
    const normalized = normalizeConfig(input);
    const config = normalized.config;
    const warnings = normalized.warnings.slice();
    const times = new Array(config.steps + 1);
    const continuous = { rabbits: new Array(config.steps + 1), foxes: new Array(config.steps + 1) };
    const discrete = { rabbits: new Array(config.steps + 1), foxes: new Array(config.steps + 1) };
    const safeInitialRabbits = safePopulation(config.initialRabbits, config.maxPopulation);
    const safeInitialFoxes = safePopulation(config.initialFoxes, config.maxPopulation);
    let continuousRabbits = safeInitialRabbits.value;
    let continuousFoxes = safeInitialFoxes.value;
    let discreteRabbits = safeInitialRabbits.value;
    let discreteFoxes = safeInitialFoxes.value;
    let limited = safeInitialRabbits.limited || safeInitialFoxes.limited;

    for (let index = 0; index <= config.steps; index += 1) {
      times[index] = index * config.actualDt;
      continuous.rabbits[index] = continuousRabbits;
      continuous.foxes[index] = continuousFoxes;
      discrete.rabbits[index] = discreteRabbits;
      discrete.foxes[index] = discreteFoxes;
      if (index === config.steps) break;

      const continuousNext = rk4Step(continuousRabbits, continuousFoxes, config.actualDt, config);
      const discreteNext = eulerStep(discreteRabbits, discreteFoxes, config.actualDt, config);
      const safeValues = [
        safePopulation(continuousNext.rabbits, config.maxPopulation),
        safePopulation(continuousNext.foxes, config.maxPopulation),
        safePopulation(discreteNext.rabbits, config.maxPopulation),
        safePopulation(discreteNext.foxes, config.maxPopulation)
      ];
      limited = limited || safeValues.some((item) => item.limited);
      [continuousRabbits, continuousFoxes, discreteRabbits, discreteFoxes] = safeValues.map((item) => item.value);
    }

    if (limited) warnings.push("일부 계산에서 음수 또는 수치 폭주가 감지되어 0과 안전 상한 사이로 제한했습니다.");
    return {
      config,
      times,
      continuous,
      discrete,
      equilibrium: equilibrium(config),
      warnings,
      limited
    };
  }

  function localPeaks(values, times, minimumProminence) {
    const peaks = [];
    const threshold = Number.isFinite(minimumProminence) ? minimumProminence : 1e-9;
    for (let index = 1; index < values.length - 1; index += 1) {
      const value = values[index];
      if (value > values[index - 1] && value >= values[index + 1] && value > threshold) {
        peaks.push({ index, time: times[index], value });
      }
    }
    return peaks;
  }

  function summarize(result, modelName) {
    const model = modelName === "discrete" ? result.discrete : result.continuous;
    const rabbitPeaks = localPeaks(model.rabbits, result.times);
    const foxPeaks = localPeaks(model.foxes, result.times);
    const firstRabbitPeak = rabbitPeaks[0] || null;
    const firstFoxPeak = firstRabbitPeak
      ? foxPeaks.find((peak) => peak.time >= firstRabbitPeak.time) || foxPeaks[0] || null
      : foxPeaks[0] || null;
    const periods = rabbitPeaks.slice(1).map((peak, index) => peak.time - rabbitPeaks[index].time);
    const averagePeriod = periods.length ? periods.reduce((sum, value) => sum + value, 0) / periods.length : null;
    return {
      rabbitPeaks,
      foxPeaks,
      firstRabbitPeak,
      firstFoxPeak,
      lag: firstRabbitPeak && firstFoxPeak ? firstFoxPeak.time - firstRabbitPeak.time : null,
      averagePeriod,
      rabbitMaximum: Math.max(...model.rabbits),
      foxMaximum: Math.max(...model.foxes),
      rabbitMinimum: Math.min(...model.rabbits),
      foxMinimum: Math.min(...model.foxes)
    };
  }

  function phaseAt(rabbits, foxes, input) {
    const { config } = normalizeConfig(input);
    const change = derivatives(rabbits, foxes, config);
    const rabbitDirection = change.rabbits >= 0 ? "증가" : "감소";
    const foxDirection = change.foxes >= 0 ? "증가" : "감소";
    let label = "전환 구간";
    if (change.rabbits >= 0 && change.foxes < 0) label = "토끼 회복 단계";
    if (change.rabbits >= 0 && change.foxes >= 0) label = "여우 추격 단계";
    if (change.rabbits < 0 && change.foxes >= 0) label = "토끼 감소 단계";
    if (change.rabbits < 0 && change.foxes < 0) label = "여우 감소 단계";
    return { label, rabbitDirection, foxDirection, change };
  }

  return {
    DEFAULTS,
    LIMITS,
    normalizeConfig,
    derivatives,
    rk4Step,
    eulerStep,
    equilibrium,
    simulate,
    localPeaks,
    summarize,
    phaseAt
  };
});
