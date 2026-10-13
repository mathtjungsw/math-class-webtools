import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const data=JSON.parse(fs.readFileSync(path.join(root,'location.json'),'utf8'));
const groups=[
 {id:'CHK-R01',title:'물건으로 만나는 오래된 사람들',periodLabel:'약 4만 년 전의 주변 비교 유적',question:'작은 구슬과 석기에서 무엇을 알 수 있을까?',recordIds:['CHK-001','CHK-002'],contextRecordIds:['CHK-C01','CHK-C02','CHK-C06'],intro:'추첨점의 첫 거주 연도는 아직 모릅니다. 먼저 북쪽 약 98km의 키세세Ⅱ 유적에서 구슬과 석기를 살펴봅니다. 각 물건의 연대와 우리가 모르는 점을 함께 읽어 보세요.'},
 {id:'CHK-R02',title:'이웃이 있어야 이어지는 생활',periodLabel:'19세기~1900년 기록',question:'농사·사냥·교역은 어떻게 함께 있었을까?',recordIds:['CHK-003','CHK-004','CHK-005'],contextRecordIds:['CHK-C03','CHK-C04'],intro:'먹거리를 얻고 도구를 만드는 일은 주변 공동체와 연결되어 있었습니다. 교역의 흔적과 생업에 관한 기록을 함께 읽되, 기록에 등장한 해를 그 활동의 시작년으로 생각하지 마세요.'},
 {id:'CHK-R03',title:'마을 밖의 세계가 들어오다',periodLabel:'1908~1922년',question:'종교와 전쟁은 어디에 흔적을 남겼을까?',recordIds:['CHK-006','CHK-007','CHK-008','CHK-009'],contextRecordIds:[],intro:'선교 활동, 암벽화의 외부 보고, 전쟁 일기, 통치 체계의 변화가 이어집니다. 이 기록들은 서로 다른 장소와 관찰자의 시야를 담고 있습니다. 하나의 기록이 주민 전체의 경험을 대신하지는 않습니다.'},
 {id:'CHK-R04',title:'밭과 숲을 누가 결정하는가',periodLabel:'1927~1939년의 기록 · 방제 사업은 1949년까지',question:'토지 정책과 주민의 생활은 어떻게 만났을까?',recordIds:['CHK-010','CHK-011','CHK-012','CHK-013','CHK-014','CHK-015','CHK-016'],contextRecordIds:['CHK-C05'],intro:'침식과 벌채가 행정 문제로 다뤄지고, 농사 방식에 규칙과 계획이 들어옵니다. 같은 지역 안에서도 마을별 경험은 달랐습니다. 계획·실제 시행·성과를 나누어 읽어 보세요.'},
 {id:'CHK-R05',title:'학교와 보호 제도, 1950년의 경계',periodLabel:'1946~1950년',question:'통치·교육·유산 보호의 변화는 무엇이었을까?',recordIds:['CHK-017','CHK-018','CHK-019'],contextRecordIds:[],intro:'신탁통치, 파르콰의 학교, 일부 암벽화의 법적 보호를 살펴봅니다. 국제 제도와 이웃 마을의 시설은 서로 다른 규모의 기록입니다. 탐험은 사용자가 정한 1950년에서 끝납니다.'}
];
const records=new Map(data.records.map(r=>[r.id,r])),places=new Map(data.places.map(p=>[p.id,p]));
const chapters=groups.map((g,i)=>({...g,anchorRecordId:g.recordIds[0],status:'confirmed_notes_deep_pending',basic:[{heading:g.title,paragraphs:[g.intro],sourceIds:[...new Set([...g.recordIds,...g.contextRecordIds].flatMap(id=>records.get(id).evidence.map(e=>e.sourceId)))]}],detail:[...g.recordIds,...g.contextRecordIds].map(id=>{const r=records.get(id),p=places.get(r.placeId);return {heading:r.title,paragraphs:[(r.date?r.date.label:'연도 미확정')+' · '+p.name,r.narrative,...r.limits.map(l=>'확인 범위: '+l)],sourceIds:r.evidence.map(e=>e.sourceId)};}),deep:[],transition:i<groups.length-1?'다음에는 '+groups[i+1].title+'를 살펴봅니다.':'서기 1950년까지의 확인 자료를 읽었습니다. 모르는 점은 탐험 노트에 남겨 보세요.'}));
const readings={schemaVersion:'chemba-readings-1.0',locationId:data.id,completion:'confirmed_notes',readingRateCharactersPerMinute:600,methodNote:'확인된 기록을 먼저 연결한 글입니다. 상세히 보기에서 장소와 확인 범위를 함께 읽을 수 있습니다. 5분 이상의 깊이 읽기는 자료 보강 후 추가됩니다.',chapters};
fs.writeFileSync(path.join(root,'readings.json.pending'),JSON.stringify(readings,null,2)+'\n');fs.renameSync(path.join(root,'readings.json.pending'),path.join(root,'readings.json'));
console.log(JSON.stringify({chapters:chapters.length,levels:['basic','detail'],deep:'pending'}));
