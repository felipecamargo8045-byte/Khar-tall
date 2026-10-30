/* Khar Tall: dublagens gravadas para cada classe, sem SpeechSynthesis do Android.
 * Kokoro-82M Apache-2.0, mixagem original por personagem, arquivos estáticos.
 * Lobo continua com os efeitos originais de mordida, sem uivo ou fala humana.
 */
(()=>{
'use strict';
const KEY='cerco-dos-reis-vozes-v1';
const CAST={
 arqueiro:{name:'Arqueiro',style:'jovem, ágil e preciso',lines:['Alvo à vista!','Disparo certeiro!'],hurt:['Preciso de cobertura!']},
 soldado:{name:'Soldado',style:'guerreiro firme',lines:['Pela linha de frente!','Minha espada não falha!'],hurt:['Ainda estou de pé!']},
 colosso:{name:'Colosso',style:'cavernoso e pesado',lines:['Vou esmagar!','O chão vai tremer!'],hurt:['Isso não me detém!']},
 guardiao:{name:'Guardião',style:'solene, protetor e ancestral',lines:['Nada passa!','Protegerei o reino!'],hurt:['Minha defesa resiste!']},
 batedor:{name:'Batedor',style:'rápido e ameaçador',lines:['Você está marcado!','Não existe fuga!'],hurt:['Ainda posso lutar!']},
 rei:{name:'Rei',style:'imponente e majestoso',lines:['Pelo meu reino!','O trono será defendido!'],hurt:['Não me derrotarão!'],victory:['A vitória é nossa!']},
 liliti:{name:'Liliti',style:'misteriosa, elegante e encantadora',lines:['Sua vontade é minha.','Sinta o meu encanto.'],hurt:['Você vai se arrepender!']},
 lobo:{name:'Lobo',style:'mordida original, sem fala ou uivo',lines:[],hurt:[]}
};
let enabled=true;
try{const v=JSON.parse(localStorage.getItem(KEY)||'null');if(v)enabled=v.enabled!==false;}catch{}
const Ctx=window.AudioContext||window.webkitAudioContext;
const samples=new Map(),pending=new Map(),lastByCharacter=new Map(),countByLine=new Map(),history=[];
let manifest=null,context=null,loadError=null,playing=null,lastGlobal=-Infinity,voiceUntil=0;
const now=()=>performance.now();
const contextReady=()=>!!context&&context.state==='running';
function mixerVolume(){
 const settings=window.CercoAudio?.getSettings?.();
 return settings?.on===false?0:Math.min(1,settings?.volume??.55);
}
function load(){
 if(!Ctx)return Promise.resolve(false);
 if(!context)context=new Ctx();
 if(!manifest){
  return fetch('./voice-pack/manifest.json?v=1',{cache:'force-cache'}).then(async r=>{
    if(!r.ok)throw Error('Pacote de dublagem não publicado');
    manifest=await r.json();
    const jobs=[];
    for(const [id,character] of Object.entries(manifest.characters||{})){
     for(const [event,files] of Object.entries(character.clips||{})){
       files.forEach((file,index)=>{
        const key=id+':'+event+':'+index;
        if(pending.has(key))return;
        const promise=fetch('./voice-pack/'+file,{cache:'force-cache'})
          .then(r=>{if(!r.ok)throw Error('Arquivo ausente: '+file);return r.arrayBuffer()})
          .then(bytes=>context.decodeAudioData(bytes))
          .then(buffer=>{samples.set(key,buffer);return true})
          .catch(error=>{loadError=String(error);return false});
        pending.set(key,promise);jobs.push(promise);
       });
     }
    }
    await Promise.all(jobs);
    return samples.size>0;
   }).catch(error=>{loadError=String(error);return false});
 }
 return Promise.all([...pending.values()]).then(()=>samples.size>0);
}
function unlock(){
 if(!Ctx)return false;
 load().catch(()=>{});
 if(context?.state==='suspended')context.resume().catch(()=>{});
 return true;
}
function permitted(){
 return enabled && mixerVolume()>0 && contextReady() && samples.size>0;
}
function stop(){
 if(playing){try{playing.stop(0)}catch{};try{playing.disconnect()}catch{};playing=null}
 voiceUntil=0;
}
function speak(id,event='attack'){
 const char=CAST[id];
 if(!char||id==='lobo'||!permitted())return false;
 const lines=event==='attack'?char.lines:event==='hurt'?char.hurt:event==='victory'?char.victory||char.lines:[];
 if(!lines?.length)return false;
 const timestamp=now(),key=id+':'+event;
 const last=lastByCharacter.get(key)??-Infinity;
 const minGap=event==='hurt'?17000:event==='victory'?200:12500;
 if(timestamp-last<minGap||timestamp-lastGlobal<(event==='victory'?900:3600)||timestamp<voiceUntil)return false;
 const n=countByLine.get(key)||0;
 let selected=null,idx=-1;
 for(let i=0;i<lines.length;i++){
  const p=(n+i)%lines.length,k=key+':'+p;
  if(samples.has(k)){selected=samples.get(k);idx=p;break}
 }
 if(!selected)return false;
 try{
  const node=context.createBufferSource(),gain=context.createGain(),base=mixerVolume();
  node.buffer=selected;
  gain.gain.value=Math.max(.04,Math.min(.75,base*(event==='victory'?.98:.83)));
  node.connect(gain);gain.connect(context.destination);
  node.onended=()=>{if(playing===node)playing=null;gain.disconnect()};
  node.start(0);
  playing=node;voiceUntil=timestamp+selected.duration*1000+190;
 }catch{return false}
 countByLine.set(key,idx+1);
 lastByCharacter.set(key,timestamp);lastGlobal=timestamp;
 history.push({id,event,line:lines[idx],file:manifest?.characters?.[id]?.clips?.[event]?.[idx]||'',timestamp});
 if(history.length>80)history.shift();
 return true;
}
function setEnabled(v){
 enabled=!!v;if(!enabled)stop();
 try{localStorage.setItem(KEY,JSON.stringify({enabled}))}catch{}
 sync();
}
function toggle(){setEnabled(!enabled);if(enabled)unlock()}
function sync(){
 for(const id of ['voiceToggle','battleVoice']){
  const b=document.getElementById(id);if(!b)continue;
  b.textContent=enabled?'🗣':'⊘';b.title=enabled?'Desligar dublagem':'Ativar dublagem';
  b.setAttribute('aria-label',b.title);b.setAttribute('aria-pressed',String(enabled));
 }
}
function init(){
 for(const id of ['voiceToggle','battleVoice'])document.getElementById(id)?.addEventListener('click',toggle);
 sync();
 // Decodificação local em memória. O som propriamente dito só inicia após o
 // usuário tocar em "Iniciar batalha"; não há streaming nem cobrança por fala.
 load().catch(()=>{});
}
window.CercoVoices={
 profiles:CAST,unlock,speak,stop,toggle,setEnabled,enabled:()=>enabled,
 status:()=>({recorded:true,supported:!!Ctx,enabled,loaded:samples.size,total:pending.size,
   error:loadError,characters:Object.keys(CAST),language:'pt-BR',fallbackSpeechSynthesis:false}),
 history:()=>history.map(x=>({...x})),
 dialogue:(id,event='attack')=>{
  const c=CAST[id];return !c?[]:event==='hurt'?c.hurt:event==='victory'?c.victory||c.lines:c.lines},
 sync
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();