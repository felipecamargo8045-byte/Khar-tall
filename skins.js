/* Recolor only red cloth/leather in each original portrait. Preserve faces,
   fur, metal, weapons, background, original resolution and all game rules. */
(()=>{'use strict';
 const {SKINS,findSkin}=window.KharTallSkinCatalog;
 const types=['king','guardian','colossus','wolf','scout','soldier','archer'];
 const masks={
  king:[[.25,.25],[.62,.25],[.74,.47],[.99,.69],[1,.85],[.64,.86],[.56,.68],[.33,.86],[.24,.65]],
  guardian:[[.25,.26],[.59,.23],[.68,.55],[.62,.89],[.17,.88],[.08,.75],[.23,.54]],
  colossus:[[.27,.39],[.65,.4],[.72,.65],[.57,.9],[.34,.91],[.26,.68]],
  wolf:[[[.6,.47],[.72,.54],[.69,.64],[.59,.62],[.55,.56]],[[.33,.42],[.45,.52],[.41,.62],[.35,.58]]],
  scout:[[.43,.24],[.62,.25],[.64,.47],[.88,.62],[.97,.78],[.63,.73],[.57,.86],[.21,.82],[.13,.74],[.34,.5]],
  soldier:[[.49,.04],[.65,.06],[.7,.27],[.74,.44],[.66,.66],[.68,.86],[.27,.81],[.14,.75],[.38,.42],[.45,.26]],
  archer:[[.46,.07],[.59,.07],[.65,.28],[.67,.54],[.72,.79],[.53,.88],[.27,.85],[.11,.67],[.37,.27]]
 };
 const originals=new Map(),rendered=new Map();
 function inside(x,y,polygon){let yes=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
 function hsl(r,g,b){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,l=(max+min)/2;let h=0,s=0;if(d){s=d/(1-Math.abs(2*l-1));h=max===r?((g-b)/d+6)%6:max===g?(b-r)/d+2:(r-g)/d+4;h*=60;}return [h,s,l];}
 function rgb(h,s,l){const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;const trip=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];return trip.map(v=>Math.round((v+m)*255));}
 function smooth(a,b,value){const t=Math.max(0,Math.min(1,(value-a)/(b-a)));return t*t*(3-2*t);}
 function original(type){if(!originals.has(type))originals.set(type,new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src='/assets/token_'+type+'.webp';}));return originals.get(type);}
 async function texture(type,skin){const key=type+':'+skin.id;if(!rendered.has(key))rendered.set(key,(async()=>{
  const source=await original(type),canvas=document.createElement('canvas');canvas.width=source.naturalWidth;canvas.height=source.naturalHeight;
  const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(source,0,0);const frame=context.getImageData(0,0,canvas.width,canvas.height),pixels=frame.data,polygons=typeof masks[type][0][0]==='number'?[masks[type]]:masks[type];
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
   const nx=x/canvas.width,ny=y/canvas.height;if(!polygons.some(polygon=>inside(nx,ny,polygon)))continue;
   if((type==='king'&&ny<.29&&nx>.38&&nx<.6)||(type==='archer'&&ny>.17&&ny<.28&&nx>.5&&nx<.59)||(type==='soldier'&&ny>.13&&ny<.25&&nx>.48&&nx<.61))continue;
   const at=(y*canvas.width+x)*4,[h,s,l]=hsl(pixels[at],pixels[at+1],pixels[at+2]);
   const distance=Math.min(h,360-h),blend=(1-smooth(15,32,distance))*smooth(.06,.25,s)*smooth(.035,.14,l)*(1-smooth(.76,.9,l));
   if(blend<=0)continue;
   const light=skin.tone==='light'?Math.min(.86,l*1.15+.08):Math.max(.035,l*.78);
   const next=rgb(skin.hue,Math.max(.35,Math.min(.75,s*.8)),light);
   for(let channel=0;channel<3;channel++)pixels[at+channel]=Math.round(pixels[at+channel]*(1-blend)+next[channel]*blend);
  }
  context.putImageData(frame,0,0);return canvas.toDataURL('image/png');
 })().catch(error=>{rendered.delete(key);throw error;}));return rendered.get(key);}
 function paintPiece(image,type,skinId){const skin=findSkin(skinId);image.dataset.ktSkin=skin?.id||'classic';if(!skin||!types.includes(type))return;
  const marker=skin.id;image.style.visibility='hidden';texture(type,skin).then(src=>{if(image.dataset.ktSkin===marker){image.src=src;image.style.visibility='';}}).catch(()=>{image.style.visibility='';});
 }
 function decorate(element,skinId){if(!element)return;const skin=findSkin(skinId);element.classList.toggle('kt-skin-colors',!!skin);if(skin){element.style.setProperty('--skin-color',skin.color);element.style.setProperty('--skin-name',skin.name_color);element.dataset.ktSkin=skin.id;}else{element.style.removeProperty('--skin-color');element.style.removeProperty('--skin-name');delete element.dataset.ktSkin;}}
 let profile=null,players=null;
 const appearance={
  setMe(me){profile=me?.authenticated?me:null;window.dispatchEvent(new Event('kt-appearance-change'));},
  setPlayers(value){players=Array.isArray(value)?value:null;},
  forSide(side){return players?players[side]?.skin||'classic':side===0?profile?.skin||'classic':'classic';},
  username(side){return players?players[side]?.username||'':side===0?profile?.user?.username||'':'';}
 };
 window.KharTallSkins={SKINS,findSkin,paintPiece,decorate,types};window.KharTallAppearance=appearance;
})();
