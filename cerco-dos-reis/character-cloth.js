import * as THREE from './vendor/three.module.js';
// Tecido 3D preso aos ombros. Ondas percorrem a malha, sem trocar imagens.
export function makeCloak(width,height,cloth,gold){
 const geometry=new THREE.PlaneGeometry(width,height,7,11),base=geometry.attributes.position.array.slice();
 const fabric=cloth.clone();fabric.side=THREE.DoubleSide;
 const hem=gold.clone();hem.side=THREE.DoubleSide;
 geometry.clearGroups();geometry.addGroup(0,7*10*6,0);geometry.addGroup(7*10*6,7*6,1);
 const mesh=new THREE.Mesh(geometry,[fabric,hem]);mesh.castShadow=mesh.receiveShadow=true;
 return {mesh,geometry,base,width,height};
}
export function animateCloth(cloaks,clock,walking,attack){
 for(const cloak of cloaks||[]){
  const position=cloak.geometry.attributes.position,base=cloak.base;
  for(let i=0;i<position.count;i++){
   const n=i*3,x=base[n],y=base[n+1],loose=(cloak.height/2-y)/cloak.height;
   const wind=Math.sin(clock*4.3+loose*6+x*4)*.065+Math.sin(clock*2.4+x*6)*.025;
   position.setXYZ(i,x+Math.sin(clock*3+loose*4)*.025*loose,y,
    -.10*loose+wind*loose*(walking?1.35:.55)-attack*.12*loose);
  }
  position.needsUpdate=true;cloak.geometry.computeVertexNormals();
 }
}
// Instâncias acompanham a hierarquia articulada, reduzindo chamadas à GPU.
export function batchRig(root){
 const groups=new Map(),records=[];root.updateWorldMatrix(true,true);
 root.traverse(mesh=>{
  if(!mesh.isMesh||Array.isArray(mesh.material)||!['BoxGeometry','CylinderGeometry','ConeGeometry','SphereGeometry'].includes(mesh.geometry.type))return;
  const m=mesh.material,key=JSON.stringify([mesh.geometry.type,mesh.geometry.parameters,m.type,m.color?.getHex(),m.metalness,m.roughness,m.userData.defaultColor]);
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(mesh);
 });
 for(const sources of groups.values()){
  if(sources.length<2)continue;
  const first=sources[0],mesh=new THREE.InstancedMesh(first.geometry,first.material,sources.length);
  mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;
  sources.forEach(source=>{source.visible=false});root.add(mesh);records.push({mesh,sources});
 }
 return {root,records,inverse:new THREE.Matrix4(),matrix:new THREE.Matrix4()};
}
export function updateRig(rig){
 rig.root.updateWorldMatrix(true,true);const inverse=rig.inverse.copy(rig.root.matrixWorld).invert();
 for(const {mesh,sources} of rig.records){
  sources.forEach((source,index)=>mesh.setMatrixAt(index,rig.matrix.multiplyMatrices(inverse,source.matrixWorld)));
  mesh.instanceMatrix.needsUpdate=true;
 }
}
