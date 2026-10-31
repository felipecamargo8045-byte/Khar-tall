/* Cerco dos Reis — progressão e Pergaminhos de Liliti (treinamento local).
 * Os presentes desta versão são locais e NÃO representam itens online.
 * Skins requerem verificação de assinatura mensal no servidor; não existe
 * aquisição/equipamento premium confiando em estado controlado pelo navegador.
 */
(()=>{'use strict';
const KEY='cerco-dos-reis-presentes-liliti-v1';
const MAX_SCROLLS=99;
const MATERIALS=Object.freeze({
 iron:{name:'Ferro Ancestral',icon:'⚒',description:'Reforça as armas e armaduras'},
 shards:{name:'Fragmentos de Eco',icon:'✦',description:'Concentram as vibrações dos Ecos'},
 crystals:{name:'Cristais da Chama',icon:'◆',description:'Despertam a forja de evolução'},
 essence:{name:'Essência de Liliti',icon:'☽',description:'Material raro dos pergaminhos'}
});
const SKINS=Object.freeze([
 {id:'liliti-luar',name:'Liliti · Luar Antigo',character:'Liliti',color:'#c38ce5'},
 {id:'rei-coroa',name:'Rei · Coroa Carmesim',character:'Rei',color:'#cb5f7f'},
 {id:'guardiao-voto',name:'Guardião · Voto Celeste',character:'Guardião',color:'#8abdeb'}
]);
const defaultState=()=>({version:1,level:1,xp:0,wins:0,losses:0,scrolls:0,opened:0,
 materials:{iron:0,shards:0,crystals:0,essence:0},upgrades:{},
 history:[],creditedMatches:[],skins:[]});
let state=defaultState();
try{
 const saved=JSON.parse(localStorage.getItem(KEY)||'null');
 if(saved&&typeof saved==='object'&&saved.version===1){
  state={...defaultState(),...saved,
   materials:Object.fromEntries(Object.keys(MATERIALS).map(k=>[k,Math.max(0,Math.min(99999,Math.floor(Number(saved.materials?.[k])||0)))])),
   upgrades:(saved.upgrades&&typeof saved.upgrades==='object')?saved.upgrades:{},
   history:Array.isArray(saved.history)?saved.history.slice(-40):[],
   creditedMatches:Array.isArray(saved.creditedMatches)?saved.creditedMatches.slice(-150):[],
   skins:[] // direito de uso de skin NUNCA é restaurado via localStorage
  };
 }
}catch{}
const safeNumber=n=>Math.max(0,Math.min(999999,Math.floor(Number(n)||0)));
function persist(){
 try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}
 notify();
}
function notify(){
 try{document.dispatchEvent(new CustomEvent('cerco:rewards',{detail:snapshot()}))}catch{}
}
function memberVerified(){
 // Esta versão não tem backend de pagamentos/assinaturas.
 // Não usar localStorage, flags VIP ou parâmetros da URL como prova de acesso.
 return false;
}
function xpGoal(level){return 100+Math.min(1400,(level-1)*45)}
function gainXp(value){
 state.xp+=safeNumber(value);
 while(state.xp>=xpGoal(state.level)&&state.level<99){
  state.xp-=xpGoal(state.level);state.level++;
 }
 if(state.level===99)state.xp=Math.min(state.xp,xpGoal(state.level));
}
function awardVictory(matchId){
 if(typeof matchId!=='string'||matchId.length<5)return false;
 if(state.creditedMatches.includes(matchId))return false;
 state.creditedMatches.push(matchId);
 state.creditedMatches=state.creditedMatches.slice(-150);
 state.wins=safeNumber(state.wins+1);
 state.scrolls=Math.min(MAX_SCROLLS,state.scrolls+1);
 gainXp(75);
 state.history.push({type:'win',text:'Vitória conquistada · +1 Pergaminho de Liliti · +75 XP',at:Date.now()});
 state.history=state.history.slice(-40);
 persist();return true;
}
function recordLoss(matchId){
 if(typeof matchId!=='string'||matchId.length<5||state.creditedMatches.includes(matchId))return false;
 state.creditedMatches.push(matchId);state.creditedMatches=state.creditedMatches.slice(-150);
 state.losses=safeNumber(state.losses+1);
 state.history.push({type:'loss',text:'Batalha encerrada · nenhuma recompensa de vitória',at:Date.now()});
 state.history=state.history.slice(-40);persist();return true;
}
function rng(){
 try{const n=new Uint32Array(1);crypto.getRandomValues(n);return n[0]/4294967296}catch{return Math.random()}
}
function rollLoot(){
 // Sem assinatura mensal verificada, skins NUNCA entram na rolagem.
 const roll=rng()*100;
 if(roll<50)return {kind:'material',id:'iron',qty:15,weight:50};
 if(roll<76)return {kind:'material',id:'shards',qty:8,weight:26};
 if(roll<93)return {kind:'material',id:'crystals',qty:3,weight:17};
 return {kind:'material',id:'essence',qty:1,weight:7};
}
function openScroll(){
 if(state.scrolls<1)return null;
 const prize=rollLoot();
 state.scrolls--;
 state.opened++;
 state.materials[prize.id]=safeNumber(state.materials[prize.id]+prize.qty);
 const result={...prize,name:MATERIALS[prize.id].name,icon:MATERIALS[prize.id].icon,at:Date.now()};
 state.history.push({type:'prize',text:'Pergaminho aberto · '+result.qty+' × '+result.name,at:result.at});
 state.history=state.history.slice(-40);
 persist();return result;
}
function recipe(id){
 const current=safeNumber(state.upgrades[id]);
 const stage=Math.min(current,4);
 return {stage,limit:4,requirements:{iron:10+stage*6,shards:5+stage*3,crystals:1+stage,essence:stage>=2?1:0}};
}
function upgrade(id){
 if(!/^[a-z][a-z0-9_-]{1,30}$/.test(id||''))return {ok:false,error:'Carta inválida'};
 const data=recipe(id);
 if(data.stage>=data.limit)return {ok:false,error:'Evolução máxima no treinamento'};
 for(const [key,qty] of Object.entries(data.requirements)){
  if(state.materials[key]<qty)return {ok:false,error:'Materiais insuficientes'};
 }
 for(const [key,qty] of Object.entries(data.requirements))state.materials[key]-=qty;
 state.upgrades[id]=data.stage+1;
 state.history.push({type:'upgrade',text:'Forja aprimorada · '+id+' · estágio '+(data.stage+1),at:Date.now()});
 state.history=state.history.slice(-40);persist();
 return {ok:true,stage:data.stage+1};
}
function snapshot(){
 return JSON.parse(JSON.stringify({
  level:state.level,xp:state.xp,xpGoal:xpGoal(state.level),
  wins:state.wins,losses:state.losses,scrolls:state.scrolls,opened:state.opened,
  materials:state.materials,upgrades:state.upgrades,history:state.history,
  subscriber:memberVerified(),premiumSkins:SKINS
 }));
}
function reset(){
 state=defaultState();persist();
}
window.CercoRewards={
 snapshot,materials:MATERIALS,skins:SKINS,awardVictory,recordLoss,openScroll,
 recipe,upgrade,hasMonthlyMembership:memberVerified,reset,
 // Teste público do cliente local: a decisão premium continua bloqueada.
 checkPremiumSkin:(id)=>memberVerified()&&SKINS.some(s=>s.id===id)
};
})();
