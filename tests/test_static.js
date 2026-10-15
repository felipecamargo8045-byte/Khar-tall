'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),zlib=require('node:zlib');
const origin=process.env.KT_URL||'http://127.0.0.1:8765';
function request(route,headers={},method='GET'){
 return new Promise((resolve,reject)=>{const req=http.request(origin+route,{headers,method},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));});req.on('error',reject);req.end();});
}
(async()=>{
 for(const file of ['app.js','assets/lobo_uivo_real.wav','assets/guardiao_ventania_magica.wav']){
  const expected=fs.readFileSync(path.join(__dirname,'..',file)),route='/'+file;
  const plain=await request(route,{'Accept-Encoding':'identity'});
  assert.equal(plain.status,200);assert.deepEqual(plain.body,expected);assert.ok(plain.headers.etag);
  const compressed=await request(route,{'Accept-Encoding':'gzip'});
  assert.equal(compressed.status,200);
  if(file==='app.js'){assert.equal(compressed.headers['content-encoding'],'gzip');assert.ok(compressed.body.length<expected.length*.5);}
  const decoded=compressed.headers['content-encoding']==='gzip'?zlib.gunzipSync(compressed.body):compressed.body;
  assert.deepEqual(decoded,expected,'Wire compression must preserve every source/media byte');
  const cached=await request(route,{'If-None-Match':plain.headers.etag,'Accept-Encoding':'gzip'});
  assert.equal(cached.status,304);assert.equal(cached.body.length,0);assert.equal(cached.headers.etag,plain.headers.etag);
  const head=await request(route,{'Accept-Encoding':'identity'},'HEAD');
  assert.equal(head.status,200);assert.equal(head.body.length,0);assert.equal(Number(head.headers['content-length']),expected.length);
  const refused=await request(route,{'Accept-Encoding':'gzip;q=0, *;q=1'});
  assert.equal(refused.headers['content-encoding'],undefined);assert.deepEqual(refused.body,expected);
  const stale=await request(route,{'If-None-Match':'"older-deploy"'});assert.equal(stale.status,200);assert.deepEqual(stale.body,expected);
 }
 const health=await request('/api/health');assert.equal(health.headers['cache-control'],'no-store');assert.equal(health.headers.etag,undefined);
 console.log('Transfer OK: lossless gzip, unchanged WAVs, 304 revalidation, stale cache, HEAD and private API exclusion.');
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
