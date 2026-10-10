/* Historical display years: -1 = 1 BCE, +1 = 1 CE. No display year zero. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.StaticHistoryCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const END_YEAR=1950;
  const astronomical=year=>{if(!Number.isFinite(year)||year===0)throw new Error('역사 연대에 0년을 사용할 수 없습니다.');return year<0?year+1:year;};
  const historical=year=>year<=0?year-1:year;
  const monthOf=(year,month=1)=>astronomical(year)*12+month-1;
  const parts=month=>{const year=Math.floor(month/12);return {year:historical(year),month:Math.floor(month-year*12)+1};};
  const formatYear=year=>year<0?'기원전 '+Math.abs(year).toLocaleString('ko-KR')+'년':'서기 '+year.toLocaleString('ko-KR')+'년';
  const formatTime=month=>{const p=parts(month);return {year:formatYear(p.year),month:p.month+'월'};};
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  function prepare(location){
    const start=monthOf(location.timelinePolicy.recommendedStart.year),end=monthOf(END_YEAR,12);
    const entries=location.records.filter(r=>r.date).map(record=>{
      const d=record.date,year=d.displayAnchorYear??d.startYear;
      if(d.startYear===0||d.endYear===0||d.startYear>d.endYear||d.endYear>END_YEAR||year<d.startYear||year>d.endYear)throw new Error('자료의 연대를 확인해 주세요: '+record.id);
      const month=d.displayAnchorMonth??(d.calendar==='gregorian'&&d.month?d.month:1);
      if(!Number.isInteger(month)||month<1||month>12)throw new Error('자료의 배치 월을 확인해 주세요: '+record.id);
      return {record,month:monthOf(year,month),approximate:!['recorded_year','year','document_date'].includes(d.kind),year};
    }).filter(e=>e.month>=start&&e.month<=end).sort((a,b)=>a.month-b.month||a.record.id.localeCompare(b.record.id));
    const chapters=[];
    for(const entry of entries){let chapter=chapters[chapters.length-1];if(!chapter||chapter.month!==entry.month){chapter={month:entry.month,entries:[]};chapters.push(chapter);}chapter.entries.push(entry);}
    if(!chapters.length)throw new Error('재생할 조사 자료가 없습니다.');
    return {start,end,entries,chapters,contexts:location.records.filter(r=>!r.date)};
  }
  function indexAt(chapters,month){let i=0;while(i+1<chapters.length&&chapters[i+1].month<=month+1e-7)i++;return i;}
  function advance(timeline,month,seconds,monthsPerSecond,skip){
    const current=clamp(month,timeline.start,timeline.end),i=indexAt(timeline.chapters,current),chapter=timeline.chapters[i],next=timeline.chapters[i+1];
    if(current>=timeline.end)return {month:timeline.end,arrived:false,skipped:false,ended:true};
    const yearBoundary=(Math.floor(chapter.month/12)+1)*12;
    let target=Math.min(timeline.end,current+Math.max(0,seconds)*Math.max(0,monthsPerSecond));
    if(next)target=Math.min(target,next.month);
    let skipped=false;
    if(skip&&target>=yearBoundary&&(!next||next.month>yearBoundary)){const jump=next?next.month:timeline.end;skipped=jump>target;target=jump;}
    return {month:target,arrived:!!next&&Math.abs(target-next.month)<1e-7,skipped,ended:target>=timeline.end};
  }
  function readingMinutes(sections,rate=600){return Math.max(1,Math.ceil(sections.flatMap(s=>s.paragraphs).join('').length/rate));}
  return {END_YEAR,astronomical,historical,monthOf,parts,formatYear,formatTime,clamp,prepare,indexAt,advance,readingMinutes};
});
