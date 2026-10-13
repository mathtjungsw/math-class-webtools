import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=path.dirname(fileURLToPath(import.meta.url));
const read=f=>JSON.parse(fs.readFileSync(path.resolve(root,f),'utf8'));
const data=read('location.json'),draw=read('draw.json'),archive=read(draw.archiveFile);
const engine=createRequire(import.meta.url)('../../engine.js');
const errors=[];const ok=(v,s)=>{if(!v)errors.push(s);};
const sourceIds=new Set(data.sources.map(s=>s.id)),placeIds=new Set(data.places.map(p=>p.id)),recordIds=new Set(data.records.map(r=>r.id));
ok(sourceIds.size===data.sources.length,'duplicate source id');ok(placeIds.size===data.places.length,'duplicate place id');ok(recordIds.size===data.records.length,'duplicate record id');
ok(draw.latitude===archive.latitude&&draw.longitude===archive.longitude,'draw was moved');
ok(data.representativePoint.latitude===draw.latitude&&data.representativePoint.longitude===draw.longitude,'representative point moved');
ok(draw.attempts===draw.candidates.length&&draw.candidates.at(-1).land&&!draw.candidates.slice(0,-1).some(c=>c.land),'not first accepted land');
const land=read('../../data/land.json');ok(engine.isLand({lat:draw.latitude,lon:draw.longitude},engine.createLandIndex(land)),'not land');
ok(data.timelinePolicy.lastPlayableYear===1950,'wrong end year');ok(data.timelinePolicy.firstHabitationYear===null,'unsupported habitation year');
for(const s of data.sources){ok(/^https:\/\//.test(s.url),s.id+' missing URL');ok(s.access&&s.checkedSections.length,s.id+' missing access scope');}
for(const p of data.places){for(const s of p.sourceIds)ok(sourceIds.has(s),p.id+' missing source');if(p.coordinate){const a={lat:p.coordinate.latitude,lon:p.coordinate.longitude},b={lat:draw.latitude,lon:draw.longitude};ok(Math.abs(engine.distance(a,b)-p.distanceFromDrawKm)<0.011,p.id+' distance incorrect');}}
for(const r of data.records){ok(placeIds.has(r.placeId),r.id+' bad place');ok(r.evidence.length>0,r.id+' missing evidence');for(const e of r.evidence)ok(sourceIds.has(e.sourceId)&&e.locator,r.id+' bad evidence');ok(r.limits.length>0&&r.scope&&r.narrative,r.id+' missing qualification');if(r.date){const d=r.date;ok(Number.isInteger(d.startYear)&&Number.isInteger(d.endYear)&&d.startYear!==0&&d.endYear!==0,r.id+' invalid years');ok(d.startYear<=d.endYear&&d.endYear<=1950,r.id+' date out of bounds');ok(d.label&&d.displayAnchorYear===d.startYear,r.id+' missing date display');if(!['year','day','document_date'].includes(d.kind))ok(d.anchorIsExactEventDate===false,r.id+' falsely exact range');}}
ok(data.records.some(r=>r.id===data.timelinePolicy.recommendedStart.recordId),'start missing');
ok(data.integrationStatus==='prepared_for_static_game'&&data.researchReadiness.gameReady,'incorrect game source status');
const readings=read('readings.json'),assigned=[];
ok(readings.completion==='three_levels_complete'&&readings.chapters.length===5,'incomplete chapters');
for(const c of readings.chapters){
 ok(c.recordIds.includes(c.anchorRecordId),c.id+' missing anchor');
 assigned.push(...c.recordIds);
 for(const id of c.recordIds)ok(data.records.find(r=>r.id===id)?.date,c.id+' invalid dated record');
 for(const id of c.contextRecordIds)ok(data.records.some(r=>r.id===id&&!r.date),c.id+' invalid context');
 const lengths=[];
 for(const level of ['basic','detail','deep']){
  ok(c[level]?.length>0,c.id+' missing '+level);
  lengths.push(c[level].flatMap(s=>s.paragraphs).join('').length);
  for(const s of c[level])ok(s.paragraphs.length&&s.sourceIds.length&&s.sourceIds.every(id=>sourceIds.has(id)),c.id+' bad section');
 }
 ok(lengths[0]<lengths[1]&&lengths[1]<lengths[2]&&lengths[2]>=5*readings.readingRateCharactersPerMinute,c.id+' reading lengths');
}
ok(new Set(assigned).size===assigned.length&&assigned.length===data.records.filter(r=>r.date).length,'dated chapter coverage');
const report={checkedAt:new Date().toISOString(),passed:errors.length===0,errors,counts:{sources:data.sources.length,places:data.places.length,datedRecords:data.records.filter(r=>r.date).length,undatedContexts:data.records.filter(r=>!r.date).length},checks:['원 추첨 좌표 유지','첫 육지 수락 및 육지 재검사','출처·장소·기록 식별자와 참조','연대 상한 1950·0년 제외','불확실한 연대의 배치용 표시','거리 계산','조사와 게임 통합 상태 구분'],limitations:['출처 원문과의 역사적 진위는 자동 검사하지 않음','원본 해안선 판정은 조사 시 별도로 수행','출처 링크의 지속 가용성은 검사하지 않음']};
fs.writeFileSync(path.join(root,'validation.json.pending'),JSON.stringify(report,null,2)+'\n');fs.renameSync(path.join(root,'validation.json.pending'),path.join(root,'validation.json'));console.log(JSON.stringify(report,null,2));if(errors.length)process.exitCode=1;
