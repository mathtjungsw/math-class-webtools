(function attachSquareGeometry(globalScope) {
  "use strict";

  function squaredDistance(left, right) {
    const dx = left.x - right.x;
    const dy = left.y - right.y;
    return dx * dx + dy * dy;
  }

  function orderVertices(points) {
    const center = points.reduce(
      (sum, point) => ({ x: sum.x + point.x / points.length, y: sum.y + point.y / points.length }),
      { x: 0, y: 0 }
    );

    return [...points].sort(
      (left, right) =>
        Math.atan2(left.y - center.y, left.x - center.x) -
        Math.atan2(right.y - center.y, right.x - center.x)
    );
  }

  function canonicalKey(points) {
    return [...points]
      .map((point) => `${point.x},${point.y}`)
      .sort()
      .join("|");
  }

  function radical(value) {
    const rounded = Math.round(value);
    if (Math.abs(value - rounded) > 1e-9) return { coefficient: 1, radicand: value };
    if (rounded === 0) return { coefficient: 0, radicand: 1 };

    let coefficient = 1;
    let radicand = rounded;
    for (let factor = 2; factor * factor <= radicand; factor += 1) {
      const square = factor * factor;
      while (radicand % square === 0) {
        coefficient *= factor;
        radicand /= square;
      }
    }
    return { coefficient, radicand };
  }

  function formatRadical(value) {
    const { coefficient, radicand } = radical(value);
    if (coefficient === 0) return "0";
    if (radicand === 1) return String(coefficient);
    return `${coefficient === 1 ? "" : coefficient}√${radicand}`;
  }

  function analyzeSquare(points) {
    if (!Array.isArray(points) || points.length !== 4) {
      return {
        valid: false,
        reason: "서로 다른 격자점 4개를 선택하세요."
      };
    }

    if (new Set(points.map((point) => `${point.x},${point.y}`)).size !== 4) {
      return {
        valid: false,
        reason: "같은 점은 두 번 사용할 수 없습니다."
      };
    }

    const orderedPoints = orderVertices(points);
    const sideDistances = orderedPoints.map((point, index) =>
      squaredDistance(point, orderedPoints[(index + 1) % orderedPoints.length])
    );
    const diagonalDistances = [
      squaredDistance(orderedPoints[0], orderedPoints[2]),
      squaredDistance(orderedPoints[1], orderedPoints[3])
    ];

    const sideSquared = sideDistances[0];
    const fourSidesEqual = sideSquared > 0 && sideDistances.every((value) => value === sideSquared);
    const diagonalsEqual = diagonalDistances[0] === diagonalDistances[1];
    const pythagoreanRelation = diagonalDistances[0] === sideSquared * 2;

    if (!fourSidesEqual) {
      return {
        valid: false,
        reason: "네 변의 길이가 모두 같지 않습니다. 점의 위치를 다시 살펴보세요."
      };
    }

    if (!diagonalsEqual || !pythagoreanRelation) {
      return {
        valid: false,
        reason: "네 변은 같지만 두 대각선의 조건이 맞지 않습니다. 정사각형인지 확인하세요."
      };
    }

    const firstEdge = {
      dx: orderedPoints[1].x - orderedPoints[0].x,
      dy: orderedPoints[1].y - orderedPoints[0].y
    };
    const tilted = firstEdge.dx !== 0 && firstEdge.dy !== 0;

    return {
      valid: true,
      orderedPoints,
      key: canonicalKey(points),
      sideSquared,
      diagonalSquared: sideSquared * 2,
      sideLength: Math.sqrt(sideSquared),
      diagonalLength: Math.sqrt(sideSquared * 2),
      sideExpression: formatRadical(sideSquared),
      diagonalExpression: formatRadical(sideSquared * 2),
      area: sideSquared,
      tilted,
      vector: firstEdge
    };
  }

  const api = {
    analyzeSquare,
    canonicalKey,
    formatRadical,
    orderVertices,
    squaredDistance
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  globalScope.SquareGeometry = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
