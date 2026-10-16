/* Shared cosmetic catalog. Prices are integer BRL cents; no gameplay effects. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KharTallSkinCatalog=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
 const PRICE_CENTS=250;
 const families=[
  ['green','Verde',142,'#9ce6af','#246343'],['blue','Azul',211,'#9ed9ff','#244f8c'],
  ['red','Vermelho',3,'#ffa6a0','#8e282d'],['purple','Roxo',275,'#d8b0ff','#60318c'],
  ['pink','Rosa',326,'#ffb4dd','#933268'],['gold','Dourado',45,'#ffe7a0','#927024'],
  ['orange','Laranja',25,'#ffc18c','#9b4d24'],['cyan','Ciano',180,'#a0efed','#226967']
 ];
 // Keep the original team red/blue free. Paid variants have their own hue and
 // cloth brightness, while stable IDs preserve existing purchases and outfits.
 const variants={
  skin_red_light:{name:'Vermelho coral claro',hue:14,color:'#ff977f',name_color:'#ffbaab',cloth_lightness:[.9,.14],cloth_saturation:.72},
  skin_red_dark:{name:'Vermelho vinho escuro',hue:330,color:'#681834',name_color:'#f1a9c7',cloth_lightness:[.62,.015],cloth_saturation:.72},
  skin_blue_light:{name:'Azul-gelo claro',hue:193,color:'#b7e8f0',name_color:'#c9f4ff',cloth_lightness:[.95,.22],cloth_saturation:.6},
  skin_blue_dark:{name:'Azul-noite escuro',hue:243,color:'#25215c',name_color:'#bdb4ff',cloth_lightness:[.55,.075],cloth_saturation:.62}
 };
 const LEGACY_NAMES=Object.freeze({skin_red_light:'Vermelho claro',skin_red_dark:'Vermelho escuro',skin_blue_light:'Azul claro',skin_blue_dark:'Azul escuro'});
 const SKINS=Object.freeze(families.flatMap(([family,label,hue,light,dark],i)=>['light','dark'].map((tone,j)=>{
  const id='skin_'+family+'_'+tone,variant=variants[id]||{},name=variant.name||label+' '+(tone==='light'?'claro':'escuro');
  return Object.freeze({
   id,product_id:'8b80ca11-68a1-4dce-8e16-'+String(i*2+j+1).padStart(12,'0'),
   family,tone,hue,color:tone==='light'?light:dark,name,price_cents:PRICE_CENTS,name_color:light,...variant,
   description:'Recolore as roupas das sete unidades, o nome do jogador e a identificação do seu time em '+name.toLowerCase()+'. Compra única por R$ 2,50, vinculada à sua conta. Skin exclusivamente visual: não altera poderes, regras ou desempenho.'
  });
 })));
 const findSkin=id=>SKINS.find(s=>s.id===id)||null;
 const PAYMENT_NOTICE='Cada skin custa R$ 2,50 e é uma compra única para sua conta. As skins mudam as roupas das peças, o nome do jogador e a identificação do time, sem vantagens nas partidas. Pague por Pix ou cartão de crédito no ambiente seguro da InfinitePay. A skin é liberada na sua coleção após a confirmação do pagamento.';
 return {SKINS,PRICE_CENTS,findSkin,PAYMENT_NOTICE,LEGACY_NAMES};
});
