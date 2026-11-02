"""Expand the licensed vehicle library. This is an authoring-only network tool."""
import concurrent.futures
import html
import io
import json
from pathlib import Path
import re
import time
import urllib.parse
from PIL import Image, ImageDraw, ImageFont, ImageOps
from collect_photos import api, fetch, clean, rank

ROOT=Path(__file__).resolve().parents[1]
H='https://www.hyundai.com/kr/ko/brand/brandstory/model/'
K='https://worldwide.kia.com/ko/brand/our-brand/heritage/vehicles/'
W='https://en.wikipedia.org/wiki/'
# id, brand, quiz label, series, Commons category/search phrase, release year, evidence URL
DOMESTIC=[
('k7-vg','기아','K7','1세대 · VG','Kia Cadenza (VG)',2009,K+'k7'),
('k7-yg','기아','K7','2세대 · YG','Kia Cadenza (YG)',2016,K+'all-new-k7'),
('equus-lz','현대','에쿠스','1세대 · LZ','Hyundai Equus (LZ)',1999,H+'equus-history'),
('equus-vi','현대','에쿠스','2세대 · VI','Hyundai Equus (VI)',2009,H+'equus-history'),
('equus-limo','현대','에쿠스 리무진','에쿠스 L · VI','Hyundai Equus limousine',2009,H+'equus-history'),
('starex','현대','스타렉스','1세대 · A1','Hyundai Starex (A1)',1997,H+'starex-history'),
('grand-starex','현대','그랜드 스타렉스','2세대 · TQ','Hyundai Starex (TQ)',2007,H+'starex-history'),
('new-grand-starex','현대','더 뉴 그랜드 스타렉스','부분변경 · TQ','Hyundai Grand Starex facelift',2017,H+'starex-history'),
('grand-starex-urban','현대','그랜드 스타렉스 어반','어반 · TQ','Hyundai Grand Starex Urban',2017,H+'starex-history'),
('staria','현대','스타리아','US4','Hyundai Staria',2021,H+'staria-history'),
('staria-kinder','현대','스타리아 킨더','어린이 통학차량','Hyundai Staria Kinder',2021,H+'staria-history/2021-staria-kinder'),
('staria-limo','현대','스타리아 라운지 리무진','US4 리무진','Hyundai Staria limousine',2022,H+'staria-history'),
('veloster-fs','현대','벨로스터','1세대 · FS','Hyundai Veloster (FS)',2011,H+'veloster-history'),
('veloster-js','현대','벨로스터','2세대 · JS','Hyundai Veloster (JS)',2018,H+'veloster-history'),
('veloster-n','현대','벨로스터 N','고성능 N · JS','Hyundai Veloster N',2018,H+'veloster-history'),
('aslan','현대','아슬란','AG','Hyundai Aslan',2014,H+'aslan-history'),
('xcient','현대','엑시언트','대형 트럭 · QZ','Hyundai Xcient',2013,W+'Hyundai_Xcient'),
('malibu-v300','쉐보레','말리부','8세대 · V300','Chevrolet Malibu (8th generation)',2011,'https://ko.wikipedia.org/wiki/쉐보레_말리부'),
('malibu-v400','쉐보레','말리부','9세대 · V400','Chevrolet Malibu (9th generation)',2016,'https://ko.wikipedia.org/wiki/쉐보레_말리부'),
('sm6','르노삼성','SM6','초기형 · 프라임 포함','Renault Samsung SM6',2016,'https://ko.wikipedia.org/wiki/르노코리아_SM6'),
('spark','쉐보레','스파크','2세대 · M400','Chevrolet Spark (M400)',2015,'https://ko.wikipedia.org/wiki/쉐보레_스파크'),
('matiz','대우','마티즈','1세대 · M100','Daewoo Matiz (M100)',1998,W+'Daewoo_Matiz'),
('lanos','대우','라노스','T100','Daewoo Lanos',1996,W+'Daewoo_Lanos'),
('leganza','대우','레간자','V100','Daewoo Leganza',1997,W+'Daewoo_Leganza'),
('nubira','대우','누비라','1세대 · J100','Daewoo Nubira (J100)',1997,W+'Daewoo_Nubira'),
('tosca','대우','토스카','V250','Daewoo Tosca',2006,W+'Daewoo_Tosca'),
('lacetti','대우','라세티','J200','Daewoo Lacetti sedan',2002,W+'Daewoo_Lacetti'),
('optima','기아','옵티마','MS','Kia Optima (MS)',2000,K+'optima'),
('lotze','기아','로체','MG','Kia Lotze',2005,W+'Kia_Optima'),
('opirus','기아','오피러스','GH','Kia Opirus',2003,K+'opirus'),
('potentia','기아','포텐샤','V6 고급 세단','Kia Potentia',1992,K+'potentia'),
('credos','기아','크레도스','중형 세단','Kia Credos',1995,K+'credos'),
('forte','기아','포르테','TD','Kia Forte (TD)',2008,K+'forte'),
('retona','기아','레토나','CE','Kia Retona',1998,K+'retona'),
('carens','기아','카렌스','1세대 · RS','Kia Carens (RS)',1999,K+'carens'),
('soul','기아','쏘울','1세대 · AM','Kia Soul (AM)',2008,K+'soul'),
('niro','기아','니로','1세대 · DE','Kia Niro (DE)',2016,K+'niro'),
('mohave','기아','모하비','HM','Kia Mohave',2008,K+'mohave'),
('besta','기아','베스타','승합차','Kia Besta',1986,K+'besta'),
('dynasty','현대','다이너스티','LX','Hyundai Dynasty',1996,H+'dynasty-history'),
('terracan','현대','테라칸','HP','Hyundai Terracan',2001,H+'terracan-history'),
('veracruz','현대','베라크루즈','EN','Hyundai Veracruz',2006,H+'veracruz-history'),
('tuscani','현대','투스카니','GK','Hyundai Coupe (GK)',2001,H+'tuscani-history'),
('tiburon','현대','티뷰론','RD','Hyundai Coupe (RD)',1996,H+'tiburon-history'),
('lavita','현대','라비타','FC','Hyundai Matrix',2001,H+'lavita-history'),
('libero','현대','리베로','SR','Hyundai Libero',2000,H+'libero-history'),
('porter2','현대','포터 II','소형 트럭 · HR','Hyundai Porter (HR)',2004,H+'porter-history'),
('mighty','현대','마이티','2세대 · QT','Hyundai Mighty II',1998,W+'Hyundai_Mighty_II'),
('county','현대','카운티','CN','Hyundai County',1998,W+'Hyundai_County'),
('universe','현대','유니버스','고속·관광버스','Hyundai Universe',2006,W+'Hyundai_Universe'),
('galloper','현대','갤로퍼','1세대','Hyundai Galloper',1991,W+'Hyundai_Galloper'),
('pony','현대','포니','1세대','Hyundai Pony (1975)',1975,H+'pony-history'),
('stellar','현대','스텔라','Y','Hyundai Stellar',1983,H+'stellar-history'),
('excel','현대','엑셀','X2','Hyundai Excel (X2)',1989,H+'excel-history'),
('ssangyong-musso','쌍용','무쏘','FJ','SsangYong Musso (FJ)',1993,W+'SsangYong_Musso'),
('ssangyong-korando','쌍용','뉴 코란도','KJ','SsangYong Korando (KJ)',1996,W+'SsangYong_Korando'),
('ssangyong-chairman','쌍용','체어맨','H','SsangYong Chairman H',1997,W+'SsangYong_Chairman'),
('ssangyong-rexton','쌍용','렉스턴','Y200','SsangYong Rexton (Y200)',2001,W+'SsangYong_Rexton'),
('ssangyong-tivoli','쌍용','티볼리','X100','SsangYong Tivoli',2015,W+'SsangYong_Tivoli'),
('sm5','르노삼성','SM5','1세대 · KPQ','Samsung SM5 (KPQ)',1998,W+'Renault_Samsung_SM5'),
('sm3','르노삼성','SM3','1세대 · N17','Renault Samsung SM3 (N17)',2002,W+'Renault_Samsung_SM3'),
('sm7','르노삼성','SM7','1세대 · EX2','Renault Samsung SM7 (EX2)',2004,W+'Renault_Samsung_SM7'),
('qm5','르노삼성','QM5','H45','Renault Samsung QM5',2007,W+'Renault_Samsung_QM5'),
('g90-limo','제네시스','G90 리무진','HI 리무진','Genesis G90 limousine',2019,'https://www.genesis.com/kr/ko/support/pr-center.html'),
('carnival-limo','기아','카니발 하이리무진','4세대 · KA4','Kia Carnival (KA4) high limousine',2020,W+'Kia_Carnival'),
]
# Japan-only kei vehicles. Release year is intentionally not asked.
JAPAN=[
('honda-nbox','혼다','N-BOX','Honda N-Box'),('honda-none','혼다','N-ONE','Honda N-One'),('honda-nwgn','혼다','N-WGN','Honda N-WGN'),('honda-nvan','혼다','N-VAN','Honda N-Van'),
('honda-s660','혼다','S660','Honda S660'),('honda-beat','혼다','비트','Honda Beat'),('honda-life','혼다','라이프','Honda Life'),('honda-zest','혼다','제스트','Honda Zest'),('honda-today','혼다','투데이','Honda Today'),('honda-vamos','혼다','바모스','Honda Vamos'),('honda-acty','혼다','액티','Honda Acty'),
('suzuki-alto','스즈키','알토','Suzuki Alto'),('suzuki-wagonr','스즈키','왜건 R','Suzuki Wagon R'),('suzuki-hustler','스즈키','허슬러','Suzuki Hustler'),('suzuki-jimny','스즈키','짐니','Suzuki Jimny (JB64)'),('suzuki-spacia','스즈키','스페이시아','Suzuki Spacia'),('suzuki-lapin','스즈키','라팡','Suzuki Alto Lapin'),('suzuki-every','스즈키','에브리','Suzuki Every'),('suzuki-carry','스즈키','캐리','Suzuki Carry'),('suzuki-cappuccino','스즈키','카푸치노','Suzuki Cappuccino'),('suzuki-mr-wagon','스즈키','MR 왜건','Suzuki MR Wagon'),('suzuki-cervo','스즈키','세르보','Suzuki Cervo'),('suzuki-palette','스즈키','팔레트','Suzuki Palette'),('suzuki-kei','스즈키','케이','Suzuki Kei'),('suzuki-twin','스즈키','트윈','Suzuki Twin'),
('daihatsu-tanto','다이하츠','탄토','Daihatsu Tanto'),('daihatsu-move','다이하츠','무브','Daihatsu Move'),('daihatsu-copen','다이하츠','코펜','Daihatsu Copen'),('daihatsu-mira','다이하츠','미라','Daihatsu Mira L700'),('daihatsu-mira-cocoa','다이하츠','미라 코코아','Daihatsu Mira Cocoa'),('daihatsu-mira-tocot','다이하츠','미라 토코트','Daihatsu Mira Tocot'),('daihatsu-cast','다이하츠','캐스트','Daihatsu Cast'),('daihatsu-taft','다이하츠','태프트','Daihatsu Taft (LA900)'),('daihatsu-wake','다이하츠','웨이크','Daihatsu Wake'),('daihatsu-hijet','다이하츠','하이젯','Daihatsu Hijet'),('daihatsu-atrai','다이하츠','아트레이','Daihatsu Atrai'),('daihatsu-sonica','다이하츠','소니카','Daihatsu Sonica'),('daihatsu-esse','다이하츠','에쎄','Daihatsu Esse'),('daihatsu-naked','다이하츠','네이키드','Daihatsu Naked'),('daihatsu-opt i','다이하츠','옵티','Daihatsu Opti'),
('nissan-dayz','닛산','데이즈','Nissan Dayz'),('nissan-roox','닛산','룩스','Nissan Roox'),('nissan-moco','닛산','모코','Nissan Moco'),('nissan-clipper','닛산','클리퍼','Nissan Clipper'),('mitsubishi-ek','미쓰비시','eK 왜건','Mitsubishi eK Wagon'),('mitsubishi-i','미쓰비시','아이','Mitsubishi i'),('mitsubishi-pajero-mini','미쓰비시','파제로 미니','Mitsubishi Pajero Mini'),('mitsubishi-minica','미쓰비시','미니카','Mitsubishi Minica'),('mitsubishi-toppo','미쓰비시','토포','Mitsubishi Toppo'),('mitsubishi-minicab','미쓰비시','미니캡','Mitsubishi Minicab'),('subaru-r1','스바루','R1','Subaru R1'),('subaru-r2','스바루','R2','Subaru R2'),('subaru-pleo','스바루','플레오','Subaru Pleo'),('subaru-stella','스바루','스텔라','Subaru Stella'),('subaru-vivio','스바루','비비오','Subaru Vivio'),('subaru-sambar','스바루','삼바','Subaru Sambar'),('mazda-carol','마쓰다','캐롤','Mazda Carol'),('mazda-flair','마쓰다','플레어','Mazda Flair'),('mazda-az1','마쓰다','AZ-1','Autozam AZ-1')
]

SOURCE_OVERRIDES={
 'starex':'https://www.hyundai.com/worldwide/ko/footer/corporate/vehicle-history/1990/h-1',
 'grand-starex':'https://www.hyundai.com/worldwide/ko/footer/corporate/vehicle-history/1990/h-1',
 'new-grand-starex':'https://www.hyundai.com/content/dam/hyundai/kr/ko/data/wbzn/legacy/hyundai_motor_2018_1-2.pdf',
 'grand-starex-urban':'https://www.hyundai.com/content/dam/hyundai/kr/ko/data/wbzn/legacy/hyundai_motor_2018_1-2.pdf',
 'aslan':'https://www.hyundai.com/kr/ko/brand/brandstory/heritage/2010-aslan',
 'dynasty':'https://www.hyundai.com/kr/ko/brand/brandstory/heritage/1990-dynasty-lx',
 'terracan':'https://www.hyundai.com/kr/ko/brand/brandstory/heritage/2000-terracan-hp',
 'veracruz':'https://www.hyundai.com/kr/ko/brand/brandstory/heritage/2000-veracruz-en',
 'tuscani':'https://www.hyundai.com/kr/ko/brand/brandstory/heritage/2000-tuscani-gk',
 'lavita':'https://www.hyundai.com/kr/ko/brand/brandstory/heritage/2000-lavita-fc',
 'libero':'https://www.hyundai.com/kr/ko/brand/brandstory/heritage/2000-libero-sr',
 'excel':'https://www.hyundai.com/kr/ko/brand/brandstory/heritage/1980-excel-x2',
 'mighty':'https://www.edaily.co.kr/News/Read?mediaCodeNo=257&newsId=03827766609302336',
 'g90-limo':'https://www.genesis.com/kr/ko/support/pr-center/detail.html?seq=0000000232'
}
DOMESTIC=[(*row[:6],SOURCE_OVERRIDES.get(row[0],row[6])) for row in DOMESTIC]

# Exclude assets that a contact-sheet review found to be a different trim, a
# component, or too ambiguous to quiz. Keep the original Commons metadata in
# tools/metadata so the decision can be reversed without another network fetch.
PHOTO_EXCLUSIONS={
 'equus-limo':'사진은 일반 에쿠스 세단이며 리무진 차체가 아님',
 'county':'두 사진 모두 카운티 차종을 식별할 수 없음',
 'county-view2':'두 사진 모두 카운티 차종을 식별할 수 없음',
 'libero-view2':'리베로가 아닌 견인 현장 사진',
 'suzuki-wagonr':'자동차가 아닌 조향 부품 사진',
 'suzuki-cappuccino-view2':'자동차가 아닌 안내 표지 사진',
 'daihatsu-hijet-view2':'하이젯 자동차가 아닌 감속기 부품 사진',
 'subaru-sambar':'삼바 자동차를 식별할 수 없는 엔진 부품 사진',
 'subaru-sambar-view2':'삼바 차종을 식별하기 어려운 푸드트럭 사진',
 'mazda-flair':'마쓰다 플레어가 아닌 인도네시아형 스즈키 리본 사진',
 'mazda-flair-view2':'마쓰다 플레어가 아닌 인도네시아형 스즈키 리본 사진',
 'nissan-clipper-view2':'서로 다른 차종이 함께 보여 정답을 판별하기 어려움',
}

def licensed(p):
    if 'imageinfo' not in p:return False
    i=p['imageinfo'][0];m=i.get('extmetadata',{})
    lic=m.get('LicenseShortName',{}).get('value','')
    return lic.startswith(('CC BY','CC0','Public domain')) and i.get('width',1000)>=500 and not p['title'].lower().endswith(('.svg','.gif','.pdf','.webm','.ogg'))

def selection_rank(page,phrase):
    tokens=re.sub(r'\(.*?\)','',phrase).lower().split()
    tokens=[t for t in tokens if t not in {'hyundai','kia','daewoo','chevrolet','renault','samsung','genesis','ssangyong','honda','suzuki','daihatsu','nissan','mitsubishi','subaru','mazda','autozam','sedan','limousine','facelift','high'}]
    normalized=re.sub(r'[^a-z0-9]','',page['title'].lower())
    named=any(re.sub(r'[^a-z0-9]','',t) in normalized for t in tokens)
    return rank(page)+(80 if named else -100)

def get_pages(phrase,seed_id):
    cache=ROOT/'tools'/'search-cache'/(seed_id+'.json')
    if cache.exists():return json.loads(cache.read_text(encoding='utf-8'))
    time.sleep(.6)
    args=dict(prop='imageinfo',iiprop='url|extmetadata|size',iiurlwidth=960)
    # Read names first; requesting thumbnails/metadata for entire categories is expensive.
    d=api(list='categorymembers',cmtitle='Category:'+phrase,cmtype='file',cmlimit=30)
    candidates=d.get('query',{}).get('categorymembers',[])
    if len(candidates)<2:
        query='"'+phrase+'" -interior -engine -wheel -logo'
        d=api(list='search',srsearch=query,srnamespace=6,srlimit=20)
        candidates+=d.get('query',{}).get('search',[])
    names=[p['title'] for p in sorted(candidates,key=rank,reverse=True)[:5]]
    pages=[]
    if names:
        d=api(titles='|'.join(names),**args)
        pages=list(d.get('query',{}).get('pages',{}).values())
    unique={p['title']:p for p in pages if licensed(p)}
    pages=sorted(unique.values(),key=rank,reverse=True)
    cache.parent.mkdir(parents=True,exist_ok=True)
    cache.write_text(json.dumps(pages,ensure_ascii=False,indent=2),encoding='utf-8')
    return pages

def collect(seed):
    sid,brand,model,series,phrase,year,yearsource,japan=seed
    sid=sid.replace(' ','')
    try:
        pages=sorted(get_pages(phrase,sid),key=lambda p:selection_rank(p,phrase),reverse=True)
        # Interior/engine-only and shots of unrelated logos are unsuitable questions.
        pages=[p for p in pages if not any(b in p['title'].lower() for b in ['interior','engine','wheel','dashboard','logo','badge','crash','wreck','diagram'])]
        if not pages: return {'id':sid,'error':'No licensed identifiable candidate','phrase':phrase}
        result=[]
        for index,page in enumerate(pages[:2]):
            rid=sid if index==0 else sid+'-view2'
            if rid in PHOTO_EXCLUSIONS: continue
            ii=page['imageinfo'][0];m=ii['extmetadata'];file=ROOT/'photos'/(rid+'.webp')
            metadata_path=ROOT/'tools'/'metadata'/(rid+'.json')
            same=metadata_path.exists() and json.loads(metadata_path.read_text(encoding='utf-8')).get('title')==page['title']
            valid_file=False
            if file.exists():
                try:
                    with Image.open(file) as existing_image: existing_image.verify()
                    valid_file=True
                except Exception:
                    valid_file=False
            if not valid_file or not same:
                # Wikimedia asks clients to use standard cached thumbnail sizes.
                original=urllib.parse.urlsplit(ii['url']).path
                suffix=original.split('/wikipedia/commons/',1)[1]
                name=suffix.rsplit('/',1)[-1]
                thumb='https://upload.wikimedia.org/wikipedia/commons/thumb/'+suffix+'/960px-'+name
                data=fetch(thumb)
                pic=Image.open(io.BytesIO(data)).convert('RGB')
                pic.thumbnail((1000,750),Image.Resampling.LANCZOS)
                pic.save(file,'WEBP',quality=82,method=6)
            metadata_path.write_text(json.dumps(page,ensure_ascii=False,indent=2),encoding='utf-8')
            result.append(dict(id=rid,brand=brand,model=model,series=series,year=year,yearSource=yearsource,requiresYear=not japan,region='japan-kei' if japan else 'korea',image='photos/'+rid+'.webp',title=page['title'].removeprefix('File:'),source=ii['descriptionurl'],author=clean(m.get('Artist',{}).get('value','')),license=clean(m['LicenseShortName']['value']),licenseUrl=m.get('LicenseUrl',{}).get('value',''),description=clean(m.get('ImageDescription',{}).get('value','')),category=phrase,changes='크기 축소 및 WebP 변환. 원본 구도 유지.',collected='2026-11-02'))
        print(sid,':',','.join(c['title'] for c in result),flush=True)
        return result
    except Exception as e:
        print('ERROR',sid,str(e),getattr(e,'url',''),flush=True)
        return {'id':sid,'error':str(e),'phrase':phrase}

def sheets(cars):
    font=ImageFont.truetype('C:/Windows/Fonts/malgun.ttf',15)
    out=ROOT/'tools'/'review';out.mkdir(exist_ok=True)
    for old in out.glob('library-*.jpg'): old.unlink()
    for page in range((len(cars)+39)//40):
        group=cars[page*40:(page+1)*40]
        sheet=Image.new('RGB',(1200,190*((len(group)+4)//5)),'white');d=ImageDraw.Draw(sheet)
        for i,car in enumerate(group):
            x=(i%5)*240;y=(i//5)*190
            im=ImageOps.contain(Image.open(ROOT/car['image']),(234,140));sheet.paste(im,(x+(240-im.width)//2,y+(140-im.height)//2))
            d.text((x+5,y+144),car['id'],font=font,fill='black')
            d.text((x+5,y+163),car['brand']+' '+car['model'],font=font,fill='#244637')
        sheet.save(out/f'library-{page+1:02}.jpg')

if __name__=='__main__':
    existing=json.loads((ROOT/'photos'/'sources.json').read_text(encoding='utf-8'))
    existing=[c for c in existing if c['id'] in {s[0] for s in __import__('collect_photos').SEEDS}]
    for c in existing:c['requiresYear']=True;c['region']='korea'
    seeds=[(*row,False) for row in DOMESTIC]+[(i,b,m,'일본 경차',p,None,None,True) for i,b,m,p in JAPAN]
    (ROOT/'tools'/'expanded-manifest.json').write_text(json.dumps(seeds,ensure_ascii=False,indent=2),encoding='utf-8')
    results=[];errors=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        for value in pool.map(collect,seeds):
            if isinstance(value,list):results.extend(value)
            else:errors.append(value)
    cars=existing+results
    excluded=[{'id':photo_id,'reason':reason} for photo_id,reason in PHOTO_EXCLUSIONS.items()]
    cars=[c for c in cars if c['id'] not in PHOTO_EXCLUSIONS]
    (ROOT/'tools'/'photo-review-exclusions.json').write_text(json.dumps(excluded,ensure_ascii=False,indent=2),encoding='utf-8')
    (ROOT/'cars.js').write_text('/* Licensed local photographs; credits are inside the app. */\nwindow.GARAGE_CARS = '+json.dumps(cars,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
    (ROOT/'photos'/'sources.json').write_text(json.dumps(cars,ensure_ascii=False,indent=2),encoding='utf-8')
    used={Path(c['image']).name for c in cars}
    for image in (ROOT/'photos').glob('*.webp'):
        if image.name not in used: image.unlink()
    years=json.loads((ROOT/'release-years.json').read_text(encoding='utf-8'));years['verified']='2026-11-02'
    years['models']={c['id']:{'year':c['year'],'source':c['yearSource']} for c in cars if c['requiresYear']}
    (ROOT/'release-years.json').write_text(json.dumps(years,ensure_ascii=False,indent=2),encoding='utf-8')
    (ROOT/'tools'/'collection-errors.json').write_text(json.dumps(errors,ensure_ascii=False,indent=2),encoding='utf-8')
    sheets(cars)
    print('TOTAL',len(cars),'unique quiz labels',len(set(c['model'] for c in cars)),'errors',len(errors),flush=True)
