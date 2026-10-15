/* KHAR TALL V2 — interface, cronômetro e oponente computacional */
(function(){'use strict';
const {RED,BLUE,NAMES,VALUE,DIR8,square,sideName}=KharTall.CONSTANTS;
const SYMBOL={king:'♛',guardian:'♜',colossus:'♟',wolf:'♞',scout:'✧',soldier:'⚔',archer:'➶'};
const SHORT={king:'REI',guardian:'GUAR',colossus:'COLO',wolf:'LOBO',scout:'BATE',soldier:'SOLD',archer:'ARQ'};
const ART={king:'assets/khar_tall_rei.png',guardian:'assets/khar_tall_guardiao.png',colossus:'assets/khar_tall_colosso.png',wolf:'assets/khar_tall_lobo.png',scout:'assets/khar_tall_batedor.png',soldier:'assets/khar_tall_aprendiz_soldado.png',archer:'assets/khar_tall_aprendiz_arqueiro.png'};
const STORE='khar-tall-v2-save';
const TOKEN_ART={king:'assets/token_king.webp',guardian:'assets/token_guardian.webp',colossus:'assets/token_colossus.webp',wolf:'assets/token_wolf.webp',scout:'assets/token_scout.webp',soldier:'assets/token_soldier.webp',archer:'assets/token_archer.webp'};
const PREF_STORE='khar-tall-v21-pref';
let prefs={sound:true,illustrated:true};try{prefs={...prefs,...JSON.parse(localStorage.getItem(PREF_STORE)||'{}')};}catch(e){}
let battleFx=[],toastTimeout=null;
const audioPlayer=KharTallAudio.create({enabled:prefs.sound});
const gameUI=KharTallUI.create({audio:audioPlayer,onConfirm:()=>{if(!isInputBlocked()&&game.s.phase==='setup')finishSetup();}});
function primeScoutWavs(){return audioPlayer.preload();}

// Momentos dramáticos: os quatro motivos musicais são disparados apenas por
// transições reais do estado (vidas, morte do Guardião original e vitória).
function playRoyalMoment(kind,delayMs=0){if(!prefs.sound)return;const key={wound:'royalWound',suspense:'royalSuspense',guardian:'royalGuardian',victory:'royalVictory'}[kind];if(key)audioPlayer.play(key,delayMs);}
function detectRoyalMoment(before,next,action){
 const oldPieces=[...before.pieces.values()];
 const wasKingHit=oldPieces.some(p=>p.type==='king'&&p.hp===2&&next.get(p.id)?.hp===1);
 const newlyDeadKing=oldPieces.some(p=>p.type==='king'&&!next.has(p.id)&&
  [...next.values()].some(t=>t.side===p.side&&t.type==='guardian'&&t.original));
 const originalGuardianFell=!!action&&oldPieces.some(p=>p.type==='guardian'&&p.original&&!next.has(p.id));
 // A vitória sobrepõe a trombeta de aviso e o suspense em uma ação final.
 if(game.s.phase==='over'&&game.s.winner!==null&&game.s.winner!==-1)return 'victory';
 if(newlyDeadKing)return 'suspense';
 if(originalGuardianFell)return 'guardian';
 if(wasKingHit)return 'wound';
 return null;
}
function royalImpactDelay(action){
 if(!action)return 0;
 const attacker=game.piece(action.p);
 const original=action.kind||'';
 if(['execute','mark'].includes(original)){
  if(attacker)return Math.max(420,Math.max(Math.abs(action.x-attacker.x),Math.abs(action.y-attacker.y))*120);
  return 480;
 }
 if(['hit','copyHit'].includes(original)){
  if(attacker?.type==='archer'||action.tech==='archer')return 470;
  if(attacker?.type==='soldier'||action.tech==='soldier')return 260;
 }
 if(['charge','copyCharge','fieldCharge'].includes(original))return 360;
 if(original==='smash')return 370;
 if(original==='wolfHit'||original==='copyWolfHit')return 300;
 return 150;
}
function savePrefs(){try{localStorage.setItem(PREF_STORE,JSON.stringify(prefs));}catch(e){}}
function applyPrefs(){audioPlayer.setEnabled(prefs.sound);document.body.classList.toggle('classicPieces',!prefs.illustrated);let a=el('artToggle'),b=el('audioToggle');
 if(a){a.textContent=prefs.illustrated?'◉ Artes ativas':'◯ Símbolos clássicos';a.setAttribute('aria-pressed',String(prefs.illustrated));}
 if(b){b.textContent=prefs.sound?'♫ Som ligado':'♫ Som desligado';b.setAttribute('aria-pressed',String(prefs.sound));}}
// Efeitos sonoros gerados no próprio navegador: nenhum áudio externo ou necessidade de rede.
function sound(kind){if(prefs.sound)audioPlayer.utility(kind);}
function playScoutAttackAudio(variant,travelMs){if(!prefs.sound)return;const prefix=variant==='blue'?'blue':'red';audioPlayer.sequence([{key:prefix+'Launch',delay:0},{key:prefix+'Impact',delay:Math.max(80,travelMs)}]);}
function playArcherAttackAudio(travelMs){if(prefs.sound)audioPlayer.sequence([{key:'arrowLaunch',delay:0},{key:'arrowImpact',delay:Math.max(80,travelMs)}]);}
function playSoldierSwordAudio(impactMs=250){if(prefs.sound)audioPlayer.sequence([{key:'swordSwing',delay:0},{key:'swordImpact',delay:Math.max(120,impactMs)}]);}
function playColossusChargeAudio(steps=3){if(!prefs.sound)return;const count=Math.max(0,Math.min(3,Math.floor(steps)));audioPlayer.sequence(Array.from({length:count},(_,i)=>({key:'giantStep',delay:85+i*185,volume:.72+i*.05})));}
function playColossusSmashAudio(delayMs=340){if(prefs.sound)audioPlayer.play('groundSmash',Math.max(65,delayMs-25));}
function playCharacterSfx(kind,delayMs=0){if(prefs.sound)audioPlayer.play(kind,delayMs);}
function playWolfAttackAudio(){if(prefs.sound)audioPlayer.sequence(KharTallAudio.WOLF_ATTACK);}
function realImpactDelay(action,attacker){
 const k=action?.kind||'';
 if(['mark','execute'].includes(k)&&attacker)return Math.max(420,Math.max(Math.abs(attacker.x-action.x),Math.abs(attacker.y-action.y))*120);
 if(['hit','copyHit'].includes(k)){
  if(attacker?.type==='archer'||action.tech==='archer')return Math.max(400,Math.max(Math.abs(attacker.x-action.x),Math.abs(attacker.y-action.y))*245);
  if(attacker?.type==='soldier'||action.tech==='soldier')return 250;
  return 170;
 }
 if(['wolfHit','copyWolfHit'].includes(k))return 310;
 if(['area','copyArea'].includes(k))return 360;
 if(['line','copyLine'].includes(k))return 360;
 if(['charge','copyCharge','fieldCharge'].includes(k))return 360;
 if(k==='smash')return 340;
 return 210;
}
function captureBattle(){return {pieces:new Map(game.s.pieces.map(p=>[p.id,{...p,mark:p.mark?{...p.mark}:null,freeze:p.freeze?{...p.freeze}:null}])),flash:game.s.flash?{...game.s.flash}:null};}
function noteBattleFx(before,action){let next=new Map(game.s.pieces.map(p=>[p.id,p]));let foundMajor=false,forcedSound='';
 const royalMoment=detectRoyalMoment(before,next,action);
 const newTrap=!!game.s.flash&&(!before.flash||before.flash.x!==game.s.flash.x||before.flash.y!==game.s.flash.y);
 for(let [id,prev] of before.pieces){let curr=next.get(id);
  if(!curr){battleFx.push({x:prev.x,y:prev.y,kind:'hit',label:'✕'});foundMajor=true;continue;}
  if(curr.type==='king'&&curr.hp<prev.hp){battleFx.push({x:curr.x,y:curr.y,kind:'hit',label:'−'+(prev.hp-curr.hp)+'♥'});foundMajor=true;}
  if(curr.mark&&!prev.mark){battleFx.push({x:curr.x,y:curr.y,kind:'magic',label:'✧'});foundMajor=true;}
  if(curr.freeze&&!prev.freeze){battleFx.push({x:curr.x,y:curr.y,kind:'trap',label:'⚑'});foundMajor=true;}
  if(curr.x!==prev.x||curr.y!==prev.y){if(!foundMajor)battleFx.push({x:curr.x,y:curr.y,kind:'move',label:''});}
 }
 for(let [id,now] of next)if(!before.pieces.has(id)){battleFx.push({x:now.x,y:now.y,kind:'summon',label:'✦'});foundMajor=true;}
 if(newTrap){battleFx.push({x:game.s.flash.x,y:game.s.flash.y,kind:'trap',label:'⚑'});foundMajor=true;}
 // O uivo de queda toca somente na morte por combate, nunca por transformação
 // ou sacrifício no Cristal. A vitória mantém prioridade sonora à fanfarra.
 if(action&&!(game.s.phase==='over'&&game.s.winner!==-1)){
  const attacker=before.pieces.get(action.p),wolves=[...before.pieces.values()].filter(p=>p.type==='wolf'&&!next.has(p.id));
  const wolfAttack=['wolfHit','copyWolfHit'].includes(action.kind)&&!newTrap;
  wolves.forEach((p,i)=>battleFx.push({kind:'wolfDeath',x:p.x,y:p.y,delay:realImpactDelay(action,attacker)+i*130,silent:i>0||wolfAttack}));
 }
 if(action){let kind=action.kind||'',attacker=before.pieces.get(action.p);
  if(['charge','copyCharge','fieldCharge'].includes(kind)&&attacker){
   const current=next.get(action.p);
   // Armadilha ou Rei resistente podem interromper a Investida. Toca apenas
   // os passos correspondentes às casas efetivamente percorridas.
   const endX=current?.x??attacker.x,endY=current?.y??attacker.y;
   const steps=Math.max(Math.abs(endX-attacker.x),Math.abs(endY-attacker.y));
   if(steps)battleFx.push({kind:'colossusRush',pid:action.p,fromX:attacker.x,fromY:attacker.y,toX:endX,toY:endY,steps});
   foundMajor=true;forcedSound='colossus';
  }
  if(kind==='smash'&&attacker){battleFx.push({kind:'colossusSmash',x:action.x,y:action.y,pid:action.p});foundMajor=true;forcedSound='colossus';}
  if(['mark','execute'].includes(kind)&&attacker){battleFx.push({kind:'scoutBolt',fromX:attacker.x,fromY:attacker.y,toX:action.x,toY:action.y,variant:kind==='mark'?'blue':'red'});foundMajor=true;forcedSound='scout';}
  else if(['hit','copyHit'].includes(kind)&&attacker&&(attacker.type==='archer'||action.tech==='archer')){
   battleFx.push({kind:'arrowShot',fromX:attacker.x,fromY:attacker.y,toX:action.x,toY:action.y});
   foundMajor=true;forcedSound='archer';
  }
  else if(['hit','copyHit'].includes(kind)&&attacker&&(attacker.type==='soldier'||action.tech==='soldier')){
   battleFx.push({kind:'swordSlash',fromX:attacker.x,fromY:attacker.y,toX:action.x,toY:action.y});
   foundMajor=true;forcedSound='soldier';
  }
  else if(['area','copyArea','line','copyLine'].includes(kind)&&attacker){
   battleFx.push({kind:'guardianSpell',spell:['area','copyArea'].includes(kind)?'area':'line',fromX:attacker.x,fromY:attacker.y,toX:action.x,toY:action.y});
   foundMajor=true;forcedSound='guardian';
  }
  // Lobo e cópia do Rei compartilham uma única gravação real de uivo.
  // A armadilha que anula o ataque também cancela seu som.
  if(['wolfHit','copyWolfHit'].includes(kind)&&attacker&&!newTrap){
   battleFx.push({kind:'wolfAttack',fromX:attacker.x,fromY:attacker.y,toX:action.x,toY:action.y});
   foundMajor=true;forcedSound='wolf';
  }
  // Apenas o ataque NATIVO do Rei (e cópia de outro ataque de Rei) usa explosão;
  // os ataques copiados de Arqueiro/Soldado/Guardião/Lobo/Batedor usam seus sons próprios.
  if(['hit','copyHit'].includes(kind)&&attacker&&action.tech==='king'){
   battleFx.push({kind:'kingExplosion',x:action.x,y:action.y});
   foundMajor=true;forcedSound='king';
  }
  if(['rescue','copyMove'].includes(kind)){battleFx.push({x:action.x,y:action.y,kind:'heal',label:'✦'});foundMajor=true;}
 }
 if(game.s.phase==='over'&&game.s.winner!==-1){battleFx.push({kind:'victory',label:'✦'});foundMajor=true;forcedSound='victory';}
 if(royalMoment)battleFx.push({kind:'royalMoment',moment:royalMoment,delay:royalImpactDelay(action)});
 if(!royalMoment&&!['scout','archer','soldier','colossus','wolf','king','guardian'].includes(forcedSound))sound(forcedSound|| (newTrap?'trap':foundMajor?'hit':'move'));
}
function launchScoutBolt(fx,layer,onImpact=()=>{}){
 const startLeft=((fx.fromX+.5)*10)+'%',startTop=((fx.fromY+.5)*10)+'%';
 const endLeft=((fx.toX+.5)*10)+'%',endTop=((fx.toY+.5)*10)+'%';
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const dx=fx.toX-fx.fromX,dy=fx.toY-fx.fromY,steps=Math.max(Math.abs(dx),Math.abs(dy));
 const duration=reduced?90:Math.max(420,steps*120);
 playScoutAttackAudio(fx.variant,duration);
 let done=false,projectile=null;
 const land=()=>{
  if(done)return;done=true;
  projectile?.remove();
  if(!reduced){let burst=one('span','',`scoutImpact ${fx.variant}`);
   burst.style.left=endLeft;burst.style.top=endTop;layer.append(burst);
   setTimeout(()=>burst.remove(),780);
  }
  onImpact();
 };
 if(reduced){setTimeout(land,duration);return;}
 projectile=one('span','',`projectileFx ${fx.variant}`);
 projectile.style.left=startLeft;projectile.style.top=startTop;layer.append(projectile);
 const sx=Math.sign(dx),sy=Math.sign(dy);
 for(let i=1;i<=steps;i++){
  let pulse=one('span','',`pathPulse ${fx.variant}`);pulse.style.left=((fx.fromX+sx*i+.5)*10)+'%';pulse.style.top=((fx.fromY+sy*i+.5)*10)+'%';
  layer.append(pulse);
  pulse.animate([{opacity:0,transform:'translate(-50%,-50%) scale(.25)'},{opacity:.95,transform:'translate(-50%,-50%) scale(1.05)',offset:.45},{opacity:0,transform:'translate(-50%,-50%) scale(1.35)'}],{duration:360,delay:Math.max(0,(i-1)*(duration/Math.max(steps,1))*0.72),easing:'ease-out',fill:'both'});
  setTimeout(()=>pulse.remove(),duration+420);
 }
 const anim=projectile.animate([{left:startLeft,top:startTop,opacity:.95,transform:'translate(-50%,-50%) scale(.72)'},{left:endLeft,top:endTop,opacity:1,transform:'translate(-50%,-50%) scale(1.04)'}],{duration,easing:'cubic-bezier(.18,.82,.24,1)',fill:'forwards'});
 anim.onfinish=land;
 setTimeout(land,duration+180);
}

function launchArcherArrow(fx,layer,onImpact=()=>{}){
 const startLeft=((fx.fromX+.5)*10)+'%',startTop=((fx.fromY+.5)*10)+'%';
 const endLeft=((fx.toX+.5)*10)+'%',endTop=((fx.toY+.5)*10)+'%';
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const steps=Math.max(Math.abs(fx.toX-fx.fromX),Math.abs(fx.toY-fx.fromY));
 const duration=reduced?90:Math.max(400,steps*245);
 playArcherAttackAudio(duration);
 let done=false,projectile=null;
 const land=()=>{
  if(done)return;done=true;projectile?.remove();
  if(!reduced){const dust=one('span','','arrowImpactFx');dust.style.left=endLeft;dust.style.top=endTop;layer.append(dust);setTimeout(()=>dust.remove(),680);}
  onImpact();
 };
 if(reduced){setTimeout(land,duration);return;}
 const angle=Math.atan2(fx.toY-fx.fromY,fx.toX-fx.fromX)*180/Math.PI;
 projectile=one('span','','archerProjectile');
 projectile.style.left=startLeft;projectile.style.top=startTop;
 projectile.style.setProperty('--arrow-angle',angle+'deg');layer.append(projectile);
 const anim=projectile.animate([
  {left:startLeft,top:startTop,opacity:.75,transform:`translate(-50%,-50%) rotate(${angle}deg) scale(.86)`},
  {left:endLeft,top:endTop,opacity:1,transform:`translate(-50%,-50%) rotate(${angle}deg) scale(1)`}
 ],{duration,easing:'linear',fill:'forwards'});
 anim.onfinish=land;setTimeout(land,duration+160);
}
// O corte segue a direção do alvo; o toque da lâmina e o dano visual coincidem.
function launchSoldierSlash(fx,layer,onImpact=()=>{}){
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const duration=reduced?90:250;
 playSoldierSwordAudio(duration);
 let done=false;
 const land=()=>{
  if(done)return;done=true;
  if(!reduced){const metal=one('span','','swordStrikeFx');metal.style.left=((fx.toX+.5)*10)+'%';metal.style.top=((fx.toY+.5)*10)+'%';layer.append(metal);setTimeout(()=>metal.remove(),540);}
  onImpact();
 };
 if(!reduced){
  const strike=one('span','','swordSlashFx');
  strike.style.left=((fx.toX+.5)*10)+'%';strike.style.top=((fx.toY+.5)*10)+'%';
  strike.style.setProperty('--slash-angle',(Math.atan2(fx.toY-fx.fromY,fx.toX-fx.fromX)*180/Math.PI-40)+'deg');
  layer.append(strike);
  strike.animate([{opacity:0,transform:'translate(-50%,-50%) rotate(var(--slash-angle)) scale(.3)'},{opacity:.96,transform:'translate(-50%,-50%) rotate(var(--slash-angle)) scale(1)',offset:.6},{opacity:0,transform:'translate(-50%,-50%) rotate(var(--slash-angle)) scale(1.25)'}],{duration:340,easing:'ease-out',fill:'forwards'}).onfinish=()=>strike.remove();
  setTimeout(()=>strike.remove(),470);
 }
 setTimeout(land,duration);
}
// Efeitos no terreno: pó nos passos e rachaduras radiais no impacto.
function showColossusRush(fx,layer){
 playColossusChargeAudio(fx.steps);
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(reduced)return;
 const dx=Math.sign(fx.toX-fx.fromX),dy=Math.sign(fx.toY-fx.fromY);
 for(let i=1;i<=fx.steps;i++){
  const x=fx.fromX+dx*i,y=fx.fromY+dy*i;
  setTimeout(()=>{
   const dust=one('span','','colossusFootfall');
   dust.style.left=((x+.5)*10)+'%';dust.style.top=((y+.5)*10)+'%';
   layer.append(dust);setTimeout(()=>dust.remove(),600);
  },110+(i-1)*185);
 }
}
function showColossusSmash(fx,layer){
 const delay=340;
 playColossusSmashAudio(delay);
 setTimeout(()=>{
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reduced){
   const shatter=one('span','','colossusGroundBreak');
   shatter.style.left=((fx.x+.5)*10)+'%';shatter.style.top=((fx.y+.5)*10)+'%';
   layer.append(shatter);setTimeout(()=>shatter.remove(),1220);
   const stage=el('board')?.closest('.board-stage');
   if(stage){stage.classList.remove('groundTremor');void stage.offsetWidth;stage.classList.add('groundTremor');setTimeout(()=>stage.classList.remove('groundTremor'),680);}
  }
 },delay);
}
function popBattle(text){const banner=el('battleAnnouncer');if(!banner||!text)return;banner.textContent=text;banner.classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>banner.classList.remove('show'),1900);}
function placeBattleRing(fx,layer){
 let dot=one('span','',`combatFx ${fx.kind}`);
 dot.style.left=((fx.x+.5)*10)+'%';dot.style.top=((fx.y+.5)*10)+'%';dot.dataset.icon=fx.label;
 layer.append(dot);setTimeout(()=>dot.remove(),850);
}
function showCharacterHitFX(layer,type,x,y){
 if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const fx=one('span','',type);fx.style.left=((x+.5)*10)+'%';fx.style.top=((y+.5)*10)+'%';
 layer.append(fx);setTimeout(()=>fx.remove(),950);
}
function showBattleFx(){
 if(!battleFx.length)return;
 let tasks=battleFx.splice(0),layer=el('board')?.querySelector('.fxLayer');if(!layer)return;
 for(const fx of tasks)if(fx.kind==='colossusRush')nextMoveSpeeds.set(String(fx.pid),110+fx.steps*185);
 const bolt=tasks.find(f=>['scoutBolt','arrowShot','swordSlash'].includes(f.kind));
 const deferred=[];
 // Os efeitos de impacto precisam aparecer junto com o acerto, não com o disparo.
 for(let fx of tasks){
  if(fx.kind==='royalMoment'){
   playRoyalMoment(fx.moment,fx.delay);
   const announcements={wound:'♛ O REI FOI FERIDO · RESTA UMA VIDA',suspense:'♛ O REI CAIU · O GUARDIÃO AINDA RESISTE',guardian:'♜ O GUARDIÃO ORIGINAL CAIU',victory:'♛ VITÓRIA · KHAR TALL'};
   setTimeout(()=>popBattle(announcements[fx.moment]),Math.max(0,fx.delay));
   continue;
  }
  if(fx.kind==='victory'){continue;}
  if(fx.kind==='wolfAttack'){
   playWolfAttackAudio();showCharacterHitFX(layer,'wolfBiteFx',fx.toX,fx.toY);
   popBattle('🐺 LOBO • UIVO');continue;
  }
  if(fx.kind==='wolfDeath'){
   if(!fx.silent)playCharacterSfx('wolfHowl',fx.delay);
   setTimeout(()=>popBattle('🐺 O UIVO DO LOBO CAÍDO'),fx.delay);
   continue;
  }
  if(fx.kind==='kingExplosion'){
   playCharacterSfx('kingBlast',120);
   setTimeout(()=>showCharacterHitFX(layer,'kingExplosionFx',fx.x,fx.y),150);
   popBattle('♛ REI • EXPLOSÃO DO GOLPE');continue;
  }
  if(fx.kind==='guardianSpell'){
   playCharacterSfx(fx.spell==='area'?'guardianArea':'guardianLine',0);
   setTimeout(()=>showCharacterHitFX(layer,'guardianSpellFx '+fx.spell,fx.toX,fx.toY),220);
   popBattle(fx.spell==='area'?'♜ GUARDIÃO • ECO ANCESTRAL':'♜ GUARDIÃO • GOLPE DA MATÉRIA');
   continue;
  }
  if(fx.kind==='colossusRush'){
   showColossusRush(fx,layer);
   popBattle('◈ COLOSSO • INVESTIDA ESTRONDOSA');
   continue;
  }
  if(fx.kind==='colossusSmash'){
   showColossusSmash(fx,layer);
   popBattle('◈ COLOSSO • ESMAGAMENTO DO CHÃO');
   continue;
  }
  if(fx.kind==='scoutBolt'){
   launchScoutBolt(fx,layer,()=>{for(let targetFX of deferred)placeBattleRing(targetFX,layer);});
   popBattle(fx.variant==='blue'?'⚡ BATEDOR • DESCARGA AZUL':'🔥 BATEDOR • CHAMA EXECUTORA');
   continue;
  }
  if(fx.kind==='arrowShot'){
   launchArcherArrow(fx,layer,()=>{for(let targetFX of deferred)placeBattleRing(targetFX,layer);});
   popBattle('➶ ARQUEIRO • FLECHA LANÇADA');
   continue;
  }
  if(fx.kind==='swordSlash'){
   launchSoldierSlash(fx,layer,()=>{for(let targetFX of deferred)placeBattleRing(targetFX,layer);});
   popBattle('⚔ SOLDADO • GOLPE DE ESPADA');
   continue;
  }
  // O dano e a marca aparecem visualmente quando o projétil chega, não antes.
  if(bolt&&['hit','magic'].includes(fx.kind)&&fx.x===bolt.toX&&fx.y===bolt.toY){deferred.push(fx);continue;}
  placeBattleRing(fx,layer);
  if(fx.kind==='trap')popBattle('⚑ ARMADILHA ATIVADA');
  else if(fx.kind==='magic')popBattle('✧ MAGIA DESENCADEADA');
 }
 if(tasks.some(f=>['hit','charge','scoutBolt','arrowShot','swordSlash','wolfAttack','kingExplosion','guardianSpell'].includes(f.kind))){
  let stage=el('board').closest('.board-stage');stage.classList.remove('battleShake');void stage.offsetWidth;stage.classList.add('battleShake');
  setTimeout(()=>stage.classList.remove('battleShake'),350);
 }
}

let nextMoveSpeeds=new Map();
function unitLocations(){let m=new Map();document.querySelectorAll('#board .unit[data-pid]').forEach(e=>m.set(e.dataset.pid,e.getBoundingClientRect()));return m;}
function animateMovement(prev){if(!prev?.size||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 requestAnimationFrame(()=>{const board=el('board'),layer=board?.querySelector('.fxLayer');if(!board||!layer)return;
  const box=board.getBoundingClientRect();
  board.querySelectorAll('.sq .unit[data-pid]').forEach(node=>{let from=prev.get(node.dataset.pid);if(!from)return;
   let to=node.getBoundingClientRect(),dx=from.left-to.left,dy=from.top-to.top;
   if(Math.abs(dx)+Math.abs(dy)<3||Math.abs(dx)>1200||Math.abs(dy)>1200)return;
   let ghost=node.cloneNode(true);ghost.removeAttribute('data-pid');ghost.style.position='absolute';ghost.style.width=to.width+'px';ghost.style.height=to.height+'px';
   ghost.style.left=(from.left-box.left)+'px';ghost.style.top=(from.top-box.top)+'px';ghost.style.pointerEvents='none';ghost.style.zIndex='10';
   node.style.visibility='hidden';layer.append(ghost);
   const moveDuration=nextMoveSpeeds.get(String(node.dataset.pid))||340;
   nextMoveSpeeds.delete(String(node.dataset.pid));
   const animation=ghost.animate([{left:(from.left-box.left)+'px',top:(from.top-box.top)+'px',opacity:1,transform:'scale(1)'},
   {left:(to.left-box.left)+'px',top:(to.top-box.top)+'px',opacity:.9,transform:'scale(1.06)'}],{duration:moveDuration,easing:'cubic-bezier(.16,.8,.28,1)',fill:'forwards'});
   animation.onfinish=()=>{ghost.remove();node.style.visibility='visible';};
   setTimeout(()=>{ghost.remove();node.style.visibility='visible';},moveDuration+180);
  });
 });
}
const el=id=>document.getElementById(id);
const htmlEscape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
let game=new KharTall(),selectedId=null,inspectedId=null,orientation='up',modal=null,picker=null,veil=false,secsLeft=60,clockEnd=0,aiTimer=null,flashUntil=0,areaChosen=[];
const one=(tag,text,cls)=>{const x=document.createElement(tag);x.textContent=text;if(cls)x.className=cls;return x;};
function save(){try{localStorage.setItem(STORE,JSON.stringify(game.snapshot()));}catch(e){}}
function clearSelection(){selectedId=null;orientation='up';picker=null;areaChosen=[];}
function beginClock(){secsLeft=60;clockEnd=Date.now()+60000;paintClock();}
function pauseClock(){if(clockEnd)secsLeft=Math.max(0,Math.ceil((clockEnd-Date.now())/1000));clockEnd=0;paintClock();}
let accountWasRunning=false;
window.addEventListener('khartall-account-open',()=>{
 accountWasRunning=!!clockEnd;
 if(accountWasRunning)pauseClock();
 clearTimeout(aiTimer);
 renderPreparation();
});
window.addEventListener('khartall-account-close',()=>{
 if(accountWasRunning&&game.s.phase!=='over'&&!veil&&!modal&&secsLeft>0){clockEnd=Date.now()+secsLeft*1000;paintClock();}
 accountWasRunning=false;
 renderPreparation();
 if(isAI())scheduleAI();
});
function paintClock(){const total=Math.max(0,Math.min(60,secsLeft));el('timer').textContent=`${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;el('timer').classList.toggle('urgent',total<=10);el('clockFill').style.width=(total/60*100)+'%';}
function isHumanTurn(){return game.s.phase==='setup'?game.s.mode==='local'||game.s.setupSide===RED:game.s.mode==='local'||game.s.side===RED;}
function isAI(){return !informationalClockPaused&&!document.body.classList.contains('accountOpen')&&game.s.phase==='play'&&game.s.mode==='ai'&&game.s.side===BLUE&&!veil;}
function currentSide(){return game.s.phase==='setup'?game.s.setupSide:game.s.side;}
function isInputBlocked(){return document.body.classList.contains('accountOpen')||veil||!!modal||!isHumanTurn();}
let informationalClockPaused=false;
function isInformationalModal(m){return !!m&&(m.visual==='tutorial'||m.visual==='codex'||m.visual==='detail'||m.title?.startsWith('Regras — capítulo')||m.title?.startsWith('Manual de campo'));}
function showModal({title,intro,choices,footer=[],extra=null,locked=false,visual=null,unit=null,tutorialStep=0,tutorialTotal=0,tutorialData=null}){
 const next={title,intro,choices,footer,extra,locked,visual,unit,tutorialStep,tutorialTotal,tutorialData};
 if(!informationalClockPaused && isInformationalModal(next) && clockEnd){pauseClock();informationalClockPaused=true;clearTimeout(aiTimer);}
 modal=next;paintModal();
}
function dismissModal(){
 modal=null;paintModal();
 if(informationalClockPaused){
  informationalClockPaused=false;
  if(!veil && !document.body.classList.contains('accountOpen') && game.s.phase!=='over' && secsLeft>0){clockEnd=Date.now()+secsLeft*1000;paintClock();}
  if(isAI())scheduleAI();
 }
}
function renderPreparation(){const s=game.s;gameUI.preparation({active:s.phase==='setup'&&!isInputBlocked(),key:s.setupSide,count:s.traps.filter(t=>t.side===s.setupSide).length,side:sideName(s.setupSide)});}
function paintModal(){const root=el('modalRoot');root.replaceChildren();renderPreparation();if(!modal&&!veil)return;
 const backdrop=one('div','', 'modalCover');let box=one('div','', 'modalPanel');
 if(modal?.visual==='start')box.classList.add('startHero');
 if(modal?.visual==='codex')box.classList.add('codexModal');
 if(modal?.visual==='tutorial')box.classList.add('tutorialModal');
 if(veil){box.append(one('div','KHAR TALL • TROCA SEGURA','pane-eyebrow'),one('h2','Passe o dispositivo ao próximo jogador'),one('p',veil.text));
  let btn=one('button','Estou pronto para jogar','actionBtn primary');btn.onclick=()=>{veil=false;beginClock();render();scheduleAI();};box.append(btn);
 }else{
  box.append(one('h2',modal.title));if(modal.intro)box.append(one('p',modal.intro));
  if(modal.extra){const extra=one('div','', 'setupGuide');extra.textContent=modal.extra;box.append(extra);}
  if(modal.visual==='tutorial'){
   const provenance=one('div','', 'tutorialBookCredit');
   provenance.append(one('span','✦ KHAR TALL · ORIGEM LITERÁRIA','tutorialBookKicker'));
   provenance.append(one('p','Jogo criado com base no livro Ecos da Chama: O Último Victorino.','tutorialBookLine'));
   provenance.append(one('blockquote','“A chama está viva.”','tutorialBookQuote'));
   box.append(provenance);
   const current=(modal.tutorialStep||0)+1,total=(modal.tutorialTotal||10);
   const progress=one('div','', 'tutorialProgress');progress.setAttribute('aria-label',`Etapa ${current} de ${total}`);
   for(let i=0;i<total;i++)progress.append(one('span','','tutorialDot'+(i<current?' passed':'')));
   box.append(progress);
   if(modal.tutorialData){
    const page=modal.tutorialData,wrap=one('div','', 'tutorialVisualWrap');
    if(page.image){
      const zoom=one('button','Ampliar ilustração','actionBtn tutorialZoomButton');zoom.type='button';zoom.setAttribute('aria-pressed','false');
      const img=one('img','', 'tutorialVisualImg');img.loading='eager';img.decoding='async';img.src=page.image;img.alt=page.alt||modal.title;
      zoom.onclick=()=>{const expanded=img.classList.toggle('expanded');zoom.textContent=expanded?'Reduzir ilustração':'Ampliar ilustração';zoom.setAttribute('aria-pressed',String(expanded));};
      wrap.append(zoom,img);
    }
    if(page.summary)wrap.append(one('p',page.summary,'tutorialSummary'));
    if(page.points?.length){const ul=one('ul','', 'tutorialBullets');
     for(const pt of page.points){const li=one('li','');li.append(one('strong',pt.label+': '),document.createTextNode(pt.text));ul.append(li);}
     wrap.append(ul);
    }
    if(page.tip)wrap.append(one('p','Dica estratégica: '+page.tip,'tutorialTip'));
    wrap.append(one('small','Ilustração temática. Em caso de diferença nos esquemas visuais, considere as regras escritas deste tutorial e as casas permitidas pelo jogo.','tutorialAccuracy'));
    box.append(wrap);
   }
  }
  if(modal.visual==='start'){
   const strip=one('div','', 'startGallery');for(let type of ['king','guardian','colossus','wolf','scout','soldier','archer']){let im=one('img','');im.src=TOKEN_ART[type];im.alt=NAMES[type];strip.append(im);}box.append(strip);
  }
  if(modal.visual==='codex'){
   const gallery=one('div','', 'codexGrid');for(let type of ['king','guardian','colossus','wolf','scout','soldier','archer']){
    let card=one('button','', 'codexCard'),img=one('img','');img.src=ART[type];img.alt=NAMES[type];card.append(img);
    card.append(one('strong',NAMES[type]));card.append(one('small',{king:'2 vidas · Cópia Real',guardian:'Área e linha · Guardião original',colossus:'Investida e Esmagamento',wolf:'Salto 3×2 · Resgate',scout:'Magia em V · Marcação',soldier:'Ataque + · Evolui',archer:'Ataque X · Alcance 2'}[type]));card.onclick=()=>openCodexDetail(type);gallery.append(card);
   }box.append(gallery);
  }
  if(modal.visual==='detail'&&modal.unit){let display=one('div','', 'codexDetail'),img=one('img','');img.src=ART[modal.unit];img.alt='Ilustração original do '+NAMES[modal.unit];
   display.append(img);display.append(one('p',selectionHelp({type:modal.unit})));box.append(display);
  }
  let options=one('div','', 'modalButtons');for(const c of modal.choices||[]){let b=one('button','',`modalOption ${c.highlight?'active':''}`);b.innerHTML=`<strong>${htmlEscape(c.label)}</strong>${c.desc?`<small>${htmlEscape(c.desc)}</small>`:''}`;b.onclick=c.fn;options.append(b);}box.append(options);
  if(modal.footer.length){let group=one('div','', 'modalFooter');for(const c of modal.footer){let b=one('button',c.label,`actionBtn ${c.primary?'primary':''}`);b.onclick=c.fn;group.append(b);}box.append(group);}
 }
 backdrop.append(box);root.append(backdrop);
 }
function cover(text){veil={text};pauseClock();paintModal();}
function fresh(mode='local',difficulty=3){clearTimeout(aiTimer);informationalClockPaused=false;game=new KharTall({mode,difficulty});clearSelection();inspectedId=null;dismissModal();veil=false;save();beginClock();render();}
const TUTORIAL_ART={
 focus:'assets/tutorial_focus.webp',
 light:'assets/tutorial_light.webp',
 heavy:'assets/tutorial_heavy.webp',
 soldier:'assets/tutorial_soldier.webp',
 archer:'assets/tutorial_archer.webp',
 scout:'assets/tutorial_scout.webp',
 wolf:'assets/tutorial_wolf.webp',
 colossus:'assets/tutorial_colossus.webp',
 guardian:'assets/tutorial_guardian.webp',
 king:'assets/tutorial_king.webp',
};
// Tutorial visual de Ecos da Chama; não modifica o motor da partida.
function showTutorial(step=0,fromStart=false){
 const entries=[
 {title:'O objetivo da guerra',image:TUTORIAL_ART.focus,alt:'Visão geral e objetivo tático do Khar Tall',intro:'Khar Tall é uma disputa estratégica do universo de Ecos da Chama.',summary:'A vitória exige eliminar o Rei adversário e seu Guardião original. Se o Rei morrer primeiro, o atacante dispõe de três turnos para derrubar o Guardião, ou a partida termina empatada.',points:[{label:'Tabuleiro',text:'10 × 10 casas; dois exércitos de 16 peças iniciais.'},{label:'Turnos',text:'Uma ação por turno, salvo exceções especiais descritas nas habilidades.'},{label:'Terreno',text:'Cristais, Campos de Cura e armadilhas exigem controle de espaço, não apenas combate.'}],tip:'Planeje a proteção do Rei e do Guardião original juntos.'},
 {title:'O posicionamento decide',image:TUTORIAL_ART.light,alt:'Guia ilustrado das peças leves',intro:'As unidades leves abrem caminhos e punem exposições.',summary:'Soldados, Arqueiros, Batedores e Lobos têm funções diferentes: proteção próxima, pressão diagonal, marcação e flanqueamento.',points:[{label:'Soldado',text:'Ataque próximo em +.'},{label:'Arqueiro',text:'Ataque diagonal em X, a até duas casas, com caminho livre.'},{label:'Batedor',text:'Marca, paralisa e executa alvos marcados.'},{label:'Lobo',text:'Salta em L para surpreender e pode resgatar o Rei.'}],tip:'Antes de atacar, verifique quais casas ficarão desprotegidas.'},
 {title:'As unidades decisivas',image:TUTORIAL_ART.heavy,alt:'Guia ilustrado do Colosso Guardião e Rei',intro:'As peças pesadas comandam a ruptura e a defesa final.',summary:'O Colosso quebra formações; o Guardião controla linhas e áreas; o Rei pode contra-atacar com habilidades copiadas e resiste a dois golpes.',points:[{label:'Colosso',text:'Investida exatamente três casas em +; depois pode realizar Esmagamento em torno do destino.'},{label:'Guardião',text:'Move em linha nas oito direções, ataca até três alvos próximos ou o primeiro alvo em uma linha cardinal.'},{label:'Rei',text:'Move e ataca até duas casas em linha nas oito direções. Possui duas vidas e Cópia Real.'}],tip:'Não exponha o Guardião original em uma troca de pouco valor.'},
 {title:'Aprendiz Soldado',image:TUTORIAL_ART.soldier,alt:'Ficha visual do Aprendiz Soldado',intro:'Peça de proteção e pressão próxima.',summary:'Move uma casa em qualquer direção e ataca uma casa nas quatro direções cardinais, inclusive para trás.',points:[{label:'Movimento',text:'1 casa em qualquer uma das 8 direções.'},{label:'Ataque',text:'1 casa em +: acima, abaixo, esquerda ou direita.'},{label:'Evolução',text:'Ao chegar a um Campo de Cura inimigo ativo, transforma-se em Colosso.'}],tip:'Use os Soldados para bloquear rotas sem abandonar o apoio às outras peças.'},
 {title:'Aprendiz Arqueiro',image:TUTORIAL_ART.archer,alt:'Ficha visual do Aprendiz Arqueiro',intro:'Sua vantagem sobre o Soldado é a distância de ataque.',summary:'O Arqueiro anda uma casa, mas pode atacar até duas casas nas diagonais, sem atravessar peças aliadas ou inimigas.',points:[{label:'Movimento',text:'1 casa em qualquer direção.'},{label:'Ataque',text:'1 ou 2 casas em X, nas quatro diagonais, inclusive para trás.'},{label:'Bloqueio',text:'Uma peça na primeira casa diagonal impede atingir outra atrás dela.'},{label:'Evolução',text:'No Campo de Cura inimigo ativo, evolui para Batedor.'}],tip:'A ameaça do Arqueiro depende das diagonais livres.'},
 {title:'Batedor',image:TUTORIAL_ART.scout,alt:'Ficha visual do Batedor e sua magia',intro:'Controle mágico por marcação e execução.',summary:'O primeiro ataque marca e paralisa por um turno sem causar dano. Ataques posteriores podem executar alvos já marcados por um Batedor aliado.',points:[{label:'Movimento',text:'1 casa em qualquer direção.'},{label:'Ataque',text:'V mágico orientável para cima, baixo, esquerda ou direita, alcançando até 4 casas nas diagonais do V.'},{label:'Marca',text:'Permanece por 2 turnos do alvo. Batedores aliados compartilham a marca.'},{label:'Rei',text:'Cada execução válida causa somente 1 ponto de dano ao Rei.'}],tip:'Marque primeiro as peças cuja mobilidade seu oponente mais precisa.'},
 {title:'Lobo',image:TUTORIAL_ART.wolf,alt:'Ficha visual do Lobo e seu salto',intro:'Flanqueamento e resgate em movimento.',summary:'O Lobo salta sobre outras unidades. Seu deslocamento em L é de 3 casas por um eixo e 2 pelo outro, em qualquer orientação.',points:[{label:'Salto',text:'3 × 2 ou 2 × 3 casas em L, podendo superar unidades intermediárias.'},{label:'Ataque',text:'Acerta uma peça inimiga onde pousa e precisa ficar parado no turno seguinte.'},{label:'Reposicionamento',text:'Se pousar em casa vazia, não precisa repousar.'},{label:'Resgate',text:'Pode trocar de posição com o Rei conforme as regras de Resgate Real.'}],tip:'Ataques de Lobo cobram um turno de exposição: escolha um destino seguro.'},
 {title:'Colosso',image:TUTORIAL_ART.colossus,alt:'Ficha visual do Colosso e Esmagamento',intro:'Destruição em linha e domínio de área.',summary:'A Investida avança exatamente três casas em linha cardinal, atacando inimigos no trajeto. É interrompida por armadilhas e não atravessa aliados.',points:[{label:'Movimento comum',text:'1 casa em qualquer uma das 8 direções.'},{label:'Investida',text:'Exatamente 3 casas em +, com dano nas casas percorridas; exige um alvo, salvo exceção de campo mágico para Rei ferido.'},{label:'Esmagamento',text:'No próximo turno, pode andar 1 casa e atacar todas as peças inimigas adjacentes em 8 direções.'},{label:'Resgate',text:'Pode trocar de lugar com o Rei se cumprir a distância cardinal exigida.'}],tip:'Prepare a casa de chegada antes de iniciar a Investida.'},
 {title:'Guardião',image:TUTORIAL_ART.guardian,alt:'Ficha visual do Guardião em Khar Tall',intro:'Controle de campo e proteção decisiva.',summary:'O Guardião original é essencial para a vitória, mesmo quando surgem Guardiões adicionais por transformação.',points:[{label:'Movimento',text:'Qualquer distância nas 8 direções, sem atravessar unidades.'},{label:'Ataque em área',text:'Até 3 inimigos num raio de 3 casas, respeitando bloqueios.'},{label:'Ataque em linha',text:'Horizontal ou vertical até a borda, acertando somente o primeiro inimigo.'},{label:'Original',text:'Não pode ser transformado. Só pode ser sacrificado para curar um Rei vivo e ferido.'}],tip:'A sobrevivência do Guardião original pode garantir um empate.'},
 {title:'Rei e a condição de vitória',image:TUTORIAL_ART.king,alt:'Ficha visual do Rei e Cópia Real',intro:'A peça central da guerra: poderosa, mas vulnerável.',summary:'O Rei possui duas vidas e pode atacar em oito direções. Ao receber um ataque válido, copia a técnica e pode usá-la uma vez em seu próximo turno.',points:[{label:'Movimento e ataque',text:'1 ou 2 casas, em linha, nas 8 direções.'},{label:'Vida',text:'2 pontos de vida; ataques do Batedor que apenas marcam não causam dano.'},{label:'Cópia Real',text:'Pode usar a habilidade copiada uma vez no turno seguinte; uma nova cópia substitui a anterior.'},{label:'Reação Real',text:'O Rei pode se defender ou contra-atacar com uma habilidade copiada, consumindo sua ação de reação.'}],tip:'Se o Rei for eliminado e o Guardião original ainda viver, começa a contagem final de três turnos do atacante.'}
 ];
 step=Math.max(0,Math.min(entries.length-1,step));
 const current=entries[step],footer=[];
 if(step)footer.push({label:'← Anterior',fn:()=>showTutorial(step-1,fromStart)});
 if(step<entries.length-1)footer.push({label:'Próximo →',primary:true,fn:()=>showTutorial(step+1,fromStart)});
 else footer.push({label:'Concluir tutorial',primary:true,fn:()=>{if(fromStart)openStart();else dismissModal();}});
 footer.push({label:'Fechar',fn:fromStart?openStart:dismissModal});
 showModal({title:`Tutorial ${step+1}/${entries.length} · ${current.title}`,intro:current.intro,visual:'tutorial',tutorialStep:step,tutorialTotal:entries.length,tutorialData:current,choices:[],footer});
}
function openCodex(){showModal({title:'Compêndio visual de Khar Tall',intro:'As sete peças do exército, utilizando as ilustrações originais do projeto. Toque em uma para consultar sua função e seus poderes.',visual:'codex',choices:[],footer:[{label:'Voltar à batalha',fn:dismissModal}]});}
function openCodexDetail(type){
 const samples=type==='king'?[
  {label:'💥 Ouvir ataque próprio · explosão',desc:'Um estrondo de impacto, diferente das habilidades copiadas.',fn:()=>{if(!prefs.sound){prefs.sound=true;savePrefs();applyPrefs();}playCharacterSfx('kingBlast');}},
  {label:'♛ Ouvir Rei ferido · Tam Tam Taaam',desc:'Três toques sombrios e graves quando o Rei perde sua primeira vida.',fn:()=>{if(!prefs.sound){prefs.sound=true;savePrefs();applyPrefs();}playRoyalMoment('wound');}},
  {label:'☾ Ouvir Rei morto · Suspense sufocante',desc:'O Rei caiu, mas o Guardião original mantém viva a resistência por três rodadas.',fn:()=>{if(!prefs.sound){prefs.sound=true;savePrefs();applyPrefs();}playRoyalMoment('suspense');}},
  {label:'⚑ Ouvir fanfarra de vitória',desc:'Várias trompetas e marcha militar breve, mais baixa no fundo.',fn:()=>{if(!prefs.sound){prefs.sound=true;savePrefs();applyPrefs();}playRoyalMoment('victory');}}
 ]:type==='guardian'?[
  {label:'◈ Ouvir magia ancestral em área',desc:'Uma onda grave, vibração da matéria e ressonância antiga.',fn:()=>{if(!prefs.sound){prefs.sound=true;savePrefs();applyPrefs();}playCharacterSfx('guardianArea');}},
  {label:'◇ Ouvir ataque mágico em linha',desc:'Uma ventania mágica forte, com ar em movimento e um eco discreto.',fn:()=>{if(!prefs.sound){prefs.sound=true;savePrefs();applyPrefs();}playCharacterSfx('guardianLine');}},
  {label:'♜ Ouvir queda do Guardião original',desc:'Uma trombeta de aviso anuncia a perda do Guardião original.',fn:()=>{if(!prefs.sound){prefs.sound=true;savePrefs();applyPrefs();}playRoyalMoment('guardian');}}
 ]:type==='wolf'?[
  {label:'🐺 Ouvir ataque · uivo real',desc:'Um trecho curto de uma gravação real de lobos uivando.',fn:()=>{if(!prefs.sound){prefs.sound=true;savePrefs();applyPrefs();}playWolfAttackAudio();}},
  {label:'☾ Ouvir morte · uivo real',desc:'O mesmo uivo natural quando o Lobo é eliminado em combate.',fn:()=>{if(!prefs.sound){prefs.sound=true;savePrefs();applyPrefs();}playCharacterSfx('wolfHowl');}}
 ]:type==='colossus'?[
  {label:'◈ Ouvir Investida • 3 passos',desc:'Três pisadas rápidas, pesadas e estrondosas. Não toca na movimentação comum.',fn:()=>{if(!prefs.sound){prefs.sound=true;savePrefs();applyPrefs();}playColossusChargeAudio(3);}},
  {label:'⛰ Ouvir Esmagamento • solo quebrando',desc:'Um golpe brutal no chão seguido por fissuras, fragmentos e pedras se partindo.',fn:()=>{if(!prefs.sound){prefs.sound=true;savePrefs();applyPrefs();}playColossusSmashAudio(120);}}
 ]:type==='soldier'?[
  {label:'⚔ Ouvir corte de espada',desc:'Lâmina cortando o ar, seguida de uma batida nítida entre lâminas de metal.',fn:()=>{if(!prefs.sound){prefs.sound=true;savePrefs();applyPrefs();}playSoldierSwordAudio(280);}}
 ]:type==='archer'?[
  {label:'➶ Ouvir flecha sendo disparada',desc:'Corda do arco, flecha cortando o ar e impacto no alvo.',fn:()=>{if(!prefs.sound){prefs.sound=true;savePrefs();applyPrefs();}playArcherAttackAudio(490);}}
 ]:type==='scout'?[
  {label:'⚡ Testar 1º ataque · raios',desc:'Raio caindo com trovão; no alvo, chiado eletrostático.',fn:()=>{if(!prefs.sound){prefs.sound=true;savePrefs();applyPrefs();}playScoutAttackAudio('blue',520);}},
  {label:'🔥 Testar 2º ataque · fogo',desc:'Rajada de chamas seguida por explosão no alvo.',fn:()=>{if(!prefs.sound){prefs.sound=true;savePrefs();applyPrefs();}playScoutAttackAudio('red',520);}}
 ]:[];
 showModal({title:NAMES[type]+' • Compêndio',intro:type==='king'?'Ataque próprio explosivo, sons de habilidades copiadas e momentos decisivos.' :type==='guardian'?'Ataques de magia ancestral e trompeta de queda do Guardião original.':type==='scout'?'Arte original, regras e prévia dos efeitos sonoros do Batedor.':type==='archer'?'Arte, alcance de duas casas e teste de som da flecha.':type==='soldier'?'Arte do Aprendiz Soldado, ataque em cruz e som do corte de espada.':type==='colossus'?'Arte e prévias dos passos da Investida e do Esmagamento do Colosso.':type==='wolf'?'Uivo de uma gravação real, compartilhado por todos os Lobos e pela cópia do Rei.':'Arte original e regras de combate da unidade.',visual:'detail',unit:type,choices:samples,footer:[{label:'Voltar à galeria',fn:openCodex},{label:'Fechar',fn:dismissModal}]});
}
function openScoutAudioDemo(){
 primeScoutWavs();
 showModal({title:'⚡🔥 Sons do Batedor',intro:'O primeiro ataque desce como um raio com trovão e termina em eletrostática. O segundo continua com fogo e explosão.',choices:[
  {label:'⚡ Ouvir primeiro ataque • Raios azuis',desc:'Estalo de raio e trovão; na chegada, crepitação eletrostática.',fn:()=>{if(!prefs.sound){prefs.sound=true;savePrefs();applyPrefs();}playScoutAttackAudio('blue',540);}},
  {label:'🔥 Ouvir segundo ataque • Fogo vermelho',desc:'Chamas em movimento e explosão no impacto.',fn:()=>{if(!prefs.sound){prefs.sound=true;savePrefs();applyPrefs();}playScoutAttackAudio('red',540);}}
 ],footer:[{label:'Voltar',fn:openStart}]});
}
function openRoyalAudioDemo(){
 primeScoutWavs();
 const listen=kind=>{if(!prefs.sound){prefs.sound=true;savePrefs();applyPrefs();}playRoyalMoment(kind);};
 showModal({title:'♛ Momentos da Realeza · Ecos da Chama',intro:'Ouça os quatro efeitos que sinalizam vidas perdidas, suspense, queda do Guardião original e vitória.',choices:[
  {label:'♛ Rei perde a primeira vida',desc:'Tam, tam, taaam em tom medieval sombrio.',fn:()=>listen('wound')},
  {label:'☾ Rei morre, Guardião original sobrevive',desc:'Suspense opressivo e sufocante; a perseguição ainda não terminou.',fn:()=>listen('suspense')},
  {label:'♜ Guardião original eliminado',desc:'Uma trombeta de aviso, com toque militar de alerta.',fn:()=>listen('guardian')},
  {label:'⚑ Vitória conquistada',desc:'Várias trompetas com passos de marcha mais baixos e mais curtos.',fn:()=>listen('victory')}
 ],footer:[{label:'Voltar',fn:openStart}]});
}
function openStart(){showModal({title:'Khar Tall · Ecos da Chama',intro:'Jogo de estratégia criado com base no livro Ecos da Chama: O Último Victorino. Entre no tabuleiro de guerra: 10×10, 16 peças por exército, magia antiga, armadilhas e Reação Real.',visual:'start',
 choices:[{label:'⚔ Dois jogadores • mesmo dispositivo',desc:'Revezamento com tela de privacidade para esconder armadilhas.',fn:()=>fresh('local',3)},
 {label:'♛ Jogar contra o computador',desc:'Cinco níveis de dificuldade, sem conexão com a internet.',fn:openDifficulty}],
 footer:[{label:'✦ Criar conta',primary:true,fn:()=>el('accountButton').click()},{label:'♛ Ouvir sons do Rei e da vitória',fn:openRoyalAudioDemo},{label:'⚡🔥 Testar sons do Batedor',fn:openScoutAudioDemo},{label:'Tutorial inspirado no livro',fn:()=>showTutorial(0,true)},{label:'Manual de regras',fn:()=>showRules()}]});}
function openDifficulty(){showModal({title:'Escolha a dificuldade da IA',intro:'Os cinco níveis obedecem às mesmas regras. A diferença está na avaliação estratégica das jogadas.',choices:
 [1,2,3,4,5].map((n)=>({label:`${n} • ${['Iniciante','Fácil','Normal','Difícil','Mestre'][n-1]}`,desc:['Movimentos pouco planejados','Preferências simples com imprevisibilidade','Avalia capturas e posições','Analisa ameaças e proteção do Rei','Compara respostas prováveis do adversário'][n-1],fn:()=>fresh('ai',n)})),footer:[{label:'Voltar',fn:openStart}]});}
function finishSetup(){const previous=game.s.setupSide;game.finishSetup();clearSelection();save();render();if(game.s.phase==='setup'&&game.s.mode==='local'&&previous===RED){cover('Agora é a vez dos Azuis posicionarem até duas armadilhas. As posições dos Rubros permanecerão ocultas. O cronômetro de 60 segundos só começa quando o próximo jogador confirmar.');}
 else if(game.s.phase==='play'&&game.s.mode==='local'){cover('O sorteio escolheu '+sideName(game.s.side)+' para começar. Entregue o dispositivo ao jogador certo. Ao confirmar, a batalha começa imediatamente.');}
 else if(game.s.phase==='play'){beginClock();scheduleAI();}
 else{beginClock();scheduleAI();}}
function postChange(sideBefore,turnBefore){save();clearSelection();if(game.s.flash)flashUntil=Date.now()+1000;
 const switched=game.s.phase==='play'&&game.s.turnSerial!==turnBefore;render();
 if(game.s.fieldPending){openField();return;}
 if(game.s.phase==='over'){pauseClock();showGameOver();return;}
 if(switched){if(game.s.mode==='local')cover(`É a vez dos ${sideName(game.s.side)}. Escondemos a posição das armadilhas do outro jogador. Pressione o botão quando o aparelho estiver nas mãos certas.`);
 else{beginClock();scheduleAI();}}
 else if(isAI())scheduleAI();
 }
function afterAction(a){if(!game||game.s.phase!=='play')return;let beforeSide=game.s.side,beforeTurn=game.s.turnSerial,visual=captureBattle();
 const ok=game.act(a);if(ok)noteBattleFx(visual,a);if(!ok){el('notice').textContent='Ação inválida para esta situação. Selecione outra opção.';render();return;}
 dismissModal();postChange(beforeSide,beforeTurn);
 }
function applyField(choice){let old=game.s.turnSerial,wasSide=game.s.side,visual=captureBattle();
 if(!game.fieldChoice(choice)){el('notice').textContent='Escolha de campo inválida. Tente novamente.';return;}
 picker=null;dismissModal();noteBattleFx(visual,null);if(choice.kind!=='skip')sound('heal');postChange(wasSide,old);
 }
function openField(){let f=game.s.fields.find(f=>f.id===game.s.fieldPending?.fieldId),p=game.piece(game.s.fieldPending?.pid);
 if(!p||!f)return;
 let choices=game.fieldOptions(p).map(o=>({label:o.label,desc:o.kind==='summon'?'Escolha tipo e uma casa vizinha vazia.':o.kind==='reunion'?'Escolha qual aliado será transportado e a casa de chegada.':'Ativação imediata; recarga de 3 rodadas completas.',fn:()=>{
   if(o.kind==='summon')showSummonTypes(p);else if(o.kind==='transform')showTransformTypes(p);else if(o.kind==='reunion')startReunion(p);else applyField(o);
 }}));
 showModal({title:f.kind==='heal'?'✚ Campo de Cura inimigo':'◆ Cristal inimigo',intro:`${NAMES[p.type]} chegou ao campo ativo em ${square(p.x,p.y)}. Escolha um efeito; apenas um poderá ser ativado.`,choices,footer:[{label:'Não utilizar o campo',fn:()=>applyField({kind:'skip'})}]});
 }
function showSummonTypes(p){showModal({title:'Invocar Aprendiz',intro:'Escolha o tipo. Depois toque em uma casa livre adjacente ao Cristal.',choices:[
 {label:'⚔ Aprendiz Soldado',fn:()=>chooseSummon(p,'soldier')},
 {label:'➶ Aprendiz Arqueiro',fn:()=>chooseSummon(p,'archer')}],footer:[{label:'Voltar',fn:openField}]});}
function chooseSummon(p,type){picker={kind:'summon',pid:p.id,type};dismissModal();render();el('notice').textContent=`Escolha uma casa verde adjacente ao Cristal para invocar ${NAMES[type]}.`;
}
function showTransformTypes(p){showModal({title:'Transformação pelo Cristal',intro:`Sacrifique ${NAMES[p.type]} e crie outra peça na mesma casa. O Rei e o Guardião original não podem ser transformados.`,choices:
 ['soldier','archer','colossus','wolf','scout','guardian'].map(type=>({label:NAMES[type],desc:type===p.type?'Renova a peça como uma nova unidade desse tipo.':'Transformação na mesma casa.',fn:()=>applyField({kind:'transform',type})})),footer:[{label:'Voltar',fn:openField}]});}
function startReunion(p){picker={kind:'reunionAlly',pid:p.id};dismissModal();render();el('notice').textContent='Reunião: toque na peça aliada que será teletransportada (o Rei também pode ser escolhido).';}
function optionsAt(x,y){if(picker)return [];
 if(!selectedId)return [];return game.actionsFor(selectedId,orientation).filter(o=>o.x===x&&o.y===y);
}
function boardClick(x,y){
 // Mesmo uma peça inimiga, paralisada ou de um turno controlado pela IA pode
 // ser consultada; nenhuma informação secreta do adversário é revelada.
 if(veil||modal||document.body.classList.contains('accountOpen'))return;
 const s=game.s,p=game.pieceAt(x,y);
 if(p)inspectedId=p.id;
 if(!isHumanTurn()||s.phase==='over'){if(p)renderBoardNotice();return;}
 if(s.phase==='setup'){
  if(p){renderBoardNotice();return;}
  inspectedId=null;if(game.placeTrap(s.setupSide,x,y)){audioPlayer.ui('place');save();render();}return;
 }
 if(s.phase!=='play')return;
 if(picker){handlePicker(x,y);return;}
 const actions=optionsAt(x,y);if(actions.length){
  if(actions.length===1)onActionClicked(actions[0]);
  else showModal({title:'Escolha o ataque',intro:'Há mais de uma habilidade válida contra essa casa.',choices:actions.map(a=>({label:actionLabel(a),fn:()=>{dismissModal();onActionClicked(a);}})),footer:[{label:'Cancelar',fn:dismissModal}]});
  return;
 }
 if(p){audioPlayer.ui('tap');if(p.side===s.side){selectedId=p.id;orientation='up';}else clearSelection();render();return;}
 inspectedId=null;clearSelection();render();
}
function actionLabel(a){return {move:'Mover',hit:'Ataque normal',charge:'Investida do Colosso',fieldCharge:'Investida para campo mágico',smash:'Esmagamento',rescue:'Resgate Real',wolfHit:'Salto de ataque',area:'Ataque em área (até 3 alvos)',line:'Ataque em linha',mark:'Marcar e paralisar',execute:'Executar marca',copyMove:'Usar salto copiado',copyWolfHit:'Ataque copiado do Lobo',copyCharge:'Investida copiada',copyHit:'Ataque copiado',copyArea:'Ataque em área copiado',copyLine:'Ataque em linha copiado'}[a.kind]||a.kind;}
function onActionClicked(a){if(['area','copyArea'].includes(a.kind)){picker={kind:'area',action:a};areaChosen=[a.target];render();return;}
 const target=game.piece(a.target);const attacker=game.piece(a.p);
 if(['hit','copyHit'].includes(a.kind)&&target&&target.type!=='king'&&attacker){
  if(Math.max(Math.abs(attacker.x-a.x),Math.abs(attacker.y-a.y))<=(attacker.type==='king'?2:1)){
   showModal({title:'Ataque com captura',intro:`O ataque elimina ${NAMES[target.type]} em ${square(a.x,a.y)}. Você quer avançar para a casa vazia ou ficar na posição atual?`,choices:[
    {label:'Atacar e permanecer',fn:()=>afterAction({...a,advance:false})},{label:'Atacar e ocupar a casa',fn:()=>afterAction({...a,advance:true})}]});return;
  }
 }
 afterAction(a);
}
function handlePicker(x,y){const s=game.s;
 if(picker.kind==='summon'){
  const p=game.piece(picker.pid);if(!p)return;
  if(Math.max(Math.abs(p.x-x),Math.abs(p.y-y))!==1||game.pieceAt(x,y))return;
  applyField({kind:'summon',x,y,type:picker.type});return;
 }
 if(picker.kind==='reunionAlly'){
  const t=game.pieceAt(x,y);if(!t||t.side!==s.side||t.id===picker.pid)return;
  picker={kind:'reunionDest',pid:picker.pid,targetId:t.id};render();el('notice').textContent=`Reunião: escolha uma casa vazia para teletransportar ${NAMES[t.type]}.`;
  return;
 }
 if(picker.kind==='reunionDest'){
  if(game.pieceAt(x,y))return;
  applyField({kind:'reunion',targetId:picker.targetId,x,y});return;
 }
 if(picker.kind==='area'){
  const p=game.piece(picker.action.p),t=game.pieceAt(x,y);
  if(!p||!t||t.side===p.side||!game.guardianTargets(p).some(q=>q.id===t.id))return;
  if(areaChosen.includes(t.id)){if(areaChosen.length>1)areaChosen=areaChosen.filter(id=>id!==t.id);}
  else if(areaChosen.length<3)areaChosen.push(t.id);
  render();return;
 }
}
function confirmArea(){if(!picker||picker.kind!=='area')return;let a=picker.action;let targets=[...areaChosen];picker=null;areaChosen=[];afterAction({...a,targets});}
function cancelPicker(){if(!picker)return;if(game.s.fieldPending){picker=null;openField();}else{picker=null;areaChosen=[];render();}}
function currentHighlights(){const hints=new Map(),chosen=[];
 const add=(x,y,k)=>{let v=hints.get(`${x},${y}`);if(v==='attackHint')return;hints.set(`${x},${y}`,k);};
 if(game.s.phase==='setup')return {hints,chosen};
 if(picker){if(picker.kind==='area'){
   const p=game.piece(picker.action.p);if(p)for(let t of game.guardianTargets(p))add(t.x,t.y,'areaHint');
   for(let id of areaChosen){let p=game.piece(id);if(p)chosen.push(`${p.x},${p.y}`);}
  }else if(picker.kind==='summon'){
   let p=game.piece(picker.pid);if(p)for(const [dx,dy] of DIR8){let x=p.x+dx,y=p.y+dy;if(x>=0&&y>=0&&x<10&&y<10&&!game.pieceAt(x,y))add(x,y,'moveHint');}
  }else if(picker.kind==='reunionAlly')for(let p of game.s.pieces.filter(p=>p.side===game.s.side&&p.id!==picker.pid))add(p.x,p.y,'skillHint');
  else if(picker.kind==='reunionDest')for(let y=0;y<10;y++)for(let x=0;x<10;x++)if(!game.pieceAt(x,y))add(x,y,'moveHint');
  return {hints,chosen};
 }
 if(selectedId){for(let o of game.actionsFor(selectedId,orientation)){
   let k=['move','copyMove'].includes(o.kind)?'moveHint':['hit','wolfHit','line','area','mark','execute','copyHit','copyWolfHit','copyLine','copyArea'].includes(o.kind)?'attackHint':'skillHint';
   add(o.x,o.y,k);
 }}return {hints,chosen};
}
function renderBoard(){const root=el('board'),s=game.s;const {hints,chosen}=currentHighlights(),fragment=document.createDocumentFragment();
 for(let y=0;y<10;y++)for(let x=0;x<10;x++){
  const p=game.pieceAt(x,y),f=game.field(x,y),myTrap=s.traps.find(t=>t.x===x&&t.y===y&&t.side===currentSide());
  const sq=one('button','',`sq ${(x+y)%2?'dark':'light'} ${f?.kind||''} ${f?(game.fieldReady(f)?'activeField':'coolingField'):''} ${hints.get(`${x},${y}`)||''} ${selectedId===p?.id?'selected':''} ${inspectedId===p?.id?'inspected':''} ${chosen.includes(`${x},${y}`)?'targetChosen':''}`);
  if(s.flash&&s.flash.x===x&&s.flash.y===y&&Date.now()<flashUntil)sq.classList.add('trapActive');
  sq.type='button';sq.role='gridcell';sq.title=`${square(x,y)}${p?' • '+NAMES[p.type]+' • '+sideName(p.side):''}${f?' • '+(f.kind==='heal'?'Cura':'Cristal')+' dos '+sideName(f.owner):''}`;
  sq.setAttribute('aria-label',sq.title);
  if(f){sq.append(one('span',f.kind==='heal'?'✚':'◆','tileMark'));sq.append(one('span',f.kind==='heal'?'CURA':'CRISTAL','tileOwner'));}
  if(myTrap)sq.append(one('span','⚑','trapIcon'));
  if(s.phase==='setup'&&!p&&!f){sq.classList.add('setupSquare');}
  if(p){const item=one('div','',`unit ${p.side===RED?'red':'blue'} ${p.original?'original':''} ${p.mark?'marked':''} ${(p.stun||p.freeze||p.rest)?'disabled':''}`);
   item.dataset.pid=String(p.id);
   let portrait=one('span','', 'tokenPortrait'),img=one('img','', 'tokenArt');img.src=TOKEN_ART[p.type];img.alt='';img.draggable=false;portrait.append(img);item.append(portrait);
   item.append(one('span',SYMBOL[p.type],'glyph'));item.append(one('span',SHORT[p.type],'unitName'));
   if(p.type==='king')item.append(one('span',`${p.hp}♥`,'life'));
   if(p.stun||p.freeze||p.rest)item.append(one('span',p.freeze?'⚑':p.stun?'❄':'⌛','effect'));
   sq.append(item);
  }
  sq.onclick=()=>boardClick(x,y);fragment.append(sq);
 }
 root.replaceChildren(fragment);let fxLayer=one('div','', 'fxLayer');fxLayer.setAttribute('aria-hidden','true');root.append(fxLayer);
}
function renderTeams(){const s=game.s;
 for(let side of [RED,BLUE]){let k=game.king(side),original=game.guardian(side),count=s.pieces.filter(p=>p.side===side).length;
  let root=el(side===RED?'redTeam':'blueTeam');root.className=`team ${side===RED?'red':'blue'} ${currentSide()===side?'now':''}`;
  root.innerHTML=`<div class="banner">${side===RED?'⚑':'⚜'}</div><div class="words"><strong>${sideName(side)}</strong><small>${count}/20 peças · ${k?'<span class="hp">'+('♥'.repeat(k.hp))+'</span>':'Rei ✕'}</small><small>Guardião original ${original?'◆':'✕'}</small></div>`;
 }
}

// Painel de identificação no espaço de mensagens abaixo do tabuleiro.
// Inspeção é somente visual; não altera peças, ação, cronômetro nem turno.
const UNIT_GUIDE={
 king:{
  description:'Comandante do exército. É a única unidade com duas vidas.',
  move:'Até 2 casas por uma das oito direções, sem atravessar outras peças.',
  attack:'Explosão contra um inimigo a até 2 casas em linha reta ou diagonal, com caminho livre.',
  special:'Cópia Real: guarda por um turno a habilidade que recebeu e pode usá-la uma vez, inclusive na Reação Real. Pode ser resgatado por Lobo ou Colosso.'
 },
 guardian:{
  description:'Mestre de magia ancestral e defensor estratégico do reino.',
  move:'Qualquer distância em uma das oito direções, sem atravessar peças.',
  attack:'Ataque em área contra até 3 inimigos em alcance de 3 casas, ou golpe em linha horizontal/vertical até o primeiro inimigo.',
  special:'Só o Guardião original conta para a vitória. Ele não pode ser transformado e só pode ser sacrificado para curar um Rei vivo e ferido.'
 },
 colossus:{
  description:'Guerreiro de força descomunal, especialista em romper formações.',
  move:'1 casa em qualquer uma das oito direções.',
  attack:'Investida de exatamente 3 casas em linha horizontal ou vertical, atingindo inimigos ao longo do percurso.',
  special:'Depois da Investida, pode avançar 1 casa e usar Esmagamento nos inimigos ao redor. Também pode executar o Resgate Real.'
 },
 wolf:{
  description:'Fera de guerra que surpreende o inimigo com saltos longos.',
  move:'Salto em L de 3×2 ou 2×3 casas, passando sobre peças e obstáculos intermediários.',
  attack:'Morde o inimigo que estiver na casa onde pousar. Depois de atacar, deve ficar parado no próximo turno.',
  special:'Pode resgatar o Rei por troca de posição. Armadilhas só são ativadas ao pousar; se houver uma no destino de ataque, o ataque é anulado.'
 },
 scout:{
  description:'Conjurador de ataques mágicos de marcação e execução.',
  move:'1 casa em qualquer uma das oito direções.',
  attack:'Primeiro disparo azul: marca por 2 turnos e paralisa por 1. Contra alvo já marcado, o disparo vermelho executa a marca.',
  special:'Até dois ataques mágicos no mesmo turno, lançados em V orientável, com alcance de até 4 casas nas diagonais. Contra um Rei, a execução retira 1 vida.'
 },
 soldier:{
  description:'Combatente de linha de frente, armado para confrontos próximos.',
  move:'1 casa em qualquer uma das oito direções.',
  attack:'Golpe de espada contra um inimigo a 1 casa na horizontal ou vertical (+), incluindo para trás.',
  special:'Evolui imediatamente para Colosso ao alcançar um Campo de Cura inimigo ativo.'
 },
 archer:{
  description:'Combatente de longo alcance, especializado em flechas diagonais.',
  move:'1 casa em qualquer uma das oito direções.',
  attack:'Dispara flechas a 1 ou 2 casas nas quatro diagonais (X). Nenhuma flecha atravessa peças.',
  special:'Evolui imediatamente para Batedor ao alcançar um Campo de Cura inimigo ativo.'
 }
};
function renderUnitGuide(p){
 const root=el('notice'),data=UNIT_GUIDE[p.type];if(!root||!data)return;
 root.replaceChildren();root.classList.add('unitGuideActive');
 const heading=one('div','','unitGuideHead');
 const name=one('strong',`${NAMES[p.type]} · ${sideName(p.side)}`,'unitGuideTitle');
 const meta=one('span',`${square(p.x,p.y)} · ${p.type==='king'?p.hp+'/2 vidas':'1 vida'}${p.original?' · Guardião original':''}`,'unitGuideMeta');
 heading.append(name,meta);root.append(heading);
 root.append(one('p',data.description,'unitGuideIntro'));
 const sections=one('div','','unitGuideSections');
 for(const [label,value] of [['Movimento',data.move],['Ataque',data.attack],['Especial',data.special]]){
  const item=one('div','','unitGuideSection');
  item.append(one('strong',label,'unitGuideLabel'),one('span',value,'unitGuideText'));
  sections.append(item);
 }
 root.append(sections);
}
function renderBoardNotice(){
 const root=el('notice'),s=game.s;if(!root)return;
 let fallback=s.phase==='setup'?'Toque em uma casa vazia para colocar ou remover uma armadilha; toque em Confirmar quando terminar.':picker?{
  area:'Escolha até 3 alvos para o ataque em área e confirme.',summon:'Escolha uma casa verde adjacente.',reunionAlly:'Toque em uma peça aliada.',reunionDest:'Escolha uma casa vazia.'}[picker.kind]:s.fieldPending?'Escolha uma habilidade do campo mágico.':s.phase==='over'?'Use Nova partida para jogar novamente.':s.combo?'Segundo ataque mágico disponível.':'Toque em uma peça para ver sua descrição, ataque e especial.';
 const p=game.piece(inspectedId);
 if(p&&!picker&&!s.fieldPending){renderUnitGuide(p);return;}
 root.classList.remove('unitGuideActive');root.textContent=fallback;
}
function selectionHelp(p){return {
 king:'Move e ataca em até 2 casas em linha reta. 2 vidas. Copia uma habilidade recebida para uso único no próximo turno. Reação Real pode permitir contra-ataque copiado.',
 guardian:'Move livremente nas oito direções sem atravessar peças. Ataque em área: até 3 inimigos num raio de 3 casas; ataque em linha: primeiro inimigo na direção cardinal.',
 colossus:'Move 1 casa. Investida: exatamente 3 casas em +, atingindo inimigos ao longo do caminho. Depois pode mover 1 e esmagar inimigos adjacentes. Pode resgatar o Rei.',
 wolf:'Salta em L de 3×2 ou 2×3 casas em qualquer orientação. Ao atacar, fica parado no próximo turno. Só ativa armadilhas no destino. Pode resgatar o Rei.',
 scout:'Move 1 casa em qualquer direção. Ataca com magia em V orientável até 4 casas. Marca por 2 turnos, paralisa por 1 e executa alvos marcados. Pode usar 2 ataques por turno.',
 soldier:'Move 1 casa em qualquer direção e ataca uma casa em +. Evolui para Colosso ao chegar à Cura inimiga ativa.',
 archer:'Move 1 casa em qualquer direção e dispara flechas nas diagonais X até 2 casas, sem atravessar nenhuma peça. Evolui para Batedor ao chegar à Cura inimiga ativa.'
}[p.type];}
function renderSelection(){const pane=el('selectionBody'),title=el('selectionTitle'),o=el('orientation'),actions=el('selectionActions');o.innerHTML='';actions.innerHTML='';o.hidden=true;
 if(game.s.phase==='setup'){
  let cnt=game.s.traps.filter(t=>t.side===game.s.setupSide).length;
  title.textContent=`Armadilhas dos ${sideName(game.s.setupSide)}`;
  pane.innerHTML=`<div class="chips"><span class="chip">${cnt}/2 armadilhas</span><span class="chip warn">60 segundos</span></div><p>Toque numa casa vazia que não seja mágica para colocar uma armadilha. Toque na mesma casa para retirá-la. É possível mudar as posições até confirmar.</p><p>Se não colocar ambas a tempo, as restantes serão perdidas.</p>`;
  actions.append(makeActionButton(`Confirmar armadilhas (${cnt}/2)`,()=>finishSetup(),true));return;
 }
 if(picker){title.textContent={area:'Escolha até 3 alvos',summon:'Invocação',reunionAlly:'Reunião: escolha o aliado',reunionDest:'Reunião: escolha a casa'}[picker.kind]||'Escolha';
  pane.innerHTML=`<div class="editorPanel">${{area:'Marque até 3 inimigos visíveis ao Guardião (o primeiro alvo já foi escolhido).',summon:'Toque numa casa verde adjacente ao Cristal.',reunionAlly:'Toque numa peça aliada, incluindo o Rei.',reunionDest:'Toque numa casa livre do tabuleiro. Casas mágicas também são válidas.'}[picker.kind]}</div>`;
  if(picker.kind==='area')actions.append(makeActionButton(`Confirmar ataque (${areaChosen.length}/3)`,confirmArea,true));
  actions.append(makeActionButton('Cancelar escolha',cancelPicker));return;
 }
 const p=game.piece(selectedId);if(!p){title.textContent=game.s.phase==='over'?'Partida encerrada':'Selecione uma peça';pane.textContent='Toque em uma unidade do jogador ativo. Verde indica movimento, vermelho indica ataque e dourado indica uma habilidade especial.';return;}
 title.textContent=NAMES[p.type];let stat=`${sideName(p.side)} · ${square(p.x,p.y)} · ${p.type==='king'?p.hp+'/2 vidas':'1 vida'}`;
 let labels=[];if(p.original)labels.push('Guardião original');if(p.copy)labels.push('Cópia: '+(NAMES[p.copy.type]||p.copy.type));if(p.mark)labels.push('Marca: '+p.mark.n+(p.mark.n===1?' turno':' turnos'));if(p.stun)labels.push('Paralisia');if(p.freeze)labels.push('Armadilha');if(p.rest)labels.push('Em repouso');if(p.charge)labels.push('Esmagamento pronto');
 pane.innerHTML=`<div class="selectionHero"><img class="portrait" src="${ART[p.type]}" alt="Arte de ${NAMES[p.type]}"><div class="selectionMeta"><strong>${htmlEscape(stat)}</strong><div class="chips">${labels.map(z=>`<span class="chip warn">${htmlEscape(z)}</span>`).join('')||'<span class="chip">Pronto para agir</span>'}</div><div class="selectionHelp">${selectionHelp(p)}</div></div></div>`;
 if(p.type==='scout'||p.type==='king'&&p.copy?.type==='scout'){
  o.hidden=false;for(let [id,label] of [['up','V ↑'],['down','V ↓'],['left','V ←'],['right','V →']]){
   const b=makeActionButton(label,()=>{orientation=id;render();});if(orientation===id)b.classList.add('selected');o.append(b);
  }
 }
 const n=game.actionsFor(p.id,orientation).length;actions.append(one('span',`${n} ${n===1?'opção legal':'opções legais'} nesta posição.`,'chip'));
 if(game.s.combo)actions.append(makeActionButton('Encerrar após 1º ataque',()=>passTurn('Batedor dispensou seu segundo ataque.')));
}
function makeActionButton(label,cb,primary=false){const b=one('button',label,`actionBtn ${primary?'primary':''}`);b.onclick=cb;return b;}
function renderObjectives(){const root=el('objectives'),s=game.s;root.innerHTML='';
 for(let side of [RED,BLUE]){const wrap=one('div','', 'statLine'),k=game.king(side),g=game.guardian(side);
  const traps=s.traps.filter(t=>t.side===side).length;
  wrap.innerHTML=`<div class="statRow"><strong>${sideName(side)}</strong><span>Rei ${k?k.hp+'/2':'✕'} · Original ${g?'VIVO':'✕'}</span></div><div class="sub">${s.pieces.filter(p=>p.side===side).length} peças em combate · ${side===currentSide()?traps+' armadilha(s) própria(s)':'Armadilhas secretas'}</div>`;
  root.append(wrap);
 }
 for(let f of s.fields){let remaining=Math.max(...f.need.map((n,i)=>Math.max(0,n-s.turns[i])));
  const box=one('div','', 'statLine');box.innerHTML=`<div class="statRow"><span>${f.kind==='heal'?'✚ Cura':'◆ Cristal'} ${square(f.x,f.y)}</span><strong>${remaining?'Recarga':'Ativo'}</strong></div><div class="sub">Campo dos ${sideName(f.owner)} ${remaining?'· aguardando turnos completos de ambos os lados':''}</div>`;root.append(box);
 }
 if(s.deadline)for(let [side,data] of Object.entries(s.deadline))if(data){let box=one('div',`⚠ Rei dos ${sideName(+side)} eliminado. ${data.left===1?'Resta 1 turno':'Restam '+data.left+' turnos'} ao adversário para derrotar o Guardião original.`,'statLine');root.prepend(box);}
}
function render(){let prev=unitLocations();renderTeams();renderBoard();animateMovement(prev);showBattleFx();renderSelection();renderObjectives();const s=game.s;
 el('log').innerHTML=s.logs.slice(0,14).map(x=>`<div class="logentry">${htmlEscape(x.msg)}</div>`).join('');
 let phase=s.phase==='setup'?'PREPARAÇÃO':s.phase==='over'?'FIM DE JOGO':s.reaction?'REAÇÃO REAL':s.combo?'2º ATAQUE':'TURNO';
 el('phaseText').textContent=phase;
 let msg='';if(s.phase==='setup')msg=`Armadilhas dos <strong>${sideName(s.setupSide)}</strong>: ${s.traps.filter(t=>t.side===s.setupSide).length}/2 armadilhas colocadas. Preparação de 60 segundos.`;
 else if(s.phase==='over')msg=`<strong>${s.winner===-1?'EMPATE':'VITÓRIA DOS '+sideName(s.winner).toUpperCase()}</strong> — ${htmlEscape(s.endedReason)}`;
 else if(s.fieldPending)msg=`<strong>Campo mágico ativado:</strong> escolha um efeito para aplicar imediatamente.`;
 else if(s.reaction)msg=`<strong>REAÇÃO REAL • ${sideName(s.side)}</strong> — movimento defensivo, proteção, resgate, cura ou contra-ataque com Cópia Real.`;
 else if(s.combo)msg=`<strong>${sideName(s.side)}:</strong> Batedor pode realizar o segundo ataque mágico ou encerrar.`;
 else msg=`Vez dos <strong>${sideName(s.side)}</strong> · turno ${s.turnSerial+1} · ${s.mode==='ai'&&s.side===BLUE?'o computador está jogando':'selecione uma peça'}`;
 el('status').innerHTML=msg;
 el('finishSetup').hidden=s.phase!=='setup';el('passTurn').disabled=s.phase!=='play'||s.mode==='ai'&&s.side===BLUE||!!s.fieldPending;
 el('clearSelect').disabled=s.phase!=='play';renderBoardNotice();
 paintClock();paintModal();
}
function passTurn(msg){if(game.s.phase!=='play'||!isHumanTurn()||veil)return;const before=game.s.turnSerial,bside=game.s.side;
 game.pass(msg||'Jogador passou a vez.');dismissModal();postChange(bside,before);
}
function showGameOver(){const s=game.s;showModal({title:s.winner===-1?'⚖ Partida empatada':`♛ Vitória dos ${sideName(s.winner)}`,intro:s.endedReason||'Confronto encerrado.',choices:[{label:'Iniciar outra batalha',fn:openStart}],footer:[{label:'Rever o tabuleiro',fn:dismissModal}]});}
function showRules(){showModal({title:'Manual de campo • Khar Tall',intro:'Inspirado no livro Ecos da Chama: O Último Victorino. Dois exércitos de 16 peças disputam um tabuleiro 10×10. Cada jogada tem 60 segundos.',choices:[
 {label:'1 • Objetivo e turnos',desc:'Elimine Rei (2 vidas) e Guardião original. Se o Rei morrer antes, o adversário tem 3 turnos próprios para eliminar o Guardião, ou haverá empate.',fn:()=>showRulePage(1)},
 {label:'2 • Unidades e habilidades',desc:'Aprendizes (+ e X), Colosso (Investida + Esmagamento), Lobo (3×2), Batedor (magia V), Guardião (área/linha) e Rei (cópias).',fn:()=>showRulePage(2)},
 {label:'3 • Campos, marcas e armadilhas',desc:'Campos inimigos recarregam após 3 rodadas, marcação de 2 turnos, paralisia de 1, armadilhas secretas e Reação Real.',fn:()=>showRulePage(3)}],footer:[{label:'Fechar',fn:dismissModal}]});}
function showRulePage(n){let pages={
 1:`1 peça ou habilidade por turno, salvo combos definidos. As peças não atravessam peças, exceto saltos do Lobo. O Rei tem 2 vidas; os demais têm 1. Só o Guardião original conta para a vitória. O primeiro jogador é sorteado. Perder o limite de 60 segundos equivale a passar.`,
 2:`Soldado anda 1 em todas as direções, ataca 1 em +; Arqueiro anda 1 e ataca a 1 ou 2 casas em X, com linha desobstruída (flechas não atravessam peças). Colosso anda 1, pode Investir exatamente 3 em +, atingindo inimigos, seguido por Esmagamento de adjacentes após 1 deslocamento. Lobo salta 3×2 ou 2×3 em qualquer orientação, podendo atacar no destino (repousa no turno seguinte). Batedor anda 1 e ataca com V mágico orientável a até 4 casas, duas vezes no mesmo turno. Guardião anda à vontade em oito direções e pode atingir até 3 inimigos em raio de 3 ou o primeiro inimigo em linha cardinal. Rei anda e ataca em linha até 2 casas, copia ataques recebidos uma vez.`,
 3:`Apenas campos mágicos INIMIGOS ativam. Cura evolui Soldado→Colosso e Arqueiro→Batedor. Cristal invoca Aprendiz (limite de 20), transforma uma peça (exceto Rei/Guardião original) ou sacrifica para teletransportar outro aliado. Qualquer peça elegível pode ser sacrificada para curar um Rei ferido; o Guardião original só pode ser sacrificado para curar o Rei. A marca do Batedor dura 2 turnos da vítima, paralisia 1; uma execução em Rei tira 1 vida. A marca pode ser executada por aliados e permanece até expirar. Armadilhas: 2 ocultas por lado antes da partida, não podem estar em campos mágicos, paralisam por 1 turno e desaparecem. Peças comuns não atacam enquanto imobilizadas por armadilhas; Rei pode usar ataques normais e cópias. Reação Real prioriza defesa, salvo contra-ataque copiado. Campos recarregam após 3 rodadas completas; reentrar é necessário.`};
 showModal({title:`Regras — capítulo ${n}`,intro:pages[n]+' · Khar Tall é um jogo criado com base no universo do livro Ecos da Chama: O Último Victorino.',choices:[],footer:[{label:'Voltar ao índice',fn:showRules},{label:'Fechar',fn:dismissModal}]});}
function thinkScore(g,a,level){const s=g.s,p=g.piece(a.p),victim=g.piece(a.target),k=g.king(p.side);
 let score=0;if(!p)return -1e9;
 const priority=victim?(victim.type==='king'?(victim.hp===1?480:155):victim.original?250:(VALUE[victim.type]||20)):0;
 if(['hit','wolfHit','line','copyHit','copyWolfHit','copyLine','execute','mark','area','copyArea'].includes(a.kind)){
  score+=priority*(a.kind==='mark'&&!victim?.mark?.n?.valueOf()?0.38:1);
  if(a.kind==='mark'&&victim?.type==='king')score+=90;
  if(a.kind==='execute'&&victim?.type==='king')score+=140;
 }
 if(a.kind==='area'||a.kind==='copyArea'){
  const ts=g.guardianTargets(p).filter(t=>t.id!==a.target).sort((x,y)=>(y.type==='king'?120:VALUE[y.type]||0)-(x.type==='king'?120:VALUE[x.type]||0));
  score+=(ts.slice(0,2).reduce((n,t)=>n+(t.type==='king'?120:(VALUE[t.type]||15)),0))*0.8;
 }
 if(a.kind==='rescue')score+=k?.hp===1?140:65;
 if(a.kind==='charge'||a.kind==='copyCharge'){
  const dx=Math.sign(a.x-p.x),dy=Math.sign(a.y-p.y);for(let j=1;j<=3;j++){let t=g.pieceAt(p.x+dx*j,p.y+dy*j);if(t&&t.side!==p.side)score+=(t.type==='king'?(t.hp===1?330:120):t.original?240:VALUE[t.type]);}
 }
 if(a.kind==='smash')score+=g.s.pieces.filter(t=>t.side!==p.side&&Math.max(Math.abs(t.x-a.x),Math.abs(t.y-a.y))===1).reduce((z,t)=>z+(t.type==='king'?140:VALUE[t.type]),0);
 if(['move','copyMove','fieldCharge','charge','copyCharge'].includes(a.kind)){
  let f=g.field(a.x,a.y);if(f?.owner!==p.side&&g.fieldReady(f))score+=f.kind==='heal'&&['soldier','archer'].includes(p.type)?95:f.kind==='crystal'?50:20;
  let front=p.side===RED?9-a.y:a.y;score+=front*1.1;
  if(k&&k.hp===1&&p.type==='guardian'&&p.original)score-=65;
  // Recompensa controle do centro, sem movimento constante de ida e volta.
  score+=12-2*Math.abs(a.x-4.5)-1.5*Math.abs(a.y-4.5);
  score+=Math.max(-7,Math.min(8,(Math.abs(p.y-4.5)-Math.abs(a.y-4.5))*2));
 }
 if(['move','copyMove'].includes(a.kind))score-=5;
 if(['mark'].includes(a.kind)&&victim?.mark?.by===p.side)score-=50;
 if(a.kind==='rescue'&&k?.hp===2)score-=28;
 if(level>=4){
   // Avaliação geométrica de ameaças baseada em posições públicas. Não revela armadilhas inimigas à IA.
   let threatened=0;
   for(let q of s.pieces.filter(q=>q.side!==p.side)){
    let d=Math.max(Math.abs(q.x-a.x),Math.abs(q.y-a.y));
    if(q.type==='king'&&d<=2&&d>=1)threatened+=90;
    if(q.type==='guardian'&&d<=3)threatened+=25;
    if(q.type==='scout'&&d<=4&&Math.abs(q.x-a.x)===Math.abs(q.y-a.y))threatened+=30;
    if(q.type==='soldier'&&d===1&&(q.x===a.x||q.y===a.y))threatened+=20;
    if(q.type==='archer'&&d>=1&&d<=2&&Math.abs(q.x-a.x)===Math.abs(q.y-a.y)){
     const mx=q.x+Math.sign(a.x-q.x),my=q.y+Math.sign(a.y-q.y);
     if(d===1||!g.pieceAt(mx,my))threatened+=24;
    }
    if(q.type==='wolf'&&[[3,2],[2,3]].some(([u,v])=>Math.abs(q.x-a.x)===u&&Math.abs(q.y-a.y)===v))threatened+=35;
   }
   if(['move','copyMove','charge','fieldCharge'].includes(a.kind))score-=Math.min(230,threatened)*(p.type==='king'?1.4:0.26);
 }
 if(s.reaction&&s.reaction.side===p.side&&a.kind==='move'&&p.type==='king')score+=30;
 return score;
}
function aiFieldResolve(g,preview=false){let tries=0;while(g.s.fieldPending&&tries++<4){const p=g.piece(g.s.fieldPending.pid),f=g.field(p.x,p.y);let opts=g.fieldOptions(p);if(!opts.length){g.fieldChoice({kind:'skip'});continue;}
  let chosen=opts.find(o=>o.kind==='healKing'&&g.king(p.side)?.hp===1)||opts.find(o=>o.kind==='evolve')||opts.find(o=>o.kind==='summon')||opts.find(o=>o.kind==='transform')||opts.find(o=>o.kind==='reunion');
  if(!chosen){g.fieldChoice({kind:'skip'});continue;}
  if(chosen.kind==='summon'){
   let avail=DIR8.map(([dx,dy])=>({x:p.x+dx,y:p.y+dy})).filter(z=>z.x>=0&&z.x<10&&z.y>=0&&z.y<10&&!g.pieceAt(z.x,z.y));
   if(avail.length){let target=avail.sort((a,b)=>Math.abs(a.x-4.5)-Math.abs(b.x-4.5))[0];g.fieldChoice({kind:'summon',type:g.random()<.5?'archer':'soldier',...target});}
   else g.fieldChoice({kind:'skip'});
  }else if(chosen.kind==='transform')g.fieldChoice({kind:'transform',type:p.type==='soldier'?'colossus':p.type==='archer'?'scout':'scout'});
  else if(chosen.kind==='reunion'){
   let ally=g.s.pieces.find(q=>q.side===p.side&&q.id!==p.id);let spot=null;for(let y=0;y<10&&!spot;y++)for(let x=0;x<10&&!spot;x++)if(!g.pieceAt(x,y))spot={x,y};
   if(ally&&spot)g.fieldChoice({kind:'reunion',targetId:ally.id,...spot});else g.fieldChoice({kind:'skip'});
  }else g.fieldChoice(chosen);
 }
}
function decorateAI(g,a){if(a.kind==='area'||a.kind==='copyArea'){
 let p=g.piece(a.p),extra=g.guardianTargets(p).filter(t=>t.id!==a.target).sort((x,y)=>(y.type==='king'?300:VALUE[y.type])-(x.type==='king'?300:VALUE[x.type])).slice(0,2).map(t=>t.id);
 return {...a,targets:[a.target,...extra]};}
 if(['hit','copyHit'].includes(a.kind)&&g.piece(a.target)?.type!=='king')return {...a,advance:false};return a;
}
function chooseAI(){let available=game.allActions(BLUE);if(!available.length)return null;const level=game.s.difficulty;
 if(level===1)return available[Math.floor(Math.random()*available.length)];
 let scored=available.map(a=>({a,score:thinkScore(game,a,level)+Math.random()*(level===2?35:level===3?12:level===4?5:2)})).sort((a,b)=>b.score-a.score);
 if(level===2)return scored[Math.floor(Math.random()*Math.min(15,scored.length))].a;
 if(level<5)return scored[0].a;
 // Mestre: compara respostas do adversário nos melhores candidatos, sem ler armadilhas secretas.
 let best=scored[0],bestScore=-Infinity;
 for(let item of scored.slice(0,Math.min(8,scored.length))){let simulation=KharTall.restore(game.snapshot());
  // IA não pode antecipar onde estão armadilhas ocultas do jogador.
  simulation.s.traps=simulation.s.traps.filter(t=>t.side===BLUE);
  try{
   simulation.random=Math.random;
   const a=decorateAI(simulation,item.a);
   if(!simulation.act(a))continue;aiFieldResolve(simulation,true);
   let next=simulation.s.side,opThreat=0;
   if(simulation.s.phase==='over')opThreat=simulation.s.winner===BLUE?-500:1500;
   else if(next===RED){for(const oa of simulation.allActions(RED))opThreat=Math.max(opThreat,thinkScore(simulation,oa,4));}
   let score=item.score-(opThreat*.52);
   if(score>bestScore){bestScore=score;best=item;}
  }catch(e){console.warn('Simulação estratégica ignorada:',e);}
 }
 return best.a;
}
function scheduleAI(){clearTimeout(aiTimer);if(!isAI())return;
 aiTimer=setTimeout(()=>{if(!isAI())return;let before=game.s.turnSerial,visual=captureBattle();
  if(game.s.fieldPending){aiFieldResolve(game);postChange(BLUE,before);return;}
  let action=chooseAI();if(!action){game.pass('IA não encontrou jogada válida.');postChange(BLUE,before);return;}
  action=decorateAI(game,action);
  if(!game.act(action)){game.pass('IA passou o turno.');}
  if(game.s.fieldPending)aiFieldResolve(game);
  noteBattleFx(visual,action);postChange(BLUE,before);
 },Math.min(900,320+game.s.difficulty*110));
}
function setupResume(){let old=null;try{old=JSON.parse(localStorage.getItem(STORE)||'null');}catch(e){}
 if(old&&old.version===2&&old.phase!=='over')showModal({title:'Bem-vindo de volta ao Khar Tall',intro:'Encontrei uma partida V2 salva neste navegador. Deseja retomá-la?',choices:[
  {label:'Continuar partida',fn:()=>{game=KharTall.restore(old);clearSelection();inspectedId=null;dismissModal();if(game.s.mode==='local')cover(`Vamos retomar a partida. Entregue o dispositivo aos ${sideName(currentSide())}; suas armadilhas permanecerão privadas.`);else{veil=false;beginClock();render();scheduleAI();}}},
  {label:'Começar uma nova partida',fn:openStart}],footer:[{label:'✦ Criar conta',primary:true,fn:()=>el('accountButton').click()}]});
 else openStart();}
function tick(){if(veil||informationalClockPaused||modal?.title?.startsWith('Uma nova batalha')||modal?.title?.startsWith('Escolha a dificuldade')||modal?.title?.startsWith('Bem-vindo')||game.s.phase==='over'||!clockEnd)return;
 secsLeft=Math.max(0,Math.ceil((clockEnd-Date.now())/1000));paintClock();
 if(secsLeft>0)return;clockEnd=0;
 if(game.s.phase==='setup'){const lost=2-game.s.traps.filter(t=>t.side===game.s.setupSide).length;game.note(`Tempo de preparação esgotado; ${lost===1?'1 armadilha não colocada foi perdida':lost+' armadilhas não colocadas foram perdidas'}.`);finishSetup();return;}
 const before=game.s.turnSerial,bside=game.s.side;clearTimeout(aiTimer);game.pass('60 segundos esgotados: jogador perdeu apenas o turno.');dismissModal();postChange(bside,before);
}
function wire(){applyPrefs();el('codexButton').onclick=openCodex;el('tutorialButton').onclick=()=>showTutorial(0);
 el('audioToggle').onclick=()=>{prefs.sound=!prefs.sound;savePrefs();applyPrefs();if(prefs.sound)audioPlayer.ui('confirm');};
 el('artToggle').onclick=()=>{prefs.illustrated=!prefs.illustrated;savePrefs();applyPrefs();};
 el('newGame').onclick=()=>showModal({title:'Recomeçar a partida?',intro:'Isso apaga a partida atual salva neste navegador.',choices:[{label:'Sim, iniciar nova batalha',fn:openStart}],footer:[{label:'Cancelar',fn:dismissModal}]});
 el('helpButton').onclick=showRules;el('passTurn').onclick=()=>passTurn();el('clearSelect').onclick=()=>{clearSelection();inspectedId=null;render();};
 el('finishSetup').onclick=finishSetup;el('saveBtn').onclick=()=>{save();const root=el('notice');root.classList.remove('unitGuideActive');root.textContent='Partida salva neste navegador.';};
 let axes=el('axes');'ABCDEFGHIJ'.split('').forEach(t=>axes.append(one('span',t)));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(picker)cancelPicker();else if(modal&&!modal.locked)dismissModal();else if(selectedId){clearSelection();render();}}});
 setInterval(tick,150);
}
primeScoutWavs();
wire();render();setupResume();
// Interface de testes manuais, sem enviar dados para fora do navegador.
window.KharTallV2={getGame:()=>game,launch:fresh,chooseAI,autoField:()=>aiFieldResolve(game),codex:openCodex,settings:()=>({...prefs})};
})();
