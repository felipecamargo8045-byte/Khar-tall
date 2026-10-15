'use strict';
/* V3.1 Audio fixes: executed AFTER restoring original packaged game. */
const fs=require('node:fs');
const path=require('node:path');
const root=__dirname;
function restoreAudio(name,target){
 const source=path.join(root,'audio-overrides',name);
 if(!fs.existsSync(source))throw Error('Áudio não encontrado: '+name);
 const encoded=fs.readFileSync(source,'utf8').replace(/\s/g,'');
 const raw=Buffer.from(encoded,'base64');
 if(raw.length<10000)throw Error('Áudio incompleto: '+name);
 const destination=path.join(root,'assets',target);
 fs.writeFileSync(destination,raw);
 console.log('Áudio corrigido:',target,raw.length,'bytes');
}
function change(filename,oldText,newText){
 const file=path.join(root,filename);
 const previous=fs.readFileSync(file,'utf8');
 if(!previous.includes(oldText))throw Error('Referência antiga ausente: '+filename+' '+oldText);
 fs.writeFileSync(file,previous.split(oldText).join(newText),'utf8');
}
restoreAudio('wolf_howl_natural.ogg.base64','lobo_uivo_natural.ogg');
restoreAudio('rito_guerra_v2.wav.base64','rito_guerra_v2.wav');
change('app.js','assets/lobo_uivo_morte.wav','assets/lobo_uivo_natural.ogg');
change('app.js','assets/rito_inicio_de_batalha.wav','assets/rito_guerra_v2.wav');
change('online.js','lobo_uivo_morte.wav','lobo_uivo_natural.ogg');
change('online.js','rito_inicio_de_batalha.wav','rito_guerra_v2.wav');
change('server.js',"'.wav':'audio/wav'","'.wav':'audio/wav','.ogg':'audio/ogg'");
console.log('KHAR TALL: efeitos de Lobo e rito corrigidos sem alterar motor de combate.');
