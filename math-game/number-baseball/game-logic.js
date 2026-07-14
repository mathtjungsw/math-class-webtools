(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.NumberBaseballLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function generateCandidates(length) {
    const results = [];

    function build(prefix, used) {
      if (prefix.length === length) {
        results.push(prefix);
        return;
      }

      for (let digit = 0; digit <= 9; digit += 1) {
        if (prefix.length === 0 && digit === 0) continue;
        if (used.has(digit)) continue;
        used.add(digit);
        build(prefix + digit, used);
        used.delete(digit);
      }
    }

    build("", new Set());
    return results;
  }

  function score(secret, guess) {
    let strikes = 0;
    let shared = 0;

    for (let index = 0; index < secret.length; index += 1) {
      if (secret[index] === guess[index]) strikes += 1;
      if (secret.includes(guess[index])) shared += 1;
    }

    return { strikes, balls: shared - strikes };
  }

  function resultKey(result) {
    return `${result.strikes}:${result.balls}`;
  }

  function filterCandidates(candidates, history) {
    return candidates.filter((candidate) => history.every((turn) => {
      const result = score(candidate, turn.guess);
      return result.strikes === turn.strikes && result.balls === turn.balls;
    }));
  }

  function analyzeGuess(guess, candidates) {
    const distribution = new Map();

    candidates.forEach((candidate) => {
      const result = score(candidate, guess);
      const key = resultKey(result);
      const previous = distribution.get(key) || { ...result, count: 0 };
      previous.count += 1;
      distribution.set(key, previous);
    });

    const total = candidates.length;
    const outcomes = [...distribution.values()]
      .map((outcome) => ({ ...outcome, probability: total ? outcome.count / total : 0 }))
      .sort((a, b) => b.count - a.count || b.strikes - a.strikes || b.balls - a.balls);

    const expectedRemaining = total
      ? outcomes.reduce((sum, outcome) => sum + (outcome.count * outcome.count), 0) / total
      : 0;
    const entropy = outcomes.reduce((sum, outcome) => {
      if (!outcome.probability) return sum;
      return sum - outcome.probability * Math.log2(outcome.probability);
    }, 0);

    return {
      outcomes,
      mostLikely: outcomes[0] || null,
      expectedRemaining,
      entropy,
      exactProbability: total && candidates.includes(guess) ? 1 / total : 0,
      possibleAnswer: candidates.includes(guess),
    };
  }

  function recommendGuess(candidates, sampleLimit = 180) {
    if (!candidates.length) return null;
    if (candidates.length === 1) return candidates[0];

    const step = Math.max(1, Math.floor(candidates.length / sampleLimit));
    const pool = candidates.filter((_, index) => index % step === 0).slice(0, sampleLimit);
    let best = null;
    let bestExpected = Number.POSITIVE_INFINITY;
    let bestEntropy = -1;

    pool.forEach((guess) => {
      const analysis = analyzeGuess(guess, candidates);
      if (
        analysis.expectedRemaining < bestExpected - 0.0001 ||
        (Math.abs(analysis.expectedRemaining - bestExpected) < 0.0001 && analysis.entropy > bestEntropy)
      ) {
        best = guess;
        bestExpected = analysis.expectedRemaining;
        bestEntropy = analysis.entropy;
      }
    });

    return best;
  }

  function initialCount(length) {
    let count = 9;
    for (let slots = 1; slots < length; slots += 1) count *= 10 - slots;
    return count;
  }

  return {
    generateCandidates,
    score,
    filterCandidates,
    analyzeGuess,
    recommendGuess,
    initialCount,
  };
});
