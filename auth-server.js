'use strict';
// Accounts and matches use the existing persistent PostgreSQL database.
const {getPool}=require('./database.js');
const {clientIP}=require('./request-security.js');
const crypto=require('node:crypto');
const {promisify}=require('node:util');
const scrypt=promisify(crypto.scrypt);
const SESSION_DAYS=14;
const SESSION_COOKIE='kt_auth';
const secureHash=s=>crypto.createHash('sha256').update(s).digest('hex');
const isUsername=s=>typeof s==='string'&&/^[A-Za-z0-9_]{3,24}$/.test(s);
const isPassword=s=>typeof s==='string'&&s.length>=12&&s.length<=128&&!/[\u0000-\u001f\u007f]/.test(s);
const random=()=>crypto.randomBytes(32).toString('base64url');
const memoryLimit=new Map();
const sqlInit=`CREATE TABLE IF NOT EXISTS kt_users (
  id uuid PRIMARY KEY, username varchar(24) NOT NULL UNIQUE,
  password_hash text NOT NULL, recovery_hash char(64) NOT NULL,
  adult_declared boolean NOT NULL, privacy_version varchar(25) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE IF NOT EXISTS kt_sessions (
  token_hash char(64) PRIMARY KEY, user_id uuid NOT NULL REFERENCES kt_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
  CREATE INDEX IF NOT EXISTS kt_sessions_user ON kt_sessions(user_id);
  CREATE INDEX IF NOT EXISTS kt_sessions_exp ON kt_sessions(expires_at);`;
function parseCookies(req){const obj={};for(const fragment of (req.headers.cookie||'').split(';')){const i=fragment.indexOf('=');if(i>0)obj[fragment.slice(0,i).trim()]=fragment.slice(i+1).trim();}return obj;}
function secure(req){return !!req.socket.encrypted||(process.env.TRUST_PROXY==='true'&&req.headers['x-forwarded-proto']==='https');}
function cookie(req,token,clear=false){return `${SESSION_COOKIE}=${clear?'':token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear?0:SESSION_DAYS*86400}${secure(req)?'; Secure':''}`;}
function error(status,message){const e=new Error(message);e.status=status;throw e;}
function limit(req,key,max,period){const ip=clientIP(req);const now=Date.now(),bucket=ip+':'+key;let data=memoryLimit.get(bucket)||[];data=data.filter(t=>t>now-period);if(data.length>=max)error(429,'Muitas tentativas. Aguarde e tente novamente.');data.push(now);memoryLimit.set(bucket,data);if(memoryLimit.size>20000){for(const [k,v] of memoryLimit)if(v.every(x=>x<now-3600000))memoryLimit.delete(k);}}
async function passHash(password){const salt=crypto.randomBytes(16);const key=await scrypt(password,salt,64,{N:16384,r:8,p:1,maxmem:32*1024*1024});return `scrypt:16384:8:1:${salt.toString('hex')}:${key.toString('hex')}`;}
async function checkPass(password,encoded){try{const [method,N,r,p,saltHex,keyHex]=String(encoded).split(':');if(method!=='scrypt'||N!=='16384'||r!=='8'||p!=='1')return false;const salt=Buffer.from(saltHex,'hex'),original=Buffer.from(keyHex,'hex');if(salt.length!==16||original.length!==64)return false;const got=await scrypt(password,salt,64,{N:16384,r:8,p:1,maxmem:32*1024*1024});return crypto.timingSafeEqual(original,got);}catch{return false;}}
async function jsonBody(req){if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))error(415,'Use conteúdo JSON.');let n=0,chunks=[];for await(const c of req){n+=c.length;if(n>8192)error(413,'Dados muito extensos.');chunks.push(c);}let value;try{value=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{error(400,'JSON inválido.');}if(!value||typeof value!=='object'||Array.isArray(value))error(400,'Dados inválidos.');return value;}
function origin(req){const site=req.headers['sec-fetch-site'];if(site==='cross-site')error(403,'Origem não autorizada.');const host=req.headers.host;if(!host||req.headers['x-kt-csrf']!=='1')error(403,'Proteção de formulário inválida.');const o=req.headers.origin;let u;try{u=new URL(o);}catch{error(403,'Origem obrigatória.');}if(u.host!==host||!['https:','http:'].includes(u.protocol))error(403,'Origem não autorizada.');if(u.protocol!==(secure(req)?'https:':'http:'))error(403,'Origem não autorizada.');}
function out(res,status,obj,headers={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer',...headers});res.end(JSON.stringify(obj));}
function createAuth(){let pool=null,ready=false,lastRetry=0,initializing=null;
 async function init(){if(ready)return true;if(!require('./database.js').connectionString())return false;if(initializing)return initializing;if(Date.now()-lastRetry<15000)return false;lastRetry=Date.now();
 initializing=(async()=>{try{if(!pool)pool=getPool();await pool.query(sqlInit);ready=true;return true;}catch(e){ready=false;console.error('Khar Tall accounts database not ready:',e.message);return false;}finally{initializing=null;}})();return initializing;}
 async function query(s,params=[]){try{return await pool.query(s,params);}catch(e){if(/ECONN|ETIMEDOUT|terminated|timeout|ENOTFOUND/i.test(String(e.message)))ready=false;throw e;}}
 async function current(req){const token=parseCookies(req)[SESSION_COOKIE];if(!token||!/^[A-Za-z0-9_-]{35,80}$/.test(token))return null;const r=await query('SELECT u.id,u.username,s.token_hash FROM kt_sessions s JOIN kt_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()',[secureHash(token)]);return r.rows[0]||null;}
 function publicUser(u){return {username:u.username,id:u.id};}
 async function session(req,res,id){const token=random();await query("INSERT INTO kt_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '14 days')",[secureHash(token),id]);res.setHeader('Set-Cookie',cookie(req,token));}
 async function handle(req,res,pathname){if(!pathname.startsWith('/api/auth/'))return false;
 try{if(req.method==='GET'&&pathname==='/api/auth/status'){await init();out(res,200,{available:ready,registration_enabled:ready&&process.env.ENABLE_ACCOUNT_REGISTRATION==='true',persistent:ready,provider:'Neon',guest_mode:true});return true;}
 if(!(await init()))error(503,'Servidor de contas temporariamente indisponível. O modo convidado continua disponível.');
 if(req.method==='GET'&&pathname==='/api/auth/me'){const u=await current(req);out(res,200,{authenticated:!!u,user:u?publicUser(u):null});return true;}
 if(req.method!=='POST')error(405,'Método não permitido.');if(!secure(req)&&process.env.HOST!=='127.0.0.1'&&process.env.HOST!=='localhost')error(403,'HTTPS obrigatório.');origin(req);const b=await jsonBody(req);
 if(pathname==='/api/auth/register'){
  if(process.env.ENABLE_ACCOUNT_REGISTRATION!=='true')error(503,'Cadastro ainda desativado.');limit(req,'register',6,3600000);
  const name=b.username,pass=b.password;if(!isUsername(name))error(422,'Nome de jogador: 3 a 24 letras, números ou _.');if(!isPassword(pass))error(422,'Senha deve ter de 12 a 128 caracteres.');if(b.adult!==true||b.privacy_accepted!==true)error(422,'Cadastro exclusivo para maiores de 18 anos que aceitem a privacidade.');
  const hashed=await passHash(pass),recovery=random(),id=crypto.randomUUID();
  try{await query('INSERT INTO kt_users(id,username,password_hash,recovery_hash,adult_declared,privacy_version) VALUES($1,$2,$3,$4,true,$5)',[id,name.toLowerCase(),hashed,secureHash(recovery),'2026-10-15']);}catch(e){if(e.code==='23505')error(409,'Esse nome de jogador já está em uso.');throw e;}
  await session(req,res,id);out(res,201,{ok:true,user:{id,username:name.toLowerCase()},recovery_code:recovery});return true;
 }
 if(pathname==='/api/auth/login'){
  limit(req,'login',16,900000);const name=b.username,pass=b.password;if(!isUsername(name)||!isPassword(pass))error(401,'Nome de jogador ou senha inválidos.');const r=await query('SELECT id,username,password_hash FROM kt_users WHERE username=$1',[name.toLowerCase()]);const u=r.rows[0];const valid=await checkPass(pass,u?.password_hash||'scrypt:16384:8:1:00000000000000000000000000000000:'+('0'.repeat(128)));if(!valid||!u)error(401,'Nome de jogador ou senha inválidos.');await session(req,res,u.id);out(res,200,{ok:true,user:publicUser(u)});return true;
 }
 if(pathname==='/api/auth/logout'){
  const u=await current(req);if(u)await query('DELETE FROM kt_sessions WHERE token_hash=$1',[u.token_hash]);out(res,200,{ok:true},{'Set-Cookie':cookie(req,'',true)});return true;
 }
 if(pathname==='/api/auth/recover'){
  limit(req,'recover',5,3600000);if(!isUsername(b.username)||!isPassword(b.password)||typeof b.recovery_code!=='string'||b.recovery_code.length<32||b.recovery_code.length>90)error(422,'Dados de recuperação inválidos.');const newHash=await passHash(b.password),newCode=random();const client=await pool.connect();let updated;
  try{await client.query('BEGIN');const q=await client.query('UPDATE kt_users SET password_hash=$1,recovery_hash=$2,updated_at=now() WHERE username=$3 AND recovery_hash=$4 RETURNING id',[newHash,secureHash(newCode),b.username.toLowerCase(),secureHash(b.recovery_code)]);updated=q.rows[0];if(updated)await client.query('DELETE FROM kt_sessions WHERE user_id=$1',[updated.id]);await client.query('COMMIT');}catch(e){await client.query('ROLLBACK').catch(()=>{});throw e;}finally{client.release();}
  if(!updated)error(401,'Usuário ou código de recuperação inválidos.');out(res,200,{ok:true,recovery_code:newCode},{'Set-Cookie':cookie(req,'',true)});return true;
 }
 if(pathname==='/api/auth/delete'){
  limit(req,'delete',8,900000);const u=await current(req);if(!u)error(401,'Entre na conta primeiro.');if(b.confirm!=='EXCLUIR'||!isPassword(b.password))error(422,'Digite a senha e EXCLUIR para confirmar.');const r=await query('SELECT password_hash FROM kt_users WHERE id=$1',[u.id]);if(!r.rows[0]||!(await checkPass(b.password,r.rows[0].password_hash)))error(401,'Senha incorreta.');await query('DELETE FROM kt_users WHERE id=$1',[u.id]);out(res,200,{ok:true},{'Set-Cookie':cookie(req,'',true)});return true;
 }
 error(404,'Rota de autenticação não encontrada.');
 }catch(e){if(!e.status)console.error('Auth:',e.message);out(res,e.status||503,{error:e.status?e.message:'Serviço de contas temporariamente indisponível.'});return true;}
 }
 return {process:handle,init,current:async req=>{if(!parseCookies(req)[SESSION_COOKIE])return null;if(!(await init()))return null;return current(req);},reauthenticate:async(req,password)=>{if(!isPassword(password)||!await init())return false;limit(req,'confirm-password',8,900000);const u=await current(req);if(!u)return false;const r=await query('SELECT password_hash FROM kt_users WHERE id=$1',[u.id]);return !!r.rows[0]&&await checkPass(password,r.rows[0].password_hash);},prune:async()=>{if(await init())await query('DELETE FROM kt_sessions WHERE expires_at<now()');},status:()=>({ready,registration_enabled:ready&&process.env.ENABLE_ACCOUNT_REGISTRATION==='true'})};
}
module.exports={createAuth};
