#!/usr/bin/env python3
"""MIT TripoSR inference and mesh extraction on local CPU, with no image upload.

The official checkout is unchanged. scikit-image replaces only torchmcubes'
CUDA mesh extraction. A cached DINO config prevents runtime network downloads.
"""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import sys
import time
import types

# ONNX Runtime is imported indirectly by TSR's optional background-removal
# utility. Its documented startup switch must be set before any import, since
# calling disable_telemetry_events() later may already be too late.
os.environ['ORT_DISABLE_TELEMETRY']='1'
os.environ['HF_HUB_DISABLE_TELEMETRY']='1'
os.environ['HF_HUB_OFFLINE']='1'
os.environ['TRANSFORMERS_OFFLINE']='1'

import numpy as np
from PIL import Image
from skimage.measure import marching_cubes
import torch
import trimesh

def cpu_marching_cubes(level,threshold):
    vertices,faces,_,_=marching_cubes(np.ascontiguousarray(level.detach().cpu().numpy()),level=threshold)
    return torch.from_numpy(vertices[:,[2,1,0]].copy()),torch.from_numpy(faces.astype(np.int64).copy())

def main():
    p=argparse.ArgumentParser()
    for name in ['source-checkout','weights','image','out']:p.add_argument('--'+name,type=Path,required=True)
    p.add_argument('--resolution',type=int,choices=[128,192,256],default=192)
    args=p.parse_args();args.out.mkdir(parents=True,exist_ok=True)
    started=time.monotonic();torch.set_num_threads(6);torch.set_num_interop_threads(2)
    sys.path.insert(0,str(args.source_checkout))
    sys.modules['torchmcubes']=types.SimpleNamespace(marching_cubes=cpu_marching_cubes)
    import huggingface_hub
    def cached_download(repo_id,filename,**kwargs):
        if repo_id=='facebook/dino-vitb16' and filename=='config.json':return str(args.weights/'dino-config.json')
        raise RuntimeError('Offline inference refuses dependency download: '+repo_id+'/'+filename)
    huggingface_hub.hf_hub_download=cached_download
    from tsr.system import TSR
    from omegaconf import OmegaConf
    config=OmegaConf.load(args.weights/'config.yaml');OmegaConf.resolve(config)
    print(json.dumps({'stage':'load','device':'cpu','paid_calls':0}),flush=True)
    model=TSR(config)
    checkpoint=torch.load(args.weights/'model.ckpt',map_location='cpu',weights_only=True,mmap=True)
    model.load_state_dict(checkpoint,assign=True);del checkpoint
    model.eval();model.renderer.set_chunk_size(16384)
    image=Image.open(args.image).convert('RGBA');box=image.getchannel('A').getbbox()
    if box is None:raise ValueError('Empty reference')
    image=image.crop(box);image.thumbnail((448,448),Image.Resampling.LANCZOS)
    rgb=Image.new('RGB',(512,512),(128,128,128));rgb.paste(image,((512-image.width)//2,(512-image.height)//2),image)
    rgb.save(args.out/'input.png')
    with torch.inference_mode():
        print(json.dumps({'stage':'encode','elapsed':round(time.monotonic()-started,1)}),flush=True)
        codes=model([rgb],device='cpu');torch.save(codes,args.out/'scene-codes.pt')
        print(json.dumps({'stage':'extract','elapsed':round(time.monotonic()-started,1)}),flush=True)
        mesh=model.extract_mesh(codes,has_vertex_color=True,resolution=args.resolution)[0]
    trimesh.repair.fix_normals(mesh)
    colors=np.asarray(mesh.visual.vertex_colors).astype(np.float32)/255
    colors[:,:3]=np.where(colors[:,:3]<=.04045,colors[:,:3]/12.92,((colors[:,:3]+.055)/1.055)**2.4)
    mesh.visual.vertex_colors=np.clip(colors*255,0,255).astype(np.uint8)
    vertical=int(np.argmax(np.ptp(mesh.bounds,axis=0)))
    if vertical==2:mesh.apply_transform(trimesh.transformations.rotation_matrix(-math.pi/2,[1,0,0]))
    elif vertical!=1:raise ValueError('Unexpected humanoid orientation')
    output=args.out/'soldado-cpu.glb';mesh.export(output)
    result={'engine':'TripoSR','execution':'local CPU; no remote inference',
            'weights_sha256':'429e2c6b22a0923967459de24d67f05962b235f79cde6b032aa7ed2ffcd970ee',
            'source_image_sha256':hashlib.sha256(args.image.read_bytes()).hexdigest(),
            'license':'https://github.com/VAST-AI-Research/TripoSR/blob/main/LICENSE',
            'vertices':len(mesh.vertices),'triangles':len(mesh.faces),'bytes':output.stat().st_size,
            'elapsed_seconds':round(time.monotonic()-started,1),'reused_scene_codes':False,
            'rigged':False,'paid_calls':0,'status':'pilot; requires art cleanup'}
    (args.out/'provenance.json').write_text(json.dumps(result,indent=2));print(json.dumps(result),flush=True)

if __name__=='__main__':main()
