import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const tools=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(tools,'..');
// Add researched location.json files here. The generated page needs no server.
const locationFiles=['research/jinju-namgang/location.json','research/istanbul/location.json','research/chemba-kidoka/location.json'];
const locations=[];
for(const file of locationFiles){
  const data=JSON.parse(await fs.readFile(path.join(root,file),'utf8'));
  data.readings=JSON.parse(await fs.readFile(path.join(root,path.dirname(file),'readings.json'),'utf8'));
  if(data.timelinePolicy.lastPlayableYear!==1950)throw new Error('모든 장소의 종료 연도는 1950년이어야 합니다.');
  const sourceIds=new Set(data.sources.map(s=>s.id)),placeIds=new Set(data.places.map(p=>p.id));
  if(new Set(data.records.map(r=>r.id)).size!==data.records.length)throw new Error('중복된 자료 ID');
  for(const r of data.records){
    if(!placeIds.has(r.placeId)||!r.evidence.length||r.evidence.some(e=>!sourceIds.has(e.sourceId)))throw new Error('장소·출처 확인 필요: '+r.id);
    if(r.date&&(r.date.endYear>1950||r.date.startYear===0||r.date.endYear===0))throw new Error('연대 확인 필요: '+r.id);
  }
  const assigned=new Set(),records=new Map(data.records.map(r=>[r.id,r]));
  for(const chapter of data.readings.chapters){
    if(!chapter.recordIds.includes(chapter.anchorRecordId))throw new Error('읽기 시작 기록 누락: '+chapter.id);
    for(const id of chapter.recordIds){if(!records.get(id)?.date||assigned.has(id))throw new Error('읽기 기록 연결 확인: '+id);assigned.add(id);}
    for(const id of chapter.contextRecordIds){if(!records.has(id)||records.get(id).date)throw new Error('읽기 해설 연결 확인: '+id);}
    const hasDeep=Array.isArray(chapter.deep)&&chapter.deep.length>0;
    if(!hasDeep&&data.readings.completion!=='confirmed_notes')throw new Error('깊이 읽기 상태 확인: '+chapter.id);
    for(const level of ['basic','detail',...(hasDeep?['deep']:[])]){
      if(!chapter[level]?.length)throw new Error('읽기 단계 누락: '+chapter.id);
      for(const section of chapter[level])if(!section.paragraphs?.length||!section.sourceIds.length||section.sourceIds.some(id=>!sourceIds.has(id)))throw new Error('읽기 출처 확인: '+chapter.id);
    }
    if(hasDeep){const length=chapter.deep.flatMap(s=>s.paragraphs).join('').length;
      if(length<data.readings.readingRateCharactersPerMinute*5)throw new Error('깊이 읽기 분량 부족: '+chapter.id);}
  }
  if(data.records.some(r=>r.date&&!assigned.has(r.id)))throw new Error('시대 이야기에 연결되지 않은 기록');
  for(const source of data.sources)delete source.localEvidence;
  data.integrationStatus='embedded_in_standalone_html';
  if(data.id==='tz-chemba-kidoka'){
    data.mapLabel='쳄바 · 키도카 인근';
    data.researchReadiness.gameReady=true;
    data.researchReadiness.note='확인된 기록과 두 단계 읽기를 게임에 수록했다. 깊이 읽기는 보강 예정.';
  }
  locations.push(data);
}
// Simplify bundled Natural Earth coastlines for the overview map, preserving holes.
function simplify(points,tolerance=.055){
  if(points.length<=4)return points;
  const result=new Set([0,points.length-1]),stack=[[0,points.length-1]],threshold=tolerance*tolerance;
  while(stack.length){const [a,b]=stack.pop(),p=points[a],q=points[b],dx=q[0]-p[0],dy=q[1]-p[1],length=dx*dx+dy*dy;let far=-1,best=threshold;
    for(let i=a+1;i<b;i++){const r=points[i],t=length?Math.max(0,Math.min(1,((r[0]-p[0])*dx+(r[1]-p[1])*dy)/length)):0,d=(r[0]-p[0]-t*dx)**2+(r[1]-p[1]-t*dy)**2;if(d>best){far=i;best=d;}}
    if(far!==-1){result.add(far);stack.push([a,far],[far,b]);}
  }
  const selected=[...result].sort((a,b)=>a-b).map(i=>points[i]);
  return selected.length>=4?selected:points.length<=8?points:[points[0],points[Math.floor(points.length/3)],points[Math.floor(points.length*2/3)],points.at(-1)];
}
const land=JSON.parse(await fs.readFile(path.join(root,'data/land.json'),'utf8'));
const map={source:land.source,sourceUrl:land.sourceUrl,polygons:land.polygons.filter(p=>(p.bbox[2]-p.bbox[0])*(p.bbox[3]-p.bbox[1])>.002).map(p=>({bbox:p.bbox,rings:p.rings.map(r=>simplify(r))}))};
const escapeJSON=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
let html=await fs.readFile(path.join(tools,'static-template.html'),'utf8');
for(const [token,value] of [
  ['__STATIC_STYLE__',(await fs.readFile(path.join(tools,'static-style.css'),'utf8'))+'\n'+(await fs.readFile(path.join(tools,'static-discovery.css'),'utf8'))],
  ['__HISTORY_DATA__',escapeJSON({version:'history-atlas-static/1',locations})],
  ['__LAND_DATA__',escapeJSON(map)],
  ['__STATIC_CORE__',await fs.readFile(path.join(tools,'static-core.js'),'utf8')],
  ['__STATIC_APP__',await fs.readFile(path.join(tools,'static-app.js'),'utf8')],
  ['__STATIC_EXPLORE__',await fs.readFile(path.join(tools,'static-explore.js'),'utf8')]
]){if(!html.includes(token))throw new Error('템플릿 항목 누락: '+token);html=html.replace(token,()=>value);}
if(/__(?:STATIC|HISTORY|LAND)_/.test(html))throw new Error('치환하지 않은 템플릿 항목');
await fs.writeFile(path.join(root,'index.html'),html);
console.log(JSON.stringify({file:path.join(root,'index.html'),bytes:Buffer.byteLength(html),locations:locations.length,records:locations.reduce((n,l)=>n+l.records.length,0),endYear:1950}));
