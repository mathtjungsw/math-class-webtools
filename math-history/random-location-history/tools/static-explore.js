(function(){
  'use strict';
  const $=id=>document.getElementById(id),api=window.HistoryAtlas;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const topics=[
    {id:'life',label:'삶과 살림',symbol:'⌂',question:'어디서 살고, 물과 식량을 어떻게 구했을까?',tags:['생활','주거','환경','물','식량','농경','생산','질병','돌봄','가족','재해','전후복구']},
    {id:'work',label:'일과 교류',symbol:'↔',question:'누가 일하고, 무엇을 만들고 옮겼을까?',tags:['노동','교역','교류','항구','생업','경제','상업','교통','재정']},
    {id:'belief',label:'신앙과 문화',symbol:'✳',question:'사람들은 무엇을 믿고, 어떻게 배우고 기록했을까?',tags:['신앙','공동체','책','언어','교육','문화','건축','문화유산','기억','자료읽기','고고학','역사해석']},
    {id:'power',label:'권력과 권리',symbol:'⚑',question:'통치와 제도가 바뀌면 주민의 권리도 달라졌을까?',tags:['국가','정치','통치','제도','법','개혁','행정','방어','전쟁','점령','군대','시민','인권','독립운동','식민지','해방','저항','사회운동','지역관계','주변관계']},
    {id:'people',label:'이주와 불평등',symbol:'◎',question:'누가 이웃이 되고, 누가 이동하거나 배제되었을까?',tags:['이주','주민','주민의 삶','인구','여성','사람','신분','재산','차별','폭력','노예제','통제','불평등','사회']}
  ];
  const storageKey='history-atlas:notes:v1';
  let location,records,chapters,timeline,eraIndex=0,topicId='work',selectedPlace=null,notes={},storageFailed=false;
  try{const stored=JSON.parse(localStorage.getItem(storageKey));if(stored&&typeof stored==='object'&&!Array.isArray(stored))notes=stored;}catch{}
  const hasTopic=(record,topic)=>record.theme.some(tag=>topic.tags.includes(tag));
  const chapterRecords=chapter=>chapter.recordIds.map(id=>records.get(id)).filter(Boolean);
  function readingButton(chapter,level,label){
    if(!StaticHistoryCore.readingLevels(chapter).includes(level))return '<span class="reading-pending">'+label+' · 보강 예정</span>';
    return '<button data-reading="'+esc(chapter.id)+'" data-reading-level="'+level+'">'+label+'</button>';
  }
  function sources(record){return '<div class="explore-sources">'+[...new Set(record.evidence.map(e=>e.sourceId))].map(id=>{const source=location.sources.find(s=>s.id===id);let href='#';try{const url=new URL(source?.url);if(/^https?:$/.test(url.protocol))href=url.href;}catch{}return '<a href="'+esc(href)+'" target="_blank" rel="noopener noreferrer">'+esc(id)+' · '+esc(source?.publisher||'출처')+' ↗</a>';}).join('')+'</div>';}
  function noteFor(id){return notes[location.id]?.[id];}
  function noteButton(record){return '<button class="note-button" data-note="'+esc(record.id)+'" aria-pressed="'+!!noteFor(record.id)+'">'+(noteFor(record.id)?'✓ 노트에 저장됨':'＋ 탐험 노트')+'</button>';}
  function fact(record,compact=false){return '<article class="explore-fact"><span class="fact-date">'+esc(record.date?.label||'연도 미확정 해설')+(record.scope==='national_context'?' · 국가 배경':record.scope==='regional_context'?' · 주변 배경':'')+'</span><h4>'+esc(record.title)+'</h4><p>'+esc(record.narrative)+'</p>'+sources(record)+'<div class="fact-actions">'+(record.date?'<button data-explore-jump="'+esc(record.id)+'">연표·근거 보기 →</button>':'')+noteButton(record)+'</div></article>';}
  function options(){return chapters.map((c,i)=>'<option value="'+i+'">'+(i+1)+'. '+esc(c.title)+' · '+esc(c.periodLabel)+'</option>').join('');}
  function renderEra(){
    const chapter=chapters[eraIndex],items=chapterRecords(chapter);
    $('explore-era').value=eraIndex;$('era-question').textContent=chapter.question;
    $('era-description').textContent=chapter.basic.flatMap(s=>s.paragraphs).join(' ');
    $('era-reading').innerHTML=readingButton(chapter,StaticHistoryCore.readingLevels(chapter).includes('deep')?'deep':'detail',StaticHistoryCore.readingLevels(chapter).includes('deep')?'이 시대 깊이 읽기 →':'이 시대 상세히 보기 →')+'<button data-explore-jump="'+esc(chapter.anchorRecordId)+'">이 시대 연표로 이동</button>';
    const ids=new Set(items.map(r=>r.placeId));
    if(!ids.has(selectedPlace))selectedPlace=items[0]?.placeId;
    renderMap(items);renderPlace(items);
    $('era-prev').disabled=eraIndex===0;$('era-next').disabled=eraIndex===chapters.length-1;
  }
  function renderMap(items){
    const places=location.places.filter(p=>items.some(r=>r.placeId===p.id));
    // Diagram coordinates are editorial layout positions, never geographic coordinates.
    const zones=[{id:'historic_peninsula',x:350,y:235,label:'도시권 기록'},{id:'sultanahmet',x:510,y:295,label:'술탄아흐메트'},{id:'yenikapi',x:270,y:330,label:'예니카프'},{id:'aqueduct',x:210,y:215,label:'급수 연결망'},{id:'land_walls',x:110,y:240,label:'육지 성벽'},{id:'galata',x:455,y:85,label:'갈라타'},{id:'golden_horn',x:275,y:132,label:'금각만'},{id:'bosphorus',x:660,y:145,label:'보스포루스'}];
    const active=new Set(places.map(p=>p.id));
    if(location.id==='tr-istanbul'){
      $('era-map').innerHTML='<svg viewBox="0 0 800 430" role="img" aria-label="이스탄불 역사 반도의 공간 관계 개략도. 시대별 수록 기록이 있는 구역을 강조하며 정밀 위치나 과거 경계를 나타내지 않습니다."><rect width="800" height="430" rx="18" fill="#dce8e3"/><path d="M0 0H570L600 50L535 122L435 160L310 140L180 93L0 70Z" fill="#efeee2"/><path d="M0 110L160 132L270 177L440 190L550 250L595 330L560 370L260 389L0 340Z" fill="#efeee2"/><path d="M725 0H800V430H690L708 340L690 240L738 120Z" fill="#efeee2"/><text x="600" y="405" class="water-label">마르마라해</text><text x="20" y="32" class="diagram-label">공간 관계 개략도 · 축척 없음</text>'+zones.map(z=>'<g class="map-zone '+(active.has(z.id)?'has-records':'')+' '+(selectedPlace===z.id?'selected':'')+'">'+(active.has(z.id)?'<a href="#place-stories" data-explore-place="'+z.id+'" aria-label="'+z.label+'의 수록 기록 보기">':'')+'<circle cx="'+z.x+'" cy="'+z.y+'" r="'+(active.has(z.id)?9:5)+'"/><text x="'+z.x+'" y="'+(z.y+25)+'" text-anchor="middle">'+z.label+'</text>'+(active.has(z.id)?'</a>':'')+'</g>').join('')+'</svg>';
      $('map-method').innerHTML='북쪽 금각만·동쪽 보스포루스·남쪽 마르마라해의 관계를 단순화했습니다. 점의 배치는 설명용이며 유적 좌표·당시 해안선·국경을 뜻하지 않습니다. <a href="https://whc.unesco.org/en/list/356/" target="_blank" rel="noopener noreferrer">공간 설명 근거: UNESCO ↗</a>';
    }else if(location.id==='tz-chemba-kidoka'){
      const landmarks=location.places.filter(p=>['kisese_ii','kondoa_art','draw_point','farkwa'].includes(p.id));
      $('era-map').innerHTML='<div class="field-diagram"><p class="eyebrow">추첨점과 주변 장소</p><h3>한 점에서, 여러 생활권으로</h3><p>각 기록이 다루는 장소를 구분해 살펴봅니다.</p><div class="scope-landmarks">'+landmarks.sort((a,b)=>b.coordinate.latitude-a.coordinate.latitude).map(p=>'<div class="scope-landmark '+(active.has(p.id)?'has-records':'')+'"><strong>'+esc(p.name)+'</strong><span>'+esc(p.id==='draw_point'?'기준점 · 초기 거주 미확인':p.directionFromDraw+'쪽 · 직선 약 '+Math.round(p.distanceFromDrawKm)+'km')+'</span></div>').join('')+'</div></div>';
      $('map-method').textContent='현대 좌표 사이의 직선거리입니다. 위에서 아래로 북쪽 장소부터 나열했습니다. 이동 경로나 역사적 경계는 표시하지 않습니다. 파르콰는 현대 마을 대표점이며 옛 시설의 정확한 위치는 미확인입니다.';
    }else{
      $('era-map').innerHTML='<div class="river-diagram"><span>남강 유역의 기록</span><div class="river-line" aria-hidden="true"></div><strong>마을 · 생활권 · 진주성</strong><p>서로 다른 조사 장소를 한 시대의 자료로 연결합니다.</p></div>';
      $('map-method').textContent='아래 목록은 시대별 기록의 장소를 연결한 자료지도입니다. 장소의 배치 순서는 거리·방향·당시 경계를 뜻하지 않습니다. 정밀 좌표가 미확인인 유적은 지도 위에 임의로 표시하지 않았습니다.';
    }
    $('era-places').innerHTML=places.map(p=>'<button data-explore-place="'+esc(p.id)+'" aria-pressed="'+(selectedPlace===p.id)+'"><span>'+esc(p.name)+'</span><small>'+items.filter(r=>r.placeId===p.id).length+'개 수록 기록'+(p.distanceFromDrawKm>0?' · '+esc(p.directionFromDraw)+'쪽 약 '+Math.round(p.distanceFromDrawKm)+'km':'')+'</small></button>').join('');
    $('map-legend').textContent='● 강조: 선택 시대의 수록 기록 있음 · 옅은 점: 이 시대 수록 기록 없음. 시설의 존재·소멸을 판정한 표시는 아닙니다.';
    $('map-legend').hidden=location.id!=='tr-istanbul';
  }
  function renderPlace(items){
    const place=location.places.find(p=>p.id===selectedPlace);
    $('place-stories').innerHTML='<h3>'+esc(place?.name||'이 시대의 장소')+'</h3>'+items.filter(r=>r.placeId===selectedPlace).map(r=>fact(r)).join('');
    updateNoteButtons();
  }
  function renderCompare(){
    const left=chapters[Number($('compare-left').value)],right=chapters[Number($('compare-right').value)];
    $('compare-message').textContent=left===right?'같은 시대를 선택했습니다. 다른 시대를 고르면 변화와 차이를 살펴볼 수 있습니다.':'같은 주제의 기록을 나란히 읽어 보세요. 수록 기록이 적다는 것이 활동이나 주민이 적었다는 뜻은 아닙니다.';
    $('compare-grid').innerHTML=topics.filter(t=>t.id===$('compare-topic').value).map(topic=>'<section class="compare-row"><h3>'+topic.symbol+' '+topic.label+'</h3><div class="compare-pair">'+[left,right].map(chapter=>{const matching=chapterRecords(chapter).filter(r=>hasTopic(r,topic));return '<div class="compare-cell"><p class="compare-period">'+esc(chapter.periodLabel)+'</p><h4 class="compare-title">'+esc(chapter.title)+'</h4>'+(matching.length?matching.slice(0,2).map(r=>fact(r,true)).join(''):'<p class="unfilled">이 주제에 연결한 연대 기록이 이 시대 조사본에 없습니다. 활동이 없었다는 뜻은 아닙니다.</p>')+(matching.length>2?'<button class="compare-more" data-compare-topic="'+topic.id+'">관련 기록 '+matching.length+'개 모두 따라 읽기 →</button>':'')+'</div>';}).join('')+'</div></section>').join('');
    updateNoteButtons();
  }
  function renderTopic(){
    const topic=topics.find(t=>t.id===topicId);
    $('topic-question').textContent=topic.question;
    $('topic-buttons').innerHTML=topics.map(t=>'<button data-topic="'+t.id+'" aria-pressed="'+(t.id===topicId)+'">'+t.symbol+' '+t.label+'</button>').join('');
    const total=location.records.filter(r=>r.date&&hasTopic(r,topic)).length;$('topic-count').textContent=total+'개 연대 기록';
    $('topic-trail').innerHTML=chapters.map((chapter,i)=>{const matching=chapterRecords(chapter).filter(r=>hasTopic(r,topic));if(!matching.length)return '';return '<section class="topic-era"><div class="topic-era-head"><span>'+String(i+1).padStart(2,'0')+'</span><div><p>'+esc(chapter.periodLabel)+'</p><h3>'+esc(chapter.title)+'</h3></div></div><div class="topic-facts">'+matching.map(r=>fact(r)).join('')+'</div><div class="topic-reading">'+['basic','detail','deep'].map((level,n)=>readingButton(chapter,level,['짧게 읽기','상세히 보기','깊이 읽기'][n])).join('')+'</div></section>';}).join('')||'<p class="unfilled">이 주제의 자료가 아직 수록되지 않았습니다.</p>';
    const contexts=location.records.filter(r=>!r.date&&hasTopic(r,topic));$('topic-context').innerHTML=contexts.length?'<h3>연도 하나로 묶기 어려운 해설</h3>'+contexts.map(r=>fact(r)).join(''):'';
    updateNoteButtons();
  }
  function storeNotes(){try{localStorage.setItem(storageKey,JSON.stringify(notes));storageFailed=false;}catch{storageFailed=true;}$('notebook-status').textContent=storageFailed?'브라우저 저장을 사용할 수 없습니다. 현재 화면에서 메모하고 파일로 저장하세요.':'노트는 이 브라우저에 저장됩니다. 다른 기기로 옮길 때에는 노트 파일을 저장하세요.';}
  function updateNoteButtons(){document.querySelectorAll('[data-note]').forEach(button=>{const saved=!!noteFor(button.dataset.note);button.setAttribute('aria-pressed',String(saved));button.textContent=saved?'✓ 노트에 저장됨':'＋ 탐험 노트';});}
  function renderNotes(){
    const saved=Object.entries(notes[location.id]||{}).filter(([id])=>records.has(id));
    $('notebook-count').textContent=saved.length;$('notes-export').disabled=!saved.length;
    $('notebook-list').innerHTML=saved.length?saved.map(([id,note])=>{const record=records.get(id);return '<article class="notebook-item"><span class="fact-date">'+esc(record.date?.label||'연도 미확정 해설')+'</span><h3>'+esc(record.title)+'</h3><p>'+esc(record.narrative)+'</p><label>새로 알게 된 점 · 더 궁금한 점<textarea data-note-text="'+esc(id)+'" rows="3" placeholder="내 생각과 역사 자료의 사실을 구분해 적어 보세요.">'+esc(typeof note.text==='string'?note.text:'')+'</textarea></label><div class="fact-actions">'+(record.date?'<button data-explore-jump="'+esc(id)+'">연표·근거 보기 →</button>':'')+'<button data-note-remove="'+esc(id)+'">노트에서 빼기</button></div></article>';}).join(''):'<p class="notebook-empty">궁금한 기록의 ‘＋ 탐험 노트’를 눌러 모아 보세요. 이곳에서 내 생각과 질문을 덧붙일 수 있습니다.</p>';
    $('notebook-status').textContent=storageFailed?'브라우저 저장을 사용할 수 없습니다. 파일로 저장하세요.':'노트는 이 브라우저에 저장됩니다. 다른 기기로 옮길 때에는 노트 파일을 저장하세요.';
  }
  function reset(){
    location=api.getLocation();records=new Map(location.records.map(r=>[r.id,r]));chapters=location.readings.chapters;timeline=StaticHistoryCore.prepare(location);
    eraIndex=0;selectedPlace=null;topicId='work';$('era-follow').checked=true;
    for(const id of ['explore-era','compare-left','compare-right'])$(id).innerHTML=options();
    $('compare-topic').innerHTML=topics.map(t=>'<option value="'+t.id+'">'+t.label+'</option>').join('');
    $('compare-left').value=location.id==='tr-istanbul'?1:0;$('compare-right').value=location.id==='tr-istanbul'?4:chapters.length-1;
    $('explore-location').textContent=location.mapLabel||location.name.replace('한반도 ','');
    followTime();renderEra();renderCompare();renderTopic();renderNotes();
  }
  function followTime(){if($('era-follow').checked){const entry=timeline.chapters[api.getState().chapter]?.entries[0];const index=chapters.findIndex(c=>c.recordIds.includes(entry?.record.id));if(index>=0&&index!==eraIndex){eraIndex=index;renderEra();}}updateNoteButtons();}
  function selectEra(index){api.pause();$('era-follow').checked=false;eraIndex=Math.max(0,Math.min(chapters.length-1,index));renderEra();}
  function activateTab(name){document.querySelectorAll('[data-discovery-tab]').forEach(button=>{const active=button.dataset.discoveryTab===name;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;$(button.getAttribute('aria-controls')).hidden=!active;});}
  document.querySelector('.discovery-tabs').addEventListener('click',event=>{const button=event.target.closest('[data-discovery-tab]');if(button){api.pause();activateTab(button.dataset.discoveryTab);}});
  document.querySelector('.discovery-tabs').addEventListener('keydown',event=>{const buttons=[...document.querySelectorAll('[data-discovery-tab]')],index=buttons.indexOf(document.activeElement);if(index<0)return;let target;if(event.key==='ArrowRight')target=(index+1)%buttons.length;else if(event.key==='ArrowLeft')target=(index+buttons.length-1)%buttons.length;else if(event.key==='Home')target=0;else if(event.key==='End')target=buttons.length-1;else return;event.preventDefault();api.pause();activateTab(buttons[target].dataset.discoveryTab);buttons[target].focus();});
  function selectTopic(id){if(!topics.some(t=>t.id===id))return;topicId=id;renderTopic();}
  $('explore-era').addEventListener('change',()=>selectEra(Number($('explore-era').value)));
  $('era-prev').addEventListener('click',()=>selectEra(eraIndex-1));$('era-next').addEventListener('click',()=>selectEra(eraIndex+1));
  $('era-follow').addEventListener('change',followTime);
  $('compare-left').addEventListener('change',()=>{api.pause();renderCompare();});$('compare-right').addEventListener('change',()=>{api.pause();renderCompare();});
  $('compare-topic').addEventListener('change',()=>{api.pause();renderCompare();});
  $('compare-swap').addEventListener('click',()=>{const left=$('compare-left').value;$('compare-left').value=$('compare-right').value;$('compare-right').value=left;renderCompare();});
  document.addEventListener('click',event=>{
    const jump=event.target.closest('[data-explore-jump]');if(jump){api.goToRecord(jump.dataset.exploreJump);$('exploration').scrollIntoView({behavior:'smooth'});}
    const place=event.target.closest('[data-explore-place]');if(place){api.pause();selectedPlace=place.dataset.explorePlace;renderMap(chapterRecords(chapters[eraIndex]));renderPlace(chapterRecords(chapters[eraIndex]));}
    const topic=event.target.closest('[data-topic]');if(topic){api.pause();selectTopic(topic.dataset.topic);}
    const more=event.target.closest('[data-compare-topic]');if(more){selectTopic(more.dataset.compareTopic);activateTab('topic');$('topic-discovery').scrollIntoView({behavior:'smooth'});}
    const note=event.target.closest('[data-note]');if(note&&records.has(note.dataset.note)){const id=note.dataset.note;notes[location.id]||={};if(noteFor(id))delete notes[location.id][id];else notes[location.id][id]={text:'',savedAt:new Date().toISOString()};storeNotes();renderNotes();updateNoteButtons();$('note-feedback').textContent=noteFor(id)?'탐험 노트에 저장했습니다.':'탐험 노트에서 뺐습니다.';}
    const remove=event.target.closest('[data-note-remove]');if(remove){delete notes[location.id]?.[remove.dataset.noteRemove];storeNotes();renderNotes();updateNoteButtons();}
  });
  $('notebook-list').addEventListener('input',event=>{const input=event.target.closest('[data-note-text]');if(input&&noteFor(input.dataset.noteText)){notes[location.id][input.dataset.noteText].text=input.value;storeNotes();}});
  $('notes-export').addEventListener('click',()=>{const data={format:'history-atlas-notes/1',locationId:location.id,locationName:location.name,exportedAt:new Date().toISOString(),notes:Object.entries(notes[location.id]||{}).filter(([id])=>records.has(id)).map(([id,note])=>({recordId:id,title:records.get(id).title,date:records.get(id).date?.label||null,text:note.text,savedAt:note.savedAt,sourceUrls:records.get(id).evidence.map(e=>location.sources.find(s=>s.id===e.sourceId)?.url).filter(Boolean)}))};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}),a=document.createElement('a'),href=URL.createObjectURL(blob);a.href=href;a.download=location.id+'-탐험노트.json';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);});
  document.addEventListener('history:location',reset);document.addEventListener('history:scene',followTime);
  reset();
})();
