(function(){
  'use strict';
  const E=HistoryEngine,repo=HistoryRepositories.create(),$=id=>document.getElementById(id);
  const state={data:{events:[],places:[],queries:[]},point:null,land:null,index:null,events:[],month:0,min:0,max:1,playing:false,lastFrame:0,busy:false,demo:false,example:null,renderKey:'',request:0,abort:null,waitTimer:null};
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl=value=>{try{const u=new URL(value);return u.protocol==='https:'?esc(u.href):'#';}catch(_){return '#';}};
  function source(e){return `<a class="source-link" href="${safeUrl(e.sourceUrl)}" target="_blank" rel="noopener">${esc(e.sourceTitle||'출처')} ↗</a>`;}
  function status(e){return `<span class="badge ${e.status==='reviewed'?'reviewed':'candidate'}">${e.status==='reviewed'?'검토 완료':'자동 수집 · 검토 대기'}</span>`;}
  function notice(message,kind){$('notice').textContent=message;$('notice').className='notice'+(kind?' '+kind:'');}
  function busy(value){state.busy=value;['draw','example'].forEach(id=>$(id).disabled=value||!state.index);$('research').disabled=value||!state.point;$('cancel-research').hidden=!value;$('collection-feedback').classList.toggle('collecting',value);document.querySelector('#coordinate-form button').disabled=value;}
  function pause(){state.playing=false;$('play').innerHTML='▶ <span>재생</span>';}
  function play(){if(!state.events.length||state.playing)return;if(state.month>=state.max)state.month=state.min;state.playing=true;state.lastFrame=performance.now();state.readIds=E.activeEvents(state.events,state.month).map(e=>e.id);state.holdUntil=state.lastFrame+($('read-pause').checked&&state.readIds.length?3000:0);$('play').innerHTML='Ⅱ <span>일시정지</span>';requestAnimationFrame(tick);}
  function startResearch(){
    const request=++state.request,started=Date.now();state.abort=new AbortController();let message='저장된 자료를 확인하고 있습니다.';
    const progress=text=>{message=text;notice(`${text} · ${Math.floor((Date.now()-started)/1000)}초 경과`,'busy');};
    busy(true);progress(message);clearInterval(state.waitTimer);state.waitTimer=setInterval(()=>progress(message),1000);
    return {request,progress,signal:state.abort.signal};
  }
  function endResearch(request){if(request!==state.request)return;clearInterval(state.waitTimer);state.waitTimer=null;state.abort=null;busy(false);}
  $('cancel-research').addEventListener('click',()=>{state.abort?.abort();++state.request;clearInterval(state.waitTimer);state.waitTimer=null;state.abort=null;busy(false);notice(repo.kind==='sheets'?'이 화면의 대기를 중단했습니다. 서버가 이미 수집한 자료는 보관함에 남을 수 있습니다. 다른 위치를 추첨할 수 있습니다.':'자료 수집을 중단했습니다. 다른 위치를 추첨할 수 있습니다.');});
  function updateStats(){
    $('stat-events').textContent=state.data.events.filter(e=>e.status!=='rejected').length.toLocaleString('ko-KR');
    $('stat-queries').textContent=state.data.queries.length.toLocaleString('ko-KR');
    $('library-count').textContent=state.data.events.length.toLocaleString('ko-KR');
  }
  function allEvents(){return state.demo?state.example.events:state.data.events;}
  function allPlaces(){return state.demo?state.example.places:state.data.places;}
  function configureTimeline(reset){
    if(!state.point)return;
    state.events=E.chronology(allEvents(),state.point,Number($('radius').value),$('reviewed-only').checked);
    const start=E.startPoint(state.events,state.point);
    $('start-note').textContent=start.label;
    const yearNow=new Date().getUTCFullYear();
    state.min=Math.min(start.year??yearNow,...state.events.map(e=>e.startYear))*12;
    state.max=Math.max(yearNow*12+11,...state.events.map(e=>(e.endYear+1)*12-1),state.min+1);
    if(reset)state.month=(start.year??yearNow)*12;
    else state.month=Math.max(state.min,Math.min(state.max,state.month));
    $('timeline').min=state.min;$('timeline').max=state.max;$('timeline').disabled=!state.events.length;
    ['play','next','previous'].forEach(id=>$(id).disabled=!state.events.length);
    $('time-start').textContent=state.events.length?E.formatTime(state.min):'연대 자료 없음';
    $('time-end').textContent=E.formatTime(state.max);
    $('timeline-markers').innerHTML=state.events.map(e=>`<i style="left:${Math.max(0,Math.min(100,(e.startYear*12-state.min)/(state.max-state.min)*100))}%"></i>`).join('');
    $('visible-count').textContent=state.events.length;
    renderRecords();state.renderKey='';renderTime();map.draw();
  }
  function renderLocation(){
    if(!state.point)return;
    const point=state.point,places=allPlaces();
    const nearby=places.filter(p=>E.distance(point,p)<=10).sort((a,b)=>E.distance(point,a)-E.distance(point,b));
    const p=nearby[0];
    const titles=state.events.filter(e=>E.distance(point,e)<2).sort((a,b)=>E.distance(point,a)-E.distance(point,b));
    $('location-name').textContent=p?p.name+' 인근':titles[0]?.placeName||'새로운 육지의 한 점';
    $('location-description').textContent=p?p.description||'이 장소의 연대 자료를 살펴보세요.':'좌표 주변의 연대 자료를 탐색합니다. 장소 이름이나 거주 증거가 없으면 확인되지 않았다고 표시합니다.';
    if(p)$('location-description').insertAdjacentHTML('beforeend',`<div class="place-source"><span>현재 장소 소개 · ${E.distance(point,p).toFixed(1)} km 거리 · </span>${source(p)}</div>`);
    $('coordinates').textContent=`위도 ${point.lat.toFixed(5)}° / 경도 ${point.lon.toFixed(5)}°`;
    $('map-empty').hidden=true;
    $('data-badge').textContent=state.demo?'기능 확인 예시':state.events.length?'출처 있는 기록':'자료 부족';
    $('data-badge').className='badge'+(state.demo?' demo-label':'');
  }
  function renderRecords(){
    const list=$('record-list');
    if(!state.events.length){list.innerHTML='<p class="empty-copy">이 범위에 수록된 연대 자료가 없습니다. 반경을 넓혀 자료를 보완하거나, 출처 있는 자료를 보관함에 추가할 수 있습니다.</p>';return;}
    list.innerHTML=state.events.map(e=>`<article class="record-row"><div class="record-date">${esc(E.dateLabel(e))}</div><div><h3>${esc(e.title)}</h3><div class="record-meta">${status(e)}<span>${esc(E.relation(e,state.point))}</span></div><p>${esc(e.description)}</p>${source(e)}</div><button class="outline-button" data-jump="${esc(e.id)}">이동</button></article>`).join('');
  }
  function renderTime(){
    if(!state.point)return;
    $('clock').textContent=state.events.length?E.formatTime(state.month,Number($('speed').value)===1):'연대 자료 없음';
    $('timeline').value=Math.round(state.month);
    const active=E.activeEvents(state.events,state.month),key=active.map(e=>e.id).join('|')+':'+Math.floor(state.month/12);
    if(key===state.renderKey)return;
    state.renderKey=key;
    $('current-stories').innerHTML=active.length?active.map(e=>`<article class="current-story"><div class="record-meta">${status(e)}<span>${esc(E.relation(e,state.point))}</span></div><h3>${esc(e.title)}</h3><p>${esc(e.description)}</p><div class="record-meta"><span>${esc(E.dateLabel(e))}</span>${source(e)}</div></article>`).join(''):'<div class="empty-story"><span class="line-mark"></span><p>이 시점의 수록 자료가 없습니다.<br>다음 기록으로 이동하거나 자료를 보완해 보세요.</p></div>';
    renderCompass();
  }
  function renderCompass(){
    const items=state.point?E.compareDirections(state.events,state.point,state.month,Number($('radius').value)):E.DIRECTIONS.map(direction=>({direction,event:null}));
    const order=['북서','북','북동','서','center','동','남서','남','남동'];
    $('compass').innerHTML=order.map(dir=>{
      if(dir==='center')return `<div class="direction-card center"><strong>${state.point?'도착한 위치':'✧'}</strong><span>${state.point?esc(E.formatTime(state.month)):'다음 탐험을 기다리며'}</span></div>`;
      const item=items.find(i=>i.direction===dir),e=item.event;
      return `<article class="direction-card"><div class="direction-heading"><strong>${dir}</strong><span>${e?Math.round(E.distance(state.point,e)).toLocaleString('ko-KR')+' km':''}</span></div>${e?`<h3>${esc(e.placeName||e.title)}</h3><p>${item.active?'이 시점의 기록':'지난 기록 · 현재 존속 여부 미확인'}</p><p>${esc(E.dateLabel(e))}</p>${source(e)}`:'<p>이 방향의 수록 기록이 없습니다.</p>'}</article>`;
    }).join('');
  }
  async function explore(point,attempts){
    if(state.busy)return;
    let operation;
    try{
      E.coordinate(point);if(!E.isLand(point,state.index))throw new Error('현재 지도에서 육지로 판별되지 않는 위치입니다. 다른 좌표를 입력해 주세요.');
      pause();state.demo=false;state.point=point;state.renderKey='';
      $('draw-info').textContent=attempts?`${attempts}번 추첨 · 바다 ${attempts-1}번 제외`:'직접 선택한 좌표';
      configureTimeline(true);renderLocation();map.focus(point);operation=startResearch();
      const result=await repo.research(point,Number($('radius').value),operation.progress,false,operation.signal);
      if(operation.request!==state.request)return;
      state.data={...state.data,...result};updateStats();configureTimeline(true);renderLocation();
      const count=state.events.length;
      notice((result.reused?'저장된 수집 자료를 재사용했습니다.':`${result.newEvents}개의 연대 자료를 새로 저장했습니다.`)+` 이 범위의 수록 자료 ${count}개.`+(result.warnings?.length?' 일부 검색이 완료되지 않았습니다. 자료 보완으로 다시 시도할 수 있습니다.':'')+(count?($('autoplay').checked?' 역사 재생을 시작했습니다.':' 아래 재생 버튼을 눌러 시작하세요.'):' 재생할 연대 자료가 없습니다. 다른 육지를 추첨하거나 반경을 넓혀 자료를 보완해 주세요.'),result.warnings?.length?'error':'');
      if(count&&$('autoplay').checked){play();if(!document.querySelector('dialog[open]'))$('current-stories').scrollIntoView({behavior:'smooth',block:'center'});}
    }catch(error){if(!operation||operation.request===state.request)notice(error.message,'error');}finally{if(operation)endResearch(operation.request);}
  }
  async function supplement(){
      if(!state.point||state.busy)return;
    if(state.demo){state.demo=false;configureTimeline(true);renderLocation();}
    pause();const operation=startResearch();
    try{const result=await repo.research(state.point,Number($('radius').value),operation.progress,true,operation.signal);if(operation.request!==state.request)return;state.data={...state.data,...result};updateStats();configureTimeline(false);renderLocation();notice(`${result.newEvents}개 자료 추가. 저장이 완료되었습니다.`+(result.warnings?.length?' 일부 검색이 완료되지 않았습니다.':''),result.warnings?.length?'error':'');if(state.events.length&&$('autoplay').checked)play();}
    catch(error){if(operation.request===state.request)notice(error.message,'error');}finally{endResearch(operation.request);}
  }
  function showLibrary(){
    $('library-storage').textContent=repo.kind==='sheets'?(state.data.isOwner?'모든 플레이어가 모은 자료는 연결된 Google Sheets에 함께 저장됩니다. 소유자는 출처를 검토하고 자료를 보완할 수 있습니다.':'모든 플레이어가 모은 공개 역사 자료입니다. 자료 수집은 함께 할 수 있으며, 검토·수정은 관리자가 담당합니다.'):'현재 이 브라우저에 저장된 자료입니다. 다른 기기와 공유하려면 Google Apps Script 버전을 사용하세요.';
    $('sheet-link').hidden=!state.data.sheetUrl;if(state.data.sheetUrl)$('sheet-link').href=state.data.sheetUrl;
    $('add-manual').hidden=state.data.isOwner===false;$('export').hidden=state.data.isOwner===false;
    const filter=$('library-filter').value,rows=state.data.events.filter(e=>filter==='all'||e.status===filter).sort((a,b)=>a.startYear-b.startYear);
    $('library-list').innerHTML=rows.length?rows.map(e=>`<article class="library-row"><h3>${esc(e.title)}</h3><div class="record-meta"><span>${esc(E.dateLabel(e))}</span>${e.status==='rejected'?'<span class="badge">제외</span>':status(e)}<span>${esc(e.lat)}, ${esc(e.lon)}</span></div><p>${esc(e.description)}</p>${source(e)}<details><summary>수집한 근거 보기</summary><p>${esc(e.sourceQuote||'원문 발췌 없음 · 출처에서 확인해 주세요.')}</p><p>수집: ${esc(e.collectedAt)} · ID: ${esc(e.id)}</p></details>${state.data.isOwner!==false?`<div class="row-actions"><button class="outline-button" data-review="${esc(e.id)}" data-status="reviewed">검토 완료</button><button class="outline-button" data-review="${esc(e.id)}" data-status="rejected">제외</button><button class="text-button" data-review="${esc(e.id)}" data-status="candidate">검토 대기로</button></div>`:''}</article>`).join(''):'<p class="empty-copy">이 상태의 저장 자료가 없습니다. 첫 탐험에서 자료를 모아보세요.</p>';
  }
  function download(data){const blob=new Blob([JSON.stringify({version:E.VERSION,exportedAt:new Date().toISOString(),events:data.events,places:data.places,queries:data.queries},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='history-atlas-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
  class AtlasMap {
    constructor(canvas){
      this.canvas=canvas;this.zoom=1;this.cx=0;this.cy=0;this.drag=null;
      new ResizeObserver(()=>this.draw()).observe(canvas);
      canvas.addEventListener('pointerdown',e=>{this.drag={x:e.clientX,y:e.clientY,cx:this.cx,cy:this.cy};canvas.setPointerCapture(e.pointerId);});
      canvas.addEventListener('pointermove',e=>{if(!this.drag)return;const scale=this.scale();this.cx=this.drag.cx-(e.clientX-this.drag.x)/scale;this.cy=Math.max(-85,Math.min(85,this.drag.cy+(e.clientY-this.drag.y)/scale));this.draw();});
      const end=()=>{this.drag=null;};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
      canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom=Math.max(1,Math.min(25,this.zoom*(e.deltaY<0?1.2:1/1.2)));this.draw();},{passive:false});
    }
    scale(){return this.canvas.clientWidth/360*this.zoom;}
    focus(p){this.cx=p.lon;this.cy=p.lat;this.zoom=4;this.draw();}
    world(){this.cx=0;this.cy=0;this.zoom=1;this.draw();}
    draw(){
      const canvas=this.canvas,w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
      const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=w*dpr;canvas.height=h*dpr;const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);ctx.fillStyle='#dce8e8';ctx.fillRect(0,0,w,h);
      const s=this.scale(),project=(lon,lat)=>[w/2+(lon-this.cx)*s,h/2-(lat-this.cy)*s];
      ctx.lineWidth=.6;ctx.strokeStyle='#bacfce';
      const step=this.zoom>8?5:this.zoom>2?15:30;
      for(let lat=-90;lat<=90;lat+=step){const [,y]=project(0,lat);ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
      for(let lon=Math.floor((this.cx-w/2/s)/step)*step;lon<=this.cx+w/2/s;lon+=step){const [x]=project(lon,0);ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
      if(state.land){
        const west=this.cx-w/2/s,east=this.cx+w/2/s,south=this.cy-h/2/s,north=this.cy+h/2/s;
        ctx.fillStyle='#eef0dc';ctx.strokeStyle='#9aad9e';ctx.lineWidth=.55;
        for(const offset of [-360,0,360])for(const p of state.land.polygons){
          const b=p.bbox;if(b[2]+offset<west||b[0]+offset>east||b[3]<south||b[1]>north)continue;
          ctx.beginPath();for(const ring of p.rings){ring.forEach(([lon,lat],i)=>{const [x,y]=project(lon+offset,lat);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});ctx.closePath();}ctx.fill('evenodd');ctx.stroke();
        }
      }
      ctx.font='9px system-ui';ctx.fillStyle='#6a8a89';ctx.textAlign='left';for(let lat=-60;lat<=60;lat+=step){const [,y]=project(0,lat);if(y>50&&y<h-15)ctx.fillText(Math.abs(lat)+'°'+(lat>=0?'N':'S'),8,y-4);}
      if(state.point){
        const p=state.point;let longitude=p.lon;while(longitude-this.cx>180)longitude-=360;while(longitude-this.cx<-180)longitude+=360;
        const [x,y]=project(longitude,p.lat),r=Number($('radius').value)/111.32*s;
        ctx.strokeStyle='#b4573655';ctx.fillStyle='#b4573608';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(x,y,r/Math.max(.12,Math.cos(p.lat*Math.PI/180)),r,0,0,Math.PI*2);ctx.fill();ctx.stroke();
        const nearby=state.events.filter(e=>E.distance(e,p)>1);ctx.fillStyle='#728b7b';for(const e of nearby){const [ex,ey]=project(e.lon,e.lat);ctx.beginPath();ctx.arc(ex,ey,2.5,0,Math.PI*2);ctx.fill();}
        ctx.strokeStyle='#b45736';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,12,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#b45736';ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(x-20,y);ctx.lineTo(x-8,y);ctx.moveTo(x+8,y);ctx.lineTo(x+20,y);ctx.moveTo(x,y-20);ctx.lineTo(x,y-8);ctx.moveTo(x,y+8);ctx.lineTo(x,y+20);ctx.stroke();
      }
    }
  }
  const map=new AtlasMap($('world-map'));
  $('draw').addEventListener('click',()=>{try{const p=E.randomLand(state.index);explore({lat:p.lat,lon:p.lon},p.attempts);}catch(e){notice(e.message,'error');}});
  $('example').addEventListener('click',async()=>{
    if(state.busy)return;pause();
    try{state.example=state.example||window.HISTORY_EXAMPLE||await fetch('./data/example.json').then(r=>r.json());state.demo=true;state.point=state.example.point;$('radius').value='700';$('draw-info').textContent='저장하지 않는 기능 예시';configureTimeline(true);renderLocation();map.focus(state.point);busy(false);notice('UNESCO 자료를 바탕으로 구성한 예시입니다. 실제 보관함에 저장되지 않습니다.');}
    catch(e){notice(e.message,'error');}
  });
  $('research').addEventListener('click',supplement);
  $('radius').addEventListener('change',()=>{pause();configureTimeline(false);renderLocation();notice('저장된 자료에서 탐색 반경을 바꿨습니다. 새 범위의 자료가 필요하면 자료 보완을 누르세요.');});
  $('reviewed-only').addEventListener('change',()=>{pause();configureTimeline(false);renderLocation();});
  $('play').addEventListener('click',()=>{if(state.playing)pause();else play();});
  function tick(now){if(!state.playing)return;const elapsed=Math.min(.3,(now-state.lastFrame)/1000);state.lastFrame=now;if($('read-pause').checked&&now<state.holdUntil){requestAnimationFrame(tick);return;}const result=E.advance(state.events,state.month,elapsed,Number($('speed').value),$('skip').checked);state.month=Math.min(state.max,result.month);const activeIds=E.activeEvents(state.events,state.month).map(e=>e.id);if($('read-pause').checked&&activeIds.some(id=>!state.readIds.includes(id)))state.holdUntil=now+3000;state.readIds=activeIds;if(result.skipped)notice('수록 자료가 없는 구간을 건너뛰었습니다.');renderTime();if(state.month>=state.max){pause();notice('현재까지의 탐험을 마쳤습니다. 다음 육지를 추첨해 보세요.');}else requestAnimationFrame(tick);}
  $('timeline').addEventListener('input',()=>{pause();state.month=Number($('timeline').value);state.renderKey='';renderTime();});
  $('speed').addEventListener('change',()=>{state.renderKey='';renderTime();});
  $('next').addEventListener('click',()=>{pause();const next=state.events.map(e=>e.startYear*12).filter(m=>m>state.month+.01).sort((a,b)=>a-b)[0];if(next===undefined){notice('이후의 수록 기록이 없습니다.');return;}state.month=next;renderTime();});
  $('previous').addEventListener('click',()=>{pause();const prev=state.events.map(e=>e.startYear*12).filter(m=>m<state.month-.01).sort((a,b)=>b-a)[0];state.month=prev??state.min;renderTime();});
  $('record-list').addEventListener('click',e=>{const b=e.target.closest('[data-jump]');if(!b)return;const event=state.events.find(r=>r.id===b.dataset.jump);pause();state.month=event.startYear*12;renderTime();$('clock').scrollIntoView({behavior:'smooth',block:'center'});});
  $('world-view').addEventListener('click',()=>map.world());$('zoom-in').addEventListener('click',()=>{map.zoom=Math.min(25,map.zoom*1.5);map.draw();});$('zoom-out').addEventListener('click',()=>{map.zoom=Math.max(1,map.zoom/1.5);map.draw();});
  $('open-guide').addEventListener('click',()=>$('guide-dialog').showModal());$('open-library').addEventListener('click',()=>{showLibrary();$('library-dialog').showModal();});
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
  $('library-filter').addEventListener('change',showLibrary);
  $('library-list').addEventListener('click',async e=>{const b=e.target.closest('[data-review]');if(!b||state.busy)return;b.disabled=true;try{const data=await repo.review(b.dataset.review,b.dataset.status);state.data={...state.data,...data};updateStats();showLibrary();configureTimeline(false);if(state.point)renderLocation();notice('검토 상태를 저장했습니다.');}catch(error){notice(error.message,'error');}finally{b.disabled=false;}});
  $('export').addEventListener('click',async()=>{try{download(await repo.export());notice('저장된 전체 자료를 JSON으로 백업했습니다.');}catch(e){notice(e.message,'error');}});
  $('add-manual').addEventListener('click',()=>{$('manual-form').reset();$('manual-error').textContent='';if(state.point){$('manual-form').elements.lat.value=state.point.lat.toFixed(5);$('manual-form').elements.lon.value=state.point.lon.toFixed(5);}$('manual-dialog').showModal();});
  $('manual-form').addEventListener('submit',async e=>{
    e.preventDefault();const form=e.currentTarget,button=form.querySelector('.primary-button');button.disabled=true;
    try{const values=Object.fromEntries(new FormData(form));const era=(n,which)=>which==='bce'?1-Number(n):Number(n);const event={...values,lat:Number(values.lat),lon:Number(values.lon),radiusKm:Number(values.radiusKm),startYear:era(values.start,values.startEra),endYear:era(values.end,values.endEra),scope:'site',placeId:'',sourceQuote:''};const data=await repo.manual(event);state.data={...state.data,...data};updateStats();showLibrary();if(state.point){configureTimeline(false);renderLocation();}$('manual-dialog').close();notice('출처 있는 자료를 저장했습니다.');}catch(error){$('manual-error').textContent=error.message;}finally{button.disabled=false;}
  });
  $('coordinate-form').addEventListener('submit',e=>{e.preventDefault();const v=Object.fromEntries(new FormData(e.currentTarget));explore({lat:Number(v.lat),lon:Number(v.lon)});});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  async function initialize(){
    renderCompass();
    const cloud=repo.kind==='sheets';
    $('cloud-link').hidden=cloud;
    $('storage-label').textContent=cloud?'로그인 없이 탐험 · 자료 함께 저장':'이 브라우저에 누적 저장 · 시험용';
    $('guide-storage').textContent=cloud?'Google 로그인 없이 링크로 탐험할 수 있습니다. 공개 역사 자료는 Google Sheets에 함께 쌓이며, 다른 플레이어도 다시 사용할 수 있습니다. 자료 검토·수정과 저장 시트 관리는 소유자가 담당합니다.':'이 버전은 브라우저의 IndexedDB에 자료를 저장합니다. 브라우저 데이터를 삭제하면 자료가 사라질 수 있으므로 JSON으로 백업하세요. Google Apps Script에서 실행하면 Google Sheets 저장으로 전환됩니다.';
    try{
      const [land,data]=await Promise.all([window.HISTORY_LAND?Promise.resolve(window.HISTORY_LAND):fetch('./data/land.json').then(r=>{if(!r.ok)throw new Error('육지 지도를 불러오지 못했습니다.');return r.json();}),repo.load()]);
      state.land=land;state.index=E.createLandIndex(land);state.data=data;updateStats();busy(false);map.draw();notice('준비되었습니다. 새로운 육지를 추첨하거나 예시를 먼저 살펴보세요.');
    }catch(error){notice(error.message,'error');}
  }
  initialize();
})();
