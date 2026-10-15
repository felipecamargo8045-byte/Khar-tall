'use strict';
// Compatibility entry point for the existing Render build command.
// The reviewed source is versioned directly; no archive can overwrite it.
const {execFileSync}=require('node:child_process');
const options={cwd:__dirname,stdio:'inherit'};

// Only immutable image/audio assets are unpacked; never application sources.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const parts=fs.readdirSync(path.join(__dirname,'asset-bundle')).filter(n=>/^source-\d+\.txt$/.test(n)).sort();
const archive=Buffer.from(parts.map(n=>fs.readFileSync(path.join(__dirname,'asset-bundle',n),'utf8')).join('').replace(/\s/g,''),'base64');
if(crypto.createHash('sha256').update(archive).digest('hex')!=='be498b428753577b090b20a8bc2b6715cba80abe0d060ca5442dda391be43e25')throw Error('Asset bundle checksum mismatch');
let offset=0,count=0;
while(offset+30<=archive.length&&archive.readUInt32LE(offset)===0x04034b50){
 const flags=archive.readUInt16LE(offset+6),method=archive.readUInt16LE(offset+8),size=archive.readUInt32LE(offset+18),length=archive.readUInt16LE(offset+26),extra=archive.readUInt16LE(offset+28);
 if(flags&8)throw Error('Unsupported asset archive');
 const name=archive.subarray(offset+30,offset+30+length).toString('utf8'),begin=offset+30+length+extra;
 if(begin+size>archive.length)throw Error('Truncated asset archive');
 if(/^assets\/[A-Za-z0-9_.-]+$/.test(name)&&!/(?:rito_|lobo_uivo_natural)/.test(name)){
  const data=method===8?zlib.inflateRawSync(archive.subarray(begin,begin+size)):method===0?archive.subarray(begin,begin+size):null;
  if(!data)throw Error('Unsupported asset compression');
  const destination=path.join(__dirname,name);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,data);count++;
 }
 offset=begin+size;
}
if(count<35)throw Error('Incomplete asset bundle');
console.log('Verified image/audio assets:',count);

// New licensed recordings are versioned separately from the immutable bundle.
const audioDir=path.join(__dirname,'audio-assets');
const audioManifest=JSON.parse(fs.readFileSync(path.join(audioDir,'manifest.json'),'utf8'));
for(const [name,meta] of Object.entries(audioManifest)){
 if(!/^[A-Za-z0-9_-]+\.wav$/.test(name)||!/^[a-f0-9]{64}$/.test(meta.sha256))throw Error('Invalid audio asset manifest');
 const data=Buffer.from(fs.readFileSync(path.join(audioDir,name+'.b64'),'utf8').replace(/\s/g,''),'base64');
 if(crypto.createHash('sha256').update(data).digest('hex')!==meta.sha256)throw Error('Audio recording checksum mismatch: '+name);
 fs.writeFileSync(path.join(__dirname,'assets',name),data);
 console.log('Verified recording:',name);
}

execFileSync(process.execPath,['scripts/prepare-app.js'],options);
execFileSync('npm',['ci','--omit=dev','--ignore-scripts','--no-audit','--no-fund'],options);
execFileSync(process.execPath,['scripts/check.js'],options);

if(process.env.RELEASE_TEST_DATABASE_URL){
  console.log('Validating release on isolated database branch...');
  execFileSync(process.execPath,['tests/run.js'],{...options,env:{...process.env,ACCOUNTS_DATABASE_URL:process.env.RELEASE_TEST_DATABASE_URL},timeout:180000});
}else{
  execFileSync(process.execPath,['tests/run.js'],{...options,env:{...process.env,ACCOUNTS_DATABASE_URL:'',DATABASE_URL:'',ENABLE_ACCOUNT_REGISTRATION:'false'},timeout:90000});
}
