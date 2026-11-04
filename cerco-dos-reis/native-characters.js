import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {clone} from './vendor/SkeletonUtils.js';

// Arquivos locais do jogo. Nenhum serviço de geração participa da partida.
const assets={
 field:new URL('./models/soldado-refinado-campo.glb',import.meta.url),
 studio:new URL('./models/soldado-refinado.glb',import.meta.url)
};
const sources=new Map(),pending=new Map();
export function prepareCharacterModels(variant='field'){
 if(!assets[variant])return Promise.resolve(false);
 if(pending.has(variant))return pending.get(variant);
 const task=(async()=>{
  let timer;
  try{
   const model=await Promise.race([
    new GLTFLoader().loadAsync(assets[variant].href),
    new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Tempo de carregamento do modelo excedido')),10000)})
   ]);
   sources.set(variant,model);return true;
  }catch(error){console.warn('Modelo articulado indisponível; usando o modelo compatível.',error);return false}
  finally{clearTimeout(timer)}
 })();
 pending.set(variant,task);return task;
}
export function createNativeCharacter(id,team,context,profile){
 const source=id==='soldado'&&sources.get(context.modelQuality||'field');
 return source?createSkinnedCharacter(source,id,team,context,profile):null;
}

export function createSkinnedCharacter(source,id,team,context,profile){
 const model=new THREE.Group(),body=clone(source.scene),materials=new Map();
 model.name=id;model.add(body);
 body.traverse(mesh=>{
  if(!mesh.isMesh)return;
  mesh.castShadow=true;mesh.receiveShadow=true;
  // Os limites do corpo mudam durante o golpe e a caminhada.
  mesh.frustumCulled=false;
  const copy=original=>{
   if(materials.has(original))return materials.get(original);
   let material;
   if(original.userData.skin_region==='cloth'){
    const dye=context.outfit(team,team==='ally'?0x2c78a8:0x9e3d50,original.metalness);
    material=original.clone();material.color.copy(dye.color);
    material.userData={...original.userData,...dye.userData};
    context.outfitMaterials?.delete(dye);dye.dispose();
    const factor=original.name.includes('sob a armadura')?.22:1;
    material.userData.dyeFactor=factor;material.color.multiplyScalar(factor);
    if(team==='ally')context.outfitMaterials?.add(material);
   }else material=original.clone();
   materials.set(original,material);return material;
  };
  mesh.material=Array.isArray(mesh.material)?mesh.material.map(copy):copy(mesh.material);
 });
 const mixer=new THREE.AnimationMixer(body),clips=new Map(source.animations.map(clip=>[clip.name,clip]));
 model.userData={id,profile,hasWolf:false,legs:[],arms:[],knees:[],elbows:[],cloaks:[],hair:[],magicHands:[],drapes:[],eyes:[],
  nativeAnimation:{mixer,clips,body,materials:[...materials.values()],current:null,action:null,lastClock:null,lastPulse:0,lastHp:null,hitUntil:0}};
 animateNativeCharacter(model,{clock:0});
 // A pose de espera, não a pose de vínculo com braços abertos, define o piso.
 body.updateMatrixWorld(true);
 body.traverse(mesh=>{if(mesh.isSkinnedMesh){mesh.skeleton.update();mesh.computeBoundingBox()}});
 const bounds=new THREE.Box3().setFromObject(body,true);
 body.position.y-=bounds.min.y;
 model.updateMatrixWorld(true);
 return model;
}

export function animateNativeCharacter(model,{clock=0,walking=false,attackPulse=0,stagger=false,hp=null}={}){
 const state=model.userData.nativeAnimation;if(!state)return false;
 const dt=state.lastClock===null?0:Math.max(0,Math.min(.1,clock-state.lastClock));state.lastClock=clock;
 if(hp!==null&&state.lastHp!==null&&hp<state.lastHp)state.hitUntil=clock+.28;
 if(hp!==null)state.lastHp=hp;
 const name=stagger||clock<state.hitUntil?'Hit':attackPulse>0?'Attack':walking?'Walk':'Idle';
 const repeatedAttack=name==='Attack'&&attackPulse>state.lastPulse+.01;
 if(name!==state.current||repeatedAttack){
  const clip=state.clips.get(name)||state.clips.get('Idle'),previous=state.action;
  const action=state.mixer.clipAction(clip);
  action.reset().setLoop(name==='Idle'||name==='Walk'?THREE.LoopRepeat:THREE.LoopOnce,Infinity);
  action.clampWhenFinished=true;action.enabled=true;action.setEffectiveWeight(1).play();
  if(previous&&previous!==action){previous.fadeOut(.08);action.fadeIn(.08)}
  state.current=name;state.action=action;
 }
 state.lastPulse=attackPulse;state.mixer.update(dt);
 // A pose inicial é solicitada com clock=0; o primeiro quadro real não deve saltar.
 model.updateMatrixWorld(true);
 return true;
}

export function disposeNativeCharacter(model,outfitMaterials){
 const state=model.userData.nativeAnimation;if(!state)return;
 state.mixer.stopAllAction();state.mixer.uncacheRoot(state.body);
 for(const material of state.materials){outfitMaterials?.delete(material);material.dispose()}
 const skeletons=new Set();state.body.traverse(mesh=>{if(mesh.isSkinnedMesh)skeletons.add(mesh.skeleton)});
 for(const skeleton of skeletons)skeleton.dispose();
}
