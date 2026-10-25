'use strict';
// One-time purchases only. No subscription, paid hosting or third-party SDK.
const crypto=require('node:crypto');
const {ShopStore}=require('./store-db.js');
const {clientIP}=require('./request-security.js');
const {createInfinitePay,handle:infiniteHandle,validWebhookToken}=require('./payments-infinitepay.js');
const {createShipping,packageInfo,NOTICE:SHIPPING_NOTICE}=require('./shipping.js');
const {createOrderNotifications}=require('./order-notifications.js');
const THEMES=['ember','frost','obsidian'];
const {SKINS,PRICE_CENTS,findSkin,PAYMENT_NOTICE}=require('./skin-catalog.js');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CONTACT_CHANNEL='Atendimento pelo site, na aba Atendimento';
const EMAIL_RE=/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
function publicPolicy(value){return String(value||'')
 .replace(/Para atendimento, cancelamento ou reembolso, escreva para\s+[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'Para atendimento, cancelamento ou reembolso, utilize a aba Atendimento da loja')
 .replace(EMAIL_RE,'a aba Atendimento da loja');}
function publicShop(info){return {seller_name:'Khar Tall · Victoryno',support_contact:CONTACT_CHANNEL,policy:publicPolicy(info.policy)};}
const fail=(status,message)=>{const e=new Error(message);e.status=status;throw e;};
function text(v,max,required=false){if(typeof v!=='string'||v.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v))fail(422,'Texto inválido.');v=v.trim();if(required&&!v)fail(422,'Preencha os campos obrigatórios.');return v;}
function money(v,max=100000000){if(!Number.isSafeInteger(v)||v<0||v>max)fail(422,'Preço inválido.');return v;}
function safeURL(v,local=false){if(!v)return '';if(local&&/^\/assets\/[A-Za-z0-9_.-]+$/.test(v))return v;let u;try{u=new URL(v);}catch{fail(422,'Use um endereço HTTPS completo.');}if(u.protocol!=='https:'||u.username||u.password||v.length>1000)fail(422,'Use um endereço HTTPS completo.');return u.href;}
function publicProduct(p){const {delivery_url,package_json,...rest}=p;return {...rest,package:JSON.parse(package_json||'{}'),shipping_mode:p.kind==='physical'?'calculated':'none',active:!!Number(rest.active)};}
function publicOrder(o){const {customer_json,shipping_json,delivery_url,merchant_id,live_mode,preference_id,provider_updated_ms,...rest}=o;return {...rest,quantity:Number(o.quantity),unit_cents:Number(o.unit_cents),shipping_cents:Number(o.shipping_cents),total_cents:Number(o.total_cents),created_ms:Number(o.created_ms),updated_ms:Number(o.updated_ms),customer:JSON.parse(customer_json),shipping:JSON.parse(shipping_json||'{}'),delivery_url:o.payment_status==='approved'?delivery_url:''};}
function secretKey(env){const k=env.STORE_SETTINGS_KEY;if(!k||!(/^[a-f0-9]{64}$/i.test(k)))fail(503,'A conexão segura de pagamentos ainda não foi preparada.');return Buffer.from(k,'hex');}
function encrypt(value,env){const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',secretKey(env),iv);return Buffer.concat([iv,Buffer.from(cipher.update(JSON.stringify(value),'utf8')),cipher.final(),cipher.getAuthTag()]).toString('base64');}
function decrypt(value,env){const b=Buffer.from(value,'base64');if(b.length<29)fail(503,'Conexão de pagamentos inválida.');const decipher=crypto.createDecipheriv('aes-256-gcm',secretKey(env),b.subarray(0,12));decipher.setAuthTag(b.subarray(-16));return JSON.parse(Buffer.concat([decipher.update(b.subarray(12,-16)),decipher.final()]).toString('utf8'));}
function validSignature(req,url,secret,now=Date.now()){
 const id=url.searchParams.get('data.id'),requestId=req.headers['x-request-id'],header=req.headers['x-signature'];if(!id||!/^\d{1,30}$/.test(id)||typeof requestId!=='string'||requestId.length>200||typeof header!=='string')return false;
 const parts=Object.fromEntries(header.split(',').map(p=>p.trim().split('='))),ts=parts.ts,v1=parts.v1;if(!/^\d{10,16}$/.test(ts||'')||!/^[a-f0-9]{64}$/i.test(v1||''))return false;
 const ms=Number(ts)>1e12?Number(ts):Number(ts)*1000;if(Math.abs(now-ms)>86400000)return false;
 const expected=crypto.createHmac('sha256',secret).update(`id:${id};request-id:${requestId};ts:${ts};`).digest();return crypto.timingSafeEqual(expected,Buffer.from(v1,'hex'));
}
function createCommerce({auth,store=new ShopStore(),fetcher=fetch,env=process.env}={}){
 const buckets=new Map();const base=env.PUBLIC_BASE_URL||'https://khar-tall-online.onrender.com';
 const infinitepay=createInfinitePay({fetcher,env,base});
 const shipping=createShipping({store,fetcher,env,decrypt,encrypt}),notifications=createOrderNotifications({store,fetcher,env,decrypt,encrypt,base});
 async function publicOrders(orders){const notices=await store.notices(orders.map(o=>o.id));return orders.map(o=>({...publicOrder(o),notices:notices.filter(n=>n.order_id===o.id).map(n=>({id:n.id,kind:n.kind,subject:n.subject,message:n.message,email_status:n.email_status,email_error:n.email_error,created_ms:Number(n.created_ms)}))}));}
 function rate(req,key,max=30,period=60000){const k=clientIP(req)+':'+key,now=Date.now(),a=(buckets.get(k)||[]).filter(t=>now-t<period);if(a.length>=max)fail(429,'Muitas tentativas. Aguarde antes de tentar novamente.');a.push(now);buckets.set(k,a);if(buckets.size>5000)for(const [id,v]of buckets)if(v.every(t=>now-t>3600000))buckets.delete(id);}
 function isAdmin(user){return !!user&&(env.STORE_ADMIN_USERNAMES||'').toLowerCase().split(',').map(s=>s.trim()).filter(Boolean).includes(user.username.toLowerCase());}
 function origin(req){let u;try{u=new URL(req.headers.origin);}catch{fail(403,'Origem obrigatória.');}const tls=!!req.socket.encrypted||(env.TRUST_PROXY==='true'&&req.headers['x-forwarded-proto']==='https');if(u.host!==req.headers.host||u.protocol!==(tls?'https:':'http:')||req.headers['sec-fetch-site']==='cross-site'||req.headers['x-kt-csrf']!=='1')fail(403,'Proteção de formulário inválida.');}
 async function body(req){if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))fail(415,'Envie JSON.');let n=0,parts=[];for await(const part of req){n+=part.length;if(n>16384)fail(413,'Dados muito extensos.');parts.push(part);}let b;try{b=JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{fail(400,'JSON inválido.');}if(!b||typeof b!=='object'||Array.isArray(b))fail(400,'Dados inválidos.');return b;}
 function out(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY'});res.end(JSON.stringify(data));return true;}
 async function settings(){
  if(env.STORE_PAYMENT_PROVIDER==='infinitepay'){
   const stored=await store.setting('payments_infinitepay');
   const h=stored?infiniteHandle(decrypt(stored,env).handle):env.INFINITEPAY_HANDLE?infiniteHandle(env.INFINITEPAY_HANDLE):null;
   return h?{provider:'infinitepay',handle:h,mode:'production',merchant_id:'infinitepay:'+h,merchant_name:'$'+h}:null;
  }
  const s=await store.setting('payments');return s?{...decrypt(s,env),provider:'mercadopago'}:null;
 }
 async function config(){const s=await settings(),info=await store.setting('shop')||{};return {s,info,enabled:!!s&&info.enabled===true&&!!info.seller_name&&!!info.support_contact&&store.persistent};}
 async function mp(route,s,method='GET',payload,idempotency){let r;try{r=await fetcher('https://api.mercadopago.com'+route,{method,headers:{Authorization:'Bearer '+s.token,...(payload?{'Content-Type':'application/json'}:{}),...(idempotency?{'X-Idempotency-Key':idempotency}:{})},body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(12000),redirect:'error'});}catch{fail(502,'O Mercado Pago não respondeu. Tente novamente em instantes.');}const data=await r.json().catch(()=>null);if(!r.ok||!data)fail(502,'Não foi possível confirmar a operação no Mercado Pago. Confira a conexão no painel.');return data;}
 async function reconcile(payment,s){
  if(!UUID.test(payment.external_reference||''))return false;const o=await store.order(payment.external_reference);if(!o)return false;
  const amount=Math.round(Number(payment.transaction_amount)*100),stamp=Date.parse(payment.date_last_updated||payment.date_created||'');
  const statuses=['approved','pending','in_process','authorized','rejected','cancelled','refunded','charged_back','in_mediation'];
  if(!/^\d{1,30}$/.test(String(payment.id))||payment.currency_id!=='BRL'||amount!==Number(o.total_cents)||String(payment.collector_id)!==o.merchant_id||!!payment.live_mode!==!!Number(o.live_mode)||!statuses.includes(payment.status)||!Number.isFinite(stamp))fail(409,'O pagamento não corresponde ao pedido.');
  if(payment.metadata?.kt_order_id&&payment.metadata.kt_order_id!==o.id)fail(409,'Referência de pagamento inválida.');
  await store.query(`UPDATE kt_store_orders SET payment_status=$1,payment_id=$2,provider_updated_ms=$3,updated_ms=$4 WHERE id=$5 AND provider_updated_ms<=$6 AND (payment_id IS NULL OR payment_id=$7 OR payment_status NOT IN ('approved','refunded','charged_back'))`,[payment.status,String(payment.id),stamp,Date.now(),o.id,stamp,String(payment.id)]);return true;
 }
 async function refreshOrder(order,s){if(order.payment_id){const p=await mp('/v1/payments/'+encodeURIComponent(order.payment_id),s);await reconcile(p,s);}if(!['approved','refunded','charged_back'].includes((await store.order(order.id)).payment_status)){const found=await mp('/v1/payments/search?sort=date_created&criteria=desc&external_reference='+encodeURIComponent(order.id),s);for(const p of (found.results||[]).slice(0,10))await reconcile(p,s);}return store.order(order.id);}
 async function refreshInfinite(order,input={}){
  if(['refunded','charged_back','cancelled'].includes(order.payment_status))return store.order(order.id);
  const result=await infinitepay.check(order,input);
  if(result.paid){
   try{await store.query("UPDATE kt_store_orders SET payment_status='approved',payment_id=$1,preference_id=$2,provider_updated_ms=$3,updated_ms=$4 WHERE id=$5 AND merchant_id=$6 AND payment_status NOT IN ('refunded','charged_back','cancelled') AND (payment_id IS NULL OR payment_id=$7)",['infinitepay:'+result.transaction,result.slug,Date.now(),Date.now(),order.id,order.merchant_id,'infinitepay:'+result.transaction]);}
   catch(e){if(e.code==='23505'||String(e.code).startsWith('SQLITE_CONSTRAINT'))fail(409,'Esta transação já está vinculada a outro pedido.');throw e;}
  }
  return store.order(order.id);
 }
 async function process(req,res,pathname){if(!pathname.startsWith('/api/store/'))return false;try{
  await store.init();const url=new URL(req.url,base),webhook=pathname==='/api/store/webhook';
  if(pathname==='/api/store/infinitepay/webhook'){
   try{
    if(req.method!=='POST')fail(405,'Método não permitido.');rate(req,'infinitepay-webhook',180);
    const b=await body(req);if(!UUID.test(b.order_nsu||''))fail(400,'Pedido inválido.');
    const order=await store.order(b.order_nsu);
    if(!order||!order.merchant_id.startsWith('infinitepay:')||!validWebhookToken(url.searchParams.get('token'),order,env))fail(401,'Notificação de pagamento inválida.');
    const updated=await refreshInfinite(order,b);
    if(updated.payment_status!=='approved'&&!['refunded','charged_back','cancelled'].includes(updated.payment_status))fail(400,'Pagamento ainda não confirmado.');
    return out(res,200,{success:true,message:null});
   }catch(e){return out(res,400,{success:false,message:e.status?e.message:'Não foi possível confirmar o pagamento.'});}
  }
  if(webhook){if(req.method!=='POST')fail(405,'Método não permitido.');rate(req,'webhook',180);let s=await settings();if(s?.provider==='infinitepay'){const old=await store.setting('payments');s=old?decrypt(old,env):null;}if(!s||!validSignature(req,url,s.webhook_secret))fail(401,'Notificação sem assinatura válida.');const b=await body(req),id=url.searchParams.get('data.id');if(b.type!=='payment')return out(res,200,{received:true});if(String(b.data?.id)!==id)fail(400,'Referência divergente.');await reconcile(await mp('/v1/payments/'+id,s),s);return out(res,200,{received:true});}
  const user=await auth.current(req),admin=isAdmin(user);
  if(req.method==='GET'&&pathname==='/api/store/catalog'){const c=await config(),checkoutEnabled=c.enabled&&(c.s?.mode==='production'||admin),freight=await shipping.status(),notices=await notifications.status();return out(res,200,{products:(await store.products()).map(publicProduct),skins:SKINS,skin_checkout_enabled:checkoutEnabled,skin_payment_notice:PAYMENT_NOTICE,checkout_enabled:checkoutEnabled,physical_checkout_enabled:checkoutEnabled&&freight.configured,shipping:{provider:'melhorenvio',configured:freight.configured,notice:SHIPPING_NOTICE,email_enabled:notices.email_enabled},test_mode:!!admin&&c.s?.mode==='test',payment_provider:c.s?.provider||env.STORE_PAYMENT_PROVIDER||'mercadopago',shop:publicShop(c.info),payment_methods:['Pix','Cartão de crédito'],monthly_fee:0});}
  if(req.method==='GET'&&pathname==='/api/store/me'){if(!user)return out(res,200,{authenticated:false,admin:false,orders:[],owned:[],theme:'classic',skin:'classic'});const owned=await store.owned(user.id),selected=await store.theme(user.id),skin=await store.skin(user.id);return out(res,200,{authenticated:true,admin,user:{id:user.id,username:user.username},orders:await publicOrders(await store.orders(user.id)),owned,theme:THEMES.includes(selected)&&owned.includes(selected)?selected:'classic',skin:findSkin(skin)&&owned.includes(skin)?skin:'classic'});}
  if(req.method==='POST'&&pathname==='/api/store/shipping/quotes'){origin(req);rate(req,'shipping-quotes',15);const b=await body(req);if(!UUID.test(b.product_id||''))fail(422,'Produto inválido.');const p=await store.product(b.product_id);if(!p)fail(404,'Produto indisponível.');return out(res,200,await shipping.quote(p,b.quantity,b.postal_code,user?.id||'',admin));}
  if(!user)fail(401,'Entre na sua conta para continuar.');
  if(pathname.startsWith('/api/store/admin/')&&!admin)fail(403,'Painel exclusivo da administração da loja.');
  // Atendimento sem cobrança adicional, ligado à conta do jogador.
  if(req.method==='GET'&&pathname==='/api/store/support')return out(res,200,{tickets:await store.supportThreads(user.id)});
  if(req.method==='GET'&&pathname==='/api/store/admin/support')return out(res,200,{tickets:await store.supportThreads()});
  if(req.method==='POST'&&pathname==='/api/store/support'){
   origin(req);rate(req,'support-new',5,3600000);const b=await body(req);
   const subject=text(b.subject,120,true),content=text(b.message,2000,true);
   if(subject.length<4||content.length<10)fail(422,'Escreva o assunto e uma mensagem com pelo menos 10 caracteres.');
   const current=await store.supportThreads(user.id);
   if(current.filter(t=>t.status==='open').length>=5)fail(429,'Você já possui cinco atendimentos abertos. Responda em uma conversa existente.');
   const id=crypto.randomUUID();
   await store.openSupportTicket({id,user_id:user.id,username:user.username,subject,message:content,auto_message:'Recebemos sua mensagem! Ela foi registrada no atendimento do Khar Tall. Nossa equipe responderá nesta conversa. Volte à aba Atendimento para consultar a resposta.'});
   return out(res,201,{ok:true,ticket_id:id});
  }
  const supportReply=pathname.match(new RegExp('^/api/store/support/([a-f0-9-]{36})/reply$'));
  const adminSupportStatus=pathname.match(new RegExp('^/api/store/admin/support/([a-f0-9-]{36})/status$'));
  if(req.method==='POST'&&supportReply){
   origin(req);rate(req,'support-reply',15,60000);
   const b=await body(req),ticket=await store.supportTicket(supportReply[1]);
   if(!ticket||(!admin&&ticket.user_id!==user.id))fail(404,'Atendimento não encontrado.');
   if(ticket.status!=='open')fail(409,'Este atendimento está encerrado.');
   const content=text(b.message,2000,true);if(content.length<2)fail(422,'Escreva uma resposta.');
   await store.replySupportTicket(ticket.id,admin?'admin':'customer',content);
   return out(res,200,{ok:true});
  }
  if(req.method==='POST'&&adminSupportStatus){
   origin(req);if(!admin)fail(403,'Acesso reservado ao administrador.');rate(req,'support-status',20,60000);
   const b=await body(req),ticket=await store.supportTicket(adminSupportStatus[1]);
   if(!ticket)fail(404,'Atendimento não encontrado.');
   if(!['open','closed'].includes(b.status))fail(422,'Situação inválida.');
   await store.setSupportStatus(ticket.id,b.status);return out(res,200,{ok:true});
  }

  if(req.method==='POST'){origin(req);rate(req,'store-write');}
  if(req.method==='GET'&&pathname==='/api/store/admin/status'){const c=await config();return out(res,200,{connected:!!c.s,provider:c.s?.provider||env.STORE_PAYMENT_PROVIDER||'mercadopago',handle:c.s?.handle||'',mode:c.s?.mode||'production',merchant:c.s?.merchant_name||'',encryption_ready:!!env.STORE_SETTINGS_KEY,persistent:store.persistent,enabled:c.enabled,shop:publicShop(c.info),shipping:await shipping.status(),notifications:await notifications.status(),webhook_url:c.s?.provider==='infinitepay'?'':base+'/api/store/webhook',products:(await store.products(true)).map(p=>({...publicProduct(p),delivery_url:p.delivery_url})),orders:await publicOrders(await store.orders())});}
  if(req.method==='POST'&&['/api/store/admin/shipping','/api/store/admin/notifications'].includes(pathname)){const b=await body(req);if(!await auth.reauthenticate(req,b.password))fail(401,'Confirme sua senha de jogador.');return out(res,200,{ok:true,...(pathname.endsWith('/shipping')?{shipping:await shipping.save(b)}:{notifications:await notifications.save(b)})});}
  if(req.method==='POST'&&pathname==='/api/store/admin/connect'){
   const b=await body(req);if(!await auth.reauthenticate(req,b.password))fail(401,'Confirme sua senha de jogador.');
   if(env.STORE_PAYMENT_PROVIDER==='infinitepay'){
    const h=infiniteHandle(b.handle);await store.setSetting('payments_infinitepay',encrypt({handle:h},env));
    return out(res,200,{ok:true,provider:'infinitepay',merchant:'$'+h});
   }
   const token=text(b.access_token,500,true),webhook_secret=text(b.webhook_secret,500,true);if(!['test','production'].includes(b.mode)||/\s/.test(token))fail(422,'Credenciais inválidas.');secretKey(env);const account=await mp('/users/me',{token});if(!account.id||account.site_id!=='MLB')fail(422,'Conecte uma conta Mercado Pago do Brasil.');await store.setSetting('payments',encrypt({token,webhook_secret,mode:b.mode,merchant_id:String(account.id),merchant_name:account.nickname||String(account.id)},env));return out(res,200,{ok:true,merchant:account.nickname||'Conta conectada'});
  }
  if(req.method==='POST'&&pathname==='/api/store/admin/settings'){const b=await body(req),c=await config();const info={seller_name:text(b.seller_name,100,true),support_contact:CONTACT_CHANNEL,policy:publicPolicy(text(b.policy,4000,true)),enabled:b.enabled===true};if(info.enabled&&(!c.s||!store.persistent))fail(422,'Conecte o recebimento e o banco persistente antes de abrir as vendas.');await store.setSetting('shop',info);return out(res,200,{ok:true});}
  if(req.method==='POST'&&pathname==='/api/store/admin/products'){const b=await body(req);if(b.id&&!UUID.test(b.id))fail(422,'Produto inválido.');const previous=b.id?await store.product(b.id):null;if(b.id&&!previous)fail(404,'Produto não encontrado.');if(!['physical','digital'].includes(b.kind))fail(422,'Escolha produto físico ou digital.');const reward=text(b.reward||'',30),delivery=safeURL(text(b.delivery_url||'',1000));if(b.kind==='digital'&&!THEMES.includes(reward)&&!findSkin(reward)&&!delivery)fail(422,'Escolha um visual ou um arquivo digital para entrega.');const reservedSkin=SKINS.find(s=>s.product_id===b.id),skin=findSkin(reward);if(reservedSkin&&reward!==reservedSkin.id)fail(422,'Preserve a skin deste produto.');if(skin&&(b.kind!=='digital'||b.price_cents!==PRICE_CENTS||Number(b.shipping_cents||0)!==0||delivery))fail(422,'Cada skin tem preço fixo de R$ 2,50, sem frete ou arquivo adicional.');const price=money(b.price_cents);if(price<1)fail(422,'Informe um preço maior que zero.');const pack=b.kind==='physical'?packageInfo(b.package??JSON.parse(previous?.package_json||'{}'),b.active===true):{};const p={id:previous?.id||crypto.randomUUID(),title:text(b.title,120,true),description:text(b.description,3000,true),kind:b.kind,price_cents:price,shipping_cents:0,package_json:JSON.stringify(pack),image:safeURL(text(b.image||'/assets/tutorial_focus.webp',1000),true),reward:b.kind==='digital'&&(THEMES.includes(reward)||findSkin(reward))?reward:'',delivery_url:b.kind==='digital'?delivery:'',active:b.active===true?1:0,created_ms:previous?Number(previous.created_ms):Date.now(),updated_ms:Date.now()};await store.saveProduct(p);return out(res,previous?200:201,{product:publicProduct(p)});}
  const fulfillment=pathname.match(/^\/api\/store\/admin\/orders\/([a-f0-9-]{36})\/shipping$/);
  if(req.method==='POST'&&fulfillment){
   const b=await body(req),o=await store.order(fulfillment[1]);if(!o||o.kind!=='physical'||o.payment_status!=='approved')fail(409,'O pedido físico precisa ter pagamento aprovado.');
   const transitions={pending:['pending','preparing'],preparing:['preparing','shipped'],shipped:['shipped','delivered'],delivered:['delivered']};if(!transitions[o.fulfillment]?.includes(b.fulfillment))fail(409,'Aceite o pedido antes de enviá-lo. A entrega só pode ser registrada após o envio.');
   const tracking=text(b.tracking||'',100),shipment=JSON.parse(o.shipping_json||'{}');if(['shipped','delivered'].includes(b.fulfillment)&&tracking.length<4)fail(422,'Informe o código de rastreamento para avisar o envio.');
   if(b.tracking_url!==undefined)shipment.tracking_url=safeURL(text(b.tracking_url||'',1000));
   if(['shipped','delivered'].includes(b.fulfillment)&&!shipment.tracking_url)shipment.tracking_url=(shipment.carrier||'').toLowerCase().includes('correios')?'https://rastreamento.correios.com.br/app/index.php':'https://melhorrastreio.com.br/';
   const next={...o,fulfillment:b.fulfillment,tracking,shipping_json:JSON.stringify(shipment)},kind={preparing:'accepted',shipped:'shipped',delivered:'delivered'}[b.fulfillment],notices=kind?[await notifications.make(next,kind)]:[];
   await store.fulfillOrder(o,next,notices);try{await notifications.sendOrder(o.id);}catch{console.error('Order email: unavailable');}return out(res,200,{ok:true,order:(await publicOrders([await store.order(o.id)]))[0]});
  }
  const resend=pathname.match(/^\/api\/store\/admin\/orders\/([a-f0-9-]{36})\/notifications\/retry$/);
  if(req.method==='POST'&&resend){await body(req);const o=await store.order(resend[1]);if(!o||o.kind!=='physical')fail(404,'Pedido não encontrado.');rate(req,'email-retry',5);await notifications.sendOrder(o.id);return out(res,200,{ok:true,order:(await publicOrders([await store.order(o.id)]))[0]});}
  if(req.method==='POST'&&pathname==='/api/store/theme'){const b=await body(req);if(b.theme!=='classic'&&!(await store.owned(user.id)).includes(b.theme))fail(403,'Este visual ainda não pertence à sua conta.');if(!['classic',...THEMES].includes(b.theme))fail(422,'Visual inválido.');await store.setTheme(user.id,b.theme);return out(res,200,{ok:true,theme:b.theme});}
  if(req.method==='POST'&&pathname==='/api/store/skin'){const b=await body(req);if(b.skin!=='classic'&&!findSkin(b.skin))fail(422,'Skin inválida.');if(b.skin!=='classic'&&!(await store.owned(user.id)).includes(b.skin))fail(403,'Esta skin ainda não pertence à sua conta.');await store.setSkin(user.id,b.skin);return out(res,200,{ok:true,skin:b.skin});}
  const refresh=pathname.match(/^\/api\/store\/orders\/([a-f0-9-]{36})\/refresh$/);
  const cancel=pathname.match(/^\/api\/store\/admin\/orders\/([a-f0-9-]{36})\/cancel$/);
  if(req.method==='POST'&&cancel){const b=await body(req),o=await store.order(cancel[1]);if(!o||!o.merchant_id.startsWith('infinitepay:'))fail(404,'Pedido não encontrado.');if(!await auth.reauthenticate(req,b.password))fail(401,'Confirme sua senha de jogador.');if(b.confirm!==true||!['refunded','charged_back','cancelled'].includes(b.status))fail(422,'Confirme o cancelamento já realizado na InfinitePay.');await store.query('UPDATE kt_store_orders SET payment_status=$1,provider_updated_ms=$2,updated_ms=$3 WHERE id=$4',[b.status,Date.now(),Date.now(),o.id]);return out(res,200,{ok:true});}
  if(req.method==='POST'&&refresh){const b=await body(req);rate(req,'refresh',10,60000);const o=await store.order(refresh[1]);if(!o||(!admin&&o.user_id!==user.id))fail(404,'Pedido não encontrado.');if(o.merchant_id.startsWith('infinitepay:'))return out(res,200,{order:(await publicOrders([await refreshInfinite(o,b)]))[0]});const legacy=await store.setting('payments'),s=legacy?decrypt(legacy,env):null;if(!s)fail(503,'A conexão de pagamentos está temporariamente indisponível.');return out(res,200,{order:(await publicOrders([await refreshOrder(o,s)]))[0]});}
  if(req.method==='POST'&&pathname==='/api/store/checkout'){
   rate(req,'checkout',12,3600000);const b=await body(req),c=await config();if(!c.enabled||(c.s.mode==='test'&&!admin))fail(503,'As vendas ainda não foram abertas.');if(!UUID.test(b.product_id||'')||b.accepted!==true)fail(422,'Confira o produto e aceite as condições da compra.');const p=await store.product(b.product_id);if(!p||!Number(p.active))fail(404,'Produto indisponível.');const quantity=b.quantity;if(!Number.isInteger(quantity)||quantity<1||quantity>(p.kind==='digital'?1:10))fail(422,'Quantidade inválida.');if(findSkin(p.reward)&&(p.kind!=='digital'||Number(p.price_cents)!==PRICE_CENTS||Number(p.shipping_cents)!==0||p.delivery_url))fail(409,'Esta skin está temporariamente indisponível.');if(p.reward&&(await store.owned(user.id)).includes(p.reward))fail(409,'Esse visual já pertence à sua conta.');let customer={};
   if(p.kind==='physical'){const bC=b.customer||{};customer={name:text(bC.name,120,true),email:text(bC.email,150,true),postal_code:text(bC.postal_code,9,true).replace(/\D/g,''),address:text(bC.address,200,true),number:text(bC.number,20,true),complement:text(bC.complement||'',150),district:text(bC.district,100,true),city:text(bC.city,100,true),state:text(bC.state,2,true).toUpperCase()};if(!/^\d{8}$/.test(customer.postal_code)||!/^[A-Z]{2}$/.test(customer.state)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email))fail(422,'Confira o CEP, o estado e o e-mail de entrega.');}
   const shipment=p.kind==='physical'?await shipping.verify(b.shipping_token,p,quantity,customer.postal_code,user.id):{},shippingCents=p.kind==='physical'?shipment.price_cents:0;
   const id=crypto.randomUUID(),now=Date.now(),total=Number(p.price_cents)*quantity+shippingCents;money(total);
   const order={id,user_id:user.id,product_id:p.id,title:p.title,kind:p.kind,reward:p.reward,delivery_url:p.delivery_url,quantity,unit_cents:Number(p.price_cents),shipping_cents:shippingCents,shipping_json:JSON.stringify(shipment),total_cents:total,customer_json:JSON.stringify(customer),merchant_id:c.s.merchant_id,live_mode:c.s.mode==='production'?1:0,created_ms:now,updated_ms:now};await store.addOrder(order);
   if(c.s.provider==='infinitepay'){
    const target=await infinitepay.createLink(order);await store.query('UPDATE kt_store_orders SET checkout_url=$1,payment_status=$2 WHERE id=$3',[target,'pending',id]);
    return out(res,201,{order_id:id,checkout_url:target});
   }
   const preference={items:[{id:p.id,title:p.title,quantity,unit_price:Number(p.price_cents)/100,currency_id:'BRL'}],external_reference:id,metadata:{kt_order_id:id},back_urls:{success:base+'/loja?pedido='+id,pending:base+'/loja?pedido='+id,failure:base+'/loja?pedido='+id},notification_url:base+'/api/store/webhook',auto_return:'approved',statement_descriptor:'KHAR TALL',payment_methods:{excluded_payment_types:[{id:'ticket'},{id:'atm'}]}};
   if(customer.email)preference.payer={email:customer.email,name:customer.name};if(p.kind==='physical')preference.shipments={cost:shippingCents/100,mode:'not_specified'};
   const result=await mp('/checkout/preferences',c.s,'POST',preference,id);const target=c.s.mode==='test'?result.sandbox_init_point:result.init_point;let u;try{u=new URL(target);}catch{fail(502,'O checkout não foi disponibilizado.');}if(u.protocol!=='https:'||!/(^|\.)mercadopago\.com(?:\.br)?$/.test(u.hostname))fail(502,'Endereço de pagamento inválido.');if(!result.id)fail(502,'Preferência de pagamento inválida.');await store.query('UPDATE kt_store_orders SET preference_id=$1,checkout_url=$2,payment_status=$3 WHERE id=$4',[String(result.id),u.href,'pending',id]);return out(res,201,{order_id:id,checkout_url:u.href});
  }
  fail(404,'Operação da loja não encontrada.');
 }catch(e){if(!e.status)console.error('Loja:',e.code||e.name);return out(res,e.status||503,{error:e.status?e.message:'Loja temporariamente indisponível. O jogo continua disponível.'});}}
 return {process,store,isAdmin,reconcile,config,close:()=>store.close()};
}
module.exports={createCommerce,validSignature,encrypt,decrypt,publicProduct,THEMES};

