'use strict';
const fs=require('node:fs'),path=require('node:path');
const {getPool}=require('./database.js');
const {SKINS,PRICE_CENTS,findSkin}=require('./skin-catalog.js');
class ShopStore{
 constructor({pool=getPool(),file=process.env.STORE_DATABASE_PATH||path.join(__dirname,'data/store.sqlite3')}={}){this.pool=pool;this.persistent=!!pool;this.file=file;this.ready=false;this.pending=null;}
 async init(){if(this.ready)return;if(this.pending)return this.pending;this.pending=this.initialize().finally(()=>{this.pending=null;});return this.pending;}
 async initialize(){
  if(!this.pool&&!this.db){const {DatabaseSync}=require('node:sqlite');fs.mkdirSync(path.dirname(this.file),{recursive:true});this.db=new DatabaseSync(this.file);this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');}
  const userType=this.pool?'uuid':'text',orderFK=this.pool?' REFERENCES kt_users(id) ON DELETE SET NULL':'',prefFK=this.pool?' REFERENCES kt_users(id) ON DELETE CASCADE':'';
  const sql=`CREATE TABLE IF NOT EXISTS kt_store_products(id text PRIMARY KEY,title text NOT NULL,description text NOT NULL,kind text NOT NULL,price_cents integer NOT NULL,shipping_cents integer NOT NULL DEFAULT 0,image text NOT NULL,reward text NOT NULL DEFAULT '',delivery_url text NOT NULL DEFAULT '',active integer NOT NULL DEFAULT 0,created_ms bigint NOT NULL,updated_ms bigint NOT NULL);
   CREATE TABLE IF NOT EXISTS kt_store_orders(id text PRIMARY KEY,user_id ${userType}${orderFK},product_id text NOT NULL,title text NOT NULL,kind text NOT NULL,reward text NOT NULL DEFAULT '',delivery_url text NOT NULL DEFAULT '',quantity integer NOT NULL,unit_cents integer NOT NULL,shipping_cents integer NOT NULL,total_cents integer NOT NULL,customer_json text NOT NULL DEFAULT '{}',payment_status text NOT NULL DEFAULT 'created',payment_id text UNIQUE,provider_updated_ms bigint NOT NULL DEFAULT 0,preference_id text,checkout_url text,merchant_id text NOT NULL,live_mode integer NOT NULL,fulfillment text NOT NULL DEFAULT 'pending',tracking text NOT NULL DEFAULT '',created_ms bigint NOT NULL,updated_ms bigint NOT NULL);
   CREATE INDEX IF NOT EXISTS kt_store_orders_user ON kt_store_orders(user_id,created_ms);
   CREATE TABLE IF NOT EXISTS kt_store_preferences(user_id ${userType} PRIMARY KEY${prefFK},theme text NOT NULL DEFAULT 'classic');
   CREATE TABLE IF NOT EXISTS kt_store_settings(id text PRIMARY KEY,value text NOT NULL);`;
  if(this.pool){await this.pool.query(sql);await this.pool.query("ALTER TABLE kt_store_preferences ADD COLUMN IF NOT EXISTS skin text NOT NULL DEFAULT 'classic'");}
  else{this.db.exec(sql);if(!this.db.prepare('PRAGMA table_info(kt_store_preferences)').all().some(c=>c.name==='skin'))this.db.exec("ALTER TABLE kt_store_preferences ADD COLUMN skin text NOT NULL DEFAULT 'classic'");}
  // Stable product IDs make this safe on restarts; preserve any archive decision.
  const seedSQL=`INSERT INTO kt_store_products(id,title,description,kind,price_cents,shipping_cents,image,reward,delivery_url,active,created_ms,updated_ms) VALUES($1,$2,$3,'digital',$4,0,$5,$6,'',1,$7,$8) ON CONFLICT(id) DO UPDATE SET price_cents=excluded.price_cents,shipping_cents=0,reward=excluded.reward,kind='digital'`;
  for(const skin of SKINS){const params=[skin.product_id,'Skin '+skin.name,skin.description,PRICE_CENTS,'/assets/token_king.webp',skin.id,Date.now(),Date.now()];if(this.pool)await this.pool.query(seedSQL,params);else this.db.prepare(seedSQL.replace(/\$\d+/g,'?')).run(...params);}
  this.ready=true;
 }
 async query(sql,params=[]){await this.init();if(this.pool)return this.pool.query(sql,params);const statement=this.db.prepare(sql.replace(/\$\d+/g,'?'));if(/^\s*(?:SELECT|WITH)/i.test(sql))return {rows:statement.all(...params)};const result=statement.run(...params);return {rows:[],rowCount:Number(result.changes)};}
 async one(sql,params=[]){return (await this.query(sql,params)).rows[0]||null;}
 async setting(id){const row=await this.one('SELECT value FROM kt_store_settings WHERE id=$1',[id]);return row?JSON.parse(row.value):null;}
 async setSetting(id,value){await this.query('INSERT INTO kt_store_settings(id,value) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET value=excluded.value',[id,JSON.stringify(value)]);}
 async products(admin=false){return (await this.query('SELECT * FROM kt_store_products'+(admin?'':' WHERE active=1')+' ORDER BY created_ms DESC LIMIT 100')).rows;}
 async product(id){return this.one('SELECT * FROM kt_store_products WHERE id=$1',[id]);}
 async saveProduct(p){await this.query(`INSERT INTO kt_store_products(id,title,description,kind,price_cents,shipping_cents,image,reward,delivery_url,active,created_ms,updated_ms) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
   ON CONFLICT(id) DO UPDATE SET title=excluded.title,description=excluded.description,kind=excluded.kind,price_cents=excluded.price_cents,shipping_cents=excluded.shipping_cents,image=excluded.image,reward=excluded.reward,delivery_url=excluded.delivery_url,active=excluded.active,updated_ms=excluded.updated_ms`,[p.id,p.title,p.description,p.kind,p.price_cents,p.shipping_cents,p.image,p.reward,p.delivery_url,p.active,p.created_ms,p.updated_ms]);}
 async addOrder(o){const keys=['id','user_id','product_id','title','kind','reward','delivery_url','quantity','unit_cents','shipping_cents','total_cents','customer_json','merchant_id','live_mode','created_ms','updated_ms'];await this.query(`INSERT INTO kt_store_orders(${keys.join(',')}) VALUES(${keys.map((_,i)=>'$'+(i+1)).join(',')})`,keys.map(k=>o[k]));}
 async order(id){return this.one('SELECT * FROM kt_store_orders WHERE id=$1',[id]);}
 async orders(userId){return (await this.query('SELECT * FROM kt_store_orders'+(userId?' WHERE user_id=$1':'')+' ORDER BY created_ms DESC LIMIT 50',userId?[userId]:[])).rows;}
 async owned(userId){return (await this.query("SELECT DISTINCT reward FROM kt_store_orders WHERE user_id=$1 AND kind='digital' AND payment_status='approved' AND reward<>''",[userId])).rows.map(r=>r.reward);}
 async theme(userId){return (await this.one('SELECT theme FROM kt_store_preferences WHERE user_id=$1',[userId]))?.theme||'classic';}
 async setTheme(userId,theme){await this.query('INSERT INTO kt_store_preferences(user_id,theme) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET theme=excluded.theme',[userId,theme]);}
 async skin(userId){return (await this.one('SELECT skin FROM kt_store_preferences WHERE user_id=$1',[userId]))?.skin||'classic';}
 async setSkin(userId,skin){await this.query('INSERT INTO kt_store_preferences(user_id,skin) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET skin=excluded.skin',[userId,skin]);}
 async publicCosmetic(userId){if(!userId||!this.pool)return {username:'',skin:'classic'};const user=await this.one('SELECT username FROM kt_users WHERE id=$1',[userId]);if(!user)return {username:'',skin:'classic'};const [skin,owned]=await Promise.all([this.skin(userId),this.owned(userId)]);return {username:user.username,skin:findSkin(skin)&&owned.includes(skin)?skin:'classic'};}
 close(){this.db?.close();this.db=null;this.ready=false;}
}
module.exports={ShopStore};

