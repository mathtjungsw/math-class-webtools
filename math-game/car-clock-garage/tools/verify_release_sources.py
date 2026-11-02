"""Record reachable evidence pages for the expansion's release years."""
import concurrent.futures
import json
from pathlib import Path
import re
import urllib.parse
from collect_photos import fetch, clean
from expand_library import DOMESTIC, ROOT

def probe(seed):
    sid,brand,model,series,phrase,year,url=seed
    if sid in ('starex','grand-starex'):url='https://www.hyundai.com/worldwide/ko/footer/corporate/vehicle-history/1990/h-1'
    if sid in ('new-grand-starex','grand-starex-urban'):url='https://www.hyundai.com/content/dam/hyundai/kr/ko/data/wbzn/legacy/hyundai_motor_2018_1-2.pdf'
    try:
        raw=fetch(urllib.parse.quote(url,safe=':/?=&%')).decode('utf-8',errors='replace')
        title=clean((re.findall(r'<title[^>]*>(.*?)</title>',raw,re.S) or [''])[0])
        text=clean(raw)
        contexts=[text[max(0,m.start()-100):m.end()+140] for m in list(re.finditer(str(year),text))[:8]]
        result={'id':sid,'year':year,'source':url,'title':title,'yearFound':bool(contexts),'reviewed':'2026-11-02'}
    except Exception as e:
        result={'id':sid,'year':year,'source':url,'error':str(e)}
    print(sid,':',result.get('title',result.get('error')),'year found:',result.get('yearFound'),flush=True)
    return result

if __name__=='__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        values=list(pool.map(probe,DOMESTIC))
    (ROOT/'tools'/'release-source-evidence.json').write_text(json.dumps(values,ensure_ascii=False,indent=2),encoding='utf-8')
