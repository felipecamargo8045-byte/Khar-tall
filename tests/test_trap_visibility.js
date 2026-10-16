'use strict';
// Exercise the real UI script without a browser dependency or real audio.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {KharTall}=require('../engine.js');
function ui(saved=null,{random=0,reduced=true,search=''}={}){
 const elements=new Map(),frames=[],timeouts=new Map(),rafs=[],listeners=new Map(),intervals=[];let nextTimer=1,now=Date.now();
 class Clock extends Date{static now(){return now;}}
 class Element{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attributes={};this.style={setProperty(){}};this.parentElement=null;this.hidden=false;this._class='';this._text='';this._html='';
   this.classList={contains:c=>this._class.split(/\s+/).includes(c),add:(...cs)=>{this._class=[...new Set([...this._class.split(/\s+/).filter(Boolean),...cs])].join(' ');},remove:(...cs)=>{this._class=this._class.split(/\s+/).filter(c=>!cs.includes(c)).join(' ');},toggle:(c,force)=>{const enabled=force===undefined?!this.classList.contains(c):force;enabled?this.classList.add(c):this.classList.remove(c);return enabled;}};
  }
  set className(v){this._class=v;}get className(){return this._class;}
  set textContent(v){this._text=String(v??'');this.children=[];}get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}
  set innerHTML(v){this._html=String(v);this._text='';this.children=[];}get innerHTML(){return this._html;}
  append(...nodes){for(let node of nodes){if(typeof node==='string'){const text=new Element('#text');text.textContent=node;node=text;}if(node.tagName==='#FRAGMENT'){this.append(...node.children.slice());continue;}node.parentElement=this;this.children.push(node);}}
  replaceChildren(...nodes){this.children=[];this._text='';this._html='';this.append(...nodes);if(this===elements.get('board'))frames.push(traps());}
  prepend(...nodes){const old=this.children;this.children=[];this.append(...nodes,...old);}
  setAttribute(k,v){this.attributes[k]=String(v);}getAttribute(k){return this.attributes[k]??null;}removeAttribute(k){delete this.attributes[k];}
  addEventListener(){}focus(){}before(){}remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(x=>x!==this);}
  matches(selector){if(selector.includes(' '))selector=selector.split(' ').at(-1);return selector.split(',').some(s=>{s=s.trim();if(s.startsWith('#'))return this.id===s.slice(1);const klass=s.match(/^\.([\w-]+)/);return klass?this.classList.contains(klass[1])&&(!s.includes('[data-pid]')||this.dataset.pid!==undefined):s.toUpperCase()===this.tagName;});}
  querySelectorAll(selector){const found=[];function walk(n){for(const child of n.children){if(child.matches(selector))found.push(child);walk(child);}}walk(this);return found;}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}closest(){return stage;}
  getBoundingClientRect(){const pos=this.parentElement?.index||0;return {left:(pos%10)*40,top:Math.floor(pos/10)*40,width:40,height:40};}
  cloneNode(deep){const n=new Element(this.tagName);n.className=this.className;n.dataset={...this.dataset};n._text=this._text;if(deep)n.append(...this.children.map(c=>c.cloneNode(true)));return n;}
  animate(){return {};}
  click(){if(!this.disabled&&this.onclick)this.onclick({target:this});}
 }
 const body=new Element('body'),stage=new Element('div');stage.className='board-stage';
 function get(id){if(!elements.has(id)){const e=new Element('div');e.id=id;elements.set(id,e);body.append(e);}return elements.get(id);}
 function traps(){const board=elements.get('board');return board?board.children.filter(c=>c.classList.contains('sq')).flatMap((cell,i)=>cell.querySelector('.trapIcon')?[`${i%10},${Math.floor(i/10)}`]:[]):[];}
 const document={body,createElement:t=>new Element(t),createTextNode:t=>{const e=new Element('#text');e.textContent=t;return e;},createDocumentFragment:()=>new Element('#fragment'),getElementById:get,querySelectorAll:selector=>selector.startsWith('#board ')?get('board').querySelectorAll(selector.slice(7)):body.querySelectorAll(selector),addEventListener:(name,fn)=>listeners.set(name,fn)};
 const values=new Map(saved?[['khar-tall-v2-save',JSON.stringify(saved)]]:[]);
 class Game extends KharTall{constructor(options={}){super({...options,random:()=>random});}static restore(state){const g=new Game();g.s=structuredClone(state);return g;}}
 Game.CONSTANTS=KharTall.CONSTANTS;
 const sandbox={console,document,localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},location:{search},URLSearchParams,Date:Clock,Map,Set,Math,KharTallLearning:require('../learning.js'),
  KharTall:Game,KharTallAudio:{create:()=>({preload:()=>Promise.resolve(),setEnabled(){},utility(){},ui(){},play(){},sequence(){}})},KharTallUI:{create:()=>({preparation(){}})},
  setTimeout:(fn,ms)=>{const id=nextTimer++;timeouts.set(id,{fn,ms});return id;},clearTimeout:id=>timeouts.delete(id),setInterval:fn=>{intervals.push(fn);return intervals.length;},requestAnimationFrame:fn=>rafs.push(fn),matchMedia:()=>({matches:reduced}),addEventListener(){}};
 sandbox.window=sandbox;vm.runInNewContext(fs.readFileSync(require.resolve('../app.js'),'utf8'),sandbox,{filename:'app.js'});
 return {api:sandbox.KharTallV2,get,frames,traps,key:key=>listeners.get('keydown')?.({key}),saved:()=>values.get('khar-tall-v2-save'),visibility:hidden=>{document.hidden=hidden;listeners.get('visibilitychange')?.();},advance:ms=>{now+=ms;intervals.forEach(fn=>fn());},clickText:(text)=>{const b=get('modalRoot').querySelectorAll('button').find(x=>x.textContent.includes(text)||x.innerHTML.includes(text));assert.ok(b,'Botão '+text);b.click();},flushRaf:()=>{for(const fn of rafs.splice(0))fn();},aiStep:()=>{const entry=[...timeouts].find(([,t])=>t.ms>=430&&t.ms<=900);assert.ok(entry,'IA agendada');timeouts.delete(entry[0]);entry[1].fn();}};
}
module.exports={ui};
if(require.main===module){
// During the computer turn only the human's traps may exist in rendered DOM.
for(const reduced of [true,false])for(const random of [0,.99]){
 const view=ui(null,{reduced,random});view.api.launch('ai',1);const g=view.api.getGame();view.get('board').children[44].click();view.get('board').children[45].click();assert.deepEqual(view.traps(),['4,4','5,4'],'Humano vê suas armadilhas na preparação');view.get('finishSetup').click();
 const enemy=g.s.traps.filter(t=>t.side===1).map(t=>`${t.x},${t.y}`),own=g.s.traps.filter(t=>t.side===0).map(t=>`${t.x},${t.y}`);
 view.frames.length=0;if(g.s.side===0)view.get('passTurn').click();
 assert.equal(g.s.side,1);assert.ok(enemy.length);assert.deepEqual(view.traps(),own,'Turno da IA mantém visão do humano');
 for(const frame of view.frames)for(const pos of enemy)assert.ok(!frame.includes(pos),'Nem um quadro pode revelar armadilha da IA');
 view.flushRaf();assert.deepEqual(view.traps(),own);view.aiStep();view.flushRaf();assert.ok(view.traps().every(p=>!enemy.includes(p)),'Animação e retorno da IA preservam sigilo');
 const saved=g.snapshot();saved.side=1;const resumed=ui(saved,{reduced,random});resumed.clickText('Continuar partida');assert.ok(resumed.traps().every(p=>!enemy.includes(p)),'Retomar turno da IA não revela armadilhas');
}
// Shared device: hide every trap under the curtain; reveal only after consent.
{
 const view=ui(),g=(view.api.launch('local'),view.api.getGame());g.placeTrap(0,4,4);view.get('clearSelect').click();view.get('finishSetup').click();assert.deepEqual(view.traps(),[],'Troca para preparação azul oculta todas');
 view.clickText('Estou pronto');g.placeTrap(1,5,5);view.get('finishSetup').click();assert.deepEqual(view.traps(),[],'Sorteio coberto não mostra armadilhas');
 view.clickText('Estou pronto');assert.deepEqual(view.traps(),['4,4']);view.frames.length=0;view.get('passTurn').click();assert.deepEqual(view.traps(),[],'Troca de turno oculta todas');
 assert.ok(view.frames.every(f=>!f.includes('5,5')),'Não renderiza armadilha do próximo jogador antes da confirmação');view.flushRaf();assert.deepEqual(view.traps(),[]);view.clickText('Estou pronto');assert.deepEqual(view.traps(),['5,5']);
 const saved=g.snapshot(),resumed=ui(saved);assert.deepEqual(resumed.traps(),[]);resumed.clickText('Continuar partida');assert.deepEqual(resumed.traps(),[],'Retomada local mantém a cortina');resumed.clickText('Estou pronto');assert.deepEqual(resumed.traps(),['5,5']);
}
console.log('Trap privacy UI OK: AI turns/start/animations, every rendered frame, shared-device preparation/handoff and save resume.');

}
