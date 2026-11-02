/** ID-only game saves. The spreadsheet is never shared with visitors. */
function doGet(e) {
  if(e && e.parameter && e.parameter.action==='health')return json_({ok:true,app:'car-clock-garage',build:BUILD_ID,records:GARAGE_CATALOG.length});
  return HtmlService.createHtmlOutputFromFile('Index').setTitle('부릉부릉 차고 · 아이디로 이어 하기').addMetaTag('viewport','width=device-width, initial-scale=1');
}
function doPost(e) {
  try {
    if(!e || !e.postData || e.postData.contents.length>1000000)throw new Error('BAD_REQUEST');
    return json_(garageRequest(JSON.parse(e.postData.contents)));
  } catch(error){return json_({ok:false,error:publicError_(error.message)});}
}
function json_(body){return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);}
function publicError_(message){return ['BAD_REQUEST','ID_INVALID','ID_EXISTS','ID_NOT_FOUND','INVALID_PROGRESS','CONFLICT','BUSY'].indexOf(message)>=0?message:'SERVER_ERROR';}
function normalizeId_(input){
  if(typeof input!=='string')throw new Error('ID_INVALID');
  var value=input.normalize('NFKC').trim();
  if(!/^[가-힣A-Za-z0-9_-]{2,20}$/.test(value))throw new Error('ID_INVALID');
  return {value:value,key:value.toLowerCase()};
}
function cacheKey_(id){return 'row:'+Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,id,Utilities.Charset.UTF_8).map(function(x){return ('0'+((x+256)%256).toString(16)).slice(-2);}).join('');}
function sheet_(){var sheet=SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('게임기록');if(!sheet)throw new Error('SERVER_ERROR');return sheet;}
function findRow_(sheet,key){
  var cache=CacheService.getScriptCache(),cacheKey=cacheKey_(key),number=Number(cache.get(cacheKey));
  if(Number.isSafeInteger(number)&&number>=2&&String(sheet.getRange(number,1).getValue())===key)return number;
  var count=sheet.getLastRow();if(count<2)return 0;
  var match=sheet.getRange(2,1,count-1,1).createTextFinder(key).matchEntireCell(true).matchCase(true).useRegularExpression(false).findNext();
  if(!match)return 0;
  number=match.getRow();cache.put(cacheKey,String(number),600);return number;
}
function pack_(progress){
  var history=JSON.stringify(progress.history),head={};
  Object.keys(progress).forEach(function(key){if(key!=='history')head[key]=progress[key];});
  var chunks=[];for(var i=0;i<10;i++)chunks.push(history.slice(i*45000,(i+1)*45000));
  if(history.length>450000||JSON.stringify(head).length>45000)throw new Error('INVALID_PROGRESS');
  return [JSON.stringify(head)].concat(chunks);
}
function unpack_(row){
  var progress=JSON.parse(String(row[5]));progress.history=JSON.parse(row.slice(6,16).join('')||'[]');
  return GARAGE_CORE.validate(progress,GARAGE_CATALOG);
}
function reply_(row){return {ok:true,id:String(row[1]),revision:Number(row[2]),updatedAt:String(row[3]),lastRequestId:String(row[4]||''),progress:unpack_(row)};}
function garageRequest(input){
  try {
    if(!input||typeof input!=='object'||Array.isArray(input)||['register','load','save'].indexOf(input.action)<0)throw new Error('BAD_REQUEST');
    var id=normalizeId_(input.id),sheet=sheet_();
    if(input.action==='load'){
      var found=findRow_(sheet,id.key);if(!found)throw new Error('ID_NOT_FOUND');
      return reply_(sheet.getRange(found,1,1,16).getValues()[0]);
    }
    var progress=null;
    if(input.action==='save'){
      if(!Number.isSafeInteger(input.revision)||input.revision<0||typeof input.requestId!=='string'||!/^[a-zA-Z0-9_-]{8,100}$/.test(input.requestId))throw new Error('BAD_REQUEST');
      try{progress=GARAGE_CORE.validate(input.progress,GARAGE_CATALOG);}catch(_){throw new Error('INVALID_PROGRESS');}
    }
    var lock=LockService.getScriptLock();if(!lock.tryLock(10000))throw new Error('BUSY');
    try{
      var rowIndex=findRow_(sheet,id.key),now=new Date().toISOString();
      if(input.action==='register'){
        if(rowIndex)throw new Error('ID_EXISTS');
        var fresh=GARAGE_CORE.fresh(),row=[id.key,id.value,0,now,''].concat(pack_(fresh));
        sheet.appendRow(row);return reply_(row);
      }
      if(!rowIndex)throw new Error('ID_NOT_FOUND');
      var current=sheet.getRange(rowIndex,1,1,16).getValues()[0];
      // Retrying the same request acknowledges its prior write without granting XP twice.
      if(current[4]===input.requestId)return {ok:true,id:String(current[1]),revision:Number(current[2]),requestId:input.requestId,updatedAt:String(current[3])};
      if(Number(current[2])!==input.revision)return {ok:false,error:'CONFLICT',revision:Number(current[2])};
      var packed=pack_(progress),next=current.slice();
      next[2]=Number(current[2])+1;next[3]=now;next[4]=input.requestId;
      packed.forEach(function(value,index){next[index+5]=value;});
      // Write only the changed span of this ID's row, never the whole database.
      var last=4;for(var n=5;n<16;n++)if(String(next[n]||'')!==String(current[n]||''))last=n;
      sheet.getRange(rowIndex,3,1,last-1).setValues([next.slice(2,last+1)]);
      return {ok:true,id:String(current[1]),revision:next[2],requestId:input.requestId,updatedAt:now};
    }finally{lock.releaseLock();}
  }catch(error){return {ok:false,error:publicError_(error.message)};}
}
