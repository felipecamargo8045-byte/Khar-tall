/* Mixagem do Cerco: ataques, impactos e vitória. Sem música ou passos. */
(()=>{'use strict';
const KEY='cerco-dos-reis-audio-v1';let prefs={on:true,volume:.55};
try{const p=JSON.parse(localStorage.getItem(KEY)||'null');if(p){prefs.on=p.on!==false;prefs.volume=Math.max(0,Math.min(1,Number(p.volume)||0))}}catch{}
const api=window.KharTallAudio;if(!api?.Player)return;
const player=new api.Player({enabled:prefs.on}),recent=new Map(),active=new Map(),history=[];
let epoch=0,ducked=false,lastAttack=-Infinity,victoryUntil=0;
const sounds={
 wolf:['wolfBite',.38,.68,.28],bite:['wolfBite',.38,.68,.28],
 arrow:['arrowLaunch',.30,.56,.20],tower:['arrowLaunch',.30,.40,.28],
 slash:['swordSwing',.32,.60,.25],shield:['guardianLine',.65,.50,.65],
 mark:['blueLaunch',.55,.56,.50],markRed:['redLaunch',.52,.60,.50],
 royal:['kingBlast',.65,.62,.70],enchant:['guardianArea',.65,.46,.70],
 colossus:['groundSmash',.75,.66,.75],damage:['swordImpact',.16,.30,.24],
 victory:['royalVictory',3.62,.85,4]
};
function refreshMaster(){if(player.output)player.output.gain.value=prefs.volume*(ducked?.40:.85)}
function unlock(){if(prefs.on)player.unlock().then(refreshMaster).catch(()=>{})}
function stop(){epoch++;for(const node of active.keys()){try{node.stop()}catch{}}active.clear();victoryUntil=0;player.setEnabled(prefs.on)}
function play(kind,details={}){
 const spec=sounds[kind];if(!spec||!prefs.on||prefs.volume<=0)return false;
 const now=performance.now()/1000,channel=kind==='victory'?'victory':kind==='damage'?'damage':'attack';
 if(kind!=='victory'&&now<victoryUntil)return false;
 if(now-(recent.get(kind)??-Infinity)<spec[3])return false;
 if(channel==='attack'&&now-lastAttack<.09)return false;
 if(kind==='victory'){stop();window.CercoVoices?.stop?.();victoryUntil=now+spec[1]}
 if(channel==='attack')lastAttack=now;
 recent.set(kind,now);const requested=epoch,requestedAt=performance.now();
 history.push({kind,sample:spec[0],channel,duration:spec[1]});if(history.length>90)history.shift();
 unlock();
 player.decode(spec[0]).then(async buffer=>{
  if(!(await player.unlock())||requested!==epoch||!prefs.on||performance.now()-requestedAt>700)return;
  const same=[...active.values()].filter(v=>v===channel).length;
  if(active.size>=4||same>=(channel==='attack'?2:1))return;
  refreshMaster();const ctx=player.ctx,node=ctx.createBufferSource(),gain=ctx.createGain();
  const duration=Math.min(spec[1],buffer.duration),at=ctx.currentTime+.012;
  node.buffer=buffer;const level=spec[2]*(details.side==='enemy'?.75:1);
  gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(level,at+.008);
  gain.gain.setValueAtTime(level,at+Math.max(.01,duration-.045));gain.gain.linearRampToValueAtTime(0,at+duration);
  node.connect(gain);gain.connect(player.output);active.set(node,channel);
  node.onended=()=>{active.delete(node);node.disconnect();gain.disconnect()};
  node.start(at,0,duration);
 }).catch(()=>{});
 return true;
}
function renderControl(button){if(!button)return;button.innerHTML='<svg class="ui-icon" aria-hidden="true"><use href="./assets/interface-icons.svg#'+(prefs.on?'volume':'muted')+'"></use></svg>';button.setAttribute('aria-label',prefs.on?'Silenciar efeitos sonoros':'Ativar efeitos sonoros');button.setAttribute('aria-pressed',String(prefs.on))}
function updateUI(){for(const id of ['soundToggle','battleSound','lobbySound'])renderControl(document.getElementById(id));const slider=document.getElementById('soundVolume');if(slider){slider.value=Math.round(prefs.volume*100);slider.disabled=!prefs.on}}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(prefs))}catch{};if(!prefs.on){stop();window.CercoVoices?.stop?.()}player.setEnabled(prefs.on);refreshMaster();updateUI()}
function setup(){document.getElementById('soundToggle')?.addEventListener('click',()=>{prefs.on=!prefs.on;persist();if(prefs.on)unlock()});document.getElementById('soundVolume')?.addEventListener('input',e=>{prefs.volume=Math.max(0,Math.min(1,Number(e.target.value)/100));persist()});updateUI();for(const key of new Set(Object.values(sounds).map(s=>s[0])))player.network(key).catch(()=>{})}
window.CercoAudio={play,stop,unlock,renderControl,updateUI,getSettings:()=>({...prefs}),isReady:()=>player.ctx?.state==='running',setEnabled:value=>{prefs.on=!!value;persist()},setDucking:value=>{ducked=!!value;refreshMaster()},played:()=>history.map(x=>({...x})),status:()=>({original:true,music:false,allowedEvents:['attack','damage','victory'],maxSimultaneous:4,active:active.size,recordings:Object.keys(api.FILES).length,loaded:player.buffers.size,failed:[...player.failed],fileNames:api.FILES}),player};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
