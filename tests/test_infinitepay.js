'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),http=require('node:http'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {ShopStore}=require('../store-db.js'),{createCommerce}=require('../store-server.js');
const {checkoutURL,handle}=require('../payments-infinitepay.js');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'kt-infinitepay-')),file=path.join(temp,'store.sqlite3');
const env={STORE_PAYMENT_PROVIDER:'infinitepay',INFINITEPAY_HANDLE:'merchant_fixture',STORE_ADMIN_USERNAMES:'owner',STORE_SETTINGS_KEY:crypto.randomBytes(32).toString('hex')};
const users=Object.fromEntries(['owner','buyer','other'].map(username=>[username,{id:crypto.randomUUID(),username}]));
const auth={current:async req=>users[req.headers['x-test-user']]||null,reauthenticate:async(req,password)=>req.headers['x-test-user']==='owner'&&password==='local-test-password'};
let shippingTokens={};
const links=[],checks=[],verified=new Map();let badURL=false,unavailable=false;
const key=p=>[p.handle,p.order_nsu,p.transaction_nsu,p.slug].join('|');
const provider=async(url,options)=>{if(url==='https://melhorenvio.com.br/api/v2/me/shipment/calculate')return {ok:true,json:async()=>[{id:1,name:'PAC',company:{name:'Correios'},custom_price:'4.50',custom_delivery_time:5}]};
 assert.equal(options.method,'POST');assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,undefined);
 const p=JSON.parse(options.body);
 if(url==='https://api.checkout.infinitepay.io/links'){
  links.push(p);return {ok:true,json:async()=>({url:badURL?'https://checkout.infinitepay.io.attacker.invalid/pay':'https://checkout.infinitepay.io/'+p.handle+'/invoice-'+p.order_nsu})};
 }
 assert.equal(url,'https://api.checkout.infinitepay.io/payment_check');checks.push(p);
 if(unavailable)throw Error('Simulated outage');
 return {ok:true,json:async()=>verified.get(key(p))||{success:true,paid:false}};
};
let shop=new ShopStore({pool:null,file});shop.persistent=true;let commerce=createCommerce({auth,store:shop,fetcher:provider,env});
const server=http.createServer((req,res)=>commerce.process(req,res,new URL(req.url,'http://test').pathname));let base;
async function api(route,method='GET',data,user='owner',extra={}){
 const r=await fetch(base+'/api/store/'+route,{method,headers:{...(user?{'X-Test-User':user}:{}),...(data?{'Content-Type':'application/json',Origin:base,'X-Kt-Csrf':'1'}:{}),...extra},body:data?JSON.stringify(route==='checkout'&&data.customer?{...data,shipping_token:shippingTokens[data.quantity]}:data):undefined});return {status:r.status,data:await r.json()};
}
const references=o=>({order_nsu:o.id,invoice_slug:'invoice-'+o.id,transaction_nsu:crypto.randomUUID()});
function proof(o,refs,change={}){const p={handle:o.merchant_id.slice(12),order_nsu:o.id,transaction_nsu:refs.transaction_nsu,slug:refs.invoice_slug};verified.set(key(p),{success:true,paid:true,amount:Number(o.total_cents),paid_amount:Number(o.total_cents),capture_method:'pix',installments:1,...change});return p;}
async function notify(o,refs,token){const link=links.find(l=>l.order_nsu===o.id),u=new URL(link.webhook_url);return api('infinitepay/webhook?token='+(token===undefined?u.searchParams.get('token'):token),'POST',{...refs,paid:true,amount:1},null);}
(async()=>{try{
 assert.equal(handle('$Merchant_Fixture'),'merchant_fixture');for(const bad of ['https://attacker.invalid','with spaces','<script>'])assert.throws(()=>handle(bad));
 for(const bad of ['http://checkout.infinitepay.io/x','https://checkout.infinitepay.io.attacker.invalid/x','https://user:pass@checkout.infinitepay.io/x','https://checkout.infinitepay.io:8443/x'])assert.throws(()=>checkoutURL(bad));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;
 let r=await api('catalog','GET',null,null);assert.equal(r.data.payment_provider,'infinitepay');assert.equal(r.data.monthly_fee,0);assert.equal(r.data.checkout_enabled,false);
 assert.equal((await api('admin/status','GET',null,null)).status,401);assert.equal((await api('admin/status','GET',null,'buyer')).status,403);
 const status=(await api('admin/status')).data;assert.equal(status.merchant,'$merchant_fixture');assert.equal(status.webhook_url,'');assert.equal(checks.length,0);assert.equal(links.length,0);
 assert.equal((await api('admin/connect','POST',{handle:'merchant_fixture',password:'wrong'})).status,401);
 assert.equal((await api('admin/connect','POST',{handle:'http://bad.invalid',password:'local-test-password'})).status,422);
 assert.equal((await api('admin/settings','POST',{seller_name:'Fixture store',support_contact:'store@example.invalid',policy:'Fixture delivery and refund terms',enabled:true})).status,200);
 const template={title:'Fixture item',description:'One-time purchase',kind:'physical',price_cents:1599,shipping_cents:450,image:'/assets/tutorial_focus.webp',active:true,package:{weight_g:300,width_cm:16,height_cm:4,length_cm:20,preparation_days:2}};
 const physical=(await api('admin/products','POST',template)).data.product;
 const digital=(await api('admin/products','POST',{...template,title:'Fixture cosmetic',kind:'digital',price_cents:500,reward:'ember',delivery_url:'https://example.invalid/private-file'})).data.product;
 assert.ok(!JSON.stringify((await api('catalog','GET',null,null)).data).includes('private-file'));
 await shop.setSetting('shipping',require('../store-server.js').encrypt({enabled:true,token:'shipping-fixture-token-only',origin_postal_code:'13400000',contact_email:'store@example.invalid',services:'1,2',revision:'fixture'},env));
 const customer={name:'Buyer fixture',email:'buyer@example.invalid',postal_code:'12345-678',address:'Fixture street',number:'1',district:'Fixture',city:'Fixture city',state:'SP',complement:''};
 for(const quantity of [1,2]){const quote=await api('shipping/quotes','POST',{product_id:physical.id,quantity,postal_code:'12345678'},'buyer');assert.equal(quote.status,200);shippingTokens[quantity]=quote.data.options[0].token;}
 assert.equal((await api('checkout','POST',{product_id:physical.id,quantity:2,accepted:true,customer},null)).status,401);
 assert.equal((await api('checkout','POST',{product_id:physical.id,quantity:2,accepted:true,customer},'buyer',{Origin:'https://attacker.invalid'})).status,403);
 r=await api('checkout','POST',{product_id:physical.id,quantity:2,accepted:true,customer,total_cents:1,handle:'attacker'},'buyer');assert.equal(r.status,201);const order=await shop.order(r.data.order_id),refs=references(order),sent=links[0];
 assert.equal(Number(order.total_cents),3648);assert.equal(sent.handle,'merchant_fixture');assert.deepEqual(sent.items,[{quantity:2,price:1599,description:'Fixture item'},{quantity:1,price:450,description:'Entrega'}]);assert.equal(sent.address.cep,'12345678');assert.equal(sent.customer.email,customer.email);assert.equal(sent.order_nsu,order.id);
 assert.equal((await notify(order,refs,'0'.repeat(64))).status,400);assert.equal(checks.length,0,'Forged webhook never queries provider');
 assert.equal((await notify(order,refs)).status,400);assert.equal((await shop.order(order.id)).payment_status,'pending','Browser/webhook paid=true never grants access');
 for(const change of [{amount:1},{amount:'3648'},{paid_amount:1},{capture_method:'cash'},{installments:2},{order_nsu:crypto.randomUUID()},{handle:'attacker'}]){proof(order,refs,change);assert.equal((await notify(order,refs)).status,400);assert.equal((await shop.order(order.id)).payment_status,'pending');}
 proof(order,refs);unavailable=true;assert.equal((await notify(order,refs)).status,400);assert.equal((await shop.order(order.id)).payment_status,'pending');unavailable=false;
 assert.equal((await api('orders/'+order.id+'/refresh','POST',refs,'other')).status,404);
 assert.equal((await api('orders/'+order.id+'/refresh','POST',{...refs,order_nsu:crypto.randomUUID()},'buyer')).status,409);
 proof(order,refs,{capture_method:'credit_card',installments:3,paid_amount:3800});
 const duplicated=await Promise.all([notify(order,refs),notify(order,refs)]);assert.ok(duplicated.every(r=>r.status===200));assert.equal((await shop.order(order.id)).payment_status,'approved');
 assert.equal((await api('me','GET',null,'other')).data.orders.length,0);
 const created=await api('checkout','POST',{product_id:digital.id,quantity:1,accepted:true},'buyer');const d=await shop.order(created.data.order_id),dr=references(d);
 assert.equal((await api('me','GET',null,'buyer')).data.orders.find(o=>o.id===d.id).delivery_url,'');
 proof(d,dr);r=await api('orders/'+d.id+'/refresh','POST',{order_nsu:d.id,slug:dr.invoice_slug,transaction_nsu:dr.transaction_nsu},'buyer');assert.equal(r.status,200);assert.equal(r.data.order.payment_status,'approved');
 r=await api('me','GET',null,'buyer');assert.deepEqual(r.data.owned,['ember']);assert.equal(r.data.orders.find(o=>o.id===d.id).delivery_url,'https://example.invalid/private-file');
 assert.equal((await api('theme','POST',{theme:'ember'},'buyer')).status,200);
 assert.equal((await api('admin/connect','POST',{handle:'$second_fixture',password:'local-test-password'})).status,200);assert.ok(!JSON.stringify(await shop.setting('payments_infinitepay')).includes('second_fixture'),'Updated setting encrypted');
 await api('orders/'+d.id+'/refresh','POST',{},'buyer');assert.equal(checks.at(-1).handle,'merchant_fixture','Old orders retain original receiving account');
 const a=await api('checkout','POST',{product_id:physical.id,quantity:1,accepted:true,customer},'buyer'),aOrder=await shop.order(a.data.order_id),aRefs={...references(aOrder),transaction_nsu:refs.transaction_nsu};assert.equal(links.at(-1).handle,'second_fixture');proof(aOrder,aRefs);
 assert.equal((await notify(aOrder,aRefs)).status,400,'One payment cannot settle two orders');assert.equal((await shop.order(aOrder.id)).payment_status,'pending');
 const cancel='admin/orders/'+d.id+'/cancel';assert.equal((await api(cancel,'POST',{status:'refunded',confirm:true,password:'local-test-password'},'buyer')).status,403);assert.equal((await api(cancel,'POST',{status:'refunded',confirm:true,password:'wrong'})).status,401);assert.equal((await api(cancel,'POST',{status:'refunded',confirm:true,password:'local-test-password'})).status,200);
 assert.equal((await notify(d,dr)).status,200);assert.equal((await shop.order(d.id)).payment_status,'refunded','Delayed notification cannot restore refunded access');
 r=await api('me','GET',null,'buyer');assert.deepEqual(r.data.owned,[]);assert.equal(r.data.theme,'classic');assert.equal(r.data.orders.find(o=>o.id===d.id).delivery_url,'');
 badURL=true;r=await api('checkout','POST',{product_id:physical.id,quantity:1,accepted:true,customer},'buyer');assert.equal(r.status,502);badURL=false;
 shop.close();shop=new ShopStore({pool:null,file});shop.persistent=true;commerce=createCommerce({auth,store:shop,fetcher:provider,env});assert.equal((await api('admin/status')).data.handle,'second_fixture');assert.equal((await shop.order(order.id)).payment_status,'approved');assert.equal((await shop.order(d.id)).payment_status,'refunded');
 console.log('InfinitePay OK: server-side prices/account, shipping, HMAC notifications, independent API approval, forged/underpaid/replayed payments, concurrent duplicates, private delivery, account changes, refund revocation, restart and allowed checkout origins. No real API or payment.');
 }finally{await new Promise(resolve=>server.close(resolve));shop.close();fs.rmSync(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
