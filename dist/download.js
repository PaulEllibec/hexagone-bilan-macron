/* Compose a standalone PNG from the chart, its heading, keys and flag overlays. */
(()=>{
const loadImage=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src});
async function download(root,button){
 const controller=window.hexagoneCharts.get(root.id),plot=controller.plot;
 if(!plot?.data)return;
 button.disabled=true;button.textContent='Préparation…';
 let svgUrl;
 try{
  await document.fonts.ready;
  CountryFlags.plotFlags(plot);
  const width=Math.ceil(plot._fullLayout.width),height=Math.ceil(plot._fullLayout.height);
  const svg=await Plotly.toImage(plot,{format:'svg',width,height});
  const xml=new DOMParser().parseFromString(decodeURIComponent(svg.slice(svg.indexOf(',')+1)),'image/svg+xml');
  for(const text of xml.querySelectorAll('.xtick text,.ytick text'))if(CountryFlags.codes[text.textContent.trim()])text.style.opacity='0';
  const fontStyle=xml.createElementNS('http://www.w3.org/2000/svg','style');
  const fonts=await Promise.all([400,700].map(async weight=>{
   if(window.HEXAGONE_EXPORT_FONTS?.[weight])return '@font-face{font-family:Barlow;src:url('+window.HEXAGONE_EXPORT_FONTS[weight]+');font-weight:'+weight+'}';
   const response=await fetch('fonts/barlow-'+weight+'.ttf');if(!response.ok)throw Error('Police indisponible');
   const bytes=new Uint8Array(await response.arrayBuffer());let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
   return '@font-face{font-family:Barlow;src:url(data:font/ttf;base64,'+btoa(binary)+');font-weight:'+weight+'}';
  }));
  fontStyle.textContent=fonts.join('');xml.documentElement.prepend(fontStyle);
  svgUrl=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(xml)],{type:'image/svg+xml'}));
  const graph=await loadImage(svgUrl);
  const pad=28,canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
  const totalWidth=Math.max(640,width+pad*2),textWidth=totalWidth-pad*2;
  function lines(text,font){ctx.font=font;const result=[];let line='';for(const word of text.replace(/\s+/g,' ').split(' ')){const candidate=line?line+' '+word:word;if(line&&ctx.measureText(candidate).width>textWidth){result.push(line);line=word}else line=candidate}if(line)result.push(line);return result}
  const section=root.closest('.slide-section');
  const title=lines(section.querySelector('h2').textContent,'700 26px Barlow');
  const subtitle=lines(root.querySelector('h3').textContent,'400 18px Barlow');
  const source=lines(section.querySelector('.chart-source')?.textContent||'','400 13px Barlow');
  const keys=[...root.querySelectorAll('.legend-toggle,.bar-key')].filter(el=>el.getAttribute('aria-pressed')!=='false').map(el=>({name:el.textContent,color:getComputedStyle(el.querySelector('.legend-swatch')).backgroundColor,hatch:!!el.querySelector('.us-swatch')}));
  ctx.font='400 17px Barlow';let keyX=pad,keyY=0;
  for(const key of keys){key.width=ctx.measureText(key.name).width+34;if(keyX+key.width>totalWidth-pad){keyX=pad;keyY+=30}key.x=keyX;key.y=keyY;keyX+=key.width+14}
  const plotY=pad+title.length*32+12+subtitle.length*24+(keys.length?keyY+44:16);
  const totalHeight=plotY+height+20+source.length*19+pad;
  const scale=Math.min(2,Math.sqrt(24000000/(totalWidth*totalHeight)));
  canvas.width=Math.ceil(totalWidth*scale);canvas.height=Math.ceil(totalHeight*scale);ctx.scale(scale,scale);
  ctx.fillStyle='#fff';ctx.fillRect(0,0,totalWidth,totalHeight);ctx.textBaseline='top';
  let y=pad;ctx.fillStyle='#153f42';ctx.font='700 26px Barlow';for(const line of title){ctx.fillText(line,pad,y);y+=32}
  y+=12;ctx.fillStyle='#355f62';ctx.font='400 18px Barlow';for(const line of subtitle){ctx.fillText(line,pad,y);y+=24}
  y+=10;ctx.font='400 17px Barlow';
  for(const key of keys){ctx.fillStyle=key.color;ctx.beginPath();ctx.arc(key.x+8,y+key.y+9,7,0,Math.PI*2);ctx.fill();if(key.hatch){ctx.save();ctx.clip();ctx.strokeStyle='#908296';ctx.lineWidth=2;for(let offset=-14;offset<=14;offset+=5){ctx.beginPath();ctx.moveTo(key.x+offset,y+key.y+18);ctx.lineTo(key.x+offset+18,y+key.y);ctx.stroke()}ctx.restore()}ctx.fillStyle='#274851';ctx.fillText(key.name,key.x+23,y+key.y)}
  ctx.drawImage(graph,pad,plotY,width,height);
  for(const flag of plot.querySelectorAll(':scope > .flag-layer .plot-flag')){
   const x=pad+parseFloat(flag.style.left),fy=plotY+parseFloat(flag.style.top),w=parseFloat(flag.style.width),h=parseFloat(flag.style.height);
   if(flag.tagName==='IMG')ctx.drawImage(await loadImage(flag.src),x,fy,w,h);
   else{const style=getComputedStyle(flag);ctx.fillStyle=style.backgroundColor;ctx.beginPath();ctx.arc(x+w/2,fy+h/2,w/2,0,Math.PI*2);ctx.fill();ctx.fillStyle=style.color;ctx.font='700 19px Barlow';ctx.textAlign='center';ctx.fillText(flag.textContent,x+w/2,fy+1);ctx.textAlign='left'}
  }
  y=plotY+height+20;ctx.fillStyle='#496563';ctx.font='400 13px Barlow';for(const line of source){ctx.fillText(line,pad,y);y+=19}
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Export indisponible');
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Hexagone-'+root.id+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
 }catch(error){console.error(error);button.title='Le téléchargement a échoué. Réessayez.';const message=document.createElement('p');message.setAttribute('role','alert');message.textContent=button.title;button.parentElement.append(message)}
 finally{if(svgUrl)URL.revokeObjectURL(svgUrl);button.disabled=false;button.textContent='Télécharger en PNG'}
}
for(const root of document.querySelectorAll('.chart-block')){
 const actions=document.createElement('div');actions.className='chart-download';
 const button=document.createElement('button');button.type='button';button.textContent='Télécharger en PNG';button.addEventListener('click',()=>download(root,button));actions.append(button);
 const insert=()=>{if(root.dataset.ready==='true')root.append(actions)};
 new MutationObserver(insert).observe(root,{attributes:true,attributeFilter:['data-ready']});insert();
}
})();
