(()=>{'use strict';
const origin='https://khar-tall-online.onrender.com',local=['localhost','127.0.0.1','terminal.local'].includes(location.hostname),same=location.origin===origin||local;
// Sites is an entrance to the canonical portal. Keep login cookies, saves and
// server protections on the existing game origin rather than proxying identity.
if(!same&&location.hostname.endsWith('.chatgpt.site')){location.replace(origin+'/portal'+location.hash);return;}
for(const link of document.querySelectorAll('[data-route]'))link.href=(same?'':origin)+link.dataset.route;
if(same)for(const img of document.querySelectorAll('[data-asset]'))img.src='/assets/'+img.dataset.asset;
const menu=document.querySelector('.menu-toggle'),nav=document.getElementById('mainNav');
function closeMenu(){nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Abrir navegação');}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';nav.classList.toggle('open',open);menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Fechar navegação':'Abrir navegação');});
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open')){closeMenu();menu.focus();}});
if('IntersectionObserver'in window){const sections=[...document.querySelectorAll('main>section[id]')];const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){nav.querySelectorAll('a[href^="#"]').forEach(a=>a.classList.toggle('active',a.hash==='#'+entry.target.id));}},{rootMargin:'-20% 0px -60% 0px'});sections.forEach(s=>observer.observe(s));}
if(!same)return;
const preview=document.getElementById('portalBoard');
if(preview&&window.KharTall){const initial=new KharTall(),fragment=document.createDocumentFragment();for(let y=0;y<10;y++)for(let x=0;x<10;x++){
 const cell=document.createElement('span');cell.className='preview-square '+((x+y)%2?'dark':'light');
 const piece=initial.pieceAt(x,y),field=initial.field(x,y);
 if(field){cell.classList.add(field.kind);cell.textContent=field.kind==='heal'?'✚':'◆';}
 if(piece){const img=document.createElement('img');img.src='/assets/token_'+piece.type+'.webp';img.alt='';img.loading='lazy';cell.classList.add(piece.side===0?'preview-red':'preview-blue');if(piece.original)cell.classList.add('preview-original');cell.append(img);}
 fragment.append(cell);
}preview.append(fragment);}
async function read(path){const r=await fetch(path,{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error();return r.json();}
const money=value=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value/100);
read('/api/store/catalog').then(c=>{const open=c.checkout_enabled===true;document.getElementById('shopBadge').textContent=open?'LOJA ABERTA':'LOJA EM PREPARAÇÃO';document.getElementById('shopStatus').textContent=!c.products.length?'O catálogo ainda está sendo preparado. Nenhum produto está à venda neste momento.':open?'Explore os produtos disponíveis. Skins por R$ 2,50 cada. Pagamento avulso por Pix ou cartão de crédito, via InfinitePay.':'Os produtos já podem ser consultados. Os pagamentos e as vendas ainda não foram abertos.';const list=document.getElementById('portalProducts');for(const p of c.products.slice(0,3)){const a=document.createElement('a');a.className='portal-product';a.href='/loja';const title=document.createElement('strong');title.textContent=p.title;const price=document.createElement('span');price.textContent=money(p.price_cents);a.append(title,price);list.append(a);}list.hidden=!c.products.length;}).catch(()=>{document.getElementById('shopBadge').textContent='CONSULTE A DISPONIBILIDADE';document.getElementById('shopStatus').textContent='Não foi possível consultar o catálogo agora. Tente abrir a loja novamente em instantes.';});
read('/api/auth/me').then(me=>{if(!me.authenticated)return;document.querySelector('[data-identity]').textContent=me.user.username;document.getElementById('accountTitle').textContent='Bem-vindo, '+me.user.username+'.';document.getElementById('accountStatus').textContent='Você está conectado à mesma conta usada no aplicativo. Acesse suas salas, sua coleção e seus pedidos.';document.getElementById('accountAction').textContent='Acessar minha conta →';return read('/api/store/me').then(shop=>{document.getElementById('adminPortalLink').hidden=!shop.admin;});}).catch(()=>{});
read('/baixar/android.json').then(info=>{document.getElementById('apkVersion').textContent='Versão '+info.version;document.getElementById('apkRequirements').textContent='Android '+info.min_android+' ou superior · '+(info.size/1000000).toLocaleString('pt-BR',{maximumFractionDigits:1})+' MB';const a=document.querySelector('[download]');a.download='khar-tall-'+info.version+'.apk';}).catch(()=>{});
if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(()=>{});
})();
