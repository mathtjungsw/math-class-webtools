(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.RhythmMath = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const EPSILON = 1e-9;

  function mod(value, divisor) {
    return ((value % divisor) + divisor) % divisor;
  }

  function gcd(a, b) {
    let x = Math.abs(Math.trunc(a));
    let y = Math.abs(Math.trunc(b));
    while (y) [x, y] = [y, x % y];
    return x;
  }

  function lcm(a, b) {
    const x = Math.abs(Math.trunc(a));
    const y = Math.abs(Math.trunc(b));
    return x && y ? (x / gcd(x, y)) * y : 0;
  }

  function lcmMany(values) {
    return values.reduce((result, value) => lcm(result, value), 1);
  }

  function primeFactors(value) {
    let n = Math.abs(Math.trunc(value));
    const factors = [];
    for (let p = 2; p * p <= n; p += p === 2 ? 1 : 2) {
      let exponent = 0;
      while (n % p === 0) {
        n /= p;
        exponent += 1;
      }
      if (exponent) factors.push([p, exponent]);
    }
    if (n > 1) factors.push([n, 1]);
    return factors;
  }

  function formatFactors(value) {
    const factors = primeFactors(value);
    return factors.length
      ? factors.map(([p, e]) => (e === 1 ? String(p) : `${p}<sup>${e}</sup>`)).join(" × ")
      : String(value);
  }

  function normalizePhase(phase) {
    return mod(Number(phase) || 0, 1);
  }

  function hitFractions(layer, audibleOnly) {
    const n = Math.max(1, Math.trunc(layer.divisions));
    const phase = normalizePhase(layer.phase);
    const steps = Array.isArray(layer.steps) ? layer.steps : [];
    const hits = [];
    for (let step = 0; step < n; step += 1) {
      if (audibleOnly && steps.length && steps[step] && steps[step].enabled === false) continue;
      const stepData = steps[step] || {};
      hits.push({
        step,
        fraction: normalizePhase(phase + step / n),
        accent: stepData.accent ? 1 : 0,
        rest: stepData.enabled === false
      });
    }
    return hits.sort((a, b) => a.fraction - b.fraction || a.step - b.step);
  }

  function commonHitInfo(a, b) {
    const n = Math.max(1, Math.trunc(a.divisions));
    const m = Math.max(1, Math.trunc(b.divisions));
    const grid = lcm(n, m);
    const commonCount = gcd(n, m);
    const phaseA = normalizePhase(a.phase);
    const phaseB = normalizePhase(b.phase);
    const rawShift = mod(phaseB - phaseA, 1);
    const gridShift = rawShift * grid;
    const compatible = Math.abs(gridShift - Math.round(gridShift)) < EPSILON;
    const positions = [];

    if (compatible) {
      const hitsA = hitFractions({ divisions: n, phase: phaseA }, false);
      const hitsB = hitFractions({ divisions: m, phase: phaseB }, false);
      for (const hitA of hitsA) {
        if (hitsB.some((hitB) => Math.abs(mod(hitA.fraction - hitB.fraction + 0.5, 1) - 0.5) < EPSILON)) {
          positions.push(hitA.fraction);
        }
      }
    }

    return {
      n,
      m,
      gcd: commonCount,
      lcm: grid,
      compatible,
      phaseDifference: rawShift,
      gridShift,
      positions: positions.sort((x, y) => x - y),
      commonCount: compatible ? commonCount : 0,
      patternShift: 1 / commonCount,
      fullGeometryReturn: 1
    };
  }

  function scheduleBetween(layers, startPosition, endPosition, audibleOnly = true) {
    if (!(endPosition > startPosition)) return [];
    const events = [];
    layers.forEach((layer, layerIndex) => {
      if (layer.enabled === false) return;
      const fractions = hitFractions(layer, audibleOnly);
      const firstCycle = Math.floor(startPosition) - 1;
      const lastCycle = Math.floor(endPosition) + 1;
      for (let cycle = firstCycle; cycle <= lastCycle; cycle += 1) {
        for (const hit of fractions) {
          const position = cycle + hit.fraction;
          if (position > startPosition + EPSILON && position <= endPosition + EPSILON) {
            events.push({
              id: `${layer.id || layerIndex}:${cycle}:${hit.step}`,
              layerIndex,
              layerId: layer.id || String(layerIndex),
              step: hit.step,
              accent: hit.accent,
              position,
              fraction: hit.fraction
            });
          }
        }
      }
    });
    return events.sort((a, b) => a.position - b.position || a.layerIndex - b.layerIndex);
  }

  function groupCoincidences(events, tolerance = EPSILON) {
    const groups = [];
    for (const event of events) {
      const last = groups[groups.length - 1];
      if (last && Math.abs(last.position - event.position) <= tolerance) last.events.push(event);
      else groups.push({ position: event.position, events: [event] });
    }
    return groups;
  }

  function minimalLayerPatternShift(layer) {
    const n = Math.max(1, Math.trunc(layer.divisions));
    const steps = Array.from({ length: n }, (_, index) => {
      const step = layer.steps?.[index] || { enabled: true, accent: false };
      return step.enabled === false ? 0 : step.accent ? 2 : 1;
    });
    for (let shift = 1; shift <= n; shift += 1) {
      if (steps.every((value, index) => value === steps[(index + shift) % n])) {
        const divisor = gcd(shift, n);
        return { numerator: shift / divisor, denominator: n / divisor, value: shift / n, stepShift: shift };
      }
    }
    return { numerator: 1, denominator: 1, value: 1, stepShift: n };
  }

  function patternRepeatInfo(layers) {
    const periods = layers.filter((layer) => layer.enabled !== false).map(minimalLayerPatternShift);
    if (!periods.length) return { numerator: 1, denominator: 1, value: 1, periods: [] };
    let numerator = periods[0].numerator;
    let denominator = periods[0].denominator;
    for (let index = 1; index < periods.length; index += 1) {
      numerator = lcm(numerator, periods[index].numerator);
      denominator = gcd(denominator, periods[index].denominator);
      const divisor = gcd(numerator, denominator);
      numerator /= divisor;
      denominator /= divisor;
    }
    return { numerator, denominator, value: numerator / denominator, periods };
  }

  function encodeShare(data) {
    const json = JSON.stringify(data);
    if (typeof Buffer !== "undefined") return Buffer.from(json, "utf8").toString("base64url");
    const bytes = new TextEncoder().encode(json);
    let binary = "";
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function decodeShare(code) {
    const clean = String(code || "").trim();
    if (!clean) throw new Error("공유 문자열이 비어 있습니다.");
    if (typeof Buffer !== "undefined") return JSON.parse(Buffer.from(clean, "base64url").toString("utf8"));
    const padded = clean.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((clean.length + 3) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  return {
    EPSILON,
    mod,
    gcd,
    lcm,
    lcmMany,
    primeFactors,
    formatFactors,
    normalizePhase,
    hitFractions,
    commonHitInfo,
    scheduleBetween,
    groupCoincidences,
    minimalLayerPatternShift,
    patternRepeatInfo,
    encodeShare,
    decodeShare
  };
});
