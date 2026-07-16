const test = require("node:test");
const assert = require("node:assert/strict");
const V = require("../ai-math/word-vector-playground/word-vectors.js");

test("한글·영문·숫자를 정규화해 토큰화하고 문장 경계를 지킨다", () => {
  assert.deepEqual(V.tokenize("사과, APPLE-2! 배"), ["사과", "apple-2", "배"]);
  assert.deepEqual(V.tokenizeSentences("가 나. 다 라\n마 바"), [["가", "나"], ["다", "라"], ["마", "바"]]);
});

test("문맥 창 1의 대칭 동시출현 행렬을 만든다", () => {
  const data = V.buildCooccurrence("가 나 다", { windowSize: 1 });
  assert.deepEqual(data.words, ["가", "나", "다"]);
  assert.deepEqual(data.rawMatrix, [[0, 1, 0], [1, 0, 1], [0, 1, 0]]);
});

test("문맥 창·최소 빈도·문장 경계가 행렬에 반영된다", () => {
  const narrow = V.buildCooccurrence("가 나 다. 가 라", { windowSize: 1, minFrequency: 2 });
  assert.deepEqual(narrow.words, ["가"]);
  assert.deepEqual(narrow.rawMatrix, [[0]]);
  assert.deepEqual(narrow.zeroWords, ["가"]);
  const wide = V.buildCooccurrence("가 나 다", { windowSize: 2 });
  assert.deepEqual(wide.rawMatrix[0], [0, 1, 1]);
});

test("정규화를 켜면 영벡터는 안전하게 남고 나머지는 길이가 1이다", () => {
  const data = V.buildCooccurrence("가 나. 혼자", { windowSize: 1, normalize: true });
  assert.equal(V.magnitude(data.vectors["가"]), 1);
  assert.deepEqual(data.vectors["혼자"], [0, 0, 0]);
});

test("내적·크기·거리·코사인과 상세 계산을 정확히 구한다", () => {
  const a = [3, 4];
  const b = [6, 8];
  assert.equal(V.dot(a, b), 50);
  assert.equal(V.magnitude(a), 5);
  assert.equal(V.euclideanDistance(a, b), 5);
  assert.equal(V.cosineSimilarity(a, b), 1);
  assert.deepEqual(V.cosineBreakdown(a, b), {
    products: [18, 32], innerProduct: 50, magnitudeA: 5, magnitudeB: 10, denominator: 50, value: 1
  });
  assert.equal(V.cosineSimilarity([0, 0], [1, 0]), null);
});

test("유클리드 거리와 코사인 유사도는 다른 최근접 순위를 만들 수 있다", () => {
  const data = {
    vectors: { 기준: [2, 0], 가까운점: [4, 3], 같은방향: [10, 0] }
  };
  assert.equal(V.rankNeighbors(data, "기준", "euclidean")[0].word, "가까운점");
  assert.equal(V.rankNeighbors(data, "기준", "cosine")[0].word, "같은방향");
});

test("A-B+C 벡터 연산과 최근접 단어를 찾고 알 수 없는 단어를 거부한다", () => {
  const data = {
    vectors: { 왕: [2, 1], 남자: [1, 0], 여자: [0, 1], 여왕: [1, 2], 돌: [-2, -2] }
  };
  const result = V.vectorArithmetic(data, "왕", "남자", "여자");
  assert.deepEqual(result.vector, [1, 2]);
  assert.equal(result.neighbors[0].word, "여왕");
  assert.match(V.vectorArithmetic(data, "왕", "없음", "여자").error, /없음/);
});

test("벡터 CSV를 읽고 잘못된 차원·숫자·중복을 안전하게 알린다", () => {
  const data = V.parseVectorCsv("단어,밝음,활동\n해,3,2\n달,2,1");
  assert.deepEqual(data.dimensions, ["밝음", "활동"]);
  assert.deepEqual(data.vectors["해"], [3, 2]);
  assert.throws(() => V.parseVectorCsv("단어,x,y\n가,1"), /열 수/);
  assert.throws(() => V.parseVectorCsv("단어,x,y\n가,일,2"), /숫자/);
  assert.throws(() => V.parseVectorCsv("단어,x,y\n가,1,2\n가,3,4"), /중복/);
});

test("고정 초기값 k-평균 군집은 가까운 벡터를 같은 묶음에 둔다", () => {
  const data = {
    words: ["가", "나", "다", "라"],
    vectors: { 가: [0, 0], 나: [0.1, 0], 다: [9, 9], 라: [9.1, 9] }
  };
  const result = V.kMeans(data, 2);
  assert.equal(result.assignments["가"], result.assignments["나"]);
  assert.equal(result.assignments["다"], result.assignments["라"]);
  assert.notEqual(result.assignments["가"], result.assignments["다"]);
});

test("활동 JSON을 왕복하고 다른 형식은 거부한다", () => {
  const state = { corpus: "가 나", windowSize: 2, notes: "관찰" };
  assert.deepEqual(V.decodeState(V.encodeState(state)), state);
  assert.throws(() => V.decodeState("{}"), /형식/);
  assert.throws(() => V.decodeState("not json"), /JSON/);
});
