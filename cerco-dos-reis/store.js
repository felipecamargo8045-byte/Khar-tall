/* Loja própria do Cerco dos Reis. Compras são confirmadas no servidor. */
(()=>{'use strict';
const API='https://cerco-dos-reis-loja.onrender.com';
const KEY='cerco-store-collection-key-v1';
let token=localStorage.getItem(KEY)||'',state={owned:[],equipped:null,orders:[]},busy=false;
function collectionKey(){if(!/^[A-Za-z0-9_-]{43}$/.test(token)){const data=crypto.getRandomValues(new Uint8Array(32));token=btoa(String.fromCharCode(...data)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');localStorage.setItem(KEY,token)}return token}
async function request(path,data){const response=await fetch(API+path,{method:data?'POST':'GET',headers:{Authorization:'Bearer '+collectionKey(),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(60000)});const result=await response.json().catch(()=>({}));if(!response.ok)throw Error(result.error||'A loja não respondeu. Tente novamente.');return result}
function message(text){const el=document.getElementById('cercoShopMessage');if(el)el.textContent=text}
function notify(){const skin=snapshot().skin;for(const name of document.querySelectorAll('#lobbyProfile .lobby-player-details>strong,.profile-content h2'))name.style.color=skin?.color||'';document.dispatchEvent(new CustomEvent('cerco:collection',{detail:snapshot()}));render()}
function snapshot(){return{owned:[...state.owned],equipped:state.equipped,skin:window.CercoRewards?.skins.find(s=>s.id===state.equipped)||null}}
async function sync(){try{state=await request('/collection');notify()}catch{}}
async function buy(id){
 if(busy)return;busy=true;message('Preparando o pagamento seguro…');
 try{if(state.owned.includes(id)){state=await request('/equip',{skinId:id});notify();message('Skin equipada no seu exército.');return}
  const order=await request('/orders',{skinId:id});
  const target=new URL(order.url);if(target.protocol!=='https:'||!['checkout.infinitepay.io','checkout.infinitepay.com.br'].includes(target.hostname))throw Error('Checkout não disponível.');
  window.location.assign(target.href);
 }catch(error){message(error.message)}finally{busy=false}
}
function render(){
 for(const button of document.querySelectorAll('[data-cerco-buy]')){
  const id=button.dataset.cercoBuy;
  const label=state.equipped===id?'EQUIPADA':state.owned.includes(id)?'EQUIPAR':'COMPRAR R$ 2,50';
  if(button.classList.contains('shop-item')){const price=button.querySelector('small');if(price)price.textContent=label}else button.textContent=label;
 }
 const orders=document.getElementById('cercoShopOrders');if(!orders)return;
 orders.replaceChildren();
 for(const order of state.orders.slice(0,6)){
  const row=document.createElement('div');row.className='cerco-order';
  const skin=window.CercoRewards?.skins.find(s=>s.id===order.skin_id),label=document.createElement('span');
  label.textContent=(skin?.name||'Skin')+' · '+({approved:'Pagamento confirmado',pending:'Aguardando pagamento',creating:'Preparando',failed:'Não concluído',refunded:'Reembolsado'}[order.status]||order.status);
  row.append(label);
  if(order.status==='pending'){
   const check=document.createElement('button');check.className='secondary-btn';check.textContent='Conferir pagamento';
   check.addEventListener('click',async()=>{try{const r=await request('/verify',{orderId:order.id});state=r.collection;notify();message(r.paid?'Pagamento confirmado. Skin disponível para equipar.':'Ainda aguardando a confirmação. Se já pagou, use Continuar na tela da InfinitePay para voltar ao jogo.')}catch(e){message(e.message)}});row.append(check);
  }
  orders.append(row);
 }
}
function setup(){
 const shop=document.querySelector('[data-page="shop"]');if(!shop)return;
 const panel=document.createElement('section');panel.className='panel cerco-shop-account';
 panel.innerHTML='<div class="overline">LOJA DO CERCO DOS REIS</div><h3>Minha coleção e pedidos</h3><p id="cercoShopMessage" role="status">Compra única de aparência visual. Pagamento por Pix ou cartão de crédito no checkout da InfinitePay; a skin é liberada após a confirmação.</p><div id="cercoShopOrders"></div><details><summary>Usar a coleção em outro aparelho</summary><p>Guarde seu código de coleção em local privado. Ele permite recuperar suas compras e não deve ser compartilhado.</p><button class="secondary-btn" id="cercoSaveCollection">Mostrar meu código</button><input id="cercoCollectionCode" type="text" autocomplete="off" aria-label="Código privado da coleção" hidden><button class="secondary-btn" id="cercoRestoreCollection">Restaurar coleção</button></details><details><summary>Atendimento do Cerco dos Reis</summary><textarea id="cercoSupportText" rows="3" maxlength="3000" aria-label="Mensagem para o atendimento" placeholder="Descreva sua dúvida. Não envie senhas ou dados de cartão."></textarea><button class="secondary-btn" id="cercoSendSupport">Enviar mensagem</button></details>';
 shop.append(panel);
 document.getElementById('cercoSaveCollection').addEventListener('click',()=>{const input=document.getElementById('cercoCollectionCode');input.hidden=false;input.value=collectionKey();input.focus();input.select()});
 document.getElementById('cercoRestoreCollection').addEventListener('click',async()=>{const input=document.getElementById('cercoCollectionCode');if(input.hidden){input.hidden=false;input.value='';input.focus();message('Cole o código privado da sua coleção e toque em Restaurar coleção.');return}const next=input.value.trim();if(!/^[A-Za-z0-9_-]{43}$/.test(next)){message('Confira o código da coleção.');return}const previous=token;token=next;try{const found=await request('/collection');if(!found.exists)throw Error('Coleção não encontrada. Confira o código.');localStorage.setItem(KEY,token);state=found;notify();input.hidden=true;message('Coleção restaurada.')}catch(error){token=previous;message(error.message)}});
 document.getElementById('cercoSendSupport').addEventListener('click',async()=>{try{const r=await request('/support',{message:document.getElementById('cercoSupportText').value});message(r.message+' Protocolo: '+r.id);document.getElementById('cercoSupportText').value=''}catch(e){message(e.message)}});
 document.addEventListener('click',event=>{const button=event.target.closest('[data-cerco-buy]');if(button){event.preventDefault();document.querySelector('#navigation [data-view="shop"]')?.click();buy(button.dataset.cercoBuy)}});
 const url=new URL(location.href),id=url.searchParams.get('cerco_order')||url.searchParams.get('order_nsu');
 if(id&&url.searchParams.get('transaction_nsu')&&url.searchParams.get('slug')){
  const data={orderId:id,order_nsu:url.searchParams.get('order_nsu')||id,transaction_nsu:url.searchParams.get('transaction_nsu'),slug:url.searchParams.get('slug')};
  for(const key of ['cerco_order','order_nsu','transaction_nsu','slug','receipt_url','capture_method'])url.searchParams.delete(key);
  history.replaceState(null,'',url.pathname+url.search+'#shop');document.querySelector('#navigation [data-view="shop"]')?.click();
  message('Confirmando o pagamento…');request('/verify',data).then(r=>{state=r.collection;notify();message(r.paid?'Pagamento confirmado. Sua skin já está na coleção.':'Pagamento ainda aguardando confirmação.')}).catch(e=>message(e.message));
 }else if(token)sync();
 window.addEventListener('focus',()=>{if(token)sync()});
}
window.CercoStore={buy,snapshot,sync};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
