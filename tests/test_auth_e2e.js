'use strict';
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const PORT=17865+crypto.randomInt(1000);
const ORIGIN=`http://127.0.0.1:${PORT}`;
const username='tst_'+crypto.randomBytes(6).toString('hex');
const password='Test_Warrior_2026_'+crypto.randomBytes(5).toString('hex');
const newPassword='Test_New_Arena_2026_'+crypto.randomBytes(5).toString('hex');
async function call(route,method='GET',obj,cookie){const headers={};if(method==='POST'){headers['Content-Type']='application/json';headers.Origin=ORIGIN;headers['X-Kt-Csrf']='1';}if(cookie)headers.Cookie=cookie;const r=await fetch(ORIGIN+'/api/auth/'+route,{method,headers,body:method==='POST'?JSON.stringify(obj):undefined});const data=await r.json();return {status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0]||''};}
async function waitReady(){for(let i=0;i<80;i++){await new Promise(r=>setTimeout(r,400));try{const r=await call('status');if(r.data.available)return true;}catch{}}throw Error('Neon não respondeu ao teste de autenticação');}
(async()=>{
if(!process.env.ACCOUNTS_DATABASE_URL)throw Error('ACCOUNTS_DATABASE_URL ausente para testes');
const child=spawn(process.execPath,['server.js'],{cwd:require('node:path').resolve(__dirname,'..'),env:{...process.env,PORT:String(PORT),HOST:'127.0.0.1',TRUST_PROXY:'false',ENABLE_ACCOUNT_REGISTRATION:'true'},stdio:['ignore','ignore','pipe']});let childError='';child.stderr.on('data',x=>{childError+=x.toString();});let cookie='';let recovery;
try{
 await waitReady();
 let r=await call('register','POST',{username,password,adult:true,privacy_accepted:true});assert.equal(r.status,201,JSON.stringify(r.data));cookie=r.cookie;recovery=r.data.recovery_code;assert.ok(recovery&&recovery.length>32);assert.ok(cookie.startsWith('kt_auth='));
 r=await call('me','GET',undefined,cookie);assert.equal(r.data.user.username,username);
 r=await call('register','POST',{username,password,adult:true,privacy_accepted:true});assert.equal(r.status,409);
 r=await call('logout','POST',{},cookie);assert.equal(r.status,200);
 r=await call('login','POST',{username,password:'Incorrect_password_12345'});assert.equal(r.status,401);
 r=await call('login','POST',{username,password});assert.equal(r.status,200);cookie=r.cookie;
 r=await call('recover','POST',{username,password:newPassword,recovery_code:recovery});assert.equal(r.status,200);recovery=r.data.recovery_code;
 r=await call('me','GET',undefined,cookie);assert.equal(r.data.authenticated,false);
 r=await call('login','POST',{username,password});assert.equal(r.status,401);
 r=await call('login','POST',{username,password:newPassword});assert.equal(r.status,200);cookie=r.cookie;
 r=await call('delete','POST',{password:newPassword,confirm:'EXCLUIR'},cookie);assert.equal(r.status,200);
 r=await call('me','GET',undefined,cookie);assert.equal(r.data.authenticated,false);
 console.log('Khar Tall: 12 verificações de autenticação concluídas, conta temporária excluída.');
}catch(e){console.error('Falha no teste de contas:',e.message);if(childError)console.error('Servidor:',childError.replace(/password\S*/gi,'[secret]').slice(-900));process.exitCode=1;
 }finally{child.kill('SIGTERM');}
})().catch(e=>{console.error(e.message);process.exitCode=1;});