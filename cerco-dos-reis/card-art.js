/* Cartas em camadas: arte original, silhueta em relevo, vidro e luz móvel. */
(()=>{'use strict';
 const shapes={
  lobo:'57% 9%,61% 15%,65% 14%,69% 19%,71% 14%,75% 23%,79% 24%,81% 30%,85% 35%,88% 39%,86% 44%,83% 45%,83% 51%,79% 54%,75% 51%,72% 56%,73% 61%,69% 63%,68% 71%,74% 83%,77% 89%,80% 93%,78% 95%,66% 95%,62% 87%,56% 78%,52% 76%,48% 85%,52% 92%,48% 95%,42% 94%,40% 83%,42% 75%,30% 72%,25% 83%,23% 91%,20% 94%,11% 94%,13% 84%,17% 73%,10% 76%,4% 71%,2% 63%,5% 56%,11% 49%,18% 45%,22% 39%,29% 34%,32% 27%,34% 32%,42% 23%,44% 18%,47% 23%,51% 16%,51% 14%,56% 16%',
  arqueiro:'47% 3%,62% 5%,68% 18%,65% 26%,80% 31%,98% 22%,96% 58%,80% 51%,70% 43%,70% 66%,87% 94%,66% 98%,51% 75%,41% 97%,17% 97%,32% 64%,24% 48%,3% 43%,3% 31%,31% 31%,35% 18%',
  soldado:'44% 3%,61% 6%,65% 23%,80% 28%,95% 36%,92% 69%,76% 74%,78% 91%,91% 95%,63% 99%,50% 73%,39% 97%,13% 98%,26% 72%,29% 56%,9% 75%,5% 70%,18% 38%,32% 28%,34% 15%',
  colosso:'40% 1%,57% 1%,66% 12%,80% 15%,95% 30%,99% 51%,86% 67%,80% 82%,91% 96%,66% 99%,50% 82%,37% 99%,9% 98%,21% 80%,16% 64%,1% 55%,3% 31%,18% 15%,33% 13%',
  guardiao:'44% 1%,57% 0%,64% 19%,76% 23%,93% 32%,91% 78%,76% 89%,86% 98%,60% 98%,49% 79%,37% 98%,14% 98%,23% 76%,18% 50%,5% 43%,9% 10%,19% 7%,18% 40%,32% 24%,36% 13%',
  batedor:'43% 2%,59% 3%,65% 19%,62% 28%,79% 31%,93% 14%,99% 20%,96% 41%,77% 48%,68% 65%,88% 92%,74% 99%,50% 79%,31% 99%,8% 97%,24% 67%,19% 48%,0% 60%,1% 46%,32% 29%,34% 16%',
  rei:'42% 1%,58% 1%,63% 16%,70% 24%,88% 30%,87% 58%,99% 91%,83% 99%,58% 98%,49% 79%,35% 99%,8% 99%,22% 73%,18% 47%,5% 88%,0% 86%,7% 45%,27% 27%,35% 20%',
  liliti:'47% 3%,53% 3%,57% 6%,59% 12%,62% 17%,63% 23%,64% 26%,62% 30%,65% 34%,72% 36%,78% 37%,81% 36%,83% 37%,83% 39%,78% 40%,72% 39%,67% 38%,68% 47%,73% 55%,74% 61%,80% 65%,83% 68%,82% 71%,77% 73%,78% 79%,86% 86%,84% 88%,88% 89%,79% 91%,60% 92%,56% 94%,49% 94%,47% 92%,32% 92%,22% 90%,6% 89%,5% 87%,12% 83%,5% 79%,3% 74%,4% 70%,8% 65%,4% 62%,2% 63%,1% 59%,4% 56%,10% 53%,5% 53%,3% 50%,2% 51%,1% 47%,1% 44%,5% 42%,13% 40%,23% 38%,28% 33%,25% 29%,22% 32%,21% 28%,20% 25%,25% 21%,28% 19%,26% 18%,29% 17%,34% 16%,36% 14%,30% 13%,34% 11%,40% 10%,43% 6%'
 };
 const crops={lobo:.80,arqueiro:.58,soldado:.52,colosso:.5,guardiao:.52,batedor:.58,rei:.5,liliti:.5};
 const files={lobo:'lobo',arqueiro:'aprendiz_arqueiro',soldado:'aprendiz_soldado',colosso:'colosso',guardiao:'guardiao',batedor:'batedor',rei:'rei',liliti:'lilith_ruiva'};
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 let flashing='',flashUntil=0;
 function fitSubject(stage){
  const image=stage.querySelector('.card-back'),copy=stage.querySelector('.card-subject img');
  if(!image?.naturalWidth||!copy||!stage.clientWidth||!stage.clientHeight)return;
  const w=stage.clientWidth,h=stage.clientHeight,scale=Math.max(w/image.naturalWidth,h/image.naturalHeight);
  const iw=image.naturalWidth*scale,ih=image.naturalHeight*scale;
  for(const [property,value]of Object.entries({width:iw+'px',height:ih+'px',left:(w-iw)*(crops[stage.dataset.card]??.5)+'px',top:(h-ih)*.4+'px'}))copy.style.setProperty(property,value,'important');
 }
 function decorate(image,id){
  if(!image||!id)return;
  let stage=image.parentElement?.classList.contains('card-relief')?image.parentElement:null;
  if(!stage){
   stage=document.createElement('span');stage.className='card-relief';
   image.replaceWith(stage);stage.append(image);image.classList.add('card-back');image.addEventListener('load',()=>fitSubject(stage));
   const subject=document.createElement('span');subject.className='card-subject';subject.setAttribute('aria-hidden','true');
   const duplicate=document.createElement('img');duplicate.alt='';duplicate.draggable=false;subject.append(duplicate);stage.append(subject);
   for(const name of ['card-inner-contour','card-glass-light','card-light-sweep']){
    const layer=document.createElement('i');layer.className=name;layer.setAttribute('aria-hidden','true');stage.append(layer);
   }
  }
  stage.dataset.card=id;stage.style.setProperty('--crop-x',((crops[id]??.5)*100)+'%');stage.style.setProperty('--figure',`polygon(${shapes[id]||'0 0,100% 0,100% 100%,0 100%'})`);
  const copy=stage.querySelector('.card-subject img');if(copy.getAttribute('src')!==image.getAttribute('src'))copy.src=image.getAttribute('src');
  if(id==='liliti'&&!stage.querySelector('.card-stardust')){
   const dust=document.createElement('span');dust.className='card-stardust';dust.setAttribute('aria-hidden','true');
   for(let n=0;n<22;n++){
    const star=document.createElement('i'),edge=n%4,p=(n*37%91)+4;
    star.style.cssText=`--sx:${edge===0?3:edge===1?97:p}%;--sy:${edge===2?3:edge===3?97:p}%;--delay:${-(n*.21)}s;--size:${n%4===0?4:2}px`;
    dust.append(star);
   }
   stage.append(dust);
  }
  stage.querySelector('.card-stardust')?.toggleAttribute('hidden',id!=='liliti');
  fitSubject(stage);
  if(flashing===id&&performance.now()<flashUntil)stage.classList.add('is-shining');
 }
 function refresh(){
  for(const image of document.querySelectorAll('#cardGrid .tile-img>img,#hand button>img,#featuredCards .featured-card>img')){
   const button=image.closest('button');let id=button?.dataset.card;
   if(!id)id=Object.entries(files).find(([,name])=>image.getAttribute('src')?.includes('portrait_'+name+'.'))?.[0];
   if(id)decorate(image,id);
  }
  const art=document.getElementById('fullArt');
  if(art){const id=Object.entries(files).find(([,name])=>art.getAttribute('src')?.includes('portrait_'+name+'.'))?.[0];if(id)decorate(art,id)}
 }
 function shine(id){
  flashing=id;flashUntil=performance.now()+950;
  for(const stage of document.querySelectorAll('.card-relief'))if(stage.dataset.card===id){
   stage.classList.remove('is-shining');requestAnimationFrame(()=>stage.classList.add('is-shining'));
   setTimeout(()=>stage.classList.remove('is-shining'),950);
  }
 }
 document.addEventListener('pointermove',event=>{
  if(reduced()||event.pointerType==='touch')return;
  const stage=event.target.closest('.card-relief');if(!stage)return;
  const box=stage.getBoundingClientRect(),x=(event.clientX-box.left)/box.width-.5,y=(event.clientY-box.top)/box.height-.5;
  stage.style.setProperty('--tilt-x',(-y*9)+'deg');stage.style.setProperty('--tilt-y',(x*12)+'deg');
  stage.style.setProperty('--light-x',(x+.5)*100+'%');stage.style.setProperty('--light-y',(y+.5)*100+'%');
 });
 document.addEventListener('pointerout',event=>{const stage=event.target.closest('.card-relief');if(stage&&!stage.contains(event.relatedTarget)){stage.style.setProperty('--tilt-x','0deg');stage.style.setProperty('--tilt-y','0deg')}});
 document.addEventListener('pointerdown',event=>{const stage=event.target.closest('.card-relief');if(stage)shine(stage.dataset.card)});
 window.addEventListener('resize',()=>requestAnimationFrame(()=>document.querySelectorAll('.card-relief').forEach(fitSubject)),{passive:true});
 const observer=new MutationObserver(()=>refresh());
 function setup(){refresh();for(const id of ['cardGrid','hand','featuredCards']){const node=document.getElementById(id);if(node)observer.observe(node,{childList:true,subtree:false})}}
 window.CercoCardArt={decorate,refresh,shine};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
