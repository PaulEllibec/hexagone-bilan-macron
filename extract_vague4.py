from pathlib import Path
import json,re,copy,colorsys
from lxml import etree as E
from pptx import Presentation
r=Path(__file__).resolve().parent
p=Presentation(r.parent/'source-interface-vague4.pptx')
helpers=(r/'extract_interactive.py').read_text(encoding='utf-8')
exec(helpers[helpers.index('NS='):helpers.index('headings=')])
old=json.loads((r/'chart-data-audit.json').read_text(encoding='utf-8'))
by={s['n']:s for s in old['slides']}
mapping={7:8,10:9,11:10,16:16,17:18,20:21,23:23,24:24,27:26,28:28}
clean=lambda t:re.sub(r'\s+',' ',t).strip()
countries=set(c for s in old['slides'] for g in s['charts'] if g['countryBars'] for c in g['categories'])
colors={'France':'#ce1126','Zone euro':'#007485','UE hors zone euro':'#c3bdc7','Etats-Unis':'#8e8296'}
result=[]
for key in [7,10,11,16,17,20,23,24,25,27,28]:
 if key==25:
  item=copy.deepcopy(by[key]);item['sourceWave']=3;result.append(item);continue
 n=mapping[key];sl=p.slides[n-1];ts=sorted([s for s in sl.shapes if s.has_text_frame and s.text.strip()],key=lambda s:s.top)
 texts=[clean(s.text) for s in ts];subtitle=next(clean(s.text) for s in ts if s.top/914400>1.5)
 if n==18:subtitle='Taux à 10 ans pour la France, de mai 2017 à octobre 2026'
 chart=next(s.chart for s in sl.shapes if s.has_chart)
 isbar=str(chart.chart_type).startswith('COLUMN')
 unit='en pts de PIB' if n in [8,9,16] else 'Rang' if n==10 else 'Indice (zone euro = 100)' if n==28 else '%'
 if n in [8,9]:subtitle=subtitle.rsplit(', en pts de PIB',1)[0]
 if n==16:subtitle=subtitle.replace(', en pts de PIB','')
 if n==21:subtitle=subtitle.rsplit(', en %',1)[0]
 master=sl.slide_layout.slide_master
 theme_root=next(E.fromstring(rel.target_part.blob) for rel in master.part.rels.values() if rel.reltype.endswith('/theme'))
 theme={E.QName(c).localname:c[0].get('lastClr',c[0].get('val')) for c in theme_root.find('.//a:clrScheme',NS)}
 cmap=master._element.xpath('./p:clrMap')[0].attrib
 series=[]
 if isbar:
  ids=[i for i in range(len(chart.series[0].values)) if any(s.values[i] is not None for s in chart.series)]
  cats=[clean(s.text) for s in sorted(ts,key=lambda s:s.left) if clean(s.text) in countries]
  assert len(cats)==len(ids)==28,(n,cats)
  vals=[];col=[]
  for i in ids:
   matches=[s for s in chart.series if s.values[i] is not None];assert len(matches)==1
   vals.append(matches[0].values[i]*100);col.append(colors[clean(matches[0].name)])
  series=[dict(name=subtitle,values=vals,color='#007485',colors=col,dash=False)]
 else:
  cats=[str(c.label) for c in chart.plots[0].categories]
  for j,se in enumerate(chart.series):
   name='France' if n in [10,18] else clean(se.name)
   existing=next((s for s in by[key]['charts'][0]['series'] if s['name']==name),None)
   c=existing['color'] if existing else {'Belgique':'#974b71'}.get(name,'#007485')
   if n==28:c=color(se._element.find('c:spPr/a:ln',NS),theme,cmap)
   vals=[None if v is None else v*(1 if n in [10,28] else 100) for v in se.values]
   series.append(dict(name=name,values=vals,color=c,colors=[c]*len(vals),dash=n==28 and name=='Zone euro'))
  if n==10:
   series=[dict(series[0],values=[next((s['values'][i] for s in series if s['values'][i] is not None),None) for i in range(len(cats))])]
 g=dict(id=f'chart-{key}-0',slide=key,kind='COLUMN_CLUSTERED' if isbar else 'LINE_MARKERS' if n==10 else 'LINE',title=subtitle,unit=unit,categories=cats,series=series,countryBars=isbar)
 sources=[t for t in texts if 'Source :' in t]
 source=sources[0][sources[0].index('Source :'):] if sources else ''
 notes=[]
 if sources and not sources[0].startswith('Source :'):notes.append(sources[0].split('Source :')[0].strip())
 if n==10:notes=by[key]['notes'][:2]
 if any(c.endswith('e') and c[:4].isdigit() for c in cats):notes.append('e : prévision. Les segments de courbe en pointillés après 2025 correspondent aux prévisions.')
 item=dict(n=key,sourceSlide=n,sourceWave=4,title=texts[0],source=source,charts=[g],notes=notes,texts=texts)
 if n in [18,23]:
  leftCats=by[key]['charts'][1]['categories']
  rightCats=['France','Italie','Belgique','Grèce','Espagne','Portugal','Finlande','Autriche','Pays-Bas','Allemagne'] if n==18 else ['Finlande','Espagne','France','Suède','Grèce','Danemark','Estonie','Lettonie','Luxembourg','Lituanie']
  for j,(cats2,xrange,title) in enumerate([(leftCats,(1.5,1.7) if n==18 else (11.9,12.1),'Taux à 10 ans · mai 2017' if n==18 else 'Les 10 taux de chômage les plus élevés de l’UE · 2017'),(rightCats,(17.8,18) if n==18 else (16.3,16.5),'Taux à 10 ans · 17 novembre 2026' if n==18 else 'Les 10 taux de chômage les plus élevés de l’UE · 2027e')],1):
   vs=[float(clean(s.text).rstrip('%').replace(',','.')) for s in ts if xrange[0]<s.left/914400<xrange[1] and re.fullmatch(r'[\d,]+%',clean(s.text))]
   assert len(vs)==10,(n,vs)
   extra=copy.deepcopy(by[key]['charts'][j]);extra.update(title=title,categories=cats2)
   extra['series']=[dict(name=title,values=vs,color='#007485',colors=['#ce1126' if c=='France' else '#007485' for c in cats2],dash=False)]
   item['charts'].append(extra)
 result.append(item)
rank=next(s for s in result if s['n']==11)
rank['title']="Le déficit public français n’a pas toujours été l'un des pires de la zone euro : on ne s’habitue à ce triste podium que depuis 2016"
rank['notes']=[n for n in rank['notes'] if not n.startswith('Chirac :')]
rank['notes'].append('Lecture : la France avait en 2007 le 2e déficit public le plus élevé (en points de PIB) sur les 21 pays de l’actuelle zone euro.')
result.insert(3,json.loads((r/'slide14-data.json').read_text(encoding='utf-8')))
out={'source':'20261117_Hexagone_TrajectoireEcoFrance_VAGUE4_v00.pptx','slides':result}
(r/'chart-data-vague4.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print(len(result),'sections',sum(len(s['charts']) for s in result),'graphiques')
