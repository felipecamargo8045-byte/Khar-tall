/* Sons originais do Khar Tall: ataques, passos, dano recebido, queda de fortalezas e vitória. Reutiliza seu motor original e suas gravações,
   sem substituir efeitos por samples inventados ou síntese para ataques.
   Fonte: ../audio.js + asset-bundle e audio-assets versionados no GitHub. */
(()=>{
'use strict';
const KEY='cerco-dos-reis-audio-v1';
let prefs={on:true,volume:.55};
try{
 const saved=JSON.parse(localStorage.getItem(KEY)||'null');
 if(saved){
  prefs.on=saved.on!==false;
  prefs.volume=Math.max(0,Math.min(1,Number(saved.volume)||0));
 }
}catch{}
const api=window.KharTallAudio;
if(!api?.Player){console.error('Motor de áudio original Khar Tall ausente');return}
const player=new api.Player({enabled:prefs.on});
const recent=new Map();
// Som apenas nos eventos aprovados: ataques, passos, dano recebido,
 // destruição de torre/castelo e vitória. Interface e invocação são silenciosas.
const minGap={
 wolf:.22,bite:.22,arrow:.10,slash:.12,shield:.31,mark:.23,markRed:.23,royal:.32,
 enchant:.42,colossus:.32,tower:.28,step:.82,
 damage:.52,towerDestroyed:.85,castleDestroyed:1.8,victory:2.8
};
const allowedSounds=new Set(Object.keys(minGap));
const attackLog=[];
function refreshMaster(){
 if(player.output)player.output.gain.value=.90*prefs.volume;
}
function unlock(){
 if(!prefs.on)return;
 player.unlock().then(refreshMaster).catch(()=>{});
}
function uniqueSample(kind,details){
 switch(kind){
  case 'arrow':return 'arrowLaunch';
  case 'slash':return 'swordSwing';
  case 'wolf':return 'wolfBite';
  case 'bite':return 'wolfBite';
  case 'colossus':return 'groundSmash';
  case 'step':return details.card==='colosso'?'giantStep':null;
  case 'damage':return 'royalWound';
  case 'towerDestroyed':return 'groundSmash';
  case 'castleDestroyed':return 'kingBlast';
  case 'victory':return 'royalVictory';
  case 'shield':return 'guardianLine';
  case 'mark':return 'blueLaunch';
  case 'markRed':return 'redLaunch';
  case 'royal':return 'kingBlast';
  case 'enchant':return 'guardianArea'; // Liliti não existia no Khar Tall de tabuleiro.
  case 'tower':return 'arrowLaunch';
  default:return null;
 }
}
function play(kind,details={}){
 // Só os eventos aprovados passam por este filtro, inclusive se alguém
 // tentar reproduzir interface, invocação ou o uivo antigo.
 if(!allowedSounds.has(kind)||!prefs.on||prefs.volume<=0)return false;
 const now=performance.now()/1000;
 const gap=minGap[kind]||0;
 if(now-(recent.get(kind)||-999)<gap)return false;
 const sample=uniqueSample(kind,details||{});
 if(!sample)return false;
 recent.set(kind,now);
 attackLog.push({kind,sample});
 if(attackLog.length>90)attackLog.shift();
 unlock();
 const base=api.VOLUMES?.[sample]??.7;
 // Passos discretos, ataques presentes, dano breve, destruição mais forte
 // e toque de vitória marcante. As gravações permanecem originais.
 const level=kind==='step'?.22:kind==='damage'?.42:kind==='victory'?.93:
   kind==='castleDestroyed'?.96:kind==='towerDestroyed'?.88:.72;
 const delay=kind==='victory'?470:0;
 player.play(sample,delay,Math.min(1,base*level)).catch(()=>{});
 return true;
}
function persist(){
 try{localStorage.setItem(KEY,JSON.stringify(prefs))}catch{}
 player.setEnabled(prefs.on);
 if(!prefs.on)window.CercoVoices?.stop?.();
 refreshMaster();
 updateUI();
}
function updateUI(){
 const button=document.getElementById('soundToggle'),slider=document.getElementById('soundVolume');
 if(button){
  button.textContent=prefs.on?'♫':'♪̸';
  button.setAttribute('aria-label',prefs.on?'Silenciar os sons originais':'Ativar os sons originais');
  button.setAttribute('aria-pressed',String(prefs.on));
 }
 if(slider){slider.value=Math.round(prefs.volume*100);slider.disabled=!prefs.on}
 const battleButton=document.getElementById('battleSound');
 if(battleButton){battleButton.textContent=prefs.on?'♫':'♪̸';battleButton.setAttribute('aria-pressed',String(prefs.on))}
}
function setup(){
 document.getElementById('soundToggle')?.addEventListener('click',()=>{
  prefs.on=!prefs.on;persist();
  if(prefs.on)unlock()
 });
 document.getElementById('soundVolume')?.addEventListener('input',event=>{
  prefs.volume=Math.max(0,Math.min(1,Number(event.target.value)/100));
  persist();
 });
 updateUI();
 // Carregamento antecipado de WAVs originais; áudio só toca após gesto do usuário.
 player.preload().catch(()=>{});
}
window.CercoAudio={
 play,unlock,getSettings:()=>({...prefs}),isReady:()=>player.ctx?.state==='running',
 setEnabled:value=>{prefs.on=Boolean(value);persist()},
 played:()=>attackLog.map(x=>({...x})),
 status:()=>({original:true,allowedEvents:['attack','movement','damage','towerDestroyed','castleDestroyed','victory'],recordings:Object.keys(api.FILES).length,loaded:player.buffers.size,
   failed:[...player.failed],fileNames:api.FILES}),
 player
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
else setup();
})();
