/* Componentes integrados do portal de treinamento — sem transações e sem servidor original. */
(()=>{'use strict';
const $=s=>document.querySelector(s);
const ASSET='./origem-apk/assets/';
const KEY='cerco-dos-reis-forja-local-v1';
const bannerStyles=[
 {id:'steel',name:'Aço Real',code:'AÇO',color:'#7797b3',detail:'Prata e azul aço'},
 {id:'ember',name:'Brasa Antiga',code:'BRASA',color:'#d49b55',detail:'Cobre e ouro'},
 {id:'forest',name:'Bosque Real',code:'VERDE',color:'#3ba37e',detail:'Verde e esmeralda'},
 {id:'amethyst',name:'Coroa Mítica',code:'MÍTICO',color:'#9967d0',detail:'Violeta e prata'},
 {id:'scarlet',name:'Estandarte Rubro',code:'RUBRO',color:'#c55b73',detail:'Bordô imperial'},
 {id:'divine',name:'Chama Divina',code:'DIVINO',color:'#8dcfe3',detail:'Azul celeste e ouro'},
 {id:'night',name:'Cavaleiro da Noite',code:'NOITE',color:'#3e5377',detail:'Carvão e aço'},
 {id:'sun',name:'Trono Dourado',code:'OURO',color:'#e8b858',detail:'Dourado antigo'}
];
let selection='steel';
try{let value=localStorage.getItem(KEY);if(bannerStyles.some(s=>s.id===value))selection=value;}catch{}
function label(){const s=bannerStyles.find(x=>x.id===selection);$('#shopStatus').textContent='ACABAMENTO ATUAL: '+s.name.toUpperCase();document.documentElement.style.setProperty('--chosen-banner',s.color)}
function renderShop(){
 const grid=$('#shopGrid');grid.replaceChildren();
 for(const entry of bannerStyles){
  const btn=document.createElement('button');btn.type='button';btn.className='shop-item'+(entry.id===selection?' active':'');
  btn.setAttribute('aria-pressed',entry.id===selection?'true':'false');
  const swatch=document.createElement('span');swatch.className='swatch';swatch.style.setProperty('--swatch',entry.color);
  const name=document.createElement('strong');name.textContent=entry.name;
  const info=document.createElement('small');info.textContent=entry.id===selection?'EQUIPADO':'APLICAR GRÁTIS';
  btn.append(swatch,name,info);
  btn.addEventListener('click',()=>{
    selection=entry.id;try{localStorage.setItem(KEY,selection);}catch{}
    label();renderShop();
  });grid.append(btn);
 }
 label();
}
const featured=[
 ['Liliti','portrait_lilith_ruiva.webp','liliti'],
 ['Rei','portrait_rei.webp','rei'],
 ['Guardião','portrait_guardiao.webp','guardiao'],
 ['Colosso','portrait_colosso.webp','colosso'],
 ['Lobo','portrait_lobo.webp','lobo'],
 ['Batedor','portrait_batedor.webp','batedor'],
 ['Arqueiro','portrait_aprendiz_arqueiro.webp','arqueiro'],
 ['Soldado','portrait_aprendiz_soldado.webp','soldado']
];
function renderFeatured(){
 const grid=$('#featuredCards');grid.replaceChildren();
 featured.forEach(([name,img,id])=>{
  const b=document.createElement('button');b.type='button';b.className='featured-card';
  const picture=document.createElement('img');picture.src=ASSET+img;picture.alt='Arte de '+name;picture.loading='lazy';
  const label=document.createElement('strong');label.textContent=name;b.append(picture,label);
  b.addEventListener('click',()=>{
    const cardsButton=document.querySelector('#navigation [data-view="cards"]');cardsButton?.click();
    const card=[...document.querySelectorAll('#cardGrid button')].find(e=>e.textContent.includes(name));
    card?.click();
  });
  grid.append(b);
 });
}
function profileUpdate(){const wins=$('#wins')?.textContent||'0';const profileWins=$('#profileWins');if(profileWins)profileWins.textContent=wins}
document.querySelectorAll('#navigation [data-view]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.view==='profile')profileUpdate()}));
const install=$('#installApp');
let installPrompt=null;
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event});
install?.addEventListener('click',async()=>{
 if(installPrompt){const event=installPrompt;installPrompt=null;await event.prompt();await event.userChoice;}
 else{const msg='No Android, abra o menu do Chrome (⋮) e selecione "Instalar app" ou "Adicionar à tela inicial".';window.alert(msg);}
});
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}))}
renderShop();renderFeatured();profileUpdate();
})();
