const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {spawn}=require('node:child_process'),{join}=require('node:path'),{Pool}=require('pg');
const connectionString=process.env.CERCO_TEST_DATABASE_URL;
test('loja entrega Liliti só após pagamento correto e preserva as skins',{skip:!connectionString},async()=>{
 const pool=new Pool({connectionString,max:1});
 await pool.query('CREATE SCHEMA IF NOT EXISTS cerco_shop');
 const origin='http://127.0.0.1:10157',secret='b'.repeat(64);
 const child=spawn(process.execPath,['--require',join(__dirname,'provider-preload.cjs'),join(__dirname,'../server.cjs')],{
  env:{...process.env,DATABASE_URL:connectionString,PORT:'10157',CERCO_GAME_ORIGIN:origin,CERCO_STORE_ORIGIN:origin,CERCO_WEBHOOK_SECRET:secret,INFINITEPAY_HANDLE:'consultorcamargo'},stdio:['ignore','pipe','pipe']});
 let errors='';child.stderr.on('data',d=>{errors+=d});
 try{
  let up=false;
  for(let i=0;i<70&&!up;i++){
   await new Promise(r=>setTimeout(r,150));
   up=await fetch(origin+'/health').then(r=>r.ok).catch(()=>false);
  }
  assert.ok(up,'Backend não iniciou: '+errors);
  const token=crypto.randomBytes(32).toString('base64url'),other=crypto.randomBytes(32).toString('base64url');
  async function request(path,data,key=token){
   const response=await fetch(origin+path,{method:data?'POST':'GET',headers:{Origin:origin,Authorization:'Bearer '+key,...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});
   return {status:response.status,body:await response.json()};
  }
  let result=await request('/orders',{productId:'card_liliti',amount:1});assert.equal(result.status,201);const cardOrder=result.body.id;
  let collection=(await request('/collection')).body;assert.deepEqual(collection.cards,[]);
  assert.equal(collection.orders[0].amount,1000,'Preço fornecido pelo navegador foi aceito');
  assert.equal((await request('/orders',{productId:'card_liliti'})).body.id,cardOrder,'Criou cobrança pendente duplicada');
  assert.equal((await request('/verify',{orderId:cardOrder,transaction_nsu:'wrong_amount',slug:'liliti'})).status,409);
  assert.deepEqual((await request('/collection')).body.cards,[]);
  result=await request('/verify',{orderId:cardOrder,transaction_nsu:'card_tx',slug:'liliti'});
  assert.equal(result.status,200);assert.deepEqual(result.body.collection.cards,['liliti']);
  assert.deepEqual(result.body.collection.owned,[],'Carta alterou skins');
  assert.equal((await request('/orders',{productId:'card_liliti'})).status,409,'Revendeu carta já possuída');
  assert.equal((await request('/equip',{skinId:'card_liliti'})).status,403,'Carta foi equipada como cor');
  assert.equal((await request('/verify',{orderId:cardOrder,transaction_nsu:'card_tx',slug:'liliti'},other)).status,404);
  result=await request('/orders',{skinId:'skin_green_light'});assert.equal(result.status,201);const skinOrder=result.body.id;
  assert.equal((await request('/collection')).body.orders.find(o=>o.id===skinOrder).amount,250);
  assert.equal((await request('/verify',{orderId:skinOrder,transaction_nsu:'card_tx',slug:'verde'})).status,409,'Reutilizou transação da carta');
  result=await request('/verify',{orderId:skinOrder,transaction_nsu:'skin_tx',slug:'verde'});
  assert.equal(result.status,200);assert.deepEqual(result.body.collection.owned,['skin_green_light']);
  assert.deepEqual(result.body.collection.cards,['liliti']);
  const hmac=crypto.createHmac('sha256',secret).update('cerco:'+cardOrder).digest('hex');
  result=await request('/webhook/infinitepay?order='+cardOrder+'&token='+hmac,{event:'refunded',order_nsu:cardOrder,transaction_nsu:'card_tx'});
  assert.equal(result.status,200);
  collection=(await request('/collection')).body;assert.deepEqual(collection.cards,[]);assert.deepEqual(collection.owned,['skin_green_light']);
  result=await request('/verify',{orderId:cardOrder,transaction_nsu:'card_tx',slug:'liliti'});
  assert.deepEqual(result.body.collection.cards,[],'Retorno antigo reativou carta reembolsada');
 }finally{child.kill('SIGTERM');await pool.end();}
});
