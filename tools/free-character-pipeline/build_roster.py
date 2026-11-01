"""Build all eight editable, animated character assets with two CPU workers."""
import argparse,json,subprocess
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
p=argparse.ArgumentParser();p.add_argument('--blender',required=True);p.add_argument('--inputs',type=Path,required=True);p.add_argument('--out',type=Path,required=True);p.add_argument('--workers',type=int,default=2);p.add_argument('--only',nargs='*');args=p.parse_args()
scripts=Path(__file__).resolve().parent;args.out.mkdir(parents=True,exist_ok=True)
def build(kind):
 dest=args.out/kind;dest.mkdir(exist_ok=True);wolf=kind=='lobo';female=kind=='liliti'
 cmd=[args.blender,'--background','--factory-startup','--threads','2','--python-exit-code','1','--python',str(scripts/('refine_wolf.py' if wolf else 'refine_knight.py')),'--','--base',str(args.inputs/('fox-base.glb' if wolf else 'female-base.glb' if female else 'base.glb')),'--clips',str(args.inputs/('fox-clips' if wolf else 'clips')),'--out',str(dest)]
 if not wolf:cmd+=['--previous',str(args.inputs/'equipment-source.glb'),'--head-base',str(args.inputs/'makehuman-base.obj'),'--head-morph',str(args.inputs/('female-young.target' if female else 'male-young.target')),'--character',kind]
 with (dest/'build.log').open('w') as log:r=subprocess.run(cmd,stdout=log,stderr=subprocess.STDOUT)
 result={'character':kind,'exit_code':r.returncode};print(json.dumps(result),flush=True);return result
with ThreadPoolExecutor(max_workers=max(1,min(2,args.workers))) as pool:results=list(pool.map(build,args.only or ['lobo','arqueiro','soldado','colosso','guardiao','batedor','rei','liliti']))
(args.out/'build-status.json').write_text(json.dumps(results,indent=2)+'\n')
raise SystemExit(0 if all(r['exit_code']==0 for r in results) else 1)
