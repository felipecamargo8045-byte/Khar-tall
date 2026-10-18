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
const characters=[
 ['Aprendiz Soldado','soldier',[
  ['Movimento do Aprendiz Soldado',/uma casa nas oito direções/],['Espada do Soldado',/Não ataca na diagonal/],['Evolução do Soldado em Colosso',/mesmo Soldado vira Colosso/]]],
 ['Aprendiz Arqueiro','archer',[
  ['Movimento do Aprendiz Arqueiro',/uma casa nas oito direções/],['Flecha do Arqueiro',/duas casas nas quatro diagonais/],['Evolução do Arqueiro em Batedor',/ganha marcação, execução e segundo ataque/]]],
 ['Batedor','scout',[
  ['Movimento do Batedor',/uma casa nas oito direções/],['Orientação da magia em V',/Cada diagonal para na primeira peça/],['Marcação do Batedor',/sem causar dano/],['Execução do Batedor',/cada execução tira somente uma vida/],['Segundo ataque do Batedor',/outra peça não pode agir/]]],
 ['Lobo','wolf',[
  ['Movimento do Lobo',/três por duas casas/],['Mordida do Lobo',/armadilha inimiga no destino anula/],['Repouso após a mordida',/próximo turno do seu time/],['Resgate Real pelo Lobo',/Rei recebe uma Cópia Real/]]],
 ['Colosso','colossus',[
  ['Movimento do Colosso',/uma casa nas oito direções/],['Investida do Colosso',/três casas na horizontal ou vertical/],['Esmagamento do Colosso',/limite de dois alvos do Guardião não se aplica/],['Investida defensiva para campo',/mesmo sem inimigo no trajeto/],['Resgate Real pelo Colosso',/exatamente três casas na horizontal ou vertical/]]],
 ['Guardião','guardian',[
  ['Movimento do Guardião',/Não salta unidades/],['Ataque ao redor do Guardião',/até 2 inimigos a até 2 casas/],['Ataque em reta do Guardião',/até cinco casas/],['Proteção do Guardião original',/criado por transformação não o substitui/]]],
 ['Rei','king',[
  ['Movimento do Rei',/uma ou duas casas/],['Explosão do Rei',/Não é um ataque em área/],['Duas vidas do Rei',/não ressuscita/],['Cópia Real',/duas casas e dois alvos ao redor/],
  ['Cópia Real · Espada',/uma casa de distância em \+/],['Cópia Real · Flecha',/alcance do Arqueiro/],['Cópia Real · Magia do Batedor',/não recebe o segundo ataque/],['Cópia Real · Salto do Lobo',/não há repouso do Lobo para o Rei/],['Cópia Real · Investida do Colosso',/Não prepara Esmagamento/],['Cópia Real · Área do Guardião',/A terceira casa não é alcançada/],['Cópia Real · Reta do Guardião',/cinco casas/],['Cópia Real · Explosão',/Reação Real/],
  ['Reação Real',/Não é um turno extra/],['Rei sob marcação ou armadilha',/A marcação impede movimento e ataque próprio/],['Receber o Resgate Real',/não recupera vidas/]]]
];
function exact(view,label){
 const b=view.get('modalRoot').querySelectorAll('button').find(b=>b.textContent===label||b.innerHTML.startsWith('<strong>'+label+'</strong>'));
 assert.ok(b,'Botão exato '+label);b.click();
}
const view=ui();view.api.launch('ai',3);const before=JSON.stringify(view.api.getGame().snapshot()),saved=view.saved();
function preserved(){view.advance(180000);assert.equal(JSON.stringify(view.api.getGame().snapshot()),before,'Ler não muda o estado nem esgota o relógio local');assert.equal(view.saved(),saved,'Ler não sobrescreve o salvamento');}
view.get('tutorialButton').click();assert.match(view.get('modalRoot').textContent,/Personagens e habilidades · índice/);
let skillCount=0;
for(const [name,type,skills]of characters){
 exact(view,name);assert.ok(view.get('modalRoot').textContent.includes(name+' · habilidades'));
 exact(view,'Visão geral do '+name);
 const image=view.get('modalRoot').querySelector('img');assert.ok(image.src.includes('khar_tall_'),'O personagem usa a arte original');assert.ok(image.alt.includes(name));
 assert.equal(view.get('modalRoot').querySelector('details').open,true,'A imagem do personagem aparece aberta, inclusive a do Colosso');
 for(let i=0;i<skills.length;i++){
  view.clickText('Próximo →');const [title,fact]=skills[i],text=view.get('modalRoot').textContent;
  assert.equal(view.get('modalRoot').querySelector('h2').textContent.split(' · ').slice(1).join(' · '),title,'Próximo mostra cada habilidade separadamente e em ordem');
  assert.match(text,fact,title);assert.ok(text.includes(`Habilidade ${i+1} de ${skills.length}`));assert.ok(view.get('modalRoot').querySelectorAll('li').length>=3);
  preserved();skillCount++;
 }
 view.clickText('Habilidades do '+name);
 for(let i=0;i<skills.length;i++){
  exact(view,`${i+1}. ${skills[i][0]}`);assert.match(view.get('modalRoot').textContent,skills[i][1]);view.clickText('Habilidades do '+name);
 }
 view.clickText('Todos os personagens');
}
assert.equal(skillCount,39,'Todos os sete personagens têm suas 39 explicações individuais, incluindo oito cópias do Rei');
// Preserve all 21 previously published explanations, including shared terrain powers.
view.clickText('Poderes do tabuleiro e todas as ações');
for(const [title,fact]of pages){
 exact(view,title);assert.match(view.get('modalRoot').textContent,fact,title);preserved();
 view.clickText('Índice do tutorial');view.clickText('Poderes do tabuleiro e todas as ações');
}
view.clickText('Voltar à explicação');assert.ok(view.get('modalRoot').textContent.includes(pages.at(-1)[0]));
view.clickText('← Anterior');assert.ok(view.get('modalRoot').textContent.includes('Atacar e avançar'));
view.clickText('Próximo →');view.clickText('Concluir tutorial');assert.equal(JSON.stringify(view.api.getGame().snapshot()),before);
// Complete sequential traversal cannot skip or duplicate any character or skill.
view.get('tutorialButton').click();view.clickText('Voltar à explicação');
const visited=[],total=Number(view.get('modalRoot').querySelector('.tutorialProgress').getAttribute('aria-valuemax'));
for(let i=0;i<total;i++){
 const root=view.get('modalRoot'),title=root.querySelector('h2').textContent;
 assert.ok(title.startsWith(`Tutorial ${i+1}/${total} · `));visited.push(title.split(' · ').slice(1).join(' · '));
 assert.equal(root.querySelector('.tutorialProgress').getAttribute('aria-valuenow'),String(i+1));
 if(i<total-1)view.clickText('Próximo →');else view.clickText('Concluir tutorial');
}
assert.equal(new Set(visited).size,total,'Nenhuma etapa se repete');
for(const [name,,skills]of characters){assert.ok(visited.some(t=>t===name||name==='Rei'&&t==='Rei e a condição de vitória'));for(const [title]of skills)assert.ok(visited.includes(title),title);}
const menu=ui();menu.clickText('Tutorial ilustrado');exact(menu,'Colosso');exact(menu,'2. Investida do Colosso');menu.clickText('Fechar');menu.clickText('Aprender jogando');assert.equal(menu.get('learningPanel').hidden,false);
const linked=ui(JSON.parse(saved),{search:'?abrir=tutorial&personagem=colossus'});
assert.match(linked.get('modalRoot').querySelector('h2').textContent,/ · Colosso$/);assert.equal(linked.get('modalRoot').querySelector('details').open,true);assert.equal(linked.saved(),saved);
linked.clickText('1. Movimento do Colosso');linked.clickText('Fechar');assert.equal(JSON.stringify(linked.api.getGame().snapshot()),before,'Link direto restaura a partida ao consultar o tutorial');
const fallback=ui(null,{search:'?abrir=tutorial&personagem=inexistente'});assert.match(fallback.get('modalRoot').textContent,/Personagens e habilidades · índice/);
console.log(`Tutorial OK: seven visible characters, ${skillCount} individual skills, eight royal copies, all 21 earlier actions, ${total} sequential steps, direct indexes/links, paused local timer and preserved saves.`);
