import assert from 'node:assert/strict';
await import('../liliti-healing.js');
const api=globalThis.CercoLiliti;
function state(level){
 const caster={id:1,card:{id:'liliti'},side:'ally',lane:0,x:110,y:400,hp:500,maxHp:750,level};
 return {caster,game:{time:160,units:[caster,
  {id:2,side:'ally',lane:0,x:110,y:390,hp:200,maxHp:330},
  {id:3,side:'ally',lane:1,x:310,y:390,hp:200,maxHp:330},
  {id:4,side:'enemy',lane:0,hp:200,maxHp:330},
  {id:5,side:'ally',lane:0,hp:0,maxHp:330}],towers:{ally:[1000,1000],enemy:[1000,1000]},castles:{ally:2000,enemy:2000}}};
}
for(const [level,count,towers,castle] of [[1,1,0,false],[39,1,0,false],[40,2,0,false],[59,2,0,false],[60,2,1,false],[79,2,1,false],[80,2,2,false],[99,2,2,false],[100,3,2,true]]){
 const {caster,game}=state(level),result=api.restore(caster,100,game);
 assert.equal(result.troops.length,count,'Rotas de cura no nível '+level);
 assert.equal(result.structures.filter(x=>x.slot<2).length,towers);
 assert.equal(result.structures.some(x=>x.slot===2),castle);
 assert.ok(result.troops.reduce((sum,x)=>sum+x.amount,0)<=50.00001,'Cura se multiplicou por alvo');
 assert.equal(game.units[3].hp,200,'Curou inimigo');assert.equal(game.units[4].hp,0,'Ressuscitou tropa');
 const again=api.restore(caster,100,game);assert.equal(again.structures.length,0,'Cura de estrutura sem intervalo');
 game.time-=4;const later=api.restore(caster,100,game);assert.equal(later.structures.length,towers+(castle?1:0));
}
const {caster,game}=state(100);game.towers.ally[0]=0;game.castles.ally=0;
assert.ok(api.restore(caster,9999,game).troops.reduce((sum,x)=>sum+x.amount,0)<=85.00001);
assert.equal(game.towers.ally[0],0);assert.equal(game.castles.ally,0);
game.units.forEach(u=>{if(u.hp>0)u.hp=u.maxHp});
assert.equal(api.restore(caster,10,game).troops.length,0);
assert.deepEqual(api.restore(caster,0,game),{troops:[],structures:[]});
caster.hp=0;assert.deepEqual(api.restore(caster,100,game),{troops:[],structures:[]});
console.log('PASSOU: cura por rota, Ouro, torres, nível 100, limites, intervalo e ausência de ressurreição.');
