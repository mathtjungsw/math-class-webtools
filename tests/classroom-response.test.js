const test = require("node:test");
const assert = require("node:assert/strict");
const M = require("../classroom-response/model.js");

test("한글 활동 코드는 손실 없이 왕복한다", () => {
  const activity = M.createActivity({ title: "확률 확인", question: "답을 고르세요", type: "choice", options: ["가", "나"] });
  assert.deepEqual(M.decodeActivity(M.encodeActivity(activity)), activity);
});

test("응답 패킷은 활동과 선택지를 검증한다", () => {
  const activity = M.createActivity({ title: "선택", question: "고르기", type: "choice", options: ["A", "B"] });
  const packet = M.createPacket(activity, "A", "파란삼각형");
  assert.deepEqual(M.decodePacket(M.encodePacket(packet)), packet);
  assert.throws(() => M.createPacket(activity, "C", "익명"));
});

test("선택형 응답을 빈도로 집계한다", () => {
  const activity = M.createActivity({ title: "선택", question: "고르기", type: "choice", options: ["A", "B"] });
  const packets = [M.createPacket(activity, "A", "가"), M.createPacket(activity, "B", "나"), M.createPacket(activity, "A", "다")];
  const result = M.aggregate(packets);
  assert.equal(result.count, 3);
  assert.deepEqual(result.counts, { A: 2, B: 1 });
});

test("수치형 응답의 평균·중앙값·범위를 계산한다", () => {
  const activity = M.createActivity({ title: "수치", question: "값", type: "number" });
  const result = M.aggregate([1, 2, 9, 10].map((answer, index) => M.createPacket(activity, answer, String(index))));
  assert.equal(result.mean, 5.5);
  assert.equal(result.median, 5.5);
  assert.equal(result.min, 1);
  assert.equal(result.max, 10);
});

test("서로 다른 활동의 패킷을 섞으면 거부한다", () => {
  const a = M.createActivity({ title: "A", question: "값", type: "text" });
  const b = M.createActivity({ title: "B", question: "값", type: "text" });
  assert.throws(() => M.aggregate([M.createPacket(a, "답", "1"), M.createPacket(b, "답", "2")]));
});

test("CSV는 한글과 쉼표를 안전하게 인용한다", () => {
  const activity = M.createActivity({ title: "서술", question: "설명", type: "text" });
  const result = M.aggregate([M.createPacket(activity, "쉼표, 포함", "별칭")]);
  assert.match(M.toCsv(result), /"쉼표, 포함"/);
});
