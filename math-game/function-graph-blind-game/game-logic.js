(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.FunctionGraphGame = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const EPSILON = 1e-7;
  const SUPERSCRIPTS = { 2: "²", 3: "³", 4: "⁴" };

  const BUILTIN_PROBLEMS = [
    { id: "easy-wave", title: "쉬움 A · 세 번 만나는 삼차함수", difficulty: "easy", coefficients: [1, 0, -3, 0], xRange: [-3.2, 3.2] },
    { id: "easy-turn", title: "쉬움 B · 방향이 반대인 삼차함수", difficulty: "easy", coefficients: [-1, 0, 3, 2], xRange: [-3.2, 3.2] },
    { id: "easy-shift", title: "쉬움 C · 한 번만 만나는 삼차함수", difficulty: "easy", coefficients: [1, 0, 3, -1], xRange: [-3, 3] },
    { id: "normal-w", title: "보통 A · 네 번 만나는 사차함수", difficulty: "normal", coefficients: [1, 0, -5, 0, 4], xRange: [-3.2, 3.2] },
    { id: "normal-cap", title: "보통 B · 접점을 가진 사차함수", difficulty: "normal", coefficients: [-1, 0, 4, 0, 0], xRange: [-3.2, 3.2] },
    { id: "normal-cubic", title: "보통 C · 비대칭 삼차함수", difficulty: "normal", coefficients: [2, -3, -12, 5], xRange: [-3.5, 4] },
    { id: "hard-stationary", title: "도전 A · 중근 임계점을 가진 함수", difficulty: "hard", coefficients: [1, -4, 0, 0, 0], xRange: [-2.2, 5] },
    { id: "hard-double", title: "도전 B · 두 접점을 가진 사차함수", difficulty: "hard", coefficients: [1, 0, -2, 0, 1], xRange: [-2.5, 2.5] },
    { id: "hard-asymmetric", title: "도전 C · 비대칭 사차함수", difficulty: "hard", coefficients: [-1, 4, 0, -8, 1], xRange: [-2.5, 5] }
  ];

  function clean(value) {
    return Math.abs(value) < EPSILON ? 0 : value;
  }

  function normalizeCoefficients(coefficients) {
    if (!Array.isArray(coefficients)) return [0];
    const values = coefficients.map(Number);
    while (values.length > 1 && Math.abs(values[0]) < EPSILON) values.shift();
    return values.length ? values.map(clean) : [0];
  }

  function evaluatePolynomial(coefficients, x) {
    return normalizeCoefficients(coefficients).reduce((value, coefficient) => value * x + coefficient, 0);
  }

  function derivative(coefficients) {
    const normalized = normalizeCoefficients(coefficients);
    const degree = normalized.length - 1;
    if (degree <= 0) return [0];
    return normalized.slice(0, -1).map((coefficient, index) => clean(coefficient * (degree - index)));
  }

  function uniqueSorted(values, epsilon = 1e-5) {
    const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
    return sorted.filter((value, index) => index === 0 || Math.abs(value - sorted[index - 1]) > epsilon).map(clean);
  }

  function realRootsLowDegree(coefficients) {
    const values = normalizeCoefficients(coefficients);
    const degree = values.length - 1;
    if (degree <= 0) return [];
    if (degree === 1) return [clean(-values[1] / values[0])];
    if (degree === 2) {
      const [a, b, c] = values;
      const discriminant = b * b - 4 * a * c;
      if (discriminant < -EPSILON) return [];
      if (Math.abs(discriminant) <= EPSILON) return [clean(-b / (2 * a))];
      const root = Math.sqrt(discriminant);
      return uniqueSorted([(-b - root) / (2 * a), (-b + root) / (2 * a)]);
    }
    if (degree !== 3) throw new Error("3차 이하 다항식만 직접 해석할 수 있습니다.");

    const [a, b, c, d] = values;
    const p = (3 * a * c - b * b) / (3 * a * a);
    const q = (2 * b * b * b - 9 * a * b * c + 27 * a * a * d) / (27 * a * a * a);
    const discriminant = (q * q) / 4 + (p * p * p) / 27;
    const offset = -b / (3 * a);

    if (discriminant > EPSILON) {
      const sqrt = Math.sqrt(discriminant);
      return [clean(Math.cbrt(-q / 2 + sqrt) + Math.cbrt(-q / 2 - sqrt) + offset)];
    }
    if (Math.abs(discriminant) <= EPSILON) {
      const u = Math.cbrt(-q / 2);
      return uniqueSorted([2 * u + offset, -u + offset]);
    }
    const radius = 2 * Math.sqrt(-p / 3);
    const angle = Math.acos((3 * q / (2 * p)) * Math.sqrt(-3 / p));
    return uniqueSorted([0, 1, 2].map((k) => radius * Math.cos((angle + 2 * Math.PI * k) / 3) + offset));
  }

  function bisectRoot(coefficients, left, right) {
    let low = left;
    let high = right;
    let lowValue = evaluatePolynomial(coefficients, low);
    for (let step = 0; step < 90; step += 1) {
      const middle = (low + high) / 2;
      const middleValue = evaluatePolynomial(coefficients, middle);
      if (Math.abs(middleValue) < 1e-10) return clean(middle);
      if (lowValue * middleValue <= 0) high = middle;
      else {
        low = middle;
        lowValue = middleValue;
      }
    }
    return clean((low + high) / 2);
  }

  function realPolynomialRoots(coefficients) {
    const values = normalizeCoefficients(coefficients);
    const degree = values.length - 1;
    if (degree <= 3) return realRootsLowDegree(values);
    if (degree > 4) throw new Error("현재 문제는 4차 다항함수까지 지원합니다.");

    const derivativeRoots = realRootsLowDegree(derivative(values));
    const bound = 1 + Math.max(...values.slice(1).map((value) => Math.abs(value / values[0])));
    const points = [-bound, ...derivativeRoots.filter((root) => root > -bound && root < bound), bound];
    const roots = [];

    points.forEach((point) => {
      if (Math.abs(evaluatePolynomial(values, point)) < 1e-6) roots.push(point);
    });
    for (let index = 0; index < points.length - 1; index += 1) {
      const left = points[index];
      const right = points[index + 1];
      const leftValue = evaluatePolynomial(values, left);
      const rightValue = evaluatePolynomial(values, right);
      if (leftValue * rightValue < 0) roots.push(bisectRoot(values, left, right));
    }
    return uniqueSorted(roots);
  }

  function formatNumber(value) {
    if (!Number.isFinite(value)) return "?";
    if (Math.abs(value - Math.round(value)) < 1e-6) return String(Math.round(value));
    return String(Number(value.toFixed(2)));
  }

  function formatPolynomial(coefficients, prefix = "f(x) = ") {
    const values = normalizeCoefficients(coefficients);
    const degree = values.length - 1;
    const terms = [];
    values.forEach((coefficient, index) => {
      if (Math.abs(coefficient) < EPSILON) return;
      const exponent = degree - index;
      const absolute = Math.abs(coefficient);
      let body = "";
      if (exponent === 0) body = formatNumber(absolute);
      else {
        const coefficientText = Math.abs(absolute - 1) < EPSILON ? "" : formatNumber(absolute);
        body = `${coefficientText}x${exponent > 1 ? SUPERSCRIPTS[exponent] || `^${exponent}` : ""}`;
      }
      const sign = coefficient < 0 ? "−" : "+";
      terms.push({ sign, body });
    });
    if (!terms.length) return `${prefix}0`;
    const expression = terms.map((term, index) => `${index === 0 && term.sign === "+" ? "" : `${term.sign} `}${term.body}`).join(" ");
    return `${prefix}${expression}`;
  }

  function intervalLabel(left, right) {
    const leftText = Number.isFinite(left) ? formatNumber(left) : "−∞";
    const rightText = Number.isFinite(right) ? formatNumber(right) : "∞";
    return `(${leftText}, ${rightText})`;
  }

  function signIntervals(coefficients) {
    const roots = realRootsLowDegree(coefficients);
    const boundaries = [-Infinity, ...roots, Infinity];
    return boundaries.slice(0, -1).map((left, index) => {
      const right = boundaries[index + 1];
      let sample;
      if (!Number.isFinite(left) && !Number.isFinite(right)) sample = 0;
      else if (!Number.isFinite(left)) sample = right - Math.max(1, Math.abs(right) + 1);
      else if (!Number.isFinite(right)) sample = left + Math.max(1, Math.abs(left) + 1);
      else sample = (left + right) / 2;
      const value = evaluatePolynomial(coefficients, sample);
      return { left, right, sign: value > EPSILON ? 1 : value < -EPSILON ? -1 : 0 };
    });
  }

  function analyzePolynomial(coefficients) {
    const values = normalizeCoefficients(coefficients);
    const first = derivative(values);
    const second = derivative(first);
    const criticalRoots = realRootsLowDegree(first);
    const secondRoots = realRootsLowDegree(second);
    const extrema = criticalRoots.map((x, index) => {
      const previous = index === 0 ? x - Math.max(1, Math.abs(x) + 1) : (criticalRoots[index - 1] + x) / 2;
      const next = index === criticalRoots.length - 1 ? x + Math.max(1, Math.abs(x) + 1) : (x + criticalRoots[index + 1]) / 2;
      const leftSign = Math.sign(evaluatePolynomial(first, previous));
      const rightSign = Math.sign(evaluatePolynomial(first, next));
      let type = "stationary";
      if (leftSign > 0 && rightSign < 0) type = "max";
      if (leftSign < 0 && rightSign > 0) type = "min";
      return { x, y: evaluatePolynomial(values, x), type, repeated: Math.abs(evaluatePolynomial(second, x)) < 1e-5 };
    });
    const xRoots = realPolynomialRoots(values);
    return {
      coefficients: values,
      degree: values.length - 1,
      first,
      second,
      criticalRoots,
      secondRoots,
      extrema,
      xRoots,
      yIntercept: values[values.length - 1]
    };
  }

  function firstSignedInterval(coefficients) {
    const intervals = signIntervals(coefficients);
    return intervals.find((interval) => interval.sign > 0) || intervals.find((interval) => interval.sign < 0) || intervals[0];
  }

  function endBehavior(degree, leading, side) {
    const isEven = degree % 2 === 0;
    const positiveInfinity = leading > 0;
    let goesUp;
    if (side === "right") goesUp = positiveInfinity;
    else goesUp = isEven ? positiveInfinity : !positiveInfinity;
    return `x → ${side === "right" ? "∞" : "−∞"}일 때 f(x) → ${goesUp ? "∞" : "−∞"}입니다.`;
  }

  function getHintCatalogue(problem) {
    const analysis = analyzePolynomial(problem.coefficients);
    const firstInterval = firstSignedInterval(analysis.first);
    const secondInterval = firstSignedInterval(analysis.second);
    const localExtrema = analysis.extrema.filter((point) => point.type !== "stationary");
    const maximums = localExtrema.filter((point) => point.type === "max");
    const minimums = localExtrema.filter((point) => point.type === "min");
    const repeated = analysis.extrema.filter((point) => point.repeated);
    const chosenExtreme = maximums[0] || minimums[0];
    const limitAt = 1;
    const hint = (id, short, prompt, answer) => ({ id, short, prompt, answer });

    return [
      hint(1, "극값 개수", "극대·극소는 모두 몇 개인가요?", `극대 ${maximums.length}개, 극소 ${minimums.length}개로 극값은 모두 ${localExtrema.length}개입니다.`),
      hint(2, "도함수 부호", "증가·감소를 알 수 있는 구간 하나를 알려 주세요.", `도함수는 ${intervalLabel(firstInterval.left, firstInterval.right)}에서 ${firstInterval.sign > 0 ? "양수" : "음수"}입니다.`),
      hint(3, "최고차항 부호", "최고차항 계수의 부호는 무엇인가요?", `최고차항의 계수는 ${analysis.coefficients[0] > 0 ? "양수" : "음수"}입니다.`),
      hint(4, "왼쪽 끝", "x가 음의 무한대로 갈 때는 어떻게 되나요?", endBehavior(analysis.degree, analysis.coefficients[0], "left")),
      hint(5, "오른쪽 끝", "x가 양의 무한대로 갈 때는 어떻게 되나요?", endBehavior(analysis.degree, analysis.coefficients[0], "right")),
      hint(6, "도함수 차수", "도함수는 몇 차 다항함수인가요?", `도함수는 ${analysis.first.length - 1}차 다항함수입니다.`),
      hint(7, "임계점 하나", "도함수가 0이 되는 x값 하나를 알려 주세요.", analysis.criticalRoots.length ? `도함수가 0이 되는 값 중 하나는 x = ${formatNumber(analysis.criticalRoots[0])}입니다.` : "도함수가 0이 되는 실수는 없습니다."),
      hint(8, "이계도함수 차수", "이계도함수는 몇 차 다항함수인가요?", `이계도함수는 ${Math.max(0, analysis.second.length - 1)}차 다항함수입니다.`),
      hint(9, "변곡 후보", "이계도함수가 0이 되는 x값 하나를 알려 주세요.", analysis.secondRoots.length ? `이계도함수가 0이 되는 값 중 하나는 x = ${formatNumber(analysis.secondRoots[0])}입니다.` : "이계도함수가 0이 되는 실수는 없습니다."),
      hint(10, "중근 임계점", "도함수의 실근 중 중근이 있나요?", repeated.length ? `있습니다. x = ${repeated.map((point) => formatNumber(point.x)).join(", ")}은(는) 도함수의 중근입니다.` : "도함수의 실근 중 중근은 없습니다."),
      hint(11, "상수항", "함수의 상수항은 얼마인가요?", `상수항은 ${formatNumber(analysis.yIntercept)}입니다.`),
      hint(12, "도함수 최고차항", "도함수의 최고차항 계수는 얼마인가요?", `도함수의 최고차항 계수는 ${formatNumber(analysis.first[0])}입니다.`),
      hint(13, "오목·볼록", "이계도함수의 부호를 알 수 있는 구간 하나를 알려 주세요.", `이계도함수는 ${intervalLabel(secondInterval.left, secondInterval.right)}에서 ${secondInterval.sign > 0 ? "양수" : "음수"}입니다.`),
      hint(14, "x축 교점 수", "그래프는 x축과 몇 번 만나나요?", `서로 다른 x축과의 교점은 ${analysis.xRoots.length}개입니다.`),
      hint(15, "절편", "y절편을 알려 주세요.", `y절편은 (0, ${formatNumber(analysis.yIntercept)})입니다.`),
      hint(16, "한쪽 극한", "특정 점에서 한쪽 극한을 하나 알려 주세요.", `x → ${limitAt}−일 때 f(x) → ${formatNumber(evaluatePolynomial(analysis.coefficients, limitAt))}입니다.`),
      hint(17, "극값 하나", "극댓값 또는 극솟값 하나를 알려 주세요.", chosenExtreme ? `x = ${formatNumber(chosenExtreme.x)}에서 극${chosenExtreme.type === "max" ? "댓값" : "솟값"} ${formatNumber(chosenExtreme.y)}을 갖습니다.` : "극댓값과 극솟값이 없습니다.")
    ];
  }

  function coefficientsEqual(left, right) {
    const a = normalizeCoefficients(left);
    const b = normalizeCoefficients(right);
    return a.length === b.length && a.every((value, index) => Math.abs(value - b[index]) < EPSILON);
  }

  function hashText(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function seededShuffle(items, seedText) {
    let seed = hashText(seedText) || 1;
    const values = items.slice();
    for (let index = values.length - 1; index > 0; index -= 1) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const target = seed % (index + 1);
      [values[index], values[target]] = [values[target], values[index]];
    }
    return values;
  }

  function makeCandidates(problem) {
    const base = normalizeCoefficients(problem.coefficients);
    const degree = base.length - 1;
    const verticalFlip = base.map((value) => -value);
    const horizontalFlip = base.map((value, index) => value * ((degree - index) % 2 === 0 ? 1 : -1));
    const shiftAmount = Math.max(2, Math.round(Math.max(...base.map(Math.abs)) / 3));
    const verticalShift = base.map((value, index) => index === base.length - 1 ? value + shiftAmount : value);
    const fallback = base.map((value, index) => index === base.length - 1 ? value - shiftAmount : value);
    const variants = [
      { id: "answer", coefficients: base, isAnswer: true },
      { id: "vertical-flip", coefficients: verticalFlip, isAnswer: false },
      { id: "horizontal-flip", coefficients: horizontalFlip, isAnswer: false },
      { id: "vertical-shift", coefficients: verticalShift, isAnswer: false }
    ];
    if (coefficientsEqual(horizontalFlip, base) || coefficientsEqual(horizontalFlip, verticalFlip)) variants[2].coefficients = fallback;
    const unique = [];
    variants.forEach((variant) => {
      if (!unique.some((item) => coefficientsEqual(item.coefficients, variant.coefficients))) unique.push(variant);
    });
    while (unique.length < 4) {
      const offset = (unique.length + 1) * shiftAmount;
      unique.push({ id: `offset-${unique.length}`, coefficients: base.map((value, index) => index === base.length - 1 ? value + offset : value), isAnswer: false });
    }
    return seededShuffle(unique.slice(0, 4), problem.id).map((candidate, index) => ({ ...candidate, label: String.fromCharCode(65 + index) }));
  }

  function getGraphBounds(problem, coefficientSets) {
    const xMin = Number(problem.xRange?.[0] ?? -4);
    const xMax = Number(problem.xRange?.[1] ?? 4);
    const samples = [];
    coefficientSets.forEach((coefficients) => {
      for (let index = 0; index <= 240; index += 1) {
        const x = xMin + ((xMax - xMin) * index) / 240;
        const y = evaluatePolynomial(coefficients, x);
        if (Number.isFinite(y)) samples.push(y);
      }
    });
    const sorted = samples.sort((a, b) => a - b);
    const low = sorted[Math.floor(sorted.length * 0.03)] ?? -5;
    const high = sorted[Math.floor(sorted.length * 0.97)] ?? 5;
    const span = Math.max(2, high - low);
    return { xMin, xMax, yMin: low - span * 0.12, yMax: high + span * 0.12 };
  }

  function describeGraph(coefficients) {
    const analysis = analyzePolynomial(coefficients);
    const extremaCount = analysis.extrema.filter((point) => point.type !== "stationary").length;
    const leadingDirection = analysis.coefficients[0] > 0 ? "최고차항 계수 양수" : "최고차항 계수 음수";
    return `${analysis.degree}차 함수, ${leadingDirection}, 극값 ${extremaCount}개, x축 교점 ${analysis.xRoots.length}개`;
  }

  function getHintTier(hintCount) {
    if (hintCount <= 4) return { key: "high", label: "상", description: "핵심 정보를 선별했습니다." };
    if (hintCount <= 6) return { key: "middle", label: "중", description: "필요한 정보를 적절히 모았습니다." };
    return { key: "low", label: "하", description: "다음에는 먼저 필요한 정보를 계획해 보세요." };
  }

  function calculateRoundScore({ correct, hintCount, elapsedSeconds, timeLimitSeconds }) {
    const tier = getHintTier(hintCount);
    if (!correct) return { score: 0, tier };
    const tierBonus = tier.key === "high" ? 20 : tier.key === "middle" ? 10 : 0;
    const extraHintPenalty = Math.max(0, hintCount - 4) * 7;
    const timeRatio = timeLimitSeconds > 0 ? elapsedSeconds / timeLimitSeconds : 0;
    const timePenalty = Math.min(12, Math.max(0, Math.floor(timeRatio * 10)));
    return { score: Math.max(30, 100 + tierBonus - extraHintPenalty - timePenalty), tier };
  }

  function validateProblem(problem) {
    const coefficients = normalizeCoefficients(problem?.coefficients || []);
    if (!problem || typeof problem.title !== "string" || !problem.title.trim()) return { valid: false, message: "문제 이름을 입력해 주세요." };
    if (coefficients.some((value) => !Number.isFinite(value))) return { valid: false, message: "계수는 유한한 숫자여야 합니다." };
    const degree = coefficients.length - 1;
    if (degree < 2 || degree > 4) return { valid: false, message: "2차부터 4차까지의 다항함수를 입력해 주세요." };
    if (Math.abs(coefficients[0]) < EPSILON) return { valid: false, message: "최고차항 계수는 0이 될 수 없습니다." };
    const range = problem.xRange || [-4, 4];
    if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isFinite) || range[0] >= range[1]) return { valid: false, message: "x축 범위를 올바르게 입력해 주세요." };
    return { valid: true, problem: { ...problem, title: problem.title.trim(), coefficients, xRange: range.map(Number), difficulty: ["easy", "normal", "hard"].includes(problem.difficulty) ? problem.difficulty : "normal" } };
  }

  return {
    BUILTIN_PROBLEMS,
    EPSILON,
    normalizeCoefficients,
    evaluatePolynomial,
    derivative,
    realRootsLowDegree,
    realPolynomialRoots,
    analyzePolynomial,
    formatNumber,
    formatPolynomial,
    getHintCatalogue,
    makeCandidates,
    getGraphBounds,
    describeGraph,
    getHintTier,
    calculateRoundScore,
    validateProblem
  };
});
