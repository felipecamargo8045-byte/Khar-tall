'use strict';
const assert=require('node:assert/strict');
const {ui}=require('./test_trap_visibility.js'),guide=require('../learning.js'),{KharTall}=require('../engine.js');
const v=ui();v.api.launch('ai',3,true);const original=v.saved();
v.get('learnButton').click();v.advance(180000);assert.equal(v.api.getGame().s.phase,'setup');
v.get('finishSetup').click();assert.doesNotMatch(v.get('modalRoot').textContent,/concluído/,'Empty exercise cannot be confirmed');
v.get('board').children[55].click();assert.equal(v.api.getGame().s.traps.length,0,'Unrelated clicks do not advance exercise');
v.get('board').children[54].click();v.get('finishSetup').click();
for(let i=1;i<guide.lessons.length;i++){
 v.clickText('Próximo exercício');const l=guide.lessons[i];
 v.get('board').children[l.target[1]*10+l.target[0]].click();assert.doesNotMatch(v.get('modalRoot').textContent,/concluído/,'Select piece before action');
 v.get('board').children[l.source[1]*10+l.source[0]].click();v.get('board').children[l.target[1]*10+l.target[0]].click();
 if(i===4)assert.equal(v.api.getGame().king(1).hp,1,'Actual engine removes exactly one king life');
 assert.equal(v.saved(),original,'Exercises never replace the real match save');
}
assert.equal(v.api.getGame().s.winner,0,'Last exercise actually satisfies victory conditions');
v.key('Escape');assert.match(v.get('modalRoot').textContent,/Você concluiu/,'Completion keeps its next/menu controls accessible');
v.clickText('Voltar ao menu');assert.equal(JSON.stringify(v.api.getGame().snapshot()),original,'Original game restored after completion');
const resumed=ui(JSON.parse(original));resumed.clickText('Continuar partida');resumed.advance(180000);assert.equal(resumed.api.getGame().s.phase,'setup');assert.equal(resumed.get('timer').textContent,'SEM TEMPO');
resumed.get('finishSetup').click();resumed.get('passTurn').click();resumed.get('settingsButton').click();resumed.advance(180000);resumed.clickText('Fechar');resumed.aiStep();assert.equal(resumed.api.getGame().s.side,0,'Untimed AI resumes after reading settings');
const timed=ui();timed.api.launch('ai',1);timed.advance(61000);assert.equal(timed.api.getGame().s.phase,'play','Timed preparation still expires');timed.advance(61000);assert.equal(timed.api.getGame().s.side,1,'Timed turns still expire');
const linked=ui(JSON.parse(original),{search:'?abrir=aprender'});linked.get('learningExit').click();assert.equal(JSON.stringify(linked.api.getGame().snapshot()),original,'Deep-linked exercises preserve the saved match');
const pursued=guide.create(KharTall,5);assert.match(guide.objective(pursued.s),/3 turnos próprios/);assert.ok(pursued.act(guide.action(pursued,5)));assert.match(guide.objective(pursued.s),/Vitória dos Rubros/);
const draw=guide.create(KharTall,5);draw.pass();assert.match(guide.objective(draw.s),/2 turnos próprios/);draw.pass();assert.match(guide.objective(draw.s),/2 turnos próprios/,'Defender turn does not consume attacker countdown');draw.pass();assert.match(guide.objective(draw.s),/1 turno próprio/);draw.pass();draw.pass();assert.equal(draw.s.winner,-1);assert.match(guide.objective(draw.s),/Empate/);
const menu=ui();menu.clickText('Configurações');menu.clickText('Fechar');menu.clickText('Aprender jogando');assert.equal(menu.get('learningPanel').hidden,false,'Settings return to start menu when opened there');
console.log('Learning OK: six real-engine exercises, preserved saves, direct links, untimed resume, AI after help, normal timeouts and victory countdown.');
