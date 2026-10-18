'use strict';
const assert=require('node:assert/strict');
const {KharTall}=require('../engine.js');

function fixture(dx=1,dy=0,distance=3,copied=false){
 const game=new KharTall({random:()=>0}),king=game.king(0),guardian=game.guardian(0),enemyKing=game.king(1),target=game.s.pieces.find(p=>p.side===1&&p.type==='soldier');
 const actor=copied?king:guardian;actor.x=4;actor.y=4;
 target.x=actor.x+dx*distance;target.y=actor.y+dy*distance;
 enemyKing.x=9;enemyKing.y=0;
 if(copied){guardian.x=0;guardian.y=8;game.giveCopy(king,'guardianArea');}
 else{king.x=0;king.y=9;}
 game.s.pieces=[actor,copied?guardian:king,enemyKing,target];game.s.phase='play';game.s.side=0;game.s.fields=[];
 return {game,actor,target,kind:copied?'copyArea':'area'};
}
function input(f,targets){return {p:f.actor.id,kind:f.kind,x:f.target.x,y:f.target.y,target:f.target.id,tech:'guardianArea',...(targets===undefined?{}:{targets})};}
for(const copied of [false,true])for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]])for(const distance of [1,3,4]){
 const f=fixture(dx,dy,distance,copied),before=f.game.snapshot(),allowed=distance<=3;
 assert.equal(f.game.actionsFor(f.actor.id).some(a=>a.kind===f.kind&&a.target===f.target.id),allowed,`${f.kind}: ${distance} casas na direção ${dx},${dy}`);
 assert.equal(f.game.act(input(f)),allowed);
 if(allowed){assert.equal(f.game.piece(f.target.id),null);assert.deepEqual([f.actor.x,f.actor.y],[4,4]);if(copied)assert.equal(f.actor.copy,null);}
 else assert.deepEqual(f.game.snapshot(),before,'Alvo a quatro casas não altera a partida nem consome a cópia');
}
for(const copied of [false,true]){
 const f=fixture(1,0,3,copied),blocker={...f.target,id:999,side:0,x:5,y:4};f.game.s.pieces.push(blocker);
 assert.equal(f.game.act(input(f)),false,'Aliados no caminho continuam protegendo o alvo');
}
function groupFixture(copied){
 const f=fixture(1,0,3,copied);
 f.extras=[[4,1],[1,4],[4,7],[8,5]].map(([x,y],i)=>({...f.target,id:1000+i,x,y}));
 f.game.s.pieces.push(...f.extras);return f;
}
function groupInput(f){return input(f,f.extras.slice(0,3).map(p=>p.id));}
function checkGroup(pieces,f){
 assert.equal(pieces.some(p=>p.id===f.target.id),false,'O alvo inicial sempre está incluído');
 assert.equal(pieces.some(p=>p.id===f.extras[0].id),false);
 assert.equal(pieces.some(p=>p.id===f.extras[1].id),false);
 assert.equal(pieces.some(p=>p.id===f.extras[2].id),true,'No máximo três inimigos, mesmo omitindo o alvo inicial da lista');
 assert.equal(pieces.some(p=>p.id===f.extras[3].id),true,'Uma lista enviada manualmente não atinge a quarta casa');
}
for(const copied of [false,true]){
 const f=groupFixture(copied);assert.equal(f.game.act(groupInput(f)),true);checkGroup(f.game.s.pieces,f);
}
function distantInput(f){return input(f,[f.extras[3].id,f.extras[0].id,f.extras[0].id]);}
function checkDistant(pieces,f){
 assert.equal(pieces.some(p=>p.id===f.target.id),false);
 assert.equal(pieces.some(p=>p.id===f.extras[0].id),false);
 for(const p of f.extras.slice(1))assert.equal(pieces.some(q=>q.id===p.id),true,'Duplicatas e alvos distantes não ampliam o ataque');
}
for(const copied of [false,true]){
 const f=groupFixture(copied);assert.equal(f.game.act(distantInput(f)),true);checkDistant(f.game.s.pieces,f);
}
async function online(){
 assert.equal(process.env.NODE_ENV,'test','Fixtures online somente no servidor de teste');
 const base=process.env.KT_URL,{RoomStore}=require('../room-store.js'),store=new RoomStore();await store.init();
 const api=async(route,data,cookie='')=>{const r=await fetch(base+route,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json',Origin:base}:{}),...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 try{for(const copied of [false,true]){
  const created=await api('/api/online/rooms',{});assert.equal(created.status,201);const code=created.data.code,cookie=created.cookie;assert.equal((await api('/api/online/rooms/'+code+'/join',{})).status,200);
  async function set(f){await store.mutate(code,r=>{r.state_json=JSON.stringify(f.game.snapshot());r.status='active';r.deadline_ms=Date.now()+60000;return true;});return (await api('/api/online/rooms/'+code,undefined,cookie)).data;}
  for(const [dx,dy]of [[1,0],[-1,-1]])for(const distance of [4,3]){
   const f=fixture(dx,dy,distance,copied),before=await set(f);
   const response=await api('/api/online/rooms/'+code+'/action',{op:'move',revision:before.revision,input:input(f)},cookie);assert.equal(response.status,distance===3?200:422);
   const after=(await api('/api/online/rooms/'+code,undefined,cookie)).data;
   if(distance===4){assert.deepEqual(after.state,before.state);assert.equal(after.revision,before.revision);}
   else{assert.equal(after.state.pieces.some(p=>p.id===f.target.id),false);if(copied)assert.equal(after.state.pieces.find(p=>p.id===f.actor.id).copy,null);}
  }
  for(const variant of ['limit','distant','too_many']){
   const f=groupFixture(copied),before=await set(f),action=variant==='limit'?groupInput(f):variant==='distant'?distantInput(f):input(f,f.extras.map(p=>p.id));
   assert.equal((await api('/api/online/rooms/'+code+'/action',{op:'move',revision:before.revision,input:action},cookie)).status,variant==='too_many'?422:200);
   const after=(await api('/api/online/rooms/'+code,undefined,cookie)).data;
   if(variant==='limit')checkGroup(after.state.pieces,f);
   else if(variant==='distant')checkDistant(after.state.pieces,f);
   else{assert.deepEqual(after.state,before.state);assert.equal(after.revision,before.revision);}
  }
 }}finally{await store.close();await require('../database.js').closePool();}
}
(async()=>{if(process.env.KT_URL)await online();console.log('Guardian area OK: radius 3 in eight directions, rejection at 4, royal copy, ally blocking, three-target limit and authoritative HTTP validation.');})().catch(e=>{console.error(e.stack);process.exitCode=1;});
