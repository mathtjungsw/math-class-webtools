"""Anonymous public endpoint QA; never modifies the user's requested ID."""
from pathlib import Path
import json
import subprocess
import urllib.request
import secrets

ROOT=Path(__file__).resolve().parents[1]
deployment=json.loads((ROOT/'.private/deployment.json').read_text(encoding='utf-8'))
endpoint=deployment['endpoint']
qa_id='차고검증1102'
def call(body):
    req=urllib.request.Request(endpoint,data=json.dumps(body,ensure_ascii=False).encode('utf-8'),headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(req,timeout=60) as response:return json.load(response)

with urllib.request.urlopen(endpoint+'?action=health',timeout=30) as response:health=json.load(response)
assert health['ok']
seed=call({'action':'load','id':'이재욱'})
assert seed['ok'] and seed['progress']['xp']==0 and seed['progress']['stats']['car']['total']==0
assert call({'action':'load','id':'없는ID'+secrets.token_hex(3)})['error']=='ID_NOT_FOUND'
record=call({'action':'load','id':qa_id})
if not record['ok']:
    record=call({'action':'register','id':qa_id})
assert record['ok']
assert call({'action':'register','id':qa_id})['error']=='ID_EXISTS'
assert call({'action':'register','id':'=INVALID()'})['error']=='ID_INVALID'
before=record['progress']['stats']['clock']['total']
script="""
const fs=require('node:fs');const C=require('./core.js');
const cars=JSON.parse(fs.readFileSync('photos/sources.json','utf8'));
const p=C.validate(JSON.parse(fs.readFileSync(0,'utf8')),cars),target=p.stats.clock.total+1;
while(p.stats.clock.total<target){const q=C.ensureQuestion(p,cars);if(!q.resolved)C.answer(p,q.kind==='car'?{model:q.modelAnswer,year:q.yearAnswer}:q.answer);C.advance(p);}
process.stdout.write(JSON.stringify(p));
"""
result=subprocess.run(['node','-e',script],cwd=ROOT,input=json.dumps(record['progress'],ensure_ascii=False),capture_output=True,text=True,encoding='utf-8',check=True)
progress=json.loads(result.stdout)
request_id='qa_'+secrets.token_hex(12)
save={'action':'save','id':qa_id,'revision':record['revision'],'requestId':request_id,'progress':progress}
saved=call(save);assert saved['ok']
retried=call(save);assert retried['ok'] and retried['revision']==saved['revision']
assert call(save|{'requestId':'qa_'+secrets.token_hex(12)})['error']=='CONFLICT'
loaded=call({'action':'load','id':qa_id})
assert loaded['progress']['stats']['clock']['total']==before+1
assert loaded['progress']['xp']==progress['xp'] and loaded['progress']['carCount']==0
assert call({'action':'load','id':'이재욱'})['progress']['xp']==0
(ROOT/'.private/live-qa.json').write_text(json.dumps({'ok':True,'id':qa_id,'health':health,'revision':loaded['revision'],'xp':progress['xp'],'checks':['anonymous access','requested ID zero XP','ID typo rejection','duplicate registration','five cars and clock','cloud resume','idempotent retry','stale write rejection']},ensure_ascii=False,indent=2),encoding='utf-8')
print('LIVE PASS: anonymous access, seeded zero-XP ID, register/load, 5-car/clock cycle, save/resume, retry and stale-write rejection.')
