const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const suiteDir = path.join(root, "common-math2");
const modulesDir = path.join(suiteDir, "modules");
const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const suiteHtml = fs.readFileSync(path.join(suiteDir, "index.html"), "utf8");
const suiteSource = fs.readFileSync(path.join(suiteDir, "app.js"), "utf8");
const siteSource = fs.readFileSync(path.join(root, "assets", "app.js"), "utf8");

new vm.Script(suiteSource, { filename: "common-math2/app.js" });

const configBoundary = suiteSource.indexOf("const MANUAL_LABELS");
assert(configBoundary > 0, "통합 도구 설정의 끝을 찾을 수 없습니다.");
const context = {};
vm.createContext(context);
vm.runInContext(
  `${suiteSource.slice(0, configBoundary)}\nglobalThis.__SUITES__ = SUITES;`,
  context
);
const suites = context.__SUITES__;

const expectedSuiteKeys = [
  "coordinate",
  "circle",
  "transform",
  "set",
  "logic",
  "function",
  "inverse",
  "rational",
  "radical"
];
const expectedTitles = {
  coordinate: "평면좌표와 직선의 방정식",
  circle: "원의 방정식",
  transform: "도형의 이동",
  set: "집합",
  logic: "명제",
  function: "함수와 합성함수",
  inverse: "역함수",
  rational: "유리함수",
  radical: "무리함수"
};
assert.deepStrictEqual(
  Object.keys(suites),
  expectedSuiteKeys,
  "통합 도구 9개의 순서 또는 키가 예상과 다릅니다."
);

const referencedModules = [];
for (const [suiteKey, suite] of Object.entries(suites)) {
  assert(suite.title && suite.unit && suite.description, `${suiteKey}: 기본 설명이 없습니다.`);
  assert.strictEqual(suite.title, expectedTitles[suiteKey], `${suiteKey}: 개념명이 아닙니다.`);
  assert(suite.tabs.length >= 6, `${suiteKey}: 통합 탭이 너무 적습니다.`);
  assert.strictEqual(
    new Set(suite.tabs.map(([id]) => id)).size,
    suite.tabs.length,
    `${suiteKey}: 중복 탭 ID가 있습니다.`
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
    assert(suite.manual[key], `${suiteKey}: 설명서의 ${key} 항목이 없습니다.`);
  }

  for (const [tabId, label, description, file] of suite.tabs) {
    assert(tabId && label && description && file, `${suiteKey}: 불완전한 탭 설정이 있습니다.`);
    const modulePath = path.join(modulesDir, file);
    assert(fs.existsSync(modulePath), `${suiteKey}: ${file} 파일이 없습니다.`);
    const html = fs.readFileSync(modulePath, "utf8");
    assert(/<meta[^>]+viewport/i.test(html), `${file}: 모바일 viewport가 없습니다.`);
    assert(/<h1\b/i.test(html), `${file}: h1 제목이 없습니다.`);

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

assert.strictEqual(referencedModules.length, 63, "선정된 학습 탭 수는 63개여야 합니다.");
assert.strictEqual(
  new Set(referencedModules).size,
  referencedModules.length,
  "같은 모듈이 두 통합 도구에 중복 포함되었습니다."
);

const allModules = fs.readdirSync(modulesDir).filter((file) => file.endsWith(".html"));
assert.strictEqual(allModules.length, 63, "modules 폴더에는 선정된 63개 HTML만 있어야 합니다.");

for (const suiteKey of expectedSuiteKeys) {
  assert(
    indexHtml.includes(`data-tool-id="common2-${suiteKey}"`),
    `${suiteKey}: 메인 카드가 없습니다.`
  );
  assert(
    indexHtml.includes(`tool=${suiteKey}&amp;manual=1`),
    `${suiteKey}: 설명서 링크가 없습니다.`
  );
  assert(
    indexHtml.includes(`<h3>${expectedTitles[suiteKey]}</h3>`),
    `${suiteKey}: 카드 제목이 개념명과 다릅니다.`
  );
  assert(
    siteSource.includes(`"${expectedTitles[suiteKey]}": {`),
    `${suiteKey}: 메인 화면 설명서 모달 데이터가 없습니다.`
  );
}

assert(indexHtml.includes('data-tag-filter="common-math2"'), "공통수학2 과목 필터가 없습니다.");
assert(siteSource.includes('"common-math2":'), "공통수학2 태그 메타데이터가 없습니다.");
assert(suiteHtml.includes("data-manual-sections"), "통합 설명서 영역이 없습니다.");
assert(suiteHtml.includes("data-frame"), "통합 탭 프레임이 없습니다.");
assert(suiteHtml.includes("data-focus-toggle"), "집중 보기 버튼이 없습니다.");
assert(suiteHtml.includes("data-module-chrome-toggle"), "도구 소개 숨기기 버튼이 없습니다.");
assert(suiteHtml.includes("data-fullscreen"), "전체 화면 버튼이 없습니다.");
assert(suiteSource.includes("common2-compact-tool"), "내부 도구 상단 접기 기능이 없습니다.");

console.log(
  `PASS: 공통수학2 통합 웹툴 ${expectedSuiteKeys.length}개, 학습 탭 ${referencedModules.length}개, 설명서 ${expectedSuiteKeys.length}개`
);
