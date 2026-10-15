(()=>{'use strict';
const $=id=>document.getElementById(id),forms=['login','register','recover'];
document.querySelector('.kt-panel').appendChild($('recoveryResult'));
function show(txt,bad=false){let el=$('msg');el.textContent=txt;el.className='kt-status '+(bad?'error':'ok');}
function switchTab(which){for(const f of forms){$(f+'Form').classList.toggle('kt-hidden',f!==which);const btn=document.querySelector('[data-tab="'+f+'"]');btn.classList.toggle('active',which===f);} $('recoveryResult').classList.add('kt-hidden');$('msg').classList.add('kt-hidden');}
for(const btn of document.querySelectorAll('[data-tab]'))btn.addEventListener('click',()=>switchTab(btn.dataset.tab));
async function api(p,method='GET',data){let response=await fetch('/api/auth/'+p,{method,credentials:'same-origin',headers:method==='POST'?{'Content-Type':'application/json','X-Kt-Csrf':'1'}:{},body:method==='POST'?JSON.stringify(data):undefined,cache:'no-store'});let body=await response.json().catch(()=>({}));if(!response.ok)throw Error(body.error||'Erro ao acessar o servidor.');return body;}
let code='';function recovery(value){code=value;$('recoveryValue').textContent=value;$('recoveryResult').classList.remove('kt-hidden');}
async function refresh(){try{const status=await api('status');document.querySelector('[data-tab=register]').disabled=!status.registration_enabled;$('registerSubmit').disabled=!status.registration_enabled;const beta=$('betaInfo');if(!status.available){beta.textContent='O servidor de contas está temporariamente indisponível. O jogo como convidado continua funcionando.';return;}
 beta.textContent='Entre para guardar suas salas e retomá-las em outro dispositivo. Você também pode jogar como convidado.';let me=await api('me');$('account').classList.toggle('kt-hidden',!me.authenticated);$('anon').classList.toggle('kt-hidden',!!me.authenticated);if(me.authenticated)$('welcome').textContent='Bem-vindo, '+me.user.username+'!';if(!status.registration_enabled){document.querySelector('[data-tab="register"]').disabled=true;}}
 catch(e){$('betaInfo').textContent='Não foi possível conectar ao servidor de contas. Jogue como convidado ou tente novamente.';show(e.message,true);}}
async function submit(ev,path,values,success){ev.preventDefault();let btn=ev.submitter||ev.target.querySelector('button[type=submit]');if(btn)btn.disabled=true;try{let r=await api(path,'POST',values());await success(r);show('Operação concluída.');}catch(e){show(e.message,true);}finally{if(btn)btn.disabled=false;}}
$('loginForm').addEventListener('submit',e=>submit(e,'login',()=>({username:$('loginName').value,password:$('loginPassword').value}),async()=>{ $('loginPassword').value='';await refresh();}));
$('registerForm').addEventListener('submit',e=>submit(e,'register',()=>{if($('registerPassword').value!==$('registerRepeat').value)throw Error('As senhas não coincidem.');return {username:$('registerName').value,password:$('registerPassword').value,adult:$('registerAdult').checked,privacy_accepted:$('registerPrivacy').checked};},async r=>{recovery(r.recovery_code);for(const el of [$('registerPassword'),$('registerRepeat')])el.value='';await refresh();$('recoveryResult').classList.remove('kt-hidden');}));
$('recoverForm').addEventListener('submit',e=>submit(e,'recover',()=>({username:$('recoverName').value,recovery_code:$('recoverCode').value.trim(),password:$('recoverPassword').value}),async r=>{recovery(r.recovery_code);$('recoverPassword').value='';await refresh();$('recoveryResult').classList.remove('kt-hidden');}));
$('logout').addEventListener('click',async()=>{try{await api('logout','POST',{});await refresh();}catch(e){show(e.message,true);}});
$('showDelete').addEventListener('click',()=>$('deleteForm').classList.toggle('kt-hidden'));
$('deleteForm').addEventListener('submit',e=>submit(e,'delete',()=>({password:$('deletePassword').value,confirm:$('deleteConfirm').value}),async()=>{await refresh();show('Conta excluída permanentemente.');}));
$('copyCode').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(code);show('Código copiado. Guarde em local seguro.');}catch{show('Selecione e copie o código manualmente.',true);}});
$('finishCode').addEventListener('click',()=>{$('recoveryResult').classList.add('kt-hidden');code='';$('recoveryValue').textContent='';});
refresh();
})();
