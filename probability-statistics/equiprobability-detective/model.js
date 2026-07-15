(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.EquiprobabilityModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MISSION_IDS = ["coin", "dice", "necklace", "bertrand", "two-stage"];

  function clampInteger(value, min, max, fallback = min) {
    const parsed = Math.round(Number(value));
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
  }

  function gcd(a, b) {
    let x = Math.abs(Math.round(a));
    let y = Math.abs(Math.round(b));
    while (y) [x, y] = [y, x % y];
    return x || 1;
  }

  function fraction(numerator, denominator) {
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
      return { numerator: 0, denominator: 0, value: 0, text: "정의되지 않음" };
    }
    const divisor = gcd(numerator, denominator);
    const top = Math.round(numerator / divisor);
    const bottom = Math.round(denominator / divisor);
    return {
      numerator: top,
      denominator: bottom,
      value: top / bottom,
      text: bottom === 1 ? String(top) : `${top}/${bottom}`,
    };
  }

  function mulberry32(seed) {
    let state = clampInteger(seed, 1, 2147483646, 2026) >>> 0;
    return function random() {
      state += 0x6D2B79F5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function safeWeights(values, expectedLength, fallback) {
    const weights = Array.from({ length: expectedLength }, (_, index) =>
      clampInteger(values?.[index], 0, 20, fallback[index])
    );
    return weights.some((value) => value > 0) ? weights : [...fallback];
  }

  function weightedIndex(random, weights) {
    const total = weights.reduce((sum, value) => sum + value, 0);
    let cursor = random() * total;
    for (let index = 0; index < weights.length; index += 1) {
      cursor -= weights[index];
      if (cursor < 0) return index;
    }
    return weights.length - 1;
  }

  function coinTheory() {
    const micro = ["HH", "HT", "TH", "TT"];
    const macro = [
      { key: "zero", label: "앞면 0개", count: 1, probability: fraction(1, 4) },
      { key: "one", label: "앞면 1개", count: 2, probability: fraction(2, 4) },
      { key: "two", label: "앞면 2개", count: 1, probability: fraction(1, 4) },
    ];
    return { micro, macro, target: macro[1].probability };
  }

  function diceTheory(pairWeights = [6, 3, 1]) {
    const pairs = safeWeights(pairWeights, 3, [6, 3, 1]);
    const faceWeights = [pairs[0], pairs[1], pairs[2], pairs[2], pairs[1], pairs[0]];
    const denominator = faceWeights.reduce((sum, value) => sum + value, 0);
    return {
      pairWeights: pairs,
      faceWeights,
      denominator,
      faces: faceWeights.map((weight, index) => ({
        face: index + 1,
        weight,
        probability: fraction(weight, denominator),
      })),
      target: fraction(faceWeights[0], denominator),
    };
  }

  function necklaceMicrostates() {
    const states = [];
    for (let first = 0; first < 4; first += 1) {
      for (let second = first + 1; second < 4; second += 1) {
        const beads = ["W", "W", "W", "W"];
        beads[first] = "B";
        beads[second] = "B";
        const value = beads.join("");
        const alternating = beads.every((bead, index) => bead !== beads[(index + 1) % 4]);
        states.push({ value, type: alternating ? "alternating" : "adjacent" });
      }
    }
    return states;
  }

  function necklaceTheory() {
    const micro = necklaceMicrostates();
    const adjacent = micro.filter((state) => state.type === "adjacent");
    const alternating = micro.filter((state) => state.type === "alternating");
    return {
      micro,
      groups: [
        { key: "adjacent", label: "같은 색이 이웃", states: adjacent, probability: fraction(adjacent.length, micro.length) },
        { key: "alternating", label: "두 색이 번갈아", states: alternating, probability: fraction(alternating.length, micro.length) },
      ],
      target: fraction(adjacent.length, micro.length),
    };
  }

  function bertrandTheory(goldsPerBox = [2, 0, 1]) {
    const boxes = Array.from({ length: 3 }, (_, index) => clampInteger(goldsPerBox[index], 0, 2, [2, 0, 1][index]));
    const observedGold = boxes.reduce((sum, golds) => sum + golds, 0);
    const partnerGold = boxes.reduce((sum, golds) => sum + (golds === 2 ? 2 : 0), 0);
    const evidence = [];
    boxes.forEach((golds, boxIndex) => {
      for (let coinIndex = 0; coinIndex < golds; coinIndex += 1) {
        evidence.push({
          box: boxIndex,
          observed: "G",
          partner: golds === 2 ? "G" : "S",
          key: `box-${boxIndex + 1}-gold-${coinIndex + 1}`,
        });
      }
    });
    return {
      boxes,
      evidence,
      possible: observedGold > 0,
      observedGold,
      partnerGold,
      target: fraction(partnerGold, observedGold),
    };
  }

  function sanitizeTwoStage(config = {}) {
    const fallbackBoxes = [{ black: 2, white: 1 }, { black: 3, white: 2 }];
    const boxes = [0, 1].map((index) => {
      const raw = config.boxes?.[index] || fallbackBoxes[index];
      let black = clampInteger(raw.black, 0, 12, fallbackBoxes[index].black);
      let white = clampInteger(raw.white, 0, 12, fallbackBoxes[index].white);
      if (black + white === 0) {
        black = fallbackBoxes[index].black;
        white = fallbackBoxes[index].white;
      }
      return { black, white, total: black + white };
    });
    return { boxes, boxWeights: safeWeights(config.boxWeights, 2, [1, 1]) };
  }

  function twoStageTheory(config = {}) {
    const clean = sanitizeTwoStage(config);
    const [boxA, boxB] = clean.boxes;
    const [weightA, weightB] = clean.boxWeights;
    const weightTotal = weightA + weightB;
    const rawNumerator = weightA * boxA.white * boxB.total + weightB * boxB.white * boxA.total;
    const rawDenominator = weightTotal * boxA.total * boxB.total;
    return {
      ...clean,
      branches: clean.boxes.map((box, index) => ({
        box: index,
        select: fraction(clean.boxWeights[index], weightTotal),
        whiteGivenBox: fraction(box.white, box.total),
        blackGivenBox: fraction(box.black, box.total),
        whitePath: fraction(clean.boxWeights[index] * box.white, weightTotal * box.total),
      })),
      naivePooled: fraction(boxA.white + boxB.white, boxA.total + boxB.total),
      target: fraction(rawNumerator, rawDenominator),
    };
  }

  function theoryForMission(id, configs = {}) {
    if (id === "coin") return coinTheory();
    if (id === "dice") return diceTheory(configs.diceWeights);
    if (id === "necklace") return necklaceTheory();
    if (id === "bertrand") return bertrandTheory(configs.bertrandGolds);
    if (id === "two-stage") return twoStageTheory(configs.twoStage);
    throw new Error(`알 수 없는 미션: ${id}`);
  }

  function simulateMission(id, configs = {}, trials = 1000, seed = 2026) {
    const amount = clampInteger(trials, 1, 200000, 1000);
    const random = mulberry32(seed);
    const counts = {};
    const bump = (key) => { counts[key] = (counts[key] || 0) + 1; };
    let evidenceCount = amount;

    if (id === "coin") {
      for (let index = 0; index < amount; index += 1) {
        const heads = Number(random() < 0.5) + Number(random() < 0.5);
        bump(["zero", "one", "two"][heads]);
      }
    } else if (id === "dice") {
      const theory = diceTheory(configs.diceWeights);
      for (let index = 0; index < amount; index += 1) bump(`face-${weightedIndex(random, theory.faceWeights) + 1}`);
    } else if (id === "necklace") {
      const micro = necklaceTheory().micro;
      for (let index = 0; index < amount; index += 1) bump(micro[Math.floor(random() * micro.length)].type);
    } else if (id === "bertrand") {
      const theory = bertrandTheory(configs.bertrandGolds);
      evidenceCount = 0;
      for (let index = 0; index < amount; index += 1) {
        const boxIndex = Math.floor(random() * 3);
        const observedGold = Math.floor(random() * 2) < theory.boxes[boxIndex];
        if (!observedGold) continue;
        evidenceCount += 1;
        bump(theory.boxes[boxIndex] === 2 ? "partner-gold" : "partner-silver");
      }
    } else if (id === "two-stage") {
      const theory = twoStageTheory(configs.twoStage);
      for (let index = 0; index < amount; index += 1) {
        const boxIndex = weightedIndex(random, theory.boxWeights);
        const box = theory.boxes[boxIndex];
        const white = random() < box.white / box.total;
        bump(white ? "white" : "black");
        bump(`box-${boxIndex}-${white ? "white" : "black"}`);
      }
    } else {
      throw new Error(`알 수 없는 미션: ${id}`);
    }

    return { id, trials: amount, evidenceCount, counts, seed: clampInteger(seed, 1, 2147483646, 2026) };
  }

  function defaultConfigs() {
    return {
      diceWeights: [6, 3, 1],
      bertrandGolds: [2, 0, 1],
      twoStage: {
        boxWeights: [1, 1],
        boxes: [{ black: 2, white: 1 }, { black: 3, white: 2 }],
      },
    };
  }

  function createDefaultSession() {
    return {
      version: 1,
      mode: "solo",
      activeMission: "coin",
      activeTeam: "A",
      score: 0,
      teamScores: { A: 0, B: 0 },
      records: {},
      configs: defaultConfigs(),
      simulations: {},
      seed: 2026,
    };
  }

  function sanitizeSession(raw) {
    const base = createDefaultSession();
    if (!raw || typeof raw !== "object") return base;
    const mode = ["solo", "team", "teacher"].includes(raw.mode) ? raw.mode : base.mode;
    const activeMission = MISSION_IDS.includes(raw.activeMission) ? raw.activeMission : base.activeMission;
    const configs = {
      diceWeights: diceTheory(raw.configs?.diceWeights).pairWeights,
      bertrandGolds: bertrandTheory(raw.configs?.bertrandGolds).boxes,
      twoStage: sanitizeTwoStage(raw.configs?.twoStage),
    };
    const records = {};
    MISSION_IDS.forEach((id) => {
      const record = raw.records?.[id];
      if (!record || typeof record !== "object") return;
      records[id] = {
        prediction: String(record.prediction || "").slice(0, 80),
        assumptionId: String(record.assumptionId || "").slice(0, 40),
        assumption: String(record.assumption || "").slice(0, 120),
        correct: Boolean(record.correct),
        points: clampInteger(record.points, 0, 20, 0),
        answer: String(record.answer || "").slice(0, 80),
        note: String(record.note || "").slice(0, 500),
        team: record.team === "A" || record.team === "B" ? record.team : "",
      };
    });
    return {
      ...base,
      mode,
      activeMission,
      activeTeam: raw.activeTeam === "B" ? "B" : "A",
      score: clampInteger(raw.score, 0, 100, 0),
      teamScores: {
        A: clampInteger(raw.teamScores?.A, 0, 500, 0),
        B: clampInteger(raw.teamScores?.B, 0, 500, 0),
      },
      records,
      configs,
      seed: clampInteger(raw.seed, 1, 2147483646, 2026),
    };
  }

  return {
    MISSION_IDS,
    bertrandTheory,
    coinTheory,
    createDefaultSession,
    diceTheory,
    fraction,
    mulberry32,
    necklaceTheory,
    sanitizeSession,
    sanitizeTwoStage,
    simulateMission,
    theoryForMission,
    twoStageTheory,
  };
});
