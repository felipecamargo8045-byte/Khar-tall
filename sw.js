'use strict';
const CACHE='khar-tall-3.7.0';
const CORE=['/skin-catalog.js','/skins.js','/skins.css','/portal','/portal.css','/portal.js','/portal-nav.js','/portal-nav.css','/jogar','/','/index.html','/style.css','/account.css','/online.css','/engine.js','/learning.js','/app.js','/audio.js','/game-ui.js','/account.js','/app-shell.js','/app-shell.css','/online','/online.js','/conta','/auth-client.js','/loja','/store.css','/store-client.js','/instalar','/install.js','/manifest.webmanifest','/icons/icon-192.png','/icons/icon-512.png','/privacidade.html'];
const PATHS=new Set(CORE);
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil((async()=>{
 const current=await caches.open(CACHE);
 for(const key of await caches.keys()){
  if(!key.startsWith('khar-tall-')||key===CACHE)continue;
  const old=await caches.open(key);
  // Original media is immutable: preserve an already prepared offline game.
  for(const request of await old.keys()){
   const url=new URL(request.url);if(url.origin!==self.location.origin||!/^\/assets\/[\w.-]+$/.test(url.pathname)||await current.match(url.pathname))continue;
   const response=await old.match(request);if(response)await current.put(url.pathname,response);
  }
  await caches.delete(key);
 }
 await self.clients.claim();
})()));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||u.pathname.startsWith('/api/')||(!PATHS.has(u.pathname)&&!/^\/assets\/[\w.-]+$/.test(u.pathname)))return;
 if(u.pathname.startsWith('/assets/')){e.respondWith(caches.open(CACHE).then(async c=>{const old=await c.match(u.pathname);if(old)return old;const r=await fetch(e.request);if(r.ok)await c.put(u.pathname,r.clone());return r;}));return;}
 // A complete release is cached at install. Cached pages and scripts open
 // together without waiting for a sleeping server. A new worker installs the
 // next release atomically; account, room and payment APIs always use network.
 e.respondWith(caches.open(CACHE).then(async c=>{const cached=await c.match(u.pathname);if(cached)return cached;const r=await fetch(e.request);if(r.ok)await c.put(u.pathname,r.clone());return r;}));});
self.addEventListener('message',e=>{if(e.data?.type!=='CACHE_GAME'||!e.ports[0])return;e.waitUntil((async()=>{try{const r=await fetch('/offline-assets.json',{cache:'no-store'});if(!r.ok)throw Error();const files=await r.json(),cache=await caches.open(CACHE);for(const file of files){if(!/^\/assets\/[A-Za-z0-9_.-]+$/.test(file))continue;if(!await cache.match(file)){const asset=await fetch(file);if(!asset.ok)throw Error();await cache.put(file,asset);}}e.ports[0].postMessage({ok:true});}catch{e.ports[0].postMessage({ok:false,error:'Não foi possível concluir. Confira sua conexão e o espaço disponível.'});}})());});

