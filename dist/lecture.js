/* Only graph headings respond to reading progress. */
(()=>{
 for(const br of document.querySelectorAll('.title-frame h2 br')){const gap=document.createElement('span');gap.className='mobile-title-space';gap.textContent=' ';br.after(gap)}
 const titles=[...document.querySelectorAll('.title-frame')];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let frame=0;
 function update(){
  frame=0;
  for(const title of titles){
   if(title.closest('[hidden]'))continue;
   const t=Math.max(0,Math.min(1,(innerHeight-title.getBoundingClientRect().top)/(innerHeight*.58)));
   const progress=reduced.matches?1:t*t*(3-2*t);
   title.style.setProperty('--reading-scale',.80+.20*progress);
   title.style.setProperty('--title-weight',Math.round(5+3*progress)*100);
  }
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(update)}
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);
 reduced.addEventListener('change',schedule);document.querySelector('.top-tabs').addEventListener('click',schedule);
 document.fonts.ready.then(schedule);update();
})();
