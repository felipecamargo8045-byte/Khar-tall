'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const dir=path.join(__dirname,'deploy-parts');
const parts=fs.readdirSync(dir).filter(x=>/^source-\d+\.txt$/.test(x)).sort();
if(!parts.length)throw Error('Partes do projeto ausentes');
let b64='';
for(const p of parts)b64+=fs.readFileSync(path.join(dir,p),'utf8').replace(/\s/g,'');
const zip=Buffer.from(b64,'base64');let ptr=0,count=0;
while(ptr+30<=zip.length&&zip.readUInt32LE(ptr)===0x04034b50){
 const flags=zip.readUInt16LE(ptr+6),method=zip.readUInt16LE(ptr+8);
 const csize=zip.readUInt32LE(ptr+18),nlen=zip.readUInt16LE(ptr+26),xlen=zip.readUInt16LE(ptr+28);
 if(flags&8)throw Error('ZIP com data descriptor não suportado');
 const name=zip.subarray(ptr+30,ptr+30+nlen).toString('utf8');
 const dataStart=ptr+30+nlen+xlen;
 if(dataStart+csize>zip.length)throw Error('ZIP truncado');
 if(name.includes('\\')||name.startsWith('/')||name.split('/').includes('..'))throw Error('Caminho proibido: '+name);
 if(name&&!name.endsWith('/')){
  const target=path.join(__dirname,name);
  if(!target.startsWith(__dirname+path.sep))throw Error('Caminho inválido');
  const bytes=method===8?zlib.inflateRawSync(zip.subarray(dataStart,dataStart+csize)):method===0?zip.subarray(dataStart,dataStart+csize):null;
  if(!bytes)throw Error('Compressão não suportada');
  fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);count++;
 }
 ptr=dataStart+csize;
}
if(count<40)throw Error('Pacote incompleto: '+count+' arquivos');
console.log('Khar Tall: '+count+' arquivos restaurados do pacote original');