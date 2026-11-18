"""Extract cached chart values and colors; original slide numbers stay stable."""
from pathlib import Path
from pptx import Presentation
from lxml import etree as E
import json, re, colorsys

ROOT=Path(__file__).resolve().parent
p=Presentation(ROOT.parent/'source-interface.pptx')
NS={'a':'http://schemas.openxmlformats.org/drawingml/2006/main','c':'http://schemas.openxmlformats.org/drawingml/2006/chart'}
selected=[7,9,10,11,12,13,14,15,16,17,19,20,21,22,23,24,25,26,27,28,30,31,32,33,34,35,36]
def clean(t):return re.sub(r'\s+',' ',t).strip().replace('Fin lande','Finlande')
def color(el,theme,cmap,fallback='#007485'):
    if el is None:return fallback
    fill=el.find('a:solidFill',NS)
    if fill is None:fill=el.find('a:pattFill/a:fgClr',NS)
    if fill is None or len(fill)==0:return fallback
    c=fill[0]; kind=E.QName(c).localname
    val=theme.get(cmap.get(c.get('val'),c.get('val')),'007485') if kind=='schemeClr' else c.get('val','007485')
    if kind=='sysClr':val=c.get('lastClr','007485')
    rgb=[int(val[i:i+2],16)/255 for i in (0,2,4)]
    h,l,s=colorsys.rgb_to_hls(*rgb)
    for op in c:
        k=E.QName(op).localname;v=int(op.get('val','100000'))/100000
        if k=='lumMod':l*=v
        elif k=='lumOff':l+=v
        elif k=='tint':l=l+(1-l)*v
        elif k=='shade':l*=v
    return '#'+''.join(f'{round(v*255):02x}' for v in colorsys.hls_to_rgb(h,min(1,max(0,l)),s))

headings={7:['Solde des administrations publiques en 2025'],9:['Solde des administrations publiques prévu en 2026'],10:['Solde des administrations publiques prévu en 2027'],11:['Rang du déficit public français parmi les 21 pays de l’actuelle zone euro'],12:['Ratio d’endettement de la France'],13:['Solde des administrations publiques','Ratio d’endettement'],14:['Évolution du ratio d’endettement, base 100 en 2020'],15:['Évolution du ratio d’endettement, 2017–2025'],16:['Évolution du ratio d’endettement, 2017–2027e'],17:['Taux à 10 ans pour la France, de mai 2017 à mai 2026'],19:['Taux de croissance annuel moyen du PIB, 2017–2025'],20:['Taux de croissance annuel moyen du PIB, 2017–2027e'],21:['Taux de croissance annuel moyen du PIB, par quinquennat'],22:['PIB par habitant en parité de pouvoir d’achat'],23:['Évolution du taux de chômage, 2017–2027e'],24:['Évolution du nombre de personnes en emploi, 2017–2027e'],25:['Répartition des 2,4 millions d’emplois supplémentaires créés entre 2017 et 2024'],26:['Évolution totale du PIB produit par heure travaillée, 2017–2025'],27:['Évolution totale du PIB produit par heure travaillée, 2017–2027e'],28:['Salaire net moyen en équivalent temps plein dans le secteur privé'],31:["Vous personnellement, comment jugez-vous l'action économique d'Emmanuel Macron depuis son élection en 2017 ?"],32:['L’action économique d’Emmanuel Macron est-elle meilleure, moins bonne, ni meilleure ni moins bonne que celle de ses prédécesseurs ?'],33:['Comment jugez-vous la trajectoire économique de la France depuis 2017 concernant… ?'],34:['La tendance économique de la France est-elle meilleure, moins bonne ou ni meilleure ni moins bonne par rapport à… ?'],35:["Dans la liste suivante, quel est l’indicateur économique qui vous préoccupe le plus ?"],36:['Personnellement, pensez-vous que la France peut faire faillite ?']}
blank_labels={15:['Allemagne','Espagne','Suède','Slovénie','Pays-Bas','Danemark','Croatie','Irlande','Grèce','Portugal','Chypre'],16:['Espagne','Suède','Pays-Bas','Slovénie','Danemark','Croatie','Irlande','Portugal','Grèce','Chypre'],24:['Roumanie'],26:['Finlande','France','Italie','Luxembourg'],27:['Italie','Luxembourg']}
all_slides=[]
for n in selected:
    sl=p.slides[n-1];textsh=[s for s in sl.shapes if s.has_text_frame and s.text.strip()]
    title_shape=next(s for s in textsh if s.text.startswith('C’est surtout')) if n==14 else min(textsh,key=lambda s:s.top)
    title=clean(title_shape.text)
    if n==30:title='Méthodologie du sondage'
    source=next((clean(s.text) for s in textsh if s.text.startswith('Source') or s.text.startswith('Sondage')), '')
    master=sl.slide_layout.slide_master
    theme_root=next(E.fromstring(r.target_part.blob) for r in master.part.rels.values() if r.reltype.endswith('/theme'))
    theme={E.QName(c).localname:c[0].get('lastClr',c[0].get('val')) for c in theme_root.find('.//a:clrScheme',NS)}
    cmap=master._element.xpath('./p:clrMap')[0].attrib
    charts=[]
    for shape in sl.shapes:
        if not shape.has_chart:continue
        chart=shape.chart;kind=str(chart.chart_type).split(' ')[0]
        cats=[clean(str(c.label)) for c in chart.plots[0].categories]
        length=max(len(s.values) for s in chart.series)
        cats+=['']*(length-len(cats))
        if n in [7,9,10]:
            labels=[clean(s.text) for s in sorted(textsh,key=lambda s:s.left) if .3<s.top/p.slide_height<.4 and len(clean(s.text))<20]
            for i,label in enumerate(labels[:-1]):cats[i]=label
            cats[-1]='États-Unis'
        elif n in blank_labels:
            replacements=iter(blank_labels[n])
            for i,v in enumerate(chart.series[0].values):
                if v is not None and not cats[i]:cats[i]=next(replacements)
        if n==25:cats=['Autres emplois (part restante)','Non-salariés','Apprentis','Agents de la fonction publique']
        unit='%' if n not in [11,14,15,16,22,28] else {11:'Rang',14:'Indice (2020 = 100)',15:'Points de PIB',16:'Points de PIB',22:'Milliers d’euros en PPA',28:'Indice (2017 = 100)'}[n]
        if n in [7,9,10,12,13]:unit='% du PIB'
        scale=100 if n not in [11,14,15,16,22,25,28] else 1
        series=[]
        for j,se in enumerate(chart.series):
            props=se._element.find('c:spPr',NS)
            if kind.startswith('LINE'):props=props.find('a:ln',NS) if props is not None else None
            base=color(props,theme,cmap)
            colors=[base]*length
            for point in se._element.findall('c:dPt',NS):
                i=int(point.find('c:idx',NS).get('val'))
                if i<length:colors[i]=color(point.find('c:spPr',NS),theme,cmap,base)
            vals=[None if v is None else v*scale for v in se.values]
            series.append({'name':clean(se.name),'values':vals,'color':base,'colors':colors,'dash':bool(props is not None and props.find('a:prstDash',NS) is not None)})
        if n in [11,12]:
            vals=[next((s['values'][i] for s in series if s['values'][i] is not None),None) for i in range(length)]
            series=[dict(series[0],name='France',values=vals)]
        if n==17:series[0]['name']='France'
        if len(series)==1 and not kind.startswith('LINE'):series[0]['name']='Part des répondants' if n>=31 else headings[n][0]
        keep=[i for i in range(length) if any(i<len(s['values']) and s['values'][i] is not None for s in series)]
        cats=[cats[i] for i in keep]
        assert all(cats),(n,cats)
        for s in series:
            s['values']=[s['values'][i] for i in keep];s['colors']=[s['colors'][i] for i in keep]
        charts.append({'id':f'chart-{n}-{len(charts)}','slide':n,'kind':kind,'title':headings[n][len(charts)],'unit':unit,'categories':cats,'series':series,'countryBars':n in [7,9,10,15,16,19,20,24,26,27]})
    # These comparisons are text and flags in the source deck, transcribed from
    # the original slides, without inferring intermediate years.
    extras={17:[('Taux à 10 ans · mai 2017',['Grèce','Portugal','Italie','Espagne','France','Belgique','Autriche','Pays-Bas','Finlande','Allemagne'],[5.9,3.3,2.2,1.6,.8,.8,.7,.6,.5,.3]),('Taux à 10 ans · mai 2026',['France','Italie','Grèce','Belgique','Portugal','Espagne','Finlande','Autriche','Pays-Bas','Allemagne'],[3.9,3.8,3.8,3.6,3.6,3.5,3.4,3.3,3.2,3.1])],23:[('Les 10 taux de chômage les plus élevés de l’UE · 2017',['Grèce','Espagne','Italie','Croatie','Chypre','France','Portugal','Finlande','Lettonie','Slovaquie'],[21.8,17.2,11.3,11.1,11.1,9.4,9.2,8.7,8.7,8.1]),('Les 10 taux de chômage les plus élevés de l’UE · 2027e',['Finlande','Espagne','France','Suède','Grèce','Estonie','Lettonie','Lituanie','Danemark','Belgique'],[9.8,9.4,8.6,7.9,7.8,6.8,6.7,6.7,6.5,6.4])]}
    for title2,cats,vals in extras.get(n,[]):
        charts.append({'id':f'chart-{n}-{len(charts)}','slide':n,'kind':'BAR_CLUSTERED','title':title2,'unit':'%','categories':cats,'series':[{'name':title2,'values':vals,'color':'#007485','colors':['#ce1126' if c=='France' else '#007485' for c in cats],'dash':False}],'countryBars':False,'extra':True})
    notes={11:['1 = déficit public le plus élevé ; 21 = le moins élevé. Les trois premiers rangs correspondent aux déficits les plus élevés.','Chirac : 1995–2007 (cohabitation Jospin : 1997–2002) ; Sarkozy : 2007–2012 ; Hollande : 2012–2017 ; Macron : depuis 2017.'],21:['Sarkozy : 2007–2012 ; Hollande : 2012–2017 ; Macron : 2017–2022 et 2022–2027e.'],25:['Parts approximatives : non-salariés +600 000 (~25 %), apprentis +600 000 (~25 %), fonction publique +190 000 (~8 %). La part restante du graphique est de 42 %.'],26:['En euros constants. Évolution totale sur la période, et non taux de croissance annuel moyen.'],27:['En euros constants. Évolution totale sur la période, et non taux de croissance annuel moyen.'],28:['En euros constants : évolution corrigée de l’inflation. Cadres : cadres et chefs d’entreprise salariés.','Ensemble : +1,1 % entre 2017 et 2024, contre +2,6 % entre 2010 et 2017.'],31:['Opinion positive : 25 % (−15 points) ; opinion négative : 74 % (+16 points).'],36:['Oui : 54 % (+1 point) ; non : 44 % (−2 points).']}.get(n,[])
    if n in [31,36]:notes.append('Évolution par rapport au sondage OpinionWay – Square pour Les Échos et Radio Classique, auprès de 1 004 personnes, du 15 au 16 septembre 2021.')
    if any(any('e'==c[-1:] and c[:4].isdigit() for c in g['categories']) for g in charts):notes.append('e : prévision. Les segments de courbe en pointillés après 2025 correspondent aux prévisions.')
    all_slides.append({'n':n,'title':title,'source':source,'charts':charts,'notes':notes,'texts':[clean(s.text) for s in textsh if s!=title_shape]})
out={'slides':all_slides,'source':'20260521_Hexagone_TrajectoireEcoFrance_VAGUE3_v00.pptx'}
(ROOT/'dist'/'charts-data.js').write_text('window.HEXAGONE_DATA = '+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
(ROOT/'chart-data-audit.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'{len(all_slides)} diapositives ; {sum(len(s["charts"]) for s in all_slides)} graphiques extraits.')
