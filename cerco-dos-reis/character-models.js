import * as THREE from './vendor/three.module.js';
import {bevelBox} from './arena-atmosphere.js?v=6';
import {makeCloak} from './character-cloth.js?v=2';
import {loft,finishMaterial,dyedMaterial,sculptedHead,makeDress,animateDrapes} from './character-surfaces.js?v=1';

// Silhuetas e equipamentos derivados das oito artes originais do próprio jogo.
// As medidas pertencem ao corpo, não à câmera: o Colosso é alto e largo;
// o Lobo é baixo e comprido; as outras classes têm proporções humanas.
export const characterProfiles=Object.freeze({
 lobo:{scale:.62,identity:['quadrupede','armadura-dorsal','presas']},
 arqueiro:{scale:.53,height:.98,width:.88,identity:['capuz','arco-longo','aljava']},
 soldado:{scale:.54,height:1,width:1,identity:['capuz','espada','escudo-ponta']},
 colosso:{scale:.56,height:1.46,width:1.65,identity:['armadura-pesada','manoplas','elmo-coroado']},
 guardiao:{scale:.55,height:1.10,width:1.12,identity:['elmo-fechado','espada','escudo-torre']},
 batedor:{scale:.54,height:1.02,width:.91,identity:['capuz-escuro','magia-nas-maos','manto-aberto']},
 rei:{scale:.55,height:1.08,width:1.06,identity:['coroa','gola-de-pele','espada-real']},
 liliti:{scale:.54,height:1.04,width:.84,identity:['cabelo-ruivo','vestido-fendido','magia-rubra-dourada']}
});
const put=(g,o,x=0,y=0,z=0)=>{o.position.set(x,y,z);g.add(o);return o};
const joint=(g,x,y,z)=>put(g,new THREE.Group(),x,y,z);
const ball=(r,m,x=1,y=1,z=1)=>{const o=new THREE.Mesh(new THREE.SphereGeometry(r,16,12),m);o.scale.set(x,y,z);return o};
const box=(w,h,d,m)=>new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
const tube=(r1,r2,h,m,n=12)=>new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,n),m);
const spike=(r,h,m)=>new THREE.Mesh(new THREE.ConeGeometry(r,h,8),m);
function curve(parent,points,r,material){
 const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
 return put(parent,new THREE.Mesh(new THREE.TubeGeometry(path,20,r,6,false),material));
}
function kite(parent,width,height,metal,gold,cloth){
 const shape=new THREE.Shape();shape.moveTo(-width/2,height*.38);
 shape.lineTo(0,height*.52);shape.lineTo(width/2,height*.38);
 shape.lineTo(width*.43,-height*.12);shape.lineTo(0,-height*.52);
 shape.lineTo(-width*.43,-height*.12);shape.closePath();
 const geometry=new THREE.ExtrudeGeometry(shape,{depth:.065,bevelEnabled:true,bevelSize:.025,bevelThickness:.018,bevelSegments:2,steps:1});
 const shield=put(parent,new THREE.Mesh(geometry,gold));
 const panel=new THREE.Mesh(geometry,metal);panel.scale.set(.87,.89,1.03);panel.position.z=.028;shield.add(panel);
 put(shield,box(.045,height*.68,.035,cloth),0,.02,.15);
 const boss=put(shield,ball(.09,gold,1,1,.4),0,.08,.17);boss.name='shield-boss';
 return shield;
}
function sword(parent,length,iron,gold,leather){
 const g=joint(parent,0,.14,.11);g.rotation.z=-.10;g.rotation.x=-.35;
 put(g,tube(.036,.044,.24,leather),0,-.03,0);
 put(g,ball(.055,gold),0,.12,0);
 put(g,bevelBox(.34,.055,.09,gold,.01),0,-.17,0);
 const shape=new THREE.Shape();shape.moveTo(-.065,0);shape.lineTo(.065,0);
 shape.lineTo(.05,-length*.81);shape.lineTo(0,-length);shape.lineTo(-.05,-length*.81);shape.closePath();
 const blade=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.025,bevelEnabled:true,bevelSize:.009,bevelThickness:.008,bevelSegments:1,steps:1}),iron);
 put(g,blade,0,-.20,-.01);put(g,box(.018,length*.69,.038,gold),0,-.2-length*.35,.019);
 return g;
}
function crown(parent,y,gold){
 put(parent,tube(.145,.150,.085,gold,24),0,y,0);
 for(let i=0;i<7;i++){const a=i*Math.PI*2/7;put(parent,spike(.027,.13,gold),Math.sin(a)*.14,y+.10,Math.cos(a)*.14)}
}
function magic(parent,color,gold){
 const g=joint(parent,0,-.04,.12);
 const glow=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.72,depthWrite:false,toneMapped:false});
 const core=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.6,metalness:.18,roughness:.20,transparent:true,opacity:.88});
 put(g,ball(.074,core),0,0,.07);
 for(let i=0;i<3;i++){
  const ring=put(g,new THREE.Mesh(new THREE.TorusGeometry(.13+i*.025,.009,4,22),i===2?gold:glow),0,0,.06);
  ring.rotation.set(i*.7,i*.9,0);
 }
 return g;
}

function face(parent,skin,dark,hair,eyeColor,mat){
 put(parent,sculptedHead(skin));
 const eyes=[];
 for(const side of [-1,1]){
  put(parent,ball(.028,skin,.47,1.3,.66),side*.127,-.018,-.018);
  const eye=joint(parent,side*.050,.030,.109);eyes.push(eye);
  put(eye,ball(.028,mat(0xa99c86,.01,.65),1,.34,.20));
  put(eye,ball(.011,eyeColor,1,.85,.30),0,0,.006);
  put(eye,ball(.0045,dark,.75,1,.5),0,0,.010);
  put(eye,ball(.0025,mat(0xe0d8c4,.02,.3)),side*.003,.003,.012);
  curve(parent,[[side*.024,.061,.109],[side*.05,.068,.112],[side*.079,.058,.10]],.0035,hair);
  curve(parent,[[side*.024,.033,.112],[side*.05,.040,.119],[side*.076,.031,.109]],.0024,dark);
 }
 put(parent,loft([[.052,.007,.005,0,.107],[.014,.010,.008,0,.118],[-.017,.014,.010,0,.126],[-.033,.012,.006,0,.121]],skin,16));
 const lips=mat(0x895d50,.02,.82);
 curve(parent,[[-.024,-.068,.112],[-.010,-.072,.121],[0,-.069,.124],[.010,-.072,.121],[.024,-.068,.112]],.003,lips);
 curve(parent,[[-.021,-.075,.114],[0,-.080,.122],[.021,-.075,.114]],.003,skin);
 return eyes;
}
function handShape(parent,material,gold,heavy=false){
 put(parent,loft([[.05,heavy?.11:.051,heavy?.09:.034],[-.01,heavy?.125:.058,heavy?.105:.039],[-.105,heavy?.10:.044,heavy?.085:.030]],material,16));
 for(let n=0;n<4;n++){
  const finger=put(parent,tube(heavy?.024:.011,heavy?.025:.012,heavy?.105:.067,material,10),(n-1.5)*(heavy?.052:.024),-.10,.018);
  finger.rotation.x=-.22;
  if(heavy)put(parent,ball(.027,gold,1,.48,.55),(n-1.5)*.052,-.057,.104);
 }
 const thumb=put(parent,tube(heavy?.029:.015,heavy?.032:.017,heavy?.12:.07,material,10),heavy?-.12:-.06,-.027,.024);thumb.rotation.z=-.52;
}
export function createCharacter(id,team,context){
 const {mat,outfit,outfitMaterials}=context,profile=characterProfiles[id]||characterProfiles.soldado;
 const metal=finishMaterial(mat(id==='colosso'?0x343a40:id==='arqueiro'?0x615042:0x505b65,.70,.43),'metal');
 const gold=finishMaterial(mat(0xb89453,.73,.36),'metal'),edge=mat(0xaab4b7,.76,.33),leather=mat(0x352921,.04,.87);
 const skin=mat(0xb58d73,.01,.74),dark=mat(0x111820,.1,.62),redHair=mat(0x692d1e,.10,.61);
 const cloth=finishMaterial(outfit(team,id==='batedor'?0x1d2a3c:id==='liliti'?0x722b37:undefined),'cloth');
 const group=new THREE.Group();group.name=id;
 if(id==='lobo')return makeWolf(group,profile,{metal,gold,edge,leather,dark,mat,cloth});
 const clothShade=dyedMaterial(cloth,.56,outfitMaterials),clothLight=dyedMaterial(cloth,.88,outfitMaterials);
 const h=profile.height,w=profile.width,female=id==='liliti';
 const legs=[],knees=[],arms=[],elbows=[],hair=[],hands=[],cloaks=[],magicHands=[],drapes=[];
 const hip=.91*h,body=joint(group,0,hip+.06*h,0);
 for(const side of [-1,1]){
  const leg=joint(group,side*.145*w,hip,0);legs.push(leg);
  put(leg,loft([[0,.105*w,.112*w],[-.12*h,.118*w,.123*w],[-.27*h,.096*w,.098*w],[-.40*h,.078*w,.08*w]],female?skin:leather,20));
  if(!female)put(leg,loft([[-.06*h,.122*w,.132*w,0,.014],[-.29*h,.10*w,.111*w,0,.019],[-.37*h,.084*w,.092*w,0,.015]],metal,20));
  const knee=joint(leg,0,-.40*h,0);knees.push(knee);
  put(knee,loft([[.035,.075*w,.078*w],[-.10*h,.093*w,.098*w],[-.24*h,.080*w,.087*w],[-.38*h,.052*w,.063*w]],female?skin:metal,20));
  if(!female){put(knee,ball(.095,metal,w,.79,.83),0,0,.035);curve(knee,[[-.07*w,-.09*h,.07],[0,-.07*h,.103],[.07*w,-.09*h,.07]],.009,gold)}
  put(knee,loft([[-.26*h,.061*w,.07*w],[-.41*h,.072*w,.087*w],[-.47*h,.083*w,.12*w,0,.045]],leather,20));
  put(knee,ball(.105,leather,.86*w,.49,1.60*w),0,-.445*h,.076*w);
  if(female){const trim=put(knee,new THREE.Mesh(new THREE.TorusGeometry(.065,.008,5,24),gold),0,-.29*h,0);trim.rotation.x=Math.PI/2;}
 }
 if(female){
  put(body,loft([[-.12,.21*w,.12*w],[.04,.18*w,.112*w],[.23,.25*w,.145*w],[.43,.29*w,.16*w],[.54,.32*w,.13*w],[.61,.078,.074]].map(r=>[r[0]*h,...r.slice(1)]),skin,32));
  put(body,loft([[-.10,.235*w,.145*w],[.04,.19*w,.125*w],[.23,.25*w,.165*w],[.39,.30*w,.176*w],[.45,.274*w,.158*w]].map(r=>[r[0]*h,...r.slice(1)]),clothShade,32));
  for(const side of [-1,1]){
   curve(body,[[side*.19*w,-.10*h,.085],[side*.15*w,.06*h,.103],[side*.18*w,.24*h,.127],[side*.23*w,.40*h,.115]],.006,gold);
   curve(body,[[side*.24*w,.42*h,.07],[side*.26*w,.53*h,.05],[side*.18*w,.59*h,.01]],.009,gold);
  }
  for(let n=0;n<5;n++){
   const y=.07+n*.055;curve(body,[[-.045,y,.151],[.045,y+.032,.151]],.0028,gold);
   curve(body,[[.045,y,.153],[-.045,y+.032,.153]],.0028,gold);
  }
  for(const drape of makeDress(clothLight,gold,h)){drape.mesh.scale.x=w;body.add(drape.mesh);drapes.push(drape);
   if(drape.mesh.material.isMeshStandardMaterial&&drape.mesh.material.metalness<.5){drape.mesh.material.userData={...clothLight.userData};outfitMaterials?.add(drape.mesh.material)}}
  const girdle=loft([[-.06*h,.244*w,.155*w],[-.10*h,.248*w,.160*w]],gold,32);body.add(girdle);
  put(body,new THREE.Mesh(new THREE.OctahedronGeometry(.027,0),mat(0x772934,.45,.22)),0,-.12*h,.162*w);
  const pendant=joint(body,0,.58*h,.085);curve(pendant,[[-.055,.014,-.01],[0,-.047,.04],[.055,.014,-.01]],.004,gold);
  put(pendant,new THREE.Mesh(new THREE.OctahedronGeometry(.020,0),gold),0,-.055,.04);
 }else{
  put(body,loft([[-.12,.23*w,.14*w],[.04,.22*w,.15*w],[.28,.30*w,.18*w],[.45,.34*w,.175*w],[.55,.26*w,.14*w],[.60,.075,.073]].map(r=>[r[0]*h,...r.slice(1)]),leather,24));
  put(body,loft([[.09,.235*w,.16*w,0,.012],[.27,.31*w,.19*w],[.44,.34*w,.18*w],[.51,.28*w,.15*w],[.55,.27*w,.15*w],[.60,.082*w,.080*w]].map(r=>[r[0]*h,...r.slice(1)]),metal,32));
  for(const side of [-1,1])curve(body,[[side*.24*w,.10*h,.07],[side*.28*w,.31*h,.10],[side*.28*w,.46*h,.08]],.008,gold);
  for(let row=0;row<3;row++)put(body,loft([[.10*h-row*.095*h,.24*w,.16*w],[.025*h-row*.095*h,.26*w,.17*w]],metal,20));
  const tabard=makeCloak(.32*w,.64*h,clothLight,gold,true);tabard.mesh.position.set(0,-.26*h,.215*w);body.add(tabard.mesh);cloaks.push(tabard);
  for(const side of [-1,1]){const skirt=put(body,loft([[-.12*h,.105*w,.036],[-.43*h,.125*w,.04]],metal,12),side*.235*w,0,.09*w);skirt.rotation.z=-side*.16;}
  put(body,loft([[-.017,.25*w,.17*w],[-.075,.255*w,.174*w]],gold,24));
  const collar=put(body,new THREE.Mesh(new THREE.TorusGeometry(.084*w,.009,6,30),gold),0,.60*h,0);collar.rotation.x=Math.PI/2;collar.scale.y=.94;
  curve(body,[[0,.45*h,.185*w],[0,.31*h,.204*w],[0,.12*h,.175*w]],.005,gold);
  for(const side of [-1,1])curve(body,[[side*.04*w,.40*h,.189*w],[side*.115*w,.32*h,.187*w],[side*.068*w,.23*h,.196*w],[0,.20*h,.197*w]],.005,gold);
  put(body,new THREE.Mesh(new THREE.OctahedronGeometry(.026*w,0),gold),0,.35*h,.205*w);
  if(id==='colosso')for(let n=0;n<3;n++)curve(body,[[0,.43*h,.20],[-.13*w,.33*h-n*.06,.18],[0,.25*h-n*.05,.19],[.13*w,.33*h-n*.06,.18],[0,.43*h,.20]],.008,gold);
 }
 const cape=makeCloak((id==='rei'?1.04:id==='guardiao'?.91:female?.78:.76)*w,(id==='rei'?1.40:female?1.31:1.23)*h,clothShade,gold);
 cape.mesh.position.set(0,-.10*h,-.21*w);body.add(cape.mesh);cloaks.push(cape);
 for(const cloak of cloaks)if(team==='ally'){cloak.mesh.material[0].userData={...cloak.mesh.material[0].userData,...(cloak===cape?clothShade.userData:clothLight.userData)};outfitMaterials?.add(cloak.mesh.material[0])}
 put(body,tube(.060*w,.080*w,.20*h,['colosso','guardiao'].includes(id)?metal:skin,24),0,.63*h,0);
 const head=joint(body,0,.81*h,0),eyeColor=mat(female?0x3d764b:0x554938,.12,.4);
 if(id==='colosso')head.scale.setScalar(1.22);
 const eyes=face(head,skin,dark,female?redHair:leather,eyeColor,mat);
 if(['soldado','arqueiro','batedor'].includes(id)){
  const hood=loft([[-.19,.15,.13,0,-.035],[-.08,.178,.16,0,-.035],[.08,.17,.16,0,-.035],[.19,.10,.10,0,-.025],[.23,.018,.022,0,-.02]],clothShade,30,.67,Math.PI*2-1.34);head.add(hood);
  for(const side of [-1,1])curve(head,[[side*.014,.22,.0],[side*.11,.15,.085],[side*.12,.045,.102],[side*.105,-.13,.09],[side*.09,-.19,.07]],.006,clothLight);
  put(head,loft([[-.11,.11,.04,0,.09],[-.16,.11,.04,0,.09]],leather,18));
 }else if(['colosso','guardiao'].includes(id)){
  const helmet=put(head,ball(.17,metal,.98,1.16,.94),0,.012,-.021);
  put(head,loft([[.13,.11,.035,0,.116],[.04,.12,.046,0,.117],[-.14,.075,.045,0,.10]],gold,16));
  put(head,box(.20,.023,.025,dark),0,.036,.158);
  curve(head,[[0,.10,.166],[0,-.12,.155]],.009,metal);
  for(const side of [-1,1]){const horn=put(head,spike(.028,id==='colosso'?.20:.16,gold),side*.13,.19,-.05);horn.rotation.z=-side*.4;}
  put(head,spike(.030,.21,gold),0,.24,-.025);
 }else if(id==='rei'){
  const scalp=new THREE.Mesh(new THREE.SphereGeometry(.143,24,16,0,Math.PI*2,0,Math.PI*.45),leather);put(head,scalp,0,.031,-.016);
  crown(head,.17,gold);
  put(head,ball(.10,leather,.9,.85,.30),0,-.087,.081);
  const fur=mat(0x8a8173,.01,.96);
  for(let n=0;n<18;n++){const a=n/17*Math.PI;const tuft=put(body,ball(.063,fur,1.1,.88,.74),Math.cos(a)*.39*w,.57*h,Math.sin(a)*.19-.08);tuft.rotation.z=Math.cos(a)*.6;}
 }else{
  const scalp=new THREE.Mesh(new THREE.SphereGeometry(.145,28,18,0,Math.PI*2,0,Math.PI*.62),redHair);scalp.scale.set(1,1.12,.94);put(head,scalp,0,.045,-.026);
  const highlight=mat(0x93472c,.1,.58),shadow=mat(0x48231c,.06,.73);
  for(let n=0;n<16;n++){
   const a=.72+n*(Math.PI*2-1.44)/15,side=Math.sin(a),back=Math.cos(a),strand=joint(head,side*.118,.11,back*.118-.014);
   const points=[[0,0,0],[side*.035,-.14,back*.025],[side*(.055+.010*Math.sin(n)),-.30,back*.045-.010],
    [side*.065,-.48,back*.055-.015],[side*(.06+.014*Math.sin(n*2)),-.65,back*.055-.015]];
   curve(strand,points,.020+(n%3)*.002,n%4===0?highlight:n%5===0?shadow:redHair);hair.push(strand);
   if(n%3===0)curve(strand,points.map(([x,y,z])=>[x+.008,y,z+.009]),.0035,highlight);
  }
  for(const side of [-1,1])curve(head,[[side*.025,.18,.06],[side*.10,.125,.111],[side*.145,.02,.06],[side*.18,-.16,.015]],.019,redHair);
  curve(head,[[-.132,.095,.032],[-.085,.088,.108],[0,.083,.136],[.085,.088,.108],[.132,.095,.032]],.0045,gold);
  put(head,new THREE.Mesh(new THREE.OctahedronGeometry(.011,0),gold),0,.077,.14);
 }
 for(const side of [-1,1]){
  const shoulder=joint(body,side*(female?.31:.37)*w,.49*h,0);arms.push(shoulder);
  if(female)put(shoulder,ball(.077,skin,w,1,.94*w),0,.005,0);
  if(!female){
   const r=id==='colosso'?.23:.17;
   put(shoulder,loft([[-.12,r*.66,r*.77],[0,r*1.15,r],[.13,r*.85,r*.78],[.17,.045,.04]],metal,24));
   curve(shoulder,[[-r*.8,-.055,.06],[0,-.085,r*.90],[r*.8,-.055,.06]],.009,gold);
   if(['colosso','guardiao'].includes(id))for(let n=0;n<3;n++){const prong=put(shoulder,spike(.025,id==='colosso'?.18:.10,gold),side*(.025+n*.062),.16-n*.015,-.025);prong.rotation.z=-side*.4;}
  }
  put(shoulder,loft([[.035,.070*w,.078*w],[-.12*h,.077*w,.084*w],[-.30*h,.052*w,.058*w]],female?skin:metal,20));
  const elbow=joint(shoulder,0,-.31*h,0);elbows.push(elbow);
  put(elbow,ball(.055,female?skin:metal,1,.9,1));
  put(elbow,loft([[.015,.055*w,.057*w],[-.11*h,.064*w,.068*w],[-.27*h,.038*w,.043*w]],female?skin:metal,20));
  put(elbow,loft([[-.21*h,.046*w,.052*w],[-.27*h,.044*w,.05*w]],gold,20));
  const hand=joint(elbow,0,-.29*h,0);hands.push(hand);handShape(hand,female?skin:id==='colosso'?metal:leather,gold,id==='colosso');
 }
 if(['soldado','guardiao','rei'].includes(id))sword(hands[1],id==='guardiao'?.93:.80,edge,gold,leather);
 if(id==='soldado'||id==='guardiao'){const shield=kite(hands[0],id==='guardiao'?.65:.48,id==='guardiao'?1.10:.75,metal,gold,clothShade);shield.position.set(-.05,.14,.15);shield.rotation.y=-.12;}
 if(id==='arqueiro'){
  const bow=joint(hands[0],-.02,.04,.14);
  curve(bow,[[0,.58,0],[-.22,.36,.08],[-.29,0,.11],[-.22,-.36,.08],[0,-.58,0]],.022,leather);
  curve(bow,[[0,.58,0],[-.045,0,.01],[0,-.58,0]],.004,edge);put(bow,tube(.027,.027,.18,gold),-.29,0,.11);
  const quiver=joint(body,.24,.23,-.25);quiver.rotation.z=-.24;
  put(quiver,tube(.085,.08,.53,leather,16));put(quiver,tube(.09,.09,.035,gold,20),0,.25,0);
  for(let n=0;n<5;n++){const x=(n%3-1)*.039,z=Math.floor(n/3)*.045;put(quiver,tube(.006,.006,.67,leather,6),x,.29,z);put(quiver,box(.033,.09,.008,cloth),x,.60,z);}
 }
 if(id==='batedor'||id==='liliti'){magicHands.push(magic(hands[0],0xb72b3d,gold));magicHands.push(magic(hands[1],female?0xe3b654:0xb72b3d,gold));}
 group.userData={id,profile,legs,knees,arms,elbows,hands,cloaks,hair,magicHands,drapes,body,head,eyes,hasWolf:false,size:h};return group;
}

export function animateCharacterSurfaces(model,clock,walking=false,attack=0){
 const data=model.userData;animateDrapes(data.drapes,clock,walking,attack);
 const blink=Math.sin(clock*.83+1)> .997?.12:1;
 data.eyes?.forEach(eye=>{eye.scale.y=blink});
}

function makeWolf(group,profile,m){
 const {metal,gold,leather,dark,mat,cloth}=m,hide=mat(0x333b3e,.04,.94),furShade=mat(0x202b30,.02,.97),fang=mat(0xc9bea8,.02,.8);
 const body=joint(group,0,.71,0);
 const torso=loft([[-.82,.12,.18],[-.58,.25,.27],[-.18,.29,.28],[.28,.34,.35],[.58,.30,.34],[.75,.18,.21]],hide,28);
 torso.rotation.x=Math.PI/2;body.add(torso);
 put(body,ball(.31,hide,1,1.22,.95),0,.19,.56);
 const head=joint(body,0,.34,.83);
 put(head,ball(.245,hide,.83,1,.99));
 const muzzle=put(head,loft([[-.06,.13,.085],[.08,.12,.078],[.30,.073,.058]],hide,20),0,-.055,.12);muzzle.rotation.x=Math.PI/2;
 put(head,ball(.075,dark,1,.65,.65),0,-.038,.44);
 put(head,ball(.11,furShade,.9,.30,1.8),0,-.14,.26);
 put(head,ball(.10,hide,.82,.23,1.8),0,-.18,.25);
 for(const side of [-1,1]){
  const ear=put(head,spike(.087,.28,hide),side*.145,.245,-.065);ear.scale.z=.51;ear.rotation.z=-side*.20;
  const inside=put(head,spike(.043,.18,furShade),side*.145,.255,-.047);inside.scale.z=.35;inside.rotation.z=-side*.20;
  const eye=put(head,ball(.021,mat(0xc39a4f,.1,.45),1,.57,.47),side*.181,.047,.10);eye.rotation.y=side*.35;
  put(head,ball(.009,dark,.55,1,.45),side*.19,.046,.108);
  for(let n=0;n<2;n++){const tooth=put(head,spike(.014,.055,fang),side*.075,-.14,.22+n*.095);tooth.rotation.z=Math.PI;}
  for(let n=0;n<6;n++){
   const tuft=put(body,spike(.055,.20,n%2?hide:furShade),side*(.28+(n%2)*.035),.13-(n%3)*.045,-.62+n*.23);
   tuft.rotation.x=-.9;tuft.rotation.z=-side*.8;
  }
  put(body,loft([[-.12,.13,.14],[.09,.19,.18],[.22,.12,.11]],metal,20),side*.26,.05,.42);
  curve(body,[[side*.30,.24,.28],[side*.37,.20,.43],[side*.32,.16,.59]],.010,gold);
 }
 const legs=[];
 for(const z of [-.53,.52])for(const side of [-1,1]){
  const leg=joint(group,side*.23,.57,z);legs.push(leg);
  put(leg,loft([[0,.11,.13],[-.18,.09,.11],[-.31,.054,.065,0,.025],[-.45,.045,.052,0,.065]],hide,20));
  put(leg,loft([[-.28,.061,.071,0,.025],[-.36,.055,.068,0,.05]],metal,20));
  put(leg,loft([[-.34,.059,.072,0,.049],[-.36,.059,.07,0,.05]],gold,20));
  put(leg,ball(.11,hide,.77,.56,1.24),0,-.48,.11);
  for(let n=0;n<3;n++){const claw=put(leg,spike(.011,.06,fang),-.045+n*.045,-.49,.22);claw.rotation.x=Math.PI/2;}
 }
 for(let n=0;n<5;n++){
  const plate=put(body,loft([[-.11,.23,.065],[.07,.22,.055]],metal,20),0,.31,-.54+n*.22);plate.rotation.x=Math.PI/2;
  put(body,spike(.033,.15,gold),0,.44,-.54+n*.22);
 }
 const collar=put(body,tube(.28,.28,.07,cloth,24),0,.15,.64);collar.rotation.x=Math.PI/2;
 const tail=joint(body,0,-.02,-.81);curve(tail,[[0,0,0],[.02,-.10,-.25],[.07,-.17,-.48],[.15,-.12,-.68]],.075,hide);
 group.userData={id:'lobo',profile,legs,arms:[],head,body,tail,hasWolf:true,size:1};return group;
}
