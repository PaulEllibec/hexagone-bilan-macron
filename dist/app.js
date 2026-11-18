const sections=[...document.querySelectorAll('.foreword, .slide-section')];
const header=document.querySelector('.topbar');
const tabs=[...document.querySelectorAll('.top-tab')];
let currentGroup='Finances publiques';
let scheduled=false;
new ResizeObserver(()=>{const height=header.getBoundingClientRect().height;document.documentElement.style.scrollPaddingTop=(height+18)+'px';document.body.style.paddingTop=height+'px'}).observe(header);
function updateReading(){
 scheduled=false;
 const visible=sections.filter(section=>!section.hidden);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 for(const section of visible){for(const frame of section.querySelectorAll('.title-frame')){const top=frame.getBoundingClientRect().top;const progress=Math.max(0,Math.min(1,(innerHeight-top)/(innerHeight*.62)));frame.querySelector('h2').style.transform='scale('+(reduced?1:.82+.18*progress)+')'}}
 let active=visible[0];
 for(const section of visible){if(section.getBoundingClientRect().top<=innerHeight*.4)active=section;else break}
 document.getElementById('progress-fill').style.width=((visible.indexOf(active)+1)/visible.length*100)+'%';
}
function selectGroup(group,scroll=true){
 currentGroup=group;
 sections.forEach(section=>{section.hidden=section.dataset.group!==group});
 document.querySelector('.intro').hidden=group==='Avant-propos';
 tabs.forEach(tab=>{const selected=tab.dataset.group===group;tab.classList.toggle('active',selected);if(selected)tab.setAttribute('aria-current','page');else tab.removeAttribute('aria-current')});
 if(scroll)window.scrollTo({top:0,behavior:'instant'});
 requestAnimationFrame(()=>{updateReading();window.dispatchEvent(new Event('resize'))});
}
tabs.forEach(tab=>tab.addEventListener('click',event=>{event.preventDefault();selectGroup(tab.dataset.group)}));
addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(updateReading)}},{passive:true});
selectGroup('Finances publiques');
