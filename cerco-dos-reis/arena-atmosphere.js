import * as THREE from './vendor/three.module.js';

// Acabamento exclusivamente visual. Coordenadas, rotas e regras pertencem ao motor.

export function bevelBox(width,height,depth,material,bevel=.045){
 const b=Math.min(bevel,height*.3,width*.15,depth*.15);
 const x=width/2-b,z=depth/2-b,shape=new THREE.Shape();
 shape.moveTo(-x,-z);shape.lineTo(x,-z);shape.lineTo(x,z);shape.lineTo(-x,z);shape.closePath();
 const geometry=new THREE.ExtrudeGeometry(shape,{depth:height-2*b,bevelEnabled:true,
  bevelSize:b,bevelThickness:b,bevelSegments:2,steps:1,curveSegments:1});
 geometry.rotateX(-Math.PI/2);geometry.center();
 const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;return mesh;
}

export function reliefMap(texture){
 const source=texture.image,canvas=document.createElement('canvas');
 canvas.width=source.width;canvas.height=source.height;
 const ctx=canvas.getContext('2d');ctx.drawImage(source,0,0);
 const image=ctx.getImageData(0,0,canvas.width,canvas.height),pixels=image.data;
 for(let i=0;i<pixels.length;i+=4){
  const value=Math.round(.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2]);
  pixels[i]=pixels[i+1]=pixels[i+2]=value;
 }
 ctx.putImageData(image,0,0);
 const bump=new THREE.CanvasTexture(canvas);
 bump.colorSpace=THREE.NoColorSpace;
 bump.wrapS=texture.wrapS;bump.wrapT=texture.wrapT;
 bump.repeat.copy(texture.repeat);bump.anisotropy=texture.anisotropy;
 return bump;
}

// A altura visual acompanha a ponte arqueada, sem mudar a navegação do jogo.
export function floorHeight(x,z){
 const lane=Math.min(Math.abs(x-2.5),Math.abs(x+2.5));
 if(lane<1.34&&Math.abs(z)<.98)return .30+.10*Math.cos(z/.98*Math.PI/2);
 return lane<1.3?.065:.018;
}

export function pickGround(ray,target){
 const plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
 if(!ray.intersectPlane(plane,target))return null;
 // Resolve a altura do piso visível, inclusive no arco da ponte.
 for(let i=0;i<4;i++){
  plane.constant=-floorHeight(target.x,target.z);
  if(!ray.intersectPlane(plane,target))return null;
 }
 return target;
}

function projectedForts(camera,forts){
 const bounds=new THREE.Box2();
 for(const fort of forts){
  fort.mesh.updateWorldMatrix(true,true);
  fort.mesh.traverse(mesh=>{
   if(!mesh.isMesh)return;
   if(mesh.isInstancedMesh){if(!mesh.boundingBox)mesh.computeBoundingBox()}
   else if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
   const box=mesh.isInstancedMesh?mesh.boundingBox:mesh.geometry.boundingBox;
   for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
    const p=new THREE.Vector3(x,y,z).applyMatrix4(mesh.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
    bounds.expandByPoint(new THREE.Vector2(p.x,p.y));
   }
  });
 }
 return bounds;
}

export function fitArena(camera,width,height,forts=[]){
 // Enquadra as peças de arquitetura, em vez de um volume vazio acima delas.
 // No retrato, apenas o parapeito decorativo pode sair do quadro; toda a
 // área jogável, coroas e barras de vida permanecem acessíveis.
 camera.updateMatrixWorld(true);
 const bounds=projectedForts(camera,forts);
 const points=[];
 for(const x of [-5.5,5.5])for(const z of [-7.6,7.6])points.push([x,-.81,z]);
 if(!forts.length)for(const z of [-6.77,6.77])points.push([0,4.95,z]);
 for(const point of points){
  const p=new THREE.Vector3(...point).applyMatrix4(camera.matrixWorldInverse);
  bounds.expandByPoint(new THREE.Vector2(p.x,p.y));
 }
 const aspect=Math.max(.28,width/Math.max(1,height));
 const extent=bounds.getSize(new THREE.Vector2()),center=bounds.getCenter(new THREE.Vector2());
 const halfHeight=Math.max(extent.y/2,extent.x/(2*aspect))*1.025;
 camera.left=center.x-halfHeight*aspect;camera.right=center.x+halfHeight*aspect;
 camera.top=center.y+halfHeight;camera.bottom=center.y-halfHeight;
 camera.updateProjectionMatrix();
}

function environment(){
 const faces=Array.from({length:6},(_,side)=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d'),gradient=ctx.createLinearGradient(0,0,0,128);
  if(side===2){gradient.addColorStop(0,'#e9e5df');gradient.addColorStop(1,'#9fb6d2')}
  else if(side===3){gradient.addColorStop(0,'#344455');gradient.addColorStop(1,'#263644')}
  else{
   gradient.addColorStop(0,'#c9d8e7');gradient.addColorStop(.48,'#9aaec0');
   gradient.addColorStop(.55,'#697987');gradient.addColorStop(1,'#35464c');
  }
  ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  if(side===0||side===4){
   const key=ctx.createRadialGradient(36,23,1,36,23,55);
   key.addColorStop(0,'rgba(255,238,203,.95)');key.addColorStop(1,'rgba(255,238,203,0)');
   ctx.fillStyle=key;ctx.fillRect(0,0,128,128);
  }
  return canvas;
 });
 const map=new THREE.CubeTexture(faces);map.colorSpace=THREE.SRGBColorSpace;map.needsUpdate=true;
 return map;
}

let haloTexture;
function halo(){
 if(haloTexture)return haloTexture;
 const c=document.createElement('canvas');c.width=c.height=64;
 const p=c.getContext('2d'),g=p.createRadialGradient(32,32,0,32,32,32);
 g.addColorStop(0,'rgba(255,242,204,.9)');g.addColorStop(.16,'rgba(255,181,91,.45)');
 g.addColorStop(1,'rgba(255,139,54,0)');p.fillStyle=g;p.fillRect(0,0,64,64);
 haloTexture=new THREE.CanvasTexture(c);haloTexture.colorSpace=THREE.SRGBColorSpace;
 return haloTexture;
}

export function createAtmosphere(renderer,scene){
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.10;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
 const backdrop=document.createElement('canvas');backdrop.width=backdrop.height=256;
 const background=backdrop.getContext('2d'),glow=background.createRadialGradient(128,150,10,128,150,190);
 glow.addColorStop(0,'#2a4256');glow.addColorStop(.6,'#192e43');glow.addColorStop(1,'#101e31');
 background.fillStyle=glow;background.fillRect(0,0,256,256);
 scene.background=new THREE.CanvasTexture(backdrop);scene.background.colorSpace=THREE.SRGBColorSpace;
 scene.fog=new THREE.Fog(0x14263b,35,60);
 scene.environment=environment();scene.environmentIntensity=.55;
 scene.add(new THREE.HemisphereLight(0xdceaff,0x3c4c50,1.18));
 scene.add(new THREE.AmbientLight(0xffe4c5,.16));
 const sun=new THREE.DirectionalLight(0xffdfb3,3.0);
 sun.position.set(-8,15,7);sun.castShadow=true;
 const shadowSize=Math.min(2048,renderer.capabilities.maxTextureSize);
 sun.shadow.mapSize.set(shadowSize,shadowSize);
 Object.assign(sun.shadow.camera,{left:-10,right:10,top:12,bottom:-12,near:.5,far:42});
 sun.shadow.camera.updateProjectionMatrix();
 sun.shadow.bias=-.00018;sun.shadow.normalBias=.035;sun.shadow.radius=3;
 scene.add(sun);
 const fill=new THREE.DirectionalLight(0x8fb8ef,.78);fill.position.set(7,9,-8);scene.add(fill);
 const torches=[],waters=[];
 let lastShadow=-Infinity,dirty=true;
 const reducedMotion=window.matchMedia?.('(prefers-reduced-motion:reduce)');
 return {
  sun,torches,waters,
  invalidate(){dirty=true},
  addTorch(x,z){
   const flame=new THREE.Mesh(new THREE.ConeGeometry(.16,.36,7),new THREE.MeshStandardMaterial({
    color:0xffbc6c,emissive:0xff8b32,emissiveIntensity:1.9,roughness:.65}));
   flame.position.set(x,.87,z);scene.add(flame);
   const core=new THREE.Mesh(new THREE.ConeGeometry(.085,.24,6),new THREE.MeshBasicMaterial({color:0xffe6a5,toneMapped:false}));
   core.position.set(x,.83,z+.005);scene.add(core);
   const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:halo(),color:0xffb268,
    transparent:true,opacity:.38,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
   glow.position.set(x,.91,z);glow.scale.set(.87,.87,1);scene.add(glow);
   const light=new THREE.PointLight(0xffb36a,2.2,3.7,2);light.position.set(x,1.0,z);scene.add(light);
   torches.push({flame,core,glow,light,phase:torches.length*1.9});
  },
  addWater(){
   const c=document.createElement('canvas');c.width=c.height=128;
   const p=c.getContext('2d'),image=p.createImageData(128,128);
   for(let y=0;y<128;y++)for(let x=0;x<128;x++){
    const v=128+35*Math.sin(x*Math.PI/16+y*Math.PI/32)+17*Math.cos(y*Math.PI/8-x*Math.PI/32);
    const i=(y*128+x)*4;image.data[i]=image.data[i+1]=image.data[i+2]=v;image.data[i+3]=255;
   }
   p.putImageData(image,0,0);
   const waves=new THREE.CanvasTexture(c);waves.wrapS=waves.wrapT=THREE.RepeatWrapping;
   waves.repeat.set(4.2,.7);
   const material=new THREE.MeshStandardMaterial({color:0x3fb9d7,metalness:.24,roughness:.24,
    bumpMap:waves,bumpScale:.065,envMapIntensity:1.15,emissive:0x0a354c,emissiveIntensity:.08});
   const mesh=new THREE.Mesh(new THREE.BoxGeometry(11.45,.045,1.35),material);
   mesh.position.y=-.09;mesh.receiveShadow=true;scene.add(mesh);waters.push(waves);
   return mesh;
  },
  update(now,moving){
   const t=reducedMotion?.matches?0:now/1000;
   for(const {flame,core,glow,light,phase} of torches){
    const flicker=1+Math.sin(t*7.1+phase)*.055+Math.sin(t*12.3+phase)*.028;
    flame.scale.set(1/flicker,flicker,1/flicker);core.scale.y=flicker;
    glow.material.opacity=.34+(flicker-1)*.7;light.intensity=2.2*flicker;
   }
   for(const waves of waters)waves.offset.set(t*.013,t*.019);
   // Um único mapa de sombra, atualizado a 10 Hz quando há tropas em movimento.
   // Cenário parado reaproveita a mesma sombra, sem renderizações duplicadas.
   if(dirty||(moving&&now-lastShadow>=100)){
    renderer.shadowMap.needsUpdate=true;lastShadow=now;dirty=false;
   }
  }
 };
}

const proxyMaterial=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false});
const proxyBody=new THREE.CapsuleGeometry(.18,.50,3,6);
const proxyHead=new THREE.SphereGeometry(.16,7,5);
const proxyWolf=new THREE.CapsuleGeometry(.23,.46,3,7);
export function characterShadow(id,height){
 const group=new THREE.Group(),wolf=id==='lobo';
 const body=new THREE.Mesh(wolf?proxyWolf:proxyBody,proxyMaterial);
 body.position.y=wolf?.37:.48;if(wolf)body.rotation.x=Math.PI/2;
 const head=new THREE.Mesh(proxyHead,proxyMaterial);head.position.set(0,wolf?.54:1.03,wolf?.43:0);
 body.castShadow=head.castShadow=true;group.add(body,head);
 group.scale.setScalar(height/(wolf?.88:1.20));
 return group;
}

// Agrupa peças estáticas repetidas; arqueiros, braços e efeitos mantêm seus pivôs.
// Isso compensa o custo das sombras sem reduzir a geometria ou as artes.
export function batchStatic(root,exclude=[]){
 root.updateWorldMatrix(true,true);
 const inverse=root.matrixWorld.clone().invert(),groups=new Map(),excluded=new Set(exclude);
 root.traverse(mesh=>{
  if(!mesh.isMesh||mesh.isInstancedMesh||Array.isArray(mesh.material)||mesh.material.transparent)return;
  for(let p=mesh;p&&p!==root;p=p.parent)if(excluded.has(p))return;
  if(!['BoxGeometry','CylinderGeometry','ConeGeometry','SphereGeometry'].includes(mesh.geometry.type))return;
  const m=mesh.material;
  const key=JSON.stringify([mesh.geometry.type,mesh.geometry.parameters,m.type,m.color?.getHex(),m.metalness,
   m.roughness,m.flatShading,m.map?.uuid,m.bumpMap?.uuid,m.bumpScale,m.emissive?.getHex(),m.emissiveIntensity,
   m.side,m.envMapIntensity,mesh.castShadow,mesh.receiveShadow]);
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(mesh);
 });
 let saved=0;
 for(const meshes of groups.values()){
  if(meshes.length<3)continue;
  const sample=meshes[0],batch=new THREE.InstancedMesh(sample.geometry,sample.material,meshes.length);
  batch.castShadow=sample.castShadow;batch.receiveShadow=sample.receiveShadow;
  meshes.forEach((mesh,i)=>{
   batch.setMatrixAt(i,inverse.clone().multiply(mesh.matrixWorld));mesh.removeFromParent();
   if(mesh.geometry!==sample.geometry)mesh.geometry.dispose();
  });
  batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();root.add(batch);saved+=meshes.length-1;
 }
 return saved;
}

export function framingInfo(camera,forts){
 camera.updateMatrixWorld(true);
 const b=projectedForts(camera,forts),width=camera.right-camera.left,height=camera.top-camera.bottom;
 return {left:2*(b.min.x-camera.left)/width-1,right:2*(b.max.x-camera.left)/width-1,
  bottom:2*(b.min.y-camera.bottom)/height-1,top:2*(b.max.y-camera.bottom)/height-1};
}
