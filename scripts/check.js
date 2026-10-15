'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
for(const f of ['server.js','engine.js','app.js','online.js','auth-server.js','auth-client.js','room-store.js','database.js','request-security.js','account.js'])
  execFileSync(process.execPath,['--check',path.join(root,f)]);
for(const f of ['index.html','online.html','conta.html','privacidade.html','migrations/001_online_rooms.sql'])
  assert.ok(fs.statSync(path.join(root,f)).size>0,'Missing '+f);
for(const file of ['index.html','online.html','conta.html','style.css','online.css','account.css','app.js','online.js']) {
  const source=fs.readFileSync(path.join(root,file),'utf8');
  for(const match of source.matchAll(/(?:["'(])\/?(assets\/[A-Za-z0-9_.-]+)/g))
    assert.ok(fs.existsSync(path.join(root,match[1])),file+' references missing '+match[1]);
}
for(const file of ['app.js','online.js'])
  assert.doesNotMatch(fs.readFileSync(path.join(root,file),'utf8'),/battleCeremony|battleRitual|rito_guerra|rito_inicio_de_batalha/,'Removed ritual must stay removed.');
assert.ok(fs.statSync(path.join(root,'assets/lobo_uivo_morte.wav')).size>10000);
console.log('Build OK: source syntax, required files, referenced assets and original wolf howl.');
