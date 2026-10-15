'use strict';
// Save transfer without changing media quality or caching private responses.
const fs=require('node:fs'),crypto=require('node:crypto'),zlib=require('node:zlib');
const cache=new Map();
function acceptsGzip(header=''){
 let gzip,wildcard;
 for(const part of String(header).toLowerCase().split(',')){
  const [name,...params]=part.trim().split(';');let q=1;
  for(const param of params){const match=param.trim().match(/^q\s*=\s*(.+)$/);if(match)q=Number(match[1]);}
  if(!Number.isFinite(q)||q<0||q>1)q=0;
  if(name==='gzip')gzip=q;else if(name==='*')wildcard=q;
 }
 return (gzip??wildcard??0)>0;
}
function sendStatic(req,res,file,rel,type){
 const stat=fs.statSync(file);let entry=cache.get(file);
 if(!entry||entry.mtime!==stat.mtimeMs||entry.size!==stat.size){
  const data=fs.readFileSync(file);
  const candidate=data.length>=512&&(type.startsWith('text/')||type==='audio/wav')?zlib.gzipSync(data,{level:6}):null;
  entry={data,gzip:candidate&&candidate.length<data.length*.95?candidate:null,
   etag:'W/"'+crypto.createHash('sha256').update(data).digest('hex')+'"',mtime:stat.mtimeMs,size:stat.size};
  cache.set(file,entry);
 }
 const compressed=entry.gzip&&acceptsGzip(req.headers['accept-encoding']);
 const data=compressed?entry.gzip:entry.data;
 const headers={'Content-Type':type,'Cache-Control':rel.startsWith('assets/')?'public, max-age=3600':'no-cache','ETag':entry.etag};
 if(entry.gzip)headers.Vary='Accept-Encoding';
 if(compressed)headers['Content-Encoding']='gzip';
 // Weak comparison permits revalidation across lossless wire encodings.
 const matches=String(req.headers['if-none-match']||'').split(',').some(t=>t.trim()==='*'||t.trim().replace(/^W\//,'')===entry.etag.replace(/^W\//,''));
 if(matches){res.writeHead(304,headers);res.end();return;}
 res.writeHead(200,{...headers,'Content-Length':data.length});
 res.end(req.method==='HEAD'?undefined:data);
}
module.exports={sendStatic};
