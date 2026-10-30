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
// Sprites recortados das artes existentes: personagens inteiros, nunca bolinhas.
const spriteNames=['lobo','arqueiro','soldado','colosso','guardiao','batedor','rei','liliti'];
const unitSprites=new Map(spriteNames.map(id=>{
 const image=new Image();image.src='./sprites/sprite_'+id+'.png';return[id,image];
}));
function drawFortress(g,x,y,side,kind,hp){
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
   drawFortress(g,W/2,enemy?67:H-4,side,'castle',game.castles[side]);
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
 // Personagens com pernas, mantos, armaduras, lobo e proporções reais.
 // Movimento do jogo é mantido: apenas a representação muda.
 for(const u of game.units){
   const blue=u.side==='ally',im=unitSprites.get(u.card.id);
   const t=game.running?Math.sin((180-game.time)*8+u.id*2)*1.1:0;
   const px=u.x+((u.id%3)-1)*7;
   const feet=u.y+8+t;
   const height=u.card.id==='colosso'?69:u.card.id==='lobo'?55:u.card.id==='liliti'?65:u.card.id==='rei'?62:58;
   const width=im?.naturalWidth?Math.min(72,im.naturalWidth/im.naturalHeight*height):40;
   const color=blue?'#76d0ef':'#f28e95';
   g.save();
   // Sombras projetadas e base de facção, sem retrato circular.
   g.fillStyle='#030a12a6';g.beginPath();g.ellipse(px,feet+1,width*.42,7,0,0,Math.PI*2);g.fill();
   g.fillStyle=blue?'#69cce04a':'#dd677d4c';g.beginPath();g.ellipse(px,feet,width*.41,4,0,0,Math.PI*2);g.fill();
   g.shadowColor='#03060ec9';g.shadowBlur=6;g.shadowOffsetY=3;
   if(im?.complete&&im.naturalWidth){
     g.drawImage(im,px-width/2,feet-height,width,height);
   }else{
     // Asset ainda carregando: silhueta legível, nunca a foto em bolinha.
     g.fillStyle=blue?'#5982a0':'#a55c67';
     g.beginPath();g.moveTo(px-11,feet);g.lineTo(px-10,feet-26);
     g.lineTo(px-15,feet-33);g.lineTo(px,feet-43);g.lineTo(px+15,feet-33);
     g.lineTo(px+10,feet-26);g.lineTo(px+11,feet);g.closePath();g.fill();
     g.fillStyle='#d7c19d';g.beginPath();g.arc(px,feet-41,7,0,Math.PI*2);g.fill();
   }
   g.restore();
   // Barra fina acima da cabeça com cor do exército.
   const by=feet-height-8,bw=Math.max(27,Math.min(44,width*.9));
   g.fillStyle='#07101c';g.fillRect(px-bw/2-1,by-1,bw+2,6);
   g.fillStyle=color;g.fillRect(px-bw/2,by,bw*clamp(u.hp/u.maxHp,0,1),4);
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
