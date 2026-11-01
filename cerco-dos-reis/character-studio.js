import * as THREE from './vendor/three.module.js';

// Estúdio local: refletores na iluminação ambiente revelam metal, tecido e pele.
// Não carrega HDRs, modelos ou texturas de serviços externos.
export function characterStudio(renderer,scene){
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.03;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const faces=Array.from({length:6},(_,side)=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d'),gradient=ctx.createLinearGradient(0,0,0,128);
  gradient.addColorStop(0,side===2?'#d3dce0':'#86939b');gradient.addColorStop(.52,'#4f6272');gradient.addColorStop(1,'#172637');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  if(side===0||side===4){const glow=ctx.createRadialGradient(41,35,2,41,35,50);glow.addColorStop(0,'rgba(255,241,215,.88)');glow.addColorStop(1,'rgba(255,241,215,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,128,128)}
  return canvas;
 });
 const environment=new THREE.CubeTexture(faces);environment.colorSpace=THREE.SRGBColorSpace;environment.needsUpdate=true;
 scene.environment=environment;scene.environmentIntensity=.8;
 scene.add(new THREE.HemisphereLight(0xd4e5f6,0x26303a,.78));
 const key=new THREE.DirectionalLight(0xffe5c0,3.0);key.position.set(-3,5,5);key.castShadow=true;
 key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-2,right:2,top:3,bottom:-2,near:.1,far:14});
 key.shadow.bias=-.00018;key.shadow.normalBias=.015;key.shadow.radius=3;scene.add(key);
 const fill=new THREE.DirectionalLight(0x93b9dc,.75);fill.position.set(4,2,1);scene.add(fill);
 const rim=new THREE.DirectionalLight(0xe7cba0,1.8);rim.position.set(1,4,-3);scene.add(rim);
 const plinth=new THREE.Group();
 const floor=new THREE.Mesh(new THREE.CylinderGeometry(.77,.82,.055,64),new THREE.MeshStandardMaterial({color:0x172739,metalness:.25,roughness:.60}));
 floor.position.y=-.04;floor.receiveShadow=true;plinth.add(floor);
 const trim=new THREE.Mesh(new THREE.TorusGeometry(.76,.008,5,64),new THREE.MeshStandardMaterial({color:0x9e8050,metalness:.65,roughness:.5}));
 trim.rotation.x=Math.PI/2;trim.position.y=-.01;plinth.add(trim);scene.add(plinth);
 return {plinth,environment,key};
}
