import * as THREE from './vendor/three.module.js';
import {bevelBox,reliefMap,floorHeight,pickGround,fitArena,createAtmosphere,characterShadow,batchStatic,framingInfo} from './arena-atmosphere.js?v=2';

// Arena WebGL 3D local, geometria própria e sem serviços pagos.
// Modelo visual independente do motor de combate; não substitui suas regras.
const host=document.getElementById('arena3d');
const shell=document.querySelector('.canvas-box');
const gameCanvas=document.getElementById('arena');
const W=420,H=560,SCALE=40;
const position=(x,y)=>new THREE.Vector3((x-W/2)/SCALE,0,(y-H/2)/SCALE);
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const teams={
 ally:{cloth:0x2c78a8,glow:0x7cdeee,flag:0x348cc4},
 enemy:{cloth:0x9e3d50,glow:0xf9a0ad,flag:0xc1536c}
};
const mat=(color,metalness=.08,roughness=.83)=>new THREE.MeshStandardMaterial({color,metalness,roughness,flatShading:false});
const stone=mat(0x8194a8),darkStone=mat(0x344354),stoneLight=mat(0xb2c6d5);
const iron=mat(0x8994a5,.8,.35),black=mat(0x131a27,.35),gold=mat(0xc6a569,.7,.34);
const wood=mat(0xae8650),grass=mat(0x4a725b),dirt=mat(0x607b70),water=new THREE.MeshStandardMaterial({color:0x277a9d,metalness:.25,roughness:.3,transparent:true,opacity:.93});
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
  ally:['#7899b6','#9db2c6','#55748f','#b6c7d7'],
  enemy:['#977989','#b69dac','#6c5265','#cab1bd'],
  road:['#6b7c7b','#879494','#53666c','#a1a9a3']
 };
 const cols=palettes[style]||palettes.road;
 const canvas=document.createElement('canvas');
 canvas.width=256;canvas.height=256;
 const p=canvas.getContext('2d'),seed=style.length+19;
 let rand=seed;
 function random(){rand=(rand*1664525+1013904223)>>>0;return rand/4294967296}
 p.fillStyle=cols[2];p.fillRect(0,0,256,256);
 const blockHeight=style==='road'?37:31;
 const blockWidth=style==='road'?61:72;
 for(let row=0,y=0;y<256;row++,y+=blockHeight){
   const shift=row%2?blockWidth/2:0;
   for(let x=-blockWidth;x<256+blockWidth;x+=blockWidth){
    const px=x+shift, inset=1.2+random()*1.2;
    p.fillStyle=cols[Math.floor(random()*cols.length)];
    p.fillRect(px+inset,y+inset,blockWidth-2*inset,blockHeight-2*inset);
    p.fillStyle='rgba(245,238,212,.16)';p.fillRect(px+inset+2,y+inset+2,blockWidth-5,2);
    p.fillStyle='rgba(14,25,35,.21)';p.fillRect(px+inset,y+blockHeight-4,blockWidth-4,2);
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
 const result=new THREE.MeshStandardMaterial({map:tex,bumpMap:reliefMap(tex),bumpScale:.055,
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
// Direção de arte: fantasia estilizada, limpa e legível. Iluminação de
// maquete, detalhes vivos e pontes grandes; assets e padrões são originais.
function surfaceTexture(style){
 const canvas=document.createElement('canvas');
 canvas.width=512;canvas.height=512;
 const ctx=canvas.getContext('2d'),seed=style==='grass'?1931:2701;
 let n=seed;
 function rnd(){n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296}
 const green=style==='grass';
 ctx.fillStyle=green?'#83bc72':'#c6ba9b';
 ctx.fillRect(0,0,512,512);
 for(let r=0;r<8;r++)for(let c=0;c<8;c++){
  const x=c*64,y=r*64;
  const shades=green?['#8dcf77','#80bf72','#94ce81','#7cb96c','#a0d48b']:['#c3b9a2','#d5c9aa','#b2aea0','#d8ceb7','#bdbda8'];
  ctx.fillStyle=shades[Math.floor(rnd()*shades.length)];
  ctx.fillRect(x+1,y+1,62,62);
  ctx.fillStyle=green?'rgba(39,101,48,.12)':'rgba(52,62,66,.13)';
  ctx.fillRect(x+1,y+61,62,2);
  ctx.strokeStyle=green?'rgba(245,255,206,.28)':'rgba(253,248,211,.22)';
  ctx.lineWidth=1;ctx.strokeRect(x+2,y+2,60,60);
  for(let z=0;z<14;z++){
   const xx=x+4+rnd()*55,yy=y+4+rnd()*55;
   ctx.fillStyle=green?(rnd()>.5?'rgba(36,113,54,.18)':'rgba(245,246,173,.17)'):'rgba(92,88,78,.12)';
   ctx.fillRect(xx,yy,2+rnd()*2,1+rnd()*3);
  }
 }
 const tex=new THREE.CanvasTexture(canvas);
 tex.colorSpace=THREE.SRGBColorSpace;
 tex.wrapS=THREE.RepeatWrapping;tex.wrapT=THREE.RepeatWrapping;
 tex.anisotropy=2;
 tex.repeat.set(green?1.7:1,green?2.4:4);
 return tex;
}
function terrain(){
 // Plataforma em camadas: a borda, o leito do rio e as pontes têm volume real.
 put(scene,bevelBox(12.20,.24,15.62,mat(0x233648),.06),0,-.69,0);
 const base=bevelBox(12.05,.52,15.45,mat(0x334a5b),.07);put(scene,base,0,-.39,0);
 for(const x of [-5.80,5.80])put(scene,bevelBox(.16,.13,15.17,gold,.025),x,-.12,0);
 for(const z of [-7.50,7.50])put(scene,bevelBox(11.70,.13,.16,gold,.025),0,-.12,z);
 const grassMap=surfaceTexture('grass');grassMap.repeat.set(1.7,1.1);
 const grassMaterial=new THREE.MeshStandardMaterial({map:grassMap,bumpMap:reliefMap(grassMap),
  bumpScale:.024,roughness:.95,envMapIntensity:.28});
 for(const z of [-4.0575,4.0575]){
  const field=box(11.48,.14,6.765,grassMaterial);
  put(scene,field,0,-.059,z);field.receiveShadow=true;
 }
 // As pistas param na margem; a água está abaixo das tábuas da ponte.
 const pathMap=surfaceTexture('path');pathMap.repeat.set(1,1.85);
 const roadMat=new THREE.MeshStandardMaterial({map:pathMap,bumpMap:reliefMap(pathMap),
  bumpScale:.048,roughness:.85,envMapIntensity:.3});
 for(const x of [-2.5,2.5]){
   for(const z of [-3.705,3.705]){
    const path=box(2.54,.045,6.07,roadMat);
    put(scene,path,x,.035,z);path.receiveShadow=true;
   }
   const sideLine=mat(0xdacda9);
   for(const d of [-1,1]){
    for(const z of [-3.705,3.705])put(scene,box(.075,.038,6.07,sideLine),x+d*1.32,.057,z);
   }
   for(let z=-6.3;z<6.4;z+=.8){
     if(Math.abs(z)>.98)put(scene,box(2.5,.02,.032,mat(0x8b8c80)),x,.065,z);
   }
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
   for(const z of [-.90,.90])put(scene,bevelBox(2.78,.17,.30,mat(0xd5c49e),.035),x,.11,z);
   for(const side of [-1,1])put(scene,box(.16,.22,1.80,mat(0x79553a)),x+side*1.02,.16,0);
   for(let i=0;i<9;i++){
     const z=-.80+i*.20,y=floorHeight(x,z);
     const plank=bevelBox(2.54,.075,.194,mat(i%2?0xd4a36b:0xbd8a52),.012);
     put(scene,plank,x,y-.0375,z);
     for(const side of [-1,1])put(scene,cyl(.027,.027,.012,iron,6),x+side*1.1,y+.007,z);
   }
   for(const d of [-1,1]){
     const side=x+d*1.31;
     put(scene,bevelBox(.095,.13,1.84,mat(0xffdf96),.016),side,.51,0);
     for(const z of [-.75,0,.75]){
       const post=box(.14,.48,.14,gold);put(scene,post,side,.54,z);
       put(scene,sphere(.105,mat(0xffd985)),side,.83,z);
     }
   }
 }
 // Rochas de margem com contraste; entradas das pontes ficam totalmente livres.
 const bankStone=mat(0xc1c9be),bankShade=mat(0x789998);
 for(const z of [-.79,.79]){
  for(let k=0;k<24;k++){
   const x=-5.3+(k+.5)*.45;
   if(Math.abs(x-2.5)<1.44||Math.abs(x+2.5)<1.44)continue;
   const rock=cyl(.22,.29,.21,k%3===0?bankShade:bankStone,7);
   put(scene,rock,x,.20,z);
  }
 }
 // Parapeitos coloridos: limite real do campo (visual).
 for(const x of [-5.76,5.76]){
   put(scene,box(.30,.39,15.1,mat(0x849cad)),x,.19,0);
   put(scene,box(.38,.12,15.2,mat(0xe6cf9b)),x,.43,0);
   for(let z=-6.7;z<6.9;z+=1.7){
     put(scene,box(.48,.40,.47,mat(0xc1d1d7)),x,.60,z);
     put(scene,cone(.26,.34,mat(0x5b778c),6),x,.96,z);
   }
 }
 for(const z of [-7.36,7.36]){
   const m=z<0?mat(0xaa6078):mat(0x498eb4);
   put(scene,box(11.7,.30,.37,m),0,.18,z);
   put(scene,box(11.7,.06,.45,gold),0,.36,z);
 }
 // Mosaicos laterais, arbustos, tochas e bandeiras, mantendo o centro limpo.
 for(let i=0;i<24;i++){
    const x=(i%2?1:-1)*(4.3+(i%4)*.30);
    const z=-6.55+(i%12)*1.16;
    if(i%3===0){
      put(scene,sphere(.28,mat(i%2?0x5c9d56:0x4f9e70)),x,.26,z);
      put(scene,sphere(.2,mat(0x9ccd80)),x+.16,.25,z-.1);
    }else{
      put(scene,cone(.15,.33,mat(0x3e885c)),x,.23,z);
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
function crenel(parent,x,z,w,count,h){
 for(let i=0;i<count;i++){
  put(parent,box(w/count*.74,h,.27,stoneLight),x-w/2+(i+.5)*w/count,.03,z);
 }
}
function makeFortress(team,main){
 const colors=teams[team],group=new THREE.Group();
 const theme=mat(colors.cloth,.35),flag=mat(colors.flag,.14);
 const wide=main?2.45:1.7;
 const level=main?2.15:1.55;
 const base=bevelBox(wide+.14,.3,1.59,darkStone,.045);put(group,base,0,.18,0);
 put(group,bevelBox(wide+.26,.10,1.72,stoneLight,.02),0,.065,0);
 const fortressStone=texturedStone(team);
 const keep=bevelBox(wide*.78,level,1.04,fortressStone,.045);put(group,keep,0,level/2+.28,0);keep.castShadow=true;
 // Muralhas com blocos, ameias e cincoiras.
 for(let row=0;row<5;row++){
  for(let col=0;col<3;col++){
   const block=box(.07,.045,.18,darkStone);
   put(group,block,-wide*.34+(col+row%2*.5)*wide*.24,.57+row*level/5,.535);
  }
 }
 crenel(group,0,.56,wide*.83,main?9:7,.34);
 for(const side of [-1,1]){
   const turret=new THREE.Group();
   const x=side*wide*.49;
   const shaft=cyl(.31,.34,level+0.42,fortressStone,8);
   put(turret,shaft,0,(level+.42)/2+.18,0);shaft.castShadow=true;
   const crown=cyl(.44,.40,.25,mat(0xf3d8a5),9);put(turret,crown,0,level+.38,0);
   for(let j=0;j<8;j++){
    const a=j*Math.PI/4;
    const merlon=box(.21,.32,.18,stone);
    merlon.position.set(Math.sin(a)*.37,level+.6,Math.cos(a)*.37);
    merlon.rotation.y=a;turret.add(merlon);
   }
   const roof=cone(.42,.94,theme,9);put(turret,roof,0,level+1.09,0);
   put(turret,sphere(.10,gold),0,level+1.61,0);
   put(group,turret,x,0,-.32);
 }
 // Portão arqueado com ferragens reais.
 const gate=box(.56,.80,.07,black);put(group,gate,0,.60,.556);
 put(group,new THREE.Mesh(new THREE.CircleGeometry(.28,16,0,Math.PI),black),0,.98,.602);
 for(let i=-1;i<=1;i++){
   put(group,box(.035,.76,.075,wood),i*.17,.59,.635);
 }
 put(group,box(.67,.07,.11,gold),0,.31,.65);
 for(let x of [-.46,.46]){
   const window=box(.13,.36,.06,black);put(group,window,x,level*.75,.57);
   put(group,box(.04,.23,.07,theme),x,level*.75,.61);
 }
 // Estandartes de facção, com haste e tecido 3D.
 for(const side of main?[-.59,.59]:[0]){
   const pole=cyl(.028,.028,1.12,gold,7);put(group,pole,side,level+1.04,.04);
   const banner=box(.38,.38,.035,flag);put(group,banner,side+.16,level+1.34,.04);
   put(group,box(.2,.12,.04,gold),side+.16,level+1.36,.068);
 }
 // Faixa luminosa de facção visível de longe, mesmo no celular.
 const ribbon=box(wide*.79,.085,1.10,theme);put(group,ribbon,0,level+.12,0);
 const crest=box(.25,.29,.09,gold);put(group,crest,0,level+.04,.63);
 put(group,box(.11,.19,.10,theme),0,level+.04,.70);

 // Arquitetura realçada: telhado inclinado, parapeitos e emblema gravado.
 const roofing=mat(team==='ally'?0x2379a6:0xa23b58,.17,.62);
 const roofRidge=new THREE.Mesh(new THREE.ConeGeometry(wide*.455,main?.95:.64,4),roofing);
 roofRidge.rotation.y=Math.PI/4;
 put(group,roofRidge,0,level+(main?.75:.60),-.02);
 roofRidge.castShadow=true;
 put(group,box(wide*.67,.08,1.1,mat(0xe9c57f,.6,.33)),0,level+.29,-.03);
 for(const dir of [-1,1]){
   // Contrafortes em pedra clara, portas secundárias e janelas coloridas.
   const buttress=box(.18,level*.66,.31,stoneLight);
   put(group,buttress,dir*(wide*.35),level*.34,.56);
   const slit=box(.075,.33,.075,mat(0x162c3e));
   put(group,slit,dir*(wide*.26),level*.68,.594);
   put(group,box(.036,.23,.08,mat(team==='ally'?0x77d7ff:0xf99cae)),dir*(wide*.26),level*.68,.635);
   const ornament=box(.24,.24,.11,gold);
   ornament.rotation.z=Math.PI/4;
   put(group,ornament,dir*(wide*.33),level*.48,.675);
 }
 // Pórtico com arco de pedra e degraus sobrepostos.
 const portal=new THREE.Group();
 const upperArc=new THREE.Mesh(new THREE.TorusGeometry(.36,.08,5,16,Math.PI),stoneLight);
 put(portal,upperArc,0,.98,.65);
 for(const side of [-1,1])put(portal,bevelBox(.14,.84,.19,stoneLight,.02),side*.36,.56,.64);
 put(portal,bevelBox(.19,.19,.23,stoneLight,.02),0,1.37,.64);
 put(portal,box(.91,.12,.36,mat(0xba9869)),0,.20,.77);
 put(portal,box(1.07,.10,.44,mat(0xd3b886)),0,.10,.83);
 group.add(portal);
 if(main){
  // Castelo principal: torre central mais alta e coroa distinta.
  const highTower=cyl(.41,.45,1.16,fortressStone,10);
  put(group,highTower,0,level+1.03,-.42);
  const upperRoof=cone(.50,1.0,roofing,7);
  put(group,upperRoof,0,level+1.95,-.42);
  put(group,sphere(.12,gold),0,level+2.5,-.42);
  for(const dir of [-1,1]){
   const crownBanner=box(.22,.64,.045,flag);
   put(group,crownBanner,dir*.27,level+1.15,-.04);
   const cap=box(.27,.06,.07,gold);
   put(group,cap,dir*.27,level+1.45,-.01);
  }
 }
 // Arqueiros montam guarda nos parapeitos e puxam os arcos ao atirar.
 const bowArms=[];
 for(const offset of main?[-.67,.67]:[0]){
   const sentry=new THREE.Group();
   const tint=mat(team==='ally'?0x3b85ba:0xa04a60);
   put(sentry,cyl(.13,.15,.30,tint,8),0,.23,0);
   put(sentry,sphere(.115,skin),0,.48,0);
   put(sentry,cone(.14,.17,darkStone,8),0,.63,0);
   const arm=pivot(sentry,.11,.37,.02);
   put(arm,cyl(.036,.045,.29,tint,7),0,-.10,0);
   const bow=pivot(arm,.05,-.21,.05);
   horizontalPath(bow,[[-.19,.24,0],[-.29,0,.02],[-.19,-.24,0]],.022,wood);
   horizontalPath(bow,[[-.19,.24,.035],[-.15,0,.035],[-.19,-.24,.035]],.008,gold);
   sentry.position.set(offset,level+.25,.74);
   group.add(sentry);bowArms.push(arm);
 }
 group.userData.bowArms=bowArms;
  group.userData.material=theme;
 group.userData.castle=main;
 group.userData.team=team;
 group.traverse(mesh=>{if(mesh.isMesh){mesh.castShadow=true;mesh.receiveShadow=true}});
 batchedPieces+=batchStatic(group,bowArms);
 return group;
}
function buildForts(){
 for(const team of ['enemy','ally']){
  const enemy=team==='enemy';
  const flip=enemy?Math.PI:0;
  const z=enemy?-4.48:4.48;
  for(let lane=0;lane<2;lane++){
    const fortress=makeFortress(team,false);
    fortress.rotation.y=flip;
    fortress.position.set(lane===0?-2.5:2.5,0,z);
    scene.add(fortress);
    const bar=makeHealthBar(team,1.9);
    scene.add(bar);
    forts.push({mesh:fortress,bar,team,lane});
  }
  const big=makeFortress(team,true);
  big.position.set(0,0,enemy?-6.35:6.35);
  big.rotation.y=flip;
  scene.add(big);
  const bar=makeHealthBar(team,2.3);scene.add(bar);
  forts.push({mesh:big,bar,team,lane:-1});
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
function armor(m,color,scale=1){
 const shell=box(.64*scale,.58*scale,.4*scale,m);
 shell.castShadow=true;return shell;
}
function makeHuman(id,team){
 const colors=teams[team];
 const group=new THREE.Group();
 const cloth=mat(colors.cloth),accent=mat(colors.glow,.4),leather=mat(0x4e3b35),plate=mat(id==='colosso'?0x77736e:0x606f7b,.58,.45);
 const isGiant=id==='colosso',royal=['rei','guardiao','liliti'].includes(id);
 const size=isGiant?1.4:id==='liliti'?1.06:1;
 const hips=.8*size,torso=.85*size,head=1.61*size;
 const legs=[];
 for(const d of [-1,1]){
  const j=pivot(group,d*.18*size,hips,0);
  const limb=put(j,cyl(.105*size,.12*size,.7*size,leather,8),0,-.34*size,0);
  limb.castShadow=true;
  put(j,box(.24*size,.13*size,.38*size,darkStone),0,-.72*size,.11*size);
  legs.push(j);
 }
 const body=pivot(group,0,hips+.18*size,0);
 put(body,armor(plate,id,size*.95),0,.22*size,0);
 const tabard=box(.42*size,.69*size,.07*size,cloth);
 put(body,tabard,0,-.13*size,.25*size);
 if(royal||isGiant){
   const cape=box(.74*size,.75*size,.08*size,cloth);
   put(body,cape,0,-.07*size,-.3*size);
 }
 const headMesh=sphere(.29*size,skin);put(body,headMesh,0,.76*size,0);headMesh.castShadow=true;
 if(id==='liliti'){
  put(body,sphere(.315*size,redHair),0,.91*size,-.08*size);
  for(const d of [-1,1]){put(body,box(.1*size,.61*size,.13*size,redHair),d*.28*size,.52*size,-.08*size);}
  for(const d of [-1,1])put(body,sphere(.05*size,green),d*.12*size,.78*size,.246*size);
 }else if(id==='rei'){
  const crown=cyl(.32*size,.32*size,.22*size,gold,8);put(body,crown,0,1.07*size,0);
  for(let i=0;i<7;i++){const a=i*2*Math.PI/7;put(body,cone(.065*size,.2*size,gold),Math.sin(a)*.245*size,1.22*size,Math.cos(a)*.245*size);}
 }else if(id==='arqueiro'||id==='soldado'||id==='batedor'){
  const hood=cone(.36*size,.38*size,cloth,7);put(body,hood,0,1.05*size,-.035*size);
 }else{
  const helmet=cone(.35*size,.38*size,plate,7);put(body,helmet,0,1.08*size,0);
  put(body,box(.13*size,.32*size,.09*size,plate),0,.79*size,.26*size);
 }
 const arms=[];
 for(const d of [-1,1]){
  const shoulder=pivot(body,d*.41*size,.49*size,0);
  const arm=cyl(.12*size,.10*size,.67*size,id==='liliti'?cloth:plate,7);
  put(shoulder,arm,0,-.32*size,0);arm.castShadow=true;
  put(shoulder,sphere(.13*size,plate),0,-.62*size,0);
  arms.push(shoulder);
 }
 // Equipamento real em 3D, diferente por classe.
 if(['soldado','rei','guardiao','colosso'].includes(id)){
  const h=1.03*size;
  const sword=pivot(arms[1],0,-.62*size,.13*size);
  put(sword,cyl(.045*size,.05*size,.34*size,gold),0,-.1*size,0);
  put(sword,box(.11*size,.58*size,.09*size,iron),0,-.55*size,0);
  put(sword,box(.34*size,.05*size,.1*size,gold),0,-.30*size,0);
  if(id==='soldado'||id==='guardiao'){
   const shield=cyl(.34*size,.32*size,.11*size,cloth,8);
   shield.rotation.x=Math.PI/2;
   put(arms[0],shield,0,-.40*size,.20*size);
   put(arms[0],sphere(.13*size,gold),0,-.4*size,.265*size);
  }
 }
 if(['arqueiro','batedor'].includes(id)){
  const arc=pivot(arms[0],-.05*size,-.55*size,.12*size);
  horizontalPath(arc,[[-.22, .38,0],[-.36,0,0],[-.22,-.38,0]],.035*size,wood);
  horizontalPath(arc,[[-.22,.38,.01],[-.20,0,.01],[-.22,-.38,.01]],.008*size,gold);
  arc.rotation.z=Math.PI/2;
  put(body,box(.09*size,.9*size,.09*size,wood),.38*size,.1*size,-.32*size);
 }
 if(id==='liliti'){
  const staff=pivot(arms[1],0,-.54*size,.12*size);
  put(staff,cyl(.035*size,.035*size,1.38*size,gold,7),0,-.35*size,0);
  put(staff,sphere(.15*size,green),0,.38*size,0);
 }
 const sash=box(.69*size,.09*size,.42*size,accent);
 put(body,sash,0,-.17*size,0);
 group.userData={legs,arms,body,baseHeight:head,size,hasWolf:false,id};
 return group;
}
function makeWolf(team){
 const colors=teams[team],group=new THREE.Group();
 const hide=mat(team==='ally'?0x565f63:0x635454),fang=mat(0xd5c8ad);
 const body=pivot(group,0,.68,0);
 const torso=put(body,box(.73,.62,1.35,hide),0,0,0);torso.castShadow=true;
 put(body,sphere(.44,hide),0,.18,-.5);
 const neck=box(.57,.49,.58,hide);put(body,neck,0,.23,.65);
 const head=pivot(body,0,.28,.83);
 put(head,box(.53,.45,.62,hide),0,0,.19);
 put(head,box(.34,.24,.51,hide),0,-.10,.65);
 for(const d of [-1,1]){
   put(head,cone(.14,.36,hide,5),d*.2,.32,.08);
   put(head,sphere(.06,mat(team==='ally'?0x9fe7ff:0xffbd9a)),d*.21,.04,.50);
   put(head,cone(.08,.2,fang,4),d*.15,-.2,.80);
 }
 const legs=[];
 for(let zz of [-.45,.5]){
  for(let d of [-1,1]){
   const j=pivot(group,d*.28,.56,zz);
   put(j,cyl(.13,.10,.54,hide,7),0,-.28,0);
   put(j,box(.24,.15,.34,darkStone),0,-.55,.12);
   legs.push(j);
  }
 }
 const tail=pivot(body,0,.05,-.76);
 const sweep=cone(.16,.7,hide,6);sweep.rotation.x=Math.PI/2;put(tail,sweep,0,.12,-.3);
 put(body,box(.66,.13,.82,mat(colors.cloth)),0,.32,0);
 group.userData={legs,arms:[],body,head,tail,hasWolf:true,size:.95,id:'lobo'};
 return group;
}
function makeHealthBar(team,width=.84){
 const node=new THREE.Group();
 const bg=box(width,.105,.025,mat(0x16273c));
 put(node,bg,0,0,0);
 const border=box(width+.07,.155,.016,gold);
 put(node,border,0,0,-.023);
 const fillMat=mat(team==='ally'?0x80e0e8:0xed879a);
 const fill=box(width-.06,.075,.036,fillMat);
 put(node,fill,0,0,.035);
 node.userData.fill=fill;
 node.userData.width=width-.06;
 return node;
}

// Acabamento ilustrado animado no espaço 3D: combina esculturas móveis,
// sombras e silhuetas detalhadas dos personagens originais de Khar Thal.
// Não usa artes ou modelos do jogo de referência.
const characterMotion=new Map();
const motionLoader=new THREE.TextureLoader();
for(const id of ['lobo','arqueiro','soldado','colosso','guardiao','batedor','rei','liliti']){
  motionLoader.load('./motion/motion_'+id+'.webp',tex=>{
    tex.colorSpace=THREE.SRGBColorSpace;
    tex.wrapS=THREE.RepeatWrapping;tex.wrapT=THREE.ClampToEdgeWrapping;
    characterMotion.set(id,tex);
  },undefined,()=>{ /* Exibe modelo 3D quando WebP não é suportado */ });
}

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
function detailedAppearance(u){
 const tex=characterMotion.get(u.card.id);
 if(!tex?.image)return null;
 const frameWidth=tex.image.width/24;
 const aspect=frameWidth/tex.image.height;
 const height=u.card.id==='colosso'?1.50:u.card.id==='lobo'?.92:u.card.id==='rei'?1.30:u.card.id==='liliti'?1.28:u.card.id==='guardiao'?1.34:1.16;
 const width=Math.min(1.48,height*aspect);
 const sheet=tex.clone();
 sheet.needsUpdate=true;
 sheet.wrapS=THREE.RepeatWrapping;
 sheet.repeat.set(1/24,1);
 const material=new THREE.MeshBasicMaterial({
   map:sheet,transparent:true,alphaTest:.055,depthWrite:false,
   side:THREE.DoubleSide,opacity:.99,toneMapped:false
 });
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);
 mesh.renderOrder=8;
 mesh.frustumCulled=false;
 return {mesh,sheet,height};
}
function detailedFrame(u){
 const rate=u.card.id==='lobo'?1.35:u.card.id==='colosso'?.75:1;
 if((u.attackPulse||0)>.0001){
   const progress=clamp(1-(u.attackPulse||0)/.58,0,.999);
   return 16+Math.floor(progress*8);
 }
 if(u.state==='walk')return Math.floor((u.motionTime||0)*9*rate+u.id*.4)%10;
 return 10+Math.floor((u.motionTime||0)*2.4+u.id*.25)%6;
}
function createActor(u){
 const model=u.card.id==='lobo'?makeWolf(u.side):makeHuman(u.card.id,u.side);
 // Proporção de estratégia: tropas menores do que a estrutura que defendem.
 const unitScale=u.card.id==='colosso'?.56:u.card.id==='lobo'?.40:u.card.id==='rei'?.49:u.card.id==='liliti'?.47:.44;
 model.scale.setScalar(unitScale);
 model.traverse(o=>{if(o.isMesh)o.castShadow=true});
 const bar=makeHealthBar(u.side,1.05);
 const appearance=detailedAppearance(u);
 const shadowProxy=characterShadow(u.card.id,appearance?.height||(u.card.id==='lobo'?.92:1.18));
 const shadow=fakeShadow(u.card.id==='colosso'?.95:u.card.id==='lobo'?.75:.72);
 scene.add(model);scene.add(bar);scene.add(shadow);
 scene.add(shadowProxy);
 atmosphere.invalidate();
 if(appearance)scene.add(appearance.mesh);
 return {model,bar,shadow,shadowProxy,appearance,side:u.side,lastFrame:0,position:new THREE.Vector3()};
}
function syncActors(game){
 const live=new Set(game.units.filter(u=>u.hp>0).map(u=>u.id));
 for(const [id,rec] of actors){
  if(!live.has(id)){
    scene.remove(rec.model);scene.remove(rec.bar);scene.remove(rec.shadow);scene.remove(rec.shadowProxy);
    atmosphere.invalidate();
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
  // O modelo físico continua na cena, enquanto a arte animada dá
  // acabamento de personagem real sobre a silhueta geométrica.
  if(!rec.appearance && characterMotion.has(u.card.id)){
     rec.appearance=detailedAppearance(u);
     if(rec.appearance)scene.add(rec.appearance.mesh);
  }
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
  obj.position.y=ground+(walking?.042*Math.sin(phase*2):.012*Math.sin(clock*2));
  // Indicador flutuante, sempre legível, separado do corpo do personagem.
  const visibleHeight=rec.appearance?.height || (u.card.id==='colosso'?1.5:u.card.id==='lobo'?.92:1.18);
  rec.bar.position.set(pos.x,ground+visibleHeight+.18,pos.z);
  rec.bar.quaternion.copy(camera.quaternion);
  const fill=rec.bar.userData.fill;
  if(fill){
   const ratio=clamp(u.hp/u.maxHp,0,1);
   fill.scale.x=Math.max(.01,ratio);
   fill.position.x=-rec.bar.userData.width*(1-ratio)/2;
  }
  const polarity=u.side==='ally'?-1:1;
  // Frontal para alvo real, ou em direção ao castelo adversário.
  const yaw=Number.isFinite(u.heading)?Math.atan2(Math.cos(u.heading),Math.sin(u.heading)):(polarity===-1?Math.PI:0);
  const delta=Math.atan2(Math.sin(yaw-obj.rotation.y),Math.cos(yaw-obj.rotation.y));
  obj.rotation.y+=clamp(delta,-.15,.15);
  rec.shadowProxy.position.copy(obj.position);rec.shadowProxy.rotation.y=obj.rotation.y;
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
  applyUniqueAttackPose(u,rec,anim);
  // O brilho no solo não é um token circular com retrato, apenas indicação de equipe.
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
   from.y=shot.slot===2?3.24:2.44;
   const to=position(shot.toX,shot.toY);to.y=floorHeight(to.x,to.z)+.72;
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

// Cada personagem possui uma assinatura de ataque: o projétil, o impacto e
// a postura são diferentes, inclusive quando a arte ilustrada está ativa.
const ATTACK_COLORS={arrow:0xffe6a7,mark:0x98e9fc,enchant:0xde80ff,shield:0xa1eaf1,
 slash:0xffeac6,bite:0xffb1a0,slam:0xffa45c,royal:0xf4ca72};
function emissiveMaterial(color,opacity=1){
 return new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
}
function attackProjectile(shot){
 const color=ATTACK_COLORS[shot.kind]||0xffd8a6;
 const root=new THREE.Group();
 const thin=['arrow','mark'].includes(shot.kind);
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
 }else if(shot.kind==='enchant'){
  put(root,sphere(.18,emissiveMaterial(0xd47dff,.96)),0,0,0);
  const halo=new THREE.Mesh(new THREE.TorusGeometry(.29,.035,5,22),emissiveMaterial(0xfaacff,.79));
  put(root,halo,0,0,0);
  const halo2=new THREE.Mesh(new THREE.TorusGeometry(.22,.027,5,22),emissiveMaterial(0x73efdf,.85));
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
 if(kind==='bite'){
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
  mesh.position.set(at.x,floorHeight(at.x,at.z)+.65+rise*(shot.kind==='enchant'?.43:.26),at.z);
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
   obj.position.set(p.x,floorHeight(p.x,p.z)+(fx.kind==='slam'?.40:.70),p.z);
   if(fx.kind!=='slam')obj.quaternion.copy(camera.quaternion);
   if(fx.kind==='slash')obj.rotation.z=phase*1.7-.8;
   if(fx.kind==='royal')obj.rotation.z=phase*1.2-.4;
   if(fx.kind==='enchant'||fx.kind==='mark')obj.rotation.z+=.045;
   obj.scale.setScalar(fx.phase==='release'?.40+.20*phase:.52+phase*.85);
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
   if(kind==='arrow'||kind==='mark'){
     if(left){left.rotation.x=-1.15*snap;left.rotation.z=.25*snap}
     if(right){right.rotation.x=-1.42*snap;right.rotation.z=-.30*snap}
     anim.body.rotation.x=-.08*snap;
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
  fort.mesh.scale.y=.84+.16*ratio;
  fort.mesh.visible=hp>0;
  if(fort.bar){
    fort.bar.visible=hp>0;
    fort.bar.position.set(fort.mesh.position.x,fort.lane===-1?3.6:2.65,fort.mesh.position.z);
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
 fitArena(camera,w,h,forts);
 atmosphere?.invalidate();
}
function init(){
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
 // Uma cadência de 24 fps para 3D preserva CPU para o motor da batalha.
 if(now-lastTime<41 && lastTime!==0)return;
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
 return {x:clamp(hit.x*SCALE+W/2,0,W),y:clamp(hit.z*SCALE+H/2,0,H)};
}
window.Cerco3D={
 get ready(){return ready},
 render,screenToBattle,resize:size,
 syncNow:(game)=>{if(ready&&game){syncActors(game);syncForts(game);syncBolts(game);syncTroopVfx(game)}},
 info:()=>({ready,actors:actors.size,projectiles:flyingBolts.size,troopShots:troopBolts.size,attackEffects:troopVfx.size,meshes:scene?.children?.length||0,webgl:renderer?.capabilities?.isWebGL2||false,
  presentation:ready?{shadows:renderer.shadowMap.enabled,shadowSize:atmosphere.sun.shadow.mapSize.x,
   toneMapping:renderer.toneMapping,environment:!!scene.environment,pixelRatio:renderer.getPixelRatio(),
   batchedPieces,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,
   framing:framingInfo(camera,forts)}:null}),
 debugActors:()=>[...actors.entries()].map(([id,rec])=>({id,kind:rec.model.userData.id,illustrated:!!rec.appearance,legs:rec.model.userData.legs?.length||0,
   rotations:rec.model.userData.legs?.map(l=>Number(l.rotation.x.toFixed(3)))||[]}))
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
