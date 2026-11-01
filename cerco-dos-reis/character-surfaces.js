import * as THREE from './vendor/three.module.js';

// Superfícies contínuas com secções elípticas. O volume pertence à malha,
// inclusive na visão de perfil; não depende de retratos ou planos com fotos.
export function loft(rings,material,segments=24,start=0,arc=Math.PI*2){
 const positions=[],uv=[],indices=[],closed=arc>=Math.PI*2-.001,ascending=rings.at(-1)[0]>rings[0][0];
 for(let row=0;row<rings.length;row++){
  const [y,rx,rz,cx=0,cz=0,fold=0]=rings[row];
  for(let col=0;col<=segments;col++){
   const angle=start+arc*col/segments,ripple=1+fold*Math.cos(angle*11);
   positions.push(cx+Math.sin(angle)*rx*ripple,y,cz+Math.cos(angle)*rz*ripple);
   uv.push(col/segments,row/(rings.length-1));
   if(row&&col){const a=(row-1)*(segments+1)+col-1,b=a+segments+1;ascending?indices.push(a,a+1,b,a+1,b+1,b):indices.push(a,b,a+1,a+1,b,b+1)}
  }
 }
 if(closed){
  for(const row of [0,rings.length-1]){
   const r=rings[row],center=positions.length/3;positions.push(r[3]||0,r[0],r[4]||0);uv.push(.5,.5);
   for(let i=0;i<segments;i++){const a=row*(segments+1)+i;(row===0)===ascending?indices.push(center,a+1,a):indices.push(center,a,a+1)}
  }
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
 geometry.userData.signature=JSON.stringify(['loft',rings,segments,start,arc]);
 const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;return mesh;
}

const maps=new Map();
function detailMap(kind){
 if(typeof document==='undefined')return null;
 if(maps.has(kind))return maps.get(kind);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const ctx=canvas.getContext('2d'),data=ctx.createImageData(128,128);
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){
  let n=Math.imul(x+17,374761393)^Math.imul(y+37,668265263);n=Math.imul(n^(n>>>13),1274126177);
  const grain=((n>>>0)%100)/100,thread=(x%3===0?1:0)+(y%3===0?.6:0);
  const value=kind==='cloth'?118+thread*13+grain*8:128+Math.sin(y*1.3)*9+grain*7;
  const i=(y*128+x)*4;data.data[i]=data.data[i+1]=data.data[i+2]=value;data.data[i+3]=255;
 }
 ctx.putImageData(data,0,0);const texture=new THREE.CanvasTexture(canvas);
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(3,4);texture.anisotropy=2;
 maps.set(kind,texture);return texture;
}
export function finishMaterial(material,kind){
 material.bumpMap=detailMap(kind);material.bumpScale=kind==='cloth'?.004:.002;
 material.roughness=kind==='cloth'?.85:.43;material.envMapIntensity=kind==='cloth'?.28:.9;
 return material;
}
export function dyedMaterial(source,factor,registry){
 const material=source.clone();material.color.multiplyScalar(factor);
 material.userData={...source.userData,dyeFactor:factor};finishMaterial(material,'cloth');registry?.add(material);return material;
}

export function sculptedHead(material){
 const geometry=new THREE.SphereGeometry(1,28,20),position=geometry.attributes.position;
 for(let i=0;i<position.count;i++){
  const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
  const jaw=y<-.12?1-.26*Math.min(1,(-y-.12)/.8):1;
  const cheek=Math.max(0,1-Math.abs(y+.12)*3)*Math.max(0,z)*.012;
  position.setXYZ(i,x*.128*jaw,y*.166,z*.116+cheek-(y<-.4?.008:0));
 }
 geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;return mesh;
}

export function makeDress(material,gold,height=1){
 const fabric=material.clone();fabric.side=THREE.DoubleSide;
 const rings=[[-.02,.21,.145,0,0,.018],[-.17,.25,.17,0,-.015,.025],[-.39,.31,.21,0,-.018,.032],
  [-.64,.39,.27,0,-.03,.043],[-.88,.49,.33,0,-.04,.05]].map(r=>[r[0]*height,r[1],r[2],r[3],r[4],r[5]]);
 const skirt=loft(rings,fabric,44,.46,Math.PI*2-.57);
 const trim=gold.clone();trim.side=THREE.DoubleSide;
 const edge=loft([[-.855*height,.48,.325,0,-.04,.05],[-.88*height,.49,.33,0,-.04,.05]],trim,44,.46,Math.PI*2-.57);
 return [skirt,edge].map(mesh=>({mesh,base:mesh.geometry.attributes.position.array.slice(),height:height*.86,top:-.02*height}));
}
export function animateDrapes(drapes,clock,walking=false,attack=0){
 for(const drape of drapes||[]){
  const position=drape.mesh.geometry.attributes.position,base=drape.base;
  for(let i=0;i<position.count;i++){
   const n=i*3,x=base[n],y=base[n+1],z=base[n+2],loose=Math.max(0,Math.min(1,(drape.top-y)/drape.height));
   const wind=Math.sin(clock*2.2+loose*4+x*5)*.017*(walking?1.9:1);
   position.setXYZ(i,x+wind*loose,y,z+Math.sin(clock*2.7+loose*5+x*4)*.018*loose-attack*.04*loose);
  }
  position.needsUpdate=true;drape.mesh.geometry.computeVertexNormals();
 }
}
