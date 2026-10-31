import * as THREE from './vendor/three.module.js';
import {bevelBox} from './arena-atmosphere.js?v=5';
import {makeCloak} from './character-cloth.js?v=1';

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
 put(parent,tube(.205,.215,.13,gold,16),0,y,0);
 for(let i=0;i<7;i++){const a=i*Math.PI*2/7;put(parent,spike(.048,.17,gold),Math.sin(a)*.19,y+.13,Math.cos(a)*.19)}
}
function magic(parent,color,gold){
 const g=joint(parent,0,-.04,.12);
 const glow=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.72,depthWrite:false,toneMapped:false});
 put(g,ball(.082,glow),0,0,.07);
 for(let i=0;i<3;i++){
  const ring=put(g,new THREE.Mesh(new THREE.TorusGeometry(.13+i*.025,.009,4,22),i===2?gold:glow),0,0,.06);
  ring.rotation.set(i*.7,i*.9,0);
 }
 return g;
}

export function createCharacter(id,team,context){
 const {mat,outfit,outfitMaterials}=context;
 const profile=characterProfiles[id]||characterProfiles.soldado;
 const metal=mat(id==='colosso'?0x282c30:id==='arqueiro'?0x524338:0x343b42,.72,.47);
 const gold=mat(0xad8349,.73,.4),edge=mat(0xb9aca0,.7,.38),leather=mat(0x38291f,.12,.9);
 const skin=mat(0xbb8d72,.03,.85),dark=mat(0x10151c,.22,.65),redHair=mat(0x783423,.08,.8);
 const cloth=outfit(team,id==='batedor'?0x1d2a3c:id==='liliti'?0x722b37:undefined);
 const group=new THREE.Group();group.name=id;
 if(id==='lobo')return makeWolf(group,profile,{metal,gold,edge,leather,dark,mat,cloth});
 const h=profile.height,w=profile.width;
 const legs=[],knees=[],arms=[],elbows=[],hair=[],hands=[],cloaks=[],magicHands=[];
 const hip=.91*h,body=joint(group,0,hip+.06*h,0);
 const round=(width,height,depth,m,b=.035)=>bevelBox(width,height,depth,m,b);
 for(const side of [-1,1]){
  const leg=joint(group,side*.16*w,hip,0);legs.push(leg);
  put(leg,tube(.105*w,.13*w,.40*h,leather),0,-.20*h,0);
  if(id!=='liliti')put(leg,round(.19*w,.31*h,.16*w,metal),0,-.18*h,.07*w);
  const knee=joint(leg,0,-.40*h,0);knees.push(knee);
  if(id!=='liliti'){
   put(knee,ball(.12,metal,w,.8,1),0,0,.035);
   put(knee,round(.17*w,.35*h,.19*w,metal),0,-.20*h,.035);
   put(knee,box(.19*w,.026,.215*w,gold),0,-.12*h,.055);
  }else put(knee,tube(.063,.085,.37*h,skin),0,-.19*h,0);
  put(knee,round(.21*w,.13*h,.34*w,leather),0,-.44*h,.07*w);
 }
 // Cintura estreita e peito com volume; cabeça reduzida para proporção adulta.
 put(body,ball(.35,id==='liliti'?cloth:leather,w,.95*h,.62),0,.21*h,0);
 const chest=put(body,round(.58*w,.49*h,.31*w,metal,.055),0,.29*h,.005);
 if(id==='liliti'){
  chest.scale.set(.86,.78,.83);chest.material=gold;
  put(body,ball(.23,skin,.86,1.38,.62),0,.39*h,.015);
  for(const side of [-1,1])put(body,ball(.19,cloth,.91,.65,.75),side*.12,.48*h,.13);
  put(body,tube(.19,.30,.34,cloth,16),0,-.06,0);
  for(const side of [-1,1]){
   const panel=makeCloak(.33,1.08,cloth,gold);panel.mesh.position.set(side*.22,-.53,-.025);
   panel.mesh.rotation.y=side*.35;body.add(panel.mesh);cloaks.push(panel);
  }
 }else{
  for(const side of [-1,1]){
   const rim=put(body,box(.025,.43*h,.037,gold),side*.25*w,.30*h,.18*w);rim.rotation.z=-side*.15;
  }
  for(let row=0;row<3;row++)put(body,round(.46*w,.115*h,.34*w,metal,.015),0,.04*h-row*.10*h,0);
  put(body,box(.34*w,.59*h,.025,cloth),0,-.27*h,.18*w);
  for(const side of [-1,1]){
   const skirt=put(body,round(.17*w,.36*h,.06,metal,.02),side*.23*w,-.23*h,.13*w);skirt.rotation.z=-side*.17;
  }
 }
 put(body,tube(.28*w,.29*w,.075,gold,14),0,-.03,0);
 const cape=makeCloak((id==='rei'?1.13:id==='guardiao'?.97:.81)*w,(id==='rei'?1.40:1.23)*h,cloth,gold);
 cape.mesh.position.set(0,-.12*h,-.24*w);body.add(cape.mesh);cloaks.push(cape);
 for(const cloak of cloaks)if(team==='ally'){
  cloak.mesh.material[0].userData.defaultColor=cloth.userData.defaultColor;
  outfitMaterials.add(cloak.mesh.material[0]);
 }
 const neck=put(body,tube(.075,.10,.13,skin),0,.64*h,0);
 const head=joint(body,0,.83*h,0);put(head,ball(.20,skin,.84,1.17,.87));
 put(head,ball(.042,skin,.7,1,1.1),0,-.015,.174);
 for(const side of [-1,1]){
  put(head,ball(.022,dark,1,.55,.45),side*.067,.025,.164);
  if(id==='liliti')put(head,ball(.013,mat(0x48854b),1,.8,.5),side*.067,.026,.173);
 }
 if(['soldado','arqueiro','batedor'].includes(id)){
  // Capuz aberto, sem chapéu cônico: rosto sombreado na abertura frontal.
  const hood=put(head,ball(.235,cloth,.99,1.17,.97),0,.055,-.055);
  put(head,ball(.188,dark,.87,1.13,.34),0,-.003,.135);
  put(head,ball(.16,skin,.79,1.06,.39),0,-.024,.18);
  for(const side of [-1,1])put(head,round(.09,.34,.14,cloth,.028),side*.175,-.10,.08);
  put(head,box(.22,.10,.055,leather),0,-.155,.22);
 }else if(['colosso','guardiao'].includes(id)){
  put(head,ball(.235,metal,1,1.16,.97),0,.01,-.025);
  put(head,round(.27,.28,.09,gold,.025),0,-.02,.18);
  put(head,box(.24,.036,.025,dark),0,.055,.239);
  put(head,box(.032,.23,.045,metal),0,-.035,.255);
  for(const side of [-1,1]){
   put(head,round(.12,.24,.12,metal,.025),side*.19,-.08,.05);
   const crest=put(head,spike(.056,id==='colosso'?.28:.22,gold),side*.18,.26,-.02);crest.rotation.z=-side*.35;
  }
  put(head,spike(.052,.28,gold),0,.31,-.01);
 }else{
  put(head,ball(.216,id==='rei'?leather:redHair,1,1,.88),0,.08,-.045);
  if(id==='rei'){
   crown(head,.22,gold);
   put(head,ball(.16,leather,1,.78,.44),0,-.13,.1);
   // Gola de pele, presente na arte do Rei.
   const fur=mat(0x8d8371,.02,.95);
   for(let i=0;i<12;i++){const a=i/11*Math.PI;put(body,ball(.12,fur,1,1,1.3),Math.cos(a)*.43,.59*h,Math.sin(a)*.22-.11)}
  }else{
   for(const side of [-1,1])for(let n=0;n<4;n++){
    const strand=joint(head,side*(.14+n*.024),.08,-.09-n*.018);
    curve(strand,[[0,0,0],[side*.06,-.27,.01],[side*.04,-.57,-.06],[side*.10,-.82,-.08]],.049,redHair);hair.push(strand);
   }
   const circlet=put(head,new THREE.Mesh(new THREE.TorusGeometry(.19,.014,5,26),gold),0,.14,.015);circlet.rotation.x=Math.PI/2;
  }
 }
 for(const side of [-1,1]){
  const shoulder=joint(body,side*.37*w,.50*h,0);arms.push(shoulder);
  if(id!=='liliti'){
   const pauldron=put(shoulder,ball(id==='colosso'?.23:.17,metal,1.23,1,.95),0,.025,0);
   put(shoulder,round((id==='colosso'?.42:.30),.065,.28,gold,.015),side*.012,.02,.015);
   if(['colosso','guardiao'].includes(id))for(let n=0;n<3;n++){
    const prong=put(shoulder,spike(.044,id==='colosso'?.22:.13,gold),side*(.035+n*.067),.18-n*.01,-.04);prong.rotation.z=-side*.34;
   }
  }
  put(shoulder,tube(.075*w,.095*w,.32*h,id==='liliti'?skin:metal),0,-.17*h,0);
  const elbow=joint(shoulder,0,-.33*h,0);elbows.push(elbow);
  put(elbow,tube(.07*w,.09*w,.29*h,id==='liliti'?skin:metal),0,-.15*h,0);
  put(elbow,box(.17*w,.045,.17*w,gold),0,-.23*h,0);
  const hand=joint(elbow,0,-.32*h,0);hands.push(hand);
  put(hand,id==='colosso'?round(.27,.26,.27,metal,.045):ball(.078, id==='liliti'?skin:leather,1,1.1,.9));
  if(id==='colosso')for(let n=0;n<3;n++)put(hand,box(.034,.11,.03,gold),-.075+n*.075,-.035,.145);
 }
 if(['soldado','guardiao','rei'].includes(id))sword(hands[1],id==='guardiao'?.93:.80,edge,gold,leather);
 if(id==='soldado'||id==='guardiao'){
  const shield=kite(hands[0],id==='guardiao'?.65:.48,id==='guardiao'?1.10:.75,metal,gold,cloth);
  shield.position.set(-.05,.14,.15);shield.rotation.y=-.12;
 }
 if(id==='arqueiro'){
  const bow=joint(hands[0],-.02,.04,.14);
  curve(bow,[[0,.58,0],[-.22,.36,.08],[-.29,0,.11],[-.22,-.36,.08],[0,-.58,0]],.028,leather);
  curve(bow,[[0,.58,0],[-.045,0,.01],[0,-.58,0]],.006,edge);
  put(bow,tube(.032,.032,.18,gold),-.29,0,.11);
  const quiver=joint(body,.27,.24,-.28);quiver.rotation.z=-.24;
  put(quiver,tube(.11,.10,.56,leather),0,0,0);put(quiver,tube(.117,.117,.045,gold),0,.26,0);
  for(let n=0;n<5;n++){
   const x=(n%3-1)*.055,z=Math.floor(n/3)*.06;
   put(quiver,tube(.008,.008,.71,leather,6),x,.30,z);
   put(quiver,box(.05,.12,.012,cloth),x,.62,z);
  }
 }
 if(id==='batedor'||id==='liliti'){
  magicHands.push(magic(hands[0],0xb72b3d,gold));
  magicHands.push(magic(hands[1],id==='liliti'?0xe3b654:0xb72b3d,gold));
 }
 group.userData={id,profile,legs,knees,arms,elbows,hands,cloaks,hair,magicHands,body,hasWolf:false,size:h};
 return group;
}

function makeWolf(group,profile,m){
 const {metal,gold,leather,dark,mat,cloth}=m,hide=mat(0x393c3b,.05,.92),fang=mat(0xc9bea8);
 const body=joint(group,0,.72,0);
 put(body,ball(.47,hide,.82,.84,1.70),0,0,-.08);
 put(body,ball(.45,hide,.96,1.03,1.05),0,.08,.46);
 const head=joint(body,0,.25,.86);
 put(head,ball(.29,hide,.85,1,1.16));
 put(head,ball(.21,hide,.68,.62,1.4),0,-.06,.30);
 put(head,ball(.10,dark,1,.7,.8),0,-.045,.57);
 for(const side of [-1,1]){
  const ear=put(head,spike(.11,.30,hide),side*.17,.28,-.07);ear.rotation.z=-side*.20;
  put(head,ball(.028,mat(0xc29c57,.1,.8)),side*.205,.055,.18);
  put(head,spike(.025,.10,fang),side*.11,-.14,.38);
  // Placas nas escápulas e franjas de pelo, sem corpo quadrado de brinquedo.
  const shoulder=put(body,ball(.27,metal,.8,1.1,1.1),side*.30,.09,.42);
  put(body,ball(.22,gold,.9,.16,1.2),side*.30,.30,.42);
  for(let n=0;n<5;n++){
   const tuft=put(body,spike(.08,.23,hide),side*(.25+n%2*.05),.21-n*.06,-.48+n*.24);tuft.rotation.x=-.8;tuft.rotation.z=-side*.7;
  }
 }
 const legs=[];
 for(const z of [-.54,.50])for(const side of [-1,1]){
  const leg=joint(group,side*.27,.61,z);legs.push(leg);
  put(leg,tube(.08,.115,.46,hide),0,-.22,0);
  put(leg,tube(.084,.09,.17,metal),0,-.39,.025);
  put(leg,tube(.09,.09,.035,gold),0,-.44,.025);
  put(leg,ball(.13,hide,.8,.64,1.45),0,-.51,.08);
  for(let n=0;n<3;n++)put(leg,spike(.018,.08,fang),-.055+n*.055,-.55,.19);
 }
 for(let n=0;n<5;n++){
  const armor=put(body,bevelBox(.48,.085,.28,metal,.025),0,.35,-.54+n*.24);armor.rotation.x=-.08;
  put(body,spike(.06,.20,gold),0,.49,-.54+n*.24);
 }
 const collar=put(body,tube(.42,.42,.09,cloth,16),0,.05,.59);collar.rotation.x=Math.PI/2;
 const tail=joint(body,0,.02,-.90);
 curve(tail,[[0,0,0],[.02,-.10,-.25],[.07,-.19,-.50],[.15,-.13,-.72]],.105,hide);
 group.userData={id:'lobo',profile,legs,arms:[],head,body,tail,hasWolf:true,size:1};return group;
}
