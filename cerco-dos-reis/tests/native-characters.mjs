import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/GLTFLoader.js';
import {createSkinnedCharacter,animateNativeCharacter,disposeNativeCharacter} from '../native-characters.js';

const profile={scale:.54,height:1,width:1,identity:['capuz','espada','escudo-ponta']};
for(const filename of ['soldado-refinado.glb','soldado-refinado-campo.glb']){
 const bytes=await readFile(new URL('../models/'+filename,import.meta.url));
 const asset=await new Promise((resolve,reject)=>new GLTFLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'',resolve,reject));
 assert.deepEqual(asset.animations.map(clip=>clip.name),['Idle','Walk','Attack','Hit','Death']);
 const materials=new Set(),context={outfitMaterials:materials,outfit:(team)=>{
  const material=new THREE.MeshStandardMaterial({color:team==='ally'?0x8bd9b1:0x9e3d50});
  if(team==='ally'){material.userData.defaultColor=0x2c78a8;materials.add(material)}return material;
 }};
 const one=createSkinnedCharacter(asset,'soldado','ally',context,profile);
 const two=createSkinnedCharacter(asset,'soldado','ally',context,profile);
 const enemy=createSkinnedCharacter(asset,'soldado','enemy',context,profile);
 let meshOne,meshTwo;
 one.traverse(mesh=>{if(mesh.isSkinnedMesh)meshOne=mesh});
 two.traverse(mesh=>{if(mesh.isSkinnedMesh)meshTwo=mesh});
 assert.notEqual(meshOne.skeleton,meshTwo.skeleton,'Os dois Soldados compartilham o esqueleto');
 assert.notEqual(meshOne.skeleton.bones[0],meshTwo.skeleton.bones[0]);
 assert.equal(meshOne.skeleton.bones.length,75);
 const secondPose=meshTwo.skeleton.bones.map(bone=>bone.quaternion.toArray());
 animateNativeCharacter(one,{clock:.01,walking:true,hp:100});
 for(let step=1;step<=12;step++)animateNativeCharacter(one,{clock:.01+step/30,walking:true,hp:100});
 assert.equal(one.userData.nativeAnimation.current,'Walk');
 assert.ok(meshOne.skeleton.bones.some((bone,i)=>bone.quaternion.toArray().some((v,j)=>Math.abs(v-secondPose[i][j])>.01)),'Caminhada sem articulação');
 meshTwo.skeleton.bones.forEach((bone,i)=>assert.deepEqual(bone.quaternion.toArray(),secondPose[i],'Um soldado moveu o outro'));
 animateNativeCharacter(one,{clock:.45,attackPulse:.4,hp:100});
 animateNativeCharacter(one,{clock:.55,attackPulse:.3,hp:100});
 assert.equal(one.userData.nativeAnimation.current,'Attack');
 animateNativeCharacter(one,{clock:.6,hp:90});
 assert.equal(one.userData.nativeAnimation.current,'Hit');
 animateNativeCharacter(one,{clock:1,hp:90});
 assert.equal(one.userData.nativeAnimation.current,'Idle');
 const fixed=one.userData.nativeAnimation.materials.filter(material=>material.userData.skin_region!=='cloth');
 const colors=fixed.map(material=>material.color.getHex());
 for(const material of materials)material.color.set(0x86d9ab).multiplyScalar(material.userData.dyeFactor??1);
 assert.deepEqual(fixed.map(material=>material.color.getHex()),colors,'A skin recoloriu o ouro ou a pele');
 assert.ok(one.userData.nativeAnimation.materials.some(material=>material.userData.skin_region==='cloth'));
 assert.ok(enemy.userData.nativeAnimation.materials.filter(m=>m.userData.skin_region==='cloth').every(m=>!materials.has(m)));
 for(const clip of asset.animations){
  const mixer=new THREE.AnimationMixer(two.userData.nativeAnimation.body);
  mixer.clipAction(clip).play();
  for(let step=0;step<5;step++){
   mixer.setTime(clip.duration*step/5);two.updateMatrixWorld(true);
   two.traverse(mesh=>{if(mesh.isSkinnedMesh){mesh.skeleton.update();mesh.computeBoundingBox()}});
   const bounds=new THREE.Box3().setFromObject(two,true),size=bounds.getSize(new THREE.Vector3());
   assert.ok([...bounds.min.toArray(),...bounds.max.toArray()].every(Number.isFinite),'Pose com valores inválidos');
   assert.ok(size.length()<5,'A malha explodiu em '+clip.name);
  }
  mixer.stopAllAction();mixer.uncacheRoot(two.userData.nativeAnimation.body);
 }
 for(const actor of [one,two,enemy])disposeNativeCharacter(actor,materials);
 assert.equal(materials.size,0,'Materiais de skin ficaram registrados após remover as tropas');
 console.log('PASSOU: '+filename+' — clipes, esqueletos independentes, dano, roupas, poses e remoção.');
}
