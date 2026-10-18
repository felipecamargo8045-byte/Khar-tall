/* KHAR TALL V2 — motor de regras, sem dependências de interface */
(function(global){
'use strict';
const N=10, RED=0, BLUE=1;
const TYPES=['king','guardian','colossus','wolf','scout','soldier','archer'];
const NAMES={king:'Rei',guardian:'Guardião',colossus:'Colosso',wolf:'Lobo',scout:'Batedor',soldier:'Aprendiz Soldado',archer:'Aprendiz Arqueiro'};
const DIR8=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
const DIR4=[[1,0],[-1,0],[0,1],[0,-1]];
const VDIR={up:[[-1,-1],[1,-1]],down:[[-1,1],[1,1]],left:[[-1,-1],[-1,1]],right:[[1,-1],[1,1]]};
const VALUE={king:1000,guardian:90,colossus:55,wolf:42,scout:65,soldier:12,archer:12};
const GUARDIAN_AREA_RANGE=2,GUARDIAN_AREA_TARGETS=2;
const other=s=>1-s, inside=(x,y)=>x>=0&&y>=0&&x<N&&y<N;
const square=(x,y)=>'ABCDEFGHIJ'[x]+(10-y);
const dist=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
const isRay=(a,b)=>a.x===b.x||a.y===b.y||Math.abs(a.x-b.x)===Math.abs(a.y-b.y);
const sideName=s=>s===RED?'Rubros':'Azuis';
function originalState(mode='local',difficulty=3){
 let next=1,pieces=[];
 const place=(side,type,x,y,original=false)=>pieces.push({id:next++,side,type,x,y,hp:type==='king'?2:1,original,mark:null,stun:null,freeze:null,rest:null,copy:null,charge:0});
 const back=['field','colossus','wolf','scout','king','guardian','scout','wolf','colossus','field'];
 const front='ASASSASA';
 for(const s of [BLUE,RED]){
  let y=s===BLUE?0:9,fy=s===BLUE?1:8;
  back.forEach((t,x)=>{if(t!=='field')place(s,t,x,y,t==='guardian');});
  [...front].forEach((c,i)=>place(s,c==='A'?'archer':'soldier',i+1,fy));
 }
 return {version:2,mode,difficulty,phase:'setup',setupSide:RED,side:RED,pieces,next,turnSerial:0,turns:[0,0],traps:[],fields:[
  {id:'H-A10',x:0,y:0,owner:BLUE,kind:'heal',need:[0,0]},
  {id:'C-J10',x:9,y:0,owner:BLUE,kind:'crystal',need:[0,0]},
  {id:'H-A1',x:0,y:9,owner:RED,kind:'heal',need:[0,0]},
  {id:'C-J1',x:9,y:9,owner:RED,kind:'crystal',need:[0,0]}],
  combo:null,reaction:null,queuedReaction:null,fieldPending:null,deadline:null,winner:null,endedReason:'',lastThreat:null,
  logs:[{msg:'Prepare as armadilhas. Cada lado dispõe de 60 segundos e até duas armadilhas.'}]};
}
class KharTall{
 constructor(opts={}){this.s=originalState(opts.mode||'local',opts.difficulty||3);this.random=opts.random||Math.random;}
 get N(){return N;}
 pieceAt(x,y){return this.s.pieces.find(p=>p.x===x&&p.y===y)||null;}
 piece(id){return this.s.pieces.find(p=>p.id===id)||null;}
 king(side){return this.s.pieces.find(p=>p.side===side&&p.type==='king')||null;}
 guardian(side){return this.s.pieces.find(p=>p.side===side&&p.type==='guardian'&&p.original)||null;}
 field(x,y){return this.s.fields.find(f=>f.x===x&&f.y===y)||null;}
 fieldReady(f){return !!f&&this.s.turns.every((count,s)=>count>=f.need[s]);}
 eligibleField(p,x=p.x,y=p.y){const f=this.field(x,y);return f&&f.owner!==p.side&&this.fieldReady(f)?f:null;}
 trapAt(x,y,side){return this.s.traps.find(t=>t.x===x&&t.y===y&&t.side===other(side))||null;}
 note(msg){this.s.logs.unshift({msg:`${this.s.turnSerial+1} · ${msg}`});this.s.logs.length=Math.min(this.s.logs.length,90);}
 placeTrap(side,x,y){const s=this.s;if(s.phase!=='setup'||side!==s.setupSide||!inside(x,y)||this.field(x,y)||this.pieceAt(x,y))return false;
  const previous=s.traps.find(t=>t.side===side&&t.x===x&&t.y===y);
  if(previous){s.traps=s.traps.filter(t=>t!==previous);return true;}
  // Dois lados podem esconder armadilhas na mesma casa sem revelar essa informação.
  if(s.traps.filter(t=>t.side===side).length>=2)return false;
  s.traps.push({side,x,y});return true;
 }
 moveTrap(side,from,to){if(!this.s.traps.some(t=>t.side===side&&t.x===from.x&&t.y===from.y))return false;
  const old=this.s.traps.find(t=>t.side===side&&t.x===from.x&&t.y===from.y);this.s.traps=this.s.traps.filter(t=>t!==old);
  if(this.placeTrap(side,to.x,to.y))return true;this.s.traps.push(old);return false;
 }
 finishSetup(){const s=this.s;if(s.phase!=='setup')return false;
  if(s.setupSide===RED){if(s.mode==='ai'){this.setupAI();this.begin();}else{s.setupSide=BLUE;}return true;}
  this.begin();return true;
 }
 setupAI(){const free=[];for(let y=2;y<8;y++)for(let x=0;x<10;x++)if(!this.pieceAt(x,y)&&!this.field(x,y))free.push({x,y});
  // O computador só conhece suas próprias armadilhas; o jogador jamais as vê antes de dispararem.
  for(let i=0;i<2;i++){const k=Math.floor(this.random()*free.length);this.s.traps.push({side:BLUE,...free.splice(k,1)[0]});}
 }
 begin(){const s=this.s;s.phase='play';s.side=this.random()<.5?RED:BLUE;s.turnSerial=0;this.note(`Sorteio: ${sideName(s.side)} começam. ${s.untimed?'O treino não tem limite de tempo.':'Os turnos têm 60 segundos.'}`);}
 trail(a,b){if(!isRay(a,b))return null;const dx=Math.sign(b.x-a.x),dy=Math.sign(b.y-a.y),n=Math.max(Math.abs(b.x-a.x),Math.abs(b.y-a.y));let arr=[];
  for(let i=1;i<n;i++)arr.push({x:a.x+dx*i,y:a.y+dy*i});return arr;
 }
 walkClear(a,b){const t=this.trail(a,b);return t!==null&&t.every(c=>!this.pieceAt(c.x,c.y));}
 lineClear(a,b){const t=this.trail(a,b);return t!==null&&t.every(c=>!this.pieceAt(c.x,c.y));}
 blockedByAllyArea(a,b){ // Linha digital do ataque em área: cada aliado no caminho protege os inimigos atrás dele.
  let x=a.x,y=a.y,dx=Math.abs(b.x-x),dy=Math.abs(b.y-y),sx=Math.sign(b.x-x),sy=Math.sign(b.y-y),err=dx-dy;
  while(x!==b.x||y!==b.y){const twice=2*err;if(twice>-dy){err-=dy;x+=sx;}if(twice<dx){err+=dx;y+=sy;}
   if(x===b.x&&y===b.y)break;const t=this.pieceAt(x,y);if(t&&t.side===a.side)return true;}
  return false;
 }
 canRescue(p){let k=this.king(p.side);if(!k||!['wolf','colossus'].includes(p.type))return false;
  const wounded=k.hp===1;
  let emergency=k.hp===2&&!!k.mark&&this.s.reaction?.side===p.side&&this.s.reaction.threatType==='scout'&&this.scoutCanTarget(p.side,k);
  if(!wounded&&!emergency)return false;
  if(p.type==='wolf'){const dx=Math.abs(p.x-k.x),dy=Math.abs(p.y-k.y);return dx===3&&dy===2||dx===2&&dy===3;}
  if(Math.abs(k.x-p.x)+Math.abs(k.y-p.y)!==3||!(k.x===p.x||k.y===p.y))return false;
  return this.walkClear(p,k);
 }
 scoutCanTarget(victimSide,k){return this.s.pieces.filter(p=>p.type==='scout'&&p.side!==victimSide).some(p=>this.scoutTargets(p).some(t=>t.id===k.id));}
 scoutTargets(p,orientation=null){const dirs=orientation?VDIR[orientation]:DIR8.filter(([dx,dy])=>dx!==0&&dy!==0);let targets=[];
  for(let [dx,dy] of dirs){for(let i=1;i<=4;i++){let x=p.x+dx*i,y=p.y+dy*i;if(!inside(x,y))break;let q=this.pieceAt(x,y);if(q){if(q.side!==p.side&&!targets.some(t=>t.id===q.id))targets.push(q);break;}}}
  return targets;
 }
 guardianTargets(p){return this.s.pieces.filter(q=>q.side!==p.side&&dist(p,q)<=GUARDIAN_AREA_RANGE&&!this.blockedByAllyArea(p,q));}
 guardianLineTargets(p){let out=[];for(const [dx,dy] of DIR4){for(let i=1;i<=5;i++){let x=p.x+dx*i,y=p.y+dy*i;if(!inside(x,y))break;let t=this.pieceAt(x,y);if(t){if(t.side!==p.side)out.push(t);break;}}}return out;}
 statusActive(p,k){return !!(p[k]&&p[k].n>0);}
 canPieceAct(p){if(p.type==='king')return true;return !(this.statusActive(p,'stun')||this.statusActive(p,'freeze')||this.statusActive(p,'rest'));}
 isKingRestricted(p){return this.statusActive(p,'stun')||this.statusActive(p,'freeze');}
 isInterposition(pos,side){let k=this.king(side),att=this.piece(this.s.reaction?.attackerId);if(!k||!att||att.side===side)return false;
  const ray=this.trail(att,k);return !!ray&&ray.some(c=>c.x===pos.x&&c.y===pos.y);
 }
 actionsFor(pid,orientation=null){const s=this.s,p=this.piece(pid);if(!p||s.phase!=='play'||s.side!==p.side||s.fieldPending||s.winner!==null)return [];
  if(s.combo&&s.combo.pid!==p.id)return [];
  if(!this.canPieceAct(p))return [];
  const opts=[],add=(kind,x,y,extra={})=>{if(inside(x,y))opts.push({p:p.id,kind,x,y,...extra});};
  const move=(dx,dy,steps=1)=>{for(let i=1;i<=steps;i++){const x=p.x+dx*i,y=p.y+dy*i;if(!inside(x,y)||this.pieceAt(x,y))break;add('move',x,y);}};
  if(!s.combo){
   if(['soldier','archer','scout','colossus'].includes(p.type))for(const [dx,dy] of DIR8)move(dx,dy);
   if(p.type==='king'&&!this.isKingRestricted(p))for(const [dx,dy] of DIR8)move(dx,dy,2);
   if(p.type==='guardian')for(const [dx,dy] of DIR8)move(dx,dy,9);
   if(p.type==='wolf')for(const [dx,dy] of [[3,2],[3,-2],[-3,2],[-3,-2],[2,3],[2,-3],[-2,3],[-2,-3]]){
    const x=p.x+dx,y=p.y+dy;if(!inside(x,y))continue;let t=this.pieceAt(x,y);
    if(!t)add('move',x,y);else if(t.side!==p.side)add('wolfHit',x,y,{target:t.id});
   }
   // Soldado: 1 casa em +. Arqueiro: 1 ou 2 em X, com a primeira peça bloqueando a flecha.
   if(p.type==='soldier')for(const [dx,dy] of DIR4){
    const q=this.pieceAt(p.x+dx,p.y+dy);
    if(q&&q.side!==p.side)add('hit',q.x,q.y,{target:q.id,tech:'soldier'});
   }
   if(p.type==='archer')for(const [dx,dy] of DIR8.filter(([x,y])=>x&&y))for(let step=1;step<=2;step++){
    const x=p.x+dx*step,y=p.y+dy*step;if(!inside(x,y))break;
    const q=this.pieceAt(x,y);if(q){if(q.side!==p.side)add('hit',x,y,{target:q.id,tech:'archer'});break;}
   }
   if(p.type==='king'&&!this.statusActive(p,'stun'))for(const [dx,dy] of DIR8){for(let i=1;i<=2;i++){let x=p.x+dx*i,y=p.y+dy*i;if(!inside(x,y))break;let t=this.pieceAt(x,y);if(t){if(t.side!==p.side)add('hit',x,y,{target:t.id,tech:'king'});break;}}}
   if(p.type==='guardian'){
    for(let t of this.guardianLineTargets(p))add('line',t.x,t.y,{target:t.id,tech:'guardianLine'});
    for(let t of this.guardianTargets(p))add('area',t.x,t.y,{target:t.id,tech:'guardianArea'});
   }
   if(p.type==='colossus'){
    if(p.charge===0)for(let [dx,dy] of DIR4){let x=p.x+dx*3,y=p.y+dy*3;if(!inside(x,y))continue;
     const cells=[1,2,3].map(i=>({x:p.x+dx*i,y:p.y+dy*i}));if(cells.some(c=>this.pieceAt(c.x,c.y)?.side===p.side))continue;
     let enemies=cells.some(c=>this.pieceAt(c.x,c.y)?.side===other(p.side));
     if(enemies)add('charge',x,y);
     else if(this.king(p.side)?.hp===1&&this.eligibleField(p,x,y))add('fieldCharge',x,y);
    }
    else for(let [dx,dy] of DIR8){let x=p.x+dx,y=p.y+dy;if(!inside(x,y)||this.pieceAt(x,y))continue;
     if(this.s.pieces.some(t=>t.side!==p.side&&dist(t,{x,y})===1))add('smash',x,y);
    }
    if(this.canRescue(p)){let k=this.king(p.side);add('rescue',k.x,k.y);}
   }
   if(p.type==='wolf'&&this.canRescue(p)){let k=this.king(p.side);add('rescue',k.x,k.y);}
  }
  if(p.type==='scout'||(p.type==='king'&&p.copy?.type==='scout')){
   for(let t of this.scoutTargets(p,orientation)){
    const execute=t.mark&&t.mark.n>0&&t.mark.by===p.side;
    add(execute?'execute':'mark',t.x,t.y,{target:t.id,tech:'scout',orient:orientation||null,copied:p.type==='king'});
   }
  }
  if(p.type==='king'&&p.copy){
   if(p.copy.type==='wolf')for(let [dx,dy] of [[3,2],[3,-2],[-3,2],[-3,-2],[2,3],[2,-3],[-2,3],[-2,-3]]){
    const x=p.x+dx,y=p.y+dy;if(!inside(x,y))continue;let t=this.pieceAt(x,y);if(!t)add('copyMove',x,y,{tech:'wolf'});else if(t.side!==p.side)add('copyWolfHit',x,y,{target:t.id,tech:'wolf'});
   }
   if(p.copy.type==='colossus')for(let [dx,dy] of DIR4){const x=p.x+dx*3,y=p.y+dy*3;if(!inside(x,y))continue;
    const cells=[1,2,3].map(i=>({x:p.x+dx*i,y:p.y+dy*i}));if(cells.some(c=>this.pieceAt(c.x,c.y)?.side===p.side))continue;
    if(cells.some(c=>this.pieceAt(c.x,c.y)?.side===other(p.side))||this.eligibleField(p,x,y))add('copyCharge',x,y,{tech:'colossus'});
   }
   // A Cópia Real preserva o alcance da habilidade copiada, sem atravessar unidades.
   if(p.copy.type==='soldier')for(const [dx,dy] of DIR4){const t=this.pieceAt(p.x+dx,p.y+dy);if(t&&t.side!==p.side)add('copyHit',t.x,t.y,{target:t.id,tech:'soldier'});}
   if(p.copy.type==='archer')for(const [dx,dy] of DIR8.filter(([x,y])=>x&&y))for(let step=1;step<=2;step++){
    const x=p.x+dx*step,y=p.y+dy*step;if(!inside(x,y))break;
    const t=this.pieceAt(x,y);if(t){if(t.side!==p.side)add('copyHit',x,y,{target:t.id,tech:'archer'});break;}
   }
   if(p.copy.type==='guardianArea')for(let t of this.guardianTargets(p))add('copyArea',t.x,t.y,{target:t.id,tech:'guardianArea'});
   if(p.copy.type==='guardianLine')for(let t of this.guardianLineTargets(p))add('copyLine',t.x,t.y,{target:t.id,tech:'guardianLine'});
   if(p.copy.type==='king')for(let [dx,dy] of DIR8){for(let i=1;i<=2;i++){let x=p.x+dx*i,y=p.y+dy*i;if(!inside(x,y))break;let t=this.pieceAt(x,y);if(t){if(t.side!==p.side)add('copyHit',x,y,{target:t.id,tech:'king'});break;}}}
  }
  // Rei marcado magicamente: apenas habilidades copiadas; armadilha: ataques normais + cópia.
  if(p.type==='king'&&this.statusActive(p,'stun')){
   const copied=['copyMove','copyWolfHit','copyCharge','copyHit','copyArea','copyLine','mark','execute'];
   let a=opts.filter(o=>copied.includes(o.kind)&&(o.copied||o.kind.startsWith('copy')));
   opts.length=0;opts.push(...a);
  }else if(p.type==='king'&&this.statusActive(p,'freeze')){
   const a=opts.filter(o=>o.kind!=='move');opts.length=0;opts.push(...a);
  }
  if(s.combo){ // Segundo ataque do MESMO Batedor; mesmo prazo do turno.
   const a=opts.filter(o=>['mark','execute'].includes(o.kind));opts.length=0;opts.push(...a);
  }
  if(s.reaction?.side===p.side){ // Uma Reação Real só oferece ações defensivas ou cópia ofensiva do Rei.
   const a=opts.filter(o=>{
    if(p.type==='king')return o.kind==='move'||o.kind.startsWith('copy')||(o.copied&&['mark','execute'].includes(o.kind));
    if(o.kind==='rescue')return true;
    if(o.kind==='move')return this.isInterposition(o,p.side)||!!this.eligibleField(p,o.x,o.y)&&this.king(p.side)?.hp===1;
    if(o.kind==='fieldCharge')return this.king(p.side)?.hp===1;
    return false;
   });opts.length=0;opts.push(...a);
  }
  // Impede resultados duplicados; opções alternativas ficam disponíveis em menu no destino.
  return opts;
 }
 allActions(side=this.s.side){if(this.s.phase!=='play'||this.s.side!==side)return [];
  return this.s.pieces.filter(p=>p.side===side).flatMap(p=>this.actionsFor(p.id));
 }
 status(p,key,n,by=null){p[key]={n,by,born:this.s.turns[p.side],own:this.s.side===p.side};}
 giveCopy(king,tech){if(!king)return;king.copy={type:tech,born:this.s.turns[king.side],own:this.s.side===king.side};this.note(`O Rei ${sideName(king.side)} copiou ${NAMES[tech]||tech} (um uso no próximo turno).`);}
 triggerTrap(p,x,y){let t=this.trapAt(x,y,p.side);if(!t)return false;
  this.s.traps=this.s.traps.filter(z=>z!==t);this.status(p,'freeze',1);this.s.flash={x,y,what:'trap'};
  this.note(`Armadilha ${sideName(t.side)} ativada em ${square(x,y)}! ${NAMES[p.type]} imobilizado por um turno.`);return true;
 }
 kill(t,source){const s=this.s;s.pieces=s.pieces.filter(z=>z.id!==t.id);
  this.note(`${NAMES[t.type]} ${sideName(t.side)} eliminado em ${square(t.x,t.y)}.`);
  if(t.type==='king'){
   if(!this.guardian(t.side)){this.declareWin(other(t.side),'Rei e Guardião original eliminados.');return;}
   this.s.deadline=this.s.deadline||{};this.s.deadline[t.side]={attacker:other(t.side),left:3};
   this.note(`Rei ${sideName(t.side)} caiu: ${sideName(other(t.side))} têm 3 turnos próprios para eliminar o Guardião original.`);
  }
  if(t.type==='guardian'&&t.original&&!this.king(t.side))this.declareWin(other(t.side),'Rei e Guardião original eliminados.');
 }
 declareWin(side,reason){this.s.winner=side;this.s.endedReason=reason;this.s.phase='over';this.note(side===-1?'Empate: '+reason:`Vitória ${sideName(side)}: ${reason}`);}
 attack(attacker,target,tech){if(!target||!this.piece(target.id))return;
  if(target.type==='king'){
   target.hp=Math.max(0,target.hp-1);this.note(`${NAMES[attacker.type]} ${sideName(attacker.side)} atingiu o Rei ${sideName(target.side)}: ${target.hp}/2 vidas.`);
   if(target.hp){this.giveCopy(target,tech);this.s.queuedReaction={side:target.side,attackerId:attacker.id,threatType:tech};return;}
  }
  this.kill(target,attacker);
 }
 hitScout(attacker,target){if(target.mark?.n>0&&target.mark.by===attacker.side){this.note(`Execução de marca em ${NAMES[target.type]} ${sideName(target.side)}.`);
   // A marca permanece por 2 turnos do alvo, possibilitando execuções adicionais.
   this.attack(attacker,target,'scout');return 'execute';}
  this.status(target,'mark',2,attacker.side);this.status(target,'stun',1);this.note(`${NAMES[attacker.type]} marcou e paralisou ${NAMES[target.type]} ${sideName(target.side)} em ${square(target.x,target.y)}.`);
  if(target.type==='king'){this.giveCopy(target,'scout');this.s.queuedReaction={side:target.side,attackerId:attacker.id,threatType:'scout'};}
  return 'mark';
 }
 occupy(p,x,y){p.x=x;p.y=y;this.note(`${NAMES[p.type]} ${sideName(p.side)} moveu para ${square(x,y)}.`);return this.triggerTrap(p,x,y);}
 fieldOptions(p){const f=this.eligibleField(p);if(!f)return [];
  let options=[],king=this.king(p.side);
  if(king&&king.hp===1&&p.id!==king.id)options.push({kind:'healKing',label:'♥ Sacrificar para curar o Rei (+1 vida)'});
  if(f.kind==='heal'){
   if(p.type==='soldier')options.unshift({kind:'evolve',to:'colossus',label:'Evoluir Soldado → Colosso'});
   if(p.type==='archer')options.unshift({kind:'evolve',to:'scout',label:'Evoluir Arqueiro → Batedor'});
  }else{
   if(!['soldier','archer'].includes(p.type)&&this.s.pieces.filter(z=>z.side===p.side).length<20){
    let empties=DIR8.some(([dx,dy])=>inside(p.x+dx,p.y+dy)&&!this.pieceAt(p.x+dx,p.y+dy));
    if(empties)options.push({kind:'summon',label:'Invocar Aprendiz (escolher casa adjacente)'});
   }
   if(p.type!=='king'&&!(p.type==='guardian'&&p.original))options.push({kind:'transform',label:'Transformar esta peça'});
   if(p.type!=='king'&&!(p.type==='guardian'&&p.original)&&this.s.pieces.some(z=>z.side===p.side&&z.id!==p.id))options.push({kind:'reunion',label:'Reunião: sacrificar para teletransportar um aliado'});
  }
  return options;
 }
 charge(p,x,y,copied=false){let dx=Math.sign(x-p.x),dy=Math.sign(y-p.y),travelled=0,stopped=false;
  for(let n=1;n<=3;n++){
   let nx=p.x+dx,ny=p.y+dy;
   let occupant=this.pieceAt(nx,ny);
   // Não há sobreposição de peças na casa de uma armadilha.
   if(this.trapAt(nx,ny,p.side)){
    if(!occupant){p.x=nx;p.y=ny;this.triggerTrap(p,nx,ny);}
    else{this.triggerTrap(p,nx,ny);this.note('Investida bloqueada por armadilha sob uma peça inimiga.');}
    stopped=true;break;
   }
   if(occupant){
    if(occupant.side===p.side){stopped=true;break;}
    this.attack(p,occupant,'colossus');if(this.s.phase==='over')return;
    if(this.piece(occupant.id)){ // Rei ainda vivo: bloqueia a casa e os inimigos atrás.
     this.note('O Rei resistiu ao impacto e interrompeu o avanço físico.');stopped=true;break;
    }
   }
   p.x=nx;p.y=ny;travelled++;
  }
  if(!copied)p.charge=stopped?0:1;
  this.note(stopped?'Investida interrompida.':'Investida de três casas concluída; Esmagamento disponível na próxima ação.');
 }
 finishAction(){const s=this.s;if(s.phase==='over')return;
  // Campo mágico: a entrada, não a permanência, concede ativação.
  const acted=s.lastActed?this.piece(s.lastActed):null;
  if(acted&&s.lastArrived){const f=this.eligibleField(acted);
   if(f){let options=this.fieldOptions(acted);if(options.length){s.fieldPending={pid:acted.id,fieldId:f.id};
    if(options.length===1&&options[0].kind==='evolve'){this.fieldChoice({kind:'evolve'});return;}
    return;}}
  }
  this.finalizeTurn();
 }
 finalizeTurn(){const s=this.s;if(s.phase!=='play')return;
  const old=s.side;for(const p of s.pieces.filter(p=>p.side===old)){
   for(const key of ['mark','stun','freeze','rest']){let v=p[key];if(v?.n>0){if(!(v.own&&v.born===s.turns[old])){v.n--;if(v.n===0)p[key]=null;}}}
   if(p.copy){let c=p.copy;if(!(c.own&&c.born===s.turns[old])){this.note(`Cópia Real de ${NAMES[c.type]||c.type} expirou.`);p.copy=null;}}
  }
  // Esmagamento é na próxima ação; passar a vez perde a oportunidade.
  if(s.lastPassed){for(let p of s.pieces.filter(p=>p.side===old&&p.charge===1))p.charge=0;}
  s.turns[old]++;s.turnSerial++;s.combo=null;s.fieldPending=null;s.lastActed=null;s.lastArrived=false;s.lastPassed=false;
  const deadline=s.deadline;
  if(deadline){for(const [victim,info] of Object.entries(deadline)){
   if(!info||info.attacker!==old)continue;
   // O golpe que matou o Rei não conta entre as 3 oportunidades seguintes.
   if(info.createdOn===undefined){info.createdOn=s.turns[old];continue;}
   info.left--;
   if(info.left<=0&&this.guardian(+victim)){this.declareWin(-1,'o Guardião original resistiu às três rodadas de perseguição.');return;}
  }}
  s.side=other(old);s.reaction=s.queuedReaction?.side===s.side?s.queuedReaction:null;s.queuedReaction=null;
  if(s.reaction)this.note(`REAÇÃO REAL: ${sideName(s.side)} devem proteger ou contra-atacar com a Cópia Real.`);
 }
 pass(reason='Jogador passou o turno.'){if(this.s.phase!=='play')return false;
  if(this.s.fieldPending){this.s.fieldPending=null;this.s.lastArrived=false;this.note('Campo mágico não utilizado.');}
  this.note(reason);this.s.lastPassed=true;this.finalizeTurn();return true;
 }
 handleArrival(pid){this.s.lastActed=pid;this.s.lastArrived=true;this.finishAction();}
 act(input){const s=this.s;if(s.phase!=='play'||s.fieldPending||s.winner!==null)return false;
  const p=this.piece(input.p);if(!p)return false;
  const a=this.actionsFor(p.id,input.orient||null).find(o=>o.kind===input.kind&&o.x===input.x&&o.y===input.y&&o.target===input.target);
  if(!a)return false;
  let arrived=false,usedCopy=!!input.kind.startsWith('copy')||(p.type==='king'&&['execute','mark'].includes(a.kind));
  const opponent=this.pieceAt(a.x,a.y);
  s.lastActed=p.id;s.lastArrived=false;
  switch(a.kind){
   case 'move': case 'copyMove': this.occupy(p,a.x,a.y);arrived=true;if(p.type==='colossus')p.charge=0;break;
   case 'fieldCharge':case 'charge':case 'copyCharge':this.charge(p,a.x,a.y,a.kind==='copyCharge');arrived=true;break;
   case 'smash':this.occupy(p,a.x,a.y);arrived=true;
    for(const t of [...s.pieces].filter(t=>t.side!==p.side&&dist(t,p)===1)){this.attack(p,t,'colossus');if(s.phase==='over')break;}
    p.charge=0;this.note('Esmagamento do Colosso executado.');break;
   case 'rescue':{
    let k=this.king(p.side);if(!k)return false;
    let ox=p.x,oy=p.y;p.x=k.x;p.y=k.y;k.x=ox;k.y=oy;
    if(k.hp===2&&k.mark){k.hp=1;this.note('Resgate Real de emergência: Rei perde 1 vida.');}
    this.giveCopy(k,p.type);this.note(`${NAMES[p.type]} resgatou o Rei: troca de casas concluída.`);
    // A troca não é entrada deliberada do Rei para ativar campos mágicos.
    if(this.triggerTrap(p,p.x,p.y))this.note('A peça de resgate caiu numa armadilha.');
    if(this.triggerTrap(k,k.x,k.y))this.note('O Rei chegou a uma armadilha durante o resgate.');
    p.charge=0;break;
   }
   case 'wolfHit':case 'copyWolfHit':{
    const wolfTrap=this.trapAt(a.x,a.y,p.side);
    if(wolfTrap){this.triggerTrap(p,a.x,a.y);this.note('Armadilha anulou o ataque do Lobo. A peça retornou à origem, imobilizada.');break;}
    this.attack(p,opponent,'wolf');
    if(s.phase!=='over'&&!this.piece(opponent.id)){this.occupy(p,a.x,a.y);arrived=true;}
    if(p.type==='wolf')this.status(p,'rest',1);
    this.note('Salto ofensivo: Lobo deverá permanecer parado no próximo turno próprio.');break;
   }
   case 'hit':case 'copyHit':case 'line':case 'copyLine':
    this.attack(p,opponent,a.tech||p.type);
    if(s.phase!=='over'&&!this.piece(opponent.id)&&!!input.advance&&['hit','copyHit'].includes(a.kind)){
     if(dist(p,a)===1||p.type==='king'&&dist(p,a)<=2){this.occupy(p,a.x,a.y);arrived=true;}
    }
    break;
   case 'mark':case 'execute':this.hitScout(p,opponent);break;
   case 'area':case 'copyArea':{
    const eligible=this.guardianTargets(p).map(q=>q.id);
    const targets=[a.target,...(Array.isArray(input.targets)?input.targets:[])].filter((id,i,ar)=>eligible.includes(id)&&ar.indexOf(id)===i).slice(0,GUARDIAN_AREA_TARGETS);
    this.note(`Ataque em área: ${targets.length} alvo(s) selecionados.`);
    for(const tid of targets){const q=this.piece(tid);if(q)this.attack(p,q,'guardianArea');if(s.phase==='over')break;}
    break;
   }
   default:return false;
  }
  if(usedCopy)p.copy=null;
  if(s.phase==='over')return true;
  if((p.type==='scout')&&['mark','execute'].includes(a.kind)&&!s.queuedReaction){
   if(!s.combo){s.combo={pid:p.id};this.note('Batedor pode realizar seu segundo ataque mágico ou encerrar o turno.');return true;}
  }
  if(s.combo&&!s.queuedReaction){s.combo=null;}
  if(arrived){this.handleArrival(p.id);}
  else this.finalizeTurn();
  return true;
 }
 fieldChoice(choice){const s=this.s,pend=s.fieldPending;if(!pend||s.phase!=='play')return false;
  const p=this.piece(pend.pid),f=this.s.fields.find(f=>f.id===pend.fieldId);
  if(!p||!f)return false;
  const valid=this.fieldOptions(p).some(o=>o.kind===choice.kind);
  if(!valid){if(choice.kind==='skip'){s.fieldPending=null;s.lastArrived=false;this.finalizeTurn();return true;}return false;}
  let destination=null,teleported=null;
  switch(choice.kind){
   case 'evolve':{const type=p.type==='soldier'?'colossus':'scout';p.type=type;p.charge=0;this.note(`Evolução: ${NAMES[type]} em ${square(p.x,p.y)}.`);break;}
   case 'healKing':{let k=this.king(p.side);if(!k||k.hp!==1||k.id===p.id)return false;
    k.hp=2;this.kill(p,p);this.note('Cura Real: Rei recuperou a segunda vida.');break;}
   case 'summon':{const x=choice.x,y=choice.y,type=choice.type;
    if(!['soldier','archer'].includes(type)||!inside(x,y)||dist(p,{x,y})!==1||this.pieceAt(x,y)||s.pieces.filter(q=>q.side===p.side).length>=20)return false;
    s.pieces.push({id:s.next++,side:p.side,type,x,y,hp:1,original:false,mark:null,stun:null,freeze:null,rest:null,copy:null,charge:0});
    this.note(`Cristal invocou ${NAMES[type]} em ${square(x,y)}.`);break;}
   case 'transform':{const t=choice.type;if(!TYPES.includes(t)||t==='king'||p.type==='king'||p.original)return false;
    const previous=p.type;p.type=t;p.original=false;p.hp=1;p.charge=0;p.mark=null;p.stun=null;p.freeze=null;p.rest=null;p.copy=null;
    this.note(`Cristal transformou ${NAMES[previous]} em ${NAMES[t]}.`);break;}
   case 'reunion':{
    const t=this.piece(choice.targetId),x=choice.x,y=choice.y;
    if(!t||t.id===p.id||t.side!==p.side||!inside(x,y)||this.pieceAt(x,y)||p.original||p.type==='king')return false;
    this.kill(p,p);t.x=x;t.y=y;teleported=t;
    this.note(`Reunião: ${NAMES[t.type]} teletransportado para ${square(x,y)}.`);
    this.triggerTrap(t,x,y);break;}
  }
  // Recarga de 3 rodadas completas, excluindo o turno da ativação.
  f.need=s.turns.map((n,side)=>n+3+(side===s.side?1:0));
  s.fieldPending=null;s.lastArrived=false;
  if(s.phase==='over')return true;
  // Reunião num outro campo permite ativá-lo imediatamente, respeitando sua recarga.
  if(teleported){const next=this.eligibleField(teleported);if(next){let options=this.fieldOptions(teleported);if(options.length){s.fieldPending={pid:teleported.id,fieldId:next.id};s.lastActed=teleported.id;
   if(options.length===1&&options[0].kind==='evolve')return this.fieldChoice({kind:'evolve'});
   return true;}}}
  this.finalizeTurn();return true;
 }
 snapshot(){return JSON.parse(JSON.stringify(this.s));}
 static restore(obj){const g=new KharTall({mode:obj.mode||'local',difficulty:obj.difficulty||3});g.s=JSON.parse(JSON.stringify(obj));return g;}
}
KharTall.CONSTANTS={N,RED,BLUE,TYPES,NAMES,VALUE,DIR8,DIR4,VDIR,square,other,sideName};
if(typeof module!=='undefined'&&module.exports)module.exports={KharTall};
global.KharTall=KharTall;
})(typeof window!=='undefined'?window:globalThis);
