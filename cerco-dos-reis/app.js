/* Cerco dos Reis — motor LOCAL DE TREINAMENTO, separado do backend do Work.
   Nao representa o motor, as cartas, as compras nem as contas oficiais. */
(()=>{'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const ASSET='./origem-apk/assets/';const KEY='cerco-reis-migracao-treino-v1';
const cardData=[
{id:'lobo',name:'Lobo',kind:'Tropa · Velocidade',rarity:'Comum',cost:3,dmg:58,hp:260,units:2,range:32,speed:33,attackSpeed:.95,ability:'Bote do Lobo',desc:'Dois lobos velozes avançam em matilha. Seu primeiro bote ganha força.',effect:'O primeiro golpe de cada lobo causa 60% de dano adicional.',img:'portrait_lobo.webp',role:'Pressão rápida'},
{id:'arqueiro',name:'Arqueiro',kind:'Tropa · Distância',rarity:'Comum',cost:3,dmg:47,hp:150,units:2,range:100,speed:24,attackSpeed:1.25,ability:'Disparo de apoio',desc:'Dois arqueiros surgem juntos e disparam flechas de longe, cobrindo as duas rotas quando invocados no centro.',effect:'Mantém distância dos inimigos. Depois do nível Ouro, pode evoluir na batalha ao abater tropas.',img:'portrait_aprendiz_arqueiro.webp',role:'Cobertura'},
{id:'soldado',name:'Soldado',kind:'Tropa · Frente',rarity:'Comum',cost:2,dmg:49,hp:330,range:27,speed:25,attackSpeed:.9,ability:'Infantaria',desc:'Aprendiz que protege a linha de frente e abre caminho.',effect:'Depois do nível Ouro pode evoluir na batalha ao derrotar um alvo.',img:'portrait_aprendiz_soldado.webp',role:'Defesa inicial'},
{id:'colosso',name:'Colosso',kind:'Tropa · Pesada',rarity:'Rara',cost:6,dmg:133,hp:1040,range:32,speed:14,attackSpeed:1.9,ability:'Investida do Colosso',desc:'Um gigante capaz de romper fortificações.',effect:'Investida pesada: no treinamento o primeiro contato causa dano adicional.',img:'portrait_colosso.webp',role:'Demolição'},
{id:'guardiao',name:'Guardião',kind:'Tropa · Defesa',rarity:'Épica',cost:5,dmg:88,hp:820,range:65,speed:17,attackSpeed:1.6,ability:'Defesa do Guardião',desc:'Protege o espaço à sua volta e os aliados mais vulneráveis.',effect:'Ataque de médio alcance com foco na defesa.',img:'portrait_guardiao.webp',role:'Proteção'},
{id:'batedor',name:'Batedor',kind:'Tropa · Precisão',rarity:'Rara',cost:4,dmg:67,hp:210,range:112,speed:27,attackSpeed:1.3,ability:'Marca do Batedor',desc:'Caçador estratégico que marca e enfraquece alvos.',effect:'No treinamento, o segundo disparo no mesmo alvo causa dano extra.',img:'portrait_batedor.webp',role:'Marcação'},
{id:'rei',name:'Rei',kind:'Tropa · Comando',rarity:'Épica',cost:6,dmg:79,hp:880,range:38,speed:22,attackSpeed:1.4,ability:'Soberania',desc:'Comandante do exército, com caminhos especiais de evolução.',effect:'Rei de Sangue: roubo de vida. Rei da Matilha: invoca lobos periodicamente — progressões reservadas à integração original.',img:'portrait_rei.webp',role:'Comando'},
{id:'liliti',name:'Liliti',kind:'Tropa · Controle',rarity:'Lendária',cost:6,dmg:100,hp:750,range:92,speed:25,attackSpeed:1.25,ability:'Controle da Liliti',desc:'Carta lendária ruiva de olhos verdes. Manipula adversários e transforma o ritmo do combate.',effect:'Ataque de 100, regeneração pessoal equivalente a 50% do dano causado e controle temporário de alvos no treinamento.',img:'portrait_lilith_ruiva.webp',role:'Controle e sustentação'},
{id:'chama',name:'Chama Viva',kind:'Magia · Ataque',rarity:'Rara',cost:4,dmg:263,hp:0,range:85,speed:0,ability:'Explosão da Chama',desc:'O fogo atinge inimigos concentrados em uma das rotas.',effect:'Dano em área às tropas inimigas da rota escolhida.',img:'spell_fire.svg',role:'Dano em área',spell:true},
{id:'cura',name:'Campo de Cura',kind:'Magia · Suporte',rarity:'Rara',cost:4,dmg:0,hp:0,range:85,speed:0,ability:'Regeneração',desc:'Um campo mágico restaura a vida das suas tropas na rota escolhida.',effect:'Recupera 180 pontos de vida das tropas aliadas na rota.',img:'spell_heal.svg',role:'Suporte',spell:true},
{id:'armadilha',name:'Armadilha',kind:'Magia · Controle',rarity:'Rara',cost:3,dmg:172,hp:0,range:85,speed:0,ability:'Emboscada',desc:'Dano instantâneo e surpresa no caminho dos adversários.',effect:'Ataca o primeiro alvo inimigo da rota e o retarda por alguns instantes.',img:'spell_trap.svg',role:'Emboscada',spell:true}
];
const tiers=[{min:0,name:'Bronze',metal:'#bd824e',light:'#e8b576',dark:'#754328'},{min:20,name:'Prata',metal:'#cad3de',light:'#f5f8fb',dark:'#667e9b'},{min:40,name:'Ouro',metal:'#e9bf5f',light:'#fff0a9',dark:'#996b24'},{min:60,name:'Mítico',metal:'#bb9aff',light:'#e5c6ff',dark:'#5f419e'},{min:80,name:'Divino',metal:'#b0eefa',light:'#e9ffff',dark:'#3b8ca6'}];
const tier=l=>[...tiers].reverse().find(t=>l>=t.min)||tiers[0];
let local={cards:{},wins:0};try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved&&typeof saved==='object'){local={cards:saved.cards||{},wins:Number(saved.wins)||0}}}catch{};
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(local))}catch{}};
const prog=id=>local.cards[id]||{level:1,xp:0};
let chosen=cardData[0],tab='tech';
const cssTier=(el,t)=>{el.style.setProperty('--metal',t.metal);el.style.setProperty('--light',t.light);el.style.setProperty('--dark',t.dark)};
const cardImage=c=>ASSET+c.img;const fmt=v=>Number.isFinite(v)?v.toLocaleString('pt-BR'):'—';
function show(view){$$('.page').forEach(n=>n.classList.toggle('active',n.dataset.page===view));$$('#navigation button').forEach(n=>n.classList.toggle('active',n.dataset.view===view));if(view==='cards')renderCards();if(view==='home')window.CercoHome?.render?.();window.scrollTo({top:0,behavior:'smooth'})}
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.view)));
function imgFallback(e){if(!e.target.dataset.failed){e.target.dataset.failed='1';e.target.src=ASSET+'emblem.svg'}}
function renderCards(){const grid=$('#cardGrid');grid.replaceChildren();for(const c of cardData){const p=prog(c.id),t=tier(p.level),b=document.createElement('button');b.type='button';b.setAttribute('aria-pressed',String(chosen.id===c.id));b.className=chosen.id===c.id?'selected':'';cssTier(b,t);const image=document.createElement('img');image.src=cardImage(c);image.alt=c.name;image.addEventListener('error',imgFallback);const frame=document.createElement('span');frame.className='tile-img';frame.append(image);const label=document.createElement('strong');label.textContent=c.name;const lvl=document.createElement('small');lvl.textContent='Nível '+p.level;b.append(frame,label,lvl);b.addEventListener('click',()=>{chosen=c;tab='tech';renderCards()});grid.append(b)}
const c=chosen,p=prog(c.id),t=tier(p.level);cssTier($('#artOuter'),t);$('#fullArt').src=cardImage(c);$('#fullArt').alt='Imagem completa de '+c.name;$('#fullArt').onerror=imgFallback;$('#cardType').textContent=c.kind;$('#cardName').textContent=c.name;$('#cardText').textContent=c.desc;$('#cardBadges').replaceChildren();for(const s of [`Nível ${p.level}`,t.name,c.rarity]){const x=document.createElement('span');x.textContent=s;$('#cardBadges').append(x)};statTiles('#cardStats',[['Dano',c.dmg],['Vida',c.hp||'—'],['Energia',c.cost]]);$('#cardSkill').textContent=c.ability;$('#cardSkillText').textContent=c.effect;$('#xpLabel').textContent=`${p.xp} / 100 XP`;$('#xpFill').style.width=(p.level>=100?100:p.xp)+'%';$$('#cardTabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));const panel=$('#tabContent');panel.replaceChildren();if(tab==='tech'){const spec=document.createElement('div');spec.className='spec-grid';for(const [k,v] of [['Classe',c.kind],['Função',c.role],['Raridade',c.rarity],['Dano de base',c.dmg],['Vida de base',c.hp||'Não aplicável'],['Alcance',c.range||'Efeito em área'],['Velocidade',c.speed||'Instantânea'],['Energia',c.cost],['Habilidade',c.ability],['Ataque',c.attackSpeed?c.attackSpeed+' s':'Instantâneo']]){const row=document.createElement('div'),label=document.createElement('span'),value=document.createElement('b');label.textContent=k;value.textContent=String(v);row.append(label,value);spec.append(row)}panel.append(spec)}else if(tab==='evolution'){const upgradeApi=window.CercoRewards;
 const recipe=upgradeApi?.recipe?.(c.id);
 if(recipe){
  const panelForge=document.createElement('section');
  panelForge.className='evolution-forge';
  const heading=document.createElement('h3');heading.textContent='⚒ Forja de evolução · estágio '+recipe.stage+' / '+recipe.limit;
  panelForge.append(heading);
  const body=document.createElement('p');body.textContent='Cada estágio aumenta dano e vida em 4% nesta versão de treinamento. As evoluções são compradas com materiais dos Pergaminhos de Liliti.';
  panelForge.append(body);
  const req=document.createElement('div');req.className='spec-grid';
  const items=upgradeApi.materials;
  let canAfford=recipe.stage<recipe.limit;
  for(const [key,qty] of Object.entries(recipe.requirements)){
   if(!qty)continue;
   const have=upgradeApi.snapshot().materials[key]||0;
   if(have<qty)canAfford=false;
   const tile=document.createElement('div'),name=document.createElement('span'),status=document.createElement('b');
   name.textContent=items[key].icon+' '+items[key].name;
   status.textContent=have+' / '+qty;
   if(have<qty)status.style.color='#ffa6a6';
   tile.append(name,status);req.append(tile);
  }
  panelForge.append(req);
  const button=document.createElement('button');button.className='gold';button.type='button';
  button.disabled=!canAfford;
  button.textContent=recipe.stage>=recipe.limit?'EVOLUÇÃO MÁXIMA':canAfford?'✦ FORJAR EVOLUÇÃO':'MATERIAIS INSUFICIENTES';
  button.addEventListener('click',()=>{
   const result=upgradeApi.upgrade(c.id);
   if(!result.ok){window.alert(result.error);return}
   renderCards();
  });
  panelForge.append(button);
  panel.append(panelForge);
 }
 const steps=document.createElement('div');steps.className='tier-steps';tiers.forEach(x=>{const n=document.createElement('span');n.textContent=`${x.name} · nível ${x.min}`;n.style.borderColor=x.metal;steps.append(n)});panel.append(steps);const desc=document.createElement('p');desc.textContent=c.id==='rei'?'Caminhos: Rei de Sangue / Rei da Matilha. Habilidades oficiais serão ligadas ao servidor original.':c.id==='liliti'?'A raridade Lendária é independente da moldura; evoluir não altera a categoria Lendária.':'Molduras indicam o progresso do nível; os bônus definitivos dependem das regras do jogo original.';panel.append(desc)}else{const x=document.createElement('p');x.textContent=`Progresso local: nível ${p.level}, ${p.xp} de 100 XP. Treinamento contra IA: +1 XP por carta utilizada. O nível 100 exige validação especial no sistema original e não é concedido pelo treinamento.`;panel.append(x)}}
$$('#cardTabs button').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.tab;renderCards()}));
function statTiles(sel,arr){const target=$(sel);target.replaceChildren();arr.forEach(([k,v])=>{const d=document.createElement('div'),l=document.createElement('span'),b=document.createElement('strong');l.textContent=k;b.textContent=String(v);d.append(l,b);target.append(d)})}
function selectedCard(){const c=chosen;$('#selectedPortrait').src=cardImage(c);$('#selectedPortrait').onerror=imgFallback;$('#selectedName').textContent=c.name;$('#selectedDesc').textContent=c.desc;statTiles('#selectedStats',[['Dano',c.dmg],['Vida',c.hp||'—'],['Energia',c.cost]]);$('#selectedSkill').textContent=c.ability;$('#selectedSkillDesc').textContent=c.effect}
const canvas=$('#arena'),ctx=canvas.getContext('2d');const W=canvas.width,H=canvas.height;
const sprites=new Map(cardData.map(c=>{const i=new Image();i.src=cardImage(c);return[c.id,i]}));const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
let game,loop=0,ticker=0;let hand=['lobo','arqueiro','soldado','colosso'];let next=4;const queue=cardData.map(c=>c.id);let activeIndex=0;

// Partida é uma cena independente do portal: toda a janela é do jogo.
// Fullscreen nativo é opcional; CSS ocupa 100dvh mesmo quando o navegador o nega.
function enterBattle(){
 const stage=$('#battleStage');
 document.body.classList.add('battle-mode');
 document.documentElement.classList.add('battle-mode-root');
 document.body.style.overflow='hidden';
 try{window.scrollTo({top:0,behavior:'instant'})}catch{}
 if(stage?.requestFullscreen && !document.fullscreenElement){
   try{
    const promise=stage.requestFullscreen({navigationUI:'hide'});
    if(promise?.catch)promise.catch(()=>{});
   }catch{}
 }
 syncBattleButtons();
 requestAnimationFrame(()=>window.Cerco3D?.resize?.());
}
function exitBattle(){
 window.CercoVoices?.stop?.();
 document.body.classList.remove('battle-mode');
 document.documentElement.classList.remove('battle-mode-root');
 document.body.style.removeProperty('overflow');
 if(document.fullscreenElement){
   const promise=document.exitFullscreen?.();
   if(promise?.catch)promise.catch(()=>{});
 }
 reset();
 show('home');
 requestAnimationFrame(()=>window.Cerco3D?.resize?.());
}
function menuFromBattle(){
 if(game.running&&!game.paused){
   pause();
   const overlay=$('#overlay');
   const back=document.createElement('button');back.className='gold return-home';
   back.textContent='Sair da batalha';
   back.addEventListener('click',exitBattle);
   overlay.append(back);
 }else{
   exitBattle();
 }
}
function syncBattleButtons(){
 const pauseButton=$('#battlePause'),soundButton=$('#battleSound');
 if(pauseButton){
   pauseButton.textContent=game?.paused?'▶':'Ⅱ';
   pauseButton.setAttribute('aria-label',game?.paused?'Continuar batalha':'Pausar batalha');
 }
 if(soundButton){
   const enabled=window.CercoAudio?.getSettings?.().on!==false;
   soundButton.textContent=enabled?'♫':'♪̸';
   soundButton.setAttribute('aria-label',enabled?'Silenciar sons':'Ativar sons');
 }
}
function reset(){window.CercoVoices?.stop?.();cancelAnimationFrame(loop);clearInterval(ticker);game={running:false,paused:false,time:180,energy:6,max:10,last:0,units:[],towers:{ally:[1400,1400],enemy:[1400,1400]},castles:{ally:2600,enemy:2600},counter:0,aiTimer:0,message:'',result:null,projectiles:[],effects:[],attackShots:[],attackFx:[],attackHistory:[],towerTimers:{},towerShots:[],defenseHits:0,destroyedStructures:[]};hand=['lobo','arqueiro','soldado','colosso'];next=4;activeIndex=0;$('#overlay').hidden=false;$('#overlay').innerHTML='<span class="overline">DOIS EXÉRCITOS · UM TRONO</span><h2>O cerco começa com você.</h2><p>3 minutos, duas rotas e cartas com habilidades próprias.</p><button class="gold" id="start">⚔ Iniciar treinamento</button>';$('#start').addEventListener('click',start);$('#pause').disabled=true;$('#pause').textContent='Pausar';syncBattleButtons();updateUI();draw()}
function start(){game.matchId=(globalThis.crypto?.randomUUID?.()||String(Date.now())+'-'+Math.random().toString(36).slice(2));window.CercoVoices?.unlock?.();enterBattle();game.running=true;game.paused=false;game.result=null;game.last=performance.now();$('#overlay').hidden=true;$('#pause').disabled=false;clearInterval(ticker);ticker=setInterval(()=>advanceByClock(performance.now()),65);log('O cerco começou. Defenda suas torres!');loop=requestAnimationFrame(step)}
function result(winner){if(!game.running)return;if(winner==='ally'){window.CercoAudio?.play('victory');window.CercoVoices?.speak?.('rei','victory')}game.running=false;clearInterval(ticker);cancelAnimationFrame(loop);$('#overlay').hidden=false;const win=winner==='ally';if(win){local.wins++;save();window.CercoRewards?.awardVictory?.(game.matchId)}else{window.CercoRewards?.recordLoss?.(game.matchId)}$('#overlay').innerHTML='';const over=document.createElement('span');over.className='overline';over.textContent='O CERCO TERMINOU';const t=document.createElement('h2');t.textContent=win?'Vitória':'Derrota';const p=document.createElement('p');p.textContent=win?'Seu reino venceu o treinamento.':'Reorganize as cartas e tente novamente.';const b=document.createElement('button');b.className='gold';b.textContent='Jogar novamente';b.addEventListener('click',()=>{reset();start()});$('#overlay').append(over,t,p,b);const home=document.createElement('button');home.className='secondary-btn';home.textContent='Voltar ao menu';home.addEventListener('click',exitBattle);$('#overlay').append(home);syncBattleButtons();updateUI()}
function pause(){if(!game.running)return;game.paused=!game.paused;if(game.paused)window.CercoVoices?.stop?.();syncBattleButtons();$('#pause').textContent=game.paused?'Continuar':'Pausar';if(game.paused){$('#overlay').hidden=false;$('#overlay').innerHTML='<h2>Batalha pausada</h2><p>Seu reino pode esperar.</p><button class="gold" id="resume">Continuar batalha</button>';$('#resume').addEventListener('click',pause)}else{$('#overlay').hidden=true;game.last=performance.now();loop=requestAnimationFrame(step)}}
function log(s){const line=document.createElement('p');line.textContent=s;$('#battleLog').prepend(line);while($('#battleLog').children.length>8)$('#battleLog').lastElementChild.remove()}

const LANES=[110,310];
const SPAWN_MARGIN=22;
const TARGET_AWARENESS=165;
const point=(x,y)=>({x:clamp(x,SPAWN_MARGIN,W-SPAWN_MARGIN),y:clamp(y,SPAWN_MARGIN,H-SPAWN_MARGIN)});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function closestEnemyAt(side,pos,maxDistance=TARGET_AWARENESS){
 let result=null,best=maxDistance;
 for(const unit of game.units){
   if(unit.side===side||unit.hp<=0)continue;
   const d=distance(pos,unit);
   if(d<best){result=unit;best=d}
 }
 return result;
}
function tacticalLane(x,y,side,index,count){
 const closeEnemy=closestEnemyAt(side,{x,y},TARGET_AWARENESS);
 if(closeEnemy)return closeEnemy.x<W/2?0:1;
 if(Math.abs(x-W/2)<=62){
   // Dois personagens no centro: cada um avança para um lado.
   if(count>1)return index%2;
   // Unidade sozinha: escolhe o caminho estratégico com menor vida na torre.
   const towers=game.towers[side==='ally'?'enemy':'ally'];
   return towers[0]===towers[1]?(game.counter%2):towers[0]<towers[1]?0:1;
 }
 return x<W/2?0:1;
}
// O toque é livre em toda a arena, mas unidades terrestres não nascem dentro da água.
// Ao tocar no rio fora da ponte, a unidade chega à margem do lado de seu exército.
function groundSpawn(location,side){
 const spot=point(location.x,location.y);
 if(spot.y>RIVER_TOP&&spot.y<RIVER_BOTTOM&&!onBridge(spot.x)){
  spot.y=side==='ally'?RIVER_BOTTOM+SHORE_PADDING+4:RIVER_TOP-SHORE_PADDING-4;
 }
 return spot;
}
function addUnit(c,location,side){
 const spot=groundSpawn(location,side);
 const count=c.units||1;
 const ids=[];
 for(let i=0;i<count;i++){
   // Uma invocação de grupo cria personagens distintos, sem sobrepor suas artes.
   // A formação parte do toque: duplas lado a lado, demais tropas em leque.
   const column=i-(count-1)/2;
   const spacing=count===2?57:43;
   const x=clamp(spot.x+column*spacing,SPAWN_MARGIN,W-SPAWN_MARGIN);
   const y=clamp(spot.y+(i%2===0?-7:7),SPAWN_MARGIN,H-SPAWN_MARGIN);
   const lane=tacticalLane(spot.x,spot.y,side,i,count);
   const nearby=closestEnemyAt(side,{x,y},TARGET_AWARENESS);
   const id=cryptoRandom();
   const boost=1+0.04*(window.CercoRewards?.snapshot?.().upgrades?.[c.id]||0);
   const maxHp=Math.round(c.hp*boost);
   const unit={id,card:c,side,lane,x,y,hp:maxHp,maxHp,damageMultiplier:boost,cooldown:0,
     first:true,mark:null,stun:0,targetId:nearby?.id||null,state:'walk'};
   game.units.push(unit);
   ids.push(id);
 }
 // Sincronizar as instâncias 3D assim que o grupo nasce, não só no próximo frame.
 // Mantém duplas separadas mesmo quando o celular demora a redesenhar.
 window.Cerco3D?.syncNow?.(game);
 return ids;
}
function cryptoRandom(){game.counter++;return game.counter}
function cast(id){
 if(!game.running||game.paused)return;
 const c=cardData.find(x=>x.id===id);
 if(!c||game.energy<c.cost){log('Energia insuficiente para '+(c?.name||'esta carta'));return}
 game.energy-=c.cost;
 
 const spot=point(game.spawn?.x??W/2,game.spawn?.y??H*.7);
 if(c.spell){
   const targets=game.units.filter(u=>u.side===(c.id==='cura'?'ally':'enemy')&&
     distance(u,spot)<=Math.max(65,c.range||85));
   if(c.id==='cura'){
     targets.forEach(u=>u.hp=Math.min(u.maxHp,u.hp+180));
     log('Campo de Cura restaurou '+targets.length+' tropa(s).');
   }else if(c.id==='chama'){
     targets.forEach(u=>receiveDamage(u,c.dmg));
     log('Chama Viva atingiu '+targets.length+' inimigo(s).');
   }else{
     const u=targets.sort((a,b)=>distance(a,spot)-distance(b,spot))[0];
     if(u){receiveDamage(u,c.dmg);u.stun=1.4}log('Armadilha ativada!');
   }
 }else{
   const created=addUnit(c,spot,'ally');
   
   
   const lanes=created.map(i=>game.units.find(u=>u.id===i)?.lane);
   if(created.length>1&&lanes.includes(0)&&lanes.includes(1))
      log(c.name+': grupo dividido entre esquerda e direita.');
   else log(c.name+' invocado onde você tocou.');
 }
 const p=prog(c.id);
 if(p.level<99){p.xp++;if(p.xp>=100){p.xp=0;p.level++}local.cards[c.id]=p;save()}
 const index=hand.indexOf(id);
 if(index>=0){hand[index]=queue[next%queue.length];next++}
 activeIndex=0;updateUI();
}
function aiCast(){
 const choices=cardData.filter(c=>!c.spell&&c.cost<7);
 const c=choices[Math.floor(Math.random()*choices.length)];
 // A IA também usa um ponto, não uma posição artificial na frente do castelo.
 const x=Math.random()<.16?W/2:(Math.random()<.5?110:310);
 const y=clamp(78+Math.random()*92,SPAWN_MARGIN,H-SPAWN_MARGIN);
 addUnit(c,{x,y},'enemy');
 
 log('Exército rubro invocou '+c.name);
}
// O rio é uma barreira física. Somente as duas pontes permitem travessia.
// A unidade pode nascer em qualquer ponto da arena; a restrição é sobre o
// CAMINHO durante a travessia, nunca sobre a escolha da carta.
const RIVER_TOP=H/2-24;
const RIVER_BOTTOM=H/2+24;
const BRIDGE_HALF_WIDTH=39;
const SHORE_PADDING=11;
function bridgeFor(x){
 return LANES.reduce((best,lane,index)=>{
  const cost=Math.abs(x-lane);
  return cost<best.cost?{lane:index,cost}:best;
 },{lane:0,cost:Infinity}).lane;
}
function onBridge(x){return LANES.some(b=>Math.abs(x-b)<=BRIDGE_HALF_WIDTH)}
function riverSide(y){
 if(y<=RIVER_TOP)return -1;
 if(y>=RIVER_BOTTOM)return 1;
 return 0;
}
function chooseBridge(from,to,lanePreference){
 // Custo total considera a posição atual, a ponte e o destino: duas
 // rotas possíveis, nenhuma travessia ilegal por água.
 let choice=lanePreference===1?1:0,score=Infinity;
 for(let i=0;i<LANES.length;i++){
  const bx=LANES[i];
  const enter={x:bx,y:from.y>H/2?RIVER_BOTTOM+SHORE_PADDING:RIVER_TOP-SHORE_PADDING};
  const exit={x:bx,y:to.y>H/2?RIVER_BOTTOM+SHORE_PADDING:RIVER_TOP-SHORE_PADDING};
  const cost=distance(from,enter)+distance(exit,to)+(i===lanePreference?0:13);
  if(cost<score){score=cost;choice=i}
 }
 return choice;
}
function safeRiverStep(u,next){
 // Evita ultrapassar lateralmente a margem e também protege do empurrão de aliados.
 const previous=u.y,insideBefore=previous>RIVER_TOP&&previous<RIVER_BOTTOM;
 const crossingUpper=previous<=RIVER_TOP&&next.y>RIVER_TOP;
 const crossingLower=previous>=RIVER_BOTTOM&&next.y<RIVER_BOTTOM;
 const insideAfter=next.y>RIVER_TOP&&next.y<RIVER_BOTTOM;
 if(!onBridge(next.x)&&(crossingUpper||crossingLower||insideBefore||insideAfter)){
  if(crossingUpper){next.y=RIVER_TOP;return}
  if(crossingLower){next.y=RIVER_BOTTOM;return}
  // Invocação no rio: conduzir à ponte próxima, sem atravessar por água.
  next.y=previous;
 }
}
function moveUnit(u,goal,dt){
 const dx=goal.x-u.x,dy=goal.y-u.y;
 const d=Math.hypot(dx,dy);
 if(d<.6){u.state='idle';return d}
 let waypoint=goal;
 const fromSide=riverSide(u.y),toSide=riverSide(goal.y);
 const across=(fromSide!==0&&toSide!==0&&fromSide!==toSide);
 const insideRiver=fromSide===0;
 if(across||insideRiver){
  const lane=chooseBridge(u,goal,u.lane);
  const bx=LANES[lane];
  u.bridgeLane=lane;
  const approachY=fromSide<0?RIVER_TOP-SHORE_PADDING:fromSide>0?RIVER_BOTTOM+SHORE_PADDING:(u.y<H/2?RIVER_TOP-SHORE_PADDING:RIVER_BOTTOM+SHORE_PADDING);
  const exitY=fromSide<0?RIVER_BOTTOM+SHORE_PADDING:fromSide>0?RIVER_TOP-SHORE_PADDING:(goal.y>H/2?RIVER_BOTTOM+SHORE_PADDING:RIVER_TOP-SHORE_PADDING);
  const approach={x:bx,y:approachY};
  if(!onBridge(u.x)||Math.abs(u.y-approachY)>SHORE_PADDING+5&&fromSide!==0){
   // Aponta diretamente para a entrada da ponte. O próximo passo é
   // validado contra a margem, então nunca corta o rio na diagonal.
   waypoint=approach;
  }else if(fromSide===0){
   waypoint={x:bx,y:exitY};
  }else{
   waypoint={x:bx,y:exitY};
  }
 }
 const wx=waypoint.x-u.x,wy=waypoint.y-u.y;
 const wd=Math.hypot(wx,wy);
 if(wd<.6){u.state='idle';return d}
 const speed=u.card.speed||20;
 const travel=Math.min(wd,Math.max(0,speed*dt));
 const next={x:clamp(u.x+wx/wd*travel,SPAWN_MARGIN,W-SPAWN_MARGIN),
             y:clamp(u.y+wy/wd*travel,SPAWN_MARGIN,H-SPAWN_MARGIN)};
 safeRiverStep(u,next);
 const moved=Math.hypot(next.x-u.x,next.y-u.y);
 if(moved>.0001)u.heading=Math.atan2(next.y-u.y,next.x-u.x);
 u.x=next.x;u.y=next.y;
 u.state=moved>.005?'walk':'idle';
 return d;
}
function selectThreat(u){
 const awareness=Math.max(TARGET_AWARENESS,(u.card.range||0)*1.55);
 let existing=game.units.find(o=>o.id===u.targetId&&o.side!==u.side&&o.hp>0);
 if(existing&&distance(u,existing)>awareness*1.18)existing=null;
 let best=existing;
 let bestDistance=existing?distance(u,existing)*.82:awareness;
 for(const other of game.units){
   if(other.side===u.side||other.hp<=0)continue;
   const d=distance(u,other);
   if(d<bestDistance){best=other;bestDistance=d}
 }
 u.targetId=best?.id??null;
 if(best)u.lane=best.x<W/2?0:1;
 return best;
}
// Perfis individuais: animação, projétil, alcance visual e efeito de impacto.
// Estes tipos controlam movimento, áudio e VFX; o dano e as habilidades continuam
// vindos exclusivamente das fichas das cartas.
const ATTACK_STYLES={
 lobo:{kind:'bite',audio:'wolf',ranged:false,impact:.32},
 arqueiro:{kind:'arrow',audio:'arrow',ranged:true,impact:.32},
 soldado:{kind:'slash',audio:'slash',ranged:false,impact:.30},
 colosso:{kind:'slam',audio:'colossus',ranged:false,impact:.54},
 guardiao:{kind:'shield',audio:'shield',ranged:true,impact:.42},
 batedor:{kind:'mark',audio:'mark',ranged:true,impact:.39},
 rei:{kind:'royal',audio:'royal',ranged:false,impact:.40},
 liliti:{kind:'enchant',audio:'enchant',ranged:true,impact:.55}
};
function attackVisual(kind,x,y,side,phase='impact'){
 const life=ATTACK_STYLES[kind]?.impact||.35;
 const fx={id:++game.counter,x,y,side,kind,phase,life:phase==='release'?.17:life,maxLife:phase==='release'?.17:life};
 game.attackFx.push(fx);
 if(game.attackFx.length>55)game.attackFx.shift();
 return fx;
}
// Eventos sonoros verdadeiros do combate. Os efeitos originais do Khar Tall
// são disparados apenas ao receber dano, destruir uma estrutura ou vencer.
function receiveDamage(unit,amount){
 if(!unit||unit.hp<=0||amount<=0)return false;
 const before=unit.hp;
 unit.hp=Math.max(0,before-amount);
 if(unit.hp<before){
  unit.hitPulse=Math.max(unit.hitPulse||0,.24);
  window.CercoAudio?.play('damage',{card:unit.card.id,side:unit.side});
  if(unit.hp>0)window.CercoVoices?.speak?.(unit.card.id,'hurt');
 }
 return unit.hp<before;
}
function receiveFortressDamage(side,lane,amount){
 if(amount<=0||!['ally','enemy'].includes(side))return false;
 const castle=lane===-1;
 if(!castle && lane!==0 && lane!==1)return false;
 const before=castle?game.castles[side]:game.towers[side][lane];
 if(before<=0)return false;
 const after=Math.max(0,before-amount);
 if(castle)game.castles[side]=after;
 else game.towers[side][lane]=after;
 if(after===0){
  const kind=castle?'castleDestroyed':'towerDestroyed';
  game.destroyedStructures.push({side,lane,kind,time:game.time});
  window.CercoAudio?.play(kind,{side,lane});
 }else{
  window.CercoAudio?.play('damage',{side,lane});
 }
 return true;
}
function applyAttackDamage(shot,target){
 if(target&&target.hp>0&&target.side!==shot.side){
   receiveDamage(target,shot.damage);
   target.hitPulse=.27;
   if(shot.kind==='enchant'){
     const caster=game.units.find(u=>u.id===shot.sourceId&&u.hp>0);
     if(caster)caster.hp=Math.min(caster.maxHp,caster.hp+shot.damage*.5);
   }
   attackVisual(shot.kind,target.x,target.y,shot.side);
   
   return true;
 }
 if(shot.structureSide){
   const side=shot.structureSide,lane=shot.structureLane;
   if(!receiveFortressDamage(side,lane,shot.damage))return false;
   attackVisual(shot.kind,shot.toX,shot.toY,shot.side);
   
   return true;
 }
 return false;
}
function startTroopAttack(u,target,damage,structureSide=null,structureLane=null,position=null){
 const profile=ATTACK_STYLES[u.card.id]||ATTACK_STYLES.soldado;
 const aim=target?{x:target.x,y:target.y}:position||{x:u.x,y:u.y-40};
 const finishMark=u.card.id==='batedor'&&!!target&&u.mark===target.id;
 u.heading=Math.atan2(aim.y-u.y,aim.x-u.x);
 u.attackKind=profile.kind;u.state='attack';u.attackPulse=MOTION_ATTACK_SECONDS;
 u.attacks=(u.attacks||0)+1;
 u.lastAttackAt=game.time;
 u.mark=target?.id||null;u.first=false;
 const shot={
   id:++game.counter,sourceId:u.id,side:u.side,cardId:u.card.id,
   kind:profile.kind,variant:finishMark?'red':'blue',damage,targetId:target?.id??null,
   structureSide,structureLane,
   x:u.x,y:u.y,fromX:u.x,fromY:u.y,toX:aim.x,toY:aim.y,progress:0,
   duration:Math.min(.64,Math.max(.23,distance(u,aim)/(u.card.id==='arqueiro'?225:290))),
   ranged:profile.ranged
 };
 game.attackHistory.push({id:shot.id,sourceId:u.id,card:u.card.id,kind:profile.kind,ranged:profile.ranged,targetId:shot.targetId,time:game.time});
 if(game.attackHistory.length>90)game.attackHistory.shift();
 attackVisual(profile.kind,u.x,u.y,u.side,'release');
 window.CercoAudio?.play(finishMark?'markRed':profile.audio,{card:u.card.id});
 window.CercoVoices?.speak?.(u.card.id,'attack');
 if(profile.ranged){
   game.attackShots.push(shot);
   if(game.attackShots.length>38)game.attackShots.shift();
 }else applyAttackDamage(shot,target);
}
function advanceTroopAttacks(dt){
 for(let i=game.attackShots.length-1;i>=0;i--){
   const shot=game.attackShots[i];
   shot.progress=Math.min(1,shot.progress+dt/shot.duration);
   const target=game.units.find(u=>u.id===shot.targetId&&u.hp>0&&u.side!==shot.side);
   if(target){shot.toX=target.x;shot.toY=target.y}
   shot.x=shot.fromX+(shot.toX-shot.fromX)*shot.progress;
   shot.y=shot.fromY+(shot.toY-shot.fromY)*shot.progress;
   if(shot.progress>=1){
     applyAttackDamage(shot,target);
     game.attackShots.splice(i,1);
   }
 }
 for(let i=game.attackFx.length-1;i>=0;i--){
   game.attackFx[i].life-=dt;
   if(game.attackFx[i].life<=0)game.attackFx.splice(i,1);
 }
}
function combat(u,dt){
 if(u.stun>0){u.stun=Math.max(0,u.stun-dt);u.state='stun';return}
 u.cooldown-=dt;
 const target=selectThreat(u);
 if(target){
   const d=distance(u,target),reach=(u.card.range||32)+8;
   if(d<=reach){
     if(u.cooldown<=0){
       let damage=u.card.dmg*(u.damageMultiplier||1);
       if(u.first&&u.card.id==='lobo')damage*=1.6;
       if(u.first&&u.card.id==='colosso')damage*=1.4;
       if(u.card.id==='batedor'&&u.mark===target.id)damage*=1.4;
       startTroopAttack(u,target,damage);
       u.cooldown=u.card.attackSpeed||1.25;
     }else if(u.attackPulse<=0){u.state='idle'}
   }else moveUnit(u,target,dt);
   return;
 }
 const opponent=u.side==='ally'?'enemy':'ally';
 const lane=u.lane??(u.x<W/2?0:1);
 const standing=game.towers[opponent][lane]>0;
 const goal=standing?{x:LANES[lane],y:opponent==='enemy'?126:H-46}:
   {x:W/2,y:opponent==='enemy'?73:H-19};
 const reach=(u.card.range||32)+12;
 if(distance(u,goal)<=reach){
   if(u.cooldown<=0){
     const cardId=u.card.id;
     startTroopAttack(u,null,u.card.dmg*(u.damageMultiplier||1),opponent,standing?lane:-1,goal);
     u.cooldown=u.card.attackSpeed||1.1;
   }else if(u.attackPulse<=0)u.state='idle';
 }else moveUnit(u,goal,dt);
}
// Personagens podem escolher a mesma rota, mas não devem se fundir visualmente.
// A separação é puramente espacial: não muda quantidade, dano nem alvo escolhido.
function separateFriendlyUnits(){
 for(let i=0;i<game.units.length;i++){
  const a=game.units[i];if(a.hp<=0)continue;
  for(let j=i+1;j<game.units.length;j++){
   const b=game.units[j];if(a.side!==b.side||b.hp<=0)continue;
   const dx=b.x-a.x,dy=b.y-a.y;
   const dist=Math.hypot(dx,dy)||.0001;
   const minDist=(a.card.id==='colosso'||b.card.id==='colosso')?58:49;
   if(dist>=minDist)continue;
   const push=Math.min(4.4,(minDist-dist)/2);
   const ux=dist>.01?dx/dist:(a.id%2?1:-1),uy=dist>.01?dy/dist:0;
   const nextA={x:clamp(a.x-ux*push,SPAWN_MARGIN,W-SPAWN_MARGIN),
                y:clamp(a.y-uy*push,SPAWN_MARGIN,H-SPAWN_MARGIN)};
   const nextB={x:clamp(b.x+ux*push,SPAWN_MARGIN,W-SPAWN_MARGIN),
                y:clamp(b.y+uy*push,SPAWN_MARGIN,H-SPAWN_MARGIN)};
   safeRiverStep(a,nextA);safeRiverStep(b,nextB);
   a.x=nextA.x;a.y=nextA.y;
   b.x=nextB.x;b.y=nextB.y;
  }
 }
}

// Defesa automática das quatro torres e dos dois castelos centrais.
// Nenhuma cobrança, inventário ou partida online envolvida.
const DEFENSE_RANGE={tower:146,castle:118};
const DEFENSE_DAMAGE={tower:76,castle:95};
const DEFENSE_INTERVAL={tower:1.55,castle:1.95};
const TOWER_POSITIONS={
 enemy:[{x:110,y:124},{x:310,y:124},{x:210,y:69}],
 ally:[{x:110,y:H-49},{x:310,y:H-49},{x:210,y:H-19}]
};
function defendFromTowers(dt){
 for(const side of ['ally','enemy']){
  for(let slot=0;slot<3;slot++){
   const isKeep=slot===2,key=side+'-'+slot;
   const alive=isKeep?game.castles[side]>0:game.towers[side][slot]>0;
   if(!alive)continue;
   game.towerTimers[key]=Math.max(0,(game.towerTimers[key]??(slot*.19))-dt);
   if(game.towerTimers[key]>0)continue;
   const origin=TOWER_POSITIONS[side][slot],range=DEFENSE_RANGE[isKeep?'castle':'tower'];
   // Torres priorizam inimigos mais próximos, com tie-break em menor vida.
   const visible=game.units.filter(u=>u.hp>0&&u.side!==side&&distance(u,origin)<=range);
   visible.sort((a,b)=>(distance(a,origin)-distance(b,origin)) || (a.hp-b.hp));
   if(!visible.length)continue;
   const target=visible[0];
   const travel=Math.max(.25,Math.min(.66,distance(origin,target)/240));
   const shot={
      id:++game.counter,source:side,slot,targetId:target.id,kind:'arrow',fortress:isKeep?'castle':'tower',
      x:origin.x,y:origin.y,fromX:origin.x,fromY:origin.y,
      toX:target.x,toY:target.y,progress:0,travel,
      damage:DEFENSE_DAMAGE[isKeep?'castle':'tower'],
      color:side==='ally'?'blue':'red'
   };
   game.projectiles.push(shot);
   if(game.projectiles.length>28)game.projectiles.shift();
   game.towerShots.push({side,slot,targetId:target.id,kind:'arrow',fortress:isKeep?'castle':'tower',time:game.time});
   if(game.towerShots.length>90)game.towerShots.shift();
   game.towerTimers[key]=DEFENSE_INTERVAL[isKeep?'castle':'tower'];
   window.CercoAudio?.play('tower',{side});
  }
 }
}
function advanceProjectiles(dt){
 for(let i=game.projectiles.length-1;i>=0;i--){
   const shot=game.projectiles[i];
   shot.progress=Math.min(1,shot.progress+dt/shot.travel);
   const target=game.units.find(u=>u.id===shot.targetId&&u.hp>0&&u.side!==shot.source);
   if(target){shot.toX=target.x;shot.toY=target.y}
   const t=shot.progress;
   shot.x=shot.fromX+(shot.toX-shot.fromX)*t;
   shot.y=shot.fromY+(shot.toY-shot.fromY)*t;
   if(t>=1){
     if(target&&distance(shot,target)<26){
       receiveDamage(target,shot.damage);
       target.hitPulse=.20;
       game.defenseHits++;
       
       game.effects.push({id:shot.id,x:target.x,y:target.y,color:shot.color,life:.32,maxLife:.32});
     }else{
       game.effects.push({id:shot.id,x:shot.x,y:shot.y,color:shot.color,life:.16,maxLife:.16});
     }
     game.projectiles.splice(i,1);
   }
 }
 for(let i=game.effects.length-1;i>=0;i--){
  game.effects[i].life-=dt;
  if(game.effects[i].life<=0)game.effects.splice(i,1);
 }
}
function tick(dt){game.time=Math.max(0,game.time-dt);game.energy=clamp(game.energy+dt*(game.time<60?1.2:.7),0,10);game.aiTimer+=dt;const speed=$('#difficulty').value;const interval=speed==='easy'?6.2:speed==='hard'?2.9:4.4;if(game.aiTimer>=interval){game.aiTimer=0;aiCast()}defendFromTowers(dt);for(const u of game.units){u.motionTime=(u.motionTime||0)+dt;u.attackPulse=Math.max(0,(u.attackPulse||0)-dt);combat(u,dt);
 // Um passo grave apenas enquanto o Colosso realmente caminha.
 // Cada unidade controla seu ritmo para não tocar som ao ficar parada.
 if(u.state==='walk'&&u.card.id==='colosso'){
   u.stepClock=(u.stepClock||0)+dt;
   if(u.stepClock>=.82){
     u.stepClock%=.82;
     window.CercoAudio?.play('step',{card:'colosso'});
   }
 }else u.stepClock=0;
 if(u.attackPulse>0&&u.stun<=0)u.state='attack';u.hitPulse=Math.max(0,(u.hitPulse||0)-dt);}advanceProjectiles(dt);advanceTroopAttacks(dt);separateFriendlyUnits();game.units=game.units.filter(u=>u.hp>0);if(game.castles.enemy<=0)result('ally');else if(game.castles.ally<=0)result('enemy');else if(game.time===0){let ally=game.castles.ally+game.towers.ally.reduce((a,b)=>a+b,0),enemy=game.castles.enemy+game.towers.enemy.reduce((a,b)=>a+b,0);result(ally>=enemy?'ally':'enemy')}}
function advanceByClock(now){
 if(!game.running||game.paused)return;
 // Intervalo lógico + RAF compartilham o mesmo relógio; nunca contam duas vezes.
 let delta=clamp((now-game.last)/1000||0,0,1.0);
 game.last=now;
 while(delta>.00001&&game.running){
   const dt=Math.min(.05,delta);
   tick(dt);
   delta-=dt;
 }
 updateClock();
}
function step(now){
 if(!game.running||game.paused)return;
 advanceByClock(now);
 draw();
 if(game.running)loop=requestAnimationFrame(step);
}
function updateClock(){const sec=Math.ceil(game.time);$('#timer').textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');// Mana recarrega normalmente, mas o jogador vê DEZ blocos inteiros.
 // Nunca aparece uma faixa correndo ou uma fração preenchendo outro bloco.
 const mana=Math.max(0,Math.min(10,Math.floor(game.energy+1e-7)));
 const bar=$('#manaBlocks');
 if(bar&&bar.children.length!==10){
   const fragment=document.createDocumentFragment();
   for(let i=0;i<10;i++){
     const piece=document.createElement('span');
     piece.className='mana-block';
     piece.setAttribute('aria-hidden','true');
     fragment.append(piece);
   }
   bar.replaceChildren(fragment);
 }
 if(bar){
   for(let i=0;i<bar.children.length;i++){
     const filled=i<mana;
     if(bar.children[i].classList.contains('filled')!==filled)
       bar.children[i].classList.toggle('filled',filled);
   }
   bar.setAttribute('aria-valuenow',String(mana));
   bar.setAttribute('aria-valuetext',mana+' de 10 blocos de mana');
 }
 $('#energy').textContent=mana+' / 10 MANA';$('#enemyCastle').textContent=fmt(Math.ceil(game.castles.enemy))+' PV';$('#allyCastle').textContent=fmt(Math.ceil(game.castles.ally))+' PV';}
const boardArt=new Image();boardArt.src=ASSET+'arena_atmosfera.webp';
// Castelo ilustrado em camadas góticas, com pedra e brasões próprios de cada time.
const fortressArt={};
for(const side of ['ally','enemy']){
 for(const kind of ['tower','keep']){
  const image=new Image();
  image.src='./assets/fortress_'+kind+'_'+side+'.svg';
  fortressArt[kind+'_'+side]=image;
 }
}
// Sprites recortados das artes existentes: personagens inteiros, nunca bolinhas.
const spriteNames=['lobo','arqueiro','soldado','colosso','guardiao','batedor','rei','liliti'];
const unitSprites=new Map(spriteNames.map(id=>{
 const image=new Image();image.src='./sprites/sprite_'+id+'.png';return[id,image];
}));
// Uma sprite-sheet gratuita por personagem: 10 caminhada, 6 repouso, 8 ataque.
const MOTION_FRAMES=24;
const MOTION_ATTACK_SECONDS=.58;
const motionSheets=new Map(spriteNames.map(id=>{
  const image=new Image();
  image.src='./motion/motion_'+id+'.webp';
  return [id,image];
}));
const motionRates={
  lobo:1.5, arqueiro:1.02, soldado:1, colosso:.65,
  guardiao:.85, batedor:1.17, rei:.87, liliti:1.08
};
function motionFrame(u,requestedState){
 const state=requestedState||u.state||'idle';
 const clock=Math.max(0,u.motionTime||0);
 const rate=motionRates[u.card.id]||1;
 if(state==='attack'){
   const progress=clamp(1-(u.attackPulse||0)/MOTION_ATTACK_SECONDS,0,1);
   return 16+Math.min(7,Math.floor(progress*8));
 }
 if(state==='walk')return Math.floor(clock*8.4*rate+u.id*.7)%10;
 // Respiração e pequenos ajustes de postura.
 return 10+Math.floor(clock*2.6*rate+u.id*.35)%6;
}
function drawMotionSprite(g,u,px,feet,width,height){
 const image=motionSheets.get(u.card.id);
 if(image?.complete&&image.naturalWidth&&image.naturalHeight){
   const frameWidth=image.naturalWidth/MOTION_FRAMES;
   const state=u.stun>0?'idle':(u.attackPulse>0?'attack':u.state);
   const frame=motionFrame(u,state);
   g.drawImage(image,frame*frameWidth,0,frameWidth,image.naturalHeight,
     px-width/2,feet-height,width,height);
   return;
 }
 // Até a sprite-sheet carregar, mostrar a arte inteira sem círculos.
 const backup=unitSprites.get(u.card.id);
 if(backup?.complete&&backup.naturalWidth){
   g.drawImage(backup,px-width/2,feet-height,width,height);
   return;
 }
 g.fillStyle=u.side==='ally'?'#5982a0':'#a55c67';
 g.beginPath();g.moveTo(px-11,feet);g.lineTo(px-10,feet-26);
 g.lineTo(px-15,feet-33);g.lineTo(px,feet-43);g.lineTo(px+15,feet-33);
 g.lineTo(px+10,feet-26);g.lineTo(px+11,feet);g.closePath();g.fill();
 g.fillStyle='#d7c19d';g.beginPath();g.arc(px,feet-41,7,0,Math.PI*2);g.fill();
}

function drawFortress(g,x,y,side,kind,hp){
 const asset=fortressArt[(kind==='castle'?'keep':'tower')+'_'+side];
 if(asset?.complete&&asset.naturalWidth){
  const width=kind==='castle'?84:85;
  const height=kind==='castle'?94:105;
  g.save();
  g.globalAlpha=hp<=0?.28:1;
  g.shadowColor='#020912b8';g.shadowBlur=6;g.shadowOffsetY=3;
  g.drawImage(asset,x-width/2,y-height,width,height);
  g.restore();
  return;
 }

 const enemy=side==='enemy';
 const accent=enemy?'#b85a69':'#559fc1';
 const highlight=enemy?'#f5b1ae':'#a6e0f2';
 const w=kind==='castle'?67:69;
 const h=kind==='castle'?65:83;
 const left=-w/2,top=-h;
 g.save();g.translate(x,y);
 g.globalAlpha=hp<=0?.3:1;
 // Base projetada sobre o chão e muralhas em perspectiva.
 g.fillStyle='#04090fb0';g.beginPath();g.ellipse(0,3,w*.57,10,0,0,Math.PI*2);g.fill();
 g.fillStyle='#273344';g.beginPath();g.moveTo(left+7,-9);g.lineTo(-w*.62,-1);g.lineTo(w*.62,-1);g.lineTo(w/2-7,-9);g.closePath();g.fill();
 const stone=g.createLinearGradient(left,0,w/2,0);
 stone.addColorStop(0,'#171e2b');stone.addColorStop(.16,'#556072');
 stone.addColorStop(.48,'#758091');stone.addColorStop(.72,'#3d4659');stone.addColorStop(1,'#151b28');
 g.fillStyle=stone;g.strokeStyle='#111724';g.lineWidth=2;
 g.fillRect(left+8,top+19,w-16,h-21);g.strokeRect(left+8,top+19,w-16,h-21);
 // Duas torres de vigia e seteiras, estética de fortaleza de pedra.
 for(const direction of [-1,1]){
   const bx=direction*(w/2-10)-9;
   g.fillStyle='#293343';g.fillRect(bx,top+15,18,h-19);
   g.fillStyle='#606b79';g.fillRect(bx+2,top+16,10,h-24);
   g.strokeStyle='#151c29';g.strokeRect(bx,top+15,18,h-19);
   g.fillStyle='#172130';g.fillRect(bx+6,top+30,3,13);
   g.fillStyle=highlight;g.globalAlpha=.38;g.fillRect(bx+7,top+31,1,11);g.globalAlpha=hp<=0?.3:1;
   for(let merlon=0;merlon<3;merlon++){
      g.fillStyle=merlon%2?'#626c7c':'#3d4656';
      g.fillRect(bx+merlon*6,top+7,5,11);
      g.strokeStyle='#202839';g.strokeRect(bx+merlon*6,top+7,5,11);
   }
 }
 // Corpo central, tijolos e linhas de pedra desiguais.
 g.strokeStyle='#202a38';g.lineWidth=1;
 for(let row=0;row<5;row++){
   const by=top+26+row*9;
   g.beginPath();g.moveTo(left+17,by);g.lineTo(w/2-17,by);g.stroke();
   for(let col=0;col<3;col++){
     const xx=left+18+col*10+(row%2)*5;
     g.beginPath();g.moveTo(xx,by);g.lineTo(xx,by+8);g.stroke();
   }
 }
 // Topo com muralhas e estandarte, sem "telhado de brinquedo".
 g.fillStyle='#243043';g.fillRect(left+13,top+12,w-26,12);
 g.fillStyle='#788292';g.fillRect(left+13,top+11,w-26,4);
 for(let merlon=0;merlon<5;merlon++){
  const mx=left+14+merlon*8;
  g.fillStyle=merlon%2?'#7a8490':'#4f5b6a';
  g.fillRect(mx,top+5,6,13);
  g.strokeStyle='#253040';g.strokeRect(mx,top+5,6,13);
 }
 // Portão profundo de pedra com arco e reflexos de metal.
 g.fillStyle='#090d15';g.beginPath();g.moveTo(-10,0);g.lineTo(-10,-19);g.quadraticCurveTo(0,-33,10,-19);g.lineTo(10,0);g.closePath();g.fill();
 g.strokeStyle='#b89d6c';g.lineWidth=2;
 g.beginPath();g.moveTo(-10,0);g.lineTo(-10,-19);g.quadraticCurveTo(0,-33,10,-19);g.lineTo(10,0);g.stroke();
 g.fillStyle='#4a3440';g.fillRect(-6,-15,12,15);
 g.strokeStyle='#b4a17b';g.lineWidth=1;g.beginPath();g.moveTo(0,-14);g.lineTo(0,-1);g.stroke();
 // Bandeira estreita indica facção e nível de vida da estrutura.
 g.strokeStyle='#e4d19a';g.lineWidth=2;g.beginPath();g.moveTo(0,top+7);g.lineTo(0,top-15);g.stroke();
 g.fillStyle=accent;g.beginPath();g.moveTo(1,top-13);g.lineTo(24,top-9);g.lineTo(17,top);g.lineTo(1,top-2);g.closePath();g.fill();
 g.strokeStyle=highlight;g.lineWidth=1;g.stroke();
 // Janelas iluminadas.
 for(const px of [-20,20]){
   g.fillStyle='#0e1420';g.beginPath();g.roundRect(px-3,top+35,6,15,2);g.fill();
   g.fillStyle=highlight;g.globalAlpha=.7;g.fillRect(px-1,top+38,2,8);
   g.globalAlpha=hp<=0?.3:1;
 }
 if(hp<=0){
   g.strokeStyle='#f29f6a';g.lineWidth=2;
   g.beginPath();g.moveTo(-14,top+17);g.lineTo(-2,top+38);g.lineTo(10,top+53);g.stroke();
 }
 g.restore();
}
function draw(){
 if(window.Cerco3D?.ready){
   window.Cerco3D.render(game);
   return;
 }
 const g=ctx;
 g.clearRect(0,0,W,H);
 // Dois caminhos, rio central, fortificacoes e atmosfera de arena.
 const base=g.createLinearGradient(0,0,0,H);
 base.addColorStop(0,'#4a2c38');base.addColorStop(.28,'#243d4f');
 base.addColorStop(.5,'#13354b');base.addColorStop(.72,'#234258');base.addColorStop(1,'#24415a');
 g.fillStyle=base;g.fillRect(0,0,W,H);
 if(boardArt.complete&&boardArt.naturalWidth){
   g.globalAlpha=.35;g.drawImage(boardArt,0,0,W,H);g.globalAlpha=1;
 }
 for(let lane=0;lane<2;lane++){
   const x=lane?310:110;
   const road=g.createLinearGradient(x-45,0,x+45,0);
   road.addColorStop(0,'#3b4b4f');road.addColorStop(.5,'#66716a');road.addColorStop(1,'#394e58');
   g.fillStyle=road;g.globalAlpha=.58;g.fillRect(x-42,34,84,H-68);g.globalAlpha=1;
   g.strokeStyle='#ddc9a34f';g.lineWidth=1.5;
   for(let y=47;y<H-35;y+=27){
     g.beginPath();g.moveTo(x-40,y);g.lineTo(x+40,y);g.stroke();
     g.beginPath();g.moveTo(x+(Math.floor(y/27)%2?0:-18),y);g.lineTo(x+(Math.floor(y/27)%2?0:-18),y+27);g.stroke();
   }
 }
 // Rio transversal e duas pontes, sem bloquear as rotas.
 g.fillStyle='#103347';g.fillRect(0,H/2-24,W,48);
 for(let i=0;i<9;i++){g.strokeStyle=i%2?'#477e91aa':'#9bd1d84d';g.lineWidth=2;g.beginPath();g.moveTo(i*57-30,H/2-9+(i%3)*8);g.quadraticCurveTo(i*57+2,H/2-15,i*57+46,H/2-6+(i%3)*8);g.stroke()}
 for(const x of [110,310]){
   g.fillStyle='#7b6652';g.fillRect(x-49,H/2-26,98,52);
   g.fillStyle='#d2b785';g.fillRect(x-46,H/2-20,92,40);
   g.strokeStyle='#705d45';g.lineWidth=2;
   for(let i=-2;i<=2;i++){g.beginPath();g.moveTo(x+i*18,H/2-18);g.lineTo(x+i*18,H/2+18);g.stroke()}
   g.strokeStyle='#e9d7b8';g.lineWidth=3;g.strokeRect(x-46,H/2-20,92,40);
 }
 // Fortalezas em pedra. Cada estrutura usa seu próprio valor de vida.
 for(const side of ['enemy','ally']){
   const enemy=side==='enemy',y=enemy?129:H-49;
   const arr=game.towers[side];
   // Castelo real separado das duas torres de defesa.
   drawFortress(g,W/2,enemy?96:H+2,side,'castle',game.castles[side]);
   for(let lane=0;lane<2;lane++){
     const x=lane?310:110,hp=arr[lane];
     drawFortress(g,x,y,side,'tower',hp);
     const by=enemy?y+11:y-94;
     g.fillStyle='#111a29';g.fillRect(x-34,by,68,6);
     g.fillStyle=enemy?'#ca7180':'#74c6df';g.fillRect(x-33,by+1,66*clamp(hp/1400,0,1),4);
   }
   g.textAlign='center';g.font='bold 12px system-ui';
   g.shadowColor='#000';g.shadowBlur=5;
   g.fillStyle=enemy?'#f3bdbe':'#c4ecf7';
   g.fillText('♛ '+fmt(Math.ceil(game.castles[side])),W/2,enemy?18:H-8);
   g.shadowBlur=0;
 }
 // Personagens articulados por quadros de membros, com ritmo próprio por espécie.
 // Os pés permanecem sobre o terreno, sem fotografias circulares.
 for(const u of game.units){
   const blue=u.side==='ally';
   const motion=motionSheets.get(u.card.id);
   const still=unitSprites.get(u.card.id);
   const source=motion?.complete&&motion.naturalWidth?motion:still;
   const t=(u.state==='walk'&&game.running)?Math.sin((u.motionTime||0)*12+(u.id*2))*.25:0;
   const px=u.x; // a posição de cada unidade já é individual; sem deslocamentos arbitrários
   const feet=u.y+8+t;
   const height=u.card.id==='colosso'?69:u.card.id==='lobo'?55:u.card.id==='liliti'?65:u.card.id==='rei'?62:58;
   const aspect=source?.naturalWidth?
     ((source===motion?source.naturalWidth/MOTION_FRAMES:source.naturalWidth)/source.naturalHeight):.75;
   const width=Math.min(72,aspect*height);
   const color=blue?'#76d0ef':'#f28e95';
   g.save();
   g.fillStyle='#030a12a6';g.beginPath();g.ellipse(px,feet+1,width*.42,7,0,0,Math.PI*2);g.fill();
   g.fillStyle=blue?'#69cce04a':'#dd677d4c';g.beginPath();g.ellipse(px,feet,width*.41,4,0,0,Math.PI*2);g.fill();
   g.shadowColor='#03060ec9';g.shadowBlur=6;g.shadowOffsetY=3;
   drawMotionSprite(g,u,px,feet,width,height);
   g.restore();
 // Barra fina acima da cabeça com cor do exército.
   const by=feet-height-8,bw=Math.max(27,Math.min(44,width*.9));
   g.fillStyle='#07101c';g.fillRect(px-bw/2-1,by-1,bw+2,6);
   g.fillStyle=color;g.fillRect(px-bw/2,by,bw*clamp(u.hp/u.maxHp,0,1),4);
 }

 // Flechas físicas das fortalezas, inclusive no fallback 2D.
 for(const shot of game.projectiles){
   const angle=Math.atan2(shot.toY-shot.fromY,shot.toX-shot.fromX);
   const t=shot.progress;
   ctx.save();
   ctx.translate(shot.x,shot.y-Math.sin(Math.PI*t)*8);
   ctx.rotate(angle);
   ctx.lineCap='round';
   ctx.lineWidth=2.8;
   ctx.strokeStyle='#684b2c';
   ctx.beginPath();ctx.moveTo(-14,0);ctx.lineTo(10,0);ctx.stroke();
   ctx.fillStyle='#c7d2de';
   ctx.beginPath();ctx.moveTo(15,0);ctx.lineTo(7,-4);ctx.lineTo(7,4);ctx.closePath();ctx.fill();
   ctx.strokeStyle=shot.color==='blue'?'#79d9fc':'#f29aaa';
   ctx.lineWidth=2;
   for(const d of [-1,1]){
     ctx.beginPath();ctx.moveTo(-13,0);ctx.lineTo(-7,d*5);ctx.stroke();
   }
   ctx.restore();
 }
 for(const fx of game.effects){
   ctx.save();ctx.strokeStyle=fx.color==='blue'?'#8be4fa':'#f5a0b5';
   ctx.globalAlpha=Math.min(1,fx.life/fx.maxLife);
   ctx.lineWidth=2.4;
   ctx.beginPath();ctx.arc(fx.x,fx.y,10+(1-fx.life/fx.maxLife)*13,0,Math.PI*2);ctx.stroke();
   ctx.restore();
 }


 // Disparos de cartas com formato distinto também no modo sem WebGL.
 for(const shot of game.attackShots){
   const color={arrow:'#f2e2b0',mark:'#83e8ff',shield:'#8dfff4',enchant:'#e7a1ff'}[shot.kind]||'#f9da93';
   g.save();g.strokeStyle=color;g.fillStyle=color;g.shadowColor=color;g.shadowBlur=10;g.lineWidth=shot.kind==='arrow'?2.5:4;
   const dir=Math.atan2(shot.toY-shot.fromY,shot.toX-shot.fromX);
   g.translate(shot.x,shot.y);g.rotate(dir);
   if(shot.kind==='arrow'||shot.kind==='mark'){
     g.beginPath();g.moveTo(-12,0);g.lineTo(11,0);g.stroke();
     g.beginPath();g.moveTo(11,0);g.lineTo(4,-4);g.lineTo(4,4);g.closePath();g.fill();
   }else if(shot.kind==='enchant'){
     g.beginPath();g.arc(0,0,8,0,Math.PI*2);g.fill();
     g.strokeStyle='#a0e8c6';g.beginPath();g.arc(0,0,13,0,Math.PI*2);g.stroke();
   }else{
     g.beginPath();g.arc(0,0,8,0,Math.PI*2);g.stroke();
   }
   g.restore();
 }
 for(const fx of game.attackFx){
   const strength=fx.life/fx.maxLife;
   g.save();g.globalAlpha=strength;g.translate(fx.x,fx.y);
   const radius=8+(1-strength)*23;
   const color={bite:'#ffaaa1',slash:'#ffead1',slam:'#ff9955',shield:'#95eee9',mark:'#8bddff',royal:'#ffcf85',enchant:'#dca2ff',arrow:'#fff0a1'}[fx.kind]||'#f0c887';
   g.shadowColor=color;g.shadowBlur=12;g.strokeStyle=color;g.lineWidth=fx.kind==='slam'?5:3;
   if(fx.kind==='bite'){
     for(let k=-1;k<=1;k++){g.beginPath();g.moveTo(k*7-8,-15);g.lineTo(k*7+10,15);g.stroke()}
   }else if(fx.kind==='slash'||fx.kind==='royal'){
     g.beginPath();g.arc(0,0,radius,-1.7,.7);g.stroke();
     if(fx.kind==='royal'){g.beginPath();g.arc(0,0,radius+8,1.4,3.6);g.stroke()}
   }else if(fx.kind==='mark'){
     g.beginPath();g.arc(0,0,radius,0,Math.PI*2);g.stroke();
     g.beginPath();g.moveTo(-radius-8,0);g.lineTo(radius+8,0);g.moveTo(0,-radius-8);g.lineTo(0,radius+8);g.stroke();
   }else{
     g.beginPath();g.arc(0,0,radius,0,Math.PI*2);g.stroke();
     if(fx.kind==='enchant'){g.rotate(strength*2);g.beginPath();g.arc(0,0,radius*.6,0,Math.PI*2);g.stroke()}
   }
   g.restore();
 }

}
function updateHand(){const node=$('#hand');node.replaceChildren();hand.forEach((id,i)=>{const c=cardData.find(x=>x.id===id);const b=document.createElement('button');b.type='button';b.className=i===activeIndex?'selected':'';b.setAttribute('aria-label',`Selecionar ${c.name}, ${c.cost} energia`);const im=document.createElement('img');im.src=cardImage(c);im.alt='';im.onerror=imgFallback;const label=document.createElement('b');label.textContent=c.name;const co=document.createElement('small');co.textContent=c.cost;b.append(im,label,co);b.addEventListener('click',()=>{activeIndex=i;chosen=c;selectedCard();updateHand()});node.append(b)})}
function updateUI(){updateClock();$('#wins').textContent=String(local.wins);updateHand();selectedCard()}
function placeCardAt(x,y){
 game.spawn=point(x,y);
 cast(hand[activeIndex]);
}
canvas.addEventListener('click',e=>{
 const r=canvas.getBoundingClientRect();
 // No modo 3D, o raio da câmera determina o ponto real sobre o terreno.
 const p=window.Cerco3D?.ready?window.Cerco3D.screenToBattle(e.clientX,e.clientY,r):null;
 const x=p?.x??(e.clientX-r.left)*W/r.width;
 const y=p?.y??(e.clientY-r.top)*H/r.height;
 placeCardAt(x,y);
});
window.addEventListener('keydown',e=>{
 if(!$('.page[data-page="arena"]').classList.contains('active'))return;
 if(['1','2','3','4'].includes(e.key)){
   activeIndex=Number(e.key)-1;chosen=cardData.find(x=>x.id===hand[activeIndex]);
   updateHand();selectedCard();
 }else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
   e.preventDefault();
   // Teclado escolhe o ponto sugerido; toque permite qualquer posição.
   placeCardAt(e.key==='ArrowLeft'?110:310,H*.65);
 }
});
if(new URLSearchParams(location.search).has('test')){
  // Observabilidade local para checagens automáticas, sem alterar partidas.
  window.__cercoTest={
    units:()=>game.units.map(u=>({id:u.id,side:u.side,lane:u.lane,x:u.x,y:u.y,
      state:u.state,targetId:u.targetId,card:u.card.id,hp:u.hp})),
    createEnemy:(cardId,x,y)=>{
      const c=cardData.find(c=>c.id===cardId);
      if(c&&!c.spell)return addUnit(c,{x,y},'enemy');
      return [];
    },
    reset:()=>reset(),
    mana:()=>({actual:game.energy,blocks:Math.floor(game.energy+1e-7),ui:document.querySelectorAll('#manaBlocks .mana-block.filled').length}),
    setMana:(value)=>{game.energy=clamp(Number(value)||0,0,10);updateClock();return game.energy},
    fullscreen:()=>({active:document.body.classList.contains('battle-mode'),native:!!document.fullscreenElement,rect:document.querySelector('#battleStage')?.getBoundingClientRect().toJSON()}),
    attackInfo:()=>({shots:game.attackShots.map(x=>({...x})),effects:game.attackFx.map(x=>({...x})),history:game.attackHistory.map(x=>({...x}))}),
    duel:(cardId='arqueiro')=>{
      const card=cardData.find(c=>c.id===cardId);if(!card||card.spell)return null;
      const enemy=cardData.find(c=>c.id==='colosso');
      const hostile=addUnit(enemy,{x:215,y:375},'enemy');
      const friends=addUnit(card,{x:215,y:395},'ally');
      // Uma única ação de ataque; o motor continua simulando normalmente.
      friends.forEach(id=>{
        const u=game.units.find(u=>u.id===id);
        const target=game.units.find(v=>v.id===hostile[0]);
        if(u&&target){u.cooldown=0;combat(u,.02);}
      });
      window.Cerco3D?.syncNow?.(game);
      return {ids:friends,enemy:hostile[0],history:game.attackHistory.slice(-friends.length),
        shots:game.attackShots.map(shot=>({id:shot.id,kind:shot.kind})),
        animated:window.Cerco3D?.info?.().troopShots??0};
    },
    audioEvents:()=>({destroyed:game.destroyedStructures.slice(),running:game.running,life:JSON.parse(JSON.stringify({units:game.units.map(u=>({id:u.id,hp:u.hp})),towers:game.towers,castles:game.castles}))}),
    injure:(id,damage=30)=>receiveDamage(game.units.find(u=>u.id===id),damage),
    breach:(side='enemy',lane=0,damage=9999)=>receiveFortressDamage(side,lane,damage),
    finish:(winner='ally')=>result(winner),
    towers:()=>({shots:game.towerShots.slice(),hits:game.defenseHits,projectiles:game.projectiles.slice(),timers:{...game.towerTimers}}),
    forceTowerTarget:(side='enemy',slot=0,target='colosso')=>{
      const card=cardData.find(c=>c.id===target);
      const position=TOWER_POSITIONS[side][slot];
      if(!card)return [];
      const opposite=side==='enemy'?'ally':'enemy';
      return addUnit(card,{x:position.x,y:position.y+(side==='enemy'?64:-64)},opposite);
    },
    animation:(id)=>{const u=game.units.find(u=>u.id===id);return u?{state:u.state,frame:motionFrame(u,u.attackPulse>0?'attack':u.state),clock:u.motionTime,attackPulse:u.attackPulse,attacks:u.attacks||0}:null},
    motionReady:(name)=>{const im=motionSheets.get(name);return !!(im?.complete&&im.naturalWidth>0)},
    traceRoute:(x,y,tx,ty,lane=0,steps=900)=>{
      const u={id:-1,side:'ally',card:{speed:33},x,y,lane,state:'walk'};
      const points=[{x:u.x,y:u.y}];
      let previousSide=riverSide(y),crossings=[];
      for(let i=0;i<Math.min(2000,steps);i++){
        const before={x:u.x,y:u.y};
        moveUnit(u,{x:tx,y:ty},.05);
        const after={x:u.x,y:u.y};
        if(Math.hypot(after.x-before.x,after.y-before.y)<.001&&i>25)break;
        points.push(after);
        const nextSide=riverSide(u.y);
        if(nextSide!==previousSide){crossings.push({x:u.x,y:u.y,side:nextSide});previousSide=nextSide}
        if(distance(u,{x:tx,y:ty})<1.4)break;
      }
      return {points,crossings,final:points[points.length-1],riverTop:RIVER_TOP,riverBottom:RIVER_BOTTOM,bridges:LANES,bridgeHalfWidth:BRIDGE_HALF_WIDTH};
    }
  };
}
$('#battleBack').addEventListener('click',menuFromBattle);
$('#battlePause').addEventListener('click',pause);
$('#battleSound').addEventListener('click',()=>{$('#soundToggle').click();syncBattleButtons()});
document.addEventListener('fullscreenchange',()=>requestAnimationFrame(()=>window.Cerco3D?.resize?.()));
window.addEventListener('resize',()=>{if(document.body.classList.contains('battle-mode'))window.Cerco3D?.resize?.()},{passive:true});
$('#pause').addEventListener('click',pause);$('#reset').addEventListener('click',reset);$('#clearProgress').addEventListener('click',()=>{if(!confirm('Limpar somente o progresso local de treinamento?'))return;local={cards:{},wins:0};save();window.CercoRewards?.reset?.();reset();renderCards();window.CercoHome?.render?.()});
window.addEventListener('hashchange',()=>{const key=location.hash.replace('#','');if(['home','arena','cards','shop','clans','profile'].includes(key))show(key)});window.Cerco3DGame={getState:()=>game};reset();renderCards();if(location.hash)show(location.hash.slice(1));
})();
