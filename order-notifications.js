'use strict';
// In-account notices are always available. Brevo is optional; no SMS/WhatsApp credits.
// https://developers.brevo.com/reference/send-transac-email
const crypto=require('node:crypto');
const {email}=require('./shipping.js');
const DAILY_LIMIT=250;
const fail=(status,message)=>{const e=Error(message);e.status=status;throw e;};
function createOrderNotifications({store,fetcher=fetch,env=process.env,decrypt,encrypt,base,now=Date.now}={}){
 async function configuration(){const value=await store.setting('order_email');return value?decrypt(value,env):{enabled:false};}
 function ready(c){return c.enabled===true&&c.free_plan_confirmed===true&&!!c.api_key&&email(c.sender_email);}
 async function status(){const c=await configuration();return {in_account:true,email_enabled:ready(c),key_saved:!!c.api_key,sender_email:c.sender_email||'',sender_name:c.sender_name||'Khar Tall',free_plan_confirmed:c.free_plan_confirmed===true,daily_limit:DAILY_LIMIT};}
 async function save(input){
  const previous=await configuration(),sender_email=String(input.sender_email||'').trim(),sender_name=String(input.sender_name||'Khar Tall').trim(),api_key=input.api_key?String(input.api_key).trim():previous.api_key||'';
  if(sender_name.length>100||/[\r\n]/.test(sender_name))fail(422,'Confira o nome do remetente.');
  if(api_key&&!/^[A-Za-z0-9._~-]{20,6000}$/.test(api_key))fail(422,'Confira a chave de API da Brevo.');
  if(input.enabled===true&&(!email(sender_email)||!api_key||input.free_plan_confirmed!==true))fail(422,'Informe um remetente verificado, conecte a chave e confirme o plano gratuito antes de ativar o e-mail.');
  await store.setSetting('order_email',encrypt({enabled:input.enabled===true,api_key,sender_email,sender_name:sender_name||'Khar Tall',free_plan_confirmed:input.free_plan_confirmed===true},env));return status();
 }
 async function make(order,kind){
  const shipment=JSON.parse(order.shipping_json||'{}'),c=await configuration();let subject,message,version='';
  if(kind==='accepted'){subject='Pedido aceito';message='Seu pedido '+order.id+' foi aceito pela loja e está em preparação. Prazo de preparação: '+(shipment.preparation_days??'conforme informado na compra')+(Number.isInteger(shipment.preparation_days)?' dia(s) útil(eis).':'.')+' Você receberá outro aviso quando ele for enviado.';}
  else if(kind==='shipped'){subject='Pedido enviado';message='Seu pedido '+order.id+' foi enviado'+(shipment.carrier?' por '+shipment.carrier+' · '+shipment.service_name:'')+'. Código de rastreamento: '+order.tracking+'.'+(shipment.tracking_url?' Acompanhe em '+shipment.tracking_url:'');version=order.tracking+'|'+(shipment.tracking_url||'');}
  else if(kind==='delivered'){subject='Entrega registrada';message='A loja registrou a entrega do pedido '+order.id+'. Se houver alguma divergência, entre em contato pelo atendimento da loja.';}
  else fail(422,'Aviso de pedido inválido.');
  const stamp=now();return {id:crypto.createHash('sha256').update(order.id+':'+kind+':'+version).digest('hex'),order_id:order.id,kind,subject,message,email_status:ready(c)?'pending':'not_configured',created_ms:stamp,updated_ms:stamp};
 }
 async function send(id){
  const c=await configuration();if(!ready(c))return {status:'not_configured'};
  const notice=await store.one('SELECT * FROM kt_store_notices WHERE id=$1',[id]);if(!notice)fail(404,'Aviso não encontrado.');
  const order=await store.order(notice.order_id),customer=JSON.parse(order.customer_json||'{}');if(order.kind!=='physical'||order.payment_status!=='approved'||!email(customer.email))return {status:'not_sent'};
  // A database claim prevents simultaneous admin clicks from sending the same event twice.
  const claimed=await store.one("UPDATE kt_store_notices SET email_status='sending',email_attempts=email_attempts+1,updated_ms=$1 WHERE id=$2 AND (email_status IN ('pending','failed','not_configured') OR (email_status='sending' AND updated_ms<$3)) RETURNING id",[now(),id,now()-180000]);
  if(!claimed)return {status:notice.email_status};
  const day=new Date(now()).toISOString().slice(0,10),quota=await store.one('INSERT INTO kt_store_email_days(day,sends) VALUES($1,1) ON CONFLICT(day) DO UPDATE SET sends=kt_store_email_days.sends+1 WHERE kt_store_email_days.sends<$2 RETURNING sends',[day,DAILY_LIMIT]);
  if(!quota){await store.query("UPDATE kt_store_notices SET email_status='failed',email_error='Limite diário local atingido. O aviso permanece em Meus pedidos.',updated_ms=$1 WHERE id=$2",[now(),id]);return {status:'failed'};}
  try{
   const r=await fetcher('https://api.brevo.com/v3/smtp/email',{method:'POST',headers:{'api-key':c.api_key,Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({sender:{name:c.sender_name,email:c.sender_email},to:[{email:customer.email,name:customer.name}],subject:'Khar Tall · '+notice.subject,textContent:'Olá, '+customer.name+'.\n\n'+notice.message+'\n\nProduto: '+order.title+'\nAcompanhe em '+base+'/loja#orders\n\nEsta é uma mensagem sobre sua compra.',headers:{IdempotencyKey:notice.id}}),signal:AbortSignal.timeout(10000),redirect:'error'});
   const data=await r.json().catch(()=>null);if(!r.ok||typeof data?.messageId!=='string')throw Error('provider');
   await store.query("UPDATE kt_store_notices SET email_status='sent',email_error='',provider_id=$1,updated_ms=$2 WHERE id=$3",[data.messageId.slice(0,300),now(),id]);return {status:'sent'};
  }catch{
   // Payment and fulfilment remain valid if the mail provider rejects or times out.
   await store.query("UPDATE kt_store_notices SET email_status='failed',email_error='O envio por e-mail não foi confirmado. Confira o remetente e a cota na Brevo; o aviso já está em Meus pedidos.',updated_ms=$1 WHERE id=$2",[now(),id]);return {status:'failed'};
  }
 }
 async function sendOrder(orderId){const notices=await store.notices([orderId]);for(const n of notices)if(n.email_status!=='sent')await send(n.id);}
 return {status,save,make,sendOrder};
}
module.exports={createOrderNotifications,DAILY_LIMIT};
