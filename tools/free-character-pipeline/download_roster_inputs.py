"""Recover the exact local-production inputs without a paid service or account."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import argparse,hashlib,json,subprocess,zipfile

p=argparse.ArgumentParser();p.add_argument('--out',type=Path,required=True);args=p.parse_args();root=args.out;root.mkdir(parents=True,exist_ok=True)
repo=Path(__file__).resolve().parents[2]
with zipfile.ZipFile(repo/'tools/free-character-pipeline/refined/soldado-refinado-pacote.zip') as z:
 for name in z.namelist():
  if '/inputs/' in name and not name.endswith('/'):
   relative=name.split('/inputs/',1)[1];dest=root/relative;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(z.read(name))
with zipfile.ZipFile(repo/'tools/free-character-pipeline/pilot/soldado-piloto-experimental.zip') as z:
 name=next(n for n in z.namelist() if n.endswith('/soldado-animated.glb'))
 (root/'equipment-source.glb').write_bytes(z.read(name))
base='https://raw.githubusercontent.com/Mesh2Motion/mesh2motion-app/ec0669b9a2258605c8df267e225cbfa64489a628/'
names=['idle-subtle','fighting-idle','walk-large','walk-female','walk-stealth','bow-pull-hold','bow-release','polearm-idle','staff-combo','spear-thrust','spell-simple-idle','spell-simple-shoot','two-handed-overhead-slam','attack-ground-pound','sword-regular-b']
tasks=[(base+'static/assets/human/animations/'+n+'.glb',root/'raw-clips'/(n+'.glb')) for n in names]
tasks += [(base+'static/assets/fox/animations/'+n+'.glb',root/'fox-clips-raw'/(n+'.glb')) for n in ['idle','walk','bite','fall','death']]
tasks += [(base+'static/assets/fox/variations/base.glb',root/'fox-base.glb'),(base+'static/assets/human/variations/mannequin-female.glb',root/'female-base.glb'),(base+'LICENSE-CC0.MD',root/'LICENSE-CC0.MD'),(base+'src/lib/RigConfig.ts',root/'RigConfig.ts'),(base+'static/assets/manifest.json',root/'asset-manifest.json'),('https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data/targets/macrodetails/caucasian-female-young.target',root/'female-young.target')]
def get(task):
 url,dest=task;dest.parent.mkdir(parents=True,exist_ok=True)
 if not dest.exists():subprocess.run(['curl','--fail','--location','--silent','--show-error','--max-time','90',url,'--output',str(dest)],check=True)
 return {'url':url,'file':str(dest.relative_to(root)),'bytes':dest.stat().st_size,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()}
with ThreadPoolExecutor(max_workers=6) as pool:records=list(pool.map(get,tasks))
(root/'sources.json').write_text(json.dumps(records,indent=2)+'\n');print('Recovered',len(records),'public CC0 source files',flush=True)
