const sections=[...document.querySelectorAll('.slide-section')];
const jump=document.getElementById('jump');
const viewer=document.getElementById('viewer');
const full=document.getElementById('full-slide');
const zoom=document.getElementById('zoom');
let returnFocus=null;
jump.addEventListener('change',()=>{document.getElementById(jump.value).scrollIntoView({block:'start'});history.replaceState(null,'','#'+jump.value)});
let scheduled=false;
function updateReading(){
 scheduled=false;
 let active=sections[0];
 for(const section of sections){if(section.getBoundingClientRect().top<=innerHeight*.4)active=section;else break}
 const index=Number(active.dataset.index)+1;
 document.getElementById('reading').textContent=String(index).padStart(2,'0')+' / 27';
 document.getElementById('progress-fill').style.width=(index/27*100)+'%';
 if(document.activeElement!==jump)jump.value=active.id;
 document.querySelectorAll('.chapter').forEach(link=>{const selected=link.dataset.group===active.dataset.group;link.classList.toggle('active',selected);if(selected)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current')});
}
addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(updateReading)}},{passive:true});
updateReading();
document.querySelectorAll('[data-slide]').forEach(button=>button.addEventListener('click',()=>{
 returnFocus=button;
 const n=button.dataset.slide;
 full.src='slides/slide-'+n+'.png';
 full.alt=document.querySelector('#slide-'+n+' h2').textContent;
 document.getElementById('viewer-title').textContent='Diapositive '+n;
 zoom.value=100;full.style.width='100%';document.getElementById('zoom-value').textContent='100 %';
 viewer.showModal();document.body.classList.add('modal-open');document.querySelector('.viewer-scroll').scrollTo(0,0);
}));
zoom.addEventListener('input',()=>{full.style.width=zoom.value+'%';document.getElementById('zoom-value').textContent=zoom.value+' %'});
document.getElementById('close-viewer').addEventListener('click',()=>viewer.close());
viewer.addEventListener('click',event=>{if(event.target===viewer)viewer.close()});
viewer.addEventListener('close',()=>{document.body.classList.remove('modal-open');returnFocus?.focus({preventScroll:true})});
