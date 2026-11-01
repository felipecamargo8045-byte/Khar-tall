/* Provador real de skins: usa os MESMOS modelos, cores de tecido e materiais
   de arena3d.js. Um único WebGL renderer evita oito contextos no Android. */
import * as THREE from './vendor/three.module.js';
import {createCharacter,characterProfiles,animateCharacterSurfaces} from './character-models.js?v=3';
import {animateCloth} from './character-cloth.js?v=2';
import {characterStudio} from './character-studio.js?v=1';

const roster=[
 {id:'lobo',name:'Lobo',art:'portrait_lobo.webp'},
 {id:'arqueiro',name:'Arqueiro',art:'portrait_aprendiz_arqueiro.webp'},
 {id:'soldado',name:'Soldado',art:'portrait_aprendiz_soldado.webp'},
 {id:'colosso',name:'Colosso',art:'portrait_colosso.webp'},
 {id:'guardiao',name:'Guardião',art:'portrait_guardiao.webp'},
 {id:'batedor',name:'Batedor',art:'portrait_batedor.webp'},
 {id:'rei',name:'Rei',art:'portrait_rei.webp'},
 {id:'liliti',name:'Liliti',art:'portrait_lilith_ruiva.webp'}
];
const skins=window.CercoRewards?.skins||[];
const $=id=>document.getElementById(id);
const host=$('skinPreview3D'),cards=$('skinCharacterGrid'),buy=$('skinPreviewBuy');
let chosenSkin=skins[0]?.id||'',chosenCharacter='soldado';
let renderer,scene,camera,studio,actor,available=false,starting=false,rendering=false,frameRequest=0,lastRender=0;
let rotation=-.16,rotating=false,comparing=false,drag=null,lastClock=0,inView=true;
const actors=new Map(),outfitMaterials=new Set();
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const mat=(color,metalness=.08,roughness=.83)=>new THREE.MeshStandardMaterial({color,metalness,roughness,flatShading:false});
const skin=()=>skins.find(s=>s.id===chosenSkin)||skins[0];
const active=()=>!!document.querySelector('.page[data-page="shop"].active')&&!document.hidden;
function pose(model,clock){
 const data=model.userData;
 if(data.hasWolf){data.head.rotation.x=Math.sin(clock*.8)*.035;data.tail.rotation.y=Math.sin(clock*1.3)*.09;}
 else{
  data.legs.forEach((leg,i)=>{leg.rotation.x=i===0?-.025:.025});
  data.knees?.forEach(knee=>{knee.rotation.x=.045});
  data.arms.forEach((arm,i)=>{arm.rotation.z=(i===0?1:-1)*(data.id==='liliti'?.075:.035);arm.rotation.x=data.id==='arqueiro'?-.12:-.035});
  data.elbows?.forEach((elbow,i)=>{elbow.rotation.x=data.id==='liliti'?-.27:data.id==='batedor'?-.30:i===0?-.13:-.05});
  data.hair?.forEach((strand,i)=>{strand.rotation.x=Math.sin(clock*1.7+i*.43)*.025;strand.rotation.z=Math.sin(clock*1.3+i)*.016});
 }
 if(data.body){data.body.rotation.x=Math.sin(clock*1.4)*.003;data.body.rotation.z=Math.sin(clock*.9)*.004}
 animateCloth(data.cloaks,clock,false,0);animateCharacterSurfaces(model,clock,false,0);
}
function getActor(id){
 if(actors.has(id))return actors.get(id);
 const color=skin().color;
 const outfit=(team,base,metalness=.08)=>{const m=mat(team==='ally'?color:base??0x2c78a8,metalness);m.userData.defaultColor=base??0x2c78a8;outfitMaterials.add(m);return m};
 const model=createCharacter(id,'ally',{mat,outfit,outfitMaterials});
 model.scale.setScalar(characterProfiles[id].scale);pose(model,0);
 model.traverse(mesh=>{if(mesh.isMesh){mesh.castShadow=true;mesh.receiveShadow=true}});
 scene.add(model);actors.set(id,model);return model;
}
function frameActor(id,width,height,yaw=rotation){
 actors.forEach(model=>{model.visible=false});actor=getActor(id);actor.visible=true;actor.rotation.y=yaw;actor.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(actor),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 const aspect=width/height,fov=THREE.MathUtils.degToRad(camera.fov);
 const distance=Math.max(size.y/(2*Math.tan(fov/2)),size.x/(2*Math.tan(fov/2)*aspect),size.z*.8)*1.22;
 camera.aspect=aspect;camera.position.set(center.x+distance*.34,center.y+distance*.13,center.z+distance*.98);
 camera.lookAt(center.x,center.y+.015,center.z);camera.updateProjectionMatrix();
 studio.plinth.scale.setScalar(id==='lobo'?1.04:id==='colosso'?1.05:.94);
 studio.plinth.position.y=Math.min(0,bounds.min.y)-.005;
 renderer.shadowMap.needsUpdate=true;
}
function drawSelected(refit=true){
 if(!available)return;
 const width=Math.max(220,host.clientWidth||350),height=Math.max(240,host.clientHeight||390);
 renderer.setSize(width,height,false);
 if(refit)frameActor(chosenCharacter,width,height);
 renderer.render(scene,camera);
}
async function renderCards(){
 if(!available||rendering)return;rendering=true;
 try{
  renderer.setSize(172,196,false);
  for(const item of roster){
   frameActor(item.id,172,196,-.10);renderer.render(scene,camera);
   const image=cards.querySelector('[data-skin-character="'+item.id+'"] img');
   if(image){image.src=renderer.domElement.toDataURL('image/png');image.classList.add('skin-character-3d-shot');image.alt=item.name+' com a skin '+skin().name;}
  }
 }catch(error){console.warn('Não foi possível atualizar uma miniatura de skin.',error)}
 finally{rendering=false;drawSelected();startLoop()}
}
function updateBuy(){
 const state=window.CercoStore?.snapshot?.()||{owned:[],equipped:null},item=skin();if(!item)return;
 buy.dataset.cercoBuy=item.id;buy.textContent=state.equipped===item.id?'EQUIPADA':state.owned?.includes(item.id)?'EQUIPAR SKIN':'COMPRAR '+item.name.toLocaleUpperCase('pt-BR')+' · R$ 2,50';
 buy.setAttribute('aria-label',(state.owned?.includes(item.id)?'Equipar':'Comprar')+' skin '+item.name+' por R$ 2,50');buy.disabled=state.equipped===item.id;$('skinPreviewPrice').textContent=state.owned?.includes(item.id)?'Já está na sua coleção':'R$ 2,50 · compra única';
}
function updateSelection(){
 const chosen=skin();if(!chosen)return;
 $('skinPreviewName').textContent=chosen.name;$('skinPreviewName').style.color=chosen.color;
 $('skinPreviewCharacter').textContent=roster.find(r=>r.id===chosenCharacter)?.name||'';
 $('skinPreviewPanel').style.setProperty('--preview-color',chosen.color);
 for(const button of cards.querySelectorAll('[data-skin-character]')){const selected=button.dataset.skinCharacter===chosenCharacter;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected))}
 for(const button of document.querySelectorAll('[data-skin-preview]')){const selected=button.dataset.skinPreview===chosenSkin;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected))}
 const reference=$('skinPreviewFallback'),item=roster.find(r=>r.id===chosenCharacter);reference.src='./origem-apk/assets/'+item.art;reference.alt='Arte original de '+item.name;
 updateBuy();
}
function selectSkin(id){
 if(!skins.some(s=>s.id===id))return false;
 const changed=id!==chosenSkin,wasAvailable=available;chosenSkin=id;updateSelection();ensure3D();
 if(available&&wasAvailable){for(const material of outfitMaterials)material.color.set(skin().color).multiplyScalar(material.userData.dyeFactor??1);if(changed)renderCards();else drawSelected()}
 return true;
}
function selectCharacter(id){
 if(!roster.some(r=>r.id===id))return false;
 chosenCharacter=id;rotation=-.16;updateSelection();ensure3D();if(available)drawSelected();return true;
}
function updateComparison(){
 $('skinPreviewFallback').hidden=available&&!comparing;host.hidden=!available||comparing;
 $('skinPreviewCompare').textContent=comparing?'Voltar ao modelo':'Comparar com a arte';
 $('skinPreviewCompare').setAttribute('aria-pressed',String(comparing));
 $('skinPreviewStatus').textContent=available?(comparing?'Arte original do personagem':'Arraste para girar · tecido e detalhes em 3D'):'A prévia 3D não está disponível neste aparelho. Exibindo a arte original.';
}
function startLoop(){
 if(frameRequest||!available||!active()||!inView)return;
 function tick(now){
  frameRequest=0;if(!active()||!inView)return;frameRequest=requestAnimationFrame(tick);
  if(!actor||rendering||comparing||now-lastRender<50)return;
  const dt=Math.min(.08,(now-lastClock)/1000||.05);lastClock=now;lastRender=now;
  const clock=reduced()?0:now/1000;
  if(rotating&&!drag&&!reduced())rotation+=dt*.35;
  actor.rotation.y=rotation;pose(actor,clock);renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);
 }
 frameRequest=requestAnimationFrame(tick);
}
function ensure3D(){
 if(available){startLoop();return}if(starting||!active()||!host)return;starting=true;
 try{
  renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.setSize(350,390,false);
  renderer.domElement.setAttribute('aria-label','Personagem com a skin selecionada; arraste para girar');
  renderer.domElement.style.cssText='width:100%;height:100%;display:block;touch-action:pan-y;cursor:grab';host.append(renderer.domElement);
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(30,350/390,.02,35);studio=characterStudio(renderer,scene);
  available=true;renderCards();updateComparison();startLoop();
  const canvas=renderer.domElement;
  canvas.addEventListener('pointerdown',event=>{drag={x:event.clientX,y:event.clientY,rotation};canvas.setPointerCapture(event.pointerId)});
  canvas.addEventListener('pointermove',event=>{if(!drag)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(Math.abs(dx)>Math.abs(dy)){rotation=drag.rotation+dx*.010;canvas.style.cursor='grabbing'}});
  const release=()=>{drag=null;canvas.style.cursor='grab'};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
 }catch(error){console.warn('Prévia 3D indisponível neste aparelho.',error);available=false;renderer?.dispose();renderer=null;updateComparison()}
}
function setup(){
 if(!host||!cards||!buy||!skins.length)return;
 for(const item of roster){
  const button=document.createElement('button');button.type='button';button.className='skin-character-option';button.dataset.skinCharacter=item.id;button.setAttribute('aria-label','Ver skin no personagem '+item.name);
  const image=document.createElement('img');image.src='./origem-apk/assets/'+item.art;image.alt=item.name;image.loading='lazy';
  const label=document.createElement('span');label.textContent=item.name;button.append(image,label);cards.append(button);
 }
 cards.addEventListener('click',event=>{const button=event.target.closest('[data-skin-character]');if(button)selectCharacter(button.dataset.skinCharacter)});
 document.addEventListener('click',event=>{const tile=event.target.closest('[data-skin-preview]');if(!tile)return;event.preventDefault();document.querySelector('#navigation [data-view="shop"]')?.click();selectSkin(tile.dataset.skinPreview);$('skinPreviewPanel').scrollIntoView({block:'nearest',behavior:reduced()?'instant':'smooth'})});
 $('skinPreviewRotate').addEventListener('click',()=>{rotating=!rotating;$('skinPreviewRotate').textContent=rotating?'Pausar giro':'Girar modelo';$('skinPreviewRotate').setAttribute('aria-pressed',String(rotating));startLoop()});
 $('skinPreviewCompare').addEventListener('click',()=>{comparing=!comparing;updateComparison();if(!comparing){drawSelected();startLoop()}});
 new MutationObserver(()=>{if(active()){ensure3D();startLoop()}}).observe(document.querySelector('.page[data-page="shop"]'),{attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',()=>{if(active())startLoop()});window.addEventListener('resize',()=>{if(available&&active())drawSelected()},{passive:true});
 new IntersectionObserver(entries=>{inView=entries[0]?.isIntersecting!==false;if(inView)startLoop()},{rootMargin:'100px'}).observe(host);
 document.addEventListener('cerco:collection',updateBuy);updateSelection();if(active())ensure3D();
}
window.CercoSkinPreview={selectSkin,selectCharacter,status:()=>({skin:chosenSkin,character:chosenCharacter,available,rotating,comparing,
 thumbnails:cards?.querySelectorAll('img.skin-character-3d-shot').length||0,characters:roster.map(c=>c.id),buyId:buy?.dataset.cercoBuy,
 model:actor?{height:new THREE.Box3().setFromObject(actor).getSize(new THREE.Vector3()).y,drapes:actor.userData.drapes?.length||0,hair:actor.userData.hair?.length||0}:null})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
