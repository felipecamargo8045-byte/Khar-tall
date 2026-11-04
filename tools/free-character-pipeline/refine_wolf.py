"""Armored wolf on a native weighted CC0 quadruped, built entirely locally."""
import argparse,json,math,sys
from pathlib import Path
import bpy,bmesh
from mathutils import Vector
p=argparse.ArgumentParser();p.add_argument('--base',type=Path,required=True);p.add_argument('--clips',type=Path,required=True);p.add_argument('--out',type=Path,required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);a.out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(a.base))
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');body=next(o for o in bpy.context.scene.objects if o.type=='MESH' and not o.hide_render);rig.name='LoboRig';parts=[body]
def material(name,color,metal=0,rough=.7,dye=False):
 m=bpy.data.materials.new(name);m.use_nodes=True;s=m.node_tree.nodes['Principled BSDF'];s.inputs['Base Color'].default_value=(*color,1);s.inputs['Metallic'].default_value=metal;s.inputs['Roughness'].default_value=rough
 if dye:m['skin_region']='cloth'
 return m
fur=material('Pelagem cinza escura',(.035,.045,.049),0,.87);dark=material('Pelagem profunda e nariz',(.009,.013,.016),0,.78);steel=material('Armadura azul-marinho do Lobo',(.023,.037,.052),.83,.37);gold=material('Relevos dourados do Lobo',(.43,.26,.078),.8,.31);ivory=material('Presas de marfim',(.40,.35,.26),0,.48);eye=material('Olhos ambar',(.50,.25,.035),.18,.3);cloth=material('Tecido de equipe do Lobo',(.1,.012,.022),.01,.85,True)
# The source is used for its native quadruped rig. Its deliberately oversized
# cartoon head is replaced by modeled canine anatomy with a tapered muzzle.
bpy.data.objects.remove(body,do_unlink=True);parts=[]
def mesh(name,points,faces,mat,bone):
 d=bpy.data.meshes.new(name);d.from_pydata(points,[],faces);d.update();d.materials.append(mat);bm=bmesh.new();bm.from_mesh(d);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(d);bm.free()
 for f in d.polygons:f.use_smooth=True
 o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.parent=rig
 if isinstance(bone,str):
  g=o.vertex_groups.new(name=bone);g.add(list(range(len(d.vertices))),1,'REPLACE')
 else:
  groups={n:o.vertex_groups.new(name=n) for n in bone}
  for vertex in d.vertices:
   nearest=[]
   for n in bone:
    b=rig.data.bones[n];start=b.head_local;axis=b.tail_local-start;t=max(0,min(1,(vertex.co-start).dot(axis)/max(axis.length_squared,1e-8)));nearest.append(((vertex.co-start-axis*t).length,n))
   nearest.sort();weights=[math.exp(-distance*distance/.035) for distance,n in nearest[:2]];total=sum(weights)
   if total<1e-20:weights=[1,0];total=1
   for (distance,n),w in zip(nearest[:2],weights):groups[n].add([vertex.index],w/total,'REPLACE')
 m=o.modifiers.new('Pele articulada','ARMATURE');m.object=rig;parts.append(o);return o
def strand(name,points,radii,mat,bone,n=8):
 vertices=[]
 for j,p in enumerate(points):
  c=Vector(p);t=(Vector(points[min(j+1,len(points)-1)])-Vector(points[max(0,j-1)])).normalized();u=t.cross(Vector((0,1,0)))
  if u.length<.01:u=t.cross(Vector((1,0,0)))
  u.normalize();v=t.cross(u).normalized();vertices.extend(c+radii[j]*(math.cos(i*math.tau/n)*u+math.sin(i*math.tau/n)*v) for i in range(n))
 faces=[]
 for j in range(len(points)-1):
  for i in range(n):b=j*n+i;faces.append((b,j*n+(i+1)%n,(j+1)*n+(i+1)%n,b+n))
 faces.extend([tuple(range(n-1,-1,-1)),tuple((len(points)-1)*n+i for i in range(n))]);return mesh(name,vertices,faces,mat,bone)
def line(name,points,mat,bone,r=.003):return strand(name,points,[r]*len(points),mat,bone)
def ball(name,center,size,mat,bone):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=10,radius=1,location=center);o=bpy.context.object;o.scale=size;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 vertices=[v.co.copy() for v in o.data.vertices];faces=[list(f.vertices) for f in o.data.polygons];bpy.data.objects.remove(o,do_unlink=True);return mesh(name,vertices,faces,mat,bone)
def loft_y(name,rings,mat,bone,n=32):
 vertices=[(rx*math.cos(i*math.tau/n),y,cz+rz*math.sin(i*math.tau/n)) for y,rx,rz,cz in rings for i in range(n)]
 faces=[]
 for j in range(len(rings)-1):
  for i in range(n):b=j*n+i;faces.append((b,j*n+(i+1)%n,(j+1)*n+(i+1)%n,b+n))
 faces.extend([tuple(range(n-1,-1,-1)),tuple((len(rings)-1)*n+i for i in range(n))]);return mesh(name,vertices,faces,mat,bone)
body=loft_y('Torax e flancos do Lobo',[(-.70,.09,.12,1.12),(-.53,.20,.25,1.03),(-.30,.24,.31,.99),(0,.235,.29,.98),(.30,.21,.26,.98),(.57,.19,.23,1.01),(.80,.08,.13,1.045)],fur,['Hips','Spine_1','Spine_2','Spine_3'])
strand('Pescoco muscular',[(0,-.48,1.12),(0,-.72,1.21),(0,-.94,1.33)],[.21,.19,.13],fur,['Spine_3','Head'],24)
loft_y('Cranio e focinho',[(-.84,.075,.11,1.34),(-.97,.145,.16,1.36),(-1.10,.13,.13,1.33),(-1.25,.082,.075,1.255),(-1.43,.055,.044,1.245)],fur,'Head',32)
loft_y('Interior da boca',[(-1.12,.075,.033,1.175),(-1.38,.052,.022,1.172)],dark,'Head',24)
loft_y('Mandibula articulada',[(-1.07,.076,.045,1.14),(-1.25,.075,.037,1.135),(-1.41,.050,.025,1.15)],fur,'Chin',24)
for side,sign in [('L',1),('R',-1)]:
 for prefix in ['Front','Back']:
  names=([prefix+'_Leg_Shoulder_'+side] if prefix=='Front' else [prefix+'_Leg_Pelvis_'+side])+[prefix+'_Leg_Upper_'+side,prefix+'_Leg_Lower_'+side,prefix+'_Leg_Ankle_'+side]
  for j,bone in enumerate(names):
   b=rig.data.bones[bone];start=b.head_local;end=b.tail_local;r=[.115,.09,.059,.042][j]
   strand('Anatomia da pata '+bone,[start,start.lerp(end,.44),end],[r*.9,r,r*.63],fur,bone,18)
  bone=prefix+'_Leg_Foot_'+side;b=rig.data.bones[bone];center=(b.head_local+b.tail_local)*.5;center.z=.053;center.y-=.025
  ball('Pata com dedos '+prefix+side,center,(.078,.107,.053),fur,bone)
  for j in range(3):
   x=center.x+(j-1)*.038;strand('Garra da pata',[(x,center.y-.078,.035),(x,center.y-.14,.026)],[.012,.0006],ivory,bone)
 ear='Ear_'+side;x=sign*.117;y=-.94;z=1.475
 vertices=[(x-sign*.053,y-.02,z),(x+sign*.05,y-.02,z),(x+sign*.045,y+.035,z+.15),(x,y+.05,z),(x-sign*.025,y-.025,z+.025),(x+sign*.03,y-.025,z+.035),(x+sign*.035,y+.02,z+.125)]
 mesh('Orelha canina '+side,vertices,[(0,1,2),(0,2,3),(1,3,2),(0,3,1)],fur,ear)
 mesh('Interior da orelha '+side,vertices,[(4,5,6)],dark,ear)
 ball('Sobrancelha do Lobo',(sign*.105,-1.09,1.415),(.051,.07,.030),fur,'Head')
tail_names=['Tail_Base','Tail_Mid','Tail_Mid.001','Tail_End','Tail_Tip'];centers=[]
for j,name in enumerate(tail_names):
 point=rig.data.bones[name].head_local.copy();point.z-=.20*(j/(len(tail_names)-1))**2;centers.append(point)
centers.append(rig.data.bones[tail_names[-1]].tail_local-Vector((0,0,.25)))
strand('Cauda com pelagem',centers,[.10,.125,.14,.115,.07,.002],fur,tail_names,24)
for j in range(76):
 angle=j*2.399963;t=j%11/10;y=-.86+.92*t;z=1.36-.10*t;x=.21*math.sin(angle);start=(x,y,z+.055*math.cos(angle));end=(x*1.3,y+.13,z-.14-.055*math.cos(angle))
 strand('Mecha de pelagem',[start,((start[0]+end[0])*.5,y+.075,z-.025),end],[.023,.030,.001],fur if j%4 else dark,'Spine_3' if y<-.4 else 'Spine_1')
for j,y in enumerate([-.55,-.25,.05,.35,.64]):
 w=.23 if j<3 else .21;z=1.23 if j<3 else 1.18;bone='Spine_3' if j==0 else 'Spine_2' if j<3 else 'Spine_1' if j==3 else 'Hips'
 points=[(0,y-.12,z+.09),(-w,y-.08,z-.035),(-w*.83,y+.14,z-.10),(0,y+.19,z+.055),(w*.83,y+.14,z-.10),(w,y-.08,z-.035)]
 mesh('Placa dorsal '+str(j),points,[(0,1,2,3),(0,3,4,5)],steel,bone);line('Borda da placa dorsal',points+[points[0]],gold,bone,.007);strand('Espinho dorsal',[(0,y,z+.06),(0,y+.055,z+.25)],[.035,.0005],gold,bone)
for side,sign in [('L',1),('R',-1)]:
 for prefix in ['Front','Back']:
  bone=prefix+'_Leg_Lower_'+side;b=rig.data.bones[bone];start=b.head_local.lerp(b.tail_local,.3);end=b.head_local.lerp(b.tail_local,.8)
  strand('Bracelete blindado da pata',[start,end],[.086,.068],steel,bone,16);line('Filete da protecao da pata',[start+Vector((sign*.084,-.01,0)),end+Vector((sign*.066,-.01,0))],gold,bone,.006)
 ball('Olho do Lobo',(sign*.104,-1.147,1.39),(.015,.012,.011),eye,'Head')
 for y in [-1.29,-1.38]:
  strand('Presa superior',[(sign*.073,y,1.205),(sign*.068,y-.01,1.145)],[.013,.001],ivory,'Head');strand('Presa inferior',[(sign*.067,y,1.125),(sign*.063,y-.005,1.16)],[.010,.001],ivory,'Chin')
ball('Nariz do Lobo',(0,-1.455,1.245),(.057,.024,.032),dark,'Head')
for sign in [-1,1]:mesh('Faixa de equipe no flanco',[(sign*.255,-.43,1.15),(sign*.24,.26,1.11),(sign*.20,.30,.85),(sign*.24,-.35,.88)],[(0,1,2,3)],cloth,'Spine_1')
rig.animation_data_create();actions={};bpy.context.scene.render.fps=30
for label,file in [('Idle','idle'),('Walk','walk'),('Attack','bite'),('Hit','fall'),('Death','death')]:
 before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(a.clips/(file+'.glb')));temporary=set(bpy.data.objects)-before;source=next(o for o in temporary if o.type=='ARMATURE');action=source.animation_data.action;action.name=label;action.use_fake_user=True;actions[label]=action
 for o in temporary:bpy.data.objects.remove(o,do_unlink=True)
 rig.animation_data.action=None;track=rig.animation_data.nla_tracks.new();track.name=label;track.strips.new(label,int(action.frame_range[0]),action);track.mute=True
rig.scale=(1.50,.76,.72);bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=body;bpy.ops.object.join();body.name='LoboRefinado';rig['card_id']='lobo';rig['revision']=3
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);body.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(a.out/'lobo-refinado.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_extras=True)
rig.animation_data.action=actions['Idle']
if actions['Idle'].slots:rig.animation_data.action_slot=actions['Idle'].slots[0]
bpy.context.scene.frame_set(0);bpy.ops.wm.save_as_mainfile(filepath=str(a.out/'lobo-refinado.blend'),compress=True);rig.animation_data.action=None
for b in rig.pose.bones:b.matrix_basis.identity()
bpy.context.view_layer.objects.active=body;dec=body.modifiers.new('Modelo de campo','DECIMATE');dec.ratio=.35;body.modifiers.move(len(body.modifiers)-1,0);bpy.ops.object.modifier_apply(modifier=dec.name)
bpy.ops.export_scene.gltf(filepath=str(a.out/'lobo-refinado-campo.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_extras=True)
(a.out/'provenance.json').write_text(json.dumps({'character':'lobo','source':'Mesh2Motion fox base and native quadruped clips, CC0','billboard':False,'paid_api_calls':0,'clips':list(actions)},indent=2))
