'use strict';
// Restore exact, already signed bytes. The delta only packages a release;
// deployment never rebuilds, modifies or signs the application.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'..'),version=require('../package.json').version;
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
function restore(v,seen=new Set()){
 if(!/^\d+\.\d+\.\d+$/.test(v)||seen.has(v))throw Error('Invalid Android release chain');
 seen=new Set([...seen,v]);const directory=path.join(root,'android-releases',v),filename='khar-tall-'+v+'.apk';
 const manifest=JSON.parse(fs.readFileSync(path.join(directory,'manifest.json'),'utf8'));
 const metadata=JSON.parse(fs.readFileSync(path.join(root,'downloads','khar-tall-'+v+'.json'),'utf8'));
 if(manifest.file!==filename||metadata.file!==filename||metadata.version!==v||manifest.sha256!==metadata.sha256||manifest.size!==metadata.size||!Number.isSafeInteger(metadata.size)||metadata.size<1||metadata.size>64*1024*1024)throw Error('Invalid Android release manifest');
 let data;
 if(manifest.format==='delta-v1'){
  if(manifest.patch!=='patch.json.gz.b64')throw Error('Invalid Android patch path');
  const base=restore(manifest.base_version,seen);if(sha(base)!==manifest.base_sha256)throw Error('Android base checksum mismatch');
  const patch=Buffer.from(fs.readFileSync(path.join(directory,manifest.patch),'utf8').trim(),'base64');
  if(sha(patch)!==manifest.patch_sha256)throw Error('Android patch checksum mismatch');
  const operations=JSON.parse(zlib.gunzipSync(patch,{maxOutputLength:64*1024*1024}).toString('utf8'));if(!Array.isArray(operations))throw Error('Invalid Android patch');
  let size=0;const chunks=[];
  for(const op of operations){
   let chunk;if(!Array.isArray(op))throw Error('Invalid Android patch operation');
   if(op[0]==='c'&&op.length===3&&Number.isSafeInteger(op[1])&&Number.isSafeInteger(op[2])&&op[1]>=0&&op[2]>0&&op[1]+op[2]<=base.length)chunk=base.subarray(op[1],op[1]+op[2]);
   else if(op[0]==='d'&&op.length===2&&typeof op[1]==='string'&&/^[A-Za-z0-9+/]+={0,2}$/.test(op[1]))chunk=Buffer.from(op[1],'base64');
   else throw Error('Invalid Android patch operation');
   size+=chunk.length;if(size>metadata.size)throw Error('Android patch exceeds release size');chunks.push(chunk);
  }
  data=Buffer.concat(chunks,size);
 }else{
  if(!Array.isArray(manifest.parts)||!manifest.parts.length||new Set(manifest.parts).size!==manifest.parts.length)throw Error('Invalid Android release parts');
  const encoded=manifest.parts.map(name=>{
   if(!/^part-\d{3}\.b64$/.test(name))throw Error('Invalid Android release part');
   const text=fs.readFileSync(path.join(directory,name),'utf8').trim();if(!/^[A-Za-z0-9+/]+={0,2}$/.test(text))throw Error('Invalid Android release encoding');return text;
  }).join('');data=Buffer.from(encoded,'base64');
 }
 if(data.length!==metadata.size||sha(data)!==metadata.sha256)throw Error('Android release checksum mismatch');return data;
}
const data=restore(version);fs.writeFileSync(path.join(root,'downloads','khar-tall-'+version+'.apk'),data);
console.log('Verified signed Android release:',version,data.length,'bytes');
