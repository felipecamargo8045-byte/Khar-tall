'use strict';
const catalog=Object.freeze([
 ['skin_green_light','Verde Claro','#9ce6af'],['skin_blue_light','Azul Claro','#9ed9ff'],
 ['skin_red_light','Vermelho Claro','#ffa6a0'],['skin_purple_light','Roxo Claro','#d8b0ff'],
 ['skin_pink_light','Rosa Claro','#ffb4dd'],['skin_gold_light','Dourado Claro','#ffe7a0'],
 ['skin_orange_light','Laranja Claro','#ffc18c'],['skin_cyan_light','Ciano Claro','#a0efed']
].map(([id,name,color])=>Object.freeze({id,name,color,kind:'skin',priceCents:250,game:'cerco-dos-reis'})).concat([
 Object.freeze({id:'card_liliti',name:'Liliti',kind:'card',characterId:'liliti',rarity:'Suprema',priceCents:1000,game:'cerco-dos-reis'})
]));
module.exports={catalog,find:id=>catalog.find(p=>p.id===id)};
