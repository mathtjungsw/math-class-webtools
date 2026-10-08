const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const toolPath = "math-project/fermi-estimation/index.html";

function loadTool() {
  const html = read(toolPath);
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match, "inline script should exist");

  const elements = new Map();
  const makeElement = id => ({
    id,
    value: "",
    textContent: "",
    innerHTML: "",
    hidden: false,
    disabled: false,
    dataset: {},
    classList: { toggle() {}, add() {}, remove() {} },
    addEventListener() {},
    setAttribute() {},
    scrollIntoView() {}
  });
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, makeElement(id));
      return elements.get(id);
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    createElement(tag) { return makeElement(tag); },
    body: { appendChild() {} }
  };
  const storage = new Map();
  const context = {
    document,
    window: { scrollTo() {}, print() {} },
    navigator: {},
    localStorage: { removeItem(key) { storage.delete(key); } },
    sessionStorage: {
      getItem(key) { return storage.get(key) ?? null; },
      setItem(key, value) { storage.set(key, value); },
      removeItem(key) { storage.delete(key); }
    },
    CSS: { escape: value => String(value) },
    Blob,
    URL,
    alert() {},
    confirm() { return true; },
    setTimeout,
    clearTimeout,
    console
  };
  vm.createContext(context);
  vm.runInContext(
    match[1] + ";globalThis.__api={num,topics,state,topicState,computeRange,revisedResult,submissionAudit,generateConclusionText,cleanConclusionText,conclusionAuthoredText,renderTopics,buildReportHTML};",
    context
  );
  return { api: context.__api, elements, html };
}

test("페르미 추정 도구는 수학과제 탐구 과목과 수업 보관함에 연결된다", () => {
  const catalog = read("index.html");
  assert.match(catalog, /data-tag-filter="math-project">수학과제 탐구/);
  assert.match(catalog, /data-tool-id="fermi-estimation"/);
  assert.match(catalog, /href="\.\/math-project\/fermi-estimation\/index\.html"/);
  assert.match(read("assets/app.js"), /"math-project": \{ label: "수학과제 탐구"/);
  assert.match(read("classroom/app.js"), /\["math-project","수학과제 탐구"\]/);
});

test("빈 숫자와 기본 수정값은 계산 가능한 0으로 바뀌지 않는다", () => {
  const { api } = loadTool();
  assert.ok(Number.isNaN(api.num("", NaN)));
  assert.ok(Number.isNaN(api.revisedResult()));
  const state = api.topicState();
  state.values.students.mid = "";
  assert.ok(Number.isNaN(api.computeRange().rep));
});

test("전 주제 검색과 수정한 노래 주제가 정상 동작한다", () => {
  const { api, elements } = loadTool();
  assert.equal(api.topics.length, 30);
  assert.equal(api.topics.find(topic => topic.id === "arts_notes").title, "노래 한 곡의 전체 음표 수");
  api.state.search = "공기";
  api.renderTopics();
  assert.match(elements.get("topicGrid").innerHTML, /한 사람이 하루 동안 들이마시는 공기/);
});

test("미작성 답안은 제출 준비가 되지 않으며 결론 버튼은 작성 틀만 제공한다", () => {
  const { api, html } = loadTool();
  const audit = api.submissionAudit();
  assert.equal(audit.ready, false);
  assert.ok(audit.checks.filter(item => !item.ok).length >= 8);
  const template = api.generateConclusionText();
  assert.match(template, /\[.+자신의 문장.+\]/);
  assert.doesNotMatch(template, /\(으\)로|명로|정확한 값을 알기 어렵기 때문이다/);
  assert.doesNotMatch(html, /localStorage\.setItem\(STORAGE_KEY/);
  assert.match(html, /sessionStorage\.setItem\(STORAGE_KEY/);
});

test("필수 탐구 과정을 작성하면 제출 보고서를 만들 수 있다", () => {
  const { api } = loadTool();
  Object.assign(api.state.student, { grade: "2", classNo: "3", studentNo: "14", name: "테스트학생" });
  const state = api.topicState();
  state.reason = "학교에서 실제로 사용하는 종이의 규모가 궁금했다.";
  state.initialGuess = "500000";
  state.modelComment = "학생과 교직원의 사용량을 분리한 뒤 사용일 수를 곱한 모형이다.";
  state.values.students.basis = "직접 관찰·측정";
  state.values.students.note = "학교알리미 학생 수를 확인함";
  state.uncertainReason = "사람마다 하루에 사용하는 종이의 양이 크게 다르다.";
  state.revisionValue = "650";
  state.revisionReason = "최근 학교알리미에서 확인한 실제 학생 수를 반영했다.";
  state.finalChoice = "revised";
  state.conclusion = "학생과 교직원의 하루 사용량을 나누어 계산하니 대표 추정값의 규모를 설명할 수 있었다. 특히 학생 한 명의 사용량이 결과를 크게 바꾸므로 표본 조사를 통해 이 값을 보완해야 한다고 판단했다.";
  state.reflection = "학년별 사용량 표본을 직접 조사하면 추정의 정확도를 더 높일 수 있다.";
  assert.equal(api.submissionAudit().ready, true);
  const report = api.buildReportHTML();
  assert.match(report, /테스트학생/);
  assert.match(report, /끝점 조합 중 작은 추정/);
});

test("근거 선택, 근거 메모, 가정값 수정은 각각 독립적으로 보완한 자료로 인정한다", () => {
  const variants = [
    state => { state.values.students.basis = "직접 관찰·측정"; },
    state => { state.values.students.note = "학교알리미 확인"; },
    state => { state.values.students.mid = Number(state.values.students.mid) + 1; }
  ];
  for (const applyEvidence of variants) {
    const { api } = loadTool();
    const state = api.topicState();
    applyEvidence(state);
    const evidence = api.submissionAudit().checks.find(item => item.label.includes("가정 근거"));
    assert.equal(evidence.ok, true);
  }
});

test("결론 틀 안내문이 남아 있어도 학생이 쓴 문장을 판정하고 보고서에서는 안내문을 제거한다", () => {
  const { api } = loadTool();
  const state = api.topicState();
  const ownWriting = "학생 수와 하루 사용량을 곱하는 방식으로 문제를 나누었고, 실제 학교 자료를 사용해 대표값을 조정했다. 계산 결과는 정확한 정답이라기보다 합리적인 규모를 보여 주며, 표본 수가 적다는 한계가 있으므로 추가 조사가 필요하다.";
  state.conclusion = api.generateConclusionText() + "\n" + ownWriting;
  assert.ok(api.conclusionAuthoredText(state.conclusion).length >= 80);
  const conclusion = api.submissionAudit().checks.find(item => item.label.includes("결론을 자신의 문장"));
  assert.equal(conclusion.ok, true);
  const report = api.buildReportHTML();
  assert.match(report, /학생 수와 하루 사용량/);
  assert.doesNotMatch(report, /자신의 문장으로 쓰세요/);
});

test("학생이 쓴 대괄호 표현은 미완성 안내문으로 오인하지 않는다", () => {
  const { api } = loadTool();
  const state = api.topicState();
  state.conclusion = "[학교알리미 자료]를 참고하여 학생 수와 하루 사용량을 곱했다. 대표 추정값은 실제 규모를 설명하는 데 적절하지만 개인별 사용량 차이가 크다. 따라서 여러 학급의 표본을 더 조사하면 추정의 신뢰도를 높일 수 있다고 판단했다.";
  const conclusion = api.submissionAudit().checks.find(item => item.label.includes("결론을 자신의 문장"));
  assert.equal(conclusion.ok, true);
});
