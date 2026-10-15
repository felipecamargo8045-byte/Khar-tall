/* Shared, quiet touch feedback and private preparation prompts. */
(()=>{'use strict';
function create({audio,onConfirm}){
 const arena=document.querySelector('.arena'),bar=document.createElement('section'),copy=document.createElement('div'),label=document.createElement('span'),count=document.createElement('strong'),confirm=document.createElement('button'),message=document.createElement('div');
 bar.className='preparationBar';bar.hidden=true;bar.setAttribute('aria-label','Preparação das armadilhas');
 copy.className='preparationCopy';label.className='preparationLabel';count.className='preparationCount';copy.append(label,count);
 confirm.type='button';confirm.className='preparationConfirm';confirm.dataset.uiSound='confirm';confirm.onclick=onConfirm;
 bar.append(copy,confirm);arena.querySelector('.board-stage').before(bar);
 message.className='preparationToast';message.setAttribute('role','status');message.setAttribute('aria-live','polite');message.setAttribute('aria-atomic','true');document.body.append(message);
 let activeKey=null,timer=0;
 document.addEventListener('click',event=>{
  const target=event.target.closest?.('button,a[href]');
  if(!target||target.disabled||target.getAttribute('aria-disabled')==='true'||target.matches('.sq,#audioToggle,#sound,[data-ui-silent]'))return;
  audio.ui(target.dataset.uiSound||(target.matches('.primary')?'confirm':'tap'));
 },true);
 document.addEventListener('change',event=>{if(event.target.matches('select,input[type=checkbox],input[type=radio]')&&!event.target.disabled)audio.ui('tap');});
 return {
  preparation({active,key,count:placed=0,side='',busy=false}){
   bar.hidden=!active;document.body.classList.toggle('kt-preparing',active);
   if(!active){activeKey=null;clearTimeout(timer);message.classList.remove('visible');message.textContent='';return;}
   label.textContent='Armadilhas · '+side;count.textContent=`${placed} de 2 posicionadas`;
   confirm.textContent=busy?'Confirmando…':`✓ Confirmar armadilhas · ${placed}/2`;confirm.disabled=busy;
   confirm.classList.toggle('ready',placed===2);
   if(activeKey!==key){
    activeKey=key;clearTimeout(timer);message.textContent='Coloque suas armadilhas';message.classList.add('visible');
    timer=setTimeout(()=>{message.classList.remove('visible');},2800);
   }
  }
 };
}
window.KharTallUI={create};
})();
