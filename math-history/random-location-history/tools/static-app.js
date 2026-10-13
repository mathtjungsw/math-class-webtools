(function(){
  'use strict';
  // Export only the game's embedded scripts, excluding browser-extension injections.
  const originalRoot=document.documentElement.cloneNode(true);
  const includedScripts=new Set(['history-data','land-data','static-core','static-app','static-explore']);
  originalRoot.querySelectorAll('script').forEach(node=>{if(!includedScripts.has(node.id))node.remove();});
  originalRoot.querySelectorAll('link[rel="stylesheet"],style:not(#static-style)').forEach(node=>node.remove());
  const $=id=>document.getElementById(id),C=StaticHistoryCore;
  function exportHTML(){
    // The browser parser has not reached the following discovery script when
    // originalRoot is captured. Add that source, without live UI or user notes.
    const discovery=$('static-explore');
    if(discovery&&!originalRoot.querySelector('#static-explore'))originalRoot.querySelector('body').append(discovery.cloneNode(true));
    return '<!doctype html>\n'+originalRoot.outerHTML;
  }
  const bundle=JSON.parse($('history-data').textContent),land=JSON.parse($('land-data').textContent);
  const accessLabels={relevant_sections:'관련 본문 확인',published_excerpt:'공개 발췌문 확인',catalogue_metadata:'자료 목록·메타데이터 확인',selected_entries:'선별 항목 확인',indexed_official_page_text:'공식 페이지 색인 확인',html_relevant_body:'관련 본문 확인',full_text_relevant_sections_and_visual_table:'논문 본문·표 확인',publisher_abstract_only:'공개 초록 확인',abstract_only:'공개 초록 확인',primary_text_translation_and_annotations:'사료·번역·주석 확인',primary_text_translation:'사료 번역 확인',excerpt_translation_and_commentary:'사료 발췌·해설 확인',official_html_section_and_indexed_text:'공식 설명 확인'};
  const state={location:null,timeline:null,sources:new Map(),places:new Map(),month:0,playing:false,hold:0,lastFrame:0,frame:0,renderedIndex:-1,renderedMonth:null};
  const storageKey='history-atlas:static:v1';let toastTimer;
  const reader={chapter:null,level:'basic'};
  accessLabels.pdf_relevant_pages_visually_checked='관련 PDF 페이지·이미지 확인';
  Object.assign(accessLabels,{local_dataset_computed:'지리 데이터 판정',api_response_read:'지명 조회 결과 확인',page_read:'기관 설명 확인',relevant_full_text_sections_read:'관련 논문 본문 확인',selected_pdf_pages_visually_read:'선별 PDF 페이지·이미지 확인',relevant_pdf_text_read:'관련 PDF 본문 확인',author_uploaded_full_text_relevant_sections_read:'저자 공개본의 관련 본문 확인',transcription_and_editorial_context_read:'사료 전사본·편집 해설 확인',relevant_table_read:'공식 문서집 표 확인',relevant_pdf_text_and_table_image_read:'논문 본문·표 이미지 확인',guide_read_primary_text_not_read:'공식 자료 안내 확인 · 원문 미열람'});
  function readingFor(id){return state.location.readings.chapters.find(c=>c.recordIds.includes(id)||c.contextRecordIds.includes(id));}
  function readingButtons(chapter){return '<div class="reading-actions">'+[['basic','짧게 읽기'],['detail','상세히 보기'],['deep','깊이 읽기']].map(([level,label])=>C.readingLevels(chapter).includes(level)?'<button data-reading="'+escape(chapter.id)+'" data-reading-level="'+level+'">'+label+' <small>'+C.readingMinutes(chapter[level],state.location.readings.readingRateCharactersPerMinute)+'분</small></button>':'<span class="reading-pending">'+label+' · 보강 예정</span>').join('')+'</div>';}
  function escape(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function url(value){try{const u=new URL(value);return /^https?:$/.test(u.protocol)?escape(u.href):'#';}catch{return '#';}}
  function notify(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>{$('toast').hidden=true;},4500);}
  function sourceLinks(evidence){return '<div class="source-chips">'+[...new Set(evidence.map(e=>e.sourceId))].map(id=>{const s=state.sources.get(id);if(!s)return '';const label=s.publisher.split(',')[0].split(' 한국')[0];return '<a href="'+url(s.url)+'" target="_blank" rel="noopener noreferrer" title="'+escape(s.title)+'">'+escape(label)+' ↗</a>';}).join('')+'</div>';}
  function evidence(record){
    const locators=record.evidence.map(e=>{const s=state.sources.get(e.sourceId);return '<p><strong>'+escape(s?.title||e.sourceId)+'</strong><br>'+escape(e.locator)+'<br>'+escape(accessLabels[s?.access]||'자료 확인')+'</p>';}).join('');
    const d=record.date;let dating='';
    if(d?.sample){const s=d.sample;dating='<p><strong>시료 연대</strong><br>'+escape(s.feature)+' · '+s.radiocarbonAgeBP+' ± '+s.errorYears+' BP<br>원 자료의 보정 범위: '+escape(C.formatYear(d.startYear))+'–'+escape(C.formatYear(d.endYear))+(d.confidenceRangeAsPublished?' ('+escape(d.confidenceRangeAsPublished)+' 범위)':'')+(s.calibration?'<br>'+escape(s.calibration):'')+'</p>';}
    if(d?.samples){dating='<p><strong>두 시료의 원 보정 범위</strong><br>'+d.samples.map(s=>s.radiocarbonAgeBP+' ± '+s.errorYears+' BP → '+escape(C.formatYear(s.startYear))+'–'+escape(C.formatYear(s.endYear))).join('<br>')+'</p>';}
    const interpretation=record.interpretations.length?'<p><strong>연구자의 해석</strong><br>'+record.interpretations.map(i=>escape(i.text)).join('<br>')+'</p>':'';
    const limits=record.limits.length?'<ul>'+record.limits.map(l=>'<li>'+escape(l)+'</li>').join('')+'</ul>':'';
    return '<div class="evidence-content">'+dating+interpretation+limits+locators+'</div>';
  }
  function story(entry){const r=entry.record,chapter=readingFor(r.id),label=r.date.kind==='source_disagreement'?'출처별 연도 차이':r.date.kind==='document_date'?'자료 작성일':entry.approximate?'시기·연대 추정':r.date.calendar==='korean_lunisolar'?'음력 기록':'문헌·기관 기록';return '<article class="story-card"><div class="story-meta"><span class="record-date">'+escape(r.date.label)+'</span><span class="evidence-badge">'+label+'</span>'+(['national_context','regional_context'].includes(r.scope)?'<span class="evidence-badge">'+(r.scope==='national_context'?'국가 차원의 배경':'주변 지역의 배경')+'</span>':'')+'</div><h2>'+escape(r.title)+'</h2><p class="narrative">'+escape(r.narrative)+'</p>'+(r.date.anchorNote?'<p class="anchor-note">'+escape(r.date.anchorNote)+'</p>':'')+'<div class="place-label">'+escape(state.places.get(r.placeId)?.name||'조사 지역')+'</div>'+sourceLinks(r.evidence)+(chapter?'<div class="story-reading"><p>이 시대의 이야기 · '+escape(chapter.title)+'</p>'+readingButtons(chapter)+'</div>':'')+'<button class="note-button" data-note="'+escape(r.id)+'" aria-pressed="false">＋ 탐험 노트</button><details class="story-evidence"><summary>근거와 연대 설명 보기</summary>'+evidence(r)+'</details></article>';}
  function readingList(){$('reading-trail').innerHTML=state.location.readings.chapters.map((chapter,i)=>'<article class="reading-card"><span class="reading-number">'+String(i+1).padStart(2,'0')+'</span><p class="reading-period">'+escape(chapter.periodLabel)+'</p><h3>'+escape(chapter.title)+'</h3><p class="reading-question">'+escape(chapter.question)+'</p>'+readingButtons(chapter)+'<button class="era-jump" data-era-jump="'+escape(chapter.anchorRecordId)+'">이 시대의 첫 기록으로 →</button></article>').join('');}
  function readerProgress(){const el=$('reader-scroll'),range=el.scrollHeight-el.clientHeight;$('reader-progress').style.width=(range>0?Math.min(100,Math.max(0,el.scrollTop/range*100)):100)+'%';}
  function renderReader(){
    const chapter=reader.chapter,sections=chapter[reader.level];
    $('reader-title').textContent=chapter.title;$('reader-period').textContent=chapter.periodLabel;$('reader-question').textContent=chapter.question;
    $('reader-duration').textContent='예상 '+C.readingMinutes(sections,state.location.readings.readingRateCharactersPerMinute)+'분';
    for(const button of $('reading-levels').querySelectorAll('[data-level]')){const available=C.readingLevels(chapter).includes(button.dataset.level);button.disabled=!available;button.textContent={basic:'짧게 읽기',detail:'상세히 보기',deep:available?'깊이 읽기':'깊이 읽기 · 보강 예정'}[button.dataset.level];button.setAttribute('aria-pressed',String(button.dataset.level===reader.level));}
    $('reader-toc').innerHTML=sections.length>1?'<span>차례</span>'+sections.map((s,i)=>'<button data-section="'+i+'">'+escape(s.heading)+'</button>').join(''):'';
    $('reader-body').innerHTML=sections.map((s,i)=>'<section id="reading-section-'+i+'"><h3>'+escape(s.heading)+'</h3>'+(s.kind==='reading_reflection'?'<span class="reading-type">자료를 연결해 생각하기</span>':'')+s.paragraphs.map(p=>'<p>'+escape(p)+'</p>').join('')+sourceLinks(s.sourceIds.map(id=>({sourceId:id})))+'</section>').join('');
    $('reader-transition').textContent=chapter.transition;$('reader-method').textContent=state.location.readings.methodNote;
    const next=state.location.readings.chapters[state.location.readings.chapters.indexOf(chapter)+1];$('reader-next').hidden=!next;$('reader-next').textContent=next?'다음 이야기 · '+next.title:'';
    $('reader-scroll').scrollTop=0;requestAnimationFrame(readerProgress);
  }
  function openReading(id,level){const chapter=state.location.readings.chapters.find(c=>c.id===id);if(!chapter)return;stop('이야기를 읽는 동안 탐험을 멈췄습니다.');reader.chapter=chapter;const levels=C.readingLevels(chapter);reader.level=levels.includes(level)?level:levels.includes('detail')?'detail':'basic';renderReader();if(!$('reader-dialog').open)$('reader-dialog').showModal();requestAnimationFrame(readerProgress);}
  function save(){try{localStorage.setItem(storageKey,JSON.stringify({version:bundle.version,locationId:state.location.id,month:state.month,speed:$('speed').value,skip:$('skip').checked,readPause:$('read-pause').checked}));}catch{}}
  function render(){
    const i=C.indexAt(state.timeline.chapters,state.month),chapter=state.timeline.chapters[i],now=C.formatTime(state.month),whole=Math.floor(state.month);
    if(state.renderedIndex!==i){$('current-stories').innerHTML=chapter.entries.map(story).join('');state.renderedIndex=i;document.dispatchEvent(new CustomEvent('history:scene'));}
    if(state.renderedMonth!==whole){$('clock').textContent=now.year;$('clock-month').textContent=now.month;$('timeline').value=whole;const progress=(state.month-state.timeline.start)/(state.timeline.end-state.timeline.start)*100;$('timeline').style.setProperty('--progress',progress+'%');$('travel-progress').textContent='탐험 진행 '+Math.round(progress)+'%';state.renderedMonth=whole;save();}
    $('story-progress').textContent=(i+1)+' / '+state.timeline.chapters.length+' 장면';
    $('previous').disabled=i===0&&Math.abs(state.month-chapter.month)<.01;$('next').disabled=i===state.timeline.chapters.length-1;
    $('play').innerHTML=(state.playing?'❚❚ <span>일시 정지</span>':state.month>=state.timeline.end?'↻ <span>다시 탐험</span>':'▶ <span>탐험 시작</span>');
    const isGap=state.month>=(Math.floor(chapter.month/12)+1)*12&&state.month<state.timeline.end;
    $('gap-note').hidden=!isGap;if(isGap)$('gap-note').textContent='마지막으로 도착한 기록을 보고 있습니다. 이후 구간의 추가 자료는 이 조사본에 아직 수록되지 않았습니다.';
    for(const button of $('record-list').querySelectorAll('[data-jump]')){const active=chapter.entries.some(e=>e.record.id===button.dataset.jump);button.parentElement.classList.toggle('current',active);if(active)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');}
  }
  function stop(note){state.playing=false;cancelAnimationFrame(state.frame);state.frame=0;if(note)$('playback-note').textContent=note;save();render();}
  function jump(month,note){stop();state.hold=0;state.month=C.clamp(month,state.timeline.start,state.timeline.end);state.renderedMonth=null;render();$('playback-note').textContent=note||'기록에 도착했습니다. 재생으로 이어서 탐험하세요.';}
  function tick(time){
    if(!state.playing)return;
    const seconds=Math.min(Math.max(0,(time-state.lastFrame)/1000),.25);state.lastFrame=time;
    if(state.hold>0){state.hold=Math.max(0,state.hold-seconds);$('playback-note').textContent='기록을 읽는 시간 · '+Math.ceil(state.hold)+'초 뒤 이어집니다.';}
    else{const next=C.advance(state.timeline,state.month,seconds,Number($('speed').value),$('skip').checked);state.month=next.month;if(next.arrived&&$('read-pause').checked)state.hold=4;
      $('playback-note').textContent=next.skipped?'수록된 다음 기록으로 이동했습니다.':$('skip').checked?'수록 기록을 따라 탐험하고 있습니다.':'설정한 속도로 시간을 진행하고 있습니다.';render();
      if(next.ended){stop('서기 1950년에 도착했습니다. 이번 탐험을 마쳤습니다.');notify('탐험 완료 · 서기 1950년');return;}
    }
    state.frame=requestAnimationFrame(tick);
  }
  function play(){
    if(state.playing){stop('탐험을 잠시 멈췄습니다.');return;}
    if(state.month>=state.timeline.end)jump(state.timeline.start);
    state.playing=true;state.lastFrame=performance.now();const chapter=state.timeline.chapters[C.indexAt(state.timeline.chapters,state.month)];state.hold=$('read-pause').checked&&Math.abs(state.month-chapter.month)<.01?4:0;render();state.frame=requestAnimationFrame(tick);
  }
  function recordList(){const query=$('record-search').value.trim().toLocaleLowerCase();const rows=state.timeline.entries.filter(e=>{const r=e.record;return [r.title,r.narrative,state.places.get(r.placeId)?.name,...r.theme].join(' ').toLocaleLowerCase().includes(query);});$('record-count').textContent=rows.length;$('record-list').innerHTML=rows.map(e=>{const r=e.record;return '<li class="record-row"><button data-jump="'+escape(r.id)+'"><span class="row-date">'+escape(r.date.label)+'</span><span class="row-description"><strong>'+escape(r.title)+'</strong><small>'+escape(state.places.get(r.placeId)?.name)+' · '+escape(r.theme.join(' / '))+'</small></span><span class="row-arrow" aria-hidden="true">↗</span></button></li>';}).join('');$('search-empty').hidden=rows.length>0;render();}
  function contextList(){$('context-list').innerHTML=state.timeline.contexts.map(r=>'<details class="context-card"><summary><span><span class="context-period">연도 미확정 · '+escape(r.theme.join(' / '))+'</span>'+escape(r.title)+'</span></summary><p>'+escape(r.narrative)+'</p>'+sourceLinks(r.evidence)+evidence(r)+'</details>').join('');}
  function sourceList(){$('source-list').innerHTML=state.location.sources.map(s=>'<article class="source-item"><span class="source-level">'+escape(accessLabels[s.access]||'자료 확인')+'</span><h3><a href="'+url(s.url)+'" target="_blank" rel="noopener noreferrer">'+escape(s.title)+' ↗</a></h3><p>'+escape(s.publisher)+(s.publicationYear?' · '+escape(s.publicationYear)+'년 출판':'')+(s.authors?' · '+escape(s.authors.join(', ')):'')+'</p><p>확인한 부분: '+escape(s.checkedSections)+'</p>'+(s.notes?'<p>'+escape(s.notes)+'</p>':'')+'</article>').join('');}
  class AtlasMap{
    constructor(canvas){this.canvas=canvas;this.span=14;this.cx=127;this.cy=37;new ResizeObserver(()=>this.draw()).observe(canvas);}
    focus(){const p=state.location.representativePoint;this.cx=p.longitude-1;this.cy=p.latitude+1.7;this.span=14;this.draw();}
    zoom(factor){this.span=C.clamp(this.span*factor,3,360);this.draw();}
    world(){this.cx=0;this.cy=0;this.span=360;this.draw();}
    draw(){const canvas=this.canvas,w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h||!state.location)return;const ratio=Math.min(devicePixelRatio||1,2);canvas.width=w*ratio;canvas.height=h*ratio;const ctx=canvas.getContext('2d');ctx.scale(ratio,ratio);ctx.fillStyle='#dbe7e1';ctx.fillRect(0,0,w,h);const scale=w/this.span,latSpan=h/scale,project=point=>[w/2+(point[0]-this.cx)*scale,h/2-(point[1]-this.cy)*scale],bounds=[this.cx-this.span/2,this.cy-latSpan/2,this.cx+this.span/2,this.cy+latSpan/2];
      ctx.strokeStyle='#bacdc055';ctx.lineWidth=.7;const step=this.span>80?30:2;for(let lon=Math.ceil(bounds[0]/step)*step;lon<bounds[2];lon+=step){const x=project([lon,0])[0];ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}for(let lat=Math.ceil(bounds[1]/step)*step;lat<bounds[3];lat+=step){const y=project([0,lat])[1];ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
      ctx.fillStyle='#f3f2e6';ctx.strokeStyle='#b1c2ac';ctx.lineWidth=.7;for(const p of land.polygons){const b=p.bbox;if(b[2]<bounds[0]||b[0]>bounds[2]||b[3]<bounds[1]||b[1]>bounds[3])continue;ctx.beginPath();for(const ring of p.rings){ring.forEach((point,i)=>{const [x,y]=project(point);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();}ctx.fill('evenodd');ctx.stroke();}
      const p=state.location.representativePoint,[x,y]=project([p.longitude,p.latitude]);ctx.beginPath();ctx.arc(x,y,14,0,Math.PI*2);ctx.fillStyle='#b38c4c22';ctx.fill();ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fillStyle='#aa813f';ctx.fill();ctx.strokeStyle='#fffef5';ctx.lineWidth=2;ctx.stroke();ctx.font='600 10px "Malgun Gothic", sans-serif';ctx.fillStyle='#28483a';ctx.fillText((state.location.mapLabel||state.location.name.replace('한반도 ','').replace(' 유역','')),Math.min(w-80,x+12),y+4);
    }
  }
  const map=new AtlasMap($('atlas-map'));
  function choose(id,resume){
    if(state.location)stop();if($('reader-dialog').open)$('reader-dialog').close();reader.chapter=null;state.location=bundle.locations.find(l=>l.id===id)||bundle.locations[0];state.timeline=C.prepare(state.location);state.sources=new Map(state.location.sources.map(s=>[s.id,s]));state.places=new Map(state.location.places.map(p=>[p.id,p]));state.month=state.timeline.start;state.renderedIndex=-1;state.renderedMonth=null;state.hold=0;
    if(resume&&Number.isFinite(resume.month))state.month=C.clamp(resume.month,state.timeline.start,state.timeline.end);
    $('location-select').value=state.location.id;$('location-count').textContent=bundle.locations.length+'곳 수록';$('hero-region').textContent=state.location.name.replace('한반도 ','');$('dated-count').textContent=state.timeline.entries.length;$('context-count').textContent=state.timeline.contexts.length;$('source-count').textContent=state.location.sources.length;
    $('location-description').textContent=state.location.spatialScope.description;
    const p=state.location.representativePoint;$('coordinate-label').textContent=p.display;$('point-name').textContent=state.places.get(p.placeId)?.name||'대표점';$('map-link').href='https://www.openstreetmap.org/?mlat='+p.latitude+'&mlon='+p.longitude+'#map=13/'+p.latitude+'/'+p.longitude;$('start-label').textContent=state.location.id==='tz-chemba-kidoka'?'이 점의 초기 거주는 아직 모릅니다. 북쪽 약 98km의 키세세Ⅱ 비교 유적부터 살펴봅니다.':state.location.timelinePolicy.recommendedStart.label+'의 확인 자료부터 시간을 진행합니다.';
    $('collection-note').textContent=state.location.readings.completion==='confirmed_notes'?'확인된 기록을 먼저 수록했습니다. 깊이 읽기는 보강 예정입니다.':'조사한 자료가 HTML 안에 담겨 있습니다.';
    $('reading-heading').textContent=state.location.readings.completion==='confirmed_notes'?'시대를 따라 확인 자료 읽기':'시대를 따라 깊이 읽기';
    $('reading-status').hidden=state.location.readings.completion!=='confirmed_notes';
    $('timeline').min=state.timeline.start;$('timeline').max=state.timeline.end;$('time-start').textContent=state.location.timelinePolicy.recommendedStart.label;$('timeline-markers').innerHTML=state.timeline.chapters.map(c=>'<i style="left:'+((c.month-state.timeline.start)/(state.timeline.end-state.timeline.start)*100)+'%"></i>').join('');
    $('record-search').value='';contextList();sourceList();readingList();recordList();map.focus();render();$('playback-note').textContent=resume?'저장된 탐험 시점을 불러왔습니다. 재생으로 이어서 탐험하세요.':'재생을 누르면 탐험을 시작합니다.';
    save();document.dispatchEvent(new CustomEvent('history:location'));
  }
  function openDialog(id){stop('자료를 읽는 동안 탐험을 멈췄습니다.');$(id).showModal();}
  function download(content,type,filename){const blob=new Blob([content],{type}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
  $('location-select').innerHTML=bundle.locations.map(l=>'<option value="'+escape(l.id)+'">'+escape(l.name.replace('한반도 ',''))+'</option>').join('');
  $('compass').innerHTML=['북','북동','동','남동','남','남서','서','북서'].map(d=>'<div class="compass-card"><strong>'+d+'</strong><span>시대별 비교 자료 준비 중</span></div>').join('');
  let resume=null;try{resume=JSON.parse(localStorage.getItem(storageKey));if(resume?.version!==bundle.version)resume=null;}catch{}
  if(resume){if(['1','12','120','1200','12000'].includes(resume.speed))$('speed').value=resume.speed;if(typeof resume.skip==='boolean')$('skip').checked=resume.skip;if(typeof resume.readPause==='boolean')$('read-pause').checked=resume.readPause;}
  choose(resume?.locationId,resume);
  $('play').addEventListener('click',play);
  $('previous').addEventListener('click',()=>{const i=C.indexAt(state.timeline.chapters,state.month);const target=Math.abs(state.month-state.timeline.chapters[i].month)>.01?i:Math.max(0,i-1);jump(state.timeline.chapters[target].month);});
  $('next').addEventListener('click',()=>{const i=C.indexAt(state.timeline.chapters,state.month);jump(state.timeline.chapters[Math.min(i+1,state.timeline.chapters.length-1)].month);});
  $('restart').addEventListener('click',()=>{jump(state.timeline.start,'처음 기록으로 돌아왔습니다.');notify('이 장소의 탐험을 처음부터 시작합니다.');});
  $('draw').addEventListener('click',()=>{const location=bundle.locations[Math.floor(Math.random()*bundle.locations.length)];choose(location.id);notify(bundle.locations.length===1?state.location.name+'을 선택했습니다.':location.name+'을 추첨했습니다.');});
  $('location-select').addEventListener('change',()=>choose($('location-select').value));
  $('timeline').addEventListener('input',()=>jump(Number($('timeline').value),'연표로 이동했습니다. 재생을 누르면 여기서 이어집니다.'));
  for(const id of ['speed','skip','read-pause'])$(id).addEventListener('change',()=>{if(!$('read-pause').checked)state.hold=0;save();render();});
  $('record-search').addEventListener('input',recordList);
  document.addEventListener('click',event=>{const button=event.target.closest('[data-reading]');if(button)openReading(button.dataset.reading,button.dataset.readingLevel);const era=event.target.closest('[data-era-jump]');if(era){const entry=state.timeline.entries.find(e=>e.record.id===era.dataset.eraJump);jump(entry.month);$('exploration').scrollIntoView({behavior:'smooth'});}});
  $('reading-levels').addEventListener('click',event=>{const button=event.target.closest('[data-level]');if(button){reader.level=button.dataset.level;renderReader();}});
  $('reader-toc').addEventListener('click',event=>{const button=event.target.closest('[data-section]');if(button)$('reading-section-'+button.dataset.section).scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});});
  $('reader-scroll').addEventListener('scroll',readerProgress,{passive:true});
  $('reader-next').addEventListener('click',()=>{const next=state.location.readings.chapters[state.location.readings.chapters.indexOf(reader.chapter)+1];if(next)openReading(next.id,reader.level);});
  $('record-list').addEventListener('click',event=>{const button=event.target.closest('[data-jump]');if(!button)return;const entry=state.timeline.entries.find(e=>e.record.id===button.dataset.jump);jump(entry.month);$('current-stories').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});});
  document.addEventListener('toggle',event=>{if(event.target.matches('.story-evidence[open],.context-card[open]'))stop('근거를 읽는 동안 탐험을 멈췄습니다.');},true);
  $('open-sources').addEventListener('click',()=>openDialog('sources-dialog'));$('open-guide').addEventListener('click',()=>openDialog('guide-dialog'));
  document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
  document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const b=dialog.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)dialog.close();}));
  $('export-data').addEventListener('click',()=>download(JSON.stringify(state.location,null,2),'application/json;charset=utf-8',state.location.id+'.json'));
  $('export-html').addEventListener('click',()=>{download(exportHTML(),'text/html;charset=utf-8','시간의-좌표-역사탐험.html');notify('화면과 조사 자료가 담긴 HTML을 저장합니다.');});
  $('map-in').addEventListener('click',()=>map.zoom(.7));$('map-out').addEventListener('click',()=>map.zoom(1/.7));$('map-world').addEventListener('click',()=>map.world());
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.playing)stop('다시 볼 때 이어서 탐험할 수 있도록 일시 정지했습니다.');});
  window.addEventListener('pagehide',save);
  // Shared interface for discovery controls and local verification; no server API.
  window.HistoryAtlas={getLocation:()=>state.location,openReading,pause:()=>stop('자료를 탐색하는 동안 재생을 멈췄습니다.'),goToRecord:id=>{const entry=state.timeline.entries.find(e=>e.record.id===id);if(entry)jump(entry.month);},getState:()=>({locationId:state.location.id,month:state.month,time:C.parts(state.month),playing:state.playing,chapter:C.indexAt(state.timeline.chapters,state.month),endYear:C.END_YEAR,records:state.timeline.entries.length})};
})();
