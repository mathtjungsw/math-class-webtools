/** Public play with shared Sheet storage. Research writes only trusted collector
 * output; manual entries, review, and full exports require the owner. */
const HISTORY_CONFIG = { spreadsheetId: '1qCFAFU9D66C5LRc21HqJOzhwRW7yQ5FdMzSclC5uRPA', dailyResearchLimit: 60, queryRadiusLimit: 1500 };
const TABLES = { events: '역사자료', places: '장소', queries: '수집기록' };

let HISTORY_PUBLIC_REQUEST = false;
function publicHistoryApi_(action,input) {
  if(!['bootstrap','research'].includes(action)) return {ok:false,error:'공개 탐험에서 지원하지 않는 요청입니다.'};
  HISTORY_PUBLIC_REQUEST=true;
  try{return historyApi(action,input);}finally{HISTORY_PUBLIC_REQUEST=false;}
}
function jsonResponse_(result){return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);}
function doGet(request) {
  if(request&&request.parameter&&request.parameter.api){
    try{
      const action=request.parameter.api;
      return jsonResponse_(publicHistoryApi_(action,action==='research'?JSON.parse(request.parameter.input||'{}'):{}));
    }catch(error){return jsonResponse_({ok:false,error:String(error.message||error).slice(0,400)});}
  }
  return HtmlService.createTemplateFromFile('Index').evaluate().setTitle('랜덤 위치 역사 탐험').addMetaTag('viewport','width=device-width, initial-scale=1');
}
function doPost(request){
  try{
    const body=JSON.parse(request.postData.contents);
    if(body.action!=='research')return jsonResponse_({ok:false,error:'수집 요청을 확인해 주세요.'});
    return jsonResponse_(publicHistoryApi_('research',body.input));
  }catch(error){return jsonResponse_({ok:false,error:String(error.message||error).slice(0,400)});}
}
function include_(name) { return HtmlService.createHtmlOutputFromFile(name).getContent(); }
function setup() {
  assertOwner_();
  const db = database_();
  ensureSchema_(db);
  console.log('저장 시트: ' + db.getUrl());
  return {url:db.getUrl(),spreadsheetId:db.getId()};
}
function database_() {
  const id = HISTORY_CONFIG.spreadsheetId || PropertiesService.getScriptProperties().getProperty('HISTORY_SPREADSHEET_ID');
  if (!id) throw new Error('저장 시트가 연결되지 않았습니다. 설치 안내의 spreadsheetId를 설정해 주세요.');
  return SpreadsheetApp.openById(id);
}
function ensureSchema_(db) {
  const columns={events:HistoryEngine.EVENT_FIELDS,places:HistoryEngine.PLACE_FIELDS,queries:HistoryEngine.QUERY_FIELDS};
  Object.keys(columns).forEach(key=>{
    let sheet=db.getSheetByName(TABLES[key]);
    if(!sheet) sheet=db.insertSheet(TABLES[key]);
    const headers=columns[key];
    if(!sheet.getLastRow()) {
      sheet.getRange(1,1,1,headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    } else {
      const existing=sheet.getRange(1,1,1,headers.length).getValues()[0];
      if(JSON.stringify(existing)!==JSON.stringify(headers)) throw new Error(TABLES[key]+'의 열 제목이 바뀌었습니다. 설치 안내의 구조와 대조해 주세요.');
    }
  });
}
function historyApi(action, input) {
  try {
    if(action==='bootstrap') return {ok:true,data:bootstrap_()};
    if(action==='research') return {ok:true,data:research_(input||{})};
    if(action==='review') return {ok:true,data:review_(input||{})};
    if(action==='manual') return {ok:true,data:manual_(input||{})};
    if(action==='export') {assertOwner_();return {ok:true,data:readData_()};}
    throw new Error('알 수 없는 요청입니다.');
  } catch(error) { return {ok:false,error:String(error.message || error).slice(0,400)}; }
}
function isOwner_() {
  if(HISTORY_PUBLIC_REQUEST)return false;
  const active=Session.getActiveUser().getEmail(),effective=Session.getEffectiveUser().getEmail();
  return Boolean(active&&effective&&active===effective);
}
function assertOwner_(){if(!isOwner_()) throw new Error('이 기능은 저장 시트 소유자 계정으로 실행해 주세요.');}
function fields_(key){return key==='events'?HistoryEngine.EVENT_FIELDS:key==='places'?HistoryEngine.PLACE_FIELDS:HistoryEngine.QUERY_FIELDS;}
function readTable_(db,key){
  const sheet=db.getSheetByName(TABLES[key]),fields=fields_(key),rows=sheet.getLastRow()-1;
  if(rows<=0)return [];
  return sheet.getRange(2,1,rows,fields.length).getValues().map(values=>{
    const r={};fields.forEach((field,i)=>{r[field]=values[i] instanceof Date?values[i].toISOString():values[i];});return r;
  }).filter(r=>r.id);
}
function readData_(){const db=database_();ensureSchema_(db);return {version:HistoryEngine.VERSION,events:readTable_(db,'events'),places:readTable_(db,'places'),queries:readTable_(db,'queries')};}
function playerData_(data){return isOwner_()?data:{...data,events:data.events.filter(e=>e.status!=='rejected')};}
function bootstrap_(){
  const data=playerData_(readData_());
  return {...data,isOwner:isOwner_(),storage:'sheets',sheetUrl:isOwner_()?database_().getUrl():'',limits:{dailyResearch:HISTORY_CONFIG.dailyResearchLimit}};
}
function writeText_(value){
  // Stop source titles/extracts from becoming executable spreadsheet formulas.
  if(typeof value==='string'&&/^[=+\-@]/.test(value)) return "'"+value;
  return value===undefined||value===null?'':value;
}
function mergeTable_(db,key,incoming){
  if(!incoming.length)return 0;
  const fields=fields_(key),sheet=db.getSheetByName(TABLES[key]);
  const existing=readTable_(db,key), map=new Map(existing.map((r,i)=>[r.id,{r,row:i+2}]));
  const additions=[],incomingIds=new Set();let changed=0;
  for(const raw of incoming){
    const r=key==='events'?HistoryEngine.validateEvent(raw):raw;
    if(incomingIds.has(r.id))continue;incomingIds.add(r.id);
    const found=map.get(r.id);
    if(found&&key==='events'&&['reviewed','rejected'].includes(found.r.status))continue;
    const row=fields.map(f=>writeText_(r[f]));
    if(found){sheet.getRange(found.row,1,1,fields.length).setValues([row]);}
    else{additions.push(row);map.set(r.id,{r,row:sheet.getLastRow()+additions.length});}
    changed++;
  }
  if(additions.length){
    const required=sheet.getLastRow()+additions.length;
    if(required>sheet.getMaxRows())sheet.insertRowsAfter(sheet.getMaxRows(),required-sheet.getMaxRows());
    sheet.getRange(sheet.getLastRow()+1,1,additions.length,fields.length).setValues(additions);
  }
  return changed;
}
function fetchJson_(url){
  // URLs are constructed only by the trusted collector, never taken from input.
  const response=UrlFetchApp.fetch(url,{muteHttpExceptions:true,headers:{'User-Agent':'LocationHistoryClassroom/1.0 (educational history explorer)','Accept':'application/json'}});
  if(response.getResponseCode()!==200)throw new Error('외부 자료 제공처 응답 '+response.getResponseCode());
  return JSON.parse(response.getContentText());
}
function collect_(p,radius){
  const now=new Date().toISOString(),deadline=Date.now()+180000,events=[],places=[],warnings=[],ids=new Set();
  const searches=[{language:'ko',point:p},...HistoryCollector.samplePoints(p,radius).map(point=>({language:'en',point}))];
  const requests=searches.map(s=>({url:HistoryCollector.wikiUrl(s.language,HistoryCollector.wikiParameters(s.point,8)),muteHttpExceptions:true,headers:{'User-Agent':'LocationHistoryClassroom/1.0'}}));
  for(let i=0;i<requests.length;i++){
    if(Date.now()>deadline-30000){warnings.push('검색 시간 제한에 도달했습니다. 찾은 자료부터 저장합니다.');break;}
    const request=requests[i];
    try{const response=UrlFetchApp.fetch(request.url,request);if(response.getResponseCode()!==200)throw new Error('HTTP '+response.getResponseCode());const data=JSON.parse(response.getContentText());if(data.error)throw new Error(data.error.info);places.push(...HistoryCollector.wikiPlaces(data,searches[i].language,now));HistoryCollector.entityIds(data).forEach(id=>ids.add(id));}
    catch(e){warnings.push('장소 설명 검색 실패: '+e.message);}
    Utilities.sleep(1100);
  }
  const list=Array.from(ids);
  for(let i=0;i<list.length;i+=40){
    if(Date.now()>deadline-30000){warnings.push('연대 확인을 일부 완료했습니다. 자료 보완으로 이어서 검색할 수 있습니다.');break;}
    const batch=list.slice(i,i+40);
    try{const data=fetchJson_(HistoryCollector.entityUrl(batch));if(data.error)throw new Error(data.error.info);events.push(...HistoryCollector.parseEntities(data,now));}
    catch(e){for(const id of batch){
      if(Date.now()>deadline-30000){warnings.push('연대 확인을 일부 완료했습니다. 자료 보완으로 이어서 검색할 수 있습니다.');break;}
      try{events.push(...HistoryCollector.parseEntities(fetchJson_('https://www.wikidata.org/wiki/Special:EntityData/'+id+'.json'),now));}
      catch(error){warnings.push('장소 연대 검색 실패: '+id+' · '+error.message);}
      Utilities.sleep(1100);
    }}
  }
  return {events:HistoryEngine.upsert([],events).filter(e=>HistoryEngine.distance(p,e)<=radius),places:HistoryEngine.upsert([],places),warnings,status:warnings.length?'partial':'ok',collectedAt:now};
}
function reserveResearch_(p,radius){
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    const props=PropertiesService.getScriptProperties(),date=Utilities.formatDate(new Date(),'Asia/Seoul','yyyy-MM-dd');
    const count=Number(props.getProperty('RESEARCH_DAY')===date?props.getProperty('RESEARCH_COUNT'):0);
    if(count>=HISTORY_CONFIG.dailyResearchLimit)throw new Error('오늘 새 자료 수집 한도에 도달했습니다. 저장된 자료로 계속 탐험할 수 있습니다.');
    const key='research:'+p.lat.toFixed(2)+':'+p.lon.toFixed(2)+':'+radius,cache=CacheService.getScriptCache();
    if(cache.get(key))throw new Error('이 지역의 자료를 이미 수집하고 있습니다. 잠시 후 다시 확인해 주세요.');
    cache.put(key,'busy',240);
    props.setProperties({RESEARCH_DAY:date,RESEARCH_COUNT:String(count+1)});
    return key;
  }finally{lock.releaseLock();}
}
function research_(input){
  // Anonymous players may collect public historical sources. They cannot
  // submit records, review states, arbitrary URLs, or spreadsheet identifiers.
  const p=HistoryEngine.coordinate(input),radius=Number(input.radiusKm);
  if(!Number.isFinite(radius)||radius<10||radius>HISTORY_CONFIG.queryRadiusLimit)throw new Error('검색 반경은 10~1500 km 사이여야 합니다.');
  if(!HistoryEngine.isLand(p,landIndex_()))throw new Error('이 좌표는 현재 육지 지도에 포함되지 않습니다.');
  const before=readData_(),cached=HistoryEngine.coveringQuery(before.queries,p,radius);
  if(cached&&!input.refresh)return {...playerData_(before),reused:true,newEvents:0,warnings:[]};
  const key=reserveResearch_(p,radius);
  try{
    const collected=collect_(p,radius);
    if(!collected.events.length&&!collected.places.length&&collected.status==='partial')throw new Error(collected.warnings.join(' / '));
    const lock=LockService.getScriptLock();lock.waitLock(15000);
    let newEvents;
    try{
      const db=database_();ensureSchema_(db);
      const current=readTable_(db,'events'),ids=new Set(current.map(e=>e.id));
      newEvents=collected.events.filter(e=>!ids.has(e.id)).length;
      mergeTable_(db,'events',collected.events);mergeTable_(db,'places',collected.places);
      mergeTable_(db,'queries',[{id:'query:'+p.lat.toFixed(5)+':'+p.lon.toFixed(5)+':'+radius,lat:p.lat,lon:p.lon,radiusKm:radius,collectedAt:collected.collectedAt,status:collected.status,placeCount:collected.places.length,eventCount:collected.events.length,version:HistoryEngine.VERSION}]);
      SpreadsheetApp.flush();
    }finally{lock.releaseLock();}
    return {...playerData_(readData_()),reused:false,newEvents,warnings:collected.warnings};
  }finally{CacheService.getScriptCache().remove(key);}
}
let HISTORY_LAND_INDEX;
function landIndex_(){if(!HISTORY_LAND_INDEX)HISTORY_LAND_INDEX=HistoryEngine.createLandIndex(JSON.parse(include_('Land')));return HISTORY_LAND_INDEX;}
function review_(input){
  assertOwner_();if(!['reviewed','rejected','candidate'].includes(input.status))throw new Error('검토 상태를 확인해 주세요.');
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    const db=database_(),records=readTable_(db,'events'),index=records.findIndex(e=>e.id===input.id);
    if(index<0)throw new Error('자료를 찾을 수 없습니다.');
    db.getSheetByName(TABLES.events).getRange(index+2,HistoryEngine.EVENT_FIELDS.indexOf('status')+1).setValue(input.status);
    SpreadsheetApp.flush();return readData_();
  }finally{lock.releaseLock();}
}
function manual_(input){
  assertOwner_();const e=HistoryEngine.validateEvent({...input,id:input.id||'manual:'+Utilities.getUuid(),status:'reviewed',collectedAt:new Date().toISOString(),sourceType:'manual'});
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    const db=database_();if(readTable_(db,'events').some(r=>r.id===e.id))throw new Error('같은 ID의 자료가 있습니다. 새 자료로 저장해 주세요.');
    mergeTable_(db,'events',[e]);SpreadsheetApp.flush();return readData_();
  }finally{lock.releaseLock();}
}
