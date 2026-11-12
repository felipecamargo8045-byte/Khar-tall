'use strict';
// Extrai EXCLUSIVAMENTE as gravações WAV do Khar Tall original.
// Fontes: asset-bundle assinado e audio-assets/*.wav.b64 já versionados.
// Não gera, sintetiza, converte nem altera áudio; SHA-256 comprova identidade.
const fs=require('node:fs'), path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'original-audio');
const expected=JSON.parse(fs.readFileSync(path.join(root,'tests/original-audio-sha256.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'audio-assets/manifest.json'),'utf8'));
const source=fs.readdirSync(path.join(root,'asset-bundle')).filter(f=>/^source-\d+\.txt$/.test(f)).sort();
if(source.length<20)throw Error('Arquivo original incompleto');
const archive=Buffer.from(source.map(f=>fs.readFileSync(path.join(root,'asset-bundle',f),'utf8')).join('').replace(/\s/g,''),'base64');
const digest=crypto.createHash('sha256').update(archive).digest('hex');
if(digest!=='be498b428753577b090b20a8bc2b6715cba80abe0d060ca5442dda391be43e25')
 throw Error('O bundle original não passou na verificação SHA-256');
fs.mkdirSync(out,{recursive:true});
const preserved=new Map();
function register(name,data){
 if(!/^[a-zA-Z0-9_-]+\.wav$/.test(name))throw Error('Nome inválido '+name);
 const hash=crypto.createHash('sha256').update(data).digest('hex');
 const expectedHash=manifest[name]?.sha256||expected[name];
 if(expectedHash && hash!==expectedHash)throw Error('Gravação alterada '+name+' '+hash);
 preserved.set(name,{data,sha256:hash});
}
let offset=0;
while(offset+30<=archive.length&&archive.readUInt32LE(offset)===0x04034b50){
 const flags=archive.readUInt16LE(offset+6),method=archive.readUInt16LE(offset+8);
 const compressed=archive.readUInt32LE(offset+18),n=archive.readUInt16LE(offset+26),extra=archive.readUInt16LE(offset+28);
 if(flags&8)throw Error('Formato ZIP inesperado');
 const filename=archive.subarray(offset+30,offset+30+n).toString('utf8'),start=offset+30+n+extra;
 if(start+compressed>archive.length)throw Error('ZIP truncado');
 if(/^assets\/[A-Za-z0-9_-]+\.wav$/.test(filename)){
  const data=method===8?zlib.inflateRawSync(archive.subarray(start,start+compressed)):method===0?archive.subarray(start,start+compressed):null;
  if(!data)throw Error('Compressão não suportada');
  register(path.basename(filename),data);
 }
 offset=start+compressed;
}
for(const [name,meta] of Object.entries(manifest)){
 const encoded=fs.readFileSync(path.join(root,'audio-assets',name+'.b64'),'utf8').replace(/\s/g,'');
 const data=Buffer.from(encoded,'base64');
 const hash=crypto.createHash('sha256').update(data).digest('hex');
 if(hash!==meta.sha256)throw Error('Erro na gravação versionada: '+name);
 register(name,data);
}
// Todas as gravações originais utilizadas pelo motor do jogo original.
const required=[
 'batedor_azul_lancamento.wav','batedor_azul_impacto.wav',
 'batedor_vermelho_lancamento.wav','batedor_vermelho_explosao.wav',
 'arqueiro_disparo.wav','arqueiro_impacto.wav',
 'soldado_espada_corte.wav','soldado_espadas_choque_nitido.wav',
 'colosso_passo_estrondoso.wav','colosso_esmagamento_rachadura.wav',
 'rei_primeira_vida_tam_tam_taam.wav','rei_morto_guardiao_vivo_suspense.wav',
 'guardiao_trombeta_aviso.wav','vitoria_trompetas_marcha.wav',
 'lobo_uivo_real.wav','rei_ataque_explosao.wav',
 'guardiao_ataque_area_ancestral.wav','guardiao_ventania_magica.wav'
];
const missing=required.filter(name=>!preserved.has(name));
if(missing.length)throw Error('Gravações originais ausentes: '+missing.join(', '));
for(const [name,entry] of preserved)fs.writeFileSync(path.join(out,name),entry.data);
const report=Object.fromEntries([...preserved.entries()].map(([name,entry])=>[name,{sha256:entry.sha256,bytes:entry.data.length,origin:manifest[name]?'audio-assets':'asset-bundle'}]));
fs.writeFileSync(path.join(out,'sha256.json'),JSON.stringify(report,null,2)+'\n');
console.log('Gravações originais recuperadas: '+preserved.size);
console.log('Total de bytes: '+[...preserved.values()].reduce((total,f)=>total+f.data.length,0));
console.log('Todas as 18 gravações exigidas pelo áudio original foram recuperadas sem modificação.');
