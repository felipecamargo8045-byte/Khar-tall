"""Experimental Blender CPU rig and CC0 retargeting for the Soldier pilot.

This is a production-tool test, not approved game art. Skin weights, anatomy,
cloth separation and collisions need visual review before any integration.
"""
import argparse
import json
import math
from pathlib import Path
import sys
import bpy
from mathutils import Matrix,Vector
import numpy as np

p=argparse.ArgumentParser()
p.add_argument('--model',required=True);p.add_argument('--animations',required=True,type=Path);p.add_argument('--out',required=True,type=Path)
args=p.parse_args(sys.argv[sys.argv.index('--')+1:]);args.out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=args.model)
mesh=next(o for o in bpy.context.scene.objects if o.type=='MESH')
world=mesh.matrix_world.copy();mesh.parent=None;mesh.matrix_world=world
bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True);bpy.context.view_layer.objects.active=mesh
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
vertices=np.array([v.co[:] for v in mesh.data.vertices])
if not 1.7<float(np.ptp(vertices[:,2]))<1.9:raise ValueError('Rig expects the 1.8 m Soldier from texture_reference.py')
data=bpy.data.armatures.new('Soldado pilot skeleton');rig=bpy.data.objects.new('SoldadoRig',data);bpy.context.collection.objects.link(rig)
mesh.select_set(False);rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
spec={}
def bone(name,head,tail,parent=None):
    b=data.edit_bones.new(name);b.head=head;b.tail=tail
    if parent:b.parent=data.edit_bones[parent]
    spec[name]=(np.array(head),np.array(tail),parent)
bone('root',(0,0,0),(0,0,.15))
bone('pelvis',(0,-.14,.94),(0,-.16,1.06),'root')
bone('spine_01',(0,-.16,1.06),(0,-.18,1.19),'pelvis')
bone('spine_02',(0,-.18,1.19),(0,-.18,1.31),'spine_01')
bone('spine_03',(0,-.18,1.31),(0,-.18,1.43),'spine_02')
bone('neck_01',(0,-.18,1.43),(0,-.20,1.56),'spine_03')
bone('head',(0,-.20,1.56),(0,-.20,1.76),'neck_01')
for side,s in [('l',1),('r',-1)]:
    bone('clavicle_'+side,(s*.025,-.18,1.40),(s*.23,-.16,1.40),'spine_03')
    bone('upperarm_'+side,(s*.23,-.16,1.40),(s*.37,-.17,1.18),'clavicle_'+side)
    bone('lowerarm_'+side,(s*.37,-.17,1.18),(s*.46,-.19,.97),'upperarm_'+side)
    bone('hand_'+side,(s*.46,-.19,.97),(s*.48,-.20,.85),'lowerarm_'+side)
    bone('thigh_'+side,(s*.13,-.14,.93),(s*.18,-.17,.52),'pelvis')
    bone('calf_'+side,(s*.18,-.17,.52),(s*.18,-.16,.13),'thigh_'+side)
    bone('foot_'+side,(s*.18,-.16,.13),(s*.18,-.33,.06),'calf_'+side)
for column,x in enumerate([-.20,0,.20]):
    previous='spine_03'
    for segment,(z0,z1) in enumerate([(1.41,1.01),(1.01,.61),(.61,.20)]):
        name=f'cape_{column}_{segment}';y0=.03+(1.41-z0)*.28;y1=.03+(1.41-z1)*.28
        bone(name,(x,y0,z0),(x*1.7,y1,z1),previous);previous=name
bpy.ops.object.mode_set(mode='OBJECT')

# Read the baked red-cloth mask at each vertex. It is an initial weight guide,
# not a replacement for a clean separate cape mesh and hand-painted weights.
cloth=np.zeros(len(vertices));counts=np.zeros(len(vertices))
path=Path(args.model).with_name('soldado-cloth-mask.png')
if path.exists():
    image=bpy.data.images.load(str(path));w,h=image.size
    pixels=np.array(image.pixels[:],dtype=np.float32).reshape(h,w,4)
    for loop in mesh.data.loops:
        uv=mesh.data.uv_layers.active.data[loop.index].uv
        cloth[loop.vertex_index]+=pixels[min(h-1,max(0,int(uv.y*h))),min(w-1,max(0,int(uv.x*w))),0]
        counts[loop.vertex_index]+=1
    cloth/=np.maximum(counts,1)
names=[n for n in spec if n!='root'];groups={n:mesh.vertex_groups.new(name=n) for n in names}
def distance(v,a,b):
    t=np.clip(np.dot(v-a,b-a)/np.dot(b-a,b-a),0,1)
    return float(np.linalg.norm(v-a-t*(b-a)))
cape_vertices=0
for i,v in enumerate(vertices):
    side='l' if v[0]>0 else 'r'
    if cloth[i]>.6 and v[2]<1.40 and v[1]>-.03:
        candidates=[n for n in names if n.startswith('cape_')];cape_vertices+=1
    elif v[2]>1.5:candidates=['head','neck_01']
    elif abs(v[0])>.29 and v[2]>.76:candidates=[f'{part}_{side}' for part in ['clavicle','upperarm','lowerarm','hand']]
    elif v[2]<.86:candidates=[f'{part}_{side}' for part in ['thigh','calf','foot']]
    elif v[2]<1.04:candidates=['pelvis',f'thigh_{side}','spine_01']
    else:candidates=['pelvis','spine_01','spine_02','spine_03','neck_01']
    values=sorted((distance(v,*spec[n][:2]),n) for n in candidates)[:3]
    weights=np.maximum(np.exp(-np.array([d for d,n in values])**2/(.095**2)),1e-12);weights/=weights.sum()
    for (_,name),weight in zip(values,weights):
        if weight>.001:groups[name].add([i],float(weight),'REPLACE')
modifier=mesh.modifiers.new('Armature deformation','ARMATURE');modifier.object=rig;mesh.parent=rig
rig.animation_data_create();scene=bpy.context.scene;scene.render.fps=30
clips=[('Idle','idle-sword.glb'),('Walk','walk.glb'),('Attack','sword-regular-a.glb'),('Hit','hit-chest.glb'),('Death','death-a.glb')]
clip_info=[];actions={}
for label,filename in clips:
    before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(args.animations/filename));imported=set(bpy.data.objects)-before
    source=next(o for o in imported if o.type=='ARMATURE');source_action=source.animation_data.action;source_action.name='_source_'+label
    start,end=map(int,source_action.frame_range);rest={b.name:b.matrix_local.copy() for b in source.data.bones}
    target_rest={b.name:b.matrix_local.copy() for b in rig.data.bones}
    rig.animation_data.action=None;action=bpy.data.actions.new(label);rig.animation_data.action=action;actions[label]=action
    for frame in range(start,end+1):
        scene.frame_set(frame)
        for p in rig.pose.bones:p.matrix_basis.identity()
        for p in rig.pose.bones:
            name=p.name
            if name.startswith('cape_'):
                column,segment=map(int,name.split('_')[1:]);t=(frame-start)/30
                p.rotation_mode='XYZ';p.rotation_euler.x=.045*math.sin(t*4-segment*.8+column*.5);p.rotation_euler.z=.035*math.sin(t*2.5-segment*.7+column*.6)
                p.keyframe_insert('rotation_euler',frame=frame);continue
            src=source.pose.bones.get(name)
            if src is None:continue
            # Both rigs use Blender +Y along the bone. Applying a T-pose delta
            # to a lowered A-pose arm twice would fold it into the torso.
            desired=src.matrix.to_quaternion()
            if name=='root':desired=src.matrix.to_quaternion()@rest[name].to_quaternion().inverted()@target_rest[name].to_quaternion()
            position=(p.parent.matrix@target_rest[p.parent.name].inverted()@target_rest[name]).translation if p.parent else target_rest[name].translation.copy()
            if name=='pelvis':position+=src.matrix.translation-rest[name].translation
            p.matrix=Matrix.LocRotScale(position,desired,Vector((1,1,1)));p.rotation_mode='QUATERNION'
            p.keyframe_insert('rotation_quaternion',frame=frame);p.keyframe_insert('location',frame=frame);bpy.context.view_layer.update()
    action.use_fake_user=True;clip_info.append({'name':label,'seconds':round((end-start)/30,3)})
    for obj in imported:bpy.data.objects.remove(obj,do_unlink=True)
    bpy.data.actions.remove(source_action);print('BAKED',label,flush=True)
rig.animation_data.action=None
for label,_ in clips:
    action=actions[label];track=rig.animation_data.nla_tracks.new();track.name=label;track.strips.new(label,int(action.frame_range[0]),action);track.mute=True
bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig;scene.frame_set(1)
bpy.ops.export_scene.gltf(filepath=str(args.out/'soldado-animated.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS')
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'soldado-animated.blend'))
result={'status':'experimental; art and deformation need review','engine':'TripoSR CPU + Blender',
        'animation_source':'https://github.com/Mesh2Motion/mesh2motion-app','animation_license':'CC0 1.0',
        'bones':len(data.bones),'cape_vertices':cape_vertices,'cape_motion':'baked bones, not physical simulation',
        'clips':clip_info,'paid_calls':0,'review_required':['anatomy','weights','cape collisions','armor detail','equipment']}
(args.out/'provenance.json').write_text(json.dumps(result,indent=2));print(json.dumps(result),flush=True)
