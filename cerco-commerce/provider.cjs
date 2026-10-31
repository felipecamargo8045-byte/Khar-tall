'use strict';
const crypto=require('node:crypto');
const fail=(message,status=502)=>Object.assign(new Error(message),{status});
const validRef=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,160}$/.test(v);
function makeProvider({handle,secret,base,game,fetcher=fetch}){
 if(!/^[a-z0-9][a-z0-9._-]{0,99}$/.test(handle||''))throw Error('Configure a InfiniteTag do Cerco.');
 const token=id=>crypto.createHmac('sha256',secret).update('cerco:'+id).digest('hex');
 async function call(route,data){
  let response;try{response=await fetcher('https://api.checkout.infinitepay.io/'+route,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(data),redirect:'error',signal:AbortSignal.timeout(15000)})}catch{throw fail('O pagamento não respondeu. Tente novamente em instantes.')}
  const result=await response.json().catch(()=>null);
  if(!response.ok||!result||result.success===false)throw fail(response.status===403?'Habilite o Checkout Integrado na conta InfinitePay da loja.':'A InfinitePay não conseguiu concluir a operação. Tente novamente.');
  return result;
 }
 return {
  token,
  async create(order){
   const data=await call('links',{handle,order_nsu:order.id,
    items:[{quantity:1,price:order.amount,description:'Cerco dos Reis · Skin '+order.name}],
    redirect_url:game+'/?cerco_order='+order.id+'#shop',
    webhook:{url:base+'/webhook/infinitepay?order='+order.id+'&token='+token(order.id),events:['paid','refunded','canceled']}});
   let url;try{url=new URL(data.url)}catch{throw fail('Checkout indisponível.')}
   if(url.protocol!=='https:'||!['checkout.infinitepay.io','checkout.infinitepay.com.br'].includes(url.hostname)||url.username||url.password||url.port)throw fail('Endereço de pagamento inválido.');
   return url.href;
  },
  async verify(order,input){
   const transaction=input.transaction_nsu||order.transaction_nsu,slug=input.slug||input.invoice_slug||order.slug;
   if(!validRef(transaction)||!validRef(slug))return {paid:false,awaiting:true};
   if(input.order_nsu&&input.order_nsu!==order.id)throw fail('O pagamento não corresponde ao pedido.',409);
   if((order.transaction_nsu&&order.transaction_nsu!==transaction)||(order.slug&&order.slug!==slug))throw fail('Referência de pagamento diferente do pedido.',409);
   const data=await call('payment_check',{handle,order_nsu:order.id,transaction_nsu:transaction,slug});
   if(data.paid!==true)return {paid:false,transaction,slug};
   if(data.success!==true||data.amount!==Number(order.amount)||!Number.isSafeInteger(data.paid_amount)||data.paid_amount<data.amount||!['pix','credit_card'].includes(data.capture_method))throw fail('Valor ou pagamento não corresponde ao pedido.',409);
   for(const [key,value] of Object.entries({handle,order_nsu:order.id,transaction_nsu:transaction,slug}))if(data[key]!==undefined&&data[key]!==value)throw fail('Pagamento de outro pedido.',409);
   return {paid:true,transaction,slug,method:data.capture_method};
  }
 };
}
module.exports={makeProvider,validRef};
