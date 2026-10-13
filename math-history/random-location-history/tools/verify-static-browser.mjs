// Optional real-browser QA: set HISTORY_PLAYWRIGHT_PATH to Playwright's entry file
// and HISTORY_BROWSER_EXE to a Chromium browser if neither is installed locally.
import fs from 'node:fs/promises';
import http from 'node:http';
import assert from 'node:assert/strict';
import {pathToFileURL,fileURLToPath} from 'node:url';
import path from 'node:path';
import os from 'node:os';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pw=await import(process.env.HISTORY_PLAYWRIGHT_PATH?pathToFileURL(process.env.HISTORY_PLAYWRIGHT_PATH).href:'playwright');
const {chromium}=pw.default||pw;
const html=await fs.readFile(path.join(root,'index.html'),'utf8');
const bundle=JSON.parse(html.match(/<script id="history-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,...(process.env.HISTORY_BROWSER_EXE?{executablePath:process.env.HISTORY_BROWSER_EXE}:{})});
const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const origin='http://127.0.0.1:'+server.address().port;
const output=process.env.HISTORY_QA_OUTPUT;const screen=async name=>{if(output){await fs.mkdir(output,{recursive:true});await page.screenshot({path:path.join(output,name+'.png')});}};
const offlineDir=await fs.mkdtemp(path.join(os.tmpdir(),'history-atlas-browser-'));
const offlineFile=path.join(offlineDir,'history-atlas.html');
async function tab(name){await page.locator('[data-discovery-tab="'+name+'"]').click();}
try{
  await page.goto(origin);
  for(const location of bundle.locations){
    await page.selectOption('#location-select',location.id);await tab('space');
    for(let i=0;i<location.readings.chapters.length;i++){
      await page.selectOption('#explore-era',String(i));
      assert.equal(await page.locator('#era-question').textContent(),location.readings.chapters[i].question);
      const places=new Set(location.readings.chapters[i].recordIds.map(id=>location.records.find(r=>r.id===id).placeId));
      assert.equal(await page.locator('#era-places button').count(),places.size);
      for(const place of places){await page.locator('#era-places [data-explore-place="'+place+'"]').click();assert.ok(await page.locator('#place-stories .explore-fact').count());}
    }
  }
  await page.selectOption('#location-select','tz-chemba-kidoka');
  assert.match(await page.locator('#start-label').textContent(),/98km/);
  assert.match(await page.locator('#reading-status').textContent(),/보강 예정/);
  assert.equal(await page.locator('#era-map .field-diagram').count(),1);
  assert.doesNotMatch(await page.locator('#era-map').textContent(),/남강/);
  for(const chapter of bundle.locations.find(l=>l.id==='tz-chemba-kidoka').readings.chapters){
    for(const level of ['basic','detail']){
      await page.evaluate(({id,level})=>HistoryAtlas.openReading(id,level),{id:chapter.id,level});
      assert.ok((await page.locator('#reader-body').textContent()).length>80);
      assert.equal(await page.locator('[data-level="deep"]').isDisabled(),true);
      await page.locator('#reader-dialog [data-close]').click();
    }
  }
  await tab('topic');await page.locator('[data-topic="work"]').click();
  assert.ok(await page.locator('#topic-trail .explore-fact').count());
  assert.equal(await page.locator('#topic-trail [data-reading-level="deep"]').count(),0);
  await page.evaluate(()=>HistoryAtlas.openReading('CHK-R01','deep'));
  assert.equal(await page.locator('[data-level="detail"]').getAttribute('aria-pressed'),'true');
  await page.locator('#reader-dialog [data-close]').click();
  await page.selectOption('#location-select','tr-istanbul');
  await tab('space');
  await page.locator('#era-map [data-explore-place="yenikapi"]').click();
  assert.match(await page.locator('#place-stories').textContent(),/신석기/);
  await page.locator('#era-reading [data-explore-jump]').click();
  await page.locator('#era-follow').check();
  await page.evaluate(()=>HistoryAtlas.goToRecord('IST-057'));
  assert.equal(await page.locator('#explore-era').inputValue(),'7');
  await tab('compare');
  assert.equal(await page.locator('.compare-cell').count(),2);
  await page.selectOption('#compare-left','1');await page.selectOption('#compare-right','4');
  await page.selectOption('#compare-topic','life');
  assert.ok((await page.locator('.compare-cell').nth(0).textContent()).includes('330'));
  assert.ok((await page.locator('.compare-cell').nth(1).textContent()).includes('1453'));
  const first=await page.locator('.compare-cell').nth(0).textContent();
  await page.locator('#compare-swap').click();assert.equal(await page.locator('.compare-cell').nth(1).textContent(),first);
  await page.selectOption('#compare-left','0');await page.selectOption('#compare-right','0');
  assert.match(await page.locator('#compare-message').textContent(),/같은 시대/);
  await page.selectOption('#compare-left','4');await page.selectOption('#compare-right','4');
  await page.selectOption('#compare-topic','work');assert.equal(await page.locator('.unfilled').count(),2);
  await tab('topic');await page.locator('[data-topic="work"]').click();
  const matching=bundle.locations.find(l=>l.id==='tr-istanbul').records.filter(r=>r.date&&r.theme.some(t=>['노동','교역','교류','항구','생업','경제','상업','교통','재정'].includes(t)));
  assert.equal(await page.locator('#topic-trail .explore-fact').count(),matching.length);
  await page.locator('#topic-trail [data-explore-jump="IST-003"]').click();
  assert.match(await page.locator('#current-stories').textContent(),/어업과 소금/);
  await page.locator('#current-stories [data-note="IST-003"]').click();
  await tab('notebook');assert.equal(await page.locator('#notebook-count').textContent(),'1');
  const note='<script>메모는 코드가 아니라 내 질문</script> & 항구 노동';
  await page.fill('[data-note-text="IST-003"]',note);
  await page.reload();await tab('notebook');
  assert.equal(await page.locator('[data-note-text="IST-003"]').inputValue(),note);
  const downloading=page.waitForEvent('download');await page.locator('#notes-export').click();
  const exported=JSON.parse(await fs.readFile(await (await downloading).path(),'utf8'));
  assert.equal(exported.notes[0].text,note);assert.equal(exported.notes[0].recordId,'IST-003');assert.ok(exported.notes[0].sourceUrls.length);
  await page.selectOption('#location-select',bundle.locations[0].id);
  assert.equal(await page.locator('#notebook-count').textContent(),'0');
  await page.selectOption('#location-select','tr-istanbul');
  assert.equal(await page.locator('#notebook-count').textContent(),'1');
  await page.locator('[data-note-remove="IST-003"]').click();assert.equal(await page.locator('#notebook-count').textContent(),'0');
  // Keyboard navigation operates the tab group.
  await page.locator('#tab-notebook').focus();await page.keyboard.press('ArrowLeft');
  assert.equal(await page.locator('#tab-topic').getAttribute('aria-selected'),'true');
  // Reading still pauses live playback when entered through the new UI.
  await tab('space');await page.selectOption('#explore-era','1');
  await page.locator('#play').click();
  await page.locator('#era-reading [data-reading]').click();
  assert.equal((await page.evaluate(()=>HistoryAtlas.getState())).playing,false);
  assert.match(await page.locator('#reader-title').textContent(),/먹이고/);
  await page.locator('#reader-dialog [data-close]').click();
  await page.locator('#discovery-heading').scrollIntoViewIfNeeded();await screen('discovery-desktop');
  for(const width of [390,320]){
    await page.setViewportSize({width,height:844});
    for(const mode of ['space','compare','topic','notebook']){
      await tab(mode);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+width+' '+mode);
      await page.locator('#discovery-heading').scrollIntoViewIfNeeded();await screen('discovery-'+width+'-'+mode);
    }
  }
  await page.selectOption('#location-select','tz-chemba-kidoka');
  for(const width of [390,320]){
    await page.setViewportSize({width,height:844});
    for(const mode of ['space','compare','topic','notebook']){
      await tab(mode);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'chemba overflow '+width+' '+mode);
    }
    await tab('space');await page.locator('#discovery-heading').scrollIntoViewIfNeeded();await screen('chemba-'+width);
  }
  await page.setViewportSize({width:1440,height:1000});await screen('chemba-desktop');
  // The saved standalone HTML must include every new script and work offline.
  await page.setViewportSize({width:1440,height:1000});
  const saveHTML=page.waitForEvent('download');await page.locator('#export-html').click();
  const download=await saveHTML,local=await context.newPage();
  await fs.copyFile(await download.path(),offlineFile);
  await context.setOffline(true);await local.goto(pathToFileURL(offlineFile).href);
  await local.selectOption('#location-select','tr-istanbul');
  assert.equal(await local.locator('#explore-era option').count(),8);
  await local.selectOption('#location-select','tz-chemba-kidoka');
  assert.equal(await local.locator('#explore-era option').count(),5);
  await local.evaluate(()=>HistoryAtlas.openReading('CHK-R01','detail'));
  assert.match(await local.locator('#reader-body').textContent(),/확인 범위/);
  await context.setOffline(false);await local.close();
  // Storage denial must not break exploration or the current-session notebook.
  const blocked=await context.newPage();await blocked.addInitScript(()=>{Storage.prototype.setItem=function(){throw new Error('blocked');};});
  await blocked.goto(origin);await blocked.locator('#current-stories [data-note]').first().click();
  assert.equal(await blocked.locator('#notebook-count').textContent(),'1');assert.match(await blocked.locator('#notebook-status').textContent(),/사용할 수 없습니다/);
  await blocked.close();assert.deepEqual(errors,[]);
  console.log(JSON.stringify({locations:bundle.locations.length,eraMaps:bundle.locations.reduce((n,l)=>n+l.readings.chapters.length,0),chembaReadings:true,deepPending:true,comparison:true,topicChronology:true,notes:{persisted:true,isolated:true,escaped:true,exported:true,removed:true},offline:true,storageBlocked:true,mobileWidths:[390,320],errors}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));await fs.unlink(offlineFile).catch(()=>{});await fs.rmdir(offlineDir);}
