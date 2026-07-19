const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'school-work', 'coolmessenger-organizer', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
const parserOnly = script.slice(0, script.indexOf('function render('));
const context = { console, Date, Intl };
vm.createContext(context);
vm.runInContext(parserOnly, context);

test('an optional fixture delimiter is accepted but not required', () => {
  const input = `쿨메신저 메시지 실제 내용\n구분은 시작할 때 '로\n\n'\n[교무부]\n오늘 오후까지 복무 신청을 올려주세요.\n\n'\n평가부에서 안내드립니다.\n성적표를 확인해 주세요.`;
  const result = context.parse(input);
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].department, '교무부');
  assert.equal(result.items[0].deadline, '오늘 오후까지');
});

test('casual conversation is held for confirmation instead of becoming a task', () => {
  const input = `점심 뭐 드실래요? ㅎㅎ\n\n\n[교무부]\n오늘 오후까지 복무 신청을 올려주세요.`;
  const result = context.parse(input);
  assert.equal(result.skipped.length, 1);
  assert.equal(result.items.length, 1);
  const included = context.parse(input, true);
  assert.equal(included.items.length, 2);
  assert.equal(included.items[0].kind, 'info');
});

test('deadline scoring ignores reference period and selects actual due date', () => {
  const input = `[자체점검 안내]\n대상: 2026.4.1.~6.30. 생산 문서\n7월 20일까지 검토 후 수정해 주시기 바랍니다.`;
  const result = context.parse(input);
  assert.equal(result.items[0].deadline, '7월 20일');
  assert.equal(result.items[0].kind, 'task');
});

test('extracts link, target, contact and sensitive-information warning', () => {
  const input = `[안내]\n1, 2학년 담임 선생님께서는 아래 링크에 입력해 주세요.\nhttps://docs.google.com/spreadsheets/d/example/edit\n문의 904(담당자)\n\n3107 김가람`;
  const result = context.parse(input);
  assert.match(result.items[0].resourceUrl, /^https:\/\/docs\.google\.com/);
  assert.match(result.items[0].target, /학년/);
  assert.match(result.items[0].contact, /904/);
  assert.equal(result.privacyCount, 1);
});

test('timetable notice is classified as schedule without treating grade as time', () => {
  const input = `<수업 일정 안내>\n7/14(화) 3학년 교과융합수업이 진행됩니다.\n학생 명단은 첨부파일을 참고하세요.`;
  const result = context.parse(input);
  assert.equal(result.items[0].kind, 'schedule');
  assert.equal(result.items[0].deadline, '7/14(화)');
});
