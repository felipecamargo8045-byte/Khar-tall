'use strict';
// Restore the signed installer exactly as built. Splitting the encoded bytes
// keeps repository uploads small; it does not rebuild or re-sign the app.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),version=require('../package.json').version;
if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('Invalid Android release version');
const directory=path.join(root,'android-releases',version),manifest=JSON.parse(fs.readFileSync(path.join(directory,'manifest.json'),'utf8'));
const filename='khar-tall-'+version+'.apk',metadata=JSON.parse(fs.readFileSync(path.join(root,'downloads','khar-tall-'+version+'.json'),'utf8'));
if(manifest.file!==filename||metadata.file!==filename||metadata.version!==version||manifest.sha256!==metadata.sha256||manifest.size!==metadata.size||!Array.isArray(manifest.parts)||!manifest.parts.length||new Set(manifest.parts).size!==manifest.parts.length)throw Error('Invalid Android release manifest');
const encoded=manifest.parts.map(name=>{
 if(!/^part-\d{3}\.b64$/.test(name))throw Error('Invalid Android release part');
 const text=fs.readFileSync(path.join(directory,name),'utf8').trim();
 if(!/^[A-Za-z0-9+/]+={0,2}$/.test(text))throw Error('Invalid Android release encoding');
 return text;
}).join('');
const data=Buffer.from(encoded,'base64');
if(data.length!==metadata.size||crypto.createHash('sha256').update(data).digest('hex')!==metadata.sha256)throw Error('Android release checksum mismatch');
fs.writeFileSync(path.join(root,'downloads',filename),data);
console.log('Verified signed Android release:',version,data.length,'bytes');
