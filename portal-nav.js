(()=>{'use strict';
if(/KharTallAndroid\//.test(navigator.userAgent))return;
const style=document.createElement('link');style.rel='stylesheet';style.href='/portal-nav.css';document.head.append(style);
const nav=document.createElement('nav');nav.className='kt-portal-nav';nav.setAttribute('aria-label','Portal oficial Khar Tall');
for(const [href,title]of [['/portal','KHAR TALL'],['/jogar','Jogar'],['/portal#como-jogar','Como jogar'],['/instalar','Baixar aplicativo'],['/loja','Loja'],['/conta','Minha conta']]){const a=document.createElement('a');a.href=href;a.textContent=title;if(location.pathname===href){a.setAttribute('aria-current','page');}nav.append(a);}
document.body.prepend(nav);
})();
