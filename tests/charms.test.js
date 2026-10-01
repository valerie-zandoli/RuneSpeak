import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,start,equip,stats,restore,answer,question,proceed,items} from '../engine.js';

test('three charms stack, a fourth needs a chosen slot, and swapping preserves inventory',()=>{
 const s=start(createRun('CHARMS'));
 s.inventory=['mooncharm','goldcharm','sagecharm','embercharm'];
 for(const id of s.inventory.slice(0,3)) assert(equip(s,id));
 assert.equal(stats(s).heal,4);assert.equal(stats(s).gold,.25);assert.equal(stats(s).spell,22);
 assert(!equip(s,'embercharm'));assert(!equip(s,'embercharm','weapon'));
 assert(equip(s,'embercharm','charm2'));assert.equal(stats(s).attack,31);assert.equal(stats(s).gold,0);
 assert.equal(s.inventory.length,4);assert.deepEqual(restore(JSON.stringify(s)),s);
 assert(equip(s,'mooncharm'));assert.equal(stats(s).heal,0);assert(equip(s,'goldcharm'));assert.equal(s.equipment.charm,'goldcharm');
});
test('old single-charm saves keep bonuses and can fill two more slots; invalid equips are rejected',()=>{
 const s=start(createRun('LEGACY'));s.inventory=['mooncharm','sagecharm','goldcharm'];s.equipment={weapon:null,armor:null,charm:'mooncharm'};
 const loaded=restore(JSON.stringify(s));assert.deepEqual(loaded,s);assert.equal(stats(loaded).heal,4);
 assert(equip(loaded,'sagecharm'));assert(equip(loaded,'goldcharm'));
 loaded.equipment.charm3='mooncharm';assert.equal(restore(JSON.stringify(loaded)),null);
 loaded.equipment.charm3='ironblade';assert.equal(restore(JSON.stringify(loaded)),null);
});
test('random first drops cover all relics and favor charms at roughly seventy percent',()=>{
 const counts={charm:0,weapon:0,armor:0},seen=new Set();
 for(let i=0;i<1200;i++){
  const s=start(createRun('DROP'+i));
  while(s.enemyHp>0){answer(s,question(s).answer);if(s.enemyHp>0)proceed(s);}
  counts[items[s.loot].slot]++;seen.add(s.loot);
 }
 assert(counts.charm>780 && counts.charm<900,JSON.stringify(counts));
 assert(counts.charm>counts.weapon && counts.weapon>counts.armor);assert.equal(seen.size,Object.keys(items).length);
});
