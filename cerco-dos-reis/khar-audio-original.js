/* Khar Tall: shared battle audio for local and online play. */
(function(root){
'use strict';
const FILES=Object.freeze({
 blueLaunch:'batedor_azul_lancamento.wav',blueImpact:'batedor_azul_impacto.wav',
 redLaunch:'batedor_vermelho_lancamento.wav',redImpact:'batedor_vermelho_explosao.wav',
 arrowLaunch:'arqueiro_disparo.wav',arrowImpact:'arqueiro_impacto.wav',
 swordSwing:'soldado_espada_corte.wav',swordImpact:'soldado_espadas_choque_nitido.wav',
 giantStep:'colosso_passo_estrondoso.wav',groundSmash:'colosso_esmagamento_rachadura.wav',
 royalWound:'rei_primeira_vida_tam_tam_taam.wav',royalSuspense:'rei_morto_guardiao_vivo_suspense.wav',
 royalGuardian:'guardiao_trombeta_aviso.wav',royalVictory:'vitoria_trompetas_marcha.wav',
 wolfHowl:'lobo_uivo_real.wav',wolfGrowl:'lobo_matilha_rosnado.wav',wolfBite:'lobo_mordida_impacto.wav',
 kingBlast:'rei_ataque_explosao.wav',guardianArea:'guardiao_ataque_area_ancestral.wav',guardianLine:'guardiao_ventania_magica.wav'
});
const VOLUMES=Object.freeze({blueLaunch:.87,blueImpact:.94,redLaunch:.87,redImpact:.94,
 arrowLaunch:.76,arrowImpact:.86,swordSwing:.83,swordImpact:.72,giantStep:.72,groundSmash:.94,
 royalWound:.73,royalSuspense:.60,royalGuardian:.60,royalVictory:.76,
 wolfHowl:.70,kingBlast:.78,guardianArea:.68,guardianLine:.72});
const WOLF_ATTACK=Object.freeze([Object.freeze({key:'wolfHowl',delay:0})]);
function plan(event){
 const cues=[];let utility=null;
 if(!event)return {cues,utility};
 const add=(key,delay=0,volume)=>cues.push({key,delay,...(volume===undefined?{}:{volume})});
 const k=event.actionKind,p=event.pieceType,tech=event.tech;
 const copied=p==='king'&&k?.startsWith('copy'),type=copied?tech:p;
 const impact=Number.isFinite(event.impactDelay)?Math.max(0,event.impactDelay):310;
 if(event.kind==='field'){if(k!=='skip')utility='heal';return {cues,utility};}
 if(event.kind!=='move')return {cues,utility};
 if(event.attackBlocked){utility='trap';}
 else if(k==='wolfHit'||k==='copyWolfHit')WOLF_ATTACK.forEach(c=>add(c.key,c.delay));
 else if(k==='mark'||k==='execute'){
  const prefix=k==='mark'?'blue':'red';add(prefix+'Launch');add(prefix+'Impact',impact);
 }else if(k==='smash')add('groundSmash',340);
 else if(['charge','copyCharge','fieldCharge'].includes(k)){
  const count=Math.max(0,Math.min(3,Number.isInteger(event.chargeSteps)?event.chargeSteps:3));
  for(let i=0;i<count;i++)add('giantStep',85+i*185,.72+i*.05);
 }else if(['area','copyArea'].includes(k))add('guardianArea');
 else if(['line','copyLine'].includes(k))add('guardianLine');
 else if(['hit','copyHit'].includes(k)){
  if(type==='archer'){add('arrowLaunch');add('arrowImpact',impact);}
  else if(type==='soldier'){add('swordSwing');add('swordImpact',impact);}
  else if(type==='king')add('kingBlast');
 }else if(k==='rescue'||k==='copyMove')utility='heal';
 if(event.trapTriggered)utility='trap';
 // A decisive musical cue has priority over other death/wound motifs.
 if(event.winner!==null&&event.winner!==undefined&&event.winner!==-1){add('royalVictory',impact);return {cues,utility};}
 const lost=event.lost||[];
 if(lost.some(p=>p.type==='king'))add('royalSuspense',impact);
 else if(lost.some(p=>p.type==='guardian'&&p.original))add('royalGuardian',impact);
 else if(event.wounded?.length)add('royalWound',impact);
 if(lost.some(p=>p.type==='wolf')&&!cues.some(c=>c.key==='wolfHowl'))add('wolfHowl',impact);
 return {cues,utility};
}
class Player{
 constructor(options={}){
  this.enabled=options.enabled!==false;this.ctx=null;this.output=null;this.active=new Set();
  this.bytes=new Map();this.buffers=new Map();this.decoding=new Map();this.epoch=0;
  this.Context=options.AudioContext||root.AudioContext||root.webkitAudioContext;
  this.fetch=options.fetch||root.fetch?.bind(root);this.now=options.now||Date.now;
  this.maxDelay=2000;this.failed=new Set();this.uiBuffers=new Map();this.lastUI=-Infinity;
  if(root.document){const unlock=()=>{if(this.enabled)this.unlock().catch(()=>{});};
   root.document.addEventListener('pointerdown',unlock,{passive:true,capture:true});
   root.document.addEventListener('keydown',unlock,{passive:true,capture:true});}
 }
 network(key){
  if(!FILES[key]||!this.fetch)return Promise.reject(Error('Unavailable audio'));
  if(!this.bytes.has(key)){
   const job=this.fetch('/original-audio/'+FILES[key]+'?v=original-1')
    .then(r=>{if(!r.ok)throw Error('Audio request failed');return r.arrayBuffer();})
    .catch(e=>{this.bytes.delete(key);this.failed.add(key);throw e;});
   this.bytes.set(key,job);
  }
  return this.bytes.get(key);
 }
 preload(){return Promise.all(Object.keys(FILES).map(k=>this.network(k).catch(()=>null)));}
 context(){
  if(!this.ctx&&this.Context){
   this.ctx=new this.Context();const master=this.ctx.createGain(),limiter=this.ctx.createDynamicsCompressor();
   master.gain.value=.90;limiter.threshold.value=-4;limiter.knee.value=2;limiter.ratio.value=12;
   limiter.attack.value=.003;limiter.release.value=.15;
   master.connect(limiter);limiter.connect(this.ctx.destination);this.output=master;
  }
  return this.ctx;
 }
 async unlock(){
  const ctx=this.context();if(!ctx)return false;
  if(ctx.state==='suspended')await ctx.resume();
  for(const key of this.bytes.keys())this.decode(key).catch(()=>{});
  return ctx.state==='running';
 }
 async decode(key){
  if(this.buffers.has(key))return this.buffers.get(key);
  if(this.decoding.has(key))return this.decoding.get(key);
  const ctx=this.context();if(!ctx)throw Error('Audio context unavailable');
  const task=this.network(key).then(data=>ctx.decodeAudioData(data.slice(0)))
   .then(buffer=>{this.buffers.set(key,buffer);this.failed.delete(key);return buffer;})
   .finally(()=>this.decoding.delete(key));
  this.decoding.set(key,task);return task;
 }
 setEnabled(enabled){
  const next=!!enabled;
  if(!next){this.epoch++;for(const s of this.active){try{s.stop();}catch{}}this.active.clear();}
  this.enabled=next;if(next)this.unlock().catch(()=>{});
 }
 async sequence(cues){
  if(!this.enabled||!cues.length)return false;
  const epoch=this.epoch,requested=this.now();
  try{
   const ctx=this.context();if(!ctx)return false;
   // Resume during the user's gesture, before awaiting file loading/decoding.
   const resumed=this.unlock().catch(()=>false);
   const ready=await Promise.all(cues.map(c=>this.decode(c.key)));
   if(!(await resumed)||!this.enabled||this.epoch!==epoch||this.now()-requested>this.maxDelay)return false;
   const at=ctx.currentTime+.025;
   cues.forEach((cue,i)=>{
    const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=ready[i];
    gain.gain.value=cue.volume??VOLUMES[cue.key]??.65;
    source.connect(gain);gain.connect(this.output);this.active.add(source);
    source.onended=()=>{this.active.delete(source);source.disconnect();gain.disconnect();};
    source.start(at+Math.max(0,cue.delay||0)/1000);
   });
   return true;
  }catch{return false;} // Never replace an unavailable recording with a harsh synthetic imitation.
 }
 play(key,delay=0,volume){return this.sequence([{key,delay,volume}]);}
 async ui(kind='tap'){
  if(!this.enabled||this.now()-this.lastUI<55)return false;
  this.lastUI=this.now();const epoch=this.epoch;
  try{
   if(!(await this.unlock())||!this.enabled||epoch!==this.epoch)return false;
   const ctx=this.ctx,key=kind==='confirm'?'confirm':kind==='place'?'place':'tap';
   if(!this.uiBuffers.has(key)){
    // Short, damped wooden taps: no ringing tail or extra audio download.
    const rate=ctx.sampleRate,duration=key==='confirm'?.16:.075;
    const buffer=ctx.createBuffer(1,Math.ceil(rate*duration),rate),data=buffer.getChannelData(0);
    let seed=761;
    for(let i=0;i<data.length;i++){
     const t=i/rate;let value=0;
     for(const [offset,pitch]of key==='confirm'?[[0,470],[.078,620]]:[[0,key==='place'?420:560]]){
      const d=t-offset;if(d<0||d>.075)continue;
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      const noise=(seed/2147483648-1),attack=Math.min(1,d/.0025);
      value+=attack*(.30*Math.sin(2*Math.PI*pitch*d)*Math.exp(-85*d)+.15*Math.sin(2*Math.PI*pitch*1.73*d)*Math.exp(-125*d)+.18*noise*Math.exp(-195*d))*Math.min(1,(.075-d)/.012);
     }
     data[i]=value;
    }
    this.uiBuffers.set(key,buffer);
   }
   const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=this.uiBuffers.get(key);gain.gain.value=.38;
   source.connect(gain);gain.connect(this.output);this.active.add(source);
   source.onended=()=>{this.active.delete(source);source.disconnect();gain.disconnect();};
   source.start(ctx.currentTime+.003);return true;
  }catch{return false;}
 }
 async utility(kind){
  if(!this.enabled)return false;const epoch=this.epoch,requested=this.now();
  try{if(!(await this.unlock())||!this.enabled||epoch!==this.epoch||this.now()-requested>this.maxDelay)return false;
   const ctx=this.ctx,notes=({hit:[[180,.05],[120,.13]],magic:[[430,.08],[670,.15]],trap:[[300,.08],[145,.18]],heal:[[410,.09],[530,.12],[725,.19]],summon:[[320,.1],[480,.13],[650,.16]],move:[[185,.035]],charge:[[165,.12],[120,.11]]})[kind]||[[280,.1]];
   const now=ctx.currentTime+.025;notes.forEach(([hz,dur],i)=>{
    const source=ctx.createOscillator(),gain=ctx.createGain(),at=now+i*.08;
    source.type=['magic','heal','summon'].includes(kind)?'sine':'triangle';
    source.frequency.setValueAtTime(hz,at);source.frequency.exponentialRampToValueAtTime(Math.max(80,hz*.78),at+dur);
    gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.052,at+.012);gain.gain.exponentialRampToValueAtTime(.0001,at+dur);
    source.connect(gain);gain.connect(this.output);this.active.add(source);
    source.onended=()=>{this.active.delete(source);source.disconnect();gain.disconnect();};source.start(at);source.stop(at+dur+.025);
   });return true;
  }catch{return false;}
 }
}
const api={FILES,VOLUMES,WOLF_ATTACK,plan,Player,create:options=>new Player(options)};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
else root.KharTallAudio=api;
})(typeof window!=='undefined'?window:globalThis);
