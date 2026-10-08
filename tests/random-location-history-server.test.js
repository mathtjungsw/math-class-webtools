const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'../math-history/random-location-history');
const E=require(path.join(root,'engine.js'));
function harness(options={}){
  const sheets=new Map(),properties=new Map(),cache=new Map();let active='owner@example.com',effective='owner@example.com',fetchCount=0;
  class Sheet{
    constructor(name,fields){this.name=name;this.rows=[fields];this.maxRows=2;}
    getLastRow(){return this.rows.length;}getMaxRows(){return this.maxRows;}insertRowsAfter(_,n){this.maxRows+=n;}setFrozenRows(){}
    getRange(row,col,height=1,width=1){
      const sheet=this;return {
        getValues(){return Array.from({length:height},(_,r)=>Array.from({length:width},(_,c)=>sheet.rows[row-1+r]?.[col-1+c]??''));},
        setValues(values){if(row+height-1>sheet.maxRows)throw new Error('Row out of bounds');values.forEach((v,r)=>{sheet.rows[row-1+r]||=[];v.forEach((x,c)=>{sheet.rows[row-1+r][col-1+c]=typeof x==='string'&&x.startsWith("'")?x.slice(1):x;});});return this;},
        setValue(value){return this.setValues([[value]]);}
      };
    }
  }
  const db={getId:()=> 'store',getUrl:()=> 'https://docs.google.com/spreadsheets/d/store/edit',getSheetByName:n=>sheets.get(n),insertSheet:n=>{const s=new Sheet(n,[]);s.rows=[];sheets.set(n,s);return s;}};
  sheets.set('역사자료',new Sheet('역사자료',E.EVENT_FIELDS));sheets.set('장소',new Sheet('장소',E.PLACE_FIELDS));sheets.set('수집기록',new Sheet('수집기록',E.QUERY_FIELDS));
  const context=vm.createContext({console,Date,Map,Set,JSON,Math,Number,String,Array,Error,
    SpreadsheetApp:{openById:()=>db,flush(){}},Session:{getActiveUser:()=>({getEmail:()=>active}),getEffectiveUser:()=>({getEmail:()=>effective})},
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>properties.get(k),setProperties:o=>Object.entries(o).forEach(([k,v])=>properties.set(k,v))})},
    CacheService:{getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v),remove:k=>cache.delete(k)})},
    LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
    Utilities:{formatDate:()=>new Date().toISOString().slice(0,10),getUuid:()=>crypto.randomUUID(),sleep(){}},
    HtmlService:{createHtmlOutputFromFile:()=>({getContent:()=>fs.readFileSync(path.join(root,'data/land.json'),'utf8')})},
    ContentService:{MimeType:{JSON:'application/json'},createTextOutput:content=>({content,setMimeType(type){this.type=type;return this;}})},
    UrlFetchApp:{fetch(){fetchCount++;throw new Error('network fixture');}}
  });
  const scripts=options.collectorFirst?['apps-script/Code.gs','collector.js','engine.js']:['engine.js','collector.js','apps-script/Code.gs'];
  scripts.forEach(file=>vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context));
  return {context,sheets,properties,cache,db,api:(a,p)=>JSON.parse(JSON.stringify(context.historyApi(a,p))),owner:email=>{active=email;},fetchCount:()=>fetchCount};
}
const raw=()=>({id:'fixture:a',title:'출처 있는 사건',placeName:'차탈회위크',description:'검증된 입력',lat:37.666667,lon:32.828056,radiusKm:0,startYear:100,endYear:100,precision:'year',category:'event',status:'candidate',sourceTitle:'기관',sourceUrl:'https://example.org/source',scope:'site'});
test('공개 HTTP 조회는 소유자 세션에서도 관리 권한·제외 기록을 노출하지 않는다',()=>{
  const h=harness();h.api('manual',raw());h.api('review',{id:'fixture:a',status:'rejected'});
  const output=h.context.doGet({parameter:{api:'bootstrap'}}),result=JSON.parse(output.content);
  assert.equal(output.type,'application/json');assert.equal(result.ok,true);assert.equal(result.data.isOwner,false);assert.equal(result.data.sheetUrl,'');assert.equal(result.data.events.length,0);
  assert.equal(h.api('bootstrap').data.isOwner,true);assert.equal(h.api('bootstrap').data.events.length,1);
  assert.equal(JSON.parse(h.context.doGet({parameter:{api:'research'}}).content).ok,false);
});
test('공개 HTTP 수집은 자료를 저장·재사용하고 관리 요청을 거부한다',()=>{
  const h=harness();collection(h);const input={lat:37.666667,lon:32.828056,radiusKm:100};
  const send=body=>JSON.parse(h.context.doPost({postData:{contents:JSON.stringify(body)}}).content);
  const first=send({action:'research',input});assert.equal(first.ok,true,first.error);assert.equal(first.data.isOwner,undefined);assert.equal(first.data.events.length,1);
  assert.equal(send({action:'research',input}).data.reused,true);
  for(const action of ['manual','review','export','bootstrap'])assert.equal(send({action,input:raw()}).ok,false);
  assert.equal(JSON.parse(h.context.doPost({postData:{contents:'invalid json'}}).content).ok,false);
  assert.equal(h.context.isOwner_(),true);
});
function collection(h){h.context.fixture=raw();vm.runInContext("collect_=function(){return {events:[fixture],places:[],warnings:[],status:'ok',collectedAt:new Date().toISOString()};}",h.context);}
test('서버 파일 로딩 순서가 바뀌어도 장소의 연대 근거를 읽을 수 있다',()=>{
  const h=harness({collectorFirst:true});
  const data={entities:{Q99:{labels:{ko:{value:'연대가 있는 장소'}},claims:{P625:[{mainsnak:{datavalue:{value:{latitude:37.666667,longitude:32.828056,globe:'http://www.wikidata.org/entity/Q2'}}}}],P571:[{id:'Q99$fixture',mainsnak:{datavalue:{value:{time:'+2000-01-01T00:00:00Z',precision:9}}}}]}}}};
  const records=h.context.HistoryCollector.parseEntities(data,new Date().toISOString());assert.equal(records.length,1);assert.equal(records[0].startYear,2000);
});
test('비로그인 사용자는 관리 기능과 시트 주소에 접근할 수 없다',()=>{
  const h=harness();assert.equal(h.api('bootstrap').data.events.length,0);h.owner('');const data=h.api('bootstrap').data;assert.equal(data.isOwner,false);assert.equal(data.sheetUrl,'');assert.equal(h.api('manual',raw()).ok,false);assert.equal(h.api('review',{id:'fixture:a',status:'reviewed'}).ok,false);assert.equal(h.api('export').ok,false);
});
test('비로그인 사용자는 서버가 수집한 자료를 저장하고 다시 사용할 수 있다',()=>{
  const h=harness();h.owner('');collection(h);const point={lat:37.666667,lon:32.828056,radiusKm:300};
  const first=h.api('research',point);assert.equal(first.ok,true,first.error);assert.equal(first.data.events.length,1);assert.equal(first.data.events[0].status,'candidate');
  const second=h.api('research',{...point,radiusKm:100});assert.equal(second.data.reused,true);
  assert.equal(h.api('manual',{...raw(),status:'reviewed'}).ok,false);assert.equal(h.sheets.get('역사자료').getLastRow(),2);
});
test('공개 조회와 재사용 결과에는 관리자가 제외한 기록을 포함하지 않는다',()=>{
  const h=harness();collection(h);const point={lat:37.666667,lon:32.828056,radiusKm:300};h.api('research',point);h.api('review',{id:'fixture:a',status:'rejected'});h.owner('');
  assert.equal(h.api('bootstrap').data.events.length,0);assert.equal(h.api('research',point).data.events.length,0);assert.equal(h.api('research',{...point,refresh:true}).data.events.length,0);
  h.owner('owner@example.com');assert.equal(h.api('export').data.events[0].status,'rejected');
});
test('육지 검증과 반경 검증에 실패하면 외부 호출과 저장을 하지 않는다',()=>{
  const h=harness();assert.equal(h.api('research',{lat:0,lon:0,radiusKm:100}).ok,false);assert.equal(h.api('research',{lat:37,lon:32,radiusKm:9999}).ok,false);assert.equal(h.fetchCount(),0);assert.equal(h.sheets.get('수집기록').getLastRow(),1);
});
test('실제 서버 저장은 기록·수집 영역을 누적하고 다음 판에서 재사용한다',()=>{
  const h=harness();collection(h);const p={lat:37.666667,lon:32.828056,radiusKm:300};
  const first=h.api('research',p);assert.equal(first.ok,true,first.error);assert.equal(first.data.newEvents,1);assert.equal(first.data.events.length,1);assert.equal(first.data.queries.length,1);
  const second=h.api('research',{...p,lat:p.lat+.01,radiusKm:100});assert.equal(second.ok,true);assert.equal(second.data.reused,true);assert.equal(h.sheets.get('역사자료').getLastRow(),2);
});
test('서버는 재수집해도 검토 완료·제외 상태를 덮어쓰지 않는다',()=>{
  const h=harness();collection(h);const p={lat:37.666667,lon:32.828056,radiusKm:300};h.api('research',p);h.api('review',{id:'fixture:a',status:'rejected'});
  const second=h.api('research',{...p,refresh:true});assert.equal(second.data.events[0].status,'rejected');assert.equal(second.data.events.length,1);
});
test('저장 실패를 성공처럼 반환하지 않고 수집 중 표시를 해제한다',()=>{
  const h=harness();vm.runInContext("collect_=function(){throw new Error('fixture failed');}",h.context);const result=h.api('research',{lat:37.666667,lon:32.828056,radiusKm:100});
  assert.equal(result.ok,false);assert.match(result.error,/fixture failed/);assert.equal(h.cache.size,0);assert.equal(h.sheets.get('역사자료').getLastRow(),1);
});
test('자료 제목과 원문이 스프레드시트 수식으로 실행되지 않는다',()=>{
  const h=harness();const result=h.api('manual',{...raw(),title:'=IMPORTXML("https://invalid.example", "*")'});assert.equal(result.ok,true,result.error);assert.match(result.data.events[0].title,/^=IMPORTXML/);
  const values=h.sheets.get('역사자료').rows[1];assert.ok(values.includes('=IMPORTXML("https://invalid.example", "*")'));
  assert.equal(h.context.writeText_('=X'),"'=X");assert.equal(h.context.writeText_(0),0);assert.equal(h.context.writeText_(-2000),-2000);
});
test('시트의 기존 행 수를 넘으면 행을 늘려 자료를 보존한다',()=>{
  const h=harness();h.api('manual',raw());h.api('manual',{...raw(),id:'fixture:b',title:'두 번째 자료'});assert.equal(h.sheets.get('역사자료').getLastRow(),3);assert.equal(h.sheets.get('역사자료').getMaxRows(),3);assert.equal(h.api('bootstrap').data.events.length,2);
});
test('수집 일일 한도는 새 수집을 제한하지만 저장 자료 읽기는 허용한다',()=>{
  const h=harness();h.properties.set('RESEARCH_DAY',new Date().toISOString().slice(0,10));h.properties.set('RESEARCH_COUNT','60');const result=h.api('research',{lat:37.666667,lon:32.828056,radiusKm:100});assert.equal(result.ok,false);assert.match(result.error,/한도/);assert.equal(h.api('bootstrap').ok,true);
});
test('느린 외부 제공처에서 수집 시간 제한이 지나면 일부 결과로 종료한다',()=>{
  const h=harness();let clock=0;
  class ResearchDate extends Date {static now(){return clock;}}
  h.context.Date=ResearchDate;
  h.context.UrlFetchApp.fetch=()=>{clock+=80000;return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({query:{pages:[{pageid:1,title:'장소',coordinates:[{lat:37.666667,lon:32.828056}],extract:'공개 장소 설명'}]}})};};
  const result=h.context.collect_({lat:37.666667,lon:32.828056},100);
  assert.equal(clock,160000);assert.equal(result.status,'partial');assert.equal(result.places.length,2);assert.match(result.warnings.join(' '),/시간 제한/);
});
