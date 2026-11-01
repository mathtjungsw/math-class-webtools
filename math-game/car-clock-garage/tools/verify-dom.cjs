// Optional non-rendering DOM verification. Set CAR_CLOCK_DOM_PATH to linkedom's package path.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {parseHTML} = require(process.env.CAR_CLOCK_DOM_PATH || 'linkedom');
const root = path.resolve(__dirname, '..');
const KEY = 'car-clock-garage/v1';
const htmlPath = process.env.CAR_CLOCK_HTML || path.join(root,'index.html');
function boot(storage = new Map()) {
  const {window, document} = parseHTML(fs.readFileSync(htmlPath,'utf8'));
  for (const dialog of document.querySelectorAll('dialog')) {
    Object.defineProperty(dialog,'open',{get(){return this.hasAttribute('open');}});
    dialog.showModal = function(){this.setAttribute('open','');};
    dialog.close = function(){this.removeAttribute('open');this.dispatchEvent(new window.Event('close'));};
  }
  // Linkedom omits browser implementations of these standard UI methods.
  window.HTMLElement.prototype.focus=()=>{};
  window.HTMLElement.prototype.scrollIntoView=()=>{};
  for (const el of document.querySelectorAll('select')) Object.defineProperty(el,'value',{writable:true,value:el.querySelector('option').value});
  window.GarageCore = require(path.join(root,'core.js'));
  const localStorage = {getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
  const errors=[];
  const context = vm.createContext({window,document,localStorage,location:{search:''},URL,URLSearchParams,Blob,console,Date,Math,JSON,setTimeout,clearTimeout});
  const scripts = [...document.querySelectorAll('script')].filter(el => !el.hasAttribute('src'));
  if (scripts.length) scripts.forEach(el=>vm.runInContext(el.textContent,context));
  else {
    vm.runInContext(fs.readFileSync(path.join(root,'cars.js'),'utf8'),context);
    vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),context);
  }
  const $=id=>document.getElementById(id), click=id=>$(id).click();
  const state=()=>JSON.parse(storage.get(KEY));
  const answer=(correct=true)=>{
    const q=state().active;
    const value=correct?q.answer:q.choices.find(x=>x!==q.answer);
    const b=[...$('choices').querySelectorAll('button')].find(b=>b.querySelector('.choice-text').textContent===value);
    b.click();
  };
  return {window,document,$,click,state,answer,storage,errors};
}
(async()=>{
  const app=boot();
  assert.equal(app.$('home').hidden,false);
  app.click('start-button');
  assert.equal(app.$('game').hidden,false);
  assert.equal(app.$('choices').children.length,3);
  app.answer(false);
  assert.match(app.$('feedback').textContent,/다시 골라/);
  assert.equal(app.state().xp,0);
  app.answer();
  assert.match(app.$('feedback').textContent,/정답이에요/);
  assert.equal(app.state().xp,5);
  const saved=app.storage.get(KEY), resumed=boot(app.storage);
  resumed.click('start-button');
  assert.equal(resumed.$('next-button').hidden,false);
  assert.equal(resumed.state().xp,5);
  resumed.answer();
  assert.equal(resumed.state().xp,5);
  resumed.click('next-button');
  for(let i=1;i<5;i++){resumed.answer();resumed.click('next-button');}
  assert.equal(resumed.state().active.kind,'clock');
  assert.equal(resumed.$('clock-stage').hidden,false);
  assert.equal(resumed.$('clock').querySelectorAll('[data-hand]').length,2);
  resumed.click('hint-button');
  assert.match(resumed.$('hint-text').textContent,/짧은 바늘/);
  resumed.answer();
  assert.equal(resumed.state().xp,55);
  assert.equal(resumed.state().stats.clock.assisted,1);
  resumed.click('next-button');
  assert.equal(resumed.state().round,2);
  assert.equal(resumed.state().active.kind,'car');
  resumed.click('settings-button');
  resumed.$('difficulty').value='year'; resumed.$('choice-count').value='4'; resumed.$('clock-step').value='60';
  resumed.$('settings-form').dispatchEvent(new resumed.window.Event('submit',{bubbles:true,cancelable:true}));
  assert.equal(resumed.state().settings.difficulty,'year');
  assert.equal(resumed.$('settings-dialog').open,false);
  resumed.answer();resumed.click('next-button');
  assert.equal(resumed.state().active.mode,'year');
  assert.equal(resumed.$('choices').children.length,4);
  resumed.click('photo-source');
  assert.equal(resumed.$('credits-dialog').open,true);
  assert.equal(resumed.$('credits-list').children.length,24);
  assert.match(resumed.$('credits-list').textContent,/제조사 자료/);
  resumed.$('credits-dialog').close();
  // Complete questions until the first unlock; selecting the new car persists.
  while(resumed.state().xp<80){resumed.answer();if(resumed.state().xp<80)resumed.click('next-button');}
  assert.equal(resumed.$('unlock-dialog').open,true);
  resumed.click('equip-unlocked');
  assert.equal(resumed.state().selected,'ray');
  resumed.click('garage-button');
  assert.equal(resumed.$('garage-grid').children.length,9);
  assert.equal(resumed.$('garage-grid').querySelectorAll('.locked').length,7);
  resumed.$('garage-dialog').close();
  resumed.click('settings-button');
  // Invalid backup leaves persisted progress unchanged.
  const before=resumed.storage.get(KEY);
  resumed.$('import-file').files=[{size:30,text:async()=>'{invalid json'}];
  resumed.$('import-file').dispatchEvent(new resumed.window.Event('change'));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(resumed.storage.get(KEY),before);
  assert.match(resumed.$('settings-message').textContent,/JSON/);
  resumed.$('import-file').files=[{size:1000,text:async()=>JSON.stringify({format:'car-clock-garage-backup',progress:JSON.parse(saved)})}];
  resumed.$('import-file').dispatchEvent(new resumed.window.Event('change'));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(resumed.$('import-dialog').open,true);
  resumed.click('confirm-import');
  assert.equal(resumed.state().xp,5);
  assert.equal(resumed.$('next-button').hidden,false);
  assert.equal(resumed.$('import-dialog').open,false);
  // Concurrent-tab updates stop stale writes.
  const other = JSON.stringify({...resumed.state(),xp:12});
  resumed.storage.set(KEY,other);
  resumed.click('next-button');
  assert.equal(resumed.storage.get(KEY),other);
  assert.match(resumed.$('storage-warning').textContent,/다른 탭/);
  // Corrupt existing data is preserved while temporary play and backups remain possible.
  const broken=boot(new Map([[KEY,'broken']]));broken.click('start-button');
  assert.equal(broken.storage.get(KEY),'broken');
  assert.equal(broken.$('storage-warning').hidden,false);
  console.log('DOM QA passed: start, choices, retry, resume, five-car/clock cycle, hint, settings, credits, unlock/equip, garage, backup import, conflicts, corrupt storage. No browser rendering was used.');
})().catch(e=>{console.error(e);process.exitCode=1;});
