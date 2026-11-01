"""Blender CPU: UV projection painting and portable 2048 px PBR maps.

Specific to the TripoSR Soldier pilot. A frontal painting is combined with the
inferred side/back colors on a real 3D mesh. This is not an image-plane model.
"""
import argparse
import math
from pathlib import Path
import sys
import bpy
from mathutils import Matrix
import numpy as np

p=argparse.ArgumentParser()
for name in ['model','reference','out']:p.add_argument('--'+name,required=True)
p.add_argument('--size',type=int,default=2048)
args=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=args.model)
obj=next(o for o in bpy.context.scene.objects if o.type=='MESH')
world=obj.matrix_world.copy();obj.parent=None;obj.matrix_world=Matrix.Rotation(-math.pi/2,4,'Z')@world
bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
v=np.array([x.co[:] for x in obj.data.vertices]);low=v.min(axis=0);high=v.max(axis=0)
scale=1.8/(high[2]-low[2]);obj.scale=(scale,)*3
obj.location=(-(low[0]+high[0])*.5*scale,-(low[1]+high[1])*.5*scale,-low[2]*scale)
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
for poly in obj.data.polygons:poly.use_smooth=True
attribute=obj.data.color_attributes[0].name
source=bpy.data.images.load(args.reference)
pixels=np.array(source.pixels[:],dtype=np.float32).reshape(source.size[1],source.size[0],4)
yy,xx=np.where(pixels[:,:,3]>.2);w,h=source.size
u0,v0=xx.min()/w,yy.min()/h;us,vs=(xx.max()-xx.min())/w,(yy.max()-yy.min())/h
material=bpy.data.materials.new('Reference painting');material.use_nodes=True
obj.data.materials.clear();obj.data.materials.append(material)
nodes=material.node_tree.nodes;nodes.clear();links=material.node_tree.links
def node(kind):return nodes.new(kind)
def math_node(operation,a=None,b=None):
    n=node('ShaderNodeMath');n.operation=operation
    for i,value in enumerate((a,b)):
        if value is None:continue
        if isinstance(value,(int,float)):n.inputs[i].default_value=value
        else:links.new(value,n.inputs[i])
    return n.outputs[0]
coords=node('ShaderNodeTexCoord');split=node('ShaderNodeSeparateXYZ');links.new(coords.outputs['Generated'],split.inputs[0])
uv=node('ShaderNodeCombineXYZ')
links.new(math_node('ADD',math_node('MULTIPLY',split.outputs['X'],us),u0),uv.inputs['X'])
links.new(math_node('ADD',math_node('MULTIPLY',split.outputs['Z'],vs),v0),uv.inputs['Y'])
reference=node('ShaderNodeTexImage');reference.image=source;reference.extension='CLIP';links.new(uv.outputs[0],reference.inputs['Vector'])
original=node('ShaderNodeVertexColor');original.layer_name=attribute
geometry=node('ShaderNodeNewGeometry');dot=node('ShaderNodeVectorMath');dot.operation='DOT_PRODUCT';dot.inputs[1].default_value=(0,-1,0);links.new(geometry.outputs['Normal'],dot.inputs[0])
weight=math_node('MULTIPLY',math_node('POWER',math_node('MAXIMUM',dot.outputs['Value'],0),1.2),reference.outputs['Alpha'])
mix=node('ShaderNodeMixRGB');links.new(weight,mix.inputs[0]);links.new(original.outputs['Color'],mix.inputs[1]);links.new(reference.outputs['Color'],mix.inputs[2])
hsv=node('ShaderNodeSeparateColor');hsv.mode='HSV';links.new(mix.outputs[0],hsv.inputs[0])
red=math_node('MINIMUM',math_node('ADD',math_node('LESS_THAN',hsv.outputs[0],.045),math_node('GREATER_THAN',hsv.outputs[0],.93)),1)
cloth=math_node('MULTIPLY',red,math_node('GREATER_THAN',hsv.outputs[1],.30))
emission=node('ShaderNodeEmission');surface=node('ShaderNodeOutputMaterial');links.new(emission.outputs[0],surface.inputs['Surface'])
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.012);bpy.ops.object.mode_set(mode='OBJECT')
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=1
scene.render.threads_mode='FIXED';scene.render.threads=6;scene.render.bake.margin=8
def bake(label,socket,non_color=False):
    image=bpy.data.images.new(label,width=args.size,height=args.size,alpha=False)
    if non_color:image.colorspace_settings.name='Non-Color'
    texture=node('ShaderNodeTexImage');texture.image=image;nodes.active=texture
    links.new(socket,emission.inputs[0]);print('BAKING',label,flush=True);bpy.ops.object.bake(type='EMIT')
    image.filepath_raw=str(out/(label+'.png'));image.file_format='PNG';image.save();return image
base=bake('soldado-basecolor',mix.outputs[0]);mask=bake('soldado-cloth-mask',cloth,True)
orm_pixels=np.array(mask.pixels[:],dtype=np.float32).reshape(-1,4)
value=orm_pixels[:,0].copy();orm_pixels[:,0]=1;orm_pixels[:,1]=.43+.43*value
orm_pixels[:,2]=.75*(1-value)+.025*value;orm_pixels[:,3]=1
orm=bpy.data.images.new('soldado-orm',width=args.size,height=args.size,alpha=False);orm.colorspace_settings.name='Non-Color'
orm.pixels.foreach_set(orm_pixels.ravel());orm.filepath_raw=str(out/'soldado-orm.png');orm.file_format='PNG';orm.save()
principled=node('ShaderNodeBsdfPrincipled');links.new(mix.outputs[0],principled.inputs['Base Color'])
gray=node('ShaderNodeRGBToBW');links.new(mix.outputs[0],gray.inputs[0])
bump=node('ShaderNodeBump');bump.inputs['Strength'].default_value=.18;bump.inputs['Distance'].default_value=.0012
links.new(gray.outputs[0],bump.inputs['Height']);links.new(bump.outputs[0],principled.inputs['Normal']);links.new(principled.outputs[0],surface.inputs['Surface'])
normal=bpy.data.images.new('soldado-normal',width=args.size,height=args.size,alpha=False);normal.colorspace_settings.name='Non-Color'
target=node('ShaderNodeTexImage');target.image=normal;nodes.active=target
bpy.ops.object.bake(type='NORMAL',normal_space='TANGENT');normal.filepath_raw=str(out/'soldado-normal.png');normal.file_format='PNG';normal.save()
nodes.clear();output=node('ShaderNodeOutputMaterial');pbr=node('ShaderNodeBsdfPrincipled');links.new(pbr.outputs[0],output.inputs['Surface'])
texture=node('ShaderNodeTexImage');texture.image=base;links.new(texture.outputs['Color'],pbr.inputs['Base Color'])
texture=node('ShaderNodeTexImage');texture.image=orm;separate=node('ShaderNodeSeparateColor');links.new(texture.outputs['Color'],separate.inputs[0]);links.new(separate.outputs[1],pbr.inputs['Roughness']);links.new(separate.outputs[2],pbr.inputs['Metallic'])
texture=node('ShaderNodeTexImage');texture.image=normal;nmap=node('ShaderNodeNormalMap');links.new(texture.outputs['Color'],nmap.inputs['Color']);links.new(nmap.outputs[0],pbr.inputs['Normal'])
material.name='Soldado - steel, gold and cloth'
# COLOR_0 would multiply the already painted texture and darken it twice.
for attr in list(obj.data.color_attributes):obj.data.color_attributes.remove(attr)
obj.name='Soldado';bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
bpy.ops.export_scene.gltf(filepath=str(out/'soldado-textured.glb'),export_format='GLB',use_selection=True,export_animations=False)
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(out/'soldado-source.blend'))
print('EXPORTED',out/'soldado-textured.glb',flush=True)
