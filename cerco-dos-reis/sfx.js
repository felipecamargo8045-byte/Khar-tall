/* Sons originais do Khar Tall, apenas durante ataques. Reutiliza seu motor original e suas gravações,
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
// Som apenas durante golpes e disparos. Sem sons de interface, passos,
// invocacao, dano, impactos separados, vitoria ou derrota.
const minGap={
 wolf:.22,bite:.22,arrow:.10,slash:.12,shield:.31,mark:.23,markRed:.23,royal:.32,
 enchant:.42,colossus:.32,tower:.28
};
const attackOnly=new Set(Object.keys(minGap));
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
 // Filtro definitivo: até chamadas esquecidas em outras interfaces
 // permanecem silenciosas. Só ataques de tropas e torres emitem som.
 if(!attackOnly.has(kind)||!prefs.on||prefs.volume<=0)return false;
 const now=performance.now()/1000;
 const gap=minGap[kind]||0;
 if(now-(recent.get(kind)||-999)<gap)return false;
 const sample=uniqueSample(kind,details||{});
 if(!sample)return false;
 recent.set(kind,now);
 attackLog.push({kind,sample});
 if(attackLog.length>90)attackLog.shift();
 unlock();
 player.play(sample).catch(()=>{});
 return true;
}
function persist(){
 try{localStorage.setItem(KEY,JSON.stringify(prefs))}catch{}
 player.setEnabled(prefs.on);
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
 status:()=>({original:true,attackOnly:true,recordings:Object.keys(api.FILES).length,loaded:player.buffers.size,
   failed:[...player.failed],fileNames:api.FILES}),
 player
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
else setup();
})();
