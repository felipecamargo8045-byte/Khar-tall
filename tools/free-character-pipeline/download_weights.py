#!/usr/bin/env python3
"""Download public MIT TripoSR weights, with pinned revisions and SHA-256."""
import argparse
import hashlib
from pathlib import Path
import urllib.request

BASE='https://huggingface.co/stabilityai/TripoSR/resolve/5b521936b01fbe1890f6f9baed0254ab6351c04a/'
FILES=[('model.ckpt',BASE+'model.ckpt','429e2c6b22a0923967459de24d67f05962b235f79cde6b032aa7ed2ffcd970ee'),
       ('config.yaml',BASE+'config.yaml','74ca708ce086bf68e97709ea6b3d91f14717921c04691e84043f0eb8fcc68e62'),
       ('dino-config.json','https://huggingface.co/facebook/dino-vitb16/resolve/f205d5d8e640a89a2b8ef0369670dfc37cc07fc2/config.json','b87c0270b97db085fd82cf114a761fd0f62ae7914fbd407c752a2260646b689c')]

def digest(path):
    sha=hashlib.sha256()
    with path.open('rb') as file:
        while chunk:=file.read(4*1024*1024):sha.update(chunk)
    return sha.hexdigest()

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--out',type=Path,required=True)
    args=parser.parse_args();args.out.mkdir(parents=True,exist_ok=True)
    for name,url,expected in FILES:
        path=args.out/name
        if path.exists():
            if digest(path)!=expected:raise ValueError('SHA-256 mismatch: '+name)
            print('Verified existing',name,flush=True);continue
        print('Downloading public file',name,flush=True)
        temporary=path.with_suffix(path.suffix+'.part')
        with urllib.request.urlopen(url,timeout=90) as response,temporary.open('wb') as file:
            while chunk:=response.read(4*1024*1024):file.write(chunk)
        if digest(temporary)!=expected:
            temporary.unlink();raise ValueError('SHA-256 mismatch: '+name)
        temporary.replace(path);print('Verified',name,flush=True)
