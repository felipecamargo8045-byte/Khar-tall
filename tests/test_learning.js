'use strict';
const assert=require('node:assert/strict');
const {ui}=require('./test_trap_visibility.js'),guide=require('../learning.js'),{KharTall}=require('../engine.js');
const at=(view,cell)=>view.get('board').children[cell[1]*10+cell[0]].click();
const button=(view,root,label)=>{const b=view.get(root).querySelectorAll('button').find(b=>b.textContent.includes(label));assert.ok(b,'Botão '+label);b.click();};
const index=id=>{const n=guide.lessons.findIndex(l=>l.id===id);assert.ok(n>=0,id);return n;};
function actStep(view,i,stage){
 const g=view.api.getGame(),l=guide.lessons[i],step=guide.step(g,i,stage);
 if(step.kind==='trap'){view.get('finishSetup').click();assert.doesNotMatch(view.get('learningText').textContent,/Exercício concluído/);at(view,[5,5]);assert.equal(g.s.traps.length,0);at(view,step.target);view.get('finishSetup').click();return;}
 if(step.kind==='pass'){view.get('passTurn').click();return;}
 if(step.kind==='field'){
  assert.ok(g.s.fieldPending,l.id);
  if(step.choice==='healKing')view.clickText('Sacrificar para curar o Rei');
  if(step.choice==='skip')view.clickText('Não utilizar o campo');
  if(step.choice==='summon'){view.clickText('Invocar Aprendiz');view.clickText(step.summonType==='soldier'?'Aprendiz Soldado':'Aprendiz Arqueiro');at(view,step.target);}
  if(step.choice==='transform'){view.clickText('Transformar esta peça');assert.equal(view.get('modalRoot').querySelectorAll('.modalOption').length,6,'Todas as transformações são apresentadas');view.clickText('Colosso');}
  if(step.choice==='reunion'){view.clickText('Reunião:');const king=g.king(0);at(view,[king.x,king.y]);assert.ok(view.get('board').children.filter(c=>c.classList.contains('moveHint')).length>80,'Reunião mostra os destinos livres');at(view,step.target);}
  return;
 }
 const a=guide.action(g,i,stage);assert.ok(a,l.id+' etapa '+stage);
 at(view,[a.x,a.y]);assert.doesNotMatch(view.get('learningText').textContent,/Exercício concluído/,'Selecionar a peça antes da ação');
 at(view,step.source);
 const hints=view.get('board').children.filter(c=>['moveHint','attackHint','skillHint'].some(k=>c.classList.contains(k)));
 assert.equal(hints.length,new Set(guide.options(g,i,stage,'up').map(a=>a.x+','+a.y)).size,'Todas as opções reais da ação são destacadas');
 if(step.kind==='move'||step.kind==='copyMove')assert.ok(hints.every(c=>c.classList.contains('moveHint')));
 if(l.id==='soldier-hit-stay')assert.equal(view.get('board').children.filter(c=>c.classList.contains('attackRangeHint')).length,4,'As quatro direções da espada aparecem mesmo sem inimigos em todas');
 if(l.id==='scout-mark'){
  assert.equal(view.get('orientation').querySelectorAll('button').length,4,'As quatro orientações do V estão disponíveis');
  button(view,'orientation','V ↓');assert.ok(view.get('board').children[71].classList.contains('attackHint'));button(view,'orientation','V ↑');
 }
 at(view,[a.x,a.y]);
 if(['area','copyArea'].includes(a.kind)){
  button(view,'selectionActions','Confirmar ataque');assert.doesNotMatch(view.get('learningText').textContent,/Exercício concluído/,'Treino exige praticar os dois alvos');
  at(view,[5,5]);at(view,[3,3]);assert.equal(view.get('board').children.filter(c=>c.classList.contains('targetChosen')).length,2,'Seleção não aceita um terceiro alvo');button(view,'selectionActions','Confirmar ataque');
 }else if(view.get('modalRoot').textContent.includes('Ataque com captura'))view.clickText(step.advance?'Atacar e ocupar a casa':'Atacar e permanecer');
}
const v=ui();v.api.launch('ai',3,true);const original=v.saved();v.get('learnButton').click();v.advance(180000);assert.equal(v.api.getGame().s.phase,'setup');
const coverage=new Set();
for(let i=0;i<guide.lessons.length;i++){
 if(i)v.get('learningNext').click();const l=guide.lessons[i],g=v.api.getGame();coverage.add(l.id);
 const actorId=g.lessonActorId,actorBefore=g.piece(actorId)?{...g.piece(actorId)}:null,kingBefore=g.king(0)?{...g.king(0)}:null,piecesBefore=g.s.pieces.map(p=>({...p}));
 for(let stage=0;stage<l.steps.length;stage++){
  actStep(v,i,stage);assert.equal(v.saved(),original,'Nenhum exercício substitui o salvamento real');
  if(stage<l.steps.length-1)assert.doesNotMatch(v.get('learningText').textContent,/Exercício concluído/,'Etapas intermediárias não encerram o exercício');
  if(l.id==='scout-double'&&stage===0){assert.equal(g.s.combo.pid,actorId);assert.equal(g.s.turnSerial,0);}
  if(l.id==='colossus-smash'&&stage===0){assert.equal(g.piece(actorId).charge,1);assert.equal(g.s.side,0);}
 }
 assert.match(v.get('learningText').textContent,/Exercício concluído/,l.id);
 assert.equal(v.get('modalRoot').children.length,0,'O tabuleiro e os efeitos ficam visíveis após cada ataque');
 const actor=g.piece(actorId);
 if(l.id.startsWith('copy-'))assert.equal(actor.copy,null,'A técnica copiada foi consumida');
 if(l.id==='soldier-hit-stay')assert.deepEqual([actor.x,actor.y],[3,5]);
 if(l.id==='soldier-hit-advance')assert.deepEqual([actor.x,actor.y],[4,5]);
 if(l.id.endsWith('-evolve'))assert.equal(actor.type,l.id.startsWith('soldier')?'colossus':'scout');
 if(l.id==='scout-mark'){const target=g.s.pieces.find(p=>p.mark?.by===0);assert.ok(target?.stun);assert.equal(target.hp,1);}
 if(l.id==='scout-double')assert.equal(g.s.pieces.filter(p=>p.side===1).length,2);
 if(l.id==='scout-execute-king'){assert.equal(g.king(1).hp,1);assert.equal(g.king(1).copy.type,'scout');}
 if(l.id==='wolf-hit')assert.ok(actor.rest);
 if(l.id==='wolf-rest')assert.equal(actor.rest,null);
 if(l.id==='wolf-trap'){assert.deepEqual([actor.x,actor.y],[3,5]);assert.ok(actor.freeze);assert.ok(g.pieceAt(6,3));}
 if(l.id==='colossus-charge')assert.equal(actor.charge,1);
 if(l.id==='colossus-smash'){assert.equal(actor.charge,0);assert.equal(g.s.pieces.filter(p=>p.side===1).length,2);assert.deepEqual([actor.x,actor.y],[4,2]);}
 if(l.id==='colossus-king-block'){assert.equal(g.king(1).hp,1);assert.ok(g.pieceAt(3,3));assert.deepEqual([actor.x,actor.y],[3,5]);assert.equal(actor.charge,0);}
 if(l.id==='colossus-trap'){assert.ok(actor.freeze);assert.ok(g.pieceAt(3,3));assert.equal(actor.charge,0);}
 if(l.id.includes('-rescue')){assert.deepEqual([g.king(0).x,g.king(0).y],[actorBefore.x,actorBefore.y]);assert.deepEqual([actor.x,actor.y],[kingBefore.x,kingBefore.y]);assert.equal(g.king(0).hp,l.scene.emergency?kingBefore.hp-1:kingBefore.hp);assert.equal(g.king(0).copy.type,l.scene.type);}
 if(['guardian-area','copy-area'].includes(l.id))assert.equal(g.s.pieces.filter(p=>p.side===1).length,3,'Exatamente dois dos três alvos são abatidos');
 if(['colossus-field-charge','heal-king','heal-original'].includes(l.id)){assert.equal(g.king(0).hp,2);assert.equal(actor,null);assert.ok(g.s.fields[0].need.some(n=>n>0));}
 if(l.id.startsWith('summon-')){assert.equal(g.s.pieces.length,piecesBefore.length+1);assert.equal(g.pieceAt(8,0).type,l.steps[1].summonType);assert.ok(actor);}
 if(l.id==='transform')assert.equal(actor.type,'colossus');
 if(l.id==='reunion'){assert.equal(actor,null);assert.deepEqual([g.king(0).x,g.king(0).y],[2,6]);}
 if(l.id==='field-skip'){assert.equal(g.s.pieces.length,piecesBefore.length);assert.equal(g.s.fields[1].need[0],0);}
 if(l.id==='king-lives'){assert.equal(g.king(1).hp,1);assert.equal(g.king(1).copy.type,'soldier');assert.equal(g.s.reaction.side,1);}
 if(l.id==='king-interpose'){const attacker=g.s.pieces.find(p=>p.side===1&&!p.original&&p.type==='guardian');assert.ok(!g.guardianLineTargets(attacker).some(p=>p.id===g.king(0).id));}
 v.advance(180000);assert.equal(v.saved(),original);
}
const kinds=new Set(guide.lessons.flatMap(l=>l.steps.map(s=>s.kind)));for(const kind of ['move','hit','charge','fieldCharge','smash','rescue','wolfHit','area','line','mark','execute','copyMove','copyWolfHit','copyCharge','copyHit','copyArea','copyLine'])assert.ok(kinds.has(kind),'Ação ensinada: '+kind);
assert.equal(coverage.size,58);assert.equal(v.api.getGame().s.winner,0,'Último exercício satisfaz a vitória no motor real');
v.get('learningNext').click();assert.equal(JSON.stringify(v.api.getGame().snapshot()),original,'Sair restaura a partida anterior');
// Every transformation choice is a real legal field action.
for(const type of ['soldier','archer','colossus','wolf','scout','guardian']){const i=index('transform'),g=guide.create(KharTall,i);assert.ok(g.act(guide.action(g,i)));assert.ok(g.fieldChoice({kind:'transform',type}));assert.equal(g.piece(g.lessonActorId).type,type);}
// Movement accepts a different valid cell, not just the suggested target.
for(const type of Object.keys(require('../engine.js').KharTall.CONSTANTS.NAMES)){
 const i=index(type+'-move'),view=ui(JSON.parse(original),{search:'?abrir=aprender&licao='+type+'-move'}),g=view.api.getGame(),choices=guide.options(g,i),a=choices.at(-1);at(view,[g.piece(a.p).x,g.piece(a.p).y]);at(view,[a.x,a.y]);
 // Guardian may enter a magic field; refusing its optional power finishes the move.
 if(g.s.fieldPending)view.clickText('Não utilizar o campo');
 assert.match(view.get('learningText').textContent,/Exercício concluído/,type);view.get('learningRepeat').click();assert.doesNotMatch(view.get('learningText').textContent,/Exercício concluído/);view.get('learningExit').click();assert.equal(JSON.stringify(view.api.getGame().snapshot()),original);
}
const linked=ui(JSON.parse(original),{search:'?abrir=aprender&licao=colossus-smash'});assert.ok(linked.get('learningTitle').textContent.includes('Investida e Esmagamento'));linked.get('learningIndex').click();linked.clickText('Colosso');linked.clickText('Investida defensiva e Cura Real');assert.ok(linked.get('learningTitle').textContent.includes('Investida defensiva'));linked.get('learningExit').click();assert.equal(JSON.stringify(linked.api.getGame().snapshot()),original);
const resumed=ui(JSON.parse(original));resumed.clickText('Continuar partida');resumed.advance(180000);assert.equal(resumed.api.getGame().s.phase,'setup');assert.equal(resumed.get('timer').textContent,'SEM TEMPO');resumed.get('finishSetup').click();resumed.get('passTurn').click();resumed.get('settingsButton').click();resumed.advance(180000);resumed.clickText('Fechar');resumed.aiStep();assert.equal(resumed.api.getGame().s.side,0);
const timed=ui();timed.api.launch('ai',1);timed.advance(61000);assert.equal(timed.api.getGame().s.phase,'play');timed.advance(61000);assert.equal(timed.api.getGame().s.side,1);
const pursued=guide.create(KharTall,index('victory'));assert.match(guide.objective(pursued.s),/3 turnos próprios/);assert.ok(pursued.act(guide.action(pursued,index('victory'))));assert.match(guide.objective(pursued.s),/Vitória dos Rubros/);
const draw=guide.create(KharTall,index('victory'));draw.pass();assert.match(guide.objective(draw.s),/2 turnos próprios/);draw.pass();assert.match(guide.objective(draw.s),/2 turnos próprios/);draw.pass();assert.match(guide.objective(draw.s),/1 turno próprio/);draw.pass();draw.pass();assert.equal(draw.s.winner,-1);
console.log('Learning OK: all 58 playable exercises, every character movement/attack, combos, rescues, royal copies/reactions, fields and choices, visible outcomes, full legal movement highlights, repeat/index/deep links, saved matches and victory countdown.');
