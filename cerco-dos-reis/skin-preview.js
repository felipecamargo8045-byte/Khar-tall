/* Provador real de skins: usa os MESMOS modelos, cores de tecido e materiais
   de arena3d.js. Um único WebGL renderer evita oito contextos no Android. */
import * as THREE from './vendor/three.module.js';
import {createCharacter,characterProfiles} from './character-models.js?v=2';

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
let renderer=null,scene=null,camera=null,actor=null;
let lastRender=0,started=false,frameRequest=0,available=false,rendering=false;
const mat=(color,metalness=.08,roughness=.83)=>new THREE.MeshStandardMaterial({color,metalness,roughness,flatShading:false});
const skin=()=>skins.find(s=>s.id===chosenSkin)||skins[0];
const active=()=>!!document.querySelector('.page[data-page="shop"].active')&&!document.hidden;

function clearActor(){
 if(!actor)return;
 scene.remove(actor);
 actor.traverse(obj=>{
  if(!obj.isMesh)return;
  obj.geometry?.dispose();
  for(const material of Array.isArray(obj.material)?obj.material:[obj.material])material?.dispose();
 });
 actor=null;
}
function makeActor(character){
 clearActor();
 const selected=skin();
 const color=selected?.color||'#2c78a8';
 // A arena aplica esse mesmo color em toda a roupa do exército aliado.
 const outfit=(team,base,metalness=.08)=>mat(team==='ally'?color:(base??0x2c78a8),metalness);
 actor=createCharacter(character,'ally',{mat,outfit,outfitMaterials:new Set()});
 actor.scale.setScalar(characterProfiles[character].scale);
 actor.updateMatrixWorld(true);scene.add(actor);
 const bounds=new THREE.Box3().setFromObject(actor),size=bounds.getSize(new THREE.Vector3());
 const center=bounds.getCenter(new THREE.Vector3());
 const height=Math.max(size.y*1.46,size.x*1.65,size.z*1.2,.88);
 const aspect=renderer.domElement.width/Math.max(1,renderer.domElement.height);
 camera.left=-height*.5*aspect;camera.right=height*.5*aspect;
 camera.top=height*.5;camera.bottom=-height*.5;camera.updateProjectionMatrix();
 camera.position.set(center.x+height*.75,center.y+height*.30,center.z+height*2.35);
 camera.lookAt(center);camera.updateProjectionMatrix();
 return actor;
}
function renderSelected(character,rotation=0){
 if(!available)return;
 makeActor(character);
 actor.rotation.y=rotation;
 renderer.render(scene,camera);
}
function renderCards(){
 if(!available||rendering)return;
 rendering=true;
 const chosen=chosenCharacter;
 try{
  renderer.setSize(172,190,false);
  for(const item of roster){
   renderSelected(item.id,item.id==='lobo'?.12:-.16);
   const image=cards.querySelector('[data-skin-character="'+item.id+'"] img');
   if(image){
    image.src=renderer.domElement.toDataURL('image/png');
    image.classList.add('skin-character-3d-shot');
    image.alt='Modelo 3D de '+item.name+' com a skin '+skin().name;
   }
  }
  renderer.setSize(350,390,false);
  renderSelected(chosen,-.12);
 }catch(error){
  console.warn('Miniaturas 3D de skins indisponíveis',error);
  renderer.setSize(350,390,false);
  renderSelected(chosen,-.12);
 }finally{rendering=false}
}
function updateBuy(){
 const state=window.CercoStore?.snapshot?.()||{owned:[],equipped:null};
 const item=skin();
 buy.dataset.cercoBuy=item.id;
 buy.textContent=state.equipped===item.id?'EQUIPADA':
   state.owned?.includes(item.id)?'EQUIPAR SKIN':'COMPRAR SKIN · R$ 2,50';
 buy.disabled=state.equipped===item.id;
 $('skinPreviewPrice').textContent=state.owned?.includes(item.id)?'Já está na sua coleção':'R$ 2,50 · compra única';
}
function updateSelection(){
 const chosen=skin();
 if(!chosen)return;
 $('skinPreviewName').textContent=chosen.name;
 $('skinPreviewName').style.color=chosen.color;
 $('skinPreviewCharacter').textContent=roster.find(r=>r.id===chosenCharacter)?.name||'';
 $('skinPreviewPanel').style.setProperty('--preview-color',chosen.color);
 cards.querySelectorAll('[data-skin-character]').forEach(button=>{
  const active=button.dataset.skinCharacter===chosenCharacter;
  button.classList.toggle('selected',active);
  button.setAttribute('aria-pressed',String(active));
 });
 document.querySelectorAll('[data-skin-preview]').forEach(button=>{
  const active=button.dataset.skinPreview===chosenSkin;
  button.classList.toggle('selected',active);
  button.setAttribute('aria-pressed',String(active));
 });
 updateBuy();
}
function selectSkin(id){
 if(!skins.some(s=>s.id===id))return false;
 const changed=chosenSkin!==id;
 chosenSkin=id;
 updateSelection();
 if(available){
  if(changed)renderCards();
  else renderSelected(chosenCharacter,-.12);
 }
 return true;
}
function selectCharacter(id){
 if(!roster.some(r=>r.id===id))return false;
 chosenCharacter=id;updateSelection();
 if(available)renderSelected(chosenCharacter,-.12);
 return true;
}
function setupUI(){
 for(const item of roster){
  const button=document.createElement('button');button.type='button';
  button.className='skin-character-option';
  button.dataset.skinCharacter=item.id;button.setAttribute('aria-label','Ver skin no personagem '+item.name);
  const picture=document.createElement('img');
  picture.src='./origem-apk/assets/'+item.art;picture.alt='Arte de '+item.name;
  picture.loading='lazy';
  const label=document.createElement('span');label.textContent=item.name;
  button.append(picture,label);cards.append(button);
 }
 cards.addEventListener('click',event=>{
  const button=event.target.closest('[data-skin-character]');
  if(button)selectCharacter(button.dataset.skinCharacter);
 });
 document.addEventListener('click',event=>{
  const tile=event.target.closest('[data-skin-preview]');
  if(!tile)return;
  event.preventDefault();
  document.querySelector('#navigation [data-view="shop"]')?.click();
  selectSkin(tile.dataset.skinPreview);
  $('skinPreviewPanel')?.scrollIntoView({block:'nearest',behavior:'smooth'});
 });
 document.addEventListener('cerco:collection',updateBuy);
 updateSelection();
}
function initialize3D(){
 if(!host||!cards||!skins.length)return;
 try{
  renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  renderer.setSize(350,390,false);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.4;
  renderer.domElement.setAttribute('aria-label','Prévia tridimensional da roupa do personagem');
  renderer.domElement.style.cssText='width:100%;height:100%;display:block';
  host.append(renderer.domElement);
  scene=new THREE.Scene();
  camera=new THREE.OrthographicCamera(-1,1,1,-1,.01,90);
  scene.add(new THREE.HemisphereLight(0xe3ecff,0x273348,2.7));
  const key=new THREE.DirectionalLight(0xffe8c5,2.5);key.position.set(3,7,6);scene.add(key);
  const rim=new THREE.DirectionalLight(0x80c6f6,1.7);rim.position.set(-5,3,-4);scene.add(rim);
  available=true;
  renderCards();
  $('skinPreviewFallback').hidden=true;
  $('skinPreview3D').hidden=false;
  $('skinPreviewStatus').textContent='Modelo 3D da arena · toque nos personagens para comparar';
  startLoop();
 }catch(error){
  console.warn('Prévia de skins em 3D indisponível neste aparelho',error);
  available=false;
  if(renderer){renderer.dispose();renderer=null}
  $('skinPreview3D').hidden=true;
  $('skinPreviewFallback').hidden=false;
  $('skinPreviewStatus').textContent='Seu aparelho não permitiu carregar a prévia 3D. As imagens abaixo mostram a arte original.';
 }
}
function startLoop(){
 if(started)return;started=true;
 function tick(now){
  frameRequest=requestAnimationFrame(tick);
  if(!available||!actor||!active()||rendering||now-lastRender<65)return;
  lastRender=now;
  actor.rotation.y=Math.sin(now*.00036)*.32-.12;
  renderer.render(scene,camera);
 }
 frameRequest=requestAnimationFrame(tick);
}
function setup(){
 if(!host||!cards||!buy||!skins.length)return;
 setupUI();
 initialize3D();
}
window.CercoSkinPreview={
 selectSkin,selectCharacter,
 status:()=>({skin:chosenSkin,character:chosenCharacter,available,
  thumbnails:cards?.querySelectorAll('img.skin-character-3d-shot').length||0,
  characters:roster.map(c=>c.id),buyId:buy?.dataset.cercoBuy})
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
else setup();
