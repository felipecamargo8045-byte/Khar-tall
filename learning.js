/* Playable lessons use the unmodified real rules engine. No account or network. */
(function(root){'use strict';
const names={soldier:'Soldado',archer:'Arqueiro',scout:'Batedor',wolf:'Lobo',colossus:'Colosso',guardian:'Guardião',king:'Rei'};
const groups=[['basics','Preparação'],...Object.entries(names),['fields','Campos e poderes'],['victory','Vitória']].map(([id,title])=>({id,title}));
const action=(kind,target,instruction,extra={})=>({kind,target,instruction,...extra});
const enemy=(x,y,extra={})=>({type:'soldier',x,y,...extra});
const lesson=(id,group,title,scene,steps,success)=>({id,group,title,scene,steps,success});
const movement=type=>lesson(type+'-move',type,'Movimento do '+names[type],{type,source:[3,5]},[
 action('move',[3,4],type==='wolf'?'Selecione o Lobo em D5. Veja todos os saltos em L de 3×2 ou 2×3 destacados e escolha qualquer destino verde. Não precisa visitar todos.':type==='guardian'?'Selecione o Guardião em D5. Todas as casas livres em linha, coluna e diagonal ficam verdes. Escolha qualquer uma; o movimento para diante de peças.':type==='king'?'Selecione o Rei em D5. Veja todas as opções de uma ou duas casas nas oito direções e escolha qualquer destino verde.':'Selecione o '+names[type]+' em D5. Veja as oito direções de movimento e escolha qualquer casa verde adjacente.',{anyTarget:true})
 ],'Movimento realizado pelo motor do jogo. Todas as casas verdes eram opções reais; bastava escolher uma. Mover consome a ação, respeitando campos, bloqueios e armadilhas.');
const sword=(id,advance)=>lesson(id,'soldier',advance?'Espada: atacar e avançar':'Espada: atacar e permanecer',{type:'soldier',source:[3,5],enemies:[enemy(4,5)]},[
 action('hit',[4,5],'Selecione o Soldado em D5 e o inimigo em E5. Escolha '+(advance?'Atacar e ocupar a casa.':'Atacar e permanecer.'),{advance})
 ],advance?'O Soldado abateu o alvo e ocupou E5. A espada alcança uma casa em +, inclusive para trás; não ataca na diagonal.':'O Soldado abateu o alvo e permaneceu em D5. Atacar e avançar é uma escolha diferente, ensinada no próximo exercício.');
const evolution=type=>lesson(type+'-evolve',type,'Evolução: '+names[type]+' → '+(type==='soldier'?'Colosso':'Batedor'),{type,source:[0,1]},[
 action('move',[0,0],'Selecione o '+names[type]+' em A9 e entre no Campo de Cura azul ativo em A10.')
 ],'A evolução aconteceu de verdade na mesma casa. '+(type==='soldier'?'O Soldado agora é Colosso.':'O Arqueiro agora é Batedor.')+' O campo entrou em recarga por três rodadas completas.');
const rescued=(type,emergency=false)=>lesson(type+'-rescue'+(emergency?'-emergency':''),type,(emergency?'Resgate de emergência: ':'Resgate Real: ')+names[type],{type,source:[3,5],kingAt:type==='wolf'?[6,3]:[6,5],woundedKing:!emergency,emergency,enemies:emergency?[enemy(4,type==='wolf'?1:3,{type:'scout'})]:[]},[
 action('rescue',type==='wolf'?[6,3]:[6,5],'Selecione o '+names[type]+' em D5 e depois o Rei aliado em '+(type==='wolf'?'G7':'G5')+'. '+(emergency?'Ele está intacto, mas marcado e ameaçado pelo Batedor durante a Reação Real.':'O Rei tem uma vida. O resgate usa '+(type==='wolf'?'a distância do salto 3×2.':'três casas cardinais, com caminho livre.')))
 ],emergency?'Resgate de emergência realizado: as peças trocaram de casa e o Rei perdeu uma vida pela exceção da marcação. Recebeu a cópia da habilidade do aliado.':'As peças trocaram de casa sem ferir nem curar o Rei. Ele recebeu uma cópia da habilidade de quem o resgatou; armadilhas de chegada continuam valendo.');
const copyLesson=(id,title,tech,kind,target,enemies,extra={})=>lesson('copy-'+id,'king','Cópia Real: '+title,{type:'king',source:[3,5],copy:tech,enemies,...extra.scene},[
 action(kind,target,'O Rei em D5 já tem '+title+' copiado. Selecione-o e '+(kind==='copyMove'?'escolha um dos saltos verdes.':kind==='copyArea'?'toque em E5, marque mais um inimigo e confirme os dois alvos.':kind==='mark'||kind==='execute'?'escolha a orientação do V e toque no alvo em '+('ABCDEFGHIJ'[target[0]]+(10-target[1]))+'.':'toque na casa destacada para usar o ataque copiado.'),{anyTarget:kind==='copyMove'||kind==='copyArea',minTargets:kind==='copyArea'?2:undefined,...extra.step})
 ],'A técnica copiada foi usada uma vez e a cópia foi consumida. '+(tech==='colossus'?'A Investida do Rei não prepara Esmagamento.':tech==='scout'?'O Rei não ganha o segundo ataque do Batedor.':tech==='wolf'?'O Rei não recebe o repouso obrigatório do Lobo.':tech==='guardianArea'?'O limite continua em dois alvos a até duas casas, a partir do Rei.':tech==='guardianLine'?'A reta mantém cinco casas e para na primeira peça.':'O alcance e os bloqueios são os da técnica copiada.'));
const crystalScene={type:'scout',source:[8,1]};
const enterCrystal=action('move',[9,0],'Selecione o Batedor em I9 e entre no Cristal azul ativo em J10. Depois escolha o poder indicado.');
const lessons=[
 lesson('traps-place','basics','Prepare uma armadilha',{},[action('trap',[4,5],'Toque em E5 e depois em Confirmar armadilhas. Na partida, cada lado pode esconder até duas.')],'Armadilha confirmada. O adversário não vê onde você a colocou; ela imobiliza quem a aciona por um turno.'),
 lesson('traps-trigger','basics','Descubra uma armadilha',{type:'soldier',source:[3,5],traps:[{side:1,x:3,y:4}]},[action('move',[3,4],'Mova o Soldado de D5 para D6. Neste exercício há uma armadilha inimiga escondida na chegada.')],'A armadilha foi revelada só ao disparar, desapareceu e imobilizou o Soldado. A casa parecia livre antes da entrada.'),
 movement('soldier'),sword('soldier-hit-stay',false),sword('soldier-hit-advance',true),evolution('soldier'),
 movement('archer'),
 lesson('archer-hit-near','archer','Flecha: uma casa diagonal',{type:'archer',source:[3,5],enemies:[enemy(4,4)]},[action('hit',[4,4],'Selecione o Arqueiro em D5 e ataque E6. Escolha Atacar e permanecer.',{advance:false})],'A flecha acertou uma casa na diagonal. As quatro diagonais, inclusive para trás, são válidas.'),
 lesson('archer-hit-far','archer','Flecha: duas casas diagonais',{type:'archer',source:[2,7],enemies:[enemy(4,5)]},[action('hit',[4,5],'Selecione o Arqueiro em C3 e ataque o Soldado em E5, a duas casas na diagonal.')],'Alvo abatido. A flecha chegou a duas casas sem atravessar peças; o Arqueiro ficou na origem.'),
 evolution('archer'),movement('scout'),
 lesson('scout-mark','scout','Magia azul: marcar e paralisar',{type:'scout',source:[3,5],enemies:[enemy(5,3),enemy(1,7)]},[action('mark',[5,3],'Selecione o Batedor em D5. Experimente as quatro orientações do V; marque um inimigo destacado. A magia para na primeira peça e alcança até quatro casas diagonais.',{anyTarget:true})],'A marca azul dura dois turnos do alvo e a paralisia dura um. Nenhuma vida foi retirada; outro Batedor aliado pode executar essa marca.'),
 lesson('scout-execute','scout','Magia vermelha: executar a marca',{type:'scout',source:[3,5],enemies:[enemy(5,3,{marked:true})]},[action('execute',[5,3],'O inimigo em F7 já está marcado pelo seu time. Selecione o Batedor em D5 e execute a marca.')],'A magia vermelha abateu a peça marcada. Sem marca aliada ativa, o disparo apenas marcaria e paralisaria.'),
 lesson('scout-execute-king','scout','Execução contra um Rei',{type:'scout',source:[3,5],enemies:[enemy(5,3,{type:'king',marked:true})]},[action('execute',[5,3],'O Rei azul em F7 tem duas vidas e já está marcado. Execute a marca com o Batedor em D5.')],'A execução retirou somente uma vida do Rei. Ele sobreviveu, copiou a magia e recebeu a Reação Real.'),
 lesson('scout-double','scout','Dois ataques no mesmo turno',{type:'scout',source:[3,5],enemies:[enemy(5,3)]},[
 action('mark',[5,3],'Primeiro: selecione o Batedor em D5 e marque o Soldado em F7.'),action('execute',[5,3],'Segundo ataque liberado, sem passar a vez: selecione o mesmo Batedor em D5 e execute a marca em F7.')
 ],'O mesmo Batedor marcou e executou no mesmo turno. São no máximo duas magias; outra peça não poderia agir no meio da combinação.'),
 lesson('scout-end-combo','scout','Dispensar o segundo ataque',{type:'scout',source:[3,5],enemies:[enemy(5,3)]},[action('mark',[5,3],'Marque F7 com o Batedor em D5.'),action('pass',null,'Você poderia atacar outra vez. Toque em Encerrar combinação para abrir mão da segunda magia.')],'A combinação foi encerrada pelo motor. Você pode usar uma ou duas magias; a segunda é opcional.'),
 movement('wolf'),
 lesson('wolf-hit','wolf','Mordida no destino do salto',{type:'wolf',source:[3,5],enemies:[enemy(6,3),enemy(0,7)]},[action('wolfHit',[6,3],'Selecione o Lobo em D5 e ataque um inimigo destacado no destino de um salto 3×2. Pode escolher qualquer alvo vermelho.',{anyTarget:true})],'O Lobo atacou e ocupou a casa do alvo abatido. Agora precisa ficar parado no próximo turno próprio.'),
 lesson('wolf-rest','wolf','Repouso do Lobo após atacar',{type:'wolf',source:[3,5],rest:true},[action('pass',null,'O Lobo em D5 já atacou e está em repouso. Ele não pode agir agora. Toque em Aguardar repouso; o adversário também aguardará para continuar o treino.',{nextOwnTurn:true}),action('move',[6,3],'O repouso terminou. Selecione o Lobo e escolha qualquer salto verde.',{anyTarget:true})],'O repouso terminou após um turno próprio. Um salto para casa vazia não cria outro repouso.'),
 lesson('wolf-trap','wolf','Armadilha anula a mordida',{type:'wolf',source:[3,5],enemies:[enemy(6,3)],traps:[{side:1,x:6,y:3}]},[action('wolfHit',[6,3],'Ataque o Soldado em G7 com o Lobo em D5. Uma armadilha oculta protege a casa do alvo.')],'A armadilha anulou o ataque: o inimigo sobreviveu e o Lobo ficou imobilizado na origem. Saltar sobre casas intermediárias não dispara armadilhas.'),
 rescued('wolf'),rescued('wolf',true),movement('colossus'),
 lesson('colossus-charge','colossus','Investida de três casas',{type:'colossus',source:[3,5],enemies:[enemy(3,4),enemy(3,3)]},[action('charge',[3,2],'Selecione o Colosso em D5 e faça a Investida até D8. Ele percorre exatamente três casas cardinais e ataca no caminho.')],'Os inimigos do trajeto foram abatidos. A Investida completa preparou Esmagamento para a próxima ação desse Colosso.'),
 lesson('colossus-smash','colossus','Investida e Esmagamento',{type:'colossus',source:[3,5],enemies:[enemy(3,4),enemy(5,2),enemy(5,1),enemy(4,1)]},[
 action('charge',[3,2],'Prepare o Esmagamento: selecione o Colosso em D5 e use Investida até D8. O adversário aguardará para você continuar.',{nextOwnTurn:true}),
 action('smash',[4,2],'Esmagamento pronto: selecione o Colosso em D8 e escolha E8, uma casa vazia adjacente. Ele avança uma casa e atinge todos os inimigos ao redor da chegada.')
 ],'O Esmagamento acertou três inimigos adjacentes ao destino. O limite de dois alvos do Guardião não se aplica ao Colosso. Uma jogada comum ou passar perderia a preparação.'),
 lesson('colossus-king-block','colossus','Investida interrompida pelo Rei',{type:'colossus',source:[3,5],enemies:[enemy(3,4,{type:'king'}),enemy(3,3)]},[action('charge',[3,2],'Invista de D5 para D8. O Rei em D6 ainda tem duas vidas e protege o Soldado atrás dele.')],'O Rei perdeu uma vida, sobreviveu e interrompeu a Investida. O Colosso ficou antes dele, o Soldado não foi atingido e Esmagamento não foi preparado.'),
 lesson('colossus-trap','colossus','Investida interrompida por armadilha',{type:'colossus',source:[3,5],enemies:[enemy(3,3)],traps:[{side:1,x:3,y:4}]},[action('charge',[3,2],'Faça Investida de D5 para D8. Há uma armadilha escondida em D6, antes do inimigo.')],'A armadilha interrompeu a Investida em D6, imobilizou o Colosso e impediu o dano no inimigo atrás. Não houve preparação de Esmagamento.'),
 lesson('colossus-field-charge','colossus','Investida defensiva e Cura Real',{type:'colossus',source:[0,3],woundedKing:true},[action('fieldCharge',[0,0],'Seu Rei tem uma vida. Selecione o Colosso em A7 e faça Investida até a Cura azul em A10, mesmo sem inimigo no caminho.'),{kind:'field',choice:'healKing',instruction:'No campo, escolha Sacrificar para curar o Rei. O Colosso será removido.'}],'A Investida defensiva alcançou o campo e o sacrifício restaurou o Rei a duas vidas. Essa exceção exige Rei ferido e campo inimigo ativo.'),
 rescued('colossus'),rescued('colossus',true),movement('guardian'),
 lesson('guardian-area','guardian','Ataque ao redor: escolha dois alvos',{type:'guardian',source:[3,5],enemies:[enemy(4,5),enemy(5,5),enemy(3,3)]},[action('area',[4,5],'Selecione o Guardião em D5 e um inimigo vermelho. Marque mais um dos alvos ao redor e confirme. São até duas casas, incluindo diagonais, e no máximo dois inimigos.',{anyTarget:true,minTargets:2})],'Dois alvos foram abatidos; o terceiro permaneceu. O Guardião ficou na origem. Aliados no caminho podem proteger quem está atrás.'),
 lesson('guardian-line','guardian','Ataque em linha de cinco casas',{type:'guardian',source:[5,7],enemies:[enemy(5,2)]},[action('line',[5,2],'Selecione o Guardião em F3 e ataque F8, a cinco casas na mesma coluna.')],'O golpe acertou o primeiro inimigo e o Guardião ficou na origem. A reta alcança até cinco casas na horizontal ou vertical e não atravessa peças.'),
 lesson('king-lives','king','Duas vidas e recebimento da cópia',{type:'soldier',source:[3,5],enemies:[enemy(4,5,{type:'king'})]},[action('hit',[4,5],'Ataque o Rei azul em E5 com o Soldado em D5. Observe a vida e a habilidade que o Rei recebe.')],'O Rei azul passou de duas vidas para uma, ganhou a cópia da espada e uma Reação Real. Ele precisa sofrer outro ponto de dano para cair.'),
 movement('king'),
 lesson('king-hit','king','Explosão própria do Rei',{type:'king',source:[3,5],enemies:[enemy(5,3)]},[action('hit',[5,3],'Selecione o Rei em D5 e ataque F7, a duas casas na diagonal. Escolha Atacar e permanecer.',{advance:false})],'A explosão própria atingiu somente o alvo escolhido. Alcança uma ou duas casas nas oito direções, sem atravessar peças; não é um ataque em área.'),
 copyLesson('sword','Espada do Soldado','soldier','copyHit',[4,5],[enemy(4,5)],{step:{advance:false}}),
 copyLesson('arrow','Flecha do Arqueiro','archer','copyHit',[5,3],[enemy(5,3)],{step:{advance:false}}),
 copyLesson('mark','Marcação do Batedor','scout','mark',[5,3],[enemy(5,3)]),
 copyLesson('execute','Execução do Batedor','scout','execute',[5,3],[enemy(5,3,{marked:true})]),
 copyLesson('wolf-move','Salto do Lobo','wolf','copyMove',[6,3],[]),
 copyLesson('wolf-hit','Mordida do Lobo','wolf','copyWolfHit',[6,3],[enemy(6,3)]),
 copyLesson('charge','Investida do Colosso','colossus','copyCharge',[3,2],[enemy(3,4),enemy(3,3)]),
 copyLesson('area','Ataque ao redor do Guardião','guardianArea','copyArea',[4,5],[enemy(4,5),enemy(5,5),enemy(3,3)]),
 copyLesson('line','Ataque em linha do Guardião','guardianLine','copyLine',[3,0],[enemy(3,0)]),
 copyLesson('blast','Explosão de outro Rei','king','copyHit',[5,3],[enemy(5,3)],{step:{advance:false}}),
 lesson('king-reaction-move','king','Reação Real: escapar com o Rei',{type:'king',source:[4,5],woundedKing:true,copy:'guardianLine',reaction:true,enemies:[enemy(4,1,{type:'guardian'})]},[action('move',[3,5],'Seu Rei em E5 foi ferido e está em Reação Real. Selecione-o e escolha um destino verde para escapar.',{anyTarget:true})],'A defesa consumiu a ação de reação. Não é um turno extra: depois dela joga o adversário.'),
 lesson('king-reaction-copy','king','Reação Real: contra-atacar com cópia',{type:'king',source:[3,5],woundedKing:true,copy:'archer',reaction:true,enemies:[enemy(5,3,{type:'archer'})]},[action('copyHit',[5,3],'O Rei em D5 foi ferido pelo Arqueiro em F7. Na Reação Real, escolha Ataque copiado contra F7, em vez do ataque próprio.',{advance:false})],'O Rei contra-atacou com a flecha copiada e gastou sua reação. O ataque próprio não seria uma alternativa nessa situação.'),
 lesson('king-reaction-marked','king','Rei paralisado: usar a magia copiada',{type:'king',source:[3,5],copy:'scout',reaction:true,markedKing:true,enemies:[enemy(5,3,{type:'scout'})]},[action('mark',[5,3],'O Rei em D5 está marcado e paralisado: não pode mover nem usar explosão própria. Selecione-o e marque F7 com a magia copiada.')],'Mesmo paralisado pela marcação, o Rei pôde usar uma técnica copiada válida. A cópia foi consumida e a reação terminou.'),
 lesson('king-interpose','king','Reação Real: interpor um aliado',{type:'soldier',source:[3,4],kingAt:[4,5],woundedKing:true,reaction:true,enemies:[enemy(4,1,{type:'guardian'})]},[action('move',[4,4],'O Guardião azul em E9 ameaça seu Rei em E5. Mova o Soldado de D6 para uma casa verde entre os dois, bloqueando a linha.',{anyTarget:true})],'O Soldado foi interposto e passou a bloquear a linha de ataque. Proteger com um aliado também consome a Reação Real.'),
 lesson('heal-king','fields','Cura Real por sacrifício',{type:'scout',source:[0,1],woundedKing:true},[action('move',[0,0],'Entre na Cura azul em A10 com o Batedor em A9.'),{kind:'field',choice:'healKing',instruction:'Escolha Sacrificar para curar o Rei e observe o custo da peça e a vida recuperada.'}],'O Batedor foi sacrificado, o Rei vivo recuperou a segunda vida e o campo entrou em recarga. Cura não ressuscita um Rei eliminado.'),
 lesson('heal-original','fields','Cura sacrificando o Guardião original',{type:'guardian',source:[0,1],woundedKing:true},[action('move',[0,0],'Mova o Guardião original de A9 para a Cura inimiga em A10.'),{kind:'field',choice:'healKing',instruction:'Sacrifique o Guardião original para curar o Rei. Essa é a única modalidade de sacrifício permitida para ele.'}],'O Rei foi curado, mas você perdeu o Guardião original. Um Guardião criado depois por transformação não o substitui na condição de vitória.'),
 ...['soldier','archer'].map(type=>lesson('summon-'+type,'fields','Invocação: '+names[type],crystalScene,[enterCrystal,{kind:'field',choice:'summon',summonType:type,instruction:'Escolha Invocar Aprendiz, depois '+names[type]+' e uma casa vazia adjacente ao Cristal. Todas as casas verdes são opções.',target:[8,0],anyTarget:true}],'O Aprendiz foi criado na casa escolhida e a peça que ativou o Cristal permaneceu. Há duas opções de invocação e limite de vinte peças por time.')),
 lesson('transform','fields','Transformação: escolha qualquer unidade',crystalScene,[enterCrystal,{kind:'field',choice:'transform',instruction:'Escolha Transformar esta peça. Veja as seis opções disponíveis e escolha qualquer uma delas.'}],'O motor transformou a unidade na própria casa e reiniciou seus estados. Não é possível criar Rei; o Rei e o Guardião original não podem ser transformados.'),
 lesson('reunion','fields','Reunião: escolher aliado e destino',crystalScene,[enterCrystal,{kind:'field',choice:'reunion',instruction:'Escolha Reunião. Selecione qualquer aliado destacado, incluindo o Rei, e depois qualquer casa vazia. Se chegar a outro campo ativo, você também poderá experimentar seu poder. A peça no Cristal será sacrificada.',target:[2,6],anyTarget:true}],'O aliado escolhido foi teletransportado e o Batedor foi sacrificado. O Rei pode ser transportado; Rei e Guardião original não podem ser o sacrifício da Reunião.'),
 lesson('field-skip','fields','Recusar o poder do campo',crystalScene,[enterCrystal,{kind:'field',choice:'skip',instruction:'Veja os poderes oferecidos pelo Cristal e escolha Não utilizar o campo.'}],'O poder foi recusado sem sacrificar ou transformar a peça. Permanecer no campo não repete a ativação: é necessário entrar novamente.'),
 lesson('victory','victory','Complete a vitória',{type:'guardian',source:[5,7],victory:true},[action('line',[5,2],'O Rei azul já caiu. Restam três turnos próprios para eliminar o Guardião original. Ataque-o em F8 com seu Guardião em F3.')],'Vitória real: Rei e Guardião original azuis foram eliminados. Se o Guardião resistisse aos três turnos do atacante, o resultado seria empate.')
];
function create(Engine,index){
 const l=lessons[index];if(!l)throw Error('Exercício inexistente');const game=new Engine({mode:'local',difficulty:1});game.s.untimed=true;
 if(l.steps[0].kind==='trap')return game;
 const s=game.s,scene=l.scene,template=s.pieces[0];let id=1;
 const piece=(side,type,x,y,extra={})=>({...template,id:id++,side,type,x,y,hp:type==='king'?2:1,original:type==='guardian',mark:null,stun:null,freeze:null,rest:null,copy:null,charge:0,...extra});
 s.pieces=[piece(0,'king',4,9),piece(0,'guardian',5,9),piece(1,'king',4,0),piece(1,'guardian',5,0)];
 let actor;if(['king','guardian'].includes(scene.type)){actor=s.pieces.find(p=>p.side===0&&p.type===scene.type);[actor.x,actor.y]=scene.source;}else{actor=piece(0,scene.type,...scene.source);s.pieces.push(actor);}game.lessonActorId=actor.id;
 if(scene.kingAt)[game.king(0).x,game.king(0).y]=scene.kingAt;
 if(scene.woundedKing)game.king(0).hp=1;
 for(const e of scene.enemies||[]){let p;if(e.type==='king'){p=game.king(1);p.x=e.x;p.y=e.y;}else{p=piece(1,e.type,e.x,e.y,{original:false});s.pieces.push(p);}if(e.hp)p.hp=e.hp;if(e.marked)game.status(p,'mark',2,0);}
 if(scene.copy)game.giveCopy(actor,scene.copy);
 if(scene.rest)actor.rest={n:1,by:null,born:-1,own:false};
 if(scene.markedKing||scene.emergency){game.status(game.king(0),'mark',2,1);game.status(game.king(0),'stun',1);}
 if(scene.reaction||scene.emergency){const attacker=s.pieces.find(p=>p.side===1&&p.type!=='king'&&!p.original);s.reaction={side:0,attackerId:attacker.id,threatType:scene.emergency||scene.markedKing?'scout':attacker.type==='guardian'?'guardianLine':attacker.type};}
 if(scene.victory){s.pieces=s.pieces.filter(p=>!(p.side===1&&p.type==='king'));const guard=game.guardian(1);guard.x=5;guard.y=2;s.deadline={1:{attacker:0,left:3,createdOn:0}};}
 s.next=id;s.phase='play';s.side=0;s.traps=(scene.traps||[]).map(t=>({...t}));s.logs=[{msg:'Exercício: '+l.title}];
 const cells=s.pieces.map(p=>p.x+','+p.y);if(new Set(cells).size!==cells.length)throw Error('Peças sobrepostas no exercício '+l.id);
 return game;
}
function step(game,index,stage=0){const l=lessons[index],current=l.steps[stage];if(!current)return null;const actor=game.piece(game.lessonActorId);return {...current,source:actor?[actor.x,actor.y]:null};}
function options(game,index,stage=0,orientation=null){const current=step(game,index,stage);return current?.source?game.actionsFor(game.lessonActorId,orientation).filter(a=>a.kind===current.kind):[];}
function recommendedAction(game,index,stage=0,orientation=null){const current=step(game,index,stage),choices=options(game,index,stage,orientation);return choices.find(a=>current.target&&a.x===current.target[0]&&a.y===current.target[1])||choices[0]||null;}
// Dashed cells show the technique's reach; strong colors remain real legal actions.
function range(game,index,stage=0,orientation='up'){
 const current=step(game,index,stage),p=game.piece(game.lessonActorId);if(!p||!current||!['hit','copyHit','mark','execute','wolfHit','copyWolfHit','area','copyArea','line','copyLine','charge','copyCharge','fieldCharge'].includes(current.kind))return [];
 const cells=[],inside=(x,y)=>x>=0&&x<10&&y>=0&&y<10,add=(x,y)=>{if(inside(x,y)&&game.pieceAt(x,y)?.side!==p.side)cells.push([x,y]);};
 const d4=[[1,0],[-1,0],[0,1],[0,-1]],diagonals=[[1,1],[1,-1],[-1,1],[-1,-1]],d8=[...d4,...diagonals];
 let dirs=d8,reach=1;
 if(['area','copyArea'].includes(current.kind)){for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++){const q={x:p.x+dx,y:p.y+dy};if((dx||dy)&&!game.blockedByAllyArea(p,q))add(q.x,q.y);}return cells;}
 if(['wolfHit','copyWolfHit'].includes(current.kind)){for(const [dx,dy]of [[3,2],[3,-2],[-3,2],[-3,-2],[2,3],[2,-3],[-2,3],[-2,-3]])add(p.x+dx,p.y+dy);return cells;}
 const tech=current.kind==='copyHit'?p.copy?.type:p.type;
 if(['line','copyLine'].includes(current.kind)){dirs=d4;reach=5;}
 else if(['charge','copyCharge','fieldCharge'].includes(current.kind)){dirs=d4;reach=3;}
 else if(['mark','execute'].includes(current.kind)){dirs={up:[[-1,-1],[1,-1]],down:[[-1,1],[1,1]],left:[[-1,-1],[-1,1]],right:[[1,-1],[1,1]]}[orientation]||diagonals;reach=4;}
 else if(tech==='soldier'){dirs=d4;reach=1;}
 else if(tech==='archer'){dirs=diagonals;reach=2;}
 else if(tech==='king'){dirs=d8;reach=2;}
 for(const [dx,dy]of dirs)for(let n=1;n<=reach;n++){
  const x=p.x+dx*n,y=p.y+dy*n;if(!inside(x,y))break;const q=game.pieceAt(x,y);add(x,y);
  if(q&&(!['charge','copyCharge','fieldCharge'].includes(current.kind)||q.side===p.side||q.type==='king'&&q.hp>1))break;
 }
 return cells;
}
function objective(s){
 const names=['Rubros','Azuis'];
 if(s.phase==='over')return s.winner===-1?'Empate: '+s.endedReason:'Vitória dos '+names[s.winner]+': '+s.endedReason;
 const pursuit=Object.entries(s.deadline||{}).filter(([,d])=>d).map(([victim,d])=>`Rei dos ${names[+victim]} eliminado. Os ${names[d.attacker]} têm ${d.left} ${d.left===1?'turno próprio':'turnos próprios'} para eliminar o Guardião original, ou haverá empate.`);
 if(pursuit.length)return pursuit.join(' ');
 const fallen=[0,1].filter(side=>!s.pieces.some(p=>p.side===side&&p.type==='guardian'&&p.original)&&s.pieces.some(p=>p.side===side&&p.type==='king'));
 if(fallen.length)return fallen.map(side=>`Guardião original dos ${names[side]} eliminado. Para vencê-los, falta eliminar seu Rei.`).join(' ');
 return 'Para vencer: elimine o Rei adversário (2 vidas) e o Guardião original. Se o Rei cair primeiro, você terá 3 turnos próprios para eliminar o Guardião, ou haverá empate.';
}
const api={lessons,groups,create,step,options,action:recommendedAction,range,objective};if(typeof module==='object'&&module.exports)module.exports=api;else root.KharTallLearning=api;
})(typeof window==='undefined'?globalThis:window);
