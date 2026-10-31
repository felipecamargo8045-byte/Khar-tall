'use strict';
// Loja exclusiva do Cerco. Nenhuma tabela, produto ou direito do Khar Tall é usado.
const http=require('node:http'),crypto=require('node:crypto'),{Pool}=require('pg');
const {catalog,find}=require('./catalog.cjs'),{makeProvider}=require('./provider.cjs');
const GAME=process.env.CERCO_GAME_ORIGIN||'https://cerco-dos-reis-teste.onrender.com';
const BASE=process.env.CERCO_STORE_ORIGIN||'https://cerco-dos-reis-loja.onrender.com';
const secret=process.env.CERCO_WEBHOOK_SECRET;
if(!process.env.DATABASE_URL||!secret||secret.length<48)throw Error('Configure o banco e a chave privada da loja.');
const pool=new Pool({connectionString:process.env.DATABASE_URL,max:3,idleTimeoutMillis:15000,connectionTimeoutMillis:12000});
const pay=makeProvider({handle:process.env.INFINITEPAY_HANDLE,secret,base:BASE,game:GAME});
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const buckets=new Map();
const fail=(status,message)=>{throw Object.assign(new Error(message),{status})};
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
let ready=false;
async function init(){
 await pool.query(`CREATE TABLE IF NOT EXISTS cerco_shop.collections(owner_hash text PRIMARY KEY,equipped text,created_at timestamptz NOT NULL DEFAULT now());
 CREATE TABLE IF NOT EXISTS cerco_shop.orders(id uuid PRIMARY KEY,owner_hash text NOT NULL REFERENCES cerco_shop.collections(owner_hash),skin_id text NOT NULL,amount integer NOT NULL CHECK(amount=250),status text NOT NULL DEFAULT 'creating',checkout_url text,transaction_nsu text UNIQUE,slug text,method text,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
 CREATE UNIQUE INDEX IF NOT EXISTS cerco_one_pending_skin ON cerco_shop.orders(owner_hash,skin_id) WHERE status IN ('creating','pending');
 CREATE INDEX IF NOT EXISTS cerco_orders_owner ON cerco_shop.orders(owner_hash,created_at DESC);
 CREATE TABLE IF NOT EXISTS cerco_shop.owned(owner_hash text NOT NULL REFERENCES cerco_shop.collections(owner_hash),skin_id text NOT NULL,order_id uuid NOT NULL REFERENCES cerco_shop.orders(id),PRIMARY KEY(owner_hash,skin_id));
 CREATE TABLE IF NOT EXISTS cerco_shop.support(id uuid PRIMARY KEY,owner_hash text NOT NULL REFERENCES cerco_shop.collections(owner_hash),message text NOT NULL,reply text,created_at timestamptz NOT NULL DEFAULT now());`);
 ready=true;
}
function owner(req){const value=String(req.headers.authorization||'').replace(/^Bearer /,'');if(!/^[A-Za-z0-9_-]{43}$/.test(value))fail(401,'Abra sua coleção para continuar.');return hash(value)}
function rate(req){const key=String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',')[0],now=Date.now(),events=(buckets.get(key)||[]).filter(t=>now-t<60000);if(events.length>70)fail(429,'Aguarde antes de tentar novamente.');events.push(now);buckets.set(key,events);if(buckets.size>5000)for(const[k,v]of buckets)if(v.at(-1)<now-60000)buckets.delete(k)}
async function body(req){if(!/^application\/json/.test(req.headers['content-type']||''))fail(415,'Formato inválido.');let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>8192)fail(413,'Mensagem muito longa.');chunks.push(chunk)}try{const data=JSON.parse(Buffer.concat(chunks));if(!data||typeof data!=='object'||Array.isArray(data))throw Error();return data}catch{fail(400,'Dados inválidos.')}}
function send(res,status,data,origin){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',...(origin?{'Access-Control-Allow-Origin':origin,Vary:'Origin'}:{})});res.end(JSON.stringify(data))}
async function collection(key){const owned=(await pool.query('SELECT skin_id FROM cerco_shop.owned WHERE owner_hash=$1',[key])).rows.map(x=>x.skin_id);const account=(await pool.query('SELECT equipped FROM cerco_shop.collections WHERE owner_hash=$1',[key])).rows[0];const orders=(await pool.query('SELECT id,skin_id,amount,status,checkout_url,created_at FROM cerco_shop.orders WHERE owner_hash=$1 ORDER BY created_at DESC LIMIT 25',[key])).rows;return {exists:!!account,owned,equipped:owned.includes(account?.equipped)?account.equipped:null,orders}}
async function reconcile(order,data){
 const result=await pay.verify(order,data);if(!result.paid)return result;
 const client=await pool.connect();
 try{await client.query('BEGIN');const locked=(await client.query('SELECT * FROM cerco_shop.orders WHERE id=$1 FOR UPDATE',[order.id])).rows[0];
  if(!['refunded','cancelled'].includes(locked.status)){
   await client.query("UPDATE cerco_shop.orders SET status='approved',transaction_nsu=$1,slug=$2,method=$3,updated_at=now() WHERE id=$4",[result.transaction,result.slug,result.method,order.id]);
   await client.query('INSERT INTO cerco_shop.owned(owner_hash,skin_id,order_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[order.owner_hash,order.skin_id,order.id]);
  }
  await client.query('COMMIT');return result;
 }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
}
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,BASE),origin=req.headers.origin;
 const allowed=origin===GAME||origin===BASE;
 try{
  if(url.pathname==='/health'){return send(res,ready?200:503,{ready,game:'cerco-dos-reis'},allowed?origin:null)}
  if(url.pathname==='/'){res.writeHead(302,{Location:GAME+'/#shop','Referrer-Policy':'no-referrer'});return res.end()}
  if(req.method==='OPTIONS'){if(!allowed)return send(res,403,{error:'Origem não permitida.'});res.writeHead(204,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Authorization,Content-Type','Access-Control-Max-Age':'600',Vary:'Origin'});return res.end()}
  rate(req);
  if(url.pathname==='/webhook/infinitepay'){
   if(req.method!=='POST')fail(405,'Método inválido.');const id=url.searchParams.get('order');if(!UUID.test(id||''))fail(400,'Pedido inválido.');
   const supplied=url.searchParams.get('token')||'',expected=pay.token(id);if(!/^[a-f0-9]{64}$/.test(supplied)||!crypto.timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))fail(401,'Notificação inválida.');
   const data=await body(req),order=(await pool.query('SELECT * FROM cerco_shop.orders WHERE id=$1',[id])).rows[0];if(!order||data.order_nsu!==id)fail(400,'Pedido diferente.');
   if(['refunded','canceled'].includes(data.event)&&order.status==='approved'&&data.transaction_nsu===order.transaction_nsu){
    await pool.query("UPDATE cerco_shop.orders SET status='refunded',updated_at=now() WHERE id=$1",[id]);
    await pool.query('DELETE FROM cerco_shop.owned WHERE order_id=$1',[id]);
   }else{const result=await reconcile(order,data);if(!result.paid)fail(400,'Aguardando confirmação do pagamento.')}
   return send(res,200,{success:true});
  }
  if(!allowed)fail(403,'Origem não permitida.');
  if(url.pathname==='/catalog'&&req.method==='GET')return send(res,200,{game:'cerco-dos-reis',catalog,paymentMethods:['pix','credit_card']},origin);
  const key=owner(req);
  if(url.pathname==='/collection'&&req.method==='GET')return send(res,200,await collection(key),origin);
  if(req.method!=='POST')fail(405,'Método não permitido.');const data=await body(req);
  if(url.pathname==='/orders'){
   const product=find(data.skinId);if(!product)fail(422,'Skin não encontrada.');
   await pool.query('INSERT INTO cerco_shop.collections(owner_hash) VALUES($1) ON CONFLICT DO NOTHING',[key]);
   if((await pool.query('SELECT 1 FROM cerco_shop.owned WHERE owner_hash=$1 AND skin_id=$2',[key,product.id])).rowCount)fail(409,'Esta skin já está na sua coleção.');
   await pool.query("UPDATE cerco_shop.orders SET status='failed' WHERE owner_hash=$1 AND status='creating' AND created_at<now()-interval '2 minutes'",[key]);
   const previous=(await pool.query("SELECT * FROM cerco_shop.orders WHERE owner_hash=$1 AND skin_id=$2 AND status='pending' ORDER BY created_at DESC LIMIT 1",[key,product.id])).rows[0];
   if(previous?.checkout_url)return send(res,200,{id:previous.id,url:previous.checkout_url},origin);
   const id=crypto.randomUUID();await pool.query('INSERT INTO cerco_shop.orders(id,owner_hash,skin_id,amount) VALUES($1,$2,$3,$4)',[id,key,product.id,product.priceCents]);
   try{const checkout=await pay.create({id,name:product.name,amount:product.priceCents});await pool.query("UPDATE cerco_shop.orders SET status='pending',checkout_url=$1 WHERE id=$2",[checkout,id]);return send(res,201,{id,url:checkout},origin)}catch(e){await pool.query("UPDATE cerco_shop.orders SET status='failed' WHERE id=$1",[id]);throw e}
  }
  if(url.pathname==='/verify'){
   if(!UUID.test(data.orderId||''))fail(422,'Pedido inválido.');const order=(await pool.query('SELECT * FROM cerco_shop.orders WHERE id=$1 AND owner_hash=$2',[data.orderId,key])).rows[0];if(!order)fail(404,'Pedido não encontrado nesta coleção.');
   const result=await reconcile(order,data);return send(res,200,{...result,collection:await collection(key)},origin);
  }
  if(url.pathname==='/equip'){
   if(data.skinId!==null&&!(await pool.query('SELECT 1 FROM cerco_shop.owned WHERE owner_hash=$1 AND skin_id=$2',[key,data.skinId])).rowCount)fail(403,'Skin não disponível nesta coleção.');
   await pool.query('UPDATE cerco_shop.collections SET equipped=$1 WHERE owner_hash=$2',[data.skinId,key]);return send(res,200,await collection(key),origin);
  }
  if(url.pathname==='/support'){
   if(typeof data.message!=='string'||data.message.trim().length<5||data.message.length>3000)fail(422,'Descreva sua dúvida em até 3.000 caracteres.');
   await pool.query('INSERT INTO cerco_shop.collections(owner_hash) VALUES($1) ON CONFLICT DO NOTHING',[key]);const id=crypto.randomUUID();await pool.query('INSERT INTO cerco_shop.support(id,owner_hash,message) VALUES($1,$2,$3)',[id,key,data.message.trim()]);return send(res,201,{id,message:'Mensagem registrada para o atendimento do Cerco dos Reis.'},origin);
  }
  fail(404,'Rota não encontrada.');
 }catch(e){if(e.code==='23505')return send(res,409,{error:'Transação já utilizada.'},allowed?origin:null);send(res,e.status||500,{error:e.status?e.message:'A loja não respondeu. Tente novamente em instantes.'},allowed?origin:null)}
});
init().then(()=>server.listen(Number(process.env.PORT)||10000,'0.0.0.0')).catch(error=>{console.error('Falha ao iniciar o banco da loja ('+(error.code||'conexao')+').');process.exit(1)});
process.on('SIGTERM',()=>server.close(()=>pool.end().finally(()=>process.exit(0))));
