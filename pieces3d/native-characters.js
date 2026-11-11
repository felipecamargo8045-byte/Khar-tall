import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {clone} from './vendor/SkeletonUtils.js';
import {MeshoptDecoder} from './vendor/meshopt_decoder.module.js';

// Arquivos locais do jogo. Nenhum serviço de geração participa da partida.
export const nativeCharacterIds=Object.freeze(['lobo','arqueiro','soldado','colosso','guardiao','batedor','rei','rei-sangue']);
const modelRevisions=Object.freeze({lobo:33,colosso:34,rei:28,'rei-sangue':28});
const qualities=new Set(['field','studio']);
const sources=new Map(),pending=new Map(),floorBySource=new WeakMap();
const previewDyes=new WeakMap();
async function loadCharacter(id,variant){
 const key=variant+':'+id;
 if(sources.has(key))return true;
 if(pending.has(key))return pending.get(key);
 const task=(async()=>{
  let timer;
  try{
   const url=new URL('./models/'+id+'-refinado'+(variant==='field'?'-campo':'')+'.glb?v='+(modelRevisions[id]??7),import.meta.url);
   const model=await Promise.race([
    new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url.href),
    new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Tempo de carregamento do modelo excedido')),variant==='studio'?30000:10000)})
   ]);
   sources.set(key,model);return true;
  }catch(error){console.warn('Modelo de '+id+' indisponível; usando o modelo compatível.',error);return false}
  finally{clearTimeout(timer)}
 })();
 pending.set(key,task);
 try{return await task}finally{pending.delete(key)}
}
export async function prepareCharacterModels(variant='field',ids=nativeCharacterIds){
 if(!qualities.has(variant))return false;
 const queue=[...new Set(ids)].filter(id=>nativeCharacterIds.includes(id)),results=[];
 // Duas transferências por vez evitam disputar toda a conexão do celular.
 async function worker(){while(queue.length)results.push(await loadCharacter(queue.shift(),variant))}
 await Promise.all([worker(),worker()]);
 return results.length>0&&results.every(Boolean);
}
export function createNativeCharacter(id,team,context,profile){
 const quality=context.modelQuality||'field';
 const source=sources.get(quality+':'+id)||(quality==='studio'&&sources.get('field:'+id));
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
   const region=original.userData.skin_region;
   const dyes=region==='cloth'&&(context.originalColors||!original.userData.preview_only);
   if(dyes||region==='armor'&&context.originalColors){
    const tint=original.userData.team_tint??(id==='colosso'?1:.83);
    const factor=original.name.includes('sob a armadura')?.22:tint;
    material=original.clone();material.userData.dyeFactor=factor;
    if(context.originalColors){
     material.userData.originalColor=original.color.getHex();
    }else{
     const dye=context.outfit(team,team==='ally'?0x2c5786:0x843944,original.metalness);
     material.color.copy(dye.color).multiplyScalar(factor);
     material.userData={...material.userData,...dye.userData};
     context.outfitMaterials?.delete(dye);dye.dispose();
    }
    if(team==='ally')context.outfitMaterials?.add(material);
   }else material=original.clone();
   materials.set(original,material);return material;
  };
  mesh.material=Array.isArray(mesh.material)?mesh.material.map(copy):copy(mesh.material);
 });
 const mixer=new THREE.AnimationMixer(body),clips=new Map(source.animations.map(clip=>[clip.name,clip]));
 model.userData={id,profile,hasWolf:false,legs:[],arms:[],knees:[],elbows:[],cloaks:[],hair:[],magicHands:[],drapes:[],eyes:[],
  nativeAnimation:{mixer,clips,body,materials:[...materials.values()],current:null,action:null,lastClock:null,lastPulse:0,lastAttack:0,lastHp:null,hitUntil:0}};
 animateNativeCharacter(model,{clock:0});
 // A pose de espera, não a pose de vínculo com braços abertos, define o piso.
 if(!floorBySource.has(source)){
  body.updateMatrixWorld(true);
  body.traverse(mesh=>{if(mesh.isSkinnedMesh){mesh.skeleton.update();mesh.computeBoundingBox()}});
  floorBySource.set(source,new THREE.Box3().setFromObject(body,true).min.y);
 }
 body.position.y-=floorBySource.get(source);
 model.updateMatrixWorld(true);
 return model;
}

export function setNativePreviewColor(material,color){
 const {preview_dye:mode,originalColor,dyeFactor}=material.userData;
 if(!mode){
  if(color===null)material.color.setHex(originalColor);
  else material.color.set(color).multiplyScalar(dyeFactor);
  return;
 }
 let dye=previewDyes.get(material);
 if(!dye){
  if(color===null)return;
  dye={color:{value:new THREE.Color()},amount:{value:0}};
  previewDyes.set(material,dye);
  const embroidered=mode==='embroidery';
  // The gold threads in the silk maps have a higher green-to-red ratio than the wine fabric.
  const coverage=embroidered?'1.0 - smoothstep(0.14, 0.245, diffuseColor.g / max(diffuseColor.r, 0.0001))':'1.0';
  const shade=embroidered?'clamp(0.16 + 10.0 * diffuseColor.r, 0.16, 0.94)'
   :'clamp(0.24 + 1.95 * dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)), 0.24, 0.94)';
  material.onBeforeCompile=shader=>{
   shader.uniforms.cercoPreviewColor=dye.color;
   shader.uniforms.cercoPreviewAmount=dye.amount;
   shader.fragmentShader='uniform vec3 cercoPreviewColor;\nuniform float cercoPreviewAmount;\n'
    +shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    diffuseColor.rgb = mix(diffuseColor.rgb, cercoPreviewColor * (${shade}),
                          cercoPreviewAmount * (${coverage}));`);
  };
  material.customProgramCacheKey=()=>`cerco-preview-dye-${mode}`;
  material.needsUpdate=true;
 }
 dye.amount.value=color===null?0:1;
 if(color!==null)dye.color.value.set(color);
}

export function animateNativeCharacter(model,{clock=0,walking=false,attackPulse=0,attackId=0,attackDuration=.58,attackTime=null,walkRate=1,stagger=false,hp=null,dying=false}={}){
 const state=model.userData.nativeAnimation;if(!state)return false;
 const dt=state.lastClock===null?0:Math.max(0,Math.min(.1,clock-state.lastClock));state.lastClock=clock;
 if(hp!==null&&state.lastHp!==null&&hp<state.lastHp)state.hitUntil=clock+.28;
 if(hp!==null)state.lastHp=hp;
 const name=dying?'Death':stagger||clock<state.hitUntil?'Hit':attackPulse>0?'Attack':walking?'Walk':'Idle';
 const repeatedAttack=name==='Attack'&&(attackId!==state.lastAttack||attackPulse>state.lastPulse+.01);
 if(name!==state.current||repeatedAttack){
  const clip=state.clips.get(name)||state.clips.get('Idle'),previous=state.action;
  const action=state.mixer.clipAction(clip);
  action.reset().setLoop(name==='Idle'||name==='Walk'?THREE.LoopRepeat:THREE.LoopOnce,Infinity);
  action.clampWhenFinished=true;action.enabled=true;action.setEffectiveWeight(1).play();
  // O golpe completo acompanha o tempo visual do combate, mesmo em clipes longos.
  action.setEffectiveTimeScale(name==='Attack'?clip.duration/Math.max(.1,attackDuration):name==='Hit'?clip.duration/.14:name==='Death'?clip.duration/.76:1);
  if(previous&&previous!==action){previous.fadeOut(.08);action.fadeIn(.08)}
  state.current=name;state.action=action;
 }
 if(name==='Walk')state.action.setEffectiveTimeScale(walkRate);
 state.lastPulse=attackPulse;state.lastAttack=attackId;state.mixer.update(dt);
 if(name==='Attack'&&attackTime!==null){
  state.action.time=Math.min(.999,attackTime/attackDuration)*state.action.getClip().duration;
  state.mixer.update(0);
 }
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
