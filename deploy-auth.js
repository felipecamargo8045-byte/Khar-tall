'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=__dirname;
const src=fs.readFileSync(path.join(root,'auth-bundle','contas-neon.txt'),'utf8').replace(/\s/g,'');
const bytes=Buffer.from(src,'base64');
if(crypto.createHash('sha256').update(bytes).digest('hex')!=='dcd2d080abd347db1dac92062d52df7b5e1d66831167d190af7bf09771315cd1')throw Error('Arquivo de autenticação corrompido');
const allowed=new Set(['server.js','auth-server.js','auth-client.js','conta.html','privacidade.html','online.html','account.js','package.json']);
let at=0,count=0;
while(at+30<=bytes.length&&bytes.readUInt32LE(at)===0x04034b50){
 const flags=bytes.readUInt16LE(at+6),method=bytes.readUInt16LE(at+8),len=bytes.readUInt32LE(at+18),nlen=bytes.readUInt16LE(at+26),xlen=bytes.readUInt16LE(at+28);
 if(flags&8)throw Error('ZIP inválido');
 const name=bytes.subarray(at+30,at+30+nlen).toString('utf8'),begin=at+30+nlen+xlen;
 if(!allowed.delete(name)||begin+len>bytes.length)throw Error('Arquivo não autorizado: '+name);
 const data=method===8?zlib.inflateRawSync(bytes.subarray(begin,begin+len)):method===0?bytes.subarray(begin,begin+len):null;
 if(!data)throw Error('Compressão inválida');
 fs.writeFileSync(path.join(root,name),data);count++;at=begin+len;
}
if(count!==8||allowed.size)throw Error('Pacote de contas incompleto');
for(const p of ['auth-server.js','server.js','auth-client.js'])cp.execFileSync(process.execPath,['--check',p],{cwd:root,stdio:'inherit'});
cp.execFileSync('npm',['install','--omit=dev','--no-audit','--no-fund','--ignore-scripts'],{cwd:root,stdio:'inherit',timeout:180000});
if(process.env.ACCOUNTS_DATABASE_URL){console.log('Validando cadastro/login no Neon...');cp.execFileSync(process.execPath,['tests/test_auth_e2e.js'],{cwd:root,stdio:'inherit',timeout:180000});}
console.log('Khar Tall: contas protegidas com Neon, oito arquivos instalados');