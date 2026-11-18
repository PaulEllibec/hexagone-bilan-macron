from pathlib import Path
import base64, json, io
from PIL import Image

root=Path(__file__).resolve().parent
dist=root/'dist'
page=(dist/'index.html').read_text(encoding='utf-8')
for css in ['style.css','interactive.css']:
    styles=(dist/css).read_text(encoding='utf-8')
    for f in (dist/'fonts').glob('*.ttf'):
        styles=styles.replace('fonts/'+f.name,'data:font/ttf;base64,'+base64.b64encode(f.read_bytes()).decode())
    page=page.replace('<link rel="stylesheet" href="'+css+'">','<style>'+styles+'</style>')
for name in ['plotly.min.js','charts-data.js','flags.js','interactive.js']:
    contents=(dist/name).read_text(encoding='utf-8').replace('</script','<\\/script')
    page=page.replace('<script src="'+name+'"></script>','<script>'+contents+'</script>')
flagdata={f.stem:'data:image/svg+xml;base64,'+base64.b64encode(f.read_bytes()).decode() for f in (dist/'flags').glob('*.svg')}
page=page.replace('<script>', '<script>window.HEXAGONE_FLAGS='+json.dumps(flagdata)+';</script><script>',1)
icon=base64.b64encode((dist/'favicon.svg').read_bytes()).decode()
page=page.replace('href="favicon.svg"','href="data:image/svg+xml;base64,'+icon+'"')
js=(dist/'app.js').read_text(encoding='utf-8')
page=page.replace('<script src="app.js"></script>','<script>'+js+'</script>')
out=root.parent/'Interface_Hexagone.html'
out.write_text(page,encoding='utf-8')
assert page.count('class="slide-section"')==12
assert 'src="slides/' not in page
print('Version autonome créée :',out.name)
