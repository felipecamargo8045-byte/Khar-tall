'use strict';
const assert=require('node:assert/strict');
const {Player,plan,FILES,WOLF_ORIGINAL}=require('../audio.js');
require('./test_audio_assets.js');
const event=(actionKind,pieceType,extra={})=>({kind:'move',actionKind,pieceType,lost:[],wounded:[],winner:null,impactDelay:310,...extra});
const keys=e=>plan(e).cues.map(x=>x.key);
assert.deepEqual(plan(event('wolfHit','wolf')).cues,WOLF_ORIGINAL);
assert.deepEqual(plan(event('copyWolfHit','king',{tech:'wolf'})).cues,WOLF_ORIGINAL);
assert.deepEqual(keys(event('wolfHit','wolf',{attackBlocked:true,trapTriggered:true})),[]);
assert.equal(plan(event('wolfHit','wolf',{attackBlocked:true})).utility,'trap');
for(const [kind,piece,expected]of [
 ['mark','scout',['blueLaunch','blueImpact']],['execute','scout',['redLaunch','redImpact']],
 ['hit','archer',['arrowLaunch','arrowImpact']],['hit','soldier',['swordSwing','swordImpact']],
 ['hit','king',['kingBlast']],['area','guardian',['guardianArea']],['line','guardian',['guardianLine']],
 ['smash','colossus',['groundSmash']]])assert.deepEqual(keys(event(kind,piece)),expected);
assert.deepEqual(keys(event('copyHit','king',{tech:'archer'})),['arrowLaunch','arrowImpact']);
assert.deepEqual(keys(event('copyHit','king',{tech:'soldier'})),['swordSwing','swordImpact']);
assert.deepEqual(keys(event('copyArea','king',{tech:'guardianArea'})),['guardianArea']);
assert.equal(plan(event('charge','colossus',{chargeSteps:1})).cues.length,1);
assert.equal(plan(event('copyCharge','king',{chargeSteps:0})).cues.length,0);
assert.deepEqual(plan(event('charge','colossus',{chargeSteps:3})).cues.map(c=>c.delay),[85,270,455]);
assert.equal(keys(event('hit','soldier',{lost:[{type:'wolf'}]})).filter(k=>k==='wolfHowl').length,1);
assert.equal(keys(event('area','guardian',{lost:[{type:'wolf'},{type:'wolf'}]})).filter(k=>k==='wolfHowl').length,1);
assert.deepEqual(keys({...event('transform','wolf',{lost:[{type:'wolf'}]}),kind:'field'}),[]);
const final=keys(event('wolfHit','wolf',{winner:0,lost:[{type:'king'},{type:'guardian',original:true},{type:'wolf'}],wounded:[1]}));
assert.ok(final.includes('royalVictory'));assert.ok(!final.some(k=>['wolfHowl','royalSuspense','royalGuardian','royalWound'].includes(k)));
assert.ok(keys(event('hit','soldier',{lost:[{type:'king'}]})).includes('royalSuspense'));
assert.ok(keys(event('area','guardian',{lost:[{type:'guardian',original:true}]})).includes('royalGuardian'));
assert.ok(keys(event('hit','archer',{wounded:[0]})).includes('royalWound'));
for(const e of [event('mark','scout'),event('wolfHit','wolf'),event('charge','colossus'),event('area','guardian')])for(const c of plan(e).cues)assert.ok(FILES[c.key]);
const starts=[],sources=[];
const param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}});
class Node{constructor(){this.gain=param();this.frequency=param();}connect(node){this.output=node;}disconnect(){}start(at){starts.push({at,buffer:this.buffer,gain:this.output.gain.value});}stop(){this.stopped=true;}}
class Context{
 constructor(){this.state='suspended';this.currentTime=10;this.destination={};}
 createGain(){return new Node();}createDynamicsCompressor(){return {threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),connect(){}};}
 createBufferSource(){const n=new Node();sources.push(n);return n;}
 createOscillator(){throw Error('Original WAV effects must never use synthesized fallback');}
 resume(){this.state='running';return Promise.resolve();}decodeAudioData(data){return Promise.resolve({tag:new Uint8Array(data)[0]});}
}
(async()=>{
 let release;const wait=new Promise(r=>{release=r;});
 const fetch=async url=>{await wait;return {ok:true,arrayBuffer:async()=>new Uint8Array([url.includes('rosnado')?1:2]).buffer};};
 const player=new Player({AudioContext:Context,fetch});
 const first=player.sequence(WOLF_ORIGINAL);assert.equal(starts.length,0);
 release();assert.equal(await first,true);assert.equal(starts.length,2);
 assert.equal(starts[0].buffer.tag,1);assert.equal(starts[1].buffer.tag,2);
 assert.ok(Math.abs(starts[1].at-starts[0].at-.310)<1e-9);
 assert.deepEqual(starts.map(s=>s.gain),[.66,.80]);
 player.setEnabled(false);assert.ok(sources.every(s=>s.stopped));assert.equal(await player.sequence(WOLF_ORIGINAL),false);
 let finish;const pending=new Promise(r=>{finish=r;});const muted=new Player({AudioContext:Context,fetch:async()=>{await pending;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(2)};}});
 const loading=muted.sequence(WOLF_ORIGINAL);muted.setEnabled(false);finish();assert.equal(await loading,false);assert.equal(starts.length,2);
 const broken=new Player({AudioContext:Context,fetch:async()=>{throw Error('offline');}});assert.equal(await broken.sequence(WOLF_ORIGINAL),false);
 console.log('Audio playback OK: original first attack, 310ms timing, copies, all pieces, real charge steps, traps, death priority, cold load, mute and missing-file handling.');
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
