const test = require("node:test");
const assert = require("node:assert/strict");
const H = require("../ai-math/huffman-compression-lab/huffman.js");

test("문자별 빈도와 유니코드 문자를 정확히 센다", () => {
  assert.deepEqual(H.frequency("가가A🍌A"), [
    { symbol: "A", count: 2 }, { symbol: "가", count: 2 }, { symbol: "🍌", count: 1 }
  ]);
});

test("동률 빈도에서도 같은 트리와 코드표를 결정적으로 만든다", () => {
  const first = H.buildTree("DCBA");
  const second = H.buildTree("ABCD");
  assert.deepEqual(first.codes, second.codes);
  assert.deepEqual(first.codes, { A: "00", B: "01", C: "10", D: "11" });
});

test("생성된 허프만 코드에는 접두어 충돌이 없다", () => {
  ["BANANA", "수학 수업", "AAAAABBCD", "🍎🍎🍌🍇"].forEach((text) => {
    assert.equal(H.isPrefixFree(H.buildTree(text).codes), true);
  });
});

test("인코딩 후 디코딩하면 유니코드 원문이 복원된다", () => {
  const text = "한글 English 123 ! 🍌\n둘째 줄";
  const tree = H.buildTree(text);
  assert.equal(H.decode(H.encode(text, tree.codes), tree.root).text, text);
});

test("단일 문자는 0으로 부호화하고 왕복한다", () => {
  const tree = H.buildTree("ㅋㅋㅋㅋ");
  assert.deepEqual(tree.codes, { "ㅋ": "0" });
  assert.equal(H.encode("ㅋㅋㅋㅋ", tree.codes), "0000");
  assert.equal(H.decode("0000", tree.root).text, "ㅋㅋㅋㅋ");
  assert.equal(H.metrics("ㅋㅋㅋㅋ", tree).fixedBits, 4);
});

test("빈 입력은 빈 구조와 0비트 지표를 반환한다", () => {
  const tree = H.buildTree("");
  assert.equal(tree.root, null);
  assert.deepEqual(tree.rows, []);
  assert.deepEqual(tree.codes, {});
  assert.equal(H.metrics("", tree).huffmanBits, 0);
  assert.equal(H.decode("", tree.root).text, "");
});

test("잘못된 비트와 끝나지 않은 비트열을 거부한다", () => {
  const tree = H.buildTree("AAABBC");
  assert.throws(() => H.decode("10x", tree.root), /0 또는 1/);
  const incomplete = Object.values(tree.codes).find((code) => code.length > 1).slice(0, 1);
  assert.throws(() => H.decode(incomplete, tree.root), /중간에서 끝났습니다/);
});

test("고정 길이와 가중 경로 길이를 계산한다", () => {
  const text = "AAAAABBCD";
  const tree = H.buildTree(text);
  const metrics = H.metrics(text, tree);
  assert.equal(metrics.fixedWidth, 2);
  assert.equal(metrics.fixedBits, 18);
  assert.equal(metrics.huffmanBits, H.encode(text, tree.codes).length);
  assert.ok(metrics.averageLength >= metrics.entropy);
  assert.ok(metrics.averageLength < metrics.entropy + 1);
});
