/* Exercises use the same rules engine as real matches. No account or network. */
(function(root){'use strict';
const lessons=[
 {title:'Prepare uma armadilha',instruction:'Toque na casa E5 destacada e depois em Confirmar armadilhas. Em partidas completas, você pode colocar até duas.',target:[4,5],kind:'trap',success:'Armadilha confirmada. O adversário não vê onde você a colocou; ela paralisa quem a aciona por um turno.'},
 {title:'Mova uma peça',instruction:'Toque no Soldado rubro em C3. Depois toque na casa verde C4 para mover uma casa.',source:[2,7],target:[2,6],type:'soldier',kind:'move',success:'Você moveu o Soldado. Selecionar uma peça mostra as casas permitidas; mover consome sua ação do turno.'},
 {title:'Ataque na diagonal',instruction:'Selecione o Arqueiro rubro em C3 e ataque o Soldado azul em E5. A flecha alcança até duas casas na diagonal.',source:[2,7],target:[4,5],type:'archer',enemy:'soldier',kind:'hit',success:'Alvo eliminado. O Arqueiro ataca em diagonal, com caminho livre. Neste exercício ele permaneceu na posição.'},
 {title:'Use a linha do Guardião',instruction:'Selecione o Guardião rubro em F3 e ataque o Soldado azul em F8. São cinco casas em linha reta.',source:[5,7],target:[5,2],type:'guardian',enemy:'soldier',kind:'line',success:'O ataque em linha alcança até cinco casas na horizontal ou vertical e para na primeira peça. Ele não atravessa aliados nem inimigos.'},
 {title:'Entenda as duas vidas do Rei',instruction:'Selecione o Soldado rubro em D5 e ataque o Rei azul em E5. Observe o indicador de vidas.',source:[3,5],target:[4,5],type:'soldier',enemy:'king',kind:'hit',success:'O Rei passou de duas vidas para uma e continua no tabuleiro. Consulte Cópia Real e Reação Real no índice de ações especiais do tutorial.'},
 {title:'Complete a vitória',instruction:'O Rei azul já foi eliminado. Restam três turnos seus para derrotar o Guardião original. Selecione o Guardião rubro em F3 e ataque o Guardião azul em F8.',source:[5,7],target:[5,2],type:'guardian',enemy:'guardian',kind:'line',success:'Agora é vitória: Rei e Guardião original azuis foram eliminados. Se o Guardião resistisse aos três turnos do atacante, seria empate.'}
];
function create(Engine,index){
 const lesson=lessons[index];if(!lesson)throw Error('Exercício inexistente');
 const game=new Engine({mode:'local',difficulty:1});game.s.untimed=true;
 if(index===0)return game;
 const s=game.s,template=s.pieces[0];let id=1;
 const piece=(side,type,x,y)=>({...template,id:id++,side,type,x,y,hp:type==='king'?2:1,original:type==='guardian',mark:null,stun:null,freeze:null,rest:null,copy:null,charge:0});
 s.pieces=[piece(0,'king',4,9),piece(0,'guardian',5,9),piece(1,'king',4,0),piece(1,'guardian',5,0)];
 if(lesson.type==='guardian'){const actor=s.pieces.find(p=>p.side===0&&p.original);[actor.x,actor.y]=lesson.source;}
 else s.pieces.push(piece(0,lesson.type,...lesson.source));
 if(lesson.enemy==='king'){const king=s.pieces.find(p=>p.side===1&&p.type==='king');[king.x,king.y]=lesson.target;}
 else if(lesson.enemy==='guardian'){
  s.pieces=s.pieces.filter(p=>!(p.side===1&&p.type==='king'));
  const guardian=s.pieces.find(p=>p.side===1&&p.original);[guardian.x,guardian.y]=lesson.target;
  s.deadline={1:{attacker:0,left:3,createdOn:0}};
 }else if(lesson.enemy)s.pieces.push(piece(1,lesson.enemy,...lesson.target));
 s.next=id;s.phase='play';s.side=0;s.traps=[];s.logs=[{msg:'Exercício: '+lesson.title}];return game;
}
function action(game,index){const l=lessons[index];if(!l.source)return null;const actor=game.pieceAt(...l.source);return actor?game.actionsFor(actor.id).find(a=>a.kind===l.kind&&a.x===l.target[0]&&a.y===l.target[1]):null;}
function objective(s){
 const names=['Rubros','Azuis'];
 if(s.phase==='over')return s.winner===-1?'Empate: '+s.endedReason:'Vitória dos '+names[s.winner]+': '+s.endedReason;
 const pursuit=Object.entries(s.deadline||{}).filter(([,d])=>d).map(([victim,d])=>`Rei dos ${names[+victim]} eliminado. Os ${names[d.attacker]} têm ${d.left} ${d.left===1?'turno próprio':'turnos próprios'} para eliminar o Guardião original, ou haverá empate.`);
 if(pursuit.length)return pursuit.join(' ');
 const fallen=[0,1].filter(side=>!s.pieces.some(p=>p.side===side&&p.type==='guardian'&&p.original)&&s.pieces.some(p=>p.side===side&&p.type==='king'));
 if(fallen.length)return fallen.map(side=>`Guardião original dos ${names[side]} eliminado. Para vencê-los, falta eliminar seu Rei.`).join(' ');
 return 'Para vencer: elimine o Rei adversário (2 vidas) e o Guardião original. Se o Rei cair primeiro, você terá 3 turnos próprios para eliminar o Guardião, ou haverá empate.';
}
const api={lessons,create,action,objective};if(typeof module==='object'&&module.exports)module.exports=api;else root.KharTallLearning=api;
})(typeof window==='undefined'?globalThis:window);
