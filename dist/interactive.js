/* Graphs are rebuilt from the PowerPoint data, not image overlays. */
(async()=>{
'use strict';
await document.fonts.ready;
const all=window.HEXAGONE_DATA.slides.flatMap(s=>s.charts);
const controllers=new Map();
window.hexagoneCharts=controllers;
const fmt=(value,unit,decimals=1)=>value===null?'—':new Intl.NumberFormat('fr-FR',{maximumFractionDigits:decimals,minimumFractionDigits:decimals}).format(value)+(unit.includes('%')?' %':(unit==='Points de PIB'||unit==='en pts de PIB')?' pts':unit==='Milliers d’euros en PPA'?' k€':'');
const html=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function control(label,values,selected){const wrap=document.createElement('label');wrap.textContent=label;const select=document.createElement('select');for(const [value,text]of values){const op=new Option(text,value);select.add(op)}select.value=String(selected);wrap.append(select);return {wrap,select}}
function button(text,cls){const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=text;return b}
function wrapText(t,max=20){const words=t.split(' ');let lines=[''];for(const word of words){let i=lines.length-1;if(lines[i]&&(lines[i]+' '+word).length>max)lines.push(word);else lines[i]+=(lines[i]?' ':'')+word}return lines.map(html).join('<br>')}
const isLine=g=>g.kind.startsWith('LINE');
function create(g){
 const root=document.getElementById(g.id);root.querySelector('.chart-loading').remove();
 const line=isLine(g),pie=g.kind==='PIE',stack=g.kind==='BAR_STACKED_100';
 const state={sort:'source',filter:'all',start:0,end:g.categories.length-1,visible:g.series.map(()=>true),focus:null,selected:null};
 const controls=document.createElement('div');controls.className='chart-controls';root.append(controls);if([11,14,17,23,28].includes(g.slide))controls.hidden=true;
 let start,end,sort,filter,period;
 if(line){
  start=control('Du',g.categories.map((c,i)=>[i,c]),0);end=control('Au',g.categories.map((c,i)=>[i,c]),state.end);
  controls.append(start.wrap,end.wrap);
  start.select.addEventListener('change',()=>{state.start=+start.select.value;if(state.start>=state.end){state.end=Math.min(g.categories.length-1,state.start+1);state.start=Math.min(state.start,state.end-1)}syncPeriod();render()});
  end.select.addEventListener('change',()=>{state.end=+end.select.value;if(state.end<=state.start){state.start=Math.max(0,state.end-1);state.end=Math.max(state.end,state.start+1)}syncPeriod();render()});
 }
 const legend=document.createElement('div');legend.className='chart-legend';root.append(legend);
 const hint=document.createElement('p');hint.className='chart-hint';hint.textContent=g.slide===11?'Survolez un point pour afficher le rang du déficit français.':line?'Cliquez sur une série pour la masquer. Glissez sur le graphique pour zoomer ; double-cliquez pour rétablir la vue.':pie?'Survolez une part ou sélectionnez sa légende pour la mettre en évidence.':stack?'Sélectionnez une réponse dans la légende pour la mettre en évidence. Les parts restent exprimées sur 100 %.':'Survolez une barre ou cliquez dessus pour conserver sa valeur.';root.append(hint);if([17,23,28].includes(g.slide)&&line)hint.hidden=true;
 
 const plot=document.createElement('div');plot.className='live-plot';plot.id=g.id+'-plot';plot.setAttribute('role','img');plot.setAttribute('aria-label',g.title+'. Graphique interactif ; données accessibles dans le tableau de la diapositive.');const plotScroll=document.createElement('div');plotScroll.className='plot-scroll';plotScroll.append(plot);root.append(plotScroll);if(line&&![11,17].includes(g.slide)&&g.categories.length>20){plot.style.minWidth=(g.categories.length*48)+'px';plotScroll.setAttribute('tabindex','0');plotScroll.setAttribute('aria-label','Graphique défilant horizontalement pour lire toutes les valeurs')}
 const status=document.createElement('div');status.className='chart-status';status.setAttribute('aria-live','polite');root.append(status);
 if(line){period=control('Lire les valeurs pour',g.categories.map((c,i)=>[i,c]),state.end);period.wrap.className='period-readout';controls.append(period.wrap);period.select.addEventListener('change',()=>showYear(+period.select.value))}
 const matrix=document.createElement('div');
 if(line&&g.series.length>1&&![14,28].includes(g.slide)){matrix.className='value-matrix';if([23,28].includes(g.slide)){const details=document.createElement('details');details.className='transcript';const summary=document.createElement('summary');summary.textContent=g.slide===28?'Consulter les données':'Consulter les valeurs par période';details.append(summary,matrix);plotScroll.after(details)}else plotScroll.after(matrix)}
 function showMatrix(){
  if(!matrix.isConnected)return;
  const indices=g.categories.map((_,i)=>i).filter(i=>i>=state.start&&i<=state.end);
  matrix.innerHTML='<table><caption>Valeurs par période</caption><thead><tr><th scope="col">Série</th>'+indices.map(i=>'<th scope="col">'+html(g.categories[i])+'</th>').join('')+'</tr></thead><tbody>'+g.series.map((s,k)=>!state.visible[k]?'':'<tr class="'+(s.name==='France'?'france-values':'')+'"><th scope="row">'+html(s.name)+'</th>'+indices.map(i=>'<td>'+html(fmt(s.values[i],g.unit))+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
 }
 let rendered=false,busy=false,queued=false;
 new MutationObserver(()=>CountryFlags.decorate(status)).observe(status,{childList:true});
 function syncPeriod(){start.select.value=state.start;end.select.value=state.end}
 function showYear(i){status.textContent=g.categories[i]+' · '+g.series.map((s,k)=>state.visible[k]?s.name+' : '+fmt(s.values[i],g.unit):'').filter(Boolean).join(' ; ')}
 function keys(){
  legend.replaceChildren();if([11,14,17,23,28].includes(g.slide))return;
  if(line||stack){g.series.forEach((s,i)=>{const b=button('','legend-toggle');b.setAttribute('aria-pressed',String(line?state.visible[i]:state.focus===null||state.focus===i));b.innerHTML='<span class="legend-swatch" style="background:'+s.color+'"></span>'+html(s.name);b.addEventListener('click',()=>{if(line){state.visible[i]=!state.visible[i];if(!state.visible.some(Boolean))state.visible[i]=true;showYear(+period.select.value)}else state.focus=state.focus===i?null:i;render()});legend.append(b)})}
  else if(pie){g.categories.forEach((cat,i)=>{const b=button('','legend-toggle pie-key');b.setAttribute('aria-pressed',String(state.selected===null||state.selected===i));b.innerHTML='<span class="legend-swatch" style="background:'+g.series[0].colors[i]+'"></span>'+html(cat);b.addEventListener('click',()=>{state.selected=state.selected===i?null:i;status.textContent=state.selected===null?'':cat+' : environ '+fmt(g.series[0].values[i],g.unit,0);render()});legend.append(b)})}
  else if(g.countryBars){for(const [name,color]of [['France','#ce1126'],['Zone euro','#007485'],['Autre pays de l’UE','#c3bdc7'],['États-Unis','#908296']]){const span=document.createElement('span');span.className='bar-key';span.innerHTML='<span class="legend-swatch" style="background:'+color+'"></span>'+name;if(name==='États-Unis')span.querySelector('.legend-swatch').classList.add('us-swatch');legend.append(span)}}
 }
 function traces(){
  if(line){
   const result=[];g.series.forEach((s,k)=>{
    const forecast=[14,23].includes(g.slide)?-1:g.categories.findIndex(c=>/^202[67]e$/.test(c));
    const common={type:'scatter',mode:g.series.length>1?'lines+markers':'lines+markers+text',text:s.values.map(v=>v===null?'':fmt(v,g.unit)),textposition:k%2?'bottom center':'top center',textfont:{size:14,weight:s.name==='France'?700:400,color:s.color},cliponaxis:false,name:s.name,legendgroup:String(k),showlegend:false,visible:state.visible[k],connectgaps:false,hovertemplate:'%{x}<br>'+html(s.name)+' : %{y:.1f} '+html(g.unit)+'<extra></extra>',line:{color:s.color,width:s.name==='France'||s.name==='Ensemble'?3.5:2.4,dash:s.dash?'dash':'solid',shape:'linear'},marker:{size:g.categories.length<20?6:4,color:s.color}};
    const observed=forecast<0?s.values:s.values.map((v,i)=>i<forecast?v:null);
    result.push({...common,x:g.categories,y:observed,text:observed.map(v=>v===null?'':fmt(v,g.unit))});
    if(forecast>=0)result.push({...common,x:g.categories,y:s.values.map((v,i)=>i>=forecast-1?v:null),text:s.values.map((v,i)=>i>=forecast?' '+fmt(v,g.unit):''),line:{...common.line,dash:'dot'}});
   });
   if(g.slide===11)for(const trace of result){
    trace.text=trace.y.map(v=>v===null?'':String(v));
    trace.textfont={family:'Barlow',size:root.clientWidth<500?10:17,color:'#007485',weight:700};
    trace.textposition=trace.y.map((v,i)=>root.clientWidth<500&&i%2?'bottom center':'top center');
    trace.marker={symbol:'diamond',size:root.clientWidth<500?6:10,color:trace.y.map(v=>v!==null&&v<=3?'#ce1126':'#007485')};
    trace.line={...trace.line,color:'#007485',shape:'spline',smoothing:.65};
   }
   if([14,23,28].includes(g.slide))for(const trace of result){trace.mode='lines';trace.line={...trace.line,width:trace.name==='France'?4:2.5,shape:'spline',smoothing:.6,dash:trace.name==='Zone euro'?'dash':'solid'}}
   if(g.slide===17)for(const trace of result){
    trace.line={...trace.line,shape:'spline',smoothing:.65};
    trace.marker.size=3;
    trace.textposition=trace.y.map((_,i)=>i===0?'top right':i===trace.y.length-1?'top left':'top center');
    const step=root.clientWidth<500?36:12;
    trace.text=trace.y.map((v,i)=>v!==null&&(i===0||i===trace.y.length-1||(i%step===0&&i<trace.y.length-step/2))?fmt(v,g.unit):'');
   }
   return result;
  }
  if(pie)return [{type:'pie',labels:g.categories,values:g.series[0].values,sort:false,direction:'clockwise',textinfo:'percent',textfont:{size:20,weight:400,color:'white'},marker:{colors:g.series[0].colors,line:{color:'#fff',width:1}},pull:g.categories.map((_,i)=>state.selected===i?.06:0),hovertemplate:'%{label}<br>Environ %{value:.0f} %<extra></extra>',showlegend:false}];
  let ids=g.categories.map((_,i)=>i);
  if(state.filter==='fr')ids=ids.filter(i=>g.categories[i]==='France');
  if(state.filter==='euro')ids=ids.filter(i=>g.categories[i]==='France'||g.series[0].colors[i].toLowerCase()==='#007485');
  const score=i=>stack&&state.focus!==null?g.series[state.focus].values[i]:g.series.reduce((sum,s)=>sum+(s.values[i]||0),0);
  if(state.sort==='desc')ids.sort((a,b)=>score(b)-score(a));if(state.sort==='asc')ids.sort((a,b)=>score(a)-score(b));if(state.sort==='alpha')ids.sort((a,b)=>g.categories[a].localeCompare(g.categories[b],'fr'));
  const horizontal=g.kind.startsWith('BAR')||root.clientWidth<900;
  return g.series.map((s,k)=>({type:'bar',orientation:horizontal?'h':'v',name:s.name,showlegend:false,
   x:ids.map(i=>horizontal?s.values[i]:g.categories[i]),y:ids.map(i=>horizontal?g.categories[i]:s.values[i]),
   customdata:ids.map(i=>[g.categories[i],s.values[i],i]),marker:{pattern:{shape:ids.map(i=>/États-Unis|Etats-Unis/.test(g.categories[i])?'/':''),fgcolor:ids.map(i=>s.colors[i]),bgcolor:ids.map(i=>/États-Unis|Etats-Unis/.test(g.categories[i])?'#fff':s.colors[i]),size:7,solidity:.25},color:stack?s.color:ids.map(i=>s.colors[i]),opacity:stack?(state.focus===null||state.focus===k?1:.18):1},
   text:ids.map(i=>stack&&s.values[i]<4?'':fmt(s.values[i],g.unit,g.slide>=31?0:1)),textposition:stack?'inside':'none',textangle:!horizontal&&ids.length>15?-90:0,insidetextanchor:'middle',textfont:{size:15,weight:400,color:stack?s.color:ids.map(i=>s.colors[i])},cliponaxis:false,
   hovertemplate:'%{customdata[0]}<br>'+ (stack?html(s.name)+' : ':'')+'%{customdata[1]:.1f} '+html(g.unit)+'<extra></extra>'}));
 }
 function layout(data){
  const narrow=root.clientWidth<500;let height=line?460:pie?410:550;
  const base={autosize:true,height,paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)',font:{family:'Barlow, Arial, sans-serif',size:12,color:'#30535d'},separators:', ',margin:{t:28,r:24,b:65,l:65},showlegend:false,hoverlabel:{bgcolor:'rgba(255,255,255,0.94)',bordercolor:'rgba(0,0,0,0)',font:{family:'Barlow, Arial, sans-serif',size:15,color:'#183e49'}},hovermode:line?'x unified':'closest',dragmode:line?'zoom':false,bargap:.32,transition:{duration:0},uirevision:g.id+'-'+state.start+'-'+state.end};
  const axis={gridcolor:'#e1e9eb',zeroline:false,automargin:true,tickfont:{size:12},fixedrange:!line};
  if(pie){base.margin={t:5,r:5,b:5,l:5};return base}
  if(line){
   base.xaxis={...axis,type:'category',categoryorder:'array',categoryarray:g.categories,range:[state.start,state.end],tickmode:'array',tickvals:[],ticktext:[],title:{text:g.slide===21?'Quinquennat':'Période',standoff:15},showgrid:false};
   const steps=Math.max(1,Math.ceil((state.end-state.start)/(narrow?3:8)));
   for(let i=state.start;i<=state.end;i+=steps){base.xaxis.tickvals.push(g.categories[i]);base.xaxis.ticktext.push(g.categories[i])}
   if(base.xaxis.tickvals.at(-1)!==g.categories[state.end]){base.xaxis.tickvals.push(g.categories[state.end]);base.xaxis.ticktext.push(g.categories[state.end])}
   base.yaxis={...axis,ticksuffix:g.unit.includes('%')?' %':'',tickformat:g.unit==='Rang'?'.0f':'.1f',rangemode:'normal'};
   const vals=g.series.flatMap((s,k)=>state.visible[k]?s.values.slice(state.start,state.end+1).filter(v=>v!==null):[]);
   let min=Math.min(...vals),max=Math.max(...vals);let pad=(max-min)*.12||1;
   base.yaxis.range=[min-pad,max+pad];
   if(g.slide===11){
    base.height=narrow?470:540;base.margin={t:54,r:18,b:78,l:34};
    base.xaxis.range=[state.start-.5,state.end+.5];base.xaxis.tickvals=g.categories.slice(state.start,state.end+1);base.xaxis.ticktext=base.xaxis.tickvals;
    base.xaxis.tickangle=-90;base.xaxis.tickfont={size:narrow?9:14};base.xaxis.title={text:''};
    base.yaxis.range=[20.5,-.8];base.yaxis.dtick=1;base.yaxis.tickformat='.0f';
    base.shapes=[{type:'rect',xref:'paper',x0:0,x1:1,yref:'y',y0:-.8,y1:3.5,fillcolor:'#ce1126',opacity:.14,line:{width:0},layer:'below'}];
    base.annotations=[{xref:'paper',yref:'y',x:.01,y:0,text:'Top 3 déficits',showarrow:false,xanchor:'left',font:{size:14,color:'#ce1126',weight:700}}];
    const periods=[[0,2,'Chirac'],[2,7,narrow?'Jospin':'Chirac<br>(cohabitation<br>Jospin)'],[7,12,'Chirac'],[12,17,'Sarkozy'],[17,22,'Hollande'],[22,32,'Macron']];
    for(const [start,finish,name] of periods){
     if(finish<state.start||start>state.end)continue;
     base.annotations.push({xref:'x',yref:'y',x:(Math.max(start,state.start)+Math.min(finish,state.end))/2,y:narrow&&start%2?17.2:19,text:name,showarrow:false,font:{size:narrow?9:13,color:'#007485'}});
     if(start>state.start)base.shapes.push({type:'line',xref:'x',x0:start,x1:start,yref:'y',y0:3.8,y1:20.4,line:{color:'#b9b3c0',width:1,dash:start>=12?'dash':'dot'},layer:'below'});
    }
   }
   if(g.slide===14){
    base.height=460;base.margin={t:28,r:46,b:72,l:52};
    base.xaxis.tickvals=g.categories;base.xaxis.ticktext=g.categories;base.xaxis.tickangle=-50;base.xaxis.tickfont={size:11};base.xaxis.title={text:''};
    base.xaxis.range=[-.25,10.5];base.yaxis.tickformat='.0f';
    const debt=g.id.endsWith('-1');base.yaxis.range=debt?[40,160]:[-10,2];base.yaxis.dtick=debt?20:2;
    const fr=g.series.find(s=>s.name==='France').values.at(-1);
    base.annotations=[{x:'2027e',y:fr,xref:'x',yref:'y',text:'2027e<br><b>'+fmt(fr,'%',debt?0:1)+'</b>',showarrow:true,ax:-50,ay:debt?-35:40,arrowcolor:'#ce1126',arrowwidth:1,bgcolor:'rgba(255,255,255,.94)',bordercolor:'#ce1126',font:{family:'Barlow',size:15,color:'#ce1126'}}];
   }
   if(g.slide===28){
    base.height=narrow?460:540;base.margin={t:26,r:48,b:55,l:62};
    base.yaxis.range=[80,126];base.yaxis.dtick=5;base.yaxis.tickformat='.0f';
    base.xaxis.range=[-.3,8.3];base.xaxis.tickvals=g.categories;base.xaxis.ticktext=g.categories;base.xaxis.tickfont={size:narrow?10:15};base.xaxis.title={text:''};
   }
   if(g.slide===23){
    base.height=530;base.margin={t:20,r:45,b:70,l:45};
    base.xaxis.range=[-.25,10.5];base.xaxis.tickvals=g.categories;base.xaxis.ticktext=g.categories;base.xaxis.tickangle=-50;base.xaxis.tickfont={size:11};base.xaxis.title={text:''};
    base.yaxis.range=[0,18];base.yaxis.dtick=2;base.yaxis.tickformat='.0f';base.annotations=[];
   }
   if([14,23].includes(g.slide))base.annotations.push({xref:'paper',yref:'paper',x:1,y:.025,xanchor:'right',yanchor:'bottom',text:'En pointillés : zone euro',showarrow:false,font:{family:'Barlow',size:14,color:'#00b0f0'},bgcolor:'rgba(255,255,255,.85)',borderpad:3});
   return base;
  }
  const horizontal=data[0].orientation==='h';const count=data[0].x.length;
  base.uirevision+='-'+(horizontal?'h':'v')+'-'+Math.round(root.clientWidth);base.barmode=stack?'stack':'group';base.uniformtext={minsize:15,mode:'show'};
  if(horizontal){
   height=Math.max(270,count*(narrow?45:35)+90);base.height=height;
   base.margin={t:20,r:90,b:55,l:g.categories.every(c=>CountryFlags.codes[c])?49:narrow?120:Math.min(220,Math.max(...g.categories.map(c=>c.length))*6+10)};
   base.yaxis={...axis,type:'category',tickfont:{size:16},autorange:'reversed',categoryorder:'array',categoryarray:data[0].y,showgrid:false,tickmode:'array',tickvals:data[0].y,ticktext:data[0].y.map(c=>wrapText(c,narrow?17:29))};
   base.xaxis={...axis,type:'linear',autorange:false,ticksuffix:g.unit.includes('%')?' %':'',rangemode:'tozero',nticks:narrow?4:7};
   if(stack){base.xaxis.range=[0,100];base.margin.r=15}
   else{let vals=data[0].x;const lo=Math.min(0,...vals),hi=Math.max(0,...vals),pad=(hi-lo)*.08||1;base.xaxis.range=[lo<0?lo-pad:0,hi+pad];base.annotations=data[0].y.map((cat,i)=>({xref:'x',x:vals[i],xshift:vals[i]<0?-5:5,yref:'y',y:cat,text:fmt(vals[i],g.unit),showarrow:false,captureevents:true,xanchor:vals[i]<0?'right':'left',font:{size:15,weight:cat==='France'?700:400,color:data[0].marker.color[i]}}));
    const measure=document.createElement('canvas').getContext('2d');measure.font='700 15px Barlow, Arial';const needed=Math.ceil(Math.max(...vals.map(v=>measure.measureText(fmt(v,g.unit)).width)))+12;
    base.margin.r=14;const available=Math.max(100,root.clientWidth-base.margin.l-base.margin.r);const span=Math.max(.1,hi-lo),ends=(lo<0?1:0)+(hi>=0?1:0);const extra=span*needed/Math.max(36,available-ends*needed);base.xaxis.range=[lo<0?lo-extra:0,hi+extra];}

  }else{
   base.margin={t:25,r:25,b:g.categories.every(c=>CountryFlags.codes[c])?54:g.categories.length>10?125:75,l:60};
   base.xaxis={...axis,type:'category',tickfont:{size:16},showgrid:false,categoryorder:'array',categoryarray:data[0].x,tickangle:g.categories.every(c=>CountryFlags.codes[c])?0:g.categories.length>10?-60:0,ticklabelstandoff:0,automargin:!g.categories.every(c=>CountryFlags.codes[c]),tickmode:'array',tickvals:data[0].x,ticktext:data[0].x.map(c=>g.categories.length>10?c:wrapText(c,18))};
   const vals=data[0].y,lo=Math.min(0,...vals),hi=Math.max(0,...vals),pad=(hi-lo)*.14||1;
   base.yaxis={...axis,type:'linear',autorange:false,ticksuffix:g.unit.includes('%')?' %':'',range:[lo<0?lo-pad:0,hi+pad]};
   const dense=g.categories.length>15;
   const measure=document.createElement('canvas').getContext('2d');measure.font='700 15px Barlow, Arial';
   const labelHeight=dense?Math.ceil(Math.max(...vals.map(v=>measure.measureText(fmt(v,g.unit)).width)))+10:26;
   const usable=base.height-base.margin.t-base.margin.b;
   const padding=(hi-lo||1)*labelHeight/Math.max(50,usable-labelHeight*2);
   base.yaxis.range=[lo<0?lo-padding:0,hi+padding];
   base.annotations=data[0].x.map((cat,i)=>({x:cat,xref:'x',y:vals[i],yref:'y',yanchor:vals[i]<0?'top':'bottom',yshift:vals[i]<0?-5:5,text:fmt(vals[i],g.unit),textangle:dense?-90:0,showarrow:false,captureevents:true,font:{size:15,weight:cat==='France'?700:400,color:data[0].marker.color[i]}}));

  }
  return base;
 }
 async function render(resetAxes=false){
  if(root.closest('[hidden]')||root.clientWidth===0)return;
  if(busy){queued=true;return}busy=true;
  try{
   keys();showMatrix();const data=traces(),lay=layout(data);plot.style.height=lay.height+'px';
   if(resetAxes)lay.uirevision=Date.now();
   await Plotly.react(plot,data,lay,{responsive:true,displayModeBar:false,displaylogo:false,scrollZoom:false,locale:'fr',doubleClick:'reset',staticPlot:false});
   CountryFlags.decorate(status);CountryFlags.observePlot(plot);CountryFlags.plotFlags(plot);
   if(!rendered){
    rendered=true;
    plot.on('plotly_click',ev=>{const pt=ev.points[0];if(line){const i=g.categories.indexOf(String(pt.x));if(i>=0){period.select.value=i;showYear(i)}}else if(pie){state.selected=pt.pointNumber;status.textContent=pt.label+' : environ '+fmt(pt.value,g.unit,0);render()}else{state.selected=pt.customdata[2];status.textContent=pt.customdata[0]+' · '+(stack?pt.data.name+' : ':'')+fmt(pt.customdata[1],g.unit);if(!stack)render()}});
   }
   root.dataset.ready='true';
  }catch(error){root.dataset.error=error.message;status.textContent='Le graphique n’a pas pu être affiché. Les données restent accessibles dans le tableau.';console.error(g.id,error)}
  finally{busy=false;if(queued){queued=false;render()}}
 }
 let width=root.clientWidth;const resize=new ResizeObserver(()=>{if(Math.abs(root.clientWidth-width)>5){width=root.clientWidth;render()}});resize.observe(root);
 controllers.set(g.id,{state,render,plot,definition:g});render();
}
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){observer.unobserve(entry.target);create(all.find(g=>g.id===entry.target.id))}}),{rootMargin:'500px'});
for(const g of all)observer.observe(document.getElementById(g.id));
window.renderAllHexagoneCharts=()=>{for(const g of all)if(!controllers.has(g.id)){observer.unobserve(document.getElementById(g.id));create(g)}};
})();
