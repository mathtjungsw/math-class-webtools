(function(root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.HistoryCollector = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(root) {
  'use strict';
  // Apps Script does not guarantee dependency order across .gs files.
  // Resolve the engine when a collector method runs, after globals are loaded.
  function engine(){const value=root.HistoryEngine||(typeof require==='function'?require('./engine.js'):null);if(!value)throw new Error('연대 계산 모듈을 불러오지 못했습니다.');return value;}
  function sparql(p, radius) {
    const E=engine();
    E.coordinate(p);
    radius = Math.min(1500, Math.max(10, Number(radius) || 300));
    return `SELECT DISTINCT ?item ?itemLabel ?itemDescription ?location ?property ?statement ?date ?precision ?end WHERE {
      SERVICE wikibase:around { ?item wdt:P625 ?location. bd:serviceParam wikibase:center "Point(${p.lon} ${p.lat})"^^geo:wktLiteral; wikibase:radius "${radius}"; wikibase:distance ?distance. }
      { ?item p:P585 ?statement. ?statement psv:P585 ?v. BIND("P585" AS ?property) }
      UNION { ?item p:P580 ?statement. ?statement psv:P580 ?v. BIND("P580" AS ?property) OPTIONAL { ?item wdt:P582 ?end. } }
      UNION { ?item p:P571 ?statement. ?statement psv:P571 ?v. BIND("P571" AS ?property) }
      ?v wikibase:timeValue ?date; wikibase:timePrecision ?precision.
      FILTER(?date <= NOW() && ?precision >= 6)
      FILTER NOT EXISTS { ?item wdt:P31 wd:Q5. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "ko,en". }
    } ORDER BY ?distance LIMIT 100`;
  }
  function parseBindings(data, now) {
    const E=engine();
    const labels = {P585:'기록된 사건 시점',P580:'활동·기간 시작',P571:'설립·형성 기록'};
    const out = [], seen = new Set();
    for (const b of data.results?.bindings || []) {
      const value = k => b[k]?.value || '';
      const id = value('item').split('/').pop(), property = value('property');
      const point = /^Point\(([-\d.]+) ([-\d.]+)\)$/.exec(value('location'));
      const dates = E.parseWikidataTime({time:value('date'),precision:Number(value('precision'))},'rdf');
      if (!/^Q\d+$/.test(id) || !point || !dates || !labels[property]) continue;
      if (value('end') && property === 'P580') {
        const end = E.parseWikidataTime({time:value('end'),precision:9},'rdf');
        if (end && end.endYear >= dates.startYear) dates.endYear = end.endYear;
      }
      const statement = value('statement').split('/').pop() || id + '-' + property + '-' + dates.startYear;
      const key = 'wd:' + statement;
      if (seen.has(key)) continue;
      seen.add(key);
      const title = value('itemLabel') || id;
      const description = value('itemDescription');
      out.push(E.validateEvent({id:key,placeId:id,placeName:title,title:title + ' · ' + labels[property],description:(description ? description + '. ' : '') + 'Wikidata의 ' + labels[property] + ' 연대입니다. 설립·형성 연대는 최초 거주 연대와 다를 수 있습니다.',lat:Number(point[2]),lon:Number(point[1]),radiusKm:0,...dates,category:property === 'P571' ? 'foundation' : property === 'P580' ? 'period' : 'event',status:'candidate',sourceTitle:'Wikidata ' + id,sourceUrl:'https://www.wikidata.org/wiki/' + id,sourceQuote:value('date') + ' (' + property + '; precision ' + value('precision') + ')',collectedAt:now,sourceType:'wikidata',sourceId:statement,scope:'site'}));
    }
    return out;
  }
  function wikiUrl(language, parameters) {
    if (!['ko','en'].includes(language)) throw new Error('지원하지 않는 언어입니다.');
    return 'https://' + language + '.wikipedia.org/w/api.php?' + Object.entries({format:'json',formatversion:2,...parameters}).map(([k,v]) => encodeURIComponent(k)+'='+encodeURIComponent(v)).join('&');
  }
  function wikiPlaces(data, language, now) {
    return (data.query?.pages || []).filter(p => p.coordinates?.length).map(p => ({id:'wiki:'+language+':'+p.pageid,name:p.title,lat:p.coordinates[0].lat,lon:p.coordinates[0].lon,description:(p.extract || '').slice(0,1400),sourceUrl:p.fullurl || 'https://'+language+'.wikipedia.org/wiki/'+encodeURIComponent(p.title.replace(/ /g,'_')),collectedAt:now,sourceType:'wikipedia-'+language}));
  }
  function samplePoints(p,radius){
    // An explicitly sampled search, not a claim of full historical coverage.
    const result=[p],angle=Math.min(1000,radius*.65)/6371.0088;
    const lat=p.lat*Math.PI/180,lon=p.lon*Math.PI/180;
    for(let i=0;i<8;i++){
      const b=i*Math.PI/4,y=Math.asin(Math.sin(lat)*Math.cos(angle)+Math.cos(lat)*Math.sin(angle)*Math.cos(b));
      const x=lon+Math.atan2(Math.sin(b)*Math.sin(angle)*Math.cos(lat),Math.cos(angle)-Math.sin(lat)*Math.sin(y));
      result.push({lat:y*180/Math.PI,lon:((x*180/Math.PI+540)%360)-180});
    }
    return result;
  }
  function wikiParameters(p,limit){return {action:'query',generator:'geosearch',ggscoord:p.lat+'|'+p.lon,ggsradius:10000,ggslimit:limit||8,ggsnamespace:0,prop:'coordinates|extracts|info|pageprops',exintro:1,explaintext:1,exchars:1200,inprop:'url'};}
  function entityIds(data){return (data.query?.pages||[]).map(p=>p.pageprops?.wikibase_item).filter(id=>/^Q\d+$/.test(id));}
  function entityUrl(ids){return 'https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=labels%7Cdescriptions%7Cclaims&languages=ko%7Cen&origin=*&ids='+encodeURIComponent(ids.join('|'));}
  function parseEntities(data,now){
    const E=engine();
    const out=[];
    const properties={P585:['기록된 사건 시점','event'],P580:['활동·기간 시작','period'],P571:['설립·형성 기록','foundation']};
    for(const [id,item] of Object.entries(data.entities||{})){
      const claims=item.claims||{},coord=claims.P625?.find(s=>s.rank!=='deprecated'&&s.mainsnak?.datavalue)?.mainsnak.datavalue.value;
      if(!coord||coord.globe&&coord.globe!=='http://www.wikidata.org/entity/Q2')continue;
      const title=item.labels?.ko?.value||item.labels?.en?.value||id;
      const description=item.descriptions?.ko?.value||item.descriptions?.en?.value||'';
      for(const [property,[label,category]] of Object.entries(properties))for(const statement of claims[property]||[]){
        if(statement.rank==='deprecated')continue;
        const raw=statement.mainsnak?.datavalue?.value,dates=E.parseWikidataTime(raw);if(!dates||dates.startYear>new Date().getUTCFullYear())continue;
        if(property==='P580'){
          const end=statement.qualifiers?.P582?.find(s=>s.datavalue)?.datavalue?.value||claims.P582?.find(s=>s.rank!=='deprecated'&&s.mainsnak?.datavalue)?.mainsnak.datavalue.value;
          const parsed=E.parseWikidataTime(end);if(parsed&&parsed.endYear>=dates.startYear)dates.endYear=parsed.endYear;
        }
        out.push(E.validateEvent({id:'wd:'+statement.id.replace('$','-'),placeId:id,placeName:title,title:title+' · '+label,description:(description?description+'. ':'')+'공개 구조화 자료에 등재된 '+label+'입니다. 이 기록은 해당 장소의 자료이며 최초 거주 연대를 뜻하지 않습니다.',lat:coord.latitude,lon:coord.longitude,radiusKm:0,...dates,category,status:'candidate',sourceTitle:'Wikidata '+id,sourceUrl:'https://www.wikidata.org/wiki/'+id,sourceQuote:raw.time+' ('+property+'; precision '+raw.precision+')',collectedAt:now,sourceType:'wikidata',sourceId:statement.id,scope:'site'}));
      }
    }
    return out;
  }
  async function collect(p, radius, fetchJson, progress, options) {
    const E=engine();
    E.coordinate(p);
    const checkAbort = () => {if(options?.signal?.aborted)throw new DOMException('자료 수집을 중단했습니다.','AbortError');};
    checkAbort();
    const now = new Date().toISOString(), deadline = Date.now() + 90000, events = [], places = [], warnings = [], ids=new Set();
    progress = progress || function() {};
    progress('가까운 장소의 설명과 출처를 찾는 중');
    // Wikipedia geosearch is limited to 10 km; this is explicitly separate
    // from the larger event search radius.
    const samples=samplePoints(p,radius);
    const searches=[{language:'ko',point:p},...samples.map(point=>({language:'en',point}))];
    const results=[];
    for(const [searchIndex,{language,point}] of searches.entries()){
      checkAbort();
      progress(`주변 장소 검색 ${searchIndex+1}/${searches.length} · 연대 근거를 찾고 있습니다`);
      if(Date.now()>deadline-15000){warnings.push('검색 시간 제한에 도달했습니다. 찾은 자료부터 저장합니다.');break;}
      try {
        const data=await fetchJson(wikiUrl(language,{...wikiParameters(point,8),origin:'*'}));
        if(data.error)throw new Error(data.error.info);
        results.push({language,data});
      } catch(e) { checkAbort();warnings.push(language + ' 장소 검색 실패: ' + e.message); }
      await new Promise(resolve=>setTimeout(resolve,1100));
    }
    for(const r of results.filter(Boolean)){places.push(...wikiPlaces(r.data,r.language,now));entityIds(r.data).forEach(id=>ids.add(id));}
    progress('장소의 연대 근거를 확인하는 중');
    const list=Array.from(ids);
    for(let i=0;i<list.length;i+=40){
      checkAbort();progress(`장소 ${list.length}곳의 연대 근거를 확인하는 중`);
      if(Date.now()>deadline-15000){warnings.push('연대 확인을 일부 완료했습니다. 자료 보완으로 이어서 검색할 수 있습니다.');break;}
      const batch=list.slice(i,i+40);
      try{const data=await fetchJson(entityUrl(batch));if(data.error)throw new Error(data.error.info);events.push(...parseEntities(data,now));}
      catch(e){
        checkAbort();
        for(const id of batch){
          checkAbort();progress(`장소의 연대 확인 ${list.indexOf(id)+1}/${list.length}`);
          if(Date.now()>deadline-15000){warnings.push('연대 확인을 일부 완료했습니다. 자료 보완으로 이어서 검색할 수 있습니다.');break;}
          try{events.push(...parseEntities(await fetchJson('https://www.wikidata.org/wiki/Special:EntityData/'+id+'.json'),now));}
          catch(error){checkAbort();warnings.push('장소 연대 검색 실패: '+id+' · '+error.message);}
          await new Promise(resolve=>setTimeout(resolve,1100));
        }
      }
    }
    checkAbort();
    return {events:E.upsert([],events).filter(e=>E.distance(p,e)<=radius),places:E.upsert([],places),warnings,status:warnings.length?'partial':'ok',collectedAt:now};
  }
  return { sparql, parseBindings, wikiUrl, wikiPlaces, samplePoints, wikiParameters, entityIds, entityUrl, parseEntities, collect };
});
