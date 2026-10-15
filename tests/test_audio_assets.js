'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {FILES}=require('../audio.js'),expected=require('./original-audio-sha256.json');
assert.equal(Object.keys(FILES).length,20);
for(const name of Object.values(FILES)){
 const data=fs.readFileSync(path.join(__dirname,'../assets',name));
 assert.equal(crypto.createHash('sha256').update(data).digest('hex'),expected[name],name+' must retain the approved original recording');
 assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WAVE');
 let offset=12,format,pcm;
 while(offset+8<=data.length){const kind=data.toString('ascii',offset,offset+4),size=data.readUInt32LE(offset+4);assert.ok(offset+8+size<=data.length,name+' truncated');
  if(kind==='fmt ')format={encoding:data.readUInt16LE(offset+8),channels:data.readUInt16LE(offset+10),rate:data.readUInt32LE(offset+12),bits:data.readUInt16LE(offset+22)};
  if(kind==='data')pcm=data.subarray(offset+8,offset+8+size);offset+=8+size+(size%2);}
 assert.equal(format.encoding,1);assert.equal(format.bits,16);assert.ok(format.rate>=22050&&format.rate<=48000);assert.ok(pcm?.length>1000);
 let peak=0,energy=0;for(let i=0;i<pcm.length;i+=2){const sample=pcm.readInt16LE(i);peak=Math.max(peak,Math.abs(sample));energy+=sample*sample;}
 assert.ok(peak>100&&peak<32760,name+' silent or clipped');assert.ok(energy>0);
}
console.log('Audio assets OK: all 20 original WAVs intact, valid, audible-level PCM, without clipped samples.');
