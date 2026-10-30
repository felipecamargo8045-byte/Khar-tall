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
const mat=(color,metalness=.08,roughness=.83)=>new THREE.MeshStandardMaterial({color,metalness,roughness,flatShading:true});
const stone=mat(0x8194a8),darkStone=mat(0x344354),stoneLight=mat(0xb2c6d5);
const iron=mat(0x8994a5,.8,.35),black=mat(0x131a27,.35),gold=mat(0xc6a569,.7,.34);
const wood=mat(0xae8650),grass=mat(0x4a725b),dirt=mat(0x607b70),water=new THREE.MeshStandardMaterial({color:0x277a9d,metalness:.25,roughness:.3,transparent:true,opacity:.93});
const skin=mat(0xd1a486),fur=mat(0x48403b),redHair=mat(0x9d452c),green=mat(0x64b87b);
const box=(w,h,d,m)=>new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
const sphere=(r,m)=>new THREE.Mesh(new THREE.IcosahedronGeometry(r,1),m);
const cyl=(r1,r2,h,m,sides=7)=>new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,sides),m);
const cone=(r,h,m,sides=6)=>new THREE.Mesh(new THREE.ConeGeometry(r,h,sides),m);
const put=(group,obj,x,y,z)=>{obj.position.set(x,y,z);group.add(obj);return obj;};
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
function terrain(){
 const board=box(11.9,.28,15.45,darkStone);put(scene,board,0,-.25,0);board.receiveShadow=true;
 const floor=box(11.15,.045,14.55,dirt);put(scene,floor,0,-.09,0);floor.receiveShadow=true;
 // Pedras reais, caminhos, rio escavado e duas pontes tridimensionais.
 for(let i=0;i<2;i++){
   const x=i===0?-2.5:2.5;
   const road=box(2.55,.035,13.7,mat(i===0?0x616970:0x5c626c));
   put(scene,road,x,-.04,0);road.receiveShadow=true;
   for(let k=0;k<17;k++){
     const z=-6.4+k*.78;
     const tile=box(2.17,.02,.035,mat(k%2?0x303945:0x859095));
     put(scene,tile,x,-.014,z);
     if(k%2===0){
       const seam=box(.028,.024,.42,darkStone);
       put(scene,seam,x+(.5-k%3)*.65,-.012,z+.27);
     }
   }
 }
 const river=box(11.3,.035,1.32,water);
 put(scene,river,0,.006,0);river.receiveShadow=true;
 for(let i=0;i<13;i++){
  const wave=box(.6,.008,.032,mat(0x407b85));
  put(scene,wave,-5.0+i*.82,.036,(i%3-1)*.23);
 }
 for(const x of [-2.5,2.5]){
   const bridge=box(2.67,.22,1.66,wood);put(scene,bridge,x,.15,0);bridge.castShadow=true;
   for(let i=0;i<7;i++){
     put(scene,box(2.66,.025,.035,darkStone),x,.259,-.75+i*.25);
   }
   for(const edge of [-1,1]){
    const rail=box(.095,.35,1.68,gold);
    put(scene,rail,x+edge*1.32,.43,0);
   }
 }
 // Pedras de margem impedem visualmente o atalho pelo rio.
 for(const z of [-.72,.72]){
  for(let n=0;n<20;n++){
   const x=-5.15+(n+.5)*.54;
   // Nenhuma barreira falsa sobre a entrada das duas pontes.
   if(Math.abs(x+2.5)<1.42||Math.abs(x-2.5)<1.42)continue;
   const rock=box(.46,.16,.24,stone);
   put(scene,rock,x,.11,z);
  }
 }
 // Marcação do caminho livre: distingue bem ponte, água e margem.
 for(const x of [-2.5,2.5]){
   for(const z of [-.6,.6]){
     for(let i=0;i<2;i++){
       const pillar=cyl(.09,.105,.48,stoneLight,8);
       put(scene,pillar,x+(i?1.22:-1.22),.4,z);
       put(scene,sphere(.12,gold),x+(i?1.22:-1.22),.7,z);
     }
   }
 }
 // Bordas em pedra com torres menores e brasões.
 for(const x of [-5.72,5.72]){
   put(scene,box(.34,.4,15.2,stone),x,.1,0);
   for(let z=-6.9;z<=7;z+=1.75){
    const stump=cyl(.22,.26,.55,stone);put(scene,stump,x,.35,z);stump.castShadow=true;
    put(scene,cone(.3,.18,darkStone),x,.7,z);
   }
 }
 for(const z of [-7.24,7.24]){
   put(scene,box(11.3,.35,.4,stone),0,.08,z);
 }
 // Detalhes do solo: brasões, grama entre blocos.
 for(let i=0;i<30;i++){
    const x=Math.sin(i*7.67)*4.8;
    const z=Math.cos(i*13.7)*6.5;
    if(Math.abs(x)>3.95){
      put(scene,cone(.11,.2,grass,4),x,.06,z);
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
 const fortressStone=mat(team==='ally'?0x698fae:0x947686,.26,.7);
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
    forts.push({mesh:fortress,team,lane});
  }
  const big=makeFortress(team,true);
  big.position.set(0,0,enemy?-6.35:6.35);
  big.rotation.y=flip;
  scene.add(big);
  forts.push({mesh:big,team,lane:-1});
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
function createActor(u){
 const model=u.card.id==='lobo'?makeWolf(u.side):makeHuman(u.card.id,u.side);
 model.traverse(o=>{if(o.isMesh)o.castShadow=true});
 scene.add(model);
 return {model,side:u.side,lastFrame:0,position:new THREE.Vector3()};
}
function syncActors(game){
 const live=new Set(game.units.filter(u=>u.hp>0).map(u=>u.id));
 for(const [id,rec] of actors){if(!live.has(id)){scene.remove(rec.model);actors.delete(id)}}
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
  obj.position.y=walking?.055*Math.sin(phase*2):.018*Math.sin(clock*2);
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
