(function (root) {
  'use strict';
  const DEFAULTS = {choices: 4, difficulty: 'dual', clockStep: 5, sound: false, motion: true};
  const REWARDS = [
    {id: 'morning-ja', xp: 0, title: '첫 드라이브'},
    {id: 'ray', xp: 80, title: '동네 탐험가'},
    {id: 'avante-cn7', xp: 180, title: '도로의 친구'},
    {id: 'k5', xp: 300, title: '도시 드라이버'},
    {id: 'ioniq5', xp: 450, title: '전기차 탐험가'},
    {id: 'sorento', xp: 650, title: '여행의 달인'},
    {id: 'grandeur-gn7', xp: 900, title: '멋진 드라이버'},
    {id: 'g80', xp: 1200, title: '차고의 마스터'},
    {id: 'gv80', xp: 1600, title: '드림카 컬렉터'}
  ];
  function fresh() {
    return {version: 2, xp: 0, selected: REWARDS[0].id, settings: {...DEFAULTS}, round: 1, carCount: 0, active: null,
      recent: [], stats: {car: {total: 0, first: 0, assisted: 0}, clock: {total: 0, first: 0, assisted: 0}}, history: []};
  }
  function shuffle(items, random = Math.random) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
    return result;
  }
  function level(xp) { let i = 0; while (i + 1 < REWARDS.length && xp >= REWARDS[i + 1].xp) i++; return i; }
  function timeLabel(hour, minute) { return minute === 0 ? `${hour}시 정각` : `${hour}시 ${minute}분`; }
  function angles(hour, minute) { return {hour: (hour % 12) * 30 + minute * .5, minute: minute * 6}; }
  function makeClock(step = 5, count = 3, random = Math.random) {
    const hour = 1 + Math.floor(random() * 12), minute = Math.floor(random() * (60 / step)) * step;
    const answer = timeLabel(hour, minute);
    const nearby = [timeLabel(hour % 12 + 1, minute), timeLabel((hour + 10) % 12 + 1, minute), timeLabel(hour, (minute + step) % 60), timeLabel(hour, (minute + 60 - step) % 60), timeLabel((hour + 1) % 12 + 1, minute)];
    return {kind: 'clock', hour, minute, answer, choices: shuffle([answer, ...shuffle([...new Set(nearby)].filter(x => x !== answer), random).slice(0, count - 1)], random), attempts: [], hinted: false, resolved: false, reward: 0};
  }
  const CATEGORIES = [ ['모닝','레이','캐스퍼'], ['아반떼','쏘나타','그랜저','K3','K5','K8','G80'], ['투싼','싼타페','팰리세이드','스포티지','쏘렌토','GV80'], ['아이오닉 5','아이오닉 6','EV6'], ['카니발','레이','팰리세이드','쏘렌토'] ];
  const pairKey = (model, year) => JSON.stringify([model, year]);
  function makeCar(cars, settings, recent = [], random = Math.random, fixedId = null) {
    const pool = cars.filter(c => c.requiresYear===false || (c.year && c.yearSource));
    if (!pool.length) throw new Error('출시연도가 확인된 자동차 자료가 필요합니다.');
    const recentModels=new Set(recent.map(id=>cars.find(c=>c.id===id)?.model));
    const unseen = pool.filter(c => !recent.includes(c.id)&&!recentModels.has(c.model));
    const car = pool.find(c => c.id === fixedId) || shuffle(unseen.length ? unseen : pool, random)[0];
    const models = [...new Set(cars.map(c => c.model))].filter(m => m !== car.model);
    const similar = car.group ? cars.filter(c=>c.group===car.group).map(c=>c.model) : CATEGORIES.find(g => g.includes(car.model)) || [];
    const wrong = [...shuffle(models.filter(m => similar.includes(m)), random), ...shuffle(models.filter(m => !similar.includes(m)), random)];
    const requiresYear=car.requiresYear!==false;
    const otherGenerations = [...new Set(cars.filter(c => c.model === car.model && c.year && c.year !== car.year).map(c => c.year))];
    const nearYears = shuffle([car.year-1, car.year+1, car.year-2, car.year+2], random);
    const years = [...new Set([...otherGenerations, ...nearYears])].filter(y => y !== car.year);
    const count = settings.choices;
    return {kind:'car', mode:requiresYear?'dual':'model-only', requiresYear, carId:car.id, modelAnswer:car.model, yearAnswer:requiresYear?`${car.year}년`:null, answer:requiresYear?`${car.model} · ${car.year}년`:car.model,
      choices:shuffle([car.model,...wrong.slice(0,count-1)],random), yearChoices:requiresYear?shuffle([`${car.year}년`,...years.slice(0,count-1).map(y=>`${y}년`)],random):[],
      picks:{model:null,year:null}, attempts:[], hinted:false, resolved:false, reward:0};
  }
  function select(state, field, value) {
    const q = state.active;
    if (!q || q.kind !== 'car' || q.resolved || !['model','year'].includes(field)) return false;
    if (!(field === 'model' ? q.choices : q.yearChoices).includes(value) || q.picks[field] === value) return false;
    q.picks[field] = value;
    return true;
  }
  function ensureQuestion(state, cars, random = Math.random) {
    if (!state.active) {
      state.active = state.carCount === 5 ? makeClock(state.settings.clockStep, state.settings.choices, random) : makeCar(cars, state.settings, state.recent, random);
      if (state.active.carId) state.recent = [...state.recent, state.active.carId].slice(-40);
    }
    return state.active;
  }
  function answer(state, choice, now = new Date().toISOString()) {
    const q = state.active;
    if (!q || q.resolved) return {changed:false};
    let key, correct, parts;
    if (q.kind === 'car') {
      const requiresYear=q.requiresYear!==false;
      if (!choice || typeof choice !== 'object' || !q.choices.includes(choice.model) || (requiresYear&&!q.yearChoices.includes(choice.year))) return {changed:false,incomplete:true};
      const year=requiresYear?choice.year:null;
      key = pairKey(choice.model,year);
      parts = {model:choice.model===q.modelAnswer,year:!requiresYear||year===q.yearAnswer};
      correct = parts.model && parts.year;
      q.picks = {model:choice.model,year};
    } else {
      if (!q.choices.includes(choice)) return {changed:false};
      key = choice; correct = choice === q.answer;
    }
    if (q.attempts.includes(key)) return {changed:false,duplicate:true};
    q.attempts.push(key);
    if (!correct) return {changed:true,correct:false,parts};
    const assisted = q.hinted || q.attempts.length > 1;
    q.resolved = true;
    q.reward = q.kind === 'clock' ? assisted ? 10 : 20 : assisted ? 5 : 10;
    const before = level(state.xp);
    state.xp += q.reward;
    const stats = state.stats[q.kind];
    stats.total++;
    stats[assisted ? 'assisted' : 'first']++;
    state.history.push({at: now, kind: q.kind, carId: q.carId || null, mode: q.mode || 'time', answer: q.answer, attempts: q.attempts.length, hinted: q.hinted, first: !assisted, xp: q.reward});
    state.history = state.history.slice(-2000);
    return {changed: true, correct: true, reward: q.reward, unlocked: REWARDS.slice(before + 1, level(state.xp) + 1)};
  }
  function advance(state) {
    if (!state.active || !state.active.resolved) return false;
    if (state.active.kind === 'car') state.carCount++;
    else { state.carCount = 0; state.round++; }
    state.active = null;
    return true;
  }
  function validate(raw, cars) {
    const fail = () => { throw new Error('이 게임에서 저장한 올바른 기록 파일인지 확인해 주세요.'); };
    const integer = (n, min, max) => Number.isSafeInteger(n) && n >= min && n <= max;
    if (!raw || ![1,2].includes(raw.version) || !integer(raw.xp, 0, 100000000) || !integer(raw.round, 1, 10000000) || !integer(raw.carCount, 0, 5)) fail();
    const legacy = raw.version === 1;
    const s = raw.settings;
    if (!s || ![2, 3, 4].includes(s.choices) || !(legacy ? ['model','series','year','mixed'] : ['dual']).includes(s.difficulty) || ![5, 30, 60].includes(s.clockStep) || typeof s.sound !== 'boolean' || typeof s.motion !== 'boolean') fail();
    const ids = new Set(cars.map(c => c.id));
    if (!REWARDS.slice(0, level(raw.xp) + 1).some(r => r.id === raw.selected)) fail();
    const out = fresh();
    Object.assign(out, {xp: raw.xp, selected: raw.selected, round: raw.round, carCount: raw.carCount, settings: {choices: legacy ? 4 : s.choices, difficulty:'dual', clockStep: s.clockStep, sound: s.sound, motion: s.motion}});
    for (const kind of ['car', 'clock']) {
      const st = raw.stats?.[kind];
      if (!st || !['total', 'first', 'assisted'].every(k => integer(st[k], 0, 10000000)) || st.first + st.assisted !== st.total) fail();
      out.stats[kind] = {total: st.total, first: st.first, assisted: st.assisted};
    }
    if (!Array.isArray(raw.history) || raw.history.length > 2000 || !Array.isArray(raw.recent) || raw.recent.length > 40) fail();
    out.recent = raw.recent.filter(id => ids.has(id));
    out.history = raw.history.map(h => {
      if (!h || !['car', 'clock'].includes(h.kind) || typeof h.at !== 'string' || !Number.isFinite(Date.parse(h.at)) || typeof h.answer !== 'string' || h.answer.length > 100 || !integer(h.attempts, 1, 16) || typeof h.hinted !== 'boolean' || typeof h.first !== 'boolean' || ![5, 10, 20].includes(h.xp) || (h.carId !== null && !ids.has(h.carId))) fail();
      return {at: h.at, kind: h.kind, carId: h.carId, mode: ['model-only','dual','model', 'series', 'year', 'time'].includes(h.mode) ? h.mode : 'model', answer: h.answer, attempts: h.attempts, hinted: h.hinted, first: h.first, xp: h.xp};
    });
    if (raw.active !== null) {
      const q = raw.active;
      const options = a => Array.isArray(a) && a.length>=2 && a.length<=4 && a.every(x=>typeof x==='string' && x.length<=100) && new Set(a).size===a.length;
      if (!q || !['car','clock'].includes(q.kind) || !options(q.choices) || !Array.isArray(q.attempts) || q.attempts.length>16 || new Set(q.attempts).size!==q.attempts.length || typeof q.hinted!=='boolean' || typeof q.resolved!=='boolean' || (q.resolved ? ![5,10,20].includes(q.reward) : q.reward!==0)) fail();
      if (q.kind==='clock' || legacy) {
        if (!q.choices.includes(q.answer) || q.attempts.some(c=>!q.choices.includes(c)) || q.resolved!==q.attempts.includes(q.answer)) fail();
      }
      if (q.kind === 'clock') {
        if (raw.carCount !== 5 || !integer(q.hour, 1, 12) || !integer(q.minute, 0, 59) || q.minute % 5 || q.answer !== timeLabel(q.hour, q.minute)) fail();
        out.active = {kind: 'clock', hour: q.hour, minute: q.minute};
      } else {
        const car = cars.find(c => c.id === q.carId);
        if (raw.carCount===5 || !car || (car.requiresYear!==false&&!car.yearSource)) fail();
        if (legacy) {
          if (!['model','series','year'].includes(q.mode) || q.answer!==(q.mode==='model'?car.model:q.mode==='series'?car.series:`${car.year}년`)) fail();
          out.active=makeCar(cars,out.settings,[],Math.random,car.id);
          out.active.hinted=q.hinted || q.attempts.some(choice=>choice!==q.answer);
          if(q.resolved){out.active.picks={model:car.model,year:`${car.year}년`};out.active.attempts=[pairKey(car.model,`${car.year}년`)];out.active.resolved=true;out.active.reward=q.reward;}
          return out;
        }
        const requiresYear=car.requiresYear!==false;
        if(q.mode!==(requiresYear?'dual':'model-only') || (q.requiresYear!==undefined&&q.requiresYear!==requiresYear) || q.modelAnswer!==car.model || q.yearAnswer!==(requiresYear?`${car.year}년`:null) || q.answer!==(requiresYear?`${car.model} · ${car.year}년`:car.model) || !q.choices.includes(q.modelAnswer) || (requiresYear?(!options(q.yearChoices)||!q.yearChoices.includes(q.yearAnswer)||q.yearChoices.length!==q.choices.length):(!Array.isArray(q.yearChoices)||q.yearChoices.length!==0)) || !q.picks || ![null,...q.choices].includes(q.picks.model) || ![null,...q.yearChoices].includes(q.picks.year)) fail();
        for(const attempt of q.attempts){try{const pair=JSON.parse(attempt);if(!Array.isArray(pair)||pair.length!==2||!q.choices.includes(pair[0])||(requiresYear?!q.yearChoices.includes(pair[1]):pair[1]!==null)||pairKey(...pair)!==attempt)fail();}catch(_){fail();}}
        const correctKey=pairKey(q.modelAnswer,q.yearAnswer);
        if(q.resolved!==q.attempts.includes(correctKey) || (q.resolved&&(q.picks.model!==q.modelAnswer||q.picks.year!==q.yearAnswer)))fail();
        out.active={kind:'car',mode:q.mode,requiresYear,carId:q.carId,modelAnswer:q.modelAnswer,yearAnswer:q.yearAnswer,yearChoices:[...q.yearChoices],picks:{model:q.picks.model,year:q.picks.year}};
      }
      Object.assign(out.active, {answer: q.answer, choices: [...q.choices], attempts: [...q.attempts], hinted: q.hinted, resolved: q.resolved, reward: q.reward});
    }
    return out;
  }
  const api = {DEFAULTS, REWARDS, fresh, shuffle, level, timeLabel, angles, makeClock, makeCar, ensureQuestion, select, pairKey, answer, advance, validate};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GarageCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
