'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'khar-release-'));
const port=22000+crypto.randomInt(10000),origin='http://127.0.0.1:'+port;
const env={...process.env,HOST:'127.0.0.1',PORT:String(port),NODE_ENV:'test',TRUST_PROXY:'false',DATABASE_PATH:path.join(temp,'rooms.sqlite3'),ENABLE_ACCOUNT_REGISTRATION:process.env.ACCOUNTS_DATABASE_URL?'true':'false'};
let child;
async function script(name,extra={}) {
  await new Promise((resolve,reject)=>{const p=spawn(process.execPath,[path.join(__dirname,name)],{cwd:root,env:{...env,...extra},stdio:'inherit'});
    const timer=setTimeout(()=>{p.kill('SIGTERM');reject(Error(name+' timed out'));},90000);
    p.once('error',reject);p.once('exit',code=>{clearTimeout(timer);code===0?resolve():reject(Error(name+' failed'));});});
}
async function api(route,method='GET',data,cookie='') {
  const r=await fetch(origin+route,{method,headers:{...(data!==undefined?{'Content-Type':'application/json',Origin:origin,'X-Kt-Csrf':'1'}:{}),...(cookie?{Cookie:cookie}:{})},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(15000)});
  return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]||''};
}
async function boot(){
  let output='';child=spawn(process.execPath,['server.js'],{cwd:root,env,stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',x=>{output+=x;});child.stderr.on('data',x=>{output+=x;});
  for(let i=0;i<100;i++){if(child.exitCode!==null)throw Error('Server startup: '+output.slice(-800));try{const r=await api('/api/health');if(r.status===200)return;}catch{}await new Promise(r=>setTimeout(r,150));}
  throw Error('Server did not start: '+output.slice(-800));
}
async function halt(){if(!child||child.exitCode!==null)return;const p=child;await new Promise(resolve=>{p.once('exit',resolve);p.kill('SIGTERM');});child=null;}
(async()=>{
 try{
  await script('test_audio.js');await script('test_rules.js');await boot();await script('test_multiplayer.js',{KT_URL:origin});
  for(const route of ['/server.js','/.env','/data/khar_tall.sqlite3','/database.js'])assert.equal((await api(route)).status,404);
  assert.equal((await api('/api/online/rooms','POST',null)).status,400);
  assert.equal((await api('/api/accounts','POST',{})).status,410);
  let r=await api('/api/online/rooms','POST',{});assert.equal(r.status,201);const code=r.data.code,cookie=r.cookie;
  r=await api('/api/online/rooms/'+code+'/join','POST',{});assert.equal(r.status,200);
  const before=(await api('/api/online/rooms/'+code,'GET',undefined,cookie)).data;
  r=await api('/api/online/rooms/'+code+'/action','POST',{op:'trap',x:4,y:4,revision:before.revision-1},cookie);assert.equal(r.status,409);
  const pair=await Promise.all([1,2].map(()=>api('/api/online/rooms/'+code+'/action','POST',{op:'trap',x:4,y:4,revision:before.revision},cookie)));
  assert.deepEqual(pair.map(x=>x.status).sort(),[200,409]);
  const snapshot=(await api('/api/online/rooms/'+code,'GET',undefined,cookie)).data;
  await halt();await boot();
  const after=(await api('/api/online/rooms/'+code,'GET',undefined,cookie)).data;
  assert.deepEqual(after.state,snapshot.state);assert.equal(after.revision,snapshot.revision);assert.equal(after.deadlineMs,snapshot.deadlineMs);
  console.log('Persistence OK: server restart restores room, secret traps, revision, cookies and original deadline; concurrent replay rejected.');
  if(env.ACCOUNTS_DATABASE_URL){
    await script('test_auth_e2e.js');
    const username='rel_'+crypto.randomBytes(6).toString('hex'),password='Commander_'+crypto.randomBytes(12).toString('hex');
    const account=await api('/api/auth/register','POST',{username,password,adult:true,privacy_accepted:true});assert.equal(account.status,201,JSON.stringify(account.data));
    const room=await api('/api/online/rooms','POST',{},account.cookie);assert.equal(room.status,201);
    const login=await api('/api/auth/login','POST',{username,password});assert.equal(login.status,200);
    const rooms=await api('/api/online/recent','GET',undefined,login.cookie);assert.ok(rooms.data.rooms.some(r=>r.code===room.data.code));
    const resumed=await api('/api/online/rooms/'+room.data.code,'GET',undefined,login.cookie);assert.equal(resumed.status,200);assert.equal(resumed.data.side,0);
    assert.equal((await api('/api/online/rooms/'+room.data.code+'/join','POST',{},login.cookie)).data.side,0);
    const deleted=await api('/api/auth/delete','POST',{password,confirm:'EXCLUIR'},login.cookie);assert.equal(deleted.status,200);
    assert.equal((await api('/api/online/rooms/'+room.data.code,'GET',undefined,login.cookie)).status,403);
    assert.equal((await api('/api/online/rooms/'+room.data.code,'GET',undefined,room.cookie)).status,200);
    console.log('Accounts OK: new-device login resumes owned room; deletion revokes account access without destroying opponent/guest access.');
  }
  console.log('All release checks passed.');
 }finally{await halt();fs.rmSync(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
