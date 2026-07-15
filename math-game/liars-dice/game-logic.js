(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LiarsDiceLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function rollDice(count, random = Math.random) {
    return Array.from({ length: Math.max(0, Number(count) || 0) }, () =>
      Math.floor(clamp(random(), 0, 0.999999999) * 6) + 1
    );
  }

  function combination(n, k) {
    if (!Number.isInteger(n) || !Number.isInteger(k) || k < 0 || k > n) return 0;
    const shorter = Math.min(k, n - k);
    let result = 1;
    for (let i = 1; i <= shorter; i += 1) result = (result * (n - shorter + i)) / i;
    return result;
  }

  function binomialProbability(n, k, p) {
    if (k < 0 || k > n) return 0;
    if (p === 0) return k === 0 ? 1 : 0;
    if (p === 1) return k === n ? 1 : 0;
    return combination(n, k) * p ** k * (1 - p) ** (n - k);
  }

  function matchChance(face, wildOnes) {
    return wildOnes && Number(face) !== 1 ? 2 / 6 : 1 / 6;
  }

  function countMatches(dice, face, wildOnes) {
    const target = Number(face);
    return dice.reduce((count, die) => {
      const value = Number(die);
      return count + (value === target || (wildOnes && target !== 1 && value === 1) ? 1 : 0);
    }, 0);
  }

  function matchDistribution({ knownDice = [], unknownDice = 0, face = 1, wildOnes = false } = {}) {
    const knownMatches = countMatches(knownDice, face, wildOnes);
    const n = Math.max(0, Math.floor(Number(unknownDice) || 0));
    const p = matchChance(face, wildOnes);
    return Array.from({ length: n + 1 }, (_, hiddenMatches) => ({
      hiddenMatches,
      totalMatches: knownMatches + hiddenMatches,
      probability: binomialProbability(n, hiddenMatches, p),
    }));
  }

  function atLeastProbability(options = {}) {
    const needed = Math.max(0, Math.floor(Number(options.quantity) || 0));
    return matchDistribution(options).reduce(
      (sum, item) => sum + (item.totalMatches >= needed ? item.probability : 0),
      0
    );
  }

  function normalizeBid(bid) {
    if (!bid) return null;
    const quantity = Math.floor(Number(bid.quantity));
    const face = Math.floor(Number(bid.face));
    if (!Number.isFinite(quantity) || quantity < 1 || face < 1 || face > 6) return null;
    return { quantity, face };
  }

  function isHigherBid(candidate, currentBid) {
    const next = normalizeBid(candidate);
    const current = normalizeBid(currentBid);
    if (!next) return false;
    if (!current) return true;
    return next.quantity > current.quantity || (next.quantity === current.quantity && next.face > current.face);
  }

  function legalBids(currentBid, totalDice) {
    const total = Math.max(1, Math.floor(Number(totalDice) || 1));
    const bids = [];
    for (let quantity = 1; quantity <= total; quantity += 1) {
      for (let face = 1; face <= 6; face += 1) {
        const bid = { quantity, face };
        if (isHigherBid(bid, currentBid)) bids.push(bid);
      }
    }
    return bids;
  }

  function resolveChallenge({ bid, dice, wildOnes = false } = {}) {
    const cleanBid = normalizeBid(bid);
    if (!cleanBid) throw new Error("판정할 입찰이 필요합니다.");
    const flatDice = Array.isArray(dice?.[0]) ? dice.flat() : dice || [];
    const actual = countMatches(flatDice, cleanBid.face, wildOnes);
    return {
      actual,
      bidIsTrue: actual >= cleanBid.quantity,
      difference: actual - cleanBid.quantity,
    };
  }

  function nextActiveIndex(players, fromIndex) {
    if (!Array.isArray(players) || !players.some((player) => player.diceCount > 0)) return -1;
    for (let offset = 1; offset <= players.length; offset += 1) {
      const index = (fromIndex + offset) % players.length;
      if (players[index].diceCount > 0) return index;
    }
    return -1;
  }

  function bidProbability(bid, ownDice, totalDice, wildOnes) {
    return atLeastProbability({
      knownDice: ownDice,
      unknownDice: Math.max(0, totalDice - ownDice.length),
      quantity: bid.quantity,
      face: bid.face,
      wildOnes,
    });
  }

  function chooseAIAction({
    currentBid = null,
    ownDice = [],
    totalDice = ownDice.length,
    wildOnes = false,
    difficulty = "balanced",
    random = Math.random,
  } = {}) {
    const thresholds = { gentle: 0.2, balanced: 0.32, sharp: 0.42 };
    const challengeThreshold = thresholds[difficulty] ?? thresholds.balanced;
    const cleanCurrent = normalizeBid(currentBid);
    const currentProbability = cleanCurrent
      ? bidProbability(cleanCurrent, ownDice, totalDice, wildOnes)
      : 1;
    const available = legalBids(cleanCurrent, totalDice);

    if (cleanCurrent && (!available.length || currentProbability < challengeThreshold + (random() - 0.5) * 0.12)) {
      return { type: "challenge", probability: currentProbability };
    }

    const candidates = available.map((bid) => {
      const probability = bidProbability(bid, ownDice, totalDice, wildOnes);
      const jump = cleanCurrent ? bid.quantity - cleanCurrent.quantity : bid.quantity - 1;
      const ownSupport = countMatches(ownDice, bid.face, wildOnes) / Math.max(1, ownDice.length);
      const sameQuantityBonus = cleanCurrent && bid.quantity === cleanCurrent.quantity ? 0.035 : 0;
      const score = probability + ownSupport * 0.16 + sameQuantityBonus - jump * 0.055 + random() * 0.025;
      return { bid, probability, score };
    });

    candidates.sort((a, b) => b.score - a.score);
    const credible = candidates.filter((item) => item.probability >= Math.max(0.24, challengeThreshold - 0.06));
    let choice = credible[0] || candidates[0];

    if (cleanCurrent && random() < (difficulty === "sharp" ? 0.16 : 0.08)) {
      const bluffPool = candidates.filter((item) => item.bid.quantity <= cleanCurrent.quantity + 1).slice(0, 6);
      choice = bluffPool[Math.floor(random() * bluffPool.length)] || choice;
    }

    if (!choice) return { type: "challenge", probability: currentProbability };
    return { type: "bid", bid: choice.bid, probability: choice.probability };
  }

  function formatPercent(value, digits = 1) {
    const safe = clamp(Number(value) || 0, 0, 1);
    return `${(safe * 100).toFixed(digits)}%`;
  }

  return {
    atLeastProbability,
    bidProbability,
    binomialProbability,
    chooseAIAction,
    combination,
    countMatches,
    formatPercent,
    isHigherBid,
    legalBids,
    matchChance,
    matchDistribution,
    nextActiveIndex,
    normalizeBid,
    resolveChallenge,
    rollDice,
  };
});
