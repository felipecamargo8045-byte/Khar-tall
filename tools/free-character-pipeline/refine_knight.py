"""Rebuild the Soldier on a clean CC0 weighted human base, entirely in Blender.

Preserves native Mesh2Motion skinning/actions instead of retargeting a fused
single-image body. Armor, trims and cape are modeled as actual geometry.
No network, generator API, account or GPU is used by this script.
"""
import argparse
import json
import math
from pathlib import Path
import sys
import bpy
import bmesh
import numpy as np
from mathutils import Vector,Matrix,Quaternion
from mathutils.bvhtree import BVHTree

p=argparse.ArgumentParser()
for name in ['base','previous','clips','out']:p.add_argument('--'+name,type=Path,required=True)
p.add_argument('--head-base',type=Path)
p.add_argument('--head-morph',type=Path)
p.add_argument('--character',choices=['soldado','arqueiro','guardiao','colosso','batedor','rei','liliti'],default='soldado')
args=p.parse_args(sys.argv[sys.argv.index('--')+1:]);args.out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(args.base))
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');rig.name='SoldadoRig'
body=next(o for o in bpy.context.scene.objects if o.type=='MESH' and not o.hide_render);body.name='SoldadoBody'
vertices=np.array([v.co[:] for v in body.data.vertices])
bvh=BVHTree.FromPolygons([Vector(v) for v in vertices],[list(poly.vertices) for poly in body.data.polygons])
meshes=[body]

def material(name,color,metal=0,rough=.6):
    m=bpy.data.materials.new(name);m.use_nodes=True;s=m.node_tree.nodes['Principled BSDF']
    s.inputs['Base Color'].default_value=(*color,1);s.inputs['Metallic'].default_value=metal;s.inputs['Roughness'].default_value=rough
    return m
steel=material('Azul-marinho - aco temperado',(.025,.040,.058),.88,.31)
edge=material('Aco polido nas arestas',(.12,.16,.20),.88,.25)
gold=material('Ouro antigo gravado',(.43,.255,.075),.82,.30)
cloth=material('Tecido escuro sob a armadura',(.012,.019,.028),.01,.86)
leather=material('Couro castanho escuro',(.035,.016,.010),.02,.75)
wine=material('Capa vinho',(.105,.009,.017),.01,.83)
wine['skin_region']='cloth';cloth['skin_region']='cloth'
face=material('Rosto nas sombras do capuz',(.055,.035,.026),0,.75)
body.data.materials.clear();body.data.materials.append(cloth);body.data.materials.append(face);body.data.materials.append(leather)
for poly in body.data.polygons:
    c=poly.center
    poly.material_index=1 if c.z>1.58 else (2 if c.z<.12 else 0)
    poly.use_smooth=True

def bind(obj,bone):
    for mod in list(obj.modifiers):
        if mod.type=='ARMATURE':obj.modifiers.remove(mod)
    obj.vertex_groups.clear();g=obj.vertex_groups.new(name=bone);g.add(list(range(len(obj.data.vertices))),1,'REPLACE')
    mod=obj.modifiers.new('Articulacao rigida da placa','ARMATURE');mod.object=rig;obj.parent=rig
    meshes.append(obj);return obj

def mesh_obj(name,points,faces,mat,bone,solid=0,bevel=0):
    data=bpy.data.meshes.new(name);data.from_pydata(points,[],faces);data.update()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);data.materials.append(mat)
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free()
    for poly in data.polygons:poly.use_smooth=True
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    if solid:
        mod=obj.modifiers.new('Espessura real','SOLIDIFY');mod.thickness=solid;mod.offset=0
        bpy.ops.object.modifier_apply(modifier=mod.name)
    if bevel:
        mod=obj.modifiers.new('Arestas lapidadas','BEVEL');mod.width=bevel;mod.segments=2
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return bind(obj,bone)

def trim(name,points,bone,radius=.0022,mat=gold,closed=False):
    if len(points)<2:return
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=2
    curve.bevel_depth=radius;curve.bevel_resolution=1
    spline=curve.splines.new('POLY');spline.points.add(len(points)-1)
    for dest,co in zip(spline.points,points):dest.co=(*co,1)
    spline.use_cyclic_u=closed
    obj=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(obj);curve.materials.append(mat)
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj;bpy.ops.object.convert(target='MESH')
    return bind(bpy.context.object,bone)

def shell(name,predicate,bone,offset=.015,mat=steel,outline=True):
    selected=[poly for poly in body.data.polygons if predicate(poly.center)]
    used=sorted({i for poly in selected for i in poly.vertices});mapping={old:i for i,old in enumerate(used)}
    points=[body.data.vertices[i].co+body.data.vertices[i].normal*offset for i in used]
    faces=[tuple(mapping[i] for i in poly.vertices) for poly in selected]
    obj=mesh_obj(name,points,faces,mat,bone,solid=.004,bevel=.0015)
    if outline:
        counts={}
        for f in faces:
            for a,b in zip(f,f[1:]+f[:1]):
                key=tuple(sorted((a,b)));counts[key]=counts.get(key,0)+1
        # Edge pairs are kept in a single curve object for economical export.
        c=bpy.data.curves.new(name+' gold rim','CURVE');c.dimensions='3D';c.bevel_depth=.0017;c.bevel_resolution=1
        for (a,b),count in counts.items():
            if count!=1:continue
            s=c.splines.new('POLY');s.points.add(1)
            for target,index in zip(s.points,[a,b]):target.co=(*points[index],1)
        o=bpy.data.objects.new(name+' gold rim',c);bpy.context.collection.objects.link(o);c.materials.append(gold)
        bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');bind(bpy.context.object,bone)
    return obj

def front(x,z,offset=.025):
    hit=bvh.ray_cast(Vector((x,-2,z)),Vector((0,1,0)))[0]
    return (x,hit.y-offset if hit else -.14,z)

# Fitted surfaces follow the actual anatomy rather than boxes or cylinders.
shell('Couraca esculpida',lambda c:1.08<c.z<1.405 and abs(c.x)<.19,'spine_03',.022)
for side,s in [('l',1),('r',-1)]:
    shell('Coxa blindada '+side,lambda c,s=s:.60<c.z<.89 and c.x*s>.015,'thigh_'+side,.012)
    shell('Greva anatomica '+side,lambda c,s=s:.13<c.z<.48 and c.x*s>.01,'calf_'+side,.011)
    shell('Sabatons '+side,lambda c,s=s:c.z<.125 and c.x*s>.02,'foot_'+side,.005,edge)
    shell('Bracelete '+side,lambda c,s=s:.50<c.x*s<.70 and 1.34<c.z<1.54,'lowerarm_'+side,.012)

    # Three overlapping curved lamellae on each pauldron.
    for layer,(x0,x1,r) in enumerate([(.18,.29,.155),(.255,.345,.14),(.315,.40,.12)]):
        points=[];faces=[];steps=14
        for j,x in enumerate([x0,x1]):
            for i in range(steps+1):
                angle=-math.pi*.58+i/steps*math.pi*1.16
                points.append((s*x,.065+math.sin(angle)*r,1.442+math.cos(angle)*r*(1-j*.1)))
        for i in range(steps):faces.append((i,i+1,steps+2+i,steps+1+i))
        bone='upperarm_'+side
        mesh_obj('Ombreira lamelar '+side+str(layer),points,faces,steel,bone,.007,.002)
        trim('Borda dourada ombreira',points[steps+1:],bone,.0025)
        trim('Linha gravada ombreira',points[:steps+1],bone,.0015,edge)

    # Angular knee and tasset plates with raised central ridges.
    for name,z0,z1,width,bone in [('Joelheira',.46,.60,.085,'calf_'+side),('Tasset',.80,1.01,.085,'thigh_'+side)]:
        cx=s*(.095 if name=='Joelheira' else .11)
        outline=[(cx-width*.7,z1),(cx+width*.7,z1),(cx+width,z0+.06),(cx,z0),(cx-width,z0+.06)]
        boundary=[front(x,z,.034) for x,z in outline];center=front(cx,(z0+z1)/2,.055)
        points=[center]+boundary;faces=[(0,1+i,1+(i+1)%5) for i in range(5)]
        mesh_obj(name+' '+side,points,faces,steel,bone,.004,.0015)
        trim(name+' filete',boundary,bone,.0021,closed=True)

# Curved heraldic etching on the breastplate, following its actual surface.
trim('Duplo V real',[front(x,z,.027) for x,z in [(-.14,1.365),(-.095,1.315),(0,1.275),(.095,1.315),(.14,1.365)]],'spine_03',.0025)
trim('Friso interno',[front(x,z,.027) for x,z in [(-.12,1.355),(-.075,1.325),(0,1.297),(.075,1.325),(.12,1.355)]],'spine_03',.0013)
for sign in [-1,1]:
    for row in range(3):
        trim('Arabesco couraca',[front(sign*x,z,.028) for x,z in [(.025,1.225+row*.025),(.055,1.235+row*.025),(.09,1.22+row*.025),(.12,1.235+row*.025)]],'spine_03',.0012)
star=[]
for i in range(16):
    a=i*math.pi/8;r=.035 if i%2==0 else .012
    star.append(front(math.sin(a)*r,1.35+math.cos(a)*r,.033))
trim('Rosa dos ventos real',star,'spine_03',.0018,closed=True)

# Structured leather belt, curved around the waist.
points=[];faces=[];steps=40
for z in [1.015,1.062]:
    for i in range(steps):
        a=i*math.tau/steps;points.append((.163*math.sin(a),.145*math.cos(a),z))
for i in range(steps):faces.append((i,(i+1)%steps,(i+1)%steps+steps,i+steps))
mesh_obj('Cinto',points,faces,leather,'pelvis',.006)
for z in [1.017,1.060]:trim('Friso do cinto',[(.166*math.sin(i*math.tau/steps),.148*math.cos(i*math.tau/steps),z) for i in range(steps)],'pelvis',.0021,closed=True)
trim('Fivela',[(-.027,-.152,1.065),(.027,-.152,1.065),(.038,-.152,1.038),(0,-.158,1.008),(-.038,-.152,1.038)],'pelvis',.004,closed=True)

# Equipment is transferred between the exact bind frames. The original
# reconstruction is never reused for the torso or limbs.
before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(args.previous));old=set(bpy.data.objects)-before
old_rig=next(o for o in old if o.type=='ARMATURE')
shield_source=None;shield_object=None
for prefix,bone in [('SoldadoSword','hand_r'),('SoldadoShield','hand_l')]:
    original=next(o for o in old if o.type=='MESH' and o.name.startswith(prefix))
    data=original.data.copy();obj=bpy.data.objects.new(prefix+' refinado',data);bpy.context.collection.objects.link(obj)
    silver=material('Lamina de aco claro',(.34,.40,.46),.92,.26) if prefix=='SoldadoSword' else None
    for index,original_material in enumerate(data.materials):
        name=original_material.name.lower()
        data.materials[index]=gold if 'gold' in name else (leather if 'leather' in name else ((silver or edge) if 'silver' in name else steel))
    change=rig.data.bones[bone].matrix_local@old_rig.data.bones[bone].matrix_local.inverted()
    for v in data.vertices:v.co=change@v.co
    if prefix=='SoldadoSword':
        grip_shift=rig.data.bones[bone].matrix_local.to_3x3().col[1].normalized()*.055
        for v in data.vertices:v.co+=grip_shift
    bind(obj,bone)
    if prefix=='SoldadoShield':
        shield_source=[v.co.copy()-Vector((.49,-.30,1.10)) for v in original.data.vertices]
        shield_object=obj
for obj in old:bpy.data.objects.remove(obj,do_unlink=True)

# A clean anatomical face replaces the featureless mannequin head. Only the
# CC0 body group is read; helper geometry and unrelated anatomy are excluded.
if args.head_base:
    source_points=[];source_faces=[];source_groups={};group=''
    for line in args.head_base.read_text().splitlines():
        if line.startswith('v '):source_points.append(tuple(map(float,line.split()[1:4])))
        elif line.startswith('g '):group=line[2:]
        elif line.startswith('f '):
            f=[int(x.split('/')[0])-1 for x in line.split()[1:]]
            source_groups.setdefault(group,[]).append(f)
            if group=='body':source_faces.append(f)
    points=np.array(source_points)
    if args.head_morph:
        for line in args.head_morph.read_text().splitlines():
            if not line.strip() or line.startswith('#'):continue
            values=line.split()
            if len(values)==4:points[int(values[0])]+=np.array(list(map(float,values[1:])))*.80
    skin_indices=sorted({i for f in source_faces for i in f})
    ymin,ymax=points[skin_indices,1].min(),points[skin_indices,1].max();scale=1.829/(ymax-ymin)
    mapped=np.column_stack((points[:,0]*scale,-points[:,2]*scale,(points[:,1]-ymin)*scale))
    faces=[f for f in source_faces if min(mapped[i,2] for i in f)>1.565]
    used=sorted({i for f in faces for i in f});mapping={old:i for i,old in enumerate(used)}
    skin=material('Pele humana sob luz suave',(.23,.125,.078),0,.65)
    mesh_obj('Rosto anatomico',mapped[used],[tuple(mapping[i] for i in f) for f in faces],skin,'head')
    bm=bmesh.new();bm.from_mesh(body.data)
    bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.calc_center_median().z>1.525],context='FACES')
    bm.to_mesh(body.data);bm.free()
    white=material('Olhos naturais',(.38,.34,.29),0,.37);iris=material('Iris castanho escuro',(.022,.012,.007),0,.28)
    for side in ['l','r']:
        eye_faces=source_groups['joint-'+side+'-eye'];eye_ids=sorted({i for f in eye_faces for i in f});center=mapped[eye_ids].mean(axis=0)
        for label,radius,offset,mat in [('Olho',.0115,0,white),('Iris',.0043,-.0109,iris)]:
            bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=radius,location=(center[0],center[1]+offset,center[2]))
            obj=bpy.context.object;obj.name=label+' '+side
            if label=='Iris':obj.scale.y=.20
            bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);obj.data.materials.append(mat)
            for poly in obj.data.polygons:poly.use_smooth=True
            bind(obj,'head')
        sign=1 if center[0]>0 else -1
        trim('Sobrancelha',[tuple(center+np.array([sign*x,-.011,z])) for x,z in [(-.013,.018),(0,.022),(.015,.017)]],'head',.0018,leather)

# Tailored hood: open around the face, closed over the scalp, with modeled
# fabric folds and a thin gold seam. It cannot expose the mannequin scalp.
hood_rows=[(1.49,.12,.15,.035,.65),(1.56,.14,.18,.020,.67),(1.66,.145,.19,.015,.65),(1.75,.135,.20,.015,.48),(1.81,.095,.20,.010,.18),(1.85,.060,.165,.005,0),(1.88,.004,.010,-.020,0)]
points=[];faces=[];segments=36
for row,(z,rx,ry,cy,opening) in enumerate(hood_rows):
    for i in range(segments+1):
        a=opening+(math.tau-2*opening)*i/segments;fold=1+.025*math.sin(a*5+row*.5)
        points.append((rx*math.sin(a)*fold,cy-ry*math.cos(a)*fold,z+.004*math.sin(a*3)))
for j in range(len(hood_rows)-1):
    for i in range(segments):
        a=j*(segments+1)+i;faces.append((a,a+1,a+segments+2,a+segments+1))
mesh_obj('Capuz de tecido modelado',points,faces,wine,'head',.003)
for column in [0,segments]:trim('Costura dourada do capuz',[points[row*(segments+1)+column] for row in range(len(hood_rows))],'head',.0016)
for lane in [.18,.82]:
    col=int(segments*lane);trim('Dobra costurada do capuz',[points[row*(segments+1)+col] for row in range(len(hood_rows))],'head',.0007,leather)

points=[];faces=[];segments=40
for row,(z,rx,ry) in enumerate([(1.535,.105,.125),(1.485,.16,.15),(1.445,.225,.16)]):
    for i in range(segments):
        a=i*math.tau/segments;points.append((rx*math.sin(a),.02-ry*math.cos(a),z-.023*math.cos(a)*(row/2)))
for j in range(2):
    for i in range(segments):
        a=j*segments+i;b=j*segments+(i+1)%segments;faces.append((a,b,b+segments,a+segments))
mesh_obj('Gola drapeada do capuz',points,faces,wine,'neck_01',.003)
trim('Bainha dourada da gola',points[2*segments:],'neck_01',.0018,closed=True)

# Cape uses its own continuous mesh and three three-link bone chains.
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
cape_spec={}
for column,x in enumerate([-.18,0,.18]):
    parent=rig.data.edit_bones['spine_03']
    for segment,(z0,z1) in enumerate([(1.46,1.06),(1.06,.66),(.66,.18)]):
        name=f'cape_{column}_{segment}';b=rig.data.edit_bones.new(name)
        b.head=(x,.12+(1.46-z0)*.22,z0);b.tail=(x*1.65,.12+(1.46-z1)*.22,z1);b.parent=parent;parent=b
        cape_spec[name]=(np.array(b.head),np.array(b.tail))
bpy.ops.object.mode_set(mode='OBJECT')
points=[];faces=[];cols=30;rows=24
for j in range(rows+1):
    t=j/rows
    for i in range(cols+1):
        s=i/cols*2-1;points.append((s*(.21+.25*t),.13+.27*t+.022*math.sin(s*math.pi*3)*(.2+.8*t),1.45-1.26*t+.02*math.cos(s*math.pi*2)*t))
for j in range(rows):
    for i in range(cols):
        a=j*(cols+1)+i;faces.append((a,a+1,a+cols+2,a+cols+1))
cape=mesh_obj('Capa continua',points,faces,wine,'spine_03');cape.vertex_groups.clear()
cape.data.materials.append(gold)
for poly in cape.data.polygons:poly.material_index=1 if poly.index%cols in [0,cols-1] or poly.index//cols==rows-1 else 0
groups={n:cape.vertex_groups.new(name=n) for n in cape_spec}
for i,v in enumerate(np.array(points)):
    distances=[]
    for name,(a,b) in cape_spec.items():
        t=np.clip(np.dot(v-a,b-a)/np.dot(b-a,b-a),0,1);distances.append((np.linalg.norm(v-a-t*(b-a)),name))
    nearest=sorted(distances)[:4];weights=np.exp(-np.array([d for d,n in nearest])**2/.025);weights/=weights.sum()
    for (_,name),w in zip(nearest,weights):groups[name].add([i],float(w),'REPLACE')

# Native skeleton and actions: no T/A-pose orientation approximation.
motion={'soldado':('idle-sword','walk','sword-regular-a'),'arqueiro':('bow-pull-hold','walk-stealth','bow-release'),
 'guardiao':('polearm-idle','walk','spear-thrust'),'colosso':('fighting-idle','walk-large','attack-ground-pound'),
 'batedor':('spell-simple-idle','walk-stealth','spell-simple-shoot'),'rei':('idle-sword','walk','sword-regular-b'),
 'liliti':('spell-simple-idle','walk-female','spell-simple-shoot')}[args.character]
clips=[('Idle',motion[0]),('Walk',motion[1]),('Attack',motion[2]),('Hit','hit-chest'),('Death','death-a')]
rig.animation_data_create();bpy.context.scene.render.fps=30;actions={}
for label,file in clips:
    before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(args.clips/(file+'.glb')));temporary=set(bpy.data.objects)-before
    source=next(o for o in temporary if o.type=='ARMATURE');action=source.animation_data.action
    action.name=label;action.use_fake_user=True;actions[label]=action;rig.animation_data.action=action
    if action.slots:rig.animation_data.action_slot=action.slots[0]
    start,end=map(int,action.frame_range)
    for frame_number in range(start,end+1):
        bpy.context.scene.frame_set(frame_number);t=(frame_number-start)/30
        for name in cape_spec:
            column,segment=map(int,name.split('_')[1:]);b=rig.pose.bones[name];b.rotation_mode='XYZ'
            wind_x=.035*math.sin(t*3.7-segment*.8+column*.4);wind_z=.025*math.sin(t*2.8-segment*.6+column*.6)
            if segment==0 and label!='Death':
                parent=b.parent;delta=parent.matrix.to_quaternion()@parent.bone.matrix_local.to_quaternion().inverted()
                forward=delta@Vector((0,-1,0));yaw=Quaternion(Vector((0,0,1)),math.atan2(forward.x,-forward.y))
                residual=yaw.inverted()@delta;gravity=yaw@Quaternion().slerp(residual,.30)
                anchor=b.matrix.translation.copy();rotation=gravity@b.bone.matrix_local.to_quaternion()@Quaternion(Vector((1,0,0)),wind_x)
                b.matrix=Matrix.LocRotScale(anchor,rotation,Vector((1,1,1)));b.rotation_mode='QUATERNION'
                b.keyframe_insert('rotation_quaternion',frame=frame_number);b.keyframe_insert('location',frame=frame_number)
            else:
                b.rotation_euler.x=wind_x;b.rotation_euler.z=wind_z;b.keyframe_insert('rotation_euler',frame=frame_number)
            bpy.context.view_layer.update()
    for obj in temporary:bpy.data.objects.remove(obj,do_unlink=True)
    print('NATIVE CLIP',label,flush=True)
rig.animation_data.action=None
for name,action in actions.items():
    track=rig.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,int(action.frame_range[0]),action);track.mute=True

# Set the shield's heraldic front in a real gripping pose, then transform
# that geometry back into the bind frame. Later clips inherit the hand motion.
rig.animation_data.action=actions['Idle']
if actions['Idle'].slots:rig.animation_data.action_slot=actions['Idle'].slots[0]
bpy.context.scene.frame_set(0);bpy.context.view_layer.update()
if shield_source is not None:
    hand=rig.pose.bones['hand_l'];center=hand.matrix.translation+Vector((.015,-.075,.12))
    to_rest=rig.data.bones['hand_l'].matrix_local@hand.matrix.inverted()
    turn=Matrix.Rotation(math.radians(-12),3,'Z')
    for vertex,point in zip(shield_object.data.vertices,shield_source):vertex.co=to_rest@(center+turn@point)
rig.animation_data.action=None

# Join rigid fitted pieces while preserving per-bone vertex groups. Keep the
# hood UV in the same channel so its PBR maps survive the join.
if args.character!='soldado':
    sys.path.insert(0,str(Path(__file__).parent))
    from roster_variants import apply_variant
    apply_variant(globals())
for obj in meshes:
    if obj.data.uv_layers and body.data.uv_layers:obj.data.uv_layers.active.name=body.data.uv_layers.active.name
bpy.ops.object.select_all(action='DESELECT')
for obj in meshes:obj.select_set(True)
bpy.context.view_layer.objects.active=body;bpy.ops.object.join();body.name=args.character+'Refinado'
bpy.ops.object.select_all(action='DESELECT');body.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
rig['card_id']=args.character;rig['revision']=3
bpy.ops.export_scene.gltf(filepath=str(args.out/(args.character+'-refinado.glb')),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_extras=True)
rig.animation_data.action=actions['Idle']
if actions['Idle'].slots:rig.animation_data.action_slot=actions['Idle'].slots[0]
bpy.context.scene.frame_set(1);bpy.data.orphans_purge(do_local_ids=True,do_linked_ids=False,do_recursive=True)
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(args.out/(args.character+'-refinado.blend')),compress=True)
rig.animation_data.action=None
for pose in rig.pose.bones:pose.matrix_basis.identity()
bpy.context.view_layer.objects.active=body
decimate=body.modifiers.new('Detalhe reduzido para batalha','DECIMATE');decimate.ratio=.28;decimate.use_collapse_triangulate=True
body.modifiers.move(len(body.modifiers)-1,0)
bpy.ops.object.modifier_apply(modifier=decimate.name)
bpy.ops.export_scene.gltf(filepath=str(args.out/(args.character+'-refinado-campo.glb')),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_extras=True)
info={'body_source':'Mesh2Motion '+args.base.name+', CC0','native_skinning':True,'body_vertices_source':len(vertices),
      'armor':'anatomically fitted modeled plate surfaces, gold trims and heraldic etching',
      'hood':'tailored continuous cloth geometry with gold seams',
      'head_source':'MakeHuman base body group only, CC0' if args.head_base else 'Mesh2Motion mannequin',
      'cape':'continuous modeled cloth with nine additional bones','clips':list(actions),
      'character':args.character,'motion_sources':list(motion),'paid_api_calls':0,'quality_status':'requires rendered visual review before game integration'}
(args.out/'provenance.json').write_text(json.dumps(info,ensure_ascii=False,indent=2));print(json.dumps(info),flush=True)
