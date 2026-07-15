(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PathProbability = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MAX_GRID_SIZE = 8;
  const DEFAULT_ENUMERATION_LIMIT = 200;

  function gcd(a, b) {
    let x = a < 0n ? -a : a;
    let y = b < 0n ? -b : b;
    while (y) [x, y] = [y, x % y];
    return x || 1n;
  }

  function fraction(numerator, denominator = 1n) {
    let n = BigInt(numerator);
    let d = BigInt(denominator);
    if (d === 0n) throw new Error("분모는 0이 될 수 없습니다.");
    if (d < 0n) {
      n = -n;
      d = -d;
    }
    const divisor = gcd(n, d);
    return { n: n / divisor, d: d / divisor };
  }

  function addFractions(left, right) {
    return fraction(left.n * right.d + right.n * left.d, left.d * right.d);
  }

  function multiplyFractions(left, right) {
    return fraction(left.n * right.n, left.d * right.d);
  }

  function divideFraction(value, divisor) {
    return fraction(value.n, value.d * BigInt(divisor));
  }

  function fractionsEqual(left, right) {
    return left.n === right.n && left.d === right.d;
  }

  function fractionToString(value) {
    return value.d === 1n ? String(value.n) : `${value.n}/${value.d}`;
  }

  function fractionToNumber(value) {
    return Number(value.n) / Number(value.d);
  }

  function fractionToDecimal(value, digits = 4) {
    return fractionToNumber(value).toFixed(digits);
  }

  function nodeKey(row, column) {
    return `${row},${column}`;
  }

  function parseNodeKey(key) {
    const match = /^(\d+),(\d+)$/.exec(String(key));
    return match ? { row: Number(match[1]), column: Number(match[2]) } : null;
  }

  function isValidNode(key, rows, columns) {
    const point = parseNodeKey(key);
    return Boolean(point && point.row >= 0 && point.row < rows && point.column >= 0 && point.column < columns);
  }

  function edgeKey(first, second) {
    return [String(first), String(second)].sort().join("|");
  }

  function parseEdgeKey(key) {
    const parts = String(key).split("|");
    return parts.length === 2 ? parts : null;
  }

  function areAdjacent(first, second) {
    const a = parseNodeKey(first);
    const b = parseNodeKey(second);
    return Boolean(a && b && Math.abs(a.row - b.row) + Math.abs(a.column - b.column) === 1);
  }

  function allNodeKeys(rows, columns) {
    const keys = [];
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) keys.push(nodeKey(row, column));
    }
    return keys;
  }

  function fullGridEdges(rows, columns) {
    const edges = [];
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const current = nodeKey(row, column);
        if (column + 1 < columns) edges.push(edgeKey(current, nodeKey(row, column + 1)));
        if (row + 1 < rows) edges.push(edgeKey(current, nodeKey(row + 1, column)));
      }
    }
    return edges;
  }

  function normalizeProblem(rawProblem) {
    const raw = rawProblem || {};
    const rows = Number(raw.rows);
    const columns = Number(raw.columns ?? raw.cols);
    if (!Number.isInteger(rows) || !Number.isInteger(columns) || rows < 2 || columns < 2 || rows > MAX_GRID_SIZE || columns > MAX_GRID_SIZE) {
      throw new Error(`격자 크기는 2×2부터 ${MAX_GRID_SIZE}×${MAX_GRID_SIZE}까지 가능합니다.`);
    }

    const start = String(raw.start ?? "0,0");
    const end = String(raw.end ?? nodeKey(rows - 1, columns - 1));
    const checkpoint = String(raw.checkpoint ?? raw.check ?? nodeKey(Math.floor((rows - 1) / 2), Math.floor((columns - 1) / 2)));
    [start, end, checkpoint].forEach((key) => {
      if (!isValidNode(key, rows, columns)) throw new Error(`격자 밖의 지점이 있습니다: ${key}`);
    });
    if (new Set([start, end, checkpoint]).size !== 3) throw new Error("A, B, C는 서로 다른 지점이어야 합니다.");

    const blocked = [...new Set((Array.isArray(raw.blocked) ? raw.blocked : []).map(String))];
    if (blocked.some((key) => !isValidNode(key, rows, columns))) throw new Error("격자 밖의 장애물 지점이 있습니다.");
    if (blocked.some((key) => key === start || key === end || key === checkpoint)) throw new Error("A, B, C에는 장애물을 놓을 수 없습니다.");

    const rawEdges = Array.isArray(raw.edges) ? raw.edges : fullGridEdges(rows, columns);
    const edges = [];
    const seenEdges = new Set();
    rawEdges.forEach((rawEdge) => {
      let parts;
      if (Array.isArray(rawEdge) && rawEdge.length === 2) parts = rawEdge.map(String);
      else parts = parseEdgeKey(rawEdge);
      if (!parts || !isValidNode(parts[0], rows, columns) || !isValidNode(parts[1], rows, columns) || !areAdjacent(parts[0], parts[1])) {
        throw new Error(`올바르지 않은 길이 있습니다: ${String(rawEdge)}`);
      }
      const normalized = edgeKey(parts[0], parts[1]);
      if (!seenEdges.has(normalized)) {
        seenEdges.add(normalized);
        edges.push(normalized);
      }
    });

    return {
      version: 1,
      title: String(raw.title || "나의 길찾기 문제").slice(0, 60),
      rows,
      columns,
      start,
      end,
      checkpoint,
      blocked,
      edges,
    };
  }

  function makeMap(keys, initialValueFactory) {
    const map = new Map();
    keys.forEach((key) => map.set(key, initialValueFactory(key)));
    return map;
  }

  function breadthFirstDistances(start, adjacency, activeNodes) {
    const distances = makeMap(activeNodes, () => Infinity);
    if (!distances.has(start)) return distances;
    distances.set(start, 0);
    const queue = [start];
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      const nextDistance = distances.get(current) + 1;
      (adjacency.get(current) || []).forEach((next) => {
        if (distances.get(next) === Infinity) {
          distances.set(next, nextDistance);
          queue.push(next);
        }
      });
    }
    return distances;
  }

  function graphHasCycle(activeNodes, adjacency) {
    const visited = new Set();
    function visit(node, parent) {
      visited.add(node);
      for (const next of adjacency.get(node) || []) {
        if (!visited.has(next)) {
          if (visit(next, node)) return true;
        } else if (next !== parent) return true;
      }
      return false;
    }
    return activeNodes.some((node) => !visited.has(node) && visit(node, null));
  }

  function analyzeProblem(rawProblem, options = {}) {
    const problem = normalizeProblem(rawProblem);
    const blocked = new Set(problem.blocked);
    const activeNodes = allNodeKeys(problem.rows, problem.columns).filter((key) => !blocked.has(key));
    const adjacency = makeMap(activeNodes, () => []);
    const activeEdges = [];

    problem.edges.forEach((key) => {
      const [first, second] = parseEdgeKey(key);
      if (blocked.has(first) || blocked.has(second)) return;
      adjacency.get(first).push(second);
      adjacency.get(second).push(first);
      activeEdges.push(key);
    });
    adjacency.forEach((neighbors) => neighbors.sort());

    const distanceFromStart = breadthFirstDistances(problem.start, adjacency, activeNodes);
    const distanceToEnd = breadthFirstDistances(problem.end, adjacency, activeNodes);
    const shortestDistance = distanceFromStart.get(problem.end);
    const hasPath = Number.isFinite(shortestDistance);
    const outgoing = makeMap(activeNodes, () => []);
    const incoming = makeMap(activeNodes, () => []);
    const directedEdges = [];

    if (hasPath) {
      activeEdges.forEach((key) => {
        const [first, second] = parseEdgeKey(key);
        const candidates = [[first, second], [second, first]];
        candidates.forEach(([from, to]) => {
          if (distanceFromStart.get(from) + 1 === distanceFromStart.get(to)
            && distanceFromStart.get(from) + 1 + distanceToEnd.get(to) === shortestDistance) {
            outgoing.get(from).push(to);
            incoming.get(to).push(from);
            directedEdges.push({ key, from, to });
          }
        });
      });
    }
    outgoing.forEach((neighbors) => neighbors.sort());
    incoming.forEach((neighbors) => neighbors.sort());

    const levels = [];
    if (hasPath) {
      for (let level = 0; level <= shortestDistance; level += 1) levels.push([]);
      activeNodes.forEach((key) => {
        const from = distanceFromStart.get(key);
        const to = distanceToEnd.get(key);
        if (from + to === shortestDistance) levels[from].push(key);
      });
      levels.forEach((level) => level.sort());
    }

    const pathsFromStart = makeMap(activeNodes, () => 0n);
    const pathsToEnd = makeMap(activeNodes, () => 0n);
    const branchReach = makeMap(activeNodes, () => fraction(0n));
    if (hasPath) {
      pathsFromStart.set(problem.start, 1n);
      levels.forEach((nodes) => {
        nodes.forEach((node) => {
          outgoing.get(node).forEach((next) => pathsFromStart.set(next, pathsFromStart.get(next) + pathsFromStart.get(node)));
        });
      });

      pathsToEnd.set(problem.end, 1n);
      [...levels].reverse().forEach((nodes) => {
        nodes.forEach((node) => {
          outgoing.get(node).forEach((next) => pathsToEnd.set(node, pathsToEnd.get(node) + pathsToEnd.get(next)));
        });
      });

      branchReach.set(problem.start, fraction(1n));
      levels.forEach((nodes) => {
        nodes.forEach((node) => {
          const choices = outgoing.get(node).length;
          if (!choices) return;
          const share = divideFraction(branchReach.get(node), choices);
          outgoing.get(node).forEach((next) => branchReach.set(next, addFractions(branchReach.get(next), share)));
        });
      });
    }

    const totalPaths = hasPath ? pathsToEnd.get(problem.start) : 0n;
    const checkpointOnShortestPath = hasPath
      && distanceFromStart.get(problem.checkpoint) + distanceToEnd.get(problem.checkpoint) === shortestDistance;
    const pathsThroughCheckpoint = checkpointOnShortestPath
      ? pathsFromStart.get(problem.checkpoint) * pathsToEnd.get(problem.checkpoint)
      : 0n;
    const pathUniformProbability = totalPaths ? fraction(pathsThroughCheckpoint, totalPaths) : fraction(0n);
    const branchUniformProbability = checkpointOnShortestPath ? branchReach.get(problem.checkpoint) : fraction(0n);
    const enumerationLimit = Math.max(1, Math.min(1000, Number(options.enumerationLimit) || DEFAULT_ENUMERATION_LIMIT));

    const analysis = {
      problem,
      activeNodes,
      activeEdges,
      adjacency,
      distanceFromStart,
      distanceToEnd,
      shortestDistance: hasPath ? shortestDistance : null,
      hasPath,
      hasCycle: graphHasCycle(activeNodes, adjacency),
      outgoing,
      incoming,
      directedEdges,
      levels,
      pathsFromStart,
      pathsToEnd,
      branchReach,
      totalPaths,
      checkpointOnShortestPath,
      pathsThroughCheckpoint,
      pathUniformProbability,
      branchUniformProbability,
      ignoredEdgeCount: activeEdges.length - directedEdges.length,
      enumerationLimit,
      paths: [],
      enumerationTruncated: false,
    };
    if (hasPath) {
      analysis.paths = enumerateShortestPaths(analysis, enumerationLimit);
      analysis.enumerationTruncated = totalPaths > BigInt(analysis.paths.length);
    }
    return analysis;
  }

  function branchProbabilityForPath(path, outgoing) {
    let probability = fraction(1n);
    for (let index = 0; index + 1 < path.length; index += 1) {
      probability = divideFraction(probability, outgoing.get(path[index]).length);
    }
    return probability;
  }

  function enumerateShortestPaths(analysis, limit = DEFAULT_ENUMERATION_LIMIT) {
    if (!analysis.hasPath) return [];
    const results = [];
    const current = [analysis.problem.start];
    function visit(node) {
      if (results.length >= limit) return;
      if (node === analysis.problem.end) {
        const path = [...current];
        results.push({
          nodes: path,
          passesCheckpoint: path.includes(analysis.problem.checkpoint),
          branchProbability: branchProbabilityForPath(path, analysis.outgoing),
        });
        return;
      }
      for (const next of analysis.outgoing.get(node) || []) {
        current.push(next);
        visit(next);
        current.pop();
        if (results.length >= limit) break;
      }
    }
    visit(analysis.problem.start);
    return results;
  }

  function chooseWeightedNext(node, analysis, random) {
    const choices = analysis.outgoing.get(node) || [];
    const total = choices.reduce((sum, next) => sum + analysis.pathsToEnd.get(next), 0n);
    if (!choices.length || total === 0n) return null;
    let target = Math.floor(random() * Number(total));
    for (const next of choices) {
      const weight = Number(analysis.pathsToEnd.get(next));
      if (target < weight) return next;
      target -= weight;
    }
    return choices[choices.length - 1];
  }

  function samplePathUniform(analysis, random = Math.random) {
    if (!analysis.hasPath) return [];
    const path = [analysis.problem.start];
    while (path[path.length - 1] !== analysis.problem.end) {
      const next = chooseWeightedNext(path[path.length - 1], analysis, random);
      if (!next) break;
      path.push(next);
    }
    return path;
  }

  function sampleBranchUniform(analysis, random = Math.random) {
    if (!analysis.hasPath) return [];
    const path = [analysis.problem.start];
    while (path[path.length - 1] !== analysis.problem.end) {
      const choices = analysis.outgoing.get(path[path.length - 1]) || [];
      if (!choices.length) break;
      path.push(choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))]);
    }
    return path;
  }

  function runSimulation(analysis, trials, random = Math.random) {
    const count = Math.max(1, Math.min(50000, Math.floor(Number(trials) || 1)));
    if (!analysis.hasPath) return { trials: 0, pathHits: 0, branchHits: 0 };
    let pathHits = 0;
    let branchHits = 0;
    for (let index = 0; index < count; index += 1) {
      if (samplePathUniform(analysis, random).includes(analysis.problem.checkpoint)) pathHits += 1;
      if (sampleBranchUniform(analysis, random).includes(analysis.problem.checkpoint)) branchHits += 1;
    }
    return { trials: count, pathHits, branchHits };
  }

  function nodeLabel(key, problem) {
    if (key === problem.start) return "A";
    if (key === problem.checkpoint) return "B";
    if (key === problem.end) return "C";
    const point = parseNodeKey(key);
    return `(${point.column + 1},${point.row + 1})`;
  }

  return {
    MAX_GRID_SIZE,
    DEFAULT_ENUMERATION_LIMIT,
    gcd,
    fraction,
    addFractions,
    multiplyFractions,
    divideFraction,
    fractionsEqual,
    fractionToString,
    fractionToNumber,
    fractionToDecimal,
    nodeKey,
    parseNodeKey,
    isValidNode,
    edgeKey,
    parseEdgeKey,
    areAdjacent,
    allNodeKeys,
    fullGridEdges,
    normalizeProblem,
    analyzeProblem,
    branchProbabilityForPath,
    enumerateShortestPaths,
    samplePathUniform,
    sampleBranchUniform,
    runSimulation,
    nodeLabel,
  };
});
