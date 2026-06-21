(function exposePigVariantEngine(globalObject) {
  const rules = {
    one: {
      name: "주사위 1개 · 1이면 실패",
      dice: 1,
      description: "주사위 한 개에서 1이 나오면 이번 턴 점수를 잃습니다.",
      isBust: (rolls) => rolls[0] === 1,
    },
    "two-one": {
      name: "주사위 2개 · 하나라도 1이면 실패",
      dice: 2,
      description: "주사위 두 개 중 하나라도 1이면 실패합니다. 두 주사위가 모두 1이 아닐 때만 안전합니다.",
      isBust: (rolls) => rolls.includes(1),
    },
    "two-one-double": {
      name: "주사위 2개 · 1이면 실패, 같은 눈은 점수 2배",
      dice: 2,
      description: "실패 확률은 ‘하나라도 1’ 규칙과 같지만, 같은 눈이면 얻는 점수가 두 배가 됩니다.",
      isBust: (rolls) => rolls.includes(1),
    },
    "two-six": {
      name: "주사위 2개 · 하나라도 6이면 실패",
      dice: 2,
      description: "주사위 두 개 중 하나라도 6이면 실패합니다. 눈의 이름만 바뀌어 실패 확률은 ‘1’ 규칙과 같습니다.",
      isBust: (rolls) => rolls.includes(6),
    },
    "two-double": {
      name: "주사위 2개 · 같은 눈이면 실패",
      dice: 2,
      description: "두 주사위의 눈이 같으면 실패합니다. 36가지 중 (1,1)부터 (6,6)까지 6가지입니다.",
      isBust: (rolls) => rolls[0] === rolls[1],
    },
    "n-one": {
      name: "주사위 n개 · 하나라도 1이면 실패",
      dice: 3,
      description: "n개의 주사위 중 하나라도 1이면 실패합니다. 모두 1이 아닐 확률을 먼저 구해 여사건을 이용합니다.",
      isBust: (rolls) => rolls.includes(1),
    },
  };

  function greatestCommonDivisor(a, b) {
    let x = a;
    let y = b;
    while (y) [x, y] = [y, x % y];
    return x;
  }

  function fractionText(numerator, denominator) {
    const divisor = greatestCommonDivisor(numerator, denominator);
    return `${numerator / divisor}/${denominator / divisor}`;
  }

  function getDetails(key, nDice = 3) {
    const resolvedKey = rules[key] ? key : "one";
    const base = rules[resolvedKey];
    const dice = resolvedKey === "n-one" ? Math.min(6, Math.max(1, Number(nDice) || 3)) : base.dice;
    let denominator = 6 ** dice;
    let safeOutcomes;

    if (resolvedKey === "two-double") {
      safeOutcomes = 30;
      denominator = 36;
    } else {
      safeOutcomes = 5 ** dice;
    }

    return {
      key: resolvedKey,
      name: resolvedKey === "n-one" ? `주사위 ${dice}개 · 하나라도 1이면 실패` : base.name,
      dice,
      denominator,
      safeOutcomes,
      bustOutcomes: denominator - safeOutcomes,
      description: base.description,
      isBust: base.isBust,
    };
  }

  function evaluateRoll(details, rolls) {
    const bust = details.isBust(rolls);
    const bonus = !bust && details.key === "two-one-double" && rolls[0] === rolls[1];
    const basePoints = rolls.reduce((sum, value) => sum + value, 0);
    return { bust, bonus, points: bust ? 0 : basePoints * (bonus ? 2 : 1) };
  }

  const engine = Object.freeze({ rules, fractionText, getDetails, evaluateRoll });
  globalObject.PigVariantEngine = engine;
  if (typeof module !== "undefined" && module.exports) module.exports = engine;
})(globalThis);
