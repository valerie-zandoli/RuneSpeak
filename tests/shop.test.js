import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,start,answer,question,proceed,choose,room,shopStock,buyRelic,leaveShop,restore,items} from '../engine.js';
function merchant(){
 const s=start(createRun('SHOP-CHECK','knight',4,'crypt'));
 while(s.depth<3){
  if(s.phase==='challenge')answer(s,question(s).answer);
  else if(s.phase==='feedback')proceed(s);
  else choose(s,s.depth===2?s.levels[3].findIndex(r=>r.type==='shop'):0);
 }
 return s;
}
test('new routes offer shops and legacy routes restore unchanged',()=>{
 for(const dungeon of [null,'crypt','moss','runic']){
  const s=createRun('SHOP-CHECK','knight',4,dungeon);
  assert(s.levels[3].some(r=>r.type==='shop'));
  assert.deepEqual(restore(JSON.stringify(s)),s);
  const old=createRun('SHOP-CHECK','knight',4,dungeon,0);
  assert(!old.levels.flat().some(r=>r.type==='shop'));
  assert.deepEqual(restore(JSON.stringify(old)),old);
 }
});
test('merchant requires a correct translation and allows free retries or departure',()=>{
 const s=merchant(),gold=s.gold,hp=s.hp,offer=shopStock(s)[0];
 assert.equal(question(s).kind,'reverse');assert(!buyRelic(s,offer.id));
 answer(s,'wrong');assert.equal(s.hp,hp);assert.equal(s.gold,gold);assert(!buyRelic(s,offer.id));
 assert.deepEqual(restore(JSON.stringify(s)),s);
 proceed(s);assert.equal(s.phase,'challenge');answer(s,question(s).answer);
 assert.equal(s.gold,gold);assert.equal(s.enemyHp,0);assert.equal(s.feedback.gain,0);
 assert.deepEqual(restore(JSON.stringify(s)),s);
 assert(leaveShop(s));assert(!buyRelic(s,offer.id));
 const skipped=merchant();assert(leaveShop(skipped));assert.equal(skipped.phase,'doors');
 assert.deepEqual(restore(JSON.stringify(skipped)),skipped);
});
test('stock is stable, purchases deduct exact gold once, and persist in backpack',()=>{
 let s=merchant();answer(s,question(s).answer);const stock=shopStock(s);
 assert.equal(new Set(stock.map(o=>o.id)).size,3);
 const offer=stock.find(o=>!s.inventory.includes(o.id));
 s.gold=offer.price-1;const before=JSON.stringify(s);assert(!buyRelic(s,offer.id));assert.equal(JSON.stringify(s),before);
 s.gold=offer.price;assert(buyRelic(s,offer.id));assert.equal(s.gold,0);assert(s.inventory.includes(offer.id));
 assert(!buyRelic(s,offer.id));assert(!buyRelic(s,'fake'));
 s=restore(JSON.stringify(s));assert(s);assert.deepEqual(shopStock(s),stock);assert(s.inventory.includes(offer.id));
 s.gold=1000;assert(!buyRelic(s,offer.id));
 const unstocked=Object.keys(items).find(id=>!stock.some(o=>o.id===id));assert(!buyRelic(s,unstocked));
 proceed(s);assert.equal(s.phase,'doors');assert(!buyRelic(s,stock[1].id));
});
