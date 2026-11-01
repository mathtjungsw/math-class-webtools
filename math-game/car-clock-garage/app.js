(() => {
  'use strict';
  const C = window.GarageCore, cars = window.GARAGE_CARS, KEY = 'car-clock-garage/v1';
  const $ = id => document.getElementById(id), carById = id => cars.find(c => c.id === id);
  let state = C.fresh(), expected = null, saveDisabled = false, conflicted = false, pendingImport = null, latestUnlock = null, playing = false, loadWarning = '';
  try {
    expected = localStorage.getItem(KEY);
    if (expected) state = C.validate(JSON.parse(expected), cars);
  } catch (error) {
    saveDisabled = true;
    loadWarning = '저장 기록을 읽을 수 없어 임시로 시작합니다. 기존 기록은 덮어쓰지 않습니다. 지금 진행한 기록은 선생님 설정에서 백업해 주세요.';
  }
  function warning(message) { $('storage-warning').hidden = false; $('storage-warning').textContent = message; $('save-status').textContent = '기록 백업을 확인해 주세요'; }
  function conflict() {
    conflicted = true;
    warning('다른 탭에서 이 게임의 기록이 바뀌었습니다. 기록이 겹치지 않도록 이 탭은 잠시 멈췄어요. 이 페이지를 새로고침해 최신 기록을 불러와 주세요.');
    for (const button of document.querySelectorAll('#choices button, #submit-answer, #next-button, #hint-button, #start-button, #equip-unlocked')) button.disabled = true;
  }
  function writable() {
    if (conflicted) return false;
    if (!saveDisabled) {
      try { if (localStorage.getItem(KEY) !== expected) { conflict(); return false; } }
      catch (_) { saveDisabled = true; warning('자동 저장을 사용할 수 없습니다. 게임은 계속할 수 있어요. 종료 전에 선생님 설정에서 기록을 백업해 주세요.'); }
    }
    return true;
  }
  function save() {
    if (saveDisabled) return;
    try {
      if (localStorage.getItem(KEY) !== expected) return conflict();
      const raw = JSON.stringify(state);
      localStorage.setItem(KEY, raw);
      expected = raw;
    } catch (_) { saveDisabled = true; warning('자동 저장 공간을 사용할 수 없습니다. 게임을 마치기 전에 선생님 설정에서 기록을 백업해 주세요.'); }
  }
  function show(id) { if (!$(id).open) $(id).showModal(); }
  function close(id) { $(id).close(); }
  function text(tag, content, className) { const el = document.createElement(tag); el.textContent = content; if (className) el.className = className; return el; }
  function link(label, href) { const el = text('a', label); el.href = href; el.target = '_blank'; el.rel = 'noopener noreferrer'; return el; }
  function renderDashboard() {
    const index = C.level(state.xp), reward = C.REWARDS[index], next = C.REWARDS[index + 1], current = carById(state.selected);
    $('level-badge').textContent = `LV. ${index + 1}`;
    $('driver-title').textContent = reward.title;
    $('garage-count').textContent = index + 1;
    const target = next ? next.xp - reward.xp : 1, value = next ? state.xp - reward.xp : 1;
    $('xp-fill').style.width = `${Math.min(100, value / target * 100)}%`;
    $('xp-progress').setAttribute('aria-valuemax', target);
    $('xp-progress').setAttribute('aria-valuenow', value);
    $('xp-progress').setAttribute('aria-valuetext', next ? `${state.xp} 경험치, 다음 자동차까지 ${next.xp - state.xp} 경험치` : '모든 자동차를 얻었어요');
    $('xp-text').textContent = next ? `${state.xp} / ${next.xp} XP` : `${state.xp} XP · 차고 완성!`;
    $('hero-car').src = current.image;
    $('hero-car').alt = `내 자동차, ${current.brand} ${current.model}`;
    $('hero-car-name').textContent = `${current.brand} ${current.model}`;
    $('hero-level').textContent = `LEVEL ${String(index + 1).padStart(2, '0')}`;
    $('current-name').textContent = current.model;
    $('next-car-label').textContent = next ? '다음 자동차' : '차고 완성';
    $('next-car-name').textContent = next ? `${carById(next.id).brand} ${carById(next.id).model}` : '모든 자동차를 만났어요!';
    $('remaining-xp').textContent = next ? `${next.xp - state.xp} XP를 더 모으면 만나요` : '계속 도전하며 경험치를 모아 보세요';
    $('start-button').firstChild.textContent = state.active ? '이어서 출발하기 ' : '출발하기 ';
    document.body.classList.toggle('no-motion', !state.settings.motion);
  }
  function renderRoute() {
    const route = $('route'); route.replaceChildren();
    for (let i = 0; i < 6; i++) {
      if (i) route.append(text('span', '', 'route-line'));
      const done = i < state.carCount, active = i === state.carCount;
      const step = text('span', '', `route-step${done ? ' done' : ''}${active ? ' active' : ''}`);
      if (active) step.setAttribute('aria-current', 'step');
      step.append(text('span', done ? '✓' : i === 5 ? '◷' : String(i + 1), 'step-circle'));
      if (i === 5) step.append(text('span', '시계 미션'));
      step.setAttribute('aria-label', `${i === 5 ? '시계 미션' : `자동차 ${i + 1}문제`}${done ? ' 완료' : active ? ' 진행 중' : ''}`);
      route.append(step);
    }
  }
  function renderClock(q) {
    const svg = $('clock'); svg.replaceChildren();
    const ns = 'http://www.w3.org/2000/svg';
    const add = (type, attrs, value) => { const el = document.createElementNS(ns, type); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); if (value !== undefined) el.textContent = value; svg.append(el); return el; };
    add('circle', {cx:180, cy:180, r:171, fill:'#eef0e7', stroke:'#d9dfd0', 'stroke-width':1});
    add('circle', {cx:180, cy:180, r:159, fill:'#fffefa', stroke:'#cdd7c3', 'stroke-width':1});
    for (let i = 0; i < 60; i++) {
      const a = i * Math.PI / 30, outer = 149, inner = i % 5 === 0 ? 138 : 144;
      add('line', {x1:180+inner*Math.sin(a), y1:180-inner*Math.cos(a), x2:180+outer*Math.sin(a), y2:180-outer*Math.cos(a), stroke:i%5===0?'#50624e':'#acb7a6', 'stroke-width':i%5===0?3:1.2, 'stroke-linecap':'round'});
    }
    for (let n = 1; n <= 12; n++) { const a = n*Math.PI/6; add('text', {x:180+117*Math.sin(a), y:180-117*Math.cos(a)+9, 'text-anchor':'middle', fill:'#2e4438', 'font-size':26, 'font-weight':600}, n); }
    add('text', {x:180,y:240,'text-anchor':'middle',fill:'#9aab94','font-size':8,'letter-spacing':2}, 'TAKE YOUR TIME');
    const a = C.angles(q.hour, q.minute);
    add('line', {x1:180,y1:193,x2:180,y2:100,stroke:'#284f86','stroke-width':11,'stroke-linecap':'round',transform:`rotate(${a.hour} 180 180)`,'data-hand':'hour'});
    add('line', {x1:180,y1:198,x2:180,y2:53,stroke:'#c95128','stroke-width':7,'stroke-linecap':'round',transform:`rotate(${a.minute} 180 180)`,'data-hand':'minute'});
    add('circle',{cx:180,cy:180,r:9,fill:'#253a37'}); add('circle',{cx:180,cy:180,r:3,fill:'#fff'});
  }
  function hint(q) {
    const car = carById(q.carId);
    return `제조사는 ${car.brand}예요. 이름의 첫 글자는 ‘${[...car.model][0]}’입니다. 사진 속 세대는 ${Math.floor(car.year/10)*10}년대에 처음 출시됐어요.`;
  }
  function hintText(q) {
    if (q.kind !== 'clock') return hint(q);
    return `파란색 짧은 바늘로 시를 먼저 읽어요. ${q.minute === 0 ? `짧은 바늘이 ${q.hour}를 가리켜요.` : `짧은 바늘은 ${q.hour}를 지나 ${q.hour % 12 + 1} 쪽으로 움직이고 있어요.`} 주황색 긴 바늘은 ${q.minute === 0 ? '12를 가리키면 0분, 정각' : `${q.minute / 5}을 가리켜요. ${q.minute / 5} × 5 = ${q.minute}분`}이에요.`;
  }
  function renderFeedback(q) {
    const feedback = $('feedback'); feedback.className = 'feedback'; feedback.replaceChildren();
    if (q.resolved) {
      feedback.classList.add('success');
      feedback.append(text('strong', `정답이에요! +${q.reward} XP`), text('p', q.kind === 'clock' ? `지금 시각은 ${q.answer}이에요. 다음 여행도 함께해요!` : `${q.answer}, 잘 찾았어요!`));
    } else if (q.attempts.length) {
      feedback.classList.add('retry');
      if(q.kind==='car') {
        const [model,year]=JSON.parse(q.attempts.at(-1));
        const changed=C.pairKey(q.picks.model,q.picks.year)!==q.attempts.at(-1);
        feedback.append(text('strong',changed?'선택한 답을 다시 확인해 보세요.':model===q.modelAnswer?'차종은 맞았어요. 출시연도를 다시 골라요.':year===q.yearAnswer?'출시연도는 맞았어요. 차종을 다시 골라요.':'차종과 출시연도를 다시 골라 볼까요?'),text('p',changed?'두 답을 골랐다면 ‘정답 확인’을 눌러 주세요.':'경험치는 줄어들지 않아요. 두 가지를 모두 맞히면 완료예요.'));
      } else feedback.append(text('strong', '괜찮아요. 다시 골라 볼까요?'), text('p', '경험치는 줄어들지 않아요. 힌트를 봐도 좋아요.'));
    } else feedback.append(text('strong',q.kind==='car'?'차종과 출시연도, 둘 다 도전해요.':'잘 살펴보고 골라 봐요.'), text('p',q.kind==='car'?'각각 하나씩 고르고 ‘정답 확인’을 눌러 주세요.':'틀려도 다시 도전할 수 있어요.'));
    $('hint-button').hidden = q.resolved;
    $('hint-button').disabled = q.hinted || conflicted;
    $('hint-button').lastChild.textContent = q.hinted ? ' 힌트를 보고 골라 보세요' : ' 힌트 보기';
    $('hint-text').hidden = !q.hinted;
    if (q.hinted) $('hint-text').textContent = hintText(q);
    $('next-button').hidden = !q.resolved;
    $('next-button').firstChild.textContent = q.kind === 'clock' ? '다음 여행 출발 ' : state.carCount === 4 ? '시계 미션으로 ' : '다음 자동차 ';
  }
  function renderQuestion(focus = false) {
    const q = C.ensureQuestion(state, cars), clock = q.kind === 'clock';
    $('mission-label').textContent = `ROUND ${String(state.round).padStart(2, '0')} · ${clock ? '시계 미션' : '자동차 퀴즈'}`;
    const car = clock ? null : carById(q.carId);
    $('question-title').textContent = clock ? '시계는 몇 시 몇 분일까요?' : '자동차 종류와 출시연도를 맞혀 보세요.';
    $('question-tag').textContent = clock ? '짧은 바늘과 긴 바늘을 살펴봐요' : '자동차 사진 하나, 두 가지 도전';
    $('answer-heading-copy').textContent=clock?'정답을 하나 골라 주세요':'차종과 출시연도를 각각 골라 주세요';
    $('question-number').textContent = clock ? 'BONUS MISSION' : `${String(state.carCount + 1).padStart(2, '0')} / 05`;
    $('reward-badge').textContent = clock ? '+20 XP' : '+10 XP';
    $('car-stage').hidden = clock; $('clock-stage').hidden = !clock; $('photo-source').hidden = clock;
    if (clock) { renderClock(q); $('visual-caption').textContent = '시를 먼저, 그다음 분을 읽어요.'; }
    else {
      $('image-error').hidden = true;
      $('question-photo').src = car.image;
      $('question-photo').alt = q.resolved ? `${car.brand} ${car.model} ${car.series}` : '종류와 출시연도를 맞혀 볼 자동차 사진';
      if ($('question-photo').complete && !$('question-photo').naturalWidth) $('image-error').hidden = false;
      $('visual-caption').textContent = q.resolved ? `${car.brand} ${car.model} · ${car.series} · ${car.year}년 출시` : '사진 속 세대가 처음 출시된 연도를 골라요.';
    }
    renderRoute();
    $('choices').replaceChildren();
    $('choices').classList.toggle('dual-choices',!clock);
    $('submit-answer').hidden=clock||q.resolved;
    if(!clock) {
      for(const [field,label,options] of [['model','01 자동차 종류',q.choices],['year','02 출시연도',q.yearChoices]]) {
        const group=text('fieldset','','answer-group');group.append(text('legend',label));
        const grid=text('div','','dual-options');
        options.forEach(value=>{
          const selected=q.picks[field]===value;
          const button=text('button','','choice dual-choice'+(selected?' selected':'')+(q.resolved&&selected?' correct':''));
          button.setAttribute('aria-pressed',String(selected));button.dataset.field=field;
          button.append(text('span',q.resolved&&selected?'✓':selected?'●':'○','choice-index'),text('span',value,'choice-text'));
          button.disabled=q.resolved||conflicted;
          button.addEventListener('click',()=>{
            if(!writable()||!C.select(state,field,value))return;
            save();renderQuestion();
            const picked=[...$('choices').querySelectorAll('button')].find(b=>b.dataset.field===field&&b.querySelector('.choice-text').textContent===value);
            picked?.focus({preventScroll:true});
          });grid.append(button);
        });group.append(grid);$('choices').append(group);
      }
      $('submit-answer').disabled=conflicted||!q.picks.model||!q.picks.year||q.attempts.includes(C.pairKey(q.picks.model,q.picks.year));
    } else q.choices.forEach((value, i) => {
      const correct = q.resolved && value === q.answer, wrong = q.attempts.includes(value) && value !== q.answer;
      const button = text('button', '', `choice${correct ? ' correct' : ''}${wrong ? ' wrong' : ''}`);
      button.append(text('span', correct ? '✓' : wrong ? '↺' : String(i + 1).padStart(2, '0'), 'choice-index'), text('span', value, 'choice-text'));
      if (correct || wrong) button.append(text('span', correct ? '정답' : '다시 도전', 'choice-status'));
      button.disabled = q.resolved || wrong || conflicted;
      button.addEventListener('click', () => choose(value));
      $('choices').append(button);
    });
    renderFeedback(q); renderDashboard();
    if (focus) $('question-title').focus({preventScroll: true});
  }
  function choose(value) {
    if (!writable()) return;
    const result = C.answer(state, value);
    if (!result.changed) return;
    save(); renderQuestion();
    if (result.correct) {
      if (state.settings.sound) chime();
      if (result.unlocked.length) { latestUnlock = result.unlocked.at(-1); const car = carById(latestUnlock.id); $('unlock-photo').src = car.image; $('unlock-photo').alt = `${car.brand} ${car.model}`; $('unlock-name').textContent = `${car.brand} ${car.model}`; show('unlock-dialog'); }
      else $('next-button').focus({preventScroll:true});
    } else {
      const available = [...$('choices').querySelectorAll('button')].find(b => !b.disabled); available?.focus({preventScroll:true});
    }
  }
  function chime() {
    try { const Audio = window.AudioContext || window.webkitAudioContext; const ctx = new Audio(); [523.25,659.25,783.99].forEach((f,i) => { const o = ctx.createOscillator(), g = ctx.createGain(), at = ctx.currentTime+i*.1; o.type='sine'; o.frequency.value=f; g.gain.setValueAtTime(0,at); g.gain.linearRampToValueAtTime(.06,at+.02); g.gain.exponentialRampToValueAtTime(.001,at+.25); o.connect(g); g.connect(ctx.destination); o.start(at); o.stop(at+.26); }); setTimeout(() => ctx.close(),700); } catch (_) {}
  }
  function start() {
    if (!writable()) return;
    playing = true; $('home').hidden = true; $('game').hidden = false; renderQuestion(true); save();
  }
  function renderGarage() {
    const level = C.level(state.xp); $('garage-grid').replaceChildren();
    C.REWARDS.forEach((reward, i) => {
      const car = carById(reward.id), locked = i > level, selected = state.selected === reward.id;
      const card = text('article', '', `garage-card${locked ? ' locked' : ''}${selected ? ' selected' : ''}`);
      const img = document.createElement('img'); img.src = car.image; img.alt = `${car.brand} ${car.model}`; img.loading = 'lazy';
      card.append(img, text('small', `LEVEL ${String(i + 1).padStart(2, '0')} · ${reward.title}`), text('h3', `${car.brand} ${car.model}`));
      if (locked) card.append(text('span', `🔒 ${reward.xp - state.xp} XP 더 모으면 열려요`, 'lock-label'));
      else { const button = text('button', selected ? '✓ 지금 타는 자동차' : '이 자동차 타기', 'secondary'); button.disabled = selected || conflicted; button.addEventListener('click', () => { if (!writable()) return; state.selected = reward.id; save(); renderDashboard(); renderGarage(); }); card.append(button); }
      $('garage-grid').append(card);
    });
  }
  function openGarage() { renderGarage(); show('garage-dialog'); }
  function renderStats() {
    const table = text('table', '', 'stats-table');
    const caption = text('caption', '자동차·시계 누적 학습 기록'); caption.style.cssText = 'text-align:left;margin:0 0 10px;font-weight:700'; table.append(caption);
    const header = document.createElement('thead'), hr = document.createElement('tr');
    ['문제', '완료', '처음 정답', '도움 후 정답'].forEach(label => { const th = text('th', label); th.scope = 'col'; hr.append(th); }); header.append(hr); table.append(header);
    const body = document.createElement('tbody');
    for (const [kind, label] of [['car','자동차'],['clock','시계']]) { const r = document.createElement('tr'); const th = text('th', label); th.scope = 'row'; r.append(th); for (const key of ['total','first','assisted']) r.append(text('td', `${state.stats[kind][key]}문제`)); body.append(r); }
    table.append(body); $('stats').replaceChildren(table);
  }
  function settings() {
    $('difficulty').value = state.settings.difficulty; $('choice-count').value = state.settings.choices; $('clock-step').value = state.settings.clockStep; $('sound').checked = state.settings.sound; $('motion').checked = state.settings.motion; $('settings-message').textContent = ''; renderStats(); show('settings-dialog');
  }
  function renderCredits(highlight) {
    $('credits-list').replaceChildren();
    for (const car of cars) {
      const item = text('article', '', `credit-item${car.id === highlight ? ' credit-highlight' : ''}`); item.id = `credit-${car.id}`;
      const img = document.createElement('img'); img.src = car.image; img.alt = `${car.brand} ${car.model}`; img.loading = 'lazy';
      const info = text('div', ''); info.append(text('h3', `${car.brand} ${car.model} · ${car.series}`), text('p', `사진: ${car.author} · ${car.changes}`), link('원본 사진', car.source), document.createTextNode(' · '), link(car.license, car.licenseUrl || 'https://creativecommons.org/publicdomain/zero/1.0/'));
      if (car.yearSource) { const year = text('p', `${car.year}년 세대 출시 · `); year.append(link('제조사 자료', car.yearSource)); info.append(year); }
      item.append(img, info); $('credits-list').append(item);
    }
    show('credits-dialog');
    if (highlight) $(`credit-${highlight}`).scrollIntoView({block:'center'});
  }
  function download(name, content, type) {
    const blob = new Blob([content], {type}), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportBackup() { download(`부릉부릉-차고-기록-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify({format:'car-clock-garage-backup', exportedAt:new Date().toISOString(), progress:state},null,2), 'application/json'); }
  $('start-button').addEventListener('click', start);
  $('submit-answer').addEventListener('click',()=>{if(state.active?.kind==='car')choose({...state.active.picks});});
  $('pause-button').addEventListener('click', () => { playing = false; $('game').hidden = true; $('home').hidden = false; renderDashboard(); $('start-button').focus(); });
  $('next-button').addEventListener('click', () => { if (!writable() || !C.advance(state)) return; renderQuestion(true); save(); });
  $('hint-button').addEventListener('click', () => { if (!writable() || !state.active || state.active.resolved || state.active.hinted) return; state.active.hinted = true; save(); renderQuestion(); $('hint-text').setAttribute('tabindex','-1'); $('hint-text').focus({preventScroll:true}); });
  $('question-photo').addEventListener('error', () => { $('image-error').hidden = false; });
  $('question-photo').addEventListener('load', () => { $('image-error').hidden = true; });
  $('garage-button').addEventListener('click', openGarage); $('view-collection').addEventListener('click', openGarage);
  $('settings-button').addEventListener('click', settings); $('help-button').addEventListener('click', () => show('help-dialog'));
  $('credits-button').addEventListener('click', () => renderCredits()); $('photo-source').addEventListener('click', () => renderCredits(state.active?.carId));
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  $('unlock-dialog').addEventListener('close', () => { if (playing && state.active?.resolved) $('next-button').focus({preventScroll:true}); });
  $('equip-unlocked').addEventListener('click', () => { if (!writable() || !latestUnlock) return; state.selected = latestUnlock.id; save(); renderDashboard(); close('unlock-dialog'); });
  $('settings-form').addEventListener('submit', event => {
    event.preventDefault(); if (!writable()) return;
    state.settings = {difficulty:$('difficulty').value, choices:Number($('choice-count').value), clockStep:Number($('clock-step').value), sound:$('sound').checked, motion:$('motion').checked}; save(); renderDashboard(); close('settings-dialog');
  });
  $('export-button').addEventListener('click', exportBackup); $('backup-before-import').addEventListener('click', exportBackup);
  $('csv-button').addEventListener('click', () => {
    const esc = x => `"${String(x ?? '').replaceAll('"','""')}"`;
    const rows = [['시간','문제 종류','자동차','유형','정답','시도 횟수','힌트','처음 정답','경험치'], ...state.history.map(h => [h.at, h.kind === 'car' ? '자동차' : '시계', h.carId ? carById(h.carId).model : '', {dual:'차종·출시연도',model:'이름',series:'세대',year:'세대 출시연도',time:'시간'}[h.mode],h.answer,h.attempts,h.hinted?'예':'아니오',h.first?'예':'아니오',h.xp])];
    download('부릉부릉-차고-학습기록.csv', '\ufeff' + rows.map(r => r.map(esc).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
  });
  $('import-button').addEventListener('click', () => { if (!writable()) return; $('import-file').click(); });
  $('import-file').addEventListener('change', async event => {
    const file = event.target.files[0]; event.target.value = ''; if (!file) return;
    try {
      if (file.size > 2*1024*1024) throw new Error('2MB 이하의 게임 백업 파일을 골라 주세요.');
      const raw = JSON.parse(await file.text());
      if (raw.format !== 'car-clock-garage-backup') throw new Error('이 게임에서 저장한 백업 파일을 골라 주세요.');
      pendingImport = C.validate(raw.progress, cars);
      $('import-summary').textContent = `불러올 기록: 레벨 ${C.level(pendingImport.xp)+1}, ${pendingImport.xp} XP, 자동차 ${pendingImport.stats.car.total}문제 · 시계 ${pendingImport.stats.clock.total}문제 완료.`;
      show('import-dialog');
    } catch (error) { pendingImport = null; $('settings-message').textContent = error instanceof SyntaxError ? 'JSON 백업 파일을 읽을 수 없습니다. 파일을 확인해 주세요.' : error.message; }
  });
  $('confirm-import').addEventListener('click', () => {
    if (!pendingImport || !writable()) return;
    state = pendingImport; pendingImport = null; save(); close('import-dialog'); close('settings-dialog');
    if (playing) renderQuestion(true); else renderDashboard();
  });
  window.addEventListener('storage', event => { if ((event.key === KEY || event.key === null) && event.newValue !== expected) conflict(); });
  renderDashboard(); if (loadWarning) warning(loadWarning);
  if (new URLSearchParams(location.search).has('manual')) show('help-dialog');
})();
