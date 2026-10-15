'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=__dirname;
function edit(name,fn){const f=path.join(root,name),a=fs.readFileSync(f,'utf8'),b=fn(a);if(a===b)throw Error('Sem alterações: '+name);fs.writeFileSync(f,b,'utf8');console.log('Corrigido:',name);}
function change(s,a,b){if(!s.includes(a))throw Error('Texto não localizado: '+a.slice(0,90));return s.replace(a,b);}
edit('app.js',s=>{
 s=s.replace('assets/lobo_uivo_natural.ogg','assets/lobo_uivo_morte.wav')
 .replace(/,\s*battleRitual:'assets\/rito_(?:guerra_v2|inicio_de_batalha)\.wav'/,'');
 let a=s.indexOf('// Rito de início da batalha:'),b=s.indexOf('// Momentos dramáticos:',a);
 if(a<0||b<0)throw Error('Bloco do rito não encontrado');s=s.slice(0,a)+s.slice(b);
 s=change(s,'!battleCeremonyActive&&!informationalClockPaused','!informationalClockPaused');
 s=change(s,'return battleCeremonyActive||document.body.classList.contains','return document.body.classList.contains');
 s=change(s,'veil=false;if(battleCeremonyPending)startBattleCeremony();else{beginClock();render();scheduleAI();}','veil=false;beginClock();render();scheduleAI();');
 s=change(s,'clearTimeout(aiTimer);stopBattleCeremony();informationalClockPaused=false;','clearTimeout(aiTimer);informationalClockPaused=false;');
 s=s.replace(/\{label:'⚔ Ouvir rito de início da batalha',fn:\(\)=>\{if\(!prefs\.sound\)\{prefs\.sound=true;savePrefs\(\);applyPrefs\(\);\}playBattleCeremonyAudio\(\);\}\},/,'');
 const old="else if(game.s.phase==='play'&&game.s.mode==='local'){battleCeremonyPending=true;cover(";
 const ai="else if(game.s.phase==='play'){startBattleCeremony();}";
 if(!s.includes(old)||!s.includes(ai))throw Error('Início da batalha não localizado');
 s=s.replace(/else if\(game\.s\.phase==='play'&&game\.s\.mode==='local'\)\{battleCeremonyPending=true;cover\([^;]+;\}/,
 "else if(game.s.phase==='play'&&game.s.mode==='local'){cover('O sorteio escolheu '+sideName(game.s.side)+' para começar. Entregue o dispositivo ao jogador certo. Ao confirmar, a batalha começa imediatamente.');}");
 s=change(s,ai,"else if(game.s.phase==='play'){beginClock();scheduleAI();}");
 s=s.replace(',ritualStatus:()=>({pending:battleCeremonyPending,active:battleCeremonyActive})','');
 if(/battleCeremony|battleRitual|playBattleCeremony|rito_inicio_de_batalha|rito_guerra_v2/i.test(s))throw Error('Rito residual em app.js');
 return s;
});
edit('online.js',s=>{
 s=s.replace('lobo_uivo_natural.ogg','lobo_uivo_morte.wav');
 s=s.replace(/,war:'rito_(?:guerra_v2|inicio_de_batalha)\.wav'/,'');
 s=s.replace("a.volume=name==='war'?.72:.56;",'a.volume=.56;');
 s=change(s," if(old?.phase!=='play'&&e.phase==='play'){play('war');return;}\n",'');
 s=s.replace(/if\(priorRevision>=0&&d\.lastEvent\?\.phase==='play'&&d\.lastEvent\?\.kind==='ready'&&d\.lastEvent\?\.at!==old\?\.at&&!readyStarted\)\{readyStarted=true;play\('war'\);\}else if\(priorRevision>=0\)\{soundEvent\(d\.lastEvent,old\);\}/,
 'if(priorRevision>=0){soundEvent(d.lastEvent,old);}');
 s=s.replace(',lastEvent=null,readyStarted=false;',',lastEvent=null;');
 if(/play\('war'\)|rito_guerra|rito_inicio|readyStarted|lobo_uivo_natural/.test(s))throw Error('Rito residual em online.js');
 return s;
});
edit('style.css',s=>s.split('\n').filter(l=>!/^\.(battleRitualMask|battleRitualPanel|battleRitualKicker|battleRitualChant|battleRitualCaption)|^@keyframes ritualPulse|^@media\(prefers-reduced-motion:reduce\)\{\.battleRitualChant/.test(l)).join('\n'));
for(const n of ['rito_inicio_de_batalha.wav','rito_guerra_v2.wav','lobo_uivo_natural.ogg']){
 const p=path.join(root,'assets',n);if(fs.existsSync(p))fs.unlinkSync(p);
}
const howl=path.join(root,'assets/lobo_uivo_morte.wav');
if(!fs.existsSync(howl)||fs.statSync(howl).size<10000)throw Error('Uivo original não encontrado');
console.log('Rito totalmente retirado; uivo individual original restaurado.');
