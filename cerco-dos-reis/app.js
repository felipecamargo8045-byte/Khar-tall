/* Cerco dos Reis — motor LOCAL DE TREINAMENTO, separado do backend do Work.
   Nao representa o motor, as cartas, as compras nem as contas oficiais. */
(()=>{'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const ASSET='./origem-apk/assets/';const KEY='cerco-reis-migracao-treino-v1';
const cardData=[
{id:'lobo',name:'Lobo',kind:'Tropa · Velocidade',rarity:'Comum',cost:3,dmg:58,hp:260,units:2,range:32,speed:33,attackSpeed:.95,ability:'Bote do Lobo',desc:'Dois lobos velozes avançam em matilha. Seu primeiro bote ganha força.',effect:'O primeiro golpe de cada lobo causa 60% de dano adicional.',img:'portrait_lobo.webp',role:'Pressão rápida'},
{id:'arqueiro',name:'Arqueiro',kind:'Tropa · Distância',rarity:'Comum',cost:3,dmg:47,hp:150,range:100,speed:24,attackSpeed:1.25,ability:'Disparo de apoio',desc:'Aprendiz que ataca de longe e apoia aliados na rota.',effect:'Mantém distância dos inimigos. Depois do nível Ouro, pode evoluir na batalha ao abater tropas.',img:'portrait_aprendiz_arqueiro.webp',role:'Cobertura'},
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
function show(view){$$('.page').forEach(n=>n.classList.toggle('active',n.dataset.page===view));$$('#navigation button').forEach(n=>n.classList.toggle('active',n.dataset.view===view));if(view==='cards')renderCards();window.scrollTo({top:0,behavior:'smooth'})}
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.view)));
function imgFallback(e){if(!e.target.dataset.failed){e.target.dataset.failed='1';e.target.src=ASSET+'emblem.svg'}}
function renderCards(){const grid=$('#cardGrid');grid.replaceChildren();for(const c of cardData){const p=prog(c.id),t=tier(p.level),b=document.createElement('button');b.type='button';b.setAttribute('aria-pressed',String(chosen.id===c.id));b.className=chosen.id===c.id?'selected':'';cssTier(b,t);const image=document.createElement('img');image.src=cardImage(c);image.alt=c.name;image.addEventListener('error',imgFallback);const frame=document.createElement('span');frame.className='tile-img';frame.append(image);const label=document.createElement('strong');label.textContent=c.name;const lvl=document.createElement('small');lvl.textContent='Nível '+p.level;b.append(frame,label,lvl);b.addEventListener('click',()=>{chosen=c;tab='tech';renderCards()});grid.append(b)}
const c=chosen,p=prog(c.id),t=tier(p.level);cssTier($('#artOuter'),t);$('#fullArt').src=cardImage(c);$('#fullArt').alt='Imagem completa de '+c.name;$('#fullArt').onerror=imgFallback;$('#cardType').textContent=c.kind;$('#cardName').textContent=c.name;$('#cardText').textContent=c.desc;$('#cardBadges').replaceChildren();for(const s of [`Nível ${p.level}`,t.name,c.rarity]){const x=document.createElement('span');x.textContent=s;$('#cardBadges').append(x)};statTiles('#cardStats',[['Dano',c.dmg],['Vida',c.hp||'—'],['Energia',c.cost]]);$('#cardSkill').textContent=c.ability;$('#cardSkillText').textContent=c.effect;$('#xpLabel').textContent=`${p.xp} / 100 XP`;$('#xpFill').style.width=(p.level>=100?100:p.xp)+'%';$$('#cardTabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));const panel=$('#tabContent');panel.replaceChildren();if(tab==='tech'){const spec=document.createElement('div');spec.className='spec-grid';for(const [k,v] of [['Classe',c.kind],['Função',c.role],['Raridade',c.rarity],['Dano de base',c.dmg],['Vida de base',c.hp||'Não aplicável'],['Alcance',c.range||'Efeito em área'],['Velocidade',c.speed||'Instantânea'],['Energia',c.cost],['Habilidade',c.ability],['Ataque',c.attackSpeed?c.attackSpeed+' s':'Instantâneo']]){const row=document.createElement('div'),label=document.createElement('span'),value=document.createElement('b');label.textContent=k;value.textContent=String(v);row.append(label,value);spec.append(row)}panel.append(spec)}else if(tab==='evolution'){const steps=document.createElement('div');steps.className='tier-steps';tiers.forEach(x=>{const n=document.createElement('span');n.textContent=`${x.name} · nível ${x.min}`;n.style.borderColor=x.metal;steps.append(n)});panel.append(steps);const desc=document.createElement('p');desc.textContent=c.id==='rei'?'Caminhos: Rei de Sangue / Rei da Matilha. Habilidades oficiais serão ligadas ao servidor original.':c.id==='liliti'?'A raridade Lendária é independente da moldura; evoluir não altera a categoria Lendária.':'Molduras indicam o progresso do nível; os bônus definitivos dependem das regras do jogo original.';panel.append(desc)}else{const x=document.createElement('p');x.textContent=`Progresso local: nível ${p.level}, ${p.xp} de 100 XP. Treinamento contra IA: +1 XP por carta utilizada. O nível 100 exige validação especial no sistema original e não é concedido pelo treinamento.`;panel.append(x)}}
$$('#cardTabs button').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.tab;renderCards()}));
function statTiles(sel,arr){const target=$(sel);target.replaceChildren();arr.forEach(([k,v])=>{const d=document.createElement('div'),l=document.createElement('span'),b=document.createElement('strong');l.textContent=k;b.textContent=String(v);d.append(l,b);target.append(d)})}
function selectedCard(){const c=chosen;$('#selectedPortrait').src=cardImage(c);$('#selectedPortrait').onerror=imgFallback;$('#selectedName').textContent=c.name;$('#selectedDesc').textContent=c.desc;statTiles('#selectedStats',[['Dano',c.dmg],['Vida',c.hp||'—'],['Energia',c.cost]]);$('#selectedSkill').textContent=c.ability;$('#selectedSkillDesc').textContent=c.effect}
const canvas=$('#arena'),ctx=canvas.getContext('2d');const W=canvas.width,H=canvas.height;
const sprites=new Map(cardData.map(c=>{const i=new Image();i.src=cardImage(c);return[c.id,i]}));const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
let game,loop=0,ticker=0;let hand=['lobo','arqueiro','soldado','colosso'];let next=4;const queue=cardData.map(c=>c.id);let activeIndex=0;
function reset(){cancelAnimationFrame(loop);clearInterval(ticker);game={running:false,paused:false,time:180,energy:6,max:10,last:0,units:[],towers:{ally:[1400,1400],enemy:[1400,1400]},castles:{ally:2600,enemy:2600},counter:0,aiTimer:0,message:'',result:null};hand=['lobo','arqueiro','soldado','colosso'];next=4;activeIndex=0;$('#overlay').hidden=false;$('#overlay').innerHTML='<span class="overline">DOIS EXÉRCITOS · UM TRONO</span><h2>O cerco começa com você.</h2><p>3 minutos, duas rotas e cartas com habilidades próprias.</p><button class="gold" id="start">⚔ Iniciar treinamento</button>';$('#start').addEventListener('click',start);$('#pause').disabled=true;$('#pause').textContent='Pausar';updateUI();draw()}
function start(){game.running=true;game.paused=false;game.result=null;game.last=performance.now();$('#overlay').hidden=true;$('#pause').disabled=false;log('O cerco começou. Defenda suas torres!');loop=requestAnimationFrame(step)}
function result(winner){if(!game.running)return;game.running=false;cancelAnimationFrame(loop);$('#overlay').hidden=false;const win=winner==='ally';if(win){local.wins++;save()}$('#overlay').innerHTML='';const over=document.createElement('span');over.className='overline';over.textContent='O CERCO TERMINOU';const t=document.createElement('h2');t.textContent=win?'Vitória':'Derrota';const p=document.createElement('p');p.textContent=win?'Seu reino venceu o treinamento.':'Reorganize as cartas e tente novamente.';const b=document.createElement('button');b.className='gold';b.textContent='Jogar novamente';b.addEventListener('click',()=>{reset();start()});$('#overlay').append(over,t,p,b);updateUI()}
function pause(){if(!game.running)return;game.paused=!game.paused;$('#pause').textContent=game.paused?'Continuar':'Pausar';if(game.paused){$('#overlay').hidden=false;$('#overlay').innerHTML='<h2>Batalha pausada</h2><p>Seu reino pode esperar.</p><button class="gold" id="resume">Continuar batalha</button>';$('#resume').addEventListener('click',pause)}else{$('#overlay').hidden=true;game.last=performance.now();loop=requestAnimationFrame(step)}}
function log(s){const line=document.createElement('p');line.textContent=s;$('#battleLog').prepend(line);while($('#battleLog').children.length>8)$('#battleLog').lastElementChild.remove()}
function addUnit(c,lane,side){let count=c.units||1;for(let i=0;i<count;i++)game.units.push({id:cryptoRandom(),card:c,side,lane,x:lane===0?110:310,y:side==='ally'?H-116-i*13:116+i*13,hp:c.hp,maxHp:c.hp,cooldown:0,first:true,mark:null,stun:0})}
function cryptoRandom(){game.counter++;return game.counter}
function cast(id){if(!game.running||game.paused)return;const c=cardData.find(x=>x.id===id);if(!c||game.energy<c.cost){log('Energia insuficiente para '+(c?.name||'esta carta'));return}game.energy-=c.cost;const lane=game.lane??0;if(c.spell){const targets=game.units.filter(u=>u.lane===lane&&u.side===(c.id==='cura'?'ally':'enemy'));if(c.id==='cura'){targets.forEach(u=>u.hp=Math.min(u.maxHp,u.hp+180));log('Campo de Cura restaurou '+targets.length+' tropa(s).')}else if(c.id==='chama'){targets.forEach(u=>u.hp-=c.dmg);log('Chama Viva atingiu '+targets.length+' inimigo(s).')}else{const u=targets[0];if(u){u.hp-=c.dmg;u.stun=1.4}log('Armadilha ativada!')}}else addUnit(c,lane,'ally');const p=prog(c.id);if(p.level<99){p.xp++;if(p.xp>=100){p.xp=0;p.level++}local.cards[c.id]=p;save()}const index=hand.indexOf(id);if(index>=0){hand[index]=queue[next%queue.length];next++}log(c.name+' invocado na rota '+(lane?'direita':'esquerda')+'.');activeIndex=0;updateUI()}
function aiCast(){const level=$('#difficulty').value;const choices=cardData.filter(c=>!c.spell&&c.cost<7);let c=choices[Math.floor(Math.random()*choices.length)];addUnit(c,Math.random()<.5?0:1,'enemy');log('Exército rubro invocou '+c.name)}
function combat(u,dt){if(u.stun>0){u.stun-=dt;return}u.cooldown-=dt;const sign=u.side==='ally'?-1:1;const opponents=game.units.filter(x=>x.side!==u.side&&x.lane===u.lane&&x.hp>0);let target=null,best=Infinity;for(const op of opponents){const d=Math.abs(u.y-op.y);if(d<best){best=d;target=op}}if(target&&best<u.card.range+9){if(u.cooldown<=0){let d=u.card.dmg;if(u.first&&u.card.id==='lobo')d*=1.6;if(u.first&&u.card.id==='colosso')d*=1.4;if(u.card.id==='batedor'&&u.mark===target.id)d*=1.4;target.hp-=d;if(u.card.id==='liliti')u.hp=Math.min(u.maxHp,u.hp+d*.5);u.mark=target.id;u.first=false;u.cooldown=u.card.attackSpeed||1.25}return}const towerY=u.side==='ally'?90:H-90;const towerDist=Math.abs(u.y-towerY);if(towerDist<u.card.range+12){if(u.cooldown<=0){const opposing=u.side==='ally'?'enemy':'ally';if(game.towers[opposing][u.lane]>0)game.towers[opposing][u.lane]=Math.max(0,game.towers[opposing][u.lane]-u.card.dmg);else game.castles[opposing]=Math.max(0,game.castles[opposing]-u.card.dmg);u.cooldown=u.card.attackSpeed||1.1}}else u.y+=sign*u.card.speed*dt;}
function tick(dt){game.time=Math.max(0,game.time-dt);game.energy=clamp(game.energy+dt*(game.time<60?1.2:.7),0,10);game.aiTimer+=dt;const speed=$('#difficulty').value;const interval=speed==='easy'?6.2:speed==='hard'?2.9:4.4;if(game.aiTimer>=interval){game.aiTimer=0;aiCast()}for(const u of game.units)combat(u,dt);game.units=game.units.filter(u=>u.hp>0);if(game.castles.enemy<=0)result('ally');else if(game.castles.ally<=0)result('enemy');else if(game.time===0){let ally=game.castles.ally+game.towers.ally.reduce((a,b)=>a+b,0),enemy=game.castles.enemy+game.towers.enemy.reduce((a,b)=>a+b,0);result(ally>=enemy?'ally':'enemy')}}
function step(now){if(!game.running||game.paused)return;const dt=Math.min(.05,(now-game.last)/1000||0);game.last=now;tick(dt);draw();updateClock();if(game.running)loop=requestAnimationFrame(step)}
function updateClock(){const sec=Math.ceil(game.time);$('#timer').textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');$('#energy').textContent=game.energy.toFixed(1)+' / 10 energia';$('#energyFill').style.width=(game.energy*10)+'%';$('#enemyCastle').textContent=fmt(Math.ceil(game.castles.enemy))+' PV';$('#allyCastle').textContent=fmt(Math.ceil(game.castles.ally))+' PV';}
const boardArt=new Image();boardArt.src=ASSET+'arena_atmosfera.webp';
const towerAllyArt=new Image();towerAllyArt.src=ASSET+'tower_ally.svg';
const towerEnemyArt=new Image();towerEnemyArt.src=ASSET+'tower_enemy.svg';
const castleAllyArt=new Image();castleAllyArt.src=ASSET+'castle_ally.svg';
const castleEnemyArt=new Image();castleEnemyArt.src=ASSET+'castle_enemy.svg';
const tokenArt={
 lobo:'token_wolf.webp',arqueiro:'token_archer.webp',soldado:'token_soldier.webp',
 colosso:'token_colossus.webp',guardiao:'token_guardian.webp',
 batedor:'token_scout.webp',rei:'token_king.webp',liliti:'token_lilith_ruiva.webp'
};
const unitIcons=new Map(Object.entries(tokenArt).map(([id,p])=>{const i=new Image();i.src=ASSET+p;return[id,i]}));
function paintImage(g,img,x,y,w,h){if(img.complete&&img.naturalWidth){g.drawImage(img,x,y,w,h);return true}return false}
function draw(){
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
 // Fortalezas com arte original, em vez de caixas genericas.
 for(const side of ['enemy','ally']){
   const enemy=side==='enemy',y=enemy?76:H-76;
   const arr=game.towers[side],towerImg=enemy?towerEnemyArt:towerAllyArt;
   const castle=enemy?castleEnemyArt:castleAllyArt;
   g.globalAlpha=.95;
   paintImage(g,castle,W/2-28,enemy?0:H-56,56,56);
   g.globalAlpha=1;
   for(let lane=0;lane<2;lane++){
     const x=lane?310:110, hp=arr[lane];
     g.save();
     if(hp<=0){g.globalAlpha=.42;g.fillStyle='#202534';g.fillRect(x-35,y-29,70,65)}
     else if(!paintImage(g,towerImg,x-38,y-43,76,82)){
       g.fillStyle=enemy?'#743643':'#2f6986';g.strokeStyle=enemy?'#d98f94':'#8ddbe3';
       g.lineWidth=3;g.beginPath();g.roundRect(x-28,y-30,56,59,6);g.fill();g.stroke();
       g.font='28px Georgia';g.fillStyle='#f0d7a4';g.textAlign='center';g.fillText('♜',x,y+7);
     }
     g.restore();
     const bx=x-36,by=enemy?y+40:y-46;
     g.fillStyle='#0b1828';g.fillRect(bx,by,72,7);
     g.fillStyle=enemy?'#d47686':'#80d7e7';g.fillRect(bx+1,by+1,70*clamp(hp/1400,0,1),5);
     g.strokeStyle='#eee8d279';g.strokeRect(bx,by,72,7);
   }
   g.textAlign='center';g.font='bold 13px system-ui';
   g.shadowColor='#060c15';g.shadowBlur=4;
   g.fillStyle=enemy?'#f3b3b8':'#caeffb';
   g.fillText('♛ '+fmt(Math.ceil(game.castles[side])),W/2,enemy?20:H-9);
   g.shadowBlur=0;
 }
 // Tokens individuais em cima da arena.
 for(const u of game.units){
   const blue=u.side==='ally',im=unitIcons.get(u.card.id)||sprites.get(u.card.id);
   const ring=blue?'#a0dbe9':'#f1a0a1';
   g.save();g.shadowColor='#0009';g.shadowBlur=8;
   g.fillStyle=blue?'#264e67':'#70384b';g.strokeStyle=ring;g.lineWidth=2.5;
   g.beginPath();g.arc(u.x,u.y,19,0,Math.PI*2);g.fill();g.stroke();g.shadowBlur=0;
   if(im?.complete&&im.naturalWidth){
     g.beginPath();g.arc(u.x,u.y,15.8,0,Math.PI*2);g.clip();g.drawImage(im,u.x-16,u.y-16,32,32);
   }else{g.fillStyle='#f7e2b1';g.font='bold 17px Georgia';g.textAlign='center';g.fillText(u.card.name[0],u.x,u.y+5)}
   g.restore();
   g.fillStyle='#081321';g.fillRect(u.x-19,u.y+20,38,5);
   g.fillStyle=blue?'#7fdfaa':'#e58e98';g.fillRect(u.x-18,u.y+21,36*clamp(u.hp/u.maxHp,0,1),3);
 }
}
function updateHand(){const node=$('#hand');node.replaceChildren();hand.forEach((id,i)=>{const c=cardData.find(x=>x.id===id);const b=document.createElement('button');b.type='button';b.className=i===activeIndex?'selected':'';b.setAttribute('aria-label',`Selecionar ${c.name}, ${c.cost} energia`);const im=document.createElement('img');im.src=cardImage(c);im.alt='';im.onerror=imgFallback;const label=document.createElement('b');label.textContent=c.name;const co=document.createElement('small');co.textContent=c.cost;b.append(im,label,co);b.addEventListener('click',()=>{activeIndex=i;chosen=c;selectedCard();updateHand()});node.append(b)})}
function updateUI(){updateClock();$('#wins').textContent=String(local.wins);updateHand();selectedCard()}
function setLane(l){game.lane=l;cast(hand[activeIndex])}
canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*W/r.width;setLane(x<W/2?0:1)});
window.addEventListener('keydown',e=>{if(!$('.page[data-page="arena"]').classList.contains('active'))return;if(['1','2','3','4'].includes(e.key)){activeIndex=Number(e.key)-1;chosen=cardData.find(x=>x.id===hand[activeIndex]);updateHand();selectedCard()}else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();setLane(e.key==='ArrowLeft'?0:1)}});
$('#pause').addEventListener('click',pause);$('#reset').addEventListener('click',reset);$('#clearProgress').addEventListener('click',()=>{if(!confirm('Limpar somente o progresso local de treinamento?'))return;local={cards:{},wins:0};save();reset();renderCards()});
window.addEventListener('hashchange',()=>{const key=location.hash.replace('#','');if(['arena','cards','shop','clans','profile'].includes(key))show(key)});reset();renderCards();if(location.hash)show(location.hash.slice(1));
})();
