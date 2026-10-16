'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
for(const f of ['portal.js','portal-nav.js','audio.js','game-ui.js','server.js','static-files.js','engine.js','app.js','online.js','auth-server.js','auth-client.js','room-store.js','database.js','request-security.js','account.js','store-db.js','store-server.js','store-client.js','store-admin.js','app-shell.js','install.js','sw.js','scripts/prepare-app.js'])
  execFileSync(process.execPath,['--check',path.join(root,f)]);
for(const f of ['portal.html','portal.css','portal-nav.css','index.html','online.html','conta.html','privacidade.html','migrations/001_online_rooms.sql','loja.html','painel-loja.html','instalar.html','manifest.webmanifest','offline-assets.json','icons/icon-192.png','icons/icon-512.png','assetlinks.json','downloads/khar-tall-3.5.2.apk'])
  assert.ok(fs.statSync(path.join(root,f)).size>0,'Missing '+f);
for(const file of ['index.html','online.html','conta.html','style.css','online.css','account.css','app.js','online.js','loja.html','painel-loja.html','instalar.html','store.css','store-client.js','store-admin.js','store-server.js']) {
  const source=fs.readFileSync(path.join(root,file),'utf8');
  for(const match of source.matchAll(/(?:["'(])\/?(assets\/[A-Za-z0-9_.-]+)/g))
    assert.ok(fs.existsSync(path.join(root,match[1])),file+' references missing '+match[1]);
}
for(const file of ['app.js','online.js'])
  assert.doesNotMatch(fs.readFileSync(path.join(root,file),'utf8'),/battleCeremony|battleRitual|rito_guerra|rito_inicio_de_batalha/,'Removed ritual must stay removed.');
require('../tests/test_audio_assets.js');
const blueprint=fs.readFileSync(path.join(root,'render.yaml'),'utf8');
const plans=[...blueprint.matchAll(/^\s*plan:\s*(\S+)/gm)].map(m=>m[1]);
assert.ok(plans.length>0&&plans.every(p=>p==='free'),'Zero-cost policy: every provisioned plan must be free.');
assert.doesNotMatch(blueprint,/^\s*(?:disk|diskSizeGB|scaling):/m,'Zero-cost policy: no paid disk or autoscaling.');
console.log('Build OK: source syntax, required files, referenced assets and real wolf recording.');
