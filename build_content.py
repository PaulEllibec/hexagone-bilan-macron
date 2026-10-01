from pathlib import Path
from pptx import Presentation
from PIL import Image
import json, html, re

root = Path(__file__).resolve().parent
p = Presentation(root.parent / 'source-interface.pptx')
selected = [7,9,10,11,12,13,14,15,16,17,19,20,21,22,23,24,25,26,27,28,30,31,32,33,34,35,36]
groups = [('Finances publiques', selected[:10]), ('Croissance et emploi', selected[10:20]), ('Le regard des Français', selected[20:])]
def clean(t): return re.sub(r'\s+', ' ', t).strip()
def esc(t): return html.escape(t, quote=True)
sections=[]; options=[]; metadata=[]
for idx,n in enumerate(selected):
    slide=p.slides[n-1]
    texts=[s for s in slide.shapes if s.has_text_frame and s.text.strip()]
    title_shape=next(s for s in texts if s.text.startswith('C’est surtout')) if n==14 else min(texts,key=lambda s:s.top)
    title=clean(title_shape.text)
    subtitle=''
    if n==30:
        title,subtitle=map(clean,title_shape.text.split('\x0b',1))
    group=next(label for label,nums in groups if n in nums)
    im=Image.open(root/'renders'/f'slide-{n}.png')
    # The original title is reproduced as responsive HTML; the entire original
    # slide remains available in the enlargement view.
    cropped=im if n==14 else im.crop((0,round(im.height*.156),im.width,im.height))
    cropped.save(root/'dist'/'slides'/f'graph-{n}.webp',quality=92,method=2)
    paragraphs=[clean(s.text) for s in texts if s != title_shape]
    transcript=''.join(f'<p>{esc(t)}</p>' for t in paragraphs)
    for shape in slide.shapes:
        if shape.has_chart:
            chart=shape.chart
            try:
                cats=[str(c.label) for c in chart.plots[0].categories]
                series=list(chart.series)
                transcript+='<div class="table-scroll"><table><thead><tr><th>Catégorie</th>'+''.join('<th>'+esc(s.name or 'Valeur')+'</th>' for s in series)+'</tr></thead><tbody>'
                for j,cat in enumerate(cats):
                    transcript+='<tr><th>'+esc(cat)+'</th>'+''.join('<td>'+esc(str(s.values[j]).replace('.',','))+'</td>' if j<len(s.values) and s.values[j] is not None else '<td>—</td>' for s in series)+'</tr>'
                transcript+='</tbody></table></div>'
            except (ValueError,AttributeError,IndexError): pass
    chapter=''
    if n in [7,19,30]:
        chapter=f'<div class="chapter-label"><span>0{[7,19,30].index(n)+1}</span>{esc(group)}</div>'
    sections.append(f'''<section class="slide-section" id="slide-{n}" data-index="{idx}" data-group="{esc(group)}">
    {chapter}<div class="section-meta">{idx+1:02d} / 27 <span>Diapositive {n}</span></div>
    <h2>{esc(title)}</h2>{f'<p class="subtitle">{esc(subtitle)}</p>' if subtitle else ''}
    <figure><button class="graphic" type="button" data-slide="{n}" aria-label="Agrandir : {esc(title)}"><img src="slides/graph-{n}.webp" alt="{esc(title)}. Graphique original ; données et textes disponibles ci-dessous." width="2000" height="1013" loading="{'eager' if idx==0 else 'lazy'}"></button><figcaption><button type="button" class="enlarge" data-slide="{n}">Agrandir la diapositive</button></figcaption></figure>
    <details class="transcript"><summary>Textes et données de la diapositive</summary><div>{transcript}</div></details>
    </section>''')
    options.append(f'<option value="slide-{n}">{n}. {esc(title)}</option>')
    metadata.append({'n':n,'title':title,'group':group})
template=(root/'template.html').read_text(encoding='utf-8')
(root/'dist'/'index.html').write_text(template.replace('<!-- SECTIONS -->','\n'.join(sections)).replace('<!-- OPTIONS -->','\n'.join(options)),encoding='utf-8')
(root/'dist'/'data.json').write_text(json.dumps(metadata,ensure_ascii=False),encoding='utf-8')
manifest=root/'.openai'/'hosting.json'
d=json.loads(manifest.read_text(encoding='utf-8')); d['static']={'directory':'dist'}
manifest.write_text(json.dumps(d,indent=2),encoding='utf-8')
print(f'{len(sections)} diapositives, dans l’ordre demandé. Contenu généré.')
