/* Shared cosmetic catalog. Prices are integer BRL cents; no gameplay effects. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KharTallSkinCatalog=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
 const PRICE_CENTS=250;
 const families=[
  ['green','Verde',142,'#9ce6af','#246343'],['blue','Azul',211,'#9ed9ff','#244f8c'],
  ['red','Vermelho',3,'#ffa6a0','#8e282d'],['purple','Roxo',275,'#d8b0ff','#60318c'],
  ['pink','Rosa',326,'#ffb4dd','#933268'],['gold','Dourado',45,'#ffe7a0','#927024'],
  ['orange','Laranja',25,'#ffc18c','#9b4d24'],['cyan','Ciano',180,'#a0efed','#226967']
 ];
 const SKINS=Object.freeze(families.flatMap(([family,label,hue,light,dark],i)=>['light','dark'].map((tone,j)=>Object.freeze({
  id:'skin_'+family+'_'+tone,product_id:'8b80ca11-68a1-4dce-8e16-'+String(i*2+j+1).padStart(12,'0'),
  family,tone,hue,color:tone==='light'?light:dark,name:label+' '+(tone==='light'?'claro':'escuro'),price_cents:PRICE_CENTS,
  name_color:light,description:'Recolore as roupas das sete unidades, o nome do jogador e a identificação do seu time em '+label.toLowerCase()+' '+(tone==='light'?'claro':'escuro')+'. Compra única por R$ 2,50, vinculada à sua conta. Skin exclusivamente visual: não altera poderes, regras ou desempenho.'
 }))));
 const findSkin=id=>SKINS.find(s=>s.id===id)||null;
 const PAYMENT_NOTICE='Cada skin custa R$ 2,50 e é uma compra única para sua conta. As skins mudam as roupas das peças, o nome do jogador e a identificação do time, sem vantagens nas partidas. Pague por Pix ou cartão de crédito no ambiente seguro da InfinitePay. A skin é liberada na sua coleção após a confirmação do pagamento.';
 return {SKINS,PRICE_CENTS,findSkin,PAYMENT_NOTICE};
});
