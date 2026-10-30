'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),zlib=require('node:zlib'),crypto=require('node:crypto');
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
 const cardMeta=JSON.parse(fs.readFileSync(path.join(__dirname,'../downloads/cerco-dos-reis-1.0.0.json'),'utf8'));
 const apk=await request('/baixar/cerco-dos-reis.apk');
 assert.equal(apk.status,200);assert.equal(apk.headers['content-type'],'application/vnd.android.package-archive');assert.equal(apk.headers['content-disposition'],'attachment; filename="cerco-dos-reis-1.0.0.apk"');assert.equal(apk.headers['set-cookie'],undefined);
 assert.equal(apk.body.length,cardMeta.sizeBytes);assert.equal(crypto.createHash('sha256').update(apk.body).digest('hex'),cardMeta.sha256);
 const apkHead=await request('/baixar/cerco-dos-reis.apk',{},'HEAD');assert.equal(apkHead.status,200);assert.equal(apkHead.body.length,0);assert.equal(Number(apkHead.headers['content-length']),cardMeta.sizeBytes);
 const apkCached=await request('/baixar/cerco-dos-reis.apk',{'If-None-Match':apk.headers.etag});assert.equal(apkCached.status,304);assert.equal(apkCached.body.length,0);
 const cardManifest=await request('/baixar/cerco-dos-reis.json');assert.equal(cardManifest.status,200);assert.deepEqual(JSON.parse(cardManifest.body),cardMeta);assert.equal(cardMeta.package,'br.com.victoryno.cercodosreis');
 const boardApk=await request('/baixar/khar-tall.apk',{},'HEAD');assert.equal(boardApk.status,200);assert.equal(boardApk.headers['content-type'],'application/vnd.android.package-archive');assert.notEqual(Number(boardApk.headers['content-length']),cardMeta.sizeBytes);
 const health=await request('/api/health');assert.equal(health.headers['cache-control'],'no-store');assert.equal(health.headers.etag,undefined);
 console.log('Transfer OK: lossless gzip, unchanged WAVs, 304 revalidation, stale cache, HEAD, private API exclusion and independent public signed APK downloads.');
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
