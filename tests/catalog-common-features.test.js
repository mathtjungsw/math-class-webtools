const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

test("메인 카탈로그 통계는 하드코딩하지 않고 행렬·실행 조건·정렬 필터를 제공한다", () => {
  const html = read("index.html");
  assert.match(html, /data-total-tools/);
  assert.match(html, /data-total-tags/);
  assert.match(html, /data-tag-filter="matrix"/);
  assert.match(html, /data-runtime-filter="offline"/);
  assert.match(html, /data-tool-sort/);
  assert.doesNotMatch(html, /<div class="tool-grid" aria-live=/);
});

test("새 교육과정 웹툴 6종과 공통 수업 기능 진입점을 제공한다", () => {
  const html = read("index.html");
  ["curriculum-common1", "curriculum-algebra", "curriculum-calculus", "curriculum-inference", "curriculum-balance", "curriculum-counting"].forEach(id => assert.match(html, new RegExp(`data-tool-id="${id}"`)));
  assert.match(html, /href="\.\/classroom\/"/);
  assert.match(html, /href="\.\/classroom-response\/"/);
});

test("경제 수학 해외여행 자금 설계 도구가 카탈로그와 수행평가 기능에 연결된다", () => {
  const catalog = read("index.html");
  const tool = read("economic-math/exchange-interest-travel-plan/index.html");
  assert.match(catalog, /data-tool-id="exchange-interest-travel-plan"/);
  assert.match(catalog, /data-tool-tags="[^"]*economic-math[^"]*"/);
  assert.match(catalog, /href="\.\/economic-math\/exchange-interest-travel-plan\/index\.html"/);
  assert.match(tool, /const EXCHANGE_SCENARIOS/);
  assert.match(tool, /function validateSubmission\(\)/);
  assert.match(tool, /id="className"[^>]*required/);
  assert.match(tool, /id="studentNo"[^>]*required/);
  assert.match(tool, /id="studentName"[^>]*required/);
});

test("핵심 외부 라이브러리는 CDN이 아닌 고정 로컬 파일을 사용한다", () => {
  ["ai-math/image-supervised-learning/index.html", "school-work/assignment-viewer/index.html", "school-work/pdf-file-splitter/index.html"].forEach(file => {
    const html = read(file);
    assert.doesNotMatch(html, /(?:cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com)/);
  });
});

test("PWA와 수업 프리셋·익명 응답 스키마가 연결되어 있다", () => {
  assert.match(read("index.html"), /manifest\.webmanifest/);
  assert.match(read("sw.js"), /math-class-webtools/);
  assert.match(read("classroom/app.js"), /math-class-preset\/v1/);
  assert.match(read("classroom-response/model.js"), /math-class-response\/v1/);
});

test("KBO는 고정 2025 자료와 표본 수 한계를 명시한다", () => {
  const app = read("math-game/kbo-conditional-probability-src/src/App.tsx");
  const data = read("math-game/kbo-conditional-probability-src/src/components/DataTab.tsx");
  const batter = read("math-game/kbo-conditional-probability-src/src/components/BatterCardTab.tsx");
  assert.doesNotMatch(app, /setSeason|useState\("2025"\)/);
  assert.match(data, /2024·2023 자료로 자동 전환되지 않으며/);
  assert.match(batter, /상황별 타석 수가 없습니다/);
});
