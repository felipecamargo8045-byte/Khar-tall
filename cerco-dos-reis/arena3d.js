import * as THREE from './vendor/three.module.js';

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
 const result=new THREE.MeshStandardMaterial({map:tex,roughness:.87,metalness:.06,flatShading:true});
 materialCache.set(style,result);
 return result;
}

const pivot=(group,x,y,z)=>put(group,new THREE.Group(),x,y,z);
function horizontalPath(parent,points,r,m){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
 const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(5,points.length*7),r,6,false),m);
 parent.add(mesh);return mesh;
}

let renderer,scene,camera,clock,ready=false,lastTime=0;
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
const groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
const hit=new THREE.Vector3();
const actors=new Map(),forts=[];
function createRenderer(){
 const r=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
 r.setPixelRatio(Math.min(1,window.devicePixelRatio||1));
 r.shadowMap.enabled=false;
 r.shadowMap.type=THREE.PCFSoftShadowMap;
 r.outputColorSpace=THREE.SRGBColorSpace;
 r.toneMapping=THREE.NoToneMapping;
 r.toneMappingExposure=1.15;
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
 // Grande plataforma 3D com contorno dourado, piso pastel e duas pistas.
 const base=box(12.05,.38,15.45,mat(0x334a5b));put(scene,base,0,-.31,0);
 const edge=box(11.76,.13,15.17,gold);put(scene,edge,0,-.12,0);
 const field=box(11.48,.07,14.88,new THREE.MeshStandardMaterial({map:surfaceTexture('grass'),roughness:.9}));
 put(scene,field,0,-.024,0);field.receiveShadow=true;
 // Caminhos em pedra clara, com bordas bem definidas.
 const roadMat=new THREE.MeshStandardMaterial({map:surfaceTexture('path'),roughness:.82});
 for(const x of [-2.5,2.5]){
   const path=box(2.54,.045,13.48,roadMat);
   put(scene,path,x,.018,0);path.receiveShadow=true;
   const sideLine=mat(0xdacda9);
   for(const d of [-1,1]){
     put(scene,box(.075,.038,13.5,sideLine),x+d*1.32,.052,0);
   }
   for(let z=-6.3;z<6.4;z+=.8){
     put(scene,box(2.5,.02,.032,mat(0x8b8c80)),x,.052,z);
   }
 }
 // Água ciano contrastante: rio intransponível, salvo pelas pontes.
 const brightWater=new THREE.MeshStandardMaterial({color:0x3fb9d7,metalness:.12,roughness:.27,emissive:0x0a354c,emissiveIntensity:.16});
 put(scene,box(11.45,.06,1.35,brightWater),0,.085,0);
 const foam=mat(0xa7ecdf);
 for(let z of [-.61,.61]){
   put(scene,box(11.25,.024,.085,foam),0,.13,z);
 }
 for(let i=0;i<12;i++){
  const ripple=box(.55,.018,.025,mat(i%2?0x81e5eb:0x70d4e5));
  put(scene,ripple,-5.2+i*.92,.13,(i%3-1)*.26);
 }
 // Pontes largas, madeira dourada com tabuas salientes e corrimão.
 for(const x of [-2.5,2.5]){
   const apron=box(2.78,.13,2.08,mat(0xd5c49e));put(scene,apron,x,.14,0);
   const deck=box(2.62,.18,1.80,mat(0x9e6b41));put(scene,deck,x,.245,0);
   for(let i=0;i<9;i++){
     const plank=box(2.54,.045,.18,mat(i%2?0xd4a36b:0xbd8a52));
     put(scene,plank,x,.36,-.77+i*.19);
     put(scene,box(2.55,.025,.023,mat(0x76533b)),x,.383,-.86+i*.19);
   }
   for(const d of [-1,1]){
     const side=x+d*1.31;
     put(scene,box(.095,.13,1.84,mat(0xffdf96)),side,.43,0);
     for(const z of [-.75,0,.75]){
       const post=box(.18,.48,.18,gold);put(scene,post,side,.53,z);
       put(scene,sphere(.13,mat(0xffd985)),side,.84,z);
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
 const base=box(wide,.3,1.45,darkStone);put(group,base,0,.18,0);
 const fortressStone=texturedStone(team);
 const keep=box(wide*.78,level,1.04,fortressStone);put(group,keep,0,level/2+.28,0);keep.castShadow=true;
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
   const crown=cyl(.43,.39,.28,theme,8);put(turret,crown,0,level+.38,0);
   for(let j=0;j<8;j++){
    const a=j*Math.PI/4;
    const merlon=box(.21,.32,.18,stone);
    merlon.position.set(Math.sin(a)*.37,level+.6,Math.cos(a)*.37);
    merlon.rotation.y=a;turret.add(merlon);
   }
   const roof=cone(.45,.63,darkStone,8);put(turret,roof,0,level+.99,0);
   put(group,turret,x,0,-.32);
 }
 // Portão arqueado com ferragens reais.
 const gate=box(.56,.92,.07,black);put(group,gate,0,.68,.556);
 put(group,sphere(.28,black),0,1.11,.566);
 for(let i=-1;i<=1;i++){
   put(group,box(.035,.95,.075,wood),i*.17,.64,.635);
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
 const crest=box(.28,.39,.09,gold);put(group,crest,0,level*.70,.63);
 put(group,box(.12,.25,.10,theme),0,level*.70,.70);
 group.userData.material=theme;
 group.userData.castle=main;
 group.userData.team=team;
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
   put(scene,cone(.16,.35,mat(0xffb86b),7),x,.84,z);
   const light=new THREE.PointLight(0xffa75c,.8,2.5);light.position.set(x,.8,z);scene.add(light);
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
  put(body,box(.13*size,.32*size,plate),0,.79*size,.26*size);
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
function createActor(u){
 const model=u.card.id==='lobo'?makeWolf(u.side):makeHuman(u.card.id,u.side);
 // Proporção de estratégia: tropas menores do que a estrutura que defendem.
 const unitScale=u.card.id==='colosso'?.73:u.card.id==='lobo'?.58:u.card.id==='rei'?.65:u.card.id==='liliti'?.63:.59;
 model.scale.setScalar(unitScale);
 model.traverse(o=>{if(o.isMesh)o.castShadow=true});
 const bar=makeHealthBar(u.side,1.05);
 scene.add(model);scene.add(bar);
 return {model,bar,side:u.side,lastFrame:0,position:new THREE.Vector3()};
}
function syncActors(game){
 const live=new Set(game.units.filter(u=>u.hp>0).map(u=>u.id));
 for(const [id,rec] of actors){if(!live.has(id)){scene.remove(rec.model);scene.remove(rec.bar);actors.delete(id)}}
 for(const u of game.units){
  if(u.hp<=0)continue;
  let rec=actors.get(u.id);
  if(!rec){rec=createActor(u);actors.set(u.id,rec)}
  const obj=rec.model,anim=obj.userData;
  const pos=position(u.x,u.y);
  obj.position.copy(pos);
  // Pequenos passos, com pés e braços articulados.
  const clock=u.motionTime||0,walking=u.state==='walk';
  const attacking=(u.attackPulse||0)>0;
  const stagger=u.state==='stun';
  const rate=u.card.id==='lobo'?10.5:u.card.id==='colosso'?4.1:u.card.id==='batedor'?8.9:7.1;
  const phase=clock*rate+u.id*.18;
  const step=walking?1:attacking?.48:.06;
  obj.position.y=walking?.042*Math.sin(phase*2):.012*Math.sin(clock*2);
  // Indicador flutuante, sempre legível, separado do corpo do personagem.
  rec.bar.position.set(pos.x, u.card.id==='colosso'?2.20:u.card.id==='lobo'?1.25:1.58,pos.z);
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
  // O brilho no solo não é um token circular com retrato, apenas indicação de equipe.
 }
}
function syncForts(game){
 for(const fort of forts){
  const hp=fort.lane===-1?game.castles[fort.team]:game.towers[fort.team][fort.lane];
  const max=fort.lane===-1?2600:1400;
  const ratio=clamp(hp/max,0,1);
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
 const aspect=w/h;
 const vertical=16.05;
 camera.left=-vertical*aspect/2;
 camera.right=vertical*aspect/2;
 camera.top=vertical/2;camera.bottom=-vertical/2;
 camera.updateProjectionMatrix();
}
function init(){
 try{
  renderer=createRenderer();
  renderer.domElement.setAttribute('aria-hidden','true');
  renderer.domElement.style.cssText='width:100%;height:100%;display:block;pointer-events:none';
  host.appendChild(renderer.domElement);
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x11283c);
  scene.fog=new THREE.Fog(0x11283c,23,48);
  camera=new THREE.OrthographicCamera(-6,6,8,-8,.1,90);
  camera.position.set(0,27,12.5);
  camera.lookAt(0,0,0);
  const hemi=new THREE.HemisphereLight(0xe7f2ff,0x7d8293,2.5);scene.add(hemi);
  scene.add(new THREE.AmbientLight(0xf6e9d6,1.25));
  const sun=new THREE.DirectionalLight(0xffe1b0,3.35);
  sun.position.set(-4,12,-5);sun.castShadow=false;
  sun.shadow.mapSize.set(1024,1024);
  sun.shadow.camera.left=-9;sun.shadow.camera.right=9;sun.shadow.camera.top=10;sun.shadow.camera.bottom=-10;
  scene.add(sun);
  const moon=new THREE.DirectionalLight(0x508ac5,1.4);moon.position.set(4,6,6);scene.add(moon);
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
 syncForts(game);syncActors(game);
 renderer.render(scene,camera);
}
function screenToBattle(clientX,clientY,rect){
 if(!ready)return null;
 // Raycast sobre o plano real do solo: o ponto tocado continua sendo a estratégia.
 pointer.x=((clientX-rect.left)/rect.width)*2-1;
 pointer.y=-((clientY-rect.top)/rect.height)*2+1;
 raycaster.setFromCamera(pointer,camera);
 if(!raycaster.ray.intersectPlane(groundPlane,hit))return null;
 return {x:clamp(hit.x*SCALE+W/2,0,W),y:clamp(hit.z*SCALE+H/2,0,H)};
}
window.Cerco3D={
 get ready(){return ready},
 render,screenToBattle,
 info:()=>({ready,actors:actors.size,meshes:scene?.children?.length||0,webgl:renderer?.capabilities?.isWebGL2||false}),
 debugActors:()=>[...actors.entries()].map(([id,rec])=>({id,kind:rec.model.userData.id,legs:rec.model.userData.legs?.length||0,
   rotations:rec.model.userData.legs?.map(l=>Number(l.rotation.x.toFixed(3)))||[]}))
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
