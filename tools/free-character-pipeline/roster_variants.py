"""Distinct class silhouettes and equipment over native weighted CC0 bodies."""
import math
import bpy
from mathutils import Vector

def apply_variant(s):
 k=s['args'].character;rig=s['rig'];body=s['body'];parts=s['meshes'];make=s['mesh_obj'];trim=s['trim'];mat=s['material'];bind=s['bind']
 steel=s['steel'];gold=s['gold'];edge=s['edge'];wine=s['wine'];leather=s['leather'];skin=s.get('skin',s['face'])
 bronze=mat('Bronze escurecido',(.085,.052,.026),.78,.41);shadow=mat('Viseira e recessos',(.003,.006,.009),.05,.82)
 hair=mat('Cabelo ruivo' if k=='liliti' else 'Cabelo e barba castanhos',(.135,.026,.010) if k=='liliti' else (.038,.015,.008),.02,.58)
 def remove(predicate):
  for o in list(parts):
   if o!=body and predicate(o.name):parts.remove(o);bpy.data.objects.remove(o,do_unlink=True)
 def strand(name,centers,radii,material,bone,sides=8):
  points=[]
  for j,c in enumerate(centers):
   c=Vector(c);t=(Vector(centers[min(len(centers)-1,j+1)])-Vector(centers[max(0,j-1)])).normalized();u=t.cross(Vector((0,1,0)))
   if u.length<.01:u=t.cross(Vector((1,0,0)))
   u.normalize();v=t.cross(u).normalized()
   points.extend(c+radii[j]*(math.cos(i*math.tau/sides)*u+math.sin(i*math.tau/sides)*v) for i in range(sides))
  faces=[]
  for j in range(len(centers)-1):
   for i in range(sides):a=j*sides+i;faces.append((a,j*sides+(i+1)%sides,(j+1)*sides+(i+1)%sides,a+sides))
  faces.extend([tuple(range(sides-1,-1,-1)),tuple((len(centers)-1)*sides+i for i in range(sides))])
  return make(name,points,faces,material,bone)
 def loft(name,rings,material,bone,n=32):
  points=[(cx+rx*math.sin(i*math.tau/n),cy+ry*math.cos(i*math.tau/n),z) for z,rx,ry,cx,cy in rings for i in range(n)]
  faces=[]
  for j in range(len(rings)-1):
   for i in range(n):a=j*n+i;b=j*n+(i+1)%n;faces.append((a,b,b+n,a+n))
  faces.extend([tuple(range(n-1,-1,-1)),tuple((len(rings)-1)*n+i for i in range(n))])
  return make(name,points,faces,material,bone,.001)
 def ball(name,center,size,material,bone):
  bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=10,radius=1,location=center);o=bpy.context.object;o.name=name;o.scale=size
  bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);o.data.materials.append(material)
  for f in o.data.polygons:f.use_smooth=True
  return bind(o,bone)
 def spike(name,start,end,r,material,bone):return strand(name,[start,end],[r,.0007],material,bone)
 def held(points,bone):
  transform=rig.data.bones[bone].matrix_local@rig.pose.bones[bone].matrix.inverted()
  return [transform@Vector(p) for p in points]
 def held_strand(name,points,radii,material,bone):return strand(name,held(points,bone),radii,material,bone,12)
 def palm(bone):
  b=rig.pose.bones[bone];return b.matrix.translation+b.matrix.to_3x3()@Vector((0,.040,0))
 rig.animation_data.action=s['actions']['Idle']
 if s['actions']['Idle'].slots:rig.animation_data.action_slot=s['actions']['Idle'].slots[0]
 bpy.context.scene.frame_set(0);bpy.context.view_layer.update()
 if k!='rei':remove(lambda n:n.startswith('SoldadoSword'))
 if k!='guardiao':remove(lambda n:n.startswith('SoldadoShield'))
 if k in ['rei','colosso','guardiao','liliti']:remove(lambda n:any(x in n for x in ['Capuz','capuz','Gola drapeada','Bainha dourada da gola']))
 if k in ['colosso','guardiao']:
  remove(lambda n:any(x in n for x in ['Rosto anatomico','Olho ','Iris ','Sobrancelha']))
  loft('Elmo fechado',[(1.545,.105,.100,0,.005),(1.62,.153,.135,0,.005),(1.75,.150,.145,0,.008),(1.84,.085,.105,0,.005),(1.88,.002,.002,0,0)],steel,'head',40)
  for sign in [-1,1]:trim('Contorno do elmo',[(sign*.11,-.105,1.81),(sign*.13,-.145,1.70),(sign*.075,-.145,1.575)],'head',.004,gold)
  make('Viseira em sombra',[(-.105,-.149,1.724),(.105,-.149,1.724),(.105,-.149,1.706),(-.105,-.149,1.706)],[(0,1,2,3)],shadow,'head',.003)
  trim('Crista do elmo',[(0,-.113,1.86),(0,-.162,1.76),(0,-.155,1.60)],'head',.010,gold)
  for x,h in [(-.10,.14),(0,.23),(.10,.14)]:spike('Pontas da coroa do elmo',(x,.005,1.83),(x*1.2,.005,1.83+h),.025,gold,'head')
  for side,sign in [('l',1),('r',-1)]:
   for n in range(3):spike('Espinhos da ombreira',(sign*(.22+n*.045),.05,1.58),(sign*(.25+n*.06),.05,1.69+(2-n)*.018),.025,gold,'upperarm_'+side)
  if k=='colosso':
   remove(lambda n:n.startswith('Capa continua'))
   for side,sign in [('l',1),('r',-1)]:
    s['shell']('Manopla pesada '+side,lambda c,sign=sign:.73<c.x*sign<.85 and 1.38<c.z<1.50,'hand_'+side,.027,steel)
    for row in range(3):trim('Friso da manopla',[(sign*.748,.024+row*.024,1.49),(sign*.79,.024+row*.024,1.505),(sign*.827,.024+row*.024,1.49)],'hand_'+side,.0035,gold)
   make('Tabardo do Colosso',[(-.10,-.16,1.05),(.10,-.16,1.05),(.12,-.18,.56),(0,-.19,.49),(-.12,-.18,.56)],[(0,1,2,3,4)],wine,'pelvis',.003)
   rig.scale=(1.55,1.35,1.43)
  else:
   remove(lambda n:n.startswith('SoldadoShield'))
   x,y,z=palm('hand_l')+Vector((-.015,-.06,.10));outline=[(0,.54),(.27,.39),(.25,-.16),(0,-.55),(-.25,-.16),(-.27,.39)]
   boundary=[(x+a,y-.025,z+b) for a,b in outline];points=[(x,y-.07,z)]+boundary
   make('Escudo torre do Guardiao',held(points,'hand_l'),[(0,1+i,1+(i+1)%6) for i in range(6)],bronze,'hand_l',.028,.002)
   trim('Moldura do escudo torre',held(boundary,'hand_l'),'hand_l',.012,gold,True)
   trim('Espinha do escudo torre',held([(x,y-.09,z+.46),(x,y-.12,z),(x,y-.07,z-.42)],'hand_l'),'hand_l',.007,gold)
   for sign in [-1,1]:
    for j in range(3):trim('Arabesco do escudo',held([(x+sign*.03,y-.085,z+.20-j*.16),(x+sign*.17,y-.06,z+.24-j*.16),(x+sign*.20,y-.05,z+.13-j*.16)],'hand_l'),'hand_l',.005,gold)
   rig.scale=(1.12,1.10,1.10)
 if k in ['guardiao','batedor']:
  bone='hand_r';x,y,z=palm(bone)
  held_strand('Bastao ancestral',[(x,y,.075),(x,y,1.95)],[.017,.012],leather,bone)
  for h in [.12,.65,1.25,1.87]:held_strand('Aneis do bastao',[(x,y,h),(x,y,h+.028)],[.025,.025],gold,bone)
  if k=='guardiao':make('Lanca do Guardiao',held([(x-.045,y,1.89),(x,y-.015,2.15),(x+.045,y,1.89),(x,y+.015,1.93)],bone),[(0,1,2),(0,3,1),(1,3,2)],gold,bone,.004)
  else:
   crystal=mat('Magia rubra emissiva',(.33,.003,.013),.08,.28);shader=crystal.node_tree.nodes['Principled BSDF'];shader.inputs['Emission Color'].default_value=(.9,.003,.02,1);shader.inputs['Emission Strength'].default_value=2.4
   for sign in [-1,1]:held_strand('Garras do cajado',[(x+sign*.065,y,1.89),(x+sign*.09,y,2.02),(x+sign*.04,y,2.16)],[.012,.008,.001],gold,bone)
   make('Cristal rubro do cajado',held([(x,y,2.18),(x+.045,y,2.06),(x,y-.027,2),(x-.045,y,2.06),(x,y+.027,2.04)],bone),[(0,1,2),(0,2,3),(0,3,4),(0,4,1),(1,4,3,2)],crystal,bone)
 if k=='arqueiro':
  for o in parts:
   for i,m in enumerate(o.data.materials):
    if m==steel:o.data.materials[i]=leather
  bone='hand_l';x,y,z=palm(bone);bow=[(x+.13,y,z+.57),(x+.20,y,z+.48),(x+.045,y,z+.23),(x,y,z),(x+.045,y,z-.23),(x+.20,y,z-.48),(x+.13,y,z-.57)]
  held_strand('Arco longo recurvo',bow,[.008,.012,.018,.023,.018,.012,.008],bronze,bone)
  trim('Corda do arco',held([bow[0],(x+.11,y,z),bow[-1]],bone),bone,.0016,leather)
  held_strand('Punho do arco',[(x,y,z-.055),(x,y,z+.055)],[.026,.026],leather,bone)
  loft('Aljava de couro',[(1.13,.075,.065,-.16,.16),(1.57,.085,.070,-.16,.16)],leather,'spine_03',24)
  for j in range(7):
   x=-.16+(j%3-1)*.035;y=.16+(j//3-1)*.026
   strand('Flecha na aljava',[(x,y,1.40),(x,y,1.81+j%2*.035)],[.003,.003],leather,'spine_03')
   make('Penas da flecha',[(x-.018,y,1.75),(x+.018,y,1.75),(x+.015,y,1.80),(x-.015,y,1.80)],[(0,1,2,3)],wine,'spine_03',.002)
  rig.scale=(.94,.94,1)
 if k=='batedor':
  for o in parts:
   for i,m in enumerate(o.data.materials):
    if m==steel:o.data.materials[i]=bronze
  rig.scale=(.96,.96,1.02)
 if k=='rei':
  fur=mat('Pele clara da gola real',(.38,.33,.26),0,.94)
  for j in range(46):
   a=j/46*math.tau;x=.255*math.sin(a);y=.17*math.cos(a);z=1.47-.045*math.cos(a)
   strand('Mecha da gola real',[(x,y,z+.035),(x*1.19,y*1.21,z-.015),(x*1.29,y*1.27,z-.11-(j%3)*.014)],[.028,.035,.001],fur,'spine_03')
  loft('Coroa real',[(1.80,.144,.125,0,.005),(1.855,.149,.129,0,.005)],gold,'head',48)
  for j in range(9):
   a=j/9*math.tau;spike('Flor da coroa',(.145*math.sin(a),.128*math.cos(a),1.84),(.17*math.sin(a),.15*math.cos(a),1.99+(j%3==0)*.025),.023,gold,'head')
  for sign in [-1,1]:
   for j in range(5):
    x=sign*(.018+j*.018);strand('Barba real',[(x,-.11,1.645),(x*1.03,-.13,1.59),(x*.75,-.095,1.50+abs(x)*.4)],[.012,.013,.001],hair,'head')
  for j in range(18):
   a=.65+j*(math.tau-1.3)/17;strand('Cabelo do Rei',[(.12*math.sin(a),-.095*math.cos(a),1.79),(.145*math.sin(a),-.12*math.cos(a),1.64),(.16*math.sin(a),-.13*math.cos(a),1.49)],[.025,.03,.002],hair,'head')
  rig.scale=(1.06,1.06,1.08)
 if k=='liliti':
  keep=['Rosto anatomico','Olho ','Iris ','Sobrancelha','Capa continua'];remove(lambda n:not any(n.startswith(x) for x in keep))
  body.data.materials.clear();body.data.materials.append(skin)
  for f in body.data.polygons:f.material_index=0
  loft('Pescoco anatomico',[(1.49,.056,.052,0,0),(1.59,.048,.047,0,0)],skin,'neck_01',28)
  s['shell']('Corpete de Liliti',lambda c:1.045<c.z<1.39 and abs(c.x)<.20,'spine_03',.007,wine,False)
  for sign in [-1,1]:
   trim('Bordado do corpete',[(sign*.145,-.117,1.385),(sign*.105,-.132,1.25),(sign*.087,-.119,1.09)],'spine_03',.0023,gold)
   trim('Alca do corpete',[(sign*.14,-.10,1.37),(sign*.14,-.045,1.48),(sign*.14,.07,1.42)],'spine_03',.006,gold)
   s['shell']('Bracelete de Liliti',lambda c,sign=sign:.48<c.x*sign<.58 and 1.40<c.z<1.49,'lowerarm_'+('l' if sign==1 else 'r'),.009,gold,False)
   s['shell']('Bota bordada de Liliti',lambda c,sign=sign:.03<c.z<.32 and c.x*sign>.02,'calf_'+('l' if sign==1 else 'r'),.005,leather,False)
  for panel,(a0,a1,bone) in enumerate([(.18,math.pi,'thigh_l'),(math.pi,math.tau-.18,'thigh_r')]):
   points=[];faces=[];cols=24;rows=20
   for j in range(rows+1):
    t=j/rows
    for i in range(cols+1):
     a=a0+(a1-a0)*i/cols;fold=1+.04*math.sin(a*11)*t;points.append(((.166+.23*t)*math.sin(a)*fold,-(.13+.13*t)*math.cos(a)*fold+.10*t,1.075-.99*t))
   for j in range(rows):
    for i in range(cols):a=j*(cols+1)+i;faces.append((a,a+1,a+cols+2,a+cols+1))
   gown=make('Saia longa fendida '+str(panel),points,faces,wine,bone,.002);gown.vertex_groups.clear();hip=gown.vertex_groups.new(name='pelvis');leg=gown.vertex_groups.new(name=bone)
   for i,p in enumerate(points):w=min(.38,max(0,(1.075-p[2])*.4));hip.add([i],1-w,'REPLACE');leg.add([i],w,'REPLACE')
   for column in [0,cols]:trim('Bordado da saia',[points[j*(cols+1)+column] for j in range(rows+1)],bone,.0025,gold)
  for j in range(34):
   a=.6+j*(math.tau-1.2)/33;centers=[];radii=[]
   for n in range(9):t=n/8;r=.123+.05*t;centers.append((r*math.sin(a)+math.sin(t*math.tau*2+j*.7)*.018,-r*math.cos(a)+.035*t,1.79-.66*t));radii.append(.018*(1-.75*t)+.003)
   strand('Cacho ruivo de Liliti',centers,radii,hair,'head',10)
  loft('Cabelo no alto da cabeca',[(1.77,.125,.115,0,.005),(1.81,.115,.105,0,.005),(1.835,.065,.075,0,.005),(1.85,.002,.002,0,.005)],hair,'head',40)
  trim('Diadema de Liliti',[(-.12,-.045,1.78),(-.09,-.11,1.77),(0,-.132,1.75),(.09,-.11,1.77),(.12,-.045,1.78)],'head',.0025,gold)
  ball('Joia do diadema',(0,-.135,1.75),(.009,.005,.012),gold,'head');rig.scale=(.94,.94,1.04)
 if k in ['batedor','liliti']:
  for side,color in [('l',(.72,.002,.016)),('r',(.8,.35,.015) if k=='liliti' else (.72,.002,.016))]:
   bone='hand_'+side;glow=mat('Magia '+side,color,.1,.25);shader=glow.node_tree.nodes['Principled BSDF'];shader.inputs['Emission Color'].default_value=(*color,1);shader.inputs['Emission Strength'].default_value=2
   center=palm(bone)+Vector((0,-.025,.01));c=held([center],bone)[0];ball('Nucleo magico '+side,c,(.035,.035,.035),glow,bone)
   for layer in range(2):
    points=[center+Vector((math.sin(i*math.tau/32)*(.07+layer*.017),math.cos(i*math.tau/32)*.024,math.cos(i*math.tau/32)*(.07+layer*.017))) for i in range(32)]
    trim('Runas da magia '+side,held(points,bone),bone,.0018,gold if layer else glow,True)
 rig.animation_data.action=None
