'use strict';
const assert=require('node:assert/strict');
const {KharTall}=require('../engine.js');
const URL=process.env.KT_URL||'http://127.0.0.1:8765';
let counter=0;
async function req(path,method='GET',data=null,cookie=''){
 const r=await fetch(URL+path,{method,headers:{...(data!==null?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:data!==null?JSON.stringify(data):undefined});
 const d=await r.json();counter++;return {status:r.status,data:d,cookie:r.headers.get('set-cookie')?.split(';')[0]};
}
(async()=>{
 let r=await req('/api/online/rooms','POST',{});assert.equal(r.status,201);const code=r.data.code,red=r.cookie;
 assert.match(red,/^kt_[A-Z2-9]{7}=/);
 r=await req(`/api/online/rooms/${code}`,'GET',null,red);assert.equal(r.status,200);assert.equal(r.data.status,'waiting');assert.equal(r.data.side,0);assert.equal(r.data.hasOpponent,false);
 r=await req(`/api/online/rooms/${code}`,'GET');assert.equal(r.status,403);
 r=await req(`/api/online/rooms/${code}/action`,'POST',{op:'trap',x:4,y:4},red);assert.equal(r.status,409); // Waiting for opponent
 r=await req(`/api/online/rooms/${code}/join`,'POST',{});assert.equal(r.status,200);const blue=r.cookie;
 r=await req(`/api/online/rooms/${code}`,'GET',null,blue);assert.equal(r.data.side,1);assert.equal(r.data.state.phase,'setup');assert.equal(r.data.state.traps.length,0);
 r=await req(`/api/online/rooms/${code}/action`,'POST',{op:'trap',x:4,y:4},red);assert.equal(r.status,200);
 r=await req(`/api/online/rooms/${code}`,'GET',null,red);assert.equal(r.data.state.traps.length,1);assert.equal(r.data.state.traps[0].x,4);
 r=await req(`/api/online/rooms/${code}`,'GET',null,blue);assert.equal(r.data.state.traps.length,0);
 r=await req(`/api/online/rooms/${code}/action`,'POST',{op:'ready'},blue);assert.equal(r.status,403);
 r=await req(`/api/online/rooms/${code}/action`,'POST',{op:'ready'},red);assert.equal(r.status,200);
 r=await req(`/api/online/rooms/${code}`,'GET',null,blue);assert.equal(r.data.state.setupSide,1);
 r=await req(`/api/online/rooms/${code}/action`,'POST',{op:'trap',x:5,y:5},blue);assert.equal(r.status,200);
 r=await req(`/api/online/rooms/${code}`,'GET',null,red);assert.equal(r.data.state.traps.length,1);assert.equal(r.data.state.traps[0].x,4);
 r=await req(`/api/online/rooms/${code}/action`,'POST',{op:'ready'},blue);assert.equal(r.status,200);
 const redState=(await req(`/api/online/rooms/${code}`,'GET',null,red)).data;
 const blueState=(await req(`/api/online/rooms/${code}`,'GET',null,blue)).data;
 assert.equal(redState.state.phase,'play');assert.equal(blueState.state.phase,'play');assert.equal(redState.state.traps.length,1);assert.equal(blueState.state.traps.length,1);
 assert.equal(redState.state.traps[0].x,4);assert.equal(blueState.state.traps[0].x,5);
 const activeSide=redState.state.side,auth=activeSide===0?red:blue,wrong=activeSide===0?blue:red;
 r=await req(`/api/online/rooms/${code}/action`,'POST',{op:'pass'},wrong);assert.equal(r.status,403);
 const initTurn=redState.state.turnSerial;
 r=await req(`/api/online/rooms/${code}/action`,'POST',{op:'move',input:{kind:'hit',p:9999,x:4,y:4}},auth);assert.equal(r.status,422);
 const beforeMove=(await req(`/api/online/rooms/${code}`,'GET',null,auth)).data;
 const g=KharTall.restore(beforeMove.state);const legal=g.allActions(activeSide).find(o=>o.kind==='move');
 assert.ok(legal,'deve existir movimento permitido');
 const sseController=new AbortController();
 const sseResponse=await fetch(URL+`/api/online/rooms/${code}/events`,{headers:{Cookie:auth},signal:sseController.signal});
 assert.equal(sseResponse.status,200);const reader=sseResponse.body.getReader();
 const firstChunk=await reader.read();assert.ok(new TextDecoder().decode(firstChunk.value).includes('retry'));
 r=await req(`/api/online/rooms/${code}/action`,'POST',{op:'move',input:legal},auth);assert.equal(r.status,200);
 const updated=await reader.read();assert.ok(new TextDecoder().decode(updated.value).includes('event: update'));
 sseController.abort();
 const afterMove=(await req(`/api/online/rooms/${code}`,'GET',null,auth)).data;
 assert.equal(afterMove.state.turnSerial,initTurn+1);
 assert.ok(Number.isFinite(afterMove.lastEvent.impactDelay));
 assert.equal(typeof afterMove.lastEvent.attackBlocked,'boolean');
 assert.notDeepEqual(afterMove.state.pieces.find(p=>p.id===legal.p),beforeMove.state.pieces.find(p=>p.id===legal.p));
 // Agora é o turno do adversário, cujo 'pass' deve avançar normalmente.
 r=await req(`/api/online/rooms/${code}/action`,'POST',{op:'pass'},wrong);assert.equal(r.status,200);
 r=await req(`/api/online/rooms/${code}`,'GET',null,wrong);assert.equal(r.data.state.turnSerial,initTurn+2);
 // server stores match state between HTTP requests, without client-side trust.
 r=await req(`/api/online/rooms/${code}/join`,'POST',{});assert.equal(r.status,409);
 r=await req(`/api/online/rooms/${code}`,'GET',null,red);assert.equal(r.status,200);assert.equal(r.data.state.traps.every(t=>t.side===0),true);
 console.log(`OK ${counter} HTTP checks; sala ${code}, traps private, turn validation, illegal move rejection, 2 players.`);
})().catch(e=>{console.error(e.stack);process.exitCode=1});
