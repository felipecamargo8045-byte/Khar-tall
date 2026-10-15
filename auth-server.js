'use strict';
const crypto=require('node:crypto');
const {promisify}=require('node:util');
const {Pool}=require('pg');
const scrypt=promisify(crypto.scrypt);
const enabled=process.env.ACCOUNTS_ENABLED==='true'&&!!process.env.DATABASE_URL;
const pool=enabled?new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:true},max:4,connectionTimeoutMillis:9000,idleTimeoutMillis:15000}):null;
let initialized;
const tries=new Map(),H=x=>crypto.createHash('sha256').update(x).digest('hex'),random=()=>crypto.randomBytes(32).toString('base64url');
const secure=r=>!!r.socket.encrypted||r.headers['x-forwarded-proto']==='https';
const cookie=(r,v,age)=>'kt_session='+v+'; Path=/; HttpOnly; SameSite=Lax; Max-Age='+age+(secure(r)?'; Secure':'');
const respond=(s,status,data,head={})=>{s.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY',...head});s.end(JSON.stringify(data))};
const fail=(code,text)=>{const e=new Error(text);e.status=code;throw e};
async function init(){if(!pool)fail(503,'Banco de contas não conectado.');if(!initialized)initialized=(async()=>{
 await pool.query('CREATE TABLE IF NOT EXISTS khar_users(id UUID PRIMARY KEY,username VARCHAR(24) NOT NULL,uname VARCHAR(24) UNIQUE NOT NULL,salt VARCHAR(48) NOT NULL,pw CHAR(128) NOT NULL,recovery CHAR(64) NOT NULL,accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
 await pool.query('CREATE TABLE IF NOT EXISTS khar_sessions(token CHAR(64) PRIMARY KEY,user_id UUID NOT NULL REFERENCES khar_users(id) ON DELETE CASCADE,expires_at TIMESTAMPTZ NOT NULL)');
 await pool.query('CREATE INDEX IF NOT EXISTS khar_session_expiry ON khar_sessions(expires_at)');
})().catch(e=>{initialized=null;throw e});return initialized;}
function limit(r,key,max,period){const k=(r.socket.remoteAddress||'?')+':'+key,n=Date.now(),a=(tries.get(k)||[]).filter(t=>n-t<period);if(a.length>=max)fail(429,'Muitas tentativas. Tente novamente mais tarde.');a.push(n);tries.set(k,a);if(tries.size>2500)tries.clear();}
function origin(r){const o=r.headers.origin;if(o){let u;try{u=new URL(o)}catch{fail(403,'Origem inválida.')}if(u.host!==r.headers.host)fail(403,'Origem inválida.');}else if(r.headers['sec-fetch-site']==='cross-site')fail(403,'Origem inválida.');}
async function body(r){if(!String(r.headers['content-type']||'').startsWith('application/json'))fail(415,'Envie JSON.');let a=[],n=0;for await(const b of r){n+=b.length;if(n>4096)fail(413,'Mensagem muito grande.');a.push(b)}try{return JSON.parse(Buffer.concat(a).toString('utf8'))}catch{fail(400,'JSON inválido.');}}
function fields(d){if(!d||typeof d!=='object')fail(422,'Dados inválidos.');const u=String(d.username||'').trim(),pw=d.password;if(!/^[A-Za-z0-9_]{3,24}$/.test(u))fail(422,'Nome de usuário inválido.');if(typeof pw!=='string'||pw.length<12||pw.length>128)fail(422,'A senha precisa ter 12 a 128 caracteres.');return {u,lower:u.toLowerCase(),pw};}
const digest=async(p,s)=>(await scrypt(p,s,64,{N:16384,r:8,p:1,maxmem:64*1024*1024})).toString('hex');
function sess(r){return String(r.headers.cookie||'').match(/(?:^|;\s*)kt_session=([A-Za-z0-9_-]{43})/)?.[1]||null}
async function logged(r){const t=sess(r);if(!t)return null;const q=await pool.query('SELECT u.id,u.username FROM khar_users u JOIN khar_sessions s ON s.user_id=u.id WHERE s.token=$1 AND s.expires_at>NOW()',[H(t)]);return q.rows[0]||null;}
async function newSession(r,id){const t=random();await pool.query("INSERT INTO khar_sessions(token,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '14 days')",[H(t),id]);return {'Set-Cookie':cookie(r,t,1209600)};}
async function handle(req,res,url){if(!url.startsWith('/api/auth/'))return false;try{
 if(req.method==='GET'&&url==='/api/auth/status'){try{await init();await pool.query('SELECT 1');respond(res,200,{available:true,persistent:true,registration:process.env.ACCOUNT_REGISTRATION_ENABLED==='true',recovery:'code'});}catch{respond(res,200,{available:false,registration:false,reason:'Banco de contas indisponível.'});}return true;}
 if(!enabled)fail(503,'Cadastro ainda indisponível.');if(process.env.NODE_ENV==='production'&&!secure(req))fail(403,'Use HTTPS.');await init();
 if(req.method==='GET'&&url==='/api/auth/me'){const u=await logged(req);respond(res,200,{account:u?{username:u.username}:null});return true;}
 if(req.method!=='POST')fail(405,'Operação inválida.');origin(req);
 if(url==='/api/auth/register'){if(process.env.ACCOUNT_REGISTRATION_ENABLED!=='true')fail(503,'Cadastro não liberado.');limit(req,'register',5,3600000);const d=await body(req),f=fields(d);if(d.adult!==true||d.privacy!==true)fail(422,'Confirme maioridade e privacidade.');
 const salt=crypto.randomBytes(24).toString('base64url'),pw=await digest(f.pw,salt),recovery=crypto.randomBytes(24).toString('base64url'),id=crypto.randomUUID();
 try{await pool.query('INSERT INTO khar_users(id,username,uname,salt,pw,recovery) VALUES($1,$2,$3,$4,$5,$6)',[id,f.u,f.lower,salt,pw,H(recovery)]);}catch(e){if(e.code==='23505')fail(409,'Esse usuário já existe.');throw e;}
 respond(res,201,{ok:true,username:f.u,recoveryCode:recovery},await newSession(req,id));return true;}
 if(url==='/api/auth/login'){limit(req,'login',12,900000);const f=fields(await body(req));const q=await pool.query('SELECT id,username,salt,pw FROM khar_users WHERE uname=$1',[f.lower]);const p=await digest(f.pw,q.rows[0]?.salt||'fallback-salt');if(!q.rows.length||!crypto.timingSafeEqual(Buffer.from(p,'hex'),Buffer.from(q.rows[0].pw,'hex')))fail(401,'Usuário ou senha incorretos.');respond(res,200,{ok:true,username:q.rows[0].username},await newSession(req,q.rows[0].id));return true;}
 if(url==='/api/auth/logout'){limit(req,'logout',30,900000);await body(req);const t=sess(req);if(t)await pool.query('DELETE FROM khar_sessions WHERE token=$1',[H(t)]);respond(res,200,{ok:true},{'Set-Cookie':cookie(req,'',0)});return true;}
 if(url==='/api/auth/recover'){limit(req,'recover',6,3600000);const d=await body(req),f=fields(d),code=String(d.recoveryCode||'');if(!/^[A-Za-z0-9_-]{32}$/.test(code))fail(422,'Código inválido.');const q=await pool.query('SELECT id,recovery FROM khar_users WHERE uname=$1',[f.lower]);if(!q.rows.length||!crypto.timingSafeEqual(Buffer.from(q.rows[0].recovery,'hex'),Buffer.from(H(code),'hex')))fail(401,'Usuário ou código incorretos.');
 const salt=crypto.randomBytes(24).toString('base64url'),pw=await digest(f.pw,salt),nextCode=crypto.randomBytes(24).toString('base64url');
 const c=await pool.connect();try{await c.query('BEGIN');await c.query('UPDATE khar_users SET salt=$1,pw=$2,recovery=$3 WHERE id=$4',[salt,pw,H(nextCode),q.rows[0].id]);await c.query('DELETE FROM khar_sessions WHERE user_id=$1',[q.rows[0].id]);await c.query('COMMIT');}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 respond(res,200,{ok:true,recoveryCode:nextCode},{'Set-Cookie':cookie(req,'',0)});return true;}
 if(url==='/api/auth/delete'){limit(req,'delete',5,3600000);const d=await body(req),u=await logged(req);if(!u)fail(401,'Faça login.');if(d.confirm!=='EXCLUIR')fail(422,'Digite EXCLUIR.');if(typeof d.password!=='string'||d.password.length>128)fail(422,'Senha inválida.');const q=await pool.query('SELECT salt,pw FROM khar_users WHERE id=$1',[u.id]);const p=await digest(d.password,q.rows[0].salt);if(!crypto.timingSafeEqual(Buffer.from(p,'hex'),Buffer.from(q.rows[0].pw,'hex')))fail(401,'Senha incorreta.');await pool.query('DELETE FROM khar_users WHERE id=$1',[u.id]);respond(res,200,{ok:true},{'Set-Cookie':cookie(req,'',0)});return true;}
 fail(404,'Não encontrado.');
 }catch(e){if(!e.status)console.error('Khar Auth:',e.code||e.name||'error');respond(res,e.status||503,{error:e.status?e.message:'Falha temporária no cadastro.'});return true;}}
module.exports={handle,enabled};
