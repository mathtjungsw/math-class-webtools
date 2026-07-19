(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TurtleMath = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const EPSILON = 1e-7;
  const MAX_STEPS = 5000;
  const round = (n, p = 9) => Math.abs(n) < EPSILON ? 0 : Number(n.toFixed(p));
  const mod = (n, m) => ((n % m) + m) % m;

  function parseSequence(value, options = {}) {
    const maxAbs = options.maxAbs || 999;
    const tokens = Array.isArray(value) ? value : String(value || "").split(/[\s,;]+/).filter(Boolean);
    if (!tokens.length) throw new Error("숫자열을 한 개 이상 입력하세요.");
    return tokens.map((token) => {
      const n = Number(token);
      if (!Number.isFinite(n)) throw new Error(`숫자가 아닌 값: ${token}`);
      if (Math.abs(n) > maxAbs) throw new Error(`각 수는 ${maxAbs} 이하로 입력하세요.`);
      return n;
    });
  }

  function digitalRoot(value) {
    const n = Math.abs(Math.trunc(Number(value)));
    if (!Number.isFinite(n)) throw new Error("유한한 수가 필요합니다.");
    return n === 0 ? 0 : 1 + ((n - 1) % 9);
  }
  function digitalRootSteps(value) {
    let n = Math.abs(Math.trunc(Number(value)));
    if (!Number.isFinite(n)) throw new Error("유한한 수가 필요합니다.");
    const values = [n];
    while (n >= 10) { n = String(n).split("").reduce((s, d) => s + Number(d), 0); values.push(n); }
    return values;
  }
  function multiplicationRow(row) {
    const r = Math.max(1, Math.min(9, Math.trunc(row)));
    return Array.from({ length: 9 }, (_, i) => digitalRoot(r * (i + 1)));
  }
  function directionPeriod(angle) {
    const a = mod(Number(angle), 360);
    if (Math.abs(a) < EPSILON) return 1;
    for (let n = 1; n <= 3600; n += 1) if (Math.abs(mod(a * n, 360)) < EPSILON || Math.abs(mod(a * n, 360) - 360) < EPSILON) return n;
    return null;
  }

  function buildPath(config) {
    const sequence = parseSequence(config.sequence);
    const repeats = Math.max(1, Math.trunc(Number(config.repeats) || 1));
    const scale = Number(config.scale);
    if (!Number.isFinite(scale) || scale <= 0) throw new Error("이동 단위 배율은 0보다 커야 합니다.");
    const count = sequence.length * repeats;
    if (count > MAX_STEPS) throw new Error(`최대 ${MAX_STEPS.toLocaleString()}단계까지 실행할 수 있습니다.`);
    let x = Number(config.startX) || 0, y = Number(config.startY) || 0;
    let heading = mod(Number(config.heading) || 0, 360);
    const turn = (config.clockwise === false ? 1 : -1) * (Number(config.angle) || 0);
    const turnFirst = config.commandOrder === "turn-move";
    const points = [{ x: round(x), y: round(y) }], steps = [];
    for (let i = 0; i < count; i += 1) {
      const value = sequence[i % sequence.length];
      const before = { x: round(x), y: round(y), heading: round(heading) };
      if (turnFirst) heading = mod(heading + turn, 360);
      const radians = heading * Math.PI / 180;
      x += value * scale * Math.cos(radians);
      y += value * scale * Math.sin(radians);
      const afterMove = { x: round(x), y: round(y) };
      if (!turnFirst) heading = mod(heading + turn, 360);
      steps.push({ index: i + 1, sequenceIndex: i % sequence.length, value, before, after: { ...afterMove, heading: round(heading) }, distance: Math.abs(value * scale) });
      points.push(afterMove);
    }
    return { sequence, repeats, scale, turn, commandOrder: turnFirst ? "turn-move" : "move-turn", start: points[0], points, steps, end: { x: round(x), y: round(y), heading: round(heading) } };
  }

  const near = (a, b, e = EPSILON) => Math.abs(a - b) <= e;
  function segmentKey(a, b) {
    const p = `${round(a.x, 6)},${round(a.y, 6)}`, q = `${round(b.x, 6)},${round(b.y, 6)}`;
    return p < q ? `${p}|${q}` : `${q}|${p}`;
  }
  function analyze(path, tolerance = EPSILON) {
    const xs = path.points.map(p => p.x), ys = path.points.map(p => p.y);
    let closedAt = null, repeatSegments = 0;
    const seen = new Set();
    path.steps.forEach((s) => {
      if (closedAt === null && near(s.after.x, path.start.x, tolerance) && near(s.after.y, path.start.y, tolerance)) closedAt = s.index;
      const key = segmentKey(s.before, s.after); if (seen.has(key)) repeatSegments += 1; seen.add(key);
    });
    const n = path.sequence.length;
    const cycle = path.steps[Math.min(n, path.steps.length) - 1];
    return {
      cycleDelta: cycle ? { x: round(cycle.after.x - path.start.x), y: round(cycle.after.y - path.start.y), heading: round(mod(cycle.after.heading - path.steps[0].before.heading, 360)) } : { x: 0, y: 0, heading: 0 },
      closedAt, uniquePoints: new Set(path.points.map(p => `${round(p.x, 6)},${round(p.y, 6)}`)).size,
      segments: path.steps.length, repeatedSegments: repeatSegments,
      bounds: { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) },
      totalDistance: round(path.steps.reduce((s, x) => s + x.distance, 0)), directionPeriod: directionPeriod(Math.abs(path.turn))
    };
  }
  function toSvgPath(points, limit = points.length - 1) {
    return points.slice(0, Math.max(1, limit + 1)).map((p, i) => `${i ? "L" : "M"}${round(p.x, 6)} ${round(-p.y, 6)}`).join(" ");
  }
  function validatePreset(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("올바른 JSON 객체가 아닙니다.");
    if (data.kind !== "number-turtle-lab") throw new Error("숫자도형 거북이 프리셋이 아닙니다.");
    const sequence = parseSequence(data.config?.sequence);
    const config = { ...data.config, sequence };
    buildPath(config);
    return { kind: data.kind, version: 1, config, mission: typeof data.mission === "object" ? data.mission : {}, notes: String(data.notes || "") };
  }
  function judgeMission(path, mission, tolerance = 1e-6) {
    if (!mission || !mission.type) return { pass: false, message: "채점 조건이 없습니다." };
    if (mission.type === "endpoint") {
      const dx = path.end.x - Number(mission.x), dy = path.end.y - Number(mission.y);
      const pass = Math.hypot(dx, dy) <= (Number(mission.tolerance) || tolerance);
      return { pass, message: pass ? "목표 끝점에 도착했습니다!" : `목표까지 ${round(Math.hypot(dx, dy), 3)}만큼 남았습니다.` };
    }
    if (mission.type === "closed") { const a = analyze(path, tolerance); return { pass: a.closedAt !== null, message: a.closedAt ? `${a.closedAt}단계에서 닫혔습니다!` : "아직 시작점으로 돌아오지 않았습니다." }; }
    return { pass: false, message: "지원하지 않는 채점 조건입니다." };
  }
  return { EPSILON, MAX_STEPS, round, mod, parseSequence, digitalRoot, digitalRootSteps, multiplicationRow, directionPeriod, buildPath, analyze, toSvgPath, validatePreset, judgeMission };
});
