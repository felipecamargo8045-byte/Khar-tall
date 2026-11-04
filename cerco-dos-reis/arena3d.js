import * as THREE from './vendor/three.module.js';
import './arena-layout.js?v=2';
import {createCharacter,characterProfiles,animateCharacterSurfaces} from './character-models.js?v=4';
import {prepareCharacterModels,animateNativeCharacter,disposeNativeCharacter} from './native-characters.js?v=1';
import {animateCloth,batchRig,updateRig} from './character-cloth.js?v=2';
import {bevelBox,reliefMap,floorHeight,pickGround,fitArena,createAtmosphere,characterShadow,batchStatic,framingInfo} from './arena-atmosphere.js?v=6';

// Arena WebGL 3D local, geometria própria e sem serviços pagos.
// Modelo visual independente do motor de combate; não substitui suas regras.
const host=document.getElementById('arena3d');
const shell=document.querySelector('.canvas-box');
const gameCanvas=document.getElementById('arena');
const layout=globalThis.CercoArenaLayout;
const {width:W,height:H,scale:SCALE}=layout;
const position=(x,y)=>new THREE.Vector3((x-W/2)/SCALE,0,(y-H/2)/SCALE);
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const teams={
 ally:{cloth:0x2c78a8,glow:0x7cdeee,flag:0x348cc4},
 enemy:{cloth:0x9e3d50,glow:0xf9a0ad,flag:0xc1536c}
};
const mat=(color,metalness=.08,roughness=.83)=>new THREE.MeshStandardMaterial({color,metalness,roughness,flatShading:false});
const outfitMaterials=new Set();let activeOutfit=window.CercoStore?.snapshot?.().skin?.color||null;
function outfit(team,color=teams[team].cloth,metalness=.08){const material=mat(team==='ally'&&activeOutfit?activeOutfit:color,metalness);if(team==='ally'){material.userData.defaultColor=color;outfitMaterials.add(material)}return material}
document.addEventListener('cerco:collection',event=>{activeOutfit=event.detail.skin?.color||null;for(const material of outfitMaterials)material.color.set(activeOutfit||material.userData.defaultColor).multiplyScalar(material.userData.dyeFactor??1)});
const stone=mat(0x717974),darkStone=mat(0x303c40),stoneLight=mat(0xa7a58e);
const iron=mat(0x8994a5,.8,.35),black=mat(0x131a27,.35),gold=mat(0xc6a569,.7,.34);
const wood=mat(0x73543a),grass=mat(0x4a725b),dirt=mat(0x607b70),water=new THREE.MeshStandardMaterial({color:0x277a9d,metalness:.25,roughness:.3,transparent:true,opacity:.93});
const skin=mat(0xd1a486),fur=mat(0x48403b),redHair=mat(0x9d452c),green=mat(0x64b87b);
const box=(w,h,d,m)=>new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
const sphere=(r,m)=>new THREE.Mesh(new THREE.SphereGeometry(r,14,10),m);
const cyl=(r1,r2,h,m,sides=10)=>new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,sides),m);
const cone=(r,h,m,sides=9)=>new THREE.Mesh(new THREE.ConeGeometry(r,h,sides),m);
const put=(group,obj,x,y,z)=>{obj.position.set(x,y,z);group.add(obj);return obj;};
// Materiais próprios com variação de pedra e piso: a arena não depende de
// imagens externas nem usa objetos ou desenhos do jogo de referência.
const materialCache=new Map();
function texturedStone(style){
 if(materialCache.has(style))return materialCache.get(style);
 const palettes={
  ally:['#75817d','#818b83','#697671','#90968b'],
  enemy:['#7c7972','#89877e','#706e67','#979388'],
  road:['#706f61','#7d7c6d','#62685f','#8a8774']
 };
 const cols=palettes[style]||palettes.road;
 const canvas=document.createElement('canvas');
 canvas.width=256;canvas.height=256;
 const p=canvas.getContext('2d'),seed=style.length+19;
 let rand=seed;
 function random(){rand=(rand*1664525+1013904223)>>>0;return rand/4294967296}
 p.fillStyle=cols[2];p.fillRect(0,0,256,256);
 const blockHeight=style==='road'?37:22;
 const blockWidth=style==='road'?61:41;
 for(let row=0,y=0;y<256;row++,y+=blockHeight){
   const shift=row%2?blockWidth/2:0;
   for(let x=-blockWidth;x<256+blockWidth;x+=blockWidth){
    const px=x+shift, inset=.6+random()*.5;
    p.fillStyle=cols[Math.floor(random()*cols.length)];
    p.fillRect(px+inset,y+inset,blockWidth-2*inset,blockHeight-2*inset);
    p.fillStyle='rgba(245,238,212,.08)';p.fillRect(px+inset+2,y+inset+2,blockWidth-5,2);
    p.fillStyle='rgba(14,25,35,.09)';p.fillRect(px+inset,y+blockHeight-4,blockWidth-4,2);
    p.strokeStyle='rgba(12,26,40,.15)';p.lineWidth=1;
    for(let n=0;n<3;n++){
      const crackX=px+8+random()*(blockWidth-17);
      const crackY=y+6+random()*(blockHeight-12);
      p.beginPath();p.moveTo(crackX,crackY);
      p.lineTo(crackX+random()*9-4,crackY+random()*5);
      p.stroke();
    }
   }
 }
 const tex=new THREE.CanvasTexture(canvas);
 tex.colorSpace=THREE.SRGBColorSpace;
 tex.wrapS=THREE.RepeatWrapping;tex.wrapT=THREE.RepeatWrapping;
 tex.anisotropy=2;
 const result=new THREE.MeshStandardMaterial({map:tex,bumpMap:reliefMap(tex),bumpScale:.025,
  roughness:.86,metalness:.02,flatShading:false,envMapIntensity:.35});
 materialCache.set(style,result);
 return result;
}

const pivot=(group,x,y,z)=>put(group,new THREE.Group(),x,y,z);
function horizontalPath(parent,points,r,m){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
 const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(5,points.length*7),r,6,false),m);
 parent.add(mesh);return mesh;
}

let renderer,scene,camera,atmosphere,ready=false,lastTime=0,batchedPieces=0;
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
const hit=new THREE.Vector3();
const actors=new Map(),forts=[];
const troopBolts=new Map(),troopVfx=new Map();
const flyingBolts=new Map(),impactRings=new Map();
function createRenderer(){
 const r=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
 r.setPixelRatio(Math.min(1.5,window.devicePixelRatio||1));
 return r;
}
// Direção de arte: fantasia estilizada, limpa e legível. Materiais de
// pedra, metal e tecido, com proporções legíveis no campo; assets e padrões são originais.
function surfaceTexture(style){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
 const ctx=canvas.getContext('2d'),image=ctx.createImageData(512,512);
 const grass=style==='grass';
 const hash=(x,y)=>{let n=Math.imul(x,374761393)^Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295};
 function noise(x,y,period){
  const ix=Math.floor(x),iy=Math.floor(y),tx=x-ix,ty=y-iy;
  const u=tx*tx*(3-2*tx),v=ty*ty*(3-2*ty);
  const sample=(a,b)=>hash((a+period)%period,(b+period)%period);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(sample(ix,iy),sample(ix+1,iy),u),THREE.MathUtils.lerp(sample(ix,iy+1),sample(ix+1,iy+1),u),v);
 }
 for(let y=0;y<512;y++)for(let x=0;x<512;x++){
  const value=noise(x/128,y/128,4)*.56+noise(x/32,y/32,16)*.28+noise(x/8,y/8,64)*.16;
  const grain=(hash(x,y)-.5)*6,i=(y*512+x)*4;
  const base=grass?[49,77,51]:[108,103,87],variation=grass?[28,32,17]:[25,24,21];
  for(let c=0;c<3;c++)image.data[i+c]=base[c]+variation[c]*value+grain;
  image.data[i+3]=255;
 }
 ctx.putImageData(image,0,0);
 if(!grass){
  // Lajes irregulares com juntas finas e desgaste, sem quadriculado colorido.
  for(let row=0;row<12;row++)for(let col=-1;col<5;col++){
   const x=col*128+(row%2)*64,y=row*44;
   ctx.strokeStyle='rgba(28,35,31,.25)';ctx.lineWidth=1.6;
   ctx.strokeRect(x+1,y+1,124,41);
   ctx.strokeStyle='rgba(206,196,162,.10)';ctx.strokeRect(x+3,y+3,120,37);
  }
 }
 const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
 tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.anisotropy=4;return tex;
}
function terrain(){
 // Terreno contínuo cobre a vista inteira, sem moldura de maquete.
 const grassMap=surfaceTexture('grass');grassMap.repeat.set(7,3.5);
 const grassMaterial=new THREE.MeshStandardMaterial({map:grassMap,bumpMap:reliefMap(grassMap),
  bumpScale:.018,roughness:.97,envMapIntensity:.28});
 for(const z of [-15.675,15.675]){
  const field=box(60,.14,30,grassMaterial);
  put(scene,field,0,-.059,z);field.receiveShadow=true;
 }
 // As pistas param na margem; a água está abaixo das tábuas da ponte.
 const roadEnd=(layout.bounds.maxY-H/2)/SCALE-.25;
 const roadLength=roadEnd-.675,roadCenter=(roadEnd+.675)/2;
 const pathMap=surfaceTexture('path');pathMap.repeat.set(1,roadLength/3.28);
 const roadMat=new THREE.MeshStandardMaterial({map:pathMap,bumpMap:reliefMap(pathMap),
  bumpScale:.048,roughness:.85,envMapIntensity:.3});
 for(const x of [-2.5,2.5]){
   for(const z of [-roadCenter,roadCenter]){
    const path=box(2.54,.045,roadLength,roadMat);
    put(scene,path,x,.035,z);path.receiveShadow=true;
   }
   const sideLine=mat(0x777b64);
   for(const d of [-1,1]){
    for(const z of [-roadCenter,roadCenter])put(scene,box(.075,.038,roadLength,sideLine),x+d*1.32,.057,z);
   }
   for(let z=-roadEnd+.25;z<roadEnd;z+=.8){
     if(Math.abs(z)>.98)put(scene,box(2.5,.02,.032,mat(0x686e5d)),x,.065,z);
   }
 }
 // Os caminhos se unem atrás das torres e chegam aos castelos recuados.
 const baseMap=surfaceTexture('path');baseMap.repeat.set(2.1,.45);
 const baseRoad=roadMat.clone();baseRoad.map=baseMap;baseRoad.bumpMap=reliefMap(baseMap);
 for(const side of ['enemy','ally']){
  const z=(layout.positions[side][2].y-H/2)/SCALE;
  const court=box(5.25,.043,1.50,baseRoad);
  put(scene,court,0,.034,z);court.receiveShadow=true;
 }
 // Água ciano contrastante: rio intransponível, salvo pelas pontes.
 atmosphere.addWater();
 put(scene,box(11.48,.09,1.35,mat(0x194e68)),0,-.23,0);
 const foam=mat(0xa7ecdf);
 for(let z of [-.61,.61]){
   put(scene,box(11.25,.015,.055,foam),0,-.057,z);
 }
 for(let i=0;i<12;i++){
  const ripple=box(.48,.012,.018,mat(i%2?0x81e5eb:0x70d4e5));
  put(scene,ripple,-5.2+i*.92,-.057,(i%3-1)*.26);
 }
 // Pontes largas, madeira dourada com tabuas salientes e corrimão.
 for(const x of [-2.5,2.5]){
   for(const z of [-.90,.90])put(scene,bevelBox(2.78,.17,.30,mat(0x92866c),.035),x,.11,z);
   for(const side of [-1,1])put(scene,box(.16,.22,1.80,mat(0x79553a)),x+side*1.02,.16,0);
   for(let i=0;i<9;i++){
     const z=-.80+i*.20,y=floorHeight(x,z);
     const plank=bevelBox(2.54,.075,.194,mat(i%2?0x8c6e48:0x816442),.012);
     put(scene,plank,x,y-.0375,z);
     for(const side of [-1,1])put(scene,cyl(.027,.027,.012,iron,6),x+side*1.1,y+.007,z);
   }
   for(const d of [-1,1]){
     const side=x+d*1.31;
     put(scene,bevelBox(.095,.13,1.84,mat(0xa38a55),.016),side,.51,0);
     for(const z of [-.75,0,.75]){
       const post=box(.14,.48,.14,gold);put(scene,post,side,.54,z);
       put(scene,sphere(.105,mat(0xc0a66c)),side,.83,z);
     }
   }
 }
 // Rochas de margem com contraste; entradas das pontes ficam totalmente livres.
 const bankStone=mat(0x7a8580),bankShade=mat(0x586e69);
 for(const z of [-.79,.79]){
  for(let k=0;k<24;k++){
   const x=-5.3+(k+.5)*.45;
   if(Math.abs(x-2.5)<1.44||Math.abs(x+2.5)<1.44)continue;
   const rock=cyl(.22,.29,.21,k%3===0?bankShade:bankStone,7);
   put(scene,rock,x,.20,z);
  }
 }
 // Vegetação baixa e pedras naturais nas laterais, com o campo aberto.
 const foliage=mat(0x3b593b),rockMat=mat(0x616c62);
 for(let i=0;i<18;i++){
  const x=(i%2?1:-1)*(4.65+(i%3)*.18),z=-6.65+(i%9)*1.64;
  if(Math.abs(z)<1.1)continue;
  const rock=new THREE.Mesh(new THREE.IcosahedronGeometry(.19,1),rockMat);
  rock.scale.set(1.35,.64,.94);rock.rotation.set(.2,i*.8,.1);put(scene,rock,x,.11,z);
  for(let n=0;n<3;n++){
   const blade=cone(.045,.27,foliage,4);blade.rotation.z=(n-1)*.35;
   put(scene,blade,x+.22+(n-1)*.06,.13,z+.15);
  }
 }
 scene.traverse(mesh=>{
  if(mesh.isMesh&&mesh.material?.isMeshStandardMaterial){
   mesh.receiveShadow=true;
   mesh.castShadow=mesh.castShadow||mesh.geometry.parameters?.height>=.12||mesh.geometry.type==='SphereGeometry';
  }
 });
 batchedPieces+=batchStatic(scene);
}
function makeFortress(team,main){
 const group=new THREE.Group(),colors=teams[team];
 const wall=texturedStone(team),trim=stoneLight;
 const theme=outfit(team,colors.cloth,.20),flag=outfit(team,colors.flag,.08);
 const roof=outfit(team,team==='ally'?0x18354c:0x61333c,.26);
 roof.roughness=.66;
 const bowArms=[],level=main?1.65:1.55;
 const ring=(r,h,m,x,y,z)=>put(group,cyl(r,r,h,m,20),x,y,z);
 function turret(x,z,r,top){
  ring(r,r*.28,darkStone,x,.13,z);
  ring(r*.91,top-.20,wall,x,top/2+.02,z);
  ring(r*1.04,.10,trim,x,top-.16,z);
  ring(r*1.06,.075,gold,x,top-.08,z);
  put(group,cone(r*1.15,.73,roof,20),x,top+.30,z);
  ring(.055,.14,gold,x,top+.72,z);
  put(group,sphere(.065,gold),x,top+.82,z);
  for(let n=0;n<6;n++){
   const a=n*Math.PI/3,window=box(.075,.31,.035,black);
   window.rotation.y=a;put(group,window,x+Math.sin(a)*(r*.925),top*.61,z+Math.cos(a)*(r*.925));
  }
 }
 if(main){
  put(group,bevelBox(2.86,.12,1.82,darkStone,.035),0,.08,0);
  put(group,bevelBox(2.65,.12,1.66,trim,.028),0,.19,0);
  put(group,bevelBox(1.94,1.48,1.17,wall,.045),0,.98,0);
  for(const side of [-1,1]){
   put(group,bevelBox(.16,1.24,.22,trim,.018),side*.77,.88,.56);
   turret(side*1.04,-.16,.33,2.08);
   const banner=put(group,box(.30,.65,.035,flag),side*.57,1.12,.637);
   put(group,box(.34,.055,.055,gold),side*.57,1.47,.657);
   const seal=put(group,box(.10,.15,.05,gold),side*.57,1.12,.672);seal.rotation.z=Math.PI/4;
  }
  const hipRoof=put(group,cone(1.32,.79,roof,4),0,2.00,-.04);
  hipRoof.rotation.y=Math.PI/4;hipRoof.scale.z=.73;
  put(group,bevelBox(2.02,.07,1.25,gold,.012),0,1.68,-.04);
  turret(0,-.38,.30,2.84);
 }else{
  // Uma torre de defesa única e estreita, em vez de outro castelo inteiro.
  ring(.92,.13,darkStone,0,.10,0);ring(.84,.11,trim,0,.22,0);
  ring(.66,1.46,wall,0,.97,0);
  for(const y of [.43,1.32,1.63])ring(.69,.065,trim,0,y,0);
  ring(.78,.23,wall,0,1.78,0);ring(.80,.06,gold,0,1.92,0);
  for(let n=0;n<10;n++){
   const a=n*Math.PI/5,merlon=bevelBox(.19,.24,.19,trim,.022);
   merlon.rotation.y=a;put(group,merlon,Math.sin(a)*.70,2.03,Math.cos(a)*.70);
  }
  put(group,cone(.67,.72,roof,20),0,2.31,-.07);
  put(group,sphere(.065,gold),0,2.73,-.07);
  for(const side of [-1,1]){
   const slit=box(.085,.36,.06,black);put(group,slit,side*.38,1.15,.54);
   put(group,box(.035,.24,.07,gold),side*.38,1.15,.57);
  }
  put(group,box(.30,.52,.04,flag),0,1.38,.675);
  put(group,box(.35,.055,.06,gold),0,1.65,.697);
 }
 // Pórtico escuro, arco de pedra e grade metálica com ferragens douradas.
 const gateY=main?.64:.62,front=main?.60:.67;
 put(group,box(.43,.69,.05,black),0,gateY,front);
 put(group,new THREE.Mesh(new THREE.CircleGeometry(.215,18,0,Math.PI),black),0,gateY+.34,front+.018);
 const arch=new THREE.Mesh(new THREE.TorusGeometry(.26,.06,6,18,Math.PI),trim);
 put(group,arch,0,gateY+.34,front+.04);
 for(const side of [-1,1])put(group,bevelBox(.10,.70,.12,trim,.015),side*.26,gateY,front+.04);
 for(let n=-2;n<=2;n++)put(group,box(.018,.68,.035,iron),n*.075,gateY,front+.08);
 put(group,bevelBox(.71,.08,.30,trim,.016),0,.25,front+.11);
 put(group,bevelBox(.83,.07,.37,stone,.016),0,.16,front+.17);
 // Pequenas sentinelas reais; os braços continuam ligados aos disparos.
 for(const offset of main?[-.53,.53]:[0]){
  const sentry=new THREE.Group();
  put(sentry,cyl(.09,.12,.25,theme,12),0,.19,0);
  put(sentry,sphere(.08,skin),0,.39,0);
  put(sentry,sphere(.095,darkStone),0,.44,-.02);
  const arm=pivot(sentry,.10,.28,.02);put(arm,cyl(.026,.034,.22,iron,8),0,-.075,0);
  const bow=pivot(arm,.03,-.16,.06);
  horizontalPath(bow,[[-.12,.18,0],[-.20,0,.02],[-.12,-.18,0]],.015,wood);
  horizontalPath(bow,[[-.12,.18,.02],[-.11,0,.02],[-.12,-.18,.02]],.004,gold);
  put(group,sentry,offset,main?1.50:1.80,main?.69:.62);bowArms.push(arm);
 }
 const scale=layout.structureScale[main?'castle':'tower'];group.scale.setScalar(scale);
 group.userData={bowArms,material:theme,castle:main,team,baseScale:scale,barHeight:main?3.91:2.98};
 group.traverse(mesh=>{if(mesh.isMesh)mesh.castShadow=mesh.receiveShadow=true});
 batchedPieces+=batchStatic(group,bowArms);return group;
}
function buildForts(){
 for(const team of ['enemy','ally'])for(let slot=0;slot<3;slot++){
  const main=slot===2,mesh=makeFortress(team,main),origin=layout.positions[team][slot];
  mesh.rotation.y=team==='enemy'?Math.PI:0;mesh.position.copy(position(origin.x,origin.y));scene.add(mesh);
  const bar=makeHealthBar(team,main?1.58:1.18);scene.add(bar);
  forts.push({mesh,bar,team,lane:main?-1:slot});
 }
}
function torches(){
 for(const z of [-3.1,3.1]){
  for(const x of [-4.9,4.9]){
   put(scene,cyl(.11,.15,.65,wood,6),x,.35,z);
   atmosphere.addTorch(x,z);
  }
 }
}
function makeHealthBar(team,width=.84){
 const node=new THREE.Group();
 const uiMaterial=color=>new THREE.MeshBasicMaterial({color,depthTest:false,depthWrite:false,toneMapped:false});
 const bg=box(width,.105,.025,uiMaterial(0x16273c));
 put(node,bg,0,0,0);
 const border=box(width+.07,.155,.016,uiMaterial(0xc6a569));
 put(node,border,0,0,-.023);
 const fillMat=uiMaterial(team==='ally'?0x80e0e8:0xed879a);
 const fill=box(width-.06,.075,.036,fillMat);
 put(node,fill,0,0,.035);
 border.renderOrder=20;bg.renderOrder=21;fill.renderOrder=22;
 node.userData.fill=fill;
 node.userData.width=width-.06;
 node.renderOrder=20;
 return node;
}

// Sombras de contato complementam a sombra direcional nos pés dos modelos.
const shadowCanvas=document.createElement('canvas');
shadowCanvas.width=64;shadowCanvas.height=64;
const shadowCtx=shadowCanvas.getContext('2d');
const shadowGradient=shadowCtx.createRadialGradient(32,32,3,32,32,31);
shadowGradient.addColorStop(0,'rgba(6,22,25,.43)');
shadowGradient.addColorStop(.5,'rgba(6,22,25,.23)');
shadowGradient.addColorStop(1,'rgba(6,22,25,0)');
shadowCtx.fillStyle=shadowGradient;shadowCtx.fillRect(0,0,64,64);
const shadowMap=new THREE.CanvasTexture(shadowCanvas);
function fakeShadow(width){
 const material=new THREE.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false,opacity:.65,toneMapped:false});
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,width*.68),material);
 mesh.rotation.x=-Math.PI/2;
 mesh.renderOrder=2;
 return mesh;
}
function createActor(u){
 const model=createCharacter(u.card.id,u.side,{mat,outfit,outfitMaterials});
 // Proporção de estratégia: tropas menores do que a estrutura que defendem.
 const unitScale=characterProfiles[u.card.id].scale;
 model.scale.setScalar(unitScale);
 model.updateMatrixWorld(true);
 const modelBounds=new THREE.Box3().setFromObject(model);
 const visualHeight=modelBounds.max.y,visualWidth=modelBounds.max.x-modelBounds.min.x;
 model.traverse(o=>{if(o.isMesh)o.castShadow=true});
 const rig=batchRig(model);
 const bar=makeHealthBar(u.side,Math.min(1.08,Math.max(.68,visualWidth*.70)));
 const appearance=null;
 const shadowProxy=characterShadow(u.card.id,appearance?.height||(u.card.id==='lobo'?.92:1.18));
 const shadow=fakeShadow(Math.max(.64,visualWidth*.94));
 scene.add(model);scene.add(bar);scene.add(shadow);
 scene.add(shadowProxy);
 atmosphere.invalidate();
 if(appearance)scene.add(appearance.mesh);
 return {model,rig,bar,shadow,shadowProxy,appearance,visualHeight,visualWidth,side:u.side,lastFrame:0,position:new THREE.Vector3()};
}
function syncActors(game){
 const live=new Set(game.units.filter(u=>u.hp>0).map(u=>u.id));
 for(const [id,rec] of actors){
  if(!live.has(id)){
    scene.remove(rec.model);scene.remove(rec.bar);scene.remove(rec.shadow);scene.remove(rec.shadowProxy);
    atmosphere.invalidate();
    disposeNativeCharacter(rec.model,outfitMaterials);
    rec.model.traverse(mesh=>{for(const material of Array.isArray(mesh.material)?mesh.material:mesh.material?[mesh.material]:[])outfitMaterials.delete(material)});
    if(rec.appearance){scene.remove(rec.appearance.mesh);rec.appearance.mesh.material.dispose();rec.appearance.sheet.dispose();}
    actors.delete(id);
  }
 }
 for(const u of game.units){
  if(u.hp<=0)continue;
  let rec=actors.get(u.id);
  if(!rec){rec=createActor(u);actors.set(u.id,rec)}
  const obj=rec.model,anim=obj.userData;
  const pos=position(u.x,u.y);
  const ground=floorHeight(pos.x,pos.z);
  obj.position.copy(pos);
  rec.shadow.position.set(pos.x,ground+.013,pos.z);
  // Os modelos articulados recebem luz e sombra diretamente no campo.
  if(rec.appearance){
     const art=rec.appearance;
     art.mesh.position.set(pos.x,ground+art.height*.5+.025,pos.z+.10);
     art.mesh.quaternion.copy(camera.quaternion);
     art.sheet.offset.x=detailedFrame(u)/24;
     // O 3D fica por trás da arte, mantendo volume no cenário sem poluir a leitura.
     obj.visible=false;
  } else obj.visible=true;
  rec.shadowProxy.visible=!!rec.appearance;
  // Pequenos passos, com pés e braços articulados.
  const clock=u.motionTime||0,walking=u.state==='walk';
  const attacking=(u.attackPulse||0)>0;
  const stagger=u.state==='stun';
  const rate=u.card.id==='lobo'?10.5:u.card.id==='colosso'?4.1:u.card.id==='batedor'?8.9:7.1;
  const phase=clock*rate+u.id*.18;
  const step=walking?1:attacking?.48:.06;
  obj.position.y=ground+(walking?.018*Math.sin(phase*2):.005*Math.sin(clock*2));
  // Indicador flutuante, sempre legível, separado do corpo do personagem.
  const visibleHeight=rec.visualHeight;
  rec.bar.position.set(pos.x,ground+visibleHeight+.12,pos.z);
  rec.bar.quaternion.copy(camera.quaternion);
  const fill=rec.bar.userData.fill;
  if(fill){
   const ratio=clamp(u.hp/u.maxHp,0,1);
   fill.scale.x=Math.max(.01,ratio);
   fill.position.x=-rec.bar.userData.width*(1-ratio)/2;
   fill.material.color.setHex(u.healPulse>0?0xb2efbe:u.side==='ally'?0x80e0e8:0xed879a);
  }
  const polarity=u.side==='ally'?-1:1;
  // Frontal para alvo real, ou em direção ao castelo adversário.
  const yaw=Number.isFinite(u.heading)?Math.atan2(Math.cos(u.heading),Math.sin(u.heading)):(polarity===-1?Math.PI:0);
  const delta=Math.atan2(Math.sin(yaw-obj.rotation.y),Math.cos(yaw-obj.rotation.y));
  obj.rotation.y+=clamp(delta,-.15,.15);
  rec.shadowProxy.position.copy(obj.position);rec.shadowProxy.rotation.y=obj.rotation.y;
  if(anim.nativeAnimation){
   obj.position.y=ground;
   animateNativeCharacter(obj,{clock,walking,attackPulse:u.attackPulse||0,stagger,hp:u.hp});
   continue;
  }
  if(anim.hasWolf){
   anim.legs.forEach((leg,i)=>{leg.rotation.x=Math.sin(phase+(i===0||i===3?0:Math.PI))*.56*step});
   anim.body.rotation.x=walking?.035*Math.sin(phase*2):0;
   anim.head.rotation.x=attacking?-.4*Math.sin(clock*17):.06*Math.sin(clock*1.4);
   anim.tail.rotation.x=.12*Math.sin(clock*3);
   anim.tail.rotation.y=.29*Math.sin(clock*4);
  }else{
   anim.legs.forEach((leg,i)=>{
    leg.rotation.x=Math.sin(phase+i*Math.PI)*.57*step;
    leg.rotation.z=walking?Math.sin(phase+i*Math.PI)*.055:0;
   });
   anim.arms.forEach((arm,i)=>{
    arm.rotation.x=(i===0?1:-1)*Math.sin(phase)*.42*step;
    if(attacking){arm.rotation.x=-1.03+Math.sin(clock*20)*.3;arm.rotation.z=i===0?-.18:.2;}
    else arm.rotation.z=.08*(i?1:-1);
   });
   anim.body.rotation.z=walking?Math.sin(phase)*.042:Math.sin(clock*1.5)*.009;
   anim.body.rotation.x=attacking?-.13:0;
  }
  if(!anim.hasWolf)anim.body.rotation.y=0;
  applyUniqueAttackPose(u,rec,anim);
  animateCloth(anim.cloaks,clock,walking,attacking?Math.sin(clock*8)**2:0);
  anim.knees?.forEach((k,i)=>{k.rotation.x=walking?Math.max(0,-Math.sin(phase+i*Math.PI))*.65:.08});
  anim.elbows?.forEach((e,i)=>{e.rotation.x=attacking?-.5-.3*Math.sin(clock*12):-.12-(walking?Math.max(0,Math.sin(phase+i*Math.PI))*.18:0)});
  anim.hair?.forEach((h,i)=>{h.rotation.x=Math.sin(clock*2.8+i)*.07;h.rotation.z=Math.sin(clock*3.1+i)*.035});
  anim.magicHands?.forEach((hand,i)=>{hand.rotation.y=clock*(i?1:-1);hand.scale.setScalar(1+(attacking?.25:.06)*Math.sin(clock*5))});
  animateCharacterSurfaces(obj,clock,walking,attacking?Math.sin(clock*8)**2:0);
  updateRig(rec.rig);
  // Modelo e tecido recebem luz e sombra como a arquitetura.
 }
}

function makeBolt(shot){
 // A flecha compartilha a mesma geometria detalhada usada pelos Arqueiros:
 // haste de madeira, ponta de ferro e penas; não mais esferas brilhantes.
 return attackProjectile({kind:'arrow',side:shot.source,source:shot.source});
}
function syncBolts(game){
 const valid=new Set((game.projectiles||[]).map(x=>x.id));
 for(const [id,mesh] of flyingBolts){
  if(!valid.has(id)){
   scene.remove(mesh);
   mesh.traverse(obj=>{if(obj.isMesh){obj.material?.dispose?.();obj.geometry?.dispose?.()}});
   flyingBolts.delete(id);
  }
 }
 for(const shot of game.projectiles||[]){
   let mesh=flyingBolts.get(shot.id);
   if(!mesh){mesh=makeBolt(shot);flyingBolts.set(shot.id,mesh)}
   // A origem visual é o parapeito real da fortificação, não um ponto
   // artificial no chão. Isso também vale para os dois castelos centrais.
   const fortress=forts.find(f=>f.team===shot.source&&f.lane===(shot.slot===2?-1:shot.slot));
   const from=fortress?.mesh.position.clone()||position(shot.fromX,shot.fromY);
   if(fortress&&shot.slot===2)from.x+=(shot.toX<W/2?-.4:.4);
   from.y=(shot.slot===2?1.9:2.2)*(fortress?.mesh.scale.y||1);
   const targetActor=actors.get(shot.targetId);
   const to=position(shot.toX,shot.toY);to.y=floorHeight(to.x,to.z)+(targetActor?.visualHeight||1)*.60;
   const t=shot.progress,arc=.76,trajectory=to.clone().sub(from);
   mesh.position.copy(from).lerp(to,t);
   mesh.position.y+=Math.sin(t*Math.PI)*arc;
   const tangent=trajectory.clone();
   tangent.y+=Math.PI*arc*Math.cos(t*Math.PI);
   if(tangent.lengthSq()>.001)mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),tangent.normalize());
 }
 const active=new Set((game.effects||[]).map(x=>x.id));
 for(const [id,obj] of impactRings){
   if(!active.has(id)){
     scene.remove(obj);
     obj.geometry.dispose();obj.material.dispose();
     impactRings.delete(id);
   }
 }
 for(const effect of game.effects||[]){
   let ring=impactRings.get(effect.id);
   if(!ring){
     const color=effect.color==='blue'?0x9fe8ff:0xffabb8;
     const m=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.85,side:THREE.DoubleSide,depthWrite:false});
     ring=new THREE.Mesh(new THREE.RingGeometry(.12,.22,24),m);
     ring.rotation.x=-Math.PI/2;
     scene.add(ring);impactRings.set(effect.id,ring);
   }
   const k=1-effect.life/effect.maxLife;
   const p=position(effect.x,effect.y);
   ring.position.set(p.x,floorHeight(p.x,p.z)+.07,p.z);
   ring.scale.setScalar(.6+3.1*k);
   ring.material.opacity=Math.max(0,.8*(1-k));
 }
}

// Cada personagem mantém sua assinatura de ataque nos gestos, projéteis e impactos.
const ATTACK_COLORS={heal:0x96e9bb,arrow:0xffe6a7,mark:0xe25458,enchant:0xe8bb65,shield:0xa1eaf1,
 slash:0xffeac6,bite:0xffb1a0,slam:0xffa45c,royal:0xf4ca72};
function emissiveMaterial(color,opacity=1){
 return new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
}
function attackProjectile(shot){
 const color=ATTACK_COLORS[shot.kind]||0xffd8a6;
 const root=new THREE.Group();
 const thin=shot.kind==='arrow';
 if(thin){
  const length=shot.kind==='mark'?.85:.68;
  const shaft=cyl(.024,.024,length,mat(shot.kind==='mark'?0x2ac5f3:0x9c7550,.42,.48),8);
  put(root,shaft,0,0,0);
  const tip=cone(.10,.26,mat(shot.kind==='mark'?0x91f3ff:0xdadce1,.45,.35),7);
  put(root,tip,0,length/2+.11,0);
  const featherShade=shot.kind==='mark'?0x99e5f8:(shot.source||shot.side)==='ally'?0x68b9e5:(shot.source||shot.side)==='enemy'?0xce7790:0xf3eee1;
  const feathers=mat(featherShade);
  for(const sign of [-1,1]){
    const quill=box(.14,.025,.06,feathers);
    quill.rotation.z=sign*.34;
    put(root,quill,sign*.055,-length/2+.085,0);
  }
  if(shot.kind==='mark'){
   const tracer=new THREE.Mesh(new THREE.TorusGeometry(.13,.025,4,15),emissiveMaterial(color,.72));
   tracer.rotation.x=Math.PI/2;put(root,tracer,0,-.14,0);
  }
 }else if(shot.kind==='mark'){
  const rune=new THREE.Mesh(new THREE.OctahedronGeometry(.16,0),emissiveMaterial(0xe25458,.92));
  rune.scale.y=2.4;root.add(rune);
  const tracer=new THREE.Mesh(new THREE.TorusGeometry(.18,.018,4,20),emissiveMaterial(0xd4a25d,.85));
  tracer.rotation.x=Math.PI/2;root.add(tracer);
 }else if(shot.kind==='enchant'){
  put(root,sphere(.18,emissiveMaterial(0xc9524a,.96)),0,0,0);
  const halo=new THREE.Mesh(new THREE.TorusGeometry(.29,.035,5,22),emissiveMaterial(0xedbf61,.79));
  put(root,halo,0,0,0);
  const halo2=new THREE.Mesh(new THREE.TorusGeometry(.22,.027,5,22),emissiveMaterial(0xe57b62,.85));
  halo2.rotation.y=1;root.add(halo2);
 }else if(shot.kind==='shield'){
  const plane=new THREE.Mesh(new THREE.CircleGeometry(.25,7),emissiveMaterial(0x93f3e8,.74));
  put(root,plane,0,0,0);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.27,.035,5,7),emissiveMaterial(0xd1fffc,.85));
  root.add(ring);
 }
 root.renderOrder=9;
 scene.add(root);
 return root;
}
function buildHitEffect(fx){
 const color=ATTACK_COLORS[fx.kind]||0xffdeaa,group=new THREE.Group();
 const kind=fx.kind;
 if(kind==='heal'){
   const ring=new THREE.Mesh(new THREE.TorusGeometry(.23,.018,5,24),emissiveMaterial(0x9ee8ba,.8));group.add(ring);
   for(const [w,h] of [[.07,.28],[.28,.07]])put(group,box(w,h,.025,emissiveMaterial(0xe7d4a0,.9)),0,0,0);
 }else if(kind==='bite'){
   for(const side of [-1,0,1]){
     const line=box(.045,.48,.04,emissiveMaterial(0xffaca0,.90));
     line.rotation.z=.42;
     put(group,line,side*.18,.0,side*.01);
   }
 }else if(kind==='slash'||kind==='royal'){
   const count=kind==='royal'?2:1;
   for(let i=0;i<count;i++){
     const arc=new THREE.Mesh(new THREE.TorusGeometry(.43+i*.11,.042,5,30,Math.PI*.9),
       emissiveMaterial(kind==='royal'?0xffd982:0xffead0,.94));
     arc.rotation.z=.65+i*.7;
     group.add(arc);
   }
 }else if(kind==='slam'){
   for(let i=0;i<3;i++){
     const ring=new THREE.Mesh(new THREE.RingGeometry(.26+i*.18,.32+i*.18,22),emissiveMaterial(0xfbb26c,.8-i*.14));
     ring.rotation.x=-Math.PI/2;
     put(group,ring,0,-.35+i*.012,0);
   }
   for(let i=0;i<5;i++){
     const rock=box(.12,.12,.12,mat(0xa47453));
     put(group,rock,Math.sin(i*1.26)*.42,-.15,Math.cos(i*1.26)*.42);
   }
 }else if(kind==='shield'){
   const face=new THREE.Mesh(new THREE.CircleGeometry(.45,8),emissiveMaterial(0x83efec,.43));
   group.add(face);
   const ring=new THREE.Mesh(new THREE.TorusGeometry(.46,.055,4,8),emissiveMaterial(0xd3fff5,.84));group.add(ring);
 }else if(kind==='mark'){
   for(const radius of [.25,.43]){
     const target=new THREE.Mesh(new THREE.TorusGeometry(radius,.032,5,25),emissiveMaterial(0x99f0fc,.85));
     group.add(target);
   }
   put(group,box(.9,.027,.02,emissiveMaterial(0xa3eef7)),0,0,0);
   put(group,box(.027,.9,.02,emissiveMaterial(0xa3eef7)),0,0,0);
 }else if(kind==='enchant'){
   for(let i=0;i<3;i++){
     const glyph=new THREE.Mesh(new THREE.TorusGeometry(.22+i*.14,.034,5,7),emissiveMaterial(i===1?0x83e9dd:0xe4aaff,.83));
     glyph.rotation.z=i*.7;group.add(glyph);
   }
   put(group,sphere(.16,emissiveMaterial(0xdfb2ff,.7)),0,0,0);
 }else{
   const ring=new THREE.Mesh(new THREE.TorusGeometry(.30,.05,6,24),emissiveMaterial(color,.87));group.add(ring);
 }
 scene.add(group);
 return group;
}
function clearTransient(node){
 scene.remove(node);
 node.traverse(child=>{
  if(child.isMesh){
   // Geometrias das animações são descartadas sem alterar materiais estáticos compartilhados.
   child.geometry?.dispose?.();
   if(child.material?.isMeshBasicMaterial)child.material?.dispose?.();
  }
 });
}
function syncTroopVfx(game){
 const shots=game.attackShots||[];
 const activeShots=new Set(shots.map(x=>x.id));
 for(const [id,obj] of troopBolts){if(!activeShots.has(id)){clearTransient(obj);troopBolts.delete(id)}}
 for(const shot of shots){
  let mesh=troopBolts.get(shot.id);
  if(!mesh){mesh=attackProjectile(shot);troopBolts.set(shot.id,mesh)}
  const at=position(shot.x,shot.y);
  const target=position(shot.toX,shot.toY);
  const source=position(shot.fromX,shot.fromY);
  const rise=Math.sin(shot.progress*Math.PI);
  const sourceActor=actors.get(shot.sourceId),targetActor=actors.get(shot.targetId);
  const chest=(sourceActor?.visualHeight||1.2)*.58*(1-shot.progress)+(targetActor?.visualHeight||1.2)*.58*shot.progress;
  mesh.position.set(at.x,floorHeight(at.x,at.z)+chest+rise*(shot.kind==='enchant'?.23:.16),at.z);
  if(shot.kind==='enchant'){
    mesh.rotation.set(shot.progress*5,shot.progress*7,shot.progress*4);
  }else if(shot.kind==='shield'){
    mesh.quaternion.copy(camera.quaternion);
    mesh.scale.setScalar(1+rise*.23);
  }else{
    const heading=target.clone().sub(source);
    heading.y=.03;heading.normalize();
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),heading);
  }
 }
 const effects=game.attackFx||[];
 const activeFx=new Set(effects.map(x=>x.id));
 for(const [id,obj] of troopVfx){if(!activeFx.has(id)){clearTransient(obj);troopVfx.delete(id)}}
 for(const fx of effects){
   let obj=troopVfx.get(fx.id);
   if(!obj){obj=buildHitEffect(fx);troopVfx.set(fx.id,obj)}
   const p=position(fx.x,fx.y);
   const phase=1-fx.life/fx.maxLife;
   obj.position.set(p.x,floorHeight(p.x,p.z)+(fx.kind==='slam'?.40:.45),p.z);
   if(fx.kind!=='slam')obj.quaternion.copy(camera.quaternion);
   if(fx.kind==='slash')obj.rotation.z=phase*1.7-.8;
   if(fx.kind==='royal')obj.rotation.z=phase*1.2-.4;
   if(fx.kind==='enchant'||fx.kind==='mark')obj.rotation.z+=.045;
   obj.scale.setScalar((fx.phase==='release'?.40+.20*phase:.52+phase*.85)*(fx.kind==='slam'?.85:.62));
   obj.traverse(mesh=>{if(mesh.isMesh&&mesh.material?.isMeshBasicMaterial&&mesh.material.transparent){
     mesh.material.opacity=Math.max(.05,(1-phase)*.90);
   }});
 }
}
function applyUniqueAttackPose(u,rec,anim){
 const portrait=rec.appearance?.mesh;
 const active=(u.attackPulse||0)>0;
 const kind=u.attackKind||'slash';
 const duration=.58;
 const t=active?Math.min(1,Math.max(0,1-(u.attackPulse||0)/duration)):0;
 const snap=Math.sin(Math.PI*t),thrust=Math.sin(t*Math.PI*1.35);
 if(portrait){
   portrait.rotation.z=0;
   portrait.scale.set(1,1,1);
   if(active){
     const degrees={
       arrow:-.085,mark:-.11,slash:.27,bite:-.17,
       slam:.11,shield:-.09,royal:.21,enchant:-.14
     };
     portrait.rotation.z=(degrees[kind]||0)*snap;
     const sx=kind==='slam'?1+.16*snap:kind==='bite'?1+.075*snap:kind==='arrow'?.95+.08*t:1+.045*snap;
     const sy=kind==='slam'?1-.11*snap:kind==='enchant'?1+.13*snap:1+.055*snap;
     portrait.scale.set(sx,sy,1);
     if(kind==='bite')portrait.position.z+=.16*snap;
     if(kind==='arrow'||kind==='mark')portrait.position.z-=.12*snap;
     if(kind==='royal'||kind==='slash')portrait.position.y+=.07*snap;
     if(kind==='enchant')portrait.position.y+=.13*snap;
   }
   if(u.hitPulse>0){portrait.material.color.setHex(0xffc6c6)}
   else portrait.material.color.setHex(0xffffff);
 }
 if(!active)return;
 if(anim.hasWolf){
   anim.head.rotation.x=-.68*snap;
   anim.body.rotation.x=-.21*snap;
   anim.legs.forEach((leg,i)=>{leg.rotation.x+=(i<2?-1:1)*.48*snap});
 }else{
   const [left,right]=anim.arms;
   if(kind==='arrow'){
     if(left){left.rotation.x=-1.15*snap;left.rotation.z=.25*snap}
     if(right){right.rotation.x=-1.42*snap;right.rotation.z=-.30*snap}
     anim.body.rotation.x=-.08*snap;
   }else if(kind==='mark'){
     if(left){left.rotation.x=-1.5*snap;left.rotation.z=-.40*snap}
     if(right){right.rotation.x=-2.0*snap;right.rotation.z=.45*snap}
     anim.body.rotation.y=.25*snap;
   }else if(kind==='slash'||kind==='royal'){
     if(right){right.rotation.x=-1.8*thrust;right.rotation.z=-.66*snap}
     if(left)left.rotation.x=-.33*snap;
     anim.body.rotation.z=.20*thrust;
   }else if(kind==='slam'){
     if(left)left.rotation.x=-1.7*snap;
     if(right)right.rotation.x=-1.7*snap;
     anim.body.rotation.x=-.35*snap;
     anim.legs.forEach(l=>l.rotation.x+=.24*snap);
   }else if(kind==='shield'){
     if(left){left.rotation.x=-1.45*snap;left.rotation.z=.35*snap}
     if(right){right.rotation.x=-.75*snap;right.rotation.z=-.20*snap}
   }else if(kind==='enchant'){
     if(left){left.rotation.x=-2.65*snap;left.rotation.z=-.23*snap}
     if(right){right.rotation.x=-2.75*snap;right.rotation.z=.23*snap}
     anim.body.rotation.y=.16*snap;
   }
 }
}
function syncForts(game){
 for(const fort of forts){
  const hp=fort.lane===-1?game.castles[fort.team]:game.towers[fort.team][fort.lane];
  const max=fort.lane===-1?2600:1400;
  const ratio=clamp(hp/max,0,1);
  const shadowStep=Math.ceil(ratio*8);
  if(fort.shadowStep!==shadowStep){fort.shadowStep=shadowStep;atmosphere.invalidate()}
  const attackSlot=fort.lane===-1?2:fort.lane;
  const recent=[...(game.towerShots||[])].reverse().find(shot=>shot.side===fort.team&&shot.slot===attackSlot);
  const elapsed=recent?Math.max(0,recent.time-game.time):10;
  const pull=elapsed<.45?Math.sin(Math.PI*elapsed/.45):0;
  for(const arm of fort.mesh.userData.bowArms||[])arm.rotation.x=-.8*pull;
  fort.mesh.scale.y=fort.mesh.userData.baseScale*(.94+.06*ratio);
  fort.mesh.visible=hp>0;
  if(fort.bar){
    fort.bar.visible=hp>0;
    fort.bar.position.set(fort.mesh.position.x,fort.mesh.userData.barHeight*fort.mesh.scale.y,fort.mesh.position.z+.12);
    fort.bar.quaternion.copy(camera.quaternion);
    fort.bar.userData.fill.scale.x=Math.max(.01,ratio);
    fort.bar.userData.fill.position.x=-fort.bar.userData.width*(1-ratio)/2;
  }
 }
}
function size(){
 if(!renderer||!host)return;
 const w=host.clientWidth||gameCanvas.clientWidth||420;
 const h=host.clientHeight||gameCanvas.clientHeight||560;
 renderer.setSize(w,h,false);
 const game=window.Cerco3DGame?.getState?.();if(game)syncForts(game);
 fitArena(camera,w,h,forts);
 atmosphere?.invalidate();
}
async function init(){
 await prepareCharacterModels('field');
 try{
  renderer=createRenderer();
  renderer.domElement.setAttribute('aria-hidden','true');
  renderer.domElement.style.cssText='width:100%;height:100%;display:block;pointer-events:none';
  host.appendChild(renderer.domElement);
  scene=new THREE.Scene();
  camera=new THREE.OrthographicCamera(-6,6,8,-8,.1,90);
  camera.position.set(0,23,18);
  camera.lookAt(0,.4,0);
  atmosphere=createAtmosphere(renderer,scene);
  terrain();buildForts();torches();
  size();
  window.addEventListener('resize',size,{passive:true});
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(size).observe(host);
  ready=true;
  host.hidden=false;
  shell.classList.add('three-ready');
  const badge=document.getElementById('sceneBadge');if(badge)badge.textContent='3D ATIVO';
  render(window.Cerco3DGame?.getState?.());
 }catch(error){
  console.warn('Cerco 3D indisponível: mantendo renderização 2D.',error);
  host.hidden=true;shell.classList.remove('three-ready');ready=false;
  const badge=document.getElementById('sceneBadge');if(badge)badge.textContent='2D COMPATÍVEL';
 }
}
function render(game){
 if(!ready||!game)return;
 const now=performance.now();
 // Uma cadência de 30 fps para 3D preserva CPU para o motor da batalha.
 if(now-lastTime<33 && lastTime!==0)return;
 lastTime=now;
 syncForts(game);syncActors(game);syncBolts(game);syncTroopVfx(game);
 atmosphere.update(now,actors.size>0);
 renderer.render(scene,camera);
}
function screenToBattle(clientX,clientY,rect){
 if(!ready)return null;
 // Raycast sobre o plano real do solo: o ponto tocado continua sendo a estratégia.
 pointer.x=((clientX-rect.left)/rect.width)*2-1;
 pointer.y=-((clientY-rect.top)/rect.height)*2+1;
 raycaster.setFromCamera(pointer,camera);
 if(!pickGround(raycaster.ray,hit))return null;
 return {x:clamp(hit.x*SCALE+W/2,0,W),y:clamp(hit.z*SCALE+H/2,layout.bounds.minY,layout.bounds.maxY)};
}
window.Cerco3D={
 get ready(){return ready},
 render,screenToBattle,resize:size,
 syncNow:(game)=>{if(ready&&game){syncActors(game);syncForts(game);syncBolts(game);syncTroopVfx(game)}},
 info:()=>({ready,actors:actors.size,projectiles:flyingBolts.size,troopShots:troopBolts.size,attackEffects:troopVfx.size,meshes:scene?.children?.length||0,webgl:renderer?.capabilities?.isWebGL2||false,
  presentation:ready?{shadows:renderer.shadowMap.enabled,shadowSize:atmosphere.sun.shadow.mapSize.x,
   toneMapping:renderer.toneMapping,environment:!!scene.environment,pixelRatio:renderer.getPixelRatio(),
   batchedPieces,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,
   forts:forts.map(f=>({team:f.team,slot:f.lane===-1?2:f.lane,x:f.mesh.position.x*SCALE+W/2,y:f.mesh.position.z*SCALE+H/2})),
   framing:framingInfo(camera,forts)}:null}),
 debugActors:()=>[...actors.entries()].map(([id,rec])=>({id,kind:rec.model.userData.id,native:!!rec.model.userData.nativeAnimation,animation:rec.model.userData.nativeAnimation?.current,illustrated:!!rec.appearance,legs:rec.model.userData.legs?.length||0,
   height:Number(rec.visualHeight.toFixed(3)),width:Number(rec.visualWidth.toFixed(3)),identity:rec.model.userData.profile.identity,
   cloaks:rec.model.userData.cloaks?.length||0,clothSample:Number((rec.model.userData.cloaks?.[0]?.geometry.attributes.position.array.at(-1)||0).toFixed(4)),
   rotations:rec.model.userData.legs?.map(l=>Number(l.rotation.x.toFixed(3)))||[]}))
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
