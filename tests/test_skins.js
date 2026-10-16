'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),http=require('node:http'),vm=require('node:vm');
const {SKINS,PRICE_CENTS,findSkin,PAYMENT_NOTICE}=require('../skin-catalog.js'),{ShopStore}=require('../store-db.js'),{createCommerce}=require('../store-server.js');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'kt-skins-')),file=path.join(temp,'shop.sqlite3');
const {DatabaseSync}=require('node:sqlite');const old=new DatabaseSync(file);old.exec("CREATE TABLE kt_store_preferences(user_id text PRIMARY KEY,theme text NOT NULL DEFAULT 'classic'); INSERT INTO kt_store_preferences VALUES('prior-player','frost')");old.close();
const users=Object.fromEntries(['owner','buyer','other'].map(username=>[username,{id:crypto.randomUUID(),username}]));
const env={STORE_PAYMENT_PROVIDER:'infinitepay',INFINITEPAY_HANDLE:'fixture',STORE_ADMIN_USERNAMES:'owner',STORE_SETTINGS_KEY:crypto.randomBytes(32).toString('hex')};
let store=new ShopStore({pool:null,file});store.persistent=true;const links=[],proofs=new Map();let providerCalls=0;
const provider=async(url,options)=>{
 providerCalls++;const payload=JSON.parse(options.body);
 if(url==='https://api.checkout.infinitepay.io/links'){links.push(payload);return {ok:true,json:async()=>({url:'https://checkout.infinitepay.io/fixture/invoice-'+payload.order_nsu})};}
 assert.equal(url,'https://api.checkout.infinitepay.io/payment_check');return {ok:true,json:async()=>proofs.get(payload.transaction_nsu)||{success:true,paid:false}};
};
let commerce=createCommerce({store,env,auth:{current:async req=>users[req.headers['x-user']]||null},fetcher:provider});
const server=http.createServer((req,res)=>commerce.process(req,res,new URL(req.url,'http://test').pathname));let origin;
async function api(route,method='GET',data,user='buyer'){const r=await fetch(origin+'/api/store/'+route,{method,headers:{...(user?{'X-User':user}:{}),...(data?{'Content-Type':'application/json',Origin:origin,'X-Kt-Csrf':'1'}:{})},body:data?JSON.stringify(data):undefined});return {status:r.status,data:await r.json()};}
async function renderer(){
 const width=20,height=20,pixels=new Uint8ClampedArray(width*height*4);for(let i=0;i<pixels.length;i+=4)pixels.set([105,24,24,255],i);
 const face=(4*width+10)*4,background=(9*width+1)*4,cloth=(12*width+10)*4,metal=(14*width+9)*4;pixels.set([180,145,70,255],metal);
 const canvases=[];class Image{constructor(){this.naturalWidth=width;this.naturalHeight=height;}set src(value){queueMicrotask(()=>this.onload());}}
 const document={createElement:()=>{let data;const canvas={getContext:()=>({drawImage(){},getImageData:()=>({data:new Uint8ClampedArray(pixels)}),putImageData(frame){data=frame.data;}}),toDataURL(){canvases.push(data);return 'data:image/png;fixture';}};return canvas;}};
 const context={window:{KharTallSkinCatalog:{SKINS,findSkin},dispatchEvent(){}},document,Image,Event:class Event{},Map,Promise,Uint8ClampedArray};vm.runInNewContext(fs.readFileSync(require.resolve('../skins.js'),'utf8'),context);
 const image={dataset:{},style:{}};context.window.KharTallSkins.paintPiece(image,'king','skin_green_light');await new Promise(resolve=>setImmediate(resolve));
 assert.equal(image.src,'data:image/png;fixture');const out=canvases[0];assert.ok(out);assert.deepEqual([...out.slice(face,face+4)],[...pixels.slice(face,face+4)],'Face outside cloth polygon is untouched');assert.deepEqual([...out.slice(background,background+4)],[...pixels.slice(background,background+4)],'Background is untouched');assert.deepEqual([...out.slice(metal,metal+4)],[...pixels.slice(metal,metal+4)],'Gold metal is untouched');assert.notDeepEqual([...out.slice(cloth,cloth+3)],[...pixels.slice(cloth,cloth+3)],'Cloth changes color');assert.ok(out[cloth+1]>out[cloth],'Green skin changes red clothing to green');
 assert.equal(out.length,pixels.length,'Resolution preserved');for(let i=3;i<out.length;i+=4)assert.equal(out[i],pixels[i],'Alpha preserved');
}
(async()=>{try{
 assert.equal(SKINS.length,16);assert.equal(new Set(SKINS.map(s=>s.id)).size,16);assert.equal(new Set(SKINS.map(s=>s.product_id)).size,16);assert.ok(SKINS.every(s=>s.price_cents===250));assert.equal(PRICE_CENTS,250);
 await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
 const catalog=(await api('catalog','GET',null,null)).data;assert.equal(catalog.products.filter(p=>findSkin(p.reward)).length,16);assert.equal(catalog.skin_checkout_enabled,false);assert.match(catalog.skin_payment_notice,/R\$ 2,50/);assert.equal(catalog.payment_methods.includes('Débito'),false);
 assert.equal(await store.theme('prior-player'),'frost','Old board preference survives migration');assert.equal(await store.skin('prior-player'),'classic');
 assert.equal((await api('skin','POST',{skin:SKINS[0].id},null)).status,401);assert.equal((await api('skin','POST',{skin:SKINS[0].id})).status,403);assert.equal((await api('skin','POST',{skin:'forged'})).status,422);
 const p=await store.product(SKINS[0].product_id);for(const price_cents of [0,249,251,1000]){const r=await api('admin/products','POST',{...p,price_cents,active:true},'owner');assert.equal(r.status,422,'Reject skin price '+price_cents);}
 assert.equal((await api('admin/products','POST',{...p,reward:'ember',active:true},'owner')).status,422,'Reserved skin cannot be replaced with another reward');
 assert.equal((await api('checkout','POST',{product_id:p.id,quantity:1,accepted:true})).status,503);assert.equal(providerCalls,0,'A closed shop never creates a checkout');
 assert.match(PAYMENT_NOTICE,/Pix ou cartão de crédito/);assert.doesNotMatch(PAYMENT_NOTICE,/mínim|pausad|R\$ 10/i);
 for(const file of ['loja.html','painel-loja.html'])assert.doesNotMatch(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),/valor mínimo|acima de R\$ 10/i,'No payment threshold notice in '+file);
 assert.equal((await api('admin/settings','POST',{seller_name:'Fixture',support_contact:'fixture@example.invalid',policy:'Fixture terms',enabled:true},'owner')).status,200);
 assert.equal((await api('catalog','GET',null,null)).data.skin_checkout_enabled,true);
 const paidOrders=[];
 for(const [i,method]of ['pix','credit_card'].entries()){
  const skin=SKINS[i],result=await api('checkout','POST',{product_id:skin.product_id,quantity:1,accepted:true,total_cents:1,price_cents:1});assert.equal(result.status,201);
  const order=await store.order(result.data.order_id),transaction=crypto.randomUUID(),refs={order_nsu:order.id,transaction_nsu:transaction,slug:'invoice-'+order.id};paidOrders.push(order);
  assert.equal(Number(order.total_cents),250,'Server keeps R$ 2.50 even if the buyer sends another amount');assert.equal(order.payment_status,'pending');assert.equal((await api('me')).data.owned.includes(skin.id),false,'An unpaid checkout grants no skin');
  assert.deepEqual(links.at(-1).items,[{quantity:1,price:250,description:order.title}]);assert.equal(links.at(-1).handle,'fixture');assert.equal(links.at(-1).payment_methods,undefined,'Both provider methods remain available');
  assert.equal((await api('orders/'+order.id+'/refresh','POST',refs,'other')).status,404);
  proofs.set(transaction,{success:true,paid:true,amount:250,paid_amount:250,capture_method:method,installments:1});
  assert.equal((await api('orders/'+order.id+'/refresh','POST',refs)).status,200,'R$ 2.50 payment accepted with '+method);assert.equal((await api('me')).data.owned.includes(skin.id),true);
 }
 const id=paidOrders[0].id;
 assert.equal((await api('checkout','POST',{product_id:p.id,quantity:1,accepted:true})).status,409,'An owned skin cannot be purchased twice');
 await api('admin/settings','POST',{seller_name:'Fixture',support_contact:'fixture@example.invalid',policy:'Fixture terms',enabled:false},'owner');assert.equal((await api('catalog','GET',null,null)).data.skin_checkout_enabled,false);const callsBeforePause=providerCalls;assert.equal((await api('checkout','POST',{product_id:SKINS[2].product_id,quantity:1,accepted:true})).status,503);assert.equal(providerCalls,callsBeforePause,'Closing the shop also pauses skins');
 assert.equal((await api('skin','POST',{skin:p.reward})).status,200);assert.equal((await api('me')).data.skin,p.reward);assert.equal((await api('me','GET',null,'other')).data.skin,'classic');assert.equal((await api('me')).data.theme,'classic','Skin does not replace a board theme');
 store.close();store=new ShopStore({pool:null,file});store.persistent=true;commerce=createCommerce({store,env,auth:{current:async req=>users[req.headers['x-user']]||null}});assert.equal((await api('me')).data.skin,p.reward);assert.equal((await api('catalog')).data.products.filter(p=>findSkin(p.reward)).length,16,'Restart does not duplicate skins');
 await store.query("UPDATE kt_store_orders SET payment_status='refunded' WHERE id=$1",[id]);assert.equal((await api('me')).data.skin,'classic','Refund revokes the selected skin');assert.equal((await api('skin','POST',{skin:p.reward})).status,403);
 let hasPurchase=true;const publicStore=new ShopStore({pool:{query:async(sql)=>({rows:sql.includes('SELECT username')?[{username:'fixture-player'}]:sql.includes('SELECT skin')?[{skin:p.reward}]:hasPurchase?[{reward:p.reward}]:[]})}});publicStore.ready=true;assert.deepEqual(await publicStore.publicCosmetic(users.buyer.id),{username:'fixture-player',skin:p.reward});hasPurchase=false;assert.equal((await publicStore.publicCosmetic(users.buyer.id)).skin,'classic','Multiplayer never trusts a revoked skin');
 await renderer();console.log('Skins OK: 16 variants, fixed R$ 2.50 server price, Pix and credit confirmation at R$ 2.50, shop opening/closing, safe migration, private ownership, equip/restart/refund, multiplayer ownership and face/metal/background/alpha preservation. No real checkout or payment.');
}finally{await new Promise(r=>server.close(r));store.close();fs.rmSync(temp,{recursive:true,force:true});}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
