"""Gera animações 2D por deformação local das artes transparentes aprovadas.
A grade: 10 quadros caminhada, 6 repouso, 8 ataque. Saída: WebP com alpha.
Sem serviços externos e sem custos de geração."""
from pathlib import Path
import numpy as np
import cv2
from PIL import Image

ROOT=Path(__file__).parent
SRC=ROOT/'sprites'
OUT=ROOT/'motion'
OUT.mkdir(exist_ok=True)
CHARACTERS=['lobo','arqueiro','soldado','colosso','guardiao','batedor','rei','liliti']
STATES=[('walk',10),('idle',6),('attack',8)]
FPS_TOTAL=sum(n for _,n in STATES)

def bell(v,lo,hi,soft):
    return np.clip((v-lo)/soft,0,1)*np.clip((hi-v)/soft,0,1)

def frame(src,kind,phase,state):
    height,width=src.shape[:2]
    yy,xx=np.mgrid[:height,:width].astype('float32')
    x=xx/width
    y=yy/height
    sine=np.sin(phase)
    cosine=np.cos(phase)
    wolf=(kind=='lobo')
    hips=.49 if wolf else (.58 if kind in ('guardiao','rei','colosso') else .54)
    leg=np.clip((y-hips)/.28,0,1)
    left=np.clip((.5-x)/.14+.5,0,1)
    arms=bell(y,.17,.69,.14)
    left_arm=arms*np.clip((.48-x)/.25,0,1)
    right_arm=arms*np.clip((x-.52)/.25+.15,0,1)
    head=np.clip((.30-y)/.18,0,1)
    body=bell(y,.18,.68,.19)
    step=1.0 if state=='walk' else .25 if state=='idle' else .55
    dx=step*leg*(left*sine*5.2+(1-left)*(-sine*5.2))
    dy=step*leg*(left*(-max(0,sine)*3.5)+(1-left)*(-max(0,-sine)*3.5))
    dx+=step*left_arm*(-sine*4)+step*right_arm*(sine*4)
    dy+=step*left_arm*(-sine*1.8)+step*right_arm*(sine*1.8)
    dx+=step*body*sine*.85+head*sine*.45
    dy+=-(1.1+.85*np.cos(2*phase))*step*(1-leg*.4)
    if wolf:
        dx+=step*left_arm*(-sine*2.2)+step*right_arm*(sine*2.2)
        dy+=step*head*(-cosine*1.4)
    if kind=='colosso':
        dx*=.67
        dy*=.82
    if state=='attack':
        jab=np.sin(phase*.5)**2
        dx+=jab*(3.5 if kind in ('soldado','guardiao','rei','colosso') else -2.6)*body
        dy+=-3.2*jab*arms-2.2*jab*head
        dx+=jab*right_arm*4.3
    xmap=(xx-dx).astype('float32')
    ymap=(yy-dy).astype('float32')
    return cv2.remap(src,xmap,ymap,cv2.INTER_CUBIC,borderMode=cv2.BORDER_CONSTANT,borderValue=(0,0,0,0))

for kind in CHARACTERS:
    source=SRC/('sprite_'+kind+'.png')
    if not source.exists():raise RuntimeError('Sprite original não encontrado: '+str(source))
    image=Image.open(source).convert('RGBA')
    height=156
    width=round(image.width/image.height*height)
    image=image.resize((width,height),Image.Resampling.LANCZOS)
    raw=np.asarray(image).copy()
    sheet=Image.new('RGBA',(width*FPS_TOTAL,height),(0,0,0,0))
    index=0
    for state,n in STATES:
        for k in range(n):
            warped=frame(raw,kind,2*np.pi*k/n,state)
            sheet.paste(Image.fromarray(warped,'RGBA'),(index*width,0))
            index+=1
    dest=OUT/('motion_'+kind+'.webp')
    sheet.save(dest,'WEBP',quality=85,method=5)
    print(kind, 'frames',FPS_TOTAL,'dimension',width,height,'bytes',dest.stat().st_size)
