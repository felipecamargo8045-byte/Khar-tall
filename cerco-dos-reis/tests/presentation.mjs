import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {bevelBox,fitArena,pickGround,floorHeight,batchStatic} from '../arena-atmosphere.js';

// A câmera deve mostrar as coroas e preservar o local tocado em qualquer tela.
const camera=new THREE.OrthographicCamera(-6,6,8,-8,.1,90);
camera.position.set(0,23,18);camera.lookAt(0,.4,0);
const caster=new THREE.Raycaster(),hit=new THREE.Vector3();
for(const [width,height] of [[360,520],[390,610],[844,300],[1200,700]]){
 fitArena(camera,width,height);
 const landmarks=[[0,3.05,-8.6],[0,3.05,8.6]];
 for(const x of [-5.25,5.25])for(const z of [-9.6,9.6])landmarks.push([x,floorHeight(x,z),z]);
 for(const point of landmarks){
  const projected=new THREE.Vector3(...point).project(camera);
  assert.ok(Math.abs(projected.x)<1&&Math.abs(projected.y)<1,'Cenário cortado em '+width+'x'+height);
 }
 for(const [x,z] of [[-2.5,0],[2.5,-.6],[-2.5,3.2],[2.5,-4],[0,4],[-4.6,2],[0,-8.5],[0,8.5]]){
  const point=new THREE.Vector3(x,floorHeight(x,z),z),projected=point.clone().project(camera);
  caster.setFromCamera(new THREE.Vector2(projected.x,projected.y),camera);
  const picked=pickGround(caster.ray,hit);
  assert.ok(picked&&picked.distanceTo(point)<.002,'Toque deslocado na pista ou na ponte');
 }
}

// O chanfro deve conservar o tamanho e a altura do objeto.
const beveled=bevelBox(2,.4,1,new THREE.MeshStandardMaterial());
beveled.geometry.computeBoundingBox();
const dimensions=beveled.geometry.boundingBox.getSize(new THREE.Vector3());
for(const [axis,value] of [['x',2],['y',.4],['z',1]])assert.ok(Math.abs(dimensions[axis]-value)<1e-5);

// Instâncias preservam as transformações, inclusive sob um pai rotacionado.
const root=new THREE.Group();root.position.set(2,3,4);root.rotation.y=.6;
const material=new THREE.MeshStandardMaterial(),original=[];
for(let i=0;i<6;i++){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(.2,.5,.3),material);
 mesh.position.set(i*.3,i*.2,-i*.1);mesh.rotation.set(.1*i,.2*i,0);root.add(mesh);
}
root.updateWorldMatrix(true,true);
root.children.forEach(mesh=>original.push(mesh.matrixWorld.clone()));
assert.equal(batchStatic(root),5);
const batch=root.children.find(mesh=>mesh.isInstancedMesh),matrix=new THREE.Matrix4();
for(let i=0;i<batch.count;i++){
 batch.getMatrixAt(i,matrix);matrix.premultiply(root.matrixWorld);
 matrix.elements.forEach((value,n)=>assert.ok(Math.abs(value-original[i].elements[n])<1e-6));
}

// Partes articuladas não podem ser incorporadas ao cenário estático.
const animated=new THREE.Group(),arm=new THREE.Group();
for(let i=0;i<4;i++)arm.add(new THREE.Mesh(new THREE.BoxGeometry(.1,.2,.3),material));
animated.add(arm);assert.equal(batchStatic(animated,[arm]),0);assert.equal(arm.children.length,4);
console.log('PASSOU: enquadramento, toques nas pontes, chanfros, instâncias e partes articuladas.');

// A capa continua presa aos ombros e sua malha se move ao caminhar.
const {makeCloak,animateCloth,batchRig,updateRig}=await import('../character-cloth.js');
const cloth=makeCloak(.7,1,new THREE.MeshStandardMaterial(),new THREE.MeshStandardMaterial());
const first=cloth.geometry.attributes.position.array.slice();
animateCloth([cloth],1,true,0);const later=cloth.geometry.attributes.position.array;
assert.equal(later[2],first[2],'O ombro da capa se soltou');
assert.notEqual(later.at(-1),first.at(-1),'A capa não deformou');
const actor=new THREE.Group(),joint=new THREE.Group();actor.add(joint);
for(let i=0;i<3;i++){const part=new THREE.Mesh(new THREE.BoxGeometry(.1,.2,.1),material);part.position.x=i*.2;joint.add(part)}
const rig=batchRig(actor);joint.rotation.x=.7;updateRig(rig);
const record=rig.records[0],partMatrix=new THREE.Matrix4();record.mesh.getMatrixAt(1,partMatrix);
assert.ok(partMatrix.elements.every((n,i)=>Math.abs(n-record.sources[1].matrixWorld.elements[i])<1e-6),'Articulação perdida ao instanciar');
console.log('PASSOU: tecido articulado e agrupamento dinâmico de personagens 3D.');

// Proporções reais dos modelos: adultos legíveis, gigante maior, lobo comprido.
const {createCharacter,characterProfiles}=await import('../character-models.js');
const context={mat:(color,metalness=.1,roughness=.8)=>new THREE.MeshStandardMaterial({color,metalness,roughness}),
 outfit:()=>new THREE.MeshStandardMaterial({color:0x244760}),outfitMaterials:new Set()};
const measures={};
for(const id of Object.keys(characterProfiles)){
 const model=createCharacter(id,'ally',context);model.scale.setScalar(characterProfiles[id].scale);
 const bounds=new THREE.Box3().setFromObject(model);measures[id]=bounds.getSize(new THREE.Vector3());
 assert.ok(bounds.max.y>1||id==='lobo','Personagem humano pequeno demais: '+id);
 assert.equal(model.userData.legs.length,id==='lobo'?4:2);
 if(['batedor','liliti'].includes(id))assert.equal(model.userData.magicHands.length,2);
 if(id==='rei')assert.equal(model.userData.hair.length,0);
 if(id==='liliti')assert.ok(model.userData.hair.length>=6,'Cabelo ruivo sem volume');
}
assert.ok(measures.colosso.y>measures.soldado.y*1.4,'Colosso perdeu a estatura');
assert.ok(measures.colosso.x>measures.soldado.x*1.2,'Colosso perdeu a largura');
assert.ok(measures.lobo.z>measures.lobo.y,'Lobo sem proporção de quadrúpede');
await import('../arena-layout.js');
const layout=globalThis.CercoArenaLayout;
for(let slot=0;slot<3;slot++)assert.equal(layout.positions.ally[slot].y+layout.positions.enemy[slot].y,layout.height,
 'As defesas não estão simétricas');
assert.ok(layout.positions.enemy[0].y-layout.positions.enemy[2].y>=176,'Castelo e torre próximos demais');
console.log('PASSOU: identidade, proporções humanas, estatura do Colosso e bases simétricas.');
