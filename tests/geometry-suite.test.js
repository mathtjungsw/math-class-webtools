const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const suiteDir = path.join(root, "geometry");
const modulesDir = path.join(suiteDir, "modules");
const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const suiteHtml = fs.readFileSync(path.join(suiteDir, "index.html"), "utf8");
const suiteSource = fs.readFileSync(path.join(suiteDir, "app.js"), "utf8");
const siteSource = fs.readFileSync(path.join(root, "assets", "app.js"), "utf8");

new vm.Script(suiteSource, { filename: "geometry/app.js" });

const configBoundary = suiteSource.indexOf("const MANUAL_LABELS");
assert(configBoundary > 0, "기하 통합 도구 설정의 끝을 찾을 수 없습니다.");
const context = {};
vm.createContext(context);
vm.runInContext(
  `${suiteSource.slice(0, configBoundary)}
globalThis.__CHAPTERS__ = CHAPTERS;
globalThis.__TOPICS__ = TOPICS;`,
  context
);
const chapters = context.__CHAPTERS__;
const topics = context.__TOPICS__;

assert.deepStrictEqual(
  Object.keys(chapters),
  ["conic", "space", "vector"],
  "기하 대단원 키 또는 순서가 예상과 다릅니다."
);
assert.deepStrictEqual(
  Object.values(chapters).map((chapter) => chapter.topics.length),
  [6, 7, 8],
  "기하 대단원별 학습 주제 수가 예상과 다릅니다."
);
assert.strictEqual(Object.keys(topics).length, 21, "통합 학습 주제는 21개여야 합니다.");

const referencedModules = [];
for (const [topicKey, topic] of Object.entries(topics)) {
  assert(chapters[topic.chapter], `${topicKey}: 존재하지 않는 대단원을 참조합니다.`);
  assert(
    chapters[topic.chapter].topics.includes(topicKey),
    `${topicKey}: 대단원 주제 목록에 포함되지 않았습니다.`
  );
  assert(topic.title && topic.unit && topic.description, `${topicKey}: 기본 설명이 없습니다.`);
  assert(topic.tabs.length >= 2, `${topicKey}: 통합 탭이 너무 적습니다.`);
  assert.strictEqual(
    new Set(topic.tabs.map(([id]) => id)).size,
    topic.tabs.length,
    `${topicKey}: 중복 탭 ID가 있습니다.`
  );

  for (const key of [
    "purpose",
    "preparation",
    "studentSteps",
    "flow",
    "teacherTips",
    "questions",
    "cautions"
  ]) {
    assert(topic.manual[key], `${topicKey}: 설명서의 ${key} 항목이 없습니다.`);
  }

  for (const [tabId, label, description, file] of topic.tabs) {
    assert(tabId && label && description && file, `${topicKey}: 불완전한 탭 설정이 있습니다.`);
    const modulePath = path.join(modulesDir, file);
    assert(fs.existsSync(modulePath), `${topicKey}: ${file} 파일이 없습니다.`);
    const html = fs.readFileSync(modulePath, "utf8");
    assert(/<meta[^>]+viewport/i.test(html), `${file}: 모바일 viewport가 없습니다.`);
    assert(/<title>[^<]+<\/title>/i.test(html), `${file}: 문서 제목이 없습니다.`);
    assert(/도움말|설명서|사용 방법|사용법/i.test(html), `${file}: 자체 설명서가 없습니다.`);

    const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
    scripts.forEach((match, index) => {
      assert.doesNotThrow(
        () => new vm.Script(match[1], { filename: `${file}#script-${index + 1}` }),
        `${file}: 인라인 스크립트 구문 오류`
      );
    });
    referencedModules.push(file);
  }
}

assert.strictEqual(referencedModules.length, 62, "선정된 기하 탐구 탭 수는 62개여야 합니다.");
assert.strictEqual(
  new Set(referencedModules).size,
  referencedModules.length,
  "같은 기하 모듈이 여러 주제에 중복 포함되었습니다."
);

const allModules = fs.readdirSync(modulesDir).filter((file) => file.endsWith(".html"));
assert.strictEqual(allModules.length, 62, "geometry/modules에는 선정된 62개 HTML만 있어야 합니다.");

for (const key of ["conic", "space", "vector"]) {
  assert(indexHtml.includes(`data-tool-id="geometry-${key}"`), `${key}: 메인 카드가 없습니다.`);
  assert(indexHtml.includes(`chapter=${key}`), `${key}: 통합 웹툴 링크가 없습니다.`);
}

for (const title of [
  "기하Ⅰ · 이차곡선",
  "기하Ⅱ · 공간도형과 공간좌표",
  "기하Ⅲ · 벡터"
]) {
  assert(indexHtml.includes(`<h3>${title}</h3>`), `${title}: 카드 제목이 없습니다.`);
  assert(siteSource.includes(`"${title}": {`), `${title}: 메인 설명서 모달 데이터가 없습니다.`);
}

assert(indexHtml.includes('data-tag-filter="geometry"'), "기하 과목 필터가 없습니다.");
assert(siteSource.includes("geometry: { label: \"기하\""), "기하 태그 메타데이터가 없습니다.");
assert(suiteHtml.includes("data-chapters"), "대단원 선택 영역이 없습니다.");
assert(suiteHtml.includes("data-topics"), "학습 주제 선택 영역이 없습니다.");
assert(suiteHtml.includes("data-tabs"), "탐구 탭 영역이 없습니다.");
assert(suiteHtml.includes("data-manual-sections"), "통합 설명서 영역이 없습니다.");
assert(suiteHtml.includes("data-module-help"), "현재 탭 설명서 버튼이 없습니다.");
assert(suiteHtml.includes("data-module-chrome-toggle"), "도구 소개 숨기기 버튼이 없습니다.");
assert(suiteHtml.includes("data-fullscreen"), "전체 화면 버튼이 없습니다.");
assert(suiteSource.includes("geometry-compact-tool"), "내부 도구 상단 접기 기능이 없습니다.");

console.log("PASS: 기하 통합 웹툴 3대단원, 21개 주제, 62개 탐구 탭, 카드형 설명서");
