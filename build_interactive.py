from pathlib import Path
import json,html
root=Path(__file__).resolve().parent
data=json.loads((root/'chart-data-vague4.json').read_text(encoding='utf-8'))
keep={7,10,11,14,16,17,20,23,24,25,27,28}
data['slides']=[s for s in data['slides'] if s['n'] in keep]
(root/'dist'/'charts-data.js').write_text('window.HEXAGONE_DATA = '+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
for slide in data['slides']:
 if slide['n']==7:
  for chart in slide['charts']: chart['unit']='en pts de PIB'
(root/'dist'/'charts-data.js').write_text('window.HEXAGONE_DATA = '+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
esc=html.escape
def subtitle(g):
 unit=g['unit']
 suffix=unit if unit.lower().startswith(('en ', 'indice')) else 'en '+unit.lower()
 return g['title'] if 'zone euro = 100' in g['title'] else g['title']+', '+suffix
title_emphases=json.loads((root/'title-emphasis.json').read_text(encoding='utf-8'))
def title_html(slide):
 value=esc(slide['title'])
 for phrase in title_emphases.get(str(slide['n']),[]):
  assert phrase in slide['title'],(slide['n'],phrase)
  value=value.replace(esc(phrase),'<span class="title-emphasis">'+esc(phrase)+'</span>',1)
 if slide['n']==17:value=value.replace('préoccupante que ', 'préoccupante que<br>')
 if slide['n']==20:value=value.replace('France ne devrait', 'France<br>ne devrait')
 if slide['n']==24:value=value.replace('crû de 9%', 'crû<br>de 9%')
 if slide['n']==28:value=value.replace('moyenne de la', 'moyenne<br>de la')
 return value
parts=[]; options=[]
for idx,s in enumerate(data['slides']):
 n=s['n'];group='Finances publiques' if n<19 else 'Croissance et emploi'
 chapter=f'<div class="chapter-label"><span>0{1 if n<19 else 2}</span>{group}</div>' if n in [7,20] else ''
 if n==7:chapter='<div class="chapter-introduction">'+esc("Sous Emmanuel Macron, les dépenses publiques n'ont pas été maitrisées. Une situation singulière dans la zone euro.")+'</div>'
 if n==20:chapter='<div class="chapter-introduction">'+esc('Depuis 2017, les performances économiques de la France sont mauvaises, bien plus que nos voisins')+'</div>'
 if n in [7,20]:
  emphasis="les dépenses publiques n'ont pas été maitrisées" if n==7 else 'les performances économiques de la France sont mauvaises'
  chapter=chapter.replace(esc(emphasis),'<mark class="chapter-highlight">'+esc(emphasis)+'</mark>')
 body=''
 if n==30:
  body='<div class="methodology"><p class="subtitle">Résultats déjà publiés en mai 2025, rappelés ici pour compléter les données macro-économiques.</p>'
  for t in s['texts']:body+='<p>'+esc(t)+'</p>'
  body+='</div>'
 else:
  body='<div class="charts-grid">'+''.join(f'<div class="chart-block {"extra-chart" if g.get("extra") else ""}" id="{g["id"]}" data-chart-id="{g["id"]}"><h3>{esc(subtitle(g))}</h3><div class="chart-loading">Chargement du graphique…</div></div>' for g in s['charts'])+'</div>'
  body+='<div class="slide-notes">'+''.join('<p>'+esc(t)+'</p>' for t in s['notes'])+'</div>'
  body+='<p class="chart-source">'+esc(s['source'])+'</p>'
 tables=''
 for g in s['charts']:
  tables+='<h4>'+esc(g['title'])+' · '+esc(g['unit'])+'</h4><div class="table-scroll"><table><thead><tr><th>Pays / catégorie / période</th>'+''.join('<th>'+esc(se['name'])+'</th>' for se in g['series'])+'</tr></thead><tbody>'
  for j,cat in enumerate(g['categories']):
   tables+='<tr><th>'+esc(cat)+'</th>'+''.join('<td>'+('—' if se['values'][j] is None else f'{se["values"][j]:.2f}'.replace('.',','))+'</td>' for se in g['series'])+'</tr>'
  tables+='</tbody></table></div>'
 details=f'<details class="transcript"><summary>Consulter les données</summary>{tables}</details>' if tables else ''
 parts.append(f'<section class="slide-section" id="slide-{n}" data-index="{idx}" data-group="{group}">{chapter}<div class="title-frame"><h2>{title_html(s)}</h2></div>{body}{details}</section>')
 options.append(f'<option value="slide-{n}">{esc(s["title"])}</option>')
t=(root/'template.html').read_text(encoding='utf-8')
t=t.replace('<!-- SECTIONS -->','\n'.join(parts)).replace('<!-- OPTIONS -->','\n'.join(options))
t=t.replace('<link rel="stylesheet" href="style.css">','<link rel="stylesheet" href="style.css"><link rel="stylesheet" href="interactive.css">')
t=t.replace('<script src="app.js"></script>','<script src="plotly.min.js"></script><script src="charts-data.js"></script><script src="app.js"></script><script src="flags.js"></script><script src="interactive.js"></script>')
t=t.replace('Finances publiques, croissance, emploi et opinion des Français.</p>','Finances publiques, croissance, emploi et opinion des Français.</p><p class="interaction-intro">Survolez ou touchez les graphiques pour lire les valeurs. Sélectionnez les séries, ajustez les périodes ou triez les pays.</p>')
t=t.replace('de la zone euro en 2025</h2>', 'de la zone euro <span class="year-underline">en 2025</span></h2>')
t=t.replace('Pour l’année 2026,', '<span class="year-underline">Pour l’année 2026</span>,').replace('déficit pour 2027 sont alarmantes', 'déficit <span class="year-underline">pour 2027</span> sont alarmantes')
t=t.replace('de la zone euro en 2026</h2>', 'de la zone euro <span class="year-underline">en 2026</span></h2>').replace('<h2>En 2027,','<h2><span class="year-underline">En 2027</span>,')
(root/'dist'/'index.html').write_text(t,encoding='utf-8')
print('Interface interactive générée.')
