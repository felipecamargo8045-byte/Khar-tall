/* Cura da Liliti: dano real, rotas aliadas e estruturas ainda vivas. */
(()=>{'use strict';
 const clampLevel=n=>Math.max(0,Math.min(100,Math.floor(Number(n)||0)));
 const laneOf=u=>u.lane===0||u.lane===1?u.lane:u.x<210?0:1;
 function profile(value){
  const level=clampLevel(value);
  return {level,lanes:level>=40?2:1,towers:level>=80?2:level>=60?1:0,
   castle:level===100,self:level===100,fraction:.5,troopBudget:85,
   towerHeal:4,castleHeal:3,structureInterval:4};
 }
 function restore(caster,realDamage,game){
  const result={troops:[],structures:[]};
  if(!caster||caster.hp<=0||!Number.isFinite(realDamage)||realDamage<=0)return result;
  const rule=profile(caster.level),side=caster.side,lane=laneOf(caster);
  const targets=game.units.filter(u=>u.hp>0&&u.hp<u.maxHp&&u.side===side&&
   (u.id!==caster.id||rule.self)&&(rule.lanes===2||laneOf(u)===lane));
  targets.sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||a.id-b.id);
  let budget=Math.min(rule.troopBudget,realDamage*rule.fraction);
  targets.forEach((unit,index)=>{
   const amount=Math.min(unit.maxHp-unit.hp,budget/(targets.length-index));
   if(amount>0){unit.hp+=amount;budget-=amount;result.troops.push({id:unit.id,x:unit.x,y:unit.y,amount})}
  });
  const elapsed=180-game.time;
  game.lilitiStructureHealAt||={};
  if(rule.towers&&elapsed-(game.lilitiStructureHealAt[side]??-Infinity)>=rule.structureInterval){
   const slots=rule.towers===2?[0,1]:[lane];
   for(const slot of slots){
    const hp=game.towers[side][slot];
    if(hp>0&&hp<1400){const amount=Math.min(rule.towerHeal,1400-hp);game.towers[side][slot]+=amount;
     result.structures.push({side,slot,amount});}
   }
   if(rule.castle&&game.castles[side]>0&&game.castles[side]<2600){
    const amount=Math.min(rule.castleHeal,2600-game.castles[side]);game.castles[side]+=amount;
    result.structures.push({side,slot:2,amount});
   }
   if(result.structures.length)game.lilitiStructureHealAt[side]=elapsed;
  }
  return result;
 }
 globalThis.CercoLiliti=Object.freeze({profile,restore});
})();
