'use strict';
const assert=require('node:assert/strict');
const {KharTall}=require('../engine.js');
function fixture(dx=1,dy=0,distance=5,copied=false){
 const game=new KharTall({random:()=>0}),king=game.king(0),guardian=game.guardian(0),enemyKing=game.king(1),target=game.s.pieces.find(p=>p.side===1&&p.type==='soldier');
 const actor=copied?king:guardian;actor.x=dx<0?9:dx>0?0:4;actor.y=dy<0?9:dy>0?0:4;
 target.x=actor.x+dx*distance;target.y=actor.y+dy*distance;
 enemyKing.x=8;enemyKing.y=0;
 if(!copied){king.x=1;king.y=9;}
 else{guardian.x=1;guardian.y=8;game.giveCopy(king,'guardianLine');}
 game.s.pieces=[actor,...(copied?[guardian]:[king]),enemyKing,target];game.s.phase='play';game.s.side=0;game.s.fields=[];
 return {game,actor,target,kind:copied?'copyLine':'line'};
}
function input(f){return {p:f.actor.id,kind:f.kind,x:f.target.x,y:f.target.y,target:f.target.id,tech:'guardianLine'};}
for(const copied of [false,true])for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]])for(const distance of [1,5,6]){
 const f=fixture(dx,dy,distance,copied),before=f.game.snapshot(),allowed=distance<=5;
 assert.equal(f.game.actionsFor(f.actor.id).some(a=>a.kind===f.kind&&a.target===f.target.id),allowed,`${f.kind} ${dx},${dy}: ${distance} casas`);
 assert.equal(f.game.act(input(f)),allowed);
 if(allowed){assert.equal(f.game.piece(f.target.id),null);assert.deepEqual([f.actor.x,f.actor.y],[before.pieces.find(p=>p.id===f.actor.id).x,before.pieces.find(p=>p.id===f.actor.id).y]);if(copied)assert.equal(f.actor.copy,null);}
 else assert.deepEqual(f.game.snapshot(),before,'Ação fora de alcance não altera a partida');
}
for(const copied of [false,true])for(const side of [0,1]){
 const f=fixture(1,0,5,copied),blocker={...f.target,id:999,type:'archer',side,x:2,y:4};f.game.s.pieces.push(blocker);
 assert.equal(f.game.act(input(f)),false,'Ataque não atravessa aliado ou inimigo');
 const lines=f.game.actionsFor(f.actor.id).filter(a=>a.kind===f.kind);assert.deepEqual(lines.map(a=>a.target),side===1?[999]:[],'Para na primeira peça da linha');
}
{
 const f=fixture();f.target.x=3;f.target.y=7;assert.equal(f.game.actionsFor(f.actor.id).some(a=>a.kind==='line'),false,'Sem ataque em linha diagonal');
 assert.ok(f.game.guardianTargets(f.actor).some(p=>p.id===f.target.id),'Área de 3 casas preservada');f.target.y=8;assert.equal(f.game.guardianTargets(f.actor).some(p=>p.id===f.target.id),false);
 f.actor.x=0;f.actor.y=0;f.game.s.pieces=f.game.s.pieces.filter(p=>p!==f.target);
 assert.ok(f.game.actionsFor(f.actor.id).some(a=>a.kind==='move'&&a.x===0&&a.y===9),'Movimento livre continua além de 5 casas');
 assert.ok(f.game.actionsFor(f.actor.id).some(a=>a.kind==='move'&&a.x===7&&a.y===7),'Movimento diagonal preservado');
}
async function online(){
 assert.equal(process.env.NODE_ENV,'test','Fixtures online somente no servidor de teste');
 const base=process.env.KT_URL,{RoomStore}=require('../room-store.js'),store=new RoomStore();await store.init();
 const api=async(route,data,cookie='')=>{const r=await fetch(base+route,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json',Origin:base}:{}),...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 try{for(const copied of [false,true]){
  const created=await api('/api/online/rooms',{});assert.equal(created.status,201);const code=created.data.code,cookie=created.cookie;assert.equal((await api('/api/online/rooms/'+code+'/join',{})).status,200);
  for(const distance of [6,5]){
   const f=fixture(1,0,distance,copied);await store.mutate(code,r=>{r.state_json=JSON.stringify(f.game.snapshot());r.status='active';r.deadline_ms=Date.now()+60000;return true;});
   const before=(await api('/api/online/rooms/'+code,undefined,cookie)).data;
   const response=await api('/api/online/rooms/'+code+'/action',{op:'move',revision:before.revision,input:input(f)},cookie);assert.equal(response.status,distance===5?200:422);
   const after=(await api('/api/online/rooms/'+code,undefined,cookie)).data;
   if(distance===6){assert.deepEqual(after.state,before.state);assert.equal(after.revision,before.revision);}else{assert.equal(after.state.pieces.some(p=>p.id===f.target.id),false);if(copied)assert.equal(after.state.pieces.find(p=>p.id===f.actor.id).copy,null);}
  }
 }}finally{await store.close();await require('../database.js').closePool();}
}
(async()=>{if(process.env.KT_URL)await online();console.log('Guardian line OK: range 1–5, rejection at 6, four cardinal directions, copied attack, first-piece blocking, unchanged area/movement and authoritative HTTP checks.');})().catch(e=>{console.error(e.stack);process.exitCode=1;});
