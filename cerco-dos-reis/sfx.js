/* Cerco dos Reis — áudio local baseado nas categorias do Khar Tall.
 * Sem gravações externas, sem streaming, sem APIs pagas e sem autoplay.
 * Sons gerados por Web Audio depois de uma interação do jogador.
 */
(()=>{
'use strict';
const KEY='cerco-dos-reis-audio-v1';
let prefs={on:true,volume:.55};
try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved){prefs.on=saved.on!==false;prefs.volume=Math.max(0,Math.min(1,Number(saved.volume) || 0));}}catch{}
let context=null,master=null,noiseBuffer=null;
const last=new Map();
const cooldowns={tower:.12,towerHit:.095,attack:.07,impact:.075,step:.30,wolf:.7,colossus:.45,damage:.2,place:.06,ui:.055};
function ac(){
 if(context)return context;
 const Ctx=window.AudioContext||window.webkitAudioContext;
 if(!Ctx)return null;
 context=new Ctx();
 master=context.createGain();master.gain.value=.48*prefs.volume;
 const limiter=context.createDynamicsCompressor();
 limiter.threshold.value=-12;limiter.knee.value=7;limiter.ratio.value=8;
 limiter.attack.value=.003;limiter.release.value=.13;
 master.connect(limiter);limiter.connect(context.destination);
 return context;
}
function unlock(){if(!prefs.on)return;try{const c=ac();if(c?.state==='suspended')c.resume().catch(()=>{});}catch{}}
document.addEventListener('pointerdown',unlock,{passive:true,capture:true});
document.addEventListener('keydown',unlock,{passive:true,capture:true});
function tone(freq,dur=.11,kind='triangle',volume=.11,shift=.83,delay=0){
 const c=ac();if(!c||c.state!=='running')return;
 const t=c.currentTime+delay,source=c.createOscillator(),gain=c.createGain();
 source.type=kind;source.frequency.setValueAtTime(Math.max(55,freq),t);
 source.frequency.exponentialRampToValueAtTime(Math.max(55,freq*shift),t+dur);
 gain.gain.setValueAtTime(.0001,t);
 gain.gain.exponentialRampToValueAtTime(volume,t+.009);
 gain.gain.exponentialRampToValueAtTime(.0001,t+dur);
 source.connect(gain);gain.connect(master);
 source.start(t);source.stop(t+dur+.01);
}
function noise(duration=.1,volume=.06,cutoff=1200,delay=0){
 const c=ac();if(!c||c.state!=='running')return;
 if(!noiseBuffer){
  noiseBuffer=c.createBuffer(1,c.sampleRate,c.sampleRate);const data=noiseBuffer.getChannelData(0);
  let s=9811;
  for(let i=0;i<data.length;i++){s=(Math.imul(s,1664525)+1013904223)>>>0;data[i]=(s/2147483648-1)*.72;}
 }
 const src=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain(),t=c.currentTime+delay;
 src.buffer=noiseBuffer;filter.type='lowpass';filter.frequency.value=cutoff;
 gain.gain.setValueAtTime(volume,t);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
 src.connect(filter);filter.connect(gain);gain.connect(master);
 src.start(t);src.stop(t+duration+.015);
}
function chord(notes,span=.12,volume=.11){
 notes.forEach(([freq,offset=0])=>tone(freq,span,'sine',volume,.97,offset));
}
function sound(kind,p={}){
 const now=performance.now()/1000;
 const limit=cooldowns[kind]||0;
 if(now-(last.get(kind)||-100)>limit===false)return;
 if(now-(last.get(kind)||-100)<limit)return;
 last.set(kind,now);
 try{
 switch(kind){
  case 'ui':tone(550,.05,'triangle',.075,.74);break;
  case 'place':chord([[310,0],[465,.048],[620,.09]],.085,.075);noise(.055,.025,1900);break;
  case 'tower':tone(p.side==='enemy'?265:350,.17,'sawtooth',.12,.52);noise(.12,.08,780);tone(115,.13,'triangle',.05,.77,.045);break;
  case 'towerHit':noise(.11,.15,650);tone(138,.13,'triangle',.12,.46);break;
  case 'attack':tone(p.card==='arqueiro'?750:p.card==='colosso'?146:415,.10,'triangle',.09,.51);noise(.045,.035,2300);break;
  case 'wolf':tone(285,.2,'sawtooth',.085,1.42);tone(200,.18,'triangle',.08,1.06,.045);break;
  case 'colossus':tone(96,.22,'sawtooth',.115,.54);noise(.18,.095,380);break;
  case 'impact':noise(.08,.065,1400);tone(178,.11,'triangle',.075,.56);break;
  case 'damage':tone(190,.15,'triangle',.12,.57);break;
  case 'magic':chord([[460,0],[630,.05],[840,.08]],.2,.06);break;
  case 'victory':chord([[392,0],[494,.13],[587,.27],[784,.42]],.27,.13);break;
  case 'defeat':chord([[330,0],[277,.17],[220,.34]],.3,.12);break;
  default:tone(400,.07,'triangle',.065,.8);
 }
 }catch{}
}
function play(kind,info){if(!prefs.on||prefs.volume===0)return;unlock();sound(kind,info||{});}
function updateUI(){
 const btn=document.getElementById('soundToggle');
 const slider=document.getElementById('soundVolume');
 if(btn){
  btn.textContent=prefs.on?'♫':'♪̸';
  btn.setAttribute('aria-label',prefs.on?'Silenciar sons do jogo':'Ativar sons do jogo');
  btn.setAttribute('aria-pressed',String(prefs.on));
  btn.title=prefs.on?'Desligar sons':'Ligar sons';
 }
 if(slider){slider.value=Math.round(prefs.volume*100);slider.disabled=!prefs.on}
}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(prefs))}catch{};if(master)master.gain.value=.48*prefs.volume;updateUI();}
function setup(){
 const toggle=document.getElementById('soundToggle');
 const slider=document.getElementById('soundVolume');
 toggle?.addEventListener('click',()=>{prefs.on=!prefs.on;persist();if(prefs.on){unlock();play('ui')}});
 slider?.addEventListener('input',()=>{prefs.volume=Math.max(0,Math.min(1,Number(slider.value)/100));persist()});
 document.querySelectorAll('#navigation button').forEach(btn=>btn.addEventListener('click',()=>play('ui')));
 updateUI();
}
window.CercoAudio={play,unlock,getSettings:()=>({...prefs}),isReady:()=>context?.state==='running',setEnabled:v=>{prefs.on=Boolean(v);persist()}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
