"""Reproducible Commons photo collection; run only when updating bundled assets."""
import concurrent.futures
import html
import io
import json
from pathlib import Path
import re
import time
import urllib.parse
import urllib.request
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
HEADERS = {'User-Agent': 'CarClockGarage/1.0 (classroom static photo collection)'}
SEEDS = [
    ('morning-ja', '기아', '모닝', '3세대 · JA', 'Kia Morning (JA)', '2017 kia morning Front-side.jpg', 2017),
    ('morning-ta', '기아', '모닝', '2세대 · TA', 'Kia Morning (TA)', '20110201 kia morning 001.jpg', None),
    ('avante-ad', '현대', '아반떼', '6세대 · AD', 'Hyundai Avante (AD)', '20151020 Hyundai AVANTE Front-side.png', 2015),
    ('avante-cn7', '현대', '아반떼', '7세대 · CN7', 'Hyundai Avante (CN7)', '20200408 Hyundai AVANTE(7th) Frontside.jpg', 2020),
    ('sonata-lf', '현대', '쏘나타', '7세대 · LF', 'Hyundai Sonata (LF)', 'LF SONATA FRONT-SIDE.png', None),
    ('sonata-dn8', '현대', '쏘나타', '8세대 · DN8', 'Hyundai Sonata (DN8)', None, None),
    ('grandeur-ig', '현대', '그랜저', '6세대 · IG', 'Hyundai Grandeur (IG)', None, 2016),
    ('grandeur-gn7', '현대', '그랜저', '7세대 · GN7', 'Hyundai Grandeur (GN7)', '00 Hyundai Grandeur (GN7).jpg', 2022),
    ('casper', '현대', '캐스퍼', 'AX1', 'Hyundai Casper', None, None),
    ('ray', '기아', '레이', 'TAM', 'Kia Ray', '20111210 kia ray 01.jpg', None),
    ('tucson', '현대', '투싼', '4세대 · NX4', 'Hyundai Tucson (NX4, LWB)', '0 Hyundai Tucson (NX4) 1.jpg', None),
    ('santafe', '현대', '싼타페', '5세대 · MX5', 'Hyundai Santa Fe (MX5)', None, None),
    ('palisade', '현대', '팰리세이드', '1세대 · LX2', 'Hyundai Palisade (LX2)', None, None),
    ('ioniq5', '현대', '아이오닉 5', 'NE', 'Hyundai Ioniq 5', None, None),
    ('ioniq6', '현대', '아이오닉 6', 'CE', 'Hyundai Ioniq 6', None, None),
    ('k3', '기아', 'K3', '2세대 · BD', 'Kia K3 (BD)', None, None),
    ('k5', '기아', 'K5', '3세대 · DL3', 'Kia K5 (DL3)', '20191227 K5 DL3 Front Side.png', None),
    ('k8', '기아', 'K8', 'GL3', 'Kia K8', None, None),
    ('sportage', '기아', '스포티지', '5세대 · NQ5', 'Kia Sportage (NQ5)', None, None),
    ('sorento', '기아', '쏘렌토', '4세대 · MQ4', 'Kia Sorento (MQ4)', None, None),
    ('carnival', '기아', '카니발', '4세대 · KA4', 'Kia Carnival (KA4)', None, None),
    ('ev6', '기아', 'EV6', 'CV', 'Kia EV6', None, None),
    ('g80', '제네시스', 'G80', 'RG3', 'Genesis G80 (RG3)', None, None),
    ('gv80', '제네시스', 'GV80', 'JX1', 'Genesis GV80', None, None),
]
YEAR_SOURCES = {
    'morning-ja': 'https://worldwide.kia.com/ko/brand/our-brand/heritage/vehicles/all-new-morning-3rd-gen',
    'avante-ad': 'https://www.hyundaimotorgroup.com/ko/amp/CONT0000000000001665',
    'avante-cn7': 'https://www.hyundaimotorgroup.com/ko/amp/CONT0000000000001665',
    'grandeur-ig': 'https://www.hyundaimotorgroup.com/ko/amp/CONT0000000000059378',
    'grandeur-gn7': 'https://www.hyundaimotorgroup.com/ko/amp/CONT0000000000059378',
}

def fetch(url):
    for attempt in range(4):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=40).read()
        except Exception:
            if attempt == 3:
                raise
            time.sleep(2 + attempt * 3)

def api(**params):
    return json.loads(fetch('https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'query', 'format': 'json', **params})))

def clean(value):
    return re.sub(r'\s+', ' ', html.unescape(re.sub('<[^>]*>', '', value))).strip()

def rank(page):
    name = page['title'].lower()
    score = 0
    if 'front' in name: score += 50
    if 'side' in name: score += 5
    if name.startswith('file:0 '): score += 16
    if name.startswith('file:00 '): score += 12
    for bad in ['rear', 'back', 'interior', 'engine', 'wheel', 'badge', 'logo', 'china', 'police', 'taxi', 'facelift', 'n line', 'gt-line']:
        if bad in name: score -= 80
    if name.endswith('.svg'): score -= 500
    return score

def collect(seed):
    id_, brand, model, series, category, explicit, year = seed
    cache = ROOT / 'tools' / 'metadata' / (id_ + '.json')
    if cache.exists() and (not explicit or json.loads(cache.read_text(encoding='utf-8'))['title'] == 'File:' + explicit):
        info = json.loads(cache.read_text(encoding='utf-8'))
    else:
        old_image = ROOT / 'photos' / (id_ + '.webp')
        if old_image.exists():
            old_image.unlink()
        args = dict(prop='imageinfo', iiprop='url|extmetadata', iiurlwidth=1200)
        if explicit:
            data = api(titles='File:' + explicit, **args)
        else:
            data = api(generator='categorymembers', gcmtitle='Category:' + category, gcmtype='file', gcmlimit=100, **args)
            if not data.get('query', {}).get('pages'):
                data = api(generator='search', gsrsearch='"' + category.split(' (')[0] + '" front -rear -interior', gsrnamespace=6, gsrlimit=10, **args)
        pages = sorted(data.get('query', {}).get('pages', {}).values(), key=rank, reverse=True)
        pages = [p for p in pages if 'imageinfo' in p and p['imageinfo'][0].get('extmetadata', {}).get('LicenseShortName', {}).get('value', '').startswith(('CC BY', 'CC0', 'Public domain'))]
        if not pages:
            raise RuntimeError('No licensed category photo: ' + id_)
        info = pages[0]
        cache.parent.mkdir(parents=True, exist_ok=True)
        cache.write_text(json.dumps(info, ensure_ascii=False, indent=2), encoding='utf-8')
    ii = info['imageinfo'][0]
    meta = ii['extmetadata']
    image_path = ROOT / 'photos' / (id_ + '.webp')
    if not image_path.exists():
        raw = fetch(ii.get('thumburl', ii['url']))
        image = Image.open(io.BytesIO(raw)).convert('RGB')
        image.thumbnail((1200, 900), Image.Resampling.LANCZOS)
        image_path.parent.mkdir(exist_ok=True)
        image.save(image_path, 'WEBP', quality=85, method=6)
    result = dict(id=id_, brand=brand, model=model, series=series, year=year, yearSource=YEAR_SOURCES.get(id_), image='photos/' + id_ + '.webp',
                  title=info['title'].removeprefix('File:'), source=ii['descriptionurl'], author=clean(meta.get('Artist', {}).get('value', '')), license=clean(meta['LicenseShortName']['value']),
                  licenseUrl=meta.get('LicenseUrl', {}).get('value', ''), description=clean(meta.get('ImageDescription', {}).get('value', '')), category=category,
                  changes='크기 축소 및 WebP 변환. 원본 구도 유지.', collected='2026-11-01')
    print(id_, info['title'], result['license'], flush=True)
    return result

if __name__ == '__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        cars = list(pool.map(collect, SEEDS))
    (ROOT / 'cars.js').write_text('/* Bundled Commons photographs; see 사진 출처 in the app. */\nwindow.GARAGE_CARS = ' + json.dumps(cars, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
    (ROOT / 'photos' / 'sources.json').write_text(json.dumps(cars, ensure_ascii=False, indent=2), encoding='utf-8')
    font = ImageFont.truetype('C:/Windows/Fonts/malgun.ttf', 17)
    sheet = Image.new('RGB', (1200, 210 * ((len(cars)+3)//4)), 'white')
    draw = ImageDraw.Draw(sheet)
    for index, car in enumerate(cars):
        x, y = (index % 4)*300, (index // 4)*210
        pic = ImageOps.contain(Image.open(ROOT / car['image']), (294, 164))
        sheet.paste(pic, (x+(300-pic.width)//2, y+(164-pic.height)//2))
        draw.text((x+8, y+168), car['brand']+' '+car['model']+' '+car['series'], font=font, fill='#172b45')
    sheet.save(ROOT / 'tools' / 'photo-review.jpg')
