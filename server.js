'use strict';
/* Khar Tall V3: servidor autoritativo e sincronização via Server-Sent Events.
   Node.js >=22.13; PostgreSQL em produção e SQLite local. Servir somente atrás de HTTPS quando exposto à internet. */
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {URL}=require('node:url');
const {RoomStore}=require('./room-store.js');
const {closePool}=require('./database.js');
const {clientIP}=require('./request-security.js');
const {sendStatic}=require('./static-files.js');
const store=new RoomStore();
const VERSION=require('./package.json').version;
let ready=false,ticking=false,timer,cleanupTimer;
const {KharTall}=require('./engine.js');
const auth=require('./auth-server.js').createAuth();
const commerce=require('./store-server.js').createCommerce({auth});
const ROOT=__dirname;
const PORT=Number(process.env.PORT||8765);
const HOST=process.env.HOST||'127.0.0.1';
const TRUST_PROXY=process.env.TRUST_PROXY==='true';
const MAX_BODY=8192, TIME=60000, GRACE=7000;
const listeners=new Map();const attempts=new Map();
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const randomToken=()=>crypto.randomBytes(32).toString('base64url');
function code(){const ALPHA='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<7;i++)s+=ALPHA[crypto.randomInt(ALPHA.length)];return s;}
function cookieName(roomCode){return 'kt_'+roomCode;}
function cookies(req){const values={};(req.headers.cookie||'').split(';').forEach(item=>{const i=item.indexOf('=');if(i>0)values[item.slice(0,i).trim()]=item.slice(i+1).trim()});return values;}
function sideFor(req,room){if(req.ktUser){if(room.red_user_id===req.ktUser.id)return 0;if(room.blue_user_id===req.ktUser.id)return 1;}const token=cookies(req)[cookieName(room.code)];if(typeof token!=='string'||token.length<35||token.length>60)return null;
 const t=sha(token);if(crypto.timingSafeEqual(Buffer.from(t),Buffer.from(room.red_hash)))return 0;
 if(room.blue_hash&&crypto.timingSafeEqual(Buffer.from(t),Buffer.from(room.blue_hash)))return 1;return null;}
function fail(status,message){const e=new Error(message);e.status=status;throw e;}
function isTLS(req){return !!req.socket.encrypted||(TRUST_PROXY&&req.headers['x-forwarded-proto']==='https');}
function roomCookie(req,c,t){return `${cookieName(c)}=${t}; Path=/; HttpOnly; SameSite=Lax; Max-Age=1209600${isTLS(req)?'; Secure':''}`;}
function head(res){res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');}
function json(res,status,body,headers={}){head(res);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(body));}
function checkOrigin(req){const origin=req.headers.origin;const host=req.headers.host;if(origin){let u;try{u=new URL(origin);}catch{fail(403,'Origem não permitida.');}if(u.host!==host)fail(403,'Origem não permitida.');}else if(req.headers['sec-fetch-site']==='cross-site')fail(403,'Requisição de outra origem não permitida.');}
function rate(req,key,limit,windowMs){const ip=clientIP(req),k=ip+':'+key;const now=Date.now(),a=attempts.get(k)||[];let fresh=a.filter(t=>t>now-windowMs);if(fresh.length>=limit)fail(429,'Muitas tentativas. Aguarde e tente novamente.');fresh.push(now);attempts.set(k,fresh);if(attempts.size>10000)for(const [k,v] of attempts)if(v.every(t=>t<now-3600000))attempts.delete(k);}
async function body(req){if(!String(req.headers['content-type']||'').startsWith('application/json'))fail(415,'Envie JSON.');let chunks=[],n=0;for await(const b of req){n+=b.length;if(n>MAX_BODY)fail(413,'Requisição muito grande.');chunks.push(b);}if(!n)fail(400,'Dados ausentes.');let value;try{value=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{fail(400,'JSON inválido.');}if(!value||typeof value!=='object'||Array.isArray(value))fail(400,'Dados inválidos.');return value;}
function broadcast(code,revision){for(const res of listeners.get(code)||[])try{res.write(`event: update\ndata: ${JSON.stringify({revision})}\n\n`);}catch{listeners.get(code)?.delete(res);}}
function sanitize(s,side){const x=structuredClone(s);x.traps=x.traps.filter(t=>t.side===side);return x;}
async function publicRoom(room,side){const players=await Promise.all([room.red_user_id,room.blue_user_id].map(id=>commerce.store.publicCosmetic(id).catch(()=>({username:'',skin:'classic'}))));return {players,code:room.code,side,hasOpponent:!!room.blue_hash,status:room.status,revision:room.revision,deadlineMs:room.deadline_ms,serverMs:Date.now(),persistent:store.persistent,state:sanitize(JSON.parse(room.state_json),side),lastEvent:room.last_event?JSON.parse(room.last_event):null};}
function snapshotAfter(game,before,action,side){const next=game.s;
 const lost=before.pieces.filter(p=>!next.pieces.some(q=>q.id===p.id));
 const wounded=before.pieces.filter(p=>p.type==='king').filter(p=>{const q=next.pieces.find(q=>q.id===p.id);return q&&q.hp<p.hp;}).map(p=>p.side);
 const actor=before.pieces.find(p=>p.id===action.input?.p),after=next.pieces.find(p=>p.id===actor?.id),kind=action.input?.kind||null;
 const tech=actor?.type==='king'&&kind?.startsWith('copy')?actor.copy?.type||null:actor?.type==='king'&&['mark','execute'].includes(kind)?'scout':actor?.type||null;
 const length=actor?Math.max(Math.abs(actor.x-action.input.x),Math.abs(actor.y-action.input.y)):0;
 let impactDelay=150;
 if(['mark','execute'].includes(kind))impactDelay=Math.max(420,length*120);
 else if(['wolfHit','copyWolfHit'].includes(kind))impactDelay=310;
 else if(['charge','copyCharge','fieldCharge'].includes(kind))impactDelay=360;
 else if(kind==='smash')impactDelay=340;
 else if(['hit','copyHit'].includes(kind)){
  if(actor?.type==='archer'||tech==='archer')impactDelay=Math.max(400,length*245);
  else if(actor?.type==='soldier'||tech==='soldier')impactDelay=250;
 }
 const trapTriggered=before.traps.some(t=>!next.traps.some(q=>q.side===t.side&&q.x===t.x&&q.y===t.y));
 const attackBlocked=['wolfHit','copyWolfHit'].includes(kind)&&trapTriggered&&before.traps.some(t=>t.side!==side&&t.x===action.input.x&&t.y===action.input.y);
 return {kind:action.op,actionKind:kind,actorSide:side,pieceType:actor?.type||null,tech,target:{x:action.input?.x,y:action.input?.y},
  lost:lost.map(p=>({type:p.type,side:p.side,original:p.original})),wounded,winner:next.phase==='over'?next.winner:null,phase:next.phase,at:Date.now(),
  impactDelay,trapTriggered,attackBlocked,chargeSteps:actor&&after?Math.max(Math.abs(after.x-actor.x),Math.abs(after.y-actor.y)):0};
}
async function updatedRoom(room,game,event,deadlineOverride){const n=Date.now();let deadline=deadlineOverride===undefined?(game.s.phase==='over'?null:(room.deadline_ms||n+TIME)):deadlineOverride;
 const result=await store.mutate(room.code,current=>{if(current.revision!==room.revision)fail(409,'A partida mudou. Atualize e tente novamente.');current.state_json=JSON.stringify(game.snapshot());current.deadline_ms=deadline;current.status=game.s.phase==='over'?'over':'active';current.last_event=event?JSON.stringify(event):null;return true;});
 const next=result.room;broadcast(room.code,next.revision);return next;}
async function checkExpiration(room){if(!room||room.status!=='active'||!room.deadline_ms||Date.now()<room.deadline_ms)return room;
 const game=KharTall.restore(JSON.parse(room.state_json)),before=game.snapshot();let note='';
 if(game.s.phase==='setup'){note='Prazo de preparação esgotado; armadilhas não posicionadas foram perdidas.';game.note(note);game.finishSetup();}
 else if(game.s.phase==='play'){note='Tempo esgotado; turno perdido.';if(game.s.fieldPending){game.fieldChoice({kind:'skip'});}else game.pass(note);}
 else return room;
 const deadline=game.s.phase==='over'?null:Date.now()+TIME+(game.s.phase==='play'&&before.phase==='setup'?GRACE:0);
 return updatedRoom(room,game,{kind:'timeout',actionKind:'timeout',actorSide:before.phase==='setup'?before.setupSide:before.side,phase:game.s.phase,at:Date.now()},deadline);
}
const STATIC=new Map([['/audio.js','audio.js'],['/game-ui.js','game-ui.js'],['/','index.html'],['/index.html','index.html'],['/online','online.html'],['/online.html','online.html'],['/online.js','online.js'],['/online.css','online.css'],['/style.css','style.css'],['/account.css','account.css'],['/engine.js','engine.js'],['/app.js','app.js'],['/account.js','account.js'],['/privacidade.html','privacidade.html'],['/conta','conta.html'],['/conta.html','conta.html'],['/auth-client.js','auth-client.js']]);
for(const [route,file]of Object.entries({'/loja':'loja.html','/painel-loja':'painel-loja.html','/instalar':'instalar.html','/store.css':'store.css','/store-client.js':'store-client.js','/store-admin.js':'store-admin.js','/app-shell.css':'app-shell.css','/app-shell.js':'app-shell.js','/install.js':'install.js','/manifest.webmanifest':'manifest.webmanifest','/offline-assets.json':'offline-assets.json','/sw.js':'sw.js','/icons/icon-192.png':'icons/icon-192.png','/icons/icon-512.png':'icons/icon-512.png','/.well-known/assetlinks.json':'assetlinks.json','/baixar/khar-tall.apk':'downloads/khar-tall-3.6.1.apk','/baixar/android.json':'downloads/khar-tall-3.6.1.json'}))STATIC.set(route,file);
for(const [route,file]of Object.entries({'/portal':'portal.html','/portal/':'portal.html','/jogar':'index.html','/skin-catalog.js':'skin-catalog.js','/skins.js':'skins.js','/skins.css':'skins.css','/portal.css':'portal.css','/portal.js':'portal.js','/portal-nav.js':'portal-nav.js','/portal-nav.css':'portal-nav.css'}))STATIC.set(route,file);
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.png':'image/png','.wav':'audio/wav','.ico':'image/x-icon','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.apk':'application/vnd.android.package-archive'};
function serve(req,res,pathname){let rel=STATIC.get(pathname);if(!rel&&/^\/assets\/[A-Za-z0-9_.-]+$/.test(pathname))rel=pathname.slice(1);if(!rel)fail(404,'Página não encontrada.');
 const file=path.join(ROOT,rel);if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())fail(404,'Arquivo não encontrado.');
 const typ=TYPES[path.extname(file)]||'application/octet-stream';head(res);sendStatic(req,res,file,rel,typ);}
async function handler(req,res){try{const u=new URL(req.url,'http://local'),pathname=u.pathname;
 if(await auth.process(req,res,pathname))return;
 if(await commerce.process(req,res,pathname))return;
 if(pathname.startsWith('/api/online/'))req.ktUser=await auth.current(req);
 if(req.method==='GET'&&pathname==='/api/online/recent'){const u=req.ktUser;if(!u)return json(res,200,{authenticated:false,rooms:[]});const rooms=(await store.recent(u.id)).map(r=>({code:r.code,status:r.status,side:r.red_user_id===u.id?0:1,updatedMs:r.updated_ms,url:'/online?room='+r.code}));return json(res,200,{authenticated:true,username:u.username,rooms});}
 if((req.method==='GET'||req.method==='HEAD')&&pathname==='/api/health')return json(res,ready?200:503,{service:'khar-tall',version:VERSION,online:ready,status:ready?'ready':'starting',authentication:auth.status().ready,registration_enabled:auth.status().registration_enabled,persistent:store.persistent,room_retention_days:30});
 if(!ready)fail(503,'O jogo está iniciando. Tente novamente em instantes.');
 if(pathname==='/api/accounts')fail(410,'Use Minha conta para criar sua conta de jogador.');
 if(req.method==='POST'){checkOrigin(req);
  if(pathname==='/api/online/rooms'){rate(req,'create',30,3600000);await body(req);let c;do{c=code();}while(await store.get(c));const t=randomToken(),s=new KharTall({mode:'local'}).snapshot(),now=Date.now();await store.create(c,sha(t),req.ktUser?.id||null,s);return json(res,201,{code:c,side:0,url:'/online?room='+c},{'Set-Cookie':roomCookie(req,c,t)});}
  let join=pathname.match(/^\/api\/online\/rooms\/([A-Z2-9]{7})\/join$/);
  if(join){rate(req,'join',80,3600000);await body(req);const t=randomToken();let side=1;
   const result=await store.mutate(join[1],r=>{const existing=sideFor(req,r);if(existing!==null){side=existing;return false;}if(r.blue_hash||r.status!=='waiting')fail(409,'Sala já possui dois jogadores.');r.blue_hash=sha(t);r.blue_user_id=req.ktUser?.id||null;r.status='active';r.deadline_ms=Date.now()+TIME;return true;});
   if(result.changed)broadcast(result.room.code,result.room.revision);
   return json(res,200,{code:join[1],side,url:'/online?room='+join[1]},result.changed?{'Set-Cookie':roomCookie(req,join[1],t)}:{});}
  const actionMatch=pathname.match(/^\/api\/online\/rooms\/([A-Z2-9]{7})\/action$/);
  if(actionMatch){rate(req,'actions',240,60000);const a=await body(req);if(!a||typeof a.op!=='string')fail(400,'Ação inválida.');let r=await store.get(actionMatch[1]);if(!r)fail(404,'Sala não encontrada.');const side=sideFor(req,r);if(side===null)fail(403,'Você não participa desta sala.');r=await checkExpiration(r);if(r.status!=='active')fail(409,'A partida ainda não começou ou já terminou.');
   if('revision' in a&&(!Number.isInteger(a.revision)||a.revision!==r.revision))fail(409,'A partida mudou. Confira a posição e tente novamente.');const game=KharTall.restore(JSON.parse(r.state_json)),before=game.snapshot();if(game.s.phase==='over')fail(409,'Partida encerrada.');let accepted=false;
   switch(a.op){
    case 'trap': if(!Number.isInteger(a.x)||!Number.isInteger(a.y)||a.x<0||a.y<0||a.x>9||a.y>9)fail(422,'Casa de armadilha inválida.');if(game.s.phase!=='setup'||game.s.setupSide!==side)fail(403,'Não é sua preparação.');accepted=game.placeTrap(side,Number(a.x),Number(a.y));break;
    case 'ready': if(game.s.phase!=='setup'||game.s.setupSide!==side)fail(403,'Não é sua preparação.');accepted=game.finishSetup();break;
    case 'move': if(game.s.phase!=='play'||game.s.side!==side)fail(403,'Não é seu turno.');if(!a.input||typeof a.input!=='object')fail(400,'Ação ausente.');
     if(!Number.isInteger(a.input.p)||!Number.isInteger(a.input.x)||!Number.isInteger(a.input.y)||typeof a.input.kind!=='string'||a.input.kind.length>35)fail(422,'Jogada com parâmetros inválidos.');
     if('target' in a.input&&!Number.isInteger(a.input.target))fail(422,'Alvo inválido.');
     if('targets' in a.input&&(!Array.isArray(a.input.targets)||a.input.targets.length>3||!a.input.targets.every(Number.isInteger)))fail(422,'Lista de alvos inválida.');
     if('orient' in a.input&&a.input.orient!==null&&!['up','down','left','right'].includes(a.input.orient))fail(422,'Orientação inválida.');
     if('advance' in a.input&&typeof a.input.advance!=='boolean')fail(422,'Avanço inválido.');
     accepted=game.act(a.input);break;
    case 'field': if(game.s.phase!=='play'||game.s.side!==side)fail(403,'Não é seu turno.');if(!a.input||typeof a.input!=='object')fail(400,'Escolha ausente.');
     if(!['skip','evolve','healKing','summon','transform','reunion'].includes(a.input.kind))fail(422,'Efeito desconhecido.');
     for(const key of ['x','y','targetId'])if(key in a.input&&!Number.isInteger(a.input[key]))fail(422,'Parâmetro de campo inválido.');
     if('type' in a.input&&typeof a.input.type!=='string')fail(422,'Tipo de peça inválido.');
     accepted=game.fieldChoice(a.input);break;
    case 'pass': if(game.s.phase!=='play'||game.s.side!==side)fail(403,'Não é seu turno.');accepted=game.pass('Jogador passou o turno online.');break;
    default:fail(400,'Operação não reconhecida.');
   }
   if(!accepted)fail(422,'Ação proibida pelas regras.');
   const turnChanged=before.turnSerial!==game.s.turnSerial||before.setupSide!==game.s.setupSide||before.phase!==game.s.phase;
   const nextDeadline=game.s.phase==='over'?null:turnChanged?Date.now()+TIME+(before.phase==='setup'&&game.s.phase==='play'?GRACE:0):r.deadline_ms;
   const n=await updatedRoom(r,game,snapshotAfter(game,before,a,side),nextDeadline);
   return json(res,200,{ok:true,revision:n.revision});
  }
 }
 const state=pathname.match(/^\/api\/online\/rooms\/([A-Z2-9]{7})$/);
 if(req.method==='GET'&&state){let r=await store.get(state[1]);if(!r)fail(404,'Sala não encontrada.');const side=sideFor(req,r);if(side===null)fail(403,'Você precisa criar a sala ou entrar com o convite neste navegador.');r=await checkExpiration(r);return json(res,200,await publicRoom(r,side));}
 const events=pathname.match(/^\/api\/online\/rooms\/([A-Z2-9]{7})\/events$/);
 if(req.method==='GET'&&events){let r=await store.get(events[1]);if(!r)fail(404,'Sala não encontrada.');if(sideFor(req,r)===null)fail(403,'Acesso não autorizado.');head(res);res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-store, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write('retry: 1500\n\n');let set=listeners.get(r.code);if(!set){set=new Set();listeners.set(r.code,set);}if(set.size>=10){res.end();return;}set.add(res);const ping=setInterval(()=>{try{res.write(': ping\n\n');}catch{}},18000);req.on('close',()=>{clearInterval(ping);set.delete(res);if(!set.size)listeners.delete(r.code);});return;}
 if(req.method==='GET'||req.method==='HEAD')return serve(req,res,pathname);
 fail(404,'Operação não encontrada.');
 }catch(e){if(!res.headersSent)json(res,e.status||500,{error:e.status?e.message:'Falha interna do servidor.'});else res.end();if(!e.status)console.error('Erro:',e.stack||e);}}
const server=http.createServer((req,res)=>{handler(req,res).catch(()=>res.destroy());});
server.requestTimeout=20000;server.headersTimeout=25000;
async function start(){await auth.init();await store.init();ready=true;
 timer=setInterval(async()=>{if(ticking||listeners.size===0)return;ticking=true;try{for(const r of await store.expired(Date.now())){const room=await store.get(r.code);if(room)await checkExpiration(room);}}catch(e){if(e.status!==409)console.error('Prazo:',e.code||e.name);}finally{ticking=false;}},1000);timer.unref();
 cleanupTimer=setInterval(()=>Promise.all([store.prune(),auth.prune()]).catch(e=>console.error('Retenção:',e.code||e.name)),3600000);cleanupTimer.unref();
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(PORT,HOST,resolve);});console.log(`Khar Tall ${VERSION}: port ${PORT}; matches ${store.persistent?'PostgreSQL':'SQLite local'}`);return server;}
async function stop(){ready=false;clearInterval(timer);clearInterval(cleanupTimer);for(const set of listeners.values())for(const res of set)res.end();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await store.close();commerce.close();await closePool();}
if(require.main===module){start().catch(e=>{console.error('Startup failed:',e.code||e.name);process.exitCode=1;});let stopping=false;for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{if(stopping)return;stopping=true;const deadline=setTimeout(()=>process.exit(1),9000);deadline.unref();stop().then(()=>process.exit(0)).catch(()=>process.exit(1));});}
module.exports={server,store,start,stop,checkExpiration,publicRoom};

