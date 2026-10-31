/* Página principal: progressão e presentes locais do Cerco dos Reis. */
(()=>{'use strict';
const $=selector=>document.querySelector(selector);
const api=window.CercoRewards;
if(!api)return;
let latestPrize=null;
const format=n=>Number(n||0).toLocaleString('pt-BR');
function element(tag,className,text){
 const el=document.createElement(tag);
 if(className)el.className=className;
 if(text!==undefined)el.textContent=String(text);
 return el;
}
function storedOldWins(){
 try{return Math.max(0,Number(JSON.parse(localStorage.getItem('cerco-reis-migracao-treino-v1')||'{}').wins)||0)}catch{return 0}
}
function render(){
 const s=api.snapshot();
 $('#homeLevel').textContent=format(s.level);
 $('#homeWins').textContent=format(Math.max(s.wins,storedOldWins()));
 $('#homeRecord').textContent=format(s.losses)+' derrotas registradas';
 $('#homeScrolls').textContent=format(s.scrolls);
 $('#homeOpened').textContent=format(s.opened);
 $('#homeXp').textContent=format(s.xp)+' / '+format(s.xpGoal)+' XP';
 $('#homeXpFill').style.width=Math.max(0,Math.min(100,100*s.xp/s.xpGoal))+'%';
 $('#homeScrollStock').textContent=s.scrolls===1?'1 pergaminho disponível':format(s.scrolls)+' pergaminhos disponíveis';
 $('#homeOpenScroll').disabled=s.scrolls===0;
 const materials=$('#homeMaterials');materials.replaceChildren();
 for(const [key,item] of Object.entries(api.materials)){
  const tile=element('div','home-material');
  tile.append(element('span','home-material-icon',item.icon));
  const content=element('div','home-material-info');
  content.append(element('strong','',item.name),element('small','',item.description));
  tile.append(content,element('b','',format(s.materials[key]||0)));materials.append(tile);
 }
 const skins=$('#homePremiumSkins');skins.replaceChildren();
 for(const skin of api.skins){
  const tile=element('div','home-skin');
  tile.style.setProperty('--skin-accent',skin.color);
  tile.append(element('span','home-skin-symbol','♜'));
  const details=element('div','home-skin-content');
  details.append(element('strong','',skin.name),element('small','',skin.character+' · Assinantes mensais'));
  tile.append(details,element('span','home-lock','🔒'));skins.append(tile);
 }
 const history=$('#homeHistory');history.replaceChildren();
 if(!s.history.length)history.append(element('p','home-history-empty','Vença uma batalha para começar sua história e conquistar um Pergaminho de Liliti.'));
 for(const item of [...s.history].reverse().slice(0,7)){
  const row=element('div','home-history-row');
  const mark=element('span','',item.type==='win'?'⚔':item.type==='prize'?'📜':item.type==='upgrade'?'⚒':'◈');
  const body=element('div','');
  body.append(element('span','',item.text));
  const date=Number.isFinite(Number(item.at))?new Date(Number(item.at)).toLocaleDateString('pt-BR'):'';
  body.append(element('small','',date));row.append(mark,body);history.append(row);
 }
 if(latestPrize){
  const message=$('#homeRewardMessage');
  message.classList.add('won');
  message.textContent='✦ Você recebeu '+latestPrize.qty+' × '+latestPrize.name+'! Materiais adicionados ao inventário.';
 }else{
  $('#homeRewardMessage').classList.remove('won');
  $('#homeRewardMessage').textContent=s.scrolls?'Abra um pergaminho para revelar o seu prêmio.':'Vença uma partida para conquistar o primeiro pergaminho.';
 }
}
function go(view){
 const btn=$('#navigation [data-view="'+view+'"]');
 btn?.click();
}
$('#homePlay').addEventListener('click',()=>{
 go('arena');
 $('#start')?.click();
});
$('#homeToCards').addEventListener('click',()=>go('cards'));
$('#homeToForge').addEventListener('click',()=>{
 go('cards');
 document.querySelector('#cardTabs [data-tab="evolution"]')?.click();
});
$('#homeOpenScroll').addEventListener('click',()=>{
 const won=api.openScroll();
 if(won)latestPrize=won;
 render();
});
document.addEventListener('cerco:rewards',render);
document.querySelector('#navigation [data-view="home"]')?.addEventListener('click',render);
window.CercoHome={render};
render();
})();