(()=>{'use strict';const native=/KharTallAndroid\//.test(navigator.userAgent),path=location.pathname;
if(native){
 const css=document.createElement('link');css.rel='stylesheet';css.href='/app-shell.css';document.head.append(css);
 const installed=navigator.userAgent.match(/KharTallAndroid\/(\d+\.\d+\.\d+)/)?.[1];
 if(installed)fetch('/baixar/android.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(info=>{
  if(!info||!/^\d+\.\d+\.\d+$/.test(info.version))return;
  const a=info.version.split('.').map(Number),b=installed.split('.').map(Number);let newer=false;
  for(let i=0;i<3;i++){if(a[i]===b[i])continue;newer=a[i]>b[i];break;}
  if(!newer||localStorage.getItem('kt-update-dismissed')===info.version)return;
  const notice=document.createElement('aside');notice.className='kt-update-notice';notice.setAttribute('role','status');
  const text=document.createElement('span');text.textContent='Khar Tall '+info.version+' disponível. Instale sobre a versão atual para manter seus dados.';
  const link=document.createElement('a');link.href='/baixar/khar-tall.apk';link.textContent='Baixar atualização';
  const later=document.createElement('button');later.type='button';later.textContent='Depois';later.onclick=()=>{localStorage.setItem('kt-update-dismissed',info.version);notice.remove();};
  notice.append(text,link,later);document.body.prepend(notice);
 }).catch(()=>{});
}
if(!native){const css=document.createElement('link');css.rel='stylesheet';css.href='/app-shell.css';document.head.append(css);const nav=document.createElement('nav');nav.className='kt-app-nav';nav.setAttribute('aria-label','Navegação do aplicativo');for(const [url,icon,name]of [['/','♜','Jogar'],['/online','⚔','Online'],['/loja','◇','Loja'],['/conta','♙','Conta']]){const a=document.createElement('a');a.href=url;const span=document.createElement('span');span.textContent=icon;span.setAttribute('aria-hidden','true');a.append(span,document.createTextNode(name));if(path===url||(url==='/'&&path==='/jogar')||(url==='/loja'&&path==='/painel-loja')){a.className='active';a.setAttribute('aria-current','page');}nav.append(a);}document.body.append(nav);document.body.classList.add('kt-has-app-nav');}
if(!document.querySelector('link[rel=manifest]')){const manifest=document.createElement('link');manifest.rel='manifest';manifest.href='/manifest.webmanifest';document.head.append(manifest);}
if(!native&&'serviceWorker'in navigator){navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(()=>{});}
let prompt;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();prompt=e;document.dispatchEvent(new Event('kt-install-ready'));});
window.KharTallInstall={async install(){if(!prompt)return false;await prompt.prompt();const result=await prompt.userChoice;prompt=null;return result.outcome==='accepted';},async offline(){if(!('serviceWorker'in navigator))throw Error('Este navegador não permite preparar o modo offline.');const registration=await navigator.serviceWorker.ready;return new Promise((resolve,reject)=>{const channel=new MessageChannel(),timeout=setTimeout(()=>reject(Error('O preparo offline demorou demais. Tente novamente com uma conexão estável.')),90000);channel.port1.onmessage=e=>{clearTimeout(timeout);e.data.ok?resolve():reject(Error(e.data.error||'Não foi possível salvar o jogo offline.'));};registration.active.postMessage({type:'CACHE_GAME'},[channel.port2]);});}};
if(path==='/'||path==='/index.html'||path==='/jogar'||path==='/online'||path==='/online.html'){if(!document.querySelector('link[href="/app-shell.css"]')){const css=document.createElement('link');css.rel='stylesheet';css.href='/app-shell.css';document.head.append(css);}try{const saved=JSON.parse(localStorage.getItem('kt_theme')||'null');if(['ember','frost','obsidian'].includes(saved?.theme))document.documentElement.dataset.ktTheme=saved.theme;}catch{}
fetch('/api/store/me',{credentials:'same-origin',cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(me=>{window.KharTallAppearance?.setMe(me);const identity=document.getElementById('playerIdentity');if(identity)window.KharTallSkins?.decorate(identity,me.skin);const theme=me.authenticated?me.theme:'classic';document.documentElement.dataset.ktTheme=theme;localStorage.setItem('kt_theme',JSON.stringify({theme,user:me.user?.id||null}));}).catch(()=>{});}
})();

