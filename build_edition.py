from pathlib import Path
import re,base64,io,json
from PIL import Image
r=Path(__file__).resolve().parent
d=r/'dist'
css=(d/'interactive.css').read_text(encoding='utf-8')
raw=base64.b64decode(re.search(r'background-image:url\(data:image/png;base64,([^)]*)',css)[1])
im=Image.open(io.BytesIO(raw)).convert('RGB');im.thumbnail((1500,900));im.save(d/'couverture.webp',quality=82)
def version(page,offline):
 h=re.search(r'<header class="topbar">.*?</header>',page,re.S)[0]
 title=re.search(r'<span class="edition">(.*?)</span>',h)[1]
 h2=re.sub(r'<span class="edition">.*?</span>','',h)
 nav=re.search(r'<nav class="top-tabs".*?</nav>',h2,re.S)[0]
 h2=h2.replace(nav,'')
 page=page.replace('<main id="content">','<main id="content">'+nav,1)
 page=page.replace(h,h2+'<div class="dossier-cover"><div class="cover-inner"><h1>'+title+'</h1></div></div>',1)
 page=page.replace('<div class="title-frame">','<div class="report-card"><div class="title-frame">').replace('</details></section>','</details></div></section>')
 def keep_articles(match):
  pieces=re.split(r'(<[^>]+>)',match[0])
  for i in range(0,len(pieces),2):
   pieces[i]=re.sub(r'(?i)\b(le|la|les|un|une|des|du|au|aux) +',lambda m:m[1]+'\u00a0',pieces[i])
  return ''.join(pieces)
 page=re.sub(r'<h([123])\b[^>]*>.*?</h\1>|<div class="chapter-introduction">.*?</div>',keep_articles,page,flags=re.S)
 page=page.replace('src="interactive.js"', 'src="interactive.js?v=barres-fix-20261118"')
 page=page.replace('src="flags.js"', 'src="flags.js?v=revenu-reperes"')
 page=page.replace('src="charts-data.js"','src="charts-data.js?v=zone-euro"')
 page=page.replace('href="interactive.css"','href="interactive.css?v=curseur"') if not offline else page
 styles=(d/'edition.css').read_text(encoding='utf-8')
 if offline:styles=styles.replace('couverture.webp','data:image/webp;base64,'+base64.b64encode((d/'couverture.webp').read_bytes()).decode())
 if offline:page=page.replace('</head>','<script>window.HEXAGONE_EXPORT_FONTS='+json.dumps({w:'data:font/ttf;base64,'+base64.b64encode((d/'fonts'/f'barlow-{w}.ttf').read_bytes()).decode() for w in [400,700]})+';</script></head>')
 download=(d/'download.js').read_text(encoding='utf-8-sig')
 page=page.replace('</body>', ('<script>'+download+'</script>' if offline else '<script src="download.js?v=1"></script>')+'</body>')
 effect=(d/'lecture.js').read_text(encoding='utf-8-sig')
 page=page.replace('</body>', ('<script>'+effect+'</script>' if offline else '<script src="lecture.js?v=3"></script>')+'</body>')
 return page.replace('</head>',('<style>'+styles+'</style>' if offline else '<link rel="stylesheet" href="edition.css?v=export-png">')+'</head>',1)
for source,dest,offline in [(d/'index.html',d/'edition.html',False),(r.parent/'Interface_Hexagone.html',r.parent/'Interface_Hexagone_V2.html',True)]:
 dest.write_text(version(source.read_text(encoding='utf-8'),offline),encoding='utf-8')
