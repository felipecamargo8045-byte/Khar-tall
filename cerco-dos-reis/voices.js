/* Cerco dos Reis — vozes exclusivas das cartas, sem serviços pagos.
 * Vozes humanas usam SpeechSynthesis pt-BR do próprio aparelho.
 * O Lobo nunca recebe fala humana nem uivo; sua voz é o som de mordida/rosnado
 * original do Khar Tall quando ele ATACA.
 * Os efeitos WAV originais continuam independentes deste módulo.
 */
(()=>{
'use strict';
const STORAGE='cerco-dos-reis-vozes-v1';
const CHARACTERS=Object.freeze({
 arqueiro:{name:'Arqueiro',tone:'preciso e jovem',pitch:1.37,rate:1.19,volume:.58,
   lines:['Alvo à vista!','Disparo certeiro!','Tenho você na mira!'],
   hurt:['Fui atingido!','Preciso de cobertura!']},
 soldado:{name:'Soldado',tone:'firme e determinado',pitch:.86,rate:1.03,volume:.64,
   lines:['Pela linha de frente!','Minha espada não falha!','Avançar!'],
   hurt:['Não vou cair!','Ainda estou de pé!']},
 colosso:{name:'Colosso',tone:'grave e lento',pitch:.52,rate:.79,volume:.69,
   lines:['Vou esmagar!','Saiam do meu caminho!','O chão vai tremer!'],
   hurt:['Isso não me detém!','A pedra não se rende!']},
 guardiao:{name:'Guardião',tone:'solene e protetor',pitch:.69,rate:.90,volume:.66,
   lines:['Nada passa!','Protegerei o reino!','A minha guarda não cai!'],
   hurt:['Minha defesa resiste!','Não permitirei sua passagem!']},
 batedor:{name:'Batedor',tone:'ágil e ameaçador',pitch:1.10,rate:1.26,volume:.59,
   lines:['Você está marcado!','Já te encontrei!','Não existe fuga!'],
   hurt:['Ainda posso lutar!','Estava por pouco!']},
 rei:{name:'Rei',tone:'autoritário e majestoso',pitch:.66,rate:.85,volume:.70,
   lines:['Pelo meu reino!','Todos, ao ataque!','O trono será defendido!'],
   hurt:['Não me derrotarão!','Meu reino não cairá!'],
   victory:['A vitória é nossa!','Nosso reino permanece de pé!']},
 liliti:{name:'Liliti',tone:'envolvente e misteriosa',pitch:1.20,rate:.86,volume:.59,
   lines:['Sua vontade é minha.','Sinta o meu encanto.','A noite me obedece.'],
   hurt:['Não toque em mim!','Você vai se arrepender!']},
 lobo:{name:'Lobo',tone:'rosnado animal e mordida, sem fala humana e sem uivo',pitch:null,rate:null,volume:.68,
   lines:[],hurt:[]}
});
let enabled=true;
try{const v=JSON.parse(localStorage.getItem(STORAGE)||'null');if(v)enabled=v.enabled!==false;}catch{}
const supported=typeof window.speechSynthesis!=='undefined'&&typeof window.SpeechSynthesisUtterance==='function';
const synthesis=supported?window.speechSynthesis:null;
const lastByCharacter=new Map();
const counters=new Map();
const history=[];
let lastGlobal=-Infinity,activeUntil=0,lastNativeVoice='',voiceNames=[];
function clock(){return typeof performance!=='undefined'?performance.now():Date.now()}
function selectedVoice(id){
 if(!synthesis)return null;
 let voices=[];
 try{voices=synthesis.getVoices()||[]}catch{}
 voiceNames=voices.map(v=>v.name);
 const portuguese=voices.filter(v=>/^pt(?:-|_)/i.test(v.lang||''));
 const br=portuguese.filter(v=>/^pt[-_]BR$/i.test(v.lang||''));
 const options=br.length?br:portuguese;
 if(options.length===0)return voices.find(v=>v.default)||null;
 // Diferentes timbres instalados no aparelho, além de ritmo e afinação
 // próprios. Não depende de uma voz específica existir no Android.
 const order={arqueiro:1,soldado:0,colosso:0,guardiao:0,batedor:1,rei:0,liliti:2};
 const preferred=options[(order[id]||0)%options.length];
 if(id==='liliti'){
  return options.find(v=>/female|mulher|maria|luciana|francisca|bruna|femin/i.test(v.name))||preferred;
 }
 if(id==='rei'||id==='colosso'||id==='guardiao'){
  return options.find(v=>/male|homem|daniel|ricardo|felipe|masculin/i.test(v.name))||preferred;
 }
 return preferred;
}
function validToSpeak(){
 return enabled&&(window.CercoAudio?.getSettings?.().on!==false)&&
   (window.CercoAudio?.getSettings?.().volume??.55)>0;
}
function speak(id,event='attack',opts={}){
 const char=CHARACTERS[id];
 if(!char)return false;
 // O Lobo tem vocalização animal original, não imitação humana.
 if(id==='lobo'){
   if(event==='attack')return window.CercoAudio?.play?.('wolf',{card:'lobo'})===true;
   return false;
 }
 if(!validToSpeak()||!supported||!synthesis)return false;
 const now=clock();
 const cooldown=event==='hurt'?16500:event==='victory'?0:12500;
 const latest=lastByCharacter.get(id+':'+event)||-Infinity;
 const interval=event==='victory'?1000:3500;
 if(now-latest<cooldown||now-lastGlobal<interval||now<activeUntil)return false;
 const lines=event==='hurt'?char.hurt:event==='victory'?(char.victory||char.lines):char.lines;
 if(!lines?.length)return false;
 const key=id+':'+event,seq=counters.get(key)||0;
 counters.set(key,seq+1);
 const line=lines[seq%lines.length];
 let utterance;
 try{
  utterance=new SpeechSynthesisUtterance(line);
  utterance.lang='pt-BR';utterance.rate=char.rate;utterance.pitch=char.pitch;
  const master=window.CercoAudio?.getSettings?.().volume??.55;
  utterance.volume=Math.max(.12,Math.min(1,char.volume*master));
  const voice=selectedVoice(id);
  if(voice){utterance.voice=voice;lastNativeVoice=voice.name}
  utterance.onerror=()=>{activeUntil=0};
  utterance.onend=()=>{activeUntil=0};
  // Nunca formar fila de falas; uma única frase curta por vez.
  if(synthesis.pending||synthesis.speaking)return false;
  synthesis.speak(utterance);
 }catch{return false}
 lastByCharacter.set(key,now);
 lastGlobal=now;
 activeUntil=now+Math.max(900,Math.ceil(line.length/(13*char.rate)*1000));
 history.push({id,event,line,pitch:char.pitch,rate:char.rate,voice:utterance.voice?.name||'padrão do dispositivo',at:now});
 if(history.length>80)history.shift();
 return true;
}
function stop(){
 if(synthesis){try{synthesis.cancel()}catch{}}
 activeUntil=0;
}
function setEnabled(value){
 enabled=Boolean(value);
 if(!enabled)stop();
 try{localStorage.setItem(STORAGE,JSON.stringify({enabled}))}catch{}
 syncButtons();
}
function toggle(){setEnabled(!enabled)}
function syncButtons(){
 for(const id of ['voiceToggle','battleVoice']){
  const button=document.getElementById(id);
  if(!button)continue;
  button.textContent=enabled?'🗣':'⊘';
  button.title=enabled?'Silenciar falas dos personagens':'Ativar falas dos personagens';
  button.setAttribute('aria-pressed',String(enabled));
  button.setAttribute('aria-label',button.title);
 }
}
function init(){
 for(const id of ['voiceToggle','battleVoice']){
  document.getElementById(id)?.addEventListener('click',toggle);
 }
 syncButtons();
 if(synthesis){
  // Chromium pode adicionar vozes depois da inicialização.
  synthesis.addEventListener?.('voiceschanged',()=>{selectedVoice('rei')});
  selectedVoice('rei');
 }
}
window.CercoVoices={
 profiles:CHARACTERS,speak,stop,toggle,setEnabled,enabled:()=>enabled,
 status:()=>({supported,enabled,voiceCount:voiceNames.length,selected:lastNativeVoice,characters:Object.keys(CHARACTERS),speechOnly:true}),
 history:()=>history.map(x=>({...x})),
 // Somente para inspeção nos testes; não emite falas.
 dialogue:(id,event='attack')=>{const char=CHARACTERS[id];return char?(event==='hurt'?char.hurt:event==='victory'?(char.victory||char.lines):char.lines):[]},
 sync:syncButtons
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
