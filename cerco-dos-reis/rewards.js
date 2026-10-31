/* Cerco dos Reis — progressão e Pergaminhos de Liliti (treinamento local).
 * Os presentes desta versão são locais e NÃO representam itens online.
 * Compra individual de skins é permitida a qualquer jogador no Khar Tall.
 * Apenas fragmentos recebidos em pergaminhos exigem assinatura verificada.
 * O Cerco estático ainda não sincroniza compras/assinaturas entre contas.
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
const PRICE_CENTS=250;
const STORE_URL='https://khar-tall-online.onrender.com/loja';
const SKINS=Object.freeze([
 {id:'skin_green_light',name:'Verde Claro',character:'Exército',color:'#9ce6af'},
 {id:'skin_blue_light',name:'Azul Claro',character:'Exército',color:'#9ed9ff'},
 {id:'skin_red_light',name:'Vermelho Claro',character:'Exército',color:'#ffa6a0'},
 {id:'skin_purple_light',name:'Roxo Claro',character:'Exército',color:'#d8b0ff'},
 {id:'skin_pink_light',name:'Rosa Claro',character:'Exército',color:'#ffb4dd'},
 {id:'skin_gold_light',name:'Dourado Claro',character:'Exército',color:'#ffe7a0'},
 {id:'skin_orange_light',name:'Laranja Claro',character:'Exército',color:'#ffc18c'},
 {id:'skin_cyan_light',name:'Ciano Claro',character:'Exército',color:'#a0efed'}
]);
const defaultState=()=>({version:1,level:1,xp:0,wins:0,losses:0,scrolls:0,opened:0,
 materials:{iron:0,shards:0,crystals:0,essence:0},upgrades:{},
 history:[],creditedMatches:[],skins:[],skinFragments:{}});
let state=defaultState();
try{
 const saved=JSON.parse(localStorage.getItem(KEY)||'null');
 if(saved&&typeof saved==='object'&&saved.version===1){
  state={...defaultState(),...saved,
   materials:Object.fromEntries(Object.keys(MATERIALS).map(k=>[k,Math.max(0,Math.min(99999,Math.floor(Number(saved.materials?.[k])||0)))])),
   upgrades:(saved.upgrades&&typeof saved.upgrades==='object')?saved.upgrades:{},
   history:Array.isArray(saved.history)?saved.history.slice(-40):[],
   creditedMatches:Array.isArray(saved.creditedMatches)?saved.creditedMatches.slice(-150):[],
   skins:[], // direitos de compra exigem confirmação no servidor
   skinFragments:Object.fromEntries(SKINS.map(skin=>[skin.id,0])) // sem entitlement do servidor, não aceitar saldo local
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
 // 5% de fragmentos APENAS PARA ASSINANTES mensais verificados.
 // Não assinantes ganham materiais sempre, mas podem comprar skins avulsas.
 const subscriber=memberVerified();
 const roll=rng()*100;
 if(subscriber&&roll<5){
   const skin=SKINS[Math.floor(rng()*SKINS.length)];
   return {kind:'skinFragment',id:skin.id,qty:2,weight:5};
 }
 const normalized=subscriber?(roll-5)*(100/95):roll;
 if(normalized<50)return {kind:'material',id:'iron',qty:15,weight:50};
 if(normalized<76)return {kind:'material',id:'shards',qty:8,weight:26};
 if(normalized<93)return {kind:'material',id:'crystals',qty:3,weight:17};
 return {kind:'material',id:'essence',qty:1,weight:7};
}
function openScroll(){
 if(state.scrolls<1)return null;
 const prize=rollLoot();
 // Para resgate futuro, saldo e direito a fragmentos só podem ser
 // concedidos mediante assinatura confirmada no servidor.
 if(prize.kind==='skinFragment'&&!memberVerified())return null;
 state.scrolls--;
 state.opened++;
 let result;
 if(prize.kind==='skinFragment'){
   const skin=SKINS.find(s=>s.id===prize.id);
   state.skinFragments[prize.id]=safeNumber((state.skinFragments[prize.id]||0)+prize.qty);
   result={...prize,name:'Fragmentos de '+skin.name,icon:'✧',at:Date.now()};
 }else{
   state.materials[prize.id]=safeNumber(state.materials[prize.id]+prize.qty);
   result={...prize,name:MATERIALS[prize.id].name,icon:MATERIALS[prize.id].icon,at:Date.now()};
 }
 state.history.push({type:'prize',text:'Pergaminho aberto · '+result.qty+' × '+result.name,at:result.at});
 state.history=state.history.slice(-40);
 persist();return result;
}
function purchaseInfo(id){
 const skin=SKINS.find(x=>x.id===id);
 if(!skin)return null;
 return {id:skin.id,name:skin.name,priceCents:PRICE_CENTS,
    url:STORE_URL,availableToAll:true,
    note:'Compra única na loja oficial do Khar Tall, sem exigência de assinatura. O acesso no Cerco dos Reis ainda não está sincronizado com a loja original.'};
}
function fragmentProgress(id){
 return {count:memberVerified()?safeNumber(state.skinFragments[id]):0,
 required:10,subscriberOnly:true,verified:memberVerified()};
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
  subscriber:memberVerified(),premiumSkins:SKINS,skinFragments:memberVerified()?state.skinFragments:{},skinPrices:Object.fromEntries(SKINS.map(s=>[s.id,PRICE_CENTS]))
 }));
}
function reset(){
 state=defaultState();persist();
}
window.CercoRewards={
 snapshot,materials:MATERIALS,skins:SKINS,purchaseInfo,fragmentProgress,awardVictory,recordLoss,openScroll,
 recipe,upgrade,hasMonthlyMembership:memberVerified,reset,
 // Comprar skins é permitido a qualquer jogador; somente fragmentos dependem da assinatura.
 checkPremiumSkin:(id)=>!!purchaseInfo(id)
};
})();
