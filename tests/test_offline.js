'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const handlers=new Map(),stored=new Map([['/jogar',{html:true}],['/learning.js',{script:true}]]);let network=0;
const cache={match:async key=>stored.get(key),put:async(key,value)=>stored.set(key,value)};
const context={URL,Set,Error,self:{location:{origin:'https://game.example'},addEventListener:(name,fn)=>handlers.set(name,fn)},caches:{open:async()=>cache},fetch:async()=>{network++;throw Error('network asleep');}};
vm.runInNewContext(fs.readFileSync(require.resolve('../sw.js'),'utf8'),context);
async function request(path,method='GET'){let pending;handlers.get('fetch')({request:{url:new URL(path,'https://game.example').href,method},respondWith:p=>{pending=p;}});return pending?await pending:null;}
(async()=>{
 assert.equal(await request('/jogar?abrir=aprender'),stored.get('/jogar'),'Cached navigation preserves deep-link entry without network delay');
 assert.equal(await request('/learning.js'),stored.get('/learning.js'),'Matching release scripts open offline');assert.equal(network,0);
 for(const route of ['/api/auth/me','/api/online/rooms/ABC1234','/api/store/me','/baixar/android.json','https://pay.example/checkout'])assert.equal(await request(route),null,'Never intercept account, room, payment, update or external traffic');
 assert.equal(await request('/jogar','POST'),null);
 const {ui}=require('./test_trap_visibility.js');const v=ui();v.api.launch('ai',1);v.advance(10000);v.visibility(true);v.advance(180000);v.visibility(false);v.advance(49000);assert.equal(v.api.getGame().s.phase,'setup','Background time does not consume local preparation');v.advance(2000);assert.equal(v.api.getGame().s.phase,'play','Local countdown resumes with remaining seconds');
 console.log('Offline OK: cached game opens without waking server, private APIs excluded, local background timer pauses and resumes.');
})().catch(e=>{console.error(e);process.exitCode=1;});
