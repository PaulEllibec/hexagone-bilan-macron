/* Circular flags: HatScripts/circle-flags, MIT (flags/LICENSE.md). */
(()=>{
const codes={'France':'fr','Allemagne':'de','Italie':'it','Espagne':'es','Portugal':'pt','Belgique':'be','Pays-Bas':'nl','Grèce':'gr','Finlande':'fi','Autriche':'at','Irlande':'ie','Malte':'mt','Chypre':'cy','Pologne':'pl','Roumanie':'ro','Hongrie':'hu','Slovaquie':'sk','Bulgarie':'bg','Croatie':'hr','Lettonie':'lv','Slovénie':'si','Tchéquie':'cz','Rép. Tchèque':'cz','Estonie':'ee','Luxembourg':'lu','Lituanie':'lt','Suède':'se','Danemark':'dk','États-Unis':'us','Zone euro':'eu','zone euro':'eu'};
const names=Object.keys(codes).sort((a,b)=>b.length-a.length);
const pattern=new RegExp('(?<![\\p{L}])('+names.map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')(?![\\p{L}])','gu');
const source=code=>window.HEXAGONE_FLAGS?.[code]||'flags/'+code+'.svg';
function image(name){const el=document.createElement('img');el.src=source(codes[name]);el.className='country-flag';el.alt='';el.setAttribute('aria-hidden','true');el.width=20;el.height=20;el.draggable=false;return el}
function decorate(el){
 if(!el)return;
 const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement.closest('svg,script,style,select,option,.country-label,.flag-layer,.live-plot')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
 const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 for(const node of nodes){const text=node.textContent;const matches=[...text.matchAll(pattern)];if(!matches.length)continue;const fragment=document.createDocumentFragment();let end=0;for(const match of matches){fragment.append(text.slice(end,match.index));const span=document.createElement('span');span.className='country-label';span.append(image(match[0]),document.createTextNode(match[0]));fragment.append(span);end=match.index+match[0].length}fragment.append(text.slice(end));node.replaceWith(fragment)}
}
function plotFlags(plot){
 let layer=plot.querySelector(':scope > .flag-layer');if(!layer){layer=document.createElement('div');layer.className='flag-layer';layer.setAttribute('aria-hidden','true');plot.append(layer)}
 layer.replaceChildren();const bounds=plot.getBoundingClientRect();
 const layout=plot._fullLayout;if(!layout||!bounds.width)return;
 if(plot.id==='chart-28-0-plot'){
  for(const end of [0,8]){
   const compact=plot.clientWidth<500;
   const rows=plot.data.filter(t=>t.visible!==false&&codes[t.name]).map(t=>({trace:t,y:layout.yaxis._offset+layout.yaxis.d2p(t.y[end])})).sort((a,b)=>a.y-b.y);
   for(let i=1;i<rows.length;i++)rows[i].y=Math.max(rows[i].y,rows[i-1].y+27);
   for(const {trace,y} of rows){
    let flag;
    if(trace.name==='Zone euro'){flag=document.createElement('span');flag.textContent='€';Object.assign(flag.style,{background:'#003399',color:'#ffcc00',borderRadius:'50%',font:'700 19px/24px Barlow',textAlign:'center'})}
    else flag=image(trace.name);
    flag.classList.add('plot-flag');flag.title=trace.name;
    Object.assign(flag.style,{left:(layout.xaxis._offset+layout.xaxis.c2p(end)+(end?8:compact?-17:-33))+'px',top:(y-12)+'px',width:'24px',height:'24px'});layer.append(flag);
   }
  }
 }
 if(plot.id.startsWith('chart-14-')||plot.id==='chart-23-0-plot'){
  for(const trace of plot.data||[]){
   if(!codes[trace.name]||trace.name==='Zone euro')continue;
   const flag=image(trace.name);flag.classList.add('plot-flag');flag.title=trace.name;
   Object.assign(flag.style,{left:(layout.xaxis._offset+layout.xaxis.d2p('2027e')+7)+'px',top:(layout.yaxis._offset+layout.yaxis.d2p(trace.y.at(-1))-12+(plot.id==='chart-23-0-plot'?(trace.name==='France'?9:trace.name==='Espagne'?-9:0):0))+'px',width:'24px',height:'24px'});layer.append(flag);
  }
 }
 for(const tick of plot.querySelectorAll('.xtick text,.ytick text')){
  const name=tick.textContent.trim();if(!codes[name])continue;
  const horizontal=!!tick.closest('.ytick'),axis=horizontal?layout.yaxis:layout.xaxis;
  const size=horizontal?26:Math.min(26,Math.max(18,axis._length/Math.max(1,axis.categoryarray?.length||1)-4));
  const left=horizontal?layout.xaxis._offset-size-9:axis._offset+axis.d2p(name)-size/2;
  const top=horizontal?axis._offset+axis.d2p(name)-size/2:layout.yaxis._offset+layout.yaxis._length+8;
  const flag=image(name);flag.classList.add('plot-flag');flag.dataset.country=name;
  Object.assign(flag.style,{left:left+'px',top:top+'px',width:size+'px',height:size+'px',pointerEvents:'auto'});
  layer.append(flag);if(tick.style.opacity!=='0')tick.style.opacity='0';
 }

}
function bindValueHover(plot){
 if(plot.dataset.valueHover)return;plot.dataset.valueHover='true';
 plot.classList.add('cursor-tooltip-enabled');
 const tip=document.createElement('div');tip.className='cursor-tooltip';tip.hidden=true;tip.setAttribute('role','tooltip');document.body.append(tip);
 let px=0,py=0,overlay=false;
 const definition=()=>window.hexagoneCharts?.get(plot.id.replace(/-plot$/,''))?.definition;
 function position(){if(tip.hidden)return;const rect=tip.getBoundingClientRect();let x=px+16,y=py+16;if(x+rect.width>innerWidth-8)x=px-rect.width-16;if(y+rect.height>innerHeight-8)y=py-rect.height-16;tip.style.left=Math.max(8,x)+'px';tip.style.top=Math.max(8,y)+'px'}
 function show(rows){tip.replaceChildren();for(const row of rows){const el=document.createElement('div');el.textContent=row;tip.append(el)}tip.hidden=false;position()}
 const number=v=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1}).format(v);
 function showCountry(country){
  for(const trace of plot.data){const i=trace.customdata?.findIndex(row=>row[0]===country);
   if(i>=0){show([country,number(trace.customdata[i][1])+' '+(definition()?.unit||'')]);return true}}
  return false;
 }
 function onMove(event){
  px=event.clientX;py=event.clientY;overlay=false;
  let el=event.target.closest?.('.plot-flag,.annotation');
  if(!el){el=[...plot.querySelectorAll('.annotation')].find(a=>{const r=a.getBoundingClientRect();return px>=r.left&&px<=r.right&&py>=r.top&&py<=r.bottom})}
  if(el){let country=el.dataset.country;
   if(!country){const ann=plot.layout.annotations?.[Number(el.getAttribute('data-index'))];if(ann)country=typeof ann.x==='string'?ann.x:ann.y}
   overlay=showCountry(country);
  }
  if(!overlay&&event.target.closest?.('.flag-layer,.infolayer'))tip.hidden=true;
  position();
 }
 plot.addEventListener('pointermove',onMove,true);
 plot.on('plotly_hover',event=>{if(overlay)return;const unit=definition()?.unit||'';show(event.points.map(pt=>pt.data.type==='pie'?pt.label+' : '+number(pt.value)+' '+unit:pt.data.type==='bar'?pt.customdata[0]+' : '+number(pt.customdata[1])+' '+unit:pt.x+' · '+pt.data.name+' : '+number(pt.y)+' '+unit))});
 plot.on('plotly_unhover',()=>{if(!overlay)tip.hidden=true});
 plot.addEventListener('pointerleave',()=>{tip.hidden=true;overlay=false});
 addEventListener('scroll',()=>{tip.hidden=true},true);
 document.querySelector('.top-tabs')?.addEventListener('click',()=>{tip.hidden=true});
}
function observePlot(plot){bindValueHover(plot);if(plot.dataset.flagWatch)return;plot.dataset.flagWatch='true';let scheduled=false;const update=()=>{if(!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;plotFlags(plot)})}};const svg=plot.querySelector('.svg-container');if(svg)new MutationObserver(records=>{if(records.some(r=>{const el=r.target.nodeType===1?r.target:r.target.parentElement;return !el.closest?.('.hoverlayer')}))update()}).observe(svg,{childList:true,subtree:true,characterData:true,attributes:true});plot.on('plotly_afterplot',update);update()}
window.CountryFlags={decorate,plotFlags,observePlot,codes};
})();
