(function(root) {
  'use strict';
  const E=root.HistoryEngine,C=root.HistoryCollector;
  function rpc(action,input){return new Promise((resolve,reject)=>{google.script.run.withSuccessHandler(r=>r.ok?resolve(r.data):reject(new Error(r.error))).withFailureHandler(e=>reject(new Error(e.message||'서버에 연결하지 못했습니다.'))).historyApi(action,input||{});});}
  class SheetsRepository {
    constructor(){this.kind='sheets';}
    load(){return rpc('bootstrap');}
    research(p,radius,progress,refresh){progress('Google Sheets에서 기존 자료를 확인하고 새 자료를 수집하는 중');return rpc('research',{...p,radiusKm:radius,refresh:Boolean(refresh)});}
    review(id,status){return rpc('review',{id,status});}
    manual(event){return rpc('manual',event);}
    export(){return rpc('export');}
  }
  // Requests omit Google account cookies so public play does not depend on
  // which account a mobile browser has selected for script.google.com.
  class PublicSheetsRepository {
    constructor(url){this.kind='sheets';this.url=url;}
    async request(action,input,signal){
      const research=action==='research';
      const timeout=AbortSignal.timeout(research?240000:30000);
      let response;
      try{
        response=await fetch(this.url+(research?'':'?api=bootstrap'),{
          method:research?'POST':'GET',credentials:'omit',redirect:'follow',
          signal:signal?AbortSignal.any([signal,timeout]):timeout,
          ...(research?{headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({action,input})}:{})
        });
      }catch(error){
        if(signal?.aborted)throw error;
        throw new Error('공유 저장소에 연결하지 못했습니다. 잠시 후 새로고침해 주세요.');
      }
      if(!response.ok)throw new Error('공유 저장소 응답 '+response.status);
      let result;
      try{result=await response.json();}catch(_){throw new Error('공유 저장소 응답을 읽을 수 없습니다. 잠시 후 다시 시도해 주세요.');}
      if(!result.ok)throw new Error(result.error||'자료 요청을 처리하지 못했습니다.');
      return result.data;
    }
    load(){return this.request('bootstrap');}
    research(p,radius,progress,refresh,signal){progress('공유 저장소에서 기존 자료를 확인하고 새 자료를 수집하는 중');return this.request('research',{...p,radiusKm:radius,refresh:Boolean(refresh)},signal);}
  }
  class BrowserRepository {
    constructor(){this.kind='browser';this.db=null;}
    async open(){
      if(this.db)return this.db;
      this.db=await new Promise((resolve,reject)=>{
        const request=indexedDB.open('random-location-history-v1',1);
        request.onupgradeneeded=()=>{['events','places','queries'].forEach(k=>request.result.createObjectStore(k,{keyPath:'id'}));};
        request.onsuccess=()=>resolve(request.result);
        request.onerror=()=>reject(new Error('브라우저 저장소를 열 수 없습니다. 저장이 허용된 브라우저에서 다시 열어 주세요.'));
      });return this.db;
    }
    async load(){
      const db=await this.open(),tx=db.transaction(['events','places','queries'],'readonly');
      const reads=['events','places','queries'].map(k=>new Promise((resolve,reject)=>{const r=tx.objectStore(k).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);}));
      const [events,places,queries]=await Promise.all(reads);return {version:E.VERSION,events,places,queries,isOwner:true,storage:'browser',sheetUrl:''};
    }
    async write(data){
      const db=await this.open();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(['events','places','queries'],'readwrite');
        ['events','places','queries'].forEach(k=>{for(const r of data[k]||[])tx.objectStore(k).put(r);});
        tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(new Error('자료를 저장하지 못했습니다. 저장 공간을 확인해 주세요.'));
      });return this.load();
    }
    async research(p,radius,progress,refresh,signal){
      const before=await this.load(),cached=E.coveringQuery(before.queries,p,radius);
      if(cached&&!refresh)return {...before,reused:true,newEvents:0,warnings:[]};
      const result=await C.collect(p,radius,async(url,options)=>{
        const response=await fetch(url,{...options,signal:signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)});
        if(!response.ok)throw new Error('외부 제공처 응답 '+response.status);
        return response.json();
      },progress,{signal});
      if(!result.events.length&&!result.places.length&&result.status==='partial')throw new Error(result.warnings.join(' / '));
      const incoming=E.upsert(before.events,result.events),ids=new Set(before.events.map(e=>e.id));
      const query={id:'query:'+p.lat.toFixed(5)+':'+p.lon.toFixed(5)+':'+radius,...p,radiusKm:radius,collectedAt:result.collectedAt,status:result.status,placeCount:result.places.length,eventCount:result.events.length,version:E.VERSION};
      const saved=await this.write({events:incoming,places:result.places,queries:[query]});
      return {...saved,reused:false,newEvents:result.events.filter(e=>!ids.has(e.id)).length,warnings:result.warnings};
    }
    async review(id,status){const data=await this.load(),event=data.events.find(e=>e.id===id);if(!event)throw new Error('자료를 찾을 수 없습니다.');return this.write({events:[{...event,status}]});}
    async manual(raw){return this.write({events:[E.validateEvent({...raw,id:'manual:'+crypto.randomUUID(),status:'reviewed',collectedAt:new Date().toISOString(),sourceType:'manual'})]});}
    export(){return this.load();}
  }
  root.HistoryRepositories={SheetsRepository,PublicSheetsRepository,BrowserRepository,create:()=>root.google?.script?.run?new SheetsRepository():root.HISTORY_API_URL?new PublicSheetsRepository(root.HISTORY_API_URL):new BrowserRepository()};
})(typeof globalThis!=='undefined'?globalThis:this);
