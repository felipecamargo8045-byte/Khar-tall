'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const origin=process.env.KT_URL||'http://127.0.0.1:8765';
(async()=>{
 const get=p=>fetch(origin+p,{signal:AbortSignal.timeout(15000)});
 const page=await get('/portal');assert.equal(page.status,200);assert.equal(page.headers.get('x-frame-options'),'DENY');const html=await page.text();assert.doesNotMatch(html,/<iframe\b/i);
 const routes=new Set(['/jogar','/online','/conta','/loja','/painel-loja','/instalar','/portal.css','/portal.js','/portal-nav.css','/portal-nav.js']);
 for(const match of html.matchAll(/data-route="([^"?#]+)/g))routes.add(match[1]);
 for(const route of routes){const r=await get(route);assert.equal(r.status,200,route);assert.equal(r.headers.get('x-frame-options'),'DENY',route+' keeps framing protection');}
 const [game,legacy]=await Promise.all(['/jogar','/'].map(async p=>(await get(p)).text()));assert.equal(game,legacy,'Portal uses the original complete game');
 for(const match of html.matchAll(/data-asset="([^"]+)"/g))assert.ok(fs.existsSync(path.join(__dirname,'../assets',match[1])),'Official art '+match[1]);
 const release=await(await get('/baixar/android.json')).json();assert.equal(release.certificate_sha256,require('../downloads/khar-tall-3.5.1.json').certificate_sha256,'Update keeps the original Android signing certificate');const apk=Buffer.from(await(await get('/baixar/khar-tall.apk')).arrayBuffer());assert.equal(apk.length,release.size);assert.equal(crypto.createHash('sha256').update(apk).digest('hex'),release.sha256,'Signed release APK matches the manifest');
 for(const route of ['/api/auth/me','/api/store/catalog','/api/store/me','/api/online/recent']){const r=await get(route);assert.equal(r.headers.get('cache-control'),'no-store');}
 const denied=await get('/api/store/admin/status');assert.ok([401,403].includes(denied.status),'Anonymous visitors cannot use the store admin');
 const attack=await fetch(origin+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://evil.example','X-Kt-Csrf':'1'},body:'{}'});assert.ok([403,503].includes(attack.status),'Cross-origin authentication stays blocked');
 console.log('Portal OK: navigation, original game, protected origin, private APIs, admin denial, official art and signed APK.');
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
