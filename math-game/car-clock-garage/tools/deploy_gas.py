"""Deploy this app through official APIs using existing clasp authorization.

Tokens stay in memory. .private stores only this app's resource IDs and endpoint.
Never overwrite other apps or publish the private game-record spreadsheet.
"""
from pathlib import Path
import argparse
import json
import re
import urllib.error
import urllib.parse
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
STATE=ROOT/'.private/deployment.json'
ASSET_BASE='https://mathtjungsw.github.io/math-class-webtools/math-game/car-clock-garage/'
BUILD='20261102-expanded-2'

def credentials():
    value=json.loads((Path.home()/'.clasprc.json').read_text(encoding='utf-8'))['tokens']['default']
    data={key:value[key] for key in ['client_id','client_secret','refresh_token']}
    data['grant_type']='refresh_token'
    req=urllib.request.Request('https://oauth2.googleapis.com/token',data=urllib.parse.urlencode(data).encode())
    with urllib.request.urlopen(req,timeout=30) as response:return json.load(response)['access_token']

def request(token,method,url,data=None):
    req=urllib.request.Request(url,method=method,data=json.dumps(data,ensure_ascii=False).encode('utf-8') if data is not None else None,headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(req,timeout=60) as response:return json.load(response)
    except urllib.error.HTTPError as error:
        try:message=json.loads(error.read()).get('error',{}).get('message','API request failed')
        except ValueError:message='API request failed'
        raise RuntimeError(str(error.code)+' '+message) from None

def persist(state):
    STATE.parent.mkdir(parents=True,exist_ok=True)
    STATE.write_text(json.dumps(state,ensure_ascii=False,indent=2),encoding='utf-8')

def provision(token,state):
    if 'spreadsheetId' not in state:
        file=ROOT/'.private/seed-records.xlsx'
        if not file.exists():raise RuntimeError('Create the private seed workbook first.')
        boundary='CarClockNativeSpreadsheetImport20261102'
        metadata={'name':'부릉부릉 차고 · 아이디별 게임기록','mimeType':'application/vnd.google-apps.spreadsheet'}
        body=('--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+json.dumps(metadata,ensure_ascii=False)+'\r\n--'+boundary+'\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n').encode('utf-8')+file.read_bytes()+('\r\n--'+boundary+'--').encode()
        req=urllib.request.Request('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,mimeType',data=body,headers={'Authorization':'Bearer '+token,'Content-Type':'multipart/related; boundary='+boundary},method='POST')
        with urllib.request.urlopen(req,timeout=60) as response:sheet=json.load(response)
        assert sheet['mimeType']=='application/vnd.google-apps.spreadsheet'
        state['spreadsheetId']=sheet['id'];state['sheetUrl']=sheet.get('webViewLink');state['seeded']=True;persist(state)
        print('PRIVATE_SPREADSHEET_CREATED')
    if 'scriptId' not in state:
        state['scriptId']=request(token,'POST','https://script.googleapis.com/v1/projects',{'title':'부릉부릉 차고 · 아이디로 이어 하는 자동차 퀴즈'})['scriptId'];persist(state)
        print('SCRIPT_CREATED')

def build_files(state):
    html=(ROOT/'index.html').read_text(encoding='utf-8')
    html=html.replace('<head>','<head>\n<base target="_top">')
    css=(ROOT/'style.css').read_text(encoding='utf-8')
    html=re.sub(r'<link rel="stylesheet" href="style\.css(?:\?[^\"]*)?">',lambda _:'<style>'+css+'</style>',html)
    html=re.sub(r'<script defer src="[^\"]+"></script>','',html)
    html=html.replace('src="photos/','src="'+ASSET_BASE+'photos/')
    html=html.replace('href="./index.html"','href="'+state.get('endpoint',ASSET_BASE)+'"')
    html=html.replace('href="../../index.html"','href="https://mathtjungsw.github.io/math-class-webtools/"')
    config={'cloud':True,'cloudUrl':state.get('endpoint',''),'assetBase':ASSET_BASE,'build':BUILD}
    sources=['window.GARAGE_CONFIG='+json.dumps(config)+';']
    for name in ['cars.js','core.js','cloud.js','app.js']:
        js=(ROOT/name).read_text(encoding='utf-8')
        if name=='cars.js':
            cars=json.loads((ROOT/'photos/sources.json').read_text(encoding='utf-8'))
            for car in cars:car['image']=ASSET_BASE+car['image']
            js='window.GARAGE_CARS='+json.dumps(cars,ensure_ascii=False)+';'
        sources.append(js)
    script='\n'.join(sources).replace('</script','<\\/script')
    html=html.replace('</body>','<script>'+script+'</script></body>')
    core=(ROOT/'core.js').read_text(encoding='utf-8').replace('(function (root) {','var GARAGE_CORE = (function (root) {',1)
    core=re.sub(r"  if \(typeof module[\s\S]*?else root\.GarageCore = api;",'  return api;',core)
    catalog=json.loads((ROOT/'photos/sources.json').read_text(encoding='utf-8'))
    slim=[{key:car[key] for key in ['id','model','series','year','yearSource','requiresYear','group'] if key in car} for car in catalog]
    files=[{'name':'Index','type':'HTML','source':html},{'name':'Core','type':'SERVER_JS','source':core},{'name':'Catalog','type':'SERVER_JS','source':'var GARAGE_CATALOG='+json.dumps(slim,ensure_ascii=False)+';'},
           {'name':'BackendConfig','type':'SERVER_JS','source':'var SPREADSHEET_ID='+json.dumps(state['spreadsheetId'])+';var BUILD_ID='+json.dumps(BUILD)+';'}]
    for file in (ROOT/'apps-script').glob('*.gs'):
        if file.stem not in ['Core','Catalog','BackendConfig']:files.append({'name':file.stem,'type':'SERVER_JS','source':file.read_text(encoding='utf-8')})
    files.append({'name':'appsscript','type':'JSON','source':(ROOT/'apps-script/appsscript.json').read_text(encoding='utf-8')})
    return files

def seed(token,state):
    # The requested initial ID is private spreadsheet data, not public source code.
    if state.get('seeded'):print('REQUESTED_ID_INITIALIZED_WITH_ZERO_XP');return
    raise RuntimeError('Initial records must be provisioned from the private seed workbook.')

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--provision-only',action='store_true');args=parser.parse_args()
    token=credentials();state=json.loads(STATE.read_text(encoding='utf-8')) if STATE.exists() else {}
    provision(token,state)
    if args.provision_only:return
    script=state['scriptId'];files=build_files(state)
    request(token,'PUT',f'https://script.googleapis.com/v1/projects/{script}/content',{'files':files})
    version=request(token,'POST',f'https://script.googleapis.com/v1/projects/{script}/versions',{'description':BUILD})['versionNumber']
    config={'versionNumber':version,'manifestFileName':'appsscript','description':'부릉부릉 차고 · Google 로그인 없는 아이디 이어 하기'}
    if state.get('deploymentId'):deployment=request(token,'PUT',f'https://script.googleapis.com/v1/projects/{script}/deployments/{state["deploymentId"]}',{'deploymentConfig':config})
    else:deployment=request(token,'POST',f'https://script.googleapis.com/v1/projects/{script}/deployments',config)
    state.update(deploymentId=deployment['deploymentId'],version=version,build=BUILD)
    state['endpoint']='https://script.google.com/macros/s/'+state['deploymentId']+'/exec';persist(state)
    seed(token,state)
    print('DEPLOYED '+state['endpoint'])

if __name__=='__main__':main()
