from pathlib import Path
import base64, json, io
from PIL import Image

root=Path(__file__).resolve().parent
dist=root/'dist'
page=(dist/'index.html').read_text(encoding='utf-8')
page=page.replace('<link rel="stylesheet" href="style.css">','<style>'+(dist/'style.css').read_text(encoding='utf-8')+'</style>')
icon=base64.b64encode((dist/'favicon.svg').read_bytes()).decode()
page=page.replace('href="favicon.svg"','href="data:image/svg+xml;base64,'+icon+'"')
for p in (dist/'slides').glob('graph-*.webp'):
    page=page.replace('src="slides/'+p.name+'"','src="data:image/webp;base64,'+base64.b64encode(p.read_bytes()).decode()+'"')
originals={}
for p in (dist/'slides').glob('slide-*.png'):
    buffer=io.BytesIO();Image.open(p).save(buffer,format='WEBP',quality=92,method=2)
    originals[p.stem.split('-')[1]]='data:image/webp;base64,'+base64.b64encode(buffer.getvalue()).decode()
js=(dist/'app.js').read_text(encoding='utf-8').replace("full.src='slides/slide-'+n+'.png';","full.src=originals[n];")
page=page.replace('<script src="app.js"></script>','<script>const originals='+json.dumps(originals)+';\n'+js+'</script>')
out=root.parent/'Interface_Hexagone.html'
out.write_text(page,encoding='utf-8')
assert page.count('class="slide-section"')==27
assert 'src="slides/' not in page
print('Version autonome créée :',out.name)
