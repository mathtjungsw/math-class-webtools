const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const C=require('../math-game/car-clock-garage/core.js');
const {Session}=require('../math-game/car-clock-garage/cloud.js');
const copy=x=>JSON.parse(JSON.stringify(x));
const catalog=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../math-game/car-clock-garage/photos/sources.json'),'utf8'));
const memory=()=>{const map=new Map();return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
function backend(){
  const rows=[['key','id','revision','at','request','state',...Array(10).fill('history')]],writes=[];
  const sheet={getLastRow:()=>rows.length,appendRow:row=>{rows.push(copy(row));},getRange(row,col,n=1,m=1){return {
    getValue:()=>rows[row-1]?.[col-1]??'',
    getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>rows[row+i-1]?.[col+j-1]??'')),
    setValues(values){writes.push({row,col,n,m});values.forEach((r,i)=>r.forEach((v,j)=>{rows[row+i-1][col+j-1]=v;}));},
    createTextFinder(key){return {matchEntireCell(){return this;},matchCase(){return this;},useRegularExpression(){return this;},findNext(){const i=rows.findIndex((r,i)=>i>=row-1&&i<row-1+n&&r[col-1]===key);return i<0?null:{getRow:()=>i+1};}};}
  };}};
  const cache=new Map(),context={GARAGE_CORE:C,GARAGE_CATALOG:catalog,SPREADSHEET_ID:'test-sheet',BUILD_ID:'test',SpreadsheetApp:{openById:()=>({getSheetByName:()=>sheet})},CacheService:{getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v)})},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})},Utilities:{DigestAlgorithm:{SHA_256:'SHA'},Charset:{UTF_8:'UTF8'},computeDigest:(_,s)=>[...Buffer.from(s)]},Date,JSON,Number,Error};
  vm.createContext(context);vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../math-game/car-clock-garage/apps-script/Code.gs'),'utf8'),context);
  return {call:input=>copy(context.garageRequest(copy(input))),rows,writes};
}
function session(server,storage=memory(),extra={}){return new Session({request:async b=>server.call(b),storage,validate:p=>C.validate(p,catalog),schedule:()=>1,cancel:()=>{},...extra});}

test('ID-only registration/load rejects typo, duplicate and invalid IDs without returning other accounts',()=>{
  const b=backend();assert.equal(b.call({action:'load',id:'없는아이디'}).error,'ID_NOT_FOUND');
  const first=b.call({action:'register',id:'  첫아이디  '});assert.equal(first.ok,true);assert.equal(first.id,'첫아이디');assert.equal(first.progress.xp,0);
  assert.equal(b.call({action:'register',id:'첫아이디'}).error,'ID_EXISTS');
  assert.equal(b.call({action:'register',id:'=bad()'}).error,'ID_INVALID');
  b.call({action:'register',id:'Other'});assert.equal(b.call({action:'register',id:'OTHER'}).error,'ID_EXISTS');
  assert.equal(b.call({action:'load',id:'Other'}).progress.xp,0);assert.equal('users' in first,false);
});

test('server saves one ID row, preserves other accounts, and rejects stale revisions',()=>{
  const b=backend();b.call({action:'register',id:'테스트A'});b.call({action:'register',id:'테스트B'});
  const original=copy(b.rows[2]);const progress=C.fresh();progress.xp=10;
  const save={action:'save',id:'테스트A',revision:0,requestId:'request_123',progress};
  assert.equal(b.call(save).revision,1);assert.deepEqual(b.rows[2],original);
  assert.equal(b.writes.length,1);assert.equal(b.writes[0].row,2);assert.equal(b.writes[0].col,3);
  assert.equal(b.call(save).revision,1);assert.equal(b.writes.length,1);
  assert.equal(b.call({...save,requestId:'request_124'}).error,'CONFLICT');
  assert.equal(b.call({action:'load',id:'테스트A'}).progress.xp,10);
  assert.equal(b.call({...save,revision:1,requestId:'request_125',progress:{...progress,xp:-5}}).error,'INVALID_PROGRESS');
});

test('2,000 detailed records are chunked below Sheets cell limits and round-trip exactly',()=>{
  const b=backend();b.call({action:'register',id:'긴기록'});const p=C.fresh();
  p.history=Array.from({length:2000},()=>({at:new Date().toISOString(),kind:'car',carId:catalog[0].id,mode:'dual',answer:'긴 자동차 이름과 출시연도 · 2020년',attempts:1,hinted:false,first:true,xp:10}));
  p.stats.car={total:2000,first:2000,assisted:0};p.xp=20000;
  assert.equal(b.call({action:'save',id:'긴기록',revision:0,requestId:'long_request',progress:p}).ok,true);
  assert.ok(b.rows[1].slice(5).every(value=>String(value).length<=45000));
  assert.equal(b.call({action:'load',id:'긴기록'}).progress.history.length,2000);
});

test('two independent device sessions resume progress using only the same ID',async()=>{
  const b=backend(),a=session(b);await a.open('이어하기','register');
  const progress=C.fresh();const q=C.ensureQuestion(progress,catalog);C.answer(progress,{model:q.modelAnswer,year:q.yearAnswer});
  a.queue(progress);assert.equal(await a.flush(),true);
  const second=session(b);const loaded=await second.open('이어하기');
  assert.equal(loaded.progress.xp,10);assert.equal(loaded.progress.active.resolved,true);assert.equal(loaded.revision,1);
  assert.equal(C.answer(loaded.progress,{model:q.modelAnswer,year:q.yearAnswer}).changed,false);
});

test('failed response after a committed save retries the same request without duplicate writes',async()=>{
  const b=backend();let fail=true;
  const a=session(b,memory(),{request:async request=>{const reply=b.call(request);if(request.action==='save'&&fail){fail=false;throw Error('NETWORK');}return reply;}});
  await a.open('통신재시도','register');const p=C.fresh();p.xp=10;a.queue(p);
  assert.equal(await a.flush(),false);assert.equal(b.writes.length,1);assert.equal(a.dirty,true);
  assert.equal(await a.flush(),true);assert.equal(b.writes.length,1);assert.equal(a.revision,1);
});

test('pending local changes survive reload and stale device writes are stopped',async()=>{
  const b=backend(),storage=memory();const first=session(b,storage);await first.open('복구검사','register');
  const p=C.fresh();p.xp=20;first.queue(p);
  const restored=session(b,storage);const result=await restored.open('복구검사');assert.equal(result.progress.xp,20);await restored.flush();
  let conflict=false;const stale=session(b,memory(),{onConflict:()=>{conflict=true;}});await stale.open('복구검사');
  p.xp=30;restored.queue(p);await restored.flush();
  p.xp=40;stale.queue(p);assert.equal(await stale.flush(),false);assert.equal(conflict,true);assert.equal(stale.blocked,true);
  assert.equal(b.call({action:'load',id:'복구검사'}).progress.xp,30);
});

test('new changes queued during an in-flight save are retained for a second write',async()=>{
  const b=backend();let release;const a=session(b,memory(),{request:request=>request.action==='save'?new Promise(resolve=>{release=()=>resolve(b.call(request));}):Promise.resolve(b.call(request))});
  await a.open('동시변경','register');const p=C.fresh();p.xp=10;a.queue(p);const first=a.flush();
  p.xp=20;a.queue(p);release();await first;assert.equal(a.dirty,true);assert.equal(a.revision,1);
  const second=a.flush();release();await second;assert.equal(a.dirty,false);assert.equal(b.call({action:'load',id:'동시변경'}).progress.xp,20);
});

test('reload after a lost acknowledgement recognizes the committed request and does not save it twice',async()=>{
  const b=backend(),storage=memory();
  const first=session(b,storage,{request:async request=>{const reply=b.call(request);if(request.action==='save')throw Error('NETWORK');return reply;}});
  await first.open('확인응답유실','register');const p=C.fresh();p.xp=10;first.queue(p);await first.flush();
  assert.equal(b.writes.length,1);
  const recovered=session(b,storage),result=await recovered.open('확인응답유실');
  assert.equal(result.progress.xp,10);assert.equal(recovered.dirty,false);await recovered.flush();assert.equal(b.writes.length,1);
});
