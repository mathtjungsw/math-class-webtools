const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../math-game/car-clock-garage');
const C = require(path.join(root, 'core.js'));
const sandbox = {window: {}};
vm.runInNewContext(fs.readFileSync(path.join(root, 'cars.js'), 'utf8'), sandbox);
const cars = JSON.parse(JSON.stringify(sandbox.window.GARAGE_CARS));

test('사진 파일·출처·라이선스와 차고 보상이 모두 존재한다', () => {
  assert.ok(cars.length >= 24);
  assert.ok(new Set(cars.map(c => c.model)).size >= 20);
  assert.equal(new Set(cars.map(c => c.id)).size, cars.length);
  for (const car of cars) {
    assert.ok(fs.statSync(path.join(root, car.image)).size > 5000);
    assert.match(car.source, /^https:\/\/commons.wikimedia.org\/wiki\/File:/);
    assert.match(car.license, /^(CC BY|CC0|Public domain)/);
    assert.ok(car.author);
    if (car.year) assert.match(car.yearSource, /^https:\/\/(www.hyundaimotorgroup.com|worldwide.kia.com)\//);
  }
  for (const reward of C.REWARDS) assert.ok(cars.some(c => c.id === reward.id));
});

test('자동차 5문제 후 시계 1문제, 중복 채점 방지, 다음 라운드와 이어 하기', () => {
  let state = C.fresh();
  for (let round = 1; round <= 3; round++) {
    for (let n = 0; n < 5; n++) {
      const q = C.ensureQuestion(state, cars);
      assert.equal(q.kind, 'car'); assert.equal(state.carCount, n);
      assert.equal(C.advance(state), false);
      assert.equal(C.answer(state, q.answer).reward, 10);
      const xp = state.xp;
      assert.equal(C.answer(state, q.answer).changed, false);
      assert.equal(state.xp, xp);
      state = C.validate(JSON.parse(JSON.stringify(state)), cars);
      assert.equal(C.answer(state, q.answer).changed, false);
      assert.equal(C.advance(state), true);
    }
    const clock = C.ensureQuestion(state, cars);
    assert.equal(clock.kind, 'clock'); assert.equal(clock.minute % 5, 0);
    assert.equal(C.answer(state, clock.answer).reward, 20);
    C.advance(state);
    assert.equal(state.carCount, 0); assert.equal(state.round, round + 1);
  }
  assert.equal(state.xp, 210); assert.equal(state.stats.car.first, 15); assert.equal(state.stats.clock.first, 3);
});

test('오답·힌트 이후 성공은 도움 후 정답으로 기록하고 경험치를 차감하지 않는다', () => {
  const state = C.fresh(), q = C.ensureQuestion(state, cars);
  const wrong = q.choices.find(x => x !== q.answer);
  assert.equal(C.answer(state, wrong).correct, false);
  assert.equal(state.xp, 0); assert.equal(state.stats.car.total, 0);
  assert.equal(C.answer(state, wrong).changed, false);
  const restored = C.validate(JSON.parse(JSON.stringify(state)), cars);
  assert.equal(restored.active.attempts.length, 1);
  assert.equal(C.answer(restored, q.answer).reward, 5);
  assert.equal(restored.stats.car.first, 0); assert.equal(restored.stats.car.assisted, 1);
  C.advance(restored); restored.carCount = 5;
  const clock = C.ensureQuestion(restored, cars); clock.hinted = true;
  assert.equal(C.answer(restored, clock.answer).reward, 10);
  assert.equal(restored.stats.clock.assisted, 1);
});

test('모든 시각에서 시침은 분에 따라 이동하고 분침은 5분 간격으로 배치된다', () => {
  for (let hour = 1; hour <= 12; hour++) for (let minute = 0; minute < 60; minute += 5) {
    const a = C.angles(hour, minute);
    assert.equal(a.hour, hour % 12 * 30 + minute / 2);
    assert.equal(a.minute, minute * 6);
  }
  assert.equal(C.angles(3, 30).hour, 105);
});

test('시계 설정별로 중복 없는 2~4지선다와 정확한 정답을 생성한다', () => {
  for (const step of [5,30,60]) for (const count of [2,3,4]) for (let i = 0; i < 120; i++) {
    const q = C.makeClock(step, count);
    assert.equal(q.minute % step, 0);
    assert.equal(q.choices.length, count);
    assert.equal(new Set(q.choices).size, count);
    assert.equal(q.choices.filter(c => c === q.answer).length, 1);
    assert.equal(q.answer, C.timeLabel(q.hour, q.minute));
  }
});

test('이름·세대·출시연도·혼합 모드는 근거 있는 서로 다른 선택지를 생성한다', () => {
  for (const difficulty of ['model','series','year','mixed']) for (const choices of [2,3,4]) for (let i=0;i<80;i++) {
    const q = C.makeCar(cars, {...C.DEFAULTS, difficulty, choices});
    const car = cars.find(c => c.id === q.carId);
    assert.equal(q.choices.filter(c => c === q.answer).length, 1);
    assert.equal(new Set(q.choices).size, q.choices.length);
    assert.ok(q.choices.length >= 2);
    if (q.mode === 'year') { assert.ok(car.yearSource); assert.equal(q.answer, `${car.year}년`); }
    if (q.mode === 'series') assert.ok(cars.filter(c => c.model === car.model).length >= 2);
  }
});

test('레벨 경계에서 다음 차가 해금되고 마지막 차 이후도 경험치를 모을 수 있다', () => {
  for (let i=1;i<C.REWARDS.length;i++) {
    assert.equal(C.level(C.REWARDS[i].xp - 1), i-1);
    assert.equal(C.level(C.REWARDS[i].xp), i);
  }
  assert.equal(C.level(999999), C.REWARDS.length - 1);
  const state = C.fresh(); state.xp = 70;
  const q = C.ensureQuestion(state,cars);
  assert.equal(C.answer(state,q.answer).unlocked[0].id, 'ray');
});

test('손상·과대·잘못된 백업을 거부하고 정상 기록은 왕복 보존한다', () => {
  const state = C.fresh(); C.ensureQuestion(state, cars);
  assert.deepEqual(C.validate(JSON.parse(JSON.stringify(state)), cars), state);
  const bad = change => { const x = JSON.parse(JSON.stringify(state)); change(x); assert.throws(() => C.validate(x, cars)); };
  bad(x => x.xp = -5); bad(x => x.selected = 'gv80'); bad(x => x.carCount = 6);
  bad(x => x.settings.choices = 100); bad(x => x.active.answer = '임의 정답');
  bad(x => x.active.choices.push(x.active.answer)); bad(x => x.active.attempts = ['없는 답']);
  bad(x => x.active.resolved = true); bad(x => x.stats.car.first = 10);
  bad(x => x.history = Array(2001).fill({}));
});

test('어떤 오답 횟수도 자동차 5문제와 시계의 학습 순서를 바꾸지 않는다', () => {
  const state = C.fresh();
  for (let n=0;n<5;n++) {
    const q = C.ensureQuestion(state,cars);
    q.choices.filter(c=>c!==q.answer).forEach(c=>C.answer(state,c));
    assert.equal(state.carCount,n);
    C.answer(state,q.answer); C.advance(state);
  }
  assert.equal(C.ensureQuestion(state,cars).kind,'clock');
  assert.equal(state.stats.car.assisted,5);
  assert.equal(state.xp,25);
});
