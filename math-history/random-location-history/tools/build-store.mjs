import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url),E=require('../engine.js');
const out=path.resolve(process.argv[2]||path.join(root,'../../../outputs/location-history'));
await fs.mkdir(out,{recursive:true});
const wb=Workbook.create();
const guide=wb.worksheets.add('안내');
const rows=[
 ['랜덤 위치 역사 탐험 저장소','',''],
 ['항목','사용 방법','값 또는 설명'],
 ['저장 상태','첫 탐험부터 실제 자료가 누적됩니다.','처음에는 역사자료·장소·수집기록이 비어 있습니다.'],
 ['역사자료','위치와 연대, 출처가 있는 기록','자동 수집 자료는 candidate 상태로 저장됩니다.'],
 ['장소','가까운 장소의 설명과 출처','현재 장소 소개입니다. 과거 영토나 거주 시작을 의미하지 않습니다.'],
 ['수집기록','검색 영역과 수집 시점','ok는 검색 성공을 뜻하며 모든 역사가 수록됐다는 뜻은 아닙니다.'],
 ['자료 검토','게임의 자료 보관함에서 처리','candidate: 검토 대기 / reviewed: 검토 완료 / rejected: 제외'],
 ['거주 증거','출처를 확인하고 자료 보관함에서 추가','category=habitation. 검토 완료이고 유적 범위 안일 때 시작점으로 사용합니다.'],
 ['연대 규칙','숫자로 저장하는 천문학적 연도','0 = 기원전 1년, -1 = 기원전 2년, 1 = 서기 1년'],
 ['연대 정확도','precision 항목','year / month / approximate / century / millennium'],
 ['적용 위치','lat, lon, radiusKm','위도·경도와 해당 유적의 범위(km)입니다.'],
 ['주변 탐색','게임에서 선택하는 반경','자료의 유적 범위와 주변 검색 반경은 별개입니다.'],
 ['출처','sourceTitle, sourceUrl, sourceQuote','자료 제공처, 원문 링크, 수집한 연대 근거'],
 ['고유 ID','id 항목을 유지하세요.','재수집 시 중복을 막고 검토 상태를 유지합니다.'],
 ['백업','게임의 JSON 백업 버튼','세 자료 탭의 전체 내용을 내려받습니다.'],
 ['저장소 이전','표 구조와 ID를 유지합니다.','나중에 전용 데이터베이스로 이전할 수 있습니다.'],
 ['열 제목','자료 탭의 첫 행을 유지하세요.','프로그램이 열 제목으로 저장 구조를 확인합니다.'],
 ['예시 자료','차탈회위크 기능 예시','예시는 실제 저장 자료와 분리되어 있습니다.']
];
guide.getRange('A1:C18').values=rows;
guide.getRange('A1:C18').format.font={name:'Arial',size:11,color:'#222222'};
guide.getRange('A1:C18').format.rowHeight=30;
guide.getRange('A1:C18').format.verticalAlignment='center';
guide.getRange('A1').format.font={name:'Arial',size:15,bold:true};
guide.getRange('A2:C2').format.fill='#eeeeee';guide.getRange('A2:C2').format.font.bold=true;
guide.getRange('A1:A18').format.columnWidth=29;guide.getRange('B1:B18').format.columnWidth=46;guide.getRange('C1:C18').format.columnWidth=82;
guide.showGridLines=false;
for(const [name,fields] of [['역사자료',E.EVENT_FIELDS],['장소',E.PLACE_FIELDS],['수집기록',E.QUERY_FIELDS]]){
  const sheet=wb.worksheets.add(name);sheet.getRangeByIndexes(0,0,1,fields.length).values=[fields];
  const header=sheet.getRangeByIndexes(0,0,1,fields.length);
  header.format.fill='#eeeeee';header.format.font={name:'Arial',size:11,bold:true,color:'#222222'};header.format.columnWidth=20;header.format.rowHeight=28;header.format.verticalAlignment='center';
  sheet.freezePanes.freezeRows(1);sheet.showGridLines=false;
}
wb.recalculate();
console.log((await wb.inspect({kind:'table',sheetId:'안내',range:'A1:C5',tableMaxRows:5,tableMaxCols:3,maxChars:1800})).ndjson);
for(const [name,range] of [['안내','A1:C18'],['역사자료','A1:F2'],['장소','A1:H2'],['수집기록','A1:F2']]){
  const preview=await wb.render({sheetName:name,range,scale:1,format:'png'});await fs.writeFile(path.join(out,name+'.png'),new Uint8Array(await preview.arrayBuffer()));
}
await (await SpreadsheetFile.exportXlsx(wb)).save(path.join(out,'history-store.xlsx'));
console.log('Saved '+path.join(out,'history-store.xlsx'));
