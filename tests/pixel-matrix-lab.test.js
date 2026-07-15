const test = require("node:test");
const assert = require("node:assert/strict");
const M = require("../ai-math/pixel-matrix-lab/matrix.js");

test("RGB를 BT.709 명도 값으로 변환한다", () => {
  assert.equal(M.rgbToLuminance(255, 255, 255), 255);
  assert.equal(M.rgbToLuminance(0, 0, 0), 0);
  assert.equal(M.rgbToLuminance(255, 0, 0), 54);
  assert.equal(M.rgbToLuminance(10, 100, 200), 88);
});

test("임계값 이상은 1, 미만은 0으로 이진화한다", () => {
  assert.deepEqual(M.binary([[0, 127, 128, 255]], 128), [[0, 0, 1, 1]]);
});

test("항등 커널은 입력 행렬을 그대로 출력한다", () => {
  const matrix = [[10, 20], [30, 40]];
  const identity = [[0, 0, 0], [0, 1, 0], [0, 0, 0]];
  assert.deepEqual(M.convolve(matrix, identity, { padding: "zero" }), matrix);
});

test("0·복제·반사 패딩의 경계 값을 구분한다", () => {
  const matrix = [[1, 2], [3, 4]];
  assert.equal(M.sample(matrix, -1, -1, "zero"), 0);
  assert.equal(M.sample(matrix, -1, -1, "extend"), 1);
  assert.equal(M.sample(matrix, -1, 2, "reflect"), 2);
  assert.equal(M.sample(matrix, 2, 2, "reflect"), 4);
});

test("정규화, 편향, 반올림과 0~255 클램핑을 적용한다", () => {
  const matrix = [[100]];
  const allOnes = [[1, 1, 1], [1, 1, 1], [1, 1, 1]];
  assert.equal(M.convolutionAt(matrix, allOnes, 0, 0, { padding: "extend", normalize: true }).output, 100);
  assert.equal(M.convolutionAt(matrix, allOnes, 0, 0, { padding: "extend", divisor: 9, bias: 20 }).output, 120);
  assert.equal(M.convolutionAt([[250]], [[0,0,0],[0,2,0],[0,0,0]], 0, 0).output, 255);
  assert.equal(M.convolutionAt([[10]], [[0,0,0],[0,-2,0],[0,0,0]], 0, 0).output, 0);
});

test("작은 행렬에 평균 흐림 커널의 예상 출력을 계산한다", () => {
  const matrix = [[0, 0, 0], [0, 90, 0], [0, 0, 0]];
  const blur = [[1, 1, 1], [1, 1, 1], [1, 1, 1]];
  assert.deepEqual(M.convolve(matrix, blur, { padding: "zero", normalize: true }), [
    [10, 10, 10], [10, 10, 10], [10, 10, 10]
  ]);
});

test("최근접과 면적 평균 축소를 구분한다", () => {
  const matrix = [[0, 0, 100, 100], [0, 0, 100, 100], [200, 200, 255, 255], [200, 200, 255, 255]];
  assert.deepEqual(M.resampleNearest(matrix, 2, 2), [[0, 100], [200, 255]]);
  assert.deepEqual(M.resampleAverage(matrix, 2, 2), [[0, 100], [200, 255]]);
  assert.deepEqual(M.resampleAverage([[0, 100], [100, 200]], 1, 1), [[100]]);
});
