'use strict';
const assert=require('node:assert/strict');
const {ui}=require('./test_trap_visibility.js');
const pages=[
 ['Armadilhas ocultas',/até duas armadilhas/],
 ['Ativação e recarga dos campos',/três rodadas completas/],
 ['Evolução dos Aprendizes',/Transforma-se em Colosso/],
 ['Cura Real por sacrifício',/A peça escolhida é removida/],
 ['Invocação pelo Cristal',/menos de 20 peças/],
 ['Transformação pelo Cristal',/não é possível criar outro Rei/],
 ['Reunião e teletransporte',/outro aliado/],
 ['Investida do Colosso',/três casas na horizontal ou vertical/],
 ['Esmagamento do Colosso',/limite de dois alvos do Guardião não se aplica/],
 ['Investida defensiva para campo',/mesmo sem inimigo no trajeto/],
 ['Salto e ataque do Lobo',/três casas por um eixo e duas pelo outro/],
 ['Resgate Real',/trocar de posição com o Rei aliado ferido/],
 ['Marcação do Batedor',/sem causar dano/],
 ['Execução do Batedor',/cada execução tira somente uma vida/],
 ['Segundo ataque do Batedor',/outra peça não pode agir/],
 ['Ataque ao redor do Guardião',/até 2 inimigos a até 2 casas/],
 ['Ataque em reta do Guardião',/até cinco casas/],
 ['Cópia Real',/duas casas e dois alvos ao redor/],
 ['Reação Real',/Não é um turno extra/],
 ['Atacar e avançar',/se o alvo for eliminado/],
 ['Encerrar turno e ignorar campo',/Passar consome o turno/]
];
const view=ui();view.api.launch('ai',3);const before=JSON.stringify(view.api.getGame().snapshot()),saved=view.saved();
view.get('tutorialButton').click();view.clickText('Ações especiais');
assert.match(view.get('modalRoot').textContent,/Ações especiais · índice/);
for(const [title,fact]of pages){
 view.clickText(title);
 const text=view.get('modalRoot').textContent;assert.ok(text.includes(title),title);assert.match(text,fact,title);
 assert.ok(view.get('modalRoot').querySelectorAll('li').length>=3,'Cada ação explica uso, efeito e limites');
 view.advance(180000);assert.equal(JSON.stringify(view.api.getGame().snapshot()),before,'O tutorial não altera a partida nem deixa vencer o cronômetro');
 assert.equal(view.saved(),saved,'As explicações não substituem a partida salva');view.clickText('Ações especiais');
}
view.clickText('Voltar à explicação');assert.ok(view.get('modalRoot').textContent.includes(pages.at(-1)[0]));
view.clickText('← Anterior');assert.ok(view.get('modalRoot').textContent.includes('Atacar e avançar'));
view.clickText('Próximo →');view.clickText('Concluir tutorial');assert.equal(JSON.stringify(view.api.getGame().snapshot()),before);
const menu=ui();menu.clickText('Tutorial ilustrado');menu.clickText('Ações especiais');menu.clickText('Cura Real por sacrifício');menu.clickText('Fechar');menu.clickText('Aprender jogando');assert.equal(menu.get('learningPanel').hidden,false,'O tutorial aberto pelo menu retorna ao menu');
console.log('Tutorial OK: all 21 special-action explanations, direct index navigation, new Guardian limits, previous/next, timer pause and preserved saves.');
