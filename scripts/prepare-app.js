'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
for(const [file,asset]of Object.entries(require('../app-resources.json'))){if(!/^icons\/icon-(192|512)\.png$/.test(file))throw Error('Invalid app icon');const b=Buffer.from(asset.base64,'base64');if(crypto.createHash('sha256').update(b).digest('hex')!==asset.sha256)throw Error('App icon checksum mismatch');fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),b);}
const assets=fs.readdirSync(path.join(root,'assets')).filter(x=>/^[A-Za-z0-9_.-]+$/.test(x)).sort().map(x=>'/assets/'+x);
fs.writeFileSync(path.join(root,'offline-assets.json'),JSON.stringify(assets));
console.log('Android/PWA resources verified; original media:',assets.length);
