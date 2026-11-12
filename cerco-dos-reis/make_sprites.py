"""Gera sprites PNG transparentes a partir das artes já aprovadas no APK original."""
from pathlib import Path
import cv2
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

ROOT=Path(__file__).parent
SRC=ROOT/'origem-apk'/'assets'
DST=ROOT/'sprites'
DST.mkdir(parents=True,exist_ok=True)
PAINTINGS={
  'lobo':'khar_tall_lobo.png',
  'arqueiro':'khar_tall_aprendiz_arqueiro.png',
  'soldado':'khar_tall_aprendiz_soldado.png',
  'colosso':'khar_tall_colosso.png',
  'guardiao':'khar_tall_guardiao.png',
  'batedor':'khar_tall_batedor.png',
  'rei':'khar_tall_rei.png',
  'liliti':'portrait_lilith_ruiva.webp'
}
for name,source in PAINTINGS.items():
    bgr=cv2.imread(str(SRC/source))
    if bgr is None: raise FileNotFoundError(source)
    h,w=bgr.shape[:2]
    is_liliti=name=='liliti'
    square=w/h>.85
    mask=np.zeros((h,w),np.uint8)
    if is_liliti:
        mask[:,:]=cv2.GC_PR_BGD
        mask[:int(h*.02),:]=cv2.GC_BGD
        mask[int(h*.96):,:]=cv2.GC_BGD
        mask[:,:int(w*.012)]=cv2.GC_BGD
        mask[:,int(w*.99):]=cv2.GC_BGD
        mask[int(h*.05):int(h*.88),int(w*.14):int(w*.90)]=cv2.GC_PR_FGD
        mask[int(h*.25):int(h*.80),int(w*.35):int(w*.65)]=cv2.GC_FGD
        mask[:int(h*.12),:int(w*.23)]=cv2.GC_BGD
        mask[:int(h*.10),int(w*.82):]=cv2.GC_BGD
    else:
        cutoff=int(h*(.80 if square else .795))
        mask[:cutoff,:]=cv2.GC_PR_BGD
        mask[int(h*.025):cutoff,int(w*.03):int(w*.97)]=cv2.GC_PR_FGD
        mask[:int(h*.03),:]=cv2.GC_BGD
        mask[cutoff:,:]=cv2.GC_BGD
        mask[:,:int(w*.018)]=cv2.GC_BGD
        mask[:,int(w*.982):]=cv2.GC_BGD
        for xx in (0,1):
            for yy in (0,1):
                xa,xb=(0,int(w*.20)) if xx==0 else (int(w*.80),w)
                ya,yb=(0,int(h*.30)) if yy==0 else (int(h*.65),cutoff)
                mask[ya:yb,xa:xb]=cv2.GC_BGD
        if square:
            mask[int(h*.27):int(h*.59),int(w*.40):int(w*.61)]=cv2.GC_FGD
        else:
            mask[int(h*.26):int(h*.64),int(w*.37):int(w*.63)]=cv2.GC_FGD
    bg=np.zeros((1,65),np.float64)
    fg=np.zeros((1,65),np.float64)
    cv2.grabCut(bgr,mask,None,bg,fg,7,cv2.GC_INIT_WITH_MASK)
    alpha=((mask==cv2.GC_FGD)|(mask==cv2.GC_PR_FGD)).astype(np.uint8)
    if not is_liliti:
        contours,_=cv2.findContours(alpha,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
        filtered=np.zeros_like(alpha)
        for contour in sorted(contours,key=cv2.contourArea,reverse=True)[:12]:
            if cv2.contourArea(contour)>150:
                cv2.drawContours(filtered,[contour],-1,1,-1)
        alpha=filtered
    alpha=np.uint8(np.clip(255*gaussian_filter(alpha.astype(float),.7),0,255))
    ys,xs=np.where(alpha>12)
    if not len(xs):raise ValueError('Nenhum sprite extraido: '+name)
    x0=max(0,int(xs.min())-5);x1=min(w,int(xs.max())+6)
    y0=max(0,int(ys.min())-5);y1=min(h,int(ys.max())+6)
    rgba=cv2.cvtColor(bgr,cv2.COLOR_BGR2RGBA)
    rgba[:,:,3]=alpha
    image=Image.fromarray(rgba[y0:y1,x0:x1],'RGBA')
    # cache pequeno para celulares, sem diminuir a arte usada nas fichas
    max_h=450 if is_liliti else 340
    if image.height>max_h:
        image.thumbnail((420,max_h),Image.Resampling.LANCZOS)
    dest=DST/('sprite_'+name+'.png')
    image.save(dest,optimize=True)
    print(name, image.size, dest.stat().st_size)
