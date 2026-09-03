const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const html = read("index.html");
const css = read("assets/site.css");
const runtime = read("assets/tool-thumbnails.js");
const candidateScript = read("assets/thumbnail-candidates.js");
const original = read("assets/thumbnails/legacy/catalog.html");
const expectedNumbers = [...Array.from({ length: 19 }, (_, i) => i + 1), 24, 25, 33, 34, 35, 36, 37, 38, 41, 68, 69, 70, 71, 72, 73];
const expectedRecolors = ["paraboloid-conic-lab", "rabbit-fox-ecosystem", "symbol-guessing-lab"];

function extractCards(source) {
  source = source.replace(/\r\n/g, "\n");
  return [...source.matchAll(/<article\b([^>]*\bdata-tool-id="([^"]+)"[^>]*)>([\s\S]*?)<\/article>/g)].map((match) => ({
    id: match[2],
    visual: match[3].slice(match[3].indexOf('<div class="tool-visual"'), match[3].indexOf('<div class="tool-content"')).trim()
  }));
}
const cards = extractCards(html);
const archivedCards = extractCards(original);
// Review numbers belong to the immutable archive, not the evolving live catalog.
const approvedIds = expectedNumbers.map(n => archivedCards[n - 1].id);

// Small DOM fixture for the runtime's node-preserving operations, without a dependency.
class Element {
  constructor(className = "") {
    this.className = className;
    this.dataset = {};
    this.children = [];
    this.parent = null;
  }
  get firstChild() { return this.children[0] || null; }
  append(node) {
    if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1);
    this.children.push(node);
    node.parent = this;
  }
  querySelector(selector) {
    const className = selector.replace(":scope > ", "").replace(".", "");
    return this.children.find(node => node.className.split(" ").includes(className)) || null;
  }
  insertAdjacentHTML(position, markup) {
    assert.equal(position, "beforeend");
    const node = new Element("scene-thumbnail");
    node.markup = markup;
    this.append(node);
  }
}

function setup(search = "", withCandidates = true, beforeRuntime) {
  const cardElements = cards.map(({ id, visual }) => {
    const card = new Element("tool-card");
    card.dataset.toolId = id;
    const thumbnail = new Element("tool-visual");
    const originalNode = new Element("original-art");
    originalNode.markup = visual;
    thumbnail.append(originalNode);
    card.append(thumbnail);
    card.originalNode = originalNode;
    return card;
  });
  const document = {
    documentElement: { dataset: {} },
    createElement: () => new Element(),
    querySelectorAll: () => cardElements
  };
  const window = { location: { search } };
  const context = vm.createContext({ document, window, URLSearchParams });
  if (withCandidates) vm.runInContext(candidateScript, context);
  if (beforeRuntime) beforeRuntime(window);
  vm.runInContext(runtime, context);
  return { context, window, document, cards: cardElements, api: window.MATH_TOOL_THUMBNAILS };
}
const plain = value => JSON.parse(JSON.stringify(value));

test("81개 원본 마크업을 별도 보관하며 메인 원본도 변경하지 않는다", () => {
  assert.equal(archivedCards.length, 81);
  assert.ok(cards.length >= archivedCards.length);
  const currentById = new Map(cards.map(card => [card.id, card]));
  assert.deepEqual(archivedCards.map(card => currentById.get(card.id)), archivedCards);
  assert.match(read("assets/thumbnails/legacy/site.css"), /background: #101c2d/);
  assert.match(read("thumbnail-review-current.html"), /assets\/thumbnails\/legacy\/catalog.html/);
});

test("명시적으로 승인된 34개만 적용한다", () => {
  const { api, window } = setup();
  assert.deepEqual(plain(api.redesigned), approvedIds);
  assert.deepEqual(plain(api.colorOnly), expectedRecolors);
  assert.equal(window.THUMBNAIL_CANDIDATES.order.length, 34);
  window.THUMBNAIL_CANDIDATES.order.forEach(id => {
    assert.ok(cards.some(card => card.id === id), id);
    assert.ok(window.THUMBNAIL_CANDIDATES.render(id), id);
  });
});

test("31개 장면을 추가하고 3개는 원본 마크업의 색상만 변경한다", () => {
  const state = setup();
  let scenes = 0;
  let recolors = 0;
  state.cards.forEach(card => {
    const visual = card.querySelector(".tool-visual");
    if (!approvedIds.includes(card.dataset.toolId)) {
      assert.equal(card.dataset.thumbnailTreatment, "preserved");
      assert.deepEqual(visual.children, [card.originalNode]);
    } else if (expectedRecolors.includes(card.dataset.toolId)) {
      recolors++;
      assert.equal(visual.dataset.thumbnailRecolor, card.dataset.toolId);
      assert.deepEqual(visual.children, [card.originalNode]);
    } else {
      scenes++;
      assert.equal(visual.dataset.sceneThumbnail, card.dataset.toolId);
      assert.equal(visual.querySelector(".thumbnail-legacy").firstChild, card.originalNode);
      assert.ok(visual.querySelector(".scene-thumbnail"));
    }
  });
  assert.equal(scenes, 31);
  assert.equal(recolors, 3);
});

test("새 시안을 추가해도 명시적 승인 없이는 메인에 반영하지 않는다", () => {
  const unapprovedId = cards.find(card => !approvedIds.includes(card.id)).id;
  const state = setup("", true, window => {
    const candidates = window.THUMBNAIL_CANDIDATES;
    window.THUMBNAIL_CANDIDATES = { ...candidates, order: [...candidates.order, unapprovedId] };
  });
  assert.deepEqual(plain(state.api.redesigned), approvedIds);
  const card = state.cards.find(card => card.dataset.toolId === unapprovedId);
  assert.equal(card.dataset.thumbnailTreatment, "preserved");
  assert.deepEqual(card.querySelector(".tool-visual").children, [card.originalNode]);
});

test("반복 렌더링은 중복 장면이나 원본 손실을 만들지 않는다", () => {
  const state = setup();
  const first = state.cards.map(card => [...card.querySelector(".tool-visual").children]);
  state.api.render();
  state.api.render();
  state.cards.forEach((card, index) => assert.deepEqual(card.querySelector(".tool-visual").children, first[index]));
});

test("legacy로 처음 열어도 새 장면과 원본 간 전환이 가능하다", () => {
  const state = setup("?thumbnails=legacy");
  assert.equal(state.document.documentElement.dataset.thumbnailMode, "legacy");
  assert.equal(state.cards.filter(card => card.querySelector(".tool-visual").querySelector(".scene-thumbnail")).length, 31);
  state.api.setMode("scene");
  assert.equal(state.document.documentElement.dataset.thumbnailMode, "scene");
  state.api.setMode("legacy");
  assert.equal(state.document.documentElement.dataset.thumbnailMode, "legacy");
  state.cards.forEach(card => assert.ok(card.originalNode.parent));
  assert.match(css, /html\[data-thumbnail-mode="legacy"\][^\n]+scene-thumbnail[^\n]+display: none/);
  assert.match(css, /\.thumbnail-legacy\s*\{\s*display: contents;/);
});

test("그림 스크립트가 실패해도 원본은 안전하게 남는다", () => {
  const state = setup("", false);
  assert.equal(state.api, undefined);
  state.cards.forEach(card => assert.deepEqual(card.querySelector(".tool-visual").children, [card.originalNode]));
});

test("모든 새 그림의 색상·선 클래스에 실제 스타일이 있다", () => {
  const { window } = setup();
  const allMarkup = window.THUMBNAIL_CANDIDATES.order.map(id => window.THUMBNAIL_CANDIDATES.render(id)).join("");
  const classes = [...allMarkup.matchAll(/class="([^"]+)"/g)].flatMap(match => match[1].split(" "));
  const containers = new Set(["scene-tiles"]);
  classes.filter(name => !containers.has(name)).forEach(name => assert.ok(css.includes("." + name), name));
  assert.doesNotMatch(allMarkup, /<text\b|<script\b|\bonload=/i);
  assert.doesNotMatch(allMarkup, /NaN|undefined/);
});

test("여섯 배경색이 밝은 파스텔이다", () => {
  const backgrounds = [...candidateScript.matchAll(/^\s{4}\w+: \["(#[0-9a-f]{6})"/gim)].map(match => match[1]);
  assert.equal(backgrounds.length, 6);
  backgrounds.forEach(hex => {
    const [r,g,b] = hex.slice(1).match(/../g).map(c => parseInt(c,16));
    assert.ok((r*299+g*587+b*114)/1000 > 230, hex);
  });
});

test("11번은 좌표축을 점근선으로 갖는 실제 역비례 함수다", () => {
  const { window } = setup();
  const markup = window.THUMBNAIL_CANDIDATES.render("common2-rational");
  const d = markup.match(/data-function="reciprocal" d="([^"]+)"/)[1];
  assert.equal((d.match(/M/g) || []).length, 2);
  const points = [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(m => [Number(m[1]), Number(m[2])]);
  assert.equal(points.length, 162);
  for (const [x,y] of points) {
    assert.ok(Math.abs((x - 210) * (105 - y) - 2000) < 0.1);
    assert.ok(x >= 42 && x <= 378 && y >= 25 && y <= 185);
  }
});

test("10번 역방향은 정방향의 출력을 입력으로 받아 원래 입력을 돌려준다", () => {
  const { window } = setup();
  const markup = window.THUMBNAIL_CANDIDATES.render("common2-inverse");
  const tag = role => markup.match(new RegExp('<(path|rect)[^>]*data-flow="' + role + '"'))[1];
  assert.equal(tag("forward-input"), tag("reverse-output"));
  assert.equal(tag("forward-output"), tag("reverse-input"));
});

test("5번 접선은 원의 반지름과 수직이다", () => {
  const { window } = setup();
  const markup = window.THUMBNAIL_CANDIDATES.render("common2-circle");
  const radius = markup.match(/data-geometry="radius" d="M([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)"/).slice(1).map(Number);
  const [cx,cy,tx,ty] = radius;
  assert.ok(Math.abs(Math.hypot(tx-cx,ty-cy)-67) < 0.001);
  assert.ok(Math.abs((tx-cx)+(ty-cy)) < 0.001);
  assert.ok(Math.abs((ty-tx) - (23.248-188)) < 0.001);
});

test("카탈로그의 버전된 자산이 서비스워커에 미리 캐시된다", () => {
  const worker = read("sw.js");
  const assets = [...html.matchAll(/(?:src|href)="\.\/(assets\/[^"]+\?v=[^"]+)"/g)].map(m => m[1]);
  for (const asset of assets) {
    if (!/\.(js|css)\?/.test(asset)) continue;
    assert.ok(worker.includes(asset), asset);
  }
  assert.ok(html.indexOf("assets/thumbnail-candidates.js") < html.indexOf("assets/tool-thumbnails.js"));
  assert.match(read("thumbnail-review-comparison.html"), /Number\.isInteger\(n\) && n > 0/);
});
