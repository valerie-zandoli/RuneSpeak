import test from 'node:test';
import assert from 'node:assert/strict';
import { weaponGlow, weaponMotes, knightMagicBolt, knightSwordTip } from '../weapon-effects.js';
import { createRun, start, equip } from '../engine.js';
test('each hero lights an equipped weapon, pulses for weapon equip only, and clears on removal',()=>{
 for(const hero of ['knight','ranger','wizard']){
  const s=createRun('GLOW',hero);start(s);s.inventory.push('ironblade');equip(s,'ironblade');
  const event={type:'equip',slot:'weapon',equipped:true};
  assert.ok(weaponGlow(s.equipment.weapon,event,.5,0)>weaponGlow(s.equipment.weapon,{...event,slot:'armor'},.5,0));
  assert.equal(weaponGlow(s.equipment.weapon,event,.5,10,true),weaponGlow(s.equipment.weapon,event,.1,0,true));
  equip(s,'ironblade');assert.equal(weaponGlow(s.equipment.weapon,event,.5,0),0);
 }
});
test('knight magic starts at transformed sword tip, travels toward impact, then expires',()=>{
 const e={type:'attack',kind:'grammar'}, origin=knightSwordTip({x:258,feet:370}), target={x:716,y:310};
 assert.ok(origin.y<240);
 assert.equal(knightMagicBolt(e,.37,origin,target),null);
 const shot=knightMagicBolt(e,.38,origin,target); assert.equal(shot.x,origin.x);assert.equal(shot.y,origin.y);
 const mid=knightMagicBolt(e,.475,origin,target);assert.ok(Math.abs(mid.x-(origin.x+target.x)/2)<.001);
 assert.equal(knightMagicBolt(e,.57,origin,target),null);
 assert.equal(knightMagicBolt({...e,kind:'vocab'},.4,origin,target),null);
 assert.equal(knightMagicBolt(e,.5,origin,target,true).x,origin.x);
});

test('weapon particles animate in every pose, stop when unequipped, and stay still with reduced motion',()=>{
 for(const hero of ['knight','ranger','wizard'])for(let pose=0;pose<6;pose++){
  const motes=(strength,time,reduced=false)=>weaponMotes(hero,pose,256,490,146/512,strength,time,reduced);
  assert.deepEqual(motes(0,1),[]);
  assert.notDeepEqual(motes(.6,1),motes(.6,2));
  assert.deepEqual(motes(.6,1,true),motes(.6,2,true));
  assert.ok(motes(1,1).length>motes(.6,1).length);
  assert.ok(motes(1,1).every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.alpha>=0&&p.alpha<=1));
 }
});
