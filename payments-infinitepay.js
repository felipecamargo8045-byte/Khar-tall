'use strict';
// Official Checkout API: https://www.infinitepay.io/checkout-documentacao
// The provider's notification and browser redirect are hints, never payment proof.
const crypto=require('node:crypto');
const fail=(status,message)=>{const e=new Error(message);e.status=status;throw e;};
const REF=/^[A-Za-z0-9_-]{1,160}$/;
const HOSTS=new Set(['checkout.infinitepay.io','checkout.infinitepay.com.br']);
function handle(value){
 if(typeof value!=='string')fail(422,'Informe sua InfiniteTag.');
 const h=value.trim().replace(/^\$/,'').toLowerCase();
 if(!/^[a-z0-9][a-z0-9._-]{0,99}$/.test(h))fail(422,'Confira a InfiniteTag, sem espaços ou endereço de site.');
 return h;
}
function checkoutURL(value){
 let u;try{u=new URL(value);}catch{fail(502,'O endereço de pagamento da InfinitePay não foi disponibilizado.');}
 if(u.protocol!=='https:'||u.username||u.password||u.port||!HOSTS.has(u.hostname)||u.href.length>2000)fail(502,'Endereço de pagamento da InfinitePay inválido.');
 return u.href;
}
function webhookToken(order,env){
 if(!/^[a-f0-9]{64}$/i.test(env.STORE_SETTINGS_KEY||''))fail(503,'A conexão segura de pagamentos ainda não foi preparada.');
 return crypto.createHmac('sha256',Buffer.from(env.STORE_SETTINGS_KEY,'hex')).update('infinitepay:'+order.id+':'+order.merchant_id).digest('hex');
}
function validWebhookToken(value,order,env){
 return typeof value==='string'&&/^[a-f0-9]{64}$/.test(value)&&crypto.timingSafeEqual(Buffer.from(value,'hex'),Buffer.from(webhookToken(order,env),'hex'));
}
function createInfinitePay({fetcher=fetch,env=process.env,base}={}){
 function providerError(status,code){
  let reason='api_rejected',message='A InfinitePay não conseguiu gerar o checkout. Tente novamente ou contate o atendimento da loja.';
  if(status===401||status===403){reason='integration_disabled';message='O Checkout Integrado não está autorizado na InfinitePay. A loja precisa habilitá-lo nas configurações da conta.';}
  else if(status===400||status===422){reason='invalid_checkout';message='A InfinitePay recusou os dados do pagamento. O administrador deve conferir a configuração do checkout.';}
  else if(status===429){reason='rate_limited';message='A InfinitePay está limitando novas tentativas. Tente novamente mais tarde.';}
  else if(status>=500){reason='provider_unavailable';message='A InfinitePay está temporariamente indisponível. Tente novamente mais tarde.';}
  const e=new Error(message);e.status=502;e.providerStatus=status||0;e.providerReason=reason;
  if(typeof code==='string'&&/^[A-Za-z0-9_-]{1,50}$/.test(code))e.providerCode=code;
  throw e;
 }
 async function request(route,payload){
  const apiKey=typeof env.INFINITEPAY_API_KEY==='string'?env.INFINITEPAY_API_KEY.trim():'';
  if(apiKey&&!/^inchk_[A-Za-z0-9_-]{6,}$/.test(apiKey))fail(503,'A chave de integração da InfinitePay foi configurada incorretamente.');
  const headers={'Content-Type':'application/json',Accept:'application/json',...(apiKey?{'X-Api-Key':apiKey}:{})};
  let r;
  try{r=await fetcher('https://api.checkout.infinitepay.io/'+route,{method:'POST',headers,body:JSON.stringify(payload),signal:AbortSignal.timeout(12000),redirect:'error'});}
  catch{providerError(0);}
  const data=await r.json().catch(()=>null);
  if(!r.ok||!data||typeof data!=='object'||Array.isArray(data)||data.success===false)providerError(Number(r.status)||0,data?.code||data?.error_code);
  return data;
 }
 async function createLink(order){
  const customer=JSON.parse(order.customer_json),items=[{quantity:order.quantity,price:order.unit_cents,description:order.title}];
  if(order.shipping_cents)items.push({quantity:1,price:order.shipping_cents,description:'Entrega'});
  const payload={handle:handle(order.merchant_id.slice(12)),order_nsu:order.id,items,redirect_url:base+'/loja?pedido='+order.id};
  // Em modo básico (sem API Key), enviar somente campos do checkout simples.
  // O webhook moderno e opções avançadas só são enviados com a chave habilitada pelo vendedor.
  if(env.INFINITEPAY_API_KEY?.trim()){
   payload.options={single_payment:true,payment_methods_enabled:['pix','credit_card']};
   payload.webhook={url:base+'/api/store/infinitepay/webhook?token='+webhookToken(order,env),events:['paid']};
  }
  if(customer.email)payload.customer={name:customer.name,email:customer.email};
  if(customer.postal_code)payload.address={cep:customer.postal_code,street:customer.address,number:customer.number,neighborhood:customer.district,complement:customer.complement};
  return checkoutURL((await request('links',payload)).url);
 }
 async function check(order,input={}){
  const transaction=input.transaction_nsu||order.payment_id?.replace(/^infinitepay:/,''),slug=input.slug||input.invoice_slug||order.preference_id;
  if(!transaction&&!slug)return {paid:false,awaiting_notification:true};
  if(typeof transaction!=='string'||!REF.test(transaction)||typeof slug!=='string'||!REF.test(slug))fail(422,'Referência de pagamento inválida.');
  if(input.order_nsu!==undefined&&input.order_nsu!==order.id)fail(409,'O pagamento não corresponde ao pedido.');
  if((order.payment_id&&order.payment_id!=='infinitepay:'+transaction)||(order.preference_id&&order.preference_id!==slug))fail(409,'Este pedido já possui outra referência de pagamento.');
  const payload={handle:handle(order.merchant_id.slice(12)),order_nsu:order.id,transaction_nsu:transaction,slug};
  const data=await request('payment_check',payload);
  if(data.success!==true||typeof data.paid!=='boolean')fail(502,'A InfinitePay não confirmou a situação do pagamento.');
  if(!data.paid)return {paid:false};
  if(!Number.isSafeInteger(data.amount)||data.amount!==Number(order.total_cents)||!Number.isSafeInteger(data.paid_amount)||data.paid_amount<data.amount||!['pix','credit_card'].includes(data.capture_method)||!Number.isInteger(data.installments)||data.installments<1||data.installments>12||(data.capture_method==='pix'&&data.installments!==1))fail(409,'O valor ou a forma de pagamento não corresponde ao pedido.');
  for(const [key,value]of Object.entries(payload))if(data[key]!==undefined&&data[key]!==value)fail(409,'A referência de pagamento não corresponde ao pedido.');
  return {paid:true,transaction,slug};
 }
 return {createLink,check};
}
module.exports={createInfinitePay,handle,checkoutURL,webhookToken,validWebhookToken};
