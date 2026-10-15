/* Khar Tall V3: cliente multiplayer sem dados sigilosos do adversário. */
(()=>{'use strict';
const $=id=>document.getElementById(id), TYPES=KharTall.CONSTANTS, colors=['Rubros','Azuis'];
let room=null,game=null,selected=null,orientation='up',picker=null,lastRevision=-1,events=null,loading=false,connected=false,soundOn=localStorage.getItem('kt-online-sound')==='yes',deadline=0,clockOffset=0,toastHandle=0,lastEvent=null;
const aliases={king:'Rei',guardian:'Guardião',colossus:'Colosso',wolf:'Lobo',scout:'Batedor',soldier:'Aprendiz Soldado',archer:'Aprendiz Arqueiro'};
const tokens={king:'token_king.webp',guardian:'token_guardian.webp',colossus:'token_colossus.webp',wolf:'token_wolf.webp',scout:'token_scout.webp',soldier:'token_soldier.webp',archer:'token_archer.webp'};
const guides={
 king:'Movimento e ataque: até 2 casas nas oito direções. Possui 2 vidas e copia o último ataque recebido, uma vez no próximo turno. Seu ataque próprio causa uma explosão.',
 guardian:'Move quantas casas quiser nas oito direções, sem atravessar peças. Ataca até 3 inimigos num raio de 3 ou o primeiro inimigo em uma linha horizontal ou vertical. Somente o original conta para vitória.',
 colossus:'Move 1 casa. Investe exatamente 3 casas em linha cardinal, atingindo o trajeto; depois pode avançar 1 e esmagar até 8 vizinhos na sua próxima ação. Armadilhas interrompem a Investida.',
 wolf:'Salta em L de 3×2 ou 2×3, podendo atacar no destino. Após atacar fica 1 turno parado. Pode trocar de lugar com o Rei em resgates permitidos.',
 scout:'Move 1 casa. Magia em V até 4 casas nas diagonais orientáveis; primeiro ataque marca e paralisa, segundo executa marca ativa. Dois ataques no turno quando permitido.',
 soldier:'Move 1 casa em qualquer direção. Ataca 1 casa em +. Evolui para Colosso no Campo de Cura inimigo ativo.',
 archer:'Move 1 casa em qualquer direção. Ataca até 2 casas nas diagonais em X, sem atravessar outras peças. Evolui para Batedor no Campo de Cura inimigo ativo.'
};
const sfx={wolfGrowl:'lobo_matilha_rosnado.wav',wolfBite:'lobo_mordida_impacto.wav',wolfDeath:'lobo_uivo_morte.wav',king:'rei_ataque_explosao.wav',kingWound:'rei_primeira_vida_tam_tam_taam.wav',kingDeath:'rei_morto_guardiao_vivo_suspense.wav',guardianArea:'guardiao_ataque_area_ancestral.wav',guardianLine:'guardiao_ataque_linha_ancestral.wav',guardianDeath:'guardiao_original_trompeta.wav',victory:'vitoria_trompetas_marcha.wav',scoutBlue:'batedor_azul_lancamento.wav',scoutBlueImpact:'batedor_azul_impacto.wav',scoutRed:'batedor_vermelho_lancamento.wav',scoutRedImpact:'batedor_vermelho_explosao.wav',archer:'arqueiro_disparo.wav',archerImpact:'arqueiro_impacto.wav',soldier:'soldado_espada_corte.wav',soldierImpact:'soldado_espada_impacto.wav',charge:'colosso_passo_estrondoso.wav',smash:'colosso_esmagamento_rachadura.wav'};
function play(name,delay=0){if(!soundOn||!sfx[name])return;setTimeout(()=>{const a=new Audio('/assets/'+sfx[name]);a.volume=.56;a.play().catch(()=>{});},delay);}
function setSound(){soundOn=!soundOn;localStorage.setItem('kt-online-sound',soundOn?'yes':'no');$('sound').textContent=soundOn?'♫ Som ligado':'♫ Som desligado';if(soundOn)play('soldier');}
$('sound').onclick=setSound;$('sound').textContent=soundOn?'♫ Som ligado':'♫ Som desligado';
function toast(msg){let n=$('alert');n.textContent=msg;n.classList.add('visible');clearTimeout(toastHandle);toastHandle=setTimeout(()=>n.classList.remove('visible'),4300);}
function errMsg(e){return e.message||'Falha de conexão.';}
async function request(url,payload){const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(payload)});const dat=await res.json().catch(()=>({}));if(!res.ok)throw new Error(dat.error||`Erro ${res.status}`);return dat;}
function roomUrl(){return location.origin+'/online?room='+room.code;}
async function createRoom(){try{$('createRoom').disabled=true;const d=await request('/api/online/rooms',{});location.href=d.url;}catch(e){toast(errMsg(e));$('createRoom').disabled=false;}}
async function joinRoom(){let code=$('roomCode').value.trim().toUpperCase().replace(/[^A-Z2-9]/g,'');if(!/^[A-Z2-9]{7}$/.test(code)){toast('Informe o código de sete caracteres.');return;}
 try{$('joinRoom').disabled=true;const d=await request('/api/online/rooms/'+code+'/join',{});location.href=d.url;}catch(e){toast(errMsg(e));$('joinRoom').disabled=false;}}
$('createRoom').onclick=createRoom;$('joinRoom').onclick=joinRoom;$('roomCode').addEventListener('keydown',e=>{if(e.key==='Enter')joinRoom();});
$('copyInvite').onclick=()=>{const u=roomUrl();navigator.clipboard?.writeText(u).then(()=>toast('Convite copiado!')).catch(()=>toast(u));};
$('refresh').onclick=refresh;
function currentSide(){if(!room)return null;return game?.s.phase==='setup'?game.s.setupSide:game?.s.side;}
function myTurn(){return room&&game&&room.status==='active'&&(game.s.phase==='setup'||game.s.phase==='play')&&currentSide()===room.side;}
function actionAllowed(){return myTurn()&&!loading;}
function pickOptions(title,help,options){$('choiceTitle').textContent=title;$('choiceHelp').textContent=help||'';const root=$('choiceButtons');root.replaceChildren();for(const o of options){let b=document.createElement('button');b.type='button';b.textContent=o.label;b.onclick=()=>{closeOptions();o.choose();};root.append(b);}$('choiceOverlay').hidden=false;}
function closeOptions(){$('choiceOverlay').hidden=true;}$('cancelChoice').onclick=closeOptions;
async function submit(op,input={}){if(!room||loading)return;loading=true;try{await request(`/api/online/rooms/${room.code}/action`,{op,revision:lastRevision,...input});selected=null;picker=null;closeOptions();await refresh();}catch(e){toast(errMsg(e));await refresh();}finally{loading=false;}}
function soundEvent(e,old){if(!e||e.at===old?.at||!room)return;
 if(e.winner!==null&&e.winner!==undefined){play('victory');return;}
 if(e.lost?.some(p=>p.type==='guardian'&&p.original))play('guardianDeath');
 if(e.lost?.some(p=>p.type==='king'))play('kingDeath');else if(e.wounded?.length)play('kingWound');
 if(e.lost?.some(p=>p.type==='wolf'))play('wolfDeath');
 const k=e.actionKind,p=e.pieceType,tech=e.tech;
 const ph=p==='king'&&k?.startsWith('copy')?tech:p;
 if(k==='wolfHit'||k==='copyWolfHit'){play('wolfGrowl');play('wolfBite',270);}
 else if(k==='mark'||k==='execute'){play(k==='mark'?'scoutBlue':'scoutRed');play(k==='mark'?'scoutBlueImpact':'scoutRedImpact',500);}
 else if(k==='smash'){play('smash');}
 else if(['charge','copyCharge','fieldCharge'].includes(k)){play('charge');play('charge',220);play('charge',440);}
 else if(['area','copyArea'].includes(k)){play('guardianArea');}
 else if(['line','copyLine'].includes(k)){play('guardianLine');}
 else if(['hit','copyHit'].includes(k)){
   if(k==='hit'&&p==='king')play('king');
   else if(ph==='archer'){play('archer');play('archerImpact',330);}
   else if(ph==='soldier'){play('soldier');play('soldierImpact',200);}
   else if(ph==='king')play('king');
 }
}
async function refresh(){if(!room)return;try{const r=await fetch('/api/online/rooms/'+room.code,{credentials:'same-origin',cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error||'Sala inacessível.');if(d.revision<lastRevision)return;connected=true;
  const old=lastEvent,priorRevision=lastRevision; if(d.revision!==lastRevision){lastRevision=d.revision;lastEvent=d.lastEvent; if(priorRevision>=0){soundEvent(d.lastEvent,old);}}clockOffset=d.serverMs-Date.now();deadline=d.deadlineMs||0;room=d;game=KharTall.restore(d.state);$('connection').textContent='Conectado · você controla os '+colors[d.side]+(d.hasOpponent?' · dois jogadores na sala':' · esperando adversário');$('roomTitle').textContent='Sala '+d.code;
  $('lobby').hidden=true;$('match').hidden=false;paint();
 }catch(e){connected=false;$('connection').textContent='Sem conexão — tentando reconectar';toast(errMsg(e));}}
function listen(){if(!room)return;events?.close();events=new EventSource('/api/online/rooms/'+room.code+'/events');events.addEventListener('update',refresh);events.addEventListener('open',()=>{connected=true;refresh();});events.onerror=()=>{connected=false;$('connection').textContent='Conexão instável — reconectando automaticamente';};}
const pieceAt=(x,y)=>game?.pieceAt(x,y);
function optionsFor(){return selected&&game?game.actionsFor(selected,orientation):[];}
function activeHints(){let m=new Map();if(picker){if(picker.kind==='summon'){const p=game.piece(game.s.fieldPending?.pid);if(p){for(const [dx,dy] of TYPES.DIR8){let x=p.x+dx,y=p.y+dy;if(x>=0&&x<10&&y>=0&&y<10&&!pieceAt(x,y))m.set(x+','+y,'canMove');}}}else if(picker.kind==='reunionDest'){for(let y=0;y<10;y++)for(let x=0;x<10;x++)if(!pieceAt(x,y))m.set(x+','+y,'canMove');}else if(picker.kind==='reunionAlly'){for(const p of game.s.pieces)if(p.side===room.side&&p.id!==game.s.fieldPending?.pid)m.set(p.x+','+p.y,'canSpecial');}}
 else for(let o of optionsFor())m.set(o.x+','+o.y,o.kind==='move'||o.kind==='copyMove'?'canMove':['hit','wolfHit','line','area','mark','execute','copyHit','copyLine','copyArea','copyWolfHit'].includes(o.kind)?'canAttack':'canSpecial');return m;}
function boardClick(x,y){if(!game||!room)return;const p=pieceAt(x,y);if(game.s.phase==='setup'){
 if(actionAllowed()&&!p&&!game.field(x,y)){submit('trap',{x,y});}return;}
 if(game.s.phase!=='play')return;
 if(picker){const q=picker;
  if(q.kind==='summon'){const source=game.piece(game.s.fieldPending?.pid);if(source&&!p&&Math.max(Math.abs(source.x-x),Math.abs(source.y-y))===1)submit('field',{input:{kind:'summon',type:q.type,x,y}});return;}
  if(q.kind==='reunionAlly'){if(p&&p.side===room.side&&p.id!==game.s.fieldPending?.pid){picker={kind:'reunionDest',targetId:p.id};paint();}return;}
  if(q.kind==='reunionDest'){if(!p)submit('field',{input:{kind:'reunion',targetId:q.targetId,x,y}});return;}
 }
 if(!actionAllowed()){
   if(p){selected=p.id;paint();}return;
 }
 let choices=optionsFor().filter(o=>o.x===x&&o.y===y);
 if(choices.length){if(choices.length>1)pickOptions('Qual ação usar?','Escolha a habilidade desejada para esta casa.',choices.map(o=>({label:actionLabel(o.kind),choose:()=>useAction(o)})));
  else useAction(choices[0]);return;}
 if(p){selected=p.id;paint();}else{selected=null;paint();}
}
function actionLabel(k){return ({move:'Mover',hit:'Ataque normal',charge:'Investida do Colosso',fieldCharge:'Investida ao campo',smash:'Esmagamento',rescue:'Resgate Real',wolfHit:'Salto de ataque',area:'Ataque em área',line:'Ataque em linha',mark:'Marcar e paralisar',execute:'Executar marca',copyMove:'Salto copiado',copyWolfHit:'Ataque copiado do Lobo',copyCharge:'Investida copiada',copyHit:'Ataque copiado',copyArea:'Área copiada',copyLine:'Linha copiada'})[k]||k;}
function useAction(a){if(['area','copyArea'].includes(a.kind)){
 const p=game.piece(a.p),candidates=game.guardianTargets(p);
 const overlay=$('choiceOverlay'),title=$('choiceTitle'),help=$('choiceHelp'),root=$('choiceButtons');
 title.textContent='Ataque em área';help.textContent='Marque até 3 inimigos. O alvo inicial já está selecionado.';root.replaceChildren();
 const selectedTargets=new Set([a.target]);const counter=document.createElement('p');counter.className='small';counter.textContent='1 de 3 alvos selecionados';root.append(counter);
 for(const q of candidates){const label=document.createElement('label');label.className='area-target';const check=document.createElement('input');check.type='checkbox';check.checked=selectedTargets.has(q.id);label.append(check,document.createTextNode(`${aliases[q.type]} em ${'ABCDEFGHIJ'[q.x]}${10-q.y}`));
 check.addEventListener('change',()=>{if(check.checked){if(selectedTargets.size===3){check.checked=false;toast('O Guardião atinge no máximo três alvos.');return;}selectedTargets.add(q.id);}else{if(q.id===a.target){check.checked=true;return;}selectedTargets.delete(q.id);}counter.textContent=`${selectedTargets.size} de 3 alvos selecionados`;});root.append(label);
 }
 root.append(button('Confirmar ataque',()=>{closeOptions();submit('move',{input:{...a,targets:[...selectedTargets]}});},true));overlay.hidden=false;return;}
 if(['hit','copyHit'].includes(a.kind)){const p=game.piece(a.p),t=game.piece(a.target);if(t&&t.type!=='king'){
  pickOptions('Ataque com captura','O ataque pode eliminar o alvo. O que deseja fazer após o golpe?',[
   {label:'Atacar sem avançar',choose:()=>submit('move',{input:{...a,advance:false}})},
   {label:'Atacar e ocupar a casa do alvo',choose:()=>submit('move',{input:{...a,advance:true}})}]);return;}}
 submit('move',{input:a});}
function button(label,fn,emphasis=false){const b=document.createElement('button');b.type='button';b.textContent=label;b.className=emphasis?'primary':'';b.onclick=fn;return b;}
function paintActions(){const root=$('actionsPanel');root.replaceChildren();const dir=$('direction');dir.replaceChildren();if(!game||!room)return;
 const s=game.s;
 if(room.status==='waiting'){root.append(button('Aguardando outro jogador…',()=>{},false));root.lastChild.disabled=true;return;}
 if(s.phase==='setup'){
  if(myTurn()){
   const n=s.traps.filter(t=>t.side===room.side).length;root.append(button(`Confirmar armadilhas (${n}/2)`,()=>submit('ready'),true));root.append(document.createTextNode('Toque numa casa vazia para colocar ou remover uma armadilha.'));
  }else root.textContent='Aguardando o adversário posicionar suas armadilhas.';return;
 }
 if(s.phase==='over'){root.textContent=s.winner===-1?'Partida encerrada em empate.':s.winner===room.side?'Você venceu a partida!':'O adversário venceu a partida.';return;}
 if(!myTurn()){root.textContent='Aguarde seu turno. Você pode tocar nas peças para consultar suas habilidades.';return;}
 if(s.fieldPending){const p=game.piece(s.fieldPending.pid);if(p&&p.side===room.side){root.append(document.createTextNode('Campo mágico ativado — escolha um efeito:'));
  for(let o of game.fieldOptions(p)){
   if(o.kind==='summon')root.append(button(o.label,()=>pickOptions('Invocar Aprendiz','Escolha uma unidade. Em seguida, toque numa casa adjacente vazia.',[
    {label:'Aprendiz Soldado',choose:()=>{picker={kind:'summon',type:'soldier'};paint();}},{label:'Aprendiz Arqueiro',choose:()=>{picker={kind:'summon',type:'archer'};paint();}}])));
   else if(o.kind==='transform')root.append(button(o.label,()=>pickOptions('Transformação','Escolha a nova classe:',['soldier','archer','colossus','wolf','scout','guardian'].map(type=>({label:aliases[type],choose:()=>submit('field',{input:{kind:'transform',type}})})))));
   else if(o.kind==='reunion')root.append(button(o.label,()=>{picker={kind:'reunionAlly'};paint();}));
   else if(o.kind==='evolve')root.append(button(o.label,()=>submit('field',{input:{kind:'evolve'}})));
   else root.append(button(o.label,()=>submit('field',{input:{kind:o.kind}})));
  }
  root.append(button('Não ativar o campo',()=>submit('field',{input:{kind:'skip'}})));
  if(picker)root.append(button('Cancelar seleção',()=>{picker=null;paint();}));
 }return;}
 if(game.s.combo)root.append(button('Encerrar segundo ataque',()=>submit('pass'),false));else root.append(button('Passar turno',()=>submit('pass')));
 const p=game.piece(selected);if(p&&p.side===room.side&&(p.type==='scout'||p.type==='king'&&p.copy?.type==='scout')){
  for(const [d,label] of [['up','V ↑'],['down','V ↓'],['left','V ←'],['right','V →']])dir.append(button(label,()=>{orientation=d;paint();},orientation===d));
 }
}
function paint(){if(!game||!room)return;let s=game.s,$board=$('onlineBoard');$board.replaceChildren();const hints=activeHints();
 for(let y=0;y<10;y++)for(let x=0;x<10;x++){
  const cell=document.createElement('button');cell.type='button';cell.className='sq '+((x+y)%2?'dark':'light');cell.setAttribute('role','gridcell');cell.setAttribute('aria-label',`Casa ${'ABCDEFGHIJ'[x]}${10-y}`);
  const field=game.field(x,y);if(field){cell.classList.add(field.kind==='heal'?'heal':'crystal');let ico=document.createElement('span');ico.className='tileMark';ico.textContent=field.kind==='heal'?'✚':'◆';cell.append(ico);}
  if(s.traps.some(t=>t.side===room.side&&t.x===x&&t.y===y))cell.classList.add('ownTrap');
  const p=pieceAt(x,y);if(p){const div=document.createElement('span');div.className='online-unit '+(p.side===0?'red':'blue')+(p.original?' original':'');const img=document.createElement('img');img.src='/assets/'+tokens[p.type];img.alt=aliases[p.type];div.append(img);
   if(p.type==='king'){const h=document.createElement('span');h.className='mini';h.textContent='♥'+p.hp;div.append(h);}
   if(p.mark||p.stun||p.freeze){const st=document.createElement('span');st.className='mark';st.textContent=p.freeze?'⚑':p.stun?'❄':'✧';div.append(st);}
   cell.append(div);
  }
  if(hints.has(x+','+y))cell.classList.add(hints.get(x+','+y));if(p?.id===selected)cell.classList.add('isSelected');cell.onclick=()=>boardClick(x,y);$board.append(cell);
 }
 $('redStatus').textContent='RUBROS · '+s.pieces.filter(p=>p.side===0).length+' peças'+(s.side===0&&s.phase==='play'?' • TURNO':'');
 $('blueStatus').textContent='AZUIS · '+s.pieces.filter(p=>p.side===1).length+' peças'+(s.side===1&&s.phase==='play'?' • TURNO':'');
 $('phase').textContent=s.phase==='setup'?'ARMADILHAS':s.phase==='play'?'EM COMBATE':s.phase==='over'?'FIM':'ESPERA';
 $('battleStatus').textContent=room.status==='waiting'?'Compartilhe o convite e aguarde o segundo comandante.':s.phase==='setup'?(myTurn()?'Sua vez de posicionar duas armadilhas.':'O adversário prepara as armadilhas em segredo.'):s.phase==='over'?(s.winner===-1?'Empate.':`Vitória dos ${colors[s.winner]}.`):s.fieldPending?'Uma peça alcançou um campo mágico. Escolha o efeito.':s.combo?'O Batedor pode realizar seu segundo ataque.':s.reaction?'Reação Real: movimento defensivo, resgate ou ataque copiado.':myTurn()?'É o seu turno. Escolha uma ação.':'Aguardando a jogada do adversário.';
 const logs=$('log');logs.replaceChildren();for(const entry of s.logs.slice(0,12)){const d=document.createElement('div');d.className='logentry';d.textContent=entry.msg;logs.append(d);}
 let p=game.piece(selected);$('selectedTitle').textContent=p?aliases[p.type]+' · '+colors[p.side]:'Nenhuma peça';$('pieceGuide').textContent=p?guides[p.type]:'Toque numa unidade para consultar suas regras.';
 $('unitDescription').textContent=p?`${aliases[p.type]} — ${guides[p.type]}`:'Toque em uma peça para ver descrição, ataque e especial.';
 paintActions();paintTime();}
function paintTime(){if(!deadline||room?.status==='waiting'||game?.s.phase==='over'){$('clock').textContent='--:--';return;}const ms=Math.max(0,deadline-Date.now()-clockOffset),sec=Math.max(0,Math.ceil(ms/1000));$('clock').textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');}
setInterval(paintTime,250);
async function init(){const code=new URLSearchParams(location.search).get('room')?.toUpperCase();if(!code)return;
 $('roomCode').value=code;if(!/^[A-Z2-9]{7}$/.test(code))return;
 room={code};try{const res=await fetch(`/api/online/rooms/${code}`,{credentials:'same-origin',cache:'no-store'});if(res.status===403){$('roomCode').value=code;toast('Convite identificado. Clique em “Entrar na sala” para jogar.');return;}if(!res.ok)throw new Error('Sala não encontrada.');await refresh();listen();}catch(e){toast(errMsg(e));}}
async function recent(){try{const response=await fetch('/api/online/recent',{credentials:'same-origin',cache:'no-store'});if(!response.ok)return;const data=await response.json();const info=$('playerIdentity');if(info)info.textContent=data.authenticated?'Comandante '+data.username+' · suas salas ficam vinculadas à conta.':'Modo convidado · entre na conta para retomar salas em outro dispositivo.';const list=$('recentRooms');if(!list)return;list.replaceChildren();for(const r of data.rooms||[]){const a=document.createElement('a');a.className='recent-room';a.href=r.url;const title=document.createElement('strong');title.textContent='Sala '+r.code;const status=document.createElement('span');status.textContent=(r.side===0?'Rubros':'Azuis')+' · '+({waiting:'aguardando adversário',active:'em andamento',over:'encerrada'}[r.status]||r.status);a.append(title,status);list.append(a);}$('recentSection').hidden=!data.rooms?.length;}catch{}}
$('roomCode').addEventListener('keydown',e=>{if(e.key==='Enter')joinRoom();});
$('roomCode').addEventListener('paste',e=>{const value=e.clipboardData.getData('text').trim();try{const code=new URL(value).searchParams.get('room');if(code){e.preventDefault();$('roomCode').value=code.toUpperCase().slice(0,7);}}catch{}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&room?.state)refresh();});
setInterval(()=>{if(room?.state&&!document.hidden&&!connected)refresh();},15000);
recent();init();
window.KharTallOnline={getGame:()=>game,refresh,code:()=>room?.code,side:()=>room?.side};
})();
