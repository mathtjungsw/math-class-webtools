"""Build a single offline HTML, including all photo credits and progress features."""
import base64
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT.parents[1] / 'outputs' / 'car-clock-garage' / '부릉부릉-차고.html'

def build(output):
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    cars = json.loads((ROOT / 'photos' / 'sources.json').read_text(encoding='utf-8'))
    photos = {}
    for car in cars:
        file = car['image']
        uri = 'data:image/webp;base64,' + base64.b64encode((ROOT / file).read_bytes()).decode('ascii')
        photos[file] = uri
        car['image'] = uri
    for file, uri in photos.items():
        html = html.replace('src="' + file + '"', 'src="' + uri + '"')
    html = re.sub(r'<link rel="stylesheet" href="style\.css(?:\?[^\"]*)?">', lambda _: '<style>\n' + (ROOT / 'style.css').read_text(encoding='utf-8') + '\n</style>', html)
    html=re.sub(r'<script defer src="config\.js(?:\?[^\"]*)?"></script>','',html)
    html=html.replace('</body>','<script>window.GARAGE_CONFIG={cloud:false,build:"offline"};</script>\n</body>')
    for file in ['cars.js', 'core.js', 'cloud.js', 'app.js']:
        js = 'window.GARAGE_CARS = ' + json.dumps(cars, ensure_ascii=False) + ';' if file == 'cars.js' else (ROOT / file).read_text(encoding='utf-8')
        # Inlining retains parser-deferred execution after the body has been parsed.
        html = re.sub(r'<script defer src="' + re.escape(file) + r'(?:\?[^\"]*)?"></script>', '', html)
        html = html.replace('</body>', '<script>\n' + js.replace('</script', '<\\/script') + '\n</script>\n</body>')
    html = html.replace('<a href="../../index.html">웹툴 모음 ↗</a>', '')
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(html, encoding='utf-8')
    print(str(output))
    print(f'{len(cars)} embedded photos, {output.stat().st_size:,} bytes; no external runtime dependencies.')

if __name__ == '__main__':
    build(Path(sys.argv[1]).resolve() if len(sys.argv)>1 else DEFAULT_OUTPUT)
