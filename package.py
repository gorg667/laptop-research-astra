#!/usr/bin/env python3
"""Create a portable website ZIP and a self-contained offline reader."""
import base64
import zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parent
SITE=ROOT/'docs'
OUT=ROOT/'artifacts'
OUT.mkdir(exist_ok=True)
with zipfile.ZipFile(OUT/'laptop-field-guide-website.zip','w',zipfile.ZIP_DEFLATED) as z:
    for p in sorted(SITE.iterdir()):
        if p.is_file():z.write(p,p.name)
page=(SITE/'index.html').read_text()
page=page.replace('<link rel="stylesheet" href="styles.css">','<style>'+(SITE/'styles.css').read_text()+'</style>')
page=page.replace('<script defer src="app.js"></script>','')
icon=base64.b64encode((SITE/'favicon.svg').read_bytes()).decode()
page=page.replace('href="favicon.svg"',f'href="data:image/svg+xml;base64,{icon}"')
md=base64.b64encode((SITE/'laptop-buying-guide.md').read_bytes()).decode()
page=page.replace('href="laptop-buying-guide.md"',f'href="data:text/markdown;charset=utf-8;base64,{md}"')
page=page.replace('</body>','<script>'+(SITE/'app.js').read_text()+'</script></body>')
(OUT/'laptop-field-guide.html').write_text(page)
print('Created',OUT/'laptop-field-guide-website.zip')
print('Created',OUT/'laptop-field-guide.html')
