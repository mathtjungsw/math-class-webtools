const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const E=require('../math-history/random-location-history/engine.js');
const C=require('../math-history/random-location-history/collector.js');
const point={lat:37.666667,lon:32.828056};
const example=JSON.parse(fs.readFileSync(path.join(__dirname,'../math-history/random-location-history/data/example.json')));
const event=(overrides={})=>E.validateEvent({id:'test:1',title:'출처 있는 사건',placeName:'유적',lat:0,lon:0,radiusKm:0,startYear:100,endYear:100,status:'candidate',sourceUrl:'https://example.org/source',scope:'site',...overrides});

test('사용자가 수집을 중단하면 외부 요청을 반복하거나 부분 성공으로 저장하지 않는다',async()=>{
  const controller=new AbortController();let calls=0;
  await assert.rejects(C.collect(point,300,async()=>{calls++;controller.abort();throw new Error('cancelled fetch');},()=>{},{signal:controller.signal}),{name:'AbortError'});
  assert.equal(calls,1);
});

test('위도와 경도 입력은 빈 값과 범위 밖을 거절한다',()=>{
  for(const p of [{lat:'',lon:0},{lat:null,lon:0},{lat:91,lon:0},{lat:0,lon:181}])assert.throws(()=>E.coordinate(p));
  assert.deepEqual(E.coordinate({lat:'0',lon:'0'}),{lat:0,lon:0});
});
test('육지 판정은 바다와 폴리곤 안의 물 구멍을 제외한다',()=>{
  const index=E.createLandIndex({polygons:[{bbox:[0,0,10,10],rings:[[[0,0],[10,0],[10,10],[0,10],[0,0]],[[4,4],[6,4],[6,6],[4,6],[4,4]]]}]});
  assert.equal(E.isLand({lat:2,lon:2},index),true);assert.equal(E.isLand({lat:5,lon:5},index),false);assert.equal(E.isLand({lat:-1,lon:5},index),false);
});
test('실제 세계 지도는 작은 섬과 바다 및 날짜변경선 양쪽을 구분한다',()=>{
  const land=JSON.parse(fs.readFileSync(path.join(__dirname,'../math-history/random-location-history/data/land.json'))),index=E.createLandIndex(land);
  for(const p of [{lat:33.36,lon:126.53},point,{lat:-18.14,lon:178.44},{lat:-13.83,lon:-171.77},{lat:37.57,lon:126.98}])assert.equal(E.isLand(p,index),true,JSON.stringify(p));
  for(const p of [{lat:0,lon:0},{lat:0,lon:-150}])assert.equal(E.isLand(p,index),false);
  let count=0;const original=Math.random;let n=1234;const rng=()=>{n=(1664525*n+1013904223)>>>0;return n/2**32;};
  for(let i=0;i<100;i++){const p=E.randomLand(index,rng);assert.equal(E.isLand(p,index),true);count+=p.attempts;}
  assert.ok(count>100);assert.equal(Math.random,original);
});
test('지구 표면 균등 추첨은 위도에 arcsin을 적용한다',()=>{
  const world=E.createLandIndex({polygons:[{bbox:[-180,-90,180,90],rings:[[[-180,-90],[180,-90],[180,90],[-180,90],[-180,-90]]]}]});
  const values=[.75,.5];const p=E.randomLand(world,()=>values.shift());assert.ok(Math.abs(p.lat-30)<1e-10);assert.equal(p.lon,0);
});
test('기원전 1년 다음은 서기 1년이며 화면에 0년을 표시하지 않는다',()=>{
  assert.equal(E.formatYear(0),'기원전 1년');assert.equal(E.formatYear(-1),'기원전 2년');assert.equal(E.formatTime(11,true),'기원전 1년 12월');assert.equal(E.formatTime(12,true),'1년 1월');
});
test('거주 증거는 검토 상태와 적용 위치가 일치할 때 시작점이 된다',()=>{
  const home=event({category:'habitation',startYear:-3000,endYear:-2900,status:'reviewed',radiusKm:1});
  assert.equal(E.startPoint([home],{lat:0,lon:0}).kind,'habitation');
  assert.equal(E.startPoint([{...home,status:'candidate'}],{lat:0,lon:0}).kind,'record');
  assert.equal(E.startPoint([home],{lat:0,lon:1}).kind,'record');
  assert.equal(E.startPoint([],point).year,null);
});
test('도시 설립 자료를 최초 거주 증거로 처리하지 않는다',()=>{
  assert.equal(E.startPoint([event({category:'foundation',status:'reviewed'})],{lat:0,lon:0}).kind,'record');
});
test('현재 활동 자료는 종료 연도의 마지막 달까지 표시한다',()=>{
  const period=event({startYear:100,endYear:110});
  assert.equal(E.activeEvents([period],110*12+11).length,1);assert.equal(E.activeEvents([period],111*12).length,0);
});
test('빠른 시간 진행도 중간 사건의 시작점을 지나치지 않는다',()=>{
  const events=[event({startYear:10,endYear:10}),event({id:'next',startYear:15,endYear:15})];
  assert.equal(E.advance(events,120,.2,12000,false).month,180);
});
test('스킵은 기록 없는 기간만 뛰어넘고 지속된 시대는 유지한다',()=>{
  const events=[event({startYear:10,endYear:20}),event({id:'next',startYear:100,endYear:100})];
  assert.equal(E.advance(events,12*15,1,12,true).skipped,false);
  assert.deepEqual(E.advance(events,12*30,1,12,true),{month:1200,skipped:true});
});
test('8방향은 날짜변경선에서 경도를 정상적으로 비교한다',()=>{
  assert.equal(E.direction({lat:0,lon:179},{lat:0,lon:-179}),'동');assert.ok(E.distance({lat:0,lon:179},{lat:0,lon:-179})<225);
});
test('8방향 비교에 미래 사건을 넣거나 지난 사건을 현재 공동체로 표시하지 않는다',()=>{
  const records=[event({lat:0,lon:1,startYear:10,endYear:10}),event({id:'future',lat:0,lon:1,startYear:50,endYear:50})];
  const east=E.compareDirections(records,{lat:0,lon:0},20*12,300).find(d=>d.direction==='동');
  assert.equal(east.event.id,'test:1');assert.equal(east.active,false);
});
test('저장된 검색은 새 반경 전체가 포함될 때만 재사용한다',()=>{
  const q={id:'q',lat:0,lon:0,radiusKm:300,collectedAt:new Date().toISOString(),status:'ok',version:E.VERSION};
  assert.ok(E.coveringQuery([q],{lat:0,lon:.1},100));assert.equal(E.coveringQuery([q],{lat:0,lon:.1},300),undefined);
  assert.equal(E.coveringQuery([{...q,status:'partial'}],{lat:0,lon:0},100),undefined);
  assert.equal(E.coveringQuery([{...q,collectedAt:'2000-01-01'}],{lat:0,lon:0},100),undefined);
});
test('재수집 시 검토 완료와 제외 상태를 보존하고 중복을 막는다',()=>{
  for(const status of ['reviewed','rejected']){
    const old=event({status});const merged=E.upsert([old],[event({title:'새 자동 자료'})]);assert.equal(merged.length,1);assert.equal(merged[0].status,status);assert.equal(merged[0].title,old.title);
  }
});
test('자료는 출처·좌표·연대 범위가 있어야 저장된다',()=>{
  assert.throws(()=>event({sourceUrl:'javascript:alert(1)'}));assert.throws(()=>event({endYear:50}));assert.throws(()=>event({startYear:''}));assert.throws(()=>event({status:'fake'}));
});
test('근처의 유적 기록은 추첨 지점의 직접 기록으로 표시하지 않는다',()=>{
  const e=event({lat:0,lon:1});assert.match(E.relation(e,{lat:0,lon:0}),/주변/);assert.equal(E.relation(e,{lat:0,lon:1}),'해당 유적 범위');
});
test('지역 범위는 날짜변경선을 넘는 영역도 지원한다',()=>{
  assert.equal(E.containsBounds([170,-10,-170,10],{lat:0,lon:179}),true);assert.equal(E.containsBounds([170,-10,-170,10],{lat:0,lon:0}),false);
});
test('외부 장소의 Wikidata ID만 수집한다',()=>{
  assert.deepEqual(C.entityIds({query:{pages:[{pageprops:{wikibase_item:'Q1'}},{pageprops:{wikibase_item:'not-id'}},{}]}}),['Q1']);
});
test('구조화된 설립 연대는 거주 증거로 승격하지 않는다',()=>{
  const item={entities:{Q123:{labels:{ko:{value:'유적'}},claims:{P625:[{mainsnak:{datavalue:{value:{latitude:0,longitude:0,globe:'http://www.wikidata.org/entity/Q2'}}}}],P571:[{id:'Q123$abc',mainsnak:{datavalue:{value:{time:'-00000003000-00-00T00:00:00Z',precision:9}}}}]}}}};
  const records=C.parseEntities(item,new Date().toISOString());assert.equal(records.length,1);assert.equal(records[0].status,'candidate');assert.equal(records[0].category,'foundation');assert.equal(records[0].startYear,-2999);
});
test('8방향 표본 검색은 극지와 날짜변경선에서도 유효한 좌표를 만든다',()=>{
  const points=C.samplePoints({lat:89,lon:179},1500);assert.equal(points.length,9);points.forEach(E.coordinate);
});
test('예시의 거주 시작은 출처의 기원전 7400년이며 보관 자료와 독립적이다',()=>{
  assert.equal(E.startPoint(example.events,example.point).year,-7399);example.events.forEach(E.validateEvent);assert.ok(example.events.every(e=>e.id.startsWith('example:')));
});
