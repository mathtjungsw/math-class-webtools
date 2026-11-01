(function (root) {
  'use strict';
  const DEFAULTS = {choices: 3, difficulty: 'model', clockStep: 5, sound: false, motion: true};
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
    return {version: 1, xp: 0, selected: REWARDS[0].id, settings: {...DEFAULTS}, round: 1, carCount: 0, active: null,
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
  function makeCar(cars, settings, recent = [], random = Math.random) {
    const groups = new Map();
    for (const car of cars) { if (!groups.has(car.model)) groups.set(car.model, []); groups.get(car.model).push(car); }
    let mode = settings.difficulty;
    if (mode === 'mixed') mode = ['model', 'series', 'year'][Math.floor(random() * 3)];
    let pool = mode === 'series' ? cars.filter(c => groups.get(c.model).length > 1) : mode === 'year' ? cars.filter(c => c.year && c.yearSource) : cars;
    if (!pool.length) { mode = 'model'; pool = cars; }
    const unseen = pool.filter(c => !recent.includes(c.id));
    const car = shuffle(unseen.length ? unseen : pool, random)[0];
    let answer, wrong;
    if (mode === 'series') {
      answer = car.series;
      wrong = [...new Set(groups.get(car.model).filter(c => c.id !== car.id).map(c => c.series))];
    } else if (mode === 'year') {
      answer = `${car.year}년`;
      wrong = shuffle([...new Set(cars.filter(c => c.year && c.year !== car.year).map(c => `${c.year}년`))], random);
    } else {
      answer = car.model;
      wrong = shuffle([...groups.keys()].filter(x => x !== answer), random);
    }
    return {kind: 'car', mode, carId: car.id, answer, choices: shuffle([answer, ...wrong.slice(0, settings.choices - 1)], random), attempts: [], hinted: false, resolved: false, reward: 0};
  }
  function ensureQuestion(state, cars, random = Math.random) {
    if (!state.active) {
      state.active = state.carCount === 5 ? makeClock(state.settings.clockStep, state.settings.choices, random) : makeCar(cars, state.settings, state.recent, random);
      if (state.active.carId) state.recent = [...state.recent, state.active.carId].slice(-8);
    }
    return state.active;
  }
  function answer(state, choice, now = new Date().toISOString()) {
    const q = state.active;
    if (!q || q.resolved || !q.choices.includes(choice) || q.attempts.includes(choice)) return {changed: false};
    q.attempts.push(choice);
    if (choice !== q.answer) return {changed: true, correct: false};
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
    if (!raw || raw.version !== 1 || !integer(raw.xp, 0, 100000000) || !integer(raw.round, 1, 10000000) || !integer(raw.carCount, 0, 5)) fail();
    const s = raw.settings;
    if (!s || ![2, 3, 4].includes(s.choices) || !['model', 'series', 'year', 'mixed'].includes(s.difficulty) || ![5, 30, 60].includes(s.clockStep) || typeof s.sound !== 'boolean' || typeof s.motion !== 'boolean') fail();
    const ids = new Set(cars.map(c => c.id));
    if (!REWARDS.slice(0, level(raw.xp) + 1).some(r => r.id === raw.selected)) fail();
    const out = fresh();
    Object.assign(out, {xp: raw.xp, selected: raw.selected, round: raw.round, carCount: raw.carCount, settings: {choices: s.choices, difficulty: s.difficulty, clockStep: s.clockStep, sound: s.sound, motion: s.motion}});
    for (const kind of ['car', 'clock']) {
      const st = raw.stats?.[kind];
      if (!st || !['total', 'first', 'assisted'].every(k => integer(st[k], 0, 10000000)) || st.first + st.assisted !== st.total) fail();
      out.stats[kind] = {total: st.total, first: st.first, assisted: st.assisted};
    }
    if (!Array.isArray(raw.history) || raw.history.length > 2000 || !Array.isArray(raw.recent) || raw.recent.length > 8) fail();
    out.recent = raw.recent.filter(id => ids.has(id));
    out.history = raw.history.map(h => {
      if (!h || !['car', 'clock'].includes(h.kind) || typeof h.at !== 'string' || !Number.isFinite(Date.parse(h.at)) || typeof h.answer !== 'string' || h.answer.length > 100 || !integer(h.attempts, 1, 4) || typeof h.hinted !== 'boolean' || typeof h.first !== 'boolean' || ![5, 10, 20].includes(h.xp) || (h.carId !== null && !ids.has(h.carId))) fail();
      return {at: h.at, kind: h.kind, carId: h.carId, mode: ['model', 'series', 'year', 'time'].includes(h.mode) ? h.mode : 'model', answer: h.answer, attempts: h.attempts, hinted: h.hinted, first: h.first, xp: h.xp};
    });
    if (raw.active !== null) {
      const q = raw.active;
      if (!q || !['car', 'clock'].includes(q.kind) || !Array.isArray(q.choices) || q.choices.length < 2 || q.choices.length > 4 || q.choices.some(c => typeof c !== 'string' || c.length > 100) || new Set(q.choices).size !== q.choices.length || !q.choices.includes(q.answer) || !Array.isArray(q.attempts) || new Set(q.attempts).size !== q.attempts.length || q.attempts.some(c => !q.choices.includes(c)) || typeof q.hinted !== 'boolean' || typeof q.resolved !== 'boolean') fail();
      if (q.resolved !== q.attempts.includes(q.answer) || (q.resolved && ![5, 10, 20].includes(q.reward)) || (!q.resolved && q.reward !== 0)) fail();
      if (q.kind === 'clock') {
        if (raw.carCount !== 5 || !integer(q.hour, 1, 12) || !integer(q.minute, 0, 59) || q.minute % 5 || q.answer !== timeLabel(q.hour, q.minute)) fail();
        out.active = {kind: 'clock', hour: q.hour, minute: q.minute};
      } else {
        const car = cars.find(c => c.id === q.carId);
        if (raw.carCount === 5 || !car || !['model', 'series', 'year'].includes(q.mode) || q.answer !== (q.mode === 'model' ? car.model : q.mode === 'series' ? car.series : `${car.year}년`) || (q.mode === 'year' && !car.yearSource)) fail();
        out.active = {kind: 'car', mode: q.mode, carId: q.carId};
      }
      Object.assign(out.active, {answer: q.answer, choices: [...q.choices], attempts: [...q.attempts], hinted: q.hinted, resolved: q.resolved, reward: q.reward});
    }
    return out;
  }
  const api = {DEFAULTS, REWARDS, fresh, shuffle, level, timeLabel, angles, makeClock, makeCar, ensureQuestion, answer, advance, validate};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GarageCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
