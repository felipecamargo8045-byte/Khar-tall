'use strict';
// Deploy Khar Tall authentication files without touching combat rules or sounds.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=__dirname;
const expected='a9765302a03e10ce53b25aae15d1d6b4690a984d6f473cb509b194d351562994';
const bytes=Buffer.from(fs.readFileSync(path.join(root,'auth-overrides/auth-overlay.b64.txt'),'utf8').replace(/\s/g,''),'base64');
if(crypto.createHash('sha256').update(bytes).digest('hex')!==expected)throw Error('Pacote de cadastro inválido');
const allowed=new Set(['server.js','auth-server.js','auth-client.js','conta.html','index.html','online.html','account.js','privacidade.html','package.json']);
let offset=0,count=0;
while(offset+30<=bytes.length&&bytes.readUInt32LE(offset)===0x04034b50){
 const flags=bytes.readUInt16LE(offset+6),method=bytes.readUInt16LE(offset+8);
 const n=bytes.readUInt16LE(offset+26),x=bytes.readUInt16LE(offset+28),size=bytes.readUInt32LE(offset+18);
 if(flags&8)throw Error('Formato ZIP não suportado');
 const name=bytes.subarray(offset+30,offset+30+n).toString('utf8'),at=offset+30+n+x;
 if(!allowed.delete(name)||at+size>bytes.length)throw Error('Arquivo não autorizado/incompleto: '+name);
 const payload=method===8?zlib.inflateRawSync(bytes.subarray(at,at+size)):method===0?bytes.subarray(at,at+size):null;
 if(!payload)throw Error('Compressão inválida');
 fs.writeFileSync(path.join(root,name),payload);count++;offset=at+size;
}
if(count!==9||allowed.size)throw Error('Pacote de autenticação incompleto');
console.log('Khar Tall: módulo de contas instalado com',count,'arquivos');
cp.execFileSync('npm',['install','--omit=dev','--no-audit','--no-fund','--ignore-scripts'],{cwd:root,stdio:'inherit',timeout:180000});
