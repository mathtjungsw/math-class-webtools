"""Check embedded assets and package the portable editable web app."""
import json
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT.parents[1] / 'outputs' / 'car-clock-garage'
FILES = [ROOT / name for name in ['index.html', 'style.css', 'app.js', 'core.js', 'cars.js', 'cloud.js', 'config.js', 'release-years.json', 'README.md', 'PHOTO-LICENSES.md']]
FILES += list((ROOT / 'photos').glob('*'))
html = (OUTPUT / '부릉부릉-차고.html').read_text(encoding='utf-8')
assert not re.search(r'<script[^>]+src=', html)
assert 'href="style.css"' not in html
assert 'src="photos/' not in html
ids = re.findall(r'\bid="([^"]+)"', html)
assert len(ids) == len(set(ids)), 'Duplicate HTML IDs'
references = set(re.findall(r"\$\('([^']+)'\)", (ROOT / 'app.js').read_text(encoding='utf-8')))
assert references.issubset(set(ids)), references - set(ids)
target = OUTPUT / '부릉부릉-차고-웹앱.zip'
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
    for file in FILES:
        archive.write(file, Path('부릉부릉-차고') / file.relative_to(ROOT))
print(f'ZIP: {len(FILES)} files, {target.stat().st_size:,} bytes')
print('Standalone: all images, scripts and styles embedded; HTML IDs and DOM references valid.')
print(f'Photo count: {len(json.loads((ROOT / "photos/sources.json").read_text(encoding="utf-8")))}')
