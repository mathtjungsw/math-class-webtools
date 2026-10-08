const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function harness(fetch){const context=vm.createContext({fetch,AbortSignal,Error,JSON,Promise,HISTORY_API_URL:'https://example.org/exec'});vm.runInContext(fs.readFileSync(path.join(__dirname,'../math-history/random-location-history/repository.js'),'utf8'),context);return context.HistoryRepositories.create();}
test('공개 화면은 계정 쿠키 없이 공유 시트를 조회하고 text/plain POST로 수집한다',async()=>{
  const requests=[],repo=harness(async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>({ok:true,data:{events:[],storage:'sheets',isOwner:false}})};});
  assert.equal(repo.kind,'sheets');assert.equal((await repo.load()).isOwner,false);
  await repo.research({lat:37.6,lon:32.8},100,()=>{},false);
  assert.equal(requests[0].url,'https://example.org/exec?api=bootstrap');
  for(const r of requests)assert.equal(r.options.credentials,'omit');
  assert.equal(requests[1].options.method,'POST');assert.equal(requests[1].options.headers['Content-Type'],'text/plain;charset=UTF-8');
  assert.deepEqual(JSON.parse(requests[1].options.body),{action:'research',input:{lat:37.6,lon:32.8,radiusKm:100,refresh:false}});
});
test('공유 저장소 오류·비정상 응답은 성공 데이터로 처리하지 않는다',async()=>{
  await assert.rejects(harness(async()=>({ok:true,json:async()=>({ok:false,error:'오늘 수집 한도'})})).load(),/오늘 수집 한도/);
  await assert.rejects(harness(async()=>({ok:true,json:async()=>{throw new Error('HTML');}})).load(),/응답을 읽을 수 없습니다/);
  await assert.rejects(harness(async()=>({ok:false,status:503})).load(),/503/);
});
test('공개 수집 요청은 취소 신호를 실제 요청에 전달한다',async()=>{
  const controller=new AbortController();let signal;
  const repo=harness(async(_,options)=>{signal=options.signal;return {ok:true,json:async()=>({ok:true,data:{}})};});
  await repo.research({lat:37,lon:32},100,()=>{},false,controller.signal);controller.abort();assert.equal(signal.aborted,true);
});
