const test = require("node:test");
const assert = require("node:assert/strict");

const G = require("../middle-school/paraboloid-conic-lab/geometry.js");

function almostEqual(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≉ ${expected}`);
}

test("포물선 위의 점은 초점과 준선에서 같은 거리에 있다", () => {
  [0.2, 1, 2.5, 10].forEach((f) => {
    [-8 * f, -2 * f, 0, 2 * f, 8 * f].forEach((y) => {
      const point = G.parabolaPoint(f, y);
      almostEqual(point.y * point.y, 4 * f * point.x, 1e-8);
      const focusDistance = Math.hypot(point.x - f, point.y);
      const directrixDistance = point.x + f;
      almostEqual(focusDistance, directrixDistance, 1e-8);
    });
  });
});

test("초점에서 나온 광선은 반사 뒤 축과 평행하다", () => {
  [0.1, 1, 4].forEach((f) => {
    [-20 * f, -2 * f, 0, 2 * f, 20 * f].forEach((y) => {
      const ray = G.reflectionRay(f, y, "focus-to-parallel");
      almostEqual(ray.reflected.x, 1, 1e-9);
      almostEqual(ray.reflected.y, 0, 1e-9);
      almostEqual(ray.incidenceAngleDeg, ray.reflectionAngleDeg, 1e-9);
      almostEqual(G.magnitude(ray.reflected), 1, 1e-9);
    });
  });
});

test("평행 입사광은 반사 뒤 초점을 향한다", () => {
  [-5, -1, 0, 1, 5].forEach((y) => {
    const ray = G.reflectionRay(1.3, y, "parallel-to-focus");
    const expected = G.normalize({ x: ray.focus.x - ray.hit.x, y: ray.focus.y - ray.hit.y });
    almostEqual(ray.reflected.x, expected.x, 1e-9);
    almostEqual(ray.reflected.y, expected.y, 1e-9);
    almostEqual(ray.incidenceAngleDeg, ray.reflectionAngleDeg, 1e-9);
  });
});

test("벡터 반사는 길이를 보존하고 두 번 반사하면 원래 방향이다", () => {
  const direction = G.normalize({ x: -2, y: 3 });
  const normal = G.normalize({ x: 4, y: 1 });
  const once = G.reflectVector(direction, normal);
  const twice = G.reflectVector(once, normal);
  almostEqual(G.magnitude(once), 1);
  almostEqual(twice.x, direction.x);
  almostEqual(twice.y, direction.y);
});

test("광선 위치 샘플은 개수·범위·대칭을 지킨다", () => {
  assert.deepEqual(G.sampleRayPositions(1, 6, 1.25), [1.25]);
  assert.deepEqual(G.sampleRayPositions(5, 4, 0), [-2, -1, 0, 1, 2]);
  assert.deepEqual(G.sampleRayPositions(3, 2, 1), [0, 1, 2]);
});

test("원뿔 절단 각도를 원·타원·포물선·쌍곡선으로 정확히 분류한다", () => {
  assert.equal(G.classifyConic(32, 0, 1.6).type, "circle");
  assert.equal(G.classifyConic(32, 36, 1.6).type, "ellipse");
  assert.equal(G.classifyConic(32, 57.999, 1.6, 1e-9).type, "ellipse");
  assert.equal(G.classifyConic(32, 58, 1.6).type, "parabola");
  assert.equal(G.classifyConic(32, 58.001, 1.6, 1e-9).type, "hyperbola");
  assert.equal(G.classifyConic(32, 70, 1.6).type, "hyperbola");
  assert.equal(G.classifyConic(32, 36, 0).type, "degenerate");
});

test("원 단면 반지름과 타원·쌍곡선 핵심 값이 유한하다", () => {
  const circle = G.conicFeatures(30, 0, 2);
  almostEqual(circle.radius, 2 / Math.sqrt(3), 1e-9);
  [G.conicFeatures(30, 45, 2), G.conicFeatures(30, 60, 2), G.conicFeatures(30, 75, 2)].forEach((features) => {
    const values = JSON.stringify(features).match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) || [];
    values.forEach((value) => assert.ok(Number.isFinite(Number(value))));
  });
});

test("2D 단면 샘플은 3D 원뿔과 절단 평면 방정식을 동시에 만족한다", () => {
  [0, 36, 58, 70].forEach((angle) => {
    const halfAngle = 32;
    const offset = 1.6;
    const t = Math.tan(G.degToRad(halfAngle));
    const m = Math.tan(G.degToRad(angle));
    const sampled = G.sampleConic(halfAngle, angle, offset, { samples: 120 });
    assert.ok(sampled.branches.length >= 1);
    sampled.branches.flat().filter((_, index) => index % 9 === 0).forEach((point) => {
      const scale = 1 + point.x * point.x + point.y * point.y + point.z * point.z;
      almostEqual(point.x * point.x + point.z * point.z, t * t * point.y * point.y, 1e-8 * scale);
      almostEqual(point.y, offset + m * point.x, 1e-8 * scale);
    });
  });
});

test("포물선 단면의 점은 초점과 준선까지 거리가 같다", () => {
  const features = G.conicFeatures(32, 58, 1.6);
  const focus = features.foci[0];
  [-3, -1, 0, 1, 3].forEach((v) => {
    const u = features.vertex.u + v * v / (4 * features.focalParameter);
    const focusDistance = Math.hypot(u - focus.u, v);
    const directrixDistance = Math.abs(u - features.directrixU);
    almostEqual(focusDistance, directrixDistance, 1e-8);
  });
});

test("타원과 쌍곡선의 초점 성질 및 점근선 계산이 일치한다", () => {
  const ellipse = G.conicFeatures(32, 36, 1.6);
  const theta = 1.1;
  const ellipsePoint = {
    u: ellipse.center.u + ellipse.semiMajor * Math.cos(theta),
    v: ellipse.semiMinor * Math.sin(theta)
  };
  const ellipseDistanceSum = ellipse.foci.reduce((sum, focus) => sum + Math.hypot(ellipsePoint.u - focus.u, ellipsePoint.v), 0);
  almostEqual(ellipseDistanceSum, 2 * ellipse.semiMajor, 1e-8);

  const hyperbola = G.conicFeatures(32, 70, 1.6);
  const parameter = 0.8;
  const hyperbolaPoint = {
    u: hyperbola.center.u + hyperbola.semiMajor * Math.cosh(parameter),
    v: hyperbola.semiMinor * Math.sinh(parameter)
  };
  const distances = hyperbola.foci.map((focus) => Math.hypot(hyperbolaPoint.u - focus.u, hyperbolaPoint.v));
  almostEqual(Math.abs(distances[0] - distances[1]), 2 * hyperbola.semiMajor, 1e-8);
  almostEqual(hyperbola.asymptoteSlope, hyperbola.semiMinor / hyperbola.semiMajor, 1e-9);
});

test("원뿔 반각이 달라도 경계각은 90도에서 반각을 뺀 값이다", () => {
  assert.equal(G.classifyConic(45, 44.999, 2, 1e-9).type, "ellipse");
  assert.equal(G.classifyConic(45, 45, 2).type, "parabola");
  assert.equal(G.classifyConic(45, 45.001, 2, 1e-9).type, "hyperbola");
});

test("절단 위치의 부호와 크기는 곡선 종류를 바꾸지 않는다", () => {
  [36, 58, 70].forEach((angle) => {
    const expected = G.classifyConic(32, angle, 1).type;
    assert.equal(G.classifyConic(32, angle, 2.8).type, expected);
    assert.equal(G.classifyConic(32, angle, -2.8).type, expected);
  });
});
