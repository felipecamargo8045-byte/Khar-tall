import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {bevelBox,fitArena,pickGround,floorHeight,batchStatic} from '../arena-atmosphere.js';

// A câmera deve mostrar as coroas e preservar o local tocado em qualquer tela.
const camera=new THREE.OrthographicCamera(-6,6,8,-8,.1,90);
camera.position.set(0,23,18);camera.lookAt(0,.4,0);
const caster=new THREE.Raycaster(),hit=new THREE.Vector3();
for(const [width,height] of [[360,520],[390,610],[844,300],[1200,700]]){
 fitArena(camera,width,height);
 const landmarks=[[0,4.95,-6.77],[0,4.95,6.77]];
 for(const x of [-5.25,5.25])for(const z of [-7,7])landmarks.push([x,floorHeight(x,z),z]);
 for(const point of landmarks){
  const projected=new THREE.Vector3(...point).project(camera);
  assert.ok(Math.abs(projected.x)<1&&Math.abs(projected.y)<1,'Cenário cortado em '+width+'x'+height);
 }
 for(const [x,z] of [[-2.5,0],[2.5,-.6],[-2.5,3.2],[2.5,-4],[0,4],[-4.6,2]]){
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
