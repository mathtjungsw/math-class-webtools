(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Huffman = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function symbolsOf(text) {
    return Array.from(String(text || ""));
  }

  function compareText(a, b) {
    const aa = symbolsOf(a).map((value) => value.codePointAt(0));
    const bb = symbolsOf(b).map((value) => value.codePointAt(0));
    for (let index = 0; index < Math.min(aa.length, bb.length); index += 1) {
      if (aa[index] !== bb[index]) return aa[index] - bb[index];
    }
    return aa.length - bb.length;
  }

  function frequency(text) {
    const counts = new Map();
    symbolsOf(text).forEach((symbol) => counts.set(symbol, (counts.get(symbol) || 0) + 1));
    return Array.from(counts, ([symbol, count]) => ({ symbol, count }))
      .sort((a, b) => b.count - a.count || compareText(a.symbol, b.symbol));
  }

  function nodeComparator(a, b) {
    return a.weight - b.weight || compareText(a.signature, b.signature) || a.id - b.id;
  }

  function makeSnapshot(nodes) {
    return nodes.slice().sort(nodeComparator).map((node) => ({
      id: node.id,
      weight: node.weight,
      signature: node.signature,
      symbol: node.symbol,
      isLeaf: !node.left && !node.right
    }));
  }

  function buildTree(text) {
    const rows = frequency(text);
    let nextId = 1;
    let queue = rows.map((row) => ({
      id: nextId++, symbol: row.symbol, weight: row.count, signature: row.symbol,
      left: null, right: null
    })).sort(nodeComparator);
    const allNodes = queue.slice();
    const steps = [];

    while (queue.length > 1) {
      const before = makeSnapshot(queue);
      const left = queue.shift();
      const right = queue.shift();
      const signature = [left.signature, right.signature].sort(compareText).join("\u0000");
      const parent = {
        id: nextId++, symbol: null, weight: left.weight + right.weight, signature,
        left, right
      };
      allNodes.push(parent);
      queue.push(parent);
      queue.sort(nodeComparator);
      steps.push({
        number: steps.length + 1,
        before,
        selected: [left.id, right.id],
        created: parent.id,
        after: makeSnapshot(queue)
      });
    }

    const rootNode = queue[0] || null;
    const codes = {};
    function walk(node, prefix) {
      if (!node) return;
      if (!node.left && !node.right) {
        codes[node.symbol] = prefix || "0";
        return;
      }
      walk(node.left, prefix + "0");
      walk(node.right, prefix + "1");
    }
    walk(rootNode, "");

    return { root: rootNode, rows, steps, codes, allNodes };
  }

  function encode(text, codes) {
    return symbolsOf(text).map((symbol) => {
      if (!Object.prototype.hasOwnProperty.call(codes, symbol)) {
        throw new Error("코드표에 없는 문자입니다: " + printable(symbol));
      }
      return codes[symbol];
    }).join("");
  }

  function decode(bits, rootNode) {
    const clean = String(bits || "").replace(/\s/g, "");
    if (!rootNode) {
      if (!clean) return { text: "", trace: [] };
      throw new Error("먼저 텍스트를 분석해 허프만 트리를 만들어 주세요.");
    }
    const invalidIndex = clean.search(/[^01]/);
    if (invalidIndex >= 0) throw new Error(`${invalidIndex + 1}번째 위치에 0 또는 1이 아닌 값이 있습니다.`);
    if (!rootNode.left && !rootNode.right) {
      const bad = clean.indexOf("1");
      if (bad >= 0) throw new Error(`단일 문자 트리에서는 ${bad + 1}번째 비트도 0이어야 합니다.`);
      return {
        text: rootNode.symbol.repeat(clean.length),
        trace: symbolsOf(clean).map((bit, index) => ({ index, bit, nodeId: rootNode.id, symbol: rootNode.symbol }))
      };
    }
    let node = rootNode;
    let text = "";
    const trace = [];
    symbolsOf(clean).forEach((bit, index) => {
      node = bit === "0" ? node.left : node.right;
      if (!node) throw new Error(`${index + 1}번째 비트에서 트리의 경로를 벗어났습니다.`);
      const symbol = !node.left && !node.right ? node.symbol : null;
      trace.push({ index, bit, nodeId: node.id, symbol });
      if (symbol !== null) {
        text += symbol;
        node = rootNode;
      }
    });
    if (node !== rootNode) throw new Error("비트열이 문자 중간에서 끝났습니다. 마지막 코드를 완성해 주세요.");
    return { text, trace };
  }

  function metrics(text, tree) {
    const length = symbolsOf(text).length;
    const unique = tree.rows.length;
    const fixedWidth = unique <= 1 ? (unique === 0 ? 0 : 1) : Math.ceil(Math.log2(unique));
    const fixedBits = fixedWidth * length;
    const huffmanBits = tree.rows.reduce((sum, row) => sum + row.count * tree.codes[row.symbol].length, 0);
    const entropy = length ? tree.rows.reduce((sum, row) => {
      const p = row.count / length;
      return sum - p * Math.log2(p);
    }, 0) : 0;
    const averageLength = length ? huffmanBits / length : 0;
    const savedBits = fixedBits - huffmanBits;
    return {
      length, unique, fixedWidth, fixedBits, huffmanBits, savedBits,
      savingsRate: fixedBits ? savedBits / fixedBits : 0,
      compressionRatio: fixedBits ? huffmanBits / fixedBits : 0,
      entropy, averageLength
    };
  }

  function printable(symbol) {
    if (symbol === " ") return "␠ 공백";
    if (symbol === "\n") return "↵ 줄바꿈";
    if (symbol === "\t") return "⇥ 탭";
    return symbol;
  }

  function isPrefixFree(codes) {
    const values = Object.values(codes);
    return values.every((code, i) => values.every((other, j) => i === j || !other.startsWith(code)));
  }

  return { symbolsOf, frequency, buildTree, encode, decode, metrics, printable, isPrefixFree, nodeComparator, compareText };
});
