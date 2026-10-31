/* Componentes integrados do portal de treinamento — sem transações e sem servidor original. */
(()=>{'use strict';
const $=s=>document.querySelector(s);
const ASSET='./origem-apk/assets/';
const KEY='cerco-dos-reis-forja-local-v1';
// Skin individual à venda para QUALQUER jogador na loja já existente
// do Khar Tall. Fragmentos dos Pergaminhos de Liliti são exclusivos
// de assinantes mensais, e não fazem parte da compra normal.
const bannerStyles=window.CercoRewards?.skins||[];
const STORE_URL='https://khar-tall-online.onrender.com/loja';
function renderShop(){
 const grid=$('#shopGrid');grid.replaceChildren();
 for(const entry of bannerStyles){
  const link=document.createElement('a');
  link.href=STORE_URL;
  link.target='_blank';link.rel='noopener noreferrer';
  link.className='shop-item';
  link.dataset.skinId=entry.id;
  link.dataset.purchaseUrl=STORE_URL;
  link.setAttribute('aria-label','Comprar skin '+entry.name+' na loja do Khar Tall por R$ 2,50');
  const swatch=document.createElement('span');
  swatch.className='swatch';swatch.style.setProperty('--swatch',entry.color);
  const name=document.createElement('strong');name.textContent=entry.name;
  const price=document.createElement('small');price.textContent='COMPRAR • R$ 2,50';
  const fragments=document.createElement('small');fragments.textContent='Fragmentos nos pergaminhos: só assinantes';
  link.append(swatch,name,price,fragments);
  grid.append(link);
 }
 $('#shopStatus').textContent='TODOS PODEM COMPRAR SKINS • R$ 2,50 CADA';
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

const CLAN_KEY='cerco-dos-reis-clan-local-v1';
const XP_KEY='cerco-reis-migracao-treino-v1';
let clan={name:'',motto:''};
try{
 const saved=JSON.parse(localStorage.getItem(CLAN_KEY)||'null');
 if(saved && typeof saved.name==='string' && typeof saved.motto==='string'){clan={name:saved.name.slice(0,25),motto:saved.motto.slice(0,55)}}
}catch{}
function renderClan(){
 const active=Boolean(clan.name);
 $('#clanDisplayName').textContent=active?clan.name.toUpperCase():'REINO SEM CLÃ';
 $('#clanDisplayMotto').textContent=active?(clan.motto||'A chama está viva.'):'Todo reino nasce de uma decisão.';
 $('#clanCreator').hidden=active;
 $('#clanView').hidden=!active;
 if(!active){$('#clanName').value=clan.name;$('#clanMotto').value=clan.motto}
}
$('#foundClan')?.addEventListener('click',()=>{
 const name=$('#clanName').value.trim().replace(/\s+/g,' ');
 const motto=$('#clanMotto').value.trim().replace(/\s+/g,' ');
 if(!name){$('#clanName').focus();return}
 clan={name:name.slice(0,25),motto:motto.slice(0,55)};
 try{localStorage.setItem(CLAN_KEY,JSON.stringify(clan))}catch{}
 renderClan();
});
$('#editClan')?.addEventListener('click',()=>{
 $('#clanCreator').hidden=false;$('#clanView').hidden=true;
 $('#clanName').value=clan.name;$('#clanMotto').value=clan.motto;
 $('#clanName').focus();
});
const profileRoster=[
 ['Liliti','portrait_lilith_ruiva.webp'],
 ['Rei','portrait_rei.webp'],
 ['Guardião','portrait_guardiao.webp'],
 ['Lobo','portrait_lobo.webp']
];
function renderProfileInventory(){
 const target=$('#profileCards');
 if(!target)return;
 target.replaceChildren();
 let progress={};
 try{progress=JSON.parse(localStorage.getItem(XP_KEY)||'{}').cards||{}}catch{}
 let evolved=0;
 for(const p of Object.values(progress)){if(p && Number(p.level)>1)evolved++}
 $('#profileEvolved').textContent=String(evolved);
 for(const [name,img] of profileRoster){
  const button=document.createElement('button');button.type='button';button.className='profile-card';
  const picture=document.createElement('img');picture.src=ASSET+img;picture.alt=name;
  const label=document.createElement('strong');label.textContent=name;
  const p=Object.entries(progress).find(([id])=>id===name.toLowerCase());
  const level=document.createElement('small');level.textContent='Nível '+(p?.[1]?.level||1);
  button.append(picture,label,level);
  button.addEventListener('click',()=>{
   document.querySelector('#navigation [data-view="cards"]')?.click();
   [...document.querySelectorAll('#cardGrid button')].find(b=>b.textContent.includes(name))?.click();
  });
  target.append(button);
 }
}
function profileUpdate(){
 const wins=$('#wins')?.textContent||'0';
 const profileWins=$('#profileWins');
 if(profileWins)profileWins.textContent=wins;
 renderProfileInventory();
}
document.querySelectorAll('#navigation [data-view]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.view==='profile')profileUpdate()}));
const install=$('#installApp');
let installPrompt=null;
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event});
install?.addEventListener('click',async()=>{
 if(installPrompt){const event=installPrompt;installPrompt=null;await event.prompt();await event.userChoice;}
 else{const msg='No Android, abra o menu do Chrome (⋮) e selecione "Instalar app" ou "Adicionar à tela inicial".';window.alert(msg);}
});
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}))}
renderShop();renderFeatured();renderClan();profileUpdate();
})();
