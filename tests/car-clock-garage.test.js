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
const good = q => q.kind==='car' ? {model:q.modelAnswer,year:q.yearAnswer} : q.answer;
const wrongYear = q => q.requiresYear===false?{model:q.choices.find(m=>m!==q.modelAnswer),year:null}:({model:q.modelAnswer,year:q.yearChoices.find(y=>y!==q.yearAnswer)});

test('사진 파일·출처·라이선스와 차고 보상이 모두 존재한다', () => {
  assert.ok(cars.length >= 24);
  assert.ok(new Set(cars.map(c => c.model)).size >= 20);
  assert.equal(new Set(cars.map(c => c.id)).size, cars.length);
  for (const car of cars) {
    assert.ok(fs.statSync(path.join(root, car.image)).size > 5000);
    assert.match(car.source, /^https:\/\/commons.wikimedia.org\/wiki\/File:/);
    assert.match(car.license, /^(CC BY|CC0|Public domain)/);
    assert.ok(car.author);
    if(car.requiresYear!==false){assert.ok(car.year);assert.match(car.yearSource,/^https?:\/\//);}
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
      assert.equal(C.answer(state, good(q)).reward, 10);
      const xp = state.xp;
      assert.equal(C.answer(state, good(q)).changed, false);
      assert.equal(state.xp, xp);
      state = C.validate(JSON.parse(JSON.stringify(state)), cars);
      assert.equal(C.answer(state, good(q)).changed, false);
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
  const wrong = wrongYear(q);
  assert.equal(C.answer(state, wrong).correct, false);
  assert.equal(state.xp, 0); assert.equal(state.stats.car.total, 0);
  assert.equal(C.answer(state, wrong).changed, false);
  const restored = C.validate(JSON.parse(JSON.stringify(state)), cars);
  assert.equal(restored.active.attempts.length, 1);
  assert.equal(C.answer(restored, good(q)).reward, 5);
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

test('모든 사진에서 차종과 출시연도를 각각 중복 없는 2~4지선다로 생성한다', () => {
  for (const source of cars) for (const choices of [2,3,4]) for (let i=0;i<5;i++) {
    const q = C.makeCar(cars, {...C.DEFAULTS, choices},[],Math.random,source.id);
    const car = cars.find(c => c.id === q.carId);
    assert.equal(q.mode,car.requiresYear===false?'model-only':'dual');assert.equal(q.carId,source.id);
    assert.equal(q.choices.filter(c => c === q.modelAnswer).length, 1);
    if(q.requiresYear!==false)assert.equal(q.yearChoices.filter(c => c === q.yearAnswer).length, 1);
    assert.equal(new Set(q.choices).size, choices);
    if(q.requiresYear!==false){assert.equal(new Set(q.yearChoices).size, choices);assert.ok(car.yearSource); assert.equal(q.yearAnswer, `${car.year}년`);}else{assert.equal(q.yearAnswer,null);assert.deepEqual(q.yearChoices,[]);}
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
  assert.equal(C.answer(state,good(q)).unlocked[0].id, 'ray');
});

test('손상·과대·잘못된 백업을 거부하고 정상 기록은 왕복 보존한다', () => {
  const state = C.fresh(); C.ensureQuestion(state, cars);
  assert.deepEqual(C.validate(JSON.parse(JSON.stringify(state)), cars), state);
  const bad = change => { const x = JSON.parse(JSON.stringify(state)); change(x); assert.throws(() => C.validate(x, cars)); };
  bad(x => x.xp = -5); bad(x => x.selected = 'gv80'); bad(x => x.carCount = 6);
  bad(x => x.settings.choices = 100); bad(x => x.active.answer = '임의 정답');
  bad(x => x.active.choices.push(x.active.choices[0])); bad(x => x.active.attempts = ['없는 답']);
  bad(x=>x.active.yearChoices.push(x.active.yearAnswer));bad(x=>x.active.picks.year='1900년');
  bad(x => x.active.resolved = true); bad(x => x.stats.car.first = 10);
  bad(x => x.history = Array(2001).fill({}));
});

test('어떤 오답 횟수도 자동차 5문제와 시계의 학습 순서를 바꾸지 않는다', () => {
  const state = C.fresh();
  for (let n=0;n<5;n++) {
    const q = C.ensureQuestion(state,cars);
    if(q.requiresYear===false)C.answer(state,wrongYear(q));else q.yearChoices.filter(c=>c!==q.yearAnswer).forEach(year=>C.answer(state,{model:q.modelAnswer,year}));
    assert.equal(state.carCount,n);
    C.answer(state,good(q)); C.advance(state);
  }
  assert.equal(C.ensureQuestion(state,cars).kind,'clock');
  assert.equal(state.stats.car.assisted,5);
  assert.equal(state.xp,25);
});

test('자동차는 두 선택을 제출해 모두 맞혀야 완료·보상 처리된다',()=>{
  const state=C.fresh();state.active=C.makeCar(cars,state.settings,[],Math.random,'morning-ja');const q=state.active;
  assert.equal(state.settings.choices,4);
  assert.equal(C.answer(state,q.modelAnswer).incomplete,true);
  assert.equal(C.answer(state,{model:q.modelAnswer}).incomplete,true);
  assert.equal(C.select(state,'model',q.modelAnswer),true);
  assert.equal(state.xp,0);assert.equal(q.attempts.length,0);
  const saved=C.validate(JSON.parse(JSON.stringify(state)),cars);
  assert.equal(saved.active.picks.model,q.modelAnswer);assert.equal(saved.active.picks.year,null);
  assert.deepEqual(C.answer(saved,wrongYear(saved.active)).parts,{model:true,year:false});
  assert.equal(saved.xp,0);assert.equal(saved.stats.car.total,0);assert.equal(C.advance(saved),false);
  const wrongModel=saved.active.choices.find(m=>m!==q.modelAnswer);
  assert.deepEqual(C.answer(saved,{model:wrongModel,year:q.yearAnswer}).parts,{model:false,year:true});
  assert.equal(C.answer(saved,good(saved.active)).reward,5);
  assert.equal(saved.stats.car.total,1);assert.equal(saved.history.length,1);
  assert.equal(saved.history[0].attempts,3);assert.equal(saved.history[0].mode,'dual');
});

test('4×4개의 조합을 모두 시도한 기록도 백업에서 보존하고 중복 제출은 막는다',()=>{
  const state=C.fresh();state.active=C.makeCar(cars,state.settings,[],Math.random,'morning-ja');const q=state.active;
  for(const model of q.choices)for(const year of q.yearChoices){
    if(model===q.modelAnswer&&year===q.yearAnswer)continue;
    C.answer(state,{model,year});
    assert.equal(C.answer(state,{model,year}).changed,false);
  }
  assert.equal(q.attempts.length,15);
  const saved=C.validate(JSON.parse(JSON.stringify(state)),cars);
  C.answer(saved,good(saved.active));
  assert.equal(saved.history[0].attempts,16);
  assert.deepEqual(C.validate(JSON.parse(JSON.stringify(saved)),cars),saved);
});

test('기존 버전의 경험치·차고·현재 시계·풀던 자동차를 새 방식으로 안전하게 이전한다',()=>{
  const old=C.fresh();old.version=1;old.settings={...C.DEFAULTS,choices:3,difficulty:'model'};
  old.xp=80;old.selected='ray';old.stats.car={total:8,first:8,assisted:0};
  const car=cars[0];
  old.active={kind:'car',mode:'model',carId:car.id,answer:car.model,choices:[car.model,'레이','쏘나타'],attempts:['레이'],hinted:false,resolved:false,reward:0};
  const migrated=C.validate(old,cars);
  assert.equal(migrated.version,2);assert.equal(migrated.xp,80);assert.equal(migrated.selected,'ray');
  assert.equal(migrated.settings.difficulty,'dual');assert.equal(migrated.settings.choices,4);
  assert.equal(migrated.active.carId,car.id);assert.equal(migrated.active.hinted,true);
  assert.equal(C.answer(migrated,good(migrated.active)).reward,5);
  old.active={...old.active,attempts:[car.model],resolved:true,reward:10};
  const completed=C.validate(old,cars);
  assert.equal(completed.active.resolved,true);assert.equal(C.answer(completed,good(completed.active)).changed,false);assert.equal(completed.xp,80);
  old.carCount=5;old.active=C.makeClock(5,3);
  const clock=C.validate(old,cars);assert.deepEqual(clock.active,old.active);assert.equal(clock.xp,80);
});

test('일본 경차는 출시연도 없이 차종만 고르고 저장·재개·보상을 처리한다',()=>{
  const kei={...cars[0],id:'kei-fixture',model:'혼다 N-BOX',year:null,yearSource:null,requiresYear:false,group:'kei'};
  const library=[...cars,kei],state=C.fresh();state.active=C.makeCar(library,state.settings,[],Math.random,kei.id);
  const q=state.active;assert.equal(q.requiresYear,false);assert.equal(q.mode,'model-only');assert.deepEqual(q.yearChoices,[]);
  assert.equal(C.select(state,'year','2020년'),false);C.select(state,'model',kei.model);
  const saved=C.validate(JSON.parse(JSON.stringify(state)),library);assert.equal(saved.active.picks.model,kei.model);
  assert.equal(C.answer(saved,{model:kei.model}).reward,10);assert.equal(saved.history[0].mode,'model-only');
  assert.equal(saved.stats.car.total,1);assert.equal(C.advance(saved),true);
  for(let i=1;i<5;i++){saved.active=C.makeCar(library,saved.settings,[],Math.random,kei.id);C.answer(saved,{model:kei.model});C.advance(saved);}
  assert.equal(C.ensureQuestion(saved,library).kind,'clock');assert.equal(saved.carCount,5);
});
