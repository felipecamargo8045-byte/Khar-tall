#!/usr/bin/env python3
"""Package an already signed APK as an exact copy/literal delta.
Only Python's standard library is used; no cloud build or artifact host.
"""
import argparse, base64, gzip, hashlib, json, pathlib
p=argparse.ArgumentParser();p.add_argument('--base',required=True);args=p.parse_args()
root=pathlib.Path(__file__).resolve().parent.parent
version=json.loads((root/'package.json').read_text())['version']
assert args.base!=version and all(c.isdigit() or c=='.' for c in args.base)
metadata=json.loads((root/f'downloads/khar-tall-{version}.json').read_text())
base_meta=json.loads((root/f'downloads/khar-tall-{args.base}.json').read_text())
old=(root/f'downloads/khar-tall-{args.base}.apk').read_bytes();new=(root/f'downloads/khar-tall-{version}.apk').read_bytes()
sha=lambda data:hashlib.sha256(data).hexdigest()
assert sha(old)==base_meta['sha256'] and sha(new)==metadata['sha256']
assert metadata['certificate_sha256']==base_meta['certificate_sha256']
block=64;anchors={}
for offset in range(0,len(old)-block+1,block):anchors.setdefault(old[offset:offset+block],offset)
ops=[];literal=bytearray();cursor=0
def flush():
 if literal:ops.append(['d',base64.b64encode(literal).decode()]);literal.clear()
while cursor<len(new):
 match=anchors.get(new[cursor:cursor+block])
 if match is None:literal.append(new[cursor]);cursor+=1;continue
 flush();length=block;limit=min(len(old)-match,len(new)-cursor)
 for step in [4096,64,1]:
  while length+step<=limit and old[match+length:match+length+step]==new[cursor+length:cursor+length+step]:length+=step
 ops.append(['c',match,length]);cursor+=length
flush()
rebuilt=b''.join(old[o[1]:o[1]+o[2]] if o[0]=='c' else base64.b64decode(o[1]) for o in ops)
assert rebuilt==new
patch=gzip.compress(json.dumps(ops,separators=(',',':')).encode(),mtime=0)
directory=root/'android-releases'/version;directory.mkdir(parents=True,exist_ok=True)
(directory/'patch.json.gz.b64').write_text(base64.b64encode(patch).decode()+'\n')
manifest={k:metadata[k] for k in ['file','size','sha256']}
manifest.update(format='delta-v1',base_version=args.base,base_sha256=sha(old),patch='patch.json.gz.b64',patch_sha256=sha(patch))
(directory/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(f'Packaged exact signed Android {version}: {len(ops)} operations, {len(patch)} patch bytes; APK {len(new)} bytes.')
