(function(root){
  'use strict';
  const copy=value=>JSON.parse(JSON.stringify(value));
  const uid=()=> 'r_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,12);
  const available=()=>!!(root.google&&root.google.script&&root.google.script.run);
  function nativeRequest(body){return new Promise((resolve,reject)=>{
    if(!available())return reject(new Error('UNAVAILABLE'));
    root.google.script.run.withSuccessHandler(resolve).withFailureHandler(()=>reject(new Error('NETWORK'))).garageRequest(body);
  });}
  const messages={ID_INVALID:'아이디는 한글·영문·숫자·밑줄·하이픈으로 2~20글자 입력해 주세요.',ID_EXISTS:'이미 있는 아이디예요. ‘이어서 하기’를 눌러 주세요.',ID_NOT_FOUND:'등록된 아이디를 찾지 못했어요. 철자를 확인하거나 새 아이디를 만들어 주세요.',BUSY:'잠시 저장이 몰렸어요. 조금 뒤 다시 눌러 주세요.',CONFLICT:'다른 곳에서 이 아이디의 기록이 바뀌었어요. 새로고침해 최신 기록을 불러와 주세요.',INVALID_PROGRESS:'기록을 저장하지 못했어요. 현재 기록을 백업하고 다시 접속해 주세요.',NETWORK:'인터넷 연결을 확인해 주세요.',SERVER_ERROR:'기록 서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.'};
  class Session{
    constructor({request=nativeRequest,storage,onStatus=()=>{},onConflict=()=>{},validate=x=>x,schedule=(fn,ms)=>root.setTimeout(fn,ms),cancel=id=>root.clearTimeout(id)}={}){
      Object.assign(this,{request,storage,onStatus,onConflict,validate,schedule,cancel});this.id=null;this.revision=0;this.pending=null;this.inflight=null;this.timer=null;this.running=null;this.blocked=false;this.retryDelay=3000;this.backup=null;this.lastSavedAt=null;
    }
    cache(){if(!this.id||!this.storage)return;try{
      if(this.pending||this.inflight)this.storage.setItem(this.key,JSON.stringify({version:1,revision:this.revision,pending:this.pending,inflight:this.inflight}));
      else this.storage.removeItem(this.key);
    }catch(_){this.onStatus('local-unavailable');}}
    async open(id,action='load'){
      const reply=await this.request({action,id});
      if(!reply||!reply.ok)throw new Error(reply?.error||'SERVER_ERROR');
      let progress=this.validate(reply.progress);
      this.id=reply.id;this.revision=reply.revision;this.key='car-clock-cloud-pending/v1/'+this.id.normalize('NFKC').toLowerCase();this.lastSavedAt=reply.updatedAt;
      let cached=null;try{cached=JSON.parse(this.storage?.getItem(this.key)||'null');}catch(_){}
      if(cached?.version===1&&cached.pending){
        try{
          const pending={id:cached.pending.id,progress:this.validate(cached.pending.progress)};
          const applied=cached.inflight&&reply.lastRequestId===cached.inflight.requestId;
          if(reply.revision===cached.revision||applied){
            if(!(applied&&pending.id===cached.inflight.id)){this.pending=pending;progress=pending.progress;}
          }else this.backup=pending.progress;
        }catch(_){this.backup=cached.pending.progress||null;}
      }
      if(!this.backup){try{const archived=JSON.parse(this.storage?.getItem(this.key+'/conflict-backup')||'null');if(archived)this.backup=this.validate(archived);}catch(_){}}
      this.inflight=null;this.cache();
      if(this.backup){try{this.storage?.setItem(this.key+'/conflict-backup',JSON.stringify(this.backup));}catch(_){}this.onStatus('recovered-cloud');}
      else this.onStatus(this.pending?'pending':'saved');
      if(this.pending)this.plan(50);
      return {id:this.id,progress:copy(progress),revision:this.revision,backup:this.backup};
    }
    queue(progress){
      if(!this.id||this.blocked)return;
      this.pending={id:uid(),progress:copy(progress)};this.cache();this.onStatus('pending');this.plan(1800);
    }
    plan(delay){if(this.timer)this.cancel(this.timer);this.timer=this.schedule(()=>{this.timer=null;this.flush();},delay);}
    async flush(){
      if(this.timer){this.cancel(this.timer);this.timer=null;}
      if(this.blocked||!this.id)return false;
      if(this.running)return this.running;
      if(!this.pending&&!this.inflight)return true;
      this.running=this.send();
      try{return await this.running;}finally{this.running=null;}
    }
    async send(){
      if(!this.inflight)this.inflight={...this.pending,requestId:uid(),revision:this.revision};
      const flight=this.inflight;this.cache();this.onStatus('saving');
      try{
        const reply=await this.request({action:'save',id:this.id,revision:flight.revision,requestId:flight.requestId,progress:flight.progress});
        if(!reply?.ok){
          if(reply?.error==='CONFLICT'){this.blocked=true;this.onStatus('conflict');this.onConflict();return false;}
          throw new Error(reply?.error||'NETWORK');
        }
        if(reply.requestId!==flight.requestId||!Number.isSafeInteger(reply.revision))throw new Error('NETWORK');
        this.revision=reply.revision;this.lastSavedAt=reply.updatedAt;this.retryDelay=3000;
        if(this.pending?.id===flight.id)this.pending=null;
        this.inflight=null;this.cache();this.onStatus(this.pending?'pending':'saved');
        if(this.pending)this.plan(100);
        return !this.pending;
      }catch(error){
        if(error.message==='INVALID_PROGRESS'){this.blocked=true;this.onStatus('invalid');this.onConflict();return false;}
        this.onStatus('offline');this.plan(this.retryDelay);this.retryDelay=Math.min(30000,this.retryDelay*2);return false;
      }
    }
    get dirty(){return !!(this.pending||this.inflight);}
    close(){if(this.timer)this.cancel(this.timer);this.timer=null;this.id=null;}
  }
  const api={Session,available,nativeRequest,messages};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GarageCloud=api;
})(typeof window!=='undefined'?window:globalThis);
