"""CPU proof render of a real GLB, with optional animation sampling."""
import argparse
import math
from pathlib import Path
import sys
import bpy
from mathutils import Vector

p=argparse.ArgumentParser();p.add_argument('--model',required=True);p.add_argument('--out',required=True)
p.add_argument('--angle',type=float,default=12);p.add_argument('--clip');p.add_argument('--frame',type=int,default=0)
p.add_argument('--samples',type=int,default=24);p.add_argument('--width',type=int,default=700);p.add_argument('--height',type=int,default=900)
p.add_argument('--frames',type=int,default=1);p.add_argument('--step',type=int,default=3)
args=p.parse_args(sys.argv[sys.argv.index('--')+1:]);bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=args.model)
if args.clip:
    rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
    for track in rig.animation_data.nla_tracks:track.mute=True
    action=bpy.data.actions[args.clip];rig.animation_data.action=action
    if action.slots:rig.animation_data.action_slot=action.slots[0]
scene=bpy.context.scene;scene.frame_set(args.frame)
# Blender's glTF importer adds a hidden Icosphere as a bone display shape.
# It is not character geometry; including it raises and shrinks the model.
meshes=[o for o in scene.objects if o.type=='MESH' and not o.hide_render
        and not any(c.hide_render for c in o.users_collection)]
# Use rest vertices: an animated bounding box would move the floor per pose.
corners=[o.matrix_world@v.co for o in meshes for v in o.data.vertices]
low=Vector([min(c[i] for c in corners) for i in range(3)]);high=Vector([max(c[i] for c in corners) for i in range(3)])
factor=1.85/(high.z-low.z);root=bpy.data.objects.new('Character',None);bpy.context.collection.objects.link(root)
for obj in [o for o in scene.objects if o.parent is None and o!=root]:obj.parent=root
root.scale=(factor,)*3;root.location=(-(low.x+high.x)*.5*factor,-(low.y+high.y)*.5*factor,-low.z*factor);root.rotation_euler.z=math.radians(args.angle)
def material(name,color,metal=0,rough=.6):
    m=bpy.data.materials.new(name);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value=(*color,1);b.inputs['Metallic'].default_value=metal;b.inputs['Roughness'].default_value=rough
    return m
bpy.ops.mesh.primitive_cylinder_add(vertices=96,radius=1.10,depth=.07,location=(0,0,-.04));bpy.context.object.data.materials.append(material('Navy plinth',(.025,.045,.075),.15,.55))
bpy.ops.mesh.primitive_torus_add(major_segments=96,minor_segments=8,major_radius=1.08,minor_radius=.008,location=(0,0,0));bpy.context.object.data.materials.append(material('Antique gold',(.45,.29,.10),.65,.32))
bpy.ops.mesh.primitive_plane_add(size=2000,location=(0,0,-.09));bpy.context.object.data.materials.append(material('Studio floor',(.009,.017,.032),0,.9))
# Curved studio backdrop avoids a hard horizon line behind the character.
points=[];faces=[]
for i in range(25):
    a=i/24*math.pi/2;y=3+5*math.sin(a);z=-.09+5*(1-math.cos(a))
    points.extend([(-40,y,z),(40,y,z)])
points.extend([(-40,8,30),(40,8,30)])
for i in range(25):faces.append((2*i,2*i+1,2*i+3,2*i+2))
data=bpy.data.meshes.new('Curved navy backdrop');data.from_pydata(points,[],faces);data.update()
backdrop=bpy.data.objects.new('Curved navy backdrop',data);bpy.context.collection.objects.link(backdrop)
data.materials.append(material('Backdrop navy',(.009,.017,.032),0,.95))
for poly in data.polygons:poly.use_smooth=True
world=bpy.data.worlds.new('Navy studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.065,.09,.14,1);world.node_tree.nodes['Background'].inputs[1].default_value=.55;scene.world=world
def area(name,position,power,color,size):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.color=color;data.shape='DISK';data.size=size
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.location=position;obj.rotation_euler=(Vector((0,0,1))-obj.location).to_track_quat('-Z','Y').to_euler()
area('Warm key',(-3,-4,5),450,(1,.85,.65),4);area('Cool fill',(3,-2,3),240,(.55,.72,1),3);area('Gold rim',(1,3,4),500,(1,.78,.49),3)
data=bpy.data.cameras.new('Camera');camera=bpy.data.objects.new('Camera',data);bpy.context.collection.objects.link(camera)
camera.location=(0,-5.4,2.25);camera.rotation_euler=(Vector((0,0,.95))-camera.location).to_track_quat('-Z','Y').to_euler();data.lens=58;scene.camera=camera
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=args.samples;scene.cycles.use_denoising=True
scene.render.threads_mode='FIXED';scene.render.threads=6;scene.render.resolution_x=args.width;scene.render.resolution_y=args.height;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
path=Path(args.out);path.parent.mkdir(parents=True,exist_ok=True)
for index in range(args.frames):
    scene.frame_set(args.frame+index*args.step);scene.render.filepath=str(path if args.frames==1 else path.with_name(path.stem+f'-{index:03d}'+path.suffix))
    if index==0:
        bpy.context.view_layer.update()
        points=[o.evaluated_get(bpy.context.evaluated_depsgraph_get()).matrix_world@v.co for o in meshes for v in o.evaluated_get(bpy.context.evaluated_depsgraph_get()).data.vertices]
        print('MODEL_WORLD_Z',min(v.z for v in points),max(v.z for v in points),flush=True)
    bpy.ops.render.render(write_still=True)
print('RENDERED',args.out,flush=True)
