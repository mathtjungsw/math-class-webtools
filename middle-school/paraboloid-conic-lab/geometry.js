(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ConicLabGeometry = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const EPSILON = 1e-9;

  function degToRad(degrees) {
    return degrees * Math.PI / 180;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function magnitude(vector) {
    return Math.hypot(vector.x, vector.y, vector.z || 0);
  }

  function normalize(vector) {
    const length = magnitude(vector);
    if (length < EPSILON) return { x: 0, y: 0, z: 0 };
    return {
      x: vector.x / length,
      y: vector.y / length,
      z: (vector.z || 0) / length
    };
  }

  function dot(a, b) {
    return a.x * b.x + a.y * b.y + (a.z || 0) * (b.z || 0);
  }

  function reflectVector(direction, normal) {
    const incoming = normalize(direction);
    const unitNormal = normalize(normal);
    const factor = 2 * dot(incoming, unitNormal);
    return normalize({
      x: incoming.x - factor * unitNormal.x,
      y: incoming.y - factor * unitNormal.y,
      z: (incoming.z || 0) - factor * (unitNormal.z || 0)
    });
  }

  function parabolaPoint(focalLength, y) {
    if (!(focalLength > 0)) throw new RangeError("focalLength must be positive");
    return { x: y * y / (4 * focalLength), y };
  }

  function parabolaNormal(focalLength, y) {
    if (!(focalLength > 0)) throw new RangeError("focalLength must be positive");
    return normalize({ x: 1, y: -y / (2 * focalLength) });
  }

  function reflectionRay(focalLength, y, mode) {
    const hit = parabolaPoint(focalLength, y);
    const focus = { x: focalLength, y: 0 };
    const normal = parabolaNormal(focalLength, y);
    const sourceMode = mode !== "parallel-to-focus";
    const incoming = sourceMode
      ? normalize({ x: hit.x - focus.x, y: hit.y - focus.y })
      : { x: -1, y: 0, z: 0 };
    const reflected = reflectVector(incoming, normal);
    const incidenceAngleDeg = Math.acos(clamp(Math.abs(dot(incoming, normal)), -1, 1)) * 180 / Math.PI;
    const reflectionAngleDeg = Math.acos(clamp(Math.abs(dot(reflected, normal)), -1, 1)) * 180 / Math.PI;

    return {
      mode: sourceMode ? "focus-to-parallel" : "parallel-to-focus",
      focus,
      hit,
      normal,
      incoming,
      reflected,
      incidenceAngleDeg,
      reflectionAngleDeg
    };
  }

  function sampleRayPositions(count, aperture, offset) {
    const safeCount = Math.max(1, Math.round(count));
    const half = Math.max(0, aperture) / 2;
    const center = Number(offset) || 0;
    if (safeCount === 1) return [center];
    return Array.from({ length: safeCount }, (_, index) => center - half + aperture * index / (safeCount - 1));
  }

  function conicCoefficients(halfAngleDeg, planeAngleDeg, offset) {
    const halfAngle = degToRad(halfAngleDeg);
    const planeAngle = degToRad(planeAngleDeg);
    const coneSlope = Math.tan(halfAngle);
    const planeSlope = Math.tan(planeAngle);
    const planeScale = Math.sqrt(1 + planeSlope * planeSlope);
    const h = Number(offset);
    const discriminant = 1 - coneSlope * coneSlope * planeSlope * planeSlope;
    return {
      A: discriminant / (planeScale * planeScale),
      B: -2 * coneSlope * coneSlope * h * planeSlope / planeScale,
      C: 1,
      D: -coneSlope * coneSlope * h * h,
      discriminant,
      coneSlope,
      planeSlope,
      planeScale,
      offset: h
    };
  }

  function classifyConic(halfAngleDeg, planeAngleDeg, offset, epsilon) {
    if (!(halfAngleDeg > 0 && halfAngleDeg < 90)) throw new RangeError("halfAngleDeg must be between 0 and 90");
    if (!Number.isFinite(offset)) throw new TypeError("offset must be finite");
    const tolerance = epsilon == null ? 1e-7 : Math.abs(epsilon);
    const coefficients = conicCoefficients(halfAngleDeg, planeAngleDeg, offset);
    const angle = Math.abs(planeAngleDeg);
    const boundaryDeg = 90 - halfAngleDeg;
    let type;

    if (Math.abs(offset) <= tolerance) type = "degenerate";
    else if (angle <= tolerance) type = "circle";
    else if (Math.abs(coefficients.discriminant) <= tolerance) type = "parabola";
    else if (coefficients.discriminant > 0) type = "ellipse";
    else type = "hyperbola";

    return {
      type,
      angleDeg: planeAngleDeg,
      boundaryDeg,
      angleDifferenceDeg: angle - boundaryDeg,
      coefficients
    };
  }

  function conicFeatures(halfAngleDeg, planeAngleDeg, offset) {
    const result = classifyConic(halfAngleDeg, planeAngleDeg, offset);
    const { discriminant, coneSlope: t, planeSlope: m, planeScale: q } = result.coefficients;
    const h = Number(offset);

    if (result.type === "degenerate") return { ...result, center: { u: 0, v: 0 } };
    if (result.type === "circle") {
      const radius = Math.abs(t * h);
      return { ...result, center: { u: 0, v: 0 }, radius, semiMajor: radius, semiMinor: radius, foci: [{ u: 0, v: 0 }] };
    }
    if (result.type === "ellipse") {
      const centerU = t * t * h * m * q / discriminant;
      const semiMajor = Math.abs(t * h) * q / discriminant;
      const semiMinor = Math.abs(t * h) / Math.sqrt(discriminant);
      const focalDistance = Math.sqrt(Math.max(0, semiMajor * semiMajor - semiMinor * semiMinor));
      return {
        ...result,
        center: { u: centerU, v: 0 },
        semiMajor,
        semiMinor,
        focalDistance,
        foci: [{ u: centerU - focalDistance, v: 0 }, { u: centerU + focalDistance, v: 0 }]
      };
    }
    if (result.type === "parabola") {
      const vertexU = -h * q / (2 * m);
      const focalParameter = t * t * h * m / (2 * q);
      return {
        ...result,
        vertex: { u: vertexU, v: 0 },
        focalParameter,
        foci: [{ u: vertexU + focalParameter, v: 0 }],
        directrixU: vertexU - focalParameter
      };
    }

    const positiveDiscriminant = -discriminant;
    const centerU = t * t * h * m * q / discriminant;
    const semiTransverse = Math.abs(t * h) * q / positiveDiscriminant;
    const semiConjugate = Math.abs(t * h) / Math.sqrt(positiveDiscriminant);
    const focalDistance = Math.sqrt(semiTransverse * semiTransverse + semiConjugate * semiConjugate);
    return {
      ...result,
      center: { u: centerU, v: 0 },
      semiMajor: semiTransverse,
      semiMinor: semiConjugate,
      focalDistance,
      foci: [{ u: centerU - focalDistance, v: 0 }, { u: centerU + focalDistance, v: 0 }],
      asymptoteSlope: Math.sqrt(positiveDiscriminant) / q
    };
  }

  function planePointToWorld(u, v, planeAngleDeg, offset) {
    const planeSlope = Math.tan(degToRad(planeAngleDeg));
    const planeScale = Math.sqrt(1 + planeSlope * planeSlope);
    const x = u / planeScale;
    return { x, y: Number(offset) + planeSlope * x, z: v };
  }

  function sampleConic(halfAngleDeg, planeAngleDeg, offset, options) {
    const settings = options || {};
    const samples = Math.max(24, Math.round(settings.samples || 180));
    const span = Math.max(1, Number(settings.span) || 4.5);
    const features = conicFeatures(halfAngleDeg, planeAngleDeg, offset);
    const branches = [];

    if (features.type === "degenerate") return { ...features, branches };
    if (features.type === "circle" || features.type === "ellipse") {
      const points = [];
      for (let index = 0; index <= samples; index += 1) {
        const theta = Math.PI * 2 * index / samples;
        const u = features.center.u + features.semiMajor * Math.cos(theta);
        const v = features.semiMinor * Math.sin(theta);
        points.push({ u, v, ...planePointToWorld(u, v, planeAngleDeg, offset) });
      }
      branches.push(points);
    } else if (features.type === "parabola") {
      const points = [];
      const vLimit = Math.max(2.8, span * Math.sqrt(Math.abs(features.focalParameter) + 0.35));
      for (let index = 0; index <= samples; index += 1) {
        const v = -vLimit + 2 * vLimit * index / samples;
        const u = features.vertex.u + v * v / (4 * features.focalParameter);
        points.push({ u, v, ...planePointToWorld(u, v, planeAngleDeg, offset) });
      }
      branches.push(points);
    } else {
      const parameterLimit = 1.65;
      [-1, 1].forEach((side) => {
        const points = [];
        for (let index = 0; index <= samples / 2; index += 1) {
          const parameter = -parameterLimit + 2 * parameterLimit * index / (samples / 2);
          const u = features.center.u + side * features.semiMajor * Math.cosh(parameter);
          const v = features.semiMinor * Math.sinh(parameter);
          points.push({ u, v, ...planePointToWorld(u, v, planeAngleDeg, offset) });
        }
        branches.push(points);
      });
    }

    return { ...features, branches };
  }

  return {
    EPSILON,
    degToRad,
    clamp,
    magnitude,
    normalize,
    dot,
    reflectVector,
    parabolaPoint,
    parabolaNormal,
    reflectionRay,
    sampleRayPositions,
    conicCoefficients,
    classifyConic,
    conicFeatures,
    planePointToWorld,
    sampleConic
  };
});
