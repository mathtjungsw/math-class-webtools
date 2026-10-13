import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=path.dirname(fileURLToPath(import.meta.url));
const require=createRequire(import.meta.url), engine=require('../../engine.js');
const archive=path.resolve(root,'../../../../outputs/history-atlas-draws/2026-10-13T10-09-38-395Z.json');
const original=JSON.parse(fs.readFileSync(archive,'utf8'));
const day='2026-10-13';
const draw={...original,identifiedArea:'Chemba, Dodoma, Tanzania; Kidoka 인근',identificationMethod:'첫 육지를 수락한 뒤 OpenStreetMap Nominatim 역지오코딩(zoom 10, 16)',originalCoastlineVerified:true,mapUrl:'https://www.openstreetmap.org/?mlat=-5.370992&mlon=35.838650#map=13/-5.370992/35.838650',reverseGeocoding:{district:{osmType:'relation',osmId:13015748,name:'Chemba'},nearbyVillage:{osmType:'node',osmId:7747030139,name:'Kidoka',latitude:-5.4041921,longitude:35.8540606},warning:'역지오코딩은 인근 지물 반환이며 마을 경계 내부 판정이 아니다. 추첨 좌표를 반환 지물 좌표로 대체하지 않는다.'},archiveFile:path.relative(root,archive).replaceAll('\\','/')};
const sources=[];
function src(id,title,url,publisher,kind,access,checkedSections,notes=[],publicationYear=null,authors=[]){sources.push({id,title,url,publisher,kind,access,checkedOn:day,checkedSections,notes,publicationYear,authors});}
src('CH01','Natural Earth 1:10m Land','https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-land/','Natural Earth','geospatial_dataset','local_dataset_computed',['data/land.json 및 land-source.geojson 점 포함 검사'],['지구 표면적 균등 추첨; 원본과 단순화 해안선 모두 육지 판정. 역사적 경계 자료는 아니다.']);
src('CH02','OpenStreetMap Nominatim — 추첨점 및 Farkwa 지명','https://nominatim.openstreetmap.org/reverse?lat=-5.370992142220525&lon=35.83865032899922&format=jsonv2&zoom=16','OpenStreetMap contributors / Nominatim','geospatial_lookup','api_response_read',['역지오코딩 zoom 10·16; Farkwa Tanzania 검색'],['ODbL 지명 자료. 행정구역·현대 지물 위치에만 사용. Farkwa node 7747030180.']);
src('CH03','Chemba District Council — Historia','https://www.chembadc.go.tz/history','Chemba District Council','official_local_government','page_read',['1.1 Introduction'],['현재 쳄바 행정구역 명칭의 확인용. 2013년 설치를 1950년 이전 사건으로 넣지 않는다.']);
src('CH04','Middle and Later Stone Age chronology of Kisese II rockshelter (UNESCO World Heritage Kondoa Rock-Art Sites), Tanzania','https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0192029','PLOS ONE','peer_reviewed_archaeology','relevant_full_text_sections_read',['Site context and excavation history','Radiocarbon dating','Ostrich eggshell beads','Discussion; Conclusions'],['유적 층위와 암벽화의 제작 연대를 구별한다. 1951·1956년 발굴은 근거의 수집 이력이다.'],2018,['Christian A. Tryon','Jessica E. Lewis','Kathryn L. Ranhorn','Amandus Kwekason','Bridget Alex','Myra F. Laird','외']);
src('CH05','Kondoa Rock-Art Sites','https://whc.unesco.org/en/list/1183','UNESCO World Heritage Centre','official_heritage_summary','page_read',['Outstanding Universal Value','Protection and management requirements'],['2006년 등재는 게임 연표에서 제외. 대표점은 유산 전체나 개별 암벽화 좌표가 아니다.']);
src('CH06','The rock art of Kondoa District, Tanzania','https://doi.org/10.1080/0067270X.2015.1120436','Azania: Archaeological Research in Africa','peer_reviewed_review','abstract_only',['출판사 검색 색인의 초록·서지'],['본문 접근 실패. 양식 순서·제작 집단에 합의가 없다는 초록의 제한된 주장만 사용.'],2015,['Emmanuel J. Bwasiri','Benjamin W. Smith']);
src('CH07','Ironworking and Deforestation in Pre-Colonial Africa: The Case of Kondoa Irangi, Central Tanzania','https://journals.udsm.ac.tz/index.php/uj/article/view/1187','University of Dar es Salaam, Utafiti 10(2)','archaeological_and_ethnographic_research','selected_pdf_pages_visually_read',['PDF 인쇄면 65–67, 70–72'],['PDF: https://journals.udsm.ac.tz/index.php/uj/article/download/1187/1082','웹 메타데이터 저자명 Betram; PDF Bertram B. B. Mapunda. 연도는 권호 메타데이터 2013 사용.','정착·제철 BP의 보정 여부를 확인하지 못해 BCE/CE 확정 사건으로 변환하지 않는다.'],2013,['Bertram B. B. Mapunda']);
src('CH08','Historical Interaction with Neighbors from the View of Livelihood Change: A Study of the Sandawe of Tanzania','https://minpaku.repo.nii.ac.jp/record/7147/files/SES94_05.pdf','National Museum of Ethnology, Senri Ethnological Studies 94:81–105','ethnographic_and_historical_research','relevant_pdf_text_read',['pp.81–85: 초록·조사지 소개·선행연구'],['후대 현지조사와 과거 기록의 재검토. 1971년 마을 형성과 그 이전 Farkwa 지역 시설을 구분한다. 언어 계통 분류는 재사용하지 않는다.'],2016,['Haruna Yatsuka']);
src('CH09','Losing faith in the land: changing environmental perceptions in Burunge country, Tanzania','https://doi.org/10.1080/17531055.2010.487335','Journal of Eastern African Studies 4(2):247–265','ethnographic_and_historical_research','author_uploaded_full_text_relevant_sections_read',['pp.249–251: Sketch towards an environmental history of the area'],['열람본: https://www.researchgate.net/publication/46385404_Losing_faith_in_the_land_changing_environmental_perceptions_in_Burunge_country_Tanzania','원 여행기·현지 면담의 요약은 연구자를 통해 확인. 1950년대 가축 도살 면제와 1970년대 이후 이주를 연표에 넣지 않는다.'],2010,['Wilhelm Östberg','M. F. W. Slegers']);
src('CH10',"A Machine Gunner’s Odyssey Through German East Africa: The Diary of E. S. Thompson, Part 2, May–September 1916",'https://samilitaryhistory.org/vol075et.html','South African Military History Society','edited_primary_diary','transcription_and_editorial_context_read',['Deployment at Kondoa Irangi; 1916년 6월 7–10일 일기'],['원고 이미지 대조는 안 했다. 일기와 편집자 해설을 구분. 식민군 병사의 관찰은 주민 전체의 경험을 대표하지 않는다.']);
src('CH11','Foreign Relations of the United States: The Paris Peace Conference, 1919, Volume XIII — Covenant of the League of Nations','https://history.state.gov/historicaldocuments/frus1919Parisv13/ch10subch1','U.S. Department of State, Office of the Historian','official_document_edition','relevant_table_read',['p.101, Data on Mandated Territories: Tanganyika 행'],['1922년 위임통치 조건 승인일 확인. 자료 제목의 1919년을 사건 연도로 오인하지 않는다.']);
src('CH12','Depression, Dust Bowl, Demography, and Drought: The Colonial State and Soil Conservation in East Africa during the 1930s','https://www.african.cam.ac.uk/system/files/documents/anderson.pdf','African Affairs 83(332):321–343; Cambridge 보관본','archival_historical_research','relevant_pdf_text_and_table_image_read',['p.339 표 Kondoa 열 및 각주 64'],['표 이미지에서 OCR의 193District를 1930년으로 확인. 각주 속 TNA 문서 원본은 직접 열람하지 않았다.'],1984,['David Anderson']);
src('CH13','Geoarchaeology and Heritage Management: Identifying and Quantifying Multi-Scalar Erosional Processes at Kisese II Rockshelter, Tanzania','https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2021.665193/full','Frontiers in Earth Science','peer_reviewed_geoarchaeology','relevant_full_text_sections_read',['Discussion: History of Landscape Processes and Environmental Change in Kondoa Region'],['최근 침식 측정값을 1950년 이전 풍경에 투사하지 않는다.'],2021);
src('CH14','Tanganyika — UN Trusteeship Council Documentation','https://research.un.org/en/docs/tc/tanganyika','United Nations Dag Hammarskjöld Library','official_document_guide','guide_read_primary_text_not_read',['Agreement: A/RES/63(I), 13 Dec 1946; Reports of Administering Power'],['협정 승인일·영국과의 협정이라는 안내만 사용. 협정 본문 PDF는 열지 못했으므로 조항 내용은 인용하지 않는다.']);
const point={lat:draw.latitude,lon:draw.longitude};
const places=[];
function pl(id,name,latitude,longitude,sourceIds,note){const coordinate=latitude===null?null:{latitude,longitude};places.push({id,name,coordinate,sourceIds,note,...(coordinate?{distanceFromDrawKm:+engine.distance(point,{lat:latitude,lon:longitude}).toFixed(2),directionFromDraw:id==='draw_point'?null:engine.direction(point,{lat:latitude,lon:longitude})}:{})});}
pl('draw_point','실제 추첨 지점',draw.latitude,draw.longitude,['CH01','CH02'],'키도카 인근 육지. 이 점 자체의 발굴·정착·마을명은 미확인.');
pl('kidoka','키도카(현대 지명)',-5.4041921,35.8540606,['CH02'],'인근 지명 안내용; 역사 사건 위치로 쓰지 않는다.');
pl('farkwa','파르콰 지역',-5.4138109,35.6101427,['CH02','CH08'],'현대 마을 대표점. 1929년 교회·1947년 학교의 정확한 건물 좌표가 아니다.');
pl('kisese_ii','키세세Ⅱ 바위그늘 유적',-(4+29/60+30.47/3600),35+48/60+43.31/3600,['CH04'],'논문 좌표. 추첨 지점 북쪽 약 98km의 비교 유적.');
pl('kondoa_art','콘도아 암벽화 유적군 대표점',-(4+43/60+28/3600),35+50/60+2/3600,['CH05'],'UNESCO 대표점. 추첨 지점의 유산구역 포함 여부를 뜻하지 않는다.');
pl('chemba_burunge','쳄바·참발로와 부룽게 주변',null,null,['CH09'],'여러 마을의 교역·생활권. 범위를 특정 원형 반경으로 확정하지 않는다.');
pl('sandawe','산다웨 생활권',null,null,['CH08'],'연구자가 정한 여러 마을의 생활권이며, 키도카 주민의 정체성을 의미하지 않는다.');
pl('kondoa','콘도아 마을·이랑기 구릉',null,null,['CH07','CH09','CH10','CH12'],'서로 다른 규모의 자료가 모이는 지역. 개별 기록의 한계를 우선한다.');
pl('haubi','하우비와 주변 제철 유적',null,null,['CH07'],'하우비·바우라·파히 등에 관한 증거를 키도카 현장 유물로 표시하지 않는다.');
pl('tanganyika','탕가니카(당시 통치 단위)',null,null,['CH11','CH14'],'국가·광역 통치 배경. 현대 탄자니아의 국경과 이름을 과거에 그대로 사용하지 않는다.');
const records=[];
function rec(id,title,placeId,startYear,endYear,label,narrative,sourceId,locator,limits=[],kind='year',scope='regional_context'){
 records.push({id,title,placeId,date:startYear===null?null:{label,startYear,endYear,kind,calendar:'historical_CE_BCE_as_reported',displayAnchorYear:startYear,anchorIsExactEventDate:kind==='year'||kind==='day',anchorNote:kind==='year'?'연도만 확인; 월일 미확정':kind==='day'?'월일은 label에 보존':'시작값은 연표 배치용이며 사건 발생일이 아니다.'},status:'ready_with_labels',theme:[],narrative,evidence:[{sourceId,locator}],interpretations:[],limits,scope});
}
rec('CHK-001','작은 알껍데기 구슬에 남은 사람의 손','kisese_ii',-44250,-40750,'46.2–42.7 ka cal BP (약 기원전 44,250–40,750년)','키세세Ⅱ에서는 타조 알껍데기로 만든 구슬과 제작 흔적을 확인했다. 작은 물건을 다듬는 활동이 석기 사용과 함께 있었다.','CH04','Ostrich eggshell beads; spit XX',['추첨점의 거주 증거가 아니다.','출처의 보정 연대 범위를 대략적인 BCE 축으로 옮겼다. 구슬의 정확한 의미·소유자는 모른다.'],'calibrated_range');
rec('CHK-002','석기 기술은 한순간에 바뀌지 않았다','kisese_ii',-37650,-32350,'39.6–34.3 ka cal BP (약 기원전 37,650–32,350년)','기존 석기 제작 방식과 작은 돌날 기술이 함께 나타나는 층위를 통해 점진적인 변화를 읽는다. 동아프리카 모든 곳에서 같은 해에 전환한 것은 아니다.','CH04','Discussion: MSA/LSA transition',['옛 발굴 층위와 시료 이동 문제를 고려한 최소 범위.'],'calibrated_range');
rec('CHK-003','행렬이 지나가면 마을의 수요도 달라진다','chemba_burunge',1800,1899,'19세기','도도마에서 북쪽·해안 방면으로 이어진 가축 교역은 부룽게 주변에 식량·물·땔감 수요를 만들었다. 쳄바와 참발로의 교역 기억도 후대 조사에 남아 있다.','CH09','The Burunge area, p.250',['특정 행렬이 이 추첨점을 지났다는 경로 증거는 없다.','후대 구술 기억과 19세기 교역 배경을 결합한 연구 요약.'],'century');
rec('CHK-004','곡물과 들의 먹거리를 함께 이용한 사람들','sandawe',1891,1893,'1891–1893년 관찰에 관한 후대 연구','산다웨에 관한 초기 관찰에는 재배 작물뿐 아니라 야생 식물과 사냥감이 중요한 먹거리였다고 전한다. 생업 변화는 한 종류의 생활이 다른 것을 즉시 지우는 과정이 아니었다.','CH08','Previous research, p.85',['Baumann 원문이 아니라 Yatsuka의 선행연구 검토를 통해 확인.'],'reported_range');
rec('CHK-005','철을 만드는 사람과 쓰는 사람','kondoa',1900,1900,'1900년 기록에 전하는 기존 제철 활동','당시 기록을 검토한 연구는 하천의 철 성분 모래로 철을 만들고, 대장장이가 도구를 만들어 지역 안팎에 팔던 생산 체계를 설명한다.','CH07','p.71, Baumstark 1900을 Liesegang 1975를 통해 검토',['1900년은 기록 연도이며 제철 시작 연도가 아니다. 원 사료는 직접 대조하지 않았다.'],'recorded_by_year');
rec('CHK-006','종교의 새로운 접점','sandawe',1908,1908,'1908년','연구는 산다웨 생활권에 프랑스 선교사들이 도착한 해를 1908년으로 제시한다. 이후 종교 접촉을 살펴볼 수 있는 기준점이다.','CH08','Description of research sites, p.83',['키도카 선교소 설립이나 주민 전체 개종을 뜻하지 않는다.']);
rec('CHK-007','암벽화가 외부 보고에 등장하다','kondoa_art',1908,1908,'1908년','UNESCO 설명은 콘도아 암벽화의 존재가 1908년에 보고되었다고 정리한다. 이미 알려진 지역의 그림이 외부 기록에 들어온 시점으로 읽는다.','CH05','Protection and management requirements',['그림의 제작년이나 주민에 의한 최초 발견년이 아니다.']);
rec('CHK-008','포성 곁의 병상','kondoa',1916,1916,'1916년 6월 7–10일','콘도아에 있던 톰슨의 일기는 포격과 항공기 관측, 부상자 유입, 고통스러운 치료를 함께 기록한다. 전쟁을 전선의 이동뿐 아니라 몸과 보급의 경험으로 읽을 수 있다.','CH10','1916년 6월 7–10일 일기와 인접 편집 해설',['원고 이미지 미대조 전사본. 식민군 개인의 시야이며 현지 주민·운반인의 경험은 별도 조사 필요.'],'day');
rec('CHK-009','탕가니카의 위임통치 조건 승인','tanganyika',1922,1922,'1922년 7월 20일','국제연맹이 영국의 탕가니카 위임통치 조건을 승인했다. 전쟁 중 군사 점령과 국제적인 통치 체계의 확정을 구별한다.','CH11','p.101, Tanganyika 행',['추첨 지점의 행정 편입일을 따로 확인한 것은 아니다.'],'day','national_context');
rec('CHK-010','숲을 없애는 정책과 땅의 변화','kondoa',1927,1949,'1927–1949년','콘도아의 구릉 하부와 평야에서 식민 정부의 벌채 사업이 진행되었다. 후속 체체파리 방제와 토양 침식을 함께 검토해야 하는 시기다.','CH13','History of Landscape Processes and Environmental Change',['마을마다 시행 범위가 달랐다. 해당 좌표의 벌채 여부는 미확인.'],'reported_range');
rec('CHK-011','땅의 손상이 행정 문제로 기록되다','kondoa',1928,1930,'1928–1930년','1928년 관찰과 1930년 지역 행정 기록은 콘도아의 침식을 문제로 다루었다. 이는 침식 자체의 최초 발생 연대가 아니다.','CH12','p.339 표 Kondoa i–ii 및 각주 64',['식민 행정의 평가와 실제 환경 변화는 구별한다.'],'reported_range');
rec('CHK-012','파르콰 지역의 교회','farkwa',1929,1929,'1929년','파르콰 지역에 로마 가톨릭 교회가 건립되었다고 연구는 기록한다. 추첨점에서 서쪽 약 26km인 이웃 장소의 종교·생활 시설 사례다.','CH08','Description of research sites, p.83',['현대 마을 대표점과 당시 건물 위치를 혼동하지 않는다. 마을 창건년으로 쓰지 않는다.'],'year','connected_place');
rec('CHK-013','농사 방식에 규칙이 들어오다','kondoa',1932,1932,'1932년','콘도아의 Native Authority 조례가 토양 보전 조치를 다루기 시작했다. 경작은 생계 활동인 동시에 행정 규제의 대상이 되었다.','CH12','p.339 표 Kondoa iii',['조례 원문과 키도카 적용 조항은 미확인.']);
rec('CHK-014','키세세Ⅱ의 그림을 조사하다','kisese_ii',1935,1935,'1935년','루이스·메리 리키가 키세세Ⅱ를 방문해 암벽화를 조사·기록했다.','CH04','Site context and excavation history',['유적 발굴 시작 또는 그림 제작 시작과 동일시하지 않는다.']);
rec('CHK-015','콘도아가 보전 사업의 우선 대상이 되다','kondoa',1937,1937,'1937년','다르에스살람의 식민 행정은 콘도아를 침식 방지의 우선 대상으로 삼았다. 지역 문제가 더 넓은 행정의 정책 안으로 들어갔다.','CH12','p.339 표 Kondoa iii',['평가 표현은 행정의 관점이다.']);
rec('CHK-016','계획과 예산의 역사','kondoa',1938,1939,'1938–1939년','콘도아 개발 계획을 세우고 중앙 정부의 재원을 요청했다. 계획 작성과 실제 시행·성과는 서로 다른 사실이다.','CH12','p.339 표 Kondoa iv',['사업이 모든 마을에서 완료되었다고 해석하지 않는다.'],'reported_range');
rec('CHK-017','신탁통치로 바뀐 국제적 틀','tanganyika',1946,1946,'1946년 12월 13일','유엔은 영국과의 탕가니카 신탁통치 협정을 승인했다. 통치의 국제적 틀이 바뀌었지만 이 날짜를 독립일로 읽어서는 안 된다.','CH14','Agreement 안내 및 A/RES/63(I) 표기',['원 협정 본문은 미열람. 특정 조항·주민 권리의 실제 이행은 서술하지 않는다.'],'day','national_context');
rec('CHK-018','파르콰의 초등학교','farkwa',1947,1947,'1947년','파르콰 지역의 초등학교 설립은 1947년으로 제시된다. 이웃 지역의 교육 시설 변화를 따라갈 수 있다.','CH08','Description of research sites, p.83',['취학률·수업 언어·키도카 학생의 진학 여부는 미확인.'],'year','connected_place');
rec('CHK-019','일부 암벽화가 법적 보호 대상이 되다','kondoa_art',1949,1949,'1949년','콘도아 암벽화 12곳이 국가 기념물로 지정되어 특별 보호를 받게 되었다.','CH05','Protection and management requirements',['전체 암벽화의 일괄 지정도, 추첨점의 보호구역 지정도 아니다.']);
rec('CHK-C01','추첨점과 주변 유적을 구별하기','draw_point',null,null,null,'육지로 뽑힌 한 점은 발굴 유적과 다르다. 키도카 지명은 약 4km 떨어져 있으며 현재까지 이 점의 최초 거주 연도는 확인하지 못했다.','CH02','역지오코딩 결과',['최초 거주 연도는 null로 유지. 현재 주민의 집단 정체성도 추정하지 않는다.'],'context','local');
rec('CHK-C02','그림의 나이는 바닥 유물의 나이와 다르다','kondoa_art',null,null,null,'암벽화의 양식 순서와 제작 집단은 연구에서 계속 논의되고 있다. 바위그늘 바닥의 오래된 유물을 곧바로 벽화의 제작 연대로 삼을 수 없다.','CH06','초록',['초록만 확인. 모든 그림을 산다웨·하자 등 하나의 집단에 귀속시키지 않는다.'],'context');
rec('CHK-C03','제철과 정착의 연대를 아직 고정하지 않는 이유','haubi',null,null,null,'하우비 등의 정착·제철 연구가 있지만 요약 문헌의 BP 표기와 보정 여부, 앞선 추정치 사이의 관계를 더 확인해야 한다. 이번에는 확정 연표 대신 해설로 둔다.','CH07','pp.71–72',['BP 2000·1000을 단순히 서기·기원전으로 빼서 변환하지 않는다.'],'context');
rec('CHK-C04','철 도구는 이웃과의 관계였다','kondoa',null,null,null,'연구는 철 도구가 주변 공동체에 전달되고 가축·곡물·소금과 교환되던 관계를 설명한다. 북쪽의 마사이, 서쪽의 산다웨·냐투루, 남쪽의 고고는 콘도아를 기준으로 한 비교 대상이다.','CH07','p.72',['방향은 논문의 콘도아 기준. 추첨점 기준의 8방위로 자동 복사하지 않는다.'],'context');
rec('CHK-C05','같은 정책, 다른 마을','chemba_burunge',null,null,null,'부룽게에 관한 연구에서는 체체파리 방제 벌채가 참발로를 대상으로 했지만 고이마는 피했다고 설명한다. 가까운 장소끼리도 경험이 달랐다.','CH09','The Burunge area, p.250',['이 대목의 마을별 시행년을 미확인하여 독립 연대 사건으로 만들지 않았다.'],'context');
rec('CHK-C06','기록 공백을 읽는 법','kisese_ii',null,null,null,'시료가 드문 시기를 사람이 없던 시기로 확정할 수 없다. 표본 채집의 공백과 퇴적·침식, 실제 활동 중단을 나누어 생각해야 한다.','CH04','Radiocarbon dating: temporal gaps',['스킵 모드는 데이터가 있는 시기로 이동할 뿐 인간 활동의 부재를 선언하지 않는다.'],'context');
const themes={
 'CHK-001':['고고학','문화','생활'],'CHK-002':['고고학','생산','역사해석'],
 'CHK-003':['교역','교통','생업'],'CHK-004':['식량','농경','생업','주민의 삶'],
 'CHK-005':['생산','노동','교역'],'CHK-006':['신앙','공동체'],'CHK-007':['문화유산','기억'],
 'CHK-008':['전쟁','질병','돌봄'],'CHK-009':['통치','식민지','제도'],
 'CHK-010':['환경','행정','식민지'],'CHK-011':['환경','행정'],'CHK-012':['신앙','공동체'],
 'CHK-013':['농경','법','통제'],'CHK-014':['고고학','문화유산'],
 'CHK-015':['환경','행정'],'CHK-016':['재정','행정'],'CHK-017':['통치','제도','식민지'],
 'CHK-018':['교육','공동체'],'CHK-019':['문화유산','법'],
 'CHK-C01':['자료읽기','역사해석'],'CHK-C02':['문화유산','역사해석'],
 'CHK-C03':['고고학','생산','역사해석'],'CHK-C04':['교역','생업','주변관계'],
 'CHK-C05':['환경','통제'],'CHK-C06':['자료읽기','역사해석']
};
for(const r of records)r.theme=themes[r.id];
for(const [id,month] of [['CHK-008',6],['CHK-009',7],['CHK-017',12]]){
 const r=records.find(r=>r.id===id);r.date.displayAnchorMonth=month;
 r.date.calendar='gregorian';r.date.month=month;
}
records.find(r=>r.id==='CHK-008').date.kind='day_range';
records.find(r=>r.id==='CHK-008').date.anchorIsExactEventDate=false;
records.find(r=>r.id==='CHK-008').date.anchorNote='1916년 6월 7–10일의 일기 묶음. 연표에는 6월로 배치하며 한 사건의 발생일을 뜻하지 않는다.';
for(const [id,day] of [['CHK-009',20],['CHK-017',13]]){
 const d=records.find(r=>r.id===id).date;d.kind='document_date';d.day=day;d.anchorNote='출처에 제시된 승인 날짜를 보존하고 해당 월에 배치합니다.';
}
const data={schemaVersion:'chemba-kidoka-research-1.0',id:'tz-chemba-kidoka',name:'쳄바·키도카 인근과 콘도아 주변',language:'ko',researchedOn:day,status:'initial_research_with_scope_labels',integrationStatus:'research_only_not_integrated',representativePoint:{placeId:'draw_point',latitude:draw.latitude,longitude:draw.longitude,display:'남위 5.370992°, 동경 35.838650°',coordinateRole:'실제 육지 무작위 추첨값',sourceIds:['CH01','CH02'],provenanceFile:'draw.json',note:'발굴 유적이나 도시 중심으로 옮기지 않은 원 추첨점'},spatialScope:{description:'현대 쳄바 구역의 실제 추첨점을 기준으로 가까운 생활권과 북쪽 콘도아 비교 유적을 구분한다.',reuseRule:'반경만으로 역사 자료를 복사하지 말 것. 각 기록의 placeId·scope·limits를 함께 표시.',historicBoundariesVerified:false,exactPointSettlementVerified:false},timelinePolicy:{lastPlayableYear:1950,endInclusive:true,appliesToAllLocations:true,sourcePublicationYearMayExceedEndYear:true,radiocarbonReferenceYear:1950,radiocarbonRule:'미보정 BP는 변환하지 않는다. CHK-001·002의 cal BP는 원문의 보정 범위를 보존하고 BCE는 약 50년 단위 표시용 근사이다.',firstHabitationYear:null,earliestDatedSettlementInThisPack:null,earliestDatedActivityInThisPack:'CHK-001',recommendedStart:{year:-44250,label:'주변 유적의 보정 연대: 46.2–42.7 ka cal BP',recordId:'CHK-001',isExactFirstHabitationYear:false,note:'추첨점이 아닌 북쪽 약 98km의 유적에서 출발하는 비교 서사임을 첫 화면에 표시.'},yearEncoding:'기원전 N년=-N, 서기 N년=N. 0년 없음.',arithmeticRule:'engine.js는 천문학 연도이므로 통합 시 기원전 음수 연도를 year+1로 변환. 이 파일을 바로 엔진에 넣지 않는다.',skipRule:'연대 없는 해설은 별도 읽기. 기록 공백은 무인 상태를 뜻하지 않는다.',uncertainDateRule:'date.label 우선; 범위 시작은 배치용. recorded_by_year는 활동 시작년이 아니다.',endRule:'1950은 종료 경계이며 사건을 만들지 않는다.'},places,sources,records,researchReadiness:{fullThreeLevelReadingsWritten:false,gameReady:false,verifiedCardsCanBeAdapted:true,coreEvidence:'석기·암벽화, 교역·제철, 산다웨 생활, 파르콰 시설, 콘도아 전쟁·토지 정책, 탕가니카 통치 체계',remaining:['키도카와 추첨점의 직접 자료','하우비 정착·제철 원 연대표','주민·운반인 시점의 전쟁 연구','세 단계 읽기 집필과 HTML 통합'],note:'근거와 범위 표시를 유지하면 확인된 카드를 먼저 통합할 수 있다. 이 조사본 자체는 아직 게임에 반영되지 않았다.'}};
for(const [name,value] of [['draw.json',draw],['location.json',data]]){const dest=path.join(root,name);fs.writeFileSync(dest+'.pending',JSON.stringify(value,null,2)+'\n');fs.renameSync(dest+'.pending',dest);}
const names=new Map(places.map(p=>[p.id,p.name]));
const link=r=>r.evidence.map(e=>{const s=sources.find(s=>s.id===e.sourceId);return `[${s.id}](${s.url})`;}).join(' · ');
const chronological=[...records.filter(r=>r.date)].sort((a,b)=>a.date.startYear-b.date.startYear);
const table=['# 한눈에 보는 연표','', '**모든 항목은 1950년 이하.** 지역 비교 자료이며 추첨점의 연속 거주 연표가 아니다. 사건별 설명·근거 위치·한계는 [location.json](location.json)의 같은 식별자를 확인한다.','', '| 시기 | 기록 | 적용 장소 | 출처 |','|---|---|---|---|',...chronological.map(r=>`| ${r.date.label} | ${r.id} — ${r.title} | ${names.get(r.placeId)} | ${link(r)} |`),'','1950년은 게임 종료 경계이며 별도 역사 사건을 만들지 않는다.','', '## 연도 미확정 해설','',...records.filter(r=>!r.date).map(r=>`- ${r.id} — ${r.title} (${link(r)})`),'','보정 연대의 약식 BCE 표시는 정확한 사건일이 아니다. 장기 기록 공백은 사람이 없었다는 뜻이 아니다.',''].join('\n');
fs.writeFileSync(path.join(root,'timeline.md.pending'),table);fs.renameSync(path.join(root,'timeline.md.pending'),path.join(root,'timeline.md'));
console.log(JSON.stringify({dated:records.filter(r=>r.date).length,contexts:records.filter(r=>!r.date).length,sources:sources.length,places:places.length}));
