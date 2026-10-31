/* Arte das cartas: uma única ilustração íntegra, com profundidade e reflexos.
   Nunca duplicar nem deformar retratos. */
(()=>{'use strict';
 const portraits=new Set(['lobo','arqueiro','soldado','colosso','guardiao','batedor','rei','liliti']);
 const spells=new Set(['chama','cura','armadilha']);
 const files={lobo:'portrait_lobo.',arqueiro:'portrait_aprendiz_arqueiro.',soldado:'portrait_aprendiz_soldado.',
  colosso:'portrait_colosso.',guardiao:'portrait_guardiao.',batedor:'portrait_batedor.',
  rei:'portrait_rei.',liliti:'portrait_lilith_ruiva.',
  chama:'spell_fire.',cura:'spell_heal.',armadilha:'spell_trap.'};
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 let flashing='',flashUntil=0;
 function detect(image){
  const src=image.getAttribute('src')||'';
  return Object.entries(files).find(([,name])=>src.includes(name))?.[0]||'';
 }
 function decorate(image,id){
  if(!image||!id)return;
  let stage=image.parentElement?.classList.contains('card-relief')?image.parentElement:null;
  if(!stage){
   stage=document.createElement('span');stage.className='card-relief';
   image.replaceWith(stage);stage.append(image);image.classList.add('card-back');image.draggable=false;
   for(const name of ['card-inner-contour','card-glass-light','card-light-sweep']){
    const layer=document.createElement('i');layer.className=name;layer.setAttribute('aria-hidden','true');stage.append(layer);
   }
  }
  // As figuras e o cenário de cada carta ficam na MESMA imagem, sem duplicações ou máscaras.
  stage.dataset.card=id;
  stage.classList.toggle('has-figure-depth',portraits.has(id));
  stage.classList.toggle('has-spell-art',spells.has(id));
  stage.style.setProperty('--crop-x',id==='lobo'?'58%':id==='liliti'?'50%':'50%');
  stage.style.setProperty('--crop-y',id==='liliti'?'21%':id==='lobo'?'45%':'42%');
  stage.querySelectorAll('.card-subject,.card-gold-outline').forEach(el=>el.remove());
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
  if(flashing===id&&performance.now()<flashUntil)stage.classList.add('is-shining');
 }
 function refresh(){
  for(const image of document.querySelectorAll('#cardGrid .tile-img>img,#hand button>img,#featuredCards .featured-card>img')){
   const button=image.closest('button'),id=button?.dataset.card||detect(image);
   if(id)decorate(image,id);
  }
  const art=document.getElementById('fullArt');
  if(art){const id=detect(art)||art.closest('.card-relief')?.dataset.card;if(id)decorate(art,id)}
 }
 function shine(id){
  flashing=id;flashUntil=performance.now()+950;
  for(const stage of document.querySelectorAll('.card-relief'))if(stage.dataset.card===id){
   stage.classList.remove('is-shining');void stage.offsetWidth;stage.classList.add('is-shining');
   setTimeout(()=>stage.classList.remove('is-shining'),950);
  }
 }
 document.addEventListener('pointermove',event=>{
  if(reduced()||event.pointerType==='touch')return;
  const stage=event.target.closest?.('.card-relief');if(!stage)return;
  const box=stage.getBoundingClientRect();
  const x=Math.max(-.5,Math.min(.5,(event.clientX-box.left)/box.width-.5));
  const y=Math.max(-.5,Math.min(.5,(event.clientY-box.top)/box.height-.5));
  stage.style.setProperty('--tilt-x',(-y*10)+'deg');
  stage.style.setProperty('--tilt-y',(x*13)+'deg');
  stage.style.setProperty('--light-x',(x+.5)*100+'%');
  stage.style.setProperty('--light-y',(y+.5)*100+'%');
 });
 document.addEventListener('pointerout',event=>{
  const stage=event.target.closest?.('.card-relief');
  if(stage&&!stage.contains(event.relatedTarget)){
   stage.style.setProperty('--tilt-x','0deg');stage.style.setProperty('--tilt-y','0deg');
  }
 });
 document.addEventListener('pointerdown',event=>{
  const stage=event.target.closest?.('.card-relief');if(!stage)return;
  if(event.pointerType==='touch'&&!reduced()){
   const box=stage.getBoundingClientRect();
   const x=Math.max(0,Math.min(1,(event.clientX-box.left)/box.width));
   const y=Math.max(0,Math.min(1,(event.clientY-box.top)/box.height));
   stage.style.setProperty('--tilt-x',(3-(y-.5)*9)+'deg');
   stage.style.setProperty('--tilt-y',(4+(x-.5)*11)+'deg');
   stage.style.setProperty('--light-x',(x*100)+'%');
   stage.style.setProperty('--light-y',(y*100)+'%');
   stage.classList.add('card-touch-3d');
  }
  shine(stage.dataset.card);
 });
 function release(event){
  if(event.pointerType!=='touch')return;
  const stage=event.target.closest?.('.card-relief');if(!stage)return;
  setTimeout(()=>{stage.classList.remove('card-touch-3d');stage.style.setProperty('--tilt-x','0deg');stage.style.setProperty('--tilt-y','0deg')},360);
 }
 document.addEventListener('pointerup',release);
 document.addEventListener('pointercancel',release);
 const observer=new MutationObserver(()=>refresh());
 function setup(){
  refresh();
  for(const id of ['cardGrid','hand','featuredCards']){
   const node=document.getElementById(id);
   if(node)observer.observe(node,{childList:true,subtree:false});
  }
 }
 window.CercoCardArt={decorate,refresh,shine};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();