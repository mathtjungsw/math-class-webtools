const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../math-history/random-location-history');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const script = id => html.match(new RegExp('<script id="' + id + '"[^>]*>([\\s\\S]*?)</script>'))?.[1];
const context = vm.createContext({});
vm.runInContext(script('static-core'), context);
const C = context.StaticHistoryCore;
const data = JSON.parse(script('history-data'));
const jinju = data.locations[0];
const timeline = C.prepare(jinju);

test('실제로 배포하는 HTML의 시간축은 기원전 1년 다음에 서기 1년을 표시한다', () => {
  const before = C.monthOf(-1, 12);
  assert.equal(C.parts(before).year, -1);
  assert.equal(C.parts(before + 1).year, 1);
  assert.equal(C.parts(before + 1).month, 1);
  assert.equal(C.monthOf(1) - C.monthOf(-1), 12);
  assert.throws(() => C.monthOf(0));
  for (let month = before - 24; month <= before + 24; month++) assert.notEqual(C.parts(month).year, 0);
});

test('빠른 재생과 스킵 모두 중간 역사 기록을 빠짐없이 방문하고 1950년에 끝난다', () => {
  for (const skip of [false, true]) {
    let month = timeline.start;
    const seen = new Set([timeline.chapters[0].entries[0].record.id]);
    for (let steps = 0; steps < 100; steps++) {
      const next = C.advance(timeline, month, 10, 12000, skip);
      assert.ok(next.month >= month && next.month <= timeline.end);
      month = next.month;
      for (const entry of timeline.chapters[C.indexAt(timeline.chapters, month)].entries) seen.add(entry.record.id);
      if (next.ended) break;
    }
    assert.equal(month, timeline.end);
    assert.equal(C.parts(month).year, 1950);
    assert.equal(seen.size, timeline.entries.length);
    assert.equal(C.advance(timeline, month, 99999, 12000, skip).month, timeline.end);
  }
});

test('스킵을 끄면 설정한 속도대로 흐르고 켜면 자료 없는 구간을 건너뛴다', () => {
  const ordinary = C.advance(timeline, timeline.start, 1, 12, false);
  assert.equal(ordinary.month, timeline.start + 12);
  assert.equal(ordinary.skipped, false);
  const skipped = C.advance(timeline, timeline.start, 1, 12, true);
  assert.equal(skipped.month, timeline.chapters[1].month);
  assert.equal(skipped.skipped, true);
  assert.equal(skipped.arrived, true);
});

test('양력으로 확인한 월만 시간축에 쓰고 음력 날짜는 원래 표기를 보존한다', () => {
  const lunar = timeline.entries.find(e => e.record.id === 'JN-019');
  const solar = timeline.entries.find(e => e.record.id === 'JN-022');
  assert.equal(lunar.record.date.month, 10);
  assert.equal(C.parts(lunar.month).month, 1);
  assert.equal(C.parts(solar.month).month, 3);
  assert.match(lunar.record.date.label, /음력/);
});

test('같은 시점의 기록도 하나의 장면에 모두 담는다', () => {
  const extra = JSON.parse(JSON.stringify(jinju));
  extra.records.push({...extra.records.find(r => r.id === 'JN-022'), id: 'same-time-test'});
  const grouped = C.prepare(extra);
  const scene = grouped.chapters.find(c => c.entries.some(e => e.record.id === 'JN-022'));
  assert.equal(scene.entries.length, 2);
});

test('자료의 불확실성과 원 시료 연대, 사료의 출처를 HTML에 유지한다', () => {
  assert.equal(jinju.timelinePolicy.firstHabitationYear, null);
  assert.equal(jinju.timelinePolicy.lastPlayableYear, 1950);
  assert.equal(timeline.entries.length, 53);
  assert.equal(timeline.contexts.length, 4);
  assert.equal(jinju.sources.length, 45);
  const early = timeline.entries.find(e => e.record.id === 'JN-002');
  assert.equal(early.approximate, true);
  assert.equal(early.record.date.sample.radiocarbonAgeBP, 4450);
  assert.notEqual(early.record.date.startYear, early.record.date.endYear);
  const ids = new Set(jinju.sources.map(s => s.id));
  for (const record of jinju.records) {
    assert.ok(record.evidence.length > 0);
    assert.ok(record.evidence.every(e => ids.has(e.sourceId)));
    if (record.date) assert.ok(record.date.endYear <= 1950);
  }
  assert.ok(jinju.sources.every(s => !s.localEvidence));
});

test('출처 차이와 국가 배경을 보존하고 1950년 소실을 전쟁 발발 뒤에 배치한다', () => {
  const get = id => timeline.entries.find(e => e.record.id === id);
  assert.equal(get('JN-016').record.date.kind, 'source_disagreement');
  assert.equal(get('JN-032').record.date.kind, 'source_disagreement');
  assert.equal(get('JN-023').record.date.day, null);
  assert.equal(get('JN-026').record.scope, 'regional_context');
  assert.equal(get('JN-054').record.scope, 'national_context');
  assert.ok(get('JN-025').month > get('JN-057').month);
  assert.ok(get('JN-057').month > get('JN-056').month);
  assert.equal(get('JN-025').record.date.anchorIsExactEventDate, false);
  assert.match(get('JN-025').record.date.anchorNote, /12월에 소실되었다는 뜻이 아니다/);
});

test('모든 연대 기록이 세 단계 읽기에 연결되고 깊은 글은 실제 5분 이상 분량이다', () => {
  const ids = new Set(jinju.sources.map(s => s.id));
  const connected = jinju.readings.chapters.flatMap(c => c.recordIds);
  assert.equal(jinju.readings.chapters.length, 6);
  assert.equal(new Set(connected).size, connected.length);
  assert.deepEqual([...connected].sort(), timeline.entries.map(e => e.record.id).sort());
  for (const c of jinju.readings.chapters) {
    const length = level => c[level].flatMap(s => s.paragraphs).join('').length;
    assert.ok(length('basic') < length('detail') && length('detail') < length('deep'));
    assert.ok(length('deep') / jinju.readings.readingRateCharactersPerMinute >= 5);
    assert.equal(C.readingMinutes(c.deep), Math.ceil(length('deep') / 600));
    assert.ok(c.recordIds.includes(c.anchorRecordId));
    for (const level of ['basic', 'detail', 'deep']) {
      for (const section of c[level]) assert.ok(section.sourceIds.length && section.sourceIds.every(id => ids.has(id)));
    }
  }
});

test('HTML 한 파일에 지도와 실행 코드가 포함되어 외부 API 없이 열린다', () => {
  assert.ok(JSON.parse(script('land-data')).polygons.length > 100);
  assert.ok(script('static-app'));
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+rel="stylesheet"|__(?:STATIC|HISTORY|LAND)_/);
  assert.doesNotMatch(script('static-app'), /\bfetch\s*\(|XMLHttpRequest|HISTORY_API_URL/);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length);
  new vm.Script(script('static-app'));
});
