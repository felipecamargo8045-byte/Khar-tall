"""Original, separately modeled sword and compass shield for the pilot.

These meshes follow the equipment silhouettes in the game's Soldier card;
they are not an imported third-party hero or an image plane.
"""
import math
import bpy
import bmesh

def material(name,color,metal,rough):
    m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    return m

class Builder:
    def __init__(self):self.vertices=[];self.faces=[];self.slots=[]
    def add(self,vertices,faces,slot):
        offset=len(self.vertices);self.vertices.extend(vertices)
        self.faces.extend(tuple(offset+i for i in face) for face in faces);self.slots.extend([slot]*len(faces))
    def extrude(self,outline,y0,y1,slot):
        n=len(outline);v=[(x,y,z) for y in [y0,y1] for x,z in outline]
        self.add(v,[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],slot)
    def cylinder(self,x,y,z0,z1,radius,slot,n=12):
        v=[(x+radius*math.cos(i*math.tau/n),y+radius*math.sin(i*math.tau/n),z) for z in [z0,z1] for i in range(n)]
        self.add(v,[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],slot)
    def object(self,name,rig,bone,materials):
        data=bpy.data.meshes.new(name);data.from_pydata(self.vertices,[],self.faces);data.update()
        for m in materials:data.materials.append(m)
        for poly,slot in zip(data.polygons,self.slots):poly.material_index=slot
        bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free()
        obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
        group=obj.vertex_groups.new(name=bone);group.add(list(range(len(data.vertices))),1,'REPLACE')
        modifier=obj.modifiers.new('Held equipment','ARMATURE');modifier.object=rig;obj.parent=rig
        return obj

def build_equipment(rig):
    mats=[material('Tempered silver steel',(.38,.43,.48),.92,.27),
          material('Engraved antique gold',(.42,.26,.075),.82,.31),
          material('Blackened shield steel',(.016,.022,.031),.78,.40),
          material('Dark leather grip',(.025,.012,.009),.03,.82)]
    sword=Builder();x=-.48;y=-.21
    sections=[(.845,.037),(.78,.034),(.20,.023),(.075,.008),(.035,0)]
    vertices=[]
    for z,width in sections:
        vertices.extend([(x-width,y,z),(x,y-.009,z),(x+width,y,z),(x,y+.009,z)])
    faces=[(3,2,1,0)]
    for j in range(len(sections)-1):
        faces.extend((4*j+i,4*j+(i+1)%4,4*(j+1)+(i+1)%4,4*(j+1)+i) for i in range(4))
    sword.add(vertices,faces,0)
    guard=[(-.12,.025),(-.11,-.004),(-.06,-.005),(-.025,.01),(.025,.01),(.06,-.005),(.11,-.004),(.12,.025),(.07,.02),(.03,.032),(-.03,.032),(-.07,.02)]
    sword.extrude([(x+u,.845+v) for u,v in guard],y-.014,y+.014,1)
    sword.cylinder(x,y,.87,.995,.014,3)
    for i in range(8):sword.cylinder(x,y,.88+i*.013,.883+i*.013,.015,2)
    sword.extrude([(x,.99),(x+.023,1.012),(x,1.038),(x-.023,1.012)],y-.014,y+.014,1)
    sword_obj=sword.object('SoldadoSword',rig,'hand_r',mats)

    shield=Builder();cx=.49;cy=-.30;cz=1.10
    outline=[(0,.35),(.18,.22),(.15,-.13),(0,-.35),(-.15,-.13),(-.18,.22)];n=len(outline)
    vertices=[(cx,cy-.055,cz)]
    vertices.extend((cx+x*.86,cy-.015,cz+z*.86) for x,z in outline)
    vertices.extend((cx+x,cy,cz+z) for x,z in outline)
    vertices.extend((cx+x,cy+.027,cz+z) for x,z in outline)
    for i in range(n):
        j=(i+1)%n
        shield.add(vertices,[(0,1+i,1+j)],2)
        shield.add(vertices,[(1+i,1+n+i,1+n+j,1+j)],1)
        shield.add(vertices,[(1+n+i,1+2*n+i,1+2*n+j,1+n+j)],1)
    shield.add(vertices,[tuple(range(1+2*n,1+3*n))],2)
    star=[]
    for i in range(16):
        angle=i*math.pi/8;radius=.112 if i%2==0 else .037
        star.append((cx+radius*math.sin(angle),cz+radius*math.cos(angle)))
    shield.extrude(star,cy-.067,cy-.055,1)
    for x,z in outline:
        # Small raised diamond rivets around the rim.
        px=cx+x*.94;pz=cz+z*.94;r=.006
        shield.extrude([(px,pz+r),(px+r,pz),(px,pz-r),(px-r,pz)],cy-.006,cy+.003,1)
    shield_obj=shield.object('SoldadoShield',rig,'hand_l',mats)
    return [sword_obj,shield_obj]
