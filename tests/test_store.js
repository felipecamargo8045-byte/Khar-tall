'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),http=require('node:http'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {ShopStore}=require('../store-db.js');const {createCommerce,validSignature,encrypt,decrypt}=require('../store-server.js');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'kt-store-')),file=path.join(temp,'shop.sqlite3');
const env={STORE_ADMIN_USERNAMES:'owner',STORE_SETTINGS_KEY:crypto.randomBytes(32).toString('hex')};
const users={owner:{id:crypto.randomUUID(),username:'owner'},buyer:{id:crypto.randomUUID(),username:'buyer'},other:{id:crypto.randomUUID(),username:'other'}};
const auth={current:async r=>users[r.headers['x-test-user']]||null,reauthenticate:async(r,p)=>r.headers['x-test-user']==='owner'&&p==='local-test-password'};
let payments=new Map(),preferences=[],nextPreference=0;
const fakeMP=async(url,options)=>{assert.ok(url.startsWith('https://api.mercadopago.com/'));assert.equal(options.redirect,'error');assert.ok(options.headers.Authorization.startsWith('Bearer '));const p=new URL(url);let data;
 if(p.pathname==='/users/me')data={id:123,site_id:'MLB',nickname:'Test merchant'};
 else if(p.pathname==='/checkout/preferences'){const body=JSON.parse(options.body);preferences.push(body);assert.equal(options.headers['X-Idempotency-Key'],body.external_reference);data={id:'pref-'+(++nextPreference),init_point:'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id='+nextPreference,sandbox_init_point:'https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id='+nextPreference};}
 else if(p.pathname==='/v1/payments/search')data={results:[...payments.values()].filter(x=>x.external_reference===p.searchParams.get('external_reference'))};
 else data=payments.get(p.pathname.split('/').at(-1));
 return {ok:!!data,json:async()=>data};};
let shop=new ShopStore({pool:null,file});shop.persistent=true;let commerce=createCommerce({auth,store:shop,fetcher:fakeMP,env});
const server=http.createServer((req,res)=>commerce.process(req,res,new URL(req.url,'http://test').pathname));let origin;
async function api(route,method='GET',data,user='owner',extra={}){const r=await fetch(origin+'/api/store/'+route,{method,headers:{...(user?{'X-Test-User':user}:{}),...(data?{'Content-Type':'application/json','Origin':origin,'X-Kt-Csrf':'1'}:{}),...extra},body:data?JSON.stringify(data):undefined});return {status:r.status,data:await r.json()};}
function payment(id,order,amount,status='approved',updated=Date.now()){return {id,external_reference:order,transaction_amount:amount,currency_id:'BRL',collector_id:123,live_mode:true,status,date_last_updated:new Date(updated).toISOString(),metadata:{kt_order_id:order}};}
async function notify(id,extra={}){const ts=String(Math.floor(Date.now()/1000)),requestId='signed-request',signature=crypto.createHmac('sha256','webhook-fixture').update(`id:${id};request-id:${requestId};ts:${ts};`).digest('hex');return api('webhook?data.id='+id,'POST',{type:'payment',data:{id}},null,{'x-signature':'ts='+ts+',v1='+signature,'x-request-id':requestId,...extra});}
(async()=>{try{
 const sealed=encrypt({token:'fixture-only'},env);assert.ok(!sealed.includes('fixture-only'));assert.deepEqual(decrypt(sealed,env),{token:'fixture-only'});assert.throws(()=>decrypt(sealed.slice(0,-8)+'AAAAAAAA',env));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;
 let r=await api('catalog','GET',null,null);assert.equal(r.status,200);assert.equal(r.data.checkout_enabled,false);
 assert.equal((await api('admin/status','GET',null,'buyer')).status,403);assert.equal((await api('admin/status','GET',null,null)).status,401);
 const credentials={password:'local-test-password',access_token:'fixture-only',webhook_secret:'webhook-fixture',mode:'production'};
 assert.equal((await api('admin/connect','POST',{...credentials,password:'bad'})).status,401);
 assert.equal((await api('admin/connect','POST',credentials)).status,200);assert.ok(!JSON.stringify(await api('admin/status')).includes('fixture-only'));
 assert.equal((await api('admin/settings','POST',{seller_name:'Test store',support_contact:'store@example.invalid',policy:'Test delivery terms',enabled:true})).status,200);
 const product={title:'Physical fixture',description:'Original complete game stays free.',kind:'physical',price_cents:1599,shipping_cents:450,image:'/assets/tutorial_focus.webp',active:true};
 r=await api('admin/products','POST',product);assert.equal(r.status,201);const physical=r.data.product;
 assert.equal((await api('admin/products','POST',{...product,price_cents:-1})).status,422);
 assert.equal((await api('admin/products','POST',product,'buyer')).status,403);
 const digital=(await api('admin/products','POST',{...product,title:'Cosmetic fixture',kind:'digital',reward:'ember',price_cents:500,delivery_url:'https://example.invalid/private-download'})).data.product;
 assert.ok(!JSON.stringify(await api('catalog','GET',null,null)).includes('private-download'));
 const customer={name:'Test buyer',email:'buyer@example.invalid',postal_code:'12345-678',address:'Test street',number:'1',district:'Test',city:'Test city',state:'SP',complement:''};
 assert.equal((await api('checkout','POST',{product_id:physical.id,quantity:2,accepted:true,customer},null)).status,401);
 assert.equal((await api('checkout','POST',{product_id:physical.id,quantity:2,accepted:true,customer},'buyer',{Origin:'https://other.invalid'})).status,403);
 assert.equal((await api('checkout','POST',{product_id:physical.id,quantity:0,accepted:true,customer},'buyer')).status,422);
 assert.equal((await api('checkout','POST',{product_id:physical.id,quantity:1,accepted:false,customer},'buyer')).status,422);
 r=await api('checkout','POST',{product_id:physical.id,quantity:2,accepted:true,customer,price_cents:1,total_cents:1},'buyer');assert.equal(r.status,201);const orderId=r.data.order_id;
 assert.equal(Number((await shop.order(orderId)).total_cents),3648);assert.equal(preferences[0].items[0].unit_price,15.99);assert.equal(preferences[0].shipments.cost,4.5);assert.ok(!JSON.stringify(preferences[0]).includes('preapproval'));
 assert.equal((await api('orders/'+orderId+'/refresh','POST',{},'other')).status,404);
 assert.equal((await notify('999',{'x-signature':'ts=1,v1='+'0'.repeat(64)})).status,401);
 payments.set('101',payment('101',orderId,99.99));assert.equal((await notify('101')).status,409);assert.equal((await shop.order(orderId)).payment_status,'pending');
 for(const mismatch of [{currency_id:'USD'},{collector_id:456},{live_mode:false}]){payments.set('101',{...payment('101',orderId,36.48),...mismatch});assert.equal((await notify('101')).status,409);assert.equal((await shop.order(orderId)).payment_status,'pending');}
 payments.set('101',payment('101',orderId,36.48));assert.equal((await notify('101')).status,200);assert.equal((await notify('101')).status,200);
 assert.equal((await api('admin/orders/'+orderId+'/shipping','POST',{fulfillment:'shipped',tracking:'TEST123'},'buyer')).status,403);
 assert.equal((await api('admin/orders/'+orderId+'/shipping','POST',{fulfillment:'shipped',tracking:'TEST123'})).status,200);
 const otherMe=await api('me','GET',null,'other');assert.equal(otherMe.data.orders.length,0);assert.ok(!JSON.stringify(otherMe).includes(customer.email));
 assert.equal((await api('theme','POST',{theme:'ember'},'buyer')).status,403);
 r=await api('checkout','POST',{product_id:digital.id,quantity:1,accepted:true},'buyer');assert.equal(r.status,201);const digitalId=r.data.order_id;
 assert.equal((await api('me','GET',null,'buyer')).data.orders.find(o=>o.id===digitalId).delivery_url,'');
 payments.set('102',payment('102',digitalId,5));assert.equal((await notify('102')).status,200);assert.equal((await notify('102')).status,200);
 r=await api('me','GET',null,'buyer');assert.deepEqual(r.data.owned,['ember']);assert.equal(r.data.orders.find(o=>o.id===digitalId).delivery_url,'https://example.invalid/private-download');
 assert.equal((await api('theme','POST',{theme:'ember'},'buyer')).status,200);assert.equal((await api('me','GET',null,'buyer')).data.theme,'ember');
 assert.equal((await api('checkout','POST',{product_id:digital.id,quantity:1,accepted:true},'buyer')).status,409);
 payments.set('102',payment('102',digitalId,5,'refunded',Date.now()+1000));assert.equal((await notify('102')).status,200);r=await api('me','GET',null,'buyer');assert.deepEqual(r.data.owned,[]);assert.equal(r.data.theme,'classic');assert.equal(r.data.orders.find(o=>o.id===digitalId).delivery_url,'');
 payments.set('102',payment('102',digitalId,5,'approved',Date.now()-1000));await notify('102');assert.equal((await shop.order(digitalId)).payment_status,'refunded','Old approval cannot undo a refund.');
 await api('admin/products','POST',{...product,id:physical.id,price_cents:9999,active:false});assert.equal(Number((await shop.order(orderId)).unit_cents),1599);
 shop.close();shop=new ShopStore({pool:null,file});shop.persistent=true;commerce=createCommerce({auth,store:shop,fetcher:fakeMP,env});r=await api('me','GET',null,'buyer');assert.equal(r.data.orders.length,2);assert.equal((await api('admin/status')).data.connected,true);
 await api('admin/settings','POST',{seller_name:'Test',support_contact:'store@example.invalid',policy:'Test terms',enabled:false});assert.equal((await api('catalog','GET',null,null)).data.checkout_enabled,false);
 console.log('Store OK: account permissions, CSRF, encrypted credentials, server prices, shipping, signed notifications, identity/currency/amount checks, idempotency, refund revocation, private digital delivery and restart persistence. No real payment/API call.');
 }finally{await new Promise(r=>server.close(r));shop.close();fs.rmSync(temp,{recursive:true,force:true});}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
